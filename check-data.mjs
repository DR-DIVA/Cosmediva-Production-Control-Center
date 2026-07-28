import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkData() {
  await pgClient.connect();
  const roomRes = await pgClient.query("SELECT * FROM rooms LIMIT 1");
  const procRes = await pgClient.query("SELECT * FROM processes LIMIT 1");
  console.log('Room:', roomRes.rows[0]);
  console.log('Process:', procRes.rows[0]);
  await pgClient.end();
}

checkData();
