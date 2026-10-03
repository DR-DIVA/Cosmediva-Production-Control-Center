const pg = require('pg');
require('dotenv').config({ path: '.env.local' });
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const client = new pg.Client({ 
  connectionString: `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const relRes = await client.query("SELECT id, release_no, lot_no, overall_status, current_disposition, disposition_at, record_version FROM qms_batch_releases WHERE lot_no IN ('LOT-2026-0050', 'LOT-2026-0058');");
  console.log('Releases:', relRes.rows);

  for (const r of relRes.rows) {
    const dispRes = await client.query("SELECT id, decision, reason_rationale, authorized_by_name, authorized_at, record_version FROM qms_batch_release_dispositions WHERE batch_release_id = $1;", [r.id]);
    console.log(`Dispositions for ${r.lot_no}:`, dispRes.rows);
  }
  await client.end();
}

main().catch(console.error);
