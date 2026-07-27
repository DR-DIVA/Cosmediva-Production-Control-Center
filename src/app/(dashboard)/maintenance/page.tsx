'use client'

import { Settings } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Settings className="w-8 h-8 text-yellow-400 shrink-0" />
            CosmeFlow Maintenance
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>ระบบจัดการการบำรุงรักษาเครื่องจักร</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Keep Every Machine Running at Its Best.
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-16 text-center border border-[#D4AF37]/30 shadow-sm flex flex-col items-center justify-center">
        <Settings className="w-16 h-16 text-slate-200 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700 mb-2">Coming Soon</h2>
        <p className="text-slate-500">ระบบอยู่ระหว่างการพัฒนา จะเปิดให้บริการเร็วๆ นี้</p>
      </div>
    </div>
  )
}
