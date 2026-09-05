'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Wrench, Building, Cpu, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { createMachine } from '@/app/actions/maintenance'

interface AddMachineModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CATEGORIES = ['Mixing', 'Filling', 'Capping', 'Labeling', 'Utility', 'Packaging', 'Other']

export default function AddMachineModal({ isOpen, onClose, onSuccess }: AddMachineModalProps) {
  const [machineCode, setMachineCode] = useState('')
  const [machineName, setMachineName] = useState('')
  const [category, setCategory] = useState('Mixing')
  const [departmentName, setDepartmentName] = useState('แผนกผสม (Mixing Department)')
  const [productionArea, setProductionArea] = useState('')
  const [criticality, setCriticality] = useState<'A' | 'B' | 'C'>('B')
  const [hourlyCost, setHourlyCost] = useState('5000')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [instruction, setInstruction] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!machineCode.trim() || !machineName.trim()) {
      toast.error('กรุณากรอกรหัสเครื่องและชื่อเครื่องจักร')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createMachine({
        machine_code: machineCode,
        machine_name: machineName,
        category,
        department_name: departmentName,
        production_area: productionArea,
        criticality,
        hourly_downtime_cost: parseFloat(hourlyCost) || 5000,
        manufacturer,
        model,
        maintenance_instruction: instruction
      })

      if (res.success) {
        toast.success(`เพิ่มเครื่องจักร ${machineCode.toUpperCase()} เข้าระบบเรียบร้อย! ระบบสร้าง QR Code ให้ทันที`)
        setMachineCode('')
        setMachineName('')
        setProductionArea('')
        onSuccess?.()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถบันทึกได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg w-full p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 border border-amber-300">
            <Wrench className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-stone-900">
            เพิ่มเครื่องจักรใหม่ (Add Machine Master)
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            เพิ่มเครื่องจักรเพื่อสร้าง QR Code ประจำเครื่อง, หน้าแจ้งซ่อมด่วน, และประวัติ 360° อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Machine Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">รหัสเครื่อง *</label>
              <Input
                value={machineCode}
                onChange={e => setMachineCode(e.target.value.toUpperCase())}
                placeholder="เช่น MX-05, FL-03"
                className="h-10 text-xs font-mono font-bold rounded-xl bg-stone-50 border-stone-300"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-700 block mb-1">ชื่อเครื่องจักร *</label>
              <Input
                value={machineName}
                onChange={e => setMachineName(e.target.value)}
                placeholder="เช่น Mixing Tank 1500L, Tube Filler Line 3"
                className="h-10 text-xs rounded-xl bg-stone-50 border-stone-300"
                required
              />
            </div>
          </div>

          {/* Category & Criticality */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">หมวดหมู่กระบวนการ</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-stone-50 border border-stone-300 text-stone-800"
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
                className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-stone-50 border border-stone-300 text-stone-800"
              >
                <option value="A">Grade A (วิกฤต • เสียแล้วหยุดผลิต)</option>
                <option value="B">Grade B (สำคัญ • ยังมี Buffer)</option>
                <option value="C">Grade C (ทั่วไป • สำรองได้)</option>
              </select>
            </div>
          </div>

          {/* Department & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">แผนกที่รับผิดชอบ</label>
              <Input
                value={departmentName}
                onChange={e => setDepartmentName(e.target.value)}
                placeholder="เช่น แผนกผสม, แผนกบรรจุ"
                className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">พื้นที่ติดตั้ง (Location / Area)</label>
              <Input
                value={productionArea}
                onChange={e => setProductionArea(e.target.value)}
                placeholder="เช่น Cleanroom Hall A, Line 2"
                className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
              />
            </div>
          </div>

          {/* Downtime Cost / Hour */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              ต้นทุนความสูญเสียจาก Downtime (บาท / ชั่วโมง)
            </label>
            <Input
              type="number"
              value={hourlyCost}
              onChange={e => setHourlyCost(e.target.value)}
              placeholder="5000"
              className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
            />
            <span className="text-[10px] text-stone-400">ใช้สำหรับคำนวณมูลค่าความเสียหายเมื่อเครื่องจักรหยุดการผลิต</span>
          </div>

          {/* Manufacturer & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">ผู้ผลิต / แบรนด์</label>
              <Input
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                placeholder="เช่น IKA, Silverson, Festo"
                className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">รุ่น (Model)</label>
              <Input
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="เช่น AX-500, TFS 80"
                className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
              />
            </div>
          </div>

          {/* Maintenance Instruction */}
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">คำแนะนำการบำรุงรักษาพิเศษ</label>
            <Input
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="เช่น อัดจารบี Food Grade ทุก 2 สัปดาห์"
              className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-2 pt-3 border-t border-stone-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="flex-1 text-xs">
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-[#2A2521] to-[#3A332B] hover:bg-stone-800 text-white font-bold text-xs h-11 rounded-xl shadow-md"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกเครื่องจักรใหม่'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
