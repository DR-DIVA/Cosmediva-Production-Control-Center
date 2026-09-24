import React from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import CALManagementClient from '@/components/maintenance/CALManagementClient'
import { CALIBRATION_ITEMS } from '@/lib/calibrationData'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'แผนสอบเทียบเครื่องมือวัด 2026 (CAL 2026) | CosmeFlow',
  description: 'ระบบบริหารจัดการแผนสอบเทียบเครื่องมือวัดโรงงาน ประจำปี 2026 (DCC QC-PF-004B)'
}

export default async function CALPage() {
  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0 text-stone-900 font-sans">
      <MaintenanceHeader />

      <main className="space-y-6">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950">
                แผนสอบเทียบเครื่องมือวัด 2026 (CAL 2026)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              ระบบผูกแผนสอบเทียบเครื่องมือวัดประจำปีและเดือน (Calibration Master List) ทั้งหมด 77 รายการ ครอบคลุมฝ่าย PK, MX, RD, MM, QC ตามมาตรฐาน DCC QC-PF-004B
            </p>
          </div>
        </div>

        {/* Client Component */}
        <CALManagementClient initialItems={CALIBRATION_ITEMS} />
      </main>
    </div>
  )
}
