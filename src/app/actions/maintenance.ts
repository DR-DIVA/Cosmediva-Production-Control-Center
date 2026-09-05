'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { 
  MaintenanceMachine, 
  MaintenanceWorkOrder, 
  MaintenanceSparePart,
  PriorityLevel,
  WorkOrderStatus 
} from '@/types/maintenance'

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

  return { success: true, data: data as MaintenanceMachine[] }
}

/**
 * Get complete Machine 360° Profile
 */
export async function getMachine360(machineCode: string) {
  const supabase = createAdminClient()

  // 1. Fetch Machine
  const { data: machine, error: mErr } = await supabase
    .from('maintenance_machines')
    .select('*')
    .eq('machine_code', machineCode)
    .eq('is_deleted', false)
    .single()

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

  return {
    success: true,
    data: {
      machine: machine as MaintenanceMachine,
      activeWorkOrders: activeWOs || [],
      historyWorkOrders: completedJobs,
      partsConsumed: partsConsumed || [],
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
  } else if (payload.production_impact === 'Quality risk') {
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
