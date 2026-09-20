import React from 'react'
import { getMachines, getMachine360, getSpareParts } from '@/app/actions/maintenance'
import SmartMachineMobileHub from '@/components/maintenance/SmartMachineMobileHub'
import Link from 'next/link'
import { ChevronLeft, QrCode } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ machineCode: string }>
}

export default async function MachineDirectReportPage({ params }: Props) {
  const { machineCode } = await params
  const [machinesRes, machine360Res, sparePartsRes] = await Promise.all([
    getMachines(),
    getMachine360(machineCode),
    getSpareParts()
  ])

  const machines = machinesRes.data || []
  const spareParts = sparePartsRes.data || []
  const machine360Data = machine360Res.data
  const initialMachine = machine360Data?.machine || machines.find(m => m.machine_code === machineCode) || null
  const pmPlan = machine360Data?.pmPlan || null

  if (!initialMachine) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <h1 className="text-xl font-bold text-stone-900">ไม่พบรหัสเครื่องจักร {machineCode}</h1>
        <p className="text-xs text-stone-500">กรุณาตรวจสอบแผ่นป้าย QR Code หรือเลือกเครื่องจักรจากทะเบียน</p>
        <Link href="/maintenance/machines" className="inline-block px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl">
          กลับสู่ทะเบียนเครื่องจักร
        </Link>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0 text-stone-900 font-sans">
      <div className="flex items-center justify-between">
        <Link
          href={`/maintenance/machines/${machineCode}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-950 bg-white px-3.5 py-2 rounded-xl border border-stone-200 transition-colors shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>ดูประวัติเครื่อง {machineCode}</span>
        </Link>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-emerald-700" />
          <span>สแกนพบเครื่อง: {machineCode}</span>
        </span>
      </div>

      {/* Machine Quick Banner */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-stone-900">{initialMachine.machine_code}</span>
              {initialMachine.asset_id && (
                <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                  เลขทรัพย์สิน: {initialMachine.asset_id}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                initialMachine.criticality === 'A' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                Grade {initialMachine.criticality}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-stone-800 mt-1">{initialMachine.machine_name}</h2>
            <div className="text-xs text-stone-500 mt-0.5">
              {initialMachine.department_name} • {initialMachine.production_area}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
              initialMachine.status === 'Running' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
              initialMachine.status === 'Breakdown' ? 'bg-red-600 text-white animate-pulse' :
              'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {initialMachine.status}
            </span>
            <div className="text-[11px] text-stone-400 mt-1">ช่าง: {initialMachine.responsible_technician_name || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-600">
          <div>
            <span className="text-stone-400 block text-[11px]">ผู้จำหน่าย (Supplier):</span>
            <span className="font-medium text-stone-800">{initialMachine.supplier && initialMachine.supplier !== 'N/A' ? initialMachine.supplier : '-'}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">ยี่ห้อ / รุ่น:</span>
            <span className="font-medium text-stone-800">
              {[initialMachine.manufacturer, initialMachine.model].filter(x => x && x !== 'N/A').join(' ') || '-'}
            </span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">หมายเลขเครื่อง:</span>
            <span className="font-mono text-stone-800">{initialMachine.serial_number && initialMachine.serial_number !== 'N/A' ? initialMachine.serial_number : '-'}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">ต้นทุน Downtime:</span>
            <span className="font-bold text-[#8B7355]">฿{Number(initialMachine.hourly_downtime_cost || 0).toLocaleString()} / ชม.</span>
          </div>
        </div>
      </div>

      {/* Smart Machine Mobile Hub (3 Tabs: Report, Consumable Requisition, PM & Specs) */}
      <SmartMachineMobileHub
        machine={initialMachine}
        machines={machines}
        spareParts={spareParts}
        pmPlan={pmPlan}
      />
    </div>
  )
}

