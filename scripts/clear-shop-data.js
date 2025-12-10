import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function clearShopData(shopDomain) {
  // Use production database URL from environment
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // Always require SSL for Render PostgreSQL
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`Clearing all data for shop: ${shopDomain}`);

    // Delete from all tables (only ones that exist)
    const tables = [
      'collection_recommendations',
      'collection_link_analytics',
      'related_collections',
      'collections',
      'button_clicks',
      'job_queue',
      'shop_sessions'
      // Note: We keep shop_settings to preserve OAuth credentials
    ];

    for (const table of tables) {
      try {
        const result = await client.query(
          `DELETE FROM ${table} WHERE shop_domain = $1`,
          [shopDomain]
        );
        console.log(`  ✓ Deleted ${result.rowCount} rows from ${table}`);
      } catch (err) {
        console.log(`  ⚠ Table ${table} doesn't exist, skipping`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Successfully cleared all shop data!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing shop data:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const shopDomain = process.argv[2] || 'sports-clothing-test.myshopify.com';
clearShopData(shopDomain).catch(console.error);
