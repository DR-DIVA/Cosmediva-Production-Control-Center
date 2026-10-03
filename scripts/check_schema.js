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
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
  const filtered = tables.rows
    .map(r => r.table_name)
    .filter(n => n.includes('prod') || n.includes('qc') || n.includes('spec') || n.includes('qms') || n.includes('form') || n.includes('test'));
  console.log('Filtered tables:', filtered);
  await client.end();
}

main().catch(console.error);
