const redis = require('redis');
require('dotenv').config();

let client = null;
let isConnected = false;

// Simple Redis setup for development
const connectRedis = async () => {
    if (isConnected || client) {
        return;
    }

    try {
        if (process.env.REDIS_URL) {
            console.log('🔄 Connecting to Redis...');
            client = redis.createClient({
                url: process.env.REDIS_URL
            });
            await client.connect();
            console.log('✅ Connected to Redis');
            isConnected = true;
        } else {
            console.log('⚠️ Redis not configured, using memory fallback');
        }
    } catch (error) {
        console.log('⚠️ Redis connection failed, using memory fallback');
        client = null;
        isConnected = false;
    }
};

// Cache helper functions with fallback
const setCache = async (key, value, expireTime = 3600) => {
    if (client && isConnected) {
        try {
            await client.setEx(key, expireTime, JSON.stringify(value));
        } catch (error) {
            console.log('Cache set failed');
        }
    }
};

const getCache = async (key) => {
    if (client && isConnected) {
        try {
            const result = await client.get(key);
            return result ? JSON.parse(result) : null;
        } catch (error) {
            return null;
        }
    }
    return null;
};

const deleteCache = async (key) => {
    if (client && isConnected) {
        try {
            await client.del(key);
        } catch (error) {
            console.log('Cache delete failed');
        }
    }
};

module.exports = { 
    connectRedis,
    setCache,
    getCache,
    deleteCache
};
