import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkTable() {
  await pgClient.connect();
  const res = await pgClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='qc_results'
  `);
  console.log(res.rows.length > 0 ? "Exists" : "Not Exists");
  await pgClient.end();
}

checkTable();
