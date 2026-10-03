const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function seedDemo() {
  await pgClient.connect();
  console.log('Connected to DB for seeding final UAT demonstration case...');

  // Ensure column exists
  await pgClient.query("ALTER TABLE qms_investigations ADD COLUMN IF NOT EXISTS qa_confirmed_related_event_ids JSONB DEFAULT '[]'::jsonb;");

  const qaUserId = '029f20ec-49b2-469c-aa12-657854a636de';
  const qaUserName = 'คุณวิภาดา (QA Manager)';
  const reporterUserId = '11111111-1111-1111-1111-111111111111';
  const reporterName = 'คุณสมคิด (หัวหน้ากะผสม Bulk)';

  // 1. Create/Ensure Historical Similar Event (QE-2026-0042)
  console.log('1. Checking/Creating historical similar event (QE-2026-0042)...');
  const histCheck = await pgClient.query("SELECT id FROM qms_quality_events WHERE event_no = 'QE-2026-0042'");
  let histEventId;
  if (histCheck.rows.length === 0) {
    const histRes = await pgClient.query(`
      INSERT INTO qms_quality_events (
        event_no, event_date, reported_by, reporter_name,
        material_type, product_id, production_lot_id, material_lot_no, equipment_code, supplier_name,
        destination_market, title, description,
        qa_confirmed_type, qa_confirmed_severity, risk_level, workflow_path,
        qa_classification_notes, qa_classified_by, containment_required, containment_status,
        containment_types, current_status, snapshot_context, record_version, created_at, updated_at
      ) VALUES (
        'QE-2026-0042', NOW() - INTERVAL '14 days', $1, $2,
        'BULK', 'ea1af4d4-afaf-413e-81b6-69c4e87238dc', null, 'LOT-2026-02-15', 'Tank T-101', 'Lubrizol Thailand',
        'DOMESTIC_TH', 'Bulk Aloe Soothing Gel ค่าความหนืดหลุดสเปกสูงผิดปกติ (14,200 cps vs 4,000-8,000 cps)',
        'ตรวจพบความหนืดสูงเกินเกณฑ์มาตรฐานในการผลิตแบทช์ก่อนหน้า',
        'OOS', 'MAJOR', 'MEDIUM', 'STANDARD',
        'พบปัญหาเนื้อเจลข้นหนืดเกินสเปก สั่งกักกันและปรับลดสารก่อเจลชั่วคราว',
        $1, true, 'CONTAINED', ARRAY['Hold Bulk', 'Increased Inspection'], 'CLOSED',
        $3, 1, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'
      ) RETURNING id
    `, [
      qaUserId, qaUserName,
      JSON.stringify({
        schema_version: '1.0',
        captured_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        reporter: { user_id: reporterUserId, full_name: reporterName },
        organization: { department_name: 'แผนกผสม (Compounding)' },
        manufacturing_context: {
          is_batch_related: true,
          product: { product_id: 'ALOE-GEL-01', sku: 'ALOE-GEL-01', product_name: 'Aloe Vera Soothing Gel 100g' },
          production_lot: { lot_no: 'LOT-2026-02-15', batch_size_kg: 500 },
          material: { material_type: 'BULK', material_lot_no: 'LOT-2026-02-15', supplier_name: 'Lubrizol Thailand' }
        }
      })
    ]);
    histEventId = histRes.rows[0].id;
  } else {
    histEventId = histCheck.rows[0].id;
  }
  console.log('   Historical Event ID:', histEventId);

  // 2. Create Current Demonstration Event (QE-2026-0099)
  console.log('2. Creating/Updating current demonstration event (QE-2026-0099)...');
  await pgClient.query("DELETE FROM qms_quality_events WHERE event_no = 'QE-2026-0099'");

  const snapshotContext = {
    schema_version: '1.0',
    captured_at: new Date().toISOString(),
    reporter: { user_id: reporterUserId, full_name: reporterName, role_title: 'Compounding Supervisor' },
    organization: { department_name: 'แผนกผสม (Bulk Compounding)', room_name: 'ห้องผสม Bulk Cleanroom B2' },
    manufacturing_context: {
      is_batch_related: true,
      product: {
        product_id: 'ALOE-GEL-01',
        sku: 'ALOE-GEL-01',
        product_name: 'Aloe Vera Soothing Gel 100g',
        product_size: '100g',
        standard_batch_size: 500,
        default_unit: 'KG'
      },
      production_lot: {
        lot_id: 'LOT-2026-03-01',
        lot_no: 'LOT-2026-03-01',
        batch_size_kg: 500,
        planned_quantity: 5000,
        customer_name: 'CosmeDiva Brand OEM'
      },
      material: {
        material_type: 'BULK',
        material_lot_no: 'LOT-2026-03-01',
        supplier_name: 'Lubrizol Thailand'
      }
    }
  };

  const currEventRes = await pgClient.query(`
    INSERT INTO qms_quality_events (
      event_no, event_date, reported_by, reporter_name,
      material_type, product_id, production_lot_id, material_lot_no, equipment_code, supplier_name,
      destination_market, title, description, expected_condition, actual_condition,
      immediate_action_taken, quantity_affected, quantity_unit,
      qa_confirmed_type, qa_confirmed_severity, risk_level, workflow_path,
      qa_classification_notes, qa_classified_by, containment_required, containment_status,
      containment_types, initial_impact_assessment, current_status, snapshot_context,
      record_version, created_at, updated_at
    ) VALUES (
      'QE-2026-0099', NOW(), $1, $2,
      'BULK', 'ea1af4d4-afaf-413e-81b6-69c4e87238dc', null, 'LOT-2026-03-01', 'Tank T-101', 'Lubrizol Thailand',
      'DOMESTIC_TH', 'เนื้อครีม Bulk Aloe Gel หลุดข้อกำหนดความหนืด OOS: 15,400 cps (สเปก 4,000-8,000 cps)',
      'QC สุ่มตรวจ In-process testing ตัวอย่างเนื้อ Bulk ประจำล็อต LOT-2026-03-01 พบค่าความหนืด 15,400 cps เกินกว่าเกณฑ์ข้อกำหนดมาตรฐานสูงสุด 8,000 cps อย่างมีนัยสำคัญ',
      'ค่าความหนืดต้องอยู่ในเกณฑ์มาตรฐาน 4,000 - 8,000 cps (Brookfield DV2T, Spindle 4, 20 rpm, 25°C)',
      'วัดได้จริง 15,400 cps (OOS เกินเกณฑ์สูงสุด +92.5%) เนื้อเจลมีลักษณะหนืดแน่นเป็นพิเศษ',
      'สั่งระงับการถ่ายเนื้อครีมลงถังพัก ติดป้าย HOLD ห้ามเคลื่อนย้าย และแจ้ง QA Triage ตรวจสอบทันที',
      500, 'KG',
      'OOS', 'CRITICAL', 'HIGH', 'FULL_INVESTIGATION',
      'ความหนืดเกินมาตรฐานอย่างมีนัยสำคัญ ส่งผลต่อลักษณะภายนอกและการจ่ายสาร สั่งอายัด Bulk ทั้งถัง และส่งเข้า Full Investigation',
      $3, true, 'CONTAINED',
      $6,
      $4,
      'IN_INVESTIGATION',
      $5,
      1, NOW(), NOW()
    ) RETURNING id
  `, [
    reporterUserId, reporterName, qaUserId,
    JSON.stringify({
      product_quality: 'YES',
      consumer_safety: 'NO',
      regulatory_labeling: 'NO',
      gmp_compliance: 'NO',
      customer_requirement: 'YES',
      production_batch: 'YES',
      other_batch_market: 'NO'
    }),
    JSON.stringify(snapshotContext),
    JSON.stringify(['Hold Bulk', 'Stop Filling/Packing', 'Increased Inspection'])
  ]);

  const currEventId = currEventRes.rows[0].id;
  console.log('   Current Event ID:', currEventId);

  // 3. Create Investigation Record (INV-2026-0099)
  console.log('3. Creating Investigation record (INV-2026-0099)...');
  const questionFramework = {
    what_happened: 'ตรวจพบเนื้อครีม Bulk Aloe Vera Soothing Gel หลุดข้อกำหนดความหนืด (Viscosity OOS) สูงถึง 15,400 cps (สเปก 4,000-8,000 cps) ในถังผสม T-101',
    what_should_have_happened: 'ตามข้อกำหนด Approved Product Specification #SPEC-ALOE-01 (Rev. 03) ความหนืดต้องอยู่ในช่วง 4,000 - 8,000 cps',
    confirmed_gap: 'ค่าความหนืดสูงเกินสเปกสูงสุด +7,400 cps (เบี่ยงเบน +92.5%) ส่งผลให้เนื้อเจลข้นเกินและหัวปั๊มดูดจ่ายไม่ได้ตามเกณฑ์',
    when_occurred: new Date(Date.now() - 3600000 * 3).toISOString().slice(0, 16),
    where_occurred: 'ถังผสมกวนสุญญากาศ Tank T-101 แผนกผสม Bulk Cleanroom B2',
    when_detected: new Date(Date.now() - 3600000 * 2).toISOString().slice(0, 16),
    who_process_involved: 'Operator ประจำถังผสม T-101, นักวิเคราะห์แล็บ QC, และหัวหน้ากะผสม',
    quantity_batches_affected: 'แบทช์การผลิต LOT-2026-03-01 ปริมาณ 500 kg (เตรียมบรรจุ 5,000 ชิ้น)',
    what_changed_before_event: 'มีการปรับเพิ่มความเร็วรอบใบพัดกวน Homogenizer ในช่วง Cooling Phase เพื่อเร่งให้อุณหภูมิลดลงทันเวลา',
    has_happened_before: true,
    recurrence_details: `QA ยืนยันพบประวัติเหตุการณ์ซ้ำที่เกี่ยวข้องกันจำนวน 1 รายการในระบบ (QE-2026-0042 / Bulk Aloe Soothing Gel)`,
    missing_information: 'รอผลทดสอบความคงตัวเร่งด่วน Accelerated Stability (45°C) 48 ชั่วโมง จากห้องแล็บวิจัย'
  };

  const fiveWhys = [
    { why_number: 1, cause: 'ทำไมเนื้อเจล Aloe จึงมีความหนืดสูงถึง 15,400 cps เกินกว่าสเปกสูงสุด 8,000 cps?', explanation: 'ตรวจพบว่าสายพอลิเมอร์ Carbomer เกิดการพองตัวและสร้าง Gel Matrix แน่นหนาผิดปกติ' },
    { why_number: 2, cause: 'ทำไมพอลิเมอร์ Carbomer จึงสร้าง Gel Matrix แน่นหนาผิดปกติ?', explanation: 'เนื่องจากสารละลายด่าง Triethanolamine (TEA) ทำปฏิกิริยา Neutralization รวดเร็วในขณะที่อุณหภูมิเนื้อครีมยังสูงเกิน 55°C' },
    { why_number: 3, cause: 'ทำไมผู้ผสมจึงจ่ายสารละลายด่าง (TEA) ในขณะที่อุณหภูมิยังสูง 55°C ทั้งที่ขั้นตอนกำหนด 40-45°C?', explanation: 'เพราะหน้าจอดิจิทัลประจำถังแสดงอุณหภูมิ 42°C ซึ่งคลาดเคลื่อนจากอุณหภูมิจริงภายในถัง' },
    { why_number: 4, cause: 'ทำไมหน้าจอดิจิทัลถัง T-101 จึงแสดงอุณหภูมิต่ำกว่าอุณหภูมิจริงถึง 13°C?', explanation: 'เซนเซอร์วัดอุณหภูมิ RTD ประจำถังมีคราบฟิล์มพอลิเมอร์สะสมเกาะหนา ทำให้ถ่ายเทความร้อนช้าและเกิด Temperature Lag' },
    { why_number: 5, cause: 'ทำไมไม่มีการตรวจสอบหรือทำความสะอาดคราบฟิล์มที่เซนเซอร์ก่อนเริ่มผสม?', explanation: 'ขั้นตอนการล้าง CIP และแผนบำรุงรักษาเชิงป้องกัน (PM) ยังไม่มีเช็กลิสต์การถอดขัดล้างหัววัด RTD Probe ประจำสัปดาห์' }
  ];

  const fishbone6M = {
    man: ['ผู้ผสมปฏิบัติตามหน้าจอดิจิทัลถูกต้อง แต่ไม่มีการ Cross-check ด้วยมือถือ'],
    machine: ['เซนเซอร์วัดอุณหภูมิ RTD ของถัง T-101 เกิด Temperature Drift จากตะกรันสะสม อ่านค่าช้ากว่าจริง 13°C'],
    material: ['วัตถุดิบ Carbopol 940 (Lot RM-CB-202602) และสารสกัด Aloe ผ่าน COA สมบูรณ์'],
    method: ['คู่มือการทำงาน (SOP-MIX-002) ยังขาดข้อกำหนดการใช้ Dual-Probe ตรวจสอบอุณหภูมิซ้ำก่อนจ่ายด่าง'],
    measurement: ['เครื่องวัด Brookfield DV2T ของแล็บ QC ผ่านการสอบเทียบประจำปีและทำงานสมบูรณ์'],
    environment: ['ห้องผสม Cleanroom B2 ควบคุมอุณหภูมิ 24°C และความชื้น 55% RH ตามมาตรฐาน GMP']
  };

  const systemicCauseAssessment = {
    is_evaluated: true,
    training_adequate: true,
    sop_clarity_adequate: true,
    workload_reasonable: true,
    equipment_interface_clear: false,
    poka_yoke_present: false,
    ergonomics_suitable: true,
    process_design_robust: false,
    supervision_adequate: true,
    system_controls_sufficient: true,
    maintenance_preventive_adhered: false,
    systemic_findings: 'เครื่องผสม T-101 ยังขาดระบบ Poka-yoke Interlock ป้องกันการจ่ายสารเคมีเมื่ออุณหภูมิจริงยังไม่ถึงเกณฑ์ และแผนบำรุงรักษาเชิงป้องกัน (PM) ยังไม่ครอบคลุมการตรวจสอบขจัดคราบที่ Probe'
  };

  const invRes = await pgClient.query(`
    INSERT INTO qms_investigations (
      investigation_no, quality_event_id, current_status, assigned_lead_id, assigned_lead_name,
      target_due_date, question_framework, rca_tool, five_whys, fishbone_6m,
      is_root_cause_confirmed, root_cause_category, root_cause_summary,
      systemic_cause_assessment, immediate_correction_description, immediate_correction_completed,
      capa_system_recommendation, capa_recommendation_rationale, capa_required,
      capa_decision_justification, capa_decided_by, capa_decided_by_name, capa_decided_at,
      investigation_summary, qa_review_notes, record_version, created_at, updated_at
    ) VALUES (
      'INV-2026-0099', $1, 'QA_REVIEW', $2, $3,
      NOW() + INTERVAL '7 days', $4, '5_WHY', $5, $6,
      true, 'MACHINE',
      'เซนเซอร์วัดอุณหภูมิ RTD ของถัง T-101 มีคราบฟิล์มพอลิเมอร์สะสม ทำให้อ่านค่าอุณหภูมิต่ำกว่าความเป็นจริง 13°C ผู้ผสมจึงจ่ายสารละลายด่าง (TEA) ในขณะที่เนื้อครีมยังร้อนอยู่ ทำให้เกิด Cross-linking แน่นหนาจนความหนืดพุ่งสูง OOS',
      $7,
      'ทำการกักกันถัง T-101 ไม่ปล่อยลงไลน์บรรจุ, ทำการเจือจางและปรับสมดุลเนื้อ Bulk ภายใต้การควบคุมของฝ่ายวิจัย (R&D Adjustment Protocol)',
      true,
      'YES',
      'ตรวจพบข้อบกพร่องจากเครื่องจักรหลักถังผสม และ QA ยืนยันพบประวัติการเกิดซ้ำข้ามล็อตการผลิต (Recurring Pattern Detected) ตามเกณฑ์ระบบคุณภาพต้องเปิด CAPA',
      true,
      'QA Manager เห็นชอบตามคำแนะนำของระบบ: ต้องเปิด CAPA เพื่อติดตั้ง Interlock ระบบวาล์วจ่ายสาร และปรับปรุงแผนบำรุงรักษา PM ถังผสมประจำสัปดาห์',
      $2, $3, NOW(),
      'การสืบสวนเสร็จสิ้นสมบูรณ์ พบสาเหตุรากเหง้าเชิงกลไกและช่องโหว่เชิงระบบชัดเจน',
      'รับรองผลการสืบสวนและอนุมัติปิดห้องสืบสวนเพื่อส่งต่อข้อมูลเข้าสู่การเปิด CAPA ต่อไป',
      1, NOW(), NOW()
    ) RETURNING id
  `, [
    currEventId, qaUserId, qaUserName,
    JSON.stringify(questionFramework),
    JSON.stringify(fiveWhys),
    JSON.stringify(fishbone6M),
    JSON.stringify(systemicCauseAssessment)
  ]);

  const invId = invRes.rows[0].id;
  console.log('   Investigation ID:', invId);

  // 4. Create Timeline Events with distinct sources (SYSTEM / LINKED RECORD / MANUAL)
  console.log('4. Creating Timeline events...');
  const timelineMilestones = [
    { type: 'PRODUCTION_START', source: 'LINKED RECORD', title: 'เริ่มกระบวนการผลิตและผสม Phase A', desc: 'จ่ายน้ำ DI และละลาย Carbomer ในถัง T-101 อุณหภูมิ 75°C', offset: '4 hours' },
    { type: 'MIXING_START', source: 'LINKED RECORD', title: 'เริ่มขั้นตอน Neutralization (เติม TEA)', desc: 'จ่ายสารละลาย TEA เพื่อปรับโครงสร้างเจล หน้าจอดิจิทัลแสดง 42°C (แต่อุณหภูมิจริงคือ 55°C)', offset: '3 hours' },
    { type: 'QC_BULK', source: 'LINKED RECORD', title: 'QC สุ่มเก็บตัวอย่าง In-process ทดสอบความหนืด', desc: 'เจ้าหน้าที่ QC แล็บสุ่มตัวอย่างจากก้นถัง T-101 เข้าเครื่องวัด Brookfield DV2T', offset: '2 hours' },
    { type: 'PROBLEM_DETECTED', source: 'SYSTEM', title: 'ตรวจพบค่าความหนืด OOS: 15,400 cps (เกินสเปก)', desc: 'ระบบบันทึกค่า OOS สูงเกินเกณฑ์มาตรฐาน 4,000 - 8,000 cps แจ้งเตือนผู้ควบคุมการผลิต', offset: '105 minutes' },
    { type: 'BATCH_HELD', source: 'SYSTEM', title: 'สั่งกักกันถังผสม T-101 (Immediate Containment)', desc: 'ระบบสร้างคำสั่งกักกัน ติดป้ายอายัด ห้ามเบิกจ่ายเข้าห้องบรรจุ Cleanroom', offset: '90 minutes' },
    { type: 'QA_NOTIFIED', source: 'SYSTEM', title: 'การประเมินเหตุการณ์คุณภาพ (Quality Event Assessment)', desc: 'QA ประเมินผลกระทบ 7 มิติ จัดระดับความเสี่ยงเป็น CRITICAL และกำหนดเส้นทาง FULL INVESTIGATION', offset: '75 minutes' },
    { type: 'INVESTIGATION_START', source: 'SYSTEM', title: 'เปิดห้องสืบสวน INV-2026-0099 อัตโนมัติ', desc: 'ระบบสร้างห้องปฏิบัติการสืบสวน ดึงบริบทสินค้าและแบทช์ผลิตให้อัตโนมัติ', offset: '60 minutes' },
    { type: 'OTHER', source: 'MANUAL', title: 'ผู้สืบสวนลงพื้นที่ตรวจสอบถังผสม T-101 และถอดตรวจ Probe', desc: 'พบคราบพอลิเมอร์ Carbomer สะสมเคลือบบนปลาย RTD Probe หนาประมาณ 1.5 mm ยืนยันสมมติฐานทางกายภาพ', offset: '30 minutes' }
  ];

  for (const tm of timelineMilestones) {
    await pgClient.query(`
      INSERT INTO qms_investigation_timeline_events (
        investigation_id, milestone_type, event_timestamp, event_title, event_description, event_source, created_by, created_by_name
      ) VALUES ($1, $2, NOW() - INTERVAL '${tm.offset}', $3, $4, $5, $6, $7)
    `, [invId, tm.type, tm.title, tm.desc, tm.source, qaUserId, qaUserName]);
  }

  // 5. Create Additional Evidence (Section B)
  console.log('5. Creating Additional Evidence...');
  await pgClient.query(`
    INSERT INTO qms_investigation_evidence (
      investigation_id, evidence_type, title, description, source, relationship_to_investigation, uploaded_by, uploaded_by_name
    ) VALUES 
    (
      $1, 'PHOTO', 'ภาพถ่ายปลาย RTD Temperature Probe ประจำถัง T-101',
      'ภาพถ่ายแสดงคราบพอลิเมอร์เจลแห้งสะสมเกาะบริเวณก้านวัดอุณหภูมิ',
      'ภาพถ่ายจากกล้องตรวจสอบหน้างานไลน์ผลิต Cleanroom B2',
      'ใช้พิสูจน์ยืนยันสาเหตุทางกายภาพว่าเกิด Heat Transfer Lag ทำให้เซนเซอร์อ่านค่าช้ากว่าอุณหภูมิจริง',
      $2, $3
    ),
    (
      $1, 'DOCUMENT', 'บันทึกประวัติการสอบเทียบเครื่องวัด Brookfield DV2T (#QC-VISC-01)',
      'ใบรายงานการสอบเทียบมาตรฐานประจำปี ผลการทวนสอบด้วยน้ำมันมาตรฐาน Silicone Oil ผ่านเกณฑ์ 100%',
      'สมุดบันทึกประวัติเครื่องมือห้องแล็บ QC Analysis Lab',
      'ใช้ตัดประเด็นข้อสงสัยเรื่องเครื่องมือวัดความหนืดผิดพลาด (Measurement Error Ruled Out)',
      $2, $3
    )
  `, [invId, qaUserId, qaUserName]);

  // Link confirmed similar event
  await pgClient.query(`
    UPDATE qms_investigations 
    SET qa_confirmed_related_event_ids = $1 
    WHERE id = $2
  `, [JSON.stringify([histEventId]), invId]);

  console.log('✅ SEEDING COMPLETE!');
  console.log(`Event: QE-2026-0099 (ID: ${currEventId})`);
  console.log(`Investigation: INV-2026-0099 (ID: ${invId})`);
  await pgClient.end();
}

seedDemo().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
