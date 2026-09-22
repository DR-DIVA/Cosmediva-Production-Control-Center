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
  { id: 'SHOPFLOOR_HOLD', label: 'หน้างานแช่ไว้ / ชะลอผลิตระหว่างทำ (Shopfloor Hold/Pause)', icon: '⏸️' },
  { id: 'MISTAKEN_START', label: 'เผลอกดเริ่มผิด / ปรับคืนแผน (Mistaken Start)', icon: '↩️' },
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
export function parsePlanChangeInfo(note?: string | null, activityDate?: string | null, createdAt?: string | null): PlanChangeInfo {
  const result: PlanChangeInfo = {
    isRescheduled: false
  }

  if (!note) return result

  // Look for structured JSON tag: [PLAN_RESCHEDULE:{...}]
  const match = note.match(/\[PLAN_RESCHEDULE:(.*?)\]/)
  if (match && match[1]) {
    try {
      const data = JSON.parse(match[1])

      // If the date change occurred on the exact same date as task creation with no custom reason,
      // it was an initial plan setup when the queue was first opened, NOT an actual reschedule.
      if (createdAt && data.originalDate) {
        const cDate = typeof createdAt === 'string' ? createdAt.slice(0, 10) : ''
        const uDate = data.updatedAt ? data.updatedAt.slice(0, 10) : ''
        if (cDate && (data.originalDate === cDate || uDate === cDate) && (!data.reason || data.reason.trim() === '')) {
          return result
        }
      }

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
 * Strips hidden JSON metadata tags ([PLAN_RESCHEDULE:{...}], [ACTUAL_DELAY:{...}], [DELAY_TRACKING:{...}]) for human-facing UI display.
 */
export function cleanDisplayNote(note?: string | null): string {
  if (!note) return ''
  return note
    .replace(/\[PLAN_RESCHEDULE:.*?\]/g, '')
    .replace(/\[ACTUAL_DELAY:.*?\]/g, '')
    .replace(/\[DELAY_TRACKING:.*?\]/g, '')
    .replace(/\[RESET_START:.*?\]/g, '')
    .replace(/^\s*[\r\n]/gm, '')
    .trim()
}

/**
 * Extracts pure user comments from note, stripping automated reschedule summaries, actual delay notes, and JSON metadata tags.
 */
export function extractUserComment(note?: string | null): string {
  if (!note) return ''
  let cleaned = cleanDisplayNote(note)
  cleaned = cleaned
    .replace(/\[เลื่อนแผนเป็น .*?\]/g, '')
    .replace(/\*?\s*\(เลื่อนแผนเป็น .*?\)/g, '')
    .replace(/\[เลื่อนเป็น .*?\]/g, '')
    .replace(/\[ยกเลิกเริ่มงานผิด:.*?\]/g, '')
    .replace(/\[เหตุผลล่าช้าหน้างาน:.*?\]/g, '')
    .replace(/\[เหตุผลทำจริงล่าช้า:.*?\]/g, '')
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

/**
 * Checks if a task has completely finished production (COMPLETED or DONE).
 */
export function isTaskCompleted(log: any): boolean {
  if (!log) return false
  const status = (log.status || '').toUpperCase()
  return status === 'DONE' || status === 'COMPLETED'
}

/**
 * Checks if a production task was started (IN_PROGRESS or has start_time) but not yet completed.
 * These tasks can be reset back to WAITING / PLANNED if started accidentally.
 */
export function canResetStartedTask(log: any): boolean {
  if (!log) return false
  if (isTaskCompleted(log)) return false
  const status = (log.status || '').toUpperCase()
  return Boolean(log.start_time || status === 'IN_PROGRESS')
}

/**
 * Formats note when resetting an accidentally started task back to WAITING / PLANNED.
 */
export function formatResetStartNote(
  existingNote: string | null | undefined,
  data: {
    userIdentifier: string
    reason?: string
  }
): string {
  const payload = {
    ...data,
    resetAt: new Date().toISOString()
  }
  const tag = `[RESET_START:${JSON.stringify(payload)}]`
  let cleanNote = (existingNote || '')
    .replace(/\[RESET_START:.*?\]/g, '')
    .trim()

  const humanSummary = `[ยกเลิกเริ่มงานผิด: คืนสถานะรอเริ่ม โดย ${data.userIdentifier}${data.reason ? ` - ${data.reason}` : ''}]`
  return cleanNote ? `${humanSummary} ${tag}\n${cleanNote}` : `${humanSummary} ${tag}`
}

/**
 * Checks if a production task/log has already been started by the shopfloor.
 * If true, dates and queue changes require a logged reschedule reason to protect KPI accuracy.
 */
export function isTaskStartedByShopfloor(log: any): boolean {
  if (!log) return false
  // Explicit start time recorded by shopfloor button
  if (log.start_time) return true
  // Statuses indicating work has begun or finished
  const status = (log.status || '').toUpperCase()
  return status === 'IN_PROGRESS' || status === 'DONE' || status === 'COMPLETED'
}

/* ==============================================================================
 * SHOPFLOOR ACTUAL DELAY TRACKING (สำหรับหน้างานบันทึกเหตุผลการทำงานล่าช้ากว่าแผน)
 * ============================================================================== */

export interface ActualDelayInfo {
  hasDelayReason: boolean
  category?: string
  categoryLabel?: string
  reason?: string
  updatedBy?: string
  updatedAt?: string
}

export const ACTUAL_DELAY_CATEGORIES = [
  { id: 'WAIT_RM_PM', label: 'รอวัตถุดิบ / บรรจุภัณฑ์ / สารเคมี (Wait RM/PM)', icon: '📦' },
  { id: 'FLOOR_DOWNTIME', label: 'เครื่องจักรขัดข้อง / ซ่อมบำรุง / รอช่าง (Machine Downtime)', icon: '⚙️' },
  { id: 'QC_WAIT', label: 'รอผลตรวจแล็บ QC / รอปล่อยผ่าน (Wait QC Release)', icon: '🔬' },
  { id: 'CLEANING_CHANGEOVER', label: 'ล้างทำความสะอาดถัง/ไลน์นานกว่าปกติ (Line Clearance/Cleaning)', icon: '🧹' },
  { id: 'MANPOWER_SHORTAGE', label: 'กำลังคนไม่พอ / ขาดพนักงาน (Manpower Shortage)', icon: '👥' },
  { id: 'PREVIOUS_TASK_DELAY', label: 'ขั้นตอนก่อนหน้าล่าช้า / ถัง-ไลน์ไม่ว่าง (Previous Process Delay)', icon: '⏳' },
  { id: 'RUSH_ORDER_INSERT', label: 'แทรกคิวงานด่วนตามคำสั่งผู้บริหาร (Rush Order Priority)', icon: '⚡' },
  { id: 'REWORK_ADJUST', label: 'แก้งาน / Rework / ปรับเฉดสีสาร (Rework / Recipe Adjustment)', icon: '🔄' },
  { id: 'OTHER', label: 'อื่นๆ (ระบุในรายละเอียด)', icon: '❓' },
] as const

export function getActualDelayCategoryLabel(categoryId?: string): string {
  if (!categoryId) return 'ไม่ระบุหมวดหมู่'
  const found = ACTUAL_DELAY_CATEGORIES.find(c => c.id === categoryId)
  return found ? `${found.icon} ${found.label}` : categoryId
}

/**
 * Parses actual delay reason metadata entered by shopfloor staff from production_logs.note
 */
export function parseActualDelayInfo(note?: string | null): ActualDelayInfo {
  const result: ActualDelayInfo = {
    hasDelayReason: false
  }

  if (!note) return result

  // Look for structured JSON tag: [ACTUAL_DELAY:{...}]
  const match = note.match(/\[ACTUAL_DELAY:(.*?)\]/)
  if (match && match[1]) {
    try {
      const data = JSON.parse(match[1])
      result.hasDelayReason = true
      result.category = data.category || 'OTHER'
      result.categoryLabel = getActualDelayCategoryLabel(data.category)
      result.reason = data.reason || ''
      result.updatedBy = data.updatedBy || ''
      result.updatedAt = data.updatedAt || ''
      return result
    } catch {
      // ignore json parse error
    }
  }

  // Fallback text check
  const textMatch = note.match(/\[เหตุผลล่าช้าหน้างาน:\s*(.*?)(?:\s*-\s*(.*?))?\]/)
  if (textMatch) {
    result.hasDelayReason = true
    result.category = 'OTHER'
    result.categoryLabel = textMatch[1] || 'ระบุเหตุผลหน้างาน'
    result.reason = textMatch[2] || ''
  }

  return result
}

/**
 * Formats shopfloor actual delay metadata into structured string to store in production_logs.note
 * Preserves any existing [PLAN_RESCHEDULE:{...}] tags and clean notes.
 */
export function formatActualDelayNote(
  existingNote: string | null | undefined,
  delayData: {
    category: string
    reason: string
    updatedBy?: string
  }
): string {
  const payload = {
    ...delayData,
    updatedAt: new Date().toISOString()
  }

  const tag = `[ACTUAL_DELAY:${JSON.stringify(payload)}]`

  // Clean existing ACTUAL_DELAY tag and previous summaries
  let cleanNote = (existingNote || '')
    .replace(/\[ACTUAL_DELAY:.*?\]/g, '')
    .replace(/\[เหตุผลล่าช้าหน้างาน:.*?\]/g, '')
    .replace(/\[เหตุผลทำจริงล่าช้า:.*?\]/g, '')
    .trim()

  const categoryText = getActualDelayCategoryLabel(delayData.category)
  const humanSummary = `[เหตุผลล่าช้าหน้างาน: ${categoryText}${delayData.reason ? ` - ${delayData.reason}` : ''}]`

  return cleanNote 
    ? `${humanSummary} ${tag}\n${cleanNote}` 
    : `${humanSummary} ${tag}`
}

