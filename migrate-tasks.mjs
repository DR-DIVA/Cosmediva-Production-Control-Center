import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await pgClient.connect();
  try {
    const { rows: mixRows } = await pgClient.query("SELECT id FROM processes WHERE process_name = 'ผสม'");
    const mixId = mixRows[0].id;
    const { rows: pofRows } = await pgClient.query("SELECT id FROM processes WHERE process_name = 'รออุโมงค์'");
    const pofId = pofRows[0].id;

    // Move from RM Storage to Mix
    const rmRes = await pgClient.query(`
      UPDATE production_logs 
      SET process_id = $1 
      WHERE process_id IN (SELECT id FROM processes WHERE process_name = 'พักสารรอผสม') 
      AND status IN ('WAITING', 'IN_PROGRESS', 'PAUSED')
      RETURNING id
    `, [mixId]);
    console.log("Moved RM to Mix:", rmRes.rowCount);

    // Move from WIP to POF
    const wipRes = await pgClient.query(`
      UPDATE production_logs 
      SET process_id = $1 
      WHERE process_id IN (SELECT id FROM processes WHERE process_name = 'รอลงลัง') 
      AND status IN ('WAITING', 'IN_PROGRESS', 'PAUSED')
      RETURNING id
    `, [pofId]);
    console.log("Moved WIP to POF:", wipRes.rowCount);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

migrate();
