import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function queryCols() {
  await pgClient.connect();
  try {
    const res = await pgClient.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'production_logs'");
    console.log(res.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

queryCols();
