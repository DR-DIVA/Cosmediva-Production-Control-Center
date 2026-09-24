'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Printer,
  Download,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  X,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { format, addDays, startOfDay, differenceInDays, isSameDay } from 'date-fns'
import { toast } from 'sonner'
import { parsePlanChangeInfo } from '@/lib/planTracking'
import { cn, getBaseOrderType } from '@/lib/utils'
import { isProcessInDept, ProductionDept } from './MasterPlanningTimeline'

interface TimelinePrintModalProps {
  isOpen: boolean
  onClose: () => void
  lots: any[]
  logs: any[]
  processes: any[]
  currentUser?: string
  initialDept?: string
  lockDept?: boolean
  initialOrderType?: string
  initialShowHandovers?: boolean
  initialViewMode?: 'plan' | 'actual' | 'compare'
}

const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

const PROCESS_PALETTES: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  'ชั่งสาร': { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-500', label: 'ชั่งสาร (RM)' },
  'ผสม': { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', dot: 'bg-blue-500', label: 'ผสม (MX)' },
  'บรรจุ': { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-500', label: 'บรรจุ (PK)' },
  'ลงลัง': { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dot: 'bg-purple-500', label: 'ลงลัง' },
  'รอ QC': { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', dot: 'bg-rose-500', label: 'รอ QC' },
  'รอ POF': { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300', dot: 'bg-indigo-500', label: 'รอ POF' },
  'รอเข้าคลัง FG': { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300', dot: 'bg-teal-500', label: 'รอเข้าคลัง FG' },
  'DEFAULT': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-400', label: 'งานทั่วไป' }
}

export function TimelinePrintModal({
  isOpen,
  onClose,
  lots,
  logs,
  processes,
  currentUser = 'PLANNER',
  initialDept = 'ALL',
  lockDept = false,
  initialOrderType = 'ALL',
  initialShowHandovers = false,
  initialViewMode = 'plan'
}: TimelinePrintModalProps) {
  const [viewMode, setViewMode] = useState<'plan' | 'actual' | 'compare'>(initialViewMode)
  const [lookaheadDays, setLookaheadDays] = useState<number>(14)
  const [startDateStr, setStartDateStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [deptFilter, setDeptFilter] = useState<string>(initialDept)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>(initialOrderType)
  const [showHandovers, setShowHandovers] = useState<boolean>(initialShowHandovers)
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true)
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')
  const [isExportingDirectPdf, setIsExportingDirectPdf] = useState(false)

  // Sync viewMode when opened or initialViewMode changes
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode)
      if (initialViewMode === 'actual') {
        // ในโหมดทำจริง วันนี้อยู่คอลัมน์สุดท้าย ดูย้อนหลัง 14 วัน
        setStartDateStr(format(addDays(new Date(), -13), 'yyyy-MM-dd'))
        setLookaheadDays(14)
      } else if (initialViewMode === 'compare') {
        // ในโหมดเปรียบเทียบ วันนี้อยู่กึ่งกลาง ดูย้อนหลัง 7 วัน + หน้า 7 วัน (รวม 15 วัน)
        setStartDateStr(format(addDays(new Date(), -7), 'yyyy-MM-dd'))
        setLookaheadDays(15)
      } else {
        // ในโหมดแผนงาน วันนี้อยู่คอลัมน์แรก ดูล่วงหน้า 14 วัน
        setStartDateStr(format(new Date(), 'yyyy-MM-dd'))
        setLookaheadDays(14)
      }
    }
  }, [initialViewMode, isOpen])

  const printContainerRef = useRef<HTMLDivElement>(null)

  // Calculate horizon date array
  const startDate = useMemo(() => {
    try {
      return startOfDay(startDateStr ? new Date(startDateStr) : new Date())
    } catch {
      return startOfDay(new Date())
    }
  }, [startDateStr])

  const horizonDates = useMemo(() => {
    return Array.from({ length: lookaheadDays }).map((_, i) => addDays(startDate, i))
  }, [startDate, lookaheadDays])

  const horizonStart = horizonDates[0]
  const horizonEnd = horizonDates[horizonDates.length - 1]

  const isHandoverProcess = (processName?: string) => {
    if (!processName) return false
    const p = processName.trim()
    return (
      p.startsWith('รอ') ||
      p.includes('รอ QC') ||
      p.includes('รอ POF') ||
      p.includes('รอเข้าคลัง') ||
      p.includes('รออุโมงค์') ||
      p.includes('รอบรรจุ') ||
      p === 'ลงลัง'
    )
  }

  // Filter lots and tasks that fall within the selected horizon
  const filteredPrintData = useMemo(() => {
    const searchLower = searchFilter.trim().toLowerCase()

    return lots
      .filter(lot => {
        // Order type filter
        if (orderTypeFilter !== 'ALL') {
          const currentType = getBaseOrderType(lot.order_type)
          if (currentType !== orderTypeFilter) return false
        }

        // Search query filter
        if (searchLower) {
          const sku = (lot.products?.sku || '').toLowerCase()
          const lotNo = (lot.lot_no || '').toLowerCase()
          const po = (lot.po_no || '').toLowerCase()
          if (!sku.includes(searchLower) && !lotNo.includes(searchLower) && !po.includes(searchLower)) {
            return false
          }
        }

        return true
      })
      .map(lot => {
        // Find tasks for this lot
        const lotLogs = logs
          .filter(l => l.production_lot_id === lot.id)
          .filter(l => {
            if (!showHandovers) {
              const process = processes.find(p => p.id === l.process_id)
              const pName = process?.process_name || l.processes?.process_name || ''
              if (isHandoverProcess(pName)) return false
            }
            return true
          })
          .filter(l => {
            const process = processes.find(p => p.id === l.process_id)
            const pName = process?.process_name || l.processes?.process_name || ''
            return isProcessInDept(pName, deptFilter as ProductionDept)
          })
          .filter(l => {
            const todayStart = startOfDay(new Date())

            // 1. Check Plan Overlap
            let hasPlanOverlap = false
            if (l.activity_date) {
              const pStart = startOfDay(new Date(l.activity_date))
              const pEnd = l.end_date ? startOfDay(new Date(l.end_date)) : pStart
              hasPlanOverlap = pEnd >= horizonStart && pStart <= horizonEnd
            }

            // 2. Check Actual Overlap
            let hasActualOverlap = false
            const actualStartRaw = l.start_time || (l.status === 'DONE' ? (l.activity_date || l.end_time || l.updated_at) : null)
            if (actualStartRaw) {
              const aStart = startOfDay(new Date(actualStartRaw))
              let aEnd = aStart
              if (l.status === 'DONE') {
                const actualEndRaw = l.end_time || l.updated_at || actualStartRaw
                aEnd = startOfDay(new Date(actualEndRaw))
                if (aEnd < aStart) aEnd = aStart
              } else if (l.status === 'IN_PROGRESS') {
                aEnd = todayStart > aStart ? todayStart : aStart
              }
              hasActualOverlap = aEnd >= horizonStart && aStart <= horizonEnd
            }

            if (viewMode === 'plan') return hasPlanOverlap
            if (viewMode === 'actual') return hasActualOverlap
            // 'compare' mode: include if either plan or actual overlaps horizon
            return hasPlanOverlap || hasActualOverlap
          })
          .sort((a, b) => {
            const dateA = a.activity_date ? new Date(a.activity_date).getTime() : 0
            const dateB = b.activity_date ? new Date(b.activity_date).getTime() : 0
            return dateA - dateB
          })

        return {
          ...lot,
          tasks: lotLogs
        }
      })
      .filter(lot => lot.tasks.length > 0)
  }, [lots, logs, processes, orderTypeFilter, searchFilter, showHandovers, deptFilter, horizonStart, horizonEnd, viewMode])

  const totalFilteredTasksCount = useMemo(() => {
    return filteredPrintData.reduce((acc, lot) => acc + lot.tasks.length, 0)
  }, [filteredPrintData])

  // Plan vs Actual Schedule Adherence & Bottleneck KPI Metrics
  const scheduleAdherenceStats = useMemo(() => {
    let totalPlanned = 0
    let totalCompleted = 0
    let totalOnTime = 0
    let totalDelayed = 0
    let totalEarly = 0
    let totalDelayDays = 0

    const deptStats = {
      RM: { total: 0, completed: 0, onTime: 0, delayed: 0, delayDays: 0 },
      MX: { total: 0, completed: 0, onTime: 0, delayed: 0, delayDays: 0 },
      PK: { total: 0, completed: 0, onTime: 0, delayed: 0, delayDays: 0 }
    }

    const bottleneckCounts: Record<string, number> = {
      FLOOR_DOWNTIME: 0,
      WAIT_RM_PM: 0,
      QC_WAIT: 0,
      RUSH_ORDER_INSERT: 0,
      PLAN_CALIBRATION: 0,
      CUSTOMER_RESCHEDULE: 0,
      OTHER: 0
    }

    const todayStart = startOfDay(new Date())

    logs.forEach(log => {
      const process = processes.find(p => p.id === log.process_id)
      const pName = (process?.process_name || log.processes?.process_name || '').toLowerCase()

      let deptKey: 'RM' | 'MX' | 'PK' | null = null
      if (pName.includes('ชั่ง')) deptKey = 'RM'
      else if (pName.includes('ผสม')) deptKey = 'MX'
      else if (pName.includes('บรรจุ') || pName.includes('ลงลัง')) deptKey = 'PK'

      if (log.activity_date) {
        totalPlanned++
        if (deptKey) deptStats[deptKey].total++

        const planStart = startOfDay(new Date(log.activity_date))
        const planEnd = log.end_date ? startOfDay(new Date(log.end_date)) : planStart

        if (log.status === 'DONE') {
          totalCompleted++
          if (deptKey) deptStats[deptKey].completed++

          const actualEnd = log.end_time
            ? startOfDay(new Date(log.end_time))
            : (log.updated_at ? startOfDay(new Date(log.updated_at)) : planStart)

          const diff = differenceInDays(actualEnd, planEnd)

          if (diff <= 0) {
            totalOnTime++
            if (deptKey) deptStats[deptKey].onTime++
            if (diff < 0) totalEarly++
          } else {
            totalDelayed++
            totalDelayDays += diff
            if (deptKey) {
              deptStats[deptKey].delayed++
              deptStats[deptKey].delayDays += diff
            }

            const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
            const noteLower = (log.note || '').toLowerCase()

            if (noteLower.includes('qc hold') || noteLower.includes('รอ qc') || noteLower.includes('แล็บ')) {
              bottleneckCounts.QC_WAIT++
            } else if (planInfo.category && bottleneckCounts[planInfo.category] !== undefined) {
              bottleneckCounts[planInfo.category]++
            } else if (noteLower.includes('เครื่อง') || noteLower.includes('เสีย') || noteLower.includes('ซ่อม')) {
              bottleneckCounts.FLOOR_DOWNTIME++
            } else if (noteLower.includes('วัตถุดิบ') || noteLower.includes('สาร') || noteLower.includes('บรรจุภัณฑ์')) {
              bottleneckCounts.WAIT_RM_PM++
            } else {
              bottleneckCounts.FLOOR_DOWNTIME++
            }
          }
        } else if (log.status === 'IN_PROGRESS') {
          if (differenceInDays(todayStart, planEnd) > 0) {
            const overdue = differenceInDays(todayStart, planEnd)
            totalDelayed++
            totalDelayDays += overdue
            if (deptKey) {
              deptStats[deptKey].delayed++
              deptStats[deptKey].delayDays += overdue
            }
          }
        } else if (log.status === 'WAITING') {
          if (differenceInDays(todayStart, planStart) > 0) {
            const overdue = differenceInDays(todayStart, planStart)
            totalDelayed++
            totalDelayDays += overdue
            if (deptKey) {
              deptStats[deptKey].delayed++
              deptStats[deptKey].delayDays += overdue
            }
          }
        }
      }
    })

    const overallAccuracy = (totalOnTime + totalDelayed) > 0
      ? ((totalOnTime / (totalOnTime + totalDelayed)) * 100).toFixed(1)
      : '100.0'

    const rmAccuracy = (deptStats.RM.onTime + deptStats.RM.delayed) > 0
      ? ((deptStats.RM.onTime / (deptStats.RM.onTime + deptStats.RM.delayed)) * 100).toFixed(1)
      : '100.0'

    const mxAccuracy = (deptStats.MX.onTime + deptStats.MX.delayed) > 0
      ? ((deptStats.MX.onTime / (deptStats.MX.onTime + deptStats.MX.delayed)) * 100).toFixed(1)
      : '100.0'

    const pkAccuracy = (deptStats.PK.onTime + deptStats.PK.delayed) > 0
      ? ((deptStats.PK.onTime / (deptStats.PK.onTime + deptStats.PK.delayed)) * 100).toFixed(1)
      : '100.0'

    const avgDelay = totalDelayed > 0
      ? (totalDelayDays / totalDelayed).toFixed(1)
      : '0.0'

    const bottleneckLabels: Record<string, string> = {
      FLOOR_DOWNTIME: '⚙️ หน้างานขัดข้อง',
      WAIT_RM_PM: '📦 รอวัตถุดิบ/PM',
      QC_WAIT: '🔬 รอผลตรวจ QC',
      RUSH_ORDER_INSERT: '⚡ แทรกงานด่วน',
      PLAN_CALIBRATION: '📋 ปรับแผนปกติ',
      CUSTOMER_RESCHEDULE: '👤 ลูกค้าขอเลื่อน',
      OTHER: '❓ อื่นๆ'
    }

    const sortedBottlenecks = Object.entries(bottleneckCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])

    const totalBottleneckIncidents = sortedBottlenecks.reduce((acc, [_, c]) => acc + c, 0)
    const topBottleneck = sortedBottlenecks[0]
    const topBottleneckText = topBottleneck 
      ? `${bottleneckLabels[topBottleneck[0]] || topBottleneck[0]} (${topBottleneck[1]} งาน)`
      : 'ยังไม่พบคอขวดสะสม'

    const bottleneckSummaryText = sortedBottlenecks.length > 0
      ? sortedBottlenecks.slice(0, 3).map(([k, count]) => {
          const pct = totalBottleneckIncidents > 0 ? Math.round((count / totalBottleneckIncidents) * 100) : 0
          return `${bottleneckLabels[k]?.replace(/^[^\s]+\s/, '') || k} ${pct}%`
        }).join(' • ')
      : ''

    return {
      totalPlanned,
      totalCompleted,
      totalOnTime,
      totalDelayed,
      totalEarly,
      overallAccuracy,
      deptStats: {
        RM: { ...deptStats.RM, accuracy: rmAccuracy },
        MX: { ...deptStats.MX, accuracy: mxAccuracy },
        PK: { ...deptStats.PK, accuracy: pkAccuracy }
      },
      avgDelay,
      topBottleneckText,
      bottleneckSummaryText
    }
  }, [logs, processes])

  // Variance calculation helper for comparing P vs A
  const getTaskVariance = (log: any) => {
    let variance = {
      type: 'WAITING',
      diffDays: 0,
      label: 'รอเริ่มตามแผน',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    }

    if (log.activity_date) {
      const todayStart = startOfDay(new Date())
      const pEnd = log.end_date ? startOfDay(new Date(log.end_date)) : startOfDay(new Date(log.activity_date))
      const pStart = startOfDay(new Date(log.activity_date))

      if (log.status === 'DONE') {
        const aEnd = log.end_time
          ? startOfDay(new Date(log.end_time))
          : (log.updated_at ? startOfDay(new Date(log.updated_at)) : pEnd)
        const diff = differenceInDays(aEnd, pEnd)

        if (diff === 0) {
          variance = { type: 'ON_TIME', diffDays: 0, label: '✅ ตรงแผน', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' }
        } else if (diff < 0) {
          variance = { type: 'EARLY', diffDays: diff, label: `⚡ เร็วกว่าแผน ${Math.abs(diff)}d`, badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold' }
        } else {
          variance = { type: 'DELAYED', diffDays: diff, label: `⚠️ ล่าช้า +${diff}d`, badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' }
        }
      } else if (log.status === 'IN_PROGRESS') {
        const overdue = differenceInDays(todayStart, pEnd)
        if (overdue > 0) {
          variance = { type: 'OVERDUE_IN_PROGRESS', diffDays: overdue, label: `🚨 เกินกำหนด +${overdue}d`, badgeClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold' }
        } else {
          variance = { type: 'IN_PROGRESS', diffDays: 0, label: '⏳ ผลิตตามแผน', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium' }
        }
      } else {
        const overdue = differenceInDays(todayStart, pStart)
        if (overdue > 0) {
          variance = { type: 'OVERDUE_START', diffDays: overdue, label: `⏳ เลยวันเริ่ม +${overdue}d`, badgeClass: 'bg-amber-100 text-amber-900 border-amber-400 font-bold' }
        }
      }
    }

    return variance
  }

  const totalFilteredTanksCount = useMemo(() => {
    return filteredPrintData.reduce((acc, lot) => acc + (Number(lot.total_tanks) || 0), 0)
  }, [filteredPrintData])

  // Get palette for a task name
  const getTaskPalette = (pName: string) => {
    for (const key of Object.keys(PROCESS_PALETTES)) {
      if (key !== 'DEFAULT' && pName.includes(key)) {
        return PROCESS_PALETTES[key]
      }
    }
    return PROCESS_PALETTES['DEFAULT']
  }

  // Native Browser Print through an isolated Iframe for 100% Vector Quality & Native Pagination
  const handlePrint = () => {
    if (typeof window === 'undefined') return

    const printElement = document.getElementById('timeline-printable-markup')
    if (!printElement) {
      toast.error('ไม่พบเนื้อหาตารางสำหรับพิมพ์')
      return
    }

    // Remove any previous print iframe
    const oldFrame = document.getElementById('timeline-print-iframe')
    if (oldFrame) oldFrame.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'timeline-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '297mm'
    iframe.style.height = '210mm'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '-9999'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument
    if (!iframeDoc) {
      toast.error('ไม่สามารถสร้างหน้าต่างการพิมพ์ได้')
      return
    }

    // Collect all parent stylesheets and style tags to maintain Tailwind rules
    const parentStyles = typeof document !== 'undefined'
      ? Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map(el => el.outerHTML)
          .join('\n')
      : ''

    const htmlContent = printElement.innerHTML

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>CosmeDiva - แผนผังกำหนดการผลิต (Timeline)</title>
        ${parentStyles}
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm 8mm 8mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Sarabun", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 10px;
            line-height: 1.25;
          }
          #timeline-printable-markup {
            width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          table.timeline-table, table {
            width: 100% !important;
            min-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          @media print {
            @page {
              size: A4 landscape;
              margin: 6mm 8mm 8mm 8mm;
            }
            html, body {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #timeline-printable-markup,
            table.timeline-table,
            table {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              table-layout: fixed !important;
            }
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tfoot {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .lot-header-row {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 14px;
          }
          .signature-grid {
            display: flex !important;
            justify-content: space-between !important;
            gap: 24px !important;
            text-align: center !important;
          }
          .signature-col {
            flex: 1 1 0% !important;
            border-top: 1px solid #94a3b8 !important;
            padding-top: 4px !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }

          /* Structural Layout & Utilities */
          .w-full { width: 100% !important; }
          .h-full { height: 100% !important; }
          .flex { display: flex !important; }
          .flex-col { flex-direction: column !important; }
          .items-center { align-items: center !important; }
          .items-start { align-items: flex-start !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-end { justify-content: flex-end !important; }
          .justify-center { justify-content: center !important; }
          .shrink-0 { flex-shrink: 0 !important; }
          .relative { position: relative !important; }
          .overflow-hidden { overflow: hidden !important; }
          .ml-auto { margin-left: auto !important; }

          /* Spacing & Heights */
          .h-5 { height: 20px !important; }
          .h-6 { height: 24px !important; }
          .h-7 { height: 28px !important; }
          .p-0 { padding: 0 !important; }
          .p-0.5 { padding: 2px !important; }
          .p-1 { padding: 4px !important; }
          .p-1.5 { padding: 6px !important; }
          .p-2 { padding: 8px !important; }
          .px-1 { padding-left: 4px !important; padding-right: 4px !important; }
          .px-1.5 { padding-left: 6px !important; padding-right: 6px !important; }
          .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
          .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
          .py-0.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
          .py-1.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
          .pl-2 { padding-left: 8px !important; }
          .pl-4 { padding-left: 16px !important; }
          .pb-3 { padding-bottom: 12px !important; }
          .mt-0.5 { margin-top: 2px !important; }
          .mt-1 { margin-top: 4px !important; }
          .mt-3 { margin-top: 12px !important; }
          .mt-4 { margin-top: 16px !important; }
          .pt-1 { padding-top: 4px !important; }
          .pt-2 { padding-top: 8px !important; }
          .pt-3 { padding-top: 12px !important; }
          .gap-1 { gap: 4px !important; }
          .gap-1.5 { gap: 6px !important; }
          .gap-2 { gap: 8px !important; }
          .gap-3 { gap: 12px !important; }
          .gap-4 { gap: 16px !important; }
          .gap-6 { gap: 24px !important; }

          /* Borders */
          .border { border: 1px solid #cbd5e1 !important; }
          .border-all { border: 1px solid #cbd5e1 !important; }
          .border-b { border-bottom: 1px solid #cbd5e1 !important; }
          .border-b-2 { border-bottom: 2px solid #cbd5e1 !important; }
          .border-r { border-right: 1px solid #e2e8f0 !important; }
          .border-t { border-top: 1px solid #cbd5e1 !important; }
          .border-t-2 { border-top: 2px solid #cbd5e1 !important; }
          .border-slate-100 { border-color: #f1f5f9 !important; }
          .border-slate-200 { border-color: #e2e8f0 !important; }
          .border-slate-300 { border-color: #cbd5e1 !important; }
          .border-slate-400 { border-color: #94a3b8 !important; }
          .border-slate-700 { border-color: #334155 !important; }
          .border-slate-900 { border-color: #0f172a !important; }

          /* Colors */
          .bg-white { background-color: #ffffff !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-slate-200 { background-color: #e2e8f0 !important; }
          .bg-slate-700 { background-color: #334155 !important; }
          .bg-slate-800 { background-color: #1e293b !important; }
          .bg-slate-900 { background-color: #0f172a !important; }
          .text-white { color: #ffffff !important; }
          .text-slate-300 { color: #cbd5e1 !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-slate-500 { color: #64748b !important; }
          .text-slate-600 { color: #475569 !important; }
          .text-slate-700 { color: #334155 !important; }
          .text-slate-800 { color: #1e293b !important; }
          .text-slate-900 { color: #0f172a !important; }
          .text-red-300 { color: #fca5a5 !important; }
          .text-yellow-200 { color: #fef08a !important; }
          .bg-blue-600 { background-color: #2563eb !important; }

          /* Palettes */
          .bg-amber-50 { background-color: #fffbeb !important; }
          .bg-amber-100 { background-color: #fef3c7 !important; }
          .bg-amber-200 { background-color: #fde68a !important; }
          .text-amber-800 { color: #92400e !important; }
          .text-amber-900 { color: #78350f !important; }
          .border-amber-200 { border-color: #fde68a !important; }
          .border-amber-300 { border-color: #fcd34d !important; }

          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-blue-100 { background-color: #dbeafe !important; }
          .text-blue-900 { color: #1e3a8a !important; }
          .border-blue-300 { border-color: #93c5fd !important; }

          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .bg-emerald-100 { background-color: #d1fae5 !important; }
          .text-emerald-900 { color: #064e3b !important; }
          .border-emerald-300 { border-color: #6ee7b7 !important; }

          .bg-purple-100 { background-color: #f3e8ff !important; }
          .bg-purple-200 { background-color: #e9d5ff !important; }
          .text-purple-800 { color: #6b21a8 !important; }
          .text-purple-900 { color: #581c87 !important; }
          .border-purple-300 { border-color: #d8b4fe !important; }

          .bg-rose-100 { background-color: #ffe4e6 !important; }
          .text-rose-900 { color: #881337 !important; }
          .border-rose-300 { border-color: #fda4af !important; }

          /* Badges & Dots */
          .w-2 { width: 8px !important; }
          .h-2 { height: 8px !important; }
          .rounded { border-radius: 4px !important; }
          .rounded-sm { border-radius: 2px !important; }
          .rounded-full { border-radius: 9999px !important; }
          .bg-amber-500 { background-color: #f59e0b !important; }
          .bg-blue-500 { background-color: #3b82f6 !important; }
          .bg-emerald-500 { background-color: #10b981 !important; }
          .bg-purple-500 { background-color: #a855f7 !important; }
          .bg-rose-500 { background-color: #f43f5e !important; }
          .bg-indigo-500 { background-color: #6366f1 !important; }
          .bg-teal-500 { background-color: #14b8a6 !important; }
          .bg-slate-400 { background-color: #94a3b8 !important; }

          /* Typography */
          .font-normal { font-weight: 400 !important; }
          .font-medium { font-weight: 500 !important; }
          .font-semibold { font-weight: 600 !important; }
          .font-bold { font-weight: 700 !important; }
          .font-black { font-weight: 900 !important; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
          .text-left { text-align: left !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          .italic { font-style: italic !important; }
          .tracking-wider { letter-spacing: 0.05em !important; }

          .text-[8px] { font-size: 8px !important; line-height: 10px !important; }
          .text-[8.5px] { font-size: 8.5px !important; line-height: 11px !important; }
          .text-[9px] { font-size: 9px !important; line-height: 12px !important; }
          .text-[9.5px] { font-size: 9.5px !important; line-height: 12px !important; }
          .text-[10px] { font-size: 10px !important; line-height: 13px !important; }
          .text-[11px] { font-size: 11px !important; line-height: 14px !important; }
          .text-xs { font-size: 11px !important; line-height: 14px !important; }
          .text-sm { font-size: 12px !important; line-height: 16px !important; }
          .text-base { font-size: 14px !important; line-height: 18px !important; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `)
    iframeDoc.close()

    toast.info('กำลังเปิดหน้าต่างเตรียมพิมพ์ A4 แนวนอน...')

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err: any) {
        console.error('Print iframe error:', err)
        window.print()
      }
    }, 400)
  }

  // Direct PDF Download using jsPDF & html2canvas-pro (supports lab, oklch, modern CSS colors)
  const handleDirectDownloadPdf = async () => {
    setIsExportingDirectPdf(true)
    const toastId = toast.loading('กำลังสร้างไฟล์ PDF ขนาด A4 แนวนอน...')
    try {
      const printElement = document.getElementById('timeline-printable-markup')
      if (!printElement) throw new Error('ไม่พบข้อมูลตารางสำหรับสร้าง PDF')

      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = 297
      const pdfHeight = 210
      const imgWidth = pdfWidth - 16 // 8mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 8

      pdf.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 16)

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 8
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 16)
      }

      const fileName = `CosmeDiva_Timeline_${format(startDate, 'yyyyMMdd')}_${lookaheadDays}d.pdf`
      pdf.save(fileName)
      toast.dismiss(toastId)
      toast.success(`ดาวน์โหลดไฟล์ ${fileName} สำเร็จ!`)
    } catch (err: any) {
      console.error('PDF generation error:', err)
      toast.dismiss(toastId)
      toast.error('ไม่สามารถส่งออก PDF ได้: ' + (err?.message || err))
    } finally {
      setIsExportingDirectPdf(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[96vw] md:max-w-7xl max-h-[96vh] flex flex-col p-4 sm:p-6 overflow-hidden bg-slate-50">
        <DialogHeader className="pb-3 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Printer className="w-4 h-4" />
                </span>
                พิมพ์ / ส่งออก PDF แผนผังกำหนดการผลิต (A4 แนวนอน)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                จัดรูปแบบกระดาษมาตรฐาน A4 แนวนอน (Landscape) พอดีขอบ 100% หัวตารางวันที่แสดงซ้ำทุกหน้าอัตโนมัติ
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium"
                onClick={handleDirectDownloadPdf}
                disabled={isExportingDirectPdf || filteredPrintData.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {isExportingDirectPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF โดยตรง'}
              </Button>

              <Button
                size="sm"
                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                onClick={handlePrint}
                disabled={filteredPrintData.length === 0}
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                พิมพ์ / บันทึกเป็น PDF (Print Dialog)
              </Button>
            </div>
          </div>

          {/* Interactive Print Options Toolbar */}
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {/* 1. Print Mode Toggle */}
            <div className="space-y-1 col-span-2 sm:col-span-1 lg:col-span-2">
              <Label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>โหมดการพิมพ์</span>
                {viewMode === 'compare' && <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1 rounded">มี KPI</span>}
              </Label>
              <div className="inline-flex w-full bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('plan')
                    setStartDateStr(format(new Date(), 'yyyy-MM-dd'))
                    setLookaheadDays(14)
                  }}
                  className={cn(
                    "flex-1 py-1 text-center rounded transition-all cursor-pointer text-[10.5px]",
                    viewMode === 'plan'
                      ? "bg-white text-indigo-900 shadow-xs font-black ring-1 ring-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="วันนี้อยู่คอลัมน์แรก (ดูไปข้างหน้า 14 วัน)"
                >
                  🅿️ แผนงาน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('actual')
                    setStartDateStr(format(addDays(new Date(), -13), 'yyyy-MM-dd'))
                    setLookaheadDays(14)
                  }}
                  className={cn(
                    "flex-1 py-1 text-center rounded transition-all cursor-pointer text-[10.5px]",
                    viewMode === 'actual'
                      ? "bg-white text-emerald-900 shadow-xs font-black ring-1 ring-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="วันนี้อยู่คอลัมน์สุดท้าย (ดูประวัติย้อนหลัง 14 วัน)"
                >
                  🅰️ ทำจริง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('compare')
                    setStartDateStr(format(addDays(new Date(), -7), 'yyyy-MM-dd'))
                    setLookaheadDays(15)
                  }}
                  className={cn(
                    "flex-1 py-1 text-center rounded transition-all cursor-pointer text-[10.5px]",
                    viewMode === 'compare'
                      ? "bg-indigo-600 text-white font-black shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="วันนี้อยู่กึ่งกลาง (ย้อนหลัง 7 วัน + หน้า 7 วัน รวม 15 วัน)"
                >
                  ⚖️ เทียบ P/A
                </button>
              </div>
            </div>

            {/* 2. Lookahead Horizon */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ช่วงเวลา (Horizon)</Label>
              <Select value={String(lookaheadDays)} onValueChange={v => setLookaheadDays(Number(v))}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 วัน (1 สัปดาห์)</SelectItem>
                  <SelectItem value="14">14 วัน (2 สัปดาห์ - แนะนำ)</SelectItem>
                  <SelectItem value="15">15 วัน (กึ่งกลาง - ย้อน 7d / หน้า 7d)</SelectItem>
                  <SelectItem value="21">21 วัน (3 สัปดาห์)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Start Date */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">วันเริ่มต้น</Label>
              <Input
                type="date"
                value={startDateStr}
                onChange={e => setStartDateStr(e.target.value)}
                className="h-8 text-xs bg-white px-2"
              />
            </div>

            {/* 4. Department */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">สายงาน / แผนก</Label>
              {lockDept ? (
                <div className="h-8 text-xs bg-slate-100 flex items-center px-2.5 rounded-md border border-slate-200 font-bold text-slate-700">
                  {deptFilter === 'RM' && '🟡 ชั่งสาร (RM)'}
                  {deptFilter === 'MX' && '🔵 ผสม (MX)'}
                  {deptFilter === 'PK' && '🟢 บรรจุ (PK)'}
                  {deptFilter === 'POF' && '🟣 ลงลัง/POF'}
                  {deptFilter === 'ALL' && 'ทุกสายงาน (All)'}
                </div>
              ) : (
                <Select value={deptFilter} onValueChange={v => setDeptFilter(v || 'ALL')}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">ทุกสายงาน (All)</SelectItem>
                    <SelectItem value="RM">ชั่งสาร (RM)</SelectItem>
                    <SelectItem value="MX">ผสม (MX)</SelectItem>
                    <SelectItem value="PK">บรรจุ (PK)</SelectItem>
                    <SelectItem value="POF">ลงลัง/POF</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 5. Order Type */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ประเภทออเดอร์</Label>
              <Select value={orderTypeFilter} onValueChange={v => setOrderTypeFilter(v || 'ALL')}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทั้งหมด (All)</SelectItem>
                  <SelectItem value="MTS">MTS (Stock)</SelectItem>
                  <SelectItem value="MTO">MTO (Order)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 6. Density / ความกะทัดรัดของแถว */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ความแน่นกระดาษ</Label>
              <Select value={density} onValueChange={v => { if (v) setDensity(v as 'compact' | 'comfortable') }}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">กะทัดรัด (แน่นหน้า)</SelectItem>
                  <SelectItem value="comfortable">ปกติ (สบายตา)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 7. Shopfloor Handover Tasks Toggle */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ขั้นตอนหน้างาน</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHandovers(!showHandovers)}
                className={cn(
                  "w-full h-8 text-xs font-semibold justify-start px-2 bg-white",
                  showHandovers ? "border-purple-300 text-purple-800 bg-purple-50" : "text-slate-600"
                )}
              >
                {showHandovers ? <Eye className="w-3.5 h-3.5 mr-1 text-purple-600 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />}
                <span className="truncate">{showHandovers ? "แสดงหน้างาน" : "ซ่อนหน้างาน"}</span>
              </Button>
            </div>

            {/* 8. Document Sign-off Box Toggle */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ช่องลงนามอนุมัติ</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIncludeSignatures(!includeSignatures)}
                className={cn(
                  "w-full h-8 text-xs font-semibold justify-start px-2 bg-white",
                  includeSignatures ? "border-emerald-300 text-emerald-800 bg-emerald-50" : "text-slate-600"
                )}
                title="ผู้จัดทำแผนงาน (Planner) / หัวหน้าฝ่ายผลิต / ฝ่ายประกันคุณภาพ (QA) และ ผู้อำนวยการโรงงาน"
              >
                {includeSignatures ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />}
                <span className="truncate">{includeSignatures ? "เปิดลงชื่อ" : "ปิดลงชื่อ"}</span>
              </Button>
            </div>

            {/* 9. Quick Search / Filter */}
            <div className="space-y-1 col-span-2 sm:col-span-1 lg:col-span-1">
              <Label className="text-[11px] font-bold text-slate-700">ค้นหา SKU/LOT</Label>
              <div className="relative">
                <Input
                  placeholder="เช่น PAMH..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="h-8 text-xs bg-white pr-6"
                />
                {searchFilter && (
                  <button onClick={() => setSearchFilter('')} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: A4 Landscape Live Preview Container */}
        <div className="flex-1 overflow-y-auto py-4 px-1 sm:px-3 bg-slate-200/70 rounded-lg my-2 border border-slate-300">
          <div className="max-w-[1150px] mx-auto bg-white shadow-md rounded-sm border border-slate-300 p-4 sm:p-6 transition-all">
            {/* The Actual Printable Element */}
            <div id="timeline-printable-markup" ref={printContainerRef} style={{ width: '100%', minWidth: '100%' }}>
              <table className="timeline-table w-full border-collapse" style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                <colgroup>
                  <col style={{ width: '22%', minWidth: '22%' }} />
                  {horizonDates.map((_, idx) => (
                    <col key={idx} style={{ width: `${78 / lookaheadDays}%`, minWidth: `${78 / lookaheadDays}%` }} />
                  ))}
                </colgroup>
                <thead>
                  {/* Document Header Row */}
                  <tr>
                    <th colSpan={lookaheadDays + 1} className="p-0 text-left font-normal border-b-2 border-slate-900">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-900 tracking-wider">
                              COSMEDIVA PRODUCTION SCHEDULE TIMELINE
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded text-white",
                              viewMode === 'compare' ? "bg-indigo-700" : viewMode === 'actual' ? "bg-emerald-700" : "bg-slate-800"
                            )}>
                              {viewMode === 'compare' ? '⚖️ โหมดเปรียบเทียบ (Plan vs Actual)' : viewMode === 'actual' ? '🅰️ โหมดทำจริง (Actual)' : '🅿️ โหมดแผนงาน (Plan)'}
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300">
                              {deptFilter === 'ALL' ? 'ทุกสายงาน' : deptFilter === 'RM' ? 'ฝ่ายชั่งสาร' : deptFilter === 'MX' ? 'ฝ่ายผสม' : 'ฝ่ายบรรจุ'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-0.5">
                            {viewMode === 'compare' ? 'รายงานเปรียบเทียบแผนงานกับผลผลิตหน้างานจริง' : 'แผนผังกำหนดการผลิต (Lookahead Timeline)'} • ประจำวันที่ <strong>{format(horizonStart, 'dd/MM/yyyy')}</strong> ถึง <strong>{format(horizonEnd, 'dd/MM/yyyy')}</strong> ({lookaheadDays} วัน)
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-600">
                          <div>พิมพ์เมื่อ: <strong>{format(new Date(), 'dd MMM yyyy HH:mm')}</strong> | ผู้จัดทำแผน: <strong className="text-slate-900">PLPTB1234 (คุณพรทิพย์)</strong>{currentUser && currentUser !== 'PLPTB1234' ? <span> | ผู้พิมพ์: <strong>{currentUser}</strong></span> : ''}</div>
                          <div className="flex items-center gap-2 justify-end mt-1 text-[10px]">
                            {viewMode === 'compare' ? (
                              <>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 font-bold border border-dashed border-indigo-400">🅿️ แผน (Plan)</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">🅰️ จริง (Actual)</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">✅ ตรงแผน</span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300">⚠️ ล่าช้า</span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-300">⚡ เร็ว</span>
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-300">🔬 1st</span>
                              </>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">🟡 ชั่งสาร</span>
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-300">🔵 ผสม</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">🟢 บรรจุ</span>
                                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-300">🔬 1st Batch</span>
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">🔄 ปรับเลื่อน</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary Metrics Row */}
                      <div className="flex items-center gap-4 py-1.5 px-3 bg-slate-100/90 border-t border-slate-200 text-[11px] text-slate-700">
                        <span>รายการออเดอร์ในแผน: <strong>{filteredPrintData.length}</strong> LOTs</span>
                        <span>•</span>
                        <span>จำนวนงานทั้งหมด: <strong>{totalFilteredTasksCount}</strong> คิวงาน</span>
                        <span>•</span>
                        <span>จำนวนถังรวม: <strong>{totalFilteredTanksCount}</strong> ถัง</span>
                        {viewMode === 'compare' && (
                          <>
                            <span>•</span>
                            <span>ความแม่นยำรวม: <strong className="text-indigo-700">{scheduleAdherenceStats.overallAccuracy}%</strong></span>
                            <span>•</span>
                            <span>ตรงแผน: <strong className="text-emerald-700">{scheduleAdherenceStats.totalOnTime}</strong></span>
                            <span>•</span>
                            <span>ล่าช้า: <strong className="text-rose-700">{scheduleAdherenceStats.totalDelayed}</strong></span>
                          </>
                        )}
                        <span className="ml-auto text-[10px] text-slate-500">ระบบ CosmeFlow OS • พิมพ์ A4 แนวนอน</span>
                      </div>

                      {/* Compare Mode KPI Summary Banner */}
                      {viewMode === 'compare' && (
                        <div className="bg-slate-50/95 p-2 border-t border-slate-300">
                          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                              สรุปดัชนีชี้วัดความแม่นยำของแผนงานและคอขวดสะสม (Schedule Adherence & Bottleneck KPIs)
                            </span>
                            <span className="text-[9px] font-normal text-slate-500">
                              (เปรียบเทียบ P vs A จากฐานข้อมูลจริง)
                            </span>
                          </div>

                          <div className="grid grid-cols-6 gap-2 text-left">
                            {/* Card 1: Overall Accuracy */}
                            <div className="bg-white p-1.5 rounded border border-indigo-200 shadow-2xs">
                              <div className="text-[9.5px] font-bold text-indigo-800">ความแม่นยำรวม (Accuracy)</div>
                              <div className="text-sm font-black text-indigo-950 mt-0.5">{scheduleAdherenceStats.overallAccuracy}%</div>
                              <div className="text-[8.5px] text-slate-500 mt-0.5">
                                ตรง <strong className="text-emerald-700">{scheduleAdherenceStats.totalOnTime}</strong> • ช้า <strong className="text-rose-700">{scheduleAdherenceStats.totalDelayed}</strong>
                              </div>
                            </div>

                            {/* Card 2: RM */}
                            <div className="bg-white p-1.5 rounded border border-amber-200 shadow-2xs">
                              <div className="text-[9.5px] font-bold text-amber-800 flex justify-between items-center">
                                <span>🟡 ชั่งสาร (RM)</span>
                                <span className="font-mono text-[9px]">{scheduleAdherenceStats.deptStats.RM.accuracy}%</span>
                              </div>
                              <div className="text-sm font-black text-amber-950 mt-0.5">{scheduleAdherenceStats.deptStats.RM.accuracy}%</div>
                              <div className="w-full bg-amber-100 h-1 rounded mt-1 overflow-hidden">
                                <div className="bg-amber-500 h-full rounded" style={{ width: `${scheduleAdherenceStats.deptStats.RM.accuracy}%` }} />
                              </div>
                            </div>

                            {/* Card 3: MX */}
                            <div className="bg-white p-1.5 rounded border border-blue-200 shadow-2xs">
                              <div className="text-[9.5px] font-bold text-blue-800 flex justify-between items-center">
                                <span>🔵 ผสม (MX)</span>
                                <span className="font-mono text-[9px]">{scheduleAdherenceStats.deptStats.MX.accuracy}%</span>
                              </div>
                              <div className="text-sm font-black text-blue-950 mt-0.5">{scheduleAdherenceStats.deptStats.MX.accuracy}%</div>
                              <div className="w-full bg-blue-100 h-1 rounded mt-1 overflow-hidden">
                                <div className="bg-blue-600 h-full rounded" style={{ width: `${scheduleAdherenceStats.deptStats.MX.accuracy}%` }} />
                              </div>
                            </div>

                            {/* Card 4: PK (Highlights if bottleneck) */}
                            <div className={cn(
                              "bg-white p-1.5 rounded border shadow-2xs",
                              Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "border-rose-300 bg-rose-50/40 ring-1 ring-rose-200" : "border-emerald-200"
                            )}>
                              <div className={cn(
                                "text-[9.5px] font-bold flex justify-between items-center",
                                Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "text-rose-800" : "text-emerald-800"
                              )}>
                                <span>🟢 บรรจุ (PK)</span>
                                <span className="font-mono text-[9px]">{scheduleAdherenceStats.deptStats.PK.accuracy}%</span>
                              </div>
                              <div className={cn(
                                "text-sm font-black mt-0.5",
                                Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "text-rose-950" : "text-emerald-950"
                              )}>
                                {scheduleAdherenceStats.deptStats.PK.accuracy}%
                              </div>
                              <div className="w-full bg-slate-200 h-1 rounded mt-1 overflow-hidden">
                                <div
                                  className={cn("h-full rounded", Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "bg-rose-500" : "bg-emerald-500")}
                                  style={{ width: `${scheduleAdherenceStats.deptStats.PK.accuracy}%` }}
                                />
                              </div>
                            </div>

                            {/* Card 5: Average Delay */}
                            <div className="bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                              <div className="text-[9.5px] font-bold text-slate-700">ความล่าช้าเฉลี่ย</div>
                              <div className="text-sm font-black text-slate-900 mt-0.5">
                                +{scheduleAdherenceStats.avgDelay} <span className="text-[9px] font-normal text-slate-500">วัน</span>
                              </div>
                              <div className="text-[8.5px] text-slate-500 mt-0.5">
                                เร็วกว่าแผน: <strong className="text-blue-700">{scheduleAdherenceStats.totalEarly}</strong> งาน
                              </div>
                            </div>

                            {/* Card 6: Bottleneck Root Causes */}
                            <div className="bg-white p-1.5 rounded border border-slate-200 shadow-2xs">
                              <div className="text-[9.5px] font-bold text-slate-700">วิเคราะห์คอขวดสะสม</div>
                              <div className="text-[9px] font-bold text-slate-900 mt-0.5 truncate" title={scheduleAdherenceStats.topBottleneckText}>
                                {scheduleAdherenceStats.topBottleneckText}
                              </div>
                              <div className="text-[8px] text-slate-500 mt-0.5 truncate" title={scheduleAdherenceStats.bottleneckSummaryText}>
                                {scheduleAdherenceStats.bottleneckSummaryText || 'ตรงตามเกณฑ์มาตรฐาน'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>
                  </tr>

                  {/* Repeating Date Column Headers */}
                  <tr className="bg-slate-800 text-white border-b-2 border-slate-900">
                    <th style={{ width: '22%' }} className="p-2 text-left text-xs font-bold border-r border-slate-700">
                      Project (PO / SKU / LOT)
                    </th>
                    {horizonDates.map((date, idx) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      const isToday = isSameDay(date, new Date())

                      return (
                        <th
                          key={idx}
                          style={{ width: `${78 / lookaheadDays}%` }}
                          className={cn(
                            "p-1 text-center text-xs border-r border-slate-700 font-normal select-none",
                            isWeekend && "bg-slate-700 text-red-300 font-bold",
                            isToday && "bg-blue-600 text-white font-black ring-1 ring-white"
                          )}
                        >
                          <div className="font-bold text-[11px] leading-tight">
                            {TH_DAYS[date.getDay()]}
                          </div>
                          <div className={cn("text-[10px] leading-tight", isToday ? "text-yellow-200 font-bold" : "text-slate-300")}>
                            {format(date, 'dd/MM')}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredPrintData.length === 0 ? (
                    <tr>
                      <td colSpan={lookaheadDays + 1} className="py-12 text-center text-slate-500 text-sm">
                        ไม่พบคิวงานที่ตรงกับเงื่อนไขตัวกรองในช่วงเวลา {format(horizonStart, 'dd/MM/yyyy')} ถึง {format(horizonEnd, 'dd/MM/yyyy')}
                      </td>
                    </tr>
                  ) : (
                    filteredPrintData.map(lot => {
                      const sku = lot.products?.sku || 'Unknown SKU'
                      const lotNo = lot.lot_no || '-'
                      const poNo = lot.po_no || '-'
                      const orderType = getBaseOrderType(lot.order_type)
                      const orderQty = lot.order_quantity ? Number(lot.order_quantity).toLocaleString() : '-'

                      return (
                        <React.Fragment key={lot.id}>
                          {/* LOT Header Row */}
                          <tr className={cn(
                            "lot-header-row bg-slate-100 font-bold border-t-2 border-slate-300",
                            density === 'compact' ? "h-6" : "h-7"
                          )}>
                            <td className={cn(
                              "pl-2 border-r border-slate-300 text-left",
                              density === 'compact' ? "py-0.5 px-1.5" : "p-1.5"
                            )}>
                              <div className="flex items-center justify-between gap-1">
                                <span className={cn(
                                  "font-black text-slate-900 truncate",
                                  density === 'compact' ? "text-[11px]" : "text-xs"
                                )} title={sku}>
                                  {sku}
                                </span>
                                <span className="text-[10px] bg-slate-200 px-1 rounded font-mono font-bold text-slate-700">
                                  {lotNo}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500 font-normal mt-0.5">
                                <span>PO: {poNo}</span>
                                <span>•</span>
                                <span>{orderQty} pc</span>
                                <span>•</span>
                                <span className={cn(
                                  "px-1 rounded text-[9px] font-bold",
                                  orderType === 'MTO' ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"
                                )}>
                                  {orderType}
                                </span>
                              </div>
                            </td>

                            {/* Guideline empty cells across the horizon */}
                            {horizonDates.map((date, idx) => {
                              const isWeekend = date.getDay() === 0 || date.getDay() === 6
                              const isToday = isSameDay(date, new Date())
                              return (
                                <td
                                  key={idx}
                                  className={cn(
                                    "border-r border-slate-200 p-0 text-center text-[10px]",
                                    isWeekend && "bg-slate-200/50",
                                    isToday && "bg-blue-50/60"
                                  )}
                                ></td>
                              )
                            })}
                          </tr>

                          {/* Individual Task Rows */}
                          {lot.tasks.map((log: any) => {
                            const process = processes.find(p => p.id === log.process_id)
                            const pName = process?.process_name || log.processes?.process_name || 'งานผลิต'
                            const palette = getTaskPalette(pName)

                            // 1st Batch detection
                            const isAutoPamh = sku.includes('PAMH-008') && (Number(log.tank_start || 1) <= 1 && Number(log.tank_end || 1) >= 1)
                            const hasBatchTag = (log.note || '').toLowerCase().includes('[1st_batch]') || (lot.order_type || '').includes('[1ST_BATCH]')
                            const is1stBatch = isAutoPamh || hasBatchTag

                            // Reschedule detection
                            const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)

                            // Calculate Plan Offset
                            let planOffset: any = null
                            if (log.activity_date) {
                              const startDateTask = startOfDay(new Date(log.activity_date))
                              const endDateTask = log.end_date ? startOfDay(new Date(log.end_date)) : startDateTask

                              const startDiff = differenceInDays(startDateTask, horizonStart)
                              const taskDuration = differenceInDays(endDateTask, startDateTask) + 1
                              const endDiff = startDiff + taskDuration - 1

                              if (endDiff >= 0 && startDiff < lookaheadDays) {
                                const clampedStart = Math.max(0, startDiff)
                                const clampedEnd = Math.min(lookaheadDays - 1, endDiff)
                                planOffset = {
                                  clampedStart,
                                  spannedDays: clampedEnd - clampedStart + 1,
                                  startsBefore: startDiff < 0,
                                  endsAfter: endDiff >= lookaheadDays,
                                  inView: true
                                }
                              }
                            }

                            // Calculate Actual Offset
                            let actualOffset: any = null
                            const actualStartRaw = log.start_time || (log.status === 'DONE' ? (log.activity_date || log.end_time || log.updated_at) : null)
                            if (actualStartRaw) {
                              const aStart = startOfDay(new Date(actualStartRaw))
                              let aEnd = aStart
                              if (log.status === 'DONE') {
                                const actualEndRaw = log.end_time || log.updated_at || actualStartRaw
                                aEnd = startOfDay(new Date(actualEndRaw))
                                if (aEnd < aStart) aEnd = aStart
                              } else if (log.status === 'IN_PROGRESS') {
                                const todayStart = startOfDay(new Date())
                                aEnd = todayStart > aStart ? todayStart : aStart
                              }

                              const startDiff = differenceInDays(aStart, horizonStart)
                              const taskDuration = differenceInDays(aEnd, aStart) + 1
                              const endDiff = startDiff + taskDuration - 1

                              if (endDiff >= 0 && startDiff < lookaheadDays) {
                                const clampedStart = Math.max(0, startDiff)
                                const clampedEnd = Math.min(lookaheadDays - 1, endDiff)
                                actualOffset = {
                                  clampedStart,
                                  spannedDays: clampedEnd - clampedStart + 1,
                                  startsBefore: startDiff < 0,
                                  endsAfter: endDiff >= lookaheadDays,
                                  inView: true,
                                  aStart,
                                  aEnd
                                }
                              }
                            }

                            const variance = getTaskVariance(log)
                            const isCompare = viewMode === 'compare'

                            return (
                              <tr
                                key={log.id}
                                className={cn(
                                  "task-row hover:bg-slate-50 border-b border-slate-200 text-xs",
                                  isCompare
                                    ? (density === 'compact' ? "h-10" : "h-12")
                                    : (density === 'compact' ? "h-5" : "h-6")
                                )}
                              >
                                {/* Task Label Cell */}
                                <td className={cn(
                                  "border-r border-slate-300 pl-3 bg-white align-middle",
                                  density === 'compact' ? "py-0.5 px-2 text-[10px]" : "py-1 px-2 text-[11px]"
                                )}>
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", palette.dot)}></span>
                                    <span className="font-semibold text-slate-800 truncate" title={`${pName} (T${log.tank_start || 1}-${log.tank_end || 1})`}>
                                      {pName} (T{log.tank_start || 1}-{log.tank_end || 1})
                                    </span>
                                  </div>

                                  {isCompare && (
                                    <div className="flex items-center gap-1 mt-0.5 pl-3.5">
                                      <span className={cn("text-[8px] px-1 py-0.2 rounded border font-bold shadow-2xs leading-tight", variance.badgeClass)}>
                                        {variance.label}
                                      </span>
                                      {is1stBatch && (
                                        <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[7.5px] px-1 rounded font-black">
                                          🔬 1st
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Gantt Bar Track (Spans all horizon columns in single relative cell) */}
                                <td colSpan={lookaheadDays} className="p-0 border-r border-slate-200 relative align-top">
                                  <div
                                    className="relative w-full h-full"
                                    style={{
                                      minHeight: isCompare
                                        ? (density === 'compact' ? '38px' : '44px')
                                        : (density === 'compact' ? '20px' : '24px')
                                    }}
                                  >
                                    {/* Day guide background columns */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                      {horizonDates.map((date, cIdx) => {
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6
                                        const isToday = isSameDay(date, new Date())
                                        return (
                                          <div
                                            key={cIdx}
                                            style={{ width: `${100 / lookaheadDays}%` }}
                                            className={cn(
                                              "h-full border-r border-slate-100",
                                              isWeekend && "bg-slate-100/50",
                                              isToday && "bg-blue-50/50"
                                            )}
                                          />
                                        )
                                      })}
                                    </div>

                                    {/* Mode 1: Plan Only */}
                                    {viewMode === 'plan' && planOffset?.inView && (
                                      <div
                                        className={cn(
                                          "absolute rounded px-1.5 flex items-center justify-between font-bold border shadow-2xs overflow-hidden z-10",
                                          density === 'compact' ? "h-[18px] text-[9px]" : "h-[21px] text-[10px]",
                                          palette.bg,
                                          palette.text,
                                          palette.border
                                        )}
                                        style={{
                                          top: '1px',
                                          left: `calc(${(planOffset.clampedStart / lookaheadDays) * 100}% + 1px)`,
                                          width: `calc(${(planOffset.spannedDays / lookaheadDays) * 100}% - 2px)`
                                        }}
                                      >
                                        <div className="flex items-center gap-1 truncate">
                                          {planOffset.startsBefore && <span className="text-[8px] opacity-70">◀</span>}
                                          <span className="truncate">
                                            {pName} T{log.tank_start || 1}-{log.tank_end || 1}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                          {is1stBatch && (
                                            <span className="bg-purple-200 text-purple-900 px-1 rounded text-[7.5px] font-black border border-purple-300">
                                              🔬 1st
                                            </span>
                                          )}
                                          {planInfo.isRescheduled && (
                                            <span className="bg-amber-200 text-amber-900 px-1 rounded text-[7.5px] font-bold border border-amber-300">
                                              🔄 เดิม:{planInfo.originalDate ? format(new Date(planInfo.originalDate), 'dd/MM') : ''}
                                            </span>
                                          )}
                                          {planOffset.endsAfter && <span className="text-[8px] opacity-70">▶</span>}
                                        </div>
                                      </div>
                                    )}

                                    {/* Mode 2: Actual Only */}
                                    {viewMode === 'actual' && actualOffset?.inView && (
                                      <div
                                        className={cn(
                                          "absolute rounded px-1.5 flex items-center justify-between font-bold text-white shadow-xs overflow-hidden z-10",
                                          density === 'compact' ? "h-[18px] text-[9px]" : "h-[21px] text-[10px]",
                                          log.status === 'DONE' ? "bg-emerald-600 border border-emerald-700" : "bg-amber-600 border border-amber-700"
                                        )}
                                        style={{
                                          top: '1px',
                                          left: `calc(${(actualOffset.clampedStart / lookaheadDays) * 100}% + 1px)`,
                                          width: `calc(${(actualOffset.spannedDays / lookaheadDays) * 100}% - 2px)`
                                        }}
                                      >
                                        <div className="flex items-center gap-1 truncate">
                                          {actualOffset.startsBefore && <span className="text-[8px] opacity-70">◀</span>}
                                          <span className="truncate">
                                            {pName} (จริง)
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-1 text-[8px]">
                                          <span>{log.status === 'DONE' ? 'เสร็จ' : 'กำลังผลิต'}</span>
                                          {actualOffset.endsAfter && <span className="opacity-70">▶</span>}
                                        </div>
                                      </div>
                                    )}

                                    {/* Mode 3: Compare P vs A (Dual-Track) */}
                                    {viewMode === 'compare' && (
                                      <>
                                        {/* Top Track: 🅿️ Plan Bar */}
                                        {planOffset?.inView && (
                                          <div
                                            className={cn(
                                              "absolute rounded px-1.5 flex items-center justify-between font-bold border border-dashed border-indigo-400 bg-indigo-50/95 text-indigo-950 shadow-2xs overflow-hidden z-10",
                                              density === 'compact' ? "h-[16px] text-[8px]" : "h-[18px] text-[9px]"
                                            )}
                                            style={{
                                              top: '2px',
                                              left: `calc(${(planOffset.clampedStart / lookaheadDays) * 100}% + 1px)`,
                                              width: `calc(${(planOffset.spannedDays / lookaheadDays) * 100}% - 2px)`
                                            }}
                                          >
                                            <div className="flex items-center gap-1 truncate">
                                              {planOffset.startsBefore && <span className="text-[7.5px] opacity-70">◀</span>}
                                              <span className="truncate">
                                                🅿️ {format(new Date(log.activity_date), 'dd/MM')}{log.end_date && log.end_date !== log.activity_date ? `-${format(new Date(log.end_date), 'dd/MM')}` : ''}
                                              </span>
                                            </div>
                                            {planInfo.isRescheduled && (
                                              <span className="bg-amber-200 text-amber-900 px-0.5 rounded text-[7px] font-bold shrink-0 ml-1">
                                                🔄{planInfo.originalDate ? format(new Date(planInfo.originalDate), 'dd/MM') : ''}
                                              </span>
                                            )}
                                            {planOffset.endsAfter && <span className="text-[7.5px] opacity-70">▶</span>}
                                          </div>
                                        )}

                                        {/* Bottom Track: 🅰️ Actual Bar */}
                                        {actualOffset?.inView ? (
                                          <div
                                            className={cn(
                                              "absolute rounded px-1.5 flex items-center justify-between font-bold text-white shadow-xs overflow-hidden z-20",
                                              density === 'compact' ? "h-[16px] text-[8px]" : "h-[18px] text-[9px]",
                                              variance.type === 'ON_TIME' && "bg-emerald-600 border border-emerald-700",
                                              variance.type === 'DELAYED' && "bg-rose-600 border border-rose-700",
                                              variance.type === 'EARLY' && "bg-blue-600 border border-blue-700",
                                              variance.type === 'OVERDUE_IN_PROGRESS' && "bg-rose-700 border border-rose-800",
                                              variance.type === 'IN_PROGRESS' && "bg-amber-600 border border-amber-700",
                                              variance.type === 'OVERDUE_START' && "bg-amber-500 border border-amber-600",
                                              variance.type === 'WAITING' && "bg-slate-400 border border-slate-500"
                                            )}
                                            style={{
                                              top: density === 'compact' ? '20px' : '23px',
                                              left: `calc(${(actualOffset.clampedStart / lookaheadDays) * 100}% + 1px)`,
                                              width: `calc(${(actualOffset.spannedDays / lookaheadDays) * 100}% - 2px)`
                                            }}
                                          >
                                            <div className="flex items-center gap-1 truncate">
                                              {actualOffset.startsBefore && <span className="text-[7.5px] opacity-70">◀</span>}
                                              <span className="truncate">
                                                🅰️ {format(actualOffset.aStart, 'dd/MM')}{isSameDay(actualOffset.aStart, actualOffset.aEnd) ? '' : `-${format(actualOffset.aEnd, 'dd/MM')}`}
                                              </span>
                                            </div>
                                            {actualOffset.endsAfter && <span className="text-[7.5px] opacity-70">▶</span>}
                                          </div>
                                        ) : (
                                          planOffset?.inView && (
                                            <div
                                              className={cn(
                                                "absolute rounded px-1 flex items-center font-medium border border-dashed border-slate-300 bg-slate-50/80 text-slate-400 overflow-hidden z-10",
                                                density === 'compact' ? "h-[16px] text-[7.5px]" : "h-[18px] text-[8.5px]"
                                              )}
                                              style={{
                                                top: density === 'compact' ? '20px' : '23px',
                                                left: `calc(${(planOffset.clampedStart / lookaheadDays) * 100}% + 1px)`,
                                                width: `calc(${(planOffset.spannedDays / lookaheadDays) * 100}% - 2px)`
                                              }}
                                            >
                                              <span className="truncate">⏳ ยังไม่บันทึกเริ่มงาน</span>
                                            </div>
                                          )
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>

              {/* Document Sign-off Footer (Appears ONCE at the end of the document on the last page) */}
              {includeSignatures && (
                <div className="signature-section mt-4 pt-3 border-t-2 border-slate-300" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="signature-grid flex justify-between gap-6 pt-2 text-center text-slate-700">
                    <div className="signature-col flex-1 border-t border-slate-400 pt-1">
                      <div className="text-xs font-bold text-slate-900">ผู้จัดทำแผนงาน (Planner)</div>
                      <div className="text-[10px] text-slate-700 font-semibold mt-0.5">คุณพรทิพย์ บูรณ์รัตน์ธรรม (PLPTB1234)</div>
                      <div className="text-[9.5px] text-slate-400 mt-1">วันที่: ..... / ..... / ..........</div>
                    </div>

                    <div className="signature-col flex-1 border-t border-slate-400 pt-1">
                      <div className="text-xs font-bold text-slate-900">หัวหน้าฝ่ายผลิต / ผู้รับมอบแผน</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">(...................................................)</div>
                      <div className="text-[9.5px] text-slate-400 mt-1">วันที่: ..... / ..... / ..........</div>
                    </div>

                    <div className="signature-col flex-1 border-t border-slate-400 pt-1">
                      <div className="text-xs font-bold text-slate-900">ฝ่ายประกันคุณภาพ (QA) / ผู้อำนวยการโรงงาน</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">(...................................................)</div>
                      <div className="text-[9.5px] text-slate-400 mt-1">วันที่: ..... / ..... / ..........</div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 mt-3 italic">
                    * หมายเหตุ: แผนผังกำหนดการผลิตนี้สร้างจากระบบ CosmeFlow OS อาจมีการปรับเปลี่ยนวันตามผลการตรวจแล็บและสถานการณ์หน้างานจริง *
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="pt-3 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="toggle-signatures"
                checked={includeSignatures}
                onChange={e => setIncludeSignatures(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="toggle-signatures" className="cursor-pointer font-medium select-none">
                แสดงช่องลงนามอนุมัติ (Sign-off Box) ท้ายเอกสาร
              </label>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
              ปิดหน้าต่าง
            </Button>

            <Button
              size="sm"
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={handlePrint}
              disabled={filteredPrintData.length === 0}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              พิมพ์ / บันทึกเป็น PDF (A4 แนวนอน)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
