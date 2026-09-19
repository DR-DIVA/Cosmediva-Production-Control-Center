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
  return 'https://cosmeflow.up.railway.app'
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
}) {
  const baseUrl = params.appBaseUrl || getAppBaseUrl()
  const techUrl = `${baseUrl}/maintenance/technician`
  const machineUrl = `${baseUrl}/maintenance/machines/${params.machineCode}`
  const eformUrl = params.workOrderId ? `${baseUrl}/maintenance/work-orders/${params.workOrderId}/eform` : techUrl

  const isCritical = params.priority === 'P1_CRITICAL' || params.productionImpact === 'Production stopped'
  const headerBgColor = isCritical ? '#B91C1C' : '#EA580C'
  const urgencyLabel = isCritical ? '🚨 ฉุกเฉิน: หยุดการผลิต (Critical)' : '⚠️ แจ้งซ่อมด่วน (High Priority)'

  const timeStr = params.reportedAt
    ? new Date(params.reportedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
    : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'

  const dateStr = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  })

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
              text: '🚨 แจ้งซ่อมเครื่องจักร',
              weight: 'bold',
              color: '#FFFFFF',
              size: 'md',
              flex: 1
            },
            {
              type: 'text',
              text: params.woNumber,
              color: '#FDE047',
              size: 'xs',
              weight: 'bold',
              align: 'end'
            }
          ]
        },
        {
          type: 'text',
          text: urgencyLabel,
          color: '#FEF08A',
          size: 'xs',
          weight: 'bold',
          margin: 'sm'
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
          backgroundColor: '#F8FAFC',
          cornerRadius: 'md',
          paddingAll: '12px',
          borderColor: '#E2E8F0',
          borderWidth: '1px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: params.machineCode,
                  weight: 'bold',
                  size: 'lg',
                  color: '#0F172A',
                  flex: 1
                },
                {
                  type: 'text',
                  text: `Grade ${params.criticality || 'B'}`,
                  size: 'xs',
                  color: params.criticality === 'A' ? '#DC2626' : '#2563EB',
                  weight: 'bold'
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
              margin: 'xs'
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
                { type: 'text', text: 'อาการเสีย:', size: 'xs', color: '#64748B', width: '70px' },
                { type: 'text', text: params.symptomCategory, size: 'xs', color: '#DC2626', weight: 'bold', wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: 'รายละเอียด:', size: 'xs', color: '#64748B', width: '70px' },
                { type: 'text', text: params.symptomDescription || 'ไม่ระบุ', size: 'xs', color: '#1E293B', wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: 'ผลกระทบ:', size: 'xs', color: '#64748B', width: '70px' },
                { type: 'text', text: params.productionImpact, size: 'xs', color: '#0F172A', weight: 'bold', wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: 'ผู้แจ้งซ่อม:', size: 'xs', color: '#64748B', width: '70px' },
                { type: 'text', text: `${params.requesterName} (${dateStr} ${timeStr})`, size: 'xs', color: '#475569', wrap: true }
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
            label: '🔍 ดูประวัติเครื่องจักร 360°',
            uri: machineUrl
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
}) {
  const baseUrl = params.appBaseUrl || getAppBaseUrl()
  const techUrl = `${baseUrl}/maintenance/technician`

  const statusLabel = 
    params.toStatus === 'IN_PROGRESS' ? 'กำลังดำเนินการซ่อม (In Progress)' :
    params.toStatus === 'ASSIGNED' ? 'ช่างรับมอบหมายงานแล้ว (Assigned)' :
    params.toStatus === 'PENDING_PARTS' ? 'รอเบิกอะไหล่ (Pending Parts)' :
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
          color: '#0F172A'
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
              text: `ผู้ดำเนินการ: ${params.changedByName}`,
              color: '#475569',
              size: 'xs',
              margin: 'xs'
            },
            params.notes ? {
              type: 'text',
              text: `บันทึก: ${params.notes}`,
              color: '#64748B',
              size: 'xs',
              wrap: true,
              margin: 'xs'
            } : { type: 'filler' }
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
          color: '#0F172A'
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
              text: `ช่างผู้ซ่อม: ${params.technicianName}`,
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
  const timeStr = new Date().toLocaleString('th-TH')
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
          text: `เวลาทดสอบ: ${timeStr}`,
          size: 'xxs',
          color: '#94A3B8'
        }
      ]
    }
  }
}
