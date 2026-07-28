import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function seedData() {
  await pgClient.connect();
  console.log('Connected to DB');

  try {
    // 1. Fetch lookup maps
    const prodRes = await pgClient.query("SELECT id, sku FROM products");
    const productMap = {};
    prodRes.rows.forEach(r => { productMap[r.sku.replace(/[-\s]/g, '').toUpperCase()] = r.id; });

    const roomRes = await pgClient.query("SELECT id, room_name FROM rooms");
    const roomMap = {};
    roomRes.rows.forEach(r => { roomMap[r.room_name] = r.id; });

    const procRes = await pgClient.query("SELECT id, process_name FROM processes");
    const procMap = {};
    procRes.rows.forEach(r => { procMap[r.process_name] = r.id; });

    // Helper to find ID
    const getSkuId = (sku) => productMap[sku.replace(/[-\s]/g, '').toUpperCase()];
    const getRoomId = (keyword) => {
      const match = roomRes.rows.find(r => r.room_name.includes(keyword));
      return match ? match.id : null;
    };
    const getProcId = (keyword) => {
      const match = procRes.rows.find(r => r.process_name.includes(keyword));
      return match ? match.id : null;
    };

    const lotsToInsert = [
      { sku: 'JHD301', lot: '009/26', qty: 48, process: 'ผสม', room: '4', status: 'IN_PROGRESS' },
      { sku: 'JHD318', lot: '004/26', qty: 16, process: 'แช่', room: '5', status: 'WAITING' },
      { sku: 'JHD310', lot: '005/26', qty: 2, process: 'ผสม', room: '5', status: 'WAITING' },
      { sku: 'JHD317', lot: '004/26', qty: 18, process: 'บรรจุ', room: '206', status: 'IN_PROGRESS' },
      { sku: 'JHD301', lot: '009/26', qty: 48, process: 'บรรจุ', room: '207', status: 'IN_PROGRESS' },
      { sku: 'JHD310', lot: '004/26', qty: 2, process: 'บรรจุ', room: '222', status: 'IN_PROGRESS' },
      { sku: 'JHD318', lot: '004/26', qty: 16, process: 'บรรจุ', room: '222', status: 'WAITING' },
      { sku: 'JHD309', lot: '010/26', qty: 6, process: 'บรรจุ', room: '210', status: 'WAITING' },
      { sku: 'JHD299', lot: '005/26', qty: 33300, process: 'บรรจุ', room: '208', status: 'IN_PROGRESS' },
      { sku: 'SST03', lot: '660196', qty: 6, process: 'ผสม', room: '5', status: 'IN_PROGRESS' }
    ];

    for (const lot of lotsToInsert) {
      const skuId = getSkuId(lot.sku);
      if (!skuId) {
        console.log('SKU not found:', lot.sku);
        continue;
      }

      // Check if lot exists
      const existRes = await pgClient.query("SELECT id FROM production_lots WHERE sku_id = $1 AND lot_no = $2", [skuId, lot.lot]);
      let lotId;
      if (existRes.rows.length > 0) {
        lotId = existRes.rows[0].id;
      } else {
        const insertRes = await pgClient.query(`
          INSERT INTO production_lots (sku_id, lot_no, total_tanks, current_process_id, current_room_id, current_status)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [skuId, lot.lot, lot.qty, getProcId(lot.process), getRoomId(lot.room), lot.status]);
        lotId = insertRes.rows[0].id;
      }

      // Insert log
      await pgClient.query(`
        INSERT INTO production_logs (production_lot_id, process_id, room_id, status, activity_date)
        VALUES ($1, $2, $3, $4, $5)
      `, [lotId, getProcId(lot.process), getRoomId(lot.room), lot.status, new Date().toISOString().split('T')[0]]);
      
      console.log(`Inserted lot ${lot.sku} ${lot.lot}`);
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

seedData();
