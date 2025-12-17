import { LATEST_API_VERSION, Shopify, ApiVersion } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

// Initialize Shopify API with modern December 2025 configuration
export const shopify = new Shopify.Context({
  API_KEY: process.env.SHOPIFY_API_KEY!,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET!,
  SCOPES: process.env.SCOPES!.split(','),
  HOST_NAME: process.env.APP_URL!.replace(/https?:\/\//, ''),
  API_VERSION: ApiVersion.January25, // Latest as of Dec 2025
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: undefined, // No database sessions - using JWTs
});

// OAuth configuration
export const OAUTH_CALLBACK_PATH = '/auth/callback';
export const OAUTH_SCOPES = process.env.SCOPES!.split(',');

// Helper to create Shopify GraphQL client
export function createShopifyGraphQLClient(shop: string, accessToken: string) {
  return new Shopify.Clients.Graphql({
    session: {
      shop,
      accessToken,
      state: '',
      isOnline: false,
      scope: OAUTH_SCOPES.join(','),
    },
  });
}

// Helper to create Shopify REST client
export function createShopifyRestClient(shop: string, accessToken: string) {
  return new Shopify.Clients.Rest({
    session: {
      shop,
      accessToken,
      state: '',
      isOnline: false,
      scope: OAUTH_SCOPES.join(','),
    },
  });
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
