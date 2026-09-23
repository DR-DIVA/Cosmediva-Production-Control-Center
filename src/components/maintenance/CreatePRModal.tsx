'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ShoppingCart, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  ExternalLink,
  Building,
  DollarSign,
  Copy,
  Sparkles,
  ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { MaintenanceSparePart } from '@/types/maintenance'
import { createSparePartPR } from '@/app/actions/maintenance'
import NameAutocompleteInput from '@/components/maintenance/NameAutocompleteInput'
import { getSavedUserName, saveUserName } from '@/lib/userMemory'

interface CreatePRModalProps {
  part: MaintenanceSparePart | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function CreatePRModal({
  part,
  isOpen,
  onClose,
  onSuccess
}: CreatePRModalProps) {
  const [prNo, setPrNo] = useState('')
  const [quantity, setQuantity] = useState('')
  const [supplier, setSupplier] = useState('')
  const [reason, setReason] = useState('')
  const [requesterName, setRequesterName] = useState(() => getSavedUserName(''))
  const [departmentName, setDepartmentName] = useState('ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)')
  const [dccFormCode, setDccFormCode] = useState('FM-PUR-001 (แบบฟอร์มขอซื้อวัสดุ/อะไหล่)')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [createdPrData, setCreatedPrData] = useState<any>(null)

  useEffect(() => {
    if (part) {
      // Auto-generate PR Number
      const now = new Date()
      const yy = String(now.getFullYear()).slice(-2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const randSeq = Math.floor(1000 + Math.random() * 9000)
      const generatedPrNo = `PR-MT${yy}${mm}-${randSeq}`
      setPrNo(generatedPrNo)

      // Recommended quantity: if max_stock set, replenish to max_stock, else min_stock * 2
      const recQty = part.max_stock > part.stock_qty
        ? (part.max_stock - part.stock_qty)
        : Math.max(part.min_stock * 2, 2)
      setQuantity(String(recQty))

      setSupplier(part.supplier || '')

      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('cosmeflow_user_name') : ''
      setRequesterName(savedUser || 'หัวหน้าช่างซ่อมบำรุง')

      // Reason default
      const urgencyText = part.stock_qty <= 1
        ? '⚠️ อะไหล่เหลือชิ้นสุดท้าย (Critical Stock)'
        : `⚠️ สต๊อกต่ำกว่า Safety Stock (คงเหลือ ${part.stock_qty} / ขั้นต่ำ ${part.min_stock} ${part.unit})`
      setReason(`ขออนุมัติสั่งซื้อ ${part.part_name} เนื่องจาก${urgencyText} จำเป็นต้องจัดซื้อเติมสต๊อกเพื่อรองรับงาน PM และป้องกันเครื่องจักรหยุดเดินระบบ`)

      setIsCreated(false)
      setCreatedPrData(null)
    }
  }, [part, isOpen])

  if (!part) return null

  const unitCost = Number(part.average_cost || part.last_purchase_price || 0)
  const orderQty = parseFloat(quantity) || 0
  const estimatedTotal = orderQty * unitCost

  const isCriticalStock = part.stock_qty <= 1
  const isBelowSafety = part.stock_qty <= part.min_stock

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault()

    if (orderQty <= 0) {
      toast.error('กรุณาระบุจำนวนที่ต้องการขอซื้อมากกว่า 0')
      return
    }

    if (!requesterName.trim()) {
      toast.error('กรุณาระบุชื่อผู้ขอซื้อ')
      return
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('cosmeflow_user_name', requesterName.trim())
    }

    setIsSubmitting(true)
    try {
      const res = await createSparePartPR({
        partId: part.id,
        partCode: part.part_code,
        partName: part.part_name,
        quantity: orderQty,
        unit: part.unit,
        estimatedCost: estimatedTotal,
        supplier: supplier.trim(),
        reason: reason.trim(),
        requesterName: requesterName.trim(),
        dccFormRef: dccFormCode
      })

      if (res.success && res.data) {
        setCreatedPrData(res.data)
        setIsCreated(true)
        toast.success(`เปิดคำขอซื้อ ${res.data.prNo} เข้าระบบเรียบร้อยแล้ว!`)
        onSuccess?.()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก PR')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถบันทึก PR ได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintPR = () => {
    const printWindow = window.open('', '', 'width=850,height=900')
    if (!printWindow) return

    const nowStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    printWindow.document.write(`
      <html>
        <head>
          <title>ใบขอซื้ออะไหล่ (PR) - ${prNo}</title>
          <style>
            body { font-family: 'Sarabun', sans-serif; margin: 30px; color: #111; line-height: 1.4; }
            .header { border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .company { font-size: 20px; font-weight: bold; }
            .doc-title { font-size: 16px; font-weight: bold; margin-top: 4px; color: #8B7355; }
            .meta-box { border: 1px solid #ccc; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th, td { border: 1px solid #222; padding: 8px 10px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { font-weight: bold; background: #fafafa; }
            .reason-box { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 13px; background: #f9fafb; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; text-align: center; font-size: 13px; }
            .sig-line { border-bottom: 1px dotted #444; height: 50px; margin-bottom: 6px; }
            .footer-tag { margin-top: 30px; font-size: 11px; color: #888; text-align: center; border-top: 1px dashed #ccc; padding-top: 10px; }
            @media print { body { margin: 15mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">COSMEDIVA MANUFACTURING CO., LTD.</div>
              <div class="doc-title">ใบขอซื้ออะไหล่และอุปกรณ์ซ่อมบำรุง (PURCHASE REQUISITION - PR)</div>
              <div style="font-size: 12px; color: #666; margin-top: 2px;">อ้างอิงมาตรฐาน DCC: ${dccFormCode}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: bold; font-family: monospace;">${prNo}</div>
              <div style="font-size: 12px; color: #555;">วันที่ขอซื้อ: ${nowStr}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="grid">
              <div><b>แผนกผู้ขอซื้อ:</b> ${departmentName}</div>
              <div><b>ผู้ขอซื้อ:</b> ${requesterName}</div>
              <div><b>ผู้จำหน่ายที่แนะนำ:</b> ${supplier || 'ฝ่ายจัดซื้อสรรหา'}</div>
              <div><b>ความเร่งด่วน:</b> ${isCriticalStock ? '🚨 ด่วนฉุกเฉิน (ชิ้นสุดท้าย/หมด)' : isBelowSafety ? '⚠️ เร่งด่วน (ต่ำกว่า Safety Stock)' : 'ปกติ (รอบประจำ)'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 40px;">ลำดับ</th>
                <th style="width: 110px;">รหัสอะไหล่</th>
                <th>รายการอะไหล่ / สเปก</th>
                <th class="text-center" style="width: 70px;">สต๊อกปัจจุบัน</th>
                <th class="text-center" style="width: 70px;">Safety Stock</th>
                <th class="text-center" style="width: 80px;">จำนวนขอซื้อ</th>
                <th class="text-right" style="width: 90px;">ราคา/หน่วย</th>
                <th class="text-right" style="width: 100px;">รวมเป็นเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center">1</td>
                <td style="font-family: monospace; font-weight: bold;">${part.part_code}</td>
                <td>
                  <b>${part.part_name}</b><br/>
                  <span style="font-size: 11px; color: #555;">${part.specification || part.model || '-'}</span>
                </td>
                <td class="text-center" style="color: ${part.stock_qty <= 1 ? '#dc2626' : '#111'}; font-weight: bold;">${part.stock_qty} ${part.unit}</td>
                <td class="text-center">${part.min_stock} ${part.unit}</td>
                <td class="text-center" style="font-weight: bold; font-size: 14px;">${orderQty} ${part.unit}</td>
                <td class="text-right">฿${unitCost.toLocaleString()}</td>
                <td class="text-right font-bold">฿${estimatedTotal.toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td colspan="7" class="text-right">ยอดรวมมูลค่าประมาณการทั้งสิ้น (Estimated Total):</td>
                <td class="text-right" style="font-size: 14px; color: #8B7355;">฿${estimatedTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="reason-box">
            <b>วัตถุประสงค์และเหตุผลความจำเป็นในการสั่งซื้อ:</b><br/>
            ${reason}
          </div>

          <div class="signatures">
            <div>
              <div class="sig-line"></div>
              <div><b>ผู้ขอซื้อ (Requester)</b></div>
              <div style="font-size: 11px; color: #666;">(${requesterName})</div>
              <div style="font-size: 11px; color: #888;">วันที่: ..../..../........</div>
            </div>

            <div>
              <div class="sig-line"></div>
              <div><b>ผู้จัดการแผนก / ผู้อนุมัติ (Manager)</b></div>
              <div style="font-size: 11px; color: #666;">(............................................)</div>
              <div style="font-size: 11px; color: #888;">วันที่: ..../..../........</div>
            </div>

            <div>
              <div class="sig-line"></div>
              <div><b>เจ้าหน้าที่จัดซื้อ (Purchasing Officer)</b></div>
              <div style="font-size: 11px; color: #666;">(............................................)</div>
              <div style="font-size: 11px; color: #888;">วันที่: ..../..../........</div>
            </div>
          </div>

          <div class="footer-tag">
            CosmeFlow CMMS • Document Controlled Record • DCC Link Ready • ระบบออกใบขอซื้ออัตโนมัติ
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleCopyPRSummary = () => {
    const text = `[ใบขอซื้ออะไหล่ PR]\nเลขที่: ${prNo}\nรหัส: ${part.part_code}\nรายการ: ${part.part_name}\nจำนวน: ${orderQty} ${part.unit}\nคงเหลือปัจจุบัน: ${part.stock_qty} (Safety Stock: ${part.min_stock})\nมูลค่าประมาณการ: ฿${estimatedTotal.toLocaleString()}\nผู้ขอซื้อ: ${requesterName} (${departmentName})\nเหตุผล: ${reason}\nอ้างอิง DCC: ${dccFormCode}`
    navigator.clipboard.writeText(text)
    toast.success('คัดลอกข้อมูลใบขอซื้อ PR เรียบร้อยแล้ว (พร้อมส่งต่อ Line / Email / DCC)')
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl w-[95vw] p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 border border-amber-300">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-stone-900">
                  เปิดใบขอซื้ออะไหล่ (Purchase Requisition - PR)
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 font-mono">
                  เลขที่อัตโนมัติ: <b className="text-stone-800">{prNo}</b>
                </DialogDescription>
              </div>
            </div>

            {isCriticalStock ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 animate-pulse">
                🚨 เหลือชิ้นสุดท้าย!
              </span>
            ) : isBelowSafety ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                ⚠️ ต่ำกว่า Safety Stock
              </span>
            ) : null}
          </div>
        </DialogHeader>

        {isCreated ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">บันทึกเปิด PR สำเร็จแล้ว!</h3>
              <p className="text-xs text-stone-500 font-mono mt-1">
                เลขที่: <b className="text-emerald-700 text-sm">{createdPrData?.prNo || prNo}</b>
              </p>
              <p className="text-xs text-stone-600 mt-2">
                ส่งคำขอซื้ออะไหล่ <b>{part.part_name}</b> จำนวน <b>{orderQty} {part.unit}</b> เข้าระบบแล้ว
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-left text-xs space-y-1.5 max-w-lg mx-auto">
              <span className="font-bold text-purple-950 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-700" />
                <span>สถานะการเชื่อมต่อ DCC:</span>
              </span>
              <p className="text-[11px] text-purple-800">
                คำขอซื้อนี้พร้อมเชื่อมโยงเข้าสู่แบบฟอร์มขอซื้อมาตรฐานของฝ่าย DCC ทันทีที่ระบบเปิดใช้งาน E-Form
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                onClick={handlePrintPR}
                className="bg-[#2A2521] hover:bg-stone-800 text-white text-xs font-bold rounded-xl h-10 px-4 flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>พิมพ์ใบขอซื้อ PR (PDF)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyPRSummary}
                className="text-xs font-bold rounded-xl h-10 px-4 flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>คัดลอกข้อมูลสรุป</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-xs rounded-xl h-10 px-4"
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </div>
        ) : (
          /* PR Form */
          <form onSubmit={handleCreatePR} className="space-y-4 mt-2">
            {/* Spare Part Snapshot Card */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-xs text-stone-500 block">{part.part_code}</span>
                  <h3 className="font-bold text-sm text-stone-900">{part.part_name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-stone-400 block">คงเหลือปัจจุบัน</span>
                  <span className={`text-base font-black ${isCriticalStock ? 'text-red-600' : isBelowSafety ? 'text-amber-700' : 'text-stone-900'}`}>
                    {part.stock_qty} {part.unit}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/60 text-[11px]">
                <div>
                  <span className="text-stone-400 block">Safety Stock:</span>
                  <span className="font-bold text-stone-800">{part.min_stock} {part.unit}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Max Stock:</span>
                  <span className="font-bold text-stone-800">{part.max_stock} {part.unit}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">ราคาเฉลี่ย:</span>
                  <span className="font-bold text-[#8B7355]">฿{unitCost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">ที่จัดเก็บ:</span>
                  <span className="font-medium text-stone-700">{part.storage_location || 'คลังกลาง'}</span>
                </div>
              </div>
            </div>

            {/* Order Quantity & Estimated Total */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  จำนวนที่ต้องการขอซื้อ ({part.unit}) *
                </label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="h-10 text-base font-black font-mono rounded-xl bg-amber-50/60 border-amber-300 text-amber-950 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  ราคาต่อหน่วยโดยประมาณ (฿)
                </label>
                <div className="h-10 px-3 rounded-xl bg-stone-100 border border-stone-200 flex items-center font-mono font-bold text-stone-800 text-xs">
                  ฿{unitCost.toLocaleString()} / {part.unit}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  ยอดรวมมูลค่าประมาณการ (฿)
                </label>
                <div className="h-10 px-3 rounded-xl bg-stone-900 text-white border border-stone-900 flex items-center font-mono font-black text-sm text-[#D4AF37]">
                  ฿{estimatedTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Supplier & Requester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  ผู้จำหน่ายที่แนะนำ (Supplier)
                </label>
                <Input
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="เช่น บจก. พีเอ็นพี, อุดมทรัพย์ (หรือฝ่ายจัดซื้อสรรหา)"
                  className="h-10 text-xs rounded-xl bg-stone-50 border-stone-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  ชื่อผู้ขอซื้อ (Requester) *
                </label>
                <NameAutocompleteInput
                  id="pr-requester-name"
                  value={requesterName}
                  onChange={setRequesterName}
                  placeholder="พิมพ์ชื่อผู้ขอซื้อ เช่น เบ็ญจพร พูลสวัสดิ์..."
                  className="h-10 text-xs rounded-xl bg-stone-50 border-stone-300 font-bold"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                วัตถุประสงค์ / เหตุผลความจำเป็นในการขอซื้อ
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="ระบุเหตุผลความจำเป็นในการสั่งซื้ออะไหล่รายการนี้..."
                className="w-full p-2.5 text-xs rounded-xl bg-stone-50 border border-stone-300 font-sans text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            {/* DCC INTEGRATION SECTION (แบบฟอร์มที่จะลิงก์จาก DCC ในภายหลัง) */}
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-700" />
                  <span>ส่วนเชื่อมโยงแบบฟอร์มจาก DCC (DCC E-Form Ready)</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-purple-200 text-purple-950 px-2 py-0.5 rounded-md">
                  READY FOR DCC LINK
                </span>
              </div>
              <p className="text-[11px] text-purple-800">
                ระบบจัดเตรียมข้อมูล PR นี้ตามโครงสร้างเอกสารควบคุมของโรงงาน เมื่อฝ่าย DCC เชื่อมโยงแบบฟอร์มขอซื้อทางการเข้ามา สามารถกดส่งต่อข้อมูลเข้าสู่ DCC E-Form Workflow ได้ทันที
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-purple-700 font-medium">รหัสแบบฟอร์มอ้างอิง DCC:</span>
                <span className="font-mono font-bold text-purple-900 bg-white px-2.5 py-0.5 rounded-md border border-purple-200">
                  {dccFormCode}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs rounded-xl"
              >
                ยกเลิก
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPR}
                  className="text-xs font-bold rounded-xl h-10 px-3 border-stone-300 flex items-center gap-1.5"
                  title="พิมพ์ตัวอย่างใบขอซื้อ PR"
                >
                  <Printer className="w-4 h-4 text-stone-600" />
                  <span>พิมพ์ใบ PR</span>
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[#2A2521] to-[#3A332B] hover:bg-stone-800 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
                  <span>{isSubmitting ? 'กำลังบันทึก...' : '🚀 ยืนยันเปิด PR ขอซื้อ'}</span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
