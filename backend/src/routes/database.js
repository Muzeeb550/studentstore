const express = require('express');
const { getPool, sql } = require('../config/database');
const router = express.Router();

// Create all tables
router.post('/create-tables', async (req, res) => {
    try {
        const pool = await getPool();
        
        // Create Tables SQL
        const createTablesSQL = [
            // Users Table
            `CREATE TABLE Users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                google_id NVARCHAR(100) UNIQUE NOT NULL,
                name NVARCHAR(100) NOT NULL,
                display_name NVARCHAR(120) UNIQUE,
                email NVARCHAR(255) NOT NULL,
                profile_picture NVARCHAR(500),
                role NVARCHAR(20) DEFAULT 'student',
                is_active BIT DEFAULT 1,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE()
            )`,
            
            // Categories Table
            `CREATE TABLE Categories (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(100) NOT NULL,
                description NVARCHAR(500),
                icon_url NVARCHAR(500),
                sort_order INT DEFAULT 0,
                is_active BIT DEFAULT 1,
                created_at DATETIME2 DEFAULT GETDATE()
            )`,
            
            // Products Table (Affiliate-focused)
            `CREATE TABLE Products (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(200) NOT NULL,
                description NVARCHAR(MAX) NOT NULL,
                category_id INT NOT NULL,
                image_urls NVARCHAR(MAX),
                buy_button_1_name NVARCHAR(100) NOT NULL,
                buy_button_1_url NVARCHAR(1000) NOT NULL,
                buy_button_2_name NVARCHAR(100),
                buy_button_2_url NVARCHAR(1000),
                buy_button_3_name NVARCHAR(100),
                buy_button_3_url NVARCHAR(1000),
                views_count INT DEFAULT 0,
                rating_average DECIMAL(3,2) DEFAULT 0.0,
                review_count INT DEFAULT 0,
                admin_id INT NOT NULL,
                is_active BIT DEFAULT 1,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (category_id) REFERENCES Categories(id),
                FOREIGN KEY (admin_id) REFERENCES Users(id)
            )`,
            
            // Courses Table (YouTube + Affiliate)
            `CREATE TABLE Courses (
                id INT IDENTITY(1,1) PRIMARY KEY,
                title NVARCHAR(200) NOT NULL,
                description NVARCHAR(MAX) NOT NULL,
                instructor_name NVARCHAR(100),
                thumbnail_url NVARCHAR(500),
                course_type NVARCHAR(50) NOT NULL,
                course_url NVARCHAR(1000) NOT NULL,
                affiliate_site_name NVARCHAR(100),
                duration_minutes INT,
                difficulty_level NVARCHAR(20),
                category_id INT NOT NULL,
                rating_average DECIMAL(3,2) DEFAULT 0.0,
                review_count INT DEFAULT 0,
                views_count INT DEFAULT 0,
                admin_id INT NOT NULL,
                is_active BIT DEFAULT 1,
                created_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (category_id) REFERENCES Categories(id),
                FOREIGN KEY (admin_id) REFERENCES Users(id)
            )`,
            
            // Cart Table (Wishlist)
            `CREATE TABLE Cart (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                added_at DATETIME2 DEFAULT GETDATE(),
                UNIQUE(user_id, product_id),
                FOREIGN KEY (user_id) REFERENCES Users(id),
                FOREIGN KEY (product_id) REFERENCES Products(id)
            )`,
            
            // Reviews Table (Student Trust Building)
            `CREATE TABLE Reviews (
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NULL,
                course_id INT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text NVARCHAR(MAX),
                review_images NVARCHAR(MAX),
                is_verified_purchase BIT DEFAULT 0,
                helpfulness_score INT DEFAULT 0,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (user_id) REFERENCES Users(id),
                FOREIGN KEY (product_id) REFERENCES Products(id),
                FOREIGN KEY (course_id) REFERENCES Courses(id)
            )`,
            
            // Banners Table (NEW TABLE FOR HOMEPAGE BANNERS)
            `CREATE TABLE Banners (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL,
                media_url NVARCHAR(MAX) NOT NULL,
                link_url NVARCHAR(2048) NOT NULL,
                display_order INT NOT NULL DEFAULT 0,
                is_active BIT DEFAULT 1,
                admin_id INT NOT NULL,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2 DEFAULT GETDATE(),
                FOREIGN KEY (admin_id) REFERENCES Users(id)
            )`
        ];
        
        // Execute each table creation
        const results = [];
        for (let i = 0; i < createTablesSQL.length; i++) {
            try {
                await pool.request().query(createTablesSQL[i]);
                const tableName = createTablesSQL[i].match(/CREATE TABLE (\w+)/)[1];
                results.push(`✅ Table '${tableName}' created successfully`);
            } catch (error) {
                if (error.message.includes('already an object named')) {
                    const tableName = createTablesSQL[i].match(/CREATE TABLE (\w+)/)[1];
                    results.push(`⚠️ Table '${tableName}' already exists`);
                } else {
                    throw error;
                }
            }
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

// Create indexes for performance
router.post('/create-indexes', async (req, res) => {
    try {
        const pool = await getPool();
        
        const indexSQL = [
            `CREATE INDEX IX_Products_Category ON Products(category_id, is_active)`,
            `CREATE INDEX IX_Products_Rating ON Products(rating_average DESC, created_at DESC)`,
            `CREATE INDEX IX_Reviews_Product ON Reviews(product_id, created_at DESC)`,
            `CREATE INDEX IX_Reviews_Course ON Reviews(course_id, created_at DESC)`,
            `CREATE INDEX IX_Users_GoogleId ON Users(google_id)`,
            `CREATE INDEX IX_Cart_User ON Cart(user_id)`,
            `CREATE INDEX IX_Banners_Order ON Banners(display_order ASC, is_active DESC)`
        ];
        
        const results = [];
        for (const indexQuery of indexSQL) {
            try {
                await pool.request().query(indexQuery);
                const indexName = indexQuery.match(/CREATE INDEX (\w+)/)[1];
                results.push(`✅ Index '${indexName}' created successfully`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    const indexName = indexQuery.match(/CREATE INDEX (\w+)/)[1];
                    results.push(`⚠️ Index '${indexName}' already exists`);
                } else {
                    throw error;
                }
            }
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

// Insert seed data
router.post('/seed-data', async (req, res) => {
    try {
        const pool = await getPool();
        
        // Seed Categories
        const seedCategories = [
            "('📚 Textbooks', 'New and used textbooks for all subjects', NULL, 1, 1)",
            "('💻 Electronics', 'Laptops, tablets, and tech accessories', NULL, 2, 1)",
            "('✏️ Stationery', 'Notebooks, pens, and writing supplies', NULL, 3, 1)",
            "('🎒 Campus Gear', 'Backpacks, clothing, and dorm essentials', NULL, 4, 1)",
            "('📖 Online Courses', 'Skill development and certification courses', NULL, 5, 1)",
            "('🍕 Campus Life', 'Food, services, and campus essentials', NULL, 6, 1)"
        ];
        
        const results = [];
        
        // Insert categories
        for (const category of seedCategories) {
            try {
                await pool.request().query(`
                    INSERT INTO Categories (name, description, icon_url, sort_order, is_active)
                    VALUES ${category}
                `);
                results.push('✅ Category inserted');
            } catch (error) {
                if (!error.message.includes('duplicate key')) {
                    throw error;
                }
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

// Check tables exist
router.get('/check-tables', async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT TABLE_NAME, TABLE_TYPE 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        res.json({
            status: 'success',
            message: '📋 Database tables retrieved successfully',
            tables: result.recordset,
            count: result.recordset.length
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

// Get all users (for testing)
router.get('/users', async (req, res) => {
    try {
        const pool = await getPool();
        
        const result = await pool.request().query(`
            SELECT id, name, display_name, email, role, is_active, created_at
            FROM Users
            ORDER BY created_at DESC
        `);
        
        res.json({
            status: 'success',
            message: '👥 Users retrieved successfully',
            users: result.recordset,
            count: result.recordset.length
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




// i run this  SQL query manually in Azure SQL database to create the Wishlists table
// -- SQL to create Wishlists table (run this in your Azure SQL database)
// CREATE TABLE Wishlists (
//     id INT IDENTITY(1,1) PRIMARY KEY,
//     user_id INT NOT NULL,
//     product_id INT NOT NULL,
//     created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
//     FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
//     FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
//     UNIQUE(user_id, product_id) -- Prevent duplicate entries
// );

// -- Create index for better performance
// CREATE INDEX IX_Wishlists_UserId ON Wishlists(user_id);
// CREATE INDEX IX_Wishlists_ProductId ON Wishlists(product_id);
