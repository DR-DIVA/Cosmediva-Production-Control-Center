'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity, AlertTriangle, TrendingUp, Package, Box, ShieldAlert, CheckCircle2, Factory, Calendar, Search, Check, ChevronsUpDown, X, Layers, Filter } from 'lucide-react'
import ProductionLine from '@/components/dashboard/ProductionLine'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, addDays } from 'date-fns'
import { RollingMasterRadar } from '@/components/dashboard/RollingMasterRadar'

const parseRanges = (str: string) => {
  if (!str) return 0;
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  let total = 0;
  for (const p of parts) {
    if (p.includes('-')) {
      const [start, end] = p.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && end >= start) total += (end - start + 1);
    } else {
      if (!isNaN(Number(p))) total += 1;
    }
  }
  return total;
}

export default function DashboardPage() {
  const [mixingHours, setMixingHours] = useState(8)
  const [packingHours, setPackingHours] = useState(8)
  const [activeLots, setActiveLots] = useState<any[]>([])
  const [activeLogs, setActiveLogs] = useState<any[]>([])
  const [allDefects, setAllDefects] = useState<any[]>([])
  const [qaQcLogs, setQaQcLogs] = useState<any[]>([])
  const [fgLogs, setFgLogs] = useState<any[]>([])
  const [plannerLots, setPlannerLots] = useState<any[]>([])
  const [rmQcLogs, setRmQcLogs] = useState<any[]>([])
  const [fgQcLogs, setFgQcLogs] = useState<any[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [dashboardDate, setDashboardDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  const [qcMetrics, setQcMetrics] = useState({
    totalHold: 0,
    holdRM: 0,
    holdBulk: 0,
    holdFG: 0,
    reprocessBulk: 0,
    rejectTotal: 0
  })

  const [qaMetrics, setQaMetrics] = useState({
    openNc: 0,
    carCount: 0,
    resolvedCount: 0
  })

  const [plannerStats, setPlannerStats] = useState({
    poOnHand: 0,
    piecesOnHand: 0,
    totalTanksPlanned: 0,
    onTrackPct: '100.0'
  })

  const [fgInventoryStats, setFgInventoryStats] = useState({
    fgTotalPcs: 0,
    fgTotalCartons: 0,
    fgReleasedPcs: 0,
    fgQuarantinePcs: 0,
    fgMonthPcs: 0,
    fgTodayPcs: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [dashboardDate])

  const fetchDashboardData = async () => {
    const today = new Date(dashboardDate)
    const todayStart = startOfDay(today).toISOString()
    const todayEnd = endOfDay(today).toISOString()
    const monthStart = startOfMonth(today).toISOString()
    const monthEnd = endOfMonth(today).toISOString()

    // 1. Fetch Active Logs & Lots (For Production Overview)
    const logSelect = `
        id, status, tank_start, tank_end, production_lot_id, piece_quantity, start_time, end_time, process_id, updated_at, activity_date,
        processes (process_name), rooms (room_name), tank_details,
        production_lots (
          id, lot_no, current_status, total_tanks, capacity_max, kg_per_tank, g_per_piece, pcs_per_carton, qc_fg_passed_carton_ranges, planned_quantity, order_quantity,
          processes (process_name),
          products:sku_id (sku, product_name)
        )
      `
    
    // Fetch all lots (active and completed)
    const { data: activeLotsData } = await supabase.from('production_lots')
      .select(`
        id, lot_no, current_status, total_tanks, capacity_max, kg_per_tank, g_per_piece, pcs_per_carton, qc_fg_passed_carton_ranges, planned_quantity, order_quantity, updated_at, created_at,
        order_type, planned_start_date, fg_due_date,
        processes (process_name),
        products:sku_id (sku, product_name)
      `)
      .order('created_at', { ascending: true })

    const activeLotIds = activeLotsData && activeLotsData.length > 0 ? activeLotsData.map((l: any) => l.id) : ['none']

    const [ { data: activeLogsInitial }, { data: todayLogsInitial }, { data: activityLogsInitial } ] = await Promise.all([
      supabase.from('production_logs').select(logSelect).in('production_lot_id', activeLotIds),
      supabase.from('production_logs').select(logSelect).gte('updated_at', todayStart).lte('updated_at', todayEnd),
      supabase.from('production_logs').select(logSelect).eq('activity_date', dashboardDate)
    ])

    const logsMap = new Map()
    if (activeLogsInitial) activeLogsInitial.forEach(l => logsMap.set(l.id, l))
    if (todayLogsInitial) todayLogsInitial.forEach(l => logsMap.set(l.id, l))
    if (activityLogsInitial) activityLogsInitial.forEach(l => logsMap.set(l.id, l))
    const logs = Array.from(logsMap.values())
    
    if (logs.length > 0) {
      setActiveLogs(logs)
    }

    if (activeLotsData) {
      const sevenDaysLimit = new Date(today).getTime() - 7 * 24 * 60 * 60 * 1000

      const filteredLots = activeLotsData.filter((lot: any) => {
        if (lot.current_status !== 'DONE') return true

        const lotLogs = logs.filter(l => l.production_lot_id === lot.id)
        let latestTime = 0
        lotLogs.forEach(l => {
          const t = new Date(l.activity_date || l.updated_at || l.created_at).getTime()
          if (t > latestTime) latestTime = t
        })

        if (latestTime === 0) {
          latestTime = new Date(lot.updated_at || lot.created_at).getTime()
        }

        let dueDateTime = Infinity
        if (lot.fg_due_date) {
          dueDateTime = new Date(lot.fg_due_date).getTime()
        }

        const effectiveTime = Math.min(latestTime || Infinity, dueDateTime)

        return effectiveTime >= sevenDaysLimit
      })

      const sortedLots = [...filteredLots]
      
      const getWeighDate = (lotId: string) => {
        const weighLog = logs.find(l => 
          l.production_lot_id === lotId && 
          ((l.processes?.process_name || '').toLowerCase().includes('ชั่ง') || 
           (l.processes?.process_name || '').toLowerCase().includes('mm-rm')) &&
          (parseInt(l.tank_start) <= 1 && (parseInt(l.tank_end) || parseInt(l.tank_start)) >= 1 || parseInt(l.tank_start) === 1)
        );
        return weighLog?.activity_date ? new Date(weighLog.activity_date).getTime() : Infinity;
      };
      
      sortedLots.sort((a, b) => getWeighDate(a.id) - getWeighDate(b.id));
      setActiveLots(sortedLots)
    }

    // 2. Fetch Defects (Today)
    const { data: defects } = await supabase.from('production_logs')
      .select('*, processes(process_name)')
      .eq('status', 'DEFECT')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
    if (defects) setAllDefects(defects)

    // 3. Fetch Comprehensive QC & QA & FG & Planner metrics
    const [
      { data: rmItemsData },
      { data: bulkLogsData },
      { data: fgInventoryData },
      { data: qaLogsData },
      { data: plannedLotsData }
    ] = await Promise.all([
      supabase.from('production_lot_rms').select('id, rm_code, qc_status, status, receive_date'),
      supabase.from('production_logs').select('id, status, tank_start, tank_end, tank_details, processes(process_name)'),
      supabase.from('fg_inventory').select('id, lot_no, receive_qty_cartons, receive_qty_pcs, qc_status, created_at'),
      supabase.from('production_logs').select('id, note, status, updated_at, created_at').or('note.ilike.%[QC HOLD]%,note.ilike.%[QC REJECT]%,note.ilike.%[QC REPROCESS]%,note.ilike.%[แจ้งปัญหา]%,note.ilike.%[CAR]%,note.ilike.%[QA RESOLVED]%'),
      supabase.from('production_lots').select('id, planned_quantity, order_quantity, total_tanks, fg_due_date').neq('current_status', 'DONE')
    ])

    if (plannedLotsData) {
      setPlannerLots(plannedLotsData)
      let onTrackCount = 0
      let totalTanks = 0
      const todayDateStr = format(new Date(), 'yyyy-MM-dd')
      plannedLotsData.forEach((l: any) => {
        totalTanks += (l.total_tanks || 0)
        if (!l.fg_due_date || l.fg_due_date >= todayDateStr) {
          onTrackCount++
        }
      })
      const pieces = plannedLotsData.reduce((sum: number, l: any) => sum + (l.planned_quantity || 0), 0)
      const onTrack = plannedLotsData.length > 0 ? ((onTrackCount / plannedLotsData.length) * 100).toFixed(1) : '100.0'
      setPlannerStats({
        poOnHand: plannedLotsData.length,
        piecesOnHand: pieces,
        totalTanksPlanned: totalTanks,
        onTrackPct: onTrack
      })
    }

    // Compute QC Metrics
    let holdRM = 0, holdBulk = 0, holdFG = 0, reprocessBulk = 0, rejectTotal = 0
    ;(rmItemsData || []).forEach(r => {
      if (r.qc_status === 'HOLD') holdRM++
      if (r.qc_status === 'REJECTED') rejectTotal++
    })

    ;(bulkLogsData || []).forEach((t: any) => {
      const pName = Array.isArray(t.processes) ? t.processes[0]?.process_name : t.processes?.process_name
      if (pName === 'รอ QC') {
        const details = t.tank_details || {}
        const start = parseInt(t.tank_start) || 1
        const end = parseInt(t.tank_end) || start
        for (let i = start; i <= end; i++) {
          const s = details[i]
          if (s === 'PAUSED' || s === 'HOLD') holdBulk++
          if (s === 'REPROCESS') reprocessBulk++
          if (s === 'FAILED' || s === 'REJECTED') rejectTotal++
        }
      }
    })

    let fgReleasedPcs = 0, fgQuarantinePcs = 0, fgTotalPcs = 0, fgTotalCartons = 0, fgMonthPcs = 0, fgTodayPcs = 0
    ;(fgInventoryData || []).forEach(f => {
      const pcs = f.receive_qty_pcs || 0
      const ctn = f.receive_qty_cartons || 0
      fgTotalPcs += pcs
      fgTotalCartons += ctn

      if (f.created_at >= monthStart && f.created_at <= monthEnd) {
        fgMonthPcs += pcs
      }
      if (f.created_at >= todayStart && f.created_at <= todayEnd) {
        fgTodayPcs += pcs
      }

      if (f.qc_status === 'RELEASED' || f.qc_status === 'PASSED') {
        fgReleasedPcs += pcs
      } else if (f.qc_status === 'QUARANTINE' || f.qc_status === 'HOLD') {
        holdFG++
        fgQuarantinePcs += pcs
      } else if (f.qc_status === 'REJECTED') {
        rejectTotal++
      }
    })

    setQcMetrics({
      totalHold: holdRM + holdBulk + holdFG,
      holdRM,
      holdBulk,
      holdFG,
      reprocessBulk,
      rejectTotal
    })

    // Compute QA Metrics
    let openNc = 0, carCount = 0, resolvedCount = 0
    ;(qaLogsData || []).forEach(l => {
      const note = l.note || ''
      const isResolved = note.includes('[QA RESOLVED]') || note.includes('ปิดปัญหาแล้ว') || note.includes('RESOLVED')
      if (note.includes('[CAR]')) carCount++
      if (isResolved) {
        resolvedCount++
      } else if (note.includes('[QC HOLD]') || note.includes('[QC REJECT]') || note.includes('[QC REPROCESS]') || note.includes('[แจ้งปัญหา]')) {
        openNc++
      }
    })

    setQaMetrics({ openNc, carCount, resolvedCount })

    setFgInventoryStats({
      fgTotalPcs,
      fgTotalCartons,
      fgReleasedPcs,
      fgQuarantinePcs,
      fgMonthPcs,
      fgTodayPcs
    })
  }

  // --- Calculations ---

  const filteredLots = selectedFilter === 'all' ? activeLots : activeLots.filter(l => l.id === selectedFilter)
  
  // 1. กำลังการผลิตวันนี้ (แยก 5 กรอบ)
  const prodOutput = { weighing: 0, mixing: 0, packing: 0, pof: 0, qc: 0 }
  const prodTarget = { weighing: 0, mixing: 0, packing: 0, pof: 0, qc: 0 }

  const todayStr = dashboardDate;

  activeLogs.forEach(log => {
    if (selectedFilter !== 'all' && log.production_lot_id !== selectedFilter) return;
    
    const pName = (log.processes as any)?.process_name || ''
    const lot = log.production_lots as any
    if (!lot) return;
    
    const isPlannedForToday = log.activity_date === todayStr;
    const isUpdatedToday = new Date(log.updated_at).getTime() >= new Date(new Date(dashboardDate).setHours(0,0,0,0)).getTime() && new Date(log.updated_at).getTime() <= new Date(new Date(dashboardDate).setHours(23,59,59,999)).getTime();
    
    let hasActivityToday = false;
    if (log.tank_details && Object.keys(log.tank_details).length > 0) {
      Object.keys(log.tank_details).forEach(key => {
        if (key.endsWith('_history')) {
          const history = log.tank_details[key] || [];
          if (Array.isArray(history)) {
             const workedToday = history.some(h => {
                if (!h.timestamp) return false;
                const t = new Date(h.timestamp).getTime();
                const start = new Date(dashboardDate).setHours(0,0,0,0);
                const end = new Date(dashboardDate).setHours(23,59,59,999);
                return t >= start && t <= end;
             });
             if (workedToday) hasActivityToday = true;
          }
        }
      });
    }

    // If it's not planned for today and nobody worked on it today, ignore it completely for this dashboard.
    if (!isPlannedForToday && !isUpdatedToday && !hasActivityToday) return;
    
    const taskTanks = (log.tank_start && log.tank_end) ? (log.tank_end - log.tank_start + 1) : (lot.total_tanks || 0)
    const calculatedQty = (taskTanks && lot.kg_per_tank && lot.g_per_piece) ? Math.floor(taskTanks * (lot.kg_per_tank * 1000 / lot.g_per_piece)) : 0;
    const targetQty = calculatedQty || lot.planned_quantity || lot.order_quantity || 0

    // Count actual progress from tank_details if available, else fallback
    let completedTanks = 0
    let completedPieces = 0
    let todayOutputTanks = 0
    let todayOutputPieces = 0
    const isLogDone = ['DONE', 'MOVED', 'SENT_TO_QC', 'QC_PASS', 'SENT_TO_PACKING', 'SENT_TO_POF', 'SENT_TO_QA', 'SENT_TO_WH'].includes(log.status)

    if (log.tank_details && Object.keys(log.tank_details).length > 0) {
      Object.keys(log.tank_details).forEach(key => {
        if (key.endsWith('_history') || key === 'history') return;
        const val = log.tank_details[key]
        const s = typeof val === 'string' ? val : (val?.status || '')
        const isDone = ['DONE', 'MOVED', 'SENT_TO_QC', 'QC_PASS', 'SENT_TO_PACKING', 'SENT_TO_POF', 'SENT_TO_QA', 'SENT_TO_WH'].includes(s)
        
        let completedToday = false;
        const historyKey = `${key}_history`
        const history = log.tank_details[historyKey] || []
        
        if (Array.isArray(history) && history.length > 0) {
           const doneEvents = history.filter(h => ['DONE', 'MOVED', 'SENT_TO_QC', 'QC_PASS', 'SENT_TO_PACKING', 'SENT_TO_POF', 'SENT_TO_QA', 'SENT_TO_WH'].includes(h.status));
           if (doneEvents.length > 0) {
              const doneToday = doneEvents.some(h => {
                 const t = new Date(h.timestamp).getTime();
                 const start = new Date(dashboardDate).setHours(0,0,0,0);
                 const end = new Date(dashboardDate).setHours(23,59,59,999);
                 return t >= start && t <= end;
              });
              if (doneToday) completedToday = true;
           }
        }
        
        if (isDone) {
           completedTanks++
           let thisTankPieces = 0
           if (typeof val === 'object' && val !== null) {
             if (val.cartons) thisTankPieces = (val.cartons * (lot.pcs_per_carton || 1))
             else if (val.pieces) thisTankPieces = val.pieces
           }
           
           if (thisTankPieces === 0 && lot.kg_per_tank && lot.g_per_piece) {
              thisTankPieces = Math.floor(1 * (lot.kg_per_tank * 1000 / lot.g_per_piece));
           }

           completedPieces += thisTankPieces
           
           if (completedToday || (isPlannedForToday && !Array.isArray(history))) {
              todayOutputTanks++
              todayOutputPieces += thisTankPieces
           }
        }
      })
      
      // Add to today's outputs from tank_details
      if (todayOutputTanks > 0 || todayOutputPieces > 0) {
        if (pName.includes('ชั่ง')) prodOutput.weighing += todayOutputTanks;
        if (pName.includes('ผสม')) prodOutput.mixing += todayOutputTanks;
        if (pName.includes('บรรจุ')) prodOutput.packing += todayOutputPieces;
        if (pName.includes('POF') || pName.includes('อุโมงค์') || pName.includes('ลงลัง')) prodOutput.pof += todayOutputPieces;
      }
      
    } else if (isLogDone) {
      completedTanks = taskTanks
      completedPieces = log.piece_quantity || targetQty
      
      let outputPieces = completedPieces || (completedTanks && lot.kg_per_tank && lot.g_per_piece ? Math.floor(completedTanks * (lot.kg_per_tank * 1000 / lot.g_per_piece)) : 0);
      if (isLogDone && outputPieces === 0) {
         outputPieces = log.piece_quantity || targetQty;
      }
      
      if (isUpdatedToday || isPlannedForToday) {
        if (pName.includes('ชั่ง')) prodOutput.weighing += completedTanks;
        if (pName.includes('ผสม')) prodOutput.mixing += completedTanks;
        if (pName.includes('บรรจุ')) prodOutput.packing += outputPieces;
        if (pName.includes('POF') || pName.includes('อุโมงค์') || pName.includes('ลงลัง')) prodOutput.pof += outputPieces;
      }
    }
    
    // Targets: Only count if it's explicitly planned for TODAY
    if (isPlannedForToday) {
      if (pName.includes('ชั่ง')) prodTarget.weighing += taskTanks;
      if (pName.includes('ผสม')) prodTarget.mixing += taskTanks;
      if (pName.includes('บรรจุ')) prodTarget.packing += targetQty;
      if (pName.includes('POF') || pName.includes('อุโมงค์') || pName.includes('ลงลัง')) prodTarget.pof += targetQty;
      if (pName.includes('รอ QC')) {
         const start = parseInt(log.tank_start) || 1;
         const end = parseInt(log.tank_end) || start;
         prodTarget.qc += (end - start + 1);
      }
    }

    // Bulk QC Output: Check history for QC_PASS on dashboardDate
    if (pName === 'รอ QC' && log.tank_details) {
      Object.keys(log.tank_details).forEach(key => {
        if (key.endsWith('_history')) {
          const histories = log.tank_details[key] as any[]
          if (Array.isArray(histories)) {
             const hasPassToday = histories.some(h => 
               h.status === 'QC_PASS' && 
               new Date(h.timestamp).getTime() >= new Date(dashboardDate).setHours(0,0,0,0) && 
               new Date(h.timestamp).getTime() <= new Date(dashboardDate).setHours(23,59,59,999)
             )
             if (hasPassToday) prodOutput.qc += 1;
          }
        }
      })
    }
  })

  // Add RM and FG Queues to QC Metric
  rmQcLogs.forEach(rm => {
     if (rm.status === 'RECEIVED' && rm.receive_date === dashboardDate) {
        prodTarget.qc += 1;
     }
     if (rm.qc_status && rm.updated_at) {
        const updateTime = new Date(rm.updated_at).getTime();
        const start = new Date(dashboardDate).setHours(0,0,0,0);
        const end = new Date(dashboardDate).setHours(23,59,59,999);
        if (updateTime >= start && updateTime <= end) {
           prodOutput.qc += 1;
        }
     }
  })

  fgQcLogs.forEach(fg => {
     if (fg.qc_status === 'QUARANTINE' && fg.created_at) {
        const createTime = new Date(fg.created_at).getTime();
        const start = new Date(dashboardDate).setHours(0,0,0,0);
        const end = new Date(dashboardDate).setHours(23,59,59,999);
        if (createTime >= start && createTime <= end) {
           prodTarget.qc += 1;
        }
     }
     if (fg.qc_status !== 'QUARANTINE' && fg.updated_at) {
        const updateTime = new Date(fg.updated_at).getTime();
        const start = new Date(dashboardDate).setHours(0,0,0,0);
        const end = new Date(dashboardDate).setHours(23,59,59,999);
        if (updateTime >= start && updateTime <= end) {
           prodOutput.qc += 1;
        }
     }
  })

  // 2. %Yield (ผสม, บรรจุ)
  const yieldMixing = 98.5
  const yieldPacking = 97.2

  // 3. %Defect (ชั่งสาร, ผสม, บรรจุ, POF)
  const getDefects = (processKeywords: string[]) => {
    return allDefects.filter(d => {
      const pName = (d.processes as any)?.process_name || ''
      return processKeywords.some(kw => pName.includes(kw))
    }).reduce((sum, d) => sum + (d.piece_quantity || 0), 0)
  }
  const defectsCount = {
    weighing: getDefects(['ชั่ง']),
    mixing: getDefects(['ผสม']),
    packing: getDefects(['บรรจุ']),
    pof: getDefects(['POF', 'อุโมงค์', 'ลงลัง'])
  }
  
  const calcDefectPct = (defects: number, output: number) => {
    if (output + defects === 0) return '0.00'
    return ((defects / (output + defects)) * 100).toFixed(2)
  }

  const defectPct = {
    weighing: calcDefectPct(defectsCount.weighing, prodOutput.weighing),
    mixing: calcDefectPct(defectsCount.mixing, prodOutput.mixing),
    packing: calcDefectPct(defectsCount.packing, prodOutput.packing),
    pof: calcDefectPct(defectsCount.pof, prodOutput.pof)
  }

  // 4. OEE (ผสม, บรรจุ)
  let maxMixingCap = 0; let maxPackingCap = 0;
  filteredLots.forEach(lot => {
    if (lot.capacity_max) {
      maxMixingCap += lot.capacity_max * mixingHours * 0.1 
      maxPackingCap += lot.capacity_max * packingHours
    }
  })
  if (maxMixingCap === 0) maxMixingCap = 100;
  if (maxPackingCap === 0) maxPackingCap = 100000;

  const oeeMixing = ((prodOutput.mixing / maxMixingCap) * 100 * 0.85).toFixed(1)
  const oeePacking = ((prodOutput.packing / maxPackingCap) * 100 * 0.85).toFixed(1)

  // 5. QC (HOLD, REPROCESS, REJECT)
  const countQcStatus = (status: string) => qaQcLogs.filter(l => l.status === status).length

  // 6. QA Issues (NC, CAR)
  const countQaStatus = (status: string) => qaQcLogs.filter(l => l.status === status).length

  // 7 & 8. Planner Queue
  const poOnHand = plannerLots.length
  const piecesOnHand = plannerLots.reduce((sum, l) => sum + (l.planned_quantity || 0), 0)

  // 9. FG Warehouse
  // FIX HYDRATION MISMATCH: Use the todayStart we already calculated in fetchDashboardData
  // Since we only need it for filtering, we can just use the start of day string.
  // Wait, startOfDay needs to be consistent. Let's just use a static date string for the client on initial render,
  // or wrap it in a useMemo that only runs after mount.
  const [todayStartStr, setTodayStartStr] = useState<string>('');
  useEffect(() => {
    setTodayStartStr(startOfDay(new Date()).toISOString());
  }, []);
  
  let fgToday = 0
  let fgMonth = 0
  fgLogs.forEach(log => {
    const pcs = (log.piece_quantity || 0) + ((log.tank_details?.cartons || 0) * (log.production_lots?.pcs_per_carton || 1))
    fgMonth += pcs
    if (todayStartStr && log.created_at >= todayStartStr) {
      fgToday += pcs
    }
  })

  const [filterSearch, setFilterSearch] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Group Lots by SKU for Dropdown (optional) & Search Filtering
  const filteredSearchLots = activeLots.filter(lot => {
    if (!filterSearch.trim()) return true
    const q = filterSearch.toLowerCase().trim()
    const sku = (lot.products?.sku || '').toLowerCase()
    const lotNo = (lot.lot_no || '').toLowerCase()
    const pName = (lot.products?.product_name || '').toLowerCase()
    return sku.includes(q) || lotNo.includes(q) || pName.includes(q)
  })

  const selectedLot = activeLots.find(l => l.id === selectedFilter)

  return (
    <div className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-6 max-w-[1400px] w-full mx-auto bg-transparent min-h-screen pb-12 font-sans text-[#4A4238]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Activity className="w-8 h-8 text-yellow-400" />
            CosmeFlow Executive Dashboard
          </h2>
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
            Turn Factory Data into Business Decisions.
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <div className="flex items-center gap-2 bg-white border border-[#D4AF37]/30 rounded-xl p-1.5 shadow-xs">
             <Calendar className="w-5 h-5 text-yellow-500 ml-1.5" />
             <input 
               type="date" 
               className="bg-transparent border-none outline-none text-sm font-semibold text-[#4A4238] p-0.5 pr-2 cursor-pointer"
               value={dashboardDate}
               onChange={(e) => setDashboardDate(e.target.value)}
             />
          </div>

          {/* Smart Searchable Lot Filter */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger
              className="flex items-center justify-between gap-2 px-3.5 h-11 bg-white hover:bg-slate-50 border border-[#D4AF37]/40 rounded-xl shadow-xs transition-all duration-200 min-w-[220px] max-w-[320px] text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {selectedFilter === 'all' ? (
                  <>
                    <div className="p-1.5 rounded-lg bg-[#D4AF37]/15 text-[#8B7355] shrink-0">
                      <Layers className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#4A4238] truncate">ภาพรวมโรงงาน</span>
                      <span className="text-[10px] text-slate-500 font-medium truncate">ทุกล็อตการผลิต ({activeLots.length})</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700 shrink-0">
                      <Package className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#4A4238] truncate">
                        {selectedLot?.products?.sku || 'SKU'} • LOT {selectedLot?.lot_no}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium truncate">
                        {selectedLot?.products?.product_name || 'เฉพาะล็อตนี้'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {selectedFilter !== 'all' && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFilter('all')
                    }}
                    className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition"
                    title="กลับสู่ภาพรวมโรงงาน"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronsUpDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </div>
            </PopoverTrigger>

            <PopoverContent className="w-80 md:w-96 p-0 bg-white border border-[#D4AF37]/30 shadow-2xl rounded-2xl overflow-hidden z-50" align="end">
              {/* Search Box Header */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/70">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="พิมพ์ค้นหา SKU, Lot No, หรือชื่อสินค้า..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#D4AF37]/40 rounded-lg"
                    autoFocus
                  />
                  {filterSearch && (
                    <button
                      type="button"
                      onClick={() => setFilterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Option: Factory Overview */}
              <div className="p-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter('all')
                    setIsFilterOpen(false)
                    setFilterSearch('')
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    selectedFilter === 'all'
                      ? 'bg-amber-500/10 text-[#4A4238] font-bold border border-[#D4AF37]/40'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg ${selectedFilter === 'all' ? 'bg-[#D4AF37] text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>ภาพรวมโรงงานทั้งหมด (Factory Overview)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">แสดงสรุปผลรวมทุกสายงานการผลิต</div>
                    </div>
                  </div>
                  {selectedFilter === 'all' && (
                    <div className="p-1 rounded-full bg-[#D4AF37] text-white shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              </div>

              {/* Search Results List */}
              <div className="max-h-72 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100/60">
                {filteredSearchLots.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    ไม่พบงานที่ตรงกับ &quot;{filterSearch}&quot;
                  </div>
                ) : (
                  filteredSearchLots.map((lot) => {
                    const isSelected = selectedFilter === lot.id
                    return (
                      <button
                        key={lot.id}
                        type="button"
                        onClick={() => {
                          setSelectedFilter(lot.id)
                          setIsFilterOpen(false)
                          setFilterSearch('')
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer pt-2 ${
                          isSelected
                            ? 'bg-amber-500/10 border border-[#D4AF37]/40 shadow-xs'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">{lot.products?.sku || 'SKU'}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700">
                                LOT {lot.lot_no}
                              </span>
                              {lot.total_tanks && (
                                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50">
                                  {lot.total_tanks} ถัง
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {lot.products?.product_name || 'ไม่มีชื่อสินค้า'}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1 rounded-full bg-[#D4AF37] text-white shrink-0 ml-2">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {/* Footer Summary */}
              <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 flex justify-between items-center px-3">
                <span>แสดง {filteredSearchLots.length} จาก {activeLots.length} ล็อต</span>
                {filterSearch && (
                  <button
                    type="button"
                    onClick={() => setFilterSearch('')}
                    className="text-[#8B7355] font-semibold hover:underline"
                  >
                    ล้างการค้นหา
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 🧭 14-Day Rolling Master Radar (Placed at top as requested) */}
      <RollingMasterRadar 
        startDateStr={dashboardDate} 
        onSelectLot={(lotId) => setSelectedFilter(lotId)} 
      />
      
      {/* 1. กำลังการผลิตวันนี้ */}
      <h3 className="text-xl font-bold text-[#4A4238] mt-10 mb-4 border-b border-[#D4AF37]/30 pb-3 flex items-center gap-2">
        <span className="text-yellow-400 text-2xl font-black">1.</span> กำลังการผลิตวันนี้ (Production Volume)
      </h3>
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard title="ชั่งสาร" value={prodOutput.weighing} target={prodTarget.weighing} unit="ถัง" glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]" />
        <MetricCard title="ผสม" value={prodOutput.mixing} target={prodTarget.mixing} unit="ถัง" glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]" />
        <MetricCard title="บรรจุ" value={prodOutput.packing} target={prodTarget.packing} unit="ชิ้น" glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]" />
        <MetricCard title="ลงลัง (POF)" value={prodOutput.pof} target={prodTarget.pof} unit="ชิ้น" glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]" />
        <MetricCard title="QC" value={prodOutput.qc} target={prodTarget.qc} unit="รายการ" glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        {/* 2. %Yield */}
        <div>
           <h3 className="text-xl font-bold text-[#4A4238] mb-4 border-b border-[#D4AF37]/30 pb-3 flex items-center gap-2">
             <span className="text-yellow-400 text-2xl font-black">2.</span> % Yield
           </h3>
           <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <YieldCard title="แผนกผสม" value={yieldMixing} />
              <YieldCard title="แผนกบรรจุ" value={yieldPacking} />
           </div>
        </div>

        {/* 4. OEE */}
        <div>
           <h3 className="text-xl font-bold text-[#4A4238] mb-4 border-b border-[#D4AF37]/30 pb-3 flex items-center gap-2">
             <span className="text-yellow-400 text-2xl font-black">4.</span> ประสิทธิภาพเครื่องจักร (OEE)
           </h3>
           <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <OeeCard title="เครื่องผสม" value={Number(oeeMixing)} hours={mixingHours} onHoursChange={setMixingHours} />
              <OeeCard title="เครื่องบรรจุ" value={Number(oeePacking)} hours={packingHours} onHoursChange={setPackingHours} />
           </div>
        </div>
      </div>

      {/* 3. %Defect */}
      <h3 className="text-xl font-bold text-[#4A4238] mt-10 mb-4 border-b border-[#D4AF37]/30 pb-3 flex items-center gap-2">
        <span className="text-yellow-400 text-2xl font-black">3.</span> ของเสียรายแผนก (% Defect)
      </h3>
      <div className="grid gap-4 md:grid-cols-4">
        <DefectCard title="ชั่งสาร" value={defectPct.weighing} count={defectsCount.weighing} />
        <DefectCard title="ผสม" value={defectPct.mixing} count={defectsCount.mixing} />
        <DefectCard title="บรรจุ" value={defectPct.packing} count={defectsCount.packing} />
        <DefectCard title="ลงลัง (POF)" value={defectPct.pof} count={defectsCount.pof} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-10">
         {/* 5. QC Status & 6. QA Issues */}
         <Card className="bg-white border-[#D4AF37]/30 shadow-xl overflow-hidden relative group rounded-2xl">
           <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <CardHeader className="bg-[#F8F6F0] border-b border-[#D4AF37]/30 pb-3">
             <div className="flex justify-between items-center">
               <CardTitle className="text-base font-bold flex items-center gap-2.5 text-[#4A4238]">
                 <ShieldAlert className="w-5 h-5 text-rose-500" /> 
                 <div><span className="text-[#D4AF37] font-black">5-6.</span> คุณภาพและปัญหา (QC & QA)</div>
               </CardTitle>
               <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                 Real-time Assurance
               </span>
             </div>
           </CardHeader>
           <CardContent className="p-5 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
               {/* QC Inspection Status */}
               <div className="space-y-3">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                   <h4 className="font-bold text-[#4A4238] text-xs uppercase tracking-wider flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-amber-500"></span> สถานะการตรวจ (QC)
                   </h4>
                   <span className="text-[10px] text-slate-400 font-medium">หน้างานทั้งหมด</span>
                 </div>
                 
                 <div className="space-y-2">
                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                     <div>
                       <span className="text-amber-900 font-bold text-xs">🟡 กักตรวจ (HOLD)</span>
                       <div className="text-[10px] text-amber-700">RM/PM {qcMetrics.holdRM} • FG {qcMetrics.holdFG} กล่อง</div>
                     </div>
                     <span className="text-base font-black text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-lg">
                       {qcMetrics.totalHold}
                     </span>
                   </div>

                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/60">
                     <div>
                       <span className="text-sky-900 font-bold text-xs">🔵 สั่งแก้สูตร (REPROCESS)</span>
                       <div className="text-[10px] text-sky-700">ถังผสมที่ต้องปรับปรุง</div>
                     </div>
                     <span className="text-base font-black text-sky-700 bg-sky-100/80 px-2.5 py-0.5 rounded-lg">
                       {qcMetrics.reprocessBulk}
                     </span>
                   </div>

                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/60">
                     <div>
                       <span className="text-rose-900 font-bold text-xs">🔴 ไม่ผ่าน/ตีกลับ (REJECT)</span>
                       <div className="text-[10px] text-rose-700">ของตกเกณฑ์/ส่งคืน</div>
                     </div>
                     <span className="text-base font-black text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-lg">
                       {qcMetrics.rejectTotal}
                     </span>
                   </div>
                 </div>
               </div>

               {/* QA Compliance & Issues */}
               <div className="space-y-3">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                   <h4 className="font-bold text-[#4A4238] text-xs uppercase tracking-wider flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-rose-500"></span> ข้อบกพร่อง (QA)
                   </h4>
                   <span className="text-[10px] text-slate-400 font-medium">Compliance & Issues</span>
                 </div>

                 <div className="space-y-2">
                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                     <div>
                       <span className="text-[#4A4238] font-bold text-xs">⚠️ รอแก้ไข (Open NCs)</span>
                       <div className="text-[10px] text-slate-500">เคสปัญหาที่รอปิด</div>
                     </div>
                     <span className="text-base font-black text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-lg">
                       {qaMetrics.openNc}
                     </span>
                   </div>

                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                     <div>
                       <span className="text-[#4A4238] font-bold text-xs">📋 มาตรการป้องกัน (CAR)</span>
                       <div className="text-[10px] text-slate-500">เคสระดับโรงงาน</div>
                     </div>
                     <span className="text-base font-black text-slate-700 bg-slate-200/80 px-2.5 py-0.5 rounded-lg">
                       {qaMetrics.carCount}
                     </span>
                   </div>

                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                     <div>
                       <span className="text-emerald-900 font-bold text-xs">✅ ปิดปัญหาแล้ว (Resolved)</span>
                       <div className="text-[10px] text-emerald-700">QA อนุมัติผ่านเกณฑ์</div>
                     </div>
                     <span className="text-base font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                       {qaMetrics.resolvedCount}
                     </span>
                   </div>
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>

         {/* 7-9. Planner & Warehouse */}
         <Card className="bg-white border-[#D4AF37]/30 shadow-xl overflow-hidden relative group rounded-2xl">
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <CardHeader className="bg-[#F8F6F0] border-b border-[#D4AF37]/30 pb-3">
             <div className="flex justify-between items-center">
               <CardTitle className="text-base font-bold flex items-center gap-2.5 text-[#4A4238]">
                 <Package className="w-5 h-5 text-emerald-600" /> 
                 <div><span className="text-[#D4AF37] font-black">7-9.</span> คิวงานและคลังสินค้า (Planner & FG)</div>
               </CardTitle>
               <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                 สต็อก FG รวม {fgInventoryStats.fgTotalPcs.toLocaleString()} ชิ้น
               </span>
             </div>
           </CardHeader>
           <CardContent className="p-5 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
               {/* Planner Queue */}
               <div className="space-y-3">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                   <h4 className="font-bold text-[#4A4238] text-xs uppercase tracking-wider flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-amber-500"></span> แผนการผลิต (Planner)
                   </h4>
                   <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                     ตรงแผน {plannerStats.onTrackPct}%
                   </span>
                 </div>
                 
                 <div className="space-y-2">
                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                     <div>
                       <span className="text-xs font-semibold text-slate-700">📋 PO ในมือ (Active POs)</span>
                       <div className="text-[10px] text-slate-400">กำลังผลิต {plannerStats.totalTanksPlanned} ถัง</div>
                     </div>
                     <span className="text-base font-black text-[#D4AF37]">{plannerStats.poOnHand} ล็อต</span>
                   </div>

                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                     <div>
                       <span className="text-xs font-semibold text-slate-700">📦 ยอดชิ้นงานรอผลิต</span>
                       <div className="text-[10px] text-slate-400">รวมทุกคำสั่งผลิตตามแผน</div>
                     </div>
                     <span className="text-base font-black text-[#4A4238]">{plannerStats.piecesOnHand.toLocaleString()}</span>
                   </div>
                 </div>
               </div>

               {/* FG Warehouse */}
               <div className="space-y-3">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                   <h4 className="font-bold text-[#4A4238] text-xs uppercase tracking-wider flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span> คลังสินค้าสำเร็จรูป (FG)
                   </h4>
                   <span className="text-[10px] text-slate-500 font-medium">
                     เข้าเดือนนี้ {fgInventoryStats.fgMonthPcs.toLocaleString()}
                   </span>
                 </div>

                 <div className="space-y-2">
                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                     <div>
                       <span className="text-xs font-bold text-emerald-800">🟢 พร้อมส่งมอบ (Released)</span>
                       <div className="text-[10px] text-emerald-600">ตรวจแล็บผ่านแล้ว พร้อมส่ง</div>
                     </div>
                     <span className="text-base font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                       {fgInventoryStats.fgReleasedPcs.toLocaleString()}
                     </span>
                   </div>

                   <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                     <div>
                       <span className="text-xs font-bold text-amber-800">🟡 กักตรวจเชื้อ (Quarantine)</span>
                       <div className="text-[10px] text-amber-600">อยู่ระหว่างรอบ่มเชื้อ/ผลตรวจ ({fgInventoryStats.fgTotalCartons} ลัง)</div>
                     </div>
                     <span className="text-base font-black text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-lg">
                       {fgInventoryStats.fgQuarantinePcs.toLocaleString()}
                     </span>
                   </div>
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>
      </div>

      {/* 10. Performance Section */}
      <h3 className="text-xl font-bold text-[#4A4238] mt-10 mb-4 border-b border-[#D4AF37]/30 pb-3 flex items-center gap-2">
        <span className="text-yellow-400 text-2xl font-black">10.</span> Performance รายแผนก
      </h3>
      <div className="bg-white rounded-2xl shadow-xl border border-[#D4AF37]/30 p-8">
         <div className="grid gap-6 md:grid-cols-5">
            <PerfItem title="ชั่งสาร" value={prodOutput.weighing} target={prodTarget.weighing} />
            <PerfItem title="ผสม" value={prodOutput.mixing} target={prodTarget.mixing} />
            <PerfItem title="บรรจุ" value={prodOutput.packing} target={prodTarget.packing} />
            <PerfItem title="ลงลัง (POF)" value={prodOutput.pof} target={prodTarget.pof} />
            <PerfItem title="QC" value={prodOutput.qc} target={prodTarget.qc} />
         </div>
      </div>

      {/* Digital Twin Pipeline */}
      <div className="bg-white rounded-2xl shadow-xl border border-[#D4AF37]/30 p-6 mt-10 overflow-hidden">
        <div className="flex justify-between items-center mb-6 border-b border-[#D4AF37]/30 pb-4">
          <h3 className="text-lg font-bold text-[#4A4238] flex items-center gap-3">
            <Factory className="w-5 h-5 text-yellow-400" />
            Digital Twin Pipeline - {selectedFilter === 'all' ? 'ทุกออเดอร์' : <span className="text-yellow-400">LOT {filteredLots[0]?.lot_no}</span>}
          </h3>
        </div>
        <div className="bg-transparent p-4 rounded-xl border border-[#D4AF37]/30">
          <ProductionLine activeLots={filteredLots} activeLogs={activeLogs} />
        </div>
      </div>

    </div>
  )
}

function MetricCard({ title, value, target, unit, glowColor, barColor, textColor }: { title: string, value: number, target: number, unit: string, glowColor: string, barColor: string, textColor: string }) {
  const percent = target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0
  return (
    <Card className="bg-white border-[#D4AF37]/30 shadow-lg relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-xl group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)` }}></div>
      <CardContent className="p-5 relative z-10">
        <div className="text-sm font-semibold text-[#4A4238] mb-2 uppercase tracking-wide">{title}</div>
        <div className="flex items-baseline space-x-2">
          <span className={`text-4xl font-black ${textColor}`}>{value.toLocaleString()}</span>
          <span className="text-xs text-[#4A4238]/ font-medium">{unit}</span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-bold text-[#4A4238] mb-2">
            <span>เป้า {target.toLocaleString()}</span>
            <span className={textColor}>{percent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
            <div className={`${barColor} h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.3)]`} style={{ width: `${percent}%` }}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function YieldCard({ title, value }: { title: string, value: number }) {
  return (
    <Card className="bg-white border-[#D4AF37]/30 shadow-lg overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <CardContent className="p-6 flex items-center justify-between relative z-10">
        <div className="font-semibold text-[#4A4238] text-lg">{title}</div>
        <div className="text-4xl font-black text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">{value}%</div>
      </CardContent>
    </Card>
  )
}

function DefectCard({ title, value, count }: { title: string, value: string, count: number }) {
  const num = parseFloat(value)
  const isHigh = num > 3
  return (
    <Card className={`bg-white shadow-lg transition-transform hover:-translate-y-1 ${isHigh ? 'border-rose-500/50 relative overflow-hidden' : 'border-[#D4AF37]/30'}`}>
      {isHigh && <div className="absolute inset-0 bg-rose-500/5 animate-pulse"></div>}
      <CardContent className="p-5 relative z-10">
        <div className="text-sm font-semibold text-[#4A4238] mb-2 uppercase tracking-wide">{title}</div>
        <div className="flex items-end justify-between">
          <span className={`text-3xl font-black ${isHigh ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-[#4A4238]'}`}>{value}%</span>
          <span className="text-sm font-medium text-[#4A4238]/ bg-white px-2 py-1 rounded-md">{count} ชิ้น</span>
        </div>
      </CardContent>
    </Card>
  )
}

function OeeCard({ title, value, hours, onHoursChange }: { title: string, value: number, hours: number, onHoursChange: (v: number) => void }) {
  const colorClass = value > 80 ? 'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : value > 60 ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'
  return (
    <Card className="bg-white border-[#D4AF37]/30 shadow-lg overflow-hidden relative group">
      <CardContent className="p-4 md:p-6 flex flex-row items-center justify-between relative z-10 gap-2">
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-[#4A4238] text-lg">{title}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#8B7355] whitespace-nowrap">ชม.ทำงาน:</span>
            <Input 
              type="number" 
              value={hours}
              onChange={(e) => onHoursChange(Number(e.target.value) || 0)}
              className="w-16 h-7 text-xs text-center border-[#D4AF37]/30 p-1"
              min={1} max={24}
            />
          </div>
        </div>
        <div className={`text-3xl md:text-4xl font-black ${colorClass}`}>{value}%</div>
      </CardContent>
    </Card>
  )
}

function PerfItem({ title, value, target }: { title: string, value: number, target: number }) {
  const pct = target > 0 ? (value / target) * 100 : 0
  const isGood = pct >= 90
  return (
    <div className="flex flex-col items-center p-5 rounded-xl border border-[#D4AF37]/30 bg-transparent/50 transition-all hover:bg-white hover:border-[#D4AF37]/30">
      <span className="text-sm font-bold text-[#4A4238] mb-3 uppercase tracking-wider">{title}</span>
      <div className="relative">
        {isGood ? 
          <CheckCircle2 className="w-12 h-12 text-[#D4AF37] mb-3 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]" /> : 
          <TrendingUp className="w-12 h-12 text-yellow-400 mb-3 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
        }
      </div>
      <span className={`text-2xl font-black ${isGood ? 'text-[#D4AF37]' : 'text-yellow-400'}`}>{pct.toFixed(0)}%</span>
    </div>
  )
}
