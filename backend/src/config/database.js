const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 60000,
        requestTimeout: 60000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise;

const getPool = () => {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then(pool => {
                console.log('✅ Connected to Azure SQL Database');
                console.log(`📊 Database: ${config.database}`);
                console.log(`🌐 Server: ${config.server}`);
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed:');
                console.error('Error:', err.message);
                console.error('Server:', config.server);
                console.error('Database:', config.database);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
};

// Test connection function
const testConnection = async () => {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT 1 as test');
        console.log('🧪 Database test query successful:', result.recordset[0]);
        return true;
    } catch (error) {
        console.error('🚨 Database test failed:', error.message);
        return false;
    }
};

module.exports = {
    sql,
    getPool,
    testConnection
};
