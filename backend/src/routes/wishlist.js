const express = require('express');
const { getPool, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const router = express.Router();

// Add product to wishlist
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const { product_id } = req.body;
        const user_id = req.user.id;

        // Validate product_id
        if (!product_id || isNaN(parseInt(product_id))) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid product ID is required'
            });
        }

        // Check if product exists
        const productCheck = await pool.request()
            .input('productId', sql.Int, parseInt(product_id))
            .query('SELECT id FROM Products WHERE id = @productId');

        if (productCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        // Check if already in wishlist
        const existingCheck = await pool.request()
            .input('userId', sql.Int, user_id)
            .input('productId', sql.Int, parseInt(product_id))
            .query('SELECT id FROM Wishlists WHERE user_id = @userId AND product_id = @productId');

        if (existingCheck.recordset.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Product already in wishlist'
            });
        }

        // Add to wishlist
        await pool.request()
            .input('userId', sql.Int, user_id)
            .input('productId', sql.Int, parseInt(product_id))
            .query(`
                INSERT INTO Wishlists (user_id, product_id, created_at)
                VALUES (@userId, @productId, GETDATE())
            `);

        res.json({
            status: 'success',
            message: 'Product added to wishlist successfully'
        });

    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to add product to wishlist',
            error: error.message
        });
    }
});

// Remove product from wishlist
router.delete('/remove/:productId', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const product_id = parseInt(req.params.productId);
        const user_id = req.user.id;

        // Validate product_id
        if (!product_id || isNaN(product_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid product ID is required'
            });
        }

        // Remove from wishlist
        const result = await pool.request()
            .input('userId', sql.Int, user_id)
            .input('productId', sql.Int, product_id)
            .query('DELETE FROM Wishlists WHERE user_id = @userId AND product_id = @productId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found in wishlist'
            });
        }

        res.json({
            status: 'success',
            message: 'Product removed from wishlist successfully'
        });

    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to remove product from wishlist',
            error: error.message
        });
    }
});

// Get user's wishlist
router.get('/', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const user_id = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        // Get wishlist products with pagination
        const result = await pool.request()
            .input('userId', sql.Int, user_id)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    w.id as wishlist_id,
                    w.created_at as added_at,
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.views_count, p.rating_average, p.review_count,
                    c.name as category_name
                FROM Wishlists w
                INNER JOIN Products p ON w.product_id = p.id
                INNER JOIN Categories c ON p.category_id = c.id
                WHERE w.user_id = @userId
                ORDER BY w.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        // Get total count
        const countResult = await pool.request()
            .input('userId', sql.Int, user_id)
            .query('SELECT COUNT(*) as total FROM Wishlists WHERE user_id = @userId');

        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            status: 'success',
            message: 'Wishlist retrieved successfully',
            data: {
                products: result.recordset,
                total: total,
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
        console.error('Get wishlist error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve wishlist',
            error: error.message
        });
    }
});

// Check if products are in user's wishlist (for multiple products)
router.post('/check', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const { product_ids } = req.body;
        const user_id = req.user.id;

        // Validate product_ids
        if (!Array.isArray(product_ids) || product_ids.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid product IDs array is required'
            });
        }

        // Build query for multiple product IDs
        const placeholders = product_ids.map((_, index) => `@productId${index}`).join(',');
        
        let query = `
            SELECT product_id
            FROM Wishlists 
            WHERE user_id = @userId AND product_id IN (${placeholders})
        `;

        let request = pool.request().input('userId', sql.Int, user_id);
        
        product_ids.forEach((id, index) => {
            request = request.input(`productId${index}`, sql.Int, parseInt(id));
        });

        const result = await request.query(query);
        
        // Create a map of wishlist status
        const wishlistStatus = {};
        product_ids.forEach(id => {
            wishlistStatus[id] = false;
        });
        
        result.recordset.forEach(row => {
            wishlistStatus[row.product_id] = true;
        });

        res.json({
            status: 'success',
            message: 'Wishlist status checked successfully',
            data: wishlistStatus
        });

    } catch (error) {
        console.error('Check wishlist error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check wishlist status',
            error: error.message
        });
    }
});

// Get wishlist count
router.get('/count', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const user_id = req.user.id;

        const result = await pool.request()
            .input('userId', sql.Int, user_id)
            .query('SELECT COUNT(*) as count FROM Wishlists WHERE user_id = @userId');

        res.json({
            status: 'success',
            message: 'Wishlist count retrieved successfully',
            data: {
                count: result.recordset[0].count
            }
        });

    } catch (error) {
        console.error('Get wishlist count error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get wishlist count',
            error: error.message
        });
    }
});

module.exports = router;
