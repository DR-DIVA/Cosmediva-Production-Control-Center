'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Package, Plus, Minus, Check, AlertTriangle, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { MaintenanceSparePart } from '@/types/maintenance'
import { getSpareParts, useSparePart } from '@/app/actions/maintenance'

interface SparePartUsageModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  machineCode: string
  technicianName: string
  onPartUsed?: () => void
}

export default function SparePartUsageModal({
  isOpen,
  onClose,
  workOrderId,
  machineCode,
  technicianName,
  onPartUsed
}: SparePartUsageModalProps) {
  const [parts, setParts] = useState<MaintenanceSparePart[]>([])
  const [search, setSearch] = useState('')
  const [selectedPart, setSelectedPart] = useState<MaintenanceSparePart | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getSpareParts()
        .then(res => {
          if (res.success) {
            setParts(res.data)
            // Pre-select first compatible part if any
            const compatible = res.data.find(p => p.compatible_machines?.includes(machineCode))
            if (compatible) setSelectedPart(compatible)
          }
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, machineCode])

  const filteredParts = parts.filter(p =>
    p.part_code.toLowerCase().includes(search.toLowerCase()) ||
    p.part_name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.storage_location && p.storage_location.toLowerCase().includes(search.toLowerCase()))
  )

  const handleConfirmUse = async () => {
    if (!selectedPart) {
      toast.error('กรุณาเลือกอะไหล่')
      return
    }

    if (quantity <= 0) {
      toast.error('จำนวนต้องมากกว่า 0')
      return
    }

    if (quantity > selectedPart.stock_qty) {
      toast.error(`สต็อกไม่พอ (มีเพียง ${selectedPart.stock_qty} ${selectedPart.unit})`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await useSparePart({
        work_order_id: workOrderId,
        spare_part_id: selectedPart.id,
        quantity,
        technician_name: technicianName || 'ช่างซ่อมบำรุง',
        notes
      })

      if (res.success) {
        toast.success(`ตัดสต็อก ${selectedPart.part_name} จำนวน ${quantity} ${selectedPart.unit} เรียบร้อย`)
        onPartUsed?.()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการตัดสต็อก')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถทำรายการได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg w-full p-6 rounded-3xl bg-white shadow-2xl border border-stone-200">
        <DialogHeader className="text-left space-y-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 border border-amber-300">
            <Package className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-stone-900">
            เบิกและบันทึกการใช้อะไหล่ (+ ใช้อะไหล่)
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            เลือกอะไหล่ที่เปลี่ยนสำหรับเครื่อง {machineCode} ระบบจะตัดสต็อกและบันทึกต้นทุนอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหารหัสอะไหล่, ชื่อ, หรือตำแหน่งเก็บ..."
            className="pl-10 h-10 text-xs bg-stone-50 border-stone-200 rounded-xl"
          />
        </div>

        {/* Parts list */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 mt-2 pr-1 no-scrollbar">
          {isLoading ? (
            <div className="text-center py-6 text-xs text-stone-400">กำลังโหลดรายการอะไหล่...</div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-6 text-xs text-stone-400">ไม่พบอะไหล่ที่ค้นหา</div>
          ) : (
            filteredParts.map(part => {
              const isCompatible = part.compatible_machines?.includes(machineCode)
              const isSelected = selectedPart?.id === part.id
              const isOutOfStock = part.stock_qty <= 0

              return (
                <div
                  key={part.id}
                  onClick={() => !isOutOfStock && setSelectedPart(part)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-[#D4AF37] bg-amber-50/70 shadow-sm ring-1 ring-[#D4AF37]'
                      : isOutOfStock
                      ? 'border-stone-200 bg-stone-100 opacity-50 cursor-not-allowed'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-stone-900">{part.part_code}</span>
                      {isCompatible && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          ตรงรุ่น
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-700 font-medium truncate">{part.part_name}</div>
                    <div className="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5">
                      <span>ตำแหน่ง: {part.storage_location || 'คลังหลัก'}</span>
                      <span>•</span>
                      <span>ราคา: ฿{part.average_cost.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isOutOfStock ? 'bg-red-100 text-red-700' :
                      part.stock_qty <= part.min_stock ? 'bg-amber-100 text-amber-800' :
                      'bg-stone-100 text-stone-800'
                    }`}>
                      คงเหลือ {part.stock_qty} {part.unit}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Selected Part Details & Qty */}
        {selectedPart && (
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-3 mt-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-stone-900">{selectedPart.part_name}</div>
                <div className="text-[11px] text-stone-500 font-mono">{selectedPart.part_code}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#8B7355]">
                  ฿{(selectedPart.average_cost * quantity).toLocaleString()}
                </div>
                <div className="text-[10px] text-stone-400">฿{selectedPart.average_cost}/ชิ้น</div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-stone-600">จำนวนที่ใช้:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-sm text-stone-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(selectedPart.stock_qty, quantity + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-stone-700 hover:bg-stone-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-stone-500 font-medium ml-1">{selectedPart.unit}</span>
              </div>
            </div>

            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม เช่น เปลี่ยนแทนลูกปืนที่แตก"
              className="h-9 text-xs rounded-xl bg-white border-stone-200"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-stone-100">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 text-xs">
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirmUse}
            disabled={!selectedPart || isSubmitting || (selectedPart && selectedPart.stock_qty < quantity)}
            className="flex-1 bg-[#2A2521] hover:bg-stone-800 text-white font-bold text-xs h-10 rounded-xl"
          >
            {isSubmitting ? 'กำลังตัดสต็อก...' : 'ยืนยันตัดสต็อก & บันทึกต้นทุน'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
