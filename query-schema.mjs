import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
  await pgClient.connect();
  const res = await pgClient.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('products', 'production_lots', 'production_logs')");
  console.log(res.rows);
  await pgClient.end();
}

check();
