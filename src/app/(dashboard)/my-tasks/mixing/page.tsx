'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Beaker, ChevronDown, ChevronRight, Play, CheckCircle2, Clock, Droplet, AlertTriangle, ShoppingBasket, Blender, Cylinder, FlaskConical } from 'lucide-react'
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

export default function MixingTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [historyList, setHistoryList] = useState<any[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    fetchMixingTasks()
    fetchUser()
    fetchHistory()
    const interval = setInterval(() => {
      fetchMixingTasks()
      fetchHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user.email || 'Unknown User')
      setUserRole(user?.user_metadata?.role || 'user')
    }
  }

  const fetchMixingTasks = async () => {
    setLoading(true)
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
    } else if (data) {
      const mixingTasks = data.filter(t => 
        (t.processes as any)?.process_name?.toLowerCase().includes('ผสม') || 
        (t.processes as any)?.process_name?.toLowerCase().includes('mix')
      )
      setTasks(mixingTasks)
      setSelectedTask((prev: any) => prev ? mixingTasks.find(t => t.id === prev.id) || null : null)
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
        if ('mixing'.includes('weighing') && (lowerPName.includes('ชั่ง') || lowerPName.includes('weigh'))) shouldInclude = true;
        else if ('mixing'.includes('mixing') && (lowerPName.includes('ผสม') || lowerPName.includes('mix'))) shouldInclude = true;
        else if ('mixing'.includes('packing') && (lowerPName.includes('บรรจุ') || lowerPName.includes('pack'))) shouldInclude = true;
        else if ('mixing'.includes('pof') && (lowerPName.includes('pof') || lowerPName.includes('แพค'))) shouldInclude = true;
        
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







  const updateTaskStatus = async (taskId: string, newStatus: string, subStep?: string) => {
    const updateData: any = { status: newStatus }
    if (subStep) updateData.sub_step = subStep
    if (newStatus === 'IN_PROGRESS' || subStep === 'SOAKING') {
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
      fetchMixingTasks()
    }
  }


  const updateTankProgress = async (taskId: string, currentTank: number, task: any) => {
    let details = typeof task.tank_details === 'object' && task.tank_details !== null ? { ...task.tank_details } : {}
    
    const currentStatus = details[currentTank]?.status || details[currentTank] || 'WAITING'
    let nextStatus = 'SOAKING'
    let actionText = 'เริ่มแช่สาร'
    if (currentStatus === 'SOAKING') { nextStatus = 'MIXING'; actionText = 'เริ่มผสม'; }
    else if (currentStatus === 'MIXING') { nextStatus = 'DONE'; actionText = 'ผสมเสร็จแล้ว'; }
    else if (currentStatus === 'DONE') { nextStatus = 'SENT_TO_QC'; actionText = 'ส่งตรวจ QC'; }
    else if (currentStatus === 'QC_PASS') { nextStatus = 'SENT_TO_PACKING'; actionText = 'ส่งไปห้องบรรจุ'; }
    else if (currentStatus === 'SENT_TO_QC' || currentStatus === 'SENT_TO_PACKING') {
      toast.error('ไม่สามารถแก้ไขรายการที่ส่งต่อไปแล้วได้')
      return
    }

    const confirmForward = window.confirm(`ยืนยันการเปลี่ยนสถานะถังที่ ${currentTank} เป็น "${actionText}" ใช่หรือไม่?\n\n* หากต้องการย้อนกลับ/เคลียร์สถานะเดิม ให้กด "Cancel" (ยกเลิก)`)
    if (!confirmForward) {
      if (currentStatus !== 'WAITING') {
        if (userRole === 'admin') {
          const confirmClear = window.confirm(`⚠️ คุณแน่ใจหรือไม่ที่จะ "เคลียร์สถานะ" ของถังที่ ${currentTank} ให้กลับไปเริ่มต้นใหม่?`)
          if (confirmClear) {
            nextStatus = 'WAITING'
          } else {
            return
          }
        } else {
          toast.error('ฟังก์ชันนี้สงวนไว้สำหรับ Admin เท่านั้น กรุณาติดต่อ Admin เพื่อเคลียร์สถานะ')
          return
        }
      } else {
        return
      }
    }

    if (nextStatus === 'WAITING') {
      details[currentTank] = 'WAITING'
      delete details[`${currentTank}_history`]
    } else {
      details[currentTank] = nextStatus
      const history = details[`${currentTank}_history`] || []
      details[`${currentTank}_history`] = [
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
      if (s !== 'DONE' && s !== 'SENT_TO_QC' && s !== 'QC_PASS' && s !== 'SENT_TO_PACKING') {
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
      toast.error('อัปเดตสถานะการผสมไม่สำเร็จ')
    } else {
      toast.success(`อัปเดตถังที่ ${currentTank} เป็นสถานะ ${nextStatus}`)
      
      // --- AUTO HAND-OFF TO QC ---
      if (nextStatus === 'SENT_TO_QC') {
        const { data: qcProcess } = await supabase.from('processes').select('id').eq('process_name', 'รอ QC').single()
        if (qcProcess) {
          const { data: existingQCLog } = await supabase.from('production_logs')
            .select('id, tank_details')
            .eq('production_lot_id', task.production_lot_id)
            .eq('process_id', qcProcess.id)
            .eq('tank_start', task.tank_start)
            .eq('tank_end', task.tank_end)
            .maybeSingle()
            
          if (existingQCLog) {
            const qcDetails = typeof existingQCLog.tank_details === 'object' && existingQCLog.tank_details !== null 
              ? { ...existingQCLog.tank_details } 
              : {}
            
            const currentQCState = qcDetails[currentTank]?.status || qcDetails[currentTank]
            if (!currentQCState || currentQCState === 'LOCKED') {
               qcDetails[currentTank] = 'WAITING'
               const qcHistory = qcDetails[`${currentTank}_history`] || []
               qcDetails[`${currentTank}_history`] = [
                 ...qcHistory,
                 { status: 'MX ส่ง QC', timestamp: new Date().toISOString(), user: currentUser }
               ]
               await supabase.from('production_logs').update({ tank_details: qcDetails }).eq('id', existingQCLog.id)
            }
          } else {
            const start = parseInt(task.tank_start) || 1
            const end = parseInt(task.tank_end) || 1
            const initialQCDetails: any = {}
            for(let i=start; i<=end; i++) {
               initialQCDetails[i] = (i === currentTank) ? 'WAITING' : 'LOCKED'
               if (i === currentTank) {
                 initialQCDetails[`${i}_history`] = [
                   { status: 'MX ส่ง QC', timestamp: new Date().toISOString(), user: currentUser }
                 ]
               }
            }
            await supabase.from('production_logs').insert({
              production_lot_id: task.production_lot_id,
              process_id: qcProcess.id,
              status: 'WAITING',
              activity_date: new Date().toISOString().split('T')[0],
              tank_start: task.tank_start,
              tank_end: task.tank_end,
              total_tanks: task.production_lots?.total_tanks || null,
              tank_details: initialQCDetails
            })
          }
        }
      } else if (nextStatus === 'SENT_TO_PACKING') {
        const { data: packingProcess } = await supabase.from('processes').select('id').eq('process_name', 'บรรจุ').single()
        if (packingProcess) {
          const { data: existingPackingLog } = await supabase.from('production_logs')
            .select('id, tank_details')
            .eq('production_lot_id', task.production_lot_id)
            .eq('process_id', packingProcess.id)
            .eq('tank_start', task.tank_start)
            .eq('tank_end', task.tank_end)
            .maybeSingle()
            
          if (existingPackingLog) {
            const packingDetails = typeof existingPackingLog.tank_details === 'object' && existingPackingLog.tank_details !== null 
              ? { ...existingPackingLog.tank_details } 
              : {}
            
            const currentPackingState = packingDetails[currentTank]?.status || packingDetails[currentTank]
            if (!currentPackingState || currentPackingState === 'LOCKED') {
               packingDetails[currentTank] = 'WAITING'
               await supabase.from('production_logs').update({ tank_details: packingDetails }).eq('id', existingPackingLog.id)
            }
          } else {
            const start = parseInt(task.tank_start) || 1
            const end = parseInt(task.tank_end) || 1
            const initialPackingDetails: any = {}
            for(let i=start; i<=end; i++) {
               initialPackingDetails[i] = (i === currentTank) ? 'WAITING' : 'LOCKED'
            }
            await supabase.from('production_logs').insert({
              production_lot_id: task.production_lot_id,
              process_id: packingProcess.id,
              status: 'WAITING',
              activity_date: new Date().toISOString().split('T')[0],
              tank_start: task.tank_start,
              tank_end: task.tank_end,
              total_tanks: task.production_lots?.total_tanks || null,
              tank_details: initialPackingDetails
            })
          }
        }
      }
      // -------------------------------
      
      fetchMixingTasks()
    }
  }

  const renderTanks = (task: any) => {
    const total = task.production_lots?.total_tanks || 0
    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || total
    const validEnd = Math.max(start, end)
    const limit = Math.min(validEnd - start + 1, 200)
    
    const tanks = Array.from({ length: limit }).map((_, i) => start + i)
    const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {}
    
    return (
      <div className="p-6 bg-[#F8F6F0] border-b shadow-inner">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Beaker className="w-5 h-5 text-[#D4AF37]" />
              สถานะการผสมคิวนี้ (ถังที่ {start} ถึง {end}) จากทั้งหมด {total} ถัง
            </h3>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-medium text-slate-600">วันที่จัดคิว:</span>
              <span className="text-sm text-slate-800 font-medium">
                {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
              </span>
            </div>
          </div>
          <div className="space-x-2 flex items-center">
            <DefectPopup 
              lotId={task.production_lot_id}
              processId={Array.isArray(task.processes) ? task.processes[0]?.id : task.processes?.id}
              processName={Array.isArray(task.processes) ? task.processes[0]?.process_name : task.processes?.process_name || 'แผนก'}
            />

            {(task.status === 'WAITING' || task.status === 'PLANNED' || !task.status) && (
              <Button size="sm" onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover">
                <Play className="w-4 h-4 mr-2" /> เริ่มผสม
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-12 gap-6">
          {tanks.map((t) => {
            let color = "text-slate-300 bg-white border-slate-200" // waiting
            let animate = ""
            
            const tankStatus = details[t]?.status || details[t] || (task.status === 'DONE' ? 'DONE' : 'LOCKED')
            
            if (tankStatus === 'LOCKED') {
              color = "text-slate-300 bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
            } else if (tankStatus === 'QC_PASS') {
              color = "text-green-600 bg-green-50 border-green-400 shadow-sm"
            } else if (tankStatus === 'PAUSED') {
              color = "text-orange-600 bg-orange-50 border-orange-400 shadow-sm"
            } else if (tankStatus === 'FAILED') {
              color = "text-red-600 bg-red-50 border-red-400 shadow-sm"
            } else if (tankStatus === 'REPROCESS') {
              color = "text-purple-600 bg-purple-50 border-purple-400 shadow-sm"
            } else if (tankStatus === 'DONE' || task.status === 'DONE' || task.status === 'QC_PASS') {
              color = "text-purple-500 bg-purple-50 border-purple-300 shadow-sm"
              if (task.status === 'QC_PASS') color = "text-green-600 bg-green-50 border-green-300 shadow-sm"
            } else if (tankStatus === 'SENT_TO_QC') {
              color = "text-teal-500 bg-teal-50 border-teal-300 shadow-sm"
            } else if (tankStatus === 'SENT_TO_PACKING') {
              color = "text-indigo-500 bg-indigo-50 border-indigo-300 shadow-sm"
            } else if (tankStatus === 'SOAKING') {
              color = "text-orange-500 bg-orange-50 border-orange-300 shadow-sm"
              animate = "animate-pulse"
            } else if (tankStatus === 'MIXING') {
              color = "text-[#D4AF37] bg-[#D4AF37]/ border-[#D4AF37]/30 shadow-sm"
              animate = "animate-bounce"
            } else if (task.status === 'IN_PROGRESS') {
               color = "text-slate-400 bg-[#F8F6F0] border-slate-200 cursor-pointer hover:bg-slate-100"
            }
            const history = details[`${t}_history`] || []
            const tooltipContent = history.length > 0 ? (
              <div className="space-y-1">
                <p className="font-semibold text-[#4A4238]/ border-b border-slate-700 pb-1 mb-2">ประวัติถัง {t}</p>
                {history.map((h: any, i: number) => {
                  let statusText = h.status
                  let badgeColor = 'bg-slate-700 text-slate-100'
                  if (h.status === 'SOAKING') { statusText = 'แช่สาร'; badgeColor = 'bg-orange-500 text-white' }
                  if (h.status === 'MIXING') { statusText = 'ผสม'; badgeColor = 'bg-[#D4AF37] text-white' }
                  if (h.status === 'DONE') { statusText = 'เสร็จ'; badgeColor = 'bg-purple-500 text-white' }
                  if (h.status === 'SENT_TO_QC') { statusText = 'ส่ง QC'; badgeColor = 'bg-teal-500 text-white' }
                  if (h.status === 'QC_PASS') { statusText = 'QC PASS'; badgeColor = 'bg-green-600 text-white' }
                  if (h.status === 'SENT_TO_PACKING') { statusText = 'ส่งบรรจุ'; badgeColor = 'bg-indigo-500 text-white' }
                  if (h.status === 'PAUSED') { statusText = 'QC HOLD'; badgeColor = 'bg-orange-600 text-white' }
                  if (h.status === 'FAILED') { statusText = 'QC REJECT'; badgeColor = 'bg-red-600 text-white' }
                  if (h.status === 'REPROCESS') { statusText = 'QC REPROCESS'; badgeColor = 'bg-purple-600 text-white' }
                  return (
                    <div key={i} className="flex flex-col mb-2 bg-slate-800 p-1.5 rounded">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={`text-[10px] border-none px-1 py-0 ${badgeColor}`}>{statusText}</Badge>
                        <span className="text-[10px] text-slate-300 shrink-0">{new Date(h.timestamp).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
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
                    </div>
                  )
                })}
              </div>
            ) : null

            const isClickable = (task.status === 'IN_PROGRESS' || task.status === 'DONE') && tankStatus !== 'LOCKED' && tankStatus !== 'SENT_TO_QC' && tankStatus !== 'SENT_TO_PACKING' && tankStatus !== 'PAUSED' && tankStatus !== 'FAILED'

            const handleTankClick = () => {
              if (!isClickable) return

              updateTankProgress(task.id, t, task)
            }

            return (
              <TooltipProvider key={t} delay={100}>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      onClick={handleTankClick}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 ${color} transition-all ${isClickable ? 'cursor-pointer hover:scale-105' : ''}`}
                    >
                      <Beaker className={`w-8 h-8 mb-2 ${animate}`} />
                      <span className="text-xs font-bold">ถัง {t}</span>
                    </div>
                  </TooltipTrigger>
                  {tooltipContent && (
                    <TooltipContent side="top" className="w-56 p-3 bg-[#2D2721] border-[#2D2721] text-white shadow-xl z-[100] max-h-64 overflow-y-auto">
                      {tooltipContent}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
        
        {task.note && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm max-w-2xl">
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>ปัญหาการผลิต (Issues)</span>
            </div>
            <div className="text-sm text-red-600 whitespace-pre-wrap pl-6">
              {task.note.split('\n').map((line: string, i: number) => (
                <div key={i} className="mb-0.5">
                  {line.includes('[') ? 
                    <span><strong>{line.split(']')[0] + ']'}</strong> {line.split(']').slice(1).join(']')}</span> : 
                    <span>{line}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Diagram */}
        <div className={`mt-8 flex items-center justify-center p-8 border-2 border-dashed rounded-xl overflow-hidden relative ${task.status === 'DONE' ? 'border-green-300 bg-green-50/80' : 'border-[#D4AF37]/30 bg-[#D4AF37]/'}`}>
           <div className={`flex items-center gap-8 ${task.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}`}>
              <ShoppingBasket className={`w-10 h-10 ${task.status === 'DONE' ? 'text-green-400' : 'text-[#4A4238]/'}`} />
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-blue-200'}`} />
              <div className={`w-32 h-20 rounded-lg shadow-inner flex items-center justify-center relative ${task.status === 'DONE' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-cyan-500'}`}>
                 <Blender className="w-8 h-8 text-white/50 absolute top-2 right-2 animate-bounce" />
                 <span className="text-white font-bold tracking-widest text-sm">MIXING</span>
              </div>
              <ChevronRight className={`w-8 h-8 ${task.status === 'DONE' ? 'text-green-300' : 'text-blue-200'}`} />
              <Cylinder className={`w-10 h-10 drop-shadow-md ${task.status === 'DONE' ? 'text-green-600' : 'text-[#D4AF37]'}`} />
           </div>
        </div>
        
        {task.start_time && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" /> 
            เริ่มเมื่อ: {new Date(task.start_time).toLocaleString('th-TH')}
            {task.sub_step && <span className="ml-2 font-semibold">({task.sub_step})</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <FlaskConical className="w-8 h-8 text-yellow-400" />
            งานผสม (Mixing)
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>รายการงานผสมทั้งหมด</div>
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
            คิวงานผสม
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
                    <TableHead>วันที่จัดคิว (แผน)</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-32 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]" />
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
                        ไม่มีคิวงานผสม{filterDate ? 'ในวันที่เลือก' : ''}
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
                          <TableCell className="font-medium text-[#D4AF37] whitespace-normal min-w-[250px] max-w-[350px] break-words">
                            <div className="break-words">{task.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-normal break-words">{task.production_lots?.products?.product_name || ''}</div>
                          </TableCell>
                          <TableCell className="font-semibold">{task.production_lots?.lot_no || '-'}</TableCell>
                          <TableCell>{task.tank_start} - {task.tank_end}</TableCell>
                          <TableCell>{task.production_lots?.total_tanks || 0} ถัง</TableCell>
                          <TableCell>{task.production_lots?.kg_per_tank || '-'} kg</TableCell>
                          <TableCell>
                            {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH') : '-'}
                          </TableCell>
                          <TableCell>
                            {(() => {
                               let allMixDone = true;
                               const mixStart = parseInt(task.tank_start) || 1;
                               const mixEnd = parseInt(task.tank_end) || parseInt(task.total_tanks) || 1;
                               const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details as any : {};
                               for (let i = mixStart; i <= mixEnd; i++) {
                                 const s = details[i]?.status || details[i] || 'WAITING';
                                 if (s !== 'DONE' && s !== 'SENT_TO_QC' && s !== 'QC_PASS' && s !== 'SENT_TO_PACKING') {
                                   allMixDone = false; break;
                                 }
                               }
                               
                               if (allMixDone && task.status !== 'WAITING' && task.status !== 'PLANNED' && task.status) {
                                  return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">ผสมเสร็จสิ้น</Badge>;
                               }
                               
                               if (task.status === 'PLANNED' || !task.status) return <Badge variant="outline" className="bg-[#F8F6F0] text-slate-500 border-slate-200">รอผสม (แผน)</Badge>;
                               if (task.status === 'WAITING') return <Badge variant="outline" className="bg-slate-100 text-slate-600">รอผสม</Badge>;
                               if (task.status === 'IN_PROGRESS' && task.sub_step === 'SOAKING') return <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200">แช่สาร</Badge>;
                               if (task.status === 'IN_PROGRESS') return <Badge variant="outline" className="bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/30">กำลังผสม</Badge>;
                               if (task.status === 'DONE') return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">ผสมเสร็จสิ้น</Badge>;
                               if (task.status === 'QC_PASS') return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">QC Pass</Badge>;
                               return null;
                            })()}
                          </TableCell>
                        </TableRow>
                        {expandedRow === task.id && (
                          <TableRow className="bg-[#F8F6F0]/ hover:bg-[#F8F6F0]/">
                            <TableCell colSpan={8} className="p-0 border-b border-slate-200">
                              {renderTanks(task)}
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
                        <th className="px-4 py-3 font-medium">ถังที่</th>
                        <th className="px-4 py-3 font-medium">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyList.filter(item => { const term = searchQuery.toLowerCase(); return (item.sku || '').toLowerCase().includes(term) || (item.lotNo || '').toLowerCase().includes(term); }).map((item, idx) => {
                        let statusColor = "bg-slate-100 text-slate-700"
                        if (item.action === 'DONE') statusColor = "bg-green-100 text-green-700"
                        if (item.action === 'IN_PROGRESS' || item.action === 'SOAKING' || item.action === 'MIXING') statusColor = "bg-yellow-100 text-yellow-700"
                        if (item.action === 'SENT_TO_QC') statusColor = "bg-sky-100 text-sky-700"
                        
                        let statusText = item.action
                        if (item.action === 'DONE') statusText = 'ผสมเสร็จ'
                        if (item.action === 'IN_PROGRESS') statusText = 'กำลังดำเนินการ'
                        if (item.action === 'SOAKING') statusText = 'กำลังแช่'
                        if (item.action === 'MIXING') statusText = 'กำลังปั่น'
                        if (item.action === 'SENT_TO_QC') statusText = 'ส่ง QC'

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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl mb-4">
              <Beaker className="w-6 h-6 text-pink-500" />
              รายละเอียดงานผสม
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 border-t pt-4">
             {selectedTask && renderTanks(selectedTask)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
