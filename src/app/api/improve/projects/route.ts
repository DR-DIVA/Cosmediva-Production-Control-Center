import { NextResponse } from 'next/server';
import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

function getClient() {
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

export async function GET(request: Request) {
  const client = getClient();
  try {
    await client.connect();

    const query = `
      SELECT 
        p.*,
        d.department_name,
        d.department_code,
        l.line_name,
        l.line_code,
        s.station_name,
        s.station_code,
        COALESCE(
          (SELECT json_agg(ba.*) FROM improve_before_after ba WHERE ba.project_id = p.id),
          '[]'::json
        ) as before_after,
        COALESCE(
          (SELECT json_agg(o.*) FROM improve_observations o 
           JOIN improve_project_observations po ON po.observation_id = o.id 
           WHERE po.project_id = p.id),
          '[]'::json
        ) as linked_observations
      FROM improve_projects p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN improve_lines l ON p.line_id = l.id
      LEFT JOIN improve_stations s ON p.station_id = s.id
      ORDER BY p.created_at DESC
    `;

    const res = await client.query(query);
    await client.end();

    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = getClient();
  try {
    const body = await request.json();
    const {
      title,
      problem_statement,
      observation_id,
      department_id,
      line_id,
      station_id,
      owner_name = 'IE Specialist',
      sponsor_name,
      priority = 'MEDIUM',
      target_date,
      expected_annual_saving = 0,
      baseline_summary,
      target_summary
    } = body;

    if (!title || !problem_statement) {
      return NextResponse.json({ success: false, error: 'Title and problem statement are required' }, { status: 400 });
    }

    await client.connect();

    // Generate Project No: IMP-YYYY-XXXXX
    const year = new Date().getFullYear();
    const countRes = await client.query(`SELECT COUNT(*) FROM improve_projects WHERE project_no LIKE $1`, [`IMP-${year}-%`]);
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(5, '0');
    const project_no = `IMP-${year}-${nextSeq}`;

    const insertRes = await client.query(`
      INSERT INTO improve_projects (
        project_no,
        title,
        problem_statement,
        department_id,
        line_id,
        station_id,
        owner_name,
        sponsor_name,
        priority,
        target_date,
        expected_annual_saving,
        baseline_summary,
        target_summary,
        pdca_stage,
        status,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PLAN', 'IN_PROGRESS', NOW()
      ) RETURNING *
    `, [
      project_no,
      title,
      problem_statement,
      department_id || null,
      line_id || null,
      station_id || null,
      owner_name,
      sponsor_name || null,
      priority,
      target_date || null,
      expected_annual_saving,
      baseline_summary || null,
      target_summary || null
    ]);

    const newProject = insertRes.rows[0];

    // Link observation if provided and update its status
    if (observation_id) {
      await client.query(`
        INSERT INTO improve_project_observations (project_id, observation_id)
        VALUES ($1, $2) ON CONFLICT DO NOTHING
      `, [newProject.id, observation_id]);

      await client.query(`
        UPDATE improve_observations
        SET status = 'IMPROVEMENT_CREATED', updated_at = NOW()
        WHERE id = $1
      `, [observation_id]);
    }

    // Write Audit Log
    await client.query(`
      INSERT INTO improve_audit_logs (entity_type, entity_id, action, performed_by, new_value, reason)
      VALUES ('PROJECT', $1, 'CREATE', $2, $3, 'Improvement project initiated')
    `, [newProject.id, owner_name, JSON.stringify(newProject)]);

    await client.end();
    return NextResponse.json({ success: true, data: newProject });
  } catch (error: any) {
    console.error('Error creating project:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
