'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QrCode, Search, ChevronRight, AlertOctagon, Wrench } from 'lucide-react'
import { MaintenanceMachine } from '@/types/maintenance'

interface MachineQRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  machines: MaintenanceMachine[]
}

export default function MachineQRScannerModal({
  isOpen,
  onClose,
  machines
}: MachineQRScannerModalProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMachines = machines.filter(m => 
    m.machine_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.production_area && m.production_area.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleSelectMachine = (machineCode: string, action: 'report' | 'profile') => {
    onClose()
    if (action === 'report') {
      router.push(`/maintenance/report/${machineCode}`)
    } else {
      router.push(`/maintenance/machines/${machineCode}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-white shadow-2xl border border-stone-200">
        <DialogHeader className="text-left space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 mb-2 border border-amber-300">
            <QrCode className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-stone-900">
            สแกน QR หน้าเครื่องจักร
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            สแกนหรือเลือกเครื่องจักรเพื่อแจ้งเครื่องเสียด่วน หรือดูประวัติ 360°
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="พิมพ์รหัสเครื่อง เช่น MX-01, FL-01..."
            className="pl-10 h-11 text-sm bg-stone-50 border-stone-200 rounded-xl"
            autoFocus
          />
        </div>

        {/* Machine list */}
        <div className="max-h-72 overflow-y-auto space-y-2 mt-2 pr-1 no-scrollbar">
          {filteredMachines.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-400">
              ไม่พบเครื่องจักรที่ค้นหา
            </div>
          ) : (
            filteredMachines.map(m => (
              <div
                key={m.id}
                className="p-3 rounded-xl border border-stone-200 hover:border-[#D4AF37] hover:bg-amber-50/40 transition-all flex items-center justify-between group"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900 text-sm">{m.machine_code}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      m.status === 'Running' ? 'bg-emerald-100 text-emerald-800' :
                      m.status === 'Breakdown' ? 'bg-red-100 text-red-800 animate-pulse' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 truncate mt-0.5 font-medium">{m.machine_name}</div>
                  <div className="text-[10px] text-stone-400 truncate">{m.production_area || m.category}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleSelectMachine(m.machine_code, 'report')}
                    className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                    title="แจ้งเครื่องเสียทันที"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">แจ้งซ่อม</span>
                  </button>

                  <button
                    onClick={() => handleSelectMachine(m.machine_code, 'profile')}
                    className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-800 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1"
                    title="ดูประวัติ 360°"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ประวัติ</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-stone-100 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-stone-500">
            ปิดหน้าต่าง
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
