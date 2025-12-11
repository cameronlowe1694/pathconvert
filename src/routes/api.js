import express from 'express';
import pool from '../database/db.js';
import SimilarityEngine from '../services/similarity-engine.js';
import CollectionAnalyzer from '../jobs/analyze-collections.js';
import { verifyRequest } from '../middleware/auth.js';

const router = express.Router();

// Get related collections for storefront (public endpoint)
router.get('/collections/:handle/related', async (req, res) => {
  try {
    const { handle } = req.params;
    const shop = req.query.shop;

    if (!shop) {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }

    const engine = new SimilarityEngine(shop);
    const related = await engine.getRelatedCollections(handle);

    res.json({
      success: true,
      related,
    });
  } catch (error) {
    console.error('Error fetching related collections:', error);
    res.status(500).json({ error: 'Failed to fetch related collections' });
  }
});

// Track button click (analytics)
router.post('/analytics/click', express.json(), async (req, res) => {
  try {
    const { shop, source, target, sessionId, userAgent } = req.body;

    if (!shop || !source || !target) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO collection_link_analytics (shop_domain, source_collection_id, target_collection_id, session_id, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [shop, source, target, sessionId || null, userAgent || null]
      );
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking click:', error);
    // Don't fail - just log the error so buttons still work
    res.json({ success: true });
  }
});

// Get total button clicks for dashboard
router.get('/analytics/total-clicks', async (req, res) => {
  try {
    const shop = req.query.shop;

    if (!shop) {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(*) as total FROM collection_link_analytics WHERE shop_domain = $1',
        [shop]
      );

      res.json({
        success: true,
        totalClicks: parseInt(result.rows[0].total)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching total clicks:', error);
    res.status(500).json({ error: 'Failed to fetch click count' });
  }
});

// Admin endpoints (protected)

// Get all collections for shop
router.get('/admin/collections', async (req, res) => {
  try {
    const shopDomain = req.query.shop;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT collection_id, handle, title, description, url, analyzed_at
         FROM collections
         WHERE shop_domain = $1
         ORDER BY title ASC`,
        [shopDomain]
      );

      res.json({
        success: true,
        collections: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Get collection with related collections
router.get('/admin/collections/:id', async (req, res) => {
  try {
    const shopDomain = req.query.shop;
    const { id } = req.params;

    const client = await pool.connect();
    try {
      // Get collection
      const collectionResult = await client.query(
        'SELECT * FROM collections WHERE shop_domain = $1 AND collection_id = $2',
        [shopDomain, id]
      );

      if (collectionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Get related collections
      const relatedResult = await client.query(
        `SELECT c.collection_id, c.handle, c.title, c.url, rc.similarity_score, rc.position
         FROM related_collections rc
         JOIN collections c ON c.collection_id = rc.related_collection_id AND c.shop_domain = rc.shop_domain
         WHERE rc.shop_domain = $1 AND rc.source_collection_id = $2
         ORDER BY rc.position ASC`,
        [shopDomain, id]
      );

      res.json({
        success: true,
        collection: collectionResult.rows[0],
        related: relatedResult.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// Get shop settings
router.get('/admin/settings', async (req, res) => {
  try {
    const shopDomain = req.query.shop;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM shop_settings WHERE shop_domain = $1',
        [shopDomain]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      // Don't expose access_token
      const settings = { ...result.rows[0] };
      delete settings.access_token;

      res.json({
        success: true,
        settings,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update shop settings
router.put('/admin/settings', express.json(), async (req, res) => {
  try {
    const shopDomain = req.query.shop;
    const { is_active, max_recommendations, min_similarity_threshold, button_style } = req.body;

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE shop_settings
         SET is_active = COALESCE($2, is_active),
             max_recommendations = COALESCE($3, max_recommendations),
             min_similarity_threshold = COALESCE($4, min_similarity_threshold),
             button_style = COALESCE($5, button_style),
             updated_at = NOW()
         WHERE shop_domain = $1`,
        [shopDomain, is_active, max_recommendations, min_similarity_threshold, button_style ? JSON.stringify(button_style) : null]
      );

      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Trigger collection analysis
router.post('/admin/analyze', express.json(), async (req, res) => {
  try {
    const shopDomain = req.query.shop;

    // Queue analysis job
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO job_queue (shop_domain, job_type, status, payload)
         VALUES ($1, 'full_analysis', 'pending', '{}')`,
        [shopDomain]
      );
    } finally {
      client.release();
    }

    // Optionally run analysis immediately (for demo purposes)
    if (req.body.immediate) {
      const analyzer = new CollectionAnalyzer(shopDomain);
      const result = await analyzer.analyze();

      return res.json({
        success: true,
        result,
      });
    }

    res.json({
      success: true,
      message: 'Analysis queued',
    });
  } catch (error) {
    console.error('Error triggering analysis:', error);
    res.status(500).json({ error: 'Failed to trigger analysis' });
  }
});

// Get analysis progress
router.get('/admin/progress', async (req, res) => {
  try {
    const shopDomain = req.query.shop;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT analysis_progress FROM shop_settings WHERE shop_domain = $1',
        [shopDomain]
      );

      const progress = result.rows.length > 0 ? result.rows[0].analysis_progress || 0 : 0;

      // Determine status based on progress
      let status = 'idle';
      if (progress > 0 && progress < 100) {
        status = 'running';
      } else if (progress === 100) {
        status = 'complete';
      }

      res.json({
        success: true,
        progress,
        status,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get analytics data
router.get('/admin/analytics', async (req, res) => {
  try {
    const shopDomain = req.query.shop;

    const client = await pool.connect();
    try {
      // Get click counts by collection
      const clicksResult = await client.query(
        `SELECT
           source_collection_handle,
           target_collection_handle,
           COUNT(*) as clicks
         FROM button_clicks
         WHERE shop_domain = $1
         GROUP BY source_collection_handle, target_collection_handle
         ORDER BY clicks DESC
         LIMIT 50`,
        [shopDomain]
      );

      res.json({
        success: true,
        clicks: clicksResult.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
