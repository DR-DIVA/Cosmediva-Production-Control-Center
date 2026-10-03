'use client'

import React from 'react'
import Image from 'next/image'
import { PMChecksheetTemplate, PMChecklistItem } from '@/lib/pmChecksheetCatalog'
import { MaintenancePMPlan } from '@/types/maintenance'

interface DCCPMChecksheetPaperProps {
  template: PMChecksheetTemplate
  plan: MaintenancePMPlan
  results: {
    [itemId: number]: {
      score: 1 | 2 | 3
      status: 'PASS' | 'REMARK' | 'FAIL'
      remark: string
      readings: Record<string, string>
    }
  }
  onScoreChange?: (itemId: number, score: 1 | 2 | 3) => void
  onReadingChange?: (itemId: number, field: string, val: string) => void
  readinessStatus: 'READY' | 'NOT_READY'
  onReadinessChange?: (status: 'READY' | 'NOT_READY') => void
  generalNotes: string
  onGeneralNotesChange?: (notes: string) => void
  execTechName: string
  onTechNameChange?: (name: string) => void
  ownerSignName: string
  onOwnerSignNameChange?: (name: string) => void
  isReadOnly?: boolean
}

export default function DCCPMChecksheetPaper({
  template,
  plan,
  results,
  onScoreChange,
  onReadingChange,
  readinessStatus,
  onReadinessChange,
  generalNotes,
  onGeneralNotesChange,
  execTechName,
  onTechNameChange,
  ownerSignName,
  onOwnerSignNameChange,
  isReadOnly = false
}: DCCPMChecksheetPaperProps) {
  const items = template.items || []

  // Generate blank filler rows so the visual sheet always resembles the DCC Excel 20-30 row table
  const minRows = 19
  const emptyRowsNeeded = Math.max(0, minRows - items.length)
  const emptyRows = Array.from({ length: emptyRowsNeeded }, (_, i) => i)

  return (
    <div className="dcc-pm-sheet bg-white text-black font-sans text-xs leading-tight w-full max-w-[210mm] mx-auto p-4 sm:p-6 print:p-0 print:m-0 print:w-full print:max-w-none">
      
      {/* =========================================================================
          1. DCC OFFICIAL HEADER (4 Rows Table with Logo, Title, Document Control)
      ========================================================================= */}
      <table className="w-full border-collapse border-2 border-black text-xs">
        <tbody>
          <tr>
            {/* Logo Cell (Row 1-4, Col A-C) */}
            <td 
              rowSpan={4} 
              className="border-2 border-black w-[110px] sm:w-[130px] p-2 text-center align-middle bg-white"
            >
              <div className="flex flex-col items-center justify-center space-y-1">
                <Image
                  src="/cosmediva-logo.png"
                  alt="Cosmediva Logo"
                  width={64}
                  height={64}
                  className="object-contain h-12 w-auto mx-auto"
                  priority
                />
                <div className="font-bold text-[13px] text-stone-900 tracking-wide mt-1">
                  ซ่อมบำรุง
                </div>
              </div>
            </td>

            {/* Header Center: Title (Row 1-4, Col D-M) */}
            <td 
              rowSpan={4} 
              className="border-2 border-black p-3 text-center align-middle"
            >
              <div className="text-[17px] sm:text-[19px] font-black text-[#1E7E34] tracking-wider mb-1">
                เอกสารควบคุม
              </div>
              <div className="text-[14px] sm:text-[16px] font-bold text-black tracking-tight leading-snug">
                รายการตรวจสอบเครื่องมือ เครื่องจักร (PM Check sheet)
              </div>
            </td>

            {/* Header Right: Document Metadata (Row 1-4, Col N-S) */}
            <td className="border border-black px-2 py-1 text-center font-bold text-[11px] w-[65px]">
              สำเนาที่
            </td>
            <td className="border border-black px-2 py-1 text-[11px] font-bold w-[190px]">
              เลขที่เอกสาร: <span className="font-mono text-black">MT-PF-001E</span>
            </td>
          </tr>

          <tr>
            <td className="border border-black px-2 py-0.5 text-center font-black text-blue-700 text-[15px]">
              13
            </td>
            <td className="border border-black px-2 py-1 text-[11px]">
              แก้ไขครั้งที่: <b>00</b>
            </td>
          </tr>

          <tr>
            <td rowSpan={2} className="border border-black p-0 bg-stone-50/50"></td>
            <td className="border border-black px-2 py-1 text-[11px]">
              วันที่มีผลบังคับใช้: <b>19 JAN 24</b>
            </td>
          </tr>

          <tr>
            <td className="border border-black px-2 py-1 text-[11px]">
              หน้าที่ <b>1</b> จาก <b>1</b>
            </td>
          </tr>
        </tbody>
      </table>

      {/* =========================================================================
          2. MACHINE METADATA BOX (Rows 6-8 in Excel)
      ========================================================================= */}
      <table className="w-full border-collapse border-x-2 border-b-2 border-black text-xs font-medium">
        <tbody>
          <tr className="border-b border-black">
            <td className="p-1.5 px-2.5 w-[14%] font-bold text-stone-900 border-r border-black">
              Machine :
            </td>
            <td className="p-1.5 px-2.5 w-[46%] font-bold text-stone-900 border-r border-black">
              {template.machineName || plan.machine_name}
            </td>
            <td className="p-1.5 px-2.5 w-[18%] font-bold text-stone-900 border-r border-black">
              Serial No. :
            </td>
            <td className="p-1.5 px-2.5 w-[22%]">
              N/A
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="p-1.5 px-2.5 font-bold text-stone-900 border-r border-black">
              M/C No. :
            </td>
            <td className="p-1.5 px-2.5 font-mono font-black text-stone-950 border-r border-black text-[13px]">
              {plan.machine_code}
            </td>
            <td className="p-1.5 px-2.5 font-bold text-stone-900 border-r border-black">
              Model :
            </td>
            <td className="p-1.5 px-2.5">
              N/A
            </td>
          </tr>

          <tr>
            <td className="p-1.5 px-2.5 font-bold text-stone-900 border-r border-black">
              Location :
            </td>
            <td className="p-1.5 px-2.5 text-stone-900 border-r border-black">
              {template.location || 'Mixing 2'}
            </td>
            <td className="p-1.5 px-2.5 font-bold text-stone-900 border-r border-black">
              PM DATE :
            </td>
            <td className="p-1.5 px-2.5 font-mono font-bold">
              {new Date().toLocaleDateString('th-TH')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* =========================================================================
          3. RATING SCALE GUIDE (Rows 9-10 in Excel)
      ========================================================================= */}
      <div className="border-x-2 border-b-2 border-black p-1.5 px-3 bg-stone-50/70 text-xs">
        <div className="font-bold text-[11px] mb-1 text-stone-800">ผลการตรวจสอบ</div>
        <div className="grid grid-cols-3 gap-2 text-center font-bold">
          <div className="border border-black py-1 px-2 bg-white flex items-center justify-center gap-2">
            <span className="font-mono font-black border border-black px-1.5 py-0.5 rounded text-[11px] bg-stone-100">1</span>
            <span>ใช้งานได้ปกติ</span>
          </div>
          <div className="border border-black py-1 px-2 bg-white flex items-center justify-center gap-2">
            <span className="font-mono font-black border border-black px-1.5 py-0.5 rounded text-[11px] bg-stone-100">2</span>
            <span>ระมัดระวังการใช้งาน</span>
          </div>
          <div className="border border-black py-1 px-2 bg-white flex items-center justify-center gap-2">
            <span className="font-mono font-black border border-black px-1.5 py-0.5 rounded text-[11px] bg-stone-100">3</span>
            <span>ซ่อมหรือแก้ไขโดยด่วน</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. MAIN CHECKLIST TABLE (Rows 12-32 in Excel)
      ========================================================================= */}
      <table className="w-full border-collapse border-x-2 border-b-2 border-black text-xs">
        <thead>
          <tr className="border-b border-black bg-stone-100/90 text-stone-950 font-bold">
            <th rowSpan={2} className="border-r border-black p-1.5 text-center w-[45px]">
              ลำดับ
            </th>
            <th rowSpan={2} className="border-r border-black p-1.5 text-center w-[160px] sm:w-[190px]">
              หัวข้อการตรวจสอบ
            </th>
            <th rowSpan={2} className="border-r border-black p-1.5 text-center">
              จุดที่ทำการตรวจเช็ค
            </th>
            <th colSpan={3} className="p-1 text-center w-[110px] border-b border-black">
              ผลการตรวจสอบ
            </th>
          </tr>
          <tr className="border-b-2 border-black bg-stone-100 text-center font-mono font-black text-xs">
            <th className="border-r border-black p-1 w-[36px]">1</th>
            <th className="border-r border-black p-1 w-[36px]">2</th>
            <th className="p-1 w-[38px]">3</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const current = results[item.id] || { score: 1, status: 'PASS', remark: '', readings: {} }
            
            // Check if this row is the first in its category to display category name, otherwise leave blank
            const isFirstOfCategory = idx === 0 || items[idx - 1].category !== item.category
            // Clean category label (strip leading numbers like "1. ระบบไฟฟ้า" -> "ระบบไฟฟ้า")
            const cleanCat = item.category.replace(/^[0-9]+\.\s*/, '')
            // Determine category number for Col 1 if first in category
            const catNumberMatch = item.category.match(/^([0-9]+)/)
            const catNumber = catNumberMatch ? catNumberMatch[1] : (isFirstOfCategory ? String(idx + 1) : '')

            return (
              <tr 
                key={item.id} 
                className={`border-b border-black transition hover:bg-stone-50 ${
                  current.score === 2 ? 'bg-amber-50/40 print:bg-transparent' :
                  current.score === 3 ? 'bg-rose-50/50 print:bg-transparent' : ''
                }`}
              >
                {/* Col A: ลำดับหมวดหมู่ */}
                <td className="border-r border-black p-1 text-center font-mono font-bold align-middle">
                  {isFirstOfCategory ? catNumber : ''}
                </td>

                {/* Col B: หัวข้อการตรวจสอบ */}
                <td className="border-r border-black p-1.5 px-2 font-bold text-stone-900 align-middle">
                  {isFirstOfCategory ? cleanCat : ''}
                </td>

                {/* Col C: จุดที่ทำการตรวจเช็ค + Inline Readings */}
                <td className="border-r border-black p-1.5 px-2 text-stone-900 align-middle">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>{item.item}</span>

                    {/* Inline Technical Measurement Inputs */}
                    {item.readings && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono mt-0.5 shrink-0 print:text-[10px]">
                        {item.readings.type === 'amp_uvw' ? (
                          <div className="flex items-center gap-1 bg-stone-100 print:bg-transparent px-1.5 py-0.5 rounded border border-stone-300 print:border-none">
                            <span className="font-bold text-stone-700">U:</span>
                            {isReadOnly ? (
                              <b className="font-mono text-blue-900">{current.readings?.['U'] || '...'}</b>
                            ) : (
                              <input
                                type="text"
                                value={current.readings?.['U'] || ''}
                                onChange={e => onReadingChange?.(item.id, 'U', e.target.value)}
                                placeholder="0.0"
                                className="w-11 h-5 text-center text-[11px] font-mono font-bold border border-stone-400 rounded bg-white"
                              />
                            )}
                            <span className="font-bold text-stone-700">V:</span>
                            {isReadOnly ? (
                              <b className="font-mono text-blue-900">{current.readings?.['V'] || '...'}</b>
                            ) : (
                              <input
                                type="text"
                                value={current.readings?.['V'] || ''}
                                onChange={e => onReadingChange?.(item.id, 'V', e.target.value)}
                                placeholder="0.0"
                                className="w-11 h-5 text-center text-[11px] font-mono font-bold border border-stone-400 rounded bg-white"
                              />
                            )}
                            <span className="font-bold text-stone-700">W:</span>
                            {isReadOnly ? (
                              <b className="font-mono text-blue-900">{current.readings?.['W'] || '...'}</b>
                            ) : (
                              <input
                                type="text"
                                value={current.readings?.['W'] || ''}
                                onChange={e => onReadingChange?.(item.id, 'W', e.target.value)}
                                placeholder="0.0"
                                className="w-11 h-5 text-center text-[11px] font-mono font-bold border border-stone-400 rounded bg-white"
                              />
                            )}
                            <span className="text-stone-600 font-bold">A</span>
                          </div>
                        ) : item.readings.type === 'temperature' ? (
                          <div className="flex items-center gap-1 bg-stone-100 print:bg-transparent px-1.5 py-0.5 rounded border border-stone-300 print:border-none">
                            {isReadOnly ? (
                              <b className="font-mono text-blue-900">{current.readings?.['temp'] || '...'}</b>
                            ) : (
                              <input
                                type="text"
                                value={current.readings?.['temp'] || ''}
                                onChange={e => onReadingChange?.(item.id, 'temp', e.target.value)}
                                placeholder="0.0"
                                className="w-14 h-5 text-center text-[11px] font-mono font-bold border border-stone-400 rounded bg-white"
                              />
                            )}
                            <span className="font-bold text-stone-700">°C</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Remark row if note exists */}
                  {current.remark && (
                    <div className="text-[10px] text-stone-600 italic mt-0.5 font-sans">
                      * หมายเหตุ: {current.remark}
                    </div>
                  )}
                </td>

                {/* Col Q: ผล 1 (ปกติ) */}
                <td 
                  onClick={() => !isReadOnly && onScoreChange?.(item.id, 1)}
                  className={`border-r border-black p-1 text-center align-middle cursor-pointer transition select-none ${
                    current.score === 1 ? 'bg-emerald-50 print:bg-transparent font-black' : ''
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {current.score === 1 ? (
                      <span className="text-[14px] font-bold text-black">✓</span>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded border border-stone-400 inline-block print:hidden"></span>
                    )}
                  </div>
                </td>

                {/* Col R: ผล 2 (ระมัดระวัง) */}
                <td 
                  onClick={() => !isReadOnly && onScoreChange?.(item.id, 2)}
                  className={`border-r border-black p-1 text-center align-middle cursor-pointer transition select-none ${
                    current.score === 2 ? 'bg-amber-100 print:bg-transparent font-black' : ''
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {current.score === 2 ? (
                      <span className="text-[14px] font-bold text-black">✓</span>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded border border-stone-400 inline-block print:hidden"></span>
                    )}
                  </div>
                </td>

                {/* Col S: ผล 3 (ซ่อมด่วน) */}
                <td 
                  onClick={() => !isReadOnly && onScoreChange?.(item.id, 3)}
                  className={`p-1 text-center align-middle cursor-pointer transition select-none ${
                    current.score === 3 ? 'bg-rose-100 print:bg-transparent font-black text-rose-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {current.score === 3 ? (
                      <span className="text-[14px] font-bold text-rose-800">✓</span>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded border border-stone-400 inline-block print:hidden"></span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}

          {/* Empty rows to complete the classic Excel template look up to row 30 */}
          {emptyRows.map(idx => (
            <tr key={`empty-${idx}`} className="border-b border-black h-[22px]">
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* =========================================================================
          5. FOOTER: REPAIR NOTES & DUAL HANDOVER SIGN-OFF
      ========================================================================= */}
      {/* Repair details section */}
      <div className="border-x-2 border-b-2 border-black p-2.5 px-3 bg-white text-xs">
        <div className="font-bold text-[11px] text-stone-900 mb-1">
          รายละเอียดต้องการให้แก้ไขปรับปรุงเพิ่มเติม
        </div>
        {isReadOnly ? (
          <div className="min-h-[35px] text-stone-800 text-[11px] whitespace-pre-wrap">
            {generalNotes || '-'}
          </div>
        ) : (
          <textarea
            rows={2}
            value={generalNotes}
            onChange={e => onGeneralNotesChange?.(e.target.value)}
            placeholder="ระบุข้อคิดเห็น การซ่อม หรือรายการที่ต้องปรับปรุงเพิ่มเติม..."
            className="w-full p-1.5 text-xs border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-stone-50/50 print:border-none print:p-0 print:bg-transparent"
          />
        )}
      </div>

      {/* Readiness & Sign-off Table */}
      <table className="w-full border-collapse border-x-2 border-b-2 border-black text-xs">
        <tbody>
          <tr>
            {/* Machine Readiness Checkboxes */}
            <td className="border-r-2 border-black p-3 w-[45%] align-middle bg-stone-50/40">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-950">
                  <input
                    type="radio"
                    name="paper_readiness"
                    disabled={isReadOnly}
                    checked={readinessStatus === 'READY'}
                    onChange={() => onReadinessChange?.('READY')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>เรียบร้อย/พร้อมใช้งาน</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-950">
                  <input
                    type="radio"
                    name="paper_readiness"
                    disabled={isReadOnly}
                    checked={readinessStatus === 'NOT_READY'}
                    onChange={() => onReadinessChange?.('NOT_READY')}
                    className="w-4 h-4 text-black focus:ring-black"
                  />
                  <span>ไม่พร้อมใช้งาน/ตรวจสอบอีกครั้ง</span>
                </label>
              </div>
            </td>

            {/* Signatures */}
            <td className="p-3 w-[55%] space-y-2.5 align-middle">
              {/* Technician */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span>ผู้ส่งมอบ:</span>
                  {isReadOnly ? (
                    <b className="underline decoration-dotted">{execTechName}</b>
                  ) : (
                    <input
                      type="text"
                      value={execTechName}
                      onChange={e => onTechNameChange?.(e.target.value)}
                      placeholder="ชื่อช่างผู้ส่งมอบ"
                      className="border-b border-black px-1 font-bold bg-transparent outline-none w-44"
                    />
                  )}
                </div>
                <div className="text-[11px] text-stone-600">
                  วันที่: {new Date().toLocaleDateString('th-TH')}
                </div>
              </div>

              {/* Owner / Supervisor */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span>ผู้รับมอบ:</span>
                  {isReadOnly ? (
                    <b className="underline decoration-dotted">{ownerSignName || '-'}</b>
                  ) : (
                    <input
                      type="text"
                      required
                      value={ownerSignName}
                      onChange={e => onOwnerSignNameChange?.(e.target.value)}
                      placeholder="ชื่อหัวหน้าแผนกผู้รับมอบ *"
                      className="border-b border-black px-1 font-bold bg-transparent outline-none w-44 text-blue-900"
                    />
                  )}
                </div>
                <div className="text-[11px] text-stone-600">
                  วันที่: {new Date().toLocaleDateString('th-TH')}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  )
}
