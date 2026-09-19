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
  console.log('Connected to Supabase PostgreSQL.');

  const sql = `
    CREATE TABLE IF NOT EXISTS maintenance_pm_adjustment_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pm_plan_id UUID REFERENCES maintenance_pm_plans(id) ON DELETE CASCADE,
      machine_id UUID REFERENCES maintenance_machines(id) ON DELETE CASCADE,
      machine_code VARCHAR(50) NOT NULL,
      old_frequency_type VARCHAR(50),
      new_frequency_type VARCHAR(50) NOT NULL,
      old_frequency_interval INT,
      new_frequency_interval INT NOT NULL,
      old_due_date DATE,
      new_due_date DATE,
      reason TEXT NOT NULL,
      adjusted_by_name VARCHAR(150) NOT NULL DEFAULT 'Supervisor',
      adjusted_by_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_maint_pm_adj_plan ON maintenance_pm_adjustment_logs(pm_plan_id);
    CREATE INDEX IF NOT EXISTS idx_maint_pm_adj_machine ON maintenance_pm_adjustment_logs(machine_code);
  `;

  await client.query(sql);
  console.log('maintenance_pm_adjustment_logs table verified/created successfully.');
  await client.end();
}

main().catch(err => console.error(err));
