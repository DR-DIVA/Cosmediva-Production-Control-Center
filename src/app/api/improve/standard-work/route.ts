import { NextResponse } from 'next/server';
import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

function getClient() {
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

export async function GET() {
  const client = getClient();
  try {
    await client.connect();

    const query = `
      SELECT 
        sw.*,
        d.department_name,
        d.department_code,
        p.project_no,
        p.title as project_title,
        COALESCE(
          (SELECT json_agg(o.*) FROM improve_opl o WHERE o.standard_work_id = sw.id),
          '[]'::json
        ) as opls
      FROM improve_standard_work sw
      LEFT JOIN departments d ON sw.department_id = d.id
      LEFT JOIN improve_projects p ON sw.project_id = p.id
      ORDER BY sw.created_at DESC
    `;

    const res = await client.query(query);

    // Also get all standalone OPLs
    const oplQuery = `
      SELECT o.*, sw.doc_no, sw.title as standard_work_title
      FROM improve_opl o
      LEFT JOIN improve_standard_work sw ON o.standard_work_id = sw.id
      ORDER BY o.created_at DESC
    `;
    const oplRes = await client.query(oplQuery);

    await client.end();

    return NextResponse.json({
      success: true,
      standardWork: res.rows,
      opls: oplRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching standard work:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = getClient();
  try {
    const body = await request.json();
    const {
      type = 'SOP', // 'SOP' or 'OPL'
      project_id,
      department_id,
      doc_no,
      title,
      owner_name = 'IE Specialist',
      qa_approver_name,
      steps_summary = [],
      critical_quality_points,
      safety_points,
      common_mistakes,
      // OPL specific
      standard_work_id,
      opl_no,
      topic,
      why_important,
      wrong_method_description,
      correct_method_description,
      stop_call_wait_rule
    } = body;

    await client.connect();

    if (type === 'OPL') {
      const generatedOplNo = opl_no || `OPL-${Date.now().toString().slice(-4)}`;
      const insertOpl = `
        INSERT INTO improve_opl (
          standard_work_id,
          opl_no,
          topic,
          why_important,
          wrong_method_description,
          correct_method_description,
          stop_call_wait_rule,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'APPROVED')
        RETURNING *
      `;
      const res = await client.query(insertOpl, [
        standard_work_id || null,
        generatedOplNo,
        topic,
        why_important || null,
        wrong_method_description || null,
        correct_method_description || null,
        stop_call_wait_rule || null
      ]);
      await client.end();
      return NextResponse.json({ success: true, data: res.rows[0] });
    } else {
      const generatedDocNo = doc_no || `SOP-PKG-${Date.now().toString().slice(-3)}`;
      const insertSOP = `
        INSERT INTO improve_standard_work (
          project_id,
          doc_no,
          title,
          doc_type,
          department_id,
          revision,
          effective_date,
          owner_name,
          qa_approver_name,
          status,
          steps_summary,
          critical_quality_points,
          safety_points,
          common_mistakes
        ) VALUES ($1, $2, $3, $4, $5, 'Rev.01', CURRENT_DATE, $6, $7, 'APPROVED', $8, $9, $10, $11)
        RETURNING *
      `;
      const res = await client.query(insertSOP, [
        project_id || null,
        generatedDocNo,
        title,
        type,
        department_id || null,
        owner_name,
        qa_approver_name || 'QA Compliance Officer',
        JSON.stringify(steps_summary),
        critical_quality_points || null,
        safety_points || null,
        common_mistakes || null
      ]);

      // If user also provided OPL info in the same form
      if (topic) {
        const swId = res.rows[0].id;
        const generatedOplNo = `OPL-${generatedDocNo.replace('SOP-', '')}`;
        await client.query(`
          INSERT INTO improve_opl (
            standard_work_id, opl_no, topic, why_important,
            wrong_method_description, correct_method_description, stop_call_wait_rule, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'APPROVED')
        `, [
          swId,
          generatedOplNo,
          topic,
          why_important || null,
          wrong_method_description || null,
          correct_method_description || null,
          stop_call_wait_rule || null
        ]);
      }

      await client.end();
      return NextResponse.json({ success: true, data: res.rows[0] });
    }
  } catch (error: any) {
    console.error('Error creating standard work:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
