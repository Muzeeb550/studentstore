const express = require('express');
const { getPool, sql } = require('../config/database');
const { createCacheMiddleware } = require('../middleware/cache'); // ADD CACHE MIDDLEWARE
const router = express.Router();

// Cache configurations with different TTL (Time To Live) values
const bannersCache = createCacheMiddleware(
    () => 'banners:active',
    1800 // 30 minutes - banners rarely change
);

const categoriesCache = createCacheMiddleware(
    () => 'categories:all', 
    3600 // 60 minutes - categories change even less
);

const featuredProductsCache = createCacheMiddleware(
    (req) => `products:featured:limit:${req.query.limit || 8}`,
    900 // 15 minutes - products may be updated more often
);

const productDetailsCache = createCacheMiddleware(
    (req) => `product:${req.params.id}`,
    600, // 10 minutes
    (req) => req.method !== 'GET' // Skip caching for non-GET requests
);

const categoryProductsCache = createCacheMiddleware(
    (req) => `category:${req.params.id}:page:${req.query.page || 1}:limit:${req.query.limit || 12}`,
    300 // 5 minutes - category product lists change more frequently
);

const searchCache = createCacheMiddleware(
    (req) => {
        const { q, category, sort = 'relevance', page = 1 } = req.query;
        return `search:${q}:${category || 'all'}:${sort}:${page}`;
    },
    300 // 5 minutes - search results can change frequently
);

// Public route to get active banners (no auth required) - WITH CACHING
router.get('/banners', bannersCache, async (req, res) => {
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

// Public route to get categories (no auth required) - WITH CACHING
router.get('/categories', categoriesCache, async (req, res) => {
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

// Public route to get products by category (no auth required) - WITH CACHING
router.get('/categories/:id/products', categoryProductsCache, async (req, res) => {
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

// Public route to get single product details (no auth required) - WITH CACHING
router.get('/products/:id', productDetailsCache, async (req, res) => {
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

        // Update view count (this happens regardless of caching)
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

// Public route to get featured products (no auth required) - WITH CACHING
router.get('/products', featuredProductsCache, async (req, res) => {
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

// Public route to search products (no auth required) - WITH CACHING
router.get('/search', searchCache, async (req, res) => {
    try {
        const pool = await getPool();
        const query = req.query.q ? req.query.q.toString().trim() : '';
        const category = req.query.category ? parseInt(req.query.category.toString()) : null;
        const sort = req.query.sort ? req.query.sort.toString() : 'relevance';
        const page = parseInt(req.query.page?.toString() || '1');
        const limit = parseInt(req.query.limit?.toString() || '12');
        const offset = (page - 1) * limit;

        // Validate search query
        if (!query || query.length < 2) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query must be at least 2 characters long'
            });
        }

        // Build search conditions
        let searchConditions = [];
        let searchParams = [];
        let paramIndex = 0;

        // Search in product name and description
        searchConditions.push(`(p.name LIKE @searchTerm${paramIndex} OR p.description LIKE @searchTerm${paramIndex})`);
        searchParams.push({ name: `searchTerm${paramIndex}`, value: `%${query}%` });
        paramIndex++;

        // Category filter
        let categoryCondition = '';
        if (category) {
            categoryCondition = 'AND p.category_id = @categoryId';
        }

        // Sort options
        let orderBy = '';
        switch (sort) {
            case 'newest':
                orderBy = 'ORDER BY p.created_at DESC';
                break;
            case 'oldest': 
                orderBy = 'ORDER BY p.created_at ASC';
                break;
            case 'name_asc':
                orderBy = 'ORDER BY p.name ASC';
                break;
            case 'name_desc':
                orderBy = 'ORDER BY p.name DESC';
                break;
            case 'rating':
                orderBy = 'ORDER BY p.rating_average DESC, p.review_count DESC';
                break;
            case 'views':
                orderBy = 'ORDER BY p.views_count DESC';
                break;
            default: // relevance
                orderBy = `ORDER BY 
                    CASE 
                        WHEN p.name LIKE @exactMatch THEN 1
                        WHEN p.name LIKE @startsWith THEN 2
                        WHEN p.description LIKE @startsWith THEN 3
                        ELSE 4
                    END,
                    p.rating_average DESC,
                    p.views_count DESC`;
                
                // Add relevance parameters
                searchParams.push(
                    { name: 'exactMatch', value: `%${query}%` },
                    { name: 'startsWith', value: `${query}%` }
                );
                break;
        }

        // Build the main search query
        const searchQuery = `
            SELECT 
                p.id, p.name, p.description, p.image_urls,
                p.buy_button_1_name, p.buy_button_1_url,
                p.buy_button_2_name, p.buy_button_2_url,
                p.buy_button_3_name, p.buy_button_3_url,
                p.views_count, p.rating_average, p.review_count, p.created_at,
                c.name as category_name, c.id as category_id
            FROM Products p
            INNER JOIN Categories c ON p.category_id = c.id
            WHERE (${searchConditions.join(' OR ')})
            ${categoryCondition}
            ${orderBy}
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        // Build the count query
        const countQuery = `
            SELECT COUNT(*) as total
            FROM Products p
            INNER JOIN Categories c ON p.category_id = c.id
            WHERE (${searchConditions.join(' OR ')})
            ${categoryCondition}
        `;

        // Execute search query
        let searchRequest = pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit);

        // Add search parameters
        searchParams.forEach(param => {
            searchRequest = searchRequest.input(param.name, sql.NVarChar, param.value);
        });

        // Add category parameter if provided
        if (category) {
            searchRequest = searchRequest.input('categoryId', sql.Int, category);
        }

        const searchResult = await searchRequest.query(searchQuery);

        // Execute count query
        let countRequest = pool.request();
        
        // Add the same search parameters for count
        searchParams.slice(0, 1).forEach(param => { // Only need the first search term for count
            countRequest = countRequest.input(param.name, sql.NVarChar, param.value);
        });

        if (category) {
            countRequest = countRequest.input('categoryId', sql.Int, category);
        }

        const countResult = await countRequest.query(countQuery);
        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / limit);

        // Get available categories for filtering (categories that have matching products)
        const categoriesQuery = `
            SELECT DISTINCT c.id, c.name, COUNT(p.id) as product_count
            FROM Categories c
            INNER JOIN Products p ON c.id = p.category_id
            WHERE (p.name LIKE @searchTerm0 OR p.description LIKE @searchTerm0)
            GROUP BY c.id, c.name
            ORDER BY c.name
        `;

        const categoriesRequest = pool.request()
            .input('searchTerm0', sql.NVarChar, `%${query}%`);
        
        const categoriesResult = await categoriesRequest.query(categoriesQuery);

        res.json({
            status: 'success',
            message: 'Search completed successfully',
            data: {
                query: query,
                results: searchResult.recordset,
                total: total,
                categories: categoriesResult.recordset,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: total,
                    total_pages: totalPages,
                    has_next: page < totalPages,
                    has_prev: page > 1
                },
                filters: {
                    category: category,
                    sort: sort
                }
            }
        });

    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search products',
            error: error.message
        });
    }
});

module.exports = router;
