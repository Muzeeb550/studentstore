const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const { pool } = require('../config/database');
const redis = require('../config/redis'); // ✅ Import redis
const { addDefaultTransformations } = require('../utils/imagekitHelper');
const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

// ✅ FIXED: Helper function to invalidate cache - only delete keys that actually exist
const invalidateSkillstoreCache = async (keys = []) => {
  try {
    if (keys.length === 0) {
      // Invalidate all skillstore caches (must match skillstore-public.js keys)
      keys = [
        'studentstore:skillstore:skills:all',      // ✅ Matches public.js
        'studentstore:skillstore:banners:active'   // ✅ Matches public.js
      ];
    }
    
    for (const key of keys) {
      await redis.del(key);
      console.log(`🗑️ Cache invalidated: ${key}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

// ✅ FIXED: Helper function to invalidate specific skill cache
const invalidateSkillCache = async (skillId) => {
  try {
    const keys = [
      `studentstore:skillstore:skill:${skillId}:details`, // ✅ Matches public.js
      'studentstore:skillstore:skills:all',                // ✅ Matches public.js
      'studentstore:skillstore:banners:active'             // ✅ Matches public.js
    ];
    
    for (const key of keys) {
      await redis.del(key);
      console.log(`🗑️ Cache invalidated: ${key}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};


// ===================================
// SKILLSTORE ADMIN DASHBOARD STATS
// ===================================

router.get('/dashboard', async (req, res) => {
    try {
        const stats = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM SkillstoreSkills'),
            pool.query('SELECT COUNT(*) as count FROM SkillstoreBanners'),
            pool.query('SELECT COUNT(*) as count FROM SkillstoreSkillDetails'),
            pool.query(`SELECT COUNT(*) as count FROM SkillstoreSkills WHERE created_at >= NOW() - INTERVAL '7 days'`)
        ]);

        const recentSkills = await pool.query(`
            SELECT s.id, s.name, s.created_at, u.display_name as admin_name
            FROM SkillstoreSkills s
            JOIN Users u ON s.admin_id = u.id
            ORDER BY s.created_at DESC
            LIMIT 5
        `);

        res.json({
            status: 'success',
            message: 'SkillStore dashboard data retrieved successfully',
            data: {
                totalSkills: parseInt(stats[0].rows[0].count),
                totalBanners: parseInt(stats[1].rows[0].count),
                totalSkillDetails: parseInt(stats[2].rows[0].count),
                recentSkills: parseInt(stats[3].rows[0].count),
                recentActivity: recentSkills.rows
            }
        });
    } catch (error) {
        console.error('SkillStore dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to load SkillStore dashboard data',
            error: error.message
        });
    }
});

// ===================================
// BANNERS MANAGEMENT
// ===================================

router.get('/banners', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                b.id, b.image_url, b.display_order, b.redirect_type,
                b.redirect_skill_id, b.redirect_custom_url, b.created_at, b.updated_at,
                u.display_name as admin_name,
                s.name as skill_name
            FROM SkillstoreBanners b
            JOIN Users u ON b.admin_id = u.id
            LEFT JOIN SkillstoreSkills s ON b.redirect_skill_id = s.id
            ORDER BY b.display_order ASC, b.created_at DESC
        `);

        res.json({
            status: 'success',
            message: 'SkillStore banners retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get SkillStore banners error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve banners',
            error: error.message
        });
    }
});

router.get('/banners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                b.id, b.image_url, b.display_order, b.redirect_type,
                b.redirect_skill_id, b.redirect_custom_url, b.created_at, b.updated_at,
                u.display_name as admin_name,
                s.name as skill_name
            FROM SkillstoreBanners b
            JOIN Users u ON b.admin_id = u.id
            LEFT JOIN SkillstoreSkills s ON b.redirect_skill_id = s.id
            WHERE b.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Banner retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get single banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve banner',
            error: error.message
        });
    }
});

router.post('/banners', async (req, res) => {
    try {
        const { image_url, display_order, redirect_type, redirect_skill_id, redirect_custom_url } = req.body;

        if (!image_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required field: image_url'
            });
        }

        const optimizedImageUrl = addDefaultTransformations(image_url, 'banner');
        console.log(`🎨 Optimized SkillStore banner image`);

        const result = await pool.query(`
            INSERT INTO SkillstoreBanners (
                image_url, display_order, redirect_type, redirect_skill_id, 
                redirect_custom_url, admin_id, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *
        `, [
            optimizedImageUrl, 
            display_order || 0, 
            redirect_type || 'none',
            redirect_skill_id || null,
            redirect_custom_url || null,
            req.user.id
        ]);

        // ✅ FIXED: Invalidate cache immediately
        await invalidateSkillstoreCache();

        console.log(`✅ SkillStore banner created: ID ${result.rows[0].id}`);

        res.json({
            status: 'success',
            message: 'Banner created successfully with optimized image',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create banner',
            error: error.message
        });
    }
});

router.put('/banners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { image_url, display_order, redirect_type, redirect_skill_id, redirect_custom_url } = req.body;

        if (!image_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required field: image_url'
            });
        }

        const optimizedImageUrl = addDefaultTransformations(image_url, 'banner');

        const result = await pool.query(`
            UPDATE SkillstoreBanners SET
                image_url = $1, display_order = $2, redirect_type = $3,
                redirect_skill_id = $4, redirect_custom_url = $5, updated_at = NOW()
            WHERE id = $6 AND admin_id = $7
            RETURNING *
        `, [
            optimizedImageUrl, 
            display_order || 0, 
            redirect_type || 'none',
            redirect_skill_id || null,
            redirect_custom_url || null,
            id, 
            req.user.id
        ]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found or access denied'
            });
        }

        // ✅ FIXED: Invalidate cache immediately
        await invalidateSkillstoreCache();

        console.log(`✅ Banner updated: ID ${id}`);

        res.json({
            status: 'success',
            message: 'Banner updated successfully with optimized image',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update banner',
            error: error.message
        });
    }
});

router.delete('/banners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM SkillstoreBanners WHERE id = $1 AND admin_id = $2',
            [id, req.user.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Banner not found or access denied'
            });
        }

        // ✅ FIXED: Invalidate cache immediately
        await invalidateSkillstoreCache();
        
        console.log(`🗑️ SkillStore banner deleted: ID ${id}`);
        
        res.json({
            status: 'success',
            message: 'Banner permanently deleted'
        });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete banner',
            error: error.message
        });
    }
});

// ===================================
// SKILLS MANAGEMENT
// ===================================

router.get('/skills', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id, s.name, s.card_image_url, s.created_at, s.updated_at,
                u.display_name as admin_name,
                COUNT(DISTINCT sd.id) as has_details,
                COUNT(DISTINCT fr.id) as free_resources_count,
                COUNT(DISTINCT pr.id) as paid_resources_count
            FROM SkillstoreSkills s
            JOIN Users u ON s.admin_id = u.id
            LEFT JOIN SkillstoreSkillDetails sd ON s.id = sd.skill_id
            LEFT JOIN SkillstoreFreeResources fr ON s.id = fr.skill_id
            LEFT JOIN SkillstorePaidResources pr ON s.id = pr.skill_id
            GROUP BY s.id, s.name, s.card_image_url, s.created_at, s.updated_at, u.display_name
            ORDER BY s.created_at DESC
        `);

        res.json({
            status: 'success',
            message: 'Skills retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Get skills error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve skills',
            error: error.message
        });
    }
});

router.get('/skills/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                s.id, s.name, s.card_image_url, s.created_at, s.updated_at,
                u.display_name as admin_name
            FROM SkillstoreSkills s
            JOIN Users u ON s.admin_id = u.id
            WHERE s.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Skill not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Skill retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get single skill error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve skill',
            error: error.message
        });
    }
});

router.post('/skills', async (req, res) => {
    try {
        const { name, card_image_url } = req.body;

        if (!name || !card_image_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, card_image_url'
            });
        }

        const existingSkill = await pool.query(
            'SELECT id FROM SkillstoreSkills WHERE name = $1',
            [name]
        );

        if (existingSkill.rows.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Skill with this name already exists'
            });
        }

        const optimizedImageUrl = addDefaultTransformations(card_image_url, 'category');
        console.log(`🎨 Optimized skill card image: ${name}`);

        const result = await pool.query(`
            INSERT INTO SkillstoreSkills (name, card_image_url, admin_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING *
        `, [name, optimizedImageUrl, req.user.id]);

        // ✅ FIXED: Invalidate cache immediately
        await invalidateSkillstoreCache();

        console.log(`✅ Skill created: ${name} (ID: ${result.rows[0].id})`);

        res.json({
            status: 'success',
            message: 'Skill created successfully with optimized image',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create skill error:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({
                status: 'error',
                message: 'Skill with this name already exists'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to create skill',
            error: error.message
        });
    }
});

router.put('/skills/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, card_image_url } = req.body;

        if (!name || !card_image_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: name, card_image_url'
            });
        }

        const existingSkill = await pool.query(
            'SELECT id FROM SkillstoreSkills WHERE name = $1 AND id != $2',
            [name, id]
        );

        if (existingSkill.rows.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Another skill with this name already exists'
            });
        }

        const optimizedImageUrl = addDefaultTransformations(card_image_url, 'category');

        const result = await pool.query(`
            UPDATE SkillstoreSkills SET
                name = $1, card_image_url = $2, updated_at = NOW()
            WHERE id = $3 AND admin_id = $4
            RETURNING *
        `, [name, optimizedImageUrl, id, req.user.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Skill not found or access denied'
            });
        }

        // ✅ FIXED: Invalidate specific skill cache
        await invalidateSkillCache(id);

        console.log(`✅ Skill updated: ${name} (ID: ${id})`);

        res.json({
            status: 'success',
            message: 'Skill updated successfully with optimized image',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update skill error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update skill',
            error: error.message
        });
    }
});

router.delete('/skills/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        await client.query('BEGIN');
        
        const skillInfo = await client.query(
            'SELECT name FROM SkillstoreSkills WHERE id = $1 AND admin_id = $2',
            [id, req.user.id]
        );
        
        if (skillInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'error',
                message: 'Skill not found or access denied'
            });
        }
        
        const skillName = skillInfo.rows[0].name;
        
        await client.query('DELETE FROM SkillstoreSkills WHERE id = $1 AND admin_id = $2', [id, req.user.id]);
        
        await client.query('COMMIT');

        // ✅ FIXED: Invalidate specific skill cache
        await invalidateSkillCache(id);
        
        console.log(`🗑️ Skill deleted: ${skillName} (ID: ${id})`);
        
        res.json({
            status: 'success',
            message: `Skill "${skillName}" permanently deleted along with all related data`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete skill error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete skill',
            error: error.message
        });
    } finally {
        client.release();
    }
});

// ===================================
// SKILL DETAILS + RESOURCES MANAGEMENT
// ===================================

router.get('/skill-details/:skillId', async (req, res) => {
    try {
        const { skillId } = req.params;
        
        const detailsResult = await pool.query(`
            SELECT 
                sd.id, sd.skill_id, sd.description, sd.roadmap_image_url, 
                sd.opportunities_image_url, sd.created_at, sd.updated_at,
                s.name as skill_name,
                u.display_name as admin_name
            FROM SkillstoreSkillDetails sd
            JOIN SkillstoreSkills s ON sd.skill_id = s.id
            JOIN Users u ON sd.admin_id = u.id
            WHERE sd.skill_id = $1
        `, [skillId]);
        
        if (detailsResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Skill details not found'
            });
        }
        
        const freeResources = await pool.query(`
            SELECT id, skill_id, resource_number, image_url, link_url, created_at
            FROM SkillstoreFreeResources
            WHERE skill_id = $1
            ORDER BY resource_number ASC
        `, [skillId]);
        
        const paidResources = await pool.query(`
            SELECT id, skill_id, resource_number, image_url, link_url, created_at
            FROM SkillstorePaidResources
            WHERE skill_id = $1
            ORDER BY resource_number ASC
        `, [skillId]);
        
        res.json({
            status: 'success',
            message: 'Skill details retrieved successfully',
            data: {
                ...detailsResult.rows[0],
                free_resources: freeResources.rows,
                paid_resources: paidResources.rows
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

router.post('/skill-details', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            skill_id,
            description,
            roadmap_image_url,
            opportunities_image_url,
            free_resources,
            paid_resources
        } = req.body;

        if (!skill_id || !description || !roadmap_image_url || !opportunities_image_url) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: skill_id, description, roadmap_image_url, opportunities_image_url'
            });
        }

        if (!free_resources || !Array.isArray(free_resources) || free_resources.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least 1 free resource is required'
            });
        }

        if (!paid_resources || !Array.isArray(paid_resources) || paid_resources.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'At least 1 paid resource is required'
            });
        }

        const skillExists = await client.query(
            'SELECT id FROM SkillstoreSkills WHERE id = $1',
            [skill_id]
        );

        if (skillExists.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Skill not found'
            });
        }

        await client.query('BEGIN');

        const optimizedRoadmap = addDefaultTransformations(roadmap_image_url, 'product');
        const optimizedOpportunities = addDefaultTransformations(opportunities_image_url, 'product');

        const existingDetails = await client.query(
            'SELECT id FROM SkillstoreSkillDetails WHERE skill_id = $1',
            [skill_id]
        );

        let detailsId;

        if (existingDetails.rows.length > 0) {
            const updateResult = await client.query(`
                UPDATE SkillstoreSkillDetails SET
                    description = $1, roadmap_image_url = $2, 
                    opportunities_image_url = $3, updated_at = NOW()
                WHERE skill_id = $4
                RETURNING id
            `, [description, optimizedRoadmap, optimizedOpportunities, skill_id]);
            
            detailsId = updateResult.rows[0].id;

            await client.query('DELETE FROM SkillstoreFreeResources WHERE skill_id = $1', [skill_id]);
            await client.query('DELETE FROM SkillstorePaidResources WHERE skill_id = $1', [skill_id]);

            console.log(`✅ Skill details updated for skill ID: ${skill_id}`);
        } else {
            const insertResult = await client.query(`
                INSERT INTO SkillstoreSkillDetails (
                    skill_id, description, roadmap_image_url, 
                    opportunities_image_url, admin_id, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING id
            `, [skill_id, description, optimizedRoadmap, optimizedOpportunities, req.user.id]);
            
            detailsId = insertResult.rows[0].id;

            console.log(`✅ Skill details created for skill ID: ${skill_id}`);
        }

        for (const resource of free_resources) {
            const optimizedThumb = addDefaultTransformations(resource.image_url, 'review');
            await client.query(`
                INSERT INTO SkillstoreFreeResources (
                    skill_id, resource_number, image_url, link_url, created_at
                )
                VALUES ($1, $2, $3, $4, NOW())
            `, [skill_id, resource.resource_number, optimizedThumb, resource.link_url]);
        }

        for (const resource of paid_resources) {
            const optimizedThumb = addDefaultTransformations(resource.image_url, 'review');
            await client.query(`
                INSERT INTO SkillstorePaidResources (
                    skill_id, resource_number, image_url, link_url, created_at
                )
                VALUES ($1, $2, $3, $4, NOW())
            `, [skill_id, resource.resource_number, optimizedThumb, resource.link_url]);
        }

        await client.query('COMMIT');

        // ✅ FIXED: Invalidate specific skill cache immediately
        await invalidateSkillCache(skill_id);

        console.log(`✅ Added ${free_resources.length} free and ${paid_resources.length} paid resources`);

        res.json({
            status: 'success',
            message: 'Skill details and resources saved successfully',
            data: {
                details_id: detailsId,
                free_resources_count: free_resources.length,
                paid_resources_count: paid_resources.length
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Save skill details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to save skill details',
            error: error.message
        });
    } finally {
        client.release();
    }
});

router.delete('/skill-details/:skillId', async (req, res) => {
    const client = await pool.connect();
    try {
        const { skillId } = req.params;
        
        await client.query('BEGIN');
        
        await client.query('DELETE FROM SkillstoreFreeResources WHERE skill_id = $1', [skillId]);
        await client.query('DELETE FROM SkillstorePaidResources WHERE skill_id = $1', [skillId]);
        
        const result = await client.query(
            'DELETE FROM SkillstoreSkillDetails WHERE skill_id = $1',
            [skillId]
        );
        
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                status: 'error',
                message: 'Skill details not found'
            });
        }
        
        await client.query('COMMIT');

        // ✅ FIXED: Invalidate specific skill cache immediately
        await invalidateSkillCache(skillId);
        
        console.log(`🗑️ Skill details and resources deleted for skill ID: ${skillId}`);
        
        res.json({
            status: 'success',
            message: 'Skill details and all resources permanently deleted'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete skill details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete skill details',
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;
