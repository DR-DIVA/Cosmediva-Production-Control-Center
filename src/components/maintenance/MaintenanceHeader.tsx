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

interface MaintenanceHeaderProps {
  onOpenReport?: () => void
  onOpenQR?: () => void
}

export default function MaintenanceHeader({ onOpenReport, onOpenQR }: MaintenanceHeaderProps) {
  const pathname = usePathname()
  const [isLineOpen, setIsLineOpen] = useState(false)

  const navItems = [
    { 
      label: 'ภาพรวมระบบ', 
      href: '/maintenance', 
      icon: Cpu,
      color: 'bg-blue-100 text-blue-700 border-blue-200' 
    },
    { 
      label: 'โหมดช่างซ่อม', 
      href: '/maintenance/technician', 
      icon: HardHat, 
      badge: 'Tech',
      color: 'bg-amber-100 text-amber-800 border-amber-200' 
    },
    { 
      label: 'บอร์ดงานซ่อม', 
      href: '/maintenance/work-orders', 
      icon: KanbanSquare,
      color: 'bg-purple-100 text-purple-700 border-purple-200' 
    },
    { 
      label: 'แผน PM 2026', 
      href: '/maintenance/pm', 
      icon: Calendar, 
      badge: 'PM',
      color: 'bg-cyan-100 text-cyan-800 border-cyan-200' 
    },
    { 
      label: 'ทะเบียนเครื่องจักร', 
      href: '/maintenance/machines', 
      icon: Wrench,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200' 
    },
    { 
      label: 'พิมพ์ QR หน้าเครื่อง', 
      href: '/maintenance/qr-print', 
      icon: QrCode, 
      badge: 'QR',
      color: 'bg-rose-100 text-rose-800 border-rose-200' 
    },
    { 
      label: 'คลังอะไหล่', 
      href: '/maintenance/spare-parts', 
      icon: Package,
      color: 'bg-orange-100 text-orange-800 border-orange-200' 
    },
    { 
      label: 'แดชบอร์ด KPI', 
      href: '/maintenance/dashboard', 
      icon: BarChart3,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200' 
    },
    { 
      label: 'ค้นหาประวัติ', 
      href: '/maintenance/search', 
      icon: Search,
      color: 'bg-teal-100 text-teal-800 border-teal-200' 
    },
  ]

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gradient-to-r from-[#2A2521] via-[#3A332B] to-[#2A2521] p-5 md:p-6 rounded-3xl shadow-xl border border-[#D4AF37]/40 gap-4 text-white">
        <div>
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
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* 1. แจ้งเครื่องเสียด่วน */}
          <Link
            href="/maintenance/report?type=EMERGENCY"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold px-3.5 py-2.5 rounded-2xl shadow-md shadow-red-900/30 border border-red-400/40 transition-all transform active:scale-95 text-xs sm:text-sm"
          >
            <AlertOctagon className="w-4 h-4 animate-pulse shrink-0" />
            <span>🚨 แจ้งเครื่องเสียด่วน</span>
          </Link>

          {/* 2. แจ้งซ่อมทั่วไป */}
          <Link
            href="/maintenance/report?type=GENERAL"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-3.5 py-2.5 rounded-2xl shadow-md shadow-blue-900/30 border border-blue-400/40 transition-all transform active:scale-95 text-xs sm:text-sm"
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span>🛠️ แจ้งซ่อมทั่วไป</span>
          </Link>

          {/* 3. แจ้งซ่อมบริการ */}
          <Link
            href="/maintenance/report?type=SERVICE"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold px-3.5 py-2.5 rounded-2xl shadow-md shadow-purple-900/30 border border-purple-400/40 transition-all transform active:scale-95 text-xs sm:text-sm"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>💡 แจ้งซ่อมบริการ</span>
          </Link>

          {/* โหมดช่างซ่อม */}
          <Link
            href="/maintenance/technician"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#D4AF37] hover:bg-[#bfa030] text-[#2A2521] font-bold px-3.5 py-2.5 rounded-2xl shadow-md transition-all text-xs sm:text-sm active:scale-95"
          >
            <HardHat className="w-4 h-4 shrink-0" />
            <span>โหมดช่างซ่อม</span>
          </Link>
        </div>
      </div>

      {/* Prominent Icon Navigation Deck (Large, Clear, Tactile & Responsive) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-3xl border border-stone-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/maintenance' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl font-bold transition-all shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-[#2A2521] text-white shadow-md border-2 border-[#D4AF37] ring-2 ring-[#D4AF37]/20'
                    : 'bg-stone-50/80 hover:bg-stone-100 text-stone-800 border border-stone-200 hover:border-stone-300 shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* Large Icon Image Container */}
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                  isActive
                    ? 'bg-[#D4AF37] text-stone-950 border-[#D4AF37] shadow-xs'
                    : `${item.color}`
                }`}>
                  <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
                </div>

                {/* Text Label */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs sm:text-sm font-extrabold ${isActive ? 'text-white' : 'text-stone-900'}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full font-mono ${
                      isActive 
                        ? 'bg-[#D4AF37] text-stone-950' 
                        : 'bg-stone-200 text-stone-700 border border-stone-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}

          {/* LINE Notification Settings Button (Moved to Lower Deck) */}
          <button
            type="button"
            onClick={() => setIsLineOpen(true)}
            className="group flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl font-bold transition-all shrink-0 active:scale-95 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 hover:border-emerald-400 shadow-2xs hover:shadow-xs cursor-pointer"
            title="ตั้งค่า LINE แจ้งเตือนอัจฉริยะ (Multi-Channel Gateway)"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border border-emerald-400 bg-[#06C755] text-white shadow-xs transition-transform group-hover:scale-105">
              <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white stroke-none" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold text-emerald-950">
                ตั้งค่า LINE
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full font-mono bg-emerald-200 text-emerald-900 border border-emerald-300">
                LINE Bot
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* LINE Notification Settings Modal */}
      <LineSettingsModal
        isOpen={isLineOpen}
        onClose={() => setIsLineOpen(false)}
      />
    </div>
  )
}
