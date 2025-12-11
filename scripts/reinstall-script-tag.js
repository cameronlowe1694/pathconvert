import dotenv from 'dotenv';
import pool from '../src/database/db.js';
import axios from 'axios';

dotenv.config();

const SHOP = 'sports-clothing-test.myshopify.com';

async function reinstallScriptTag() {
  console.log(`\n🔄 Reinstalling script tag for ${SHOP}...\n`);

  // Get access token
  const client = await pool.connect();
  let accessToken;

  try {
    const result = await client.query(
      'SELECT access_token FROM shop_settings WHERE shop_domain = $1',
      [SHOP]
    );

    if (result.rows.length === 0) {
      throw new Error('Shop not found in database');
    }

    accessToken = result.rows[0].access_token;
  } finally {
    client.release();
  }

  const apiBase = `https://${SHOP}/admin/api/2024-01`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json'
  };

  // Step 1: Get existing script tags
  console.log('📋 Fetching existing script tags...');
  const existingResponse = await axios.get(`${apiBase}/script_tags.json`, { headers });
  const existingTags = existingResponse.data.script_tags || [];

  console.log(`Found ${existingTags.length} existing script tags:`);
  existingTags.forEach(tag => {
    console.log(`  - ID: ${tag.id}, src: ${tag.src}`);
  });

  // Step 2: Delete PathConvert script tags
  const pathconvertTags = existingTags.filter(tag =>
    tag.src.includes('pathconvert') || tag.src.includes(process.env.APP_URL)
  );

  if (pathconvertTags.length > 0) {
    console.log(`\n🗑️  Deleting ${pathconvertTags.length} old PathConvert script tag(s)...`);
    for (const tag of pathconvertTags) {
      console.log(`   Deleting: ${tag.src}`);
      await axios.delete(`${apiBase}/script_tags/${tag.id}.json`, { headers });
      console.log(`   ✓ Deleted script tag ${tag.id}`);
    }
  } else {
    console.log('\nℹ️  No existing PathConvert script tags found');
  }

  // Step 3: Install new script tag
  const newScriptSrc = `${process.env.APP_URL}/storefront/storefront-script.js`;
  console.log(`\n📦 Installing new script tag: ${newScriptSrc}`);

  await axios.post(
    `${apiBase}/script_tags.json`,
    {
      script_tag: {
        event: 'onload',
        src: newScriptSrc,
        display_scope: 'all'
      }
    },
    { headers }
  );

  console.log('✓ Script tag installed successfully!\n');

  // Step 4: Verify installation
  console.log('🔍 Verifying installation...');
  const verifyResponse = await axios.get(`${apiBase}/script_tags.json`, { headers });
  const installedTag = verifyResponse.data.script_tags.find(tag => tag.src === newScriptSrc);

  if (installedTag) {
    console.log(`✅ SUCCESS! Script tag is live:`);
    console.log(`   ID: ${installedTag.id}`);
    console.log(`   SRC: ${installedTag.src}`);
    console.log(`   Event: ${installedTag.event}`);
    console.log(`\n🎉 The storefront will now load: ${newScriptSrc}\n`);
  } else {
    console.log('❌ ERROR: Script tag not found after installation');
  }

  process.exit(0);
}

reinstallScriptTag().catch(error => {
  console.error('❌ Error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
  process.exit(1);
});
