const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(url, key, { auth: { persistSession: false } });

function assert(condition, message, actual) {
  if (!condition) {
    console.error(`❌ FAIL: ${message} (Actual: ${actual})`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runVerification() {
  console.log('================================================================');
  console.log('COSMEFLOW ASSURANCE — PHASE 5 DEFECT 01 COMPREHENSIVE VERIFICATION');
  console.log('================================================================\n');

  // Test Lot to exercise all paths: LOT-2026-0058
  const { data: lot58 } = await sb
    .from('qms_batch_releases')
    .select('*')
    .eq('lot_no', 'LOT-2026-0058')
    .single();

  assert(!!lot58, 'LOT-2026-0058 release record found');

  // -------------------------------------------------------------
  // TEST 1: QA_RELEASED Path Verification
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing QA_RELEASED Path ---');
  const { data: resRelease, error: errRelease } = await sb.rpc('qms_record_batch_release_disposition', {
    p_release_id: lot58.id,
    p_decision: 'QA_RELEASED',
    p_rationale: 'All gates verified and compliant with ISO 22716. Approved for release.',
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_user_name: 'ภญ. วริศรา มั่นคง',
    p_user_role: 'QA_MANAGER',
  });
  assert(!errRelease, 'QA_RELEASED executed without error', errRelease?.message);

  const { data: lotAfterRelease } = await sb.from('qms_batch_releases').select('*').eq('id', lot58.id).single();
  assert(lotAfterRelease.overall_status === 'QA_RELEASED', 'overall_status is QA_RELEASED');
  assert(lotAfterRelease.current_disposition === 'QA_RELEASED', 'current_disposition is QA_RELEASED');
  assert(!!lotAfterRelease.disposition_at, 'disposition_at is populated');
  assert(!!lotAfterRelease.released_at, 'released_at is populated');
  assert(lotAfterRelease.released_by_name === 'ภญ. วริศรา มั่นคง', 'released_by_name is correctly saved');
  assert(lotAfterRelease.record_version === 2, 'record_version incremented to 2');

  // Check audit trail
  const { data: auditRelease } = await sb
    .from('qms_audit_trail')
    .select('*')
    .eq('record_id', lot58.id)
    .order('created_at', { ascending: false })
    .limit(1);
  assert(auditRelease.length > 0, 'Audit trail entry created');
  assert(auditRelease[0].action_type === 'QA_DISPOSITION_QA_RELEASED', 'Audit action type is QA_DISPOSITION_QA_RELEASED');

  // -------------------------------------------------------------
  // TEST 2: QA_ON_HOLD Path Verification
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing QA_ON_HOLD Path ---');
  const { data: resHold, error: errHold } = await sb.rpc('qms_record_batch_release_disposition', {
    p_release_id: lot58.id,
    p_decision: 'QA_ON_HOLD',
    p_rationale: 'Temporary QA Hold placed for secondary verification.',
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_user_name: 'ภญ. วริศรา มั่นคง',
    p_user_role: 'QA_MANAGER',
  });
  assert(!errHold, 'QA_ON_HOLD executed without error', errHold?.message);

  const { data: lotAfterHold } = await sb.from('qms_batch_releases').select('*').eq('id', lot58.id).single();
  assert(lotAfterHold.overall_status === 'QA_ON_HOLD', 'overall_status is QA_ON_HOLD');
  assert(lotAfterHold.current_disposition === 'QA_ON_HOLD', 'current_disposition is QA_ON_HOLD');
  assert(lotAfterHold.released_at === null, 'released_at is cleared/null on hold');
  assert(lotAfterHold.record_version === 3, 'record_version incremented to 3');

  // -------------------------------------------------------------
  // TEST 3: QA_REJECTED Path Verification (Controlled Non-Conformance)
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing QA_REJECTED Path ---');
  const { data: resReject, error: errReject } = await sb.rpc('qms_record_batch_release_disposition', {
    p_release_id: lot58.id,
    p_decision: 'QA_REJECTED',
    p_rationale: 'Rejected due to out of spec test. Routed for Rework.',
    p_non_conformance_path: 'REWORK_CONSIDERATION',
    p_rework_protocol_no: 'RWK-2026-9999',
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_user_name: 'ภญ. วริศรา มั่นคง',
    p_user_role: 'QA_MANAGER',
  });
  assert(!errReject, 'QA_REJECTED executed without error', errReject?.message);

  const { data: lotAfterReject } = await sb.from('qms_batch_releases').select('*').eq('id', lot58.id).single();
  assert(lotAfterReject.overall_status === 'QA_REJECTED', 'overall_status is QA_REJECTED');
  assert(lotAfterReject.current_disposition === 'QA_REJECTED', 'current_disposition is QA_REJECTED');
  assert(lotAfterReject.non_conformance_path === 'REWORK_CONSIDERATION', 'non_conformance_path is recorded');
  assert(lotAfterReject.rework_protocol_no === 'RWK-2026-9999', 'rework_protocol_no is recorded');
  assert(lotAfterReject.released_at === null, 'released_at is null on reject');

  // -------------------------------------------------------------
  // TEST 4: Transaction Rollback Integrity on Hard Blocked Lot
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Transaction Rollback Integrity (LOT-2026-0051) ---');
  const { data: lot51Before } = await sb
    .from('qms_batch_releases')
    .select('id, lot_no, overall_status, record_version')
    .eq('lot_no', 'LOT-2026-0051')
    .single();

  const { data: dispCountBefore } = await sb
    .from('qms_batch_release_dispositions')
    .select('id')
    .eq('batch_release_id', lot51Before.id);

  // Attempt unauthorized release on blocked lot
  const { data: resBlocked, error: errBlocked } = await sb.rpc('qms_record_batch_release_disposition', {
    p_release_id: lot51Before.id,
    p_decision: 'QA_RELEASED',
    p_rationale: 'Attempting invalid release on blocked lot',
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_user_name: 'ภญ. วริศรา มั่นคง',
    p_user_role: 'QA_MANAGER',
  });

  assert(!!errBlocked, 'RPC correctly threw an error for blocked lot');
  console.log(`Reported block message: "${errBlocked.message}"`);

  // Verify state after failure
  const { data: lot51After } = await sb
    .from('qms_batch_releases')
    .select('id, lot_no, overall_status, record_version, current_disposition')
    .eq('id', lot51Before.id)
    .single();

  assert(lot51After.overall_status === 'BLOCKED', 'Batch status remained BLOCKED (No partial update)');
  assert(lot51After.current_disposition === null, 'current_disposition remained NULL');
  assert(lot51After.record_version === lot51Before.record_version, 'record_version was NOT incremented');

  const { data: dispCountAfter } = await sb
    .from('qms_batch_release_dispositions')
    .select('id')
    .eq('batch_release_id', lot51Before.id);

  assert(dispCountAfter.length === dispCountBefore.length, 'NO orphan disposition record created (0 leaked rows)');

  // -------------------------------------------------------------
  // TEST 5: Clean Reset of UAT Cases A & I (LOT-2026-0050 & LOT-2026-0058)
  // -------------------------------------------------------------
  console.log('\n--- 5. Resetting UAT Cases to Pristine Pre-Release State ---');
  for (const lotNo of ['LOT-2026-0050', 'LOT-2026-0058']) {
    const { data: rel } = await sb.from('qms_batch_releases').select('id').eq('lot_no', lotNo).single();
    if (rel) {
      await sb.from('qms_batch_release_dispositions').delete().eq('batch_release_id', rel.id);
      await sb.from('qms_batch_releases').update({
        overall_status: 'READY_FOR_QA_REVIEW',
        current_disposition: null,
        disposition_notes: null,
        disposition_at: null,
        disposition_by: null,
        disposition_by_name: null,
        disposition_by_role: null,
        released_at: null,
        released_by: null,
        released_by_name: null,
        non_conformance_path: null,
        rework_protocol_no: null,
        record_version: 1,
        updated_at: new Date().toISOString(),
      }).eq('id', rel.id);

      const { data: checkRel } = await sb.from('qms_batch_releases').select('*').eq('id', rel.id).single();
      const { data: checkDisps } = await sb.from('qms_batch_release_dispositions').select('id').eq('batch_release_id', rel.id);

      assert(checkRel.overall_status === 'READY_FOR_QA_REVIEW', `${lotNo} status is READY_FOR_QA_REVIEW`);
      assert(checkRel.current_disposition === null, `${lotNo} current_disposition is NULL`);
      assert(checkDisps.length === 0, `${lotNo} has 0 disposition records (Pristine state)`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 ALL DEFECT 01 VERIFICATION TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runVerification().catch(e => {
  console.error('Fatal error during verification:', e);
  process.exit(1);
});
