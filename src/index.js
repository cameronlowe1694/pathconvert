import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhooks.js';
import apiRoutes from './routes/api.js';
import simpleRoutes from './routes/simple.js';
import CollectionAnalyzer from './jobs/analyze-collections.js';
import pool from './database/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware - configure for Shopify embedded app
// IMPORTANT: Disable X-Frame-Options to allow Shopify iframe embedding
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  next();
});

app.use(helmet({
  contentSecurityPolicy: false, // Allow embedded app
  frameguard: false, // Allow iframe embedding in Shopify admin
  crossOriginResourcePolicy: false, // Allow cross-origin script loading
}));

// Compression
app.use(compression());

// CORS for Shopify embedded app
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from Shopify domains and our own domain
    const allowedOrigins = [
      /\.myshopify\.com$/,
      /admin\.shopify\.com$/,
      /pathconvert\.onrender\.com$/
    ];

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    callback(null, isAllowed);
  },
  credentials: true,
}));

// Body parsing - JSON only for regular routes
app.use('/api', express.json());

// Serve static files with CORS headers for storefront scripts
app.use('/storefront', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  next();
}, express.static(path.join(__dirname, '../public/storefront')));

app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', authRoutes);
app.use('/api', webhookRoutes);
app.use('/api', apiRoutes);
app.use('/api', simpleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve React app for /app/* routes
app.get('/app*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/app/index.html'));
});

// Serve simple admin dashboard (legacy)
app.get('/', (req, res) => {
  // Check if user wants the new UI
  const useNewUI = req.query.ui === 'new';

  if (useNewUI) {
    res.sendFile(path.join(__dirname, '../public/app/index.html'));
  } else {
    res.sendFile(path.join(__dirname, '../public/admin/simple.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Scheduled job: Weekly collection re-analysis
const schedule = process.env.ANALYSIS_SCHEDULE || '0 2 * * 0'; // Every Sunday at 2 AM

try {
  cron.schedule(schedule, async () => {
    console.log('Running scheduled collection analysis...');

    try {
      const client = await pool.connect();
      try {
        // Get all active shops
        const result = await client.query(
          'SELECT shop_domain FROM shop_settings WHERE is_active = true'
        );

        for (const row of result.rows) {
          console.log(`Analyzing shop: ${row.shop_domain}`);

          try {
            const analyzer = new CollectionAnalyzer(row.shop_domain);
            await analyzer.analyze();
          } catch (error) {
            console.error(`Failed to analyze ${row.shop_domain}:`, error.message);
          }
        }
      } finally {
        client.release();
      }

      console.log('Scheduled analysis completed');
    } catch (error) {
      console.error('Scheduled analysis error:', error);
    }
  });
  console.log(`Cron job scheduled: ${schedule}`);
} catch (error) {
  console.error('Failed to schedule cron job:', error.message);
  console.log('Server will continue without scheduled analysis');
}

// Run database migrations on startup
(async () => {
  try {
    console.log('Running database migrations...');
    const client = await pool.connect();
    try {
      // Add calculated_threshold column if it doesn't exist
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='shop_settings' AND column_name='calculated_threshold'
          ) THEN
            ALTER TABLE shop_settings ADD COLUMN calculated_threshold DECIMAL(3,2) DEFAULT 0.50;
            RAISE NOTICE 'Added calculated_threshold column';
          END IF;
        END $$;
      `);
      console.log('✓ Database migrations completed');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('⚠ Database migration warning:', error.message);
    console.log('Server will continue - migrations may have already run');
  }
})();

// Start server
app.listen(PORT, () => {
  console.log(`PathConvert server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Scheduled analysis: ${schedule}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  // Don't exit the process - just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // For uncaught exceptions, we should exit after logging
  console.error('Server will restart...');
  process.exit(1);
});

export default app;
