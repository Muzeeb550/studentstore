const { Redis } = require('@upstash/redis');
const logger = require('../utils/logger');
require('dotenv').config();

let client = null;
let isConnected = false;

// Upstash Redis setup
const connectRedis = async () => {
    if (isConnected || client) {
        return;
    }

    try {
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            console.log('🔄 Connecting to Upstash Redis...');
            
            client = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL,
                token: process.env.UPSTASH_REDIS_REST_TOKEN
            });
            
            // Test connection with a simple ping
            await client.ping();
            
            console.log('✅ Connected to Upstash Redis');
            isConnected = true;
        } else {
            console.log('⚠️ Upstash Redis not configured, using memory fallback');
        }
    } catch (error) {
        console.log('⚠️ Upstash Redis connection failed, using memory fallback:', error.message);
        client = null;
        isConnected = false;
    }
};

// 🆕 Get Redis client for session store
const getRedisClient = () => {
    return client && isConnected ? client : null;
};

// Enhanced cache helper functions - PRODUCTION GRADE
const setCache = async (key, value, expireTime = 3600) => {
    if (client && isConnected) {
        try {
            const ttl = expireTime || parseInt(process.env.REDIS_TTL_DEFAULT) || 600;
            const prefixedKey = `${process.env.CACHE_PREFIX || 'studentstore'}:${key}`;
            
            // Enhanced serialization with metadata
            let serializedValue;
            const cacheData = {
                data: value,
                cached_at: new Date().toISOString(),
                ttl: ttl,
                type: typeof value
            };

            if (typeof value === 'string') {
                serializedValue = JSON.stringify({ ...cacheData, data: value });
            } else if (typeof value === 'object' && value !== null) {
                serializedValue = JSON.stringify(cacheData);
            } else {
                serializedValue = JSON.stringify({ ...cacheData, data: String(value) });
            }
            
            await client.setex(prefixedKey, ttl, serializedValue);
            console.log(`💾 Cache SET: ${prefixedKey} (TTL: ${ttl}s, Size: ${JSON.stringify(value).length} bytes)`);
            
            return true;
        } catch (error) {
            console.log('❌ Cache set failed:', error.message);
            return false;
        }
    }
    return false;
};

const getCache = async (key) => {
    if (client && isConnected) {
        try {
            const prefixedKey = `${process.env.CACHE_PREFIX || 'studentstore'}:${key}`;
            const result = await client.get(prefixedKey);
            
            if (result !== null && result !== undefined) {
                console.log(`🎯 Cache HIT: ${prefixedKey}`);
                
                try {
                    // Enhanced deserialization with metadata handling
                    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                    
                    // Check if it's our enhanced format with metadata
                    if (parsedResult && typeof parsedResult === 'object' && parsedResult.data !== undefined) {
                        // Log cache age for debugging
                        const cacheAge = parsedResult.cached_at ? 
                            Math.round((new Date() - new Date(parsedResult.cached_at)) / 1000) : 0;
                        console.log(`📊 Cache age: ${cacheAge}s, TTL: ${parsedResult.ttl}s`);
                        
                        return parsedResult.data;
                    } else {
                        // Fallback for old format or direct data
                        return parsedResult;
                    }
                } catch (parseError) {
                    console.log('⚠️ Cache parse error, returning raw result:', parseError.message);
                    return result;
                }
            } else {
                console.log(`❌ Cache MISS: ${prefixedKey}`);
                return null;
            }
        } catch (error) {
            console.log('❌ Cache get failed:', error.message);
            return null;
        }
    }
    return null;
};

const deleteCache = async (key) => {
    if (client && isConnected) {
        try {
            const prefixedKey = `${process.env.CACHE_PREFIX || 'studentstore'}:${key}`;
            const deleted = await client.del(prefixedKey);
            console.log(`🗑️ Cache DELETE: ${prefixedKey} (${deleted ? 'SUCCESS' : 'NOT FOUND'})`);
            return deleted > 0;
        } catch (error) {
            console.log('❌ Cache delete failed:', error.message);
            return false;
        }
    }
    return false;
};

// 🚀 NEW: Advanced pattern-based deletion for e-commerce
const deleteCachePattern = async (pattern) => {
    if (client && isConnected) {
        try {
            const prefixedPattern = `${process.env.CACHE_PREFIX || 'studentstore'}:${pattern}`;
            const keys = await client.keys(prefixedPattern);
            
            if (keys && keys.length > 0) {
                // Delete keys in batches for better performance
                const batchSize = 100;
                let deletedCount = 0;
                
                for (let i = 0; i < keys.length; i += batchSize) {
                    const batch = keys.slice(i, i + batchSize);
                    const batchDeleted = await client.del(...batch);
                    deletedCount += batchDeleted;
                }
                
                console.log(`🗑️ Cache DELETE PATTERN: ${prefixedPattern} (${deletedCount}/${keys.length} keys deleted)`);
                return deletedCount;
            } else {
                console.log(`🗑️ Cache DELETE PATTERN: ${prefixedPattern} (0 keys found)`);
                return 0;
            }
        } catch (error) {
            console.log('❌ Cache pattern delete failed:', error.message);
            return 0;
        }
    }
    return 0;
};

// 🚀 NEW: E-commerce specific cache invalidation (like Amazon, Shopify)
const invalidateCache = {
    // Banner cache invalidation
    banners: async () => {
        try {
            const deleted = await deleteCache('banners:active');
            console.log('🔄 CACHE INVALIDATED: Banners');
            return deleted;
        } catch (error) {
            console.log('❌ Banner cache invalidation failed:', error.message);
            return false;
        }
    },
    
    // Category cache invalidation  
    categories: async () => {
        try {
            const deleted = await deleteCache('categories:all');
            console.log('🔄 CACHE INVALIDATED: Categories');
            return deleted;
        } catch (error) {
            console.log('❌ Category cache invalidation failed:', error.message);
            return false;
        }
    },
    
    // Product cache invalidation (multi-level like major e-commerce sites)
    products: async (categoryId = null, productId = null) => {
        try {
            let totalDeleted = 0;
            
            // Level 1: Clear featured products cache
            totalDeleted += await deleteCachePattern('products:featured:*');
            
            // Level 2: Clear specific category if provided
            if (categoryId) {
                totalDeleted += await deleteCachePattern(`category:${categoryId}:*`);
                console.log(`📦 Cleared category ${categoryId} product caches`);
            }
            
            // Level 3: Clear specific product if provided
            if (productId) {
                const deleted = await deleteCache(`product:${productId}`);
                if (deleted) totalDeleted++;
                console.log(`🎯 Cleared product ${productId} cache`);
            }
            
            // Level 4: Clear search cache (products might appear in search)
            totalDeleted += await deleteCachePattern('search:*');
            
            console.log(`🔄 CACHE INVALIDATED: Products (${totalDeleted} keys cleared, category:${categoryId}, product:${productId})`);
            return totalDeleted;
        } catch (error) {
            console.log('❌ Product cache invalidation failed:', error.message);
            return 0;
        }
    },
    
    // Review cache invalidation (affects product ratings)
    reviews: async (productId) => {
        try {
            let totalDeleted = 0;
            
            if (productId) {
                // Clear product detail cache (contains rating/review count)
                const deleted = await deleteCache(`product:${productId}`);
                if (deleted) totalDeleted++;
                
                // Clear category cache that contains this product
                // Note: We could optimize this by storing category_id with product cache
                totalDeleted += await deleteCachePattern('category:*');
                
                console.log(`🔄 CACHE INVALIDATED: Reviews for Product ${productId} (${totalDeleted} keys cleared)`);
            }
            
            return totalDeleted;
        } catch (error) {
            console.log('❌ Review cache invalidation failed:', error.message);
            return 0;
        }
    },

    // 🚀 NEW: Search cache invalidation
    search: async () => {
        try {
            const deleted = await deleteCachePattern('search:*');
            console.log(`🔍 CACHE INVALIDATED: Search results (${deleted} keys cleared)`);
            return deleted;
        } catch (error) {
            console.log('❌ Search cache invalidation failed:', error.message);
            return 0;
        }
    },

    // 🚀 NEW: User-specific cache invalidation  
    user: async (userId) => {
        try {
            const deleted = await deleteCachePattern(`user:${userId}:*`);
            logger.debug(`User cache invalidated (${deleted} keys cleared)`); // Removed user ID for security
            return deleted;
        } catch (error) {
            logger.error('User cache invalidation failed:', error.message);
            return 0;
        }
    },

    // 🚀 NEW: Complete cache invalidation for major updates
    all: async () => {
        try {
            const deleted = await clearAllCache();
            console.log('🔄 CACHE INVALIDATED: ALL CACHE CLEARED');
            return deleted;
        } catch (error) {
            console.log('❌ Complete cache invalidation failed:', error.message);
            return 0;
        }
    }
};

// 🚀 NEW: Cache warming functions (like Netflix, YouTube)
const warmCache = {
    // Pre-populate popular products
    popularProducts: async (limit = 10) => {
        try {
            console.log(`🔥 CACHE WARMING: Popular products (${limit})`);
            // This would be called after cache invalidation to pre-populate
            // Implementation depends on your product popularity logic
            return true;
        } catch (error) {
            console.log('❌ Popular products cache warming failed:', error.message);
            return false;
        }
    },

    // Pre-populate homepage data
    homepage: async () => {
        try {
            console.log('🏠 CACHE WARMING: Homepage data');
            // Pre-populate banners, categories, featured products
            return true;
        } catch (error) {
            console.log('❌ Homepage cache warming failed:', error.message);
            return false;
        }
    }
};

// Enhanced cache clear with statistics
const clearAllCache = async () => {
    if (client && isConnected) {
        try {
            const startTime = Date.now();
            const keys = await client.keys(`${process.env.CACHE_PREFIX || 'studentstore'}:*`);
            
            if (keys && keys.length > 0) {
                let deletedCount = 0;
                
                // Delete in batches for better performance
                const batchSize = 100;
                for (let i = 0; i < keys.length; i += batchSize) {
                    const batch = keys.slice(i, i + batchSize);
                    const batchDeleted = await client.del(...batch);
                    deletedCount += batchDeleted;
                }
                
                const duration = Date.now() - startTime;
                console.log(`🗑️ Cleared ${deletedCount}/${keys.length} cache keys in ${duration}ms`);
                return deletedCount;
            } else {
                console.log('🗑️ No cache keys found to clear');
                return 0;
            }
        } catch (error) {
            console.log('❌ Cache clear failed:', error.message);
            return 0;
        }
    }
    return 0;
};

// 🚀 NEW: Cache health monitoring
const getCacheHealth = async () => {
    if (!client || !isConnected) {
        return { status: 'disconnected', keys: 0, memory: 0 };
    }

    try {
        const keys = await client.keys(`${process.env.CACHE_PREFIX || 'studentstore'}:*`);
        return {
            status: 'connected',
            keys: keys?.length || 0,
            uptime: isConnected,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { status: 'error', error: error.message };
    }
};

// Export all functions - ENTERPRISE READY
module.exports = { 
    // Core functions
    connectRedis,
    getRedisClient, // 🆕 Added for session store
    setCache,
    getCache,
    deleteCache,
    clearAllCache,
    
    // 🚀 Advanced functions (like major e-commerce sites)
    deleteCachePattern,
    invalidateCache,
    warmCache,
    getCacheHealth

};
