import { Router, raw } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';

const router = Router();

/**
 * Verify Shopify webhook signature
 */
function verifyWebhook(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET!;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

/**
 * Webhook: APP_UNINSTALLED
 * Clean up shop data when app is uninstalled
 */
router.post('/app-uninstalled', raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const body = req.body.toString('utf8');

    if (!hmac || !verifyWebhook(body, hmac)) {
      console.error('[Webhook] Invalid HMAC signature');
      return res.status(401).send('Unauthorized');
    }

    const data = JSON.parse(body);
    const shopDomain = data.domain;

    console.log('[Webhook] App uninstalled for shop:', shopDomain);

    // Clear the access token (makes it invalid immediately)
    // Keep the shop record so we can detect reinstalls
    await prisma.shop.updateMany({
      where: { shopDomain },
      data: { accessToken: '' }
    });

    console.log('[Webhook] Cleared access token for shop:', shopDomain);

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook] Error processing app-uninstalled:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
