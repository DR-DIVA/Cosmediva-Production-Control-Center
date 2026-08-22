export interface DelayInfo {
  isDelayed: boolean
  originalEta?: string
  revisedEta?: string
  category?: string
  categoryLabel?: string
  reason?: string
  actionPlan?: string
  updatedBy?: string
  updatedAt?: string
}

export const DELAY_CATEGORIES = [
  { id: 'SUPPLIER_PROD', label: 'Supplier ผลิตไม่ทัน / กำลังผลิตไม่พอ' },
  { id: 'IMPORT_LOGISTICS', label: 'ปัญหาการขนส่ง / ติดด่านศุลกากร / ชิปปิ้ง' },
  { id: 'RAW_MATERIAL_SHORTAGE', label: 'Supplier ขาดวัตถุดิบต้นทาง / บรรจุภัณฑ์ขาดตลาด' },
  { id: 'ARTWORK_SPEC_CHANGE', label: 'ติดยืนยันแบบ Artwork / สเปกจากลูกค้า' },
  { id: 'URGENT_PO_SHORT_LEADTIME', label: 'เปิด PO กระชั้นชิด (Lead time สั้นกว่ามาตรฐาน)' },
  { id: 'QUALITY_ISSUE_REMAKE', label: 'ตรวจพบตำหนิต้นทาง / สั่งผลิตใหม่ (Remake)' },
  { id: 'OTHER', label: 'อื่นๆ (ระบุในหมายเหตุ)' },
] as const

export function getCategoryLabel(categoryId?: string): string {
  if (!categoryId) return 'ไม่ระบุหมวดหมู่'
  const found = DELAY_CATEGORIES.find(c => c.id === categoryId)
  return found ? found.label : categoryId
}

/**
 * Parses delay tracking metadata from bottom_remark or notes
 */
export function parseDelayInfo(remark?: string | null, etaDate?: string | null, receiveDate?: string | null, status?: string): DelayInfo {
  const result: DelayInfo = {
    isDelayed: false
  }

  if (!remark) {
    // Check if overdue by date
    if (etaDate && !receiveDate && (status === 'PENDING_DELIVERY' || status === 'DELAYED')) {
      const etaTime = new Date(etaDate).setHours(0, 0, 0, 0)
      const nowTime = new Date().setHours(0, 0, 0, 0)
      if (nowTime > etaTime) {
        result.isDelayed = true
        result.originalEta = etaDate
      }
    }
    return result
  }

  // Look for structured JSON tag: [DELAY_TRACKING:{...}]
  const match = remark.match(/\[DELAY_TRACKING:(.*?)\]/)
  if (match && match[1]) {
    try {
      const data = JSON.parse(match[1])
      result.isDelayed = true
      result.originalEta = data.originalEta || etaDate || ''
      result.revisedEta = data.revisedEta || ''
      result.category = data.category || 'OTHER'
      result.categoryLabel = getCategoryLabel(data.category)
      result.reason = data.reason || ''
      result.actionPlan = data.actionPlan || ''
      result.updatedBy = data.updatedBy || ''
      result.updatedAt = data.updatedAt || ''
      return result
    } catch {
      // ignore json parse error, fall through
    }
  }

  // Fallback: check if remark contains text delay marker
  if (remark.includes('[เลื่อนส่ง') || remark.includes('[ล่าช้า') || remark.includes('[DELAY') || status === 'DELAYED') {
    result.isDelayed = true
    result.originalEta = etaDate || ''
    result.reason = remark
    result.category = 'OTHER'
    result.categoryLabel = 'แจ้งเลื่อนส่ง'
  } else if (etaDate && !receiveDate && (status === 'PENDING_DELIVERY' || status === 'DELAYED')) {
    const etaTime = new Date(etaDate).setHours(0, 0, 0, 0)
    const nowTime = new Date().setHours(0, 0, 0, 0)
    if (nowTime > etaTime) {
      result.isDelayed = true
      result.originalEta = etaDate
    }
  }

  return result
}

/**
 * Formats delay tracking metadata into structured string to store in bottom_remark
 */
export function formatDelayRemark(
  existingRemark: string | null | undefined,
  delayData: {
    originalEta: string
    revisedEta: string
    category: string
    reason: string
    actionPlan?: string
    updatedBy: string
  }
): string {
  const payload = {
    ...delayData,
    updatedAt: new Date().toISOString()
  }

  const tag = `[DELAY_TRACKING:${JSON.stringify(payload)}]`
  
  // Clean existing DELAY_TRACKING tag
  let cleanRemark = (existingRemark || '').replace(/\[DELAY_TRACKING:.*?\]/g, '').trim()
  
  // Human readable description prefix for legacy view
  const categoryText = getCategoryLabel(delayData.category)
  const humanSummary = `[เลื่อนเป็น ${delayData.revisedEta}: ${categoryText} - ${delayData.reason || 'ไม่มีหมายเหตุ'}]`
  
  // Also clean old human summary if present
  cleanRemark = cleanRemark.replace(/\[เลื่อนเป็น .*?\]/g, '').trim()

  return cleanRemark 
    ? `${humanSummary} ${tag}\n${cleanRemark}` 
    : `${humanSummary} ${tag}`
}

export interface SupplierScorecard {
  supplier: string
  totalCount: number
  onTimeCount: number
  delayedCount: number
  otifPct: number
  grade: 'A' | 'B' | 'C' | 'D'
  gradeColor: string
  categories: Record<string, number>
}

/**
 * Computes Supplier OTIF & Procurement metrics from RM/PM list
 */
export function calculateSupplierOtifMetrics(items: any[]) {
  const supplierMap: Record<string, {
    total: number
    onTime: number
    delayed: number
    categories: Record<string, number>
  }> = {}

  let totalItems = 0
  let totalOnTime = 0
  let totalDelayed = 0
  const categoryCounts: Record<string, number> = {}

  items.forEach(item => {
    const sName = (item.supplier || 'ไม่ระบุซัพพลายเออร์').trim()
    if (!supplierMap[sName]) {
      supplierMap[sName] = { total: 0, onTime: 0, delayed: 0, categories: {} }
    }

    const delayInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
    const isDelayed = delayInfo.isDelayed || item.status === 'DELAYED'

    totalItems++
    supplierMap[sName].total++

    if (isDelayed) {
      totalDelayed++
      supplierMap[sName].delayed++
      const cat = delayInfo.category || 'OTHER'
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      supplierMap[sName].categories[cat] = (supplierMap[sName].categories[cat] || 0) + 1
    } else {
      totalOnTime++
      supplierMap[sName].onTime++
    }
  })

  const overallOtifPct = totalItems > 0 ? ((totalOnTime / totalItems) * 100) : 100

  // Calculate grade
  const getGrade = (pct: number): { grade: 'A' | 'B' | 'C' | 'D', gradeColor: string } => {
    if (pct >= 95) return { grade: 'A', gradeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    if (pct >= 85) return { grade: 'B', gradeColor: 'bg-blue-100 text-blue-800 border-blue-300' }
    if (pct >= 70) return { grade: 'C', gradeColor: 'bg-amber-100 text-amber-800 border-amber-300' }
    return { grade: 'D', gradeColor: 'bg-rose-100 text-rose-800 border-rose-300' }
  }

  const supplierList: SupplierScorecard[] = Object.keys(supplierMap).map(s => {
    const data = supplierMap[s]
    const otifPct = data.total > 0 ? (data.onTime / data.total) * 100 : 100
    const { grade, gradeColor } = getGrade(otifPct)
    return {
      supplier: s,
      totalCount: data.total,
      onTimeCount: data.onTime,
      delayedCount: data.delayed,
      otifPct: parseFloat(otifPct.toFixed(1)),
      grade,
      gradeColor,
      categories: data.categories
    }
  }).sort((a, b) => b.totalCount - a.totalCount)

  return {
    totalItems,
    totalOnTime,
    totalDelayed,
    overallOtifPct: parseFloat(overallOtifPct.toFixed(1)),
    overallGrade: getGrade(overallOtifPct),
    categoryCounts,
    supplierList
  }
}
