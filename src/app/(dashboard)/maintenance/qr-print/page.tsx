import React from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import MachineQRPrintStudio from '@/components/maintenance/MachineQRPrintStudio'
import { getMachines } from '@/app/actions/maintenance'

export const dynamic = 'force-dynamic'

export default async function MachineQRPrintPage() {
  const res = await getMachines()
  const machines = res.success && res.data ? res.data : []

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
      <div className="no-print">
        <MaintenanceHeader />
      </div>

      <main>
        <MachineQRPrintStudio initialMachines={machines} />
      </main>
    </div>
  )
}
