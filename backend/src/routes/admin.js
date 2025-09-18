const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { getPool, sql } = require('../config/database');
const router = express.Router();
const imagekit = require('../config/imagekit');

// All admin routes require admin authentication
router.use(requireAdmin);

// Admin Dashboard Stats
router.get('/dashboard', async (req, res) => {
    try {
        const pool = await getPool();
        
        // Get dashboard statistics (removed is_active filters since no soft delete)
        const stats = await Promise.all([
            // Total products
            pool.request().query('SELECT COUNT(*) as count FROM Products'),
            // Total users
            pool.request().query('SELECT COUNT(*) as count FROM Users WHERE is_active = 1'),
            // Total categories
            pool.request().query('SELECT COUNT(*) as count FROM Categories'),
            // Recent products (last 7 days)
            pool.request().query(`
                SELECT COUNT(*) as count FROM Products 
                WHERE created_at >= DATEADD(day, -7, GETDATE())
            `),
            // Total reviews
            pool.request().query('SELECT COUNT(*) as count FROM Reviews'),
            // Total banners - ADDED BANNER COUNT
            pool.request().query('SELECT COUNT(*) as count FROM Banners')
        ]);

        // Get recent activity
        const recentProducts = await pool.request().query(`
            SELECT TOP 5 p.id, p.name, p.created_at, c.name as category_name, u.display_name as admin_name
            FROM Products p
            INNER JOIN Categories c ON p.category_id = c.id
            INNER JOIN Users u ON p.admin_id = u.id
            ORDER BY p.created_at DESC
        `);

        res.json({
            status: 'success',
            message: 'Dashboard data retrieved successfully',
            data: {
                totalProducts: stats[0].recordset[0].count,
                totalUsers: stats[1].recordset[0].count,
                totalCategories: stats[2].recordset[0].count,
                recentProducts: stats[3].recordset[0].count,
                totalReviews: stats[4].recordset[0].count,
                totalBanners: stats[5].recordset[0].count, // ADDED BANNER COUNT
                recentActivity: recentProducts.recordset
            }
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to load dashboard data',
            error: error.message
        });
    }
});

// Get all products for admin management
router.get('/products', async (req, res) => {
    try {
        const pool = await getPool();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get products with category and admin info (removed is_active filter)
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    p.id, p.name, p.description, p.image_urls, p.views_count,
                    p.rating_average, p.review_count, p.created_at, p.updated_at,
                    c.name as category_name,
                    u.display_name as admin_name,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.buy_button_2_name, p.buy_button_2_url,
                    p.buy_button_3_name, p.buy_button_3_url
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                INNER JOIN Users u ON p.admin_id = u.id
                ORDER BY p.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        // Get total count for pagination
        const countResult = await pool.request().query('SELECT COUNT(*) as total FROM Products');
        const total = countResult.recordset[0].total;

        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: {
                products: result.recordset,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: total,
                    total_pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get admin products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve products',
            error: error.message
        });
    }
});

// Get all categories for dropdowns
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
            message: 'Categories retrieved successfully',
            data: result.recordset
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve categories',
            error: error.message
        });
    }
});

// Get single product for editing
router.get('/products/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    p.id, p.name, p.description, p.image_urls, p.views_count,
                    p.rating_average, p.review_count, p.created_at, p.updated_at,
                    p.category_id, c.name as category_name,
                    u.display_name as admin_name,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.buy_button_2_name, p.buy_button_2_url,
                    p.buy_button_3_name, p.buy_button_3_url
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                INNER JOIN Users u ON p.admin_id = u.id
                WHERE p.id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Product retrieved successfully',
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Get single product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve product',
            error: error.message
        });
    }
});

// Delete product (PERMANENT DELETION)
router.delete('/products/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        
        // Start a transaction to ensure data integrity
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            // Check if product exists and belongs to admin
            const productCheck = await transaction.request()
                .input('id', sql.Int, id)
                .input('adminId', sql.Int, req.user.id)
                .query('SELECT id, name FROM Products WHERE id = @id AND admin_id = @adminId');
            
            if (productCheck.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    status: 'error',
                    message: 'Product not found or access denied'
                });
            }
            
            const productName = productCheck.recordset[0].name;
            
            // Delete related data in correct order (children first, then parent)
            
            // 1. Delete Reviews first (they reference product_id)
            const reviewsDeleted = await transaction.request()
                .input('productId', sql.Int, id)
                .query('DELETE FROM Reviews WHERE product_id = @productId');
            
            // 2. Delete Wishlist entries (they reference product_id)  
            const wishlistsDeleted = await transaction.request()
                .input('productId', sql.Int, id)
                .query('DELETE FROM Wishlists WHERE product_id = @productId');
            
            // 3. Finally delete the Product itself
            const productDeleted = await transaction.request()
                .input('id', sql.Int, id)
                .input('adminId', sql.Int, req.user.id)
                .query('DELETE FROM Products WHERE id = @id AND admin_id = @adminId');
            
            // Commit the transaction
            await transaction.commit();
            
            console.log(`✅ Product "${productName}" and related data deleted:`, {
                productId: id,
                reviewsDeleted: reviewsDeleted.rowsAffected[0],
                wishlistsDeleted: wishlistsDeleted.rowsAffected[0]
            });
            
            res.json({
                status: 'success',
                message: `Product "${productName}" permanently deleted along with ${reviewsDeleted.rowsAffected[0]} reviews and ${wishlistsDeleted.rowsAffected[0]} wishlist entries`,
                data: {
                    productId: id,
                    reviewsDeleted: reviewsDeleted.rowsAffected[0],
                    wishlistsDeleted: wishlistsDeleted.rowsAffected[0]
                }
            });
            
        } catch (transactionError) {
            // Rollback transaction on any error
            await transaction.rollback();
            throw transactionError;
        }
        
    } catch (error) {
        console.error('Delete product error:', error);
        
        // Handle specific constraint errors
        if (error.message.includes('REFERENCE constraint') || error.message.includes('foreign key')) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot delete product because it has associated reviews or wishlists. This should be handled automatically - please try again.'
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete product',
                error: error.message
            });
        }
    }
});


// Create new category
router.post('/categories', async (req, res) => {
    try {
        const pool = await getPool();
        const { name, description, icon_url } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name is required'
            });
        }
        
        // Check if category name already exists
        const existingCategory = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('SELECT COUNT(*) as count FROM Categories WHERE name = @name');
        
        if (existingCategory.recordset[0].count > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name already exists'
            });
        }
        
        // Get next sort order
        const sortOrderResult = await pool.request()
            .query('SELECT ISNULL(MAX(sort_order), 0) + 1 as next_order FROM Categories');
        
        const nextSortOrder = sortOrderResult.recordset[0].next_order;
        
        // Insert new category (removed is_active since no soft delete)
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description || null)
            .input('iconUrl', sql.NVarChar, icon_url || null)
            .input('sortOrder', sql.Int, nextSortOrder)
            .query(`
                INSERT INTO Categories (name, description, icon_url, sort_order)
                OUTPUT INSERTED.*
                VALUES (@name, @description, @iconUrl, @sortOrder)
            `);
        
        res.json({
            status: 'success',
            message: 'Category created successfully',
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create category',
            error: error.message
        });
    }
});

// Update category with thumbnail
router.put('/categories/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        const { name, description, icon_url } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name is required'
            });
        }
        
        // Check if category name already exists (excluding current category)
        const existingCategory = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM Categories WHERE name = @name AND id != @id');
        
        if (existingCategory.recordset[0].count > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name already exists'
            });
        }
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('iconUrl', sql.NVarChar, icon_url)
            .query(`
                UPDATE Categories 
                SET name = @name, description = @description, icon_url = @iconUrl
                WHERE id = @id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Category updated successfully'
        });
        
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update category',
            error: error.message
        });
    }
});

// Delete category (PERMANENT DELETION)
router.delete('/categories/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        
        // Check if category has products (check all products, not just active)
        const productsCount = await pool.request()
            .input('categoryId', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM Products WHERE category_id = @categoryId');
        
        if (productsCount.recordset[0].count > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot delete category that has products. Please move or delete the products first.'
            });
        }
        
        // HARD DELETE - permanently remove the record
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Categories WHERE id = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Category permanently deleted'
        });
        
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete category',
            error: error.message
        });
    }
});

// ImageKit authentication endpoint for secure uploads
router.get('/imagekit-auth', async (req, res) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.json(authenticationParameters);
    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get ImageKit authentication'
        });
    }
});

// Create new product
router.post('/products', async (req, res) => {
    try {
        const pool = await getPool();
        const {
            name,
            description,
            category_id,
            image_urls,
            buy_button_1_name,
            buy_button_1_url,
            buy_button_2_name,
            buy_button_2_url,
            buy_button_3_name,
            buy_button_3_url
        } = req.body;

        // Validate required fields
        if (!name || !description || !category_id || !buy_button_1_name || !buy_button_1_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, description, category_id, buy_button_1_name, buy_button_1_url'
            });
        }

        // Insert new product (removed is_active since no soft delete)
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('categoryId', sql.Int, category_id)
            .input('imageUrls', sql.NVarChar, JSON.stringify(image_urls || []))
            .input('buyButton1Name', sql.NVarChar, buy_button_1_name)
            .input('buyButton1Url', sql.NVarChar, buy_button_1_url)
            .input('buyButton2Name', sql.NVarChar, buy_button_2_name || null)
            .input('buyButton2Url', sql.NVarChar, buy_button_2_url || null)
            .input('buyButton3Name', sql.NVarChar, buy_button_3_name || null)
            .input('buyButton3Url', sql.NVarChar, buy_button_3_url || null)
            .input('adminId', sql.Int, req.user.id)
            .query(`
                INSERT INTO Products (
                    name, description, category_id, image_urls, 
                    buy_button_1_name, buy_button_1_url,
                    buy_button_2_name, buy_button_2_url,
                    buy_button_3_name, buy_button_3_url,
                    admin_id, created_at, updated_at
                )
                OUTPUT INSERTED.*
                VALUES (
                    @name, @description, @categoryId, @imageUrls,
                    @buyButton1Name, @buyButton1Url,
                    @buyButton2Name, @buyButton2Url,
                    @buyButton3Name, @buyButton3Url,
                    @adminId, GETDATE(), GETDATE()
                )
            `);

        res.json({
            status: 'success',
            message: 'Product created successfully',
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create product',
            error: error.message
        });
    }
});

// Update existing product
router.put('/products/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        const {
            name,
            description,
            category_id,
            image_urls,
            buy_button_1_name,
            buy_button_1_url,
            buy_button_2_name,
            buy_button_2_url,
            buy_button_3_name,
            buy_button_3_url
        } = req.body;

        // Validate required fields
        if (!name || !description || !category_id || !buy_button_1_name || !buy_button_1_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, description, category_id, buy_button_1_name, buy_button_1_url'
            });
        }

        // Update product
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('description', sql.NVarChar, description)
            .input('categoryId', sql.Int, category_id)
            .input('imageUrls', sql.NVarChar, JSON.stringify(image_urls || []))
            .input('buyButton1Name', sql.NVarChar, buy_button_1_name)
            .input('buyButton1Url', sql.NVarChar, buy_button_1_url)
            .input('buyButton2Name', sql.NVarChar, buy_button_2_name || null)
            .input('buyButton2Url', sql.NVarChar, buy_button_2_url || null)
            .input('buyButton3Name', sql.NVarChar, buy_button_3_name || null)
            .input('buyButton3Url', sql.NVarChar, buy_button_3_url || null)
            .input('adminId', sql.Int, req.user.id)
            .query(`
                UPDATE Products SET
                    name = @name,
                    description = @description,
                    category_id = @categoryId,
                    image_urls = @imageUrls,
                    buy_button_1_name = @buyButton1Name,
                    buy_button_1_url = @buyButton1Url,
                    buy_button_2_name = @buyButton2Name,
                    buy_button_2_url = @buyButton2Url,
                    buy_button_3_name = @buyButton3Name,
                    buy_button_3_url = @buyButton3Url,
                    updated_at = GETDATE()
                WHERE id = @id AND admin_id = @adminId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found or access denied'
            });
        }

        res.json({
            status: 'success',
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update product',
            error: error.message
        });
    }
});

// Get all banners for admin management
router.get('/banners', async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT 
                b.id, b.name, b.media_url, b.link_url, b.display_order,
                b.is_active, b.created_at, b.updated_at,
                u.display_name as admin_name
            FROM Banners b
            INNER JOIN Users u ON b.admin_id = u.id
            ORDER BY b.display_order ASC, b.created_at DESC
        `);

        res.json({
            status: 'success',
            message: 'Banners retrieved successfully',
            data: result.recordset
        });

    } catch (error) {
        console.error('Get banners error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve banners',
            error: error.message
        });
    }
});

// Get single banner for editing
router.get('/banners/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    b.id, b.name, b.media_url, b.link_url, b.display_order,
                    b.is_active, b.created_at, b.updated_at,
                    u.display_name as admin_name
                FROM Banners b
                INNER JOIN Users u ON b.admin_id = u.id
                WHERE b.id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Banner retrieved successfully',
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Get single banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve banner',
            error: error.message
        });
    }
});

// Create new banner
router.post('/banners', async (req, res) => {
    try {
        const pool = await getPool();
        const { name, media_url, link_url, display_order } = req.body;

        // Validate required fields
        if (!name || !media_url || !link_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, media_url, link_url'
            });
        }

        // Insert new banner
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('mediaUrl', sql.NVarChar, media_url)
            .input('linkUrl', sql.NVarChar, link_url)
            .input('displayOrder', sql.Int, display_order || 0)
            .input('adminId', sql.Int, req.user.id)
            .query(`
                INSERT INTO Banners (name, media_url, link_url, display_order, admin_id, is_active, created_at, updated_at)
                OUTPUT INSERTED.*
                VALUES (@name, @mediaUrl, @linkUrl, @displayOrder, @adminId, 1, GETDATE(), GETDATE())
            `);

        res.json({
            status: 'success',
            message: 'Banner created successfully',
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Create banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create banner',
            error: error.message
        });
    }
});

// Update existing banner
router.put('/banners/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        const { name, media_url, link_url, display_order } = req.body;

        // Validate required fields
        if (!name || !media_url || !link_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, media_url, link_url'
            });
        }

        // Update banner
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('mediaUrl', sql.NVarChar, media_url)
            .input('linkUrl', sql.NVarChar, link_url)
            .input('displayOrder', sql.Int, display_order || 0)
            .input('adminId', sql.Int, req.user.id)
            .query(`
                UPDATE Banners SET
                    name = @name,
                    media_url = @mediaUrl,
                    link_url = @linkUrl,
                    display_order = @displayOrder,
                    updated_at = GETDATE()
                WHERE id = @id AND admin_id = @adminId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found or access denied'
            });
        }

        res.json({
            status: 'success',
            message: 'Banner updated successfully'
        });

    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update banner',
            error: error.message
        });
    }
});

// Delete banner (permanent deletion)
router.delete('/banners/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        
        // HARD DELETE - permanently remove the record
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('adminId', sql.Int, req.user.id)
            .query('DELETE FROM Banners WHERE id = @id AND admin_id = @adminId');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found or access denied'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Banner permanently deleted'
        });
        
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete banner',
            error: error.message
        });
    }
});

module.exports = router;
