'use client'

import React from 'react'
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
  HardHat
} from 'lucide-react'

interface MaintenanceHeaderProps {
  onOpenReport?: () => void
  onOpenQR?: () => void
}

export default function MaintenanceHeader({ onOpenReport, onOpenQR }: MaintenanceHeaderProps) {
  const pathname = usePathname()

  const navItems = [
    { label: 'ภาพรวมระบบ', href: '/maintenance', icon: Cpu },
    { label: 'โหมดช่างซ่อม', href: '/maintenance/technician', icon: HardHat, badge: 'Tech' },
    { label: 'บอร์ดงานซ่อม', href: '/maintenance/work-orders', icon: KanbanSquare },
    { label: 'ทะเบียนเครื่องจักร', href: '/maintenance/machines', icon: Wrench },
    { label: 'คลังอะไหล่', href: '/maintenance/spare-parts', icon: Package },
    { label: 'แดชบอร์ด KPI', href: '/maintenance/dashboard', icon: BarChart3 },
    { label: 'ค้นหาประวัติ', href: '/maintenance/search', icon: Search },
  ]

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gradient-to-r from-[#2A2521] via-[#3A332B] to-[#2A2521] p-5 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/40 gap-4 text-white">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
            CosmeFlow OS • CMMS Industrial Module
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 mt-1">
            <span className="p-2 bg-[#D4AF37]/20 border border-[#D4AF37]/50 rounded-xl text-[#D4AF37]">
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
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Link
            href="/maintenance/report"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-900/30 border border-red-400/30 transition-all transform active:scale-95 text-sm"
          >
            <AlertOctagon className="w-5 h-5 animate-pulse" />
            🚨 แจ้งเครื่องเสียด่วน
          </Link>
          <Link
            href="/maintenance/technician"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#bfa030] text-[#2A2521] font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-sm active:scale-95"
          >
            <HardHat className="w-4 h-4" />
            โหมดช่างซ่อม
          </Link>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-stone-200">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/maintenance' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#4A4238] text-white shadow-sm border border-[#4A4238]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-stone-400'}`} />
              {item.label}
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
