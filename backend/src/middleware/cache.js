const { getCache, setCache, deleteCache } = require('../config/redis');

// Cache middleware factory
const createCacheMiddleware = (keyGenerator, ttlSeconds = 600, skipCondition = null) => {
  return async (req, res, next) => {
    try {
      // Skip caching for certain conditions
      if (skipCondition && skipCondition(req)) {
        return next();
      }

      const cacheKey = keyGenerator(req);
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }
      
      console.log(`❌ Cache MISS: ${cacheKey}`);
      
      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache successful responses
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode === 200 && data && data.status === 'success') {
          // Make sure we're storing the actual data object, not a stringified version
          setCache(cacheKey, data, ttlSeconds)
            .catch(err => console.log('Cache set failed:', err.message));
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.log('Cache middleware error:', error.message);
      next();
    }
  };
};

module.exports = { createCacheMiddleware };
