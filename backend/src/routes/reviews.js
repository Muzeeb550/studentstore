const express = require('express');
const { getPool, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const { invalidateCache } = require('../config/redis'); // 🚀 ADDED: Enterprise cache invalidation
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

// 🚀 ENHANCED: Create a new review with intelligent cache invalidation
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

        // 🚀 ENHANCED: Get product info for comprehensive cache invalidation
        const productCheck = await pool.request()
            .input('productId', sql.Int, product_id)
            .query('SELECT id, name, category_id FROM Products WHERE id = @productId');

        if (productCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        const productInfo = productCheck.recordset[0];

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

        // 🚀 ENTERPRISE CACHE INVALIDATION (like Amazon review system)
        try {
            // Primary: Invalidate product details cache (rating/review count changed)
            await invalidateCache.reviews(product_id);
            
            // Secondary: Invalidate category cache (product rating affects category display)
            await invalidateCache.products(productInfo.category_id, product_id);
            
            console.log(`🔄 Cache invalidated for new review on product: ${productInfo.name} (ID: ${product_id}) - Rating: ${rating}/5`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.status(201).json({
            status: 'success',
            message: 'Review created successfully',
            data: {
                ...result.recordset[0],
                product_name: productInfo.name // 🚀 ADDED: Product context
            },
            cacheCleared: true // 🚀 ADDED: Cache status
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

// 🚀 ENHANCED: Update user's review with intelligent cache invalidation
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

        // 🚀 ENHANCED: Get review and product info for comprehensive cache invalidation
        const reviewCheck = await pool.request()
            .input('reviewId', sql.Int, reviewId)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT r.id, r.product_id, r.rating as old_rating, 
                       p.name as product_name, p.category_id
                FROM Reviews r
                INNER JOIN Products p ON r.product_id = p.id
                WHERE r.id = @reviewId AND r.user_id = @userId
            `);

        if (reviewCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found or access denied'
            });
        }

        const reviewInfo = reviewCheck.recordset[0];
        const productId = reviewInfo.product_id;
        const oldRating = reviewInfo.old_rating;

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

        // 🚀 INTELLIGENT CACHE INVALIDATION (rating change affects product stats)
        try {
            await invalidateCache.reviews(productId);
            
            // If rating changed significantly, also clear category and featured product caches
            if (Math.abs(rating - oldRating) >= 1) {
                await invalidateCache.products(reviewInfo.category_id, productId);
                console.log(`🔄 Cache invalidated for review update with rating change: ${oldRating} → ${rating} (Product: ${reviewInfo.product_name})`);
            } else {
                console.log(`🔄 Cache invalidated for review update: ${reviewInfo.product_name} (ID: ${productId})`);
            }
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Review updated successfully',
            data: {
                reviewId: reviewId,
                productName: reviewInfo.product_name,
                oldRating: oldRating,
                newRating: rating
            },
            cacheCleared: true // 🚀 ADDED: Cache status
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

// 🚀 ENHANCED: Delete user's review with intelligent cache invalidation
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

        // 🚀 ENHANCED: Get comprehensive info before deletion for cache invalidation
        const reviewCheck = await pool.request()
            .input('reviewId', sql.Int, reviewId)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT r.id, r.product_id, r.rating, 
                       p.name as product_name, p.category_id, p.review_count
                FROM Reviews r
                INNER JOIN Products p ON r.product_id = p.id
                WHERE r.id = @reviewId AND r.user_id = @userId
            `);

        if (reviewCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found or access denied'
            });
        }

        const reviewInfo = reviewCheck.recordset[0];
        const productId = reviewInfo.product_id;
        const deletedRating = reviewInfo.rating;
        const isLastReview = reviewInfo.review_count <= 1;

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

        // 🚀 COMPREHENSIVE CACHE INVALIDATION (deletion affects product stats significantly)
        try {
            await invalidateCache.reviews(productId);
            
            // If this was the last review or a high/low rating, clear more caches
            if (isLastReview || deletedRating === 5 || deletedRating === 1) {
                await invalidateCache.products(reviewInfo.category_id, productId);
                console.log(`🔄 Cache invalidated for significant review deletion: ${deletedRating}/5 stars (Product: ${reviewInfo.product_name}, Last review: ${isLastReview})`);
            } else {
                console.log(`🔄 Cache invalidated for review deletion: ${reviewInfo.product_name} (${deletedRating}/5 stars)`);
            }
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Review deleted successfully',
            data: {
                reviewId: reviewId,
                productName: reviewInfo.product_name,
                deletedRating: deletedRating,
                wasLastReview: isLastReview
            },
            cacheCleared: true // 🚀 ADDED: Cache status
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

// 🚀 ENHANCED: Helper function with comprehensive error handling
async function updateProductRatingStats(pool, productId) {
    try {
        const startTime = Date.now();
        
        await pool.request()
            .input('productId', sql.Int, productId)
            .query(`
                UPDATE Products 
                SET 
                    rating_average = (
                        SELECT 
                            CASE 
                                WHEN COUNT(*) = 0 THEN NULL 
                                ELSE AVG(CAST(rating AS DECIMAL(3,2))) 
                            END
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
        
        const duration = Date.now() - startTime;
        console.log(`📊 Product rating stats updated for Product ID: ${productId} (${duration}ms)`);
        
    } catch (error) {
        console.error('❌ Error updating product rating stats:', error);
        throw error;
    }
}

// 🚀 NEW: Admin route to recalculate all product ratings (maintenance)
router.post('/admin/recalculate-ratings', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin (you might want to add admin check middleware)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Admin access required'
            });
        }

        const pool = await getPool();
        const startTime = Date.now();

        // Recalculate all product ratings
        await pool.request().query(`
            UPDATE Products 
            SET 
                rating_average = COALESCE(
                    (SELECT AVG(CAST(rating AS DECIMAL(3,2))) 
                     FROM Reviews 
                     WHERE product_id = Products.id), 
                    NULL
                ),
                review_count = COALESCE(
                    (SELECT COUNT(*) 
                     FROM Reviews 
                     WHERE product_id = Products.id), 
                    0
                ),
                updated_at = GETDATE()
        `);

        // Clear all product-related caches
        await invalidateCache.products();
        await invalidateCache.search();

        const duration = Date.now() - startTime;
        
        res.json({
            status: 'success',
            message: 'All product ratings recalculated successfully',
            data: {
                duration: `${duration}ms`,
                cacheCleared: true
            }
        });

    } catch (error) {
        console.error('Recalculate ratings error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to recalculate ratings',
            error: error.message
        });
    }
});

module.exports = router;
