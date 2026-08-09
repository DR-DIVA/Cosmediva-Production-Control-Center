'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity, AlertTriangle, TrendingUp, Package, Box, ShieldAlert, CheckCircle2, Factory, Calendar } from 'lucide-react'
import ProductionLine from '@/components/dashboard/ProductionLine'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'

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
    
    const sevenDaysAgo = addDays(todayStart, -7).toISOString()

    // Fetch all Active Lots or Recently Done Lots
    const { data: activeLotsData } = await supabase.from('production_lots')
      .select(`
        id, lot_no, current_status, total_tanks, capacity_max, kg_per_tank, g_per_piece, pcs_per_carton, qc_fg_passed_carton_ranges, planned_quantity, order_quantity, updated_at,
        processes (process_name),
        products:sku_id (sku, product_name)
      `)
      .or(`current_status.neq.DONE,and(current_status.eq.DONE,updated_at.gte.${sevenDaysAgo})`)
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
      const sortedLots = [...activeLotsData]
      
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

    // 3. Fetch QA/QC Issues (Today)
    const { data: qaqc } = await supabase.from('production_logs')
      .select('*')
      .in('status', ['NC', 'CAR', 'HOLD', 'REPROCESS', 'REJECT'])
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
    if (qaqc) setQaQcLogs(qaqc)

    // 4. Fetch FG Delivery (This Month)
    const fgProcessId = 'dc1a9686-3846-4631-a5a2-4340a79eeebb' // รับเข้า FG
    const { data: fg } = await supabase.from('production_logs')
      .select('*, production_lots(pcs_per_carton)')
      .eq('process_id', fgProcessId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
    if (fg) setFgLogs(fg)

    // 5. Fetch Planner Queue (All active planned orders)
    const { data: plannedLots } = await supabase.from('production_lots')
      .select('id, planned_quantity')
      .neq('current_status', 'DONE')
    if (plannedLots) setPlannerLots(plannedLots)

    // 6. Fetch RM/PM/CMD2 QC Queues (Today)
    const { data: rmQc } = await supabase.from('production_lot_rms')
      .select('status, qc_status, receive_date, updated_at')
    const { data: pmQc } = await supabase.from('production_lot_pms')
      .select('status, qc_status, receive_date, updated_at')
    const { data: cmd2Qc } = await supabase.from('production_lot_cmd2_pms')
      .select('status, qc_status, receive_date, updated_at')
      
    if (rmQc || pmQc || cmd2Qc) {
      setRmQcLogs([...(rmQc || []), ...(pmQc || []), ...(cmd2Qc || [])])
    }

    // 7. Fetch FG QC Queues (Today)
    const { data: fgQc } = await supabase.from('fg_inventory')
      .select('qc_status, created_at, updated_at')
    if (fgQc) setFgQcLogs(fgQc)
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

  // Group Lots by SKU for Dropdown
  const groupedLots: Record<string, any[]> = {}
  activeLots.forEach(lot => {
    const sku = lot.products?.sku || 'Unknown SKU'
    if (!groupedLots[sku]) groupedLots[sku] = []
    groupedLots[sku].push(lot)
  })

  const selectedLot = activeLots.find(l => l.id === selectedFilter)
  const displayFilterText = selectedFilter === 'all' 
    ? <span className="font-bold text-[#D4AF37]">ภาพรวมโรงงาน (Factory Overview)</span>
    : selectedLot 
      ? <span className="font-semibold text-[#4A4238]">LOT {selectedLot.lot_no}</span>
      : <span className="text-gray-400">เลือกการแสดงผล</span>

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto bg-transparent min-h-screen pb-12 font-sans text-[#4A4238]">
      
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
        
        <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-2 bg-white border border-[#D4AF37]/30 rounded-md p-1">
             <Calendar className="w-5 h-5 text-yellow-500 ml-2" />
             <input 
               type="date" 
               className="bg-transparent border-none outline-none text-sm font-semibold text-[#4A4238] p-1 cursor-pointer"
               value={dashboardDate}
               onChange={(e) => setDashboardDate(e.target.value)}
             />
          </div>
          <div className="w-48">
            <Select value={selectedFilter} onValueChange={(val) => setSelectedFilter(val || '')}>
              <SelectTrigger className="bg-white border-[#D4AF37]/30 text-[#4A4238] font-semibold h-11 focus:ring-yellow-400">
                <span data-slot="select-value" className="flex flex-1 text-left line-clamp-1">{displayFilterText}</span>
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D4AF37]/30 text-[#4A4238]">
                <SelectItem value="all" className="focus:bg-slate-700 focus:text-yellow-400">
                  <span className="font-bold text-yellow-400">ภาพรวมโรงงาน (Factory Overview)</span>
                </SelectItem>
                {Object.keys(groupedLots).map(sku => (
                  <SelectGroup key={sku}>
                    <SelectLabel className="bg-white text-[#4A4238] border-t border-b border-[#D4AF37]/30">{sku}</SelectLabel>
                    {groupedLots[sku].map(lot => (
                      <SelectItem key={lot.id} value={lot.id} className="ml-2 focus:bg-slate-700 focus:text-[#4A4238]">
                        LOT {lot.lot_no}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
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
         <Card className="bg-white border-[#D4AF37]/30 shadow-xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <CardHeader className="bg-[#F8F6F0]/ border-b border-[#D4AF37]/30 pb-4">
             <CardTitle className="text-lg flex items-center gap-3 text-rose-400">
               <ShieldAlert className="w-6 h-6 text-rose-500" /> 
               <div><span className="text-yellow-400 font-black">5-6.</span> คุณภาพและปัญหา (QC & QA)</div>
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
               <div className="space-y-5">
                 <h4 className="font-semibold text-[#4A4238] border-b border-[#D4AF37]/30 pb-2 uppercase tracking-wider text-sm">สถานะ QC</h4>
                 <div className="flex justify-between items-center"><span className="text-amber-400 font-medium tracking-wide">HOLD</span> <span className="text-lg font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20 px-4 py-1 rounded-lg">{countQcStatus('HOLD')}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[#D4AF37] font-medium tracking-wide">REPROCESS</span> <span className="text-lg font-bold bg-sky-400/10 text-[#D4AF37] border border-sky-400/20 px-4 py-1 rounded-lg">{countQcStatus('REPROCESS')}</span></div>
                 <div className="flex justify-between items-center"><span className="text-rose-500 font-medium tracking-wide">REJECT</span> <span className="text-lg font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-1 rounded-lg">{countQcStatus('REJECT')}</span></div>
               </div>
               <div className="space-y-5">
                 <h4 className="font-semibold text-[#4A4238] border-b border-[#D4AF37]/30 pb-2 uppercase tracking-wider text-sm">ใบแจ้งปัญหา QA</h4>
                 <div className="flex justify-between items-center"><span className="text-[#4A4238] font-medium tracking-wide">NC</span> <span className="text-lg font-bold bg-white text-[#4A4238] border border-[#D4AF37]/30 px-4 py-1 rounded-lg">{countQaStatus('NC')}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[#4A4238] font-medium tracking-wide">CAR</span> <span className="text-lg font-bold bg-white text-[#4A4238] border border-[#D4AF37]/30 px-4 py-1 rounded-lg">{countQaStatus('CAR')}</span></div>
               </div>
             </div>
           </CardContent>
         </Card>

         {/* 7-9. Planner & Warehouse */}
         <Card className="bg-white border-[#D4AF37]/30 shadow-xl overflow-hidden relative group">
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <CardHeader className="bg-[#F8F6F0]/ border-b border-[#D4AF37]/30 pb-4">
             <CardTitle className="text-lg flex items-center gap-3 text-[#D4AF37]">
               <Package className="w-6 h-6 text-emerald-500" /> 
               <div><span className="text-yellow-400 font-black">7-9.</span> คิวงานและคลังสินค้า (Planner & FG)</div>
             </CardTitle>
           </CardHeader>
           <CardContent className="p-6 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
               <div className="space-y-5">
                 <h4 className="font-semibold text-[#4A4238] border-b border-[#D4AF37]/30 pb-2 uppercase tracking-wider text-sm">Planner Queue</h4>
                 <div className="flex justify-between items-center"><span className="text-[#4A4238]">PO On Hand</span> <span className="text-xl font-black text-[#D4AF37]">{poOnHand}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[#4A4238]">ชิ้นงาน On Hand</span> <span className="text-xl font-black text-[#D4AF37]">{piecesOnHand.toLocaleString()}</span></div>
               </div>
               <div className="space-y-5">
                 <h4 className="font-semibold text-[#4A4238] border-b border-[#D4AF37]/30 pb-2 uppercase tracking-wider text-sm">FG Delivery</h4>
                 <div className="flex justify-between items-center"><span className="text-[#4A4238]">ส่งมอบวันนี้</span> <span className="text-xl font-black text-[#D4AF37]">{fgToday.toLocaleString()}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[#4A4238]">สะสมเดือนนี้</span> <span className="text-xl font-black text-[#D4AF37]">{fgMonth.toLocaleString()}</span></div>
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
