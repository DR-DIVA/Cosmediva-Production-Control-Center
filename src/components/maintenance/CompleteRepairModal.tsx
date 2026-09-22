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
  'ระบบกลไก (Mechanical)',
  'ระบบไฟฟ้า (Electrical)',
  'ระบบลม (Pneumatic)',
  'เซนเซอร์ (Sensor)',
  'มอเตอร์ / เกียร์ขับ (Motor & Drive)',
  'ลูกปืน / เพลา (Bearing)',
  'หัวจ่าย / กระบอกสูบ / ซีล (Nozzle & Seal)',
  'สายพานลำเลียง (Conveyor)',
  'PLC / จอควบคุม (PLC & HMI)',
  'ฮีตเตอร์ / ความร้อน (Heating)',
  'ระบบความเย็น (Cooling)',
  'เครื่องพิมพ์วันที่ / ติดฉลาก (Coder & Labeler)',
  'ระบบไฮดรอลิกส์ (Hydraulic)',
  'ระบบสาธารณูปโภค (Utility)',
  'โครงสร้าง / เซฟตี้ (Structure & Safety)',
  'อื่นๆ (Other)'
]

const ROOT_CAUSES: RootCauseCategory[] = [
  'สึกหรอตามอายุการใช้งาน',
  'น็อต / สกรู / ข้อต่อคลายตัว',
  'ขาดการหล่อลื่น / จารบีแห้ง',
  'สิ่งสกปรก / วัตถุดิบอุดตัน',
  'เซนเซอร์สกปรก / เคลื่อนตำแหน่ง',
  'ชิ้นส่วนแตกหัก / หักงอ / ชำรุด',
  'สายไฟชำรุด / ช็อต / ฟิวส์ขาด',
  'ปรับตั้งเครื่องไม่ถูกต้อง / คลาดเคลื่อน',
  'ชิ้นงานติดขัดในระบบ',
  'การใช้งานผิดวิธี',
  'ใช้งานเกินกำลัง (Overload)',
  'ปัญหาจากการล้างทำความสะอาด',
  'รั่วซึม / ลมรั่ว / ซีลฉีกขาด',
  'ฮีตเตอร์ขาด / อุณหภูมิผิดปกติ',
  'ไม่ได้รับการบำรุงรักษาตามรอบ PM',
  'ปัญหาคุณภาพอะไหล่ / โครงสร้างเครื่อง',
  'ไม่ทราบสาเหตุแน่ชัด'
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
  const [category, setCategory] = useState('ระบบกลไก (Mechanical)')
  const [rootCause, setRootCause] = useState<RootCauseCategory>('สึกหรอตามอายุการใช้งาน')
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
          ? 'ซ่อมเบื้องต้นเสร็จสิ้น ส่งต่อให้ผู้แจ้งซ่อมทดลองเดินเครื่อง (Test Run)' 
          : 'ช่างบันทึกซ่อมเสร็จสมบูรณ์ รอผู้แจ้งซ่อมตรวจรับ (Verify)'
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
      <DialogContent className="max-w-4xl w-full p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[94vh] sm:max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-300 shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-xl font-bold text-stone-900 leading-snug">
                {targetStatus === 'TEST_RUN' ? 'บันทึกการซ่อม & ขอทดสอบเครื่อง (TEST RUN)' : 'บันทึกสรุปผลงานซ่อม (COMPLETE JOB)'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-stone-500 font-medium truncate">
                เครื่อง <span className="font-bold text-stone-800">{machineCode}</span> ({machineName}) • บันทึกรวดเร็วด้วยการเลือกชิป หรือพิมพ์ระบุ
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          {/* LEFT COLUMN: Categories & Root Causes */}
          <div className="space-y-4">
            {/* 1. Problem Category Chips */}
            <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80 space-y-2">
              <label className="text-xs font-extrabold text-stone-700 uppercase tracking-wider block">
                1. หมวดหมู่ปัญหา (Problem Category):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {PROBLEM_CATEGORIES.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      category === c
                        ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Quick Root Cause Chips */}
            <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80 space-y-2">
              <label className="text-xs font-extrabold text-stone-700 uppercase tracking-wider block">
                2. สาเหตุหลัก (Root Cause - เลือก 1 ข้อ):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                {ROOT_CAUSES.map(rc => (
                  <button
                    type="button"
                    key={rc}
                    onClick={() => setRootCause(rc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      rootCause === rc
                        ? 'bg-[#D4AF37] text-stone-950 font-bold border-[#D4AF37] shadow-sm'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {rc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Actions, Recommendations & Evidence */}
          <div className="space-y-4">
            {/* 3. Corrective Action (Required) */}
            <div className="space-y-2 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80">
              <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wider block">
                3. สิ่งที่ดำเนินการแก้ไข (Corrective Action) <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  'เปลี่ยนลูกปืนใหม่และตั้งศูนย์',
                  'เปลี่ยนชุด Mechanical Seal',
                  'ปรับตั้งตำแหน่งเซนเซอร์และขันแน่น',
                  'ขันแน่นน็อต/จุดยึดที่คลายตัว',
                  'แก้ไขสายลมรั่ว/เปลี่ยนข้อต่อลม',
                  'ล้างทำความสะอาดหัวจ่าย/กำจัดสิ่งอุดตัน',
                  'ทำความสะอาดคราบและหล่อลื่น',
                  'เปลี่ยนสายพานขับ'
                ].map(preset => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setCorrectiveAction(preset)}
                    className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors font-medium"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
              <Input
                value={correctiveAction}
                onChange={e => setCorrectiveAction(e.target.value)}
                placeholder="เช่น เปลี่ยนตลับลูกปืน SKF 6205 และอัดจารบีทนความร้อน"
                className="text-xs sm:text-sm h-11 rounded-xl bg-white border-stone-300 focus:border-[#D4AF37]"
                required
              />
            </div>

            {/* 4. Preventive Recommendation */}
            <div className="space-y-2 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80">
              <label className="text-xs font-extrabold text-stone-700 uppercase tracking-wider block">
                4. ข้อเสนอแนะเพื่อป้องกันการเกิดซ้ำ (Preventive Recommendation):
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  'ตรวจสอบการคลายตัวของน็อตใน PM ประจำเดือน',
                  'เพิ่มรอบอัดจารบี/ตรวจระดับการหล่อลื่น',
                  'ย้ำเตือนพนักงานทำความสะอาดหลังจบกะ',
                  'เตรียมสั่งอะไหล่สำรอง (Buffer Stock)'
                ].map(rec => (
                  <button
                    type="button"
                    key={rec}
                    onClick={() => setPreventiveRec(rec)}
                    className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors font-medium"
                  >
                    + {rec}
                  </button>
                ))}
              </div>
              <Input
                value={preventiveRec}
                onChange={e => setPreventiveRec(e.target.value)}
                placeholder="เช่น เพิ่มรอบตรวจสอบการคลายตัวของน็อตใน PM ประจำเดือน"
                className="text-xs sm:text-sm h-11 rounded-xl bg-white border-stone-200 focus:border-blue-400"
              />
            </div>

            {/* 5. Photo After Repair */}
            <div className="space-y-2 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80">
              <label className="text-xs font-extrabold text-stone-700 uppercase tracking-wider block">
                5. ภาพถ่ายหลังการซ่อม (Photo After Repair):
              </label>
              <label className="h-12 rounded-xl border-2 border-dashed border-stone-300 hover:border-[#D4AF37] hover:bg-amber-50/40 flex items-center justify-center gap-2 text-xs font-bold text-stone-700 cursor-pointer transition-colors bg-white">
                <Camera className="w-4 h-4 text-[#D4AF37]" />
                <span>{photoAfter ? 'เปลี่ยนรูปภาพหลังซ่อม' : 'ถ่ายรูป / แนบรูปหลังซ่อม (ถ้ามี)'}</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
              </label>

              {photoAfter && (
                <div className="relative rounded-xl overflow-hidden border border-stone-200 max-h-36 w-full bg-black flex items-center justify-center mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoAfter} alt="After Preview" className="max-h-36 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-stone-200 mt-2">
          <Button variant="outline" size="lg" onClick={onClose} className="w-full sm:w-1/3 text-xs sm:text-sm font-bold rounded-xl h-11 sm:h-12 border-stone-300">
            ยกเลิก / ปิด
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="w-full sm:w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm h-11 sm:h-12 rounded-xl shadow-lg shadow-emerald-900/20"
          >
            {isSubmitting ? 'กำลังบันทึก...' : targetStatus === 'TEST_RUN' ? 'ยืนยันเริ่ม TEST RUN' : 'ยืนยันปิดงานซ่อม (COMPLETE)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
