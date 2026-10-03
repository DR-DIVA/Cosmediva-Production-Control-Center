const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await pgClient.connect();
  console.log('Connected to DB for Phase 4 Effectiveness & Recurrence Monitoring migration...');

  // 1. Update qms_capas with closure and effectiveness columns
  console.log('1. Altering qms_capas to add closure and effectiveness columns...');
  await pgClient.query(`
    ALTER TABLE qms_capas
    ADD COLUMN IF NOT EXISTS effectiveness_status VARCHAR(50) DEFAULT 'NOT_STARTED',
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_by UUID,
    ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS closure_conclusion TEXT;
  `);

  // 2. Create qms_capa_effectiveness_plans table
  console.log('2. Creating qms_capa_effectiveness_plans table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_effectiveness_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      capa_id UUID NOT NULL REFERENCES qms_capas(id) ON DELETE CASCADE,
      plan_no VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      objective TEXT,
      scope_type VARCHAR(50) NOT NULL DEFAULT 'CONSECUTIVE_BATCHES',
      scope_target_count INT DEFAULT 5,
      scope_description TEXT,
      start_date TIMESTAMPTZ DEFAULT NOW(),
      target_due_date DATE NOT NULL,
      actual_review_date TIMESTAMPTZ,
      responsible_owner_id UUID NOT NULL,
      responsible_owner_name VARCHAR(150) NOT NULL,
      reviewer_id UUID,
      reviewer_name VARCHAR(150),
      status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
      final_decision VARCHAR(50),
      qa_conclusion TEXT,
      supporting_evidence_summary TEXT,
      additional_actions_required BOOLEAN DEFAULT FALSE,
      additional_actions_description TEXT,
      early_termination_reason TEXT,
      record_version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Create qms_capa_effectiveness_criteria table
  console.log('3. Creating qms_capa_effectiveness_criteria table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_effectiveness_criteria (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES qms_capa_effectiveness_plans(id) ON DELETE CASCADE,
      capa_id UUID NOT NULL REFERENCES qms_capas(id) ON DELETE CASCADE,
      criterion_no INT NOT NULL,
      criterion_type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      measurable_target TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 4. Create qms_capa_effectiveness_results table
  console.log('4. Creating qms_capa_effectiveness_results table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_effectiveness_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES qms_capa_effectiveness_plans(id) ON DELETE CASCADE,
      criterion_id UUID REFERENCES qms_capa_effectiveness_criteria(id) ON DELETE SET NULL,
      capa_id UUID NOT NULL REFERENCES qms_capas(id) ON DELETE CASCADE,
      sample_no INT NOT NULL,
      batch_lot_no VARCHAR(100),
      production_date DATE,
      result_source VARCHAR(50) NOT NULL DEFAULT 'LINKED_SYSTEM',
      linked_record_type VARCHAR(50),
      linked_record_id VARCHAR(100),
      linked_record_ref VARCHAR(100),
      measured_value TEXT,
      specification_target TEXT,
      evaluation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      evidence_url TEXT,
      notes TEXT,
      evaluated_by UUID,
      evaluated_by_name VARCHAR(150),
      evaluated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Create qms_capa_recurrence_reviews table
  console.log('5. Creating qms_capa_recurrence_reviews table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_recurrence_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      capa_id UUID NOT NULL REFERENCES qms_capas(id) ON DELETE CASCADE,
      plan_id UUID REFERENCES qms_capa_effectiveness_plans(id) ON DELETE CASCADE,
      related_event_id UUID NOT NULL REFERENCES qms_quality_events(id) ON DELETE CASCADE,
      matching_dimension VARCHAR(100),
      system_detected_at TIMESTAMPTZ DEFAULT NOW(),
      review_status VARCHAR(50) NOT NULL DEFAULT 'POTENTIAL_RECURRENCE',
      qa_decision_notes TEXT,
      reviewed_by UUID,
      reviewed_by_name VARCHAR(150),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Indexes for high performance
  await pgClient.query(`
    CREATE INDEX IF NOT EXISTS idx_qms_capa_eff_plans_capa_id ON qms_capa_effectiveness_plans(capa_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_eff_crit_plan_id ON qms_capa_effectiveness_criteria(plan_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_eff_results_plan_id ON qms_capa_effectiveness_results(plan_id);
    CREATE INDEX IF NOT EXISTS idx_qms_capa_recurrence_capa_id ON qms_capa_recurrence_reviews(capa_id);
  `);

  console.log('✅ Phase 4 Effectiveness & Recurrence Monitoring migration completed successfully!');
  await pgClient.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
