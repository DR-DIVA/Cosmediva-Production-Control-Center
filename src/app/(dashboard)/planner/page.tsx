'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Download, Upload, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, Filter, ListTodo, CalendarDays } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle, Activity, History } from "lucide-react"
import { format, differenceInDays, startOfDay, addDays } from "date-fns"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"
import { TaskCalendar } from "@/components/ui/TaskCalendar"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PROCESS_TYPES = [
  { id: "RM", name: "ชั่งสาร", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "MX", name: "ผสม", color: "bg-[#D4AF37]/ text-[#4A4238] border-[#D4AF37]/30" },
  { id: "PK", name: "บรรจุ", color: "bg-emerald-100 text-emerald-800 border-emerald-200" }
]

const searchMap: Record<string, string> = { "RM": "ชั่งสาร", "MX": "ผสม", "PK": "บรรจุ" }
const ALLOWED_PROCESSES = ["ชั่งสาร", "ผสม", "บรรจุ", "ลงลัง", "ส่งมอบ FG"]

export default function PlannerPage() {
  const [lots, setLots] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [stats, setStats] = useState({ onTime: 0, delayed: 0, early: 0, total: 0 })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDept, setFilterDept] = useState("ALL")
  const [expandedLots, setExpandedLots] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("table")
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newLot, setNewLot] = useState({
    id: "", product_id: "", lot_number: "", target_quantity: "",
    total_tanks: "", kg_per_tank: "", g_per_piece: "",
    capacity_min: "", capacity_max: "", pcs_per_carton: "",
    order_quantity: "", po_no: "", order_type: "MTS",
    fg_due_date: "", new_sku_name: "", unit: "pc",
    mfg_date: "", exp_date: "", product_name: ""
  })

  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const email = user.email || 'Unknown User';
        if (email.includes('@')) {
          setCurrentUser(email.split('@')[0]);
        } else {
          setCurrentUser(email);
        }
      }
    }
    fetchUser()
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [lotsRes, productsRes, roomsRes, processesRes, logsRes] = await Promise.all([
        supabase.from("production_lots").select("*, products(sku)").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("sku"),
        supabase.from("rooms").select("*").order("room_name"),
        supabase.from("processes").select("*").order("process_name"),
        supabase.from("production_logs").select("*").order("created_at", { ascending: true })
      ])

      if (lotsRes.data) setLots(lotsRes.data)
      if (productsRes.data) setProducts(productsRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
      if (processesRes.data) setProcesses(processesRes.data)
      if (logsRes.data) setLogs(logsRes.data)

      if (logsRes.data) {
        let onTime = 0, delayed = 0, early = 0
        logsRes.data.forEach(log => {
          if (!log.activity_date) return
          const planned = startOfDay(new Date(log.activity_date))
          const actual = startOfDay(log.end_time ? new Date(log.end_time) : new Date())
          const diff = differenceInDays(actual, planned)
          if (diff > 0) delayed++
          else if (diff < 0) early++
          else onTime++
        })
        setStats({ onTime, delayed, early, total: logsRes.data.length })
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const toggleExpand = (lotId: string) => {
    setExpandedLots(prev => ({ ...prev, [lotId]: !prev[lotId] }))
  }

  const handleProductChange = (productId: string | null) => {
    if (!productId) return;
    if (productId === "NEW") {
      setNewLot({
        ...newLot, product_id: productId, new_sku_name: "", product_name: "", kg_per_tank: "",
        g_per_piece: "", capacity_min: "", capacity_max: "", pcs_per_carton: "", mfg_date: "", exp_date: ""
      })
      return
    }
    const product = products.find(p => p.id === productId)
    if (product) {
      setNewLot({
        ...newLot, product_id: productId,
        product_name: product.product_name || "",
        kg_per_tank: product.kg_per_tank?.toString() || "",
        g_per_piece: product.g_per_piece?.toString() || "",
        capacity_min: product.capacity_min?.toString() || "",
        capacity_max: product.capacity_max?.toString() || "",
        pcs_per_carton: product.pcs_per_carton?.toString() || ""
      })
    } else {
      setNewLot({ ...newLot, product_id: productId })
    }
  }

  const handleEditLot = (lot: any) => {
    setNewLot({
      id: lot.id,
      product_id: lot.sku_id,
      lot_number: lot.lot_no,
      target_quantity: lot.planned_quantity?.toString() || "",
      total_tanks: lot.total_tanks?.toString() || "",
      kg_per_tank: lot.kg_per_tank?.toString() || "",
      g_per_piece: lot.g_per_piece?.toString() || "",
      capacity_min: lot.capacity_min?.toString() || "",
      capacity_max: lot.capacity_max?.toString() || "",
      pcs_per_carton: lot.pcs_per_carton?.toString() || "",
      order_quantity: lot.order_quantity?.toString() || "",
      po_no: lot.po_no || "",
      order_type: lot.order_type || "MTS",
      fg_due_date: lot.fg_due_date || "",
      new_sku_name: "",
      unit: "pc",
      mfg_date: "",
      exp_date: "",
      product_name: lot.products?.product_name || ""
    })
    setIsDialogOpen(true)
  }

  const handleSaveLot = async () => {
    if (isSaving) return
    if (!newLot.product_id || !newLot.lot_number || !newLot.order_quantity || !newLot.total_tanks) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (SKU, Lot, ยอดออเดอร์, จำนวนถัง)")
      return
    }
    setIsSaving(true)

    try {
      let finalProductId = newLot.product_id
      if (finalProductId === "NEW") {
        const { data: newProd, error: prodErr } = await supabase.from("products").insert([{
          sku: newLot.new_sku_name,
          product_name: newLot.product_name || newLot.new_sku_name,
          kg_per_tank: newLot.kg_per_tank ? parseFloat(newLot.kg_per_tank) : null,
          g_per_piece: newLot.g_per_piece ? parseFloat(newLot.g_per_piece) : null,
          capacity_min: newLot.capacity_min ? parseFloat(newLot.capacity_min) : null,
          capacity_max: newLot.capacity_max ? parseFloat(newLot.capacity_max) : null,
          pcs_per_carton: newLot.pcs_per_carton ? parseInt(newLot.pcs_per_carton) : null
        }]).select().single()

        if (prodErr) throw prodErr
        finalProductId = newProd.id
      } else {
        const existingProd = products.find(p => p.id === finalProductId);
        if (existingProd && newLot.product_name && existingProd.product_name !== newLot.product_name) {
          await supabase.from("products").update({ product_name: newLot.product_name }).eq("id", finalProductId);
        }
      }

      const lotData = {
        sku_id: finalProductId,
        lot_no: newLot.lot_number,
        planned_quantity: parseFloat(newLot.target_quantity || "0"),
        total_tanks: parseInt(newLot.total_tanks || "0"),
        kg_per_tank: newLot.kg_per_tank ? parseFloat(newLot.kg_per_tank) : null,
        g_per_piece: newLot.g_per_piece ? parseFloat(newLot.g_per_piece) : null,
        capacity_min: newLot.capacity_min ? parseFloat(newLot.capacity_min) : null,
        capacity_max: newLot.capacity_max ? parseFloat(newLot.capacity_max) : null,
        pcs_per_carton: newLot.pcs_per_carton ? parseInt(newLot.pcs_per_carton) : null,
        order_quantity: parseFloat(newLot.order_quantity),
        po_no: newLot.po_no,
        order_type: newLot.order_type,
        fg_due_date: newLot.fg_due_date || null
      }

      if (newLot.id) {
        const { error: updateErr } = await supabase.from("production_lots").update(lotData).eq("id", newLot.id)
        if (updateErr) throw updateErr
        toast.success("แก้ไขงานเรียบร้อย")
      } else {
        const { error: insertErr } = await supabase.from("production_lots").insert([lotData])
        if (insertErr) throw insertErr
        toast.success("เพิ่มงานใหม่เรียบร้อย")
      }

      setIsDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddBlankLog = async (lotId: string) => {
    const lot = lots.find(l => l.id === lotId)
    if (!lot) return

    const processId = processes.find(p => p.process_name.includes("ชั่งสาร"))?.id || processes[0]?.id

    const newLogData = {
      production_lot_id: lotId,
      process_id: processId,
      tank_start: null,
      tank_end: null,
      total_tanks: lot.total_tanks || 1,
      status: "PLANNED",
      activity_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(), "yyyy-MM-dd"),
      ...(currentUserId ? { created_by: currentUserId } : {})
    }

    try {
      const { error } = await supabase.from("production_logs").insert([newLogData])
      if (error) throw error
      toast.success("เพิ่มคิวงานเรียบร้อย")
      fetchData()
    } catch (e: any) {
      toast.error("เพิ่มคิวงานไม่สำเร็จ: " + e.message)
    }
  }

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("ยืนยันการลบคิวงานนี้?")) return
    try {
      const { error } = await supabase.from("production_logs").delete().eq("id", logId)
      if (error) throw error
      toast.success("ลบคิวงานเรียบร้อย")
      fetchData()
    } catch (e: any) {
      toast.error("ลบไม่สำเร็จ: " + e.message)
    }
  }

  const handleUpdateLogDirect = async (logId: string, field: string, value: any) => {
      let updateData: any = { [field]: value }
      const existingLog = logs.find(l => l.id === logId)
      
      if (field === 'activity_date' && value && existingLog && !existingLog.end_date) {
        updateData.end_date = value 
      }
      
      if (field === 'tank_start' || field === 'tank_end') {
          updateData[field] = value === "" ? null : parseInt(value)
      }

      // Optimistic Update
      setLogs(logs.map(l => l.id === logId ? { ...l, ...updateData } : l))

      try {
          const { error } = await supabase.from("production_logs").update(updateData).eq("id", logId)
          if (error) throw error
          // fetchData() // Fetch in background to not block UI
      } catch (e: any) {
          toast.error("อัปเดตไม่สำเร็จ: " + e.message)
          fetchData() // Revert on error
      }
  }

  const getSortedLotLogs = (lotId: string) => {
    return logs.filter(l => l.production_lot_id === lotId).sort((a, b) => {
      const processA = processes.find(p => p.id === a.process_id)?.process_name || "";
      const processB = processes.find(p => p.id === b.process_id)?.process_name || "";
      const orderMap: Record<string, number> = { "ชั่งสาร": 1, "ผสม": 2, "บรรจุ": 3 };
      const weightA = orderMap[processA] || 99;
      const weightB = orderMap[processB] || 99;
      if (weightA !== weightB) return weightA - weightB;
      const tA = a.tank_start === null || a.tank_start === undefined ? 9999 : a.tank_start;
      const tB = b.tank_start === null || b.tank_start === undefined ? 9999 : b.tank_start;
      if (tA !== tB) return tA - tB;
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
  }

  
  const getHistoryData = () => {
    const orderHistory = lots.map(lot => ({
      id: `lot-${lot.id}`,
      type: 'เพิ่มออเดอร์',
      project: `${lot.po_no || '-'} / ${lot.products?.sku || 'Unknown SKU'}`,
      timestamp: lot.created_at,
      user: lot.created_by || 'Planner',
      details: `เพิ่มออเดอร์ยอด ${(lot.order_quantity || 0).toLocaleString()} pc (${lot.total_tanks || 0} ถัง)`
    }));

    const taskHistory = logs.map(log => {
      const lot = lots.find(l => l.id === log.production_lot_id);
      const process = processes.find(p => p.id === log.process_id);
      return {
        id: `log-${log.id}`,
        type: 'ลงคิวงาน',
        project: `${lot?.po_no || '-'} / ${lot?.products?.sku || 'Unknown SKU'}`,
        timestamp: log.updated_at || log.created_at,
        user: log.created_by || log.operator_id || 'Planner',
        details: `${process?.process_name || 'งานผลิต'} (${log.tank_start ? `ถัง ${log.tank_start}-${log.tank_end}` : `${log.total_tanks} ถัง`}) - วันที่ ${log.activity_date ? format(new Date(log.activity_date), 'dd/MM/yyyy') : '-'}`
      }
    });

    const combined = [...orderHistory, ...taskHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return combined.filter(item => 
      item.project.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      item.details.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(historySearchQuery.toLowerCase())
    );
  };

  const handleExportHistory = () => {
    const data = getHistoryData();
    if (data.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับ Export');
      return;
    }
    const exportData = data.map(item => ({
      'วันเวลา': format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm'),
      'ผู้ดำเนินการ': item.user,
      'ประเภท': item.type,
      'Project (PO/SKU)': item.project,
      'รายละเอียด': item.details
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, `PD_Master_Plan_History_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filteredLots = lots.filter(lot => 
    (lot.po_no?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (lot.lot_no?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (lot.products?.sku?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  )

  const today = new Date()
  const timelineDates = Array.from({ length: 14 }).map((_, i) => addDays(today, i))

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <CalendarDays className="w-8 h-8 text-yellow-400 shrink-0" />
            CosmeFlow Planning: PD Master Plan
          </h1>
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
            Plan Smarter. Produce Better.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 mr-4">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListTodo className="w-4 h-4 mr-2" /> แบบตาราง
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="w-4 h-4 mr-2" /> ปฏิทิน กำหนดส่งมอบ FG
            </Button>
          </div>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
          <Button onClick={() => {
            setNewLot({
              id: "", product_id: "", lot_number: "", target_quantity: "",
              total_tanks: "", kg_per_tank: "", g_per_piece: "",
              capacity_min: "", capacity_max: "", pcs_per_carton: "",
              order_quantity: "", po_no: "", order_type: "MTS",
              fg_due_date: "", new_sku_name: "", unit: "pc",
              mfg_date: "", exp_date: "", product_name: ""
            })
            setIsDialogOpen(true)
          }} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover">
            <Plus className="w-4 h-4 mr-2" /> เพิ่มออเดอร์ใหม่ (Project)
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1"><p className="text-sm font-medium text-slate-500">ออเดอร์ทั้งหมด</p><p className="text-3xl font-bold text-slate-900">{lots.length}</p></div>
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center"><Activity className="w-6 h-6 text-slate-600" /></div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1"><p className="text-sm font-medium text-slate-500">ตรงตามแผน (On Track)</p><p className="text-3xl font-bold text-slate-900">{stats.onTime}</p></div>
            <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1"><p className="text-sm font-medium text-slate-500">ล่าช้า (Delayed)</p><p className="text-3xl font-bold text-slate-900">{stats.delayed}</p></div>
            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1"><p className="text-sm font-medium text-slate-500">รอดำเนินการ (Pending)</p><p className="text-3xl font-bold text-slate-900">{stats.early}</p></div>
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600" /></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="table">Main Table</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  ประวัติการทำงานแบบต่อเนื่อง
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="hidden md:block h-6 w-px bg-slate-200 mx-2"></div>
            <div className="flex bg-slate-100 p-1 rounded-md">
              <Button size="sm" variant={filterDept === "ALL" ? "default" : "ghost"} onClick={() => setFilterDept("ALL")} className="h-7 text-xs">All</Button>
              <Button size="sm" variant={filterDept === "RM" ? "default" : "ghost"} onClick={() => setFilterDept("RM")} className="h-7 text-xs">ชั่งสาร (RM)</Button>
              <Button size="sm" variant={filterDept === "MX" ? "default" : "ghost"} onClick={() => setFilterDept("MX")} className="h-7 text-xs">ผสม (MX)</Button>
              <Button size="sm" variant={filterDept === "PK" ? "default" : "ghost"} onClick={() => setFilterDept("PK")} className="h-7 text-xs">บรรจุ (PK)</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="ค้นหา PO หรือ SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64 h-9" />
          </div>
        </div>

        {activeTab === "table" && (
          <div className="overflow-x-auto min-h-[500px]">
            <Table>
              <TableHeader className="bg-[#F8F6F0] sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="min-w-[200px]">Project (PO/SKU)</TableHead>
                  <TableHead>LOT</TableHead>
                  <TableHead>ยอดออเดอร์</TableHead>
                  <TableHead>จำนวนถัง</TableHead>
                  <TableHead>Bulk (kg)</TableHead>
                  <TableHead>บรรจุ (g)</TableHead>
                  <TableHead>ลงลัง (ชิ้น)</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-[40px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.map((lot) => {
                  const isExpanded = expandedLots[lot.id]
                  const lotLogs = getSortedLotLogs(lot.id)
                  
                  const hasTasksInDept = lotLogs.some(log => {
                      const process = processes.find(p => p.id === log.process_id)
                      let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                      if (!pt) return filterDept === "ALL"
                      return filterDept === "ALL" || filterDept === pt.id
                  });

                  if (filterDept !== "ALL" && !hasTasksInDept && lotLogs.length > 0) return null;

                  return (
                    <React.Fragment key={lot.id}>
                      <TableRow className={cn("bg-white hover:bg-[#F8F6F0] group border-b", isExpanded && "bg-[#F8F6F0]/")}>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(lot.id)}>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500">{lot.po_no}</span>
                            <span className="text-sm font-bold text-slate-800">{lot.products?.sku || "Unknown SKU"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{lot.lot_no}</TableCell>
                        <TableCell>{lot.order_quantity?.toLocaleString()} pc</TableCell>
                        <TableCell>{lot.total_tanks} ถัง</TableCell>
                        <TableCell>{lot.kg_per_tank || "-"}</TableCell>
                        <TableCell>{lot.g_per_piece || "-"}</TableCell>
                        <TableCell>{lot.pcs_per_carton || "-"}</TableCell>
                        <TableCell>
                          {lot.order_type === 'MTO' ? (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">MTO</span>
                          ) : (
                            <span className="text-xs bg-[#D4AF37]/ text-[#D4AF37] px-2 py-1 rounded-full font-medium">MTS</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full w-max">
                            Due: {lot.fg_due_date ? format(new Date(lot.fg_due_date), "dd MMM yyyy") : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); handleEditLot(lot); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && lotLogs.map(log => {
                        const process = processes.find(p => p.id === log.process_id)
                        let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                        if (!pt) pt = { id: "OTHER", name: process?.process_name || "Unknown", color: "bg-slate-100 text-slate-800 border-slate-200" }
                        
                        if (filterDept !== "ALL" && filterDept !== pt.id) return null

                        return (
                          <TableRow key={log.id} className="bg-[#F8F6F0]/ hover:bg-slate-100/50">
                            <TableCell className="text-center">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteLog(log.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </TableCell>
                            <TableCell colSpan={4} className="pl-8 py-2">
                              <div className="flex items-center gap-2 border-l-2 border-slate-300 pl-4 h-full py-1">
                                <div className={cn("w-2 h-2 rounded-full", pt.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))}></div>
                                
                                <Select value={log.process_id} onValueChange={(val) => handleUpdateLogDirect(log.id, "process_id", val)}>
                                   <SelectTrigger className="h-7 text-xs w-[100px] border-none bg-transparent font-medium p-0 shadow-none focus:ring-0">
                                      <span className="truncate">{process?.process_name || "เลือกงาน"}</span>
                                      <ChevronDown className="h-4 w-4 opacity-50" />
                                   </SelectTrigger>
                                   <SelectContent>
                                      {processes.filter(p => ALLOWED_PROCESSES.includes(p.process_name)).map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
                                   </SelectContent>
                                </Select>

                                <span className="text-xs text-slate-500 ml-2">(Tanks</span>
                                <Input type="number" className="w-12 h-6 text-xs px-1 text-center" value={log.tank_start || ""} onChange={e => handleUpdateLogDirect(log.id, "tank_start", e.target.value)} />
                                <span className="text-xs text-slate-500">-</span>
                                <Input type="number" className="w-12 h-6 text-xs px-1 text-center" value={log.tank_end || ""} onChange={e => handleUpdateLogDirect(log.id, "tank_end", e.target.value)} />
                                <span className="text-xs text-slate-500">)</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Input 
                                type="date" 
                                className="h-8 text-xs w-[130px]" 
                                value={log.activity_date || ""} 
                                onChange={(e) => handleUpdateLogDirect(log.id, "activity_date", e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Input 
                                type="date" 
                                className="h-8 text-xs w-[130px]" 
                                value={log.end_date || ""} 
                                onChange={(e) => handleUpdateLogDirect(log.id, "end_date", e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Select 
                                value={log.status || "PLANNED"} 
                                onValueChange={(val) => handleUpdateLogDirect(log.id, "status", val)}
                              >
                                <SelectTrigger className={cn("h-8 text-xs w-[120px] font-medium border-0", 
                                    log.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                    log.status === 'IN_PROGRESS' ? 'bg-[#D4AF37]/ text-[#4A4238]' :
                                    'bg-slate-200 text-slate-800'
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PLANNED">วางแผน</SelectItem>
                                  <SelectItem value="IN_PROGRESS">กำลังดำเนินการ</SelectItem>
                                  <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        )
                      })}

                      {isExpanded && (
                          <TableRow className="bg-[#F8F6F0]/">
                            <TableCell></TableCell>
                            <TableCell colSpan={7} className="pl-12 py-2">
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/" onClick={() => handleAddBlankLog(lot.id)}>
                                    <Plus className="w-3 h-3 mr-1" /> เพิ่มคิวงาน (Add Task)
                                </Button>
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="overflow-x-auto min-h-[500px]">
            <div className="min-w-[1200px] border-t border-slate-200 relative">
              <div className="flex border-b border-slate-200 bg-[#F8F6F0] sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                <div className="w-[250px] shrink-0 p-3 font-semibold text-sm border-r border-slate-200 sticky left-0 bg-[#F8F6F0] z-30 shadow-[1px_0_0_0_#e2e8f0]">Project / Task</div>
                <div className="flex flex-1">
                  {timelineDates.map((date, i) => (
                    <div key={i} className="flex-1 min-w-[60px] p-2 text-center border-r border-slate-200 text-xs">
                      <div className={cn("font-medium", date.getDay() === 0 || date.getDay() === 6 ? "text-red-500" : "text-slate-700")}>{format(date, "EEE")}</div>
                      <div className="text-slate-500">{format(date, "dd MMM")}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 relative">
                <div className="absolute inset-0 left-[250px] flex pointer-events-none">
                    {timelineDates.map((_, i) => (
                        <div key={i} className="flex-1 min-w-[60px] border-r border-slate-200 border-dashed"></div>
                    ))}
                </div>

                {filteredLots.map(lot => {
                  const lotLogs = getSortedLotLogs(lot.id)
                  const showLot = lotLogs.some(log => {
                      const process = processes.find(p => p.id === log.process_id)
                      let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                      if (!pt) return filterDept === "ALL" && log.activity_date
                      return (filterDept === "ALL" || filterDept === pt.id) && log.activity_date
                  });

                  if (filterDept !== "ALL" && !showLot) return null

                  return (
                    <div key={lot.id} className="group relative z-10">
                      <div className="flex bg-white hover:bg-[#F8F6F0] transition-colors h-[40px] items-center border-b border-slate-100">
                        <div className="w-[250px] shrink-0 p-2 border-r border-slate-200 sticky left-0 bg-inherit z-20 shadow-[1px_0_0_0_#e2e8f0]">
                          <div className="font-medium text-sm truncate">{lot.products?.sku} <span className="font-normal text-xs text-slate-500 ml-1">({lot.lot_no})</span></div>
                        </div>
                        <div className="flex flex-1"></div>
                      </div>

                      {lotLogs.map(log => {
                        const process = processes.find(p => p.id === log.process_id)
                        let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                        if (!pt) pt = { id: "OTHER", name: process?.process_name || "Unknown", color: "bg-slate-100 text-slate-800 border-slate-200" }
                        
                        if (filterDept !== "ALL" && filterDept !== pt.id) return null

                        let leftPercent = 0
                        let widthPercent = 0
                        let hasDates = false

                        if (log.activity_date) {
                          const startDate = startOfDay(new Date(log.activity_date))
                          const endDate = log.end_date ? startOfDay(new Date(log.end_date)) : startDate
                          const timelineStart = startOfDay(timelineDates[0])
                          
                          const startDiff = differenceInDays(startDate, timelineStart)
                          const duration = differenceInDays(endDate, startDate) + 1

                          const endDiff = startDiff + duration - 1
                          if (endDiff >= 0 && startDiff < 14) {
                            hasDates = true
                            const actualStartDiff = Math.max(0, startDiff)
                            const actualEndDiff = Math.min(13, endDiff)
                            const actualDuration = actualEndDiff - actualStartDiff + 1
                            
                            leftPercent = (actualStartDiff / 14) * 100
                            widthPercent = (actualDuration / 14) * 100
                          }
                        }

                        if (!hasDates && filterDept !== "ALL") return null;

                        return (
                          <div key={log.id} className="flex bg-white hover:bg-[#F8F6F0] transition-colors h-[40px] items-center border-b border-slate-100">
                            <div className="w-[250px] shrink-0 py-2 px-3 pl-6 border-r border-slate-200 sticky left-0 bg-inherit z-20 shadow-[1px_0_0_0_#e2e8f0] flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", pt.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))}></div>
                              <span className="text-xs font-medium text-slate-600 border-l-2 border-slate-200 pl-2">{process?.process_name || "Unknown"} (T{log.tank_start}-{log.tank_end})</span>
                            </div>
                            <div className="flex flex-1 relative h-full items-center">
                              {hasDates && (
                                <div 
                                  className={cn("absolute rounded-full flex items-center px-3 py-1 text-xs font-medium overflow-hidden shadow-sm transition-all hover:brightness-95 cursor-pointer", pt.color, "z-30")}
                                  style={{ left: `calc(${leftPercent}% + 4px)`, width: `calc(${widthPercent}% - 8px)` }}
                                  title={`รหัสงาน/SKU: ${lot.products?.sku || '-'}\nขั้นตอน: ${process?.process_name || '-'}\nLOT: ${lot.lot_no || '-'}\nถังที่: ${log.tank_start}-${log.tank_end}\nวันที่: ${log.activity_date ? format(new Date(log.activity_date), 'dd MMM yyyy') : '-'}${log.end_date && log.end_date !== log.activity_date ? ` ถึง ${format(new Date(log.end_date), 'dd MMM yyyy')}` : ''}`}
                                >
                                  <span className="truncate">{lot.products?.sku} - {process?.process_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-4 bg-white min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
               <div className="relative">
                  <Input 
                    placeholder="ค้นหา Project, ประเภท, รายละเอียด..." 
                    value={historySearchQuery} 
                    onChange={e => setHistorySearchQuery(e.target.value)} 
                    className="w-full md:w-80"
                  />
               </div>
               <Button variant="outline" onClick={handleExportHistory} className="text-[#0f766e] border-[#0f766e] hover:bg-[#0f766e] hover:text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel (ประวัติ)
               </Button>
            </div>
            
            <div className="rounded-lg border border-slate-200 overflow-hidden">
               <Table>
                 <TableHeader className="bg-[#F8F6F0]">
                   <TableRow>
                     <TableHead className="w-[180px]">วันเวลา</TableHead>
                     <TableHead className="w-[150px]">ผู้ดำเนินการ</TableHead>
                     <TableHead className="w-[150px]">ประเภท</TableHead>
                     <TableHead className="w-[250px]">Project (PO/SKU)</TableHead>
                     <TableHead>รายละเอียด</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {getHistoryData().length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                             ไม่พบประวัติการทำงาน
                          </TableCell>
                       </TableRow>
                    ) : (
                       getHistoryData().map((item) => (
                         <TableRow key={item.id} className="hover:bg-slate-50">
                           <TableCell className="text-slate-600">
                             {format(new Date(item.timestamp), 'dd MMM yyyy')}
                             <span className="text-xs text-slate-400 block">{format(new Date(item.timestamp), 'HH:mm:ss')}</span>
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                                 {item.user.charAt(0)}
                               </div>
                               <span className="text-sm font-medium">{item.user}</span>
                             </div>
                           </TableCell>
                           <TableCell>
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'เพิ่มออเดอร์' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                               {item.type}
                             </span>
                           </TableCell>
                           <TableCell className="font-medium text-[#4A4238]">{item.project}</TableCell>
                           <TableCell className="text-slate-600">{item.details}</TableCell>
                         </TableRow>
                       ))
                    )}
                 </TableBody>
               </Table>
            </div>
          </div>
        )}
      </Card>
      </>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden p-0 bg-white">
          <TaskCalendar 
            tasks={filteredLots.map(lot => ({
              id: lot.id,
              activity_date: lot.fg_due_date,
              status: 'IN_PROGRESS',
              production_lots: {
                lot_no: lot.lot_no,
                products: lot.products,
                sku_id: lot.sku_id
              },
              originalLot: lot
            }))}
            dateField="activity_date"
            onTaskClick={(task) => handleEditLot(task.originalLot)}
          />
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{newLot.id ? "แก้ไขออเดอร์ (Project)" : "เพิ่มออเดอร์ใหม่ (Project)"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>สินค้า (SKU) *</Label>
              <Select value={newLot.product_id} onValueChange={handleProductChange}>
                <SelectTrigger>
                    <SelectValue placeholder="เลือกสินค้า หรือ สร้างใหม่">
                      {newLot.product_id && newLot.product_id !== "NEW" && products.find(p => p.id === newLot.product_id)
                        ? `${products.find(p => p.id === newLot.product_id)?.sku} - ${products.find(p => p.id === newLot.product_id)?.product_name}`
                        : newLot.product_id === "NEW" ? "+ สร้างสินค้าใหม่" : undefined}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW" className="text-[#D4AF37] font-semibold">+ สร้างสินค้าใหม่</SelectItem>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} - {p.product_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {newLot.product_id === 'NEW' && (
              <div className="space-y-2 col-span-2">
                <Label>SKU ใหม่ *</Label>
                <Input placeholder="เช่น JHD-999" value={newLot.new_sku_name} onChange={e => setNewLot({...newLot, new_sku_name: e.target.value})} />
              </div>
            )}

            <div className="space-y-2 col-span-2">
              <Label>ชื่อสินค้า</Label>
              <Input placeholder="เช่น โลชั่นบำรุงผิว" value={newLot.product_name} onChange={e => setNewLot({...newLot, product_name: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>LOT No. *</Label>
              <Input placeholder="เช่น 001/26" value={newLot.lot_number} onChange={e => setNewLot({...newLot, lot_number: e.target.value})} />
            </div>
            
            <div className="space-y-2">
              <Label>PO No. / ใบสั่งผลิต</Label>
              <Input placeholder="เช่น 69PL-062" value={newLot.po_no} onChange={e => setNewLot({...newLot, po_no: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>จำนวนถังรวม (Total Tanks) *</Label>
              <Input type="number" placeholder="เช่น 2" value={newLot.total_tanks} onChange={e => setNewLot({...newLot, total_tanks: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>ยอดออเดอร์ทั้งหมด (pc) *</Label>
              <Input type="number" placeholder="30000" value={newLot.order_quantity} onChange={e => setNewLot({...newLot, order_quantity: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>กำหนดส่ง FG (Due Date)</Label>
              <Input type="date" value={newLot.fg_due_date} onChange={e => setNewLot({...newLot, fg_due_date: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>MFG Date</Label>
              <Input type="date" value={newLot.mfg_date} onChange={e => setNewLot({...newLot, mfg_date: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>EXP Date</Label>
              <Input type="date" value={newLot.exp_date} onChange={e => setNewLot({...newLot, exp_date: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>ประเภทออเดอร์</Label>
              <Select value={newLot.order_type} onValueChange={val => setNewLot({...newLot, order_type: val || ''})}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTS">MTS (Make to Stock)</SelectItem>
                  <SelectItem value="MTO">MTO (Make to Order)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ยอดตามใบสั่งผลิต (pc)</Label>
              <Input type="number" placeholder="เช่น 30000" value={newLot.target_quantity} onChange={e => setNewLot({...newLot, target_quantity: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Cap. ขั้นต่ำ (ชิ้น/ชม.)</Label>
              <Input type="number" placeholder="เช่น 2000" value={newLot.capacity_min} onChange={e => setNewLot({...newLot, capacity_min: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Cap. สูงสุด (ชิ้น/ชม.)</Label>
              <Input type="number" placeholder="เช่น 5000" value={newLot.capacity_max} onChange={e => setNewLot({...newLot, capacity_max: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Bulk size (kg/ถัง)</Label>
              <Input type="number" placeholder="เช่น 250" value={newLot.kg_per_tank} onChange={e => setNewLot({...newLot, kg_per_tank: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>ขนาดบรรจุ (g/ชิ้น)</Label>
              <Input type="number" placeholder="เช่น 150" value={newLot.g_per_piece} onChange={e => setNewLot({...newLot, g_per_piece: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>ลงลัง (ชิ้น/ลัง)</Label>
              <Input type="number" placeholder="เช่น 24" value={newLot.pcs_per_carton} onChange={e => setNewLot({...newLot, pcs_per_carton: e.target.value})} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveLot} disabled={isSaving}>
              {isSaving ? "กำลังบันทึก..." : "บันทึกออเดอร์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
