'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, ChevronDown, ChevronUp, ChevronRight, FlaskConical, History, ClipboardCheck, PackageOpen, Boxes, XCircle, AlertTriangle, CheckCircle2, ShieldCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

export default function QCQueuePage() {
  const [activeTab, setActiveTab] = useState('bulk')
  
  // Bulk State
  const [tasks, setTasks] = useState<any[]>([])
  const [expandedTasks, setExpandedTasks] = useState<string[]>([])
  const [todayHistory, setTodayHistory] = useState<any[]>([])
  
  // FG State
  const [fgInventory, setFgInventory] = useState<any[]>([])
  const [fgTodayHistory, setFgTodayHistory] = useState<any[]>([])
  
  // RM State
  const [rmItems, setRmItems] = useState<any[]>([])
  const [rmTodayHistory, setRmTodayHistory] = useState<any[]>([])
  const [isRmStatusDialogOpen, setIsRmStatusDialogOpen] = useState(false)
  const [activeRm, setActiveRm] = useState<any | null>(null)
  const [rmStatusAction, setRmStatusAction] = useState<'PASSED' | 'QUARANTINED' | 'REJECTED' | 'HOLD' | null>(null)
  
  // PM State
  const [pmTodayHistory, setPmTodayHistory] = useState<any[]>([])
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog State (Bulk)
  const [activeTank, setActiveTank] = useState<{ task: any, tankNum: number } | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isFgStatusDialogOpen, setIsFgStatusDialogOpen] = useState(false)
  const [activeFg, setActiveFg] = useState<any | null>(null)
  const [statusAction, setStatusAction] = useState<'QC_PASS' | 'PAUSED' | 'FAILED' | 'REPROCESS' | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [userRole, setUserRole] = useState('user')

  // --- Sorting & Filtering State ---
  const [dateSort, setDateSort] = useState<'asc' | 'desc' | null>(null)
  const [controlNoSort, setControlNoSort] = useState<'asc' | 'desc' | null>(null)
  const [poSearch, setPoSearch] = useState('')
  const [codeSearch, setCodeSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserRole(data.user.user_metadata?.role || 'user');
        const email = data.user.email;
        if (email) {
          // Extract Employee ID if using the dummy domain
          if (email.endsWith('@cosmediva.local')) {
            setCurrentUser(email.split('@')[0]);
          } else {
            setCurrentUser(email);
          }
        }
      }
    })
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [activeTab])

  const fetchData = () => {
    if (activeTab === 'bulk') {
      fetchTasks()
      fetchTodayHistory()
    } else if (activeTab === 'fg') {
      fetchFgInventory()
      fetchFgTodayHistory()
    } else if (activeTab === 'rm' || activeTab === 'pm') {
      fetchRmTasks()
      fetchRmTodayHistory()
    }
  }

  const downloadCSV = (data: any[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ---- RM LOGIC ----
  const fetchRmTasks = async () => {
    const { data } = await supabase.from('production_lot_rms')
      .select('*, production_lots(lot_no, products:sku_id(sku))')
      .eq('status', 'RECEIVED')
      .order('receive_date', { ascending: false })
      
    if (data) {
      setRmItems(data)
    }
  }

  const openRmDialog = (item: any, action: 'PASSED' | 'REJECTED' | 'HOLD') => {
    setActiveRm(item)
    setRmStatusAction(action)
    setReasonText('')
    setIsRmStatusDialogOpen(true)
  }

  const confirmRmStatus = async () => {
    if (!activeRm || !rmStatusAction) return
    
    // Update rm item
    const updates: any = { qc_status: rmStatusAction }
    if (rmStatusAction === 'PASSED') updates.status = 'READY'
    if (rmStatusAction === 'REJECTED') updates.status = 'REJECTED'
    
    await supabase.from('production_lot_rms').update(updates).eq('id', activeRm.id)
    
    // Create issue if rejected or hold
    if (rmStatusAction === 'REJECTED' || rmStatusAction === 'HOLD') {
      const issueType = rmStatusAction === 'HOLD' ? '[QC HOLD]' : '[QC REJECT]'
      const note = `${issueType} RM/PM [${activeRm.rm_code} - ${activeRm.rm_name}]: ${reasonText}`
      
      const { data: qcProc } = await supabase.from('processes').select('id').ilike('process_name', '%QC%').limit(1).single()
      if (qcProc) {
        await supabase.from('production_logs').insert({
          activity_date: new Date().toISOString().split('T')[0],
          production_lot_id: activeRm.production_lot_id || null,
          process_id: qcProc.id,
          status: 'COMPLETED',
          note: note,
          tank_details: {}
        })
      }
    }
    
    toast.success(`อัปเดตสถานะ QC ของ RM เรียบร้อย`)
    setIsRmStatusDialogOpen(false)
    fetchRmTasks()
    fetchRmTodayHistory()
  }

  const fetchRmTodayHistory = async () => {
    const { data } = await supabase.from('production_lot_rms')
      .select('*, production_lots(lot_no, products:sku_id(sku))')
      .not('qc_status', 'is', null)
      .order('id', { ascending: false })
      .limit(1000)
      
    if (data) {
      setRmTodayHistory(data)
    }
  }

  // ---- BULK LOGIC ----
  const fetchTasks = async () => {
    const { data } = await supabase.from('production_logs')
      .select(`
        id, status, tank_start, tank_end, note, total_tanks, tank_details, activity_date,
        production_lot_id,
        production_lots ( id, lot_no, kg_per_tank, products:sku_id (sku, product_name) ),
        processes ( id, process_name ),
        rooms ( id, room_name )
      `)
      .in('status', ['WAITING', 'IN_PROGRESS', 'PAUSED'])
      .order('created_at', { ascending: true })

    if (data) {
      const qcTasks = data.filter(t => {
        const pName = Array.isArray(t.processes) ? t.processes[0]?.process_name : (t.processes as any)?.process_name
        return pName === 'รอ QC'
      })
      setTasks(qcTasks)
      if (expandedTasks.length === 0 && qcTasks.length > 0) {
        setExpandedTasks([qcTasks[0].id])
      }
    }
  }

  const fetchTodayHistory = async () => {
    const { data } = await supabase.from('production_logs')
      .select(`
        id, status, tank_start, tank_end, total_tanks, tank_details, updated_at,
        production_lot_id,
        production_lots ( id, lot_no, products:sku_id (sku, product_name) ),
        processes ( id, process_name )
      `)
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (data) {
      const historyItems: any[] = []
      data.forEach(task => {
        const pName = Array.isArray(task.processes) ? task.processes[0]?.process_name : (task.processes as any)?.process_name
        if (pName !== 'รอ QC') return
        
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
                  note: h.note,
                  user: h.user,
                  timestamp: h.timestamp
                })
              })
            }
          }
        })
      })
      
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setTodayHistory(historyItems)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedTasks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const handleTankClick = (task: any, tankNum: number, currentStatus: string) => {
    if (userRole !== 'admin' && !currentUser.toUpperCase().startsWith('QC')) {
      toast.error('สิทธิ์ของคุณไม่สามารถแก้ไขสถานะ QC ได้');
      return;
    }
    if (currentStatus === 'LOCKED' || !currentStatus) return
    if (currentStatus === 'FAILED') {
      toast.error('ถังที่ถูก REJECT จะไม่สามารถแก้ไขได้อีก')
      return
    }
    setActiveTank({ task, tankNum })
    setStatusAction(null)
    setReasonText('')
    setIsStatusDialogOpen(true)
  }

  const handleStatusConfirm = async () => {
    if (!activeTank || !statusAction) return

    const { task, tankNum } = activeTank
    const currentStatus = task.tank_details?.[tankNum]
    const isReturningToPass = statusAction === 'QC_PASS' && (currentStatus === 'PAUSED' || currentStatus === 'REPROCESS')

    if ((statusAction !== 'QC_PASS' || isReturningToPass) && !reasonText.trim()) {
      toast.error(isReturningToPass ? 'กรุณาระบุผลการตรวจสอบซ้ำ / วิธีแก้ไข' : 'กรุณาระบุเหตุผล')
      return
    }

    const details = { ...(task.tank_details || {}) }
    const historyKey = `${tankNum}_history`
    const history = [...(details[historyKey] || [])]

    history.push({
      status: statusAction,
      user: currentUser,
      timestamp: new Date().toISOString(),
      note: reasonText.trim()
    })
    
    details[tankNum] = statusAction
    details[historyKey] = history

    const start = parseInt(task.tank_start) || 1
    const end = parseInt(task.tank_end) || start
    let allProcessed = true
    for(let i = start; i <= end; i++) {
      const s = details[i] || 'WAITING'
      if (s === 'WAITING' || s === 'IN_PROGRESS' || s === 'LOCKED' || s === 'PAUSED' || s === 'REPROCESS') {
        allProcessed = false
        break
      }
    }

    try {
      let newStatus = allProcessed ? 'COMPLETED' : 'IN_PROGRESS'
      let newNote = task.note || ''
      const cleanReason = reasonText.replace(/\n/g, ' ')
      
      if (statusAction === 'PAUSED' || statusAction === 'FAILED' || statusAction === 'REPROCESS') {
        newStatus = 'PAUSED'
        const issueType = statusAction === 'PAUSED' ? '[QC HOLD]' : statusAction === 'FAILED' ? '[QC REJECT]' : '[QC REPROCESS]'
        
        const lines = newNote.split('\n')
        let foundActive = false
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`ถัง ${tankNum}:`) && !lines[i].includes('[Resolved') && !lines[i].includes('> [QC PASSED]')) {
                lines[i] = `${lines[i]} > ${issueType} ${cleanReason}`
                foundActive = true
                break
            }
        }
        
        if (!foundActive) {
            newNote = newNote ? `${newNote}\n${issueType} ถัง ${tankNum}: ${cleanReason}` : `${issueType} ถัง ${tankNum}: ${cleanReason}`
        } else {
            newNote = lines.join('\n')
        }
      } else if (statusAction === 'QC_PASS' && isReturningToPass) {
        // Find the active issue line for this tank and append > [QC PASSED] ...
        const lines = newNote.split('\n')
        for (let i = 0; i < lines.length; i++) {
           if (lines[i].includes(`ถัง ${tankNum}:`) && !lines[i].includes('[Resolved') && !lines[i].includes('> [QC PASSED]')) {
               lines[i] = `${lines[i]} > [QC PASSED] ${cleanReason}`
           }
        }
        newNote = lines.join('\n')
        
        // If there are still active issues for OTHER tanks, keep status PAUSED, otherwise IN_PROGRESS
        const hasUnresolved = lines.some((l: string) => l.trim() && !l.includes('[Resolved') && !l.includes('> [QA') && !l.includes('> [QC'))
        if (hasUnresolved && task.status === 'PAUSED') {
            newStatus = 'PAUSED'
        }
      }

      await supabase.from('production_logs').update({
        tank_details: details,
        status: newStatus,
        note: newNote,
        updated_at: new Date().toISOString()
      }).eq('id', task.id)

      if (statusAction === 'QC_PASS') {
        const { data: packProc } = await supabase.from('processes').select('id').eq('process_name', 'บรรจุ').single()
        if (packProc) {
          const { data: existingPack } = await supabase.from('production_logs')
            .select('id, tank_details, status')
            .eq('production_lot_id', task.production_lot_id)
            .eq('process_id', packProc.id)
            .eq('tank_start', task.tank_start)
            .eq('tank_end', task.tank_end)
            .maybeSingle()

          let packDetails = { ...(existingPack?.tank_details || {}) }
          if (!existingPack) {
            for(let k = start; k <= end; k++) {
              packDetails[k] = 'LOCKED'
            }
          }
          packDetails[tankNum] = 'WAITING'
          packDetails[`${tankNum}_history`] = [{
            status: 'WAITING',
            user: currentUser,
            timestamp: new Date().toISOString()
          }]

          if (existingPack) {
            await supabase.from('production_logs').update({
              tank_details: packDetails,
              status: existingPack.status === 'DONE' ? 'DONE' : 'WAITING',
              updated_at: new Date().toISOString()
            }).eq('id', existingPack.id)
          } else {
            await supabase.from('production_logs').insert({
              production_lot_id: task.production_lot_id,
              process_id: packProc.id,
              status: 'WAITING',
              activity_date: new Date().toISOString().split('T')[0],
              tank_start: start,
              tank_end: end,
              total_tanks: task.total_tanks,
              tank_details: packDetails
            })
          }
        }
      }

      const { data: mixProc } = await supabase.from('processes').select('id').eq('process_name', 'ผสม').single()
      if (mixProc) {
        const { data: existingMix } = await supabase.from('production_logs')
          .select('id, tank_details')
          .eq('production_lot_id', task.production_lot_id)
          .eq('process_id', mixProc.id)
          .eq('tank_start', task.tank_start)
          .eq('tank_end', task.tank_end)
          .maybeSingle()
        
        if (existingMix) {
          let mixDetails = { ...(existingMix.tank_details || {}) }
          const mixStatus = statusAction === 'QC_PASS' ? 'SENT_TO_PACKING' : statusAction
          mixDetails[tankNum] = mixStatus
          const mixHistoryKey = `${tankNum}_history`
          const mixHistory = [...(mixDetails[mixHistoryKey] || [])]
          mixHistory.push({
            status: mixStatus,
            user: currentUser,
            timestamp: new Date().toISOString(),
            note: reasonText.trim()
          })
          mixDetails[mixHistoryKey] = mixHistory
          
          let allMixDone = true;
          const mixStart = parseInt(task.tank_start) || 1;
          const mixEnd = parseInt(task.tank_end) || 1;
          for (let i = mixStart; i <= mixEnd; i++) {
             const s = mixDetails[i]?.status || mixDetails[i] || 'WAITING';
             if (s !== 'DONE' && s !== 'SENT_TO_QC' && s !== 'QC_PASS' && s !== 'SENT_TO_PACKING') {
               allMixDone = false; break;
             }
          }
          
          const mixUpdates: any = { 
            tank_details: mixDetails,
            updated_at: new Date().toISOString()
          };
          if (allMixDone) {
             mixUpdates.status = 'DONE';
             // Only set end_time if it's not already set, but we don't fetch it, so let's just set status.
          }
          
          await supabase.from('production_logs').update(mixUpdates).eq('id', existingMix.id)

          if (statusAction === 'QC_PASS') {
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
                
                const currentPackingState = packingDetails[tankNum]?.status || packingDetails[tankNum]
                if (!currentPackingState || currentPackingState === 'LOCKED') {
                   packingDetails[tankNum] = 'WAITING'
                   await supabase.from('production_logs').update({ tank_details: packingDetails }).eq('id', existingPackingLog.id)
                }
              } else {
                const start = parseInt(task.tank_start) || 1
                const end = parseInt(task.tank_end) || 1
                const initialPackingDetails: any = {}
                for(let i=start; i<=end; i++) {
                   initialPackingDetails[i] = (i === Number(tankNum)) ? 'WAITING' : 'LOCKED'
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
        }
      }

      toast.success('บันทึกสถานะเรียบร้อย')
      setIsStatusDialogOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  // ---- FG LOGIC ----
  const fetchFgInventory = async () => {
    const { data } = await supabase.from('fg_inventory')
      .select(`
        id, 
        sku_id, 
        lot_no, 
        box_lot_no, 
        available_qty_pcs, 
        exp_date, 
        qc_status, 
        created_at,
        products:sku_id (sku, product_name)
      `)
      .in('qc_status', ['QUARANTINE'])
      .order('created_at', { ascending: false })

    if (data) {
      setFgInventory(data)
    }
  }

  const fetchFgTodayHistory = async () => {
    const { data } = await supabase.from('fg_inventory')
      .select(`
        id, 
        sku_id, 
        lot_no, 
        box_lot_no, 
        available_qty_pcs, 
        exp_date, 
        qc_status, 
        updated_at,
        products:sku_id(sku, product_name)
      `)
      .neq('qc_status', 'QUARANTINE')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (data) {
      setFgTodayHistory(data)
    }
  }

  const handleFgStatusConfirm = async () => {
    if (!activeFg || !statusAction) return

    if (statusAction !== 'QC_PASS' && !reasonText.trim()) {
      toast.error('กรุณาระบุเหตุผล')
      return
    }

    try {
      let newQcStatus = 'QUARANTINE'
      if (statusAction === 'QC_PASS') newQcStatus = 'RELEASED'
      if (statusAction === 'FAILED') newQcStatus = 'REJECTED'

      // Update FG inventory status
      const { error: fgError } = await supabase.from('fg_inventory').update({ qc_status: newQcStatus }).eq('id', activeFg.id)
      if (fgError) throw fgError

      // Log issue to production_logs if it's an issue
      if (statusAction === 'PAUSED' || statusAction === 'FAILED' || statusAction === 'REPROCESS') {
        const issueType = statusAction === 'PAUSED' ? '[QC HOLD]' : statusAction === 'FAILED' ? '[QC REJECT]' : '[QC REPROCESS]'
        const cleanReason = reasonText.replace(/\n/g, ' ')
        const note = `${issueType} FG (Box ${activeFg.box_lot_no || '-'}): ${cleanReason}`
        
        const { data: qcProc } = await supabase.from('processes').select('id').ilike('process_name', '%QC%').limit(1).single()
        
        if (qcProc) {
          await supabase.from('production_logs').insert({
            activity_date: new Date().toISOString().split('T')[0],
            production_lot_id: null,
            process_id: qcProc.id,
            status: 'COMPLETED',
            note: note,
            tank_details: {}
          })
        }
      }

      toast.success('อัปเดตสถานะ QC เรียบร้อยแล้ว')
      setIsFgStatusDialogOpen(false)
      fetchFgInventory()
      fetchFgTodayHistory()
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    }
  }


  return (
    <div className="p-6 w-full mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <ShieldCheck className="w-8 h-8 text-yellow-400" />
            CosmeFlow Quality
          </h2>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>ศูนย์รวมงานตรวจสอบคุณภาพของทุกกระบวนการผลิต</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Quality You Can Trust. Visibility You Can Share.
            </div>
          </div>
        </div>
        <div className="w-72">
          <Input 
            placeholder="ค้นหา SKU หรือ LOT..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="bulk" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="rm" className="rounded-lg font-medium px-6 py-2">
            คิวตรวจ RM (วัตถุดิบ)
          </TabsTrigger>
          <TabsTrigger value="pm" className="rounded-lg font-medium px-6 py-2">
            คิวตรวจ PM (บรรจุภัณฑ์)
          </TabsTrigger>
          <TabsTrigger value="bulk" className="rounded-lg font-medium px-6 py-2">
            คิวตรวจ Bulk (งานผสม)
          </TabsTrigger>
          <TabsTrigger value="fg" className="rounded-lg font-medium px-6 py-2">
            คิวตรวจ FG (สินค้าสำเร็จรูป)
          </TabsTrigger>
        </TabsList>

        {/* RM / PM Placeholders */}
        <TabsContent value="rm">
          <Tabs defaultValue="queue" className="w-full mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="queue" className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                คิวงานรอตรวจ
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                ประวัติการทำงานแบบต่อเนื่อง
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queue">
              <Card>
            <CardHeader className="border-b bg-[#F8F6F0]">
              <CardTitle className="text-lg flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                รายการวัตถุดิบรอตรวจ (RM)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rmItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  ไม่มีรายการวัตถุดิบรอตรวจ
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left table-fixed">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">SKU / LOT No.</th>
                        <th className="px-4 py-3 font-medium cursor-pointer hover:text-purple-700" onClick={() => {
                          if (dateSort === 'asc') setDateSort('desc');
                          else if (dateSort === 'desc') setDateSort(null);
                          else { setDateSort('asc'); setControlNoSort(null); }
                        }}>
                          <div className="flex items-center space-x-1">
                            <span>วันที่รับเข้า</span>
                            {dateSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : dateSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium text-purple-700 cursor-pointer hover:text-purple-900" onClick={() => {
                          if (controlNoSort === 'asc') setControlNoSort('desc');
                          else if (controlNoSort === 'desc') setControlNoSort(null);
                          else { setControlNoSort('asc'); setDateSort(null); }
                        }}>
                          <div className="flex items-center space-x-1">
                            <span>Control No.</span>
                            {controlNoSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : controlNoSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium w-72">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>รหัส / ชื่อวัตถุดิบ</span>
                            <input type="text" placeholder="ค้นหารหัส..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium">จำนวน</th>
                        <th className="px-4 py-3 font-medium">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>PO No.</span>
                            <input type="text" placeholder="ค้นหา PO..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium">สถานะ QC</th>
                        <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rmItems.filter(item => {
                        const term = searchQuery.toLowerCase()
                        const isPM = item.rm_code?.startsWith('CMD1') || item.rm_code?.startsWith('CMD2')
                        return ((item.rm_code || '').toLowerCase().includes(term) || (item.rm_name || '').toLowerCase().includes(term) || (item.production_lots?.lot_no || '').toLowerCase().includes(term)) && !isPM
                      })
                      .filter(item => poSearch ? (item.po_no || '').toLowerCase().includes(poSearch.toLowerCase()) : true)
                      .filter(item => codeSearch ? (item.rm_code || '').toLowerCase().includes(codeSearch.toLowerCase()) : true)
                      .sort((a, b) => {
                        if (controlNoSort) {
                          const ca = a.control_no || '';
                          const cb = b.control_no || '';
                          return controlNoSort === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
                        }
                        if (dateSort) {
                          const ta = new Date(a.receive_date || 0).getTime();
                          const tb = new Date(b.receive_date || 0).getTime();
                          return dateSort === 'asc' ? ta - tb : tb - ta;
                        }
                        return 0; // maintain original order if no sort is active
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-[#F8F6F0]">
                          <td className="px-4 py-3">
                            <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                          </td>
                          <td className="px-4 py-3">{item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '-'}</td>
                          <td className="px-4 py-3 font-bold text-purple-700">{item.control_no || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="text-indigo-600 font-semibold">{item.rm_code}</span>
                            <div className="text-xs text-slate-500 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                            {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                {item.bottom_remark.split('/')[0].trim()}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3">{item.po_no}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={
                              item.qc_status === 'PASSED' ? 'bg-green-100 text-green-700 border-green-200' :
                              item.qc_status === 'QUARANTINED' || item.qc_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              item.qc_status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-slate-100 text-slate-700'
                            }>
                              {item.qc_status || 'PENDING'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger disabled={userRole !== 'admin' && !currentUser.toUpperCase().startsWith('QC')} className="inline-flex items-center justify-center  rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 disabled:opacity-50 disabled:pointer-events-none">
                                อัปเดตสถานะ <ChevronDown className="w-4 h-4 ml-2" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openRmDialog(item, 'PASSED')} className="text-green-600 font-medium"><CheckCircle2 className="w-4 h-4 mr-2" /> ผ่าน (PASSED)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRmDialog(item, 'HOLD')} className="text-orange-600 font-medium"><AlertTriangle className="w-4 h-4 mr-2" /> กักกัน (HOLD)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRmDialog(item, 'REJECTED')} className="text-red-600 font-medium"><XCircle className="w-4 h-4 mr-2" /> ไม่ผ่าน (REJECTED)</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>ประวัติการตรวจสอบแบบต่อเนื่อง (RM)</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const worksheet = XLSX.utils.json_to_sheet(rmTodayHistory.map((h: any) => {
                          return {
                            'อัปเดตล่าสุด': h.updated_at ? new Date(h.updated_at).toLocaleString('th-TH') : '-',
                            'LOT No.': h.production_lots?.lot_no || '-',
                            'วันที่รับเข้า': h.receive_date ? new Date(h.receive_date).toLocaleDateString('th-TH') : '-',
                            'รหัส': h.rm_code,
                            'ชื่อวัตถุดิบ': h.rm_name,
                            'จำนวน': h.quantity,
                            'หน่วย': h.unit,
                            'PO No.': h.po_no,
                            'สถานะ QC': h.qc_status
                          }
                        }))
                        const workbook = XLSX.utils.book_new()
                        XLSX.utils.book_append_sheet(workbook, worksheet, "QC RM History")
                        XLSX.writeFile(workbook, "QC_RM_History.xlsx")
                    }}
                    disabled={rmTodayHistory.length === 0}
                  >
                    Export Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  {rmTodayHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                      ไม่มีประวัติการตรวจสอบ
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-[#F8F6F0] text-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-medium">SKU / LOT No.</th>
                            <th className="px-4 py-3 font-medium w-72">รหัส / ชื่อวัตถุดิบ</th>
                            <th className="px-4 py-3 font-medium">สถานะ QC</th>
                            <th className="px-4 py-3 font-medium">เวลาอัปเดต</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rmTodayHistory.filter(item => { 
                            const term = searchQuery.toLowerCase(); 
                            const isPM = item.rm_code?.startsWith('CMD1') || item.rm_code?.startsWith('CMD2');
                            return ((item.rm_code || "").toLowerCase().includes(term) || (item.production_lots?.lot_no || "").toLowerCase().includes(term)) && !isPM; 
                          }).map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#F8F6F0]">
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-indigo-600 font-semibold">{item.rm_code}</span>
                                <div className="text-xs text-slate-500 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                                {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                                  <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                    {item.bottom_remark.split('/')[0].trim()}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={
                                  item.qc_status === 'PASSED' ? 'bg-green-100 text-green-700 border-green-200' :
                                  item.qc_status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                                  'bg-yellow-100 text-yellow-700 border-yellow-200'
                                }>
                                  {item.qc_status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {item.updated_at ? new Date(item.updated_at).toLocaleTimeString('th-TH') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="pm">
          <Tabs defaultValue="queue" className="w-full mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="queue" className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                คิวงานรอตรวจ
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                ประวัติการทำงานแบบต่อเนื่อง
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queue">
              <Card>
                <CardHeader className="border-b bg-[#F8F6F0]">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PackageOpen className="w-5 h-5 text-purple-600" />
                    รายการบรรจุภัณฑ์รอตรวจ (PM)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {rmItems.filter(i => i.rm_code?.startsWith('CMD1') || i.rm_code?.startsWith('CMD2')).length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      ไม่มีรายการบรรจุภัณฑ์รอตรวจ
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-medium">ประเภท</th>
                            <th className="px-4 py-3 font-medium">SKU / LOT No.</th>
                            <th className="px-4 py-3 font-medium cursor-pointer hover:text-purple-700" onClick={() => {
                              if (dateSort === 'asc') setDateSort('desc');
                              else if (dateSort === 'desc') setDateSort(null);
                              else { setDateSort('asc'); setControlNoSort(null); }
                            }}>
                              <div className="flex items-center space-x-1">
                                <span>วันที่รับเข้า</span>
                                {dateSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : dateSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                              </div>
                            </th>
                            <th className="px-4 py-3 font-medium text-purple-700 cursor-pointer hover:text-purple-900" onClick={() => {
                              if (controlNoSort === 'asc') setControlNoSort('desc');
                              else if (controlNoSort === 'desc') setControlNoSort(null);
                              else { setControlNoSort('asc'); setDateSort(null); }
                            }}>
                              <div className="flex items-center space-x-1">
                                <span>Control No.</span>
                                {controlNoSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : controlNoSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                              </div>
                            </th>
                            <th className="px-4 py-3 font-medium w-72">
                              <div className="flex flex-col space-y-1 mt-1 mb-1">
                                <span>รหัส / ชื่อบรรจุภัณฑ์</span>
                                <input type="text" placeholder="ค้นหารหัส..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
                              </div>
                            </th>
                            <th className="px-4 py-3 font-medium">จำนวน</th>
                            <th className="px-4 py-3 font-medium">สถานะ QC</th>
                            <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rmItems.filter(item => {
                            const term = searchQuery.toLowerCase()
                            const isPM = item.rm_code?.startsWith('CMD1') || item.rm_code?.startsWith('CMD2')
                            return ((item.rm_code || '').toLowerCase().includes(term) || (item.rm_name || '').toLowerCase().includes(term) || (item.production_lots?.lot_no || '').toLowerCase().includes(term)) && isPM
                          })
                          .filter(item => codeSearch ? (item.rm_code || '').toLowerCase().includes(codeSearch.toLowerCase()) : true)
                          .sort((a, b) => {
                            if (controlNoSort) {
                              const ca = a.control_no || '';
                              const cb = b.control_no || '';
                              return controlNoSort === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
                            }
                            if (dateSort) {
                              const ta = new Date(a.receive_date || 0).getTime();
                              const tb = new Date(b.receive_date || 0).getTime();
                              return dateSort === 'asc' ? ta - tb : tb - ta;
                            }
                            return 0;
                          })
                          .map((item) => (
                            <tr key={item.id} className="hover:bg-[#F8F6F0]">
                              <td className="px-4 py-3">
                                {item.rm_code?.startsWith('CMD2') ? (
                                  <Badge className="bg-pink-100 text-pink-700 border-pink-200" variant="outline">[CMD2]</Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200" variant="outline">[CMD1]</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                              </td>
                              <td className="px-4 py-3">{item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '-'}</td>
                              <td className="px-4 py-3 font-bold text-purple-700">{item.control_no || '-'}</td>
                              <td className="px-4 py-3">
                                <span className="text-purple-600 font-semibold">{item.rm_code}</span>
                                <div className="text-xs text-slate-500 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                                {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                                  <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                    {item.bottom_remark.split('/')[0].trim()}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={
                                  item.qc_status === 'PASSED' ? 'bg-green-100 text-green-700 border-green-200' :
                                  item.qc_status === 'QUARANTINED' || item.qc_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                  item.qc_status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                                  'bg-slate-100 text-slate-700'
                                }>
                                  {item.qc_status || 'PENDING'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger disabled={userRole !== 'admin' && !currentUser.toUpperCase().startsWith('QC')} className="inline-flex items-center justify-center  rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 disabled:opacity-50 disabled:pointer-events-none">
                                    อัปเดตสถานะ <ChevronDown className="w-4 h-4 ml-2" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openRmDialog(item, 'PASSED')} className="text-green-600 font-medium"><CheckCircle2 className="w-4 h-4 mr-2" /> ผ่าน (PASSED)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openRmDialog(item, 'HOLD')} className="text-orange-600 font-medium"><AlertTriangle className="w-4 h-4 mr-2" /> กักกัน (HOLD)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openRmDialog(item, 'REJECTED')} className="text-red-600 font-medium"><XCircle className="w-4 h-4 mr-2" /> ไม่ผ่าน (REJECTED)</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>ประวัติการตรวจสอบแบบต่อเนื่อง (PM)</CardTitle>
                </CardHeader>
                <CardContent>
                  {rmTodayHistory.filter(i => i.rm_code?.startsWith('CMD1') || i.rm_code?.startsWith('CMD2')).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                      ไม่มีประวัติการตรวจสอบ
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-[#F8F6F0] text-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-medium">SKU / LOT No.</th>
                            <th className="px-4 py-3 font-medium">รหัส / ชื่อบรรจุภัณฑ์</th>
                            <th className="px-4 py-3 font-medium">สถานะ QC</th>
                            <th className="px-4 py-3 font-medium">เวลาอัปเดต</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rmTodayHistory.filter(item => { 
                            const term = searchQuery.toLowerCase(); 
                            const isPM = item.rm_code?.startsWith('CMD1') || item.rm_code?.startsWith('CMD2');
                            return ((item.rm_code || "").toLowerCase().includes(term) || (item.production_lots?.lot_no || "").toLowerCase().includes(term)) && isPM; 
                          }).map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#F8F6F0]">
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                              </td>
                              <td className="px-4 py-3">
                                {item.rm_code?.startsWith('CMD2') ? (
                                  <Badge className="bg-pink-100 text-pink-700 border-pink-200 mb-1" variant="outline">[CMD2]</Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-1" variant="outline">[CMD1]</Badge>
                                )}
                                <span className="text-purple-600 font-semibold ml-2">{item.rm_code}</span>
                                <div className="text-xs text-slate-500 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                                {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                                  <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                    {item.bottom_remark.split('/')[0].trim()}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={
                                  item.qc_status === 'PASSED' ? 'bg-green-100 text-green-700 border-green-200' :
                                  item.qc_status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                                  'bg-yellow-100 text-yellow-700 border-yellow-200'
                                }>
                                  {item.qc_status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {item.updated_at ? new Date(item.updated_at).toLocaleTimeString('th-TH') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* BULK TAB */}
        <TabsContent value="bulk">
          <Tabs defaultValue="queue" className="w-full mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="queue" className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                คิวงานรอตรวจ
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                ประวัติการทำงานแบบต่อเนื่อง
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queue">
              <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                ไม่มีรายการรอตรวจ
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left table-fixed">
                    <thead className="bg-[#F8F6F0] text-[#8B7355] border-b border-[#D4AF37]/20">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>สินค้า / SKU</span>
                            <input type="text" placeholder="ค้นหา SKU..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium">LOT No.</th>
                        <th className="px-4 py-3 font-medium">ถังที่ (ตามแผน)</th>
                        <th className="px-4 py-3 font-medium">จำนวนถัง (รวม)</th>
                        <th className="px-4 py-3 font-medium">Bulk size (kg/ถัง)</th>
                        <th className="px-4 py-3 font-medium cursor-pointer hover:text-purple-700" onClick={() => {
                          if (dateSort === 'asc') setDateSort('desc');
                          else if (dateSort === 'desc') setDateSort(null);
                          else { setDateSort('asc'); }
                        }}>
                          <div className="flex items-center space-x-1">
                            <span>วันที่จัดทำ (แผน)</span>
                            {dateSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : dateSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium">สถานะ QC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tasks.filter(task => {
                        const term = searchQuery.toLowerCase()
                        const sku = (task.production_lots?.products?.sku || '').toLowerCase()
                        const lotNo = (task.production_lots?.lot_no || '').toLowerCase()
                        return sku.includes(term) || lotNo.includes(term)
                      })
                      .filter(task => {
                        if (!codeSearch) return true;
                        const sku = (task.production_lots?.products?.sku || '').toLowerCase()
                        return sku.includes(codeSearch.toLowerCase())
                      })
                      .sort((a, b) => {
                        if (dateSort) {
                          const ta = new Date(a.activity_date || 0).getTime();
                          const tb = new Date(b.activity_date || 0).getTime();
                          return dateSort === 'asc' ? ta - tb : tb - ta;
                        }
                        return 0;
                      })
                      .map(task => {
                        const isExpanded = expandedTasks.includes(task.id)
                        const lotNo = task.production_lots?.lot_no || '-'
                        const sku = task.production_lots?.products?.sku || '-'
                        const productName = task.production_lots?.products?.product_name || ''
                        const start = parseInt(task.tank_start) || 1
                        const end = parseInt(task.tank_end) || start
                        const total = parseInt(task.total_tanks) || end
                        const details = task.tank_details || {}
                        const kgPerTank = task.production_lots?.kg_per_tank || '-'
                        
                        let qcDoneCount = 0
                        for(let i = start; i <= end; i++) {
                          const st = details[i]
                          if (st === 'QC_PASS' || st === 'FAILED' || st === 'PAUSED' || st === 'REPROCESS') {
                            qcDoneCount++
                          }
                        }
                        const totalInBatch = end - start + 1
                        
                        return (
                          <React.Fragment key={task.id}>
                            <tr 
                              className={`hover:bg-[#F8F6F0] cursor-pointer transition-colors ${isExpanded ? 'bg-[#F8F6F0]' : ''}`}
                              onClick={() => toggleExpand(task.id)}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  <div>
                                    <div className="font-semibold text-violet-600">{sku}</div>
                                    <div className="text-xs text-slate-500 line-clamp-2 break-words text-wrap max-w-[200px]">{productName}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium">{lotNo}</td>
                              <td className="px-4 py-3 text-slate-600">{start} - {end}</td>
                              <td className="px-4 py-3 text-slate-600">{totalInBatch} ถัง</td>
                              <td className="px-4 py-3 text-slate-600">{kgPerTank} kg</td>
                              <td className="px-4 py-3 text-slate-600">
                                {task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] ">
                                  ตรวจแล้ว {qcDoneCount}/{totalInBatch}
                                </Badge>
                              </td>
                            </tr>
                            
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0 border-b-2 border-[#D4AF37]/30">
                                  <div className="p-6 bg-[#F8F6F0] shadow-inner">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                                      <FlaskConical className="w-5 h-5 text-[#D4AF37]" />
                                      สถานะ QC ถังที่ {start} ถึง {end} (จากทั้งหมด {total} ถัง)
                                    </h4>
                                    <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
                                      {Array.from({ length: totalInBatch }).map((_, idx) => {
                                        const t = start + idx
                                        const tankStatus = details[t] || 'LOCKED'
                                        let color = "text-slate-300 bg-white border-slate-200 opacity-60 cursor-not-allowed"
                                        let animate = ""
                                        if (tankStatus === 'WAITING' || tankStatus === 'IN_PROGRESS') { color = "text-yellow-600 bg-yellow-50 border-yellow-300 shadow-sm cursor-pointer hover:bg-yellow-100 hover:scale-105"; animate = "animate-pulse" }
                                        else if (tankStatus === 'QC_PASS') { color = "text-green-600 bg-green-50 border-green-300 shadow-sm cursor-pointer hover:bg-green-100 hover:scale-105" }
                                        else if (tankStatus === 'PAUSED') { color = "text-orange-600 bg-orange-50 border-orange-300 shadow-sm cursor-pointer hover:bg-orange-100 hover:scale-105" }
                                        else if (tankStatus === 'FAILED') { color = "text-red-600 bg-red-50 border-red-300 shadow-sm cursor-pointer hover:bg-red-100 hover:scale-105" }
                                        else if (tankStatus === 'REPROCESS') { color = "text-purple-600 bg-purple-50 border-purple-300 shadow-sm cursor-pointer hover:bg-purple-100 hover:scale-105" }

                                        const history = details[`${t}_history`] || []
                                        const tooltipContent = history.length > 0 ? (
                                          <div className="space-y-1">
                                            <p className="font-semibold text-[#4A4238]/ border-b border-slate-700 pb-1 mb-2">ประวัติถัง {t}</p>
                                            {history.map((h: any, i: number) => {
                                              let statusText = h.status
                                              let badgeColor = 'bg-slate-700 text-slate-100'
                                              if (h.status === 'WAITING' || h.status === 'IN_PROGRESS') { statusText = 'รอตรวจ'; badgeColor = 'bg-yellow-600 text-white' }
                                              if (h.status === 'QC_PASS') { statusText = 'PASS (ผ่าน)'; badgeColor = 'bg-green-500 text-white' }
                                              if (h.status === 'PAUSED') { statusText = 'HOLD (กัก)'; badgeColor = 'bg-orange-500 text-white' }
                                              if (h.status === 'FAILED') { statusText = 'REJECT (ไม่ผ่าน)'; badgeColor = 'bg-red-500 text-white' }
                                              if (h.status === 'REPROCESS') { statusText = 'REPROCESS (ตีกลับ)'; badgeColor = 'bg-purple-500 text-white' }
                                              if (h.status === 'SENT_TO_QC') { statusText = 'ส่ง QC'; badgeColor = 'bg-teal-500 text-white' }
                                              if (h.status === 'MX ส่ง QC') { statusText = 'MX ส่ง QC'; badgeColor = 'bg-indigo-500 text-white' }
                                              return (
                                                <div key={i} className="flex flex-col mb-2 bg-slate-800 p-1.5 rounded">
                                                  <div className="flex items-center justify-between gap-2">
                                                    <Badge variant="outline" className={`text-[10px] border-none px-1 py-0 ${badgeColor}`}>{statusText}</Badge>
                                                    <span className="text-[10px] text-slate-300 shrink-0">{new Date(h.timestamp).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1 mt-1 text-slate-400">
                                                    <User className="w-3 h-3 shrink-0" />
                                                    <span className="text-[10px] line-clamp-2 break-words text-wrap max-w-[120px]">{h.user}</span>
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
                                                <div onClick={() => handleTankClick(task, t, tankStatus)} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${color} ${animate}`}>
                                                  <FlaskConical className="w-8 h-8 mb-1" />
                                                  <span className="text-xs font-bold text-slate-700">ถัง {t}</span>
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
                                                <TooltipContent side="top" className="w-56 p-3 bg-[#2D2721] border-[#2D2721] text-white shadow-xl z-[100] max-h-64 overflow-y-auto">
                                                  {tooltipContent}
                                                </TooltipContent>
                                              )}
                                            </Tooltip>
                                          </TooltipProvider>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>ประวัติการตรวจสอบแบบต่อเนื่อง (Bulk)</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const csvData = [
                        ["รหัสสินค้า", "LOT No.", "ถังที่", "สถานะ QC", "เวลาอัปเดต", "ผู้ทำรายการ", "หมายเหตุ"],
                        ...todayHistory.flatMap(h => {
                          const tankNum = h.tank;
                          return [[
                            h.sku,
                            h.lot,
                            tankNum,
                            h.status,
                            new Date(h.timestamp).toLocaleString('th-TH'),
                            h.user?.split('@')[0] || h.user,
                            h.note || ''
                          ]]
                        })
                      ]
                      downloadCSV(csvData, `bulk_qc_history_${new Date().toISOString().split('T')[0]}.csv`)
                    }}
                    disabled={todayHistory.length === 0}
                  >
                    Export Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  {todayHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                      ไม่มีประวัติการตรวจสอบ
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-[#F8F6F0] text-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-medium">เวลา</th>
                            <th className="px-4 py-3 font-medium">ผู้ตรวจสอบ</th>
                            <th className="px-4 py-3 font-medium">LOT No.</th>
                            <th className="px-4 py-3 font-medium">ถังที่</th>
                            <th className="px-4 py-3 font-medium">สถานะ</th>
                            <th className="px-4 py-3 font-medium">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {todayHistory.filter(item => { const term = searchQuery.toLowerCase(); return (item.sku || "").toLowerCase().includes(term) || (item.lotNo || "").toLowerCase().includes(term); }).map((item, idx) => {
                            let statusColor = "bg-slate-100 text-slate-700"
                            if (item.action === 'QC_PASS') statusColor = "bg-green-100 text-green-700"
                            if (item.action === 'PAUSED') statusColor = "bg-orange-100 text-orange-700"
                            if (item.action === 'FAILED') statusColor = "bg-red-100 text-red-700"
                            if (item.action === 'REPROCESS') statusColor = "bg-purple-100 text-purple-700"
                            if (item.action === 'MX ส่ง QC') statusColor = "bg-indigo-100 text-indigo-700"

                            return (
                              <tr key={`${item.taskId}-${item.tankNum}-${idx}`} className="hover:bg-[#F8F6F0]">
                                <td className="px-4 py-3 ">{new Date(item.timestamp).toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-4 py-3 ">{item.user?.split('@')[0] || item.user}</td>
                                <td className="px-4 py-3  font-medium text-[#D4AF37]">
                                  {item.lotNo} <span className="text-slate-400 font-normal text-xs ml-1">({item.sku})</span>
                                </td>
                                <td className="px-4 py-3  font-semibold">ถังที่ {item.tankNum}</td>
                                <td className="px-4 py-3 ">
                                  <Badge variant="secondary" className={statusColor}>{item.action}</Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-600 line-clamp-2 break-words text-wrap max-w-xs">{item.note || '-'}</td>
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
        </TabsContent>

        {/* FG TAB */}
        <TabsContent value="fg">
          <Tabs defaultValue="queue" className="w-full mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="queue" className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                คิวงานรอตรวจ
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                ประวัติการทำงานแบบต่อเนื่อง
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queue">
              <Card>
                <CardHeader>
              <CardTitle>คิวงานรอตรวจ FG (กักกัน)</CardTitle>
            </CardHeader>
            <CardContent>
              {fgInventory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                  ไม่มีรายการรอตรวจ FG ในคลัง
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm text-left table-fixed">
                    <thead className="bg-[#F8F6F0] text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>สินค้า / SKU</span>
                            <input type="text" placeholder="ค้นหา SKU..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium">LOT No.</th>
                        <th className="px-4 py-3 font-medium">Box Lot</th>
                        <th className="px-4 py-3 font-medium">จำนวน (ชิ้น)</th>
                        <th className="px-4 py-3 font-medium cursor-pointer hover:text-purple-700" onClick={() => {
                          if (dateSort === 'asc') setDateSort('desc');
                          else if (dateSort === 'desc') setDateSort(null);
                          else { setDateSort('asc'); }
                        }}>
                          <div className="flex items-center space-x-1">
                            <span>เวลาที่รับเข้า</span>
                            {dateSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : dateSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">ดำเนินการ (QC)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fgInventory.filter(item => {
                        const term = searchQuery.toLowerCase()
                        const sku = (item.products?.sku || '').toLowerCase()
                        const lotNo = (item.lot_no || '').toLowerCase()
                        return sku.includes(term) || lotNo.includes(term)
                      })
                      .filter(item => {
                        if (!codeSearch) return true;
                        const sku = (item.products?.sku || '').toLowerCase()
                        return sku.includes(codeSearch.toLowerCase())
                      })
                      .sort((a, b) => {
                        if (dateSort) {
                          const ta = new Date(a.created_at || 0).getTime();
                          const tb = new Date(b.created_at || 0).getTime();
                          return dateSort === 'asc' ? ta - tb : tb - ta;
                        }
                        return 0;
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-[#F8F6F0]">
                          <td className="px-4 py-3 font-medium text-[#D4AF37]">
                            {item.products?.sku}
                            <div className="text-xs font-normal text-slate-500 mt-1 line-clamp-1">{item.products?.product_name}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{item.lot_no}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-slate-100 border-slate-300 text-slate-700">
                              {item.box_lot_no || '-'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {item.available_qty_pcs.toLocaleString()} <span className="text-slate-400 font-normal">ชิ้น</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(item.created_at).toLocaleString('th-TH')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button disabled={userRole !== 'admin' && !currentUser.toUpperCase().startsWith('QC')} size="sm" variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-700 disabled:opacity-50" onClick={() => {
                              setActiveFg(item)
                              setStatusAction(null)
                              setReasonText('')
                              setIsFgStatusDialogOpen(true)
                            }}>
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              อัปเดตสถานะ
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>ประวัติการตรวจสอบแบบต่อเนื่อง (FG)</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const csvData = [
                        ["สินค้า / SKU", "ชื่อสินค้า", "LOT No.", "Box Lot", "จำนวน (ชิ้น)", "สถานะ QC", "เวลาอัปเดต"],
                        ...fgTodayHistory.map(h => [
                          h.products?.sku || '-',
                          h.products?.product_name || '-',
                          h.lot_no,
                          h.box_lot_no || '-',
                          h.available_qty_pcs,
                          h.qc_status,
                          h.updated_at ? new Date(h.updated_at).toLocaleString('th-TH') : '-'
                        ])
                      ]
                      downloadCSV(csvData, `fg_qc_history_${new Date().toISOString().split('T')[0]}.csv`)
                    }}
                    disabled={fgTodayHistory.length === 0}
                  >
                    Export Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  {fgTodayHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                      ไม่มีประวัติการตรวจสอบ
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-[#F8F6F0] text-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-medium">สินค้า / SKU</th>
                            <th className="px-4 py-3 font-medium">LOT No.</th>
                            <th className="px-4 py-3 font-medium">Box Lot</th>
                            <th className="px-4 py-3 font-medium">สถานะ QC</th>
                            <th className="px-4 py-3 font-medium">เวลาอัปเดต</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fgTodayHistory.filter(item => { const term = searchQuery.toLowerCase(); return (item.products?.sku || "").toLowerCase().includes(term) || (item.lot_no || "").toLowerCase().includes(term); }).map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#F8F6F0]">
                              <td className="px-4 py-3 font-medium text-[#D4AF37]">
                                {item.products?.sku}
                                <div className="text-xs font-normal text-slate-500 mt-1 line-clamp-1">{item.products?.product_name}</div>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700">{item.lot_no}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="bg-slate-100 border-slate-300 text-slate-700">
                                  {item.box_lot_no || '-'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={
                                  item.qc_status === 'RELEASED' ? 'bg-green-100 text-green-700 border-green-200' :
                                  item.qc_status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                                  'bg-slate-100 text-slate-700'
                                }>
                                  {item.qc_status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {item.updated_at ? new Date(item.updated_at).toLocaleTimeString('th-TH') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Status Dialog (Bulk) */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>อัปเดตสถานะ QC Bulk (ถังที่ {activeTank?.tankNum})</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant={statusAction === 'QC_PASS' ? 'default' : 'outline'} 
                className={`${statusAction === 'QC_PASS' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:text-green-600'}`}
                onClick={() => setStatusAction('QC_PASS')}
              >
                PASS (ผ่าน)
              </Button>
              <Button 
                variant={statusAction === 'PAUSED' ? 'default' : 'outline'} 
                className={`${statusAction === 'PAUSED' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'hover:bg-orange-50 hover:text-orange-500'}`}
                onClick={() => setStatusAction('PAUSED')}
              >
                HOLD (กัก)
              </Button>
              <Button 
                variant={statusAction === 'FAILED' ? 'default' : 'outline'} 
                className={`${statusAction === 'FAILED' ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-red-50 hover:text-red-500'}`}
                onClick={() => setStatusAction('FAILED')}
              >
                REJECT (ไม่ผ่าน)
              </Button>
              <Button 
                variant={statusAction === 'REPROCESS' ? 'default' : 'outline'} 
                className={`${statusAction === 'REPROCESS' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'hover:bg-purple-50 hover:text-purple-500'}`}
                onClick={() => setStatusAction('REPROCESS')}
              >
                REPROCESS (แก้)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>
                หมายเหตุ / เหตุผล / วิธีแก้ไข <span className="text-red-500">{(statusAction !== 'QC_PASS' || (statusAction === 'QC_PASS' && (activeTank?.task?.tank_details?.[activeTank.tankNum] === 'PAUSED' || activeTank?.task?.tank_details?.[activeTank.tankNum] === 'REPROCESS'))) && '*'}</span>
              </Label>
              <Textarea 
                placeholder={
                  statusAction === 'QC_PASS' && (activeTank?.task?.tank_details?.[activeTank.tankNum] === 'PAUSED' || activeTank?.task?.tank_details?.[activeTank.tankNum] === 'REPROCESS')
                    ? "ระบุวิธีแก้ไข หรือผลการตรวจสอบซ้ำ (บังคับกรอกเมื่อกลับมา PASS)"
                    : "ระบุเหตุผล (บังคับกรอกกรณี HOLD, REJECT, REPROCESS)"
                }
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleStatusConfirm} disabled={!statusAction} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">
              บันทึกสถานะ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog (FG) */}
      <Dialog open={isFgStatusDialogOpen} onOpenChange={setIsFgStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>อัปเดตสถานะ QC FG (Box: {activeFg?.box_lot_no || '-'})</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant={statusAction === 'QC_PASS' ? 'default' : 'outline'} 
                className={`${statusAction === 'QC_PASS' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:text-green-600'}`}
                onClick={() => setStatusAction('QC_PASS')}
              >
                PASS (ผ่าน)
              </Button>
              <Button 
                variant={statusAction === 'PAUSED' ? 'default' : 'outline'} 
                className={`${statusAction === 'PAUSED' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'hover:bg-orange-50 hover:text-orange-500'}`}
                onClick={() => setStatusAction('PAUSED')}
              >
                HOLD (กัก)
              </Button>
              <Button 
                variant={statusAction === 'FAILED' ? 'default' : 'outline'} 
                className={`${statusAction === 'FAILED' ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-red-50 hover:text-red-500'}`}
                onClick={() => setStatusAction('FAILED')}
              >
                REJECT (ไม่ผ่าน)
              </Button>
              <Button 
                variant={statusAction === 'REPROCESS' ? 'default' : 'outline'} 
                className={`${statusAction === 'REPROCESS' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'hover:bg-purple-50 hover:text-purple-500'}`}
                onClick={() => setStatusAction('REPROCESS')}
              >
                REPROCESS (แก้)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>
                หมายเหตุ / เหตุผล / วิธีแก้ไข <span className="text-red-500">{statusAction !== 'QC_PASS' && '*'}</span>
              </Label>
              <Textarea 
                placeholder="ระบุเหตุผล (บังคับกรอกกรณี HOLD, REJECT, REPROCESS)"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFgStatusDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleFgStatusConfirm} disabled={!statusAction} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">
              บันทึกสถานะ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Status Dialog (RM) */}
      <Dialog open={isRmStatusDialogOpen} onOpenChange={setIsRmStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>อัปเดตสถานะ QC วัตถุดิบ (RM: {activeRm?.rm_code || '-'})</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label>
                หมายเหตุ / เหตุผล <span className="text-red-500">{rmStatusAction !== 'PASSED' && '*'}</span>
              </Label>
              <Textarea 
                placeholder="ระบุเหตุผล หรือ หมายเหตุเพิ่มเติม (บังคับกรอกกรณี HOLD หรือ REJECTED)"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRmStatusDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={confirmRmStatus} disabled={!rmStatusAction || (rmStatusAction !== 'PASSED' && !reasonText)} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">
              ยืนยัน ({rmStatusAction})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
