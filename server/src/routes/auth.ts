import { Router } from 'express';
import { sanitizeShop, OAUTH_CALLBACK_PATH, OAUTH_SCOPES } from '../utils/shopify.js';
import { createSessionToken } from '../utils/jwt.js';
import { oauthStorage } from '../utils/sessionStorage.js';
import prisma from '../db.js';

const router = Router();

// GET /auth - Start OAuth flow with database-backed state storage
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
    // Generate and store OAuth state in database
    const state = await oauthStorage.storeState(shop);

    // Build OAuth URL manually to bypass cookie dependency
    const redirectUri = `${process.env.APP_URL}${OAUTH_CALLBACK_PATH}`;
    const scopes = OAUTH_SCOPES.join(',');

    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    console.log('[OAuth] Redirecting to Shopify:', { shop, state });
    res.redirect(authUrl);
  } catch (error) {
    console.error('OAuth begin error:', error);
    if (!res.headersSent) {
      res.status(500).send('Failed to start OAuth flow');
    }
  }
});

// GET /auth/callback - OAuth callback with database state verification
router.get('/callback', async (req, res) => {
  try {
    const { code, shop: shopParam, state, host, hmac } = req.query;

    if (!code || !shopParam || !state) {
      return res.status(400).send('Missing required OAuth parameters');
    }

    const shop = sanitizeShop(shopParam as string);
    if (!shop) {
      return res.status(400).send('Invalid shop domain');
    }

    // Verify state from database (instead of cookie)
    const isValidState = await oauthStorage.getState(shop, state as string);
    if (!isValidState) {
      console.error('[OAuth] Invalid or expired state:', { shop, state });
      return res.status(403).send('Invalid OAuth state. Please try again.');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    console.log('[OAuth] Successfully exchanged code for token:', { shop });

    // Create or update shop in database
    await prisma.shop.upsert({
      where: { shopDomain: shop },
      create: {
        shopDomain: shop,
        accessToken: accessToken,
      },
      update: {
        accessToken: accessToken,
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
      accessToken,
      scope,
    });

    // Set cookie
    res.cookie('shopify_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none', // Required for embedded apps
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    console.log('[OAuth] Redirecting to app:', { shop, host });

    // Redirect to app
    res.redirect(`/?shop=${shop}&host=${host || ''}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('OAuth failed');
  }
});

export default router;
