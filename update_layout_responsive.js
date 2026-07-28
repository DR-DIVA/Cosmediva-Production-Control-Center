const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/layout.tsx';

const newLayout = `'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Auto-close mobile drawer when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="h-full relative transition-all duration-300">
      {/* Desktop Sidebar */}
      <div className={\`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-slate-900 transition-all duration-300 \${isCollapsed ? 'md:w-20' : 'md:w-72'}\`}>
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Main Content Area */}
      <div className={\`flex flex-col min-h-screen transition-all duration-300 \${isCollapsed ? 'md:pl-20' : 'md:pl-72'}\`}>
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-[#D4AF37]/30 flex items-center justify-between px-6 sticky top-0 z-[70] shadow-sm">
          
          {/* Mobile Hamburger Menu */}
          <div className="md:hidden flex items-center">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <button className="text-slate-600 hover:text-slate-900 transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-r-0">
                <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
              </SheetContent>
            </Sheet>
          </div>

          <div className="text-sm font-bold text-[#D4AF37] tracking-wide uppercase ml-auto">
            One Platform. Every Process. Total Control.
          </div>
        </header>

        <main className="flex-1 bg-[#F8F6F0]">
          {children}
        </main>
      </div>
    </div>
  )
}
`;

fs.writeFileSync(file, newLayout);
console.log('Layout updated for responsiveness!');
