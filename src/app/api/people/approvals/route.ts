import { NextResponse } from 'next/server';
import { queryPeople, withTransaction } from '@/lib/peopleDb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const approverId = searchParams.get('approver_id');
    const role = searchParams.get('role') || 'Supervisor';
    const status = searchParams.get('status') || 'PENDING';

    let query = `
      SELECT 
        ar.id as approval_request_id,
        ar.request_type,
        ar.reference_id,
        ar.step_number,
        ar.assigned_role,
        ar.status as approval_status,
        ar.created_at as assigned_at,
        lr.id as leave_request_id,
        lr.request_number,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.duration_type,
        lr.reason,
        lr.is_emergency,
        lr.attachment_url,
        lr.status as leave_status,
        lt.name_th as leave_type_name,
        lt.color_code as leave_color,
        e.id as employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.nickname,
        e.department_id,
        d.department_name,
        w.work_area_name,
        w.id as work_area_id,
        pos.position_name,
        lb.available as balance_available,
        lb.entitled as balance_entitled,
        lb.taken as balance_taken
      FROM approval_requests ar
      JOIN leave_requests lr ON ar.reference_id = lr.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_areas w ON e.work_area_id = w.id
      LEFT JOIN positions pos ON e.position_id = pos.id
      LEFT JOIN leave_balances lb ON lb.employee_id = e.id AND lb.leave_type_id = lr.leave_type_id AND lb.year = 2026
      WHERE 1=1
    `;

    const params: any[] = [];
    let idx = 1;

    if (status && status !== 'ALL') {
      query += ` AND ar.status = $${idx}`;
      params.push(status);
      idx++;
    }

    // Role-based filtering:
    // If specific approverId provided:
    if (approverId) {
      query += ` AND (ar.assigned_approver_id = $${idx} OR (ar.assigned_approver_id IS NULL AND ar.assigned_role = $${idx + 1}))`;
      params.push(approverId, role.toUpperCase());
      idx += 2;
    }

    query += ` ORDER BY ar.created_at DESC LIMIT 50`;

    const { rows } = await queryPeople(query, params);

    // Enrich each item with Team Headcount Impact context
    // E.g. scheduled today in same department/work area, currently on leave
    const enriched = await Promise.all(rows.map(async (row) => {
      let teamScheduled = 10;
      let teamOnLeave = 1;

      if (row.department_id) {
        const teamStats = await queryPeople(`
          SELECT 
            COUNT(*) as total_team,
            COUNT(CASE WHEN employment_status = 'Permanent' THEN 1 END) as active_team
          FROM employees 
          WHERE department_id = $1 AND deleted_at IS NULL;
        `, [row.department_id]);
        teamScheduled = parseInt(teamStats.rows[0]?.total_team || '10');

        // Check who is on leave on start_date
        const leaveStats = await queryPeople(`
          SELECT COUNT(*) as on_leave 
          FROM leave_requests lr
          JOIN employees e ON lr.employee_id = e.id
          WHERE e.department_id = $1 
            AND lr.status = 'APPROVED'
            AND lr.start_date <= $2 AND lr.end_date >= $2;
        `, [row.department_id, row.start_date]);
        teamOnLeave = parseInt(leaveStats.rows[0]?.on_leave || '0');
      }

      const availableAfter = Math.max(0, teamScheduled - teamOnLeave - 1);
      const balanceBefore = parseFloat(row.balance_available || '0');
      const balanceAfter = Math.max(0, balanceBefore - parseFloat(row.total_days || '1'));

      return {
        ...row,
        manpowerImpact: {
          teamScheduled,
          teamOnLeave,
          availableAfterApproval: availableAfter,
          minimumRequired: Math.ceil(teamScheduled * 0.7) // future threshold
        },
        balanceBefore,
        balanceAfter
      };
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      approval_request_id,
      action, // 'APPROVE' or 'REJECT'
      comment,
      actor_id, // current logged-in employee/user id
      actor_role = 'Supervisor'
    } = body;

    if (!approval_request_id || !action) {
      return NextResponse.json({
        success: false,
        error: 'กรุณาระบุ Approval Request ID และ Action'
      }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      // 1. Fetch current approval request
      const arRes = await client.query(`
        SELECT ar.*, lr.id as leave_id, lr.employee_id, lr.leave_type_id, lr.total_days, lr.status as leave_status, lr.start_date, lr.end_date, lr.request_number,
               e.first_name, e.last_name, e.manager_id, lt.name_th as leave_type_name
        FROM approval_requests ar
        JOIN leave_requests lr ON ar.reference_id = lr.id
        JOIN employees e ON lr.employee_id = e.id
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE ar.id = $1;
      `, [approval_request_id]);

      if (arRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลคำขออนุมัตินี้');
      }
      const ar = arRes.rows[0];

      if (ar.status !== 'PENDING') {
        throw new Error(`คำขอนี้ได้รับการประมวลผลไปแล้ว (สถานะปัจจุบัน: ${ar.status})`);
      }

      const totalDays = parseFloat(ar.total_days);

      if (action === 'REJECT') {
        if (!comment) {
          throw new Error('กรุณาระบุเหตุผลการไม่อนุมัติคำขอ');
        }

        // Update approval_requests
        await client.query(`
          UPDATE approval_requests 
          SET status = 'REJECTED', action_taken_at = NOW(), action_taken_by = $1, comments = $2, updated_at = NOW()
          WHERE id = $3;
        `, [actor_id || null, comment, approval_request_id]);

        // Restore leave_balance: pending -, available +
        await client.query(`
          UPDATE leave_balances 
          SET pending = GREATEST(0, pending - $1), available = available + $1, updated_at = NOW()
          WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
        `, [totalDays, ar.employee_id, ar.leave_type_id]);

        // Update leave_requests
        await client.query(`
          UPDATE leave_requests 
          SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW()
          WHERE id = $2;
        `, [comment, ar.leave_id]);

        // Append to approval_logs
        await client.query(`
          INSERT INTO approval_logs (
            request_type, reference_id, step_number, actor_id, action, previous_status, new_status, comment
          ) VALUES ('LEAVE', $1, $2, $3, 'REJECTED', $4, 'REJECTED', $5);
        `, [ar.leave_id, ar.step_number, actor_id || null, ar.leave_status, comment]);

        // Notify employee
        await client.query(`
          INSERT INTO notifications (recipient_id, title, message, notification_type, link_url)
          VALUES ($1, 'คำขอลาถูกปฏิเสธ (' || $2 || ')', 'คำขอลา ' || $3 || ' ได้รับการปฏิเสธ: ' || $4, 'LEAVE_REJECTED', '/people/leave');
        `, [ar.employee_id, ar.request_number, ar.leave_type_name, comment]);

        return { status: 'REJECTED', message: 'ปฏิเสธคำขอลาเรียบร้อยแล้ว' };

      } else if (action === 'APPROVE') {
        // Multi-step check:
        // If step 1 and totalDays > 2 days -> route to Manager (Step 2)
        // Unless already Manager or HR
        const needsManagerApproval = ar.step_number === 1 && totalDays > 2.0 && actor_role === 'Supervisor';

        if (needsManagerApproval) {
          // Complete step 1
          await client.query(`
            UPDATE approval_requests 
            SET status = 'APPROVED', action_taken_at = NOW(), action_taken_by = $1, comments = $2, updated_at = NOW()
            WHERE id = $3;
          `, [actor_id || null, comment || 'หัวหน้างานอนุมัติ ส่งต่อผู้จัดการ', approval_request_id]);

          // Update leave request to PENDING_MANAGER
          await client.query(`
            UPDATE leave_requests 
            SET status = 'PENDING_MANAGER', current_step = 2, updated_at = NOW()
            WHERE id = $1;
          `, [ar.leave_id]);

          // Find manager id
          let nextApproverId = ar.manager_id;
          if (!nextApproverId) {
            const m = await client.query(`SELECT id FROM employees WHERE system_role = 'Manager' LIMIT 1`);
            nextApproverId = m.rows[0]?.id || null;
          }

          // Create step 2 approval request
          await client.query(`
            INSERT INTO approval_requests (
              request_type, reference_id, step_number, assigned_approver_id, assigned_role, status
            ) VALUES ('LEAVE', $1, 2, $2, 'MANAGER', 'PENDING');
          `, [ar.leave_id, nextApproverId]);

          // Append approval_logs
          await client.query(`
            INSERT INTO approval_logs (
              request_type, reference_id, step_number, actor_id, action, previous_status, new_status, comment
            ) VALUES ('LEAVE', $1, 1, $2, 'APPROVED', $3, 'PENDING_MANAGER', $4);
          `, [ar.leave_id, actor_id || null, ar.leave_status, comment || 'หัวหน้างานอนุมัติแล้ว']);

          // Notify Manager
          if (nextApproverId) {
            await client.query(`
              INSERT INTO notifications (recipient_id, title, message, notification_type, link_url)
              VALUES ($1, 'มีคำขอลาเกิน 2 วัน รอการอนุมัติระดับผู้จัดการ', 'คำขอลา ' || $2 || ' (' || $3 || ' วัน) รอการพิจารณา', 'APPROVAL_NEEDED', '/people/approvals');
            `, [nextApproverId, ar.request_number, totalDays]);
          }

          return { status: 'PENDING_MANAGER', message: 'อนุมัติระดับหัวหน้างานเรียบร้อยแล้ว ส่งต่อไปยังผู้จัดการฝ่าย' };

        } else {
          // Final Approval!
          await client.query(`
            UPDATE approval_requests 
            SET status = 'APPROVED', action_taken_at = NOW(), action_taken_by = $1, comments = $2, updated_at = NOW()
            WHERE id = $3;
          `, [actor_id || null, comment || 'อนุมัติคำขอเรียบร้อยแล้ว', approval_request_id]);

          // Deduct balance: pending -, taken +
          await client.query(`
            UPDATE leave_balances 
            SET pending = GREATEST(0, pending - $1), taken = taken + $1, updated_at = NOW()
            WHERE employee_id = $2 AND leave_type_id = $3 AND year = 2026;
          `, [totalDays, ar.employee_id, ar.leave_type_id]);

          // Record in leave_transactions ledger!
          await client.query(`
            INSERT INTO leave_transactions (
              employee_id, leave_type_id, transaction_type, amount, balance_before, balance_after, reference_id, reason, created_by
            ) VALUES (
              $1, $2, 'USAGE', $3 * -1, 0, 0, $4, 'อนุมัติคำขอลา ' || $5 || ' วันที่ ' || $6 || ' ถึง ' || $7, $8
            );
          `, [
            ar.employee_id, ar.leave_type_id, totalDays, ar.leave_id,
            ar.leave_type_name, ar.start_date, ar.end_date, actor_id || null
          ]);

          // Mark leave request as APPROVED
          await client.query(`
            UPDATE leave_requests 
            SET status = 'APPROVED', approved_at = NOW(), approved_by = $1, updated_at = NOW()
            WHERE id = $2;
          `, [actor_id || null, ar.leave_id]);

          // Append to approval_logs
          await client.query(`
            INSERT INTO approval_logs (
              request_type, reference_id, step_number, actor_id, action, previous_status, new_status, comment
            ) VALUES ('LEAVE', $1, $2, $3, 'APPROVED', $4, 'APPROVED', $5);
          `, [ar.leave_id, ar.step_number, actor_id || null, ar.leave_status, comment || 'อนุมัติสมบูรณ์']);

          // Notify employee
          await client.query(`
            INSERT INTO notifications (recipient_id, title, message, notification_type, link_url)
            VALUES ($1, 'คำขอลาได้รับการอนุมัติแล้ว (' || $2 || ')', 'คำขอลา ' || $3 || ' วันที่ ' || $4 || ' ได้รับการอนุมัติแล้ว', 'LEAVE_APPROVED', '/people/leave');
          `, [ar.employee_id, ar.request_number, ar.leave_type_name, ar.start_date]);

          return { status: 'APPROVED', message: 'อนุมัติคำขอลาเรียบร้อยแล้ว ยอดสิทธิ์ได้รับการปรับปรุงลง Ledger ทันที' };
        }
      }
    });

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error('Error processing approval:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
