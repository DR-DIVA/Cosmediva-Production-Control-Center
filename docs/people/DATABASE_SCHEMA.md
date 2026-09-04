# CosmeFlow People V1 — Database Schema Documentation

## 1. Core Production Tables (30+ Tables in PostgreSQL)

### 1.1 Organization & Structure
- `companies`: ข้อมูลบริษัทหลัก (`id`, `company_code`, `company_name`, `company_name_en`, `tax_id`)
- `sites`: โรงงาน/ฐานการผลิต (`id`, `company_id`, `site_code`, `site_name`, `timezone`)
- `divisions`: สายงานหลัก (`id`, `site_id`, `division_code`, `division_name`)
- `departments`: แผนก (`id`, `department_code`, `department_name`, `division_id`, `is_active`)
- `sections`: แผนกย่อย (`id`, `department_id`, `section_code`, `section_name`)
- `work_areas`: พื้นที่ปฏิบัติงานหน้างาน (`id`, `department_id`, `work_area_code`, `work_area_name`, `area_type`, `critical_skill_needed`)
  - รองรับ Mixing, Filling, Packing, QC, QA, Warehouse RM, Warehouse PM, Warehouse FG, Maintenance, Planning, R&D, Office
- `positions`: ตำแหน่งงานและระดับ (`id`, `department_id`, `position_code`, `position_name`, `job_level`)
- `employment_types`: ประเภทการจ้าง (`id`, `type_code`, `type_name`, `pay_basis`)

### 1.2 Employee Master
- `employees`: ข้อมูลหลักพนักงาน (`id`, `employee_code`, `prefix`, `first_name`, `last_name`, `nickname`, `email`, `phone`, `gender`, `date_of_birth`, `nationality`, `preferred_language`, `department_id`, `work_area_id`, `position_id`, `supervisor_id`, `manager_id`, `job_level`, `employment_type`, `employment_status`, `hire_date`, `system_role`, `is_active`, `deleted_at`, `created_at`, `updated_at`)
- `employment_history`: บันทึกประวัติการเปลี่ยนแปลงตำแหน่ง สถานะ เงินเดือน (`id`, `employee_id`, `change_type`, `previous_value`, `new_value`, `effective_date`)
- `employee_supervisors`: ลำดับขั้นบังคับบัญชา Primary/Secondary/Dotted-line (`id`, `employee_id`, `supervisor_id`, `assignment_type`)

### 1.3 Schedules & Holiday Calendars
- `work_schedules`: ตารางเวลาทำงาน (`id`, `schedule_code`, `schedule_name`, `work_days_per_week`, `default_start_time`, `default_end_time`, `grace_period_minutes`)
- `shifts`: กะการทำงาน (`id`, `shift_code`, `shift_name`, `start_time`, `end_time`, `crosses_midnight`, `color_code`)
- `shift_assignments`: การมอบหมายกะรายวัน (`id`, `employee_id`, `shift_id`, `schedule_date`, `is_off_day`)
- `holiday_calendars`: ปฏิทินวันหยุดประจำปี (`id`, `calendar_code`, `calendar_name`, `year`)
- `holidays`: รายการวันหยุดนักขัตฤกษ์และวันหยุดโรงงาน (`id`, `calendar_id`, `holiday_name`, `holiday_date`, `is_paid`)

### 1.4 Leave Policy Engine & Balance Ledger
- `leave_types`: ประเภทวันลา 12 ประเภท (`id`, `type_code`, `name_th`, `name_en`, `name_my`, `color_code`, `is_paid`)
- `leave_policy_groups`: กลุ่มนโยบายวันลา (`id`, `group_code`, `group_name`)
- `leave_policies`: กฎการลาที่แก้ไขได้ผ่านหน้าจอ (`id`, `leave_type_id`, `policy_name`, `annual_entitlement`, `minimum_notice_days`, `carry_forward_allowed`, `max_carry_forward`, `attachment_required`, `attachment_required_after_days`, `paid_unpaid`, `max_consecutive_days`)
- `leave_entitlements`: การกำหนดสิทธิ์ประจำปี (`id`, `employee_id`, `leave_type_id`, `year`, `entitled_days`, `carry_forward_days`)
- `leave_balances`: ยอดคงเหลือปัจจุบัน (`id`, `employee_id`, `leave_type_id`, `year`, `entitled`, `carry_forward`, `taken`, `pending`, `available`)
- `leave_transactions`: สมุดบัญชีคุมวันลา (Append-only Ledger) (`id`, `employee_id`, `leave_type_id`, `transaction_type`, `amount`, `balance_before`, `balance_after`, `reference_id`, `reason`, `created_at`)

### 1.5 Leave Requests & Approval Workflow
- `leave_requests`: คำขอลา (`id`, `request_number`, `employee_id`, `leave_type_id`, `duration_type`, `start_date`, `end_date`, `total_days`, `reason`, `is_emergency`, `attachment_url`, `status`, `current_step`, `approved_at`, `approved_by`, `cancelled_at`)
- `leave_request_days`: รายละเอียดวันลาแยกเป็นรายวัน (`id`, `leave_request_id`, `leave_date`, `day_fraction`, `is_paid`)
- `approval_workflows`: สายการอนุมัติหลัก (`id`, `workflow_code`, `workflow_name`)
- `approval_workflow_steps`: ขั้นตอนและบทบาทผู้อนุมัติ (`id`, `workflow_id`, `step_number`, `approver_role`, `condition_rule`)
- `approval_requests`: รายการรออนุมัติของแต่ละขั้น (`id`, `request_type`, `reference_id`, `step_number`, `assigned_approver_id`, `assigned_role`, `status`, `action_taken_at`, `action_taken_by`, `comments`)
- `approval_logs`: บันทึกประวัติการอนุมัติแบบ Append-only Audit (`id`, `request_type`, `reference_id`, `step_number`, `actor_id`, `action`, `previous_status`, `new_status`, `comment`, `created_at`)

### 1.6 Time & Attendance Engine
- `attendance_import_batches`: แบทช์การนำเข้าข้อมูล (`id`, `batch_number`, `source_type`, `total_records`, `success_records`, `file_name`)
- `attendance_raw_logs`: ข้อมูลดิบจากเครื่องสแกน (Immutable - ห้ามแก้ไข) (`id`, `batch_id`, `employee_code`, `employee_id`, `punch_datetime`, `punch_type`, `source`, `device_id`, `original_raw_text`)
- `attendance_daily`: บันทึกเวลาประจำวันประมวลผลแล้ว (`id`, `employee_id`, `employee_code`, `work_date`, `planned_start`, `planned_end`, `actual_in`, `actual_out`, `late_minutes`, `worked_minutes`, `attendance_status`, `has_exception`, `exception_types`, `exception_resolved`)
- `attendance_exceptions`: รายการผิดปกติ (`id`, `attendance_daily_id`, `employee_id`, `work_date`, `exception_type`, `severity`, `description`, `is_resolved`, `resolved_by`, `resolution_action`)
- `attendance_adjustments`: คำขอปรับปรุงเวลา (`id`, `attendance_daily_id`, `employee_id`, `work_date`, `adjustment_type`, `requested_in`, `requested_out`, `reason`, `status`, `approved_by`, `approved_at`)

### 1.7 Notifications & Settings
- `notifications`: การแจ้งเตือนในระบบ (`id`, `recipient_id`, `title`, `message`, `notification_type`, `link_url`, `is_read`)
- `system_settings`: การตั้งค่าระบบแบบ Configurable (`id`, `setting_key`, `setting_value`, `description`)

---

## 2. Future Migration-Ready Tables (Section 39)
ระบบได้สร้างโครงสร้างพร้อมรองรับ Phase ถัดไปโดยไม่ต้องรื้อฐานข้อมูลใหม่:
- `ot_requests`, `ot_participants`: โมดูลล่วงเวลา (OT Management)
- `skills`, `employee_skills`: โมดูลทักษะและความเชี่ยวชาญ (Competency Matrix)
- `workforce_requirements`, `workforce_daily_snapshot`: โมดูลเชื่อมโยงแผนผลิต (Production Plan Manpower Linkage)
