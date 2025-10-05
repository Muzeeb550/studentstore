const express = require('express');
const { pool } = require('../config/database');
const { createCacheMiddleware } = require('../middleware/cache');
const { getCacheHealth } = require('../config/redis');
const router = express.Router();

// Cache middleware configurations
const bannersCache = createCacheMiddleware(
  () => 'banners:active',
  300,
  (req) => req.headers['cache-control'] === 'no-cache'
);

const categoriesCache = createCacheMiddleware(
  () => 'categories:all',
  600,
  (req) => req.headers['cache-control'] === 'no-cache'
);

const featuredProductsCache = createCacheMiddleware(
  (req) => `products:featured:limit:${req.query.limit || 8}:sort:${req.query.sort || 'newest'}`,
  300,
  (req) => req.headers['cache-control'] === 'no-cache'
);

const productDetailsCache = createCacheMiddleware(
  (req) => `product:${req.params.id}`,
  300,
  (req) => req.method !== 'GET' || req.headers['cache-control'] === 'no-cache'
);

const categoryProductsCache = createCacheMiddleware(
  (req) => `category:${req.params.id}:page:${req.query.page || 1}:limit:${req.query.limit || 12}:sort:${req.query.sort || 'newest'}`,
  180,
  (req) => req.headers['cache-control'] === 'no-cache'
);

const searchCache = createCacheMiddleware(
  (req) => {
    const { q, category, sort = 'relevance', page = 1, min_rating } = req.query;
    return `search:${q}:${category || 'all'}:${sort}:${page}:${min_rating || 'any'}`;
  },
  180,
  (req) => req.headers['cache-control'] === 'no-cache'
);

// Cache health monitoring endpoint
router.get('/cache/health', async (req, res) => {
  try {
    const health = await getCacheHealth();
    res.json({
      status: 'success',
      message: 'Cache health retrieved successfully',
      data: health
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve cache health',
      error: error.message
    });
  }
});

// Get active banners
router.get('/banners', bannersCache, async (req, res) => {
  try {
    const startTime = Date.now();
    const result = await pool.query(`
      SELECT b.id, b.name, b.media_url, b.link_url, b.display_order, b.created_at
      FROM Banners b
      JOIN Users u ON b.admin_id = u.id
      WHERE b.is_active = true
      ORDER BY b.display_order ASC, b.created_at DESC
    `);
    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      message: 'Public banners retrieved successfully',
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

// Get categories with product count
router.get('/categories', categoriesCache, async (req, res) => {
  try {
    const startTime = Date.now();
    const result = await pool.query(`
      SELECT c.id, c.name, c.description, c.icon_url, c.sort_order,
             COUNT(p.id) AS product_count
      FROM Categories c
      LEFT JOIN Products p ON c.id = p.category_id
      GROUP BY c.id, c.name, c.description, c.icon_url, c.sort_order
      ORDER BY c.sort_order, c.name
    `);
    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      message: 'Public categories retrieved successfully',
      data: result.rows,
      meta: {
        count: result.rows.length,
        query_time: `${duration}ms`,
        cached: false
      }
    });
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve categories',
      error: error.message
    });
  }
});

// Get products by category with pagination
router.get('/categories/:id/products', categoryProductsCache, async (req, res) => {
  try {
    const startTime = Date.now();
    const categoryId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '12', 10);
    const sortBy = req.query.sort || 'newest';
    const offset = (page - 1) * limit;

    if (!categoryId || Number.isNaN(categoryId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category ID'
      });
    }

    // Verify category exists
    const categoryResult = await pool.query(
      'SELECT id, name, description FROM Categories WHERE id = $1',
      [categoryId]
    );
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }
    const category = categoryResult.rows[0];

    // Build sort order
    let orderBy;
    switch (sortBy) {
      case 'oldest': orderBy = 'ORDER BY p.created_at ASC'; break;
      case 'name_asc': orderBy = 'ORDER BY p.name ASC'; break;
      case 'name_desc': orderBy = 'ORDER BY p.name DESC'; break;
      case 'rating': orderBy = 'ORDER BY COALESCE(p.rating_average, 0) DESC, p.review_count DESC'; break;
      case 'popular': orderBy = 'ORDER BY p.views_count DESC, COALESCE(p.rating_average, 0) DESC'; break;
      case 'reviews': orderBy = 'ORDER BY p.review_count DESC, COALESCE(p.rating_average, 0) DESC'; break;
      default: orderBy = 'ORDER BY p.created_at DESC';
    }

    const productsQuery = `
      SELECT p.id, p.name, p.description, p.image_urls,
             p.buy_button_1_name, p.buy_button_1_url,
             p.buy_button_2_name, p.buy_button_2_url,
             p.buy_button_3_name, p.buy_button_3_url,
             p.views_count, p.rating_average, p.review_count, p.created_at,
             c.name AS category_name
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      WHERE p.category_id = $1
      ${orderBy}
      OFFSET $2 LIMIT $3
    `;
    const productsResult = await pool.query(productsQuery, [categoryId, offset, limit]);

    const countResult = await pool.query(
      'SELECT COUNT(*) AS total FROM Products WHERE category_id = $1',
      [categoryId]
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      message: 'Category products retrieved successfully',
      data: {
        category,
        products: productsResult.rows,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      meta: {
        count: productsResult.rows.length,
        query_time: `${duration}ms`,
        sort: sortBy,
        cached: false
      }
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve category products',
      error: error.message
    });
  }
});

// Get single product details with related products
router.get('/products/:id', productDetailsCache, async (req, res) => {
  try {
    const startTime = Date.now();
    const productId = parseInt(req.params.id, 10);
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
    }

    const productQuery = `
      SELECT p.id, p.name, p.description, p.image_urls,
             p.buy_button_1_name, p.buy_button_1_url,
             p.buy_button_2_name, p.buy_button_2_url,
             p.buy_button_3_name, p.buy_button_3_url,
             p.views_count, p.rating_average, p.review_count,
             p.created_at, p.updated_at, p.category_id,
             c.name as category_name, c.description as category_description,
             u.display_name as admin_name
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      JOIN Users u ON p.admin_id = u.id
      WHERE p.id = $1
    `;
    const productResult = await pool.query(productQuery, [productId]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    const product = productResult.rows[0];

    // Parallel execution: update view count and get related products
    const [_, relatedProductsResult] = await Promise.all([
      pool.query('UPDATE Products SET views_count = views_count + 1 WHERE id = $1', [productId]),
      pool.query(`
        SELECT p.id, p.name, p.description, p.image_urls,
               p.buy_button_1_name, p.buy_button_1_url,
               p.rating_average, p.review_count, p.views_count,
               c.name AS category_name
        FROM Products p
        JOIN Categories c ON p.category_id = c.id
        WHERE p.category_id = $1 AND p.id <> $2
        ORDER BY COALESCE(p.rating_average, 0) DESC, p.views_count DESC, p.created_at DESC
        LIMIT 4
      `, [product.category_id, productId])
    ]);

    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      message: 'Product details retrieved successfully',
      data: {
        product,
        related_products: relatedProductsResult.rows
      },
      meta: {
        related_count: relatedProductsResult.rows.length,
        query_time: `${duration}ms`,
        view_updated: true,
        cached: false
      }
    });
  } catch (error) {
    console.error('Get product details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve product details',
      error: error.message
    });
  }
});

// Get featured products
router.get('/products', featuredProductsCache, async (req, res) => {
  try {
    const startTime = Date.now();
    const limit = parseInt(req.query.limit || '8', 10);
    const sortBy = req.query.sort || 'newest';

    let orderBy;
    switch (sortBy) {
      case 'newest': orderBy = 'ORDER BY p.created_at DESC'; break;
      case 'popular': orderBy = 'ORDER BY p.views_count DESC, COALESCE(p.rating_average, 0) DESC'; break;
      case 'rating': orderBy = 'ORDER BY COALESCE(p.rating_average, 0) DESC, p.review_count DESC'; break;
      case 'trending': orderBy = `ORDER BY (p.views_count * 0.3 + COALESCE(p.rating_average, 0) * p.review_count * 0.7) DESC, p.created_at DESC`; break;
      default: orderBy = 'ORDER BY p.created_at DESC';
    }

    const productsQuery = `
      SELECT p.id, p.name, p.description, p.image_urls,
             p.buy_button_1_name, p.buy_button_1_url,
             p.rating_average, p.review_count, p.views_count,
             p.created_at,
             c.name AS category_name, c.id AS category_id
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      ${orderBy}
      LIMIT $1
    `;
    const productsResult = await pool.query(productsQuery, [limit]);

    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      message: 'Featured products retrieved successfully',
      data: {
        products: productsResult.rows,
        total: productsResult.rows.length
      },
      meta: {
        count: productsResult.rows.length,
        sort: sortBy,
        query_time: `${duration}ms`,
        cached: false
      }
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve featured products',
      error: error.message
    });
  }
});

// Advanced search with filters - FIXED for PostgreSQL
router.get('/search', searchCache, async (req, res) => {
  try {
    const startTime = Date.now();
    const query = req.query.q ? req.query.q.toString().trim() : '';
    const category = req.query.category ? parseInt(req.query.category.toString(), 10) : null;
    const sort = req.query.sort ? req.query.sort.toString() : 'relevance';
    const page = parseInt(req.query.page?.toString() || '1', 10);
    const limit = parseInt(req.query.limit?.toString() || '12', 10);
    const minRating = req.query.min_rating ? parseFloat(req.query.min_rating.toString()) : null;
    const offset = (page - 1) * limit;

    if (!query || query.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Build search pattern
    const searchPattern = `%${query}%`;
    const exactPattern = query;
    const startsWithPattern = `${query}%`;

    // Build WHERE conditions and parameters array
    let whereConditions = ['(p.name ILIKE $1 OR p.description ILIKE $1)'];
    let params = [searchPattern]; // $1
    let paramCount = 1;

    // Add category filter
    if (category) {
      paramCount++;
      whereConditions.push(`p.category_id = $${paramCount}`);
      params.push(category);
    }

    // Add rating filter
    if (minRating) {
      paramCount++;
      whereConditions.push(`p.rating_average >= $${paramCount}`);
      params.push(minRating);
    }

    const whereClause = whereConditions.join(' AND ');

    // Build ORDER BY clause
    let orderBy = '';
    let searchParams = [...params]; // Copy params for search query
    let countParams = [...params]; // Copy params for count query

    switch (sort) {
      case 'newest':
        orderBy = 'ORDER BY p.created_at DESC';
        break;
      case 'oldest':
        orderBy = 'ORDER BY p.created_at ASC';
        break;
      case 'name_asc':
        orderBy = 'ORDER BY p.name ASC';
        break;
      case 'name_desc':
        orderBy = 'ORDER BY p.name DESC';
        break;
      case 'rating':
        orderBy = 'ORDER BY COALESCE(p.rating_average, 0) DESC, p.review_count DESC';
        break;
      case 'popular':
        orderBy = 'ORDER BY p.views_count DESC, COALESCE(p.rating_average, 0) DESC';
        break;
      case 'trending':
        orderBy = 'ORDER BY (p.views_count * 0.2 + COALESCE(p.rating_average, 0) * p.review_count * 0.8) DESC, p.created_at DESC';
        break;
      default: // relevance
        // Add relevance parameters BEFORE using them
        paramCount++;
        const exactParam = paramCount;
        searchParams.push(exactPattern);
        
        paramCount++;
        const startsParam = paramCount;
        searchParams.push(startsWithPattern);
        
        orderBy = `ORDER BY 
          CASE 
            WHEN p.name ILIKE $${exactParam} THEN 1
            WHEN p.name ILIKE $${startsParam} THEN 2
            WHEN p.description ILIKE $${startsParam} THEN 3
            ELSE 4
          END,
          COALESCE(p.rating_average, 0) DESC,
          p.views_count DESC`;
        break;
    }

    // Add pagination parameters to search query
    paramCount++;
    searchParams.push(offset);
    const offsetParam = paramCount;
    
    paramCount++;
    searchParams.push(limit);
    const limitParam = paramCount;

    // Build final queries
    const searchQuery = `
      SELECT p.id, p.name, p.description, p.image_urls,
             p.buy_button_1_name, p.buy_button_1_url,
             p.buy_button_2_name, p.buy_button_2_url,
             p.buy_button_3_name, p.buy_button_3_url,
             p.views_count, p.rating_average, p.review_count, p.created_at,
             c.name as category_name, c.id as category_id
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ${orderBy}
      OFFSET $${offsetParam} LIMIT $${limitParam}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Products p
      WHERE ${whereClause}
    `;

    console.log('🔍 Search query:', query);
    console.log('📊 WHERE clause:', whereClause);
    console.log('📦 Search params:', searchParams);

    // Execute queries in parallel
    const [searchResult, countResult, categoriesResult] = await Promise.all([
      pool.query(searchQuery, searchParams),
      pool.query(countQuery, countParams),
      pool.query(`
        SELECT DISTINCT c.id, c.name, COUNT(p.id) as product_count
        FROM Categories c
        JOIN Products p ON c.id = p.category_id
        WHERE (p.name ILIKE $1 OR p.description ILIKE $1)
        GROUP BY c.id, c.name
        ORDER BY c.name
      `, [searchPattern])
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    const duration = Date.now() - startTime;

    console.log(`📊 Found: ${total} products in ${duration}ms`);

    res.json({
      status: 'success',
      message: 'Search completed successfully',
      data: {
        query,
        results: searchResult.rows,
        total,
        categories: categoriesResult.rows,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        filters: {
          category,
          sort,
          min_rating: minRating
        }
      },
      meta: {
        count: searchResult.rows.length,
        query_time: `${duration}ms`,
        cached: false
      }
    });
  } catch (error) {
    console.error('❌ Search products error:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search products',
      error: error.message
    });
  }
});


// Get popular products with timeframe filter
router.get('/products/popular', async (req, res) => {
  try {
    const startTime = Date.now();
    const limit = parseInt(req.query.limit || '10', 10);
    const timeframe = req.query.timeframe || 'all';

    let dateFilter = '';
    if (timeframe === 'week') {
      dateFilter = "AND p.created_at >= NOW() - INTERVAL '7 days'";
    } else if (timeframe === 'month') {
      dateFilter = "AND p.created_at >= NOW() - INTERVAL '1 month'";
    }

    const result = await pool.query(`
      SELECT p.id, p.name, p.description, p.image_urls,
             p.buy_button_1_name, p.buy_button_1_url,
             p.rating_average, p.review_count, p.views_count,
             c.name as category_name,
             (p.views_count * 0.3 + COALESCE(p.rating_average, 0) * p.review_count * 0.7) as popularity_score
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      WHERE 1=1 ${dateFilter}
      ORDER BY popularity_score DESC, p.created_at DESC
      LIMIT $1
    `, [limit]);

    const duration = Date.now() - startTime;

    res.json({
      status: 'success',
      message: 'Popular products retrieved successfully',
      data: {
        products: result.rows,
        timeframe
      },
      meta: {
        count: result.rows.length,
        query_time: `${duration}ms`
      }
    });
  } catch (error) {
    console.error('Get popular products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve popular products',
      error: error.message
    });
  }
});

module.exports = router;
