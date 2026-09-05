'use client'

import React, { useState, useEffect } from 'react'
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
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { MaintenanceWorkOrder } from '@/types/maintenance'
import { 
  getWorkOrders, 
  transitionWorkOrderStatus, 
  getAISimilarFailures 
} from '@/app/actions/maintenance'
import SparePartUsageModal from '@/components/maintenance/SparePartUsageModal'
import CompleteRepairModal from '@/components/maintenance/CompleteRepairModal'
import ProductionVerifyModal from '@/components/maintenance/ProductionVerifyModal'

export default function TechnicianCockpitPage() {
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([])
  const [technicianName, setTechnicianName] = useState('ช่างสมหมาย เก่งการช่าง')
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [partModalWO, setPartModalWO] = useState<MaintenanceWorkOrder | null>(null)
  const [completeModalData, setCompleteModalData] = useState<{
    wo: MaintenanceWorkOrder
    targetStatus: 'TEST_RUN' | 'COMPLETED'
  } | null>(null)
  const [verifyModalWO, setVerifyModalWO] = useState<MaintenanceWorkOrder | null>(null)
  const [aiInsight, setAiInsight] = useState<any>(null)
  const [selectedWOForAI, setSelectedWOForAI] = useState<MaintenanceWorkOrder | null>(null)

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      const res = await getWorkOrders()
      if (res.success) {
        setWorkOrders(res.data)
        // Check if there's any active breakdown to load AI insight for
        const active = res.data.find(w => !['CLOSED', 'VERIFIED'].includes(w.status))
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
    const res = await transitionWorkOrderStatus({
      work_order_id: wo.id,
      to_status: 'WAITING_PART',
      changed_by_name: technicianName,
      notes: 'หยุดพักงานชั่วคราว รอเบิกหรือสั่งซื้ออะไหล่'
    })

    if (res.success) {
      toast.info(`ปรับสถานะเป็น WAITING PART สำหรับ ${wo.wo_number}`)
      loadJobs()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  // Filter groups
  const criticalJobs = workOrders.filter(w => w.priority === 'P1_CRITICAL' && !['CLOSED', 'VERIFIED'].includes(w.status))
  const inProgressJobs = workOrders.filter(w => ['IN_PROGRESS', 'WAITING_PART', 'TEST_RUN'].includes(w.status) && w.priority !== 'P1_CRITICAL')
  const newPendingJobs = workOrders.filter(w => ['NEW', 'ACKNOWLEDGED', 'ASSIGNED'].includes(w.status) && w.priority !== 'P1_CRITICAL')
  const recentlyCompleted = workOrders.filter(w => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(w.status)).slice(0, 5)

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
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

      {/* AI MAINTENANCE ASSISTANT PANEL */}
      {aiInsight && selectedWOForAI && (
        <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 p-5 rounded-3xl text-white shadow-xl border border-[#D4AF37]/50 relative overflow-hidden">
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

      {/* 1. CRITICAL BREAKDOWNS (P1) */}
      {criticalJobs.length > 0 && (
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

                {/* Status and Timer */}
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500">สถานะงาน:</span>
                    <span className="font-bold px-2 py-0.5 rounded bg-stone-900 text-white">
                      {wo.status}
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

                  {wo.status === 'ACKNOWLEDGED' && (
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
                        className="h-11 border-stone-300 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-100 flex items-center justify-center gap-1.5"
                      >
                        <Pause className="w-4 h-4" />
                        รออะไหล่
                      </Button>

                      <Button
                        onClick={() => setCompleteModalData({ wo, targetStatus: 'TEST_RUN' })}
                        className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <CheckSquare className="w-4 h-4" />
                        TEST RUN
                      </Button>

                      <Button
                        onClick={() => setCompleteModalData({ wo, targetStatus: 'COMPLETED' })}
                        className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        ซ่อมเสร็จ (COMPLETE)
                      </Button>
                    </>
                  )}
                </div>

                {/* Quick Link to Machine 360 */}
                <div className="flex justify-between items-center text-[11px] pt-2 border-t border-stone-100">
                  <span className="text-stone-400">ผู้แจ้ง: {wo.requester_name}</span>
                  <Link
                    href={`/maintenance/machines/${wo.machine_code}`}
                    className="text-[#8B7355] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    ดูประวัติเครื่อง 360°
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. MY IN-PROGRESS & WAITING JOBS */}
      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#D4AF37]" />
          งานที่กำลังดำเนินการ (In Progress & Waiting) ({inProgressJobs.length})
        </h3>

        {inProgressJobs.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center text-xs text-stone-400">
            ไม่มีงานที่กำลังซ่อมค้างอยู่
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressJobs.map(wo => (
              <div
                key={wo.id}
                className="bg-white border border-stone-200 hover:border-[#D4AF37] rounded-3xl p-5 shadow-sm space-y-3.5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      wo.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-900' :
                      wo.status === 'WAITING_PART' ? 'bg-orange-100 text-orange-900' :
                      'bg-indigo-100 text-indigo-900'
                    }`}>
                      {wo.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-stone-900 mt-1">{wo.machine_code} - {wo.machine_name}</h4>
                  <div className="text-xs text-stone-600 mt-0.5 font-medium">{wo.symptom_category}: {wo.symptom_description || 'ไม่มีรายละเอียด'}</div>

                  {wo.parts && wo.parts.length > 0 && (
                    <div className="mt-2.5 p-2 bg-stone-50 rounded-xl text-[11px] text-stone-600 space-y-0.5 border border-stone-200">
                      <span className="font-bold text-stone-700">อะไหล่ที่ใช้:</span>
                      {wo.parts.map((p: any) => (
                        <div key={p.id} className="flex justify-between">
                          <span>• {p.part_name}</span>
                          <span className="font-semibold">{p.quantity} {p.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setPartModalWO(wo)}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs rounded-xl"
                    >
                      <Package className="w-3.5 h-3.5 mr-1" />
                      + อะไหล่
                    </Button>

                    <Button
                      onClick={() => setCompleteModalData({ wo, targetStatus: 'TEST_RUN' })}
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                    >
                      TEST RUN
                    </Button>
                  </div>

                  <Button
                    onClick={() => setCompleteModalData({ wo, targetStatus: 'COMPLETED' })}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    บันทึกซ่อมเสร็จ (COMPLETE)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. NEW & PENDING JOBS */}
      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-stone-500" />
          งานรอรับใหม่ (New & Pending) ({newPendingJobs.length})
        </h3>

        {newPendingJobs.length === 0 ? (
          <div className="bg-white p-6 rounded-3xl border border-stone-200 text-center text-xs text-stone-400">
            ไม่มีงานรอรับใหม่ในขณะนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newPendingJobs.map(wo => (
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
                  className="w-full bg-[#2A2521] hover:bg-stone-800 text-white font-bold text-xs rounded-xl h-10"
                >
                  ACCEPT (รับงานนี้)
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. JOBS WAITING PRODUCTION VERIFY */}
      {workOrders.filter(w => w.status === 'COMPLETED' || w.status === 'TEST_RUN').length > 0 && (
        <div className="space-y-3 bg-amber-50/60 p-5 rounded-3xl border border-amber-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-amber-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-700" />
              งานรอฝ่ายผลิตทดสอบ & ยืนยันเครื่องพร้อมใช้งาน (Production Sign-Off)
            </h3>
            <span className="text-xs text-amber-700 font-semibold">คลิกเพื่อยืนยันผล</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workOrders.filter(w => w.status === 'COMPLETED' || w.status === 'TEST_RUN').map(wo => (
              <div key={wo.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</div>
                  <div className="font-bold text-stone-900 text-sm">{wo.machine_code} - {wo.machine_name}</div>
                  <div className="text-xs text-stone-500">สถานะ: <b className="text-indigo-700">{wo.status}</b></div>
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
    </div>
  )
}
