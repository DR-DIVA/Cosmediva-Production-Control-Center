import { NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'HR';
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date') || '2026-09-05';

    // 1. GLOBAL / HR KPI STATS (Calculated dynamically from Database)
    const kpiRes = await queryPeople(`
      SELECT 
        COUNT(DISTINCT e.id) as total_headcount,
        COUNT(DISTINCT CASE WHEN e.employment_status = 'Permanent' OR e.employment_status = 'Active' THEN e.id END) as active_headcount,
        COUNT(DISTINCT CASE WHEN ad.attendance_status IN ('Present', 'Late') THEN e.id END) as present_today,
        COUNT(DISTINCT CASE WHEN ad.attendance_status = 'Late' THEN e.id END) as late_today,
        COUNT(DISTINCT CASE WHEN ad.attendance_status = 'Leave' THEN e.id END) as leave_today,
        COUNT(DISTINCT CASE WHEN ad.attendance_status = 'Absent' THEN e.id END) as absent_today,
        COUNT(DISTINCT CASE WHEN ad.attendance_status IN ('Missing Clock In', 'Missing Clock Out', 'Missing Punch') THEN e.id END) as missing_punch_today
      FROM employees e
      LEFT JOIN attendance_daily ad ON e.id = ad.employee_id AND ad.work_date = $1
      WHERE e.deleted_at IS NULL;
    `, [date]);

    const kpi = kpiRes.rows[0];
    const totalScheduled = parseInt(kpi.total_headcount || '0');
    const presentToday = parseInt(kpi.present_today || '0');
    const attendancePct = totalScheduled > 0 ? ((presentToday / totalScheduled) * 100).toFixed(1) : '0';

    // Pending approvals count
    const pendingApprovalsRes = await queryPeople(`
      SELECT COUNT(*) as pending_count 
      FROM approval_requests 
      WHERE status = 'PENDING';
    `);
    const pendingApprovalsCount = parseInt(pendingApprovalsRes.rows[0]?.pending_count || '0');

    // Unresolved exceptions count
    const exceptionsRes = await queryPeople(`
      SELECT COUNT(*) as exc_count 
      FROM attendance_exceptions 
      WHERE work_date = $1 AND is_resolved = FALSE;
    `, [date]);
    const unresolvedExceptionsCount = parseInt(exceptionsRes.rows[0]?.exc_count || '0');

    // 2. DEPARTMENT ATTENDANCE TABLE
    const deptRes = await queryPeople(`
      SELECT 
        d.id,
        d.department_code,
        d.department_name,
        COUNT(e.id) as scheduled,
        COUNT(CASE WHEN ad.attendance_status IN ('Present', 'Late') THEN 1 END) as present,
        COUNT(CASE WHEN ad.attendance_status = 'Leave' THEN 1 END) as on_leave,
        COUNT(CASE WHEN ad.attendance_status = 'Absent' THEN 1 END) as absent,
        COUNT(CASE WHEN ad.attendance_status = 'Late' THEN 1 END) as late,
        ROUND((COUNT(CASE WHEN ad.attendance_status IN ('Present', 'Late') THEN 1 END)::numeric / GREATEST(1, COUNT(e.id))::numeric) * 100, 1) as attendance_rate
      FROM departments d
      JOIN employees e ON d.id = e.department_id AND e.deleted_at IS NULL
      LEFT JOIN attendance_daily ad ON e.id = ad.employee_id AND ad.work_date = $1
      WHERE d.is_active = TRUE
      GROUP BY d.id, d.department_code, d.department_name
      ORDER BY d.department_name;
    `, [date]);

    // 3. FACTORY READINESS WIDGET (Mixing, Filling, Packing, QC, Warehouse)
    const workAreaRes = await queryPeople(`
      SELECT 
        w.id,
        w.work_area_code,
        w.work_area_name,
        w.area_type,
        w.critical_skill_needed,
        COUNT(e.id) as scheduled,
        COUNT(CASE WHEN ad.attendance_status IN ('Present', 'Late') THEN 1 END) as present,
        COUNT(CASE WHEN ad.attendance_status = 'Leave' THEN 1 END) as on_leave,
        COUNT(CASE WHEN ad.attendance_status = 'Absent' THEN 1 END) as absent
      FROM work_areas w
      LEFT JOIN employees e ON w.id = e.work_area_id AND e.deleted_at IS NULL
      LEFT JOIN attendance_daily ad ON e.id = ad.employee_id AND ad.work_date = $1
      WHERE w.is_active = TRUE
      GROUP BY w.id, w.work_area_code, w.work_area_name, w.area_type, w.critical_skill_needed
      ORDER BY w.work_area_name;
    `, [date]);

    const factoryReadiness = workAreaRes.rows.map(wa => {
      const scheduled = parseInt(wa.scheduled || '0');
      const present = parseInt(wa.present || '0');
      const rate = scheduled > 0 ? (present / scheduled) * 100 : 100;
      let status = 'READY';
      if (rate < 75) status = 'CRITICAL';
      else if (rate < 90 || parseInt(wa.absent || '0') > 0) status = 'WATCH';

      return {
        ...wa,
        scheduled,
        present,
        on_leave: parseInt(wa.on_leave || '0'),
        absent: parseInt(wa.absent || '0'),
        attendance_rate: rate.toFixed(1),
        readiness_status: status
      };
    });

    // 4. DAILY HR ALERTS
    const alerts: Array<{ id: string; type: 'DANGER' | 'WARNING' | 'INFO'; message: string; actionUrl: string }> = [];
    const absentCount = parseInt(kpi.absent_today || '0');
    if (absentCount > 0) {
      alerts.push({
        id: 'alt-absent',
        type: 'DANGER',
        message: `พบพนักงานขาดงานโดยไม่มีใบลาล่วงหน้า ${absentCount} คน ต้องการการตรวจสอบเร่งด่วน`,
        actionUrl: '/people/attendance?tab=exceptions&type=ABSENT'
      });
    }

    const missingCount = parseInt(kpi.missing_punch_today || '0');
    if (missingCount > 0) {
      alerts.push({
        id: 'alt-missing',
        type: 'WARNING',
        message: `พนักงานลืมสแกนเวลาเข้า/เลิกงาน ${missingCount} รายการ รอการส่งใบรับรองเวลา`,
        actionUrl: '/people/attendance?tab=exceptions'
      });
    }

    if (pendingApprovalsCount > 0) {
      alerts.push({
        id: 'alt-approval',
        type: 'INFO',
        message: `มีคำขอลาที่รอการอนุมัติค้างในระบบ ${pendingApprovalsCount} รายการ`,
        actionUrl: '/people/approvals'
      });
    }

    const lateCount = parseInt(kpi.late_today || '0');
    if (lateCount > 0) {
      alerts.push({
        id: 'alt-late',
        type: 'WARNING',
        message: `มีพนักงานเข้างานสายเกินเกณฑ์ Grace Period (15 นาที) จำนวน ${lateCount} คน`,
        actionUrl: '/people/attendance?status=Late'
      });
    }

    // 5. EMPLOYEE SPECIFIC DATA (for Employee Mobile Home)
    let employeeData = null;
    if (employeeId) {
      const empRes = await queryPeople(`
        SELECT 
          e.*,
          d.department_name,
          w.work_area_name,
          p.position_name,
          s.first_name as supervisor_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN work_areas w ON e.work_area_id = w.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN employees s ON e.supervisor_id = s.id
        WHERE e.id = $1;
      `, [employeeId]);

      if (empRes.rows.length > 0) {
        const emp = empRes.rows[0];

        // Today clock status
        const todayAtt = await queryPeople(`
          SELECT * FROM attendance_daily WHERE employee_id = $1 AND work_date = $2;
        `, [employeeId, date]);

        // Balances
        const balances = await queryPeople(`
          SELECT lb.*, lt.name_th, lt.color_code, lt.type_code 
          FROM leave_balances lb
          JOIN leave_types lt ON lb.leave_type_id = lt.id
          WHERE lb.employee_id = $1 AND lb.year = 2026;
        `, [employeeId]);

        // Pending & Upcoming leaves
        const upcomingLeaves = await queryPeople(`
          SELECT lr.*, lt.name_th, lt.color_code 
          FROM leave_requests lr
          JOIN leave_types lt ON lr.leave_type_id = lt.id
          WHERE lr.employee_id = $1 AND lr.start_date >= $2
          ORDER BY lr.start_date ASC LIMIT 5;
        `, [employeeId, date]);

        // Next Holiday
        const nextHoliday = await queryPeople(`
          SELECT * FROM holidays WHERE holiday_date >= $1 AND is_active = TRUE ORDER BY holiday_date ASC LIMIT 1;
        `, [date]);

        employeeData = {
          profile: emp,
          todayAttendance: todayAtt.rows[0] || null,
          balances: balances.rows,
          upcomingLeaves: upcomingLeaves.rows,
          nextHoliday: nextHoliday.rows[0] || null
        };
      }
    }

    // 6. SUPERVISOR SPECIFIC DATA (Team Today)
    let supervisorData = null;
    if (role === 'Supervisor' || role === 'Manager') {
      const teamEmps = await queryPeople(`
        SELECT 
          e.id, e.employee_code, e.first_name, e.last_name, e.nickname,
          pos.position_name, w.work_area_name,
          ad.actual_in, ad.actual_out, ad.late_minutes, ad.attendance_status
        FROM employees e
        LEFT JOIN positions pos ON e.position_id = pos.id
        LEFT JOIN work_areas w ON e.work_area_id = w.id
        LEFT JOIN attendance_daily ad ON e.id = ad.employee_id AND ad.work_date = $1
        WHERE (e.supervisor_id = $2 OR e.department_id = (SELECT department_id FROM employees WHERE id = $2))
          AND e.deleted_at IS NULL
        ORDER BY e.employee_code ASC;
      `, [date, employeeId || '00000000-0000-0000-0000-000000000000']);

      const teamList = teamEmps.rows;
      const teamScheduled = teamList.length;
      const teamPresent = teamList.filter(t => t.attendance_status === 'Present' || t.attendance_status === 'Late').length;
      const teamLate = teamList.filter(t => t.attendance_status === 'Late').length;
      const teamLeave = teamList.filter(t => t.attendance_status === 'Leave').length;
      const teamAbsent = teamList.filter(t => t.attendance_status === 'Absent').length;

      supervisorData = {
        teamScheduled,
        teamPresent,
        teamLate,
        teamLeave,
        teamAbsent,
        teamAttendanceRate: teamScheduled > 0 ? ((teamPresent / teamScheduled) * 100).toFixed(1) : '0',
        members: teamList
      };
    }

    return NextResponse.json({
      success: true,
      kpi: {
        totalHeadcount: totalScheduled,
        activeHeadcount: parseInt(kpi.active_headcount || '0'),
        presentToday,
        attendanceRate: attendancePct,
        leaveToday: parseInt(kpi.leave_today || '0'),
        absentToday: parseInt(kpi.absent_today || '0'),
        lateToday: parseInt(kpi.late_today || '0'),
        missingPunchToday: parseInt(kpi.missing_punch_today || '0'),
        pendingApprovalsCount,
        unresolvedExceptionsCount
      },
      departments: deptRes.rows,
      factoryReadiness,
      alerts,
      employeeData,
      supervisorData
    });

  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
