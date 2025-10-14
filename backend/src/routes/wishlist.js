const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const { deleteCache } = require('../config/redis');  // ✅ ADDED
const router = express.Router();

// Add product to wishlist
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { product_id } = req.body;
        const user_id = req.user.id;

        if (!product_id || isNaN(parseInt(product_id, 10))) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid product ID is required'
            });
        }

        const productCheck = await pool.query(
            'SELECT id FROM Products WHERE id = $1',
            [parseInt(product_id, 10)]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        const existingCheck = await pool.query(
            'SELECT id FROM Wishlists WHERE user_id = $1 AND product_id = $2',
            [user_id, parseInt(product_id, 10)]
        );

        if (existingCheck.rows.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Product already in wishlist'
            });
        }

        await pool.query(
            'INSERT INTO Wishlists (user_id, product_id, created_at) VALUES ($1, $2, NOW())',
            [user_id, parseInt(product_id, 10)]
        );

        // ✅ Clear user's cached stats for instant updates
        try {
            await deleteCache(`profile:user:${user_id}`);
            await deleteCache(`dashboard:user:${user_id}`);
            await deleteCache(`stats:user:${user_id}`);
            console.log(`🔄 Cache cleared for user ${user_id} after adding product ${product_id} to wishlist`);
        } catch (cacheError) {
            console.error('⚠️ Cache clearing failed (non-critical):', cacheError.message);
        }

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
        const product_id = parseInt(req.params.productId, 10);
        const user_id = req.user.id;

        if (!product_id || isNaN(product_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid product ID is required'
            });
        }

        const result = await pool.query(
            'DELETE FROM Wishlists WHERE user_id = $1 AND product_id = $2',
            [user_id, product_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found in wishlist'
            });
        }

        // ✅ Clear user's cached stats for instant updates
        try {
            await deleteCache(`profile:user:${user_id}`);
            await deleteCache(`dashboard:user:${user_id}`);
            await deleteCache(`stats:user:${user_id}`);
            console.log(`🔄 Cache cleared for user ${user_id} after removing product ${product_id} from wishlist`);
        } catch (cacheError) {
            console.error('⚠️ Cache clearing failed (non-critical):', cacheError.message);
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
        const user_id = req.user.id;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '12', 10);
        const offset = (page - 1) * limit;

        const result = await pool.query(`
            SELECT 
                w.id as wishlist_id,
                w.created_at as added_at,
                p.id, p.name, p.description, p.image_urls,
                p.buy_button_1_name, p.buy_button_1_url,
                p.views_count, p.rating_average, p.review_count,
                c.name as category_name
            FROM Wishlists w
            JOIN Products p ON w.product_id = p.id
            JOIN Categories c ON p.category_id = c.id
            WHERE w.user_id = $1
            ORDER BY w.created_at DESC
            OFFSET $2 LIMIT $3
        `, [user_id, offset, limit]);

        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM Wishlists WHERE user_id = $1',
            [user_id]
        );

        const total = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        res.json({
            status: 'success',
            message: 'Wishlist retrieved successfully',
            data: {
                products: result.rows,
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
        const { product_ids } = req.body;
        const user_id = req.user.id;

        if (!Array.isArray(product_ids) || product_ids.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid product IDs array is required'
            });
        }

        // Build parameterized query for PostgreSQL
        const placeholders = product_ids.map((_, index) => `$${index + 2}`).join(',');
        const query = `
            SELECT product_id
            FROM Wishlists 
            WHERE user_id = $1 AND product_id IN (${placeholders})
        `;

        const params = [user_id, ...product_ids.map(id => parseInt(id, 10))];
        const result = await pool.query(query, params);
        
        // Create a map of wishlist status
        const wishlistStatus = {};
        product_ids.forEach(id => {
            wishlistStatus[id] = false;
        });
        
        result.rows.forEach(row => {
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
        const user_id = req.user.id;

        const result = await pool.query(
            'SELECT COUNT(*) as count FROM Wishlists WHERE user_id = $1',
            [user_id]
        );

        res.json({
            status: 'success',
            message: 'Wishlist count retrieved successfully',
            data: {
                count: parseInt(result.rows[0].count, 10)
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
