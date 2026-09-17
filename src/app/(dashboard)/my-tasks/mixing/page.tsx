'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Beaker, ChevronDown, ChevronRight, Play, CheckCircle2, Clock, Droplet, AlertTriangle, ShoppingBasket, Blender, Cylinder, FlaskConical, TrendingUp, Layers, RefreshCw, Sparkles, ArrowUpRight, Search, X, RotateCcw, Filter } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { TaskCalendar } from '@/components/ui/TaskCalendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar as CalendarIcon, List as ListIcon, User, History, ClipboardCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, differenceInDays, startOfDay } from 'date-fns'
import { DefectPopup } from '@/components/production/DefectPopup'
import { cleanDisplayNote } from '@/lib/planTracking'
import { MasterPlanningTimeline } from '@/components/planner/MasterPlanningTimeline'

export default function MixingTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'timeline'>('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Column-specific header filters for Queue table
  const [colFilterSku, setColFilterSku] = useState('')
  const [colFilterLot, setColFilterLot] = useState('')
  const [colFilterTank, setColFilterTank] = useState('')
  const [colFilterTotalTanks, setColFilterTotalTanks] = useState('')
  const [colFilterBulkSize, setColFilterBulkSize] = useState('')
  const [colFilterDate, setColFilterDate] = useState('')
  const [colFilterStatus, setColFilterStatus] = useState('ALL')

  const hasActiveColFilters = Boolean(
    colFilterSku || colFilterLot || colFilterTank || colFilterTotalTanks || colFilterBulkSize || colFilterDate || (colFilterStatus !== 'ALL')
  )

  const clearAllColFilters = () => {
    setColFilterSku('')
    setColFilterLot('')
    setColFilterTank('')
    setColFilterTotalTanks('')
    setColFilterBulkSize('')
    setColFilterDate('')
    setColFilterStatus('ALL')
  }
  const [historyList, setHistoryList] = useState<any[]>([])
  const [historyFilters, setHistoryFilters] = useState({
    time: '',
    user: '',
    lot: '',
    tank: '',
    status: ''
  })
  
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
      .neq('status', 'COMPLETED')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('โหลดข้อมูลล้มเหลว')
    } else if (data) {
      const mixingTasks = data.filter(t => 
        (t.processes as any)?.process_name?.toLowerCase().includes('ผสม') || 
        (t.processes as any)?.process_name?.toLowerCase().includes('mix')
      )

      // Sort tasks: 1. Lot No (005/26 before 006/26), 2. Tank start numeric (1, 3, 5...), 3. Activity Date
      mixingTasks.sort((a: any, b: any) => {
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

  const getMixingStatusText = (action: string) => {
    if (action === 'DONE') return 'ผสมเสร็จ'
    if (action === 'IN_PROGRESS') return 'กำลังดำเนินการ'
    if (action === 'SOAKING') return 'กำลังแช่'
    if (action === 'MIXING') return 'กำลังปั่น'
    if (action === 'SENT_TO_QC') return 'ส่ง QC'
    if (action === 'SENT_TO_PACKING') return 'ส่งบรรจุ'
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
      // 4. Tank filter
      if (historyFilters.tank.trim()) {
        const term = historyFilters.tank.toLowerCase().trim()
        const t = String(item.tankNum || '').toLowerCase()
        const label = `ถังที่ ${t}`.toLowerCase()
        if (!t.includes(term) && !label.includes(term)) return false
      }
      // 5. Status filter
      if (historyFilters.status.trim()) {
        const term = historyFilters.status.toLowerCase().trim()
        const action = (item.action || '').toLowerCase()
        const statusText = getMixingStatusText(item.action).toLowerCase()
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
      const statusText = getMixingStatusText(item.action)

      return {
        'วันที่-เวลา': new Date(item.timestamp).toLocaleString('th-TH'),
        'ผู้ดำเนินการ': item.user?.split('@')[0] || '-',
        'LOT No.': item.lotNo || '-',
        'SKU': item.sku || '-',
        'ถังที่': `ถังที่ ${item.tankNum}`,
        'สถานะ': statusText
      }
    }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mixing History")
    XLSX.writeFile(workbook, "Mixing_Work_History.xlsx")
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
      
      // --- SMART AUTO HAND-OFF TO QC ---
      if (nextStatus === 'SENT_TO_QC') {
        const { data: qcProcess } = await supabase.from('processes').select('id').eq('process_name', 'รอ QC').single()
        if (qcProcess) {
          const { data: qcLogs } = await supabase.from('production_logs')
            .select('id, tank_start, tank_end, tank_details, status')
            .eq('production_lot_id', task.production_lot_id)
            .eq('process_id', qcProcess.id)
            
          const currentTankNum = Number(currentTank);
          const targetQCLog = (qcLogs || []).find(l => {
            const s = parseInt(l.tank_start) || 1;
            const e = parseInt(l.tank_end) || s;
            return currentTankNum >= s && currentTankNum <= e;
          });

          if (targetQCLog) {
            const qcDetails = typeof targetQCLog.tank_details === 'object' && targetQCLog.tank_details !== null 
              ? { ...targetQCLog.tank_details } 
              : {}
            
            qcDetails[currentTank] = 'WAITING'
            const qcHistory = qcDetails[`${currentTank}_history`] || []
            qcDetails[`${currentTank}_history`] = [
              ...qcHistory,
              { status: 'MX ส่ง QC', timestamp: new Date().toISOString(), user: currentUser }
            ]
            await supabase.from('production_logs').update({ 
              tank_details: qcDetails,
              status: targetQCLog.status === 'PLANNED' ? 'WAITING' : targetQCLog.status
            }).eq('id', targetQCLog.id)
          } else {
            const start = parseInt(task.tank_start) || 1
            const end = parseInt(task.tank_end) || 1
            const initialQCDetails: any = {}
            for(let i=start; i<=end; i++) {
               initialQCDetails[i] = (i === currentTankNum) ? 'WAITING' : 'LOCKED'
               if (i === currentTankNum) {
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
          const { data: packingLogs } = await supabase.from('production_logs')
            .select('id, tank_start, tank_end, tank_details, status')
            .eq('production_lot_id', task.production_lot_id)
            .eq('process_id', packingProcess.id)
            
          const currentTankNum = Number(currentTank);
          const targetPackingLog = (packingLogs || []).find(l => {
            const s = parseInt(l.tank_start) || 1;
            const e = parseInt(l.tank_end) || s;
            return currentTankNum >= s && currentTankNum <= e;
          });

          if (targetPackingLog) {
            const packingDetails = typeof targetPackingLog.tank_details === 'object' && targetPackingLog.tank_details !== null 
              ? { ...targetPackingLog.tank_details } 
              : {}
            
            const currentPackingState = packingDetails[currentTank]?.status || packingDetails[currentTank]
            if (!currentPackingState || currentPackingState === 'LOCKED') {
               packingDetails[currentTank] = 'WAITING'
               await supabase.from('production_logs').update({ 
                 tank_details: packingDetails,
                 status: targetPackingLog.status === 'PLANNED' ? 'WAITING' : targetPackingLog.status
               }).eq('id', targetPackingLog.id)
            }
          } else {
            const start = parseInt(task.tank_start) || 1
            const end = parseInt(task.tank_end) || 1
            const initialPackingDetails: any = {}
            for(let i=start; i<=end; i++) {
               initialPackingDetails[i] = (i === currentTankNum) ? 'WAITING' : 'LOCKED'
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
            
            let tankStatus = details[t]?.status || details[t]
            if (!tankStatus || tankStatus === 'LOCKED') {
              tankStatus = (task.status === 'DONE' ? 'DONE' : (task.status === 'IN_PROGRESS' ? 'WAITING' : 'LOCKED'))
            }
            
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
                      {h.note && cleanDisplayNote(h.note) && (
                        <div className="text-[10px] text-slate-300 mt-1 italic border-l-2 border-slate-600 pl-1">
                          {cleanDisplayNote(h.note)}
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

            const problemStatuses = Array.from(new Set(history.filter((h: any) => ['PAUSED', 'FAILED', 'REPROCESS'].includes(h.status)).map((h: any) => {
              if (h.status === 'PAUSED') return 'HOLD'
              if (h.status === 'FAILED') return 'REJECT'
              if (h.status === 'REPROCESS') return 'REPROCESS'
              return ''
            })))

            return (
              <TooltipProvider key={t} delay={100}>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      onClick={handleTankClick}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 ${color} transition-all ${isClickable ? 'cursor-pointer hover:scale-105' : ''}`}
                    >
                      <Beaker className={`w-8 h-8 mb-2 ${animate}`} />
                      <span className="text-xs font-bold">ถัง {t}</span>
                      {problemStatuses.length > 0 && (
                        <div className="flex flex-col items-center mt-1 space-y-[2px]">
                          {problemStatuses.map(ps => (
                            <span key={ps as string} className="text-[9px] font-bold text-red-600 animate-pulse bg-red-100/50 px-1 rounded-sm">{ps as string}</span>
                          ))}
                        </div>
                      )}
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
        
        {task.note && cleanDisplayNote(task.note) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm max-w-2xl">
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>ปัญหาการผลิต (Issues)</span>
            </div>
            <div className="text-sm text-red-600 whitespace-pre-wrap pl-6">
              {cleanDisplayNote(task.note).split('\n').map((line: string, i: number) => (
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

  const handleRefresh = () => {
    fetchMixingTasks()
    fetchHistory()
    toast.success('รีเฟรชข้อมูลคิวงานผสมล่าสุดเรียบร้อยแล้ว')
  }

  // Mixing Metric Calculations
  let totalTanksCount = 0;
  let inProgressTanksCount = 0;
  let soakTanksCount = 0;
  let doneTanksCount = 0;
  let qcSentTanksCount = 0;
  let pausedTanksCount = 0;

  tasks.forEach(t => {
    const details = typeof t.tank_details === 'object' && t.tank_details !== null ? t.tank_details : {};
    const total = t.production_lots?.total_tanks || 1;
    const start = parseInt(t.tank_start) || 1;
    const end = parseInt(t.tank_end) || total;
    const count = Math.max(start, end) - start + 1;
    totalTanksCount += count;

    for (let i = start; i <= Math.max(start, end); i++) {
      const s = details[i]?.status || details[i] || 'WAITING';
      if (s === 'IN_PROGRESS') inProgressTanksCount++;
      if (s === 'SOAK' || s === 'PREMIX') soakTanksCount++;
      if (s === 'DONE' || s === 'SENT_TO_PACKING') doneTanksCount++;
      if (s === 'SENT_TO_QC' || s === 'QC_PASS') qcSentTanksCount++;
      if (s === 'PAUSED' || s === 'REPROCESS') pausedTanksCount++;
    }
  });

  const totalBulkVolume = tasks.reduce((sum, t) => {
    const kgPerTank = t.production_lots?.kg_per_tank || 0;
    const total = t.production_lots?.total_tanks || 1;
    const start = parseInt(t.tank_start) || 1;
    const end = parseInt(t.tank_end) || total;
    const count = Math.max(start, end) - start + 1;
    return sum + (count * kgPerTank);
  }, 0);

  const activeTanksRunning = inProgressTanksCount + soakTanksCount;
  const runningPct = totalTanksCount > 0 ? (((doneTanksCount + qcSentTanksCount) / totalTanksCount) * 100).toFixed(1) : '0.0';

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterDate && t.activity_date !== filterDate) return false

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
  }, [tasks, filterDate, searchQuery, colFilterSku, colFilterLot, colFilterTank, colFilterTotalTanks, colFilterBulkSize, colFilterDate, colFilterStatus])

  return (
    <div className="p-4 md:p-6 w-full mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <FlaskConical className="w-8 h-8 text-yellow-500 shrink-0" />
            งานผสม (Mixing & Bulk Formulation)
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>รายการงานผสมเนื้อครีม/เซรั่ม ควบคุมอุณหภูมิ และสุ่มตรวจวิเคราะห์แล็บ</div>
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

      {/* 1. Executive Mixing KPI Summary Bar */}
      <div className="bg-gradient-to-r from-[#2D2721] via-[#3E352B] to-[#2D2721] text-white p-5 rounded-2xl shadow-xl border border-[#D4AF37]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 shrink-0">
            <FlaskConical className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Bulk Formulation & Mixing Intelligence
            </div>
            <div className="text-lg md:text-xl font-black text-white mt-0.5">
              Executive Mixing Station KPI
            </div>
            <div className="text-xs text-stone-300 mt-0.5">
              สถานะเครื่องกวนผสม (Mix 1-6) • การแช่สาร • ปริมาตร Bulk รวม • และการสุ่มตรวจส่งแล็บ QC
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Total Mixing Tanks */}
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[11px] text-stone-300 font-medium">งานผสมทั้งหมด</div>
            <div className="text-2xl font-black text-[#D4AF37] tracking-tight">
              {tasks.length} <span className="text-xs font-normal text-stone-300">ล็อต</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">({totalTanksCount} ถังในคิว)</div>
          </div>

          {/* Active Stirring & Mixing */}
          <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-400/30 text-center">
            <div className="text-[11px] text-emerald-200 font-medium">กำลังผสม / แช่สาร</div>
            <div className="text-2xl font-black text-emerald-400">
              {activeTanksRunning} <span className="text-xs font-normal text-emerald-200">ถัง</span>
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">({totalBulkVolume.toLocaleString()} KG เนื้อสาร)</div>
          </div>

          {/* QC Lab Hold */}
          <div className="bg-purple-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-purple-400/30 text-center">
            <div className="text-[11px] text-purple-200 font-medium">ส่งตรวจแล็บ QC</div>
            <div className="text-2xl font-black text-purple-300">
              {qcSentTanksCount} <span className="text-xs font-normal text-purple-200">ถัง</span>
            </div>
            <div className="text-[10px] text-purple-300 mt-0.5">(รอผลตรวจปล่อย)</div>
          </div>

          {/* Mixed & Ready for Packing */}
          <div className="bg-blue-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-blue-400/30 text-center">
            <div className="text-[11px] text-blue-200 font-medium">ผสมเสร็จ / ส่งบรรจุ</div>
            <div className="text-2xl font-black text-blue-300">
              {doneTanksCount} <span className="text-xs font-normal text-blue-200">ถัง</span>
            </div>
            <div className="text-[10px] text-blue-300 mt-0.5">({runningPct}% ความคืบหน้า)</div>
          </div>
        </div>
      </div>

      {/* 2. Four Interactive Dimension Cards for Mixing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Stirring */}
        <Card className="border-2 border-slate-200 hover:border-emerald-400 bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                  <Blender className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">1. ถังกำลังผสม (Stirring)</div>
                  <div className="text-[11px] text-slate-500">Mix 1-6 Running</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                {inProgressTanksCount} กำลังผสม
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-emerald-600">{inProgressTanksCount}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">/ {totalTanksCount} ถังเดินเครื่อง</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                In-Progress
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${totalTanksCount > 0 ? ((inProgressTanksCount / totalTanksCount) * 100) : 0}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">กำลังผสม</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{inProgressTanksCount}</div>
                <div className="text-[9px] text-emerald-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">แช่สาร</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{soakTanksCount}</div>
                <div className="text-[9px] text-emerald-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">รวมเดินงาน</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{activeTanksRunning}</div>
                <div className="text-[9px] text-emerald-600 font-medium">ถัง</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Soak & Pre-mix */}
        <Card className="border-2 border-slate-200 hover:border-blue-400 bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">2. ขั้นตอนแช่สาร (Soak)</div>
                  <div className="text-[11px] text-slate-500">Hydration & Premix Stage</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                {soakTanksCount} แช่สารอยู่
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-blue-600">{soakTanksCount}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">ถังแช่สารบ่มเนื้อ</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                Soak Stage
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${totalTanksCount > 0 ? ((soakTanksCount / totalTanksCount) * 100) : 0}%` }} className="bg-blue-500 h-full transition-all duration-500" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">แช่สาร</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">{soakTanksCount}</div>
                <div className="text-[9px] text-blue-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">รอแช่</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">{totalTanksCount - (activeTanksRunning + doneTanksCount + qcSentTanksCount)}</div>
                <div className="text-[9px] text-blue-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">สถานะ</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">กำลังแช่</div>
                <div className="text-[9px] text-blue-600 font-medium">Normal</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: QC Lab Sampling */}
        <Card className="border-2 border-slate-200 hover:border-purple-400 bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-sm">
                  <Beaker className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">3. ส่งตรวจแล็บ QC (Lab)</div>
                  <div className="text-[11px] text-slate-500">QC Bulk Assay & Viscosity</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-semibold">
                {qcSentTanksCount} รอผลแล็บ
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-purple-600">{qcSentTanksCount}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">ถังรอ QC ตรวจปล่อย</span>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">
                Lab Clearance
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${totalTanksCount > 0 ? ((qcSentTanksCount / totalTanksCount) * 100) : 0}%` }} className="bg-purple-500 h-full transition-all duration-500" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-100">
                <div className="text-[10px] font-semibold text-purple-700">ส่งแล็บ</div>
                <div className="text-xs font-bold text-purple-800 mt-0.5">{qcSentTanksCount}</div>
                <div className="text-[9px] text-purple-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="text-[10px] font-semibold text-rose-700">ปัญหา/พัก</div>
                <div className="text-xs font-bold text-rose-800 mt-0.5">{pausedTanksCount}</div>
                <div className="text-[9px] text-rose-600 font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-100">
                <div className="text-[10px] font-semibold text-purple-700">ผลแล็บ</div>
                <div className="text-xs font-bold text-purple-800 mt-0.5">Assay</div>
                <div className="text-[9px] text-purple-600 font-medium">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Compound Volume */}
        <Card className="border-2 border-slate-200 hover:border-[#D4AF37] bg-white transition-all duration-200 hover:shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#8B7355] flex items-center justify-center font-bold shadow-sm">
                  <Cylinder className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">4. ปริมาณ Bulk รวม (KG)</div>
                  <div className="text-[11px] text-slate-500">Total Bulk Volume</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-[#F8F6F0] text-[#8B7355] border-[#D4AF37]/30 font-semibold">
                {totalBulkVolume.toLocaleString()} KG
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-[#4A4238]">{totalBulkVolume.toLocaleString()}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">KG รวมในห้องผสม</span>
              </div>
              <Badge className="bg-[#D4AF37]/20 text-[#8B7355] border-[#D4AF37]/30 text-[10px] font-bold">
                Formulation
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: '100%' }} className="bg-[#D4AF37] h-full" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">น้ำหนัก Bulk</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">{totalBulkVolume.toLocaleString()}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">KG</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">ถังทั้งหมด</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">{totalTanksCount}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">ถัง</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">เฉลี่ย/ถัง</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">{totalTanksCount > 0 ? Math.round(totalBulkVolume / totalTanksCount) : 0}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">KG/ถัง</div>
              </div>
            </div>
          </CardContent>
        </Card>
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
      {viewMode === 'timeline' ? (
        <MasterPlanningTimeline
          initialDept="MX"
          currentUser={userRole || 'MX'}
          onPlanChanged={fetchMixingTasks}
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
                    <TableHead className="whitespace-nowrap">ถังที่ (ตามแผน)</TableHead>
                    <TableHead>จำนวนถัง (รวม)</TableHead>
                    <TableHead>Bulk size (kg/ถัง)</TableHead>
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
                    <TableHead className="py-1 px-1.5 min-w-[140px]">
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
                    <TableHead className="py-1 px-1.5 min-w-[110px]">
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
                    <TableHead className="py-1 px-1.5 min-w-[90px]">
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
                    <TableHead className="py-1 px-1.5 min-w-[90px]">
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
                    <TableHead className="py-1 px-1.5 min-w-[100px]">
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
                    <TableHead className="py-1 px-1.5 min-w-[120px]">
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
                    <TableHead className="py-1 px-1.5 min-w-[130px]">
                      <Select value={colFilterStatus} onValueChange={(val) => setColFilterStatus(val || 'ALL')}>
                        <SelectTrigger className="h-7 text-xs bg-white border-slate-200">
                          <SelectValue placeholder="ทุกสถานะ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">ทุกสถานะ</SelectItem>
                          <SelectItem value="WAITING" className="text-xs">⏳ รอผสม</SelectItem>
                          <SelectItem value="IN_PROGRESS" className="text-xs">🧪 กำลังผสม</SelectItem>
                          <SelectItem value="DONE" className="text-xs">✅ ผสมเสร็จแล้ว</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableHead>
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
                  ) : filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-32 text-slate-500">
                        <div>ไม่พบคิวงานผสม{filterDate ? ' ในวันที่เลือก' : ''}{hasActiveColFilters ? ' ตามตัวกรองที่ระบุ' : ''}</div>
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
                    filteredTasks.map((task) => (
                      <React.Fragment key={task.id}>
                        <TableRow 
                          className={`cursor-pointer hover:bg-[#F8F6F0]/ transition-colors ${expandedRow === task.id ? 'bg-[#F8F6F0]/' : ''}`}
                          onClick={() => toggleRow(task.id)}
                        >
                          <TableCell>
                            {expandedRow === task.id ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </TableCell>
                          <TableCell className="font-medium text-[#D4AF37] max-w-[300px]">
                            <div className="truncate" title={task.production_lots?.products?.sku || ''}>{task.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-normal line-clamp-2 leading-snug" title={task.production_lots?.products?.product_name || ''}>{task.production_lots?.products?.product_name || ''}</div>
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">{task.production_lots?.lot_no || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{task.tank_start} - {task.tank_end}</TableCell>
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
                       className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1 px-2"
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
                        <th className="px-3 py-2.5 font-medium text-xs">ถังที่</th>
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
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-amber-400"
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
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-amber-400"
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
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-amber-400"
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
                              placeholder="เลขถัง..."
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-amber-400"
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
                              className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-amber-400"
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
                          if (item.action === 'IN_PROGRESS' || item.action === 'SOAKING' || item.action === 'MIXING') statusColor = "bg-yellow-100 text-yellow-700"
                          if (item.action === 'SENT_TO_QC') statusColor = "bg-sky-100 text-sky-700"
                          if (item.action === 'SENT_TO_PACKING') statusColor = "bg-purple-100 text-purple-700"
                          
                          const statusText = getMixingStatusText(item.action)

                          return (
                            <tr key={`${item.taskId}-${item.tankNum}-${idx}`} className="hover:bg-[#F8F6F0]">
                              <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                                {new Date(item.timestamp).toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-xs">{item.user?.split('@')[0]}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-medium text-xs text-[#D4AF37]">
                                {item.lotNo} <span className="text-slate-400 font-normal text-xs ml-1">({item.sku})</span>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-xs">ถังที่ {item.tankNum}</td>
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
