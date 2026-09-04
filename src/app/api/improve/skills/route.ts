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

    // 1. All Skills
    const skillsRes = await client.query(`
      SELECT s.*, d.department_name 
      FROM improve_skills s
      LEFT JOIN departments d ON s.department_id = d.id
      ORDER BY s.skill_code ASC
    `);

    // 2. All Employee Skills (Matrix)
    const empSkillsRes = await client.query(`
      SELECT 
        es.*,
        s.skill_code,
        s.skill_name,
        s.category
      FROM improve_employee_skills es
      JOIN improve_skills s ON es.skill_id = s.id
      ORDER BY es.employee_id ASC, s.skill_code ASC
    `);

    // 3. Training Needs
    const trainingRes = await client.query(`
      SELECT 
        tn.*,
        o.observation_no,
        p.project_no,
        p.title as project_title
      FROM improve_training_needs tn
      LEFT JOIN improve_observations o ON tn.observation_id = o.id
      LEFT JOIN improve_projects p ON tn.project_id = p.id
      ORDER BY tn.created_at DESC
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      skills: skillsRes.rows,
      employeeSkills: empSkillsRes.rows,
      trainingNeeds: trainingRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching skills data:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = getClient();
  try {
    const body = await request.json();
    const { action } = body;

    await client.connect();

    if (action === 'UPDATE_LEVEL') {
      const { id, employee_id, skill_id, current_level, verified_by, notes } = body;

      if (id) {
        const updateQuery = `
          UPDATE improve_employee_skills
          SET current_level = $1, verified_by = $2, verified_at = NOW(), notes = $3, updated_at = NOW()
          WHERE id = $4
          RETURNING *
        `;
        const res = await client.query(updateQuery, [current_level, verified_by || 'หัวหน้างาน', notes || null, id]);
        await client.end();
        return NextResponse.json({ success: true, data: res.rows[0] });
      } else {
        const insertQuery = `
          INSERT INTO improve_employee_skills (
            employee_id, employee_name, department_name, skill_id, current_level, required_level, verified_by, verified_at, notes
          ) VALUES ($1, $2, $3, $4, $5, 'L3', $6, NOW(), $7)
          RETURNING *
        `;
        const res = await client.query(insertQuery, [
          employee_id,
          body.employee_name || 'พนักงานฝ่ายผลิต',
          body.department_name || 'Packing',
          skill_id,
          current_level,
          verified_by || 'หัวหน้างาน',
          notes || null
        ]);
        await client.end();
        return NextResponse.json({ success: true, data: res.rows[0] });
      }
    } else if (action === 'CREATE_TRAINING') {
      const { observation_id, project_id, training_topic, target_department, trainer_name, target_date } = body;
      const insertQuery = `
        INSERT INTO improve_training_needs (
          observation_id, project_id, training_topic, target_department, trainer_name, target_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'IDENTIFIED')
        RETURNING *
      `;
      const res = await client.query(insertQuery, [
        observation_id || null,
        project_id || null,
        training_topic,
        target_department || 'Packing',
        trainer_name || 'IE / Master Trainer',
        target_date || null
      ]);
      await client.end();
      return NextResponse.json({ success: true, data: res.rows[0] });
    } else if (action === 'COMPLETE_TRAINING') {
      const { id } = body;
      const updateQuery = `
        UPDATE improve_training_needs
        SET status = 'COMPLETED', completion_date = CURRENT_DATE
        WHERE id = $1
        RETURNING *
      `;
      const res = await client.query(updateQuery, [id]);
      await client.end();
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    await client.end();
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating skills/training:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
