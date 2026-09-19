'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  UserCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { getMachineRequests, approveMachineRequest, rejectMachineRequest } from '@/app/actions/maintenance'
import { MaintenanceMachineRequest, MachineRequestType } from '@/types/maintenance'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function MachineRequestsListModal({ isOpen, onClose, onSuccess }: Props) {
  const [requests, setRequests] = useState<MaintenanceMachineRequest[]>([])
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const res = await getMachineRequests()
      if (res.success && res.data) {
        setRequests(res.data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  if (!isOpen) return null

  const filteredRequests = requests.filter(r => {
    if (activeFilter !== 'ALL' && r.status !== activeFilter) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      r.request_number.toLowerCase().includes(s) ||
      r.machine_code.toLowerCase().includes(s) ||
      r.machine_name.toLowerCase().includes(s) ||
      r.requested_by_name.toLowerCase().includes(s) ||
      r.reason.toLowerCase().includes(s)
    )
  })

  const pendingCount = requests.filter(r => r.status === 'PENDING').length

  const handleApprove = async (req: MaintenanceMachineRequest) => {
    if (!confirm(`ยืนยันการอนุมัติคำร้อง ${req.request_number} (${getTypeLabel(req.request_type)}) และสั่งปรับปรุงฐานข้อมูลเครื่องจักรทันทีหรือไม่?`)) {
      return
    }

    setActionLoadingId(req.id)
    try {
      const res = await approveMachineRequest(req.id, 'Plant Director (PDT)', 'อนุมัติดำเนินการตามข้อกำหนด DCC')
      if (res.success) {
        toast.success(res.message || 'อนุมัติคำร้องและปรับปรุงเครื่องจักรเรียบร้อยแล้ว!')
        await fetchRequests()
        onSuccess?.()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการอนุมัติ')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถอนุมัติได้')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (req: MaintenanceMachineRequest) => {
    const reason = prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติคำร้องนี้:')
    if (!reason || reason.trim().length < 3) {
      toast.error('กรุณาระบุเหตุผลในการไม่อนุมัติ')
      return
    }

    setActionLoadingId(req.id)
    try {
      const res = await rejectMachineRequest(req.id, 'Plant Director (PDT)', reason.trim())
      if (res.success) {
        toast.success(res.message || 'ปฏิเสธคำร้องเรียบร้อยแล้ว')
        await fetchRequests()
        onSuccess?.()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถดำเนินการได้')
    } finally {
      setActionLoadingId(null)
    }
  }

  function getTypeLabel(type: MachineRequestType) {
    switch (type) {
      case 'NEW_MACHINE': return '➕ ขอเพิ่มเครื่องจักรใหม่'
      case 'DECOMMISSION': return '🚫 ขอยกเลิกใช้ / ปลดระวาง'
      case 'RELOCATE': return '🔄 ขอโอนย้ายสังกัด / แผนก'
      case 'OTHER': return '⚙️ ขอกรณีอื่นๆ'
      default: return type
    }
  }

  function getTypeColor(type: MachineRequestType) {
    switch (type) {
      case 'NEW_MACHINE': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'DECOMMISSION': return 'bg-red-100 text-red-800 border-red-200'
      case 'RELOCATE': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'OTHER': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-stone-100 text-stone-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] p-0 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 rounded-t-3xl border-b border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]">
                <FileCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>ทะเบียนคำร้องขอดำเนินการเกี่ยวกับเครื่องจักร</span>
                  <span className="text-xs font-mono text-[#D4AF37] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40">
                    MT-PF-002
                  </span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  เวิร์กโฟลว์คำร้อง: ขอเพิ่มใหม่ • ขอยกเลิกใช้ • ขอโอนย้าย • ขอกรณีอื่นๆ พร้อมการอนุมัติระดับ PDT
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-400 block uppercase font-mono">รออนุมัติ</span>
              <span className="text-lg font-black text-amber-400 font-mono">{pendingCount} เรื่อง</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Status Pills */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeFilter === 'ALL'
                    ? 'bg-stone-900 text-[#D4AF37]'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                ทั้งหมด ({requests.length})
              </button>
              <button
                onClick={() => setActiveFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>รออนุมัติ ({pendingCount})</span>
              </button>
              <button
                onClick={() => setActiveFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>อนุมัติแล้ว ({requests.filter(r => r.status === 'APPROVED').length})</span>
              </button>
              <button
                onClick={() => setActiveFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeFilter === 'REJECTED'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>ไม่อนุมัติ ({requests.filter(r => r.status === 'REJECTED').length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นเลขที่คำร้อง, รหัสเครื่อง..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Requests List Body */}
        <div className="p-4 space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-stone-400 space-y-2">
              <FileCheck className="w-12 h-12 mx-auto text-stone-300" />
              <p className="font-bold text-stone-700">ไม่พบรายการคำร้องที่ตรงกับเงื่อนไข</p>
              <p className="text-xs">เมื่อมีการยื่นคำร้องดำเนินการเกี่ยวกับเครื่องจักร รายการจะปรากฏที่นี่</p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs hover:border-stone-300 transition space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                      {req.request_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTypeColor(req.request_type)}`}>
                      {getTypeLabel(req.request_type)}
                    </span>
                    <span className="text-xs font-mono font-bold text-stone-950">
                      [{req.machine_code}]
                    </span>
                    <span className="text-xs text-stone-700 font-bold">
                      {req.machine_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {req.status === 'PENDING' ? '⏳ รออนุมัติ' : req.status === 'APPROVED' ? '✓ อนุมัติแล้ว' : '✕ ไม่อนุมัติ'}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {new Date(req.requested_at).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-stone-500 uppercase">เหตุผลความจำเป็นในการขอดำเนินการ:</div>
                    <p className="text-stone-800 font-medium leading-relaxed">{req.reason}</p>
                    {req.target_department && (
                      <div className="text-[11px] text-purple-800 font-semibold pt-1">
                        📍 แผนกปลายทาง: {req.target_department} ({req.target_location || '-'})
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-stone-500 uppercase">ข้อมูลการยื่นขอ & ผู้อนุมัติ:</div>
                    <div className="text-stone-700">
                      ผู้ขอดำเนินการ: <b className="text-stone-900">{req.requested_by_name}</b> ({req.requested_by_dept || 'ฝ่ายผลิต'})
                    </div>
                    {req.approved_by_name && (
                      <div className="text-emerald-800 font-medium">
                        ผู้อนุมัติ: <b>{req.approved_by_name}</b> ({new Date(req.approved_at || '').toLocaleDateString('th-TH')})
                      </div>
                    )}
                    {req.rejection_reason && (
                      <div className="text-red-700 font-medium">
                        เหตุผลที่ไม่อนุมัติ: {req.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Approver Action Row (If Pending) */}
                {req.status === 'PENDING' && (
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <div className="text-[11px] text-stone-400 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>ต้องได้รับการอนุมัติจาก Plant Director (PDT) เพื่อบังคับใช้</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(req)}
                        disabled={actionLoadingId === req.id}
                        className="text-xs h-8 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        <span>ไม่อนุมัติ</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleApprove(req)}
                        disabled={actionLoadingId === req.id}
                        className="text-xs h-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>{actionLoadingId === req.id ? 'กำลังดำเนินการ...' : 'อนุมัติ & ดำเนินการทันที'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
