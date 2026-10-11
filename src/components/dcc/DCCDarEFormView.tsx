'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, Download, ShieldCheck, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DCCDarRequest } from '@/types/dcc'
import DCCDarEFormPaper from './DCCDarEFormPaper'

interface DCCDarEFormViewProps {
  dar: DCCDarRequest
}

export default function DCCDarEFormView({ dar }: DCCDarEFormViewProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-3 sm:px-6 print:bg-white print:p-0">
      {/* Top Action Bar (hidden on print) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/dcc"
            className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
            title="กลับสู่ศูนย์ควบคุมเอกสาร DCC"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-stone-500">{dar.darNumber}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {dar.status}
              </span>
            </div>
            <h1 className="text-sm font-black text-stone-900 mt-0.5">
              แบบฟอร์มคำขอ DAR ฉบับอิเล็กทรอนิกส์ (DCC-PF-002A R02)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/templates/dcc/DCC-PF-002A-R02-DAR-Template.docx"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-stone-50 text-stone-700 border border-stone-300 hover:bg-stone-100 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>โหลด Word (.docx)</span>
          </a>

          <Button
            onClick={handlePrint}
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์เอกสาร (Print / PDF)</span>
          </Button>
        </div>
      </div>

      {/* Official Printable Paper */}
      <DCCDarEFormPaper dar={dar} />
    </div>
  )
}
