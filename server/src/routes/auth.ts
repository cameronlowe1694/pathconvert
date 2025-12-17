import { Router } from 'express';
import { Shopify } from '@shopify/shopify-api';
import { shopify, sanitizeShop, OAUTH_CALLBACK_PATH, OAUTH_SCOPES } from '../utils/shopify.js';
import { createSessionToken } from '../utils/jwt.js';
import prisma from '../db.js';

const router = Router();

// GET /auth - Start OAuth flow
router.get('/', async (req, res) => {
  const { shop: shopParam } = req.query;

  if (!shopParam || typeof shopParam !== 'string') {
    return res.status(400).send('Missing shop parameter');
  }

  const shop = sanitizeShop(shopParam);
  if (!shop) {
    return res.status(400).send('Invalid shop domain');
  }

  try {
    // Generate OAuth authorization URL
    // Note: shopify.auth.begin() will send the redirect response when rawResponse is provided
    await shopify.auth.begin({
      shop,
      callbackPath: OAUTH_CALLBACK_PATH,
      isOnline: false, // Offline access for background jobs
      rawRequest: req,
      rawResponse: res,
    });
    // No need to call res.redirect() - it's already handled above
  } catch (error) {
    console.error('OAuth begin error:', error);
    if (!res.headersSent) {
      res.status(500).send('Failed to start OAuth flow');
    }
  }
});

// GET /auth/callback - OAuth callback
router.get('/callback', async (req, res) => {
  try {
    // Complete OAuth and get access token
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callbackResponse;
    const { shop, accessToken, scope } = session;

    // Create or update shop in database
    await prisma.shop.upsert({
      where: { shopDomain: shop },
      create: {
        shopDomain: shop,
        accessToken: accessToken!,
      },
      update: {
        accessToken: accessToken!,
      },
    });

    // Create default settings if they don't exist
    const existingShop = await prisma.shop.findUnique({
      where: { shopDomain: shop },
      include: { settings: true },
    });

    if (existingShop && !existingShop.settings) {
      await prisma.settings.create({
        data: { shopId: existingShop.id },
      });
    }

    // Create JWT session token
    const sessionToken = createSessionToken({
      shop,
      accessToken: accessToken!,
      scope: scope!,
    });

    // Set cookie
    res.cookie('shopify_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Required for embedded apps
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to app
    res.redirect(`/?shop=${shop}&host=${req.query.host || ''}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('OAuth failed');
  }
});

export default router;
