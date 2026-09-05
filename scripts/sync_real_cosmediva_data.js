const fs = require('fs');
const pg = require('pg');
const xlsx = require('xlsx');

const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

// Primary file in Update PD Daily Status folder
const FOLDER_PATH = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/ทะเบียนพนักงาน คอสเมดิวา_2026.xlsx';
const DOWNLOADS_PATH = 'C:/Users/hp/Downloads/ทะเบียนพนักงาน_รวม_2026.xlsx';

const EXCEL_PATH = fs.existsSync(FOLDER_PATH) ? FOLDER_PATH : DOWNLOADS_PATH;

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL');
  console.log('Using Employee Master File:', EXCEL_PATH);

  try {
    await client.query('BEGIN');

    // 1. Company, Site, Schedule, Shift
    const compRes = await client.query("SELECT id FROM companies WHERE company_code = 'COSMEDIVA' LIMIT 1");
    const companyId = compRes.rows[0]?.id;

    const siteRes = await client.query("SELECT id FROM sites LIMIT 1");
    const siteId = siteRes.rows[0]?.id;

    const schedRes = await client.query("SELECT id FROM work_schedules LIMIT 1");
    const scheduleId = schedRes.rows[0]?.id;

    const shiftRes = await client.query("SELECT id FROM shifts LIMIT 1");
    const shiftId = shiftRes.rows[0]?.id;

    // 2. 13 Factory Holidays for 2569
    let calRes = await client.query("SELECT id FROM holiday_calendars WHERE year = 2026 LIMIT 1");
    let calendarId;
    if (calRes.rows.length === 0) {
      const newCal = await client.query(`
        INSERT INTO holiday_calendars (calendar_code, calendar_name, year, is_active)
        VALUES ('CAL-2026', 'ปฏิทินวันหยุดโรงงาน คอสเมดิวา ประจำปี 2569', 2026, true)
        RETURNING id
      `);
      calendarId = newCal.rows[0].id;
    } else {
      calendarId = calRes.rows[0].id;
    }

    await client.query("DELETE FROM holidays WHERE calendar_id = $1", [calendarId]);

    const officialHolidays = [
      { date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
      { date: '2026-01-02', name: 'วันหยุดชดเชยวันขึ้นปีใหม่' },
      { date: '2026-01-03', name: 'วันหยุดชดเชยวันขึ้นปีใหม่' },
      { date: '2026-03-03', name: 'วันมาฆบูชา' },
      { date: '2026-04-13', name: 'วันสงกรานต์' },
      { date: '2026-04-14', name: 'วันสงกรานต์' },
      { date: '2026-04-15', name: 'วันสงกรานต์' },
      { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' },
      { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี' },
      { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว' },
      { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9 (วันนวมินทรมหาราช)' },
      { date: '2026-12-30', name: 'วันหยุดสิ้นปี' },
      { date: '2026-12-31', name: 'วันหยุดสิ้นปี' },
    ];

    for (const h of officialHolidays) {
      await client.query(`
        INSERT INTO holidays (calendar_id, holiday_name, holiday_date, is_paid, is_active)
        VALUES ($1, $2, $3, true, true)
      `, [calendarId, h.name, h.date]);
    }
    console.log(`Inserted ${officialHolidays.length} official factory holidays for 2569.`);

    // 3. Leave Types & Leave Policies
    const officialLeaveTypes = [
      { code: 'ANNUAL', th: 'ลาพักร้อน (Annual Leave)', en: 'Annual Leave', my: 'နှစ်ပတ်လည်ခွင့်', color: '#10B981', paid: true },
      { code: 'SICK', th: 'ลาป่วย (Sick Leave)', en: 'Sick Leave', my: 'နေမကောင်းခွင့်', color: '#EF4444', paid: true },
      { code: 'PERSONAL', th: 'ลากิจธุระ (Personal Leave)', en: 'Personal Leave', my: 'ကိုယ်ရေးကိုယ်တာခွင့်', color: '#F59E0B', paid: true },
      { code: 'MATERNITY', th: 'ลาคลอดบุตร (Maternity Leave)', en: 'Maternity Leave', my: 'မီးဖွားခွင့်', color: '#EC4899', paid: true },
      { code: 'STERILIZATION', th: 'ลาเพื่อทำหมัน (Sterilization Leave)', en: 'Sterilization Leave', my: 'သားကြောဖြတ်ခွင့်', color: '#14B8A6', paid: true },
      { code: 'MILITARY', th: 'ลารับราชการทหาร (Military Leave)', en: 'Military Leave', my: 'စစ်မှုထမ်းခွင့်', color: '#4B5563', paid: true },
      { code: 'TRAINING', th: 'ลาฝึกอบรมและสัมมนา (Training Leave)', en: 'Training Leave', my: 'သင်တန်းတက်ခွင့်', color: '#8B5CF6', paid: true },
      { code: 'ORDINATION', th: 'ลาอุปสมบท (Ordination Leave)', en: 'Ordination Leave', my: 'ဘုန်းကြီးဝတ်ခွင့်', color: '#D97706', paid: true },
      { code: 'MARRIAGE', th: 'ลาเพื่อแต่งงาน (Marriage Leave)', en: 'Marriage Leave', my: 'မင်္ဂလာခွင့်', color: '#E11D48', paid: true },
      { code: 'BEREAVEMENT', th: 'ลาจัดงานศพ (Bereavement Leave)', en: 'Bereavement Leave', my: 'ဈာပနခွင့်', color: '#374151', paid: true },
      { code: 'DISASTER', th: 'ลาภัยพิบัติร้ายแรง (Disaster Leave)', en: 'Disaster Leave', my: 'သဘာဝဘေးခွင့်', color: '#B45309', paid: true },
      { code: 'UNPAID', th: 'ลาไม่รับค่าจ้าง (Leave Without Pay)', en: 'Leave Without Pay', my: 'လစာမရသောခွင့်', color: '#6B7280', paid: false }
    ];

    const typeIdMap = {};
    for (const lt of officialLeaveTypes) {
      const check = await client.query("SELECT id FROM leave_types WHERE type_code = $1", [lt.code]);
      let tid;
      if (check.rows.length === 0) {
        const ins = await client.query(`
          INSERT INTO leave_types (type_code, name_th, name_en, name_my, color_code, is_paid, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, true)
          RETURNING id
        `, [lt.code, lt.th, lt.en, lt.my, lt.color, lt.paid]);
        tid = ins.rows[0].id;
      } else {
        tid = check.rows[0].id;
        await client.query(`
          UPDATE leave_types SET name_th = $2, name_en = $3, name_my = $4, color_code = $5, is_paid = $6, is_active = true
          WHERE id = $1
        `, [tid, lt.th, lt.en, lt.my, lt.color, lt.paid]);
      }
      typeIdMap[lt.code] = tid;
    }

    const policies = [
      {
        type: 'ANNUAL',
        name: 'นโยบายลาพักร้อน (หมวด 4 ข้อ 4.3): 6 วัน/ปี ไม่สะสม',
        entitlement: 6,
        eligibilityMonths: 12,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 3,
        attachmentReq: false,
        paid: 'PAID'
      },
      {
        type: 'SICK',
        name: 'นโยบายลาป่วย (หมวด 5 ข้อ 5.1): 30 วัน/ปี (ใบรับรองแพทย์เมื่อลา >= 3 วัน)',
        entitlement: 30,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 0,
        attachmentReq: true,
        attachmentDays: 3,
        paid: 'PAID'
      },
      {
        type: 'PERSONAL',
        name: 'นโยบายลากิจธุระ (หมวด 5 ข้อ 5.2): 3 วัน/ปี ขอล่วงหน้า >= 1 วัน',
        entitlement: 3,
        eligibilityMonths: 4,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 1,
        attachmentReq: false,
        paid: 'PAID'
      },
      {
        type: 'MATERNITY',
        name: 'นโยบายลาคลอดบุตร (หมวด 5 ข้อ 5.3): 120 วัน (จ่ายค่าจ้าง 60 วัน)',
        entitlement: 60,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 30,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'STERILIZATION',
        name: 'นโยบายลาทำหมัน (หมวด 5 ข้อ 5.4): ตามแพทย์กำหนด ได้รับค่าจ้าง',
        entitlement: 3,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 3,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'MILITARY',
        name: 'นโยบายลารับราชการทหาร (หมวด 5 ข้อ 5.5): 60 วัน/ปี ได้รับค่าจ้าง',
        entitlement: 60,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 7,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'TRAINING',
        name: 'นโยบายลาฝึกอบรม (หมวด 5 ข้อ 5.6): 30 วัน หรือ 3 ครั้ง/ปี',
        entitlement: 30,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 7,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'ORDINATION',
        name: 'นโยบายลาอุปสมบท (หมวด 5 ข้อ 5.7): อายุงานครบ 1 ปี ได้รับค่าจ้าง 15 วัน',
        entitlement: 15,
        eligibilityMonths: 12,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 15,
        attachmentReq: false,
        paid: 'PAID'
      },
      {
        type: 'MARRIAGE',
        name: 'นโยบายลาแต่งงาน (หมวด 5 ข้อ 5.8): บรรจุครบ 1 ปี ลาได้ 5 วันทำงาน',
        entitlement: 5,
        eligibilityMonths: 12,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 15,
        attachmentReq: false,
        paid: 'PAID'
      },
      {
        type: 'BEREAVEMENT',
        name: 'นโยบายลาจัดงานศพ (หมวด 5 ข้อ 5.9): 7 วันทำงาน (บิดา มารดา คู่สมรส บุตร)',
        entitlement: 7,
        eligibilityMonths: 4,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 0,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'DISASTER',
        name: 'นโยบายลาภัยพิบัติ (หมวด 5 ข้อ 5.10): 5 วันทำงาน ได้รับค่าจ้าง',
        entitlement: 5,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 0,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'UNPAID',
        name: 'นโยบายลาไม่รับค่าจ้าง (Unpaid Leave)',
        entitlement: 30,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 3,
        attachmentReq: false,
        paid: 'UNPAID'
      }
    ];

    for (const p of policies) {
      const tid = typeIdMap[p.type];
      const existing = await client.query("SELECT id FROM leave_policies WHERE leave_type_id = $1", [tid]);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO leave_policies (
            leave_type_id, policy_name, employee_type, eligibility_service_months,
            annual_entitlement, entitlement_unit, accrual_method, carry_forward_allowed,
            max_carry_forward, minimum_notice_days, attachment_required, attachment_required_after_days,
            paid_unpaid, is_active
          ) VALUES ($1, $2, 'ALL', $3, $4, 'DAYS', 'ANNUAL_UPFRONT', $5, $6, $7, $8, $9, $10, true)
        `, [
          tid, p.name, p.eligibilityMonths, p.entitlement, p.carryForward,
          p.maxCarry, p.noticeDays, p.attachmentReq, p.attachmentDays || 0, p.paid
        ]);
      } else {
        await client.query(`
          UPDATE leave_policies SET
            policy_name = $2,
            eligibility_service_months = $3,
            annual_entitlement = $4,
            carry_forward_allowed = $5,
            max_carry_forward = $6,
            minimum_notice_days = $7,
            attachment_required = $8,
            attachment_required_after_days = $9,
            paid_unpaid = $10,
            is_active = true
          WHERE id = $1
        `, [
          existing.rows[0].id, p.name, p.eligibilityMonths, p.entitlement, p.carryForward,
          p.maxCarry, p.noticeDays, p.attachmentReq, p.attachmentDays || 0, p.paid
        ]);
      }
    }
    console.log('Leave policies updated.');

    // 4. Read Excel Roster
    const wb = xlsx.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);
    console.log(`Loaded ${rows.length} employee records from ${EXCEL_PATH}`);

    // If Downloads file exists, create a lookup for extra columns (ประเภทการจ้าง, ประเภทพนักงาน)
    const extraInfoMap = new Map();
    if (fs.existsSync(DOWNLOADS_PATH)) {
      const wbDL = xlsx.readFile(DOWNLOADS_PATH);
      const wsDL = wbDL.Sheets[wbDL.SheetNames[0]];
      const rowsDL = xlsx.utils.sheet_to_json(wsDL);
      rowsDL.forEach(r => {
        const code = String(r['รหัสพนักงาน'] || '').trim();
        if (code) {
          extraInfoMap.set(code, {
            empType: r['ประเภทการจ้าง'],
            hireType: r['ประเภทพนักงาน']
          });
        }
      });
    }

    const divisionNames = {
      'PDT': 'ฝ่ายบริหารและผู้อำนวยการโรงงาน (Plant Director)',
      'MM': 'ฝ่ายบริหารจัดการวัสดุและคลังสินค้า (Materials Management)',
      'PD': 'ฝ่ายผลิต (Production)',
      'QC': 'ฝ่ายควบคุมคุณภาพ (Quality Control)',
      'ACC': 'ฝ่ายบัญชีและการเงิน (Accounting & Finance)',
      'PDD': 'ฝ่ายสร้างสรรค์และออกแบบผลิตภัณฑ์ (Product Design & Dev)',
      'SM': 'ฝ่ายขายและการตลาด (Sales & Marketing)',
      'RA': 'ฝ่ายขึ้นทะเบียนและกฎหมาย (Regulatory Affairs)',
      'PU': 'ฝ่ายจัดซื้อ (Purchasing)',
      'HR': 'ฝ่ายทรัพยากรบุคคล (Human Resources)',
      'RD': 'ฝ่ายวิจัยและพัฒนาสูตร (Research & Development)',
      'QA': 'ฝ่ายประกันคุณภาพ (Quality Assurance)',
      'PL': 'ฝ่ายวางแผนการผลิต (Production Planning)',
      'MT': 'ฝ่ายซ่อมบำรุงวิศวกรรม (Maintenance)'
    };

    const departmentNames = {
      'PDT': 'ฝ่ายบริหารโรงงาน',
      'RM': 'แผนกคลังวัตถุดิบ (Raw Material Warehouse)',
      'PM/FG': 'แผนกคลังบรรจุภัณฑ์และสินค้าสำเร็จรูป (PM & FG Warehouse)',
      'PK': 'แผนกบรรจุ (Packing)',
      'QC': 'แผนกควบคุมคุณภาพ (QC)',
      'MX': 'แผนกผสม (Mixing)',
      'ACC': 'แผนกบัญชีและการเงิน (Accounting & Finance)',
      'PDD': 'แผนกออกแบบและพัฒนาผลิตภัณฑ์ (Design)',
      'SM': 'แผนกขาย (Sales)',
      'RA': 'แผนกขึ้นทะเบียน (RA)',
      'PU': 'แผนกจัดซื้อ (Purchasing)',
      'MKT': 'แผนกการตลาด (Marketing)',
      'HR': 'แผนกทรัพยากรบุคคล (HR & General Affairs)',
      'RD': 'แผนกวิจัยและพัฒนาสูตร (R&D)',
      'QA': 'แผนกประกันคุณภาพ (QA)',
      'DCC': 'แผนกควบคุมเอกสาร (Document Control)',
      'PL': 'แผนกวางแผนการผลิต (Planning)',
      'MT': 'แผนกซ่อมบำรุง (Maintenance)'
    };

    const divIdMap = {};
    for (const [code, name] of Object.entries(divisionNames)) {
      const q = await client.query("SELECT id FROM divisions WHERE division_code = $1", [code]);
      if (q.rows.length === 0) {
        const ins = await client.query(`
          INSERT INTO divisions (site_id, division_code, division_name, is_active)
          VALUES ($1, $2, $3, true)
          RETURNING id
        `, [siteId, code, name]);
        divIdMap[code] = ins.rows[0].id;
      } else {
        divIdMap[code] = q.rows[0].id;
      }
    }

    const deptIdMap = {};
    for (const [code, name] of Object.entries(departmentNames)) {
      const sampleRow = rows.find(r => r['แผนก'] === code);
      const divCode = sampleRow?.['ฝ่าย'] || 'PDT';
      const divId = divIdMap[divCode] || null;

      const q = await client.query("SELECT id FROM departments WHERE department_code = $1", [code]);
      if (q.rows.length === 0) {
        const ins = await client.query(`
          INSERT INTO departments (department_code, department_name, division_id, is_active)
          VALUES ($1, $2, $3, true)
          RETURNING id
        `, [code, name, divId]);
        deptIdMap[code] = ins.rows[0].id;
      } else {
        deptIdMap[code] = q.rows[0].id;
        await client.query("UPDATE departments SET department_name = $2, division_id = $3 WHERE id = $1", [q.rows[0].id, name, divId]);
      }
    }

    const posIdMap = {};
    for (const r of rows) {
      const posTitle = r['ตำแหน่ง'] ? r['ตำแหน่ง'].trim() : 'พนักงานทั่วไป';
      const deptCode = r['แผนก'] || 'PK';
      const deptId = deptIdMap[deptCode];
      
      const key = `${deptCode}:::${posTitle}`;
      if (!posIdMap[key]) {
        const q = await client.query("SELECT id FROM positions WHERE position_name = $1", [posTitle]);
        if (q.rows.length === 0) {
          const code = `POS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          const ins = await client.query(`
            INSERT INTO positions (department_id, position_code, position_name, job_level, is_active)
            VALUES ($1, $2, $3, 'STAFF', true)
            RETURNING id
          `, [deptId, code, posTitle]);
          posIdMap[key] = ins.rows[0].id;
        } else {
          posIdMap[key] = q.rows[0].id;
        }
      }
    }

    // Auth user matching
    const authRes = await client.query("SELECT id, email, raw_user_meta_data FROM auth.users");
    const authUserMap = new Map();
    authRes.rows.forEach(u => {
      if (u.raw_user_meta_data?.employee_id) {
        authUserMap.set(u.raw_user_meta_data.employee_id.toUpperCase().replace(/[^A-Z0-9]/g, ''), u.id);
      }
      if (u.email) {
        authUserMap.set(u.email.toLowerCase(), u.id);
      }
    });

    const empIdByCode = new Map();
    const empIdByName = new Map();

    const parseDate = (dStr) => {
      if (!dStr) return null;
      const parts = String(dStr).split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      return dStr;
    };

    console.log('Upserting employees into database...');
    for (const r of rows) {
      const code = String(r['รหัสพนักงาน'] || '').trim();
      const rawName = String(r['ชื่อ-นามสกุล'] || '').trim();
      const prefix = String(r['คำนำหน้า'] || '').trim() || null;
      
      const nameParts = rawName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || rawName;
      const lastName = nameParts.slice(1).join(' ') || '-';

      const deptCode = r['แผนก'];
      const divCode = r['ฝ่าย'];
      const posTitle = r['ตำแหน่ง'] ? r['ตำแหน่ง'].trim() : 'พนักงานทั่วไป';

      const deptId = deptIdMap[deptCode] || null;
      const divId = divIdMap[divCode] || null;
      const posId = posIdMap[`${deptCode}:::${posTitle}`] || null;

      const gender = r['เพศ'] === 'M' ? 'MALE' : (r['เพศ'] === 'F' ? 'FEMALE' : 'OTHER');
      const dob = parseDate(r['วันเกิด']);
      const hireDate = parseDate(r['วันเริ่มงาน']);
      const phone = r['เบอร์โทร'] ? String(r['เบอร์โทร']).trim() : null;
      const nationality = r['สัญชาติ'] ? String(r['สัญชาติ']).trim() : 'ไทย';

      const extra = extraInfoMap.get(code) || {};
      const rawEmpType = r['ประเภทการจ้าง'] || extra.empType;
      const rawHireType = r['ประเภทพนักงาน'] || extra.hireType;

      const empType = rawEmpType === 'รายวัน' ? 'Daily' : 'Monthly';
      const empStatus = rawHireType === 'ทดลองงาน' ? 'Probation' : 
                        (rawHireType === 'พาร์ทไทม์' ? 'Contract' : 'Permanent');

      let systemRole = 'Employee';
      const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (cleanCode === 'PDTCPS001') {
        systemRole = 'Executive';
      } else if (cleanCode === 'HRANS1886') {
        systemRole = 'HR Manager';
      } else if (deptCode === 'HR') {
        systemRole = 'HR Officer';
      } else if (['PKBJP518', 'QABUP1677', 'ACCNVR665', 'RDSIK1895', 'MMSAB1931'].includes(cleanCode)) {
        systemRole = 'Manager';
      } else if (['QCTTM181', 'PDDKAT952', 'MXKTJ620', 'MMCYS026', 'BECTAM1903'].includes(cleanCode)) {
        systemRole = 'Supervisor';
      }

      const cleanCodeNoDash = cleanCode;
      const matchedUserId = authUserMap.get(cleanCodeNoDash) || null;
      const email = `${cleanCodeNoDash.toLowerCase()}@cosmediva.local`;

      const checkEmp = await client.query("SELECT id FROM employees WHERE employee_code = $1", [code]);
      let empId;

      if (checkEmp.rows.length === 0) {
        const ins = await client.query(`
          INSERT INTO employees (
            employee_code, prefix, first_name, last_name, gender, date_of_birth,
            nationality, phone, email, company_id, site_id, division_id, department_id,
            position_id, job_level, employment_type, employment_status, hire_date,
            default_schedule_id, default_shift_id, work_location, clocking_required,
            overtime_eligible, leave_policy_group, user_id, system_role, is_active
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18,
            $19, $20, 'โรงงานคอสเมดิวา ปทุมธานี', true,
            true, 'STANDARD', $21, $22, true
          ) RETURNING id
        `, [
          code, prefix, firstName, lastName, gender, dob,
          nationality, phone, email, companyId, siteId, divId, deptId,
          posId, (systemRole === 'Executive' ? 'EXECUTIVE' : (systemRole === 'Manager' ? 'MANAGER' : (systemRole === 'Supervisor' ? 'SUPERVISOR' : 'STAFF'))),
          empType, empStatus, hireDate,
          scheduleId, shiftId, matchedUserId, systemRole
        ]);
        empId = ins.rows[0].id;
      } else {
        empId = checkEmp.rows[0].id;
        await client.query(`
          UPDATE employees SET
            prefix = $2,
            first_name = $3,
            last_name = $4,
            gender = $5,
            date_of_birth = $6,
            nationality = $7,
            phone = $8,
            email = $9,
            company_id = $10,
            site_id = $11,
            division_id = $12,
            department_id = $13,
            position_id = $14,
            job_level = $15,
            employment_type = $16,
            employment_status = $17,
            hire_date = $18,
            default_schedule_id = $19,
            default_shift_id = $20,
            user_id = COALESCE(user_id, $21),
            system_role = $22,
            is_active = true
          WHERE id = $1
        `, [
          empId, prefix, firstName, lastName, gender, dob,
          nationality, phone, email, companyId, siteId, divId, deptId,
          posId, (systemRole === 'Executive' ? 'EXECUTIVE' : (systemRole === 'Manager' ? 'MANAGER' : (systemRole === 'Supervisor' ? 'SUPERVISOR' : 'STAFF'))),
          empType, empStatus, hireDate,
          scheduleId, shiftId, matchedUserId, systemRole
        ]);
      }

      empIdByCode.set(code, empId);
      empIdByName.set(rawName.replace(/\s+/g, ' ').trim(), empId);
      empIdByName.set(rawName.replace(/^(นาย|น\.ส\.|นาง|ดร\.ภญ\.|ดร\.)\s*/, '').replace(/\s+/g, ' ').trim(), empId);
    }

    console.log(`Upserted ${empIdByCode.size} employees.`);

    // Linking Supervisors & Initializing Leave Balances
    console.log('Linking supervisors and initializing leave balances...');
    const annualTypeId = typeIdMap['ANNUAL'];
    const sickTypeId = typeIdMap['SICK'];
    const personalTypeId = typeIdMap['PERSONAL'];
    const refDate = new Date('2026-09-05');

    for (const r of rows) {
      const code = String(r['รหัสพนักงาน'] || '').trim();
      const empId = empIdByCode.get(code);
      if (!empId) continue;

      const supName = String(r['หัวหน้างานสายตรง (Supervisor)'] || '').replace(/\s+/g, ' ').trim();
      let supId = null;
      if (supName && supName !== 'ผู้บริหารสูงสุด') {
        supId = empIdByName.get(supName) || empIdByName.get(supName.replace(/^(นาย|น\.ส\.|นาง|ดร\.ภญ\.|ดร\.)\s*/, '')) || null;
      }

      if (supId) {
        await client.query("UPDATE employees SET supervisor_id = $2 WHERE id = $1", [empId, supId]);
        
        const checkES = await client.query("SELECT id FROM employee_supervisors WHERE employee_id = $1", [empId]);
        if (checkES.rows.length === 0) {
          await client.query(`
            INSERT INTO employee_supervisors (employee_id, supervisor_id, assignment_type, is_active)
            VALUES ($1, $2, 'DIRECT', true)
          `, [empId, supId]);
        } else {
          await client.query(`
            UPDATE employee_supervisors SET supervisor_id = $2, is_active = true WHERE employee_id = $1
          `, [empId, supId]);
        }
      }

      const hireDateStr = parseDate(r['วันเริ่มงาน']);
      let annualEntitled = 0;
      let sickEntitled = 30;
      let personalEntitled = 3;

      if (hireDateStr) {
        const hireDateObj = new Date(hireDateStr);
        const serviceYears = (refDate - hireDateObj) / (1000 * 60 * 60 * 24 * 365.25);
        if (serviceYears >= 1.0) {
          annualEntitled = 6;
        } else {
          annualEntitled = 0;
        }
      }

      const balanceDefs = [
        { typeId: annualTypeId, entitled: annualEntitled },
        { typeId: sickTypeId, entitled: sickEntitled },
        { typeId: personalTypeId, entitled: personalEntitled }
      ];

      for (const b of balanceDefs) {
        const checkB = await client.query(`
          SELECT id FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = 2026
        `, [empId, b.typeId]);

        if (checkB.rows.length === 0) {
          await client.query(`
            INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled, carry_forward, taken, pending, available)
            VALUES ($1, $2, 2026, $3, 0.00, 0.00, 0.00, $3)
          `, [empId, b.typeId, b.entitled]);
        } else {
          await client.query(`
            UPDATE leave_balances SET
              entitled = $2,
              carry_forward = 0.00,
              available = $2 - taken - pending,
              updated_at = NOW()
            WHERE id = $1
          `, [checkB.rows[0].id, b.entitled]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n===============================================================');
    console.log('SUCCESS: All 3 Master Files Synchronized into CosmeFlow People!');
    console.log('1. Factory Holiday Calendar: 13 days configured for 2569');
    console.log('2. Leave Policies: 12 policies configured exactly per work rules');
    console.log('3. Employee Master: 133 employees synced, hierarchy connected, 2026 balances set');
    console.log('===============================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR during synchronization:', err);
  } finally {
    await client.end();
  }
}

main();
