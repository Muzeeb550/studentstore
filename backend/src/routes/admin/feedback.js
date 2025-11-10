const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { requireAdmin } = require('../../middleware/adminAuth');


// All routes require admin authentication
router.use(requireAdmin);


// ============================================
// GET ALL APP RATINGS (Admin View)
// ============================================


router.get('/ratings', async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const sortBy = req.query.sort || 'newest'; // newest, oldest, rating_high, rating_low, updated
        const offset = (page - 1) * limit;


        // Build sort order
        let orderBy;
        switch (sortBy) {
            case 'oldest': orderBy = 'ORDER BY created_at ASC'; break;
            case 'rating_high': orderBy = 'ORDER BY rating DESC, updated_at DESC'; break;
            case 'rating_low': orderBy = 'ORDER BY rating ASC, updated_at DESC'; break;
            case 'updated': orderBy = 'ORDER BY updated_at DESC'; break;
            default: orderBy = 'ORDER BY created_at DESC';
        }


        // Get ratings with pagination
        const ratingsResult = await pool.query(`
            SELECT 
                id, user_id, user_name, user_email, rating, review_text,
                user_agent, created_at, updated_at,
                CASE 
                    WHEN updated_at > created_at THEN true 
                    ELSE false 
                END as is_updated
            FROM app_ratings
            ${orderBy}
            OFFSET $1 LIMIT $2
        `, [offset, limit]);


        // Get total count
        const countResult = await pool.query('SELECT COUNT(*) as total FROM app_ratings');
        const total = parseInt(countResult.rows[0].total, 10);


        // Get statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_ratings,
                AVG(rating) as average_rating,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(CASE WHEN updated_at > created_at THEN 1 END) as updated_ratings
            FROM app_ratings
        `);


        // Get rating distribution
        const distributionResult = await pool.query(`
            SELECT rating, COUNT(*) as count
            FROM app_ratings
            GROUP BY rating
            ORDER BY rating DESC
        `);


        const ratingDistribution = {
            '5': 0, '4': 0, '3': 0, '2': 0, '1': 0
        };
        distributionResult.rows.forEach(row => {
            ratingDistribution[row.rating.toString()] = parseInt(row.count, 10);
        });


        const totalPages = Math.ceil(total / limit);


        res.json({
            status: 'success',
            message: 'App ratings retrieved successfully',
            data: {
                ratings: ratingsResult.rows,
                stats: {
                    ...statsResult.rows[0],
                    average_rating: parseFloat(statsResult.rows[0].average_rating || 0).toFixed(2),
                    rating_distribution: ratingDistribution
                },
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total,
                    total_pages: totalPages,
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            },
            meta: {
                count: ratingsResult.rows.length,
                sort: sortBy
            }
        });


    } catch (error) {
        console.error('Get admin ratings error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve ratings',
            error: error.message
        });
    }
});


// ============================================
// GET ALL PRODUCT RECOMMENDATIONS (Admin View)
// ============================================


router.get('/recommendations', async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '20', 10);
        const sortBy = req.query.sort || 'newest'; // newest, oldest
        const offset = (page - 1) * limit;


        // Build sort order
        let orderBy;
        switch (sortBy) {
            case 'oldest': orderBy = 'ORDER BY created_at ASC'; break;
            default: orderBy = 'ORDER BY created_at DESC';
        }


        // ✅ UPDATED: Include add_to_posts field in SELECT
        const recommendationsResult = await pool.query(`
            SELECT 
                id, user_id, user_name, user_email, 
                product_name, review_text, product_link, 
                product_images, price, created_at, add_to_posts
            FROM product_recommendations
            ${orderBy}
            OFFSET $1 LIMIT $2
        `, [offset, limit]);


        // Get total count
        const countResult = await pool.query('SELECT COUNT(*) as total FROM product_recommendations');
        const total = parseInt(countResult.rows[0].total, 10);


        // ✅ UPDATED: Add statistics for add_to_posts
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_recommendations,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(CASE WHEN product_images IS NOT NULL AND product_images != '[]' THEN 1 END) as with_images,
                AVG(price) as average_price,
                COUNT(CASE WHEN add_to_posts = true THEN 1 END) as wants_in_posts,
                COUNT(CASE WHEN add_to_posts = false THEN 1 END) as declined_posts,
                COUNT(CASE WHEN add_to_posts IS NULL THEN 1 END) as pending_response
            FROM product_recommendations
        `);


        const totalPages = Math.ceil(total / limit);


        res.json({
            status: 'success',
            message: 'Product recommendations retrieved successfully',
            data: {
                recommendations: recommendationsResult.rows,
                stats: {
                    ...statsResult.rows[0],
                    average_price: parseFloat(statsResult.rows[0].average_price || 0).toFixed(2)
                },
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total,
                    total_pages: totalPages,
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            },
            meta: {
                count: recommendationsResult.rows.length,
                sort: sortBy
            }
        });


    } catch (error) {
        console.error('Get admin recommendations error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve recommendations',
            error: error.message
        });
    }
});


// ============================================
// DELETE PRODUCT RECOMMENDATION
// ============================================


router.delete('/recommendations/:id', async (req, res) => {
    try {
        const { id } = req.params;


        if (!id || isNaN(parseInt(id, 10))) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid recommendation ID'
            });
        }


        // Get recommendation info before deletion
        const recommendationInfo = await pool.query(
            'SELECT product_name, user_name FROM product_recommendations WHERE id = $1',
            [id]
        );


        if (recommendationInfo.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Recommendation not found'
            });
        }


        const { product_name, user_name } = recommendationInfo.rows[0];


        // Delete recommendation
        const result = await pool.query(
            'DELETE FROM product_recommendations WHERE id = $1',
            [id]
        );


        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Recommendation not found'
            });
        }


        console.log(`🗑️ Recommendation deleted: "${product_name}" by ${user_name} (ID: ${id})`);


        res.json({
            status: 'success',
            message: `Recommendation "${product_name}" by ${user_name} deleted successfully`,
            data: {
                deleted_id: parseInt(id, 10),
                product_name,
                user_name
            }
        });


    } catch (error) {
        console.error('Delete recommendation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete recommendation',
            error: error.message
        });
    }
});


// ============================================
// GET FEEDBACK DASHBOARD STATS (for Admin Dashboard)
// ============================================


router.get('/stats', async (req, res) => {
    try {
        const [ratingsStats, recommendationsStats, recentRatings, recentRecommendations] = await Promise.all([
            // Ratings stats
            pool.query(`
                SELECT 
                    COUNT(*) as total_ratings,
                    AVG(rating) as average_rating,
                    COUNT(DISTINCT user_id) as unique_raters,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_ratings
                FROM app_ratings
            `),
            
            // Recommendations stats
            pool.query(`
                SELECT 
                    COUNT(*) as total_recommendations,
                    COUNT(DISTINCT user_id) as unique_recommenders,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_recommendations
                FROM product_recommendations
            `),
            
            // Recent ratings (last 5)
            pool.query(`
                SELECT user_name, rating, review_text, created_at
                FROM app_ratings
                ORDER BY created_at DESC
                LIMIT 5
            `),
            
            // Recent recommendations (last 5)
            pool.query(`
                SELECT user_name, product_name, created_at
                FROM product_recommendations
                ORDER BY created_at DESC
                LIMIT 5
            `)
        ]);


        res.json({
            status: 'success',
            message: 'Feedback dashboard stats retrieved successfully',
            data: {
                ratings: {
                    ...ratingsStats.rows[0],
                    average_rating: parseFloat(ratingsStats.rows[0].average_rating || 0).toFixed(2),
                    recent_activity: recentRatings.rows
                },
                recommendations: {
                    ...recommendationsStats.rows[0],
                    recent_activity: recentRecommendations.rows
                }
            }
        });


    } catch (error) {
        console.error('Get feedback stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve feedback stats',
            error: error.message
        });
    }
});


module.exports = router;
