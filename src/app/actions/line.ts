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
 */
export async function getLineChannels(): Promise<{ success: boolean; data: LineChannelConfig[]; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('line_notification_channels')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: data || [] }
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
    if (payload.channel_access_token !== undefined) updateData.channel_access_token = payload.channel_access_token.trim()
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
    const testFlex = buildTestFlexMessage(channelKey, '🛠️ ซ่อมบำรุง (Maintenance)')
    
    const res = await pushLineFlexMessage({
      channelKey,
      altText: '🧪 ทดสอบระบบแจ้งเตือน LINE CosmeFlow',
      flexContents: testFlex,
      overrideToken,
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
        appBaseUrl: getAppBaseUrl()
      })

      await pushLineFlexMessage({
        channelKey: 'maintenance',
        altText: `🚨 แจ้งซ่อมเครื่อง ${resolvedMachine.machine_code}: ${workOrder.symptom_category}`,
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
