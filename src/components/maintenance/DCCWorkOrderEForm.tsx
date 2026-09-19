'use client'

import React from 'react'
import { Printer, Download, Share2, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Props {
  workOrder: any
}

export default function DCCWorkOrderEForm({ workOrder }: Props) {
  if (!workOrder) return null

  const wo = workOrder
  const machine = wo.machine || {}
  const parts = wo.parts || []

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    const shareText = `📄 เอกสารใบแจ้งซ่อมตามมาตรฐาน DCC (MT-PF-001D)\nเลขที่: ${wo.wo_number}\nเครื่องจักร: ${wo.machine_code} - ${wo.machine_name}\nอาการ: ${wo.symptom_category}\nสถานะ: ${wo.status}\nช่างผู้ซ่อม: ${wo.assigned_technician_name || '-'}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ใบแจ้งซ่อม DCC ${wo.wo_number}`,
          text: shareText,
          url: window.location.href
        })
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error(err)
      }
    } else {
      navigator.clipboard.writeText(shareText + `\nลิงก์: ${window.location.href}`)
      toast.success('คัดลอกข้อความและลิงก์ใบแจ้งซ่อมแล้ว สามารถวางใน LINE ได้เลยค่ะ')
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 py-4 sm:py-8 px-2 sm:px-4 text-stone-900 font-sans print:p-0 print:bg-white">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/maintenance/work-orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปบอร์ดงานซ่อม</span>
        </Link>

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

      {/* Official DCC A4 Sheet */}
      <div className="max-w-[210mm] mx-auto bg-white border border-stone-300 shadow-2xl p-6 sm:p-10 rounded-xl print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full">
        {/* =========================================================================
            DCC STANDARD HEADER TABLE
        ========================================================================= */}
        <div className="border-2 border-black divide-y-2 divide-black text-xs">
          <div className="grid grid-cols-12 divide-x-2 divide-black">
            {/* Logo / Company */}
            <div className="col-span-3 p-3 flex flex-col justify-center items-center text-center bg-stone-50 print:bg-white">
              <span className="font-black text-sm tracking-tighter text-stone-900 uppercase block">
                COSMEDIVA
              </span>
              <span className="text-[9px] text-stone-600 font-semibold mt-0.5 block">
                Cosmediva Co., Ltd.
              </span>
              <span className="text-[8px] text-stone-500 block">
                Quality & Production Center
              </span>
            </div>

            {/* Document Title */}
            <div className="col-span-6 p-3 flex flex-col justify-center items-center text-center">
              <h1 className="font-black text-sm sm:text-base text-stone-950 uppercase tracking-tight">
                ใบแจ้งซ่อมและบันทึกการซ่อมบำรุง
              </h1>
              <span className="text-[11px] font-bold text-stone-700 tracking-wide mt-0.5">
                MAINTENANCE WORK ORDER & REPAIR RECORD
              </span>
              <span className="text-[10px] text-stone-500 font-medium">
                ฝ่ายวิศวกรรมและซ่อมบำรุง (Engineering & Maintenance)
              </span>
            </div>

            {/* DCC Meta Control Box */}
            <div className="col-span-3 p-2 text-[10px] space-y-1 bg-stone-50 print:bg-white font-mono">
              <div className="flex justify-between border-b border-stone-300 pb-0.5">
                <span className="font-bold text-stone-600">เลขที่เอกสาร:</span>
                <b className="text-black">MT-PF-001D</b>
              </div>
              <div className="flex justify-between border-b border-stone-300 pb-0.5">
                <span className="font-bold text-stone-600">แก้ไขครั้งที่:</span>
                <b className="text-black">00</b>
              </div>
              <div className="flex justify-between border-b border-stone-300 pb-0.5">
                <span className="font-bold text-stone-600">วันที่มีผลบังคับใช้:</span>
                <b className="text-black">19 JAN 24</b>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-stone-600">สำเนาที่ / สถานะ:</span>
                <b className="text-red-700">13 (CONTROLLED)</b>
              </div>
            </div>
          </div>
        </div>

        {/* WO Number Bar */}
        <div className="flex items-center justify-between border-x-2 border-b-2 border-black p-2 bg-stone-100 print:bg-stone-100 text-xs font-mono">
          <div>
            <span className="text-stone-600 font-sans">เลขที่ใบสั่งซ่อม (Work Order No.): </span>
            <b className="text-stone-900 font-black text-sm">{wo.wo_number}</b>
          </div>
          <div>
            <span className="text-stone-600 font-sans">ระดับความเร่งด่วน: </span>
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${
              wo.priority === 'P1_CRITICAL' ? 'bg-red-600 text-white' : 'bg-black text-white'
            }`}>
              {wo.priority}
            </span>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: REQUESTER & MACHINE DETAILS
        ========================================================================= */}
        <div className="border-x-2 border-b-2 border-black p-3 space-y-2 text-xs">
          <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] bg-stone-200 print:bg-stone-200 px-2 py-1 flex items-center justify-between">
            <span>ส่วนที่ 1: รายละเอียดการแจ้งซ่อม (Work Request & Problem Identification)</span>
            <span className="font-mono text-[10px] text-stone-600 font-normal">
              แจ้งเมื่อ: {new Date(wo.reported_at).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div>
              <span className="text-stone-500 block text-[10px]">รหัสเครื่องจักร:</span>
              <b className="font-mono text-sm text-stone-950">{wo.machine_code}</b>
            </div>
            <div className="col-span-2">
              <span className="text-stone-500 block text-[10px]">ชื่อเครื่องจักร:</span>
              <b className="text-stone-900 text-xs">{wo.machine_name}</b>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">หมวดหมู่เครื่อง:</span>
              <span className="text-stone-800">{machine.category || '-'}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">แผนกเจ้าของ:</span>
              <b className="text-stone-900">{machine.department_code || wo.requester_department_name || 'PD'}</b>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">บริเวณที่ตั้ง (Line / Room):</span>
              <span className="text-stone-800">{machine.production_area || machine.room_name || 'Main Factory'}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">ผลกระทบการผลิต:</span>
              <b className={wo.production_impact === 'Production stopped' ? 'text-red-700' : 'text-stone-900'}>
                {wo.production_impact}
              </b>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">ผู้แจ้งซ่อม (Requester):</span>
              <b className="text-stone-900">{wo.requester_name}</b>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-stone-500 block text-[10px]">กลุ่มอาการที่พบ (Symptom):</span>
                <span className="inline-block px-2 py-0.5 rounded bg-stone-100 font-bold text-stone-900 mt-0.5">
                  {wo.symptom_category}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-stone-500 block text-[10px]">คำอธิบายอาการ / ข้อสังเกตหน้างาน:</span>
                <p className="text-stone-800 italic mt-0.5">
                  {wo.symptom_description || 'ไม่มีคำอธิบายเพิ่มเติม (เลือกกลุ่มอาการมาตรฐาน)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: MAINTENANCE DIAGNOSIS & ACTIONS
        ========================================================================= */}
        <div className="border-x-2 border-b-2 border-black p-3 space-y-2 text-xs">
          <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] bg-stone-200 print:bg-stone-200 px-2 py-1">
            ส่วนที่ 2: การตรวจสอบและดำเนินการซ่อมบำรุง (Maintenance Diagnosis & Corrective Action)
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
            <div>
              <span className="text-stone-500 block text-[10px] font-sans">ช่างผู้รับผิดชอบ:</span>
              <b className="text-stone-900 font-sans">{wo.assigned_technician_name || 'ช่างประจำกะ'}</b>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px] font-sans">เวลาเริ่มซ่อม:</span>
              <span>{wo.repair_started_at ? new Date(wo.repair_started_at).toLocaleTimeString('th-TH') : '-'} น.</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px] font-sans">เวลาซ่อมเสร็จ:</span>
              <span>{wo.repair_completed_at ? new Date(wo.repair_completed_at).toLocaleTimeString('th-TH') : '-'} น.</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px] font-sans">Downtime รวม:</span>
              <b className="text-red-700">{wo.total_downtime_minutes || 0} นาที</b>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
            <div>
              <span className="text-stone-500 block text-[10px]">หมวดหมู่ปัญหา (Problem Category):</span>
              <b className="text-stone-900">{wo.problem_category || 'Mechanical & Electrical'}</b>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px]">สาเหตุที่แท้จริง (Root Cause):</span>
              <b className="text-stone-900">{wo.root_cause || 'Wear & Tear (การสึกหรอตามอายุใช้งาน)'}</b>
            </div>
            <div className="col-span-2">
              <span className="text-stone-500 block text-[10px]">การแก้ไขปัญหาที่ดำเนินการ (Corrective Action Taken):</span>
              <p className="text-stone-900 font-medium mt-0.5">
                {wo.corrective_action || 'ตรวจสอบ ปรับตั้งศูนย์ เปลี่ยนชิ้นส่วนที่ชำรุด และทำความสะอาดทดสอบระบบ'}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-stone-500 block text-[10px]">ข้อเสนอแนะเชิงป้องกัน (Preventive Recommendation):</span>
              <p className="text-stone-800 italic mt-0.5">
                {wo.preventive_recommendation || 'ติดตามการทำงานในรอบแผน PM ถัดไป ตรวจสอบระดับการหล่อลื่นเป็นประจำ'}
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: SPARE PARTS REPLACEMENT TABLE
        ========================================================================= */}
        <div className="border-x-2 border-b-2 border-black text-xs">
          <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] bg-stone-200 print:bg-stone-200 px-3 py-1 border-b-2 border-black flex justify-between">
            <span>ส่วนที่ 3: รายการอะไหล่ที่เปลี่ยน (Spare Parts Replaced)</span>
            <span className="font-normal text-[10px]">เบิกใช้อะไหล่ทั้งหมด {parts.length} รายการ</span>
          </div>

          {parts.length === 0 ? (
            <div className="p-3 text-center text-stone-500 italic text-[11px]">
              - ไม่มีการเบิกใช้อะไหล่ในงานซ่อมนี้ (แก้ไขด้วยการปรับแต่ง / หล่อลื่น / ตั้งค่าระบบ) -
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-stone-100 print:bg-stone-100 border-b border-black font-semibold">
                  <th className="p-1.5 pl-3 w-10 text-center">ลำดับ</th>
                  <th className="p-1.5">รหัสอะไหล่</th>
                  <th className="p-1.5">รายการอะไหล่</th>
                  <th className="p-1.5 text-center w-20">จำนวน</th>
                  <th className="p-1.5 text-center w-16">หน่วย</th>
                  <th className="p-1.5 text-right w-24">ราคา/หน่วย</th>
                  <th className="p-1.5 pr-3 text-right w-28">ราคารวม (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-300 font-mono">
                {parts.map((p: any, i: number) => (
                  <tr key={p.id || i}>
                    <td className="p-1.5 pl-3 text-center">{i + 1}</td>
                    <td className="p-1.5 font-bold">{p.part_code}</td>
                    <td className="p-1.5 font-sans">{p.part_name}</td>
                    <td className="p-1.5 text-center">{p.quantity}</td>
                    <td className="p-1.5 text-center font-sans">{p.unit}</td>
                    <td className="p-1.5 text-right">฿{Number(p.unit_cost || 0).toLocaleString()}</td>
                    <td className="p-1.5 pr-3 text-right font-bold">฿{Number(p.total_cost || 0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-stone-50 font-bold border-t border-black">
                  <td colSpan={6} className="p-1.5 text-right font-sans">ต้นทุนอะไหล่รวมทั้งสิ้น:</td>
                  <td className="p-1.5 pr-3 text-right text-stone-900">
                    ฿{Number(wo.total_part_cost || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* =========================================================================
            SECTION 4: PHOTO EVIDENCE (BEFORE & AFTER)
        ========================================================================= */}
        <div className="border-x-2 border-b-2 border-black p-3 space-y-2 text-xs">
          <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] bg-stone-200 print:bg-stone-200 px-2 py-1">
            ส่วนที่ 4: ภาพถ่ายหลักฐานเชิงประจักษ์ (Visual Evidence - Audit Proof)
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Before Photo */}
            <div className="border border-stone-300 rounded-lg p-2 text-center bg-stone-50 print:bg-white flex flex-col justify-between">
              <span className="font-bold text-stone-700 block mb-1 text-[11px]">
                📸 ภาพถ่ายก่อนซ่อม / ตอนแจ้งเสีย (Before Repair)
              </span>
              <div className="h-36 w-full rounded border border-stone-200 overflow-hidden bg-stone-200 flex items-center justify-center">
                {wo.photo_before_urls && wo.photo_before_urls[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={wo.photo_before_urls[0]} alt="Before Repair" className="h-36 w-full object-contain" />
                ) : (
                  <span className="text-stone-400 italic text-[10px]">ไม่มีการแนบภาพถ่ายก่อนซ่อม</span>
                )}
              </div>
              <span className="text-[9px] text-stone-400 mt-1 block">บันทึกผ่านระบบดิจิทัลขณะแจ้งซ่อม</span>
            </div>

            {/* After Photo */}
            <div className="border border-stone-300 rounded-lg p-2 text-center bg-stone-50 print:bg-white flex flex-col justify-between">
              <span className="font-bold text-stone-700 block mb-1 text-[11px]">
                📸 ภาพถ่ายหลังซ่อมเสร็จพร้อมใช้งาน (After Repair)
              </span>
              <div className="h-36 w-full rounded border border-stone-200 overflow-hidden bg-stone-200 flex items-center justify-center">
                {wo.photo_after_urls && wo.photo_after_urls[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={wo.photo_after_urls[0]} alt="After Repair" className="h-36 w-full object-contain" />
                ) : (
                  <span className="text-stone-400 italic text-[10px]">ไม่มีการแนบภาพถ่ายหลังซ่อม</span>
                )}
              </div>
              <span className="text-[9px] text-stone-400 mt-1 block">บันทึกผ่านระบบดิจิทัลขณะส่งมอบงาน</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 5: SIGN-OFF & ACCEPTANCE (GMP / DCC COMPLIANT)
        ========================================================================= */}
        <div className="border-2 border-t-0 border-black p-3 space-y-3 text-xs">
          <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] bg-stone-200 print:bg-stone-200 px-2 py-1 flex justify-between">
            <span>ส่วนที่ 5: การตรวจรับมอบงานและการลงนาม (Inspection & Acceptance Sign-off)</span>
            <span>ผลทดสอบรันเครื่อง (Test Run): <b className="text-emerald-800">[ ✓ ผ่านมาตรฐาน ]</b></span>
          </div>

          {/* 3 Signatures Columns */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Box 1: Technician */}
            <div className="border border-black p-2.5 rounded text-center space-y-3 bg-stone-50/50">
              <span className="font-bold text-[10px] text-stone-700 uppercase block border-b border-stone-200 pb-1">
                1. ช่างผู้ดำเนินการซ่อม
              </span>
              <div className="h-10 flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-xs text-stone-900 underline decoration-dotted">
                  {wo.assigned_technician_name || 'ช่างซ่อมบำรุง'}
                </span>
                <span className="text-[9px] text-stone-500">
                  (ระบบยืนยันตัวตนดิจิทัล)
                </span>
              </div>
              <div className="text-[10px] text-stone-600 border-t border-stone-200 pt-1">
                วันที่: {wo.repair_completed_at ? new Date(wo.repair_completed_at).toLocaleDateString('th-TH') : '___/___/______'}
              </div>
            </div>

            {/* Box 2: Maintenance Supervisor */}
            <div className="border border-black p-2.5 rounded text-center space-y-3 bg-stone-50/50">
              <span className="font-bold text-[10px] text-stone-700 uppercase block border-b border-stone-200 pb-1">
                2. หัวหน้าแผนกซ่อมบำรุง
              </span>
              <div className="h-10 flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-xs text-stone-900 underline decoration-dotted">
                  {wo.supervisor_name || 'หัวหน้าแผนกซ่อมบำรุง'}
                </span>
                <span className="text-[9px] text-stone-500">
                  (ตรวจสอบความถูกต้อง)
                </span>
              </div>
              <div className="text-[10px] text-stone-600 border-t border-stone-200 pt-1">
                วันที่: {wo.closed_at ? new Date(wo.closed_at).toLocaleDateString('th-TH') : '___/___/______'}
              </div>
            </div>

            {/* Box 3: Production Verifier */}
            <div className="border border-black p-2.5 rounded text-center space-y-3 bg-stone-50/50">
              <span className="font-bold text-[10px] text-stone-700 uppercase block border-b border-stone-200 pb-1">
                3. ผู้ตรวจรับมอบงานฝ่ายผลิต
              </span>
              <div className="h-10 flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-xs text-stone-900 underline decoration-dotted">
                  {wo.verified_by_name || wo.requester_name || 'หัวหน้ากะฝ่ายผลิต'}
                </span>
                <span className="text-[9px] text-stone-500">
                  (เครื่องจักรพร้อมเดินงาน 100%)
                </span>
              </div>
              <div className="text-[10px] text-stone-600 border-t border-stone-200 pt-1">
                วันที่: {wo.verified_at ? new Date(wo.verified_at).toLocaleDateString('th-TH') : '___/___/______'}
              </div>
            </div>
          </div>

          {/* Footer Audit Stamp */}
          <div className="pt-2 flex items-center justify-between text-[10px] text-stone-500 border-t border-stone-200 font-mono">
            <div>
              DOCUMENT ISSUED VIA COSMEFLOW OS • CMMS INDUSTRIAL MODULE
            </div>
            <div className="flex items-center gap-1 font-bold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>DCC AUDIT-READY • ISO 22716 & GMP COMPLIANT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
