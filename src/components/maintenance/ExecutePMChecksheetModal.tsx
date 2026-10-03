'use client'

import React, { useState, useMemo } from 'react'
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
  UserCheck, 
  Wrench,
  Zap,
  Thermometer,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { MaintenancePMPlan, getPmFrequencyInfo } from '@/types/maintenance'
import { submitPMChecksheet } from '@/app/actions/maintenance'
import { 
  getPMChecksheetTemplate, 
  PM_FORM_CODE, 
  PMChecklistItem 
} from '@/lib/pmChecksheetCatalog'

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

  // 1. Resolve template dynamically based on machine code
  const template = useMemo(() => {
    return getPMChecksheetTemplate(
      plan.machine_code,
      plan.machine_name,
      Array.isArray(plan.checklist_template) ? plan.checklist_template : []
    )
  }, [plan.machine_code, plan.machine_name, plan.checklist_template])

  const checklistItems: PMChecklistItem[] = template.items
  const freq = getPmFrequencyInfo(plan.frequency_type, plan.frequency_interval)

  const [execTechName, setExecTechName] = useState(technicianName || 'ช่างยะ ปิยะราช รามมา')
  const [isEditingTech, setIsEditingTech] = useState(false)
  const [ownerSignName, setOwnerSignName] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [readinessStatus, setReadinessStatus] = useState<'READY' | 'NOT_READY'>('READY')
  const [autoCreateBreakdown, setAutoCreateBreakdown] = useState(true)
  const [breakdownNotes, setBreakdownNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Results state for each item (key by item id)
  const [results, setResults] = useState<{
    [itemId: number]: {
      score: 1 | 2 | 3
      status: 'PASS' | 'REMARK' | 'FAIL'
      remark: string
      readings: Record<string, string>
    }
  }>(() => {
    const init: any = {}
    checklistItems.forEach(item => {
      init[item.id] = {
        score: 1,
        status: 'PASS',
        remark: '',
        readings: {}
      }
    })
    return init
  })

  // Group items by category
  const categories = useMemo(() => {
    const cats: { [cat: string]: PMChecklistItem[] } = {}
    checklistItems.forEach(item => {
      const cat = item.category || 'ตรวจเช็คทั่วไป'
      if (!cats[cat]) cats[cat] = []
      cats[cat].push(item)
    })
    return Object.entries(cats).map(([name, items]) => ({ name, items }))
  }, [checklistItems])

  // Count scores
  const scoreCounts = useMemo(() => {
    let pass = 0
    let caution = 0
    let defect = 0
    Object.values(results).forEach(r => {
      if (r.score === 1) pass++
      else if (r.score === 2) caution++
      else if (r.score === 3) defect++
    })
    return { pass, caution, defect }
  }, [results])

  const overallStatus = useMemo(() => {
    if (scoreCounts.defect > 0) return 'FAILED'
    if (scoreCounts.caution > 0) return 'PASSED_WITH_REMARKS'
    return 'PASSED'
  }, [scoreCounts])

  const handleScoreChange = (itemId: number, score: 1 | 2 | 3) => {
    const statusMap: Record<number, 'PASS' | 'REMARK' | 'FAIL'> = {
      1: 'PASS',
      2: 'REMARK',
      3: 'FAIL'
    }
    const newStatus = statusMap[score]

    setResults(prev => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          score,
          status: newStatus
        }
      }

      if (score === 3) {
        setReadinessStatus('NOT_READY')
      } else {
        const hasAnyFail = Object.values(updated).some(v => v.score === 3)
        if (!hasAnyFail && readinessStatus === 'NOT_READY') {
          setReadinessStatus('READY')
        }
      }

      return updated
    })
  }

  const handleReadingChange = (itemId: number, field: string, val: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        readings: {
          ...(prev[itemId]?.readings || {}),
          [field]: val
        }
      }
    }))
  }

  const handleRemarkChange = (itemId: number, remark: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        remark
      }
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
      const checklistPayload = checklistItems.map(chk => {
        const res = results[chk.id] || { score: 1, status: 'PASS', remark: '', readings: {} }
        return {
          item: chk.item,
          standard: chk.standard,
          status: res.status,
          remark: res.remark,
          score: res.score,
          readings: res.readings
        }
      })

      const res = await submitPMChecksheet({
        planId: plan.id,
        technicianName: execTechName,
        executionNotes: generalNotes,
        checklistResults: checklistPayload,
        overallStatus,
        ownerSignName: ownerSignName.trim(),
        readinessStatus,
        createBreakdownTicket: scoreCounts.defect > 0 && autoCreateBreakdown,
        breakdownNotes
      })

      if (res.success) {
        toast.success(
          res.message || 'บันทึกรายงานผลตรวจเช็ค PM สำเร็จ! ข้อมูลถูกสรุปลงแบบฟอร์ม DCC เรียบร้อยแล้ว'
        )
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
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[96vw] p-5 sm:p-7 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[94vh] overflow-y-auto font-sans">
        
        {/* Header - Checklist Mode */}
        <DialogHeader className="text-left border-b border-stone-200 pb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                  {plan.plan_code}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${freq.color}`}>
                  {freq.full}
                </span>
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                  แบบฟอร์ม DCC: {PM_FORM_CODE}
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-black text-stone-900 mt-1 flex items-center gap-2">
                <span>Checklist ตรวจเช็คบำรุงรักษาเครื่องจักรประจำรอบ</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-600 mt-0.5">
                <b className="font-bold text-stone-900">{plan.machine_code}</b> - {template.machineName || plan.machine_name} 
                <span className="text-stone-400 mx-1.5">•</span>
                <span className="text-stone-500">พื้นที่: {template.location || 'ฝ่ายผลิต'}</span>
              </DialogDescription>
            </div>

            {/* Technician Info */}
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] text-stone-400 block">ช่างผู้ตรวจเช็ค:</span>
              {isEditingTech ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="text"
                    value={execTechName}
                    onChange={e => setExecTechName(e.target.value)}
                    className="h-7 text-xs w-44"
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          {/* Safety Alert Note */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b className="font-bold">ข้อควรระวังความปลอดภัยในการทำงาน (Safety Note):</b>
              <p className="mt-0.5 text-[11px] text-amber-800">
                {plan.safety_requirements || 'ตัดกระแสไฟฟ้าก่อนเริ่มงาน (Lockout/Tagout), สวมถุงมือนิรภัยและแว่นตาเซฟตี้'}
              </p>
            </div>
          </div>

          {/* Standard 3-Tier Rating Guide */}
          <div className="grid grid-cols-3 gap-2 p-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-center font-bold">
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">1</span>
              <span>ใช้งานได้ปกติ</span>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] flex items-center justify-center">2</span>
              <span>ระมัดระวังการใช้งาน</span>
            </div>
            <div className="p-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center">3</span>
              <span>ซ่อมหรือแก้ไขด่วน</span>
            </div>
          </div>

          {/* Checklist Items Grouped by Category */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#D4AF37]" />
                รายการตรวจเช็คตามข้อกำหนด ({checklistItems.length} ข้อ)
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ปกติ: {scoreCounts.pass}
                </span>
                {scoreCounts.caution > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    เฝ้าระวัง: {scoreCounts.caution}
                  </span>
                )}
                {scoreCounts.defect > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                    ซ่อมด่วน: {scoreCounts.defect}
                  </span>
                )}
              </div>
            </div>

            {categories.map((cat) => (
              <div key={cat.name} className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                {/* Category Header */}
                <div className="px-4 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-700"></span>
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium">
                    {cat.items.length} รายการ
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-stone-100">
                  {cat.items.map((item) => {
                    const current = results[item.id] || { score: 1, status: 'PASS', remark: '', readings: {} }
                    const hasReadings = Boolean(item.readings)

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 transition ${
                          current.score === 1 ? 'hover:bg-stone-50/60' :
                          current.score === 2 ? 'bg-amber-50/50' :
                          'bg-rose-50/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Item Details */}
                          <div className="space-y-1 sm:max-w-[60%]">
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-md bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {item.id}
                              </span>
                              <div>
                                <div className="font-bold text-xs text-stone-900 leading-snug">
                                  {item.item}
                                </div>
                                <div className="text-[11px] text-stone-500 mt-0.5">
                                  <span className="text-stone-400">เกณฑ์มาตรฐาน:</span> {item.standard}
                                </div>
                              </div>
                            </div>

                            {/* Inline Technical Measurement Inputs */}
                            {hasReadings && item.readings && (
                              <div className="mt-2 pl-7 flex flex-wrap items-center gap-2 p-2 bg-stone-100/80 rounded-xl border border-stone-200 text-xs">
                                {item.readings.type === 'amp_uvw' ? (
                                  <>
                                    <span className="font-bold text-stone-700 flex items-center gap-1 text-[11px]">
                                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                                      วัดกระแสไฟฟ้า (Amp):
                                    </span>
                                    {item.readings.fields.map(phase => (
                                      <div key={phase} className="flex items-center gap-1">
                                        <span className="font-bold text-stone-600 text-[11px]">{phase}:</span>
                                        <Input
                                          type="text"
                                          placeholder="0.0"
                                          value={current.readings?.[phase] || ''}
                                          onChange={e => handleReadingChange(item.id, phase, e.target.value)}
                                          className="w-16 h-7 text-xs bg-white text-center font-mono font-bold"
                                        />
                                        <span className="text-stone-400 text-[10px]">A</span>
                                      </div>
                                    ))}
                                  </>
                                ) : item.readings.type === 'temperature' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-700 flex items-center gap-1 text-[11px]">
                                      <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                                      อุณหภูมิความร้อน:
                                    </span>
                                    <Input
                                      type="text"
                                      placeholder="เช่น 45.0"
                                      value={current.readings?.['temp'] || ''}
                                      onChange={e => handleReadingChange(item.id, 'temp', e.target.value)}
                                      className="w-20 h-7 text-xs bg-white text-center font-mono font-bold"
                                    />
                                    <span className="text-stone-600 font-bold text-[11px]">°C</span>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* 1 / 2 / 3 Score Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleScoreChange(item.id, 1)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                current.score === 1
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                              }`}
                            >
                              <span className="font-mono font-black text-xs">1</span>
                              <span>ปกติ</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleScoreChange(item.id, 2)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                current.score === 2
                                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                              }`}
                            >
                              <span className="font-mono font-black text-xs">2</span>
                              <span>ระมัดระวัง</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleScoreChange(item.id, 3)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                current.score === 3
                                  ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                              }`}
                            >
                              <span className="font-mono font-black text-xs">3</span>
                              <span>ซ่อมด่วน</span>
                            </button>
                          </div>
                        </div>

                        {/* Remark input if score 2 or 3 */}
                        {current.score > 1 && (
                          <div className="mt-2 pt-2 border-t border-stone-200/60 pl-7">
                            <Input
                              placeholder={
                                current.score === 3 
                                  ? '⚠️ ระบุอาการชำรุด หรือสาเหตุที่ต้องซ่อมด่วน (ระบบจะนำไปเปิดใบแจ้งซ่อม)...'
                                  : 'ระบุข้อสังเกตเพื่อเฝ้าระวังในรอบถัดไป...'
                              }
                              value={current.remark}
                              onChange={e => handleRemarkChange(item.id, e.target.value)}
                              className={`h-8 text-xs bg-white rounded-xl ${
                                current.score === 3 ? 'border-rose-400 focus:ring-rose-400' : 'border-amber-300'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Level 3 Defect Warning & Auto-Ticket */}
          {scoreCounts.defect > 0 && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>พบข้อบกพร่องระดับ 3 (ซ่อมหรือแก้ไขโดยด่วน) {scoreCounts.defect} รายการ</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 pl-6">
                <input
                  type="checkbox"
                  checked={autoCreateBreakdown}
                  onChange={e => setAutoCreateBreakdown(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span>เปิดใบแจ้งซ่อมด่วน (Breakdown Ticket MT-PF-001D) อัตโนมัติทันที</span>
              </label>
              {autoCreateBreakdown && (
                <div className="pl-6">
                  <Input
                    placeholder="ระบุข้อคิดเห็นการแจ้งซ่อมด่วนเพิ่มเติม (ถ้ามี)..."
                    value={breakdownNotes}
                    onChange={e => setBreakdownNotes(e.target.value)}
                    className="h-8 text-xs bg-white rounded-xl border-rose-300"
                  />
                </div>
              )}
            </div>
          )}

          {/* Machine Readiness & Additional Notes */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <label className="text-xs font-bold text-stone-800">
                สถานะความพร้อมของเครื่องจักรหลังตรวจเช็ค (Machine Readiness)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                  <input
                    type="radio"
                    name="modal_readiness"
                    checked={readinessStatus === 'READY'}
                    onChange={() => setReadinessStatus('READY')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>🟢 เรียบร้อย / พร้อมใช้งาน</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-bold text-rose-800 cursor-pointer">
                  <input
                    type="radio"
                    name="modal_readiness"
                    checked={readinessStatus === 'NOT_READY'}
                    onChange={() => setReadinessStatus('NOT_READY')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>🔴 ไม่พร้อมใช้งาน / รอตรวจสอบแก้ไข</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                รายละเอียดต้องการให้แก้ไขปรับปรุงเพิ่มเติม / ข้อคิดเห็นช่าง
              </label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
                placeholder="เช่น ตรวจสอบความตึงสายพาน เปลี่ยนสารหล่อลื่น และเช็ดทำความสะอาดรอบเครื่องเรียบร้อย..."
                className="w-full p-2 text-xs bg-white rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-cyan-700"
              />
            </div>
          </div>

          {/* Sign-off Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 text-xs">
            <div>
              <span className="font-bold text-blue-900 block mb-1">ผู้ส่งมอบ (ช่างผู้ตรวจ):</span>
              <div className="p-2 bg-white rounded-xl border border-blue-200 font-bold text-stone-800">
                {execTechName}
              </div>
            </div>

            <div>
              <span className="font-bold text-blue-900 block mb-1">
                ผู้รับมอบ (หัวหน้าแผนกผู้เป็นเจ้าของเครื่อง): <span className="text-red-500">*</span>
              </span>
              <Input
                required
                placeholder="พิมพ์ชื่อหัวหน้าแผนกผู้รับมอบ..."
                value={ownerSignName}
                onChange={e => setOwnerSignName(e.target.value)}
                className="h-9 text-xs bg-white border-blue-300 font-medium"
              />
            </div>
          </div>

          {/* Footer Info & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-200">
            <div className="text-[11px] text-stone-500">
              💡 เมื่อกดบันทึก ผลการตรวจและค่าที่วัดได้จะถูกนำไปสรุปลงใน <b>แบบฟอร์ม DCC (MT-PF-001E)</b> อัตโนมัติ
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs rounded-xl border-stone-300 h-9"
              >
                ยกเลิก
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl px-5 h-9 shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'กำลังบันทึก...' : '✅ บันทึกส่งมอบงาน PM'}</span>
              </Button>
            </div>
          </div>

        </form>

      </DialogContent>
    </Dialog>
  )
}
