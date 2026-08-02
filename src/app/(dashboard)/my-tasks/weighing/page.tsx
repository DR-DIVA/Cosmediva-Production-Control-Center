'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ShoppingBasket, ChevronDown, ChevronRight, Play, CheckCircle2, Clock , Box, Scale} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { TaskCalendar } from '@/components/ui/TaskCalendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar as CalendarIcon, List as ListIcon, User, History, ClipboardCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays, startOfDay } from 'date-fns'
import { DefectPopup } from '@/components/production/DefectPopup'

export default function WeighingTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [filterDate, setFilterDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [historyList, setHistoryList] = useState<any[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    fetchWeighingTasks()
    fetchUser()
    fetchHistory()
    const interval = setInterval(() => {
      fetchWeighingTasks()
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

  const fetchWeighingTasks = async () => {
    setLoading(true)
    // Fetch production logs that belong to weighing processes
    const { data, error } = await supabase.from('production_logs')
      .select(`
        id,
        production_lot_id,
        status,
        note,
        tank_start,
        tank_end,
        tank_details,
        sub_step,
        start_time,
        activity_date,
        production_lots (
          id,
          lot_no,
          total_tanks,
          kg_per_tank,
          sku_id,
          planned_quantity,
          products:sku_id (sku, product_name)
        ),
        processes (
          id,
          process_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('โหลดข้อมูลล้มเหลว')
      console.error(error)
    } else if (data) {
      // Filter for weighing tasks (process name contains 'ชั่ง' or 'mm-rm')
      const weighingTasks = data.filter(t => 
        (t.processes as any)?.process_name?.toLowerCase().includes('ชั่ง') || 
        (t.processes as any)?.process_name?.toLowerCase().includes('weigh')
      )
      setTasks(weighingTasks)
      setSelectedTask((prev: any) => prev ? weighingTasks.find(t => t.id === prev.id) || null : null)
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
        if ('weighing'.includes('weighing') && (lowerPName.includes('ชั่ง') || lowerPName.includes('weigh'))) shouldInclude = true;
        else if ('weighing'.includes('mixing') && (lowerPName.includes('ผสม') || lowerPName.includes('mix'))) shouldInclude = true;
        else if ('weighing'.includes('packing') && (lowerPName.includes('บรรจุ') || lowerPName.includes('pack'))) shouldInclude = true;
        else if ('weighing'.includes('pof') && (lowerPName.includes('pof') || lowerPName.includes('แพค'))) shouldInclude = true;
        
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

  const exportToExcel = () => {
    if (historyList.length === 0) {
      toast.error('ไม่มีข้อมูลให้ Export')
      return
    }
    const worksheet = XLSX.utils.json_to_sheet(historyList.map((item: any) => {
      let statusText = item.action
      if (item.action === 'DONE') statusText = 'ทำงานเสร็จสิ้น'
      if (item.action === 'IN_PROGRESS') statusText = 'กำลังดำเนินการ'
      if (item.action === 'MOVED') statusText = 'ส่งมอบแล้ว'
      if (item.action === 'WAITING') statusText = 'รอคิว'

      return {
        'วันที่-เวลา': new Date(item.timestamp).toLocaleString('th-TH'),
        'ผู้ดำเนินการ': item.user?.split('@')[0] || '-',
        'LOT No.': item.lotNo || '-',
        'SKU': item.sku || '-',
        'ชุดที่/พาเลท': item.tankNum,
        'สถานะ': statusText
      }
    }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "History")
    XLSX.writeFile(workbook, "Work_History.xlsx")
  }

  const toggleRow = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null)
    } else {
      setExpandedRow(id)
    }
  }







  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const updateData: any = { status: newStatus }
    if (newStatus === 'IN_PROGRESS') {
      updateData.start_time = new Date().toISOString()
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
      fetchWeighingTasks()
    }
  }

  const updateBasketProgress = async (taskId: string, currentBasket: number, task: any) => {
    let details = typeof task.tank_details === 'object' && task.tank_details !== null ? { ...task.tank_details } : {}
    
    // Toggle logic: WAITING -> IN_PROGRESS -> DONE -> MOVED -> WAITING
    const currentStatus = details[currentBasket] || 'WAITING'
    let nextStatus = 'IN_PROGRESS'
    let actionText = 'เริ่มชั่งสาร'
    if (currentStatus === 'IN_PROGRESS') { nextStatus = 'DONE'; actionText = 'ชั่งเสร็จแล้ว'; }
    else if (currentStatus === 'DONE') { nextStatus = 'MOVED'; actionText = 'ส่งมอบไปห้องผสม'; }
    else if (currentStatus === 'MOVED') {
      toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
      return
    }

    if (!window.confirm(`ยืนยันการเปลี่ยนสถานะชุดที่ ${currentBasket} เป็น "${actionText}" ใช่หรือไม่?`)) return;

    if (nextStatus === 'WAITING') {
      delete details[currentBasket]
      delete details[`${currentBasket}_history`]
    } else {
      details[currentBasket] = nextStatus
      const history = details[`${currentBasket}_history`] || []
      details[`${currentBasket}_history`] = [
        ...history,
        { status: nextStatus, timestamp: new Date().toISOString(), user: currentUser }
      ]
    }

    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    const validEnd = Math.max(start, end)
    
    let allDone = true
    for (let i = start; i <= validEnd; i++) {
      const s = details[i] || 'WAITING'
      if (s !== 'DONE' && s !== 'MOVED') {
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
      toast.error('อัปเดตสถานะชุดชั่งสารไม่สำเร็จ')
    } else {
      toast.success(`อัปเดตชุดชั่งสารที่ ${currentBasket} เป็นสถานะ ${nextStatus}`)
      
      // --- AUTO HAND-OFF TO MIXING ---
      if (nextStatus === 'MOVED') {
        const { data: mixProcess } = await supabase.from('processes').select('id').like('process_name', '%ผสม%').limit(1).single()
        if (mixProcess) {
          const { data: existingMixLog } = await supabase.from('production_logs')
            .select('id, tank_details')
            .eq('production_lot_id', task.production_lot_id)
            .eq('process_id', mixProcess.id)
            .eq('tank_start', task.tank_start)
            .eq('tank_end', task.tank_end)
            .maybeSingle()
            
          if (existingMixLog) {
            const mixDetails = typeof existingMixLog.tank_details === 'object' && existingMixLog.tank_details !== null 
              ? { ...existingMixLog.tank_details } 
              : {}
            
            // Allow update if empty, LOCKED string, or LOCKED object
            const currentMixState = mixDetails[currentBasket]?.status || mixDetails[currentBasket]
            if (!currentMixState || currentMixState === 'LOCKED') {
               mixDetails[currentBasket] = 'WAITING'
               await supabase.from('production_logs').update({ tank_details: mixDetails }).eq('id', existingMixLog.id)
            }
          } else {
            const start = parseInt(task.tank_start) || 1
            const end = parseInt(task.tank_end) || 1
            const initialMixDetails: any = {}
            for(let i=start; i<=end; i++) {
               initialMixDetails[i] = (i === currentBasket) ? 'WAITING' : 'LOCKED'
            }
            await supabase.from('production_logs').insert({
              production_lot_id: task.production_lot_id,
              process_id: mixProcess.id,
              status: 'WAITING',
              activity_date: new Date().toISOString().split('T')[0],
              tank_start: task.tank_start,
              tank_end: task.tank_end,
              total_tanks: task.production_lots?.total_tanks || null,
              tank_details: initialMixDetails
            })
          }
        }
      }
      // -------------------------------
      
      fetchWeighingTasks()
    }
  }

  // Generate mock baskets based on total_tanks
  const renderBaskets = (task: any) => {
    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    
    // Safety check if end is smaller than start
    const validEnd = Math.max(start, end)
    const limit = Math.min(validEnd - start + 1, 200) 
    
    const baskets = Array.from({ length: limit }).map((_, i) => start + i)
    
    const isDone = task.status === 'DONE'
    const isInProgress = task.status === 'IN_PROGRESS'
    const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {}
    
    return (
      <div className="p-6 bg-[#F8F6F0] border-b shadow-inner">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <ShoppingBasket className="w-5 h-5 text-purple-500" />
              สถานะการชั่งสารคิวนี้ (ถังที่ {start} ถึง {end}) จากทั้งหมด {total} ถัง
            </h3>

          </div>
          <div className="space-x-2 flex items-center">
            <DefectPopup 
              lotId={task.production_lot_id}
              processId={Array.isArray(task.processes) ? task.processes[0]?.id : task.processes?.id}
              processName={Array.isArray(task.processes) ? task.processes[0]?.process_name : task.processes?.process_name || 'ชั่งสาร'}
            />
            {(task.status === 'WAITING' || task.status === 'PLANNED' || !task.status) && (
              <Button size="sm" onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className="bg-emerald-600 hover:bg-emerald-700">
                <Play className="w-4 h-4 mr-2" /> เริ่มชั่งสาร
              </Button>
            )}

          </div>
        </div>
        
        <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-4">
          {baskets.map((b) => {
            let color = "text-slate-300 bg-white border-slate-200" // waiting
            
            const basketStatus = details[b]
            
            const isClickable = (isInProgress || isDone) && basketStatus !== 'MOVED'
            
            if (basketStatus === 'MOVED') {
              color = "text-sky-500 bg-sky-50 border-sky-200 shadow-sm"
            } else if (isDone || basketStatus === 'DONE') {
              color = `text-green-500 bg-green-50 border-green-200 shadow-sm ${isClickable ? 'cursor-pointer hover:bg-green-100' : ''}`
            } else if (isInProgress && basketStatus === 'IN_PROGRESS') {
              color = "text-yellow-600 bg-yellow-50 border-yellow-300 shadow-sm animate-pulse cursor-pointer hover:bg-yellow-100"
            } else if (isInProgress) {
              color = "text-slate-400 bg-[#F8F6F0] border-slate-200 cursor-pointer hover:bg-slate-100"
            }
            const history = details[`${b}_history`] || []
            const tooltipContent = history.length > 0 ? (
              <div className="space-y-1">
                <p className="font-semibold text-orange-300 border-b border-slate-700 pb-1 mb-2">ประวัติถัง {b}</p>
                {history.map((h: any, i: number) => {
                  let statusText = ''
                  let badgeColor = 'bg-slate-700 text-slate-100'
                  if (h.status === 'IN_PROGRESS') { statusText = 'เริ่มชั่ง'; badgeColor = 'bg-yellow-600 text-white' }
                  if (h.status === 'DONE') { statusText = 'ชั่งเสร็จ'; badgeColor = 'bg-green-500 text-white' }
                  if (h.status === 'MOVED') { statusText = 'ไปห้องผสม'; badgeColor = 'bg-sky-500 text-white' }
                  return (
                    <div key={i} className="flex flex-col mb-2 bg-slate-800 p-1.5 rounded">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] border-none px-1 py-0 ${badgeColor}`}>{statusText}</Badge>
                        <span className="text-[10px] text-slate-300">{new Date(h.timestamp).toLocaleTimeString('th-TH')}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-slate-400">
                        <User className="w-3 h-3" />
                        <span className="text-[10px] truncate max-w-[120px]">{h.user?.split('@')[0]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null
            
            const handleBasketClick = () => {
              if (!isClickable) return

              updateBasketProgress(task.id, b, task)
            }

            return (
              <TooltipProvider key={b}>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      onClick={handleBasketClick}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border ${color} transition-all ${isClickable ? 'cursor-pointer hover:scale-105' : ''}`}
                    >
                      <ShoppingBasket className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-medium">ชุดที่ {b}</span>
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
        <div className={`mt-8 flex items-center justify-center p-8 border-2 border-dashed rounded-xl overflow-hidden relative ${task.status === 'DONE' ? 'border-green-300 bg-green-50/80' : 'border-purple-200 bg-purple-50/50'}`}>
           <div className={`flex items-center gap-8 ${task.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}`}>
              <Box className={`w-10 h-10 ${task.status === 'DONE' ? 'text-green-400' : 'text-purple-300'}`} />
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-purple-200'}`} />
              <div className={`w-32 h-20 rounded-lg shadow-inner flex items-center justify-center relative ${task.status === 'DONE' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-purple-400 to-indigo-500'}`}>
                 <Scale className="w-8 h-8 text-white/50 absolute top-2 right-2 animate-bounce" />
                 <span className="text-white font-bold tracking-widest text-sm">WEIGHING</span>
              </div>
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-purple-200'}`} />
              <ShoppingBasket className={`w-10 h-10 drop-shadow-md ${task.status === 'DONE' ? 'text-green-600' : 'text-purple-600'}`} />
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
            <Scale className="w-8 h-8 text-yellow-400" />
            งานชั่งสาร (Weighing)
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>รายการงานชั่งสารทั้งหมด</div>
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
            คิวงานชั่งสาร
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
              <Input type="date" className="w-40 h-8 text-xs bg-white" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
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
                    <TableHead>วันที่จัดคิว (แผน)</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-32 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
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
                      <TableCell colSpan={8} className="text-center h-32 text-slate-500">
                        ไม่มีคิวงานชั่งสาร{filterDate ? 'ในวันที่เลือก' : ''}
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
                    }).sort((a, b) => {
                      const dateA = a.activity_date ? new Date(a.activity_date).getTime() : 0;
                      const dateB = b.activity_date ? new Date(b.activity_date).getTime() : 0;
                      return dateB - dateA;
                    }).map((task) => (
                      <React.Fragment key={task.id}>
                        <TableRow 
                          className={`cursor-pointer hover:bg-[#F8F6F0]/ transition-colors ${expandedRow === task.id ? 'bg-[#F8F6F0]/' : ''}`}
                          onClick={() => toggleRow(task.id)}
                        >
                          <TableCell>
                            {expandedRow === task.id ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </TableCell>
                          <TableCell className="font-medium text-violet-700">
                            {task.production_lots?.products?.sku || '-'}
                            <div className="text-xs text-slate-500 font-normal">{task.production_lots?.products?.product_name || ''}</div>
                          </TableCell>
                          <TableCell className="font-semibold">{task.production_lots?.lot_no || '-'}</TableCell>
                          <TableCell>{task.tank_start || '-'} - {task.tank_end || '-'}</TableCell>
                          <TableCell>{(task.tank_end - task.tank_start + 1) || task.production_lots?.total_tanks || 0} ถัง</TableCell>
                          <TableCell>{task.production_lots?.kg_per_tank || '-'} kg</TableCell>
                          <TableCell>
                          {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH') : '-'}
                        </TableCell>
                        <TableCell>
                          {(task.status === 'PLANNED' || !task.status) && <Badge variant="outline" className="bg-[#F8F6F0] text-slate-500 border-slate-200">รอชั่งสาร (แผน)</Badge>}
                          {task.status === 'WAITING' && <Badge variant="outline" className="bg-slate-100 text-slate-600">รอชั่งสาร</Badge>}
                          {task.status === 'IN_PROGRESS' && <Badge variant="outline" className="bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/30">กำลังชั่ง</Badge>}
                          {task.status === 'DONE' && <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">ชั่งเสร็จแล้ว</Badge>}
                          </TableCell>
                        </TableRow>
                        {expandedRow === task.id && (
                          <TableRow className="bg-[#F8F6F0]/ hover:bg-[#F8F6F0]/">
                            <TableCell colSpan={8} className="p-0 border-b border-slate-200">
                              {renderBaskets(task)}
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
              <CardTitle className="flex justify-between items-center w-full">
                 <span>ประวัติการทำงานแบบต่อเนื่อง</span>
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
                <div className="rounded-md border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8F6F0] text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">เวลา</th>
                        <th className="px-4 py-3 font-medium">ผู้ดำเนินการ</th>
                        <th className="px-4 py-3 font-medium">LOT No.</th>
                        <th className="px-4 py-3 font-medium">ชุดที่</th>
                        <th className="px-4 py-3 font-medium">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyList.filter(item => { const term = searchQuery.toLowerCase(); return (item.sku || '').toLowerCase().includes(term) || (item.lotNo || '').toLowerCase().includes(term); }).map((item, idx) => {
                        let statusColor = "bg-slate-100 text-slate-700"
                        if (item.action === 'DONE') statusColor = "bg-green-100 text-green-700"
                        if (item.action === 'IN_PROGRESS') statusColor = "bg-yellow-100 text-yellow-700"
                        if (item.action === 'MOVED') statusColor = "bg-sky-100 text-sky-700"
                        
                        let statusText = item.action
                        if (item.action === 'DONE') statusText = 'ชั่งเสร็จ'
                        if (item.action === 'IN_PROGRESS') statusText = 'เริ่มชั่ง'
                        if (item.action === 'MOVED') statusText = 'ไปห้องผสม'

                        return (
                          <tr key={`${item.taskId}-${item.tankNum}-${idx}`} className="hover:bg-[#F8F6F0]">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(item.timestamp).toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.user?.split('@')[0]}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-[#D4AF37]">
                              {item.lotNo} <span className="text-slate-400 font-normal text-xs ml-1">({item.sku})</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-semibold">ชุดที่ {item.tankNum}</td>
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
              <ShoppingBasket className="w-6 h-6 text-sky-500" />
              รายละเอียดงานชั่งสาร
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 border-t pt-4">
             {selectedTask && renderBaskets(selectedTask)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
