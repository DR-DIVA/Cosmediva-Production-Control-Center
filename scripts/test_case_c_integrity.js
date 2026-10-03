const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(url, key, { auth: { persistSession: false } });

function assert(cond, msg, actual) {
  if (!cond) {
    console.error(`❌ FAIL: ${msg} (Actual: ${actual})`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function main() {
  console.log('Testing CASE C: Active QA Hold Integrity & Bypass Prevention...\n');

  // 1. Fetch LOT-2026-0053
  const { data: release } = await sb
    .from('qms_batch_releases')
    .select('*, gate_evaluations:qms_batch_release_gate_evaluations(*)')
    .eq('lot_no', 'LOT-2026-0053')
    .single();

  assert(!!release, 'LOT-2026-0053 release record exists');
  assert(release.overall_status === 'QA_ON_HOLD', 'Status is QA_ON_HOLD', release.overall_status);
  assert(release.is_blocked === true, 'is_blocked is true', release.is_blocked);
  assert(release.blocking_reasons.length > 0, 'blocking_reasons contains active QA hold');
  console.log('Blocking reason:', release.blocking_reasons[0].reason);

  // 2. Test Gate 8 Status
  const gate8 = release.gate_evaluations.find((g) => g.gate_code === 'GATE_08_DEVIATION');
  assert(gate8.status === 'FAIL', 'Gate 8 is FAIL', gate8.status);
  assert(gate8.is_hard_block === true, 'Gate 8 is hard block');

  // 3. Test Attempted QA Release via RPC (must FAIL and ROLL BACK)
  console.log('\n--- Testing QA Release Disposition Block via Atomic Transaction ---');
  const { data: failRpcRes, error: failRpcErr } = await sb.rpc('qms_record_batch_release_disposition', {
    p_release_id: release.id,
    p_decision: 'QA_RELEASED',
    p_rationale: 'Attempting illegal release on held lot',
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_user_name: 'Test QA',
    p_user_role: 'QA_MANAGER',
  });

  assert(!!failRpcErr, 'Attempted release was correctly BLOCKED by database transaction');
  console.log(`Expected block error: "${failRpcErr?.message}"`);

  // Verify DB state after blocked attempt
  const { data: checkAfter } = await sb.from('qms_batch_releases').select('*').eq('id', release.id).single();
  assert(checkAfter.overall_status === 'QA_ON_HOLD', 'Status remains QA_ON_HOLD');
  assert(checkAfter.current_disposition === null, 'No disposition set');

  const { data: disps } = await sb.from('qms_batch_release_dispositions').select('*').eq('batch_release_id', release.id);
  assert(disps.length === 0, 'Zero disposition records created (0 partial state)');

  // 4. Verify Linked Quality Event
  console.log('\n--- Verifying Linked Quality Event (QE-2026-0053) ---');
  const { data: qe } = await sb
    .from('qms_quality_events')
    .select('*')
    .eq('event_no', 'QE-2026-0053')
    .single();

  assert(!!qe, 'QE-2026-0053 exists');
  assert(qe.current_status === 'CONTAINMENT_ACTIVE', 'QE status is CONTAINMENT_ACTIVE', qe.current_status);
  assert(qe.containment_status === 'CONTAINED', 'Containment status is CONTAINED', qe.containment_status);
  assert(qe.qa_confirmed_severity === 'CRITICAL', 'Severity is CRITICAL');
  assert(qe.production_lot_id === release.production_lot_id, 'Linked to exact same production lot ID');

  console.log('\n================================================================');
  console.log('🎉 CASE C (ACTIVE QA HOLD) FULLY VERIFIED — ZERO BYPASS ALLOWED');
  console.log('================================================================\n');
}

main().catch(console.error);
