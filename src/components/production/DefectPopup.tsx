'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { saveDefect } from '@/app/actions/defects'

interface DefectPopupProps {
  lotId: string
  processId: string
  processName: string
}

export function DefectPopup({ lotId, processId, processName }: DefectPopupProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [defectReason, setDefectReason] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('ชิ้น')

  const handleSubmit = async () => {
    if (!defectReason || !quantity || !unit) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    setLoading(true)
    try {
      const res = await saveDefect({
        lot_id: lotId,
        process_id: processId,
        defect_reason: defectReason,
        quantity: Number(quantity),
        unit
      })

      if (res.success) {
        toast.success('บันทึกของเสียสำเร็จ')
        setOpen(false)
        setDefectReason('')
        setQuantity('')
      } else {
        toast.error('บันทึกล้มเหลว: ' + res.error)
      }
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-8 px-3 ml-2">
        <AlertTriangle className="mr-2 h-4 w-4" />
        แจ้งของเสีย
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            บันทึกของเสีย (แผนก {processName})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">สาเหตุ / อาการของเสีย</label>
            <Input 
              placeholder="เช่น บรรจุภัณฑ์แตก, เนื้อครีมแยกชั้น, ซีลไม่ติด..."
              value={defectReason}
              onChange={(e) => setDefectReason(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">จำนวน</label>
              <Input 
                type="number" 
                min="0"
                step="0.01"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">หน่วย</label>
              <Select value={unit} onValueChange={(val) => setUnit(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหน่วย" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ชิ้น">ชิ้น (Pieces)</SelectItem>
                  <SelectItem value="kg">กิโลกรัม (KG)</SelectItem>
                  <SelectItem value="กรัม">กรัม (g)</SelectItem>
                  <SelectItem value="ลัง">ลัง (Cartons)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ยืนยันการบันทึก
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
