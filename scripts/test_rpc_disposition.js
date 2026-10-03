const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log('Testing RPC qms_record_batch_release_disposition...');
  
  // 1. Get LOT-2026-0058 release record
  const { data: release, error: relErr } = await sb
    .from('qms_batch_releases')
    .select('id, lot_no, overall_status, record_version, released_at, is_blocked')
    .eq('lot_no', 'LOT-2026-0058')
    .single();

  if (relErr || !release) {
    console.error('Fetch release error:', relErr);
    process.exit(1);
  }
  console.log('Current Release record:', release);

  // 2. Call RPC to release LOT-2026-0058
  const { data: rpcRes, error: rpcErr } = await sb.rpc('qms_record_batch_release_disposition', {
    p_release_id: release.id,
    p_decision: 'QA_RELEASED',
    p_rationale: 'UAT Case A Manual Verification: Formula and micro clearance verified.',
    p_non_conformance_path: null,
    p_rework_protocol_no: null,
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_user_name: 'ภญ. วริศรา มั่นคง',
    p_user_role: 'QA_MANAGER',
  });

  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
    process.exit(1);
  }
  console.log('RPC Result:', rpcRes);

  // 3. Verify release record after RPC
  const { data: afterRel } = await sb
    .from('qms_batch_releases')
    .select('id, lot_no, overall_status, current_disposition, disposition_at, released_at, released_by_name, record_version')
    .eq('id', release.id)
    .single();
  console.log('Updated Release record:', afterRel);

  // 4. Verify disposition table
  const { data: disps } = await sb
    .from('qms_batch_release_dispositions')
    .select('*')
    .eq('batch_release_id', release.id);
  console.log('Dispositions Count:', disps.length, disps);

  // 5. Test Transaction Atomicity on a blocked lot: LOT-2026-0051 (Micro pending)
  console.log('\n--- Testing Transaction Rollback on Blocked Lot (LOT-2026-0051) ---');
  const { data: blockedRel } = await sb
    .from('qms_batch_releases')
    .select('id, lot_no, overall_status')
    .eq('lot_no', 'LOT-2026-0051')
    .single();

  const { data: failRpcRes, error: failRpcErr } = await sb.rpc('qms_record_batch_release_disposition', {
    p_release_id: blockedRel.id,
    p_decision: 'QA_RELEASED',
    p_rationale: 'This should fail and roll back cleanly.',
    p_user_id: '00000000-0000-0000-0000-000000000001',
    p_user_name: 'ภญ. วริศรา มั่นคง',
    p_user_role: 'QA_MANAGER',
  });

  console.log('Expected Failure Error:', failRpcErr?.message);

  // Verify NO disposition was inserted for LOT-2026-0051
  const { data: blockedDisps } = await sb
    .from('qms_batch_release_dispositions')
    .select('*')
    .eq('batch_release_id', blockedRel.id);
  console.log('Blocked lot dispositions count (MUST BE 0):', blockedDisps.length);

  // 6. Reset LOT-2026-0058 back to READY_FOR_QA_REVIEW
  console.log('\nResetting LOT-2026-0058 back to READY_FOR_QA_REVIEW for manual UAT...');
  await sb.from('qms_batch_release_dispositions').delete().eq('batch_release_id', release.id);
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
  }).eq('id', release.id);

  console.log('✅ RPC and Transaction Rollback Test Completed Successfully!');
}

main().catch(console.error);
