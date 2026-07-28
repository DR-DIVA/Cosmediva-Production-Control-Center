import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await pgClient.connect();
  
  try {
    console.log("Adding columns to products...");
    await pgClient.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS kg_per_tank numeric,
      ADD COLUMN IF NOT EXISTS g_per_piece numeric,
      ADD COLUMN IF NOT EXISTS capacity_min numeric,
      ADD COLUMN IF NOT EXISTS capacity_max numeric,
      ADD COLUMN IF NOT EXISTS pcs_per_carton numeric;
    `);

    console.log("Adding columns to production_lots...");
    await pgClient.query(`
      ALTER TABLE production_lots 
      ADD COLUMN IF NOT EXISTS kg_per_tank numeric,
      ADD COLUMN IF NOT EXISTS g_per_piece numeric,
      ADD COLUMN IF NOT EXISTS capacity_min numeric,
      ADD COLUMN IF NOT EXISTS capacity_max numeric,
      ADD COLUMN IF NOT EXISTS pcs_per_carton numeric,
      ADD COLUMN IF NOT EXISTS order_quantity numeric;
    `);

    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pgClient.end();
  }
}

migrate();
