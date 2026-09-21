'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Wrench, 
  AlertOctagon, 
  KanbanSquare, 
  Cpu, 
  Package, 
  BarChart3, 
  Search,
  HardHat,
  Calendar,
  QrCode,
  MessageSquare,
  Zap
} from 'lucide-react'
import LineSettingsModal from '@/components/maintenance/LineSettingsModal'
import MachineQRScannerModal from '@/components/maintenance/MachineQRScannerModal'
import { MaintenanceMachine } from '@/types/maintenance'

interface MaintenanceHeaderProps {
  onOpenReport?: () => void
  onOpenQR?: () => void
  machines?: MaintenanceMachine[]
}

interface NavItem {
  label: string
  href: string
  icon: any
  badge?: string
  frameClass: string
  iconClass: string
}

export default function MaintenanceHeader({ onOpenReport, onOpenQR, machines = [] }: MaintenanceHeaderProps) {
  const pathname = usePathname()
  const [isLineOpen, setIsLineOpen] = useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)

  const row1Items: NavItem[] = [
    { 
      label: 'ภาพรวมระบบ', 
      href: '/maintenance', 
      icon: Cpu,
      frameClass: 'bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-300 hover:border-blue-400',
      iconClass: 'border border-blue-400 bg-blue-600 text-white' 
    },
    { 
      label: 'สำหรับช่างซ่อม', 
      href: '/maintenance/technician', 
      icon: HardHat, 
      frameClass: 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 hover:border-amber-400',
      iconClass: 'border border-amber-400 bg-amber-500 text-white' 
    },
    { 
      label: 'KANBAN BOARD', 
      href: '/maintenance/work-orders', 
      icon: KanbanSquare,
      frameClass: 'bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-300 hover:border-purple-400',
      iconClass: 'border border-purple-400 bg-purple-600 text-white' 
    },
    { 
      label: 'แผน PM 2026', 
      href: '/maintenance/pm', 
      icon: Calendar, 
      frameClass: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 hover:border-cyan-400',
      iconClass: 'border border-cyan-400 bg-cyan-600 text-white' 
    },
    { 
      label: 'ทะเบียนเครื่องจักร', 
      href: '/maintenance/machines', 
      icon: Wrench,
      frameClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 hover:border-emerald-400',
      iconClass: 'border border-emerald-400 bg-emerald-600 text-white' 
    },
    { 
      label: 'พิมพ์ QR หน้าเครื่อง', 
      href: '/maintenance/qr-print', 
      icon: QrCode, 
      frameClass: 'bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-300 hover:border-rose-400',
      iconClass: 'border border-rose-400 bg-rose-600 text-white' 
    },
  ]

  const row2NavItems: NavItem[] = [
    { 
      label: 'คลังอะไหล่', 
      href: '/maintenance/spare-parts', 
      icon: Package,
      frameClass: 'bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-300 hover:border-orange-400',
      iconClass: 'border border-orange-400 bg-orange-500 text-white' 
    },
    { 
      label: 'แดชบอร์ด KPI', 
      href: '/maintenance/dashboard', 
      icon: BarChart3,
      frameClass: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 hover:border-indigo-400',
      iconClass: 'border border-indigo-400 bg-indigo-600 text-white' 
    },
    { 
      label: 'ค้นหาประวัติ', 
      href: '/maintenance/search', 
      icon: Search,
      badge: 'MTEX AI',
      frameClass: 'bg-teal-50 hover:bg-teal-100 text-teal-950 border border-teal-300 hover:border-teal-400',
      iconClass: 'border border-teal-400 bg-teal-600 text-white' 
    },
  ]

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center bg-gradient-to-r from-[#2A2521] via-[#3A332B] to-[#2A2521] p-4 sm:p-5 md:p-6 rounded-3xl shadow-xl border border-[#D4AF37]/40 gap-4 text-white">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
            CosmeFlow OS • CMMS Industrial Module
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 mt-1">
            <span className="p-2.5 bg-[#D4AF37]/20 border border-[#D4AF37]/50 rounded-2xl text-[#D4AF37]">
              <Wrench className="w-6 h-6 md:w-7 md:h-7" />
            </span>
            CosmeFlow Maintenance
          </h1>
          <div className="text-sm text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 font-medium">
            <span className="text-amber-300 font-semibold">“แจ้งไว • ซ่อมไว • รู้ประวัติ • ลด Downtime”</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">ระบบบริหารงานซ่อมบำรุงโรงงานเครื่องสำอาง</span>
            <span className="text-slate-400">|</span>
            <Link 
              href="/maintenance/workflow" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 decoration-amber-400/50 hover:decoration-amber-300 transition"
              title="ดูผังภาพรวมการไหลของงานแจ้งซ่อมบำรุง (End-to-End Workflow)"
            >
              <span>🧭 ผังขั้นตอนการแจ้งซ่อม (Workflow)</span>
            </Link>
          </div>
        </div>

        {/* Global Action Buttons: 4 in 1 line on wide screens, 2x2 grid when narrower */}
        <div className="grid grid-cols-2 lg:grid-cols-4 2xl:flex 2xl:items-center gap-2 sm:gap-2.5 w-full 2xl:w-auto">
          {/* 1. แจ้งเครื่องเสียด่วน */}
          <Link
            href="/maintenance/report?type=EMERGENCY"
            className="group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl font-bold transition-all active:scale-95 bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-300 hover:border-rose-400 shadow-2xs hover:shadow-xs cursor-pointer w-full"
            title="แจ้งซ่อมด่วนฉุกเฉิน (กระทบการผลิต / เครื่องหยุด)"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border border-red-300 bg-red-600 text-white shadow-xs transition-transform group-hover:scale-105">
              <AlertOctagon className="w-4.5 h-4.5 sm:w-5 sm:h-5 animate-pulse stroke-[2.2]" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-rose-950 truncate">
              แจ้งเครื่องเสียด่วน
            </span>
          </Link>

          {/* 2. แจ้งซ่อมทั่วไป */}
          <Link
            href="/maintenance/report?type=GENERAL"
            className="group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl font-bold transition-all active:scale-95 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-300 hover:border-blue-400 shadow-2xs hover:shadow-xs cursor-pointer w-full"
            title="แจ้งซ่อมทั่วไป (ไม่กระทบการผลิต)"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border border-blue-300 bg-blue-600 text-white shadow-xs transition-transform group-hover:scale-105">
              <Wrench className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-blue-950 truncate">
              แจ้งซ่อมทั่วไป
            </span>
          </Link>

          {/* 3. แจ้งซ่อมบริการ */}
          <Link
            href="/maintenance/report?type=SERVICE"
            className="group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl font-bold transition-all active:scale-95 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-300 hover:border-purple-400 shadow-2xs hover:shadow-xs cursor-pointer w-full"
            title="แจ้งซ่อมบริการ & อาคารสถานที่ (ไม่กระทบการผลิต)"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border border-purple-300 bg-purple-600 text-white shadow-xs transition-transform group-hover:scale-105">
              <Zap className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-purple-950 truncate">
              แจ้งซ่อมบริการ
            </span>
          </Link>

          {/* 4. สำหรับช่างซ่อม */}
          <Link
            href="/maintenance/technician"
            className="group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl font-bold transition-all active:scale-95 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 hover:border-amber-400 shadow-2xs hover:shadow-xs cursor-pointer w-full"
            title="สำหรับช่างประจำกะลงมือซ่อม (รับงาน / บันทึกผล / คืนเครื่อง)"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border border-amber-300 bg-[#D4AF37] text-[#2A2521] shadow-xs transition-transform group-hover:scale-105">
              <HardHat className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-amber-950 truncate">
              สำหรับช่างซ่อม
            </span>
          </Link>
        </div>
      </div>

      {/* 11 Sub-Menu Buttons Structured into Exactly 2 Rows */}
      <div className="bg-white p-2.5 sm:p-3 rounded-3xl border border-stone-200 shadow-sm space-y-2">
        {/* Row 1: 6 Functional Modules */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {row1Items.map(item => {
            const isActive = pathname === item.href || (item.href !== '/maintenance' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2 rounded-2xl font-bold transition-all w-full min-w-0 justify-start active:scale-95 ${
                  isActive
                    ? 'bg-[#2A2521] text-white shadow-md border-2 border-[#D4AF37] ring-2 ring-[#D4AF37]/20'
                    : `${item.frameClass} shadow-2xs hover:shadow-xs`
                }`}
              >
                {/* Large Icon Container */}
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                  isActive
                    ? 'bg-[#D4AF37] text-stone-950 border-[#D4AF37] shadow-xs'
                    : `${item.iconClass} shadow-xs`
                }`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>

                {/* Text Label */}
                <span className={`text-xs font-extrabold truncate ${isActive ? 'text-white' : 'text-inherit'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Row 2: 5 Management & Quick Tool Modules */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {row2NavItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/maintenance' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2 rounded-2xl font-bold transition-all w-full min-w-0 justify-start active:scale-95 ${
                  isActive
                    ? 'bg-[#2A2521] text-white shadow-md border-2 border-[#D4AF37] ring-2 ring-[#D4AF37]/20'
                    : `${item.frameClass} shadow-2xs hover:shadow-xs`
                }`}
              >
                {/* Large Icon Container */}
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                  isActive
                    ? 'bg-[#D4AF37] text-stone-950 border-[#D4AF37] shadow-xs'
                    : `${item.iconClass} shadow-xs`
                }`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>

                {/* Text Label */}
                <span className={`text-xs font-extrabold truncate ${isActive ? 'text-white' : 'text-inherit'}`}>
                  {item.label}
                </span>

                {item.badge && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-md font-extrabold bg-emerald-600 text-white tracking-wide shadow-2xs shrink-0 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}

          {/* LINE Notification Settings Button */}
          <button
            type="button"
            onClick={() => setIsLineOpen(true)}
            className="group flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2 rounded-2xl font-bold transition-all active:scale-95 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 hover:border-emerald-400 shadow-2xs hover:shadow-xs cursor-pointer w-full min-w-0 justify-start"
            title="ตั้งค่า LINE แจ้งเตือนอัจฉริยะ (Multi-Channel Gateway)"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border border-emerald-400 bg-[#06C755] text-white shadow-xs transition-transform group-hover:scale-105">
              <MessageSquare className="w-4 h-4 fill-white stroke-none" />
            </div>
            <span className="text-xs font-extrabold text-emerald-950 truncate">
              ตั้งค่า LINE
            </span>
          </button>

          {/* Quick QR Scanner Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              if (onOpenQR) onOpenQR()
              else setIsQRScannerOpen(true)
            }}
            className="group flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2 rounded-2xl font-bold transition-all active:scale-95 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 hover:border-amber-400 shadow-2xs hover:shadow-xs cursor-pointer w-full min-w-0 justify-start"
            title="สแกน QR Code หน้าเครื่อง เพื่อแจ้งซ่อมหรือดูประวัติ 360°"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border border-amber-300 bg-amber-500 text-white shadow-xs transition-transform group-hover:scale-105">
              <QrCode className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-extrabold text-amber-950 truncate">
              สแกน QR หน้าเครื่อง
            </span>
          </button>
        </div>
      </div>

      {/* LINE Notification Settings Modal */}
      <LineSettingsModal
        isOpen={isLineOpen}
        onClose={() => setIsLineOpen(false)}
      />

      {/* Machine QR Scanner Modal */}
      <MachineQRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        machines={machines}
      />
    </div>
  )
}
