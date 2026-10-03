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
  Printer,
  FileSpreadsheet,
  LayoutGrid,
  ExternalLink
} from 'lucide-react'
import { MaintenancePMPlan, getPmFrequencyInfo } from '@/types/maintenance'
import { submitPMChecksheet } from '@/app/actions/maintenance'
import { 
  getPMChecksheetTemplate, 
  PM_FORM_CODE, 
  PM_FORM_REVISION,
  PM_FORM_TITLE,
  PMChecklistItem 
} from '@/lib/pmChecksheetCatalog'
import DCCPMChecksheetPaper from '@/components/maintenance/DCCPMChecksheetPaper'

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

  // Primary view: DCC_EXCEL (Exact replica of original Excel DCC form)
  const [viewMode, setViewMode] = useState<'DCC_EXCEL' | 'MOBILE_CARDS'>('DCC_EXCEL')
  const [execTechName, setExecTechName] = useState(technicianName || 'ช่างยะ ปิยะราช รามมา')
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
      <DialogContent className="max-w-5xl sm:max-w-5xl w-[98vw] p-4 sm:p-6 rounded-3xl bg-stone-100 shadow-2xl border border-stone-300 max-h-[95vh] overflow-y-auto font-sans print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white print:max-h-none print:w-full print:max-w-none">
        
        {/* Print Styles for Pixel-Perfect A4 Form */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
            body, html {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              width: 100% !important;
              max-width: 100% !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            div[role="dialog"] > div {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              max-height: none !important;
              overflow: visible !important;
              width: 100% !important;
              max-width: 100% !important;
              background: white !important;
            }
            .print\\:hidden, button, header, nav, [class*="DialogHeader"] {
              display: none !important;
            }
            .dcc-pm-sheet {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />

        {/* Top Action Toolbar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>แบบฟอร์ม DCC: MT-PF-001E</span>
            </span>
            <span className="font-mono text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg">
              {plan.machine_code} - {template.machineName || plan.machine_name}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${freq.color}`}>
              {freq.full}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="bg-stone-100 p-1 rounded-xl flex items-center text-xs">
              <button
                type="button"
                onClick={() => setViewMode('DCC_EXCEL')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'DCC_EXCEL'
                    ? 'bg-white text-stone-950 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>แบบฟอร์ม Excel เดิม</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MOBILE_CARDS')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'MOBILE_CARDS'
                    ? 'bg-white text-stone-950 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-700" />
                <span>มุมมองการ์ด</span>
              </button>
            </div>

            {/* Print Button */}
            <Button
              type="button"
              onClick={() => window.print()}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>พิมพ์เอกสาร A4</span>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* VIEW MODE 1: EXACT DCC EXCEL TEMPLATE */}
          {viewMode === 'DCC_EXCEL' && (
            <div className="bg-white rounded-2xl border border-stone-300 shadow-md p-2 sm:p-5 overflow-x-auto print:border-none print:shadow-none print:p-0">
              <DCCPMChecksheetPaper
                template={template}
                plan={plan}
                results={results}
                onScoreChange={handleScoreChange}
                onReadingChange={handleReadingChange}
                readinessStatus={readinessStatus}
                onReadinessChange={setReadinessStatus}
                generalNotes={generalNotes}
                onGeneralNotesChange={setGeneralNotes}
                execTechName={execTechName}
                onTechNameChange={setExecTechName}
                ownerSignName={ownerSignName}
                onOwnerSignNameChange={setOwnerSignName}
              />
            </div>
          )}

          {/* VIEW MODE 2: MOBILE FRIENDLY CARDS */}
          {viewMode === 'MOBILE_CARDS' && (
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-stone-700">รายการตรวจเช็ค ({checklistItems.length} ข้อ)</span>
                <span className="text-xs text-stone-400">ติ๊กเลือก 1 (ปกติ) / 2 (เฝ้าระวัง) / 3 (ซ่อมด่วน)</span>
              </div>

              <div className="space-y-2">
                {checklistItems.map((chk, idx) => {
                  const current = results[chk.id] || { score: 1, status: 'PASS', remark: '', readings: {} }
                  return (
                    <div
                      key={chk.id}
                      className={`p-3 rounded-xl border text-xs transition ${
                        current.score === 1 ? 'bg-stone-50 border-stone-200' :
                        current.score === 2 ? 'bg-amber-50/60 border-amber-300' :
                        'bg-rose-50/60 border-rose-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-stone-200 font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-stone-900">{chk.item}</span>
                          </div>
                          <div className="text-[11px] text-stone-500 pl-7">{chk.standard}</div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleScoreChange(chk.id, 1)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs ${
                              current.score === 1 ? 'bg-emerald-600 text-white' : 'bg-white border text-stone-700'
                            }`}
                          >
                            1 ปกติ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleScoreChange(chk.id, 2)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs ${
                              current.score === 2 ? 'bg-amber-500 text-stone-950' : 'bg-white border text-stone-700'
                            }`}
                          >
                            2 เฝ้าระวัง
                          </button>
                          <button
                            type="button"
                            onClick={() => handleScoreChange(chk.id, 3)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs ${
                              current.score === 3 ? 'bg-rose-600 text-white' : 'bg-white border text-stone-700'
                            }`}
                          >
                            3 ซ่อมด่วน
                          </button>
                        </div>
                      </div>

                      {current.score > 1 && (
                        <div className="mt-2 pt-2 border-t border-stone-200/60 pl-7">
                          <Input
                            placeholder="ระบุข้อสังเกต หรือสาเหตุที่ต้องซ่อมด่วน..."
                            value={current.remark}
                            onChange={e => handleRemarkChange(chk.id, e.target.value)}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Signatures in card view */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">ผู้ส่งมอบ (ช่างผู้ตรวจ):</label>
                  <Input
                    value={execTechName}
                    onChange={e => setExecTechName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">ผู้รับมอบ (หัวหน้าแผนก): *</label>
                  <Input
                    required
                    value={ownerSignName}
                    onChange={e => setOwnerSignName(e.target.value)}
                    placeholder="พิมพ์ชื่อผู้รับมอบ"
                    className="h-8 text-xs border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Level 3 Defect Alert & Auto Breakdown Ticket prompt */}
          {scoreCounts.defect > 0 && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 text-xs print:hidden">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>พบข้อบกพร่องระดับ 3 (ซ่อมหรือแก้ไขโดยด่วน) {scoreCounts.defect} รายการ</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 pl-6">
                <input
                  type="checkbox"
                  checked={autoCreateBreakdown}
                  onChange={e => setAutoCreateBreakdown(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600"
                />
                <span>เปิดใบแจ้งซ่อมด่วน (Breakdown Ticket MT-PF-001D) อัตโนมัติทันที</span>
              </label>
            </div>
          )}

          {/* Bottom Action Footer (Hidden on Print) */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200 print:hidden">
            <span className="text-xs text-stone-500">
              สถานะ: <b className={readinessStatus === 'READY' ? 'text-emerald-700' : 'text-rose-700'}>
                {readinessStatus === 'READY' ? '🟢 พร้อมใช้งาน' : '🔴 ไม่พร้อมใช้งาน'}
              </b>
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs rounded-xl border-stone-300 h-9"
              >
                ปิดหน้าต่าง
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
