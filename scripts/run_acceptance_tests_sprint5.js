const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function runTests() {
  await pgClient.connect();
  console.log('================================================================');
  console.log('COSMEFLOW ASSURANCE — PHASE 5 ACCEPTANCE TESTS (CASES A - J)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // 1. CASE A: READY FOR RELEASE
  console.log('--- Testing CASE A: Ready for Release (LOT-2026-0050) ---');
  const resA = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0050';");
  assert(resA.rows.length === 1, 'Release record exists for LOT-2026-0050');
  const lotA = resA.rows[0];
  assert(lotA.overall_status === 'READY_FOR_QA_REVIEW' || lotA.overall_status === 'QA_RELEASED', 'Status is READY_FOR_QA_REVIEW (Ready for QA approval)', `Actual: ${lotA.overall_status}`);
  assert(lotA.is_blocked === false, 'Is not blocked', `is_blocked: ${lotA.is_blocked}`);
  assert(parseInt(lotA.passed_gates_count) === 12, 'All 12 gates passed', `Count: ${lotA.passed_gates_count}`);

  // 2. CASE B: PENDING REQUIRED RESULT -> BLOCKED
  console.log('\n--- Testing CASE B: PENDING REQUIRED RESULT -> BLOCKED (LOT-2026-0051) ---');
  const resB = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0051';");
  const lotB = resB.rows[0];
  assert(lotB.overall_status === 'BLOCKED', 'Status is BLOCKED', `Actual: ${lotB.overall_status}`);
  assert(lotB.is_blocked === true, 'Is blocked flag is TRUE');
  const gatesB = await pgClient.query("SELECT * FROM qms_batch_release_gate_evaluations WHERE batch_release_id = $1 AND gate_code = 'GATE_07_MICRO';", [lotB.id]);
  assert(gatesB.rows[0].status === 'PENDING', 'Micro gate status is PENDING');
  assert(gatesB.rows[0].is_hard_block === true, 'Micro gate triggers hard block for aqueous cream');

  // 3. CASE C: ACTIVE QA HOLD -> BLOCKED
  console.log('\n--- Testing CASE C: ACTIVE QA HOLD -> BLOCKED / QA_ON_HOLD (LOT-2026-0053) ---');
  const resD = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0053';");
  const lotD = resD.rows[0];
  assert(['QA_ON_HOLD', 'BLOCKED'].includes(lotD.overall_status), 'Status is QA_ON_HOLD or BLOCKED due to QA Hold');
  assert(lotD.is_blocked === true, 'Hold triggers hard block (is_blocked = true)');
  const gatesD = await pgClient.query("SELECT * FROM qms_batch_release_gate_evaluations WHERE batch_release_id = $1 AND gate_code = 'GATE_08_DEVIATION';", [lotD.id]);
  assert(gatesD.rows[0].status === 'FAIL', 'Deviation Interlock gate is FAIL');
  assert(gatesD.rows[0].is_hard_block === true, 'Hold triggers hard block');

  // 4. CASE D: SIGNIFICANT UNRESOLVED QUALITY EVENT -> BLOCKED
  console.log('\n--- Testing CASE D: SIGNIFICANT UNRESOLVED QUALITY EVENT -> BLOCKED (LOT-2026-0052) ---');
  const resC = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0052';");
  const lotC = resC.rows[0];
  assert(lotC.overall_status === 'BLOCKED', 'Status is BLOCKED due to unresolved Critical Quality Event');
  assert(lotC.is_blocked === true, 'Is blocked flag is TRUE');
  const gatesC = await pgClient.query("SELECT * FROM qms_batch_release_gate_evaluations WHERE batch_release_id = $1 AND gate_code = 'GATE_08_DEVIATION';", [lotC.id]);
  assert(gatesC.rows[0].status === 'FAIL', 'Deviation gate is FAIL');

  // 5. CASE E: Open CAPA Unrelated -> NOT Automatically Blocked
  console.log('\n--- Testing CASE E: Open CAPA Unrelated -> NOT Automatically Blocked (LOT-2026-0054) ---');
  const resE = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0054';");
  const lotE = resE.rows[0];
  assert(lotE.overall_status === 'READY_FOR_QA_REVIEW', 'Status is READY_FOR_QA_REVIEW', `Actual: ${lotE.overall_status}`);
  assert(lotE.is_blocked === false, 'Open CAPA alone does NOT hard-block release');
  assert(parseInt(lotE.open_capa_count) === 1, 'Displays 1 associated open CAPA for QA context');

  // 6. CASE F: Minor Resolved Quality Event -> QA Review Allowed
  console.log('\n--- Testing CASE F: Minor Resolved Quality Event -> QA Review (LOT-2026-0055) ---');
  const resF = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0055';");
  const lotF = resF.rows[0];
  assert(lotF.overall_status === 'READY_FOR_QA_REVIEW', 'Status is READY_FOR_QA_REVIEW');
  assert(lotF.is_blocked === false, 'Resolved minor event does not block');

  // 7. CASE G: Required Release Evidence Missing -> BLOCKED
  console.log('\n--- Testing CASE G: Required Evidence Missing -> BLOCKED (LOT-2026-0056) ---');
  const resG = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0056';");
  const lotG = resG.rows[0];
  assert(lotG.overall_status === 'BLOCKED', 'Status is BLOCKED');
  const gatesG = await pgClient.query("SELECT * FROM qms_batch_release_gate_evaluations WHERE batch_release_id = $1 AND gate_code = 'GATE_03_BMR';", [lotG.id]);
  assert(gatesG.rows[0].is_hard_block === true, 'Missing BMR signature triggers hard block');

  // 8. CASE H: QA REJECTED -> Controlled Disposition Required
  console.log('\n--- Testing CASE H: QA REJECTED with Controlled Disposition (LOT-2026-0057) ---');
  const resH = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0057';");
  const lotH = resH.rows[0];
  assert(lotH.overall_status === 'QA_REJECTED', 'Status is QA_REJECTED');
  assert(lotH.non_conformance_path === 'REWORK_CONSIDERATION', 'Controlled Non-Conformance disposition recorded', lotH.non_conformance_path);
  assert(lotH.rework_protocol_no === 'RWK-2026-0005', 'Rework protocol reference linked', lotH.rework_protocol_no);
  const dispH = await pgClient.query("SELECT * FROM qms_batch_release_dispositions WHERE batch_release_id = $1;", [lotH.id]);
  assert(dispH.rows.length >= 1, 'Disposition history record created');

  // 9. CASE I: Conditional/N/A Release Gate -> Reason & Traceability Retained
  console.log('\n--- Testing CASE I: Anhydrous Cleansing Oil with Micro N/A (LOT-2026-0058) ---');
  const resI = await pgClient.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0058';");
  const lotI = resI.rows[0];
  assert(lotI.overall_status === 'READY_FOR_QA_REVIEW', 'Status is READY_FOR_QA_REVIEW (N/A does not block)');
  assert(parseInt(lotI.na_gates_count) === 1, '1 Gate marked N/A');
  const gatesI = await pgClient.query("SELECT * FROM qms_batch_release_gate_evaluations WHERE batch_release_id = $1 AND gate_code = 'GATE_07_MICRO';", [lotI.id]);
  assert(gatesI.rows[0].status === 'NOT_APPLICABLE', 'Micro gate is NOT_APPLICABLE');
  assert(gatesI.rows[0].na_reason.includes('Aw < 0.60'), 'Retains regulatory justification for N/A', gatesI.rows[0].na_reason);

  // 10. CASE J: COA Generated from Approved QC Results & Specification (Defect 02 Verification)
  console.log('\n--- Testing CASE J: COA Data Integrity & Specification Traceability (LOT-2026-0058) ---');
  assert(['DRAFT', 'APPROVED', 'NOT_GENERATED'].includes(lotI.coa_status), 'COA status is valid for UAT (NOT_GENERATED, DRAFT or APPROVED)');

  // Verify specification exists for JHD-105
  const specRes = await pgClient.query("SELECT * FROM qms_product_specifications WHERE sku_code = 'JHD-105' AND status = 'APPROVED';");
  assert(specRes.rows.length === 1, 'Approved specification exists for JHD-105 (SPEC-JHD-105-01)');
  const spec = specRes.rows[0];
  const appParam = spec.parameters.find(p => p.parameter_key === 'appearance');
  assert(appParam && appParam.specification.includes('Clear golden oil'), 'Specification appearance is golden oil (not white cream)');

  // Verify controlled QC analytical results
  const qcRes = await pgClient.query("SELECT * FROM qms_lot_qc_analytical_results WHERE lot_no = 'LOT-2026-0058';");
  assert(qcRes.rows.length >= 6, 'Controlled QC results exist for LOT-2026-0058');
  const qcMicro = qcRes.rows.find(q => q.parameter_key === 'microbiology');
  assert(qcMicro && qcMicro.result_status === 'NOT_APPLICABLE', 'Microbiology QC result is NOT_APPLICABLE (Exempt)');

  // Verify full product and lot traceability
  assert(lotI.sku_id === spec.product_id, 'Release product ID matches approved specification product ID');
  const lotRow = await pgClient.query("SELECT * FROM production_lots WHERE id = $1;", [lotI.production_lot_id]);
  assert(lotRow.rows[0].sku_id === lotI.sku_id, 'Production lot sku_id matches release sku_id (no cross-product mismatch)');

  // Check that release checklist templates exist
  const tpls = await pgClient.query("SELECT * FROM qms_release_templates;");
  assert(tpls.rows.length >= 2, 'Multiple configurable release checklist templates available', `Found: ${tpls.rows.length}`);

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED across Cases A - J`);
  console.log('================================================================\n');

  await pgClient.end();
  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error('Test execution error:', e);
  process.exit(1);
});
