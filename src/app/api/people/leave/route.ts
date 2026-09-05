import { NextResponse } from 'next/server';
import { queryPeople, withTransaction } from '@/lib/peopleDb';
import { emitDomainEvent } from '@/lib/events/domainEvents';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const departmentId = searchParams.get('department_id');
    const status = searchParams.get('status');
    const year = parseInt(searchParams.get('year') || '2026');
    const view = searchParams.get('view') || 'requests'; // requests, balances, calendar, ledger, policies

    if (view === 'balances' && employeeId) {
      const { rows } = await queryPeople(`
        SELECT 
          lb.*,
          lt.type_code,
          lt.name_th,
          lt.name_en,
          lt.color_code,
          lt.is_paid,
          lp.annual_entitlement as policy_entitlement,
          lp.minimum_notice_days,
          lp.attachment_required,
          lp.attachment_required_after_days
        FROM leave_balances lb
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        LEFT JOIN leave_policies lp ON lp.leave_type_id = lt.id AND lp.is_active = TRUE
        WHERE lb.employee_id = $1 AND lb.year = $2 AND lt.is_active = TRUE
        ORDER BY lt.sort_order ASC, lt.name_th ASC;
      `, [employeeId, year]);

      // Shared Sick Quota Calculation (SICK_H + SICK_N share 30 days pool)
      const sickRows = rows.filter((r: any) => r.type_code === 'SICK_H' || r.type_code === 'SICK_N');
      const totalSickTaken = sickRows.reduce((sum: number, r: any) => sum + parseFloat(r.taken || '0'), 0);
      const totalSickPending = sickRows.reduce((sum: number, r: any) => sum + parseFloat(r.pending || '0'), 0);
      const sharedSickAvailable = Math.max(0, 30.0 - totalSickTaken - totalSickPending);

      const enrichedRows = rows.map((r: any) => {
        if (r.type_code === 'SICK_H' || r.type_code === 'SICK_N') {
          return {
            ...r,
            available: sharedSickAvailable.toFixed(2),
            is_shared_quota: true,
            shared_quota_group: 'SICK',
            shared_quota_total_entitled: '30.00',
            shared_quota_total_taken: totalSickTaken.toFixed(2),
            shared_quota_total_pending: totalSickPending.toFixed(2),
            shared_quota_note: 'สิทธิ์ลาป่วยมีใบแพทย์และไม่มีใบแพทย์ใช้โควตารวมกัน 30 วัน/ปี'
          };
        }
        return r;
      });

      return NextResponse.json({ success: true, data: enrichedRows });
    }

    if (view === 'ledger' && employeeId) {
      const { rows } = await queryPeople(`
        SELECT 
          ltx.*,
          lt.type_code,
          lt.name_th,
          lt.color_code
        FROM leave_transactions ltx
        JOIN leave_types lt ON ltx.leave_type_id = lt.id
        WHERE ltx.employee_id = $1
        ORDER BY ltx.created_at DESC;
      `, [employeeId]);
      return NextResponse.json({ success: true, data: rows });
    }

    if (view === 'policies') {
      const { rows } = await queryPeople(`
        SELECT 
          lp.*,
          lt.type_code,
          lt.name_th,
          lt.name_en,
          lt.color_code,
          lt.is_paid
        FROM leave_policies lp
        JOIN leave_types lt ON lp.leave_type_id = lt.id
        WHERE lt.is_active = TRUE
        ORDER BY lt.sort_order ASC, lt.name_th ASC;
      `);
      return NextResponse.json({ success: true, data: rows });
    }

    if (view === 'calendar') {
      const holidays = await queryPeople(`
        SELECT 
          id, holiday_name as title, holiday_date as date, 
          'HOLIDAY' as type, '#EF4444' as color
        FROM holidays 
        WHERE is_active = TRUE AND EXTRACT(YEAR FROM holiday_date) = $1
      `, [year]);

      let leaveQuery = `
        SELECT 
          lr.id,
          lr.request_number,
          lr.start_date,
          lr.end_date,
          lr.total_days,
          lr.status,
          lt.name_th as leave_type_name,
          lt.color_code,
          e.first_name,
          e.last_name,
          e.employee_code,
          d.department_name
        FROM leave_requests lr
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        JOIN employees e ON lr.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE lr.status IN ('APPROVED', 'PENDING_SUPERVISOR', 'PENDING_MANAGER')
      `;
      const params: any[] = [];
      let idx = 1;

      if (employeeId) {
        leaveQuery += ` AND lr.employee_id = $${idx}`;
        params.push(employeeId);
        idx++;
      } else if (departmentId) {
        leaveQuery += ` AND e.department_id = $${idx}`;
        params.push(departmentId);
        idx++;
      }

      leaveQuery += ` ORDER BY lr.start_date ASC`;

      const leaveRes = await queryPeople(leaveQuery, params);

      return NextResponse.json({
        success: true,
        holidays: holidays.rows,
        leaves: leaveRes.rows
      });
    }

    // Default: List requests
    let query = `
      SELECT 
        lr.*,
        lt.type_code,
        lt.name_th as leave_type_name,
        lt.name_en as leave_type_name_en,
        lt.color_code,
        e.first_name,
        e.last_name,
        e.employee_code,
        e.system_role,
        d.department_name,
        w.work_area_name,
        s.first_name as approver_first_name,
        s.last_name as approver_last_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_areas w ON e.work_area_id = w.id
      LEFT JOIN employees s ON lr.approved_by = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (employeeId) {
      query += ` AND lr.employee_id = $${idx}`;
      params.push(employeeId);
      idx++;
    }

    if (departmentId) {
      query += ` AND e.department_id = $${idx}`;
      params.push(departmentId);
      idx++;
    }

    if (status && status !== 'ALL') {
      query += ` AND lr.status = $${idx}`;
      params.push(status);
      idx++;
    }

    query += ` ORDER BY lr.created_at DESC LIMIT 100`;

    const { rows } = await queryPeople(query, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching leave:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      duration_type = 'FULL_DAY',
      start_time,
      end_time,
      reason,
      contact_during_leave,
      is_emergency = false,
      attachment_url,
      approver_id,
      validate_only = false
    } = body;

    if (!employee_id || !leave_type_id || !start_date || !end_date || !reason) {
      return NextResponse.json({
        success: false,
        error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (พนักงาน, ประเภทการลา, วันที่เริ่ม-สิ้นสุด, เหตุผล)'
      }, { status: 400 });
    }

    // 1. Fetch Employee info
    const empRes = await queryPeople(`
      SELECT e.*, d.department_name, s.id as supervisor_id, m.id as manager_id 
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees s ON e.supervisor_id = s.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = $1 AND e.deleted_at IS NULL;
    `, [employee_id]);

    if (empRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลพนักงานในระบบ หรือสถานะถูกระงับ' }, { status: 404 });
    }
    const employee = empRes.rows[0];

    // 2. Fetch Leave Policy for this leave type
    const policyRes = await queryPeople(`
      SELECT lp.*, lt.name_th, lt.type_code 
      FROM leave_policies lp
      JOIN leave_types lt ON lp.leave_type_id = lt.id
      WHERE lp.leave_type_id = $1 AND lp.is_active = TRUE;
    `, [leave_type_id]);

    if (policyRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบนโยบายวันลาสำหรับประเภทการลานี้' }, { status: 400 });
    }
    const policy = policyRes.rows[0];

    // 3. Calculate requested days (excluding Sunday/Holiday based on policy)
    const dStart = new Date(start_date);
    const dEnd = new Date(end_date);
    if (dEnd < dStart) {
      return NextResponse.json({ success: false, error: 'วันที่สิ้นสุดต้องไม่เกิดขึ้นก่อนวันที่เริ่มต้น' }, { status: 400 });
    }

    // Check holiday dates
    const holidays = await queryPeople(`
      SELECT holiday_date FROM holidays 
      WHERE is_active = TRUE AND holiday_date BETWEEN $1 AND $2;
    `, [start_date, end_date]);
    const holidaySet = new Set(holidays.rows.map(h => new Date(h.holiday_date).toISOString().split('T')[0]));

    let calculatedDays = 0;
    const cur = new Date(dStart);
    while (cur <= dEnd) {
      const dateStr = cur.toISOString().split('T')[0];
      const dayOfWeek = cur.getDay(); // 0 = Sun
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidaySet.has(dateStr);

      if (!isSunday && !isHoliday) {
        if (duration_type === 'FULL_DAY') calculatedDays += 1;
        else calculatedDays += 0.5;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (calculatedDays <= 0) {
      return NextResponse.json({
        success: false,
        error: 'ช่วงวันที่เลือกตรงกับวันหยุดทั้งหมด ไม่จำเป็นต้องยื่นใบลา'
      }, { status: 400 });
    }

    // Minimum Notice Days
    if (!is_emergency && policy.minimum_notice_days > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = dStart.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < policy.minimum_notice_days) {
        return NextResponse.json({
          success: false,
          error: `นโยบายกำหนดให้ยื่นคำขอลาประเภทนี้ล่วงหน้าอย่างน้อย ${policy.minimum_notice_days} วัน (วันที่ขอล่วงหน้า: ${diffDays} วัน)`
        }, { status: 400 });
      }
    }

    // Consecutive Days limit
    if (calculatedDays > policy.max_consecutive_days) {
      return NextResponse.json({
        success: false,
        error: `จำนวนวันลาติดต่อกันเกินกำหนดสูงสุดตามนโยบาย (${policy.max_consecutive_days} วัน)`
      }, { status: 400 });
    }

    // Attachment requirement check
    if (policy.attachment_required && calculatedDays >= policy.attachment_required_after_days && !attachment_url) {
      return NextResponse.json({
        success: false,
        error: `การลาป่วยเกิน ${policy.attachment_required_after_days} วัน ต้องแนบใบรับรองแพทย์หรือเอกสารประกอบ`
      }, { status: 400 });
    }

    if (validate_only) {
      const isSick = policy.type_code === 'SICK_H' || policy.type_code === 'SICK_N';
      let avail = 0;

      if (isSick) {
        const sickBalCheck = await queryPeople(`
          SELECT lb.*, lt.type_code 
          FROM leave_balances lb
          JOIN leave_types lt ON lb.leave_type_id = lt.id
          WHERE lb.employee_id = $1 AND lt.type_code IN ('SICK_H', 'SICK_N') AND lb.year = 2026;
        `, [employee_id]);
        const totalTaken = sickBalCheck.rows.reduce((sum: number, r: any) => sum + parseFloat(r.taken || '0'), 0);
        const totalPending = sickBalCheck.rows.reduce((sum: number, r: any) => sum + parseFloat(r.pending || '0'), 0);
        avail = Math.max(0, 30.0 - totalTaken - totalPending);
      } else {
        const balCheck = await queryPeople(`
          SELECT available FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = 2026;
        `, [employee_id, leave_type_id]);
        avail = parseFloat(balCheck.rows[0]?.available || '0');
      }

      const isValid = policy.paid_unpaid !== 'PAID' || policy.allow_negative_balance || calculatedDays <= avail;

      return NextResponse.json({
        success: true,
        valid: isValid,
        calculatedDays,
        availableBefore: avail,
        availableAfter: avail - calculatedDays,
        is_shared_quota: isSick,
        error: !isValid ? `วันลาคงเหลือไม่เพียงพอ (โควตารวมคงเหลือ: ${avail} วัน, ต้องการลา: ${calculatedDays} วัน)` : null
      });
    }

    // 4. Submit Transaction with Pessimistic Row Lock & Overlap Check inside Transaction
    const requestNumber = `LR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await withTransaction(async (client) => {
      // Lock employee record to serialize concurrent leave submissions
      await client.query(`SELECT id FROM employees WHERE id = $1 FOR UPDATE;`, [employee_id]);

      // A) Overlap check inside transaction with row locks
      const overlapRes = await client.query(`
        SELECT id, request_number, start_date, end_date, status 
        FROM leave_requests 
        WHERE employee_id = $1 
          AND status IN ('SUBMITTED', 'PENDING_SUPERVISOR', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED')
          AND NOT (end_date < $2 OR start_date > $3);
      `, [employee_id, start_date, end_date]);

      if (overlapRes.rows.length > 0) {
        const ov = overlapRes.rows[0];
        throw new Error(`วันที่ขอลาซ้ำซ้อนกับคำขอเดิม (${ov.request_number}: ${new Date(ov.start_date).toLocaleDateString('th-TH')} - ${new Date(ov.end_date).toLocaleDateString('th-TH')})`);
      }

      // B) Lock and verify leave balance inside transaction
      const isSickLeave = policy.type_code === 'SICK_H' || policy.type_code === 'SICK_N';
      let balance: any = null;
      let availableBefore = 0;

      if (isSickLeave) {
        const sickBals = await client.query(`
          SELECT lb.*, lt.type_code 
          FROM leave_balances lb
          JOIN leave_types lt ON lb.leave_type_id = lt.id
          WHERE lb.employee_id = $1 AND lt.type_code IN ('SICK_H', 'SICK_N') AND lb.year = 2026
          FOR UPDATE;
        `, [employee_id]);

        balance = sickBals.rows.find((r: any) => r.leave_type_id === leave_type_id);
        const totalTaken = sickBals.rows.reduce((sum: number, r: any) => sum + parseFloat(r.taken || '0'), 0);
        const totalPending = sickBals.rows.reduce((sum: number, r: any) => sum + parseFloat(r.pending || '0'), 0);
        availableBefore = Math.max(0, 30.0 - totalTaken - totalPending);

        if (policy.paid_unpaid === 'PAID' && !policy.allow_negative_balance && calculatedDays > availableBefore) {
          throw new Error(`สิทธิ์วันลาป่วยคงเหลือไม่เพียงพอ (โควตารวมลาป่วยมีใบแพทย์และไม่มีใบแพทย์คงเหลือ ${availableBefore} วัน, คำขอ: ${calculatedDays} วัน)`);
        }
      } else {
        const balRes = await client.query(`
          SELECT * FROM leave_balances 
          WHERE employee_id = $1 AND leave_type_id = $2 AND year = 2026
          FOR UPDATE;
        `, [employee_id, leave_type_id]);

        balance = balRes.rows[0];
        availableBefore = balance ? parseFloat(balance.available) : 0;

        if (policy.paid_unpaid === 'PAID' && !policy.allow_negative_balance && calculatedDays > availableBefore) {
          throw new Error(`วันลาคงเหลือไม่เพียงพอ (คงเหลือ: ${availableBefore} วัน, คำขอ: ${calculatedDays} วัน)`);
        }
      }

      // Determine initial approval stage:
      let initialStatus = 'PENDING_SUPERVISOR';
      let approverId: string | null = null;
      let approverRole = 'SUPERVISOR';

      if (approver_id) {
        try {
          const directAppr = await client.query(`
            SELECT id, first_name, last_name, system_role 
            FROM employees 
            WHERE (id::text = $1 OR employee_code = $1) AND deleted_at IS NULL 
            LIMIT 1
          `, [approver_id]);
          if (directAppr.rows.length > 0) {
            approverId = directAppr.rows[0].id;
            approverRole = directAppr.rows[0].system_role === 'HR Manager' ? 'HR_MANAGER' : 'SUPERVISOR';
          }
        } catch (e) {
          // ignore error and fallback
        }
      }

      if (!approverId) {
        approverId = employee.supervisor_id || employee.manager_id;
      }

      if (!approverId) {
        const hrMgr = await client.query(`SELECT id FROM employees WHERE system_role = 'HR Manager' AND deleted_at IS NULL LIMIT 1`);
        approverId = hrMgr.rows[0]?.id || null;
        initialStatus = 'PENDING_HR';
        approverRole = 'HR_MANAGER';
      }

      // Insert leave_requests
      const reqRes = await client.query(`
        INSERT INTO leave_requests (
          request_number, employee_id, leave_type_id, duration_type,
          start_date, end_date, start_time, end_time,
          total_days, reason, contact_during_leave, is_emergency, attachment_url,
          status, current_step
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, 1
        ) RETURNING *;
      `, [
        requestNumber, employee_id, leave_type_id, duration_type,
        start_date, end_date, start_time || null, end_time || null,
        calculatedDays, reason, contact_during_leave || null, is_emergency, attachment_url || null,
        initialStatus
      ]);

      const leaveReq = reqRes.rows[0];

      // Update balance: pending +, available -
      const availableAfter = availableBefore - calculatedDays;
      if (isSickLeave) {
        if (balance) {
          await client.query(`
            UPDATE leave_balances 
            SET pending = pending + $1, updated_at = NOW()
            WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
          `, [calculatedDays, employee_id, leave_type_id]);
        }
        // Synchronize available for both SICK_H and SICK_N
        const newAvail = Math.max(0, availableAfter);
        await client.query(`
          UPDATE leave_balances lb
          SET available = $1, updated_at = NOW()
          FROM leave_types lt
          WHERE lb.leave_type_id = lt.id 
            AND lb.employee_id = $2 
            AND lb.year = 2026 
            AND lt.type_code IN ('SICK_H', 'SICK_N');
        `, [newAvail, employee_id]);
      } else {
        if (balance) {
          await client.query(`
            UPDATE leave_balances 
            SET pending = pending + $1, available = available - $1, updated_at = NOW()
            WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
          `, [calculatedDays, employee_id, leave_type_id]);
        }
      }

      // Create approval_requests record
      if (approverId) {
        await client.query(`
          INSERT INTO approval_requests (
            request_type, reference_id, step_number, assigned_approver_id, assigned_role, status
          ) VALUES ('LEAVE', $1, 1, $2, $3, 'PENDING');
        `, [leaveReq.id, approverId, approverRole]);

        // Create Notification for approver
        await client.query(`
          INSERT INTO notifications (
            recipient_id, title, message, notification_type, link_url
          ) VALUES (
            $1, 
            'มีคำขอลาใหม่รออนุมัติ (' || $2 || ')',
            $3 || ' ยื่นขอลา ' || $4 || ' วันที่ ' || $5 || ' (' || $6 || ' วัน)',
            'APPROVAL_NEEDED',
            '/people/approvals'
          );
        `, [
          approverId,
          requestNumber,
          `${employee.first_name} ${employee.last_name}`,
          policy.name_th,
          start_date,
          calculatedDays
        ]);

        // Create Action Item for approver inbox
        await client.query(`
          INSERT INTO action_items (
            action_type, title, description, priority, assigned_to_user, assigned_to_role, related_entity_type, related_entity_id, status, source
          ) VALUES (
            'LEAVE_APPROVAL',
            $1,
            $2,
            'MEDIUM',
            $3,
            $4,
            'leave_requests',
            $5,
            'PENDING',
            'LEAVE_ENGINE'
          );
        `, [
          `อนุมัติคำขอลา: ${requestNumber} (${employee.first_name} ${employee.last_name})`,
          `${employee.first_name} ยื่นขอลา ${policy.name_th} (${calculatedDays} วัน)`,
          approverId,
          approverRole,
          leaveReq.id
        ]);
      }

      // Append to approval_logs
      await client.query(`
        INSERT INTO approval_logs (
          request_type, reference_id, step_number, actor_id, action, previous_status, new_status, comment
        ) VALUES ('LEAVE', $1, 1, $2, 'SUBMITTED', 'DRAFT', $3, 'ยื่นคำขอลาผ่านระบบ');
      `, [leaveReq.id, employee_id, initialStatus]);

      // Emit domain event
      await emitDomainEvent('leave.requested', 'leave_requests', leaveReq.id, {
        request_number: requestNumber,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days: calculatedDays,
        approver_id: approverId
      });

      return leaveReq;
    });

    return NextResponse.json({
      success: true,
      message: 'ยื่นคำขอลาสำเร็จเรียบร้อยแล้ว',
      data: result
    });

  } catch (error: any) {
    console.error('Error submitting leave:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, reason = 'พนักงานขอยกเลิกคำขอลา' } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Leave Request ID is required' }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      const curReq = await client.query(`SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE`, [id]);
      if (curReq.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลคำขอลา');
      }
      const lr = curReq.rows[0];

      if (lr.status === 'CANCELLED') {
        throw new Error('คำขอนี้ถูกยกเลิกไปก่อนหน้าแล้ว');
      }

      const prevStatus = lr.status;
      const days = parseFloat(lr.total_days);

      // Lock current balance
      const balRes = await client.query(`
        SELECT * FROM leave_balances 
        WHERE employee_id = $1 AND leave_type_id = $2 AND year = 2026
        FOR UPDATE;
      `, [lr.employee_id, lr.leave_type_id]);

      const balance = balRes.rows[0];
      const availableBefore = balance ? parseFloat(balance.available) : 0;
      const availableAfter = availableBefore + days;

      const ltRes = await client.query(`SELECT type_code FROM leave_types WHERE id = $1`, [lr.leave_type_id]);
      const isSick = ltRes.rows[0]?.type_code === 'SICK_H' || ltRes.rows[0]?.type_code === 'SICK_N';

      // Restore balance
      if (prevStatus === 'APPROVED') {
        await client.query(`
          UPDATE leave_balances 
          SET taken = GREATEST(0, taken - $1), updated_at = NOW()
          WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
        `, [days, lr.employee_id, lr.leave_type_id]);

        if (isSick) {
          const sickBals = await client.query(`
            SELECT lb.*, lt.type_code 
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.employee_id = $1 AND lt.type_code IN ('SICK_H', 'SICK_N') AND lb.year = 2026;
          `, [lr.employee_id]);
          const totalTaken = sickBals.rows.reduce((sum: number, r: any) => sum + parseFloat(r.taken || '0'), 0);
          const totalPending = sickBals.rows.reduce((sum: number, r: any) => sum + parseFloat(r.pending || '0'), 0);
          const newAvail = Math.max(0, 30.0 - totalTaken - totalPending);
          await client.query(`
            UPDATE leave_balances lb
            SET available = $1, updated_at = NOW()
            FROM leave_types lt
            WHERE lb.leave_type_id = lt.id 
              AND lb.employee_id = $2 
              AND lb.year = 2026 
              AND lt.type_code IN ('SICK_H', 'SICK_N');
          `, [newAvail, lr.employee_id]);
        } else {
          await client.query(`
            UPDATE leave_balances 
            SET available = available + $1, updated_at = NOW()
            WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
          `, [days, lr.employee_id, lr.leave_type_id]);
        }

        // Ledger record with real balance_before and balance_after
        await client.query(`
          INSERT INTO leave_transactions (
            employee_id, leave_type_id, transaction_type, amount, balance_before, balance_after, reference_id, reason
          ) VALUES ($1, $2, 'CANCEL_RESTORE', $3, $4, $5, $6, 'ยกเลิกคำขอลาที่อนุมัติแล้ว และคืนสิทธิ์วันลา');
        `, [lr.employee_id, lr.leave_type_id, days, availableBefore, availableAfter, lr.id]);

        // Revert attendance_daily for the leave dates
        await client.query(`
          DELETE FROM attendance_daily 
          WHERE employee_id = $1 AND leave_request_id = $2 AND attendance_status = 'Leave';
        `, [lr.employee_id, lr.id]);

      } else if (prevStatus.startsWith('PENDING') || prevStatus === 'SUBMITTED') {
        await client.query(`
          UPDATE leave_balances 
          SET pending = GREATEST(0, pending - $1), updated_at = NOW()
          WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
        `, [days, lr.employee_id, lr.leave_type_id]);

        if (isSick) {
          const sickBals = await client.query(`
            SELECT lb.*, lt.type_code 
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.employee_id = $1 AND lt.type_code IN ('SICK_H', 'SICK_N') AND lb.year = 2026;
          `, [lr.employee_id]);
          const totalTaken = sickBals.rows.reduce((sum: number, r: any) => sum + parseFloat(r.taken || '0'), 0);
          const totalPending = sickBals.rows.reduce((sum: number, r: any) => sum + parseFloat(r.pending || '0'), 0);
          const newAvail = Math.max(0, 30.0 - totalTaken - totalPending);
          await client.query(`
            UPDATE leave_balances lb
            SET available = $1, updated_at = NOW()
            FROM leave_types lt
            WHERE lb.leave_type_id = lt.id 
              AND lb.employee_id = $2 
              AND lb.year = 2026 
              AND lt.type_code IN ('SICK_H', 'SICK_N');
          `, [newAvail, lr.employee_id]);
        } else {
          await client.query(`
            UPDATE leave_balances 
            SET available = available + $1, updated_at = NOW()
            WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
          `, [days, lr.employee_id, lr.leave_type_id]);
        }
      }

      // Update leave request status
      const updated = await client.query(`
        UPDATE leave_requests 
        SET status = 'CANCELLED', cancelled_at = NOW(), rejection_reason = $1, updated_at = NOW()
        WHERE id = $2 RETURNING *;
      `, [reason, id]);

      // Close any pending approval requests
      await client.query(`
        UPDATE approval_requests SET status = 'CANCELLED', action_taken_at = NOW() WHERE reference_id = $1 AND status = 'PENDING';
      `, [id]);

      // Close associated Action Items
      await client.query(`
        UPDATE action_items 
        SET status = 'DISMISSED', completed_at = NOW() 
        WHERE related_entity_type = 'leave_requests' AND related_entity_id = $1 AND status = 'PENDING';
      `, [id]);

      // Append to approval_logs
      await client.query(`
        INSERT INTO approval_logs (
          request_type, reference_id, step_number, actor_id, action, previous_status, new_status, comment
        ) VALUES ('LEAVE', $1, 1, $2, 'CANCELLED', $3, 'CANCELLED', $4);
      `, [id, lr.employee_id, prevStatus, reason]);

      // Emit domain event
      await emitDomainEvent('leave.cancelled', 'leave_requests', id, {
        request_number: lr.request_number,
        employee_id: lr.employee_id,
        total_days: days,
        reason
      });

      return updated.rows[0];
    });

    return NextResponse.json({
      success: true,
      message: 'ยกเลิกคำขอลาและคืนยอดสิทธิ์วันลาเรียบร้อยแล้ว',
      data: result
    });
  } catch (error: any) {
    console.error('Error cancelling leave:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
