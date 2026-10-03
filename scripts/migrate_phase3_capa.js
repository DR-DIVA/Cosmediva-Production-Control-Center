const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await pgClient.connect();
  console.log('Connected to DB for Phase 3 CAPA migration...');

  // 1. Create qms_capas table
  console.log('1. Creating qms_capas table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      capa_no VARCHAR(50) UNIQUE NOT NULL,
      quality_event_id UUID NOT NULL REFERENCES qms_quality_events(id),
      investigation_id UUID NOT NULL REFERENCES qms_investigations(id),
      title VARCHAR(255) NOT NULL,
      problem_statement TEXT NOT NULL,
      root_cause_summary TEXT NOT NULL,
      root_cause_category VARCHAR(50),
      capa_owner_id UUID NOT NULL,
      capa_owner_name VARCHAR(100) NOT NULL,
      department_id VARCHAR(50),
      department_name VARCHAR(100),
      priority VARCHAR(20) DEFAULT 'MEDIUM',
      target_due_date TIMESTAMPTZ NOT NULL,
      original_due_date TIMESTAMPTZ NOT NULL,
      current_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
      correction_plan TEXT,
      corrective_action_plan TEXT,
      preventive_improvement_plan TEXT,
      qa_coordinator_id UUID,
      qa_coordinator_name VARCHAR(100),
      approved_by UUID,
      approved_by_name VARCHAR(100),
      approved_at TIMESTAMPTZ,
      snapshot_context JSONB,
      record_version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Create qms_capa_actions table
  console.log('2. Creating qms_capa_actions table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      capa_id UUID NOT NULL REFERENCES qms_capas(id) ON DELETE CASCADE,
      action_no INT NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      responsible_owner_id UUID NOT NULL,
      responsible_owner_name VARCHAR(100) NOT NULL,
      department_id VARCHAR(50),
      department_name VARCHAR(100) NOT NULL,
      due_date TIMESTAMPTZ NOT NULL,
      original_due_date TIMESTAMPTZ NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
      evidence_required TEXT,
      implementation_notes TEXT,
      completed_at TIMESTAMPTZ,
      completed_by UUID,
      completed_by_name VARCHAR(100),
      verification_decision VARCHAR(50),
      verified_at TIMESTAMPTZ,
      verified_by UUID,
      verified_by_name VARCHAR(100),
      verification_comment TEXT,
      return_reason TEXT,
      returned_at TIMESTAMPTZ,
      returned_by UUID,
      returned_by_name VARCHAR(100),
      record_version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Create qms_capa_action_extensions table
  console.log('3. Creating qms_capa_action_extensions table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_action_extensions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action_id UUID NOT NULL REFERENCES qms_capa_actions(id) ON DELETE CASCADE,
      original_due_date TIMESTAMPTZ NOT NULL,
      new_due_date TIMESTAMPTZ NOT NULL,
      extension_reason TEXT NOT NULL,
      requested_by UUID NOT NULL,
      requested_by_name VARCHAR(100) NOT NULL,
      approved_by UUID,
      approved_by_name VARCHAR(100),
      approved_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'APPROVED',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 4. Create qms_capa_evidence table
  console.log('4. Creating qms_capa_evidence table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      capa_id UUID NOT NULL REFERENCES qms_capas(id) ON DELETE CASCADE,
      action_id UUID REFERENCES qms_capa_actions(id) ON DELETE SET NULL,
      evidence_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      source VARCHAR(255),
      file_url TEXT,
      file_name VARCHAR(255),
      linked_record_type VARCHAR(50),
      linked_record_id VARCHAR(100),
      uploaded_by UUID NOT NULL,
      uploaded_by_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Create Performance Indexes
  console.log('5. Creating indexes...');
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_qms_capas_quality_event_id ON qms_capas(quality_event_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capas_investigation_id ON qms_capas(investigation_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capas_owner_id ON qms_capas(capa_owner_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capas_status ON qms_capas(current_status);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_actions_capa_id ON qms_capa_actions(capa_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_actions_owner ON qms_capa_actions(responsible_owner_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_actions_status ON qms_capa_actions(status);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_actions_due ON qms_capa_actions(due_date);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_evidence_capa_id ON qms_capa_evidence(capa_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_evidence_action_id ON qms_capa_evidence(action_id);
  `);

  // Test sequence generator
  const currentYear = new Date().getFullYear().toString();
  const testSeq = await pgClient.query("SELECT qms_get_next_number('CAPA', $1) AS num", [currentYear]);
  console.log(`6. Tested sequence generator: ${testSeq.rows[0].num}`);

  console.log('✅ Phase 3 CAPA Database Migration Complete!');
  await pgClient.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
