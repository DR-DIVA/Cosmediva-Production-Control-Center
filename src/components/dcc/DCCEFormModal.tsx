'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Printer, Share2, CheckCircle2, ShieldCheck, Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface DCCEFormModalProps {
  isOpen: boolean
  onClose: () => void
  record: any | null
}

export default function DCCEFormModal({ isOpen, onClose, record }: DCCEFormModalProps) {
  const [printDate, setPrintDate] = useState('')

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      setPrintDate(now.toLocaleString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }))
    }
  }, [isOpen])

  if (!record) return null

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    const text = `📄 CosmeFlow DCC Quality Record\nรหัสเอกสาร: ${record.docCode}\nเลขที่บันทึก: ${record.recordNumber}\nแผนก: ${record.departmentCode} (${record.streamCode})\nสถานะ: ${record.status}\nผู้อนุมัติ: ${record.approvedByName || 'Plant Director (PDT)'}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      toast.success('คัดลอกข้อมูลเอกสารเรียบร้อยแล้ว สามารถส่งต่อทาง LINE ได้เลยค่ะ')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 print:p-0 print:max-w-none print:h-auto print:border-none">
        {/* Action Header (Hidden on Print) */}
        <div className="sticky top-0 z-20 bg-stone-900 text-white px-6 py-3.5 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">คลังเอกสารคุณภาพดิจิทัล — CosmeFlow DCC</h3>
              <p className="text-[11px] text-stone-300">รหัสเอกสาร: {record.docCode} | บันทึกเลขที่: {record.recordNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="bg-stone-800 hover:bg-stone-700 text-white border-stone-600 text-xs gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>แชร์ส่ง LINE</span>
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#D4AF37] hover:bg-[#b89528] text-stone-950 font-bold text-xs gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร A4 / บันทึก PDF</span>
            </Button>
          </div>
        </div>

        {/* Print Watermark Overlay Style */}
        <div className="p-6 sm:p-10 bg-stone-50 print:bg-white print:p-0 text-stone-900 font-sans relative">
          
          {/* Faint Print Watermark Banner */}
          <div className="hidden print:block fixed inset-0 pointer-events-none z-50 overflow-hidden select-none opacity-[0.08]">
            <div className="w-full h-full flex flex-col justify-around items-center rotate-[-35deg] text-center">
              <p className="text-5xl font-black uppercase text-red-950">UNCONTROLLED COPY WHEN PRINTED</p>
              <p className="text-4xl font-bold text-red-900">เอกสารไม่ควบคุมเมื่อสั่งพิมพ์</p>
              <p className="text-xl font-mono text-stone-800">Printed on: {printDate} by Authorized User</p>
              <p className="text-5xl font-black uppercase text-red-950">UNCONTROLLED COPY WHEN PRINTED</p>
              <p className="text-4xl font-bold text-red-900">เอกสารไม่ควบคุมเมื่อสั่งพิมพ์</p>
            </div>
          </div>

          {/* Official DCC Document Container */}
          <div className="max-w-[210mm] mx-auto bg-white border border-stone-300 shadow-xl p-8 rounded-xl print:shadow-none print:border-none print:p-0">
            
            {/* DCC HEADER TABLE */}
            <div className="border-2 border-black divide-y-2 divide-black text-xs mb-6">
              <div className="grid grid-cols-12 divide-x-2 divide-black">
                {/* Company Logo */}
                <div className="col-span-3 p-3 flex flex-col justify-center items-center text-center bg-stone-50 print:bg-white">
                  <span className="font-black text-base tracking-tighter text-stone-950 uppercase">COSMEDIVA</span>
                  <span className="text-[9px] text-stone-600 font-semibold mt-0.5">Cosmediva Co., Ltd.</span>
                  <span className="text-[8px] text-stone-500">Quality & Production Center</span>
                </div>

                {/* Doc Title */}
                <div className="col-span-6 p-3 flex flex-col justify-center items-center text-center">
                  <h1 className="font-black text-sm sm:text-base text-stone-950 uppercase tracking-tight">
                    {record.formTitle}
                  </h1>
                  <span className="text-[11px] font-bold text-stone-700 tracking-wide mt-0.5">
                    OFFICIAL QUALITY & GMP EXECUTED RECORD
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">
                    {record.streamCode} • ฝ่าย{record.departmentCode} (Approved by Plant Director - PDT)
                  </span>
                </div>

                {/* DCC Control Box */}
                <div className="col-span-3 p-2 text-[10px] space-y-1 bg-stone-50 print:bg-white font-mono">
                  <div className="flex justify-between border-b border-stone-300 pb-0.5">
                    <span className="font-bold text-stone-600">เลขที่เอกสาร:</span>
                    <b className="text-black">{record.docCode}</b>
                  </div>
                  <div className="flex justify-between border-b border-stone-300 pb-0.5">
                    <span className="font-bold text-stone-600">แก้ไขครั้งที่:</span>
                    <b className="text-black">{record.revisionUsed || '00'}</b>
                  </div>
                  <div className="flex justify-between border-b border-stone-300 pb-0.5">
                    <span className="font-bold text-stone-600">วันที่มีผล:</span>
                    <b className="text-black">19 JAN 24</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-stone-600">สถานะ:</span>
                    <b className="text-emerald-700 font-black">CONTROLLED</b>
                  </div>
                </div>
              </div>
            </div>

            {/* RECORD IDENTIFICATION BAR */}
            <div className="flex items-center justify-between border border-stone-400 p-3 bg-stone-100 mb-6 text-xs rounded-sm">
              <div>
                <span className="text-stone-600">หมายเลขอ้างอิงเอกสาร (Record Ref): </span>
                <b className="text-stone-950 font-black text-sm">{record.recordNumber}</b>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-600">สถานะการบันทึก: </span>
                <span className="px-2.5 py-0.5 rounded font-black text-xs bg-emerald-600 text-white tracking-wide">
                  {record.status}
                </span>
              </div>
            </div>

            {/* RECORD CONTENT SUMMARY */}
            <div className="border border-stone-300 rounded-sm p-4 mb-6 space-y-4 text-xs">
              <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-1.5 uppercase text-[11px] flex items-center justify-between">
                <span>ข้อมูลและสาระสำคัญของบันทึกคุณภาพ (Executed Details)</span>
                <span className="text-stone-500 font-mono">บันทึกเมื่อ: {record.executedDate}</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-stone-500 block text-[10px]">สายงาน (Stream)</span>
                  <span className="font-bold text-stone-900">{record.streamCode}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">แผนก (Department)</span>
                  <span className="font-bold text-stone-900">{record.departmentCode}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">รุ่นการผลิต / Lot No.</span>
                  <span className="font-mono font-bold text-stone-900">{record.lotNo || '-'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">รหัสเครื่องจักร</span>
                  <span className="font-mono font-bold text-stone-900">{record.machineCode || '-'}</span>
                </div>
              </div>

              {/* Extra Meta Key-Value */}
              {record.meta && Object.keys(record.meta).length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-200 bg-stone-50 p-3 rounded">
                  <span className="font-bold text-stone-700 block mb-1 text-[11px]">บันทึกเพิ่มเติมจากหน้างาน:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(record.meta).map(([k, v]) => (
                      <div key={k} className="flex gap-1.5">
                        <span className="text-stone-500 capitalize">{k}:</span>
                        <span className="font-medium text-stone-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GMP ELECTRONIC SIGN-OFF & COMPLIANCE SEAL */}
            <div className="border-2 border-black divide-y border-stone-400 text-xs">
              <div className="bg-stone-200 px-3 py-1 font-bold text-[11px] uppercase tracking-wide">
                การรับรองลายมือชื่ออิเล็กทรอนิกส์ตามหลักเกณฑ์ GMP / ISO 22716 / ALCOA+
              </div>
              <div className="grid grid-cols-3 divide-x divide-stone-400 text-center p-3 gap-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-stone-500 block">ผู้ปฏิบัติงาน / ผู้บันทึก (Initiator)</span>
                  <div className="font-black text-stone-900 text-xs pt-2">{record.operatorName}</div>
                  <span className="text-[9px] text-emerald-700 font-bold block flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 inline" /> Digital Verified
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono block">{record.executedDate}</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-stone-500 block">ผู้ตรวจสอบหน้างาน (Reviewer / QA)</span>
                  <div className="font-black text-stone-900 text-xs pt-2">{record.verifiedByName || 'QA Inspector'}</div>
                  <span className="text-[9px] text-emerald-700 font-bold block flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 inline" /> Digital Verified
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono block">{record.executedDate}</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-stone-500 block">ผู้อนุมัติขั้นสุดท้าย (Plant Director - PDT)</span>
                  <div className="font-black text-stone-900 text-xs pt-2">{record.approvedByName || 'Plant Director (PDT)'}</div>
                  <span className="text-[9px] text-emerald-700 font-bold block flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 inline" /> Approved & Sealed
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono block">{record.executedDate}</span>
                </div>
              </div>
            </div>

            {/* FOOTER AUDIT NOTE */}
            <div className="mt-4 flex items-center justify-between text-[9px] text-stone-400 border-t border-stone-200 pt-2 font-mono">
              <span>CosmeFlow DCC • System of Record (Immutable & Audit-Ready)</span>
              <span>พิมพ์เมื่อ: {printDate || '-'} | Stamp: UNCONTROLLED COPY WHEN PRINTED</span>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
