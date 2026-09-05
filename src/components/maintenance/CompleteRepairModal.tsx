'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Camera, AlertCircle, Wrench, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { RootCauseCategory, WorkOrderStatus } from '@/types/maintenance'
import { transitionWorkOrderStatus } from '@/app/actions/maintenance'

interface CompleteRepairModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  machineCode: string
  machineName: string
  technicianName: string
  targetStatus: 'TEST_RUN' | 'COMPLETED'
  onSuccess?: () => void
}

const PROBLEM_CATEGORIES = [
  'Mechanical', 'Electrical', 'Pneumatic', 'Sensor', 'Motor', 'Bearing',
  'PLC', 'Hydraulic', 'Conveyor', 'Heating', 'Cooling', 'Utility', 'Other'
]

const ROOT_CAUSES: RootCauseCategory[] = [
  'Wear & Tear',
  'Loose Part',
  'Lack of Lubrication',
  'Sensor Failure',
  'Electrical Failure',
  'Part Lifetime',
  'Contamination',
  'Cleaning Issue',
  'Incorrect Setup',
  'Overload',
  'Improper Operation',
  'PM Missed',
  'Design Problem',
  'Unknown'
]

export default function CompleteRepairModal({
  isOpen,
  onClose,
  workOrderId,
  machineCode,
  machineName,
  technicianName,
  targetStatus,
  onSuccess
}: CompleteRepairModalProps) {
  const [category, setCategory] = useState('Mechanical')
  const [rootCause, setRootCause] = useState<RootCauseCategory>('Wear & Tear')
  const [diagnosis, setDiagnosis] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [preventiveRec, setPreventiveRec] = useState('')
  const [photoAfter, setPhotoAfter] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhotoAfter(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!correctiveAction.trim()) {
      toast.error('กรุณาระบุสิ่งที่แก้ไข เช่น เปลี่ยนลูกปืน, ขันน็อตยึด')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await transitionWorkOrderStatus({
        work_order_id: workOrderId,
        to_status: targetStatus,
        changed_by_name: technicianName || 'ช่างซ่อมบำรุง',
        problem_category: category,
        diagnosis: diagnosis || `ตรวจพบปัญหาเกี่ยวกับ ${category} (${rootCause})`,
        root_cause: rootCause,
        corrective_action: correctiveAction,
        preventive_recommendation: preventiveRec,
        photo_after_urls: photoAfter ? [photoAfter] : [],
        notes: targetStatus === 'TEST_RUN' 
          ? 'ซ่อมเบื้องต้นเสร็จสิ้น ส่งต่อให้ฝ่ายผลิตทดลองเดินเครื่อง (Test Run)' 
          : 'ช่างบันทึกซ่อมเสร็จสมบูรณ์ รอฝ่ายผลิตยืนยัน (Verify)'
      })

      if (res.success) {
        toast.success(targetStatus === 'TEST_RUN' ? 'ส่งทดสอบเครื่อง (TEST RUN) เรียบร้อย' : 'บันทึกปิดงานซ่อมเสร็จสิ้น')
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
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-300">
            <CheckCircle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-stone-900">
            {targetStatus === 'TEST_RUN' ? 'บันทึกการซ่อม & ขอทดสอบเครื่อง (TEST RUN)' : 'บันทึกสรุปผลงานซ่อม (COMPLETE JOB)'}
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            เครื่อง {machineCode} ({machineName}) • บันทึกรวดเร็วด้วยการเลือกชิป ไม่ต้องเขียนรายงานยาว
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* 1. Problem Category Chips */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
              หมวดหมู่ปัญหา (Problem Category):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PROBLEM_CATEGORIES.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    category === c
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Quick Root Cause Chips */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
              สาเหตุหลัก (Quick Root Cause - เลือก 1 ข้อ):
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 no-scrollbar">
              {ROOT_CAUSES.map(rc => (
                <button
                  type="button"
                  key={rc}
                  onClick={() => setRootCause(rc)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    rootCause === rc
                      ? 'bg-[#D4AF37] text-stone-900 font-bold border-[#D4AF37] shadow-sm'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {rc}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Corrective Action (Required) */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
              สิ่งที่ดำเนินการแก้ไข (Corrective Action) *
            </label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {['เปลี่ยนลูกปืนใหม่และตั้งศูนย์', 'เปลี่ยนชุด Mechanical Seal', 'ปรับตั้งตำแหน่งเซนเซอร์และขันแน่น', 'ทำความสะอาดคราบและหล่อลื่น', 'เปลี่ยนสายพานขับ'].map(preset => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setCorrectiveAction(preset)}
                  className="text-[10px] bg-amber-50 text-amber-900 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
            <Input
              value={correctiveAction}
              onChange={e => setCorrectiveAction(e.target.value)}
              placeholder="เช่น เปลี่ยนตลับลูกปืน SKF 6205 และอัดจารบีทนความร้อน"
              className="text-xs h-10 rounded-xl bg-stone-50 border-stone-300"
              required
            />
          </div>

          {/* 4. Preventive Recommendation */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
              ข้อเสนอแนะเพื่อป้องกันการเกิดซ้ำ (Preventive Recommendation):
            </label>
            <Input
              value={preventiveRec}
              onChange={e => setPreventiveRec(e.target.value)}
              placeholder="เช่น เพิ่มรอบตรวจสอบการคลายตัวของน็อตใน PM ประจำเดือน"
              className="text-xs h-10 rounded-xl bg-stone-50 border-stone-200"
            />
          </div>

          {/* 5. Photo After Repair */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
              ภาพถ่ายหลังการซ่อม (Photo After Repair):
            </label>
            <label className="h-11 rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#D4AF37] hover:bg-amber-50/40 flex items-center justify-center gap-2 text-xs font-bold text-stone-600 cursor-pointer transition-colors">
              <Camera className="w-4 h-4 text-[#D4AF37]" />
              <span>{photoAfter ? 'เปลี่ยนรูปภาพหลังซ่อม' : 'ถ่ายรูป / แนบรูปหลังซ่อม'}</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            </label>

            {photoAfter && (
              <div className="relative rounded-xl overflow-hidden border border-stone-200 max-h-28 w-full bg-black flex items-center justify-center mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoAfter} alt="After Preview" className="max-h-28 object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-3 border-t border-stone-100 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 text-xs">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl shadow-lg shadow-emerald-900/20"
          >
            {isSubmitting ? 'กำลังบันทึก...' : targetStatus === 'TEST_RUN' ? 'ยืนยันเริ่ม TEST RUN' : 'ยืนยันปิดงานซ่อม (COMPLETE)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
