import express from 'express';
import pool from '../database/db.js';
import shopify from '../config/shopify.js';

const router = express.Router();

// Middleware to verify webhook
async function verifyWebhook(req, res, next) {
  try {
    const isValid = await shopify.webhooks.validate({
      rawBody: req.body,
      rawRequest: req,
      rawResponse: res,
    });

    if (!isValid) {
      return res.status(401).send('Webhook verification failed');
    }

    next();
  } catch (error) {
    console.error('Webhook verification error:', error);
    res.status(500).send('Webhook verification error');
  }
}

// Collection created webhook
router.post('/webhooks/collections/create', express.raw({ type: 'application/json' }), verifyWebhook, async (req, res) => {
  try {
    const shop = req.get('X-Shopify-Shop-Domain');
    const webhookData = JSON.parse(req.body.toString());

    console.log(`Collection created webhook for ${shop}: ${webhookData.id}`);

    // Queue analysis job for this collection
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO job_queue (shop_domain, job_type, status, payload)
         VALUES ($1, 'analyze_single_collection', 'pending', $2)`,
        [shop, JSON.stringify({ collection_id: webhookData.id })]
      );
    } finally {
      client.release();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Collection create webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Collection updated webhook
router.post('/webhooks/collections/update', express.raw({ type: 'application/json' }), verifyWebhook, async (req, res) => {
  try {
    const shop = req.get('X-Shopify-Shop-Domain');
    const webhookData = JSON.parse(req.body.toString());

    console.log(`Collection updated webhook for ${shop}: ${webhookData.id}`);

    // Queue re-analysis job
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO job_queue (shop_domain, job_type, status, payload)
         VALUES ($1, 'analyze_single_collection', 'pending', $2)`,
        [shop, JSON.stringify({ collection_id: webhookData.id })]
      );
    } finally {
      client.release();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Collection update webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Collection deleted webhook
router.post('/webhooks/collections/delete', express.raw({ type: 'application/json' }), verifyWebhook, async (req, res) => {
  try {
    const shop = req.get('X-Shopify-Shop-Domain');
    const webhookData = JSON.parse(req.body.toString());

    console.log(`Collection deleted webhook for ${shop}: ${webhookData.id}`);

    // Remove collection from database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete related collections
      await client.query(
        `DELETE FROM related_collections
         WHERE shop_domain = $1 AND (source_collection_id = $2 OR related_collection_id = $2)`,
        [shop, webhookData.id.toString()]
      );

      // Delete collection
      await client.query(
        'DELETE FROM collections WHERE shop_domain = $1 AND collection_id = $2',
        [shop, webhookData.id.toString()]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Collection delete webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// App uninstalled webhook
router.post('/webhooks/app/uninstalled', express.raw({ type: 'application/json' }), verifyWebhook, async (req, res) => {
  try {
    const shop = req.get('X-Shopify-Shop-Domain');

    console.log(`App uninstalled webhook for ${shop}`);

    // Clean up ALL shop data including recommendations and embeddings
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all tables in correct order (respecting foreign keys)
      await client.query('DELETE FROM recommendations WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM collection_embeddings WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM related_collections WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM collections WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM button_clicks WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM job_queue WHERE shop_domain = $1', [shop]);
      await client.query('DELETE FROM shop_settings WHERE shop_domain = $1', [shop]);

      await client.query('COMMIT');

      console.log(`✓ Cleaned up all data for ${shop}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('App uninstall webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

export default router;
