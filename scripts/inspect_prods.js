const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const client = new pg.Client({
  connectionString: `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const prods = await client.query("SELECT id, sku, product_name, default_unit FROM products ORDER BY sku;");
  console.log('Products:', prods.rows);

  const lots = await client.query("SELECT id, lot_no, sku_id, planned_start_date, fg_due_date, order_no, current_status FROM production_lots WHERE lot_no LIKE 'LOT-2026-005%' ORDER BY lot_no;");
  console.log('\nProduction lots:', lots.rows);

  await client.end();
}

main().catch(console.error);
