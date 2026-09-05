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
  Printer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { MaintenanceMachine } from '@/types/maintenance'
import { getMachines } from '@/app/actions/maintenance'
import MachineQRBadge from '@/components/maintenance/MachineQRBadge'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export default function MachinesMasterPage() {
  const [machines, setMachines] = useState<MaintenanceMachine[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [criticalityFilter, setCriticalityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [qrMachine, setQrMachine] = useState<MaintenanceMachine | null>(null)

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
          <div class="subtitle">${m.machine_name}<br/><b>${m.production_area || m.department_name || ''}</b></div>
          <img class="qr-img" src="${qrImageUrl}" alt="QR" />
          <div class="emergency">🚨 สแกนแจ้งเครื่องเสีย (≤ 60 วินาที)</div>
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

          <Button
            type="button"
            onClick={handleBulkPrint}
            className="h-10 px-3.5 rounded-xl text-xs font-bold bg-[#2A2521] hover:bg-stone-800 text-white shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>พิมพ์ป้าย QR ทั้งหมด ({machines.length})</span>
          </Button>
        </div>
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map(m => {
          const isBreakdown = m.status === 'Breakdown' || m.status === 'Under Repair'

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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-stone-900">{m.machine_code}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      m.criticality === 'A' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Grade {m.criticality}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    m.status === 'Running' ? 'bg-emerald-100 text-emerald-800' :
                    m.status === 'Breakdown' ? 'bg-red-600 text-white animate-pulse' :
                    m.status === 'Under Repair' ? 'bg-amber-100 text-amber-900' :
                    'bg-stone-100 text-stone-700'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-1">{m.machine_name}</h3>
                <div className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                  <span>{m.department_name}</span>
                  <span>•</span>
                  <span>{m.production_area}</span>
                </div>

                {/* Specs snapshot */}
                <div className="mt-3 p-2.5 bg-stone-50 rounded-2xl text-[11px] text-stone-600 space-y-1 border border-stone-150">
                  <div className="flex justify-between">
                    <span className="text-stone-400">ยี่ห้อ / รุ่น:</span>
                    <span className="font-medium text-stone-800">{m.manufacturer} {m.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">ต้นทุน Downtime:</span>
                    <span className="font-semibold text-[#8B7355]">฿{Number(m.hourly_downtime_cost).toLocaleString()} / ชม.</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-stone-100 mt-4">
                <Button
                  onClick={() => setQrMachine(m)}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-stone-200 rounded-xl"
                >
                  <QrCode className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  ป้าย QR
                </Button>

                <Link
                  href={`/maintenance/report/${m.machine_code}`}
                  className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-colors"
                  title="แจ้งเครื่องเสียด่วน"
                >
                  <AlertOctagon className="w-4 h-4" />
                </Link>

                <Link
                  href={`/maintenance/machines/${m.machine_code}`}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold bg-[#2A2521] text-white hover:bg-stone-800 transition-colors"
                >
                  ประวัติ 360°
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>
          )
        })}
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
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
