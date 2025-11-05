const express = require('express');
const { pool } = require('../config/database');
const { createCacheMiddleware } = require('../middleware/cache');
const redis = require('../config/redis');
const router = express.Router();

// ===================================
// CACHE MIDDLEWARE CONFIGURATIONS
// ===================================

// ✅ FIXED: Reduced TTL to 30 seconds for instant updates
const bannersCache = createCacheMiddleware(
    () => 'studentstore:skillstore:banners:active',
    30, // ✅ Changed from 300 to 30 seconds
    (req) => req.headers['cache-control'] === 'no-cache'
);

const skillsCache = createCacheMiddleware(
    () => 'studentstore:skillstore:skills:all',
    30, // ✅ Changed from 600 to 30 seconds
    (req) => req.headers['cache-control'] === 'no-cache'
);

const skillDetailsCache = createCacheMiddleware(
    (req) => `studentstore:skillstore:skill:${req.params.skillId}:details`,
    30, // ✅ Changed from 300 to 30 seconds
    (req) => req.headers['cache-control'] === 'no-cache'
);

// ===================================
// PUBLIC SKILLSTORE ROUTES
// ===================================

// Get active banners (homepage carousel)
router.get('/banners', bannersCache, async (req, res) => {
    try {
        const startTime = Date.now();
        
        const result = await pool.query(`
            SELECT 
                b.id, b.image_url, b.display_order, b.redirect_type,
                b.redirect_skill_id, b.redirect_custom_url,
                s.name as skill_name
            FROM SkillstoreBanners b
            LEFT JOIN SkillstoreSkills s ON b.redirect_skill_id = s.id
            ORDER BY b.display_order ASC, b.created_at DESC
        `);
        
        const duration = Date.now() - startTime;
        
        // ✅ NEW: Add Cache-Control header to browser
        res.set('Cache-Control', 'public, max-age=30');
        
        res.json({
            status: 'success',
            message: 'SkillStore banners retrieved successfully',
            data: result.rows,
            meta: {
                count: result.rows.length,
                query_time: `${duration}ms`,
                cached: false
            }
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

// Get all skills (homepage cards)
router.get('/skills', skillsCache, async (req, res) => {
    try {
        const startTime = Date.now();
        
        const result = await pool.query(`
            SELECT 
                s.id, s.name, s.card_image_url, s.created_at,
                COUNT(DISTINCT sd.id) > 0 as has_details,
                COUNT(DISTINCT ub.id)::text as bookmark_count
            FROM SkillstoreSkills s
            LEFT JOIN SkillstoreSkillDetails sd ON s.id = sd.skill_id
            LEFT JOIN UserSkillstoreBookmarks ub ON s.id = ub.skill_id
            GROUP BY s.id, s.name, s.card_image_url, s.created_at
            ORDER BY s.created_at DESC
        `);
        
        const duration = Date.now() - startTime;
        
        // ✅ NEW: Add Cache-Control header to browser
        res.set('Cache-Control', 'public, max-age=30');
        
        res.json({
            status: 'success',
            message: 'Skills retrieved successfully',
            data: result.rows,
            meta: {
                count: result.rows.length,
                query_time: `${duration}ms`,
                cached: false
            }
        });
    } catch (error) {
        console.error('Get public skills error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve skills',
            error: error.message
        });
    }
});

// Get skill details with resources (About Skill page)
router.get('/skills/:skillId', skillDetailsCache, async (req, res) => {
    try {
        const startTime = Date.now();
        const { skillId } = req.params;
        
        // Get skill basic info
        const skillResult = await pool.query(`
            SELECT id, name, card_image_url, created_at
            FROM SkillstoreSkills
            WHERE id = $1
        `, [skillId]);
        
        if (skillResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Skill not found'
            });
        }
        
        // Get skill details
        const detailsResult = await pool.query(`
            SELECT 
                id, skill_id, description, roadmap_image_url, 
                opportunities_image_url, created_at
            FROM SkillstoreSkillDetails
            WHERE skill_id = $1
        `, [skillId]);
        
        // Get free resources
        const freeResources = await pool.query(`
            SELECT id, resource_number, image_url, link_url
            FROM SkillstoreFreeResources
            WHERE skill_id = $1
            ORDER BY resource_number ASC
        `, [skillId]);
        
        // Get paid resources
        const paidResources = await pool.query(`
            SELECT id, resource_number, image_url, link_url
            FROM SkillstorePaidResources
            WHERE skill_id = $1
            ORDER BY resource_number ASC
        `, [skillId]);
        
        const duration = Date.now() - startTime;
        
        // ✅ NEW: Add Cache-Control header to browser
        res.set('Cache-Control', 'public, max-age=30');
        
        res.json({
            status: 'success',
            message: 'Skill details retrieved successfully',
            data: {
                skill: skillResult.rows[0],
                details: detailsResult.rows[0] || null,
                free_resources: freeResources.rows,
                paid_resources: paidResources.rows
            },
            meta: {
                query_time: `${duration}ms`,
                cached: false
            }
        });
    } catch (error) {
        console.error('Get skill details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve skill details',
            error: error.message
        });
    }
});

// ===================================
// SEARCH ENDPOINT
// ===================================

router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query is required and must be a non-empty string'
            });
        }
        
        const searchTerm = q.trim();
        
        if (searchTerm.length > 100) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query too long (max 100 characters)'
            });
        }
        
        const startTime = Date.now();
        
        const result = await pool.query(`
            SELECT DISTINCT
                s.id, 
                s.name, 
                s.card_image_url, 
                s.created_at,
                COUNT(DISTINCT sd.id) > 0 as has_details,
                COUNT(DISTINCT ub.id)::text as bookmark_count
            FROM SkillstoreSkills s
            LEFT JOIN SkillstoreSkillDetails sd ON s.id = sd.skill_id
            LEFT JOIN UserSkillstoreBookmarks ub ON s.id = ub.skill_id
            WHERE 
                s.name ILIKE $1 
                OR (sd.description ILIKE $2)
            GROUP BY s.id, s.name, s.card_image_url, s.created_at
            ORDER BY s.name ASC
            LIMIT 10
        `, [
            `%${searchTerm}%`,
            `%${searchTerm}%`
        ]);
        
        const duration = Date.now() - startTime;
        
        // ✅ NEW: Add Cache-Control header (search results shouldn't be cached long)
        res.set('Cache-Control', 'public, max-age=60'); // 60 sec for search
        
        console.log(`🔍 Search: "${searchTerm}" | Results: ${result.rows.length} | ${duration}ms`);
        
        res.json({
            status: 'success',
            message: 'Search completed successfully',
            data: result.rows,
            meta: {
                query: searchTerm,
                count: result.rows.length,
                query_time: `${duration}ms`
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to perform search',
            error: error.message
        });
    }
});

module.exports = router;
