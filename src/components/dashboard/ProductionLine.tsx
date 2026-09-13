'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scale, Beaker, ShieldCheck, Container, ScanBarcode, Box, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'

const PROCESS_STAGES = [
  { key: 'weigh', label: 'ชั่งสาร', icon: Scale, keywords: ['ชั่ง', 'mm-rm'] },
  { key: 'mix', label: 'ผสม', icon: Beaker, keywords: ['ผสม', 'mix', 'mx'] },
  { key: 'qc', label: 'รอ QC', icon: ShieldCheck, keywords: ['qc', 'quarantine', 'passed', 'rejected'] },
  { key: 'fill', label: 'บรรจุ', icon: Container, keywords: ['บรรจุ', 'packing', 'pk'] },
  { key: 'pof', label: 'POF / ลงลัง', icon: ScanBarcode, keywords: ['pof', 'อุโมงค์', 'แพค'] },
  { key: 'pack', label: 'คงคลัง FG', icon: Box, keywords: ['fg', 'คลัง', 'store', 'ลัง'] },
  { key: 'delivered', label: 'ส่งมอบ FG เรียบร้อย', icon: CheckCircle2, keywords: [] },
]

export type ProductionSortCriterion = 'weigh' | 'mix' | 'pack' | 'due'

export default function ProductionLine({ 
  activeLots, 
  activeLogs = [],
  theme = 'light'
}: { 
  activeLots: any[]
  activeLogs?: any[]
  theme?: 'night' | 'light'
}) {
  const isNight = theme === 'night'

  const [sortBy, setSortBy] = useState<ProductionSortCriterion>('weigh')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSortClick = (criterion: ProductionSortCriterion) => {
    if (sortBy === criterion) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(criterion)
      setSortDir('asc')
    }
  }

  const getStageDate = (lotId: string, criterion: ProductionSortCriterion): number => {
    if (criterion === 'due') {
      const lot = activeLots.find(l => l.id === lotId)
      const dStr = lot?.fg_due_date || lot?.planned_start_date
      return dStr ? new Date(dStr).getTime() : Infinity
    }
    const keywordsMap: Record<string, string[]> = {
      weigh: ['ชั่ง', 'mm-rm'],
      mix: ['ผสม', 'mix', 'mx'],
      pack: ['บรรจุ', 'pack', 'pk', 'ลงลัง', 'pof']
    }
    const keywords = keywordsMap[criterion] || []
    const matched = activeLogs.filter(log => {
      if (log.production_lot_id !== lotId) return false
      const pName = (log.processes?.process_name || '').toLowerCase()
      const rName = (log.rooms?.room_name || '').toLowerCase()
      const combined = `${pName} ${rName}`
      return keywords.some(kw => combined.includes(kw))
    })
    let earliest = Infinity
    matched.forEach(l => {
      const dStr = l.activity_date || l.start_time
      if (dStr) {
        const t = new Date(dStr).getTime()
        if (t < earliest) earliest = t
      }
    })
    return earliest
  }

  const sortedLots = useMemo(() => {
    const fallbacks: Record<ProductionSortCriterion, ProductionSortCriterion[]> = {
      weigh: ['mix', 'pack', 'due'],
      mix: ['pack', 'due', 'weigh'],
      pack: ['due', 'mix', 'weigh'],
      due: ['pack', 'mix', 'weigh']
    }

    return [...activeLots].sort((a, b) => {
      const dateA = getStageDate(a.id, sortBy)
      const dateB = getStageDate(b.id, sortBy)
      let diff = dateA - dateB

      if (diff === 0) {
        const secondaryList = fallbacks[sortBy] || []
        for (const sec of secondaryList) {
          const sA = getStageDate(a.id, sec)
          const sB = getStageDate(b.id, sec)
          diff = sA - sB
          if (diff !== 0) break
        }
      }

      if (diff === 0) {
        diff = (a.lot_no || '').localeCompare(b.lot_no || '', undefined, { numeric: true })
      }

      return sortDir === 'asc' ? diff : -diff
    })
  }, [activeLots, activeLogs, sortBy, sortDir])
  
  // Helper to determine status and tank count for a stage
  const getStageInfo = (lot: any, stageKey: string) => {
    const isLotDone = lot.current_status === 'DONE'

    if (stageKey === 'delivered') {
      return {
        count: isLotDone ? '✔' : '-',
        status: isLotDone ? 'delivered' : 'pending',
        totalAssigned: 0
      }
    }

    if (isLotDone) {
      // If the lot is marked as DONE by planner, all stages prior to delivery are 100% completed
      const stage = PROCESS_STAGES.find(p => p.key === stageKey)
      const stageLogs = activeLogs.filter(log => {
        if (log.production_lot_id !== lot.id) return false
        const processName = (log.processes?.process_name || '').toLowerCase()
        const roomName = (log.rooms?.room_name || '').toLowerCase()
        const combined = `${processName} ${roomName}`
        return stage?.keywords.some((kw: string) => combined.includes(kw))
      })
      const tankEnd = stageLogs.length > 0 
        ? (parseInt(stageLogs[0]?.tank_end) || parseInt(stageLogs[0]?.tank_start) || lot.total_tanks || 1)
        : (lot.total_tanks || 1)
      return {
        count: tankEnd > 0 ? tankEnd : '✔',
        status: 'completed',
        totalAssigned: lot.total_tanks || 1
      }
    }

    let count = 0
    let hasError = false
    let hasActive = false
    let hasWaiting = false

    const stageIndex = PROCESS_STAGES.findIndex(p => p.key === stageKey)
    const stage = PROCESS_STAGES[stageIndex]

    // 1. Find all active logs for this lot that belong to this stage
    const stageLogs = activeLogs.filter(log => {
      if (log.production_lot_id !== lot.id) return false
      const processName = (log.processes?.process_name || '').toLowerCase()
      const roomName = (log.rooms?.room_name || '').toLowerCase()
      const combined = `${processName} ${roomName}`
      return stage.keywords.some((kw: string) => combined.includes(kw))
    })

    // 2. Aggregate tank count and statuses
    let maxStartedTank = 0
    let minWaitingTank = 0

    stageLogs.forEach(log => {
      const start = parseInt(log.tank_start) || 0
      const end = parseInt(log.tank_end) || start
      if (end >= start && start > 0) {
        count += (end - start + 1)
        
        const details = log.tank_details || {}
        for (let t = start; t <= end; t++) {
           const val = details[t] || details[t.toString()]
           const s = typeof val === 'string' ? val : (val?.status || '')
           
           const isStartedOrDone = (s && !['LOCKED', 'WAITING', 'PLANNED'].includes(s)) || ['DONE', 'COMPLETED'].includes(log.status) || !!(val && typeof val === 'object' && val.fg_receive_info)
           const isQCStage = stage.key === 'qc'
           const isValidForMax = isQCStage ? (s === 'QC_PASS') : isStartedOrDone
           
           if (isValidForMax) {
              maxStartedTank = Math.max(maxStartedTank, t)
           } else {
              if (minWaitingTank === 0 || t < minWaitingTank) {
                 minWaitingTank = t
              }
           }
        }
      }
      
      if (log.status === 'PAUSED') hasError = true
      else if (log.status === 'IN_PROGRESS') hasActive = true
      else if (log.status === 'WAITING') hasWaiting = true
    })

    const displayTankNumber = maxStartedTank > 0 ? maxStartedTank : (minWaitingTank > 0 ? minWaitingTank : (count > 0 ? parseInt(stageLogs[0]?.tank_start) || 1 : 0))

    let status = 'pending'
    if (count > 0) {
      if (hasError) status = 'error'
      else if (hasActive) status = 'active'
      else if (hasWaiting) status = 'warning'
      else status = 'active'
    } else {
      // 3. If count is 0, check if any DOWNSTREAM stage has logs. If yes, this stage is 'completed'
      const hasDownstreamLogs = PROCESS_STAGES.slice(stageIndex + 1).some(downstreamStage => {
        return activeLogs.some(log => {
          if (log.production_lot_id !== lot.id) return false
          const pName = (log.processes?.process_name || '').toLowerCase()
          const rName = (log.rooms?.room_name || '').toLowerCase()
          return downstreamStage.keywords.some(kw => `${pName} ${rName}`.includes(kw))
        })
      })

      if (hasDownstreamLogs) {
        status = 'completed'
      }
    }

    return { count: displayTankNumber, status, totalAssigned: count }
  }

  return (
    <Card className={`col-span-full shadow-sm transition-colors duration-300 ${
      isNight ? 'bg-[#0B132B] border-slate-700/60 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <CardHeader className={`pb-3 border-b transition-colors duration-300 ${
        isNight ? 'bg-[#0F172A] border-slate-700/60' : 'bg-[#F8F6F0]'
      }`}>
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className={`text-lg font-bold shrink-0 ${isNight ? 'text-white' : 'text-slate-800'}`}>
              Production Line (Digital Twin)
            </CardTitle>
            
            {/* Quick Sort Toolbar */}
            <div className={`flex flex-wrap items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${
              isNight ? 'bg-slate-900/90 border-slate-700/80 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
            }`}>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
                เรียงตาม:
              </span>
              <button
                type="button"
                onClick={() => handleSortClick('weigh')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  sortBy === 'weigh'
                    ? 'bg-amber-500 text-white shadow font-bold'
                    : 'hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="เรียงตามคิวชั่งสาร (คลิกเพื่อสลับ ก่อน ➔ หลัง / หลัง ➔ ก่อน)"
              >
                <span>⚖️ คิวชั่งสาร</span>
                {sortBy === 'weigh' && (
                  <span className="text-[10px] font-mono">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSortClick('mix')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  sortBy === 'mix'
                    ? 'bg-purple-600 text-white shadow font-bold'
                    : 'hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="เรียงตามคิวผสมเนื้อ (คลิกเพื่อสลับ ก่อน ➔ หลัง / หลัง ➔ ก่อน)"
              >
                <span>🥣 คิวผสม</span>
                {sortBy === 'mix' && (
                  <span className="text-[10px] font-mono">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSortClick('pack')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  sortBy === 'pack'
                    ? 'bg-indigo-600 text-white shadow font-bold'
                    : 'hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="เรียงตามคิวบรรจุ (คลิกเพื่อสลับ ก่อน ➔ หลัง / หลัง ➔ ก่อน)"
              >
                <span>📦 คิวบรรจุ</span>
                {sortBy === 'pack' && (
                  <span className="text-[10px] font-mono">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSortClick('due')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  sortBy === 'due'
                    ? 'bg-emerald-600 text-white shadow font-bold'
                    : 'hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="เรียงตามกำหนดส่งมอบ FG (คลิกเพื่อสลับ ก่อน ➔ หลัง / หลัง ➔ ก่อน)"
              >
                <span>🎯 กำหนดส่งมอบ FG</span>
                {sortBy === 'due' && (
                  <span className="text-[10px] font-mono">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </div>
          </div>
          
          <div className={`flex items-center space-x-4 text-xs font-medium shrink-0 ${isNight ? 'text-slate-300' : 'text-slate-500'}`}>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-1.5 shadow-sm"></span> กำลังผลิต (Active)</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-1.5 shadow-sm"></span> รอคิว (Waiting)</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1.5 shadow-sm"></span> ติดปัญหา (Issue)</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-auto max-h-[70vh] custom-scrollbar">
          <div className="min-w-[1100px]">
            {/* Header Row */}
            <div className={`sticky top-0 z-20 grid grid-cols-9 border-b p-4 text-sm font-semibold shadow-sm transition-colors duration-300 ${
              isNight ? 'bg-[#0F172A] border-slate-700/60 text-slate-200' : 'bg-[#F8F6F0] border-slate-200 text-slate-700'
            }`}>
              <div className="col-span-2 pl-2">LOT No. (สินค้า)</div>
              <div className="col-span-7 grid grid-cols-7 gap-2 text-center">
              {PROCESS_STAGES.map(stage => {
                const stageSortKeyMap: Record<string, ProductionSortCriterion> = {
                  weigh: 'weigh',
                  mix: 'mix',
                  fill: 'pack',
                  delivered: 'due'
                }
                const sortKey = stageSortKeyMap[stage.key]
                const isCurrentSort = sortKey && sortBy === sortKey

                return (
                  <div 
                    key={stage.key} 
                    onClick={() => sortKey && handleSortClick(sortKey)}
                    className={`flex flex-col items-center justify-center space-y-1 select-none transition-all rounded-lg p-1 ${
                      sortKey ? 'cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80' : ''
                    } ${
                      isCurrentSort ? (isNight ? 'bg-slate-800/90 text-amber-300 ring-1 ring-amber-400/40' : 'bg-amber-100/70 text-amber-900 ring-1 ring-amber-300') : ''
                    }`}
                    title={sortKey ? `คลิกเพื่อเรียงตาม${stage.label}` : undefined}
                  >
                    <div className="flex items-center gap-1">
                      <stage.icon className={`w-5 h-5 ${isCurrentSort ? 'text-amber-500' : (isNight ? 'text-amber-400/80' : 'text-slate-400')}`} />
                      {isCurrentSort && (
                        <span className="text-xs font-mono font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                    <span className={`text-xs ${isCurrentSort ? 'font-black underline decoration-amber-400 decoration-2 underline-offset-2' : ''}`}>{stage.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Data Rows */}
          {sortedLots.length === 0 ? (
            <div className={`p-8 text-center ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>ไม่พบข้อมูลออเดอร์ที่ตรงกับเงื่อนไข หรือคำค้นหา</div>
          ) : (
            sortedLots.map((lot, idx) => (
              <div key={lot.id} className={`grid grid-cols-9 p-4 border-b items-center transition-colors duration-200 ${
                isNight 
                  ? `${idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-900/30'} border-slate-800/80 hover:bg-slate-800/50`
                  : `${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F6F0]/30'} border-slate-100 hover:bg-[#F8F6F0]/50`
              }`}>
                
                {/* Lot Info */}
                <div className="col-span-2 pl-2">
                  <div className={`font-bold flex flex-wrap items-center gap-2 leading-tight ${isNight ? 'text-white' : 'text-slate-800'}`}>
                    {lot.products?.sku ? (
                      <>
                        <span className={`text-base font-black ${isNight ? 'text-amber-400' : 'text-emerald-700'}`}>{lot.products.sku}</span>
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                          isNight ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>LOT: {lot.lot_no}</span>
                      </>
                    ) : (
                      <span className="text-base">{lot.lot_no}</span>
                    )}
                  </div>
                  <div className={`text-xs truncate max-w-[200px] mt-0.5 ${isNight ? 'text-slate-300' : 'text-slate-500'}`} title={lot.products?.product_name}>
                    {lot.products?.product_name}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`text-[10px] inline-block px-1.5 py-0.5 rounded ${
                      isNight ? 'bg-slate-800/80 text-slate-400 border border-slate-700/60' : 'bg-slate-100 text-slate-400'
                    }`}>ทั้งหมด: {lot.total_tanks || 0} ถัง</span>

                    {/* Dynamic Active Sort Date Badge */}
                    {(() => {
                      const d = getStageDate(lot.id, sortBy)
                      if (d === Infinity) return null
                      const formatted = format(new Date(d), 'dd MMM')
                      const badgeColors: Record<ProductionSortCriterion, string> = {
                        weigh: isNight ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200',
                        mix: isNight ? 'bg-purple-950/60 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-800 border-purple-200',
                        pack: isNight ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-800 border-indigo-200',
                        due: isNight ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      }
                      const labels: Record<ProductionSortCriterion, string> = {
                        weigh: 'ชั่ง:',
                        mix: 'ผสม:',
                        pack: 'บรรจุ:',
                        due: 'Due:'
                      }
                      return (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${badgeColors[sortBy]}`}>
                          <span>{labels[sortBy]}</span>
                          <span>{formatted}</span>
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Pipeline Lanes */}
                <div className="col-span-7 grid grid-cols-7 gap-2 relative">
                  {/* The Background Line (ถนน) */}
                  <div className={`absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 -z-10 rounded-full ${
                    isNight ? 'bg-slate-700' : 'bg-slate-200'
                  }`}></div>
                  
                  {PROCESS_STAGES.map((stage, sIdx) => {
                    const info = getStageInfo(lot, stage.key)
                    
                    // Colors based on status
                    const bgColors = {
                      delivered: isNight ? 'bg-emerald-600 text-white border-emerald-400 shadow-md scale-105 ring-2 ring-emerald-400/40' : 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105 ring-2 ring-emerald-500/30',
                      completed: isNight ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/80' : 'bg-emerald-100 text-emerald-700 border-emerald-300',
                      active: 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-110',
                      warning: 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md scale-110',
                      error: 'bg-red-500 text-white border-red-600 shadow-md scale-110',
                      pending: isNight ? 'bg-slate-900/80 text-slate-500 border-slate-700/80' : 'bg-white text-slate-400 border-slate-200'
                    }

                    return (
                      <div key={stage.key} className="flex flex-col items-center relative z-10 group cursor-pointer">
                        {/* Connecting Progress Line */}
                        {sIdx > 0 && (
                          <div className={`absolute top-1/2 right-1/2 w-full h-1 -translate-y-1/2 -z-10 ${info.status !== 'pending' ? (isNight ? 'bg-emerald-500' : 'bg-emerald-400') : 'bg-transparent'}`}></div>
                        )}
                        
                        {/* The Station Node (ตัวรถ) */}
                        <div className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${bgColors[info.status as keyof typeof bgColors]}`}>
                          {info.count === '✔' ? (
                            <span className="text-xl font-bold">✔</span>
                          ) : Number(info.count) > 0 ? (
                            <>
                              <span className="text-lg font-bold leading-none">{info.count}</span>
                              <span className="text-[9px] font-medium leading-tight">ถังที่</span>
                            </>
                          ) : (
                            <span className="text-xl font-bold opacity-30">-</span>
                          )}
                        </div>

                        {/* Status Label */}
                        <div className="mt-2 text-[10px] text-center w-max min-w-[5rem] whitespace-nowrap">
                            {info.status === 'delivered' && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ ส่งมอบแล้ว</span>}
                            {info.status === 'completed' && <span className="text-emerald-500 font-bold">✓ เสร็จสิ้น</span>}
                            {info.status === 'active' && <span className="text-emerald-500 font-bold animate-pulse">● กำลังทำ</span>}
                            {info.status === 'warning' && <span className="text-yellow-500 font-bold">● รอคิว</span>}
                            {info.status === 'error' && <span className="text-red-500 font-bold animate-bounce">▲ ติดปัญหา</span>}
                            {stage.key === 'delivered' && (
                              <div className={`mt-1 text-[9px] font-medium leading-tight ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                                {(!lot.order_type || lot.order_type === 'MTS') ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span>S: {lot.planned_start_date ? format(new Date(lot.planned_start_date), "dd MMM") : '-'}</span>
                                    <span>E: {lot.fg_due_date ? format(new Date(lot.fg_due_date), "dd MMM") : '-'}</span>
                                  </div>
                                ) : (
                                  <div className={`mt-1 text-xs ${isNight ? 'text-sky-400' : 'text-blue-600'}`}>
                                    <span>Due: {lot.fg_due_date ? format(new Date(lot.fg_due_date), "dd MMM") : '-'}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      </CardContent>
    </Card>
  )
}
