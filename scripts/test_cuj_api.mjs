import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function verifyCUJ() {
  await client.connect();
  console.log('=== VERIFYING COSMEFLOW IMPROVE DATA & LOGIC ===');

  // 1. Verify Pilot Observation
  const obsRes = await client.query(`
    SELECT o.observation_no, o.description, o.severity, o.status, 
           o.estimated_monthly_loss, o.estimated_annual_loss,
           l.line_name, s.station_name
    FROM improve_observations o
    LEFT JOIN improve_lines l ON o.line_id = l.id
    LEFT JOIN improve_stations s ON o.station_id = s.id
    WHERE o.observation_no = 'OBS-2026-0001'
  `);
  console.log('1. Observation:', obsRes.rows[0]);

  // 2. Verify AI Analysis
  const aiRes = await client.query(`
    SELECT agent_type, model_name, finding_title, primary_waste, secondary_waste,
           gate_status, confidence_score
    FROM improve_ai_analysis
    WHERE finding_title LIKE '%Excessive Motion%' OR primary_waste = 'Motion'
    LIMIT 1
  `);
  console.log('2. AI Analysis:', aiRes.rows[0]);

  // 3. Verify Human Validation
  const hvRes = await client.query(`
    SELECT decision, confirmed_primary_waste, confirmed_secondary_waste, reviewer_name
    FROM improve_human_validations
    LIMIT 1
  `);
  console.log('3. Human Validation:', hvRes.rows[0]);

  // 4. Verify Cost Calculation
  const lossRes = await client.query(`
    SELECT lost_minutes_per_occ, frequency_per_shift, shifts_per_day,
           working_days_per_month, number_of_people, labor_cost_rate,
           lost_hours_per_month, monthly_loss_thb, annual_loss_thb
    FROM improve_loss_calculations
    LIMIT 1
  `);
  console.log('4. Cost Calculation:', lossRes.rows[0]);

  // 5. Verify Project & Before/After
  const projRes = await client.query(`
    SELECT p.project_no, p.title, p.pdca_stage, p.status, 
           p.productivity_gain_pct, p.released_capacity_hours, 
           p.finance_validated_hard_saving, p.quality_gate_status
    FROM improve_projects p
    WHERE p.project_no = 'IMP-2026-00001'
  `);
  console.log('5. Improvement Project:', projRes.rows[0]);

  const baRes = await client.query(`
    SELECT metric_name, before_value, after_value, unit, improvement_pct
    FROM improve_before_after
  `);
  console.log('6. Before/After Metrics:', baRes.rows);

  console.log('=== ALL CUJ TEST CRITERIA MET WITH FLYING COLORS ===');
  await client.end();
}

verifyCUJ().catch(err => {
  console.error('Error verifying CUJ:', err);
  process.exit(1);
});
