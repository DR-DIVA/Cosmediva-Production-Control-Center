import React from 'react'
import { getMachines } from '@/app/actions/maintenance'
import FastReportForm from '@/components/maintenance/FastReportForm'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FastReportPage() {
  const machinesRes = await getMachines()
  const machines = machinesRes.data || []

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-5xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 bg-white px-3 py-1.5 rounded-xl border border-stone-200 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>
        <span className="text-xs font-semibold text-[#8B7355] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Mobile-First Quick Report Mode
        </span>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          🚨 แจ้งเครื่องเสียด่วน
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-medium">
          ระบบบันทึกงานซ่อมอัตโนมัติใน 30–60 วินาที • ไม่ต้องกรอกเอกสารกระดาษ
        </p>
      </div>

      <FastReportForm machines={machines} />
    </div>
  )
}
