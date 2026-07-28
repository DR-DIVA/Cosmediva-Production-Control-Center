import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
  await pgClient.connect();
  try {
    const res = await pgClient.query("SELECT l.id, l.status, l.tank_start, l.tank_end, pl.lot_no, p.process_name FROM production_logs l JOIN processes p ON l.process_id = p.id JOIN production_lots pl ON l.production_lot_id = pl.id WHERE p.process_name = 'พักสารรอผสม'");
    console.log(res.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

check();
