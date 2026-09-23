'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Wrench, Building, Cpu, Layers, Building2, Target, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { createMachine } from '@/app/actions/maintenance'
import { resolveDepartmentAndAreaFromCode, DEPARTMENTS } from '@/lib/maintenanceHelpers'

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
  const [serialNumber, setSerialNumber] = useState('')
  const [supplier, setSupplier] = useState('')
  const [assetId, setAssetId] = useState('')
  const [instruction, setInstruction] = useState('')

  // Subcontract PM State
  const [isSubcontractPm, setIsSubcontractPm] = useState(false)
  const [subcontractorName, setSubcontractorName] = useState('')
  const [subcontractorContact, setSubcontractorContact] = useState('')
  const [subcontractScope, setSubcontractScope] = useState('')

  // Calibration (CAL) State
  const [requiresCalibration, setRequiresCalibration] = useState(false)
  const [calibrationFrequency, setCalibrationFrequency] = useState('ทุก 1 ปี (Annual)')
  const [lastCalibrationDate, setLastCalibrationDate] = useState('')
  const [nextCalibrationDate, setNextCalibrationDate] = useState('')
  const [calibrationLab, setCalibrationLab] = useState('')
  const [calibrationCertNo, setCalibrationCertNo] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleMachineCodeChange = (val: string) => {
    const code = val.toUpperCase()
    setMachineCode(code)
    const resolved = resolveDepartmentAndAreaFromCode(code)
    if (resolved) {
      setDepartmentName(resolved.department)
      if (!productionArea || productionArea === 'Warehouse' || productionArea === 'Mixing Area' || productionArea === 'Packing Area' || productionArea === 'QC LAB' || productionArea === 'RD LAB' || productionArea === 'Utility Building' || productionArea === 'Production Area') {
        setProductionArea(resolved.area)
      }
    }
  }

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
        serial_number: serialNumber,
        supplier,
        asset_id: assetId,
        maintenance_instruction: instruction,
        // Subcontract PM
        is_subcontract_pm: isSubcontractPm,
        subcontractor_name: subcontractorName,
        subcontractor_contact: subcontractorContact,
        subcontract_scope: subcontractScope,
        // Calibration
        requires_calibration: requiresCalibration,
        calibration_frequency: calibrationFrequency,
        last_calibration_date: lastCalibrationDate || undefined,
        next_calibration_date: nextCalibrationDate || undefined,
        calibration_lab: calibrationLab,
        calibration_cert_no: calibrationCertNo
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
      <DialogContent className="max-w-3xl sm:max-w-3xl w-[92vw] p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
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
                onChange={e => handleMachineCodeChange(e.target.value)}
                placeholder="เช่น MX-05, BLA-MM-002"
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700">สังกัด / แผนก</label>
                {machineCode && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    ⚡ Auto
                  </span>
                )}
              </div>
              <select
                value={departmentName}
                onChange={e => setDepartmentName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-stone-50 border border-stone-200 text-stone-800"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
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

          {/* Supplier, Asset ID & Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">ผู้จำหน่าย (Supplier)</label>
              <Input
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="เช่น อุดมทรัพย์, PNP SCALE"
                className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">เลขทรัพย์สิน (Asset ID)</label>
              <Input
                value={assetId}
                onChange={e => setAssetId(e.target.value)}
                placeholder="เช่น AST-MIX-005"
                className="h-10 text-xs font-mono rounded-xl bg-stone-50 border-stone-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Serial Number</label>
              <Input
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="เช่น SN-2025-001"
                className="h-10 text-xs font-mono rounded-xl bg-stone-50 border-stone-200"
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

          {/* SUBCONTRACT / OUTSOURCE PM SECTION */}
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800 font-bold shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">การบำรุงรักษาโดยผู้รับเหมาภายนอก (Subcontract PM)</h4>
                  <p className="text-[11px] text-stone-500">สำหรับเครื่องจักรที่ไม่มี PM โดยฝ่าย MT เองเนื่องจากจ้างซัพพลายเออร์/ผู้รับเหมาภายนอก</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-purple-200 shadow-xs shrink-0">
                <input
                  type="checkbox"
                  checked={isSubcontractPm}
                  onChange={e => setIsSubcontractPm(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-stone-300 focus:ring-purple-500"
                />
                <span className="text-xs font-bold text-purple-900">
                  {isSubcontractPm ? '🏢 จ้าง Subcontract ดูแล' : '🔧 ฝ่าย MT ภายในดูแลเอง'}
                </span>
              </label>
            </div>

            {isSubcontractPm && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100">
                <div>
                  <label className="text-[11px] font-medium text-stone-700 block mb-1">
                    ชื่อผู้รับเหมา / ซัพพลายเออร์ที่ดูแล *
                  </label>
                  <Input
                    value={subcontractorName}
                    onChange={e => setSubcontractorName(e.target.value)}
                    placeholder="เช่น บจก. พีเอ็นพี แมชชีนเนอรี่"
                    className="h-9 text-xs rounded-xl bg-white border-purple-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-700 block mb-1">
                    เบอร์ติดต่อ / สัญญาบริการ
                  </label>
                  <Input
                    value={subcontractorContact}
                    onChange={e => setSubcontractorContact(e.target.value)}
                    placeholder="เช่น 02-123-4567"
                    className="h-9 text-xs rounded-xl bg-white border-purple-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-700 block mb-1">
                    ขอบเขตงานบริการ
                  </label>
                  <Input
                    value={subcontractScope}
                    onChange={e => setSubcontractScope(e.target.value)}
                    placeholder="เช่น PM ทุก 6 เดือน พร้อมเปลี่ยนอะไหล่"
                    className="h-9 text-xs rounded-xl bg-white border-purple-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CALIBRATION (CAL) SECTION */}
          <div className="p-4 bg-cyan-50/60 rounded-2xl border border-cyan-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-800 font-bold shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">การสอบเทียบเครื่องมือวัดและอุปกรณ์ (Calibration - CAL)</h4>
                  <p className="text-[11px] text-stone-500">สำหรับเครื่องชั่ง, เกจวัดแรงดัน, เซ็นเซอร์อุณหภูมิ/ความชื้น, ตู้อบ</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-cyan-200 shadow-xs shrink-0">
                <input
                  type="checkbox"
                  checked={requiresCalibration}
                  onChange={e => setRequiresCalibration(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded border-stone-300 focus:ring-cyan-500"
                />
                <span className="text-xs font-bold text-cyan-900">
                  {requiresCalibration ? '🎯 เครื่องนี้ต้องสอบเทียบ (CAL)' : 'ไม่ต้องสอบเทียบ'}
                </span>
              </label>
            </div>

            {requiresCalibration && (
              <div className="space-y-3 pt-2 border-t border-cyan-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      ความถี่การสอบเทียบ (CAL)
                    </label>
                    <select
                      value={calibrationFrequency}
                      onChange={e => setCalibrationFrequency(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl bg-white border border-cyan-200 font-medium text-stone-800"
                    >
                      <option value="ทุก 3 เดือน (Quarterly)">ทุก 3 เดือน (Quarterly)</option>
                      <option value="ทุก 6 เดือน (Semi-Annual)">ทุก 6 เดือน (Semi-Annual)</option>
                      <option value="ทุก 1 ปี (Annual)">ทุก 1 ปี (Annual)</option>
                      <option value="ทุก 2 ปี (Bi-Annual)">ทุก 2 ปี (Bi-Annual)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-cyan-700" />
                      <span>วันที่สอบเทียบล่าสุด</span>
                    </label>
                    <Input
                      type="date"
                      value={lastCalibrationDate}
                      onChange={e => setLastCalibrationDate(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-white border-cyan-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-rose-600" />
                      <span>กำหนดสอบเทียบครั้งถัดไป</span>
                    </label>
                    <Input
                      type="date"
                      value={nextCalibrationDate}
                      onChange={e => setNextCalibrationDate(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-white border-cyan-200 font-mono font-bold text-rose-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      สถาบัน / ผู้ให้บริการสอบเทียบ
                    </label>
                    <Input
                      value={calibrationLab}
                      onChange={e => setCalibrationLab(e.target.value)}
                      placeholder="เช่น สถาบันมาตรวิทยาแห่งชาติ (NIMT)"
                      className="h-9 text-xs rounded-xl bg-white border-cyan-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-stone-700 block mb-1">
                      เลขที่ใบรับรองการสอบเทียบ
                    </label>
                    <Input
                      value={calibrationCertNo}
                      onChange={e => setCalibrationCertNo(e.target.value)}
                      placeholder="เช่น CAL-2025-0819"
                      className="h-9 text-xs font-mono rounded-xl bg-white border-cyan-200"
                    />
                  </div>
                </div>
              </div>
            )}
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
