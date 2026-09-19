'use client'

import React, { useState } from 'react'
import { MaintenancePMPlan, MaintenancePMAdjustmentLog, getPmFrequencyInfo } from '@/types/maintenance'
import AdjustPMFrequencyModal from '@/components/maintenance/AdjustPMFrequencyModal'
import { Calendar, ShieldCheck, History, Sliders } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  pmPlan: MaintenancePMPlan | null
  pmAdjustmentLogs: MaintenancePMAdjustmentLog[]
  machineCode: string
}

export default function MachinePMSection({ pmPlan, pmAdjustmentLogs, machineCode }: Props) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!pmPlan) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-base sm:text-lg font-black text-stone-900">
              แผนซ่อมบำรุงเชิงป้องกัน (Preventive Maintenance - PM 2026)
            </h2>
          </div>
        </div>
        <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl border border-stone-200">
          ยังไม่ได้ผูกแผน PM สำหรับเครื่อง {machineCode}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
      {/* Header with adjust button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#D4AF37]" />
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900">
              แผนซ่อมบำรุงเชิงป้องกัน (Preventive Maintenance - PM 2026)
            </h2>
            <div className="text-xs text-stone-500 font-mono mt-0.5">
              รหัสแผน: <span className="font-bold text-[#8B7355]">{pmPlan.plan_code}</span> | {pmPlan.plan_name}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2A2521] text-white hover:bg-[#3A332B] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Sliders className="w-4 h-4 text-[#D4AF37]" />
          <span>⚙️ ปรับความถี่รอบ PM (พร้อมบันทึกเหตุผล)</span>
        </button>
      </div>

      {/* Plan Status & Interval Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
          <span className="text-stone-400 block font-medium">รอบความถี่ปัจจุบัน</span>
          <span className="text-sm font-black text-stone-800 font-mono mt-0.5 block">
            {getPmFrequencyInfo(pmPlan.frequency_type, pmPlan.frequency_interval).full}
          </span>
        </div>

        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
          <span className="text-stone-400 block font-medium">กำหนดการครั้งถัดไป</span>
          <span className="text-sm font-black text-cyan-700 font-mono mt-0.5 block">
            {pmPlan.next_due_date || 'ตามรอบปี'}
          </span>
        </div>

        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
          <span className="text-stone-400 block font-medium">เวลาตรวจเช็คประมาณการ</span>
          <span className="text-sm font-black text-stone-800 font-mono mt-0.5 block">
            {pmPlan.estimated_minutes || 60} นาที
          </span>
        </div>

        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
          <span className="text-stone-400 block font-medium">ประวัติการปรับรอบ</span>
          <span className="text-sm font-black text-amber-700 font-mono mt-0.5 block">
            {pmAdjustmentLogs.length} ครั้ง (บันทึก Audit แล้ว)
          </span>
        </div>
      </div>

      {/* Checklist Template */}
      {Array.isArray(pmPlan.checklist_template) && pmPlan.checklist_template.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>รายการตรวจสอบมาตรฐาน (PM Checklist - {pmPlan.checklist_template.length} ข้อ)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {pmPlan.checklist_template.map((chk: any, idx: number) => (
              <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-stone-800 flex items-start gap-1.5">
                    <span className="text-emerald-600 shrink-0">✓</span>
                    <span>{chk.item}</span>
                  </div>
                  {chk.standard && (
                    <div className="text-[11px] text-stone-500 mt-1 pl-4">
                      มาตรฐาน: <b className="text-stone-700">{chk.standard}</b>
                    </div>
                  )}
                </div>
                {chk.method && (
                  <div className="text-[10px] text-stone-400 mt-1 pl-4">
                    วิธีตรวจ: {chk.method}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit History Logs for this machine */}
      {pmAdjustmentLogs.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
            <History className="w-4 h-4 text-[#D4AF37]" />
            <span>ประวัติการปรับเปลี่ยนความถี่รอบ PM ของเครื่องนี้ ({pmAdjustmentLogs.length} รายการ)</span>
          </div>
          <div className="space-y-2">
            {pmAdjustmentLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-stone-800">
                      ปรับจาก <span className="font-mono text-stone-600">{log.old_frequency_type}</span> ➔ <span className="font-mono text-cyan-800 font-black">{log.new_frequency_type}</span>
                    </span>
                    <span className="text-stone-400">• โดย {log.adjusted_by_name}</span>
                  </div>
                  <span className="text-stone-400 font-mono">
                    {new Date(log.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-stone-800 font-medium bg-white p-2 rounded-lg border border-amber-200">
                  <span className="text-amber-800 font-bold">เหตุผล: </span>
                  {log.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <AdjustPMFrequencyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={pmPlan}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
