import pg from 'pg';
const { Client } = pg;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const client = new Client({
  connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB for PM verification test.');

  // 1. Fetch a sample PM plan
  const planRes = await client.query('SELECT * FROM maintenance_pm_plans LIMIT 1');
  const plan = planRes.rows[0];
  console.log('Sample plan loaded:', plan.plan_code, plan.machine_code, plan.frequency_type);

  // 2. Test inserting an adjustment log directly
  const testReason = 'ทดสอบระบบปรับเปลี่ยนความถี่รอบ PM: เครื่องจักรเดินกำลังผลิตสูง';
  const insRes = await client.query(`
    INSERT INTO maintenance_pm_adjustment_logs (
      pm_plan_id, machine_id, machine_code,
      old_frequency_type, new_frequency_type,
      old_frequency_interval, new_frequency_interval,
      old_due_date, new_due_date,
      reason, adjusted_by_name
    ) VALUES (
      $1, $2, $3, $4, 'Monthly', $5, 1, $6, '2026-10-01', $7, 'Admin Supervisor'
    ) RETURNING id, reason, created_at;
  `, [
    plan.id, plan.machine_id, plan.machine_code,
    plan.frequency_type, plan.frequency_interval, plan.next_due_date,
    testReason
  ]);

  console.log('Adjustment log created successfully:', insRes.rows[0]);

  // 3. Verify querying adjustment logs
  const logsRes = await client.query('SELECT * FROM maintenance_pm_adjustment_logs WHERE pm_plan_id = $1', [plan.id]);
  console.log(`Found ${logsRes.rows.length} log(s) for plan ${plan.plan_code}.`);

  await client.end();
  console.log('All PM verification tests PASSED.');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
