import React from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import Link from 'next/link'
import { 
  AlertOctagon, 
  QrCode, 
  Wrench, 
  KanbanSquare, 
  Cpu, 
  Package, 
  BarChart3, 
  Clock, 
  Flame, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { getMaintenanceKPIs, getWorkOrders, getMachines } from '@/app/actions/maintenance'
import MaintenanceHubClient from '@/components/maintenance/MaintenanceHubClient'

export const dynamic = 'force-dynamic'

export default async function MaintenanceHubPage() {
  const [kpiRes, woRes, machinesRes] = await Promise.all([
    getMaintenanceKPIs(),
    getWorkOrders(),
    getMachines()
  ])

  const kpis = kpiRes.data || {
    openWOCount: 0,
    criticalCount: 0,
    waitingPartCount: 0,
    closedCount: 0,
    totalDowntimeHours: '0',
    totalDowntimeLossThb: 0,
    mttrMinutes: 0,
    mtbfHours: 0,
    totalPartCostThb: 0,
    topBadActors: [],
    machineCount: 0,
    runningCount: 0,
    breakdownCount: 0
  }

  const allWOs = woRes.data || []
  const machines = machinesRes.data || []
  const activeBreakdowns = allWOs.filter(w => !['CLOSED', 'VERIFIED'].includes(w.status))

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
      <MaintenanceHeader />

      {/* Hero Quick Launch Cards */}
      <MaintenanceHubClient machines={machines} />

      {/* Real-time KPI Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase">
            <span>ความพร้อมเครื่องจักร</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-3xl font-black text-stone-900 tracking-tight">
            {kpis.runningCount} <span className="text-sm font-semibold text-stone-400">/ {kpis.machineCount} เครื่อง</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Availability {kpis.machineCount > 0 ? Math.round((kpis.runningCount / kpis.machineCount) * 100) : 100}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase">
            <span>งานด่วน P1 Critical</span>
            <Flame className="w-4 h-4 text-red-600 animate-bounce" />
          </div>
          <div className="text-3xl font-black text-red-600 tracking-tight">
            {kpis.criticalCount} <span className="text-sm font-semibold text-stone-400">งาน</span>
          </div>
          <div className="text-[11px] text-stone-400">
            จากทั้งหมด {kpis.openWOCount} งานที่เปิดอยู่
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase">
            <span>Downtime รวม</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-stone-900 tracking-tight">
            {kpis.totalDowntimeHours} <span className="text-sm font-semibold text-stone-400">ชม.</span>
          </div>
          <div className="text-[11px] text-[#8B7355] font-semibold">
            ความสูญเสีย ≈ ฿{kpis.totalDowntimeLossThb.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase">
            <span>MTTR / MTBF</span>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {kpis.mttrMinutes} <span className="text-xs font-bold text-stone-400">นาที</span> / {kpis.mtbfHours} <span className="text-xs font-bold text-stone-400">ชม.</span>
          </div>
          <div className="text-[11px] text-stone-400">
            เวลาเฉลี่ยในการซ่อม / รอบเครื่องไม่เสีย
          </div>
        </div>
      </div>

      {/* Active Breakdown Live Radar */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
            <h2 className="text-base sm:text-lg font-black text-stone-900">
              สถานะเครื่องจักรที่กำลังเสียหรือรอซ่อม (Live Breakdown Queue)
            </h2>
          </div>
          <Link
            href="/maintenance/work-orders"
            className="text-xs font-bold text-[#8B7355] hover:underline flex items-center gap-1"
          >
            เปิดกระดาน Kanban ทั้งหมด ({allWOs.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activeBreakdowns.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>ยอดเยี่ยมมาก! ไม่มีเครื่องจักรหยุดการผลิตในขณะนี้ ทุกเครื่องพร้อมเดินงาน 100%</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeBreakdowns.map(wo => {
              const isP1 = wo.priority === 'P1_CRITICAL'

              return (
                <div
                  key={wo.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
                    isP1
                      ? 'bg-rose-50/40 border-red-400 ring-2 ring-red-500/10'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isP1 ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {wo.priority}
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-400">{wo.wo_number}</span>
                    </div>

                    <div>
                      <h4 className="font-black text-sm text-stone-900">{wo.machine_code} - {wo.machine_name}</h4>
                      <p className="text-xs text-stone-600 mt-0.5 font-medium line-clamp-1">
                        อาการ: {wo.symptom_category}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                      <span>สถานะ: <b className="text-stone-800">{wo.status}</b></span>
                      <span className="flex items-center gap-1 text-red-600 font-bold">
                        <Clock className="w-3 h-3" />
                        {wo.total_downtime_minutes} นาที
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-stone-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">ช่าง: {wo.assigned_technician_name || 'ยังไม่มอบหมาย'}</span>
                    <Link
                      href="/maintenance/technician"
                      className="text-xs font-bold text-stone-900 hover:text-[#D4AF37] flex items-center gap-1"
                    >
                      จัดการงาน
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid: Bad Actors & Machine 360 Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bad Actors */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              เครื่องจักรเจ้าปัญหา (Top Bad Actors)
            </h3>
            <Link href="/maintenance/dashboard" className="text-xs font-bold text-[#8B7355] hover:underline">
              ดูแดชบอร์ดเต็ม
            </Link>
          </div>

          <div className="space-y-2">
            {kpis.topBadActors.slice(0, 3).map((ba: any, i: number) => (
              <div key={ba.code} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    i === 0 ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-stone-900 font-mono">{ba.code}</div>
                    <div className="text-[11px] text-stone-500 truncate max-w-[200px]">{ba.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-red-600 block">{ba.downtimeMin} นาที</span>
                  <span className="text-[10px] text-stone-400">เสีย {ba.breakdowns} ครั้ง</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge & AI Showcase */}
        <div className="bg-gradient-to-br from-[#2A2521] to-[#3A332B] text-white rounded-3xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-extrabold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              Factory Maintenance Intelligence
            </div>
            <h3 className="text-lg font-black tracking-tight">
              “Breakdown → Data → Knowledge → Prevention”
            </h3>
            <p className="text-xs text-stone-300 mt-2 leading-relaxed">
              ทุกครั้งที่เครื่องเสีย ระบบจะบันทึกประวัติ อะไหล่ที่เปลี่ยน และเวลาซ่อมบำรุง
              เพื่อช่วยให้ช่างใหม่วินิจฉัยงานซ่อมได้เร็วขึ้น และช่วยผู้บริหารวางแผนลด Downtime ได้อย่างยั่งยืน
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Link
              href="/maintenance/search"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#D4AF37] hover:bg-amber-500 text-stone-900 font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              ค้นหาประวัติซ่อมบำรุง
            </Link>
            <Link
              href="/maintenance/machines"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2.5 rounded-xl transition-colors border border-white/10"
            >
              ดูทะเบียนเครื่องจักร 360°
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
