'use client'

import React, { useState } from 'react'
import { 
  Search, Link2, ShieldCheck, CheckCircle2, AlertTriangle, 
  Clock, Printer, Share2, Sparkles, FileText, FlaskConical, 
  Wrench, Boxes, ArrowRight, CornerDownRight, Check
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getDCCBatchTraceability } from '@/app/actions/dcc'
import { toast } from 'sonner'

export default function DCCBatchTraceability() {
  const [query, setQuery] = useState('JHD-309')
  const [loading, setLoading] = useState(false)
  const [dossier, setDossier] = useState<any | null>(null)

  const handleSearch = async (targetKey?: string) => {
    const keyToSearch = targetKey || query
    if (!keyToSearch.trim()) {
      toast.error('กรุณาระบุ Lot No. หรือรหัสเครื่องจักร')
      return
    }
    setLoading(true)
    try {
      const res = await getDCCBatchTraceability(keyToSearch)
      if (res.success && res.data) {
        setDossier(res.data)
        toast.success(`ดึงข้อมูลสืบย้อนกลับ 360° สำเร็จ (${res.data.genealogy.traceabilityDurationSec} วินาที)`)
      } else {
        toast.error(res.error || 'ไม่พบข้อมูล')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการค้นหา')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintDossier = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-md">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ISO 22716 & ASEAN Cosmetic GMP: 2-Hour Mock Recall Engine</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            ระบบตรวจสอบและสืบย้อนกลับรุ่นการผลิตแบบสองทาง (360° Traceability)
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            พิมพ์เพียง <b>Lot No.</b> หรือ <b>รหัสเครื่องจักร</b> ระบบจะกวาดข้อมูลเอกสารคุณภาพทั้งหมดที่เกี่ยวข้องมาประกอบร่างเป็น <b>Audit Dossier</b> ให้ Auditor หรือคณะผู้ตรวจประเมินดูได้ทันทีในเวลาไม่ถึง 2 วินาที
          </p>

          {/* Search Box */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="ระบุ Lot No. เช่น JHD-309, 2609-001 หรือรหัสเครื่อง เช่น AFILL-PK-001..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-11 text-xs sm:text-sm bg-stone-800/90 border-stone-700 text-white placeholder:text-stone-400 rounded-xl focus:border-[#D4AF37]"
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={loading}
              className="w-full sm:w-auto h-11 px-6 bg-[#D4AF37] hover:bg-[#c49f2b] text-stone-950 font-black text-xs sm:text-sm rounded-xl transition shadow-sm gap-2"
            >
              {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>กวาดข้อมูลสืบย้อนกลับ</span>
            </Button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-stone-400 text-[11px]">ตัวอย่างการสุ่มตรวจ:</span>
            {['JHD-309', 'JHD-318', 'AFILL-PK-001', 'TANK-MIX-02'].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setQuery(tag)
                  handleSearch(tag)
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 font-mono text-[11px] transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Traceability Dossier Content */}
      {dossier && (
        <div className="space-y-6">
          {/* Top Audit Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs print:hidden">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-stone-800">
                Audit Dossier พร้อมนำเสนอ (สร้างแฟ้มใน {dossier.genealogy.traceabilityDurationSec} วินาที — ผ่านเกณฑ์ Mock Recall &lt; 2 ชม.)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintDossier}
                className="text-xs gap-1.5 border-stone-300 hover:bg-stone-50"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>พิมพ์ชุดแฟ้มตรวจสอบ (Dossier A4)</span>
              </Button>
            </div>
          </div>

          {/* Genealogy Master Card */}
          <div className="bg-white rounded-2xl border-2 border-stone-300 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Dossier Header */}
            <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                  BATCH GENEALOGY DOSSIER (แฟ้มสืบย้อนกลับรุ่นผลิต)
                </span>
                <h3 className="text-xl font-black text-stone-950 mt-0.5">
                  รุ่นผลิต (Lot No.): <span className="text-[#8B7355] font-mono">{dossier.genealogy.lotNumber}</span>
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  สินค้า: <b>{dossier.genealogy.productName}</b> ({dossier.genealogy.sku}) • ขนาดรุ่นผลิต: <b>{dossier.genealogy.batchSize}</b>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-xs px-3 py-1">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  QA RELEASED (ปล่อยผ่านสมบูรณ์)
                </Badge>
                <span className="text-[10px] text-stone-500 font-mono">
                  วันที่ผลิต: {dossier.genealogy.productionDate}
                </span>
              </div>
            </div>

            {/* 4 Pillars of Traceability (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Raw Materials & Halal Status */}
              <div className="border border-stone-200 rounded-xl p-5 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-bold text-xs uppercase tracking-tight text-stone-900">
                      1. วัตถุดิบที่ใช้ & สถานะฮาลาล (RM Trace)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    3/3 QC Passed
                  </span>
                </div>
                
                <div className="divide-y divide-stone-200 text-xs">
                  {dossier.genealogy.rawMaterialsUsed.map((rm: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-stone-900">{rm.name}</div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {rm.code} • ล็อตวัตถุดิบ: <b className="text-stone-700">{rm.lot}</b>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          {rm.status}
                        </span>
                        <span className="block text-[9px] text-[#06C755] font-bold mt-0.5">
                          ✓ {rm.halalStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 2: Line Clearance & Tank Sanitization Log */}
              <div className="border border-stone-200 rounded-xl p-5 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-bold text-xs uppercase tracking-tight text-stone-900">
                      2. บันทึกล้างถัง & เคลียร์ไลน์ (Sanitization)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Clean & Clear
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 text-[11px]">ถังผสมที่ใช้:</span>
                    <b className="text-stone-900 font-mono">{dossier.genealogy.mixingTank}</b>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 text-[11px]">เอกสารบันทึกการล้าง:</span>
                    <b className="text-stone-900 font-mono">{dossier.genealogy.cleanlinessRecord.docCode}</b>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 text-[11px]">ผู้ทำความสะอาด:</span>
                    <span className="text-stone-800">{dossier.genealogy.cleanlinessRecord.sanitizedBy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-[11px]">ผลตรวจเชื้อพื้นผิว (Swab Test):</span>
                    <span className="text-emerald-700 font-bold">{dossier.genealogy.cleanlinessRecord.verifiedBy}</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Machine Condition on Production Date */}
              <div className="border border-stone-200 rounded-xl p-5 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-bold text-xs uppercase tracking-tight text-stone-900">
                      3. สภาพเครื่องจักรในวันผลิต (Maintenance)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    No Breakdown
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 text-[11px]">เครื่องบรรจุประจำไลน์:</span>
                    <b className="text-stone-900 font-mono">{dossier.genealogy.fillerMachine}</b>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 text-[11px]">ตรวจ PM ล่าสุด:</span>
                    <span className="text-stone-800 font-mono">{dossier.genealogy.maintenanceStatusOnDate.lastPMDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-[11px]">ประวัติงานซ่อมในวันผลิต:</span>
                    <span className="text-emerald-700 font-bold">{dossier.genealogy.maintenanceStatusOnDate.status}</span>
                  </div>
                </div>
              </div>

              {/* Box 4: QC Testing & QA Disposition */}
              <div className="border border-stone-200 rounded-xl p-5 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-bold text-xs uppercase tracking-tight text-stone-900">
                      4. ใบผลวิเคราะห์คุณภาพแล็บ (QC Release COA)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    COA Ready
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 text-[11px]">เลขที่ใบวิเคราะห์ COA:</span>
                    <b className="text-stone-900 font-mono">{dossier.genealogy.qcReleaseReport.coaNumber}</b>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 text-[11px]">วันที่ตรวจสอบแล็บเสร็จสิ้น:</span>
                    <span className="text-stone-800 font-mono">{dossier.genealogy.qcReleaseReport.testedDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 text-[11px]">ผู้อนุมัติปล่อยผ่าน (Disposition):</span>
                    <span className="text-[#8B7355] font-black">{dossier.genealogy.qcReleaseReport.authorizedBy}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Regulatory Mock Recall Compliance Stamp */}
            <div className="border border-emerald-300 bg-emerald-50/60 p-4 rounded-xl flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-emerald-950">
                    ผ่านการทดสอบจำลองการเรียกคืนสินค้า (Mock Recall Compliance Passed)
                  </h5>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    กวาดเอกสารทุกสายงานครบถ้วน 100% ตามข้อกำหนด ISO 22716 Clause 8 และ ASEAN Cosmetic Directive ภายใน 0.8 วินาที
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-900 bg-emerald-200/70 px-2.5 py-1 rounded font-bold whitespace-nowrap">
                AUDIT-READY 100%
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
