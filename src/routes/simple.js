import express from 'express';
import pool from '../database/db.js';
import SitemapParser from '../services/sitemap-parser.js';
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
    // Step 1: Discover collections (10%)
    analysisProgress[shop].progress = 10;
    analysisProgress[shop].status = 'Discovering collections from sitemap...';

    const parser = new SitemapParser(shop);
    const collectionUrls = await parser.discoverCollections();

    analysisProgress[shop].progress = 20;
    analysisProgress[shop].status = `Found ${collectionUrls.length} collections. Fetching content...`;

    // Step 2: Fetch and analyze each collection (20-70%)
    const collections = [];
    const progressPerCollection = 50 / collectionUrls.length;

    for (let i = 0; i < collectionUrls.length; i++) {
      const { url } = collectionUrls[i];
      const handle = url.split('/collections/')[1];

      analysisProgress[shop].progress = 20 + (i * progressPerCollection);
      analysisProgress[shop].status = `Analyzing ${handle}... (${i + 1}/${collectionUrls.length})`;

      // Fetch collection page
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'PathConvert/1.0' },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const h1 = $('h1').first().text().trim();
      const title = $('title').text().trim();
      const metaDesc = $('meta[name="description"]').attr('content') || '';

      // Create content for embedding
      const content = `${handle} ${h1} ${title} ${metaDesc}`.toLowerCase();

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content
      });

      const embedding = embeddingResponse.data[0].embedding;

      collections.push({
        handle,
        url,
        h1,
        title,
        metaDesc,
        embedding
      });
    }

    analysisProgress[shop].progress = 70;
    analysisProgress[shop].status = 'Calculating similarities...';

    // Step 3: Calculate similarities and store recommendations
    const client = await pool.connect();
    try {
      // Clear old data
      await client.query('DELETE FROM collections WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM collection_recommendations WHERE shop_domain = $1', [shop]);

      // Store collections
      for (const col of collections) {
        await client.query(
          `INSERT INTO collections (shop_domain, collection_id, handle, title, h1_tag, meta_description, url, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [shop, col.handle, col.handle, col.title, col.h1, col.metaDesc, col.url, JSON.stringify(col.embedding)]
        );
      }

      analysisProgress[shop].progress = 85;
      analysisProgress[shop].status = 'Installing buttons on your store...';

      // Step 4: Install script tag
      await installScriptTag(shop);

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

export default router;
