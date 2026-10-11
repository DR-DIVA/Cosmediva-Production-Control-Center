'use client'

import React from 'react'
import Image from 'next/image'
import { DCCDarRequest, DCC_19_DEPARTMENTS } from '@/types/dcc'
import { Check, Stamp } from 'lucide-react'

interface DCCDarEFormPaperProps {
  dar: DCCDarRequest
  isPrintMode?: boolean
}

export default function DCCDarEFormPaper({ dar, isPrintMode = false }: DCCDarEFormPaperProps) {
  const reqType = dar.requestType
  const targetDepts = dar.targetDepartments || []

  return (
    <div className={`dcc-dar-paper bg-white text-black font-sans text-xs leading-snug w-full max-w-[210mm] mx-auto p-4 sm:p-6 print:p-0 print:m-0 print:w-full print:max-w-none shadow-sm print:shadow-none border border-stone-300 print:border-none ${isPrintMode ? 'print-active' : ''}`}>
      
      {/* =========================================================================
          HEADER TABLE (Official Cosmediva Controlled Form Header DCC-PF-002A)
      ========================================================================= */}
      <table className="w-full border-collapse border-2 border-black text-xs">
        <tbody>
          <tr>
            {/* Logo Cell */}
            <td 
              rowSpan={4} 
              className="border-2 border-black w-[120px] p-2 text-center align-middle bg-white"
            >
              <div className="flex flex-col items-center justify-center space-y-1">
                <Image
                  src="/cosmediva-logo.png"
                  alt="Cosmediva Logo"
                  width={60}
                  height={60}
                  className="object-contain h-11 w-auto mx-auto"
                  priority
                />
                <div className="font-black text-[11px] text-stone-900 tracking-wide">
                  COSMEDIVA
                </div>
                <div className="text-[9px] font-bold text-stone-600">
                  ศูนย์ควบคุมเอกสาร (DCC)
                </div>
              </div>
            </td>

            {/* Header Title */}
            <td 
              rowSpan={4} 
              className="border-2 border-black p-2.5 text-center align-middle"
            >
              <div className="text-[15px] sm:text-[17px] font-black text-[#1E7E34] tracking-wider mb-0.5">
                เอกสารควบคุม
              </div>
              <div className="text-[13px] sm:text-[15px] font-black text-black tracking-tight leading-snug">
                ใบขอดำเนินการเอกสารควบคุม
              </div>
              <div className="text-[10px] font-bold text-stone-700 tracking-wide font-mono">
                (DOCUMENT ACTION REQUEST : DAR)
              </div>
            </td>

            {/* Header Meta */}
            <td className="border border-black px-2 py-0.5 text-center font-bold text-[10px] w-[65px] bg-stone-50">
              สำเนาที่
            </td>
            <td className="border border-black px-2 py-0.5 text-[10px] font-bold w-[180px]">
              เลขที่เอกสาร: <span className="font-mono text-black font-black">{dar.formCode || 'DCC-PF-002A'}</span>
            </td>
          </tr>

          <tr>
            <td className="border border-black px-2 py-0.5 text-center font-black text-blue-700 text-[13px]">
              {dar.copyNo || '1'}
            </td>
            <td className="border border-black px-2 py-0.5 text-[10px]">
              แก้ไขครั้งที่: <span className="font-mono font-bold">{dar.formRevision || '02'}</span>
            </td>
          </tr>

          <tr>
            <td className="border border-black px-2 py-0.5 text-center font-bold text-[9px] bg-stone-50">
              หน้า
            </td>
            <td className="border border-black px-2 py-0.5 text-[10px]">
              วันที่มีผลบังคับใช้: <span className="font-bold">{dar.formEffectiveDate || '28 AUG 23'}</span>
            </td>
          </tr>

          <tr>
            <td className="border border-black px-2 py-0.5 text-center font-bold text-[10px]">
              1 / 1
            </td>
            <td className="border border-black px-2 py-0.5 text-[10px] font-mono text-emerald-800 font-bold">
              DAR No: <span className="text-black font-black">{dar.darNumber}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* =========================================================================
          ส่วนที่ 1: การขอดำเนินการเอกสารควบคุม (สำหรับผู้ขอดำเนินการ)
      ========================================================================= */}
      <div className="mt-2 border-2 border-black border-t-0">
        <div className="bg-[#1E7E34] text-white font-bold text-[11px] px-2.5 py-1 flex items-center justify-between">
          <span>ส่วนที่ 1 : การขอดำเนินการเอกสารควบคุม (สำหรับผู้ขอดำเนินการ กรอกรายละเอียด)</span>
          <span className="text-[10px] text-emerald-100 font-normal">Section 1: Action Request</span>
        </div>

        <div className="grid grid-cols-12 divide-x divide-black text-xs">
          {/* Left: Request Types (8 cols) */}
          <div className="col-span-8 p-2 space-y-1.5">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] ${reqType === 'NEW' ? 'bg-black text-white font-black' : ''}`}>
                  {reqType === 'NEW' ? '✓' : ''}
                </span>
                <span className={reqType === 'NEW' ? 'font-bold' : ''}>1. ขอจัดทำใหม่ (New)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] ${reqType === 'REVISE' ? 'bg-black text-white font-black' : ''}`}>
                  {reqType === 'REVISE' ? '✓' : ''}
                </span>
                <span className={reqType === 'REVISE' ? 'font-bold' : ''}>2. ขอแก้ไข (Revise)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] ${reqType === 'CANCEL' ? 'bg-black text-white font-black' : ''}`}>
                  {reqType === 'CANCEL' ? '✓' : ''}
                </span>
                <span className={reqType === 'CANCEL' ? 'font-bold' : ''}>3. ขอยกเลิก (Cancel)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] ${reqType === 'EXTRA_COPY' ? 'bg-black text-white font-black' : ''}`}>
                  {reqType === 'EXTRA_COPY' ? '✓' : ''}
                </span>
                <span className={reqType === 'EXTRA_COPY' ? 'font-bold' : ''}>
                  4. ขอสำเนาเพิ่ม {dar.extraCopiesCount ? `(${dar.extraCopiesCount} ชุด)` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] ${reqType === 'EXTEND_EXPIRY' ? 'bg-black text-white font-black' : ''}`}>
                  {reqType === 'EXTEND_EXPIRY' ? '✓' : ''}
                </span>
                <span className={reqType === 'EXTEND_EXPIRY' ? 'font-bold' : ''}>5. ขอต่ออายุ (Extend)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[10px] ${reqType === 'OTHER' ? 'bg-black text-white font-black' : ''}`}>
                  {reqType === 'OTHER' ? '✓' : ''}
                </span>
                <span className={reqType === 'OTHER' ? 'font-bold' : ''}>
                  6. อื่นๆ: {dar.actionTypeDetail || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: DCC Official Acceptance Box (4 cols) */}
          <div className="col-span-4 p-2 bg-stone-50 flex flex-col justify-between text-[11px] space-y-1">
            <div className="font-bold text-stone-900 border-b border-stone-300 pb-0.5 flex items-center justify-between">
              <span>(สำหรับศูนย์ควบคุมเอกสาร - DCC)</span>
              <span className="font-mono text-emerald-800 text-[10px]">RECORD</span>
            </div>
            <div className="space-y-0.5">
              <div>เลขที่ DAR: <b className="font-mono text-black">{dar.darNumber}</b></div>
              <div>วันที่รับคำขอ: <span>{dar.dccReceivedDate || '-'}</span></div>
              <div>เจ้าหน้าที่ DCC: <span className="font-semibold">{dar.dccOfficerName || '-'}</span> {dar.dccOfficerEmpId && <span className="text-[10px] font-mono">({dar.dccOfficerEmpId})</span>}</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ส่วนที่ 2: ข้อมูลเอกสารควบคุม
      ========================================================================= */}
      <div className="border-2 border-black border-t-0">
        <div className="bg-[#1E7E34] text-white font-bold text-[11px] px-2.5 py-1 flex items-center justify-between">
          <span>ส่วนที่ 2 : ข้อมูลเอกสารควบคุม</span>
          <span className="text-[10px] text-emerald-100 font-normal">Section 2: Document Profile</span>
        </div>

        <div className="p-2 space-y-1.5 text-xs">
          {/* Row 1: Document Level */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-stone-200 pb-1.5">
            <span className="font-bold">ระดับเอกสาร:</span>
            {[
              { label: 'คู่มือคุณภาพ (QM)', match: dar.docLevel?.includes('QM') || dar.docCategory?.includes('QM') },
              { label: 'ระเบียบปฏิบัติงาน (DP)', match: dar.docLevel?.includes('DP') || dar.docCategory?.includes('DP') },
              { label: 'วิธีปฏิบัติงาน (WI)', match: dar.docLevel?.includes('WI') || dar.docCategory?.includes('WI') },
              { label: 'แบบฟอร์ม (Form)', match: dar.docLevel?.includes('FORM') || dar.docCategory?.includes('Form') || dar.docCode.includes('-PF-') || dar.docCode.includes('-WF-') },
              { label: 'เอกสารภายนอก (EXT)', match: dar.docLevel?.includes('EXT') || dar.docCategory?.includes('EXT') }
            ].map((lvl, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${lvl.match ? 'bg-black text-white font-black' : ''}`}>
                  {lvl.match ? '✓' : ''}
                </span>
                <span className={lvl.match ? 'font-bold' : 'text-stone-700'}>{lvl.label}</span>
              </div>
            ))}
          </div>

          {/* Row 2: Doc Code, Title, Revision, Department */}
          <div className="grid grid-cols-12 gap-2 border-b border-stone-200 pb-1.5">
            <div className="col-span-4">
              <span className="text-stone-500 block text-[10px]">รหัสเอกสาร (Doc Code):</span>
              <span className="font-mono font-black text-[13px] text-blue-900">{dar.docCode}</span>
            </div>
            <div className="col-span-8">
              <span className="text-stone-500 block text-[10px]">ชื่อเอกสารมาตรฐาน (Document Title):</span>
              <span className="font-bold text-stone-950 text-xs">{dar.docTitle}</span>
            </div>
          </div>

          {/* Row 3: Revision Change, Language, Usage Format */}
          <div className="grid grid-cols-12 gap-2 border-b border-stone-200 pb-1.5 text-[11px]">
            <div className="col-span-4">
              <span className="text-stone-500 block text-[10px]">การแก้ไขครั้งที่:</span>
              <span>จากเดิม Rev. <b className="font-mono">{dar.currentRev || '00'}</b> ➔ เป็น Rev. <b className="font-mono text-emerald-800">{dar.proposedRev || '01'}</b></span>
            </div>
            <div className="col-span-4">
              <span className="text-stone-500 block text-[10px]">ภาษาเอกสาร:</span>
              <span>
                {dar.language === 'TH' ? '[✓] ภาษาไทย' : dar.language === 'EN' ? '[✓] English' : '[✓] ไทย / English (Bilingual)'}
              </span>
            </div>
            <div className="col-span-4">
              <span className="text-stone-500 block text-[10px]">รูปแบบการใช้งาน:</span>
              <span>
                {dar.usageFormat === 'Paper' ? '[✓] กระดาษ (Hardcopy)' : dar.usageFormat === 'File' ? '[✓] ไฟล์ดิจิทัล (Softcopy)' : '[✓] ทั้ง Hardcopy & ดิจิทัล'}
              </span>
            </div>
          </div>

          {/* Row 4: Document Reference */}
          {dar.docReference && (
            <div className="border-b border-stone-200 pb-1.5 text-[11px]">
              <span className="text-stone-500 text-[10px]">เอกสารอ้างอิง: </span>
              <span className="font-semibold">{dar.docReference}</span>
            </div>
          )}

          {/* Row 5: Reason for Change / Objective */}
          <div className="border-b border-stone-200 pb-1.5">
            <span className="text-stone-500 block text-[10px] font-bold">หลักการ เหตุผล หรือวัตถุประสงค์ในการขอดำเนินการ:</span>
            <p className="mt-0.5 text-stone-900 bg-stone-50/70 p-2 rounded border border-stone-200 text-xs leading-relaxed whitespace-pre-line">
              {dar.reasonForChange}
            </p>
          </div>

          {/* Row 6: Effective Date & Training Gatekeeper */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-stone-500 block text-[10px]">กำหนดวันที่มีผลบังคับใช้ (Target Date):</span>
              <span className="font-mono font-bold text-stone-900 text-xs">{dar.effectiveTargetDate || '-'}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">การฝึกอบรม (Training Gatekeeper):</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${dar.trainingRequired ? 'bg-black text-white font-black' : ''}`}>
                    {dar.trainingRequired ? '✓' : ''}
                  </span>
                  <span className={dar.trainingRequired ? 'font-bold' : ''}>จำเป็นต้องฝึกอบรมก่อนมีผลใช้</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${!dar.trainingRequired ? 'bg-black text-white font-black' : ''}`}>
                    {!dar.trainingRequired ? '✓' : ''}
                  </span>
                  <span className={!dar.trainingRequired ? 'font-bold' : ''}>ไม่ต้องฝึกอบรม</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ส่วนที่ 3: พิจารณาบทบาทการจัดทำเอกสารควบคุม
      ========================================================================= */}
      <div className="border-2 border-black border-t-0">
        <div className="bg-[#1E7E34] text-white font-bold text-[11px] px-2.5 py-1 flex items-center justify-between">
          <span>ส่วนที่ 3 : พิจารณาบทบาทการจัดทำเอกสารควบคุม</span>
          <span className="text-[10px] text-emerald-100 font-normal">Section 3: Initiator & Reviewer Sign-offs</span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-black text-xs">
          {/* ผู้ขอดำเนินการ (Initiator) */}
          <div className="p-2 space-y-1">
            <div className="font-black text-stone-900 flex items-center justify-between border-b border-stone-300 pb-1">
              <span>ผู้ขอดำเนินการ (Initiator)</span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300">
                [✓ ดิจิทัลสตริงเกอร์]
              </span>
            </div>
            <div className="pt-1 space-y-0.5 text-[11px]">
              <div>ชื่อ-นามสกุล: <b className="text-stone-900">{dar.initiatorName}</b></div>
              <div>รหัสพนักงาน: <span className="font-mono font-bold text-blue-900">{dar.initiatorEmpId || '-'}</span></div>
              <div>ตำแหน่ง: <span>{dar.initiatorPosition || 'ผู้ขอดำเนินการ'}</span></div>
              <div>ฝ่าย/แผนก: <span>{dar.initiatorDept || dar.departmentCode}</span></div>
              <div>วันที่ขอดำเนินการ: <span className="font-mono">{dar.initiatorDate || '-'}</span></div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[10px] text-stone-500">ลายมือชื่ออิเล็กทรอนิกส์:</span>
                <span className="font-mono text-[10px] font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                  {dar.initiatorSign || `${dar.initiatorName} (${dar.initiatorEmpId || 'ID'})`}
                </span>
              </div>
            </div>
          </div>

          {/* ผู้ทบทวน (Reviewer) */}
          <div className="p-2 space-y-1">
            <div className="font-black text-stone-900 flex items-center justify-between border-b border-stone-300 pb-1">
              <span>ผู้ทบทวน (Reviewer)</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${dar.reviewerStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                {dar.reviewerStatus === 'APPROVED' ? '✓ ทบทวนแล้ว' : '⏳ รอทบทวน'}
              </span>
            </div>
            <div className="pt-1 space-y-0.5 text-[11px]">
              <div>ชื่อ-นามสกุล: <b className="text-stone-900">{dar.reviewerName || '-'}</b></div>
              <div>รหัสพนักงาน: <span className="font-mono font-bold text-blue-900">{dar.reviewerEmpId || '-'}</span></div>
              <div>ตำแหน่ง: <span>{dar.reviewerPosition || '-'}</span></div>
              <div>ฝ่าย/แผนก: <span>{dar.reviewerDept || dar.departmentCode}</span></div>
              <div>วันที่ทบทวน: <span className="font-mono">{dar.reviewerDate || '-'}</span></div>
              <div>ความเห็น: <span className="text-stone-700 italic">{dar.reviewerComment || 'เห็นชอบตามเสนอ'}</span></div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[10px] text-stone-500">ลายมือชื่ออิเล็กทรอนิกส์:</span>
                <span className="font-mono text-[10px] font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                  {dar.reviewerSign || (dar.reviewerStatus === 'APPROVED' ? `${dar.reviewerName} (${dar.reviewerEmpId || 'ID'})` : 'รอลงนาม')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ส่วนที่ 4: แผนกที่เกี่ยวข้อง / สำเนาแจกจ่าย (19 แผนก)
      ========================================================================= */}
      <div className="border-2 border-black border-t-0">
        <div className="bg-[#1E7E34] text-white font-bold text-[11px] px-2.5 py-1 flex items-center justify-between">
          <span>ส่วนที่ 4 : แผนกที่เกี่ยวข้อง / สำเนาแจกจ่าย (19 แผนก)</span>
          <span className="text-[10px] text-emerald-100 font-normal">Section 4: Distribution List</span>
        </div>

        <div className="p-2">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 text-[10px]">
            {DCC_19_DEPARTMENTS.map(dept => {
              const isChecked = targetDepts.includes(dept.code) || targetDepts.includes(dept.code.toLowerCase())
              return (
                <div key={dept.code} className={`flex items-center gap-1 p-0.5 rounded ${isChecked ? 'bg-emerald-50/80 font-bold' : 'text-stone-600'}`}>
                  <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${isChecked ? 'bg-black text-white font-black' : ''}`}>
                    {isChecked ? '✓' : ''}
                  </span>
                  <span className="truncate">{dept.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ส่วนที่ 5: พิจารณาอนุมัติให้ดำเนินการเอกสารควบคุม
      ========================================================================= */}
      <div className="border-2 border-black border-t-0">
        <div className="bg-[#1E7E34] text-white font-bold text-[11px] px-2.5 py-1 flex items-center justify-between">
          <span>ส่วนที่ 5 : พิจารณาอนุมัติให้ดำเนินการเอกสารควบคุม (ผจก.ฝ่ายประกันคุณภาพ / ผู้อำนวยการโรงงาน)</span>
          <span className="text-[10px] text-emerald-100 font-normal">Section 5: Final Authorization</span>
        </div>

        <div className="p-2 space-y-1.5 text-xs">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <div className="flex items-center gap-4">
              <span className="font-bold">ผลการพิจารณา:</span>
              <div className="flex items-center gap-1">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${dar.finalApprovalStatus === 'APPROVED' ? 'bg-black text-white font-black' : ''}`}>
                  {dar.finalApprovalStatus === 'APPROVED' ? '✓' : ''}
                </span>
                <span className={dar.finalApprovalStatus === 'APPROVED' ? 'font-black text-emerald-900' : ''}>อนุมัติให้ดำเนินการ (Approved)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${dar.finalApprovalStatus === 'REJECTED' ? 'bg-black text-white font-black' : ''}`}>
                  {dar.finalApprovalStatus === 'REJECTED' ? '✓' : ''}
                </span>
                <span className={dar.finalApprovalStatus === 'REJECTED' ? 'font-black text-red-900' : ''}>ไม่อนุมัติ (Rejected)</span>
              </div>
            </div>

            <div className="text-[11px] font-mono">
              สถานะ: <b className={dar.status === 'EFFECTIVE' ? 'text-emerald-800' : 'text-amber-800'}>{dar.status}</b>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 text-[11px]">
            <div className="col-span-8">
              <span className="text-stone-500 block text-[10px]">เหตุผล / หมายเหตุการอนุมัติ:</span>
              <p className="p-1.5 bg-stone-50 rounded border border-stone-200 text-stone-800">
                {dar.finalApprovalReason || (dar.finalApprovalStatus === 'APPROVED' ? 'อนุมัติให้ประกาศใช้ตามระบบคุณภาพ และส่งสัญญาณอัปเดตโมดูล Maintenance อัตโนมัติ' : 'รอการพิจารณาอนุมัติ')}
              </p>
            </div>

            <div className="col-span-4 space-y-0.5 border-l border-stone-200 pl-2">
              <span className="text-stone-500 block text-[10px] font-bold">ผู้อนุมัติ (Approver):</span>
              <div>ชื่อ: <b className="text-stone-900">{dar.finalApproverName}</b></div>
              <div>รหัสพนักงาน: <span className="font-mono font-bold text-blue-900">{dar.finalApproverEmpId || 'pdtcps001'}</span></div>
              <div>ตำแหน่ง: <span>{dar.finalApproverPosition || 'Plant Director (PDT)'}</span></div>
              <div>วันที่อนุมัติ: <span className="font-mono font-bold">{dar.finalApprovalDate || '-'}</span></div>
              <div className="pt-0.5">
                <span className="font-mono text-[9px] font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 block text-center">
                  {dar.finalApproverSign || `${dar.finalApproverName} (${dar.finalApproverEmpId || 'pdtcps001'})`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ส่วนที่ 6: การแจกจ่ายและเรียกคืนเอกสารควบคุม (สำหรับ DC)
      ========================================================================= */}
      <div className="border-2 border-black border-t-0">
        <div className="bg-[#1E7E34] text-white font-bold text-[11px] px-2.5 py-1 flex items-center justify-between">
          <span>ส่วนที่ 6 : การแจกจ่ายและเรียกคืนเอกสารควบคุม (สำหรับ DC)</span>
          <span className="text-[10px] text-emerald-100 font-normal">Section 6: Distribution & Recall</span>
        </div>

        <div className="grid grid-cols-4 divide-x divide-black text-[11px]">
          {/* Col 1: DC ผู้แจกจ่ายเอกสารใหม่ */}
          <div className="p-2 space-y-0.5">
            <div className="font-bold text-stone-900 border-b border-stone-200 pb-0.5 text-[10px]">
              1. ผู้แจกจ่ายเอกสารใหม่ (DC)
            </div>
            <div>ชื่อ: <span className="font-semibold">{dar.dccDistributionOfficerName || 'DCC Officer'}</span></div>
            <div>รหัส: <span className="font-mono text-[10px]">{dar.dccDistributionOfficerEmpId || '-'}</span></div>
            <div>วันที่: <span className="font-mono">{dar.dccDistributionDate || '-'}</span></div>
            <div className="text-[9px] text-stone-500 font-mono truncate">{dar.dccDistributionSign || '-'}</div>
          </div>

          {/* Col 2: ผู้รับเอกสารใหม่ (จากแผนก) */}
          <div className="p-2 space-y-0.5">
            <div className="font-bold text-stone-900 border-b border-stone-200 pb-0.5 text-[10px]">
              2. ผู้รับเอกสารใหม่ (แผนก)
            </div>
            <div>ชื่อ: <span className="font-semibold">{dar.deptReceiverName || '-'}</span></div>
            <div>รหัส: <span className="font-mono text-[10px]">{dar.deptReceiverEmpId || '-'}</span></div>
            <div>แผนก: <span>{dar.deptReceiverDept || dar.departmentCode}</span></div>
            <div>วันที่: <span className="font-mono">{dar.deptReceivedDate || '-'}</span></div>
          </div>

          {/* Col 3: ผู้คืนเอกสารเก่าให้ DCC */}
          <div className="p-2 space-y-0.5">
            <div className="font-bold text-stone-900 border-b border-stone-200 pb-0.5 text-[10px]">
              3. ผู้คืนเอกสารเก่า (แผนก)
            </div>
            <div>ชื่อ: <span className="font-semibold">{dar.deptReturnerName || '-'}</span></div>
            <div>รหัส: <span className="font-mono text-[10px]">{dar.deptReturnerEmpId || '-'}</span></div>
            <div>แผนก: <span>{dar.deptReturnerDept || dar.departmentCode}</span></div>
            <div>วันที่: <span className="font-mono">{dar.deptReturnedDate || '-'}</span></div>
          </div>

          {/* Col 4: DC รับเอกสารเก่าคืน */}
          <div className="p-2 space-y-0.5">
            <div className="font-bold text-stone-900 border-b border-stone-200 pb-0.5 text-[10px]">
              4. DC รับเอกสารเก่าคืน
            </div>
            <div>ชื่อ: <span className="font-semibold">{dar.dccRecallOfficerName || 'DCC Officer'}</span></div>
            <div>รหัส: <span className="font-mono text-[10px]">{dar.dccRecallOfficerEmpId || '-'}</span></div>
            <div>วันที่: <span className="font-mono">{dar.dccRecallDate || '-'}</span></div>
            <div className="text-[9px] text-stone-500 font-mono truncate">{dar.dccRecallSign || '-'}</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ส่วนที่ 7: การทำลายและการควบคุมฉบับยกเลิกเอกสาร (สำหรับ DC)
      ========================================================================= */}
      <div className="border-2 border-black border-t-0">
        <div className="bg-[#1E7E34] text-white font-bold text-[11px] px-2.5 py-1 flex items-center justify-between">
          <span>ส่วนที่ 7 : การทำลายและการควบคุมฉบับยกเลิกเอกสาร (สำหรับ DC)</span>
          <span className="text-[10px] text-emerald-100 font-normal">Section 7: Disposal & Obsolete Control</span>
        </div>

        <div className="p-2 space-y-1.5 text-[11px]">
          {/* Disposal Methods */}
          <div className="grid grid-cols-2 gap-4 border-b border-stone-200 pb-1.5">
            <div>
              <span className="font-bold block text-[10px] text-stone-700">เอกสารต้นฉบับ (Original):</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${dar.originalDisposalMethod === 'STAMP_CANCEL' ? 'bg-black text-white font-black' : ''}`}>
                    {dar.originalDisposalMethod === 'STAMP_CANCEL' ? '✓' : ''}
                  </span>
                  <span className="text-red-700 font-bold">ประทับตรา &quot;ยกเลิก&quot; หมึกแดง</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${dar.originalDisposalMethod === 'SHRED' ? 'bg-black text-white font-black' : ''}`}>
                    {dar.originalDisposalMethod === 'SHRED' ? '✓' : ''}
                  </span>
                  <span>ฉีกย่อยทำลาย</span>
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold block text-[10px] text-stone-700">เอกสารสำเนา (Controlled Copy):</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1">
                  <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${dar.copyDisposalMethod === 'SHRED' ? 'bg-black text-white font-black' : ''}`}>
                    {dar.copyDisposalMethod === 'SHRED' ? '✓' : ''}
                  </span>
                  <span>ฉีกย่อยทำลาย (Shred)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${dar.copyDisposalMethod === 'OTHER' ? 'bg-black text-white font-black' : ''}`}>
                    {dar.copyDisposalMethod === 'OTHER' ? '✓' : ''}
                  </span>
                  <span>อื่นๆ: {dar.copyDisposalOther || '-'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Disposal Actors */}
          <div className="grid grid-cols-2 divide-x divide-stone-200 pt-0.5">
            <div className="pr-3 space-y-0.5">
              <span className="font-bold text-[10px] text-stone-800 block">ผู้ดำเนินการทำลาย (DCC Officer):</span>
              <div>ชื่อ: <span className="font-semibold">{dar.disposalOfficerName || 'DCC Officer'}</span></div>
              <div>รหัสพนักงาน: <span className="font-mono text-[10px]">{dar.disposalOfficerEmpId || '-'}</span></div>
              <div>วันที่ดำเนินการ: <span className="font-mono">{dar.disposalDate || '-'}</span></div>
            </div>

            <div className="pl-3 space-y-0.5">
              <span className="font-bold text-[10px] text-stone-800 block">ผู้อนุมัติทำลาย (QA Manager / Plant Director):</span>
              <div>ชื่อ: <span className="font-semibold">{dar.disposalApproverName || 'Plant Director (PDT)'}</span></div>
              <div>รหัสพนักงาน: <span className="font-mono text-[10px]">{dar.disposalApproverEmpId || 'pdtcps001'}</span></div>
              <div>วันที่อนุมัติ: <span className="font-mono">{dar.disposalApprovalDate || '-'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer System Verification */}
      <div className="mt-2 text-[9px] text-stone-500 flex items-center justify-between">
        <span>Cosmediva Operating System — E-DAR Quality Lifecycle (ISO 9001:2026 / ISO 22716 ALCOA+ Compliant)</span>
        <span className="font-mono">Doc UUID: {dar.id} | Rendered at: {new Date().toISOString().slice(0, 16).replace('T', ' ')}</span>
      </div>
    </div>
  )
}
