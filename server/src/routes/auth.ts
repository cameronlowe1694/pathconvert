import { Router } from 'express';
import { sanitizeShop, OAUTH_SCOPES } from '../utils/shopify.js';
import { createSessionToken } from '../utils/jwt.js';
import { oauthStateManager } from '../utils/sessionStorage.js';
import prisma from '../db.js';

const router = Router();

// GET /auth - Start OAuth flow (manual implementation, no cookies)
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
    // Always allow re-authorization (even if shop exists) to support reinstallation with fresh tokens
    // This is critical for development stores where tokens can become invalid after uninstall
    console.log('[Auth] Starting OAuth flow for shop:', shop);

    // Generate OAuth state and store in database
    const state = await oauthStateManager.create(shop);

    // Build OAuth URL manually
    const redirectUri = `${process.env.APP_URL}/auth/callback`;
    const scopes = OAUTH_SCOPES.join(',');
    const oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    console.log('[Auth] Redirecting to Shopify OAuth:', { shop, stateLength: state.length });
    res.redirect(oauthUrl);
  } catch (error) {
    console.error('Auth error:', error);
    if (!res.headersSent) {
      res.status(500).send('Authentication failed');
    }
  }
});

// GET /auth/callback - OAuth callback (manual implementation, no cookies)
router.get('/callback', async (req, res) => {
  try {
    const { code, shop: shopParam, state, host } = req.query;

    console.log('[Auth Callback] Received callback:', { shop: shopParam, hasCode: !!code, hasState: !!state });

    if (!code || !shopParam || !state) {
      return res.status(400).send('Missing required OAuth parameters');
    }

    const shop = sanitizeShop(shopParam as string);
    if (!shop) {
      return res.status(400).send('Invalid shop domain');
    }

    // Verify state from database
    const isValidState = await oauthStateManager.verify(shop, state as string);
    if (!isValidState) {
      return res.status(403).send('Invalid or expired OAuth state. Please try again.');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange OAuth code: ${tokenResponse.statusText}`);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string; scope: string };
    const { access_token: accessToken, scope } = tokenData;

    console.log('[Auth Callback] Successfully exchanged code for token:', { shop });

    // Create or update shop in database
    await prisma.shop.upsert({
      where: { shopDomain: shop },
      create: {
        shopDomain: shop,
        accessToken,
      },
      update: {
        accessToken,
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

    // Create JWT session token for API requests
    const sessionToken = createSessionToken({
      shop,
      accessToken,
      scope,
    });

    // Set cookie for session management
    res.cookie('shopify_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Required for embedded apps
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    console.log('[Auth Callback] OAuth complete, redirecting to Shopify admin');

    // After OAuth, redirect back to Shopify admin where the app is embedded
    // Shopify will then load our app in an iframe at the App URL
    const shopName = shop.replace('.myshopify.com', '');
    res.redirect(`https://admin.shopify.com/store/${shopName}/apps/ai-collection-button-links`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    if (!res.headersSent) {
      res.status(500).send('OAuth failed');
    }
  }
});

export default router;
