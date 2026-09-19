'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldAlert, Layers, MapPin, CheckCircle2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { MaintenanceSparePart } from '@/types/maintenance'
import { updateSparePartSafetyStock } from '@/app/actions/maintenance'

interface EditSafetyStockModalProps {
  part: MaintenanceSparePart | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function EditSafetyStockModal({
  part,
  isOpen,
  onClose,
  onSuccess
}: EditSafetyStockModalProps) {
  const [minStock, setMinStock] = useState('')
  const [reorderPoint, setReorderPoint] = useState('')
  const [maxStock, setMaxStock] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (part) {
      setMinStock(String(part.min_stock ?? 1))
      setReorderPoint(String(part.reorder_point ?? 2))
      setMaxStock(String(part.max_stock ?? 10))
      setStorageLocation(part.storage_location || '')
    }
  }, [part, isOpen])

  if (!part) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const minVal = parseFloat(minStock)
    if (isNaN(minVal) || minVal < 0) {
      toast.error('กรุณาระบุจำนวน Safety Stock ให้ถูกต้อง (ไม่ต่ำกว่า 0)')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await updateSparePartSafetyStock(part.id, {
        min_stock: minVal,
        reorder_point: parseFloat(reorderPoint) || minVal * 1.5,
        max_stock: parseFloat(maxStock) || minVal * 5,
        storage_location: storageLocation.trim()
      })

      if (res.success) {
        toast.success(`อัปเดต Safety Stock ของอะไหล่ ${part.part_code} เป็น ${minVal} ${part.unit} สำเร็จ!`)
        onSuccess?.()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถบันทึกได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] p-6 rounded-3xl bg-white shadow-2xl border border-stone-200">
        <DialogHeader className="text-left space-y-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 border border-amber-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-black text-stone-900">
            กำหนดจำนวนขั้นต่ำ Safety Stock
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            ตั้งค่าจุดแจ้งเตือนสั่งซื้อใหม่และสต็อกปลอดภัย เพื่อป้องกันอะไหล่ขาดแคลน
          </DialogDescription>
        </DialogHeader>

        {/* Part Quick Info */}
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-stone-600">{part.part_code}</span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
              part.stock_qty <= 1 ? 'bg-red-100 text-red-800 animate-pulse' :
              part.stock_qty <= part.min_stock ? 'bg-amber-100 text-amber-900' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              คงเหลือ: {part.stock_qty} {part.unit}
            </span>
          </div>
          <div className="font-bold text-stone-900 line-clamp-1">{part.part_name}</div>
          <div className="text-[11px] text-stone-500">{part.category} • {part.storage_location || 'คลังกลาง'}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
          <div>
            <label className="text-xs font-bold text-stone-800 block mb-1">
              จำนวนขั้นต่ำที่ต้องขอซื้อ / Safety Stock ({part.unit}) *
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={minStock}
              onChange={e => setMinStock(e.target.value)}
              placeholder="เช่น 2"
              className="h-10 text-sm font-bold font-mono rounded-xl bg-amber-50/50 border-amber-300 text-amber-950 focus:ring-amber-500"
              required
            />
            <span className="text-[10px] text-stone-500 mt-1 block">
              เมื่อสต๊อกลดลงเหลือเท่ากับหรือต่ำกว่าจำนวนนี้ ระบบจะขึ้นแจ้งเตือนสต๊อกต่ำและปุ่มเปิด PR ทันที
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                จุดสั่งซื้อซ้ำ (Reorder Point)
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                value={reorderPoint}
                onChange={e => setReorderPoint(e.target.value)}
                placeholder="เช่น 3"
                className="h-9 text-xs font-mono rounded-xl bg-stone-50 border-stone-300"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                สต๊อกสูงสุด (Max Stock)
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                value={maxStock}
                onChange={e => setMaxStock(e.target.value)}
                placeholder="เช่น 10"
                className="h-9 text-xs font-mono rounded-xl bg-stone-50 border-stone-300"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              <span>ตำแหน่งจัดเก็บในคลัง (Storage Location)</span>
            </label>
            <Input
              value={storageLocation}
              onChange={e => setStorageLocation(e.target.value)}
              placeholder="เช่น Shelf A2-01, ตู้เก็บอะไหล่ 1"
              className="h-9 text-xs rounded-xl bg-stone-50 border-stone-300"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-stone-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-1 text-xs rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#2A2521] hover:bg-stone-800 text-white font-bold text-xs h-10 rounded-xl shadow-md flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก Safety Stock'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
