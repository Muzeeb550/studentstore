const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const { addDefaultTransformations } = require('../utils/imagekitHelper');
const rateLimit = require('express-rate-limit');


// ============================================
// RATE LIMITING
// ============================================


// Rate limit for rating submissions
const ratingLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 rating updates per 15 minutes
    keyGenerator: (req) => `rating:user:${req.user.id}`,
    message: {
        status: 'error',
        message: 'Too many rating attempts. Please try again later.',
        code: 'RATING_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});


// Rate limit for recommendations - 5 per day
const recommendationLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 recommendations per day
    keyGenerator: (req) => `recommend:user:${req.user.id}`,
    message: {
        status: 'error',
        message: 'You can submit maximum 5 recommendations per day. Please try again tomorrow.',
        code: 'RECOMMENDATION_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});


// ============================================
// CONSTANTS
// ============================================


const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB (will be validated on frontend)
const MAX_IMAGES_PER_RECOMMENDATION = 3;


// ============================================
// SUBMIT/UPDATE APP RATING
// ============================================


router.post('/rating', authenticateToken, ratingLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { rating, review_text } = req.body;


        // Validation
        if (!rating) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating is required'
            });
        }


        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating must be between 1 and 5'
            });
        }


        // Get user info
        const userResult = await pool.query(
            'SELECT name, email FROM Users WHERE id = $1',
            [userId]
        );


        if (userResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }


        const { name: userName, email: userEmail } = userResult.rows[0];
        const userAgent = req.headers['user-agent'] || 'Unknown';


        // Check if user already has a rating
        const existingRating = await pool.query(
            'SELECT id, rating as old_rating FROM app_ratings WHERE user_id = $1',
            [userId]
        );


        let result;
        let action;


        if (existingRating.rows.length > 0) {
            // Update existing rating
            const oldRating = existingRating.rows[0].old_rating;
            
            result = await pool.query(`
                UPDATE app_ratings 
                SET rating = $1, review_text = $2, user_name = $3, user_email = $4, 
                    user_agent = $5, updated_at = NOW()
                WHERE user_id = $6
                RETURNING *
            `, [rating, review_text || null, userName, userEmail, userAgent, userId]);
            
            action = 'updated';
            console.log(`🔄 Rating updated: ${userName} (${userEmail}) - ${oldRating}⭐ → ${rating}⭐`);
        } else {
            // Insert new rating
            result = await pool.query(`
                INSERT INTO app_ratings 
                (user_id, user_name, user_email, rating, review_text, user_agent, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                RETURNING *
            `, [userId, userName, userEmail, rating, review_text || null, userAgent]);
            
            action = 'created';
            console.log(`✨ New rating created: ${userName} (${userEmail}) - ${rating}⭐`);
        }


        res.status(action === 'created' ? 201 : 200).json({
            status: 'success',
            message: `Rating ${action} successfully! Thank you for your feedback! 🙏`,
            data: {
                ...result.rows[0],
                action
            }
        });


    } catch (error) {
        console.error('Submit rating error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to submit rating',
            error: error.message
        });
    }
});


// ============================================
// SUBMIT PRODUCT RECOMMENDATION
// ============================================


router.post('/recommend', authenticateToken, recommendationLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_name, review_text, product_link, product_images, price } = req.body;


        // Validation
        if (!product_name || !review_text || !product_link) {
            return res.status(400).json({
                status: 'error',
                message: 'Product name, review, and link are required'
            });
        }


        if (product_name.trim().length < 3) {
            return res.status(400).json({
                status: 'error',
                message: 'Product name must be at least 3 characters'
            });
        }


        if (review_text.trim().length < 10) {
            return res.status(400).json({
                status: 'error',
                message: 'Review must be at least 10 characters'
            });
        }


        // Validate product link (basic URL check)
        try {
            new URL(product_link);
        } catch (e) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid product link. Please provide a valid URL'
            });
        }


        // Validate product images
        if (product_images && Array.isArray(product_images)) {
            if (product_images.length > MAX_IMAGES_PER_RECOMMENDATION) {
                return res.status(400).json({
                    status: 'error',
                    message: `Maximum ${MAX_IMAGES_PER_RECOMMENDATION} images allowed per recommendation`
                });
            }


            const invalidImages = product_images.filter(url => 
                !url || typeof url !== 'string' || !url.includes('imagekit.io')
            );
            
            if (invalidImages.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid image URLs detected. Images must be uploaded to ImageKit first.'
                });
            }
        }


        // Validate price if provided
        if (price !== null && price !== undefined) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid price. Must be a positive number'
                });
            }
        }


        // Get user info
        const userResult = await pool.query(
            'SELECT name, email FROM Users WHERE id = $1',
            [userId]
        );


        if (userResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }


        const { name: userName, email: userEmail } = userResult.rows[0];


        // Optimize recommendation images before storing
        let optimizedImages = [];
        if (Array.isArray(product_images) && product_images.length > 0) {
            optimizedImages = product_images
                .filter(url => url && url.trim() !== '')
                .map(url => addDefaultTransformations(url, 'review'));
            
            console.log(`🎨 Optimized ${optimizedImages.length} recommendation images (3MB max)`);
        }


        // Insert recommendation
        const result = await pool.query(`
            INSERT INTO product_recommendations 
            (user_id, user_name, user_email, product_name, review_text, product_link, product_images, price, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *
        `, [
            userId, 
            userName, 
            userEmail, 
            product_name.trim(), 
            review_text.trim(), 
            product_link.trim(),
            JSON.stringify(optimizedImages),
            price || null
        ]);


        console.log(`🎁 New recommendation: "${product_name}" by ${userName} (${userEmail})`);


        res.status(201).json({
            status: 'success',
            message: 'Thank you! Your recommendation has been submitted successfully! 🎉',
            data: {
                ...result.rows[0],
                max_image_size: '3MB',
                images_count: optimizedImages.length
            }
        });


    } catch (error) {
        console.error('Submit recommendation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to submit recommendation',
            error: error.message
        });
    }
});


// ============================================
// ✅ NEW: UPDATE RECOMMENDATION - ADD TO POSTS CHOICE
// ============================================


router.patch('/recommend/:id/add-to-posts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const recommendationId = parseInt(req.params.id, 10);
        const { add_to_posts } = req.body;

        // Validate recommendation ID
        if (!recommendationId || isNaN(recommendationId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid recommendation ID'
            });
        }

        // Validate add_to_posts value
        if (typeof add_to_posts !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'add_to_posts must be true or false'
            });
        }

        // Check if recommendation exists and belongs to user
        const checkResult = await pool.query(
            'SELECT user_id, user_name, product_name FROM product_recommendations WHERE id = $1',
            [recommendationId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Recommendation not found'
            });
        }

        // Verify ownership
        if (checkResult.rows[0].user_id !== userId) {
            return res.status(403).json({
                status: 'error',
                message: 'You can only update your own recommendations'
            });
        }

        const { user_name, product_name } = checkResult.rows[0];

        // Update add_to_posts field
        const result = await pool.query(
            'UPDATE product_recommendations SET add_to_posts = $1 WHERE id = $2 RETURNING *',
            [add_to_posts, recommendationId]
        );

        const choice = add_to_posts ? 'YES - Add to Posts' : 'NO - Do not add';
        console.log(`📌 Recommendation ${recommendationId} ("${product_name}" by ${user_name}): ${choice}`);

        res.json({
            status: 'success',
            message: 'Your choice has been saved successfully',
            data: {
                recommendation_id: recommendationId,
                add_to_posts: add_to_posts,
                choice_text: choice
            }
        });

    } catch (error) {
        console.error('Update add_to_posts error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to save your choice',
            error: error.message
        });
    }
});


// ============================================
// GET USER'S RATING
// ============================================


router.get('/my-rating', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;


        const result = await pool.query(
            'SELECT * FROM app_ratings WHERE user_id = $1',
            [userId]
        );


        if (result.rows.length === 0) {
            return res.json({
                status: 'success',
                message: 'No rating found',
                data: null
            });
        }


        res.json({
            status: 'success',
            message: 'User rating retrieved successfully',
            data: result.rows[0]
        });


    } catch (error) {
        console.error('Get user rating error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve rating',
            error: error.message
        });
    }
});


// ============================================
// GET USER'S RECOMMENDATIONS
// ============================================


router.get('/my-recommendations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const offset = (page - 1) * limit;


        const result = await pool.query(`
            SELECT * FROM product_recommendations 
            WHERE user_id = $1
            ORDER BY created_at DESC
            OFFSET $2 LIMIT $3
        `, [userId, offset, limit]);


        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM product_recommendations WHERE user_id = $1',
            [userId]
        );


        const total = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);


        res.json({
            status: 'success',
            message: 'User recommendations retrieved successfully',
            data: {
                recommendations: result.rows,
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
        console.error('Get user recommendations error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve recommendations',
            error: error.message
        });
    }
});


// ============================================
// GET IMAGEKIT AUTH (for uploading recommendation images)
// ============================================


router.get('/imagekit-auth', authenticateToken, async (req, res) => {
    try {
        const imagekit = require('../config/imagekit');
        const authenticationParameters = imagekit.getAuthenticationParameters();
        
        res.json({
            status: 'success',
            ...authenticationParameters
        });
    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get ImageKit authentication'
        });
    }
});


module.exports = router;
