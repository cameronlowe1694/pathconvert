import shopify from '../config/shopify.js';
import pool from '../database/db.js';

export async function verifyRequest(req, res, next) {
  try {
    const session = await shopify.session.getCurrentSession(req, res);

    if (!session) {
      return res.redirect(`/api/auth?shop=${req.query.shop}`);
    }

    // Verify session is still valid
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM shop_settings WHERE shop_domain = $1',
        [session.shop]
      );

      if (result.rows.length === 0) {
        return res.redirect(`/api/auth?shop=${req.query.shop}`);
      }

      req.shopSession = session;
      req.shopDomain = session.shop;
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function validateShopDomain(req, res, next) {
  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }

  // Basic validation for Shopify domain format
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  if (!shopRegex.test(shop)) {
    return res.status(400).json({ error: 'Invalid shop domain' });
  }

  req.shop = shop;
  next();
}
