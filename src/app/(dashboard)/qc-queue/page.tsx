'use client'

import { useState, useEffect } from 'react'
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
import { User, ChevronDown, ChevronUp, FlaskConical, History, ClipboardCheck, PackageOpen, Boxes, XCircle, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        const email = data.user.email;
        // Extract Employee ID if using the dummy domain
        if (email.endsWith('@cosmediva.local')) {
          setCurrentUser(email.split('@')[0]);
        } else {
          setCurrentUser(email);
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
    } else if (activeTab === 'rm') {
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
      .select('*, production_lots(lot_no, sku_id)')
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
      await supabase.from('production_issues').insert({
        production_lot_id: activeRm.production_lot_id,
        issue_type: 'QC_REJECT',
        description: `RM QC [${activeRm.rm_code} - ${activeRm.rm_name}]: ${rmStatusAction}\nหมายเหตุ: ${reasonText}`,
        reported_by: currentUser,
        status: 'OPEN',
        priority: 'HIGH'
      })
    }
    
    toast.success(`อัปเดตสถานะ QC ของ RM เรียบร้อย`)
    setIsRmStatusDialogOpen(false)
    fetchRmTasks()
    fetchRmTodayHistory()
  }

  const fetchRmTodayHistory = async () => {
    const { data } = await supabase.from('production_lot_rms')
      .select('*, production_lots(lot_no, sku_id)')
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
        id, status, tank_start, tank_end, note, total_tanks, tank_details,
        production_lot_id,
        production_lots ( id, lot_no, products:sku_id (sku) ),
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
      
      if (statusAction === 'PAUSED' || statusAction === 'FAILED' || statusAction === 'REPROCESS') {
        newStatus = 'PAUSED'
        const issueType = statusAction === 'PAUSED' ? '[QC HOLD]' : statusAction === 'FAILED' ? '[QC REJECT]' : '[QC REPROCESS]'
        const cleanReason = reasonText.replace(/\n/g, ' ')
        newNote = newNote ? `${newNote}\n${issueType} ถัง ${tankNum}: ${cleanReason}` : `${issueType} ถัง ${tankNum}: ${cleanReason}`
      }

      await supabase.from('production_logs').update({
        tank_details: details,
        status: newStatus,
        note: newNote
      }).eq('id', task.id)

      if (statusAction === 'QC_PASS') {
        const { data: packProc } = await supabase.from('processes').select('id').ilike('process_name', '%บรรจุ%').limit(1).single()
        if (packProc) {
          const { data: existingPack } = await supabase.from('production_logs')
            .select('id, tank_details')
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
              tank_details: packDetails
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

      const { data: mixProc } = await supabase.from('processes').select('id').ilike('process_name', '%ผสม%').limit(1).single()
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
          
          const mixUpdates: any = { tank_details: mixDetails };
          if (allMixDone) {
             mixUpdates.status = 'DONE';
             // Only set end_time if it's not already set, but we don't fetch it, so let's just set status.
          }
          
          await supabase.from('production_logs').update(mixUpdates).eq('id', existingMix.id)
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
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
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
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">LOT No.</th>
                        <th className="px-4 py-3 font-medium">วันที่รับเข้า</th>
                        <th className="px-4 py-3 font-medium">รหัส / ชื่อวัตถุดิบ</th>
                        <th className="px-4 py-3 font-medium">จำนวน</th>
                        <th className="px-4 py-3 font-medium">PO No.</th>
                        <th className="px-4 py-3 font-medium">สถานะ QC</th>
                        <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rmItems.filter(item => {
                        const term = searchQuery.toLowerCase()
                        return (item.rm_code || '').toLowerCase().includes(term) || (item.rm_name || '').toLowerCase().includes(term) || (item.production_lots?.lot_no || '').toLowerCase().includes(term)
                      }).map((item) => (
                        <tr key={item.id} className="hover:bg-[#F8F6F0]">
                          <td className="px-4 py-3 font-medium">{item.production_lots?.lot_no || '-'}</td>
                          <td className="px-4 py-3">{item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '-'}</td>
                          <td className="px-4 py-3">
                            <span className="text-indigo-600 font-semibold">{item.rm_code}</span>
                            <div className="text-xs text-slate-500">{item.rm_name}</div>
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
                              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
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
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#F8F6F0] text-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-medium">LOT No.</th>
                            <th className="px-4 py-3 font-medium">รหัส / ชื่อวัตถุดิบ</th>
                            <th className="px-4 py-3 font-medium">สถานะ QC</th>
                            <th className="px-4 py-3 font-medium">เวลาอัปเดต</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rmTodayHistory.filter(item => { const term = searchQuery.toLowerCase(); return (item.rm_code || "").toLowerCase().includes(term) || (item.production_lots?.lot_no || "").toLowerCase().includes(term); }).map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#F8F6F0]">
                              <td className="px-4 py-3 font-medium">{item.production_lots?.lot_no || '-'}</td>
                              <td className="px-4 py-3">
                                <span className="text-indigo-600 font-semibold">{item.rm_code}</span>
                                <div className="text-xs text-slate-500">{item.rm_name}</div>
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
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                  <PackageOpen className="w-16 h-16 mb-4 text-slate-300" />
                  <h3 className="text-xl font-bold mb-2">ระบบตรวจบรรจุภัณฑ์ (PM)</h3>
                  <p>รองรับการเชื่อมต่อกับระบบตรวจสอบคุณภาพบรรจุภัณฑ์ในอนาคต</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>ประวัติการตรวจสอบแบบต่อเนื่อง (PM)</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // no data for PM yet
                      toast.error('ไม่มีข้อมูลให้ Export')
                    }}
                    disabled={pmTodayHistory.length === 0}
                  >
                    Export Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                    ไม่มีประวัติการตรวจสอบ
                  </div>
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
              tasks.filter(task => {
                const term = searchQuery.toLowerCase()
                const sku = (task.production_lots?.products?.sku || '').toLowerCase()
                const lotNo = (task.production_lots?.lot_no || '').toLowerCase()
                return sku.includes(term) || lotNo.includes(term)
              }).map(task => {
                const isExpanded = expandedTasks.includes(task.id)
                const lotNo = task.production_lots?.lot_no || '-'
                const sku = task.production_lots?.products?.sku || '-'
                const start = parseInt(task.tank_start) || 1
                const end = parseInt(task.tank_end) || start
                const total = parseInt(task.total_tanks) || end
                const details = task.tank_details || {}
                
                let qcDoneCount = 0
                for(let i = start; i <= end; i++) {
                  const st = details[i]
                  if (st === 'QC_PASS' || st === 'FAILED' || st === 'PAUSED' || st === 'REPROCESS') {
                    qcDoneCount++
                  }
                }
                const totalInBatch = end - start + 1

                return (
                  <Card key={task.id} className="overflow-visible">
                    <CardHeader 
                      className="flex flex-row items-center justify-between py-4 cursor-pointer hover:bg-[#F8F6F0] transition-colors"
                      onClick={() => toggleExpand(task.id)}
                    >
                      <div className="flex items-center gap-6">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        <div>
                          <CardTitle className="text-lg text-slate-700 flex items-center gap-3">
                            <span className="text-violet-600">{sku}</span>
                            <Badge variant="outline" className="text-sm bg-slate-100">{lotNo}</Badge>
                          </CardTitle>
                          <p className="text-sm text-slate-500 mt-1">
                            คิวตรวจถังที่ {start} - {end} (จากทั้งหมด {total} ถัง)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-[#D4AF37]/ text-[#D4AF37]">
                          ตรวจแล้ว {qcDoneCount}/{totalInBatch}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pt-0 pb-6 border-t border-slate-100 mt-4">
                        <div className="grid grid-cols-5 md:grid-cols-10 gap-4 mt-6">
                          {Array.from({ length: totalInBatch }).map((_, idx) => {
                            const t = start + idx
                            const tankStatus = details[t] || 'LOCKED'
                            let color = "text-slate-300 bg-[#F8F6F0] border-slate-200 opacity-60 cursor-not-allowed"
                            let animate = ""
                            if (tankStatus === 'WAITING' || tankStatus === 'IN_PROGRESS') { color = "text-yellow-600 bg-yellow-50 border-yellow-300 shadow-sm cursor-pointer hover:bg-yellow-100 hover:scale-105"; animate = "animate-pulse" }
                            else if (tankStatus === 'QC_PASS') { color = "text-green-500 bg-green-50 border-green-300 shadow-sm cursor-pointer hover:bg-green-100 hover:scale-105" }
                            else if (tankStatus === 'PAUSED') { color = "text-orange-500 bg-orange-50 border-orange-300 shadow-sm cursor-pointer hover:bg-orange-100 hover:scale-105" }
                            else if (tankStatus === 'FAILED') { color = "text-red-500 bg-red-50 border-red-300 shadow-sm cursor-pointer hover:bg-red-100 hover:scale-105" }
                            else if (tankStatus === 'REPROCESS') { color = "text-purple-500 bg-purple-50 border-purple-300 shadow-sm cursor-pointer hover:bg-purple-100 hover:scale-105" }

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
                                  if (h.status === 'SENT_TO_QC') { statusText = 'ส่ง QC'; badgeColor = 'bg-green-500 text-white' }
                                  return (
                                    <div key={i} className="flex flex-col mb-2 bg-slate-800 p-1.5 rounded">
                                      <div className="flex items-center justify-between gap-2">
                                        <Badge variant="outline" className={`text-[10px] border-none px-1 py-0 ${badgeColor}`}>{statusText}</Badge>
                                        <span className="text-[10px] text-slate-300 shrink-0">{new Date(h.timestamp).toLocaleTimeString('th-TH')}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-1 text-slate-400">
                                        <User className="w-3 h-3 shrink-0" />
                                        <span className="text-[10px] truncate max-w-[120px]">{h.user}</span>
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

                            return (
                              <div key={t} className="relative group flex flex-col items-center justify-center">
                                <div onClick={() => handleTankClick(task, t, tankStatus)} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${color} ${animate}`}>
                                  <FlaskConical className="w-8 h-8 mb-1" />
                                  <span className="text-sm font-bold">{t}</span>
                                </div>
                                {tooltipContent && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#2D2721] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                                    {tooltipContent}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })
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
                            h.user,
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
                      <table className="w-full text-sm text-left">
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

                            return (
                              <tr key={`${item.taskId}-${item.tankNum}-${idx}`} className="hover:bg-[#F8F6F0]">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(item.timestamp).toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{item.user}</td>
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-[#D4AF37]">
                                  {item.lotNo} <span className="text-slate-400 font-normal text-xs ml-1">({item.sku})</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-semibold">ถังที่ {item.tankNum}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Badge variant="secondary" className={statusColor}>{item.action}</Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{item.note || '-'}</td>
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
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F8F6F0] text-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-medium">สินค้า / SKU</th>
                        <th className="px-4 py-3 font-medium">LOT No.</th>
                        <th className="px-4 py-3 font-medium">Box Lot</th>
                        <th className="px-4 py-3 font-medium">จำนวน (ชิ้น)</th>
                        <th className="px-4 py-3 font-medium">เวลาที่รับเข้า</th>
                        <th className="px-4 py-3 font-medium text-right">ดำเนินการ (QC)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fgInventory.filter(item => {
                        const term = searchQuery.toLowerCase()
                        const sku = (item.products?.sku || '').toLowerCase()
                        const lotNo = (item.lot_no || '').toLowerCase()
                        return sku.includes(term) || lotNo.includes(term)
                      }).map((item) => (
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
                            <Button size="sm" variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-700" onClick={() => {
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
                      <table className="w-full text-sm text-left">
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
