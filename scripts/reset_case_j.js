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
  console.log('Resetting CASE J (LOT-2026-0058) for Manual UAT...');

  await client.query(`
    UPDATE qms_batch_releases
    SET coa_status = 'NOT_GENERATED',
        coa_data = NULL,
        coa_approved_at = NULL,
        coa_approved_by = NULL,
        coa_approved_by_name = NULL,
        updated_at = NOW()
    WHERE lot_no = 'LOT-2026-0058';
  `);

  const r = await client.query(`
    SELECT lot_no, sku_code, product_name, overall_status, is_blocked, coa_status, (coa_data IS NOT NULL) as has_coa
    FROM qms_batch_releases
    WHERE lot_no = 'LOT-2026-0058';
  `);
  console.log('CASE J current state:', r.rows[0]);

  await client.end();
}

main().catch(console.error);
