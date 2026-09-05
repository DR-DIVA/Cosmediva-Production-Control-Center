import React from 'react'
import { getMaintenanceKPIs } from '@/app/actions/maintenance'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import Link from 'next/link'
import { 
  BarChart3, 
  Flame, 
  Clock, 
  Wrench, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle, 
  Repeat, 
  ArrowRight,
  Activity,
  Layers,
  Cpu
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MaintenanceDashboardPage() {
  const res = await getMaintenanceKPIs()
  const data = res.data || {
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

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
      <MaintenanceHeader />

      {/* Top Banner KPI Radar */}
      <div className="bg-gradient-to-r from-[#2A2521] via-[#3A332B] to-[#2A2521] p-6 rounded-3xl text-white shadow-xl border border-[#D4AF37]/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-extrabold text-[#D4AF37] uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
            Executive Reliability & Downtime Health
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mt-1 text-white">
            ภาพรวมประสิทธิภาพการซ่อมบำรุงโรงงาน
          </h2>
          <p className="text-xs text-stone-300 mt-1">
            ความพร้อมของเครื่องจักร (Availability) • ประเมินมูลค่าความสูญเสียจาก Downtime • วิเคราะห์ Bad Actor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/10 text-right">
            <span className="text-[10px] text-stone-300 block">เครื่องจักรพร้อมเดิน:</span>
            <span className="text-xl font-black text-emerald-400">
              {data.runningCount} / {data.machineCount}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/10 text-right">
            <span className="text-[10px] text-stone-300 block">เครื่องหยุดซ่อม/เสีย:</span>
            <span className={`text-xl font-black ${data.breakdownCount > 0 ? 'text-rose-400' : 'text-stone-300'}`}>
              {data.breakdownCount}
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Breakdowns */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">งานด่วน P1 Critical</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <Flame className="w-4 h-4 animate-bounce" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-600 tracking-tight">{data.criticalCount}</div>
          <div className="text-[11px] text-stone-400">ส่งผลให้สายการผลิตหยุดชะงัก</div>
        </div>

        {/* Card 2: Total Downtime */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">เวลารวม Downtime</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-stone-900 tracking-tight">{data.totalDowntimeHours} <span className="text-sm font-bold text-stone-500">ชม.</span></div>
          <div className="text-[11px] text-stone-400">คำนวณจากใบแจ้งซ่อมทั้งหมด</div>
        </div>

        {/* Card 3: Financial Downtime Loss */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">ประมาณการสูญเสีย</span>
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#8B7355]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#8B7355] tracking-tight">
            ฿{data.totalDowntimeLossThb.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400">Downtime Loss = ชม. × Cost/Hour</div>
        </div>

        {/* Card 4: MTTR */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">MTTR (เวลาเฉลี่ยในการซ่อม)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-stone-900 tracking-tight">{data.mttrMinutes} <span className="text-sm font-bold text-stone-500">นาที</span></div>
          <div className="text-[11px] text-stone-400">เป้าหมายโรงงาน: ≤ 90 นาที</div>
        </div>
      </div>

      {/* Second Row: Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
          <span className="text-xs text-stone-500 block">งานซ่อมค้างอยู่ (Open WOs)</span>
          <span className="text-2xl font-black text-stone-900">{data.openWOCount}</span>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
          <span className="text-xs text-stone-500 block">งานรออะไหล่ (Waiting Part)</span>
          <span className="text-2xl font-black text-amber-700">{data.waitingPartCount}</span>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
          <span className="text-xs text-stone-500 block">MTBF (รอบการทำงานเฉลี่ย)</span>
          <span className="text-2xl font-black text-emerald-700">{data.mtbfHours} ชม.</span>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
          <span className="text-xs text-stone-500 block">ต้นทุนอะไหล่สะสม</span>
          <span className="text-2xl font-black text-stone-800">฿{data.totalPartCostThb.toLocaleString()}</span>
        </div>
      </div>

      {/* TOP 5 BAD ACTOR MACHINES (เครื่องเจ้าปัญหา) */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                TOP 5 PROBLEM MACHINES — เครื่องจักรที่เสียสะสมสูงสุด (Bad Actors)
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              จัดอันดับตามเวลาหยุดซ่อมและจำนวนครั้งที่เสีย เพื่อวางแผนปรับปรุงและทำ Overhaul
            </p>
          </div>

          <span className="text-xs text-stone-400 font-mono">Reliability Ranking</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400">
                <th className="pb-2.5 font-bold">อันดับ</th>
                <th className="pb-2.5 font-bold">รหัสเครื่อง & ชื่อ</th>
                <th className="pb-2.5 font-bold">หมวดหมู่</th>
                <th className="pb-2.5 font-bold text-center">จำนวนครั้งที่เสีย</th>
                <th className="pb-2.5 font-bold text-right">Downtime รวม</th>
                <th className="pb-2.5 font-bold text-right">ค่าอะไหล่สะสม</th>
                <th className="pb-2.5 text-right font-bold">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.topBadActors.map((ba: any, index: number) => (
                <tr key={ba.code} className="hover:bg-stone-50">
                  <td className="py-3 font-bold text-stone-400">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      index === 0 ? 'bg-red-600 text-white' :
                      index === 1 ? 'bg-amber-500 text-white' :
                      'bg-stone-200 text-stone-700'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="font-bold font-mono text-stone-900">{ba.code}</div>
                    <div className="text-[11px] text-stone-500">{ba.name}</div>
                  </td>
                  <td className="py-3 font-semibold text-stone-700">{ba.category}</td>
                  <td className="py-3 text-center font-black text-stone-900">{ba.breakdowns} ครั้ง</td>
                  <td className="py-3 text-right font-bold text-red-600">{ba.downtimeMin} นาที</td>
                  <td className="py-3 text-right font-bold text-[#8B7355]">฿{ba.cost.toLocaleString()}</td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/maintenance/machines/${ba.code}`}
                      className="inline-flex items-center text-xs font-bold text-stone-800 hover:text-[#D4AF37]"
                    >
                      ดูประวัติ 360°
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
