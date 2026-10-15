'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function MobileMenuPage() {
  const router = useRouter()
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="fixed inset-0 bg-[#2D2721] z-[9999] flex flex-col h-[100dvh]">
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 max-w-lg w-full mx-auto shrink-0">
        <span className="text-sm font-semibold text-[#D4AF37]">CosmeFlow OS • เมนูทั้งหมด</span>
        <button 
          onClick={handleClose}
          className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 text-xs transition border border-white/10"
        >
          <span>ปิดเมนู</span>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden max-w-lg w-full mx-auto">
        <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
      </div>
    </div>
  )
}

