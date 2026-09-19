'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Pencil, 
  FileCheck, 
  ShieldCheck, 
  Clock, 
  History, 
  User, 
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { updateMachine, getMachineAuditLogs } from '@/app/actions/maintenance'
import { MaintenanceMachine, MaintenanceMachineAuditLog } from '@/types/maintenance'
import MachineActionRequestModal from '@/components/maintenance/MachineActionRequestModal'

interface EditMachineModalProps {
  machine: MaintenanceMachine | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CATEGORIES = [
  'Mixing',
  'Filling',
  'Capping',
  'Labeling',
  'Sealing',
  'Packaging',
  'Inspection',
  'Utility',
  'Quality Control',
  'R&D Lab',
  'Material Handling',
  'General Machinery',
  'Other'
]

const DEPARTMENTS = [
  'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
  'แผนกผสม (Mixing Department)',
  'คลังสินค้าและวัตถุดิบ (Raw Materials / Warehouse)',
  'ฝ่ายควบคุมคุณภาพ (Quality Control - QC)',
  'ฝ่ายวิจัยและพัฒนา (R&D)',
  'ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)',
  'ฝ่ายผลิตทั่วไป (Production)'
]

export default function EditMachineModal({
  machine,
  isOpen,
  onClose,
  onSuccess
}: EditMachineModalProps) {
  const [machineCode, setMachineCode] = useState('')
  const [machineName, setMachineName] = useState('')
  const [category, setCategory] = useState('Mixing')
  const [departmentName, setDepartmentName] = useState('')
  const [productionArea, setProductionArea] = useState('')
  const [criticality, setCriticality] = useState<'A' | 'B' | 'C'>('B')
  const [status, setStatus] = useState<'Running' | 'Breakdown' | 'Under Repair' | 'Standby' | 'Decommissioned'>('Running')
  const [hourlyCost, setHourlyCost] = useState('5000')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [instruction, setInstruction] = useState('')

  // Mandatory GMP Audit Trail State
  const [editedByName, setEditedByName] = useState('')
  const [editReason, setEditReason] = useState('')
  const [activeTab, setActiveTab] = useState<'form' | 'audit_history'>('form')
  const [auditLogs, setAuditLogs] = useState<MaintenanceMachineAuditLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)

  // Current formatted timestamp in Thai
  const currentTimestamp = new Date().toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  // Populate fields & audit logs when machine changes
  useEffect(() => {
    if (machine) {
      setMachineCode(machine.machine_code || '')
      setMachineName(machine.machine_name || '')
      setCategory(machine.category || 'Mixing')
      setDepartmentName(machine.department_name || DEPARTMENTS[0])
      setProductionArea(machine.production_area || '')
      setCriticality((machine.criticality as 'A' | 'B' | 'C') || 'B')
      setStatus((machine.status as any) || 'Running')
      setHourlyCost(String(machine.hourly_downtime_cost || '5000'))
      setManufacturer(machine.manufacturer || '')
      setModel(machine.model || '')
      setSerialNumber(machine.serial_number || '')
      setInstruction(machine.maintenance_instruction || '')
      setEditReason('')
      setActiveTab('form')

      // Load saved user name or default
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('cosmeflow_user_name') : ''
      setEditedByName(savedUser || 'หัวหน้าแผนก (Supervisor)')

      // Fetch audit logs
      fetchAuditLogs(machine.id)
    }
  }, [machine, isOpen])

  const fetchAuditLogs = async (machineId: string) => {
    setIsLoadingLogs(true)
    try {
      const res = await getMachineAuditLogs(machineId)
      if (res.success && res.data) {
        setAuditLogs(res.data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false)
    }
  }

  if (!machine) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!machineName.trim()) {
      toast.error('กรุณาระบุชื่อเครื่องจักร')
      return
    }

    if (!editedByName.trim()) {
      toast.error('กรุณาระบุชื่อผู้แก้ไขข้อมูล เพื่อการสอบกลับ (Audit Trail)')
      return
    }

    if (!editReason.trim() || editReason.trim().length < 5) {
      toast.error('กรุณาระบุเหตุผลการแก้ไขข้อมูลอย่างน้อย 5 ตัวอักษร เพื่อให้สอบกลับได้')
      return
    }

    // Save user name for next time
    if (typeof window !== 'undefined') {
      localStorage.setItem('cosmeflow_user_name', editedByName.trim())
    }

    setIsSubmitting(true)
    try {
      const res = await updateMachine(machine.id, {
        machine_code: machineCode.trim().toUpperCase(),
        machine_name: machineName.trim(),
        category,
        department_name: departmentName,
        production_area: productionArea.trim(),
        criticality,
        status,
        hourly_downtime_cost: parseFloat(hourlyCost) || 0,
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim(),
        maintenance_instruction: instruction.trim(),
        // Mandatory Audit Fields
        edited_by_name: editedByName.trim(),
        edit_reason: editReason.trim()
      })

      if (res.success) {
        toast.success(`อัปเดตข้อมูลเครื่องจักร ${machineCode.toUpperCase()} และบันทึกประวัติเพื่อการสอบกลับเรียบร้อยแล้ว!`)
        onSuccess?.()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถบันทึกการแก้ไขได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto font-sans">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 border border-amber-300">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-stone-900">
                  แก้ไขข้อมูลเครื่องจักร
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 font-mono">
                  Asset ID: {machine.machine_code} • {machine.machine_name}
                </DialogDescription>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              status === 'Running' ? 'bg-emerald-100 text-emerald-800' :
              status === 'Breakdown' ? 'bg-red-100 text-red-800' :
              status === 'Under Repair' ? 'bg-amber-100 text-amber-800' :
              'bg-stone-100 text-stone-700'
            }`}>
              {status}
            </span>
          </div>

          {/* Tab Switcher: Form vs Audit History */}
          <div className="flex border-b border-stone-200 pt-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'form'
                  ? 'border-[#D4AF37] text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>แบบฟอร์มแก้ไข</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit_history')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'audit_history'
                  ? 'border-blue-600 text-blue-900'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>ประวัติการแก้ไขเพื่อการสอบกลับ (Audit Trail)</span>
              {auditLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-black">
                  {auditLogs.length}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Machine Code & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">รหัสเครื่อง *</label>
                <Input
                  value={machineCode}
                  onChange={e => setMachineCode(e.target.value.toUpperCase())}
                  placeholder="เช่น AFILL-PK-001"
                  className="h-10 text-xs font-mono font-bold rounded-xl bg-stone-50 border-stone-300"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-stone-700 block mb-1">ชื่อเครื่องจักร *</label>
                <Input
                  value={machineName}
                  onChange={e => setMachineName(e.target.value)}
                  placeholder="เช่น เครื่องบรรจุขวดอัตโนมัติ"
                  className="h-10 text-xs rounded-xl bg-stone-50 border-stone-300 font-bold"
                  required
                />
              </div>
            </div>

            {/* Department & Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">ฝ่าย / แผนก</label>
                <select
                  value={departmentName}
                  onChange={e => setDepartmentName(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-stone-50 border border-stone-300 font-medium text-stone-800"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  {!DEPARTMENTS.includes(departmentName) && departmentName && (
                    <option value={departmentName}>{departmentName}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">ห้องติดตั้ง / พื้นที่ (Area)</label>
                <Input
                  value={productionArea}
                  onChange={e => setProductionArea(e.target.value)}
                  placeholder="เช่น Cleanroom Room 2, Mixing Hall"
                  className="h-10 text-xs rounded-xl bg-stone-50 border-stone-300"
                />
              </div>
            </div>

            {/* Category, Criticality & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">หมวดหมู่</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-stone-50 border border-stone-300 font-medium text-stone-800"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">ความสำคัญ (Criticality)</label>
                <select
                  value={criticality}
                  onChange={e => setCriticality(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-stone-50 border border-stone-300 text-stone-800"
                >
                  <option value="A">Grade A (วิกฤต - กระทบผลิต)</option>
                  <option value="B">Grade B (สำคัญปานกลาง)</option>
                  <option value="C">Grade C (ทั่วไป/สำรอง)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">สถานะปัจจุบัน</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-stone-50 border border-stone-300 text-stone-800"
                >
                  <option value="Running">Running (พร้อมใช้งาน)</option>
                  <option value="Standby">Standby (สแตนด์บาย)</option>
                  <option value="Under Repair">Under Repair (กำลังซ่อม)</option>
                  <option value="Breakdown">Breakdown (เสียด่วน)</option>
                  <option value="Decommissioned">Decommissioned (ปลดระวาง)</option>
                </select>
              </div>
            </div>

            {/* Specs: Manufacturer, Model, Serial, Cost */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                ข้อมูลทางเทคนิคและต้นทุน
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">ยี่ห้อ / ผู้ผลิต</label>
                  <Input
                    value={manufacturer}
                    onChange={e => setManufacturer(e.target.value)}
                    placeholder="เช่น Atlas Copco"
                    className="h-9 text-xs rounded-xl bg-white border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">รุ่น (Model)</label>
                  <Input
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="เช่น ZT 37 VSD"
                    className="h-9 text-xs rounded-xl bg-white border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">Serial Number</label>
                  <Input
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    placeholder="เช่น SN-2024-9988"
                    className="h-9 text-xs font-mono rounded-xl bg-white border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">
                  ต้นทุนความเสียหายเมื่อหยุดเดินเครื่อง (Downtime Cost ฿/ชม.)
                </label>
                <Input
                  type="number"
                  value={hourlyCost}
                  onChange={e => setHourlyCost(e.target.value)}
                  placeholder="5000"
                  className="h-9 text-xs font-mono font-bold rounded-xl bg-white border-stone-300"
                />
              </div>
            </div>

            {/* Special Instruction */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                คำแนะนำการบำรุงรักษา / ข้อควรระวังพิเศษ
              </label>
              <textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                rows={2}
                placeholder="เช่น ตรวจระดับน้ำมันหล่อลื่นทุกสัปดาห์, ห้ามฉีดน้ำแรงดันสูงเข้ากล่องคอนโทรล..."
                className="w-full p-2.5 text-xs rounded-xl bg-stone-50 border border-stone-300 font-sans text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            {/* MANDATORY GMP AUDIT TRAIL CONTROL (เหตุผล + ชื่อผู้แก้ไข + Timestamp) */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-300/80 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>การควบคุมการแก้ไขข้อมูลเพื่อการสอบกลับ (GMP Audit Trail)</span>
                </div>
                <span className="text-[10px] font-mono font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                  MANDATORY / บังคับระบุ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-800 block mb-1">
                    ชื่อผู้ทำการแก้ไข (User / Editor) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={editedByName}
                      onChange={e => setEditedByName(e.target.value)}
                      placeholder="ระบุชื่อ-นามสกุล หรือตำแหน่ง..."
                      className="pl-8 h-9 text-xs bg-white rounded-xl border-amber-300 font-bold text-stone-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-800 block mb-1">
                    เวลาที่บันทึก (Timestamp)
                  </label>
                  <div className="h-9 px-3 flex items-center bg-white rounded-xl border border-stone-200 text-xs font-mono text-stone-700">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    <span>{currentTimestamp} (Auto-recorded)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-800 block mb-1">
                  เหตุผลความจำเป็นในการแก้ไข <span className="text-red-500">* (บังคับระบุอย่างน้อย 5 ตัวอักษร เพื่อให้สอบกลับได้)</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="ระบุเหตุผลในการแก้ไขข้อมูล เช่น ปรับปรุงข้อมูลผู้ผลิต, อัปเดตสเปกตามหน้างานจริง, แก้ไขข้อผิดพลาดของชื่อรุ่น..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl text-xs bg-white border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none font-sans text-stone-900"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRequestModalOpen(true)}
                className="text-xs h-10 border-red-300 text-red-700 bg-red-50/70 hover:bg-red-100 hover:text-red-900 gap-1.5 rounded-xl font-bold w-full sm:w-auto"
              >
                <FileCheck className="w-4 h-4 text-red-600" />
                <span>ยื่นคำร้องขอยกเลิกใช้ / ปลดระวาง (MT-PF-002)</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="text-xs h-10 rounded-xl"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !editReason.trim() || !editedByName.trim()}
                  className="text-xs h-10 px-5 font-bold bg-[#D4AF37] hover:bg-amber-600 text-stone-950 rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข (Audit Verified)'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          /* AUDIT HISTORY TAB (ประวัติการแก้ไขเพื่อการสอบกลับ) */
          <div className="space-y-4 mt-3">
            <div className="flex items-center justify-between bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>บันทึกการสอบกลับตามมาตรฐาน GMP / ISO 22716 (ALCOA+ Data Integrity)</span>
              </div>
              <span className="font-bold text-stone-800">ทั้งหมด {auditLogs.length} รายการ</span>
            </div>

            {isLoadingLogs ? (
              <div className="text-center py-10 text-xs text-stone-400">กำลังโหลดประวัติการแก้ไข...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                ยังไม่มีประวัติการแก้ไขข้อมูลสำหรับเครื่องจักรนี้
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                          <User className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-bold text-stone-900">{log.edited_by_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-stone-500 font-mono">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>
                          {new Date(log.created_at).toLocaleString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="text-xs bg-white p-2.5 rounded-xl border border-stone-200">
                      <span className="font-bold text-amber-900 block mb-0.5">เหตุผลการแก้ไข:</span>
                      <p className="text-stone-700 italic">"{log.edit_reason}"</p>
                    </div>

                    {/* Changes Summary Diff */}
                    {log.changes_summary && log.changes_summary.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                          รายการข้อมูลที่เปลี่ยนแปลง ({log.changes_summary.length} จุด):
                        </span>
                        <div className="space-y-1">
                          {log.changes_summary.map((change, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-1.5 text-xs bg-white/80 px-2.5 py-1.5 rounded-lg border border-stone-150">
                              <span className="font-semibold text-stone-700 min-w-[120px]">{change.label}:</span>
                              <span className="line-through text-red-500 bg-red-50 px-1.5 py-0.5 rounded text-[11px]">
                                {change.old_value !== '' && change.old_value !== null && change.old_value !== undefined ? String(change.old_value) : '(ว่าง)'}
                              </span>
                              <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                                {change.new_value !== '' && change.new_value !== null && change.new_value !== undefined ? String(change.new_value) : '(ว่าง)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-stone-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('form')}
                className="text-xs h-9 rounded-xl"
              >
                กลับสู่แบบฟอร์มแก้ไข
              </Button>
            </div>
          </div>
        )}

        {/* Machine Action Request Modal (DCC MT-PF-002) */}
        <MachineActionRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          initialMachine={machine}
          initialType="DECOMMISSION"
          onSuccess={() => {
            onClose()
            onSuccess?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
