import { NextResponse } from 'next/server';
import { queryPeople, withTransaction } from '@/lib/peopleDb';
import { calculateDailyAttendance } from '@/lib/attendanceEngine';
import { emitDomainEvent } from '@/lib/events/domainEvents';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2026-09-05';
    const departmentId = searchParams.get('department_id');
    const status = searchParams.get('status');
    const hasExceptionOnly = searchParams.get('exception_only') === 'true';
    const employeeId = searchParams.get('employee_id');

    let query = `
      SELECT 
        ad.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.nickname,
        e.system_role,
        e.employment_type,
        d.department_name,
        d.department_code,
        w.work_area_name,
        w.work_area_code,
        pos.position_name,
        s.shift_name,
        s.start_time as shift_start,
        s.end_time as shift_end
      FROM attendance_daily ad
      JOIN employees e ON ad.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_areas w ON e.work_area_id = w.id
      LEFT JOIN positions pos ON e.position_id = pos.id
      LEFT JOIN shifts s ON ad.shift_id = s.id
      WHERE ad.work_date = $1
    `;
    const params: any[] = [date];
    let idx = 2;

    if (employeeId) {
      query += ` AND ad.employee_id = $${idx}`;
      params.push(employeeId);
      idx++;
    }

    if (departmentId) {
      query += ` AND e.department_id = $${idx}`;
      params.push(departmentId);
      idx++;
    }

    if (status && status !== 'ALL') {
      query += ` AND ad.attendance_status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (hasExceptionOnly) {
      query += ` AND ad.has_exception = TRUE`;
    }

    query += ` ORDER BY ad.late_minutes DESC, e.employee_code ASC LIMIT 200`;

    const { rows } = await queryPeople(query, params);

    // Summary counts for this date
    const statsRes = await queryPeople(`
      SELECT 
        COUNT(*) as total_scheduled,
        COUNT(CASE WHEN attendance_status = 'Present' THEN 1 END) as total_present,
        COUNT(CASE WHEN attendance_status = 'Late' THEN 1 END) as total_late,
        COUNT(CASE WHEN attendance_status = 'Leave' THEN 1 END) as total_leave,
        COUNT(CASE WHEN attendance_status = 'Absent' THEN 1 END) as total_absent,
        COUNT(CASE WHEN attendance_status IN ('Missing Clock In', 'Missing Clock Out', 'Missing Punch') THEN 1 END) as total_missing,
        COUNT(CASE WHEN has_exception = TRUE THEN 1 END) as total_exceptions
      FROM attendance_daily 
      WHERE work_date = $1;
    `, [date]);

    const stats = statsRes.rows[0] || {
      total_scheduled: 0, total_present: 0, total_late: 0, total_leave: 0, total_absent: 0, total_missing: 0, total_exceptions: 0
    };

    return NextResponse.json({
      success: true,
      data: rows,
      stats: {
        scheduled: parseInt(stats.total_scheduled || '0'),
        present: parseInt(stats.total_present || '0'),
        late: parseInt(stats.total_late || '0'),
        leave: parseInt(stats.total_leave || '0'),
        absent: parseInt(stats.total_absent || '0'),
        missing: parseInt(stats.total_missing || '0'),
        exceptions: parseInt(stats.total_exceptions || '0'),
        attendanceRate: stats.total_scheduled > 0 
          ? (((parseInt(stats.total_present) + parseInt(stats.total_late)) / parseInt(stats.total_scheduled)) * 100).toFixed(1)
          : '0'
      }
    });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      punches,
      date = '2026-09-05',
      fileName = 'IMPORT_PUNCH.csv',
      actor_id,
      validate_only = false,
      auto_calculate = true
    } = body;

    // Action 1: Execute Pure Attendance Calculation Engine
    if (action === 'CALCULATE_ATTENDANCE') {
      const calcResult = await calculateDailyAttendance(date, actor_id);
      return NextResponse.json({
        success: true,
        message: `ประมวลผลการลงเวลาสำเร็จ: มาทำงาน ${calcResult.present} คน, สาย ${calcResult.late} คน, ลา ${calcResult.leave} คน, ขาดงาน ${calcResult.absent} คน, สแกนไม่ครบ ${calcResult.missingPunch} คน`,
        data: calcResult
      });
    }

    // Action 2: Import Raw Punches (CSV / Biometric Device) with pre-validation & transaction
    if (action === 'IMPORT_PUNCHES' && Array.isArray(punches)) {
      if (punches.length === 0) {
        return NextResponse.json({ success: false, error: 'ไม่พบรายการข้อมูลบันทึกเวลาที่ส่งมา' }, { status: 400 });
      }

      // Pre-validation step
      const validationErrors: Array<{ row: number; employee_code: string; error: string }> = [];
      const emps = await queryPeople(`SELECT id, employee_code FROM employees WHERE deleted_at IS NULL`);
      const empCodeMap = new Map(emps.rows.map((e: any) => [e.employee_code.toUpperCase(), e.id]));

      for (let i = 0; i < punches.length; i++) {
        const p = punches[i];
        const code = String(p.employee_code || '').trim().toUpperCase();
        if (!code) {
          validationErrors.push({ row: i + 1, employee_code: '', error: 'ไม่พบรหัสพนักงาน' });
        } else if (!empCodeMap.has(code)) {
          validationErrors.push({ row: i + 1, employee_code: code, error: `รหัสพนักงาน ${code} ไม่พบในระบบ Master` });
        }

        if (!p.punch_datetime || isNaN(new Date(p.punch_datetime).getTime())) {
          validationErrors.push({ row: i + 1, employee_code: code, error: 'รูปแบบเวลาบันทึก (punch_datetime) ไม่ถูกต้อง' });
        }
      }

      if (validate_only) {
        return NextResponse.json({
          success: validationErrors.length === 0,
          valid: validationErrors.length === 0,
          totalRecords: punches.length,
          errors: validationErrors
        });
      }

      if (validationErrors.length > 0 && body.atomic === true) {
        return NextResponse.json({
          success: false,
          error: `พบข้อผิดพลาดก่อนบันทึกข้อมูล ${validationErrors.length} รายการ การนำเข้าถูกยกเลิก (Rollback)`,
          errors: validationErrors
        }, { status: 400 });
      }

      const batchNumber = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const result = await withTransaction(async (client) => {
        const bRes = await client.query(`
          INSERT INTO attendance_import_batches (batch_number, source_type, total_records, file_name)
          VALUES ($1, 'CSV', $2, $3) RETURNING id;
        `, [batchNumber, punches.length, fileName]);
        const batchId = bRes.rows[0].id;

        let successCount = 0;
        let errorCount = 0;

        for (const p of punches) {
          const empCode = String(p.employee_code || '').trim().toUpperCase();
          const empId = empCodeMap.get(empCode);
          const punchTime = p.punch_datetime;
          const punchType = p.punch_type || 'AUTO';

          if (empCode && punchTime && empId) {
            await client.query(`
              INSERT INTO attendance_raw_logs (batch_id, employee_code, employee_id, punch_datetime, punch_type, source, original_raw_text)
              VALUES ($1, $2, $3, $4, $5, 'IMPORT_CSV', $6);
            `, [batchId, empCode, empId, punchTime, punchType, JSON.stringify(p)]);
            successCount++;
          } else {
            errorCount++;
          }
        }

        await client.query(`
          UPDATE attendance_import_batches 
          SET success_records = $1, error_records = $2 
          WHERE id = $3;
        `, [successCount, errorCount, batchId]);

        await emitDomainEvent('attendance.imported', 'attendance_import_batches', batchId, {
          batch_number: batchNumber,
          total_records: punches.length,
          success_records: successCount,
          error_records: errorCount,
          file_name: fileName
        });

        return { batchId, batchNumber, successCount, errorCount };
      });

      // Auto trigger Calculation Engine if requested
      let calcResult = null;
      if (auto_calculate && result.successCount > 0) {
        calcResult = await calculateDailyAttendance(date, actor_id);
      }

      return NextResponse.json({
        success: true,
        message: `นำเข้าข้อมูลดิบสำเร็จ ${result.successCount} รายการ (พบข้อผิดพลาด ${result.errorCount} รายการ)`,
        data: {
          ...result,
          calculation: calcResult
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action or payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling attendance POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
