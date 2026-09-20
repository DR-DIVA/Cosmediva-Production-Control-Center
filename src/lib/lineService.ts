import { createAdminClient } from '@/utils/supabase/admin'

export interface LineChannelConfig {
  id?: string
  channel_key: string
  channel_name: string
  description?: string
  channel_access_token?: string
  destination_id?: string
  is_active: boolean
  notify_events?: Record<string, boolean>
  created_at?: string
  updated_at?: string
}

/**
 * Resolve Base URL for links sent in LINE Flex Messages
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  }
  return 'https://cosmediva-production-control-center-production.up.railway.app'
}

/**
 * Bangkok Timezone (UTC+7) formatting helper for LINE Notifications
 */
export const BANGKOK_TZ = 'Asia/Bangkok'

export function formatThaiDateTime(dateInput?: string | Date | null): { dateStr: string; timeStr: string } {
  const d = dateInput ? new Date(dateInput) : new Date()
  const dateStr = d.toLocaleDateString('th-TH', {
    timeZone: BANGKOK_TZ,
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  })
  const timeStr = d.toLocaleTimeString('th-TH', {
    timeZone: BANGKOK_TZ,
    hour: '2-digit',
    minute: '2-digit'
  }) + ' น.'
  return { dateStr, timeStr }
}

/**
 * Fetch Channel Config from Supabase (or fallback to environment variables)
 */
export async function getLineChannelConfig(channelKey: string = 'maintenance'): Promise<LineChannelConfig | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('line_notification_channels')
      .select('*')
      .eq('channel_key', channelKey)
      .maybeSingle()

    if (!error && data) {
      // If token is stored in DB, return it. Otherwise check env vars as fallback
      const token = data.channel_access_token || (
        channelKey === 'maintenance' 
          ? (process.env.LINE_MAINTENANCE_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || '')
          : (process.env[`LINE_${channelKey.toUpperCase()}_TOKEN`] || '')
      )
      const destination = data.destination_id || (
        channelKey === 'maintenance'
          ? (process.env.LINE_MAINTENANCE_GROUP_ID || process.env.LINE_DESTINATION_ID || '')
          : (process.env[`LINE_${channelKey.toUpperCase()}_GROUP_ID`] || '')
      )

      return {
        ...data,
        channel_access_token: token,
        destination_id: destination
      }
    }

    // Fallback if table not queried
    const envToken = channelKey === 'maintenance' 
      ? (process.env.LINE_MAINTENANCE_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || '')
      : (process.env[`LINE_${channelKey.toUpperCase()}_TOKEN`] || '')
    const envDest = channelKey === 'maintenance'
      ? (process.env.LINE_MAINTENANCE_GROUP_ID || process.env.LINE_DESTINATION_ID || '')
      : (process.env[`LINE_${channelKey.toUpperCase()}_GROUP_ID`] || '')

    return {
      channel_key: channelKey,
      channel_name: '🛠️ ซ่อมบำรุง & เครื่องจักร (Maintenance)',
      channel_access_token: envToken,
      destination_id: envDest,
      is_active: Boolean(envToken && envDest),
      notify_events: { on_breakdown: true, on_assigned: true, on_completed: true }
    }
  } catch (err) {
    console.error(`[lineService] Error getting channel config for ${channelKey}:`, err)
    return null
  }
}

/**
 * Push Flex Message to LINE via LINE Messaging API
 */
export async function pushLineFlexMessage(params: {
  channelKey: string
  altText: string
  flexContents: any
  overrideToken?: string
  overrideDestination?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getLineChannelConfig(params.channelKey)
    const token = params.overrideToken || config?.channel_access_token
    const destination = params.overrideDestination || config?.destination_id

    if (!token) {
      return { 
        success: false, 
        error: `ยังไม่ได้ระบุ Channel Access Token สำหรับช่องทาง "${params.channelKey}" (กรุณาตั้งค่าในระบบหรือ LINE Settings)` 
      }
    }

    if (!destination) {
      return { 
        success: false, 
        error: `ยังไม่ได้ระบุ Group ID / Destination ID สำหรับช่องทาง "${params.channelKey}"` 
      }
    }

    if (config && !config.is_active && !params.overrideToken) {
      return { success: false, error: `ช่องทางการแจ้งเตือน "${params.channelKey}" ถูกปิดใช้งานอยู่ (Disabled)` }
    }

    const payload = {
      to: destination.trim(),
      messages: [
        {
          type: 'flex',
          altText: params.altText,
          contents: params.flexContents
        }
      ]
    }

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.trim()}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[lineService] LINE API error response:', res.status, errBody)
      return { 
        success: false, 
        error: `LINE Messaging API Error (${res.status}): ${errBody}` 
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[lineService] Exception sending LINE push:', err)
    return { success: false, error: err.message || 'Unknown network error' }
  }
}

/**
 * 🚨 Flex Message Generator: New Breakdown Work Order
 */
export function buildBreakdownFlexMessage(params: {
  woNumber: string
  workOrderId?: string
  machineCode: string
  machineName: string
  criticality?: string
  departmentName?: string
  location?: string
  symptomCategory: string
  symptomDescription?: string
  productionImpact: string
  priority: string
  requesterName: string
  reportedAt?: string
  appBaseUrl?: string
  repairType?: 'EMERGENCY' | 'GENERAL' | 'SERVICE'
}) {
  const baseUrl = params.appBaseUrl || getAppBaseUrl()
  const techUrl = `${baseUrl}/maintenance/technician`
  const machineUrl = `${baseUrl}/maintenance/machines/${params.machineCode}`
  const eformUrl = params.workOrderId ? `${baseUrl}/maintenance/work-orders/${params.workOrderId}/eform` : techUrl

  // 3-Case Category Classification: EMERGENCY (Red), GENERAL (Blue), SERVICE (Purple)
  const isService = 
    params.repairType === 'SERVICE' ||
    params.machineCode === 'FACILITY' ||
    params.productionImpact === 'Facility no impact' ||
    params.symptomDescription?.includes('แจ้งซ่อมบริการ') ||
    params.symptomCategory.includes('บริการ') ||
    params.symptomCategory.includes('หลอดไฟ') ||
    params.symptomCategory.includes('แอร์') ||
    params.symptomCategory.includes('ประปา')

  const isEmergency = !isService && (
    params.repairType === 'EMERGENCY' ||
    params.symptomDescription?.includes('แจ้งซ่อมด่วน') ||
    (!params.symptomDescription?.includes('แจ้งซ่อมทั่วไป') && (
      params.priority === 'P1_CRITICAL' || 
      params.productionImpact === 'Production stopped'
    ))
  )

  const isGeneral = !isService && !isEmergency

  // 1. 🚨 แจ้งซ่อมด่วน -> สีแดง (#DC2626)
  // 2. 🛠️ แจ้งซ่อมทั่วไป -> สีน้ำเงิน (#2563EB)
  // 3. 💡 แจ้งซ่อมบริการ -> สีม่วง (#7C3AED)
  const headerBgColor = 
    isEmergency ? '#DC2626' : 
    isService ? '#7C3AED' : 
    '#2563EB'

  const headerTitle = 
    isEmergency ? '🚨 แจ้งซ่อมด่วน (ฉุกเฉิน)' :
    isService ? '💡 แจ้งซ่อมบริการ & อาคาร' :
    '🛠️ แจ้งซ่อมทั่วไป'

  const urgencyLabel = 
    isEmergency ? '🛑 กระทบการผลิต (เครื่องหยุด / สายชะงัก)' :
    isService ? '🏢 งานบริการอาคาร & สิ่งอำนวยความสะดวก' :
    '🟢 ไม่กระทบการผลิต (เครื่องยังเดินต่อได้)'

  const urgencyColor = 
    isEmergency ? '#FEE2E2' : 
    isService ? '#F3E8FF' : 
    '#DBEAFE'

  const { dateStr, timeStr } = formatThaiDateTime(params.reportedAt)

  const impactLabel = 
    params.productionImpact === 'Production stopped' ? '🛑 หยุดการผลิตทั้งหมด (Production Stopped)' :
    params.productionImpact === 'Machine stopped' ? '⏸️ เครื่องจักรหยุดชะงัก (Machine Stopped)' :
    params.productionImpact === 'Intermittent stops' ? '🔄 เครื่องยังเดินต่อได้ (แต่หยุดบ่อยเพราะไม่ปกติ)' :
    params.productionImpact === 'Facility no impact' ? '🟢 ไม่กระทบการผลิต (แจ้งซ่อมบริการ)' :
    params.productionImpact === 'Quality risk' ? '⚠️ เสี่ยงกระทบคุณภาพสินค้า (Quality Risk)' :
    params.productionImpact === 'Safety risk' ? '🚨 อันตรายต่อความปลอดภัย (Safety Risk)' :
    params.productionImpact === 'Production can continue' ? '🟢 เครื่องยังเดินต่อได้ (ซ่อมตามรอบ)' :
    params.productionImpact

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: headerBgColor,
      paddingAll: '16px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: headerTitle,
              weight: 'bold',
              color: '#FFFFFF',
              size: 'sm',
              flex: 3
            },
            {
              type: 'text',
              text: params.woNumber,
              color: '#FDE047',
              size: 'xs',
              weight: 'bold',
              align: 'end',
              flex: 2
            }
          ]
        },
        {
          type: 'text',
          text: urgencyLabel,
          color: urgencyColor,
          size: 'xs',
          weight: 'bold',
          margin: 'xs'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        // Machine snapshot card
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: isService ? '#FAF5FF' : '#F8FAFC',
          cornerRadius: 'md',
          paddingAll: '12px',
          borderColor: isService ? '#E9D5FF' : '#E2E8F0',
          borderWidth: '1px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              alignItems: 'center',
              contents: [
                {
                  type: 'text',
                  text: isService ? '🏢 งานบริการอาคาร & สถานที่' : params.machineCode,
                  weight: 'bold',
                  size: 'md',
                  color: isService ? '#6B21A8' : '#0F172A',
                  wrap: true,
                  flex: 4
                },
                {
                  type: 'text',
                  text: isService ? 'บริการทั่วไป' : `Grade ${params.criticality || 'B'}`,
                  size: 'xs',
                  color: isService ? '#7C3AED' : (params.criticality === 'A' ? '#DC2626' : '#2563EB'),
                  weight: 'bold',
                  align: 'end',
                  flex: 1
                }
              ]
            },
            {
              type: 'text',
              text: params.machineName,
              size: 'sm',
              color: '#334155',
              weight: 'bold',
              wrap: true,
              margin: 'xs'
            },
            {
              type: 'text',
              text: `📍 ${params.departmentName || 'ฝ่ายผลิต'} • ${params.location || 'คลัง/ไลน์ผลิต'}`,
              size: 'xs',
              color: '#64748B',
              margin: 'xs',
              wrap: true
            }
          ]
        },
        // Symptom & Impact details
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: 'อาการเสีย:', size: 'xs', color: '#64748B', flex: 2 },
                { type: 'text', text: params.symptomCategory, size: 'xs', color: '#DC2626', weight: 'bold', wrap: true, flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: 'รายละเอียด:', size: 'xs', color: '#64748B', flex: 2 },
                { type: 'text', text: params.symptomDescription || 'ไม่ระบุ', size: 'xs', color: '#1E293B', wrap: true, flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: 'ผลกระทบ:', size: 'xs', color: '#64748B', flex: 2 },
                { type: 'text', text: impactLabel, size: 'xs', color: '#0F172A', weight: 'bold', wrap: true, flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: 'ผู้แจ้งซ่อม:', size: 'xs', color: '#64748B', flex: 2 },
                { type: 'text', text: `${params.requesterName} (${dateStr} ${timeStr})`, size: 'xs', color: '#475569', wrap: true, flex: 5 }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '12px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#1E293B',
          height: 'sm',
          action: {
            type: 'uri',
            label: '🛠️ รับงานซ่อม / บันทึกผล',
            uri: eformUrl
          }
        },
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: isService ? '📋 เปิดบอร์ดงานซ่อม' : '🔍 ดูประวัติเครื่องจักร 360°',
            uri: isService ? `${baseUrl}/maintenance/work-orders` : machineUrl
          }
        }
      ]
    }
  }
}

/**
 * ⚙️ Flex Message Generator: Work Order Status Transition (Assigned / In-Progress)
 */
export function buildWorkOrderStatusFlexMessage(params: {
  woNumber: string
  machineCode: string
  machineName: string
  toStatus: string
  changedByName: string
  notes?: string
  appBaseUrl?: string
  changedAt?: string
}) {
  const baseUrl = params.appBaseUrl || getAppBaseUrl()
  const techUrl = `${baseUrl}/maintenance/technician`
  const { dateStr, timeStr } = formatThaiDateTime(params.changedAt)

  const statusLabel = 
    params.toStatus === 'IN_PROGRESS' ? 'กำลังดำเนินการซ่อม (In Progress)' :
    params.toStatus === 'ASSIGNED' ? 'ช่างรับมอบหมายงานแล้ว (Assigned)' :
    params.toStatus === 'PENDING_PARTS' ? 'รอเบิกอะไหล่ (Pending Parts)' :
    params.toStatus === 'ACKNOWLEDGED' ? 'ช่างรับเรื่องแล้ว (Acknowledged)' :
    params.toStatus === 'COMPLETED' ? 'ซ่อมเสร็จสิ้น (Completed)' :
    params.toStatus === 'VERIFIED' ? 'ผู้แจ้งซ่อมตรวจรับแล้ว (Verified)' :
    params.toStatus

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#2563EB',
      paddingAll: '14px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '🔧 อัปเดตสถานะงานซ่อม', weight: 'bold', color: '#FFFFFF', size: 'sm' },
            { type: 'text', text: params.woNumber, color: '#93C5FD', size: 'xs', align: 'end' }
          ]
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '14px',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `${params.machineCode} - ${params.machineName}`,
          weight: 'bold',
          size: 'md',
          color: '#0F172A',
          wrap: true
        },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#EFF6FF',
          paddingAll: '10px',
          cornerRadius: 'md',
          contents: [
            {
              type: 'text',
              text: `สถานะปัจจุบัน: ${statusLabel}`,
              weight: 'bold',
              color: '#1D4ED8',
              size: 'xs'
            },
            {
              type: 'text',
              text: `ผู้ดำเนินการ: ${params.changedByName} (${dateStr} ${timeStr})`,
              color: '#475569',
              size: 'xs',
              margin: 'xs'
            },
            ...(params.notes ? [{
              type: 'text',
              text: `บันทึก: ${params.notes}`,
              color: '#64748B',
              size: 'xs',
              wrap: true,
              margin: 'xs'
            }] : [])
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'uri',
            label: '📱 ติดตามงานบน CosmeFlow',
            uri: techUrl
          }
        }
      ]
    }
  }
}

/**
 * ✅ Flex Message Generator: Work Order Closed / Machine Restored
 */
export function buildWorkOrderClosedFlexMessage(params: {
  woNumber: string
  machineCode: string
  machineName: string
  technicianName: string
  correctiveAction?: string
  rootCause?: string
  closedAt?: string
  appBaseUrl?: string
}) {
  const baseUrl = params.appBaseUrl || getAppBaseUrl()
  const historyUrl = `${baseUrl}/maintenance/machines/${params.machineCode}`
  const { dateStr, timeStr } = formatThaiDateTime(params.closedAt)

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#059669',
      paddingAll: '14px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '✅ เครื่องจักรซ่อมเสร็จสิ้น', weight: 'bold', color: '#FFFFFF', size: 'sm' },
            { type: 'text', text: params.woNumber, color: '#A7F3D0', size: 'xs', align: 'end' }
          ]
        },
        {
          type: 'text',
          text: 'เครื่องพร้อมเดินระบบการผลิตแล้ว (Ready to Run)',
          color: '#D1FAE5',
          size: 'xs',
          margin: 'xs'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '14px',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `${params.machineCode} - ${params.machineName}`,
          weight: 'bold',
          size: 'md',
          color: '#0F172A',
          wrap: true
        },
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#ECFDF5',
          paddingAll: '10px',
          cornerRadius: 'md',
          contents: [
            {
              type: 'text',
              text: `ช่างผู้ซ่อม: ${params.technicianName} (${dateStr} ${timeStr})`,
              weight: 'bold',
              color: '#047857',
              size: 'xs'
            },
            {
              type: 'text',
              text: `สาเหตุ: ${params.rootCause || 'ชำรุดตามอายุการใช้งาน'}`,
              color: '#334155',
              size: 'xs',
              wrap: true,
              margin: 'xs'
            },
            {
              type: 'text',
              text: `วิธีแก้ไข: ${params.correctiveAction || 'ตรวจเช็ค ปรับแต่ง และทดสอบเดินเครื่องผ่าน'}`,
              color: '#334155',
              size: 'xs',
              wrap: true,
              margin: 'xs'
            }
          ]
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#059669',
          height: 'sm',
          action: {
            type: 'uri',
            label: '📋 ดูประวัติการซ่อมเครื่องนี้',
            uri: historyUrl
          }
        }
      ]
    }
  }
}

/**
 * 🧪 Flex Message Generator: Test Push Notification
 */
export function buildTestFlexMessage(channelKey: string, channelName: string) {
  const { dateStr, timeStr } = formatThaiDateTime()
  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#065F46',
      paddingAll: '12px',
      contents: [
        {
          type: 'text',
          text: '🧪 ทดสอบระบบแจ้งเตือน LINE',
          weight: 'bold',
          color: '#FFFFFF',
          size: 'sm'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: 'CosmeFlow Multi-Channel Gateway',
          size: 'sm',
          weight: 'bold',
          color: '#0F172A'
        },
        {
          type: 'text',
          text: `ช่องทาง: ${channelName} (${channelKey})`,
          size: 'xs',
          color: '#047857',
          weight: 'bold'
        },
        {
          type: 'text',
          text: `ระบบเชื่อมต่อ LINE Messaging API สำเร็จแล้ว พร้อมส่งข้อความแจ้งเตือนอัตโนมัติแบบ Real-time`,
          size: 'xs',
          color: '#475569',
          wrap: true
        },
        {
          type: 'separator',
          margin: 'sm'
        },
        {
          type: 'text',
          text: `เวลาทดสอบ: ${dateStr} ${timeStr}`,
          size: 'xxs',
          color: '#94A3B8'
        }
      ]
    }
  }
}
