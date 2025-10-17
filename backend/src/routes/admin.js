const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { pool } = require('../config/database');
const { invalidateCache } = require('../config/redis');
const router = express.Router();
const imagekit = require('../config/imagekit');
const { addDefaultTransformations } = require('../utils/imagekitHelper'); // ✅ NEW IMPORT


// All admin routes require admin authentication
router.use(requireAdmin);


// Admin Dashboard Stats
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM Products'),
            pool.query('SELECT COUNT(*) as count FROM Users WHERE is_active = true'),
            pool.query('SELECT COUNT(*) as count FROM Categories'),
            pool.query(`SELECT COUNT(*) as count FROM Products WHERE created_at >= NOW() - INTERVAL '7 days'`),
            pool.query('SELECT COUNT(*) as count FROM Reviews'),
            pool.query('SELECT COUNT(*) as count FROM Banners')
        ]);


        const recentProducts = await pool.query(`
            SELECT p.id, p.name, p.created_at, c.name as category_name, u.display_name as admin_name
            FROM Products p
            JOIN Categories c ON p.category_id = c.id
            JOIN Users u ON p.admin_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);


        res.json({
            status: 'success',
            message: 'Dashboard data retrieved successfully',
            data: {
                totalProducts: parseInt(stats[0].rows[0].count),
                totalUsers: parseInt(stats[1].rows[0].count),
                totalCategories: parseInt(stats[2].rows[0].count),
                recentProducts: parseInt(stats[3].rows[0].count),
                totalReviews: parseInt(stats[4].rows[0].count),
                totalBanners: parseInt(stats[5].rows[0].count),
                recentActivity: recentProducts.rows
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;


        const result = await pool.query(`
            SELECT 
                p.id, p.name, p.description, p.price, p.image_urls, p.views_count,
                p.rating_average, p.review_count, p.created_at, p.updated_at,
                c.name as category_name,
                u.display_name as admin_name,
                p.buy_button_1_name, p.buy_button_1_url,
                p.buy_button_2_name, p.buy_button_2_url,
                p.buy_button_3_name, p.buy_button_3_url
            FROM Products p
            JOIN Categories c ON p.category_id = c.id
            JOIN Users u ON p.admin_id = u.id
            ORDER BY p.created_at DESC
            OFFSET $1 LIMIT $2
        `, [offset, limit]);


        const countResult = await pool.query('SELECT COUNT(*) as total FROM Products');
        const total = parseInt(countResult.rows[0].total);


        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: {
                products: result.rows,
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
        const result = await pool.query(`
            SELECT id, name, description, icon_url, sort_order
            FROM Categories
            ORDER BY sort_order, name
        `);


        res.json({
            status: 'success',
            message: 'Categories retrieved successfully',
            data: result.rows
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
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                p.id, p.name, p.description, p.price, p.image_urls, p.views_count,
                p.rating_average, p.review_count, p.created_at, p.updated_at,
                p.category_id, c.name as category_name,
                u.display_name as admin_name,
                p.buy_button_1_name, p.buy_button_1_url,
                p.buy_button_2_name, p.buy_button_2_url,
                p.buy_button_3_name, p.buy_button_3_url
            FROM Products p
            JOIN Categories c ON p.category_id = c.id
            JOIN Users u ON p.admin_id = u.id
            WHERE p.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Product retrieved successfully',
            data: result.rows[0]
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


// Delete product with intelligent cache invalidation
router.delete('/products/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        await client.query('BEGIN');
        
        // Get product info before deletion
        const productInfo = await client.query(
            'SELECT id, name, category_id FROM Products WHERE id = $1 AND admin_id = $2',
            [id, req.user.id]
        );
        
        if (productInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'error',
                message: 'Product not found or access denied'
            });
        }
        
        const productName = productInfo.rows[0].name;
        const categoryId = productInfo.rows[0].category_id;
        
        // Delete related data (CASCADE will handle this automatically with our schema)
        const reviewsDeleted = await client.query('DELETE FROM Reviews WHERE product_id = $1', [id]);
        const wishlistsDeleted = await client.query('DELETE FROM Wishlists WHERE product_id = $1', [id]);
        await client.query('DELETE FROM Products WHERE id = $1 AND admin_id = $2', [id, req.user.id]);
        
        await client.query('COMMIT');
        
        // Cache invalidation
        try {
            await invalidateCache.products(categoryId, parseInt(id));
            console.log(`🔄 Cache invalidated for deleted product: ${productName} (ID: ${id}, Category: ${categoryId})`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }
        
        console.log(`✅ Product "${productName}" and related data deleted:`, {
            productId: id,
            categoryId: categoryId,
            reviewsDeleted: reviewsDeleted.rowCount,
            wishlistsDeleted: wishlistsDeleted.rowCount
        });
        
        res.json({
            status: 'success',
            message: `Product "${productName}" permanently deleted along with ${reviewsDeleted.rowCount} reviews and ${wishlistsDeleted.rowCount} wishlist entries`,
            data: {
                productId: id,
                categoryId: categoryId,
                reviewsDeleted: reviewsDeleted.rowCount,
                wishlistsDeleted: wishlistsDeleted.rowCount,
                cacheCleared: true
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete product error:', error);
        
        if (error.message.includes('violates foreign key constraint')) {
            res.status(400).json({
                status: 'error',
                message: 'Cannot delete product because it has associated data. This should be handled automatically - please try again.'
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete product',
                error: error.message
            });
        }
    } finally {
        client.release();
    }
});


// Create new category with instant cache invalidation
router.post('/categories', async (req, res) => {
    try {
        const { name, description, icon_url } = req.body;
        
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name is required'
            });
        }
        
        // Check if category exists
        const existingCategory = await pool.query(
            'SELECT COUNT(*) as count FROM Categories WHERE name = $1',
            [name]
        );
        
        if (parseInt(existingCategory.rows[0].count) > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name already exists'
            });
        }
        
        // Get next sort order
        const sortOrderResult = await pool.query(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM Categories'
        );
        const nextSortOrder = sortOrderResult.rows[0].next_order;
        
        // ✅ NEW: Optimize category icon URL before storing
        const optimizedIconUrl = icon_url ? addDefaultTransformations(icon_url, 'category') : null;
        
        // Insert new category
        const result = await pool.query(`
            INSERT INTO Categories (name, description, icon_url, sort_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [name, description || null, optimizedIconUrl, nextSortOrder]);
        
        // Cache invalidation
        try {
            await invalidateCache.categories();
            console.log(`🔄 Cache invalidated for new category: ${name}`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }
        
        res.json({
            status: 'success',
            message: 'Category created successfully',
            data: result.rows[0],
            cacheCleared: true
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


// Update category with instant cache invalidation
router.put('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon_url } = req.body;
        
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name is required'
            });
        }
        
        // Check if name exists (excluding current category)
        const existingCategory = await pool.query(
            'SELECT COUNT(*) as count FROM Categories WHERE name = $1 AND id != $2',
            [name, id]
        );
        
        if (parseInt(existingCategory.rows[0].count) > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name already exists'
            });
        }
        
        // ✅ NEW: Optimize category icon URL before storing
        const optimizedIconUrl = icon_url ? addDefaultTransformations(icon_url, 'category') : null;
        
        const result = await pool.query(`
            UPDATE Categories 
            SET name = $1, description = $2, icon_url = $3
            WHERE id = $4
        `, [name, description, optimizedIconUrl, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        
        // Cache invalidation
        try {
            await invalidateCache.categories();
            await invalidateCache.products(parseInt(id));
            console.log(`🔄 Cache invalidated for updated category: ${name} (ID: ${id})`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }
        
        res.json({
            status: 'success',
            message: 'Category updated successfully',
            cacheCleared: true
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


// Delete category with intelligent cache invalidation
router.delete('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if category has products
        const productsCount = await pool.query(
            'SELECT COUNT(*) as count FROM Products WHERE category_id = $1',
            [id]
        );
        
        if (parseInt(productsCount.rows[0].count) > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot delete category that has products. Please move or delete the products first.'
            });
        }
        
        // Get category info for logging
        const categoryInfo = await pool.query('SELECT name FROM Categories WHERE id = $1', [id]);
        const categoryName = categoryInfo.rows[0]?.name || `ID:${id}`;
        
        // Delete category
        const result = await pool.query('DELETE FROM Categories WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }
        
        // Cache invalidation
        try {
            await invalidateCache.categories();
            console.log(`🔄 Cache invalidated for deleted category: ${categoryName} (ID: ${id})`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }
        
        res.json({
            status: 'success',
            message: 'Category permanently deleted',
            cacheCleared: true
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


// ImageKit authentication endpoint
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


// ✅ UPDATED: Create new product with image optimization
router.post('/products', async (req, res) => {
    try {
        const {
            name, description, category_id, image_urls, price,
            buy_button_1_name, buy_button_1_url,
            buy_button_2_name, buy_button_2_url,
            buy_button_3_name, buy_button_3_url
        } = req.body;


        if (!name || !description || !category_id || !buy_button_1_name || !buy_button_1_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, description, category_id, buy_button_1_name, buy_button_1_url'
            });
        }

        // ✅ NEW: Optimize image URLs before storing
        let optimizedImageUrls = [];
        if (Array.isArray(image_urls) && image_urls.length > 0) {
            optimizedImageUrls = image_urls
                .filter(url => url && url.trim() !== '')
                .map(url => addDefaultTransformations(url, 'product'));
            
            console.log(`🎨 Optimized ${optimizedImageUrls.length} product images`);
        }

        const result = await pool.query(`
            INSERT INTO Products (
                name, description, category_id, image_urls, price,
                buy_button_1_name, buy_button_1_url,
                buy_button_2_name, buy_button_2_url,
                buy_button_3_name, buy_button_3_url,
                admin_id, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            RETURNING *
        `, [
            name, description, category_id, JSON.stringify(optimizedImageUrls),
            price || 0.00,
            buy_button_1_name, buy_button_1_url,
            buy_button_2_name || null, buy_button_2_url || null,
            buy_button_3_name || null, buy_button_3_url || null,
            req.user.id
        ]);


        const newProduct = result.rows[0];

        // Cache invalidation
        try {
            await invalidateCache.products(category_id, newProduct.id);
            console.log(`🔄 Cache invalidated for new product: ${name} (ID: ${newProduct.id}, Category: ${category_id})`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Product created successfully with optimized images',
            data: newProduct,
            cacheCleared: true
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


// ✅ UPDATED: Update product with image optimization
router.put('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, category_id, image_urls, price,
            buy_button_1_name, buy_button_1_url,
            buy_button_2_name, buy_button_2_url,
            buy_button_3_name, buy_button_3_url
        } = req.body;


        if (!name || !description || !category_id || !buy_button_1_name || !buy_button_1_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, description, category_id, buy_button_1_name, buy_button_1_url'
            });
        }

        // Get old category for cache invalidation
        const oldProductInfo = await pool.query('SELECT category_id FROM Products WHERE id = $1', [id]);
        const oldCategoryId = oldProductInfo.rows[0]?.category_id;

        // ✅ NEW: Optimize image URLs before storing
        let optimizedImageUrls = [];
        if (Array.isArray(image_urls) && image_urls.length > 0) {
            optimizedImageUrls = image_urls
                .filter(url => url && url.trim() !== '')
                .map(url => addDefaultTransformations(url, 'product'));
            
            console.log(`🎨 Optimized ${optimizedImageUrls.length} product images for update`);
        }

        const result = await pool.query(`
            UPDATE Products SET
                name = $1, description = $2, category_id = $3, image_urls = $4,
                price = $5,
                buy_button_1_name = $6, buy_button_1_url = $7,
                buy_button_2_name = $8, buy_button_2_url = $9,
                buy_button_3_name = $10, buy_button_3_url = $11,
                updated_at = NOW()
            WHERE id = $12 AND admin_id = $13
        `, [
            name, description, category_id, JSON.stringify(optimizedImageUrls),
            price || 0.00,
            buy_button_1_name, buy_button_1_url,
            buy_button_2_name || null, buy_button_2_url || null,
            buy_button_3_name || null, buy_button_3_url || null,
            id, req.user.id
        ]);


        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found or access denied'
            });
        }

        // Cache invalidation
        try {
            await invalidateCache.products(category_id, parseInt(id));
            if (oldCategoryId && oldCategoryId !== category_id) {
                await invalidateCache.products(oldCategoryId);
                console.log(`🔄 Cache invalidated for updated product: ${name} (ID: ${id}) - Old Category: ${oldCategoryId}, New Category: ${category_id}`);
            } else {
                console.log(`🔄 Cache invalidated for updated product: ${name} (ID: ${id}, Category: ${category_id})`);
            }
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Product updated successfully with optimized images',
            cacheCleared: true
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
        const result = await pool.query(`
            SELECT 
                b.id, b.name, b.media_url, b.link_url, b.display_order,
                b.is_active, b.created_at, b.updated_at,
                u.display_name as admin_name
            FROM Banners b
            JOIN Users u ON b.admin_id = u.id
            ORDER BY b.display_order ASC, b.created_at DESC
        `);


        res.json({
            status: 'success',
            message: 'Banners retrieved successfully',
            data: result.rows
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
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                b.id, b.name, b.media_url, b.link_url, b.display_order,
                b.is_active, b.created_at, b.updated_at,
                u.display_name as admin_name
            FROM Banners b
            JOIN Users u ON b.admin_id = u.id
            WHERE b.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Banner retrieved successfully',
            data: result.rows[0]
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


// ✅ UPDATED: Create banner with image optimization
router.post('/banners', async (req, res) => {
    try {
        const { name, media_url, link_url, display_order } = req.body;

        if (!name || !media_url || !link_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, media_url, link_url'
            });
        }

        // ✅ NEW: Optimize banner image URL before storing
        const optimizedMediaUrl = addDefaultTransformations(media_url, 'banner');
        console.log(`🎨 Optimized banner image: ${name}`);

        const result = await pool.query(`
            INSERT INTO Banners (name, media_url, link_url, display_order, admin_id, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
            RETURNING *
        `, [name, optimizedMediaUrl, link_url, display_order || 0, req.user.id]);

        // Cache invalidation
        try {
            await invalidateCache.banners();
            console.log(`🔄 Cache invalidated for new banner: ${name}`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Banner created successfully with optimized image',
            data: result.rows[0],
            cacheCleared: true
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


// ✅ UPDATED: Update banner with image optimization
router.put('/banners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, media_url, link_url, display_order } = req.body;

        if (!name || !media_url || !link_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, media_url, link_url'
            });
        }

        // ✅ NEW: Optimize banner image URL before storing
        const optimizedMediaUrl = addDefaultTransformations(media_url, 'banner');
        console.log(`🎨 Optimized banner image for update: ${name}`);

        const result = await pool.query(`
            UPDATE Banners SET
                name = $1, media_url = $2, link_url = $3,
                display_order = $4, updated_at = NOW()
            WHERE id = $5 AND admin_id = $6
        `, [name, optimizedMediaUrl, link_url, display_order || 0, id, req.user.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found or access denied'
            });
        }

        // Cache invalidation
        try {
            await invalidateCache.banners();
            console.log(`🔄 Cache invalidated for updated banner: ${name} (ID: ${id})`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Banner updated successfully with optimized image',
            cacheCleared: true
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


// Delete banner with instant cache invalidation
router.delete('/banners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get banner info for logging
        const bannerInfo = await pool.query(
            'SELECT name FROM Banners WHERE id = $1 AND admin_id = $2',
            [id, req.user.id]
        );
        const bannerName = bannerInfo.rows[0]?.name || `ID:${id}`;
        
        // Delete banner
        const result = await pool.query(
            'DELETE FROM Banners WHERE id = $1 AND admin_id = $2',
            [id, req.user.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found or access denied'
            });
        }
        
        // Cache invalidation
        try {
            await invalidateCache.banners();
            console.log(`🔄 Cache invalidated for deleted banner: ${bannerName} (ID: ${id})`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }
        
        res.json({
            status: 'success',
            message: 'Banner permanently deleted',
            cacheCleared: true
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
