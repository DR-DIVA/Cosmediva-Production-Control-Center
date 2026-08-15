import pg from 'pg';
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = 'postgres://postgres.yzwldawflteyywuetzcw:' + dbPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
async function checkData() {
  await pgClient.connect();
  const lotRes = await pgClient.query("SELECT id FROM production_lots WHERE lot_no = '010/26' LIMIT 1");
  const lotId = lotRes.rows[0].id;
  const res = await pgClient.query("SELECT id, status, process_id, tank_start, tank_end, tank_details FROM production_logs WHERE production_lot_id = '" + lotId + "' AND tank_start = '41'");
  
  if (res.rows.length > 0) {
    const details = res.rows[0].tank_details;
    console.log(JSON.stringify({
      49: details['49'],
      50: details['50']
    }, null, 2));
    
    // FIX IT
    if (details['49'] === 'LOCKED' || details['50'] === 'LOCKED') {
       if (details['49'] === 'LOCKED') details['49'] = 'WAITING';
       if (details['50'] === 'LOCKED') details['50'] = 'WAITING';
       await pgClient.query("UPDATE production_logs SET tank_details = $1 WHERE id = $2", [details, res.rows[0].id]);
       console.log('Fixed tank 49 and 50 to WAITING!');
    }
  } else {
    console.log('Not found');
  }
  
  await pgClient.end();
}
checkData();
