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
    CREATE TABLE IF NOT EXISTS maintenance_machine_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_number VARCHAR(50) UNIQUE NOT NULL,
      request_type VARCHAR(50) NOT NULL,
      machine_id UUID REFERENCES maintenance_machines(id) ON DELETE SET NULL,
      machine_code VARCHAR(50) NOT NULL,
      machine_name VARCHAR(255) NOT NULL,
      current_department VARCHAR(150),
      current_location VARCHAR(150),
      target_department VARCHAR(150),
      target_location VARCHAR(150),
      proposed_machine_data JSONB,
      reason TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      requested_by_name VARCHAR(150) NOT NULL,
      requested_by_dept VARCHAR(150),
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by_name VARCHAR(150),
      reviewed_at TIMESTAMPTZ,
      approved_by_name VARCHAR(150),
      approved_at TIMESTAMPTZ,
      approver_comment TEXT,
      rejection_reason TEXT,
      execution_status VARCHAR(50) DEFAULT 'PENDING',
      dcc_doc_code VARCHAR(50) DEFAULT 'MT-PF-002',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_maint_mach_req_status ON maintenance_machine_requests(status);
    CREATE INDEX IF NOT EXISTS idx_maint_mach_req_type ON maintenance_machine_requests(request_type);
    CREATE INDEX IF NOT EXISTS idx_maint_mach_req_mach ON maintenance_machine_requests(machine_code);
  `;

  await client.query(sql);
  console.log('maintenance_machine_requests table created/verified successfully.');
  await client.end();
}

main().catch(err => {
  console.error('Error creating table:', err);
  process.exit(1);
});
