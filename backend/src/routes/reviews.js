const express = require('express');
const { getPool, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting for review operations
const reviewLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Maximum 10 review operations per 15 minutes
    keyGenerator: (req) => req.user.id,
    message: {
        status: 'error',
        message: 'Too many review operations. Please try again later.',
        code: 'REVIEW_RATE_LIMIT_EXCEEDED'
    }
});

// Get reviews for a specific product (public route)
router.get('/product/:productId', async (req, res) => {
    try {
        const pool = await getPool();
        const productId = parseInt(req.params.productId);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sort || 'newest'; // newest, oldest, rating_high, rating_low, helpful
        const offset = (page - 1) * limit;

        // Validate product ID
        if (!productId || isNaN(productId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid product ID'
            });
        }

        // Build sort order
        let orderBy = '';
        switch (sortBy) {
            case 'oldest':
                orderBy = 'r.created_at ASC';
                break;
            case 'rating_high':
                orderBy = 'r.rating DESC, r.created_at DESC';
                break;
            case 'rating_low':
                orderBy = 'r.rating ASC, r.created_at DESC';
                break;
            case 'helpful':
                orderBy = 'r.helpfulness_score DESC, r.created_at DESC';
                break;
            default: // newest
                orderBy = 'r.created_at DESC';
                break;
        }

        // Get reviews with user information
        const reviewsResult = await pool.request()
            .input('productId', sql.Int, productId)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    r.id, r.rating, r.review_text, r.review_images,
                    r.is_verified_purchase, r.helpfulness_score,
                    r.created_at, r.updated_at,
                    u.name, u.display_name, u.profile_picture
                FROM Reviews r
                INNER JOIN Users u ON r.user_id = u.id
                WHERE r.product_id = @productId
                ORDER BY ${orderBy}
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        // Get total count for pagination
        const countResult = await pool.request()
            .input('productId', sql.Int, productId)
            .query('SELECT COUNT(*) as total FROM Reviews WHERE product_id = @productId');

        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / limit);

        // Get rating distribution
        const ratingDistResult = await pool.request()
            .input('productId', sql.Int, productId)
            .query(`
                SELECT 
                    rating,
                    COUNT(*) as count
                FROM Reviews 
                WHERE product_id = @productId
                GROUP BY rating
                ORDER BY rating DESC
            `);

        res.json({
            status: 'success',
            message: 'Product reviews retrieved successfully',
            data: {
                reviews: reviewsResult.recordset,
                rating_distribution: ratingDistResult.recordset,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: total,
                    total_pages: totalPages,
                    has_next: page < totalPages,
                    has_prev: page > 1
                },
                sort: sortBy
            }
        });

    } catch (error) {
        console.error('Get product reviews error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve reviews',
            error: error.message
        });
    }
});

// Create a new review (authenticated users only) - FIXED: Allow multiple reviews
router.post('/', authenticateToken, reviewLimit, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        const { product_id, rating, review_text, review_images } = req.body;

        // Validate required fields
        if (!product_id || !rating) {
            return res.status(400).json({
                status: 'error',
                message: 'Product ID and rating are required'
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating must be between 1 and 5'
            });
        }

        // Check if product exists
        const productCheck = await pool.request()
            .input('productId', sql.Int, product_id)
            .query('SELECT id FROM Products WHERE id = @productId');

        if (productCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        // REMOVED: The duplicate review check to allow multiple reviews per user
        // Users can now write unlimited reviews for the same product

        // Create new review
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('productId', sql.Int, product_id)
            .input('rating', sql.Int, rating)
            .input('reviewText', sql.NVarChar, review_text || null)
            .input('reviewImages', sql.NVarChar, JSON.stringify(review_images || []))
            .query(`
                INSERT INTO Reviews (user_id, product_id, rating, review_text, review_images, created_at, updated_at)
                OUTPUT INSERTED.*
                VALUES (@userId, @productId, @rating, @reviewText, @reviewImages, GETDATE(), GETDATE())
            `);

        // Update product rating statistics
        await updateProductRatingStats(pool, product_id);

        res.status(201).json({
            status: 'success',
            message: 'Review created successfully',
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create review',
            error: error.message
        });
    }
});

// Update user's review (authenticated users only)
router.put('/:reviewId', authenticateToken, reviewLimit, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        const reviewId = parseInt(req.params.reviewId);
        const { rating, review_text, review_images } = req.body;

        // Validate review ID
        if (!reviewId || isNaN(reviewId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid review ID'
            });
        }

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating must be between 1 and 5'
            });
        }

        // Check if review exists and belongs to user
        const reviewCheck = await pool.request()
            .input('reviewId', sql.Int, reviewId)
            .input('userId', sql.Int, userId)
            .query('SELECT id, product_id FROM Reviews WHERE id = @reviewId AND user_id = @userId');

        if (reviewCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found or access denied'
            });
        }

        const productId = reviewCheck.recordset[0].product_id;

        // Update review
        const result = await pool.request()
            .input('reviewId', sql.Int, reviewId)
            .input('rating', sql.Int, rating)
            .input('reviewText', sql.NVarChar, review_text || null)
            .input('reviewImages', sql.NVarChar, JSON.stringify(review_images || []))
            .query(`
                UPDATE Reviews 
                SET rating = @rating,
                    review_text = @reviewText,
                    review_images = @reviewImages,
                    updated_at = GETDATE()
                WHERE id = @reviewId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found'
            });
        }

        // Update product rating statistics
        await updateProductRatingStats(pool, productId);

        res.json({
            status: 'success',
            message: 'Review updated successfully'
        });

    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update review',
            error: error.message
        });
    }
});

// Delete user's review (authenticated users only)
router.delete('/:reviewId', authenticateToken, reviewLimit, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        const reviewId = parseInt(req.params.reviewId);

        // Validate review ID
        if (!reviewId || isNaN(reviewId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid review ID'
            });
        }

        // Check if review exists and belongs to user
        const reviewCheck = await pool.request()
            .input('reviewId', sql.Int, reviewId)
            .input('userId', sql.Int, userId)
            .query('SELECT id, product_id FROM Reviews WHERE id = @reviewId AND user_id = @userId');

        if (reviewCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found or access denied'
            });
        }

        const productId = reviewCheck.recordset[0].product_id;

        // Delete review
        const result = await pool.request()
            .input('reviewId', sql.Int, reviewId)
            .query('DELETE FROM Reviews WHERE id = @reviewId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found'
            });
        }

        // Update product rating statistics
        await updateProductRatingStats(pool, productId);

        res.json({
            status: 'success',
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete review',
            error: error.message
        });
    }
});

// Get user's reviews (authenticated users only)
router.get('/my-reviews', authenticateToken, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get user's reviews with product information
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    r.id, r.rating, r.review_text, r.review_images,
                    r.helpfulness_score, r.created_at, r.updated_at,
                    p.id as product_id, p.name as product_name, p.image_urls as product_images
                FROM Reviews r
                INNER JOIN Products p ON r.product_id = p.id
                WHERE r.user_id = @userId
                ORDER BY r.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        // Get total count
        const countResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT COUNT(*) as total FROM Reviews WHERE user_id = @userId');

        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            status: 'success',
            message: 'User reviews retrieved successfully',
            data: {
                reviews: result.recordset,
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
        console.error('Get user reviews error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user reviews',
            error: error.message
        });
    }
});

// Helper function to update product rating statistics
async function updateProductRatingStats(pool, productId) {
    try {
        await pool.request()
            .input('productId', sql.Int, productId)
            .query(`
                UPDATE Products 
                SET 
                    rating_average = (
                        SELECT AVG(CAST(rating AS DECIMAL(3,2))) 
                        FROM Reviews 
                        WHERE product_id = @productId
                    ),
                    review_count = (
                        SELECT COUNT(*) 
                        FROM Reviews 
                        WHERE product_id = @productId
                    ),
                    updated_at = GETDATE()
                WHERE id = @productId
            `);
    } catch (error) {
        console.error('Error updating product rating stats:', error);
        throw error;
    }
}

module.exports = router;
