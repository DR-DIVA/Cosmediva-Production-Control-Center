import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fixBrokenTasks() {
  await pgClient.connect();
  try {
    // 1. Delete the broken RM Storage task (status WAITING, tank_start is null)
    const delRes = await pgClient.query("DELETE FROM production_logs WHERE status = 'WAITING' AND tank_start IS NULL AND total_tanks = 48");
    console.log("Deleted broken RM Storage tasks:", delRes.rowCount);

    // 2. Revert the completed Weighing task back to WAITING
    const upRes = await pgClient.query("UPDATE production_logs SET status = 'WAITING', tank_start = NULL, tank_end = NULL, start_time = NULL, end_time = NULL WHERE status = 'COMPLETED' AND total_tanks = 48");
    console.log("Reverted Weighing tasks:", upRes.rowCount);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

fixBrokenTasks();
