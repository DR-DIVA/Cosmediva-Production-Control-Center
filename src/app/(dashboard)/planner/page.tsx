'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, Download, Upload, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, 
  Filter, ListTodo, CalendarDays, Calendar as CalendarIcon, CheckCircle2, 
  Clock, AlertTriangle, Activity, History, TrendingUp, Layers, Sparkles, 
  RefreshCw, BarChart3, Package, ShieldCheck, ArrowUpRight, CheckSquare,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { format, differenceInDays, startOfDay, addDays } from "date-fns"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import { getUsers } from '@/app/actions/users'
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
  const [usersList, setUsersList] = useState<any[]>([])
  const [stats, setStats] = useState({ onTime: 0, delayed: 0, early: 0, total: 0 })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDept, setFilterDept] = useState("ALL")
  const [filterOrderType, setFilterOrderType] = useState("ALL")
  const [expandedLots, setExpandedLots] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("table")
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string>("lot_no")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newLot, setNewLot] = useState({
    id: "", product_id: "", lot_number: "", target_quantity: "",
    total_tanks: "", kg_per_tank: "", g_per_piece: "",
    capacity_min: "", capacity_max: "", pcs_per_carton: "",
    order_quantity: "", po_no: "", order_type: "MTS",
    fg_due_date: "", fg_due_date_start: "", new_sku_name: "", unit: "pc",
    mfg_date: "", exp_date: "", product_name: ""
  })

  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [isDoneDialogOpen, setIsDoneDialogOpen] = useState(false)
  const [doneLotId, setDoneLotId] = useState<string | null>(null)
  const [doneFgAmount, setDoneFgAmount] = useState("")
  const [doneCanClosePo, setDoneCanClosePo] = useState("yes")
  const [doneReason, setDoneReason] = useState("")

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        setCurrentUser(user.email || 'Unknown User')
      }
    }
    fetchUser()
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [lotsRes, productsRes, roomsRes, processesRes, logsRes, usersRes] = await Promise.all([
        supabase.from("production_lots").select("*, products(sku)").order("created_at", { ascending: false }),
        supabase.from("products").select("*").order("sku"),
        supabase.from("rooms").select("*").order("room_name"),
        supabase.from("processes").select("*").order("process_name"),
        supabase.from("production_logs").select("*").order("created_at", { ascending: true }),
        getUsers()
      ])

      if (lotsRes.data) setLots(lotsRes.data)
      if (productsRes.data) setProducts(productsRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
      if (processesRes.data) setProcesses(processesRes.data)
      if (logsRes.data) setLogs(logsRes.data)
      if (usersRes.success && usersRes.data) setUsersList(usersRes.data)

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
      fg_due_date_start: lot.planned_start_date || "",
      new_sku_name: "",
      unit: "pc",
      mfg_date: "",
      exp_date: "",
      product_name: lot.products?.product_name || ""
    })
    setIsDialogOpen(true)
  }

  const handleMarkAsDoneClick = (lotId: string) => {
    setDoneLotId(lotId)
    setDoneFgAmount("")
    setDoneCanClosePo("yes")
    setDoneReason("")
    setIsDoneDialogOpen(true)
  }

  const submitMarkAsDone = async () => {
    if (!doneLotId || !doneFgAmount) {
      toast.error("กรุณากรอกจำนวน FG ที่ส่งมอบ")
      return
    }
    if (doneCanClosePo === "no" && !doneReason.trim()) {
      toast.error("กรุณาระบุสาเหตุที่ไม่สามารถปิด PO ได้")
      return
    }

    try {
      const { error: updateErr } = await supabase.from("production_lots").update({ 
        current_status: 'DONE', 
        updated_at: new Date().toISOString() 
      }).eq("id", doneLotId)
      
      if (updateErr) throw updateErr

      const logNote = `ส่งยอด FG: ${doneFgAmount} ชิ้น | ปิด PO: ${doneCanClosePo === 'yes' ? 'ได้เลย' : 'ไม่ได้'}${doneCanClosePo === 'no' ? ` | สาเหตุ: ${doneReason}` : ''}`
      const newLog = {
        production_lot_id: doneLotId,
        status: "COMPLETED",
        activity_date: format(new Date(), "yyyy-MM-dd"),
        process_id: null,
        note: logNote,
        ...(currentUserId ? { created_by: currentUserId } : {})
      }

      const { error: logErr } = await supabase.from("production_logs").insert([newLog])
      if (logErr) console.error("Error inserting completion log:", logErr)

      toast.success("ปิดงานและย้ายไปประวัติเรียบร้อยแล้ว")
      setIsDoneDialogOpen(false)
      fetchData()
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ: " + e.message)
    }
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
        fg_due_date: newLot.fg_due_date || null,
        planned_start_date: newLot.order_type === 'MTS' ? (newLot.fg_due_date_start || null) : null
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
    const getUserName = (id: string | null) => {
      if (id) {
        const u = usersList.find(u => u.id === id);
        if (u) return u.employee_id ? u.employee_id.toUpperCase() : u.full_name;
        if (id === currentUserId && currentUser && currentUser !== 'Unknown User') {
          const empId = currentUser.split('@')[0].toLowerCase();
          const cu = usersList.find(u => u.employee_id?.toLowerCase() === empId);
          return cu?.employee_id ? cu.employee_id.toUpperCase() : currentUser.split('@')[0].toUpperCase();
        }
        return 'Planner';
      } else {
        if (currentUser && currentUser !== 'Unknown User') {
          const empId = currentUser.split('@')[0].toLowerCase();
          const cu = usersList.find(u => u.employee_id?.toLowerCase() === empId);
          return cu?.employee_id ? cu.employee_id.toUpperCase() : currentUser.split('@')[0].toUpperCase();
        }
        return 'Planner';
      }
    };

    const orderHistory = lots.map(lot => ({
      id: `lot-${lot.id}`,
      type: 'เพิ่มออเดอร์',
      project: `${lot.po_no || '-'} / ${lot.products?.sku || 'Unknown SKU'}`,
      timestamp: lot.created_at,
      user: getUserName(lot.created_by),
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
        user: getUserName(log.created_by || log.operator_id),
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

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortColumn("")
        setSortDirection("asc")
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  const filteredLots = lots.filter(lot => {
    if (activeTab === "completed" && lot.current_status !== "DONE") return false;
    if (activeTab !== "completed" && lot.current_status === "DONE") return false;
    if (filterOrderType !== "ALL" && lot.order_type !== filterOrderType) return false;

    return (lot.po_no?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (lot.lot_no?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (lot.products?.sku?.toLowerCase() || "").includes(searchQuery.toLowerCase());
  })

  const sortedLots = [...filteredLots].sort((a, b) => {
    if (!sortColumn) return 0

    let aVal: any = ""
    let bVal: any = ""

    switch (sortColumn) {
      case "po_sku":
        aVal = `${a.po_no || ""} ${a.products?.sku || ""}`.toLowerCase()
        bVal = `${b.po_no || ""} ${b.products?.sku || ""}`.toLowerCase()
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      case "lot_no":
        return sortDirection === "asc" 
          ? (a.lot_no || "").localeCompare(b.lot_no || "", undefined, { numeric: true }) 
          : (b.lot_no || "").localeCompare(a.lot_no || "", undefined, { numeric: true })
      case "order_quantity":
        aVal = Number(a.order_quantity) || 0
        bVal = Number(b.order_quantity) || 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      case "planned_quantity":
        aVal = Number(a.planned_quantity) || 0
        bVal = Number(b.planned_quantity) || 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      case "total_tanks":
        aVal = Number(a.total_tanks) || 0
        bVal = Number(b.total_tanks) || 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      case "kg_per_tank":
        aVal = Number(a.kg_per_tank) || 0
        bVal = Number(b.kg_per_tank) || 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      case "g_per_piece":
        aVal = Number(a.g_per_piece) || 0
        bVal = Number(b.g_per_piece) || 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      case "pcs_per_carton":
        aVal = Number(a.pcs_per_carton) || 0
        bVal = Number(b.pcs_per_carton) || 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      case "order_type":
        aVal = (a.order_type || "").toLowerCase()
        bVal = (b.order_type || "").toLowerCase()
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      case "planned_start_date":
        aVal = a.planned_start_date || a.fg_due_date_start || ""
        bVal = b.planned_start_date || b.fg_due_date_start || ""
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      case "fg_due_date":
        aVal = a.fg_due_date || ""
        bVal = b.fg_due_date || ""
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      default:
        return 0
    }
  })

  const today = new Date()
  const timelineDates = Array.from({ length: 14 }).map((_, i) => addDays(today, i))

  // Executive Planning Calculations
  const totalLotsCount = lots.length
  const uniqueSkusCount = new Set(lots.map(l => l.products?.sku || l.sku_id)).size
  const totalTargetUnits = lots.reduce((acc, l) => acc + (Number(l.planned_quantity) || Number(l.order_quantity) || 0), 0)
  const totalBulksKg = lots.reduce((acc, l) => acc + ((Number(l.total_tanks) || 0) * (Number(l.kg_per_tank) || 0)), 0)
  const totalTanksCount = lots.reduce((acc, l) => acc + (Number(l.total_tanks) || 0), 0)

  const mtsLots = lots.filter(l => l.order_type === 'MTS')
  const mtoLots = lots.filter(l => l.order_type !== 'MTS')
  const lotsWithDueDate = lots.filter(l => l.fg_due_date || l.fg_due_date_start)

  // Accurate task progression & on-time stats
  const totalTasksCount = logs.length
  const doneTasks = logs.filter(l => l.status === 'DONE')
  const doneTasksCount = doneTasks.length
  const progressPct = totalTasksCount > 0 ? ((doneTasksCount / totalTasksCount) * 100).toFixed(1) : '0.0'

  const todayStart = startOfDay(new Date())
  let onTimeTasksCount = 0
  let delayedTasksCount = 0
  let upcomingTasksCount = 0

  logs.forEach(l => {
    if (l.status === 'DONE') {
      if (l.activity_date && l.end_time) {
        const planned = startOfDay(new Date(l.activity_date))
        const actual = startOfDay(new Date(l.end_time))
        if (differenceInDays(actual, planned) <= 0) onTimeTasksCount++
        else delayedTasksCount++
      } else {
        onTimeTasksCount++
      }
    } else if (l.activity_date) {
      const planned = startOfDay(new Date(l.activity_date))
      if (differenceInDays(todayStart, planned) > 0) {
        delayedTasksCount++
      } else {
        upcomingTasksCount++
      }
    } else {
      upcomingTasksCount++
    }
  })

  const otifRate = (onTimeTasksCount + delayedTasksCount) > 0 
    ? ((onTimeTasksCount / (onTimeTasksCount + delayedTasksCount)) * 100).toFixed(1)
    : '100.0'

  // Department Process Breakdown
  const rmTasks = logs.filter(l => {
    const pName = l.processes?.process_name || ''
    return pName.includes('ชั่ง') || l.process_id?.includes('RM')
  })
  const rmDone = rmTasks.filter(l => l.status === 'DONE').length

  const mxTasks = logs.filter(l => {
    const pName = l.processes?.process_name || ''
    return pName.includes('ผสม') || l.process_id?.includes('MX')
  })
  const mxDone = mxTasks.filter(l => l.status === 'DONE').length

  const pkTasks = logs.filter(l => {
    const pName = l.processes?.process_name || ''
    return pName.includes('บรรจุ') || pName.includes('ลงลัง') || l.process_id?.includes('PK')
  })
  const pkDone = pkTasks.filter(l => l.status === 'DONE').length

  const handleRefreshData = () => {
    fetchData()
    toast.success('รีเฟรชข้อมูลแผนการผลิตล่าสุดเรียบร้อยแล้ว')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <CalendarDays className="w-8 h-8 text-yellow-500 shrink-0" />
            CosmeFlow Planning: PD Master Plan
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
            <div>วางแผนการผลิตแม่บท, ควบคุมความพร้อม และติดตามกำหนดส่งมอบ FG</div>
            <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Plan Smarter. Produce Better.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 mr-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[#2D2721] text-white hover:bg-[#3E352B] font-bold' : ''}
            >
              <ListTodo className="w-4 h-4 mr-2" /> แบบตาราง
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-[#2D2721] text-white hover:bg-[#3E352B] font-bold' : ''}
            >
              <CalendarIcon className="w-4 h-4 mr-2" /> ปฏิทิน กำหนดส่งมอบ FG
            </Button>
          </div>
          <Button onClick={handleRefreshData} variant="outline" size="sm" className="flex items-center gap-1.5 bg-[#F8F6F0] hover:bg-slate-100">
            <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
            รีเฟรช
          </Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export</Button>
          <Button onClick={() => {
            setNewLot({
              id: "", product_id: "", lot_number: "", target_quantity: "",
              total_tanks: "", kg_per_tank: "", g_per_piece: "",
              capacity_min: "", capacity_max: "", pcs_per_carton: "",
              order_quantity: "", po_no: "", order_type: "MTS",
              fg_due_date: "", fg_due_date_start: "", new_sku_name: "", unit: "pc",
              mfg_date: "", exp_date: "", product_name: ""
            })
            setIsDialogOpen(true)
          }} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold">
            <Plus className="w-4 h-4 mr-2" /> เพิ่มออเดอร์ใหม่ (Project)
          </Button>
        </div>
      </div>

      {/* 1. Executive Master Planning KPI Summary Bar */}
      <div className="bg-gradient-to-r from-[#2D2721] via-[#3E352B] to-[#2D2721] text-white p-5 rounded-2xl shadow-xl border border-[#D4AF37]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 shrink-0">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Master Schedule & Capacity Intelligence
            </div>
            <div className="text-lg md:text-xl font-black text-white mt-0.5">
              Executive Master Planning KPI
            </div>
            <div className="text-xs text-stone-300 mt-0.5">
              ภาพรวมแผนการผลิต • ความจุการผลิต (Capacity) • และอัตราความตรงต่อเวลาตามแผน (OTIF)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Total Master Lots */}
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[11px] text-stone-300 font-medium">ล็อตการผลิตทั้งหมด</div>
            <div className="text-2xl font-black text-[#D4AF37] tracking-tight">
              {totalLotsCount} <span className="text-xs font-normal text-stone-300">ล็อต</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">({uniqueSkusCount} SKU ไม่ซ้ำ)</div>
          </div>

          {/* Target Production Volume */}
          <div className="bg-emerald-500/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-400/30 text-center">
            <div className="text-[11px] text-emerald-200 font-medium">ยอดผลิตรวม (Target Units)</div>
            <div className="text-2xl font-black text-emerald-400">
              {totalTargetUnits.toLocaleString()} <span className="text-xs font-normal text-emerald-200">ชิ้น</span>
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">({totalBulksKg.toLocaleString()} kg Bulk)</div>
          </div>

          {/* OTIF Schedule Adherence */}
          <div className="bg-blue-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-blue-400/30 text-center">
            <div className="text-[11px] text-blue-200 font-medium">ตรงตามแผนงาน (On-Time)</div>
            <div className="text-2xl font-black text-blue-300">
              {otifRate}%
            </div>
            <div className="text-[10px] text-blue-300 mt-0.5">({onTimeTasksCount} คิวตรงเวลา)</div>
          </div>

          {/* Process Progression */}
          <div className="bg-indigo-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-indigo-400/30 text-center">
            <div className="text-[11px] text-indigo-200 font-medium">ความคืบหน้ารวม (Progress)</div>
            <div className="text-2xl font-black text-indigo-300">
              {progressPct}%
            </div>
            <div className="text-[10px] text-indigo-300 mt-0.5">({doneTasksCount}/{totalTasksCount} งานเสร็จ)</div>
          </div>
        </div>
      </div>

      {/* 2. Four Planning Dimension KPI Cards */}
      {viewMode === 'list' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Master Lots */}
          <Card 
            onClick={() => setActiveTab('table')}
            className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeTab === 'table' ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20 bg-[#F8F6F0]' : 'border-slate-200 hover:border-[#D4AF37]/50 bg-white'}`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#8B7355] flex items-center justify-center font-bold shadow-sm">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">1. ยอดผลิตและออเดอร์</div>
                    <div className="text-[11px] text-slate-500">Master Production Lots</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 font-semibold text-slate-700">
                  {totalLotsCount} ล็อต
                </Badge>
              </div>

              {/* Big Display */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black text-[#4A4238]">{totalTargetUnits.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 ml-1.5 font-medium">ชิ้น</span>
                </div>
                <Badge className="bg-[#D4AF37]/20 text-[#8B7355] border-[#D4AF37]/30 text-[10px] font-bold">
                  {totalTanksCount} ถัง
                </Badge>
              </div>

              {/* Progress */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div style={{ width: '100%' }} className="bg-[#D4AF37] h-full" />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
                <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                  <div className="text-[10px] font-semibold text-[#8B7355]">เนื้อ Bulk รวม</div>
                  <div className="text-xs font-bold text-[#4A4238] mt-0.5">{totalBulksKg.toLocaleString()}</div>
                  <div className="text-[9px] text-[#8B7355] font-medium">kg</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                  <div className="text-[10px] font-semibold text-[#8B7355]">จำนวน SKU</div>
                  <div className="text-xs font-bold text-[#4A4238] mt-0.5">{uniqueSkusCount}</div>
                  <div className="text-[9px] text-[#8B7355] font-medium">SKU</div>
                </div>
                <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                  <div className="text-[10px] font-semibold text-[#8B7355]">ประเภทงาน</div>
                  <div className="text-xs font-bold text-[#4A4238] mt-0.5">{mtsLots.length}/{mtoLots.length}</div>
                  <div className="text-[9px] text-[#8B7355] font-medium">MTS / MTO</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Process Progression */}
          <Card 
            onClick={() => setActiveTab('table')}
            className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeTab === 'table' ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">2. ความคืบหน้ากระบวนการ</div>
                    <div className="text-[11px] text-slate-500">Shopfloor Execution</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                  {progressPct}% เสร็จสิ้น
                </Badge>
              </div>

              {/* Big Display */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black text-indigo-600">{doneTasksCount}</span>
                  <span className="text-xs text-slate-500 ml-1.5 font-medium">/ {totalTasksCount} คิวงาน</span>
                </div>
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                  {totalTasksCount - doneTasksCount} คงค้าง
                </Badge>
              </div>

              {/* Progress */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div style={{ width: `${progressPct}%` }} className="bg-indigo-500 h-full transition-all duration-500" title={`Progress: ${progressPct}%`} />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
                <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                  <div className="text-[10px] font-semibold text-amber-700">1. ชั่งสาร</div>
                  <div className="text-xs font-bold text-amber-800 mt-0.5">{rmDone}/{rmTasks.length}</div>
                  <div className="text-[9px] text-amber-600 font-medium">เสร็จแล้ว</div>
                </div>
                <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                  <div className="text-[10px] font-semibold text-indigo-700">2. ผสม Bulk</div>
                  <div className="text-xs font-bold text-indigo-800 mt-0.5">{mxDone}/{mxTasks.length}</div>
                  <div className="text-[9px] text-indigo-600 font-medium">เสร็จแล้ว</div>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <div className="text-[10px] font-semibold text-emerald-700">3. บรรจุ/ลงลัง</div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">{pkDone}/{pkTasks.length}</div>
                  <div className="text-[9px] text-emerald-600 font-medium">เสร็จแล้ว</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: FG Delivery Due Dates */}
          <Card 
            onClick={() => setViewMode('calendar')}
            className="cursor-pointer transition-all duration-200 border-2 hover:shadow-lg border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/20"
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">3. กำหนดส่งมอบ FG</div>
                    <div className="text-[11px] text-slate-500">Delivery Milestones</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                  {lotsWithDueDate.length} ล็อตมี Due
                </Badge>
              </div>

              {/* Big Display */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black text-emerald-600">{mtoLots.length}</span>
                  <span className="text-xs text-slate-500 ml-1.5 font-medium">MTO • {mtsLots.length} MTS</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                  ปฏิทินส่งมอบ
                </Badge>
              </div>

              {/* Progress */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div style={{ width: `${(lotsWithDueDate.length / (totalLotsCount || 1)) * 100}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
                <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <div className="text-[10px] font-semibold text-emerald-700">MTO Due Date</div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">{mtoLots.length}</div>
                  <div className="text-[9px] text-emerald-600 font-medium">ออเดอร์</div>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <div className="text-[10px] font-semibold text-emerald-700">MTS Rolling</div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">{mtsLots.length}</div>
                  <div className="text-[9px] text-emerald-600 font-medium">ล็อตสต๊อก</div>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <div className="text-[10px] font-semibold text-emerald-700">ดูปฏิทิน</div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">คลิกเพื่อดู</div>
                  <div className="text-[9px] text-emerald-600 font-medium">Calendar</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Schedule Adherence */}
          <Card 
            onClick={() => setActiveTab('timeline')}
            className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeTab === 'timeline' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">4. สถานะตามแผนงาน</div>
                    <div className="text-[11px] text-slate-500">Schedule Adherence</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                  OTIF {otifRate}%
                </Badge>
              </div>

              {/* Big Display */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black text-blue-600">{onTimeTasksCount}</span>
                  <span className="text-xs text-slate-500 ml-1.5 font-medium">คิวตรงแผน ({otifRate}%)</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                  {delayedTasksCount > 0 ? `${delayedTasksCount} ล่าช้า` : 'ไม่มีงานล่าช้า'}
                </Badge>
              </div>

              {/* Progress */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div style={{ width: `${otifRate}%` }} className="bg-blue-500 h-full transition-all duration-500" title={`On Time: ${otifRate}%`} />
                <div style={{ width: `${100 - Number(otifRate)}%` }} className="bg-rose-500 h-full transition-all duration-500" title="Delayed" />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
                <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <div className="text-[10px] font-semibold text-emerald-700">ตรงแผน</div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">{onTimeTasksCount}</div>
                  <div className="text-[9px] text-emerald-600 font-medium">คิวงาน</div>
                </div>
                <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                  <div className="text-[10px] font-semibold text-rose-700">ล่าช้า/เสี่ยง</div>
                  <div className="text-xs font-bold text-rose-800 mt-0.5">{delayedTasksCount}</div>
                  <div className="text-[9px] text-rose-600 font-medium">คิวงาน</div>
                </div>
                <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                  <div className="text-[10px] font-semibold text-blue-700">รอดำเนินการ</div>
                  <div className="text-xs font-bold text-blue-800 mt-0.5">{upcomingTasksCount}</div>
                  <div className="text-[9px] text-blue-600 font-medium">คิวในอนาคต</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-slate-100/80 p-1 rounded-xl">
                <TabsTrigger value="table" className="rounded-lg data-active:bg-slate-800 data-[active]:bg-slate-800 data-[active]:text-white data-active:text-white transition-all">Main Table</TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-lg data-active:bg-indigo-600 data-[active]:bg-indigo-600 data-[active]:text-white data-active:text-white transition-all">Timeline</TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2 rounded-lg data-active:bg-blue-600 data-[active]:bg-blue-600 data-[active]:text-white data-active:text-white transition-all">
                  <History className="w-4 h-4" />
                  ประวัติการทำงานแบบต่อเนื่อง
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-2 rounded-lg text-emerald-600 data-active:bg-emerald-500 data-[active]:bg-emerald-500 data-[active]:text-white data-active:text-white transition-all">
                  <CheckCircle2 className="w-4 h-4" />
                  งานที่เสร็จสิ้น (Completed)
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
            {sortColumn && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSortColumn("")} 
                className="h-8 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                title="คลิกเพื่อรีเซ็ตการเรียงลำดับ"
              >
                <span>เรียงตาม: {sortColumn} ({sortDirection.toUpperCase()})</span>
                <X className="w-3 h-3 ml-1" />
              </Button>
            )}
            <div className="hidden md:flex bg-slate-100 p-1 rounded-md mr-2">
              <Button size="sm" variant={filterOrderType === "ALL" ? "default" : "ghost"} onClick={() => setFilterOrderType("ALL")} className="h-7 text-xs">ทั้งหมด</Button>
              <Button size="sm" variant={filterOrderType === "MTS" ? "default" : "ghost"} onClick={() => setFilterOrderType("MTS")} className="h-7 text-xs">MTS</Button>
              <Button size="sm" variant={filterOrderType === "MTO" ? "default" : "ghost"} onClick={() => setFilterOrderType("MTO")} className="h-7 text-xs">MTO</Button>
            </div>
            <Input placeholder="ค้นหา PO หรือ SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64 h-9" />
          </div>
        </div>

        {(activeTab === "table" || activeTab === "completed") && (
          <div className="overflow-x-auto min-h-[500px]">
            <Table>
              <TableHeader className="bg-[#F8F6F0] sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  
                  <TableHead 
                    onClick={() => handleSort("po_sku")} 
                    className="min-w-[200px] cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Project (PO/SKU)</span>
                      {sortColumn === "po_sku" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("lot_no")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>LOT</span>
                      {sortColumn === "lot_no" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("order_quantity")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ยอดออเดอร์</span>
                      {sortColumn === "order_quantity" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("planned_quantity")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>FG Delivery</span>
                      {sortColumn === "planned_quantity" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("total_tanks")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>จำนวนถัง</span>
                      {sortColumn === "total_tanks" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("kg_per_tank")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Bulk (kg)</span>
                      {sortColumn === "kg_per_tank" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("g_per_piece")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>บรรจุ (g)</span>
                      {sortColumn === "g_per_piece" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("pcs_per_carton")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ลงลัง (ชิ้น)</span>
                      {sortColumn === "pcs_per_carton" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("order_type")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ประเภท</span>
                      {sortColumn === "order_type" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("planned_start_date")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>วันที่เริ่มส่งมอบ FG (MTS)</span>
                      {sortColumn === "planned_start_date" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("fg_due_date")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>วันที่ส่งมอบ FG เสร็จสิ้น (MTS)</span>
                      {sortColumn === "fg_due_date" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("fg_due_date")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>กำหนดส่งมอบ FG (MTO)</span>
                      {sortColumn === "fg_due_date" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLots.map((lot) => {
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
                        <TableCell className="font-semibold text-emerald-600">{lot.planned_quantity ? `${lot.planned_quantity.toLocaleString()} pc` : "-"}</TableCell>
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
                          {(!lot.order_type || lot.order_type === 'MTS') ? (
                            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full w-max">
                              Start: {lot.planned_start_date ? format(new Date(lot.planned_start_date), "dd MMM yyyy") : "-"}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {(!lot.order_type || lot.order_type === 'MTS') ? (
                            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full w-max">
                              End: {lot.fg_due_date ? format(new Date(lot.fg_due_date), "dd MMM yyyy") : "-"}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {lot.order_type === 'MTO' ? (
                            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full w-max">
                              Due: {lot.fg_due_date ? format(new Date(lot.fg_due_date), "dd MMM yyyy") : "-"}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {activeTab !== "completed" && (
                              <Button variant="outline" size="sm" className="h-8 px-3 text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); handleMarkAsDoneClick(lot.id); }}>
                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> ปิดงาน
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-8 px-3 text-slate-600 hover:text-slate-800 bg-white" onClick={(e) => { e.stopPropagation(); handleEditLot(lot); }}>
                              <Pencil className="w-4 h-4 mr-1.5" /> แก้ไข
                            </Button>
                          </div>
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
                                      <span className="line-clamp-2 break-words text-wrap">{process?.process_name || "เลือกงาน"}</span>
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
                          <div className="font-medium text-sm line-clamp-2 break-words text-wrap">{lot.products?.sku} <span className="font-normal text-xs text-slate-500 ml-1">({lot.lot_no})</span></div>
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
                                  <span className="line-clamp-2 break-words text-wrap">{lot.products?.sku} - {process?.process_name}</span>
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
        <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{newLot.id ? "แก้ไขออเดอร์ (Project)" : "เพิ่มออเดอร์ใหม่ (Project)"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
            <div className="space-y-2 col-span-2 md:col-span-4">
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
              <div className="space-y-2 col-span-2 md:col-span-4">
                <Label>SKU ใหม่ *</Label>
                <Input placeholder="เช่น JHD-999" value={newLot.new_sku_name} onChange={e => setNewLot({...newLot, new_sku_name: e.target.value})} />
              </div>
            )}

            <div className="space-y-2 col-span-2 md:col-span-4">
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
              <Label>ประเภทออเดอร์</Label>
              <Select value={newLot.order_type} onValueChange={val => setNewLot({...newLot, order_type: val || ''})}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTS">MTS (Make to Stock)</SelectItem>
                  <SelectItem value="MTO">MTO (Make to Order)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(!newLot.order_type || newLot.order_type === 'MTS') ? (
              <>
                <div className="space-y-2">
                  <Label>วันที่เริ่มส่งมอบ FG (MTS)</Label>
                  <Input type="date" value={newLot.fg_due_date_start} onChange={e => setNewLot({...newLot, fg_due_date_start: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>วันที่ส่งมอบ FG เสร็จสิ้น (MTS)</Label>
                  <Input type="date" value={newLot.fg_due_date} onChange={e => setNewLot({...newLot, fg_due_date: e.target.value})} />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>กำหนดส่งมอบ FG (MTO)</Label>
                <Input type="date" value={newLot.fg_due_date} onChange={e => setNewLot({...newLot, fg_due_date: e.target.value})} />
              </div>
            )}

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

      {/* Mark As Done Dialog */}
      <Dialog open={isDoneDialogOpen} onOpenChange={setIsDoneDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ปิดงานและส่งมอบ FG</DialogTitle>
            <DialogDescription>
              กรุณากรอกข้อมูลการส่งมอบ FG ให้ทางบัญชีเปิดบิล/ใบส่งของให้ลูกค้า
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fg-amount" className="text-right">จำนวน FG (ชิ้น)</Label>
              <Input
                id="fg-amount"
                type="number"
                className="col-span-3"
                placeholder="ระบุจำนวน..."
                value={doneFgAmount}
                onChange={(e) => setDoneFgAmount(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">ปิด PO</Label>
              <Select value={doneCanClosePo} onValueChange={(val) => setDoneCanClosePo(val || '')}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="เลือก..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">ปิด PO ได้เลย</SelectItem>
                  <SelectItem value="no">ยังปิดไม่ได้</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="reason" className="text-right pt-2">สาเหตุ</Label>
              <Textarea
                id="reason"
                className="col-span-3"
                placeholder={doneCanClosePo === "no" ? "ระบุสาเหตุที่ยังปิด PO ไม่ได้..." : "ระบุสาเหตุหรือหมายเหตุเพิ่มเติม (ถ้ามี)"}
                value={doneReason}
                onChange={(e) => setDoneReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDoneDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={submitMarkAsDone} className="bg-emerald-600 hover:bg-emerald-700 text-white">ยืนยันปิดงาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
