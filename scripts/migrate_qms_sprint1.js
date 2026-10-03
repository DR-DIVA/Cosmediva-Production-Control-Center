const pg = require('pg');
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await client.connect();
  console.log('Connected to Supabase. Running Micro-Sprint 1 QMS migrations...');

  const sql = `
    -- 1. Numbering Sequences Table & Function
    CREATE TABLE IF NOT EXISTS qms_numbering_sequences (
      prefix VARCHAR(10) NOT NULL,
      year_code CHAR(4) NOT NULL,
      current_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (prefix, year_code)
    );

    CREATE OR REPLACE FUNCTION qms_get_next_number(p_prefix VARCHAR, p_year VARCHAR) 
    RETURNS VARCHAR AS $$
    DECLARE
      v_next_val INTEGER;
      v_formatted VARCHAR(32);
    BEGIN
      INSERT INTO qms_numbering_sequences (prefix, year_code, current_value)
      VALUES (p_prefix, p_year, 1)
      ON CONFLICT (prefix, year_code) 
      DO UPDATE SET current_value = qms_numbering_sequences.current_value + 1
      RETURNING current_value INTO v_next_val;
      
      v_formatted := p_prefix || '-' || p_year || '-' || LPAD(v_next_val::TEXT, 4, '0');
      RETURN v_formatted;
    END;
    $$ LANGUAGE plpgsql;

    -- 2. Quality Events Hub Table
    CREATE TABLE IF NOT EXISTS qms_quality_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_no VARCHAR(32) NOT NULL UNIQUE,
      event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Reporter & Location Context
      reported_by UUID NOT NULL,
      reporter_name VARCHAR(150),
      department_id UUID,
      room_id UUID,
      process_id UUID,
      
      -- Material & Manufacturing Context
      product_id UUID,
      production_lot_id UUID,
      material_type VARCHAR(20) DEFAULT 'NONE',
      material_lot_no VARCHAR(100),
      supplier_name VARCHAR(200),
      equipment_code VARCHAR(50),
      
      -- Modular Regulatory Overlay (e.g. DOMESTIC_TH, USA_MOCRA, UAE_GSO, CAMBODIA_CLMV)
      destination_market VARCHAR(50) DEFAULT 'DOMESTIC_TH',
      
      -- Immutable Historical Snapshot (Schema v1.0)
      snapshot_context JSONB NOT NULL DEFAULT '{}'::jsonb,
      
      -- Descriptive Fields
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      expected_condition TEXT,
      actual_condition TEXT,
      immediate_action_taken TEXT,
      quantity_affected NUMERIC(12,2),
      quantity_unit VARCHAR(30) DEFAULT 'ชิ้น',
      
      -- AI Pre-Triage Recommendation
      ai_suggested_type VARCHAR(50),
      ai_suggested_severity VARCHAR(20),
      ai_suggested_risk VARCHAR(20),
      ai_confidence_score NUMERIC(3,2),
      ai_rationale TEXT,
      
      -- QA Confirmed Classification & Triage
      qa_confirmed_type VARCHAR(50),
      qa_confirmed_severity VARCHAR(20),
      risk_level VARCHAR(20) DEFAULT 'LOW',
      workflow_path VARCHAR(30) DEFAULT 'FAST_TRACK',
      qa_classification_notes TEXT,
      qa_classified_by UUID,
      qa_classified_at TIMESTAMPTZ,
      
      -- Containment
      containment_required BOOLEAN DEFAULT FALSE,
      containment_status VARCHAR(30) DEFAULT 'NOT_REQUIRED',
      
      -- State Machine
      current_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
      
      -- Evidence Attachments
      attachment_urls JSONB DEFAULT '[]'::jsonb,
      
      -- Fast-Track Direct Correction Fields
      correction_notes TEXT,
      correction_evidence_url TEXT,
      
      -- Closure & Disposition
      qa_closure_notes TEXT,
      qa_closed_by UUID,
      qa_closed_at TIMESTAMPTZ,
      
      -- Controlled Reopen
      reopen_reason TEXT,
      reopened_by UUID,
      reopened_at TIMESTAMPTZ,
      
      -- Metadata
      record_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qms_qe_status ON qms_quality_events(current_status);
    CREATE INDEX IF NOT EXISTS idx_qms_qe_date ON qms_quality_events(event_date DESC);
    CREATE INDEX IF NOT EXISTS idx_qms_qe_lot ON qms_quality_events(production_lot_id);
    CREATE INDEX IF NOT EXISTS idx_qms_qe_prod ON qms_quality_events(product_id);
    CREATE INDEX IF NOT EXISTS idx_qms_qe_severity ON qms_quality_events(qa_confirmed_severity);

    -- 3. Immediate Containment Actions Table
    CREATE TABLE IF NOT EXISTS qms_event_containment_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quality_event_id UUID NOT NULL REFERENCES qms_quality_events(id) ON DELETE CASCADE,
      action_type VARCHAR(50) NOT NULL,
      item_reference VARCHAR(100) NOT NULL,
      action_description TEXT NOT NULL,
      assigned_to UUID NOT NULL,
      assigned_to_name VARCHAR(150),
      department_id UUID,
      due_date TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      executed_at TIMESTAMPTZ,
      execution_notes TEXT,
      evidence_attachment_url TEXT,
      qa_verified_by UUID,
      qa_verified_by_name VARCHAR(150),
      qa_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qms_containment_qe ON qms_event_containment_actions(quality_event_id);
    CREATE INDEX IF NOT EXISTS idx_qms_containment_status ON qms_event_containment_actions(status);

    -- 4. Electronic Signatures Table (Practical Cosmetics GMP)
    CREATE TABLE IF NOT EXISTS qms_electronic_signatures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      signer_user_id UUID NOT NULL,
      signer_name VARCHAR(150) NOT NULL,
      signer_role VARCHAR(50) NOT NULL,
      signature_meaning VARCHAR(50) NOT NULL,
      signature_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      record_version INTEGER NOT NULL DEFAULT 1,
      reason_comment TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_qms_esig_entity ON qms_electronic_signatures(entity_type, entity_id);

    -- 5. Audit Trail Ledger (ALCOA+ Traceable)
    CREATE TABLE IF NOT EXISTS qms_audit_trail (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name VARCHAR(64) NOT NULL,
      record_id UUID NOT NULL,
      action_type VARCHAR(32) NOT NULL,
      record_version INTEGER NOT NULL DEFAULT 1,
      before_value JSONB,
      after_value JSONB,
      changed_fields JSONB,
      changed_by UUID,
      changed_by_name VARCHAR(150),
      changed_by_role VARCHAR(50),
      change_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qms_audit_record ON qms_audit_trail(table_name, record_id);
    CREATE INDEX IF NOT EXISTS idx_qms_audit_date ON qms_audit_trail(created_at DESC);

    -- 6. In-App Notifications Table
    CREATE TABLE IF NOT EXISTS qms_inapp_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_user_id UUID NOT NULL,
      recipient_role VARCHAR(50),
      event_severity VARCHAR(20) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      link_url VARCHAR(255) NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      requires_acknowledgement BOOLEAN DEFAULT FALSE,
      acknowledged_at TIMESTAMPTZ,
      acknowledged_by UUID,
      acknowledged_by_name VARCHAR(150),
      escalation_level INTEGER DEFAULT 1,
      channels_dispatched JSONB DEFAULT '{"in_app": true}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qms_notif_recipient ON qms_inapp_notifications(recipient_user_id, is_read);

    -- 7. Escalation Rules Engine
    CREATE TABLE IF NOT EXISTS qms_escalation_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_severity VARCHAR(20) NOT NULL,
      event_type VARCHAR(50),
      ack_sla_minutes INTEGER NOT NULL DEFAULT 60,
      primary_recipient_roles JSONB NOT NULL,
      backup_recipient_roles JSONB NOT NULL,
      repeat_interval_minutes INTEGER DEFAULT 30,
      max_escalation_levels INTEGER DEFAULT 3,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Seed Default Escalation Rules
    INSERT INTO qms_escalation_rules (event_severity, ack_sla_minutes, primary_recipient_roles, backup_recipient_roles)
    VALUES 
      ('CRITICAL', 60, '["qa_mgr", "prod_mgr"]'::jsonb, '["plant_director"]'::jsonb),
      ('MAJOR', 120, '["qa_officer", "prod_sup"]'::jsonb, '["qa_mgr"]'::jsonb),
      ('MINOR', 480, '["qa_officer"]'::jsonb, '["qa_mgr"]'::jsonb)
    ON CONFLICT DO NOTHING;

    -- 8. Quality Event Links (Graph Relationship Junction)
    CREATE TABLE IF NOT EXISTS qms_quality_event_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_event_id UUID NOT NULL REFERENCES qms_quality_events(id) ON DELETE CASCADE,
      target_type VARCHAR(50) NOT NULL,
      target_id VARCHAR(100) NOT NULL,
      target_label VARCHAR(255) NOT NULL,
      relationship_type VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qms_links_source ON qms_quality_event_links(source_event_id);
    CREATE INDEX IF NOT EXISTS idx_qms_links_target ON qms_quality_event_links(target_type, target_id);
  `;

  await client.query(sql);
  console.log('Micro-Sprint 1 Database Migrations executed successfully!');
  await client.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
