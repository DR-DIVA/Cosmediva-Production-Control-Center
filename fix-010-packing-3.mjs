import pg from 'pg';
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = 'postgres://postgres.yzwldawflteyywuetzcw:' + dbPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
async function checkData() {
  await pgClient.connect();
  const lotRes = await pgClient.query("SELECT id FROM production_lots WHERE lot_no = '010/26' LIMIT 1");
  const lotId = lotRes.rows[0].id;
  const procs = await pgClient.query("SELECT id FROM processes WHERE process_name = 'บรรจุ'");
  const packId = procs.rows[0].id;
  const res = await pgClient.query("SELECT id, status, process_id, tank_start, tank_end, tank_details FROM production_logs WHERE production_lot_id = '" + lotId + "' AND process_id = '" + packId + "' AND tank_start = '41'");
  
  if (res.rows.length > 0) {
    const details = res.rows[0].tank_details;
    console.log(JSON.stringify({
      49: details['49'],
      50: details['50'],
      '49_history': details['49_history'],
      '50_history': details['50_history']
    }, null, 2));
    
    // reset to WAITING
    details['49'] = 'WAITING';
    details['50'] = 'WAITING';
    
    details['49_history'] = details['49_history'] || [];
    details['49_history'].push({ status: 'WAITING', user: 'system_fix', timestamp: new Date().toISOString() });
    details['50_history'] = details['50_history'] || [];
    details['50_history'].push({ status: 'WAITING', user: 'system_fix', timestamp: new Date().toISOString() });
    
    await pgClient.query("UPDATE production_logs SET tank_details = $1 WHERE id = $2", [details, res.rows[0].id]);
    console.log('Fixed tank 49 and 50 to WAITING!');
  } else {
    console.log('Not found');
  }
  
  await pgClient.end();
}
checkData();
