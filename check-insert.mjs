import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const { Client } = pg;
const pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function checkInsert() {
  await pgClient.connect();
  
  // Find a product
  const prodRes = await pgClient.query("SELECT id FROM products LIMIT 1");
  const productId = prodRes.rows[0].id;
  
  // Try inserting
  try {
    const res = await pgClient.query(`
      INSERT INTO production_lots (product_id, lot_number, target_quantity, current_status)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [productId, '010/26', 1000, 'PLANNED']);
    console.log('Inserted:', res.rows[0]);
    
    // cleanup
    await pgClient.query("DELETE FROM production_lots WHERE id = $1", [res.rows[0].id]);
  } catch(e) {
    console.error('Insert error:', e.message);
  }
  
  await pgClient.end();
}

checkInsert();
