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
// CORS Configuration - Updated for Render deployment
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        
        // Local development
        if (origin === 'http://localhost:3000') {
            return callback(null, true);
        }
        
        // Production Vercel domain
        if (origin === 'https://studentstore-zeta.vercel.app') {
            return callback(null, true);
        }
        
        // Git-based deployments (staging, feature branches)
        if (origin.includes('studentstore-git-') && 
            origin.includes('muzeebs-projects.vercel.app') && 
            origin.startsWith('https://')) {
            return callback(null, true);
        }
        
        // Random hash deployments (Vercel auto-generated)
        if (origin.includes('muzeebs-projects.vercel.app') && 
            origin.startsWith('https://studentstore-') &&
            !origin.includes('git-')) {
            return callback(null, true);
        }
        
        // ✅ NEW: Allow Render backend itself (for health checks)
        if (origin.includes('.onrender.com') && origin.startsWith('https://')) {
            return callback(null, true);
        }
        
        console.log(`🚨 CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
