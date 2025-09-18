const express = require('express');
const rateLimit = require('express-rate-limit');
const { getPool, sql } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const imagekit = require('../config/imagekit');
const router = express.Router();

// Profile upload rate limiting - ONLY for profile pictures (5 per hour)
const profileUploadLimit = rateLimit({
    windowMs: 60 * 60 * 1000,        // 1 hour window
    max: 5,                          // Maximum 5 profile uploads per hour per user
    keyGenerator: (req) => req.user.id,
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
    windowMs: 60 * 60 * 1000,        // 1 hour window
    max: 30,                         // Maximum 30 review image uploads per hour per user
    keyGenerator: (req) => req.user.id,
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
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
        status: 'error',
        message: 'Too many requests. Please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    }
});

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

// ImageKit authentication endpoint - DIFFERENT LIMITS based on usage
router.get('/imagekit-auth', authenticateToken, async (req, res) => {
    try {
        console.log(`🔑 ImageKit auth request from user ${req.user.id}`);
        
        // Check the usage type from query parameter or header
        const usage = req.query.usage || req.headers['x-upload-type'] || 'review'; // Default to review
        
        // Apply different rate limits based on usage
        if (usage === 'profile') {
            // Apply profile upload limit
            profileUploadLimit(req, res, (err) => {
                if (err) return; // Rate limit exceeded, response already sent
                proceedWithAuth();
            });
        } else {
            // Apply review image upload limit
            reviewImageUploadLimit(req, res, (err) => {
                if (err) return; // Rate limit exceeded, response already sent
                proceedWithAuth();
            });
        }
        
        function proceedWithAuth() {
            try {
                // Get clean ImageKit authentication parameters
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

// Get user profile (protected route)
router.get('/profile', authenticateToken, generalApiLimit, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT id, google_id, name, display_name, email, 
                       profile_picture, role, is_active, created_at
                FROM Users 
                WHERE id = @userId AND is_active = 1
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        const user = result.recordset[0];
        
        res.json({
            status: 'success',
            message: 'User profile retrieved successfully',
            data: user
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

// Update user profile picture - ONLY this should have strict profile limits
router.put('/profile/picture', authenticateToken, profileUploadLimit, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        const { profile_picture } = req.body;
        
        console.log(`📸 Profile picture update request from user ${userId}`);
        
        // Enhanced input validation
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
        
        // Server-side MIME type validation
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
        
        // Validate ImageKit domain
        if (!profile_picture.includes('ik.imagekit.io')) {
            console.log(`❌ Invalid image source attempt from user ${userId}: ${profile_picture}`);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid image source. Images must be uploaded through the official upload system.',
                code: 'INVALID_IMAGE_SOURCE'
            });
        }
        
        // Check URL length
        if (profile_picture.length > 2048) {
            return res.status(400).json({
                status: 'error',
                message: 'Profile picture URL is too long',
                code: 'URL_TOO_LONG'
            });
        }
        
        // Verify user exists and is active
        const userCheck = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT id, is_active FROM Users WHERE id = @userId');
            
        if (userCheck.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User account not found'
            });
        }
        
        if (!userCheck.recordset[0].is_active) {
            return res.status(403).json({
                status: 'error',
                message: 'Account is deactivated'
            });
        }
        
        // Update user profile picture
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('profilePicture', sql.VarChar(2048), profile_picture)
            .query(`
                UPDATE Users 
                SET profile_picture = @profilePicture, updated_at = GETDATE()
                WHERE id = @userId AND is_active = 1
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        console.log(`✅ Profile picture updated successfully for user ${userId}`);
        
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

// Get user stats for dashboard
router.get('/stats', authenticateToken, generalApiLimit, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        
        // Get wishlist count
        const wishlistResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT COUNT(*) as count FROM Wishlists WHERE user_id = @userId');
        
        // Get user creation date
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT created_at FROM Users WHERE id = @userId AND is_active = 1');
        
        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        const memberSince = userResult.recordset[0]?.created_at || new Date();
        
        res.json({
            status: 'success',
            message: 'User stats retrieved successfully',
            data: {
                wishlist_count: wishlistResult.recordset[0].count,
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

// Get enhanced user stats for dashboard (protected route)
router.get('/dashboard-stats', authenticateToken, generalApiLimit, async (req, res) => {
    try {
        const pool = await getPool();
        const userId = req.user.id;
        
        // Get basic user info and creation date
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT id, name, display_name, email, profile_picture, 
                       role, created_at, is_active
                FROM Users 
                WHERE id = @userId AND is_active = 1
            `);
        
        if (userResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or account deactivated'
            });
        }
        
        const user = userResult.recordset[0];
        
        // Get wishlist count
        const wishlistResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT COUNT(*) as count FROM Wishlists WHERE user_id = @userId');
        
        // Get review statistics
        const reviewStatsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    COUNT(*) as total_reviews,
                    AVG(CAST(rating AS DECIMAL(3,2))) as average_rating_given,
                    MIN(created_at) as first_review_date,
                    MAX(created_at) as latest_review_date
                FROM Reviews 
                WHERE user_id = @userId
            `);
        
        // Get recent reviews (last 5) with product info
        const recentReviewsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT TOP 5
                    r.id, r.rating, r.review_text, r.review_images,
                    r.created_at, r.updated_at,
                    p.id as product_id, p.name as product_name, 
                    p.image_urls as product_images
                FROM Reviews r
                INNER JOIN Products p ON r.product_id = p.id
                WHERE r.user_id = @userId
                ORDER BY r.created_at DESC
            `);
        
        // Calculate member since date
        const memberSince = user.created_at;
        const memberSinceFormatted = memberSince.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Calculate days since joining
        const daysSinceJoining = Math.floor((new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get review statistics
        const reviewStats = reviewStatsResult.recordset[0];
        const totalReviews = reviewStats.total_reviews || 0;
        const avgRatingGiven = reviewStats.average_rating_given || 0;
        
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
                earned_date: null // Could track when 5th review was written
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
        
        // Check for high-quality reviewer (average rating given > 4.0)
        if (totalReviews >= 3 && avgRatingGiven >= 4.0) {
            badges.push({
                id: 'positive_reviewer',
                name: 'positive Reviewer',
                description: 'Consistently gives helpful feedback',
                icon: '😊',
                earned_date: null
            });
        }
        
        // Check for loyal member (30+ days)
        if (daysSinceJoining >= 30) {
            badges.push({
                id: 'loyal_member',
                name: 'Loyal Member',
                description: 'Member for 30+ days',
                icon: '🎓',
                earned_date: memberSince
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
                    wishlist_count: wishlistResult.recordset[0].count,
                    products_viewed: 0, // Will be dynamic later when we add view tracking
                    member_since: memberSinceFormatted,
                    member_since_raw: memberSince.toISOString(),
                    days_since_joining: daysSinceJoining,
                    total_reviews: totalReviews,
                    average_rating_given: parseFloat(avgRatingGiven.toFixed(1)),
                    first_review_date: reviewStats.first_review_date,
                    latest_review_date: reviewStats.latest_review_date
                },
                recent_reviews: recentReviewsResult.recordset,
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
