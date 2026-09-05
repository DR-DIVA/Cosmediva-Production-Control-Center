-- =========================================================================
-- COSMEFLOW MAINTENANCE (CMMS) MIGRATION
-- Module: CosmeFlow Maintenance
-- Tagline: “แจ้งไว • ซ่อมไว • รู้ประวัติ • ลด Downtime”
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MACHINES & ASSETS MASTER
CREATE TABLE IF NOT EXISTS maintenance_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id VARCHAR(50) UNIQUE,
    machine_code VARCHAR(50) UNIQUE NOT NULL,
    machine_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    department_code VARCHAR(50),
    department_name VARCHAR(100),
    production_area VARCHAR(100),
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    room_name VARCHAR(100),
    line VARCHAR(50),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    installation_date DATE,
    purchase_date DATE,
    purchase_cost NUMERIC(14,2) DEFAULT 0,
    supplier VARCHAR(150),
    warranty_expiry DATE,
    criticality VARCHAR(5) NOT NULL DEFAULT 'B', -- A (Critical), B (Important), C (General)
    status VARCHAR(50) NOT NULL DEFAULT 'Running', -- Running, Stopped, Breakdown, Under Repair, Waiting Part, PM Due, Under PM, Standby, Decommissioned
    responsible_technician_id UUID,
    responsible_technician_name VARCHAR(150),
    photo_url TEXT,
    manual_url TEXT,
    specification JSONB DEFAULT '{}'::jsonb,
    electrical_info JSONB DEFAULT '{}'::jsonb,
    maintenance_instruction TEXT,
    hourly_downtime_cost NUMERIC(10,2) DEFAULT 5000.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_machines_code ON maintenance_machines(machine_code);
CREATE INDEX IF NOT EXISTS idx_maint_machines_status ON maintenance_machines(status);
CREATE INDEX IF NOT EXISTS idx_maint_machines_crit ON maintenance_machines(criticality);

-- 2. SPARE PARTS MASTER
CREATE TABLE IF NOT EXISTS maintenance_spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_code VARCHAR(50) UNIQUE NOT NULL,
    part_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    specification TEXT,
    compatible_machines TEXT[],
    supplier VARCHAR(150),
    unit VARCHAR(20) NOT NULL DEFAULT 'ชิ้น',
    stock_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_stock NUMERIC(10,2) NOT NULL DEFAULT 1,
    max_stock NUMERIC(10,2) NOT NULL DEFAULT 10,
    reorder_point NUMERIC(10,2) NOT NULL DEFAULT 2,
    average_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    storage_location VARCHAR(100),
    photo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_spare_parts_code ON maintenance_spare_parts(part_code);
CREATE INDEX IF NOT EXISTS idx_maint_spare_parts_cat ON maintenance_spare_parts(category);

-- 3. WORK ORDERS
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    machine_id UUID NOT NULL REFERENCES maintenance_machines(id) ON DELETE CASCADE,
    machine_code VARCHAR(50) NOT NULL,
    machine_name VARCHAR(150) NOT NULL,
    requester_id UUID,
    requester_name VARCHAR(150) NOT NULL,
    requester_department_id UUID,
    requester_department_name VARCHAR(100),
    priority VARCHAR(20) NOT NULL DEFAULT 'P3_NORMAL', -- P1_CRITICAL, P2_HIGH, P3_NORMAL, P4_LOW
    status VARCHAR(40) NOT NULL DEFAULT 'NEW', -- NEW, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, WAITING_PART, WAITING_EXTERNAL, TEST_RUN, COMPLETED, VERIFIED, CLOSED
    symptom_category VARCHAR(100) NOT NULL,
    symptom_description TEXT,
    production_impact VARCHAR(100) NOT NULL DEFAULT 'Production can continue',
    is_emergency_breakdown BOOLEAN NOT NULL DEFAULT false,
    photo_before_urls TEXT[] DEFAULT '{}',
    photo_after_urls TEXT[] DEFAULT '{}',
    assigned_technician_id UUID,
    assigned_technician_name VARCHAR(150),
    supervisor_id UUID,
    supervisor_name VARCHAR(150),
    
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    technician_arrived_at TIMESTAMPTZ,
    repair_started_at TIMESTAMPTZ,
    repair_paused_at TIMESTAMPTZ,
    repair_completed_at TIMESTAMPTZ,
    test_run_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    total_downtime_minutes NUMERIC(10,2) DEFAULT 0,
    response_time_minutes NUMERIC(10,2) DEFAULT 0,
    repair_time_minutes NUMERIC(10,2) DEFAULT 0,
    waiting_part_minutes NUMERIC(10,2) DEFAULT 0,
    total_part_cost NUMERIC(14,2) DEFAULT 0,
    total_labor_cost NUMERIC(14,2) DEFAULT 0,
    total_maintenance_cost NUMERIC(14,2) DEFAULT 0,
    estimated_downtime_loss NUMERIC(14,2) DEFAULT 0,
    
    problem_category VARCHAR(80),
    diagnosis TEXT,
    root_cause VARCHAR(100),
    root_cause_detail TEXT,
    corrective_action TEXT,
    preventive_recommendation TEXT,
    
    verification_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PASS, FAIL
    verification_notes TEXT,
    verified_by_id UUID,
    verified_by_name VARCHAR(150),
    
    is_repeated_failure BOOLEAN DEFAULT false,
    repeat_count_90d INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_wo_num ON maintenance_work_orders(wo_number);
CREATE INDEX IF NOT EXISTS idx_maint_wo_machine ON maintenance_work_orders(machine_id);
CREATE INDEX IF NOT EXISTS idx_maint_wo_status ON maintenance_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_maint_wo_priority ON maintenance_work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_maint_wo_reported ON maintenance_work_orders(reported_at);

-- 4. WORK ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS maintenance_wo_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    from_status VARCHAR(40),
    to_status VARCHAR(40) NOT NULL,
    changed_by_name VARCHAR(150) NOT NULL DEFAULT 'System',
    changed_by_id UUID,
    duration_minutes NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_wo_logs_wo ON maintenance_wo_status_logs(work_order_id);

-- 5. WORK ORDER SPARE PART USAGE
CREATE TABLE IF NOT EXISTS maintenance_wo_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    spare_part_id UUID NOT NULL REFERENCES maintenance_spare_parts(id) ON DELETE RESTRICT,
    part_code VARCHAR(50) NOT NULL,
    part_name VARCHAR(150) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'ชิ้น',
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
    issued_by_name VARCHAR(150),
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_wo_parts_wo ON maintenance_wo_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_maint_wo_parts_sp ON maintenance_wo_parts(spare_part_id);

-- 6. SPARE PART PURCHASE REQUESTS
CREATE TABLE IF NOT EXISTS maintenance_spare_part_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code VARCHAR(50) UNIQUE NOT NULL,
    work_order_id UUID REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
    spare_part_id UUID REFERENCES maintenance_spare_parts(id) ON DELETE SET NULL,
    part_code VARCHAR(50),
    part_name VARCHAR(150) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'ชิ้น',
    urgency VARCHAR(20) NOT NULL DEFAULT 'URGENT',
    status VARCHAR(40) NOT NULL DEFAULT 'Requested',
    requested_by_name VARCHAR(150) NOT NULL,
    approved_by_name VARCHAR(150),
    po_number VARCHAR(100),
    supplier_name VARCHAR(150),
    estimated_cost NUMERIC(12,2) DEFAULT 0,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PREVENTIVE MAINTENANCE PLANS
CREATE TABLE IF NOT EXISTS maintenance_pm_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_name VARCHAR(150) NOT NULL,
    machine_id UUID REFERENCES maintenance_machines(id) ON DELETE CASCADE,
    machine_code VARCHAR(50) NOT NULL,
    machine_name VARCHAR(150) NOT NULL,
    frequency_type VARCHAR(30) NOT NULL DEFAULT 'Monthly',
    frequency_interval INT NOT NULL DEFAULT 1,
    estimated_minutes INT DEFAULT 60,
    checklist_template JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_requirements TEXT,
    required_tools TEXT,
    required_parts TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_completed_at TIMESTAMPTZ,
    next_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PREVENTIVE MAINTENANCE JOBS
CREATE TABLE IF NOT EXISTS maintenance_pm_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code VARCHAR(50) UNIQUE NOT NULL,
    pm_plan_id UUID NOT NULL REFERENCES maintenance_pm_plans(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES maintenance_machines(id) ON DELETE CASCADE,
    machine_code VARCHAR(50) NOT NULL,
    machine_name VARCHAR(150) NOT NULL,
    scheduled_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    assigned_technician_name VARCHAR(150),
    assigned_technician_id UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_minutes INT,
    checklist_results JSONB DEFAULT '[]'::jsonb,
    overall_result VARCHAR(20),
    corrective_work_order_id UUID REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS maintenance_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_role VARCHAR(50),
    recipient_id UUID,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    work_order_id UUID REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    machine_code VARCHAR(50),
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS maintenance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by_name VARCHAR(150) NOT NULL DEFAULT 'System',
    performed_by_id UUID,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AI INSIGHTS
CREATE TABLE IF NOT EXISTS maintenance_ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES maintenance_machines(id) ON DELETE CASCADE,
    machine_code VARCHAR(50) NOT NULL,
    symptom_category VARCHAR(100),
    suggested_root_causes JSONB DEFAULT '[]'::jsonb,
    similar_cases JSONB DEFAULT '[]'::jsonb,
    inspection_sequence JSONB DEFAULT '[]'::jsonb,
    recommended_parts JSONB DEFAULT '[]'::jsonb,
    safety_precautions TEXT,
    confidence_score NUMERIC(5,2) DEFAULT 0.85,
    user_feedback VARCHAR(30) DEFAULT 'UNRATED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
