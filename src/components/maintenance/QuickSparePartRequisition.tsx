'use client'

import React, { useState } from 'react'
import { MaintenanceMachine, MaintenanceSparePart } from '@/types/maintenance'
import { issueDirectConsumablePart } from '@/app/actions/maintenance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Package, 
  CheckCircle2, 
  Search, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  User, 
  FileText,
  Boxes,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import NameAutocompleteInput from '@/components/maintenance/NameAutocompleteInput'
import { getSavedUserName, saveUserName } from '@/lib/userMemory'

interface QuickSparePartRequisitionProps {
  machine: MaintenanceMachine
  spareParts: MaintenanceSparePart[]
  onSuccess?: () => void
}

const COMMON_REASONS = [
  'เปลี่ยนถ่ายน้ำมันหล่อลื่นตามรอบ',
  'อัดจารบีลูกปืน / จุดหมุน',
  'เปลี่ยนซีลยาง / โอริงกันรั่วซึม',
  'เปลี่ยนไส้กรอง / ฟิลเตอร์ดักฝุ่น',
  'เปลี่ยนสายพานลำเลียง / ขับเคลื่อน',
  'เปลี่ยนข้อต่อลม / ท่อสายยาง'
]

export default function QuickSparePartRequisition({
  machine,
  spareParts,
  onSuccess
}: QuickSparePartRequisitionProps) {
  const [parts, setParts] = useState<MaintenanceSparePart[]>(spareParts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPartId, setSelectedPartId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [requesterName, setRequesterName] = useState<string>(() => getSavedUserName(''))
  const [reason, setReason] = useState<string>('เปลี่ยนถ่ายน้ำมันหล่อลื่นตามรอบ')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastIssuedSuccess, setLastIssuedSuccess] = useState<any>(null)

  // Filter parts based on search or compatibility
  const filteredParts = parts.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.part_code.toLowerCase().includes(q) ||
      p.part_name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    )
  })

  const selectedPart = parts.find(p => p.id === selectedPartId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPartId) {
      toast.error('กรุณาเลือกรายการอะไหล่สิ้นเปลืองที่ต้องการเบิก')
      return
    }

    if (!selectedPart) {
      toast.error('ไม่พบข้อมูลอะไหล่ที่เลือก')
      return
    }

    if (quantity <= 0) {
      toast.error('จำนวนที่เบิกต้องมากกว่า 0')
      return
    }

    if (quantity > selectedPart.stock_qty) {
      toast.error(`จำนวนที่ต้องการ (${quantity} ${selectedPart.unit}) เกินกว่ายอดคงเหลือในคลัง (${selectedPart.stock_qty} ${selectedPart.unit})`)
      return
    }

    if (!requesterName.trim()) {
      toast.error('กรุณาระบุชื่อผู้เบิก')
      return
    }

    setIsSubmitting(true)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_requester_name', requesterName.trim())
      }

      const res = await issueDirectConsumablePart({
        machine_code: machine.machine_code,
        spare_part_id: selectedPartId,
        quantity,
        issued_by_name: requesterName.trim(),
        department: machine.department_name || undefined,
        reason: reason.trim()
      })

      if (res.success && res.data) {
        toast.success(res.message || 'เบิกอะไหล่และตัดสต๊อกสำเร็จ!')
        setLastIssuedSuccess(res.data)

        // Update local stock for responsiveness
        setParts(prev =>
          prev.map(p =>
            p.id === selectedPartId
              ? { ...p, stock_qty: res.data.remainingStock }
              : p
          )
        )

        // Reset form
        setSelectedPartId('')
        setQuantity(1)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการตัดสต๊อก')
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {lastIssuedSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-3xl text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-1.5">
                <span>ตัดสต๊อกอะไหล่สำเร็จเรียบร้อย!</span>
                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                  {lastIssuedSuccess.woNumber}
                </span>
              </div>
              <div className="text-xs text-emerald-800 mt-0.5">
                เบิก <b>{lastIssuedSuccess.partName}</b> จำนวน <b>{lastIssuedSuccess.quantity} {lastIssuedSuccess.unit}</b> • ยอดคงเหลือในคลัง: <b className="text-emerald-900">{lastIssuedSuccess.remainingStock} {lastIssuedSuccess.unit}</b>
              </div>
            </div>
          </div>

          <button
            onClick={() => setLastIssuedSuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 transition self-end sm:self-auto"
          >
            ปิดแจ้งเตือน
          </button>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
          <div className="p-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900">
              เบิกอะไหล่สิ้นเปลืองประจำเครื่องจักร
            </h2>
            <p className="text-xs text-stone-500">
              บันทึกการเบิกใช้สำหรับงานบำรุงรักษาประจำวัน พร้อมตัดสต๊อกจริงในคลังทันที (Real-Time Stock Deduction)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Step 1: Search & Select Spare Part */}
          <div className="space-y-2">
            <label className="font-bold text-stone-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-600" />
                <span>1. เลือกรายการอะไหล่สิ้นเปลืองที่ต้องการเบิก <span className="text-red-500">*</span></span>
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                พบ {filteredParts.length} รายการในคลัง
              </span>
            </label>

            {/* Quick Filter Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="พิมพ์ค้นหารหัสอะไหล่, ชื่ออะไหล่, ประเภท (เช่น น้ำมัน, จารบี, ซีล, โอริง)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl"
              />
            </div>

            {/* Selection Grid / Dropdown */}
            <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-2xl divide-y divide-stone-100 bg-stone-50/50">
              {filteredParts.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  ไม่พบรายการอะไหล่ที่ตรงกับคำค้นหา
                </div>
              ) : (
                filteredParts.map(p => {
                  const isSelected = p.id === selectedPartId
                  const isOutOfStock = p.stock_qty <= 0

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => {
                        setSelectedPartId(p.id)
                        if (quantity > p.stock_qty) {
                          setQuantity(Math.max(1, p.stock_qty))
                        }
                      }}
                      className={`w-full p-3 text-left transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-100/70 border-l-4 border-amber-600'
                          : isOutOfStock
                          ? 'opacity-50 cursor-not-allowed bg-stone-100/50'
                          : 'hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-stone-900 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                            {p.part_code}
                          </span>
                          <span className="font-bold text-stone-800 truncate">{p.part_name}</span>
                          {p.category && (
                            <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          ตำแหน่งเก็บ: {p.storage_location || 'คลังอะไหล่กลาง'} • ราคาประเมิน: ฿{Number(p.average_cost || 0).toLocaleString()}/{p.unit}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                          p.stock_qty > 5
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : p.stock_qty > 0
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-red-50 text-red-700 border-red-300'
                        }`}>
                          คงเหลือ: {p.stock_qty} {p.unit}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Selected Part Confirmation Details */}
          {selectedPart && (
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">อะไหล่ที่เลือกเบิก:</span>
                <span className="font-mono font-black text-xs text-stone-900">{selectedPart.part_code}</span> - <span className="font-bold text-stone-800">{selectedPart.part_name}</span>
              </div>
              <div className="text-xs text-amber-900 font-medium">
                สต๊อกคงเหลือปัจจุบัน: <b className="text-emerald-700 font-mono text-sm">{selectedPart.stock_qty}</b> {selectedPart.unit}
              </div>
            </div>
          )}

          {/* Step 2: Quantity & Requester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 flex items-center justify-between">
                <span>2. จำนวนที่ต้องการเบิก <span className="text-red-500">*</span></span>
                {selectedPart && (
                  <span className="text-[11px] text-stone-500 font-normal">
                    หน่วย: {selectedPart.unit}
                  </span>
                )}
              </label>
              <Input
                type="number"
                min={1}
                max={selectedPart ? selectedPart.stock_qty : 999}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-600" />
                <span>3. ชื่อพนักงานผู้เบิก / ช่างผู้ดำเนินการ <span className="text-red-500">*</span></span>
              </label>
              <NameAutocompleteInput
                id="quick-part-requester"
                placeholder="ระบุชื่อหรือรหัสพนักงาน เช่น เบ็ญจพร, pkbjp518, MTANR1898..."
                value={requesterName}
                onChange={setRequesterName}
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Step 3: Purpose / Reason */}
          <div className="space-y-1.5 pt-2">
            <label className="font-bold text-stone-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>4. วัตถุประสงค์ในการเบิกใช้งาน</span>
            </label>

            {/* Quick Reason Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {COMMON_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    reason === r
                      ? 'bg-amber-600 text-white border-amber-600 font-bold'
                      : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <Input
              type="text"
              placeholder="ระบุวัตถุประสงค์ หรือเลือกจากรายการลัดด้านบน..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-stone-150 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>ระบบจะตัดสต๊อกจริงทันที และผูกประวัติเข้าเครื่องจักร {machine.machine_code}</span>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !selectedPartId || (selectedPart ? selectedPart.stock_qty <= 0 : true)}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs font-black bg-[#2A2521] hover:bg-stone-800 text-white shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <Package className="w-4 h-4 text-[#D4AF37]" />
              <span>{isSubmitting ? 'กำลังตัดสต๊อก...' : '🚀 ยืนยันเบิกอะไหล่ & ตัดสต๊อกทันที'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
