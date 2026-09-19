'use client'

import React, { useState, useEffect } from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import { 
  Wrench, 
  Search, 
  Filter, 
  QrCode, 
  AlertOctagon, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Clock,
  Printer,
  Plus,
  Pencil,
  FileCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { MaintenanceMachine, MachineRequestType, getPmFrequencyInfo } from '@/types/maintenance'
import { getMachines } from '@/app/actions/maintenance'
import MachineQRBadge from '@/components/maintenance/MachineQRBadge'
import AddMachineModal from '@/components/maintenance/AddMachineModal'
import EditMachineModal from '@/components/maintenance/EditMachineModal'
import MachineActionRequestModal from '@/components/maintenance/MachineActionRequestModal'
import MachineRequestsListModal from '@/components/maintenance/MachineRequestsListModal'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export default function MachinesMasterPage() {
  const [machines, setMachines] = useState<MaintenanceMachine[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [criticalityFilter, setCriticalityFilter] = useState('all')
  const [specialFilter, setSpecialFilter] = useState<'all' | 'subcontract' | 'calibration'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [qrMachine, setQrMachine] = useState<MaintenanceMachine | null>(null)
  const [editingMachine, setEditingMachine] = useState<MaintenanceMachine | null>(null)
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false)
  const [isRequestsListOpen, setIsRequestsListOpen] = useState(false)
  const [isActionRequestOpen, setIsActionRequestOpen] = useState(false)

  const fetchMachines = async () => {
    setIsLoading(true)
    try {
      const res = await getMachines({
        category: categoryFilter,
        status: statusFilter,
        criticality: criticalityFilter,
        search
      })
      if (res.success) setMachines(res.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
  }, [categoryFilter, statusFilter, criticalityFilter])

  const handleBulkPrint = () => {
    if (machines.length === 0) return
    const printWindow = window.open('', '', 'width=900,height=800')
    if (!printWindow) return

    const badgesHtml = machines.map(m => {
      const reportUrl = `${window.location.origin}/maintenance/report/${m.machine_code}`
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(reportUrl)}`
      return `
        <div class="badge-card">
          <div class="header">CosmeFlow Maintenance • Asset QR</div>
          <div class="title">${m.machine_code}</div>
          ${m.asset_id ? `<div style="font-size:12px;font-weight:bold;color:#2563eb;margin-bottom:4px;">เลขทรัพย์สิน: ${m.asset_id}</div>` : ''}
          <div class="subtitle">${m.machine_name}<br/><b>${m.production_area || m.department_name || ''}</b></div>
          ${m.supplier && m.supplier !== 'N/A' ? `<div style="font-size:11px;color:#666;margin-bottom:6px;">ผู้จำหน่าย: <b>${m.supplier}</b></div>` : ''}
          <img class="qr-img" src="${qrImageUrl}" alt="QR" />
          <div class="emergency">🚨 สแกนแจ้งซ่อม / เบิกอะไหล่ (≤ 60 วินาที)</div>
          <div class="footer">สแกนดูประวัติเครื่องจักร & Maintenance 360°</div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์ป้าย QR เครื่องจักรทั้งหมด - CosmeFlow</title>
          <style>
            body { font-family: sans-serif; margin: 20px; background: #fff; }
            .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .badge-card { border: 2.5px solid #222; border-radius: 14px; padding: 18px; text-align: center; page-break-inside: avoid; background: #fff; }
            .header { font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
            .title { font-size: 26px; font-weight: 900; margin: 4px 0; color: #111; }
            .subtitle { font-size: 12px; color: #444; margin-bottom: 12px; line-height: 1.3; min-height: 32px; }
            .qr-img { width: 170px; height: 170px; margin: 0 auto; display: block; }
            .emergency { color: #dc2626; font-size: 12px; font-weight: bold; margin-top: 10px; }
            .footer { margin-top: 8px; font-size: 11px; font-weight: bold; background: #f3f4f6; padding: 6px; border-radius: 6px; color: #374151; }
            @media print {
              body { margin: 10mm; }
              .grid-container { gap: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${badgesHtml}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const categories = ['all', 'Mixing', 'Filling', 'Capping', 'Labeling', 'Utility']

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
      <MaintenanceHeader />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-stone-900">ทะเบียนเครื่องจักรและทรัพย์สิน (Machine Master)</h2>
          <div className="text-xs text-stone-500">
            เครื่องจักรทั้งหมด {machines.length} เครื่อง • รองรับ QR Code ประจำเครื่อง และ Machine 360° Profile
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchMachines()}
              placeholder="ค้นหารหัส หรือชื่อเครื่อง..."
              className="pl-9 h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-xl text-xs font-bold bg-stone-50 border border-stone-200 text-stone-700"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <Link
            href="/maintenance/qr-print"
            className="h-10 px-3.5 rounded-xl text-xs font-bold bg-[#2A2521] hover:bg-stone-800 text-white shadow-sm flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>สตูดิโอพิมพ์สติกเกอร์ QR ({machines.length})</span>
          </Link>

          <Button
            type="button"
            onClick={() => setIsRequestsListOpen(true)}
            className="h-10 px-3.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 shadow-sm flex items-center gap-1.5 transition"
            title="ดูคำร้องขอดำเนินการเกี่ยวกับเครื่องจักร (MT-PF-002)"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>คำขอดำเนินการ (MT-PF-002)</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsActionRequestOpen(true)}
            className="h-10 px-3.5 rounded-xl text-xs font-extrabold bg-[#D4AF37] hover:bg-amber-600 text-stone-950 shadow-sm flex items-center gap-1.5"
            title="ยื่นคำขอขึ้นทะเบียนเครื่องจักรใหม่ (MT-PF-002)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ ขอขึ้นทะเบียนเครื่องใหม่</span>
          </Button>
        </div>
      </div>

      {/* Special Category Filter Pills: All vs Subcontract PM vs Calibration */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSpecialFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            specialFilter === 'all'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <span>เครื่องจักรทั้งหมด</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            specialFilter === 'all' ? 'bg-stone-700 text-white' : 'bg-stone-150 text-stone-700'
          }`}>
            {machines.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSpecialFilter('subcontract')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            specialFilter === 'subcontract'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <span>🏢 จ้าง Subcontract PM</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            specialFilter === 'subcontract' ? 'bg-purple-900 text-white' : 'bg-purple-100 text-purple-900'
          }`}>
            {machines.filter(m => m.is_subcontract_pm).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSpecialFilter('calibration')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            specialFilter === 'calibration'
              ? 'bg-cyan-700 text-white shadow-xs'
              : 'bg-white text-cyan-800 hover:bg-cyan-50 border border-cyan-200'
          }`}
        >
          <span>🎯 เครื่องที่ต้องสอบเทียบ (CAL)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            specialFilter === 'calibration' ? 'bg-cyan-900 text-white' : 'bg-cyan-100 text-cyan-900'
          }`}>
            {machines.filter(m => m.requires_calibration).length}
          </span>
        </button>
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines
          .filter(m => {
            if (specialFilter === 'subcontract') return m.is_subcontract_pm
            if (specialFilter === 'calibration') return m.requires_calibration
            return true
          })
          .map(m => {
          const isBreakdown = m.status === 'Breakdown' || m.status === 'Under Repair'
          const pmFreq = m.pm_frequency_type ? getPmFrequencyInfo(m.pm_frequency_type, m.pm_frequency_interval) : null

          return (
            <div
              key={m.id}
              className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                isBreakdown
                  ? 'border-red-400 ring-2 ring-red-500/10'
                  : 'border-stone-200 hover:border-[#D4AF37]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-base font-black text-stone-900">{m.machine_code}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      m.criticality === 'A' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Grade {m.criticality}
                    </span>
                    {m.asset_id && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200" title="เลขทรัพย์สิน">
                        {m.asset_id}
                      </span>
                    )}
                    {pmFreq && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${pmFreq.color}`} title={pmFreq.full}>
                        {pmFreq.code}
                      </span>
                    )}
                    {m.is_subcontract_pm && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={`ผู้รับเหมา: ${m.subcontractor_name || 'จ้าง Subcontract'}`}>
                        🏢 Subcontract
                      </span>
                    )}
                    {m.requires_calibration && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200" title={`CAL: ${m.calibration_frequency || ''}${m.next_calibration_date ? ` • ครบ ${m.next_calibration_date}` : ''}`}>
                        🎯 CAL {m.next_calibration_date ? `(${m.next_calibration_date.slice(5)})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingMachine(m)}
                      className="p-1 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition"
                      title="แก้ไขข้อมูลเครื่องจักร"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === 'Running' ? 'bg-emerald-100 text-emerald-800' :
                      m.status === 'Breakdown' ? 'bg-red-600 text-white animate-pulse' :
                      m.status === 'Under Repair' ? 'bg-amber-100 text-amber-900' :
                      'bg-stone-100 text-stone-700'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-1">{m.machine_name}</h3>
                <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                  <span>{m.department_name}</span>
                  <span>•</span>
                  <span>{m.production_area}</span>
                </div>

                {/* Specs snapshot */}
                <div className="mt-3 p-2.5 bg-stone-50 rounded-2xl text-[11px] text-stone-600 space-y-1.5 border border-stone-200">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-stone-400 shrink-0">ผู้จำหน่าย:</span>
                    <span className="font-medium text-stone-800 text-right truncate max-w-[170px]" title={m.supplier || '-'}>
                      {m.supplier && m.supplier !== 'N/A' ? m.supplier : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-stone-400 shrink-0">ยี่ห้อ / รุ่น:</span>
                    <span className="font-medium text-stone-800 text-right truncate max-w-[170px]" title={([m.manufacturer, m.model].filter(x => x && x !== 'N/A').join(' ') || '-')}>
                      {[m.manufacturer, m.model].filter(x => x && x !== 'N/A').join(' ') || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-stone-400 shrink-0">หมายเลขเครื่อง:</span>
                    <span className="font-mono text-stone-700 text-right truncate max-w-[170px]" title={m.serial_number && m.serial_number !== 'N/A' ? m.serial_number : '-'}>
                      {m.serial_number && m.serial_number !== 'N/A' ? m.serial_number : '-'}
                    </span>
                  </div>
                  {pmFreq && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-stone-400 shrink-0">รอบความถี่ PM:</span>
                      <span className="font-medium text-cyan-800 text-right truncate max-w-[170px]">
                        {pmFreq.full}
                      </span>
                    </div>
                  )}
                  {m.is_subcontract_pm && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-purple-700 font-bold shrink-0">การดูแล PM:</span>
                      <span className="font-bold text-purple-900 text-right truncate max-w-[170px]" title={m.subcontractor_name || 'จ้าง Subcontract'}>
                        🏢 {m.subcontractor_name || 'Subcontract'}
                      </span>
                    </div>
                  )}
                  {m.requires_calibration && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-cyan-700 font-bold shrink-0">สอบเทียบ (CAL):</span>
                      <span className="font-bold text-cyan-900 text-right truncate max-w-[170px]" title={`${m.calibration_frequency || ''} ${m.next_calibration_date ? `กำหนดถัดไป: ${m.next_calibration_date}` : ''}`}>
                        🎯 {m.next_calibration_date ? `ครบ ${m.next_calibration_date}` : (m.calibration_frequency || 'ต้องสอบเทียบ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-stone-200/60">
                    <span className="text-stone-400">ต้นทุน Downtime:</span>
                    <span className="font-bold text-[#8B7355]">฿{Number(m.hourly_downtime_cost).toLocaleString()} / ชม.</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-4 border-t border-stone-100 mt-4">
                <Button
                  onClick={() => setQrMachine(m)}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-stone-200 rounded-xl px-2 h-9"
                  title="ดูป้าย QR Code"
                >
                  <QrCode className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  ป้าย QR
                </Button>

                <Button
                  onClick={() => setEditingMachine(m)}
                  variant="outline"
                  size="sm"
                  className="text-xs border-stone-200 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-stone-100 px-2.5 h-9 flex items-center gap-1"
                  title="แก้ไขข้อมูลเครื่องจักร"
                >
                  <Pencil className="w-3.5 h-3.5 text-stone-500" />
                  <span>แก้ไข</span>
                </Button>

                <Link
                  href={`/maintenance/report/${m.machine_code}`}
                  className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-colors h-9 w-9 flex items-center justify-center shrink-0"
                  title="แจ้งเครื่องเสียด่วน"
                >
                  <AlertOctagon className="w-4 h-4" />
                </Link>

                <Link
                  href={`/maintenance/machines/${m.machine_code}`}
                  className="inline-flex items-center justify-center px-2.5 py-2 rounded-xl text-xs font-bold bg-[#2A2521] text-white hover:bg-stone-800 transition-colors h-9 shrink-0"
                  title="ดูประวัติ 360 องศา"
                >
                  <span>360°</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating Action Buttons for MT-PF-002 Governance */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col sm:flex-row items-end sm:items-center gap-2">
        <button
          onClick={() => setIsRequestsListOpen(true)}
          className="bg-white hover:bg-stone-50 text-stone-800 font-bold px-3.5 py-2.5 rounded-2xl shadow-xl border border-stone-200 flex items-center gap-2 transition text-xs"
          title="ดูรายการคำร้อง MT-PF-002 ทั้งหมด"
        >
          <FileCheck className="w-4 h-4 text-blue-600" />
          <span>คำขอดำเนินการ (MT-PF-002)</span>
        </button>

        <button
          onClick={() => setIsActionRequestOpen(true)}
          className="bg-[#D4AF37] hover:bg-[#b89528] text-stone-950 font-black px-4 py-3 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2 transition transform active:scale-95 text-xs sm:text-sm hover:shadow-amber-500/20"
          title="ยื่นขอขึ้นทะเบียนเครื่องจักรใหม่ (MT-PF-002)"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ ยื่นขอเพิ่มเครื่องใหม่ (MT-PF-002)</span>
        </button>
      </div>

      {/* QR Badge Modal */}
      {qrMachine && (
        <Dialog open={!!qrMachine} onOpenChange={() => setQrMachine(null)}>
          <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-white shadow-2xl border border-stone-200">
            <MachineQRBadge
              machineCode={qrMachine.machine_code}
              machineName={qrMachine.machine_name}
              productionArea={qrMachine.production_area}
              criticality={qrMachine.criticality}
              roomName={qrMachine.room_name}
              assetId={qrMachine.asset_id}
              supplier={qrMachine.supplier}
              serialNumber={qrMachine.serial_number}
              model={qrMachine.model}
              pmFrequency={qrMachine.pm_frequency_type ? getPmFrequencyInfo(qrMachine.pm_frequency_type, qrMachine.pm_frequency_interval).full : undefined}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Machine Modal (Direct admin fallback) */}
      <AddMachineModal
        isOpen={isAddMachineOpen}
        onClose={() => setIsAddMachineOpen(false)}
        onSuccess={fetchMachines}
      />

      {/* Edit Machine Modal */}
      <EditMachineModal
        machine={editingMachine}
        isOpen={!!editingMachine}
        onClose={() => setEditingMachine(null)}
        onSuccess={fetchMachines}
      />

      {/* Machine Requests List Modal (MT-PF-002 Review / Approval) */}
      <MachineRequestsListModal
        isOpen={isRequestsListOpen}
        onClose={() => setIsRequestsListOpen(false)}
        onSuccess={fetchMachines}
      />

      {/* Machine Action Request Modal (MT-PF-002 New Machine Request) */}
      <MachineActionRequestModal
        isOpen={isActionRequestOpen}
        onClose={() => setIsActionRequestOpen(false)}
        initialType="NEW_MACHINE"
        onSuccess={fetchMachines}
      />
    </div>
  )
}
