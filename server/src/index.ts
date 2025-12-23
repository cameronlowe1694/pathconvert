import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import proxyRoutes from './routes/proxy.js';
import webhookRoutes from './routes/webhooks.js';

// Import job worker
import { startJobWorker } from './services/jobWorker.js';

// Import utilities
import prisma from './db.js';
import { sanitizeShop } from './utils/shopify.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS for embedded app
app.use(cors({
  origin: (origin, callback) => {
    // Allow Shopify admin and your app
    const allowedOrigins = [
      /\.myshopify\.com$/,
      /\.shopify\.com$/,
      process.env.APP_URL
    ];

    if (!origin || allowedOrigins.some(pattern =>
      typeof pattern === 'string' ? pattern === origin : pattern instanceof RegExp && pattern.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/apps/pathconvert', proxyRoutes);
app.use('/webhooks', webhookRoutes);

// Handle root URL - check OAuth before serving app
app.get('/', async (req, res) => {
  const shopParam = req.query.shop as string | undefined;

  // If no shop parameter, serve the app (already embedded, has session)
  if (!shopParam) {
    return res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  }

  const shop = sanitizeShop(shopParam);
  if (!shop) {
    return res.status(400).send('Invalid shop parameter');
  }

  console.log('[Root] App accessed with shop parameter:', shop);

  // Check if shop has valid OAuth token
  const shopRecord = await prisma.shop.findUnique({
    where: { shopDomain: shop },
    select: { accessToken: true },
  });

  const hasValidToken = shopRecord && shopRecord.accessToken && shopRecord.accessToken.length > 0;

  if (!hasValidToken) {
    console.log('[Root] No valid token found, redirecting to OAuth');
    // Redirect to OAuth flow to get fresh token
    return res.redirect(`/auth?shop=${shop}`);
  }

  console.log('[Root] Valid token found, serving app');
  // Token exists, serve the embedded app
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Serve static files from client build
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 PathConvert server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 App URL: ${process.env.APP_URL}`);

  // Start background job worker
  startJobWorker().catch((error) => {
    console.error('Job worker crashed:', error);
  });
});
