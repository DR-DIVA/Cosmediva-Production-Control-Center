'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { MaintenancePMPlan, MaintenancePMAdjustmentLog, getPmFrequencyInfo } from '@/types/maintenance'
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
        const freq = getPmFrequencyInfo(p.frequency_type, p.frequency_interval)
        if (freq.code !== selectedFreq) return false
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
    const pm1 = plans.filter(p => getPmFrequencyInfo(p.frequency_type, p.frequency_interval).code === 'PM1').length
    const pm2 = plans.filter(p => getPmFrequencyInfo(p.frequency_type, p.frequency_interval).code === 'PM2').length
    const pm3 = plans.filter(p => getPmFrequencyInfo(p.frequency_type, p.frequency_interval).code === 'PM3').length
    const pm4 = plans.filter(p => getPmFrequencyInfo(p.frequency_type, p.frequency_interval).code === 'PM4').length
    const pm6 = plans.filter(p => getPmFrequencyInfo(p.frequency_type, p.frequency_interval).code === 'PM6').length
    const pm12 = plans.filter(p => getPmFrequencyInfo(p.frequency_type, p.frequency_interval).code === 'PM12').length
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
    <div className="space-y-6 text-stone-900 font-sans">
      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white border border-stone-200 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block truncate">แผน PM ทั้งหมด</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-stone-900 font-mono">{metrics.total}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-cyan-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-cyan-700 font-bold block truncate" title="PM1 = ทุก 1 เดือน">PM1 (1 เดือน)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-cyan-600 font-mono">{metrics.pm1}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-blue-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-blue-700 font-bold block truncate" title="PM2 = ทุก 2 เดือน">PM2 (2 เดือน)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-blue-600 font-mono">{metrics.pm2}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-indigo-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold block truncate" title="PM3 = ทุก 3 เดือน">PM3 (3 เดือน)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-indigo-600 font-mono">{metrics.pm3}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-purple-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-purple-700 font-bold block truncate" title="PM4 = ทุก 4 เดือน">PM4 (4 เดือน)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-purple-600 font-mono">{metrics.pm4}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block truncate" title="PM6 = ทุก 6 เดือน">PM6 (6 เดือน)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-600 font-mono">{metrics.pm6}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-amber-700 font-bold block truncate" title="PM12 = ทุก 12 เดือน">PM12 (12 เดือน)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-amber-600 font-mono">{metrics.pm12}</span>
            <span className="text-[11px] text-stone-400 font-medium">เครื่อง</span>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl shadow-2xs">
          <span className="text-[10px] uppercase tracking-wider text-amber-800 font-bold block truncate">บันทึกปรับรอบ</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-amber-700 font-mono">{metrics.totalAdjustments}</span>
            <span className="text-[11px] text-amber-600 font-medium">ครั้ง</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200/60 text-xs sm:text-sm overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'list'
                  ? 'bg-stone-900 text-[#D4AF37] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span>📋</span>
              <span>รายการแผน PM ({filteredPlans.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'matrix'
                  ? 'bg-stone-900 text-[#D4AF37] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span>📅</span>
              <span>ตารางไทม์ไลน์รายปี (Matrix 12 เดือน)</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'logs'
                  ? 'bg-stone-900 text-[#D4AF37] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span>📜</span>
              <span>ประวัติการปรับรอบ (Audit Logs: {logs.length})</span>
            </button>
          </div>

          {/* Quick Notice */}
          <div className="text-xs text-stone-600 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 shrink-0 self-start lg:self-center">
            <span className="text-amber-700 font-bold">⚠️ บันทึกตรวจสอบ:</span>
            <span>ระบบกำหนดให้ระบุเหตุผลทุกครั้งที่ปรับแก้ความถี่รอบ PM</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              ค้นหารหัส / ชื่อเครื่องจักร / แผน
            </label>
            <input
              type="text"
              placeholder="ค้นหา เช่น AFILL, MX-04, AHU, รถยก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-[#D4AF37]"
            />
          </div>

          {/* Dept Filter */}
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              แผนก (Department)
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#D4AF37] font-medium"
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
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              รอบความถี่ (Frequency)
            </label>
            <select
              value={selectedFreq}
              onChange={(e) => setSelectedFreq(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-[#D4AF37] font-medium"
            >
              <option value="ALL">🔄 ทุกรอบความถี่ (All Frequencies)</option>
              <option value="PM1">PM1 = ทุก 1 เดือน</option>
              <option value="PM2">PM2 = ทุก 2 เดือน</option>
              <option value="PM3">PM3 = ทุก 3 เดือน</option>
              <option value="PM4">PM4 = ทุก 4 เดือน</option>
              <option value="PM6">PM6 = ทุก 6 เดือน</option>
              <option value="PM12">PM12 = ทุก 12 เดือน</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: LIST VIEW */}
      {activeTab === 'list' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          
          {/* Mobile Card List (Viewports < md: Tablet portrait & Mobile) */}
          <div className="block md:hidden divide-y divide-stone-150">
            {filteredPlans.length === 0 ? (
              <div className="p-8 text-center text-stone-400 font-medium">
                ไม่พบข้อมูลแผน PM ตามเงื่อนไขที่เลือก
              </div>
            ) : (
              filteredPlans.map((plan) => {
                const machine = (plan as any).machine
                const freq = getPmFrequencyInfo(plan.frequency_type, plan.frequency_interval)
                return (
                  <div key={plan.id} className="p-4 space-y-3 bg-white hover:bg-stone-50/70 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-cyan-700 font-bold block">{plan.plan_code}</span>
                        <Link
                          href={`/maintenance/machines/${plan.machine_code || machine?.machine_code || machine?.id || ''}`}
                          className="font-bold text-stone-900 hover:text-cyan-700 transition inline-flex items-center gap-1 font-mono text-sm"
                        >
                          <span>{plan.machine_code}</span>
                          <span className="text-xs text-stone-400">↗</span>
                        </Link>
                        <h4 className="text-xs font-bold text-stone-900 mt-0.5">{plan.machine_name}</h4>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0 border ${freq.color}`}>
                          {freq.full}
                        </span>
                        {plan.adjustment_count && plan.adjustment_count > 0 ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                            🔄 ปรับ {plan.adjustment_count}x
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      <div>
                        <span className="text-stone-400 block">แผนก / พื้นที่:</span>
                        <span className="font-bold text-stone-700">{machine?.department_code || 'PD'} • {machine?.production_area || 'Factory'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">กำหนดการถัดไป:</span>
                        <span className="font-mono font-bold text-stone-700">{plan.next_due_date || 'ตามรอบปี'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <span className="text-[11px] text-stone-500">
                        {Array.isArray(plan.checklist_template) ? `${plan.checklist_template.length} รายการตรวจเช็ค` : 'ตามมาตรฐาน'}
                      </span>
                      <button
                        onClick={() => handleOpenAdjustModal(plan)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] hover:bg-amber-600 text-stone-950 transition shadow-xs inline-flex items-center gap-1.5 active:scale-95 shrink-0"
                      >
                        <span>⚙️</span>
                        <span>ปรับความถี่รอบ PM</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Table View (Viewports >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-stone-700 min-w-[880px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase text-stone-600 tracking-wider">
                  <th className="p-3.5 pl-5 min-w-[140px]">รหัสแผน / เครื่องจักร</th>
                  <th className="p-3.5 min-w-[200px]">ชื่อเครื่องจักร</th>
                  <th className="p-3.5 min-w-[120px]">แผนก / สถานที่</th>
                  <th className="p-3.5 min-w-[150px]">ความถี่รอบ PM</th>
                  <th className="p-3.5 min-w-[110px]">กำหนดการถัดไป</th>
                  <th className="p-3.5 min-w-[140px]">รายการตรวจสอบ (Checklist)</th>
                  <th className="p-3.5 pr-5 text-right min-w-[120px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400 font-medium">
                      ไม่พบข้อมูลแผน PM ตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const machine = (plan as any).machine
                    const freq = getPmFrequencyInfo(plan.frequency_type, plan.frequency_interval)
                    return (
                      <tr key={plan.id} className="hover:bg-stone-50/80 transition">
                        <td className="p-3.5 pl-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-cyan-700 font-bold">{plan.plan_code}</span>
                            <Link
                              href={`/maintenance/machines/${plan.machine_code || machine?.machine_code || machine?.id || ''}`}
                              className="font-bold text-stone-900 hover:text-cyan-700 transition mt-0.5 inline-flex items-center gap-1 font-mono"
                            >
                              <span>{plan.machine_code}</span>
                              <span className="text-[10px] text-stone-400">↗</span>
                            </Link>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-stone-900 line-clamp-1">{plan.machine_name}</span>
                          <span className="text-[11px] text-stone-500">{machine?.category || 'General Machinery'}</span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-col text-[11px]">
                            <span className="font-bold text-stone-800">{machine?.department_code || 'PD'}</span>
                            <span className="text-stone-500 line-clamp-1">{machine?.production_area || 'Factory'}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border ${freq.color}`}>
                              {freq.full}
                            </span>
                            {plan.adjustment_count && plan.adjustment_count > 0 ? (
                              <span
                                title={`ปรับรอบแล้ว ${plan.adjustment_count} ครั้ง พร้อมบันทึกเหตุผล`}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                              >
                                🔄 ปรับ {plan.adjustment_count}x
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono text-xs font-semibold text-stone-700">
                            {plan.next_due_date || 'ตามรอบปี'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className="text-xs text-stone-600">
                            {Array.isArray(plan.checklist_template) ? `${plan.checklist_template.length} รายการตรวจเช็ค` : 'ตามมาตรฐาน'}
                          </span>
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => handleOpenAdjustModal(plan)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-900 text-stone-800 hover:text-[#D4AF37] border border-stone-200 hover:border-stone-900 transition shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap"
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
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs text-stone-600 font-medium">
              ตารางแสดงกำหนดการบำรุงรักษาประจำปี 2026 (12 เดือน) | เดือนปัจจุบัน: <span className="text-[#8B7355] font-black underline">{CURRENT_MONTH} (กันยายน)</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-600"></span>
                <span className="text-stone-700">มีแผน PM</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-stone-200 border border-stone-300"></span>
                <span className="text-stone-400">ไม่มีรอบ</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[960px]">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 font-bold uppercase text-stone-600 tracking-wider text-[11px]">
                  <th className="p-3 pl-5 min-w-[150px] sticky left-0 bg-stone-100 z-10">รหัสเครื่องจักร</th>
                  <th className="p-3 min-w-[200px]">ชื่อเครื่องจักร</th>
                  <th className="p-3 min-w-[80px]">รอบ</th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className={`p-3 text-center min-w-[50px] ${
                        m === CURRENT_MONTH ? 'bg-amber-100/70 text-amber-950 font-black border-x border-amber-300' : ''
                      }`}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="p-3 pr-5 text-right min-w-[100px]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {filteredPlans.slice(0, 100).map((plan) => {
                  const scheduleMonths: string[] = (plan as any).schedule_months || []
                  const freq = getPmFrequencyInfo(plan.frequency_type, plan.frequency_interval)
                  const hasMonth = (m: string) => {
                    if (scheduleMonths.length > 0) return scheduleMonths.includes(m)
                    if (freq.code === 'PM1') return true
                    if (freq.code === 'PM2') return ['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV'].includes(m)
                    if (freq.code === 'PM3') return ['JAN', 'APR', 'JUL', 'OCT'].includes(m)
                    if (freq.code === 'PM4') return ['JAN', 'MAY', 'SEP'].includes(m)
                    if (freq.code === 'PM6') return ['JAN', 'JUN'].includes(m)
                    if (freq.code === 'PM12') return m === 'JUN'
                    return false
                  }

                  return (
                    <tr key={plan.id} className="hover:bg-stone-50 transition">
                      <td className="p-3 pl-5 font-bold text-stone-900 font-sans sticky left-0 bg-white z-10 border-r border-stone-150">
                        <Link href={`/maintenance/machines/${plan.machine_code || (plan as any).machine?.machine_code || (plan as any).machine?.id || ''}`} className="hover:text-cyan-700">
                          {plan.machine_code}
                        </Link>
                      </td>
                      <td className="p-3 font-sans text-stone-700 truncate max-w-[220px]">
                        {plan.machine_name}
                      </td>
                      <td className="p-3 font-sans text-xs">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${freq.color}`} title={freq.full}>
                          {freq.code}
                        </span>
                      </td>

                      {MONTHS.map((m) => {
                        const isScheduled = hasMonth(m)
                        const isCurrent = m === CURRENT_MONTH
                        return (
                          <td
                            key={m}
                            className={`p-2 text-center ${isCurrent ? 'bg-amber-50/50 border-x border-amber-200' : ''}`}
                          >
                            {isScheduled ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                                PM
                              </span>
                            ) : (
                              <span className="text-stone-300">-</span>
                            )}
                          </td>
                        )
                      })}

                      <td className="p-3 pr-5 text-right font-sans">
                        <button
                          onClick={() => handleOpenAdjustModal(plan)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-stone-100 hover:bg-stone-900 text-stone-800 hover:text-[#D4AF37] border border-stone-200 font-bold transition"
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
            <div className="p-3 text-center text-xs text-stone-500 bg-stone-50 border-t border-stone-200">
              แสดง 100 รายการแรกจากทั้งหมด {filteredPlans.length} รายการ (ใช้ช่องค้นหาด้านบนเพื่อกรองเฉพาะเครื่องที่ต้องการ)
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-stone-50 border-b border-stone-200">
            <h4 className="font-black text-stone-900 text-base flex items-center gap-2">
              <span>📜</span>
              <span>บันทึกประวัติการปรับความถี่รอบ PM พร้อมเหตุผล (Audit Trail)</span>
            </h4>
            <p className="text-xs text-stone-500 mt-1">
              ประวัติความโปร่งใส ทุกครั้งที่มีการเปลี่ยนรอบตรวจเช็ค เพื่อเป็นหลักฐานทางวิศวกรรมและการตรวจสอบคุณภาพ (Audit Proof)
            </p>
          </div>

          <div className="divide-y divide-stone-100">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                ยังไม่มีประวัติการปรับเปลี่ยนความถี่รอบ PM
              </div>
            ) : (
              logs.map((log) => {
                const oldFreq = getPmFrequencyInfo(log.old_frequency_type)
                const newFreq = getPmFrequencyInfo(log.new_frequency_type)
                return (
                  <div key={log.id} className="p-4 hover:bg-stone-50 transition flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 font-mono bg-stone-100 border border-stone-300 px-2 py-0.5 rounded text-xs">
                          {log.machine_code}
                        </span>
                        <span className="text-xs text-stone-500">
                          ปรับรอบจาก:
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono border border-stone-200">
                          {oldFreq.full}
                        </span>
                        <span className="text-cyan-700 font-bold">➔</span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-bold font-mono ${newFreq.color}`}>
                          {newFreq.full}
                        </span>
                      </div>

                    {/* Prominent Mandatory Reason */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-xs">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1 mb-1">
                        <span>📝</span> เหตุผลในการปรับเปลี่ยน:
                      </div>
                      <p className="text-stone-800 leading-relaxed font-sans font-medium">
                        {log.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      <span>👤 ผู้ปรับเปลี่ยน: <span className="text-stone-800 font-bold">{log.adjusted_by_name}</span></span>
                      {log.new_due_date && (
                        <span>📅 กำหนดการใหม่: <span className="text-stone-800 font-mono font-bold">{log.new_due_date}</span></span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-stone-400 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )
            })
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
