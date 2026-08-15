import pg from 'pg';
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = 'postgres://postgres.yzwldawflteyywuetzcw:' + dbPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
async function checkData() {
  await pgClient.connect();
  const procs = await pgClient.query("SELECT id, process_name FROM processes WHERE process_name LIKE '%บรรจุ%'");
  console.log(JSON.stringify(procs.rows, null, 2));
  
  const lotRes = await pgClient.query("SELECT id FROM production_lots WHERE lot_no = '010/26' LIMIT 1");
  const lotId = lotRes.rows[0].id;
  
  const res = await pgClient.query("SELECT id, status, process_id, tank_start, tank_end FROM production_logs WHERE production_lot_id = '" + lotId + "' ORDER BY tank_start::int");
  console.log(JSON.stringify(res.rows, null, 2));
  
  await pgClient.end();
}
checkData();
