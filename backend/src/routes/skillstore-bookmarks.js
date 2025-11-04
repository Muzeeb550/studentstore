const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ===================================
// SKILLSTORE BOOKMARKS
// ===================================

// Add skill to bookmarks
router.post('/add', async (req, res) => {
    try {
        const { skill_id } = req.body;
        const user_id = req.user.id;

        if (!skill_id || isNaN(parseInt(skill_id, 10))) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid skill ID is required'
            });
        }

        // Check if skill exists
        const skillCheck = await pool.query(
            'SELECT id FROM SkillstoreSkills WHERE id = $1',
            [parseInt(skill_id, 10)]
        );

        if (skillCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Skill not found'
            });
        }

        // Check if already bookmarked
        const existingBookmark = await pool.query(
            'SELECT id FROM UserSkillstoreBookmarks WHERE user_id = $1 AND skill_id = $2',
            [user_id, parseInt(skill_id, 10)]
        );

        if (existingBookmark.rows.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Skill already bookmarked'
            });
        }

        // Add bookmark
        await pool.query(
            'INSERT INTO UserSkillstoreBookmarks (user_id, skill_id, created_at) VALUES ($1, $2, NOW())',
            [user_id, parseInt(skill_id, 10)]
        );

        console.log(`✅ Bookmark added: User ${user_id} → Skill ${skill_id}`);

        res.json({
            status: 'success',
            message: 'Skill bookmarked successfully'
        });
    } catch (error) {
        console.error('Add bookmark error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to bookmark skill',
            error: error.message
        });
    }
});

// Remove skill from bookmarks
router.delete('/remove/:skillId', async (req, res) => {
    try {
        const skill_id = parseInt(req.params.skillId, 10);
        const user_id = req.user.id;

        if (!skill_id || isNaN(skill_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid skill ID is required'
            });
        }

        const result = await pool.query(
            'DELETE FROM UserSkillstoreBookmarks WHERE user_id = $1 AND skill_id = $2',
            [user_id, skill_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Bookmark not found'
            });
        }

        console.log(`🗑️ Bookmark removed: User ${user_id} → Skill ${skill_id}`);

        res.json({
            status: 'success',
            message: 'Bookmark removed successfully'
        });
    } catch (error) {
        console.error('Remove bookmark error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to remove bookmark',
            error: error.message
        });
    }
});

// Get user's bookmarked skills
router.get('/', async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(`
            SELECT 
                ub.id as bookmark_id,
                ub.created_at as bookmarked_at,
                s.id, s.name, s.card_image_url, s.created_at,
                COUNT(DISTINCT sd.id) > 0 as has_details
            FROM UserSkillstoreBookmarks ub
            JOIN SkillstoreSkills s ON ub.skill_id = s.id
            LEFT JOIN SkillstoreSkillDetails sd ON s.id = sd.skill_id
            WHERE ub.user_id = $1
            GROUP BY ub.id, ub.created_at, s.id, s.name, s.card_image_url, s.created_at
            ORDER BY ub.created_at DESC
        `, [user_id]);

        res.json({
            status: 'success',
            message: 'Bookmarked skills retrieved successfully',
            data: {
                bookmarks: result.rows,
                total: result.rows.length
            }
        });
    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve bookmarks',
            error: error.message
        });
    }
});

// Check if skills are bookmarked (bulk check)
router.post('/check', async (req, res) => {
    try {
        const { skill_ids } = req.body;
        const user_id = req.user.id;

        if (!Array.isArray(skill_ids) || skill_ids.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid skill IDs array is required'
            });
        }

        // Build parameterized query
        const placeholders = skill_ids.map((_, index) => `$${index + 2}`).join(',');
        const query = `
            SELECT skill_id
            FROM UserSkillstoreBookmarks 
            WHERE user_id = $1 AND skill_id IN (${placeholders})
        `;

        const params = [user_id, ...skill_ids.map(id => parseInt(id, 10))];
        const result = await pool.query(query, params);
        
        // Create bookmark status map
        const bookmarkStatus = {};
        skill_ids.forEach(id => {
            bookmarkStatus[id] = false;
        });
        
        result.rows.forEach(row => {
            bookmarkStatus[row.skill_id] = true;
        });

        res.json({
            status: 'success',
            message: 'Bookmark status checked successfully',
            data: bookmarkStatus
        });
    } catch (error) {
        console.error('Check bookmarks error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check bookmark status',
            error: error.message
        });
    }
});

// Get bookmark count
router.get('/count', async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            'SELECT COUNT(*) as count FROM UserSkillstoreBookmarks WHERE user_id = $1',
            [user_id]
        );

        res.json({
            status: 'success',
            message: 'Bookmark count retrieved successfully',
            data: {
                count: parseInt(result.rows[0].count, 10)
            }
        });
    } catch (error) {
        console.error('Get bookmark count error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get bookmark count',
            error: error.message
        });
    }
});

module.exports = router;
