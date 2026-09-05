import { queryPeople, withTransaction } from '@/lib/peopleDb';
import { emitDomainEvent } from '@/lib/events/domainEvents';

export interface AttendanceCalculationResult {
  date: string;
  totalEmployees: number;
  present: number;
  late: number;
  leave: number;
  absent: number;
  missingPunch: number;
  exceptionsGenerated: number;
  actionItemsCreated: number;
}

/**
 * Attendance Calculation Engine
 * Separates core time & attendance business logic from UI and API layers.
 */
export async function calculateDailyAttendance(
  date: string,
  actorId?: string
): Promise<AttendanceCalculationResult> {
  return await withTransaction(async (client) => {
    // 1. Fetch default work schedule (Grace period, default times)
    const schedRes = await client.query(`
      SELECT * FROM work_schedules WHERE is_active = TRUE LIMIT 1;
    `);
    const schedule = schedRes.rows[0] || {
      grace_period_minutes: 15,
      default_start_time: '08:00:00',
      default_end_time: '17:00:00',
      break_minutes: 60
    };
    const gracePeriodMinutes = schedule.grace_period_minutes || 15;
    const defaultStart = schedule.default_start_time || '08:00:00';
    const defaultEnd = schedule.default_end_time || '17:00:00';

    // 2. Check if date is a Company Holiday
    const holidayRes = await client.query(`
      SELECT * FROM holidays WHERE holiday_date = $1 AND is_active = TRUE LIMIT 1;
    `, [date]);
    const isHoliday = holidayRes.rows.length > 0;

    // Check if Sunday (weekly off)
    const workDateObj = new Date(`${date}T00:00:00+07:00`);
    const isSunday = workDateObj.getDay() === 0;

    // 3. Fetch all active employees
    const empRes = await client.query(`
      SELECT id, employee_code, first_name, last_name, department_id, work_area_id, default_shift_id
      FROM employees
      WHERE deleted_at IS NULL AND is_active = TRUE
      ORDER BY employee_code ASC;
    `);
    const employees = empRes.rows;

    // 4. Fetch approved leave requests covering this date
    const leaveRes = await client.query(`
      SELECT lr.id, lr.employee_id, lr.leave_type_id, lt.name_th as leave_type_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.status = 'APPROVED'
        AND lr.start_date <= $1 AND lr.end_date >= $1;
    `, [date]);
    const leaveMap = new Map<string, any>();
    for (const l of leaveRes.rows) {
      leaveMap.set(l.employee_id, l);
    }

    // 5. Fetch all raw punches for this date
    const rawRes = await client.query(`
      SELECT id, employee_code, employee_id, punch_datetime, punch_type
      FROM attendance_raw_logs
      WHERE punch_datetime >= ($1::date) AND punch_datetime < ($1::date + INTERVAL '1 day')
      ORDER BY punch_datetime ASC;
    `, [date]);

    // Group punches by employee code / employee id
    const punchesByEmp = new Map<string, any[]>();
    for (const punch of rawRes.rows) {
      const key = punch.employee_id || punch.employee_code.toUpperCase();
      if (!punchesByEmp.has(key)) {
        punchesByEmp.set(key, []);
      }
      punchesByEmp.get(key)!.push(punch);
    }

    // Metrics counters
    let countPresent = 0;
    let countLate = 0;
    let countLeave = 0;
    let countAbsent = 0;
    let countMissing = 0;
    let exceptionsGenerated = 0;
    let actionItemsCreated = 0;

    // 6. Process each employee
    for (const emp of employees) {
      const empKey = emp.id;
      const empPunches = punchesByEmp.get(empKey) || punchesByEmp.get(emp.employee_code.toUpperCase()) || [];

      let attendanceStatus = 'Present';
      let actualIn: Date | null = null;
      let actualOut: Date | null = null;
      let lateMinutes = 0;
      let latePoints = 0;
      let unpaidLeaveHours = 0;
      let lateRuleCategory = 'ON_TIME';
      let penaltyNotes: string | null = null;
      let normalHours = 8.00;
      let accumPts = 0;
      let earlyLeaveMinutes = 0;
      let workedMinutes = 0;
      let hasException = false;
      const exceptionTypes: string[] = [];
      let leaveRequestId: string | null = null;

      // Case A: Approved Leave
      if (leaveMap.has(emp.id)) {
        attendanceStatus = 'Leave';
        countLeave++;
        const leave = leaveMap.get(emp.id);
        leaveRequestId = leave.id;
      }
      // Case B: Holiday or Weekly Off without punches
      else if ((isHoliday || isSunday) && empPunches.length === 0) {
        attendanceStatus = isHoliday ? 'Holiday' : 'Weekly Off';
      }
      // Case C: No punches on a regular workday -> Absent
      else if (empPunches.length === 0) {
        attendanceStatus = 'Absent';
        hasException = true;
        exceptionTypes.push('ABSENT');
        countAbsent++;
      }
      // Case D: Has punches -> Determine IN / OUT and evaluate timeliness
      else {
        const sortedPunches = [...empPunches].sort(
          (a, b) => new Date(a.punch_datetime).getTime() - new Date(b.punch_datetime).getTime()
        );

        if (sortedPunches.length === 1) {
          const p = sortedPunches[0];
          const punchHour = new Date(p.punch_datetime).getHours();
          if (punchHour < 12) {
            actualIn = new Date(p.punch_datetime);
            attendanceStatus = 'Missing Clock Out';
            exceptionTypes.push('MISSING_CLOCK_OUT');
            hasException = true;
            workedMinutes = 240;
          } else {
            actualOut = new Date(p.punch_datetime);
            attendanceStatus = 'Missing Clock In';
            exceptionTypes.push('MISSING_CLOCK_IN');
            hasException = true;
            workedMinutes = 240;
          }
          countMissing++;
        } else {
          actualIn = new Date(sortedPunches[0].punch_datetime);
          actualOut = new Date(sortedPunches[sortedPunches.length - 1].punch_datetime);

          const diffMs = actualOut.getTime() - actualIn.getTime();
          const totalDurationMin = Math.max(0, Math.floor(diffMs / (1000 * 60)));
          workedMinutes = Math.max(0, totalDurationMin - (schedule.break_minutes || 60));

          const plannedStartDt = new Date(`${date}T${defaultStart}+07:00`);

          if (actualIn.getTime() > plannedStartDt.getTime()) {
            attendanceStatus = 'Late';
            lateMinutes = Math.floor((actualIn.getTime() - plannedStartDt.getTime()) / (1000 * 60));
            hasException = true;
            exceptionTypes.push('LATE');
            countLate++;

            if (lateMinutes <= 15) {
              // กรณีที่ 1: สายไม่เกิน 15 นาที (08:01 - 08:15)
              // ตัด 1 แต้ม และสายครบ 4 แต้ม ตัดลากิจไม่รับค่าจ้าง 2 ชม.
              latePoints = 1;
              lateRuleCategory = 'LATE_LE_15';
              const prevPointsRes = await client.query(`
                SELECT COALESCE(SUM(late_points), 0)::int as total_pts
                FROM attendance_daily
                WHERE employee_id = $1 AND work_date < $2 AND work_date >= ($2::date - INTERVAL '60 days');
              `, [emp.id, date]);
              const prevPts = parseInt(prevPointsRes.rows[0]?.total_pts || '0');
              accumPts = prevPts + 1;

              if (accumPts % 4 === 0) {
                unpaidLeaveHours = 2.00;
                penaltyNotes = `สายไม่เกิน 15 นาที (ครั้งที่ ${accumPts} สะสมครบ 4 แต้ม) -> ตัดลากิจไม่รับค่าจ้าง 2 ชม.`;
                normalHours = 6.00;
              } else {
                penaltyNotes = `สายไม่เกิน 15 นาที (${lateMinutes} นาที) ตัด 1 แต้ม [สะสมแต้มที่ ${accumPts}/4]`;
                normalHours = 8.00;
              }
            } else {
              // กรณีที่ 2: สายเกิน 15 นาที (สแกนหลัง 08:15 น.)
              // ตัดลากิจไม่รับค่าจ้าง 2 ชม. ทันที
              lateRuleCategory = 'LATE_GT_15';
              unpaidLeaveHours = 2.00;
              penaltyNotes = `สแกนหลัง 08:15 น. (สาย ${lateMinutes} นาที) -> ตัดลากิจไม่รับค่าจ้าง 2 ชม. ทันที`;
              normalHours = 6.00;
            }
          } else {
            attendanceStatus = 'Present';
            countPresent++;
          }
        }
      }

      // Upsert into attendance_daily
      const dailyRes = await client.query(`
        INSERT INTO attendance_daily (
          employee_id, employee_code, work_date, schedule_id, shift_id,
          planned_start, planned_end, actual_in, actual_out,
          late_minutes, late_points, unpaid_leave_hours, late_rule_category,
          accumulated_late_points, penalty_notes,
          early_leave_minutes, worked_minutes, normal_hours,
          attendance_status, leave_request_id,
          has_exception, exception_types, exception_resolved, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15,
          $16, $17, $18,
          $19, $20,
          $21, $22, $23, NOW()
        )
        ON CONFLICT (employee_id, work_date) DO UPDATE SET
          actual_in = EXCLUDED.actual_in,
          actual_out = EXCLUDED.actual_out,
          late_minutes = EXCLUDED.late_minutes,
          late_points = EXCLUDED.late_points,
          unpaid_leave_hours = EXCLUDED.unpaid_leave_hours,
          late_rule_category = EXCLUDED.late_rule_category,
          accumulated_late_points = EXCLUDED.accumulated_late_points,
          penalty_notes = EXCLUDED.penalty_notes,
          worked_minutes = EXCLUDED.worked_minutes,
          normal_hours = EXCLUDED.normal_hours,
          attendance_status = EXCLUDED.attendance_status,
          leave_request_id = EXCLUDED.leave_request_id,
          has_exception = EXCLUDED.has_exception,
          exception_types = EXCLUDED.exception_types,
          exception_resolved = EXCLUDED.exception_resolved,
          updated_at = NOW()
        RETURNING id;
      `, [
        emp.id,
        emp.employee_code,
        date,
        schedule.id || null,
        emp.default_shift_id || null,
        defaultStart,
        defaultEnd,
        actualIn ? actualIn.toISOString() : null,
        actualOut ? actualOut.toISOString() : null,
        lateMinutes,
        latePoints,
        unpaidLeaveHours,
        lateRuleCategory,
        accumPts,
        penaltyNotes,
        earlyLeaveMinutes,
        workedMinutes,
        normalHours.toFixed(2),
        attendanceStatus,
        leaveRequestId,
        hasException,
        exceptionTypes,
        !hasException
      ]);

      const dailyId = dailyRes.rows[0].id;

      if (hasException) {
        for (const excType of exceptionTypes) {
          let severity = excType === 'ABSENT' ? 'HIGH' : 'MEDIUM';
          let description = `ความผิดปกติของการลงเวลา: ${excType}`;
          if (excType === 'LATE') {
            if (lateRuleCategory === 'LATE_GT_15' || unpaidLeaveHours > 0) {
              severity = 'HIGH';
            }
            description = penaltyNotes || `พนักงานเข้างานสาย ${lateMinutes} นาที`;
          } else if (excType === 'MISSING_CLOCK_OUT') {
            description = `มีบันทึกเวลาเข้าแต่ไม่มีเวลาสแกนออก (Missing Punch Out)`;
          } else if (excType === 'MISSING_CLOCK_IN') {
            description = `มีบันทึกเวลาออกแต่ไม่มีเวลาสแกนเข้า (Missing Punch In)`;
          } else if (excType === 'ABSENT') {
            severity = 'HIGH';
            description = `ขาดงาน: ไม่พบการสแกนนิ้วเข้างานและไม่มีใบลาที่ได้รับการอนุมัติ (Unapproved Absence)`;
          }

          const excRes = await client.query(`
            INSERT INTO attendance_exceptions (
              attendance_daily_id, employee_id, work_date, exception_type, severity, description, is_resolved
            ) VALUES ($1, $2, $3, $4, $5, $6, FALSE)
            ON CONFLICT DO NOTHING
            RETURNING id;
          `, [dailyId, emp.id, date, excType, severity, description]);

          if (excRes.rows.length > 0) {
            exceptionsGenerated++;
            const excId = excRes.rows[0].id;

            await client.query(`
              INSERT INTO action_items (
                action_type, title, description, priority, assigned_to_role, related_entity_type, related_entity_id, status, source
              ) VALUES (
                'ATTENDANCE_EXCEPTION',
                $1, $2, $3, 'HR Officer', 'attendance_exceptions', $4, 'PENDING', 'ATTENDANCE_ENGINE'
              );
            `, [
              `ความผิดปกติการลงเวลา: ${emp.first_name} ${emp.last_name} (${excType})`,
              `${description} วันที่ ${date}`,
              severity,
              excId
            ]);
            actionItemsCreated++;

            await emitDomainEvent('attendance.exception.detected', 'attendance_exceptions', excId, {
              employee_id: emp.id,
              employee_code: emp.employee_code,
              work_date: date,
              exception_type: excType,
              severity
            });
          }
        }
      }
    }

    await emitDomainEvent('attendance.calculated', 'attendance_daily', date, {
      work_date: date,
      total_employees: employees.length,
      present: countPresent,
      late: countLate,
      leave: countLeave,
      absent: countAbsent,
      missing: countMissing,
      exceptions: exceptionsGenerated,
      triggered_by: actorId || 'SYSTEM'
    });

    return {
      date,
      totalEmployees: employees.length,
      present: countPresent,
      late: countLate,
      leave: countLeave,
      absent: countAbsent,
      missingPunch: countMissing,
      exceptionsGenerated,
      actionItemsCreated
    };
  });
}
