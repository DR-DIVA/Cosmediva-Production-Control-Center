'use client'

import React from 'react';
import { Printer, X, FileText } from 'lucide-react';

export interface OtEFormData {
  id?: string;
  submissionDate: string; // e.g. 04/09/26
  division: string;       // e.g. PD (ฝ่ายผลิต)
  department: string;     // e.g. MX (แผนกผสม)
  productName: string;    // e.g. NAWANNA
  jobCode: string;        // e.g. JHD-318
  otDate: string;         // e.g. 04/09/26
  startTime: string;      // e.g. 17.00
  endTime: string;        // e.g. 19.00
  hours: number | string; // e.g. 2 ชม.
  target: string;         // e.g. แช่+ผสม JHD-318 LOT 009/26
  reason: string;         // e.g. แช่+ผสม
  requestedBy?: string;
  supervisorApprover?: string;
  hrApprover?: string;
  directorApprover?: string;
  participants: Array<{
    code?: string;
    name: string;
    hours?: number | string;
    position?: string;
    note?: string;
  }>;
}

interface OtEFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OtEFormData;
}

export function OtEFormModal({ isOpen, onClose, data }: OtEFormModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to format date to DD/MM/YY (Thai or Buddhist style e.g. 04/09/26)
  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      return `${parts[2]}/${parts[1]}/${year}`;
    }
    return dateStr;
  };

  // Ensure 30 rows in table
  const totalRows = 30;
  const rows = Array.from({ length: totalRows }, (_, idx) => {
    return data.participants[idx] || null;
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container */}
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>เอกสารใบขอทำงานล่วงเวลา (E-Form)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  A4 Standard Form
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">แบบฟอร์มขอโอทีมาตรฐานฝ่ายทรัพยากรบุคคล พร้อมพิมพ์หรือบันทึกเป็น PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร / บันทึก PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 6mm 8mm 6mm 8mm;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-ot-eform, #printable-ot-eform * {
                visibility: visible !important;
              }
              #printable-ot-eform {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
            }
          `}} />

          {/* The A4 Sheet Box */}
          <div
            id="printable-ot-eform"
            className="bg-white mx-auto border-2 border-black text-black font-sans shadow-lg print:shadow-none print:border-2 print:border-black max-w-[210mm] min-h-[285mm] p-4 flex flex-col justify-between"
            style={{ fontFamily: "'Sarabun', 'Prompt', 'Tahoma', sans-serif" }}
          >
            <div>
              {/* TOP HEADER: Logo & Title */}
              <div className="border-b-2 border-black flex items-stretch">
                {/* Logo Box */}
                <div className="w-48 border-r-2 border-black p-2 flex flex-col items-center justify-center shrink-0 bg-white">
                  <div className="h-14 flex items-center justify-center py-0.5">
                    {/* Official Cosmediva Logo from www.cosmediva.co.th */}
                    <img
                      src="/cosmediva-logo.png"
                      alt="Cosmediva Official Logo"
                      className="h-full w-auto object-contain max-w-[150px]"
                    />
                  </div>
                  <div className="w-full border-t border-black my-1"></div>
                  <div className="text-[10.5px] font-bold tracking-tight text-center">ฝ่ายทรัพยากรบุคคล</div>
                </div>

                {/* Form Title */}
                <div className="flex-1 flex items-center justify-center py-4 px-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-center">
                    ใบขอทำงานล่วงเวลา
                  </h1>
                </div>
              </div>

              {/* FORM FIELDS METADATA SECTION */}
              <div className="p-3 text-[11.5px] leading-relaxed space-y-2 border-b-2 border-black">
                {/* Line 1 */}
                <div className="flex flex-wrap items-baseline justify-between gap-y-1">
                  <div className="flex items-baseline flex-1 min-w-[200px]">
                    <span className="font-bold shrink-0">วันที่ยื่นคำขอ</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-mono font-bold text-center">
                      {formatShortDate(data.submissionDate)}
                    </span>
                  </div>
                  <div className="flex items-baseline w-48 mx-2">
                    <span className="font-bold shrink-0">แผนก</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-bold text-center">
                      {data.department}
                    </span>
                  </div>
                  <div className="flex items-baseline w-40">
                    <span className="font-bold shrink-0">ฝ่าย</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-bold text-center">
                      {data.division}
                    </span>
                  </div>
                </div>

                {/* Line 2 */}
                <div className="flex flex-wrap items-baseline justify-between gap-y-1">
                  <div className="flex items-baseline flex-1 min-w-[240px]">
                    <span className="font-bold shrink-0">ผลิตภัณฑ์</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-bold text-left">
                      {data.productName}
                    </span>
                  </div>
                  <div className="flex items-baseline flex-1 min-w-[200px] ml-4">
                    <span className="font-bold shrink-0">รหัสงาน</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-mono font-bold text-center">
                      {data.jobCode}
                    </span>
                  </div>
                </div>

                {/* Line 3 */}
                <div className="flex flex-wrap items-baseline justify-between gap-y-1">
                  <div className="flex items-baseline flex-1 min-w-[220px]">
                    <span className="font-bold shrink-0">วันที่ขอทำงานล่วงเวลา</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-mono font-bold text-center">
                      {formatShortDate(data.otDate)}
                    </span>
                  </div>
                  <div className="flex items-baseline flex-1 min-w-[240px] ml-4">
                    <span className="font-bold shrink-0">ช่วงเวลา</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-mono font-bold text-center">
                      {data.startTime ? data.startTime.replace(':', '.') : '17.00'}
                    </span>
                    <span className="font-bold mx-2">ถึง</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-mono font-bold text-center">
                      {data.endTime ? data.endTime.replace(':', '.') : '19.00'}
                    </span>
                  </div>
                </div>

                {/* Line 4 */}
                <div className="flex flex-wrap items-baseline justify-between gap-y-1">
                  <div className="flex items-baseline flex-1 min-w-[240px]">
                    <span className="font-bold shrink-0">เหตุผลในการขอ</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-bold">
                      {data.reason}
                    </span>
                  </div>
                  <div className="flex items-baseline w-48 ml-4">
                    <span className="font-bold shrink-0">จำนวนชั่วโมง</span>
                    <span className="flex-1 border-b border-dotted border-black px-2 font-bold text-center">
                      {data.hours} ชม.
                    </span>
                  </div>
                </div>

                {/* Line 5: Target */}
                <div className="flex items-start gap-1">
                  <span className="font-bold shrink-0 pt-0.5">Target</span>
                  <div className="flex-1 border-b border-dotted border-black px-2 font-bold text-left text-[11px] whitespace-pre-wrap leading-relaxed">
                    {data.target || '-'}
                  </div>
                </div>
              </div>

              {/* TABLE: 30 ROWS */}
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-black font-bold text-center bg-slate-50/50">
                    <th className="w-10 border-r border-black py-1 px-1">ลำดับ</th>
                    <th className="border-r border-black py-1 px-2 text-center">รายชื่อพนักงานที่ขอทำงานล่วงเวลา</th>
                    <th className="w-28 border-r border-black py-1 px-1 text-center">จำนวนชั่วโมงทำงาน</th>
                    <th className="w-36 border-r border-black py-1 px-2 text-center">ผู้บันทึก/ตำแหน่ง</th>
                    <th className="w-36 py-1 px-2 text-center">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, idx) => (
                    <tr key={idx} className="border-b border-black h-[18px]">
                      {/* 1. ลำดับ */}
                      <td className="border-r border-black text-center font-bold text-[10.5px] py-0 px-1">
                        {idx + 1}
                      </td>

                      {/* 2. รายชื่อพนักงาน */}
                      <td className="border-r border-black px-2 py-0 text-left font-medium overflow-hidden whitespace-nowrap">
                        {p ? (
                          <div className="flex items-center justify-between">
                            <span>{p.name}</span>
                            {p.code && <span className="text-[9.5px] font-mono font-bold text-slate-600">{p.code}</span>}
                          </div>
                        ) : null}
                      </td>

                      {/* 3. จำนวนชั่วโมงทำงาน */}
                      <td className="border-r border-black text-center py-0 px-1 font-mono font-bold text-[10.5px]">
                        {p ? (p.hours ? `${p.hours} ชม.` : `${data.hours} ชม.`) : ''}
                      </td>

                      {/* 4. ผู้บันทึก/ตำแหน่ง */}
                      <td className="border-r border-black text-center px-1 py-0 text-[10px] overflow-hidden whitespace-nowrap">
                        {p ? (p.position || data.department) : ''}
                      </td>

                      {/* 5. หมายเหตุ */}
                      <td className="px-1 py-0 text-left text-[10px] overflow-hidden whitespace-nowrap">
                        {p?.note || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FOOTER SIGNATURES & CONDITIONS */}
            <div className="pt-4 border-t-2 border-black text-[11px]">
              <div className="grid grid-cols-2 gap-6 items-start pb-3">
                {/* Left: Section Head */}
                <div className="space-y-4 pt-4">
                  <div className="text-center">
                    <div className="inline-block w-64 border-b border-dotted border-black mb-1">
                      {data.supervisorApprover && <span className="font-bold text-xs">{data.supervisorApprover}</span>}
                    </div>
                    <div className="font-bold">ลงชื่อ............................................................</div>
                    <div className="font-bold mt-0.5">หัวหน้าฝ่าย</div>
                  </div>
                </div>

                {/* Right: HR & Director */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-block w-64 border-b border-dotted border-black mb-1">
                      {data.hrApprover && <span className="font-bold text-xs">{data.hrApprover}</span>}
                    </div>
                    <div className="font-bold">ลงชื่อ............................................................</div>
                    <div className="font-bold mt-0.5">ฝ่ายทรัพยากรบุคคล</div>
                  </div>

                  <div className="text-center pt-2">
                    <div className="inline-block w-64 border-b border-dotted border-black mb-1">
                      {data.directorApprover && <span className="font-bold text-xs">{data.directorApprover}</span>}
                    </div>
                    <div className="font-bold">ลงชื่อ............................................................</div>
                    <div className="font-bold mt-0.5">ผู้อำนวยการโรงงาน</div>
                  </div>
                </div>
              </div>

              {/* Bottom Official Notes */}
              <div className="border-t border-black pt-2 text-[10px] leading-relaxed text-slate-800">
                <div className="font-bold">หมายเหตุ</div>
                <div className="pl-4">
                  <div>1. แผนกที่ขอทำงานล่วงเวลา จะต้องส่งใบขอทำงานล่วงเวลาก่อนเวลา 12.00 น.</div>
                  <div>2. ผู้บันทึกจะต้องบันทึกข้อมูลให้ครบถ้วน และมีหัวหน้าฝ่ายอนุมัติให้เรียบร้อยก่อนส่งฝ่ายทรัพยากรบุคคล</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
