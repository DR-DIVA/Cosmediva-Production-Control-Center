'use client'

import React from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import Link from 'next/link'
import { 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  AlertOctagon, 
  MessageSquare, 
  HardHat, 
  Package, 
  FileText,
  Sparkles,
  QrCode
} from 'lucide-react'

export default function MaintenanceWorkflowPage() {
  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0">
      <MaintenanceHeader />

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link 
              href="/maintenance"
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
              title="กลับสู่หน้าหลักซ่อมบำรุง"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-stone-900 flex items-center gap-2">
                🧭 แผนภาพวงจรการไหลของงานแจ้งซ่อมบำรุง (End-to-End Workflow)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                คู่มือกระบวนการทำงานแบบบูรณาการระหว่าง ผู้แจ้งซ่อม • น้อง MTEX LINE AI • ทีมช่างซ่อมบำรุง
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/maintenance_workflow_flowchart.png"
            download="CosmeFlow_Maintenance_Flowchart.png"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>💾 โหลดผัง Flowchart (PNG)</span>
          </a>
          <a
            href="/maintenance_workflow_flowchart.svg"
            download="CosmeFlow_Maintenance_Flowchart.svg"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-black text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>📥 ผังแบบ Vector (SVG)</span>
          </a>
        </div>
      </div>

      {/* Section 1: Raw Flowchart (ผังงานดิบตามแผนภาพที่ต้องการบันทึก) */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <span>📋 ผังการไหลของงานแบบละเอียด (Detailed Process Flowchart)</span>
            </h3>
            <p className="text-xs text-stone-500">
              ภาพผังงานแยกตาม 6 ขอบเขต (Scope) พร้อมข้อความภาษาไทยคมชัด สามารถคลิกขวาบันทึกเป็นรูปภาพได้ทันที
            </p>
          </div>
          <a
            href="/maintenance_workflow_flowchart.png"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline hidden sm:inline"
          >
            เปิดดูภาพขนาดเต็ม (Full Size) ↗
          </a>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-inner group bg-white p-2 sm:p-4 flex justify-center">
          <img
            src="/maintenance_workflow_flowchart.png"
            alt="End-to-End Maintenance Process Flowchart"
            className="w-full max-w-4xl h-auto object-contain rounded-xl"
          />
          <div className="absolute bottom-4 right-4 bg-stone-900/90 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg font-semibold pointer-events-none hidden sm:block">
            💡 คลิกขวาที่ภาพแล้วเลือก "Save image as..." (บันทึกรูปภาพเป็น...)
          </div>
        </div>
      </div>

      {/* Section 2: Visual Infographic Showcase */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <span>🎨 แผนภาพกราฟิกอินโฟกราฟิก (Infographic Overview)</span>
            </h3>
            <p className="text-xs text-stone-500">
              ภาพกราฟิกสรุป 6 เสาหลักกระบวนการซ่อมบำรุง
            </p>
          </div>
          <a
            href="/maintenance_workflow_diagram.jpg"
            download="CosmeFlow_Maintenance_Workflow.jpg"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 underline"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดภาพนี้ (JPG)</span>
          </a>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-inner group bg-stone-950">
          <img
            src="/maintenance_workflow_diagram.jpg"
            alt="End-to-End Maintenance Workflow Infographic"
            className="w-full h-auto object-cover rounded-2xl"
          />
        </div>
      </div>

      {/* 6 Comprehensive Stage Details in Thai */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Stage 1 */}
        <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                ขั้นตอนที่ 1
              </span>
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                ผู้แจ้งซ่อม / ฝ่ายผลิต
              </span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900">
              1. สแกน QR / ส่งเรื่องเข้าระบบ
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              สแกน QR Code หน้าเครื่องจักร หรือเลือกปุ่มแจ้งด่วน (P1 Emergency) / ทั่วไป (P3) ผ่านมือถือ ระบุอาการ ภาพถ่ายหน้างาน และตำแหน่งเครื่องจักร
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-rose-600 font-bold">
            ⚡ สะดวก รวดเร็ว ไม่ต้องจำรหัสเครื่องจักร
          </div>
        </div>

        {/* Stage 2 */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                ขั้นตอนที่ 2
              </span>
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                น้อง MTEX LINE AI
              </span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900">
              2. แจ้งเตือนด่วนเข้า LINE กลุ่มช่าง
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              น้อง MTEX ยิง Flex Message สีแดง/ส้ม แจ้งเตือนเข้าสมาร์ตโฟนทีมช่างทันที ระบุชื่อเครื่อง ระดับความเร่งด่วน และปุ่มกดเข้าสู่หน้าจอรับงาน
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-emerald-700 font-bold">
            🔔 ช่างทราบเรื่องทันทีภายในไม่กี่วินาที
          </div>
        </div>

        {/* Stage 3 */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                ขั้นตอนที่ 3
              </span>
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5" />
                ทีมช่างซ่อมบำรุง
              </span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900">
              3. รับงานผ่าน Mobile Cockpit
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              ช่างเปิดหน้า "สำหรับช่างซ่อม" บนมือถือ กดรับเรื่องเข้าระบบ พร้อมเลือกชื่อช่างผู้รับผิดชอบ ระบบเริ่มบันทึกเวลาจริง (ซ่อนเวลาเพื่อลดความกดดัน)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-amber-700 font-bold">
            📱 ออกแบบปุ่มใหญ่ ใช้งานมือเดียวหน้างาน
          </div>
        </div>

        {/* Stage 4 */}
        <div className="bg-white p-5 rounded-3xl border border-orange-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-orange-50 text-orange-800 border border-orange-200">
                ขั้นตอนที่ 4
              </span>
              <span className="text-xs font-bold text-orange-800 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                ทีมช่างซ่อมบำรุง
              </span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900">
              4. เบิกอะไหล่ & ซ่อมแซมหน้างาน
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              ตัดสต็อกอะไหล่ด่วนจากคลังอะไหล่ (Quick Requisition) ระบบคำนวณต้นทุนให้อัตโนมัติ และช่างลงมือแก้ไขปัญหาหน้างาน
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-orange-700 font-bold">
            📦 ตัดสต็อก Real-Time ทราบต้นทุนซ่อม
          </div>
        </div>

        {/* Stage 5 */}
        <div className="bg-white p-5 rounded-3xl border border-cyan-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-cyan-50 text-cyan-800 border border-cyan-200">
                ขั้นตอนที่ 5
              </span>
              <span className="text-xs font-bold text-cyan-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ฝ่ายผลิต (Production Verify)
              </span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900">
              5. ตรวจรับมอบเครื่องจักร
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              ช่างบันทึกสาเหตุหลัก (Quick Root Cause ภาษาไทย) และภาพหลังซ่อม จากนั้นฝ่ายผลิตทดสอบเดินเครื่อง (Test Run) และกดยืนยันรับมอบเครื่อง (Verified)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-cyan-700 font-bold">
            ✅ ตรวจสอบมาตรฐานก่อนเริ่มผลิตจริง
          </div>
        </div>

        {/* Stage 6 */}
        <div className="bg-white p-5 rounded-3xl border border-purple-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-purple-50 text-purple-800 border border-purple-200">
                ขั้นตอนที่ 6
              </span>
              <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                หัวหน้าฝ่ายซ่อม & DCC
              </span>
            </div>
            <h3 className="text-base font-extrabold text-stone-900">
              6. ปิดงาน & ใบแจ้งซ่อม 5 ส่วน
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              อนุมัติปิดงานสมบูรณ์ (Closed) โดยคุณปิยะราช รามมา พร้อมออกเอกสาร DCC ใบแจ้งซ่อม 5 ส่วน และประมวลผลสถิติ Downtime / MTTR / MTBF
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-purple-700 font-bold">
            📊 ซิงค์ข้อมูลเข้า KANBAN & KPI ทันที
          </div>
        </div>

      </div>
    </div>
  )
}
