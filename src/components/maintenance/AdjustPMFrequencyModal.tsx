'use client'

import React, { useState } from 'react'
import { MaintenancePMPlan } from '@/types/maintenance'
import { adjustPMPlanFrequency } from '@/app/actions/maintenance'

interface Props {
  isOpen: boolean
  onClose: () => void
  plan: MaintenancePMPlan | null
  onSuccess?: () => void
}

const FREQUENCY_OPTIONS = [
  { type: 'Monthly', interval: 1, label: 'รายเดือน (PM1)', desc: 'เข้าตรวจเช็คทุกๆ 1 เดือน (12 ครั้ง/ปี)' },
  { type: 'Every 2 Months', interval: 2, label: 'ทุก 2 เดือน (PM2)', desc: 'เข้าตรวจเช็คทุกๆ 2 เดือน (6 ครั้ง/ปี)' },
  { type: 'Quarterly', interval: 3, label: 'รายไตรมาส (PM3)', desc: 'เข้าตรวจเช็คทุกๆ 3 เดือน (4 ครั้ง/ปี)' },
  { type: 'Every 4 Months', interval: 4, label: 'ทุก 4 เดือน (PM4)', desc: 'เข้าตรวจเช็คทุกๆ 4 เดือน (3 ครั้ง/ปี)' },
  { type: 'BiAnnually', interval: 6, label: 'รายครึ่งปี (PM6)', desc: 'เข้าตรวจเช็คทุกๆ 6 เดือน (2 ครั้ง/ปี)' },
  { type: 'Yearly', interval: 12, label: 'รายปี (PM12)', desc: 'เข้าตรวจเช็คใหญ่ประจำปี (1 ครั้ง/ปี)' }
]

const QUICK_REASONS = [
  'เครื่องจักรมีประวัติ Breakdown บ่อย จึงเพิ่มความถี่ในการบำรุงรักษา',
  'เครื่องจักรเดินกำลังการผลิตหนักต่อเนื่อง (Heavy Duty Running)',
  'เครื่องจักรสำรอง (Standby) อัตราการใช้งานต่ำ จึงลดรอบความถี่ลง',
  'ปรับตามคู่มือคำแนะนำและรอบอายุอะไหล่ของผู้ผลิต (OEM Spec)',
  'ปรับรอบให้ตรงกับช่วง Planned Maintenance & Big Cleaning โรงงาน'
]

export default function AdjustPMFrequencyModal({ isOpen, onClose, plan, onSuccess }: Props) {
  if (!isOpen || !plan) return null

  const [selectedType, setSelectedType] = useState<string>(plan.frequency_type || 'Monthly')
  const [selectedInterval, setSelectedInterval] = useState<number>(plan.frequency_interval || 1)
  const [nextDueDate, setNextDueDate] = useState<string>(plan.next_due_date || new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState<string>('')
  const [adjustedBy, setAdjustedBy] = useState<string>('หัวหน้าแผนกซ่อมบำรุง (Maintenance Supervisor)')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleFrequencyChange = (type: string) => {
    const opt = FREQUENCY_OPTIONS.find(f => f.type === type)
    if (opt) {
      setSelectedType(opt.type)
      setSelectedInterval(opt.interval)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!reason || reason.trim().length < 5) {
      setErrorMsg('⚠️ กรุณาระบุเหตุผลในการปรับเปลี่ยนความถี่รอบ PM เสมอ (จำเป็นต้องระบุอย่างน้อย 5 ตัวอักษร เพื่อบันทึกประวัติการตรวจสอบ)')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await adjustPMPlanFrequency({
        planId: plan.id,
        newFrequencyType: selectedType,
        newFrequencyInterval: selectedInterval,
        newDueDate: nextDueDate,
        reason: reason.trim(),
        adjustedByName: adjustedBy
      })

      if (res.success) {
        setSuccessMsg(res.message || 'บันทึกเรียบร้อยแล้ว')
        setTimeout(() => {
          if (onSuccess) onSuccess()
          onClose()
        }, 1200)
      } else {
        setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดของระบบ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-xl p-6 shadow-2xl text-stone-900 relative max-h-[92vh] flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <h3 className="text-lg font-black text-stone-950">ปรับเปลี่ยนความถี่รอบ PM</h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              แผนงาน: <span className="text-cyan-700 font-mono font-bold">{plan.plan_code}</span> | เครื่องจักร: <span className="text-stone-900 font-bold">{plan.machine_code}</span> ({plan.machine_name})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 p-1.5 rounded-xl hover:bg-stone-100 transition font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Machine Info Bar */}
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-500 font-medium">รอบความถี่เดิม:</span>
              <span className="ml-2 px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-800 font-bold font-mono">
                {plan.frequency_type} ({plan.frequency_interval} เดือน)
              </span>
            </div>
            <div>
              <span className="text-stone-500 font-medium">วันครบกำหนดเดิม:</span>
              <span className="ml-2 text-stone-900 font-mono font-bold">{plan.next_due_date || 'ไม่ได้ระบุ'}</span>
            </div>
          </div>

          {/* New Frequency Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              เลือกรอบความถี่ใหม่ที่ต้องการปรับแก้ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleFrequencyChange(opt.type)}
                    className={`p-3 rounded-2xl text-left border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#D4AF37] bg-amber-50/80 text-stone-950 shadow-xs ring-1 ring-[#D4AF37]'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs sm:text-sm text-stone-900">{opt.label}</span>
                      {isSelected && <span className="text-[#8B7355] font-black text-xs">✓ เลือกอยู่</span>}
                    </div>
                    <span className="text-[11px] text-stone-500">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Next Due Date & Responsible Person */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                วันครบกำหนดรอบถัดไป
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#D4AF37] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                ผู้ทำการปรับเปลี่ยน
              </label>
              <input
                type="text"
                value={adjustedBy}
                onChange={(e) => setAdjustedBy(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#D4AF37] font-medium"
              />
            </div>
          </div>

          {/* Mandatory Reason Section */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️</span> เหตุผลในการปรับเปลี่ยนรอบ PM <span className="text-red-600">(จำเป็นต้องระบุเสมอ *)</span>
              </label>
              <span className="text-[11px] text-stone-500 font-mono">
                {reason.trim().length}/5 ตัวอักษรขั้นต่ำ
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลทางวิศวกรรม/การผลิตในการปรับรอบ เช่น เครื่องจักรเดินกำลังต่อเนื่อง, มีประวัติเสียบ่อย, หรือเครื่องสำรอง..."
              className={`w-full bg-white border rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none transition ${
                reason.trim().length > 0 && reason.trim().length < 5
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-stone-300 focus:border-[#D4AF37]'
              }`}
            />

            {/* Quick Reason Chips */}
            <div>
              <span className="text-[11px] text-stone-600 font-medium block mb-1.5">หรือคลิกเลือกเหตุผลมาตรฐานที่พบบ่อย:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReason(r)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-950 border border-stone-200 transition text-left"
                  >
                    + {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison summary preview */}
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-center gap-3 text-xs">
            <span className="text-stone-500 font-medium">รอบเดิม:</span>
            <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 font-mono font-bold">
              {plan.frequency_type}
            </span>
            <span className="text-[#8B7355] font-bold">➔</span>
            <span className="text-stone-500 font-medium">รอบใหม่ที่บันทึก:</span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-100 border border-cyan-300 text-cyan-900 font-mono font-black">
              {selectedType}
            </span>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
              ✓ {successMsg}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                isSubmitting || reason.trim().length < 5
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
                  : 'bg-[#D4AF37] hover:bg-[#b89528] text-stone-950 shadow-md active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin"></span>
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกการปรับเปลี่ยนความถี่รอบ PM'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
