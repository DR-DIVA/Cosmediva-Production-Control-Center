'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  Calendar, 
  Filter, 
  User, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  PlusCircle, 
  FileEdit, 
  ArrowRight,
  ExternalLink,
  X,
  History
} from 'lucide-react'
import { MaintenanceActivityLogItem, MaintenanceActivityType } from '@/types/maintenance'
import { getMaintenanceActivityLogs } from '@/app/actions/maintenance'
import ThaiDateInput from '@/components/maintenance/ThaiDateInput'
import { formatThaiDate, resolveDepartmentAndAreaFromCode } from '@/lib/maintenanceHelpers'
import * as XLSX from 'xlsx'

interface MaintenanceActivityLogModalProps {
  isOpen: boolean
  onClose: () => void
  initialMachineCode?: string
}

export default function MaintenanceActivityLogModal({
  isOpen,
  onClose,
  initialMachineCode
}: MaintenanceActivityLogModalProps) {
  const [logs, setLogs] = useState<MaintenanceActivityLogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activityType, setActivityType] = useState<MaintenanceActivityType>('ALL')
  const [machineCode, setMachineCode] = useState(initialMachineCode || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const res = await getMaintenanceActivityLogs({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        activityType: activityType !== 'ALL' ? activityType : undefined,
        machineCode: machineCode.trim() || undefined,
        search: search.trim() || undefined,
        limit: 1000
      })
      if (res.success && res.data) {
        setLogs(res.data)
      } else {
        toast.error(res.error || 'ไม่สามารถโหลดประวัติกิจกรรมได้')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (initialMachineCode) {
        setMachineCode(initialMachineCode)
      }
      fetchLogs()
    }
  }, [isOpen, activityType, initialMachineCode])

  const setDatePreset = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
    const now = new Date()
    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
      return
    }

    const endStr = now.toISOString().split('T')[0]
    let start = new Date()

    if (preset === 'today') {
      // today
    } else if (preset === '7days') {
      start.setDate(now.getDate() - 7)
    } else if (preset === '30days') {
      start.setDate(now.getDate() - 30)
    } else if (preset === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(endStr)
  }

  // Count by activity type
  const counts = useMemo(() => {
    let created = 0
    let updated = 0
    let req = 0
    let ack = 0
    let close = 0
    let pm = 0

    logs.forEach(l => {
      if (l.activityType === 'MACHINE_CREATED') created++
      else if (l.activityType === 'MACHINE_UPDATED') updated++
      else if (l.activityType === 'REPAIR_REQUESTED') req++
      else if (l.activityType === 'REPAIR_ACKNOWLEDGED') ack++
      else if (l.activityType === 'REPAIR_COMPLETED') close++
      else if (l.activityType === 'PM_EXECUTED') pm++
    })

    return { created, updated, req, ack, close, pm, total: logs.length }
  }, [logs])

  // Filter client side
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter(l => {
      if (activityType !== 'ALL' && l.activityType !== activityType) return false
      if (machineCode.trim() && !l.machineCode.toLowerCase().includes(machineCode.trim().toLowerCase())) return false
      if (!q) return true
      return (
        l.machineCode.toLowerCase().includes(q) ||
        l.machineName.toLowerCase().includes(q) ||
        (l.refNumber && l.refNumber.toLowerCase().includes(q)) ||
        l.performedBy.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.reason && l.reason.toLowerCase().includes(q))
      )
    })
  }, [logs, activityType, machineCode, search])

  // Export to Excel
  const handleExportExcel = () => {
    try {
      setIsExporting(true)
      if (filteredLogs.length === 0) {
        toast.warning('ไม่มีข้อมูลสำหรับ Export')
        return
      }

      const rows = filteredLogs.map((item, idx) => {
        const thaiDateStr = formatThaiDate(item.timestamp, 'short')
        const numericDateStr = formatThaiDate(item.timestamp, 'numeric')
        const dateObj = new Date(item.timestamp)
        const timeStr = isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        })

        const dept = (item.departmentName && item.departmentName !== '-')
          ? item.departmentName
          : resolveDepartmentAndAreaFromCode(item.machineCode)?.department || '-'

        return {
          'ลำดับ': idx + 1,
          'วันที่ (วว/ดด/ปปปป)': numericDateStr,
          'วันที่แสดงผล': thaiDateStr,
          'เวลา': timeStr,
          'ประเภทกิจกรรม': item.activityLabel,
          'รหัสเครื่องจักร': item.machineCode,
          'ชื่อเครื่องจักร': item.machineName,
          'สังกัด/แผนก': dept,
          'เลขที่อ้างอิง/ใบงาน': item.refNumber || '-',
          'ผู้ดำเนินการ': item.performedBy,
          'สรุปกิจกรรม': item.summary,
          'รายละเอียด / สิ่งที่เปลี่ยนแปลง': item.details || '-',
          'สถานะ/ผลการตรวจ': item.status || '-',
          'เหตุผล / หมายเหตุ': item.reason || '-'
        }
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)

      // Auto-fit column widths
      const colWidths = [
        { wch: 8 },  // ลำดับ
        { wch: 15 }, // วันที่
        { wch: 10 }, // เวลา
        { wch: 22 }, // ประเภทกิจกรรม
        { wch: 16 }, // รหัสเครื่อง
        { wch: 32 }, // ชื่อเครื่อง
        { wch: 22 }, // แผนก
        { wch: 18 }, // เลขที่ใบงาน
        { wch: 24 }, // ผู้ดำเนินการ
        { wch: 35 }, // สรุปกิจกรรม
        { wch: 55 }, // รายละเอียด
        { wch: 18 }, // สถานะ
        { wch: 30 }  // เหตุผล
      ]
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Maintenance_Logs')

      const now = new Date()
      const dateTag = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
      const fileName = `Cosmediva_Maintenance_Activity_Log_${dateTag}.xlsx`

      XLSX.writeFile(wb, fileName)
      toast.success(`Export Excel สำเร็จ! ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`)
    } catch (err: any) {
      console.error('Export Excel failed:', err)
      toast.error('ไม่สามารถ Export Excel ได้: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  const formatActivityBadge = (type: string, label: string) => {
    switch (type) {
      case 'MACHINE_CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-900 border border-emerald-300 shrink-0">
            <PlusCircle className="w-3 h-3 text-emerald-700" />
            <span>{label}</span>
          </span>
        )
      case 'MACHINE_UPDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
            <FileEdit className="w-3 h-3 text-amber-700" />
            <span>{label}</span>
          </span>
        )
      case 'REPAIR_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100/80 text-rose-900 border border-rose-300 shrink-0">
            <AlertTriangle className="w-3 h-3 text-rose-700" />
            <span>{label}</span>
          </span>
        )
      case 'REPAIR_ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100/80 text-purple-900 border border-purple-300 shrink-0">
            <Wrench className="w-3 h-3 text-purple-700" />
            <span>{label}</span>
          </span>
        )
      case 'REPAIR_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 text-blue-900 border border-blue-300 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-blue-700" />
            <span>{label}</span>
          </span>
        )
      case 'PM_EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100/80 text-cyan-900 border border-cyan-300 shrink-0">
            <Clock className="w-3 h-3 text-cyan-700" />
            <span>{label}</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300 shrink-0">
            <span>{label}</span>
          </span>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] p-5 sm:p-7 rounded-3xl bg-white shadow-2xl border border-stone-200 flex flex-col font-sans">
        
        {/* Header */}
        <DialogHeader className="border-b border-stone-200 pb-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <History className="w-5 h-5 text-[#8B7355]" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-stone-900 flex items-center gap-2">
                    <span>Log ประวัติกิจกรรมฝ่ายช่าง & Audit Trail</span>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full border border-stone-200">
                      {filteredLogs.length} รายการ
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-stone-500 mt-0.5">
                    ติดตามตรวจสอบกิจกรรมการเพิ่มเครื่องจักรใหม่, แก้ไขข้อมูล, รับงานซ่อม, ปิดงานซ่อม และการทำ PM พร้อมวันเวลาและผู้ดำเนินการ
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Actions: Export Excel & Refresh */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={isLoading}
                className="h-9 rounded-xl border-stone-300 text-xs font-bold flex items-center gap-1.5 text-stone-700 hover:bg-stone-50"
                title="รีเฟรชข้อมูลล่าสุด"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-600' : ''}`} />
                <span>รีเฟรช</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting || filteredLogs.length === 0}
                className="h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm px-3.5"
                title="ดาวน์โหลดข้อมูลเป็นไฟล์ Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Export Excel</span>
              </Button>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            <button
              type="button"
              onClick={() => setActivityType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activityType === 'ALL'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              ทั้งหมด ({counts.total})
            </button>

            <button
              type="button"
              onClick={() => setActivityType('MACHINE_CREATED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activityType === 'MACHINE_CREATED'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>เพิ่มเครื่องจักรใหม่ ({counts.created})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivityType('MACHINE_UPDATED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activityType === 'MACHINE_UPDATED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>แก้ไขข้อมูลเครื่อง ({counts.updated})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivityType('REPAIR_REQUESTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activityType === 'REPAIR_REQUESTED'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>แจ้งซ่อมจากฝ่ายที่เกี่ยวข้อง ({counts.req})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivityType('REPAIR_ACKNOWLEDGED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activityType === 'REPAIR_ACKNOWLEDGED'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>รับงานซ่อม ({counts.ack})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivityType('REPAIR_COMPLETED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activityType === 'REPAIR_COMPLETED'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ปิดงานซ่อม ({counts.close})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivityType('PM_EXECUTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activityType === 'PM_EXECUTED'
                  ? 'bg-cyan-700 text-white shadow-sm'
                  : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ดำเนินการทำ PM ({counts.pm})</span>
            </button>
          </div>

          {/* Search & Date Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-3">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="ค้นหารหัสเครื่อง, ช่าง, ใบงาน, ข้อความ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-stone-50 border-stone-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Machine Filter Input */}
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="รหัสเครื่อง (เช่น AGI-MX)..."
                value={machineCode}
                onChange={e => setMachineCode(e.target.value)}
                className="h-9 text-xs rounded-xl bg-stone-50 border-stone-200"
              />
            </div>

            {/* Date Range & Presets */}
            <div className="md:col-span-6 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1 text-xs">
                <ThaiDateInput
                  value={startDate}
                  onChange={setStartDate}
                  title="จากวันที่ (วัน/เดือน/ปี)"
                />
                <span className="text-stone-400 text-xs font-bold">ถึง</span>
                <ThaiDateInput
                  value={endDate}
                  onChange={setEndDate}
                  title="ถึงวันที่ (วัน/เดือน/ปี)"
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-stone-400 hover:text-red-500 p-0.5 ml-1 cursor-pointer"
                    title="ล้างช่วงวันที่"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDatePreset('7days')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                >
                  7 วัน
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('30days')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                >
                  30 วัน
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('thisMonth')}
                  className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold"
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto min-h-[300px] py-2">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-stone-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-600" />
              <span>กำลังดึงข้อมูลประวัติกิจกรรม...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-stone-400 text-xs">
              <Filter className="w-8 h-8 text-stone-300" />
              <span className="font-bold text-stone-600">ไม่พบประวัติกิจกรรมตามเงื่อนไขที่เลือก</span>
              <span>ลองเปลี่ยนคำค้นหา หรือรีเซ็ตช่วงวันที่</span>
            </div>
          ) : (
            <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-700 font-bold text-[11px]">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 w-36">วันเวลาที่ดำเนินการ</th>
                    <th className="py-2.5 px-3 w-36">ประเภทกิจกรรม</th>
                    <th className="py-2.5 px-3 w-40">เครื่องจักร</th>
                    <th className="py-2.5 px-3">รายละเอียดกิจกรรม / สิ่งที่เปลี่ยนแปลง</th>
                    <th className="py-2.5 px-3 w-40">ผู้ดำเนินการ</th>
                    <th className="py-2.5 px-3 w-28 text-center">สถานะ/อ้างอิง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {filteredLogs.map((item, index) => {
                    const thaiDateStr = formatThaiDate(item.timestamp, 'short')
                    const dateObj = new Date(item.timestamp)
                    const timeStr = isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition">
                        {/* Index */}
                        <td className="py-3 px-3 text-center text-stone-400 font-mono text-[11px]">
                          {index + 1}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-stone-900">{thaiDateStr}</div>
                          <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{timeStr} น.</span>
                          </div>
                        </td>

                        {/* Activity Type Badge */}
                        <td className="py-3 px-3">
                          {formatActivityBadge(item.activityType, item.activityLabel)}
                        </td>

                        {/* Machine Info */}
                        <td className="py-3 px-3">
                          <div className="font-bold font-mono text-cyan-900">
                            {item.machineCode}
                          </div>
                          <div className="text-[11px] text-stone-600 line-clamp-1" title={item.machineName}>
                            {item.machineName}
                          </div>
                          {item.departmentName && (
                            <div className="text-[10px] text-stone-400 line-clamp-1">
                              {item.departmentName}
                            </div>
                          )}
                        </td>

                        {/* Details / Changes */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-stone-800 text-xs mb-0.5">
                            {item.summary}
                          </div>
                          
                          {/* If changes array exists (Audit diff) */}
                          {item.changes && item.changes.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.changes.map((chg, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 text-stone-800 text-[11px] border border-stone-200"
                                >
                                  <b className="text-stone-900">{chg.label || chg.field}:</b>
                                  <span className="line-through text-stone-400">{chg.old_value ?? '-'}</span>
                                  <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span className="font-bold text-emerald-800">{chg.new_value ?? '-'}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-stone-600 leading-relaxed whitespace-pre-wrap">
                              {item.details || '-'}
                            </div>
                          )}

                          {item.reason && item.reason !== item.details && (
                            <div className="text-[10px] text-stone-500 italic mt-0.5">
                              💡 เหตุผล/หมายเหตุ: {item.reason}
                            </div>
                          )}
                        </td>

                        {/* Performed By */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                              <User className="w-3 h-3" />
                            </div>
                            <span className="truncate max-w-[130px]" title={item.performedBy}>
                              {item.performedBy}
                            </span>
                          </div>
                        </td>

                        {/* Ref / Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.refNumber && (
                            <div className="font-mono text-[10px] font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 inline-block mb-1">
                              {item.refNumber}
                            </div>
                          )}
                          {item.status && (
                            <div className="text-[10px] font-semibold text-stone-600">
                              {item.status}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500 shrink-0">
          <div>
            💡 ข้อมูลบันทึกความเปลี่ยนแปลงสอดคล้องตามมาตรฐาน <b>GMP / DCC Audit Trail</b> สามารถดาวน์โหลดเป็น Excel ได้ตลอดเวลา
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs rounded-xl border-stone-300 h-9"
            >
              ปิดหน้าต่าง
            </Button>
            <Button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredLogs.length === 0}
              className="h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm px-4"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>ดาวน์โหลด Excel ({filteredLogs.length})</span>
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
