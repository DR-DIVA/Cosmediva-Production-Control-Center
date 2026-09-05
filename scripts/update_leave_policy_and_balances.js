const pg = require('pg');
const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  try {
    await client.query('BEGIN');

    // 1. Configure Leave Types
    console.log('--- 1. Upserting Updated Leave Types ---');
    const newLeaveTypes = [
      { code: 'ANNUAL', th: 'ลาพักร้อน (Annual Leave)', en: 'Annual Leave', my: 'နှစ်ပတ်လည်ခွင့်', color: '#10B981', paid: true, sort: 1 },
      { code: 'PERSONAL_1', th: 'ลากิจ 1 (ได้รับค่าจ้าง - ผ่านโปร)', en: 'Personal Leave 1 (Paid)', my: 'လစာရ ကိုယ်ရေးကိုယ်တာခွင့်', color: '#F59E0B', paid: true, sort: 2 },
      { code: 'PERSONAL_2', th: 'ลากิจ 2 (ไม่ได้รับค่าจ้าง - ทดลองงาน)', en: 'Personal Leave 2 (Unpaid)', my: 'လစာမရ ကိုယ်ရေးကိုယ်တာခွင့်', color: '#64748B', paid: false, sort: 3 },
      { code: 'SICK_H', th: 'ลาป่วยมีใบแพทย์ (ป่วย H)', en: 'Sick Leave with Med Cert (H)', my: 'ဆေးလက်မှတ်ပါ နေမကောင်းခွင့်', color: '#EA580C', paid: true, sort: 4 },
      { code: 'SICK_N', th: 'ลาป่วยไม่มีใบแพทย์ (ป่วย N)', en: 'Sick Leave without Med Cert (N)', my: 'ဆေးလက်မှတ်မပါ နေမကောင်းခွင့်', color: '#DC2626', paid: true, sort: 5 },
      { code: 'MATERNITY', th: 'ลาคลอดบุตร (Maternity Leave)', en: 'Maternity Leave', my: 'မီးဖွားခွင့်', color: '#EC4899', paid: true, sort: 6 },
      { code: 'MARRIAGE', th: 'ลาเพื่อแต่งงาน (Marriage Leave)', en: 'Marriage Leave', my: 'မင်္ဂလာခွင့်', color: '#E11D48', paid: true, sort: 7 },
      { code: 'BEREAVEMENT', th: 'ลาจัดงานศพ (Bereavement Leave)', en: 'Bereavement Leave', my: 'ဈာပနခွင့်', color: '#374151', paid: true, sort: 8 },
      { code: 'ORDINATION', th: 'ลาอุปสมบท (Ordination Leave)', en: 'Ordination Leave', my: 'ဘုန်းကြီးဝတ်ခွင့်', color: '#D97706', paid: true, sort: 9 },
      { code: 'STERILIZATION', th: 'ลาเพื่อทำหมัน (Sterilization Leave)', en: 'Sterilization Leave', my: 'သားကြောဖြတ်ခွင့်', color: '#14B8A6', paid: true, sort: 10 },
      { code: 'MILITARY', th: 'ลารับราชการทหาร (Military Leave)', en: 'Military Leave', my: 'စစ်မှုထမ်းခွင့်', color: '#4B5563', paid: true, sort: 11 },
      { code: 'TRAINING', th: 'ลาฝึกอบรมและสัมมนา (Training Leave)', en: 'Training Leave', my: 'သင်တန်းတက်ခွင့်', color: '#8B5CF6', paid: true, sort: 12 },
      { code: 'DISASTER', th: 'ลาภัยพิบัติร้ายแรง (Disaster Leave)', en: 'Disaster Leave', my: 'သဘာဝဘေးခွင့်', color: '#B45309', paid: true, sort: 13 },
      { code: 'UNPAID', th: 'ลาไม่รับค่าจ้าง (Leave Without Pay)', en: 'Leave Without Pay', my: 'လစာမရသောခွင့်', color: '#6B7280', paid: false, sort: 14 }
    ];

    const typeMap = {};
    for (const lt of newLeaveTypes) {
      const q = await client.query(`
        INSERT INTO leave_types (type_code, name_th, name_en, name_my, color_code, is_paid, is_active, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        ON CONFLICT (type_code)
        DO UPDATE SET
          name_th = EXCLUDED.name_th,
          name_en = EXCLUDED.name_en,
          name_my = EXCLUDED.name_my,
          color_code = EXCLUDED.color_code,
          is_paid = EXCLUDED.is_paid,
          is_active = true,
          sort_order = EXCLUDED.sort_order
        RETURNING id, type_code
      `, [lt.code, lt.th, lt.en, lt.my, lt.color, lt.paid, lt.sort]);
      typeMap[lt.code] = q.rows[0].id;
    }
    console.log('Upserted updated leave types:', Object.keys(typeMap));

    // 2. Configure Leave Policies
    console.log('--- 2. Upserting Updated Leave Policies ---');
    const newPolicies = [
      {
        type: 'ANNUAL',
        name: 'นโยบายลาพักร้อน: ขั้นอายุงาน 6-9 วัน (1วัน/2เดือน, >3ปี=7วัน, >5ปี=8วัน, >7ปี=9วัน)',
        entitlement: 6,
        eligibilityMonths: 12,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 3,
        attachmentReq: false,
        attachmentDays: 0,
        paid: 'PAID'
      },
      {
        type: 'PERSONAL_1',
        name: 'นโยบายลากิจ 1 (ได้รับค่าจ้าง): ผ่านทดลองงานแล้ว 6 วัน/ปี (1 วัน / 2 เดือน, ขอล่วงหน้า >= 1 วัน)',
        entitlement: 6,
        eligibilityMonths: 4,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 1,
        attachmentReq: false,
        attachmentDays: 0,
        paid: 'PAID'
      },
      {
        type: 'PERSONAL_2',
        name: 'นโยบายลากิจ 2 (ไม่ได้รับค่าจ้าง): ระหว่างทดลองงาน 119 วัน (ขอล่วงหน้า >= 1 วัน)',
        entitlement: 0,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 1,
        attachmentReq: false,
        attachmentDays: 0,
        paid: 'UNPAID'
      },
      {
        type: 'SICK_H',
        name: 'นโยบายลาป่วยมีใบแพทย์ (ป่วย H): สิทธิ์ 30 วัน/ปี (ลา >= 1 วัน ต้องแนบใบรับรองแพทย์แผนปัจจุบัน)',
        entitlement: 30,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 0,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'SICK_N',
        name: 'นโยบายลาป่วยไม่มีใบแพทย์ (ป่วย N): สิทธิ์ 30 วัน/ปี (ลาป่วยโดยไม่มีใบรับรองแพทย์)',
        entitlement: 30,
        eligibilityMonths: 0,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 0,
        attachmentReq: false,
        attachmentDays: 0,
        paid: 'PAID'
      },
      {
        type: 'MATERNITY',
        name: 'นโยบายลาคลอดบุตร: 120 วัน (จ่ายค่าจ้าง 60 วัน)',
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
        type: 'MARRIAGE',
        name: 'นโยบายลาแต่งงาน: 5 วันทำงาน ได้รับค่าจ้าง (อายุงานครบ 1 ปี, ขอล่วงหน้า >= 15 วัน)',
        entitlement: 5,
        eligibilityMonths: 12,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 15,
        attachmentReq: false,
        attachmentDays: 0,
        paid: 'PAID'
      },
      {
        type: 'BEREAVEMENT',
        name: 'นโยบายลาจัดงานศพ: 5 วันทำงาน ได้รับค่าจ้าง (บิดา มารดา คู่สมรส บุตร)',
        entitlement: 5,
        eligibilityMonths: 4,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 0,
        attachmentReq: true,
        attachmentDays: 1,
        paid: 'PAID'
      },
      {
        type: 'ORDINATION',
        name: 'นโยบายลาอุปสมบท: ไม่เกิน 60 วัน (จ่ายค่าจ้าง 15 วัน, อายุงานครบ 1 ปี)',
        entitlement: 15,
        eligibilityMonths: 12,
        carryForward: false,
        maxCarry: 0,
        noticeDays: 15,
        attachmentReq: false,
        attachmentDays: 0,
        paid: 'PAID'
      },
      {
        type: 'STERILIZATION',
        name: 'นโยบายลาทำหมัน: ตามแพทย์กำหนด ได้รับค่าจ้าง',
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
        name: 'นโยบายลารับราชการทหาร: 60 วัน/ปี ได้รับค่าจ้าง',
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
        name: 'นโยบายลาฝึกอบรม: 30 วัน หรือ 3 ครั้ง/ปี ได้รับค่าจ้าง',
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
        type: 'DISASTER',
        name: 'นโยบายลาภัยพิบัติ: 5 วันทำงาน ได้รับค่าจ้าง',
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
        attachmentDays: 0,
        paid: 'UNPAID'
      }
    ];

    for (const p of newPolicies) {
      const tid = typeMap[p.type];
      if (!tid) continue;
      const chk = await client.query("SELECT id FROM leave_policies WHERE leave_type_id = $1", [tid]);
      if (chk.rows.length === 0) {
        await client.query(`
          INSERT INTO leave_policies (
            leave_type_id, policy_name, employee_type, eligibility_service_months,
            annual_entitlement, entitlement_unit, accrual_method, carry_forward_allowed,
            max_carry_forward, minimum_notice_days, attachment_required, attachment_required_after_days,
            paid_unpaid, is_active
          ) VALUES ($1, $2, 'ALL', $3, $4, 'DAYS', 'ANNUAL_UPFRONT', $5, $6, $7, $8, $9, $10, true)
        `, [tid, p.name, p.eligibilityMonths, p.entitlement, p.carryForward, p.maxCarry, p.noticeDays, p.attachmentReq, p.attachmentDays, p.paid]);
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
        `, [chk.rows[0].id, p.name, p.eligibilityMonths, p.entitlement, p.carryForward, p.maxCarry, p.noticeDays, p.attachmentReq, p.attachmentDays, p.paid]);
      }
    }
    console.log('Upserted updated leave policies.');

    // 3. Calculate and Update Leave Balances for 2026 for All Employees
    console.log('--- 3. Calculating 2026 Entitlements according to Tenure & Probation ---');
    const refDate = new Date('2026-09-05');
    const emps = await client.query(`
      SELECT id, employee_code, first_name, last_name, hire_date 
      FROM employees 
      WHERE is_active = true
    `);

    const annualId = typeMap['ANNUAL'];
    const p1Id = typeMap['PERSONAL_1'];
    const p2Id = typeMap['PERSONAL_2'];
    const sickHId = typeMap['SICK_H'];
    const sickNId = typeMap['SICK_N'];
    const marriageId = typeMap['MARRIAGE'];
    const funeralId = typeMap['BEREAVEMENT'];

    let countTiers = { under1: 0, tier1_3: 0, tier3_5: 0, tier5_7: 0, over7: 0 };
    let countProbation = { inProbation: 0, passed: 0 };

    for (const emp of emps.rows) {
      let annualDays = 0;
      let p1Days = 0;
      let p2Days = 0;
      let sickHDays = 30;
      let sickNDays = 30;
      let marriageDays = 0;
      let funeralDays = 0;

      if (emp.hire_date) {
        const h = new Date(emp.hire_date);
        const diffDays = (refDate - h) / (1000 * 60 * 60 * 24);
        const diffYears = diffDays / 365.25;

        // Rule 1 & 2: Annual Leave Tiers
        // < 1 yr: 0
        // >= 1 yr and <= 3 yr: 6 days (1 day / 2 months)
        // > 3 yr and <= 5 yr: 7 days
        // > 5 yr and <= 7 yr: 8 days
        // > 7 yr: 9 days
        if (diffYears < 1.0) {
          annualDays = 0;
          countTiers.under1++;
        } else if (diffYears <= 3.0) {
          annualDays = 6;
          countTiers.tier1_3++;
        } else if (diffYears <= 5.0) {
          annualDays = 7;
          countTiers.tier3_5++;
        } else if (diffYears <= 7.0) {
          annualDays = 8;
          countTiers.tier5_7++;
        } else {
          annualDays = 9;
          countTiers.over7++;
        }

        // Rule 3 & 4: Personal Leave & Probation (119 days)
        if (diffDays >= 119) {
          p1Days = 6; // Passed probation: Paid personal leave 6 days/yr (1 day / 2 months)
          p2Days = 0;
          funeralDays = 5; // Passed probation: Bereavement leave 5 days
          countProbation.passed++;
        } else {
          p1Days = 0;
          p2Days = 0; // In probation (119 days): Unpaid personal leave
          funeralDays = 0;
          countProbation.inProbation++;
        }

        // Marriage leave: >= 1 year tenure = 5 days
        if (diffYears >= 1.0) {
          marriageDays = 5;
        }
      } else {
        annualDays = 0;
        p1Days = 0;
        p2Days = 0;
      }

      // Upsert balances for this employee
      const balancesToUpsert = [
        { typeId: annualId, days: annualDays },
        { typeId: p1Id, days: p1Days },
        { typeId: p2Id, days: p2Days },
        { typeId: sickHId, days: sickHDays },
        { typeId: sickNId, days: sickNDays },
        { typeId: marriageId, days: marriageDays },
        { typeId: funeralId, days: funeralDays }
      ];

      for (const b of balancesToUpsert) {
        if (!b.typeId) continue;
        await client.query(`
          INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled, carry_forward, taken, pending, available)
          VALUES ($1, $2, 2026, $3, 0.00, 0.00, 0.00, $3)
          ON CONFLICT (employee_id, leave_type_id, year)
          DO UPDATE SET
            entitled = EXCLUDED.entitled,
            carry_forward = 0.00,
            available = EXCLUDED.entitled - leave_balances.taken - leave_balances.pending,
            updated_at = NOW()
        `, [emp.id, b.typeId, b.days]);
      }
    }

    await client.query('COMMIT');
    console.log('\n===============================================================');
    console.log('SUCCESS: Custom Leave Entitlements & Policies Applied for 2569!');
    console.log('Annual Leave Tiers Breakdown:', countTiers);
    console.log('Probation (< 119 vs >= 119 days):', countProbation);
    console.log('===============================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error applying leave rules:', err);
  } finally {
    await client.end();
  }
}

main();
