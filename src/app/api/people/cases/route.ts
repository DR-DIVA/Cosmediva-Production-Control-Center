import { NextRequest, NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';
import { emitDomainEvent } from '@/lib/events/domainEvents';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get('id');

    if (caseId) {
      // Fetch single case
      const caseRes = await queryPeople(`
        SELECT c.*, e.employee_code, e.first_name, e.last_name, e.nickname, d.department_name
        FROM hr_cases c
        JOIN employees e ON c.employee_id = e.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.id = $1;
      `, [caseId]);

      if (caseRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
      }

      const hrCase = caseRes.rows[0];

      // Fetch evidence
      const evRes = await queryPeople(`
        SELECT * FROM case_evidence WHERE case_id = $1 ORDER BY created_at ASC;
      `, [caseId]);

      // Fetch comments
      const cmRes = await queryPeople(`
        SELECT * FROM case_comments WHERE case_id = $1 ORDER BY created_at ASC;
      `, [caseId]);

      // Fetch actions
      const actRes = await queryPeople(`
        SELECT * FROM case_actions WHERE case_id = $1 ORDER BY created_at ASC;
      `, [caseId]);

      return NextResponse.json({
        success: true,
        data: {
          ...hrCase,
          evidence: evRes.rows || [],
          comments: cmRes.rows || [],
          actions: actRes.rows || []
        }
      });
    }

    // List all cases
    const { rows } = await queryPeople(`
      SELECT c.*, e.employee_code, e.first_name, e.last_name, e.nickname, d.department_name
      FROM hr_cases c
      LEFT JOIN employees e ON c.employee_id = e.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY c.opened_at DESC LIMIT 50;
    `);

    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'CREATE_CASE' } = body;

    if (action === 'CREATE_CASE') {
      const {
        case_type,
        employee_id,
        department_id,
        source_type = 'EXCEPTION',
        source_id,
        severity = 'MEDIUM',
        priority = 'MEDIUM',
        summary,
        description
      } = body;

      const caseNumber = `CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

      const { rows } = await queryPeople(`
        INSERT INTO hr_cases (
          case_number, case_type, employee_id, department_id, source_type, source_id, severity, priority, status, summary, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Open', $9, $10)
        RETURNING *;
      `, [caseNumber, case_type, employee_id, department_id || null, source_type, source_id || null, severity, priority, summary, description]);

      const data = rows[0];

      await emitDomainEvent('case.created', 'hr_cases', data.id, {
        case_number: caseNumber,
        case_type,
        employee_id,
        severity
      });

      // Automatically create action item for HR review
      await queryPeople(`
        INSERT INTO action_items (
          action_type, title, description, priority, assigned_to_role, related_entity_type, related_entity_id, status, source
        ) VALUES (
          'HR_CASE_REVIEW', $1, $2, $3, 'HR Officer', 'hr_cases', $4, 'PENDING', 'CASE_MANAGEMENT'
        );
      `, [
        `ตรวจสอบเคส: ${caseNumber} (${summary})`,
        `เปิดเคสใหม่ประเภท ${case_type} กรุณาตรวจสอบหลักฐานและดำเนินการ`,
        priority === 'HIGH' || priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
        data.id
      ]);

      return NextResponse.json({ success: true, data });
    }

    if (action === 'ADD_COMMENT') {
      const { case_id, comment, comment_type = 'NOTE', author_type = 'USER', author_id } = body;
      const { rows } = await queryPeople(`
        INSERT INTO case_comments (case_id, comment, comment_type, author_type, author_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `, [case_id, comment, comment_type, author_type, author_id || null]);

      await emitDomainEvent('case.comment_added', 'hr_cases', case_id, {
        comment_id: rows[0].id,
        author_type
      });

      return NextResponse.json({ success: true, data: rows[0] });
    }

    if (action === 'ADD_EVIDENCE') {
      const { case_id, evidence_type, title, description, snapshot_data, file_id } = body;
      const { rows } = await queryPeople(`
        INSERT INTO case_evidence (case_id, evidence_type, title, description, snapshot_data, file_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [case_id, evidence_type, title, description || null, snapshot_data ? JSON.stringify(snapshot_data) : null, file_id || null]);

      return NextResponse.json({ success: true, data: rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, resolution } = body;

    const { rows } = await queryPeople(`
      UPDATE hr_cases 
      SET 
        status = COALESCE($1, status),
        resolution = COALESCE($2, resolution),
        closed_at = CASE WHEN $1 IN ('Resolved', 'Closed') THEN NOW() ELSE closed_at END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `, [status || null, resolution || null, id]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }

    await emitDomainEvent('case.updated', 'hr_cases', id, { status, resolution });

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
