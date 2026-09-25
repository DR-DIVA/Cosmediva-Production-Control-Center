const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const pool = new Pool({
  connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL database...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log('Applying WMS Schema...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');

    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    console.log('Applying WMS Seed data...');
    await client.query(seedSql);
    console.log('Seed data applied successfully.');

    // Verify
    const whRes = await client.query('SELECT COUNT(*) FROM wms_warehouses');
    const locRes = await client.query('SELECT COUNT(*) FROM wms_locations');
    const itemRes = await client.query('SELECT COUNT(*) FROM wms_items');
    console.log(`Verification:`);
    console.log(`- Warehouses: ${whRes.rows[0].count}`);
    console.log(`- Locations: ${locRes.rows[0].count}`);
    console.log(`- Items: ${itemRes.rows[0].count}`);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
