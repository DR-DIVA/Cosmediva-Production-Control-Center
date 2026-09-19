'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { updateMachine, deleteMachine } from '@/app/actions/maintenance'
import { MaintenanceMachine } from '@/types/maintenance'

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Populate fields when machine changes
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
    }
  }, [machine])

  if (!machine) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!machineName.trim()) {
      toast.error('กรุณาระบุชื่อเครื่องจักร')
      return
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
        maintenance_instruction: instruction.trim()
      })

      if (res.success) {
        toast.success(`อัปเดตข้อมูลเครื่องจักร ${machineCode.toUpperCase()} เรียบร้อยแล้ว!`)
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

  const handleDelete = async () => {
    if (!confirm(`ยืนยันการลบเครื่องจักร ${machine.machine_code} (${machine.machine_name}) ออกจากระบบหรือไม่?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await deleteMachine(machine.id)
      if (res.success) {
        toast.success(`ลบเครื่องจักร ${machine.machine_code} เรียบร้อยแล้ว`)
        onSuccess?.()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการลบ')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถลบเครื่องจักรได้')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-xl w-full p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto font-sans">
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
                  Asset ID: {machine.machine_code}
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="text-xs h-10 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1 rounded-xl"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'กำลังลบ...' : 'ลบเครื่องจักร'}</span>
            </Button>

            <div className="flex items-center gap-2">
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
                disabled={isSubmitting}
                className="text-xs h-10 px-5 font-bold bg-[#D4AF37] hover:bg-amber-600 text-stone-950 rounded-xl shadow-md"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
