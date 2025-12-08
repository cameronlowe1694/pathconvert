import express from 'express';
import pool from '../database/db.js';
import SitemapParser from '../services/sitemap-parser.js';
import SimilarityEngine from '../services/similarity-engine.js';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Global state for progress tracking (simple in-memory store)
const analysisProgress = {};

// Start analysis
router.post('/simple/analyze', async (req, res) => {
  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).json({ success: false, error: 'Missing shop parameter' });
  }

  // Initialize progress
  analysisProgress[shop] = {
    progress: 0,
    status: 'Starting analysis...',
    complete: false,
    error: null,
    collections: 0
  };

  // Run analysis in background
  runAnalysis(shop).catch(error => {
    console.error('Analysis error:', error);
    analysisProgress[shop].error = error.message;
  });

  res.json({ success: true });
});

// Get progress
router.get('/simple/progress', async (req, res) => {
  const shop = req.query.shop;
  const progress = analysisProgress[shop] || {
    progress: 0,
    status: 'Not started',
    complete: false,
    error: null,
    collections: 0
  };

  res.json(progress);
});

async function runAnalysis(shop) {
  try {
    // Step 1: Get access token from database
    analysisProgress[shop].progress = 5;
    analysisProgress[shop].status = 'Fetching shop credentials...';

    let accessToken;
    const dbClient = await pool.connect();

    try {
      const result = await dbClient.query(
        'SELECT access_token FROM shop_settings WHERE shop_domain = $1',
        [shop]
      );

      if (result.rows.length === 0) {
        throw new Error('Shop not found in database. Please install the app first.');
      }

      accessToken = result.rows[0].access_token;
    } finally {
      dbClient.release();
    }

    // Step 2: Fetch collections from Shopify Admin API (10-20%)
    analysisProgress[shop].progress = 10;
    analysisProgress[shop].status = 'Fetching collections from Shopify...';

    const collectionsResponse = await axios.get(
      `https://${shop}/admin/api/2024-01/custom_collections.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const shopifyCollections = collectionsResponse.data.custom_collections || [];

    analysisProgress[shop].progress = 20;
    analysisProgress[shop].status = `Found ${shopifyCollections.length} collections. Analyzing...`;

    // Step 3: Analyze each collection (20-70%)
    const collections = [];
    const progressPerCollection = shopifyCollections.length > 0 ? 50 / shopifyCollections.length : 0;

    for (let i = 0; i < shopifyCollections.length; i++) {
      const collection = shopifyCollections[i];

      analysisProgress[shop].progress = 20 + (i * progressPerCollection);
      analysisProgress[shop].status = `Analyzing ${collection.handle}... (${i + 1}/${shopifyCollections.length})`;

      // Use API data directly - much more reliable than scraping
      const title = collection.title || '';
      const handle = collection.handle || '';
      const bodyHtml = collection.body_html || '';

      // Strip HTML tags from body
      const $ = cheerio.load(bodyHtml);
      const description = $.text().trim();

      // Create content for embedding
      const content = `${handle} ${title} ${description}`.toLowerCase();

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content
      });

      const embedding = embeddingResponse.data[0].embedding;

      collections.push({
        handle,
        url: `https://${shop}/collections/${handle}`,
        h1: title,
        title: title,
        metaDesc: description.substring(0, 160),
        embedding
      });
    }

    analysisProgress[shop].progress = 70;
    analysisProgress[shop].status = 'Storing collections in database...';

    // Step 3: Store collections in database
    const client = await pool.connect();
    try {
      // Clear old data
      await client.query('DELETE FROM collections WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM collection_recommendations WHERE shop_domain = $1', [shop]);

      // Store collections
      for (const col of collections) {
        console.log(`Inserting collection: ${col.handle}`);
        await client.query(
          `INSERT INTO collections (shop_domain, collection_id, handle, title, h1_tag, description, url, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [shop, col.handle, col.handle, col.title, col.h1, col.metaDesc, col.url, JSON.stringify(col.embedding)]
        );
        console.log(`✓ Inserted ${col.handle} with embedding length ${col.embedding.length}`);
      }

      analysisProgress[shop].progress = 75;
      analysisProgress[shop].status = 'Calculating similarities...';

      // Step 4: Calculate similarities using vector embeddings with adaptive threshold
      const similarityEngine = new SimilarityEngine(shop);
      console.log('Starting similarity calculation with adaptive threshold...');
      const simResult = await similarityEngine.calculateAllSimilarities(3, null); // null = use adaptive threshold
      console.log('Similarity calculation result:', simResult);

      analysisProgress[shop].progress = 85;
      analysisProgress[shop].status = 'Installing buttons on your store...';

      // Step 5: Install script tag (optional - may fail on dev stores)
      try {
        await installScriptTag(shop);
        analysisProgress[shop].scriptTagInstalled = true;
      } catch (error) {
        console.warn('Script tag installation failed (this is normal for dev stores):', error.message);
        analysisProgress[shop].scriptTagInstalled = false;
        analysisProgress[shop].scriptTagError = error.message;
      }

      analysisProgress[shop].progress = 100;
      analysisProgress[shop].status = 'Complete!';
      analysisProgress[shop].complete = true;
      analysisProgress[shop].collections = collections.length;
      analysisProgress[shop].message = `Successfully analyzed ${collections.length} collections!`;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Analysis failed:', error);
    analysisProgress[shop].error = error.message;
    analysisProgress[shop].status = 'Failed';
  }
}

async function installScriptTag(shop) {
  // Get access token
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT access_token FROM shop_settings WHERE shop_domain = $1',
      [shop]
    );

    if (result.rows.length === 0) {
      throw new Error('Shop not found in database');
    }

    const accessToken = result.rows[0].access_token;

    // Install script tag via Shopify API
    await axios.post(
      `https://${shop}/admin/api/2024-01/script_tags.json`,
      {
        script_tag: {
          event: 'onload',
          src: `${process.env.APP_URL}/storefront/recommendations.js`
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
  } finally {
    client.release();
  }
}

// Debug endpoint to check database contents
router.get('/simple/debug', async (req, res) => {
  const shop = req.query.shop;
  const client = await pool.connect();

  try {
    const collections = await client.query(
      'SELECT handle, title FROM collections WHERE shop_domain = $1',
      [shop]
    );

    const recommendations = await client.query(
      'SELECT source_collection_id, target_collection_id, similarity_score FROM collection_recommendations WHERE shop_domain = $1 LIMIT 10',
      [shop]
    );

    res.json({
      collections: collections.rows,
      recommendations: recommendations.rows,
      count: {
        collections: collections.rows.length,
        recommendations: recommendations.rowCount
      }
    });
  } finally {
    client.release();
  }
});

// Settings endpoint to get shop configuration
router.get('/simple/settings', async (req, res) => {
  const shop = req.query.shop;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT calculated_threshold, max_recommendations FROM shop_settings WHERE shop_domain = $1',
      [shop]
    );

    if (result.rows.length === 0) {
      return res.json({
        calculated_threshold: 0.50,
        max_recommendations: 3
      });
    }

    res.json(result.rows[0]);
  } finally {
    client.release();
  }
});

export default router;
