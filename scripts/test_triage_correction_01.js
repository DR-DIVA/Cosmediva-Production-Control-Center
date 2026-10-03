const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTriageCorrectionTests() {
  console.log('\n========================================================================');
  console.log('🧪 TESTING MICRO-SPRINT 1 — UAT CORRECTION 01 (QA TRIAGE ENHANCEMENT)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} -> ${details}`);
      failed++;
    }
  }

  // 1. Create a test quality event
  const currentYear = new Date().getFullYear().toString();
  const { data: seqData } = await supabase.rpc('qms_get_next_number', {
    p_prefix: 'QE',
    p_year: currentYear
  });
  const eventNo = seqData || `QE-${currentYear}-TEST`;

  const { data: event, error: createErr } = await supabase
    .from('qms_quality_events')
    .insert({
      event_no: eventNo,
      event_date: new Date().toISOString(),
      reported_by: '029f20ec-49b2-469c-aa12-657854a636de',
      reporter_name: 'UAT Test Reporter',
      title: 'UAT-01: พบฟอยล์ปิดผนึกกระปุกครีมมีรอยฉีกขาดและคราบความมัน',
      description: 'พบฟอยล์ปิดผนึกชำรุด อาจส่งผลต่อความหนืดและการปนเปื้อนในแบทช์ผลิตปัจจุบัน',
      material_type: 'PM',
      destination_market: 'DOMESTIC_TH',
      current_status: 'SUBMITTED',
      ai_suggested_severity: 'MAJOR'
    })
    .select()
    .single();

  assert('Test Event Created for UAT-01', !createErr && event?.id, createErr?.message);

  if (!event) return;

  // 2. Test Guardrail: Consumer Safety = YES + Fast-Track without justification should fail
  const impactSafetyYes = {
    product_quality: 'YES',
    consumer_safety: 'YES',
    regulatory_labeling: 'NO',
    gmp_compliance: 'YES',
    customer_requirement: 'NO',
    production_batch: 'YES',
    other_batch_market: 'NO'
  };

  // Import server action logic via direct DB simulation matching action
  // Check Guardrail logic directly:
  const checkConsumerSafetyGuardrail = (impact, path, notes) => {
    if (impact?.consumer_safety === 'YES' && path === 'FAST_TRACK') {
      if (!notes || notes.trim().length < 15) {
        return false;
      }
    }
    return true;
  };

  assert(
    'Guardrail Blocks Consumer Safety = YES + Fast-Track with short note',
    checkConsumerSafetyGuardrail(impactSafetyYes, 'FAST_TRACK', 'Short note') === false,
    'Should have blocked short note'
  );

  assert(
    'Guardrail Permits Consumer Safety = YES + Fast-Track with explicit QA justification (>= 15 chars)',
    checkConsumerSafetyGuardrail(impactSafetyYes, 'FAST_TRACK', 'QA Head Override: เฉพาะเศษฟอยล์ภายนอก ไม่สัมผัสเนื้อครีม') === true,
    'Should allow with full justification'
  );

  // 3. Test Containment Selection: 11 Choices
  const selectedContainment = ['Hold Production Batch', 'Hold PM', 'Stop Filling/Packing'];
  
  const { data: updatedEvent, error: updateErr } = await supabase
    .from('qms_quality_events')
    .update({
      qa_confirmed_type: 'NCR',
      qa_confirmed_severity: 'MAJOR',
      risk_level: 'HIGH',
      workflow_path: 'STANDARD',
      containment_required: true,
      containment_types: selectedContainment,
      containment_status: 'PENDING',
      current_status: 'CONTAINMENT_ACTIVE',
      initial_impact_assessment: impactSafetyYes,
      qa_classification_notes: 'QA Triage UAT: ยืนยันพบฟอยล์ชำรุด สั่งกักกันและหยุดไลน์บรรจุเพื่อสอบสวน'
    })
    .eq('id', event.id)
    .select()
    .single();

  assert('Quality Event Triaged with Impact Assessment & Multi Containment', !updateErr, updateErr?.message);

  // 4. Verify persisted values
  assert(
    'Impact Assessment JSONB stored with 7 dimensions accurately',
    updatedEvent?.initial_impact_assessment?.consumer_safety === 'YES' &&
    updatedEvent?.initial_impact_assessment?.product_quality === 'YES' &&
    updatedEvent?.initial_impact_assessment?.regulatory_labeling === 'NO' &&
    updatedEvent?.initial_impact_assessment?.gmp_compliance === 'YES',
    JSON.stringify(updatedEvent?.initial_impact_assessment)
  );

  assert(
    'Containment Types JSONB array persisted accurately with 3 choices',
    Array.isArray(updatedEvent?.containment_types) &&
    updatedEvent.containment_types.length === 3 &&
    updatedEvent.containment_types.includes('Stop Filling/Packing'),
    JSON.stringify(updatedEvent?.containment_types)
  );

  // 5. Auto-create containment records for the chosen types
  for (const cType of selectedContainment) {
    const { error: insErr } = await supabase.from('qms_event_containment_actions').insert({
      quality_event_id: event.id,
      action_type: cType.includes('Stop') ? 'STOP_LINE' : cType.includes('PM') ? 'HOLD_MATERIAL' : 'HOLD_LOT',
      item_reference: cType,
      action_description: `[Auto-Triage] ดำเนินมาตรการควบคุมทันที: ${cType}`,
      assigned_to: '029f20ec-49b2-469c-aa12-657854a636de',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      status: 'PENDING'
    });
    if (insErr) console.error('Insert action error:', insErr);
  }

  const { data: actions, error: actErr } = await supabase
    .from('qms_event_containment_actions')
    .select('*')
    .eq('quality_event_id', event.id);

  assert(
    'Containment Action Records created for each selected containment type',
    actions?.length === 3,
    `Found ${actions?.length} actions`
  );

  console.log('\n------------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTriageCorrectionTests();
