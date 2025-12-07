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
}));

// Compression
app.use(compression());

// CORS for Shopify embedded app
app.use(cors({
  origin: /\.myshopify\.com$/,
  credentials: true,
}));

// Body parsing - JSON only for regular routes
app.use('/api', express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', authRoutes);
app.use('/api', webhookRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve admin dashboard
app.get('/', (req, res) => {
  // If shop parameter is missing and this is not an embedded request, show instructions
  if (!req.query.shop && !req.query.host) {
    res.sendFile(path.join(__dirname, '../public/admin/index.html'));
  } else {
    // Embedded app - serve with shop parameter
    res.sendFile(path.join(__dirname, '../public/admin/index.html'));
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

export default app;
