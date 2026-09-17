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
  Loader2
} from 'lucide-react'
import { format, differenceInDays, startOfDay, addDays, isSameDay } from 'date-fns'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  extractUserComment
} from '@/lib/planTracking'

export interface MasterPlanningTimelineProps {
  initialDept?: 'ALL' | 'RM' | 'MX' | 'PK'
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

const PROCESS_TYPES = [
  { id: 'RM', name: 'ชั่งสาร', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'MX', name: 'ผสม', color: 'bg-[#D4AF37]/20 text-[#4A4238] border-[#D4AF37]/30' },
  { id: 'PK', name: 'บรรจุ', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
]

const searchMap: Record<string, string> = { RM: 'ชั่งสาร', MX: 'ผสม', PK: 'บรรจุ' }

export function MasterPlanningTimeline({
  initialDept = 'ALL',
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

  // Local state for fetched data (if props not provided)
  const [internalLots, setInternalLots] = useState<any[]>([])
  const [internalLogs, setInternalLogs] = useState<any[]>([])
  const [internalProcesses, setInternalProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Current active user
  const [activeUserId, setActiveUserId] = useState<string | undefined>(currentUserId)
  const [activeUserIdentifier, setActiveUserIdentifier] = useState<string>(currentUser)

  // Filtering & View Controls
  const [filterDept, setFilterDept] = useState<'ALL' | 'RM' | 'MX' | 'PK'>(initialDept)
  const [filterOrderType, setFilterOrderType] = useState<'ALL' | 'MTS' | 'MTO'>(initialOrderType)
  const [searchQuery, setSearchQuery] = useState('')
  const [showShopfloorHandovers, setShowShopfloorHandovers] = useState(false)

  // Timeline Navigation & Mode
  const [timelineViewMode, setTimelineViewMode] = useState<'plan' | 'actual' | 'compare'>(initialViewMode)
  const [timelineRangeMode, setTimelineRangeMode] = useState<'auto' | '15_centered' | '21_extended' | '14_future' | '14_past'>('auto')
  const [timelineOffsetDays, setTimelineOffsetDays] = useState<number>(0)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false)

  // Modals
  const [isTimelinePrintOpen, setIsTimelinePrintOpen] = useState(false)
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean
    logId: string
    lotNo: string
    sku: string
    processName: string
    originalDate: string
    newDate: string
    field: string
    category: string
    reason: string
    currentNote: string
    revisionCount: number
  } | null>(null)

  // Detect user if not passed
  useEffect(() => {
    async function loadUser() {
      if (currentUserId && currentUser) return
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setActiveUserId(user.id)
          const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
          if (profile) {
            setActiveUserIdentifier((profile.employee_id || profile.username || 'USER').toUpperCase())
          }
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
      if (filterOrderType !== 'ALL' && lot.order_type !== filterOrderType) return false
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
        if (!includeHandovers) {
          const process = processes.find(p => p.id === l.process_id)
          const pName = process?.process_name || l.processes?.process_name || ''
          if (isHandoverProcess(pName)) return false
        }
        return true
      })
      .sort((a, b) => {
        const processA = processes.find(p => p.id === a.process_id)?.process_name || ''
        const processB = processes.find(p => p.id === b.process_id)?.process_name || ''
        const orderMap: Record<string, number> = { 'ชั่งสาร': 1, 'ผสม': 2, 'บรรจุ': 3 }
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
  }, [logs, processes, showShopfloorHandovers])

  // Open Reschedule Modal
  const handleOpenRescheduleDetail = (log: any, lot: any, process: any) => {
    if (!canEdit) {
      toast.info('คุณอยู่ในโหมดดูอย่างเดียว ไม่สามารถปรับเลื่อนแผนได้')
      return
    }
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
      category: planInfo.category || 'WAIT_RM_PM',
      reason: planInfo.reason ? cleanDisplayNote(planInfo.reason) : '',
      currentNote: extractUserComment(log.note),
      revisionCount: planInfo.revisionCount || 1
    })
  }

  // Save Reschedule Confirmation
  const handleConfirmReschedule = async () => {
    if (!rescheduleModal) return
    const { logId, field, newDate, originalDate, category, reason, currentNote, revisionCount } = rescheduleModal
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

    const existingLog = logs.find(l => l.id === logId)
    if (field === 'activity_date' && existingLog && (!existingLog.end_date || existingLog.end_date === existingLog.activity_date)) {
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
    const { logId, field, newDate } = rescheduleModal
    setRescheduleModal(null)

    const updateData: any = {
      [field]: newDate,
      updated_at: new Date().toISOString(),
      updated_by: activeUserId || '54168226-988e-4d63-93d2-1a742aafdd84'
    }

    const existingLog = logs.find(l => l.id === logId)
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

  return (
    <div className="space-y-4 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* 1. Schedule Adherence KPI Summary Header */}
      {!hideHeaderKpi && (
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
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
        </div>
      )}

      {/* 2. Unified Toolbar & Filter Section */}
      <div className="px-4 py-3 bg-[#FAF9F6] border-b border-slate-200 space-y-2.5">
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
                บรรจุ/ลงลัง (PK)
              </button>
            </div>
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
      <div className="overflow-x-auto min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm">กำลังโหลดข้อมูลไทม์ไลน์...</p>
          </div>
        ) : (
          <div className={cn(
            "border-t border-slate-200 relative transition-all duration-200",
            isTimelineExpanded ? "min-w-[1850px]" : "min-w-[1200px]"
          )}>
            {/* Timeline Date Headers */}
            <div className="flex border-b border-slate-200 bg-[#F8F6F0] sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
              <div className="w-[260px] shrink-0 p-3 font-semibold text-sm border-r border-slate-200 sticky left-0 bg-[#F8F6F0] z-30 shadow-[1px_0_0_0_#e2e8f0]">
                Project / Task {timelineViewMode === 'compare' ? '(P vs A)' : ''}
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
              {filteredLots.map(lot => {
                const lotLogs = getSortedLotLogs(lot.id)
                const showLot = lotLogs.some(log => {
                  const process = processes.find(p => p.id === log.process_id)
                  let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                  const matchesDept = filterDept === "ALL" || filterDept === pt?.id
                  if (timelineViewMode === 'actual') {
                    return matchesDept && (log.start_time || log.status === 'DONE')
                  }
                  return matchesDept && (log.activity_date || log.start_time)
                })

                if (filterDept !== "ALL" && !showLot) return null

                return (
                  <div key={lot.id} className="group relative z-10">
                    {/* LOT Header Row */}
                    <div className="flex bg-white hover:bg-[#F8F6F0] transition-colors h-[40px] items-center border-b border-slate-100">
                      <div className="w-[260px] shrink-0 p-2 border-r border-slate-200 sticky left-0 bg-inherit z-20 shadow-[1px_0_0_0_#e2e8f0]">
                        <div className="font-medium text-sm line-clamp-2 break-words text-wrap">
                          {lot.products?.sku} <span className="font-normal text-xs text-slate-500 ml-1">({lot.lot_no})</span>
                        </div>
                      </div>
                      <div className="flex flex-1"></div>
                    </div>

                    {/* Individual Task Rows */}
                    {lotLogs.map(log => {
                      const process = processes.find(p => p.id === log.process_id)
                      let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                      if (!pt) {
                        pt = { id: 'OTHER', name: process?.process_name || 'งานผลิต', color: 'bg-slate-100 text-slate-800 border-slate-200' }
                      }

                      if (filterDept !== "ALL" && pt.id !== filterDept) return null

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
                      const userComment = extractUserComment(log.note)
                      const tooltipText = [
                        `📌 SKU: ${lot.products?.sku || '-'} | Lot: ${lot.lot_no}`,
                        `⚙️ ขั้นตอน: ${process?.process_name || 'งานผลิต'} (ถัง T${log.tank_start || 1}-${log.tank_end || 1})`,
                        `📊 สถานะ: ${variance.label} [${log.status === 'DONE' ? 'เสร็จสิ้นแล้ว' : log.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}]`,
                        planData ? `📅 กำหนดตามแผน: ${format(planData.start, 'dd/MM/yyyy')}${planData.end > planData.start ? ` ถึง ${format(planData.end, 'dd/MM/yyyy')}` : ''}` : '',
                        actualData ? `⏱️ ดำเนินการจริง: ${format(actualData.start, 'dd/MM/yyyy')}${log.status === 'DONE' ? ` ถึง ${format(actualData.end, 'dd/MM/yyyy')}` : ' (ยังไม่เสร็จ)'}` : '',
                        planInfo.isRescheduled ? `🔄 ปรับแผนล่าสุด: ${planInfo.categoryLabel}${planInfo.reason ? ` - ${planInfo.reason}` : ''}` : '',
                        userComment ? `💬 บันทึก/หมายเหตุหน้างาน: ${userComment}` : '',
                        canEdit ? `👉 คลิกที่แถบนี้เพื่อ: เปิดหน้าต่างบันทึกสาเหตุ หรือปรับเลื่อนแผนผลิต` : ''
                      ].filter(Boolean).join('\n')

                      return (
                        <div
                          key={log.id}
                          className={cn(
                            "flex bg-white hover:bg-[#F8F6F0] transition-colors items-center border-b border-slate-100",
                            isCompare ? "h-[58px]" : "h-[42px]"
                          )}
                        >
                          {/* Left Task Label Cell */}
                          <div className="w-[260px] shrink-0 py-1 px-3 pl-6 border-r border-slate-200 sticky left-0 bg-inherit z-20 shadow-[1px_0_0_0_#e2e8f0] flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", pt.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))}></div>
                              <span
                                className="text-xs font-semibold text-slate-800 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                title={tooltipText}
                                onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                              >
                                {process?.process_name || "Unknown"} (T{log.tank_start || 1}-{log.tank_end || 1})
                              </span>
                            </div>
                            {/* Variance Label Badge */}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                className={cn(
                                  "text-[9.5px] px-1.5 py-0.2 rounded border font-mono cursor-pointer transition-all flex items-center gap-1",
                                  variance.colorClass,
                                  "hover:ring-1 hover:ring-rose-400 active:scale-95"
                                )}
                                title={tooltipText}
                              >
                                <span>{variance.label}</span>
                                {planInfo.isRescheduled && <span title="มีบันทึกการปรับเลื่อนแผน">🔄</span>}
                                {userComment && <span title={`มีบันทึกหน้างาน: ${userComment}`}>💬</span>}
                              </span>
                            </div>
                          </div>

                          {/* Right Gantt Bar Chart Cell */}
                          <div className="flex flex-1 relative h-full items-center">
                            {/* Mode 1: Plan Only */}
                            {timelineViewMode === 'plan' && planData?.inView && (
                              <div
                                className={cn(
                                  "absolute h-6 rounded-md px-2 flex items-center text-xs font-medium border shadow-xs overflow-hidden z-10 cursor-pointer hover:brightness-95 transition-all",
                                  pt.color
                                )}
                                style={{ left: `calc(${planData.leftPercent}% + 4px)`, width: `calc(${planData.widthPercent}% - 8px)` }}
                                onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                title={tooltipText}
                              >
                                <span className="truncate">{lot.products?.sku} - {process?.process_name}</span>
                              </div>
                            )}

                            {/* Mode 2: Actual Only */}
                            {timelineViewMode === 'actual' && actualData?.inView && (
                              <div
                                className={cn(
                                  "absolute h-6 rounded-md px-2 flex items-center text-xs font-bold border shadow-xs overflow-hidden z-10 cursor-pointer hover:brightness-95 transition-all text-white",
                                  actualData.status === 'DONE' ? "bg-emerald-600 border-emerald-700" : "bg-blue-600 border-blue-700 animate-pulse"
                                )}
                                style={{ left: `calc(${actualData.leftPercent}% + 4px)`, width: `calc(${actualData.widthPercent}% - 8px)` }}
                                onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                title={tooltipText}
                              >
                                <span className="truncate">{lot.products?.sku} - {process?.process_name} (จริง)</span>
                              </div>
                            )}

                            {/* Mode 3: Compare P vs A (Dual-Track Gantt Bars) */}
                            {timelineViewMode === 'compare' && (
                              <>
                                {/* Top Track: 🅿️ Plan Bar */}
                                {planData?.inView && (
                                  <div
                                    className="absolute top-1.5 h-5 rounded px-2 flex items-center font-bold text-[10px] border border-dashed border-indigo-400 bg-indigo-50/90 text-indigo-900 shadow-2xs overflow-hidden z-10 cursor-pointer hover:bg-indigo-100 transition-colors"
                                    style={{
                                      left: `calc(${planData.leftPercent}% + 4px)`,
                                      width: `calc(${planData.widthPercent}% - 8px)`,
                                      minWidth: isTimelineExpanded ? '90px' : '54px'
                                    }}
                                    onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                    title={tooltipText}
                                  >
                                    <span className="truncate">🅿️ แผน: {format(planData.start, 'dd/MM')}{planData.end > planData.start ? `-${format(planData.end, 'dd/MM')}` : ''}</span>
                                  </div>
                                )}

                                {/* Bottom Track: 🅰️ Actual Bar */}
                                {actualData?.inView ? (
                                  <div
                                    className={cn(
                                      "absolute bottom-1.5 h-5 rounded px-2 flex items-center font-bold text-[10px] border shadow-2xs overflow-hidden z-10 cursor-pointer hover:brightness-95 transition-all text-white",
                                      actualData.status === 'DONE'
                                        ? "bg-emerald-600 border-emerald-700"
                                        : "bg-blue-600 border-blue-700 animate-pulse"
                                    )}
                                    style={{
                                      left: `calc(${actualData.leftPercent}% + 4px)`,
                                      width: `calc(${actualData.widthPercent}% - 8px)`,
                                      minWidth: isTimelineExpanded ? '90px' : '54px'
                                    }}
                                    onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                    title={tooltipText}
                                  >
                                    <span className="truncate">
                                      🅰️ จริง: {format(actualData.start, 'dd/MM')}{actualData.end > actualData.start ? `-${format(actualData.end, 'dd/MM')}` : ''}
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
                                      onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                      title={tooltipText}
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
              })}
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
                    <span className="text-[10px] text-emerald-600 font-normal">คลิกเลือกวันใหม่</span>
                  </div>
                  <Input
                    type="date"
                    value={rescheduleModal.newDate || ''}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
                    className="h-8 text-xs bg-white border-emerald-400 font-bold text-emerald-800 focus:ring-emerald-500"
                  />
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
                  รายละเอียดเพิ่มเติม / หมายเหตุของฝ่ายวางแผน
                </Label>
                <Textarea
                  placeholder="เช่น BEC ขอเลื่อนส่ง Glycerin เป็น 21/09 หรือ หน้างานรอผล Micro Lab ก่อนบรรจุ"
                  value={rescheduleModal.reason}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
                  className="text-xs min-h-[70px] resize-none bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-slate-700 w-full sm:w-auto"
              onClick={handleQuickRescheduleWithoutReason}
            >
              ปรับวันโดยไม่บันทึกสาเหตุ
            </Button>
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

      {/* Timeline Print & PDF Export Modal (A4 Landscape) */}
      <TimelinePrintModal
        isOpen={isTimelinePrintOpen}
        onClose={() => setIsTimelinePrintOpen(false)}
        lots={lots}
        logs={logs}
        processes={processes}
        currentUser={activeUserIdentifier}
        initialDept={filterDept}
        initialOrderType={filterOrderType}
        initialShowHandovers={showShopfloorHandovers}
        initialViewMode={timelineViewMode}
      />
    </div>
  )
}
