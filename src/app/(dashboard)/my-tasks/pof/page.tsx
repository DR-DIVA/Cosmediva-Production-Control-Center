'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, PackageOpen, ChevronDown, ChevronRight, Play, CheckCircle2, Clock, MapPin, Package, Wind, AlertTriangle, ArrowDownToLine, Boxes, Sparkles, TrendingUp, Layers, RefreshCw, Truck, ArrowUpRight, Search, X, RotateCcw, Filter } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays, startOfDay, format } from 'date-fns'
import { DefectPopup } from '@/components/production/DefectPopup'
import { TaskCalendar } from '@/components/ui/TaskCalendar'
import { MasterPlanningTimeline } from '@/components/planner/MasterPlanningTimeline'
import { useKpiPeriod } from '@/hooks/useKpiPeriod'
import { KpiReportingPeriodToolbar } from '@/components/common/KpiReportingPeriodToolbar'
import { Dialog, DialogContent, DialogHeader, DialogTitle , DialogFooter} from '@/components/ui/dialog'
import { Calendar as CalendarIcon, List as ListIcon, User, History, ClipboardCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PofTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const kpiPeriod = useKpiPeriod()
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'timeline'>('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [filterDate, setFilterDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [historyList, setHistoryList] = useState<any[]>([])
  const [historyFilters, setHistoryFilters] = useState({
    time: '',
    user: '',
    lot: '',
    tank: '',
    status: ''
  })

  // Column-specific header filters for Queue table
  const [colFilterSku, setColFilterSku] = useState('')
  const [colFilterLot, setColFilterLot] = useState('')
  const [colFilterTank, setColFilterTank] = useState('')
  const [colFilterTotalTanks, setColFilterTotalTanks] = useState('')
  const [colFilterBulkSize, setColFilterBulkSize] = useState('')
  const [colFilterStdCartons, setColFilterStdCartons] = useState('')
  const [colFilterActualCartons, setColFilterActualCartons] = useState('')
  const [colFilterCumulative, setColFilterCumulative] = useState('')
  const [colFilterDate, setColFilterDate] = useState('')
  const [colFilterStatus, setColFilterStatus] = useState('ALL')

  const hasActiveColFilters = Boolean(
    colFilterSku || colFilterLot || colFilterTank || colFilterTotalTanks || colFilterBulkSize || colFilterStdCartons || colFilterActualCartons || colFilterCumulative || colFilterDate || (colFilterStatus !== 'ALL')
  )

  const clearAllColFilters = () => {
    setColFilterSku('')
    setColFilterLot('')
    setColFilterTank('')
    setColFilterTotalTanks('')
    setColFilterBulkSize('')
    setColFilterStdCartons('')
    setColFilterActualCartons('')
    setColFilterCumulative('')
    setColFilterDate('')
    setColFilterStatus('ALL')
  }
  const [qtyDialog, setQtyDialog] = useState<{open: boolean, taskId: string, tankNum: number, task: any, qty: string, boxLot: string, nextStatus: string, maxCartons?: number}>({open: false, taskId: '', tankNum: 0, task: null, qty: '', boxLot: '', nextStatus: ''})
  
  const [batchDialog, setBatchDialog] = useState<{
    open: boolean
    taskId: string
    task: any
    startTank: number
    endTank: number
    totalCartons: string
    boxLot: string
  }>({
    open: false,
    taskId: '',
    task: null,
    startTank: 1,
    endTank: 1,
    totalCartons: '',
    boxLot: ''
  })
  
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false)
  const [defectLotId, setDefectLotId] = useState('')
  const [defectQuantity, setDefectQuantity] = useState('')
  const [defectNote, setDefectNote] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchPofTasks()
    fetchRooms()
    fetchUser()
    fetchHistory()
    const interval = setInterval(() => {
      fetchPofTasks()
      fetchHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user.email ? user.email.split('@')[0] : 'Unknown User')
    }
  }

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_name')
    if (data) {
      const allowedRooms = ['POF 1', 'POF 2', 'PVC Shrink', 'ลงลังอย่างเดียว', 'POF - อื่นๆ']
      const filteredRooms = data.filter((r: any) => allowedRooms.includes(r.room_name))
      
      // Sort to match exact requested order
      filteredRooms.sort((a: any, b: any) => {
        return allowedRooms.indexOf(a.room_name) - allowedRooms.indexOf(b.room_name)
      })
      
      setRooms(filteredRooms)
    }
  }

  const fetchPofTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('production_logs')
      .select(`
        id,
        status,
        note,
        tank_start,
        tank_end,
        tank_details,
        start_time,
        activity_date,
        room_id,
        production_lot_id,
        production_lots (
          id,
          lot_no,
          total_tanks,
          sku_id,
          planned_quantity,
          order_quantity,
          kg_per_tank,
          g_per_piece,
          pcs_per_carton,
          products:sku_id (sku, product_name)
        ),
        processes (
          id,
          process_name
        ),
        rooms (
          id,
          room_name
        )
      `)
      .neq('status', 'COMPLETED')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('โหลดข้อมูลล้มเหลว')
      console.error(error)
    } else if (data) {
      const pofTasks = data.filter(t => 
        (t.processes as any)?.process_name?.toLowerCase().includes('pof') || 
        (t.processes as any)?.process_name?.toLowerCase().includes('อุโมงค์')
      )

      // Sort tasks: 1. Lot No (005/26 before 006/26), 2. Tank start numeric (1, 3, 5...), 3. Activity Date
      pofTasks.sort((a: any, b: any) => {
        const lotA = (a.production_lots?.lot_no || '').toString()
        const lotB = (b.production_lots?.lot_no || '').toString()
        const lotCompare = lotA.localeCompare(lotB, undefined, { numeric: true })
        if (lotCompare !== 0) return lotCompare

        const startA = parseInt(a.tank_start) || 0
        const startB = parseInt(b.tank_start) || 0
        if (startA !== startB) return startA - startB

        const dateA = a.activity_date || ''
        const dateB = b.activity_date || ''
        return dateA.localeCompare(dateB)
      })

      setAllTasks(data)
      setTasks(pofTasks)
      setSelectedTask((prev: any) => prev ? pofTasks.find(t => t.id === prev.id) || null : null)
    }
    setLoading(false)
  }

  const fetchHistory = async () => {
    const { data } = await supabase.from('production_logs')
      .select(`
        id, tank_details, updated_at,
        production_lots ( id, lot_no, products:sku_id (sku, product_name) ),
        processes ( id, process_name )
      `)
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (data) {
      const historyItems: any[] = []
      data.forEach((task: any) => {
        const pName = Array.isArray(task.processes) ? task.processes[0]?.process_name : task.processes?.process_name
        
        let shouldInclude = false;
        const lowerPName = pName ? pName.toLowerCase() : '';
        if ('pof'.includes('weighing') && (lowerPName.includes('ชั่ง') || lowerPName.includes('weigh'))) shouldInclude = true;
        else if ('pof'.includes('mixing') && (lowerPName.includes('ผสม') || lowerPName.includes('mix'))) shouldInclude = true;
        else if ('pof'.includes('packing') && (lowerPName.includes('บรรจุ') || lowerPName.includes('pack'))) shouldInclude = true;
        else if ('pof'.includes('pof') && (lowerPName.includes('pof') || lowerPName.includes('แพค'))) shouldInclude = true;
        
        if (!pName) shouldInclude = false;
        if (!shouldInclude) return;
        
        const details = task.tank_details || {}
        Object.keys(details).forEach(key => {
          if (key.endsWith('_history')) {
            const tankNum = key.replace('_history', '')
            const histories = details[key] as any[]
            if (Array.isArray(histories)) {
              histories.forEach(h => {
                historyItems.push({
                  taskId: task.id,
                  lotNo: task.production_lots?.lot_no,
                  sku: task.production_lots?.products?.sku,
                  tankNum,
                  action: h.status,
                  user: h.user,
                  timestamp: h.timestamp
                })
              })
            }
          }
        })
      })
      
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryList(historyItems.slice(0, 500))
    }
  }

  const getPofStatusText = (action: string) => {
    if (action === 'DONE') return 'ลงลังเสร็จ'
    if (action === 'IN_PROGRESS') return 'กำลังดำเนินการ'
    if (action === 'MOVED') return 'ไปเข้าคลัง FG'
    return action || '-'
  }

  const filteredHistoryList = React.useMemo(() => {
    return historyList.filter(item => {
      // 1. Time / Date filter
      if (historyFilters.time.trim()) {
        const term = historyFilters.time.toLowerCase().trim()
        const formattedDate = new Date(item.timestamp).toLocaleString('th-TH', { 
          year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
        }).toLowerCase()
        const rawDate = (item.timestamp || '').toLowerCase()
        if (!formattedDate.includes(term) && !rawDate.includes(term)) return false
      }
      // 2. User filter
      if (historyFilters.user.trim()) {
        const term = historyFilters.user.toLowerCase().trim()
        const u = (item.user || '').toLowerCase()
        if (!u.includes(term)) return false
      }
      // 3. Lot / SKU filter
      if (historyFilters.lot.trim()) {
        const term = historyFilters.lot.toLowerCase().trim()
        const lot = (item.lotNo || '').toLowerCase()
        const sku = (item.sku || '').toLowerCase()
        if (!lot.includes(term) && !sku.includes(term)) return false
      }
      // 4. Batch/Set filter
      if (historyFilters.tank.trim()) {
        const term = historyFilters.tank.toLowerCase().trim()
        const t = String(item.tankNum || '').toLowerCase()
        const label = `ชุดที่ ${t}`.toLowerCase()
        if (!t.includes(term) && !label.includes(term)) return false
      }
      // 5. Status filter
      if (historyFilters.status.trim()) {
        const term = historyFilters.status.toLowerCase().trim()
        const action = (item.action || '').toLowerCase()
        const statusText = getPofStatusText(item.action).toLowerCase()
        if (!action.includes(term) && !statusText.includes(term)) return false
      }
      return true
    })
  }, [historyList, historyFilters])

  const isHistoryFiltered = Object.values(historyFilters).some(v => v.trim() !== '')
  const clearHistoryFilters = () => setHistoryFilters({ time: '', user: '', lot: '', tank: '', status: '' })

  const exportToExcel = () => {
    const listToExport = filteredHistoryList
    if (listToExport.length === 0) {
      toast.error('ไม่มีข้อมูลให้ Export')
      return
    }
    const worksheet = XLSX.utils.json_to_sheet(listToExport.map((item: any) => {
      const statusText = getPofStatusText(item.action)

      return {
        'วันที่-เวลา': new Date(item.timestamp).toLocaleString('th-TH'),
        'ผู้ดำเนินการ': item.user?.split('@')[0] || '-',
        'LOT No.': item.lotNo || '-',
        'SKU': item.sku || '-',
        'ชุดที่': `ชุดที่ ${item.tankNum}`,
        'สถานะ': statusText
      }
    }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cartoning History")
    XLSX.writeFile(workbook, "Cartoning_Work_History.xlsx")
  }

  const toggleRow = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null)
    } else {
      setExpandedRow(id)
    }
  }

    const handleDefectSubmit = async () => {
    if (!defectLotId || !defectQuantity) {
      toast.error('กรุณาระอกข้อมูลให้ครบถ้วน')
      return
    }
    const { error } = await supabase.from('production_logs').insert({
      production_lot_id: defectLotId,
      status: 'DEFECT',
      process_id: '980b3c92-e5e1-4dec-91e2-e0c8dfe4f72b',
      piece_quantity: parseInt(defectQuantity),
      note: defectNote || null,
      activity_date: new Date().toISOString().split('T')[0]
    })
    if (error) {
      toast.error('บันทึกของเสียไม่สำเร็จ')
    } else {
      toast.success('บันทึกของเสียประจำวันสำเร็จ')
      setIsDefectModalOpen(false)
      setDefectLotId('')
      setDefectQuantity('')
      setDefectNote('')
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const updateData: any = { status: newStatus }
    if (newStatus === 'IN_PROGRESS') {
      if (!tasks.find(t => t.id === taskId)?.start_time) {
         updateData.start_time = new Date().toISOString()
      }
    } else if (newStatus === 'DONE') {
      updateData.end_time = new Date().toISOString()
    }

    const { error } = await supabase
      .from('production_logs')
      .update(updateData)
      .eq('id', taskId)

    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ')
    } else {
      toast.success('อัปเดตสถานะเรียบร้อย')
      fetchPofTasks()
    }
  }

  const updateTaskRoom = async (taskId: string, roomId: string) => {
    const { error } = await supabase
      .from('production_logs')
      .update({ room_id: roomId })
      .eq('id', taskId)

    if (error) {
      toast.error('อัปเดตห้อง/จุดปฏิบัติงานไม่สำเร็จ')
    } else {
      toast.success('อัปเดตห้องเรียบร้อย')
      fetchPofTasks()
    }
  }

  const updateTankProgress = async (taskId: string, currentTank: number, task: any) => {
    let details = typeof task.tank_details === 'object' && task.tank_details !== null ? { ...task.tank_details } : {}
    
    // Toggle logic: WAITING -> IN_PROGRESS -> DONE -> WAITING
    const currentStatus = details[currentTank]?.status || details[currentTank] || 'WAITING'
    let nextStatus = 'IN_PROGRESS'
    if (currentStatus === 'IN_PROGRESS') nextStatus = 'DONE'
    else if (currentStatus === 'DONE') {
      toast.error('ไม่สามารถแก้ไขรายการที่เสร็จสิ้นแล้วได้')
      return
    }

    if (nextStatus === 'DONE') {
      const existingBoxLot = details[currentTank]?.box_lot || ''
      
      let maxCartons = 0;
      const kgPerTank = task.production_lots?.kg_per_tank || 0
      const gPerPiece = task.production_lots?.g_per_piece || 1
      const pcsPerCarton = task.production_lots?.pcs_per_carton || 1
      const stdYieldPieces = Math.round((kgPerTank * 1000) / gPerPiece)
      const maxStdCartons = Math.ceil(stdYieldPieces / pcsPerCarton)
      
      const sameLotPackingTasks = allTasks.filter(t => 
        t.production_lot_id === task.production_lot_id && 
        ((t.processes as any)?.process_name?.toLowerCase().includes('บรรจุ') || (t.processes as any)?.process_name?.toLowerCase().includes('packing'))
      );
      const packingTask = sameLotPackingTasks.find(t => currentTank >= parseInt(t.tank_start) && currentTank <= parseInt(t.tank_end) && (t.tank_details as any)?.[currentTank]?.pieces !== undefined);
      
      if (packingTask) {
        const pDetails = packingTask.tank_details as any;
        maxCartons = Math.ceil(Number(pDetails[currentTank].pieces) / pcsPerCarton);
      } else {
        maxCartons = maxStdCartons;
      }
      
      setQtyDialog({ open: true, taskId, tankNum: currentTank, task, qty: '', boxLot: existingBoxLot, nextStatus, maxCartons })
      return
    }

    await executeTankUpdate(taskId, currentTank, task, nextStatus, 0, '')
  }

    const handleQtyConfirm = async () => {
    const qtyNum = Number(qtyDialog.qty)
    if (!qtyDialog.qty || isNaN(qtyNum) || qtyNum < 0) {
      toast.error('กรุณาระบุยอดงาน FG (ลัง) ที่ถูกต้อง')
      return
    }
    if (!qtyDialog.boxLot || qtyDialog.boxLot.trim() === '') {
      toast.error('กรุณาระบุข้อมูลกล่องพิมพ์ล็อต (เช่น Lot.009/26)')
      return
    }
    
    const task = qtyDialog.task;
    const currentTank = qtyDialog.tankNum;
    
    const maxCartons = qtyDialog.maxCartons || Infinity;
    if (maxCartons !== Infinity && qtyNum > maxCartons) {
      toast.error(`ยอดลังที่ระบุเกินกว่ายอดสูงสุดของถังนี้ (${maxCartons} ลัง)`);
      return;
    }

    await executeTankUpdate(qtyDialog.taskId, qtyDialog.tankNum, qtyDialog.task, qtyDialog.nextStatus, qtyNum, qtyDialog.boxLot)
    setQtyDialog(prev => ({ ...prev, open: false }))
  }

  const openBatchDialog = (task: any) => {
    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {}

    // Find first tank not done
    let firstIncomplete = start
    for (let i = start; i <= end; i++) {
      const s = details[i]?.status || details[i] || 'WAITING'
      if (s !== 'DONE') {
        firstIncomplete = i
        break
      }
    }

    // Default boxLot from task or existing completed tanks
    let existingBoxLot = ''
    for (let i = 1; i <= total; i++) {
      if (details[i]?.box_lot) {
        existingBoxLot = details[i].box_lot
        break
      }
    }
    if (!existingBoxLot && task.production_lots?.lot_no) {
      existingBoxLot = `Lot.${task.production_lots.lot_no}`
    }

    setBatchDialog({
      open: true,
      taskId: task.id,
      task,
      startTank: firstIncomplete,
      endTank: end,
      totalCartons: '',
      boxLot: existingBoxLot
    })
  }

  const handleBatchConfirm = async () => {
    const { taskId, task, startTank, totalCartons, boxLot } = batchDialog
    const totalC = parseInt(totalCartons)
    if (!totalCartons || isNaN(totalC) || totalC <= 0) {
      toast.error('กรุณาระบุจำนวนลังรวมที่ถูกต้อง')
      return
    }
    if (!boxLot || boxLot.trim() === '') {
      toast.error('กรุณาระบุข้อมูลกล่องพิมพ์ล็อต (เช่น Lot.010/26)')
      return
    }

    const taskEnd = parseInt(task.tank_end) || (task.production_lots?.total_tanks || 200)
    const kgPerTank = task.production_lots?.kg_per_tank || 0
    const gPerPiece = task.production_lots?.g_per_piece || 1
    const pcsPerCarton = task.production_lots?.pcs_per_carton || 1
    const stdYieldPieces = Math.round((kgPerTank * 1000) / gPerPiece)
    const stdCartonsPerTank = pcsPerCarton > 0 ? (stdYieldPieces / pcsPerCarton) : 14.5

    // Compute rolling capacity allocation
    let remaining = totalC
    let currentT = startTank
    let details = typeof task.tank_details === 'object' && task.tank_details !== null ? { ...task.tank_details } : {}

    const allocatedTanks: number[] = []

    while (remaining > 0 && currentT <= taskEnd) {
      const tankCap = (stdCartonsPerTank % 1 !== 0) 
        ? ((currentT % 2 === 0) ? Math.ceil(stdCartonsPerTank) : Math.floor(stdCartonsPerTank))
        : Math.round(stdCartonsPerTank)

      const c = Math.min(remaining, tankCap)
      remaining -= c

      const prevDetails = typeof details[currentT] === 'object' && details[currentT] !== null ? details[currentT] : {}
      details[currentT] = {
        ...prevDetails,
        status: 'DONE',
        cartons: c,
        box_lot: boxLot
      }

      const history = details[`${currentT}_history`] || []
      details[`${currentT}_history`] = [
        ...history,
        {
          status: 'DONE',
          cartons: c,
          box_lot: boxLot,
          timestamp: new Date().toISOString(),
          user: currentUser,
          note: `บันทึกรวบยอด (${totalC} ลัง Rolling ถังที่ ${startTank}-${currentT})`
        }
      ]

      allocatedTanks.push(currentT)
      currentT++
    }

    // If leftover beyond taskEnd, attach to last tank
    if (remaining > 0 && allocatedTanks.length > 0) {
      const lastT = allocatedTanks[allocatedTanks.length - 1]
      details[lastT].cartons += remaining
    }

    const calculatedEndTank = allocatedTanks.length > 0 ? allocatedTanks[allocatedTanks.length - 1] : startTank
    const total = task.production_lots?.total_tanks || 0
    const taskStart = parseInt(task.tank_start) || 1
    
    let allDone = true
    for (let i = taskStart; i <= taskEnd; i++) {
      const s = details[i]?.status || details[i] || 'WAITING'
      if (s !== 'DONE') {
        allDone = false
        break
      }
    }

    const updates: any = { tank_details: details }
    if (allDone) {
      updates.status = 'DONE'
      updates.end_time = new Date().toISOString()
    } else {
      updates.status = 'IN_PROGRESS'
    }

    const { error } = await supabase
      .from('production_logs')
      .update(updates)
      .eq('id', taskId)

    if (error) {
      toast.error('บันทึกรวบยอดไม่สำเร็จ')
      console.error(error)
    } else {
      toast.success(`🎉 บันทึกรวบยอด ${totalC} ลัง (ตัดเต็มถัง ${startTank} ถึง ${calculatedEndTank}) เรียบร้อยแล้ว!`)
      setBatchDialog(prev => ({ ...prev, open: false }))

      // Auto Hand-off to FG
      const { data: fgProcess } = await supabase.from('processes').select('id').or('process_name.ilike.%FG%,process_name.ilike.%คลัง%').limit(1).single()
      if (fgProcess) {
        const fgDetails: any = {}
        for (const t of allocatedTanks) {
          fgDetails[t] = {
            status: 'WAITING',
            box_lot: boxLot,
            cartons: details[t]?.cartons || 0
          }
        }
        fgDetails.delivery_info = {
          sender: currentUser,
          timestamp: new Date().toISOString(),
          note: `ส่งมอบรวบยอด ${totalC} ลัง (ถัง ${startTank}-${calculatedEndTank})`
        }

        await supabase.from('production_logs').insert({
          production_lot_id: task.production_lot_id,
          process_id: fgProcess.id,
          status: 'WAITING',
          activity_date: new Date().toISOString().split('T')[0],
          tank_start: String(startTank),
          tank_end: String(calculatedEndTank),
          tank_details: fgDetails,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      fetchPofTasks()
    }
  }

  const executeTankUpdate = async (taskId: string, currentTank: number, task: any, nextStatus: string, qty: number, boxLot: string) => {
    let details = typeof task.tank_details === 'object' && task.tank_details !== null ? { ...task.tank_details } : {}

    if (nextStatus === 'WAITING') {
      delete details[currentTank]
      delete details[`${currentTank}_history`]
    } else {
      const prevDetails = typeof details[currentTank] === 'object' && details[currentTank] !== null ? details[currentTank] : {}
      details[currentTank] = { ...prevDetails, status: nextStatus }
      if (qty > 0) details[currentTank].cartons = qty
      if (boxLot) details[currentTank].box_lot = boxLot
      
      const history = details[`${currentTank}_history`] || []
      details[`${currentTank}_history`] = [
        ...history,
        { status: nextStatus, cartons: qty > 0 ? qty : undefined, box_lot: boxLot || undefined, timestamp: new Date().toISOString(), user: currentUser }
      ]
    }

    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    const validEnd = Math.max(start, end)
    
    let allDone = true
    for (let i = start; i <= validEnd; i++) {
      const s = details[i] || 'WAITING'
      if (s !== 'DONE') {
        allDone = false
        break
      }
    }
    
    const updates: any = { tank_details: details }
    if (allDone && task.status !== 'DONE') {
      updates.status = 'DONE'
      updates.end_time = new Date().toISOString()
    } else if (!allDone && task.status === 'DONE') {
      updates.status = 'IN_PROGRESS'
      updates.end_time = null
    }

    const { error } = await supabase
      .from('production_logs')
      .update(updates)
      .eq('id', taskId)

    if (error) {
      toast.error('อัปเดตสถานะถังไม่สำเร็จ')
    } else {
      toast.success(`อัปเดต POF ถังที่ ${currentTank} เป็นสถานะ ${nextStatus}`)
      
      // --- AUTO HAND-OFF TO FG ---
      if (nextStatus === 'DONE') {
        const passedBoxLot = boxLot || details[currentTank]?.box_lot || ''
        const passedCartons = qty > 0 ? qty : (details[currentTank]?.cartons || 0)
        
        const { data: fgProcess } = await supabase.from('processes').select('id').or('process_name.ilike.%FG%,process_name.ilike.%คลัง%').limit(1).single()
        if (fgProcess) {
          const fgDetails: any = {}
          fgDetails[currentTank] = { status: 'WAITING', box_lot: passedBoxLot, cartons: passedCartons }
          fgDetails.delivery_info = {
            sender: currentUser,
            timestamp: new Date().toISOString()
          }
          
          await supabase.from('production_logs').insert({
            production_lot_id: task.production_lot_id,
            process_id: fgProcess.id,
            status: 'WAITING',
            activity_date: new Date().toISOString().split('T')[0],
            tank_start: String(currentTank),
            tank_end: String(currentTank),
            tank_details: fgDetails,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }

      fetchPofTasks()
    }
  }

  const renderTunnel = (task: any) => {
    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    const validEnd = Math.max(start, end)
    const limit = Math.min(validEnd - start + 1, 200)
    
    const tanks = Array.from({ length: limit }).map((_, i) => start + i)
    const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {}

    return (
      <div className="p-6 bg-orange-50/30 border-b shadow-inner">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <PackageOpen className="w-5 h-5 text-orange-500" />
              สถานะการลงลัง คิวนี้ (ถังที่ {start} ถึง {end}) จากทั้งหมด {total} ถัง
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">วันที่จัดคิว:</span>
                <span className="text-sm text-slate-800 font-medium">
                  {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">จุดลงลัง:</span>
                <Select value={task.room_id || ''} onValueChange={(val) => updateTaskRoom(task.id, val)}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-white">
                    <SelectValue placeholder="ระบุเครื่องอบ">
                      {rooms.find(r => r.id === task.room_id)?.room_name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.room_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {(task.status === 'WAITING' || task.status === 'PLANNED' || !task.status) && (
              <Button size="sm" onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className="bg-orange-600 hover:bg-orange-700 text-white shadow-xs">
                <ArrowDownToLine className="w-4 h-4 mr-1.5" /> เริ่มลงลัง
              </Button>
            )}

            {task.status !== 'DONE' && (
              <Button
                size="sm"
                onClick={() => openBatchDialog(task)}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <Boxes className="w-4 h-4" />
                ⚡ บันทึกรวบยอด (Auto Batch)
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-12 gap-6 mt-4">
          {tanks.map((t) => {
            let color = "text-slate-300 bg-white border-slate-200"
            let animate = ""
            
            const tankStatus = details[t]?.status || details[t] || (task.status === 'DONE' ? 'DONE' : 'LOCKED')
            
            if (tankStatus === 'LOCKED') {
              color = "text-slate-300 bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
            } else if (tankStatus === 'DONE' || task.status === 'DONE') {
              color = "text-green-500 bg-green-50 border-green-200 shadow-sm"
            } else if (tankStatus === 'IN_PROGRESS') {
              color = "text-orange-500 bg-orange-50 border-orange-200 shadow-sm"
              animate = "animate-pulse"
            }
            
            const isClickable = (task.status === 'IN_PROGRESS' || task.status === 'WAITING') && tankStatus !== 'LOCKED'

            const history = details[`${t}_history`] || []
            const actualCartons = details[t]?.cartons || 0
            const tankBoxLot = details[t]?.box_lot || ''
            
            let cartonRangeText = ''
            if (actualCartons > 0) {
               let cartonsBefore = 0;
               const sameLotTasks = tasks.filter((x: any) => x.production_lot_id === task.production_lot_id);
               for (let i = 1; i < t; i++) {
                 const taskForTank = sameLotTasks.find((x: any) => {
                   if (i >= parseInt(x.tank_start) && i <= parseInt(x.tank_end)) {
                     const d = typeof x.tank_details === 'object' && x.tank_details !== null ? (x.tank_details as any) : {};
                     return d[i] && d[i].cartons !== undefined;
                   }
                   return false;
                 });
                 if (taskForTank) {
                   const d = taskForTank.tank_details as any;
                   cartonsBefore += Number(d[i].cartons) || 0;
                 }
               }
               const startCarton = cartonsBefore + 1;
               const endCarton = cartonsBefore + actualCartons;
               cartonRangeText = `ลังที่ ${startCarton}-${endCarton}`;
            }

            const tooltipContent = history.length > 0 ? (
              <div className="space-y-1 min-w-[150px]">
                <div className="border-b border-slate-700 pb-1.5 mb-2">
                  <p className="font-semibold text-orange-300">ประวัติถัง {t}</p>
                  <div className="text-[10px] text-slate-300 mt-1 flex flex-col gap-0.5">
                    <div className="flex justify-between"><span>Actual Yield:</span> <span className={actualCartons > 0 ? "text-emerald-400 font-medium" : ""}>{actualCartons > 0 ? actualCartons.toLocaleString() : '-'} ลัง</span></div>
                    {cartonRangeText && <div className="text-emerald-400 mt-0.5 font-medium">{cartonRangeText}</div>}
                  </div>
                  {tankBoxLot && (
                    <div className="text-[10px] text-amber-300 mt-1 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded w-fit border border-amber-500/20">
                      📦 {tankBoxLot}
                    </div>
                  )}
                </div>
                {history.map((h: any, i: number) => {
                  let statusText = ''
                  let badgeClass = 'bg-slate-700 text-slate-100 border-none'
                  if (h.status === 'IN_PROGRESS') {
                    statusText = 'เริ่มลงลัง'
                    badgeClass = 'bg-orange-500 text-white border-orange-600'
                  }
                  if (h.status === 'DONE') {
                    statusText = 'ลงลังเสร็จ'
                    badgeClass = 'bg-green-500 text-white border-green-600'
                  }
                  return (
                    <div key={i} className="flex flex-col mb-2 bg-slate-800 p-1.5 rounded">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${badgeClass}`}>{statusText}</Badge>
                        <span className="text-[10px] text-slate-300 shrink-0">{new Date(h.timestamp).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-slate-400">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="text-[10px] truncate max-w-[120px]">{h.user?.split('@')[0]}</span>
                      </div>
                      {h.cartons && (
                        <div className="text-[10px] text-slate-300 mt-1 italic border-l-2 border-slate-600 pl-1">
                          ได้ {h.cartons.toLocaleString()} ลัง
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null

            const handleTunnelClick = () => {
              if (!isClickable) return

              updateTankProgress(task.id, t, task)
            }

            return (
              <TooltipProvider key={t}>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      onClick={handleTunnelClick}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 ${color} ${isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'opacity-70'} overflow-hidden group`}
                    >
                      <Package className={`w-8 h-8 mb-2 ${animate}`} />
                      <span className="text-xs font-bold">ถัง {t}</span>
                    </div>
                  </TooltipTrigger>
                  {tooltipContent && (
                    <TooltipContent side="top" className="max-w-sm p-3 bg-[#2D2721] border-[#2D2721] text-white shadow-xl z-[9999]">
                      {tooltipContent}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        {/* Workflow Diagram */}
        <div className={`mt-8 flex items-center justify-center p-8 border-2 border-dashed rounded-xl overflow-hidden relative ${task.status === 'DONE' ? 'border-green-300 bg-green-50/80' : 'border-orange-200 bg-orange-50/50'}`}>
           <div className={`flex items-center gap-8 ${task.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}`}>
              <PackageOpen className={`w-10 h-10 ${task.status === 'DONE' ? 'text-green-400' : 'text-orange-300'}`} />
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-orange-200'}`} />
              <div className={`w-32 h-20 rounded-lg shadow-inner flex items-center justify-center relative ${task.status === 'DONE' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-orange-400 to-red-500'}`}>
                 <Package className="w-8 h-8 text-white/50 absolute top-2 right-2 animate-bounce" />
                 <span className="text-white font-bold tracking-widest text-sm">CARTON</span>
              </div>
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-orange-200'}`} />
              <PackageOpen className={`w-10 h-10 drop-shadow-md ${task.status === 'DONE' ? 'text-green-600' : 'text-orange-600'}`} />
           </div>
        </div>
        
        {task.start_time && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" /> 
            เริ่มลงลังเมื่อ: {new Date(task.start_time).toLocaleString('th-TH')}
          </div>
        )}
      </div>
    )
  }

  const handleRefresh = () => {
    fetchPofTasks()
    fetchHistory()
    toast.success('รีเฟรชข้อมูลคิวงานลงลังล่าสุดเรียบร้อยแล้ว')
  }

  // Filter tasks for KPI calculations scoped to selected reporting period
  const kpiFilteredTasks = useMemo(() => {
    return kpiPeriod.filterByPeriod(tasks, t => t.activity_date || t.start_time || (t.production_lots as any)?.created_at)
  }, [tasks, kpiPeriod])

  // POF Metric Calculations (Scoped to Selected Reporting Period)
  let totalTanksCount = 0;
  let inProgressTanksCount = 0;
  let doneTanksCount = 0;
  let totalCartonsProduced = 0;

  kpiFilteredTasks.forEach(t => {
    const lot = t.production_lots;
    const total = lot?.total_tanks || 1;
    const start = parseInt(t.tank_start) || 1;
    const end = parseInt(t.tank_end) || total;
    const count = Math.max(start, end) - start + 1;
    totalTanksCount += count;

    const details = typeof t.tank_details === 'object' && t.tank_details !== null ? t.tank_details : {};
    for (let i = start; i <= Math.max(start, end); i++) {
      const s = details[i]?.status || details[i] || 'WAITING';
      if (s === 'IN_PROGRESS') inProgressTanksCount++;
      if (s === 'DONE') doneTanksCount++;
      
      const c = Number(details[i]?.cartons) || 0;
      totalCartonsProduced += c;
    }
  });

  const activeRunning = inProgressTanksCount;
  const pofPct = totalTanksCount > 0 ? ((doneTanksCount / totalTanksCount) * 100).toFixed(1) : '0.0';

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterDate && t.activity_date !== filterDate) return false

      if (kpiPeriod.syncTableWithPeriod && kpiPeriod.dateRange.start && kpiPeriod.dateRange.end) {
        const rawDate = t.activity_date || t.start_time
        if (rawDate) {
          const dStr = rawDate.substring(0, 10)
          if (dStr < kpiPeriod.dateRange.start || dStr > kpiPeriod.dateRange.end) return false
        }
      }

      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim()
        const sku = ((t.production_lots as any)?.products?.sku || '').toLowerCase()
        const lotNo = ((t.production_lots as any)?.lot_no || '').toLowerCase()
        if (!sku.includes(term) && !lotNo.includes(term)) return false
      }

      if (colFilterSku.trim()) {
        const sku = ((t.production_lots as any)?.products?.sku || '').toLowerCase()
        if (!sku.includes(colFilterSku.toLowerCase().trim())) return false
      }

      if (colFilterLot.trim()) {
        const lotNo = ((t.production_lots as any)?.lot_no || '').toLowerCase()
        if (!lotNo.includes(colFilterLot.toLowerCase().trim())) return false
      }

      if (colFilterTank.trim()) {
        const tankText = `${t.tank_start || 1}-${t.tank_end || 1}`
        if (!tankText.includes(colFilterTank.trim())) return false
      }

      if (colFilterTotalTanks.trim()) {
        const totalTanks = String((t.production_lots as any)?.total_tanks || '')
        if (!totalTanks.includes(colFilterTotalTanks.trim())) return false
      }

      if (colFilterBulkSize.trim()) {
        const bulkSize = String((t.production_lots as any)?.kg_per_tank || '')
        if (!bulkSize.includes(colFilterBulkSize.trim())) return false
      }

      const kgPerTank = t.production_lots?.kg_per_tank || 0
      const gPerPiece = t.production_lots?.g_per_piece || 1
      const pcsPerCarton = t.production_lots?.pcs_per_carton || 1
      const stdYieldPieces = Math.floor((kgPerTank * 1000) / gPerPiece)
      const stdYieldCartons = Math.floor(stdYieldPieces / pcsPerCarton)

      if (colFilterStdCartons.trim()) {
        if (!String(stdYieldCartons).includes(colFilterStdCartons.trim())) return false
      }

      let actualYieldCartons = 0
      const details = t.tank_details || {}
      Object.keys(details).forEach(k => {
        if (!k.includes('_history') && details[k]?.cartons) {
          actualYieldCartons += Number(details[k].cartons)
        }
      })

      if (colFilterActualCartons.trim()) {
        if (!String(actualYieldCartons).includes(colFilterActualCartons.trim())) return false
      }

      if (colFilterCumulative.trim()) {
        let cumulativeCartons = 0
        const sameLotTasks = tasks.filter(taskItem => taskItem.production_lot_id === t.production_lot_id)
        const targetEnd = parseInt(t.tank_end) || 0
        for (let i = 1; i <= targetEnd; i++) {
          const taskForTank = sameLotTasks.find(taskItem => {
            if (i >= parseInt(taskItem.tank_start) && i <= parseInt(taskItem.tank_end)) {
              const d = typeof taskItem.tank_details === 'object' && taskItem.tank_details !== null ? (taskItem.tank_details as any) : {}
              return d[i] && d[i].cartons !== undefined
            }
            return false
          })
          if (taskForTank) {
            const d = taskForTank.tank_details as any
            cumulativeCartons += Number(d[i].cartons)
          }
        }
        const plannedQty = t.production_lots?.planned_quantity || t.production_lots?.order_quantity || 0
        const calcPieces = cumulativeCartons * pcsPerCarton
        const cumStr = `${cumulativeCartons} ${calcPieces} ${plannedQty}`
        if (!cumStr.includes(colFilterCumulative.trim())) return false
      }

      if (colFilterDate.trim()) {
        const dateStr = t.activity_date ? format(new Date(t.activity_date), 'dd/MM/yyyy') : ''
        const rawDate = t.activity_date || ''
        const q = colFilterDate.trim()
        if (!dateStr.includes(q) && !rawDate.includes(q)) return false
      }

      if (colFilterStatus !== 'ALL') {
        const s = t.status || 'PLANNED'
        if (colFilterStatus === 'WAITING' && s !== 'WAITING' && s !== 'PLANNED') return false
        if (colFilterStatus === 'IN_PROGRESS' && s !== 'IN_PROGRESS') return false
        if (colFilterStatus === 'DONE' && s !== 'DONE') return false
      }

      return true
    })
  }, [tasks, filterDate, searchQuery, colFilterSku, colFilterLot, colFilterTank, colFilterTotalTanks, colFilterBulkSize, colFilterStdCartons, colFilterActualCartons, colFilterCumulative, colFilterDate, colFilterStatus])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Boxes className="w-8 h-8 text-yellow-500 shrink-0" />
            งานลงลัง (Cartoning & Shrink Film POF)
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>รายการงานอบฟิล์มหด ติดฉลาก บรรจุลงกล่อง และส่งมอบเข้าสู่คลังสินค้าสำเร็จรูป FG</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Synchronize RM-MX-PK One Team
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-60">
            <Input 
              placeholder="ค้นหา SKU หรือ LOT..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white"
            />
          </div>
          <Button onClick={handleRefresh} variant="outline" className="bg-[#F8F6F0] hover:bg-slate-100 flex items-center gap-1.5 shrink-0">
            <RefreshCw className="w-4 h-4 text-[#D4AF37]" /> รีเฟรช
          </Button>
          <div className="flex gap-1.5 shrink-0">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold' : ''}
            >
              <ListIcon className="w-4 h-4 mr-1.5" /> ตาราง
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold' : ''}
            >
              <CalendarIcon className="w-4 h-4 mr-1.5" /> ปฏิทิน
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className={viewMode === 'timeline' ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold' : ''}
            >
              <Clock className="w-4 h-4 mr-1.5" /> ไทม์ไลน์
            </Button>
          </div>
        </div>
      </div>

      {/* 0. KPI Reporting Period Toolbar */}
      <KpiReportingPeriodToolbar
        period={kpiPeriod}
        summaryBadge={`(${kpiFilteredTasks.length} งาน • ${totalTanksCount} ถังในคิว)`}
        showSyncCheckbox={true}
        syncCheckboxLabel="ซิงค์ตัวกรองช่วงเวลานี้กับตารางรายการด้านล่างด้วย (Sync Queue Table with Period)"
        summaryFooter={`พบ ${kpiFilteredTasks.length} งานในงวดนี้ • ${totalCartonsProduced.toLocaleString()} ลัง`}
      />

      {/* 1. Executive POF & Cartoning KPI Summary Bar */}
      <div className="bg-gradient-to-r from-[#2D2721] via-[#3E352B] to-[#2D2721] text-white p-5 rounded-2xl shadow-xl border border-[#D4AF37]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 shrink-0">
            <Boxes className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Shrink Film & Cartoning Intelligence
            </div>
            <div className="text-lg md:text-xl font-black text-white mt-0.5">
              Executive Cartoning & POF Station KPI
            </div>
            <div className="text-xs text-stone-300 mt-0.5">
              ภาพรวมงานอบฟิล์ม • สรุปยอดลงลังสะสม • ความพร้อมส่งมอบคลัง FG • และการปิดกล่องตามมาตรฐาน
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Total POF Jobs */}
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[11px] text-stone-300 font-medium">คิวงานลงลังรวม</div>
            <div className="text-2xl font-black text-[#D4AF37] tracking-tight">
              {kpiFilteredTasks.length} <span className="text-xs font-normal text-stone-300">งาน</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">({totalTanksCount} ถังในคิว)</div>
          </div>

          {/* Active Cartoning / POF */}
          <div className="bg-orange-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-orange-400/30 text-center">
            <div className="text-[11px] text-orange-200 font-medium">กำลังอบฟิล์ม / ลงลัง</div>
            <div className="text-2xl font-black text-orange-400">
              {activeRunning} <span className="text-xs font-normal text-orange-200">ถัง/ชุด</span>
            </div>
            <div className="text-[10px] text-orange-300 mt-0.5">(อุโมงค์ความร้อนเดินงาน)</div>
          </div>

          {/* Completed Cartons Output */}
          <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-400/30 text-center">
            <div className="text-[11px] text-emerald-200 font-medium">ยอดลังเสร็จสิ้นสะสม</div>
            <div className="text-2xl font-black text-emerald-400">
              {totalCartonsProduced.toLocaleString()} <span className="text-xs font-normal text-emerald-200">ลัง</span>
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">({doneTanksCount} ถังลงลังเสร็จ)</div>
          </div>

          {/* FG Release Flow */}
          <div className="bg-blue-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-blue-400/30 text-center">
            <div className="text-[11px] text-blue-200 font-medium">ความคืบหน้าภาพรวม</div>
            <div className="text-2xl font-black text-blue-300">
              {pofPct}%
            </div>
            <div className="text-[10px] text-blue-300 mt-0.5">(ส่งมอบเข้าคลัง FG)</div>
          </div>
        </div>
      </div>

      {/* 2. Four Interactive Dimension Cards for POF */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Heat Tunnel */}
        <Card className="border-2 border-slate-200 hover:border-orange-400 bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold shadow-sm">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">1. ห้องอุโมงค์ฟิล์ม (POF)</div>
                  <div className="text-[11px] text-slate-500">Shrink Tunnel Machine</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 font-semibold">
                {activeRunning} กำลังอบ
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-orange-600">{activeRunning}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">/ {totalTanksCount} ถังเดินเครื่อง</span>
              </div>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] font-bold">
                Tunnel Flow
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${totalTanksCount > 0 ? ((activeRunning / totalTanksCount) * 100) : 0}%` }} className="bg-orange-500 h-full transition-all duration-500" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-orange-50/70 border border-orange-100">
                <div className="text-[10px] font-semibold text-orange-700">กำลังอบ</div>
                <div className="text-xs font-bold text-orange-800 mt-0.5">{activeRunning}</div>
                <div className="text-[9px] text-orange-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-orange-50/70 border border-orange-100">
                <div className="text-[10px] font-semibold text-orange-700">รออบ</div>
                <div className="text-xs font-bold text-orange-800 mt-0.5">{totalTanksCount - (activeRunning + doneTanksCount)}</div>
                <div className="text-[9px] text-orange-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-orange-50/70 border border-orange-100">
                <div className="text-[10px] font-semibold text-orange-700">รวมถัง</div>
                <div className="text-xs font-bold text-orange-800 mt-0.5">{totalTanksCount}</div>
                <div className="text-[9px] text-orange-600 font-medium">ถัง</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Cartoning & Sealing */}
        <Card className="border-2 border-slate-200 hover:border-emerald-400 bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">2. บรรจุลงกล่อง (Carton)</div>
                  <div className="text-[11px] text-slate-500">Box Packing & Tape Sealing</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                {doneTanksCount} เสร็จแล้ว
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-emerald-600">{totalCartonsProduced.toLocaleString()}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">ลังสะสมเสร็จสิ้น</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                Output
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${pofPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">ลังสะสม</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{totalCartonsProduced}</div>
                <div className="text-[9px] text-emerald-600 font-medium">ลัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">ถังเสร็จ</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{doneTanksCount}</div>
                <div className="text-[9px] text-emerald-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">อัตราสำเร็จ</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{pofPct}%</div>
                <div className="text-[9px] text-emerald-600 font-medium">Done</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: FG Warehouse Transfer */}
        <Card className="border-2 border-slate-200 hover:border-blue-400 bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">3. ส่งมอบคลังสินค้า (FG)</div>
                  <div className="text-[11px] text-slate-500">Warehouse Delivery Flow</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                พร้อมส่งมอบ
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-blue-600">{doneTanksCount}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">/ {totalTanksCount} ถังพร้อมเข้าคลัง</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                FG Ready
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${pofPct}%` }} className="bg-blue-500 h-full transition-all duration-500" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">พร้อมส่ง</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">{doneTanksCount}</div>
                <div className="text-[9px] text-blue-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">กำลังทำ</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">{activeRunning}</div>
                <div className="text-[9px] text-blue-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">สถานะ</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">Staging</div>
                <div className="text-[9px] text-blue-600 font-medium">Ready</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Cartoning Orders */}
        <Card className="border-2 border-slate-200 hover:border-[#D4AF37] bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#8B7355] flex items-center justify-center font-bold shadow-sm">
                  <Boxes className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">4. สรุปออเดอร์ลงลังรวม</div>
                  <div className="text-[11px] text-slate-500">Total POF Work Orders</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-[#F8F6F0] text-[#8B7355] border-[#D4AF37]/30 font-semibold">
                {tasks.length} งาน
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-[#4A4238]">{tasks.length}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">งานในคิวลงลัง</span>
              </div>
              <Badge className="bg-[#D4AF37]/20 text-[#8B7355] border-[#D4AF37]/30 text-[10px] font-bold">
                Orders
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: '100%' }} className="bg-[#D4AF37] h-full" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">งานทั้งหมด</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">{tasks.length}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">งาน</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">ถังทั้งหมด</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">{totalTanksCount}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">สถานะ</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">POF Unit</div>
                <div className="text-[9px] text-[#8B7355] font-medium">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            คิวงานห้องอุโมงค์ลงลัง
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            ประวัติการทำงานแบบต่อเนื่อง
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
      {viewMode === 'timeline' ? (
        <MasterPlanningTimeline
          initialDept="POF"
          lockDept={true}
          currentUser={currentUser || 'POF'}
          onPlanChanged={fetchPofTasks}
          hideHeaderKpi={true}
        />
      ) : viewMode === 'calendar' ? (
        <TaskCalendar 
          tasks={tasks} 
          onTaskClick={(task) => setSelectedTask(task)} 
          dateField="activity_date" 
        />
      ) : (
        <Card className="shadow-md overflow-hidden border-0 ring-1 ring-slate-200">
          <div className="p-4 bg-[#F8F6F0] border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">ตัวกรองวันที่ตามแผน:</span>
              <Input 
                type="date" 
                className="w-40 h-8 text-xs bg-white"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <Button variant="ghost" size="sm" onClick={() => setFilterDate('')} className="h-8 text-xs text-slate-500">
                  แสดงทั้งหมด
                </Button>
              )}
            </div>
            {hasActiveColFilters && (
              <Button variant="outline" size="sm" onClick={clearAllColFilters} className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> ล้างตัวกรองทุกคอลัมน์
              </Button>
            )}
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F6F0]">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>สินค้า / SKU</TableHead>
                    <TableHead className="whitespace-nowrap">LOT No.</TableHead>
                    <TableHead className="whitespace-nowrap">ถังที่</TableHead>
                    <TableHead>จำนวนถัง (รวม)</TableHead>
                    <TableHead>Bulk size (kg/ถัง)</TableHead>
                    <TableHead>STD Yield (ลัง)</TableHead>
                    <TableHead>Actual Yield (ลัง)</TableHead>
                    <TableHead>สรุปยอดสะสม</TableHead>
                    <TableHead>วันที่จัดคิว (แผน)</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                  {/* Column-Specific Search Filter Row */}
                  <TableRow className="bg-slate-50/90 border-t border-b border-slate-200">
                    <TableHead className="py-1 px-2 text-center">
                      {hasActiveColFilters ? (
                        <button
                          onClick={clearAllColFilters}
                          title="ล้างตัวกรองทุกคอลัมน์"
                          className="w-5 h-5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 inline-flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">กรอง</span>
                      )}
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[130px]">
                      <div className="relative">
                        <Input
                          placeholder="กรอง SKU..."
                          value={colFilterSku}
                          onChange={e => setColFilterSku(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterSku && (
                          <button onClick={() => setColFilterSku('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[100px]">
                      <div className="relative">
                        <Input
                          placeholder="กรอง LOT..."
                          value={colFilterLot}
                          onChange={e => setColFilterLot(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterLot && (
                          <button onClick={() => setColFilterLot('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[80px]">
                      <div className="relative">
                        <Input
                          placeholder="ถังที่..."
                          value={colFilterTank}
                          onChange={e => setColFilterTank(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterTank && (
                          <button onClick={() => setColFilterTank('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[80px]">
                      <div className="relative">
                        <Input
                          placeholder="จำนวน..."
                          value={colFilterTotalTanks}
                          onChange={e => setColFilterTotalTanks(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterTotalTanks && (
                          <button onClick={() => setColFilterTotalTanks('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[90px]">
                      <div className="relative">
                        <Input
                          placeholder="Bulk kg..."
                          value={colFilterBulkSize}
                          onChange={e => setColFilterBulkSize(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterBulkSize && (
                          <button onClick={() => setColFilterBulkSize('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[90px]">
                      <div className="relative">
                        <Input
                          placeholder="STD ลัง..."
                          value={colFilterStdCartons}
                          onChange={e => setColFilterStdCartons(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterStdCartons && (
                          <button onClick={() => setColFilterStdCartons('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[90px]">
                      <div className="relative">
                        <Input
                          placeholder="Actual ลัง..."
                          value={colFilterActualCartons}
                          onChange={e => setColFilterActualCartons(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterActualCartons && (
                          <button onClick={() => setColFilterActualCartons('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[100px]">
                      <div className="relative">
                        <Input
                          placeholder="สะสม..."
                          value={colFilterCumulative}
                          onChange={e => setColFilterCumulative(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterCumulative && (
                          <button onClick={() => setColFilterCumulative('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[110px]">
                      <div className="relative">
                        <Input
                          placeholder="dd/mm/yyyy..."
                          value={colFilterDate}
                          onChange={e => setColFilterDate(e.target.value)}
                          className="h-7 text-xs pr-5 bg-white border-slate-200"
                        />
                        {colFilterDate && (
                          <button onClick={() => setColFilterDate('')} className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="py-1 px-1.5 min-w-[120px]">
                      <Select value={colFilterStatus} onValueChange={(val) => setColFilterStatus(val || 'ALL')}>
                        <SelectTrigger className="h-7 text-xs bg-white border-slate-200">
                          <SelectValue placeholder="ทุกสถานะ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">ทุกสถานะ</SelectItem>
                          <SelectItem value="WAITING" className="text-xs">⏳ รอลงลัง</SelectItem>
                          <SelectItem value="IN_PROGRESS" className="text-xs">📦 กำลังอบฟิล์ม</SelectItem>
                          <SelectItem value="DONE" className="text-xs">✅ เสร็จแล้ว</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center h-32 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                        กำลังโหลดข้อมูล...
                      </TableCell>
                    </TableRow>
                  ) : filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center h-32 text-slate-500">
                        <div>ไม่พบคิวงานอบ POF{filterDate ? ' ในวันที่เลือก' : ''}{hasActiveColFilters ? ' ตามตัวกรองที่ระบุ' : ''}</div>
                        {hasActiveColFilters && (
                          <div className="mt-2">
                            <Button size="sm" variant="outline" onClick={clearAllColFilters} className="text-xs">
                              ล้างตัวกรองทั้งหมด
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => {
                      const kgPerTank = task.production_lots?.kg_per_tank || 0
                      const gPerPiece = task.production_lots?.g_per_piece || 1
                      const pcsPerCarton = task.production_lots?.pcs_per_carton || 1
                      const stdYieldPieces = Math.floor((kgPerTank * 1000) / gPerPiece)
                      const stdYieldCartons = Math.floor(stdYieldPieces / pcsPerCarton)
                      
                      let actualYieldCartons = 0
                      const details = task.tank_details || {}
                      Object.keys(details).forEach(k => {
                        if (!k.includes('_history') && details[k]?.cartons) {
                          actualYieldCartons += details[k].cartons
                        }
                      })

                      return (
                      <React.Fragment key={task.id}>
                        <TableRow 
                          className={`cursor-pointer hover:bg-orange-50/30 transition-colors ${expandedRow === task.id ? 'bg-orange-50/50' : ''}`}
                          onClick={() => toggleRow(task.id)}
                        >
                          <TableCell>
                            {expandedRow === task.id ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </TableCell>
                          <TableCell className="font-medium text-orange-700 max-w-[300px]">
                            <div className="truncate" title={task.production_lots?.products?.sku || ''}>{task.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-normal line-clamp-2 leading-snug" title={task.production_lots?.products?.product_name || ''}>{task.production_lots?.products?.product_name || ''}</div>
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">{task.production_lots?.lot_no || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{task.tank_start} - {task.tank_end}</TableCell>
                          <TableCell>{task.production_lots?.total_tanks || 0} ถัง</TableCell>
                          <TableCell>{kgPerTank > 0 ? `${kgPerTank} kg` : '-'}</TableCell>
                          <TableCell>{stdYieldCartons > 0 ? stdYieldCartons.toLocaleString() : '-'}</TableCell>
                          <TableCell className={actualYieldCartons > 0 ? "text-emerald-600 font-medium" : ""}>{actualYieldCartons > 0 ? actualYieldCartons.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-[#D4AF37] font-medium bg-[#D4AF37]/ whitespace-nowrap text-xs">
                            {(() => {
                              if (actualYieldCartons === 0) return '-';

                              let cumulativeCartons = 0;
                              const sameLotTasks = tasks.filter(t => t.production_lot_id === task.production_lot_id);
                              const targetEnd = parseInt(task.tank_end) || 0;
                              
                              for (let i = 1; i <= targetEnd; i++) {
                                const taskForTank = sameLotTasks.find(t => {
                                  if (i >= parseInt(t.tank_start) && i <= parseInt(t.tank_end)) {
                                    const d = typeof t.tank_details === 'object' && t.tank_details !== null ? (t.tank_details as any) : {};
                                    return d[i] && d[i].cartons !== undefined;
                                  }
                                  return false;
                                });
                                if (taskForTank) {
                                  const d = taskForTank.tank_details as any;
                                  cumulativeCartons += Number(d[i].cartons);
                                }
                              }
                              
                              const plannedQty = task.production_lots?.planned_quantity || task.production_lots?.order_quantity || 0;
                              const pcsPerCarton = task.production_lots?.pcs_per_carton || 1;
                              const totalCartons = plannedQty / pcsPerCarton;
                              const calcPieces = cumulativeCartons * pcsPerCarton;
                              
                              return `[ยอดสะสม (${cumulativeCartons.toLocaleString()} ลัง/${Math.ceil(totalCartons).toLocaleString()}ลัง) x${pcsPerCarton} ชิ้น = ${calcPieces.toLocaleString()} ชิ้น/ ${plannedQty.toLocaleString()} ชิ้น]`;
                            })()}
                          </TableCell>
                          <TableCell>
                            {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH') : '-'}
                          </TableCell>
                          <TableCell>
                            {(task.status === 'PLANNED' || !task.status) && <Badge variant="outline" className="bg-[#F8F6F0] text-slate-500 border-slate-200">รอลงลัง (แผน)</Badge>}
                            {task.status === 'WAITING' && <Badge variant="outline" className="bg-slate-100 text-slate-600">รอลงลัง</Badge>}
                            {task.status === 'IN_PROGRESS' && <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">กำลังอบฟิล์ม</Badge>}
                            {task.status === 'DONE' && <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">เสร็จแล้ว</Badge>}
                          </TableCell>
                        </TableRow>
                        {expandedRow === task.id && (
                          <TableRow className="bg-[#F8F6F0]/ hover:bg-[#F8F6F0]/">
                            <TableCell colSpan={11} className="p-0 border-b border-slate-200">
                              {renderTunnel(task)}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )})
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>
      )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap justify-between items-center gap-2 w-full">
                 <div className="flex items-center gap-2">
                   <span>ประวัติการทำงานแบบต่อเนื่อง</span>
                   <Badge variant="outline" className="font-mono text-xs text-slate-600 bg-slate-50">
                     {isHistoryFiltered ? `พบ ${filteredHistoryList.length} จาก ${historyList.length} รายการ` : `ทั้งหมด ${historyList.length} รายการ`}
                   </Badge>
                   {isHistoryFiltered && (
                     <Button 
                       onClick={clearHistoryFilters} 
                       variant="ghost" 
                       size="sm" 
                       className="h-7 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-50 gap-1 px-2"
                     >
                       <RotateCcw className="w-3 h-3" /> ล้างตัวกรอง
                     </Button>
                   )}
                 </div>
                 <Button onClick={exportToExcel} variant="outline" size="sm" className="text-emerald-700 border-emerald-500 hover:bg-emerald-50">
                    Export Excel
                 </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                  ไม่มีประวัติการทำงาน
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8F6F0] text-slate-700">
                      <tr>
                        <th className="px-3 py-2.5 font-medium text-xs">เวลา</th>
                        <th className="px-3 py-2.5 font-medium text-xs">ผู้ดำเนินการ</th>
                        <th className="px-3 py-2.5 font-medium text-xs">LOT No.</th>
                        <th className="px-3 py-2.5 font-medium text-xs">ชุดที่</th>
                        <th className="px-3 py-2.5 font-medium text-xs">สถานะ</th>
                      </tr>
                      {/* Column Search Filter Row */}
                      <tr className="bg-slate-50/90 border-t border-b border-slate-200">
                        <th className="p-1.5 min-w-[140px]">
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                            <Input
                              value={historyFilters.time}
                              onChange={e => setHistoryFilters(p => ({ ...p, time: e.target.value }))}
                              placeholder="ค้นหาเวลา/วันที่..."
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-orange-400"
                            />
                            {historyFilters.time && (
                              <button onClick={() => setHistoryFilters(p => ({ ...p, time: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                        <th className="p-1.5 min-w-[120px]">
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                            <Input
                              value={historyFilters.user}
                              onChange={e => setHistoryFilters(p => ({ ...p, user: e.target.value }))}
                              placeholder="ค้นหาผู้ทำ..."
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-orange-400"
                            />
                            {historyFilters.user && (
                              <button onClick={() => setHistoryFilters(p => ({ ...p, user: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                        <th className="p-1.5 min-w-[160px]">
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                            <Input
                              value={historyFilters.lot}
                              onChange={e => setHistoryFilters(p => ({ ...p, lot: e.target.value }))}
                              placeholder="ค้นหา LOT/SKU..."
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-orange-400"
                            />
                            {historyFilters.lot && (
                              <button onClick={() => setHistoryFilters(p => ({ ...p, lot: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                        <th className="p-1.5 min-w-[100px]">
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                            <Input
                              value={historyFilters.tank}
                              onChange={e => setHistoryFilters(p => ({ ...p, tank: e.target.value }))}
                              placeholder="เลขชุด..."
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-orange-400"
                            />
                            {historyFilters.tank && (
                              <button onClick={() => setHistoryFilters(p => ({ ...p, tank: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                        <th className="p-1.5 min-w-[120px]">
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                            <Input
                              value={historyFilters.status}
                              onChange={e => setHistoryFilters(p => ({ ...p, status: e.target.value }))}
                              placeholder="สถานะ..."
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-orange-400"
                            />
                            {historyFilters.status && (
                              <button onClick={() => setHistoryFilters(p => ({ ...p, status: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistoryList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      ) : (
                        filteredHistoryList.map((item, idx) => {
                          let statusColor = "bg-slate-100 text-slate-700"
                          if (item.action === 'DONE') statusColor = "bg-green-100 text-green-700"
                          if (item.action === 'IN_PROGRESS') statusColor = "bg-yellow-100 text-yellow-700"
                          if (item.action === 'MOVED') statusColor = "bg-sky-100 text-sky-700"
                          
                          const statusText = getPofStatusText(item.action)

                          return (
                            <tr key={`${item.taskId}-${item.tankNum}-${idx}`} className="hover:bg-[#F8F6F0]">
                              <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                                {new Date(item.timestamp).toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-xs">{item.user?.split('@')[0]}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-medium text-xs text-[#D4AF37]">
                                {item.lotNo} <span className="text-slate-400 font-normal text-xs ml-1">({item.sku})</span>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-xs">ชุดที่ {item.tankNum}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                                <Badge variant="secondary" className={statusColor}>
                                  {statusText}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for Calendar Task Detail */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl mb-4">
              <Package className="w-6 h-6 text-orange-500" />
              รายละเอียดงานห้องอุโมงค์ (POF)
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 border-t pt-4">
             {selectedTask && renderTunnel(selectedTask)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Qty Input */}
      <Dialog open={qtyDialog.open} onOpenChange={(open) => !open && setQtyDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ระบุยอดงาน FG (ลัง)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                ยอดงานที่แพ็คใส่ลังได้จริง สำหรับถังที่ {qtyDialog.tankNum}
                {qtyDialog.task && qtyDialog.maxCartons !== undefined && (
                  <span className="text-xs text-slate-500 block mt-1 font-normal">
                    (ใส่ได้สูงสุดไม่เกิน {qtyDialog.maxCartons} ลัง)
                  </span>
                )}
              </label>
              <Input 
                type="number" 
                placeholder="จำนวนลัง"
                value={qtyDialog.qty}
                min={1}
                max={qtyDialog.maxCartons}
                onChange={(e) => {
                  const max = qtyDialog.maxCartons || Infinity;
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > max) {
                    setQtyDialog(prev => ({ ...prev, qty: max.toString() }));
                  } else {
                    setQtyDialog(prev => ({ ...prev, qty: e.target.value }));
                  }
                }}
                className="text-lg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                กล่องพิมพ์ล็อตอะไร (Box Lot No.) <span className="text-red-500">*</span>
              </label>
              <Input 
                value={qtyDialog.boxLot}
                onChange={(e) => setQtyDialog(prev => ({ ...prev, boxLot: e.target.value }))}
                placeholder="เช่น Lot.009/26"
                className="text-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setQtyDialog(prev => ({ ...prev, open: false }))}>ยกเลิก</Button>
            <Button onClick={handleQtyConfirm} className="bg-orange-600 hover:bg-orange-700 text-white">ยืนยัน</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Batch Multi-Tank Cartoning Auto-Allocation */}
      <Dialog open={batchDialog.open} onOpenChange={(open) => !open && setBatchDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#4A4238]">
              <Boxes className="w-6 h-6 text-amber-500" />
              บันทึกรวบยอดลงลัง & ตัดถังอัตโนมัติ (Rolling Auto-Allocation)
            </DialogTitle>
          </DialogHeader>

          {batchDialog.task && (() => {
            const task = batchDialog.task
            const lotNo = task.production_lots?.lot_no || ''
            const sku = task.production_lots?.products?.sku || ''
            const pcsPerCarton = task.production_lots?.pcs_per_carton || 1
            const kgPerTank = task.production_lots?.kg_per_tank || 0
            const gPerPiece = task.production_lots?.g_per_piece || 1
            const stdYieldPieces = Math.round((kgPerTank * 1000) / gPerPiece)
            const stdCartonsPerTank = pcsPerCarton > 0 ? (stdYieldPieces / pcsPerCarton) : 14.5

            const startT = Number(batchDialog.startTank) || 1
            const totalC = parseInt(batchDialog.totalCartons) || 0
            const totalPieces = totalC * pcsPerCarton
            const maxTaskEnd = parseInt(task.tank_end) || (task.production_lots?.total_tanks || 200)

            // Compute continuous carton run number
            let cartonsBefore = 0
            const sameLotTasks = tasks.filter((x: any) => x.production_lot_id === task.production_lot_id)
            for (let i = 1; i < startT; i++) {
              const taskForTank = sameLotTasks.find((x: any) => {
                if (i >= parseInt(x.tank_start) && i <= parseInt(x.tank_end)) {
                  const d = typeof x.tank_details === 'object' && x.tank_details !== null ? (x.tank_details as any) : {}
                  return d[i] && d[i].cartons !== undefined
                }
                return false
              })
              if (taskForTank) {
                const d = taskForTank.tank_details as any
                cartonsBefore += Number(d[i].cartons) || 0
              }
            }

            // Rolling Capacity Allocation Simulation
            let remaining = totalC
            let currentT = startT
            let currentStart = cartonsBefore + 1
            const previewList = []

            while (remaining > 0 && currentT <= maxTaskEnd) {
              const tankCap = (stdCartonsPerTank % 1 !== 0) 
                ? ((currentT % 2 === 0) ? Math.ceil(stdCartonsPerTank) : Math.floor(stdCartonsPerTank))
                : Math.round(stdCartonsPerTank)

              const c = Math.min(remaining, tankCap)
              const sC = currentStart
              const eC = currentStart + c - 1
              currentStart = eC + 1
              remaining -= c

              previewList.push({
                tankNum: currentT,
                cartons: c,
                tankCap,
                isFull: c === tankCap,
                range: c > 0 ? `ลังที่ ${sC.toLocaleString()} - ${eC.toLocaleString()}` : '-'
              })

              currentT++
            }

            if (remaining > 0 && previewList.length > 0) {
              const lastP = previewList[previewList.length - 1]
              lastP.cartons += remaining
              lastP.range = `ลังที่ ${(cartonsBefore + totalC - lastP.cartons + 1).toLocaleString()} - ${(cartonsBefore + totalC).toLocaleString()}`
            }

            const autoEndTank = previewList.length > 0 ? previewList[previewList.length - 1].tankNum : startT
            const numTanksUsed = previewList.length

            return (
              <div className="py-2 space-y-4 text-xs">
                {/* Lot info banner */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex justify-between items-center">
                  <div>
                    <div className="font-extrabold text-amber-900 text-sm">
                      LOT {lotNo} ({sku})
                    </div>
                    <div className="text-[11px] text-amber-700">
                      {task.production_lots?.products?.product_name || 'งานลงลังต่อเนื่อง'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-amber-600 font-medium">Std Yield ต่อถัง</span>
                    <div className="font-bold text-amber-900">~{stdCartonsPerTank} ลัง/ถัง ({pcsPerCarton} ชิ้น/ลัง)</div>
                  </div>
                </div>

                {/* Range of tanks & Rolling auto stop */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">เริ่มตัดจากถังที่</label>
                    <Input
                      type="number"
                      value={batchDialog.startTank}
                      min={parseInt(task.tank_start) || 1}
                      max={maxTaskEnd}
                      onChange={(e) => setBatchDialog(prev => ({ ...prev, startTank: parseInt(e.target.value) || 1 }))}
                      className="font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>ถึงถังที่ (ระบบรันหยุดอัตโนมัติ)</span>
                    </label>
                    <div className="h-9 px-3 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-between font-extrabold text-slate-800 text-sm">
                      <span>ถังที่ {totalC > 0 ? autoEndTank : '-'}</span>
                      {totalC > 0 && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ตัด {numTanksUsed} ถัง
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total Cartons and Box Lot */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>ยอดลงลังจริงรวม (ลัง) <span className="text-red-500">*</span></span>
                      {totalC > 0 && <span className="text-[10px] text-amber-600 font-medium">({totalPieces.toLocaleString()} ชิ้น)</span>}
                    </label>
                    <Input
                      type="number"
                      placeholder="เช่น 24, 48 หรือ 100"
                      value={batchDialog.totalCartons}
                      onChange={(e) => setBatchDialog(prev => ({ ...prev, totalCartons: e.target.value }))}
                      className="font-black text-base text-[#D4AF37]"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      กล่องพิมพ์ล็อต (Box Lot No.) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={batchDialog.boxLot}
                      onChange={(e) => setBatchDialog(prev => ({ ...prev, boxLot: e.target.value }))}
                      placeholder="เช่น Lot.010/26"
                      className="font-bold text-sm"
                    />
                  </div>
                </div>

                {/* Live Preview Table of Rolling Auto Allocation */}
                {totalC > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center font-bold text-slate-700">
                      <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Rolling เติมเต็มถังตามความจุจริง (~{stdCartonsPerTank} ลัง/ถัง):
                      </span>
                      <span className="text-xs text-slate-600 font-bold">
                        รวม {totalC.toLocaleString()} ลัง
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                      {previewList.map((p) => (
                        <div key={p.tankNum} className="p-2.5 flex justify-between items-center text-xs hover:bg-emerald-50/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${p.isFull ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            <strong className="text-slate-800 font-bold">ถังที่ {p.tankNum}</strong>
                            <span className="text-slate-400 text-[10px]">({p.range})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.isFull ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'}`}>
                              {p.isFull ? `เต็มถัง (${p.cartons}/${p.tankCap})` : `เศษถัง (${p.cartons}/${p.tankCap})`}
                            </span>
                            <span className="font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md min-w-[50px] text-right">
                              {p.cartons} ลัง
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-dashed border-amber-200 text-amber-800 text-[11px] text-center">
                    💡 พนักงานใส่ยอดลงลังรวม (เช่น 24, 48 หรือ 100 ลัง) ระบบจะตัดเต็มถังและหยุดที่ถังสุดท้ายให้อัตโนมัติ
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setBatchDialog(prev => ({ ...prev, open: false }))}>
              ยกเลิก
            </Button>
            <Button onClick={handleBatchConfirm} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold">
              ยืนยันบันทึกรวบยอด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          {/* Defect Modal */}
      <Dialog open={isDefectModalOpen} onOpenChange={setIsDefectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกของเสียประจำวัน (Daily Defect Report)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">เลือก LOT งาน</label>
              <Select value={defectLotId} onValueChange={(val) => setDefectLotId(val || '')}>
                <SelectTrigger>
                  <span data-slot="select-value" className="flex flex-1 text-left line-clamp-1">
                    {defectLotId ? (() => {
                      const t = tasks.find(task => task.production_lots?.id === defectLotId);
                      return t ? `LOT ${t.production_lots?.lot_no} (${t.production_lots?.products?.sku})` : 'เลือก LOT';
                    })() : 'เลือก LOT'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {tasks.map(task => (
                    <SelectItem key={task.production_lots?.id} value={task.production_lots?.id || ''}>
                      LOT {task.production_lots?.lot_no} ({task.production_lots?.products?.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">จำนวนชิ้นที่เสีย</label>
              <Input 
                type="number" 
                placeholder="ระบุจำนวนชิ้น" 
                value={defectQuantity} 
                onChange={e => setDefectQuantity(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">สาเหตุ / หมายเหตุ</label>
              <Input 
                placeholder="เช่น ซีลแตก, ฟิล์มย่น" 
                value={defectNote} 
                onChange={e => setDefectNote(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDefectModalOpen(false)}>ยกเลิก</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDefectSubmit}>บันทึกข้อมูล</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
