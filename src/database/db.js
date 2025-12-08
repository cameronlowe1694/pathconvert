import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s for Render cold starts
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Test database connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✓ Database connection successful');
  })
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    console.error('Please check DATABASE_URL environment variable');
  });

export default pool;
