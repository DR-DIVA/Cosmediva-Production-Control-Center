import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function cleanup() {
  await pgClient.connect();
  try {
    const res = await pgClient.query("DELETE FROM production_logs WHERE production_lot_id IS NULL AND status = 'WAITING'");
    console.log("Deleted rows:", res.rowCount);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

cleanup();
