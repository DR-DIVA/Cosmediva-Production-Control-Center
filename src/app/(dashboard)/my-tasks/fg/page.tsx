'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Boxes, ChevronDown, ChevronRight, Clock, Archive, List as ListIcon, Calendar as CalendarIcon, User, Package, Send, PackageOpen, Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { differenceInDays, startOfDay } from 'date-fns'
import { TaskCalendar } from '@/components/ui/TaskCalendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function FgTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [filterDate, setFilterDate] = useState<string>('')
  
  // Receive Dialog State
  const [receiveDialog, setReceiveDialog] = useState<{ 
    open: boolean, taskId: string, currentTank: number, task: any, locationId: string, 
    cartons: number, boxLot: string, qtyPcs: number,
    mfgDate: string, expDate: string, productName: string, orderNo: string,
    docNoBook: string, docNoNumber: string,
    isReadOnly?: boolean
  }>({
    open: false, taskId: '', currentTank: 0, task: null, locationId: '', cartons: 0, boxLot: '', qtyPcs: 0,
    mfgDate: '', expDate: '', productName: '', orderNo: '', docNoBook: 'E1', docNoNumber: '0001'
  })

  // Dispatch Dialog State
  const [dispatchDialog, setDispatchDialog] = useState<{ open: boolean, invItem: any, qtyPcs: number, refDoc: string }>({
    open: false, invItem: null, qtyPcs: 0, refDoc: ''
  })
  
  const supabase = createClient()

  useEffect(() => {
    fetchFgTasks()
    fetchRooms()
    fetchUser()
    fetchLocations()
    fetchInventory()
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user.email?.split('@')[0] || 'Unknown User')
    }
  }

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('room_name')
    if (data) setRooms(data)
  }

  const fetchLocations = async () => {
    const { data } = await supabase.from('fg_locations').select('*').order('zone').order('rack')
    if (data) setLocations(data)
  }

  const fetchInventory = async () => {
    const { data } = await supabase.from('fg_inventory').select(`
      *,
      products:sku_id(sku, product_name),
      fg_locations:location_id(zone, rack, level)
    `).gt('available_qty_pcs', 0).order('exp_date', { ascending: true }) // FEFO ordering
    if (data) setInventory(data)
  }

  const fetchFgTasks = async () => {
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
        piece_quantity,
        production_lot_id,
        production_lots (
          id,
          lot_no,
          total_tanks,
          sku_id,
          planned_quantity,
          order_quantity,
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
    } else if (data) {
      const fgTasks = data.filter(t => 
        (t.processes as any)?.process_name?.toLowerCase().includes('fg') || 
        (t.processes as any)?.process_name?.toLowerCase().includes('เธเธฅเธฑเธ')
      )
      setTasks(fgTasks)
      setSelectedTask((prev: any) => prev ? fgTasks.find(t => t.id === prev.id) || null : null)
    }
    setLoading(false)
  }

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  const getVarianceBadge = (task: any) => {
    if (!task.activity_date) return null
    const planned = startOfDay(new Date(task.activity_date))
    const actual = startOfDay(task.end_time ? new Date(task.end_time) : new Date())
    const diff = differenceInDays(actual, planned)
    if (diff > 0) return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 ml-2">เธฅเนเธฒเธเนเธฒ {diff} เธงเธฑเธ</Badge>
    if (diff < 0) return <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200 ml-2">เน€เธฃเนเธงเธเธงเนเธฒเนเธเธ {Math.abs(diff)} เธงเธฑเธ</Badge>
    return <Badge variant="outline" className="bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/30 ml-2">เธ•เธฃเธเธ•เธฒเธกเนเธเธ</Badge>
  }

  const isDelayed = (task: any) => {
    if (!task.activity_date) return false
    const planned = startOfDay(new Date(task.activity_date))
    const actual = startOfDay(task.end_time ? new Date(task.end_time) : new Date())
    return differenceInDays(actual, planned) > 0
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

    const { error } = await supabase.from('production_logs').update(updateData).eq('id', taskId)
    if (error) toast.error('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐเนเธกเนเธชเธณเน€เธฃเนเธ')
    else { toast.success('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐเน€เธฃเธตเธขเธเธฃเนเธญเธข'); fetchFgTasks(); }
  }

  const updateQcStatus = async (invId: string, newStatus: string) => {
    const { error } = await supabase.from('fg_inventory').update({ qc_status: newStatus }).eq('id', invId)
    if (error) {
      toast.error('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐ QC เนเธกเนเธชเธณเน€เธฃเนเธ')
    } else {
      toast.success('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐ QC เน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง')
      fetchInventory()
    }
  }

  // FG no longer uses tank-based logic. We receive the entire LOT at once.
  const handleTankClick = undefined;
  const executeTankUpdate = undefined;

  const confirmReceive = async () => {
    if (!receiveDialog.locationId || !receiveDialog.qtyPcs || !receiveDialog.cartons) {
      toast.error('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธเธ–เนเธงเธ')
      return
    }

    const mfgDate = receiveDialog.mfgDate ? new Date(receiveDialog.mfgDate) : new Date()
    const expDate = receiveDialog.expDate ? new Date(receiveDialog.expDate) : (() => {
      const d = new Date(mfgDate);
      d.setFullYear(d.getFullYear() + 3);
      return d;
    })();

    let details = typeof receiveDialog.task?.tank_details === 'object' && receiveDialog.task?.tank_details !== null ? { ...receiveDialog.task.tank_details } : {}
    details.fg_receive_info = {
      user: currentUser,
      timestamp: new Date().toISOString(),
      cartons: receiveDialog.cartons,
      pcs: receiveDialog.qtyPcs,
      doc_book: receiveDialog.docNoBook,
      doc_no: receiveDialog.docNoNumber
    }

    // Insert into inventory
    const { error: invError } = await supabase.from('fg_inventory').insert({
      sku_id: receiveDialog.task?.production_lots?.sku_id,
      lot_no: receiveDialog.task?.production_lots?.lot_no,
      box_lot_no: receiveDialog.boxLot,
      mfg_date: mfgDate.toISOString().split('T')[0],
      exp_date: expDate.toISOString().split('T')[0],
      receive_qty_cartons: receiveDialog.cartons,
      receive_qty_pcs: receiveDialog.qtyPcs,
      available_qty_pcs: receiveDialog.qtyPcs,
      location_id: receiveDialog.locationId === 'UNSPECIFIED' ? null : receiveDialog.locationId,
      qc_status: 'QUARANTINE'
    })

    if (invError) {
      toast.error('เธเธฑเธเธ—เธถเธเน€เธเนเธฒเธเธฅเธฑเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + invError.message)
      return
    }

    // Update log status
    const { error: logError } = await supabase.from('production_logs').update({
      status: 'DONE',
      tank_details: details,
      end_time: new Date().toISOString()
    }).eq('id', receiveDialog.taskId)

    if (logError) {
      toast.error('เธญเธฑเธเน€เธ”เธ•เธชเธ–เธฒเธเธฐเธเธฒเธเนเธกเนเธชเธณเน€เธฃเนเธ')
    } else {
      toast.success('เธฃเธฑเธเน€เธเนเธฒ FG เน€เธฃเธตเธขเธเธฃเนเธญเธข')
      fetchInventory()
      fetchFgTasks()
      setReceiveDialog(prev => ({...prev, open: false}))
    }
  }

  const handleDispatch = async () => {
    if (!dispatchDialog.invItem || dispatchDialog.qtyPcs <= 0) return
    if (dispatchDialog.qtyPcs > dispatchDialog.invItem.available_qty_pcs) {
      toast.error('เธขเธญเธ”เธเนเธฒเธขเธญเธญเธเน€เธเธดเธเธเธงเนเธฒเธขเธญเธ”เธเธเน€เธซเธฅเธทเธญ!')
      return
    }
    
    // Insert Tx
    const { error: txError } = await supabase.from('inventory_transactions').insert({
      inventory_id: dispatchDialog.invItem.id,
      transaction_type: 'OUT',
      quantity_pcs: dispatchDialog.qtyPcs,
      reference_document: dispatchDialog.refDoc,
      user_id: currentUser,
      timestamp: new Date().toISOString()
    })
    
    // Deduct stock
    const newAvail = dispatchDialog.invItem.available_qty_pcs - dispatchDialog.qtyPcs
    await supabase.from('fg_inventory').update({ available_qty_pcs: newAvail }).eq('id', dispatchDialog.invItem.id)
    
    toast.success('เธเธฑเธเธ—เธถเธเธเนเธฒเธขเธชเธดเธเธเนเธฒเธญเธญเธเน€เธฃเธตเธขเธเธฃเนเธญเธข')
    setDispatchDialog(prev => ({...prev, open: false}))
    fetchInventory()
  }

  const handlePrint = () => {
    const printContent = document.getElementById('e-form-printable-area');
    if (!printContent) return;

    // Set custom filename for Save as PDF
    const originalTitle = document.title;
    const sku = receiveDialog.task?.production_lots?.products?.sku || 'Unknown';
    const lotRaw = receiveDialog.task?.production_lots?.lot_no || 'Unknown';
    const lot = lotRaw.replace(/\//g, '-');
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth()+1).toString().padStart(2, '0')}.${now.getFullYear().toString().substr(-2)}`;
    document.title = `CosmeFlow OS_เนเธเธฃเธฑเธเธกเธญเธเธชเธดเธเธเนเธฒ FG ${sku} L.${lot}_${dateStr}`;

    const printWindow = document.createElement('div');
    printWindow.id = 'print-window';
    printWindow.className = "bg-white w-full h-full font-sans text-sm text-black";
    printWindow.innerHTML = printContent.innerHTML;
    document.body.appendChild(printWindow);

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body > :not(#print-window) { display: none !important; }
        body { margin: 0 !important; padding: 0 !important; background: white !important; }
        #print-window { 
          display: block !important;
          width: 100%;
          height: 100%;
          padding: 5mm 15mm;
          box-sizing: border-box;
          zoom: 0.96;
        }
        @page { size: A5 landscape; margin: 0; }
      }
      @media screen {
        #print-window { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      document.head.removeChild(style);
      if (document.body.contains(printWindow)) {
        document.body.removeChild(printWindow);
      }
    }, 1000);
  }

  const getTaskTotals = (task: any) => {
    const details = typeof task.tank_details === 'object' && task.tank_details !== null ? task.tank_details : {}
    let totalCartonsFromPof = 0
    let boxLots = new Set<string>()
    const pcsPerCarton = task.production_lots?.pcs_per_carton || 1
    
    Object.keys(details).forEach(k => {
       if (!k.includes('_history') && typeof details[k] === 'object') {
           if (details[k].cartons) totalCartonsFromPof += details[k].cartons
           if (details[k].box_lot) boxLots.add(details[k].box_lot)
       }
    })
    return {
      totalCartonsFromPof,
      totalPcsFromPof: totalCartonsFromPof * pcsPerCarton,
      combinedBoxLot: Array.from(boxLots).join(', '),
      details
    }
  }

  const getLotCumulativeTotals = (lotId: string) => {
    let cumulativeCartons = 0
    let cumulativePcs = 0
    
    const lotTasks = tasks.filter(t => t.production_lot_id === lotId)
    lotTasks.forEach(t => {
      const pcsPerCarton = t.production_lots?.pcs_per_carton || 1
      const details = typeof t.tank_details === 'object' && t.tank_details !== null ? t.tank_details : {}
      Object.keys(details).forEach(k => {
         if (!k.includes('_history') && typeof details[k] === 'object') {
             if (details[k].cartons) {
               cumulativeCartons += details[k].cartons
               cumulativePcs += (details[k].cartons * pcsPerCarton)
             }
         }
      })
    })
    return { cumulativeCartons, cumulativePcs }
  }

  const renderWarehouse = (task: any) => {
    const { totalCartonsFromPof, totalPcsFromPof, combinedBoxLot, details } = getTaskTotals(task)
    const fgInfo = details.fg_receive_info

    return (
      <div className="p-6 bg-[#F8F6F0] border-b shadow-inner">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <Boxes className="w-5 h-5 text-indigo-500" />
              เธชเธฃเธธเธเธขเธญเธ”เธชเนเธเธกเธญเธเน€เธเนเธฒเธเธฅเธฑเธ (FG)
              {getVarianceBadge(task)}
            </h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>เธขเธญเธ”เธ—เธตเนเธชเนเธเธกเธฒเธเธฒเธเธเธฒเธเธฅเธเธฅเธฑเธ POF: <span className="font-bold text-indigo-600">{totalCartonsFromPof.toLocaleString()} เธฅเธฑเธ</span> ({totalPcsFromPof.toLocaleString()} เธเธดเนเธ)</p>
              {combinedBoxLot && <p>Box Lot: <span className="font-medium text-amber-700">{combinedBoxLot}</span></p>}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {task.status === 'DONE' && (
              <div className="text-right mr-2">
                <Badge className="bg-green-100 text-green-700 p-2 px-3 text-sm mb-2 flex items-center justify-center">
                  <Archive className="w-4 h-4 mr-2" /> เธฃเธฑเธเน€เธเนเธฒเน€เธชเธฃเนเธเธชเธดเนเธ
                </Badge>
                {fgInfo && (
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center justify-end gap-1"><User className="w-3 h-3" /> เธเธนเนเธ•เธฃเธงเธเธฃเธฑเธ: {fgInfo.user}</div>
                    <div className="flex items-center justify-end gap-1"><Clock className="w-3 h-3" /> {new Date(fgInfo.timestamp).toLocaleString('th-TH')}</div>
                  </div>
                )}
              </div>
            )}
            <Button size="lg" onClick={async () => {
              const mfg = task.production_lots?.mfg_date || ''
              const exp = task.production_lots?.exp_date || ''
              const prodName = task.production_lots?.products?.product_name || ''
              const ord = task.production_lots?.po_no || task.production_lots?.order_no || ''
              const fgInfo = task.tank_details?.fg_receive_info
              
              let bookNo = 1, docNo = 1;
              if (!fgInfo) {
                const { count } = await supabase.from('fg_inventory').select('id', { count: 'exact', head: true })
                const total = (count || 0) + 1
                bookNo = Math.floor((total - 1) / 9999) + 1
                docNo = ((total - 1) % 9999) + 1
              }
              
              setReceiveDialog({ 
                open: true, 
                taskId: task.id, 
                currentTank: 0, 
                task, 
                locationId: '', 
                cartons: fgInfo ? fgInfo.cartons : totalCartonsFromPof, 
                boxLot: combinedBoxLot, 
                qtyPcs: fgInfo ? fgInfo.pcs : totalPcsFromPof,
                mfgDate: mfg,
                expDate: exp,
                productName: prodName,
                orderNo: ord,
                docNoBook: fgInfo ? fgInfo.doc_book : `E${bookNo}`,
                docNoNumber: fgInfo ? fgInfo.doc_no : String(docNo).padStart(4, '0'),
                isReadOnly: task.status === 'DONE'
              })
            }} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold border-2 border-indigo-400 shadow-lg">
              <span className="text-xl mr-2">๐“</span>
              เนเธเธชเนเธเธกเธญเธ-เธฃเธฑเธเธกเธญเธเธชเธดเธเธเนเธฒ (E-Form)
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Warehouse className="w-8 h-8 text-yellow-400 shrink-0" />
            CosmeFlow FG Warehouse
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>เธเธฑเธ”เธเธฒเธฃเธฃเธฑเธเน€เธเนเธฒ, เธชเธ•เนเธญเธเธเธเน€เธซเธฅเธทเธญ เนเธฅเธฐเน€เธเธดเธเธเนเธฒเธขเธชเธดเธเธเนเธฒ FG เนเธเธเน€เธ•เนเธกเธฃเธนเธเนเธเธ</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Every Item. Every Movement. Fully Visible.
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
        </div>
      </div>

      <Tabs defaultValue="inbound" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-white border shadow-sm h-12 mb-6">
          <TabsTrigger value="inbound" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 h-10">
            <Archive className="w-4 h-4 mr-2" /> 1. เธเธดเธงเธฃเธฑเธเน€เธเนเธฒ (Inbound)
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 h-10">
            <Package className="w-4 h-4 mr-2" /> 2. เธชเธ•เนเธญเธเธชเธดเธเธเนเธฒ (Inventory)
          </TabsTrigger>
          <TabsTrigger value="outbound" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 h-10">
            <Send className="w-4 h-4 mr-2" /> 3. เน€เธเธดเธเธเนเธฒเธข (Dispatch)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbound">
          <Card className="shadow-sm overflow-hidden border ring-1 ring-slate-200">
            <div className="p-4 bg-[#F8F6F0] border-b flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">เธเธดเธงเธเธฒเธเธฃเธญเธฃเธฑเธเน€เธเนเธฒเธเธฒเธ POF</h2>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#F8F6F0]">
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>เธชเธดเธเธเนเธฒ / SKU</TableHead>
                      <TableHead>LOT No.</TableHead>
                      <TableHead>Box Lot</TableHead>
                      <TableHead>เธขเธญเธ”เธชเนเธเธกเธญเธ (เธเธฒเธ POF)</TableHead>
                      <TableHead>เธขเธญเธ”เธชเธฐเธชเธกเธฃเธงเธก (เธเธดเนเธ)</TableHead>
                      <TableHead>เธขเธญเธ”เธชเธฐเธชเธกเธฃเธงเธก (เธฅเธฑเธ)</TableHead>
                      <TableHead>เธงเธฑเธเธ—เธตเนเธชเนเธเธกเธฒ</TableHead>
                      <TableHead>เธชเธ–เธฒเธเธฐเธเธดเธง</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center h-32 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" />เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</TableCell></TableRow>
                    ) : tasks.filter(t => {
                      const term = searchQuery.toLowerCase()
                      const sku = ((t.production_lots as any)?.products?.sku || '').toLowerCase()
                      const lotNo = ((t.production_lots as any)?.lot_no || '').toLowerCase()
                      return sku.includes(term) || lotNo.includes(term)
                    }).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center h-32 text-slate-500">เนเธกเนเธกเธตเธเธดเธงเธเธฒเธเธเธณเธชเนเธ FG</TableCell></TableRow>
                    ) : tasks.filter(t => {
                      const term = searchQuery.toLowerCase()
                      const sku = ((t.production_lots as any)?.products?.sku || '').toLowerCase()
                      const lotNo = ((t.production_lots as any)?.lot_no || '').toLowerCase()
                      return sku.includes(term) || lotNo.includes(term)
                    }).map((task) => {
                      const { totalCartonsFromPof, totalPcsFromPof, combinedBoxLot } = getTaskTotals(task);
                      const { cumulativeCartons, cumulativePcs } = getLotCumulativeTotals(task.production_lot_id);
                      return (
                      <React.Fragment key={task.id}>
                        <TableRow className={`cursor-pointer hover:bg-[#F8F6F0] ${expandedRow === task.id ? 'bg-slate-100' : ''}`} onClick={() => toggleRow(task.id)}>
                          <TableCell>{expandedRow === task.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                          <TableCell className="font-medium text-indigo-700">
                            {task.production_lots?.products?.sku || '-'}
                            <div className="text-xs text-slate-500 font-normal">{task.production_lots?.products?.product_name || ''}</div>
                          </TableCell>
                          <TableCell className="font-semibold">{task.production_lots?.lot_no || '-'}</TableCell>
                          <TableCell>
                            <span className="font-medium text-amber-700">{combinedBoxLot || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-indigo-600">{totalCartonsFromPof.toLocaleString()} เธฅเธฑเธ</span>
                            <span className="text-xs text-slate-500 ml-1">({totalPcsFromPof.toLocaleString()} เธเธดเนเธ)</span>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            {cumulativePcs.toLocaleString()} เธเธดเนเธ
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            {cumulativeCartons.toLocaleString()} เธฅเธฑเธ
                          </TableCell>
                          <TableCell>{task.activity_date ? new Date(task.activity_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                          <TableCell>
                            {task.status === 'DONE' ? <Badge className="bg-green-100 text-green-700">เธเธณเธชเนเธเธชเธณเน€เธฃเนเธ</Badge> : task.status === 'IN_PROGRESS' ? <Badge variant="outline" className="text-indigo-600 border-indigo-200">เธเธณเธฅเธฑเธเธฃเธฑเธเน€เธเนเธฒ</Badge> : <Badge variant="outline">เธฃเธญเธฃเธฑเธเน€เธเนเธฒ</Badge>}
                          </TableCell>
                        </TableRow>
                        {expandedRow === task.id && (
                          <TableRow><TableCell colSpan={6} className="p-0 border-b-0">{renderWarehouse(task)}</TableCell></TableRow>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card className="shadow-sm border ring-1 ring-slate-200">
            <div className="p-4 bg-[#F8F6F0] border-b">
              <h2 className="font-semibold text-slate-700">เธชเธ•เนเธญเธเธชเธดเธเธเนเธฒเธเธเน€เธซเธฅเธทเธญ (Real-time Balance)</h2>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-[#F8F6F0]">
                  <TableRow>
                    <TableHead>เธชเธดเธเธเนเธฒ / SKU</TableHead>
                    <TableHead>Lot No.</TableHead>
                    <TableHead>Box Lot</TableHead>
                    <TableHead>เธขเธญเธ”เธเธเน€เธซเธฅเธทเธญ</TableHead>
                    <TableHead>เธ•เธณเนเธซเธเนเธเธเธฑเธ”เน€เธเนเธ</TableHead>
                    <TableHead>เธงเธฑเธเธซเธกเธ”เธญเธฒเธขเธธ (EXP)</TableHead>
                    <TableHead>เธชเธ–เธฒเธเธฐ QC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.filter(item => {
                      const term = searchQuery.toLowerCase()
                      const sku = (item.products?.sku || '').toLowerCase()
                      const lotNo = (item.lot_no || '').toLowerCase()
                      return sku.includes(term) || lotNo.includes(term)
                    }).length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center h-32">เนเธกเนเธกเธตเธชเธดเธเธเนเธฒเนเธเธเธฅเธฑเธ</TableCell></TableRow>
                  ) : inventory.filter(item => {
                      const term = searchQuery.toLowerCase()
                      const sku = (item.products?.sku || '').toLowerCase()
                      const lotNo = (item.lot_no || '').toLowerCase()
                      return sku.includes(term) || lotNo.includes(term)
                    }).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-800">
                        {item.products?.sku}
                        <div className="text-xs text-slate-500 font-normal">{item.products?.product_name}</div>
                      </TableCell>
                      <TableCell>{item.lot_no}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-amber-50">{item.box_lot_no}</Badge></TableCell>
                      <TableCell className="font-bold text-indigo-600">{item.available_qty_pcs.toLocaleString()} เธเธดเนเธ</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <PackageOpen className="w-4 h-4 text-slate-400" />
                          {item.fg_locations ? `${item.fg_locations.zone} / ${item.fg_locations.rack} (Lv.${item.fg_locations.level})` : 'เนเธกเนเธฃเธฐเธเธธ'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.exp_date ? new Date(item.exp_date).toLocaleDateString('th-TH') : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="focus:outline-none">
                            {item.qc_status === 'RELEASED' ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none cursor-pointer">เธเธฃเนเธญเธกเธเธฒเธข (Released)</Badge>
                            ) : item.qc_status === 'QUARANTINE' ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none cursor-pointer">เธเธฑเธเธเธฑเธ (Quarantine)</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none cursor-pointer">Reject</Badge>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateQcStatus(item.id, 'RELEASED')} className="text-emerald-600 font-medium">
                              เธเธฃเนเธญเธกเธเธฒเธข (Released)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateQcStatus(item.id, 'QUARANTINE')} className="text-amber-600 font-medium">
                              เธเธฑเธเธเธฑเธ (Quarantine)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateQcStatus(item.id, 'REJECTED')} className="text-red-600 font-medium">
                              Reject (เนเธกเนเธเนเธฒเธ)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbound">
           <Card className="shadow-sm border ring-1 ring-slate-200">
            <div className="p-4 bg-[#F8F6F0] border-b">
              <h2 className="font-semibold text-slate-700">เน€เธเธดเธเธเนเธฒเธขเธชเธดเธเธเนเธฒ (เธ•เธฒเธกเธซเธฅเธฑเธ FEFO)</h2>
            </div>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-6">เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒเธเธฒเธเธเธฅเธฑเธเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเน€เธเธดเธเธเนเธฒเธข (เธฃเธฐเธเธเธเธฐเน€เธฃเธตเธขเธเธฅเธณเธ”เธฑเธ Lot เธ—เธตเนเธซเธกเธ”เธญเธฒเธขเธธเธเนเธญเธเนเธซเนเธญเธฑเธ•เนเธเธกเธฑเธ•เธด)</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inventory.filter(i => (i.qc_status === 'RELEASED' || i.qc_status === 'QUARANTINE')).filter(item => {
                  const term = searchQuery.toLowerCase()
                  const sku = (item.products?.sku || '').toLowerCase()
                  const lotNo = (item.lot_no || '').toLowerCase()
                  return sku.includes(term) || lotNo.includes(term)
                }).map(item => (
                  <Card key={item.id} className="border-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => setDispatchDialog({ open: true, invItem: item, qtyPcs: item.available_qty_pcs, refDoc: '' })}>
                    <CardContent className="p-4 relative">
                       {item.qc_status === 'QUARANTINE' && <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-500 text-white border-none text-[10px]">เธฃเธญเธ•เธฃเธงเธ QC (เธซเนเธฒเธกเน€เธเธดเธ)</Badge>}
                       <h4 className="font-bold text-slate-800">{item.products?.sku}</h4>
                       <div className="text-xs text-slate-500 line-clamp-1 mb-2">{item.products?.product_name}</div>
                       <div className="flex justify-between items-center text-sm mb-1">
                         <span className="text-slate-500">Lot:</span> <span className="font-medium">{item.lot_no}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm mb-1">
                         <span className="text-slate-500">Box Lot:</span> <span className="text-amber-600 font-medium">{item.box_lot_no}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm mb-1">
                         <span className="text-slate-500">Location:</span> 
                         <span>{item.fg_locations ? `${item.fg_locations.zone} / ${item.fg_locations.rack}` : '-'}</span>
                       </div>
                       <div className="mt-4 pt-3 border-t flex justify-between items-center">
                         <span className="text-xs text-red-500 font-medium">EXP: {new Date(item.exp_date).toLocaleDateString('th-TH')}</span>
                         <span className="font-bold text-indigo-600 text-lg">{item.available_qty_pcs} เธเธดเนเธ</span>
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={receiveDialog.open} onOpenChange={(open) => !open && setReceiveDialog(prev => ({...prev, open: false}))}>
        <DialogContent className="max-w-[95vw] md:max-w-[900px] h-[95vh] max-h-[95vh] overflow-y-auto bg-slate-100 p-6 flex flex-col items-center">
          
          {/* A5 Paper Form container */}
          <div id="e-form-printable-area" className="bg-white w-full max-w-[840px] shadow-lg border border-gray-300 p-6 font-sans text-sm relative">
             
             {/* Header */}
             <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col items-center justify-center w-[120px]">
                  <img src="https://cosmediva.co.th/wp-content/uploads/2020/02/logo-cosme-gold.png" alt="COSMEDIVA" className="w-[80px] h-auto object-contain mb-1" />
                </div>
                
                <div className="flex-1 text-center flex flex-col items-center">
                  <h1 className="text-2xl font-bold mb-4 font-serif">เนเธเธชเนเธเธกเธญเธ - เธฃเธฑเธเธกเธญเธเธชเธดเธเธเนเธฒ</h1>
                  <div className="text-left space-y-1 ml-4 text-[13px]">
                    <div className="flex items-center gap-2">
                       <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-lg leading-none">โ“</div>
                       <span>เธชเธดเธเธเนเธฒเธชเธณเน€เธฃเนเธเธฃเธนเธ</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-4 h-4 border border-black"></div>
                       <span>เธชเธดเธเธเนเธฒเธญเธทเนเธเน .................................................</span>
                    </div>
                  </div>
                </div>
                
                <div className="w-[150px] text-right text-[13px] space-y-2 pt-2">
                  <div className="flex justify-between"><span>เน€เธฅเนเธกเธ—เธตเน</span> <span>{receiveDialog.docNoBook}</span></div>
                  <div className="flex justify-between">
                    <span>เน€เธฅเธเธ—เธตเน</span> 
                    <span className="font-mono">{receiveDialog.docNoNumber}</span>
                  </div>
                </div>
             </div>

             {/* Department & Date */}
             <div className="flex justify-between items-end mb-2 text-[13px]">
               <div className="space-y-2">
                 <div className="flex items-center gap-2">
                   <span className="font-semibold w-24">เนเธเธเธเธเธนเนเธชเนเธเธกเธญเธ</span>
                   <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-black flex items-center justify-center text-[10px]">โ“</div> เนเธเธเธเนเธเนเธเธเธดเนเธ</div>
                   <div className="flex items-center gap-1 ml-2"><div className="w-3 h-3 rounded-full border border-black"></div> เนเธเธเธเธเธฅเธฑเธเธชเธดเธเธเนเธฒ</div>
                   <div className="flex items-center gap-1 ml-2"><div className="w-3 h-3 rounded-full border border-black"></div> เนเธเธเธเธญเธทเนเธเน ...................................</div>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="font-semibold w-24">เนเธเธเธเธเธนเนเธฃเธฑเธเธกเธญเธ</span>
                   <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-black"></div> เนเธเธเธเนเธเนเธเธเธดเนเธ</div>
                   <div className="flex items-center gap-1 ml-2"><div className="w-3 h-3 rounded-full border border-black flex items-center justify-center text-[10px]">โ“</div> เนเธเธเธเธเธฅเธฑเธเธชเธดเธเธเนเธฒ</div>
                   <div className="flex items-center gap-1 ml-2"><div className="w-3 h-3 rounded-full border border-black"></div> เนเธเธเธเธญเธทเนเธเน ...................................</div>
                 </div>
               </div>
               <div>
                 <span className="mr-2">เธงเธฑเธเธ—เธตเน</span>
                 <span className="border-b border-black border-dashed px-4 font-handwriting text-[#4A4238]">
                   {new Date().toLocaleDateString('en-GB').replace(/\//g, ' / ')}
                 </span>
               </div>
             </div>

             {/* Table */}
             <div className="border-2 border-black w-full mb-2 text-[13px]">
               <Table className="w-full !border-collapse">
                 <TableHeader>
                   <TableRow className="border-b-2 border-black">
                     <TableHead className="border-r border-black font-semibold text-black text-center w-12 p-2">เธฅเธณเธ”เธฑเธ</TableHead>
                     <TableHead className="border-r border-black font-semibold text-black text-center w-28 p-2">เธฃเธซเธฑเธชเธชเธดเธเธเนเธฒ</TableHead>
                     <TableHead className="border-r border-black font-semibold text-black text-center p-2">เธเธทเนเธญเธชเธดเธเธเนเธฒ</TableHead>
                     <TableHead className="border-r border-black font-semibold text-black text-center w-20 p-2">LOT.</TableHead>
                     <TableHead className="border-r border-black font-semibold text-black text-center w-32 p-2">เธเธณเธเธงเธ</TableHead>
                     <TableHead className="border-r border-black font-semibold text-black text-center w-24 p-2">เน€เธฅเธเธ—เธตเนเธเธฅเนเธญเธ</TableHead>
                     <TableHead className="font-semibold text-black text-center w-32 p-2">เน€เธฅเธเธ—เธตเนเนเธเธชเธฑเนเธเธเธทเนเธญ</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {/* Main Row */}
                   <TableRow className="border-b border-black/30 h-8">
                     <TableCell className="border-r border-black text-center py-1">1</TableCell>
                     <TableCell className="border-r border-black text-center py-1">{receiveDialog.task?.production_lots?.products?.sku}</TableCell>
                     <TableCell className="border-r border-black py-1 px-2">{receiveDialog.productName || receiveDialog.task?.production_lots?.products?.product_name}</TableCell>
                     <TableCell className="border-r border-black text-center py-1">
                        <div>{receiveDialog.task?.production_lots?.lot_no}</div>
                        {(() => {
                           const mfg = receiveDialog.mfgDate ? new Date(receiveDialog.mfgDate) : new Date();
                           const exp = receiveDialog.expDate ? new Date(receiveDialog.expDate) : (() => { const d = new Date(mfg); d.setFullYear(d.getFullYear()+3); return d; })();
                           const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear().toString().substr(-2)}`;
                           return (
                             <div className="text-[11px] font-handwriting text-[#4A4238] leading-tight mt-1">
                               <div>MFD: {fmtDate(mfg)}</div>
                               <div>EXP: {fmtDate(exp)}</div>
                             </div>
                           );
                        })()}
                     </TableCell>
                     <TableCell className="border-r border-black text-center py-1">
                        <span className="font-handwriting text-[#4A4238] text-[15px]">
                          {receiveDialog.cartons} x {receiveDialog.task?.production_lots?.pcs_per_carton || 1} = {receiveDialog.qtyPcs}
                        </span>
                     </TableCell>
                     <TableCell className="border-r border-black text-center py-1">
                        <span className="font-handwriting text-[#4A4238] text-[15px]">
                           {(() => {
                              const t = receiveDialog.task;
                              if (!t) return '-';
                              let cartonsBefore = 0;
                              const sameLotTasks = tasks.filter((x: any) => x.production_lot_id === t.production_lot_id);
                              for (let i = 1; i < parseInt(t.tank_end); i++) {
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
                              const start = cartonsBefore + 1;
                              const end = cartonsBefore + receiveDialog.cartons;
                              return receiveDialog.cartons > 0 ? `${start} - ${end}` : '-';
                           })()}
                        </span>
                     </TableCell>
                     <TableCell className="text-center py-1 font-handwriting text-[#4A4238]">{receiveDialog.orderNo || '-'}</TableCell>
                   </TableRow>
                   
                   {/* Empty padding rows to make the table look full */}
                   {[...Array(3)].map((_, idx) => (
                     <TableRow key={idx} className="border-b border-black/30 h-8">
                       <TableCell className="border-r border-black"></TableCell>
                       <TableCell className="border-r border-black"></TableCell>
                       <TableCell className="border-r border-black"></TableCell>
                       <TableCell className="border-r border-black"></TableCell>
                       <TableCell className="border-r border-black"></TableCell>
                       <TableCell className="border-r border-black"></TableCell>
                       <TableCell></TableCell>
                     </TableRow>
                   ))}

                   {/* Total Row */}
                   <TableRow className="h-8">
                     <TableCell colSpan={4} className="border-r border-black text-center font-bold">เธฃเธงเธก</TableCell>
                     <TableCell className="border-r border-black text-center font-bold font-handwriting text-[#4A4238]">{receiveDialog.qtyPcs}</TableCell>
                     <TableCell className="border-r border-black"></TableCell>
                     <TableCell></TableCell>
                   </TableRow>
                 </TableBody>
               </Table>
             </div>

             {/* Remark */}
             <div className="mb-2 text-[13px] text-[#4A4238] font-handwriting font-medium">
               เธซเธกเธฒเธขเน€เธซเธ•เธธ: เธเธฅเนเธญเธเธฅเนเธญเธ• {receiveDialog.boxLot || '-'}
             </div>

             {/* Signatures */}
             <div className="border-2 border-black w-full flex text-[13px] relative mt-1">
               {/* Col 1 */}
               <div className="flex-1 border-r border-black p-3 space-y-4 relative">
                  <div className="flex items-end gap-1">
                     <span className="whitespace-nowrap">เธเธนเนเธชเนเธเธกเธญเธ</span>
                     <div className="flex-1 border-b border-black border-dashed relative">
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-handwriting text-[#4A4238] whitespace-nowrap">{receiveDialog.task?.tank_details?.delivery_info?.sender?.split('@')[0] || ''}</span>
                     </div>
                     <span className="whitespace-nowrap">เธงเธฑเธเธ—เธตเน</span>
                     <span className="w-20 border-b border-black border-dashed text-center font-handwriting text-[#4A4238]">
                        {new Date().toLocaleDateString('en-GB')}
                     </span>
                  </div>
                   <div className="flex items-end gap-1">
                     <span className="whitespace-nowrap">เธเธนเนเธญเธเธธเธกเธฑเธ•เธดเธชเนเธ</span>
                     <div className="flex-1 border-b border-black border-dashed relative">
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-handwriting text-[#4A4238] whitespace-nowrap">{receiveDialog.task?.tank_details?.delivery_info?.sender?.split('@')[0] || ''}</span>
                     </div>
                     <span className="whitespace-nowrap">เธงเธฑเธเธ—เธตเน</span>
                     <span className="w-20 border-b border-black border-dashed text-center font-handwriting text-[#4A4238]">
                        {new Date().toLocaleDateString('en-GB')}
                     </span>
                  </div>
               </div>
               {/* Col 2 */}
               <div className="flex-1 border-r border-black p-3 space-y-4">
                  <div className="flex items-end gap-1">
                     <span className="whitespace-nowrap">เธเธนเนเธฃเธฑเธเธกเธญเธ</span>
                     <div className="flex-1 border-b border-black border-dashed relative">
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-handwriting text-[#4A4238] whitespace-nowrap text-lg">{receiveDialog.task?.tank_details?.fg_receive_info?.user?.split('@')[0] || (receiveDialog.isReadOnly ? '' : '.....................')}</span>
                     </div>
                     <span className="whitespace-nowrap">เธงเธฑเธเธ—เธตเน</span>
                     <span className="w-20 border-b border-black border-dashed text-center font-handwriting text-[#4A4238]">
                        {new Date().toLocaleDateString('en-GB')}
                     </span>
                  </div>
                  <div className="flex items-end gap-1">
                     <span className="whitespace-nowrap">เธเธนเนเธ•เธฃเธงเธเธชเธญเธ</span>
                     <div className="flex-1 border-b border-black border-dashed relative">
                       {/* QC Check goes here later */}
                     </div>
                     <span className="whitespace-nowrap">เธงเธฑเธเธ—เธตเน</span>
                     <span className="w-20 border-b border-black border-dashed text-center font-handwriting text-[#4A4238]">
                        {new Date().toLocaleDateString('en-GB')}
                     </span>
                  </div>
               </div>
               {/* Col 3 */}
               <div className="w-[180px] p-3 space-y-4 relative">
                  <div className="flex items-end gap-1">
                     <span className="whitespace-nowrap">เธเธนเนเธญเธเธธเธกเธฑเธ•เธด</span>
                     <span className="flex-1 border-b border-black border-dashed inline-block"></span>
                  </div>
                  <div className="flex items-end gap-1">
                     <span className="whitespace-nowrap">เธงเธฑเธเธ—เธตเน</span>
                     <span className="flex-1 border-b border-black border-dashed text-center font-handwriting text-[#4A4238]">
                        {new Date().toLocaleDateString('en-GB')}
                     </span>
                  </div>
                  <div className="absolute bottom-1 right-2 text-[8px] text-slate-500">FG-WF-001A</div>
               </div>
             </div>

           </div> {/* End A5 Form */}
          
          {/* Actions / Inputs for Receiving */}
          <div className="w-full max-w-[840px] bg-white rounded-lg shadow p-6 mt-6 border-t-4 border-indigo-500 shrink-0">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg"><Archive className="w-5 h-5 text-indigo-500" /> เธ•เธฃเธงเธเธชเธญเธเธขเธญเธ”เนเธฅเธฐเธขเธทเธเธขเธฑเธเธฃเธฑเธเน€เธเนเธฒ (เนเธ”เธข FG)</h4>
            
            {/* Summary Panel */}
            {(() => {
              const t = receiveDialog.task;
              if (!t) return null;
              
              let cartonsBefore = 0;
              const sameLotTasks = tasks.filter((x: any) => x.production_lot_id === t.production_lot_id);
              for (let i = 1; i < parseInt(t.tank_end); i++) {
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
              const startBox = cartonsBefore + 1;
              const endBox = cartonsBefore + receiveDialog.cartons;
              const boxString = receiveDialog.cartons > 0 ? `${startBox}-${endBox}` : '-';
              
              const mfg = receiveDialog.mfgDate ? new Date(receiveDialog.mfgDate) : new Date();
              const exp = receiveDialog.expDate ? new Date(receiveDialog.expDate) : (() => { const d = new Date(mfg); d.setFullYear(d.getFullYear()+3); return d; })();
              const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear().toString().substr(-2)}`;
              const fmtFullDate = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
              
              const pcsPerCarton = t.production_lots?.pcs_per_carton || 1;
              const plannedQty = t.production_lots?.planned_quantity || t.production_lots?.order_quantity || 0;
              const totalCartons = plannedQty / pcsPerCarton;
              const accumulatedPcs = endBox * pcsPerCarton;

              return (
                <div className="bg-slate-100 border border-slate-300 rounded-md p-4 mb-5 text-[13px] text-slate-800 space-y-1 font-mono shadow-sm">
                  <div>เธงเธฑเธเธ—เธตเน : {fmtFullDate(new Date())}</div>
                  <div>เธเธฒเธ : {t.production_lots?.products?.sku || '-'}</div>
                  <div>SO/เนเธเธชเธฑเนเธเธเธฅเธดเธ• : {t.production_lots?.po_no || t.production_lots?.order_no || '-'}</div>
                  <div>LOT: {t.production_lots?.lot_no || '-'}</div>
                  <div>MFD: {fmtDate(mfg)}</div>
                  <div>EXP: {fmtDate(exp)}</div>
                  <div>เธเธณเธเธงเธ : {receiveDialog.cartons} เธฅเธฑเธ x {pcsPerCarton} เธเธดเนเธ = {receiveDialog.qtyPcs.toLocaleString()} เธเธดเนเธ</div>
                  <div>เน€เธฅเธเธ—เธตเนเธเธฅเนเธญเธ : {boxString}</div>
                  <div>[เธขเธญเธ”เธชเธฐเธชเธก ({endBox} เธฅเธฑเธ/ {totalCartons.toFixed(2).replace(/\.00$/,'')} เธฅเธฑเธ) x {pcsPerCarton} เธเธดเนเธ   = {accumulatedPcs.toLocaleString()} เธเธดเนเธ/  {plannedQty.toLocaleString()} เธเธดเนเธ  ]</div>
                  <div>เนเธเธชเนเธเธกเธญเธ : {receiveDialog.docNoBook}/{receiveDialog.docNoNumber}</div>
                </div>
              )
            })()}



            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#F8F6F0]/ p-5 rounded-lg border border-slate-200">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">เธขเธญเธ”เธฃเธฑเธเธเธฃเธดเธ (เธฅเธฑเธ) {!receiveDialog.isReadOnly && <span className="text-red-500">*</span>}</label>
                 <Input type="number" min={0} className="bg-white text-lg font-bold text-indigo-700 h-12" value={receiveDialog.cartons} disabled={receiveDialog.isReadOnly} onChange={(e) => setReceiveDialog(prev => ({...prev, cartons: parseInt(e.target.value) || 0}))} />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700">เธขเธญเธ”เธฃเธฑเธเธเธฃเธดเธ (เธเธดเนเธ) {!receiveDialog.isReadOnly && <span className="text-red-500">*</span>}</label>
                 <Input type="number" min={0} className="bg-white text-lg font-bold text-indigo-700 h-12" value={receiveDialog.qtyPcs} disabled={receiveDialog.isReadOnly} onChange={(e) => setReceiveDialog(prev => ({...prev, qtyPcs: parseInt(e.target.value) || 0}))} />
               </div>
               {!receiveDialog.isReadOnly && (
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-slate-700">เธ•เธณเนเธซเธเนเธเธเธฑเธ”เน€เธเนเธ (Location) <span className="text-red-500">*</span></label>
                   <Select value={receiveDialog.locationId} onValueChange={(val) => setReceiveDialog(prev => ({...prev, locationId: val || ''}))}>
                     <SelectTrigger className="bg-white h-12">
                       <SelectValue placeholder="-- เน€เธฅเธทเธญเธเนเธเธ/เธเธฑเนเธเธงเธฒเธ --" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="UNSPECIFIED" className="font-medium text-slate-600">-- เธขเธฑเธเนเธกเนเธฃเธฐเธเธธ --</SelectItem>
                       {locations.map(loc => (
                         <SelectItem key={loc.id} value={loc.id}>
                           {loc.zone} - {loc.rack} (เธเธฑเนเธ {loc.level})
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
            </div>
            
            <div className="flex justify-end gap-3 mt-4 shrink-0">
              <Button variant="outline" size="lg" className="border-slate-300" onClick={handlePrint}>
                <span className="mr-2">๐–จ๏ธ</span> เธเธดเธกเธเน / เธ”เธฒเธงเธเนเนเธซเธฅเธ” PDF
              </Button>
              <Button variant="outline" size="lg" onClick={() => setReceiveDialog(prev => ({...prev, open: false}))}>เธเธดเธ”เธซเธเนเธฒเธ•เนเธฒเธ</Button>
              {!receiveDialog.isReadOnly && (
                <Button size="lg" className="bg-[#D4AF37] hover:bg-[#B8962A] text-white shadow-md text-base px-8" onClick={confirmReceive}>
                  <span className="text-xl mr-2">โ๏ธ</span>
                  เธฅเธเธเธฒเธกเธฃเธฑเธเธกเธญเธ ({currentUser}) เนเธฅเธฐเธฃเธฑเธเน€เธเนเธฒเธเธฅเธฑเธ
                </Button>
              )}
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchDialog.open} onOpenChange={(open) => !open && setDispatchDialog(prev => ({...prev, open: false}))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เธ—เธณเธฃเธฒเธขเธเธฒเธฃเน€เธเธดเธเธเนเธฒเธข</DialogTitle>
          </DialogHeader>
          {dispatchDialog.invItem && (
            <div className="py-4 space-y-4">
              <div className="bg-[#F8F6F0] p-3 rounded">
                <div className="font-medium text-slate-800">{dispatchDialog.invItem.products?.sku}</div>
                <div className="text-sm text-slate-500">Lot: {dispatchDialog.invItem.lot_no} | Box Lot: {dispatchDialog.invItem.box_lot_no}</div>
                <div className="text-sm font-bold text-indigo-600 mt-2">เธขเธญเธ”เธเธเน€เธซเธฅเธทเธญ: {dispatchDialog.invItem.available_qty_pcs} เธเธดเนเธ</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">เธขเธญเธ”เธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเน€เธเธดเธ (เธเธดเนเธ)</label>
                <Input type="number" min={1} max={dispatchDialog.invItem.available_qty_pcs} value={dispatchDialog.qtyPcs} onChange={(e) => setDispatchDialog(prev => ({...prev, qtyPcs: parseInt(e.target.value) || 0}))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">เน€เธญเธเธชเธฒเธฃเธญเนเธฒเธเธญเธดเธ (PO, เนเธเน€เธเธดเธ)</label>
                <Input placeholder="เน€เธเนเธ PO-2026-001" value={dispatchDialog.refDoc} onChange={(e) => setDispatchDialog(prev => ({...prev, refDoc: e.target.value}))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialog(prev => ({...prev, open: false}))}>เธขเธเน€เธฅเธดเธ</Button>
            <Button className="bg-[#D4AF37] hover:bg-[#B8962A]" onClick={handleDispatch}>เธขเธทเธเธขเธฑเธเธเนเธฒเธขเธญเธญเธ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
