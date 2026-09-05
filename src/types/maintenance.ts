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

export type ProductionImpact = 
  | 'Machine stopped'
  | 'Production stopped'
  | 'Production can continue'
  | 'Quality risk'
  | 'Safety risk'

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
  frequency_type: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'BiAnnually' | 'Yearly' | 'Meter_Hours'
  frequency_interval: number
  estimated_minutes: number
  checklist_template: { item: string; standard: string; method: string }[]
  safety_requirements: string | null
  required_tools: string | null
  required_parts: string | null
  is_active: boolean
  last_completed_at: string | null
  next_due_date: string | null
  created_at: string
  updated_at: string
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
