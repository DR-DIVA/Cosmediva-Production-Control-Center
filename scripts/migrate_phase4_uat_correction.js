const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const pgClient = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await pgClient.connect();
  console.log('Connected to DB for Phase 4 UAT Correction 01 migration...');

  // 1. Add QA Disposition columns to qms_capa_effectiveness_plans
  console.log('1. Altering qms_capa_effectiveness_plans for QA Disposition...');
  await pgClient.query(`
    ALTER TABLE qms_capa_effectiveness_plans
    ADD COLUMN IF NOT EXISTS qa_disposition_paths TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS qa_disposition_rationale TEXT,
    ADD COLUMN IF NOT EXISTS qa_disposition_decided_by UUID,
    ADD COLUMN IF NOT EXISTS qa_disposition_decided_by_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS qa_disposition_decided_at TIMESTAMPTZ;
  `);

  // 2. Add Revision columns to qms_capas
  console.log('2. Altering qms_capas for Controlled CAPA Revision...');
  await pgClient.query(`
    ALTER TABLE qms_capas
    ADD COLUMN IF NOT EXISTS capa_revision_version INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS last_revision_reason TEXT,
    ADD COLUMN IF NOT EXISTS last_revision_eff_ref VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_revision_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_revision_by UUID,
    ADD COLUMN IF NOT EXISTS last_revision_by_name VARCHAR(150);
  `);

  // 3. Add Revision columns to qms_capa_actions
  console.log('3. Altering qms_capa_actions for Revision provenance...');
  await pgClient.query(`
    ALTER TABLE qms_capa_actions
    ADD COLUMN IF NOT EXISTS created_in_revision INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_revision_action BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS effectiveness_decision_ref VARCHAR(100);
  `);

  // 4. Create qms_capa_revisions table for audit integrity
  console.log('4. Creating qms_capa_revisions table...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS qms_capa_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      capa_id UUID NOT NULL REFERENCES qms_capas(id) ON DELETE CASCADE,
      revision_no INT NOT NULL,
      revision_reason TEXT NOT NULL,
      effectiveness_decision_ref VARCHAR(100),
      created_by UUID NOT NULL,
      created_by_name VARCHAR(150) NOT NULL,
      approved_by UUID NOT NULL,
      approved_by_name VARCHAR(150) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Clean test data: Remove auto-generated follow-up Actions created by incorrect Phase 4 logic
  console.log('5. Cleaning auto-generated follow-up actions...');
  const res = await pgClient.query(`
    DELETE FROM qms_capa_actions
    WHERE title LIKE '%[CAPA Follow-up]%'
    RETURNING id, capa_id, title;
  `);
  console.log(`Deleted ${res.rowCount} auto-generated follow-up action(s).`);

  // 6. Restore CAPA-2026-0004 for Phase 4 UAT
  console.log('6. Restoring CAPA-2026-0004 context for Phase 4 UAT...');
  // Ensure CAPA-2026-0004 has status = 'AWAITING_EFFECTIVENESS', all 3 actions VERIFIED
  await pgClient.query(`
    UPDATE qms_capas
    SET current_status = 'AWAITING_EFFECTIVENESS',
        effectiveness_status = 'AWAITING_EVALUATION',
        capa_revision_version = 1,
        closed_at = NULL,
        closed_by = NULL,
        closed_by_name = NULL,
        closure_conclusion = NULL,
        updated_at = NOW()
    WHERE capa_no = 'CAPA-2026-0004';
  `);

  // Reset or clear final decision on CAPA-2026-0004 plan so user can test fresh
  await pgClient.query(`
    UPDATE qms_capa_effectiveness_plans
    SET final_decision = NULL,
        qa_conclusion = NULL,
        qa_disposition_paths = '{}',
        qa_disposition_rationale = NULL,
        qa_disposition_decided_by = NULL,
        qa_disposition_decided_by_name = NULL,
        qa_disposition_decided_at = NULL,
        actual_review_date = NULL,
        status = 'PLANNED',
        additional_actions_required = FALSE,
        additional_actions_description = NULL,
        updated_at = NOW()
    WHERE capa_id IN (SELECT id FROM qms_capas WHERE capa_no = 'CAPA-2026-0004');
  `);

  // Also reset any other demo CAPAs that had been accidentally reopened by the old test
  await pgClient.query(`
    UPDATE qms_capas
    SET current_status = 'AWAITING_EFFECTIVENESS',
        effectiveness_status = 'AWAITING_EVALUATION',
        updated_at = NOW()
    WHERE capa_no IN ('CAPA-2026-0005', 'CAPA-2026-0006', 'CAPA-2026-0007')
      AND current_status = 'REOPENED_FOR_ACTION';
  `);

  console.log('Phase 4 UAT Correction 01 migration completed successfully!');
  await pgClient.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
