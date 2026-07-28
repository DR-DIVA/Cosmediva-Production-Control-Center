import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function clearData() {
  await pgClient.connect();
  try {
    const res1 = await pgClient.query("DELETE FROM production_logs");
    console.log(`Deleted ${res1.rowCount} logs.`);

    const res2 = await pgClient.query("DELETE FROM production_lots");
    console.log(`Deleted ${res2.rowCount} lots.`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

clearData();
