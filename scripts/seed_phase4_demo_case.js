/**
 * CosmeFlow Assurance Phase 4: Seed Demo Case
 * Seeds CAPA-2026-0001 with completed Effectiveness Plan, 3 Criteria, 
 * 5 Consecutive Batches (Linked QC Results), Zero Recurrence, and QA Decision: EFFECTIVE (CLOSED_EFFECTIVE).
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedPhase4Demo() {
  console.log('🚀 Seeding Phase 4 Demo Case: CAPA-2026-0001...');

  // 1. Get CAPA-2026-0001
  const { data: capa, error: capaErr } = await supabase
    .from('qms_capas')
    .select('*, quality_event:qms_quality_events(*)')
    .eq('capa_no', 'CAPA-2026-0001')
    .single();

  if (capaErr || !capa) {
    console.error('❌ CAPA-2026-0001 not found:', capaErr);
    process.exit(1);
  }

  console.log(`Found CAPA: ${capa.capa_no} (ID: ${capa.id})`);

  // Clean up any existing effectiveness data for this CAPA to ensure clean idempotency
  const { data: existingPlans } = await supabase
    .from('qms_capa_effectiveness_plans')
    .select('id')
    .eq('capa_id', capa.id);

  if (existingPlans && existingPlans.length > 0) {
    const planIds = existingPlans.map(p => p.id);
    await supabase.from('qms_capa_effectiveness_results').delete().in('plan_id', planIds);
    await supabase.from('qms_capa_effectiveness_criteria').delete().in('plan_id', planIds);
    await supabase.from('qms_capa_recurrence_reviews').delete().eq('capa_id', capa.id);
    await supabase.from('qms_capa_effectiveness_plans').delete().eq('capa_id', capa.id);
    console.log('🧹 Cleaned previous effectiveness data for idempotency.');
  }

  // 2. Insert Effectiveness Plan: EFF-2026-0001
  const qaManagerId = '029f20ec-49b2-469c-aa12-657854a636de';
  const qaManagerName = 'คุณวิภาดา (QA Manager)';

  const planPayload = {
    capa_id: capa.id,
    plan_no: 'EFF-2026-0001',
    title: 'แผนติดตามประสิทธิผล: ป้องกันความหนืด Bulk ตก Spec และการสอบเทียบ RTD Temp Sensor ถังผสม T-02',
    objective: 'ยืนยันว่าการเปลี่ยนและสอบเทียบ RTD Sensor ถังผสม T-02 ร่วมกับการตรวจวัดอุณหภูมิอิสระ Handheld Dual-Probe ก่อนเติม TEA ส่งผลให้กระบวนการผลิตครีมกันแดด SPF50+ ได้ค่าความหนืดตามมาตรฐานทุกแบทช์ติดต่อกัน และไม่เกิดปัญหาซ้ำ',
    scope_type: 'CONSECUTIVE_BATCHES',
    scope_target_count: 5,
    scope_description: 'เฝ้าระวังการผลิตแบทช์ถัดไปจำนวน 5 แบทช์ติดต่อกัน (LOT-2026-V090 ถึง LOT-2026-V094) ของผลิตภัณฑ์ครีมกันแดด SPF50+ ในถังผสม T-02',
    target_due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    responsible_owner_id: capa.capa_owner_id || qaManagerId,
    responsible_owner_name: capa.capa_owner_name || qaManagerName,
    reviewer_id: qaManagerId,
    reviewer_name: qaManagerName,
    status: 'MONITORING_COMPLETED',
    final_decision: 'EFFECTIVE',
    actual_review_date: new Date().toISOString(),
    qa_conclusion: 'การติดตามผลการผลิตจริง 5 แบทช์ติดต่อกัน (LOT-2026-V090 ถึง LOT-2026-V094) พบค่าความหนืด Bulk อยู่ในเกณฑ์มาตรฐาน (เฉลี่ย 3,800 cPs) และค่าอุณหภูมิสอบเทียบ RTD Sensor ถังผสม T-02 มีความเที่ยงตรงสูง ผลต่างอุณหภูมิไม่เกิน ±0.2°C พนักงานปฏิบัติตาม WI-MIX-002 Rev.04 อย่างเคร่งครัด ไม่พบการเกิดซ้ำของปัญหา OOS หรืออุณหภูมิเกิน จึงอนุมัติปิด CAPA อย่างสมบูรณ์',
    supporting_evidence_summary: '1. บันทึกผลตรวจวิเคราะห์จาก QC Lab (QC COA: QC-COA-2026-V090 ถึง V094)\n2. เอกสารบันทึกการสอบเทียบหัววัด RTD Temp Sensor ถัง T-02 (CAL-T02-2026-01)\n3. บันทึกการผลิตและควบคุมสภาวะอุณหภูมิ Batch Manufacturing Records (BMR)\n4. ผลการตรวจสอบไม่พบ Quality Event ซ้ำในรอบ 30 วัน',
    additional_actions_required: false
  };

  const { data: plan, error: planErr } = await supabase
    .from('qms_capa_effectiveness_plans')
    .insert(planPayload)
    .select()
    .single();

  if (planErr) {
    console.error('❌ Error creating plan:', planErr);
    process.exit(1);
  }

  console.log(`✅ Created Effectiveness Plan: ${plan.plan_no} (ID: ${plan.id})`);

  // 3. Insert Criteria
  const criteriaData = [
    {
      plan_id: plan.id,
      capa_id: capa.id,
      criterion_no: 1,
      criterion_type: 'QC_SPEC_RESULT',
      title: 'ค่าความหนืดของเนื้อครีม Bulk (Bulk Viscosity Spec)',
      description: 'ผลการตรวจวิเคราะห์ความหนืดโดยห้องแล็บ QC จากตัวอย่าง Bulk ก่อนบรรจุ ต้องอยู่ในช่วงมาตรฐานกำหนด',
      measurable_target: '3,000 - 4,500 cPs (Spindle #4, 20 RPM @ 25°C)',
      status: 'MET'
    },
    {
      plan_id: plan.id,
      capa_id: capa.id,
      criterion_no: 2,
      criterion_type: 'EQUIPMENT_CALIBRATION',
      title: 'ความแม่นยำและการสอบเทียบ RTD Temp Sensor ถังผสม T-02',
      description: 'อุณหภูมิที่อ่านได้จาก RTD Sensor ถัง T-02 เทียบกับ Handheld Calibrated Probe ก่อนเติม TEA ในทุกแบทช์',
      measurable_target: 'ผลต่างอุณหภูมิไม่เกิน ±0.5°C และอุณหภูมิผสมขณะเติม TEA ต้องต่ำกว่า 45°C เสมอ',
      status: 'MET'
    },
    {
      plan_id: plan.id,
      capa_id: capa.id,
      criterion_no: 3,
      criterion_type: 'EVENT_RECURRENCE',
      title: 'อัตราการเกิดซ้ำของปัญหา OOS Viscosity หรือความเบี่ยงเบนอุณหภูมิ',
      description: 'เฝ้าระวังอุบัติการณ์คุณภาพและข้อเบี่ยงเบนในสายการผลิตผสมถัง T-02 และผลิตภัณฑ์ครีมกันแดด SPF50+',
      measurable_target: '0 ครั้ง (Zero Recurrence) ตลอดระยะเวลาการเฝ้าระวัง 5 แบทช์ติดต่อกัน',
      status: 'MET'
    }
  ];

  const { data: createdCriteria, error: critErr } = await supabase
    .from('qms_capa_effectiveness_criteria')
    .insert(criteriaData)
    .select();

  if (critErr) {
    console.error('❌ Error creating criteria:', critErr);
    process.exit(1);
  }

  console.log(`✅ Created ${createdCriteria.length} Measurable Criteria.`);

  const crit1 = createdCriteria.find(c => c.criterion_no === 1);
  const crit2 = createdCriteria.find(c => c.criterion_no === 2);
  const crit3 = createdCriteria.find(c => c.criterion_no === 3);

  // 4. Insert Results for 5 Consecutive Batches
  const batchSamples = [
    { lot: 'LOT-2026-V090', visc: '3,820 cPs', temp: 'RTD 42.1°C / Probe 42.3°C (Diff +0.2°C)', date: '2026-09-18' },
    { lot: 'LOT-2026-V091', visc: '3,750 cPs', temp: 'RTD 41.8°C / Probe 41.8°C (Diff 0.0°C)', date: '2026-09-20' },
    { lot: 'LOT-2026-V092', visc: '3,910 cPs', temp: 'RTD 42.5°C / Probe 42.4°C (Diff -0.1°C)', date: '2026-09-22' },
    { lot: 'LOT-2026-V093', visc: '3,680 cPs', temp: 'RTD 41.5°C / Probe 41.7°C (Diff +0.2°C)', date: '2026-09-24' },
    { lot: 'LOT-2026-V094', visc: '3,840 cPs', temp: 'RTD 42.0°C / Probe 42.1°C (Diff +0.1°C)', date: '2026-09-25' }
  ];

  const resultsData = [];

  batchSamples.forEach((b, idx) => {
    const sampleNo = idx + 1;
    // Criterion 1: Viscosity
    resultsData.push({
      plan_id: plan.id,
      criterion_id: crit1.id,
      capa_id: capa.id,
      sample_no: sampleNo,
      batch_lot_no: b.lot,
      result_source: 'LINKED_SYSTEM',
      linked_record_type: 'QC_RESULT',
      linked_record_id: `QC-COA-2026-V09${idx}`,
      measured_value: b.visc,
      specification_target: '3,000 - 4,500 cPs',
      evaluation_status: 'PASS',
      evaluated_at: `${b.date}T14:30:00Z`,
      evaluated_by: qaManagerId,
      evaluated_by_name: qaManagerName,
      notes: `ตรวจวัดโดยเครื่อง Brookfield Viscometer DV2T ณ อุณหภูมิ 25.0°C สอดคล้องตาม Spec ทุกประการ`
    });

    // Criterion 2: Temp sensor
    resultsData.push({
      plan_id: plan.id,
      criterion_id: crit2.id,
      capa_id: capa.id,
      sample_no: sampleNo,
      batch_lot_no: b.lot,
      result_source: 'LINKED_SYSTEM',
      linked_record_type: 'CALIBRATION',
      linked_record_id: `CAL-VERIF-T02-09${idx}`,
      measured_value: b.temp,
      specification_target: 'ผลต่าง ≤ ±0.5°C และอุณหภูมิ < 45°C',
      evaluation_status: 'PASS',
      evaluated_at: `${b.date}T11:00:00Z`,
      evaluated_by: qaManagerId,
      evaluated_by_name: qaManagerName,
      notes: `บันทึกใน BMR ขั้นตอนก่อนเติม TEA อุณหภูมิอยู่ในเกณฑ์ปลอดภัย`
    });

    // Criterion 3: Zero Recurrence
    resultsData.push({
      plan_id: plan.id,
      criterion_id: crit3.id,
      capa_id: capa.id,
      sample_no: sampleNo,
      batch_lot_no: b.lot,
      result_source: 'LINKED_SYSTEM',
      linked_record_type: 'AUDIT',
      linked_record_id: `QMS-LOG-2026-09${idx}`,
      measured_value: '0 เหตุการณ์ (Zero Recurrence)',
      specification_target: '0 เหตุการณ์',
      evaluation_status: 'PASS',
      evaluated_at: `${b.date}T17:00:00Z`,
      evaluated_by: qaManagerId,
      evaluated_by_name: qaManagerName,
      notes: `ตรวจสอบระบบ QMS ไม่พบข้อร้องเรียนหรือบันทึก Deviation สำหรับแบทช์นี้`
    });
  });

  const { error: resErr } = await supabase
    .from('qms_capa_effectiveness_results')
    .insert(resultsData);

  if (resErr) {
    console.error('❌ Error inserting results:', resErr);
    process.exit(1);
  }

  console.log(`✅ Inserted ${resultsData.length} Evaluation Results (5 Consecutive Batches, all PASS, LINKED_SYSTEM).`);

  // 5. Update CAPA Status to CLOSED_EFFECTIVE
  const { error: capaUpdateErr } = await supabase
    .from('qms_capas')
    .update({
      current_status: 'CLOSED_EFFECTIVE',
      effectiveness_status: 'EFFECTIVE',
      closed_at: new Date().toISOString(),
      closed_by: qaManagerId,
      closed_by_name: qaManagerName,
      closure_conclusion: planPayload.qa_conclusion,
      updated_at: new Date().toISOString()
    })
    .eq('id', capa.id);

  if (capaUpdateErr) {
    console.error('❌ Error closing CAPA:', capaUpdateErr);
    process.exit(1);
  }

  // 6. Insert Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_capas',
    record_id: capa.id,
    action_type: 'CAPA_CLOSED_EFFECTIVE',
    record_version: 3,
    changed_by: qaManagerId,
    changed_by_name: qaManagerName,
    change_reason: `ประเมินประสิทธิผลผ่านเกณฑ์สมบูรณ์ 5 แบทช์ (EFFECTIVE) — ปิดเคส CAPA อย่างเป็นทางการ (CLOSED_EFFECTIVE)`
  });

  console.log('🎉 Successfully seeded CAPA-2026-0001 as CLOSED — EFFECTIVE!');
}

seedPhase4Demo().catch(console.error);
