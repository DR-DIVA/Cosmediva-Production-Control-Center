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
  const isEmergency = 
    params.repairType === 'EMERGENCY' ||
    params.priority === 'P1_CRITICAL' ||
    params.symptomDescription?.includes('แจ้งซ่อมด่วน') ||
    params.productionImpact === 'Production stopped'

  const isService = !isEmergency && (
    params.repairType === 'SERVICE' ||
    params.machineCode === 'FACILITY' ||
    params.productionImpact === 'Facility no impact' ||
    params.symptomDescription?.includes('แจ้งซ่อมบริการ') ||
    params.symptomCategory?.includes('บริการอาคาร') ||
    params.symptomCategory?.includes('💡') ||
    params.symptomCategory?.includes('🧹') ||
    params.symptomCategory?.includes('🚪') ||
    (params.machineCode === 'FACILITY' && (
      params.symptomCategory?.includes('หลอดไฟ') ||
      params.symptomCategory?.includes('แอร์') ||
      params.symptomCategory?.includes('ประปา')
    ))
  )

  const isGeneral = !isEmergency && !isService
  const isFacility = params.machineCode === 'FACILITY' || params.repairType === 'SERVICE' || isService

  // 1. 🚨 แจ้งซ่อมด่วน -> สีแดง (#DC2626)
  // 2. 🛠️ แจ้งซ่อมทั่วไป -> สีน้ำเงิน (#2563EB)
  // 3. 💡 แจ้งซ่อมบริการ -> สีม่วง (#7C3AED)
  const headerBgColor = 
    isEmergency ? '#DC2626' : 
    isService ? '#7C3AED' : 
    '#2563EB'

  const headerTitle = 
    isEmergency 
      ? (isFacility ? '🚨 แจ้งซ่อมด่วน (อาคารกระทบการผลิต)' : '🚨 แจ้งซ่อมด่วน (ฉุกเฉิน)') 
      : isService ? '💡 แจ้งซ่อมบริการ & อาคาร' :
      '🛠️ แจ้งซ่อมทั่วไป'

  const urgencyLabel = 
    isEmergency 
      ? (isFacility ? '🛑 กระทบสายการผลิต (ช่างต้องเข้าพื้นที่ทันที)' : '🛑 กระทบการผลิต (เครื่องหยุด / สายชะงัก)')
      : isService ? '🏢 งานบริการอาคาร & สิ่งอำนวยความสะดวก' :
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
          backgroundColor: isFacility ? (isEmergency ? '#FEF2F2' : '#FAF5FF') : '#F8FAFC',
          cornerRadius: 'md',
          paddingAll: '12px',
          borderColor: isFacility ? (isEmergency ? '#FECACA' : '#E9D5FF') : '#E2E8F0',
          borderWidth: '1px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              alignItems: 'center',
              contents: [
                {
                  type: 'text',
                  text: isFacility 
                    ? (isEmergency ? '🚨 งานอาคาร/สถานที่ (ด่วนฉุกเฉิน)' : '🏢 งานบริการอาคาร & สถานที่') 
                    : params.machineCode,
                  weight: 'bold',
                  size: 'md',
                  color: isFacility ? (isEmergency ? '#991B1B' : '#6B21A8') : '#0F172A',
                  wrap: true,
                  flex: 4
                },
                {
                  type: 'text',
                  text: isFacility ? (isEmergency ? 'P1 ฉุกเฉิน' : 'บริการทั่วไป') : `Grade ${params.criticality || 'B'}`,
                  size: 'xs',
                  color: isFacility ? (isEmergency ? '#DC2626' : '#7C3AED') : (params.criticality === 'A' ? '#DC2626' : '#2563EB'),
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

interface StatusVisualConfig {
  headerBg: string
  headerTitle: string
  subText: string
  icon: string
  badgeBg: string
  badgeText: string
  label: string
  stepIndex: number // 1 to 5
  stepLabel: string
}

export function getStatusVisualConfig(status: string): StatusVisualConfig {
  switch (status) {
    case 'NEW':
      return {
        headerBg: '#DC2626', // Red
        headerTitle: '🚨 แจ้งซ่อมใหม่ (New)',
        subText: 'รอช่างซ่อมรับเรื่องเข้าระบบ',
        icon: '🚨',
        badgeBg: '#FEF2F2',
        badgeText: '#B91C1C',
        label: 'แจ้งซ่อมใหม่ (New)',
        stepIndex: 1,
        stepLabel: 'ขั้นที่ 1/5: แจ้งซ่อม'
      }
    case 'ACKNOWLEDGED':
      return {
        headerBg: '#D97706', // Amber
        headerTitle: '🔔 ช่างรับเรื่องแล้ว (Acknowledged)',
        subText: 'ช่างรับงานเข้าระบบแล้ว กำลังเตรียมพร้อมลงหน้างาน',
        icon: '🔔',
        badgeBg: '#FFFBEB',
        badgeText: '#B45309',
        label: 'ช่างรับเรื่องแล้ว (Acknowledged)',
        stepIndex: 2,
        stepLabel: 'ขั้นที่ 2/5: รับเรื่อง'
      }
    case 'ASSIGNED':
      return {
        headerBg: '#0284C7', // Sky Blue
        headerTitle: '👷 มอบหมายช่างแล้ว (Assigned)',
        subText: 'กำหนดช่างผู้รับผิดชอบงานซ่อมเรียบร้อย',
        icon: '👷',
        badgeBg: '#F0F9FF',
        badgeText: '#0369A1',
        label: 'ช่างรับมอบหมายงานแล้ว (Assigned)',
        stepIndex: 2,
        stepLabel: 'ขั้นที่ 2/5: มอบหมายช่าง'
      }
    case 'IN_PROGRESS':
      return {
        headerBg: '#EA580C', // Safety Orange
        headerTitle: '⚡ กำลังดำเนินการซ่อม (In Progress)',
        subText: 'ช่างเริ่มลงมือซ่อมหน้างาน & กำลังจับเวลา Downtime',
        icon: '⚡',
        badgeBg: '#FFF7ED',
        badgeText: '#C2410C',
        label: 'กำลังดำเนินการซ่อม (In Progress)',
        stepIndex: 3,
        stepLabel: 'ขั้นที่ 3/5: กำลังซ่อม'
      }
    case 'WAITING_PART':
    case 'PENDING_PARTS':
      return {
        headerBg: '#E11D48', // Rose Crimson
        headerTitle: '📦 พักการซ่อม: รออะไหล่ (Waiting Part)',
        subText: 'พักการซ่อมชั่วคราว รอเบิกอะไหล่หรือเปิด PR ขอซื้อ',
        icon: '📦',
        badgeBg: '#FFF1F2',
        badgeText: '#BE123C',
        label: 'อยู่ระหว่างรออะไหล่ (Waiting Part)',
        stepIndex: 3,
        stepLabel: 'ขั้นที่ 3/5: พักรออะไหล่'
      }
    case 'WAITING_EXTERNAL':
      return {
        headerBg: '#9333EA', // Purple
        headerTitle: '🏢 รอช่างภายนอก (Waiting Outsource)',
        subText: 'ประสานงานผู้เชี่ยวชาญหรือซัพพลายเออร์ภายนอก',
        icon: '🏢',
        badgeBg: '#FAF5FF',
        badgeText: '#7E22CE',
        label: 'รอช่างภายนอก (Waiting Outsource)',
        stepIndex: 3,
        stepLabel: 'ขั้นที่ 3/5: รอช่างภายนอก'
      }
    case 'TEST_RUN':
      return {
        headerBg: '#6366F1', // Indigo
        headerTitle: '▶️ ขอทดสอบเดินเครื่อง (Test Run)',
        subText: 'ซ่อมเบื้องต้นเสร็จ ส่งต่อฝ่ายผลิตทดลองรันเครื่อง',
        icon: '▶️',
        badgeBg: '#EEF2FF',
        badgeText: '#4338CA',
        label: 'อยู่ระหว่างทดสอบเดินเครื่อง (Test Run)',
        stepIndex: 3,
        stepLabel: 'ขั้นที่ 3/5: ทดสอบเดินเครื่อง'
      }
    case 'COMPLETED':
      return {
        headerBg: '#059669', // Emerald Green
        headerTitle: '✨ ซ่อมเสร็จสิ้นแล้ว (Completed)',
        subText: 'ช่างซ่อมเสร็จสิ้นสมบูรณ์ รอผู้แจ้งซ่อมตรวจรับมอบงาน',
        icon: '✨',
        badgeBg: '#ECFDF5',
        badgeText: '#047857',
        label: 'ช่างซ่อมเสร็จสิ้น (Completed)',
        stepIndex: 4,
        stepLabel: 'ขั้นที่ 4/5: รอตรวจรับ'
      }
    case 'VERIFIED':
      return {
        headerBg: '#0D9488', // Teal
        headerTitle: '✅ ผู้แจ้งตรวจรับแล้ว (Verified)',
        subText: 'ฝ่ายผลิตทดสอบเครื่องผ่าน 100% พร้อมให้หัวหน้าช่างปิดงาน',
        icon: '✅',
        badgeBg: '#F0FDFA',
        badgeText: '#0F766E',
        label: 'ผู้แจ้งซ่อมตรวจรับแล้ว (Verified)',
        stepIndex: 4,
        stepLabel: 'ขั้นที่ 4/5: ตรวจรับผ่านแล้ว'
      }
    case 'CLOSED':
      return {
        headerBg: '#1C1917', // Stone Black
        headerTitle: '🛡️ ปิดงานซ่อมสมบูรณ์ (Closed)',
        subText: 'หัวหน้าฝ่ายซ่อมบำรุงปิดงานและบันทึกประวัติ DCC เรียบร้อย',
        icon: '🛡️',
        badgeBg: '#F5F5F4',
        badgeText: '#292524',
        label: 'ปิดงานสมบูรณ์ (Closed)',
        stepIndex: 5,
        stepLabel: 'ขั้นที่ 5/5: ปิดงานสมบูรณ์'
      }
    default:
      return {
        headerBg: '#2563EB',
        headerTitle: '🔧 อัปเดตสถานะงานซ่อม',
        subText: 'มีความคืบหน้าของงานซ่อมบำรุง',
        icon: '🔧',
        badgeBg: '#EFF6FF',
        badgeText: '#1D4ED8',
        label: status,
        stepIndex: 2,
        stepLabel: status
      }
  }
}

/**
 * ⚙️ Flex Message Generator: Work Order Status Transition with Visual Control & Progress Timeline
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
  const config = getStatusVisualConfig(params.toStatus)

  // 5 Steps Workflow: แจ้ง -> รับงาน -> ซ่อม -> ตรวจรับ -> ปิดงาน
  const workflowSteps = [
    { num: 1, label: 'แจ้ง' },
    { num: 2, label: 'รับงาน' },
    { num: 3, label: 'ซ่อม' },
    { num: 4, label: 'ตรวจรับ' },
    { num: 5, label: 'ปิดงาน' }
  ]

  const stepperContents: any[] = []
  workflowSteps.forEach((step, idx) => {
    const isPassed = step.num < config.stepIndex
    const isCurrent = step.num === config.stepIndex

    stepperContents.push({
      type: 'box',
      layout: 'vertical',
      backgroundColor: isCurrent ? config.headerBg : isPassed ? '#E2E8F0' : '#F8FAFC',
      cornerRadius: 'sm',
      paddingAll: '4px',
      alignItems: 'center',
      flex: 3,
      contents: [
        {
          type: 'text',
          text: (isPassed ? '✓ ' : isCurrent ? '● ' : '○ ') + step.label,
          size: 'xxs',
          color: isCurrent ? '#FFFFFF' : isPassed ? '#1E293B' : '#94A3B8',
          weight: isCurrent ? 'bold' : 'regular',
          align: 'center'
        }
      ]
    })

    if (idx < workflowSteps.length - 1) {
      stepperContents.push({
        type: 'text',
        text: '›',
        size: 'xs',
        color: '#CBD5E1',
        flex: 1,
        align: 'center'
      })
    }
  })

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: config.headerBg,
      paddingAll: '14px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: config.headerTitle, weight: 'bold', color: '#FFFFFF', size: 'sm', flex: 7 },
            { type: 'text', text: params.woNumber, color: '#FFFFFF', size: 'xs', align: 'end', weight: 'bold', flex: 4 }
          ]
        },
        {
          type: 'text',
          text: config.subText,
          color: '#FFFFFF',
          size: 'xxs',
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

        // 📊 Visual Timeline: Past -> Present Stepper
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F8FAFC',
          paddingAll: '10px',
          cornerRadius: 'md',
          borderColor: '#E2E8F0',
          borderWidth: '1px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📈 ลำดับขั้นตอน (Workflow Timeline):', size: 'xxs', color: '#64748B', weight: 'bold' },
                { type: 'text', text: config.stepLabel, size: 'xxs', color: config.badgeText, weight: 'bold', align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              alignItems: 'center',
              contents: stepperContents
            }
          ]
        },

        // Status Details Box with Distinct Visual Control
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: config.badgeBg,
          borderColor: config.headerBg,
          borderWidth: '1px',
          paddingAll: '10px',
          cornerRadius: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `${config.icon} สถานะปัจจุบัน:`, size: 'xs', color: config.badgeText, weight: 'bold', flex: 4 },
                { type: 'text', text: config.label, weight: 'bold', color: config.badgeText, size: 'xs', wrap: true, flex: 6 }
              ]
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
              color: '#334155',
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
      backgroundColor: '#1C1917',
      paddingAll: '14px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '🛡️ ปิดงานซ่อมสมบูรณ์ (Closed)', weight: 'bold', color: '#FFFFFF', size: 'sm', flex: 7 },
            { type: 'text', text: params.woNumber, color: '#D4AF37', size: 'xs', align: 'end', weight: 'bold', flex: 4 }
          ]
        },
        {
          type: 'text',
          text: 'เครื่องจักรพร้อมเดินสายผลิต 100% & บันทึกเข้าประวัติ DCC แล้ว',
          color: '#E2E8F0',
          size: 'xxs',
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

        // 📊 Visual Timeline: All 5 Steps Completed
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F8FAFC',
          paddingAll: '10px',
          cornerRadius: 'md',
          borderColor: '#E2E8F0',
          borderWidth: '1px',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📈 ลำดับขั้นตอน (Workflow Timeline):', size: 'xxs', color: '#64748B', weight: 'bold' },
                { type: 'text', text: 'ขั้นที่ 5/5: ปิดงานสมบูรณ์ 100%', size: 'xxs', color: '#15803D', weight: 'bold', align: 'end' }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              alignItems: 'center',
              contents: [
                {
                  type: 'box', layout: 'vertical', backgroundColor: '#E2E8F0', cornerRadius: 'sm', paddingAll: '4px', alignItems: 'center', flex: 3,
                  contents: [{ type: 'text', text: '✓ แจ้ง', size: 'xxs', color: '#1E293B', align: 'center' }]
                },
                { type: 'text', text: '›', size: 'xs', color: '#CBD5E1', flex: 1, align: 'center' },
                {
                  type: 'box', layout: 'vertical', backgroundColor: '#E2E8F0', cornerRadius: 'sm', paddingAll: '4px', alignItems: 'center', flex: 3,
                  contents: [{ type: 'text', text: '✓ รับงาน', size: 'xxs', color: '#1E293B', align: 'center' }]
                },
                { type: 'text', text: '›', size: 'xs', color: '#CBD5E1', flex: 1, align: 'center' },
                {
                  type: 'box', layout: 'vertical', backgroundColor: '#E2E8F0', cornerRadius: 'sm', paddingAll: '4px', alignItems: 'center', flex: 3,
                  contents: [{ type: 'text', text: '✓ ซ่อม', size: 'xxs', color: '#1E293B', align: 'center' }]
                },
                { type: 'text', text: '›', size: 'xs', color: '#CBD5E1', flex: 1, align: 'center' },
                {
                  type: 'box', layout: 'vertical', backgroundColor: '#E2E8F0', cornerRadius: 'sm', paddingAll: '4px', alignItems: 'center', flex: 3,
                  contents: [{ type: 'text', text: '✓ ตรวจรับ', size: 'xxs', color: '#1E293B', align: 'center' }]
                },
                { type: 'text', text: '›', size: 'xs', color: '#CBD5E1', flex: 1, align: 'center' },
                {
                  type: 'box', layout: 'vertical', backgroundColor: '#1C1917', cornerRadius: 'sm', paddingAll: '4px', alignItems: 'center', flex: 3,
                  contents: [{ type: 'text', text: '● ปิดงาน', size: 'xxs', color: '#D4AF37', weight: 'bold', align: 'center' }]
                }
              ]
            }
          ]
        },

        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F5F5F4',
          borderColor: '#1C1917',
          borderWidth: '1px',
          paddingAll: '10px',
          cornerRadius: 'md',
          contents: [
            {
              type: 'text',
              text: `ช่างผู้ซ่อม: ${params.technicianName} (${dateStr} ${timeStr})`,
              weight: 'bold',
              color: '#1C1917',
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
