import prisma from '../db.js';
import crypto from 'crypto';

/**
 * Simple OAuth state manager using PostgreSQL
 * Bypasses Shopify API cookie-based state management
 */
export const oauthStateManager = {
  /**
   * Create and store a new OAuth state
   */
  async create(shop: string): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');

    await prisma.oAuthState.create({
      data: {
        id: `state_${state}`,
        shop,
        state,
      },
    });

    // Clean up old states (> 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.oAuthState.deleteMany({
      where: {
        createdAt: { lt: tenMinutesAgo },
      },
    });

    return state;
  },

  /**
   * Verify and consume an OAuth state
   */
  async verify(shop: string, state: string): Promise<boolean> {
    const oauthState = await prisma.oAuthState.findFirst({
      where: { shop, state },
    });

    if (!oauthState) {
      console.error('[OAuth State] Not found:', { shop, state });
      return false;
    }

    // Check if expired (10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (oauthState.createdAt < tenMinutesAgo) {
      console.error('[OAuth State] Expired:', { shop, state });
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
      return false;
    }

    // Delete used state (one-time use)
    await prisma.oAuthState.delete({ where: { id: oauthState.id } });
    console.log('[OAuth State] Verified and deleted:', { shop });

    return true;
  },
};
