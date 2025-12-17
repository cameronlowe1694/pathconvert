import prisma from '../db.js';
import crypto from 'crypto';

/**
 * Custom OAuth state storage using PostgreSQL instead of cookies
 * This bypasses cookie persistence issues in embedded Shopify apps
 */
export class DatabaseOAuthStorage {
  /**
   * Store OAuth state before redirecting to Shopify
   */
  async storeState(shop: string): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');

    await prisma.oAuthState.create({
      data: {
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
  }

  /**
   * Verify and retrieve OAuth state from callback
   */
  async getState(shop: string, state: string): Promise<boolean> {
    const oauthState = await prisma.oAuthState.findFirst({
      where: {
        shop,
        state,
      },
    });

    if (!oauthState) {
      return false;
    }

    // Check if state is expired (10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (oauthState.createdAt < tenMinutesAgo) {
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
      return false;
    }

    // Delete used state
    await prisma.oAuthState.delete({ where: { id: oauthState.id } });

    return true;
  }

  /**
   * Delete OAuth state (cleanup)
   */
  async deleteState(shop: string, state: string): Promise<void> {
    await prisma.oAuthState.deleteMany({
      where: { shop, state },
    });
  }
}

export const oauthStorage = new DatabaseOAuthStorage();
