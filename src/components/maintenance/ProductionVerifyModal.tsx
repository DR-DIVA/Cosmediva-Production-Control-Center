'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { transitionWorkOrderStatus } from '@/app/actions/maintenance'
import NameAutocompleteInput from '@/components/maintenance/NameAutocompleteInput'
import { getSavedUserName, saveUserName, isGenericPlaceholder } from '@/lib/userMemory'

interface ProductionVerifyModalProps {
  isOpen: boolean
  onClose: () => void
  workOrderId: string
  machineCode: string
  machineName: string
  defaultVerifierName?: string
  onSuccess?: () => void
}

export default function ProductionVerifyModal({
  isOpen,
  onClose,
  workOrderId,
  machineCode,
  machineName,
  defaultVerifierName,
  onSuccess
}: ProductionVerifyModalProps) {
  const [decision, setDecision] = useState<'PASS' | 'FAIL'>('PASS')
  const [verifierName, setVerifierName] = useState(() => {
    return getSavedUserName(defaultVerifierName || 'เบ็ญจพร พูลสวัสดิ์')
  })
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync saved user name if state is empty or generic
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedUserName(defaultVerifierName || '')
      if (saved && (!verifierName || isGenericPlaceholder(verifierName))) {
        setVerifierName(saved)
      }
    }
  }, [isOpen, defaultVerifierName])

  const handleVerify = async () => {
    if (!verifierName.trim() || isGenericPlaceholder(verifierName)) {
      toast.error('กรุณาระบุชื่อ-นามสกุลของผู้ทดสอบและยืนยัน')
      return
    }

    setIsSubmitting(true)
    try {
      saveUserName(verifierName)

      const res = await transitionWorkOrderStatus({
        work_order_id: workOrderId,
        to_status: decision === 'PASS' ? 'VERIFIED' : 'IN_PROGRESS',
        changed_by_name: verifierName.trim(),
        verification_status: decision,
        notes: decision === 'PASS' 
          ? (notes || 'ทดสอบเดินเครื่องเรียบร้อย ทำงานได้ตามสเปกปกติ') 
          : (notes || 'เครื่องยังมีปัญหา อาการยังไม่หาย ส่งกลับให้ช่างแก้ไขต่อ')
      })

      if (res.success) {
        if (decision === 'PASS') {
          toast.success(`ยืนยันเครื่องจักร ${machineCode} ผ่านการทดสอบเรียบร้อย! เครื่องกลับสู่สถานะ Running`)
        } else {
          toast.error(`ส่งงานกลับไปที่ช่างซ่อมบำรุงแล้ว (สถานะ In Progress)`)
        }
        onSuccess?.()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการยืนยัน')
      }
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถส่งข้อมูลได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-6 rounded-3xl bg-white shadow-2xl border border-stone-200">
        <DialogHeader className="text-left space-y-1">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#8B7355] border border-[#D4AF37]/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-stone-900">
            ผู้แจ้งซ่อมตรวจรับผลงาน (Verification Sign-Off)
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            เครื่อง {machineCode} - {machineName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Decision Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDecision('PASS')}
              className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1.5 ${
                decision === 'PASS'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <CheckCircle2 className={`w-7 h-7 ${decision === 'PASS' ? 'text-emerald-600' : 'text-stone-400'}`} />
              <span className="font-bold text-xs">PASS — ใช้งานได้ปกติ</span>
              <span className="text-[10px] text-stone-500">เครื่องเดินเรียบร้อย ปิดงานซ่อม</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision('FAIL')}
              className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1.5 ${
                decision === 'FAIL'
                  ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-md ring-2 ring-rose-500/20'
                  : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <XCircle className={`w-7 h-7 ${decision === 'FAIL' ? 'text-rose-600' : 'text-stone-400'}`} />
              <span className="font-bold text-xs">FAIL — ยังพบปัญหา</span>
              <span className="text-[10px] text-stone-500">ส่งช่างซ่อมต่อ ห้ามปิดงาน</span>
            </button>
          </div>

          {/* Verifier Name */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700">ชื่อผู้ทดสอบและยืนยัน (ฝ่ายผลิต):</label>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                ดึงจาก Master Data
              </span>
            </div>
            <NameAutocompleteInput
              id="verifier-name-input"
              value={verifierName}
              onChange={setVerifierName}
              placeholder="พิมพ์ชื่อหรือรหัสพนักงาน เช่น เบ็ญจพร, pkbjp518..."
              className="h-10 text-xs rounded-xl bg-stone-50 border-stone-300 font-medium"
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">หมายเหตุ / ผลการเดินเครื่องทดสอบ:</label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={decision === 'PASS' ? 'เดินเครื่องทดสอบ 15 นาที อัตราการจ่ายครีมปกติ' : 'อธิบายอาการที่ยังหลงเหลือ'}
              className="h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-stone-100 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 text-xs">
            ยกเลิก
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isSubmitting}
            className={`flex-1 font-bold text-xs h-11 rounded-xl text-white ${
              decision === 'PASS'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/20'
            }`}
          >
            {isSubmitting ? 'กำลังบันทึก...' : decision === 'PASS' ? 'ยืนยัน PASS & คืนเครื่องจักร' : 'ยืนยัน FAIL ส่งซ่อมต่อ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
