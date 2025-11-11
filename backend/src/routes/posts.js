const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/adminAuth');
const { addDefaultTransformations } = require('../utils/imagekitHelper');
const { invalidateCache, deleteCache } = require('../config/redis');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting for post operations (10 per 15 minutes per user)
const postLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // allow 30 requests instead of 10
  keyGenerator: (req) => `user:${req.user.id}`,
  message: {
    status: 'error',
    message: 'Too many post operations. Please try again later.',
    code: 'POST_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// UTIL: Validate URL format
const isValidURL = (string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

// ============================================
// PUBLIC ROUTES (Must come BEFORE requireAdmin middleware)
// ============================================

// GET approved posts (public, with pagination, optional current user reactions)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const offset = (page - 1) * limit;
    const userToken = req.headers.authorization?.split(' ')[1];
    let currentUserId = null;

    // Try to decode user ID if token is provided (optional)
    if (userToken) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (e) {
        // Ignore token errors silently for public route
      }
    }

    // Get approved posts with admin info
    const postsResult = await pool.query(`
      SELECT sp.*, u.display_name as admin_name
      FROM student_posts sp
      JOIN Users u ON sp.admin_id = u.id
      WHERE sp.is_approved = true
      ORDER BY sp.created_at DESC
      OFFSET $1 LIMIT $2
    `, [offset, limit]);

    const countResult = await pool.query(`SELECT COUNT(*) as total FROM student_posts WHERE is_approved = true`);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    let posts = postsResult.rows;

    // If user is logged in, fetch their reactions on displayed posts
    if (currentUserId && posts.length > 0) {
      const postIds = posts.map(post => post.id);
      const placeholders = postIds.map((_, i) => `$${i + 2}`).join(',');
      const reactionQuery = `
        SELECT post_id, reaction_type FROM post_reactions
        WHERE user_id = $1 AND post_id IN (${placeholders})
      `;
      const reactionsResult = await pool.query(reactionQuery, [currentUserId, ...postIds]);
      const reactionMap = {};
      reactionsResult.rows.forEach(r => {
        reactionMap[r.post_id] = r.reaction_type;
      });
      posts = posts.map(post => ({
        ...post,
        user_reaction: reactionMap[post.id] || null
      }));
    } else {
      posts = posts.map(post => ({ ...post, user_reaction: null }));
    }

    res.json({
      status: 'success',
      message: 'Student posts retrieved successfully',
      data: {
        posts,
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
    console.error('Get posts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve posts',
      error: error.message
    });
  }
});

// POST react to a post (like/dislike toggle)
router.post('/:postId/reaction', authenticateToken, postLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId, 10);
    const { reactionType } = req.body;

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid post ID' });
    }
    if (!reactionType || !['like', 'dislike'].includes(reactionType)) {
      return res.status(400).json({ status: 'error', message: 'Invalid reaction type' });
    }

    // Check post exists
    const postCheck = await pool.query('SELECT id, likes_count, dislikes_count FROM student_posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // Check existing reaction
    const reactionCheck = await pool.query('SELECT id, reaction_type FROM post_reactions WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    if (reactionCheck.rows.length > 0) {
      const existingReaction = reactionCheck.rows[0];
      if (existingReaction.reaction_type === reactionType) {
        // Same reaction - remove it (toggle off)
        await pool.query('DELETE FROM post_reactions WHERE id = $1', [existingReaction.id]);
        if (reactionType === 'like') {
          await pool.query('UPDATE student_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1', [postId]);
        } else {
          await pool.query('UPDATE student_posts SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = $1', [postId]);
        }
        return res.json({ status: 'success', message: 'Reaction removed', data: { action: 'removed', reactionType } });
      } else {
        // Different reaction - update it
        await pool.query('UPDATE post_reactions SET reaction_type = $1 WHERE id = $2', [reactionType, existingReaction.id]);
        if (reactionType === 'like') {
          await pool.query('UPDATE student_posts SET likes_count = likes_count + 1, dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = $1', [postId]);
        } else {
          await pool.query('UPDATE student_posts SET dislikes_count = dislikes_count + 1, likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1', [postId]);
        }
        return res.json({ status: 'success', message: 'Reaction updated', data: { action: 'updated', newReaction: reactionType } });
      }
    } else {
      // New reaction
      await pool.query('INSERT INTO post_reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)', [postId, userId, reactionType]);
      if (reactionType === 'like') {
        await pool.query('UPDATE student_posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
      } else {
        await pool.query('UPDATE student_posts SET dislikes_count = dislikes_count + 1 WHERE id = $1', [postId]);
      }
      return res.json({ status: 'success', message: 'Reaction added', data: { action: 'added', reactionType } });
    }
  } catch (error) {
    console.error('Post reaction error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to record reaction', error: error.message });
  }
});

// ============================================
// GET USER'S POSTS (My Posts - for profile)
// ✅ NEW: Shows posts created from user's recommendations
// ============================================

router.get('/my-posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Get posts created from user's recommendations OR posts with user's email
    const result = await pool.query(`
      SELECT 
        sp.*,
        pr.created_at as recommended_at,
        u.display_name as admin_name
      FROM student_posts sp
      LEFT JOIN product_recommendations pr ON sp.recommendation_id = pr.id
      LEFT JOIN Users u ON sp.admin_id = u.id
      WHERE (pr.user_id = $1 OR sp.user_email = $2)
        AND sp.is_approved = true
      ORDER BY sp.created_at DESC
    `, [userId, userEmail]);

    res.json({
      status: 'success',
      message: 'Your posts retrieved successfully',
      data: {
        posts: result.rows,
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve your posts',
      error: error.message
    });
  }
});

// ============================================
// ADMIN ROUTES (Protected by requireAdmin middleware)
// ============================================

// Admin: Get all posts (including unapproved, with pagination)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sp.*, u.display_name as admin_name
      FROM student_posts sp
      JOIN Users u ON sp.admin_id = u.id
      ORDER BY sp.created_at DESC
    `);
    
    const total = result.rows.length;

    res.json({
      status: 'success',
      message: 'All posts retrieved successfully',
      data: { 
        posts: result.rows, 
        pagination: { 
          total,
          total_pages: 1,
          current_page: 1,
          per_page: total
        } 
      }
    });
  } catch (error) {
    console.error('Admin get posts error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve posts', error: error.message });
  }
});

// Admin: Create new post
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    // ✅ UPDATED: Accept recommendation_id from request body
    const { 
      username, 
      user_email, 
      product_name, 
      product_review, 
      product_images, 
      product_price, 
      buy_link, 
      buy_button_text,
      recommendation_id  // ✅ NEW: Optional link to recommendation
    } = req.body;

    // Validation
    if (!username || !user_email || !product_name || !product_review || !product_price || !buy_link) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields: username, user_email, product_name, product_review, product_price, buy_link' });
    }
    if (!Array.isArray(product_images) || product_images.length < 1) {
      return res.status(400).json({ status: 'error', message: 'At least one product image is required' });
    }
    if (!isValidURL(buy_link)) {
      return res.status(400).json({ status: 'error', message: 'Invalid buy link URL' });
    }
    const priceNum = parseFloat(product_price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid product price' });
    }
    const buyButtonTextFinal = buy_button_text && buy_button_text.trim() !== '' ? buy_button_text.trim() : 'Buy Now';

    // Optimize images URLs
    const optimizedImages = product_images.map(img => addDefaultTransformations(img, 'product'));

    // ✅ UPDATED: Insert with recommendation_id
    const result = await pool.query(`
      INSERT INTO student_posts (username, user_email, product_name, product_review, product_images,
        product_price, buy_link, buy_button_text, likes_count, dislikes_count, is_approved, admin_id, recommendation_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,true,$9,$10)
      RETURNING *
    `, [username.trim(), user_email.trim(), product_name.trim(), product_review.trim(), JSON.stringify(optimizedImages),
      priceNum, buy_link.trim(), buyButtonTextFinal, req.user.id, recommendation_id || null]);

    // Invalidate cache
    try {
      await invalidateCache.posts();
    } catch (e) {
      console.warn('Cache invalidation warning:', e.message || e);
    }

    // ✅ NEW: Log with recommendation link info
    const linkInfo = recommendation_id ? `(linked to recommendation #${recommendation_id})` : '(manual post)';
    console.log(`✅ Post created: "${product_name}" by ${username} ${linkInfo}`);

    res.status(201).json({ status: 'success', message: 'Post created successfully', data: result.rows[0] });

  } catch (error) {
    console.error('Admin create post error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create post', error: error.message });
  }
});

// Admin: Update post
router.put('/admin/:postId', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) return res.status(400).json({ status: 'error', message: 'Invalid post ID' });

    // ✅ UPDATED: Accept recommendation_id
    const { 
      username, 
      user_email, 
      product_name, 
      product_review, 
      product_images, 
      product_price, 
      buy_link, 
      buy_button_text, 
      is_approved,
      recommendation_id  // ✅ NEW: Optional
    } = req.body;

    // Validation
    if (!username || !user_email || !product_name || !product_review || !product_price || !buy_link) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }
    if (!Array.isArray(product_images) || product_images.length < 1) {
      return res.status(400).json({ status: 'error', message: 'At least one product image is required' });
    }
    if (!isValidURL(buy_link)) {
      return res.status(400).json({ status: 'error', message: 'Invalid buy link URL' });
    }
    const priceNum = parseFloat(product_price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid product price' });
    }

    const buyButtonTextFinal = buy_button_text && buy_button_text.trim() !== '' ? buy_button_text.trim() : 'Buy Now';
    const approved = typeof is_approved === 'boolean' ? is_approved : true;

    // Optimize images URLs
    const optimizedImages = product_images.map(img => addDefaultTransformations(img, 'product'));

    // ✅ UPDATED: Update with recommendation_id
    const result = await pool.query(`
      UPDATE student_posts SET
        username = $1,
        user_email = $2,
        product_name = $3,
        product_review = $4,
        product_images = $5,
        product_price = $6,
        buy_link = $7,
        buy_button_text = $8,
        is_approved = $9,
        recommendation_id = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [username.trim(), user_email.trim(), product_name.trim(), product_review.trim(), JSON.stringify(optimizedImages),
      priceNum, buy_link.trim(), buyButtonTextFinal, approved, recommendation_id || null, postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // Cache invalidation
    try {
      await invalidateCache.posts();
    } catch (e) {
      console.warn('Cache invalidation warning:', e.message || e);
    }

    res.json({ status: 'success', message: 'Post updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Admin update post error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update post', error: error.message });
  }
});

// Admin: Delete post
router.delete('/admin/:postId', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (isNaN(postId)) return res.status(400).json({ status: 'error', message: 'Invalid post ID' });

    const result = await pool.query('DELETE FROM student_posts WHERE id = $1', [postId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // Cache invalidation
    try {
      await invalidateCache.posts();
    } catch (e) {
      console.warn('Cache invalidation warning:', e.message || e);
    }

    res.json({ status: 'success', message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Admin delete post error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete post', error: error.message });
  }
});



// Get single post by ID
router.get('/post/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        sp.*,
        u.name as username,
        u.email as user_email,
        COALESCE(likes.count, 0) as likes_count,
        COALESCE(dislikes.count, 0) as dislikes_count
      FROM student_posts sp
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as count
        FROM post_reactions
        WHERE reaction_type = 'like'
        GROUP BY post_id
      ) likes ON sp.id = likes.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as count
        FROM post_reactions
        WHERE reaction_type = 'dislike'
        GROUP BY post_id
      ) dislikes ON sp.id = dislikes.post_id
      WHERE sp.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found'
      });
    }
    
    res.json({
      status: 'success',
      data: { post: result.rows[0] }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch post'
    });
  }
});


module.exports = router;
