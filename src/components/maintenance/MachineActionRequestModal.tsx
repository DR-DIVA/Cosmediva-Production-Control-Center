'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldCheck, FileCheck, ArrowRight, CheckCircle2, AlertCircle, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { createMachineRequest } from '@/app/actions/maintenance'
import { MachineRequestType, MaintenanceMachine } from '@/types/maintenance'

interface Props {
  isOpen: boolean
  onClose: () => void
  initialMachine?: MaintenanceMachine | null
  initialType?: MachineRequestType
  onSuccess?: () => void
}

const REQUEST_CASES: {
  type: MachineRequestType
  title: string
  subtitle: string
  icon: string
  color: string
  badge: string
}[] = [
  {
    type: 'NEW_MACHINE',
    title: '1. ขอเพิ่มเครื่องจักรใหม่',
    subtitle: 'ขึ้นทะเบียนเครื่องจักรใหม่เข้าไลน์การผลิตเพื่อออกรหัส Asset & QR',
    icon: '➕',
    color: 'border-blue-300 bg-blue-50/50 text-blue-900',
    badge: 'NEW ASSET'
  },
  {
    type: 'DECOMMISSION',
    title: '2. ขอยกเลิกใช้ / ปลดระวาง',
    subtitle: 'ขอจำหน่าย เลิกใช้งาน หรือถอดออกจากทะเบียนเครื่องจักร (Scrap / Disposal)',
    icon: '🚫',
    color: 'border-red-300 bg-red-50/50 text-red-900',
    badge: 'SCRAP'
  },
  {
    type: 'RELOCATE',
    title: '3. ขอโอนย้ายสังกัด / แผนก / พื้นที่',
    subtitle: 'ย้ายเครื่องจักรข้ามแผนก เช่น จาก Mixing ไป Packing หรือเปลี่ยนห้องผลิต',
    icon: '🔄',
    color: 'border-purple-300 bg-purple-50/50 text-purple-900',
    badge: 'TRANSFER'
  },
  {
    type: 'OTHER',
    title: '4. ขอกรณีอื่นๆ / ดัดแปลงสเปก',
    subtitle: 'ดัดแปลงโครงสร้างเครื่องจักร เปลี่ยนอะไหล่สเปกพิเศษ หรือปรับปรุงระบบ',
    icon: '⚙️',
    color: 'border-amber-300 bg-amber-50/50 text-amber-900',
    badge: 'MODIFICATION'
  }
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

export default function MachineActionRequestModal({
  isOpen,
  onClose,
  initialMachine,
  initialType = 'DECOMMISSION',
  onSuccess
}: Props) {
  const [requestType, setRequestType] = useState<MachineRequestType>(initialType)
  const [machineCode, setMachineCode] = useState('')
  const [machineName, setMachineName] = useState('')
  const [currentDept, setCurrentDept] = useState('')
  const [currentLocation, setCurrentLocation] = useState('')
  const [targetDept, setTargetDept] = useState('')
  const [targetLocation, setTargetLocation] = useState('')
  const [category, setCategory] = useState('Mixing')
  const [criticality, setCriticality] = useState<'A' | 'B' | 'C'>('B')
  const [reason, setReason] = useState('')
  const [requestedByName, setRequestedByName] = useState('หัวหน้าแผนก (Supervisor)')
  const [requestedByDept, setRequestedByDept] = useState('ฝ่ายผลิต (Production)')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate data when modal opens or machine changes
  useEffect(() => {
    if (initialType) setRequestType(initialType)

    if (initialMachine) {
      setMachineCode(initialMachine.machine_code || '')
      setMachineName(initialMachine.machine_name || '')
      setCurrentDept(initialMachine.department_name || '')
      setCurrentLocation(initialMachine.production_area || '')
      setCategory(initialMachine.category || 'Mixing')
      setCriticality((initialMachine.criticality as 'A' | 'B' | 'C') || 'B')
    } else {
      if (initialType === 'NEW_MACHINE') {
        setMachineCode('')
        setMachineName('')
        setCurrentDept('')
        setCurrentLocation('')
      }
    }
  }, [initialMachine, initialType, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!machineCode.trim() || !machineName.trim()) {
      toast.error('กรุณาระบุรหัสและชื่อเครื่องจักร')
      return
    }

    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('กรุณาระบุเหตุผลความจำเป็นในการขอดำเนินการอย่างน้อย 5 ตัวอักษร')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createMachineRequest({
        request_type: requestType,
        machine_id: initialMachine?.id || null,
        machine_code: machineCode.trim().toUpperCase(),
        machine_name: machineName.trim(),
        current_department: currentDept,
        current_location: currentLocation,
        target_department: targetDept || currentDept,
        target_location: targetLocation,
        proposed_machine_data: {
          category,
          criticality,
          department_name: targetDept || currentDept,
          production_area: targetLocation || currentLocation
        },
        reason: reason.trim(),
        requested_by_name: requestedByName.trim(),
        requested_by_dept: requestedByDept
      })

      if (res.success) {
        toast.success(res.message || 'ยื่นคำร้องดำเนินการเกี่ยวกับเครื่องจักรเรียบร้อยแล้ว!')
        setReason('')
        onSuccess?.()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการส่งคำร้อง')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถยื่นคำร้องได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full p-0 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto font-sans">
        
        {/* DCC Standard Header */}
        <div className="bg-stone-900 text-white p-5 rounded-t-3xl border-b border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]">
                <FileCheck className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 block">
                  DCC FORM REF: MT-PF-002 • REV.00
                </span>
                <h3 className="text-base font-black text-white">
                  ใบคำร้องขอดำเนินการเกี่ยวกับเครื่องจักร (Machine Action Request)
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] font-mono font-black uppercase">
              Controlled E-Form
            </span>
          </div>
          <p className="text-xs text-stone-300 mt-2">
            ตามข้อกำหนด GMP / ISO 22716 ทุกการเพิ่ม, ปลดระวาง, โอนย้าย หรือดัดแปลงเครื่องจักรต้องผ่านการอนุมัติจากผู้มีอำนาจก่อนดำเนินการ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* 1. Selection of 4 Request Types */}
          <div>
            <label className="text-xs font-black text-stone-800 uppercase tracking-wide block mb-2">
              1. เลือกประเภทการขอดำเนินการ (เลือก 1 กรณี) <span className="text-red-500">*</span>:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REQUEST_CASES.map(c => {
                const isSelected = requestType === c.type
                return (
                  <button
                    key={c.type}
                    type="button"
                    onClick={() => setRequestType(c.type)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? `${c.color} border-2 shadow-xs ring-1 ring-stone-900`
                        : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{c.icon}</span>
                        <span>{c.title}</span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-black text-[#8B7355] bg-white px-1.5 py-0.2 rounded-full border border-stone-200">
                          ✓ เลือกอยู่
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 leading-tight">
                      {c.subtitle}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Machine Details */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <span className="text-xs font-black text-stone-800 uppercase tracking-wide block">
              2. ข้อมูลเครื่องจักรที่ขอดำเนินการ:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">รหัสเครื่องจักร *</label>
                <Input
                  value={machineCode}
                  onChange={e => setMachineCode(e.target.value.toUpperCase())}
                  placeholder="เช่น AFILL-PK-001"
                  className="h-10 text-xs font-mono font-bold rounded-xl bg-white border-stone-300"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-stone-700 block mb-1">ชื่อเครื่องจักร *</label>
                <Input
                  value={machineName}
                  onChange={e => setMachineName(e.target.value)}
                  placeholder="เช่น เครื่องบรรจุหลอดกึ่งอัตโนมัติ"
                  className="h-10 text-xs font-bold rounded-xl bg-white border-stone-300"
                  required
                />
              </div>
            </div>

            {/* If Relocate, show current vs target */}
            {requestType === 'RELOCATE' && (
              <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
                <span className="text-[11px] font-bold text-purple-900 block">
                  🔄 ระบุแผนกและพื้นที่ปลายทางที่ต้องการย้ายไป:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-stone-600 block mb-1">แผนกปลายทาง (Target Dept)</label>
                    <select
                      value={targetDept}
                      onChange={e => setTargetDept(e.target.value)}
                      className="w-full h-9 px-2.5 text-xs rounded-xl bg-white border border-stone-300 text-stone-800 font-medium"
                    >
                      <option value="">-- เลือกแผนกปลายทาง --</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-600 block mb-1">ห้อง / พื้นที่ติดตั้งใหม่</label>
                    <Input
                      value={targetLocation}
                      onChange={e => setTargetLocation(e.target.value)}
                      placeholder="เช่น Cleanroom Mixing Hall B"
                      className="h-9 text-xs rounded-xl bg-white border-stone-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* If New Machine, show department and location */}
            {requestType === 'NEW_MACHINE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-stone-600 block mb-1">ฝ่าย / แผนกที่สังกัด</label>
                  <select
                    value={targetDept}
                    onChange={e => setTargetDept(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs rounded-xl bg-white border border-stone-300 text-stone-800 font-medium"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-stone-600 block mb-1">ห้องติดตั้ง / พื้นที่ (Area)</label>
                  <Input
                    value={targetLocation}
                    onChange={e => setTargetLocation(e.target.value)}
                    placeholder="เช่น Cleanroom Room 2"
                    className="h-9 text-xs rounded-xl bg-white border-stone-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Mandatory Reason */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>📝</span> 3. เหตุผลและความจำเป็นในการขอดำเนินการ <span className="text-red-500">*</span>:
              </label>
              <span className="text-[11px] text-stone-400 font-mono">
                {reason.trim().length}/5 ตัวอักษรขั้นต่ำ
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={
                requestType === 'DECOMMISSION' 
                  ? 'ระบุสาเหตุที่ขอยกเลิกใช้ เช่น เครื่องจักรชำรุดซ่อมไม่คุ้มค่า, มีเครื่องจักรใหม่ทดแทน, ปลดระวางตามอายุการใช้งาน...'
                  : requestType === 'NEW_MACHINE'
                  ? 'ระบุวัตถุประสงค์ในการจัดซื้อ/ขึ้นทะเบียนใหม่ เช่น ขยายกำลังการผลิตไลน์หลอด, รองรับสินค้าใหม่...'
                  : requestType === 'RELOCATE'
                  ? 'ระบุเหตุผลการโอนย้าย เช่น ปรับผังโรงงาน (Plant Layout), ย้ายไปสนับสนุนกะการผลิตแผนกอื่น...'
                  : 'ระบุรายละเอียดคำร้องและเหตุผลความจำเป็น...'
              }
              className={`w-full p-3 text-xs rounded-xl bg-stone-50 border font-sans text-stone-900 focus:bg-white focus:outline-none transition ${
                reason.trim().length > 0 && reason.trim().length < 5
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-stone-300 focus:border-[#D4AF37]'
              }`}
            />
          </div>

          {/* 4. Workflow Sign-off (Requester & Approver) */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <span className="text-xs font-black text-stone-800 uppercase tracking-wide block mb-2">
              4. สายอนุมัติและผู้ลงนาม (Approval Workflow):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-700">ผู้ขอดำเนินการ (Requester):</span>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                    ขั้นตอนที่ 1
                  </span>
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 block mb-0.5">ชื่อ-นามสกุล / ตำแหน่ง *</label>
                  <Input
                    value={requestedByName}
                    onChange={e => setRequestedByName(e.target.value)}
                    className="h-8 text-xs bg-stone-50 border-stone-300 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 block mb-0.5">แผนกที่สังกัด</label>
                  <Input
                    value={requestedByDept}
                    onChange={e => setRequestedByDept(e.target.value)}
                    className="h-8 text-xs bg-stone-50 border-stone-300"
                  />
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-700">ผู้อนุมัติขั้นสุดท้าย (Final Approver):</span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                    ขั้นตอนที่ 2
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 space-y-1">
                  <div className="font-bold text-xs text-stone-900">Plant Director (PDT)</div>
                  <div className="text-[11px] text-stone-500">ผู้อำนวยการโรงงาน / ผู้มีอำนาจลงนาม eQMS</div>
                  <div className="text-[10px] text-[#8B7355] font-semibold">
                    * เมื่อผู้อนุมัติกด Approve ระบบจะอัปเดตทะเบียนเครื่องจักรให้อัตโนมัติทันที
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-10 rounded-xl"
            >
              ยกเลิก
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className="text-xs h-10 px-6 font-black bg-stone-900 hover:bg-stone-800 text-[#D4AF37] rounded-xl shadow-md gap-2"
            >
              {isSubmitting ? 'กำลังส่งคำร้อง...' : 'ยื่นคำร้องขอดำเนินการ (Submit MT-PF-002)'}
            </Button>
          </div>

        </form>

      </DialogContent>
    </Dialog>
  )
}
