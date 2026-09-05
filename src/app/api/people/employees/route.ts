import { NextResponse } from 'next/server';
import { queryPeople, withTransaction } from '@/lib/peopleDb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('department_id') || '';
    const workAreaId = searchParams.get('work_area_id') || '';
    const employmentType = searchParams.get('employment_type') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        e.*,
        d.department_name,
        d.department_code,
        w.work_area_name,
        w.work_area_code,
        p.position_name,
        p.job_level as position_level,
        s.first_name as supervisor_first_name,
        s.last_name as supervisor_last_name,
        s.employee_code as supervisor_code
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_areas w ON e.work_area_id = w.id
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN employees s ON e.supervisor_id = s.id
      WHERE e.deleted_at IS NULL
    `;
    const params: any[] = [];
    let idx = 1;

    if (search) {
      query += ` AND (e.employee_code ILIKE $${idx} OR e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.nickname ILIKE $${idx} OR e.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (departmentId) {
      query += ` AND e.department_id = $${idx}`;
      params.push(departmentId);
      idx++;
    }

    if (workAreaId) {
      query += ` AND e.work_area_id = $${idx}`;
      params.push(workAreaId);
      idx++;
    }

    if (employmentType) {
      query += ` AND e.employment_type = $${idx}`;
      params.push(employmentType);
      idx++;
    }

    if (status) {
      query += ` AND e.employment_status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (role) {
      query += ` AND e.system_role = $${idx}`;
      params.push(role);
      idx++;
    }

    query += ` ORDER BY e.employee_code ASC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const { rows } = await queryPeople(query, params);

    // Sensitive Field Masking (PDPA & Role-based Privacy)
    // If caller is Employee, mask personal phone and email of other employees
    const callerRole = searchParams.get('caller_role');
    const callerId = searchParams.get('caller_id');
    const isHrOrAdmin = callerRole === 'HR Officer' || callerRole === 'HR Manager' || callerRole === 'Admin' || !callerRole;

    const sanitizedRows = rows.map((emp) => {
      if (isHrOrAdmin || emp.id === callerId) {
        return emp;
      }
      return {
        ...emp,
        phone: emp.phone ? emp.phone.replace(/(\d{3})\d{3,4}(\d{3,4})/, '$1-***-$2') : '***-***-****',
        email: emp.email ? emp.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '***@***.***'
      };
    });

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM employees e WHERE e.deleted_at IS NULL`;
    const countParams: any[] = [];
    let cIdx = 1;

    if (search) {
      countQuery += ` AND (e.employee_code ILIKE $${cIdx} OR e.first_name ILIKE $${cIdx} OR e.last_name ILIKE $${cIdx})`;
      countParams.push(`%${search}%`);
      cIdx++;
    }
    if (departmentId) {
      countQuery += ` AND e.department_id = $${cIdx}`;
      countParams.push(departmentId);
      cIdx++;
    }
    if (employmentType) {
      countQuery += ` AND e.employment_type = $${cIdx}`;
      countParams.push(employmentType);
      cIdx++;
    }

    const countRes = await queryPeople(countQuery, countParams);
    const total = parseInt(countRes.rows[0]?.count || '0');

    // Also return departments and work areas for filter dropdowns and Org Structure
    const depts = await queryPeople(`
      SELECT 
        d.id, 
        d.department_code, 
        d.department_name,
        COALESCE(div.division_code, 'OTHER') as division_code,
        COALESCE(div.division_name, 'ฝ่ายอื่นๆ / ส่วนกลาง') as division_name,
        COUNT(e.id)::int as employee_count
      FROM departments d
      LEFT JOIN divisions div ON d.division_id = div.id
      LEFT JOIN employees e ON e.department_id = d.id AND e.deleted_at IS NULL
      WHERE d.is_active = TRUE
      GROUP BY d.id, d.department_code, d.department_name, div.division_code, div.division_name
      ORDER BY employee_count DESC, d.department_name ASC
    `);
    const areas = await queryPeople(`SELECT id, work_area_code, work_area_name, department_id FROM work_areas WHERE is_active = TRUE ORDER BY work_area_name`);
    const roles = ['Employee', 'Supervisor', 'Manager', 'HR Officer', 'HR Manager', 'Executive', 'Admin'];

    return NextResponse.json({
      success: true,
      data: sanitizedRows,
      total,
      filters: {
        departments: depts.rows,
        workAreas: areas.rows,
        roles
      }
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_code,
      prefix = 'นาย',
      first_name,
      last_name,
      nickname,
      email,
      phone,
      department_id,
      work_area_id,
      position_id,
      system_role = 'Employee',
      job_level = 'STAFF',
      employment_type = 'Monthly',
      employment_status = 'Permanent',
      hire_date = new Date().toISOString().split('T')[0],
      supervisor_id
    } = body;

    if (!employee_code || !first_name || !last_name) {
      return NextResponse.json({
        success: false,
        error: 'กรุณากรอกรหัสพนักงาน ชื่อ และนามสกุล'
      }, { status: 400 });
    }

    // Check duplicate code
    const existing = await queryPeople('SELECT id FROM employees WHERE employee_code = $1', [employee_code]);
    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: `รหัสพนักงาน ${employee_code} มีอยู่ในระบบแล้ว`
      }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      const insRes = await client.query(`
        INSERT INTO employees (
          employee_code, prefix, first_name, last_name, nickname,
          email, phone, department_id, work_area_id, position_id,
          system_role, job_level, employment_type, employment_status,
          hire_date, supervisor_id
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16
        ) RETURNING *;
      `, [
        employee_code, prefix, first_name, last_name, nickname,
        email, phone, department_id || null, work_area_id || null, position_id || null,
        system_role, job_level, employment_type, employment_status,
        hire_date, supervisor_id || null
      ]);

      const newEmp = insRes.rows[0];

      // Auto-assign default leave balances for 2026 based on Leave Policies
      const policies = await client.query(`
        SELECT lp.*, lt.type_code 
        FROM leave_policies lp 
        JOIN leave_types lt ON lp.leave_type_id = lt.id 
        WHERE lp.is_active = TRUE;
      `);

      for (const p of policies.rows) {
        await client.query(`
          INSERT INTO leave_balances (
            employee_id, leave_type_id, year, entitled, carry_forward, taken, pending, available
          ) VALUES ($1, $2, 2026, $3, 0, 0, 0, $3)
          ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
        `, [newEmp.id, p.leave_type_id, p.annual_entitlement]);

        await client.query(`
          INSERT INTO leave_transactions (
            employee_id, leave_type_id, transaction_type, amount, balance_before, balance_after, reason
          ) VALUES ($1, $2, 'ALLOCATION', $3, 0, $3, 'กำหนดสิทธิ์เริ่มต้นสำหรับพนักงานใหม่');
        `, [newEmp.id, p.leave_type_id, p.annual_entitlement]);
      }

      return newEmp;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    if (updates.is_soft_delete) {
      await queryPeople('UPDATE employees SET deleted_at = NOW(), is_active = FALSE WHERE id = $1', [id]);
      return NextResponse.json({ success: true, message: 'Soft deleted employee successfully' });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowedCols = [
      'prefix', 'first_name', 'last_name', 'nickname', 'phone', 'email',
      'department_id', 'work_area_id', 'position_id', 'supervisor_id',
      'job_level', 'employment_type', 'employment_status', 'system_role',
      'work_location', 'preferred_language', 'hire_date'
    ];

    for (const col of allowedCols) {
      if (updates[col] !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(updates[col]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields provided for update' }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `
      UPDATE employees 
      SET ${fields.join(', ')} 
      WHERE id = $${idx}
      RETURNING *;
    `;

    const { rows } = await queryPeople(updateQuery, values);

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
