const { Redis } = require('@upstash/redis');
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

// Cache helper functions with fallback - IMPROVED FOR UPSTASH
const setCache = async (key, value, expireTime = 3600) => {
    if (client && isConnected) {
        try {
            const ttl = expireTime || parseInt(process.env.REDIS_TTL_DEFAULT) || 600;
            const prefixedKey = `${process.env.CACHE_PREFIX || 'studentstore'}:${key}`;
            
            // Debug: Log what we're trying to cache
            console.log('🔍 DEBUG - Caching value type:', typeof value);
            
            // For Upstash, we need to handle serialization carefully
            let serializedValue;
            if (typeof value === 'string') {
                serializedValue = value;
            } else if (typeof value === 'object' && value !== null) {
                serializedValue = JSON.stringify(value);
            } else {
                serializedValue = String(value);
            }
            
            await client.setex(prefixedKey, ttl, serializedValue);
            console.log(`💾 Cache SET: ${prefixedKey} (TTL: ${ttl}s)`);
        } catch (error) {
            console.log('Cache set failed:', error.message);
        }
    }
};

const getCache = async (key) => {
    if (client && isConnected) {
        try {
            const prefixedKey = `${process.env.CACHE_PREFIX || 'studentstore'}:${key}`;
            const result = await client.get(prefixedKey);
            
            if (result !== null && result !== undefined) {
                console.log(`🎯 Cache HIT: ${prefixedKey}`);
                
                // Handle different return types from Upstash
                if (typeof result === 'string') {
                    try {
                        return JSON.parse(result);
                    } catch (parseError) {
                        console.log('Not JSON, returning as string:', parseError.message);
                        return result;
                    }
                } else if (typeof result === 'object') {
                    // Upstash may return object directly
                    return result;
                } else {
                    return result;
                }
            } else {
                console.log(`❌ Cache MISS: ${prefixedKey}`);
                return null;
            }
        } catch (error) {
            console.log('Cache get failed:', error.message);
            return null;
        }
    }
    return null;
};

const deleteCache = async (key) => {
    if (client && isConnected) {
        try {
            const prefixedKey = `${process.env.CACHE_PREFIX || 'studentstore'}:${key}`;
            await client.del(prefixedKey);
            console.log(`🗑️ Cache DELETE: ${prefixedKey}`);
        } catch (error) {
            console.log('Cache delete failed:', error.message);
        }
    }
};

// Clear all cache function
const clearAllCache = async () => {
    if (client && isConnected) {
        try {
            // Get all keys with our prefix
            const keys = await client.keys(`${process.env.CACHE_PREFIX || 'studentstore'}:*`);
            if (keys && keys.length > 0) {
                // Delete all keys
                for (const key of keys) {
                    await client.del(key);
                }
                console.log(`🗑️ Cleared ${keys.length} cache keys`);
            } else {
                console.log('🗑️ No cache keys found to clear');
            }
        } catch (error) {
            console.log('Cache clear failed:', error.message);
        }
    }
};

module.exports = { 
    connectRedis,
    setCache,
    getCache,
    deleteCache,
    clearAllCache
};
