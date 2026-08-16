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

  // 14-Day Horizon Array
  const horizonDates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(baseDate, i)
      return {
        date: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        dayName: TH_DAYS[d.getDay()],
        dayNum: d.getDate(),
        monthName: TH_MONTHS[d.getMonth()],
        isToday: i === 0
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
        // 1. ETA RM/PM within 14 days
        supabase.from('production_lot_rms')
          .select('id, rm_code, rm_name, po_no, eta_date, status, qc_status, quantity, unit, supplier')
          .gte('eta_date', horizonStartStr)
          .lte('eta_date', horizonEndStr)
          .order('eta_date', { ascending: true }),

        // 2. Production Schedule (Weighing, Mixing, Packing, POF)
        supabase.from('production_logs')
          .select(`
            id, status, activity_date, tank_start, tank_end, piece_quantity, note,
            processes (process_name),
            production_lots (
              id, lot_no, planned_quantity, order_quantity, total_tanks,
              products:sku_id (sku, product_name)
            )
          `)
          .gte('activity_date', horizonStartStr)
          .lte('activity_date', horizonEndStr)
          .order('activity_date', { ascending: true }),

        // 3. FG Due Date & Planned Deliveries
        supabase.from('production_lots')
          .select(`
            id, lot_no, fg_due_date, planned_quantity, order_quantity, order_type, current_status, total_tanks,
            products:sku_id (sku, product_name)
          `)
          .gte('fg_due_date', horizonStartStr)
          .lte('fg_due_date', horizonEndStr)
          .neq('current_status', 'DONE')
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
        map[d].ETA.push({
          id: item.id,
          streamType: 'ETA',
          date: d,
          title: `${item.rm_code} (${item.quantity || 0} ${item.unit || ''})`,
          subtitle: item.rm_name || item.supplier || 'วัตถุดิบ/บรรจุภัณฑ์',
          tag: item.po_no ? `PO: ${item.po_no}` : undefined,
          quantity: item.quantity,
          status: item.status,
          meta: item
        })
      }
    })

    // 2. Process Production Logs
    radarData.logsList.forEach(log => {
      const d = log.activity_date
      if (!map[d]) return

      const pName = (log.processes?.process_name || '').toLowerCase()
      const lot = log.production_lots
      const sku = lot?.products?.sku || 'SKU'
      const pProductName = lot?.products?.product_name || ''
      const lotNo = lot?.lot_no || 'N/A'
      const startT = parseInt(log.tank_start) || 1
      const endT = parseInt(log.tank_end) || startT
      const tanksCount = Math.max(1, endT - startT + 1)

      if (pName.includes('ชั่ง') || pName.includes('mm-rm')) {
        totalWeighing++
        map[d].WEIGHING.push({
          id: log.id,
          streamType: 'WEIGHING',
          date: d,
          title: `LOT ${lotNo} (${sku})`,
          subtitle: pProductName || 'เตรียมและชั่งสารเคมี',
          tag: `ถัง ${startT}-${endT}`,
          lotNo,
          sku,
          lotId: lot?.id,
          meta: log
        })
      } else if (pName.includes('ผสม') || pName.includes('mix')) {
        totalMixing++
        totalMixingTanks += tanksCount
        map[d].MIXING.push({
          id: log.id,
          streamType: 'MIXING',
          date: d,
          title: `LOT ${lotNo} (${sku})`,
          subtitle: pProductName || 'ผสมเนื้อ Bulk',
          tag: `${tanksCount} ถัง (${startT}-${endT})`,
          lotNo,
          sku,
          lotId: lot?.id,
          meta: log
        })
      } else if (pName.includes('บรรจุ') || pName.includes('packing') || pName.includes('pof') || pName.includes('ลงลัง')) {
        totalPacking++
        map[d].PACKING.push({
          id: log.id,
          streamType: 'PACKING',
          date: d,
          title: `LOT ${lotNo} (${sku})`,
          subtitle: pProductName || 'บรรจุและแพ็คเกจจิ้ง',
          tag: log.piece_quantity ? `${Number(log.piece_quantity).toLocaleString()} ชิ้น` : `ถัง ${startT}-${endT}`,
          lotNo,
          sku,
          lotId: lot?.id,
          meta: log
        })
      }
    })

    // 3. Process FG Due
    radarData.fgDueLots.forEach(lot => {
      const d = lot.fg_due_date
      if (map[d]) {
        totalFgDue++
        const sku = lot.products?.sku || 'SKU'
        const qty = lot.planned_quantity || lot.order_quantity || 0
        map[d].FG_DUE.push({
          id: lot.id,
          streamType: 'FG_DUE',
          date: d,
          title: `LOT ${lot.lot_no} (${sku})`,
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
                    14-Day Rolling Master Radar
                  </h2>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                    แผนงานล่วงหน้า 2 สัปดาห์
                  </span>
                </div>
                <div className="text-xs text-[#8B7355] font-medium flex flex-wrap items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
                    <span>
                      หน้าต่างแผนงาน: <strong className="text-[#4A4238]">{horizonDates[0]?.dayNum} {horizonDates[0]?.monthName}</strong> ➔ <strong className="text-[#4A4238]">{horizonDates[13]?.dayNum} {horizonDates[13]?.monthName} 2026</strong>
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
            <div className="hidden sm:flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
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

        {/* 14-Day Executive Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              <div>
                <div className="text-[10px] text-amber-700 font-medium">ของเข้า RM/PM</div>
                <div className="text-sm font-black text-amber-900">{summaryCounts.totalEta} รายการ</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="text-[10px] text-indigo-700 font-medium">เตรียม/ชั่งสาร</div>
                <div className="text-sm font-black text-indigo-900">{summaryCounts.totalWeighing} รอบงาน</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-[10px] text-blue-700 font-medium">งานผสม Bulk</div>
                <div className="text-sm font-black text-blue-900">{summaryCounts.totalMixingTanks} ถัง ({summaryCounts.totalMixing} รอบ)</div>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-[10px] text-emerald-700 font-medium">ไลน์บรรจุ & POF</div>
                <div className="text-sm font-black text-emerald-900">{summaryCounts.totalPacking} รอบงาน</div>
              </div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-rose-600" />
              <div>
                <div className="text-[10px] text-rose-700 font-medium">กำหนดส่งมอบ FG</div>
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
            กำลังจัดทำเรดาร์แผนงาน 14 วันข้างหน้า...
          </div>
        ) : (
          <>
            {/* VIEW 1: TIMELINE HORIZON (MATRIX GRID) */}
            {viewMode === 'timeline' && (
              <div className="space-y-2">
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-amber-200">
                  <div className="min-w-[1100px] border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    {/* Header: 14 Days */}
                    <div className="grid grid-cols-[160px_repeat(14,minmax(65px,1fr))] bg-[#F9F7F2] border-b border-slate-200 text-center font-bold text-xs">
                      <div className="p-3 text-left text-slate-600 font-bold border-r border-slate-200 flex items-center gap-1.5 bg-slate-100/70">
                        <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> สายงาน / วันที่
                      </div>
                      {horizonDates.map((d, idx) => (
                        <div
                          key={d.dateStr}
                          className={`p-2 border-r border-slate-200/80 flex flex-col items-center justify-center transition-colors ${
                            d.isToday
                              ? 'bg-amber-100/70 text-amber-900 ring-2 ring-inset ring-[#D4AF37]'
                              : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50/50'
                          }`}
                        >
                          <div className="text-[10px] font-semibold text-slate-400 uppercase">
                            {d.isToday ? <span className="text-amber-700 font-bold">📍 วันนี้</span> : d.dayName}
                          </div>
                          <div className="text-sm font-black text-[#4A4238]">
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
                            className="grid grid-cols-[160px_repeat(14,minmax(65px,1fr))] items-stretch hover:bg-slate-50/40 transition-colors"
                          >
                            {/* Stream Name Header */}
                            <div className={`p-3 font-bold border-r border-slate-200 flex items-center gap-2 bg-slate-50/80 ${stream.color}`}>
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate text-xs">{stream.shortLabel}</span>
                            </div>

                            {/* 14 Day Cells */}
                            {horizonDates.map(d => {
                              const items = dateStreamMap[d.dateStr]?.[stream.key] || []
                              const hasItems = items.length > 0

                              return (
                                <div
                                  key={d.dateStr}
                                  className={`p-1.5 border-r border-slate-200/80 flex flex-col items-center justify-center min-h-[64px] transition-all ${
                                    d.isToday ? 'bg-amber-50/30' : ''
                                  }`}
                                >
                                  {hasItems ? (
                                    <Popover>
                                      <PopoverTrigger
                                        className={`w-full h-full p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-center shadow-2xs transition-transform hover:scale-105 active:scale-95 ${stream.pillColor}`}
                                      >
                                        <span className="font-extrabold text-[11px] leading-tight">
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
                                        className="w-72 p-3 bg-white border border-[#D4AF37]/35 shadow-2xl rounded-2xl z-50 text-xs text-[#4A4238]"
                                        align="center"
                                      >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                                          <div className="font-bold flex items-center gap-1.5 text-sm">
                                            <Icon className={`w-4 h-4 ${stream.color}`} />
                                            <span>{stream.shortLabel}</span>
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {d.dayName} {d.dayNum} {d.monthName}
                                          </span>
                                        </div>

                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                          {items.map((it, itIdx) => (
                                            <div
                                              key={it.id || itIdx}
                                              className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1 hover:bg-amber-50/40 transition"
                                            >
                                              <div className="flex justify-between items-start gap-1">
                                                <strong className="text-[#4A4238] font-bold text-xs">{it.title}</strong>
                                                {it.tag && (
                                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded-md">
                                                    {it.tag}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[11px] text-slate-500">{it.subtitle}</div>
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
                                          ))}
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
                  {horizonDates.map((d, dIdx) => {
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
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                              d.isToday ? 'bg-[#D4AF37] text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {d.isToday ? '📍 วันนี้' : `${d.dayName} ${d.dayNum} ${d.monthName}`}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {dIdx === 0 ? 'Day 0' : `+${dIdx} วัน`}
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
                                <div key={w.id} className="text-[11px] text-indigo-800 pl-5">
                                  • <strong>{w.title}</strong> ({w.tag})
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
                                <div key={m.id} className="text-[11px] text-blue-800 pl-5">
                                  • <strong>{m.title}</strong> <span className="text-blue-600">[{m.tag}]</span>
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
                                <div key={p.id} className="text-[11px] text-emerald-800 pl-5">
                                  • <strong>{p.title}</strong> <span className="text-emerald-700 font-semibold">{p.tag}</span>
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
                      <span>รายการวัตถุดิบและบรรจุภัณฑ์รอเข้าโรงงาน (ETA Supply Chain 14 วัน)</span>
                    </div>
                    <span className="text-slate-500 font-semibold">ทั้งหมด {radarData.etaList.length} รายการ</span>
                  </div>

                  {radarData.etaList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      ไม่มีกำหนดการของเข้าในช่วง 14 วันนี้
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto text-xs">
                      {radarData.etaList.map((item, idx) => {
                        const etaD = parseISO(item.eta_date)
                        const isToday = isSameDay(etaD, baseDate)

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
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[#4A4238] text-sm">{item.rm_code}</span>
                                  {item.po_no && (
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                      PO: {item.po_no}
                                    </span>
                                  )}
                                  {isToday && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                      เข้าวันนี้
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 text-xs mt-0.5">
                                  {item.rm_name || item.supplier || 'ไม่ระบุชื่อ'}
                                </div>
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
