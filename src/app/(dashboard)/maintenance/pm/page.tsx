import React from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import PMManagementClient from '@/components/maintenance/PMManagementClient'
import { getPMPlans, getPMAdjustmentLogs } from '@/app/actions/maintenance'

export const dynamic = 'force-dynamic'

export default async function PMPage() {
  const [plansRes, logsRes] = await Promise.all([
    getPMPlans(),
    getPMAdjustmentLogs({ limit: 100 })
  ])

  const plans = plansRes.data || []
  const logs = logsRes.data || []

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6 text-stone-900 font-sans">
      <MaintenanceHeader />

      <main className="space-y-6">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗓️</span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950">
                แผนซ่อมบำรุงเชิงป้องกัน 2026 (PM 2026)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              ระบบผูกแผนบำรุงรักษาประจำปีและเดือนเข้ากับเครื่องจักร 279 เครื่อง พร้อมระบบปรับเปลี่ยนความถี่แบบตรวจสอบได้ (Audited Frequency Adjustment)
            </p>
          </div>
        </div>

        {/* Client Component */}
        <PMManagementClient initialPlans={plans} initialLogs={logs} />
      </main>
    </div>
  )
}
