import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function insertData() {
  await pgClient.connect();
  try {
    // 1. Get process 'ผสม'
    const procRes = await pgClient.query("SELECT id FROM processes WHERE process_name LIKE '%ผสม%' LIMIT 1");
    const procId = procRes.rows[0]?.id;

    // 2. Get Rooms
    const mx4Res = await pgClient.query("SELECT id FROM rooms WHERE room_name = 'Mix 4' LIMIT 1");
    const mx4Id = mx4Res.rows[0]?.id;
    
    const mx5Res = await pgClient.query("SELECT id FROM rooms WHERE room_name = 'Mix 5' LIMIT 1");
    const mx5Id = mx5Res.rows[0]?.id;

    // 3. Get Products
    const prodRes = await pgClient.query("SELECT id, sku FROM products");
    const getProdId = (sku) => {
      const match = prodRes.rows.find(p => p.sku.replace(/[-\s]/g, '').toUpperCase() === sku.replace(/[-\s]/g, '').toUpperCase());
      return match ? match.id : null;
    }

    const data = [
      // Mix 4
      { sku: 'JHD-301', lot: '009/26', start: 26, end: 41, total: 48, room: mx4Id, substep: 'MIX' },
      { sku: 'JHD-301', lot: '009/26', start: 42, end: 45, total: 48, room: mx4Id, substep: 'SOAK' },
      { sku: 'JHD-318', lot: '006/26', start: 4, end: 7, total: 52, room: mx4Id, substep: 'MIX' },
      // Mix 5
      { sku: 'JHD-318', lot: '006/26', start: 1, end: 3, total: 52, room: mx5Id, substep: 'STORE' },
      { sku: 'JHD-317', lot: '004/26', start: 7, end: 7, total: 18, room: mx5Id, substep: 'MIX' },
      { sku: 'JHD-317', lot: '004/26', start: 8, end: 9, total: 18, room: mx5Id, substep: 'SOAK' },
      { sku: 'JHD-318', lot: '006/26', start: 4, end: 7, total: 52, room: mx5Id, substep: 'SOAK' },
      { sku: 'JHD-309', lot: '010/26', start: 5, end: 6, total: 6, room: mx5Id, substep: 'MIX' },
    ];

    for (const item of data) {
      const prodId = getProdId(item.sku);
      if (!prodId) {
        console.log("Product not found:", item.sku);
        continue;
      }

      // Upsert Lot
      let lotId;
      const existingLot = await pgClient.query(`
        SELECT id FROM production_lots WHERE sku_id = $1 AND lot_no = $2
      `, [prodId, item.lot]);

      if (existingLot.rows.length > 0) {
        lotId = existingLot.rows[0].id;
      } else {
        const lotRes = await pgClient.query(`
          INSERT INTO production_lots (sku_id, lot_no, current_process_id, current_room_id, total_tanks, current_status)
          VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS') RETURNING id
        `, [prodId, item.lot, procId, item.room, item.total]);
        lotId = lotRes.rows[0].id;
      }

      // Insert Log
      await pgClient.query(`
        INSERT INTO production_logs (production_lot_id, process_id, room_id, tank_start, tank_end, status, sub_step, activity_date)
        VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', $6, NOW())
      `, [lotId, procId, item.room, item.start, item.end, item.substep]);
    }
    console.log("Insert success!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

insertData();
