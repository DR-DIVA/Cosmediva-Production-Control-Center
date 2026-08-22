'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Menu, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const Sidebar = dynamic(() => import('@/components/layout/Sidebar').then(mod => mod.Sidebar), { ssr: false })

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Responsive auto-collapse for medium/smaller windows
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 768) {
        setIsCollapsed(true)
      } else if (window.innerWidth >= 1280) {
        setIsCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen relative transition-all duration-300 w-full overflow-x-hidden">
      {/* Desktop & Tablet Sidebar */}
      <div 
        className={`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-[#2D2721] transition-all duration-300 ${
          isCollapsed ? 'md:w-16' : 'md:w-64 lg:w-72'
        }`}
      >
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Main Content Area */}
      <div 
        className={`flex flex-col min-h-screen transition-all duration-300 w-full max-w-full ${
          isCollapsed ? 'md:pl-16' : 'md:pl-64 lg:pl-72'
        }`}
      >
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-[#D4AF37]/30 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-[70] shadow-xs">
          
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger Menu (Full Page Navigation) */}
            <div className="md:hidden">
              <Link 
                href="/mobile-menu"
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors relative hover:bg-gray-100 rounded-lg flex items-center"
              >
                <Menu className="w-5 h-5" />
              </Link>
            </div>

            {/* Desktop Sidebar Collapse Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#D4AF37] hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition"
              title={isCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
            >
              {isCollapsed ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-medium text-[11px]">ขยายเมนู</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-[11px]">ย่อเมนู</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8B7355] hidden sm:inline-block">
              CosmeFlow OS
            </span>
          </div>
        </header>

        <main className="flex-1 bg-[#F8F6F0] flex flex-col w-full max-w-full p-2 sm:p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
