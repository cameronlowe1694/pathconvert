#!/usr/bin/env node

/**
 * Register mandatory compliance webhooks using Shopify Admin GraphQL API
 * Modern December 2025 approach for webhook registration
 */

const SHOPIFY_API_KEY = 'fae7538a6fc12ec615cdfc413f17638f';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'your_secret_here';
const APP_URL = 'https://pathconvert.onrender.com';

const webhooks = [
  {
    topic: 'APP_UNINSTALLED',
    endpoint: `${APP_URL}/api/webhooks/app-uninstalled`,
  },
  {
    topic: 'CUSTOMERS_DATA_REQUEST',
    endpoint: `${APP_URL}/api/webhooks/customers-data-request`,
  },
  {
    topic: 'CUSTOMERS_REDACT',
    endpoint: `${APP_URL}/api/webhooks/customers-redact`,
  },
  {
    topic: 'SHOP_REDACT',
    endpoint: `${APP_URL}/api/webhooks/shop-redact`,
  },
];

console.log('Webhook Registration Info:');
console.log('===========================');
console.log('\nTo register these webhooks, you need to:');
console.log('\n1. Go to Shopify Partners Dashboard:');
console.log('   https://partners.shopify.com/4570938/apps/299346853889/edit');
console.log('\n2. Navigate to Configuration > Webhooks section');
console.log('\n3. Add the following webhook subscriptions:\n');

webhooks.forEach((webhook, index) => {
  console.log(`   Webhook ${index + 1}:`);
  console.log(`   - Topic: ${webhook.topic}`);
  console.log(`   - Endpoint: ${webhook.endpoint}`);
  console.log(`   - API Version: 2024-10`);
  console.log('');
});

console.log('4. Save the configuration');
console.log('\nNote: Webhooks cannot be registered via CLI deploy command.');
console.log('They must be configured through the Partners dashboard.');
