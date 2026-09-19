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
    CREATE TABLE IF NOT EXISTS maintenance_machine_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      machine_id UUID REFERENCES maintenance_machines(id) ON DELETE CASCADE,
      machine_code VARCHAR(50) NOT NULL,
      machine_name VARCHAR(255) NOT NULL,
      edited_by_name VARCHAR(150) NOT NULL,
      edit_reason TEXT NOT NULL,
      changes_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_maint_machine_audit_machine_id ON maintenance_machine_audit_logs(machine_id);
    CREATE INDEX IF NOT EXISTS idx_maint_machine_audit_machine_code ON maintenance_machine_audit_logs(machine_code);
    CREATE INDEX IF NOT EXISTS idx_maint_machine_audit_created_at ON maintenance_machine_audit_logs(created_at DESC);
  `;

  await client.query(sql);
  console.log('maintenance_machine_audit_logs table created successfully.');
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
