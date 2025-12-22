import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://pathconvert:Rza79L9vgYgRCwsRHksVpibyN37mZXcZ@dpg-d4qs77ali9vc73a3lo0g-a.oregon-postgres.render.com/pathconvert',
  ssl: { rejectUnauthorized: false }
});

async function clearShop() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const result = await client.query(
      'DELETE FROM "Shop" WHERE "shopDomain" = $1 RETURNING "shopDomain"',
      ['sports-clothing-test.myshopify.com']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Shop deleted:', result.rows[0].shopDomain);
      console.log('You can now reinstall the app to get a fresh access token!');
    } else {
      console.log('ℹ️  Shop not found in database (already deleted or never installed)');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

clearShop();
