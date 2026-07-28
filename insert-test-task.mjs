import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function insertTestTask() {
  await pgClient.connect();
  try {
    // 1. Get process 'ชั่งสาร'
    const procRes = await pgClient.query("SELECT id FROM processes WHERE process_name = 'ชั่งสาร'");
    const processId = procRes.rows[0].id;

    // 2. Insert Lot
    const lotRes = await pgClient.query(`
      INSERT INTO production_lots (sku_id, lot_no, current_process_id, total_tanks, current_status)
      VALUES (
        (SELECT id FROM products LIMIT 1),
        '999/26',
        $1,
        20,
        'PLANNED'
      ) RETURNING id
    `, [processId]);
    const lotId = lotRes.rows[0].id;

    // 3. Insert Log
    await pgClient.query(`
      INSERT INTO production_logs (production_lot_id, process_id, status, activity_date)
      VALUES ($1, $2, 'WAITING', NOW())
    `, [lotId, processId]);

    console.log("Inserted test task for Lot 999/26 with 20 tanks");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

insertTestTask();
