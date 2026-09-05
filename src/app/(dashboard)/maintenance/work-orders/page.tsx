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
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'
import { MaintenanceWorkOrder, WorkOrderStatus } from '@/types/maintenance'
import { getWorkOrders, transitionWorkOrderStatus } from '@/app/actions/maintenance'
import ProductionVerifyModal from '@/components/maintenance/ProductionVerifyModal'

const KANBAN_COLUMNS: { id: WorkOrderStatus; title: string; color: string; badge: string }[] = [
  { id: 'NEW', title: 'แจ้งใหม่ (New)', color: 'border-t-rose-500', badge: 'bg-rose-100 text-rose-800' },
  { id: 'ACKNOWLEDGED', title: 'รับทราบ (Ack)', color: 'border-t-amber-500', badge: 'bg-amber-100 text-amber-800' },
  { id: 'ASSIGNED', title: 'มอบหมาย (Assigned)', color: 'border-t-blue-500', badge: 'bg-blue-100 text-blue-800' },
  { id: 'IN_PROGRESS', title: 'กำลังซ่อม (In Progress)', color: 'border-t-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
  { id: 'WAITING_PART', title: 'รออะไหล่ (Waiting Part)', color: 'border-t-orange-500', badge: 'bg-orange-100 text-orange-800' },
  { id: 'TEST_RUN', title: 'ทดสอบเครื่อง (Test Run)', color: 'border-t-purple-500', badge: 'bg-purple-100 text-purple-800' },
  { id: 'COMPLETED', title: 'ช่างซ่อมเสร็จ (Completed)', color: 'border-t-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'VERIFIED', title: 'ผลิตยืนยัน (Verified)', color: 'border-t-teal-500', badge: 'bg-teal-100 text-teal-800' },
  { id: 'CLOSED', title: 'ปิดงาน (Closed)', color: 'border-t-stone-500', badge: 'bg-stone-100 text-stone-800' }
]

export default function WorkOrdersKanbanPage() {
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([])
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWOForVerify, setSelectedWOForVerify] = useState<MaintenanceWorkOrder | null>(null)
  const [detailWO, setDetailWO] = useState<MaintenanceWorkOrder | null>(null)

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

  useEffect(() => {
    fetchWOs()
  }, [priorityFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchWOs()
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 min-w-0">
      <MaintenanceHeader />

      {/* Control Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-[#D4AF37] flex items-center justify-center font-bold">
            <KanbanSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-900">Work Order Command Center</h2>
            <div className="text-xs text-stone-500">
              กระดานติดตามสถานะงานซ่อมบำรุง 9 ขั้นตอน Real-Time
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

          <Button
            onClick={fetchWOs}
            variant="outline"
            size="sm"
            className="h-10 px-3 text-xs border-stone-200 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

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

                      return (
                        <div
                          key={wo.id}
                          onClick={() => setDetailWO(wo)}
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

                          {/* Impact / Downtime */}
                          <div className="text-[10px] bg-stone-50 p-1.5 rounded-lg border border-stone-200 flex items-center justify-between">
                            <span className="text-stone-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-red-500" />
                              {wo.total_downtime_minutes} นาที
                            </span>
                            <span className="text-stone-700 font-bold">
                              ฿{Number(wo.total_part_cost || 0).toLocaleString()}
                            </span>
                          </div>

                          {/* Technician */}
                          <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
                            <span className="truncate max-w-[120px]">{wo.assigned_technician_name || 'ยังไม่กำหนดช่าง'}</span>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-stone-400">{detailWO.wo_number}</span>
                <h3 className="text-xl font-black text-stone-900">{detailWO.machine_code} - {detailWO.machine_name}</h3>
                <div className="text-xs text-stone-500">ผู้แจ้ง: {detailWO.requester_name} ({detailWO.requester_department_name})</div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                detailWO.priority === 'P1_CRITICAL' ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-800'
              }`}>
                {detailWO.priority}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block">สถานะปัจจุบัน:</span>
                <span className="font-bold text-stone-900">{detailWO.status}</span>
              </div>
              <div>
                <span className="text-stone-400 block">เวลา Downtime รวม:</span>
                <span className="font-bold text-red-600">{detailWO.total_downtime_minutes} นาที</span>
              </div>
              <div>
                <span className="text-stone-400 block">อาการที่แจ้ง:</span>
                <span className="font-semibold text-stone-800">{detailWO.symptom_category}</span>
              </div>
              <div>
                <span className="text-stone-400 block">ช่างผู้รับผิดชอบ:</span>
                <span className="font-semibold text-stone-800">{detailWO.assigned_technician_name || 'ยังไม่กำหนด'}</span>
              </div>
            </div>

            {detailWO.symptom_description && (
              <div className="text-xs text-stone-700 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50">
                <b>รายละเอียด:</b> {detailWO.symptom_description}
              </div>
            )}

            {detailWO.root_cause && (
              <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <div><b>สาเหตุหลัก (Root Cause):</b> {detailWO.root_cause}</div>
                <div><b>การแก้ไข (Action):</b> {detailWO.corrective_action || '-'}</div>
                {detailWO.preventive_recommendation && (
                  <div><b>ข้อเสนอแนะ:</b> {detailWO.preventive_recommendation}</div>
                )}
              </div>
            )}

            {detailWO.parts && detailWO.parts.length > 0 && (
              <div className="text-xs space-y-1">
                <b className="text-stone-700">อะไหล่ที่ใช้ในงานนี้:</b>
                {detailWO.parts.map((p: any) => (
                  <div key={p.id} className="flex justify-between p-2 bg-stone-50 rounded-lg border border-stone-200">
                    <span>{p.part_name} ({p.part_code})</span>
                    <span className="font-bold">{p.quantity} {p.unit} (฿{Number(p.total_cost).toLocaleString()})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailWO(null)}
                className="flex-1 text-xs"
              >
                ปิด
              </Button>
              <Link
                href={`/maintenance/machines/${detailWO.machine_code}`}
                className="flex-1 inline-flex items-center justify-center text-xs font-bold bg-stone-900 text-white rounded-xl hover:bg-stone-800"
              >
                ดูประวัติ 360° เครื่อง
              </Link>
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
