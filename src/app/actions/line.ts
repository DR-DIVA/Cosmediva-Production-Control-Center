'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { 
  LineChannelConfig, 
  pushLineFlexMessage, 
  buildTestFlexMessage, 
  buildBreakdownFlexMessage,
  buildWorkOrderStatusFlexMessage,
  buildWorkOrderClosedFlexMessage,
  getAppBaseUrl
} from '@/lib/lineService'

/**
 * Get all configured LINE Notification Channels (Multi-Channel Gateway)
 * Sensitive tokens are masked with •••• to prevent credential leakage to the browser.
 */
export async function getLineChannels(): Promise<{ success: boolean; data: (LineChannelConfig & { has_token?: boolean })[]; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('line_notification_channels')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, data: [], error: error.message }
    }

    const sanitizedData = (data || []).map((ch: any) => {
      const rawToken = ch.channel_access_token || ''
      const hasToken = rawToken.trim().length > 10
      // Mask token: only show first 6 and last 4 characters, with dots in between
      const maskedToken = hasToken
        ? `${rawToken.slice(0, 6)}••••••••••••••••••••••••${rawToken.slice(-4)}`
        : ''

      return {
        ...ch,
        channel_access_token: maskedToken,
        has_token: hasToken
      }
    })

    return { success: true, data: sanitizedData }
  } catch (err: any) {
    console.error('Error fetching line channels:', err)
    return { success: false, data: [], error: err.message }
  }
}

/**
 * Update a specific LINE Channel Configuration
 */
export async function updateLineChannel(
  channelKey: string,
  payload: {
    channel_name?: string
    channel_access_token?: string
    destination_id?: string
    is_active?: boolean
    notify_events?: Record<string, boolean>
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    if (payload.channel_name !== undefined) updateData.channel_name = payload.channel_name.trim()
    
    // Only update token if user provided a genuine new token (not masked dots or empty)
    if (payload.channel_access_token !== undefined) {
      const trimmed = payload.channel_access_token.trim()
      if (trimmed && !trimmed.includes('••••')) {
        updateData.channel_access_token = trimmed
      }
    }

    if (payload.destination_id !== undefined) updateData.destination_id = payload.destination_id.trim()
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active
    if (payload.notify_events !== undefined) updateData.notify_events = payload.notify_events

    const { error } = await supabase
      .from('line_notification_channels')
      .update(updateData)
      .eq('channel_key', channelKey)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/maintenance')
    return { success: true }
  } catch (err: any) {
    console.error('Error updating line channel:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 🧪 Test LINE Channel by sending a live test message
 */
export async function testLineChannel(
  channelKey: string,
  overrideToken?: string,
  overrideDestination?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // If override token contains masked characters, use saved token from DB instead
    const cleanToken = overrideToken && !overrideToken.includes('••••') ? overrideToken : undefined
    const testFlex = buildTestFlexMessage(channelKey, '🛠️ ซ่อมบำรุง (Maintenance)')
    
    const res = await pushLineFlexMessage({
      channelKey,
      altText: '🧪 ทดสอบระบบแจ้งเตือน LINE CosmeFlow',
      flexContents: testFlex,
      overrideToken: cleanToken,
      overrideDestination
    })

    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Dispatch LINE Notification for Work Orders
 */
export async function dispatchWorkOrderLineAlert(params: {
  eventType: 'NEW_REPORT' | 'STATUS_CHANGED' | 'CLOSED'
  workOrder: any
  machine?: any
  changedByName?: string
  notes?: string
}) {
  try {
    const { eventType, workOrder, machine, changedByName, notes } = params
    if (!workOrder) return

    const resolvedMachine = machine || {
      machine_code: workOrder.machine_code,
      machine_name: workOrder.machine_name,
      criticality: 'B',
      department_name: workOrder.requester_department_name
    }

    if (eventType === 'NEW_REPORT') {
      const isService = 
        workOrder.machine_code === 'FACILITY' ||
        workOrder.production_impact === 'Facility no impact' ||
        workOrder.symptom_description?.includes('แจ้งซ่อมบริการ') ||
        workOrder.symptom_category.includes('บริการ')

      const isEmergency = !isService && (
        workOrder.is_emergency_breakdown ||
        workOrder.symptom_description?.includes('แจ้งซ่อมด่วน') ||
        (!workOrder.symptom_description?.includes('แจ้งซ่อมทั่วไป') && (
          workOrder.priority === 'P1_CRITICAL' || 
          workOrder.production_impact === 'Production stopped'
        ))
      )

      const repairType = isEmergency ? 'EMERGENCY' : isService ? 'SERVICE' : 'GENERAL'
      const altPrefix = isEmergency ? '🚨 [ซ่อมด่วน]' : isService ? '💡 [ซ่อมบริการ]' : '🛠️ [ซ่อมทั่วไป]'

      const flex = buildBreakdownFlexMessage({
        woNumber: workOrder.wo_number,
        workOrderId: workOrder.id,
        machineCode: resolvedMachine.machine_code,
        machineName: resolvedMachine.machine_name,
        criticality: resolvedMachine.criticality,
        departmentName: resolvedMachine.department_name,
        location: resolvedMachine.production_area || resolvedMachine.line,
        symptomCategory: workOrder.symptom_category,
        symptomDescription: workOrder.symptom_description,
        productionImpact: workOrder.production_impact,
        priority: workOrder.priority,
        requesterName: workOrder.requester_name,
        reportedAt: workOrder.reported_at,
        appBaseUrl: getAppBaseUrl(),
        repairType
      })

      await pushLineFlexMessage({
        channelKey: 'maintenance',
        altText: `${altPrefix} ${resolvedMachine.machine_code}: ${workOrder.symptom_category}`,
        flexContents: flex
      })
    } else if (eventType === 'STATUS_CHANGED') {
      const flex = buildWorkOrderStatusFlexMessage({
        woNumber: workOrder.wo_number,
        machineCode: resolvedMachine.machine_code,
        machineName: resolvedMachine.machine_name,
        toStatus: workOrder.status,
        changedByName: changedByName || 'ช่างซ่อมบำรุง',
        notes: notes,
        appBaseUrl: getAppBaseUrl()
      })

      await pushLineFlexMessage({
        channelKey: 'maintenance',
        altText: `🔧 อัปเดตงานซ่อม ${workOrder.wo_number}: ${workOrder.status}`,
        flexContents: flex
      })
    } else if (eventType === 'CLOSED') {
      const flex = buildWorkOrderClosedFlexMessage({
        woNumber: workOrder.wo_number,
        machineCode: resolvedMachine.machine_code,
        machineName: resolvedMachine.machine_name,
        technicianName: changedByName || workOrder.assigned_technician_name || 'ฝ่ายซ่อมบำรุง',
        correctiveAction: workOrder.corrective_action || notes,
        rootCause: workOrder.root_cause,
        closedAt: workOrder.repair_completed_at,
        appBaseUrl: getAppBaseUrl()
      })

      await pushLineFlexMessage({
        channelKey: 'maintenance',
        altText: `✅ เครื่อง ${resolvedMachine.machine_code} ซ่อมเสร็จสิ้น พร้อมเดินเครื่อง`,
        flexContents: flex
      })
    }
  } catch (err) {
    console.error('[lineActions] Background LINE alert dispatch error:', err)
  }
}
