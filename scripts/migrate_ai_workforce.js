const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const migrationSql = `
-- ============================================================================
-- COSMEFLOW PEOPLE V1 - ADDENDUM: AI WORKFORCE READY ARCHITECTURE
-- 16 PostgreSQL Tables for Human + AI Workforce Operating System
-- ============================================================================

-- 1. HR CASE MANAGEMENT (Layer 4)
CREATE TABLE IF NOT EXISTS hr_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(50) UNIQUE NOT NULL,
    case_type VARCHAR(50) NOT NULL, -- Attendance, Leave, Policy, Employee Relations, Probation, Training, Compliance, Payroll Exception, Document, Other
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    source_type VARCHAR(50) DEFAULT 'SYSTEM', -- SYSTEM, EXCEPTION, EMPLOYEE_REPORT, SUPERVISOR_FLAG, AI_AGENT
    source_id VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    status VARCHAR(50) DEFAULT 'New', -- New, Open, Investigating, Waiting Employee, Waiting Supervisor, Waiting HR, Waiting Manager, Waiting Approval, Resolved, Closed, Cancelled
    owner_user_id UUID,
    assigned_team VARCHAR(100) DEFAULT 'HR Operations',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    summary VARCHAR(255) NOT NULL,
    description TEXT,
    resolution TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_cases_num ON hr_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_hr_cases_emp ON hr_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_cases_status ON hr_cases(status);
CREATE INDEX IF NOT EXISTS idx_hr_cases_type ON hr_cases(case_type);

CREATE TABLE IF NOT EXISTS case_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES hr_cases(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) NOT NULL, -- Attendance, Leave, Schedule, Previous case, Policy, Employee statement, Supervisor statement, Attachment, Document
    source_type VARCHAR(50),
    source_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_id VARCHAR(255),
    snapshot_data JSONB,
    created_by_type VARCHAR(50) DEFAULT 'SYSTEM', -- SYSTEM, USER, AI_AGENT
    created_by_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence(case_id);

CREATE TABLE IF NOT EXISTS case_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES hr_cases(id) ON DELETE CASCADE,
    comment_type VARCHAR(50) DEFAULT 'NOTE', -- NOTE, INVESTIGATION, STATEMENT, ESCALATION
    comment TEXT NOT NULL,
    author_type VARCHAR(50) DEFAULT 'USER', -- USER, SUPERVISOR, HR, AI_AGENT
    author_id UUID,
    internal_only BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_comments_case ON case_comments(case_id);

CREATE TABLE IF NOT EXISTS case_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES hr_cases(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    recommended_by VARCHAR(100),
    assigned_to UUID,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_id UUID,
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_actions_case ON case_actions(case_id);

-- 2. ACTION INBOX (Layer 7)
CREATE TABLE IF NOT EXISTS action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL, -- LEAVE_APPROVAL, ATTENDANCE_CORRECTION, MISSING_PUNCH, HR_CASE_REVIEW, SUPERVISOR_CONFIRMATION, POLICY_DECISION, AI_RECOMMENDATION
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    assigned_to_user UUID,
    assigned_to_role VARCHAR(50), -- Employee, Supervisor, Manager, HR Officer, HR Manager, Executive, Admin
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, DISMISSED, ESCALATED
    due_at TIMESTAMPTZ,
    source VARCHAR(100) DEFAULT 'SYSTEM',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_action_items_role ON action_items(assigned_to_role, status);
CREATE INDEX IF NOT EXISTS idx_action_items_user ON action_items(assigned_to_user, status);

-- 3. DOMAIN EVENT ARCHITECTURE (Layer 8)
CREATE TABLE IF NOT EXISTS domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL, -- leave.requested, leave.approved, leave.rejected, attendance.imported, attendance.exception.created, etc.
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    correlation_id VARCHAR(255),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_domain_events_name ON domain_events(event_name);
CREATE INDEX IF NOT EXISTS idx_domain_events_time ON domain_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_domain_events_entity ON domain_events(entity_type, entity_id);

-- 4. AI AGENT REGISTRY & DIGITAL WORKERS (Layer 5)
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code VARCHAR(50) UNIQUE NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    agent_type VARCHAR(50) DEFAULT 'DIGITAL_WORKER',
    mission TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PLANNED', -- PLANNED, ACTIVE, PAUSED, DEPRECATED
    risk_level VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
    default_role_id VARCHAR(50),
    system_prompt_reference TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_code ON ai_agents(agent_code);

CREATE TABLE IF NOT EXISTS ai_agent_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL, -- attendance, leave, schedule, employee, hr_case, payroll
    action VARCHAR(50) NOT NULL, -- READ, CREATE, UPDATE, DELETE, PROHIBITED
    permission_scope VARCHAR(50) DEFAULT 'DEPARTMENT', -- SELF, DEPARTMENT, SITE, COMPANY
    requires_human_approval BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20) DEFAULT 'LOW',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, resource, action)
);

CREATE TABLE IF NOT EXISTS ai_agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    prompt_reference TEXT NOT NULL,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code VARCHAR(100) UNIQUE NOT NULL,
    job_name VARCHAR(255) NOT NULL,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    trigger_type VARCHAR(50) DEFAULT 'CRON', -- CRON, EVENT, MANUAL
    schedule_expression VARCHAR(100),
    event_name VARCHAR(100),
    active BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20) DEFAULT 'MEDIUM',
    human_review_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES ai_jobs(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    records_scanned INT DEFAULT 0,
    exceptions_found INT DEFAULT 0,
    cases_created INT DEFAULT 0,
    recommendations_created INT DEFAULT 0,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(100) NOT NULL,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    trigger_type VARCHAR(50) DEFAULT 'EVENT',
    trigger_reference VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'Queued', -- Queued, Running, Waiting Data, Waiting Human, Completed, Failed, Cancelled, Escalated
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    requires_human_review BOOLEAN DEFAULT TRUE,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    summary TEXT,
    result_reference JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    recommendation_type VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    reasoning_summary TEXT,
    evidence_reference JSONB,
    confidence NUMERIC(4,3) DEFAULT 0.850,
    risk_level VARCHAR(20) DEFAULT 'MEDIUM',
    recommended_action VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending Review', -- Pending Review, Accepted, Rejected, Modified, Expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_result VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS human_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(100) NOT NULL,
    requested_by_type VARCHAR(50) DEFAULT 'AI_AGENT', -- AI_AGENT, USER, SYSTEM
    requested_by_id UUID,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    risk_level VARCHAR(20) DEFAULT 'HIGH', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CANCELLED
    approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    comment TEXT
);

CREATE TABLE IF NOT EXISTS ai_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    job_run_id UUID REFERENCES ai_job_runs(id) ON DELETE SET NULL,
    task_id UUID REFERENCES ai_tasks(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action_description TEXT NOT NULL,
    input_reference JSONB,
    output_reference JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    result VARCHAR(50) DEFAULT 'SUCCESS',
    risk_level VARCHAR(20) DEFAULT 'LOW',
    human_approval_id UUID REFERENCES human_approvals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_activity_time ON ai_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_activity_agent ON ai_activity_logs(agent_id);

CREATE TABLE IF NOT EXISTS document_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type VARCHAR(100) NOT NULL, -- WARNING_LETTER, EMPLOYMENT_CERT, SALARY_CERT, INCIDENT_REPORT
    related_case_id UUID REFERENCES hr_cases(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    draft_source VARCHAR(50) DEFAULT 'AI_DRAFT',
    draft_status VARCHAR(50) DEFAULT 'AI Draft', -- AI Draft, HR Review, Revision Required, Reviewed, Approved for Issue, Issued, Cancelled
    content TEXT NOT NULL,
    generated_by VARCHAR(100),
    reviewed_by UUID,
    approved_by UUID,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function runMigration() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('Running AI Workforce Ready Architecture Migration...');
  await client.query(migrationSql);
  console.log('Successfully created all 16 AI Workforce & Case Management tables!');
  await client.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
