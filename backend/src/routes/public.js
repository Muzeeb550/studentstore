const express = require('express');
const { getPool, sql } = require('../config/database');
const router = express.Router();


// Public route to get active banners (no auth required)
router.get('/banners', async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT 
                b.id, b.name, b.media_url, b.link_url, b.display_order
            FROM Banners b
            INNER JOIN Users u ON b.admin_id = u.id
            WHERE b.is_active = 1
            ORDER BY b.display_order ASC, b.created_at DESC
        `);


        res.json({
            status: 'success',
            message: 'Public banners retrieved successfully',
            data: result.recordset
        });


    } catch (error) {
        console.error('Get public banners error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve banners',
            error: error.message
        });
    }
});


// Public route to get categories (no auth required)
router.get('/categories', async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT id, name, description, icon_url, sort_order
            FROM Categories
            ORDER BY sort_order, name
        `);


        res.json({
            status: 'success',
            message: 'Public categories retrieved successfully',
            data: result.recordset
        });


    } catch (error) {
        console.error('Get public categories error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve categories',
            error: error.message
        });
    }
});


// Public route to get products by category (no auth required)
router.get('/categories/:id/products', async (req, res) => {
    try {
        const pool = await getPool();
        const categoryId = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        // Validate category ID
        if (!categoryId || isNaN(categoryId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid category ID'
            });
        }

        // First, verify category exists and get its info
        const categoryResult = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .query('SELECT id, name, description FROM Categories WHERE id = @categoryId');

        if (categoryResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }

        const category = categoryResult.recordset[0];

        // Get products in this category with pagination
        const productsResult = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.buy_button_2_name, p.buy_button_2_url,
                    p.buy_button_3_name, p.buy_button_3_url,
                    p.views_count, p.rating_average, p.review_count, p.created_at,
                    c.name as category_name
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                WHERE p.category_id = @categoryId
                ORDER BY p.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        // Get total count for pagination
        const countResult = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .query('SELECT COUNT(*) as total FROM Products WHERE category_id = @categoryId');

        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            status: 'success',
            message: 'Category products retrieved successfully',
            data: {
                category: category,
                products: productsResult.recordset,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: total,
                    total_pages: totalPages,
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get category products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve category products',
            error: error.message
        });
    }
});


// Public route to get single product details (no auth required)
router.get('/products/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const productId = parseInt(req.params.id);

        // Validate product ID
        if (!productId || isNaN(productId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid product ID'
            });
        }

        // Get product details with category info
        const productResult = await pool.request()
            .input('productId', sql.Int, productId)
            .query(`
                SELECT 
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.buy_button_2_name, p.buy_button_2_url,
                    p.buy_button_3_name, p.buy_button_3_url,
                    p.views_count, p.rating_average, p.review_count, 
                    p.created_at, p.updated_at, p.category_id,
                    c.name as category_name, c.description as category_description
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                WHERE p.id = @productId
            `);

        if (productResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        const product = productResult.recordset[0];

        // Update view count
        await pool.request()
            .input('productId', sql.Int, productId)
            .query('UPDATE Products SET views_count = views_count + 1 WHERE id = @productId');

        // Get related products from same category (excluding current product)
        const relatedProductsResult = await pool.request()
            .input('categoryId', sql.Int, product.category_id)
            .input('productId', sql.Int, productId)
            .query(`
                SELECT TOP 4
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.rating_average, p.review_count,
                    c.name as category_name
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                WHERE p.category_id = @categoryId AND p.id != @productId
                ORDER BY p.created_at DESC
            `);

        res.json({
            status: 'success',
            message: 'Product details retrieved successfully',
            data: {
                product: product,
                related_products: relatedProductsResult.recordset
            }
        });

    } catch (error) {
        console.error('Get product details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve product details',
            error: error.message
        });
    }
});


// Public route to get featured products (no auth required)
router.get('/products', async (req, res) => {
    try {
        const pool = await getPool();
        const limit = parseInt(req.query.limit) || 8;
        
        const result = await pool.request()
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    c.name as category_name
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                ORDER BY p.created_at DESC
            `);


        res.json({
            status: 'success',
            message: 'Public products retrieved successfully',
            data: { 
                products: result.recordset,
                total: result.recordset.length
            }
        });


    } catch (error) {
        console.error('Get public products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve products',
            error: error.message
        });
    }
});


module.exports = router;
