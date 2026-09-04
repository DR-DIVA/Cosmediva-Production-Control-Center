import { NextResponse } from 'next/server';
import pg from 'pg';
import { calculateLaborLoss } from '@/lib/improve/cost-engine';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

function getClient() {
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const client = getClient();
  try {
    await client.connect();

    const query = `
      SELECT 
        o.*,
        d.department_name,
        d.department_code,
        l.line_name,
        l.line_code,
        s.station_name,
        s.station_code,
        COALESCE(
          (SELECT json_agg(m.*) FROM improve_observation_media m WHERE m.observation_id = o.id),
          '[]'::json
        ) as media,
        COALESCE(
          (SELECT json_agg(ai.* ORDER BY ai.created_at DESC) FROM improve_ai_analysis ai WHERE ai.observation_id = o.id),
          '[]'::json
        ) as ai_analysis,
        (SELECT row_to_json(hv.*) FROM improve_human_validations hv WHERE hv.observation_id = o.id ORDER BY hv.confirmed_at DESC LIMIT 1) as validation,
        (SELECT row_to_json(lc.*) FROM improve_loss_calculations lc WHERE lc.observation_id = o.id ORDER BY lc.created_at DESC LIMIT 1) as loss_calc,
        COALESCE(
          (SELECT json_agg(p.*) FROM improve_projects p 
           JOIN improve_project_observations po ON po.project_id = p.id 
           WHERE po.observation_id = o.id),
          '[]'::json
        ) as linked_projects
      FROM improve_observations o
      LEFT JOIN departments d ON o.department_id = d.id
      LEFT JOIN improve_lines l ON o.line_id = l.id
      LEFT JOIN improve_stations s ON o.station_id = s.id
      WHERE o.id = $1
    `;

    const res = await client.query(query, [id]);
    await client.end();

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Observation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    console.error('Error fetching observation:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const client = getClient();
  try {
    const body = await request.json();
    const {
      action_type, // 'VALIDATE', 'CALCULATE_LOSS', 'UPDATE_STATUS'
      reviewer_name = 'Supervisor',
      decision, // 'ACCEPTED', 'EDITED', 'REJECTED'
      confirmed_primary_waste,
      confirmed_secondary_waste,
      confirmed_root_cause,
      confirmed_severity,
      reviewer_comment,
      // Loss inputs
      lost_minutes_per_occ,
      frequency_per_shift,
      shifts_per_day,
      working_days_per_month,
      number_of_people,
      labor_cost_rate,
      new_status
    } = body;

    await client.connect();

    if (action_type === 'VALIDATE') {
      // 1. Insert Human Validation Record
      await client.query(`
        INSERT INTO improve_human_validations (
          observation_id,
          decision,
          confirmed_primary_waste,
          confirmed_secondary_waste,
          confirmed_root_cause,
          confirmed_severity,
          reviewer_name,
          reviewer_comment,
          confirmed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        id,
        decision || 'ACCEPTED',
        confirmed_primary_waste,
        confirmed_secondary_waste,
        confirmed_root_cause,
        confirmed_severity,
        reviewer_name,
        reviewer_comment
      ]);

      // 2. Update Observation Status to VALIDATED
      await client.query(`
        UPDATE improve_observations
        SET status = 'VALIDATED',
            severity = COALESCE($1, severity),
            updated_at = NOW()
        WHERE id = $2
      `, [confirmed_severity, id]);

      // 3. Write Audit Log
      await client.query(`
        INSERT INTO improve_audit_logs (entity_type, entity_id, action, performed_by, new_value, reason)
        VALUES ('OBSERVATION', $1, 'VALIDATE', $2, $3, $4)
      `, [id, reviewer_name, JSON.stringify(body), reviewer_comment || 'Observation validated by human reviewer']);
    } else if (action_type === 'CALCULATE_LOSS') {
      // Calculate Loss via Cost Engine
      const lossResult = calculateLaborLoss({
        lostMinutesPerOcc: Number(lost_minutes_per_occ) || 0,
        frequencyPerShift: Number(frequency_per_shift) || 0,
        shiftsPerDay: Number(shifts_per_day) || 1,
        workingDaysPerMonth: Number(working_days_per_month) || 26,
        numberOfPeople: Number(number_of_people) || 1,
        laborCostRate: Number(labor_cost_rate) || 85.0
      });

      // Upsert Loss Calculation
      await client.query(`
        INSERT INTO improve_loss_calculations (
          observation_id,
          loss_type,
          lost_minutes_per_occ,
          frequency_per_shift,
          shifts_per_day,
          working_days_per_month,
          number_of_people,
          labor_cost_rate,
          lost_hours_per_month,
          monthly_loss_thb,
          annual_loss_thb,
          assumptions,
          updated_at
        ) VALUES ($1, 'LABOR_LOSS', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        id,
        lost_minutes_per_occ,
        frequency_per_shift,
        shifts_per_day,
        working_days_per_month,
        number_of_people,
        labor_cost_rate,
        lossResult.lostHoursPerMonth,
        lossResult.monthlyLossThb,
        lossResult.annualLossThb,
        lossResult.assumptionText
      ]);

      // Cache summary on observation record
      await client.query(`
        UPDATE improve_observations
        SET estimated_monthly_loss = $1,
            estimated_annual_loss = $2,
            potential_saving = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [lossResult.monthlyLossThb, lossResult.annualLossThb, id]);
    } else if (action_type === 'UPDATE_STATUS') {
      await client.query(`
        UPDATE improve_observations
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, [new_status, id]);
    }

    await client.end();
    return NextResponse.json({ success: true, message: 'Observation updated successfully' });
  } catch (error: any) {
    console.error('Error updating observation:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
