'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AlertOctagon, QrCode, HardHat, KanbanSquare, ArrowRight, Wrench, Zap } from 'lucide-react'
import MachineQRScannerModal from './MachineQRScannerModal'
import { MaintenanceMachine } from '@/types/maintenance'

interface Props {
  machines: MaintenanceMachine[]
}

export default function MaintenanceHubClient({ machines }: Props) {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* 3 Dedicated Fast Report Cards (Red / Blue / Purple) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: แจ้งเครื่องเสียด่วน */}
        <Link
          href="/maintenance/report?type=EMERGENCY"
          className="group relative p-5 rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-lg shadow-red-900/20 hover:shadow-xl hover:scale-[1.02] transition-all border-2 border-red-400/60 flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-3 shadow-inner">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">🚨 แจ้งเครื่องเสียด่วน</h3>
            <p className="text-xs text-red-100 mt-1 font-medium leading-relaxed">
              กระทบสายการผลิต • หยุดชะงัก (P1 Critical Breakdown)
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-white/90 pt-4 group-hover:translate-x-1 transition-transform">
            <span>แจ้งซ่อมด่วนทันที</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Card 2: แจ้งซ่อมทั่วไป */}
        <Link
          href="/maintenance/report?type=GENERAL"
          className="group relative p-5 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-[1.02] transition-all border-2 border-blue-400/60 flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-3 shadow-inner">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">🛠️ แจ้งซ่อมทั่วไป</h3>
            <p className="text-xs text-blue-100 mt-1 font-medium leading-relaxed">
              ไม่กระทบการผลิต • เครื่องยังเดินต่อได้ (P3 Normal)
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-white/90 pt-4 group-hover:translate-x-1 transition-transform">
            <span>แจ้งซ่อมตามรอบ</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Card 3: แจ้งซ่อมบริการ */}
        <Link
          href="/maintenance/report?type=SERVICE"
          className="group relative p-5 rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-700 text-white shadow-lg shadow-purple-900/20 hover:shadow-xl hover:scale-[1.02] transition-all border-2 border-purple-400/60 flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-3 shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">💡 แจ้งซ่อมบริการ</h3>
            <p className="text-xs text-purple-100 mt-1 font-medium leading-relaxed">
              งานบริการอาคาร • เปลี่ยนหลอดไฟ แอร์ ประปา สุขาภิบาล
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-white/90 pt-4 group-hover:translate-x-1 transition-transform">
            <span>แจ้งงานบริการอาคาร</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>
      </div>

      {/* 4 Operations & Cockpit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 2: Scan QR */}
        <button
          type="button"
          onClick={() => setIsQRScannerOpen(true)}
          className="text-left group relative p-5 rounded-3xl bg-white text-stone-900 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all border border-stone-200 hover:border-[#D4AF37] flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 mb-3 border border-amber-300">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black tracking-tight">📷 สแกน QR หน้าเครื่อง</h3>
            <p className="text-xs text-stone-500 mt-1">
              สแกนเปิด Machine Profile หรือแจ้งเสียโดยไม่ต้องจำชื่อเครื่องจักร
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-[#8B7355] pt-4 group-hover:translate-x-1 transition-transform">
            <span>สแกนหรือเลือกเครื่อง</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </button>

        {/* Card 3: Technician Cockpit */}
        <Link
          href="/maintenance/technician"
          className="group relative p-5 rounded-3xl bg-gradient-to-br from-[#2A2521] to-[#3A332B] text-white shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:scale-[1.02] transition-all border border-[#D4AF37]/50 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-3 border border-[#D4AF37]/40">
              <HardHat className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              🔧 โหมดช่างซ่อมบำรุง
            </h3>
            <p className="text-xs text-stone-300 mt-1">
              หน้าจอปุ่มใหญ่สำหรับมือถือ • รับงาน จับเวลา ตัดสต็อกอะไหล่ และปิดงาน
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-[#D4AF37] pt-4 group-hover:translate-x-1 transition-transform">
            <span>เข้าสู่หน้าจอช่าง</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Card 4: Work Order Kanban */}
        <Link
          href="/maintenance/work-orders"
          className="group relative p-5 rounded-3xl bg-white text-stone-900 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all border border-stone-200 hover:border-[#D4AF37] flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-800 mb-3 border border-blue-300">
              <KanbanSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black tracking-tight">📋 บอร์ดงานซ่อม Kanban</h3>
            <p className="text-xs text-stone-500 mt-1">
              Maintenance Command Center 9 ขั้นตอน • ติดตามสถานะงานซ่อมทั้งโรงงาน
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-blue-700 pt-4 group-hover:translate-x-1 transition-transform">
            <span>เปิดกระดานควบคุม</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>

        {/* Card 5: PM 2026 Plans & Audited Adjustments */}
        <Link
          href="/maintenance/pm"
          className="group relative p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md hover:shadow-xl hover:scale-[1.02] transition-all border border-indigo-700 flex flex-col justify-between sm:col-span-2 lg:col-span-1"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 flex items-center justify-center text-indigo-300 mb-3 border border-indigo-500/50">
              <span className="text-2xl">🗓️</span>
            </div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5">
              <span>แผน PM 2026</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                168 เครื่อง
              </span>
            </h3>
            <p className="text-xs text-indigo-200 mt-1">
              แผนบำรุงรักษาประจำปี • ปรับความถี่รอบ PM ยืดหยุ่นพร้อมบันทึกเหตุผลกำกับทุกครั้ง
            </p>
          </div>
          <div className="flex items-center text-xs font-bold text-cyan-300 pt-4 group-hover:translate-x-1 transition-transform">
            <span>ดูแผนและปรับรอบ PM</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </Link>
      </div>

      <MachineQRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        machines={machines}
      />
    </div>
  )
}
