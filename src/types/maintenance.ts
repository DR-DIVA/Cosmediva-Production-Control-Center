export type MachineCriticality = 'A' | 'B' | 'C'

export type MachineStatus = 
  | 'Running'
  | 'Stopped'
  | 'Breakdown'
  | 'Under Repair'
  | 'Waiting Part'
  | 'PM Due'
  | 'Under PM'
  | 'Standby'
  | 'Decommissioned'

export type PriorityLevel = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_NORMAL' | 'P4_LOW'

export type WorkOrderStatus = 
  | 'NEW'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_PART'
  | 'WAITING_EXTERNAL'
  | 'TEST_RUN'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'CLOSED'

export type SymptomCategory = 
  | 'เครื่องไม่ทำงาน'
  | 'เครื่องหยุดกลางงาน'
  | 'เสียงผิดปกติ'
  | 'สั่นผิดปกติ'
  | 'รั่ว'
  | 'ไฟฟ้า'
  | 'Sensor'
  | 'Motor'
  | 'Pneumatic'
  | 'Hydraulic'
  | 'Temperature'
  | 'Speed'
  | 'Quality Problem'
  | 'Safety Problem'
  | 'Other'
  | (string & {})

export type ProductionImpact = 
  | 'Machine stopped'
  | 'Production stopped'
  | 'Intermittent stops'
  | 'Production can continue'
  | 'Facility no impact'
  | 'Quality risk'
  | 'Safety risk'
  | (string & {})

export type RootCauseCategory = 
  | 'Wear & Tear'
  | 'Lack of Lubrication'
  | 'Loose Part'
  | 'Electrical Failure'
  | 'Sensor Failure'
  | 'Overload'
  | 'Improper Operation'
  | 'Contamination'
  | 'Cleaning Issue'
  | 'Incorrect Setup'
  | 'PM Missed'
  | 'Part Lifetime'
  | 'Design Problem'
  | 'Unknown'

export interface MaintenanceMachine {
  id: string
  asset_id: string | null
  machine_code: string
  machine_name: string
  category: string
  department_id: string | null
  department_code: string | null
  department_name: string | null
  production_area: string | null
  room_id: string | null
  room_name: string | null
  line: string | null
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  installation_date: string | null
  purchase_date: string | null
  purchase_cost: number
  supplier: string | null
  warranty_expiry: string | null
  criticality: MachineCriticality
  status: MachineStatus
  responsible_technician_id: string | null
  responsible_technician_name: string | null
  photo_url: string | null
  manual_url: string | null
  specification: Record<string, any> | null
  electrical_info: Record<string, any> | null
  maintenance_instruction: string | null
  hourly_downtime_cost: number
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  pm_plan?: MaintenancePMPlan | null
  pm_frequency_type?: string | null
  pm_frequency_interval?: number | null
  pm_next_due_date?: string | null
  // Subcontract / Outsource PM fields
  is_subcontract_pm?: boolean
  subcontractor_name?: string | null
  subcontractor_contact?: string | null
  subcontract_scope?: string | null
  // Calibration (CAL) fields
  requires_calibration?: boolean
  calibration_frequency?: string | null
  last_calibration_date?: string | null
  next_calibration_date?: string | null
  calibration_lab?: string | null
  calibration_cert_no?: string | null
}

export interface MaintenanceSparePart {
  id: string
  part_code: string
  part_name: string
  category: string
  brand: string | null
  model: string | null
  specification: string | null
  compatible_machines: string[] | null
  supplier: string | null
  unit: string
  stock_qty: number
  min_stock: number
  max_stock: number
  reorder_point: number
  average_cost: number
  last_purchase_price: number
  storage_location: string | null
  photo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MaintenanceWorkOrder {
  id: string
  wo_number: string
  machine_id: string
  machine_code: string
  machine_name: string
  requester_id: string | null
  requester_name: string
  requester_department_id: string | null
  requester_department_name: string | null
  priority: PriorityLevel
  status: WorkOrderStatus
  symptom_category: SymptomCategory | string
  symptom_description: string | null
  production_impact: ProductionImpact | string
  is_emergency_breakdown: boolean
  photo_before_urls: string[] | null
  photo_after_urls: string[] | null
  assigned_technician_id: string | null
  assigned_technician_name: string | null
  supervisor_id: string | null
  supervisor_name: string | null
  
  reported_at: string
  acknowledged_at: string | null
  technician_arrived_at: string | null
  repair_started_at: string | null
  repair_paused_at: string | null
  repair_completed_at: string | null
  test_run_at: string | null
  verified_at: string | null
  closed_at: string | null
  
  total_downtime_minutes: number
  response_time_minutes: number
  repair_time_minutes: number
  waiting_part_minutes: number
  total_part_cost: number
  total_labor_cost: number
  total_maintenance_cost: number
  estimated_downtime_loss: number
  
  problem_category: string | null
  diagnosis: string | null
  root_cause: string | null
  root_cause_detail: string | null
  corrective_action: string | null
  preventive_recommendation: string | null
  
  verification_status: 'PENDING' | 'PASS' | 'FAIL'
  verification_notes: string | null
  verified_by_id: string | null
  verified_by_name: string | null
  
  is_repeated_failure: boolean
  repeat_count_90d: number
  is_deleted: boolean
  created_at: string
  updated_at: string
  
  // Relations
  parts?: MaintenanceWOPart[]
  status_logs?: MaintenanceWOStatusLog[]
  machine?: MaintenanceMachine
}

export interface MaintenanceWOStatusLog {
  id: string
  work_order_id: string
  from_status: WorkOrderStatus | null
  to_status: WorkOrderStatus
  changed_by_name: string
  changed_by_id: string | null
  duration_minutes: number
  notes: string | null
  created_at: string
}

export interface MaintenanceWOPart {
  id: string
  work_order_id: string
  spare_part_id: string
  part_code: string
  part_name: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  issued_by_name: string | null
  used_at: string
  notes: string | null
  created_at: string
}

export interface MaintenancePMPlan {
  id: string
  plan_code: string
  plan_name: string
  machine_id: string | null
  machine_code: string
  machine_name: string
  frequency_type: 'Daily' | 'Weekly' | 'Monthly' | 'Every 2 Months' | 'Quarterly' | 'Every 4 Months' | 'BiAnnually' | 'Yearly' | 'Meter_Hours' | string
  frequency_interval: number
  estimated_minutes: number
  checklist_template: { item: string; standard: string; method: string }[]
  safety_requirements: string | null
  required_tools: string | null
  required_parts: string | null
  schedule_months?: string[]
  is_active: boolean
  last_completed_at: string | null
  next_due_date: string | null
  created_at: string
  updated_at: string
  machine?: MaintenanceMachine
  adjustment_count?: number
}

export interface MaintenancePMAdjustmentLog {
  id: string
  pm_plan_id: string
  machine_id: string | null
  machine_code: string
  old_frequency_type: string | null
  new_frequency_type: string
  old_frequency_interval: number | null
  new_frequency_interval: number
  old_due_date: string | null
  new_due_date: string | null
  reason: string
  adjusted_by_name: string
  adjusted_by_id: string | null
  created_at: string
}


export interface MaintenanceNotification {
  id: string
  recipient_role: string | null
  recipient_id: string | null
  title: string
  message: string
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'
  work_order_id: string | null
  machine_code: string | null
  link_url: string | null
  is_read: boolean
  created_at: string
}

export type MachineRequestType = 
  | 'NEW_MACHINE'   // 1. ขอเพิ่มเครื่องจักรใหม่
  | 'DECOMMISSION'  // 2. ขอยกเลิกใช้ / ปลดระวาง
  | 'RELOCATE'      // 3. ขอโอนย้ายสังกัด / แผนก / พื้นที่
  | 'OTHER'         // 4. ขอกรณีอื่นๆ (ดัดแปลง / เปลี่ยนสเปก)

export type MachineRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface MaintenanceMachineRequest {
  id: string
  request_number: string
  request_type: MachineRequestType
  machine_id?: string | null
  machine_code: string
  machine_name: string
  current_department?: string | null
  current_location?: string | null
  target_department?: string | null
  target_location?: string | null
  proposed_machine_data?: any
  reason: string
  status: MachineRequestStatus
  requested_by_name: string
  requested_by_dept?: string | null
  requested_at: string
  reviewed_by_name?: string | null
  reviewed_at?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  approver_comment?: string | null
  rejection_reason?: string | null
  execution_status?: 'PENDING' | 'COMPLETED' | 'FAILED' | null
  dcc_doc_code: string
  created_at: string
  updated_at: string
}

export interface MachineAuditChange {
  field: string
  label: string
  old_value: any
  new_value: any
}

export interface MaintenanceMachineAuditLog {
  id: string
  machine_id: string
  machine_code: string
  machine_name: string
  edited_by_name: string
  edit_reason: string
  changes_summary: MachineAuditChange[]
  created_at: string
}

export interface PmFrequencyInfo {
  code: 'PM1' | 'PM2' | 'PM3' | 'PM4' | 'PM6' | 'PM12'
  interval: number
  label: string
  full: string
  color: string
}

export function getPmFrequencyInfo(frequencyType?: string | null, interval?: number | null): PmFrequencyInfo {
  const norm = (frequencyType || '').toLowerCase().trim()
  const intVal = Number(interval) || 0

  if (norm === 'pm12' || norm.includes('12') || norm === 'yearly' || intVal === 12) {
    return { code: 'PM12', interval: 12, label: 'ทุก 12 เดือน', full: 'PM12 = ทุก 12 เดือน', color: 'bg-amber-50 border-amber-300 text-amber-900' }
  }
  if (norm === 'pm6' || norm.includes('6') || norm.includes('biannual') || intVal === 6) {
    return { code: 'PM6', interval: 6, label: 'ทุก 6 เดือน', full: 'PM6 = ทุก 6 เดือน', color: 'bg-emerald-50 border-emerald-300 text-emerald-900' }
  }
  if (norm === 'pm4' || norm.includes('4') || intVal === 4) {
    return { code: 'PM4', interval: 4, label: 'ทุก 4 เดือน', full: 'PM4 = ทุก 4 เดือน', color: 'bg-purple-50 border-purple-300 text-purple-900' }
  }
  if (norm === 'pm3' || norm.includes('3') || norm.includes('quarter') || intVal === 3) {
    return { code: 'PM3', interval: 3, label: 'ทุก 3 เดือน', full: 'PM3 = ทุก 3 เดือน', color: 'bg-indigo-50 border-indigo-300 text-indigo-900' }
  }
  if (norm === 'pm2' || norm.includes('2') || intVal === 2) {
    return { code: 'PM2', interval: 2, label: 'ทุก 2 เดือน', full: 'PM2 = ทุก 2 เดือน', color: 'bg-blue-50 border-blue-300 text-blue-900' }
  }
  // Default to PM1
  return { code: 'PM1', interval: 1, label: 'ทุก 1 เดือน', full: 'PM1 = ทุก 1 เดือน', color: 'bg-cyan-50 border-cyan-300 text-cyan-900' }
}



