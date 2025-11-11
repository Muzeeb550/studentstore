const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const { invalidateCache, deleteCache } = require('../config/redis');
const { addDefaultTransformations } = require('../utils/imagekitHelper'); // ✅ NEW IMPORT
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting for review operations
const reviewLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => `user:${req.user.id}`,
    message: {
        status: 'error',
        message: 'Too many review operations. Please try again later.',
        code: 'REVIEW_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 🔥 NEW: Image size validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_REVIEW = 3;

// Get reviews for a specific product (public route)
router.get('/product/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId, 10);
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const sortBy = req.query.sort || 'newest';
        const offset = (page - 1) * limit;

        if (!productId || Number.isNaN(productId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid product ID'
            });
        }

        // Build sort order
        let orderBy;
        switch (sortBy) {
            case 'oldest': orderBy = 'r.created_at ASC'; break;
            case 'rating_high': orderBy = 'r.rating DESC, r.created_at DESC'; break;
            case 'rating_low': orderBy = 'r.rating ASC, r.created_at DESC'; break;
            case 'helpful': orderBy = 'r.helpfulness_score DESC, r.created_at DESC'; break;
            default: orderBy = 'r.created_at DESC';
        }

        const reviewsQuery = `
            SELECT 
                r.id, r.rating, r.review_text, r.review_images,
                r.is_verified_purchase, r.helpfulness_score,
                r.helpful_count, r.not_helpful_count,
                r.created_at, r.updated_at,
                u.name, u.display_name, u.profile_picture
            FROM Reviews r
            JOIN Users u ON r.user_id = u.id
            WHERE r.product_id = $1
            ORDER BY ${orderBy}
            OFFSET $2 LIMIT $3
        `;
        const reviewsResult = await pool.query(reviewsQuery, [productId, offset, limit]);

        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM Reviews WHERE product_id = $1',
            [productId]
        );
        const total = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        const ratingDistResult = await pool.query(`
            SELECT rating, COUNT(*) as count
            FROM Reviews 
            WHERE product_id = $1
            GROUP BY rating
            ORDER BY rating DESC
        `, [productId]);

        res.json({
            status: 'success',
            message: 'Product reviews retrieved successfully',
            data: {
                reviews: reviewsResult.rows,
                rating_distribution: ratingDistResult.rows,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total,
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

// ✅ UPDATED: Create a new review with image optimization and 10MB limit
router.post('/', authenticateToken, reviewLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id, rating, review_text, review_images } = req.body;

        if (!product_id || !rating) {
            return res.status(400).json({
                status: 'error',
                message: 'Product ID and rating are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating must be between 1 and 5'
            });
        }

        // 🔥 NEW: Validate review images
        if (review_images && Array.isArray(review_images)) {
            if (review_images.length > MAX_IMAGES_PER_REVIEW) {
                return res.status(400).json({
                    status: 'error',
                    message: `Maximum ${MAX_IMAGES_PER_REVIEW} images allowed per review`
                });
            }

            // Note: Image size validation happens on frontend before upload to ImageKit
            // Backend validates the array structure and count only
            const invalidImages = review_images.filter(url => !url || typeof url !== 'string' || !url.includes('imagekit.io'));
            if (invalidImages.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid image URLs detected. Images must be uploaded to ImageKit first.'
                });
            }
        }

        const productCheck = await pool.query(
            'SELECT id, name, category_id FROM Products WHERE id = $1',
            [product_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        const productInfo = productCheck.rows[0];

        // ✅ Optimize review images before storing
        let optimizedReviewImages = [];
        if (Array.isArray(review_images) && review_images.length > 0) {
            optimizedReviewImages = review_images
                .filter(url => url && url.trim() !== '')
                .map(url => addDefaultTransformations(url, 'review'));
            
            console.log(`🎨 Optimized ${optimizedReviewImages.length} review images (10MB max per image)`);
        }

        const result = await pool.query(`
            INSERT INTO Reviews (user_id, product_id, rating, review_text, review_images, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING *
        `, [userId, product_id, rating, review_text || null, JSON.stringify(optimizedReviewImages)]);

        // Update product rating statistics
        await updateProductRatingStats(product_id);

        // Cache invalidation
        try {
            await invalidateCache.reviews(product_id);
            await invalidateCache.products(productInfo.category_id, product_id);
            
            // Clear user's cached stats for instant updates
            await deleteCache(`profile:user:${userId}`);
            await deleteCache(`dashboard:user:${userId}`);
            await deleteCache(`stats:user:${userId}`);
            
            console.log(`🔄 Cache invalidated for new review on product: ${productInfo.name} (ID: ${product_id}) - Rating: ${rating}/5`);
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.status(201).json({
            status: 'success',
            message: 'Review created successfully with optimized images (10MB max)',
            data: {
                ...result.rows[0],
                product_name: productInfo.name,
                max_image_size: '10MB'
            },
            cacheCleared: true
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

// ✅ UPDATED: Update user's review with image optimization and 10MB limit
router.put('/:reviewId', authenticateToken, reviewLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewId = parseInt(req.params.reviewId, 10);
        const { rating, review_text, review_images } = req.body;

        if (!reviewId || Number.isNaN(reviewId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid review ID'
            });
        }

        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating must be between 1 and 5'
            });
        }

        // 🔥 NEW: Validate review images
        if (review_images && Array.isArray(review_images)) {
            if (review_images.length > MAX_IMAGES_PER_REVIEW) {
                return res.status(400).json({
                    status: 'error',
                    message: `Maximum ${MAX_IMAGES_PER_REVIEW} images allowed per review`
                });
            }

            const invalidImages = review_images.filter(url => !url || typeof url !== 'string' || !url.includes('imagekit.io'));
            if (invalidImages.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid image URLs detected. Images must be uploaded to ImageKit first.'
                });
            }
        }

        const reviewCheck = await pool.query(`
            SELECT r.id, r.product_id, r.rating as old_rating, 
                   p.name as product_name, p.category_id
            FROM Reviews r
            JOIN Products p ON r.product_id = p.id
            WHERE r.id = $1 AND r.user_id = $2
        `, [reviewId, userId]);

        if (reviewCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found or access denied'
            });
        }

        const reviewInfo = reviewCheck.rows[0];
        const productId = reviewInfo.product_id;
        const oldRating = reviewInfo.old_rating;

        // ✅ Optimize review images before storing
        let optimizedReviewImages = [];
        if (Array.isArray(review_images) && review_images.length > 0) {
            optimizedReviewImages = review_images
                .filter(url => url && url.trim() !== '')
                .map(url => addDefaultTransformations(url, 'review'));
            
            console.log(`🎨 Optimized ${optimizedReviewImages.length} review images for update (10MB max)`);
        }

        const result = await pool.query(`
            UPDATE Reviews 
            SET rating = $1, review_text = $2, review_images = $3, updated_at = NOW()
            WHERE id = $4
        `, [rating, review_text || null, JSON.stringify(optimizedReviewImages), reviewId]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found'
            });
        }

        await updateProductRatingStats(productId);

        // Cache invalidation
        try {
            await invalidateCache.reviews(productId);
            if (Math.abs(rating - oldRating) >= 1) {
                await invalidateCache.products(reviewInfo.category_id, productId);
                console.log(`🔄 Cache invalidated for review update with rating change: ${oldRating} → ${rating} (Product: ${reviewInfo.product_name})`);
            } else {
                console.log(`🔄 Cache invalidated for review update: ${reviewInfo.product_name} (ID: ${productId})`);
            }
            
            // Clear user's cached stats for instant updates
            await deleteCache(`profile:user:${userId}`);
            await deleteCache(`dashboard:user:${userId}`);
            await deleteCache(`stats:user:${userId}`);
            
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Review updated successfully with optimized images (10MB max)',
            data: {
                reviewId,
                productName: reviewInfo.product_name,
                oldRating,
                newRating: rating,
                max_image_size: '10MB'
            },
            cacheCleared: true
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

// Delete user's review with intelligent cache invalidation
router.delete('/:reviewId', authenticateToken, reviewLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewId = parseInt(req.params.reviewId, 10);

        if (!reviewId || Number.isNaN(reviewId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid review ID'
            });
        }

        const reviewCheck = await pool.query(`
            SELECT r.id, r.product_id, r.rating, 
                   p.name as product_name, p.category_id, p.review_count
            FROM Reviews r
            JOIN Products p ON r.product_id = p.id
            WHERE r.id = $1 AND r.user_id = $2
        `, [reviewId, userId]);

        if (reviewCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found or access denied'
            });
        }

        const reviewInfo = reviewCheck.rows[0];
        const productId = reviewInfo.product_id;
        const deletedRating = reviewInfo.rating;
        const isLastReview = reviewInfo.review_count <= 1;

        const result = await pool.query('DELETE FROM Reviews WHERE id = $1', [reviewId]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found'
            });
        }

        await updateProductRatingStats(productId);

        // Cache invalidation
        try {
            await invalidateCache.reviews(productId);
            if (isLastReview || deletedRating === 5 || deletedRating === 1) {
                await invalidateCache.products(reviewInfo.category_id, productId);
                console.log(`🔄 Cache invalidated for significant review deletion: ${deletedRating}/5 stars (Product: ${reviewInfo.product_name}, Last review: ${isLastReview})`);
            } else {
                console.log(`🔄 Cache invalidated for review deletion: ${reviewInfo.product_name} (${deletedRating}/5 stars)`);
            }
            
            // Clear user's cached stats for instant updates
            await deleteCache(`profile:user:${userId}`);
            await deleteCache(`dashboard:user:${userId}`);
            await deleteCache(`stats:user:${userId}`);
            
        } catch (cacheError) {
            console.error('⚠️ Cache invalidation failed (non-critical):', cacheError.message);
        }

        res.json({
            status: 'success',
            message: 'Review deleted successfully',
            data: {
                reviewId,
                productName: reviewInfo.product_name,
                deletedRating,
                wasLastReview: isLastReview
            },
            cacheCleared: true
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
        const userId = req.user.id;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const offset = (page - 1) * limit;

        const result = await pool.query(`
        SELECT 
            r.id, r.rating, r.review_text, r.review_images,
            r.helpful_count, r.not_helpful_count,
            r.helpfulness_score, r.created_at, r.updated_at,
            p.id as product_id, p.name as product_name, p.image_urls as product_images
            FROM Reviews r
            JOIN Products p ON r.product_id = p.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            OFFSET $2 LIMIT $3
        `, [userId, offset, limit]);


        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM Reviews WHERE user_id = $1',
            [userId]
        );
        const total = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        res.json({
            status: 'success',
            message: 'User reviews retrieved successfully',
            data: {
                reviews: result.rows,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total,
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

// Helper function to update product rating stats
async function updateProductRatingStats(productId) {
    try {
        const startTime = Date.now();
        
        await pool.query(`
            UPDATE Products 
            SET 
                rating_average = (
                    SELECT 
                        CASE 
                            WHEN COUNT(*) = 0 THEN NULL 
                            ELSE AVG(rating::DECIMAL(3,2)) 
                        END
                    FROM Reviews 
                    WHERE product_id = $1
                ),
                review_count = (
                    SELECT COUNT(*) 
                    FROM Reviews 
                    WHERE product_id = $1
                ),
                updated_at = NOW()
            WHERE id = $1
        `, [productId]);
        
        const duration = Date.now() - startTime;
        console.log(`📊 Product rating stats updated for Product ID: ${productId} (${duration}ms)`);
    } catch (error) {
        console.error('❌ Error updating product rating stats:', error);
        throw error;
    }
}

// Admin route to recalculate all product ratings (maintenance)
router.post('/admin/recalculate-ratings', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Admin access required'
            });
        }

        const startTime = Date.now();

        await pool.query(`
            UPDATE Products 
            SET 
                rating_average = COALESCE(
                    (SELECT AVG(rating::DECIMAL(3,2)) 
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
                updated_at = NOW()
        `);

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

// Vote on review helpfulness
router.post('/:reviewId/vote', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const reviewId = parseInt(req.params.reviewId, 10);
        const { voteType } = req.body;

        if (!reviewId || Number.isNaN(reviewId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid review ID'
            });
        }

        if (!voteType || !['helpful', 'not_helpful'].includes(voteType)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid vote type. Must be "helpful" or "not_helpful"'
            });
        }

        // Check if review exists
        const reviewCheck = await pool.query(
            'SELECT id, product_id, user_id FROM reviews WHERE id = $1',
            [reviewId]
        );

        if (reviewCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Review not found'
            });
        }

        const review = reviewCheck.rows[0];

        // Prevent users from voting on their own reviews
        if (review.user_id === userId) {
            return res.status(400).json({
                status: 'error',
                message: 'You cannot vote on your own review'
            });
        }

        // Check if user already voted
        const existingVote = await pool.query(
            'SELECT id, vote_type FROM review_votes WHERE review_id = $1 AND user_id = $2',
            [reviewId, userId]
        );

        if (existingVote.rows.length > 0) {
            const oldVoteType = existingVote.rows[0].vote_type;

            // If same vote, remove it (toggle off)
            if (oldVoteType === voteType) {
                await pool.query('DELETE FROM review_votes WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);

                // Decrement the count
                const column = voteType === 'helpful' ? 'helpful_count' : 'not_helpful_count';
                await pool.query(
                    `UPDATE reviews SET ${column} = GREATEST(${column} - 1, 0) WHERE id = $1`,
                    [reviewId]
                );

                return res.json({
                    status: 'success',
                    message: 'Vote removed',
                    data: { action: 'removed', voteType }
                });
            } else {
                // Different vote, update it
                await pool.query(
                    'UPDATE review_votes SET vote_type = $1 WHERE review_id = $2 AND user_id = $3',
                    [voteType, reviewId, userId]
                );

                // Update counts: decrement old, increment new
                const oldColumn = oldVoteType === 'helpful' ? 'helpful_count' : 'not_helpful_count';
                const newColumn = voteType === 'helpful' ? 'helpful_count' : 'not_helpful_count';
                
                await pool.query(
                    `UPDATE reviews 
                     SET ${oldColumn} = GREATEST(${oldColumn} - 1, 0),
                         ${newColumn} = ${newColumn} + 1
                     WHERE id = $1`,
                    [reviewId]
                );

                return res.json({
                    status: 'success',
                    message: 'Vote updated',
                    data: { action: 'updated', oldVoteType, newVoteType: voteType }
                });
            }
        } else {
            // New vote
            await pool.query(
                'INSERT INTO review_votes (review_id, user_id, vote_type) VALUES ($1, $2, $3)',
                [reviewId, userId, voteType]
            );

            // Increment the count
            const column = voteType === 'helpful' ? 'helpful_count' : 'not_helpful_count';
            await pool.query(
                `UPDATE reviews SET ${column} = ${column} + 1 WHERE id = $1`,
                [reviewId]
            );

            return res.json({
                status: 'success',
                message: 'Vote recorded',
                data: { action: 'added', voteType }
            });
        }

    } catch (error) {
        console.error('Vote review error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to record vote',
            error: error.message
        });
    }
});

// Get user's votes for reviews
router.get('/votes/my-votes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.query.productId ? parseInt(req.query.productId.toString(), 10) : null;

        let query = `
            SELECT rv.review_id, rv.vote_type, rv.created_at
            FROM review_votes rv
        `;
        const params = [userId];

        if (productId) {
            query += `
                JOIN reviews r ON rv.review_id = r.id
                WHERE rv.user_id = $1 AND r.product_id = $2
            `;
            params.push(productId);
        } else {
            query += ` WHERE rv.user_id = $1`;
        }

        const result = await pool.query(query, params);

        res.json({
            status: 'success',
            message: 'User votes retrieved successfully',
            data: { votes: result.rows }
        });

    } catch (error) {
        console.error('Get user votes error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve votes',
            error: error.message
        });
    }
});


// ============================================
// GET REVIEWS BY USER ID (Public)
// ============================================
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const offset = (page - 1) * limit;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT display_name FROM Users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const displayName = userCheck.rows[0].display_name;

    // Get user's reviews with product info
    const result = await pool.query(`
      SELECT 
        r.id, r.rating, r.review_text, r.review_images,
        r.helpful_count, r.not_helpful_count,
        r.helpfulness_score, r.created_at, r.updated_at,
        p.id as product_id, p.name as product_name, 
        p.image_urls as product_images
      FROM Reviews r
      JOIN Products p ON r.product_id = p.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      OFFSET $2 LIMIT $3
    `, [userId, offset, limit]);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM Reviews WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      message: `Reviews by ${displayName} retrieved successfully`,
      data: {
        reviews: result.rows,
        user: {
          id: userId,
          display_name: displayName
        },
        pagination: {
          current_page: page,
          per_page: limit,
          total,
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


module.exports = router;
