'use client'

import React, { useState } from 'react'
import { Printer, Share2, ArrowLeft, CheckCircle2, ShieldCheck, Clock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MaintenancePMPlan } from '@/types/maintenance'
import { getPMChecksheetTemplate } from '@/lib/pmChecksheetCatalog'
import DCCPMChecksheetPaper from '@/components/maintenance/DCCPMChecksheetPaper'

interface Props {
  plan: MaintenancePMPlan
  latestExecution?: any
}

export default function DCCPMChecksheetStandalone({ plan, latestExecution }: Props) {
  const template = getPMChecksheetTemplate(
    plan.machine_code,
    plan.machine_name,
    Array.isArray(plan.checklist_template) ? plan.checklist_template : []
  )

  const [execTechName, setExecTechName] = useState(
    latestExecution?.technicianName || 'ช่างยะ ปิยะราช รามมา'
  )
  const [ownerSignName, setOwnerSignName] = useState(
    latestExecution?.ownerSignName || ''
  )
  const [generalNotes, setGeneralNotes] = useState(
    latestExecution?.executionNotes || ''
  )
  const [readinessStatus, setReadinessStatus] = useState<'READY' | 'NOT_READY'>(
    latestExecution?.readinessStatus === 'NOT_READY' ? 'NOT_READY' : 'READY'
  )

  // Prepopulate results from latestExecution if available
  const [results, setResults] = useState<{
    [itemId: number]: {
      score: 1 | 2 | 3
      status: 'PASS' | 'REMARK' | 'FAIL'
      remark: string
      readings: Record<string, string>
    }
  }>(() => {
    const init: any = {}
    const execMap = new Map<string, any>()
    const execIndexMap = new Map<number, any>()

    if (latestExecution?.checklistResults && Array.isArray(latestExecution.checklistResults)) {
      latestExecution.checklistResults.forEach((r: any, idx: number) => {
        if (r.item) execMap.set(r.item.trim(), r)
        execIndexMap.set(idx + 1, r)
      })
    }

    template.items.forEach(item => {
      const exec = execMap.get(item.item.trim()) || execIndexMap.get(item.id)
      if (exec) {
        init[item.id] = {
          score: exec.score || (exec.status === 'FAIL' ? 3 : exec.status === 'REMARK' ? 2 : 1),
          status: exec.status || 'PASS',
          remark: exec.remark || '',
          readings: exec.readings || {}
        }
      } else {
        init[item.id] = {
          score: 1,
          status: 'PASS',
          remark: '',
          readings: {}
        }
      }
    })
    return init
  })

  const handleScoreChange = (itemId: number, score: 1 | 2 | 3) => {
    const statusMap: Record<number, 'PASS' | 'REMARK' | 'FAIL'> = { 1: 'PASS', 2: 'REMARK', 3: 'FAIL' }
    setResults(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], score, status: statusMap[score] }
    }))
    if (score === 3) setReadinessStatus('NOT_READY')
  }

  const handleReadingChange = (itemId: number, field: string, val: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        readings: { ...(prev[itemId]?.readings || {}), [field]: val }
      }
    }))
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    const shareText = `📄 แบบฟอร์ม PM Check sheet ตามมาตรฐาน DCC (MT-PF-001E)\nเครื่องจักร: ${plan.machine_code} - ${plan.machine_name}\nรอบความถี่: ${plan.frequency_type}\nลิงก์: ${window.location.href}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PM Check sheet DCC ${plan.machine_code}`,
          text: shareText,
          url: window.location.href
        })
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error(err)
      }
    } else {
      navigator.clipboard.writeText(shareText)
      toast.success('คัดลอกข้อความและลิงก์เรียบร้อยแล้วค่ะ')
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 py-4 sm:py-8 px-2 sm:px-4 text-stone-900 font-sans print:p-0 print:m-0 print:bg-white print:w-full print:max-w-none print:min-h-0">
      
      {/* Print CSS for Clean A4 Output */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
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
          header, nav, aside, [class*="z-[80]"], [class*="z-[70]"], .print\\:hidden {
            display: none !important;
          }
          .dcc-pm-page {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}} />

      {/* Top Action Bar (Hidden on Print) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href="/maintenance/pm"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับไปตารางแผน PM</span>
          </Link>

          {latestExecution && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ดึงผลการตรวจ PM ล่าสุดแล้ว</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-black transition shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>แชร์ส่งต่อ LINE</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black transition shadow-md"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>พิมพ์เอกสาร A4 / บันทึกเป็น PDF</span>
          </button>
        </div>
      </div>

      {/* Official DCC Sheet Container */}
      <div className="dcc-pm-page max-w-[210mm] mx-auto bg-white border border-stone-300 shadow-2xl p-4 sm:p-7 rounded-xl print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none">
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

    </div>
  )
}
