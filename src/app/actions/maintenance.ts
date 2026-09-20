'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { 
  MaintenanceMachine, 
  MaintenanceWorkOrder, 
  MaintenanceSparePart,
  MaintenancePMPlan,
  MaintenancePMAdjustmentLog,
  PriorityLevel,
  WorkOrderStatus,
  MaintenanceMachineRequest,
  MachineRequestType,
  MachineRequestStatus,
  MaintenanceMachineAuditLog
} from '@/types/maintenance'
import { dispatchWorkOrderLineAlert } from '@/app/actions/line'

/**
 * Generate sequential WO number: WO-YYYY-XXXXXX
 */
async function generateWONumber(supabase: any): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `WO-${currentYear}-`
  
  const { data } = await supabase
    .from('maintenance_work_orders')
    .select('wo_number')
    .like('wo_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  let nextSeq = 100001
  if (data && data.length > 0) {
    const lastNumber = data[0].wo_number
    const match = lastNumber.match(/WO-\d{4}-(\d+)/)
    if (match && match[1]) {
      nextSeq = parseInt(match[1], 10) + 1
    }
  }

  return `${prefix}${nextSeq.toString().padStart(6, '0')}`
}

/**
 * Get list of all machines with optional filtering
 */
export async function getMachines(filters?: {
  category?: string
  status?: string
  criticality?: string
  search?: string
}) {
  const supabase = createAdminClient()
  let query = supabase
    .from('maintenance_machines')
    .select('*')
    .eq('is_deleted', false)
    .order('machine_code', { ascending: true })

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.criticality && filters.criticality !== 'all') {
    query = query.eq('criticality', filters.criticality)
  }
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`machine_code.ilike.${s},machine_name.ilike.${s},production_area.ilike.${s}`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching machines:', error)
    return { success: false, error: error.message, data: [] }
  }

  // Fetch PM plans to attach PM frequency to each machine
  const { data: allPlans } = await supabase
    .from('maintenance_pm_plans')
    .select('id, machine_id, machine_code, frequency_type, frequency_interval, next_due_date, plan_code')

  const planMap = new Map<string, any>()
  if (allPlans) {
    allPlans.forEach(p => {
      if (p.machine_id) planMap.set(p.machine_id, p)
      if (p.machine_code) planMap.set(p.machine_code, p)
    })
  }

  const enrichedMachines = (data || []).map(m => {
    const p = planMap.get(m.id) || planMap.get(m.machine_code)
    const spec = (m.specification || {}) as Record<string, any>
    const sub = spec.subcontract || {}
    const cal = spec.calibration || {}

    return {
      ...m,
      pm_plan: p || null,
      pm_frequency_type: p?.frequency_type || null,
      pm_frequency_interval: p?.frequency_interval || null,
      pm_next_due_date: p?.next_due_date || null,
      is_subcontract_pm: Boolean(sub.is_subcontract_pm ?? m.is_subcontract_pm ?? false),
      subcontractor_name: sub.subcontractor_name ?? m.subcontractor_name ?? null,
      subcontractor_contact: sub.subcontractor_contact ?? m.subcontractor_contact ?? null,
      subcontract_scope: sub.subcontract_scope ?? m.subcontract_scope ?? null,
      requires_calibration: Boolean(cal.requires_calibration ?? m.requires_calibration ?? false),
      calibration_frequency: cal.calibration_frequency ?? m.calibration_frequency ?? null,
      last_calibration_date: cal.last_calibration_date ?? m.last_calibration_date ?? null,
      next_calibration_date: cal.next_calibration_date ?? m.next_calibration_date ?? null,
      calibration_lab: cal.calibration_lab ?? m.calibration_lab ?? null,
      calibration_cert_no: cal.calibration_cert_no ?? m.calibration_cert_no ?? null
    }
  })

  return { success: true, data: enrichedMachines as MaintenanceMachine[] }
}

/**
 * Create a new machine in Machine Master
 */
export async function createMachine(payload: {
  machine_code: string
  machine_name: string
  category: string
  department_name?: string
  production_area?: string
  line?: string
  criticality?: 'A' | 'B' | 'C'
  manufacturer?: string
  model?: string
  serial_number?: string
  supplier?: string
  asset_id?: string
  hourly_downtime_cost?: number
  maintenance_instruction?: string
  // Subcontract PM fields
  is_subcontract_pm?: boolean
  subcontractor_name?: string
  subcontractor_contact?: string
  subcontract_scope?: string
  // Calibration (CAL) fields
  requires_calibration?: boolean
  calibration_frequency?: string
  last_calibration_date?: string
  next_calibration_date?: string
  calibration_lab?: string
  calibration_cert_no?: string
}) {
  const supabase = createAdminClient()

  const code = payload.machine_code.trim().toUpperCase()
  const { data: existing } = await supabase
    .from('maintenance_machines')
    .select('id')
    .eq('machine_code', code)
    .maybeSingle()

  if (existing) {
    return { success: false, error: `รหัสเครื่องจักร ${code} มีอยู่ในระบบแล้ว` }
  }

  const specData = {
    subcontract: {
      is_subcontract_pm: Boolean(payload.is_subcontract_pm),
      subcontractor_name: payload.subcontractor_name?.trim() || '',
      subcontractor_contact: payload.subcontractor_contact?.trim() || '',
      subcontract_scope: payload.subcontract_scope?.trim() || ''
    },
    calibration: {
      requires_calibration: Boolean(payload.requires_calibration),
      calibration_frequency: payload.calibration_frequency?.trim() || '',
      last_calibration_date: payload.last_calibration_date || null,
      next_calibration_date: payload.next_calibration_date || null,
      calibration_lab: payload.calibration_lab?.trim() || '',
      calibration_cert_no: payload.calibration_cert_no?.trim() || ''
    }
  }

  const { data, error } = await supabase
    .from('maintenance_machines')
    .insert({
      machine_code: code,
      machine_name: payload.machine_name.trim(),
      category: payload.category || 'Other',
      department_name: payload.department_name || 'ฝ่ายผลิต (Production)',
      production_area: payload.production_area || '',
      line: payload.line || '',
      criticality: payload.criticality || 'B',
      status: 'Running',
      manufacturer: payload.manufacturer || '',
      model: payload.model || '',
      serial_number: payload.serial_number || '',
      supplier: payload.supplier || '',
      asset_id: payload.asset_id || '',
      hourly_downtime_cost: payload.hourly_downtime_cost || 5000,
      maintenance_instruction: payload.maintenance_instruction || '',
      specification: specData
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/machines')
  return { success: true, data }
}

/**
 * Update an existing machine in Machine Master
 */
export async function updateMachine(id: string, payload: {
  machine_code?: string
  machine_name: string
  category: string
  department_name?: string
  production_area?: string
  line?: string
  criticality?: 'A' | 'B' | 'C'
  status?: 'Running' | 'Breakdown' | 'Under Repair' | 'Standby' | 'Decommissioned'
  manufacturer?: string
  model?: string
  serial_number?: string
  supplier?: string
  asset_id?: string
  hourly_downtime_cost?: number
  maintenance_instruction?: string
  // Subcontract PM fields
  is_subcontract_pm?: boolean
  subcontractor_name?: string
  subcontractor_contact?: string
  subcontract_scope?: string
  // Calibration (CAL) fields
  requires_calibration?: boolean
  calibration_frequency?: string
  last_calibration_date?: string
  next_calibration_date?: string
  calibration_lab?: string
  calibration_cert_no?: string
  // Mandatory GMP Audit Trail fields
  edited_by_name: string
  edit_reason: string
}) {
  const supabase = createAdminClient()

  if (!payload.edit_reason || payload.edit_reason.trim().length < 5) {
    return { success: false, error: 'กรุณาระบุเหตุผลความจำเป็นในการแก้ไขข้อมูลอย่างน้อย 5 ตัวอักษร เพื่อการสอบกลับ (Audit Trail)' }
  }

  if (!payload.edited_by_name || !payload.edited_by_name.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อผู้แก้ไขข้อมูล เพื่อการสอบกลับ (Audit Trail)' }
  }

  // 1. Fetch current machine before update
  const { data: currentMachine, error: fetchErr } = await supabase
    .from('maintenance_machines')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !currentMachine) {
    return { success: false, error: 'ไม่พบข้อมูลเครื่องจักรที่ต้องการแก้ไข' }
  }

  const currentSpec = (currentMachine.specification || {}) as Record<string, any>
  const currentSub = currentSpec.subcontract || {}
  const currentCal = currentSpec.calibration || {}

  const newSub = {
    is_subcontract_pm: payload.is_subcontract_pm !== undefined ? payload.is_subcontract_pm : Boolean(currentSub.is_subcontract_pm ?? false),
    subcontractor_name: payload.subcontractor_name !== undefined ? payload.subcontractor_name.trim() : (currentSub.subcontractor_name || ''),
    subcontractor_contact: payload.subcontractor_contact !== undefined ? payload.subcontractor_contact.trim() : (currentSub.subcontractor_contact || ''),
    subcontract_scope: payload.subcontract_scope !== undefined ? payload.subcontract_scope.trim() : (currentSub.subcontract_scope || '')
  }

  const newCal = {
    requires_calibration: payload.requires_calibration !== undefined ? payload.requires_calibration : Boolean(currentCal.requires_calibration ?? false),
    calibration_frequency: payload.calibration_frequency !== undefined ? payload.calibration_frequency.trim() : (currentCal.calibration_frequency || ''),
    last_calibration_date: payload.last_calibration_date !== undefined ? (payload.last_calibration_date || null) : (currentCal.last_calibration_date || null),
    next_calibration_date: payload.next_calibration_date !== undefined ? (payload.next_calibration_date || null) : (currentCal.next_calibration_date || null),
    calibration_lab: payload.calibration_lab !== undefined ? payload.calibration_lab.trim() : (currentCal.calibration_lab || ''),
    calibration_cert_no: payload.calibration_cert_no !== undefined ? payload.calibration_cert_no.trim() : (currentCal.calibration_cert_no || '')
  }

  const updatedSpecification = {
    ...currentSpec,
    subcontract: newSub,
    calibration: newCal
  }

  const updateData: any = {
    machine_name: payload.machine_name.trim(),
    category: payload.category || 'Other',
    department_name: payload.department_name || '',
    production_area: payload.production_area || '',
    line: payload.line || '',
    criticality: payload.criticality || 'B',
    manufacturer: payload.manufacturer || '',
    model: payload.model || '',
    serial_number: payload.serial_number || '',
    supplier: payload.supplier !== undefined ? payload.supplier : currentMachine.supplier,
    asset_id: payload.asset_id !== undefined ? payload.asset_id : currentMachine.asset_id,
    hourly_downtime_cost: payload.hourly_downtime_cost ?? 0,
    maintenance_instruction: payload.maintenance_instruction || '',
    specification: updatedSpecification,
    updated_at: new Date().toISOString()
  }

  if (payload.status) {
    updateData.status = payload.status
  }

  if (payload.machine_code) {
    const code = payload.machine_code.trim().toUpperCase()
    // Check if new code conflicts with another machine
    const { data: conflict } = await supabase
      .from('maintenance_machines')
      .select('id')
      .eq('machine_code', code)
      .neq('id', id)
      .maybeSingle()

    if (conflict) {
      return { success: false, error: `รหัสเครื่องจักร ${code} ซ้ำกับเครื่องอื่นในระบบ` }
    }
    updateData.machine_code = code
  }

  // 2. Compute diff for Audit Trail
  const FIELD_LABELS: Record<string, string> = {
    machine_code: 'รหัสเครื่องจักร',
    machine_name: 'ชื่อเครื่องจักร',
    category: 'หมวดหมู่',
    department_name: 'แผนกสังกัด',
    production_area: 'พื้นที่ / ห้องผลิต',
    criticality: 'ระดับวิกฤตภาพ (Criticality)',
    status: 'สถานะการทำงาน',
    manufacturer: 'ยี่ห้อ / ผู้ผลิต',
    model: 'รุ่น',
    serial_number: 'หมายเลขซีเรียล (S/N)',
    supplier: 'ผู้จำหน่าย (Supplier)',
    asset_id: 'เลขทะเบียนทรัพย์สิน (Asset ID)',
    hourly_downtime_cost: 'ต้นทุน Downtime (บาท/ชม.)',
    maintenance_instruction: 'คำแนะนำการบำรุงรักษา'
  }

  const changes: { field: string; label: string; old_value: any; new_value: any }[] = []
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    if (key in updateData) {
      const oldVal = currentMachine[key] ?? ''
      const newVal = updateData[key] ?? ''
      if (String(oldVal).trim() !== String(newVal).trim()) {
        changes.push({
          field: key,
          label,
          old_value: oldVal,
          new_value: newVal
        })
      }
    }
  }

  // Check subcontract differences
  if (Boolean(currentSub.is_subcontract_pm) !== Boolean(newSub.is_subcontract_pm)) {
    changes.push({
      field: 'is_subcontract_pm',
      label: 'การจ้าง PM ภายนอก (Subcontract)',
      old_value: currentSub.is_subcontract_pm ? 'จ้าง Subcontract' : 'MT ภายในดูแล',
      new_value: newSub.is_subcontract_pm ? 'จ้าง Subcontract' : 'MT ภายในดูแล'
    })
  }
  if ((currentSub.subcontractor_name || '') !== (newSub.subcontractor_name || '')) {
    changes.push({
      field: 'subcontractor_name',
      label: 'ผู้รับเหมา Subcontract',
      old_value: currentSub.subcontractor_name || '-',
      new_value: newSub.subcontractor_name || '-'
    })
  }
  if ((currentSub.subcontractor_contact || '') !== (newSub.subcontractor_contact || '')) {
    changes.push({
      field: 'subcontractor_contact',
      label: 'เบอร์ติดต่อ / สัญญา Subcontract',
      old_value: currentSub.subcontractor_contact || '-',
      new_value: newSub.subcontractor_contact || '-'
    })
  }
  if ((currentSub.subcontract_scope || '') !== (newSub.subcontract_scope || '')) {
    changes.push({
      field: 'subcontract_scope',
      label: 'ขอบเขตงาน Subcontract',
      old_value: currentSub.subcontract_scope || '-',
      new_value: newSub.subcontract_scope || '-'
    })
  }

  // Check calibration differences
  if (Boolean(currentCal.requires_calibration) !== Boolean(newCal.requires_calibration)) {
    changes.push({
      field: 'requires_calibration',
      label: 'ต้องสอบเทียบเครื่องมือวัด (CAL)',
      old_value: currentCal.requires_calibration ? 'ต้องสอบเทียบ (CAL)' : 'ไม่ต้องสอบเทียบ',
      new_value: newCal.requires_calibration ? 'ต้องสอบเทียบ (CAL)' : 'ไม่ต้องสอบเทียบ'
    })
  }
  if ((currentCal.calibration_frequency || '') !== (newCal.calibration_frequency || '')) {
    changes.push({
      field: 'calibration_frequency',
      label: 'ความถี่การสอบเทียบ (CAL)',
      old_value: currentCal.calibration_frequency || '-',
      new_value: newCal.calibration_frequency || '-'
    })
  }
  if ((currentCal.last_calibration_date || '') !== (newCal.last_calibration_date || '')) {
    changes.push({
      field: 'last_calibration_date',
      label: 'วันที่สอบเทียบล่าสุด (Last CAL)',
      old_value: currentCal.last_calibration_date || '-',
      new_value: newCal.last_calibration_date || '-'
    })
  }
  if ((currentCal.next_calibration_date || '') !== (newCal.next_calibration_date || '')) {
    changes.push({
      field: 'next_calibration_date',
      label: 'กำหนดสอบเทียบครั้งถัดไป (Next CAL)',
      old_value: currentCal.next_calibration_date || '-',
      new_value: newCal.next_calibration_date || '-'
    })
  }
  if ((currentCal.calibration_lab || '') !== (newCal.calibration_lab || '')) {
    changes.push({
      field: 'calibration_lab',
      label: 'สถาบัน / ผู้ให้บริการสอบเทียบ',
      old_value: currentCal.calibration_lab || '-',
      new_value: newCal.calibration_lab || '-'
    })
  }
  if ((currentCal.calibration_cert_no || '') !== (newCal.calibration_cert_no || '')) {
    changes.push({
      field: 'calibration_cert_no',
      label: 'เลขที่ใบรับรองการสอบเทียบ (CAL Cert)',
      old_value: currentCal.calibration_cert_no || '-',
      new_value: newCal.calibration_cert_no || '-'
    })
  }

  if (changes.length === 0) {
    return { success: false, error: 'ไม่มีข้อมูลใดเปลี่ยนแปลง ไม่จำเป็นต้องบันทึก' }
  }

  // 3. Update machine
  const { data, error } = await supabase
    .from('maintenance_machines')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // 4. Record Audit Log for Traceability
  const nowIso = new Date().toISOString()
  await supabase
    .from('maintenance_machine_audit_logs')
    .insert({
      machine_id: id,
      machine_code: data.machine_code,
      machine_name: data.machine_name,
      edited_by_name: payload.edited_by_name.trim(),
      edit_reason: payload.edit_reason.trim(),
      changes_summary: changes,
      created_at: nowIso
    })

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/machines')
  revalidatePath(`/maintenance/machines/${data.machine_code}`)
  revalidatePath('/maintenance/qr-print')
  return { success: true, data, changesCount: changes.length }
}

/**
 * Get audit logs for a specific machine for traceability
 */
export async function getMachineAuditLogs(machineId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('maintenance_machine_audit_logs')
    .select('*')
    .eq('machine_id', machineId)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, data: data as MaintenanceMachineAuditLog[] }
}


/**
 * Soft delete a machine from Machine Master
 */
export async function deleteMachine(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('maintenance_machines')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/machines')
  revalidatePath('/maintenance/qr-print')
  return { success: true }
}

/**
 * Get complete Machine 360° Profile
 */
export async function getMachine360(identifier: string) {
  const supabase = createAdminClient()

  // 1. Fetch Machine by UUID (id) or Machine Code
  const decoded = decodeURIComponent(identifier).trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)

  let query = supabase
    .from('maintenance_machines')
    .select('*')
    .eq('is_deleted', false)

  if (isUuid) {
    query = query.eq('id', decoded)
  } else {
    query = query.eq('machine_code', decoded)
  }

  const { data: machine, error: mErr } = await query.maybeSingle()

  if (mErr || !machine) {
    return { success: false, error: mErr?.message || 'ไม่พบเครื่องจักร' }
  }

  // 2. Fetch Active Work Orders (not CLOSED or VERIFIED)
  const { data: activeWOs } = await supabase
    .from('maintenance_work_orders')
    .select('*')
    .eq('machine_id', machine.id)
    .not('status', 'in', '("CLOSED","VERIFIED")')
    .order('created_at', { ascending: false })

  // 3. Fetch Historical Work Orders
  const { data: historyWOs } = await supabase
    .from('maintenance_work_orders')
    .select(`
      *,
      parts:maintenance_wo_parts(*)
    `)
    .eq('machine_id', machine.id)
    .in('status', ['CLOSED', 'VERIFIED'])
    .order('reported_at', { ascending: false })

  // 4. Fetch Spare Parts Consumed by this machine across all time
  const { data: partsConsumed } = await supabase
    .from('maintenance_wo_parts')
    .select(`
      *,
      wo:maintenance_work_orders!inner(machine_id, machine_code)
    `)
    .eq('wo.machine_id', machine.id)
    .order('used_at', { ascending: false })

  // 5. Calculate MTTR, MTBF, Total Downtime
  const completedJobs = historyWOs || []
  const totalBreakdowns = completedJobs.length
  let totalDowntimeMin = 0
  let totalRepairMin = 0
  let totalPartCost = 0

  completedJobs.forEach((job: any) => {
    totalDowntimeMin += Number(job.total_downtime_minutes || 0)
    totalRepairMin += Number(job.repair_time_minutes || 0)
    totalPartCost += Number(job.total_part_cost || 0)
  })

  const mttrMinutes = totalBreakdowns > 0 ? Math.round(totalRepairMin / totalBreakdowns) : 0
  // Estimated operating hours approx 24h * 180 days - downtime
  const estimatedOpHours = 180 * 24 - (totalDowntimeMin / 60)
  const mtbfHours = totalBreakdowns > 0 ? Math.round(estimatedOpHours / totalBreakdowns) : estimatedOpHours

  // Check repeated failures (failure in same symptom/category in 90 days)
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const recentFailures = completedJobs.filter((j: any) => new Date(j.reported_at) >= ninetyDaysAgo)
  const isRepeatedBadActor = recentFailures.length >= 2

  // 5. Fetch PM Plan & PM Adjustment Logs
  const { data: pmPlan } = await supabase
    .from('maintenance_pm_plans')
    .select('*')
    .or(`machine_id.eq.${machine.id},machine_code.eq.${machine.machine_code}`)
    .maybeSingle()

  let pmAdjustmentLogs: any[] = []
  if (pmPlan) {
    const { data: logs } = await supabase
      .from('maintenance_pm_adjustment_logs')
      .select('*')
      .eq('pm_plan_id', pmPlan.id)
      .order('created_at', { ascending: false })
    pmAdjustmentLogs = logs || []
  }

  // 6. Fetch Machine Modification Audit Logs (Traceability)
  const { data: auditLogs } = await supabase
    .from('maintenance_machine_audit_logs')
    .select('*')
    .eq('machine_id', machine.id)
    .order('created_at', { ascending: false })

  // Enrich machine with subcontract and calibration fields
  const spec = (machine.specification || {}) as Record<string, any>
  const sub = spec.subcontract || {}
  const cal = spec.calibration || {}
  const enrichedMachine: MaintenanceMachine = {
    ...machine,
    is_subcontract_pm: Boolean(sub.is_subcontract_pm ?? machine.is_subcontract_pm ?? false),
    subcontractor_name: sub.subcontractor_name ?? machine.subcontractor_name ?? null,
    subcontractor_contact: sub.subcontractor_contact ?? machine.subcontractor_contact ?? null,
    subcontract_scope: sub.subcontract_scope ?? machine.subcontract_scope ?? null,
    requires_calibration: Boolean(cal.requires_calibration ?? machine.requires_calibration ?? false),
    calibration_frequency: cal.calibration_frequency ?? machine.calibration_frequency ?? null,
    last_calibration_date: cal.last_calibration_date ?? machine.last_calibration_date ?? null,
    next_calibration_date: cal.next_calibration_date ?? machine.next_calibration_date ?? null,
    calibration_lab: cal.calibration_lab ?? machine.calibration_lab ?? null,
    calibration_cert_no: cal.calibration_cert_no ?? machine.calibration_cert_no ?? null
  }

  return {
    success: true,
    data: {
      machine: enrichedMachine,
      activeWorkOrders: activeWOs || [],
      historyWorkOrders: completedJobs,
      partsConsumed: partsConsumed || [],
      pmPlan: pmPlan as MaintenancePMPlan | null,
      pmAdjustmentLogs: pmAdjustmentLogs,
      machineAuditLogs: (auditLogs || []) as MaintenanceMachineAuditLog[],
      metrics: {
        totalBreakdowns,
        totalDowntimeMinutes: totalDowntimeMin,
        totalDowntimeHours: (totalDowntimeMin / 60).toFixed(1),
        totalRepairMinutes: totalRepairMin,
        mttrMinutes,
        mtbfHours,
        totalPartCost,
        isRepeatedBadActor,
        recentFailureCount: recentFailures.length
      }
    }
  }
}

/**
 * Fast Digital Repair Request (≤ 60s)
 */
export async function createRepairRequest(payload: {
  machine_code: string
  symptom_category: string
  symptom_description?: string
  production_impact: string
  is_emergency_breakdown?: boolean
  requester_name: string
  requester_department_name?: string
  photo_before_urls?: string[]
}) {
  const supabase = createAdminClient()

  // 1. Resolve Machine
  const { data: machine, error: mErr } = await supabase
    .from('maintenance_machines')
    .select('*')
    .eq('machine_code', payload.machine_code)
    .single()

  if (mErr || !machine) {
    return { success: false, error: `ไม่พบเครื่องจักร ${payload.machine_code}` }
  }

  // 2. Recommend/Calculate Priority
  let priority: PriorityLevel = 'P3_NORMAL'
  if (payload.is_emergency_breakdown || payload.production_impact === 'Production stopped') {
    priority = 'P1_CRITICAL'
  } else if (payload.production_impact === 'Machine stopped' || payload.production_impact === 'Safety risk') {
    priority = 'P2_HIGH'
  } else if (payload.production_impact === 'Quality risk' || payload.production_impact === 'Intermittent stops') {
    priority = 'P2_HIGH'
  }

  // 3. Generate Ticket Number
  const woNumber = await generateWONumber(supabase)

  // 4. Check repeated failures in past 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { count: repeatCount } = await supabase
    .from('maintenance_work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('machine_id', machine.id)
    .eq('symptom_category', payload.symptom_category)
    .gte('reported_at', ninetyDaysAgo)

  const isRepeated = (repeatCount || 0) > 0

  // 5. Insert Work Order
  const now = new Date().toISOString()
  const { data: newWO, error: woErr } = await supabase
    .from('maintenance_work_orders')
    .insert({
      wo_number: woNumber,
      machine_id: machine.id,
      machine_code: machine.machine_code,
      machine_name: machine.machine_name,
      requester_name: payload.requester_name || 'พนักงานสายการผลิต',
      requester_department_name: payload.requester_department_name || machine.department_name,
      priority,
      status: 'NEW',
      symptom_category: payload.symptom_category,
      symptom_description: payload.symptom_description || '',
      production_impact: payload.production_impact,
      is_emergency_breakdown: !!payload.is_emergency_breakdown,
      photo_before_urls: payload.photo_before_urls || [],
      reported_at: now,
      is_repeated_failure: isRepeated,
      repeat_count_90d: repeatCount || 0
    })
    .select()
    .single()

  if (woErr) {
    console.error('Error creating work order:', woErr)
    return { success: false, error: woErr.message }
  }

  // 6. If Emergency or Production Stopped, update machine status to Breakdown
  if (priority === 'P1_CRITICAL' || priority === 'P2_HIGH') {
    await supabase
      .from('maintenance_machines')
      .update({ status: 'Breakdown', updated_at: now })
      .eq('id', machine.id)
  }

  // 7. Add Audit status log
  await supabase
    .from('maintenance_wo_status_logs')
    .insert({
      work_order_id: newWO.id,
      from_status: null,
      to_status: 'NEW',
      changed_by_name: payload.requester_name || 'Requester',
      notes: payload.is_emergency_breakdown ? '🚨 กดแจ้งหยุดการผลิตฉุกเฉิน (BREAKDOWN NOW)' : 'แจ้งซ่อมผ่านระบบดิจิทัล'
    })

  // 8. Create Notification
  await supabase
    .from('maintenance_notifications')
    .insert({
      recipient_role: 'technician',
      title: priority === 'P1_CRITICAL' ? `🚨 [CRITICAL] เครื่อง ${machine.machine_code} หยุดการผลิต!` : `งานแจ้งซ่อมใหม่: ${machine.machine_code}`,
      message: `อาการ: ${payload.symptom_category} | โดย: ${payload.requester_name}`,
      priority: priority === 'P1_CRITICAL' ? 'CRITICAL' : 'NORMAL',
      work_order_id: newWO.id,
      machine_code: machine.machine_code,
      link_url: `/maintenance/technician`
    })

  // 9. Dispatch LINE notification in background
  dispatchWorkOrderLineAlert({
    eventType: 'NEW_REPORT',
    workOrder: newWO,
    machine
  }).catch(err => console.error('[LINE] Dispatch error in createRepairRequest:', err))

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/work-orders')
  revalidatePath('/maintenance/technician')
  revalidatePath(`/maintenance/machines/${machine.machine_code}`)

  return { success: true, data: newWO }
}

/**
 * Get Work Orders for Kanban or List
 */
export async function getWorkOrders(filters?: {
  status?: string
  priority?: string
  machineCode?: string
  technicianName?: string
  search?: string
}) {
  const supabase = createAdminClient()
  let query = supabase
    .from('maintenance_work_orders')
    .select(`
      *,
      parts:maintenance_wo_parts(*)
    `)
    .eq('is_deleted', false)
    .order('reported_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority)
  }
  if (filters?.machineCode && filters.machineCode !== 'all') {
    query = query.eq('machine_code', filters.machineCode)
  }
  if (filters?.technicianName && filters.technicianName !== 'all') {
    query = query.eq('assigned_technician_name', filters.technicianName)
  }
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`wo_number.ilike.${s},machine_code.ilike.${s},machine_name.ilike.${s},symptom_category.ilike.${s},symptom_description.ilike.${s}`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching work orders:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data as MaintenanceWorkOrder[] }
}

/**
 * Get Single Work Order Details with Parts and Logs
 */
export async function getWorkOrderById(id: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('maintenance_work_orders')
    .select(`
      *,
      parts:maintenance_wo_parts(*),
      status_logs:maintenance_wo_status_logs(*),
      machine:maintenance_machines(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'ไม่พบใบแจ้งซ่อม' }
  }

  return { success: true, data: data as MaintenanceWorkOrder }
}

/**
 * Transition Work Order State (State Machine Engine)
 */
export async function transitionWorkOrderStatus(payload: {
  work_order_id: string
  to_status: WorkOrderStatus
  changed_by_name: string
  notes?: string
  assigned_technician_name?: string
  problem_category?: string
  diagnosis?: string
  root_cause?: string
  root_cause_detail?: string
  corrective_action?: string
  preventive_recommendation?: string
  photo_after_urls?: string[]
  verification_status?: 'PASS' | 'FAIL'
}) {
  const supabase = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()

  // 1. Fetch current WO
  const { data: wo, error: woErr } = await supabase
    .from('maintenance_work_orders')
    .select('*, machine:maintenance_machines(*)')
    .eq('id', payload.work_order_id)
    .single()

  if (woErr || !wo) {
    return { success: false, error: 'ไม่พบใบแจ้งซ่อม' }
  }

  const updateFields: Record<string, any> = {
    status: payload.to_status,
    updated_at: nowIso
  }

  // Handle specific transitions
  if (payload.to_status === 'ACKNOWLEDGED' && !wo.acknowledged_at) {
    updateFields.acknowledged_at = nowIso
    if (wo.reported_at) {
      const diffMin = Math.round((now.getTime() - new Date(wo.reported_at).getTime()) / 60000)
      updateFields.response_time_minutes = diffMin
    }
  }

  if (payload.to_status === 'ASSIGNED') {
    if (payload.assigned_technician_name) {
      updateFields.assigned_technician_name = payload.assigned_technician_name
    }
    if (!wo.acknowledged_at) updateFields.acknowledged_at = nowIso
  }

  if (payload.to_status === 'IN_PROGRESS') {
    if (!wo.repair_started_at) {
      updateFields.repair_started_at = nowIso
    }
    if (payload.assigned_technician_name) {
      updateFields.assigned_technician_name = payload.assigned_technician_name
    }
    // Update machine status to Under Repair
    await supabase
      .from('maintenance_machines')
      .update({ status: 'Under Repair', updated_at: nowIso })
      .eq('id', wo.machine_id)
  }

  if (payload.to_status === 'WAITING_PART') {
    updateFields.repair_paused_at = nowIso
    await supabase
      .from('maintenance_machines')
      .update({ status: 'Waiting Part', updated_at: nowIso })
      .eq('id', wo.machine_id)
  }

  if (payload.to_status === 'TEST_RUN') {
    updateFields.test_run_at = nowIso
    if (payload.diagnosis) updateFields.diagnosis = payload.diagnosis
    if (payload.problem_category) updateFields.problem_category = payload.problem_category
    if (payload.root_cause) updateFields.root_cause = payload.root_cause
    if (payload.corrective_action) updateFields.corrective_action = payload.corrective_action
  }

  if (payload.to_status === 'COMPLETED') {
    updateFields.repair_completed_at = nowIso
    if (payload.diagnosis) updateFields.diagnosis = payload.diagnosis
    if (payload.problem_category) updateFields.problem_category = payload.problem_category
    if (payload.root_cause) updateFields.root_cause = payload.root_cause
    if (payload.root_cause_detail) updateFields.root_cause_detail = payload.root_cause_detail
    if (payload.corrective_action) updateFields.corrective_action = payload.corrective_action
    if (payload.preventive_recommendation) updateFields.preventive_recommendation = payload.preventive_recommendation
    if (payload.photo_after_urls) updateFields.photo_after_urls = payload.photo_after_urls

    // Calculate active repair time
    if (wo.repair_started_at) {
      const repMin = Math.round((now.getTime() - new Date(wo.repair_started_at).getTime()) / 60000)
      updateFields.repair_time_minutes = repMin
    }
  }

  // PRODUCTION SIGN-OFF
  if (payload.to_status === 'VERIFIED') {
    if (payload.verification_status === 'FAIL') {
      // Revert back to IN_PROGRESS!
      updateFields.status = 'IN_PROGRESS'
      updateFields.verification_status = 'FAIL'
      updateFields.verification_notes = payload.notes || 'การทดสอบเครื่องไม่ผ่าน อาการเดิมยังคงอยู่'
    } else {
      // PASS
      updateFields.status = 'VERIFIED'
      updateFields.verification_status = 'PASS'
      updateFields.verified_at = nowIso
      updateFields.verified_by_name = payload.changed_by_name

      // Calculate total downtime
      if (wo.reported_at) {
        const totalDownMin = Math.round((now.getTime() - new Date(wo.reported_at).getTime()) / 60000)
        updateFields.total_downtime_minutes = totalDownMin
        
        // Calculate financial downtime loss
        const hourlyRate = Number(wo.machine?.hourly_downtime_cost || 5000)
        const loss = (totalDownMin / 60) * hourlyRate
        updateFields.estimated_downtime_loss = Math.round(loss)
      }

      // Machine is back to Running!
      await supabase
        .from('maintenance_machines')
        .update({ status: 'Running', updated_at: nowIso })
        .eq('id', wo.machine_id)
    }
  }

  if (payload.to_status === 'CLOSED') {
    updateFields.closed_at = nowIso
    if (!wo.verified_at) updateFields.verified_at = nowIso
    
    await supabase
      .from('maintenance_machines')
      .update({ status: 'Running', updated_at: nowIso })
      .eq('id', wo.machine_id)
  }

  // Update WO
  const { data: updatedWO, error: updErr } = await supabase
    .from('maintenance_work_orders')
    .update(updateFields)
    .eq('id', payload.work_order_id)
    .select()
    .single()

  if (updErr) {
    console.error('Error updating work order status:', updErr)
    return { success: false, error: updErr.message }
  }

  // Add status log
  await supabase
    .from('maintenance_wo_status_logs')
    .insert({
      work_order_id: payload.work_order_id,
      from_status: wo.status,
      to_status: updateFields.status,
      changed_by_name: payload.changed_by_name,
      notes: payload.notes || `เปลี่ยนสถานะเป็น ${updateFields.status}`
    })

  // Dispatch LINE notification in background
  if (['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(payload.to_status)) {
    dispatchWorkOrderLineAlert({
      eventType: (payload.to_status === 'COMPLETED' || payload.to_status === 'CLOSED') ? 'CLOSED' : 'STATUS_CHANGED',
      workOrder: updatedWO,
      machine: wo.machine,
      changedByName: payload.changed_by_name,
      notes: payload.notes || payload.corrective_action
    }).catch(err => console.error('[LINE] Dispatch status transition error:', err))
  }

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/work-orders')
  revalidatePath('/maintenance/technician')
  revalidatePath(`/maintenance/machines/${wo.machine_code}`)

  return { success: true, data: updatedWO }
}

/**
 * Issue and Deduct Spare Part for Work Order
 */
export async function useSparePart(payload: {
  work_order_id: string
  spare_part_id: string
  quantity: number
  technician_name: string
  notes?: string
}) {
  const supabase = createAdminClient()

  // 1. Fetch Spare Part
  const { data: part, error: pErr } = await supabase
    .from('maintenance_spare_parts')
    .select('*')
    .eq('id', payload.spare_part_id)
    .single()

  if (pErr || !part) {
    return { success: false, error: 'ไม่พบข้อมูลอะไหล่' }
  }

  if (part.stock_qty < payload.quantity) {
    return { 
      success: false, 
      error: `อะไหล่คงเหลือไม่พอ (มี ${part.stock_qty} ${part.unit}, ต้องการ ${payload.quantity} ${part.unit})` 
    }
  }

  const unitCost = Number(part.average_cost || part.last_purchase_price || 0)
  const totalCost = unitCost * payload.quantity
  const newStock = part.stock_qty - payload.quantity

  // 2. Decrement stock
  const { error: stockErr } = await supabase
    .from('maintenance_spare_parts')
    .update({ 
      stock_qty: newStock,
      updated_at: new Date().toISOString()
    })
    .eq('id', part.id)

  if (stockErr) {
    return { success: false, error: 'ไม่สามารถตัดสต็อกอะไหล่ได้' }
  }

  // 3. Record in maintenance_wo_parts
  const { data: woPart, error: insErr } = await supabase
    .from('maintenance_wo_parts')
    .insert({
      work_order_id: payload.work_order_id,
      spare_part_id: part.id,
      part_code: part.part_code,
      part_name: part.part_name,
      quantity: payload.quantity,
      unit: part.unit,
      unit_cost: unitCost,
      total_cost: totalCost,
      issued_by_name: payload.technician_name,
      notes: payload.notes || ''
    })
    .select()
    .single()

  if (insErr) {
    return { success: false, error: insErr.message }
  }

  // 4. Update Work Order total part cost
  const { data: allParts } = await supabase
    .from('maintenance_wo_parts')
    .select('total_cost')
    .eq('work_order_id', payload.work_order_id)

  const sumPartCost = (allParts || []).reduce((acc: number, p: any) => acc + Number(p.total_cost || 0), 0)

  await supabase
    .from('maintenance_work_orders')
    .update({
      total_part_cost: sumPartCost,
      total_maintenance_cost: sumPartCost,
      updated_at: new Date().toISOString()
    })
    .eq('id', payload.work_order_id)

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/technician')
  revalidatePath('/maintenance/spare-parts')
  revalidatePath('/maintenance/work-orders')

  return { success: true, data: woPart, remainingStock: newStock }
}

/**
 * Direct consumable spare part requisition from machine QR scan
 * Deducts stock immediately and records in machine history and WO parts
 */
export async function issueDirectConsumablePart(payload: {
  machine_code: string
  spare_part_id: string
  quantity: number
  issued_by_name: string
  department?: string
  reason?: string
}) {
  const supabase = createAdminClient()
  const now = new Date()

  // 1. Fetch Spare Part
  const { data: part, error: pErr } = await supabase
    .from('maintenance_spare_parts')
    .select('*')
    .eq('id', payload.spare_part_id)
    .single()

  if (pErr || !part) {
    return { success: false, error: 'ไม่พบข้อมูลอะไหล่' }
  }

  if (part.stock_qty < payload.quantity) {
    return {
      success: false,
      error: `อะไหล่คงเหลือไม่พอ (มีคงเหลือ ${part.stock_qty} ${part.unit}, ต้องการเบิก ${payload.quantity} ${part.unit})`
    }
  }

  // 2. Fetch Machine
  const { data: machine } = await supabase
    .from('maintenance_machines')
    .select('id, machine_code, machine_name, department_name')
    .eq('machine_code', payload.machine_code)
    .maybeSingle()

  const unitCost = Number(part.average_cost || part.last_purchase_price || 0)
  const totalCost = unitCost * payload.quantity
  const newStock = part.stock_qty - payload.quantity

  // 3. Decrement stock
  const { error: stockErr } = await supabase
    .from('maintenance_spare_parts')
    .update({
      stock_qty: newStock,
      updated_at: now.toISOString()
    })
    .eq('id', part.id)

  if (stockErr) {
    return { success: false, error: 'ไม่สามารถตัดสต็อกอะไหล่ได้: ' + stockErr.message }
  }

  // 4. Create completed Requisition Work Order
  const woNumber = `REQ-${payload.machine_code}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`

  const { data: wo, error: woErr } = await supabase
    .from('maintenance_work_orders')
    .insert({
      wo_number: woNumber,
      machine_id: machine?.id || null,
      machine_code: payload.machine_code,
      machine_name: machine?.machine_name || payload.machine_code,
      requester_name: payload.issued_by_name,
      priority: 'P3_NORMAL',
      status: 'VERIFIED',
      symptom_category: 'Consumable',
      problem_category: 'Consumable Requisition',
      symptom_description: `เบิกอะไหล่สิ้นเปลืองหน้าเครื่อง: ${part.part_name} (${part.part_code}) จำนวน ${payload.quantity} ${part.unit}`,
      production_impact: 'Normal Operation',
      is_emergency_breakdown: false,
      assigned_technician_name: payload.issued_by_name,
      reported_at: now.toISOString(),
      acknowledged_at: now.toISOString(),
      repair_started_at: now.toISOString(),
      repair_completed_at: now.toISOString(),
      verified_at: now.toISOString(),
      closed_at: now.toISOString(),
      total_downtime_minutes: 0,
      repair_time_minutes: 10,
      total_part_cost: totalCost,
      total_maintenance_cost: totalCost,
      corrective_action: `เบิกใช้งานอะไหล่สิ้นเปลือง: ${part.part_name} จำนวน ${payload.quantity} ${part.unit}. วัตถุประสงค์: ${payload.reason || 'บำรุงรักษาประจำวัน / สิ้นเปลืองตามรอบ'}`,
      root_cause: 'Routine Consumable Usage',
      verified_by_name: payload.issued_by_name,
      verification_status: 'ACCEPTED',
      verification_notes: 'ตัดสต๊อกเรียบร้อย'
    })
    .select()
    .single()

  // 5. Record in maintenance_wo_parts
  if (wo) {
    await supabase
      .from('maintenance_wo_parts')
      .insert({
        work_order_id: wo.id,
        spare_part_id: part.id,
        part_code: part.part_code,
        part_name: part.part_name,
        quantity: payload.quantity,
        unit: part.unit,
        unit_cost: unitCost,
        total_cost: totalCost,
        issued_by_name: payload.issued_by_name,
        notes: payload.reason || 'เบิกอะไหล่สิ้นเปลืองหน้าเครื่อง'
      })
  }

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/spare-parts')
  revalidatePath('/maintenance/machines')
  revalidatePath(`/maintenance/machines/${payload.machine_code}`)
  revalidatePath(`/maintenance/report/${payload.machine_code}`)
  revalidatePath('/maintenance/work-orders')

  return {
    success: true,
    data: {
      woNumber,
      partName: part.part_name,
      quantity: payload.quantity,
      unit: part.unit,
      remainingStock: newStock,
      totalCost
    },
    message: `เบิก ${part.part_name} จำนวน ${payload.quantity} ${part.unit} สำเร็จ! ตัดสต๊อกคงเหลือ ${newStock} ${part.unit}`
  }
}


/**
 * Get Spare Parts List
 */
export async function getSpareParts(filters?: {
  search?: string
  category?: string
  lowStockOnly?: boolean
}) {
  const supabase = createAdminClient()
  let query = supabase
    .from('maintenance_spare_parts')
    .select('*')
    .eq('is_active', true)
    .order('part_code', { ascending: true })

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`part_code.ilike.${s},part_name.ilike.${s},brand.ilike.${s},storage_location.ilike.${s}`)
  }

  const { data, error } = await query
  if (error) {
    return { success: false, error: error.message, data: [] }
  }

  let results = data as MaintenanceSparePart[]
  if (filters?.lowStockOnly) {
    results = results.filter(p => p.stock_qty <= p.min_stock)
  }

  return { success: true, data: results }
}

/**
 * Update Spare Part Safety Stock & Reorder Point
 */
export async function updateSparePartSafetyStock(id: string, payload: {
  min_stock: number
  reorder_point?: number
  max_stock?: number
  storage_location?: string
}) {
  const supabase = createAdminClient()
  const updateData: any = {
    min_stock: Math.max(0, Number(payload.min_stock) || 0),
    updated_at: new Date().toISOString()
  }
  if (payload.reorder_point !== undefined) {
    updateData.reorder_point = Math.max(0, Number(payload.reorder_point) || 0)
  }
  if (payload.max_stock !== undefined) {
    updateData.max_stock = Math.max(0, Number(payload.max_stock) || 0)
  }
  if (payload.storage_location !== undefined) {
    updateData.storage_location = payload.storage_location.trim()
  }

  const { data, error } = await supabase
    .from('maintenance_spare_parts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/maintenance/spare-parts')
  return { success: true, data }
}

/**
 * Create Purchase Requisition (PR) for Spare Part
 */
export async function createSparePartPR(payload: {
  partId: string
  partCode: string
  partName: string
  quantity: number
  unit: string
  estimatedCost: number
  supplier?: string
  reason: string
  requesterName: string
  dccFormRef?: string
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Generate PR Number format: PR-MT-YYMM-XXXX
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${mm}/${yy}`
    const randSeq = Math.floor(1000 + Math.random() * 9000)
    const prNo = `PR-MT${yy}${mm}-${randSeq}`

    // Fetch current spare part to update latest PR note in specification
    const { data: part } = await supabase
      .from('maintenance_spare_parts')
      .select('*')
      .eq('id', payload.partId)
      .single()

    if (part) {
      const currentSpec = part.specification || ''
      // Append or replace latest PR line
      const prLine = `Latest PR: ${prNo} ลว.${dateStr} (${payload.quantity} ${payload.unit})`
      let updatedSpec = currentSpec
      if (currentSpec.includes('Latest PR:')) {
        updatedSpec = currentSpec.replace(/Latest PR:.*$/m, prLine)
      } else {
        updatedSpec = currentSpec ? `${currentSpec}\n${prLine}` : prLine
      }

      await supabase
        .from('maintenance_spare_parts')
        .update({
          specification: updatedSpec,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.partId)
    }

    revalidatePath('/maintenance/spare-parts')
    return {
      success: true,
      data: {
        prNo,
        dateStr,
        ...payload
      }
    }
  } catch (err: any) {
    console.error('Error creating spare part PR:', err)
    return { success: false, error: err.message || 'Failed to create PR' }
  }
}

/**
 * AI Maintenance Assistant: Find Similar Failures & Recommend Fixes
 */
export async function getAISimilarFailures(params: {
  machineCode: string
  symptomCategory: string
}) {
  const supabase = createAdminClient()

  // 1. Search past closed work orders for this machine or same symptom
  const { data: pastJobs } = await supabase
    .from('maintenance_work_orders')
    .select(`
      *,
      parts:maintenance_wo_parts(*)
    `)
    .in('status', ['CLOSED', 'VERIFIED'])
    .or(`machine_code.eq.${params.machineCode},symptom_category.eq.${params.symptomCategory}`)
    .order('reported_at', { ascending: false })
    .limit(5)

  if (!pastJobs || pastJobs.length === 0) {
    return {
      success: true,
      data: {
        similarCases: [],
        suggestedRootCauses: ['ตรวจสอบตามมาตรฐานเครื่องจักร', 'Wear & Tear'],
        recommendedParts: [],
        safetyPrecautions: 'ตัดไฟหลัก (LOTO) และคลายแรงดันลม/ของเหลวก่อนเริ่มตรวจเช็คทุกครั้ง'
      }
    }
  }

  // 2. Aggregate common root causes and parts used
  const rootCausesCount: Record<string, number> = {}
  const partsUsedMap: Record<string, { code: string; name: string; count: number }> = {}

  pastJobs.forEach(job => {
    if (job.root_cause) {
      rootCausesCount[job.root_cause] = (rootCausesCount[job.root_cause] || 0) + 1
    }
    if (job.parts && job.parts.length > 0) {
      job.parts.forEach((p: any) => {
        if (!partsUsedMap[p.part_code]) {
          partsUsedMap[p.part_code] = { code: p.part_code, name: p.part_name, count: 0 }
        }
        partsUsedMap[p.part_code].count += Number(p.quantity || 1)
      })
    }
  })

  const sortedRootCauses = Object.entries(rootCausesCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cause]) => cause)

  return {
    success: true,
    data: {
      similarCases: pastJobs.map(j => ({
        woNumber: j.wo_number,
        machineCode: j.machine_code,
        symptom: j.symptom_category,
        rootCause: j.root_cause,
        correctiveAction: j.corrective_action,
        repairTimeMinutes: j.repair_time_minutes,
        reportedDate: new Date(j.reported_at).toLocaleDateString('th-TH'),
        partsUsed: j.parts?.map((p: any) => p.part_name) || []
      })),
      suggestedRootCauses: sortedRootCauses.length > 0 ? sortedRootCauses : ['Wear & Tear', 'Loose Part'],
      recommendedParts: Object.values(partsUsedMap),
      safetyPrecautions: 'เครื่องจักรมีชิ้นส่วนหมุนและความร้อนสูง ให้ตัดสวิตช์ความปลอดภัย (LOTO) ก่อนเปิดฝาครอบ'
    }
  }
}

/**
 * Maintenance KPI & Analytics Summary
 */
export async function getMaintenanceKPIs() {
  const supabase = createAdminClient()

  // 1. Fetch machines
  const { data: machines } = await supabase
    .from('maintenance_machines')
    .select('id, machine_code, machine_name, category, status, criticality, hourly_downtime_cost')
    .eq('is_deleted', false)

  // 2. Fetch all work orders
  const { data: workOrders } = await supabase
    .from('maintenance_work_orders')
    .select('*')
    .eq('is_deleted', false)

  const allWOs = workOrders || []
  const allMachines = machines || []

  // Metrics
  const openWOs = allWOs.filter(w => !['CLOSED', 'VERIFIED'].includes(w.status))
  const criticalBreakdowns = openWOs.filter(w => w.priority === 'P1_CRITICAL')
  const waitingParts = openWOs.filter(w => w.status === 'WAITING_PART')
  const closedWOs = allWOs.filter(w => ['CLOSED', 'VERIFIED'].includes(w.status))

  let totalDowntimeMin = 0
  let totalRepairMin = 0
  let totalPartCost = 0
  let totalDowntimeLoss = 0

  allWOs.forEach(w => {
    totalDowntimeMin += Number(w.total_downtime_minutes || 0)
    totalRepairMin += Number(w.repair_time_minutes || 0)
    totalPartCost += Number(w.total_part_cost || 0)
    totalDowntimeLoss += Number(w.estimated_downtime_loss || 0)
  })

  const mttrMinutes = closedWOs.length > 0 ? Math.round(totalRepairMin / closedWOs.length) : 0
  const mtbfHours = closedWOs.length > 0 ? Math.round((180 * 24 - (totalDowntimeMin / 60)) / closedWOs.length) : 720

  // Bad Actor Machines (Highest downtime & breakdown counts)
  const machineStats: Record<string, {
    code: string
    name: string
    category: string
    breakdowns: number
    downtimeMin: number
    cost: number
  }> = {}

  allMachines.forEach(m => {
    machineStats[m.machine_code] = {
      code: m.machine_code,
      name: m.machine_name,
      category: m.category,
      breakdowns: 0,
      downtimeMin: 0,
      cost: 0
    }
  })

  allWOs.forEach(w => {
    if (machineStats[w.machine_code]) {
      machineStats[w.machine_code].breakdowns += 1
      machineStats[w.machine_code].downtimeMin += Number(w.total_downtime_minutes || 0)
      machineStats[w.machine_code].cost += Number(w.total_maintenance_cost || 0)
    }
  })

  const topBadActors = Object.values(machineStats)
    .sort((a, b) => b.downtimeMin - a.downtimeMin)
    .slice(0, 5)

  return {
    success: true,
    data: {
      openWOCount: openWOs.length,
      criticalCount: criticalBreakdowns.length,
      waitingPartCount: waitingParts.length,
      closedCount: closedWOs.length,
      totalDowntimeHours: (totalDowntimeMin / 60).toFixed(1),
      totalDowntimeLossThb: totalDowntimeLoss,
      mttrMinutes,
      mtbfHours,
      totalPartCostThb: totalPartCost,
      topBadActors,
      machineCount: allMachines.length,
      runningCount: allMachines.filter(m => m.status === 'Running').length,
      breakdownCount: allMachines.filter(m => ['Breakdown', 'Under Repair'].includes(m.status)).length
    }
  }
}

/**
 * Global Multi-Facet Maintenance Search
 */
export async function searchMaintenance(query: string) {
  if (!query || query.trim().length === 0) {
    return { success: true, data: { machines: [], workOrders: [], parts: [] } }
  }

  const supabase = createAdminClient()
  const q = `%${query.trim()}%`

  const [mRes, woRes, spRes] = await Promise.all([
    supabase
      .from('maintenance_machines')
      .select('id, machine_code, machine_name, category, status, production_area')
      .or(`machine_code.ilike.${q},machine_name.ilike.${q},category.ilike.${q}`)
      .limit(5),
    supabase
      .from('maintenance_work_orders')
      .select('id, wo_number, machine_code, machine_name, symptom_category, status, priority, root_cause')
      .or(`wo_number.ilike.${q},machine_code.ilike.${q},symptom_category.ilike.${q},root_cause.ilike.${q},corrective_action.ilike.${q}`)
      .limit(8),
    supabase
      .from('maintenance_spare_parts')
      .select('id, part_code, part_name, category, stock_qty, unit, storage_location')
      .or(`part_code.ilike.${q},part_name.ilike.${q},brand.ilike.${q},storage_location.ilike.${q}`)
      .limit(5)
  ])

  return {
    success: true,
    data: {
      machines: mRes.data || [],
      workOrders: woRes.data || [],
      parts: spRes.data || []
    }
  }
}

/**
 * -----------------------------------------------------------------------------
 * PREVENTIVE MAINTENANCE (PM) 2026 ENGINE & AUDITED ADJUSTMENTS
 * -----------------------------------------------------------------------------
 */

/**
 * Get all PM plans with filtering and adjustment log counts
 */
export async function getPMPlans(filters?: {
  department?: string
  frequency?: string
  search?: string
  status?: string
}) {
  const supabase = createAdminClient()
  let query = supabase
    .from('maintenance_pm_plans')
    .select(`
      *,
      machine:maintenance_machines(id, machine_code, machine_name, category, department_code, production_area, status, criticality)
    `)
    .eq('is_active', true)
    .order('plan_code', { ascending: true })

  if (filters?.frequency && filters.frequency !== 'all') {
    if (filters.frequency === 'PM1') {
      query = query.eq('frequency_type', 'Monthly')
    } else if (filters.frequency === 'PM2') {
      query = query.eq('frequency_type', 'Every 2 Months')
    } else if (filters.frequency === 'PM3') {
      query = query.eq('frequency_type', 'Quarterly')
    } else if (filters.frequency === 'PM4') {
      query = query.eq('frequency_type', 'Every 4 Months')
    } else if (filters.frequency === 'PM6') {
      query = query.eq('frequency_type', 'BiAnnually')
    } else if (filters.frequency === 'PM12') {
      query = query.eq('frequency_type', 'Yearly')
    } else {
      query = query.eq('frequency_type', filters.frequency)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching PM plans:', error)
    return { success: false, error: error.message, data: [] }
  }

  let plans: MaintenancePMPlan[] = data || []

  // Filter by department if requested
  if (filters?.department && filters.department !== 'all') {
    const dept = filters.department.toUpperCase()
    plans = plans.filter(p => (p as any).machine?.department_code === dept)
  }

  // Filter by search term
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.trim().toLowerCase()
    plans = plans.filter(p => 
      p.machine_code.toLowerCase().includes(s) ||
      p.machine_name.toLowerCase().includes(s) ||
      p.plan_code.toLowerCase().includes(s)
    )
  }

  // Fetch adjustment log counts
  const { data: logCounts } = await supabase
    .from('maintenance_pm_adjustment_logs')
    .select('pm_plan_id')

  const countMap: Record<string, number> = {}
  if (logCounts) {
    for (const log of logCounts) {
      countMap[log.pm_plan_id] = (countMap[log.pm_plan_id] || 0) + 1
    }
  }

  plans = plans.map(p => ({
    ...p,
    adjustment_count: countMap[p.id] || 0
  }))

  return { success: true, data: plans }
}

/**
 * Get single PM Plan by ID or Machine Code with full adjustment logs
 */
export async function getPMPlanDetails(planIdOrCode: string) {
  const supabase = createAdminClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planIdOrCode)

  let query = supabase
    .from('maintenance_pm_plans')
    .select(`
      *,
      machine:maintenance_machines(*)
    `)

  if (isUUID) {
    query = query.eq('id', planIdOrCode)
  } else {
    query = query.or(`plan_code.eq.${planIdOrCode},machine_code.eq.${planIdOrCode}`)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) {
    return { success: false, error: error?.message || 'ไม่พบแผน PM นี้', data: null }
  }

  // Fetch adjustment logs
  const { data: logs } = await supabase
    .from('maintenance_pm_adjustment_logs')
    .select('*')
    .eq('pm_plan_id', data.id)
    .order('created_at', { ascending: false })

  return {
    success: true,
    data: {
      ...data,
      adjustment_logs: (logs || []) as MaintenancePMAdjustmentLog[]
    }
  }
}

/**
 * Adjust PM Plan Frequency with MANDATORY reason requirement
 */
export async function adjustPMPlanFrequency(params: {
  planId: string
  newFrequencyType: string
  newFrequencyInterval: number
  newDueDate?: string
  reason: string
  adjustedByName?: string
  adjustedById?: string
}) {
  const {
    planId,
    newFrequencyType,
    newFrequencyInterval,
    newDueDate,
    reason,
    adjustedByName = 'Supervisor',
    adjustedById = null
  } = params

  // 1. STRICT REASON VALIDATION (Mandatory per factory requirement)
  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: '⚠️ กรุณาระบุเหตุผลในการปรับเปลี่ยนความถี่รอบ PM เสมอ (จำเป็นต้องระบุอย่างน้อย 5 ตัวอักษร เพื่อบันทึกประวัติการตรวจสอบ)'
    }
  }

  const supabase = createAdminClient()

  // 2. Fetch current plan details
  const { data: currentPlan, error: fetchErr } = await supabase
    .from('maintenance_pm_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (fetchErr || !currentPlan) {
    return { success: false, error: 'ไม่พบข้อมูลแผน PM ที่ต้องการปรับแก้' }
  }

  // 3. Update the PM plan
  const updatePayload: Record<string, any> = {
    frequency_type: newFrequencyType,
    frequency_interval: newFrequencyInterval,
    updated_at: new Date().toISOString()
  }

  if (newDueDate) {
    updatePayload.next_due_date = newDueDate
  }

  const { error: updateErr } = await supabase
    .from('maintenance_pm_plans')
    .update(updatePayload)
    .eq('id', planId)

  if (updateErr) {
    console.error('Failed to update PM plan frequency:', updateErr)
    return { success: false, error: `ไม่สามารถปรับเปลี่ยนความถี่ได้: ${updateErr.message}` }
  }

  // 4. Log the audited adjustment with mandatory reason
  const { error: logErr } = await supabase
    .from('maintenance_pm_adjustment_logs')
    .insert({
      pm_plan_id: currentPlan.id,
      machine_id: currentPlan.machine_id,
      machine_code: currentPlan.machine_code,
      old_frequency_type: currentPlan.frequency_type,
      new_frequency_type: newFrequencyType,
      old_frequency_interval: currentPlan.frequency_interval,
      new_frequency_interval: newFrequencyInterval,
      old_due_date: currentPlan.next_due_date,
      new_due_date: newDueDate || currentPlan.next_due_date,
      reason: reason.trim(),
      adjusted_by_name: adjustedByName,
      adjusted_by_id: adjustedById
    })

  if (logErr) {
    console.error('Failed to record PM adjustment audit log:', logErr)
  }

  // 5. Revalidate cache
  revalidatePath('/maintenance/pm')
  revalidatePath('/maintenance')
  if (currentPlan.machine_id) {
    revalidatePath(`/maintenance/machines/${currentPlan.machine_id}`)
  }

  return {
    success: true,
    message: `ปรับความถี่รอบ PM ของเครื่องจักร ${currentPlan.machine_code} เป็น ${newFrequencyType} เรียบร้อยแล้ว (บันทึกเหตุผลใน Audit Log)`
  }
}

/**
 * Get all PM adjustment audit logs across all machines or for a specific machine
 */
export async function getPMAdjustmentLogs(filters?: {
  planId?: string
  machineCode?: string
  limit?: number
}) {
  const supabase = createAdminClient()
  let query = supabase
    .from('maintenance_pm_adjustment_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.planId) {
    query = query.eq('pm_plan_id', filters.planId)
  }
  if (filters?.machineCode) {
    query = query.eq('machine_code', filters.machineCode)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  } else {
    query = query.limit(50)
  }

  const { data, error } = await query
  if (error) {
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: (data || []) as MaintenancePMAdjustmentLog[] }
}

/**
 * Get Complete Work Order Details for DCC E-form
 */
export async function getWorkOrderDCCDetails(idOrWoNumber: string) {
  const supabase = createAdminClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrWoNumber)

  let query = supabase
    .from('maintenance_work_orders')
    .select(`
      *,
      machine:maintenance_machines(*),
      parts:maintenance_wo_parts(*),
      status_logs:maintenance_wo_status_logs(*)
    `)

  if (isUUID) {
    query = query.eq('id', idOrWoNumber)
  } else {
    query = query.eq('wo_number', idOrWoNumber)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) {
    return { success: false, error: error?.message || 'ไม่พบข้อมูลใบแจ้งซ่อมนี้', data: null }
  }

  return { success: true, data }
}

/**
 * Generate sequential Machine Request number: MR-YYYY-XXXX
 */
async function generateMachineRequestNumber(supabase: any): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `MR-${currentYear}-`

  const { data } = await supabase
    .from('maintenance_machine_requests')
    .select('request_number')
    .like('request_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  let nextSeq = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].request_number
    const match = lastNumber.match(/MR-\d{4}-(\d+)/)
    if (match && match[1]) {
      nextSeq = parseInt(match[1], 10) + 1
    }
  }

  return `${prefix}${nextSeq.toString().padStart(4, '0')}`
}

/**
 * 1. Create a new Machine Request (MT-PF-002)
 * Supports 4 request types:
 * - NEW_MACHINE: ขอเพิ่มเครื่องจักรใหม่
 * - DECOMMISSION: ขอยกเลิกใช้ / ปลดระวาง
 * - RELOCATE: ขอโอนย้ายสังกัด / แผนก / พื้นที่
 * - OTHER: ขอกรณีอื่นๆ (ดัดแปลง / สเปกพิเศษ)
 */
export async function createMachineRequest(payload: {
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
  requested_by_name: string
  requested_by_dept?: string | null
}) {
  const supabase = createAdminClient()

  if (!payload.reason || payload.reason.trim().length < 5) {
    return { success: false, error: 'กรุณาระบุเหตุผลในการขอดำเนินการเกี่ยวกับเครื่องจักรอย่างน้อย 5 ตัวอักษร' }
  }

  const reqNumber = await generateMachineRequestNumber(supabase)

  const insertData = {
    request_number: reqNumber,
    request_type: payload.request_type,
    machine_id: payload.machine_id || null,
    machine_code: payload.machine_code.trim().toUpperCase(),
    machine_name: payload.machine_name.trim(),
    current_department: payload.current_department || null,
    current_location: payload.current_location || null,
    target_department: payload.target_department || null,
    target_location: payload.target_location || null,
    proposed_machine_data: payload.proposed_machine_data || null,
    reason: payload.reason.trim(),
    status: 'PENDING',
    requested_by_name: payload.requested_by_name.trim(),
    requested_by_dept: payload.requested_by_dept || 'ฝ่ายผลิต (Production)',
    execution_status: 'PENDING',
    dcc_doc_code: 'MT-PF-002'
  }

  const { data, error } = await supabase
    .from('maintenance_machine_requests')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating machine request:', error)
    return { success: false, error: error.message }
  }

  // Audit log
  await supabase.from('maintenance_audit_logs').insert({
    entity_name: 'maintenance_machine_requests',
    entity_id: data.id,
    action: `SUBMIT_REQUEST_${payload.request_type}`,
    new_data: insertData,
    performed_by_name: payload.requested_by_name
  })

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/machines')
  revalidatePath('/dcc')

  return { 
    success: true, 
    data: data as MaintenanceMachineRequest,
    message: `ยื่นคำร้อง ${reqNumber} สำเร็จแล้ว รอการอนุมัติตามขั้นตอน DCC`
  }
}

/**
 * Get all machine requests with optional filters
 */
export async function getMachineRequests(filters?: {
  status?: string
  type?: string
  search?: string
}) {
  const supabase = createAdminClient()
  let query = supabase
    .from('maintenance_machine_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status)
  }
  if (filters?.type && filters.type !== 'ALL') {
    query = query.eq('request_type', filters.type)
  }
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`request_number.ilike.${s},machine_code.ilike.${s},machine_name.ilike.${s},requested_by_name.ilike.${s}`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching machine requests:', error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: (data || []) as MaintenanceMachineRequest[] }
}

/**
 * Approve a Machine Request and automatically execute the action
 */
export async function approveMachineRequest(
  requestId: string,
  approverName: string = 'Plant Director (PDT)',
  approverComment: string = 'อนุมัติการดำเนินการตามมาตรฐาน DCC'
) {
  const supabase = createAdminClient()

  const { data: request, error: fetchErr } = await supabase
    .from('maintenance_machine_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchErr || !request) {
    return { success: false, error: 'ไม่พบคำร้องที่ระบุ' }
  }

  if (request.status !== 'PENDING') {
    return { success: false, error: `คำร้องนี้อยู่ในสถานะ ${request.status} แล้ว ไม่สามารถอนุมัติซ้ำได้` }
  }

  // Execute the change in maintenance_machines based on request type
  let executionSuccess = true
  let executionError: string | null = null

  try {
    if (request.request_type === 'NEW_MACHINE') {
      const pData = request.proposed_machine_data || {}
      const { error: insErr } = await supabase
        .from('maintenance_machines')
        .insert({
          machine_code: request.machine_code,
          machine_name: request.machine_name,
          category: pData.category || 'General Machinery',
          department_name: request.target_department || pData.department_name || 'ฝ่ายผลิต (Production)',
          production_area: request.target_location || pData.production_area || '',
          criticality: pData.criticality || 'B',
          status: 'Running',
          manufacturer: pData.manufacturer || '',
          model: pData.model || '',
          serial_number: pData.serial_number || '',
          hourly_downtime_cost: pData.hourly_downtime_cost || 5000,
          maintenance_instruction: pData.maintenance_instruction || ''
        })
      if (insErr) {
        executionSuccess = false
        executionError = insErr.message
      }
    } else if (request.request_type === 'DECOMMISSION') {
      // Decommission & Soft-delete machine
      if (request.machine_id) {
        const { error: updErr } = await supabase
          .from('maintenance_machines')
          .update({
            status: 'Decommissioned',
            is_deleted: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.machine_id)
        if (updErr) {
          executionSuccess = false
          executionError = updErr.message
        }
      } else {
        const { error: updErr } = await supabase
          .from('maintenance_machines')
          .update({
            status: 'Decommissioned',
            is_deleted: true,
            updated_at: new Date().toISOString()
          })
          .eq('machine_code', request.machine_code)
        if (updErr) {
          executionSuccess = false
          executionError = updErr.message
        }
      }
    } else if (request.request_type === 'RELOCATE') {
      // Relocate machine to target department and area
      const updatePayload: any = { updated_at: new Date().toISOString() }
      if (request.target_department) updatePayload.department_name = request.target_department
      if (request.target_location) updatePayload.production_area = request.target_location

      const q = request.machine_id 
        ? supabase.from('maintenance_machines').update(updatePayload).eq('id', request.machine_id)
        : supabase.from('maintenance_machines').update(updatePayload).eq('machine_code', request.machine_code)

      const { error: relErr } = await q
      if (relErr) {
        executionSuccess = false
        executionError = relErr.message
      }
    } else if (request.request_type === 'OTHER') {
      // Apply proposed data if available
      if (request.proposed_machine_data && (request.machine_id || request.machine_code)) {
        const q = request.machine_id 
          ? supabase.from('maintenance_machines').update(request.proposed_machine_data).eq('id', request.machine_id)
          : supabase.from('maintenance_machines').update(request.proposed_machine_data).eq('machine_code', request.machine_code)
        await q
      }
    }
  } catch (err: any) {
    executionSuccess = false
    executionError = err.message
  }

  if (!executionSuccess) {
    return { success: false, error: `ไม่สามารถปรับปรุงเครื่องจักรจริงได้: ${executionError}` }
  }

  // Update request status to APPROVED
  const now = new Date().toISOString()
  const { data: updatedReq, error: reqErr } = await supabase
    .from('maintenance_machine_requests')
    .update({
      status: 'APPROVED',
      approved_by_name: approverName,
      approved_at: now,
      approver_comment: approverComment,
      execution_status: 'COMPLETED',
      updated_at: now
    })
    .eq('id', requestId)
    .select()
    .single()

  if (reqErr) {
    return { success: false, error: reqErr.message }
  }

  // Audit log
  await supabase.from('maintenance_audit_logs').insert({
    entity_name: 'maintenance_machine_requests',
    entity_id: requestId,
    action: `APPROVE_REQUEST_${request.request_type}`,
    old_data: request,
    new_data: updatedReq,
    performed_by_name: approverName
  })

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/machines')
  revalidatePath('/maintenance/qr-print')
  revalidatePath('/dcc')

  return { success: true, data: updatedReq, message: `อนุมัติคำร้อง ${request.request_number} และดำเนินการเรียบร้อยแล้ว` }
}

/**
 * Reject a Machine Request
 */
export async function rejectMachineRequest(
  requestId: string,
  rejectorName: string,
  rejectionReason: string
) {
  const supabase = createAdminClient()

  if (!rejectionReason || rejectionReason.trim().length < 3) {
    return { success: false, error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('maintenance_machine_requests')
    .update({
      status: 'REJECTED',
      rejection_reason: rejectionReason.trim(),
      approved_by_name: rejectorName,
      approved_at: now,
      execution_status: 'FAILED',
      updated_at: now
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Audit log
  await supabase.from('maintenance_audit_logs').insert({
    entity_name: 'maintenance_machine_requests',
    entity_id: requestId,
    action: 'REJECT_REQUEST',
    new_data: data,
    performed_by_name: rejectorName
  })

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/machines')
  revalidatePath('/dcc')

  return { success: true, data, message: `ปฏิเสธคำร้องเรียบร้อยแล้ว` }
}

/**
 * Submit PM Checksheet execution and generate completed PM record / Work Order
 */
export async function submitPMChecksheet(params: {
  planId: string
  technicianName: string
  executionNotes?: string
  checklistResults: { item: string; standard: string; status: 'PASS' | 'FAIL' | 'REMARK'; remark?: string }[]
  overallStatus: 'PASSED' | 'PASSED_WITH_REMARKS' | 'FAILED'
  ownerSignName: string
  photoBeforeUrls?: string[]
  photoAfterUrls?: string[]
}) {
  const supabase = createAdminClient()
  const now = new Date()

  // 1. Fetch PM Plan
  const { data: plan, error: pErr } = await supabase
    .from('maintenance_pm_plans')
    .select('*, machine:maintenance_machines(*)')
    .eq('id', params.planId)
    .single()

  if (pErr || !plan) {
    return { success: false, error: 'ไม่พบข้อมูลแผน PM' }
  }

  // 2. Calculate next due date
  const nextDate = new Date(now)
  const interval = plan.frequency_interval || 1
  const freqType = plan.frequency_type?.toLowerCase() || ''

  if (freqType.includes('monthly') || freqType.includes('pm1')) {
    nextDate.setMonth(nextDate.getMonth() + 1)
  } else if (freqType.includes('every 2') || freqType.includes('pm2')) {
    nextDate.setMonth(nextDate.getMonth() + 2)
  } else if (freqType.includes('quarterly') || freqType.includes('every 3') || freqType.includes('pm3')) {
    nextDate.setMonth(nextDate.getMonth() + 3)
  } else if (freqType.includes('every 4') || freqType.includes('pm4')) {
    nextDate.setMonth(nextDate.getMonth() + 4)
  } else if (freqType.includes('biannually') || freqType.includes('every 6') || freqType.includes('pm6')) {
    nextDate.setMonth(nextDate.getMonth() + 6)
  } else if (freqType.includes('yearly') || freqType.includes('every 12') || freqType.includes('pm12')) {
    nextDate.setFullYear(nextDate.getFullYear() + 1)
  } else {
    nextDate.setMonth(nextDate.getMonth() + interval)
  }

  const nextDueStr = nextDate.toISOString().split('T')[0]

  // 3. Update PM Plan status
  await supabase
    .from('maintenance_pm_plans')
    .update({
      last_completed_at: now.toISOString(),
      next_due_date: nextDueStr,
      updated_at: now.toISOString()
    })
    .eq('id', plan.id)

  // 4. Create completed Work Order for this PM execution
  const woNumber = `PM-${plan.machine_code}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const passCount = params.checklistResults.filter(r => r.status === 'PASS').length
  const totalCount = params.checklistResults.length

  const { data: wo, error: woErr } = await supabase
    .from('maintenance_work_orders')
    .insert({
      wo_number: woNumber,
      machine_id: plan.machine_id,
      machine_code: plan.machine_code,
      machine_name: plan.machine_name,
      requester_name: 'ระบบจัดตาราง PM ประจำงวด',
      priority: 'P3_NORMAL',
      status: 'VERIFIED',
      symptom_category: 'Other',
      symptom_description: `งานตรวจเช็คบำรุงรักษาเชิงป้องกัน (PM) ตามแผน ${plan.plan_code} (${plan.frequency_type}): ผ่านเกณฑ์ ${passCount}/${totalCount} ข้อ`,
      production_impact: 'Production can continue',
      is_emergency_breakdown: false,
      assigned_technician_name: params.technicianName,
      reported_at: now.toISOString(),
      acknowledged_at: now.toISOString(),
      repair_started_at: now.toISOString(),
      repair_completed_at: now.toISOString(),
      verified_at: now.toISOString(),
      closed_at: now.toISOString(),
      total_downtime_minutes: 0,
      repair_time_minutes: plan.estimated_minutes || 60,
      corrective_action: `ตรวจเช็คบำรุงรักษาตามมาตรฐาน PM Checklist ${totalCount} ข้อ ผลการตรวจ: ${params.overallStatus}. หมายเหตุ: ${params.executionNotes || '-'}`,
      root_cause: `รอบการบำรุงรักษาเชิงป้องกันตามแผน (PM Plan ${plan.frequency_type})`,
      problem_category: 'Preventive Maintenance',
      verified_by_name: params.ownerSignName || 'หัวหน้าแผนกผู้เป็นเจ้าของเครื่อง',
      verification_status: 'ACCEPTED',
      verification_notes: 'เจ้าของเครื่องลงนามตรวจรับมอบงาน PM สมบูรณ์',
      photo_before_urls: params.photoBeforeUrls || [],
      photo_after_urls: params.photoAfterUrls || []
    })
    .select()
    .single()

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/technician')
  revalidatePath('/maintenance/pm')
  if (plan.machine_code) {
    revalidatePath(`/maintenance/machines/${plan.machine_code}`)
  }

  return { 
    success: true, 
    data: wo, 
    message: `บันทึกผลตรวจเช็ค PM เครื่อง ${plan.machine_code} และส่งมอบงานให้แผนกเจ้าของเครื่องเรียบร้อยแล้ว!` 
  }
}

/**
 * Dispatch / Assign a technician to a PM Plan, creating an ASSIGNED PM Work Order
 */
export async function dispatchPMWorkOrder(params: {
  planId: string
  technicianName: string
  targetDate?: string
  priority?: string
  notes?: string
  assignedByName?: string
}) {
  const supabase = createAdminClient()
  const now = new Date()

  // 1. Fetch PM Plan
  const { data: plan, error: pErr } = await supabase
    .from('maintenance_pm_plans')
    .select('*, machine:maintenance_machines(*)')
    .eq('id', params.planId)
    .single()

  if (pErr || !plan) {
    return { success: false, error: 'ไม่พบข้อมูลแผน PM' }
  }

  const woNumber = `WO-PM-${plan.machine_code}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`

  const { data: wo, error: woErr } = await supabase
    .from('maintenance_work_orders')
    .insert({
      wo_number: woNumber,
      machine_id: plan.machine_id,
      machine_code: plan.machine_code,
      machine_name: plan.machine_name,
      requester_name: params.assignedByName || 'หัวหน้าฝ่ายซ่อมบำรุง',
      priority: params.priority || 'P3_NORMAL',
      status: 'ASSIGNED',
      symptom_category: 'Preventive Maintenance',
      symptom_description: `งานบำรุงรักษาเชิงป้องกันตามแผน ${plan.plan_code} (${plan.frequency_type}) - กำหนดเข้าทำ: ${params.targetDate || plan.next_due_date || 'ตามรอบ'}`,
      production_impact: 'Production can continue',
      is_emergency_breakdown: false,
      assigned_technician_name: params.technicianName,
      reported_at: now.toISOString(),
      acknowledged_at: now.toISOString(),
      corrective_action: `ตรวจเช็คตามรายการ PM Checklist (${Array.isArray(plan.checklist_template) ? plan.checklist_template.length : 0} รายการ). คำสั่งการ: ${params.notes || 'ตรวจเช็คตามมาตรฐาน PM ประจำเดือน'}`,
      problem_category: 'Preventive Maintenance'
    })
    .select()
    .single()

  if (woErr) {
    return { success: false, error: woErr.message }
  }

  // Also update responsible technician on machine if needed
  if (plan.machine_id) {
    await supabase
      .from('maintenance_machines')
      .update({ responsible_technician_name: params.technicianName, updated_at: now.toISOString() })
      .eq('id', plan.machine_id)
  }

  revalidatePath('/maintenance')
  revalidatePath('/maintenance/pm')
  revalidatePath('/maintenance/technician')
  revalidatePath('/maintenance/work-orders')
  if (plan.machine_code) {
    revalidatePath(`/maintenance/machines/${plan.machine_code}`)
  }

  return {
    success: true,
    data: wo,
    message: `มอบหมายงาน PM เครื่อง ${plan.machine_code} ให้ ${params.technicianName} สำเร็จ! ใบสั่งงานเลขที่ ${woNumber}`
  }
}

