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

  const currentOption = FREQUENCY_OPTIONS.find(f => f.type === plan.frequency_type) || FREQUENCY_OPTIONS[0]
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl text-slate-100 relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <h3 className="text-lg font-bold text-white">ปรับเปลี่ยนความถี่รอบ PM (Preventive Maintenance)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              แผนงาน: <span className="text-cyan-400 font-mono font-medium">{plan.plan_code}</span> | เครื่องจักร: <span className="text-white font-medium">{plan.machine_code}</span> ({plan.machine_name})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Machine Info Bar */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-750 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">รอบความถี่เดิม:</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-slate-700 text-cyan-300 font-medium font-mono">
                {plan.frequency_type} ({plan.frequency_interval} เดือน)
              </span>
            </div>
            <div>
              <span className="text-slate-400">วันครบกำหนดเดิม:</span>
              <span className="ml-2 text-white font-mono">{plan.next_due_date || 'ไม่ได้ระบุ'}</span>
            </div>
          </div>

          {/* New Frequency Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              เลือกรอบความถี่ใหม่ที่ต้องการปรับแก้ <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleFrequencyChange(opt.type)}
                    className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm shadow-cyan-900/30 ring-1 ring-cyan-500'
                        : 'border-slate-800 bg-slate-850 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-sm">{opt.label}</span>
                      {isSelected && <span className="text-cyan-400 text-xs">✓ เลือกอยู่</span>}
                    </div>
                    <span className="text-[11px] text-slate-400">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Next Due Date & Responsible Person */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                วันครบกำหนดรอบถัดไป (Next Due Date)
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                ผู้ทำการปรับเปลี่ยน (Adjusted By)
              </label>
              <input
                type="text"
                value={adjustedBy}
                onChange={(e) => setAdjustedBy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Mandatory Reason Section */}
          <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️</span> เหตุผลในการปรับเปลี่ยนความถี่รอบ PM <span className="text-red-400">(จำเป็นต้องระบุเสมอ *)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {reason.trim().length}/5 ตัวอักษรขั้นต่ำ
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลทางวิศวกรรม/การผลิตในการปรับรอบ เช่น เครื่องจักรเดินกำลังต่อเนื่อง, มีประวัติเสียบ่อย, หรือเครื่องสำรอง..."
              className={`w-full bg-slate-900 border rounded-lg p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${
                reason.trim().length > 0 && reason.trim().length < 5
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500'
              }`}
            />

            {/* Quick Reason Chips */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">หรือคลิกเลือกเหตุผลมาตรฐานที่พบบ่อย:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReason(r)}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-cyan-300 border border-slate-700 transition text-left"
                  >
                    + {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison summary preview */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-center gap-3 text-xs">
            <span className="text-slate-400">รอบเดิม:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-medium">
              {plan.frequency_type}
            </span>
            <span className="text-cyan-400 font-bold">➔</span>
            <span className="text-slate-400">รอบใหม่ที่บันทึก:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-700 text-cyan-300 font-mono font-semibold">
              {selectedType}
            </span>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-xs text-red-200">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-700 text-xs text-emerald-200">
              ✓ {successMsg}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                isSubmitting || reason.trim().length < 5
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
