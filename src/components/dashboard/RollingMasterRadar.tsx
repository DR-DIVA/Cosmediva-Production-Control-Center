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
  Filter
} from 'lucide-react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { parseDelayInfo } from '@/lib/delayTracking'

interface RollingMasterRadarProps {
  startDateStr?: string
  onSelectLot?: (lotId: string) => void
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
}

const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function RollingMasterRadar({ startDateStr, onSelectLot }: RollingMasterRadarProps) {
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
            processes (process_name),
            production_lots (
              id, lot_no, planned_quantity, order_quantity, total_tanks,
              products:sku_id (sku, product_name)
            )
          `)
          .or(`and(activity_date.lte.${horizonEndStr},end_date.gte.${horizonStartStr}),and(activity_date.lte.${horizonEndStr},activity_date.gte.${horizonStartStr}),and(activity_date.is.null,end_date.gte.${horizonStartStr},end_date.lte.${horizonEndStr})`)
          .order('activity_date', { ascending: true }),

        // 3. FG Due Date & Planned Deliveries (Active lots + Lots with due dates in horizon)
        supabase.from('production_lots')
          .select(`
            id, lot_no, fg_due_date, planned_start_date, planned_quantity, order_quantity, order_type, current_status, total_tanks,
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

    // 1. Process ETA RM/PM
    radarData.etaList.forEach(item => {
       const d = item.eta_date
       if (map[d]) {
         totalEta++
         const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
         const isRescheduled = dInfo.isDelayed || item.status === 'DELAYED'

         map[d].ETA.push({
           id: item.id,
           streamType: 'ETA',
           date: d,
           title: `${item.rm_code} (${item.quantity || 0} ${item.unit || ''})`,
           subtitle: item.rm_name || item.supplier || 'วัตถุดิบ/บรรจุภัณฑ์',
           tag: item.po_no ? `PO: ${item.po_no}` : undefined,
           quantity: item.quantity,
           status: item.status,
           meta: { ...item, delayInfo: dInfo, isDelayed: isRescheduled }
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
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay }
            })
          } else if (pName.includes('ผสม') || pName.includes('mix')) {
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
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay }
            })
          } else if (pName.includes('บรรจุ') || pName.includes('packing') || pName.includes('pof') || pName.includes('ลงลัง')) {
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
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay }
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
              meta: { ...lot, isMtsRange: true }
            })
          }
        })
      } else if (lot.fg_due_date && map[lot.fg_due_date]) {
        // MTO / Single Due Date
        totalFgDue++
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
          meta: lot
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
    <Card className="bg-white border-[#D4AF37]/35 shadow-2xl rounded-2xl overflow-hidden relative mb-8">
      {/* Decorative Gold Accent Bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37]"></div>

      {/* Radar Master Header */}
      <CardHeader className="bg-gradient-to-b from-[#FAF8F5] to-white border-b border-[#D4AF37]/25 p-5 md:p-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/30 text-[#8B7355] shadow-xs shrink-0">
                <Compass className="w-6 h-6 text-[#D4AF37] animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl md:text-2xl font-black text-[#4A4238] whitespace-nowrap tracking-tight">
                    21-Day Rolling Master Radar
                  </h2>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                    เรดาร์แผนงาน 3 สัปดาห์ (ย้อนหลัง 7 วัน + ล่วงหน้า 14 วัน)
                  </span>
                </div>
                <div className="text-xs text-[#8B7355] font-medium flex flex-wrap items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
                    <span>
                      หน้าต่างแผนงาน: <strong className="text-[#4A4238]">{horizonDates[0]?.dayNum} {horizonDates[0]?.monthName}</strong> ➔ <strong className="text-[#4A4238]">{horizonDates[20]?.dayNum} {horizonDates[20]?.monthName} 2026</strong>
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

          {/* View Switcher Controls */}
          <div className="flex flex-wrap items-center gap-2 self-stretch xl:self-auto shrink-0">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#4A4238] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-[#4A4238]'
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
                    ? 'bg-white text-[#4A4238] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-[#4A4238]'
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
                    ? 'bg-white text-[#4A4238] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-[#4A4238]'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                ETA Logistics
              </button>
            </div>

            {/* Stream Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-1.5">สายงาน:</span>
              {(['ALL', 'ETA', 'WEIGHING', 'MIXING', 'PACKING', 'FG_DUE'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStreamFilter(f)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                    streamFilter === f
                      ? 'bg-[#D4AF37] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f === 'ALL' ? 'ทั้งหมด' : f === 'ETA' ? 'ของเข้า' : f === 'WEIGHING' ? 'ชั่ง' : f === 'MIXING' ? 'ผสม' : f === 'PACKING' ? 'บรรจุ' : 'ส่งมอบ'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 21-Day Executive Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              <div>
                <div className="text-[10px] text-amber-700 font-medium">ของเข้า RM/PM (21 วัน)</div>
                <div className="text-sm font-black text-amber-900">{summaryCounts.totalEta} รายการ</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="text-[10px] text-indigo-700 font-medium">เตรียม/ชั่งสาร (21 วัน)</div>
                <div className="text-sm font-black text-indigo-900">{summaryCounts.totalWeighing} รอบงาน</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-[10px] text-blue-700 font-medium">งานผสม Bulk (21 วัน)</div>
                <div className="text-sm font-black text-blue-900">{summaryCounts.totalMixingTanks} ถัง ({summaryCounts.totalMixing} รอบ)</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-[10px] text-emerald-700 font-medium">ไลน์บรรจุ & POF (21 วัน)</div>
                <div className="text-sm font-black text-emerald-900">{summaryCounts.totalPacking} รอบงาน</div>
              </div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-600" />
              <div>
                <div className="text-[10px] text-rose-700 font-medium">กำหนดส่งมอบ FG (21 วัน)</div>
                <div className="text-sm font-black text-rose-900">{summaryCounts.totalFgDue} ล็อต</div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Compass className="w-8 h-8 mx-auto mb-3 animate-spin text-[#D4AF37]" />
            กำลังจัดทำเรดาร์แผนงาน 21 วัน (ย้อนหลัง 7 วัน + ล่วงหน้า 14 วัน)...
          </div>
        ) : (
          <>
            {/* VIEW 1: TIMELINE HORIZON (MATRIX GRID) */}
            {viewMode === 'timeline' && (
              <div className="space-y-2">
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-amber-200">
                  <div className="min-w-[1500px] border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    {/* Header: 21 Days (Column 7 is Today) */}
                    <div className="grid grid-cols-[160px_repeat(21,minmax(60px,1fr))] bg-[#F9F7F2] border-b border-slate-200 text-center font-bold text-xs">
                      <div className="p-3 text-left text-slate-600 font-bold border-r border-slate-200 flex items-center gap-1.5 bg-slate-100/70">
                        <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> สายงาน / วันที่
                      </div>
                      {horizonDates.map((d, idx) => (
                        <div
                          key={d.dateStr}
                          className={`p-2 border-r border-slate-200/80 flex flex-col items-center justify-center transition-colors ${
                            d.isToday
                              ? 'bg-amber-100/90 text-amber-900 ring-2 ring-inset ring-[#D4AF37] shadow-sm z-10'
                              : d.isPast
                              ? 'bg-slate-100/50 text-slate-600'
                              : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50/50'
                          }`}
                        >
                          <div className="text-[10px] font-semibold uppercase">
                            {d.isToday ? (
                              <span className="text-amber-800 font-bold flex items-center gap-0.5">📍 วันนี้</span>
                            ) : d.isPast ? (
                              <span className="text-slate-400">{d.dayName}</span>
                            ) : (
                              <span className="text-slate-500">{d.dayName}</span>
                            )}
                          </div>
                          <div className={`text-sm font-black ${d.isToday ? 'text-amber-950 scale-110' : 'text-[#4A4238]'}`}>
                            {d.dayNum}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium">
                            {d.monthName}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Stream Rows */}
                    <div className="divide-y divide-slate-200/80 text-xs">
                      {activeStreams.map(stream => {
                        const Icon = stream.icon
                        return (
                          <div
                            key={stream.key}
                            className="grid grid-cols-[160px_repeat(21,minmax(60px,1fr))] items-stretch hover:bg-slate-50/40 transition-colors"
                          >
                            {/* Stream Name Header */}
                            <div className={`p-3 font-bold border-r border-slate-200 flex items-center gap-2 bg-slate-50/80 ${stream.color}`}>
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate text-xs">{stream.shortLabel}</span>
                            </div>

                            {/* 21 Day Cells */}
                            {horizonDates.map(d => {
                              const items = dateStreamMap[d.dateStr]?.[stream.key] || []
                              const hasItems = items.length > 0

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
                                        className={`w-full h-full p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-center shadow-2xs transition-transform hover:scale-105 active:scale-95 ${
                                          stream.key === 'ETA' && items.some(it => it.meta?.isDelayed)
                                            ? 'bg-amber-100/95 text-amber-950 border-amber-400 font-bold'
                                            : stream.pillColor
                                        }`}
                                      >
                                        <span className="font-extrabold text-[11px] leading-tight flex items-center justify-center gap-0.5">
                                          {stream.key === 'ETA' && items.some(it => it.meta?.isDelayed) && (
                                            <span className="text-[10px]" title="มีรายการเลื่อนส่ง">⚠️</span>
                                          )}
                                          {items.length === 1
                                            ? items[0].tag || items[0].lotNo || '1 งาน'
                                            : `${items.length} รายการ`}
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
                                                    : 'bg-slate-50 border-slate-200/80 hover:bg-amber-50/50'
                                                }`}
                                              >
                                                <div className="flex justify-between items-start gap-2">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <strong className="text-[#4A4238] font-bold text-xs leading-snug">{it.title}</strong>
                                                    {isDelayedItem && (
                                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                                                        ⚠️ เลื่อนส่ง
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

                                                {/* Dedicated Delay Warning Box */}
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
                                <div key={e.id} className="text-[11px] text-amber-800 pl-5">
                                  • <strong>{e.title}</strong> - <span className="text-amber-700">{e.subtitle}</span>
                                  {e.meta?.isDelayed && (
                                    <span className="ml-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                      ⚠️ เลื่อนส่ง ({e.meta?.delayInfo?.categoryLabel || 'แจ้งเลื่อน'})
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
                                <div key={w.id} className="text-[11px] text-indigo-800 pl-5 flex items-center justify-between">
                                  <span>• <strong>{w.title}</strong> ({w.tag})</span>
                                  {w.meta?.isMultiDay && (
                                    <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded font-medium ml-1.5">
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
                                <div key={m.id} className="text-[11px] text-blue-800 pl-5 flex items-center justify-between">
                                  <span>• <strong>{m.title}</strong> <span className="text-blue-600">[{m.tag}]</span></span>
                                  {m.meta?.isMultiDay && (
                                    <span className="text-[9px] text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded font-medium ml-1.5">
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
                                <div key={p.id} className="text-[11px] text-emerald-800 pl-5 flex items-center justify-between">
                                  <span>• <strong>{p.title}</strong> <span className="text-emerald-700 font-semibold">{p.tag}</span></span>
                                  {p.meta?.isMultiDay && (
                                    <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded font-medium ml-1.5">
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
                                <div key={f.id} className="text-[11px] text-rose-800 pl-5">
                                  • <strong>{f.title}</strong> <span className="text-rose-700 font-bold">[{f.tag}]</span>
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

                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                                item.status === 'RECEIVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {item.status === 'RECEIVED' ? '✓ รับแล้ว' : '⏳ รอส่งมอบ'}
                              </span>
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
  )
}
