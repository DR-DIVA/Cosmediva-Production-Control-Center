'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { MaintenancePMPlan, MaintenancePMAdjustmentLog } from '@/types/maintenance'
import AdjustPMFrequencyModal from '@/components/maintenance/AdjustPMFrequencyModal'
import { useRouter } from 'next/navigation'

interface Props {
  initialPlans: MaintenancePMPlan[]
  initialLogs: MaintenancePMAdjustmentLog[]
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const CURRENT_MONTH = 'SEP' // September

export default function PMManagementClient({ initialPlans, initialLogs }: Props) {
  const router = useRouter()
  const [plans, setPlans] = useState<MaintenancePMPlan[]>(initialPlans)
  const [logs, setLogs] = useState<MaintenancePMAdjustmentLog[]>(initialLogs)
  const [activeTab, setActiveTab] = useState<'list' | 'matrix' | 'logs'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [selectedFreq, setSelectedFreq] = useState('ALL')
  const [selectedPlanForAdjust, setSelectedPlanForAdjust] = useState<MaintenancePMPlan | null>(null)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>()
    plans.forEach(p => {
      const d = (p as any).machine?.department_code
      if (d) set.add(d)
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [plans])

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      // Dept filter
      if (selectedDept !== 'ALL') {
        const d = (p as any).machine?.department_code
        if (d !== selectedDept) return false
      }
      // Freq filter
      if (selectedFreq !== 'ALL') {
        if (selectedFreq === 'PM1' && p.frequency_type !== 'Monthly') return false
        if (selectedFreq === 'PM2' && p.frequency_type !== 'Every 2 Months') return false
        if (selectedFreq === 'PM3' && p.frequency_type !== 'Quarterly') return false
        if (selectedFreq === 'PM4' && p.frequency_type !== 'Every 4 Months') return false
        if (selectedFreq === 'PM6' && p.frequency_type !== 'BiAnnually') return false
        if (selectedFreq === 'PM12' && p.frequency_type !== 'Yearly') return false
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const code = p.machine_code.toLowerCase()
        const name = p.machine_name.toLowerCase()
        const pcode = p.plan_code.toLowerCase()
        if (!code.includes(q) && !name.includes(q) && !pcode.includes(q)) return false
      }
      return true
    })
  }, [plans, selectedDept, selectedFreq, searchQuery])

  // Metric summaries
  const metrics = useMemo(() => {
    const total = plans.length
    const pm1 = plans.filter(p => p.frequency_type === 'Monthly').length
    const pm2 = plans.filter(p => p.frequency_type === 'Every 2 Months').length
    const pm3 = plans.filter(p => p.frequency_type === 'Quarterly').length
    const pm4 = plans.filter(p => p.frequency_type === 'Every 4 Months').length
    const pm6 = plans.filter(p => p.frequency_type === 'BiAnnually').length
    const pm12 = plans.filter(p => p.frequency_type === 'Yearly').length
    const totalAdjustments = logs.length

    return { total, pm1, pm2, pm3, pm4, pm6, pm12, totalAdjustments }
  }, [plans, logs])

  const handleOpenAdjustModal = (plan: MaintenancePMPlan) => {
    setSelectedPlanForAdjust(plan)
    setIsAdjustModalOpen(true)
  }

  const handleAdjustmentSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">แผน PM ทั้งหมด</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white font-mono">{metrics.total}</span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-medium">รายเดือน (PM1)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-cyan-300 font-mono">{metrics.pm1}</span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider text-blue-400 font-medium">ทุก 2 เดือน (PM2)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-300 font-mono">{metrics.pm2}</span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider text-indigo-400 font-medium">รายไตรมาส (PM3)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-indigo-300 font-mono">{metrics.pm3}</span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider text-purple-400 font-medium">ทุก 4 เดือน (PM4)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-purple-300 font-mono">{metrics.pm4}</span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium">รายครึ่งปี (PM6)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-300 font-mono">{metrics.pm6}</span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-amber-900/30 p-3.5 rounded-2xl bg-amber-950/10">
          <span className="text-[11px] uppercase tracking-wider text-amber-400 font-medium">ประวัติปรับรอบ (Audit)</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-300 font-mono">{metrics.totalAdjustments}</span>
            <span className="text-xs text-amber-500/80">ครั้ง</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-sm">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>รายการแผน PM ({filteredPlans.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 ${
                activeTab === 'matrix'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📅</span>
              <span>ตารางไทม์ไลน์รายปี (Matrix 12 เดือน)</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-2 ${
                activeTab === 'logs'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📜</span>
              <span>ประวัติการปรับรอบ (Audit Logs: {logs.length})</span>
            </button>
          </div>

          {/* Quick Notice */}
          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-750">
            <span className="text-amber-400 font-bold">⚠️ บันทึกตรวจสอบ:</span>
            <span>ระบบกำหนดให้ระบุเหตุผลทุกครั้งที่ปรับแก้ความถี่รอบ PM</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              ค้นหารหัส / ชื่อเครื่องจักร / แผน
            </label>
            <input
              type="text"
              placeholder="ค้นหา เช่น AFILL, MX-04, AHU, รถยก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Dept Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              แผนก (Department)
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? '🏢 ทุกแผนก (All Departments)' : `แผนก ${d}`}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              รอบความถี่ (Frequency)
            </label>
            <select
              value={selectedFreq}
              onChange={(e) => setSelectedFreq(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">🔄 ทุกรอบความถี่</option>
              <option value="PM1">รายเดือน (PM1)</option>
              <option value="PM2">ทุก 2 เดือน (PM2)</option>
              <option value="PM3">รายไตรมาส (PM3)</option>
              <option value="PM4">ทุก 4 เดือน (PM4)</option>
              <option value="PM6">รายครึ่งปี (PM6)</option>
              <option value="PM12">รายปี (PM12)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: LIST VIEW */}
      {activeTab === 'list' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="p-3.5 pl-5">รหัสแผน / เครื่องจักร</th>
                  <th className="p-3.5">ชื่อเครื่องจักร</th>
                  <th className="p-3.5">แผนก / สถานที่</th>
                  <th className="p-3.5">ความถี่รอบ PM</th>
                  <th className="p-3.5">กำหนดการถัดไป</th>
                  <th className="p-3.5">รายการตรวจสอบ (Checklist)</th>
                  <th className="p-3.5 pr-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      ไม่พบข้อมูลแผน PM ตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const machine = (plan as any).machine
                    return (
                      <tr key={plan.id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3.5 pl-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-cyan-400 font-semibold">{plan.plan_code}</span>
                            <Link
                              href={machine?.id ? `/maintenance/machines/${machine.id}` : '#'}
                              className="font-bold text-white hover:text-cyan-300 transition mt-0.5 inline-flex items-center gap-1"
                            >
                              <span>{plan.machine_code}</span>
                              <span className="text-xs text-slate-500">↗</span>
                            </Link>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-medium text-slate-200 line-clamp-1">{plan.machine_name}</span>
                          <span className="text-xs text-slate-400">{machine?.category || 'General Machinery'}</span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-slate-300">{machine?.department_code || 'PD'}</span>
                            <span className="text-slate-400 line-clamp-1">{machine?.production_area || 'Factory'}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium font-mono ${
                              plan.frequency_type === 'Monthly'
                                ? 'bg-cyan-950 border border-cyan-700 text-cyan-300'
                                : plan.frequency_type === 'Every 2 Months'
                                ? 'bg-blue-950 border border-blue-700 text-blue-300'
                                : plan.frequency_type === 'Quarterly'
                                ? 'bg-indigo-950 border border-indigo-700 text-indigo-300'
                                : plan.frequency_type === 'Every 4 Months'
                                ? 'bg-purple-950 border border-purple-700 text-purple-300'
                                : plan.frequency_type === 'BiAnnually'
                                ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                : 'bg-amber-950 border border-amber-700 text-amber-300'
                            }`}>
                              {plan.frequency_type} ({plan.frequency_interval} ด.)
                            </span>
                            {plan.adjustment_count && plan.adjustment_count > 0 ? (
                              <span
                                title={`ปรับรอบแล้ว ${plan.adjustment_count} ครั้ง พร้อมบันทึกเหตุผล`}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/40 text-amber-300 border border-amber-800"
                              >
                                🔄 ปรับ {plan.adjustment_count}x
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono text-xs text-slate-300">
                            {plan.next_due_date || 'ตามรอบปี'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="text-xs text-slate-400">
                            {Array.isArray(plan.checklist_template) ? `${plan.checklist_template.length} รายการตรวจเช็ค` : 'ตามมาตรฐาน'}
                          </span>
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => handleOpenAdjustModal(plan)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-500 transition shadow-sm inline-flex items-center gap-1.5"
                          >
                            <span>⚙️</span>
                            <span>ปรับความถี่</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: YEARLY MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              ตารางแสดงกำหนดการบำรุงรักษาประจำปี 2026 (12 เดือน) | เดือนปัจจุบัน: <span className="text-cyan-400 font-bold underline">{CURRENT_MONTH} (กันยายน)</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span>
                <span className="text-slate-300">มีแผน PM</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700"></span>
                <span className="text-slate-400">ไม่มีรอบ</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="p-3 pl-5 min-w-[150px]">รหัสเครื่องจักร</th>
                  <th className="p-3 min-w-[200px]">ชื่อเครื่องจักร</th>
                  <th className="p-3 min-w-[80px]">รอบ</th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className={`p-3 text-center min-w-[50px] ${
                        m === CURRENT_MONTH ? 'bg-cyan-950/60 text-cyan-300 font-bold border-x border-cyan-800/40' : ''
                      }`}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="p-3 pr-5 text-right min-w-[100px]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredPlans.slice(0, 100).map((plan) => {
                  const scheduleMonths: string[] = (plan as any).schedule_months || []
                  // If not explicitly set, calculate based on interval
                  const hasMonth = (m: string) => {
                    if (scheduleMonths.length > 0) return scheduleMonths.includes(m)
                    if (plan.frequency_type === 'Monthly') return true
                    if (plan.frequency_type === 'BiAnnually') return ['JAN', 'JUN'].includes(m)
                    if (plan.frequency_type === 'Every 4 Months') return ['JAN', 'MAY', 'SEP'].includes(m)
                    if (plan.frequency_type === 'Quarterly') return ['JAN', 'APR', 'JUL', 'OCT'].includes(m)
                    if (plan.frequency_type === 'Every 2 Months') return ['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV'].includes(m)
                    if (plan.frequency_type === 'Yearly') return m === 'JUN'
                    return false
                  }

                  return (
                    <tr key={plan.id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3 pl-5 font-bold text-white font-sans">
                        <Link href={`/maintenance/machines/${(plan as any).machine?.id || ''}`} className="hover:text-cyan-300">
                          {plan.machine_code}
                        </Link>
                      </td>
                      <td className="p-3 font-sans text-slate-300 truncate max-w-[220px]">
                        {plan.machine_name}
                      </td>
                      <td className="p-3 font-sans text-xs">
                        <span className="text-cyan-300">{plan.frequency_type.substring(0, 4)}</span>
                      </td>

                      {MONTHS.map((m) => {
                        const isScheduled = hasMonth(m)
                        const isCurrent = m === CURRENT_MONTH
                        return (
                          <td
                            key={m}
                            className={`p-2 text-center ${isCurrent ? 'bg-cyan-950/20 border-x border-cyan-800/30' : ''}`}
                          >
                            {isScheduled ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-600/30 text-cyan-300 border border-cyan-600/50">
                                PM
                              </span>
                            ) : (
                              <span className="text-slate-700">-</span>
                            )}
                          </td>
                        )
                      })}

                      <td className="p-3 pr-5 text-right font-sans">
                        <button
                          onClick={() => handleOpenAdjustModal(plan)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700 transition"
                        >
                          ปรับ
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredPlans.length > 100 && (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-950/40 border-t border-slate-800">
              แสดง 100 รายการแรกจากทั้งหมด {filteredPlans.length} รายการ (ใช้ช่องค้นหาด้านบนเพื่อกรองเฉพาะเครื่องที่ต้องการ)
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950/70 border-b border-slate-800">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <span>📜</span>
              <span>บันทึกประวัติการปรับความถี่รอบ PM พร้อมเหตุผล (Audit Trail)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              ประวัติความโปร่งใส ทุกครั้งที่มีการเปลี่ยนรอบตรวจเช็ค เพื่อเป็นหลักฐานทางวิศวกรรมและการตรวจสอบคุณภาพ (Audit Proof)
            </p>
          </div>

          <div className="divide-y divide-slate-800">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                ยังไม่มีประวัติการปรับเปลี่ยนความถี่รอบ PM
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-850/40 transition flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded text-xs">
                        {log.machine_code}
                      </span>
                      <span className="text-xs text-slate-400">
                        ปรับรอบจาก:
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {log.old_frequency_type || 'มาตรฐาน'}
                      </span>
                      <span className="text-cyan-400 font-bold">➔</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold font-mono">
                        {log.new_frequency_type}
                      </span>
                    </div>

                    {/* Prominent Mandatory Reason */}
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-sm">
                      <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mb-1">
                        <span>📝</span> เหตุผลในการปรับเปลี่ยน:
                      </div>
                      <p className="text-slate-200 leading-relaxed font-sans">
                        {log.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>👤 ผู้ปรับเปลี่ยน: <span className="text-slate-300 font-medium">{log.adjusted_by_name}</span></span>
                      {log.new_due_date && (
                        <span>📅 กำหนดการใหม่: <span className="text-white font-mono">{log.new_due_date}</span></span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Frequency Adjustment Modal */}
      <AdjustPMFrequencyModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        plan={selectedPlanForAdjust}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  )
}
