import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function fix() {
  await pgClient.connect();
  try {
    const res = await pgClient.query(`
      SELECT l.*, p.process_name, pl.lot_no 
      FROM production_logs l 
      JOIN processes p ON l.process_id = p.id 
      JOIN production_lots pl ON l.production_lot_id = pl.id 
      WHERE pl.lot_no = '009/26' AND p.process_name = 'ผสม' AND l.status = 'COMPLETED'
    `);
    
    console.log("Mix completed tasks for 009/26:", res.rows);

    if (res.rows.length > 0) {
      const task = res.rows.find(r => r.tank_start === '1' && r.tank_end === '2');
      if (task) {
        // Insert into QC
        const qcProcRes = await pgClient.query("SELECT id FROM processes WHERE process_name = 'รอ QC'");
        const qcProcId = qcProcRes.rows[0].id;
        
        await pgClient.query(`
          INSERT INTO production_logs (production_lot_id, process_id, status, activity_date, tank_start, tank_end, total_tanks)
          VALUES ($1, $2, 'WAITING', NOW(), '1', '2', $3)
        `, [task.production_lot_id, qcProcId, task.total_tanks]);
        console.log("Inserted QC task for tanks 1-2!");
      }
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

fix();
