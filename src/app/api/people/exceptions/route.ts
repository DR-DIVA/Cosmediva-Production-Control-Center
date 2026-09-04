import { NextResponse } from 'next/server';
import { queryPeople, withTransaction } from '@/lib/peopleDb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2026-09-05';
    const exceptionType = searchParams.get('type');
    const departmentId = searchParams.get('department_id');
    const isResolved = searchParams.get('resolved') === 'true';

    let query = `
      SELECT 
        ae.*,
        ad.actual_in,
        ad.actual_out,
        ad.late_minutes,
        ad.attendance_status,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.nickname,
        e.system_role,
        d.department_name,
        w.work_area_name
      FROM attendance_exceptions ae
      JOIN attendance_daily ad ON ae.attendance_daily_id = ad.id
      JOIN employees e ON ae.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_areas w ON e.work_area_id = w.id
      WHERE ae.work_date = $1 AND ae.is_resolved = $2
    `;
    const params: any[] = [date, isResolved];
    let idx = 3;

    if (exceptionType && exceptionType !== 'ALL') {
      query += ` AND ae.exception_type = $${idx}`;
      params.push(exceptionType);
      idx++;
    }

    if (departmentId) {
      query += ` AND e.department_id = $${idx}`;
      params.push(departmentId);
      idx++;
    }

    query += ` ORDER BY ae.severity DESC, ae.created_at DESC`;

    const { rows } = await queryPeople(query, params);

    // Also get correction requests
    const correctionsRes = await queryPeople(`
      SELECT 
        adj.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        d.department_name
      FROM attendance_adjustments adj
      JOIN employees e ON adj.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE adj.work_date = $1
      ORDER BY adj.created_at DESC;
    `, [date]);

    // Breakdown stats
    const breakdownRes = await queryPeople(`
      SELECT 
        exception_type,
        COUNT(*) as count
      FROM attendance_exceptions
      WHERE work_date = $1 AND is_resolved = FALSE
      GROUP BY exception_type;
    `, [date]);

    const breakdown = {
      LATE: 0,
      ABSENT: 0,
      MISSING_CLOCK_IN: 0,
      MISSING_CLOCK_OUT: 0,
      SHIFT_MISMATCH: 0,
      UNAPPROVED_LEAVE: 0
    };
    for (const b of breakdownRes.rows) {
      if (b.exception_type in breakdown) {
        (breakdown as any)[b.exception_type] = parseInt(b.count);
      }
    }

    return NextResponse.json({
      success: true,
      data: rows,
      corrections: correctionsRes.rows,
      breakdown
    });
  } catch (error: any) {
    console.error('Error fetching exceptions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, employee_id, work_date, requested_in, requested_out, reason, adjustment_type, actor_id, resolution_action } = body;

    // Action 1: Submit Attendance Correction Request (from Employee or Supervisor)
    if (action === 'REQUEST_CORRECTION') {
      if (!employee_id || !work_date || !reason) {
        return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลขอแก้ไขเวลาให้ครบถ้วน' }, { status: 400 });
      }

      const res = await queryPeople(`
        INSERT INTO attendance_adjustments (
          employee_id, work_date, adjustment_type, requested_in, requested_out, reason, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_APPROVAL', $7)
        RETURNING *;
      `, [
        employee_id, work_date, adjustment_type || 'FORGOT_CLOCK',
        requested_in || null, requested_out || null, reason, actor_id || null
      ]);

      return NextResponse.json({ success: true, message: 'ส่งคำขอแก้ไขเวลาลงเวลาเรียบร้อยแล้ว', data: res.rows[0] });
    }

    // Action 2: HR Approves Correction and corrects Daily Attendance record (without touching raw logs!)
    if (action === 'APPROVE_CORRECTION' && id) {
      const result = await withTransaction(async (client) => {
        const adjRes = await client.query(`SELECT * FROM attendance_adjustments WHERE id = $1`, [id]);
        if (adjRes.rows.length === 0) throw new Error('ไม่พบข้อมูลคำขอแก้ไขเวลา');
        const adj = adjRes.rows[0];

        // Update adjustment record
        await client.query(`
          UPDATE attendance_adjustments 
          SET status = 'APPROVED', approved_by = $1, approved_at = NOW(), review_comments = $2
          WHERE id = $3;
        `, [actor_id || null, reason || 'อนุมัติการแก้ไขเวลา', id]);

        // Update attendance_daily record with corrected times
        await client.query(`
          UPDATE attendance_daily 
          SET actual_in = COALESCE($1, actual_in),
              actual_out = COALESCE($2, actual_out),
              attendance_status = 'Present',
              has_exception = FALSE,
              exception_resolved = TRUE,
              updated_at = NOW()
          WHERE employee_id = $3 AND work_date = $4;
        `, [adj.requested_in, adj.requested_out, adj.employee_id, adj.work_date]);

        // Mark any attendance_exceptions as resolved
        await client.query(`
          UPDATE attendance_exceptions 
          SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW(), resolution_action = 'CORRECTION_APPROVED'
          WHERE employee_id = $2 AND work_date = $3;
        `, [actor_id || null, adj.employee_id, adj.work_date]);

        return { success: true, message: 'อนุมัติและปรับปรุงข้อมูลเวลาเข้างานเรียบร้อยแล้ว' };
      });

      return NextResponse.json(result);
    }

    // Action 3: Resolve Exception directly (e.g. Waive late, Accept excuse)
    if (action === 'RESOLVE_EXCEPTION' && id) {
      await queryPeople(`
        UPDATE attendance_exceptions 
        SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW(), resolution_action = $2
        WHERE id = $3;
      `, [actor_id || null, resolution_action || 'WAIVED_BY_HR', id]);

      return NextResponse.json({ success: true, message: 'บันทึกการจัดการข้อยกเว้นเรียบร้อยแล้ว' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling exception action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
