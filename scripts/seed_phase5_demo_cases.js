const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function seed() {
  await pgClient.connect();
  console.log('Connected to DB. Seeding Phase 5 Batch QA Review & Release UAT Cases A through J...');

  // 1. Fetch templates
  const emulsionTpl = await pgClient.query("SELECT * FROM qms_release_templates WHERE template_code = 'TPL-COSMETIC-EMULSION' LIMIT 1;");
  const oilTpl = await pgClient.query("SELECT * FROM qms_release_templates WHERE template_code = 'TPL-ANHYDROUS-OIL' LIMIT 1;");

  if (emulsionTpl.rows.length === 0 || oilTpl.rows.length === 0) {
    throw new Error('Templates not found. Run migration first.');
  }

  const emulsionTplId = emulsionTpl.rows[0].id;
  const oilTplId = oilTpl.rows[0].id;

  // 2. Fetch or seed dummy products
  let prodRes = await pgClient.query("SELECT id, sku, product_name FROM products LIMIT 3;");
  let creamProdId = prodRes.rows[0]?.id;
  let serumProdId = prodRes.rows[1]?.id;
  let oilProdId = prodRes.rows[2]?.id;

  if (!creamProdId) {
    const p1 = await pgClient.query(`
      INSERT INTO products (sku, product_name, product_size, standard_batch_size, default_unit)
      VALUES ('JHD-309', 'CosmeDiva White Booster Cream 50g', '50g', 500, 'pcs') RETURNING id;
    `);
    creamProdId = p1.rows[0].id;
  }

  // 3. Clear any existing Phase 5 demo releases, events, capas
  console.log('Cleaning prior demo batch releases, events, capas (LOT-2026-0050 to 0058)...');
  await pgClient.query("DELETE FROM qms_batch_releases WHERE lot_no LIKE 'LOT-2026-005%';");
  await pgClient.query("DELETE FROM qms_capas WHERE capa_no LIKE 'CAPA-2026-005%';");
  await pgClient.query("DELETE FROM qms_quality_events WHERE event_no LIKE 'QE-2026-005%';");

  // Helper to ensure production lot exists
  async function ensureLot(lotNo, skuId, qty, actualQty, status = 'IN_PRODUCTION') {
    let l = await pgClient.query('SELECT id FROM production_lots WHERE lot_no = $1;', [lotNo]);
    if (l.rows.length === 0) {
      l = await pgClient.query(`
        INSERT INTO production_lots (lot_no, sku_id, planned_quantity, batch_size_kg, current_status, planned_start_date, fg_due_date, order_no)
        VALUES ($1, $2, $3, $4, $5, '2026-09-20', '2028-09-19', 'PO-2026-0925')
        RETURNING id;
      `, [lotNo, skuId, qty, qty * 0.05, status]);
    }
    return l.rows[0].id;
  }

  // Master gate helper
  async function seedGatesForRelease(batchReleaseId, templateId, overrides = {}) {
    const templateGates = await pgClient.query('SELECT * FROM qms_release_template_gates WHERE template_id = $1 ORDER BY gate_number ASC;', [templateId]);
    for (const tg of templateGates.rows) {
      const override = overrides[tg.gate_code] || {};
      const status = override.status || (tg.requirement_level === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : 'PASS');
      const isHardBlock = override.is_hard_block || false;
      const hardBlockMsg = override.hard_block_message || null;
      const naReason = tg.requirement_level === 'NOT_APPLICABLE' ? (tg.default_na_justification || 'กำหนดให้ไม่เกี่ยวข้องตามประเภทผลิตภัณฑ์') : (override.na_reason || null);

      await pgClient.query(`
        INSERT INTO qms_batch_release_gate_evaluations (
          batch_release_id, gate_number, gate_code, gate_title_th, gate_title_en,
          requirement_level, status, is_hard_block, hard_block_message, na_reason,
          source_entity, source_status, source_last_updated, responsible_function
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13);
      `, [
        batchReleaseId,
        tg.gate_number,
        tg.gate_code,
        tg.gate_title_th,
        tg.gate_title_en,
        tg.requirement_level,
        status,
        isHardBlock,
        hardBlockMsg,
        naReason,
        tg.source_entity,
        status === 'PASS' ? 'PASSED' : status === 'FAIL' ? 'FAILED' : 'CHECKED',
        tg.source_entity?.includes('qc') ? 'QC Laboratory' : 'Production/QA'
      ]);
    }
  }

  // -------------------------------------------------------------
  // CASE A: READY FOR RELEASE -> All Gates Passed (LOT-2026-0050)
  // -------------------------------------------------------------
  console.log('Seeding CASE A: Ready for Release (LOT-2026-0050)...');
  const lotAId = await ensureLot('LOT-2026-0050', creamProdId, 10000, 9860, 'IN_PRODUCTION');
  const relA = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, total_gates_count, passed_gates_count, na_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status,
      coa_status
    ) VALUES (
      'REL-2026-0050', $1, 'LOT-2026-0050', $2, 'JHD-309', 'CosmeDiva White Booster Cream 50g',
      500.0, 10000, 9860, $3,
      'READY_FOR_QA_REVIEW', FALSE, 12, 12, 0,
      98.60, 97.00, 102.00, 'IN_SPEC',
      'DRAFT'
    ) RETURNING id;
  `, [lotAId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relA.rows[0].id, emulsionTplId);

  // -------------------------------------------------------------
  // CASE B: PENDING REQUIRED RESULT -> BLOCKED (LOT-2026-0051)
  // -------------------------------------------------------------
  console.log('Seeding CASE B: Microbiology Pending -> BLOCKED (LOT-2026-0051)...');
  const lotBId = await ensureLot('LOT-2026-0051', creamProdId, 10000, 9900, 'WAITING_QC');
  const relB = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, blocking_reasons, total_gates_count, passed_gates_count, pending_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status
    ) VALUES (
      'REL-2026-0051', $1, 'LOT-2026-0051', $2, 'JHD-309', 'CosmeDiva White Booster Cream 50g',
      500.0, 10000, 9900, $3,
      'BLOCKED', TRUE, '[{"gate_code":"GATE_07_MICRO","gate_title":"ผลวิเคราะห์ทางจุลชีววิทยาตามเกณฑ์มาตรฐาน","reason":"ผลทดสอบเชื้อจุลินทรีย์ยังอยู่ระหว่างดำเนินการ (Micro Pending) ยังไม่ครบกำหนดเวลาทดสอบตามมาตรฐาน","severity":"CRITICAL"}]'::jsonb,
      12, 11, 1,
      99.00, 97.00, 102.00, 'IN_SPEC'
    ) RETURNING id;
  `, [lotBId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relB.rows[0].id, emulsionTplId, {
    GATE_07_MICRO: {
      status: 'PENDING',
      is_hard_block: true,
      hard_block_message: 'ผลการทดสอบทางจุลชีววิทยา (Microbiology) ยังไม่เสร็จสิ้น หรืออยู่ระหว่างการเพาะเชื้อ',
    }
  });

  // -------------------------------------------------------------
  // CASE D: SIGNIFICANT UNRESOLVED QUALITY EVENT -> BLOCKED (LOT-2026-0052)
  // -------------------------------------------------------------
  console.log('Seeding CASE D: Significant Unresolved Quality Event -> BLOCKED (LOT-2026-0052)...');
  const lotCId = await ensureLot('LOT-2026-0052', creamProdId, 8000, 7920, 'IN_INVESTIGATION');
  const qeC = await pgClient.query(`
    INSERT INTO qms_quality_events (
      event_no, event_date, reported_by, reporter_name, title, description,
      production_lot_id, material_type, qa_confirmed_type, qa_confirmed_severity, risk_level,
      workflow_path, containment_required, containment_status, current_status, snapshot_context
    ) VALUES (
      'QE-2026-0052', NOW(), '00000000-0000-0000-0000-000000000001', 'สุพจน์ ควบคุมคุณภาพ',
      'ผลตรวจแล็บ OOS: ค่าความเป็นกรด-ด่าง (pH) ผิดปกติ', 'พบค่า pH 7.80 เกินเกณฑ์มาตรฐานที่อนุมัติ (5.20 - 5.80) อยู่ระหว่างการสอบสวนหาสาเหตุรากเหง้า',
      $1, 'BULK', 'OOS', 'CRITICAL', 'CRITICAL',
      'FULL_INVESTIGATION', FALSE, 'NOT_REQUIRED', 'INVESTIGATING', '{}'::jsonb
    ) RETURNING id, event_no;
  `, [lotCId]);

  const relC = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, blocking_reasons, total_gates_count, passed_gates_count, failed_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status
    ) VALUES (
      'REL-2026-0052', $1, 'LOT-2026-0052', $2, 'JHD-202', 'CosmeDiva Acne Clarifying Toner 150ml',
      400.0, 8000, 7920, $3,
      'BLOCKED', TRUE, '[{"gate_code":"GATE_08_DEVIATION","gate_title":"การตรวจสอบเหตุการณ์คุณภาพและข้อเบี่ยงเบน","reason":"มีข้อเบี่ยงเบนระดับวิกฤต (Critical Deviation) QE-2026-0052: ผลตรวจแล็บ OOS pH 7.80 ที่ยังไม่เสร็จสิ้นการประเมิน","severity":"CRITICAL","link_id":"${qeC.rows[0].id}"}]'::jsonb,
      12, 11, 1,
      99.00, 97.00, 102.00, 'IN_SPEC'
    ) RETURNING id;
  `, [lotCId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relC.rows[0].id, emulsionTplId, {
    GATE_08_DEVIATION: {
      status: 'FAIL',
      is_hard_block: true,
      hard_block_message: `มีข้อเบี่ยงเบนระดับวิกฤต ${qeC.rows[0].event_no} (OOS pH 7.80) ที่ยังอยู่ระหว่างการสอบสวน`,
    }
  });

  // -------------------------------------------------------------
  // CASE C: Active QA Hold Affecting Lot -> QA_ON_HOLD (LOT-2026-0053)
  // -------------------------------------------------------------
  console.log('Seeding CASE C: Active QA Hold -> QA_ON_HOLD (LOT-2026-0053)...');
  const lotDId = await ensureLot('LOT-2026-0053', creamProdId, 5000, 4950, 'QA_HOLD');
  // Create an active containment Quality Event
  const qeD = await pgClient.query(`
    INSERT INTO qms_quality_events (
      event_no, event_date, reported_by, reporter_name, title, description,
      production_lot_id, material_type, qa_confirmed_type, qa_confirmed_severity, risk_level,
      workflow_path, containment_required, containment_status, current_status, snapshot_context
    ) VALUES (
      'QE-2026-0053', NOW(), '00000000-0000-0000-0000-000000000001', 'สมชาย มั่นคง',
      'พบสิ่งแปลกปลอมในวาล์วจ่ายถังผสม Mix-04', 'พบสะเก็ดสนิมขนาดเล็กบริเวณข้อต่อท่อลำเลียงเนื้อครีม (Active QA Hold สั่งกักกัน)',
      $1, 'BULK', 'DEVIATION', 'CRITICAL', 'CRITICAL',
      'FULL_CAPA', TRUE, 'CONTAINED', 'CONTAINMENT_ACTIVE', '{}'::jsonb
    ) RETURNING id, event_no;
  `, [lotDId]);

  const relD = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, blocking_reasons, total_gates_count, passed_gates_count, failed_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status
    ) VALUES (
      'REL-2026-0053', $1, 'LOT-2026-0053', $2, 'JHD-301', 'CosmeDiva Hydrating Serum 30ml',
      250.0, 5000, 4950, $3,
      'QA_ON_HOLD', TRUE, '[{"gate_code":"GATE_08_DEVIATION","gate_title":"การตรวจสอบเหตุการณ์คุณภาพและข้อเบี่ยงเบน","reason":"รุ่นการผลิตอยู่ระหว่างการกักกันคุณภาพ (Active QA Hold) จากเหตุการณ์ QE-2026-0053: พบสิ่งแปลกปลอมในวาล์วจ่ายถังผสม Mix-04","severity":"CRITICAL","link_id":"${qeD.rows[0].id}"}]'::jsonb,
      12, 11, 1,
      99.00, 97.00, 102.00, 'IN_SPEC'
    ) RETURNING id;
  `, [lotDId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relD.rows[0].id, emulsionTplId, {
    GATE_08_DEVIATION: {
      status: 'FAIL',
      is_hard_block: true,
      hard_block_message: `รุ่นการผลิตอยู่ระหว่างการกักกันคุณภาพ (Active QA Hold) จากเหตุการณ์ ${qeD.rows[0].event_no}`,
    }
  });

  // -------------------------------------------------------------
  // CASE E: Open CAPA Unrelated to Lot -> QA Impact Review (LOT-2026-0054)
  // -------------------------------------------------------------
  console.log('Seeding CASE E: Open CAPA Unrelated -> READY FOR QA REVIEW with Impact Review (LOT-2026-0054)...');
  const lotEId = await ensureLot('LOT-2026-0054', creamProdId, 10000, 9890, 'IN_PRODUCTION');
  // Seed a non-blocking QE & CAPA
  const qeE = await pgClient.query(`
    INSERT INTO qms_quality_events (
      event_no, event_date, reported_by, reporter_name, title, description,
      production_lot_id, material_type, qa_confirmed_type, qa_confirmed_severity, risk_level,
      workflow_path, containment_required, containment_status, current_status, snapshot_context
    ) VALUES (
      'QE-2026-0054', NOW(), '00000000-0000-0000-0000-000000000001', 'อนุสรณ์ ช่างกล',
      'มอเตอร์หัวขันฝา Line 2 เกิดเสียงดังผิดปกติ', 'ตรวจพบการสั่นสะเทือนของมอเตอร์ Line 2 แต่แรงบิดฝายังอยู่ในเกณฑ์',
      $1, 'EQUIP', 'EQUIPMENT_ISSUE', 'MINOR', 'LOW',
      'STANDARD', FALSE, 'NOT_REQUIRED', 'RESOLVED', '{}'::jsonb
    ) RETURNING id;
  `, [lotEId]);

  await pgClient.query(`
    INSERT INTO qms_capas (
      capa_no, quality_event_id, investigation_id, title, problem_statement, root_cause_summary,
      capa_owner_id, capa_owner_name, department_name, priority, target_due_date, original_due_date,
      current_status
    ) VALUES (
      'CAPA-2026-0054', $1, (SELECT id FROM qms_investigations LIMIT 1),
      'ปรับปรุงรอบการบำรุงรักษาเชิงป้องกันมอเตอร์หัวขันฝา Line 2',
      'มอเตอร์หัวขันฝา Line 2 เกิดแรงสั่นสะเทือนสะสม', 'แบริ่งเสื่อมสภาพตามอายุการใช้งาน',
      '00000000-0000-0000-0000-000000000001', 'อนุสรณ์ ช่างกล', 'Maintenance', 'LOW', NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days',
      'IN_PROGRESS'
    );
  `, [qeE.rows[0].id]);

  const relE = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, total_gates_count, passed_gates_count, na_gates_count,
      open_capa_count, capa_impact_reviewed,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status
    ) VALUES (
      'REL-2026-0054', $1, 'LOT-2026-0054', $2, 'JHD-309', 'CosmeDiva White Booster Cream 50g',
      500.0, 10000, 9890, $3,
      'READY_FOR_QA_REVIEW', FALSE, 12, 12, 0,
      1, FALSE,
      98.90, 97.00, 102.00, 'IN_SPEC'
    ) RETURNING id;
  `, [lotEId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relE.rows[0].id, emulsionTplId);

  // -------------------------------------------------------------
  // CASE F: Significant Quality Event Affecting Lot -> QA Review (LOT-2026-0055)
  // -------------------------------------------------------------
  console.log('Seeding CASE F: Significant Quality Event -> QA Review (LOT-2026-0055)...');
  const lotFId = await ensureLot('LOT-2026-0055', creamProdId, 6000, 5920, 'IN_PRODUCTION');
  await pgClient.query(`
    INSERT INTO qms_quality_events (
      event_no, event_date, reported_by, reporter_name, title, description,
      production_lot_id, material_type, qa_confirmed_type, qa_confirmed_severity, risk_level,
      workflow_path, containment_required, containment_status, current_status, snapshot_context,
      correction_notes
    ) VALUES (
      'QE-2026-0055', NOW(), '00000000-0000-0000-0000-000000000001', 'สุดา บรรจุภัณฑ์',
      'พบรอยขูดขีดบนกล่องบรรจุภัณฑ์ภายนอก 25 กล่อง', 'กล่องเกิดรอยขูดขีดระหว่างลำเลียงเข้าเครื่องหุ้มฟิล์ม',
      $1, 'PM', 'NCR', 'MINOR', 'LOW',
      'FAST_TRACK', FALSE, 'NOT_REQUIRED', 'RESOLVED', '{}'::jsonb,
      'คัดแยกกล่องที่มีรอยออกจำนวน 25 กล่อง และเปลี่ยนกล่องใหม่เรียบร้อยแล้ว'
    );
  `, [lotFId]);

  const relF = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, total_gates_count, passed_gates_count, na_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status
    ) VALUES (
      'REL-2026-0055', $1, 'LOT-2026-0055', $2, 'JHD-309', 'CosmeDiva White Booster Cream 50g',
      300.0, 6000, 5920, $3,
      'READY_FOR_QA_REVIEW', FALSE, 12, 12, 0,
      98.67, 97.00, 102.00, 'IN_SPEC'
    ) RETURNING id;
  `, [lotFId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relF.rows[0].id, emulsionTplId);

  // -------------------------------------------------------------
  // CASE G: Required Release Evidence Missing -> BLOCKED (LOT-2026-0056)
  // -------------------------------------------------------------
  console.log('Seeding CASE G: Required Evidence Missing -> BLOCKED (LOT-2026-0056)...');
  const lotGId = await ensureLot('LOT-2026-0056', creamProdId, 5000, 4850, 'IN_PRODUCTION');
  const relG = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, blocking_reasons, total_gates_count, passed_gates_count, pending_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status
    ) VALUES (
      'REL-2026-0056', $1, 'LOT-2026-0056', $2, 'JHD-405', 'CosmeDiva Daily Sunscreen SPF50+ 40g',
      200.0, 5000, 4850, $3,
      'BLOCKED', TRUE, '[{"gate_code":"GATE_03_BMR","gate_title":"ความสมบูรณ์ของบันทึกการผลิต (BMR/BPR)","reason":"ขาดลายเซ็นผู้ควบคุมการผสม (Mixing Step Sign-off Missing) ในบันทึกการผลิต","severity":"MAJOR"}]'::jsonb,
      12, 11, 1,
      97.00, 97.00, 102.00, 'IN_SPEC'
    ) RETURNING id;
  `, [lotGId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relG.rows[0].id, emulsionTplId, {
    GATE_03_BMR: {
      status: 'PENDING',
      is_hard_block: true,
      hard_block_message: 'ขาดลายเซ็นยืนยันขั้นตอนการผสมของหัวหน้างาน (Production Supervisor Signature Missing)',
    }
  });

  // -------------------------------------------------------------
  // CASE H: QA REJECTED -> Controlled Disposition Required (LOT-2026-0057)
  // -------------------------------------------------------------
  console.log('Seeding CASE H: QA REJECTED with Controlled Disposition (LOT-2026-0057)...');
  const lotHId = await ensureLot('LOT-2026-0057', creamProdId, 4000, 3960, 'QA_REJECTED');
  const relH = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, total_gates_count, passed_gates_count, failed_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status,
      current_disposition, disposition_notes, disposition_at, disposition_by_name, disposition_by_role,
      non_conformance_path, rework_protocol_no
    ) VALUES (
      'REL-2026-0057', $1, 'LOT-2026-0057', $2, 'JHD-101', 'CosmeDiva Intensive Night Cream 50g',
      200.0, 4000, 3960, $3,
      'QA_REJECTED', FALSE, 12, 11, 1,
      99.00, 97.00, 102.00, 'IN_SPEC',
      'QA_REJECTED', 'ความหนืดเนื้อครีมต่ำกว่าข้อกำหนดอย่างมีนัยสำคัญ (5,400 cP vs ข้อกำหนด 15,000 - 22,000 cP) ไม่อนุญาตให้ปล่อยผ่าน', NOW(), 'ภญ. วริศรา มั่นคง', 'QA_MANAGER',
      'REWORK_CONSIDERATION', 'RWK-2026-0005'
    ) RETURNING id;
  `, [lotHId, creamProdId, emulsionTplId]);
  await seedGatesForRelease(relH.rows[0].id, emulsionTplId, {
    GATE_06_PHYS_CHEM: {
      status: 'FAIL',
      is_hard_block: true,
      hard_block_message: 'ความหนืด 5,400 cP ต่ำกว่าข้อกำหนดมาตรฐาน (15,000 - 22,000 cP)',
    }
  });
  // Add disposition record
  await pgClient.query(`
    INSERT INTO qms_batch_release_dispositions (
      batch_release_id, decision, reason_rationale, non_conformance_disposition, rework_protocol_reference,
      authorized_by, authorized_by_name, authorized_by_role, authorized_at, lot_state_before, lot_state_after
    ) VALUES (
      $1, 'QA_REJECTED', 'ความหนืดเนื้อครีมต่ำกว่าข้อกำหนดอย่างมีนัยสำคัญ (5,400 cP) ปฏิเสธการตรวจปล่อยและส่งเข้าสู่กระบวนการพิจารณาปรับปรุงรุ่นการผลิต',
      'REWORK_CONSIDERATION', 'RWK-2026-0005',
      '00000000-0000-0000-0000-000000000001', 'ภญ. วริศรา มั่นคง', 'QA_MANAGER', NOW(), 'WAITING_FOR_RESULT', 'QA_REJECTED'
    );
  `, [relH.rows[0].id]);

  // -------------------------------------------------------------
  // CASE I: Conditional/N/A Release Gate -> Reason & Traceability Retained (LOT-2026-0058)
  // -------------------------------------------------------------
  console.log('Seeding CASE I: Anhydrous Oil with Micro N/A Justified (LOT-2026-0058)...');
  const lotIId = await ensureLot('LOT-2026-0058', creamProdId, 3000, 2980, 'READY_FOR_REVIEW');
  const relI = await pgClient.query(`
    INSERT INTO qms_batch_releases (
      release_no, production_lot_id, lot_no, sku_id, sku_code, product_name,
      batch_size_kg, planned_quantity, actual_quantity, template_id,
      overall_status, is_blocked, total_gates_count, passed_gates_count, na_gates_count,
      yield_actual_pct, yield_spec_min_pct, yield_spec_max_pct, yield_status
    ) VALUES (
      'REL-2026-0058', $1, 'LOT-2026-0058', $2, 'JHD-105', 'CosmeDiva Pure Argan Cleansing Oil 100ml',
      300.0, 3000, 2980, $3,
      'READY_FOR_QA_REVIEW', FALSE, 12, 11, 1,
      99.33, 98.00, 101.50, 'IN_SPEC'
    ) RETURNING id;
  `, [lotIId, creamProdId, oilTplId]);
  await seedGatesForRelease(relI.rows[0].id, oilTplId);

  console.log('✅ Phase 5 UAT Cases A through J Seeded Successfully!');
  await pgClient.end();
}

seed().catch(e => {
  console.error('Seed error:', e);
  process.exit(1);
});
