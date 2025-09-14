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
