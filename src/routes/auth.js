import express from 'express';
import shopify from '../config/shopify.js';
import pool from '../database/db.js';
import { validateShopDomain } from '../middleware/auth.js';

const router = express.Router();

// Start OAuth flow
router.get('/auth', validateShopDomain, async (req, res) => {
  try {
    const { shop } = req;

    await shopify.auth.begin({
      shop: shopify.utils.sanitizeShop(shop, true),
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error) {
    console.error('Auth start error:', error);
    res.status(500).json({ error: 'Failed to start authentication' });
  }
});

// OAuth callback
router.get('/auth/callback', async (req, res) => {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callback;
    const { shop, accessToken } = session;

    // Store shop settings and access token
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO shop_settings (shop_domain, access_token, installed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (shop_domain)
         DO UPDATE SET access_token = $2, updated_at = NOW()`,
        [shop, accessToken]
      );

      // Register webhooks
      await registerWebhooks(shop, accessToken);

      // Trigger initial collection analysis
      await client.query(
        `INSERT INTO job_queue (shop_domain, job_type, status, payload)
         VALUES ($1, 'initial_analysis', 'pending', '{}')`,
        [shop]
      );
    } finally {
      client.release();
    }

    // Redirect to app
    const redirectUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

async function registerWebhooks(shop, accessToken) {
  const client = new shopify.clients.Rest({
    session: { shop, accessToken },
  });

  const webhooks = [
    {
      topic: 'collections/create',
      address: `${process.env.APP_URL}/api/webhooks/collections/create`,
    },
    {
      topic: 'collections/update',
      address: `${process.env.APP_URL}/api/webhooks/collections/update`,
    },
    {
      topic: 'collections/delete',
      address: `${process.env.APP_URL}/api/webhooks/collections/delete`,
    },
    {
      topic: 'app/uninstalled',
      address: `${process.env.APP_URL}/api/webhooks/app/uninstalled`,
    },
  ];

  for (const webhook of webhooks) {
    try {
      await client.post({
        path: 'webhooks',
        data: {
          webhook: {
            topic: webhook.topic,
            address: webhook.address,
            format: 'json',
          },
        },
      });
    } catch (error) {
      console.error(`Failed to register webhook ${webhook.topic}:`, error.message);
    }
  }
}

export default router;
