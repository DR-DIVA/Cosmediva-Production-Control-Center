import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function runSeed() {
  console.log('Connecting to PostgreSQL on Supabase...');
  await client.connect();
  console.log('Connected!');

  // 1. Sites
  await client.query(`
    INSERT INTO improve_sites (site_code, site_name, is_active)
    VALUES ('SITE-01', 'CosmeDiva Factory', true)
    ON CONFLICT (site_code) DO UPDATE SET site_name = 'CosmeDiva Factory';
  `);
  console.log('1. Site created');

  // 2. Lines & Stations for Packing Department
  await client.query(`
    DO $$
    DECLARE
      pkg_dept_id UUID;
      site_id_val UUID;
      line1_id UUID;
      line2_id UUID;
    BEGIN
      SELECT id INTO pkg_dept_id FROM departments WHERE department_code = 'PKG' LIMIT 1;
      SELECT id INTO site_id_val FROM improve_sites WHERE site_code = 'SITE-01' LIMIT 1;
      
      INSERT INTO improve_lines (department_id, line_code, line_name, site_id, is_active)
      VALUES (pkg_dept_id, 'LINE-PKG-01', 'Packing Line 1 (ขวด/เซรั่ม/ครีม)', site_id_val, true)
      ON CONFLICT DO NOTHING;

      SELECT id INTO line1_id FROM improve_lines WHERE line_code = 'LINE-PKG-01' LIMIT 1;

      INSERT INTO improve_lines (department_id, line_code, line_name, site_id, is_active)
      VALUES (pkg_dept_id, 'LINE-PKG-02', 'Packing Line 2 (หลอด/ซอง/สเปรย์)', site_id_val, true)
      ON CONFLICT DO NOTHING;

      IF line1_id IS NOT NULL THEN
        INSERT INTO improve_stations (line_id, station_code, station_name, sequence_order)
        VALUES 
          (line1_id, 'ST-PKG-01', 'สถานีที่ 1: ป้อนขวด/ขึ้นรูป (Bottle Feeding)', 1),
          (line1_id, 'ST-PKG-02', 'สถานีที่ 2: บรรจุและปิดฝา (Filling & Capping)', 2),
          (line1_id, 'ST-PKG-03', 'สถานีที่ 3: ติดฉลาก & ยิงล็อต (Labeling & Inkjet)', 3),
          (line1_id, 'ST-PKG-04', 'สถานีที่ 4: พับกล่องเดี่ยว (Unit Cartoning)', 4),
          (line1_id, 'ST-PKG-05', 'สถานีที่ 5: ชริ้งค์ฟิล์มหุ้มแผง (Shrink POF Wrap)', 5),
          (line1_id, 'ST-PKG-06', 'สถานีที่ 6: บรรจุลงกล่องลัง (Master Packing)', 6)
        ON CONFLICT DO NOTHING;
      END IF;
    END $$;
  `);
  console.log('2. Lines & Stations created');

  // 3. Waste Categories (DOWNTIME + Factory Gaps)
  await client.query(`
    INSERT INTO improve_waste_categories (code, name_en, name_th, type, description, color_code)
    VALUES
      ('W_DEFECT', 'Defects', 'งานเสีย / ของเสีย / Rework', 'LEAN_8_WASTE', 'งานที่ไม่ผ่านมาตรฐาน ต้องคัดทิ้ง แก้ไข หรือทดสอบใหม่', '#EF4444'),
      ('W_OVERPROD', 'Overproduction', 'ผลิตเกินความต้องการ', 'LEAN_8_WASTE', 'ผลิตเร็วกว่า หรือมากกว่าปริมาณที่ระบุในคำสั่งผลิต', '#F97316'),
      ('W_WAITING', 'Waiting', 'การรอคอย / Bottleneck', 'LEAN_8_WASTE', 'คนรอสาร รอเครื่องจักร รอตรวจปล่อย QC หรือไลน์ติดขัด', '#FBBF24'),
      ('W_TALENT', 'Non-utilized Talent', 'ไม่ดึงศักยภาพพนักงาน', 'LEAN_8_WASTE', 'ไม่ได้ใช้ความคิดสร้างสรรค์ ทักษะ หรือข้อเสนอแนะหน้างาน', '#A855F7'),
      ('W_TRANSPORT', 'Transportation', 'การขนย้ายซ้ำซ้อน / ไกล', 'LEAN_8_WASTE', 'เคลื่อนย้ายวัตถุดิบ/ชิ้นงานไกลเกินจำเป็นระหว่างสเตชั่น', '#3B82F6'),
      ('W_INVENTORY', 'Inventory', 'สต็อก WIP กองค้าง', 'LEAN_8_WASTE', 'ของกองสะสมหน้าไลน์ รอคิวผลิตนาน บดบังพื้นที่ทำงาน', '#6366F1'),
      ('W_MOTION', 'Motion', 'การเคลื่อนไหวสูญเปล่า', 'LEAN_8_WASTE', 'การเอื้อม ก้ม ยก หมุนตัว หรือเดินหลายก้าวในการหยิบชิ้นส่วน', '#EC4899'),
      ('W_OVERPROC', 'Extra Processing', 'ขั้นตอนเกินจำเป็น / ซ้ำซ้อน', 'LEAN_8_WASTE', 'กระบวนการที่ไม่ได้เพิ่มมูลค่า เช่น ตรวจเช็กซ้ำเกินมาตรฐาน', '#14B8A6'),
      ('GAP_SKILL', 'Skill Gap', 'ช่องว่างด้านทักษะ', 'FACTORY_GAP', 'ความชำนาญไม่สม่ำเสมอ ส่งผลต่อความเร็วและข้อผิดพลาด', '#8B5CF6'),
      ('GAP_STANDARD', 'Standard Work Gap', 'ขาดมาตรฐานปฏิบัติงาน (WI/OPL)', 'FACTORY_GAP', 'แต่ละคนทำคนละวิธี ไม่มีมาตรฐานชัดเจนหน้างาน', '#D97706'),
      ('GAP_QUALITY', 'Quality Risk', 'ความเสี่ยงด้านคุณภาพ', 'FACTORY_GAP', 'จุดเสี่ยงที่อาจทำให้เกิดสินค้าไม่ได้มาตรฐานหรือหลุดไปคลัง', '#DC2626'),
      ('GAP_GMP', 'GMP Risk', 'ความเสี่ยงสุขอนามัย / ปนเปื้อน', 'FACTORY_GAP', 'จุดเสี่ยงต่อการปนเปื้อนข้าม (Cross-contamination) หรือความสะอาด', '#B91C1C'),
      ('GAP_SAFETY', 'Safety Risk', 'ความเสี่ยงความปลอดภัย / กายศาสตร์', 'FACTORY_GAP', 'ท่าทางการทำงานที่ไม่ถูกสุขลักษณะ เสี่ยงต่อการบาดเจ็บ', '#EA580C')
    ON CONFLICT (code) DO NOTHING;
  `);
  console.log('3. Waste categories created');

  // 4. Cost Rates
  await client.query(`
    INSERT INTO improve_cost_rates (rate_code, rate_name, rate_type, amount_thb, unit, notes)
    VALUES
      ('RATE_DL_STD', 'อัตราค่าแรงงานตรงมาตรฐาน (Direct Labor Standard)', 'LABOR', 85.00, 'THB/HOUR', 'ค่าแรงเฉลี่ยพนักงานผลิตรวมสวัสดิการพื้นฐาน'),
      ('RATE_DL_OT', 'อัตราค่าแรงล่วงเวลา (Overtime 1.5x)', 'OT', 127.50, 'THB/HOUR', 'ค่าจ้างโอทีตามกฎหมายแรงงาน'),
      ('RATE_MC_PKG', 'อัตราค่าเครื่องจักรบรรจุ (Packing Machine Hour)', 'MACHINE', 450.00, 'THB/HOUR', 'ค่าเสื่อมและพลังงานไลน์บรรจุ'),
      ('RATE_SCRAP_BOX', 'ต้นทุนเฉลี่ยกล่องบรรจุภัณฑ์เสียหาย', 'SCRAP', 4.50, 'THB/UNIT', 'เฉลี่ยต้นทุนกล่องเคลือบฟอยล์')
    ON CONFLICT DO NOTHING;
  `);
  console.log('4. Cost rates created');

  // 5. Seed Packing Pilot Observation, Loss Calculation & Improvement Project
  await client.query(`
    DO $$
    DECLARE
      pkg_dept_id UUID;
      site_id_val UUID;
      line1_id UUID;
      st2_id UUID;
      obs_id UUID;
      proj_id UUID;
    BEGIN
      SELECT id INTO pkg_dept_id FROM departments WHERE department_code = 'PKG' LIMIT 1;
      SELECT id INTO site_id_val FROM improve_sites WHERE site_code = 'SITE-01' LIMIT 1;
      SELECT id INTO line1_id FROM improve_lines WHERE line_code = 'LINE-PKG-01' LIMIT 1;
      SELECT id INTO st2_id FROM improve_stations WHERE station_code = 'ST-PKG-02' LIMIT 1;

      INSERT INTO improve_observations (
        observation_no,
        date_time,
        shift,
        site_id,
        department_id,
        line_id,
        station_id,
        sku,
        product_name,
        lot_no,
        work_order,
        activity_name,
        description,
        severity,
        status,
        quality_risk,
        gmp_risk,
        safety_risk,
        skill_gap,
        standard_gap,
        estimated_monthly_loss,
        estimated_annual_loss,
        potential_saving,
        observer_name,
        is_demo
      )
      VALUES (
        'OBS-2026-0001',
        NOW() - INTERVAL '2 days',
        'Day Shift (08:00 - 17:00)',
        site_id_val,
        pkg_dept_id,
        line1_id,
        st2_id,
        'SKU-JHD-309',
        'JHD Brightening Serum 30ml',
        'L2609-001',
        'WO-260901',
        'ปิดฝาขวดและจัดเรียง (Capping & Stacking)',
        'พนักงาน Packing 6 คน ต้องเดินไปหยิบกล่องบรรจุภัณฑ์ประมาณ 6 เมตร ทุกครั้งที่แพ็กครบ 12 ชิ้น (เดิน 3-4 ก้าวไปกลับ) ส่งผลให้เสียเวลาต่อรอบและไลน์ติดขัดสะสม',
        'MEDIUM',
        'VALIDATED',
        false,
        false,
        false,
        false,
        true,
        14144.00,
        169728.00,
        169728.00,
        'คุณสมชาย (Cost Accounting Manager)',
        true
      )
      ON CONFLICT (observation_no) DO NOTHING
      RETURNING id INTO obs_id;

      IF obs_id IS NULL THEN
        SELECT id INTO obs_id FROM improve_observations WHERE observation_no = 'OBS-2026-0001' LIMIT 1;
      END IF;

      INSERT INTO improve_ai_analysis (
        observation_id,
        agent_type,
        model_name,
        finding_title,
        observed_condition,
        primary_waste,
        secondary_waste,
        potential_root_cause,
        recommended_next_step,
        suggested_owner_dept,
        potential_cost_driver,
        gate_status,
        confidence_score,
        raw_output
      )
      VALUES (
        obs_id,
        'GEMBA_AI',
        'Gemini-3.8-Flash',
        'การเคลื่อนไหวสูญเปล่าและการขนย้ายกล่องบรรจุภัณฑ์ซ้ำซ้อน (Excessive Motion & Material Walking)',
        'ผู้ปฏิบัติงานเดินไปกลับ 6 เมตร เพื่อหยิบกล่องเปล่ามาประกอบทุกรอบ 12 ชิ้น ไม่มีการจัดวางกล่องในระยะเอื้อมมือปกติ (Normal Reach Zone)',
        'Motion',
        'Transportation',
        'Workstation Layout และการวาง Pallet กล่องบรรจุภัณฑ์อยู่นอกพื้นที่ทำงานหลัก ขาดจุดสไลด์กล่องข้างไลน์',
        'ทำ Motion Study และทดลองปรับจุดวางกล่องบรรจุภัณฑ์ให้อยู่ข้างโต๊ะปฏิบัติการ (ECRS: Rearrange)',
        'Packing',
        'Labor Loss (สูญเสียเวลาทำงานของพนักงาน 6 คน)',
        'PASS',
        0.94,
        '{"analysis": "Lean waste identified as Motion + Transportation. Process change is safe for GMP/Quality as it does not modify product contact surfaces."}'::jsonb
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_human_validations (
        observation_id,
        decision,
        confirmed_primary_waste,
        confirmed_secondary_waste,
        confirmed_root_cause,
        confirmed_severity,
        reviewer_name,
        reviewer_comment
      )
      VALUES (
        obs_id,
        'ACCEPTED',
        'Motion',
        'Transportation',
        'ตำแหน่งวางกล่องบรรจุภัณฑ์ห่างเกินไป ทำให้พนักงานต้องก้าวเท้าซ้ำซ้อน 200+ รอบต่อกะ',
        'MEDIUM',
        'คุณอนุชา (Production Supervisor)',
        'ยืนยันข้อเท็จจริงหน้างานจริง เดินไกลจริงเนื่องจากนำพาเลทมาวางไว้ท้ายแถว'
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_loss_calculations (
        observation_id,
        loss_type,
        lost_minutes_per_occ,
        frequency_per_shift,
        shifts_per_day,
        working_days_per_month,
        number_of_people,
        labor_cost_rate,
        lost_hours_per_month,
        monthly_loss_thb,
        annual_loss_thb,
        assumptions
      )
      VALUES (
        obs_id,
        'LABOR_LOSS',
        1.0,
        64.0,
        1.0,
        26.0,
        6.0,
        85.00,
        166.40,
        14144.00,
        169728.00,
        'พนักงาน 6 คน เสียเวลาเฉลี่ย 8 นาที/ชั่วโมง กะละ 8 ชม. ทำงาน 26 วัน/เดือน ค่าแรงมาตรฐาน 85 บาท/ชม.'
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_projects (
        project_no,
        title,
        problem_statement,
        department_id,
        line_id,
        station_id,
        owner_name,
        sponsor_name,
        cost_validator_name,
        qa_validator_name,
        start_date,
        target_date,
        pdca_stage,
        status,
        priority,
        baseline_summary,
        target_summary,
        expected_annual_saving,
        calculated_saving,
        productivity_gain_pct,
        released_capacity_hours,
        finance_validated_hard_saving,
        quality_gate_status,
        qa_signed_by,
        qa_signed_at,
        qa_comment,
        lessons_learned,
        is_demo
      )
      VALUES (
        'IMP-2026-00001',
        'ปรับปรุงจุดจ่ายกล่องบรรจุภัณฑ์ลดระยะเดิน 6 เมตร (Line 1 Box Pallet ECRS)',
        'พนักงานแพ็กกิ้งต้องเดินหยิบกล่องไป-กลับ 6 เมตร สูญเสียเวลาทำงานเดือนละ 166.4 ชั่วโมง คิดเป็นต้นทุนสูญเปล่า 169,728 บาทต่อปี',
        pkg_dept_id,
        line1_id,
        st2_id,
        'คุณสุรชัย (IE Specialist)',
        'คุณสมเกียรติ (Factory Director)',
        'คุณสมชาย (Cost Accounting Manager)',
        'คุณพิมพา (QA Manager)',
        CURRENT_DATE - INTERVAL '14 days',
        CURRENT_DATE + INTERVAL '14 days',
        'CHECK',
        'TRIAL',
        'HIGH',
        'Cycle Time = 12.0 วินาที/ชิ้น, ระยะเดินรวม 1,200 เมตร/กะ, กำลังการผลิต 2,400 ชิ้น/กะ',
        'Cycle Time <= 9.5 วินาที/ชิ้น, ระยะเดิน 0 เมตร (หยิบในรัศมี 40 ซม.), เพิ่ม Productivity +20%',
        169728.00,
        169728.00,
        20.83,
        166.40,
        0.00,
        'PASS',
        'คุณพิมพา (QA Manager)',
        NOW() - INTERVAL '5 days',
        'ตรวจสอบแล้ว การขยับกล่องบรรจุภัณฑ์ไม่กระทบต่อสุขอนามัย ไม่มีความเสี่ยงต่อสิ่งแปลกปลอมตกใส่ผลิตภัณฑ์',
        'การจัด Workstation Layout ตามหลัก Ergonomics ช่วยปลดปล่อยกำลังคนได้โดยไม่ต้องลงทุนซื้อเครื่องจักรราคาแพง',
        true
      )
      ON CONFLICT (project_no) DO NOTHING
      RETURNING id INTO proj_id;

      IF proj_id IS NOT NULL THEN
        -- 6. Standard Work & Digital OPL
        INSERT INTO improve_standard_work (
          project_id,
          doc_no,
          title,
          doc_type,
          department_id,
          revision,
          effective_date,
          owner_name,
          qa_approver_name,
          status,
          steps_summary,
          critical_quality_points,
          safety_points,
          common_mistakes
        )
        VALUES (
          proj_id,
          'SOP-PKG-024',
          'มาตรฐานการจัดวางพาเลทกล่องบรรจุภัณฑ์ & หยิบพับกล่องสเตชั่น 4 (Standard Cartoning Ergonomics)',
          'SOP',
          pkg_dept_id,
          'Rev.02',
          CURRENT_DATE,
          'คุณสุรชัย (IE Specialist)',
          'คุณพิมพา (QA Manager)',
          'APPROVED',
          '[
            {"step": 1, "action": "ตรวจสอบป้ายล็อตกล่องบรรจุภัณฑ์เทียบกับ Batch Record", "time_sec": 5, "type": "VA"},
            {"step": 2, "action": "จัดวางพาเลทกล่องไว้ฝั่งซ้ายของพนักงานในรัศมีเอื้อมมือ 40 ซม. ระดับความสูงเอว", "time_sec": 2, "type": "NNVA"},
            {"step": 3, "action": "หยิบกล่องด้วยมือซ้าย กางขึ้นรูปและพับก้นกล่องในจังหวะเดียว (Single Motion)", "time_sec": 2.5, "type": "VA"},
            {"step": 4, "action": "สวมขวดเซรั่มพร้อมใบแทรกเข้าสู่กล่องและพับฝาบน", "time_sec": 5, "type": "VA"}
          ]'::jsonb,
          'ตรวจเช็กการพิมพ์ Lot / EXP ที่กล่องทุก 15 นาที, ตรวจสอบรอยยับที่ลิ้นกล่อง',
          'ห้ามเอื้อมยกกล่องเกินระดับหัวไหล่, จัดวางกล่องบนแท่นปรับระดับเพื่อป้องกันการปวดหลัง (Ergonomics)',
          'วางกล่องไกลเกิน 60 ซม. ทำให้ต้องก้มตัว, พับกล่องก่อนบรรจุขวดทิ้งไว้หลายชิ้นทำให้กล่องยุบตัว'
        )
        ON CONFLICT (doc_no) DO NOTHING;

        -- OPL (One Point Lesson)
        INSERT INTO improve_opl (
          opl_no,
          topic,
          why_important,
          wrong_method_description,
          correct_method_description,
          stop_call_wait_rule,
          status
        )
        VALUES (
          'OPL-PKG-001',
          'การจัดวางพาเลทกล่องบรรจุภัณฑ์แบบ Zero-Step (หยิบไม่ก้าวเท้า)',
          'ลดระยะเดินและเวลาสูญเปล่าได้ 2.5 วินาที/ชิ้น ป้องกันความเมื่อยล้าและลดความเสี่ยงกล่องตกพื้นปนเปื้อน',
          '❌ วิธีเดิมที่ผิด: วางพาเลทกล่องห่างจากโต๊ะบรรจุ 6 เมตร พนักงานต้องเดินไปหยิบกล่องครั้งละ 10-20 ชิ้น เสียเวลาเดิน 1,200 เมตรต่อกะ',
          '✅ วิธีที่ถูกต้อง: เลื่อนแท่นวางกล่องติดชิดโต๊ะฝั่งซ้ายมือ สูงระดับเอว หยิบได้ทันทีใน 1 วินาที ไม่ต้องก้าวเท้าแม้แต่ก้าวเดียว',
          'หากพบว่าพาเลทกล่องกีดขวางทางเดินฉุกเฉิน หรือความสูงเกินระดับสายตา ให้ หยุด-แจ้งหัวหน้างาน-รอจัดระเบียบ ทันที',
          'APPROVED'
        )
        ON CONFLICT (opl_no) DO NOTHING;

        -- Training Need
        INSERT INTO improve_training_needs (
          observation_id,
          project_id,
          training_topic,
          target_department,
          trainer_name,
          target_date,
          status
        )
        VALUES (
          obs_id,
          proj_id,
          'อบรมเทคนิคการพับกล่องมือเดียวและการจัด Workstation Ergonomics (OPL-PKG-001)',
          'ฝ่ายบรรจุภัณฑ์ (Packing)',
          'คุณสุรชัย (IE Specialist)',
          CURRENT_DATE + INTERVAL '7 days',
          'IN_PROGRESS'
        )
        ON CONFLICT DO NOTHING;
      END IF;

      -- 7. Skills & Operator Skill Matrix (L0 to L4)
      INSERT INTO improve_skills (skill_code, skill_name, department_id, category, description)
      VALUES 
        ('SKL-PKG-01', 'การขึ้นรูปและพับกล่องบรรจุภัณฑ์ (Cartoning & Folding)', pkg_dept_id, 'OPERATION', 'ทักษะการพับกล่องเดี่ยวรวดเร็ว ถูกต้องตามมาตรฐาน ไม่เกิดรอยยับหรือบุบ'),
        ('SKL-PKG-02', 'การตั้งค่าและตรวจสอบเครื่องยิงล็อต Inkjet', pkg_dept_id, 'TECHNICAL', 'สามารถตั้งรหัส Lot / MFD / EXP บนเครื่อง CIJ และตรวจเช็กความคมชัดได้'),
        ('SKL-PKG-03', 'การควบคุมเครื่องบรรจุกึ่งอัตโนมัติ (Semi-Auto Filling)', pkg_dept_id, 'MACHINE', 'การเดินเครื่อง คาลิเบรตน้ำหนักบรรจุ และการล้างทำความสะอาด Clean-in-Place'),
        ('SKL-PKG-04', 'การตรวจสอบรอยปิดผนึกและชริ้งค์ฟิล์ม POF', pkg_dept_id, 'QUALITY', 'ทักษะการปรับอุณหภูมิอุโมงค์ความร้อน และการตรวจสอบฟองอากาศหรือรอยฉีกขาด'),
        ('SKL-PKG-05', 'การระบุความสูญเปล่า 8 Wastes & ไคเซ็นหน้างาน', pkg_dept_id, 'LEAN_IE', 'ความเข้าใจในความสูญเปล่า 8 ประการ และสามารถเสนอแนะ Kaizen ผ่านระบบได้')
      ON CONFLICT (skill_code) DO NOTHING;

      -- Link Employees to Skills
      INSERT INTO improve_employee_skills (employee_id, employee_name, department_name, skill_id, current_level, required_level, verified_by, verified_at, notes)
      SELECT 
        'EMP-001', 'สมชาย ใจมั่น', 'Packing', id, 'L3', 'L3', 'หัวหน้าแผนกบรรจุ', NOW(), 'ปฏิบัติงานได้ตามมาตรฐาน ชำนาญระดับสอนผู้อื่นได้บางส่วน'
      FROM improve_skills WHERE skill_code = 'SKL-PKG-01'
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_employee_skills (employee_id, employee_name, department_name, skill_id, current_level, required_level, verified_by, verified_at, notes)
      SELECT 
        'EMP-002', 'วรรณา รักดี', 'Packing', id, 'L2', 'L3', 'หัวหน้าแผนกบรรจุ', NOW(), 'ทำงานได้ด้วยตัวเอง แต่ยังติดขัดเรื่องความเร็วเวลาเปลี่ยนกล่องไซส์ใหม่'
      FROM improve_skills WHERE skill_code = 'SKL-PKG-01'
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_employee_skills (employee_id, employee_name, department_name, skill_id, current_level, required_level, verified_by, verified_at, notes)
      SELECT 
        'EMP-003', 'นรินทร์ ชัยชนะ', 'Packing', id, 'L1', 'L3', 'คุณสุรชัย (IE)', NOW(), 'พนักงานใหม่ เพิ่งผ่านการอบรมทฤษฎี ต้องการการประกบหน้างาน (OJT)'
      FROM improve_skills WHERE skill_code = 'SKL-PKG-01'
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_employee_skills (employee_id, employee_name, department_name, skill_id, current_level, required_level, verified_by, verified_at, notes)
      SELECT 
        'EMP-004', 'กัลยาณี สดใส', 'Packing', id, 'L4', 'L3', 'คุณพิมพา (QA)', NOW(), 'ระดับผู้เชี่ยวชาญ (Master Trainer) สามารถสอนและออกข้อสอบวัดผลได้'
      FROM improve_skills WHERE skill_code = 'SKL-PKG-01'
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_employee_skills (employee_id, employee_name, department_name, skill_id, current_level, required_level, verified_by, verified_at, notes)
      SELECT 
        'EMP-001', 'สมชาย ใจมั่น', 'Packing', id, 'L2', 'L3', 'หัวหน้าแผนกบรรจุ', NOW(), 'เปลี่ยนข้อความล็อตได้ แต่ยังแก้ปัญหารหัสจางหรือหัวพิมพ์ตันไม่คล่อง'
      FROM improve_skills WHERE skill_code = 'SKL-PKG-02'
      ON CONFLICT DO NOTHING;

      INSERT INTO improve_employee_skills (employee_id, employee_name, department_name, skill_id, current_level, required_level, verified_by, verified_at, notes)
      SELECT 
        'EMP-004', 'กัลยาณี สดใส', 'Packing', id, 'L3', 'L3', 'หัวหน้าแผนกบรรจุ', NOW(), 'ตั้งค่าเครื่อง inkjet และปรับแต่ง nozzle ได้ตามมาตรฐาน'
      FROM improve_skills WHERE skill_code = 'SKL-PKG-02'
      ON CONFLICT DO NOTHING;

    END $$;
  `);
  console.log('5. Pilot observation, project, standard work, OPL, and skills seeded successfully!');

  await client.end();
  console.log('All improve seed operations completed!');
}

runSeed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
