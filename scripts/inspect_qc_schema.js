const pg = require('pg');
require('dotenv').config({ path: '.env.local' });
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const client = new pg.Client({ 
  connectionString: `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'qc_results' ORDER BY ordinal_position;");
  console.log('qc_results columns:', res.rows);

  const resProd = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;");
  console.log('products columns:', resProd.rows);

  const resRel = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'qms_batch_releases' ORDER BY ordinal_position;");
  console.log('qms_batch_releases columns:', resRel.rows);

  await client.end();
}

main().catch(console.error);
