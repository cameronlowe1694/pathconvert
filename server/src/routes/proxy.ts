import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { getRecommendations } from '../services/similarity.js';
import { getEntitlement } from '../services/entitlement.js';

const router = Router();

/**
 * Verify HMAC signature from Shopify App Proxy
 */
function verifyHMAC(query: any): boolean {
  const { signature, ...params } = query;

  if (!signature) return false;

  // Build query string (sorted by key)
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('');

  // Calculate HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(sortedParams)
    .digest('hex');

  return hash === signature;
}

/**
 * GET /apps/pathconvert/buttons - Render collection recommendation buttons
 */
router.get('/buttons', async (req, res) => {
  try {
    // Verify HMAC
    if (!verifyHMAC(req.query)) {
      console.error('Invalid HMAC signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const { shop, path_prefix } = req.query;

    if (!shop || typeof shop !== 'string') {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }

    // Extract collection handle from path_prefix
    // path_prefix format: /collections/mens-clothing
    const handle = typeof path_prefix === 'string'
      ? path_prefix.replace('/collections/', '')
      : '';

    if (!handle) {
      // Not on a collection page
      return res.json({ buttons: [] });
    }

    // Get shop from database
    const shopRecord = await prisma.shop.findUnique({
      where: { shopDomain: shop },
      select: {
        id: true,
        cacheVersion: true,
        settings: true,
      },
    });

    if (!shopRecord) {
      return res.json({ buttons: [] });
    }

    // Check entitlement
    const entitlement = await getEntitlement(shopRecord.id);
    if (!entitlement.canRenderButtons) {
      return res.json({
        buttons: [],
        message: 'Subscription required',
      });
    }

    // Get recommendations
    const recommendations = await getRecommendations(shopRecord.id, handle);

    // Format buttons
    const buttons = recommendations.map((rec) => ({
      title: rec.title,
      url: rec.url,
      score: rec.score,
      rank: rec.rank,
    }));

    res.json({
      buttons,
      cacheVersion: shopRecord.cacheVersion,
      buttonStyle: shopRecord.settings?.buttonStyle || 'pill',
    });
  } catch (error) {
    console.error('App proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
