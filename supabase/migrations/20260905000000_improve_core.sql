-- =========================================================================
-- COSMEFLOW IMPROVE: OPERATIONAL EXCELLENCE & COST REDUCTION CORE SCHEMA
-- =========================================================================

-- 1. Master: Sites, Lines, Stations
CREATE TABLE IF NOT EXISTS improve_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_code VARCHAR(50) NOT NULL UNIQUE,
  site_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS improve_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  line_code VARCHAR(50) NOT NULL,
  line_name VARCHAR(255) NOT NULL,
  site_id UUID REFERENCES improve_sites(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS improve_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID REFERENCES improve_lines(id) ON DELETE CASCADE,
  station_code VARCHAR(50) NOT NULL,
  station_name VARCHAR(255) NOT NULL,
  sequence_order INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master: Lean 8 Wastes & Factory Loss Categories
CREATE TABLE IF NOT EXISTS improve_waste_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name_en VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  type VARCHAR(50) DEFAULT 'LEAN_8_WASTE', -- 'LEAN_8_WASTE' or 'FACTORY_GAP'
  description TEXT,
  color_code VARCHAR(30) DEFAULT '#D4AF37',
  is_active BOOLEAN DEFAULT true
);

-- 3. Master: Cost Rates with Effective Dates
CREATE TABLE IF NOT EXISTS improve_cost_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_code VARCHAR(50) NOT NULL,
  rate_name VARCHAR(255) NOT NULL,
  rate_type VARCHAR(50) NOT NULL, -- 'LABOR', 'OT', 'MACHINE', 'ENERGY', 'SCRAP', 'REWORK'
  amount_thb NUMERIC(15, 2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'THB/HOUR',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  version INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Core: Gemba Observations
CREATE TABLE IF NOT EXISTS improve_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_no VARCHAR(50) NOT NULL UNIQUE,
  date_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift VARCHAR(50) DEFAULT 'Day Shift',
  
  -- Hierarchy
  site_id UUID REFERENCES improve_sites(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  line_id UUID REFERENCES improve_lines(id) ON DELETE SET NULL,
  station_id UUID REFERENCES improve_stations(id) ON DELETE SET NULL,
  
  -- Context (Traceability)
  sku VARCHAR(100),
  product_name VARCHAR(255),
  lot_no VARCHAR(100),
  work_order VARCHAR(100),
  process_id UUID REFERENCES processes(id) ON DELETE SET NULL,
  activity_name VARCHAR(255),
  machine_code VARCHAR(100),
  team_name VARCHAR(100),
  
  -- Content
  description TEXT NOT NULL,
  severity VARCHAR(50) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  status VARCHAR(50) DEFAULT 'CAPTURED', 
  
  -- Risks & Gaps
  quality_risk BOOLEAN DEFAULT false,
  gmp_risk BOOLEAN DEFAULT false,
  safety_risk BOOLEAN DEFAULT false,
  skill_gap BOOLEAN DEFAULT false,
  standard_gap BOOLEAN DEFAULT false,
  need_escalation BOOLEAN DEFAULT false,
  
  -- Loss Summary Cache
  estimated_monthly_loss NUMERIC(15, 2) DEFAULT 0,
  estimated_annual_loss NUMERIC(15, 2) DEFAULT 0,
  potential_saving NUMERIC(15, 2) DEFAULT 0,
  
  -- Observer & Metadata
  observer_id UUID,
  observer_name VARCHAR(255),
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Media Attachments (Photo, Video, Voice, Document)
CREATE TABLE IF NOT EXISTS improve_observation_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES improve_observations(id) ON DELETE CASCADE,
  media_type VARCHAR(50) NOT NULL, -- 'PHOTO', 'VIDEO', 'VOICE', 'DOCUMENT'
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  duration_sec NUMERIC(10, 2),
  transcription TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI Analysis & Multi-Agent Findings
CREATE TABLE IF NOT EXISTS improve_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES improve_observations(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL, -- 'GEMBA_AI', 'IE_AI', 'ROOT_CAUSE_AI', 'QUALITY_GMP_GATE', 'COST_AI', 'TRAINING_AI'
  model_name VARCHAR(100) DEFAULT 'Gemini-3.8-Flash',
  prompt_version VARCHAR(50) DEFAULT 'v1.0',
  finding_title VARCHAR(255),
  observed_condition TEXT,
  primary_waste VARCHAR(100),
  secondary_waste VARCHAR(100),
  potential_root_cause TEXT,
  quality_risk_assessment TEXT,
  gmp_risk_assessment TEXT,
  safety_risk_assessment TEXT,
  skill_gap_analysis TEXT,
  standard_work_gap_analysis TEXT,
  recommended_next_step TEXT,
  suggested_owner_dept VARCHAR(100),
  potential_cost_driver TEXT,
  gate_status VARCHAR(50), -- 'PASS', 'PASS_WITH_CONDITIONS', 'QA_REVIEW_REQUIRED', 'BLOCK'
  confidence_score NUMERIC(5, 2) DEFAULT 0.85,
  raw_output JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Human Confirmation & Governance (AI is Suggestion, Human Confirms)
CREATE TABLE IF NOT EXISTS improve_human_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES improve_observations(id) ON DELETE CASCADE,
  ai_analysis_id UUID REFERENCES improve_ai_analysis(id) ON DELETE SET NULL,
  decision VARCHAR(50) NOT NULL, -- 'ACCEPTED', 'EDITED', 'REJECTED'
  confirmed_primary_waste VARCHAR(100),
  confirmed_secondary_waste VARCHAR(100),
  confirmed_root_cause TEXT,
  confirmed_severity VARCHAR(50),
  confirmed_quality_risk BOOLEAN DEFAULT false,
  confirmed_gmp_risk BOOLEAN DEFAULT false,
  confirmed_safety_risk BOOLEAN DEFAULT false,
  confirmed_skill_gap BOOLEAN DEFAULT false,
  confirmed_standard_gap BOOLEAN DEFAULT false,
  reviewer_id UUID,
  reviewer_name VARCHAR(255),
  reviewer_comment TEXT,
  confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Cost of Loss Quantification Engine
CREATE TABLE IF NOT EXISTS improve_loss_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES improve_observations(id) ON DELETE CASCADE,
  loss_type VARCHAR(50) DEFAULT 'LABOR_LOSS',
  
  -- Formula Parameters
  lost_minutes_per_occ NUMERIC(10, 2) DEFAULT 0,
  frequency_per_shift NUMERIC(10, 2) DEFAULT 0,
  shifts_per_day NUMERIC(5, 2) DEFAULT 1,
  working_days_per_month NUMERIC(5, 2) DEFAULT 26,
  number_of_people NUMERIC(10, 2) DEFAULT 1,
  labor_cost_rate NUMERIC(10, 2) DEFAULT 85.00,
  
  -- Results
  lost_hours_per_month NUMERIC(12, 2) DEFAULT 0,
  monthly_loss_thb NUMERIC(15, 2) DEFAULT 0,
  annual_loss_thb NUMERIC(15, 2) DEFAULT 0,
  
  assumptions TEXT,
  cost_rate_id UUID REFERENCES improve_cost_rates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Improvement Projects (PDCA Lifecycle)
CREATE TABLE IF NOT EXISTS improve_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_no VARCHAR(50) NOT NULL UNIQUE, -- IMP-YYYY-XXXXX
  title VARCHAR(255) NOT NULL,
  problem_statement TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  line_id UUID REFERENCES improve_lines(id) ON DELETE SET NULL,
  station_id UUID REFERENCES improve_stations(id) ON DELETE SET NULL,
  owner_name VARCHAR(255),
  sponsor_name VARCHAR(255),
  cost_validator_name VARCHAR(255),
  qa_validator_name VARCHAR(255),
  
  start_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,
  completion_date DATE,
  
  -- PDCA Stage
  pdca_stage VARCHAR(50) DEFAULT 'PLAN', -- 'PLAN', 'DO', 'CHECK', 'ACT'
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  priority VARCHAR(50) DEFAULT 'MEDIUM',
  
  -- Baseline vs Target
  baseline_summary TEXT,
  target_summary TEXT,
  expected_annual_saving NUMERIC(15, 2) DEFAULT 0,
  
  -- Actual Verified & Finance Validated Savings
  calculated_saving NUMERIC(15, 2) DEFAULT 0,
  productivity_gain_pct NUMERIC(8, 2) DEFAULT 0,
  released_capacity_hours NUMERIC(10, 2) DEFAULT 0,
  finance_validated_hard_saving NUMERIC(15, 2) DEFAULT 0,
  finance_validated_by VARCHAR(255),
  finance_validated_at TIMESTAMPTZ,
  
  -- Quality Gate Status
  quality_gate_status VARCHAR(50) DEFAULT 'PENDING',
  qa_signed_by VARCHAR(255),
  qa_signed_at TIMESTAMPTZ,
  qa_comment TEXT,
  
  lessons_learned TEXT,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS improve_project_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES improve_projects(id) ON DELETE CASCADE,
  observation_id UUID REFERENCES improve_observations(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, observation_id)
);

-- 10. Actions & Tasks Management
CREATE TABLE IF NOT EXISTS improve_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES improve_observations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES improve_projects(id) ON DELETE CASCADE,
  action_title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_name VARCHAR(255),
  department_name VARCHAR(100),
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'MEDIUM',
  status VARCHAR(50) DEFAULT 'OPEN',
  completion_date DATE,
  evidence_url TEXT,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Before / After Comparison Metrics
CREATE TABLE IF NOT EXISTS improve_before_after (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES improve_projects(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  unit VARCHAR(50),
  before_value NUMERIC(12, 2) NOT NULL,
  after_value NUMERIC(12, 2) NOT NULL,
  higher_is_better BOOLEAN DEFAULT false,
  improvement_pct NUMERIC(8, 2),
  before_media_url TEXT,
  after_media_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Standard Work & OPL Library
CREATE TABLE IF NOT EXISTS improve_standard_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES improve_projects(id) ON DELETE SET NULL,
  doc_no VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) DEFAULT 'SOP',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  revision VARCHAR(20) DEFAULT 'Rev.01',
  effective_date DATE DEFAULT CURRENT_DATE,
  owner_name VARCHAR(255),
  qa_approver_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'DRAFT',
  steps_summary JSONB,
  critical_quality_points TEXT,
  safety_points TEXT,
  common_mistakes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS improve_opl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_work_id UUID REFERENCES improve_standard_work(id) ON DELETE CASCADE,
  opl_no VARCHAR(50) NOT NULL UNIQUE,
  topic VARCHAR(255) NOT NULL,
  why_important TEXT,
  wrong_method_description TEXT,
  wrong_method_image_url TEXT,
  correct_method_description TEXT,
  correct_method_image_url TEXT,
  stop_call_wait_rule TEXT,
  status VARCHAR(50) DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Training Needs & Skill Matrix
CREATE TABLE IF NOT EXISTS improve_training_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES improve_observations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES improve_projects(id) ON DELETE SET NULL,
  training_topic VARCHAR(255) NOT NULL,
  target_department VARCHAR(100),
  trainer_name VARCHAR(255),
  target_date DATE,
  completion_date DATE,
  status VARCHAR(50) DEFAULT 'IDENTIFIED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS improve_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_code VARCHAR(50) NOT NULL UNIQUE,
  skill_name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  category VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS improve_employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  department_name VARCHAR(100),
  skill_id UUID REFERENCES improve_skills(id) ON DELETE CASCADE,
  current_level VARCHAR(20) DEFAULT 'L0',
  required_level VARCHAR(20) DEFAULT 'L3',
  verified_by VARCHAR(255),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Audit Logs (Immutable Transaction History)
CREATE TABLE IF NOT EXISTS improve_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  performed_by VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_improve_obs_status ON improve_observations(status);
CREATE INDEX IF NOT EXISTS idx_improve_obs_dept ON improve_observations(department_id);
CREATE INDEX IF NOT EXISTS idx_improve_obs_line ON improve_observations(line_id);
CREATE INDEX IF NOT EXISTS idx_improve_projects_status ON improve_projects(status);
CREATE INDEX IF NOT EXISTS idx_improve_loss_obs ON improve_loss_calculations(observation_id);
