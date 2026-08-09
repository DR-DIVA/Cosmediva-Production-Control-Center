'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scale, Beaker, ShieldCheck, Container, ScanBarcode, Box, CheckCircle2 } from 'lucide-react'

const PROCESS_STAGES = [
  { key: 'weigh', label: 'ชั่งสาร', icon: Scale, keywords: ['ชั่ง', 'mm-rm'] },
  { key: 'mix', label: 'ผสม', icon: Beaker, keywords: ['ผสม', 'mix', 'mx'] },
  { key: 'qc', label: 'รอ QC', icon: ShieldCheck, keywords: ['qc', 'quarantine', 'passed', 'rejected'] },
  { key: 'fill', label: 'บรรจุ', icon: Container, keywords: ['บรรจุ', 'packing', 'pk'] },
  { key: 'pof', label: 'POF / ลงลัง', icon: ScanBarcode, keywords: ['pof', 'อุโมงค์', 'แพค'] },
  { key: 'pack', label: 'คงคลัง FG', icon: Box, keywords: ['fg', 'คลัง', 'store', 'ลัง'] },
  { key: 'delivered', label: 'ส่งมอบ FG เรียบร้อย', icon: CheckCircle2, keywords: [] },
]

export default function ProductionLine({ activeLots, activeLogs = [] }: { activeLots: any[], activeLogs?: any[] }) {
  
  // Helper to determine status and tank count for a stage
  const getStageInfo = (lot: any, stageKey: string) => {
    if (stageKey === 'delivered') {
      const isDone = lot.current_status === 'DONE'
      return {
        count: isDone ? '✔' : '-',
        status: isDone ? 'active' : 'pending',
        totalAssigned: 0
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
    <Card className="col-span-full shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b bg-[#F8F6F0]/">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-800">Production Line (Digital Twin)</CardTitle>
          <div className="flex items-center space-x-4 text-xs text-slate-500 font-medium">
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
            <div className="sticky top-0 z-20 grid grid-cols-9 border-b bg-[#F8F6F0] p-4 text-sm font-semibold text-slate-700 shadow-sm">
              <div className="col-span-2 pl-2">LOT No. (สินค้า)</div>
              <div className="col-span-7 grid grid-cols-7 gap-2 text-center">
              {PROCESS_STAGES.map(stage => (
                <div key={stage.key} className="flex flex-col items-center justify-center space-y-1">
                  <stage.icon className="w-5 h-5 text-slate-400" />
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Rows */}
          {activeLots.length === 0 ? (
            <div className="p-8 text-center text-slate-500">ไม่มีข้อมูลออเดอร์ที่กำลังผลิต</div>
          ) : (
            activeLots.map((lot, idx) => (
              <div key={lot.id} className={`grid grid-cols-9 p-4 border-b items-center transition-colors hover:bg-[#F8F6F0]/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8F6F0]/30'}`}>
                
                {/* Lot Info */}
                <div className="col-span-2 pl-2">
                  <div className="font-bold text-slate-800 flex flex-wrap items-center gap-2 leading-tight">
                    {lot.products?.sku ? (
                      <>
                        <span className="text-base text-emerald-700">{lot.products.sku}</span>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">LOT: {lot.lot_no}</span>
                      </>
                    ) : (
                      <span className="text-base">{lot.lot_no}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate max-w-[200px]" title={lot.products?.product_name}>
                    {lot.products?.product_name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">ทั้งหมด: {lot.total_tanks || 0} ถัง</div>
                </div>

                {/* Pipeline Lanes */}
                <div className="col-span-7 grid grid-cols-7 gap-2 relative">
                  {/* The Background Line (ถนน) */}
                  <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-200 -translate-y-1/2 -z-10 rounded-full"></div>
                  
                  {PROCESS_STAGES.map((stage, sIdx) => {
                    const info = getStageInfo(lot, stage.key)
                    
                    // Colors based on status
                    const bgColors = {
                      completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                      active: 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-110',
                      warning: 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md scale-110',
                      error: 'bg-red-500 text-white border-red-600 shadow-md scale-110',
                      pending: 'bg-white text-slate-400 border-slate-200'
                    }

                    return (
                      <div key={stage.key} className="flex flex-col items-center relative z-10 group cursor-pointer">
                        {/* Connecting Progress Line */}
                        {sIdx > 0 && (
                          <div className={`absolute top-1/2 right-1/2 w-full h-1 -translate-y-1/2 -z-10 ${info.status !== 'pending' ? 'bg-emerald-400' : 'bg-transparent'}`}></div>
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
                        <div className="mt-2 text-[10px] font-medium h-4 flex items-center justify-center">
                          {info.status === 'active' && <span className="text-emerald-600 font-bold animate-pulse">● กำลังทำ</span>}
                          {info.status === 'warning' && <span className="text-yellow-600 font-bold">● รอคิว</span>}
                          {info.status === 'error' && <span className="text-red-600 font-bold animate-bounce">▲ ติดปัญหา</span>}
                          {info.status === 'completed' && <span className="text-emerald-500 font-bold">✓ เสร็จสิ้น</span>}
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
