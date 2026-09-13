export interface PlanChangeInfo {
  isRescheduled: boolean
  originalDate?: string
  revisedDate?: string
  category?: string
  categoryLabel?: string
  reason?: string
  updatedBy?: string
  updatedAt?: string
  revisionCount?: number
}

export const PLAN_CHANGE_CATEGORIES = [
  { id: 'WAIT_RM_PM', label: 'รอวัตถุดิบ/บรรจุภัณฑ์ (Wait RM/PM)', icon: '📦' },
  { id: 'CAPACITY_REBALANCE', label: 'เกลี่ยกำลังการผลิต / คิวงานแน่น (Capacity Rebalance)', icon: '⚖️' },
  { id: 'RUSH_ORDER_INSERT', label: 'แทรกคิวงานด่วน (Rush Order Insert)', icon: '⚡' },
  { id: 'FLOOR_DOWNTIME', label: 'หน้างานขัดข้อง / ชะลอผลิต (Shopfloor Downtime)', icon: '⚙️' },
  { id: 'CUSTOMER_RESCHEDULE', label: 'ลูกค้า/ฝ่ายขายขอปรับวัน (Customer/Sales Request)', icon: '👤' },
  { id: 'PLAN_CALIBRATION', label: 'ทบทวนปรับแผนงานปกติ (Plan Calibration)', icon: '📋' },
] as const

export function getPlanCategoryLabel(categoryId?: string): string {
  if (!categoryId) return 'ไม่ระบุหมวดหมู่'
  const found = PLAN_CHANGE_CATEGORIES.find(c => c.id === categoryId)
  return found ? found.label : categoryId
}

/**
 * Parses plan rescheduling tracking metadata from production_logs note
 */
export function parsePlanChangeInfo(note?: string | null, activityDate?: string | null): PlanChangeInfo {
  const result: PlanChangeInfo = {
    isRescheduled: false
  }

  if (!note) return result

  // Look for structured JSON tag: [PLAN_RESCHEDULE:{...}]
  const match = note.match(/\[PLAN_RESCHEDULE:(.*?)\]/)
  if (match && match[1]) {
    try {
      const data = JSON.parse(match[1])
      result.isRescheduled = true
      result.originalDate = data.originalDate || ''
      result.revisedDate = data.revisedDate || activityDate || ''
      result.category = data.category || 'PLAN_CALIBRATION'
      result.categoryLabel = getPlanCategoryLabel(data.category)
      result.reason = data.reason || ''
      result.updatedBy = data.updatedBy || ''
      result.updatedAt = data.updatedAt || ''
      result.revisionCount = data.revisionCount || 1
      return result
    } catch {
      // ignore json parse error
    }
  }

  // Fallback text check
  if (note.includes('[เลื่อนแผน') || note.includes('[ปรับแผน') || note.includes('(เลื่อนแผน')) {
    result.isRescheduled = true
    result.category = 'PLAN_CALIBRATION'
    result.categoryLabel = 'ปรับเลื่อนแผนงาน'
    result.reason = cleanDisplayNote(note)
  }

  return result
}

/**
 * Strips hidden JSON metadata tags ([PLAN_RESCHEDULE:{...}], [DELAY_TRACKING:{...}]) for human-facing UI display.
 */
export function cleanDisplayNote(note?: string | null): string {
  if (!note) return ''
  return note
    .replace(/\[PLAN_RESCHEDULE:.*?\]/g, '')
    .replace(/\[DELAY_TRACKING:.*?\]/g, '')
    .replace(/^\s*[\r\n]/gm, '')
    .trim()
}

/**
 * Extracts pure user comments from note, stripping both automated reschedule summaries and JSON metadata tags.
 */
export function extractUserComment(note?: string | null): string {
  if (!note) return ''
  let cleaned = cleanDisplayNote(note)
  cleaned = cleaned
    .replace(/\[เลื่อนแผนเป็น .*?\]/g, '')
    .replace(/\*?\s*\(เลื่อนแผนเป็น .*?\)/g, '')
    .replace(/\[เลื่อนเป็น .*?\]/g, '')
    .replace(/^\s*[\r\n]/gm, '')
    .trim()
  return cleaned
}

/**
 * Formats plan rescheduling metadata into structured string to store in production_logs.note
 */
export function formatPlanChangeNote(
  existingNote: string | null | undefined,
  changeData: {
    originalDate: string
    revisedDate: string
    category: string
    reason?: string
    updatedBy?: string
    revisionCount?: number
  }
): string {
  const payload = {
    ...changeData,
    updatedAt: new Date().toISOString()
  }

  const tag = `[PLAN_RESCHEDULE:${JSON.stringify(payload)}]`

  // Clean existing PLAN_RESCHEDULE tag and previous auto-generated summaries
  let cleanNote = (existingNote || '')
    .replace(/\[PLAN_RESCHEDULE:.*?\]/g, '')
    .replace(/\*?\s*\(เลื่อนแผนเป็น .*?\)/g, '')
    .replace(/\[เลื่อนแผนเป็น .*?\]/g, '')
    .trim()

  // Human readable description prefix
  const categoryText = getPlanCategoryLabel(changeData.category)
  const humanSummary = `[เลื่อนแผนเป็น ${changeData.revisedDate}: ${categoryText}${changeData.reason ? ` - ${changeData.reason}` : ''}]`

  return cleanNote 
    ? `${humanSummary} ${tag}\n${cleanNote}` 
    : `${humanSummary} ${tag}`
}
