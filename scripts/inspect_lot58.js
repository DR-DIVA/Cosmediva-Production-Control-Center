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
  const rel = await client.query("SELECT id FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0058';");
  const gates = await client.query("SELECT gate_number, gate_code, gate_title_en, requirement_level, status, is_hard_block, na_reason, linked_data FROM qms_batch_release_gate_evaluations WHERE batch_release_id = $1 ORDER BY gate_number;", [rel.rows[0].id]);
  console.log('\nGates on LOT-2026-0058:');
  for (const g of gates.rows) {
    console.log(`Gate ${g.gate_number}: ${g.gate_code} | req: ${g.requirement_level} | status: ${g.status} | na_reason: ${g.na_reason}`);
    if (g.gate_code === 'GATE_06_QC_PHYS' || g.gate_code === 'GATE_07_MICRO') {
      console.log('  linked_data:', JSON.stringify(g.linked_data));
    }
  }

  // Also check LOT-2026-0050
  const relA = await client.query("SELECT id FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0050';");
  const gatesA = await client.query("SELECT gate_number, gate_code, gate_title_en, requirement_level, status, is_hard_block, na_reason, linked_data FROM qms_batch_release_gate_evaluations WHERE batch_release_id = $1 ORDER BY gate_number;", [relA.rows[0].id]);
  console.log('\nGates on LOT-2026-0050:');
  for (const g of gatesA.rows) {
    if (g.gate_code === 'GATE_06_QC_PHYS' || g.gate_code === 'GATE_07_MICRO') {
      console.log(`Gate ${g.gate_number}: ${g.gate_code} | req: ${g.requirement_level} | status: ${g.status}`);
      console.log('  linked_data:', JSON.stringify(g.linked_data));
    }
  }

  await client.end();
}

main().catch(console.error);
