'use client'

import React, { useState, useEffect, useMemo } from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import { 
  Wrench, 
  AlertOctagon, 
  Clock, 
  Play, 
  CheckCircle2, 
  Pause, 
  Package, 
  Sparkles, 
  ShieldAlert, 
  CheckSquare, 
  Flame, 
  Layers, 
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Calendar,
  FileCheck,
  Search,
  Filter,
  Check,
  ShoppingCart,
  Timer,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import { MaintenanceWorkOrder, MaintenancePMPlan, getPmFrequencyInfo, formatWorkOrderStatus } from '@/types/maintenance'
import { 
  getWorkOrders, 
  transitionWorkOrderStatus, 
  getAISimilarFailures,
  getPMPlans
} from '@/app/actions/maintenance'
import SparePartUsageModal from '@/components/maintenance/SparePartUsageModal'
import CompleteRepairModal from '@/components/maintenance/CompleteRepairModal'
import ProductionVerifyModal from '@/components/maintenance/ProductionVerifyModal'
import MediaAttachmentViewer from '@/components/maintenance/MediaAttachmentViewer'
import ExecutePMChecksheetModal from '@/components/maintenance/ExecutePMChecksheetModal'

/**
 * Format live elapsed duration in Thai
 */
function formatElapsedDuration(diffMs: number): string {
  if (diffMs <= 0) return '0 วินาที'
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts = []
  if (days > 0) parts.push(`${days} วัน`)
  if (hours > 0) parts.push(`${hours} ชม.`)
  if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} นาที`)
  parts.push(`${seconds} วิ`)
  return parts.join(' ')
}

export default function TechnicianCockpitPage() {
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([])
  const [pmPlans, setPmPlans] = useState<MaintenancePMPlan[]>([])
  const [activeGroupTab, setActiveGroupTab] = useState<'breakdown' | 'pm_plan'>('breakdown')
  const [breakdownFilter, setBreakdownFilter] = useState<'ALL' | 'READY' | 'IN_PROGRESS' | 'NEW'>('ALL')
  const [technicianName, setTechnicianName] = useState('ช่างสมหมาย เก่งการช่าง')
  const [isLoading, setIsLoading] = useState(true)

  // PM Filter state
  const [selectedPlanForExecute, setSelectedPlanForExecute] = useState<MaintenancePMPlan | null>(null)
  const [pmSearchQuery, setPmSearchQuery] = useState('')
  const [pmMonthFilter, setPmMonthFilter] = useState<'SEP' | 'ALL'>('SEP')
  const [pmDeptFilter, setPmDeptFilter] = useState('ALL')
  const [pmFreqFilter, setPmFreqFilter] = useState('ALL')

  // Modals state
  const [partModalWO, setPartModalWO] = useState<MaintenanceWorkOrder | null>(null)
  const [completeModalData, setCompleteModalData] = useState<{
    wo: MaintenanceWorkOrder
    targetStatus: 'TEST_RUN' | 'COMPLETED'
  } | null>(null)
  const [verifyModalWO, setVerifyModalWO] = useState<MaintenanceWorkOrder | null>(null)
  const [waitingPartModalWO, setWaitingPartModalWO] = useState<MaintenanceWorkOrder | null>(null)
  const [prNumber, setPrNumber] = useState('')
  const [prReason, setPrReason] = useState('')
  const [aiInsight, setAiInsight] = useState<any>(null)
  const [selectedWOForAI, setSelectedWOForAI] = useState<MaintenanceWorkOrder | null>(null)

  // Live timer ticking every second
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      const [woRes, pmRes] = await Promise.all([
        getWorkOrders(),
        getPMPlans()
      ])

      if (woRes.success) {
        setWorkOrders(woRes.data)
        // Check if there's any active breakdown to load AI insight for
        const active = woRes.data.find(w => !['CLOSED', 'VERIFIED'].includes(w.status))
        if (active) {
          setSelectedWOForAI(active)
          getAISimilarFailures({
            machineCode: active.machine_code,
            symptomCategory: active.symptom_category
          }).then(aiRes => {
            if (aiRes.success) setAiInsight(aiRes.data)
          })
        }
      }

      if (pmRes.success) {
        setPmPlans(pmRes.data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  // Action: Accept Job
  const handleAcceptJob = async (wo: MaintenanceWorkOrder) => {
    const res = await transitionWorkOrderStatus({
      work_order_id: wo.id,
      to_status: 'ACKNOWLEDGED',
      changed_by_name: technicianName,
      assigned_technician_name: technicianName,
      notes: `${technicianName} รับงานซ่อมแล้ว กำลังเดินทางไปหน้างาน`
    })

    if (res.success) {
      toast.success(`รับงาน ${wo.wo_number} สำเร็จ (บันทึก Response Time เรียบร้อย)`)
      loadJobs()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  // Action: Start Repair
  const handleStartRepair = async (wo: MaintenanceWorkOrder) => {
    const res = await transitionWorkOrderStatus({
      work_order_id: wo.id,
      to_status: 'IN_PROGRESS',
      changed_by_name: technicianName,
      assigned_technician_name: technicianName,
      notes: `${technicianName} ถึงหน้าเครื่องและเริ่มดำเนินการตรวจซ่อม`
    })

    if (res.success) {
      toast.success(`เริ่มงานซ่อม ${wo.wo_number} แล้ว! ระบบเริ่มจับเวลาซ่อมบำรุง`)
      loadJobs()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  // Action: Pause / Waiting Part
  const handlePauseWaitingPart = async (wo: MaintenanceWorkOrder) => {
    setWaitingPartModalWO(wo)
    setPrNumber('')
    setPrReason('')
  }

  const handleConfirmWaitingPart = async () => {
    if (!waitingPartModalWO) return
    const noteText = prNumber.trim() 
      ? `รออะไหล่: เปิด PR เลขที่ ${prNumber.trim()} (${prReason.trim() || 'รอจัดซื้อจัดส่ง'})`
      : `รออะไหล่: ${prReason.trim() || 'ไม่มีอะไหล่ในสต็อก ต้องเปิด PR ขอซื้อ'}`

    const res = await transitionWorkOrderStatus({
      work_order_id: waitingPartModalWO.id,
      to_status: 'WAITING_PART',
      changed_by_name: technicianName,
      notes: noteText
    })

    if (res.success) {
      toast.warning(`ย้าย ${waitingPartModalWO.wo_number} ไปสถานะ "รออะไหล่" เรียบร้อย`)
      setWaitingPartModalWO(null)
      setPrNumber('')
      setPrReason('')
      loadJobs()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  const handleResumeRepair = async (wo: MaintenanceWorkOrder) => {
    const res = await transitionWorkOrderStatus({
      work_order_id: wo.id,
      to_status: 'IN_PROGRESS',
      changed_by_name: technicianName,
      notes: `${technicianName} ได้รับอะไหล่แล้ว เริ่มดำเนินการซ่อมต่อ`
    })

    if (res.success) {
      toast.success(`เริ่มงานซ่อม ${wo.wo_number} ต่อแล้ว! ระบบจับเวลาต่อ`)
      loadJobs()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  const handleFailTestRun = async (wo: MaintenanceWorkOrder) => {
    const res = await transitionWorkOrderStatus({
      work_order_id: wo.id,
      to_status: 'IN_PROGRESS',
      changed_by_name: technicianName,
      notes: `${technicianName}: ทดสอบเครื่องไม่ผ่าน นำกลับมาแก้ไขต่อ`
    })

    if (res.success) {
      toast.info(`ส่ง ${wo.wo_number} กลับไปตรวจซ่อมต่อ`)
      loadJobs()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  // Filter groups for Breakdowns
  const criticalJobs = workOrders.filter(w => w.priority === 'P1_CRITICAL' && !['CLOSED', 'VERIFIED'].includes(w.status))
  const readyToRepairJobs = workOrders.filter(w => ['ACKNOWLEDGED', 'ASSIGNED'].includes(w.status) && w.priority !== 'P1_CRITICAL')
  const inProgressJobs = workOrders.filter(w => ['IN_PROGRESS', 'WAITING_PART', 'TEST_RUN'].includes(w.status) && w.priority !== 'P1_CRITICAL')
  const newRequests = workOrders.filter(w => w.status === 'NEW' && w.priority !== 'P1_CRITICAL')
  const recentlyCompleted = workOrders.filter(w => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(w.status)).slice(0, 5)
  const activeBreakdownCount = workOrders.filter(w => !['CLOSED', 'VERIFIED'].includes(w.status)).length

  // Filter groups for PM Plans
  const currentMonthPMCount = pmPlans.filter(p => p.schedule_months?.includes('SEP') || p.frequency_type === 'Monthly').length

  const pmDepartments = useMemo(() => {
    const set = new Set<string>()
    pmPlans.forEach(p => {
      const d = (p as any).machine?.department_code
      if (d) set.add(d)
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [pmPlans])

  const filteredPMPlans = useMemo(() => {
    return pmPlans.filter(p => {
      // Month schedule filter (default SEP or ALL)
      if (pmMonthFilter !== 'ALL') {
        const hasMonth = p.schedule_months?.includes(pmMonthFilter) || p.frequency_type === 'Monthly'
        if (!hasMonth) return false
      }
      // Dept filter
      if (pmDeptFilter !== 'ALL') {
        const d = (p as any).machine?.department_code
        if (d !== pmDeptFilter) return false
      }
      // Freq filter
      if (pmFreqFilter !== 'ALL') {
        const freq = getPmFrequencyInfo(p.frequency_type, p.frequency_interval)
        if (freq.code !== pmFreqFilter) return false
      }
      // Search
      if (pmSearchQuery.trim()) {
        const q = pmSearchQuery.toLowerCase()
        const code = p.machine_code.toLowerCase()
        const name = p.machine_name.toLowerCase()
        const pcode = p.plan_code.toLowerCase()
        if (!code.includes(q) && !name.includes(q) && !pcode.includes(q)) return false
      }
      return true
    })
  }, [pmPlans, pmMonthFilter, pmDeptFilter, pmFreqFilter, pmSearchQuery])

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0">
      <MaintenanceHeader />

      {/* Technician Cockpit Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold text-lg">
            🔧
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-stone-900">Technician Mobile Cockpit</h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-full">
                พร้อมปฏิบัติงาน (Active)
              </span>
            </div>
            <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
              <span>ช่างประจำกะ:</span>
              <input
                type="text"
                value={technicianName}
                onChange={e => setTechnicianName(e.target.value)}
                className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-lg border-none text-xs w-48"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={loadJobs}
            variant="outline"
            size="sm"
            className="text-xs border-stone-200 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            รีเฟรชงาน
          </Button>

          <Link
            href="/maintenance/work-orders"
            className="inline-flex items-center text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 px-3.5 py-2 rounded-xl"
          >
            เปิดบอร์ด Kanban เต็ม
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* 2-GROUP CLASSIFICATION TABS (แยกหมวดหมู่งาน: ใบแจ้งซ่อม vs แผน PM) */}
      <div className="bg-white p-2 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          onClick={() => setActiveGroupTab('breakdown')}
          className={`flex-1 py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2.5 ${
            activeGroupTab === 'breakdown'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-900/20'
              : 'bg-stone-50 text-stone-600 hover:text-stone-950 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Flame className={`w-4 h-4 ${activeGroupTab === 'breakdown' ? 'text-amber-300 animate-bounce' : 'text-red-500'}`} />
          <span>กลุ่ม 1: งานจากใบแจ้งซ่อม (Breakdown)</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
            activeGroupTab === 'breakdown' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
          }`}>
            {activeBreakdownCount} งาน
          </span>
        </button>

        <button
          onClick={() => setActiveGroupTab('pm_plan')}
          className={`flex-1 py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2.5 ${
            activeGroupTab === 'pm_plan'
              ? 'bg-gradient-to-r from-cyan-700 to-teal-700 text-white shadow-lg shadow-cyan-900/20'
              : 'bg-stone-50 text-stone-600 hover:text-stone-950 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeGroupTab === 'pm_plan' ? 'text-cyan-200' : 'text-cyan-600'}`} />
          <span>กลุ่ม 2: งานตามแผน PM ประจำเดือน (PM Plan)</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
            activeGroupTab === 'pm_plan' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-800'
          }`}>
            {currentMonthPMCount} เครื่อง
          </span>
        </button>
      </div>

      {/* GROUP 1: BREAKDOWN WORK ORDERS */}
      {activeGroupTab === 'breakdown' && (
        <div className="space-y-6">
          {/* Quick Sub-Filter Pills aligned with Kanban */}
          <div className="flex flex-wrap items-center gap-2 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200 text-xs">
            <button
              onClick={() => setBreakdownFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                breakdownFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <span>ทั้งหมด</span>
              <span className="px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-800 text-[10px]">
                {activeBreakdownCount}
              </span>
            </button>

            <button
              onClick={() => setBreakdownFilter('READY')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                breakdownFilter === 'READY'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>⚡ พร้อมเริ่มซ่อม (Start Repair)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {readyToRepairJobs.length}
              </span>
            </button>

            <button
              onClick={() => setBreakdownFilter('IN_PROGRESS')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                breakdownFilter === 'IN_PROGRESS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>กำลังซ่อมบำรุง</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                {inProgressJobs.length}
              </span>
            </button>

            <button
              onClick={() => setBreakdownFilter('NEW')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                breakdownFilter === 'NEW'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>งานแจ้งใหม่</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                {newRequests.length}
              </span>
            </button>
          </div>

          {/* 1. CRITICAL BREAKDOWNS (P1) */}
          {criticalJobs.length > 0 && (breakdownFilter === 'ALL' || breakdownFilter === 'READY' || breakdownFilter === 'IN_PROGRESS') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-600 animate-bounce" />
                <h3 className="text-base sm:text-lg font-black text-red-600 tracking-tight">
                  🚨 งานด่วนฉุกเฉิน / เครื่องจักรหยุดการผลิต ({criticalJobs.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criticalJobs.map(wo => (
                  <div
                    key={wo.id}
                    className="bg-white border-2 border-red-500 rounded-3xl p-5 shadow-xl shadow-red-900/10 space-y-4 ring-4 ring-red-500/10"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white tracking-wide">
                            P1 CRITICAL
                          </span>
                          <span className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</span>
                        </div>
                        <h4 className="text-lg font-black text-stone-900 mt-1">
                          {wo.machine_code} - {wo.machine_name}
                        </h4>
                        <div className="text-xs text-red-700 font-bold flex items-center gap-1 mt-0.5">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>{wo.symptom_category}: {wo.symptom_description || wo.production_impact}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 block font-medium">แจ้งเมื่อ:</span>
                        <span className="font-mono text-xs font-bold text-stone-700">
                          {new Date(wo.reported_at).toLocaleTimeString('th-TH')} น.
                        </span>
                      </div>
                    </div>

                    {/* Photo/Video Attachments with Download & Share */}
                    {((wo.photo_before_urls && wo.photo_before_urls.length > 0) || (wo.photo_after_urls && wo.photo_after_urls.length > 0)) && (
                      <div className="space-y-2 py-1">
                        {wo.photo_before_urls && wo.photo_before_urls.length > 0 && (
                          <MediaAttachmentViewer
                            urls={wo.photo_before_urls}
                            title="ภาพถ่าย/วิดีโออาการที่แจ้ง"
                            woNumber={wo.wo_number}
                          />
                        )}
                        {wo.photo_after_urls && wo.photo_after_urls.length > 0 && (
                          <MediaAttachmentViewer
                            urls={wo.photo_after_urls}
                            title="ภาพถ่ายหลังการซ่อมเสร็จ"
                            woNumber={wo.wo_number}
                          />
                        )}
                      </div>
                    )}

                    {/* Status and Timer */}
                    <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500">สถานะงาน:</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-stone-900 text-white">
                          {formatWorkOrderStatus(wo.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-red-600 animate-spin" />
                        <span>Downtime: {wo.total_downtime_minutes} นาที</span>
                      </div>
                    </div>

                    {/* Big Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {wo.status === 'NEW' && (
                        <Button
                          onClick={() => handleAcceptJob(wo)}
                          className="col-span-2 h-12 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-red-900/20"
                        >
                          ACCEPT JOB (รับงานด่วน)
                        </Button>
                      )}

                      {(wo.status === 'ACKNOWLEDGED' || wo.status === 'ASSIGNED') && (
                        <Button
                          onClick={() => handleStartRepair(wo)}
                          className="col-span-2 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          START REPAIR (เริ่มซ่อม & จับเวลา)
                        </Button>
                      )}

                      {['IN_PROGRESS', 'WAITING_PART', 'TEST_RUN'].includes(wo.status) && (
                        <>
                          <Button
                            onClick={() => setPartModalWO(wo)}
                            className="h-11 bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Package className="w-4 h-4" />
                            + ใช้อะไหล่
                          </Button>

                          <Button
                            onClick={() => handlePauseWaitingPart(wo)}
                            variant="outline"
                            className="h-11 border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                          >
                            <Pause className="w-4 h-4" />
                            รออะไหล่
                          </Button>

                          <Button
                            onClick={() => setCompleteModalData({ wo, targetStatus: 'TEST_RUN' })}
                            className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-4 h-4" />
                            TEST RUN
                          </Button>

                          <Button
                            onClick={() => setCompleteModalData({ wo, targetStatus: 'COMPLETED' })}
                            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            ซ่อมเสร็จ (COMPLETE)
                          </Button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                      <span className="px-2 py-0.5 rounded bg-stone-100 font-mono">E-form (DCC)</span>
                      <Link
                        href={`/maintenance/machines/${wo.machine_code}`}
                        className="text-stone-600 hover:text-stone-900 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>ดูประวัติเครื่อง 360°</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. READY TO REPAIR (ช่างรับเรื่องแล้ว / มอบหมายแล้ว พร้อมลงมือซ่อม) */}
          {(breakdownFilter === 'ALL' || breakdownFilter === 'READY') && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-base font-black text-stone-800 flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                  งานที่รับเรื่องแล้ว พร้อมลงมือซ่อม (Ready to Repair) ({readyToRepairJobs.length})
                </h3>
                <span className="text-xs text-stone-500">
                  ช่างเดินถึงหน้าเครื่องจักรแล้ว กดปุ่มเพื่อเริ่มซ่อมและจับเวลาทันที
                </span>
              </div>

              {readyToRepairJobs.length === 0 ? (
                <div className="bg-white p-6 rounded-3xl border border-stone-200 text-center text-xs text-stone-400">
                  ไม่มีงานที่รอเริ่มซ่อมในขณะนี้
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyToRepairJobs.map(wo => (
                    <div
                      key={wo.id}
                      className="bg-white border-2 border-emerald-500/40 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              {formatWorkOrderStatus(wo.status)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              wo.priority === 'P2_HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                            }`}>
                              {wo.priority}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-stone-900 mt-2">{wo.machine_code} - {wo.machine_name}</h4>
                        <div className="text-xs text-stone-600 font-medium mt-1">{wo.symptom_category}</div>
                        {wo.symptom_description && (
                          <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 bg-stone-50 p-2 rounded-xl border border-stone-100">
                            {wo.symptom_description}
                          </p>
                        )}
                        <div className="text-[11px] text-stone-400 mt-2 flex items-center justify-between">
                          <span>ผู้แจ้ง: {wo.requester_name}</span>
                          {wo.assigned_technician_name && (
                            <span className="font-bold text-blue-700">ช่าง: {wo.assigned_technician_name}</span>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleStartRepair(wo)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl h-11 shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        START REPAIR (เริ่มซ่อม & จับเวลา)
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. IN PROGRESS / WAITING PART (กำลังดำเนินการซ่อมบำรุง) */}
          {(breakdownFilter === 'ALL' || breakdownFilter === 'IN_PROGRESS') && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-stone-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                งานที่กำลังดำเนินการซ่อม (In Progress & Waiting) ({inProgressJobs.length})
              </h3>

              {inProgressJobs.length === 0 ? (
                <div className="bg-white p-6 rounded-3xl border border-stone-200 text-center text-xs text-stone-400">
                  ไม่มีงานซ่อมที่กำลังดำเนินการอยู่
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inProgressJobs.map(wo => (
                    <div
                      key={wo.id}
                      className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            wo.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-900' :
                            wo.status === 'WAITING_PART' ? 'bg-orange-100 text-orange-900' :
                            'bg-indigo-100 text-indigo-900'
                          }`}>
                            {formatWorkOrderStatus(wo.status)}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-stone-900 mt-2">{wo.machine_code} - {wo.machine_name}</h4>
                        <p className="text-xs text-stone-600 mt-1 line-clamp-2">{wo.symptom_description || wo.symptom_category}</p>

                        {/* Attachments preview */}
                        {wo.photo_before_urls && wo.photo_before_urls.length > 0 && (
                          <div className="pt-2">
                            <MediaAttachmentViewer
                              urls={wo.photo_before_urls}
                              title="ภาพถ่าย/วิดีโออาการ"
                              woNumber={wo.wo_number}
                            />
                          </div>
                        )}
                      </div>

                      {/* Live Repair Timer or Downtime */}
                      {wo.status === 'IN_PROGRESS' ? (
                        <div className="bg-amber-50 rounded-2xl p-2.5 border border-amber-300 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                              เวลาซ่อมสด:
                            </span>
                            <span className="font-mono text-emerald-800 font-black">
                              {wo.repair_started_at ? formatElapsedDuration(currentTime - new Date(wo.repair_started_at).getTime()) : '0 วินาที'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5 border-t border-amber-200/60">
                            <span>รวม Downtime:</span>
                            <span className="font-mono font-bold text-red-600">
                              {formatElapsedDuration(currentTime - new Date(wo.reported_at).getTime())}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-stone-50 rounded-2xl p-2 border border-stone-200 flex items-center justify-between text-xs">
                          <span className="text-stone-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            Downtime รวม:
                          </span>
                          <span className="font-mono font-bold text-red-600">
                            {wo.total_downtime_minutes > 0 ? `${wo.total_downtime_minutes} นาที` : formatElapsedDuration(currentTime - new Date(wo.reported_at).getTime())}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-100 space-y-2">
                        {wo.status === 'IN_PROGRESS' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => setPartModalWO(wo)}
                                size="sm"
                                className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl h-9 flex items-center justify-center gap-1"
                              >
                                <Package className="w-3.5 h-3.5" />
                                + ใช้อะไหล่
                              </Button>
                              <Button
                                onClick={() => handlePauseWaitingPart(wo)}
                                size="sm"
                                variant="outline"
                                className="text-xs font-bold border-orange-300 text-orange-800 hover:bg-orange-50 rounded-xl h-9 flex items-center justify-center gap-1"
                              >
                                <ShoppingCart className="w-3.5 h-3.5 text-orange-600" />
                                รออะไหล่ / PR
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => setCompleteModalData({ wo, targetStatus: 'TEST_RUN' })}
                                size="sm"
                                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 flex items-center justify-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5" />
                                TEST RUN
                              </Button>
                              <Button
                                onClick={() => setCompleteModalData({ wo, targetStatus: 'COMPLETED' })}
                                size="sm"
                                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ปิดงานซ่อม
                              </Button>
                            </div>
                          </>
                        )}

                        {wo.status === 'WAITING_PART' && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => setPartModalWO(wo)}
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-orange-300 text-orange-900 hover:bg-orange-50 rounded-xl h-9 flex items-center justify-center gap-1"
                            >
                              <Package className="w-3.5 h-3.5" />
                              + ตัดใช้อะไหล่
                            </Button>
                            <Button
                              onClick={() => handleResumeRepair(wo)}
                              size="sm"
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 flex items-center justify-center gap-1 shadow-xs"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              ได้อะไหล่แล้ว ซ่อมต่อ ▶️
                            </Button>
                          </div>
                        )}

                        {wo.status === 'TEST_RUN' && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => handleFailTestRun(wo)}
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-50 rounded-xl h-9"
                            >
                              ↩️ ไม่ผ่าน ซ่อมต่อ
                            </Button>
                            <Button
                              onClick={() => setCompleteModalData({ wo, targetStatus: 'COMPLETED' })}
                              size="sm"
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ผ่าน / ปิดงานซ่อม
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. NEW REQUESTS (งานแจ้งซ่อมใหม่ รอรับเรื่อง) */}
          {(breakdownFilter === 'ALL' || breakdownFilter === 'NEW') && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-stone-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                งานแจ้งซ่อมใหม่ รอรับเรื่อง (New Requests) ({newRequests.length})
              </h3>

              {newRequests.length === 0 ? (
                <div className="bg-white p-6 rounded-3xl border border-stone-200 text-center text-xs text-stone-400">
                  ไม่มีงานแจ้งซ่อมใหม่ที่รอรับเรื่องในขณะนี้
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newRequests.map(wo => (
                    <div
                      key={wo.id}
                      className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                            {wo.priority}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-stone-900 mt-1">{wo.machine_code} - {wo.machine_name}</h4>
                        <div className="text-xs text-stone-600 font-medium mt-0.5">{wo.symptom_category}</div>
                        <div className="text-[11px] text-stone-400 mt-1">ผู้แจ้ง: {wo.requester_name}</div>
                      </div>

                      <Button
                        onClick={() => handleAcceptJob(wo)}
                        className="w-full bg-[#2A2521] hover:bg-stone-800 text-white font-bold text-xs rounded-xl h-10 shadow-xs"
                      >
                        ACCEPT (รับงานนี้)
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. JOBS WAITING PRODUCTION VERIFY */}
          {workOrders.filter(w => w.status === 'COMPLETED' || w.status === 'TEST_RUN').length > 0 && (
            <div className="space-y-3 bg-amber-50/60 p-5 rounded-3xl border border-amber-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-amber-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-700" />
                  งานรอผู้แจ้งซ่อมทดสอบ & ยืนยันเครื่องพร้อมใช้งาน (Verification Sign-Off)
                </h3>
                <span className="text-xs text-amber-700 font-semibold">คลิกเพื่อยืนยันผล</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workOrders.filter(w => w.status === 'COMPLETED' || w.status === 'TEST_RUN').map(wo => (
                  <div key={wo.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</div>
                      <div className="font-bold text-stone-900 text-sm">{wo.machine_code} - {wo.machine_name}</div>
                      <div className="text-xs text-stone-500">สถานะ: <b className="text-indigo-700">{formatWorkOrderStatus(wo.status)}</b></div>
                    </div>

                    <Button
                      onClick={() => setVerifyModalWO(wo)}
                      size="sm"
                      className="bg-[#D4AF37] hover:bg-amber-600 text-stone-900 font-extrabold text-xs rounded-xl h-10 px-4"
                    >
                      VERIFY PASS / FAIL
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI MAINTENANCE ASSISTANT PANEL (ย้ายมาไว้ด้านล่างสุดของรายการงานซ่อม) */}
          {aiInsight && selectedWOForAI && (
            <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 p-5 rounded-3xl text-white shadow-xl border border-[#D4AF37]/50 relative overflow-hidden mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-xl text-[#D4AF37]">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                    AI Maintenance Assistant • ระบบช่วยวินิจฉัยหน้างาน
                  </span>
                </div>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  วิเคราะห์สำหรับ {selectedWOForAI.machine_code}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                {/* Box 1: Probable Root Causes */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="text-[#D4AF37] font-bold flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    สาเหตุที่พบบ่อยในอดีต (Probable Causes)
                  </div>
                  <ul className="space-y-1 text-stone-200">
                    {aiInsight.suggestedRootCauses?.map((c: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Box 2: Suggested Spare Parts */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="text-[#D4AF37] font-bold flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    อะไหล่ที่แนะนำให้เตรียมไป (Recommended Parts)
                  </div>
                  {aiInsight.recommendedParts && aiInsight.recommendedParts.length > 0 ? (
                    <ul className="space-y-1 text-stone-200">
                      {aiInsight.recommendedParts.map((p: any, i: number) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="truncate">{p.name}</span>
                          <span className="text-amber-300 font-mono text-[10px] shrink-0 ml-1">เคยใช้ {p.count} ครั้ง</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-stone-400 text-[11px]">ยังไม่มีประวัติการใช้อะไหล่เฉพาะ</p>
                  )}
                </div>

                {/* Box 3: Safety & Inspection */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="text-rose-300 font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    ข้อควรระวังความปลอดภัย (Safety Note)
                  </div>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    {aiInsight.safetyPrecautions || 'ตัดไฟหลัก (LOTO) ก่อนเปิดฝาครอบเครื่องทุกครั้ง'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GROUP 2: PREVENTIVE MAINTENANCE SECTION */}
      {activeGroupTab === 'pm_plan' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-cyan-900 via-cyan-800 to-teal-900 p-5 rounded-3xl text-white shadow-xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-white/10 text-cyan-300">
                  <Calendar className="w-5 h-5" />
                </span>
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  แผนงานบำรุงรักษาเชิงป้องกัน (PM Plan) ประจำเดือนนี้
                </h3>
              </div>
              <p className="text-xs text-cyan-100/80">
                ระบบดึงรอบเครื่องจักรที่ต้องเข้าทำ PM ในเดือนปัจจุบัน (กันยายน 2026 - SEP) เพื่อให้ช่างเปิด E-Form ตรวจเช็คหน้างาน
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center">
                <span className="text-[10px] text-cyan-200 block uppercase font-bold">แผนเดือนนี้</span>
                <span className="text-xl font-black text-white font-mono">{currentMonthPMCount}</span>
              </div>
              <div className="h-7 w-[1px] bg-white/20"></div>
              <div className="text-center">
                <span className="text-[10px] text-cyan-200 block uppercase font-bold">ที่เลือกแสดง</span>
                <span className="text-xl font-black text-amber-300 font-mono">{filteredPMPlans.length}</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Search */}
            <div>
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                ค้นหารหัส / ชื่อเครื่อง / แผน
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="เช่น AFILL, AHU, MX..."
                  value={pmSearchQuery}
                  onChange={e => setPmSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs focus:bg-white focus:outline-none focus:border-cyan-600"
                />
              </div>
            </div>

            {/* Month Filter */}
            <div>
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                งวดเดือนปฏิบัติการ
              </label>
              <select
                value={pmMonthFilter}
                onChange={e => setPmMonthFilter(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800 focus:bg-white focus:outline-none focus:border-cyan-600"
              >
                <option value="SEP">📍 กันยายน (SEP - เดือนปัจจุบัน)</option>
                <option value="ALL">📅 ทั้งปี 2026 (ทุกเครื่องที่มีแผน PM)</option>
              </select>
            </div>

            {/* Dept Filter */}
            <div>
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                แผนก (Department)
              </label>
              <select
                value={pmDeptFilter}
                onChange={e => setPmDeptFilter(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 focus:bg-white focus:outline-none focus:border-cyan-600"
              >
                {pmDepartments.map(d => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? '🏢 ทุกแผนก (All Depts)' : `แผนก ${d}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Filter */}
            <div>
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                รอบความถี่ PM
              </label>
              <select
                value={pmFreqFilter}
                onChange={e => setPmFreqFilter(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 focus:bg-white focus:outline-none focus:border-cyan-600"
              >
                <option value="ALL">🔄 ทุกรอบความถี่</option>
                <option value="PM1">PM1 = ทุก 1 เดือน</option>
                <option value="PM2">PM2 = ทุก 2 เดือน</option>
                <option value="PM3">PM3 = ทุก 3 เดือน</option>
                <option value="PM4">PM4 = ทุก 4 เดือน</option>
                <option value="PM6">PM6 = ทุก 6 เดือน</option>
                <option value="PM12">PM12 = ทุก 12 เดือน</option>
              </select>
            </div>
          </div>

          {/* PM Plans Grid */}
          {filteredPMPlans.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-stone-400 space-y-2">
              <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-1" />
              <div className="font-bold text-stone-700 text-sm">ไม่พบรายการงาน PM ตามเงื่อนไขที่เลือก</div>
              <p className="text-xs text-stone-400">ลองเปลี่ยนตัวกรองเดือน แผนก หรือรอบความถี่</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPMPlans.map(plan => {
                const machine = (plan as any).machine
                const freq = getPmFrequencyInfo(plan.frequency_type, plan.frequency_interval)
                const checklistCount = Array.isArray(plan.checklist_template) ? plan.checklist_template.length : 0

                return (
                  <div
                    key={plan.id}
                    className="bg-white border-2 border-stone-200 hover:border-cyan-600 rounded-3xl p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                          {plan.plan_code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${freq.color}`}>
                          {freq.full}
                        </span>
                      </div>

                      {/* Machine Title */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-stone-900">{plan.machine_code}</span>
                          {machine?.criticality && (
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                              machine.criticality === 'A' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              Grade {machine.criticality}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-stone-800 line-clamp-1 mt-0.5">
                          {plan.machine_name}
                        </h4>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {machine?.department_code || 'ฝ่ายผลิต'} • {machine?.production_area || '-'}
                        </div>
                      </div>

                      {/* Checklist & Due Date info */}
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1.5 text-xs text-stone-600">
                        <div className="flex justify-between items-center">
                          <span className="text-stone-400">วันครบกำหนด:</span>
                          <span className="font-semibold font-mono text-stone-800">
                            {plan.next_due_date ? new Date(plan.next_due_date).toLocaleDateString('th-TH') : 'กันยายน 2026'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-stone-400">มาตรฐานตรวจเช็ค:</span>
                          <span className="font-semibold text-cyan-800 flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5" />
                            {checklistCount} รายการ ({plan.estimated_minutes || 60} นาที)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-stone-100 space-y-2">
                      <Button
                        onClick={() => setSelectedPlanForExecute(plan)}
                        className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs rounded-2xl h-11 shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>🚀</span>
                        <span>เริ่มตรวจเช็ค PM (E-Form)</span>
                      </Button>

                      <div className="flex items-center justify-between text-xs px-1">
                        <Link
                          href={`/maintenance/machines/${plan.machine_code}`}
                          className="text-stone-500 hover:text-stone-900 font-medium inline-flex items-center gap-1"
                        >
                          <span>ดูสเปก & ประวัติ 360°</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <span className="text-[11px] text-stone-400">
                          {plan.last_completed_at ? 'เคยทำแล้ว' : 'ยังไม่เคยทำในงวดนี้'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {partModalWO && (
        <SparePartUsageModal
          isOpen={!!partModalWO}
          onClose={() => setPartModalWO(null)}
          workOrderId={partModalWO.id}
          machineCode={partModalWO.machine_code}
          technicianName={technicianName}
          onPartUsed={loadJobs}
        />
      )}

      {completeModalData && (
        <CompleteRepairModal
          isOpen={!!completeModalData}
          onClose={() => setCompleteModalData(null)}
          workOrderId={completeModalData.wo.id}
          machineCode={completeModalData.wo.machine_code}
          machineName={completeModalData.wo.machine_name}
          technicianName={technicianName}
          targetStatus={completeModalData.targetStatus}
          onSuccess={loadJobs}
        />
      )}

      {verifyModalWO && (
        <ProductionVerifyModal
          isOpen={!!verifyModalWO}
          onClose={() => setVerifyModalWO(null)}
          workOrderId={verifyModalWO.id}
          machineCode={verifyModalWO.machine_code}
          machineName={verifyModalWO.machine_name}
          onSuccess={loadJobs}
        />
      )}

      {/* Waiting Part PR Prompt Modal */}
      {waitingPartModalWO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">ย้ายไปขั้นตอน "รออะไหล่"</h3>
                <span className="text-xs text-stone-500 font-mono">{waitingPartModalWO.wo_number} - {waitingPartModalWO.machine_code}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">เลขที่ใบขอซื้อ (PR Number) (ถ้ามี):</label>
                <Input
                  value={prNumber}
                  onChange={e => setPrNumber(e.target.value)}
                  placeholder="เช่น PR-6909-0012"
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">รายการอะไหล่หรือเหตุผลที่ต้องรอสั่งซื้อ:</label>
                <textarea
                  value={prReason}
                  onChange={e => setPrReason(e.target.value)}
                  rows={3}
                  placeholder="ระบุชื่ออะไหล่ สเปก หรือเหตุผล เช่น สายพานไทม์มิ่งขาด ไม่มีสต็อกสำรอง..."
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWaitingPartModalWO(null)}
                className="flex-1 text-xs rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmWaitingPart}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                ยืนยันย้ายไป "รออะไหล่"
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Execute PM Checksheet Modal (E-Form) */}
      {selectedPlanForExecute && (
        <ExecutePMChecksheetModal
          isOpen={!!selectedPlanForExecute}
          onClose={() => setSelectedPlanForExecute(null)}
          plan={selectedPlanForExecute}
          technicianName={technicianName}
          onSuccess={loadJobs}
        />
      )}
    </div>
  )
}
