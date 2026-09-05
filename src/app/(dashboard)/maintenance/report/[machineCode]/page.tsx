import React from 'react'
import { getMachines, getMachine360 } from '@/app/actions/maintenance'
import FastReportForm from '@/components/maintenance/FastReportForm'
import Link from 'next/link'
import { ChevronLeft, QrCode } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ machineCode: string }>
}

export default async function MachineDirectReportPage({ params }: Props) {
  const { machineCode } = await params
  const [machinesRes, machine360Res] = await Promise.all([
    getMachines(),
    getMachine360(machineCode)
  ])

  const machines = machinesRes.data || []
  const initialMachine = machine360Res.data?.machine || machines.find(m => m.machine_code === machineCode) || null

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-5xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/maintenance/machines/${machineCode}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 bg-white px-3 py-1.5 rounded-xl border border-stone-200 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          ดูประวัติเครื่อง {machineCode}
        </Link>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5" />
          สแกนพบเครื่อง: {machineCode}
        </span>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          🚨 แจ้งเครื่องเสีย: {machineCode}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-medium">
          {initialMachine?.machine_name || 'ระบบบันทึกงานซ่อมอัตโนมัติ'}
        </p>
      </div>

      <FastReportForm initialMachine={initialMachine} machines={machines} />
    </div>
  )
}
