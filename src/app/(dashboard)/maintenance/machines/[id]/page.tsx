import React from 'react'
import { getMachine360 } from '@/app/actions/maintenance'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import MachineQRBadge from '@/components/maintenance/MachineQRBadge'
import Link from 'next/link'
import { 
  Wrench, 
  Clock, 
  AlertOctagon, 
  Calendar, 
  Package, 
  Flame, 
  ShieldCheck, 
  Repeat, 
  CheckCircle2, 
  Cpu, 
  Layers,
  ChevronLeft,
  DollarSign,
  Activity,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Machine360Page({ params }: Props) {
  const { id: machineCode } = await params
  const res = await getMachine360(machineCode)

  if (!res.success || !res.data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-800">ไม่พบข้อมูลเครื่องจักร {machineCode}</h2>
        <Link href="/maintenance/machines" className="text-xs font-bold text-[#8B7355] underline">
          กลับสู่ทะเบียนเครื่องจักร
        </Link>
      </div>
    )
  }

  const { machine, activeWorkOrders, historyWorkOrders, partsConsumed, metrics } = res.data

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Nav Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/maintenance/machines"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 bg-white px-3 py-1.5 rounded-xl border border-stone-200 transition-colors shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          ทะเบียนเครื่องจักร
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/maintenance/report/${machine.machine_code}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            แจ้งซ่อมเครื่องนี้
          </Link>
        </div>
      </div>

      {/* REPEATED FAILURE ALERT BANNER */}
      {metrics.isRepeatedBadActor && (
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 sm:p-5 rounded-3xl shadow-xl shadow-red-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-2 border-red-400 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Repeat className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                🔁 REPEATED FAILURE DETECTED (เครื่องจักรเกิดปัญหาซ้ำซ้อน)
              </div>
              <div className="text-xs opacity-90">
                เครื่องนี้เกิดความเสียหาย {metrics.recentFailureCount} ครั้งในรอบ 90 วันล่าสุด • แนะนำทำ Root Cause Analysis (RCA)
              </div>
            </div>
          </div>
          <span className="text-xs bg-white text-red-800 font-extrabold px-3 py-1.5 rounded-xl self-end sm:self-auto shrink-0">
            Bad Actor Machine
          </span>
        </div>
      )}

      {/* Main Grid: Left Spec Card & Right QR Badge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 360 Header & Specs */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-black text-stone-900">{machine.machine_code}</span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${
                  machine.criticality === 'A' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  Criticality Grade {machine.criticality}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-stone-800 mt-1">{machine.machine_name}</h1>
              <div className="text-xs text-stone-500 mt-0.5">
                {machine.department_name} • {machine.production_area} • {machine.line}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                machine.status === 'Running' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                machine.status === 'Breakdown' ? 'bg-red-600 text-white animate-pulse' :
                machine.status === 'Under Repair' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                'bg-stone-100 text-stone-700'
              }`}>
                {machine.status}
              </span>
              <div className="text-[11px] text-stone-400 mt-1">ช่างรับผิดชอบ: {machine.responsible_technician_name || '-'}</div>
            </div>
          </div>

          {/* Key Reliability Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-center">
              <span className="text-[11px] text-stone-500 font-medium block">Breakdowns</span>
              <span className="text-xl font-black text-stone-900">{metrics.totalBreakdowns}</span>
              <span className="text-[10px] text-stone-400 block">ครั้ง</span>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-center">
              <span className="text-[11px] text-stone-500 font-medium block">Total Downtime</span>
              <span className="text-xl font-black text-red-600">{metrics.totalDowntimeHours}</span>
              <span className="text-[10px] text-stone-400 block">ชั่วโมง</span>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-center">
              <span className="text-[11px] text-stone-500 font-medium block">MTTR (เฉลี่ย)</span>
              <span className="text-xl font-black text-amber-600">{metrics.mttrMinutes}</span>
              <span className="text-[10px] text-stone-400 block">นาที/งาน</span>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-center">
              <span className="text-[11px] text-stone-500 font-medium block">MTBF</span>
              <span className="text-xl font-black text-emerald-600">{metrics.mtbfHours}</span>
              <span className="text-[10px] text-stone-400 block">ชั่วโมงเดินเครื่อง</span>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#D4AF37]" />
              ข้อมูลทางเทคนิค & สเปกเครื่องจักร:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block">ผู้ผลิต / แบรนด์:</span>
                <span className="font-semibold text-stone-800">{machine.manufacturer}</span>
              </div>
              <div>
                <span className="text-stone-400 block">รุ่น (Model):</span>
                <span className="font-semibold text-stone-800">{machine.model}</span>
              </div>
              <div>
                <span className="text-stone-400 block">หมายเลขเครื่อง (Serial No.):</span>
                <span className="font-mono font-semibold text-stone-800">{machine.serial_number || '-'}</span>
              </div>
              <div>
                <span className="text-stone-400 block">ราคาจัดซื้อ (Purchase Cost):</span>
                <span className="font-semibold text-stone-800">฿{Number(machine.purchase_cost).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-stone-400 block">ต้นทุน Downtime:</span>
                <span className="font-bold text-[#8B7355]">฿{Number(machine.hourly_downtime_cost).toLocaleString()} / ชั่วโมง</span>
              </div>
              <div>
                <span className="text-stone-400 block">วันที่ติดตั้ง:</span>
                <span className="font-semibold text-stone-800">{machine.installation_date || '-'}</span>
              </div>
            </div>

            {machine.maintenance_instruction && (
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
                <b>คำแนะนำการบำรุงรักษา:</b> {machine.maintenance_instruction}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Printable QR Badge */}
        <div>
          <MachineQRBadge
            machineCode={machine.machine_code}
            machineName={machine.machine_name}
            productionArea={machine.production_area}
            criticality={machine.criticality}
            roomName={machine.room_name}
          />
        </div>
      </div>

      {/* ACTIVE WORK ORDERS (IF ANY) */}
      {activeWorkOrders.length > 0 && (
        <div className="bg-red-50/70 border-2 border-red-300 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-red-800">
            <Flame className="w-5 h-5 text-red-600 animate-bounce" />
            <h3 className="text-base font-black">งานซ่อมที่กำลังดำเนินการอยู่ ({activeWorkOrders.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeWorkOrders.map((wo: any) => (
              <div key={wo.id} className="bg-white p-4 rounded-2xl border border-red-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</div>
                  <div className="text-sm font-bold text-stone-900">{wo.symptom_category}: {wo.symptom_description || wo.production_impact}</div>
                  <div className="text-xs text-stone-500 mt-0.5">สถานะ: <b className="text-amber-700">{wo.status}</b> | ช่าง: {wo.assigned_technician_name || '-'}</div>
                </div>

                <Link
                  href="/maintenance/technician"
                  className="px-3 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 shrink-0"
                >
                  เปิดโหมดช่าง
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAINTENANCE HISTORY TIMELINE */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-base sm:text-lg font-black text-stone-900">
              ประวัติการซ่อมบำรุงย้อนหลัง (Maintenance Timeline)
            </h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">บันทึกทั้งหมด {historyWorkOrders.length} รายการ</span>
        </div>

        {historyWorkOrders.length === 0 ? (
          <div className="text-center py-12 text-xs text-stone-400">
            ยังไม่มีประวัติการซ่อมสำหรับเครื่องจักรนี้
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-stone-200 space-y-6 mt-4 ml-3">
            {historyWorkOrders.map((job: any) => (
              <div key={job.id} className="relative group">
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-stone-900 border-4 border-white shadow-xs group-hover:bg-[#D4AF37] transition-colors"></div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 group-hover:border-stone-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500">{job.wo_number}</span>
                      <span className="font-black text-sm text-stone-900">{job.symptom_category}</span>
                      {job.problem_category && (
                        <span className="px-2 py-0.2 rounded-md bg-stone-200 text-stone-800 text-[10px] font-bold">
                          {job.problem_category}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-400 font-mono">
                      {new Date(job.reported_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {job.symptom_description && (
                    <p className="text-xs text-stone-600">{job.symptom_description}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-stone-200">
                    <div>
                      <span className="text-stone-400">สาเหตุหลัก (Root Cause): </span>
                      <b className="text-stone-800">{job.root_cause || 'ไม่ระบุ'}</b>
                    </div>
                    <div>
                      <span className="text-stone-400">สิ่งที่แก้ไข (Action): </span>
                      <b className="text-stone-800">{job.corrective_action || 'ซ่อมแซมตามขั้นตอน'}</b>
                    </div>
                    <div>
                      <span className="text-stone-400">ช่างผู้ซ่อม: </span>
                      <span className="text-stone-700">{job.assigned_technician_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">เวลา Downtime: </span>
                      <span className="font-bold text-red-600">{job.total_downtime_minutes} นาที</span>
                    </div>
                  </div>

                  {/* Parts used */}
                  {job.parts && job.parts.length > 0 && (
                    <div className="text-xs flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-stone-400 font-medium">อะไหล่ที่เปลี่ยน:</span>
                      {job.parts.map((p: any) => (
                        <span key={p.id} className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-semibold text-[11px]">
                          📦 {p.part_name} ({p.quantity} {p.unit})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PARTS CONSUMED SUMMARY */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-base font-black text-stone-900">
              ประวัติการใช้อะไหล่ของเครื่องนี้ (Spare Parts Lifetime Consumed)
            </h2>
          </div>
          <span className="text-xs font-bold text-[#8B7355]">
            ต้นทุนอะไหล่รวม: ฿{Number(metrics.totalPartCost).toLocaleString()}
          </span>
        </div>

        {partsConsumed.length === 0 ? (
          <div className="text-center py-6 text-xs text-stone-400">ยังไม่มีบันทึกการเบิกใช้อะไหล่</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400">
                  <th className="pb-2 font-semibold">รหัสอะไหล่</th>
                  <th className="pb-2 font-semibold">ชื่ออะไหล่</th>
                  <th className="pb-2 font-semibold text-center">จำนวน</th>
                  <th className="pb-2 font-semibold text-right">ต้นทุนรวม</th>
                  <th className="pb-2 font-semibold text-right">วันที่เปลี่ยน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {partsConsumed.map((item: any) => (
                  <tr key={item.id} className="hover:bg-stone-50">
                    <td className="py-2.5 font-mono font-bold text-stone-700">{item.part_code}</td>
                    <td className="py-2.5 font-medium text-stone-900">{item.part_name}</td>
                    <td className="py-2.5 text-center font-bold">{item.quantity} {item.unit}</td>
                    <td className="py-2.5 text-right font-bold text-[#8B7355]">฿{Number(item.total_cost).toLocaleString()}</td>
                    <td className="py-2.5 text-right text-stone-400">
                      {new Date(item.used_at).toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
