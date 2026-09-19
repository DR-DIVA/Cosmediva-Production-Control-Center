'use client'

import React, { useState, useMemo } from 'react'
import { 
  FolderArchive, FileText, CheckCircle2, XCircle, Clock, 
  Search, ShieldCheck, AlertTriangle, Eye, Download, BookOpen,
  Layers, ExternalLink, HelpCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DCCMasterTemplate, DocumentTier, DCC_STREAMS, DCC_DEPARTMENTS } from '@/types/dcc'

interface DCCMasterVaultProps {
  templates: DCCMasterTemplate[]
}

const TIER_TABS: { id: DocumentTier | 'ALL'; label: string; desc: string }[] = [
  { id: 'ALL', label: 'เอกสารทั้งหมด', desc: 'ทุกระดับชั้นเอกสารในโรงงาน' },
  { id: 'TIER_1_QM', label: '1. คู่มือคุณภาพ (QM/Halal)', desc: 'Quality Manual & Halal Policy' },
  { id: 'TIER_2_DP', label: '2. ระเบียบปฏิบัติงาน (DP)', desc: 'Department Procedure (20 แผนก)' },
  { id: 'TIER_3_WI', label: '3. วิธีปฏิบัติงาน (WI/STM)', desc: 'Work Instruction & Standard Test Methods' },
  { id: 'TIER_4_FORM', label: '4. แบบฟอร์มแม่แบบ (Forms)', desc: 'Master Blank E-Forms' },
  { id: 'EXTERNAL_DOC', label: 'เอกสารภายนอก (Ext)', desc: 'อย., ACD, Halal, ISO Standards' },
]

export default function DCCMasterVault({ templates }: DCCMasterVaultProps) {
  const [activeTier, setActiveTier] = useState<DocumentTier | 'ALL'>('ALL')
  const [selectedStream, setSelectedStream] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<DCCMasterTemplate | null>(null)

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchTier = activeTier === 'ALL' || t.tier === activeTier
      const matchStream = selectedStream === 'ALL' || t.streamCode === selectedStream
      const s = search.toLowerCase().trim()
      const matchSearch = !s || (
        t.docCode.toLowerCase().includes(s) ||
        t.titleTh.toLowerCase().includes(s) ||
        t.titleEn.toLowerCase().includes(s) ||
        (t.description && t.description.toLowerCase().includes(s)) ||
        t.departmentCode.toLowerCase().includes(s)
      )
      return matchTier && matchStream && matchSearch
    })
  }, [templates, activeTier, selectedStream, search])

  return (
    <div className="space-y-4">
      {/* Tier Filter Bar (พีระมิดเอกสาร 4 ระดับ + External) */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TIER_TABS.map(tab => {
            const isActive = activeTier === tab.id
            const count = tab.id === 'ALL' ? templates.length : templates.filter(t => t.tier === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTier(tab.id)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  isActive
                    ? 'bg-stone-900 border-stone-900 text-white shadow-sm'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? 'text-[#D4AF37]' : 'text-stone-900'}`}>
                    {tab.label}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </div>
                <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-stone-300' : 'text-stone-500'}`}>
                  {tab.desc}
                </p>
              </button>
            )
          })}
        </div>

        {/* Stream Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-stone-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="ค้นหาด้วยรหัสเอกสาร (DP-MT-001, QM-CSM-001), ชื่อเอกสาร, แผนก หรือคำสำคัญ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-xs bg-stone-50 border-stone-200 h-9 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-stone-500 whitespace-nowrap">สายงาน:</span>
            <button
              onClick={() => setSelectedStream('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedStream === 'ALL' ? 'bg-[#D4AF37] text-stone-950' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              ทุกสายงาน
            </button>
            {DCC_STREAMS.map(s => (
              <button
                key={s.code}
                onClick={() => setSelectedStream(s.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedStream === s.code ? 'bg-stone-900 text-[#D4AF37]' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {s.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Master Templates Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">รหัสเอกสาร (Doc Code)</th>
                <th className="py-3 px-4">ชื่อเอกสารมาตรฐาน (Document Title)</th>
                <th className="py-3 px-3">ระดับชั้น</th>
                <th className="py-3 px-3">แผนก & สายงาน</th>
                <th className="py-3 px-3 text-center">Rev.</th>
                <th className="py-3 px-3">วันที่มีผล</th>
                <th className="py-3 px-3 text-center">ตราประทับควบคุม (Stamp)</th>
                <th className="py-3 px-3">ผู้อนุมัติขั้นสุดท้าย</th>
                <th className="py-3 px-4 text-center">เปิดดู</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    <FolderArchive className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-semibold">ไม่พบเอกสารแม่แบบที่ตรงกับเงื่อนไข</p>
                  </td>
                </tr>
              ) : (
                filteredTemplates.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-950 whitespace-nowrap">
                      {t.docCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{t.titleTh}</div>
                      <div className="text-[11px] text-stone-500 font-normal">{t.titleEn}</div>
                      {t.isoStandardRef && t.isoStandardRef.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.isoStandardRef.map((ref, idx) => (
                            <span key={idx} className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded border border-stone-200">
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] font-bold border-stone-300">
                        {t.tier === 'TIER_1_QM' && '1. QM/Halal'}
                        {t.tier === 'TIER_2_DP' && '2. DP (Procedure)'}
                        {t.tier === 'TIER_3_WI' && '3. WI / STM'}
                        {t.tier === 'TIER_4_FORM' && '4. Blank Form'}
                        {t.tier === 'EXTERNAL_DOC' && 'External Doc'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-stone-800">{t.departmentCode}</div>
                      <div className="text-[10px] text-stone-500">{t.streamCode}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-center">
                      <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-300 text-stone-800 text-[11px]">
                        {t.revisionNo}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                      {t.effectiveDate}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {t.status === 'EFFECTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          CONTROLLED COPY
                        </span>
                      ) : t.status === 'OBSOLETE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 font-bold text-[10px]">
                          <XCircle className="w-3 h-3 text-red-600" />
                          OBSOLETE / ยกเลิก
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          UNDER REVIEW
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-[11px] font-bold text-stone-800">{t.approvedBy}</div>
                      <div className="text-[10px] text-stone-500">เจ้าของ: {t.ownerName}</div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewTemplate(t)}
                        className="h-7 text-xs text-stone-700 hover:text-stone-950 hover:bg-stone-100 gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>พรีวิว</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Template Preview Dialog */}
      <Dialog open={Boolean(previewTemplate)} onOpenChange={open => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl bg-white text-stone-900">
          {previewTemplate && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                    <div>
                      <DialogTitle className="text-base font-bold text-stone-950">
                        {previewTemplate.docCode} — {previewTemplate.titleTh}
                      </DialogTitle>
                      <p className="text-xs text-stone-500">{previewTemplate.titleEn}</p>
                    </div>
                  </div>
                  <div>
                    {previewTemplate.status === 'EFFECTIVE' ? (
                      <span className="px-2.5 py-1 rounded bg-emerald-600 text-white font-black text-[10px] tracking-wide">
                        CONTROLLED COPY
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-red-600 text-white font-black text-[10px] tracking-wide">
                        OBSOLETE / VOID
                      </span>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Document Metadata Card */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-stone-500 block text-[10px]">ระดับเอกสาร:</span>
                    <b className="text-stone-900">{previewTemplate.tier}</b>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">สายงาน & แผนก:</span>
                    <b className="text-stone-900">{previewTemplate.streamCode} / {previewTemplate.departmentCode}</b>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">เวอร์ชันปัจจุบัน:</span>
                    <b className="text-stone-900 font-mono">Rev. {previewTemplate.revisionNo}</b>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">วันที่มีผลบังคับใช้:</span>
                    <b className="text-stone-900 font-mono">{previewTemplate.effectiveDate}</b>
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-stone-500 block text-[10px]">ผู้รับผิดชอบ / เจ้าของเอกสาร:</span>
                    <span className="font-bold text-stone-800">{previewTemplate.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">ผู้อนุมัติขั้นสุดท้าย (Sign-off Authority):</span>
                    <span className="font-black text-stone-900 text-[#8B7355]">{previewTemplate.approvedBy}</span>
                  </div>
                </div>

                {previewTemplate.description && (
                  <div className="border-t border-stone-200 pt-2">
                    <span className="text-stone-500 block text-[10px] mb-0.5">ขอบเขตและสาระสำคัญ:</span>
                    <p className="text-stone-700 leading-relaxed bg-white p-2.5 rounded border border-stone-200">
                      {previewTemplate.description}
                    </p>
                  </div>
                )}

                {previewTemplate.isoStandardRef && (
                  <div className="border-t border-stone-200 pt-2">
                    <span className="text-stone-500 block text-[10px] mb-1">มาตรฐานสากลที่อ้างอิง:</span>
                    <div className="flex flex-wrap gap-1">
                      {previewTemplate.isoStandardRef.map((ref, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] font-medium bg-stone-200 text-stone-800">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stamp Alert Rules */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <b>ข้อกำหนดการควบคุมเอกสาร:</b> หากสั่งพิมพ์เอกสารนี้ ระบบจะ Stamp ข้อความตัวจางอัตโนมัติว่า 
                  <span className="font-mono font-bold text-red-700"> UNCONTROLLED COPY WHEN PRINTED </span> 
                  เพื่อป้องกันการนำเอกสารกระดาษที่อาจล้าสมัยไปใช้งานหน้างาน
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
