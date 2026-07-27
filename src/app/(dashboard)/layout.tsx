'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Menu } from 'lucide-react'

const Sidebar = dynamic(() => import('@/components/layout/Sidebar').then(mod => mod.Sidebar), { ssr: false })

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="h-full relative transition-all duration-300">
      {/* Desktop Sidebar */}
      <div className={`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-slate-900 transition-all duration-300 ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}>
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Main Content Area */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-[#D4AF37]/30 flex items-center justify-between px-6 sticky top-0 z-[70] shadow-sm">
          
          {/* Mobile Hamburger Menu (Full Page Navigation) */}
          <div className="md:hidden">
            <Link 
              href="/mobile-menu"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors relative hover:bg-gray-200 rounded-md flex items-center"
            >
              <Menu className="w-6 h-6" />
            </Link>
          </div>

          <div className="hidden sm:block text-sm font-bold text-[#D4AF37] tracking-wide uppercase ml-auto text-right pr-6">
            One Platform. Every Process. Total Control.
          </div>
        </header>

        <main className="flex-1 bg-[#F8F6F0] flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
