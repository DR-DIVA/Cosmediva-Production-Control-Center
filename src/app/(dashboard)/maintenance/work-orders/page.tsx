'use client'

import React, { useState, useEffect } from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import { 
  KanbanSquare, 
  Search, 
  Filter, 
  Clock, 
  AlertOctagon, 
  Flame, 
  Wrench, 
  User, 
  Calendar,
  Layers,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Plus,
  Play,
  Package,
  ShoppingCart,
  Pause,
  RotateCcw,
  Check,
  ChevronRight,
  ArrowRight,
  Timer,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'
import { MaintenanceWorkOrder, WorkOrderStatus, formatWorkOrderStatus, WORK_ORDER_STATUS_MAP, FACTORY_TECHNICIANS } from '@/types/maintenance'
import { getWorkOrders, transitionWorkOrderStatus } from '@/app/actions/maintenance'
import ProductionVerifyModal from '@/components/maintenance/ProductionVerifyModal'
import SparePartUsageModal from '@/components/maintenance/SparePartUsageModal'
import CompleteRepairModal from '@/components/maintenance/CompleteRepairModal'

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

/**
 * Format time gap between steps
 */
function formatGapDuration(diffMinutes: number): string {
  if (diffMinutes < 1) return '< 1 นาที'
  const days = Math.floor(diffMinutes / 1440)
  const hours = Math.floor((diffMinutes % 1440) / 60)
  const mins = diffMinutes % 60

  const parts = []
  if (days > 0) parts.push(`${days} วัน`)
  if (hours > 0) parts.push(`${hours} ชม.`)
  if (mins > 0 || (days === 0 && hours === 0)) parts.push(`${mins} นาที`)
  return parts.join(' ')
}

/**
 * Format Bangkok Thai timestamp
 */
function formatThaiDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const datePart = d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  })
  const timePart = d.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return `${datePart} ${timePart} น.`
}

interface WorkflowStep {
  id: string
  title: string
  status: WorkOrderStatus
  badgeColor: string
  timestamp: string
  actor: string
  notes?: string | null
  timeGapText?: string | null
  gapLabel?: string | null
}

function getWorkflowTimeline(wo: MaintenanceWorkOrder): WorkflowStep[] {
  const steps: WorkflowStep[] = []

  // Step 1: NEW (แจ้งซ่อม)
  steps.push({
    id: 'step-new',
    title: 'เปิดใบแจ้งซ่อมเข้าระบบ (New)',
    status: 'NEW',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    timestamp: wo.reported_at,
    actor: wo.requester_name ? `${wo.requester_name} (${wo.requester_department_name || 'ฝ่ายผู้แจ้ง'})` : 'ผู้แจ้งซ่อม',
    notes: wo.symptom_description || wo.symptom_category,
    timeGapText: null,
    gapLabel: null
  })

  // Status logs sorted by created_at ascending, filtering out redundant NEW log (which is already Step 1)
  // and deduplicating consecutive identical to_status
  const rawLogs = [...(wo.status_logs || [])]
    .filter(log => log.to_status !== 'NEW')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Deduplicate consecutive identical status logs
  const logs = rawLogs.filter((log, idx) => {
    if (idx === 0) return true
    return log.to_status !== rawLogs[idx - 1].to_status
  })

  let prevTime = new Date(wo.reported_at).getTime()

  logs.forEach((log, index) => {
    const curTime = new Date(log.created_at).getTime()
    const diffMins = Math.max(0, Math.round((curTime - prevTime) / 60000))
    prevTime = curTime

    let title = `เปลี่ยนสถานะเป็น ${formatWorkOrderStatus(log.to_status)}`
    let gapLabel = 'ระยะห่างจากขั้นตอนก่อนหน้า'

    if (log.to_status === 'ACKNOWLEDGED') {
      title = 'ช่างรับเรื่องเข้าระบบ (Acknowledged)'
      gapLabel = '⏱️ Response Time (ระยะเวลารับเรื่อง)'
    } else if (log.to_status === 'ASSIGNED') {
      title = 'มอบหมายงานให้ช่าง (Assigned)'
      gapLabel = '⏱️ Assignment Time (ระยะเวลามอบหมาย)'
    } else if (log.to_status === 'IN_PROGRESS') {
      title = 'ช่างเริ่มลงมือซ่อม (Start Repair)'
      gapLabel = '⏱️ Arrival & Start (ระยะเวลาเดินทางถึงเริ่มซ่อม)'
    } else if (log.to_status === 'WAITING_PART') {
      title = 'รออะไหล่ / เปิด PR สั่งซื้อ (Waiting Part)'
      gapLabel = '⏱️ เวลาซ่อมก่อนพบว่าต้องรออะไหล่'
    } else if (log.to_status === 'TEST_RUN') {
      title = 'ส่งทดสอบเดินเครื่อง (Test Run)'
      gapLabel = '⏱️ เวลาซ่อมจนส่งทดสอบ'
    } else if (log.to_status === 'COMPLETED') {
      title = 'ช่างซ่อมเสร็จสิ้น (Completed)'
      gapLabel = '⏱️ เวลาซ่อมทั้งหมด (Active Repair)'
    } else if (log.to_status === 'VERIFIED') {
      title = 'ผู้แจ้งซ่อมตรวจรับงาน (Verified)'
      gapLabel = '⏱️ เวลารอตรวจรับ'
    } else if (log.to_status === 'CLOSED') {
      title = 'ปิดงานเสร็จสมบูรณ์ (Closed)'
      gapLabel = '⏱️ เวลารอปิดงาน'
    }

    const badge = WORK_ORDER_STATUS_MAP[log.to_status]?.badge || 'bg-stone-100 text-stone-800'

    steps.push({
      id: log.id || `log-${index}`,
      title,
      status: log.to_status,
      badgeColor: badge,
      timestamp: log.created_at,
      actor: log.changed_by_name || 'ระบบ',
      notes: log.notes,
      timeGapText: formatGapDuration(diffMins),
      gapLabel
    })
  })

  // Fallback for legacy records without status_logs
  if (steps.length === 1) {
    if (wo.acknowledged_at) {
      const ackTime = new Date(wo.acknowledged_at).getTime()
      const diffMins = Math.max(0, Math.round((ackTime - prevTime) / 60000))
      prevTime = ackTime
      steps.push({
        id: 'fallback-ack',
        title: 'ช่างรับเรื่องเข้าระบบ (Acknowledged)',
        status: 'ACKNOWLEDGED',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        timestamp: wo.acknowledged_at,
        actor: wo.assigned_technician_name || 'ช่างซ่อมบำรุง',
        notes: 'รับเรื่องแจ้งซ่อมเข้าระบบ',
        timeGapText: formatGapDuration(diffMins),
        gapLabel: '⏱️ Response Time (ระยะเวลารับเรื่อง)'
      })
    }
    if (wo.repair_started_at) {
      const repTime = new Date(wo.repair_started_at).getTime()
      const diffMins = Math.max(0, Math.round((repTime - prevTime) / 60000))
      prevTime = repTime
      steps.push({
        id: 'fallback-inprogress',
        title: 'ช่างเริ่มลงมือซ่อม (Start Repair)',
        status: 'IN_PROGRESS',
        badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        timestamp: wo.repair_started_at,
        actor: wo.assigned_technician_name || 'ช่างซ่อมบำรุง',
        notes: 'ช่างเริ่มตรวจซ่อมและจับเวลา',
        timeGapText: formatGapDuration(diffMins),
        gapLabel: '⏱️ Arrival & Start (ระยะเวลาเดินทางถึงเริ่มซ่อม)'
      })
    }
    if (wo.repair_completed_at) {
      const compTime = new Date(wo.repair_completed_at).getTime()
      const diffMins = Math.max(0, Math.round((compTime - prevTime) / 60000))
      prevTime = compTime
      steps.push({
        id: 'fallback-completed',
        title: 'ช่างซ่อมเสร็จสิ้น (Completed)',
        status: 'COMPLETED',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        timestamp: wo.repair_completed_at,
        actor: wo.assigned_technician_name || 'ช่างซ่อมบำรุง',
        notes: wo.corrective_action || 'ซ่อมแซมเสร็จสิ้น',
        timeGapText: formatGapDuration(diffMins),
        gapLabel: '⏱️ เวลาซ่อมทั้งหมด (Active Repair)'
      })
    }
  }

  return steps
}

const KANBAN_COLUMNS: { id: WorkOrderStatus; title: string; color: string; badge: string }[] = [
  { id: 'NEW', title: 'แจ้งใหม่ (New)', color: 'border-t-rose-500', badge: 'bg-rose-100 text-rose-800' },
  { id: 'ACKNOWLEDGED', title: 'ช่างรับเรื่องแล้ว (Ack)', color: 'border-t-amber-500', badge: 'bg-amber-100 text-amber-800' },
  { id: 'ASSIGNED', title: 'มอบหมาย (Assigned)', color: 'border-t-blue-500', badge: 'bg-blue-100 text-blue-800' },
  { id: 'IN_PROGRESS', title: 'กำลังซ่อม (In Progress)', color: 'border-t-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
  { id: 'WAITING_PART', title: 'รออะไหล่ (Waiting Part)', color: 'border-t-orange-500', badge: 'bg-orange-100 text-orange-800' },
  { id: 'TEST_RUN', title: 'ทดสอบเครื่อง (Test Run)', color: 'border-t-purple-500', badge: 'bg-purple-100 text-purple-800' },
  { id: 'COMPLETED', title: 'ช่างซ่อมเสร็จ (Completed)', color: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'VERIFIED', title: 'ผู้แจ้งตรวจรับ (Verified)', color: 'border-t-teal-500', badge: 'bg-teal-100 text-teal-800' },
  { id: 'CLOSED', title: 'ปิดงาน (Closed)', color: 'border-t-stone-500', badge: 'bg-stone-100 text-stone-800' }
]

export default function WorkOrdersKanbanPage() {
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([])
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWOForVerify, setSelectedWOForVerify] = useState<MaintenanceWorkOrder | null>(null)
  const [detailWO, setDetailWO] = useState<MaintenanceWorkOrder | null>(null)
  const [assignTechName, setAssignTechName] = useState('')
  const [isCustomTech, setIsCustomTech] = useState(false)
  
  // Collapsible time control (Default is collapsed to keep cards clean and prevent pressure for technicians)
  const [showAllTimes, setShowAllTimes] = useState(false)
  const [expandedTimeCardIds, setExpandedTimeCardIds] = useState<Set<string>>(new Set())

  const toggleCardTime = (woId: string) => {
    setExpandedTimeCardIds(prev => {
      const next = new Set(prev)
      if (next.has(woId)) {
        next.delete(woId)
      } else {
        next.add(woId)
      }
      return next
    })
  }

  // Live timer ticking every second
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  // Technician action modal states
  const [partModalWO, setPartModalWO] = useState<MaintenanceWorkOrder | null>(null)
  const [completeModalData, setCompleteModalData] = useState<{
    wo: MaintenanceWorkOrder
    targetStatus: 'TEST_RUN' | 'COMPLETED'
  } | null>(null)
  const [waitingPartModalWO, setWaitingPartModalWO] = useState<MaintenanceWorkOrder | null>(null)
  const [prNumber, setPrNumber] = useState('')
  const [prReason, setPrReason] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchWOs = async () => {
    setIsLoading(true)
    try {
      const res = await getWorkOrders({
        priority: priorityFilter,
        search: search
      })
      if (res.success) {
        setWorkOrders(res.data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDetailWO = async (woId: string) => {
    const res = await getWorkOrders({
      priority: priorityFilter,
      search: search
    })
    if (res.success) {
      setWorkOrders(res.data)
      const updated = res.data.find(w => w.id === woId)
      if (updated) {
        setDetailWO(updated)
      }
    }
  }

  useEffect(() => {
    fetchWOs()
  }, [priorityFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchWOs()
  }

  const handleAssignTechnician = async () => {
    if (!detailWO || !assignTechName.trim()) return
    const res = await transitionWorkOrderStatus({
      work_order_id: detailWO.id,
      to_status: 'ASSIGNED',
      assigned_technician_name: assignTechName.trim(),
      changed_by_name: assignTechName.trim(),
      notes: `มอบหมายงานให้ ${assignTechName.trim()} รับผิดชอบ`
    })
    if (res.success) {
      toast.success(`มอบหมายงาน ${detailWO.wo_number} ให้ ${assignTechName} สำเร็จ!`)
      refreshDetailWO(detailWO.id)
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการมอบหมายงาน')
    }
  }

  const handleStartRepairFromModal = async () => {
    if (!detailWO) return
    const tech = detailWO.assigned_technician_name || assignTechName.trim() || 'ช่างซ่อมบำรุง'
    const res = await transitionWorkOrderStatus({
      work_order_id: detailWO.id,
      to_status: 'IN_PROGRESS',
      assigned_technician_name: tech,
      changed_by_name: tech,
      notes: `${tech} เริ่มดำเนินการตรวจซ่อม`
    })
    if (res.success) {
      toast.success(`เริ่มงานซ่อม ${detailWO.wo_number} แล้ว! ระบบเริ่มจับเวลา Downtime`)
      refreshDetailWO(detailWO.id)
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  const handleConfirmWaitingPart = async () => {
    if (!waitingPartModalWO) return
    const tech = waitingPartModalWO.assigned_technician_name || 'ช่างซ่อมบำรุง'
    const noteText = prNumber.trim() 
      ? `รออะไหล่: เปิด PR เลขที่ ${prNumber.trim()} (${prReason.trim() || 'รอจัดซื้อจัดส่ง'})`
      : `รออะไหล่: ${prReason.trim() || 'ไม่มีอะไหล่ในสต็อก ต้องเปิด PR ขอซื้อ'}`
    
    const res = await transitionWorkOrderStatus({
      work_order_id: waitingPartModalWO.id,
      to_status: 'WAITING_PART',
      changed_by_name: tech,
      notes: noteText
    })

    if (res.success) {
      toast.warning(`ย้าย ${waitingPartModalWO.wo_number} ไปคอลัมน์ "รออะไหล่ (Waiting Part)" สำเร็จ`)
      const woId = waitingPartModalWO.id
      setWaitingPartModalWO(null)
      setPrNumber('')
      setPrReason('')
      refreshDetailWO(woId)
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการปรับสถานะ')
    }
  }

  const handleResumeRepair = async (wo: MaintenanceWorkOrder) => {
    const tech = wo.assigned_technician_name || 'ช่างซ่อมบำรุง'
    const res = await transitionWorkOrderStatus({
      work_order_id: wo.id,
      to_status: 'IN_PROGRESS',
      changed_by_name: tech,
      notes: `${tech} ได้รับอะไหล่เรียบร้อย เริ่มดำเนินการซ่อมต่อ`
    })

    if (res.success) {
      toast.success(`เริ่มงานซ่อม ${wo.wo_number} ต่อแล้ว! การ์ดเลื่อนมาที่ "กำลังซ่อม"`)
      refreshDetailWO(wo.id)
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  const handleFailTestRun = async (wo: MaintenanceWorkOrder) => {
    const tech = wo.assigned_technician_name || 'ช่างซ่อมบำรุง'
    const res = await transitionWorkOrderStatus({
      work_order_id: wo.id,
      to_status: 'IN_PROGRESS',
      changed_by_name: tech,
      notes: `${tech} บันทึก: ทดสอบเครื่องไม่ผ่าน นำกลับมาตรวจสอบและซ่อมบำรุงต่อ`
    })

    if (res.success) {
      toast.info(`ส่ง ${wo.wo_number} กลับไปตรวจซ่อมต่อ`)
      refreshDetailWO(wo.id)
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0">
      <MaintenanceHeader />

      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-purple-900 text-purple-200 flex items-center justify-center font-bold">
            <KanbanSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-stone-900">ศูนย์ควบคุมงานซ่อม (Kanban Hub)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                สำหรับหัวหน้างาน & ฝ่ายผลิต
              </span>
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              หอบังคับการติดตาม Pipeline 9 ขั้นตอน Real-Time และกระจายงานให้ช่าง
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นเลขที่ใบสั่ง, เครื่อง..."
              className="pl-9 h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
            />
          </form>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-xl text-xs font-bold bg-stone-50 border border-stone-200 text-stone-700"
          >
            <option value="all">ทุกระดับ Priority</option>
            <option value="P1_CRITICAL">🚨 P1 CRITICAL</option>
            <option value="P2_HIGH">P2 HIGH</option>
            <option value="P3_NORMAL">P3 NORMAL</option>
            <option value="P4_LOW">P4 LOW</option>
          </select>

          {/* Board-level time visibility toggle button */}
          <button
            type="button"
            onClick={() => {
              if (showAllTimes) {
                setShowAllTimes(false)
                setExpandedTimeCardIds(new Set())
              } else {
                setShowAllTimes(true)
              }
            }}
            className={`h-10 px-3 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              showAllTimes 
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs' 
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
            }`}
            title={showAllTimes ? 'คลิกเพื่อย่อ/ซ่อนเวลาบนการ์ดทั้งหมด (ช่างสบายตา)' : 'คลิกเพื่อกางดูเวลาบนการ์ดทุกใบ'}
          >
            <Timer className={`w-3.5 h-3.5 ${showAllTimes ? 'text-amber-800' : 'text-stone-500'}`} />
            <span>{showAllTimes ? 'ซ่อนเวลา (สบายตา)' : 'กางดูเวลาทุกใบ'}</span>
          </button>

          <Button
            onClick={fetchWOs}
            variant="outline"
            size="sm"
            className="h-10 px-3 text-xs border-stone-200 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Link
            href="/maintenance/technician"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs transition-colors"
            title="สำหรับช่างประจำกะลงมือซ่อมจริง & จับเวลา"
          >
            <span>📱 สำหรับช่างซ่อม (My Tasks)</span>
          </Link>

          <Link
            href="/maintenance/report"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            แจ้งซ่อมด่วน
          </Link>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="overflow-x-auto pb-6 no-scrollbar">
        <div className="flex gap-3.5 min-w-[2100px]">
          {KANBAN_COLUMNS.map(col => {
            const colJobs = workOrders.filter(w => w.status === col.id)

            return (
              <div
                key={col.id}
                className="w-[230px] shrink-0 bg-stone-100/80 rounded-2xl p-3 flex flex-col max-h-[750px] border border-stone-200"
              >
                {/* Column Header */}
                <div className={`p-2.5 bg-white rounded-xl shadow-xs border-t-4 ${col.color} flex items-center justify-between mb-3`}>
                  <span className="font-extrabold text-xs text-stone-800 tracking-tight">{col.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${col.badge}`}>
                    {colJobs.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 no-scrollbar">
                  {colJobs.length === 0 ? (
                    <div className="text-center py-10 text-[11px] text-stone-400 font-medium">
                      ไม่มีงานในขั้นตอนนี้
                    </div>
                  ) : (
                      colJobs.map(wo => {
                        const isCritical = wo.priority === 'P1_CRITICAL'
                        const isTimeExpanded = showAllTimes || expandedTimeCardIds.has(wo.id)

                        return (
                          <div
                            key={wo.id}
                            onClick={() => {
                              setDetailWO(wo)
                              const currentTech = wo.assigned_technician_name || ''
                              setAssignTechName(currentTech)
                              setIsCustomTech(
                                !!currentTech && 
                                !FACTORY_TECHNICIANS.some(t => t.startsWith(currentTech))
                              )
                            }}
                            className={`p-3.5 rounded-xl border bg-white shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2 relative ${
                              isCritical
                                ? 'border-red-500 ring-2 ring-red-500/20'
                                : 'border-stone-200 hover:border-[#D4AF37]'
                            }`}
                          >
                            {/* Priority badge & WO Number */}
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                isCritical ? 'bg-red-600 text-white animate-pulse' :
                                wo.priority === 'P2_HIGH' ? 'bg-amber-100 text-amber-800' :
                                'bg-stone-100 text-stone-600'
                              }`}>
                                {wo.priority}
                              </span>
                              <span className="font-mono text-[10px] text-stone-400 font-bold">{wo.wo_number}</span>
                            </div>

                            {/* Machine & Symptom */}
                            <div>
                              <div className="text-xs font-black text-stone-900 line-clamp-1">{wo.machine_code}</div>
                              <div className="text-[11px] text-stone-600 font-medium line-clamp-1">{wo.symptom_category}</div>
                            </div>

                            {/* Compact Status Bar & Time Toggle Header */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-100">
                              {wo.status === 'IN_PROGRESS' ? (
                                <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  กำลังซ่อม
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-500 font-medium">
                                  {wo.total_downtime_minutes > 0 ? `Downtime: ${wo.total_downtime_minutes} นาที` : (
                                    ['CLOSED', 'VERIFIED'].includes(wo.status) ? 'ซ่อมเสร็จสิ้น' :
                                    `แจ้ง ${new Date(wo.reported_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                                  )}
                                </span>
                              )}

                              {/* Collapsible toggle button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleCardTime(wo.id)
                                }}
                                className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                                  isTimeExpanded 
                                    ? 'bg-amber-100 text-amber-900' 
                                    : 'text-stone-400 hover:text-amber-800 hover:bg-stone-100'
                                }`}
                                title={isTimeExpanded ? 'คลิกเพื่อย่อเก็บเวลา' : 'คลิกเพื่อกางดูเวลาและไทม์ไลน์'}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>{isTimeExpanded ? 'ซ่อนเวลา' : 'ดูเวลา'}</span>
                                {isTimeExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                              </button>
                            </div>

                            {/* Expandable Section: Live Timer & Mini Flow Milestones */}
                            {isTimeExpanded && (
                              <div className="space-y-2 pt-1 border-t border-amber-100 animate-in fade-in slide-in-from-top-1 duration-150">
                                {/* Live Timer or Downtime Badge */}
                                {wo.status === 'IN_PROGRESS' ? (
                                  <div className="bg-amber-50 rounded-xl p-2 border border-amber-300 space-y-1">
                                    <div className="flex items-center justify-between text-amber-950 font-bold text-[11px]">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                        กำลังซ่อม:
                                      </span>
                                      <span className="font-mono font-extrabold text-emerald-700">
                                        {wo.repair_started_at ? formatElapsedDuration(currentTime - new Date(wo.repair_started_at).getTime()) : 'เพิ่งเริ่ม'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5 border-t border-amber-200/60">
                                      <span>Downtime สะสม:</span>
                                      <span className="font-mono font-bold text-red-600">
                                        {formatElapsedDuration(currentTime - new Date(wo.reported_at).getTime())}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10px] bg-stone-50 p-1.5 rounded-lg border border-stone-200 flex items-center justify-between">
                                    <span className="text-stone-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-red-500" />
                                      {wo.total_downtime_minutes > 0 ? `${wo.total_downtime_minutes} นาที` : (
                                        ['CLOSED', 'VERIFIED'].includes(wo.status) ? 'เสร็จสิ้น' :
                                        formatElapsedDuration(currentTime - new Date(wo.reported_at).getTime())
                                      )}
                                    </span>
                                    <span className="text-stone-700 font-bold">
                                      ฿{Number(wo.total_part_cost || 0).toLocaleString()}
                                    </span>
                                  </div>
                                )}

                                {/* Mini Flow Milestones & Time Gaps on Card */}
                                <div className="flex flex-wrap items-center gap-1 text-[9px] text-stone-500">
                                  <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                    1.แจ้ง: {new Date(wo.reported_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {wo.acknowledged_at && (
                                    <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                      2.รับ: {new Date(wo.acknowledged_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                      {wo.reported_at && (
                                        <span className="text-amber-950 font-black ml-0.5">
                                          (+{Math.max(0, Math.round((new Date(wo.acknowledged_at).getTime() - new Date(wo.reported_at).getTime()) / 60000))}น.)
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {wo.repair_started_at && (
                                    <span className="bg-yellow-50 text-yellow-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                      3.ซ่อม: {new Date(wo.repair_started_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                      {wo.acknowledged_at && (
                                        <span className="text-yellow-950 font-black ml-0.5">
                                          (+{Math.max(0, Math.round((new Date(wo.repair_started_at).getTime() - new Date(wo.acknowledged_at).getTime()) / 60000))}น.)
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {wo.repair_completed_at && (
                                    <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                      4.เสร็จ: {new Date(wo.repair_completed_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                      {wo.repair_started_at && (
                                        <span className="text-emerald-950 font-black ml-0.5">
                                          (+{Math.max(0, Math.round((new Date(wo.repair_completed_at).getTime() - new Date(wo.repair_started_at).getTime()) / 60000))}น.)
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Technician */}
                          <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
                            <span className="truncate max-w-[120px] font-medium text-stone-600">{wo.assigned_technician_name || 'ยังไม่กำหนดช่าง'}</span>
                            <span>{new Date(wo.reported_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                          </div>

                          {/* Quick Verify button for Test Run & Completed */}
                          {(wo.status === 'COMPLETED' || wo.status === 'TEST_RUN') && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedWOForVerify(wo)
                              }}
                              size="sm"
                              className="w-full h-7 text-[10px] font-bold bg-[#D4AF37] hover:bg-amber-600 text-stone-900 rounded-lg mt-1"
                            >
                              Verify เครื่อง
                            </Button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Work Order Detail Drawer / Modal */}
      {detailWO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-xs font-bold text-stone-400">{detailWO.wo_number}</span>
                <h3 className="text-xl font-black text-stone-900">{detailWO.machine_code} - {detailWO.machine_name}</h3>
                <div className="text-xs text-stone-500 mt-0.5">
                  ผู้แจ้ง: <span className="font-bold text-stone-800">{detailWO.requester_name}</span> ({detailWO.requester_department_name})
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${
                detailWO.priority === 'P1_CRITICAL' ? 'bg-red-600 text-white animate-pulse' :
                detailWO.priority === 'P2_HIGH' ? 'bg-amber-100 text-amber-900' :
                'bg-stone-100 text-stone-800'
              }`}>
                {detailWO.priority}
              </span>
            </div>

            {/* LIVE RUNNING TIMER BANNER (เมื่อสถานะ IN_PROGRESS) */}
            {detailWO.status === 'IN_PROGRESS' && (
              <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 p-4 rounded-2xl text-stone-950 shadow-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-950">กำลังดำเนินการซ่อมบำรุง & นับเวลาสด</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-xs">
                    {detailWO.repair_started_at 
                      ? formatElapsedDuration(currentTime - new Date(detailWO.repair_started_at).getTime())
                      : '0 วินาที'}
                  </div>
                  <div className="text-[11px] text-amber-950/90 font-medium">
                    รวม Downtime ตั้งแต่แจ้ง: <span className="font-mono font-black">{formatElapsedDuration(currentTime - new Date(detailWO.reported_at).getTime())}</span>
                  </div>
                </div>
                <div className="text-4xl opacity-50">⏱️</div>
              </div>
            )}

            {/* General Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block text-[11px]">สถานะปัจจุบัน:</span>
                <span className={`inline-flex items-center px-2 py-0.5 mt-0.5 rounded-full text-[11px] font-extrabold border ${WORK_ORDER_STATUS_MAP[detailWO.status]?.badge || 'bg-stone-100 text-stone-900 border-stone-300'}`}>
                  {formatWorkOrderStatus(detailWO.status)}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Downtime รวม:</span>
                <span className="font-bold text-red-600 font-mono">
                  {detailWO.status === 'IN_PROGRESS' 
                    ? formatElapsedDuration(currentTime - new Date(detailWO.reported_at).getTime())
                    : `${detailWO.total_downtime_minutes} นาที`}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">อาการที่แจ้ง:</span>
                <span className="font-semibold text-stone-800 line-clamp-1">{detailWO.symptom_category}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">ช่างผู้รับผิดชอบ:</span>
                <span className="font-semibold text-stone-800 line-clamp-1">{detailWO.assigned_technician_name || 'ยังไม่กำหนด'}</span>
              </div>
            </div>

            {detailWO.symptom_description && (
              <div className="text-xs text-stone-700 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50">
                <b>รายละเอียด:</b> {detailWO.symptom_description}
              </div>
            )}

            {/* Spare Parts List */}
            {detailWO.parts && detailWO.parts.length > 0 && (
              <div className="text-xs space-y-1.5 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <b className="text-stone-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    อะไหล่ที่ตัดใช้ในงานนี้ ({detailWO.parts.length} รายการ):
                  </b>
                  <span className="font-mono font-bold text-stone-700">
                    รวม: ฿{Number(detailWO.total_part_cost || 0).toLocaleString()}
                  </span>
                </div>
                {detailWO.parts.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-white rounded-lg border border-stone-200 text-[11px]">
                    <div>
                      <span className="font-bold text-stone-900">{p.part_name}</span>
                      <span className="text-stone-400 ml-1 font-mono">({p.part_code})</span>
                    </div>
                    <span className="font-mono font-bold text-stone-700">
                      {p.quantity} {p.unit} (฿{Number(p.total_cost).toLocaleString()})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TECHNICIAN ACTION BAR BASED ON STAGES */}
            {['NEW', 'ACKNOWLEDGED', 'ASSIGNED'].includes(detailWO.status) && (
              <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                  <span>⚡ จัดการฝ่ายช่าง (Technician Actions)</span>
                  <Link
                    href="/maintenance/technician"
                    className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Wrench className="w-3 h-3" />
                    เปิดโหมดช่าง 📱
                  </Link>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <select
                        value={isCustomTech ? '__CUSTOM__' : assignTechName}
                        onChange={e => {
                          const val = e.target.value
                          if (val === '__CUSTOM__') {
                            setIsCustomTech(true)
                          } else {
                            setIsCustomTech(false)
                            setAssignTechName(val)
                          }
                        }}
                        className="text-xs w-full bg-transparent border-none outline-none font-bold text-stone-800 cursor-pointer"
                      >
                        <option value="">-- เลือกรายชื่อช่างผู้รับผิดชอบ --</option>
                        {FACTORY_TECHNICIANS.map(t => {
                          const cleanName = t.split(' (')[0]
                          return (
                            <option key={t} value={cleanName}>
                              {t}
                            </option>
                          )
                        })}
                        <option value="__CUSTOM__">✍️ ระบุชื่อช่างคนอื่น / ซัพพลายเออร์เอง...</option>
                      </select>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleAssignTechnician}
                      disabled={!assignTechName.trim()}
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl whitespace-nowrap shadow-xs"
                    >
                      มอบหมายช่าง (Assign)
                    </Button>
                  </div>

                  {isCustomTech && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-300 shadow-2xs">
                      <input
                        type="text"
                        autoFocus
                        placeholder="พิมพ์ชื่อช่างผู้รับผิดชอบ..."
                        value={assignTechName}
                        onChange={e => setAssignTechName(e.target.value)}
                        className="text-xs w-full bg-transparent border-none outline-none font-medium text-stone-800"
                      />
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={handleStartRepairFromModal}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  START REPAIR (เริ่มซ่อม & จับเวลาทันที)
                </Button>
              </div>
            )}

            {/* TECHNICIAN ACTION BAR FOR IN_PROGRESS */}
            {detailWO.status === 'IN_PROGRESS' && (
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-600" />
                    ทางเลือกการดำเนินการของช่าง (Next Steps)
                  </span>
                  <Link
                    href="/maintenance/technician"
                    className="text-[11px] text-amber-800 hover:underline flex items-center gap-1 font-semibold"
                  >
                    เปิดในโหมดช่าง 🔧
                  </Link>
                </div>

                {/* Question 3: มีอะไหล่พร้อมซ่อม vs ไม่มีอะไหล่เปิด PR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => setPartModalWO(detailWO)}
                    className="h-10 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-4 h-4" />
                    + มีอะไหล่ ตัดสต็อกทันที
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setWaitingPartModalWO(detailWO)
                      setPrNumber('')
                      setPrReason('')
                    }}
                    variant="outline"
                    className="h-10 border-orange-300 text-orange-800 hover:bg-orange-100 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                    ไม่มีอะไหล่ / เปิด PR (รออะไหล่)
                  </Button>
                </div>

                {/* Question 4: ส่งทดสอบเครื่อง (TEST RUN) หรือ ซ่อมเสร็จสมบูรณ์ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                  <Button
                    type="button"
                    onClick={() => setCompleteModalData({ wo: detailWO, targetStatus: 'TEST_RUN' })}
                    className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4" />
                    ส่งทดสอบเครื่อง (TEST RUN)
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setCompleteModalData({ wo: detailWO, targetStatus: 'COMPLETED' })}
                    className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ซ่อมเสร็จสมบูรณ์ (COMPLETED)
                  </Button>
                </div>
              </div>
            )}

            {/* WAITING_PART ACTIONS */}
            {detailWO.status === 'WAITING_PART' && (
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                    สถานะ: อยู่ระหว่างรออะไหล่ / ขอซื้อ PR
                  </span>
                  <span className="text-[10px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-bold">
                    PAUSED
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => setPartModalWO(detailWO)}
                    variant="outline"
                    className="h-10 text-xs font-bold border-orange-300 text-orange-900 hover:bg-orange-100 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-4 h-4" />
                    + ตัดใช้อะไหล่ที่รับเข้า
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleResumeRepair(detailWO)}
                    className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    ได้รับอะไหล่แล้ว เริ่มซ่อมต่อ ▶️
                  </Button>
                </div>
              </div>
            )}

            {/* TEST_RUN ACTIONS */}
            {detailWO.status === 'TEST_RUN' && (
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    อยู่ระหว่างทดสอบเดินเครื่อง (Test Run)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => handleFailTestRun(detailWO)}
                    variant="outline"
                    className="h-10 text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-100 rounded-xl"
                  >
                    ↩️ ทดสอบไม่ผ่าน ซ่อมต่อ
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCompleteModalData({ wo: detailWO, targetStatus: 'COMPLETED' })}
                    className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ทดสอบผ่าน / ซ่อมเสร็จสิ้น
                  </Button>
                </div>
              </div>
            )}

            {/* COMPLETED ACTIONS */}
            {detailWO.status === 'COMPLETED' && (
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">ช่างซ่อมเสร็จสิ้นแล้ว</span>
                  <span className="text-[11px] text-emerald-700">รอผู้แจ้งซ่อมทดสอบเครื่องและเซ็นรับมอบงาน</span>
                </div>
                <Button
                  onClick={() => setSelectedWOForVerify(detailWO)}
                  size="sm"
                  className="bg-[#D4AF37] hover:bg-amber-600 text-stone-900 font-extrabold text-xs rounded-xl shadow-xs"
                >
                  ผู้แจ้งตรวจรับงาน (Verify)
                </Button>
              </div>
            )}

            {/* KANBAN LIFECYCLE AUDIT TRAIL & TIME GAPS (Log วันเวลาของการไหลมาของ Kanban) */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <KanbanSquare className="w-4 h-4 text-[#D4AF37]" />
                  ไทม์ไลน์การไหลของงาน (Kanban Lifecycle & Time Gaps)
                </h4>
                <span className="text-[10px] text-stone-500 font-medium">บันทึกเวลาจริงทุกขั้นตอน</span>
              </div>

              <div className="space-y-3 pt-1">
                {getWorkflowTimeline(detailWO).map((step, idx, arr) => (
                  <div key={step.id} className="relative flex items-start gap-3 text-xs">
                    {/* Step circle indicator */}
                    <div className="relative flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        idx === arr.length - 1 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="w-0.5 h-full min-h-[36px] bg-stone-200 mt-1" />
                      )}
                    </div>

                    {/* Step details */}
                    <div className="flex-1 pb-3 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-stone-900">{step.title}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${step.badgeColor}`}>
                            {formatWorkOrderStatus(step.status)}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-stone-600">
                          {formatThaiDateTime(step.timestamp)}
                        </span>
                      </div>

                      {/* Time gap indicator */}
                      {step.timeGapText && (
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200 text-[10px] font-bold">
                          <span>{step.gapLabel}:</span>
                          <span className="font-mono text-amber-950 font-black">+{step.timeGapText}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-stone-500">
                        ผู้ดำเนินการ: <span className="font-semibold text-stone-700">{step.actor}</span>
                        {step.notes && <span className="text-stone-600 ml-1">({step.notes})</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Root Cause & Corrective Action if recorded */}
            {detailWO.root_cause && (
              <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <div><b>สาเหตุหลัก (Root Cause):</b> {detailWO.root_cause}</div>
                <div><b>การแก้ไข (Action):</b> {detailWO.corrective_action || '-'}</div>
                {detailWO.preventive_recommendation && (
                  <div><b>ข้อเสนอแนะ:</b> {detailWO.preventive_recommendation}</div>
                )}
              </div>
            )}

            {/* Modal Bottom Footer Actions */}
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailWO(null)}
                className="flex-1 text-xs h-9 rounded-xl"
              >
                ปิดหน้าต่าง
              </Button>
              <Link
                href={`/maintenance/work-orders/${detailWO.wo_number}/eform`}
                target="_blank"
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-[#D4AF37] hover:bg-amber-400 text-stone-900 rounded-xl transition shadow-xs h-9"
              >
                <span>📄 ออกใบแจ้งซ่อม DCC</span>
              </Link>
              <Link
                href={`/maintenance/machines/${detailWO.machine_code}`}
                className="flex-1 inline-flex items-center justify-center text-xs font-bold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition h-9"
              >
                ดูประวัติ 360°
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Spare Part Usage Modal */}
      {partModalWO && (
        <SparePartUsageModal
          isOpen={!!partModalWO}
          onClose={() => setPartModalWO(null)}
          workOrderId={partModalWO.id}
          machineCode={partModalWO.machine_code}
          technicianName={partModalWO.assigned_technician_name || 'ช่างซ่อมบำรุง'}
          onPartUsed={() => {
            if (partModalWO) refreshDetailWO(partModalWO.id)
            fetchWOs()
          }}
        />
      )}

      {/* Complete Repair Modal (for TEST_RUN or COMPLETED) */}
      {completeModalData && (
        <CompleteRepairModal
          isOpen={!!completeModalData}
          onClose={() => setCompleteModalData(null)}
          workOrderId={completeModalData.wo.id}
          machineCode={completeModalData.wo.machine_code}
          machineName={completeModalData.wo.machine_name}
          technicianName={completeModalData.wo.assigned_technician_name || 'ช่างซ่อมบำรุง'}
          targetStatus={completeModalData.targetStatus}
          onSuccess={() => {
            const woId = completeModalData.wo.id
            setCompleteModalData(null)
            refreshDetailWO(woId)
            fetchWOs()
          }}
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

      {/* Production Verify Modal */}
      {selectedWOForVerify && (
        <ProductionVerifyModal
          isOpen={!!selectedWOForVerify}
          onClose={() => setSelectedWOForVerify(null)}
          workOrderId={selectedWOForVerify.id}
          machineCode={selectedWOForVerify.machine_code}
          machineName={selectedWOForVerify.machine_name}
          onSuccess={fetchWOs}
        />
      )}
    </div>
  )
}
