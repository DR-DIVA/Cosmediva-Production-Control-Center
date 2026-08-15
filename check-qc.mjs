import pg from 'pg';
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = 'postgres://postgres.yzwldawflteyywuetzcw:' + dbPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
async function checkData() {
  await pgClient.connect();
  const lotRes = await pgClient.query("SELECT id FROM production_lots WHERE lot_no = '010/26' LIMIT 1");
  const lotId = lotRes.rows[0].id;
  const res = await pgClient.query("SELECT p.process_name, l.status, l.tank_details FROM production_logs l JOIN processes p ON p.id = l.process_id WHERE l.production_lot_id = '" + lotId + "' AND (p.process_name LIKE '%QC%' OR p.process_name LIKE '%FG%')");
  
  for (const row of res.rows) {
     if (row.process_name.includes('QC')) {
       const details = row.tank_details || {};
       for (const t in details) {
         if (t == '71' || t == '72') console.log('QC Tank', t, details[t]);
       }
     }
  }
  await pgClient.end();
}
checkData();
