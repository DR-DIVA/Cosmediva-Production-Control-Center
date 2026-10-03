const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

// We can also test the action directly or test the database state
async function main() {
  await client.connect();
  console.log('================================================================');
  console.log('TESTING DEFECT 02 RESOLUTION: COA SOURCE & SPEC INTEGRITY GUARD');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // 1. Verify Product Master for JHD-105
  console.log('--- 1. Testing Product Master Mapping ---');
  const prod105 = await client.query("SELECT * FROM products WHERE sku = 'JHD-105';");
  assert(prod105.rows.length === 1, 'Product JHD-105 exists in products table');
  assert(prod105.rows[0].product_name === 'CosmeDiva Pure Argan Cleansing Oil 100ml', 'Product name matches JHD-105 exactly');

  // 2. Verify Specification for JHD-105
  console.log('\n--- 2. Testing Approved Product Specification ---');
  const spec105 = await client.query("SELECT * FROM qms_product_specifications WHERE sku_code = 'JHD-105' AND status = 'APPROVED';");
  assert(spec105.rows.length === 1, 'Approved specification exists for JHD-105');
  const spec = spec105.rows[0];
  assert(spec.spec_code === 'SPEC-JHD-105-01', 'Spec code is SPEC-JHD-105-01');
  assert(spec.product_category === 'ANHYDROUS_SERUM_OIL', 'Product category is ANHYDROUS_SERUM_OIL');

  const params = spec.parameters;
  const appParam = params.find(p => p.parameter_key === 'appearance');
  assert(appParam && appParam.specification.includes('Clear golden oil'), 'Appearance spec specifies golden oil (not white cream!)', appParam?.specification);

  const microParam = params.find(p => p.parameter_key === 'microbiology');
  assert(microParam && microParam.exemption_allowed === true, 'Microbiology test has exemption_allowed = true for anhydrous formulation');
  assert(microParam && microParam.specification.includes('ISO 29621'), 'Exemption references ISO 29621 / Aw < 0.60');

  // 3. Verify Batch Release and Production Lot Reference
  console.log('\n--- 3. Testing Release and Production Lot Traceability ---');
  const rel105 = await client.query("SELECT * FROM qms_batch_releases WHERE lot_no = 'LOT-2026-0058';");
  assert(rel105.rows.length === 1, 'Batch release record exists for LOT-2026-0058');
  const release = rel105.rows[0];

  const lot105 = await client.query("SELECT * FROM production_lots WHERE id = $1;", [release.production_lot_id]);
  assert(lot105.rows.length === 1, 'Production lot record exists');
  const lot = lot105.rows[0];

  assert(release.sku_id === lot.sku_id, 'Release sku_id matches Production Lot sku_id (Traceability Guard 1)');
  assert(release.sku_id === prod105.rows[0].id, 'Release sku_id matches products.id (Traceability Guard 2)');
  assert(release.sku_code === prod105.rows[0].sku, 'Release sku_code matches products.sku');
  assert(release.production_lot_id === lot.id, 'Release production_lot_id matches lot.id');
  assert(release.lot_no === lot.lot_no, 'Release lot_no matches lot.lot_no');

  // 4. Verify Controlled QC Analytical Results in DB
  console.log('\n--- 4. Testing Controlled Analytical QC Results ---');
  const qcRows = await client.query("SELECT * FROM qms_lot_qc_analytical_results WHERE lot_no = 'LOT-2026-0058' ORDER BY created_at;");
  assert(qcRows.rows.length >= 6, 'Controlled QC results exist for LOT-2026-0058', `Found: ${qcRows.rows.length}`);

  const qcMicro = qcRows.rows.find(q => q.parameter_key === 'microbiology');
  assert(qcMicro && qcMicro.result_status === 'NOT_APPLICABLE', 'QC result for microbiology is NOT_APPLICABLE');
  assert(qcMicro && !qcMicro.actual_result.includes('< 10'), 'ZERO fabricated microbial counts in QC records');

  // 5. Test Server Action generateCoaData Execution
  console.log('\n--- 5. Testing Server Action generateCoaData Execution ---');
  const createJiti = require('jiti');
  const jiti = createJiti(__filename, { alias: { '@/*': './src/*' } });
  const { generateCoaData } = jiti('../src/app/actions/qms_batch_release.ts');

  const coa = await generateCoaData(release.id, {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'ภญ. วริศรา มั่นคง (QA Manager)'
  });

  assert(coa !== null, 'generateCoaData returned COA object');
  assert(coa.coa_no === 'COA-LOT-2026-0058', 'COA number is COA-LOT-2026-0058');
  assert(coa.batch_info.sku_code === 'JHD-105', 'Batch info SKU code is JHD-105');
  assert(coa.batch_info.product_name === 'CosmeDiva Pure Argan Cleansing Oil 100ml', 'Batch info product name is Pure Argan Cleansing Oil');
  assert(coa.specification_reference.includes('SPEC-JHD-105-01'), 'COA references approved spec SPEC-JHD-105-01');

  // Verify parameters inside generated COA
  const coaApp = coa.test_results.find(r => r.parameter_key === 'appearance');
  assert(coaApp && coaApp.specification.includes('Clear golden oil'), 'COA appearance specification is golden oil (NO cream text!)');
  assert(coaApp && coaApp.actual_result.includes('Conforms'), 'COA appearance result conforms');

  const coaMicro = coa.test_results.find(r => r.parameter_key === 'microbiology');
  assert(coaMicro && coaMicro.result_status === 'NOT_APPLICABLE', 'COA microbiology status is NOT_APPLICABLE');
  assert(coaMicro && coaMicro.actual_result.includes('NOT APPLICABLE'), 'COA microbiology actual result shows NOT APPLICABLE');
  assert(!JSON.stringify(coa.test_results).includes('< 10 CFU/g'), 'ZERO fabricated TAMC/TYMC counts in COA');
  assert(!JSON.stringify(coa.test_results).includes('Not Detected'), 'ZERO fabricated Pathogen result in COA for exempt lot');

  assert(coa.conclusion.includes('ISO 29621'), 'COA conclusion specifically states ISO 29621 micro exemption for anhydrous oil');

  // 6. Test Hard Integrity Guard: Intentionally induce cross-product mismatch
  console.log('\n--- 6. Testing Hard Integrity Guard Blocking ---');
  let guardTriggered = false;
  const otherProd = await client.query("SELECT id FROM products WHERE sku = 'JHD-309';");
  try {
    // Set release sku_id to point to JHD-309 product while lot is JHD-105
    await client.query("UPDATE qms_batch_releases SET sku_id = $1 WHERE id = $2;", [otherProd.rows[0].id, release.id]);
    await generateCoaData(release.id, {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'ภญ. วริศรา มั่นคง (QA Manager)'
    });
  } catch (err) {
    guardTriggered = true;
    assert(err.message.includes('COA Integrity'), 'Integrity guard blocked cross-product mismatch', err.message);
  } finally {
    // Restore correct sku_id
    await client.query("UPDATE qms_batch_releases SET sku_id = $1 WHERE id = $2;", [prod105.rows[0].id, release.id]);
  }
  assert(guardTriggered, 'Integrity guard was successfully triggered when product ID mismatch occurred');

  // 7. Verify all other UAT lots have consistent product master mapping
  console.log('\n--- 7. Verifying All Phase 5 UAT Lots (Cases A - J) ---');
  const allUatLots = await client.query(`
    SELECT r.lot_no, r.sku_code, r.product_name, r.sku_id as r_sku, l.sku_id as l_sku, p.sku as p_sku
    FROM qms_batch_releases r
    JOIN production_lots l ON r.production_lot_id = l.id
    JOIN products p ON r.sku_id = p.id
    ORDER BY r.lot_no;
  `);

  let allConsistent = true;
  for (const row of allUatLots.rows) {
    const isOk = row.r_sku === row.l_sku && row.sku_code === row.p_sku;
    if (!isOk) {
      allConsistent = false;
      console.error(`Mismatch on ${row.lot_no}: r_sku=${row.r_sku}, l_sku=${row.l_sku}, sku_code=${row.sku_code}, p_sku=${row.p_sku}`);
    }
  }
  assert(allConsistent, 'All 9 Phase 5 UAT Lots have 100% consistent product_id and sku_code mapping');

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  await client.end();
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
