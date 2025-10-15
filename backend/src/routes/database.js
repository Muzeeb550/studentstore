const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Create all tables including Wishlists and Review Votes
router.post('/create-tables', async (req, res) => {
    const createTableQueries = [
        `CREATE TABLE IF NOT EXISTS Users (
            id SERIAL PRIMARY KEY,
            google_id VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            display_name VARCHAR(120) UNIQUE,
            email VARCHAR(255) NOT NULL,
            profile_picture VARCHAR(500),
            role VARCHAR(20) DEFAULT 'student',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS Categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(500),
            icon_url VARCHAR(500),
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS Products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category_id INT NOT NULL REFERENCES Categories(id) ON DELETE RESTRICT,
            image_urls TEXT,
            buy_button_1_name VARCHAR(100) NOT NULL,
            buy_button_1_url VARCHAR(1000) NOT NULL,
            buy_button_2_name VARCHAR(100),
            buy_button_2_url VARCHAR(1000),
            buy_button_3_name VARCHAR(100),
            buy_button_3_url VARCHAR(1000),
            views_count INT DEFAULT 0,
            rating_average DECIMAL(3,2) DEFAULT 0.0,
            review_count INT DEFAULT 0,
            admin_id INT NOT NULL REFERENCES Users(id) ON DELETE RESTRICT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS Courses (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            instructor_name VARCHAR(100),
            thumbnail_url VARCHAR(500),
            course_type VARCHAR(50) NOT NULL,
            course_url VARCHAR(1000) NOT NULL,
            affiliate_site_name VARCHAR(100),
            duration_minutes INT,
            difficulty_level VARCHAR(20),
            category_id INT NOT NULL REFERENCES Categories(id),
            rating_average DECIMAL(3,2) DEFAULT 0.0,
            review_count INT DEFAULT 0,
            views_count INT DEFAULT 0,
            admin_id INT NOT NULL REFERENCES Users(id),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS Cart (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES Users(id),
            product_id INT NOT NULL REFERENCES Products(id),
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id)
        )`,
        `CREATE TABLE IF NOT EXISTS Wishlists (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            product_id INT NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id)
        )`,
        // ✅ UPDATED: Reviews table with helpful/not_helpful counts
        `CREATE TABLE IF NOT EXISTS Reviews (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            product_id INT REFERENCES Products(id) ON DELETE CASCADE,
            course_id INT REFERENCES Courses(id) ON DELETE CASCADE,
            rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
            review_text TEXT,
            review_images TEXT,
            is_verified_purchase BOOLEAN DEFAULT false,
            helpfulness_score INT DEFAULT 0,
            helpful_count INT DEFAULT 0,
            not_helpful_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        // ✅ NEW: Review votes tracking table
        `CREATE TABLE IF NOT EXISTS review_votes (
            id SERIAL PRIMARY KEY,
            review_id INT NOT NULL REFERENCES Reviews(id) ON DELETE CASCADE,
            user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(review_id, user_id)
        )`,
        `CREATE TABLE IF NOT EXISTS Banners (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            media_url TEXT NOT NULL,
            link_url VARCHAR(2048) NOT NULL,
            display_order INT NOT NULL DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            admin_id INT NOT NULL REFERENCES Users(id) ON DELETE RESTRICT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    try {
        const results = [];
        for (const sql of createTableQueries) {
            await pool.query(sql);
            const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
            results.push(`✅ Table '${tableName}' created or already exists`);
        }
        
        res.json({
            status: 'success',
            message: '🎯 Database schema created successfully!',
            results: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database schema creation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create database schema',
            error: error.message
        });
    }
});

// Create indexes including for Wishlists and Review Votes
router.post('/create-indexes', async (req, res) => {
    const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_products_category ON Products(category_id)`,
        `CREATE INDEX IF NOT EXISTS idx_products_rating ON Products(rating_average DESC, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_products_name ON Products(name)`,
        `CREATE INDEX IF NOT EXISTS idx_reviews_product ON Reviews(product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_reviews_course ON Reviews(course_id)`,
        `CREATE INDEX IF NOT EXISTS idx_reviews_user ON Reviews(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_reviews_rating ON Reviews(rating)`,
        // ✅ NEW: Indexes for review voting
        `CREATE INDEX IF NOT EXISTS idx_reviews_helpful ON Reviews(helpful_count DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id)`,
        `CREATE INDEX IF NOT EXISTS idx_review_votes_user ON review_votes(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_users_googleid ON Users(google_id)`,
        `CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email)`,
        `CREATE INDEX IF NOT EXISTS idx_cart_user ON Cart(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_banners_order ON Banners(display_order ASC, is_active DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON Categories(sort_order)`,
        `CREATE INDEX IF NOT EXISTS idx_wishlists_user ON Wishlists(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_wishlists_product ON Wishlists(product_id)`
    ];

    try {
        const results = [];
        for (const sql of indexQueries) {
            await pool.query(sql);
            const indexName = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)[1];
            results.push(`✅ Index '${indexName}' created or already exists`);
        }
        
        res.json({
            status: 'success',
            message: '🚀 Performance indexes created successfully!',
            results: results
        });
    } catch (error) {
        console.error('Index creation error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create indexes',
            error: error.message
        });
    }
});

// ✅ NEW: Add review voting columns to existing Reviews table
router.post('/migrate-review-voting', async (req, res) => {
    const migrationQueries = [
        // Add new columns to Reviews table if they don't exist
        `DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'reviews' AND column_name = 'helpful_count'
            ) THEN
                ALTER TABLE Reviews ADD COLUMN helpful_count INT DEFAULT 0;
            END IF;
        END $$;`,
        
        `DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'reviews' AND column_name = 'not_helpful_count'
            ) THEN
                ALTER TABLE Reviews ADD COLUMN not_helpful_count INT DEFAULT 0;
            END IF;
        END $$;`,
        
        // Create review_votes table if it doesn't exist
        `CREATE TABLE IF NOT EXISTS review_votes (
            id SERIAL PRIMARY KEY,
            review_id INT NOT NULL REFERENCES Reviews(id) ON DELETE CASCADE,
            user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(review_id, user_id)
        )`,
        
        // Create indexes
        `CREATE INDEX IF NOT EXISTS idx_reviews_helpful ON Reviews(helpful_count DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id)`,
        `CREATE INDEX IF NOT EXISTS idx_review_votes_user ON review_votes(user_id)`
    ];

    try {
        const results = [];
        for (const sql of migrationQueries) {
            await pool.query(sql);
            results.push('✅ Migration step executed successfully');
        }
        
        res.json({
            status: 'success',
            message: '🔄 Review voting migration completed successfully!',
            results: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to run migration',
            error: error.message
        });
    }
});

// Seed Categories - safe insertion to avoid duplicates
router.post('/seed-data', async (req, res) => {
    const seedData = [
        ['📚 Textbooks', 'New and used textbooks for all subjects', null, 1, true],
        ['💻 Electronics', 'Laptops, tablets, and accessories', null, 2, true],
        ['✏️ Stationery', 'Notebooks, pens, supplies', null, 3, true],
        ['🎒 Campus Gear', 'Backpacks, clothing, essentials', null, 4, true],
        ['📖 Online Courses', 'Educational courses', null, 5, true],
        ['🍕 Campus Life', 'Food and services', null, 6, true]
    ];

    try {
        const results = [];
        for (const [name, description, icon, order, active] of seedData) {
            try {
                await pool.query(
                    `INSERT INTO Categories (name, description, icon_url, sort_order, is_active)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (name) DO NOTHING`,
                    [name, description, icon, order, active]
                );
                results.push(`✅ Category '${name}' inserted or already exists`);
            } catch (err) {
                console.error(`Error inserting category ${name}:`, err);
            }
        }

        res.json({
            status: 'success',
            message: '🌱 Seed data inserted successfully!',
            results: results
        });
    } catch (error) {
        console.error('Seed data error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to insert seed data',
            error: error.message
        });
    }
});

// Check tables
router.get('/check-tables', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema='public'
            ORDER BY table_name
        `);
        
        res.json({
            status: 'success',
            message: '📋 Database tables retrieved successfully',
            tables: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Check tables error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check tables',
            error: error.message
        });
    }
});

// ✅ NEW: Check review voting setup
router.get('/check-review-voting', async (req, res) => {
    try {
        // Check if columns exist
        const columnsCheck = await pool.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'reviews' 
            AND column_name IN ('helpful_count', 'not_helpful_count')
        `);

        // Check if review_votes table exists
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'review_votes'
        `);

        // Check indexes
        const indexCheck = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename IN ('reviews', 'review_votes')
            AND indexname LIKE '%helpful%' OR indexname LIKE '%vote%'
        `);

        // Get vote statistics
        const voteStats = await pool.query(`
            SELECT 
                COUNT(*) as total_votes,
                COUNT(DISTINCT review_id) as reviews_with_votes,
                COUNT(DISTINCT user_id) as users_who_voted
            FROM review_votes
        `);

        res.json({
            status: 'success',
            message: '📊 Review voting setup check',
            data: {
                columns: columnsCheck.rows,
                table_exists: tableCheck.rows.length > 0,
                indexes: indexCheck.rows,
                statistics: voteStats.rows[0]
            }
        });
    } catch (error) {
        console.error('Check review voting error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check review voting setup',
            error: error.message
        });
    }
});

// List users
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, display_name, email, role, is_active, created_at
            FROM Users
            ORDER BY created_at DESC
        `);
        
        res.json({
            status: 'success',
            message: '👥 Users retrieved successfully',
            users: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get users',
            error: error.message
        });
    }
});

module.exports = router;
