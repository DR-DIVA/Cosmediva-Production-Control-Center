const pg = require('pg');
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'qms_%'");
  console.log('QMS tables count:', res.rows.length);
  console.log('QMS tables:', res.rows.map(r => r.table_name));
  await client.end();
}

check().catch(console.error);
