'use client'

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, Download, Upload, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, 
  Filter, ListTodo, CalendarDays, Calendar as CalendarIcon, CheckCircle2, 
  Clock, AlertTriangle, Activity, History, TrendingUp, Layers, Sparkles, 
  RefreshCw, BarChart3, Package, ShieldCheck, ArrowUpRight, CheckSquare,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, Search, RotateCcw, UserCheck, User,
  Printer
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
import { format, differenceInDays, startOfDay, addDays, isSameDay } from "date-fns"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { getUsers } from '@/app/actions/users'
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"
import { canEditRoute } from "@/lib/permissions"
import { TaskCalendar } from "@/components/ui/TaskCalendar"
import { TimelinePrintModal } from "@/components/planner/TimelinePrintModal"
import { 
  PLAN_CHANGE_CATEGORIES, 
  parsePlanChangeInfo, 
  formatPlanChangeNote, 
  getPlanCategoryLabel,
  cleanDisplayNote,
  extractUserComment
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
    fg_due_date: "", fg_due_date_start: "", new_sku_name: "", unit: "pc",
    mfg_date: "", exp_date: "", product_name: "",
    is_first_batch: false
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
    const rawOrderType = lot.order_type || "MTS"
    const isFirstBatch = rawOrderType.includes('[1ST_BATCH]') || 
      (lot.products?.sku || '').includes('PAMH-008')
    const cleanOrderType = rawOrderType.replace(/\[1ST_BATCH\]/g, '').trim() || 'MTS'

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
      new_sku_name: "",
      unit: "pc",
      mfg_date: "",
      exp_date: "",
      product_name: lot.products?.product_name || "",
      is_first_batch: isFirstBatch
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

      const userIdentifier = (currentUserInfo?.employee_id || currentUser || 'PLANNER').toUpperCase()
      const logNote = `ส่งยอด FG: ${doneFgAmount} ชิ้น | ปิด PO: ${doneCanClosePo === 'yes' ? 'ได้เลย' : 'ไม่ได้'}${doneCanClosePo === 'no' ? ` | สาเหตุ: ${doneReason}` : ''} (โดย ${userIdentifier})`
      const newLog = {
        production_lot_id: doneLotId,
        status: "COMPLETED",
        activity_date: format(new Date(), "yyyy-MM-dd"),
        process_id: null,
        note: logNote,
        ...(currentUserId ? { created_by: currentUserId, updated_by: currentUserId } : {})
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
          ? `${(newLot.order_type || 'MTS').replace(/\[1ST_BATCH\]/g, '').trim()} [1ST_BATCH]`
          : (newLot.order_type || 'MTS').replace(/\[1ST_BATCH\]/g, '').trim(),
        fg_due_date: newLot.fg_due_date || null,
        planned_start_date: newLot.order_type === 'MTS' ? (newLot.fg_due_date_start || null) : null,
        updated_at: new Date().toISOString(),
        ...(currentUserId ? { updated_by: currentUserId } : {})
      }

      if (newLot.id) {
        const { error: updateErr } = await supabase.from("production_lots").update(lotData).eq("id", newLot.id)
        if (updateErr) throw updateErr
        toast.success("แก้ไขงานเรียบร้อย")
      } else {
        if (currentUserId) {
          lotData.created_by = currentUserId
        }
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
      ...(currentUserId ? { created_by: currentUserId, updated_by: currentUserId } : {})
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
      let updateData: any = { 
        [field]: value,
        updated_at: new Date().toISOString(),
        ...(currentUserId ? { updated_by: currentUserId } : {})
      }
      const existingLog = logs.find(l => l.id === logId)
      
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
    if (!newDateValue) {
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

    const isInitialSetup = (isCreatedToday || isDefaultCreationDate || !currentVal) && !planInfo.isRescheduled

    if (isInitialSetup) {
      handleUpdateLogDirect(log.id, field, newDateValue)
      return
    }

    // It's an existing plan date being modified on a subsequent day -> Open Reschedule Modal to track reason
    setRescheduleModal({
      isOpen: true,
      logId: log.id,
      lotNo: lot?.lot_no || '-',
      sku: lot?.products?.sku || lot?.products?.product_name || '-',
      processName: process?.process_name || 'งานผลิต',
      originalDate: planInfo.originalDate || currentVal, // preserve first baseline plan date
      newDate: newDateValue,
      field,
      category: planInfo.category || 'WAIT_RM_PM',
      reason: planInfo.reason ? cleanDisplayNote(planInfo.reason) : '',
      currentNote: extractUserComment(log.note),
      revisionCount: (planInfo.revisionCount || 0) + 1
    })
  }

  const handleOpenRescheduleDetail = (log: any, lot: any, process: any) => {
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
      category: planInfo.category || 'WAIT_RM_PM',
      reason: planInfo.reason ? cleanDisplayNote(planInfo.reason) : '',
      currentNote: extractUserComment(log.note),
      revisionCount: planInfo.revisionCount || 1
    })
  }

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal) return
    const { logId, field, newDate, originalDate, category, reason, currentNote, revisionCount } = rescheduleModal
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
      ...(currentUserId ? { updated_by: currentUserId } : {})
    }

    // If updating activity_date and end_date was same as old activity_date, adjust end_date too
    const existingLog = logs.find(l => l.id === logId)
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
    const { logId, field, newDate } = rescheduleModal
    setRescheduleModal(null)
    await handleUpdateLogDirect(logId, field, newDate)
  }

  const handleToggleFirstBatch = async (log: any, lot: any) => {
    if (!canEdit) return
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

  
  const resolveUserName = (userId: string | null | undefined, fallbackNote?: string | null, isHandoverTask = false) => {
    // 1. If explicit userId provided (uuid)
    if (userId) {
      const u = usersList.find(u => u.id === userId);
      if (u) return (u.employee_id ? u.employee_id.toUpperCase() : u.full_name);
    }

    // 2. Check if note has a user tag like (โดย USERNAME) or [PLAN_RESCHEDULE:...updatedBy:"USERNAME"]
    if (fallbackNote) {
      const planInfo = parsePlanChangeInfo(fallbackNote);
      if (planInfo.updatedBy && planInfo.updatedBy.toLowerCase() !== 'planner' && planInfo.updatedBy.toLowerCase() !== 'system') {
        return planInfo.updatedBy.toUpperCase();
      }
      const byMatch = fallbackNote.match(/\(โดย\s+([^-\)]+)/i);
      if (byMatch && byMatch[1] && byMatch[1].trim().toLowerCase() !== 'system' && byMatch[1].trim().toLowerCase() !== 'planner') {
        return byMatch[1].trim().toUpperCase();
      }
    }

    // 3. If automated shopfloor handover task (รอ QC / รอ POF / รอเข้าคลัง FG / ลงลัง)
    if (isHandoverTask) {
      return 'SYSTEM';
    }

    // 4. Default for production planning queue: Official Planner Officer (PLPTB1234 คุณพรทิพย์ บูรณ์รัตน์ธรรม)
    const knownPlanner = usersList.find(u => u.role?.includes('planner:edit') || u.employee_id?.toUpperCase().startsWith('PL'));
    if (knownPlanner && knownPlanner.employee_id) {
      return knownPlanner.employee_id.toUpperCase();
    }

    return 'PLPTB1234';
  };

  const getHistoryData = () => {
    const orderHistory = lots.map(lot => {
      const effectiveUserId = lot.updated_by || lot.created_by;
      const userName = resolveUserName(effectiveUserId, null, false);
      const userObj = usersList.find(u => u.id === effectiveUserId || (u.employee_id && u.employee_id.toUpperCase() === userName.toUpperCase()));
      return {
        id: `lot-${lot.id}`,
        recordId: lot.id,
        isLog: false,
        type: 'เพิ่มออเดอร์',
        project: `${lot.po_no || '-'} / ${lot.products?.sku || 'Unknown SKU'}`,
        timestamp: lot.created_at,
        user: userName,
        userId: effectiveUserId,
        userFullName: userObj?.full_name || (userName === 'PLPTB1234' ? 'คุณพรทิพย์ บูรณ์รัตน์ธรรม' : (userName === 'SYSTEM' ? 'ระบบอัตโนมัติ' : '')),
        details: `เพิ่มออเดอร์ยอด ${(lot.order_quantity || 0).toLocaleString()} pc (${lot.total_tanks || 0} ถัง)`
      };
    });

    const taskHistory = logs.map(log => {
      const lot = lots.find(l => l.id === log.production_lot_id);
      const process = processes.find(p => p.id === log.process_id);
      const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at);
      const isRescheduled = planInfo.isRescheduled;
      const isCompletion = (log.status === 'COMPLETED' || log.status === 'DONE') && (log.note || '').includes('ส่งยอด FG');

      const isHandover = process?.process_name ? (
        process.process_name.includes('รอ QC') ||
        process.process_name.includes('รอ POF') ||
        process.process_name.includes('รอเข้าคลัง') ||
        process.process_name.includes('ลงลัง')
      ) : false;

      const effectiveUserId = log.updated_by || log.created_by || log.operator_id;
      const userName = resolveUserName(effectiveUserId, log.note, isHandover);
      const userObj = usersList.find(u => u.id === effectiveUserId || (u.employee_id && u.employee_id.toUpperCase() === userName.toUpperCase()));

      let actionType = 'ลงคิวงาน';
      if (isCompletion) actionType = 'ปิดงาน';
      else if (isRescheduled) actionType = 'ปรับเลื่อนแผน';
      else if (isHandover) actionType = 'ส่งต่องาน (Auto)';

      return {
        id: `log-${log.id}`,
        recordId: log.id,
        isLog: true,
        type: actionType,
        project: `${lot?.po_no || '-'} / ${lot?.products?.sku || 'Unknown SKU'}`,
        timestamp: log.updated_at || log.created_at,
        user: userName,
        userId: effectiveUserId,
        userFullName: userObj?.full_name || (userName === 'PLPTB1234' ? 'คุณพรทิพย์ บูรณ์รัตน์ธรรม' : (userName === 'SYSTEM' ? 'ระบบส่งต่องานอัตโนมัติ' : '')),
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
          item.user.toLowerCase().includes(query);
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
        if (!uName.includes(query) && !fName.includes(query)) return false;
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
    setSelectedOperatorId(item.userId || currentUserId || (usersList[0]?.id || ''));
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
            created_by: selectedOperatorId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOperatorItem.recordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('production_lots')
          .update({ 
            updated_by: selectedOperatorId,
            created_by: selectedOperatorId,
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
      'วันเวลา': format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm:ss'),
      'ผู้ดำเนินการ': item.user,
      'ชื่อ-นามสกุล': item.userFullName || '-',
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

  const completedLotsCount = useMemo(() => lots.filter(lot => lot.current_status === "DONE").length, [lots]);
  const activeLotsCount = useMemo(() => lots.filter(lot => lot.current_status !== "DONE").length, [lots]);

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

    logs.forEach(log => {
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
  }, [logs, processes])

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
                fg_due_date: "", fg_due_date_start: "", new_sku_name: "", unit: "pc",
                mfg_date: "", exp_date: "", product_name: "",
                is_first_batch: false
              })
              setIsDialogOpen(true)
            }} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold">
              <Plus className="w-4 h-4 mr-2" /> เพิ่มออเดอร์ใหม่ (Project)
            </Button>
          )}
        </div>
      </div>

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
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="!h-auto p-1.5 bg-slate-100/90 border border-slate-200/90 rounded-2xl shadow-inner flex flex-wrap items-center gap-1.5">
                {/* Tab 1: Main Table */}
                <TabsTrigger
                  value="table"
                  className={cn(
                    "h-9 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 border shadow-xs",
                    activeTab === "table"
                      ? "!bg-slate-900 !text-white !border-slate-900 shadow-md ring-2 ring-slate-900/25"
                      : "!bg-white !text-slate-700 hover:!bg-slate-100 hover:!text-slate-950 border-slate-300"
                  )}
                >
                  <Layers className={cn("w-4 h-4 shrink-0 transition-colors", activeTab === "table" ? "text-amber-400" : "text-slate-500")} />
                  <span>Main Table</span>
                  <span className={cn(
                    "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors",
                    activeTab === "table" ? "bg-slate-800 text-amber-300 border border-slate-700" : "bg-slate-100 text-slate-600 border border-slate-200"
                  )}>
                    {activeLotsCount}
                  </span>
                </TabsTrigger>

                {/* Tab 2: Timeline */}
                <TabsTrigger
                  value="timeline"
                  className={cn(
                    "h-9 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 border shadow-xs",
                    activeTab === "timeline"
                      ? "!bg-indigo-600 !text-white !border-indigo-600 shadow-md ring-2 ring-indigo-600/30"
                      : "!bg-indigo-50/80 !text-indigo-700 hover:!bg-indigo-100 hover:!text-indigo-950 border-indigo-200/90"
                  )}
                >
                  <CalendarIcon className={cn("w-4 h-4 shrink-0 transition-colors", activeTab === "timeline" ? "text-indigo-200" : "text-indigo-600")} />
                  <span>Timeline</span>
                </TabsTrigger>

                {/* Tab 3: ประวัติการทำงานแบบต่อเนื่อง */}
                <TabsTrigger
                  value="history"
                  className={cn(
                    "h-9 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 border shadow-xs",
                    activeTab === "history"
                      ? "!bg-blue-600 !text-white !border-blue-600 shadow-md ring-2 ring-blue-600/30"
                      : "!bg-blue-50/80 !text-blue-700 hover:!bg-blue-100 hover:!text-blue-950 border-blue-200/90"
                  )}
                >
                  <History className={cn("w-4 h-4 shrink-0 transition-colors", activeTab === "history" ? "text-blue-200 animate-pulse" : "text-blue-600")} />
                  <span>ประวัติการทำงานแบบต่อเนื่อง</span>
                </TabsTrigger>

                {/* Tab 4: งานที่เสร็จสิ้น (Completed) */}
                <TabsTrigger
                  value="completed"
                  className={cn(
                    "h-9 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 border shadow-xs",
                    activeTab === "completed"
                      ? "!bg-emerald-600 !text-white !border-emerald-600 shadow-md ring-2 ring-emerald-600/30"
                      : "!bg-emerald-50/80 !text-emerald-700 hover:!bg-emerald-100 hover:!text-emerald-950 border-emerald-200/80"
                  )}
                >
                  <CheckCircle2 className={cn("w-4 h-4 shrink-0 transition-colors", activeTab === "completed" ? "text-emerald-200" : "text-emerald-600")} />
                  <span>งานที่เสร็จสิ้น (Completed)</span>
                  {completedLotsCount > 0 && (
                    <span className={cn(
                      "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors",
                      activeTab === "completed" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    )}>
                      {completedLotsCount}
                    </span>
                  )}
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

            {/* Toggle Switch: Shopfloor Handover Tasks (รอ QC, รอ POF, รอเข้าคลัง FG, ลงลัง) */}
            <Button
              size="sm"
              variant={showShopfloorHandovers ? "default" : "outline"}
              onClick={toggleShowShopfloorHandovers}
              className={cn(
                "h-8 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 rounded-xl",
                showShopfloorHandovers
                  ? "bg-purple-700 text-white hover:bg-purple-800 border-purple-800 shadow-sm ring-1 ring-purple-400"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-purple-50 hover:text-purple-900 shadow-xs"
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
            </Button>
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
            {activeTab === "timeline" && (
              <Button 
                size="sm" 
                onClick={() => setIsTimelinePrintOpen(true)} 
                className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 shrink-0 rounded-lg"
                title="พิมพ์หรือบันทึกแผนงาน Timeline เป็นเอกสาร PDF (A4 แนวนอน)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ / Export PDF (A4 แนวนอน)</span>
              </Button>
            )}
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

                        return (
                          <TableRow key={log.id} className="bg-[#F8F6F0]/ hover:bg-slate-100/50">
                            <TableCell className="text-center">
                              {canEdit ? (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteLog(log.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <span className="text-slate-300">•</span>
                              )}
                            </TableCell>
                            <TableCell colSpan={4} className="pl-8 py-2">
                              <div className="flex items-center gap-2 border-l-2 border-slate-300 pl-4 h-full py-1">
                                <div className={cn("w-2 h-2 rounded-full", pt.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))}></div>
                                
                                {canEdit ? (
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
                                  <span className="text-xs font-semibold text-slate-700">{process?.process_name || "-"}</span>
                                )}

                                <span className="text-xs text-slate-500 ml-2">(Tanks</span>
                                <Input disabled={!canEdit} type="number" className="w-12 h-6 text-xs px-1 text-center bg-white" value={log.tank_start || ""} onChange={e => handleUpdateLogDirect(log.id, "tank_start", e.target.value)} />
                                <span className="text-xs text-slate-500">-</span>
                                <Input disabled={!canEdit} type="number" className="w-12 h-6 text-xs px-1 text-center bg-white" value={log.tank_end || ""} onChange={e => handleUpdateLogDirect(log.id, "tank_end", e.target.value)} />
                                <span className="text-xs text-slate-500">)</span>

                                {process?.process_name?.includes('ผสม') && (() => {
                                  const isAutoPamh = (lot?.products?.sku || '').includes('PAMH-008') && (Number(log.tank_start || 1) <= 1 && Number(log.tank_end || 1) >= 1)
                                  const hasBatchTag = (log.note || '').toLowerCase().includes('[1st_batch]') || (lot?.order_type || '').includes('[1ST_BATCH]')
                                  const is1stBatch = isAutoPamh || hasBatchTag

                                  return (
                                    <button
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() => handleToggleFirstBatch(log, lot)}
                                      title={isAutoPamh 
                                        ? "งาน PAMH-008 ถัง 1 กำหนดเป็น 1st Batch โดยอัตโนมัติตามข้อกำหนด" 
                                        : "คลิกเพื่อเปิด/ปิด สถานะ 1st Batch เพื่อแจ้งเตือน QA เข้าประเมินร่วมกับ MX บนเรดาร์ 21 วัน"}
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border transition-all cursor-pointer select-none shrink-0 ml-1.5",
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
                                        disabled={!canEdit}
                                        type="date" 
                                        className={cn(
                                          "h-8 text-xs w-[130px] bg-white transition-colors", 
                                          planInfo.isRescheduled && "border-amber-400 bg-amber-50/50 text-amber-900 font-medium"
                                        )} 
                                        value={log.activity_date || ""} 
                                        onChange={(e) => handleDateInputChange(log, lot, process, "activity_date", e.target.value)}
                                      />
                                      {planInfo.isRescheduled && (
                                        <button 
                                          type="button"
                                          onClick={() => handleOpenRescheduleDetail(log, lot, process)}
                                          title={`คลิกเพื่อดู/แก้ไขบันทึกเลื่อนแผน (เดิม: ${planInfo.originalDate} -> สาเหตุ: ${planInfo.categoryLabel})`}
                                          className="text-[10px] text-amber-800 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit transition-colors text-left font-medium"
                                        >
                                          <span>🔄 เดิม:</span>
                                          <span>{planInfo.originalDate ? format(new Date(planInfo.originalDate), 'dd/MM/yy') : '-'}</span>
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input 
                                      type="date" 
                                      className="h-8 text-xs w-[130px]" 
                                      value={log.end_date || ""} 
                                      onChange={(e) => handleDateInputChange(log, lot, process, "end_date", e.target.value)}
                                    />
                                  </TableCell>
                                </>
                              )
                            })()}
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
          <>
            {/* Plan vs Actual KPI Summary Header */}
            <div className="p-3 sm:p-4 bg-white border-b border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
                {/* 1. Overall Plan Accuracy */}
                <div className="bg-gradient-to-br from-indigo-50/80 to-white p-2.5 rounded-xl border border-indigo-200 shadow-xs">
                  <div className="text-[10.5px] font-bold text-indigo-700 flex items-center justify-between">
                    <span>ความแม่นยำรวม (Accuracy)</span>
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-black text-indigo-950 mt-1">
                    {scheduleAdherenceStats.overallAccuracy}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    ตรงแผน <strong className="text-emerald-700 font-bold">{scheduleAdherenceStats.totalOnTime}</strong> • ล่าช้า <strong className="text-rose-700 font-bold">{scheduleAdherenceStats.totalDelayed}</strong>
                  </div>
                </div>

                {/* 2. RM Weighing */}
                <div className="bg-gradient-to-br from-amber-50/80 to-white p-2.5 rounded-xl border border-amber-200 shadow-xs">
                  <div className="text-[10.5px] font-bold text-amber-800 flex items-center justify-between">
                    <span>🟡 ฝ่ายชั่งสาร (RM)</span>
                    <span className="text-[10px] font-bold font-mono">{scheduleAdherenceStats.deptStats.RM.accuracy}%</span>
                  </div>
                  <div className="text-xl font-black text-amber-950 mt-1">
                    {scheduleAdherenceStats.deptStats.RM.accuracy}%
                  </div>
                  <div className="w-full bg-amber-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${scheduleAdherenceStats.deptStats.RM.accuracy}%` }} />
                  </div>
                </div>

                {/* 3. MX Mixing */}
                <div className="bg-gradient-to-br from-blue-50/80 to-white p-2.5 rounded-xl border border-blue-200 shadow-xs">
                  <div className="text-[10.5px] font-bold text-blue-800 flex items-center justify-between">
                    <span>🔵 ฝ่ายผสม (MX)</span>
                    <span className="text-[10px] font-bold font-mono">{scheduleAdherenceStats.deptStats.MX.accuracy}%</span>
                  </div>
                  <div className="text-xl font-black text-blue-950 mt-1">
                    {scheduleAdherenceStats.deptStats.MX.accuracy}%
                  </div>
                  <div className="w-full bg-blue-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${scheduleAdherenceStats.deptStats.MX.accuracy}%` }} />
                  </div>
                </div>

                {/* 4. PK Packing (Highlights if bottleneck) */}
                <div className={cn(
                  "p-2.5 rounded-xl border shadow-xs transition-all",
                  Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90
                    ? "bg-gradient-to-br from-rose-50/90 to-white border-rose-300 ring-1 ring-rose-200"
                    : "bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200"
                )}>
                  <div className={cn(
                    "text-[10.5px] font-bold flex items-center justify-between",
                    Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "text-rose-800" : "text-emerald-800"
                  )}>
                    <span>🟢 ฝ่ายบรรจุ (PK)</span>
                    <span className="text-[10px] font-bold font-mono">{scheduleAdherenceStats.deptStats.PK.accuracy}%</span>
                  </div>
                  <div className={cn(
                    "text-xl font-black mt-1",
                    Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "text-rose-950" : "text-emerald-950"
                  )}>
                    {scheduleAdherenceStats.deptStats.PK.accuracy}%
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", Number(scheduleAdherenceStats.deptStats.PK.accuracy) < 90 ? "bg-rose-500" : "bg-emerald-500")}
                      style={{ width: `${scheduleAdherenceStats.deptStats.PK.accuracy}%` }}
                    />
                  </div>
                </div>

                {/* 5. Average Delay */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                    <span>ความล่าช้าเฉลี่ย</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    +{scheduleAdherenceStats.avgDelay} <span className="text-xs font-normal text-slate-500">วัน</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    เร็วกว่าแผน: <strong className="text-blue-600 font-bold">{scheduleAdherenceStats.totalEarly}</strong> งาน
                  </div>
                </div>

                {/* 6. Bottleneck Insights */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[10.5px] font-bold text-slate-700 flex items-center justify-between">
                    <span>วิเคราะห์คอขวดสะสม</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-[10.5px] font-bold text-slate-900 mt-1 truncate" title={scheduleAdherenceStats.topBottleneckText}>
                    {scheduleAdherenceStats.topBottleneckText}
                  </div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5 truncate" title={scheduleAdherenceStats.bottleneckSummaryText}>
                    {scheduleAdherenceStats.bottleneckSummaryText}
                  </div>
                </div>
              </div>

              {/* View Mode Switcher Toolbar & Print Trigger */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 shrink-0">โหมดมุมมอง Timeline:</span>
                  <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTimelineViewMode('plan')}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                        timelineViewMode === 'plan'
                          ? "bg-white text-indigo-900 shadow-sm font-black ring-1 ring-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <span>🅿️ แผนงาน (Plan)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineViewMode('actual')}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                        timelineViewMode === 'actual'
                          ? "bg-white text-emerald-900 shadow-sm font-black ring-1 ring-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <span>🅰️ ทำจริง (Actual)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineViewMode('compare')}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                        timelineViewMode === 'compare'
                          ? "bg-indigo-600 text-white shadow-sm font-black"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <span>⚖️ เปรียบเทียบ (Compare P vs A)</span>
                      <span className="bg-amber-400 text-amber-950 text-[8.5px] px-1 py-0 rounded font-black">PRO</span>
                    </button>
                  </div>

                  {/* Visual Legend */}
                  <div className="hidden lg:flex items-center gap-2 text-[10.5px] text-slate-600 ml-2">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>ตรงแผน</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>ล่าช้า</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>เร็วกว่าแผน</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-50 border border-dashed border-indigo-400 shrink-0"></span>🅿️ แผน</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-600 shrink-0"></span>🅰️ ทำจริง</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                    {format(timelineDates[0], 'dd MMM yyyy')} - {format(timelineDates[13], 'dd MMM yyyy')}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setIsTimelinePrintOpen(true)}
                    className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 rounded-lg"
                    title="คลิกเพื่อเปิดหน้าต่างพิมพ์หรือบันทึกแผนงาน Timeline เป็นเอกสาร PDF (A4 แนวนอน)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ / Export PDF (A4 แนวนอน)</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Interactive Timeline Lookahead Table */}
            <div className="overflow-x-auto min-h-[500px]">
              <div className="min-w-[1200px] border-t border-slate-200 relative">
                {/* Timeline Date Headers */}
                <div className="flex border-b border-slate-200 bg-[#F8F6F0] sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                  <div className="w-[260px] shrink-0 p-3 font-semibold text-sm border-r border-slate-200 sticky left-0 bg-[#F8F6F0] z-30 shadow-[1px_0_0_0_#e2e8f0]">
                    Project / Task {timelineViewMode === 'compare' ? '(P vs A)' : ''}
                  </div>
                  <div className="flex flex-1">
                    {timelineDates.map((date, i) => (
                      <div key={i} className="flex-1 min-w-[60px] p-2 text-center border-r border-slate-200 text-xs">
                        <div className={cn("font-medium", date.getDay() === 0 || date.getDay() === 6 ? "text-red-500 font-bold" : "text-slate-700")}>{format(date, "EEE")}</div>
                        <div className="text-slate-500">{format(date, "dd MMM")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 relative">
                  <div className="absolute inset-0 left-[260px] flex pointer-events-none">
                    {timelineDates.map((_, i) => (
                      <div key={i} className="flex-1 min-w-[60px] border-r border-slate-200 border-dashed"></div>
                    ))}
                  </div>

                  {filteredLots.map(lot => {
                    const lotLogs = getSortedLotLogs(lot.id)
                    const showLot = lotLogs.some(log => {
                      const process = processes.find(p => p.id === log.process_id)
                      let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                      const matchesDept = filterDept === "ALL" || filterDept === pt?.id
                      if (timelineViewMode === 'actual') {
                        return matchesDept && (log.start_time || log.status === 'DONE')
                      }
                      return matchesDept && (log.activity_date || log.start_time)
                    })

                    if (filterDept !== "ALL" && !showLot) return null

                    return (
                      <div key={lot.id} className="group relative z-10">
                        {/* LOT Header Row */}
                        <div className="flex bg-white hover:bg-[#F8F6F0] transition-colors h-[40px] items-center border-b border-slate-100">
                          <div className="w-[260px] shrink-0 p-2 border-r border-slate-200 sticky left-0 bg-inherit z-20 shadow-[1px_0_0_0_#e2e8f0]">
                            <div className="font-medium text-sm line-clamp-2 break-words text-wrap">
                              {lot.products?.sku} <span className="font-normal text-xs text-slate-500 ml-1">({lot.lot_no})</span>
                            </div>
                          </div>
                          <div className="flex flex-1"></div>
                        </div>

                        {/* Individual Task Rows */}
                        {lotLogs.map(log => {
                          const process = processes.find(p => p.id === log.process_id)
                          let pt = PROCESS_TYPES.find(pt => searchMap[pt.id] === process?.process_name)
                          if (!pt) pt = { id: "OTHER", name: process?.process_name || "Unknown", color: "bg-slate-100 text-slate-800 border-slate-200" }

                          if (filterDept !== "ALL" && filterDept !== pt.id) return null

                          const timelineStart = startOfDay(timelineDates[0])
                          const todayStart = startOfDay(new Date())

                          // 1. Calculate Plan Period
                          let planData: any = null
                          if (log.activity_date) {
                            const pStart = startOfDay(new Date(log.activity_date))
                            const pEnd = log.end_date ? startOfDay(new Date(log.end_date)) : pStart
                            const startDiff = differenceInDays(pStart, timelineStart)
                            const duration = differenceInDays(pEnd, pStart) + 1
                            const endDiff = startDiff + duration - 1

                            if (endDiff >= 0 && startDiff < 14) {
                              const actualStartDiff = Math.max(0, startDiff)
                              const actualEndDiff = Math.min(13, endDiff)
                              const actualDuration = actualEndDiff - actualStartDiff + 1
                              planData = {
                                start: pStart,
                                end: pEnd,
                                inView: true,
                                leftPercent: (actualStartDiff / 14) * 100,
                                widthPercent: (actualDuration / 14) * 100,
                                startsBefore: startDiff < 0,
                                endsAfter: endDiff >= 14
                              }
                            }
                          }

                          // 2. Calculate Actual Period
                          let actualData: any = null
                          const actualStartRaw = log.start_time || (log.status === 'DONE' ? (log.activity_date || log.end_time || log.updated_at) : null)
                          if (actualStartRaw) {
                            const aStart = startOfDay(new Date(actualStartRaw))
                            let aEnd = aStart
                            if (log.status === 'DONE') {
                              const actualEndRaw = log.end_time || log.updated_at || actualStartRaw
                              aEnd = startOfDay(new Date(actualEndRaw))
                              if (aEnd < aStart) aEnd = aStart
                            } else if (log.status === 'IN_PROGRESS') {
                              aEnd = todayStart > aStart ? todayStart : aStart
                            }

                            const startDiff = differenceInDays(aStart, timelineStart)
                            const duration = differenceInDays(aEnd, aStart) + 1
                            const endDiff = startDiff + duration - 1

                            if (endDiff >= 0 && startDiff < 14) {
                              const actualStartDiff = Math.max(0, startDiff)
                              const actualEndDiff = Math.min(13, endDiff)
                              const actualDuration = actualEndDiff - actualStartDiff + 1
                              actualData = {
                                start: aStart,
                                end: aEnd,
                                inView: true,
                                leftPercent: (actualStartDiff / 14) * 100,
                                widthPercent: (actualDuration / 14) * 100,
                                startsBefore: startDiff < 0,
                                endsAfter: endDiff >= 14,
                                status: log.status
                              }
                            }
                          }

                          // 3. Calculate Variance
                          let variance = {
                            type: 'WAITING',
                            diffDays: 0,
                            label: 'รอเริ่มตามแผน',
                            colorClass: 'bg-slate-100 text-slate-600 border-slate-200'
                          }

                          if (log.activity_date) {
                            const pEnd = log.end_date ? startOfDay(new Date(log.end_date)) : startOfDay(new Date(log.activity_date))
                            const pStart = startOfDay(new Date(log.activity_date))

                            if (log.status === 'DONE') {
                              const aEnd = log.end_time
                                ? startOfDay(new Date(log.end_time))
                                : (log.updated_at ? startOfDay(new Date(log.updated_at)) : pEnd)
                              const diff = differenceInDays(aEnd, pEnd)

                              if (diff === 0) {
                                variance = { type: 'ON_TIME', diffDays: 0, label: '✅ ตรงแผน', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' }
                              } else if (diff < 0) {
                                variance = { type: 'EARLY', diffDays: diff, label: `⚡ เร็วกว่าแผน ${Math.abs(diff)}d`, colorClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold' }
                              } else {
                                variance = { type: 'DELAYED', diffDays: diff, label: `⚠️ ล่าช้า +${diff}d`, colorClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' }
                              }
                            } else if (log.status === 'IN_PROGRESS') {
                              const overdue = differenceInDays(todayStart, pEnd)
                              if (overdue > 0) {
                                variance = { type: 'OVERDUE_IN_PROGRESS', diffDays: overdue, label: `🚨 เกินกำหนด +${overdue}d`, colorClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold' }
                              } else {
                                variance = { type: 'IN_PROGRESS', diffDays: 0, label: '⏳ กำลังผลิตตามแผน', colorClass: 'bg-amber-100 text-amber-800 border-amber-300 font-medium' }
                              }
                            } else {
                              const overdue = differenceInDays(todayStart, pStart)
                              if (overdue > 0) {
                                variance = { type: 'OVERDUE_START', diffDays: overdue, label: `⏳ เลยวันเริ่ม +${overdue}d`, colorClass: 'bg-amber-100 text-amber-900 border-amber-400 font-bold' }
                              }
                            }
                          }

                          // Filter condition based on viewMode
                          if (timelineViewMode === 'plan' && !planData?.inView) return null
                          if (timelineViewMode === 'actual' && !actualData?.inView) return null
                          if (timelineViewMode === 'compare' && !planData?.inView && !actualData?.inView) return null

                          const isCompare = timelineViewMode === 'compare'

                          return (
                            <div
                              key={log.id}
                              className={cn(
                                "flex bg-white hover:bg-[#F8F6F0] transition-colors items-center border-b border-slate-100",
                                isCompare ? "h-[58px]" : "h-[42px]"
                              )}
                            >
                              {/* Left Task Label Cell */}
                              <div className="w-[260px] shrink-0 py-1 px-3 pl-6 border-r border-slate-200 sticky left-0 bg-inherit z-20 shadow-[1px_0_0_0_#e2e8f0] flex flex-col justify-center">
                                <div className="flex items-center gap-1.5">
                                  <div className={cn("w-2 h-2 rounded-full shrink-0", pt.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))}></div>
                                  <span className="text-xs font-semibold text-slate-800 truncate" title={`${process?.process_name || 'งานผลิต'} (T${log.tank_start || 1}-${log.tank_end || 1})`}>
                                    {process?.process_name || "Unknown"} (T{log.tank_start || 1}-{log.tank_end || 1})
                                  </span>
                                </div>

                                {isCompare && (
                                  <div className="flex items-center gap-1 mt-1 pl-3.5">
                                    <span className={cn("text-[9px] px-1.5 py-0.2 rounded border font-bold shadow-2xs", variance.colorClass)}>
                                      {variance.label}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Right Gantt Chart Area */}
                              <div className="flex flex-1 relative h-full items-center">
                                {/* Mode 1: Plan Only */}
                                {timelineViewMode === 'plan' && planData?.inView && (
                                  <div
                                    className={cn(
                                      "absolute rounded-full flex items-center px-3 py-1 text-xs font-medium overflow-hidden shadow-sm transition-all hover:brightness-95 cursor-pointer z-30",
                                      pt.color
                                    )}
                                    style={{ left: `calc(${planData.leftPercent}% + 4px)`, width: `calc(${planData.widthPercent}% - 8px)` }}
                                    title={`[🅿️ แผนงาน] ${lot.products?.sku || '-'}\nขั้นตอน: ${process?.process_name || '-'}\nช่วงวันตามแผน: ${format(planData.start, 'dd/MM/yyyy')}${planData.end > planData.start ? ` ถึง ${format(planData.end, 'dd/MM/yyyy')}` : ''}`}
                                  >
                                    <span className="truncate">{lot.products?.sku} - {process?.process_name}</span>
                                  </div>
                                )}

                                {/* Mode 2: Actual Only */}
                                {timelineViewMode === 'actual' && actualData?.inView && (
                                  <div
                                    className={cn(
                                      "absolute rounded-full flex items-center px-3 py-1 text-xs font-bold text-white overflow-hidden shadow-sm transition-all hover:brightness-95 cursor-pointer z-30",
                                      log.status === 'DONE' ? "bg-emerald-600" : "bg-amber-600"
                                    )}
                                    style={{ left: `calc(${actualData.leftPercent}% + 4px)`, width: `calc(${actualData.widthPercent}% - 8px)` }}
                                    title={`[🅰️ ทำจริง] ${lot.products?.sku || '-'}\nขั้นตอน: ${process?.process_name || '-'}\nช่วงวันทำจริง: ${format(actualData.start, 'dd/MM/yyyy')}${actualData.end > actualData.start ? ` ถึง ${format(actualData.end, 'dd/MM/yyyy')}` : ''}\nสถานะ: ${log.status === 'DONE' ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ'}`}
                                  >
                                    <span className="truncate">{lot.products?.sku} - {process?.process_name} (จริง)</span>
                                  </div>
                                )}

                                {/* Mode 3: Compare P vs A (Dual-Track Gantt Bars) */}
                                {timelineViewMode === 'compare' && (
                                  <>
                                    {/* Top Track: 🅿️ Plan Bar */}
                                    {planData?.inView && (
                                      <div
                                        className="absolute rounded px-2 flex items-center font-bold text-[9.5px] border border-dashed border-indigo-400 bg-indigo-50/90 text-indigo-900 shadow-2xs overflow-hidden z-20"
                                        style={{
                                          top: '5px',
                                          height: '22px',
                                          left: `calc(${planData.leftPercent}% + 4px)`,
                                          width: `calc(${planData.widthPercent}% - 8px)`
                                        }}
                                        title={`[🅿️ แผนงาน (Plan)]\nขั้นตอน: ${process?.process_name || '-'}\nช่วงตามแผน: ${format(planData.start, 'dd/MM/yyyy')}${planData.end > planData.start ? ` ถึง ${format(planData.end, 'dd/MM/yyyy')}` : ''}`}
                                      >
                                        <span className="truncate">🅿️ แผน: {format(planData.start, 'dd/MM')}{planData.end > planData.start ? `-${format(planData.end, 'dd/MM')}` : ''}</span>
                                      </div>
                                    )}

                                    {/* Bottom Track: 🅰️ Actual Bar */}
                                    {actualData?.inView ? (
                                      <div
                                        className={cn(
                                          "absolute rounded px-2 flex items-center font-bold text-[9.5px] text-white shadow-xs overflow-hidden z-30",
                                          variance.type === 'ON_TIME' && "bg-emerald-600 border border-emerald-700",
                                          variance.type === 'DELAYED' && "bg-rose-600 border border-rose-700",
                                          variance.type === 'EARLY' && "bg-blue-600 border border-blue-700",
                                          variance.type === 'OVERDUE_IN_PROGRESS' && "bg-rose-700 border border-rose-800 animate-pulse",
                                          variance.type === 'IN_PROGRESS' && "bg-amber-600 border border-amber-700",
                                          variance.type === 'OVERDUE_START' && "bg-amber-500 border border-amber-600",
                                          variance.type === 'WAITING' && "bg-slate-400 border border-slate-500"
                                        )}
                                        style={{
                                          top: '30px',
                                          height: '22px',
                                          left: `calc(${actualData.leftPercent}% + 4px)`,
                                          width: `calc(${actualData.widthPercent}% - 8px)`
                                        }}
                                        title={`[🅰️ ทำจริง (Actual)]\nขั้นตอน: ${process?.process_name || '-'}\nช่วงทำจริง: ${format(actualData.start, 'dd/MM/yyyy')}${actualData.end > actualData.start ? ` ถึง ${format(actualData.end, 'dd/MM/yyyy')}` : ''}\nสถานะ: ${variance.label}`}
                                      >
                                        <span className="truncate">
                                          🅰️ จริง: {format(actualData.start, 'dd/MM')}{actualData.end > actualData.start ? `-${format(actualData.end, 'dd/MM')}` : ''}
                                        </span>
                                      </div>
                                    ) : (
                                      planData?.inView && (
                                        <div
                                          className="absolute rounded px-2 flex items-center font-medium text-[9px] border border-dashed border-slate-300 bg-slate-50 text-slate-400 overflow-hidden z-10"
                                          style={{
                                            top: '30px',
                                            height: '22px',
                                            left: `calc(${planData.leftPercent}% + 4px)`,
                                            width: `calc(${planData.widthPercent}% - 8px)`
                                          }}
                                        >
                                          <span className="truncate">⏳ ยังไม่บันทึกเริ่มงาน</span>
                                        </div>
                                      )
                                    )}
                                  </>
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
          </>
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
                     <TableHead className="w-[170px] font-bold text-slate-700">วันเวลา</TableHead>
                     <TableHead className="w-[200px] font-bold text-slate-700">ผู้ดำเนินการ (Username)</TableHead>
                     <TableHead className="w-[140px] font-bold text-slate-700">ประเภท</TableHead>
                     <TableHead className="w-[260px] font-bold text-slate-700">Project (PO/SKU)</TableHead>
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
                           placeholder="ค้นหา username..."
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
                           <SelectItem value="ส่งต่องาน (Auto)" className="text-xs">ส่งต่องาน (Auto)</SelectItem>
                           <SelectItem value="ปรับเลื่อนแผน" className="text-xs">ปรับเลื่อนแผน</SelectItem>
                           <SelectItem value="เพิ่มออเดอร์" className="text-xs">เพิ่มออเดอร์</SelectItem>
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
                           <TableCell className="text-slate-600 font-mono text-xs">
                             <div className="font-semibold text-slate-700">{format(new Date(item.timestamp), 'dd MMM yyyy')}</div>
                             <span className="text-[11px] text-slate-400">{format(new Date(item.timestamp), 'HH:mm:ss')}</span>
                           </TableCell>
                           <TableCell>
                             <div className="flex items-center justify-between group/user max-w-[200px]">
                               <div className="flex items-center gap-2 overflow-hidden" title={item.userFullName ? `${item.user} (${item.userFullName})` : item.user}>
                                 <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center text-xs font-bold shrink-0">
                                   {item.user.charAt(0)}
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                   <span className="text-xs font-bold text-slate-800 truncate">{item.user}</span>
                                   {item.userFullName && (
                                     <span className="text-[10px] text-slate-400 truncate">{item.userFullName}</span>
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
                           <TableCell>
                             <span className={cn(
                               "px-2.5 py-1 rounded-full text-xs font-medium inline-block",
                               item.type === 'เพิ่มออเดอร์' && "bg-blue-100 text-blue-800 border border-blue-200",
                               item.type === 'ลงคิวงาน' && "bg-emerald-100 text-emerald-800 border border-emerald-200",
                               item.type === 'ส่งต่องาน (Auto)' && "bg-sky-100 text-sky-800 border border-sky-200",
                               item.type === 'ปรับเลื่อนแผน' && "bg-amber-100 text-amber-900 border border-amber-300",
                               item.type === 'ปิดงาน' && "bg-purple-100 text-purple-800 border border-purple-200"
                             )}>
                               {item.type}
                             </span>
                           </TableCell>
                           <TableCell className="font-semibold text-slate-800 text-xs">{item.project}</TableCell>
                           <TableCell className="text-slate-600 text-xs leading-relaxed">{item.details}</TableCell>
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
                  <div className="text-[11px] text-emerald-800 font-medium mb-1">🎯 กำหนดวันใหม่ (Revised)</div>
                  <div className="text-sm font-bold text-emerald-700">
                    {rescheduleModal.newDate ? format(new Date(rescheduleModal.newDate), 'dd/MM/yyyy') : '-'}
                  </div>
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
                  รายละเอียดเพิ่มเติม / หมายเหตุของฝ่ายวางแผน
                </Label>
                <Textarea 
                  placeholder="เช่น BEC ขอเลื่อนส่ง Glycerin เป็น 21/09 หรือ หน้างานรอผล Micro Lab ก่อนบรรจุ"
                  value={rescheduleModal.reason}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
                  className="text-xs min-h-[70px] resize-none bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-xs text-slate-500 hover:text-slate-700 w-full sm:w-auto"
              onClick={handleQuickRescheduleWithoutReason}
            >
              ปรับวันโดยไม่บันทึกสาเหตุ
            </Button>
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
