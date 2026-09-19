import React from 'react'
import { getMachines, getMachine360 } from '@/app/actions/maintenance'
import FastReportForm from '@/components/maintenance/FastReportForm'
import Link from 'next/link'
import { ChevronLeft, QrCode, Package, History, FileCheck } from 'lucide-react'

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

      {/* Machine Quick Specs Banner */}
      {initialMachine && (
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
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

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/maintenance/machines/${initialMachine.machine_code}#pm-section`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>📋 ตรวจเช็ค PM ประจำรอบ</span>
              </Link>

              <Link
                href={`/maintenance/spare-parts?search=${initialMachine.machine_code}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition"
              >
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>เบิกอะไหล่สิ้นเปลือง</span>
              </Link>

              <Link
                href={`/maintenance/machines/${initialMachine.machine_code}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition"
              >
                <History className="w-3.5 h-3.5 text-stone-600" />
                <span>สเปก & ประวัติ 360°</span>
              </Link>
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
              <span className="text-stone-400 block text-[11px]">สถานะปัจจุบัน:</span>
              <span className="font-bold text-stone-800">{initialMachine.status}</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          🚨 บันทึกแจ้งซ่อมเครื่องจักร: {machineCode}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-medium">
          ระบบส่งแจ้งเตือนเข้าช่างซ่อมบำรุงทันที และออกใบสั่งซ่อม (Work Order) อัตโนมัติ
        </p>
      </div>

      <FastReportForm initialMachine={initialMachine} machines={machines} />
    </div>
  )
}
