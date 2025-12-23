#!/usr/bin/env node

/**
 * Diagnostic and fix script for auth token issues
 * Checks if the access token is valid and provides instructions to fix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOP_DOMAIN = 'sports-clothing-test.myshopify.com';

async function main() {
  console.log('='.repeat(60));
  console.log('PathConvert Auth Token Diagnostic');
  console.log('='.repeat(60));
  console.log();

  // Check shop record
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: SHOP_DOMAIN },
    select: {
      id: true,
      shopDomain: true,
      accessToken: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!shop) {
    console.log('❌ ERROR: Shop record not found in database');
    console.log(`   Shop domain: ${SHOP_DOMAIN}`);
    console.log();
    console.log('FIX: Install the app via Shopify admin to create shop record');
    process.exit(1);
  }

  console.log('✅ Shop record found');
  console.log(`   Shop ID: ${shop.id}`);
  console.log(`   Domain: ${shop.shopDomain}`);
  console.log(`   Created: ${shop.createdAt}`);
  console.log(`   Updated: ${shop.updatedAt}`);
  console.log();

  // Check access token
  const hasToken = shop.accessToken && shop.accessToken.length > 0;
  const tokenLength = shop.accessToken?.length || 0;

  if (!hasToken) {
    console.log('❌ CRITICAL ERROR: Access token is empty or missing');
    console.log('   This explains the 401 Unauthorized errors');
    console.log();
    console.log('ROOT CAUSE:');
    console.log('   - App was uninstalled and APP_UNINSTALLED webhook cleared the token');
    console.log('   - OAuth flow on reinstall did not properly update the token');
    console.log('   - OR webhook arrived after OAuth and overwrote the fresh token');
    console.log();
    console.log('FIX (choose one):');
    console.log();
    console.log('   Option 1 - Force fresh OAuth (RECOMMENDED):');
    console.log('   1. Uninstall the app from Shopify admin');
    console.log('   2. Wait 10 seconds');
    console.log('   3. Visit: https://pathconvert.onrender.com/auth?shop=sports-clothing-test.myshopify.com');
    console.log('   4. Complete OAuth flow');
    console.log('   5. Try "Analyse & Deploy" again');
    console.log();
    console.log('   Option 2 - Manual token entry (FOR TESTING ONLY):');
    console.log('   1. Get a valid access token from Shopify admin API');
    console.log('   2. Run: node scripts/update-token.js <token>');
    console.log();
    process.exit(1);
  }

  console.log('✅ Access token exists');
  console.log(`   Token length: ${tokenLength} characters`);
  console.log(`   Token preview: ${shop.accessToken.substring(0, 20)}...`);
  console.log();

  // Test the token by making a simple GraphQL request
  console.log('Testing access token validity...');
  console.log();

  try {
    const testQuery = `
      query {
        shop {
          name
          email
        }
      }
    `;

    const response = await fetch(`https://${SHOP_DOMAIN}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shop.accessToken,
      },
      body: JSON.stringify({ query: testQuery }),
    });

    const result = await response.json();

    if (response.status === 401) {
      console.log('❌ CRITICAL ERROR: Access token is INVALID (401 Unauthorized)');
      console.log('   Response:', JSON.stringify(result, null, 2));
      console.log();
      console.log('ROOT CAUSE:');
      console.log('   - Token was revoked when app was uninstalled');
      console.log('   - Token is from old installation and no longer valid');
      console.log();
      console.log('FIX: Force fresh OAuth flow');
      console.log('   1. Visit: https://pathconvert.onrender.com/auth?shop=sports-clothing-test.myshopify.com');
      console.log('   2. Complete OAuth authorization');
      console.log('   3. Run this diagnostic again to verify');
      console.log();
      process.exit(1);
    }

    if (result.errors) {
      console.log('❌ ERROR: GraphQL request failed');
      console.log('   Errors:', JSON.stringify(result.errors, null, 2));
      console.log();
      process.exit(1);
    }

    if (result.data?.shop) {
      console.log('✅ SUCCESS: Access token is VALID and working!');
      console.log(`   Shop name: ${result.data.shop.name}`);
      console.log(`   Shop email: ${result.data.shop.email}`);
      console.log();
      console.log('Your token is working correctly. If you\'re still seeing 401 errors,');
      console.log('the issue may be with job worker cache or Render deployment.');
      console.log();
      console.log('Next steps:');
      console.log('   1. Restart Render service to clear any cached tokens');
      console.log('   2. Try "Analyse & Deploy" again');
      console.log();
    }
  } catch (error) {
    console.log('❌ ERROR: Failed to test access token');
    console.log('   Error:', error.message);
    console.log();
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
