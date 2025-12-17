import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';

// Initialize Shopify API with modern December 2025 configuration
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SCOPES!.split(','),
  hostName: process.env.APP_URL!.replace(/https?:\/\//, ''),
  apiVersion: ApiVersion.October24,
  isEmbeddedApp: true,
  useOnlineTokens: false,
  // Configure cookies for embedded apps
  sessionCookieName: 'shopify_oauth_state',
  sessionCookieSameSite: 'lax', // Changed from 'none' to 'lax' for OAuth flow
  sessionCookieSecure: process.env.NODE_ENV === 'production',
});

// OAuth configuration
export const OAUTH_CALLBACK_PATH = '/auth/callback';
export const OAUTH_SCOPES = process.env.SCOPES!.split(',');

// Helper to create Shopify GraphQL client
export function createShopifyGraphQLClient(shop: string, accessToken: string) {
  const session = new Session({
    id: `offline_${shop}`,
    shop,
    accessToken,
    state: '',
    isOnline: false,
    scope: OAUTH_SCOPES.join(','),
  });

  return new shopify.clients.Graphql({ session });
}

// Helper to create Shopify REST client
export function createShopifyRestClient(shop: string, accessToken: string) {
  const session = new Session({
    id: `offline_${shop}`,
    shop,
    accessToken,
    state: '',
    isOnline: false,
    scope: OAUTH_SCOPES.join(','),
  });

  return new shopify.clients.Rest({ session });
}

// Validate shop domain
export function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

// Sanitize shop parameter
export function sanitizeShop(shop: string): string | null {
  if (!shop) return null;

  // Remove protocol if present
  shop = shop.replace(/^https?:\/\//, '');

  // Add .myshopify.com if not present
  if (!shop.endsWith('.myshopify.com')) {
    shop = `${shop}.myshopify.com`;
  }

  return isValidShopDomain(shop) ? shop : null;
}
