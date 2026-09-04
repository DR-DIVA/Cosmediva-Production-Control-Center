const pg = require('pg');

const client = new pg.Client({
  connectionString: 'postgres://postgres.yzwldawflteyywuetzcw:%2FQaz7410%2FYc8gre4u@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const migrationSql = `
-- ============================================================================
-- COSMEFLOW PEOPLE V1 - DATABASE ARCHITECTURE
-- Production HR & Workforce Management System for Cosmediva Manufacturing
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES & SITES
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_name_en VARCHAR(255),
    tax_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    site_code VARCHAR(50) UNIQUE NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    division_code VARCHAR(50) UNIQUE NOT NULL,
    division_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: departments table already exists, let's ensure required columns exist
ALTER TABLE departments ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    section_code VARCHAR(50) NOT NULL,
    section_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(department_id, section_code)
);

CREATE TABLE IF NOT EXISTS work_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    work_area_code VARCHAR(50) UNIQUE NOT NULL,
    work_area_name VARCHAR(255) NOT NULL,
    area_type VARCHAR(50) DEFAULT 'PRODUCTION', -- PRODUCTION, QC_LAB, WAREHOUSE, OFFICE, MAINTENANCE
    critical_skill_needed VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_code VARCHAR(50) UNIQUE NOT NULL,
    position_name VARCHAR(255) NOT NULL,
    job_level VARCHAR(50) DEFAULT 'STAFF', -- OPERATOR, STAFF, SENIOR, SUPERVISOR, ASSISTANT_MANAGER, MANAGER, DIRECTOR, EXECUTIVE
    min_qualification TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    pay_basis VARCHAR(50) DEFAULT 'MONTHLY', -- MONTHLY, DAILY, HOURLY
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORK SCHEDULES & SHIFTS
CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_code VARCHAR(50) UNIQUE NOT NULL,
    schedule_name VARCHAR(255) NOT NULL,
    work_days_per_week INT DEFAULT 6,
    default_start_time TIME DEFAULT '08:00:00',
    default_end_time TIME DEFAULT '17:00:00',
    break_minutes INT DEFAULT 60,
    grace_period_minutes INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code VARCHAR(50) UNIQUE NOT NULL,
    shift_name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    crosses_midnight BOOLEAN DEFAULT FALSE,
    break_duration_minutes INT DEFAULT 60,
    color_code VARCHAR(50) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holiday_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_code VARCHAR(50) UNIQUE NOT NULL,
    calendar_name VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID REFERENCES holiday_calendars(id) ON DELETE CASCADE,
    holiday_name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(calendar_id, holiday_date)
);

-- 3. EMPLOYEES MASTER TABLE
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    prefix VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    profile_photo TEXT,
    gender VARCHAR(20), -- MALE, FEMALE, OTHER
    date_of_birth DATE,
    nationality VARCHAR(50) DEFAULT 'Thai',
    phone VARCHAR(50),
    email VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'th', -- th, en, my
    
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    work_area_id UUID REFERENCES work_areas(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    
    job_level VARCHAR(50) DEFAULT 'STAFF',
    employment_type VARCHAR(50) DEFAULT 'MONTHLY', -- Monthly, Daily, Contract, Outsource, Foreign Worker
    employment_status VARCHAR(50) DEFAULT 'Permanent', -- Active, Probation, Permanent, Suspended, Resigned, Terminated, Inactive
    
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    probation_end_date DATE,
    resignation_date DATE,
    
    supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    default_schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL,
    default_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    work_location VARCHAR(100) DEFAULT 'Cosmediva Factory',
    clocking_required BOOLEAN DEFAULT TRUE,
    overtime_eligible BOOLEAN DEFAULT TRUE,
    leave_policy_group VARCHAR(50) DEFAULT 'STANDARD',
    
    user_id UUID,
    system_role VARCHAR(50) DEFAULT 'Employee', -- Employee, Supervisor, Manager, HR Officer, HR Manager, Executive, Admin
    
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_work_area ON employees(work_area_id);
CREATE INDEX IF NOT EXISTS idx_employees_supervisor ON employees(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);

CREATE TABLE IF NOT EXISTS employment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL, -- PROMOTION, TRANSFER, SALARY_ADJUST, STATUS_CHANGE
    previous_value JSONB,
    new_value JSONB,
    effective_date DATE NOT NULL,
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE TABLE IF NOT EXISTS employee_supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) DEFAULT 'PRIMARY', -- PRIMARY, SECONDARY, DOTTED_LINE
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, supervisor_id, assignment_type)
);

CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    schedule_date DATE NOT NULL,
    is_off_day BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, schedule_date)
);

-- 4. LEAVE POLICY MASTER & ENGINE
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) UNIQUE NOT NULL,
    name_th VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_my VARCHAR(100),
    description TEXT,
    color_code VARCHAR(50) DEFAULT '#3B82F6',
    is_paid BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_policy_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_code VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
    policy_group_id UUID REFERENCES leave_policy_groups(id) ON DELETE SET NULL,
    policy_name VARCHAR(255) NOT NULL,
    employee_type VARCHAR(50) DEFAULT 'ALL', -- ALL, Monthly, Daily, Contract, etc.
    eligibility_service_months INT DEFAULT 0,
    annual_entitlement NUMERIC(5,2) NOT NULL DEFAULT 6,
    entitlement_unit VARCHAR(20) DEFAULT 'DAYS', -- DAYS, HOURS
    accrual_method VARCHAR(50) DEFAULT 'ANNUAL_UPFRONT', -- ANNUAL_UPFRONT, MONTHLY_ACCRUAL, PRORATED
    carry_forward_allowed BOOLEAN DEFAULT FALSE,
    max_carry_forward NUMERIC(5,2) DEFAULT 0,
    carry_forward_expiry_months INT DEFAULT 3,
    allow_negative_balance BOOLEAN DEFAULT FALSE,
    max_negative_balance NUMERIC(5,2) DEFAULT 0,
    minimum_notice_days INT DEFAULT 0,
    max_consecutive_days INT DEFAULT 30,
    half_day_allowed BOOLEAN DEFAULT TRUE,
    hourly_leave_allowed BOOLEAN DEFAULT FALSE,
    attachment_required BOOLEAN DEFAULT FALSE,
    attachment_required_after_days INT DEFAULT 3,
    paid_unpaid VARCHAR(20) DEFAULT 'PAID',
    approval_workflow_code VARCHAR(50) DEFAULT 'DEFAULT_LEAVE',
    weekend_handling VARCHAR(20) DEFAULT 'EXCLUDE', -- EXCLUDE, INCLUDE
    holiday_handling VARCHAR(20) DEFAULT 'EXCLUDE', -- EXCLUDE, INCLUDE
    probation_rule VARCHAR(50) DEFAULT 'NOT_ALLOWED', -- ALLOWED, NOT_ALLOWED, ACCRUE_ONLY
    gender_condition VARCHAR(20) DEFAULT 'ALL', -- ALL, MALE_ONLY, FEMALE_ONLY
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL,
    entitled_days NUMERIC(5,2) NOT NULL DEFAULT 0,
    carry_forward_days NUMERIC(5,2) DEFAULT 0,
    adjusted_days NUMERIC(5,2) DEFAULT 0,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL,
    entitled NUMERIC(5,2) DEFAULT 0,
    carry_forward NUMERIC(5,2) DEFAULT 0,
    taken NUMERIC(5,2) DEFAULT 0,
    pending NUMERIC(5,2) DEFAULT 0,
    available NUMERIC(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- ALLOCATION, USAGE, CANCEL_RESTORE, ADJUSTMENT, EXPIRY
    amount NUMERIC(5,2) NOT NULL,
    balance_before NUMERIC(5,2) NOT NULL,
    balance_after NUMERIC(5,2) NOT NULL,
    reference_id UUID, -- reference to leave_request_id or adjustment
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 5. LEAVE REQUESTS & WORKFLOWS
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code VARCHAR(50) UNIQUE NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    approver_role VARCHAR(50) NOT NULL, -- SUPERVISOR, MANAGER, DEPT_HEAD, HR_OFFICER, HR_MANAGER
    condition_rule JSONB, -- e.g. {"days_gt": 2}
    is_optional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, step_number)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id) ON DELETE RESTRICT,
    duration_type VARCHAR(20) DEFAULT 'FULL_DAY', -- FULL_DAY, FIRST_HALF, SECOND_HALF, HOURLY
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    total_days NUMERIC(5,2) NOT NULL DEFAULT 1,
    total_hours NUMERIC(5,2) DEFAULT 0,
    reason TEXT NOT NULL,
    contact_during_leave VARCHAR(255),
    is_emergency BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    
    current_workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
    current_step INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'SUBMITTED', -- DRAFT, SUBMITTED, PENDING_SUPERVISOR, PENDING_MANAGER, PENDING_HR, APPROVED, REJECTED, CANCELLED, WITHDRAWN
    
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

CREATE TABLE IF NOT EXISTS leave_request_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    day_fraction NUMERIC(3,2) DEFAULT 1.0, -- 1.0 = Full, 0.5 = Half
    is_paid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL, -- LEAVE, ATTENDANCE_CORRECTION, OT
    reference_id UUID NOT NULL,
    step_number INT NOT NULL DEFAULT 1,
    assigned_approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_role VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, SKIPPED
    action_taken_at TIMESTAMPTZ,
    action_taken_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    step_number INT NOT NULL,
    actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- SUBMITTED, APPROVED, REJECTED, CANCELLED, ESCALATED
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    comment TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TIME & ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    source_type VARCHAR(50) DEFAULT 'CSV', -- CSV, EXCEL, HIP_DEVICE, API
    total_records INT DEFAULT 0,
    success_records INT DEFAULT 0,
    error_records INT DEFAULT 0,
    file_name VARCHAR(255),
    error_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE TABLE IF NOT EXISTS attendance_raw_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES attendance_import_batches(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    punch_datetime TIMESTAMPTZ NOT NULL,
    punch_type VARCHAR(20) DEFAULT 'AUTO', -- IN, OUT, AUTO
    source VARCHAR(50) DEFAULT 'DEVICE',
    device_id VARCHAR(50),
    original_raw_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_logs_code_dt ON attendance_raw_logs(employee_code, punch_datetime);

CREATE TABLE IF NOT EXISTS attendance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL,
    work_date DATE NOT NULL,
    schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    
    planned_start TIME DEFAULT '08:00:00',
    planned_end TIME DEFAULT '17:00:00',
    actual_in TIMESTAMPTZ,
    actual_out TIMESTAMPTZ,
    
    late_minutes INT DEFAULT 0,
    early_leave_minutes INT DEFAULT 0,
    worked_minutes INT DEFAULT 0,
    normal_hours NUMERIC(4,2) DEFAULT 0,
    ot_minutes INT DEFAULT 0,
    
    attendance_status VARCHAR(50) DEFAULT 'Present', 
    -- Present, Late, Early Leave, Absent, Leave, Holiday, Weekly Off, Training, Business Trip, WFH, Missing Clock In, Missing Clock Out, Missing Punch, Shift Mismatch, Unapproved Absence
    
    leave_status VARCHAR(50),
    leave_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
    
    has_exception BOOLEAN DEFAULT FALSE,
    exception_types TEXT[], -- Array of strings e.g. ['LATE', 'MISSING_OUT']
    exception_resolved BOOLEAN DEFAULT TRUE,
    
    source VARCHAR(50) DEFAULT 'PUNCH',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_daily_date ON attendance_daily(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_emp_date ON attendance_daily(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_status ON attendance_daily(attendance_status);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_exception ON attendance_daily(has_exception, exception_resolved);

CREATE TABLE IF NOT EXISTS attendance_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_daily_id UUID REFERENCES attendance_daily(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    exception_type VARCHAR(50) NOT NULL, -- LATE, ABSENT, MISSING_CLOCK_IN, MISSING_CLOCK_OUT, MISSING_PUNCH, SHIFT_MISMATCH, UNAPPROVED_LEAVE
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    description TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID,
    resolution_action VARCHAR(50),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_daily_id UUID REFERENCES attendance_daily(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL, -- FORGOT_CLOCK, DEVICE_ERROR, OFFICIAL_DUTY, TRAINING, BUSINESS_TRIP
    requested_in TIMESTAMPTZ,
    requested_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    attachment_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    review_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 7. NOTIFICATIONS & SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, APPROVAL_NEEDED, EXCEPTION_ALERT
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

-- 8. FUTURE READY TABLES (Migration-ready architecture as requested in Section 39)
CREATE TABLE IF NOT EXISTS ot_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    department_id UUID REFERENCES departments(id),
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    estimated_hours NUMERIC(4,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ot_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ot_request_id UUID REFERENCES ot_requests(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    actual_hours NUMERIC(4,2) DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_code VARCHAR(50) UNIQUE NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- MIXING, FILLING, PACKING, QC_TEST, GMP, SANITIZATION
    critical_for_production BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    competency_level INT DEFAULT 1, -- 1=Novice, 2=Practitioner, 3=Independent, 4=Expert/Trainer
    certified_date DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, skill_id)
);

CREATE TABLE IF NOT EXISTS workforce_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_area_id UUID REFERENCES work_areas(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id),
    minimum_headcount INT NOT NULL DEFAULT 1,
    optimum_headcount INT NOT NULL DEFAULT 1,
    critical_skills_required TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workforce_daily_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    work_area_id UUID REFERENCES work_areas(id),
    scheduled_headcount INT DEFAULT 0,
    present_headcount INT DEFAULT 0,
    leave_headcount INT DEFAULT 0,
    absent_headcount INT DEFAULT 0,
    readiness_status VARCHAR(50) DEFAULT 'READY', -- READY, WATCH, CRITICAL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(snapshot_date, work_area_id)
);
`;

async function main() {
  try {
    console.log('Connecting to PostgreSQL to run CosmeFlow People V1 migration...');
    await client.connect();
    console.log('Connected! Executing schema DDL...');
    await client.query(migrationSql);
    console.log('CosmeFlow People V1 schema created successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
