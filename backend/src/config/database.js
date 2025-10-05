const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,
});

// Connection event handlers
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL Database (Neon)');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
  process.exit(-1);
});

// Test connection function
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('🧪 Database test query successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('🚨 Database test failed:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  testConnection
};
