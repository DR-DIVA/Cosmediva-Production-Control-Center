import pg from 'pg';
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = 'postgres://postgres.yzwldawflteyywuetzcw:' + dbPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
async function checkData() {
  await pgClient.connect();
  const lotRes = await pgClient.query("SELECT id FROM production_lots WHERE lot_no = '010/26' LIMIT 1");
  const lotId = lotRes.rows[0].id;
  const res = await pgClient.query("SELECT l.id, p.process_name, l.tank_start, l.tank_end, l.tank_details FROM production_logs l JOIN processes p ON p.id = l.process_id WHERE l.production_lot_id = '" + lotId + "' ORDER BY l.tank_start::int");
  const filtered = res.rows.filter(r => r.process_name.includes('ลัง') || r.process_name.toLowerCase().includes('fg') || r.process_name.includes('คลัง') || r.process_name.includes('store'));
  
  // also check how it gets aggregated by the UI logic (i.e. 'fg', 'คลัง', 'store', 'ลัง')
  // maxStartedTank for each log
  const results = filtered.map(log => {
      const start = parseInt(log.tank_start) || 0
      const end = parseInt(log.tank_end) || start
      let maxStartedTank = 0
      let minWaitingTank = 0
      if (end >= start && start > 0) {
        const details = log.tank_details || {}
        for (let t = start; t <= end; t++) {
           const val = details[t] || details[t.toString()]
           const s = typeof val === 'string' ? val : (val?.status || '')
           const isStartedOrDone = s && !['LOCKED', 'WAITING', 'PLANNED'].includes(s)
           if (isStartedOrDone) {
              maxStartedTank = Math.max(maxStartedTank, t)
           } else {
              if (minWaitingTank === 0 || t < minWaitingTank) {
                 minWaitingTank = t
              }
           }
        }
      }
      return {
        process: log.process_name,
        start, end, maxStartedTank, minWaitingTank
      }
  });
  console.log(JSON.stringify(results, null, 2));
  await pgClient.end();
}
checkData();
