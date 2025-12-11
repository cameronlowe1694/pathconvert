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
    // Check if this is a valid OAuth callback
    if (!req.query.code && !req.query.hmac) {
      console.log('Invalid OAuth callback - missing parameters');
      return res.redirect('/');
    }

    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callback;
    const { shop, accessToken } = session;

    // Check if this is a reinstall or new install
    const client = await pool.connect();
    let isNewInstall = false;

    try {
      // Check if shop exists
      const existingShop = await client.query(
        'SELECT shop_domain FROM shop_settings WHERE shop_domain = $1',
        [shop]
      );

      isNewInstall = existingShop.rows.length === 0;

      // If reinstall, clear old data
      if (!isNewInstall) {
        console.log(`Reinstall detected for ${shop} - clearing old data`);
        await client.query('DELETE FROM collection_recommendations WHERE shop_domain = $1', [shop]);
        await client.query('DELETE FROM collections WHERE shop_domain = $1', [shop]);
        await client.query('DELETE FROM collection_link_analytics WHERE shop_domain = $1', [shop]);
        await client.query('DELETE FROM job_queue WHERE shop_domain = $1', [shop]);
      }

      // Store/update shop settings
      await client.query(
        `INSERT INTO shop_settings (shop_domain, access_token, installed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (shop_domain)
         DO UPDATE SET access_token = $2, updated_at = NOW(), installed_at = NOW()`,
        [shop, accessToken]
      );

      // Register webhooks
      await registerWebhooks(shop, accessToken);

      // Install script tag for storefront
      await installScriptTag(shop, accessToken);

      // Trigger initial collection analysis
      await client.query(
        `INSERT INTO job_queue (shop_domain, job_type, status, payload)
         VALUES ($1, 'initial_analysis', 'pending', '{}')`,
        [shop]
      );
    } finally {
      client.release();
    }

    // Redirect to embedded app
    // For new installs, add a query param to show onboarding
    const queryParam = isNewInstall ? '&onboarding=true' : '';
    const redirectUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}?shop=${shop}${queryParam}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

async function installScriptTag(shop, accessToken) {
  const client = new shopify.clients.Rest({
    session: { shop, accessToken },
  });

  try {
    const scriptSrc = `${process.env.APP_URL}/storefront/storefront-script.js`;

    // Check if script tag already exists
    const existingScripts = await client.get({
      path: 'script_tags',
    });

    const exists = existingScripts.body.script_tags?.some(
      (tag) => tag.src === scriptSrc
    );

    if (exists) {
      console.log(`✓ Script tag already installed for ${shop}`);
      return;
    }

    // Create new script tag
    await client.post({
      path: 'script_tags',
      data: {
        script_tag: {
          event: 'onload',
          src: scriptSrc,
          display_scope: 'all',
        },
      },
    });

    console.log(`✓ Script tag installed successfully for ${shop}`);
  } catch (error) {
    console.error(`Failed to install script tag for ${shop}:`, error.message);
    // Don't throw - allow app installation to continue even if script tag fails
  }
}

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
