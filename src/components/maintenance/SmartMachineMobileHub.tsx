'use client'

import React, { useState } from 'react'
import { MaintenanceMachine, MaintenanceSparePart, MaintenancePMPlan, getPmFrequencyInfo } from '@/types/maintenance'
import FastReportForm from '@/components/maintenance/FastReportForm'
import QuickSparePartRequisition from '@/components/maintenance/QuickSparePartRequisition'
import ExecutePMChecksheetModal from '@/components/maintenance/ExecutePMChecksheetModal'
import { 
  AlertOctagon, 
  Package, 
  Calendar, 
  ShieldCheck, 
  FileCheck, 
  ExternalLink,
  ChevronRight,
  Clock,
  Wrench,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SmartMachineMobileHubProps {
  machine: MaintenanceMachine
  machines: MaintenanceMachine[]
  spareParts: MaintenanceSparePart[]
  pmPlan: MaintenancePMPlan | null
}

export default function SmartMachineMobileHub({
  machine,
  machines,
  spareParts,
  pmPlan
}: SmartMachineMobileHubProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'report' | 'requisition' | 'pm_spec'>('report')
  const [isExecutePMOpen, setIsExecutePMOpen] = useState(false)

  const pmFreq = pmPlan
    ? getPmFrequencyInfo(pmPlan.frequency_type, pmPlan.frequency_interval)
    : machine.pm_frequency_type
    ? getPmFrequencyInfo(machine.pm_frequency_type, machine.pm_frequency_interval)
    : null

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="bg-stone-200/80 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'report'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100/50'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>🚨 แจ้งซ่อมด่วน</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requisition')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'requisition'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100/50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>📦 เบิกอะไหล่</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pm_spec')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            activeTab === 'pm_spec'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100/50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>📋 สเปก & ตรวจ PM</span>
        </button>
      </div>

      {/* TAB 1: FAST BREAKDOWN REPORT */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              🚨 บันทึกแจ้งซ่อมเครื่องจักร: {machine.machine_code}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium">
              ระบบส่งแจ้งเตือนเข้ามือถือช่างซ่อมบำรุงทันที และออกใบสั่งซ่อม (Work Order) อัตโนมัติ
            </p>
          </div>

          <FastReportForm initialMachine={machine} machines={machines} />
        </div>
      )}

      {/* TAB 2: CONSUMABLE SPARE PART REQUISITION */}
      {activeTab === 'requisition' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              📦 เบิกอะไหล่สิ้นเปลือง: {machine.machine_code}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium">
              เลือกอะไหล่สิ้นเปลืองที่ต้องใช้ ตัดสต๊อกในระบบทันที และผูกต้นทุนเข้าเครื่องจักร
            </p>
          </div>

          <QuickSparePartRequisition
            machine={machine}
            spareParts={spareParts}
            onSuccess={() => router.refresh()}
          />
        </div>
      )}

      {/* TAB 3: MACHINE SPECS & PM PLAN */}
      {activeTab === 'pm_spec' && (
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              📋 ข้อมูลสเปก & แผน PM: {machine.machine_code}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium">
              ตรวจสอบข้อมูลการขึ้นทะเบียน, ความถี่การบำรุงรักษา และเปิดตรวจเช็ค PM หน้างาน
            </p>
          </div>

          {/* PM Plan Banner Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    แผนซ่อมบำรุงเชิงป้องกัน 2026 (PM Plan)
                  </h3>
                  {pmPlan ? (
                    <div className="text-xs text-stone-500 font-mono mt-0.5">
                      รหัสแผน: <span className="font-bold text-[#8B7355]">{pmPlan.plan_code}</span> | {pmPlan.plan_name}
                    </div>
                  ) : (
                    <div className="text-xs text-stone-400">ยังไม่มีแผน PM เฉพาะเจาะจง</div>
                  )}
                </div>
              </div>

              {pmPlan && (
                <button
                  onClick={() => setIsExecutePMOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm active:scale-95 inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>🚀 เริ่มตรวจเช็ค PM (E-Form)</span>
                </button>
              )}
            </div>

            {/* PM Grid Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-stone-400 block text-[11px]">รอบความถี่ PM</span>
                <span className="font-mono font-black text-stone-800 text-xs mt-0.5 block">
                  {pmFreq ? pmFreq.full : 'ตามรอบปี'}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-stone-400 block text-[11px]">กำหนดการรอบถัดไป</span>
                <span className="font-mono font-black text-cyan-700 text-xs mt-0.5 block">
                  {pmPlan?.next_due_date || (machine as any).pm_next_due_date || 'ตามรอบปี'}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-stone-400 block text-[11px]">เวลาประมาณการ</span>
                <span className="font-mono font-bold text-stone-800 text-xs mt-0.5 block">
                  {pmPlan?.estimated_minutes || 60} นาที
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-stone-400 block text-[11px]">ช่างผู้รับผิดชอบ</span>
                <span className="font-bold text-stone-800 text-xs mt-0.5 block truncate">
                  {machine.responsible_technician_name || 'ช่างประจำแผนก'}
                </span>
              </div>
            </div>

            {/* Checklist Items Preview */}
            {pmPlan && Array.isArray(pmPlan.checklist_template) && pmPlan.checklist_template.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    รายการตรวจเช็คมาตรฐาน ({pmPlan.checklist_template.length} ข้อ)
                  </span>
                  <span className="text-stone-400">กดปุ่มเริ่มตรวจด้านบนเพื่อบันทึกผล</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {pmPlan.checklist_template.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-white border border-stone-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-stone-900">{item.item}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{item.standard}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Machine Master Spec Details */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5 pb-2 border-b border-stone-100">
              <Wrench className="w-4 h-4 text-[#8B7355]" />
              <span>ข้อมูลทะเบียนเครื่องจักรและทรัพย์สิน (Machine Master Snapshot)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">รหัสเครื่องจักร:</span>
                <span className="font-mono font-bold text-stone-900">{machine.machine_code}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">เลขทะเบียนทรัพย์สิน (Asset ID):</span>
                <span className="font-mono font-bold text-blue-700">{machine.asset_id || '-'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">ระดับวิกฤตภาพ:</span>
                <span className="font-bold text-stone-900">Grade {machine.criticality}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">ผู้จำหน่าย (Supplier):</span>
                <span className="font-medium text-stone-800">{machine.supplier && machine.supplier !== 'N/A' ? machine.supplier : '-'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">ยี่ห้อ / ผู้ผลิต:</span>
                <span className="font-medium text-stone-800">{machine.manufacturer && machine.manufacturer !== 'N/A' ? machine.manufacturer : '-'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">รุ่น (Model):</span>
                <span className="font-medium text-stone-800">{machine.model && machine.model !== 'N/A' ? machine.model : '-'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">หมายเลขซีเรียล (Serial No.):</span>
                <span className="font-mono font-bold text-stone-800">{machine.serial_number && machine.serial_number !== 'N/A' ? machine.serial_number : '-'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">แผนก / สถานที่ติดตั้ง:</span>
                <span className="font-medium text-stone-800">{machine.department_name} • {machine.production_area}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150">
                <span className="text-stone-400 block text-[11px]">ต้นทุน Downtime:</span>
                <span className="font-bold text-[#8B7355]">฿{Number(machine.hourly_downtime_cost || 0).toLocaleString()} / ชม.</span>
              </div>

              {machine.is_subcontract_pm && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 sm:col-span-2">
                  <span className="text-purple-700 block text-[11px] font-bold">🏢 การดูแล PM (Subcontract):</span>
                  <div className="text-xs font-bold text-purple-950 mt-0.5">
                    {machine.subcontractor_name || 'จ้าง Subcontract ดูแล'} {machine.subcontractor_contact ? `(${machine.subcontractor_contact})` : ''}
                  </div>
                  {machine.subcontract_scope && (
                    <div className="text-[11px] text-purple-800 mt-0.5">{machine.subcontract_scope}</div>
                  )}
                </div>
              )}

              {machine.requires_calibration && (
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200 sm:col-span-2">
                  <span className="text-cyan-700 block text-[11px] font-bold">🎯 การสอบเทียบ (Calibration - CAL):</span>
                  <div className="text-xs font-bold text-cyan-950 mt-0.5">
                    รอบ: {machine.calibration_frequency || 'ตามรอบ'} • กำหนดถัดไป: <b className="text-rose-700 font-mono">{machine.next_calibration_date || '-'}</b>
                  </div>
                  {(machine.calibration_lab || machine.calibration_cert_no) && (
                    <div className="text-[11px] text-cyan-800 mt-0.5">
                      {machine.calibration_lab} {machine.calibration_cert_no ? `(Cert: ${machine.calibration_cert_no})` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href={`/maintenance/machines/${machine.machine_code}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 hover:text-cyan-900"
              >
                <span>ดูแฟ้มประวัติเครื่องจักร 360° ฉบับเต็ม</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* PM Checksheet Modal */}
      {pmPlan && (
        <ExecutePMChecksheetModal
          isOpen={isExecutePMOpen}
          onClose={() => setIsExecutePMOpen(false)}
          plan={pmPlan}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  )
}
