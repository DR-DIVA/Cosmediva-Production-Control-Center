const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const client = new pg.Client({
  connectionString: `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('--- Updating Company Master Legal Identity ---');

  // Check current
  const before = await client.query("SELECT * FROM companies WHERE company_code = 'COSMEDIVA' OR is_active = true;");
  console.log('Before update:', before.rows);

  // Update company legal name
  const res = await client.query(`
    UPDATE companies
    SET company_name = 'บริษัท คอสเมดิวา จำกัด',
        company_name_en = 'COSMEDIVA CO., LTD.',
        updated_at = NOW()
    WHERE company_code = 'COSMEDIVA' OR id = '6ef64c03-4117-495f-993c-715430adda5a'
    RETURNING *;
  `);

  console.log('Updated Company Master:', res.rows[0]);
  await client.end();
}

main().catch(console.error);
