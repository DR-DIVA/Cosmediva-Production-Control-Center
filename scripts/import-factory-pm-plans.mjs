import xlsx from 'xlsx';
import path from 'path';
import pg from 'pg';
const { Client } = pg;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const client = new Client({
  connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
  ssl: { rejectUnauthorized: false }
});

const basePath = path.resolve('..');

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTH_NUMS = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

function getStandardChecklist(category, name) {
  const common = [
    { item: 'ตรวจสอบสภาพทั่วไปและการยึดแน่นของโครงสร้าง', standard: 'ไม่หลวมคลอน ไม่มีรอยแตกร้าว', method: 'ตรวจด้วยสายตาและขันกวด' },
    { item: 'ตรวจสอบสายไฟ การต่อลงดิน และขั้วต่อทางไฟฟ้า', standard: 'สายไฟไม่ชำรุด ขั้วต่อแน่น มีสายดิน', method: 'ตรวจด้วยสายตาและมัลติมิเตอร์' },
    { item: 'ทำความสะอาดจุดสัมผัสและปัดฝุ่นสิ่งสกปรก', standard: 'สะอาด ปราศจากคราบสะสมและฝุ่นละออง', method: 'เช็ดทำความสะอาดและเป่าฝุ่น' }
  ];

  if (category === 'Utility') {
    return [
      ...common,
      { item: 'ตรวจเช็คแรงดันลม/น้ำ/น้ำมัน และรอยรั่วซึม', standard: 'แรงดันอยู่ในเกณฑ์มาตรฐาน ไม่มีการรั่วซึม', method: 'ตรวจดูเกจวัดแรงดันและรอยต่อ' },
      { item: 'ตรวจสภาพไส้กรองและเปลี่ยนตามรอบ', standard: 'ไส้กรองไม่อุดตัน อัตราไหลปกติ', method: 'ถอดตรวจเช็คและทำความสะอาด/เปลี่ยน' },
      { item: 'ตรวจเช็คกระแสไฟฟ้าขณะมอเตอร์ทำงาน', standard: 'กระแสไม่เกินพิกัด Full Load Current (FLA)', method: 'ใช้ Clamp Meter วัดกระแส' }
    ];
  }

  if (category === 'Mixing') {
    return [
      ...common,
      { item: 'ตรวจเช็คชุดแมคคานิคอลซีล (Mechanical Seal) และการรั่วซึม', standard: 'ไม่มีสารหรือของเหลวรั่วซึมออกมา', method: 'ตรวจเช็คด้วยสายตาและแรงดันสูญญากาศ' },
      { item: 'ตรวจสอบระบบไฮดรอลิกยกฝาถังและระบบเซฟตี้ล็อค', standard: 'ยกขึ้น-ลงราบเรียบ ระบบล็อคทำงานสมบูรณ์', method: 'ทดสอบการทำงานจริง' },
      { item: 'อัดจารบีตลับลูกปืนและหล่อลื่นชุดเฟืองขับ', standard: 'จารบีใหม่เต็มเบ้า เสียงหมุนเรียบเงียบ', method: 'ใช้กระบอกอัดจารบีฟู้ดเกรด' }
    ];
  }

  if (category === 'Filling' || category === 'Packaging' || category === 'Capping' || category === 'Sealing') {
    return [
      ...common,
      { item: 'ตรวจสอบชุดหัวจ่าย/กระบอกสูบ/วาล์วควบคุม', standard: 'การเคลื่อนที่คล่องตัว ไม่ติดขัด ไม่หยด', method: 'ทดสอบการทำงาน' },
      { item: 'ตรวจสอบสายพานลำเลียง โซ่ขับ และความตึงสายพาน', standard: 'สายพานไม่หย่อน ไม่เฉ ไม่แตกลายงา', method: 'วัดระยะหย่อนและปรับตั้ง' },
      { item: 'ตรวจเช็คเซนเซอร์ตรวจจับตำแหน่งและ Photo Sensor', standard: 'ตรวจจับแม่นยำ เลนส์สะอาด ไม่มีฝุ่นเกาะ', method: 'ทำความสะอาดเลนส์และทดสอบเซนเซอร์' },
      { item: 'ตรวจเช็คอุณหภูมิฮีตเตอร์และการซีล (ถ้ามี)', standard: 'ความร้อนสม่ำเสมอ แถบซีลสนิทเรียบร้อย', method: 'วัดอุณหภูมิด้วย Infrared Thermo' }
    ];
  }

  return [
    ...common,
    { item: 'ตรวจเช็คระดับสารหล่อลื่นและอัดจารบี', standard: 'ระดับน้ำมัน/จารบีอยู่ในเกณฑ์มาตรฐาน', method: 'ตรวจวัดและเติมจารบี' },
    { item: 'ทดสอบการทำงานและเสียงการหมุนของมอเตอร์', standard: 'ทำงานปกติ ไม่มีเสียงดังหรือสั่นสะเทือนผิดปกติ', method: 'ทดสอบรันเครื่อง 10 นาที' }
  ];
}

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL for PM Plans Import.');

  // Ensure schedule_months column exists
  await client.query(`
    ALTER TABLE maintenance_pm_plans 
    ADD COLUMN IF NOT EXISTS schedule_months JSONB DEFAULT '[]'::jsonb;
  `);

  const pmFile = path.join(basePath, 'แผน PM ประจำปีและเดือน 2026 (1).xlsx');
  const wbPm = xlsx.readFile(pmFile);
  const wsPm = wbPm.Sheets['PM2026 (Rev01)'];
  const rowsPm = xlsx.utils.sheet_to_json(wsPm, { header: 1 });

  // Load all machines from DB into a lookup map
  const mRes = await client.query('SELECT id, machine_code, machine_name, category, department_code FROM maintenance_machines');
  const machineMap = new Map();
  mRes.rows.forEach(m => {
    machineMap.set(m.machine_code.trim(), m);
    // Also map space <-> hyphen variations
    machineMap.set(m.machine_code.replace(/\s+/g, '-'), m);
    machineMap.set(m.machine_code.replace(/-/g, ' '), m);
  });

  console.log(`Loaded ${mRes.rows.length} machines from DB for lookup.`);

  let inserted = 0;
  let updated = 0;
  let missingMachines = 0;

  for (let i = 7; i < rowsPm.length; i++) {
    const r = rowsPm[i];
    if (!r || typeof r[0] !== 'number' || !r[1]) continue;

    const itemNo = r[0];
    let rawCode = String(r[1]).trim();
    if (rawCode === 'AFIL-PK-001') rawCode = 'AFILL-PK-001';

    // Find machine
    let machine = machineMap.get(rawCode) || machineMap.get(rawCode.replace(/\s+/g, '-')) || machineMap.get(rawCode.replace(/-/g, ' '));
    if (!machine) {
      // Direct query fallback
      const q = await client.query('SELECT id, machine_code, machine_name, category, department_code FROM maintenance_machines WHERE machine_code ILIKE $1 LIMIT 1', [rawCode]);
      if (q.rows.length > 0) {
        machine = q.rows[0];
      }
    }

    if (!machine) {
      console.warn(`Could not find machine for PM item ${itemNo}: ${rawCode}`);
      missingMachines++;
      continue;
    }

    const planCode = `PM-2026-${String(itemNo).padStart(3, '0')}`;
    const planName = `แผน PM ประจำปี 2026: ${r[2] || machine.machine_name}`;

    // Extract months & determine frequency
    const scheduledMonths = [];
    const monthlyValues = [];
    for (let m = 0; m < 12; m++) {
      const val = r[5 + m];
      if (val && String(val).trim()) {
        const strVal = String(val).trim();
        scheduledMonths.push(MONTH_NAMES[m]);
        monthlyValues.push(strVal);
      }
    }

    let freqType = 'Monthly';
    let freqInterval = 1;
    const primaryVal = monthlyValues[0] || 'PM1';

    if (primaryVal === 'PM12' || scheduledMonths.length === 1) {
      freqType = 'Yearly';
      freqInterval = 12;
    } else if (primaryVal === 'PM6' || scheduledMonths.length === 2) {
      freqType = 'BiAnnually';
      freqInterval = 6;
    } else if (primaryVal === 'PM4' || scheduledMonths.length === 3) {
      freqType = 'Every 4 Months';
      freqInterval = 4;
    } else if (primaryVal === 'PM3' || scheduledMonths.length === 4) {
      freqType = 'Quarterly';
      freqInterval = 3;
    } else if (primaryVal === 'PM2' || scheduledMonths.length === 6) {
      freqType = 'Every 2 Months';
      freqInterval = 2;
    } else {
      freqType = 'Monthly';
      freqInterval = 1;
    }

    // Determine next due date
    // Current month is September (month 9)
    let nextMonth = scheduledMonths.find(m => MONTH_NUMS[m] >= 9);
    let nextYear = 2026;
    if (!nextMonth) {
      nextMonth = scheduledMonths[0] || 'JAN';
      nextYear = 2027;
    }
    const mNum = MONTH_NUMS[nextMonth] || 10;
    const nextDueDate = `${nextYear}-${String(mNum).padStart(2, '0')}-25`;

    const checklist = getStandardChecklist(machine.category, machine.machine_name);

    const res = await client.query(`
      INSERT INTO maintenance_pm_plans (
        plan_code, plan_name, machine_id, machine_code, machine_name,
        frequency_type, frequency_interval, estimated_minutes, checklist_template,
        safety_requirements, required_tools, schedule_months, next_due_date, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true
      )
      ON CONFLICT (plan_code) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        machine_id = EXCLUDED.machine_id,
        machine_code = EXCLUDED.machine_code,
        machine_name = EXCLUDED.machine_name,
        frequency_type = EXCLUDED.frequency_type,
        frequency_interval = EXCLUDED.frequency_interval,
        schedule_months = EXCLUDED.schedule_months,
        next_due_date = EXCLUDED.next_due_date,
        checklist_template = EXCLUDED.checklist_template,
        updated_at = NOW()
      RETURNING (xmax = 0) AS is_inserted;
    `, [
      planCode,
      planName,
      machine.id,
      machine.machine_code,
      machine.machine_name,
      freqType,
      freqInterval,
      freqInterval >= 6 ? 120 : 60,
      JSON.stringify(checklist),
      'ตัดกระแสไฟฟ้าก่อนเริ่มงาน (Lockout/Tagout), สวมถุงมือนิรภัยและแว่นตาเซฟตี้',
      'ชุดประแจหกเหลี่ยม, ประแจปากตาย, มัลติมิเตอร์, กระบอกอัดจารบี, ผ้าสะอาด',
      JSON.stringify(scheduledMonths),
      nextDueDate
    ]);

    if (res.rows[0]?.is_inserted) {
      inserted++;
    } else {
      updated++;
    }
  }

  const finalPmCount = await client.query('SELECT COUNT(*) FROM maintenance_pm_plans WHERE is_active = true');
  console.log('PM Plans 2026 Import Complete:');
  console.log(`- Inserted: ${inserted}`);
  console.log(`- Updated: ${updated}`);
  console.log(`- Missing machines: ${missingMachines}`);
  console.log(`- Total active PM plans in DB: ${finalPmCount.rows[0].count}`);

  await client.end();
}

main().catch(err => {
  console.error('Import PM plans error:', err);
  process.exit(1);
});
