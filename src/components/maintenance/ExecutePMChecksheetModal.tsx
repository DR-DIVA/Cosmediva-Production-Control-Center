'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  FileCheck, 
  Calendar,
  UserCheck,
  Wrench
} from 'lucide-react'
import { MaintenancePMPlan, getPmFrequencyInfo } from '@/types/maintenance'
import { submitPMChecksheet } from '@/app/actions/maintenance'

interface ExecutePMChecksheetModalProps {
  isOpen: boolean
  onClose: () => void
  plan: MaintenancePMPlan | null
  technicianName?: string
  onSuccess: () => void
}

export default function ExecutePMChecksheetModal({
  isOpen,
  onClose,
  plan,
  technicianName,
  onSuccess
}: ExecutePMChecksheetModalProps) {
  if (!plan) return null

  const checklistItems = Array.isArray(plan.checklist_template) ? plan.checklist_template : []
  const freq = getPmFrequencyInfo(plan.frequency_type, plan.frequency_interval)

  const [execTechName, setExecTechName] = useState(technicianName || 'ช่างยะ ปิยะราช รามมา')
  const [isEditingTech, setIsEditingTech] = useState(false)

  // Results state for each checklist item
  const [results, setResults] = useState<{ [index: number]: { status: 'PASS' | 'REMARK' | 'FAIL'; remark: string } }>(
    () => {
      const init: any = {}
      checklistItems.forEach((_, idx) => {
        init[idx] = { status: 'PASS', remark: '' }
      })
      return init
    }
  )

  const [overallStatus, setOverallStatus] = useState<'PASSED' | 'PASSED_WITH_REMARKS' | 'FAILED'>('PASSED')
  const [generalNotes, setGeneralNotes] = useState('')
  const [ownerSignName, setOwnerSignName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStatusChange = (idx: number, status: 'PASS' | 'REMARK' | 'FAIL') => {
    setResults(prev => ({
      ...prev,
      [idx]: { ...prev[idx], status }
    }))

    // Auto-update overall status if any fail or remark
    const updated = { ...results, [idx]: { ...results[idx], status } }
    const hasFail = Object.values(updated).some(v => v.status === 'FAIL')
    const hasRemark = Object.values(updated).some(v => v.status === 'REMARK')

    if (hasFail) setOverallStatus('FAILED')
    else if (hasRemark) setOverallStatus('PASSED_WITH_REMARKS')
    else setOverallStatus('PASSED')
  }

  const handleRemarkChange = (idx: number, remark: string) => {
    setResults(prev => ({
      ...prev,
      [idx]: { ...prev[idx], remark }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ownerSignName.trim()) {
      toast.error('กรุณาระบุชื่อหัวหน้าแผนกผู้เป็นเจ้าของเครื่อง เพื่อลงนามรับมอบงาน PM')
      return
    }

    setIsSubmitting(true)
    try {
      const checklistPayload = checklistItems.map((chk, idx) => ({
        item: chk.item,
        standard: chk.standard,
        status: results[idx]?.status || 'PASS',
        remark: results[idx]?.remark || ''
      }))

      const res = await submitPMChecksheet({
        planId: plan.id,
        technicianName: execTechName,
        executionNotes: generalNotes,
        checklistResults: checklistPayload,
        overallStatus,
        ownerSignName: ownerSignName.trim()
      })

      if (res.success) {
        toast.success(res.message || 'บันทึกรายงานผลตรวจเช็ค PM สำเร็จ!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto font-sans">
        <DialogHeader className="text-left border-b border-stone-150 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                  {plan.plan_code}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${freq.color}`}>
                  {freq.full}
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-black text-stone-900 mt-1">
                E-Form รายงานผลการตรวจเช็ค PM ประจำรอบ
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 mt-0.5">
                {plan.machine_code} - {plan.machine_name}
              </DialogDescription>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] text-stone-400 block">ช่างผู้ตรวจเช็ค:</span>
              {isEditingTech ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="text"
                    value={execTechName}
                    onChange={e => setExecTechName(e.target.value)}
                    className="h-7 text-xs w-48"
                    placeholder="พิมพ์ชื่อช่างผู้ตรวจ"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingTech(false)}
                    className="text-[11px] font-bold px-2 py-1 bg-stone-900 text-white rounded-md"
                  >
                    ตกลง
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-xs text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg">
                    {execTechName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTech(true)}
                    className="text-[10px] text-cyan-700 hover:underline font-medium"
                  >
                    (เปลี่ยน)
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Safety Precaution Alert */}
          {plan.safety_requirements && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <b className="font-bold">ข้อควรระวังความปลอดภัยในการทำงาน (Safety Note):</b>
                <p className="mt-0.5 text-[11px] text-amber-800">{plan.safety_requirements}</p>
              </div>
            </div>
          )}

          {/* Checklist Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#D4AF37]" />
                รายการตรวจเช็คตามมาตรฐาน ({checklistItems.length} ข้อ)
              </h3>
              <span className="text-[11px] text-stone-400">เลือกผลตรวจเช็คทุกข้อ</span>
            </div>

            {checklistItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                ไม่มีรายการตรวจเช็คย่อย ให้ตรวจเช็คสภาพทั่วไปของเครื่องจักร
              </div>
            ) : (
              <div className="space-y-2.5">
                {checklistItems.map((chk, idx) => {
                  const current = results[idx] || { status: 'PASS', remark: '' }
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition ${
                        current.status === 'PASS' ? 'bg-stone-50/80 border-stone-200' :
                        current.status === 'REMARK' ? 'bg-amber-50/60 border-amber-300' :
                        'bg-red-50/60 border-red-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs text-stone-900">{chk.item}</span>
                          </div>
                          <div className="text-[11px] text-stone-500 pl-7 space-y-0.5">
                            <div><span className="text-stone-400">วิธีการตรวจ:</span> {chk.method}</div>
                            <div><span className="text-stone-400">เกณฑ์มาตรฐาน:</span> <b className="text-stone-700">{chk.standard}</b></div>
                          </div>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(idx, 'PASS')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              current.status === 'PASS'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ผ่าน</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(idx, 'REMARK')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              current.status === 'REMARK'
                                ? 'bg-amber-500 text-stone-950 shadow-xs'
                                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>ข้อสังเกต</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(idx, 'FAIL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              current.status === 'FAIL'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>ไม่ผ่าน</span>
                          </button>
                        </div>
                      </div>

                      {/* Remark Input if Remark or Fail */}
                      {current.status !== 'PASS' && (
                        <div className="mt-2.5 pt-2 border-t border-stone-200/60 pl-7">
                          <Input
                            placeholder="ระบุข้อสังเกต หรือสาเหตุที่ไม่ผ่าน..."
                            value={current.remark}
                            onChange={e => handleRemarkChange(idx, e.target.value)}
                            className="h-8 text-xs bg-white rounded-xl border-stone-300"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Overall Status & Notes */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-stone-700">
                สรุปผลการตรวจเช็คภาพรวม (Overall PM Result)
              </label>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  overallStatus === 'PASSED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  overallStatus === 'PASSED_WITH_REMARKS' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {overallStatus === 'PASSED' ? '✅ ผ่านเกณฑ์มาตรฐานสมบูรณ์' :
                   overallStatus === 'PASSED_WITH_REMARKS' ? '⚠️ ผ่านเกณฑ์โดยมีข้อสังเกต' :
                   '❌ ไม่ผ่านเกณฑ์ (ต้องแจ้งเปิดใบซ่อมแก้ไข)'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-stone-500 block mb-1">
                ความคิดเห็นช่างซ่อมบำรุง / รายละเอียดเพิ่มเติม
              </label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
                placeholder="เช่น ทำความสะอาดหัวฉีด เปลี่ยนโอริง และหยอดน้ำมันหล่อลื่นเรียบร้อย เครื่องเดินเงียบเป็นปกติ..."
                className="w-full p-2.5 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          {/* Owner Handoff & Sign-off (Mandatory) */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border-2 border-blue-200 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>ส่งมอบงานและลงนามรับมอบงาน PM โดยแผนกผู้เป็นเจ้าของเครื่อง (Owner Sign-off)</span>
            </div>
            <p className="text-[11px] text-blue-800">
              เมื่อเสร็จสิ้นการตรวจเช็ค ให้ส่งมอบงานแก่หัวหน้าแผนกผู้เป็นเจ้าของเครื่องเพื่อตรวจรับสภาพและลงนามรับมอบงาน
            </p>
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                ชื่อหัวหน้าแผนก / เจ้าของเครื่องผู้ลงนามรับมอบงาน <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="เช่น หัวหน้าแผนกบรรจุ (Packing Supervisor), คุณสมคิด..."
                value={ownerSignName}
                onChange={e => setOwnerSignName(e.target.value)}
                className="h-9 text-xs bg-white rounded-xl border-blue-300 font-medium"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs rounded-xl border-stone-300"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs font-bold bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl px-5 h-10 shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : '✅ บันทึกส่งมอบงาน PM'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
