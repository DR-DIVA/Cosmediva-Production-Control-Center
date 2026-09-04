import { NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'DAILY_ATTENDANCE';
    const date = searchParams.get('date') || '2026-09-05';
    const format = searchParams.get('format') || 'json'; // json, csv

    if (reportType === 'EMPLOYEE_LIST') {
      const { rows } = await queryPeople(`
        SELECT 
          e.employee_code as "รหัสพนักงาน",
          e.prefix as "คำนำหน้า",
          e.first_name as "ชื่อ",
          e.last_name as "นามสกุล",
          e.nickname as "ชื่อเล่น",
          d.department_name as "แผนก",
          w.work_area_name as "พื้นที่ปฏิบัติงาน",
          pos.position_name as "ตำแหน่ง",
          e.system_role as "สิทธิ์ในระบบ",
          e.employment_type as "ประเภทการจ้าง",
          e.employment_status as "สถานะ",
          e.hire_date as "วันที่เริ่มงาน",
          e.email as "อีเมล",
          e.phone as "เบอร์โทรศัพท์"
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN work_areas w ON e.work_area_id = w.id
        LEFT JOIN positions pos ON e.position_id = pos.id
        WHERE e.deleted_at IS NULL
        ORDER BY e.employee_code ASC;
      `);

      if (format === 'csv') {
        const csv = toCsv(rows);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="Cosmediva_Employees_${date}.csv"`
          }
        });
      }
      return NextResponse.json({ success: true, data: rows });
    }

    if (reportType === 'DAILY_ATTENDANCE') {
      const { rows } = await queryPeople(`
        SELECT 
          ad.work_date as "วันที่",
          e.employee_code as "รหัสพนักงาน",
          e.first_name || ' ' || e.last_name as "ชื่อ-นามสกุล",
          d.department_name as "แผนก",
          w.work_area_name as "พื้นที่งาน",
          ad.attendance_status as "สถานะการลงเวลา",
          TO_CHAR(ad.actual_in, 'HH24:MI:SS') as "เวลาเข้าจริง",
          TO_CHAR(ad.actual_out, 'HH24:MI:SS') as "เวลาออกจริง",
          ad.late_minutes as "นาทีที่สาย",
          ad.worked_minutes as "นาทีที่ทำงาน",
          ad.normal_hours as "ชั่วโมงทำงาน"
        FROM attendance_daily ad
        JOIN employees e ON ad.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN work_areas w ON e.work_area_id = w.id
        WHERE ad.work_date = $1
        ORDER BY ad.late_minutes DESC, e.employee_code ASC;
      `, [date]);

      if (format === 'csv') {
        const csv = toCsv(rows);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="Cosmediva_DailyAttendance_${date}.csv"`
          }
        });
      }
      return NextResponse.json({ success: true, data: rows });
    }

    if (reportType === 'LEAVE_BALANCES') {
      const { rows } = await queryPeople(`
        SELECT 
          e.employee_code as "รหัสพนักงาน",
          e.first_name || ' ' || e.last_name as "ชื่อ-นามสกุล",
          d.department_name as "แผนก",
          lt.name_th as "ประเภทการลา",
          lb.entitled as "สิทธิ์ทั้งปี (วัน)",
          lb.carry_forward as "ยกยอดมา (วัน)",
          lb.taken as "ใช้ไปแล้ว (วัน)",
          lb.pending as "รออนุมัติ (วัน)",
          lb.available as "คงเหลือ (วัน)"
        FROM leave_balances lb
        JOIN employees e ON lb.employee_id = e.id
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE lb.year = 2026 AND e.deleted_at IS NULL
        ORDER BY e.employee_code ASC, lt.name_th ASC;
      `);

      if (format === 'csv') {
        const csv = toCsv(rows);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="Cosmediva_LeaveBalances_2026.csv"`
          }
        });
      }
      return NextResponse.json({ success: true, data: rows });
    }

    if (reportType === 'EXCEPTIONS') {
      const { rows } = await queryPeople(`
        SELECT 
          ae.work_date as "วันที่",
          e.employee_code as "รหัสพนักงาน",
          e.first_name || ' ' || e.last_name as "ชื่อ-นามสกุล",
          d.department_name as "แผนก",
          ae.exception_type as "ประเภทความผิดปกติ",
          ae.severity as "ระดับความรุนแรง",
          ae.description as "รายละเอียด",
          CASE WHEN ae.is_resolved THEN 'แก้ไขแล้ว' ELSE 'รอดำเนินการ' END as "สถานะ"
        FROM attendance_exceptions ae
        JOIN employees e ON ae.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE ae.work_date = $1
        ORDER BY ae.severity DESC;
      `, [date]);

      if (format === 'csv') {
        const csv = toCsv(rows);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="Cosmediva_Exceptions_${date}.csv"`
          }
        });
      }
      return NextResponse.json({ success: true, data: rows });
    }

    return NextResponse.json({ success: false, error: 'Unknown report type' }, { status: 400 });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function toCsv(data: any[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(h => {
      const val = obj[h] === null || obj[h] === undefined ? '' : String(obj[h]);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n'); // Add UTF-8 BOM for Excel Thai language support
}
