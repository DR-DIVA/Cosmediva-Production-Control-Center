import pg from 'pg';
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = 'postgres://postgres.yzwldawflteyywuetzcw:' + dbPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
async function checkData() {
  await pgClient.connect();
  const res = await pgClient.query("SELECT tank_details FROM production_logs WHERE id = '451289f5-cf75-4307-ae2e-776857fd1570'");
  
  if (res.rows.length > 0) {
    const details = res.rows[0].tank_details;
    console.log(JSON.stringify({
      49: details['49'],
      50: details['50']
    }, null, 2));
    
    details['49'] = 'WAITING';
    details['50'] = 'WAITING';
    
    details['49_history'] = details['49_history'] || [];
    details['49_history'].push({ status: 'WAITING', user: 'system_fix', timestamp: new Date().toISOString() });
    details['50_history'] = details['50_history'] || [];
    details['50_history'].push({ status: 'WAITING', user: 'system_fix', timestamp: new Date().toISOString() });
    
    await pgClient.query("UPDATE production_logs SET tank_details = $1 WHERE id = '451289f5-cf75-4307-ae2e-776857fd1570'", [details]);
    console.log('Fixed tank 49 and 50 to WAITING for log 451289f5-cf75-4307-ae2e-776857fd1570');
  } else {
    console.log('Not found');
  }
  
  await pgClient.end();
}
checkData();
