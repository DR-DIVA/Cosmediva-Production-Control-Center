'use client'
// Force rebuild
import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Loader2, Pipette, Cylinder, SprayCan, Package as BoxIcon, Inbox, Mail, PillBottle, TestTube, ChevronDown, ChevronRight, Play, CheckCircle2, Clock, MapPin, Factory , PackageSearch, Box} from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { differenceInDays, startOfDay } from 'date-fns'
import { DefectPopup } from '@/components/production/DefectPopup'

const getPackagingIcon = (unit: string, className: string) => {
  switch (unit) {
    case 'ขวดดร้อป': return <Pipette className={className} />
    case 'ขวดปั๊ม': return <SprayCan className={className} />
    case 'ขวดน้ำตบ': return <PillBottle className={className} />
    case 'กระปุก': return <Cylinder className={className} />
    case 'หลอด': return <TestTube className={className} />
    case 'ซอง': return <Mail className={className} />
    case 'กล่อง': return <BoxIcon className={className} />
    default: return <BoxIcon className={className} />
  }
}
import { TaskCalendar } from '@/components/ui/TaskCalendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Calendar as CalendarIcon, List as ListIcon, User, History, ClipboardCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PackingTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [filterDate, setFilterDate] = useState<string>('')
  const [historyList, setHistoryList] = useState<any[]>([])

  const [allDefects, setAllDefects] = useState<any[]>([])
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false)
  const [defectLotId, setDefectLotId] = useState('')
  const [defectQuantity, setDefectQuantity] = useState('')
  const [defectNote, setDefectNote] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [qtyDialog, setQtyDialog] = useState<{ open: boolean, taskId: string, tankNum: number, task: any, qty: string, boxLot: string, nextStatus: string }>({ open: false, taskId: '', tankNum: 0, task: null, qty: '', boxLot: '', nextStatus: '' })

  
  const supabase = createClient()

  useEffect(() => {
    fetchPackingTasks()
    fetchRooms()
    fetchUser()
    fetchHistory()
    const interval = setInterval(() => {
      fetchPackingTasks()
      fetchHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user.email || 'Unknown User')
    }
  }

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_name')
    if (data) setRooms(data)
  }

  const fetchPackingTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('production_logs')
      .select(`
        id,
        status,
        note,
        tank_start,
        tank_end,
        tank_details,
        sub_step,
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
          unit,
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
      toast.error('โหลดข้อมูลล้มเหลว')
    } else if (data) {
      const packingTasks = data.filter(t => 
        (t.processes as any)?.process_name?.toLowerCase().includes('บรรจุ') || 
        (t.processes as any)?.process_name?.toLowerCase().includes('packing')
      )
      setTasks(packingTasks)
      setSelectedTask((prev: any) => prev ? packingTasks.find(t => t.id === prev.id) || null : null)
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
      data.forEach(task => {
        const pName = Array.isArray(task.processes) ? task.processes[0]?.process_name : (task.processes as any)?.process_name
        if (!pName || (!pName.toLowerCase().includes('บรรจุ') && !pName.toLowerCase().includes('packing'))) return
        
        const details = task.tank_details || {}
        Object.keys(details).forEach(key => {
          if (key.endsWith('_history')) {
            const tankNum = key.replace('_history', '')
            const histories = details[key] as any[]
            if (Array.isArray(histories)) {
              histories.forEach(h => {
                historyItems.push({
                  taskId: task.id,
                  lotNo: (task.production_lots as any)?.lot_no,
                  sku: (task.production_lots as any)?.products?.sku,
                  tankNum,
                  action: h.status,
                  user: h.user,
                  timestamp: h.timestamp,
                  qty: h.pieces
                })
              })
            }
          }
        })
      })
      
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setHistoryList(historyItems)

      // Fetch Defects for alert
      const { data: defects } = await supabase
        .from('production_logs')
        .select('*')
        .eq('status', 'DEFECT')
        .gte('activity_date', startOfDay(new Date()).toISOString())
      
      if (defects) setAllDefects(defects)
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
    if (!defectLotId || !defectQuantity) return toast.error('กรุณาระบุข้อมูลให้ครบถ้วน')
    await supabase.from('production_logs').insert({
      status: 'DEFECT',
      process_id: '0d1355cc-f3e2-40c0-b54f-ac0b550e544d',
      production_lot_id: defectLotId,
      piece_quantity: parseInt(defectQuantity),
      note: defectNote,
      activity_date: new Date().toISOString().split('T')[0]
    })
    toast.success('บันทึกของเสียประจำวันสำเร็จ')
    setIsDefectModalOpen(false)
    setDefectQuantity('')
    setDefectNote('')
    fetchPackingTasks()
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
      fetchPackingTasks()
    }
  }

  const updateTaskRoom = async (taskId: string, roomId: string) => {
    const { error } = await supabase
      .from('production_logs')
      .update({ room_id: roomId })
      .eq('id', taskId)

    if (error) {
      toast.error('อัปเดตห้องบรรจุไม่สำเร็จ')
    } else {
      toast.success('อัปเดตห้องบรรจุเรียบร้อย')
      fetchPackingTasks()
    }
  }

  const updateTankProgress = async (taskId: string, currentTank: number, task: any) => {
    let details = typeof task.tank_details === 'object' && task.tank_details !== null ? { ...task.tank_details } : {}
    
    const currentStatus = details[currentTank]?.status || details[currentTank] || 'WAITING'
    let nextStatus = 'IN_PROGRESS'
    let actionText = 'เริ่มบรรจุ'
    if (currentStatus === 'IN_PROGRESS') { nextStatus = 'DONE'; actionText = 'บรรจุเสร็จ'; }
    else if (currentStatus === 'DONE') { nextStatus = 'SENT_TO_POF'; actionText = 'ส่งไปห้องลงลัง (POF)'; }
    else if (currentStatus === 'SENT_TO_POF') {
      toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
      return
    }

    if (nextStatus !== 'DONE') {
      if (!window.confirm(`ยืนยันการเปลี่ยนสถานะถังที่ ${currentTank} เป็น "${actionText}" ใช่หรือไม่?`)) return;
    }

    if (nextStatus === 'DONE') {
      setQtyDialog({ open: true, taskId, tankNum: currentTank, task, qty: '', boxLot: '', nextStatus })
      return
    }

    await executeTankUpdate(taskId, currentTank, task, nextStatus, 0, '')
  }

  const handleQtyConfirm = async () => {
    if (!qtyDialog.qty || isNaN(Number(qtyDialog.qty))) {
      toast.error('กรุณาระบุจำนวนชิ้นที่ถูกต้อง')
      return
    }
    if (!qtyDialog.boxLot || qtyDialog.boxLot.trim() === '') {
      toast.error('กรุณาระบุข้อมูลกล่องพิมพ์ล็อต (เช่น Lot.009/26)')
      return
    }
    await executeTankUpdate(qtyDialog.taskId, qtyDialog.tankNum, qtyDialog.task, qtyDialog.nextStatus, Number(qtyDialog.qty), qtyDialog.boxLot)
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
      if (qty > 0) details[currentTank].pieces = qty
      if (boxLot) details[currentTank].box_lot = boxLot

      const history = details[`${currentTank}_history`] || []
      details[`${currentTank}_history`] = [
        ...history,
        { status: nextStatus, timestamp: new Date().toISOString(), user: currentUser, pieces: qty > 0 ? qty : undefined, box_lot: boxLot || undefined }
      ]
    }

    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    const validEnd = Math.max(start, end)
    
    let allDone = true
    for (let i = start; i <= validEnd; i++) {
      const s = details[i]?.status || details[i] || 'WAITING'
      if (s !== 'DONE' && s !== 'SENT_TO_POF') {
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
      toast.success(`อัปเดตบรรจุถังที่ ${currentTank} เป็นสถานะ ${nextStatus}`)
      
      // --- AUTO HAND-OFF TO POF ---
      if (nextStatus === 'SENT_TO_POF') {
        const passedBoxLot = details[currentTank]?.box_lot || ''
        const { data: pofProcess } = await supabase.from('processes').select('id').like('process_name', '%POF%').limit(1).single()
        if (pofProcess) {
          const { data: existingPOFLog } = await supabase.from('production_logs')
            .select('id, tank_details')
            .eq('production_lot_id', task.production_lot_id)
            .eq('process_id', pofProcess.id)
            .eq('tank_start', task.tank_start)
            .eq('tank_end', task.tank_end)
            .maybeSingle()
            
          if (existingPOFLog) {
            const pofDetails = typeof existingPOFLog.tank_details === 'object' && existingPOFLog.tank_details !== null 
              ? { ...existingPOFLog.tank_details } 
              : {}
            
            const currentPOFState = pofDetails[currentTank]?.status || pofDetails[currentTank]
            if (!currentPOFState || currentPOFState === 'LOCKED') {
               pofDetails[currentTank] = { status: 'WAITING', box_lot: passedBoxLot }
               await supabase.from('production_logs').update({ tank_details: pofDetails }).eq('id', existingPOFLog.id)
            }
          } else {
            const start = parseInt(task.tank_start) || 1
            const end = parseInt(task.tank_end) || 1
            const initialPOFDetails: any = {}
            for(let i=start; i<=end; i++) {
               initialPOFDetails[i] = (i === currentTank) ? { status: 'WAITING', box_lot: passedBoxLot } : 'LOCKED'
            }
            await supabase.from('production_logs').insert({
              production_lot_id: task.production_lot_id,
              process_id: pofProcess.id,
              status: 'WAITING',
              activity_date: new Date().toISOString().split('T')[0],
              tank_start: task.tank_start,
              tank_end: task.tank_end,
              total_tanks: task.production_lots?.total_tanks || null,
              tank_details: initialPOFDetails
            })
          }
        }
      }
      // -------------------------------
      
      fetchPackingTasks()
    }
  }

  const renderPackingMachine = (task: any) => {
    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    const validEnd = Math.max(start, end)
    const limit = Math.min(validEnd - start + 1, 200)
    
    const tanks = Array.from({ length: limit }).map((_, i) => start + i)
    const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {}

    return (
      <div className="p-6 bg-[#F8F6F0] border-b shadow-inner">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
              {getPackagingIcon(task.production_lots?.unit || '', "w-5 h-5 text-emerald-500")}
              สถานะการบรรจุคิวนี้ (ถังที่ {start} ถึง {end}) จากทั้งหมด {total} ถัง
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">วันที่จัดคิว:</span>
                <span className="text-sm text-slate-800 font-medium">
                  {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">ห้องบรรจุ:</span>
                <Select value={task.room_id || ''} onValueChange={(val) => updateTaskRoom(task.id, val)}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-white">
                    <SelectValue placeholder="ระบุห้อง">
                      {task.room_id === '0e02e3bb-d671-44af-a98d-80eef07f0404' ? 'ห้องบรรจุ 1 (206)' :
                       task.room_id === 'dc0452d0-622f-4bbe-8252-605092e82fb5' ? 'ห้องบรรจุ 2 (207)' :
                       task.room_id === 'bb6ac4e7-3afc-4f7a-ac5f-43d173622c4b' ? 'ห้องบรรจุ 3 (208)' :
                       task.room_id === 'c9de40cd-8197-427c-9bd8-c22f3b583f1f' ? 'ห้องบรรจุ 4 (222)' :
                       task.room_id === 'c6bb08f8-a7ef-42ab-b470-6d44cf6b1331' ? 'ห้องบรรจุ 5 (210)' :
                       task.room_id === 'f88cd766-090b-40a8-8eab-b02c35e72bd3' ? 'ห้องบรรจุ อื่นๆ' : ''}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0e02e3bb-d671-44af-a98d-80eef07f0404">ห้องบรรจุ 1 (206)</SelectItem>
                    <SelectItem value="dc0452d0-622f-4bbe-8252-605092e82fb5">ห้องบรรจุ 2 (207)</SelectItem>
                    <SelectItem value="bb6ac4e7-3afc-4f7a-ac5f-43d173622c4b">ห้องบรรจุ 3 (208)</SelectItem>
                    <SelectItem value="c9de40cd-8197-427c-9bd8-c22f3b583f1f">ห้องบรรจุ 4 (222)</SelectItem>
                    <SelectItem value="c6bb08f8-a7ef-42ab-b470-6d44cf6b1331">ห้องบรรจุ 5 (210)</SelectItem>
                    <SelectItem value="f88cd766-090b-40a8-8eab-b02c35e72bd3">ห้องบรรจุ อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
          
          <div className="flex gap-2">
            {(task.status === 'WAITING' || task.status === 'PLANNED' || !task.status) && (
              <Button size="sm" onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className="bg-emerald-600 hover:bg-emerald-700">
                <Play className="w-4 h-4 mr-2" /> เริ่มบรรจุ
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
            } else if (tankStatus === 'SENT_TO_POF') {
              color = "text-teal-500 bg-teal-50 border-teal-300 shadow-sm"
            } else if (tankStatus === 'DONE' || task.status === 'DONE') {
              color = "text-purple-500 bg-purple-50 border-purple-300 shadow-sm"
            } else if (tankStatus === 'IN_PROGRESS') {
              color = "text-[#D4AF37] bg-[#D4AF37]/ border-[#D4AF37]/30 shadow-sm"
              animate = "animate-pulse"
            } else if (task.status === 'IN_PROGRESS') {
               color = "text-slate-400 bg-[#F8F6F0] border-slate-200 cursor-pointer hover:bg-slate-100"
            }
            
            const isClickable = (task.status === 'IN_PROGRESS' || task.status === 'DONE') && tankStatus !== 'LOCKED' && tankStatus !== 'SENT_TO_POF'

            const stdYield = task.production_lots?.kg_per_tank && task.production_lots?.g_per_piece 
              ? Math.round((task.production_lots.kg_per_tank * 1000) / task.production_lots.g_per_piece) 
              : 0;
            const actualYield = details[t]?.pieces || 0;

            const history = details[`${t}_history`] || []
            const tooltipContent = history.length > 0 ? (
              <div className="space-y-1 min-w-[160px]">
                <div className="border-b border-slate-700 pb-1.5 mb-2">
                  <p className="font-semibold text-[#4A4238]/">ประวัติถัง {t}</p>
                  <div className="text-[10px] text-slate-300 mt-1 flex flex-col gap-0.5">
                    <div className="flex justify-between"><span>STD Yield:</span> <span>{stdYield > 0 ? stdYield.toLocaleString() : '-'} ชิ้น</span></div>
                    <div className="flex justify-between"><span>Actual Yield:</span> <span className={actualYield > 0 ? "text-emerald-400 font-medium" : ""}>{actualYield > 0 ? actualYield.toLocaleString() : '-'} ชิ้น</span></div>
                  </div>
                </div>
                {history.map((h: any, i: number) => {
                  let statusText = h.status
                  let badgeColor = 'bg-slate-700 text-slate-100'
                  if (h.status === 'IN_PROGRESS') { statusText = 'กำลังบรรจุ'; badgeColor = 'bg-[#D4AF37] text-white' }
                  if (h.status === 'DONE') { statusText = 'บรรจุเสร็จ'; badgeColor = 'bg-purple-500 text-white' }
                  if (h.status === 'SENT_TO_POF') { statusText = 'ส่ง POF'; badgeColor = 'bg-teal-500 text-white' }
                  return (
                    <div key={i} className="flex flex-col mb-2 bg-slate-800 p-1.5 rounded">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-[10px] border-none px-1 py-0 ${badgeColor}`}>{statusText}</Badge>
                        <span className="text-[10px] text-slate-300 shrink-0">{new Date(h.timestamp).toLocaleTimeString('th-TH')}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-slate-400">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="text-[10px] truncate max-w-[120px]">{h.user?.split('@')[0]}</span>
                      </div>
                      {h.note && (
                        <div className="text-[10px] text-slate-300 mt-1 italic border-l-2 border-slate-600 pl-1">
                          {h.note}
                        </div>
                      )}
                      {h.box_lot && (
                        <div className="text-[10px] text-amber-300 mt-1 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded w-fit border border-amber-500/20">
                          📦 {h.box_lot}
                        </div>
                      )}
                    
      

</div>
                  )
                })}
              </div>
            ) : null

            const handleMachineClick = () => {
              if (!isClickable) return

              updateTankProgress(task.id, t, task)
            }

            return (
              <TooltipProvider key={t}>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      onClick={handleMachineClick}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 ${color} transition-all ${isClickable ? 'cursor-pointer hover:scale-105' : ''}`}
                    >
                      {getPackagingIcon(task.production_lots?.unit || '', `w-8 h-8 mb-2 ${animate}`)}
                      <span className="text-xs font-bold">ถัง {t}</span>
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
        <div className={`mt-8 flex items-center justify-center p-8 border-2 border-dashed rounded-xl overflow-hidden relative ${task.status === 'DONE' ? 'border-green-300 bg-green-50/80' : 'border-pink-200 bg-pink-50/50'}`}>
           <div className={`flex items-center gap-8 ${task.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}`}>
              <Cylinder className={`w-10 h-10 ${task.status === 'DONE' ? 'text-green-400' : 'text-pink-300'}`} />
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-pink-200'}`} />
              <div className={`w-32 h-20 rounded-lg shadow-inner flex items-center justify-center relative ${task.status === 'DONE' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-pink-400 to-rose-500'}`}>
                 <PackageSearch className="w-8 h-8 text-white/50 absolute top-2 right-2 animate-bounce" />
                 <span className="text-white font-bold tracking-widest text-sm">PACKING</span>
              </div>
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-pink-200'}`} />
              <BoxIcon className={`w-10 h-10 drop-shadow-md ${task.status === 'DONE' ? 'text-green-600' : 'text-pink-600'}`} />
           </div>
        </div>
        
        {task.start_time && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" /> 
            เริ่มเมื่อ: {new Date(task.start_time).toLocaleString('th-TH')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Box className="w-8 h-8 text-yellow-400" />
            งานบรรจุ (Packing)
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>รายการงานบรรจุสินค้าประจำวัน</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Synchronize RM-MX-PK One Team
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-64">
            <Input 
              placeholder="ค้นหา SKU หรือ LOT..." 
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
              <ListIcon className="w-4 h-4 mr-2" /> แบบตาราง
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="w-4 h-4 mr-2" /> ปฏิทิน
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            คิวงานบรรจุ
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            ประวัติการทำงานแบบต่อเนื่อง
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
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F6F0]">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>สินค้า / SKU</TableHead>
                    <TableHead>LOT No.</TableHead>
                    <TableHead>ถังที่ (ตามแผน)</TableHead>
                    <TableHead>จำนวนถัง (รวม)</TableHead>
                    <TableHead>Bulk size (kg/ถัง)</TableHead>
                    <TableHead>STD Yield (ชิ้น/ถัง)</TableHead>
                    <TableHead>Actual Yield (ชิ้น)</TableHead>
                    <TableHead>ยอดสะสม (ชิ้น)</TableHead>
                    <TableHead>ยอดสะสม (ลัง)</TableHead>
                    <TableHead>วันที่จัดคิว (แผน)</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center h-32 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                        กำลังโหลดข้อมูล...
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
                      <TableCell colSpan={12} className="text-center h-32 text-slate-500">
                        ไม่มีคิวงานบรรจุ{filterDate ? 'ในวันที่เลือก' : ''}
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
                    }).map((task) => (
                      <React.Fragment key={task.id}>
                        <TableRow 
                          className={`cursor-pointer hover:bg-[#F8F6F0]/ transition-colors ${expandedRow === task.id ? 'bg-[#F8F6F0]/' : ''}`}
                          onClick={() => toggleRow(task.id)}
                        >
                          <TableCell>
                            {expandedRow === task.id ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </TableCell>
                          <TableCell className="font-medium text-emerald-700 whitespace-normal min-w-[250px] max-w-[350px] break-words">
                            <div className="break-words">{task.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-normal break-words">{task.production_lots?.products?.product_name || ''}</div>
                          </TableCell>
                          <TableCell className="font-semibold">{task.production_lots?.lot_no || '-'}</TableCell>
                          <TableCell>{task.tank_start || '-'} - {task.tank_end || '-'}</TableCell>
                          <TableCell>{task.production_lots?.total_tanks || 0} ถัง</TableCell>
                          <TableCell>{task.production_lots?.kg_per_tank || 0} kg</TableCell>
                          <TableCell>
                            {task.production_lots?.kg_per_tank && task.production_lots?.g_per_piece 
                              ? Math.round((task.production_lots.kg_per_tank * 1000) / task.production_lots.g_per_piece).toLocaleString() 
                              : 0} ชิ้น
                          </TableCell>
                          <TableCell className="text-emerald-600 font-medium">
                            {(() => {
                              const details = typeof task.tank_details === 'string' ? JSON.parse(task.tank_details) : (typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {});
                              let total = 0;
                              for (const key in details) {
                                if (key.endsWith('_history')) continue;
                                if (details[key]?.pieces) total += Number(details[key].pieces);
                              }
                              return total > 0 ? total.toLocaleString() + ' ชิ้น' : '-';
                            })()}
                          </TableCell>
                          <TableCell className="text-[#D4AF37] font-bold bg-[#D4AF37]/">
                            {(() => {
                              const dCurrent = typeof task.tank_details === 'string' ? JSON.parse(task.tank_details) : (typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {});
                              let currentTotal = 0;
                              for (const key in dCurrent) {
                                if (key.endsWith('_history')) continue;
                                if (dCurrent[key]?.pieces) currentTotal += Number(dCurrent[key].pieces);
                              }
                              if (currentTotal === 0) return '-';

                              let cumulativePieces = 0;
                              const sameLotTasks = tasks.filter(t => t.production_lot_id === task.production_lot_id);
                              const targetEnd = parseInt(task.tank_end) || 0;
                              for (let i = 1; i <= targetEnd; i++) {
                                const taskForTank = sameLotTasks.find(t => {
                                  if (i >= parseInt(t.tank_start) && i <= parseInt(t.tank_end)) {
                                    const d = typeof t.tank_details === 'string' ? JSON.parse(t.tank_details) : (typeof t.tank_details === 'object' && t.tank_details !== null ? t.tank_details : {});
                                    return d[i] && d[i].pieces !== undefined;
                                  }
                                  return false;
                                });
                                if (taskForTank) {
                                  const d = typeof taskForTank.tank_details === 'string' ? JSON.parse(taskForTank.tank_details) : (taskForTank.tank_details as any);
                                  cumulativePieces += Number(d[i].pieces);
                                }
                              }
                              return cumulativePieces > 0 ? cumulativePieces.toLocaleString() + ' ชิ้น' : '-';
                            })()}
                          </TableCell>
                          <TableCell className="text-indigo-600 font-bold bg-indigo-50/50">
                            {(() => {
                              const dCurrent = typeof task.tank_details === 'string' ? JSON.parse(task.tank_details) : (typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {});
                              let currentTotal = 0;
                              for (const key in dCurrent) {
                                if (key.endsWith('_history')) continue;
                                if (dCurrent[key]?.pieces) currentTotal += Number(dCurrent[key].pieces);
                              }
                              if (currentTotal === 0) return '-';

                              let cumulativePieces = 0;
                              const sameLotTasks = tasks.filter(t => t.production_lot_id === task.production_lot_id);
                              const targetEnd = parseInt(task.tank_end) || 0;
                              for (let i = 1; i <= targetEnd; i++) {
                                const taskForTank = sameLotTasks.find(t => {
                                  if (i >= parseInt(t.tank_start) && i <= parseInt(t.tank_end)) {
                                    const d = typeof t.tank_details === 'string' ? JSON.parse(t.tank_details) : (typeof t.tank_details === 'object' && t.tank_details !== null ? t.tank_details : {});
                                    return d[i] && d[i].pieces !== undefined;
                                  }
                                  return false;
                                });
                                if (taskForTank) {
                                  const d = typeof taskForTank.tank_details === 'string' ? JSON.parse(taskForTank.tank_details) : (taskForTank.tank_details as any);
                                  cumulativePieces += Number(d[i].pieces);
                                }
                              }
                              const pcsPerCarton = task.production_lots?.pcs_per_carton || 1;
                              const cartons = Math.floor(cumulativePieces / pcsPerCarton);
                              return cumulativePieces > 0 ? cartons.toLocaleString() + ' ลัง' : '-';
                            })()}
                          </TableCell>
                          <TableCell>
                          {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH') : '-'}
                        </TableCell>
                        <TableCell>
                          {task.status === 'DONE' ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">บรรจุเสร็จสิ้น</Badge>
                          ) : task.status === 'IN_PROGRESS' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">กำลังบรรจุ</Badge>
                          ) : (
                            <>
                              {(task.status === 'PLANNED' || !task.status) && <Badge variant="outline" className="bg-[#F8F6F0] text-slate-500 border-slate-200">รอบรรจุ (แผน)</Badge>}
                              {task.status === 'WAITING' && <Badge variant="outline" className="bg-slate-100 text-slate-600">รอบรรจุ</Badge>}
                            </>
                          )}
                          </TableCell>
                        </TableRow>
                        {expandedRow === task.id && (
                          <TableRow className="bg-[#F8F6F0]/ hover:bg-[#F8F6F0]/">
                            <TableCell colSpan={12} className="p-0 border-b border-slate-200">
                              {renderPackingMachine(task)}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
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
              <CardTitle>ประวัติการทำงานแบบต่อเนื่อง</CardTitle>
            </CardHeader>
            <CardContent>
              {historyList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                  ไม่มีประวัติการทำงาน
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8F6F0] text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">เวลา</th>
                        <th className="px-4 py-3 font-medium">ผู้ดำเนินการ</th>
                        <th className="px-4 py-3 font-medium">LOT No.</th>
                        <th className="px-4 py-3 font-medium">ถังที่</th>
                        <th className="px-4 py-3 font-medium">สถานะ</th>
                        <th className="px-4 py-3 font-medium text-right">ยอดที่ได้ (ชิ้น)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyList.map((item, idx) => {
                        let statusColor = "bg-slate-100 text-slate-700"
                        if (item.action === 'DONE') statusColor = "bg-green-100 text-green-700"
                        if (item.action === 'IN_PROGRESS') statusColor = "bg-yellow-100 text-yellow-700"
                        if (item.action === 'SENT_TO_POF' || item.action === 'SENT_TO_BOX') statusColor = "bg-sky-100 text-sky-700"
                        
                        let statusText = item.action
                        if (item.action === 'DONE') statusText = 'บรรจุเสร็จ'
                        if (item.action === 'IN_PROGRESS') statusText = 'กำลังบรรจุ'
                        if (item.action === 'SENT_TO_POF') statusText = 'ไปห้อง POF'
                        if (item.action === 'SENT_TO_BOX') statusText = 'ไปลงลัง'

                        return (
                          <tr key={`${item.taskId}-${item.tankNum}-${idx}`} className="hover:bg-[#F8F6F0]">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(item.timestamp).toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.user?.split('@')[0]}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-[#D4AF37]">
                              {item.lotNo} <span className="text-slate-400 font-normal text-xs ml-1">({item.sku})</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-semibold">ถังที่ {item.tankNum}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge variant="secondary" className={statusColor}>
                                {statusText}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                              {item.qty ? Number(item.qty).toLocaleString() : '-'}
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
              {getPackagingIcon(selectedTask?.production_lots?.unit || '', "w-6 h-6 text-green-500")}
              รายละเอียดงานบรรจุ
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 border-t pt-4">
             {selectedTask && renderPackingMachine(selectedTask)}
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog for Inputting Pieces */}
      <Dialog open={qtyDialog.open} onOpenChange={(open) => !open && setQtyDialog(prev => ({...prev, open: false}))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ระบุยอดบรรจุที่ได้จากถัง {qtyDialog.tankNum}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Actual Yield (ชิ้น/ถัง)</Label>
                <Input 
                  type="number" 
                  value={qtyDialog.qty} 
                  onChange={e => setQtyDialog(prev => ({...prev, qty: e.target.value}))} 
                  placeholder="เช่น 1500" 
                  autoFocus
                />
            </div>
            <div className="space-y-2">
              <Label>กล่องพิมพ์ล็อตอะไร (Box Lot No.) <span className="text-red-500">*</span></Label>
                <Input 
                  value={qtyDialog.boxLot} 
                  onChange={e => setQtyDialog(prev => ({...prev, boxLot: e.target.value}))} 
                  placeholder="เช่น Lot.009/26" 
                />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setQtyDialog(prev => ({...prev, open: false}))}>ยกเลิก</Button>
              <Button onClick={handleQtyConfirm} className="bg-emerald-600 hover:bg-emerald-700">บันทึกยอด</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
