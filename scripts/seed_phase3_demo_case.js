const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function seedPhase3DemoCase() {
  console.log('Seeding Phase 3 Demonstration Case: Bulk Viscosity OOS with 3 Actions...');
  await pgClient.connect();

  try {
    const currentYear = new Date().getFullYear().toString();
    const qaUserId = '029f20ec-49b2-469c-aa12-657854a636de';
    const qaUserName = 'คุณวิภาดา (QA Manager)';
    const maintUserId = 'e2b3c4d5-6789-4012-b345-678901234567';
    const maintUserName = 'ช่างประเสริฐ (Maintenance Supervisor)';
    const prodUserId = 'f3c4d5e6-7890-4123-c456-789012345678';
    const prodUserName = 'คุณกมล (Production Supervisor)';
    const dccUserId = 'a1b2c3d4-5678-4901-b234-567890123456';
    const dccUserName = 'คุณอารียา (DCC & Training Specialist)';

    // Find or create demo event QE-2026-0016
    let eventRes = await pgClient.query("SELECT id, event_no FROM qms_quality_events WHERE event_no = 'QE-2026-0016'");
    let eventId;

    if (eventRes.rows.length === 0) {
      console.log('Creating demo Quality Event QE-2026-0016...');
      const insEv = await pgClient.query(`
        INSERT INTO qms_quality_events (
          event_no, event_date, reported_by, reporter_name,
          title, description, material_type, material_lot_no, supplier_name,
          destination_market, ai_suggested_type, qa_confirmed_type,
          ai_suggested_severity, qa_confirmed_severity, risk_level, workflow_path,
          containment_required, initial_impact_assessment, current_status,
          qa_classified_by, qa_classified_at,
          snapshot_context
        ) VALUES (
          'QE-2026-0016', NOW() - INTERVAL '5 days', $1, $2,
          'ความหนืด Bulk ครีมกันแดดตก Spec ต่ำกว่าเกณฑ์มาตรฐาน (OOS Bulk Viscosity)',
          'ผลวิเคราะห์ QC ประจำถังผสม T-02 พบความหนืด 8,500 cPs ซึ่งต่ำกว่าเกณฑ์ควบคุมคุณภาพ (Spec 15,000 - 25,000 cPs)',
          'BULK', 'LOT-2026-V089', 'Thai Cosmetic Labs',
          'DOMESTIC_TH', 'OOS', 'OOS',
          'CRITICAL', 'CRITICAL', 'CRITICAL', 'FULL_INVESTIGATION',
          true,
          '{"product_quality":"YES","consumer_safety":"NO","regulatory_labeling":"NO","gmp_compliance":"YES","customer_requirement":"YES","production_batch":"YES","other_batch_market":"NO"}',
          'CLOSED',
          $1, NOW() - INTERVAL '5 days',
          '{"schema_version":"1.0","manufacturing_context":{"product":{"sku":"SKU-SERUM-01","product_name":"Aura Glow Vitamin C Serum"},"production_lot":{"lot_number":"LOT-2026-V089"}}}'
        ) RETURNING id
      `, [qaUserId, qaUserName]);
      eventId = insEv.rows[0].id;
    } else {
      eventId = eventRes.rows[0].id;
    }

    // Find or create investigation INV-2026-0016
    let invRes = await pgClient.query("SELECT id FROM qms_investigations WHERE investigation_no = 'INV-2026-0016' OR quality_event_id = $1", [eventId]);
    let invId;

    if (invRes.rows.length === 0) {
      console.log('Creating demo Investigation...');
      const insInv = await pgClient.query(`
        INSERT INTO qms_investigations (
          investigation_no, quality_event_id, assigned_lead_id, assigned_lead_name,
          target_due_date, current_status, root_cause_category, root_cause_summary,
          is_root_cause_confirmed, capa_required, capa_system_recommendation,
          capa_recommendation_rationale, qa_approved_by, qa_approved_by_name, qa_approved_at,
          question_framework, five_whys, systemic_cause_assessment
        ) VALUES (
          'INV-2026-0016', $1, $2, $3,
          NOW() + INTERVAL '2 days', 'COMPLETED', 'MACHINE',
          'RTD Temp Sensor ที่ถังผสม T-02 มีคราบ Carbomer เคลือบหนา ทำให้อ่านค่าอุณหภูมิต่ำกว่าจริง 8°C ผู้ปฏิบัติงานจึงเติม TEA เร็วเกินไปก่อนพอลิเมอร์คลายตัวสมบูรณ์',
          true, true, 'YES',
          'OOS ระดับ Critical กระทบกระบวนการผลิตหลัก เข้าเกณฑ์ที่ควรพิจารณาเปิด CAPA',
          $2, $3, NOW() - INTERVAL '4 days',
          '{"what_happened":"ความหนืด Bulk ครีมกันแดดตก Spec ต่ำกว่าเกณฑ์มาตรฐาน 8,500 cPs จากสเปก 15,000-25,000 cPs ในถังผสม T-02"}',
          '[{"why_number":1,"cause":"ความหนืดต่ำกว่าเกณฑ์"},{"why_number":2,"cause":"โครงสร้างเจล Carbomer ไม่พองตัว"},{"why_number":3,"cause":"เติม Triethanolamine (TEA) ที่อุณหภูมิต่ำกว่ากำหนด"},{"why_number":4,"cause":"หน้าปัดแสดง 70°C แต่อุณหภูมิจริงอยู่ที่ 62°C"},{"why_number":5,"cause":"RTD Temp Sensor มีคราบตกค้างสะสมเกาะหนาแน่นเนื่องจากไม่มีรอบสุ่มตรวจหัวเซนเซอร์ใน PM ประจำสัปดาห์"}]',
          '{"is_evaluated":true,"training_adequate":true,"sop_clarity_adequate":true,"workload_reasonable":true,"equipment_interface_clear":true,"poka_yoke_present":false,"ergonomics_suitable":true,"process_design_robust":false,"supervision_adequate":true,"environment_suitable":true,"system_controls_sufficient":true,"maintenance_preventive_adhered":false,"systemic_findings":"พบช่องโหว่ด้านการบำรุงรักษาเชิงป้องกัน (PM) และขาดระบบตรวจทานอุณหภูมิสำรอง (Secondary Temp Check)"}'
        ) RETURNING id
      `, [eventId, qaUserId, qaUserName]);
      invId = insInv.rows[0].id;
    } else {
      invId = invRes.rows[0].id;
      // Update existing to ensure completed and capa_required = true
      await pgClient.query(`
        UPDATE qms_investigations 
        SET quality_event_id = $1, current_status = 'COMPLETED', capa_required = true,
            root_cause_category = 'MACHINE',
            root_cause_summary = 'RTD Temp Sensor ที่ถังผสม T-02 มีคราบ Carbomer เคลือบหนา ทำให้อ่านค่าอุณหภูมิต่ำกว่าจริง 8°C ผู้ปฏิบัติงานจึงเติม TEA เร็วเกินไปก่อนพอลิเมอร์คลายตัวสมบูรณ์'
        WHERE id = $2
      `, [eventId, invId]);
    }

    // Clean existing CAPA for this investigation to re-seed cleanly
    await pgClient.query("DELETE FROM qms_capas WHERE investigation_id = $1", [invId]);

    // Insert CAPA-2026-0001
    console.log('Creating demo CAPA CAPA-2026-0001...');
    const capaIns = await pgClient.query(`
      INSERT INTO qms_capas (
        capa_no, quality_event_id, investigation_id, title,
        problem_statement, root_cause_summary, root_cause_category,
        capa_owner_id, capa_owner_name, department_name,
        target_due_date, original_due_date, priority, current_status,
        correction_plan, corrective_action_plan, preventive_improvement_plan,
        snapshot_context, qa_coordinator_id, qa_coordinator_name,
        approved_by, approved_by_name, approved_at
      ) VALUES (
        'CAPA-2026-0001', $1, $2,
        'CAPA: ความหนืด Bulk ครีมกันแดดตก Spec ต่ำกว่าเกณฑ์มาตรฐาน (OOS Bulk Viscosity)',
        'ผล QC ประจำถังผสม T-02 พบความหนืด 8,500 cPs จากสเปก 15,000-25,000 cPs ในแบทช์ LOT-2026-V089',
        'RTD Temp Sensor ที่ถังผสม T-02 มีคราบ Carbomer เคลือบหนา ทำให้อ่านค่าอุณหภูมิต่ำกว่าจริง 8°C ผู้ปฏิบัติงานจึงเติม TEA เร็วเกินไปก่อนพอลิเมอร์คลายตัวสมบูรณ์',
        'MACHINE',
        $3, $4, 'Quality Assurance / ฝ่ายควบคุมและประกันคุณภาพ',
        NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days', 'HIGH', 'AWAITING_EFFECTIVENESS',
        '1. กักกัน Bulk LOT-2026-V089 ในถังพัก Quarantined Tank B-02 ติดป้าย HOLD ห้ามส่งจ่ายบรรจุ\n2. R&D และ QC ดำเนินการปรับแก้ความหนืด (Viscosity Rework Protocol) ในระดับแล็บนำร่อง',
        '1. แผนกซ่อมบำรุงเข้าถอดล้าง ทำความสะอาดหัววัด RTD Temp Sensor และทำ 3-Point Calibration\n2. เพิ่มขั้นตอนการตรวจสอบอุณหภูมิซ้ำด้วยเครื่องวัดแบบพกพา (Handheld Calibrated Dual-probe Check) ก่อนเติม TEA ทุกแบทช์',
        '1. ปรับปรุงมาตรฐานการปฏิบัติงาน WI-MIX-002 Rev.04 กำหนดขั้นตอน Dual-Temp Check และบันทึกลง BMR\n2. ปรับปรุงแผน PM-T02 เพิ่มรอบการตรวจสอบและทำความสะอาดหัววัดอุณหภูมิทุกสัปดาห์\n3. จัดฝึกอบรมและประเมินความรู้พนักงานผสม 100%',
        '{"product_sku":"SKU-SERUM-01","product_name":"Aura Glow Vitamin C Serum","batch_lot_no":"LOT-2026-V089","severity":"CRITICAL"}',
        $3, $4,
        $3, $4, NOW() - INTERVAL '3 days'
      ) RETURNING id
    `, [eventId, invId, qaUserId, qaUserName]);
    const capaId = capaIns.rows[0].id;

    // Action 1: Maintenance (CORRECTION)
    console.log('Seeding Action 1 (Maintenance)...');
    const act1 = await pgClient.query(`
      INSERT INTO qms_capa_actions (
        capa_id, action_no, action_type, title, description,
        responsible_owner_id, responsible_owner_name, department_name,
        due_date, original_due_date, status, evidence_required,
        implementation_notes, completed_at, completed_by, completed_by_name,
        verification_decision, verified_at, verified_by, verified_by_name, verification_comment
      ) VALUES (
        $1, 1, 'CORRECTION',
        'ตรวจสอบ ถอดล้างคราบพอลิเมอร์ และสอบเทียบหัววัด RTD Temp Sensor ถังผสม T-02',
        'เข้าทำความสะอาดคราบ Carbomer สะสมที่หัวโพรบ RTD ด้วยตัวทำละลายเฉพาะ และทำการสอบเทียบอุณหภูมิ 3 จุด (40°C, 65°C, 80°C) เทียบกับ Master Calibrator',
        $2, $3, 'Maintenance / แผนกซ่อมบำรุง',
        NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'VERIFIED',
        'Certificate of Calibration (CAL-2026-088) และภาพถ่ายหัววัดก่อน-หลังทำความสะอาด',
        'ได้เข้าถอดหัววัด RTD พบฟิล์มคราบ Carbomer เคลือบหนาประมาณ 1.2 มม. ได้ทำความสะอาดด้วย 70% IPA และสอบเทียบผล 3-Point Calibration ค่าความคลาดเคลื่อนอยู่ที่ ±0.15°C ผ่านเกณฑ์มาตรฐาน',
        NOW() - INTERVAL '2 days', $2, $3,
        'VERIFIED', NOW() - INTERVAL '1 day', $4, $5,
        'QA ตรวจสอบเอกสาร Cal Cert CAL-2026-088 และภาพถ่ายหน้างานเรียบร้อย อุณหภูมิกลับมาเที่ยงตรงตามเกณฑ์'
      ) RETURNING id
    `, [capaId, maintUserId, maintUserName, qaUserId, qaUserName]);
    const act1Id = act1.rows[0].id;

    // Action 2: Production (CORRECTIVE_ACTION)
    console.log('Seeding Action 2 (Production)...');
    const act2 = await pgClient.query(`
      INSERT INTO qms_capa_actions (
        capa_id, action_no, action_type, title, description,
        responsible_owner_id, responsible_owner_name, department_name,
        due_date, original_due_date, status, evidence_required,
        implementation_notes, completed_at, completed_by, completed_by_name,
        verification_decision, verified_at, verified_by, verified_by_name, verification_comment
      ) VALUES (
        $1, 2, 'CORRECTIVE_ACTION',
        'กำหนดจุดตรวจสอบอุณหภูมิอิสระ (Handheld Dual-Probe Check) ก่อนเติม TEA ทุกแบทช์',
        'ผู้ปฏิบัติงานผสมต้องใช้เครื่องวัดอุณหภูมิแบบพกพาที่ผ่านการสอบเทียบวัดเทียบกับหัวอ่านถัง T-02 ก่อนเติม TEA ทุกแบทช์ โดยค่าต้องตรงกันไม่เกิน ±1.0°C และบันทึกลง BMR',
        $2, $3, 'Production / ฝ่ายผลิต',
        NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day', 'VERIFIED',
        'สำเนา Batch Manufacturing Record (BMR) ที่มีการบันทึก Dual-Temp Check',
        'จัดหาเครื่องวัด Fluke 51 II ประจำไลน์ผสม และเริ่มใช้บันทึก Dual-Temp Check ใน BMR ทุกล็อตตั้งแต่วันที่ 22 ก.ย. สุ่มตรวจ 3 แบทช์ล่าสุดพบค่าตรงกันตามเกณฑ์',
        NOW() - INTERVAL '1 day', $2, $3,
        'VERIFIED', NOW(), $4, $5,
        'QA ตรวจสอบบันทึก BMR ล็อต LOT-2026-V091 และ V092 มีการลงนามตรวจสอบอุณหภูมิ 2 จุดครบถ้วน'
      ) RETURNING id
    `, [capaId, prodUserId, prodUserName, qaUserId, qaUserName]);
    const act2Id = act2.rows[0].id;

    // Action 3: DCC & Training (PREVENTIVE_IMPROVEMENT) with Extension history
    console.log('Seeding Action 3 (DCC & Training)...');
    const act3 = await pgClient.query(`
      INSERT INTO qms_capa_actions (
        capa_id, action_no, action_type, title, description,
        responsible_owner_id, responsible_owner_name, department_name,
        due_date, original_due_date, status, evidence_required,
        implementation_notes, completed_at, completed_by, completed_by_name,
        verification_decision, verified_at, verified_by, verified_by_name, verification_comment
      ) VALUES (
        $1, 3, 'PREVENTIVE_IMPROVEMENT',
        'ปรับปรุง WI-MIX-002 Rev.04 และจัดฝึกอบรมพนักงานแผนกผสม 12 คน',
        'ปรับปรุงเอกสารคู่มือการผลิต WI-MIX-002 เพิ่มขั้นตอนการตรวจหัวเซนเซอร์ใน PM ประจำสัปดาห์ และจัดการอบรมทบทวนความสำคัญของอุณหภูมิต่อโครงสร้าง Carbomer พร้อมทำ Post-test',
        $2, $3, 'DCC & Training / แผนกควบคุมเอกสารและการฝึกอบรม',
        NOW() + INTERVAL '7 days', NOW() + INTERVAL '3 days', 'VERIFIED',
        'เอกสาร WI-MIX-002 Rev.04 ที่อนุมัติแล้ว และใบลงทะเบียนฝึกอบรมพร้อมผลสอบ',
        'ประกาศใช้ WI-MIX-002 Rev.04 มีผลบังคับใช้เมื่อวันที่ 23 ก.ย. และได้จัดการอบรมพนักงานผสมครบ 12 คน ผลการทดสอบหลังการอบรมผ่านเกณฑ์ 100% ทุกคน',
        NOW() - INTERVAL '6 hours', $2, $3,
        'VERIFIED', NOW(), $4, $5,
        'QA ตรวจรับรองเอกสาร WI-MIX-002 Rev.04 และใบลงทะเบียนฝึกอบรมครบถ้วนสมบูรณ์ ปิดมาตรการครบทุกข้อ'
      ) RETURNING id
    `, [capaId, dccUserId, dccUserName, qaUserId, qaUserName]);
    const act3Id = act3.rows[0].id;

    // Insert extension record for Action 3
    await pgClient.query(`
      INSERT INTO qms_capa_action_extensions (
        action_id, original_due_date, new_due_date, extension_reason,
        requested_by, requested_by_name, approved_by, approved_by_name, approved_at, status
      ) VALUES (
        $1, NOW() + INTERVAL '3 days', NOW() + INTERVAL '7 days',
        'รอประชุมคณะกรรมการมาตรฐานกระบวนการผลิตเพื่อทบทวนเกณฑ์การล้างหัวเซนเซอร์เพิ่มเติม 4 วัน',
        $2, $3, $4, $5, NOW() - INTERVAL '1 day', 'APPROVED'
      )
    `, [act3Id, dccUserId, dccUserName, qaUserId, qaUserName]);

    // Attach Evidence Records
    console.log('Attaching Evidence Records...');
    await pgClient.query(`
      INSERT INTO qms_capa_evidence (
        capa_id, action_id, evidence_type, title, description,
        file_url, uploaded_by, uploaded_by_name
      ) VALUES 
      (
        $1, $2, 'MAINTENANCE_RECORD',
        'ใบรับรองผลการสอบเทียบ Calibration Certificate (CAL-2026-088)',
        '3-Point Temperature Calibration Report (40°C, 65°C, 80°C) ถังผสม T-02',
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
        $4, $5
      ),
      (
        $1, $2, 'PHOTO',
        'ภาพถ่ายหัววัด RTD Temp Sensor หลังทำความสะอาดคราบ Carbomer',
        'ภาพถ่ายโคลสอัพแสดงพื้นผิวสแตนเลส 316L สะอาดปราศจากฟิล์มตกค้าง',
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800',
        $4, $5
      ),
      (
        $1, $3, 'PROCESS_RECORD',
        'สำเนา BMR แบทช์ LOT-2026-V091 (Dual-Temp Check Record)',
        'บันทึกการตรวจสอบอุณหภูมิ 2 จุดก่อนเติมสารสะเทิน TEA มีลายเซ็น Double-check',
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
        $6, $7
      ),
      (
        $1, $8, 'REVISED_SOP_WI',
        'เอกสาร WI-MIX-002 Rev.04 (การควบคุมอุณหภูมิและการบำรุงรักษาหัววัด)',
        'ขั้นตอนการทำงานมาตรฐานฉบับปรับปรุงใหม่ มีผลบังคับใช้ 23 ก.ย. 2026',
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
        $9, $10
      ),
      (
        $1, $8, 'TRAINING_RECORD',
        'ใบลงทะเบียนฝึกอบรมและแบบทดสอบความเข้าใจพนักงานผสม 12 คน',
        'หลักฐานการฝึกอบรมพร้อมผลประเมิน Post-test 100% ผ่านเกณฑ์ทุกราย',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800',
        $9, $10
      )
    `, [
      capaId,
      act1Id,
      act2Id,
      maintUserId, maintUserName,
      prodUserId, prodUserName,
      act3Id,
      dccUserId, dccUserName
    ]);

    console.log('\n✅ Demo Case Seeding Completed Successfully:');
    console.log(`- Quality Event: QE-2026-0016 (Closed)`);
    console.log(`- Investigation: INV-2026-0016 (Completed, Machine Root Cause confirmed)`);
    console.log(`- CAPA: CAPA-2026-0001 (Status: AWAITING_EFFECTIVENESS)`);
    console.log(`- Actions: Exactly 3 Required Phase 3 Actions (Maintenance, Production, DCC), all 3 VERIFIED (100%)`);
    console.log(`- Phase 4 Protocol Action: REMOVED (Effectiveness work deferred to Phase 4)`);
    console.log(`- Evidence: 5 Linked attachments (Calibration Cert, Inspection Photos, BMR, Revised WI, Training Records)`);
    console.log(`- Due Date Extension Audit: Action 3 preserved original due date with approved reason`);

  } finally {
    await pgClient.end();
  }
}

seedPhase3DemoCase().catch(console.error);
