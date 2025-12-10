import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function listTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    // List all tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 Tables in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Count records in each table for the shop
    const shopDomain = 'sports-clothing-test.myshopify.com';
    console.log(`\n📊 Record counts for shop: ${shopDomain}`);

    for (const row of result.rows) {
      const table = row.table_name;
      try {
        const countResult = await client.query(
          `SELECT COUNT(*) FROM ${table} WHERE shop_domain = $1`,
          [shopDomain]
        );
        console.log(`  ${table}: ${countResult.rows[0].count} rows`);
      } catch (err) {
        console.log(`  ${table}: (no shop_domain column)`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

listTables().catch(console.error);
