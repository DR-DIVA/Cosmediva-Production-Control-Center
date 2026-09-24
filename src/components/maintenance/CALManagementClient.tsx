'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Calendar, 
  Download, 
  SlidersHorizontal, 
  CheckCircle2, 
  FileText, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  Info,
  Building2,
  X,
  Gauge,
  Sparkles
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { CalibrationItem, CALIBRATION_ITEMS } from '@/lib/calibrationData'
import { Button } from '@/components/ui/button'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const CURRENT_MONTH = 'SEP'

interface CALManagementClientProps {
  initialItems?: CalibrationItem[]
}

export default function CALManagementClient({ initialItems }: CALManagementClientProps) {
  // Load saved modifications from localStorage if available
  const [items, setItems] = useState<CalibrationItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cosmeflow_cal_items_v1')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch (e) {}
    }
    return initialItems && initialItems.length > 0 ? initialItems : CALIBRATION_ITEMS
  })

  const [activeTab, setActiveTab] = useState<'list' | 'matrix' | 'dcc'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [selectedType, setSelectedType] = useState('ALL')
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<CalibrationItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [editingMonth, setEditingMonth] = useState<string>('')

  // Unique departments from items
  const departments = useMemo(() => {
    const set = new Set<string>()
    items.forEach(it => {
      if (it.owner) set.add(it.owner)
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [items])

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      // Dept filter
      if (selectedDept !== 'ALL' && it.owner !== selectedDept) return false
      // Month filter
      if (selectedMonth !== 'ALL' && it.scheduled_month !== selectedMonth) return false
      // Type filter
      if (selectedType !== 'ALL' && it.cal_type !== selectedType) return false
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const id = it.equipment_id.toLowerCase()
        const name = it.equipment_name.toLowerCase()
        const brand = (it.brand || '').toLowerCase()
        const model = (it.model || '').toLowerCase()
        const serial = (it.serial_number || '').toLowerCase()
        const owner = (it.owner || '').toLowerCase()
        if (!id.includes(q) && !name.includes(q) && !brand.includes(q) && !model.includes(q) && !serial.includes(q) && !owner.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [items, selectedDept, selectedMonth, selectedType, searchQuery])

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length
    const pk = items.filter(it => it.owner === 'PK').length
    const mx = items.filter(it => it.owner === 'MX').length
    const rd = items.filter(it => it.owner === 'RD').length
    const mm = items.filter(it => it.owner === 'MM').length
    const qc = items.filter(it => it.owner === 'QC').length
    const external = items.filter(it => it.cal_type === 'External').length
    const internal = items.filter(it => it.cal_type === 'Internal').length
    return { total, pk, mx, rd, mm, qc, external, internal }
  }, [items])

  // Save changes
  const handleSaveMonthChange = () => {
    if (!selectedItemForDetail || !editingMonth) return
    const updated = items.map(it => {
      if (it.equipment_id === selectedItemForDetail.equipment_id) {
        return { ...it, scheduled_month: editingMonth }
      }
      return it
    })
    setItems(updated)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cosmeflow_cal_items_v1', JSON.stringify(updated))
      } catch (e) {}
    }
    toast.success(`ปรับเดือนนัดสอบเทียบของ ${selectedItemForDetail.equipment_id} เป็น ${editingMonth} สำเร็จ!`)
    setIsDetailModalOpen(false)
  }

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportRows = filteredItems.map(it => ({
        'ลำดับ (No.)': it.no,
        'รหัสเครื่องมือ (Equipment ID)': it.equipment_id,
        'ชื่อเครื่องมือวัด (Instrument Name)': it.equipment_name,
        'แผนก (Owner)': it.owner,
        'สังกัดแผนก': it.owner_name,
        'ยี่ห้อ (Brand)': it.brand,
        'รุ่น (Model)': it.model,
        'Serial Number': it.serial_number,
        'ย่านการใช้งาน (Operation Range)': it.operation_range,
        'จุดสอบเทียบ (Calibration Range)': it.calibration_range,
        'เกณฑ์การยอมรับ (Acceptance Criteria)': it.acceptance_criteria,
        'รอบสอบเทียบ (เดือน)': it.interval_months,
        'ประเภทสอบเทียบ': it.cal_type,
        'ผู้ให้บริการสอบเทียบ': it.cal_provider,
        'เดือนที่นัดสอบเทียบ 2026': it.scheduled_month,
        'สถานะ / บันทึก': it.status_note
      }))

      const ws = XLSX.utils.json_to_sheet(exportRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Calibration 2026')
      XLSX.writeFile(wb, `CosmeFlow_CAL_Plan_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('ส่งออกไฟล์ Excel แผน CAL 2026 เรียบร้อยแล้ว')
    } catch (err: any) {
      toast.error('ไม่สามารถส่งออก Excel ได้: ' + (err.message || ''))
    }
  }

  return (
    <div className="space-y-6 text-stone-900 font-sans">
      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white border border-stone-200 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block truncate">เครื่องมือวัดทั้งหมด</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-stone-900 font-mono">{metrics.total}</span>
            <span className="text-[11px] text-stone-400 font-medium">รายการ</span>
          </div>
        </div>

        <div className="bg-white border border-teal-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-teal-700 font-bold block truncate" title="External Calibration Provider">สอบเทียบภายนอก</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-teal-600 font-mono">{metrics.external}</span>
            <span className="text-[11px] text-stone-400 font-medium">รายการ</span>
          </div>
        </div>

        <div className="bg-white border border-rose-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-rose-700 font-bold block truncate">แผนกบรรจุ (PK)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-rose-600 font-mono">{metrics.pk}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-amber-700 font-bold block truncate">แผนกผสม (MX)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-amber-600 font-mono">{metrics.mx}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-purple-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-purple-700 font-bold block truncate">วิจัยและพัฒนา (RD)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-purple-600 font-mono">{metrics.rd}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-blue-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-blue-700 font-bold block truncate">คลังวัตถุดิบ (MM)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-blue-600 font-mono">{metrics.mm}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block truncate">ควบคุมคุณภาพ (QC)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-600 font-mono">{metrics.qc}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-amber-800 font-bold block truncate">มาตรฐาน DCC</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xs font-black text-amber-700 font-mono">QC-PF-004B</span>
            <span className="text-[10px] text-amber-600 font-medium">Rev.01</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          {/* Tabs with Distinct Vibrant Color Coding */}
          <div className="flex items-center gap-2 p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200/80 text-xs sm:text-sm overflow-x-auto no-scrollbar max-w-full">
            {/* 1. รายการเครื่องมือวัด */}
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                activeTab === 'list'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md border border-teal-500 ring-2 ring-teal-400/40'
                  : 'bg-white hover:bg-teal-50/80 text-teal-950 border border-teal-200/90 shadow-2xs hover:border-teal-300'
              }`}
            >
              <span className="text-base">📋</span>
              <span className="font-extrabold">รายการเครื่องมือวัด</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black transition-colors ${
                  activeTab === 'list'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-teal-100 text-teal-700 border border-teal-200'
                }`}
              >
                {filteredItems.length}
              </span>
            </button>

            {/* 2. ตารางไทม์ไลน์รายปี */}
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                activeTab === 'matrix'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md border border-purple-500 ring-2 ring-purple-400/40'
                  : 'bg-white hover:bg-purple-50/80 text-purple-950 border border-purple-200/90 shadow-2xs hover:border-purple-300'
              }`}
            >
              <span className="text-base">📅</span>
              <span className="font-extrabold">ตารางไทม์ไลน์รายปี</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black transition-colors ${
                  activeTab === 'matrix'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}
              >
                Matrix 12 เดือน
              </span>
            </button>

            {/* 3. เอกสารควบคุม DCC */}
            <button
              type="button"
              onClick={() => setActiveTab('dcc')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                activeTab === 'dcc'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md border border-amber-500 ring-2 ring-amber-400/40'
                  : 'bg-white hover:bg-amber-50/80 text-amber-950 border border-amber-200/90 shadow-2xs hover:border-amber-300'
              }`}
            >
              <span className="text-base">📜</span>
              <span className="font-extrabold">เอกสารควบคุม DCC</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black transition-colors ${
                  activeTab === 'dcc'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                QC-PF-004B
              </span>
            </button>
          </div>

          {/* Export Excel Button */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก Excel (CAL 2026.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              ค้นหารหัส / ชื่อเครื่องมือ / Brand / Serial
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหา เช่น BAL-PK, OHAUS, TH-02A..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Dept Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              แผนกผู้ครอบครอง (Owner)
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#D4AF37] font-medium cursor-pointer"
            >
              <option value="ALL">🏢 ทุกแผนก (All Departments)</option>
              {departments.filter(d => d !== 'ALL').map((d) => (
                <option key={d} value={d}>
                  แผนก {d} ({items.filter(x => x.owner === d).length} เครื่อง)
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              เดือนที่นัดสอบเทียบ (Scheduled Month)
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#D4AF37] font-medium cursor-pointer"
            >
              <option value="ALL">🗓️ ทุกเดือน (All 12 Months)</option>
              {MONTHS.map(m => (
                <option key={m} value={m}>
                  {m} ({items.filter(x => x.scheduled_month === m).length} เครื่อง)
                </option>
              ))}
            </select>
          </div>

          {/* Calibration Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              ประเภทการสอบเทียบ (Type)
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#D4AF37] font-medium cursor-pointer"
            >
              <option value="ALL">🔄 ทั้งหมด (External & Internal)</option>
              <option value="External">External (แล็บสอบเทียบภายนอก)</option>
              <option value="Internal">Internal (สอบเทียบภายใน)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: LIST VIEW */}
      {activeTab === 'list' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          {/* Mobile Card List (< md) */}
          <div className="block md:hidden divide-y divide-stone-150">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-stone-400 font-medium">
                ไม่พบข้อมูลเครื่องมือวัดตามเงื่อนไขที่เลือก
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.equipment_id} className="p-4 space-y-3 bg-white hover:bg-stone-50/70 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs text-teal-700 font-bold block">{item.equipment_id}</span>
                      <h4 className="font-bold text-stone-900 text-sm mt-0.5">{item.equipment_name}</h4>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {item.brand} • {item.model} {item.serial_number ? `(S/N: ${item.serial_number})` : ''}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-300 shrink-0">
                      {item.owner}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
                    <div>
                      <span className="text-[10px] text-stone-400 block">ย่านใช้งาน:</span>
                      <span className="font-medium text-stone-700">{item.operation_range || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">เกณฑ์ยอมรับ:</span>
                      <span className="font-bold text-stone-900">{item.acceptance_criteria || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">รอบสอบเทียบ:</span>
                      <span className="font-mono text-stone-700">{item.interval_months} เดือน</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">เดือนนัดสอบเทียบ:</span>
                      <span className="font-bold text-teal-700 font-mono">
                        {item.scheduled_month} 2026
                      </span>
                    </div>
                  </div>

                  {item.status_note && (
                    <div className="text-[11px] text-stone-600 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                      <b>บันทึก:</b> {item.status_note}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemForDetail(item)
                        setEditingMonth(item.scheduled_month)
                        setIsDetailModalOpen(true)
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#D4AF37] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>ดูสเปก & ปรับเดือนสอบเทียบ</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 font-bold uppercase text-stone-600 tracking-wider text-[11px]">
                  <th className="p-3 pl-5 w-12 text-center">No.</th>
                  <th className="p-3 min-w-[130px]">รหัสเครื่องมือ</th>
                  <th className="p-3 min-w-[200px]">ชื่อเครื่องมือวัด (Instrument)</th>
                  <th className="p-3 w-20 text-center">แผนก</th>
                  <th className="p-3 min-w-[140px]">ยี่ห้อ / รุ่น</th>
                  <th className="p-3 min-w-[120px]">Serial No.</th>
                  <th className="p-3 min-w-[120px]">เกณฑ์การยอมรับ</th>
                  <th className="p-3 min-w-[100px] text-center">รอบ (เดือน)</th>
                  <th className="p-3 min-w-[110px] text-center">เดือนนัด CAL</th>
                  <th className="p-3 min-w-[160px]">สถานะ / บันทึก</th>
                  <th className="p-3 pr-5 text-right w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-stone-400 font-medium">
                      ไม่พบข้อมูลเครื่องมือวัดตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.equipment_id} className="hover:bg-stone-50 transition">
                      <td className="p-3 pl-5 text-center font-mono text-stone-400">{item.no}</td>
                      <td className="p-3 font-mono font-bold text-teal-800 whitespace-nowrap">
                        {item.equipment_id}
                      </td>
                      <td className="p-3 font-semibold text-stone-900 max-w-[220px]">
                        <div className="truncate" title={item.equipment_name}>{item.equipment_name}</div>
                        <div className="text-[10px] text-stone-400 font-normal truncate">
                          ช่วงใช้งาน: {item.operation_range || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
                          {item.owner}
                        </span>
                      </td>
                      <td className="p-3 text-stone-700 whitespace-nowrap">
                        <div className="font-medium">{item.brand || '-'}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{item.model || ''}</div>
                      </td>
                      <td className="p-3 font-mono text-stone-600 whitespace-nowrap">
                        {item.serial_number || '-'}
                      </td>
                      <td className="p-3 font-bold text-stone-800 whitespace-nowrap">
                        {item.acceptance_criteria || '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-medium text-stone-700">
                        {item.interval_months}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono bg-teal-100 text-teal-900 border border-teal-300">
                          {item.scheduled_month}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-stone-500 max-w-[160px] truncate" title={item.status_note}>
                        {item.status_note || '-'}
                      </td>
                      <td className="p-3 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemForDetail(item)
                            setEditingMonth(item.scheduled_month)
                            setIsDetailModalOpen(true)
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 hover:bg-stone-900 text-stone-800 hover:text-[#D4AF37] border border-stone-200 font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          ⚙️ สเปก
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIX 12 MONTHS VIEW */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-800">ไทม์ไลน์รอบสอบเทียบเครื่องมือประจำปี 2026 (Annual Calibration Matrix)</span>
              <span className="text-[11px] text-stone-500 font-mono">({filteredItems.length} เครื่องมือ)</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-stone-600">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-teal-600 inline-block" />
                <span>= เดือนนัดสอบเทียบ (CAL)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400 inline-block" />
                <span>= เดือนปัจจุบัน ({CURRENT_MONTH})</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 font-bold uppercase text-stone-600 tracking-wider text-[11px]">
                  <th className="p-3 pl-5 min-w-[140px] sticky left-0 bg-stone-100 z-10">รหัสเครื่องมือ</th>
                  <th className="p-3 min-w-[200px]">ชื่อเครื่องมือวัด</th>
                  <th className="p-3 w-16 text-center">แผนก</th>
                  <th className="p-3 min-w-[120px]">เกณฑ์ยอมรับ</th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className={`p-3 text-center min-w-[52px] ${
                        m === CURRENT_MONTH ? 'bg-amber-100/70 text-amber-950 font-black border-x border-amber-300' : ''
                      }`}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="p-3 pr-5 text-right w-20">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {filteredItems.map((item) => {
                  return (
                    <tr key={item.equipment_id} className="hover:bg-stone-50 transition">
                      <td className="p-3 pl-5 font-bold text-teal-800 font-mono sticky left-0 bg-white z-10 border-r border-stone-150">
                        {item.equipment_id}
                      </td>
                      <td className="p-3 font-sans text-stone-800 truncate max-w-[220px]">
                        {item.equipment_name}
                      </td>
                      <td className="p-3 text-center font-sans">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800">
                          {item.owner}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-stone-600 font-medium truncate max-w-[130px]" title={item.acceptance_criteria}>
                        {item.acceptance_criteria || '-'}
                      </td>

                      {MONTHS.map((m) => {
                        const isScheduled = item.scheduled_month === m
                        const isCurrent = m === CURRENT_MONTH
                        return (
                          <td
                            key={m}
                            className={`p-2 text-center ${isCurrent ? 'bg-amber-50/50 border-x border-amber-200' : ''}`}
                          >
                            {isScheduled ? (
                              <span 
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white shadow-2xs cursor-pointer hover:bg-teal-700 transition"
                                title={`นัดสอบเทียบในเดือน ${m} 2026 (${item.cal_provider})`}
                                onClick={() => {
                                  setSelectedItemForDetail(item)
                                  setEditingMonth(item.scheduled_month)
                                  setIsDetailModalOpen(true)
                                }}
                              >
                                CAL
                              </span>
                            ) : (
                              <span className="text-stone-300">-</span>
                            )}
                          </td>
                        )
                      })}

                      <td className="p-3 pr-5 text-right font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemForDetail(item)
                            setEditingMonth(item.scheduled_month)
                            setIsDetailModalOpen(true)
                          }}
                          className="px-2 py-1 rounded-lg text-xs bg-stone-100 hover:bg-stone-900 text-stone-800 hover:text-[#D4AF37] border border-stone-200 font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          ปรับ
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DCC CONTROL DOCUMENT VIEW */}
      {activeTab === 'dcc' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
            <div>
              <span className="font-mono text-xs font-bold text-amber-700 uppercase tracking-wider block">
                เอกสารควบคุมฝ่ายควบคุมคุณภาพ (Quality Control Document)
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">
                บัญชีรายชื่อเครื่องมือวัดและการสอบเทียบ ประจำปี 2026 (Calibration Master List)
              </h2>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-right font-mono text-xs space-y-0.5">
              <div><b>Document No.:</b> <span className="text-stone-900 font-bold">QC-PF-004B</span></div>
              <div><b>Revised No.:</b> 01</div>
              <div><b>Effective Date:</b> 10 มิ.ย. 2569</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-2">
              <h4 className="font-bold text-teal-900 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>มาตรฐานการสอบเทียบ (ISO / GMP)</span>
              </h4>
              <p className="text-teal-800 leading-relaxed">
                เครื่องมือวัดทุกชิ้นในโรงงาน (ยอดรวม 77 เครื่องมือ) ครอบคลุมฝ่าย PK, MX, RD, MM และ QC ต้องได้รับการสอบเทียบปีละ 1 ครั้ง (Interval 12 เดือน) ตามมาตรฐาน ISO 22716 และ ASEAN Cosmetic GMP
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                <Gauge className="w-4 h-4 text-amber-700" />
                <span>เกณฑ์การยอมรับ (Acceptance Criteria)</span>
              </h4>
              <p className="text-amber-800 leading-relaxed">
                ผลการสอบเทียบจากห้องปฏิบัติการภายนอกต้องผ่านเกณฑ์ค่าความคลาดเคลื่อนที่กำหนด เช่น เครื่องชั่ง (±0.3 g, ±0.03 kg), ไฮโกรเทอร์โมมิเตอร์ (±3°C, ±15%RH) จึงจะได้รับอนุมัติให้ใช้งานในสายการผลิต
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
                <Clock className="w-4 h-4 text-stone-700" />
                <span>การติดตามผล (Calibration Tracking)</span>
              </h4>
              <p className="text-stone-700 leading-relaxed">
                ระบบ CosmeFlow ทำการจับรอบความถี่รายเดือน และแจ้งเตือนล่วงหน้า 30 วันก่อนถึงกำหนดส่งสอบเทียบ เพื่อให้หัวหน้าแผนกจัดเตรียมเครื่องมือสลับใช้งาน
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detail & Month Adjustment Modal */}
      {isDetailModalOpen && selectedItemForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700">{selectedItemForDetail.equipment_id}</span>
                <h3 className="text-lg font-black text-stone-900">{selectedItemForDetail.equipment_name}</h3>
                <p className="text-xs text-stone-500">{selectedItemForDetail.owner_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-stone-400 block text-[11px]">ยี่ห้อ (Brand):</span>
                  <span className="font-bold text-stone-900">{selectedItemForDetail.brand || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">รุ่น (Model):</span>
                  <span className="font-bold text-stone-900 font-mono">{selectedItemForDetail.model || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Serial Number:</span>
                  <span className="font-bold text-stone-900 font-mono">{selectedItemForDetail.serial_number || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">รอบสอบเทียบ (Interval):</span>
                  <span className="font-bold text-stone-900 font-mono">{selectedItemForDetail.interval_months} เดือน</span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 space-y-1">
                <div>
                  <span className="text-stone-400 text-[11px]">ย่านการใช้งาน: </span>
                  <span className="font-semibold text-stone-800">{selectedItemForDetail.operation_range || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px]">จุดสอบเทียบ: </span>
                  <span className="font-semibold text-stone-800">{selectedItemForDetail.calibration_range || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px]">เกณฑ์การยอมรับ (Acceptance Criteria): </span>
                  <span className="font-bold text-teal-800">{selectedItemForDetail.acceptance_criteria || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px]">ผู้ให้บริการสอบเทียบ: </span>
                  <span className="font-semibold text-stone-800">{selectedItemForDetail.cal_provider}</span>
                </div>
                {selectedItemForDetail.status_note && (
                  <div className="pt-1">
                    <span className="text-stone-400 text-[11px]">ประวัติ/บันทึกเดิม: </span>
                    <span className="text-stone-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200/60 inline-block">
                      {selectedItemForDetail.status_note}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Adjust Scheduled Month Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                กำหนด / ปรับเดือนที่นัดสอบเทียบในปี 2026:
              </label>
              <select
                value={editingMonth}
                onChange={(e) => setEditingMonth(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-stone-300 font-bold text-xs text-stone-900 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>
                    เดือน {m} 2026
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs"
              >
                ปิดหน้าต่าง
              </Button>
              <Button
                type="button"
                onClick={handleSaveMonthChange}
                className="flex-1 h-10 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
              >
                บันทึกการปรับเดือนนัด
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
