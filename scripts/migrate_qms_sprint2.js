const pg = require('pg');
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function runMigration() {
  console.log('\n===============================================================');
  console.log('COSMEFLOW ASSURANCE — DATABASE MIGRATION SPRINT 2');
  console.log('INVESTIGATION COCKPIT + ROOT CAUSE ANALYSIS (ISO 22716 / ASEAN GMP)');
  console.log('===============================================================\n');

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database successfully.');

    // 1. Create qms_investigations table
    console.log('Creating table qms_investigations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS qms_investigations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_no VARCHAR(50) UNIQUE NOT NULL,
        quality_event_id UUID NOT NULL REFERENCES qms_quality_events(id) ON DELETE CASCADE,
        
        -- Lead Investigator & Assignment
        assigned_lead_id UUID,
        assigned_lead_name VARCHAR(150),
        department_id UUID,
        target_due_date TIMESTAMPTZ NOT NULL,
        
        -- State Machine: NOT_STARTED -> IN_INVESTIGATION -> WAITING_INFORMATION -> RCA_DRAFT -> QA_REVIEW -> COMPLETED
        current_status VARCHAR(40) NOT NULL DEFAULT 'NOT_STARTED',
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        
        -- Investigation 12-Question Framework (JSONB)
        question_framework JSONB NOT NULL DEFAULT '{
          "what_happened": "",
          "what_should_have_happened": "",
          "confirmed_gap": "",
          "when_occurred": "",
          "where_occurred": "",
          "when_detected": "",
          "who_process_involved": "",
          "quantity_batches_affected": "",
          "what_changed_before_event": "",
          "has_happened_before": false,
          "recurrence_details": "",
          "missing_information": ""
        }'::jsonb,
        
        -- Root Cause Analysis (RCA) Configuration & Data
        rca_tool VARCHAR(30) DEFAULT '5_WHY', -- '5_WHY', 'FISHBONE_6M', 'SIMPLE_STATEMENT'
        five_whys JSONB DEFAULT '[]'::jsonb,
        fishbone_6m JSONB DEFAULT '{
          "man": [],
          "machine": [],
          "material": [],
          "method": [],
          "measurement": [],
          "environment": []
        }'::jsonb,
        simple_root_cause_statement TEXT,
        
        -- Root Cause Classification & Confirmation
        is_root_cause_confirmed BOOLEAN DEFAULT TRUE,
        root_cause_category VARCHAR(50), 
        -- 'MAN', 'MACHINE', 'MATERIAL', 'METHOD', 'MEASUREMENT', 'ENVIRONMENT', 'SUPPLIER', 'DOCUMENTATION', 'TRAINING', 'PROCESS_DESIGN', 'SYSTEM_MANAGEMENT', 'ROOT_CAUSE_NOT_CONFIRMED'
        root_cause_summary TEXT,
        unconfirmed_justification TEXT,
        
        -- Systemic Cause Assessment (Mandatory Guardrail if Human Error / MAN is proposed)
        systemic_cause_assessment JSONB DEFAULT '{
          "is_evaluated": false,
          "training_adequate": true,
          "sop_clarity_adequate": true,
          "workload_reasonable": true,
          "equipment_interface_clear": true,
          "ergonomics_suitable": true,
          "process_design_robust": true,
          "supervision_adequate": true,
          "environment_suitable": true,
          "system_controls_sufficient": true,
          "systemic_findings": "",
          "operator_error_justification": ""
        }'::jsonb,
        
        -- Immediate Correction (Distinct from Long-term Corrective Action)
        immediate_correction_description TEXT,
        immediate_correction_completed BOOLEAN DEFAULT FALSE,
        immediate_correction_verified_by VARCHAR(150),
        
        -- CAPA Decision Gate
        capa_required BOOLEAN,
        capa_system_recommendation VARCHAR(10), -- 'YES', 'NO'
        capa_recommendation_rationale TEXT,
        capa_decision_justification TEXT,
        capa_decided_by UUID,
        capa_decided_by_name VARCHAR(150),
        capa_decided_at TIMESTAMPTZ,
        
        -- QA Review & Approval
        investigation_summary TEXT,
        qa_review_notes TEXT,
        qa_approved_by UUID,
        qa_approved_by_name VARCHAR(150),
        qa_approved_at TIMESTAMPTZ,
        return_reason TEXT,
        
        -- Audit & Versioning
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Table qms_investigations created/verified.');

    // 2. Indexes for qms_investigations
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_qms_inv_qe ON qms_investigations(quality_event_id);
      CREATE INDEX IF NOT EXISTS idx_qms_inv_status ON qms_investigations(current_status);
      CREATE INDEX IF NOT EXISTS idx_qms_inv_lead ON qms_investigations(assigned_lead_id);
      CREATE INDEX IF NOT EXISTS idx_qms_inv_due ON qms_investigations(target_due_date);
    `);
    console.log('✓ Indexes for qms_investigations created/verified.');

    // 3. Create qms_investigation_evidence table
    console.log('Creating table qms_investigation_evidence...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS qms_investigation_evidence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id UUID NOT NULL REFERENCES qms_investigations(id) ON DELETE CASCADE,
        evidence_type VARCHAR(50) NOT NULL,
        -- 'PHOTO', 'DOCUMENT', 'QC_RESULT', 'SPECIFICATION', 'SOP_WI', 'BATCH_RECORD', 'MATERIAL_INFO', 'SUPPLIER_INFO', 'EQUIPMENT_INFO', 'TRAINING_RECORD', 'OTHER'
        title VARCHAR(255) NOT NULL,
        description TEXT,
        source VARCHAR(200),
        file_url TEXT,
        file_name VARCHAR(255),
        relationship_to_investigation TEXT,
        uploaded_by UUID,
        uploaded_by_name VARCHAR(150),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Table qms_investigation_evidence created/verified.');

    // 4. Create qms_investigation_timeline_events table
    console.log('Creating table qms_investigation_timeline_events...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS qms_investigation_timeline_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id UUID NOT NULL REFERENCES qms_investigations(id) ON DELETE CASCADE,
        event_timestamp TIMESTAMPTZ NOT NULL,
        event_title VARCHAR(200) NOT NULL,
        event_description TEXT,
        event_source VARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- 'SYSTEM', 'MANUAL', 'LOG', 'QC'
        milestone_type VARCHAR(50), 
        -- 'MATERIAL_RECEIVED', 'PRODUCTION_START', 'MIXING_START', 'QC_BULK', 'FILLING_START', 'PROBLEM_DETECTED', 'PRODUCTION_STOPPED', 'BATCH_HELD', 'QA_NOTIFIED', 'INVESTIGATION_START', 'OTHER'
        created_by UUID,
        created_by_name VARCHAR(150),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Table qms_investigation_timeline_events created/verified.');

    // 5. Enable RLS and public policies (matching CosmeFlow convention)
    await client.query(`
      ALTER TABLE qms_investigations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE qms_investigation_evidence ENABLE ROW LEVEL SECURITY;
      ALTER TABLE qms_investigation_timeline_events ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public access for qms_investigations" ON qms_investigations;
      CREATE POLICY "Public access for qms_investigations" ON qms_investigations FOR ALL USING (true);

      DROP POLICY IF EXISTS "Public access for qms_investigation_evidence" ON qms_investigation_evidence;
      CREATE POLICY "Public access for qms_investigation_evidence" ON qms_investigation_evidence FOR ALL USING (true);

      DROP POLICY IF EXISTS "Public access for qms_investigation_timeline_events" ON qms_investigation_timeline_events;
      CREATE POLICY "Public access for qms_investigation_timeline_events" ON qms_investigation_timeline_events FOR ALL USING (true);
    `);
    console.log('✓ RLS Policies applied.');

    console.log('\n===============================================================');
    console.log('MICRO-SPRINT 2 DATABASE SCHEMA MIGRATION COMPLETED SUCCESSFULLY');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
