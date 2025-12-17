import { Request, Response, NextFunction } from 'express';
import { verifySessionToken, validateShopifySessionToken } from '../utils/jwt.js';
import prisma from '../db.js';

export interface AuthenticatedRequest extends Request {
  shop: string;
  accessToken: string;
  shopId: string;
}

/**
 * Middleware to authenticate requests using JWT session cookie or App Bridge session token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try JWT cookie first (from OAuth callback)
    const cookieToken = req.cookies.shopify_session;
    if (cookieToken) {
      const session = verifySessionToken(cookieToken);
      if (session) {
        // Get shop from database
        const shop = await prisma.shop.findUnique({
          where: { shopDomain: session.shop },
          select: { id: true, shopDomain: true, accessToken: true },
        });

        if (shop) {
          (req as AuthenticatedRequest).shop = shop.shopDomain;
          (req as AuthenticatedRequest).accessToken = shop.accessToken;
          (req as AuthenticatedRequest).shopId = shop.id;
          return next();
        }
      }
    }

    // Try App Bridge session token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const sessionToken = validateShopifySessionToken(token);

      if (sessionToken) {
        // Get shop from database
        const shop = await prisma.shop.findUnique({
          where: { shopDomain: sessionToken.shop },
          select: { id: true, shopDomain: true, accessToken: true },
        });

        if (shop) {
          (req as AuthenticatedRequest).shop = shop.shopDomain;
          (req as AuthenticatedRequest).accessToken = shop.accessToken;
          (req as AuthenticatedRequest).shopId = shop.id;
          return next();
        }
      }
    }

    // No valid authentication found
    res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional authentication - doesn't fail if no auth, just adds shop info if available
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookieToken = req.cookies.shopify_session;
    if (cookieToken) {
      const session = verifySessionToken(cookieToken);
      if (session) {
        const shop = await prisma.shop.findUnique({
          where: { shopDomain: session.shop },
          select: { id: true, shopDomain: true, accessToken: true },
        });

        if (shop) {
          (req as AuthenticatedRequest).shop = shop.shopDomain;
          (req as AuthenticatedRequest).accessToken = shop.accessToken;
          (req as AuthenticatedRequest).shopId = shop.id;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
}
