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
  const rels = await client.query("SELECT lot_no, sku_code, product_name, coa_status, (coa_data IS NOT NULL) as has_coa_data FROM qms_batch_releases;");
  console.log('Releases COA status:');
  console.table(rels.rows);

  const lot50 = await client.query("SELECT coa_data FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0050';");
  console.log('LOT-2026-0050 coa_data:', JSON.stringify(lot50.rows[0]?.coa_data, null, 2));

  await client.end();
}

main().catch(console.error);
