'use client'

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, Download, Upload, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  Filter, ListTodo, CalendarDays, Calendar as CalendarIcon, Calendar, CheckCircle2, AlertCircle,
  Clock, AlertTriangle, Activity, History, TrendingUp, Layers, Sparkles, 
  RefreshCw, BarChart3, Package, ShieldCheck, ArrowUpRight, CheckSquare,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, Search, RotateCcw, UserCheck, User,
  Printer, Lock, Gift
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { format, differenceInDays, startOfDay, addDays, isSameDay } from "date-fns"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { getUsers } from '@/app/actions/users'
import * as XLSX from "xlsx"
import { cn, getBaseOrderType, isLotFirstBatch, parseDeliverySchedule, type DeliveryInstallment } from "@/lib/utils"
import { canEditRoute } from "@/lib/permissions"
import { TaskCalendar } from "@/components/ui/TaskCalendar"
import { TimelinePrintModal } from "@/components/planner/TimelinePrintModal"
import { MasterPlanningTimeline } from "@/components/planner/MasterPlanningTimeline"
import { useKpiPeriod } from "@/hooks/useKpiPeriod"
import { KpiReportingPeriodToolbar } from "@/components/common/KpiReportingPeriodToolbar"
import { 
  PLAN_CHANGE_CATEGORIES, 
  parsePlanChangeInfo, 
  formatPlanChangeNote, 
  getPlanCategoryLabel,
  cleanDisplayNote,
  extractUserComment,
  isTaskStartedByShopfloor,
  isTaskCompleted,
  canResetStartedTask,
  formatResetStartNote
} from "@/lib/planTracking"

const PROCESS_TYPES = [
  { id: "RM", name: "ชั่งสาร", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "MX", name: "ผสม", color: "bg-[#D4AF37]/ text-[#4A4238] border-[#D4AF37]/30" },
  { id: "PK", name: "บรรจุ", color: "bg-emerald-100 text-emerald-800 border-emerald-200" }
]

const searchMap: Record<string, string> = { "RM": "ชั่งสาร", "MX": "ผสม", "PK": "บรรจุ" }
const ALLOWED_PROCESSES = ["ชั่งสาร", "ผสม", "บรรจุ", "ลงลัง", "ส่งมอบ FG"]

export default function PlannerPage() {
  const supabase = useMemo(() => createClient(), [])
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
  
  // Toggle Switch: Show/Hide Shopfloor Operational Handover Tasks (รอ QC, รอ POF, รอเข้าคลัง FG, ลงลัง)
  const [showShopfloorHandovers, setShowShopfloorHandovers] = useState(false)
  const [isTimelinePrintOpen, setIsTimelinePrintOpen] = useState(false)
  const [timelineViewMode, setTimelineViewMode] = useState<'plan' | 'actual' | 'compare'>('plan')
  const [timelineRangeMode, setTimelineRangeMode] = useState<'auto' | '15_centered' | '21_extended' | '14_future' | '14_past'>('auto')
  const [timelineOffsetDays, setTimelineOffsetDays] = useState<number>(0)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cosmeflow_planner_show_handovers')
      if (saved !== null) {
        setShowShopfloorHandovers(saved === 'true')
      }
    } catch {}
  }, [])

  const toggleShowShopfloorHandovers = () => {
    setShowShopfloorHandovers(prev => {
      const next = !prev
      try {
        localStorage.setItem('cosmeflow_planner_show_handovers', String(next))
      } catch {}
      return next
    })
  }
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newLot, setNewLot] = useState({
    id: "", product_id: "", lot_number: "", target_quantity: "",
    total_tanks: "", kg_per_tank: "", g_per_piece: "",
    capacity_min: "", capacity_max: "", pcs_per_carton: "",
    order_quantity: "", po_no: "", order_type: "MTS",
    fg_due_date: "", fg_due_date_start: "", due_date: "", new_sku_name: "", unit: "pc",
    mfg_date: "", exp_date: "", product_name: "",
    is_first_batch: false,
    delivery_mode: "single" as "single" | "multiple",
    delivery_schedule: [] as DeliveryInstallment[]
  })

  const [currentUser, setCurrentUser] = useState<string>('Unknown User')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin')
  const canEdit = canEditRoute('/planner', currentUserRole)

  // Column search filters for History Tab
  const [historyFilters, setHistoryFilters] = useState({
    time: '',
    user: '',
    type: 'ALL',
    project: '',
    details: ''
  })

  // State for changing / editing operator ("หรือแก้ไขข้อมูล")
  const [editingOperatorItem, setEditingOperatorItem] = useState<{
    id: string
    recordId: string
    isLog: boolean
    currentUserName: string
    currentUserId?: string | null
    project: string
  } | null>(null)
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('')
  const [isUpdatingOperator, setIsUpdatingOperator] = useState(false)

  const [isDoneDialogOpen, setIsDoneDialogOpen] = useState(false)
  const [doneLotId, setDoneLotId] = useState<string | null>(null)
  const [doneFgAmount, setDoneFgAmount] = useState("")
  const [doneCanClosePo, setDoneCanClosePo] = useState("yes")
  const [doneReason, setDoneReason] = useState("")

  // Plan Reschedule Dialog State
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean
    logId: string
    lotNo: string
    sku: string
    processName: string
    originalDate: string
    newDate: string
    field: 'activity_date' | 'end_date'
    category: string
    reason: string
    currentNote: string
    revisionCount: number
    isStartedOverride?: boolean
  } | null>(null)

  // Reset Mistaken Start Dialog State
  const [resetStartModal, setResetStartModal] = useState<{
    isOpen: boolean
    logId: string
    lotNo: string
    sku: string
    processName: string
    startTime?: string | null
    reason: string
    isSubmitting: boolean
  } | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          const emailPrefix = user.email ? user.email.split('@')[0] : ''
          const metaEmpId = user.user_metadata?.employee_id || emailPrefix

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .or(`id.eq.${user.id},employee_id.ilike.${metaEmpId || user.id}`)
            .maybeSingle()

          const empId = (profile?.employee_id || metaEmpId || emailPrefix || 'PLANNER').toUpperCase()
          setCurrentUser(empId)
          setCurrentUserInfo(profile || { id: user.id, employee_id: empId, full_name: user.user_metadata?.full_name || empId })
          setCurrentUserRole(profile?.role || user.user_metadata?.role || 'admin')
        }
      } catch (err) {
        console.error('Error fetching auth user in planner:', err)
      }
    }
    fetchUser()
    fetchData()
  }, [])

const fetchAllProductionLogs = async (client: any) => {
  let allLogs: any[] = []
  let from = 0
  const step = 1000
  let hasMore = true

  while (hasMore) {
    const to = from + step - 1
    const { data, error } = await client
      .from('production_logs')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('Error fetching paginated production_logs:', error)
      break
    }

    if (data && data.length > 0) {
      allLogs = allLogs.concat(data)
      if (data.length < step) {
        hasMore = false
      } else {
        from += step
      }
    } else {
      hasMore = false
    }
  }

  return allLogs
}

const fetchAllProductionLots = async (client: any) => {
  let allLots: any[] = []
  let from = 0
  const step = 1000
  let hasMore = true

  while (hasMore) {
    const to = from + step - 1
    const { data, error } = await client
      .from('production_lots')
      .select('*, products(sku)')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching paginated production_lots:', error)
      break
    }

    if (data && data.length > 0) {
      allLots = allLots.concat(data)
      if (data.length < step) {
        hasMore = false
      } else {
        from += step
      }
    } else {
      hasMore = false
    }
  }

  return allLots
}

  const fetchData = async () => {
    try {
      const [lotsData, productsRes, roomsRes, processesRes, logsData, usersRes] = await Promise.all([
        fetchAllProductionLots(supabase),
        supabase.from("products").select("*").order("sku"),
        supabase.from("rooms").select("*").order("room_name"),
        supabase.from("processes").select("*").order("process_name"),
        fetchAllProductionLogs(supabase),
        getUsers()
      ])

      if (lotsData) setLots(lotsData)
      if (productsRes.data) setProducts(productsRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
      if (processesRes.data) setProcesses(processesRes.data)
      if (logsData) setLogs(logsData)
      if (usersRes.success && usersRes.data) setUsersList(usersRes.data)

      if (logsData) {
        let onTime = 0, delayed = 0, early = 0
        logsData.forEach(log => {
          if (!log.activity_date) return
          const planned = startOfDay(new Date(log.activity_date))
          const actual = startOfDay(log.end_time ? new Date(log.end_time) : new Date())
          const diff = differenceInDays(actual, planned)
          if (diff > 0) delayed++
          else if (diff < 0) early++
          else onTime++
        })
        setStats({ onTime, delayed, early, total: logsData.length })
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
    const cleanOrderType = getBaseOrderType(lot.order_type)
    const isFirstBatch = isLotFirstBatch(lot)
    const existingSchedule = parseDeliverySchedule(lot.delivery_schedule)
    const hasMultiple = existingSchedule.length > 0

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
      order_type: cleanOrderType,
      fg_due_date: lot.fg_due_date || "",
      fg_due_date_start: lot.planned_start_date || "",
      due_date: lot.due_date || lot.fg_due_date || "",
      new_sku_name: "",
      unit: "pc",
      mfg_date: "",
      exp_date: "",
      product_name: lot.products?.product_name || "",
      is_first_batch: isFirstBatch,
      delivery_mode: hasMultiple ? "multiple" : "single",
      delivery_schedule: hasMultiple ? existingSchedule : []
    })
    setIsDialogOpen(true)
  }

  const handleAddInstallment = () => {
    const current = newLot.delivery_schedule || []
    const nextNum = current.length + 1
    const orderQty = parseFloat(newLot.order_quantity || "0")
    const allocated = current.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const remaining = Math.max(0, orderQty - allocated)
    
    setNewLot(prev => ({
      ...prev,
      delivery_schedule: [
        ...(prev.delivery_schedule || []),
        {
          installment: nextNum,
          date: prev.due_date || prev.fg_due_date || format(new Date(), "yyyy-MM-dd"),
          quantity: remaining > 0 ? remaining : 0,
          note: `งวดที่ ${nextNum}`
        }
      ]
    }))
  }

  const handleUpdateInstallment = (index: number, field: keyof DeliveryInstallment, value: any) => {
    setNewLot(prev => {
      const updated = [...(prev.delivery_schedule || [])]
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value }
      }
      return { ...prev, delivery_schedule: updated }
    })
  }

  const handleRemoveInstallment = (index: number) => {
    setNewLot(prev => {
      const filtered = (prev.delivery_schedule || [])
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, installment: idx + 1 }))
      return { ...prev, delivery_schedule: filtered }
    })
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

      const userIdentifier = (currentUserInfo?.employee_id || currentUser || 'PLANNER').toUpperCase()
      const logNote = `ส่งยอด FG: ${doneFgAmount} ชิ้น | ปิด PO: ${doneCanClosePo === 'yes' ? 'ได้เลย' : 'ไม่ได้'}${doneCanClosePo === 'no' ? ` | สาเหตุ: ${doneReason}` : ''} (โดย ${userIdentifier})`
      const newLog = {
        production_lot_id: doneLotId,
        status: "COMPLETED",
        activity_date: format(new Date(), "yyyy-MM-dd"),
        process_id: null,
        note: logNote,
        created_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84',
        updated_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84'
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

      const cleanOrderType = getBaseOrderType(newLot.order_type)
      const cleanedSchedule: DeliveryInstallment[] = (newLot.delivery_mode === 'multiple' && Array.isArray(newLot.delivery_schedule))
        ? newLot.delivery_schedule
            .filter((item: any) => item && item.date)
            .map((item: any, idx: number) => ({
              installment: idx + 1,
              date: String(item.date).substring(0, 10),
              quantity: Number(item.quantity) || 0,
              note: item.note ? String(item.note).trim() : ''
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        : []

      const finalFgDueDate = cleanedSchedule.length > 0 
        ? cleanedSchedule[cleanedSchedule.length - 1].date 
        : (newLot.fg_due_date || null)

      const finalEndDate = newLot.due_date || finalFgDueDate || null

      const lotData: any = {
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
        order_type: newLot.is_first_batch 
          ? `${cleanOrderType} [1ST_BATCH]`
          : cleanOrderType,
        fg_due_date: finalFgDueDate,
        planned_start_date: newLot.fg_due_date_start || null,
        due_date: finalEndDate,
        delivery_schedule: cleanedSchedule,
        updated_at: new Date().toISOString(),
        updated_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84'
      }

      if (newLot.id) {
        const { error: updateErr } = await supabase.from("production_lots").update(lotData).eq("id", newLot.id)
        if (updateErr) throw updateErr
        toast.success("แก้ไขงานเรียบร้อย")
      } else {
        lotData.created_by = currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84'
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
      created_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84',
      updated_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84'
    }

    try {
      const { data: insertedLog, error } = await supabase.from("production_logs").insert([newLogData]).select().single()
      if (error) throw error
      toast.success("เพิ่มคิวงานเรียบร้อย")
      if (insertedLog) {
        setLogs(prev => [...prev, insertedLog])
      }
      setExpandedLots(prev => ({ ...prev, [lotId]: true }))
      fetchData()
    } catch (e: any) {
      toast.error("เพิ่มคิวงานไม่สำเร็จ: " + e.message)
    }
  }

  const handleDeleteLog = async (logId: string) => {
    const existingLog = logs.find(l => l.id === logId)
    if (existingLog && isTaskStartedByShopfloor(existingLog)) {
      toast.error("ไม่อนุญาตให้ลบคิวงานนี้ เนื่องจากหน้างานกดเริ่มงานแล้ว (หากเผลอกดเริ่มผิด ให้คลิกปุ่ม 'ยกเลิกเริ่มผิด' เพื่อคืนสถานะก่อนลบ)")
      return
    }
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

  const handleOpenResetStart = (log: any, lot: any, process: any) => {
    if (!canEdit) return
    setResetStartModal({
      isOpen: true,
      logId: log.id,
      lotNo: lot?.lot_no || '-',
      sku: lot?.products?.sku || lot?.products?.product_name || '-',
      processName: process?.process_name || 'งานผลิต',
      startTime: log.start_time,
      reason: 'พนักงานเผลอกดเริ่มงานผิด',
      isSubmitting: false
    })
  }

  const handleConfirmResetStart = async () => {
    if (!resetStartModal) return
    const { logId, reason } = resetStartModal
    const targetLog = logs.find(l => l.id === logId)
    if (!targetLog) {
      setResetStartModal(null)
      return
    }

    setResetStartModal(prev => prev ? { ...prev, isSubmitting: true } : null)

    const userIdentifier = (currentUserInfo?.employee_id || currentUser || 'PLANNER').toUpperCase()
    const updatedNote = formatResetStartNote(targetLog.note, {
      userIdentifier,
      reason: reason.trim() || 'พนักงานเผลอกดเริ่มงานผิด'
    })

    const updateData: any = {
      status: 'WAITING',
      start_time: null,
      note: updatedNote,
      updated_at: new Date().toISOString(),
      updated_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84'
    }

    // Optimistic Update
    setLogs(logs.map(l => l.id === logId ? { ...l, ...updateData } : l))
    setResetStartModal(null)

    try {
      const { error } = await supabase.from("production_logs").update(updateData).eq("id", logId)
      if (error) throw error
      toast.success("ยกเลิกการเริ่มงานเรียบร้อยแล้ว คิวงานกลับสู่สถานะรอเริ่ม")
      fetchData()
    } catch (e: any) {
      toast.error("ยกเลิกการเริ่มงานไม่สำเร็จ: " + e.message)
      fetchData()
    }
  }

  const handleUpdateLogDirect = async (logId: string, field: string, value: any) => {
      const existingLog = logs.find(l => l.id === logId)
      if (existingLog && isTaskStartedByShopfloor(existingLog)) {
        if (field === 'process_id' || field === 'tank_start' || field === 'tank_end') {
          toast.error("ไม่อนุญาตให้แก้ไขขั้นตอน/ถัง เนื่องจากหน้างานกดเริ่มงานแล้ว")
          return
        }
      }

      let updateData: any = { 
        [field]: value,
        updated_at: new Date().toISOString(),
        updated_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84'
      }
      
      if (field === 'activity_date' && value && existingLog) {
        if (!existingLog.end_date || existingLog.end_date === existingLog.activity_date) {
          updateData.end_date = value 
        }
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

  const handleDateInputChange = (log: any, lot: any, process: any, field: 'activity_date' | 'end_date', newDateValue: string) => {
    if (isTaskCompleted(log)) {
      toast.error(`ไม่อนุญาตให้แก้ไขวันตามแผน เนื่องจากงาน${process?.process_name || ''}ผลิตเสร็จสิ้นแล้ว`)
      return
    }

    const isStarted = isTaskStartedByShopfloor(log)
    if (isStarted && !canEdit) {
      toast.error(`ไม่อนุญาตให้แก้ไขวันตามแผน เนื่องจากหน้างาน${process?.process_name || ''}กดเริ่มงานแล้ว`)
      return
    }

    if (!newDateValue) {
      if (isStarted) {
        toast.warning('งานที่เริ่มแล้วไม่สามารถลบวันที่ออกได้')
        return
      }
      handleUpdateLogDirect(log.id, field, newDateValue)
      return
    }

    const currentVal = log[field]
    // If it's a new task with no date set yet, just set it directly
    if (!currentVal) {
      handleUpdateLogDirect(log.id, field, newDateValue)
      return
    }

    // If date hasn't changed, do nothing
    if (currentVal === newDateValue) return

    // Parse existing plan change info
    const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)

    // Check if this date adjustment is during initial plan setup:
    // 1. Task created today (same-day session as opening queue)
    // 2. OR task activity_date is still the untouched automated default creation date
    // AND has never had a genuine reschedule recorded on a subsequent day
    const createdAt = log.created_at ? new Date(log.created_at) : null
    const isCreatedToday = createdAt ? isSameDay(createdAt, new Date()) : false
    const isDefaultCreationDate = createdAt && log.activity_date
      ? format(createdAt, 'yyyy-MM-dd') === log.activity_date
      : false

    const isInitialSetup = (isCreatedToday || isDefaultCreationDate || !currentVal) && !planInfo.isRescheduled && !isStarted

    if (isInitialSetup) {
      handleUpdateLogDirect(log.id, field, newDateValue)
      return
    }

    // It's an existing plan date being modified or a task that has started -> Open Reschedule Modal to track reason
    setRescheduleModal({
      isOpen: true,
      logId: log.id,
      lotNo: lot?.lot_no || '-',
      sku: lot?.products?.sku || lot?.products?.product_name || '-',
      processName: process?.process_name || 'งานผลิต',
      originalDate: planInfo.originalDate || currentVal, // preserve first baseline plan date
      newDate: newDateValue,
      field,
      category: isStarted ? (planInfo.category || 'SHOPFLOOR_HOLD') : (planInfo.category || 'WAIT_RM_PM'),
      reason: planInfo.reason ? cleanDisplayNote(planInfo.reason) : '',
      currentNote: extractUserComment(log.note),
      revisionCount: (planInfo.revisionCount || 0) + 1,
      isStartedOverride: isStarted
    })
  }

  const handleOpenRescheduleDetail = (log: any, lot: any, process: any) => {
    if (isTaskCompleted(log)) {
      toast.info(`คิวงานนี้หน้างาน${process?.process_name || ''}ดำเนินการเสร็จสิ้นแล้ว (${log.status})`)
      return
    }
    const isStarted = isTaskStartedByShopfloor(log)
    const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
    setRescheduleModal({
      isOpen: true,
      logId: log.id,
      lotNo: lot?.lot_no || '-',
      sku: lot?.products?.sku || lot?.products?.product_name || '-',
      processName: process?.process_name || 'งานผลิต',
      originalDate: planInfo.originalDate || log.activity_date || '',
      newDate: log.activity_date || '',
      field: 'activity_date',
      category: isStarted ? (planInfo.category || 'SHOPFLOOR_HOLD') : (planInfo.category || 'WAIT_RM_PM'),
      reason: planInfo.reason ? cleanDisplayNote(planInfo.reason) : '',
      currentNote: extractUserComment(log.note),
      revisionCount: planInfo.revisionCount || 1,
      isStartedOverride: isStarted
    })
  }

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal) return
    const { logId, field, newDate, originalDate, category, reason, currentNote, revisionCount, isStartedOverride } = rescheduleModal
    const existingLog = logs.find(l => l.id === logId)
    if (existingLog && isTaskCompleted(existingLog)) {
      toast.error("ไม่อนุญาตให้ปรับเลื่อนแผนงาน เนื่องจากหน้างานผลิตเสร็จสิ้นแล้ว")
      setRescheduleModal(null)
      return
    }

    if (isStartedOverride && !reason?.trim()) {
      toast.error("คิวงานนี้เริ่มดำเนินการแล้ว กรุณาระบุรายละเอียดเหตุผลในการขยับแผนงาน")
      return
    }

    const userIdentifier = (currentUserInfo?.employee_id || currentUser || 'PLANNER').toUpperCase()

    const formattedNote = formatPlanChangeNote(currentNote, {
      originalDate,
      revisedDate: newDate,
      category,
      reason,
      updatedBy: userIdentifier,
      revisionCount
    })

    const updateData: any = { 
      [field]: newDate,
      note: formattedNote,
      updated_at: new Date().toISOString(),
      updated_by: currentUserId || currentUserInfo?.id || '54168226-988e-4d63-93d2-1a742aafdd84'
    }

    // If updating activity_date and end_date was same as old activity_date, adjust end_date too
    if (field === 'activity_date' && existingLog && (!existingLog.end_date || existingLog.end_date === existingLog.activity_date)) {
      updateData.end_date = newDate
    }

    // Optimistic Update
    setLogs(logs.map(l => l.id === logId ? { ...l, ...updateData } : l))
    setRescheduleModal(null)

    try {
      const { error } = await supabase.from("production_logs").update(updateData).eq("id", logId)
      if (error) throw error
      toast.success("บันทึกการปรับเลื่อนแผนงานเรียบร้อย")
    } catch (e: any) {
      toast.error("อัปเดตไม่สำเร็จ: " + e.message)
      fetchData()
    }
  }

  const handleQuickRescheduleWithoutReason = async () => {
    if (!rescheduleModal) return
    const { logId, field, newDate, isStartedOverride } = rescheduleModal
    if (isStartedOverride) {
      toast.warning("งานที่เริ่มดำเนินการแล้ว บังคับต้องระบุเหตุผลในการขยับแผน")
      return
    }
    const existingLog = logs.find(l => l.id === logId)
    if (existingLog && isTaskStartedByShopfloor(existingLog)) {
      toast.error("ไม่อนุญาตให้ปรับเลื่อนแผนงานโดยไม่ระบุเหตุผล เนื่องจากหน้างานเริ่มงานแล้ว")
      return
    }
    setRescheduleModal(null)
    await handleUpdateLogDirect(logId, field, newDate)
  }

  const handleToggleFirstBatch = async (log: any, lot: any) => {
    if (!canEdit) return
    if (isTaskStartedByShopfloor(log)) {
      toast.error("ไม่อนุญาตให้ปรับเปลี่ยน 1st Batch เนื่องจากหน้างานกดเริ่มงานแล้ว (ล็อกเพื่อประเมิน KPI ความแม่นยำ)")
      return
    }
    const currentNote = log.note || ''
    const hasTag = currentNote.toLowerCase().includes('[1st_batch]')
    let newNote = ''
    if (hasTag) {
      newNote = currentNote.replace(/\[1st_batch[^\]]*\]/gi, '').trim()
    } else {
      const tankNum = log.tank_start || 1
      newNote = currentNote ? `${currentNote}\n[1ST_BATCH: ถัง ${tankNum}]` : `[1ST_BATCH: ถัง ${tankNum}]`
    }

    const updateData: any = { 
      note: newNote,
      updated_at: new Date().toISOString(),
      ...(currentUserId ? { updated_by: currentUserId } : {})
    }

    // Optimistic update
    setLogs(logs.map(l => l.id === log.id ? { ...l, ...updateData } : l))

    try {
      const { error } = await supabase.from('production_logs').update(updateData).eq('id', log.id)
      if (error) throw error
      toast.success(hasTag ? 'ยกเลิกสถานะ 1st Batch เรียบร้อย' : `กำหนดเป็น 1st Batch (ถัง ${log.tank_start || 1}) เรียบร้อย ระบบจะแจ้งเตือน QA และ MX บนเรดาร์ 21 วัน`)
    } catch (err: any) {
      toast.error('อัปเดตไม่สำเร็จ: ' + err.message)
      fetchData()
    }
  }

  const isHandoverProcess = (processName?: string) => {
    if (!processName) return false
    const p = processName.trim()
    return (
      p.startsWith('รอ') ||
      p.includes('รอ QC') ||
      p.includes('รอ POF') ||
      p.includes('รอเข้าคลัง') ||
      p.includes('รออุโมงค์') ||
      p.includes('รอบรรจุ') ||
      p === 'ลงลัง'
    )
  }

  const handoverTasksCount = useMemo(() => {
    return logs.filter(l => {
      const process = processes.find(p => p.id === l.process_id)
      const pName = process?.process_name || l.processes?.process_name || ''
      return isHandoverProcess(pName)
    }).length
  }, [logs, processes])

  const getSortedLotLogs = (lotId: string, includeHandovers: boolean = showShopfloorHandovers) => {
    return logs
      .filter(l => {
        if (l.production_lot_id !== lotId) return false
        if (!includeHandovers) {
          const process = processes.find(p => p.id === l.process_id)
          const pName = process?.process_name || l.processes?.process_name || ''
          if (isHandoverProcess(pName)) return false
        }
        return true
      })
      .sort((a, b) => {
        const processA = processes.find(p => p.id === a.process_id)?.process_name || ""
        const processB = processes.find(p => p.id === b.process_id)?.process_name || ""
        const orderMap: Record<string, number> = { "ชั่งสาร": 1, "ผสม": 2, "บรรจุ": 3 }
        const weightA = orderMap[processA] || 99
        const weightB = orderMap[processB] || 99
        if (weightA !== weightB) return weightA - weightB
        const tA = a.tank_start === null || a.tank_start === undefined ? 9999 : a.tank_start
        const tB = b.tank_start === null || b.tank_start === undefined ? 9999 : b.tank_start
        if (tA !== tB) return tA - tB
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeA - timeB
      })
  }

  
  interface UserMeta {
    username: string;
    fullName: string;
    isSystem: boolean;
    userId?: string | null;
  }

  const resolveUserMeta = (
    userId: string | null | undefined,
    fallbackName?: string | null,
    isHandover: boolean = false
  ): UserMeta => {
    // 1. Check UUID first
    if (userId) {
      const u = usersList.find(u => u.id === userId);
      if (u) {
        const uname = (u.employee_id || u.username || u.full_name || 'USER').toUpperCase();
        return {
          username: uname,
          fullName: u.full_name || uname,
          isSystem: false,
          userId: u.id
        };
      }
    }

    // 2. Check fallback string (e.g. from note updatedBy or (โดย USERNAME))
    if (fallbackName && fallbackName.trim()) {
      const cleanName = fallbackName.trim();
      if (cleanName.toLowerCase() === 'system') {
        return { username: 'SYSTEM', fullName: 'ระบบส่งต่องานอัตโนมัติ', isSystem: true, userId: null };
      }
      if (cleanName.toLowerCase() === 'planner') {
        const planner = usersList.find(u => u.role?.includes('planner:edit') || u.employee_id?.toUpperCase().startsWith('PL'));
        return {
          username: planner?.employee_id?.toUpperCase() || 'PLPTB1234',
          fullName: planner?.full_name || 'คุณพรทิพย์ บูรณ์รัตน์ธรรม',
          isSystem: false,
          userId: planner?.id || null
        };
      }
      const matched = usersList.find(u => 
        u.employee_id?.toUpperCase() === cleanName.toUpperCase() ||
        (u.username && u.username.toUpperCase() === cleanName.toUpperCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(cleanName.toLowerCase()))
      );
      if (matched) {
        return {
          username: (matched.employee_id || cleanName).toUpperCase(),
          fullName: matched.full_name || cleanName,
          isSystem: false,
          userId: matched.id
        };
      }
      return {
        username: cleanName.toUpperCase(),
        fullName: cleanName,
        isSystem: false,
        userId: null
      };
    }

    // 3. If automated handover queue without user modification
    if (isHandover) {
      return { username: 'SYSTEM', fullName: 'ระบบส่งต่องานอัตโนมัติ', isSystem: true, userId: null };
    }

    // 4. Default for production planning queue: Official Planner Officer (PLPTB1234 คุณพรทิพย์ บูรณ์รัตน์ธรรม)
    const defaultPlanner = usersList.find(u => u.role?.includes('planner:edit') || u.employee_id?.toUpperCase().startsWith('PL'));
    return {
      username: defaultPlanner?.employee_id?.toUpperCase() || 'PLPTB1234',
      fullName: defaultPlanner?.full_name || 'คุณพรทิพย์ บูรณ์รัตน์ธรรม',
      isSystem: false,
      userId: defaultPlanner?.id || null
    };
  };

  const getHistoryData = () => {
    const orderHistory = lots.map(lot => {
      const creatorMeta = resolveUserMeta(lot.created_by, null, false);
      const editorMeta = lot.updated_by ? resolveUserMeta(lot.updated_by, null, false) : null;
      const isEdited = Boolean(lot.updated_by && lot.updated_by !== lot.created_by);
      const primaryUser = isEdited && editorMeta ? editorMeta : creatorMeta;

      return {
        id: `lot-${lot.id}`,
        recordId: lot.id,
        isLog: false,
        type: isEdited ? 'แก้ไขออเดอร์' : 'เพิ่มออเดอร์',
        project: `${lot.po_no || '-'} / ${lot.products?.sku || 'Unknown SKU'}`,
        timestamp: lot.updated_at || lot.created_at,
        createdAt: lot.created_at,
        updatedAt: lot.updated_at,
        user: primaryUser.username,
        userId: primaryUser.userId,
        userFullName: primaryUser.fullName,
        isSystem: primaryUser.isSystem,
        creator: creatorMeta.username,
        creatorFullName: creatorMeta.fullName,
        editor: editorMeta?.username || null,
        editorFullName: editorMeta?.fullName || null,
        isEdited,
        isRescheduled: false,
        details: `${isEdited ? 'แก้ไขข้อมูลออเดอร์: ' : 'เพิ่มออเดอร์ใหม่: '}ยอด ${(lot.order_quantity || 0).toLocaleString()} pc (${lot.total_tanks || 0} ถัง)`
      };
    });

    const taskHistory = logs.map(log => {
      const lot = lots.find(l => l.id === log.production_lot_id);
      const process = processes.find(p => p.id === log.process_id);
      const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at);
      const isRescheduled = planInfo.isRescheduled;
      const isCompletion = (log.status === 'COMPLETED' || log.status === 'DONE') && (log.note || '').includes('ส่งยอด FG');
      const isHandover = isHandoverProcess(process?.process_name);

      const byMatch = (log.note || '').match(/\(โดย\s+([A-Za-z0-9_]+)/i);
      const noteAuthor = byMatch ? byMatch[1] : null;

      // Creator
      const creatorMeta = resolveUserMeta(log.created_by, null, isHandover);

      // Editor
      let editorMeta: UserMeta | null = null;
      if (log.updated_by) {
        editorMeta = resolveUserMeta(log.updated_by, null, false);
      } else if (planInfo.updatedBy) {
        editorMeta = resolveUserMeta(null, planInfo.updatedBy, false);
      } else if (noteAuthor) {
        editorMeta = resolveUserMeta(null, noteAuthor, false);
      } else if (isRescheduled) {
        editorMeta = resolveUserMeta(null, 'PLPTB1234', false);
      }

      const isEdited = Boolean(isRescheduled || (editorMeta && editorMeta.username !== creatorMeta.username));
      const primaryUser = (isRescheduled || isEdited) && editorMeta ? editorMeta : creatorMeta;

      let actionType = 'ลงคิวงาน';
      if (isCompletion) actionType = 'ปิดงาน';
      else if (isRescheduled) actionType = 'ปรับเลื่อนแผน';
      else if (isEdited) actionType = 'แก้ไขข้อมูล';
      else if (isHandover) actionType = 'ส่งต่องาน (Auto)';

      const eventTime = isRescheduled && planInfo.updatedAt 
        ? planInfo.updatedAt 
        : (log.updated_at || log.created_at);

      return {
        id: `log-${log.id}`,
        recordId: log.id,
        isLog: true,
        type: actionType,
        project: `${lot?.po_no || '-'} / ${lot?.products?.sku || 'Unknown SKU'}`,
        timestamp: eventTime,
        createdAt: log.created_at,
        updatedAt: log.updated_at,
        user: primaryUser.username,
        userId: primaryUser.userId,
        userFullName: primaryUser.fullName,
        isSystem: primaryUser.isSystem,
        creator: creatorMeta.username,
        creatorFullName: creatorMeta.fullName,
        editor: editorMeta?.username || null,
        editorFullName: editorMeta?.fullName || null,
        isEdited,
        isRescheduled,
        details: `${process?.process_name || 'งานผลิต'} (${log.tank_start ? `ถัง ${log.tank_start}-${log.tank_end}` : `${log.total_tanks} ถัง`}) - วันที่ ${log.activity_date ? format(new Date(log.activity_date), 'dd/MM/yyyy') : '-'}${isRescheduled ? ` [🔄 เลื่อนจาก ${planInfo.originalDate ? format(new Date(planInfo.originalDate), 'dd/MM/yyyy') : '-'}: ${planInfo.categoryLabel}${planInfo.reason ? ` - ${planInfo.reason}` : ''}]` : ''}`
      };
    });

    const combined = [...orderHistory, ...taskHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return combined.filter(item => {
      // General search filter
      if (historySearchQuery.trim()) {
        const query = historySearchQuery.toLowerCase().trim();
        const passGeneral = item.project.toLowerCase().includes(query) ||
          item.details.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          item.user.toLowerCase().includes(query) ||
          (item.userFullName && item.userFullName.toLowerCase().includes(query)) ||
          (item.creator && item.creator.toLowerCase().includes(query)) ||
          (item.creatorFullName && item.creatorFullName.toLowerCase().includes(query)) ||
          (item.editor && item.editor.toLowerCase().includes(query)) ||
          (item.editorFullName && item.editorFullName.toLowerCase().includes(query));
        if (!passGeneral) return false;
      }

      // Column filters
      if (historyFilters.time.trim()) {
        const query = historyFilters.time.toLowerCase().trim();
        const formatted = format(new Date(item.timestamp), 'dd MMM yyyy HH:mm:ss').toLowerCase();
        if (!formatted.includes(query)) return false;
      }

      if (historyFilters.user.trim()) {
        const query = historyFilters.user.toLowerCase().trim();
        const uName = item.user.toLowerCase();
        const fName = (item.userFullName || '').toLowerCase();
        const cName = (item.creator || '').toLowerCase();
        const cfName = (item.creatorFullName || '').toLowerCase();
        const eName = (item.editor || '').toLowerCase();
        const efName = (item.editorFullName || '').toLowerCase();
        if (!uName.includes(query) && !fName.includes(query) && !cName.includes(query) && !cfName.includes(query) && !eName.includes(query) && !efName.includes(query)) return false;
      }

      if (historyFilters.type !== 'ALL') {
        if (item.type !== historyFilters.type) return false;
      }

      if (historyFilters.project.trim()) {
        const query = historyFilters.project.toLowerCase().trim();
        if (!item.project.toLowerCase().includes(query)) return false;
      }

      if (historyFilters.details.trim()) {
        const query = historyFilters.details.toLowerCase().trim();
        if (!item.details.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  };

  const isHistoryFiltered = historySearchQuery.trim() !== '' || 
    historyFilters.time.trim() !== '' || 
    historyFilters.user.trim() !== '' || 
    historyFilters.type !== 'ALL' || 
    historyFilters.project.trim() !== '' || 
    historyFilters.details.trim() !== '';

  const clearHistoryFilters = () => {
    setHistorySearchQuery('');
    setHistoryFilters({
      time: '',
      user: '',
      type: 'ALL',
      project: '',
      details: ''
    });
  };

  const handleOpenEditOperator = (item: any) => {
    setEditingOperatorItem({
      id: item.id,
      recordId: item.recordId,
      isLog: item.isLog,
      currentUserName: item.user,
      currentUserId: item.userId,
      project: item.project
    });
    setSelectedOperatorId(item.userId || currentUserId || currentUserInfo?.id || (usersList[0]?.id || ''));
  };

  const handleUpdateOperator = async () => {
    if (!editingOperatorItem || !selectedOperatorId) {
      toast.error('กรุณาเลือกผู้ดำเนินการ');
      return;
    }
    setIsUpdatingOperator(true);
    try {
      const targetUser = usersList.find(u => u.id === selectedOperatorId);
      const targetUserName = targetUser ? (targetUser.employee_id?.toUpperCase() || targetUser.full_name) : 'PLANNER';

      if (editingOperatorItem.isLog) {
        const { error } = await supabase
          .from('production_logs')
          .update({ 
            updated_by: selectedOperatorId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOperatorItem.recordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('production_lots')
          .update({ 
            updated_by: selectedOperatorId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOperatorItem.recordId);
        if (error) throw error;
      }

      toast.success(`อัปเดตผู้ดำเนินการเป็น ${targetUserName} สำเร็จ`);
      setEditingOperatorItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Error updating operator:', err);
      toast.error('เกิดข้อผิดพลาดในการอัปเดต: ' + err.message);
    } finally {
      setIsUpdatingOperator(false);
    }
  };

  const handleExportHistory = () => {
    const data = getHistoryData();
    if (data.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับ Export');
      return;
    }
    const exportData = data.map(item => ({
      'วันเวลาดำเนินการล่าสุด': format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm:ss'),
      'วันเวลาสร้าง': item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm:ss') : '-',
      'ผู้ดำเนินการหลัก (Username)': item.user,
      'ชื่อ-นามสกุล ผู้ดำเนินการหลัก': item.userFullName || '-',
      'ผู้สร้าง (Created By)': item.creator || '-',
      'ชื่อผู้สร้าง': item.creatorFullName || '-',
      'ผู้แก้ไขล่าสุด (Updated By)': item.editor || '-',
      'ชื่อผู้แก้ไขล่าสุด': item.editorFullName || '-',
      'ประเภท': item.type,
      'Project (PO/SKU)': item.project,
      'รายละเอียด': item.details
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, `PD_Master_Plan_History_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    toast.success('ส่งออก Excel ประวัติเรียบร้อย');
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

  // KPI Period Filter State (Default to current month, collapsible)
  const kpiPeriod = useKpiPeriod({ defaultSyncTable: false })
  const {
    periodMode: kpiPeriodMode,
    year: kpiYear,
    month: kpiMonth,
    customStart: kpiCustomStart,
    customEnd: kpiCustomEnd,
    isOpen: isKpiPeriodOpen,
    syncTableWithPeriod,
    dateRange: kpiDateRange,
    isCurrentMonth,
    currentYear,
    currentMonthIdx,
    setPeriodMode: setKpiPeriodMode,
    setYear: setKpiYear,
    setMonth: setKpiMonth,
    setCustomStart: setKpiCustomStart,
    setCustomEnd: setKpiCustomEnd,
    setIsOpen: setIsKpiPeriodOpen,
    setSyncTableWithPeriod,
    resetToCurrentMonth,
    selectPreviousMonth
  } = kpiPeriod

  const filteredKpiLogs = useMemo(() => {
    if (!kpiDateRange.start || !kpiDateRange.end) {
      return logs
    }
    const startStr = kpiDateRange.start
    const endStr = kpiDateRange.end

    return logs.filter(l => {
      if (l.activity_date) {
        const dStr = l.activity_date.substring(0, 10)
        return dStr >= startStr && dStr <= endStr
      }
      if (l.start_time) {
        const dStr = l.start_time.substring(0, 10)
        return dStr >= startStr && dStr <= endStr
      }
      if (l.created_at) {
        const dStr = l.created_at.substring(0, 10)
        return dStr >= startStr && dStr <= endStr
      }
      return false
    })
  }, [logs, kpiDateRange])

  const filteredKpiLots = useMemo(() => {
    if (!kpiDateRange.start || !kpiDateRange.end) {
      return lots
    }
    const startStr = kpiDateRange.start
    const endStr = kpiDateRange.end

    const lotIdsWithLogsInRange = new Set(filteredKpiLogs.map(l => l.production_lot_id).filter(Boolean))

    return lots.filter(lot => {
      // 1. Lots with tasks in range
      if (lotIdsWithLogsInRange.has(lot.id)) return true

      // 2. Lots with due date in range
      if (lot.fg_due_date) {
        const dStr = lot.fg_due_date.substring(0, 10)
        if (dStr >= startStr && dStr <= endStr) return true
      }
      if (lot.fg_due_date_start) {
        const dStr = lot.fg_due_date_start.substring(0, 10)
        if (dStr >= startStr && dStr <= endStr) return true
      }

      // 3. Lots with planned start date in range
      if (lot.planned_start_date) {
        const dStr = lot.planned_start_date.substring(0, 10)
        if (dStr >= startStr && dStr <= endStr) return true
      }

      // 4. Lots created in range with no schedule yet
      if (lot.created_at && !lot.planned_start_date && !lot.fg_due_date) {
        const dStr = lot.created_at.substring(0, 10)
        if (dStr >= startStr && dStr <= endStr) return true
      }

      return false
    })
  }, [lots, filteredKpiLogs, kpiDateRange])

  const kpiPeriodLotIds = useMemo(() => new Set(filteredKpiLots.map(l => l.id)), [filteredKpiLots])

  const completedLotsCount = useMemo(() => {
    const base = (syncTableWithPeriod && kpiDateRange.start && kpiDateRange.end) ? filteredKpiLots : lots
    return base.filter(lot => lot.current_status === "DONE").length
  }, [lots, filteredKpiLots, syncTableWithPeriod, kpiDateRange]);

  const activeLotsCount = useMemo(() => {
    const base = (syncTableWithPeriod && kpiDateRange.start && kpiDateRange.end) ? filteredKpiLots : lots
    return base.filter(lot => lot.current_status !== "DONE").length
  }, [lots, filteredKpiLots, syncTableWithPeriod, kpiDateRange]);

  const filteredLots = lots.filter(lot => {
    if (activeTab === "completed" && lot.current_status !== "DONE") return false;
    if (activeTab !== "completed" && lot.current_status === "DONE") return false;
    if (filterOrderType !== "ALL" && getBaseOrderType(lot.order_type) !== filterOrderType) return false;

    if (syncTableWithPeriod && kpiDateRange.start && kpiDateRange.end) {
      if (!kpiPeriodLotIds.has(lot.id)) return false;
    }

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
        aVal = getBaseOrderType(a.order_type)
        bVal = getBaseOrderType(b.order_type)
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      case "planned_start_date":
        aVal = a.planned_start_date || a.fg_due_date_start || ""
        bVal = b.planned_start_date || b.fg_due_date_start || ""
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      case "due_date":
        aVal = a.due_date || a.fg_due_date || ""
        bVal = b.due_date || b.fg_due_date || ""
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      case "fg_due_date":
        aVal = a.fg_due_date || ""
        bVal = b.fg_due_date || ""
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      default:
        return 0
    }
  })

  const today = useMemo(() => startOfDay(new Date()), [])

  const { timelinePastDays, timelineFutureDays, totalTimelineDays } = useMemo(() => {
    // 1. Explicit manual overrides
    if (timelineRangeMode === '15_centered') {
      return { timelinePastDays: 7, timelineFutureDays: 7, totalTimelineDays: 15 }
    }
    if (timelineRangeMode === '21_extended') {
      return { timelinePastDays: 7, timelineFutureDays: 13, totalTimelineDays: 21 }
    }
    if (timelineRangeMode === '14_future') {
      return { timelinePastDays: 0, timelineFutureDays: 13, totalTimelineDays: 14 }
    }
    if (timelineRangeMode === '14_past') {
      return { timelinePastDays: 13, timelineFutureDays: 0, totalTimelineDays: 14 }
    }

    // 2. Default: 'auto' (ปรับตำแหน่งอัตโนมัติตามโหมดมุมมอง)
    // - โหมด Plan: "วันนี้ = วันปัจจุบัน" อยู่แถวแรก (คอลัมน์แรกสุด) ดูไปข้างหน้า 14 วัน
    if (timelineViewMode === 'plan') {
      return { timelinePastDays: 0, timelineFutureDays: 13, totalTimelineDays: 14 }
    }
    // - โหมด Actual: "วันนี้ = วันปัจจุบัน" อยู่คอลัมน์สุดท้าย ดูประวัติย้อนหลัง 14 วัน (13 วันก่อน + วันนี้)
    if (timelineViewMode === 'actual') {
      return { timelinePastDays: 13, timelineFutureDays: 0, totalTimelineDays: 14 }
    }
    // - โหมด Compare P vs A: "วันนี้ = วันปัจจุบัน" อยู่กึ่งกลางหน้าต่าง (ย้อนหลัง 7 วัน + วันนี้กึ่งกลาง + ล่วงหน้า 7 วัน รวม 15 วัน)
    return { timelinePastDays: 7, timelineFutureDays: 7, totalTimelineDays: 15 }
  }, [timelineRangeMode, timelineViewMode])

  const timelineStartDate = useMemo(() => {
    return addDays(today, -timelinePastDays + timelineOffsetDays)
  }, [today, timelinePastDays, timelineOffsetDays])

  const timelineDates = useMemo(() => {
    return Array.from({ length: totalTimelineDays }).map((_, i) => addDays(timelineStartDate, i))
  }, [timelineStartDate, totalTimelineDays])

  // Executive Planning Calculations (Scoped to Selected KPI Reporting Period)
  const totalLotsCount = filteredKpiLots.length
  const uniqueSkusCount = new Set(filteredKpiLots.map(l => l.products?.sku || l.sku_id)).size
  const totalTargetUnits = filteredKpiLots.reduce((acc, l) => acc + (Number(l.planned_quantity) || Number(l.order_quantity) || 0), 0)
  const totalBulksKg = filteredKpiLots.reduce((acc, l) => acc + ((Number(l.total_tanks) || 0) * (Number(l.kg_per_tank) || 0)), 0)
  const totalTanksCount = filteredKpiLots.reduce((acc, l) => acc + (Number(l.total_tanks) || 0), 0)

  const mtsLots = filteredKpiLots.filter(l => getBaseOrderType(l.order_type) === 'MTS')
  const mtoLots = filteredKpiLots.filter(l => getBaseOrderType(l.order_type) === 'MTO')
  const lotsWithDueDate = filteredKpiLots.filter(l => l.fg_due_date || l.fg_due_date_start)

  // Accurate task progression & on-time stats (Scoped to Selected KPI Reporting Period)
  const totalTasksCount = filteredKpiLogs.length
  const doneTasks = filteredKpiLogs.filter(l => l.status === 'DONE')
  const doneTasksCount = doneTasks.length
  const progressPct = totalTasksCount > 0 ? ((doneTasksCount / totalTasksCount) * 100).toFixed(1) : '0.0'

  const todayStart = startOfDay(new Date())
  let onTimeTasksCount = 0
  let delayedTasksCount = 0
  let upcomingTasksCount = 0

  filteredKpiLogs.forEach(l => {
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

  // Department Process Breakdown (Scoped to Selected KPI Reporting Period)
  const rmTasks = filteredKpiLogs.filter(l => {
    const pName = l.processes?.process_name || ''
    return pName.includes('ชั่ง') || l.process_id?.includes('RM')
  })
  const rmDone = rmTasks.filter(l => l.status === 'DONE').length

  const mxTasks = filteredKpiLogs.filter(l => {
    const pName = l.processes?.process_name || ''
    return pName.includes('ผสม') || l.process_id?.includes('MX')
  })
  const mxDone = mxTasks.filter(l => l.status === 'DONE').length

  const pkTasks = filteredKpiLogs.filter(l => {
    const pName = l.processes?.process_name || ''
    return pName.includes('บรรจุ') || pName.includes('ลงลัง') || l.process_id?.includes('PK')
  })
  const pkDone = pkTasks.filter(l => l.status === 'DONE').length

  // -------------------------------------------------------------
  // Plan vs Actual KPI Metrics (Schedule Adherence & Bottlenecks)
  // -------------------------------------------------------------
  const scheduleAdherenceStats = useMemo(() => {
    let totalPlanned = 0
    let totalCompleted = 0
    let totalOnTime = 0
    let totalDelayed = 0
    let totalEarly = 0
    let totalDelayDays = 0

    const deptStats = {
      RM: { total: 0, completed: 0, onTime: 0, delayed: 0, delayDays: 0 },
      MX: { total: 0, completed: 0, onTime: 0, delayed: 0, delayDays: 0 },
      PK: { total: 0, completed: 0, onTime: 0, delayed: 0, delayDays: 0 }
    }

    const bottleneckCounts: Record<string, number> = {
      FLOOR_DOWNTIME: 0,
      WAIT_RM_PM: 0,
      QC_WAIT: 0,
      RUSH_ORDER_INSERT: 0,
      PLAN_CALIBRATION: 0,
      CUSTOMER_RESCHEDULE: 0,
      OTHER: 0
    }

    const todayStart = startOfDay(new Date())

    filteredKpiLogs.forEach(log => {
      const process = processes.find(p => p.id === log.process_id)
      const pName = (process?.process_name || log.processes?.process_name || '').toLowerCase()

      let deptKey: 'RM' | 'MX' | 'PK' | null = null
      if (pName.includes('ชั่ง')) deptKey = 'RM'
      else if (pName.includes('ผสม')) deptKey = 'MX'
      else if (pName.includes('บรรจุ') || pName.includes('ลงลัง')) deptKey = 'PK'

      if (log.activity_date) {
        totalPlanned++
        if (deptKey) deptStats[deptKey].total++

        const planStart = startOfDay(new Date(log.activity_date))
        const planEnd = log.end_date ? startOfDay(new Date(log.end_date)) : planStart

        if (log.status === 'DONE') {
          totalCompleted++
          if (deptKey) deptStats[deptKey].completed++

          const actualEnd = log.end_time
            ? startOfDay(new Date(log.end_time))
            : (log.updated_at ? startOfDay(new Date(log.updated_at)) : planStart)

          const diff = differenceInDays(actualEnd, planEnd)

          if (diff <= 0) {
            totalOnTime++
            if (deptKey) deptStats[deptKey].onTime++
            if (diff < 0) totalEarly++
          } else {
            totalDelayed++
            totalDelayDays += diff
            if (deptKey) {
              deptStats[deptKey].delayed++
              deptStats[deptKey].delayDays += diff
            }

            const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
            const noteLower = (log.note || '').toLowerCase()

            if (noteLower.includes('qc hold') || noteLower.includes('รอ qc') || noteLower.includes('แล็บ')) {
              bottleneckCounts.QC_WAIT++
            } else if (planInfo.category && bottleneckCounts[planInfo.category] !== undefined) {
              bottleneckCounts[planInfo.category]++
            } else if (noteLower.includes('เครื่อง') || noteLower.includes('เสีย') || noteLower.includes('ซ่อม')) {
              bottleneckCounts.FLOOR_DOWNTIME++
            } else if (noteLower.includes('วัตถุดิบ') || noteLower.includes('สาร') || noteLower.includes('บรรจุภัณฑ์')) {
              bottleneckCounts.WAIT_RM_PM++
            } else {
              bottleneckCounts.FLOOR_DOWNTIME++
            }
          }
        } else if (log.status === 'IN_PROGRESS') {
          if (differenceInDays(todayStart, planEnd) > 0) {
            const overdue = differenceInDays(todayStart, planEnd)
            totalDelayed++
            totalDelayDays += overdue
            if (deptKey) {
              deptStats[deptKey].delayed++
              deptStats[deptKey].delayDays += overdue
            }
          }
        } else if (log.status === 'WAITING') {
          if (differenceInDays(todayStart, planStart) > 0) {
            const overdue = differenceInDays(todayStart, planStart)
            totalDelayed++
            totalDelayDays += overdue
            if (deptKey) {
              deptStats[deptKey].delayed++
              deptStats[deptKey].delayDays += overdue
            }
          }
        }
      }
    })

    const overallAccuracy = (totalOnTime + totalDelayed) > 0
      ? ((totalOnTime / (totalOnTime + totalDelayed)) * 100).toFixed(1)
      : '100.0'

    const rmAccuracy = (deptStats.RM.onTime + deptStats.RM.delayed) > 0
      ? ((deptStats.RM.onTime / (deptStats.RM.onTime + deptStats.RM.delayed)) * 100).toFixed(1)
      : '100.0'

    const mxAccuracy = (deptStats.MX.onTime + deptStats.MX.delayed) > 0
      ? ((deptStats.MX.onTime / (deptStats.MX.onTime + deptStats.MX.delayed)) * 100).toFixed(1)
      : '100.0'

    const pkAccuracy = (deptStats.PK.onTime + deptStats.PK.delayed) > 0
      ? ((deptStats.PK.onTime / (deptStats.PK.onTime + deptStats.PK.delayed)) * 100).toFixed(1)
      : '100.0'

    const avgDelay = totalDelayed > 0
      ? (totalDelayDays / totalDelayed).toFixed(1)
      : '0.0'

    // Determine top bottleneck
    const bottleneckLabels: Record<string, string> = {
      FLOOR_DOWNTIME: '⚙️ หน้างานขัดข้อง / ชะลอผลิต',
      WAIT_RM_PM: '📦 รอวัตถุดิบ / บรรจุภัณฑ์',
      QC_WAIT: '🔬 รอผลตรวจแล็บ QC ปล่อยผ่าน',
      RUSH_ORDER_INSERT: '⚡ แทรกงานด่วนลูกค้า',
      PLAN_CALIBRATION: '📋 การปรับแผนงานปกติ',
      CUSTOMER_RESCHEDULE: '👤 ลูกค้าขอเลื่อนวัน',
      OTHER: '❓ อื่นๆ'
    }

    const sortedBottlenecks = Object.entries(bottleneckCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])

    const totalBottleneckIncidents = sortedBottlenecks.reduce((acc, [_, c]) => acc + c, 0)
    const topBottleneck = sortedBottlenecks[0]
    const topBottleneckText = topBottleneck 
      ? `${bottleneckLabels[topBottleneck[0]] || topBottleneck[0]} (${topBottleneck[1]} งาน)`
      : 'ยังไม่พบคอขวดสะสม'

    const bottleneckSummaryText = sortedBottlenecks.length > 0
      ? sortedBottlenecks.slice(0, 3).map(([k, count]) => {
          const pct = totalBottleneckIncidents > 0 ? Math.round((count / totalBottleneckIncidents) * 100) : 0
          return `${bottleneckLabels[k]?.split(' ')[1] || k} ${pct}%`
        }).join(' • ')
      : 'ทุกสายงานดำเนินงานตามแผน'

    return {
      overallAccuracy,
      totalPlanned,
      totalCompleted,
      totalOnTime,
      totalDelayed,
      totalEarly,
      avgDelay,
      deptStats: {
        RM: { ...deptStats.RM, accuracy: rmAccuracy },
        MX: { ...deptStats.MX, accuracy: mxAccuracy },
        PK: { ...deptStats.PK, accuracy: pkAccuracy }
      },
      topBottleneckText,
      bottleneckSummaryText,
      sortedBottlenecks,
      totalBottleneckIncidents
    }
  }, [filteredKpiLogs, processes])

  const handleRefreshData = () => {
    fetchData()
    toast.success('รีเฟรชข้อมูลแผนการผลิตล่าสุดเรียบร้อยแล้ว')
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-6 max-w-[1600px] w-full mx-auto min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <CalendarDays className="w-8 h-8 text-yellow-500 shrink-0" />
            <span>CosmeFlow Planning: PD Master Plan</span>
            {!canEdit && (
              <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full font-bold">
                👁️ ดูอย่างเดียว (View Only)
              </span>
            )}
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
          {canEdit && (
            <Button onClick={() => {
              setNewLot({
                id: "", product_id: "", lot_number: "", target_quantity: "",
                total_tanks: "", kg_per_tank: "", g_per_piece: "",
                capacity_min: "", capacity_max: "", pcs_per_carton: "",
                order_quantity: "", po_no: "", order_type: "MTS",
                fg_due_date: "", fg_due_date_start: "", due_date: "", new_sku_name: "", unit: "pc",
                mfg_date: "", exp_date: "", product_name: "",
                is_first_batch: false,
                delivery_mode: "single",
                delivery_schedule: []
              })
              setIsDialogOpen(true)
            }} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold">
              <Plus className="w-4 h-4 mr-2" /> เพิ่มออเดอร์ใหม่ (Project)
            </Button>
          )}
        </div>
      </div>

      {/* 0. KPI Reporting Period & Horizon Control Toolbar (Collapsible) */}
      <KpiReportingPeriodToolbar
        period={kpiPeriod}
        summaryBadge={`(${totalLotsCount} ล็อต • ${totalTasksCount} คิวงาน)`}
        showSyncCheckbox={true}
        syncCheckboxLabel="ซิงค์ตัวกรองช่วงเวลานี้กับตารางรายการด้านล่างด้วย (Sync Table with Selected Period)"
        summaryFooter={`พบ ${totalLotsCount} ล็อตการผลิต • ${totalTasksCount} คิวงาน ในช่วงเวลานี้`}
      />

      {/* 1. Executive Master Planning KPI Summary Bar */}
      <div className="bg-gradient-to-r from-[#2D2721] via-[#3E352B] to-[#2D2721] text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-[#D4AF37]/30 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sm:gap-5 w-full">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 shrink-0">
            <Layers className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Master Schedule & Capacity Intelligence
            </div>
            <div className="text-base sm:text-lg md:text-xl font-black text-white mt-0.5">
              Executive Master Planning KPI
            </div>
            <div className="text-[11px] sm:text-xs text-stone-300 mt-0.5">
              ภาพรวมแผนการผลิต • ความจุการผลิต (Capacity) • และอัตราความตรงต่อเวลาตามแผน (OTIF)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full xl:w-auto">
          {/* Total Master Lots */}
          <div className="bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[10px] sm:text-[11px] text-stone-300 font-medium">ล็อตการผลิตทั้งหมด</div>
            <div className="text-xl sm:text-2xl font-black text-[#D4AF37] tracking-tight">
              {totalLotsCount} <span className="text-xs font-normal text-stone-300">ล็อต</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">({uniqueSkusCount} SKU ไม่ซ้ำ)</div>
          </div>

          {/* Target Production Volume */}
          <div className="bg-emerald-500/15 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-emerald-400/30 text-center">
            <div className="text-[10px] sm:text-[11px] text-emerald-200 font-medium">ยอดผลิตรวม (Target Units)</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {totalTargetUnits.toLocaleString()} <span className="text-xs font-normal text-emerald-200">ชิ้น</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-emerald-300 mt-0.5">({totalBulksKg.toLocaleString()} kg Bulk)</div>
          </div>

          {/* OTIF Schedule Adherence */}
          <div className="bg-blue-500/20 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-blue-400/30 text-center">
            <div className="text-[10px] sm:text-[11px] text-blue-200 font-medium">ตรงตามแผนงาน (On-Time)</div>
            <div className="text-xl sm:text-2xl font-black text-blue-300">
              {otifRate}%
            </div>
            <div className="text-[9px] sm:text-[10px] text-blue-300 mt-0.5">({onTimeTasksCount} คิวตรงเวลา)</div>
          </div>

          {/* Process Progression */}
          <div className="bg-indigo-500/20 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-indigo-400/30 text-center">
            <div className="text-[10px] sm:text-[11px] text-indigo-200 font-medium">ความคืบหน้ารวม (Progress)</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300">
              {progressPct}%
            </div>
            <div className="text-[9px] sm:text-[10px] text-indigo-300 mt-0.5">({doneTasksCount}/{totalTasksCount} งานเสร็จ)</div>
          </div>
        </div>
      </div>

      {/* 2. Four Planning Dimension KPI Cards */}
      {viewMode === 'list' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
        {/* Sub-menu Navigation & Filter Toolbar */}
        <div className="bg-white border-b border-slate-200">
          {/* Tier 1: Primary Navigation Bar (4 Main Sub-tabs + Global Action) */}
          <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/90 shadow-2xs shrink-0">
                {/* Tab 1: Main Table */}
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={cn(
                    "h-9 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'table'
                      ? "bg-[#0B192C] text-white shadow-sm ring-1 ring-slate-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  )}
                >
                  <Layers className={cn("w-4 h-4 shrink-0", activeTab === 'table' ? "text-amber-400" : "text-slate-400")} />
                  <span>Main Table</span>
                  <span className={cn(
                    "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors",
                    activeTab === 'table' ? "bg-slate-800 text-amber-300 border border-slate-700" : "bg-white text-slate-600 border border-slate-200"
                  )}>
                    {activeLotsCount}
                  </span>
                </button>

                {/* Tab 2: Timeline */}
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className={cn(
                    "h-9 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'timeline'
                      ? "bg-[#0B192C] text-white shadow-sm ring-1 ring-slate-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  )}
                >
                  <CalendarIcon className={cn("w-4 h-4 shrink-0", activeTab === 'timeline' ? "text-indigo-400" : "text-slate-400")} />
                  <span>Timeline</span>
                </button>

                {/* Tab 3: ประวัติการทำงานแบบต่อเนื่อง */}
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "h-9 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'history'
                      ? "bg-[#0B192C] text-white shadow-sm ring-1 ring-slate-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  )}
                >
                  <History className={cn("w-4 h-4 shrink-0", activeTab === 'history' ? "text-blue-400 animate-pulse" : "text-slate-400")} />
                  <span>ประวัติการทำงานแบบต่อเนื่อง</span>
                </button>

                {/* Tab 4: งานที่เสร็จสิ้น (Completed) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={cn(
                    "h-9 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'completed'
                      ? "bg-[#0B192C] text-white shadow-sm ring-1 ring-slate-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  )}
                >
                  <CheckCircle2 className={cn("w-4 h-4 shrink-0", activeTab === 'completed' ? "text-emerald-400" : "text-slate-400")} />
                  <span>งานที่เสร็จสิ้น (Completed)</span>
                  {completedLotsCount > 0 && (
                    <span className={cn(
                      "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors",
                      activeTab === 'completed' ? "bg-emerald-800 text-white" : "bg-white text-emerald-700 border border-emerald-200"
                    )}>
                      {completedLotsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tier 2: Contextual Toolbar & Filters (for table and completed tabs) */}
          {(activeTab === "table" || activeTab === "completed") && (
            <div className="px-4 sm:px-5 py-2.5 bg-[#FAF9F6] border-t border-slate-150 flex flex-wrap items-center justify-between gap-3">
              {/* Left Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Department Filter (All, RM, MX, PK) */}
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400" /> แผนก:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterDept("ALL")}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      filterDept === "ALL" ? "bg-[#0B192C] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDept("RM")}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      filterDept === "RM" ? "bg-amber-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    ชั่งสาร (RM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDept("MX")}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      filterDept === "MX" ? "bg-[#B8962A] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    ผสม (MX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDept("PK")}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      filterDept === "PK" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    บรรจุ (PK)
                  </button>
                </div>

                {/* Order Type Filter (All, MTS, MTO) */}
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 px-2">ประเภท:</span>
                  <button
                    type="button"
                    onClick={() => setFilterOrderType("ALL")}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      filterOrderType === "ALL" ? "bg-[#0B192C] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOrderType("MTS")}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      filterOrderType === "MTS" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    MTS
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOrderType("MTO")}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                      filterOrderType === "MTO" ? "bg-purple-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    MTO
                  </button>
                </div>

                {/* Handover Tasks Toggle (รอ QC, รอ POF, รอเข้าคลัง FG, ลงลัง) */}
                <button
                  type="button"
                  onClick={toggleShowShopfloorHandovers}
                  className={cn(
                    "h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer",
                    showShopfloorHandovers
                      ? "bg-purple-700 text-white hover:bg-purple-800 border-purple-800 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-900 shadow-2xs"
                  )}
                  title="คลิกเพื่อสลับแสดง/ซ่อน ขั้นตอนส่งต่องานหน้างาน (รอ QC, รอ POF, รอเข้าคลัง FG, ลงลัง)"
                >
                  {showShopfloorHandovers ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-purple-200" />
                      <span>ขั้นตอนหน้างาน (รอ QC/POF/FG): แสดง</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>ขั้นตอนหน้างาน (รอ QC/POF/FG): ซ่อน</span>
                    </>
                  )}
                  {handoverTasksCount > 0 && (
                    <span className={cn(
                      "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                      showShopfloorHandovers ? "bg-purple-900 text-purple-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                    )}>
                      {handoverTasksCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Right Side: Search & Sort Reset */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {sortColumn && (
                  <button 
                    type="button"
                    onClick={() => setSortColumn("")} 
                    className="h-8 px-2.5 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 font-medium cursor-pointer shadow-2xs shrink-0"
                    title="คลิกเพื่อรีเซ็ตการเรียงลำดับ"
                  >
                    <span>เรียงตาม: {sortColumn} ({sortDirection.toUpperCase()})</span>
                    <X className="w-3.5 h-3.5 ml-0.5 text-blue-500" />
                  </button>
                )}

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input 
                    placeholder="ค้นหา PO หรือ SKU..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full h-8 pl-8 pr-8 text-xs bg-white border-slate-200 focus:border-[#D4AF37] rounded-lg shadow-2xs" 
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
                      <span>เริ่มผลิต (Start)</span>
                      {sortColumn === "planned_start_date" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-black shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead 
                    onClick={() => handleSort("due_date")} 
                    className="cursor-pointer select-none hover:bg-slate-200/70 transition-colors font-bold group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ผลิตเสร็จ (End)</span>
                      {sortColumn === "due_date" ? (
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
                      <span>กำหนดส่งมอบ FG (Delivery)</span>
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
                          {getBaseOrderType(lot.order_type) === 'MTO' ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-bold">MTO</span>
                              {isLotFirstBatch(lot) && (
                                <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 shadow-sm" title="ออเดอร์ผลิตครั้งแรก (1st Batch)">
                                  <span>🔬 1st Batch</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs bg-[#D4AF37]/20 text-[#6D5A1A] px-2.5 py-1 rounded-full font-bold">MTS</span>
                              {isLotFirstBatch(lot) && (
                                <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 shadow-sm" title="ออเดอร์ผลิตครั้งแรก (1st Batch)">
                                  <span>🔬 1st Batch</span>
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full w-max">
                            {lot.planned_start_date ? format(new Date(lot.planned_start_date), "dd MMM yyyy") : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full w-max">
                            {(lot.due_date || lot.fg_due_date) ? format(new Date(lot.due_date || lot.fg_due_date), "dd MMM yyyy") : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const schedule = parseDeliverySchedule(lot.delivery_schedule)
                            if (schedule.length > 1) {
                              const totalScheduled = schedule.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                              return (
                                <Popover>
                                  <PopoverTrigger
                                    type="button"
                                    className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                    title="คลิกดูรายละเอียดงวดส่งมอบทั้งหมด"
                                  >
                                    <Gift className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>ส่ง {schedule.length} งวด</span>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-3 text-xs bg-white shadow-xl rounded-xl border border-indigo-100" align="start">
                                    <div className="font-bold text-slate-900 border-b pb-1.5 mb-2 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <Gift className="w-4 h-4 text-indigo-600" />
                                        <span>แผนส่งมอบ FG ({schedule.length} งวด)</span>
                                      </div>
                                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                                        รวม {totalScheduled.toLocaleString()} ชิ้น
                                      </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {schedule.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                                          <div>
                                            <span className="font-bold text-slate-800">งวด {item.installment}:</span>{" "}
                                            <span className="text-slate-600">{item.date ? format(new Date(item.date), "dd/MM/yyyy") : "-"}</span>
                                            {item.note && <div className="text-[10px] text-slate-500 italic pl-1">&ldquo;{item.note}&rdquo;</div>}
                                          </div>
                                          <div className="font-mono font-bold text-indigo-600">
                                            {Number(item.quantity || 0).toLocaleString()} pc
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {lot.fg_due_date && (
                                      <div className="mt-2 pt-2 border-t text-[10px] text-slate-500 flex justify-between items-center">
                                        <span>งวดสุดท้าย:</span>
                                        <span className="font-bold text-slate-700">{format(new Date(lot.fg_due_date), "dd MMM yyyy")}</span>
                                      </div>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              )
                            }
                            if (schedule.length === 1) {
                              return (
                                <div className="text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full w-max flex items-center gap-1">
                                  <Gift className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{format(new Date(schedule[0].date), "dd MMM yyyy")} ({schedule[0].quantity.toLocaleString()} pc)</span>
                                </div>
                              )
                            }
                            return (
                              <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full w-max">
                                {lot.fg_due_date ? format(new Date(lot.fg_due_date), "dd MMM yyyy") : "-"}
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit ? (
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
                          ) : (
                            <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded border border-slate-200">
                              ดูข้อมูล
                            </span>
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && lotLogs.map(log => {
                        const process = processes.find(p => p.id === log.process_id)
                        let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                        if (!pt) pt = { id: "OTHER", name: process?.process_name || "Unknown", color: "bg-slate-100 text-slate-800 border-slate-200" }
                        
                        if (filterDept !== "ALL" && filterDept !== pt.id) return null

                        const isStarted = isTaskStartedByShopfloor(log)
                        const isCompleted = isTaskCompleted(log)
                        const canReset = canResetStartedTask(log)
                        const isEditable = canEdit && !isStarted
                        const isDateEditable = canEdit && !isCompleted

                        return (
                          <TableRow key={log.id} className={cn("hover:bg-slate-100/50", isStarted ? "bg-slate-50/70" : "bg-[#F8F6F0]/")}>
                            <TableCell className="text-center">
                              {isStarted ? (
                                <span 
                                  title="หน้างานกดเริ่มงานแล้ว ไม่อนุญาตให้ลบคิวงาน (หากเผลอกดเริ่มผิด ให้คลิกปุ่ม 'ยกเลิกเริ่มผิด' เพื่อคืนสถานะก่อนลบ)" 
                                  className="inline-flex items-center justify-center p-1 text-slate-400 cursor-not-allowed"
                                >
                                  <Lock className="w-3.5 h-3.5 text-amber-600/80" />
                                </span>
                              ) : canEdit ? (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteLog(log.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <span className="text-slate-300">•</span>
                              )}
                            </TableCell>
                            <TableCell colSpan={4} className="pl-8 py-2">
                              <div className="flex items-center gap-2 border-l-2 border-slate-300 pl-4 h-full py-1">
                                <div className={cn("w-2 h-2 rounded-full", pt.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))}></div>
                                
                                {isEditable ? (
                                  <Select value={log.process_id} onValueChange={(val) => handleUpdateLogDirect(log.id, "process_id", val)}>
                                    <SelectTrigger className="h-7 text-xs w-[100px] border-none bg-transparent font-medium p-0 shadow-none focus:ring-0">
                                      <span className="line-clamp-2 break-words text-wrap">{process?.process_name || "เลือกงาน"}</span>
                                      <ChevronDown className="h-4 w-4 opacity-50" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {processes.filter(p => ALLOWED_PROCESSES.includes(p.process_name)).map(p => <SelectItem key={p.id} value={p.id}>{p.process_name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                    {process?.process_name || "-"}
                                    {isStarted && (
                                      <span title="หน้างานเริ่มงานแล้ว ล็อกขั้นตอน">
                                        <Lock className="w-3 h-3 text-amber-600/70 shrink-0" />
                                      </span>
                                    )}
                                  </span>
                                )}

                                <span className="text-xs text-slate-500 ml-2">(Tanks</span>
                                <Input 
                                  disabled={!isEditable} 
                                  type="number" 
                                  className={cn(
                                    "w-12 h-6 text-xs px-1 text-center transition-colors",
                                    isStarted ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" : "bg-white"
                                  )} 
                                  value={log.tank_start || ""} 
                                  onChange={e => handleUpdateLogDirect(log.id, "tank_start", e.target.value)} 
                                  title={isStarted ? "หน้างานเริ่มงานแล้ว ล็อกถัง (เพื่อประเมิน KPI ความแม่นยำ)" : undefined}
                                />
                                <span className="text-xs text-slate-500">-</span>
                                <Input 
                                  disabled={!isEditable} 
                                  type="number" 
                                  className={cn(
                                    "w-12 h-6 text-xs px-1 text-center transition-colors",
                                    isStarted ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" : "bg-white"
                                  )} 
                                  value={log.tank_end || ""} 
                                  onChange={e => handleUpdateLogDirect(log.id, "tank_end", e.target.value)} 
                                  title={isStarted ? "หน้างานเริ่มงานแล้ว ล็อกถัง (เพื่อประเมิน KPI ความแม่นยำ)" : undefined}
                                />
                                <span className="text-xs text-slate-500">)</span>

                                {process?.process_name?.includes('ผสม') && (() => {
                                  const isAutoPamh = (lot?.products?.sku || '').includes('PAMH-008') && (Number(log.tank_start || 1) <= 1 && Number(log.tank_end || 1) >= 1)
                                  const hasBatchTag = (log.note || '').toLowerCase().includes('[1st_batch]') || (lot?.order_type || '').includes('[1ST_BATCH]')
                                  const is1stBatch = isAutoPamh || hasBatchTag

                                  return (
                                    <button
                                      type="button"
                                      disabled={!isEditable}
                                      onClick={() => handleToggleFirstBatch(log, lot)}
                                      title={isStarted
                                        ? "หน้างานเริ่มงานแล้ว ล็อก 1st Batch (เพื่อประเมิน KPI ความแม่นยำ)"
                                        : isAutoPamh 
                                        ? "งาน PAMH-008 ถัง 1 กำหนดเป็น 1st Batch โดยอัตโนมัติตามข้อกำหนด" 
                                        : "คลิกเพื่อเปิด/ปิด สถานะ 1st Batch เพื่อแจ้งเตือน QA เข้าประเมินร่วมกับ MX บนเรดาร์ 21 วัน"}
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border transition-all select-none shrink-0 ml-1.5",
                                        isStarted && "opacity-60 cursor-not-allowed",
                                        !isStarted && "cursor-pointer",
                                        is1stBatch
                                          ? "bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300 shadow-2xs ring-1 ring-purple-300"
                                          : "bg-slate-100 hover:bg-purple-50 text-slate-400 hover:text-purple-700 border-slate-200 hover:border-purple-300"
                                      )}
                                    >
                                      <span>🔬</span>
                                      <span>{is1stBatch ? (isAutoPamh ? '1st Batch (Auto) ✓' : '1st Batch ✓') : '+ 1st Batch'}</span>
                                    </button>
                                  )
                                })()}
                              </div>
                            </TableCell>
                            {(() => {
                              const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
                              return (
                                <>
                                  <TableCell className="py-2">
                                    <div className="flex flex-col gap-1">
                                      <Input 
                                        disabled={!isDateEditable}
                                        type="date" 
                                        className={cn(
                                          "h-8 text-xs w-[130px] transition-colors", 
                                          isCompleted ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" :
                                          isStarted ? "bg-amber-50/70 border-amber-300 text-amber-900 font-medium" : "bg-white",
                                          planInfo.isRescheduled && !isCompleted && "border-amber-400 bg-amber-50/50 text-amber-900 font-medium"
                                        )} 
                                        title={
                                          isCompleted ? "งานเสร็จสิ้นแล้ว ไม่อนุญาตให้แก้ไขวันตามแผน" :
                                          isStarted ? "หน้างานเริ่มงานแล้ว: สามารถแก้ไขวันได้ โดยระบบจะบันทึกประวัติการปรับเลื่อนแผนงาน" : undefined
                                        }
                                        value={log.activity_date || ""} 
                                        onChange={(e) => handleDateInputChange(log, lot, process, "activity_date", e.target.value)}
                                      />
                                      {planInfo.isRescheduled && (
                                        <button 
                                          type="button"
                                          onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                          title={isCompleted 
                                            ? `บันทึกเลื่อนแผนเดิม: ${planInfo.originalDate} -> สาเหตุ: ${planInfo.categoryLabel}` 
                                            : `คลิกเพื่อดู/แก้ไขบันทึกเลื่อนแผน (เดิม: ${planInfo.originalDate} -> สาเหตุ: ${planInfo.categoryLabel})`
                                          }
                                          className="text-[10px] text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit transition-colors text-left font-medium"
                                        >
                                          <span>🔄 เดิม:</span>
                                          <span>{planInfo.originalDate ? format(new Date(planInfo.originalDate), 'dd/MM/yy') : '-'}</span>
                                          {isStarted && !isCompleted && <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded ml-0.5 font-normal">แช่/ปรับแผน</span>}
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input 
                                      disabled={!isDateEditable}
                                      type="date" 
                                      className={cn(
                                        "h-8 text-xs w-[130px] transition-colors",
                                        isCompleted ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" :
                                        isStarted ? "bg-amber-50/70 border-amber-300 text-amber-900 font-medium" : "bg-white"
                                      )} 
                                      title={
                                        isCompleted ? "งานเสร็จสิ้นแล้ว ไม่อนุญาตให้แก้ไขวันตามแผน" :
                                        isStarted ? "หน้างานเริ่มงานแล้ว: สามารถแก้ไขวันได้ โดยระบบจะบันทึกประวัติการปรับเลื่อนแผนงาน" : undefined
                                      }
                                      value={log.end_date || ""} 
                                      onChange={(e) => handleDateInputChange(log, lot, process, "end_date", e.target.value)}
                                    />
                                  </TableCell>
                                </>
                              )
                            })()}
                            <TableCell className="py-2">
                              {isStarted ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge className={cn("h-7 text-xs px-2 py-0.5 rounded-md border-0 inline-flex items-center gap-1 font-bold shadow-2xs select-none",
                                    isCompleted 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-[#D4AF37]/20 text-[#6D5A1A]'
                                  )}>
                                    {isCompleted ? <Check className="w-3 h-3 text-emerald-700" /> : <Lock className="w-3 h-3 opacity-70" />}
                                    <span>{isCompleted ? 'เสร็จสิ้น (DONE)' : 'กำลังดำเนินการ'}</span>
                                  </Badge>

                                  {canReset && canEdit && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenResetStart(log, lot, process)}
                                      className="h-6 text-[10.5px] px-1.5 py-0 bg-white hover:bg-amber-50 text-amber-800 border-amber-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                      title="พนักงานเผลอกดเริ่มผิด? คลิกเพื่อยกเลิกการเริ่มงานและคืนสถานะเป็นรอเริ่ม เพื่อให้ขยับแผนหรือย้ายวันได้"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5 text-amber-600" />
                                      <span>ยกเลิกเริ่มผิด</span>
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <Select 
                                  value={log.status || "PLANNED"} 
                                  onValueChange={(val) => handleUpdateLogDirect(log.id, "status", val)}
                                >
                                  <SelectTrigger className="h-8 text-xs w-[120px] font-medium border-0 bg-slate-200 text-slate-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PLANNED">วางแผน</SelectItem>
                                    <SelectItem value="IN_PROGRESS">กำลังดำเนินการ</SelectItem>
                                    <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        )
                      })}

                      {isExpanded && (
                          <TableRow className="bg-[#F8F6F0]/">
                            <TableCell></TableCell>
                            <TableCell colSpan={7} className="pl-12 py-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/" onClick={() => handleAddBlankLog(lot.id)}>
                                    <Plus className="w-3 h-3 mr-1" /> เพิ่มคิวงาน (Add Task)
                                </Button>
                                {(() => {
                                  const hiddenCount = logs.filter(l => l.production_lot_id === lot.id && isHandoverProcess(processes.find(p => p.id === l.process_id)?.process_name || l.processes?.process_name)).length
                                  if (hiddenCount > 0 && !showShopfloorHandovers) {
                                    return (
                                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 inline-flex items-center gap-1.5 font-medium">
                                        <span>🛡️ ซ่อนขั้นตอนหน้างาน {hiddenCount} รายการ (รอ QC / รอ POF / รอเข้าคลัง FG / ลงลัง)</span>
                                        <button 
                                          type="button" 
                                          onClick={toggleShowShopfloorHandovers}
                                          className="text-purple-700 hover:text-purple-900 underline font-bold cursor-pointer"
                                        >
                                          คลิกเพื่อเปิดดู
                                        </button>
                                      </span>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
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
          <MasterPlanningTimeline
            lots={lots}
            logs={logs}
            processes={processes}
            currentUser={currentUserInfo?.employee_id || currentUser || 'PLANNER'}
            currentUserId={currentUserId || undefined}
            canEdit={canEdit}
            onPlanChanged={fetchData}
            hideHeaderKpi={false}
          />
        )}

        {activeTab === "history" && (
          <div className="p-4 bg-white min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
               <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input 
                      placeholder="ค้นหาด่วน ทุกคอลัมน์..." 
                      value={historySearchQuery} 
                      onChange={e => setHistorySearchQuery(e.target.value)} 
                      className="pl-9 pr-8 h-9 text-xs"
                    />
                    {historySearchQuery && (
                      <button onClick={() => setHistorySearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs font-mono text-slate-600 bg-slate-50 py-1.5 px-2.5">
                    {isHistoryFiltered ? `พบ ${getHistoryData().length} จาก ${logs.length + lots.length} รายการ` : `ทั้งหมด ${getHistoryData().length} รายการ`}
                  </Badge>
                  {isHistoryFiltered && (
                    <Button 
                      onClick={clearHistoryFilters} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs text-sky-700 hover:text-sky-800 hover:bg-sky-50 gap-1 px-2.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> ล้างตัวกรอง
                    </Button>
                  )}
               </div>

               <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <Button variant="outline" size="sm" onClick={handleExportHistory} className="h-9 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 font-medium">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export Excel (ประวัติ)
                  </Button>
               </div>
            </div>
            
             <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <Table>
                  <TableHeader className="bg-[#F8F6F0]">
                    <TableRow>
                      <TableHead className="w-[180px] font-bold text-slate-700">วันเวลา</TableHead>
                      <TableHead className="w-[240px] font-bold text-slate-700">ผู้ดำเนินการ (Username)</TableHead>
                      <TableHead className="w-[140px] font-bold text-slate-700">ประเภท</TableHead>
                      <TableHead className="w-[240px] font-bold text-slate-700">Project (PO/SKU)</TableHead>
                      <TableHead className="font-bold text-slate-700">รายละเอียด</TableHead>
                    </TableRow>
                    {/* Column Search Filter Row */}
                    <TableRow className="bg-slate-50/90 border-t border-b border-slate-200">
                      <TableHead className="p-1.5">
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                          <Input
                            value={historyFilters.time}
                            onChange={e => setHistoryFilters(p => ({ ...p, time: e.target.value }))}
                            placeholder="ค้นหาวันที่/เวลา..."
                            className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-blue-400"
                          />
                          {historyFilters.time && (
                            <button onClick={() => setHistoryFilters(p => ({ ...p, time: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="p-1.5">
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                          <Input
                            value={historyFilters.user}
                            onChange={e => setHistoryFilters(p => ({ ...p, user: e.target.value }))}
                            placeholder="ค้นหา user / ผู้สร้าง / ผู้แก้ไข..."
                            className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-blue-400"
                          />
                          {historyFilters.user && (
                            <button onClick={() => setHistoryFilters(p => ({ ...p, user: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="p-1.5">
                        <Select value={historyFilters.type} onValueChange={val => setHistoryFilters(p => ({ ...p, type: val || 'ALL' }))}>
                          <SelectTrigger className="h-7 text-xs bg-white border-slate-200 focus:border-blue-400">
                            <SelectValue placeholder="ทุกประเภท" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL" className="text-xs">ทุกประเภท</SelectItem>
                            <SelectItem value="ลงคิวงาน" className="text-xs">ลงคิวงาน</SelectItem>
                            <SelectItem value="ปรับเลื่อนแผน" className="text-xs">ปรับเลื่อนแผน</SelectItem>
                            <SelectItem value="แก้ไขข้อมูล" className="text-xs">แก้ไขข้อมูล</SelectItem>
                            <SelectItem value="ส่งต่องาน (Auto)" className="text-xs">ส่งต่องาน (Auto)</SelectItem>
                            <SelectItem value="เพิ่มออเดอร์" className="text-xs">เพิ่มออเดอร์</SelectItem>
                            <SelectItem value="แก้ไขออเดอร์" className="text-xs">แก้ไขออเดอร์</SelectItem>
                            <SelectItem value="ปิดงาน" className="text-xs">ปิดงาน</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableHead>
                      <TableHead className="p-1.5">
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                          <Input
                            value={historyFilters.project}
                            onChange={e => setHistoryFilters(p => ({ ...p, project: e.target.value }))}
                            placeholder="ค้นหา PO/SKU..."
                            className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-blue-400"
                          />
                          {historyFilters.project && (
                            <button onClick={() => setHistoryFilters(p => ({ ...p, project: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="p-1.5">
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                          <Input
                            value={historyFilters.details}
                            onChange={e => setHistoryFilters(p => ({ ...p, details: e.target.value }))}
                            placeholder="ค้นหารายละเอียด..."
                            className="h-7 text-xs pl-6 pr-5 bg-white border-slate-200 focus:border-blue-400"
                          />
                          {historyFilters.details && (
                            <button onClick={() => setHistoryFilters(p => ({ ...p, details: '' }))} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {getHistoryData().length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                              ไม่พบประวัติการทำงานที่ตรงกับเงื่อนไขการค้นหา
                           </TableCell>
                        </TableRow>
                     ) : (
                        getHistoryData().map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="text-slate-600 font-mono text-xs align-top">
                              <div className="font-semibold text-slate-700">{format(new Date(item.timestamp), 'dd MMM yyyy')}</div>
                              <span className="text-[11px] text-slate-400">{format(new Date(item.timestamp), 'HH:mm:ss')}</span>
                              {item.isEdited && item.createdAt && item.updatedAt && item.createdAt !== item.updatedAt && (
                                <div className="text-[10px] text-amber-600 font-sans mt-0.5" title={`สร้างเมื่อ: ${format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm:ss')}`}>
                                  ✏️ แก้ไขล่าสุด
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              <div 
                                className="flex items-start justify-between group/user max-w-[240px]"
                                title={`ผู้ดำเนินการหลัก: ${item.user} (${item.userFullName || '-'})\nผู้สร้าง: ${item.creator || '-'} (${item.creatorFullName || '-'})\nผู้แก้ไขล่าสุด: ${item.editor || '-'} (${item.editorFullName || '-'})\nสร้างเมื่อ: ${item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm:ss') : '-'}\nแก้ไขเมื่อ: ${item.updatedAt ? format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm:ss') : '-'}`}
                              >
                                <div className="flex items-start gap-2 overflow-hidden">
                                  <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border",
                                    item.isSystem ? "bg-slate-100 text-slate-600 border-slate-300" :
                                    item.isEdited ? "bg-amber-100 text-amber-800 border-amber-300" :
                                    "bg-blue-100 text-blue-800 border-blue-300"
                                  )}>
                                    {item.isSystem ? "🤖" : (item.isEdited ? "✏️" : item.user.charAt(0))}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-slate-800 truncate">{item.user}</span>
                                      {item.isEdited && (
                                        <span className="text-[9.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1 py-0.2 rounded shrink-0">
                                          ผู้แก้ไข
                                        </span>
                                      )}
                                    </div>
                                    {item.userFullName && (
                                      <span className="text-[11px] text-slate-500 truncate">{item.userFullName}</span>
                                    )}
                                    {/* Creator / Editor audit subtext */}
                                    {item.isEdited && item.creator && item.creator !== item.editor ? (
                                      <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                                        เดิมสร้างโดย: <strong className="text-slate-600 font-medium">{item.creator}</strong>
                                      </span>
                                    ) : item.isSystem ? (
                                      <span className="text-[10px] text-slate-400 mt-0.5">
                                        ระบบส่งต่องาน Auto
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                        ✨ ผู้สร้างคิวงาน
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover/user:opacity-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-opacity ml-1 shrink-0"
                                    title="คลิกเพื่อแก้ไข/ระบุผู้ดำเนินการ"
                                    onClick={() => handleOpenEditOperator(item)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium inline-block whitespace-nowrap",
                                item.type === 'เพิ่มออเดอร์' && "bg-blue-100 text-blue-800 border border-blue-200",
                                item.type === 'แก้ไขออเดอร์' && "bg-indigo-100 text-indigo-800 border border-indigo-200",
                                item.type === 'ลงคิวงาน' && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                                item.type === 'ส่งต่องาน (Auto)' && "bg-sky-100 text-sky-800 border border-sky-200",
                                item.type === 'ปรับเลื่อนแผน' && "bg-amber-100 text-amber-900 border border-amber-300",
                                item.type === 'แก้ไขข้อมูล' && "bg-violet-100 text-violet-800 border border-violet-200",
                                item.type === 'ปิดงาน' && "bg-purple-100 text-purple-800 border border-purple-200"
                              )}>
                                {item.type}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800 text-xs align-top">{item.project}</TableCell>
                            <TableCell className="text-slate-600 text-xs leading-relaxed align-top">
                              <div>{item.details}</div>
                              {item.isEdited && item.editor && (
                                <div className="text-[10.5px] text-slate-400 mt-1 flex items-center gap-1">
                                  <span>✏️ บันทึกการแก้ไขโดย:</span>
                                  <span className="font-medium text-slate-600">{item.editor} ({item.editorFullName})</span>
                                </div>
                              )}
                            </TableCell>
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
            tasks={filteredLots.flatMap(lot => {
              const schedule = parseDeliverySchedule(lot.delivery_schedule)
              if (schedule.length > 0) {
                return schedule.map((inst, idx) => ({
                  id: `${lot.id}-inst-${idx}`,
                  activity_date: inst.date,
                  status: 'IN_PROGRESS',
                  production_lots: {
                    lot_no: `${lot.lot_no} (งวด ${inst.installment})`,
                    products: lot.products,
                    sku_id: lot.sku_id
                  },
                  originalLot: lot
                }))
              }
              return [{
                id: lot.id,
                activity_date: lot.fg_due_date,
                status: 'IN_PROGRESS',
                production_lots: {
                  lot_no: lot.lot_no,
                  products: lot.products,
                  sku_id: lot.sku_id
                },
                originalLot: lot
              }]
            })}
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
              <Select value={getBaseOrderType(newLot.order_type)} onValueChange={val => setNewLot({...newLot, order_type: val || 'MTS'})}>
                <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTS">MTS (Make to Stock)</SelectItem>
                  <SelectItem value="MTO">MTO (Make to Order)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-purple-200 bg-purple-50/70 col-span-2 md:col-span-4">
              <input
                type="checkbox"
                id="is_first_batch"
                checked={newLot.is_first_batch || false}
                onChange={e => setNewLot({...newLot, is_first_batch: e.target.checked})}
                className="w-4 h-4 mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-purple-300 cursor-pointer"
              />
              <div className="flex flex-col cursor-pointer select-none" onClick={() => setNewLot({...newLot, is_first_batch: !newLot.is_first_batch})}>
                <Label htmlFor="is_first_batch" className="text-xs font-bold text-purple-950 cursor-pointer flex items-center gap-1.5">
                  <span>🔬 ออเดอร์ผลิตครั้งแรก (1st Batch / Pilot Batch)</span>
                </Label>
                <span className="text-[10.5px] text-purple-800 font-normal mt-0.5">
                  ระบบจะแจ้งเตือนฝ่ายประกันคุณภาพ (QA) เพื่อเข้าร่วมสังเกตการณ์และประเมินขั้นตอนการผสมกับฝ่ายผสม (MX) ถัง 1 บนเรดาร์ 21 วัน
                </span>
              </div>
            </div>

            {/* 1. ช่วงเวลาแผนการผลิต (Production Window) */}
            <div className="col-span-2 md:col-span-4 p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>ช่วงเวลาแผนการผลิต (Production Window: เริ่มผลิต - ผลิตเสร็จ)</span>
                </Label>
                <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                  ใช้ประเมินรอบการผลิต
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                กำหนดกรอบเวลาเริ่มและเสร็จสิ้นกระบวนการผลิต สำหรับประเมินว่าใกล้ถึงเวลาวางแผนรอบถัดไปแล้วหรือยัง (รองรับทั้ง MTS และ MTO)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-semibold">วันที่เริ่มผลิต (Plan Start)</Label>
                  <Input 
                    type="date" 
                    value={newLot.fg_due_date_start} 
                    onChange={e => setNewLot({...newLot, fg_due_date_start: e.target.value})} 
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-semibold">วันที่ผลิตเสร็จ (Plan End)</Label>
                  <Input 
                    type="date" 
                    value={newLot.due_date} 
                    onChange={e => setNewLot({...newLot, due_date: e.target.value})} 
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. แผนการส่งมอบสินค้า FG (Delivery Schedule) */}
            <div className="col-span-2 md:col-span-4 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-indigo-600" />
                    <span>แผนการส่งมอบสินค้า (FG Delivery Schedule)</span>
                  </Label>
                  <span className="text-[11px] text-indigo-800">
                    เลือกรูปแบบการส่งมอบสินค้าสำเร็จรูป (FG) สำหรับออเดอร์นี้
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-200 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setNewLot({ ...newLot, delivery_mode: 'single' })}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      newLot.delivery_mode === 'single'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    ส่งงวดเดียว (Single)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = newLot.delivery_schedule || []
                      const orderQty = parseFloat(newLot.order_quantity || "0")
                      const initialSchedule = current.length > 0 
                        ? current 
                        : [
                            { 
                              installment: 1, 
                              date: newLot.due_date || newLot.fg_due_date || format(new Date(), "yyyy-MM-dd"), 
                              quantity: orderQty > 0 ? orderQty : 0, 
                              note: "งวดที่ 1" 
                            }
                          ]
                      setNewLot({ ...newLot, delivery_mode: 'multiple', delivery_schedule: initialSchedule })
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      newLot.delivery_mode === 'multiple'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    แบ่งส่งหลายงวด (Multiple)
                  </button>
                </div>
              </div>

              {newLot.delivery_mode === 'single' ? (
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-indigo-100">
                  <Label className="text-xs font-semibold text-slate-700">กำหนดส่งมอบ FG (Single Due Date)</Label>
                  <Input 
                    type="date" 
                    value={newLot.fg_due_date} 
                    onChange={e => setNewLot({...newLot, fg_due_date: e.target.value})} 
                    className="max-w-xs bg-slate-50"
                  />
                  <p className="text-[10.5px] text-slate-500">
                    ออเดอร์นี้จะปรากฏบนเรดาร์ 21 วัน ในช่อง &quot;กำหนดส่งมอบ FG&quot; ตรงกับวันที่ระบุนี้
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 bg-white p-3 rounded-lg border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      ตารางงวดส่งมอบ FG ({(newLot.delivery_schedule || []).length} งวด)
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddInstallment}
                      className="h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มงวดส่งมอบ
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(newLot.delivery_schedule || []).map((inst, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="w-16 shrink-0">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                            งวด {inst.installment}
                          </span>
                        </div>
                        <div className="flex-1 w-full sm:w-auto grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input
                            type="date"
                            value={inst.date || ""}
                            onChange={e => handleUpdateInstallment(idx, "date", e.target.value)}
                            className="h-8 text-xs bg-white"
                          />
                          <Input
                            type="number"
                            placeholder="จำนวน (ชิ้น)"
                            value={inst.quantity || ""}
                            onChange={e => handleUpdateInstallment(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs bg-white"
                          />
                          <Input
                            type="text"
                            placeholder="หมายเหตุ (เช่น ล็อตแรก, ลูกค้า A)"
                            value={inst.note || ""}
                            onChange={e => handleUpdateInstallment(idx, "note", e.target.value)}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInstallment(idx)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 self-end sm:self-auto cursor-pointer"
                          title="ลบงวดนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Summary Bar */}
                  {(() => {
                    const orderQty = parseFloat(newLot.order_quantity || "0")
                    const totalAllocated = (newLot.delivery_schedule || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
                    const diff = totalAllocated - orderQty
                    const isMatched = orderQty > 0 && diff === 0
                    const isUnder = diff < 0
                    return (
                      <div className={`flex flex-wrap items-center justify-between p-2 rounded-lg text-xs font-medium ${
                        isMatched
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : isUnder
                          ? "bg-amber-50 text-amber-900 border border-amber-200"
                          : "bg-blue-50 text-blue-900 border border-blue-200"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {isMatched ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          <span>
                            รวมยอดจัดสรรส่งมอบ: <strong>{totalAllocated.toLocaleString()}</strong> / ยอดออเดอร์: <strong>{orderQty.toLocaleString()}</strong> ชิ้น
                          </span>
                        </div>
                        <div className="font-bold">
                          {isMatched && <span className="text-emerald-700">✓ ยอดส่งครบถ้วนพอดี</span>}
                          {isUnder && <span className="text-amber-700">ขาดอีก {Math.abs(diff).toLocaleString()} ชิ้น</span>}
                          {!isMatched && !isUnder && <span className="text-blue-700">เกิน {diff.toLocaleString()} ชิ้น</span>}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
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

      {/* Plan Reschedule Dialog */}
      <Dialog open={!!rescheduleModal?.isOpen} onOpenChange={(open) => !open && setRescheduleModal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-base">
                🔄
              </span>
              บันทึกการปรับเลื่อนแผนงานผลิต
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              ระบบบันทึกประวัติการปรับวัน เพื่อใช้ประเมิน Schedule Adherence KPI และให้ AI Plant Director วิเคราะห์ผลกระทบ
            </DialogDescription>
          </DialogHeader>

          {rescheduleModal && (
            <div className="space-y-4 py-2 text-sm">
              {rescheduleModal.isStartedOverride && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">⚠️ คิวงานนี้เริ่มดำเนินการแล้ว (กำลังดำเนินการ)</div>
                    <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      ระบบอนุญาตให้ฝ่ายวางแผนขยับวันตามแผนเพื่อให้สอดคล้องกับหน้างานจริง โดยจะบันทึกประวัติการ Re-plan ไว้อย่างชัดเจนเพื่อประเมิน KPI/OTIF กรุณาระบุหมวดหมู่และเหตุผล
                    </div>
                  </div>
                </div>
              )}

              {/* Context Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lot No:</span>
                  <span className="font-semibold text-slate-800">{rescheduleModal.lotNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU / สินค้า:</span>
                  <span className="font-medium text-slate-700">{rescheduleModal.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ขั้นตอนการผลิต:</span>
                  <span className="font-semibold text-blue-700">{rescheduleModal.processName}</span>
                </div>
              </div>

              {/* Date Comparison */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <div>
                  <div className="text-[11px] text-amber-800 font-medium mb-1">📅 กำหนดเดิมตามแผน (Baseline)</div>
                  <div className="text-sm font-bold text-slate-700">
                    {rescheduleModal.originalDate ? format(new Date(rescheduleModal.originalDate), 'dd/MM/yyyy') : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-800 font-medium mb-1 flex items-center justify-between">
                    <span>🎯 กำหนดวันใหม่ (Revised)</span>
                    <span className="text-[10px] text-emerald-600 font-normal">คลิกเลือกวันใหม่</span>
                  </div>
                  <Input 
                    type="date"
                    value={rescheduleModal.newDate || ''}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
                    className="h-8 text-xs bg-white border-emerald-400 font-bold text-emerald-800 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Reason Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  สาเหตุหลักที่ต้องปรับเลื่อนแผน <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={rescheduleModal.category} 
                  onValueChange={(val) => setRescheduleModal({ ...rescheduleModal, category: val || 'WAIT_RM_PM' })}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="เลือกหมวดหมู่สาเหตุ" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_CHANGE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  รายละเอียดเพิ่มเติม / หมายเหตุของฝ่ายวางแผน {rescheduleModal.isStartedOverride && <span className="text-red-500">*</span>}
                </Label>
                <Textarea 
                  placeholder={rescheduleModal.isStartedOverride ? "ระบุเหตุผลที่ต้องขยับแผน เช่น หน้างานแช่ไว้รอถังผสม หรือ พักสายการผลิตชั่วคราว" : "เช่น BEC ขอเลื่อนส่ง Glycerin เป็น 21/09 หรือ หน้างานรอผล Micro Lab ก่อนบรรจุ"}
                  value={rescheduleModal.reason}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
                  className="text-xs min-h-[70px] resize-none bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center pt-2">
            {!rescheduleModal?.isStartedOverride ? (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="text-xs text-slate-500 hover:text-slate-700 w-full sm:w-auto"
                onClick={handleQuickRescheduleWithoutReason}
              >
                ปรับวันโดยไม่บันทึกสาเหตุ
              </Button>
            ) : (
              <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>งานที่เริ่มแล้ว บังคับบันทึกสาเหตุเพื่อประเมิน KPI</span>
              </div>
            )}
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => setRescheduleModal(null)}
              >
                ยกเลิก
              </Button>
              <Button 
                type="button" 
                size="sm" 
                className="text-xs bg-[#0B192C] text-white hover:bg-[#1E3E62]"
                onClick={handleConfirmReschedule}
              >
                💾 บันทึกการเลื่อนแผน
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Mistaken Start Modal (ยกเลิกเริ่มงานผิด) */}
      <Dialog open={!!resetStartModal?.isOpen} onOpenChange={(open) => !open && setResetStartModal(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 text-base">
                ↩️
              </span>
              ยกเลิกการเริ่มงาน (เผลอกดเริ่มผิด)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              คืนสถานะคิวงานกลับเป็น &quot;รอดำเนินการ&quot; เพื่อให้ฝ่ายวางแผนสามารถขยับวันหรือจัดคิวใหม่ได้
            </DialogDescription>
          </DialogHeader>

          {resetStartModal && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lot No:</span>
                  <span className="font-bold">{resetStartModal.lotNo} ({resetStartModal.sku})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ขั้นตอน:</span>
                  <span className="font-semibold text-blue-700">{resetStartModal.processName}</span>
                </div>
                {resetStartModal.startTime && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">เวลาที่กดเริ่มในระบบ:</span>
                    <span className="font-medium text-amber-900">
                      {format(new Date(resetStartModal.startTime), 'dd/MM/yyyy HH:mm:ss')}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-blue-50/70 rounded-md border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                ℹ️ เมื่อยืนยัน ระบบจะล้างเวลาเริ่มงาน (<code className="bg-blue-100 px-1 py-0.5 rounded">start_time = null</code>) 
                และเปลี่ยนสถานะกลับเป็น <strong>รอเริ่มงาน (WAITING)</strong> พร้อมปลดล็อกให้สามารถย้ายหรือขยับแผนได้ทันที
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  ระบุเหตุผลในการยกเลิก <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={resetStartModal.reason}
                  onChange={(e) => setResetStartModal({ ...resetStartModal, reason: e.target.value })}
                  placeholder="เช่น พนักงานเผลอกดเริ่มผิด หรือ ยังไม่มีการเริ่มชั่งจริง"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setResetStartModal(null)}
              disabled={resetStartModal?.isSubmitting}
            >
              ปิด
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={handleConfirmResetStart}
              disabled={resetStartModal?.isSubmitting}
            >
              {resetStartModal?.isSubmitting ? "กำลังยกเลิก..." : "↩️ ยืนยันยกเลิกเริ่มงาน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Operator Modal */}
      <Dialog open={!!editingOperatorItem} onOpenChange={(open) => !open && setEditingOperatorItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
              <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-base">
                👤
              </span>
              แก้ไขผู้ดำเนินการ (Operator)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              แก้ไขหรือกำหนดผู้ดำเนินการสำหรับรายการประวัตินี้
            </DialogDescription>
          </DialogHeader>

          {editingOperatorItem && (
            <div className="space-y-4 py-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Project / ออเดอร์:</span>
                  <span className="font-semibold text-slate-800">{editingOperatorItem.project}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ผู้ดำเนินการปัจจุบัน:</span>
                  <span className="font-bold text-blue-700">{editingOperatorItem.currentUserName}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  เลือกผู้ดำเนินการใหม่ (Username / พนักงาน) <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedOperatorId}
                  onValueChange={(val) => setSelectedOperatorId(val || '')}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="เลือกผู้ใช้งาน..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    {usersList.map((u) => {
                      const empId = (u.employee_id || u.username || 'USER').toUpperCase();
                      const name = u.full_name || '';
                      return (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          <span className="font-bold text-slate-800">{empId}</span>
                          {name && <span className="text-slate-500 ml-1.5">({name})</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setEditingOperatorItem(null)}
              disabled={isUpdatingOperator}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleUpdateOperator}
              disabled={isUpdatingOperator}
            >
              {isUpdatingOperator ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline Print & PDF Export Modal (A4 Landscape) */}
      <TimelinePrintModal
        isOpen={isTimelinePrintOpen}
        onClose={() => setIsTimelinePrintOpen(false)}
        lots={lots}
        logs={logs}
        processes={processes}
        currentUser={currentUserInfo?.employee_id || currentUser || 'PLPTB1234'}
        initialDept={filterDept}
        initialOrderType={filterOrderType}
        initialShowHandovers={showShopfloorHandovers}
        initialViewMode={timelineViewMode}
      />
    </div>
  )
}
