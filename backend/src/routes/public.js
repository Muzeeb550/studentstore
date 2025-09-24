const express = require('express');
const { getPool, sql } = require('../config/database');
const { createCacheMiddleware } = require('../middleware/cache');
const { getCacheHealth } = require('../config/redis'); // 🚀 ADDED: Cache monitoring
const router = express.Router();

// 🚀 OPTIMIZED: Enterprise-level cache configurations with intelligent TTL values
const bannersCache = createCacheMiddleware(
    () => 'banners:active',
    300, // 🚀 OPTIMIZED: 5 minutes (was 30 minutes) - Fast admin updates
    (req) => req.headers['cache-control'] === 'no-cache' // Skip cache if force-refresh
);

const categoriesCache = createCacheMiddleware(
    () => 'categories:all', 
    600, // 🚀 OPTIMIZED: 10 minutes (was 60 minutes) - Faster category updates
    (req) => req.headers['cache-control'] === 'no-cache'
);

const featuredProductsCache = createCacheMiddleware(
    (req) => `products:featured:limit:${req.query.limit || 8}:sort:${req.query.sort || 'newest'}`, // 🚀 FIXED: Include sort in cache key
    300, // 🚀 OPTIMIZED: 5 minutes (was 15 minutes) - Faster product updates
    (req) => req.headers['cache-control'] === 'no-cache'
);

const productDetailsCache = createCacheMiddleware(
    (req) => `product:${req.params.id}`,
    300, // 🚀 OPTIMIZED: 5 minutes (was 10 minutes) - Faster review/rating updates
    (req) => req.method !== 'GET' || req.headers['cache-control'] === 'no-cache'
);

const categoryProductsCache = createCacheMiddleware(
    (req) => `category:${req.params.id}:page:${req.query.page || 1}:limit:${req.query.limit || 12}:sort:${req.query.sort || 'newest'}`, // 🚀 FIXED: Include sort in cache key
    180, // 🚀 OPTIMIZED: 3 minutes (was 5 minutes) - Very fast product list updates
    (req) => req.headers['cache-control'] === 'no-cache'
);

const searchCache = createCacheMiddleware(
    (req) => {
        const { q, category, sort = 'relevance', page = 1, min_rating } = req.query;
        return `search:${q}:${category || 'all'}:${sort}:${page}:${min_rating || 'any'}`;
    },
    180, // 🚀 OPTIMIZED: 3 minutes (was 5 minutes) - Dynamic search results
    (req) => req.headers['cache-control'] === 'no-cache'
);

// 🚀 NEW: Cache health monitoring endpoint
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

// 🚀 ENHANCED: Public route to get active banners with performance monitoring
router.get('/banners', bannersCache, async (req, res) => {
    try {
        const startTime = Date.now();
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT 
                b.id, b.name, b.media_url, b.link_url, b.display_order,
                b.created_at
            FROM Banners b
            INNER JOIN Users u ON b.admin_id = u.id
            WHERE b.is_active = 1
            ORDER BY b.display_order ASC, b.created_at DESC
        `);

        const duration = Date.now() - startTime;

        res.json({
            status: 'success',
            message: 'Public banners retrieved successfully',
            data: result.recordset,
            meta: {
                count: result.recordset.length,
                query_time: `${duration}ms`,
                cached: false // Will be overridden by cache middleware if cached
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

// 🚀 ENHANCED: Public route to get categories with performance monitoring
router.get('/categories', categoriesCache, async (req, res) => {
    try {
        const startTime = Date.now();
        const pool = await getPool();
        
        // 🚀 ENHANCED: Include product count for each category
        const result = await pool.request().query(`
            SELECT 
                c.id, c.name, c.description, c.icon_url, c.sort_order,
                COUNT(p.id) as product_count
            FROM Categories c
            LEFT JOIN Products p ON c.id = p.category_id
            GROUP BY c.id, c.name, c.description, c.icon_url, c.sort_order
            ORDER BY c.sort_order, c.name
        `);

        const duration = Date.now() - startTime;

        res.json({
            status: 'success',
            message: 'Public categories retrieved successfully',
            data: result.recordset,
            meta: {
                count: result.recordset.length,
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

// 🚀 FIXED: Public route to get products by category with SQL Server compatibility
router.get('/categories/:id/products', categoryProductsCache, async (req, res) => {
    try {
        const startTime = Date.now();
        const pool = await getPool();
        const categoryId = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const sortBy = req.query.sort || 'newest'; // 🚀 ADDED: Sort options
        const offset = (page - 1) * limit;

        // Validate category ID
        if (!categoryId || isNaN(categoryId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid category ID'
            });
        }

        // First, verify category exists and get its info
        const categoryResult = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .query('SELECT id, name, description FROM Categories WHERE id = @categoryId');

        if (categoryResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }

        const category = categoryResult.recordset[0];

        // 🚀 FIXED: SQL Server compatible sort options
        let orderClause = '';
        switch (sortBy) {
            case 'newest':
                orderClause = 'ORDER BY p.created_at DESC';
                break;
            case 'oldest':
                orderClause = 'ORDER BY p.created_at ASC';
                break;
            case 'name_asc':
                orderClause = 'ORDER BY p.name ASC';
                break;
            case 'name_desc':
                orderClause = 'ORDER BY p.name DESC';
                break;
            case 'rating':
                // 🚀 FIXED: SQL Server compatible NULLS handling
                orderClause = 'ORDER BY ISNULL(p.rating_average, 0) DESC, p.review_count DESC';
                break;
            case 'popular':
                orderClause = 'ORDER BY p.views_count DESC, ISNULL(p.rating_average, 0) DESC';
                break;
            case 'reviews':
                orderClause = 'ORDER BY p.review_count DESC, ISNULL(p.rating_average, 0) DESC';
                break;
            default:
                orderClause = 'ORDER BY p.created_at DESC';
        }

        // Get products in this category with pagination
        const productsResult = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.buy_button_2_name, p.buy_button_2_url,
                    p.buy_button_3_name, p.buy_button_3_url,
                    p.views_count, p.rating_average, p.review_count, p.created_at,
                    c.name as category_name
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                WHERE p.category_id = @categoryId
                ${orderClause}
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        // Get total count for pagination
        const countResult = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .query('SELECT COUNT(*) as total FROM Products WHERE category_id = @categoryId');

        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / limit);
        const duration = Date.now() - startTime;

        res.json({
            status: 'success',
            message: 'Category products retrieved successfully',
            data: {
                category: category,
                products: productsResult.recordset,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: total,
                    total_pages: totalPages,
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            },
            meta: {
                count: productsResult.recordset.length,
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

// 🚀 ENHANCED: Public route to get single product details with related products
router.get('/products/:id', productDetailsCache, async (req, res) => {
    try {
        const startTime = Date.now();
        const pool = await getPool();
        const productId = parseInt(req.params.id);

        // Validate product ID
        if (!productId || isNaN(productId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid product ID'
            });
        }

        // 🚀 ENHANCED: Single query with comprehensive product data
        const productResult = await pool.request()
            .input('productId', sql.Int, productId)
            .query(`
                SELECT 
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.buy_button_2_name, p.buy_button_2_url,
                    p.buy_button_3_name, p.buy_button_3_url,
                    p.views_count, p.rating_average, p.review_count, 
                    p.created_at, p.updated_at, p.category_id,
                    c.name as category_name, c.description as category_description,
                    u.display_name as admin_name
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                INNER JOIN Users u ON p.admin_id = u.id
                WHERE p.id = @productId
            `);

        if (productResult.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        const product = productResult.recordset[0];

        // 🚀 PERFORMANCE: Parallel execution of view update and related products
        const [viewUpdate, relatedProductsResult] = await Promise.all([
            // Update view count asynchronously
            pool.request()
                .input('productId', sql.Int, productId)
                .query('UPDATE Products SET views_count = views_count + 1 WHERE id = @productId'),
            
            // Get related products from same category
            pool.request()
                .input('categoryId', sql.Int, product.category_id)
                .input('productId', sql.Int, productId)
                .query(`
                    SELECT TOP 4
                        p.id, p.name, p.description, p.image_urls,
                        p.buy_button_1_name, p.buy_button_1_url,
                        p.rating_average, p.review_count, p.views_count,
                        c.name as category_name
                    FROM Products p
                    INNER JOIN Categories c ON p.category_id = c.id
                    WHERE p.category_id = @categoryId AND p.id != @productId
                    ORDER BY 
                        ISNULL(p.rating_average, 0) DESC,
                        p.views_count DESC,
                        p.created_at DESC
                `)
        ]);

        const duration = Date.now() - startTime;

        res.json({
            status: 'success',
            message: 'Product details retrieved successfully',
            data: {
                product: product,
                related_products: relatedProductsResult.recordset
            },
            meta: {
                related_count: relatedProductsResult.recordset.length,
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

// 🚀 FIXED: Public route to get featured products with SQL Server compatibility
router.get('/products', featuredProductsCache, async (req, res) => {
    try {
        const startTime = Date.now();
        const pool = await getPool();
        const limit = parseInt(req.query.limit) || 8;
        const sortBy = req.query.sort || 'newest'; // 🚀 ADDED: Sort options
        
        // 🚀 FIXED: SQL Server compatible sort for featured products
        let orderClause = '';
        switch (sortBy) {
            case 'newest':
                orderClause = 'ORDER BY p.created_at DESC';
                break;
            case 'popular':
                orderClause = 'ORDER BY p.views_count DESC, ISNULL(p.rating_average, 0) DESC';
                break;
            case 'rating':
                orderClause = 'ORDER BY ISNULL(p.rating_average, 0) DESC, p.review_count DESC';
                break;
            case 'trending':
                orderClause = `ORDER BY 
                    (p.views_count * 0.3 + ISNULL(p.rating_average, 0) * p.review_count * 0.7) DESC,
                    p.created_at DESC`;
                break;
            default:
                orderClause = 'ORDER BY p.created_at DESC';
        }
        
        const result = await pool.request()
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.rating_average, p.review_count, p.views_count,
                    p.created_at,
                    c.name as category_name, c.id as category_id
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                ${orderClause}
            `);

        const duration = Date.now() - startTime;

        res.json({
            status: 'success',
            message: 'Featured products retrieved successfully',
            data: { 
                products: result.recordset,
                total: result.recordset.length
            },
            meta: {
                count: result.recordset.length,
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

// 🚀 FIXED: Advanced search with SQL Server compatibility
router.get('/search', searchCache, async (req, res) => {
    try {
        const startTime = Date.now();
        const pool = await getPool();
        const query = req.query.q ? req.query.q.toString().trim() : '';
        const category = req.query.category ? parseInt(req.query.category.toString()) : null;
        const sort = req.query.sort ? req.query.sort.toString() : 'relevance';
        const page = parseInt(req.query.page?.toString() || '1');
        const limit = parseInt(req.query.limit?.toString() || '12');
        const minRating = req.query.min_rating ? parseFloat(req.query.min_rating.toString()) : null; // 🚀 NEW: Rating filter
        const offset = (page - 1) * limit;

        // Validate search query
        if (!query || query.length < 2) {
            return res.status(400).json({
                status: 'error',
                message: 'Search query must be at least 2 characters long'
            });
        }

        // 🚀 ENHANCED: Build advanced search conditions
        let searchConditions = [];
        let searchParams = [];
        let paramIndex = 0;

        // Primary search in product name and description
        searchConditions.push(`(p.name LIKE @searchTerm${paramIndex} OR p.description LIKE @searchTerm${paramIndex})`);
        searchParams.push({ name: `searchTerm${paramIndex}`, value: `%${query}%` });
        paramIndex++;

        // 🚀 NEW: Additional filters
        let additionalFilters = '';
        
        // Category filter
        if (category) {
            additionalFilters += ' AND p.category_id = @categoryId';
        }
        
        // Rating filter
        if (minRating) {
            additionalFilters += ' AND p.rating_average >= @minRating';
        }

        // 🚀 FIXED: SQL Server compatible advanced sort options
        let orderBy = '';
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
                orderBy = 'ORDER BY ISNULL(p.rating_average, 0) DESC, p.review_count DESC';
                break;
            case 'popular':
                orderBy = 'ORDER BY p.views_count DESC, ISNULL(p.rating_average, 0) DESC';
                break;
            case 'trending':
                orderBy = `ORDER BY 
                    (p.views_count * 0.2 + ISNULL(p.rating_average, 0) * p.review_count * 0.8) DESC,
                    p.created_at DESC`;
                break;
            default: // relevance
                orderBy = `ORDER BY 
                    CASE 
                        WHEN p.name LIKE @exactMatch THEN 1
                        WHEN p.name LIKE @startsWith THEN 2
                        WHEN p.description LIKE @startsWith THEN 3
                        ELSE 4
                    END,
                    ISNULL(p.rating_average, 0) DESC,
                    p.views_count DESC`;
                
                // Add relevance parameters
                searchParams.push(
                    { name: 'exactMatch', value: `%${query}%` },
                    { name: 'startsWith', value: `${query}%` }
                );
                break;
        }

        // 🚀 OPTIMIZED: Single comprehensive search query
        const searchQuery = `
            SELECT 
                p.id, p.name, p.description, p.image_urls,
                p.buy_button_1_name, p.buy_button_1_url,
                p.buy_button_2_name, p.buy_button_2_url,
                p.buy_button_3_name, p.buy_button_3_url,
                p.views_count, p.rating_average, p.review_count, p.created_at,
                c.name as category_name, c.id as category_id
            FROM Products p
            INNER JOIN Categories c ON p.category_id = c.id
            WHERE (${searchConditions.join(' OR ')})
            ${additionalFilters}
            ${orderBy}
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM Products p
            INNER JOIN Categories c ON p.category_id = c.id
            WHERE (${searchConditions.join(' OR ')})
            ${additionalFilters}
        `;

        // Execute search query with parameters
        let searchRequest = pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit);

        // Add search parameters
        searchParams.forEach(param => {
            searchRequest = searchRequest.input(param.name, sql.NVarChar, param.value);
        });

        // Add filter parameters
        if (category) {
            searchRequest = searchRequest.input('categoryId', sql.Int, category);
        }
        if (minRating) {
            searchRequest = searchRequest.input('minRating', sql.Float, minRating);
        }

        // 🚀 PERFORMANCE: Parallel execution of search and count queries
        const [searchResult, countResult, categoriesResult] = await Promise.all([
            searchRequest.query(searchQuery),
            
            // Count query with same parameters
            (async () => {
                let countRequest = pool.request();
                searchParams.slice(0, 1).forEach(param => {
                    countRequest = countRequest.input(param.name, sql.NVarChar, param.value);
                });
                if (category) countRequest = countRequest.input('categoryId', sql.Int, category);
                if (minRating) countRequest = countRequest.input('minRating', sql.Float, minRating);
                return countRequest.query(countQuery);
            })(),
            
            // Available categories for filtering
            pool.request()
                .input('searchTerm0', sql.NVarChar, `%${query}%`)
                .query(`
                    SELECT DISTINCT c.id, c.name, COUNT(p.id) as product_count
                    FROM Categories c
                    INNER JOIN Products p ON c.id = p.category_id
                    WHERE (p.name LIKE @searchTerm0 OR p.description LIKE @searchTerm0)
                    GROUP BY c.id, c.name
                    ORDER BY c.name
                `)
        ]);

        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / limit);
        const duration = Date.now() - startTime;

        res.json({
            status: 'success',
            message: 'Search completed successfully',
            data: {
                query: query,
                results: searchResult.recordset,
                total: total,
                categories: categoriesResult.recordset,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total: total,
                    total_pages: totalPages,
                    has_next: page < totalPages,
                    has_prev: page > 1
                },
                filters: {
                    category: category,
                    sort: sort,
                    min_rating: minRating
                }
            },
            meta: {
                count: searchResult.recordset.length,
                query_time: `${duration}ms`,
                cached: false
            }
        });

    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search products',
            error: error.message
        });
    }
});

// 🚀 FIXED: Popular products endpoint with SQL Server compatibility
router.get('/products/popular', async (req, res) => {
    try {
        const startTime = Date.now();
        const pool = await getPool();
        const limit = parseInt(req.query.limit) || 10;
        const timeframe = req.query.timeframe || 'all'; // all, week, month
        
        let dateFilter = '';
        if (timeframe === 'week') {
            dateFilter = "AND p.created_at >= DATEADD(week, -1, GETDATE())";
        } else if (timeframe === 'month') {
            dateFilter = "AND p.created_at >= DATEADD(month, -1, GETDATE())";
        }
        
        const result = await pool.request()
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit)
                    p.id, p.name, p.description, p.image_urls,
                    p.buy_button_1_name, p.buy_button_1_url,
                    p.rating_average, p.review_count, p.views_count,
                    c.name as category_name,
                    (p.views_count * 0.3 + ISNULL(p.rating_average, 0) * p.review_count * 0.7) as popularity_score
                FROM Products p
                INNER JOIN Categories c ON p.category_id = c.id
                WHERE 1=1 ${dateFilter}
                ORDER BY popularity_score DESC, p.created_at DESC
            `);

        const duration = Date.now() - startTime;

        res.json({
            status: 'success',
            message: 'Popular products retrieved successfully',
            data: {
                products: result.recordset,
                timeframe: timeframe
            },
            meta: {
                count: result.recordset.length,
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
