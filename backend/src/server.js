const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const session = require('express-session');
const passport = require('./config/passport');
const { connectRedis } = require('./config/redis');
const adminRoutes = require('./routes/admin');
const wishlistRoutes = require('./routes/wishlist');
const reviewRoutes = require('./routes/reviews');



require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
// Needs to be (for multiple domains)
// CORS Configuration - FIXED for production
// CORS Configuration - Industry Standard (Environment-Based)
// CORS Configuration - FIXED for trailing slashes
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.RENDER_PREVIEW === 'true';

// Exact production domains (most secure)
const allowedOrigins = [
    'https://studentstore-zeta.vercel.app',
    'https://studentstore-zeta.vercel.app/', // ✅ WITH trailing slash
];

// Development-only origins
if (isDevelopment) {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:3000/'); // ✅ WITH trailing slash
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://localhost:5173/'); // ✅ WITH trailing slash
}

// Preview environments (dev/staging/preview builds)
const allowedOriginPatterns = (isProduction && !isPreview)
    ? []
    : [
        // ✅ Vercel preview branches - ALLOWS TRAILING SLASH
        /^https:\/\/studentstore-git-[a-zA-Z0-9-]+-muzeebs-projects\.vercel\.app\/?$/,
        //                                                                        ↑ \/?
        
        // ✅ Vercel preview deployments - ALLOWS TRAILING SLASH
        /^https:\/\/studentstore-[a-zA-Z0-9-]+-muzeebs-projects\.vercel\.app\/?$/,
        //                                                                    ↑ \/?
        
        // ✅ Render preview URLs - ALLOWS TRAILING SLASH
        /^https:\/\/.+\.onrender\.com\/?$/,
        //                               ↑ \/?
      ];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) {
            return callback(null, true);
        }
        
        // ✅ REMOVE trailing slash for exact match checking
        const normalizedOrigin = origin.replace(/\/$/, '');
        const normalizedAllowedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ''));
        
        // Check exact matches first (fastest)
        if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
            console.log(`✅ CORS allowed (exact): ${origin}`);
            return callback(null, true);
        }
        
        // Check pattern matches (only in dev/staging/preview)
        if (allowedOriginPatterns.length > 0) {
            const isAllowed = allowedOriginPatterns.some(pattern => pattern.test(origin));
            if (isAllowed) {
                console.log(`✅ CORS allowed (preview): ${origin}`);
                return callback(null, true);
            }
        }
        
        console.log(`🚨 CORS blocked: ${origin} [isDev: ${isDevelopment}, isProd: ${isProduction}, isPreview: ${isPreview}]`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
    optionsSuccessStatus: 204
}));



// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Passport Configuration
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
const publicRoutes = require('./routes/public'); // ADD THIS LINE

// Use routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes); 
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);



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


// Start server
const startServer = async () => {
    try {
        // Connect to Redis (with fallback)
        await connectRedis();
        
        // Test database connection on startup
        console.log('🔗 Testing database connection...');
        const { testConnection } = require('./config/database');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.log('⚠️ Database connection failed, but server will continue...');
        }
        
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
