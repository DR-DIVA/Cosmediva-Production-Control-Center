'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Layers,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  BarChart3,
  Award,
  Sparkles,
  ChevronRight,
  Filter,
  ShieldCheck,
  AlertOctagon,
  ArrowUpRight,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DELAY_CATEGORIES,
  getCategoryLabel,
  parseDelayInfo,
  formatDelayRemark,
  calculateSupplierOtifMetrics,
  DelayInfo,
  SupplierScorecard
} from '@/lib/delayTracking'

export default function PurchasePage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'delayed' | 'scorecard' | 'analytics' | 'all_po'>('delayed')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RM' | 'PM'>('ALL')
  
  // Delay Reason Modal State
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [revisedEta, setRevisedEta] = useState('')
  const [delayCategory, setDelayCategory] = useState('SUPPLIER_PROD')
  const [delayReason, setDelayReason] = useState('')
  const [actionPlan, setActionPlan] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState('จัดซื้อ (Purchasing)')

  // Fetch Current User
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        const email = data.user.email
        setCurrentUser(email.endsWith('@cosmediva.local') ? email.split('@')[0] : email)
      }
    })
  }, [])

  // Fetch RM & PM Inbound items
  const fetchPurchaseData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('production_lot_rms')
        .select(`
          id,
          po_no,
          supplier,
          po_date,
          eta_date,
          rm_code,
          rm_name,
          warehouse,
          quantity,
          unit,
          lot_product,
          pr_no,
          status,
          receive_date,
          qc_status,
          bottom_remark,
          top_remark,
          created_at,
          production_lots (
            lot_no,
            sku_id,
            products (sku, product_name)
          )
        `)
        .order('eta_date', { ascending: true })

      if (error) {
        console.error('Error fetching purchase items:', error)
        toast.error('โหลดข้อมูลใบสั่งซื้อไม่สำเร็จ')
      } else {
        setItems(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchaseData()
  }, [])

  // Check if item is PM
  const isPM = (code: string) => code?.startsWith('CMD1') || code?.startsWith('CMD2')

  // Calculate Metrics
  const metrics = useMemo(() => {
    return calculateSupplierOtifMetrics(items)
  }, [items])

  // Filtered Items for List
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const itemIsPM = isPM(item.rm_code)
      if (typeFilter === 'RM' && itemIsPM) return false
      if (typeFilter === 'PM' && !itemIsPM) return false

      if (selectedSupplier !== 'ALL' && item.supplier !== selectedSupplier) return false

      const delayInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
      if (selectedCategoryFilter !== 'ALL' && delayInfo.category !== selectedCategoryFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const po = (item.po_no || '').toLowerCase()
        const code = (item.rm_code || '').toLowerCase()
        const name = (item.rm_name || '').toLowerCase()
        const supp = (item.supplier || '').toLowerCase()
        const lot = (item.production_lots?.lot_no || '').toLowerCase()
        const sku = (item.production_lots?.products?.sku || '').toLowerCase()
        return po.includes(q) || code.includes(q) || name.includes(q) || supp.includes(q) || lot.includes(q) || sku.includes(q)
      }

      return true
    })
  }, [items, typeFilter, selectedSupplier, selectedCategoryFilter, searchQuery])

  // Delayed / Action Required Items
  const delayedItems = useMemo(() => {
    return filteredItems.filter(item => {
      const delayInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
      return delayInfo.isDelayed || item.status === 'DELAYED'
    })
  }, [filteredItems])

  // Open Delay Modal
  const handleOpenDelayModal = (item: any) => {
    setSelectedItem(item)
    const existing = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
    setRevisedEta(existing.revisedEta || item.eta_date || '')
    setDelayCategory(existing.category || 'SUPPLIER_PROD')
    setDelayReason(existing.reason || '')
    setActionPlan(existing.actionPlan || '')
    setIsDelayModalOpen(true)
  }

  // Save Delay Reason & Revised ETA
  const handleSaveDelayReason = async () => {
    if (!selectedItem) return
    if (!revisedEta) {
      toast.error('กรุณาระบุกำหนดส่งมอบใหม่ (Revised ETA)')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('กำลังบันทึกสาเหตุการเลื่อนส่ง...')

    try {
      const originalCommittedEta = selectedItem.eta_date || ''
      const updatedRemark = formatDelayRemark(selectedItem.bottom_remark, {
        originalEta: originalCommittedEta,
        revisedEta: revisedEta,
        category: delayCategory,
        reason: delayReason.trim(),
        actionPlan: actionPlan.trim(),
        updatedBy: currentUser
      })

      // Update in Supabase
      const { error } = await supabase
        .from('production_lot_rms')
        .update({
          eta_date: revisedEta, // Move ETA in radar
          bottom_remark: updatedRemark,
          status: 'DELAYED'
        })
        .eq('id', selectedItem.id)

      if (error) {
        throw error
      }

      toast.success('บันทึกสาเหตุและอัปเดตกำหนดส่งใหม่เรียบร้อยแล้ว', { id: toastId })
      setIsDelayModalOpen(false)
      fetchPurchaseData()
    } catch (err: any) {
      console.error(err)
      toast.error('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถบันทึกได้'), { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Export CSV
  const exportToCSV = () => {
    const headers = ['PO No', 'Supplier', 'PO Date', 'Committed ETA', 'Code', 'Name', 'Warehouse', 'Qty', 'Unit', 'Status', 'Is Delayed', 'Delay Category', 'Delay Reason', 'Action Plan']
    const rows = filteredItems.map(i => {
      const dInfo = parseDelayInfo(i.bottom_remark, i.eta_date, i.receive_date, i.status)
      return [
        i.po_no,
        i.supplier,
        i.po_date,
        i.eta_date,
        i.rm_code,
        `"${(i.rm_name || '').replace(/"/g, '""')}"`,
        i.warehouse,
        i.quantity,
        i.unit,
        i.status,
        dInfo.isDelayed ? 'YES' : 'NO',
        `"${dInfo.categoryLabel || ''}"`,
        `"${(dInfo.reason || '').replace(/"/g, '""')}"`,
        `"${(dInfo.actionPlan || '').replace(/"/g, '""')}"`
      ]
    })
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `CosmeFlow_Purchase_OTIF_Report_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0 font-sans text-[#4A4238]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <ShoppingCart className="w-8 h-8 text-yellow-500 shrink-0" />
            <span>CosmeFlow Purchase & Supplier OTIF</span>
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300/80 px-2.5 py-1 rounded-full font-bold">
              ศูนย์จัดซื้อ & ติดตามการส่งมอบ
            </span>
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
            <div>ระบบติดตามใบสั่งซื้อ (PO), ระบุสาเหตุของเข้าล่าช้า, และวัด KPI อัตราการส่งมอบตรงเวลา (OTIF)</div>
            <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              On-Time In-Full Supply Chain • From Request to Receipt.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={fetchPurchaseData} variant="outline" size="sm" className="flex items-center gap-1.5 bg-[#F8F6F0] hover:bg-slate-100">
            <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="bg-white">
            <Download className="w-4 h-4 mr-2" /> Export OTIF
          </Button>
        </div>
      </div>

      {/* 1. Executive Procurement & Supplier OTIF KPI Summary Bar */}
      <div className="bg-gradient-to-r from-[#2D2721] via-[#3E352B] to-[#2D2721] text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-[#D4AF37]/30 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sm:gap-5 w-full">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 shrink-0">
            <Award className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Supplier Performance & Inbound Intelligence
            </div>
            <div className="text-base sm:text-lg md:text-xl font-black text-white mt-0.5 flex items-center gap-2">
              <span>Executive Procurement KPI</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${metrics.overallGrade.gradeColor}`}>
                เกรด {metrics.overallGrade.grade}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-stone-300 mt-0.5">
              อัตราการส่งมอบตรงเวลาครบถ้วน (OTIF) • การบริหารจัดการคู่ค้า • และความพร้อมของวัตถุดิบ
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full xl:w-auto">
          {/* Overall Supplier OTIF */}
          <div className="bg-emerald-500/15 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-emerald-400/30 text-center">
            <div className="text-[10px] sm:text-[11px] text-emerald-200 font-medium">Supplier OTIF รวม</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {metrics.overallOtifPct}%
            </div>
            <div className="text-[9px] sm:text-[10px] text-emerald-300 mt-0.5">({metrics.totalOnTime}/{metrics.totalItems} รายการตรงเวลา)</div>
          </div>

          {/* Delayed / Action Required */}
          <div className="bg-rose-500/20 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-rose-400/30 text-center">
            <div className="text-[10px] sm:text-[11px] text-rose-200 font-medium">ของเข้าล่าช้า / เลื่อนส่ง</div>
            <div className="text-xl sm:text-2xl font-black text-rose-400">
              {metrics.totalDelayed} <span className="text-xs font-normal text-rose-200">รายการ</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-rose-300 mt-0.5">(ต้องระบุสาเหตุ & ติดตาม)</div>
          </div>

          {/* Total Inbound POs */}
          <div className="bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[10px] sm:text-[11px] text-stone-300 font-medium">รายการ PO ทั้งหมด</div>
            <div className="text-xl sm:text-2xl font-black text-[#D4AF37] tracking-tight">
              {metrics.totalItems} <span className="text-xs font-normal text-stone-300">รายการ</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">({items.filter(i => !isPM(i.rm_code)).length} RM / {items.filter(i => isPM(i.rm_code)).length} PM)</div>
          </div>

          {/* Active Suppliers */}
          <div className="bg-indigo-500/20 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl border border-indigo-400/30 text-center">
            <div className="text-[10px] sm:text-[11px] text-indigo-200 font-medium">คู่ค้าที่ส่งของ (Suppliers)</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300">
              {metrics.supplierList.length} <span className="text-xs font-normal text-indigo-200">เจ้า</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-indigo-300 mt-0.5">(ประเมินผลต่อเนื่อง)</div>
          </div>
        </div>
      </div>

      {/* 2. Four Interactive Procurement Dimension Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Delayed POs */}
        <Card 
          onClick={() => setActiveTab('delayed')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeTab === 'delayed' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40' : 'border-slate-200 hover:border-rose-400 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold shadow-xs">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">1. ติดตามของเข้าล่าช้า</div>
                  <div className="text-[11px] text-slate-500">Delayed & Action Center</div>
                </div>
              </div>
              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                {metrics.totalDelayed} รายการ
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-rose-700">{metrics.totalDelayed}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">รายการต้องบันทึกเหตุผล</span>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${metrics.totalItems > 0 ? (metrics.totalDelayed / metrics.totalItems) * 100 : 0}%` }} className="bg-rose-500 h-full" />
            </div>

            <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>ระบุสาเหตุ & วันส่งใหม่</span>
              <span className="font-bold text-rose-700">คลิกเพื่อจัดการ ➔</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Supplier Scorecard */}
        <Card 
          onClick={() => setActiveTab('scorecard')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeTab === 'scorecard' ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20 bg-[#F8F6F0]' : 'border-slate-200 hover:border-[#D4AF37]/50 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#8B7355] flex items-center justify-center font-bold shadow-xs">
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">2. ประเมินเกรดคู่ค้า</div>
                  <div className="text-[11px] text-slate-500">Supplier OTIF Scorecard</div>
                </div>
              </div>
              <Badge className="bg-[#D4AF37]/20 text-[#8B7355] border-[#D4AF37]/30 text-[10px] font-bold">
                {metrics.supplierList.length} เจ้า
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-[#4A4238]">{metrics.overallOtifPct}%</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">คะแนนรวมเฉลี่ย</span>
              </div>
              <Badge className={`text-[10px] font-bold ${metrics.overallGrade.gradeColor}`}>
                เกรด {metrics.overallGrade.grade}
              </Badge>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${metrics.overallOtifPct}%` }} className="bg-emerald-500 h-full" />
            </div>

            <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>จัดอันดับความตรงเวลา</span>
              <span className="font-bold text-[#8B7355]">ดูรายงาน ➔</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Root Cause Analytics */}
        <Card 
          onClick={() => setActiveTab('analytics')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeTab === 'analytics' ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40' : 'border-slate-200 hover:border-indigo-400 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-xs">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">3. วิเคราะห์สาเหตุของช้า</div>
                  <div className="text-[11px] text-slate-500">Root Cause Analytics</div>
                </div>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] font-bold">
                {Object.keys(metrics.categoryCounts).length} หมวดสาเหตุ
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-indigo-700">{metrics.totalDelayed}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">เคสเลื่อนส่ง</span>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: '100%' }} className="bg-indigo-500 h-full" />
            </div>

            <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>สัดส่วนและแนวทางแก้ไข</span>
              <span className="font-bold text-indigo-700">ดูสถิติ ➔</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: All POs */}
        <Card 
          onClick={() => setActiveTab('all_po')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeTab === 'all_po' ? 'border-slate-800 ring-2 ring-slate-800/20 bg-slate-100/60' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">4. ทะเบียน PO ทั้งหมด</div>
                  <div className="text-[11px] text-slate-500">Master Inbound Registry</div>
                </div>
              </div>
              <Badge className="bg-slate-200 text-slate-700 text-[10px] font-bold">
                {metrics.totalItems} POs
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-slate-800">{metrics.totalItems}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">รายการใบสั่งซื้อ</span>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: '100%' }} className="bg-slate-700 h-full" />
            </div>

            <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-slate-100">
              <span>ค้นหาและตรวจสอบสถานะ</span>
              <span className="font-bold text-slate-700">ดูทั้งหมด ➔</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Workspace Tabs & Tables */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        {/* Filter Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Tab Pills */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('delayed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'delayed' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                ของเข้าล่าช้า ({metrics.totalDelayed})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scorecard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'scorecard' ? 'bg-[#D4AF37] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                เกรดคู่ค้า (Scorecard)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                วิเคราะห์สาเหตุ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all_po')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'all_po' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                ทะเบียน PO ({filteredItems.length})
              </button>
            </div>

            {/* RM / PM Type Filter */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${typeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'}`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('RM')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${typeFilter === 'RM' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'}`}
              >
                วัตถุดิบ (RM)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('PM')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${typeFilter === 'PM' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'}`}
              >
                บรรจุภัณฑ์ (PM)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Supplier Filter Dropdown */}
            <Select value={selectedSupplier} onValueChange={(val) => setSelectedSupplier(val || 'ALL')}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs bg-white">
                <SelectValue placeholder="เลือก Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">🏢 ทุก Supplier</SelectItem>
                {metrics.supplierList.map(s => (
                  <SelectItem key={s.supplier} value={s.supplier}>
                    {s.supplier} ({s.totalCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="ค้นหา PO, Code, ชื่อสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Delayed POs Action Center */}
        {activeTab === 'delayed' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <div className="flex items-center gap-2 text-xs text-rose-800 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  พบ <strong>{delayedItems.length} รายการ</strong> ที่เลยกำหนดส่งมอบ หรือมีการแจ้งเลื่อนส่งจากซัพพลายเออร์ กรุณาระบุสาเหตุและวันส่งใหม่เพื่อให้ฝ่ายวางแผนและฝ่ายผลิตรับทราบ
                </span>
              </div>
            </div>

            {delayedItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-sm text-slate-700">ไม่มีรายการของเข้าล่าช้าในขณะนี้</div>
                <div className="text-xs text-slate-500">ซัพพลายเออร์ทุกเจ้าส่งมอบตรงตามกำหนดเวลา 100%</div>
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold">เลขที่ PO</th>
                      <th className="p-3 font-bold">รหัส / รายการสินค้า</th>
                      <th className="p-3 font-bold">ซัพพลายเออร์</th>
                      <th className="p-3 font-bold text-center">กำหนดส่งเดิม (Committed)</th>
                      <th className="p-3 font-bold text-center">กำหนดส่งใหม่ (Revised)</th>
                      <th className="p-3 font-bold">สาเหตุการเลื่อนส่ง (Root Cause)</th>
                      <th className="p-3 font-bold">แนวทางแก้ไข (Action Plan)</th>
                      <th className="p-3 font-bold text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {delayedItems.map((item, idx) => {
                      const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
                      const itemIsPM = isPM(item.rm_code)

                      return (
                        <tr key={item.id || idx} className="hover:bg-rose-50/30 transition">
                          <td className="p-3 font-bold text-[#4A4238]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                                {item.po_no}
                              </span>
                              <Badge variant="outline" className={`text-[9px] ${itemIsPM ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                {itemIsPM ? 'PM' : 'RM'}
                              </Badge>
                            </div>
                            {item.production_lots && (
                              <div className="text-[10px] text-slate-500 font-normal mt-1">
                                LOT: {item.production_lots.lot_no} ({item.production_lots.products?.sku})
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-[#4A4238]">{item.rm_code}</div>
                            <div className="text-[11px] text-slate-600 line-clamp-1">{item.rm_name}</div>
                            <div className="text-[10px] text-slate-500">จำนวน: {Number(item.quantity).toLocaleString()} {item.unit}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-700">
                            {item.supplier || '-'}
                          </td>
                          <td className="p-3 text-center text-slate-500 font-mono">
                            {dInfo.originalEta || item.eta_date || '-'}
                          </td>
                          <td className="p-3 text-center">
                            {dInfo.revisedEta ? (
                              <span className="font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md border border-rose-200 font-mono">
                                {dInfo.revisedEta}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                เลยกำหนด (ยังไม่อัปเดต)
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {dInfo.categoryLabel ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px]">
                                  {dInfo.categoryLabel}
                                </Badge>
                                {dInfo.reason && <div className="text-[11px] text-slate-600">{dInfo.reason}</div>}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ยังไม่ระบุสาเหตุ</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            {dInfo.actionPlan ? (
                              <span className="text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                {dInfo.actionPlan}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleOpenDelayModal(item)}
                              className="bg-[#D4AF37] hover:bg-[#B8962A] text-white text-xs font-bold shadow-xs h-8"
                            >
                              ✏️ บันทึกสาเหตุ & เลื่อน ETA
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Supplier OTIF Scorecard */}
        {activeTab === 'scorecard' && (
          <div className="p-4 space-y-4">
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <strong>ตารางประเมินเกรดคู่ค้า (Supplier OTIF Scorecard):</strong> คำนวณจากเปอร์เซ็นต์การส่งมอบตรงเวลาครบถ้วน เพื่อจัดอันดับคุณภาพซัพพลายเออร์และใช้ต่อรองราคา
              </div>
              <div className="flex gap-2 text-[10px] font-bold shrink-0">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">เกรด A: ≥95%</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-300">เกรด B: 85-94%</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">เกรด C: 70-84%</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">เกรด D: &lt;70%</span>
              </div>
            </div>

            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">อันดับ</th>
                    <th className="p-3 font-bold">ชื่อซัพพลายเออร์ (Supplier)</th>
                    <th className="p-3 font-bold text-center">เกรดการประเมิน</th>
                    <th className="p-3 font-bold text-center">อัตราส่งตรงเวลา (OTIF %)</th>
                    <th className="p-3 font-bold text-center">ส่งตรงเวลา</th>
                    <th className="p-3 font-bold text-center">เลื่อนส่ง / ช้า</th>
                    <th className="p-3 font-bold text-center">จำนวน PO ทั้งหมด</th>
                    <th className="p-3 font-bold">สาเหตุหลักที่พบบ่อย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.supplierList.map((sup, idx) => {
                    const topCategory = Object.keys(sup.categories).sort((a, b) => sup.categories[b] - sup.categories[a])[0]

                    return (
                      <tr key={sup.supplier} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-400 text-center">
                          #{idx + 1}
                        </td>
                        <td className="p-3 font-bold text-[#4A4238]">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#D4AF37]" />
                            <span>{sup.supplier}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-black border ${sup.gradeColor}`}>
                            เกรด {sup.grade}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="font-black text-sm text-[#4A4238]">{sup.otifPct}%</div>
                          <div className="w-24 mx-auto h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                            <div
                              style={{ width: `${sup.otifPct}%` }}
                              className={`h-full ${sup.otifPct >= 85 ? 'bg-emerald-500' : sup.otifPct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-center text-emerald-700 font-bold">
                          {sup.onTimeCount} รายการ
                        </td>
                        <td className="p-3 text-center text-rose-700 font-bold">
                          {sup.delayedCount} รายการ
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {sup.totalCount} รายการ
                        </td>
                        <td className="p-3">
                          {topCategory ? (
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                              {getCategoryLabel(topCategory)} ({sup.categories[topCategory]} ครั้ง)
                            </Badge>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-[11px]">✨ ส่งตรงเวลาทุกครั้ง</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Root Cause Analytics */}
        {activeTab === 'analytics' && (
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Breakdown Card */}
              <Card className="border-slate-200">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-[#4A4238] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    สัดส่วนสาเหตุของเข้าล่าช้า (Root Cause Breakdown)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    วิเคราะห์ปัจจัยต้นตอที่ทำให้เกิดความล่าช้า
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {DELAY_CATEGORIES.map(cat => {
                    const count = metrics.categoryCounts[cat.id] || 0
                    const pct = metrics.totalDelayed > 0 ? ((count / metrics.totalDelayed) * 100).toFixed(1) : '0'

                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700">{cat.label}</span>
                          <span className="font-bold text-slate-900">{count} เคส ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* RM vs PM Comparison Card */}
              <Card className="border-slate-200">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-[#4A4238] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    เปรียบเทียบความเสี่ยง: วัตถุดิบ (RM) vs บรรจุภัณฑ์ (PM)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    อัตราความล่าช้าแยกตามประเภทสายส่ง
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                  {(() => {
                    const rmItems = items.filter(i => !isPM(i.rm_code))
                    const pmItems = items.filter(i => isPM(i.rm_code))
                    const rmMetrics = calculateSupplierOtifMetrics(rmItems)
                    const pmMetrics = calculateSupplierOtifMetrics(pmItems)

                    return (
                      <div className="space-y-4">
                        {/* RM Box */}
                        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                              <Package className="w-4 h-4 text-amber-700" />
                              วัตถุดิบเคมี & สารสกัด (Raw Materials - RM)
                            </div>
                            <Badge className={`text-[10px] ${rmMetrics.overallGrade.gradeColor}`}>
                              OTIF {rmMetrics.overallOtifPct}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                            <div className="p-2 bg-white rounded-lg border border-amber-100">
                              <div className="text-[10px] text-slate-500">PO ทั้งหมด</div>
                              <div className="font-bold text-slate-800">{rmMetrics.totalItems}</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-amber-100">
                              <div className="text-[10px] text-emerald-600">ตรงเวลา</div>
                              <div className="font-bold text-emerald-700">{rmMetrics.totalOnTime}</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-amber-100">
                              <div className="text-[10px] text-rose-600">เลื่อนส่ง</div>
                              <div className="font-bold text-rose-700">{rmMetrics.totalDelayed}</div>
                            </div>
                          </div>
                        </div>

                        {/* PM Box */}
                        <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-indigo-700" />
                              บรรจุภัณฑ์ & กล่องฉลาก (Packaging - PM)
                            </div>
                            <Badge className={`text-[10px] ${pmMetrics.overallGrade.gradeColor}`}>
                              OTIF {pmMetrics.overallOtifPct}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                            <div className="p-2 bg-white rounded-lg border border-indigo-100">
                              <div className="text-[10px] text-slate-500">PO ทั้งหมด</div>
                              <div className="font-bold text-slate-800">{pmMetrics.totalItems}</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-indigo-100">
                              <div className="text-[10px] text-emerald-600">ตรงเวลา</div>
                              <div className="font-bold text-emerald-700">{pmMetrics.totalOnTime}</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-indigo-100">
                              <div className="text-[10px] text-rose-600">เลื่อนส่ง</div>
                              <div className="font-bold text-rose-700">{pmMetrics.totalDelayed}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 4: All POs Master Registry */}
        {activeTab === 'all_po' && (
          <div className="p-4 space-y-4">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">เลขที่ PO</th>
                    <th className="p-3 font-bold">รหัส / รายการสินค้า</th>
                    <th className="p-3 font-bold">ซัพพลายเออร์</th>
                    <th className="p-3 font-bold text-center">วันที่ออก PO</th>
                    <th className="p-3 font-bold text-center">กำหนดส่ง (ETA)</th>
                    <th className="p-3 font-bold text-center">สถานะรับเข้า</th>
                    <th className="p-3 font-bold">หมายเหตุ / การเลื่อนส่ง</th>
                    <th className="p-3 font-bold text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item, idx) => {
                    const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
                    const itemIsPM = isPM(item.rm_code)

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-[#4A4238]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                              {item.po_no}
                            </span>
                            <Badge variant="outline" className={`text-[9px] ${itemIsPM ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                              {itemIsPM ? 'PM' : 'RM'}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-[#4A4238]">{item.rm_code}</div>
                          <div className="text-[11px] text-slate-600 line-clamp-1">{item.rm_name}</div>
                          <div className="text-[10px] text-slate-500">จำนวน: {Number(item.quantity).toLocaleString()} {item.unit}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {item.supplier || '-'}
                        </td>
                        <td className="p-3 text-center text-slate-500 font-mono">
                          {item.po_date || '-'}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={dInfo.isDelayed ? 'text-rose-700 font-bold' : 'text-slate-700 font-semibold'}>
                            {item.eta_date || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.status === 'RECEIVED' || item.status === 'READY' || item.status === 'QC_PASS' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                              รับของแล้ว
                            </Badge>
                          ) : dInfo.isDelayed ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                              เลื่อนส่ง / ล่าช้า
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 text-[10px]">
                              รอรับเข้า
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate">
                          {dInfo.categoryLabel ? (
                            <span className="text-amber-800 font-medium">[{dInfo.categoryLabel}] {dInfo.reason}</span>
                          ) : (
                            item.bottom_remark || '-'
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDelayModal(item)}
                            className="text-xs h-7 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                          >
                            ✏️ บันทึกเหตุผล
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Delay Reason Modal Dialog */}
      <Dialog open={isDelayModalOpen} onOpenChange={setIsDelayModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white rounded-2xl border border-[#D4AF37]/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#4A4238]">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              บันทึกสาเหตุของเข้าล่าช้า & กำหนดส่งมอบใหม่
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              ข้อมูลนี้จะถูกบันทึกเพื่อประเมิน KPI ซัพพลายเออร์ และแจ้งเตือนฝ่ายผลิต/ฝ่ายวางแผนทันที
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2 text-xs">
              {/* Item Info Card */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                    PO: {selectedItem.po_no}
                  </span>
                  <span className="text-slate-500 font-medium">Supplier: <strong>{selectedItem.supplier || '-'}</strong></span>
                </div>
                <div className="font-bold text-slate-800 text-sm">{selectedItem.rm_code}</div>
                <div className="text-slate-600">{selectedItem.rm_name}</div>
                <div className="text-slate-500">จำนวนสั่งซื้อ: <strong>{Number(selectedItem.quantity).toLocaleString()} {selectedItem.unit}</strong></div>
              </div>

              {/* Date Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">กำหนดส่งเดิม (Original ETA):</Label>
                  <Input
                    value={selectedItem.eta_date || '-'}
                    disabled
                    className="bg-slate-100 text-slate-500 font-mono text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-rose-700">กำหนดส่งใหม่ (Revised ETA): *</Label>
                  <Input
                    type="date"
                    value={revisedEta}
                    onChange={(e) => setRevisedEta(e.target.value)}
                    className="border-rose-300 focus:border-rose-500 text-xs font-mono font-bold text-rose-900 mt-1"
                  />
                </div>
              </div>

              {/* Root Cause Category */}
              <div>
                <Label className="text-xs font-bold text-[#4A4238]">หมวดหมู่สาเหตุ (Root Cause Category): *</Label>
                <Select value={delayCategory} onValueChange={(val) => setDelayCategory(val || 'SUPPLIER_PROD')}>
                  <SelectTrigger className="w-full text-xs mt-1 bg-white">
                    <SelectValue placeholder="เลือกหมวดหมู่สาเหตุ" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Detailed Reason */}
              <div>
                <Label className="text-xs font-bold text-[#4A4238]">รายละเอียดสาเหตุ / หมายเหตุจาก Supplier:</Label>
                <Textarea
                  rows={2}
                  placeholder="เช่น ซัพพลายเออร์แจ้งว่าเครื่องจักรขัดข้อง หรือ ติดพิธีการศุลกากรด่านท่าเรือ..."
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="text-xs mt-1 bg-white"
                />
              </div>

              {/* Action Plan */}
              <div>
                <Label className="text-xs font-bold text-emerald-800">แนวทางแก้ไข / แผนการรองรับ (Action Plan):</Label>
                <Input
                  placeholder="เช่น ซัพพลายเออร์จะส่งรอบแรก 50% วันที่ 26 ส.ค. ก่อน..."
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  className="text-xs mt-1 bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDelayModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleSaveDelayReason}
              disabled={isSubmitting}
              className="bg-[#D4AF37] hover:bg-[#B8962A] text-white text-xs font-bold"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสาเหตุ & อัปเดต ETA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
