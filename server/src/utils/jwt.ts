import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '30d'; // 30 days

export interface ShopifySession {
  shop: string;
  accessToken: string;
  scope: string;
}

// Create JWT token from shop session
export function createSessionToken(session: ShopifySession): string {
  return jwt.sign(session, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

// Verify and decode JWT token
export function verifySessionToken(token: string): ShopifySession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ShopifySession;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Validate Shopify session token (from App Bridge)
export function validateShopifySessionToken(token: string): { shop: string; sub: string } | null {
  try {
    // Shopify session tokens are JWTs signed with your API secret
    const decoded = jwt.verify(token, process.env.SHOPIFY_API_SECRET!) as any;

    if (!decoded.dest || !decoded.sub) {
      return null;
    }

    // Extract shop from dest (destination URL)
    const shop = new URL(decoded.dest).hostname;

    return {
      shop,
      sub: decoded.sub, // User ID
    };
  } catch (error) {
    console.error('Shopify session token validation failed:', error);
    return null;
  }
}
