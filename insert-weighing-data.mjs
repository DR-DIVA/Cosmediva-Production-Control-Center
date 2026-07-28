import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function insertWeighingData() {
  await pgClient.connect();
  try {
    // 1. Ensure "พักสารรอผสม" exists in processes
    let rmStorageRes = await pgClient.query("SELECT id FROM processes WHERE process_name = 'พักสารรอผสม'");
    let rmStorageId;
    if (rmStorageRes.rows.length === 0) {
      const newProc = await pgClient.query("INSERT INTO processes (process_name) VALUES ('พักสารรอผสม') RETURNING id");
      rmStorageId = newProc.rows[0].id;
    } else {
      rmStorageId = rmStorageRes.rows[0].id;
    }

    // 2. Get process 'ชั่งสาร'
    const procRes = await pgClient.query("SELECT id FROM processes WHERE process_name = 'ชั่งสาร' LIMIT 1");
    const weighingProcId = procRes.rows[0]?.id;

    // 3. Get Products
    const prodRes = await pgClient.query("SELECT id, sku FROM products WHERE sku = 'JHD-318'");
    const prodId = prodRes.rows[0]?.id;

    if (!prodId) {
      console.error("Product JHD-318 not found");
      return;
    }

    // 4. Upsert Lot JHD-318 006/26
    let lotId;
    const existingLot = await pgClient.query(`
      SELECT id FROM production_lots WHERE sku_id = $1 AND lot_no = '006/26'
    `, [prodId]);

    if (existingLot.rows.length > 0) {
      lotId = existingLot.rows[0].id;
    } else {
      const lotRes = await pgClient.query(`
        INSERT INTO production_lots (sku_id, lot_no, current_process_id, total_tanks, current_status)
        VALUES ($1, '006/26', $2, 52, 'PLANNED') RETURNING id
      `, [prodId, weighingProcId]);
      lotId = lotRes.rows[0].id;
    }

    // 5. Insert Log for Weighing
    await pgClient.query(`
      INSERT INTO production_logs (production_lot_id, process_id, status, activity_date)
      VALUES ($1, $2, 'WAITING', NOW())
    `, [lotId, weighingProcId]);

    console.log("Insert Weighing data success!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

insertWeighingData();
