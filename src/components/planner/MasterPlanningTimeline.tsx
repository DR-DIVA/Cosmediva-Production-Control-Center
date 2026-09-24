'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Printer,
  TrendingUp,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  X,
  Loader2,
  Lock,
  GripVertical,
  Pin,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react'
import { format, differenceInDays, startOfDay, addDays, isSameDay } from 'date-fns'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { cn, getBaseOrderType } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TimelinePrintModal } from '@/components/planner/TimelinePrintModal'
import {
  PLAN_CHANGE_CATEGORIES,
  parsePlanChangeInfo,
  formatPlanChangeNote,
  cleanDisplayNote,
  extractUserComment,
  isTaskStartedByShopfloor,
  isTaskCompleted,
  canResetStartedTask,
  ACTUAL_DELAY_CATEGORIES,
  parseActualDelayInfo,
  formatActualDelayNote,
  ActualDelayInfo
} from '@/lib/planTracking'

export type ProductionDept = 'ALL' | 'RM' | 'MX' | 'PK' | 'POF'

export function getProcessDept(processName?: string): 'RM' | 'MX' | 'PK' | 'POF' | 'OTHER' {
  if (!processName) return 'OTHER'
  const p = processName.toLowerCase().trim()

  // 1. POF / Cartoning (check before general packing so POF / ลงลัง isn't captured by packing terms)
  if (
    p.includes('pof') ||
    p.includes('อุโมงค์') ||
    p.includes('ลงลัง') ||
    p.includes('fg') ||
    p.includes('ส่งมอบ')
  ) {
    return 'POF'
  }

  // 2. Weighing / RM
  if (p.includes('ชั่ง') || p.includes('weigh')) {
    return 'RM'
  }

  // 3. Mixing / MX
  if (
    p.includes('ผสม') ||
    p.includes('mix') ||
    p.includes('แช่') ||
    p.includes('bulk') ||
    p.includes('พักสาร') ||
    p === 'เก็บ'
  ) {
    return 'MX'
  }

  // 4. Packing / PK
  if (
    p.includes('บรรจุ') ||
    p.includes('pack') ||
    p.includes('qc') ||
    p.includes('ไลน์') ||
    p.includes('ยิง') ||
    p.includes('สติ๊กเกอร์') ||
    p.includes('กล่อง') ||
    p.includes('ขวด') ||
    p.includes('กระปุก')
  ) {
    return 'PK'
  }

  return 'OTHER'
}

export function isProcessInDept(processName: string | undefined, dept: ProductionDept): boolean {
  if (dept === 'ALL') return true
  return getProcessDept(processName) === dept
}

export interface MasterPlanningTimelineProps {
  initialDept?: ProductionDept
  lockDept?: boolean
  initialOrderType?: 'ALL' | 'MTS' | 'MTO'
  initialViewMode?: 'plan' | 'actual' | 'compare'
  currentUser?: string
  currentUserId?: string
  canEdit?: boolean
  onPlanChanged?: () => void
  lots?: any[]
  logs?: any[]
  processes?: any[]
  hideHeaderKpi?: boolean
}

export const PROCESS_TYPES = [
  { id: 'RM', name: 'ชั่งสาร', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'MX', name: 'ผสม', color: 'bg-[#D4AF37]/20 text-[#4A4238] border-[#D4AF37]/30' },
  { id: 'PK', name: 'บรรจุ', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'POF', name: 'ลงลัง/POF', color: 'bg-purple-100 text-purple-800 border-purple-200' }
]

export function MasterPlanningTimeline({
  initialDept = 'ALL',
  lockDept: lockDeptProp,
  initialOrderType = 'ALL',
  initialViewMode = 'plan',
  currentUser = 'PLPTB1234',
  currentUserId,
  canEdit = true,
  onPlanChanged,
  lots: lotsProp,
  logs: logsProp,
  processes: processesProp,
  hideHeaderKpi = false
}: MasterPlanningTimelineProps) {
  const supabase = useMemo(() => createClient(), [])

  // When lockDept is true or initialDept is given and not 'ALL', lock department switching for station view
  const lockDept = lockDeptProp !== undefined ? lockDeptProp : (initialDept !== 'ALL')

  // Local state for fetched data (if props not provided)
  const [internalLots, setInternalLots] = useState<any[]>([])
  const [internalLogs, setInternalLogs] = useState<any[]>([])
  const [internalProcesses, setInternalProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Current active user
  const [activeUserId, setActiveUserId] = useState<string | undefined>(currentUserId)
  const [activeUserIdentifier, setActiveUserIdentifier] = useState<string>(currentUser)

  // Filtering & View Controls
  const [filterDept, setFilterDept] = useState<ProductionDept>(initialDept)
  const [filterOrderType, setFilterOrderType] = useState<'ALL' | 'MTS' | 'MTO'>(initialOrderType)
  const [searchQuery, setSearchQuery] = useState('')
  const [showShopfloorHandovers, setShowShopfloorHandovers] = useState(false)

  // Sync filterDept if initialDept prop updates
  useEffect(() => {
    setFilterDept(initialDept)
  }, [initialDept])

  // Timeline Navigation & Mode
  const [timelineViewMode, setTimelineViewMode] = useState<'plan' | 'actual' | 'compare'>(initialViewMode)
  const [timelineRangeMode, setTimelineRangeMode] = useState<'auto' | '15_centered' | '21_extended' | '14_future' | '14_past'>('auto')
  const [timelineOffsetDays, setTimelineOffsetDays] = useState<number>(0)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false)
  const [isFitScreen, setIsFitScreen] = useState<boolean>(true)
  const [isKpiCollapsed, setIsKpiCollapsed] = useState<boolean>(false)

  // Modals & Sliding Reschedule
  const [isTimelinePrintOpen, setIsTimelinePrintOpen] = useState(false)
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean
    logId: string
    lotNo: string
    sku: string
    processName: string
    originalDate: string
    newDate: string
    newEndDate?: string
    field: string
    category: string
    reason: string
    currentNote: string
    revisionCount: number
    isSlideDrag?: boolean
    deltaDays?: number
    isStartedOverride?: boolean
  } | null>(null)

  // Actual Delay Modal State (สำหรับหน้างานบันทึกเหตุผลการทำงานจริงล่าช้ากว่าแผน - ไม่มีการล็อกแถบ A)
  const [actualDelayModal, setActualDelayModal] = useState<{
    isOpen: boolean
    logId: string
    lotNo: string
    sku: string
    processName: string
    deptKey: string
    planDateStr: string
    actualDateStr: string
    varianceLabel: string
    varianceDays: number
    isDelayed: boolean
    category: string
    reason: string
    actualStartDate: string
    actualEndDate: string
    status: string
    existingDelayInfo?: ActualDelayInfo
  } | null>(null)

  // Sliding Drag State for Timeline Bars
  const [dragState, setDragState] = useState<{
    logId: string
    startX: number
    pStart: Date
    pEnd: Date
    durationDays: number
    deltaDays: number
    containerWidth: number
  } | null>(null)

  // Detect user if not passed
  useEffect(() => {
    async function loadUser() {
      if (currentUserId && currentUser) return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setActiveUserId(user.id)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          const empId = profile?.employee_id || user.user_metadata?.employee_id || user.email?.split('@')[0] || 'USER'
          setActiveUserIdentifier(empId.toUpperCase())
        }
      } catch (e) {
        console.error('Error fetching user in MasterPlanningTimeline:', e)
      }
    }
    loadUser()
  }, [supabase, currentUserId, currentUser])

  // Fetch internal data if props are not supplied
  const fetchInternalData = useCallback(async () => {
    if (lotsProp && logsProp && processesProp) return
    setLoading(true)
    try {
      const [lotsRes, processesRes, logsRes] = await Promise.all([
        supabase.from('production_lots').select('*, products(sku)').order('created_at', { ascending: false }),
        supabase.from('processes').select('*').order('process_name'),
        supabase.from('production_logs').select('*, processes(process_name)').order('created_at', { ascending: true })
      ])

      if (lotsRes.data) setInternalLots(lotsRes.data)
      if (processesRes.data) setInternalProcesses(processesRes.data)
      if (logsRes.data) setInternalLogs(logsRes.data)
    } catch (err: any) {
      console.error('MasterPlanningTimeline fetch error:', err)
      toast.error('ไม่สามารถโหลดข้อมูลไทม์ไลน์ได้: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, lotsProp, logsProp, processesProp])

  useEffect(() => {
    fetchInternalData()
  }, [fetchInternalData])

  // Use props if provided, otherwise internal state
  const lots = lotsProp || internalLots
  const logs = logsProp || internalLogs
  const processes = processesProp || internalProcesses

  const today = useMemo(() => startOfDay(new Date()), [])

  // Time horizon calculation
  const { timelinePastDays, timelineFutureDays, totalTimelineDays } = useMemo(() => {
    if (timelineRangeMode === '15_centered') {
      return { timelinePastDays: 7, timelineFutureDays: 7, totalTimelineDays: 15 }
    }
    if (timelineRangeMode === '21_extended') {
      return { timelinePastDays: 7, timelineFutureDays: 13, totalTimelineDays: 21 }
    }
    if (timelineRangeMode === '14_future') {
      return { timelinePastDays: 0, timelineFutureDays: 13, totalTimelineDays: 14 }
    }
    if (timelineRangeMode === '14_past') {
      return { timelinePastDays: 13, timelineFutureDays: 0, totalTimelineDays: 14 }
    }

    // Default 'auto'
    if (timelineViewMode === 'plan') {
      return { timelinePastDays: 0, timelineFutureDays: 13, totalTimelineDays: 14 }
    }
    if (timelineViewMode === 'actual') {
      return { timelinePastDays: 13, timelineFutureDays: 0, totalTimelineDays: 14 }
    }
    return { timelinePastDays: 7, timelineFutureDays: 7, totalTimelineDays: 15 }
  }, [timelineRangeMode, timelineViewMode])

  const timelineStartDate = useMemo(() => {
    return addDays(today, -timelinePastDays + timelineOffsetDays)
  }, [today, timelinePastDays, timelineOffsetDays])

  const timelineDates = useMemo(() => {
    return Array.from({ length: totalTimelineDays }).map((_, i) => addDays(timelineStartDate, i))
  }, [timelineStartDate, totalTimelineDays])

  const isHandoverProcess = (processName?: string) => {
    if (!processName) return false
    const p = processName.trim()
    return (
      p.includes('รอ QC ตรวจปล่อย') ||
      p.includes('รอ POF') ||
      p.includes('รอเข้าคลัง FG') ||
      p.includes('ลงลัง')
    )
  }

  // Schedule Adherence KPI Calculations
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
      const pName = process?.process_name || log.processes?.process_name || ''
      const deptCode = getProcessDept(pName)

      let deptKey: 'RM' | 'MX' | 'PK' | null = null
      if (deptCode === 'RM') deptKey = 'RM'
      else if (deptCode === 'MX') deptKey = 'MX'
      else if (deptCode === 'PK' || deptCode === 'POF') deptKey = 'PK'

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

            const actualDelay = parseActualDelayInfo(log.note)
            const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
            const noteLower = (log.note || '').toLowerCase()

            if (actualDelay.hasDelayReason && actualDelay.category) {
              const cat = actualDelay.category
              if (bottleneckCounts[cat] !== undefined) {
                bottleneckCounts[cat]++
              } else if (cat === 'CLEANING_CHANGEOVER' || cat === 'MANPOWER_SHORTAGE') {
                bottleneckCounts.FLOOR_DOWNTIME++
              } else if (cat === 'PREVIOUS_TASK_DELAY') {
                bottleneckCounts.PLAN_CALIBRATION++
              } else if (cat === 'REWORK_ADJUST') {
                bottleneckCounts.QC_WAIT++
              } else {
                bottleneckCounts.FLOOR_DOWNTIME++
              }
            } else if (noteLower.includes('qc hold') || noteLower.includes('รอ qc') || noteLower.includes('แล็บ')) {
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
      FLOOR_DOWNTIME: '⚙️ หน้างานขัดข้อง / ชะลอผลิต',
      WAIT_RM_PM: '📦 รอวัตถุดิบ / บรรจุภัณฑ์',
      QC_WAIT: '🔬 รอผลตรวจแล็บ QC ปล่อยผ่าน',
      RUSH_ORDER_INSERT: '⚡ แทรกงานด่วนลูกค้า',
      PLAN_CALIBRATION: '📋 การปรับแผนงานปกติ',
      CUSTOMER_RESCHEDULE: '👤 ลูกค้าขอเลื่อนวัน',
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
          return `${bottleneckLabels[k]?.split(' ')[1] || k} ${pct}%`
        }).join(' • ')
      : 'ทุกสายงานดำเนินงานตามแผน'

    return {
      totalPlanned,
      totalCompleted,
      totalOnTime,
      totalDelayed,
      totalEarly,
      overallAccuracy,
      avgDelay,
      topBottleneckText,
      bottleneckSummaryText,
      deptStats: {
        RM: { ...deptStats.RM, accuracy: rmAccuracy },
        MX: { ...deptStats.MX, accuracy: mxAccuracy },
        PK: { ...deptStats.PK, accuracy: pkAccuracy }
      }
    }
  }, [logs, processes])

  // Filtered Lots for Gantt Display
  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      if (filterOrderType !== 'ALL' && getBaseOrderType(lot.order_type) !== filterOrderType) return false
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const matchesPo = (lot.po_no || '').toLowerCase().includes(q)
        const matchesLot = (lot.lot_no || '').toLowerCase().includes(q)
        const matchesSku = (lot.products?.sku || '').toLowerCase().includes(q)
        if (!matchesPo && !matchesLot && !matchesSku) return false
      }
      return true
    })
  }, [lots, filterOrderType, searchQuery])

  const getSortedLotLogs = useCallback((lotId: string, includeHandovers: boolean = showShopfloorHandovers) => {
    return logs
      .filter(l => {
        if (l.production_lot_id !== lotId) return false
        const process = processes.find(p => p.id === l.process_id)
        const pName = process?.process_name || l.processes?.process_name || ''

        // Strict department filter: only include tasks for the selected department
        if (!isProcessInDept(pName, filterDept)) return false

        if (!includeHandovers && isHandoverProcess(pName)) return false
        return true
      })
      .sort((a, b) => {
        const processA = processes.find(p => p.id === a.process_id)?.process_name || ''
        const processB = processes.find(p => p.id === b.process_id)?.process_name || ''
        const orderMap: Record<string, number> = { 'ชั่งสาร': 1, 'ผสม': 2, 'บรรจุ': 3, 'ลงลัง': 4 }
        const weightA = orderMap[processA] || 99
        const weightB = orderMap[processB] || 99
        if (weightA !== weightB) return weightA - weightB
        const tA = a.tank_start === null || a.tank_start === undefined ? 9999 : a.tank_start
        const tB = b.tank_start === null || b.tank_start === undefined ? 9999 : b.tank_start
        if (tA !== tB) return tA - tB
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeA - timeB
      })
  }, [logs, processes, showShopfloorHandovers, filterDept])

  // Check if a production log has a bar within the active timeline window
  const checkLogHasInView = useCallback((log: any): boolean => {
    const timelineStart = timelineStartDate
    const totalDays = totalTimelineDays

    let hasPlanInView = false
    if (log.activity_date) {
      const pStart = startOfDay(new Date(log.activity_date))
      const pEnd = log.end_date ? startOfDay(new Date(log.end_date)) : pStart
      const startDiff = differenceInDays(pStart, timelineStart)
      const duration = differenceInDays(pEnd, pStart) + 1
      const endDiff = startDiff + duration - 1
      if (endDiff >= 0 && startDiff < totalDays) {
        hasPlanInView = true
      }
    }

    let hasActualInView = false
    if (log.start_time || log.status === 'DONE') {
      const aStart = log.start_time
        ? startOfDay(new Date(log.start_time))
        : (log.activity_date ? startOfDay(new Date(log.activity_date)) : startOfDay(new Date(log.created_at)))
      let aEnd = aStart
      if (log.end_time) {
        aEnd = startOfDay(new Date(log.end_time))
      } else if (log.status === 'DONE') {
        aEnd = log.updated_at ? startOfDay(new Date(log.updated_at)) : aStart
      } else if (log.status === 'IN_PROGRESS') {
        aEnd = today
      }
      const startDiff = differenceInDays(aStart, timelineStart)
      const duration = differenceInDays(aEnd, aStart) + 1
      const endDiff = startDiff + duration - 1
      if (endDiff >= 0 && startDiff < totalDays) {
        hasActualInView = true
      }
    }

    if (timelineViewMode === 'plan') return hasPlanInView
    if (timelineViewMode === 'actual') return hasActualInView
    return hasPlanInView || hasActualInView
  }, [timelineStartDate, totalTimelineDays, timelineViewMode, today])

  // Filter lots so that ONLY lots with at least one visible task row in the current timeframe are displayed
  const lotsWithVisibleTasks = useMemo(() => {
    return filteredLots
      .map(lot => {
        const lotLogs = getSortedLotLogs(lot.id)
        const visibleLogs = lotLogs.filter(checkLogHasInView)
        return {
          lot,
          visibleLogs
        }
      })
      .filter(item => item.visibleLogs.length > 0)
  }, [filteredLots, getSortedLotLogs, checkLogHasInView])

  // Open Reschedule Modal
  const handleOpenRescheduleDetail = (log: any, lot: any, process: any) => {
    if (!canEdit) {
      toast.info('คุณอยู่ในโหมดดูอย่างเดียว ไม่สามารถปรับเลื่อนแผนได้')
      return
    }
    if (isTaskCompleted(log)) {
      toast.info(`คิวงานนี้หน้างาน${process?.process_name || ''}ดำเนินการเสร็จสิ้นแล้ว (${log.status})`)
      return
    }
    const isStarted = isTaskStartedByShopfloor(log)
    const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
    setRescheduleModal({
      isOpen: true,
      logId: log.id,
      lotNo: lot?.lot_no || '-',
      sku: lot?.products?.sku || lot?.products?.product_name || '-',
      processName: process?.process_name || 'งานผลิต',
      originalDate: planInfo.originalDate || log.activity_date || '',
      newDate: log.activity_date || '',
      field: 'activity_date',
      category: isStarted ? (planInfo.category || 'SHOPFLOOR_HOLD') : (planInfo.category || 'WAIT_RM_PM'),
      reason: planInfo.reason ? cleanDisplayNote(planInfo.reason) : '',
      currentNote: extractUserComment(log.note),
      revisionCount: planInfo.revisionCount || 1,
      isStartedOverride: isStarted
    })
  }

  // Sliding Bar Period Pointer Down Handler
  const handleBarPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    log: any,
    lot: any,
    process: any,
    planData: { start: Date; end: Date; leftPercent: number; widthPercent: number }
  ) => {
    if (!canEdit) return
    if (isTaskCompleted(log)) {
      toast.info(`คิวงานนี้หน้างาน${process?.process_name || ''}ดำเนินการเสร็จสิ้นแล้ว (${log.status}) ไม่อนุญาตให้ปรับเลื่อนแถบแผน`)
      return
    }

    // Only respond to primary mouse button (0) or touch/pen
    if (e.button !== 0) return

    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const containerEl = e.currentTarget.parentElement
    const containerWidth = containerEl?.getBoundingClientRect().width || 1
    const totalDays = totalTimelineDays || 14
    const dayWidth = containerWidth / totalDays

    const pStart = planData.start
    const pEnd = planData.end
    const durationDays = differenceInDays(pEnd, pStart)

    let currentDeltaDays = 0

    setDragState({
      logId: log.id,
      startX,
      pStart,
      pEnd,
      durationDays,
      deltaDays: 0,
      containerWidth
    })

    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX
      const snappedDelta = Math.round(deltaX / dayWidth)
      currentDeltaDays = snappedDelta
      setDragState(prev => prev ? { ...prev, deltaDays: snappedDelta } : null)
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      setDragState(null)

      if (currentDeltaDays === 0) {
        // Simple click without sliding: open standard reschedule modal
        handleOpenRescheduleDetail(log, lot, process)
      } else {
        // Dragged/Slid by delta days: open reschedule modal with slide prefill and required reason
        const newStartDate = addDays(pStart, currentDeltaDays)
        const newEndDate = addDays(pEnd, currentDeltaDays)
        const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)

        setRescheduleModal({
          isOpen: true,
          logId: log.id,
          lotNo: lot?.lot_no || '-',
          sku: lot?.products?.sku || lot?.products?.product_name || '-',
          processName: process?.process_name || 'งานผลิต',
          originalDate: planInfo.originalDate || log.activity_date || '',
          newDate: format(newStartDate, 'yyyy-MM-dd'),
          newEndDate: format(newEndDate, 'yyyy-MM-dd'),
          field: 'activity_date',
          category: isTaskStartedByShopfloor(log) ? (planInfo.category || 'SHOPFLOOR_HOLD') : (planInfo.category || 'WAIT_RM_PM'),
          reason: '',
          currentNote: extractUserComment(log.note),
          revisionCount: (planInfo.revisionCount || 0) + 1,
          isSlideDrag: true,
          deltaDays: currentDeltaDays,
          isStartedOverride: isTaskStartedByShopfloor(log)
        })
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  // Save Reschedule Confirmation
  const handleConfirmReschedule = async () => {
    if (!rescheduleModal) return
    const { logId, field, newDate, newEndDate, originalDate, category, reason, currentNote, revisionCount, isSlideDrag, isStartedOverride } = rescheduleModal

    const existingLog = logs.find(l => l.id === logId)
    if (existingLog && isTaskCompleted(existingLog)) {
      toast.error('ไม่อนุญาตให้ปรับเลื่อนแผนงาน เนื่องจากหน้างานผลิตเสร็จสิ้นแล้ว')
      setRescheduleModal(null)
      return
    }

    if ((isSlideDrag || isStartedOverride) && !reason.trim()) {
      toast.error('กรุณาระบุรายละเอียดเหตุผลในการเลื่อนแผนงาน')
      return
    }

    const userIdentifier = (activeUserIdentifier || 'PLANNER').toUpperCase()

    const formattedNote = formatPlanChangeNote(currentNote, {
      originalDate,
      revisedDate: newDate,
      category,
      reason,
      updatedBy: userIdentifier,
      revisionCount
    })

    const updateData: any = {
      [field]: newDate,
      note: formattedNote,
      updated_at: new Date().toISOString(),
      updated_by: activeUserId || '54168226-988e-4d63-93d2-1a742aafdd84'
    }

    if (newEndDate) {
      updateData.end_date = newEndDate
    } else if (field === 'activity_date' && existingLog && (!existingLog.end_date || existingLog.end_date === existingLog.activity_date)) {
      updateData.end_date = newDate
    }

    // Optimistic update
    if (internalLogs.length > 0) {
      setInternalLogs(prev => prev.map(l => l.id === logId ? { ...l, ...updateData } : l))
    }
    setRescheduleModal(null)

    try {
      const { error } = await supabase.from('production_logs').update(updateData).eq('id', logId)
      if (error) throw error
      toast.success('บันทึกการปรับเลื่อนแผนงานเรียบร้อย')
      if (onPlanChanged) onPlanChanged()
      else fetchInternalData()
    } catch (e: any) {
      toast.error('อัปเดตไม่สำเร็จ: ' + e.message)
      if (onPlanChanged) onPlanChanged()
      else fetchInternalData()
    }
  }

  const handleQuickRescheduleWithoutReason = async () => {
    if (!rescheduleModal) return
    const { logId, field, newDate, isStartedOverride, isSlideDrag } = rescheduleModal
    if (isStartedOverride || isSlideDrag) {
      toast.warning('งานที่เริ่มดำเนินการแล้ว บังคับต้องระบุเหตุผลในการขยับแผน')
      return
    }
    const existingLog = logs.find(l => l.id === logId)
    if (existingLog && isTaskStartedByShopfloor(existingLog)) {
      toast.error('ไม่อนุญาตให้ปรับเลื่อนแผนงานโดยไม่ระบุเหตุผล เนื่องจากหน้างานเริ่มงานแล้ว')
      setRescheduleModal(null)
      return
    }
    setRescheduleModal(null)

    const updateData: any = {
      [field]: newDate,
      updated_at: new Date().toISOString(),
      updated_by: activeUserId || '54168226-988e-4d63-93d2-1a742aafdd84'
    }

    if (field === 'activity_date' && existingLog && (!existingLog.end_date || existingLog.end_date === existingLog.activity_date)) {
      updateData.end_date = newDate
    }

    if (internalLogs.length > 0) {
      setInternalLogs(prev => prev.map(l => l.id === logId ? { ...l, ...updateData } : l))
    }

    try {
      const { error } = await supabase.from('production_logs').update(updateData).eq('id', logId)
      if (error) throw error
      toast.success('ปรับวันที่เรียบร้อย')
      if (onPlanChanged) onPlanChanged()
      else fetchInternalData()
    } catch (e: any) {
      toast.error('อัปเดตไม่สำเร็จ: ' + e.message)
      if (onPlanChanged) onPlanChanged()
      else fetchInternalData()
    }
  }

  // Open Actual Delay Modal (สำหรับพนักงานหน้างานบันทึกเหตุผลที่ทำงานจริงล่าช้ากว่าแผน - ไม่มีการล็อกแถบ A)
  const handleOpenActualDelayModal = (log: any, lot: any, process: any, variance?: any) => {
    const pStart = log.activity_date ? format(new Date(log.activity_date), 'dd/MM/yyyy') : '-'
    const pEnd = log.end_date ? format(new Date(log.end_date), 'dd/MM/yyyy') : pStart
    const planDateStr = pEnd !== pStart ? `${pStart} ถึง ${pEnd}` : pStart

    let aStartStr = '-'
    let actualStartDate = ''
    if (log.start_time) {
      actualStartDate = format(new Date(log.start_time), 'yyyy-MM-dd')
      aStartStr = format(new Date(log.start_time), 'dd/MM/yyyy')
    } else if (log.activity_date) {
      actualStartDate = log.activity_date
      aStartStr = format(new Date(log.activity_date), 'dd/MM/yyyy')
    }

    let aEndStr = log.status === 'DONE' ? aStartStr : (log.status === 'IN_PROGRESS' ? '(กำลังผลิต)' : '(ยังไม่เริ่ม)')
    let actualEndDate = ''
    if (log.end_time) {
      actualEndDate = format(new Date(log.end_time), 'yyyy-MM-dd')
      aEndStr = format(new Date(log.end_time), 'dd/MM/yyyy')
    }

    const actualDateStr = `${aStartStr}${log.end_time ? ` ถึง ${aEndStr}` : ` ${aEndStr}`}`
    const existingDelay = parseActualDelayInfo(log.note)
    const deptKey = getProcessDept(process?.process_name || '')

    setActualDelayModal({
      isOpen: true,
      logId: log.id,
      lotNo: lot?.lot_no || '-',
      sku: lot?.products?.sku || lot?.products?.product_name || '-',
      processName: process?.process_name || 'งานผลิต',
      deptKey,
      planDateStr,
      actualDateStr,
      varianceLabel: variance?.label || (log.status === 'DONE' ? 'เสร็จสิ้น' : 'กำลังดำเนินการ'),
      varianceDays: variance?.diffDays || 0,
      isDelayed: (variance?.diffDays && variance.diffDays > 0) || existingDelay.hasDelayReason,
      category: existingDelay.category || 'WAIT_RM_PM',
      reason: existingDelay.reason || '',
      actualStartDate,
      actualEndDate,
      status: log.status || 'WAITING',
      existingDelayInfo: existingDelay
    })
  }

  // Confirm and Save Actual Delay Reason from Shopfloor
  const handleConfirmActualDelay = async () => {
    if (!actualDelayModal) return
    const { logId, category, reason, actualStartDate, actualEndDate } = actualDelayModal

    if (!reason.trim()) {
      toast.error('กรุณาระบุรายละเอียดเหตุผลที่ทำงานจริงล่าช้ากว่าแผน')
      return
    }

    const existingLog = logs.find(l => l.id === logId)
    const currentNote = existingLog?.note || ''
    const userIdentifier = (activeUserIdentifier || currentUser || 'SHOPFLOOR').toUpperCase()

    const formattedNote = formatActualDelayNote(currentNote, {
      category,
      reason: reason.trim(),
      updatedBy: userIdentifier
    })

    const updateData: any = {
      note: formattedNote,
      updated_at: new Date().toISOString(),
      updated_by: activeUserId || '54168226-988e-4d63-93d2-1a742aafdd84'
    }

    if (actualStartDate) {
      const existingTime = existingLog?.start_time ? new Date(existingLog.start_time).toISOString().slice(11) : '08:00:00.000Z'
      updateData.start_time = `${actualStartDate}T${existingTime}`
    }
    if (actualEndDate && existingLog?.status === 'DONE') {
      const existingTime = existingLog?.end_time ? new Date(existingLog.end_time).toISOString().slice(11) : '17:00:00.000Z'
      updateData.end_time = `${actualEndDate}T${existingTime}`
    }

    if (internalLogs.length > 0) {
      setInternalLogs(prev => prev.map(l => l.id === logId ? { ...l, ...updateData } : l))
    }
    setActualDelayModal(null)

    try {
      const { error } = await supabase.from('production_logs').update(updateData).eq('id', logId)
      if (error) throw error
      toast.success('บันทึกเหตุผลการทำงานจริงล่าช้าเรียบร้อย')
      if (onPlanChanged) onPlanChanged()
      else fetchInternalData()
    } catch (e: any) {
      toast.error('อัปเดตไม่สำเร็จ: ' + e.message)
      if (onPlanChanged) onPlanChanged()
      else fetchInternalData()
    }
  }

  return (
    <div className="space-y-0 bg-white rounded-xl shadow-xs border border-slate-200">
      {/* 1. Schedule Adherence KPI Summary Header */}
      {!hideHeaderKpi && (
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 rounded-t-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>สรุปภาพรวม KPI ความแม่นยำแผนงานผลิต (Schedule Adherence)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsKpiCollapsed(prev => !prev)}
              className="text-[11px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              {isKpiCollapsed ? (
                <>
                  <span>แสดง KPI การผลิต ({scheduleAdherenceStats.overallAccuracy}%)</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>ย่อแถบ KPI</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
          {!isKpiCollapsed && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-1">
              {/* 1. Overall Plan Accuracy */}
              <div className="bg-gradient-to-br from-indigo-50/80 to-white p-2.5 rounded-xl border border-indigo-200 shadow-xs">
                <div className="text-[10.5px] font-bold text-indigo-700 flex items-center justify-between">
                  <span>ความแม่นยำรวม (Accuracy)</span>
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-xl font-black text-indigo-950 mt-1">
                  {scheduleAdherenceStats.overallAccuracy}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ตรงแผน <strong className="text-emerald-700 font-bold">{scheduleAdherenceStats.totalOnTime}</strong> • ล่าช้า <strong className="text-rose-700 font-bold">{scheduleAdherenceStats.totalDelayed}</strong>
                </div>
              </div>

              {/* 2. RM Weighing */}
              <div className="bg-gradient-to-br from-amber-50/80 to-white p-2.5 rounded-xl border border-amber-200 shadow-xs">
                <div className="text-[10.5px] font-bold text-amber-800 flex items-center justify-between">
                  <span>🟡 ฝ่ายชั่งสาร (RM)</span>
                  <span className="text-[10px] font-bold font-mono">{scheduleAdherenceStats.deptStats.RM.accuracy}%</span>
                </div>
                <div className="text-xl font-black text-amber-950 mt-1">
                  {scheduleAdherenceStats.deptStats.RM.accuracy}%
                </div>
                <div className="w-full bg-amber-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${scheduleAdherenceStats.deptStats.RM.accuracy}%` }} />
                </div>
              </div>

              {/* 3. MX Mixing */}
              <div className="bg-gradient-to-br from-blue-50/80 to-white p-2.5 rounded-xl border border-blue-200 shadow-xs">
                <div className="text-[10.5px] font-bold text-blue-800 flex items-center justify-between">
                  <span>🔵 ฝ่ายผสม (MX)</span>
                  <span className="text-[10px] font-bold font-mono">{scheduleAdherenceStats.deptStats.MX.accuracy}%</span>
                </div>
                <div className="text-xl font-black text-blue-950 mt-1">
                  {scheduleAdherenceStats.deptStats.MX.accuracy}%
                </div>
                <div className="w-full bg-blue-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${scheduleAdherenceStats.deptStats.MX.accuracy}%` }} />
                </div>
              </div>

              {/* 4. PK Packing */}
              <div className={cn(
                "p-2.5 rounded-xl border shadow-xs transition-all",
                Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90
                  ? "bg-gradient-to-br from-rose-50/90 to-white border-rose-300 ring-1 ring-rose-200"
                  : "bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200"
              )}>
                <div className={cn(
                  "text-[10.5px] font-bold flex items-center justify-between",
                  Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "text-rose-800" : "text-emerald-800"
                )}>
                  <span>🟣 ฝ่ายบรรจุ/ลงลัง (PK)</span>
                  <span className="text-[10px] font-bold font-mono">{scheduleAdherenceStats.deptStats.PK.accuracy}%</span>
                </div>
                <div className={cn(
                  "text-xl font-black mt-1",
                  Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "text-rose-950" : "text-emerald-950"
                )}>
                  {scheduleAdherenceStats.deptStats.PK.accuracy}%
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "bg-rose-500" : "bg-emerald-500")}
                    style={{ width: `${scheduleAdherenceStats.deptStats.PK.accuracy}%` }}
                  />
                </div>
              </div>

              {/* 5. Average Delay */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                  <span>ความล่าช้าเฉลี่ย</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  +{scheduleAdherenceStats.avgDelay} <span className="text-xs font-normal text-slate-500">วัน</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  เร็วกว่าแผน: <strong className="text-blue-600 font-bold">{scheduleAdherenceStats.totalEarly}</strong> งาน
                </div>
              </div>

              {/* 6. Bottleneck Insights */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                  <span>วิเคราะห์คอขวดสะสม</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-[10.5px] font-bold text-slate-900 mt-1 truncate" title={scheduleAdherenceStats.topBottleneckText}>
                  {scheduleAdherenceStats.topBottleneckText}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5 truncate" title={scheduleAdherenceStats.bottleneckSummaryText}>
                  {scheduleAdherenceStats.bottleneckSummaryText}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Unified Toolbar & Filter Section (Sticky at top below dashboard header) */}
      <div className={cn(
        "px-4 py-3 bg-[#FAF9F6] border-b border-slate-200 space-y-2.5 sticky top-14 z-30 shadow-2xs backdrop-blur-xs transition-all",
        hideHeaderKpi ? "rounded-t-xl" : ""
      )}>
        {/* Row 1: View Modes, Department & Print Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 shrink-0">โหมดมุมมอง:</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setTimelineViewMode('plan')
                  setTimelineOffsetDays(0)
                  setTimelineRangeMode('auto')
                }}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  timelineViewMode === 'plan'
                    ? "bg-white text-indigo-900 shadow-sm font-black ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="ดูแผนงาน: วันนี้อยู่คอลัมน์แรก ดูล่วงหน้า 14 วัน"
              >
                <span>🅿️ แผนงาน (Plan)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineViewMode('actual')
                  setTimelineOffsetDays(0)
                  setTimelineRangeMode('auto')
                }}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  timelineViewMode === 'actual'
                    ? "bg-white text-emerald-900 shadow-sm font-black ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="ดูทำจริง: วันนี้อยู่คอลัมน์สุดท้าย ดูประวัติย้อนหลัง 14 วัน"
              >
                <span>🅰️ ทำจริง (Actual)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineViewMode('compare')
                  setTimelineOffsetDays(0)
                  setTimelineRangeMode('auto')
                }}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  timelineViewMode === 'compare'
                    ? "bg-indigo-600 text-white shadow-sm font-black"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="เปรียบเทียบ P vs A: วันนี้อยู่กึ่งกลาง ดูย้อนหลัง 7 วัน + ล่วงหน้า 7 วัน"
              >
                <span>⚖️ เปรียบเทียบ (Compare P vs A)</span>
                <span className="bg-amber-400 text-amber-950 text-[8.5px] px-1 py-0 rounded font-black">PRO</span>
              </button>
            </div>

            {/* Department Filter */}
            {lockDept ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs ml-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {filterDept === 'RM' && '🟡 แผนกชั่งสาร (Weighing)'}
                  {filterDept === 'MX' && '🔵 แผนกผสม (Mixing)'}
                  {filterDept === 'PK' && '🟢 แผนกบรรจุ (Packing)'}
                  {filterDept === 'POF' && '🟣 แผนกลงลัง/POF'}
                  {filterDept === 'ALL' && 'ทุกสายงาน (All)'}
                </span>
              </div>
            ) : (
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs ml-1">
                <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" /> แผนก:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterDept('ALL')}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    filterDept === 'ALL' ? "bg-[#0B192C] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDept('RM')}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    filterDept === 'RM' ? "bg-amber-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  ชั่งสาร (RM)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDept('MX')}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    filterDept === 'MX' ? "bg-[#B8962A] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  ผสม (MX)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDept('PK')}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    filterDept === 'PK' ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  บรรจุ (PK)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDept('POF')}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    filterDept === 'POF' ? "bg-purple-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  ลงลัง/POF
                </button>
              </div>
            )}
          </div>

          {/* Right Action: Print / PDF Export */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsTimelinePrintOpen(true)}
              className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 rounded-lg cursor-pointer"
              title="คลิกเพื่อเปิดหน้าต่างพิมพ์หรือบันทึกแผนงาน Timeline เป็นเอกสาร PDF (A4 แนวนอน)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / Export PDF (A4 แนวนอน)</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Time Horizon Window, Navigation, Search Box & Handovers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 pb-0.5 text-xs bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
          {/* Horizon Modes */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] font-bold text-slate-700 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              ช่วงเวลา:
            </span>
            <div className="inline-flex bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-medium shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setTimelineRangeMode('auto')
                  setTimelineOffsetDays(0)
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[11px]",
                  timelineRangeMode === 'auto'
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="ปรับตำแหน่งวันนี้อัตโนมัติ: Plan=คอลัมน์แรก, Actual=คอลัมน์สุดท้าย, Compare=กึ่งกลาง"
              >
                <span>
                  ⭐ อัตโนมัติ (
                  {timelineViewMode === 'plan' && 'วันนี้อยู่คอลัมน์แรก'}
                  {timelineViewMode === 'actual' && 'วันนี้อยู่คอลัมน์สุดท้าย'}
                  {timelineViewMode === 'compare' && 'วันนี้อยู่กึ่งกลาง'}
                  )
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineRangeMode('15_centered')
                  setTimelineOffsetDays(0)
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[11px]",
                  timelineRangeMode === '15_centered'
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="15 วัน (ย้อนหลัง 7 วัน + วันนี้ตรงกลาง + ล่วงหน้า 7 วัน)"
              >
                <span>15 วัน (กึ่งกลาง)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineRangeMode('14_past')
                  setTimelineOffsetDays(0)
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[11px]",
                  timelineRangeMode === '14_past'
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="ย้อนหลัง 14 วันจนถึงวันนี้ (วันนี้อยู่คอลัมน์สุดท้าย)"
              >
                <span>14 วันย้อนหลัง</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineRangeMode('14_future')
                  setTimelineOffsetDays(0)
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[11px]",
                  timelineRangeMode === '14_future'
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="วันนี้ไปข้างหน้า 14 วัน (วันนี้อยู่คอลัมน์แรก)"
              >
                <span>14 วันล่วงหน้า</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimelineRangeMode('21_extended')
                  setTimelineOffsetDays(0)
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer text-[11px]",
                  timelineRangeMode === '21_extended'
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
                title="ย้อนหลัง 7 วัน + วันนี้ + ล่วงหน้า 13 วัน (รวม 21 วัน)"
              >
                <span>21 วัน</span>
              </button>
            </div>
          </div>

          {/* Navigation Step & Today Center Button */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTimelineOffsetDays(prev => prev - 7)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="เลื่อนย้อนหลัง 7 วัน"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>7 วันก่อน</span>
            </button>

            <button
              type="button"
              onClick={() => setTimelineOffsetDays(0)}
              className={cn(
                "px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer",
                timelineOffsetDays === 0
                  ? (timelineViewMode === 'actual'
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-300"
                      : timelineViewMode === 'plan'
                      ? "bg-indigo-100 text-indigo-900 border-indigo-300 ring-1 ring-indigo-300"
                      : "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-300")
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              title="รีเซ็ตกลับมาที่วันปัจจุบัน (วันนี้)"
            >
              <span>
                📍 วันนี้
                {timelineOffsetDays === 0 && (
                  <span className="ml-1 text-[9.5px] opacity-80 font-normal">
                    ({timelineViewMode === 'plan' ? 'คอลัมน์แรก' : timelineViewMode === 'actual' ? 'คอลัมน์สุดท้าย' : 'กึ่งกลาง'})
                  </span>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimelineOffsetDays(prev => prev + 7)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="เลื่อนไปข้างหน้า 7 วัน"
            >
              <span>7 วันถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Expand / Collapse Text Width Toggle */}
            <button
              type="button"
              onClick={() => setIsTimelineExpanded(prev => !prev)}
              className={cn(
                "px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ml-1",
                isTimelineExpanded
                  ? "bg-[#0B192C] text-amber-300 border-slate-800 ring-1 ring-amber-400/40"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              title={isTimelineExpanded ? "คลิกเพื่อกลับสู่ขนาดปกติ" : "คลิกเพื่อขยายช่องตารางให้อ่านข้อความบนแถบงานได้เต็มชัดเจน ไม่ถูกตัด"}
            >
              {isTimelineExpanded ? <EyeOff className="w-3.5 h-3.5 text-amber-300" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isTimelineExpanded ? 'ย่อมุมมอง' : 'ขยายข้อความเต็ม'}</span>
            </button>

            {/* Fit Screen / Full Height Toggle (Pin Table Headers) */}
            <button
              type="button"
              onClick={() => setIsFitScreen(prev => !prev)}
              className={cn(
                "px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ml-1",
                isFitScreen
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold ring-1 ring-indigo-200"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
              title={isFitScreen ? "คลิกเพื่อปลดการล็อกความสูง (ขยายตารางเต็มความยาว)" : "คลิกเพื่อตรึงแนวหัวตารางและล็อกความสูงตารางพอดีหน้าจอ"}
            >
              <Pin className={cn("w-3.5 h-3.5", isFitScreen ? "text-indigo-600 fill-indigo-600/30" : "text-slate-500")} />
              <span>{isFitScreen ? 'ตรึงหัวตาราง (พอดีจอ)' : 'ขยายความสูงเต็ม'}</span>
            </button>

            {/* Quick SKU/LOT Search Box in Timeline */}
            <div className="relative ml-1 w-36 sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
              <Input
                placeholder="ค้นหา SKU / Lot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-6 h-7 text-xs bg-white rounded-lg border-slate-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-[11px] font-mono text-slate-600 font-semibold ml-1.5 px-2 py-0.5 rounded bg-white border border-slate-200 hidden xl:inline">
              {format(timelineDates[0], 'dd MMM yyyy')} - {format(timelineDates[timelineDates.length - 1], 'dd MMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Gantt Timeline Matrix */}
      <div className={cn(
        "rounded-b-xl transition-all duration-200 relative",
        isFitScreen
          ? (hideHeaderKpi || isKpiCollapsed 
              ? "overflow-auto min-h-[460px] max-h-[calc(100vh-210px)]" 
              : "overflow-auto min-h-[460px] max-h-[calc(100vh-325px)]")
          : "overflow-x-auto min-h-[500px] max-h-none"
      )}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm">กำลังโหลดข้อมูลไทม์ไลน์...</p>
          </div>
        ) : (
          <div className={cn(
            "relative transition-all duration-200",
            isTimelineExpanded ? "min-w-[1850px]" : "min-w-[1200px]"
          )}>
            {/* Timeline Date Headers */}
            <div className="flex border-b border-slate-200 bg-[#F8F6F0] sticky top-0 z-30 shadow-[0_1px_0_0_#e2e8f0]">
              <div className="w-[260px] shrink-0 p-3 font-semibold text-sm border-r border-slate-200 sticky left-0 top-0 bg-[#F8F6F0] z-40 shadow-[1px_1px_0_0_#e2e8f0] flex items-center justify-between">
                <span>Project / Task {timelineViewMode === 'compare' ? '(P vs A)' : ''}</span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-white/80 text-slate-600 border-slate-300">
                  {lotsWithVisibleTasks.length} Lots
                </Badge>
              </div>
              <div className="flex flex-1">
                {timelineDates.map((date, i) => {
                  const isToday = isSameDay(date, today)
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 p-2 text-center border-r border-slate-200 text-xs transition-all",
                        isTimelineExpanded ? "min-w-[100px]" : "min-w-[60px]",
                        isToday && (
                          timelineViewMode === 'plan'
                            ? "bg-indigo-100/90 border-x-2 border-x-indigo-500 shadow-inner"
                            : timelineViewMode === 'actual'
                            ? "bg-emerald-100/90 border-x-2 border-x-emerald-500 shadow-inner"
                            : "bg-amber-100/90 border-x-2 border-x-amber-500 shadow-inner"
                        )
                      )}
                    >
                      <div className={cn(
                        "font-medium flex items-center justify-center gap-1",
                        isToday
                          ? (timelineViewMode === 'plan'
                              ? "text-indigo-950 font-black"
                              : timelineViewMode === 'actual'
                              ? "text-emerald-950 font-black"
                              : "text-amber-950 font-black")
                          : (date.getDay() === 0 || date.getDay() === 6 ? "text-red-500 font-bold" : "text-slate-700")
                      )}>
                        {isToday && (
                          <span className={cn(
                            "text-[8.5px] text-white px-1.5 py-0.2 rounded font-black whitespace-nowrap shadow-2xs",
                            timelineViewMode === 'plan'
                              ? "bg-indigo-600"
                              : timelineViewMode === 'actual'
                              ? "bg-emerald-600"
                              : "bg-amber-500 animate-pulse"
                          )}>
                            {timelineViewMode === 'plan' ? 'วันนี้' : timelineViewMode === 'actual' ? 'วันนี้' : 'วันนี้ (กึ่งกลาง)'}
                          </span>
                        )}
                        <span>{format(date, "EEE")}</span>
                      </div>
                      <div className={cn(
                        "text-xs mt-0.5",
                        isToday
                          ? (timelineViewMode === 'plan' ? "text-indigo-950 font-black" : timelineViewMode === 'actual' ? "text-emerald-950 font-black" : "text-amber-900 font-black")
                          : "text-slate-500"
                      )}>
                        {format(date, "dd MMM")}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Background Today Highlight Vertical Bars */}
            <div className="divide-y divide-slate-100 relative">
              <div className="absolute inset-0 left-[260px] flex pointer-events-none">
                {timelineDates.map((date, i) => {
                  const isToday = isSameDay(date, today)
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 border-r transition-all",
                        isTimelineExpanded ? "min-w-[100px]" : "min-w-[60px]",
                        isToday
                          ? (timelineViewMode === 'plan'
                              ? "border-x-2 border-x-indigo-400/80 bg-indigo-50/30 z-0"
                              : timelineViewMode === 'actual'
                              ? "border-x-2 border-x-emerald-400/80 bg-emerald-50/30 z-0"
                              : "border-x-2 border-x-amber-400/80 bg-amber-50/40 z-0")
                          : "border-slate-200 border-dashed"
                      )}
                    />
                  )
                })}
              </div>

              {/* Rows */}
              {lotsWithVisibleTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Filter className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700">ไม่พบคิวงานในแผนกและช่วงเวลาที่เลือก</div>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                    {filterDept !== 'ALL' 
                      ? `ไม่มีคิวงานของแผนก ${filterDept === 'RM' ? 'ชั่งสาร' : filterDept === 'MX' ? 'ผสม' : filterDept === 'PK' ? 'บรรจุ' : 'ลงลัง/POF'} ในกรอบเวลานี้`
                      : 'ลองเปลี่ยนช่วงวัน หรือค้นหาด้วยเงื่อนไขอื่น'}
                  </p>
                </div>
              ) : (
                lotsWithVisibleTasks.map(({ lot, visibleLogs }) => {
                  return (
                    <div key={lot.id} className="group relative z-10">
                      {/* LOT Header Row */}
                      <div className="flex bg-white hover:bg-[#F8F6F0] transition-colors h-[40px] items-center border-b border-slate-100">
                        <div className="w-[260px] shrink-0 p-2 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-[#F8F6F0] z-20 shadow-[1px_0_0_0_#e2e8f0] transition-colors">
                          <div className="font-medium text-sm line-clamp-2 break-words text-wrap">
                            {lot.products?.sku} <span className="font-normal text-xs text-slate-500 ml-1">({lot.lot_no})</span>
                          </div>
                        </div>
                        <div className="flex flex-1"></div>
                      </div>

                      {/* Individual Task Rows */}
                      {visibleLogs.map(log => {
                        const process = processes.find(p => p.id === log.process_id)
                        const pName = process?.process_name || log.processes?.process_name || ''
                        const deptKey = getProcessDept(pName)
                        let pt = PROCESS_TYPES.find(item => item.id === deptKey)
                        if (!pt) {
                          pt = { id: 'OTHER', name: pName || 'งานผลิต', color: 'bg-slate-100 text-slate-800 border-slate-200' }
                        }

                      const timelineStart = timelineStartDate
                      const totalDays = totalTimelineDays
                      const maxDayIndex = totalDays - 1

                      // 1. Calculate Planned Position
                      let planData: { start: Date; end: Date; inView: boolean; leftPercent: number; widthPercent: number; startsBefore: boolean; endsAfter: boolean } | null = null
                      if (log.activity_date) {
                        const pStart = startOfDay(new Date(log.activity_date))
                        const pEnd = log.end_date ? startOfDay(new Date(log.end_date)) : pStart

                        const startDiff = differenceInDays(pStart, timelineStart)
                        const duration = differenceInDays(pEnd, pStart) + 1
                        const endDiff = startDiff + duration - 1

                        if (endDiff >= 0 && startDiff < totalDays) {
                          const actualStartDiff = Math.max(0, startDiff)
                          const actualEndDiff = Math.min(maxDayIndex, endDiff)
                          const actualDuration = actualEndDiff - actualStartDiff + 1
                          planData = {
                            start: pStart,
                            end: pEnd,
                            inView: true,
                            leftPercent: (actualStartDiff / totalDays) * 100,
                            widthPercent: (actualDuration / totalDays) * 100,
                            startsBefore: startDiff < 0,
                            endsAfter: endDiff >= totalDays
                          }
                        }
                      }

                      // 2. Calculate Actual Position
                      let actualData: { start: Date; end: Date; inView: boolean; leftPercent: number; widthPercent: number; startsBefore: boolean; endsAfter: boolean; status: string } | null = null
                      if (log.start_time || log.status === 'DONE') {
                        const aStart = log.start_time ? startOfDay(new Date(log.start_time)) : (log.activity_date ? startOfDay(new Date(log.activity_date)) : startOfDay(new Date(log.created_at)))
                        let aEnd = aStart
                        if (log.end_time) {
                          aEnd = startOfDay(new Date(log.end_time))
                        } else if (log.status === 'DONE') {
                          aEnd = log.updated_at ? startOfDay(new Date(log.updated_at)) : aStart
                        } else if (log.status === 'IN_PROGRESS') {
                          aEnd = today
                        }

                        const startDiff = differenceInDays(aStart, timelineStart)
                        const duration = differenceInDays(aEnd, aStart) + 1
                        const endDiff = startDiff + duration - 1

                        if (endDiff >= 0 && startDiff < totalDays) {
                          const actualStartDiff = Math.max(0, startDiff)
                          const actualEndDiff = Math.min(maxDayIndex, endDiff)
                          const actualDuration = actualEndDiff - actualStartDiff + 1
                          actualData = {
                            start: aStart,
                            end: aEnd,
                            inView: true,
                            leftPercent: (actualStartDiff / totalDays) * 100,
                            widthPercent: (actualDuration / totalDays) * 100,
                            startsBefore: startDiff < 0,
                            endsAfter: endDiff >= totalDays,
                            status: log.status
                          }
                        }
                      }

                      // 3. Calculate Variance
                      let variance = {
                        type: 'WAITING',
                        diffDays: 0,
                        label: 'รอเริ่มตามแผน',
                        colorClass: 'bg-slate-100 text-slate-600 border-slate-200'
                      }

                      const todayStart = startOfDay(new Date())

                      if (log.activity_date) {
                        const pEnd = log.end_date ? startOfDay(new Date(log.end_date)) : startOfDay(new Date(log.activity_date))
                        const pStart = startOfDay(new Date(log.activity_date))

                        if (log.status === 'DONE') {
                          const aEnd = log.end_time
                            ? startOfDay(new Date(log.end_time))
                            : (log.updated_at ? startOfDay(new Date(log.updated_at)) : pEnd)
                          const diff = differenceInDays(aEnd, pEnd)

                          if (diff === 0) {
                            variance = { type: 'ON_TIME', diffDays: 0, label: '✅ ตรงแผน', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' }
                          } else if (diff < 0) {
                            variance = { type: 'EARLY', diffDays: diff, label: `⚡ เร็วกว่าแผน ${Math.abs(diff)}d`, colorClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold' }
                          } else {
                            variance = { type: 'DELAYED', diffDays: diff, label: `⚠️ ล่าช้า +${diff}d`, colorClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' }
                          }
                        } else if (log.status === 'IN_PROGRESS') {
                          const overdue = differenceInDays(todayStart, pEnd)
                          if (overdue > 0) {
                            variance = { type: 'OVERDUE_IN_PROGRESS', diffDays: overdue, label: `🚨 เกินกำหนด +${overdue}d`, colorClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold' }
                          } else {
                            variance = { type: 'IN_PROGRESS', diffDays: 0, label: '⏳ กำลังผลิตตามแผน', colorClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium' }
                          }
                        } else {
                          const overdue = differenceInDays(todayStart, pStart)
                          if (overdue > 0) {
                            variance = { type: 'OVERDUE_START', diffDays: overdue, label: `⏳ เลยวันเริ่ม +${overdue}d`, colorClass: 'bg-amber-100 text-amber-900 border-amber-400 font-bold' }
                          }
                        }
                      }

                      // Filter condition based on viewMode
                      if (timelineViewMode === 'plan' && !planData?.inView) return null
                      if (timelineViewMode === 'actual' && !actualData?.inView) return null
                      if (timelineViewMode === 'compare' && !planData?.inView && !actualData?.inView) return null

                      const isCompare = timelineViewMode === 'compare'
                      const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
                      const actualDelayInfo = parseActualDelayInfo(log.note)
                      const userComment = extractUserComment(log.note)
                      const isStarted = isTaskStartedByShopfloor(log)
                      const isCompleted = isTaskCompleted(log)

                      const tooltipPlanText = [
                        `📌 [แผนงาน] SKU: ${lot.products?.sku || '-'} | Lot: ${lot.lot_no}`,
                        `⚙️ ขั้นตอน: ${process?.process_name || 'งานผลิต'} (ถัง T${log.tank_start || 1}-${log.tank_end || 1})`,
                        planData ? `📅 กำหนดตามแผน: ${format(planData.start, 'dd/MM/yyyy')}${planData.end > planData.start ? ` ถึง ${format(planData.end, 'dd/MM/yyyy')}` : ''}` : '',
                        planInfo.isRescheduled ? `🔄 ปรับแผนล่าสุด: ${planInfo.categoryLabel}${planInfo.reason ? ` - ${planInfo.reason}` : ''}` : '',
                        isCompleted
                          ? `✅ งานผลิตเสร็จสิ้นแล้ว (${log.status})`
                          : isStarted 
                            ? `⚠️ หน้างานเริ่มงานแล้ว: ลากแถบหรือคลิกเพื่อปรับเลื่อนแผนงาน (บันทึกประวัติ KPI)`
                            : (canEdit ? `↔️ ลากแถบนี้เพื่อเลื่อนวัน (Slide Bar Period) หรือคลิกเพื่อเปิดหน้าต่างปรับแผน` : '')
                      ].filter(Boolean).join('\n')

                      const tooltipActualText = [
                        `📌 [ปฏิบัติงานจริง] SKU: ${lot.products?.sku || '-'} | Lot: ${lot.lot_no}`,
                        `⚙️ ขั้นตอน: ${process?.process_name || 'งานผลิต'} (ถัง T${log.tank_start || 1}-${log.tank_end || 1})`,
                        `📊 สถานะ: ${variance.label} [${log.status === 'DONE' ? 'เสร็จสิ้นแล้ว' : log.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}]`,
                        actualData ? `⏱️ ดำเนินการจริง: ${format(actualData.start, 'dd/MM/yyyy')}${log.status === 'DONE' ? ` ถึง ${format(actualData.end, 'dd/MM/yyyy')}` : ' (ยังไม่เสร็จ)'}` : '',
                        actualDelayInfo.hasDelayReason ? `📝 บันทึกเหตุผลล่าช้าหน้างาน: ${actualDelayInfo.categoryLabel}${actualDelayInfo.reason ? ` - ${actualDelayInfo.reason}` : ''}` : '',
                        userComment ? `💬 หมายเหตุหน้างาน: ${userComment}` : '',
                        `👉 คลิกแถบ 🅰️ นี้เพื่อบันทึกหรือแก้ไขเหตุผลที่ทำงานจริงล่าช้ากว่าแผน`
                      ].filter(Boolean).join('\n')

                      const isDraggingThis = !!(dragState && dragState.logId === log.id)
                      const currentDelta = isDraggingThis ? dragState.deltaDays : 0
                      const shiftPercent = (currentDelta / totalTimelineDays) * 100
                      const effectiveLeftPercent = planData ? planData.leftPercent + shiftPercent : 0

                      return (
                        <div
                          key={log.id}
                          className={cn(
                            "flex bg-white hover:bg-[#F8F6F0] transition-colors items-center border-b border-slate-100",
                            isCompare ? "h-[58px]" : "h-[42px]"
                          )}
                        >
                          {/* Left Task Label Cell */}
                          <div className="w-[260px] shrink-0 py-1 px-3 pl-6 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-[#F8F6F0] z-20 shadow-[1px_0_0_0_#e2e8f0] flex flex-col justify-center transition-colors">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", pt.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))}></div>
                              <span
                                className="text-xs font-semibold text-slate-800 truncate cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1"
                                title={isStarted ? tooltipActualText : tooltipPlanText}
                                onClick={() => {
                                  if (isCompleted || actualDelayInfo.hasDelayReason) {
                                    handleOpenActualDelayModal(log, lot, process, variance)
                                  } else {
                                    handleOpenRescheduleDetail(log, lot, process)
                                  }
                                }}
                              >
                                <span className="truncate">{process?.process_name || "Unknown"} (T{log.tank_start || 1}-{log.tank_end || 1})</span>
                                {isCompleted ? (
                                  <span className="text-[9.5px] px-1 py-0 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-0.5" title="ผลิตเสร็จสิ้นแล้ว">
                                    <Check className="w-2.5 h-2.5 text-emerald-700" />
                                    <span className="font-normal text-[8.5px]">เสร็จสิ้น</span>
                                  </span>
                                ) : isStarted ? (
                                  <span className="text-[9.5px] px-1 py-0 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0 flex items-center gap-0.5" title="หน้างานเริ่มงานแล้ว (คลิกแถบ P เพื่อขยับวันตามแผน หรือคลิกแถบ A เพื่อบันทึกเหตุผล)">
                                    <Lock className="w-2.5 h-2.5 text-amber-700" />
                                    <span className="font-normal text-[8.5px]">กำลังทำ/แช่</span>
                                  </span>
                                ) : null}
                              </span>
                            </div>
                            {/* Variance Label Badge */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                onClick={() => {
                                  if (isCompleted || actualDelayInfo.hasDelayReason) {
                                    handleOpenActualDelayModal(log, lot, process, variance)
                                  } else {
                                    handleOpenRescheduleDetail(log, lot, process)
                                  }
                                }}
                                className={cn(
                                  "text-[9.5px] px-1.5 py-0.2 rounded border font-mono cursor-pointer transition-all flex items-center gap-1",
                                  variance.colorClass,
                                  "hover:ring-1 hover:ring-rose-400 active:scale-95"
                                )}
                                title={isStarted ? `คลิกเพื่อบันทึก/ดูเหตุผลที่ทำงานจริงล่าช้ากว่าแผน\n${tooltipActualText}` : tooltipPlanText}
                              >
                                <span>{variance.label}</span>
                                {planInfo.isRescheduled && <span title={`ปรับแผน: ${planInfo.categoryLabel}`}>🔄</span>}
                                {actualDelayInfo.hasDelayReason ? (
                                  <span className="text-[8.5px] bg-rose-50 text-rose-700 px-1 py-0.2 rounded border border-rose-200" title={`เหตุผลล่าช้าหน้างาน: ${actualDelayInfo.categoryLabel}${actualDelayInfo.reason ? ` - ${actualDelayInfo.reason}` : ''}`}>
                                    📝 {actualDelayInfo.categoryLabel?.split(' ')[0]}
                                  </span>
                                ) : (userComment && <span title={`มีบันทึกหน้างาน: ${userComment}`}>💬</span>)}
                              </span>
                            </div>
                          </div>

                          {/* Right Gantt Bar Chart Cell */}
                          <div className="flex flex-1 relative h-full items-center">
                            {/* Mode 1: Plan Only */}
                            {timelineViewMode === 'plan' && planData?.inView && (
                              <>
                                {/* Ghost Placeholder Bar at original position during drag */}
                                {isDraggingThis && (
                                  <div
                                    className="absolute h-6 rounded-md px-2 flex items-center text-xs font-medium border border-dashed border-slate-300 bg-slate-100/60 opacity-60 pointer-events-none z-5"
                                    style={{ left: `calc(${planData.leftPercent}% + 4px)`, width: `calc(${planData.widthPercent}% - 8px)` }}
                                  >
                                    <span className="truncate opacity-50">{lot.products?.sku} - แผนเดิม</span>
                                  </div>
                                )}

                                <div
                                  className={cn(
                                    "absolute h-6 rounded-md px-2 flex items-center text-xs font-medium border shadow-xs overflow-hidden select-none transition-all",
                                    pt.color,
                                    isCompleted
                                      ? "cursor-not-allowed opacity-90"
                                      : canEdit
                                        ? "cursor-grab active:cursor-grabbing hover:brightness-95 hover:shadow-md touch-none"
                                        : "cursor-pointer hover:brightness-95",
                                    isDraggingThis
                                      ? "z-30 ring-2 ring-indigo-600 shadow-xl scale-[1.02] cursor-grabbing opacity-95 transition-none"
                                      : "z-10"
                                  )}
                                  style={{ left: `calc(${effectiveLeftPercent}% + 4px)`, width: `calc(${planData.widthPercent}% - 8px)` }}
                                  onPointerDown={(e) => {
                                    if (canEdit && !isCompleted) {
                                      handleBarPointerDown(e, log, lot, process, planData)
                                    }
                                  }}
                                  onClick={() => {
                                    if (isCompleted) {
                                      toast.info(`คิวงานนี้หน้างาน${process?.process_name || ''}ดำเนินการเสร็จสิ้นแล้ว (${log.status})`)
                                    } else if (canEdit) {
                                      handleOpenRescheduleDetail(log, lot, process)
                                    }
                                  }}
                                  title={isCompleted
                                    ? `✅ งานผลิตเสร็จสิ้นแล้ว (${log.status})`
                                    : isStarted
                                    ? `⚠️ หน้างานเริ่มงานแล้ว: ลากแถบหรือคลิกเพื่อปรับเลื่อนแผนงาน (บันทึกประวัติ KPI)\n👉 หรือสลับไปดูแถบ A เพื่อบันทึกเหตุผลที่ทำงานจริงล่าช้ากว่าแผน` 
                                    : tooltipPlanText}
                                >
                                  {isCompleted ? (
                                    <Check className="w-3 h-3 text-emerald-700 mr-1 shrink-0" />
                                  ) : isStarted ? (
                                    <Lock className="w-3 h-3 text-amber-800/80 mr-1 shrink-0" />
                                  ) : canEdit ? (
                                    <GripVertical className="w-3 h-3 text-slate-500/70 mr-0.5 shrink-0 hover:text-slate-900" />
                                  ) : null}

                                  <span className="truncate">{lot.products?.sku} - {process?.process_name}</span>

                                  {/* Floating Delta Badge when dragging */}
                                  {isDraggingThis && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10.5px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-40 flex items-center gap-1">
                                      <span>↔️ {format(addDays(planData.start, currentDelta), 'dd/MM/yyyy')}</span>
                                      <span className={currentDelta > 0 ? "text-emerald-300" : currentDelta < 0 ? "text-amber-300" : "text-slate-300"}>
                                        ({currentDelta > 0 ? `+${currentDelta}` : currentDelta === 0 ? 'เดิม' : `${currentDelta}`} วัน)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Mode 2: Actual Only */}
                            {timelineViewMode === 'actual' && actualData?.inView && (
                              <div
                                className={cn(
                                  "absolute h-6 rounded-md px-2 flex items-center text-xs font-bold border shadow-xs overflow-hidden z-10 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all text-white",
                                  actualData.status === 'DONE' ? "bg-emerald-600 border-emerald-700" : "bg-blue-600 border-blue-700 animate-pulse"
                                )}
                                style={{ left: `calc(${actualData.leftPercent}% + 4px)`, width: `calc(${actualData.widthPercent}% - 8px)` }}
                                onClick={() => handleOpenActualDelayModal(log, lot, process, variance)}
                                title={`🅰️ แถบปฏิบัติงานจริง: คลิกเพื่อบันทึก/แก้ไขเหตุผลที่ทำงานจริงล่าช้ากว่าแผน\n${tooltipActualText}`}
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  <span>{lot.products?.sku} - {process?.process_name} (จริง)</span>
                                  {actualDelayInfo.hasDelayReason && (
                                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-normal shrink-0">
                                      📝 {actualDelayInfo.categoryLabel?.split(' ')[0]}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Mode 3: Compare P vs A (Dual-Track Gantt Bars) */}
                            {timelineViewMode === 'compare' && (
                              <>
                                {/* Top Track: 🅿️ Plan Bar */}
                                {planData?.inView && (
                                  <>
                                    {/* Ghost placeholder when dragging */}
                                    {isDraggingThis && (
                                      <div
                                        className="absolute top-1.5 h-5 rounded px-2 flex items-center font-bold text-[10px] border border-dashed border-slate-300 bg-slate-100/60 opacity-60 pointer-events-none z-5"
                                        style={{
                                          left: `calc(${planData.leftPercent}% + 4px)`,
                                          width: `calc(${planData.widthPercent}% - 8px)`,
                                          minWidth: isTimelineExpanded ? '90px' : '54px'
                                        }}
                                      >
                                        <span className="truncate opacity-50">🅿️ แผนเดิม</span>
                                      </div>
                                    )}

                                    <div
                                      className={cn(
                                        "absolute top-1.5 h-5 rounded px-2 flex items-center font-bold text-[10px] border border-dashed border-indigo-400 bg-indigo-50/90 text-indigo-900 shadow-2xs overflow-hidden select-none transition-all",
                                        isCompleted
                                          ? "cursor-not-allowed opacity-90"
                                          : canEdit
                                            ? "cursor-grab active:cursor-grabbing hover:bg-indigo-100 touch-none"
                                            : "cursor-pointer hover:bg-indigo-100",
                                        isDraggingThis
                                          ? "z-30 ring-2 ring-indigo-600 shadow-xl bg-indigo-100 scale-[1.02] cursor-grabbing transition-none"
                                          : "z-10"
                                      )}
                                      style={{
                                        left: `calc(${effectiveLeftPercent}% + 4px)`,
                                        width: `calc(${planData.widthPercent}% - 8px)`,
                                        minWidth: isTimelineExpanded ? '90px' : '54px'
                                      }}
                                      onPointerDown={(e) => {
                                        if (canEdit && !isCompleted) {
                                          handleBarPointerDown(e, log, lot, process, planData)
                                        }
                                      }}
                                      onClick={() => {
                                        if (isCompleted) {
                                          toast.info(`คิวงานนี้หน้างาน${process?.process_name || ''}ดำเนินการเสร็จสิ้นแล้ว (${log.status})`)
                                        } else if (canEdit) {
                                          handleOpenRescheduleDetail(log, lot, process)
                                        }
                                      }}
                                      title={isCompleted
                                        ? `✅ งานผลิตเสร็จสิ้นแล้ว (${log.status})`
                                        : isStarted
                                        ? `⚠️ หน้างานเริ่มงานแล้ว: ลากแถบเพื่อปรับเลื่อนแผนงาน (บันทึกประวัติ KPI)\n👉 หรือคลิกแถบ 🅰️ ด้านล่างเพื่อใส่เหตุผลที่ทำงานจริงล่าช้ากว่าแผน` 
                                        : `↔️ แถบ P (แผนงาน): ลากแถบเพื่อเลื่อนวัน หรือคลิกเพื่อปรับแผน`}
                                    >
                                      {isCompleted ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-700 mr-1 shrink-0" />
                                      ) : isStarted ? (
                                        <Lock className="w-2.5 h-2.5 text-amber-700 mr-1 shrink-0" />
                                      ) : canEdit ? (
                                        <GripVertical className="w-2.5 h-2.5 text-indigo-400 mr-0.5 shrink-0" />
                                      ) : null}

                                      <span className="truncate">🅿️ แผน: {format(addDays(planData.start, currentDelta), 'dd/MM')}{planData.end > planData.start ? `-${format(addDays(planData.end, currentDelta), 'dd/MM')}` : ''}</span>

                                      {/* Floating Delta Badge when dragging in Compare mode */}
                                      {isDraggingThis && (
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-indigo-950 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-40 flex items-center gap-1">
                                          <span>↔️ {format(addDays(planData.start, currentDelta), 'dd/MM/yyyy')}</span>
                                          <span className={currentDelta > 0 ? "text-emerald-300" : currentDelta < 0 ? "text-amber-300" : "text-slate-300"}>
                                            ({currentDelta > 0 ? `+${currentDelta}` : currentDelta === 0 ? 'เดิม' : `${currentDelta}`} วัน)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}

                                {/* Bottom Track: 🅰️ Actual Bar */}
                                {actualData?.inView ? (
                                  <div
                                    className={cn(
                                      "absolute bottom-1.5 h-5 rounded px-2 flex items-center font-bold text-[10px] border shadow-2xs overflow-hidden z-10 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all text-white",
                                      actualData.status === 'DONE'
                                        ? "bg-emerald-600 border-emerald-700"
                                        : "bg-blue-600 border-blue-700 animate-pulse"
                                    )}
                                    style={{
                                      left: `calc(${actualData.leftPercent}% + 4px)`,
                                      width: `calc(${actualData.widthPercent}% - 8px)`,
                                      minWidth: isTimelineExpanded ? '90px' : '54px'
                                    }}
                                    onClick={() => handleOpenActualDelayModal(log, lot, process, variance)}
                                    title={`🅰️ แถบปฏิบัติงานจริง: คลิกเพื่อบันทึก/แก้ไขเหตุผลที่ทำงานจริงล่าช้ากว่าแผน\n${tooltipActualText}`}
                                  >
                                    <span className="truncate flex items-center gap-1">
                                      <span>🅰️ จริง: {format(actualData.start, 'dd/MM')}{actualData.end > actualData.start ? `-${format(actualData.end, 'dd/MM')}` : ''}</span>
                                      {actualDelayInfo.hasDelayReason && (
                                        <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-normal shrink-0">
                                          📝 {actualDelayInfo.categoryLabel?.split(' ')[0]}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  planData?.inView && (
                                    <div
                                      className="absolute bottom-1.5 h-5 rounded px-2 flex items-center font-medium text-[9px] border border-dashed border-slate-300 bg-slate-50 text-slate-400 overflow-hidden z-10 cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                      style={{
                                        left: `calc(${planData.leftPercent}% + 4px)`,
                                        width: `calc(${planData.widthPercent}% - 8px)`,
                                        minWidth: isTimelineExpanded ? '90px' : '54px'
                                      }}
                                      onClick={() => handleOpenActualDelayModal(log, lot, process, variance)}
                                      title={`⏳ ยังไม่เริ่มงานจริง: คลิกเพื่อดูหรือบันทึกหมายเหตุหน้างาน\n${tooltipActualText}`}
                                    >
                                      <span className="truncate">⏳ ยังไม่บันทึกงาน</span>
                                    </div>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }))}
            </div>
          </div>
        )}
      </div>

      {/* Reschedule Detail Modal */}
      <Dialog open={!!rescheduleModal?.isOpen} onOpenChange={(open) => !open && setRescheduleModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-base">
                🔄
              </span>
              บันทึกการปรับเลื่อนแผนงานผลิต
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              ระบบบันทึกประวัติการปรับวัน เพื่อใช้ประเมิน Schedule Adherence KPI และให้ AI Plant Director วิเคราะห์ผลกระทบ
            </DialogDescription>
          </DialogHeader>

          {rescheduleModal && (
            <div className="space-y-4 py-2 text-sm">
              {/* Slide Drag Info Banner */}
              {rescheduleModal.isSlideDrag && (
                <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg flex items-start gap-2.5 text-indigo-950 shadow-2xs">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-md mt-0.5 shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>เลื่อนแถบเวลาแผนงานผลิต (Slide Bar Period)</span>
                      <Badge variant="secondary" className="bg-indigo-200/80 text-indigo-900 border-indigo-300 text-[10px] font-bold">
                        {rescheduleModal.deltaDays && rescheduleModal.deltaDays > 0 ? `+${rescheduleModal.deltaDays}` : rescheduleModal.deltaDays} วัน
                      </Badge>
                    </div>
                    <p className="text-[11.5px] text-indigo-700/90 mt-0.5 leading-relaxed">
                      ระบบคำนวณและปรับเลื่อนช่วงวันที่ตามแถบที่ลากแล้ว <strong className="text-indigo-950 font-bold">กรุณาระบุเหตุผลในการเลื่อนแผน</strong> เพื่อบันทึกประวัติการปรับเปลี่ยน
                    </p>
                  </div>
                </div>
              )}

              {/* Started Override Banner */}
              {rescheduleModal.isStartedOverride && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 text-amber-950 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-amber-900">
                      ⚠️ คิวงานนี้เริ่มดำเนินการแล้ว (กำลังดำเนินการ)
                    </div>
                    <p className="text-[11.5px] text-amber-800 mt-0.5 leading-relaxed">
                      ระบบอนุญาตให้ขยับวันตามแผนเพื่อให้ตรงกับหน้างานจริง โดยจะบันทึกประวัติการ Re-plan ไว้อย่างชัดเจนเพื่อประเมิน KPI/OTIF <strong className="text-amber-950 font-bold">กรุณาระบุเหตุผลในการเลื่อนแผน</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Context Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lot No:</span>
                  <span className="font-semibold text-slate-800">{rescheduleModal.lotNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU / สินค้า:</span>
                  <span className="font-medium text-slate-700">{rescheduleModal.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ขั้นตอนการผลิต:</span>
                  <span className="font-semibold text-blue-700">{rescheduleModal.processName}</span>
                </div>
              </div>

              {/* Date Comparison */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <div>
                  <div className="text-[11px] text-amber-800 font-medium mb-1">📅 กำหนดเดิมตามแผน (Baseline)</div>
                  <div className="text-sm font-bold text-slate-700">
                    {rescheduleModal.originalDate ? format(new Date(rescheduleModal.originalDate), 'dd/MM/yyyy') : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-800 font-medium mb-1 flex items-center justify-between">
                    <span>🎯 กำหนดวันใหม่ (Revised)</span>
                    {rescheduleModal.isSlideDrag ? (
                      <span className="text-[10px] text-indigo-600 font-semibold">ปรับจากการเลื่อนแถบ</span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-normal">คลิกเลือกวันใหม่</span>
                    )}
                  </div>
                  <Input
                    type="date"
                    value={rescheduleModal.newDate || ''}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
                    className="h-8 text-xs bg-white border-emerald-400 font-bold text-emerald-800 focus:ring-emerald-500"
                  />
                  {rescheduleModal.newEndDate && rescheduleModal.newEndDate !== rescheduleModal.newDate && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      ถึง: {format(new Date(rescheduleModal.newEndDate), 'dd/MM/yyyy')}
                    </div>
                  )}
                </div>
              </div>

              {/* Reason Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  สาเหตุหลักที่ต้องปรับเลื่อนแผน <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={rescheduleModal.category}
                  onValueChange={(val) => setRescheduleModal({ ...rescheduleModal, category: val || 'WAIT_RM_PM' })}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="เลือกหมวดหมู่สาเหตุ" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_CHANGE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  รายละเอียดเหตุผลการเลื่อนแผน {(rescheduleModal.isSlideDrag || rescheduleModal.isStartedOverride) ? <span className="text-red-500">* (จำเป็นต้องระบุ)</span> : null}
                </Label>
                <Textarea
                  placeholder={(rescheduleModal.isSlideDrag || rescheduleModal.isStartedOverride) ? "ระบุเหตุผลการเลื่อนแผน (จำเป็น) เช่น หน้างานแช่ไว้รอถังผสม, วัตถุดิบเข้าช้า, ซ่อมบำรุงเครื่องจักร..." : "เช่น BEC ขอเลื่อนส่ง Glycerin เป็น 21/09 หรือ หน้างานรอผล Micro Lab ก่อนบรรจุ"}
                  value={rescheduleModal.reason}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
                  className={cn(
                    "text-xs min-h-[75px] resize-none bg-white",
                    (rescheduleModal.isSlideDrag || rescheduleModal.isStartedOverride) && !rescheduleModal.reason.trim() ? "border-amber-400 focus:border-indigo-500" : ""
                  )}
                />
                {(rescheduleModal.isSlideDrag || rescheduleModal.isStartedOverride) && !rescheduleModal.reason.trim() && (
                  <p className="text-[11px] text-amber-700 font-medium">⚠️ กรุณากรอกเหตุผลเพื่อยืนยันการเลื่อนแผนงาน</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center pt-2">
            {(!rescheduleModal?.isSlideDrag && !rescheduleModal?.isStartedOverride) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-700 w-full sm:w-auto"
                onClick={handleQuickRescheduleWithoutReason}
              >
                ปรับวันโดยไม่บันทึกสาเหตุ
              </Button>
            ) : (
              <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>งานที่เริ่มแล้ว บังคับบันทึกสาเหตุเพื่อประเมิน KPI</span>
              </div>
            )}
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setRescheduleModal(null)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-[#0B192C] text-white hover:bg-[#1E3E62]"
                onClick={handleConfirmReschedule}
              >
                บันทึกการปรับเลื่อน
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actual Delay Modal (สำหรับหน้างานบันทึกเหตุผลการทำงานจริงล่าช้ากว่าแผน - แถบ A ไม่มีการล็อก) */}
      <Dialog open={!!actualDelayModal?.isOpen} onOpenChange={(open) => !open && setActualDelayModal(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
              <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-base">
                🅰️
              </span>
              บันทึกเหตุผลการปฏิบัติงานจริง / ล่าช้ากว่าแผน
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              หน้างานระบุสาเหตุที่การผลิตจริงเริ่มต้นหรือเสร็จสิ้นล่าช้ากว่าแผนที่วางไว้ เพื่อนำไปวิเคราะห์คอขวดและปรับปรุงกระบวนการ
            </DialogDescription>
          </DialogHeader>

          {actualDelayModal && (
            <div className="space-y-4 py-2 text-sm">
              {/* Context Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lot No:</span>
                  <span className="font-semibold text-slate-800">{actualDelayModal.lotNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU / สินค้า:</span>
                  <span className="font-medium text-slate-700">{actualDelayModal.sku}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ขั้นตอนการผลิต:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-700">{actualDelayModal.processName}</span>
                    <Badge variant="outline" className="text-[10.5px] px-1.5 py-0 font-bold border-slate-300">
                      {actualDelayModal.varianceLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Plan vs Actual Comparison Banner */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                <div>
                  <div className="text-[11px] text-indigo-900 font-semibold mb-1 flex items-center gap-1">
                    <span>🅿️ วันที่กำหนดตามแผน (Plan)</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    {actualDelayModal.planDateStr}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-blue-900 font-semibold mb-1 flex items-center gap-1">
                    <span>🅰️ วันที่ดำเนินการจริง (Actual)</span>
                  </div>
                  <div className="text-xs font-bold text-blue-900">
                    {actualDelayModal.actualDateStr}
                  </div>
                </div>
              </div>

              {/* Existing Delay Note if already recorded */}
              {actualDelayModal.existingDelayInfo?.hasDelayReason && (
                <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1 text-[11px]">
                    <span>📝 มีบันทึกเหตุผลล่าช้าก่อนหน้า:</span>
                    <span className="font-normal text-amber-700">({actualDelayModal.existingDelayInfo.categoryLabel})</span>
                  </div>
                  <div className="mt-1 text-[11.5px] text-amber-800">
                    {actualDelayModal.existingDelayInfo.reason || '-'}
                  </div>
                  {actualDelayModal.existingDelayInfo.updatedBy && (
                    <div className="text-[10px] text-amber-600 mt-1">
                      บันทึกโดย: {actualDelayModal.existingDelayInfo.updatedBy} {actualDelayModal.existingDelayInfo.updatedAt ? `(${format(new Date(actualDelayModal.existingDelayInfo.updatedAt), 'dd/MM/yyyy HH:mm')})` : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Delay Reason Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  หมวดหมู่สาเหตุที่ทำจริงล่าช้ากว่าแผน <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={actualDelayModal.category}
                  onValueChange={(val) => setActualDelayModal({ ...actualDelayModal, category: val || 'WAIT_RM_PM' })}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="เลือกหมวดหมู่สาเหตุที่ล่าช้า" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTUAL_DELAY_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Detailed Reason Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  รายละเอียดเหตุผลจากหน้างาน <span className="text-red-500">* (จำเป็นต้องระบุ)</span>
                </Label>
                <Textarea
                  placeholder="ระบุเหตุผลที่หน้างานล่าช้ากว่าแผน เช่น รอสารเคมีจากคลัง, ช่างกำลังตั้งเครื่องชั่ง, รอผลแล็บ QC ปล่อยผ่าน, ล้างถังนานกว่าปกติ..."
                  value={actualDelayModal.reason}
                  onChange={(e) => setActualDelayModal({ ...actualDelayModal, reason: e.target.value })}
                  className={cn(
                    "text-xs min-h-[80px] resize-none bg-white",
                    !actualDelayModal.reason.trim() ? "border-blue-300 focus:border-blue-500" : ""
                  )}
                />
              </div>

              {/* Optional: Adjust Actual Start Date */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>📅 ปรับแก้วันที่เริ่มปฏิบัติงานจริง (ถ้าจำเป็น)</span>
                  <span className="text-[10px] text-slate-400 font-normal">มีผลต่อตำแหน่งแถบ 🅰️</span>
                </div>
                <Input
                  type="date"
                  value={actualDelayModal.actualStartDate || ''}
                  onChange={(e) => setActualDelayModal({ ...actualDelayModal, actualStartDate: e.target.value })}
                  className="h-8 text-xs bg-white border-slate-300 font-medium"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center pt-2">
            <div className="text-[11px] text-slate-500 hidden sm:block">
              * ข้อมูลจะถูกนำไปวิเคราะห์คอขวดและแสดงผลบนไทม์ไลน์
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setActualDelayModal(null)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={handleConfirmActualDelay}
              >
                บันทึกเหตุผลหน้างาน
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline Print & PDF Export Modal (A4 Landscape) */}
      <TimelinePrintModal
        isOpen={isTimelinePrintOpen}
        onClose={() => setIsTimelinePrintOpen(false)}
        lots={lots}
        logs={logs}
        processes={processes}
        currentUser={activeUserIdentifier}
        initialDept={filterDept}
        lockDept={lockDept}
        initialOrderType={filterOrderType}
        initialShowHandovers={showShopfloorHandovers}
        initialViewMode={timelineViewMode}
      />
    </div>
  )
}
