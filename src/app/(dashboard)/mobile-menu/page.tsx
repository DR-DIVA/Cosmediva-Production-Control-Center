'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function MobileMenuPage() {
  const router = useRouter()
  return (
    <div className="fixed inset-0 bg-[#2D2721] z-[9999] flex flex-col h-[100dvh]">
      <div className="flex justify-end p-4">
        <button 
          onClick={() => router.back()}
          className="text-white p-2 rounded-full hover:bg-white/10"
        >
          <X className="w-8 h-8" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
      </div>
    </div>
  )
}
