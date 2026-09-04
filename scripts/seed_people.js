const pg = require('pg');
const xlsx = require('xlsx');

const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL for CosmeFlow People V1 Seeding...');

  try {
    await client.query('BEGIN');

    // 1. COMPANY & SITE
    const companyRes = await client.query(`
      INSERT INTO companies (company_code, company_name, company_name_en, tax_id)
      VALUES ('COSMEDIVA', 'บริษัท คอสเมดิวา จำกัด (มหาชน)', 'Cosmediva Manufacturing Co., Ltd.', '0105560123456')
      ON CONFLICT (company_code) DO UPDATE SET company_name = EXCLUDED.company_name
      RETURNING id;
    `);
    const companyId = companyRes.rows[0].id;

    const siteRes = await client.query(`
      INSERT INTO sites (company_id, site_code, site_name, address, timezone)
      VALUES ($1, 'SITE-MAIN', 'โรงงานคอสเมดิวา สำนักงานใหญ่และฐานการผลิตปทุมธานี', '88/9 นิคมอุตสาหกรรมนวนคร ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี', 'Asia/Bangkok')
      ON CONFLICT (site_code) DO UPDATE SET site_name = EXCLUDED.site_name
      RETURNING id;
    `, [companyId]);
    const siteId = siteRes.rows[0].id;

    // 2. DIVISIONS
    const divisions = [
      { code: 'DIV-OPS', name: 'สายงานผลิตและปฏิบัติการโรงงาน (Operations & Production)' },
      { code: 'DIV-QAQC', name: 'สายงานคุณภาพและพัฒนาสูตร (Quality, R&D & Regulatory)' },
      { code: 'DIV-SCM', name: 'สายงานซัพพลายเชนและคลังสินค้า (Supply Chain & Logistics)' },
      { code: 'DIV-CORP', name: 'สายงานบริหารและสนับสนุนองค์กร (Corporate & Support)' },
    ];
    const divMap = {};
    for (const d of divisions) {
      const r = await client.query(`
        INSERT INTO divisions (site_id, division_code, division_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (division_code) DO UPDATE SET division_name = EXCLUDED.division_name
        RETURNING id;
      `, [siteId, d.code, d.name]);
      divMap[d.code] = r.rows[0].id;
    }

    // 3. DEPARTMENTS
    const depts = [
      { code: 'MGT', name: 'ฝ่ายบริหาร (Management)', div: 'DIV-CORP' },
      { code: 'HR', name: 'ฝ่ายทรัพยากรบุคคล (Human Resources)', div: 'DIV-CORP' },
      { code: 'ACC', name: 'ฝ่ายบัญชีและการเงิน (Accounting & Finance)', div: 'DIV-CORP' },
      { code: 'SM', name: 'ฝ่ายขายและการตลาด (Sales & Marketing)', div: 'DIV-CORP' },
      { code: 'PDD', name: 'ฝ่ายพัฒนาผลิตภัณฑ์ (Product Development)', div: 'DIV-QAQC' },
      { code: 'RD', name: 'ฝ่ายวิจัยและพัฒนาสูตร (R&D)', div: 'DIV-QAQC' },
      { code: 'QA', name: 'ฝ่ายประกันคุณภาพ (Quality Assurance)', div: 'DIV-QAQC' },
      { code: 'QC', name: 'ฝ่ายควบคุมคุณภาพ (Quality Control)', div: 'DIV-QAQC' },
      { code: 'RA', name: 'ฝ่ายขึ้นทะเบียนและเอกสาร (Regulatory Affairs)', div: 'DIV-QAQC' },
      { code: 'PL', name: 'ฝ่ายวางแผนการผลิต (Production Planning)', div: 'DIV-OPS' },
      { code: 'PU', name: 'ฝ่ายจัดซื้อ (Purchasing)', div: 'DIV-SCM' },
      { code: 'PDT', name: 'ฝ่ายผลิต (Production)', div: 'DIV-OPS' },
      { code: 'MIX', name: 'แผนกผสม (Mixing Department)', div: 'DIV-OPS' },
      { code: 'WGH', name: 'แผนกชั่งสาร (Weighing Department)', div: 'DIV-OPS' },
      { code: 'PKG', name: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)', div: 'DIV-OPS' },
      { code: 'MM', name: 'แผนกคลังสินค้าและวัตถุดิบ (Material & Warehouse)', div: 'DIV-SCM' },
      { code: 'MT', name: 'ฝ่ายซ่อมบำรุงวิศวกรรม (Engineering & Maintenance)', div: 'DIV-OPS' },
    ];
    const deptMap = {};
    for (const d of depts) {
      const r = await client.query(`
        INSERT INTO departments (department_code, department_name, is_active, division_id)
        VALUES ($1, $2, TRUE, $3)
        ON CONFLICT (department_code) DO UPDATE SET 
          department_name = EXCLUDED.department_name,
          division_id = EXCLUDED.division_id
        RETURNING id;
      `, [d.code, d.name, divMap[d.div]]);
      deptMap[d.code] = r.rows[0].id;
    }

    // 4. WORK AREAS
    const workAreas = [
      { code: 'WA-MIX', name: 'ห้องผสมครีมและเซรั่ม (Mixing Room)', dept: 'MIX', type: 'PRODUCTION', skill: 'Bulk Mixing & Heating' },
      { code: 'WA-WGH', name: 'ห้องชั่งสารสะอาด (Clean Weighing Room)', dept: 'WGH', type: 'PRODUCTION', skill: 'Precision Weighing' },
      { code: 'WA-FILL', name: 'ห้องบรรจุอัตโนมัติ (Filling Line A)', dept: 'PKG', type: 'PRODUCTION', skill: 'Filling Calibration' },
      { code: 'WA-PACK', name: 'สายงานลงกล่อง & ซีลฟิล์ม (Packing Line 1-2)', dept: 'PKG', type: 'PRODUCTION', skill: 'Cartoning & POF' },
      { code: 'WA-QC', name: 'ห้องแล็บควบคุมคุณภาพ (QC Analytical Lab)', dept: 'QC', type: 'QC_LAB', skill: 'Viscosity, pH, Micro Test' },
      { code: 'WA-QA', name: 'ห้องตรวจสอบเอกสารปล่อยผ่าน (QA Release Room)', dept: 'QA', type: 'QC_LAB', skill: 'Batch Record Review' },
      { code: 'WA-WHRM', name: 'คลังวัตถุดิบเคมีภัณฑ์ (Warehouse RM)', dept: 'MM', type: 'WAREHOUSE', skill: 'Forklift & Storage Matrix' },
      { code: 'WA-WHPM', name: 'คลังบรรจุภัณฑ์และกล่อง (Warehouse PM)', dept: 'MM', type: 'WAREHOUSE', skill: 'Packaging Inspection' },
      { code: 'WA-WHFG', name: 'คลังสินค้าสำเร็จรูป (Warehouse FG)', dept: 'MM', type: 'WAREHOUSE', skill: 'Dispatch & Lot Audit' },
      { code: 'WA-MT', name: 'ห้องปฏิบัติการซ่อมบำรุง (Maintenance Shop)', dept: 'MT', type: 'MAINTENANCE', skill: 'Pneumatic & Electrical' },
      { code: 'WA-OFFICE', name: 'สำนักงานกลางบริหารงาน (Central Office)', dept: 'MGT', type: 'OFFICE', skill: 'ERP & Administration' },
    ];
    const areaMap = {};
    for (const w of workAreas) {
      const r = await client.query(`
        INSERT INTO work_areas (department_id, work_area_code, work_area_name, area_type, critical_skill_needed)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (work_area_code) DO UPDATE SET
          work_area_name = EXCLUDED.work_area_name,
          critical_skill_needed = EXCLUDED.critical_skill_needed
        RETURNING id;
      `, [deptMap[w.dept] || deptMap['PDT'], w.code, w.name, w.type, w.skill]);
      areaMap[w.code] = r.rows[0].id;
    }

    // 5. POSITIONS
    const positions = [
      { code: 'POS-MD', name: 'กรรมการผู้จัดการ (Managing Director)', dept: 'MGT', level: 'EXECUTIVE' },
      { code: 'POS-OPDIR', name: 'ผู้อำนวยการฝ่ายปฏิบัติการ (Operations Director)', dept: 'PDT', level: 'EXECUTIVE' },
      { code: 'POS-HRM', name: 'ผู้จัดการฝ่ายทรัพยากรบุคคล (HR Manager)', dept: 'HR', level: 'MANAGER' },
      { code: 'POS-HRO', name: 'เจ้าหน้าที่บริหารงานบุคคล (HR Officer)', dept: 'HR', level: 'STAFF' },
      { code: 'POS-QAM', name: 'ผู้จัดการฝ่ายประกันคุณภาพ (QA Manager)', dept: 'QA', level: 'MANAGER' },
      { code: 'POS-QCS', name: 'หัวหน้างานตรวจคุณภาพ (QC Supervisor)', dept: 'QC', level: 'SUPERVISOR' },
      { code: 'POS-QCO', name: 'เจ้าหน้าที่ตรวจสอบคุณภาพ (QC Officer)', dept: 'QC', level: 'STAFF' },
      { code: 'POS-PDS', name: 'หัวหน้างานสายการผลิต (Production Supervisor)', dept: 'PDT', level: 'SUPERVISOR' },
      { code: 'POS-OP-MX', name: 'ช่างควบคุมเครื่องผสม (Mixing Operator)', dept: 'MIX', level: 'OPERATOR' },
      { code: 'POS-OP-PK', name: 'พนักงานบรรจุและแพ็กเกจ (Packing Operator)', dept: 'PKG', level: 'OPERATOR' },
      { code: 'POS-WHS', name: 'หัวหน้างานคลังสินค้า (Warehouse Supervisor)', dept: 'MM', level: 'SUPERVISOR' },
      { code: 'POS-WHO', name: 'เจ้าหน้าที่คลังสินค้า (Warehouse Officer)', dept: 'MM', level: 'STAFF' },
      { code: 'POS-PLN', name: 'เจ้าหน้าที่วางแผนการผลิต (Planning Specialist)', dept: 'PL', level: 'STAFF' },
      { code: 'POS-MTE', name: 'วิศวกรซ่อมบำรุง (Maintenance Engineer)', dept: 'MT', level: 'STAFF' },
    ];
    const posMap = {};
    for (const p of positions) {
      const r = await client.query(`
        INSERT INTO positions (department_id, position_code, position_name, job_level)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (position_code) DO UPDATE SET position_name = EXCLUDED.position_name
        RETURNING id;
      `, [deptMap[p.dept], p.code, p.name, p.level]);
      posMap[p.code] = r.rows[0].id;
    }

    // 6. WORK SCHEDULES & SHIFTS
    const schRes = await client.query(`
      INSERT INTO work_schedules (schedule_code, schedule_name, work_days_per_week, default_start_time, default_end_time, break_minutes, grace_period_minutes)
      VALUES 
        ('SCH-FACT-6D', 'ตารางงานสายผลิต (จันทร์ - เสาร์ 08:00 - 17:00)', 6, '08:00:00', '17:00:00', 60, 15),
        ('SCH-OFF-5D', 'ตารางงานสำนักงาน (จันทร์ - ศุกร์ 08:30 - 17:30)', 5, '08:30:00', '17:30:00', 60, 15)
      ON CONFLICT (schedule_code) DO UPDATE SET schedule_name = EXCLUDED.schedule_name
      RETURNING id, schedule_code;
    `);
    const defaultScheduleId = schRes.rows[0].id;

    const shiftRes = await client.query(`
      INSERT INTO shifts (shift_code, shift_name, start_time, end_time, crosses_midnight, color_code)
      VALUES 
        ('SHIFT-MORN', 'กะเช้าโรงงาน (Day Shift 08:00 - 17:00)', '08:00:00', '17:00:00', FALSE, '#10B981'),
        ('SHIFT-NIGHT', 'กะดึกโรงงาน (Night Shift 20:00 - 05:00)', '20:00:00', '05:00:00', TRUE, '#8B5CF6')
      ON CONFLICT (shift_code) DO UPDATE SET shift_name = EXCLUDED.shift_name
      RETURNING id, shift_code;
    `);
    const defaultShiftId = shiftRes.rows[0].id;

    // 7. HOLIDAYS 2026
    const calRes = await client.query(`
      INSERT INTO holiday_calendars (calendar_code, calendar_name, year)
      VALUES ('CAL-2026', 'ปฏิทินวันหยุดโรงงาน คอสเมดิวา ประจำปี 2569 / 2026', 2026)
      ON CONFLICT (calendar_code) DO UPDATE SET calendar_name = EXCLUDED.calendar_name
      RETURNING id;
    `);
    const calId = calRes.rows[0].id;

    const holidays = [
      { name: 'วันขึ้นปีใหม่ (New Year)', date: '2026-01-01' },
      { name: 'วันมาฆบูชา (Makha Bucha)', date: '2026-03-03' },
      { name: 'วันจักรี (Chakri Day)', date: '2026-04-06' },
      { name: 'วันสงกรานต์ (Songkran Day 1)', date: '2026-04-13' },
      { name: 'วันสงกรานต์ (Songkran Day 2)', date: '2026-04-14' },
      { name: 'วันสงกรานต์ (Songkran Day 3)', date: '2026-04-15' },
      { name: 'วันแรงงานแห่งชาติ (National Labor Day)', date: '2026-05-01' },
      { name: 'วันวิสาขบูชา (Visakha Bucha)', date: '2026-05-31' },
      { name: 'วันอาสาฬหบูชา (Asahna Bucha)', date: '2026-07-29' },
      { name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', date: '2026-07-28' },
      { name: 'วันแม่แห่งชาติ (Mother Day)', date: '2026-08-12' },
      { name: 'วันคล้ายวันสวรรคต ร.9', date: '2026-10-13' },
      { name: 'วันปิยมหาราช (Chulalongkorn Day)', date: '2026-10-23' },
      { name: 'วันพ่อแห่งชาติ (Father Day)', date: '2026-12-05' },
      { name: 'วันรัฐธรรมนูญ (Constitution Day)', date: '2026-12-10' },
      { name: 'วันสิ้นปี (New Year Eve)', date: '2026-12-31' },
    ];
    for (const h of holidays) {
      await client.query(`
        INSERT INTO holidays (calendar_id, holiday_name, holiday_date, is_paid)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (calendar_id, holiday_date) DO UPDATE SET holiday_name = EXCLUDED.holiday_name;
      `, [calId, h.name, h.date]);
    }

    // 8. LEAVE TYPES & POLICIES (12 types required by Section 11 & 12)
    const leaveTypesData = [
      { code: 'ANNUAL', th: 'ลาพักร้อน (Annual Leave)', en: 'Annual Leave', my: 'နှစ်ပတ်လည်ခွင့်', color: '#10B981', ent: 6, notice: 3, carry: true, maxCarry: 3 },
      { code: 'SICK', th: 'ลาป่วย (Sick Leave)', en: 'Sick Leave', my: 'နေမကောင်းခွင့်', color: '#EF4444', ent: 30, notice: 0, carry: false, maxCarry: 0 },
      { code: 'PERSONAL', th: 'ลากิจธุระ (Personal Leave)', en: 'Personal Leave', my: 'ကိုယ်ရေးကိုယ်တာခွင့်', color: '#F59E0B', ent: 3, notice: 2, carry: false, maxCarry: 0 },
      { code: 'MATERNITY', th: 'ลาคลอดบุตร (Maternity Leave)', en: 'Maternity Leave', my: 'မီးဖွားခွင့်', color: '#EC4899', ent: 98, notice: 15, carry: false, maxCarry: 0 },
      { code: 'PATERNITY', th: 'ลาดูแลภรรยาคลอด (Paternity Leave)', en: 'Paternity Leave', my: 'ဖခင်ခွင့်', color: '#6366F1', ent: 5, notice: 7, carry: false, maxCarry: 0 },
      { code: 'ORDINATION', th: 'ลาอุปสมบท (Ordination Leave)', en: 'Ordination Leave', my: 'ဘုန်းကြီးဝတ်ခွင့်', color: '#D97706', ent: 15, notice: 30, carry: false, maxCarry: 0 },
      { code: 'MILITARY', th: 'ลารับราชการทหาร (Military Leave)', en: 'Military Leave', my: 'စစ်မှုထမ်းခွင့်', color: '#4B5563', ent: 60, notice: 15, carry: false, maxCarry: 0 },
      { code: 'STERILIZATION', th: 'ลาทำหมัน (Sterilization Leave)', en: 'Sterilization Leave', my: 'သားကြောဖြတ်ခွင့်', color: '#14B8A6', ent: 3, notice: 7, carry: false, maxCarry: 0 },
      { code: 'TRAINING', th: 'ลาฝึกอบรมและสัมมนา (Training Leave)', en: 'Training Leave', my: 'သင်တန်းတက်ခွင့်', color: '#8B5CF6', ent: 7, notice: 7, carry: false, maxCarry: 0 },
      { code: 'UNPAID', th: 'ลาไม่รับค่าจ้าง (Leave Without Pay)', en: 'Leave Without Pay', my: 'လစာမရသောခွင့်', color: '#6B7280', ent: 15, notice: 7, carry: false, maxCarry: 0 },
      { code: 'EMERGENCY', th: 'ลากรณีฉุกเฉิน (Emergency Leave)', en: 'Emergency Leave', my: 'အရေးပေါ်ခွင့်', color: '#DC2626', ent: 2, notice: 0, carry: false, maxCarry: 0 },
      { code: 'OTHER', th: 'ลาอื่นๆ (Other Leave)', en: 'Other Leave', my: 'အခြားခွင့်', color: '#9CA3AF', ent: 3, notice: 1, carry: false, maxCarry: 0 },
    ];
    const leaveTypeMap = {};
    for (const lt of leaveTypesData) {
      const r = await client.query(`
        INSERT INTO leave_types (type_code, name_th, name_en, name_my, color_code, is_paid)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (type_code) DO UPDATE SET 
          name_th = EXCLUDED.name_th,
          name_en = EXCLUDED.name_en,
          color_code = EXCLUDED.color_code
        RETURNING id;
      `, [lt.code, lt.th, lt.en, lt.my, lt.color, lt.code !== 'UNPAID']);
      leaveTypeMap[lt.code] = r.rows[0].id;

      // Add corresponding configurable leave policy
      await client.query(`
        INSERT INTO leave_policies (
          leave_type_id, policy_name, employee_type, annual_entitlement,
          carry_forward_allowed, max_carry_forward, minimum_notice_days,
          attachment_required, attachment_required_after_days, paid_unpaid
        ) VALUES ($1, $2, 'ALL', $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING;
      `, [
        r.rows[0].id,
        `นโยบาย${lt.th} มาตรฐานโรงงาน`,
        lt.ent,
        lt.carry,
        lt.maxCarry,
        lt.notice,
        lt.code === 'SICK', // attachment for sick leave > 2 days
        2,
        lt.code === 'UNPAID' ? 'UNPAID' : 'PAID'
      ]);
    }

    // 9. APPROVAL WORKFLOWS MASTER
    const wfRes = await client.query(`
      INSERT INTO approval_workflows (workflow_code, workflow_name, description)
      VALUES 
        ('STANDARD_LEAVE', 'สายอนุมัติการลาปกติ (Supervisor -> Manager)', 'คำขอลาทั่วไป ไม่เกิน 2 วัน หัวหน้างานอนุมัติ หากเกิน 2 วัน ผู้จัดการอนุมัติ'),
        ('EXTENDED_LEAVE', 'สายอนุมัติการลายาว / ลาไม่รับค่าจ้าง (Supervisor -> Manager -> HR)', 'คำขอลาเกิน 3 วัน หรือลากิจพิเศษ ต้องผ่าน HR Manager'),
        ('ATTENDANCE_CORRECTION', 'สายอนุมัติแก้ไขเวลาลงเวลา (Supervisor -> HR)', 'คำขอลืมสแกนนิ้ว / เครื่องขัดข้อง')
      ON CONFLICT (workflow_code) DO UPDATE SET workflow_name = EXCLUDED.workflow_name
      RETURNING id, workflow_code;
    `);
    const standardWfId = wfRes.rows[0].id;

    // 10. LOAD EMPLOYEES FROM EXCEL + KEY PERSONAS
    console.log('Reading real factory employees from Excel...');
    const wb = xlsx.readFile('c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/รหัสพนักงาน ชื่อ-สกุล แผนก.xlsx');
    const rawRows = xlsx.utils.sheet_to_json(wb.Sheets['Sheet1']);
    console.log(`Found ${rawRows.length} employees in Excel.`);

    // First, let's create our Core Demo Personas with defined roles:
    const corePersonas = [
      {
        code: 'EMP-ADM001',
        prefix: 'นาย',
        firstName: 'สิทธิชัย',
        lastName: 'ผู้ดูแลระบบ',
        nickname: 'แอดมิน',
        dept: 'MGT',
        role: 'Admin',
        pos: 'POS-MD',
        email: 'admin@cosmediva.com',
        area: 'WA-OFFICE',
        jobLevel: 'EXECUTIVE',
        empType: 'Monthly'
      },
      {
        code: 'EXEC-001',
        prefix: 'ดร.',
        firstName: 'เอกชัย',
        lastName: 'เกียรติบำรุงกิจ',
        nickname: 'ดร.เอก',
        dept: 'MGT',
        role: 'Executive',
        pos: 'POS-MD',
        email: 'executive@cosmediva.com',
        area: 'WA-OFFICE',
        jobLevel: 'EXECUTIVE',
        empType: 'Monthly'
      },
      {
        code: 'HR-MGR001',
        prefix: 'นาง',
        firstName: 'กุลธิดา',
        lastName: 'บริหารบุคคล',
        nickname: 'กุล',
        dept: 'HR',
        role: 'HR Manager',
        pos: 'POS-HRM',
        email: 'hr_mgr@cosmediva.com',
        area: 'WA-OFFICE',
        jobLevel: 'MANAGER',
        empType: 'Monthly'
      },
      {
        code: 'HR-OFF001',
        prefix: 'นาย',
        firstName: 'กิตติชัย',
        lastName: 'ตรวจเวลา',
        nickname: 'บอย',
        dept: 'HR',
        role: 'HR Officer',
        pos: 'POS-HRO',
        email: 'hr_officer@cosmediva.com',
        area: 'WA-OFFICE',
        jobLevel: 'STAFF',
        empType: 'Monthly'
      },
      {
        code: 'PDT-MGR001',
        prefix: 'นาย',
        firstName: 'สมบูรณ์',
        lastName: 'คุมฝ่ายผลิต',
        nickname: 'บูรณ์',
        dept: 'PDT',
        role: 'Manager',
        pos: 'POS-OPDIR',
        email: 'mgr_prod@cosmediva.local',
        area: 'WA-OFFICE',
        jobLevel: 'MANAGER',
        empType: 'Monthly'
      }
    ];

    const insertedEmployees = [];

    // Insert core leadership personas
    for (const p of corePersonas) {
      const res = await client.query(`
        INSERT INTO employees (
          employee_code, prefix, first_name, last_name, nickname,
          department_id, position_id, work_area_id, default_schedule_id, default_shift_id,
          system_role, job_level, employment_type, employment_status, email,
          hire_date, work_location
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, 'Permanent', $14,
          '2022-01-15', 'Cosmediva Factory Navanakorn'
        )
        ON CONFLICT (employee_code) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          system_role = EXCLUDED.system_role,
          job_level = EXCLUDED.job_level
        RETURNING id, employee_code, system_role;
      `, [
        p.code, p.prefix, p.firstName, p.lastName, p.nickname,
        deptMap[p.dept], posMap[p.pos], areaMap[p.area], defaultScheduleId, defaultShiftId,
        p.role, p.jobLevel, p.empType, p.email
      ]);
      insertedEmployees.push(res.rows[0]);
    }

    const hrMgrId = insertedEmployees.find(e => e.employee_code === 'HR-MGR001')?.id;
    const prodMgrId = insertedEmployees.find(e => e.employee_code === 'PDT-MGR001')?.id;

    // Helper to determine department from code prefix
    const getDeptCode = (empCode) => {
      const prefix = empCode.split('-')[0].toUpperCase();
      if (prefix === 'PDT') return 'PDT';
      if (prefix === 'MM') return 'MM';
      if (prefix === 'PL') return 'PL';
      if (prefix === 'QC') return 'QC';
      if (prefix === 'QA') return 'QA';
      if (prefix === 'PK') return 'PKG';
      if (prefix === 'RD') return 'RD';
      if (prefix === 'ACC') return 'ACC';
      if (prefix === 'PDD') return 'PDD';
      if (prefix === 'SM') return 'SM';
      if (prefix === 'MT') return 'MT';
      if (prefix === 'PU' || prefix === 'PUN') return 'PU';
      if (prefix === 'HR') return 'HR';
      return 'PDT';
    };

    const getWorkAreaCode = (deptCode) => {
      if (deptCode === 'MIX') return 'WA-MIX';
      if (deptCode === 'WGH') return 'WA-WGH';
      if (deptCode === 'PKG') return 'WA-PACK';
      if (deptCode === 'QC') return 'WA-QC';
      if (deptCode === 'QA') return 'WA-QA';
      if (deptCode === 'MM') return 'WA-WHRM';
      if (deptCode === 'MT') return 'WA-MT';
      if (deptCode === 'PDT') return 'WA-FILL';
      return 'WA-OFFICE';
    };

    // Insert the 129 employees from Excel
    let supervisorId = null;
    let count = 0;

    for (const row of rawRows) {
      const code = String(row['รหัส'] || '').trim();
      const rawName = String(row['ชื่อพนักงาน'] || '').trim();
      if (!code || !rawName) continue;

      // Split prefix and names
      let prefix = 'นาย';
      let cleanName = rawName;
      if (rawName.startsWith('น.ส.')) {
        prefix = 'น.ส.';
        cleanName = rawName.replace('น.ส.', '').trim();
      } else if (rawName.startsWith('นาง')) {
        prefix = 'นาง';
        cleanName = rawName.replace('นาง', '').trim();
      } else if (rawName.startsWith('นาย')) {
        prefix = 'นาย';
        cleanName = rawName.replace('นาย', '').trim();
      } else if (rawName.startsWith('ดร.ภญ.')) {
        prefix = 'ดร.ภญ.';
        cleanName = rawName.replace('ดร.ภญ.', '').trim();
      }

      const parts = cleanName.split(/\s+/);
      const firstName = parts[0] || cleanName;
      const lastName = parts.slice(1).join(' ') || '-';

      const deptCode = getDeptCode(code);
      const deptId = deptMap[deptCode] || deptMap['PDT'];
      const areaCode = getWorkAreaCode(deptCode);
      const areaId = areaMap[areaCode] || areaMap['WA-FILL'];

      // Assign Supervisor role to PDT-CPS001 (ชมพูนุช) and QC-TTM181 (ฐิติกาญจน์)
      let sysRole = 'Employee';
      let jobLevel = 'OPERATOR';
      let empType = 'Monthly';

      if (code === 'PDT-CPS001') {
        sysRole = 'Supervisor';
        jobLevel = 'SUPERVISOR';
      } else if (code === 'QC-TTM181') {
        sysRole = 'Supervisor';
        jobLevel = 'SUPERVISOR';
      } else if (code.startsWith('PK-')) {
        empType = count % 4 === 0 ? 'Daily' : 'Monthly';
      }

      const email = `${code.toLowerCase().replace(/[^a-z0-9]/g, '')}@cosmediva.local`;

      const empRes = await client.query(`
        INSERT INTO employees (
          employee_code, prefix, first_name, last_name,
          department_id, work_area_id, default_schedule_id, default_shift_id,
          system_role, job_level, employment_type, employment_status, email,
          supervisor_id, manager_id, hire_date, work_location
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, 'Permanent', $12,
          $13, $14, '2023-05-01', 'Cosmediva Factory'
        )
        ON CONFLICT (employee_code) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          department_id = EXCLUDED.department_id,
          work_area_id = EXCLUDED.work_area_id,
          system_role = EXCLUDED.system_role,
          employment_type = EXCLUDED.employment_type
        RETURNING id, employee_code, system_role, department_id, first_name, last_name;
      `, [
        code, prefix, firstName, lastName,
        deptId, areaId, defaultScheduleId, defaultShiftId,
        sysRole, jobLevel, empType, email,
        supervisorId, prodMgrId
      ]);

      const inserted = empRes.rows[0];
      insertedEmployees.push(inserted);

      if (code === 'PDT-CPS001') {
        supervisorId = inserted.id; // Next employees report to Dr. Chompoonuch
      }
      count++;
    }

    console.log(`Total active employees in system: ${insertedEmployees.length}`);

    // Set supervisors for team reporting hierarchy
    if (supervisorId) {
      await client.query(`
        UPDATE employees 
        SET supervisor_id = $1, manager_id = $2
        WHERE department_id IN ($3, $4) AND id != $1 AND id != $2;
      `, [supervisorId, prodMgrId, deptMap['PDT'], deptMap['PKG']]);
    }

    // 11. LEAVE BALANCES FOR 2026
    console.log('Generating 2026 leave balances and ledger for all employees...');
    const annualId = leaveTypeMap['ANNUAL'];
    const sickId = leaveTypeMap['SICK'];
    const personalId = leaveTypeMap['PERSONAL'];

    for (const emp of insertedEmployees) {
      // Annual Leave balance
      await client.query(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled, carry_forward, taken, pending, available)
        VALUES ($1, $2, 2026, 6, 2, 1, 0, 7)
        ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET
          entitled = EXCLUDED.entitled,
          available = EXCLUDED.available;
      `, [emp.id, annualId]);

      // Sick Leave balance
      await client.query(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled, carry_forward, taken, pending, available)
        VALUES ($1, $2, 2026, 30, 0, 2, 0, 28)
        ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET
          entitled = EXCLUDED.entitled,
          available = EXCLUDED.available;
      `, [emp.id, sickId]);

      // Personal Leave balance
      await client.query(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled, carry_forward, taken, pending, available)
        VALUES ($1, $2, 2026, 3, 0, 0, 0, 3)
        ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET
          entitled = EXCLUDED.entitled,
          available = EXCLUDED.available;
      `, [emp.id, personalId]);

      // Add Opening Allocation Transaction in Ledger
      await client.query(`
        INSERT INTO leave_transactions (employee_id, leave_type_id, transaction_type, amount, balance_before, balance_after, reason)
        VALUES ($1, $2, 'ALLOCATION', 6, 0, 6, 'สิทธิ์วันลาพักร้อนประจำปี 2569');
      `, [emp.id, annualId]);
    }

    // 12. SEED LEAVE SCENARIOS & PENDING APPROVALS
    console.log('Seeding leave requests and approval workflows...');
    const packingEmp = insertedEmployees.find(e => e.employee_code === 'PK-BJP518') || insertedEmployees[10];
    const qcEmp = insertedEmployees.find(e => e.employee_code === 'QC-TTM181') || insertedEmployees[5];
    const mmEmp = insertedEmployees.find(e => e.employee_code === 'MM-SNK027') || insertedEmployees[2];

    // Scenario 1: Pending Supervisor Approval (Somchai/Benjaporn wants 1-day Annual Leave on 2026-09-08)
    const req1 = await client.query(`
      INSERT INTO leave_requests (
        request_number, employee_id, leave_type_id, duration_type,
        start_date, end_date, total_days, reason, is_emergency, status,
        current_step, current_workflow_id
      ) VALUES (
        'LR-20260905-001', $1, $2, 'FULL_DAY',
        '2026-09-08', '2026-09-08', 1.0, 'ไปทำธุระส่วนตัวที่ภูมิลำเนา ติดต่อราชการที่อำเภอ', FALSE, 'PENDING_SUPERVISOR',
        1, $3
      )
      ON CONFLICT (request_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id;
    `, [packingEmp.id, annualId, standardWfId]);

    // Update pending balance
    await client.query(`
      UPDATE leave_balances SET pending = pending + 1, available = available - 1
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = 2026;
    `, [packingEmp.id, annualId]);

    // Approval Request for Supervisor (Dr. Chompoonuch / PDT-CPS001)
    await client.query(`
      INSERT INTO approval_requests (request_type, reference_id, step_number, assigned_approver_id, assigned_role, status)
      VALUES ('LEAVE', $1, 1, $2, 'SUPERVISOR', 'PENDING');
    `, [req1.rows[0].id, supervisorId]);

    // Approval Log
    await client.query(`
      INSERT INTO approval_logs (request_type, reference_id, step_number, actor_id, action, previous_status, new_status, comment)
      VALUES ('LEAVE', $1, 1, $2, 'SUBMITTED', 'DRAFT', 'PENDING_SUPERVISOR', 'ยื่นคำขอลาพักร้อนผ่านระบบ CosmeFlow Mobile');
    `, [req1.rows[0].id, packingEmp.id]);

    // Scenario 2: Pending Manager Approval (QC officer requests 3 days Annual Leave 2026-09-10 to 2026-09-12)
    const req2 = await client.query(`
      INSERT INTO leave_requests (
        request_number, employee_id, leave_type_id, duration_type,
        start_date, end_date, total_days, reason, is_emergency, status,
        current_step, current_workflow_id
      ) VALUES (
        'LR-20260905-002', $1, $2, 'FULL_DAY',
        '2026-09-10', '2026-09-12', 3.0, 'ลาพักผ่อนประจำปีต่างจังหวัดพร้อมครอบครัว', FALSE, 'PENDING_MANAGER',
        2, $3
      )
      ON CONFLICT (request_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id;
    `, [qcEmp.id, annualId, standardWfId]);

    await client.query(`
      INSERT INTO approval_requests (request_type, reference_id, step_number, assigned_approver_id, assigned_role, status)
      VALUES ('LEAVE', $1, 2, $2, 'MANAGER', 'PENDING');
    `, [req2.rows[0].id, prodMgrId]);

    await client.query(`
      INSERT INTO approval_logs (request_type, reference_id, step_number, actor_id, action, previous_status, new_status, comment)
      VALUES 
        ('LEAVE', $1, 1, $2, 'SUBMITTED', 'DRAFT', 'PENDING_SUPERVISOR', 'ยื่นคำขอลา'),
        ('LEAVE', $1, 1, $3, 'APPROVED', 'PENDING_SUPERVISOR', 'PENDING_MANAGER', 'หัวหน้างานอนุมัติแล้ว ส่งต่อให้ฝ่ายบริหาร');
    `, [req2.rows[0].id, qcEmp.id, supervisorId]);

    // Scenario 3: Already Approved Leave for Today (2026-09-05) - 4 employees on leave
    const leaveEmpSubset = insertedEmployees.slice(20, 24);
    for (let i = 0; i < leaveEmpSubset.length; i++) {
      const e = leaveEmpSubset[i];
      const appRes = await client.query(`
        INSERT INTO leave_requests (
          request_number, employee_id, leave_type_id, duration_type,
          start_date, end_date, total_days, reason, status, approved_at, approved_by
        ) VALUES (
          $1, $2, $3, 'FULL_DAY',
          '2026-09-05', '2026-09-05', 1.0, 'ลาพักผ่อนตามแผนประจำสัปดาห์', 'APPROVED', NOW() - INTERVAL '1 day', $4
        )
        ON CONFLICT (request_number) DO UPDATE SET status = EXCLUDED.status
        RETURNING id;
      `, [`LR-20260905-APP0${i+1}`, e.id, annualId, supervisorId]);

      // Ledger entry
      await client.query(`
        INSERT INTO leave_transactions (employee_id, leave_type_id, transaction_type, amount, balance_before, balance_after, reference_id, reason)
        VALUES ($1, $2, 'USAGE', -1.0, 7.0, 6.0, $3, 'ใช้วันลาพักร้อนประจำวันที่ 05/09/2026');
      `, [e.id, annualId, appRes.rows[0].id]);
    }

    // 13. SEED TODAY'S TIME & ATTENDANCE SCENARIO (Section 61)
    console.log('Seeding today attendance data (Present, Late, Absent, Missing Punch)...');
    const today = '2026-09-05';

    // Batch record
    const batchRes = await client.query(`
      INSERT INTO attendance_import_batches (batch_number, source_type, total_records, success_records, file_name)
      VALUES ('BATCH-20260905-01', 'HIP_DEVICE', 130, 130, 'PUNCH_LOG_NAVAKORN_20260905.dat')
      ON CONFLICT (batch_number) DO UPDATE SET total_records = EXCLUDED.total_records
      RETURNING id;
    `);
    const batchId = batchRes.rows[0].id;

    // We will simulate attendance across all inserted employees:
    // 4 are on Leave (leaveEmpSubset)
    // 2 are Absent without leave
    // 4 are Late (e.g. 15m - 40m)
    // 6 have Missing Punch (e.g. In but no Out, or Out without In)
    // The rest are Present on time!

    const leaveIds = new Set(leaveEmpSubset.map(e => e.id));
    const absentSubset = insertedEmployees.slice(25, 27);
    const absentIds = new Set(absentSubset.map(e => e.id));
    const lateSubset = insertedEmployees.slice(28, 32);
    const lateIds = new Set(lateSubset.map(e => e.id));
    const missingSubset = insertedEmployees.slice(33, 39);
    const missingIds = new Set(missingSubset.map(e => e.id));

    for (let idx = 0; idx < insertedEmployees.length; idx++) {
      const emp = insertedEmployees[idx];
      let status = 'Present';
      let actIn = null;
      let actOut = null;
      let lateMin = 0;
      let workedMin = 480;
      let hasExc = false;
      let excTypes = [];

      if (leaveIds.has(emp.id)) {
        status = 'Leave';
        workedMin = 0;
      } else if (absentIds.has(emp.id)) {
        status = 'Absent';
        hasExc = true;
        excTypes = ['ABSENT'];
        workedMin = 0;
      } else if (lateIds.has(emp.id)) {
        status = 'Late';
        lateMin = 15 + (idx % 4) * 10; // 15, 25, 35, 45 mins late
        hasExc = true;
        excTypes = ['LATE'];
        actIn = `${today}T08:${String(lateMin).padStart(2, '0')}:00+07:00`;
        actOut = `${today}T17:05:00+07:00`;
        workedMin = 480 - lateMin;
      } else if (missingIds.has(emp.id)) {
        status = idx % 2 === 0 ? 'Missing Clock Out' : 'Missing Clock In';
        hasExc = true;
        excTypes = [idx % 2 === 0 ? 'MISSING_CLOCK_OUT' : 'MISSING_CLOCK_IN'];
        if (idx % 2 === 0) {
          actIn = `${today}T07:50:00+07:00`;
          actOut = null; // forgot to punch out
          workedMin = 240;
        } else {
          actIn = null; // forgot to punch in
          actOut = `${today}T17:02:00+07:00`;
          workedMin = 240;
        }
      } else {
        // Normal Present
        status = 'Present';
        actIn = `${today}T07:45:00+07:00`;
        actOut = `${today}T17:08:00+07:00`;
        workedMin = 480;
      }

      // Insert Raw punch logs for realistic audit trail
      if (actIn) {
        await client.query(`
          INSERT INTO attendance_raw_logs (batch_id, employee_code, employee_id, punch_datetime, punch_type, source, device_id)
          VALUES ($1, $2, $3, $4, 'IN', 'DEVICE', 'TERMINAL-NAV-01');
        `, [batchId, emp.employee_code, emp.id, actIn]);
      }
      if (actOut) {
        await client.query(`
          INSERT INTO attendance_raw_logs (batch_id, employee_code, employee_id, punch_datetime, punch_type, source, device_id)
          VALUES ($1, $2, $3, $4, 'OUT', 'DEVICE', 'TERMINAL-NAV-02');
        `, [batchId, emp.employee_code, emp.id, actOut]);
      }

      // Insert Daily Attendance Record
      const dailyRes = await client.query(`
        INSERT INTO attendance_daily (
          employee_id, employee_code, work_date, schedule_id, shift_id,
          planned_start, planned_end, actual_in, actual_out,
          late_minutes, worked_minutes, normal_hours,
          attendance_status, has_exception, exception_types, exception_resolved
        ) VALUES (
          $1, $2, $3, $4, $5,
          '08:00:00', '17:00:00', $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14
        )
        ON CONFLICT (employee_id, work_date) DO UPDATE SET
          actual_in = EXCLUDED.actual_in,
          actual_out = EXCLUDED.actual_out,
          attendance_status = EXCLUDED.attendance_status,
          has_exception = EXCLUDED.has_exception,
          exception_types = EXCLUDED.exception_types
        RETURNING id;
      `, [
        emp.id, emp.employee_code, today, defaultScheduleId, defaultShiftId,
        actIn, actOut,
        lateMin, workedMin, (workedMin / 60).toFixed(2),
        status, hasExc, excTypes, !hasExc
      ]);

      // If there are exceptions, create exception records for HR Exception Center
      if (hasExc) {
        for (const exType of excTypes) {
          const severity = exType === 'ABSENT' ? 'HIGH' : 'MEDIUM';
          let description = 'ความผิดปกติของการลงเวลา';
          if (exType === 'LATE') description = `พนักงานเข้าสาย ${lateMin} นาที เกินช่วง Grace Period (15 นาที)`;
          else if (exType === 'ABSENT') description = 'ขาดงานโดยไม่มีการยื่นใบลาล่วงหน้า (Unapproved Absence)';
          else if (exType === 'MISSING_CLOCK_OUT') description = 'ไม่พบบันทึกเวลาเลิกงาน (Missing Out Punch)';
          else if (exType === 'MISSING_CLOCK_IN') description = 'ไม่พบบันทึกเวลาเข้างาน (Missing In Punch)';

          await client.query(`
            INSERT INTO attendance_exceptions (
              attendance_daily_id, employee_id, work_date, exception_type, severity, description, is_resolved
            ) VALUES ($1, $2, $3, $4, $5, $6, FALSE);
          `, [dailyRes.rows[0].id, emp.id, today, exType, severity, description]);
        }
      }
    }

    // 14. SEED SAMPLE ATTENDANCE CORRECTION REQUEST
    console.log('Seeding attendance correction request...');
    const correctionEmp = missingSubset[0];
    await client.query(`
      INSERT INTO attendance_adjustments (
        employee_id, work_date, adjustment_type, requested_in, requested_out, reason, status
      ) VALUES (
        $1, $2, 'FORGOT_CLOCK',
        $3, $4, 'ลืมสแกนลายนิ้วมือตอนเลิกงาน เนื่องจากรีบไปเคลียร์หน้างานสายบรรจุ', 'PENDING_APPROVAL'
      );
    `, [
      correctionEmp.id, today,
      `${today}T08:00:00+07:00`, `${today}T17:00:00+07:00`
    ]);

    // 15. SYSTEM SETTINGS
    await client.query(`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES 
        ('COMPANY_PROFILE', '{"company_name": "Cosmediva Co., Ltd.", "brand": "CosmeFlow People", "version": "1.0.0"}', 'Company profile information'),
        ('ATTENDANCE_RULES', '{"grace_period_minutes": 15, "half_day_minutes": 240, "full_day_minutes": 480, "cross_midnight_allowed": true}', 'Attendance calculation engine rules'),
        ('LEAVE_RULES', '{"auto_cancel_unapproved_days": 1, "negative_balance_allowed": false, "probation_can_take_annual": false}', 'Leave policy default rules'),
        ('FACTORY_WORKFORCE', '{"mixing_min_headcount": 4, "filling_min_headcount": 6, "packing_min_headcount": 12, "qc_min_headcount": 3}', 'Minimum workforce readiness threshold per area')
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
    `);

    // 16. NOTIFICATIONS FOR DEMO USERS
    await client.query(`
      INSERT INTO notifications (recipient_id, title, message, notification_type, link_url)
      VALUES 
        ($1, 'มีคำขอลาใหม่รอการอนุมัติ (1 รายการ)', 'น.ส.เบ็ญจพร พูลสวัสดิ์ ยื่นคำขอลาพักร้อน วันที่ 08/09/2026', 'APPROVAL_NEEDED', '/people/approvals'),
        ($2, 'แจ้งเตือนเวลาเข้างานผิดปกติ (Attendance Exception)', 'พบพนักงานขาดงาน 2 คน และไม่สแกนนิ้ว 6 คน กรุณาตรวจสอบที่ Exception Center', 'EXCEPTION_ALERT', '/people/attendance?tab=exceptions');
    `, [supervisorId, hrMgrId]);

    await client.query('COMMIT');
    console.log('COSMEFLOW PEOPLE V1 SEED COMPLETED SUCCESSFULLY!');
    console.log(`Summary:
- 1 Company & Site (Cosmediva Navanakorn)
- 4 Divisions, 17 Departments, 11 Work Areas, 14 Positions
- 2 Work Schedules, 2 Shifts, 16 Holidays (2026)
- 12 Leave Types & Policies
- ${insertedEmployees.length} Real Active Employees Seeded
- Real Leave Balances & Transactions Ledger
- 2 Pending Leave Approvals (Supervisor & Manager flow)
- Today Attendance (${today}): ~120 Present, 4 Leave, 2 Absent, 4 Late, 6 Missing Punch
- Real Attendance Exceptions & 1 Pending Correction Request
- Live Notifications & System Settings
`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error, transaction rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
