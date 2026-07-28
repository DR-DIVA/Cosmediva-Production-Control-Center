import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fix() {
  await pgClient.connect();
  try {
    const rmProcRes = await pgClient.query("SELECT id FROM processes WHERE process_name = 'พักสารรอผสม'");
    const rmProcId = rmProcRes.rows[0].id;

    // Delete RM Storage tasks for lot 009/26
    const delRes = await pgClient.query(`
      DELETE FROM production_logs 
      WHERE process_id = $1 
      AND production_lot_id IN (SELECT id FROM production_lots WHERE lot_no = '009/26')
    `, [rmProcId]);
    console.log("Deleted RM Storage tasks:", delRes.rowCount);

    // Revert Weighing task for lot 009/26
    const upRes = await pgClient.query(`
      UPDATE production_logs 
      SET status = 'WAITING', tank_start = NULL, tank_end = NULL, start_time = NULL, end_time = NULL 
      WHERE status = 'COMPLETED' AND process_id = (SELECT id FROM processes WHERE process_name = 'ชั่งสาร')
      AND production_lot_id IN (SELECT id FROM production_lots WHERE lot_no = '009/26')
    `);
    console.log("Reverted Weighing tasks:", upRes.rowCount);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

fix();
