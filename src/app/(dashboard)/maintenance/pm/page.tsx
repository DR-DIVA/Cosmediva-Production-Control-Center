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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <MaintenanceHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗓️</span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                แผนซ่อมบำรุงเชิงป้องกัน 2026 (PM 2026)
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
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
