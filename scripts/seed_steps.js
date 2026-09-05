const pg = require('pg');
const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected! Seeding approval_workflow_steps...');

  const wfs = await client.query('SELECT id, workflow_code FROM approval_workflows;');
  const wfMap = new Map(wfs.rows.map(w => [w.workflow_code, w.id]));

  // Standard Leave steps
  const stdId = wfMap.get('STANDARD_LEAVE');
  if (stdId) {
    await client.query(`
      INSERT INTO approval_workflow_steps (workflow_id, step_number, approver_role, condition_rule)
      VALUES 
        ($1, 1, 'SUPERVISOR', '{"max_days": 2}'::jsonb),
        ($1, 2, 'MANAGER', '{"min_days": 2.01}'::jsonb)
      ON CONFLICT (workflow_id, step_number) DO UPDATE SET approver_role = EXCLUDED.approver_role;
    `, [stdId]);
  }

  // Extended Leave steps
  const extId = wfMap.get('EXTENDED_LEAVE');
  if (extId) {
    await client.query(`
      INSERT INTO approval_workflow_steps (workflow_id, step_number, approver_role, condition_rule)
      VALUES 
        ($1, 1, 'SUPERVISOR', NULL),
        ($1, 2, 'MANAGER', NULL),
        ($1, 3, 'HR_MANAGER', NULL)
      ON CONFLICT (workflow_id, step_number) DO UPDATE SET approver_role = EXCLUDED.approver_role;
    `, [extId]);
  }

  // Attendance Correction steps
  const attId = wfMap.get('ATTENDANCE_CORRECTION');
  if (attId) {
    await client.query(`
      INSERT INTO approval_workflow_steps (workflow_id, step_number, approver_role, condition_rule)
      VALUES 
        ($1, 1, 'SUPERVISOR', NULL),
        ($1, 2, 'HR_OFFICER', NULL)
      ON CONFLICT (workflow_id, step_number) DO UPDATE SET approver_role = EXCLUDED.approver_role;
    `, [attId]);
  }

  console.log('approval_workflow_steps seeded successfully!');

  // Also ensure domain_events has standard baseline events for system startup
  const baselineEvents = [
    { name: 'attendance.calculated', type: 'attendance_daily', payload: { date: '2026-09-05', note: 'System initial calculation' } },
    { name: 'leave.approved', type: 'leave_requests', payload: { note: 'Historical approved leave' } },
    { name: 'attendance.correction_approved', type: 'attendance_adjustments', payload: { note: 'Historical approved correction' } }
  ];

  for (const ev of baselineEvents) {
    await client.query(`
      INSERT INTO domain_events (event_name, entity_type, payload)
      VALUES ($1, $2, $3::jsonb);
    `, [ev.name, ev.type, JSON.stringify(ev.payload)]);
  }

  console.log('Baseline domain events seeded successfully!');
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
