'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Calendar, 
  Clock, 
  Truck, 
  Scale, 
  Beaker, 
  Package, 
  Gift, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Info, 
  Layers, 
  ListOrdered, 
  Compass, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Boxes,
  CalendarDays,
  Filter,
  Sun,
  Moon
} from 'lucide-react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { parseDelayInfo } from '@/lib/delayTracking'
import { parsePlanChangeInfo } from '@/lib/planTracking'
import { PlantDirectorAdvisory } from '@/components/dashboard/PlantDirectorAdvisory'

export interface RollingMasterRadarProps {
  startDateStr?: string
  onSelectLot?: (lotId: string) => void
  themeRadar?: 'night' | 'light'
  onToggleThemeRadar?: () => void
  themeDirector?: 'night' | 'light'
  onToggleThemeDirector?: () => void
  theme?: 'night' | 'light'
  onToggleTheme?: () => void
}

export interface OperationalStatus {
  badge: string
  shortBadge: string
  type: 'in_progress' | 'done' | 'qc_passed' | 'qc_waiting' | 'qc_issue' | 'delayed' | 'overdue' | 'planned'
  color: string
  dotColor: string
  startTimeStr?: string
  endTimeStr?: string
  note?: string
  detailsText?: string
}

interface StreamItem {
  id: string
  streamType: 'ETA' | 'WEIGHING' | 'MIXING' | 'PACKING' | 'FG_DUE'
  date: string
  title: string
  subtitle: string
  tag?: string
  quantity?: string | number
  status?: string
  lotNo?: string
  sku?: string
  lotId?: string
  meta?: any
  opStatus?: OperationalStatus
}

function computeOperationalStatus(
  item: any,
  streamType: 'ETA' | 'WEIGHING' | 'MIXING' | 'PACKING' | 'FG_DUE',
  cellDate: string,
  todayStr: string
): OperationalStatus {
  const formatTime = (tStr?: string) => {
    if (!tStr) return ''
    try {
      const d = new Date(tStr)
      return isNaN(d.getTime()) ? '' : format(d, 'HH:mm')
    } catch {
      return ''
    }
  }

  if (streamType === 'ETA') {
    const isReceived = item.status === 'RECEIVED' || item.status === 'READY'
    const isDelayed = item.meta?.isDelayed || item.status === 'DELAYED' || item.delayInfo?.isDelayed
    const isQcPassed = item.qc_status === 'PASSED'

    if (isReceived) {
      if (isQcPassed) {
        return {
          badge: '🛡️ QC Pass (ตรวจรับแล้ว)',
          shortBadge: 'QC Pass',
          type: 'qc_passed',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500',
          detailsText: 'รับสินค้าเข้าคลังและผ่านการตรวจ QC แล้ว'
        }
      }
      return {
        badge: '✅ ตรวจรับแล้ว',
        shortBadge: 'รับแล้ว',
        type: 'done',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotColor: 'bg-emerald-500',
        detailsText: 'รับสินค้าเข้าคลังเรียบร้อย'
      }
    }

    if (isDelayed) {
      return {
        badge: '⚠️ เลื่อนส่ง',
        shortBadge: 'เลื่อนส่ง',
        type: 'delayed',
        color: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotColor: 'bg-rose-500',
        detailsText: item.meta?.delayInfo?.categoryLabel || item.delayInfo?.categoryLabel || 'เลื่อนกำหนดส่งมอบ'
      }
    }

    if (cellDate < todayStr && !item.receive_date) {
      return {
        badge: '⚠️ เกินกำหนดเข้า',
        shortBadge: 'เกินกำหนด',
        type: 'overdue',
        color: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dotColor: 'bg-amber-500',
        detailsText: 'เกินกำหนดส่งตาม PO และยังไม่ได้รับสินค้า'
      }
    }

    return {
      badge: '📦 รอนำส่ง',
      shortBadge: 'รอนำส่ง',
      type: 'planned',
      color: 'bg-slate-50 text-slate-600 border-slate-200/80',
      dotColor: 'bg-slate-400'
    }
  }

  if (streamType === 'FG_DUE') {
    const lot = item.meta || item
    const cStatus = lot.current_status
    const qcCarton = lot.qc_fg_passed_carton_ranges

    if (cStatus === 'DONE') {
      return {
        badge: '✅ ส่งมอบ/ผลิตเสร็จ',
        shortBadge: 'ส่งมอบแล้ว',
        type: 'done',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotColor: 'bg-emerald-500',
        detailsText: 'ล็อตการผลิตนี้ผลิตเสร็จและปิดยอดเรียบร้อย'
      }
    }

    if (qcCarton && String(qcCarton).trim() !== '') {
      return {
        badge: '🛡️ FG QC Pass พร้อมส่ง',
        shortBadge: 'QC Pass',
        type: 'qc_passed',
        color: 'bg-teal-50 text-teal-700 border-teal-200/80',
        dotColor: 'bg-teal-500',
        detailsText: `ผ่านการตรวจปล่อย FG กล่องที่: ${qcCarton}`
      }
    }

    if (cStatus === 'IN_PROGRESS') {
      return {
        badge: '⚙️ กำลังผลิตในสายงาน',
        shortBadge: 'กำลังผลิต',
        type: 'in_progress',
        color: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotColor: 'bg-blue-500 animate-pulse',
        detailsText: 'กำลังดำเนินงานผลิตตามแผนงาน'
      }
    }

    const dueDate = lot.fg_due_date || cellDate
    if (dueDate < todayStr && cStatus !== 'DONE') {
      return {
        badge: '⚠️ เกินกำหนดส่งมอบ',
        shortBadge: 'เกินกำหนด',
        type: 'overdue',
        color: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotColor: 'bg-rose-500',
        detailsText: 'ยังผลิตไม่เสร็จและเลยกำหนดส่งมอบ FG แล้ว'
      }
    }

    return {
      badge: '📋 รอส่งมอบตามแผน',
      shortBadge: 'ตามแผน',
      type: 'planned',
      color: 'bg-slate-50 text-slate-600 border-slate-200/80',
      dotColor: 'bg-slate-400'
    }
  }

  // Manufacturing logs: WEIGHING, MIXING, PACKING
  const log = item.meta || item
  const procName = (log.processes?.process_name || '').toLowerCase()
  const status = (log.status || '').toUpperCase()
  const qcStatus = (log.qc_status || '').toUpperCase()
  const startTime = formatTime(log.start_time)
  const endTime = formatTime(log.end_time)
  const note = log.note || undefined

  const streamVerb = 
    streamType === 'WEIGHING' ? 'ชั่งสาร' : 
    streamType === 'MIXING' ? 'ผสม Bulk' : 'บรรจุ'

  const streamShortVerb = 
    streamType === 'WEIGHING' ? 'ชั่ง' : 
    streamType === 'MIXING' ? 'ผสม' : 'บรรจุ'

  // QC checks
  if (procName.includes('qc pass') || qcStatus === 'PASSED') {
    return {
      badge: `🛡️ QC Pass (${streamShortVerb})`,
      shortBadge: 'QC Pass',
      type: 'qc_passed',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dotColor: 'bg-emerald-500',
      startTimeStr: startTime,
      endTimeStr: endTime,
      note,
      detailsText: 'ผ่านการตรวจสอบคุณภาพ (QC Pass) เรียบร้อย'
    }
  }

  if (procName === 'รอ qc' || qcStatus === 'WAITING') {
    return {
      badge: '⏳ รอผลตรวจ QC',
      shortBadge: 'รอ QC',
      type: 'qc_waiting',
      color: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotColor: 'bg-amber-500',
      startTimeStr: startTime,
      note,
      detailsText: 'งานเสร็จแล้ว อยู่ระหว่างรอผลทดสอบแล็บ QC'
    }
  }

  if (procName.includes('qc hold') || qcStatus === 'HOLD') {
    return {
      badge: '⚠️ QC Hold (ระงับ)',
      shortBadge: 'QC Hold',
      type: 'qc_issue',
      color: 'bg-orange-50 text-orange-700 border-orange-200/80',
      dotColor: 'bg-orange-500',
      note,
      detailsText: 'ผลตรวจไม่สมบูรณ์ อยู่ระหว่างรอฝ่าย QC พิจารณา'
    }
  }

  if (procName.includes('qc reject') || qcStatus === 'REJECTED') {
    return {
      badge: '❌ QC Reject',
      shortBadge: 'QC Reject',
      type: 'qc_issue',
      color: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dotColor: 'bg-rose-500',
      note,
      detailsText: 'ไม่ผ่านเกณฑ์มาตรฐาน QC'
    }
  }

  // Active work
  if (status === 'IN_PROGRESS') {
    return {
      badge: `▶️ กำลัง${streamVerb}`,
      shortBadge: `กำลัง${streamShortVerb}`,
      type: 'in_progress',
      color: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-500 animate-pulse',
      startTimeStr: startTime,
      note,
      detailsText: startTime ? `หน้างานเริ่มแล้วเมื่อเวลา ${startTime} น.` : 'หน้างานกำลังดำเนินการ'
    }
  }

  // Completed work
  if (status === 'DONE' || status === 'COMPLETED') {
    let piecesText = ''
    if (log.piece_quantity) {
      piecesText = `ทำได้ ${Number(log.piece_quantity).toLocaleString()} ชิ้น`
    }
    return {
      badge: `✅ ${streamShortVerb}เสร็จแล้ว`,
      shortBadge: 'เสร็จสิ้น',
      type: 'done',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dotColor: 'bg-emerald-500',
      startTimeStr: startTime,
      endTimeStr: endTime,
      note,
      detailsText: [endTime ? `เสร็จเมื่อ ${endTime} น.` : '', piecesText].filter(Boolean).join(' • ') || 'ดำเนินการเสร็จสิ้นเรียบร้อย'
    }
  }

  // Rescheduled plan check
  const planInfo = parsePlanChangeInfo(log.note, log.activity_date)
  if (planInfo.isRescheduled) {
    const origStr = planInfo.originalDate ? new Date(planInfo.originalDate).toLocaleDateString('th-TH') : '-'
    const revStr = planInfo.revisedDate ? new Date(planInfo.revisedDate).toLocaleDateString('th-TH') : '-'
    return {
      badge: `🔄 เลื่อนแผน (${planInfo.categoryLabel || 'ปรับแผน'})`,
      shortBadge: 'เลื่อนแผน',
      type: 'planned',
      color: 'bg-purple-50 text-purple-700 border-purple-200/80',
      dotColor: 'bg-purple-500',
      startTimeStr: startTime,
      endTimeStr: endTime,
      note,
      detailsText: `แผนเดิม: ${origStr} ➔ แผนใหม่: ${revStr}${planInfo.reason ? ` (${planInfo.reason})` : ''}`
    }
  }

  // Waiting / Planned (Overdue past scheduled date)
  if (cellDate < todayStr) {
    return {
      badge: '⚠️ แผนค้าง (รอทบทวนวัน)',
      shortBadge: 'แผนค้าง',
      type: 'overdue',
      color: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotColor: 'bg-amber-500',
      detailsText: 'เลยวันตามแผนงานแล้ว กรุณาฝ่ายวางแผนทบทวนและปรับวันใหม่'
    }
  }

  return {
    badge: `📋 ตามแผน (รอ${streamShortVerb})`,
    shortBadge: 'ตามแผน',
    type: 'planned',
    color: 'bg-slate-50 text-slate-600 border-slate-200/80',
    dotColor: 'bg-slate-400'
  }
}

const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function RollingMasterRadar({ 
  startDateStr, 
  onSelectLot,
  themeRadar,
  onToggleThemeRadar,
  themeDirector,
  onToggleThemeDirector,
  theme,
  onToggleTheme
}: RollingMasterRadarProps) {
  const [internalRadarTheme, setInternalRadarTheme] = useState<'night' | 'light'>('light')
  const [internalDirectorTheme, setInternalDirectorTheme] = useState<'night' | 'light'>('night')

  useEffect(() => {
    try {
      const savedRadar = localStorage.getItem('cosmeflow_theme_21day')
      if (savedRadar === 'night' || savedRadar === 'light') {
        setInternalRadarTheme(savedRadar)
      }
      const savedDirector = localStorage.getItem('cosmeflow_theme_ai_director') || localStorage.getItem('cosmeflow_director_advisory_theme')
      if (savedDirector === 'night' || savedDirector === 'light') {
        setInternalDirectorTheme(savedDirector)
      }
    } catch {
      // ignore
    }
  }, [])

  const currentRadarTheme = themeRadar ?? (theme !== undefined ? theme : internalRadarTheme)
  const isNight = currentRadarTheme === 'night'

  const handleToggleRadar = () => {
    if (onToggleThemeRadar) {
      onToggleThemeRadar()
    } else if (onToggleTheme) {
      onToggleTheme()
    } else {
      const next = currentRadarTheme === 'night' ? 'light' : 'night'
      setInternalRadarTheme(next)
      try {
        localStorage.setItem('cosmeflow_theme_21day', next)
      } catch {
        // ignore
      }
    }
  }

  const currentDirectorTheme = themeDirector ?? internalDirectorTheme
  const handleToggleDirector = () => {
    if (onToggleThemeDirector) {
      onToggleThemeDirector()
    } else {
      const next = currentDirectorTheme === 'night' ? 'light' : 'night'
      setInternalDirectorTheme(next)
      try {
        localStorage.setItem('cosmeflow_theme_ai_director', next)
        localStorage.setItem('cosmeflow_director_advisory_theme', next)
      } catch {
        // ignore
      }
    }
  }

  const [viewMode, setViewMode] = useState<'timeline' | 'daily' | 'logistics'>('timeline')
  const [streamFilter, setStreamFilter] = useState<'ALL' | 'ETA' | 'WEIGHING' | 'MIXING' | 'PACKING' | 'FG_DUE'>('ALL')
  const [loading, setLoading] = useState(true)
  const [radarData, setRadarData] = useState<{
    etaList: any[]
    logsList: any[]
    fgDueLots: any[]
  }>({
    etaList: [],
    logsList: [],
    fgDueLots: []
  })
  const [selectedCell, setSelectedCell] = useState<{ dateStr: string; items: StreamItem[]; streamTitle: string } | null>(null)

  const supabase = createClient()

  // Base date (defaults to today or selected dashboardDate)
  const baseDate = useMemo(() => {
    return startDateStr ? parseISO(startDateStr) : new Date()
  }, [startDateStr])

  // 21-Day Horizon Array (Columns 1-6: Past 6 days, Column 7: Today [Index 6], Columns 8-21: Forward 14 days)
  const horizonDates = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const d = addDays(baseDate, i - 6)
      const isToday = i === 6
      const isPast = i < 6
      const isFuture = i > 6
      return {
        date: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        dayName: TH_DAYS[d.getDay()],
        dayNum: d.getDate(),
        monthName: TH_MONTHS[d.getMonth()],
        isToday,
        isPast,
        isFuture,
        dayOffset: i - 6
      }
    })
  }, [baseDate])

  const horizonStartStr = horizonDates[0]?.dateStr || ''
  const horizonEndStr = horizonDates[horizonDates.length - 1]?.dateStr || ''

  useEffect(() => {
    fetchRadarData()
  }, [horizonStartStr, horizonEndStr])

  const fetchRadarData = async () => {
    if (!horizonStartStr || !horizonEndStr) return
    setLoading(true)

    try {
      const [
        { data: etaData },
        { data: logsData },
        { data: lotsData }
      ] = await Promise.all([
        // 1. ETA RM/PM within 21 days
        supabase.from('production_lot_rms')
          .select('id, rm_code, rm_name, po_no, eta_date, status, qc_status, quantity, unit, supplier, bottom_remark, receive_date')
          .gte('eta_date', horizonStartStr)
          .lte('eta_date', horizonEndStr)
          .order('eta_date', { ascending: true }),

        // 2. Production Schedule (Weighing, Mixing, Packing, POF) across 21 days
        supabase.from('production_logs')
          .select(`
            id, status, activity_date, end_date, tank_start, tank_end, piece_quantity, note,
            start_time, end_time, qc_status, sub_step,
            processes (process_name),
            production_lots (
              id, lot_no, planned_quantity, order_quantity, total_tanks, current_status, qc_fg_passed_carton_ranges,
              products:sku_id (sku, product_name)
            )
          `)
          .or(`and(activity_date.lte.${horizonEndStr},end_date.gte.${horizonStartStr}),and(activity_date.lte.${horizonEndStr},activity_date.gte.${horizonStartStr}),and(activity_date.is.null,end_date.gte.${horizonStartStr},end_date.lte.${horizonEndStr})`)
          .order('activity_date', { ascending: true }),

        // 3. FG Due Date & Planned Deliveries (Active lots + Lots with due dates in horizon)
        supabase.from('production_lots')
          .select(`
            id, lot_no, fg_due_date, planned_start_date, planned_quantity, order_quantity, order_type, current_status, total_tanks, qc_fg_passed_carton_ranges,
            products:sku_id (sku, product_name)
          `)
          .or(`current_status.neq.DONE,and(fg_due_date.gte.${horizonStartStr},fg_due_date.lte.${horizonEndStr})`)
          .order('fg_due_date', { ascending: true })
      ])

      setRadarData({
        etaList: etaData || [],
        logsList: logsData || [],
        fgDueLots: lotsData || []
      })
    } catch (err) {
      console.error('Error fetching rolling radar data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group items by date and stream
  const { dateStreamMap, summaryCounts } = useMemo(() => {
    const map: Record<string, {
      ETA: StreamItem[]
      WEIGHING: StreamItem[]
      MIXING: StreamItem[]
      PACKING: StreamItem[]
      FG_DUE: StreamItem[]
    }> = {}

    horizonDates.forEach(d => {
      map[d.dateStr] = {
        ETA: [],
        WEIGHING: [],
        MIXING: [],
        PACKING: [],
        FG_DUE: []
      }
    })

    let totalEta = 0
    let totalWeighing = 0
    let totalMixing = 0
    let totalMixingTanks = 0
    let totalPacking = 0
    let totalFgDue = 0

    const todayDateStr = horizonDates[6]?.dateStr || format(new Date(), 'yyyy-MM-dd')

    // 1. Process ETA RM/PM
    radarData.etaList.forEach(item => {
       const d = item.eta_date
       if (map[d]) {
         totalEta++
         const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
         const isRescheduled = dInfo.isDelayed || item.status === 'DELAYED'
         const opStatus = computeOperationalStatus(item, 'ETA', d, todayDateStr)

         map[d].ETA.push({
           id: item.id,
           streamType: 'ETA',
           date: d,
           title: `${item.rm_code} (${item.quantity || 0} ${item.unit || ''})`,
           subtitle: item.rm_name || item.supplier || 'วัตถุดิบ/บรรจุภัณฑ์',
           tag: item.po_no ? `PO: ${item.po_no}` : undefined,
           quantity: item.quantity,
           status: item.status,
           meta: { ...item, delayInfo: dInfo, isDelayed: isRescheduled },
           opStatus
         })
       }
    })

    // 2. Process Production Logs (Multi-day date range support)
    radarData.logsList.forEach(log => {
      const pName = (log.processes?.process_name || '').toLowerCase()
      const lot = log.production_lots
      const sku = lot?.products?.sku || 'SKU'
      const pProductName = lot?.products?.product_name || ''
      const lotNo = lot?.lot_no || 'N/A'
      const startT = parseInt(log.tank_start) || 1
      const endT = parseInt(log.tank_end) || startT
      const tanksCount = Math.max(1, endT - startT + 1)

      const rawStart = log.activity_date || log.end_date
      const rawEnd = log.end_date || log.activity_date
      if (!rawStart && !rawEnd) return

      const effectiveStart = rawStart <= rawEnd ? rawStart : rawEnd
      const effectiveEnd = rawStart <= rawEnd ? rawEnd : rawStart
      const isMultiDay = effectiveStart !== effectiveEnd

      // Check if this task overlaps the 21-day horizon for summary counts (count each batch once)
      const overlapsHorizon = effectiveStart <= horizonEndStr && effectiveEnd >= horizonStartStr
      if (overlapsHorizon) {
        if (pName.includes('ชั่ง') || pName.includes('mm-rm')) {
          totalWeighing++
        } else if (pName.includes('ผสม') || pName.includes('mix')) {
          totalMixing++
          totalMixingTanks += tanksCount
        } else if (pName.includes('บรรจุ') || pName.includes('packing') || pName.includes('pof') || pName.includes('ลงลัง')) {
          totalPacking++
        }
      }

      // Populate every day in the horizon that falls within [effectiveStart, effectiveEnd]
      horizonDates.forEach(hd => {
        if (hd.dateStr >= effectiveStart && hd.dateStr <= effectiveEnd) {
          if (pName.includes('ชั่ง') || pName.includes('mm-rm')) {
            const opStatus = computeOperationalStatus(log, 'WEIGHING', hd.dateStr, todayDateStr)
            map[hd.dateStr].WEIGHING.push({
              id: `${log.id}-${hd.dateStr}`,
              streamType: 'WEIGHING',
              date: hd.dateStr,
              title: `${sku} • LOT ${lotNo}`,
              subtitle: pProductName || 'เตรียมและชั่งสารเคมี',
              tag: `ถัง ${startT}-${endT}`,
              lotNo,
              sku,
              lotId: lot?.id,
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay },
              opStatus
            })
          } else if (pName.includes('ผสม') || pName.includes('mix')) {
            const opStatus = computeOperationalStatus(log, 'MIXING', hd.dateStr, todayDateStr)
            map[hd.dateStr].MIXING.push({
              id: `${log.id}-${hd.dateStr}`,
              streamType: 'MIXING',
              date: hd.dateStr,
              title: `${sku} • LOT ${lotNo}`,
              subtitle: pProductName || 'ผสมเนื้อ Bulk',
              tag: `${tanksCount} ถัง (${startT}-${endT})`,
              lotNo,
              sku,
              lotId: lot?.id,
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay },
              opStatus
            })
          } else if (pName.includes('บรรจุ') || pName.includes('packing') || pName.includes('pof') || pName.includes('ลงลัง')) {
            const opStatus = computeOperationalStatus(log, 'PACKING', hd.dateStr, todayDateStr)
            map[hd.dateStr].PACKING.push({
              id: `${log.id}-${hd.dateStr}`,
              streamType: 'PACKING',
              date: hd.dateStr,
              title: `${sku} • LOT ${lotNo}`,
              subtitle: pProductName || 'บรรจุและแพ็คเกจจิ้ง',
              tag: log.piece_quantity ? `${Number(log.piece_quantity).toLocaleString()} ชิ้น` : `ถัง ${startT}-${endT}`,
              lotNo,
              sku,
              lotId: lot?.id,
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay },
              opStatus
            })
          }
        }
      })
    })

    // 3. Process FG Due & MTS Daily Delivery Ranges
    radarData.fgDueLots.forEach(lot => {
      const sku = lot.products?.sku || 'SKU'
      const qty = lot.planned_quantity || lot.order_quantity || 0
      const isMTS = lot.order_type === 'MTS'
      const startStr = lot.planned_start_date || lot.fg_due_date
      const endStr = lot.fg_due_date || lot.planned_start_date

      if (isMTS && (startStr || endStr)) {
        // MTS Range: Delivery occurs on every day within [startStr, endStr]
        const effectiveStart = startStr || endStr
        const effectiveEnd = endStr || startStr

        horizonDates.forEach(hd => {
          if (hd.dateStr >= effectiveStart && hd.dateStr <= effectiveEnd) {
            totalFgDue++
            const opStatus = computeOperationalStatus(lot, 'FG_DUE', hd.dateStr, todayDateStr)
            map[hd.dateStr].FG_DUE.push({
              id: `${lot.id}-${hd.dateStr}`,
              streamType: 'FG_DUE',
              date: hd.dateStr,
              title: `${sku} • LOT ${lot.lot_no}`,
              subtitle: lot.products?.product_name || 'ส่งมอบ FG ประจำวัน (MTS Rolling)',
              tag: `MTS (${Number(qty).toLocaleString()} ชิ้น)`,
              quantity: qty,
              lotNo: lot.lot_no,
              sku,
              lotId: lot.id,
              meta: { ...lot, isMtsRange: true },
              opStatus
            })
          }
        })
      } else if (lot.fg_due_date && map[lot.fg_due_date]) {
        // MTO / Single Due Date
        totalFgDue++
        const opStatus = computeOperationalStatus(lot, 'FG_DUE', lot.fg_due_date, todayDateStr)
        map[lot.fg_due_date].FG_DUE.push({
          id: lot.id,
          streamType: 'FG_DUE',
          date: lot.fg_due_date,
          title: `${sku} • LOT ${lot.lot_no}`,
          subtitle: lot.products?.product_name || 'กำหนดส่งมอบ FG ปิดออเดอร์',
          tag: `${Number(qty).toLocaleString()} ชิ้น`,
          quantity: qty,
          lotNo: lot.lot_no,
          sku,
          lotId: lot.id,
          meta: lot,
          opStatus
        })
      }
    })

    return {
      dateStreamMap: map,
      summaryCounts: {
        totalEta,
        totalWeighing,
        totalMixing,
        totalMixingTanks,
        totalPacking,
        totalFgDue
      }
    }
  }, [horizonDates, radarData])

  const streamsConfig = [
    {
      key: 'ETA' as const,
      label: '1. ของเข้า (ETA RM/PM)',
      shortLabel: 'ของเข้า RM/PM',
      icon: Truck,
      color: 'text-amber-700',
      bgColor: 'bg-amber-500/10',
      badgeBorder: 'border-amber-300',
      pillColor: 'bg-amber-100/90 text-amber-900 border-amber-300/80 hover:bg-amber-200'
    },
    {
      key: 'WEIGHING' as const,
      label: '2. ชั่งสาร (MM-RM)',
      shortLabel: 'เตรียม/ชั่งสาร',
      icon: Scale,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-500/10',
      badgeBorder: 'border-indigo-300',
      pillColor: 'bg-indigo-100/90 text-indigo-900 border-indigo-300/80 hover:bg-indigo-200'
    },
    {
      key: 'MIXING' as const,
      label: '3. งานผสม (Bulk Mixing)',
      shortLabel: 'งานผสม Bulk',
      icon: Beaker,
      color: 'text-blue-700',
      bgColor: 'bg-blue-500/10',
      badgeBorder: 'border-blue-300',
      pillColor: 'bg-blue-100/90 text-blue-900 border-blue-300/80 hover:bg-blue-200'
    },
    {
      key: 'PACKING' as const,
      label: '4. ไลน์บรรจุ & POF',
      shortLabel: 'บรรจุ/แพ็คกิ้ง',
      icon: Package,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-300',
      pillColor: 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80 hover:bg-emerald-200'
    },
    {
      key: 'FG_DUE' as const,
      label: '5. กำหนดส่งมอบ (Due FG)',
      shortLabel: 'ส่งมอบ FG',
      icon: Gift,
      color: 'text-rose-700',
      bgColor: 'bg-rose-500/10',
      badgeBorder: 'border-rose-300',
      pillColor: 'bg-rose-100/90 text-rose-900 border-rose-300/80 hover:bg-rose-200'
    }
  ]

  const activeStreams = streamFilter === 'ALL' 
    ? streamsConfig 
    : streamsConfig.filter(s => s.key === streamFilter)

  return (
    <div className="space-y-6">
      <Card className={`border-[#D4AF37]/35 shadow-2xl rounded-2xl overflow-hidden relative transition-colors duration-300 ${
        isNight ? 'bg-[#0B132B] text-slate-100' : 'bg-white text-[#4A4238]'
      }`}>
      {/* Decorative Gold Accent Bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37]"></div>

      {/* Radar Master Header */}
      <CardHeader className={`border-b border-[#D4AF37]/25 p-5 md:p-6 transition-colors duration-300 ${
        isNight ? 'bg-[#0F172A]' : 'bg-gradient-to-b from-[#FAF8F5] to-white'
      }`}>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/30 text-[#8B7355] shadow-xs shrink-0">
                <Compass className="w-6 h-6 text-[#D4AF37] animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className={`text-xl md:text-2xl font-black whitespace-nowrap tracking-tight ${isNight ? 'text-white' : 'text-[#4A4238]'}`}>
                    21-Day Rolling Master Radar
                  </h2>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                    เรดาร์แผนงาน 3 สัปดาห์ (ย้อนหลัง 7 วัน + ล่วงหน้า 14 วัน)
                  </span>
                </div>
                <div className={`text-xs font-medium flex flex-wrap items-center gap-2 mt-1 ${isNight ? 'text-slate-300' : 'text-[#8B7355]'}`}>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
                    <span>
                      หน้าต่างแผนงาน: <strong className={isNight ? 'text-amber-300' : 'text-[#4A4238]'}>{horizonDates[0]?.dayNum} {horizonDates[0]?.monthName}</strong> ➔ <strong className={isNight ? 'text-amber-300' : 'text-[#4A4238]'}>{horizonDates[20]?.dayNum} {horizonDates[20]?.monthName} 2026</strong>
                    </span>
                  </div>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ซิงค์อัตโนมัติทุกวัน (Auto Rolling)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* View Switcher Controls & Theme Toggle */}
          <div className="flex flex-wrap items-center gap-2 self-stretch xl:self-auto shrink-0">
            {/* Change Theme Button (21-Day Radar) */}
            {handleToggleRadar && (
              <button
                type="button"
                onClick={handleToggleRadar}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 border cursor-pointer select-none ${
                  isNight
                    ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700 hover:text-amber-200 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900 shadow-xs'
                }`}
                title={isNight ? 'เปลี่ยนเป็นโหมดสว่าง (21-Day Radar)' : 'เปลี่ยนเป็นโหมดมืด (21-Day Radar)'}
              >
                {isNight ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>โหมดสว่าง (Light)</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>โหมดมืด (Night)</span>
                  </>
                )}
              </button>
            )}

            {/* View Mode Buttons */}
            <div className={`flex items-center p-1 rounded-xl border shadow-inner ${
              isNight ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-100/90 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'timeline'
                    ? (isNight ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700' : 'bg-white text-[#4A4238] shadow-sm border border-slate-200')
                    : (isNight ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-[#4A4238]')
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
                Timeline Horizon
              </button>
              <button
                type="button"
                onClick={() => setViewMode('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'daily'
                    ? (isNight ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700' : 'bg-white text-[#4A4238] shadow-sm border border-slate-200')
                    : (isNight ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-[#4A4238]')
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 text-[#D4AF37]" />
                Daily Worklist
              </button>
              <button
                type="button"
                onClick={() => setViewMode('logistics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'logistics'
                    ? (isNight ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700' : 'bg-white text-[#4A4238] shadow-sm border border-slate-200')
                    : (isNight ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-[#4A4238]')
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                ETA Logistics
              </button>
            </div>

            {/* Stream Filter Pills */}
            <div className={`flex flex-wrap items-center gap-1 p-1 rounded-xl border text-xs ${
              isNight ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <span className={`text-[10px] font-bold px-1.5 ${isNight ? 'text-slate-400' : 'text-slate-400'}`}>สายงาน:</span>
              {(['ALL', 'ETA', 'WEIGHING', 'MIXING', 'PACKING', 'FG_DUE'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStreamFilter(f)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                    streamFilter === f
                      ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs'
                      : (isNight ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
                  }`}
                >
                  {f === 'ALL' ? 'ทั้งหมด' : f === 'ETA' ? 'ของเข้า' : f === 'WEIGHING' ? 'ชั่ง' : f === 'MIXING' ? 'ผสม' : f === 'PACKING' ? 'บรรจุ' : 'ส่งมอบ'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 21-Day Executive Summary Chips */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-4 pt-4 border-t ${
          isNight ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
          }`}>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              <div>
                <div className={`text-[10px] font-medium ${isNight ? 'text-amber-300' : 'text-amber-700'}`}>ของเข้า RM/PM (21 วัน)</div>
                <div className={`text-sm font-black ${isNight ? 'text-amber-100' : 'text-amber-900'}`}>{summaryCounts.totalEta} รายการ</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200' : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900'
          }`}>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-400" />
              <div>
                <div className={`text-[10px] font-medium ${isNight ? 'text-indigo-300' : 'text-indigo-700'}`}>เตรียม/ชั่งสาร (21 วัน)</div>
                <div className={`text-sm font-black ${isNight ? 'text-indigo-100' : 'text-indigo-900'}`}>{summaryCounts.totalWeighing} รอบงาน</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-blue-950/40 border-blue-800/60 text-blue-200' : 'bg-blue-50/70 border-blue-200/80 text-blue-900'
          }`}>
            <div className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-blue-400" />
              <div>
                <div className={`text-[10px] font-medium ${isNight ? 'text-blue-300' : 'text-blue-700'}`}>งานผสม Bulk (21 วัน)</div>
                <div className={`text-sm font-black ${isNight ? 'text-blue-100' : 'text-blue-900'}`}>{summaryCounts.totalMixingTanks} ถัง ({summaryCounts.totalMixing} รอบ)</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <div>
                <div className={`text-[10px] font-medium ${isNight ? 'text-emerald-300' : 'text-emerald-700'}`}>ไลน์บรรจุ & POF (21 วัน)</div>
                <div className={`text-sm font-black ${isNight ? 'text-emerald-100' : 'text-emerald-900'}`}>{summaryCounts.totalPacking} รอบงาน</div>
              </div>
            </div>
          </div>

          <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-400" />
              <div>
                <div className={`text-[10px] font-medium ${isNight ? 'text-rose-300' : 'text-rose-700'}`}>กำหนดส่งมอบ FG (21 วัน)</div>
                <div className={`text-sm font-black ${isNight ? 'text-rose-100' : 'text-rose-900'}`}>{summaryCounts.totalFgDue} ล็อต</div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        {loading ? (
          <div className={`p-12 text-center ${isNight ? 'text-slate-400' : 'text-slate-400'}`}>
            <Compass className="w-8 h-8 mx-auto mb-3 animate-spin text-[#D4AF37]" />
            กำลังจัดทำเรดาร์แผนงาน 21 วัน (ย้อนหลัง 7 วัน + ล่วงหน้า 14 วัน)...
          </div>
        ) : (
          <>
            {/* VIEW 1: TIMELINE HORIZON (MATRIX GRID) */}
            {viewMode === 'timeline' && (
              <div className="space-y-2">
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-amber-200">
                  <div className={`min-w-[1500px] border rounded-2xl overflow-hidden shadow-xs ${
                    isNight ? 'border-slate-800 bg-[#0B132B]' : 'border-slate-200 bg-white'
                  }`}>
                    {/* Header: 21 Days (Column 7 is Today) */}
                    <div className={`grid grid-cols-[160px_repeat(21,minmax(60px,1fr))] border-b text-center font-bold text-xs ${
                      isNight ? 'bg-[#0F172A] border-slate-800 text-slate-200' : 'bg-[#F9F7F2] border-slate-200 text-slate-700'
                    }`}>
                      <div className={`p-3 text-left font-bold border-r flex items-center gap-1.5 ${
                        isNight ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                      }`}>
                        <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> สายงาน / วันที่
                      </div>
                      {horizonDates.map((d, idx) => (
                        <div
                          key={d.dateStr}
                          className={`p-2 border-r flex flex-col items-center justify-center transition-colors ${
                            isNight
                              ? d.isToday
                                ? 'bg-amber-950/80 text-amber-200 ring-2 ring-inset ring-[#D4AF37] shadow-sm z-10 border-slate-700'
                                : d.isPast
                                ? 'bg-slate-900/60 text-slate-400 border-slate-800'
                                : idx % 2 === 0
                                ? 'bg-slate-900/40 text-slate-200 border-slate-800'
                                : 'bg-slate-900/20 text-slate-300 border-slate-800'
                              : d.isToday
                              ? 'bg-amber-100/90 text-amber-900 ring-2 ring-inset ring-[#D4AF37] shadow-sm z-10 border-slate-200/80'
                              : d.isPast
                              ? 'bg-slate-100/50 text-slate-600 border-slate-200/80'
                              : idx % 2 === 0
                              ? 'bg-white border-slate-200/80'
                              : 'bg-slate-50/50 border-slate-200/80'
                          }`}
                        >
                          <div className="text-[10px] font-semibold uppercase">
                            {d.isToday ? (
                              <span className={`font-bold flex items-center gap-0.5 ${isNight ? 'text-amber-300' : 'text-amber-800'}`}>📍 วันนี้</span>
                            ) : d.isPast ? (
                              <span className={isNight ? 'text-slate-400' : 'text-slate-400'}>{d.dayName}</span>
                            ) : (
                              <span className={isNight ? 'text-slate-300' : 'text-slate-500'}>{d.dayName}</span>
                            )}
                          </div>
                          <div className={`text-sm font-black ${
                            d.isToday 
                              ? (isNight ? 'text-amber-300 scale-110' : 'text-amber-950 scale-110') 
                              : (isNight ? 'text-slate-100' : 'text-[#4A4238]')
                          }`}>
                            {d.dayNum}
                          </div>
                          <div className={`text-[9px] font-medium ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                            {d.monthName}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Stream Rows */}
                    <div className={`divide-y text-xs ${isNight ? 'divide-slate-800/80' : 'divide-slate-200/80'}`}>
                      {activeStreams.map(stream => {
                        const Icon = stream.icon
                        return (
                          <div
                            key={stream.key}
                            className={`grid grid-cols-[160px_repeat(21,minmax(60px,1fr))] items-stretch transition-colors ${
                              isNight ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/40'
                            }`}
                          >
                            {/* Stream Name Header */}
                            <div className={`p-3 font-bold border-r flex items-center gap-2 ${
                              isNight ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                            } ${stream.color}`}>
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate text-xs">{stream.shortLabel}</span>
                            </div>

                            {/* 21 Day Cells */}
                            {horizonDates.map(d => {
                              const items = dateStreamMap[d.dateStr]?.[stream.key] || []
                              const hasItems = items.length > 0
                              const hasDelayed = items.some(it => it.opStatus?.type === 'delayed' || it.opStatus?.type === 'overdue')
                              const hasInProgress = items.some(it => it.opStatus?.type === 'in_progress')
                              const allDone = items.length > 0 && items.every(it => it.opStatus?.type === 'done' || it.opStatus?.type === 'qc_passed')

                              return (
                                <div
                                  key={d.dateStr}
                                  className={`p-1.5 border-r border-slate-200/80 flex flex-col items-center justify-center min-h-[64px] transition-all ${
                                    d.isToday ? 'bg-amber-50/40' : d.isPast ? 'bg-slate-50/30' : ''
                                  }`}
                                >
                                  {hasItems ? (
                                    <Popover>
                                      <PopoverTrigger
                                        className={`w-full h-full p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-center shadow-2xs transition-transform hover:scale-105 active:scale-95 relative ${
                                          hasDelayed
                                            ? 'bg-amber-100/95 text-amber-950 border-amber-400 font-bold'
                                            : hasInProgress
                                            ? 'bg-blue-50/90 text-blue-950 border-blue-400/80 font-bold ring-1 ring-blue-300'
                                            : allDone
                                            ? 'bg-emerald-50/90 text-emerald-950 border-emerald-300 font-medium'
                                            : stream.pillColor
                                        }`}
                                      >
                                        {hasInProgress && (
                                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" title="กำลังดำเนินการ (In Progress)" />
                                        )}
                                        <span className="font-extrabold text-[11px] leading-tight flex items-center justify-center gap-1">
                                          {hasDelayed && (
                                            <span className="text-[10px]" title="มีรายการล่าช้า/เลื่อนส่ง">⚠️</span>
                                          )}
                                          {hasInProgress && !hasDelayed && (
                                            <span className="text-[9px] text-blue-700 font-bold" title="กำลังดำเนินการ">▶</span>
                                          )}
                                          {allDone && (
                                            <span className="text-[9px] text-emerald-700 font-bold" title="เสร็จสิ้นทั้งหมด">✓</span>
                                          )}
                                          <span>
                                            {items.length === 1
                                              ? items[0].tag || items[0].lotNo || '1 งาน'
                                              : `${items.length} รายการ`}
                                          </span>
                                        </span>
                                        {items.length === 1 && items[0].lotNo && (
                                          <span className="text-[9px] opacity-80 truncate max-w-[55px]">
                                            {items[0].sku}
                                          </span>
                                        )}
                                      </PopoverTrigger>

                                      <PopoverContent
                                        className="w-[360px] sm:w-[480px] max-w-[95vw] p-4 bg-white border border-[#D4AF37]/40 shadow-2xl rounded-2xl z-50 text-xs text-[#4A4238]"
                                        align="center"
                                      >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                                          <div className="font-bold flex items-center gap-2 text-sm">
                                            <Icon className={`w-4 h-4 ${stream.color}`} />
                                            <span>{stream.shortLabel}</span>
                                            <span className="text-xs font-bold text-slate-500">({items.length} รายการ)</span>
                                          </div>
                                          <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                            {d.dayName} {d.dayNum} {d.monthName}
                                          </span>
                                        </div>

                                        <div className="space-y-2">
                                          {items.map((it, itIdx) => {
                                            const isDelayedItem = it.streamType === 'ETA' && it.meta?.isDelayed
                                            const delayInfo = it.meta?.delayInfo
                                            return (
                                              <div
                                                key={it.id || itIdx}
                                                className={`p-2.5 rounded-xl border space-y-1.5 transition ${
                                                  isDelayedItem 
                                                    ? 'bg-amber-50/70 border-amber-300/90 hover:bg-amber-100/50' 
                                                    : it.opStatus?.type === 'in_progress'
                                                    ? 'bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/70'
                                                    : it.opStatus?.type === 'done' || it.opStatus?.type === 'qc_passed'
                                                    ? 'bg-emerald-50/30 border-emerald-200/80 hover:bg-emerald-50/60'
                                                    : 'bg-slate-50 border-slate-200/80 hover:bg-amber-50/50'
                                                }`}
                                              >
                                                <div className="flex justify-between items-start gap-2">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <strong className="text-[#4A4238] font-bold text-xs leading-snug">{it.title}</strong>
                                                    {it.opStatus && (
                                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${it.opStatus.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${it.opStatus.dotColor} shrink-0`}></span>
                                                        <span>{it.opStatus.badge}</span>
                                                      </span>
                                                    )}
                                                  </div>
                                                  {it.tag && (
                                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300/60 px-1.5 py-0.5 rounded-md shrink-0">
                                                      {it.tag}
                                                    </span>
                                                  )}
                                                </div>
                                                
                                                <div className="text-[11px] text-slate-600 leading-normal font-medium">
                                                  {it.subtitle}
                                                </div>

                                                {/* Dedicated Delay Warning Box (for ETA items) */}
                                                {isDelayedItem && (
                                                  <div className="p-2 rounded-lg bg-white/95 border border-amber-200 text-amber-900 text-[10px] space-y-1 mt-1 shadow-xs">
                                                    <div className="font-bold flex items-center justify-between gap-1 text-rose-800 flex-wrap">
                                                      <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                                        <span>สาเหตุ: {delayInfo?.categoryLabel || 'เลื่อนกำหนดส่งมอบ'}</span>
                                                      </span>
                                                      {delayInfo?.originalEta && (
                                                        <span className="text-[9px] text-slate-500 font-normal">
                                                          (กำหนดเดิมตาม PO: {new Date(delayInfo.originalEta).toLocaleDateString('th-TH')})
                                                        </span>
                                                      )}
                                                    </div>
                                                    {delayInfo?.reason && (
                                                      <div className="text-slate-600 pl-2.5 text-[10px] italic border-l-2 border-amber-300">
                                                        &ldquo;{delayInfo.reason}&rdquo;
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Operational Progress / Timestamp Info Box */}
                                                {it.streamType !== 'ETA' && (it.opStatus?.startTimeStr || it.opStatus?.endTimeStr || it.opStatus?.note || it.opStatus?.detailsText) && (
                                                  <div className={`p-2 rounded-lg border text-[10px] space-y-1 mt-1 shadow-xs ${
                                                    it.opStatus.type === 'in_progress' 
                                                      ? 'bg-white/95 border-blue-200 text-blue-900' 
                                                      : it.opStatus.type === 'done' || it.opStatus.type === 'qc_passed'
                                                      ? 'bg-white/95 border-emerald-200 text-emerald-900'
                                                      : it.opStatus.type === 'overdue'
                                                      ? 'bg-white/95 border-rose-200 text-rose-900'
                                                      : 'bg-white/95 border-slate-200 text-slate-700'
                                                  }`}>
                                                    <div className="flex items-center justify-between gap-2 flex-wrap font-medium">
                                                      <div className="flex items-center gap-2">
                                                        {it.opStatus.startTimeStr && (
                                                          <span className="flex items-center gap-1 text-slate-700">
                                                            <Clock className="w-3 h-3 text-blue-500" />
                                                            <span>เริ่ม: <strong>{it.opStatus.startTimeStr} น.</strong></span>
                                                          </span>
                                                        )}
                                                        {it.opStatus.endTimeStr && (
                                                          <span className="flex items-center gap-1 text-slate-700">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            <span>เสร็จ: <strong>{it.opStatus.endTimeStr} น.</strong></span>
                                                          </span>
                                                        )}
                                                      </div>
                                                      {it.opStatus.detailsText && (
                                                        <span className="text-[9px] text-slate-500">{it.opStatus.detailsText}</span>
                                                      )}
                                                    </div>
                                                    {it.opStatus.note && (
                                                      <div className="text-slate-600 pl-2 text-[10px] italic border-l-2 border-slate-300">
                                                        &ldquo;{it.opStatus.note}&rdquo;
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {it.meta?.isMultiDay && (
                                                  <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded px-2 py-0.5 w-fit font-medium flex items-center gap-1.5 mt-0.5">
                                                    <CalendarDays className="w-3 h-3 text-[#D4AF37]" />
                                                    <span>ช่วงแผน: {format(parseISO(it.meta.startDate), 'd MMM')} - {format(parseISO(it.meta.endDate), 'd MMM yyyy')}</span>
                                                  </div>
                                                )}
                                                {it.lotId && onSelectLot && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onSelectLot(it.lotId!)}
                                                    className="text-[10px] text-[#8B7355] font-bold hover:underline flex items-center gap-1 pt-1"
                                                  >
                                                    ดูกราฟล็อตนี้ <ChevronRight className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    <span className="text-slate-300 text-xs font-light">-</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: DAILY AGENDA WORKLIST */}
            {viewMode === 'daily' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {horizonDates.map((d) => {
                    const dayEta = dateStreamMap[d.dateStr]?.ETA || []
                    const dayWeighing = dateStreamMap[d.dateStr]?.WEIGHING || []
                    const dayMixing = dateStreamMap[d.dateStr]?.MIXING || []
                    const dayPacking = dateStreamMap[d.dateStr]?.PACKING || []
                    const dayFgDue = dateStreamMap[d.dateStr]?.FG_DUE || []

                    const totalDayTasks = dayEta.length + dayWeighing.length + dayMixing.length + dayPacking.length + dayFgDue.length

                    if (totalDayTasks === 0) return null

                    return (
                      <div
                        key={d.dateStr}
                        className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
                          d.isToday
                            ? 'bg-amber-50/40 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                            : d.isPast
                            ? 'bg-slate-50/60 border-slate-200/80'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                              d.isToday ? 'bg-[#D4AF37] text-white' : d.isPast ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {d.isToday ? '📍 วันนี้' : `${d.dayName} ${d.dayNum} ${d.monthName}`}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {d.isToday ? 'Day 0 (วันนี้)' : d.isPast ? `ย้อนหลัง ${Math.abs(d.dayOffset)} วัน` : `+${d.dayOffset} วัน`}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {totalDayTasks} กิจกรรม
                          </span>
                        </div>

                        {/* Stream Breakdown Inside Day */}
                        <div className="space-y-2 text-xs">
                          {/* ETA */}
                          {dayEta.length > 0 && (
                            <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                              <div className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                                <Truck className="w-3.5 h-3.5 text-amber-700" />
                                <span>ของเข้า ({dayEta.length} รายการ)</span>
                              </div>
                              {dayEta.map(e => (
                                <div key={e.id} className="text-[11px] text-amber-800 pl-5 flex items-center justify-between gap-1 flex-wrap">
                                  <div>
                                    • <strong>{e.title}</strong> - <span className="text-amber-700">{e.subtitle}</span>
                                  </div>
                                  {e.opStatus && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${e.opStatus.color}`}>
                                      {e.opStatus.shortBadge}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Weighing */}
                          {dayWeighing.length > 0 && (
                            <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-200/70 space-y-1">
                              <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-[11px]">
                                <Scale className="w-3.5 h-3.5 text-indigo-700" />
                                <span>เตรียม/ชั่งสาร ({dayWeighing.length} ล็อต)</span>
                              </div>
                              {dayWeighing.map(w => (
                                <div key={w.id} className="text-[11px] text-indigo-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{w.title}</strong> ({w.tag})</span>
                                    {w.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${w.opStatus.color}`}>
                                        {w.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                  {w.meta?.isMultiDay && (
                                    <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                      {format(parseISO(w.meta.startDate), 'd/M')}-{format(parseISO(w.meta.endDate), 'd/M')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Mixing */}
                          {dayMixing.length > 0 && (
                            <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200/70 space-y-1">
                              <div className="font-bold text-blue-900 flex items-center gap-1.5 text-[11px]">
                                <Beaker className="w-3.5 h-3.5 text-blue-700" />
                                <span>งานผสม Bulk ({dayMixing.length} ล็อต)</span>
                              </div>
                              {dayMixing.map(m => (
                                <div key={m.id} className="text-[11px] text-blue-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{m.title}</strong> <span className="text-blue-600">[{m.tag}]</span></span>
                                    {m.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${m.opStatus.color}`}>
                                        {m.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                  {m.meta?.isMultiDay && (
                                    <span className="text-[9px] text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                      {format(parseISO(m.meta.startDate), 'd/M')}-{format(parseISO(m.meta.endDate), 'd/M')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Packing */}
                          {dayPacking.length > 0 && (
                            <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
                              <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px]">
                                <Package className="w-3.5 h-3.5 text-emerald-700" />
                                <span>ไลน์บรรจุ & POF ({dayPacking.length} ล็อต)</span>
                              </div>
                              {dayPacking.map(p => (
                                <div key={p.id} className="text-[11px] text-emerald-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{p.title}</strong> <span className="text-emerald-700 font-semibold">{p.tag}</span></span>
                                    {p.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${p.opStatus.color}`}>
                                        {p.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                  {p.meta?.isMultiDay && (
                                    <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                      {format(parseISO(p.meta.startDate), 'd/M')}-{format(parseISO(p.meta.endDate), 'd/M')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* FG Due */}
                          {dayFgDue.length > 0 && (
                            <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200/70 space-y-1">
                              <div className="font-bold text-rose-900 flex items-center gap-1.5 text-[11px]">
                                <Gift className="w-3.5 h-3.5 text-rose-700" />
                                <span>กำหนดส่งมอบ FG ({dayFgDue.length} ล็อต)</span>
                              </div>
                              {dayFgDue.map(f => (
                                <div key={f.id} className="text-[11px] text-rose-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{f.title}</strong> <span className="text-rose-700 font-bold">[{f.tag}]</span></span>
                                    {f.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${f.opStatus.color}`}>
                                        {f.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: ETA LOGISTICS (SUPPLY CHAIN VIEW) */}
            {viewMode === 'logistics' && (
              <div className="space-y-3">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-[#4A4238]">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span>รายการวัตถุดิบและบรรจุภัณฑ์รอเข้าโรงงาน (ETA Supply Chain 21 วัน)</span>
                    </div>
                    <span className="text-slate-500 font-semibold">ทั้งหมด {radarData.etaList.length} รายการ</span>
                  </div>

                  {radarData.etaList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      ไม่มีกำหนดการของเข้าในช่วง 21 วันนี้
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {radarData.etaList.map((item, idx) => {
                        const etaD = parseISO(item.eta_date)
                        const isToday = isSameDay(etaD, baseDate)
                        const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
                        const isDelayed = dInfo.isDelayed || item.status === 'DELAYED'

                        return (
                          <div
                            key={item.id || idx}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition ${
                              isToday ? 'bg-amber-50/50' : ''
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <div className={`p-2 rounded-xl text-center shrink-0 min-w-[50px] ${
                                isToday ? 'bg-[#D4AF37] text-white font-bold' : 'bg-slate-100 text-slate-700'
                              }`}>
                                <div className="text-[9px] font-semibold">{TH_DAYS[etaD.getDay()]}</div>
                                <div className="text-sm font-black">{etaD.getDate()}</div>
                                <div className="text-[9px]">{TH_MONTHS[etaD.getMonth()]}</div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-[#4A4238] text-sm">{item.rm_code}</span>
                                  {item.po_no && (
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                      PO: {item.po_no}
                                    </span>
                                  )}
                                  {isDelayed && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                      ⚠️ เลื่อนส่ง: {dInfo.categoryLabel || 'แจ้งเลื่อน'}
                                    </span>
                                  )}
                                  {isToday && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                      เข้าวันนี้
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>{item.rm_name || item.supplier || 'ไม่ระบุชื่อ'}</span>
                                  {isDelayed && dInfo.originalEta && (
                                    <span className="text-[10px] text-slate-400 line-through">
                                      (PO เดิม: {new Date(dInfo.originalEta).toLocaleDateString('th-TH')})
                                    </span>
                                  )}
                                </div>
                                {isDelayed && dInfo.reason && (
                                  <div className="text-[10px] text-amber-800 mt-1 italic bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 inline-block">
                                    เหตุผล: {dInfo.reason}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 sm:self-center pl-14 sm:pl-0">
                              <div className="text-right">
                                <div className="font-black text-[#4A4238] text-sm">
                                  {Number(item.quantity || 0).toLocaleString()} {item.unit || 'หน่วย'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {item.supplier ? `Supplier: ${item.supplier}` : 'รอรับเข้าคลัง RM'}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.status === 'RECEIVED' && item.qc_status === 'PASSED' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                                    🛡️ QC Pass
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                  item.status === 'RECEIVED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {item.status === 'RECEIVED' ? '✓ รับแล้ว' : '⏳ รอส่งมอบ'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>

    {/* AI Plant Director Strategic Directives & Advisory Panel */}
    <PlantDirectorAdvisory
      etaList={radarData.etaList}
      logsList={radarData.logsList}
      fgDueLots={radarData.fgDueLots}
      horizonDates={horizonDates}
      onSelectLot={onSelectLot}
      theme={currentDirectorTheme}
      onToggleTheme={handleToggleDirector}
    />
  </div>
  )
}
