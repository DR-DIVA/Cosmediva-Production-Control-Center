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
  const rels = await client.query("SELECT id, release_no, lot_no, production_lot_id, sku_id, sku_code, product_name, template_id, coa_status FROM qms_batch_releases ORDER BY lot_no;");
  console.log('qms_batch_releases:');
  for (const r of rels.rows) {
    console.log(r);
  }
  await client.end();
}

main().catch(console.error);
