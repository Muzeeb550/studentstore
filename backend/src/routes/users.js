const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const imagekit = require('../config/imagekit');
const { createCacheMiddleware } = require('../middleware/cache');
const { addDefaultTransformations } = require('../utils/imagekitHelper');
const router = express.Router();
const logger = require('../utils/logger');

// Profile upload rate limiting - ONLY for profile pictures (5 per hour)
const profileUploadLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => `user:${req.user.id}`,
    message: {
        status: 'error',
        message: 'Profile picture upload limit reached. You can upload up to 5 pictures per hour. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit'];
    }
});

// Review image upload rate limiting - MORE generous (30 per hour)
const reviewImageUploadLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    keyGenerator: (req) => `user:${req.user.id}`,
    message: {
        status: 'error',
        message: 'Review image upload limit reached. You can upload up to 30 images per hour. Please try again later.',
        code: 'REVIEW_IMAGE_RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false
});

// General API rate limiting - 100 requests per 15 minutes per user
const generalApiLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => {
        if (req.user?.id) {
            return `user:${req.user.id}`;
        }
        return 'anonymous';
    },
    message: {
        status: 'error',
        message: 'Too many requests. Please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development'
});

// Cache configurations
const dashboardStatsCache = createCacheMiddleware(
    (req) => `dashboard:user:${req.user.id}`,
    300,
    (req) => !req.user
);

const userProfileCache = createCacheMiddleware(
    (req) => `profile:user:${req.user.id}`,
    600
);

const userStatsCache = createCacheMiddleware(
    (req) => `stats:user:${req.user.id}`,
    300
);

// Get all users (admin only)
router.get('/', generalApiLimit, async (req, res) => {
    try {
        res.json({
            message: 'Users endpoint working',
            users: []
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            message: 'Error fetching users',
            error: error.message 
        });
    }
});

// ImageKit authentication endpoint
router.get('/imagekit-auth', authenticateToken, async (req, res) => {
    try {
        logger.debug('ImageKit auth request');
        
        const usage = req.query.usage || req.headers['x-upload-type'] || 'review';
        
        if (usage === 'profile') {
            profileUploadLimit(req, res, (err) => {
                if (err) return;
                proceedWithAuth();
            });
        } else {
            reviewImageUploadLimit(req, res, (err) => {
                if (err) return;
                proceedWithAuth();
            });
        }
        
        function proceedWithAuth() {
            try {
                const authenticationParameters = imagekit.getAuthenticationParameters();
                if (process.env.NODE_ENV !== 'production') {
                    console.log('🔐 ImageKit auth params generated for:', usage, {
                        token: authenticationParameters.token.substring(0, 10) + '...',
                        expire: authenticationParameters.expire,
                        signature: authenticationParameters.signature.substring(0, 10) + '...'
                    });
                }
                
                res.json(authenticationParameters);
            } catch (error) {
                console.error('ImageKit auth error:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to get ImageKit authentication',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication service unavailable'
                });
            }
        }
    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get ImageKit authentication',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication service unavailable'
        });
    }
});

// ✅ UPDATED: Get user profile (protected route) - WITH BIO
router.get('/profile', authenticateToken, userProfileCache, generalApiLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT id, google_id, name, display_name, email, 
                   profile_picture, bio, role, is_active, created_at
            FROM Users 
            WHERE id = $1 AND is_active = true
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        res.json({
            status: 'success',
            message: 'User profile retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
        });
    }
});

// ✅ NEW: Update user profile (display_name and bio)
router.put('/profile', authenticateToken, generalApiLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { display_name, bio } = req.body;
        
        logger.debug('Profile update request');
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        // Validate and add display_name if provided
        if (display_name !== undefined) {
            if (typeof display_name !== 'string') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Display name must be a string',
                    code: 'INVALID_DISPLAY_NAME_TYPE'
                });
            }
            
            const trimmedName = display_name.trim();
            
            if (trimmedName.length < 2) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Display name must be at least 2 characters long',
                    code: 'DISPLAY_NAME_TOO_SHORT'
                });
            }
            
            if (trimmedName.length > 120) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Display name must be 120 characters or less',
                    code: 'DISPLAY_NAME_TOO_LONG'
                });
            }
            
            // Check if display name is already taken
            const nameCheck = await pool.query(
                'SELECT id FROM Users WHERE display_name = $1 AND id != $2',
                [trimmedName, userId]
            );
            
            if (nameCheck.rows.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'This display name is already taken. Please choose another.',
                    code: 'DISPLAY_NAME_TAKEN'
                });
            }
            
            updates.push(`display_name = $${paramIndex}`);
            values.push(trimmedName);
            paramIndex++;
        }
        
        // Validate and add bio if provided
        if (bio !== undefined) {
            if (bio === null || bio === '') {
                updates.push(`bio = NULL`);
            } else {
                if (typeof bio !== 'string') {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Bio must be a string',
                        code: 'INVALID_BIO_TYPE'
                    });
                }
                
                const trimmedBio = bio.trim();
                
                if (trimmedBio.length > 300) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Bio must be 300 characters or less',
                        code: 'BIO_TOO_LONG',
                        current_length: trimmedBio.length,
                        max_length: 300
                    });
                }
                
                // Minimal XSS protection - only block HTML tags
                const sanitizedBio = trimmedBio
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                
                updates.push(`bio = $${paramIndex}`);
                values.push(sanitizedBio);
                paramIndex++;
            }
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No fields to update. Provide display_name or bio.',
                code: 'NO_UPDATES'
            });
        }
        
        updates.push('updated_at = NOW()');
        values.push(userId);
        
        const query = `
            UPDATE Users 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex} AND is_active = true
            RETURNING id, display_name, bio, updated_at
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        logger.debug('Profile updated successfully');
        
        // Clear cached data
        const { deleteCache } = require('../config/redis');
        await deleteCache(`profile:user:${userId}`);
        await deleteCache(`dashboard:user:${userId}`);
        await deleteCache(`stats:user:${userId}`);
        
        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                display_name: result.rows[0].display_name,
                bio: result.rows[0].bio,
                updated_at: result.rows[0].updated_at
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update profile',
            code: 'DATABASE_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update user profile picture with optimization
router.put('/profile/picture', authenticateToken, profileUploadLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { profile_picture } = req.body;
        
        logger.debug('Profile picture update request');
        
        if (!profile_picture) {
            return res.status(400).json({
                status: 'error',
                message: 'Profile picture URL is required',
                code: 'MISSING_PROFILE_PICTURE'
            });
        }
        
        if (typeof profile_picture !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'Profile picture URL must be a string',
                code: 'INVALID_PROFILE_PICTURE_TYPE'
            });
        }
        
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const urlLower = profile_picture.toLowerCase();
        const isValidImageExtension = allowedExtensions.some(ext => urlLower.includes(ext));
        
        if (!isValidImageExtension) {
            logger.warn('Invalid file type attempt');
            return res.status(400).json({
                status: 'error',
                message: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.',
                code: 'INVALID_FILE_TYPE',
                allowedTypes: ['JPG', 'JPEG', 'PNG', 'GIF', 'WebP']
            });
        }
        
        if (!profile_picture.includes('ik.imagekit.io')) {
            logger.warn('Invalid image source attempt');
            return res.status(400).json({
                status: 'error',
                message: 'Invalid image source. Images must be uploaded through the official upload system.',
                code: 'INVALID_IMAGE_SOURCE'
            });
        }
        
        if (profile_picture.length > 2048) {
            return res.status(400).json({
                status: 'error',
                message: 'Profile picture URL is too long',
                code: 'URL_TOO_LONG'
            });
        }
        
        const userCheck = await pool.query(
            'SELECT id, is_active FROM Users WHERE id = $1',
            [userId]
        );
            
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User account not found'
            });
        }
        
        if (!userCheck.rows[0].is_active) {
            return res.status(403).json({
                status: 'error',
                message: 'Account is deactivated'
            });
        }

        const optimizedProfilePicture = addDefaultTransformations(profile_picture, 'profile');
        logger.debug('Profile picture optimized');
        
        const result = await pool.query(`
            UPDATE Users 
            SET profile_picture = $1, updated_at = NOW()
            WHERE id = $2 AND is_active = true
        `, [optimizedProfilePicture, userId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        logger.debug('Profile picture updated successfully');
        
        const { deleteCache } = require('../config/redis');
        await deleteCache(`profile:user:${userId}`);
        await deleteCache(`dashboard:user:${userId}`);
        await deleteCache(`stats:user:${userId}`);
        
        res.json({
            status: 'success',
            message: 'Profile picture updated successfully with optimization',
            data: {
                profile_picture: optimizedProfilePicture,
                updated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update profile picture',
            code: 'DATABASE_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user stats for dashboard - WITH CACHING
router.get('/stats', authenticateToken, userStatsCache, generalApiLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const wishlistResult = await pool.query(
            'SELECT COUNT(*) as count FROM Wishlists WHERE user_id = $1',
            [userId]
        );
        
        const userResult = await pool.query(
            'SELECT created_at FROM Users WHERE id = $1 AND is_active = true',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        const memberSince = userResult.rows[0]?.created_at || new Date();
        
        res.json({
            status: 'success',
            message: 'User stats retrieved successfully',
            data: {
                wishlist_count: parseInt(wishlistResult.rows[0].count),
                products_viewed: 0,
                member_since: memberSince.toISOString().split('T')[0],
                account_status: 'active'
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user stats',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
        });
    }
});

// ✅ UPDATED: Get enhanced user stats for dashboard - WITH BIO
router.get('/dashboard-stats', authenticateToken, dashboardStatsCache, generalApiLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        logger.debug('Dashboard stats fetched');
        
        const userResult = await pool.query(`
            SELECT id, name, display_name, email, profile_picture, 
                   bio, role, created_at, is_active
            FROM Users 
            WHERE id = $1 AND is_active = true
        `, [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        const user = userResult.rows[0];
        
        const wishlistResult = await pool.query(
            'SELECT COUNT(*) as count FROM Wishlists WHERE user_id = $1',
            [userId]
        );
        
        const reviewStatsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_reviews,
                AVG(rating::DECIMAL(3,2)) as average_rating_given,
                MIN(created_at) as first_review_date,
                MAX(created_at) as latest_review_date,
                SUM(helpful_count) as total_helpful_votes_received,
                SUM(not_helpful_count) as total_not_helpful_votes_received
            FROM Reviews 
            WHERE user_id = $1
        `, [userId]);

        const votesGivenResult = await pool.query(`
            SELECT 
                COUNT(*) as total_votes_given,
                SUM(CASE WHEN vote_type = 'helpful' THEN 1 ELSE 0 END) as helpful_votes_given,
                SUM(CASE WHEN vote_type = 'not_helpful' THEN 1 ELSE 0 END) as not_helpful_votes_given
            FROM review_votes
            WHERE user_id = $1
        `, [userId]);
        
        const recentReviewsResult = await pool.query(`
            SELECT 
                r.id, r.rating, r.review_text, r.review_images,
                r.helpful_count, r.not_helpful_count,
                r.created_at, r.updated_at,
                p.id as product_id, p.name as product_name, 
                p.image_urls as product_images
            FROM Reviews r
            JOIN Products p ON r.product_id = p.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            LIMIT 5
        `, [userId]);
        
        const memberSince = user.created_at;
        const memberSinceFormatted = memberSince.toISOString().split('T')[0];
        const daysSinceJoining = Math.floor((new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));
        
        const reviewStats = reviewStatsResult.rows[0];
        const totalReviews = parseInt(reviewStats.total_reviews) || 0;
        const avgRatingGiven = parseFloat(reviewStats.average_rating_given) || 0;

        const votesGiven = votesGivenResult.rows[0];
        const totalVotesGiven = parseInt(votesGiven.total_votes_given) || 0;
        const helpfulVotesGiven = parseInt(votesGiven.helpful_votes_given) || 0;
        const notHelpfulVotesGiven = parseInt(votesGiven.not_helpful_votes_given) || 0;
        const totalHelpfulReceived = parseInt(reviewStats.total_helpful_votes_received) || 0;
        const totalNotHelpfulReceived = parseInt(reviewStats.total_not_helpful_votes_received) || 0;

        const helpfulnessRatio = totalReviews > 0 
            ? ((totalHelpfulReceived / (totalHelpfulReceived + totalNotHelpfulReceived + 1)) * 100).toFixed(1)
            : 0;
        
        const badges = [];
        
        if (totalReviews >= 1) {
            badges.push({
                id: 'first_review',
                name: 'First Review',
                description: 'Wrote your first review',
                icon: '🌟',
                earned_date: reviewStats.first_review_date
            });
        }
        
        if (totalReviews >= 5) {
            badges.push({
                id: 'review_contributor',
                name: 'Review Contributor',
                description: 'Wrote 5+ helpful reviews',
                icon: '✍️',
                earned_date: null
            });
        }
        
        if (totalReviews >= 10) {
            badges.push({
                id: 'review_expert',
                name: 'Review Expert',
                description: 'Wrote 10+ detailed reviews',
                icon: '🏆',
                earned_date: null
            });
        }
        
        if (totalReviews >= 25) {
            badges.push({
                id: 'review_master',
                name: 'Review Master',
                description: 'Wrote 25+ amazing reviews',
                icon: '👑',
                earned_date: null
            });
        }
        
        if (totalReviews >= 3 && avgRatingGiven >= 4.0) {
            badges.push({
                id: 'positive_reviewer',
                name: 'Positive Reviewer',
                description: 'Consistently gives helpful feedback',
                icon: '😊',
                earned_date: null
            });
        }
        
        if (daysSinceJoining >= 30) {
            badges.push({
                id: 'loyal_member',
                name: 'Loyal Member',
                description: 'Member for 30+ days',
                icon: '🎓',
                earned_date: memberSince
            });
        }

        if (totalVotesGiven >= 10) {
            badges.push({
                id: 'active_voter',
                name: 'Active Voter',
                description: 'Voted on 10+ reviews',
                icon: '🗳️',
                earned_date: null
            });
        }

        if (totalVotesGiven >= 50) {
            badges.push({
                id: 'super_voter',
                name: 'Super Voter',
                description: 'Voted on 50+ reviews',
                icon: '⚡',
                earned_date: null
            });
        }

        if (totalHelpfulReceived >= 10) {
            badges.push({
                id: 'helpful_reviewer',
                name: 'Helpful Reviewer',
                description: '10+ people found your reviews helpful',
                icon: '🌟',
                earned_date: null
            });
        }

        if (totalHelpfulReceived >= 50) {
            badges.push({
                id: 'highly_helpful',
                name: 'Highly Helpful',
                description: '50+ people found your reviews helpful',
                icon: '💎',
                earned_date: null
            });
        }

        if (totalHelpfulReceived >= 100) {
            badges.push({
                id: 'community_hero',
                name: 'Community Hero',
                description: '100+ people found your reviews helpful',
                icon: '🦸',
                earned_date: null
            });
        }

        if (totalReviews >= 5 && parseFloat(helpfulnessRatio) >= 80) {
            badges.push({
                id: 'quality_contributor',
                name: 'Quality Contributor',
                description: '80%+ helpfulness rating',
                icon: '✨',
                earned_date: null
            });
        }

        res.json({
            status: 'success',
            message: 'Dashboard stats retrieved successfully',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    display_name: user.display_name,
                    email: user.email,
                    profile_picture: user.profile_picture,
                    bio: user.bio,
                    role: user.role
                },
                stats: {
                    wishlist_count: parseInt(wishlistResult.rows[0].count),
                    products_viewed: 0,
                    member_since: memberSinceFormatted,
                    member_since_raw: memberSince.toISOString(),
                    days_since_joining: daysSinceJoining,
                    total_reviews: totalReviews,
                    average_rating_given: parseFloat(avgRatingGiven.toFixed(1)),
                    first_review_date: reviewStats.first_review_date,
                    latest_review_date: reviewStats.latest_review_date,
                    voting: {
                        total_votes_given: totalVotesGiven,
                        helpful_votes_given: helpfulVotesGiven,
                        not_helpful_votes_given: notHelpfulVotesGiven,
                        total_helpful_votes_received: totalHelpfulReceived,
                        total_not_helpful_votes_received: totalNotHelpfulReceived,
                        helpfulness_ratio: parseFloat(helpfulnessRatio)
                    }
                },
                recent_reviews: recentReviewsResult.rows,
                achievement_badges: badges,
                account_status: 'active'
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve dashboard stats',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
        });
    }
});

// Get user profile by email (public endpoint for posts)
router.get('/profile-by-email/:email', generalApiLimit, async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
    }

    logger.debug('Fetching profile by email');

    const result = await pool.query(
      `SELECT 
        id,
        display_name, 
        profile_picture,
        created_at
      FROM Users 
      WHERE email = $1 AND is_active = true`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      const fallbackName = email.split('@')[0].replace(/[._-]/g, ' ');
      
      logger.debug('User not found by email, returning fallback profile');
      
      return res.json({
        status: 'success',
        data: {
          display_name: fallbackName,
          profile_picture: null,
          exists: false
        }
      });
    }

    const user = result.rows[0];
    const optimizedProfilePicture = user.profile_picture 
      ? addDefaultTransformations(user.profile_picture, 'profile')
      : null;

    logger.debug('User profile fetched by email successfully');

    res.json({
      status: 'success',
      data: {
        user_id: user.id,
        display_name: user.display_name,
        profile_picture: optimizedProfilePicture,
        exists: true,
        member_since: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile by email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ UPDATED: GET PUBLIC PROFILE BY USER ID - WITH BIO
router.get('/public-profile/:userId', generalApiLimit, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }

    logger.debug(`Fetching public profile for user ID: ${userId}`);

    const userResult = await pool.query(`
      SELECT 
        id, 
        display_name, 
        name,
        profile_picture,
        bio,
        role,
        created_at
      FROM Users 
      WHERE id = $1 AND is_active = true
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found or account deactivated'
      });
    }

    const user = userResult.rows[0];

    const emailResult = await pool.query(
      'SELECT email FROM Users WHERE id = $1',
      [userId]
    );
    const userEmail = emailResult.rows[0]?.email;

    const postsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM student_posts sp
      LEFT JOIN product_recommendations pr ON sp.recommendation_id = pr.id
      WHERE (pr.user_id = $1 OR sp.user_email = $2)
        AND sp.is_approved = true
    `, [userId, userEmail]);

    const reviewsResult = await pool.query(
      'SELECT COUNT(*) as count FROM Reviews WHERE user_id = $1',
      [userId]
    );

    const likesResult = await pool.query(`
      SELECT 
        SUM(sp.likes_count) as total_likes,
        SUM(sp.dislikes_count) as total_dislikes
      FROM student_posts sp
      LEFT JOIN product_recommendations pr ON sp.recommendation_id = pr.id
      WHERE (pr.user_id = $1 OR sp.user_email = $2)
        AND sp.is_approved = true
    `, [userId, userEmail]);

    const memberSince = user.created_at;
    const memberSinceFormatted = memberSince.toISOString().split('T')[0];
    const daysSinceJoining = Math.floor((new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));

    const avgRatingResult = await pool.query(
      'SELECT AVG(rating::DECIMAL(3,2)) as avg_rating FROM Reviews WHERE user_id = $1',
      [userId]
    );

    const optimizedProfilePicture = user.profile_picture 
      ? addDefaultTransformations(user.profile_picture, 'profile')
      : null;

    logger.debug(`Public profile fetched successfully for user ID: ${userId}`);

    res.json({
      status: 'success',
      message: 'Public profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          display_name: user.display_name || user.name,
          profile_picture: optimizedProfilePicture,
          bio: user.bio,
          role: user.role,
          member_since: memberSinceFormatted,
          member_since_days: daysSinceJoining
        },
        stats: {
          posts_count: parseInt(postsResult.rows[0].count) || 0,
          reviews_count: parseInt(reviewsResult.rows[0].count) || 0,
          total_likes: parseInt(likesResult.rows[0].total_likes) || 0,
          total_dislikes: parseInt(likesResult.rows[0].total_dislikes) || 0,
          average_rating_given: parseFloat(avgRatingResult.rows[0].avg_rating) || 0
        }
      }
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve public profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
