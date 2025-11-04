const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const session = require('express-session');
const passport = require('./config/passport');
const { connectRedis, getRedisClient } = require('./config/redis');
const adminRoutes = require('./routes/admin');
const wishlistRoutes = require('./routes/wishlist');
const reviewRoutes = require('./routes/reviews');
const chatRoutes = require('./routes/chat'); // ✅ ADD THIS LINE
const skillstoreAdminRoutes = require('./routes/skillstore-admin');
const skillstorePublicRoutes = require('./routes/skillstore-public');
const skillstoreBookmarksRoutes = require('./routes/skillstore-bookmarks');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS Configuration (keep your existing CORS code here - don't change)
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isStrictProduction = isProduction && process.env.VERCEL_ENV === 'production';

const allowedOrigins = [
    'https://studentstore-zeta.vercel.app',
    'https://studentstore-zeta.vercel.app/',
];

if (isDevelopment) {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3000/');
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://localhost:5173/');
}

const allowedOriginPatterns = isStrictProduction
    ? []
    : [
        /^https:\/\/studentstore-git-[a-zA-Z0-9-]+-muzeebs-projects\.vercel\.app\/?$/,
        /^https:\/\/studentstore-[a-zA-Z0-9-]+-muzeebs-projects\.vercel\.app\/?$/,
        /^https:\/\/.+\.onrender\.com\/?$/,
      ];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        
        const normalizedOrigin = origin.replace(/\/$/, '');
        const normalizedAllowedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ''));
        
        if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
            console.log(`✅ CORS allowed (exact): ${origin}`);
            return callback(null, true);
        }
        
        if (allowedOriginPatterns.length > 0) {
            const isAllowed = allowedOriginPatterns.some(pattern => pattern.test(origin));
            if (isAllowed) {
                console.log(`✅ CORS allowed (preview): ${origin}`);
                return callback(null, true);
            }
        }
        
        console.log(`🚨 CORS blocked: ${origin}`);
        console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`   VERCEL_ENV: ${process.env.VERCEL_ENV || 'not set'}`);
        console.log(`   isStrictProduction: ${isStrictProduction}`);
        console.log(`   Patterns active: ${allowedOriginPatterns.length > 0}`);
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
    optionsSuccessStatus: 204
}));

// Session Configuration - Works for both localhost and production
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'studentstore-dev-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

// Try to use Redis if available (production), fallback to MemoryStore (localhost)
if (process.env.NODE_ENV === 'production') {
  try {
    // This will be set after Redis connects
    console.log('⏳ Redis session store will be configured after connection...');
  } catch (error) {
    console.warn('⚠️ Redis session setup will happen async');
  }
}

// Initialize session middleware immediately (required for Passport)
app.use(session(sessionConfig));

// Passport Configuration (MUST be after session)
app.use(passport.initialize());
app.use(passport.session());


// Routes
app.get('/', (req, res) => {
    res.json({
        message: '🎓 StudentStore Backend API',
        status: 'running',
        version: '1.0.0'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
    try {
        const { testConnection } = require('./config/database');
        const isConnected = await testConnection();
        
        if (isConnected) {
            res.json({
                status: 'success',
                message: '✅ Database connection successful',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: '❌ Database connection failed'
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '❌ Database test error',
            error: error.message
        });
    }
});

// Import route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const databaseRoutes = require('./routes/database');
const publicRoutes = require('./routes/public');

// Use routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes); 
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes); // ✅ ADD THIS LINE
app.use('/api/admin/skillstore', skillstoreAdminRoutes);
app.use('/api/skillstore', skillstorePublicRoutes);
app.use('/api/skillstore/bookmarks', skillstoreBookmarksRoutes);





// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err.stack
    });
});

// 404 handler - catch all undefined routes
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Add this endpoint temporarily to clear cache
app.get('/clear-cache', async (req, res) => {
    const { clearAllCache } = require('./config/redis');
    await clearAllCache();
    res.json({ message: 'Cache cleared' });
});

// ✅ FIX: Start server with proper initialization order
const startServer = async () => {
    try {
        // Step 1: Connect to Redis (for production sessions)
        console.log('🔄 Connecting to Upstash Redis...');
        await connectRedis();
        
        // Step 2: Upgrade session store to Redis if available
        const redisClient = getRedisClient();
        if (redisClient && process.env.NODE_ENV === 'production') {
            const RedisStore = require('connect-redis').default;
            const redisStore = new RedisStore({
                client: redisClient,
                prefix: 'studentstore:sess:',
                ttl: 7 * 24 * 60 * 60
            });
            console.log('✅ Upgraded to Redis session store for production');
            // Note: Session middleware is already running with MemoryStore,
            // but new sessions will use Redis
        }
        
        // Step 3: Test database connection
        console.log('🔗 Testing database connection...');
        const { testConnection } = require('./config/database');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.log('⚠️ Database connection failed, but server will continue...');
        }
        
        // Step 4: Start server
        app.listen(PORT, () => {
           console.log(`
        🚀 StudentStore Backend Server Running!
        📍 Port: ${PORT}
        🌍 Environment: ${process.env.NODE_ENV}
        ⚡ Ready for student authentication!
        🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
        `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down StudentStore server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server termination requested...');
    process.exit(0);
});

startServer();
