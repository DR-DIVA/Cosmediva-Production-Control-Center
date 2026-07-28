'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Square, Pause, Droplet, Beaker, Archive, CheckCircle, Factory, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

const COLUMNS = [
  { id: 'MM-RM', title: '1. ชั่งสาร (MM-RM)', keywords: ['ชั่ง', 'mm-rm'], colorClasses: { bg: 'bg-amber-50', header: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-200 text-amber-800', cardBorder: 'border-t-amber-500' } },
  { id: 'MIX', title: '2. ห้องผสม (Mix 1-6)', keywords: ['ผสม', 'mix'], colorClasses: { bg: 'bg-[#D4AF37]/', header: 'bg-[#D4AF37]/', border: 'border-[#D4AF37]/30', text: 'text-[#4A4238]', badge: 'bg-[#D4AF37]/ text-[#4A4238]', cardBorder: 'border-t-blue-500' } },
  { id: 'QC', title: '3. สถานะ QC', keywords: ['qc', 'quarantine', 'passed', 'rejected'], colorClasses: { bg: 'bg-purple-50', header: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-200 text-purple-800', cardBorder: 'border-t-purple-500' } },
  { id: 'PACKING', title: '4. ห้องบรรจุ (Packing)', keywords: ['บรรจุ', 'packing'], colorClasses: { bg: 'bg-emerald-50', header: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-200 text-emerald-800', cardBorder: 'border-t-emerald-500' } },
  { id: 'POF', title: '5. ห้องอุโมงค์ (POF)', keywords: ['pof', 'อุโมงค์'], colorClasses: { bg: 'bg-cyan-50', header: 'bg-cyan-100', border: 'border-cyan-200', text: 'text-cyan-800', badge: 'bg-cyan-200 text-cyan-800', cardBorder: 'border-t-cyan-500' } },
  { id: 'FG', title: '6. เข้าคลัง FG', keywords: ['fg', 'คลัง', 'store'], colorClasses: { bg: 'bg-[#F8F6F0]', header: 'bg-slate-200', border: 'border-slate-300', text: 'text-slate-800', badge: 'bg-slate-300 text-slate-800', cardBorder: 'border-t-slate-500' } }
]

const parseRanges = (str: string) => {
  if (!str) return 0;
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  let total = 0;
  for (const p of parts) {
    if (p.includes('-')) {
      const [start, end] = p.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        total += (end - start + 1);
      }
    } else {
      if (!isNaN(Number(p))) {
        total += 1;
      }
    }
  }
  return total;
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [finishedTankEnd, setFinishedTankEnd] = useState('')
  const [tankStart, setTankStart] = useState('')
  const [tankEnd, setTankEnd] = useState('')
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [activeStartTask, setActiveStartTask] = useState<any>(null)
  const [isWaitDialogOpen, setIsWaitDialogOpen] = useState(false)
  const [missingMaterial, setMissingMaterial] = useState('')
  const [activeWaitTask, setActiveWaitTask] = useState<any>(null)
  const [allDefects, setAllDefects] = useState<any[]>([])
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false)
  const [defectLotId, setDefectLotId] = useState('')
  const [defectQuantity, setDefectQuantity] = useState('')
  const [defectNote, setDefectNote] = useState('')
  const [isQcPassDialogOpen, setIsQcPassDialogOpen] = useState(false)
  const [qcPassTankEnd, setQcPassTankEnd] = useState('')
  const [isQcFgPassDialogOpen, setIsQcFgPassDialogOpen] = useState(false)
  const [qcFgPassRanges, setQcFgPassRanges] = useState('')
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [isEstimateDialogOpen, setIsEstimateDialogOpen] = useState(false)
  const [estimatedPiecesStr, setEstimatedPiecesStr] = useState('')
  const [elapsedHoursStr, setElapsedHoursStr] = useState('')
  const [manualPieces, setManualPieces] = useState('')
  const [cartonsQuantity, setCartonsQuantity] = useState('')
  const [piecesPerCarton, setPiecesPerCarton] = useState('')
  const [pofAggregates, setPofAggregates] = useState<Record<string, number>>({})
  
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_name')
    if (data) setRooms(data)
  }

  const fetchTasks = async () => {
    const { data } = await supabase.from('production_logs')
      .select(`
        id,
        status,
        note,
        tank_start,
        tank_end,
        sub_step,
        start_time,
        production_lot_id,
        process_id,
        room_id,
        piece_quantity,
        production_lots (
          id,
          lot_no,
          total_tanks,
          kg_per_tank,
          g_per_piece,
          capacity_min,
          capacity_max,
          pcs_per_carton,
          order_quantity,
          qc_fg_passed_carton_ranges,
          products:sku_id (sku, product_name)
        ),
        processes (id, process_name),
        rooms (id, room_name)
      `)
      .in('status', ['WAITING', 'IN_PROGRESS', 'PAUSED'])
      .order('created_at', { ascending: true })
    
    if (data) {
      const lotIds = Array.from(new Set(data.map((d: any) => d.production_lot_id).filter(Boolean)));
      
      let rmReadiness: Record<string, any[]> = {};
      if (lotIds.length > 0) {
        const { data: rms } = await supabase.from('production_lot_rms')
          .select('*')
          .in('production_lot_id', lotIds);
          
        if (rms) {
          rmReadiness = rms.reduce((acc: any, rm: any) => {
            if (!acc[rm.production_lot_id]) acc[rm.production_lot_id] = [];
            acc[rm.production_lot_id].push(rm);
            return acc;
          }, {});
        }
      }

      const tasksWithRM = data.map((t: any) => ({
        ...t,
        rm_items: rmReadiness[t.production_lot_id] || []
      }));
      setTasks(tasksWithRM);
    }

    // Fetch POF Aggregates for COMPLETED tasks
    const { data: pofData } = await supabase.from('production_logs')
      .select(`
        piece_quantity,
        production_lot_id,
        processes!inner(process_name)
      `)
      .eq('status', 'COMPLETED')
      .ilike('processes.process_name', '%POF%')

    if (pofData) {
      const aggregates: Record<string, number> = {}
      pofData.forEach((log: any) => {
        if (!aggregates[log.production_lot_id]) aggregates[log.production_lot_id] = 0
        aggregates[log.production_lot_id] += log.piece_quantity || 0
      })
      setPofAggregates(aggregates)
    }
  }

  const calculatePofTargetCartons = (task: any) => {
    if (!task || !task.production_lots || getTaskColumn(task) !== 'POF') return { targetCartons: 0, targetPieces: 0, maxAllowedPieces: 0, rollover: 0 }
    
    const lot = task.production_lots
    if (!lot.kg_per_tank || !lot.g_per_piece || !lot.pcs_per_carton) return { targetCartons: 0, targetPieces: 0, maxAllowedPieces: 0, rollover: 0 }

    const tankEnd = task.tank_end ? parseInt(task.tank_end) : 1
    const piecesPerTank = (lot.kg_per_tank * 1000) / lot.g_per_piece
    
    // Theoretical total pieces up to this tank
    const theoreticalCumulativePieces = tankEnd * piecesPerTank
    
    // Actual pieces already completed in previous POF tasks for this lot
    const actualPreviousPieces = pofAggregates[lot.id] || 0
    
    // Pieces needed to complete THIS task
    let targetPieces = theoreticalCumulativePieces - actualPreviousPieces
    // Ensure it doesn't go below 0 in weird edge cases
    if (targetPieces < 0) targetPieces = 0
    
    // How many full cartons is that?
    const targetCartons = Math.floor(targetPieces / lot.pcs_per_carton)
    
    // We only allow full cartons, so maxAllowedPieces for input validation is exactly (targetCartons * pcs_per_carton)
    const maxAllowedPieces = targetCartons * lot.pcs_per_carton
    
    // Rollover from previous tank(s)
    const theoreticalUpToPrev = (tankEnd - 1) * piecesPerTank
    const rollover = theoreticalUpToPrev - actualPreviousPieces

    return { targetCartons, targetPieces, maxAllowedPieces, rollover }
  }

  const updateStatus = async (logId: string, newStatus: string, extraData?: any) => {
    let updateData: any = { status: newStatus }
    
    if (newStatus === 'IN_PROGRESS' && !extraData?.sub_step) updateData.start_time = new Date().toISOString()
    if (newStatus === 'COMPLETED') updateData.end_time = new Date().toISOString()
    
    if (extraData?.note) updateData.note = extraData.note
    if (extraData?.tank_start) updateData.tank_start = extraData.tank_start
    if (extraData?.tank_end) updateData.tank_end = extraData.tank_end
    if (extraData?.sub_step) updateData.sub_step = extraData.sub_step
    if (extraData?.piece_quantity !== undefined) updateData.piece_quantity = extraData.piece_quantity

    const { error } = await supabase.from('production_logs')
      .update(updateData)
      .eq('id', logId)

    if (error) {
      toast.error('ไม่สามารถอัปเดตสถานะได้')
    } else {
      toast.success('อัปเดตสถานะเรียบร้อยแล้ว')
      if (newStatus === 'PAUSED') {
        setIsPauseDialogOpen(false)
        setIsWaitDialogOpen(false)
      }
      if (newStatus === 'COMPLETED') setIsFinishDialogOpen(false)
      
      // Linear Workflow Logic:
      if (newStatus === 'COMPLETED' && extraData?.sourceTask) {
        const sourceTask = extraData.sourceTask;
        const lotId = sourceTask.production_lots?.id || sourceTask.production_lot_id;
        
        let nextProcessName = '';
        if (extraData.isWeighingTask) nextProcessName = 'ผสม'; // to Mix
        else if (extraData.isMixTask) nextProcessName = 'รอ QC'; // to QC
        else if (extraData.isPackingTask) nextProcessName = 'รออุโมงค์'; // to POF
        else if (extraData.isPofTask) nextProcessName = 'รอเข้าคลัง FG'; // to FG

        if (nextProcessName && lotId) {
          const { data: nextProc } = await supabase.from('processes').select('id').eq('process_name', nextProcessName).single()
          if (nextProc) {
            let merged = false;
            if (nextProcessName === 'รออุโมงค์' || nextProcessName === 'รอเข้าคลัง FG') {
               const { data: existingTasks } = await supabase.from('production_logs')
                 .select('*')
                 .eq('production_lot_id', lotId)
                 .eq('process_id', nextProc.id)
                 .neq('status', 'COMPLETED')
                 .order('id', { ascending: false })
                 .limit(1);

               if (existingTasks && existingTasks.length > 0) {
                 const existing = existingTasks[0];
                 const newTankEnd = Math.max(parseInt(existing.tank_end || '0'), parseInt(sourceTask.tank_end || '0'));
                 await supabase.from('production_logs').update({
                    tank_end: newTankEnd
                 }).eq('id', existing.id);
                 merged = true;
               }
            }
            if (!merged) {
              await supabase.from('production_logs').insert({
                production_lot_id: lotId,
                process_id: nextProc.id,
                status: 'WAITING',
                activity_date: new Date().toISOString().split('T')[0],
                tank_start: sourceTask.tank_start,
                tank_end: sourceTask.tank_end,
                total_tanks: sourceTask.total_tanks || sourceTask.production_lots?.total_tanks,
                piece_quantity: extraData?.piece_quantity || sourceTask.piece_quantity
              })
            }
          }
        }
      }

      // legacy RM comment marker just to avoid breaking the regex match in the future
      fetchTasks()
    }
  }

  const handleStartClick = (task: any) => {
    setActiveStartTask(task)
    setTankStart(task.tank_start ? task.tank_start.toString() : '1')
    setTankEnd(task.tank_end ? task.tank_end.toString() : (task.total_tanks || task.production_lots?.total_tanks || '').toString())
    setSelectedRoomId(task.rooms?.id || task.room_id || '')
    setIsStartDialogOpen(true)
  }

  const handleStartConfirm = async () => {
    if (!activeStartTask) return
    
    if (!tankStart || !tankEnd) {
      toast.error('กรุณาระบุลำดับถังเริ่มต้นและสิ้นสุด')
      return
    }

    const isMixColumn = activeStartTask.processes?.process_name?.includes('ผสม') || activeStartTask.rooms?.room_name?.includes('Mix')
    const isPackingColumn = activeStartTask.processes?.process_name?.includes('บรรจุ')
    
    if ((isMixColumn || isPackingColumn) && !selectedRoomId) {
      toast.error('กรุณาเลือกห้อง')
      return
    }

    const startInput = parseInt(tankStart)
    const endInput = parseInt(tankEnd)
    const originalEnd = activeStartTask.tank_end ? parseInt(activeStartTask.tank_end) : parseInt(activeStartTask.total_tanks || activeStartTask.production_lots?.total_tanks)

    if (endInput < originalEnd) {
      // Split the task at start
      // 1. Create a new WAITING task for the remainder [endInput + 1 - originalEnd]
      await supabase.from('production_logs').insert({
        production_lot_id: activeStartTask.production_lots?.id || activeStartTask.production_lot_id,
        process_id: activeStartTask.processes?.id || activeStartTask.process_id,
        room_id: activeStartTask.rooms?.id || activeStartTask.room_id,
        status: 'WAITING',
        activity_date: activeStartTask.activity_date || new Date().toISOString().split('T')[0],
        tank_start: endInput + 1,
        tank_end: originalEnd,
        total_tanks: activeStartTask.total_tanks || activeStartTask.production_lots?.total_tanks,
      })

      // 2. Update the original task to IN_PROGRESS for [startInput - endInput]
      await supabase.from('production_logs').update({
        status: 'IN_PROGRESS',
        tank_start: startInput,
        tank_end: endInput,
        room_id: selectedRoomId || activeStartTask.room_id,
        start_time: new Date().toISOString(),
        ...(isMixColumn ? { sub_step: 'SOAK' } : {})
      }).eq('id', activeStartTask.id)
      
      toast.success('แบ่งงานและเริ่มงานบางส่วนเรียบร้อยแล้ว')
      setIsStartDialogOpen(false)
      fetchTasks()
      return
    }

    // Normal full start
    updateStatus(activeStartTask.id, 'IN_PROGRESS', {
      tank_start: tankStart,
      tank_end: tankEnd,
      room_id: selectedRoomId || null,
      sub_step: isMixColumn ? 'SOAK' : undefined
    })

    if (selectedRoomId) {
       await supabase.from('production_logs').update({ room_id: selectedRoomId }).eq('id', activeStartTask.id)
    }

    setIsStartDialogOpen(false)
  }
  const handlePauseClick = (task: any) => {
    setActiveTaskId(task.id)
    setActiveStartTask(task)
    setIsPauseDialogOpen(true)
  }

  const handleEstimateClick = (task: any) => {
    setActiveStartTask(task)
    if (!task.start_time) {
      toast.error('ยังไม่ได้เริ่มงาน (ไม่มีเวลา Start Time)')
      return
    }
    const startMs = new Date(task.start_time).getTime()
    const nowMs = new Date().getTime()
    const hours = (nowMs - startMs) / (1000 * 60 * 60)
    
    setElapsedHoursStr(hours.toFixed(2))

    const lot = task.production_lots
    if (lot && lot.capacity_min) {
      let minPcs = Math.round(hours * lot.capacity_min)
      let maxPcs = lot.capacity_max ? Math.round(hours * lot.capacity_max) : minPcs

      let tks = 1;
      if (task.tank_start && task.tank_end) {
        tks = parseInt(task.tank_end) - parseInt(task.tank_start) + 1;
      }
      if (lot.kg_per_tank && lot.g_per_piece) {
        const maxAllowedPieces = Math.round(tks * ((lot.kg_per_tank * 1000) / lot.g_per_piece));
        if (minPcs > maxAllowedPieces) minPcs = maxAllowedPieces;
        if (maxPcs > maxAllowedPieces) maxPcs = maxAllowedPieces;
      }

      if (minPcs === maxPcs) {
        setEstimatedPiecesStr(`${minPcs} ชิ้น`)
      } else {
        setEstimatedPiecesStr(`${minPcs} - ${maxPcs} ชิ้น`)
      }
    } else {
      setEstimatedPiecesStr('ไม่พบข้อมูล Capacity ของสินค้านี้')
    }

    setIsEstimateDialogOpen(true)
  }

  const handleFinishClick = (task: any) => {
    setActiveTaskId(task.id)
    setActiveStartTask(task) // store task ref for checking isWeighingTask
    setFinishedTankEnd(task.tank_end ? task.tank_end.toString() : '')
    
    if (getTaskColumn(task) === 'PACKING' && task.production_lots) {
       const lot = task.production_lots
       if (lot.kg_per_tank && lot.g_per_piece) {
         const tks = task.tank_end && task.tank_start ? (parseInt(task.tank_end) - parseInt(task.tank_start) + 1) : 1
         const pcs = (tks * lot.kg_per_tank * 1000) / lot.g_per_piece
         setManualPieces(Math.round(pcs).toString())
       } else {
         setManualPieces('')
       }
       setCartonsQuantity('')
       setPiecesPerCarton('')
    } else if (getTaskColumn(task) === 'POF' && task.production_lots) {
       const lot = task.production_lots
       setPiecesPerCarton(lot.pcs_per_carton ? lot.pcs_per_carton.toString() : '')
       setCartonsQuantity('')
       setManualPieces('')
    } else {
       setManualPieces('')
       setCartonsQuantity('')
       setPiecesPerCarton('')
    }
    
    setIsFinishDialogOpen(true)
  }

  const handleFinishConfirm = async () => {
    if (!activeStartTask) return
    
    if (getTaskColumn(activeStartTask) === 'POF') {
      const { maxAllowedPieces } = calculatePofTargetCartons(activeStartTask)
      const inputPieces = manualPieces ? parseFloat(manualPieces) : 0
      const currentTaskPieces = activeStartTask.piece_quantity || 0
      const newTotalPieces = currentTaskPieces + inputPieces

      if (newTotalPieces >= maxAllowedPieces) {
         // Tank is fully complete
         let extraObj: any = { 
           isPofTask: true,
           sourceTask: activeStartTask,
           piece_quantity: newTotalPieces
         }
         await updateStatus(activeStartTask.id, 'COMPLETED', extraObj)
      } else {
         // Keep IN_PROGRESS, just update pieces
         const { error } = await supabase.from('production_logs').update({ piece_quantity: newTotalPieces }).eq('id', activeStartTask.id)
         if (error) {
           toast.error('อัปเดตยอดไม่สำเร็จ')
           return
         }
         toast.success('อัปเดตยอดลังสำเร็จ')
         setIsFinishDialogOpen(false)
         setManualPieces('')
         setCartonsQuantity('')
         fetchTasks()
      }
      return
    }

    if (activeStartTask.tank_start && activeStartTask.tank_end) {
      const originalStart = parseInt(activeStartTask.tank_start)
      const originalEnd = parseInt(activeStartTask.tank_end)
      const completedEnd = parseInt(finishedTankEnd)

      if (isNaN(completedEnd) || completedEnd < originalStart || completedEnd > originalEnd) {
        toast.error('ลำดับถังที่เสร็จสิ้นไม่ถูกต้อง')
        return
      }

      if (completedEnd < originalEnd) {
        // Split the task
        
        let completedPieces = manualPieces ? parseFloat(manualPieces) : null

        // 1. Create a COMPLETED task for [originalStart - completedEnd]
        const { error: err1 } = await supabase.from('production_logs').insert({
          production_lot_id: activeStartTask.production_lots?.id || activeStartTask.production_lot_id,
          process_id: activeStartTask.processes?.id || activeStartTask.process_id,
          room_id: activeStartTask.rooms?.id || activeStartTask.room_id,
          status: 'COMPLETED',
          activity_date: new Date().toISOString().split('T')[0],
          tank_start: originalStart,
          tank_end: completedEnd,
          total_tanks: activeStartTask.total_tanks || activeStartTask.production_lots?.total_tanks,
          start_time: activeStartTask.start_time,
          end_time: new Date().toISOString(),
          note: activeStartTask.note,
          piece_quantity: completedPieces
        })

        if (err1) {
          toast.error('เกิดข้อผิดพลาดในการแบ่งงาน: ' + err1.message)
          return
        }

        // 2. Create Next task for [originalStart - completedEnd]
        let nextProcessName = '';
        if (activeStartTask.processes?.process_name?.includes('ชั่งสาร')) nextProcessName = 'ผสม';
        else if (activeStartTask.processes?.process_name?.includes('ผสม') || activeStartTask.rooms?.room_name?.includes('Mix')) nextProcessName = 'รอ QC';
        else if (activeStartTask.processes?.process_name?.includes('บรรจุ')) nextProcessName = 'รออุโมงค์';
        else if (activeStartTask.processes?.process_name?.includes('อุโมงค์') || activeStartTask.processes?.process_name?.includes('POF')) nextProcessName = 'รอเข้าคลัง FG';

        if (nextProcessName) {
          const { data: nextProc } = await supabase.from('processes').select('id').eq('process_name', nextProcessName).single()
          if (nextProc) {
            const lotId = activeStartTask.production_lots?.id || activeStartTask.production_lot_id;
            let merged = false;
            if (nextProcessName === 'รออุโมงค์' || nextProcessName === 'รอเข้าคลัง FG') {
               const { data: existingTasks } = await supabase.from('production_logs')
                 .select('*')
                 .eq('production_lot_id', lotId)
                 .eq('process_id', nextProc.id)
                 .neq('status', 'COMPLETED')
                 .order('id', { ascending: false })
                 .limit(1);

               if (existingTasks && existingTasks.length > 0) {
                 const existing = existingTasks[0];
                 const newTankEnd = Math.max(parseInt(existing.tank_end || '0'), completedEnd);
                 await supabase.from('production_logs').update({
                    tank_end: newTankEnd
                 }).eq('id', existing.id);
                 merged = true;
               }
            }
            if (!merged) {
              await supabase.from('production_logs').insert({
                production_lot_id: lotId,
                process_id: nextProc.id,
                status: 'WAITING',
                activity_date: new Date().toISOString().split('T')[0],
                tank_start: originalStart,
                tank_end: completedEnd,
                total_tanks: activeStartTask.total_tanks || activeStartTask.production_lots?.total_tanks,
                piece_quantity: manualPieces ? parseFloat(manualPieces) : null
              })
            }
          }
        }

        // 3. Update the original task to keep [completedEnd + 1 - originalEnd]
        await supabase.from('production_logs').update({
          tank_start: completedEnd + 1,
          status: 'WAITING',
          start_time: null // clear start time so they can restart it
        }).eq('id', activeStartTask.id)

        toast.success('แบ่งงานและจบงานบางส่วนเรียบร้อยแล้ว')
        setIsFinishDialogOpen(false)
        fetchTasks()
        return
      }
    }

    // Normal full completion
    let extraObj: any = { 
      isWeighingTask: activeStartTask?.processes?.process_name?.includes('ชั่งสาร'), 
      isMixTask: activeStartTask?.processes?.process_name?.includes('ผสม') || activeStartTask?.rooms?.room_name?.includes('Mix'),
      isPackingTask: activeStartTask?.processes?.process_name?.includes('บรรจุ'),
      isPofTask: activeStartTask?.processes?.process_name?.includes('อุโมงค์') || activeStartTask?.processes?.process_name?.includes('POF'),
      sourceTask: activeStartTask 
    }
    if (manualPieces) extraObj.piece_quantity = parseFloat(manualPieces)
    updateStatus(activeStartTask.id, 'COMPLETED', extraObj)
  }

  const handleWaitClick = (task: any) => {
    setActiveWaitTask(task)
    setMissingMaterial('')
    setIsWaitDialogOpen(true)
  }

  const handleWaitConfirm = async () => {
    if (!activeWaitTask || !missingMaterial) return
    updateStatus(activeWaitTask.id, 'WAITING', { note: `[สารขาด] ${missingMaterial}` })
    setIsWaitDialogOpen(false)
  }

  const handleQcPassClick = (task: any) => {
    setActiveStartTask(task)
    setQcPassTankEnd(task.tank_end ? task.tank_end.toString() : '')
    setIsQcPassDialogOpen(true)
  }

  const handleQcPassConfirm = async () => {
    if (!activeStartTask) return
    
    if (activeStartTask.tank_start && activeStartTask.tank_end) {
      const originalStart = parseInt(activeStartTask.tank_start)
      const originalEnd = parseInt(activeStartTask.tank_end)
      const passedEnd = parseInt(qcPassTankEnd)

      if (isNaN(passedEnd) || passedEnd < originalStart || passedEnd > originalEnd) {
        toast.error('ลำดับถังที่ Pass ไม่ถูกต้อง')
        return
      }

      // Create packing task for [originalStart - passedEnd]
      const { data: packProc } = await supabase.from('processes').select('id').eq('process_name', 'รอบรรจุ').single()
      if (packProc) {
        await supabase.from('production_logs').insert({
          production_lot_id: activeStartTask.production_lots?.id || activeStartTask.production_lot_id,
          process_id: packProc.id,
          status: 'WAITING',
          activity_date: new Date().toISOString().split('T')[0],
          tank_start: originalStart,
          tank_end: passedEnd,
          total_tanks: activeStartTask.total_tanks || activeStartTask.production_lots?.total_tanks
        })
      }

      if (passedEnd < originalEnd) {
        // Update QC task to keep [passedEnd + 1 - originalEnd]
        await supabase.from('production_logs').update({
          tank_start: passedEnd + 1
        }).eq('id', activeStartTask.id)
      } else {
        // Full pass, complete the QC task
        await supabase.from('production_logs').update({
          status: 'COMPLETED'
        }).eq('id', activeStartTask.id)
      }

      toast.success('ทำรายการ QC Pass เรียบร้อยแล้ว')
      setIsQcPassDialogOpen(false)
      fetchTasks()
    }
  }

  const handleQcFgPassClick = (task: any) => {
    setActiveStartTask(task)
    setQcFgPassRanges(task.production_lots?.qc_fg_passed_carton_ranges || '')
    setIsQcFgPassDialogOpen(true)
  }

  const handleQcFgPassConfirm = async () => {
    if (!activeStartTask) return
    const lotId = activeStartTask.production_lots?.id || activeStartTask.production_lot_id
    if (!lotId) return

    await supabase.from('production_lots').update({
      qc_fg_passed_carton_ranges: qcFgPassRanges
    }).eq('id', lotId)

    toast.success('บันทึกยอด QC Pass (เข้าคลัง) สำเร็จ')
    setIsQcFgPassDialogOpen(false)
    fetchTasks()
  }

  // Determine which column a task belongs to
  const getTaskColumn = (task: any) => {
    const processName = (task.processes?.process_name || '').toLowerCase()
    const roomName = (task.rooms?.room_name || '').toLowerCase()
    const combined = `${processName} ${roomName}`

    for (const col of COLUMNS) {
      if (col.keywords.some(kw => combined.includes(kw))) {
        return col.id
      }
    }
    return 'MIX' // fallback to Mix if unknown
  }

  const renderBatteryBar = (subStep: string | null) => {
    const steps = [
      { id: 'SOAK', label: 'แช่', icon: <Droplet className="w-3 h-3"/> },
      { id: 'MIX', label: 'ผสม', icon: <Beaker className="w-3 h-3"/> },
      { id: 'STORE', label: 'เก็บงาน', icon: <Archive className="w-3 h-3"/> }
    ]
    
    let activeIndex = -1
    if (subStep === 'SOAK') activeIndex = 0
    if (subStep === 'MIX') activeIndex = 1
    if (subStep === 'STORE') activeIndex = 2

    return (
      <div className="mt-4 mb-2">
        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1 px-1">
          {steps.map((s, i) => (
            <span key={s.id} className={i <= activeIndex ? 'text-[#D4AF37] font-bold flex items-center gap-1' : 'flex items-center gap-1'}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
          <div className={`h-2.5 ${activeIndex >= 0 ? 'bg-[#D4AF37]' : 'bg-transparent'} border-r border-white/20`} style={{ width: '33.33%' }}></div>
          <div className={`h-2.5 ${activeIndex >= 1 ? 'bg-[#D4AF37]' : 'bg-transparent'} border-r border-white/20`} style={{ width: '33.33%' }}></div>
          <div className={`h-2.5 ${activeIndex >= 2 ? 'bg-[#D4AF37]' : 'bg-transparent'}`} style={{ width: '33.33%' }}></div>
        </div>
      </div>
    )
  }

  const renderMixingButtons = (task: any) => {
    const subStep = task.sub_step

    if (!subStep) {
      return (
        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: แช่
        </Button>
      )
    }
    
    if (subStep === 'SOAK') {
      return (
        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: ผสม
        </Button>
      )
    }

    if (subStep === 'MIX') {
      return (
        <Button onClick={() => handleStartClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Play className="w-4 h-4 mr-1" /> เริ่ม: เก็บงาน
        </Button>
      )
    }

    if (subStep === 'STORE') {
      return (
        <Button onClick={() => handleFinishClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover" size="sm">
          <Square className="w-4 h-4 mr-1" /> จบงาน (จบการผสม)
        </Button>
      )
    }
  }

  const { targetCartons, maxAllowedPieces, targetPieces } = calculatePofTargetCartons(activeStartTask)
  // Determine over limit by pieces instead of cartons to be safe, but input is cartons
  const currentTaskPieces = activeStartTask?.piece_quantity || 0
  const inputPieces = manualPieces ? parseFloat(manualPieces) : 0
  const isDefectReportMissing = allDefects.length === 0 && tasks.length > 0;
  
  const isOverLimit = activeStartTask && getTaskColumn(activeStartTask) === 'POF' && (currentTaskPieces + inputPieces) > maxAllowedPieces

  return (
    <div className="p-4 md:p-8 flex-1 flex flex-col space-y-6 overflow-hidden">
      {/* Alert for Defect Report */}
      {isDefectReportMissing && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex justify-between items-center shadow-sm mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm text-red-700 font-medium">⚠️ หัวหน้าห้องยังไม่มีการรายงานของเสียประจำวัน โปรดบันทึกของเสียเพื่อความแม่นยำของระบบ</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setIsDefectModalOpen(true)}>
            <ClipboardCheck className="w-4 h-4 mr-2" /> บันทึกของเสียเดี๋ยวนี้
          </Button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Factory className="w-8 h-8 text-yellow-400" />
            CosmeFlow Production
          </h2>
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
             <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
             Track Every Step. Improve Every Batch.
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 pb-4 snap-x snap-mandatory">
        {COLUMNS.map(col => {
          let colTasks = tasks.filter(t => getTaskColumn(t) === col.id)
          
          if (col.id === 'FG' || col.id === 'POF') {
            const grouped = new Map()
            colTasks.sort((a, b) => (a.tank_start || 0) - (b.tank_start || 0))
            colTasks.forEach(t => {
              const lotId = t.production_lots?.id || t.production_lot_id
              if (!grouped.has(lotId)) {
                const taskCopy = { ...t }
                if (col.id === 'FG') {
                   const activePofPieces = tasks.filter(x => 
                      (x.production_lots?.id === lotId || x.production_lot_id === lotId) && 
                      getTaskColumn(x) === 'POF'
                   ).reduce((sum, x) => sum + (x.piece_quantity || 0), 0)
                   taskCopy.fg_total_pieces = (pofAggregates[lotId] || 0) + activePofPieces
                }
                grouped.set(lotId, taskCopy)
              }
            })
            colTasks = Array.from(grouped.values())
          }
          
          return (
            <div key={col.id} className={`min-w-[320px] w-[320px] max-w-[320px] ${col.colorClasses.bg} rounded-xl flex flex-col border ${col.colorClasses.border} shadow-sm`}>
              <div className={`p-3 ${col.colorClasses.header} border-b ${col.colorClasses.border} rounded-t-xl flex justify-between items-center`}>
                <h3 className={`font-semibold text-sm ${col.colorClasses.text}`}>{col.title}</h3>
                <span className={`${col.colorClasses.badge} text-xs font-bold px-2 py-0.5 rounded-full`}>{colTasks.length}</span>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                    ไม่มีงานค้าง
                  </div>
                ) : null}

                {colTasks.map((task) => (
                  <Card key={task.id} className={`border-t-4 ${col.colorClasses.cardBorder} shadow-sm text-sm`}>
                    <CardHeader className="pb-2 p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-medium text-[#D4AF37] line-clamp-1">
                            {task.processes?.process_name} {task.rooms ? `(${task.rooms.room_name})` : ''}
                          </p>
                          <CardTitle className="text-base mt-0.5">{task.production_lots?.products?.sku}</CardTitle>
                          <p className="text-xs text-gray-500 line-clamp-1">{task.production_lots?.products?.product_name}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded border text-xs">
                        <span className="text-gray-500">LOT No.</span>
                        <span className="font-bold">{task.production_lots?.lot_no}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">ลำดับถัง:</span>
                        <span className="font-medium">{task.tank_start || '?'} - {task.tank_end || '?'} / {task.production_lots?.total_tanks || '?'}</span>
                      </div>

                      {col.id === 'MM-RM' && (task as any).rm_items?.length > 0 && (
                        <div className="mt-2">
                          {(() => {
                            const rms = (task as any).rm_items;
                            const isReady = rms.every((r: any) => r.status === 'READY');
                            if (isReady) {
                              return <Badge className="bg-green-500 w-full justify-center hover:bg-green-600">🟢 พร้อมชั่ง (RM Ready)</Badge>;
                            } else {
                              const pendingRMs = rms.filter((r: any) => r.status !== 'READY');
                              const maxEta = pendingRMs.reduce((max: string, r: any) => (!max || (r.eta_date && r.eta_date > max)) ? r.eta_date : max, '');
                              return (
                                <Badge className="bg-red-500 hover:bg-red-600 w-full justify-center text-[10px] sm:text-xs">
                                  🔴 รอวัตถุดิบ (ETA: {maxEta ? new Date(maxEta).toLocaleDateString('th-TH') : 'ไม่ระบุ'})
                                </Badge>
                              );
                            }
                          })()}
                        </div>
                      )}

                      {col.id === 'POF' ? (
                        <div className="mt-2 p-2 bg-[#D4AF37]/ rounded-md border border-[#D4AF37]/30">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-700">ยอดลังสะสมในถัง:</span>
                            <span className={`font-bold ${calculatePofTargetCartons(task).targetCartons <= Math.floor((task.piece_quantity || 0) / (task.production_lots?.pcs_per_carton || 1)) ? 'text-green-600' : 'text-[#D4AF37]'}`}>
                              {Math.floor((task.piece_quantity || 0) / (task.production_lots?.pcs_per_carton || 1))} / {calculatePofTargetCartons(task).targetCartons} ลัง
                            </span>
                          </div>
                        </div>
                      ) : col.id === 'FG' ? (() => {
                        const totalCartons = Math.floor(((task as any).fg_total_pieces || 0) / (task.production_lots?.pcs_per_carton || 1))
                        const totalOrderCartons = Math.floor((task.production_lots?.order_quantity || 0) / (task.production_lots?.pcs_per_carton || 1))
                        const passedCartons = parseRanges(task.production_lots?.qc_fg_passed_carton_ranges || '')
                        const waitingCartons = totalCartons - passedCartons
                        return (
                          <div className="mt-2 space-y-1">
                            <div className="p-2 bg-[#F8F6F0] rounded-md border border-slate-200">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-700">ยอดลังสะสมทั้งหมด:</span>
                                <span className="font-bold text-slate-700">
                                  {totalCartons} / {totalOrderCartons} ลัง
                                </span>
                              </div>
                            </div>
                            <div className="p-1.5 bg-green-50 rounded-md border border-green-200">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-green-700 font-semibold">✅ QC passed ขายได้:</span>
                                <span className="font-bold text-green-700">{passedCartons} ลัง</span>
                              </div>
                            </div>
                            <div className="p-1.5 bg-orange-50 rounded-md border border-orange-200">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-orange-700 font-semibold">⏳ FG รอตรวจ:</span>
                                <span className="font-bold text-orange-700">{waitingCartons > 0 ? waitingCartons : 0} ลัง</span>
                              </div>
                            </div>
                          </div>
                        )
                      })() : (
                        task.piece_quantity ? (
                          <div className="mt-2 p-1.5 bg-purple-50 rounded-md border border-purple-100">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-gray-600">ทำแล้ว (ก่อนพัก):</span>
                              <span className="font-bold text-purple-700">{task.piece_quantity} ชิ้น</span>
                            </div>
                            {col.id === 'PACKING' && task.production_lots?.kg_per_tank && task.production_lots?.g_per_piece && (
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">ยอดคงเหลือ:</span>
                                <span className="font-bold text-amber-600">
                                  {Math.round((((task.tank_end ? parseInt(task.tank_end) : 1) - (task.tank_start ? parseInt(task.tank_start) : 1) + 1) * task.production_lots.kg_per_tank * 1000) / task.production_lots.g_per_piece) - task.piece_quantity} ชิ้น
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null
                      )}

                      {col.id === 'MIX' && renderBatteryBar(task.sub_step)}

                      {task.note && (
                        <div className={`text-xs p-1.5 rounded border ${task.note.includes('[สารขาด]') ? 'bg-red-50 text-red-700 border-red-200 font-bold' : task.note.includes('[ประวัติการเบิก]') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-orange-50 text-orange-800 border-orange-100'}`}>
                          {task.note.split('\\n').map((line: string, i: number) => (
                            <div key={i} className="mb-0.5">
                              {line.includes('[') ? 
                                <span><strong>{line.split(']')[0] + ']'}</strong> {line.split(']').slice(1).join(']')}</span> : 
                                <span><strong>หมายเหตุ:</strong> {line}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    
                    {col.id !== 'RM-STORAGE' && (
                      <CardFooter className="p-2 bg-gray-50 border-t rounded-b-xl flex gap-1.5 flex-wrap">
                        {col.id === 'QC' ? (
                          <Button onClick={() => handleQcPassClick(task)} className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm">
                            <CheckCircle className="w-4 h-4 mr-1" /> QC Pass
                          </Button>
                        ) : col.id === 'FG' ? (
                          <Button onClick={() => handleQcFgPassClick(task)} className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm">
                            <CheckCircle className="w-4 h-4 mr-1" /> QC Pass
                          </Button>
                        ) : (
                          // Normal Process Buttons
                          <>
                            {task.status !== 'IN_PROGRESS' && (
                              <Button onClick={() => handleStartClick(task)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                                <Play className="w-3 h-3 mr-1" /> เริ่ม
                              </Button>
                            )}
                            {task.status === 'IN_PROGRESS' && (
                              <>
                                {col.id === 'MIX' && task.sub_step === 'SOAK' && (
                                  <Button onClick={() => updateStatus(task.id, 'IN_PROGRESS', { sub_step: 'MIX' })} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white" size="sm">
                                    <Play className="w-3 h-3 mr-1" /> เริ่มผสม
                                  </Button>
                                )}
                                {col.id === 'MIX' && task.sub_step === 'MIX' && (
                                  <Button onClick={() => updateStatus(task.id, 'IN_PROGRESS', { sub_step: 'STORE' })} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white" size="sm">
                                    <Play className="w-3 h-3 mr-1" /> เก็บงาน
                                  </Button>
                                )}
                                {col.id === 'FG' ? (
                                  <Button onClick={async () => {
                                    if(confirm('ต้องการปิดจบออเดอร์นี้ใช่หรือไม่?')) {
                                      const lotId = task.production_lots?.id || task.production_lot_id;
                                      await supabase.from('production_lots').update({ current_status: 'COMPLETED' }).eq('id', lotId)
                                      await supabase.from('production_logs').update({ status: 'COMPLETED', end_time: new Date().toISOString() }).eq('production_lot_id', lotId).in('status', ['WAITING', 'IN_PROGRESS', 'PAUSED'])
                                      fetchTasks()
                                    }
                                  }} className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm">
                                    <CheckCircle className="w-3 h-3 mr-1" /> ปิด PO Order
                                  </Button>
                                ) : col.id === 'POF' ? (
                                  <Button onClick={() => handleFinishClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white" size="sm">
                                    อัปเดตยอดลัง / จบ
                                  </Button>
                                ) : (
                                  <Button onClick={() => handleFinishClick(task)} className="flex-1 bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white" size="sm">
                                    <Square className="w-3 h-3 mr-1" /> จบ
                                  </Button>
                                )}
                                {col.id === 'MM-RM' && (
                                  <Button onClick={() => handleWaitClick(task)} className="flex-1 bg-red-600 hover:bg-red-700 text-white" size="sm">
                                    รอสาร
                                  </Button>
                                )}
                                {col.id === 'PACKING' && (
                                  <Button onClick={() => handleEstimateClick(task)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                                    สอบถามยอด
                                  </Button>
                                )}
                              </>
                            )}
                          </>
                        )}
                        
                        {task.status === 'IN_PROGRESS' && (
                          <Button onClick={() => handlePauseClick(task)} variant="outline" className="px-2 text-orange-600 border-orange-200 hover:bg-orange-50" size="sm">
                            <Pause className="w-3 h-3" />
                          </Button>
                        )}
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={isEstimateDialogOpen} onOpenChange={setIsEstimateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>สอบถามยอดประมาณการ (บรรจุ)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-center">
            <div className="space-y-2">
              <p className="text-gray-500 text-sm">เวลาที่ดำเนินการไปแล้ว</p>
              <p className="text-3xl font-bold text-[#D4AF37]">{elapsedHoursStr} <span className="text-lg font-medium text-gray-500">ชั่วโมง</span></p>
            </div>
            <div className="space-y-2 mt-4">
              <p className="text-gray-500 text-sm">ยอดที่ทำได้ประมาณการ</p>
              <p className="text-3xl font-bold text-purple-600">{estimatedPiecesStr}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEstimateDialogOpen(false)} className="bg-purple-600 hover:bg-purple-700 text-white w-full">ปิดหน้าต่าง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ระบุเหตุผลการพักงาน</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>สาเหตุที่ต้องหยุดพักชั่วคราว</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              >
                <option value="">-- เลือกสาเหตุ --</option>
                <option value="พักเที่ยง ทำต่อบ่าย">พักเที่ยง ทำต่อบ่าย</option>
                <option value="เลิกงาน ทำต่อพรุ่งนี้เช้า">เลิกงาน ทำต่อพรุ่งนี้เช้า</option>
                <option value="เครื่องเสียรอช่าง">เครื่องเสียรอช่าง</option>
                <option value="รอผล QC">รอผล QC</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
            {pauseReason === 'อื่นๆ' && (
              <div className="space-y-2">
                <Label>ระบุสาเหตุเพิ่มเติม</Label>
                <Textarea 
                  placeholder="เช่น ติดประชุม, ไฟดับ..." 
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            )}
            {activeStartTask && getTaskColumn(activeStartTask) === 'PACKING' && (
              <div className="space-y-2 mt-2">
                <Label>ยอดที่ทำได้ก่อนพัก (ชิ้น/ขวด)</Label>
                <Input 
                  type="number" 
                  placeholder="ระบุจำนวนชิ้น" 
                  value={manualPieces}
                  onChange={(e) => setManualPieces(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => updateStatus(activeTaskId!, 'PAUSED', { note: pauseReason, piece_quantity: manualPieces ? parseFloat(manualPieces) : undefined })} className="bg-orange-600 hover:bg-orange-700 text-white">ยืนยันพักงาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เริ่มงาน (ระบุลำดับถัง)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เริ่มถังที่ (Tank Start)</Label>
                <Input 
                  type="number"
                  placeholder="เช่น 26" 
                  value={tankStart}
                  onChange={(e) => setTankStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ถึงถังที่ (Tank End)</Label>
                <Input 
                  type="number"
                  placeholder="เช่น 41" 
                  value={tankEnd}
                  onChange={(e) => setTankEnd(e.target.value)}
                />
              </div>
            </div>
            {activeStartTask && (activeStartTask.processes?.process_name?.includes('ผสม') || activeStartTask.rooms?.room_name?.includes('Mix') || activeStartTask.processes?.process_name?.includes('บรรจุ')) && (
              <div className="space-y-2 col-span-2">
                <Label>เลือกห้อง</Label>
                <select 
                  className="w-full border rounded p-2"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">-- กรุณาเลือกห้อง --</option>
                  {rooms.filter(r => activeStartTask.processes?.process_name?.includes('ผสม') ? r.room_name.includes('Mix') : r.room_name.includes('ห้อง')).map(r => (
                    <option key={r.id} value={r.id}>{r.room_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
              จำนวนถังรวม: {activeStartTask?.production_lots?.total_tanks || '?'} ใบ
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleStartConfirm} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">ยืนยันเริ่มงาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {activeStartTask && getTaskColumn(activeStartTask) === 'POF' ? 'อัปเดตยอดลัง' : 'ยืนยันจบงาน'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {activeStartTask && getTaskColumn(activeStartTask) !== 'POF' && (
              <>
                <p className="mb-4 text-center">ระบุลำดับถังที่ทำเสร็จสิ้นสำหรับงานนี้</p>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">ทำเสร็จถึงถังที่</Label>
                  <Input 
                    type="number" 
                    value={finishedTankEnd} 
                    onChange={(e) => {
                      setFinishedTankEnd(e.target.value)
                      if (activeStartTask && getTaskColumn(activeStartTask) === 'PACKING' && activeStartTask.production_lots) {
                        const lot = activeStartTask.production_lots
                        const start = activeStartTask.tank_start ? parseInt(activeStartTask.tank_start) : 1
                        const end = parseInt(e.target.value)
                        if (!isNaN(end) && end >= start && lot.kg_per_tank && lot.g_per_piece) {
                          const tks = end - start + 1
                          const pcs = (tks * lot.kg_per_tank * 1000) / lot.g_per_piece
                          setManualPieces(Math.round(pcs).toString())
                        }
                      }
                    }} 
                    className="col-span-3" 
                    min={activeStartTask?.tank_start || 1}
                    max={activeStartTask?.tank_end || 999}
                  />
                </div>
              </>
            )}
            {activeStartTask && getTaskColumn(activeStartTask) === 'PACKING' && (
              <div className="grid grid-cols-4 items-center gap-4 mt-4">
                <Label className="text-right text-purple-600 font-bold">ยอดที่ทำได้ (ชิ้น/ขวด)</Label>
                <Input 
                  type="number" 
                  value={manualPieces} 
                  onChange={(e) => setManualPieces(e.target.value)} 
                  className="col-span-3 border-purple-300 bg-purple-50 font-bold" 
                  placeholder="คำนวณอัตโนมัติ"
                />
              </div>
            )}
            {activeStartTask && getTaskColumn(activeStartTask) === 'POF' && (
              <>
                <div className="mb-4 p-3 bg-[#D4AF37]/ border border-[#D4AF37]/30 rounded-lg text-center">
                  <p className="text-sm font-medium text-slate-700">
                    ยอดลังสะสมในถังนี้: <span className="text-[#D4AF37] font-bold text-lg">{Math.floor((activeStartTask.piece_quantity || 0) / (activeStartTask.production_lots?.pcs_per_carton || 1))}</span> / <span className="font-bold text-lg">{calculatePofTargetCartons(activeStartTask).targetCartons}</span> ลัง
                  </p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mt-2">
                  <Label className="text-right">บรรจุ/ลัง (ชิ้น)</Label>
                  <Input 
                    type="number" 
                    value={piecesPerCarton} 
                    onChange={(e) => {
                      setPiecesPerCarton(e.target.value)
                      if (e.target.value && cartonsQuantity) {
                        setManualPieces(Math.round(parseFloat(e.target.value) * parseFloat(cartonsQuantity)).toString())
                      } else {
                        setManualPieces('')
                      }
                    }} 
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mt-4">
                  <Label className="text-right">จำนวนลัง</Label>
                  <Input 
                    type="number" 
                    value={cartonsQuantity} 
                    onChange={(e) => {
                      setCartonsQuantity(e.target.value)
                      if (e.target.value && piecesPerCarton) {
                        setManualPieces(Math.round(parseFloat(e.target.value) * parseFloat(piecesPerCarton)).toString())
                      } else {
                        setManualPieces('')
                      }
                    }} 
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mt-4">
                  <Label className="text-right text-purple-600 font-bold">ยอดส่งมอบ (ชิ้น)</Label>
                  <Input 
                    type="number" 
                    value={manualPieces} 
                    readOnly
                    className={`col-span-3 font-bold ${isOverLimit ? 'border-red-500 bg-red-50 text-red-600' : 'border-purple-300 bg-purple-50'}`} 
                    placeholder="คำนวณอัตโนมัติ"
                  />
                </div>
                {isOverLimit && (
                  <div className="col-span-4 mt-2">
                    <p className="text-sm text-red-500 text-center font-medium">
                      ⚠️ ยอดส่งมอบเกินปริมาณชิ้น/ถัง (สูงสุด {maxAllowedPieces} ชิ้น)
                    </p>
                    <p className="text-xs text-red-500 text-center mt-1">
                      กรุณากรอกไม่เกินยอดนี้ และนำส่วนที่เกินไปบันทึกในงานของถังถัดไป
                    </p>
                  </div>
                )}
              </>
            )}
            {activeStartTask?.tank_end && getTaskColumn(activeStartTask) !== 'POF' && parseInt(finishedTankEnd) < parseInt(activeStartTask.tank_end) && (
              <p className="text-sm text-amber-600 text-center mt-4">
                *ระบบจะดึงถังที่ {parseInt(finishedTankEnd) + 1} ถึง {activeStartTask.tank_end} เป็นงานทำต่อ
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinishDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleFinishConfirm} disabled={isOverLimit} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">
              {activeStartTask && getTaskColumn(activeStartTask) === 'POF' ? 'บันทึกยอด' : 'ยืนยันจบงาน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWaitDialogOpen} onOpenChange={setIsWaitDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ระบุชื่อสารที่ขาด (รอสาร)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>รายการสารเคมีที่ไม่เพียงพอ</Label>
              <Input 
                placeholder="เช่น Vitamin C, สาร BZ" 
                value={missingMaterial}
                onChange={(e) => setMissingMaterial(e.target.value)}
              />
            </div>
            <p className="text-xs text-red-500">ข้อมูลนี้จะถูกแสดงเป็นสีแดงบนการ์ดงาน เพื่อให้ฝ่ายวางแผนจัดซื้อติดตาม</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWaitDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleWaitConfirm} className="bg-red-600 hover:bg-red-700 text-white">ยืนยันการรอสาร</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQcPassDialogOpen} onOpenChange={setIsQcPassDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>QC Pass (ระบุถังที่ผ่าน)</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-center">ระบุลำดับถังที่ผ่านการตรวจสอบ QC</p>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">ผ่านถึงถังที่</Label>
              <Input 
                type="number" 
                value={qcPassTankEnd} 
                onChange={(e) => setQcPassTankEnd(e.target.value)} 
                className="col-span-3" 
                min={activeStartTask?.tank_start || 1}
                max={activeStartTask?.tank_end || 999}
              />
            </div>
            {activeStartTask?.tank_end && parseInt(qcPassTankEnd) < parseInt(activeStartTask.tank_end) && (
              <p className="text-sm text-green-600 text-center mt-4">
                *ระบบจะตัดถังที่ {activeStartTask.tank_start} - {qcPassTankEnd} ไปห้องบรรจุ<br/>และเก็บถังที่เหลือไว้รอ QC ต่อ
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQcPassDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleQcPassConfirm} className="bg-green-600 hover:bg-green-700 text-white">ยืนยัน QC Pass</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQcFgPassDialogOpen} onOpenChange={setIsQcFgPassDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>QC Pass (เข้าคลัง FG)</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-center text-sm text-gray-600">ระบุช่วงลังที่ตรวจสอบผ่าน เช่น &quot;1-50, 52-60&quot;</p>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">ช่วงลังที่ผ่าน</Label>
              <Input 
                value={qcFgPassRanges} 
                onChange={(e) => setQcFgPassRanges(e.target.value)} 
                className="col-span-3" 
                placeholder="เช่น 1-50, 52-60"
              />
            </div>
            {qcFgPassRanges && (
              <p className="text-sm text-green-600 text-center mt-4 font-semibold">
                *จำนวนที่ปล่อยผ่านรวม: {parseRanges(qcFgPassRanges)} ลัง
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQcFgPassDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleQcFgPassConfirm} className="bg-green-600 hover:bg-green-700 text-white">ยืนยัน QC Pass</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global styles for custom scrollbar to make it look clean */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
      `}} />
    </div>
  )
}
