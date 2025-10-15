const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const imagekit = require('../config/imagekit');
const { createCacheMiddleware } = require('../middleware/cache');
const router = express.Router();


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
        // Always use user ID for authenticated requests
        if (req.user?.id) {
            return `user:${req.user.id}`;
        }
        // For unauthenticated, use 'anonymous' key (no IP tracking)
        return 'anonymous';
    },
    message: {
        status: 'error',
        message: 'Too many requests. Please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development
    skip: (req) => process.env.NODE_ENV === 'development'
});



// Cache configurations
const dashboardStatsCache = createCacheMiddleware(
    (req) => `dashboard:user:${req.user.id}`,
    300,   // ✅ 5 minutes instead of 10
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
        console.log(`🔑 ImageKit auth request from user ${req.user.id}`);
        
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
                
                console.log('🔐 ImageKit auth params generated for:', usage, {
                    token: authenticationParameters.token.substring(0, 10) + '...',
                    expire: authenticationParameters.expire,
                    signature: authenticationParameters.signature.substring(0, 10) + '...'
                });
                
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


// Get user profile (protected route) - WITH CACHING
router.get('/profile', authenticateToken, userProfileCache, generalApiLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT id, google_id, name, display_name, email, 
                   profile_picture, role, is_active, created_at
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


// Update user profile picture
router.put('/profile/picture', authenticateToken, profileUploadLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { profile_picture } = req.body;
        
        console.log(`📸 Profile picture update request from user ${userId}`);
        
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
            console.log(`❌ Invalid file type attempt from user ${userId}: ${profile_picture}`);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.',
                code: 'INVALID_FILE_TYPE',
                allowedTypes: ['JPG', 'JPEG', 'PNG', 'GIF', 'WebP']
            });
        }
        
        if (!profile_picture.includes('ik.imagekit.io')) {
            console.log(`❌ Invalid image source attempt from user ${userId}: ${profile_picture}`);
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
        
        const result = await pool.query(`
            UPDATE Users 
            SET profile_picture = $1, updated_at = NOW()
            WHERE id = $2 AND is_active = true
        `, [profile_picture, userId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        console.log(`✅ Profile picture updated successfully for user ${userId}`);
        
        // Clear user's cached data
        const { deleteCache } = require('../config/redis');
        await deleteCache(`profile:user:${userId}`);
        await deleteCache(`dashboard:user:${userId}`);
        await deleteCache(`stats:user:${userId}`);
        
        res.json({
            status: 'success',
            message: 'Profile picture updated successfully',
            data: {
                profile_picture: profile_picture,
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


// Get enhanced user stats for dashboard (protected route) - WITH CACHING  
router.get('/dashboard-stats', authenticateToken, dashboardStatsCache, generalApiLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`🔍 DEBUG - Dashboard stats for user ${userId}`);
        
        const userResult = await pool.query(`
            SELECT id, name, display_name, email, profile_picture, 
                   role, created_at, is_active
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
        
        // ✅ ENHANCED: Include vote statistics
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

        // ✅ NEW: Get vote statistics (votes given by user)
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

        // ✅ NEW: Parse vote statistics
        const votesGiven = votesGivenResult.rows[0];
        const totalVotesGiven = parseInt(votesGiven.total_votes_given) || 0;
        const helpfulVotesGiven = parseInt(votesGiven.helpful_votes_given) || 0;
        const notHelpfulVotesGiven = parseInt(votesGiven.not_helpful_votes_given) || 0;
        const totalHelpfulReceived = parseInt(reviewStats.total_helpful_votes_received) || 0;
        const totalNotHelpfulReceived = parseInt(reviewStats.total_not_helpful_votes_received) || 0;

        // Calculate helpfulness ratio (for badges)
        const helpfulnessRatio = totalReviews > 0 
            ? ((totalHelpfulReceived / (totalHelpfulReceived + totalNotHelpfulReceived + 1)) * 100).toFixed(1)
            : 0;
        
        // Calculate achievement badges
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

        // ✅ NEW: Voting engagement badges
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

        // ✅ NEW: Helpful reviewer badges
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

        // ✅ NEW: High helpfulness ratio badge
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
                    // ✅ NEW: Vote statistics
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


module.exports = router;
