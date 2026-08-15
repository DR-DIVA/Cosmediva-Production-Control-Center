import pg from 'pg';
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = 'postgres://postgres.yzwldawflteyywuetzcw:' + dbPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
async function checkData() {
  await pgClient.connect();
  const lotRes = await pgClient.query("SELECT id FROM production_lots WHERE lot_no = '010/26' LIMIT 1");
  const lotId = lotRes.rows[0].id;
  const res = await pgClient.query("SELECT p.process_name, l.status, l.tank_start, l.tank_end FROM production_logs l JOIN processes p ON p.id = l.process_id WHERE l.production_lot_id = '" + lotId + "' ORDER BY l.tank_start::int");
  const filtered = res.rows.filter(r => r.process_name.includes('ลัง') || r.process_name.toLowerCase().includes('fg') || r.process_name.includes('คลัง') || r.process_name.includes('store'));
  console.log(JSON.stringify(filtered, null, 2));
  await pgClient.end();
}
checkData();
