const mysql2 = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql2.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    // eslint-disable-next-line no-console
    console.log('MySQL connection established');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MySQL connection failed:', err.message);
  }
}

module.exports = { pool, testConnection };
