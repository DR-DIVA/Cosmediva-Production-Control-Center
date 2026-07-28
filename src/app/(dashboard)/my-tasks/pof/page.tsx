'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, PackageOpen, ChevronDown, ChevronRight, Play, CheckCircle2, Clock, MapPin, Package, Wind, AlertTriangle, ArrowDownToLine, Boxes } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays, startOfDay } from 'date-fns'
import { TaskCalendar } from '@/components/ui/TaskCalendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle , DialogFooter} from '@/components/ui/dialog'
import { Calendar as CalendarIcon, List as ListIcon, User, History, ClipboardCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PofTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [filterDate, setFilterDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [todayHistory, setTodayHistory] = useState<any[]>([])
  const [qtyDialog, setQtyDialog] = useState<{open: boolean, taskId: string, tankNum: number, task: any, qty: string, boxLot: string, nextStatus: string, maxCartons?: number}>({open: false, taskId: '', tankNum: 0, task: null, qty: '', boxLot: '', nextStatus: ''})
  
    const [isDefectModalOpen, setIsDefectModalOpen] = useState(false)
  const [defectLotId, setDefectLotId] = useState('')
  const [defectQuantity, setDefectQuantity] = useState('')
  const [defectNote, setDefectNote] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchPofTasks()
    fetchRooms()
    fetchUser()
    fetchTodayHistory()
    const interval = setInterval(() => {
      fetchPofTasks()
      fetchTodayHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user.email?.split('@')[0] || 'Unknown User')
    }
  }

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_name')
    if (data) {
      const allowedRooms = ['POF 1', 'POF 2', 'PVC Shrink', 'เธฅเธเธฅเธฑเธเธญเธขเนเธฒเธเน€เธ”เธตเธขเธง', 'POF - เธญเธทเนเธเน']
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
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธฅเนเธกเน€เธซเธฅเธง')
      console.error(error)
    } else if (data) {
      const pofTasks = data.filter(t => 
        (t.processes as any)?.process_name?.toLowerCase().includes('pof') || 
        (t.processes as any)?.process_name?.toLowerCase().includes('เธญเธธเนเธกเธเธเน')
      )
      setAllTasks(data)
      setTasks(pofTasks)
      setSelectedTask((prev: any) => prev ? pofTasks.find(t => t.id === prev.id) || null : null)
    }
    setLoading(false)
  }

  const fetchTodayHistory = async () => {
    const today = new Date()
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
    
    const { data } = await supabase.from('production_logs')
      .select(`
        id, tank_details, updated_at,
        production_lots ( id, lot_no, kg_per_tank, g_per_piece, pcs_per_carton, products:sku_id (sku, product_name) ),
        processes ( id, process_name )
      `)
      .gte('updated_at', `${todayStr}T00:00:00.000Z`)
      .order('updated_at', { ascending: false })

    if (data) {
      const historyItems: any[] = []
      data.forEach(task => {
        const pName = Array.isArray(task.processes) ? task.processes[0]?.process_name : (task.processes as any)?.process_name
        if (!pName || (!pName.toLowerCase().includes('pof') && !pName.toLowerCase().includes('เธญเธธเนเธกเธเธเน'))) return
        
        const details = task.tank_details || {}
        Object.keys(details).forEach(key => {
          if (key.endsWith('_history')) {
            const tankNum = key.replace('_history', '')
            const histories = details[key] as any[]
            if (Array.isArray(histories)) {
              histories.forEach(h => {
                const hDate = new Date(h.timestamp)
                const hDateStr = new Date(hDate.getTime() - (hDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                if (hDateStr === todayStr) {
                  historyItems.push({
                    taskId: task.id,
                    lotNo: (task.production_lots as any)?.lot_no,
                    sku: (task.production_lots as any)?.products?.sku,
                    tankNum,
                    action: h.status,
                    user: h.user,
                    timestamp: h.timestamp
                  })
                }
              })
            }
          }
        })
      })
      
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setTodayHistory(historyItems)
    }
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
      toast.error('เธเธฃเธธเธ“เธฒเธฃเธฐเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธเธ–เนเธงเธ')
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
      toast.error('เธเธฑเธเธ—เธถเธเธเธญเธเน€เธชเธตเธขเนเธกเนเธชเธณเน€เธฃเนเธ')
    } else {
      toast.success('เธเธฑเธเธ—เธถเธเธเธญเธเน€เธชเธตเธขเธเธฃเธฐเธเธณเธงเธฑเธเธชเธณเน€เธฃเนเธ')
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
      toast.error('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐเนเธกเนเธชเธณเน€เธฃเนเธ')
    } else {
      toast.success('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐเน€เธฃเธตเธขเธเธฃเนเธญเธข')
      fetchPofTasks()
    }
  }

  const updateTaskRoom = async (taskId: string, roomId: string) => {
    const { error } = await supabase
      .from('production_logs')
      .update({ room_id: roomId })
      .eq('id', taskId)

    if (error) {
      toast.error('เธญเธฑเธเน€เธ”เธ•เธซเนเธญเธ/เธเธธเธ”เธเธเธดเธเธฑเธ•เธดเธเธฒเธเนเธกเนเธชเธณเน€เธฃเนเธ')
    } else {
      toast.success('เธญเธฑเธเน€เธ”เธ•เธซเนเธญเธเน€เธฃเธตเธขเธเธฃเนเธญเธข')
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
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธเนเนเธเธฃเธฒเธขเธเธฒเธฃเธ—เธตเนเน€เธชเธฃเนเธเธชเธดเนเธเนเธฅเนเธงเนเธ”เน')
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
        ((t.processes as any)?.process_name?.toLowerCase().includes('เธเธฃเธฃเธเธธ') || (t.processes as any)?.process_name?.toLowerCase().includes('packing'))
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
      toast.error('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธขเธญเธ”เธเธฒเธ FG (เธฅเธฑเธ) เธ—เธตเนเธ–เธนเธเธ•เนเธญเธ')
      return
    }
    if (!qtyDialog.boxLot || qtyDialog.boxLot.trim() === '') {
      toast.error('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเนเธญเธกเธนเธฅเธเธฅเนเธญเธเธเธดเธกเธเนเธฅเนเธญเธ• (เน€เธเนเธ Lot.009/26)')
      return
    }
    
    const task = qtyDialog.task;
    const currentTank = qtyDialog.tankNum;
    
    const maxCartons = qtyDialog.maxCartons || Infinity;
    if (maxCartons !== Infinity && qtyNum > maxCartons) {
      toast.error(`เธขเธญเธ”เธฅเธฑเธเธ—เธตเนเธฃเธฐเธเธธเน€เธเธดเธเธเธงเนเธฒเธขเธญเธ”เธชเธนเธเธชเธธเธ”เธเธญเธเธ–เธฑเธเธเธตเน (${maxCartons} เธฅเธฑเธ)`);
      return;
    }

    await executeTankUpdate(qtyDialog.taskId, qtyDialog.tankNum, qtyDialog.task, qtyDialog.nextStatus, qtyNum, qtyDialog.boxLot)
    setQtyDialog(prev => ({ ...prev, open: false }))
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
      toast.error('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐเธ–เธฑเธเนเธกเนเธชเธณเน€เธฃเนเธ')
    } else {
      toast.success(`เธญเธฑเธเน€เธ”เธ• POF เธ–เธฑเธเธ—เธตเน ${currentTank} เน€เธเนเธเธชเธ–เธฒเธเธฐ ${nextStatus}`)
      
      // --- AUTO HAND-OFF TO FG ---
      if (nextStatus === 'DONE') {
        const passedBoxLot = boxLot || details[currentTank]?.box_lot || ''
        const passedCartons = qty > 0 ? qty : (details[currentTank]?.cartons || 0)
        
        const { data: fgProcess } = await supabase.from('processes').select('id').or('process_name.ilike.%FG%,process_name.ilike.%เธเธฅเธฑเธ%').limit(1).single()
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
              เธชเธ–เธฒเธเธฐเธเธฒเธฃเธฅเธเธฅเธฑเธ เธเธดเธงเธเธตเน (เธ–เธฑเธเธ—เธตเน {start} เธ–เธถเธ {end}) เธเธฒเธเธ—เธฑเนเธเธซเธกเธ” {total} เธ–เธฑเธ
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">เธงเธฑเธเธ—เธตเนเธเธฑเธ”เธเธดเธง:</span>
                <span className="text-sm text-slate-800 font-medium">
                  {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">เธเธธเธ”เธฅเธเธฅเธฑเธ:</span>
                <Select value={task.room_id || ''} onValueChange={(val) => updateTaskRoom(task.id, val)}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-white">
                    <SelectValue placeholder="เธฃเธฐเธเธธเน€เธเธฃเธทเนเธญเธเธญเธ">
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
          
          <div className="flex gap-2">
            {(task.status === 'WAITING' || task.status === 'PLANNED' || !task.status) && (
              <Button size="sm" onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className="bg-orange-600 hover:bg-orange-700">
                <ArrowDownToLine className="w-4 h-4 mr-2" /> เน€เธฃเธดเนเธกเธฅเธเธฅเธฑเธ
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
               cartonRangeText = `เธฅเธฑเธเธ—เธตเน ${startCarton}-${endCarton}`;
            }

            const tooltipContent = history.length > 0 ? (
              <div className="space-y-1 min-w-[150px]">
                <div className="border-b border-slate-700 pb-1.5 mb-2">
                  <p className="font-semibold text-orange-300">เธเธฃเธฐเธงเธฑเธ•เธดเธ–เธฑเธ {t}</p>
                  <div className="text-[10px] text-slate-300 mt-1 flex flex-col gap-0.5">
                    <div className="flex justify-between"><span>Actual Yield:</span> <span className={actualCartons > 0 ? "text-emerald-400 font-medium" : ""}>{actualCartons > 0 ? actualCartons.toLocaleString() : '-'} เธฅเธฑเธ</span></div>
                    {cartonRangeText && <div className="text-emerald-400 mt-0.5 font-medium">{cartonRangeText}</div>}
                  </div>
                  {tankBoxLot && (
                    <div className="text-[10px] text-amber-300 mt-1 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded w-fit border border-amber-500/20">
                      ๐“ฆ {tankBoxLot}
                    </div>
                  )}
                </div>
                {history.map((h: any, i: number) => {
                  let statusText = ''
                  let badgeClass = 'bg-slate-700 text-slate-100 border-none'
                  if (h.status === 'IN_PROGRESS') {
                    statusText = 'เน€เธฃเธดเนเธกเธฅเธเธฅเธฑเธ'
                    badgeClass = 'bg-orange-500 text-white border-orange-600'
                  }
                  if (h.status === 'DONE') {
                    statusText = 'เธฅเธเธฅเธฑเธเน€เธชเธฃเนเธ'
                    badgeClass = 'bg-green-500 text-white border-green-600'
                  }
                  return (
                    <div key={i} className="flex flex-col mb-2 bg-slate-800 p-1.5 rounded">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${badgeClass}`}>{statusText}</Badge>
                        <span className="text-[10px] text-slate-300 shrink-0">{new Date(h.timestamp).toLocaleTimeString('th-TH')}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-slate-400">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="text-[10px] truncate max-w-[120px]">{h.user}</span>
                      </div>
                      {h.cartons && (
                        <div className="text-[10px] text-slate-300 mt-1 italic border-l-2 border-slate-600 pl-1">
                          เนเธ”เน {h.cartons.toLocaleString()} เธฅเธฑเธ
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
                      <span className="text-xs font-bold">เธ–เธฑเธ {t}</span>
                    </div>
                  </TooltipTrigger>
                  {tooltipContent && (
                    <TooltipContent>
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
            เน€เธฃเธดเนเธกเธฅเธเธฅเธฑเธเน€เธกเธทเนเธญ: {new Date(task.start_time).toLocaleString('th-TH')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Boxes className="w-8 h-8 text-yellow-400 shrink-0" />
            เธเธฒเธเธฅเธเธฅเธฑเธ (Cartoning/POF)
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>เธฃเธฒเธขเธเธฒเธฃเธเธฒเธเธฅเธเธฅเธฑเธ เธเธฃเธฐเธเธณเธงเธฑเธ</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Synchronize RM-MX-PK One Team
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-64">
            <Input 
              placeholder="เธเนเธเธซเธฒ SKU เธซเธฃเธทเธญ LOT..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="w-4 h-4 mr-2" /> เนเธเธเธ•เธฒเธฃเธฒเธ
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="w-4 h-4 mr-2" /> เธเธเธดเธ—เธดเธ
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            เธเธดเธงเธเธฒเธเธซเนเธญเธเธญเธธเนเธกเธเธเนเธฅเธเธฅเธฑเธ
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            เธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธ—เธณเธเธฒเธเธงเธฑเธเธเธตเน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
      {viewMode === 'calendar' ? (
        <TaskCalendar 
          tasks={tasks} 
          onTaskClick={(task) => setSelectedTask(task)} 
          dateField="activity_date" 
        />
      ) : (
        <Card className="shadow-md overflow-hidden border-0 ring-1 ring-slate-200">
          <div className="p-4 bg-[#F8F6F0] border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">เธ•เธฑเธงเธเธฃเธญเธเธงเธฑเธเธ—เธตเนเธ•เธฒเธกเนเธเธ:</span>
              <Input 
                type="date" 
                className="w-40 h-8 text-xs bg-white"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <Button variant="ghost" size="sm" onClick={() => setFilterDate('')} className="h-8 text-xs text-slate-500">
                  เนเธชเธ”เธเธ—เธฑเนเธเธซเธกเธ”
                </Button>
              )}
            </div>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F6F0]">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>เธชเธดเธเธเนเธฒ / SKU</TableHead>
                    <TableHead>LOT No.</TableHead>
                    <TableHead>เธ–เธฑเธเธ—เธตเน</TableHead>
                    <TableHead>เธเธณเธเธงเธเธ–เธฑเธ (เธฃเธงเธก)</TableHead>
                    <TableHead>Bulk size (kg/เธ–เธฑเธ)</TableHead>
                    <TableHead>STD Yield (เธฅเธฑเธ)</TableHead>
                    <TableHead>Actual Yield (เธฅเธฑเธ)</TableHead>
                    <TableHead>เธชเธฃเธธเธเธขเธญเธ”เธชเธฐเธชเธก</TableHead>
                    <TableHead>เธงเธฑเธเธ—เธตเนเธเธฑเธ”เธเธดเธง (เนเธเธ)</TableHead>
                    <TableHead>เธชเธ–เธฒเธเธฐ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center h-32 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                        เธเธณเธฅเธฑเธเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅ...
                      </TableCell>
                    </TableRow>
                  ) : tasks.filter(t => {
                    const passDate = !filterDate || t.activity_date === filterDate
                    const term = searchQuery.toLowerCase()
                    const sku = ((t.production_lots as any)?.products?.sku || '').toLowerCase()
                    const lotNo = ((t.production_lots as any)?.lot_no || '').toLowerCase()
                    const passSearch = sku.includes(term) || lotNo.includes(term)
                    return passDate && passSearch
                  }).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center h-32 text-slate-500">
                        เนเธกเนเธกเธตเธเธดเธงเธเธฒเธเธญเธ POF{filterDate ? 'เนเธเธงเธฑเธเธ—เธตเนเน€เธฅเธทเธญเธ' : ''}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tasks.filter(t => {
                      const passDate = !filterDate || t.activity_date === filterDate
                      const term = searchQuery.toLowerCase()
                      const sku = ((t.production_lots as any)?.products?.sku || '').toLowerCase()
                      const lotNo = ((t.production_lots as any)?.lot_no || '').toLowerCase()
                      const passSearch = sku.includes(term) || lotNo.includes(term)
                      return passDate && passSearch
                    }).map((task) => {
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
                          <TableCell className="font-medium text-orange-700">
                            {task.production_lots?.products?.sku || '-'}
                            <div className="text-xs text-slate-500 font-normal">{task.production_lots?.products?.product_name || ''}</div>
                          </TableCell>
                          <TableCell className="font-semibold">{task.production_lots?.lot_no || '-'}</TableCell>
                          <TableCell>{task.tank_start} - {task.tank_end}</TableCell>
                          <TableCell>{task.production_lots?.total_tanks || 0} เธ–เธฑเธ</TableCell>
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
                              
                              return `[เธขเธญเธ”เธชเธฐเธชเธก (${cumulativeCartons.toLocaleString()} เธฅเธฑเธ/${Math.ceil(totalCartons).toLocaleString()}เธฅเธฑเธ) x${pcsPerCarton} เธเธดเนเธ = ${calcPieces.toLocaleString()} เธเธดเนเธ/ ${plannedQty.toLocaleString()} เธเธดเนเธ]`;
                            })()}
                          </TableCell>
                          <TableCell>
                            {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH') : '-'}
                          </TableCell>
                          <TableCell>
                            {(task.status === 'PLANNED' || !task.status) && <Badge variant="outline" className="bg-[#F8F6F0] text-slate-500 border-slate-200">เธฃเธญเธฅเธเธฅเธฑเธ (เนเธเธ)</Badge>}
                            {task.status === 'WAITING' && <Badge variant="outline" className="bg-slate-100 text-slate-600">เธฃเธญเธฅเธเธฅเธฑเธ</Badge>}
                            {task.status === 'IN_PROGRESS' && <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">เธเธณเธฅเธฑเธเธญเธเธเธดเธฅเนเธก</Badge>}
                            {task.status === 'DONE' && <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">เน€เธชเธฃเนเธเนเธฅเนเธง</Badge>}
                          </TableCell>
                        </TableRow>
                        {expandedRow === task.id && (
                          <TableRow className="bg-[#F8F6F0]/ hover:bg-[#F8F6F0]/">
                            <TableCell colSpan={7} className="p-0 border-b border-slate-200">
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
            <CardHeader>
              <CardTitle>เธฃเธฒเธขเธเธฒเธฃเธ—เธตเนเธ”เธณเน€เธเธดเธเธเธฒเธฃเนเธฅเนเธงเธงเธฑเธเธเธตเน</CardTitle>
            </CardHeader>
            <CardContent>
              {todayHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                  เนเธกเนเธกเธตเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธ—เธณเธเธฒเธเธเธญเธเธงเธฑเธเธเธตเน
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8F6F0] text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">เน€เธงเธฅเธฒ</th>
                        <th className="px-4 py-3 font-medium">เธเธนเนเธ”เธณเน€เธเธดเธเธเธฒเธฃ</th>
                        <th className="px-4 py-3 font-medium">LOT No.</th>
                        <th className="px-4 py-3 font-medium">เธเธธเธ”เธ—เธตเน</th>
                        <th className="px-4 py-3 font-medium">เธชเธ–เธฒเธเธฐ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {todayHistory.map((item, idx) => {
                        let statusColor = "bg-slate-100 text-slate-700"
                        if (item.action === 'DONE') statusColor = "bg-green-100 text-green-700"
                        if (item.action === 'IN_PROGRESS') statusColor = "bg-yellow-100 text-yellow-700"
                        if (item.action === 'MOVED') statusColor = "bg-sky-100 text-sky-700"
                        
                        let statusText = item.action
                        if (item.action === 'DONE') statusText = 'เธฅเธเธฅเธฑเธเน€เธชเธฃเนเธ'
                        if (item.action === 'IN_PROGRESS') statusText = 'เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ'
                        if (item.action === 'MOVED') statusText = 'เนเธเน€เธเนเธฒเธเธฅเธฑเธ FG'

                        return (
                          <tr key={`${item.taskId}-${item.tankNum}-${idx}`} className="hover:bg-[#F8F6F0]">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(item.timestamp).toLocaleTimeString('th-TH')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.user}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-[#D4AF37]">
                              {item.lotNo} <span className="text-slate-400 font-normal text-xs ml-1">({item.sku})</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-semibold">เธเธธเธ”เธ—เธตเน {item.tankNum}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge variant="secondary" className={statusColor}>
                                {statusText}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
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
              เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธฒเธเธซเนเธญเธเธญเธธเนเธกเธเธเน (POF)
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
            <DialogTitle>เธฃเธฐเธเธธเธขเธญเธ”เธเธฒเธ FG (เธฅเธฑเธ)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                เธขเธญเธ”เธเธฒเธเธ—เธตเนเนเธเนเธเนเธชเนเธฅเธฑเธเนเธ”เนเธเธฃเธดเธ เธชเธณเธซเธฃเธฑเธเธ–เธฑเธเธ—เธตเน {qtyDialog.tankNum}
                {qtyDialog.task && qtyDialog.maxCartons !== undefined && (
                  <span className="text-xs text-slate-500 block mt-1 font-normal">
                    (เนเธชเนเนเธ”เนเธชเธนเธเธชเธธเธ”เนเธกเนเน€เธเธดเธ {qtyDialog.maxCartons} เธฅเธฑเธ)
                  </span>
                )}
              </label>
              <Input 
                type="number" 
                placeholder="เธเธณเธเธงเธเธฅเธฑเธ"
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
                เธเธฅเนเธญเธเธเธดเธกเธเนเธฅเนเธญเธ•เธญเธฐเนเธฃ (Box Lot No.) <span className="text-red-500">*</span>
              </label>
              <Input 
                value={qtyDialog.boxLot}
                onChange={(e) => setQtyDialog(prev => ({ ...prev, boxLot: e.target.value }))}
                placeholder="เน€เธเนเธ Lot.009/26"
                className="text-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setQtyDialog(prev => ({ ...prev, open: false }))}>เธขเธเน€เธฅเธดเธ</Button>
            <Button onClick={handleQtyConfirm} className="bg-orange-600 hover:bg-orange-700 text-white">เธขเธทเธเธขเธฑเธ</Button>
          </div>
        </DialogContent>
      </Dialog>
          {/* Defect Modal */}
      <Dialog open={isDefectModalOpen} onOpenChange={setIsDefectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เธเธฑเธเธ—เธถเธเธเธญเธเน€เธชเธตเธขเธเธฃเธฐเธเธณเธงเธฑเธ (Daily Defect Report)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">เน€เธฅเธทเธญเธ LOT เธเธฒเธ</label>
              <Select value={defectLotId} onValueChange={(val) => setDefectLotId(val || '')}>
                <SelectTrigger><SelectValue placeholder="เน€เธฅเธทเธญเธ LOT" /></SelectTrigger>
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
              <label className="text-sm font-medium">เธเธณเธเธงเธเธเธดเนเธเธ—เธตเนเน€เธชเธตเธข</label>
              <Input 
                type="number" 
                placeholder="เธฃเธฐเธเธธเธเธณเธเธงเธเธเธดเนเธ" 
                value={defectQuantity} 
                onChange={e => setDefectQuantity(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">เธชเธฒเน€เธซเธ•เธธ / เธซเธกเธฒเธขเน€เธซเธ•เธธ</label>
              <Input 
                placeholder="เน€เธเนเธ เธเธตเธฅเนเธ•เธ, เธเธดเธฅเนเธกเธขเนเธ" 
                value={defectNote} 
                onChange={e => setDefectNote(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDefectModalOpen(false)}>เธขเธเน€เธฅเธดเธ</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDefectSubmit}>เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
