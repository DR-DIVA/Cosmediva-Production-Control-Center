'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Wrench, 
  UserCheck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react'
import { MaintenancePMPlan, getPmFrequencyInfo } from '@/types/maintenance'
import { dispatchPMWorkOrder } from '@/app/actions/maintenance'

interface AssignPMTechnicianModalProps {
  isOpen: boolean
  onClose: () => void
  plan: MaintenancePMPlan | null
  onSuccess: () => void
}

const COMMON_TECHNICIANS = [
  'ช่างสมหมาย เก่งการช่าง (ช่างไฟฟ้า & ระบบควบคุม)',
  'ช่างวิชัย ซ่อมไว (ช่างกลโรงงาน & สายการผลิต)',
  'ช่างมานพ เช็คละเอียด (ช่างไฮดรอลิก & นิวเมติกส์)',
  'ช่างธีรศักดิ์ บำรุงดี (ช่างระบบปรับอากาศ & Cleanroom)',
  'ช่างสุรพล เชี่ยวชาญ (ช่างซ่อมบำรุงทั่วไป)',
  'ซัพพลายเออร์ / ทีมบริการภายนอก (Outsource Service)'
]

export default function AssignPMTechnicianModal({
  isOpen,
  onClose,
  plan,
  onSuccess
}: AssignPMTechnicianModalProps) {
  if (!plan) return null

  const freq = getPmFrequencyInfo(plan.frequency_type, plan.frequency_interval)
  const todayStr = new Date().toISOString().split('T')[0]

  const [selectedTech, setSelectedTech] = useState(
    (plan as any).machine?.responsible_technician_name || 'ช่างสมหมาย เก่งการช่าง'
  )
  const [customTech, setCustomTech] = useState('')
  const [targetDate, setTargetDate] = useState(plan.next_due_date || todayStr)
  const [priority, setPriority] = useState('P3_NORMAL')
  const [notes, setNotes] = useState('')
  const [assignedByName, setAssignedByName] = useState('หัวหน้าฝ่ายซ่อมบำรุง')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalTechName = customTech.trim() || selectedTech
    if (!finalTechName.trim()) {
      toast.error('กรุณาระบุหรือเลือกช่างผู้รับผิดชอบ')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await dispatchPMWorkOrder({
        planId: plan.id,
        technicianName: finalTechName,
        targetDate,
        priority,
        notes: notes.trim(),
        assignedByName: assignedByName.trim()
      })

      if (res.success) {
        toast.success(res.message || 'มอบหมายงาน PM สำเร็จ!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการมอบหมายงาน')
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-xl w-[95vw] p-6 rounded-3xl bg-white shadow-2xl border border-stone-200 font-sans">
        <DialogHeader className="text-left border-b border-stone-150 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-stone-900">
                👷 มอบหมายงาน PM ให้ช่างซ่อมบำรุง
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                ออกใบสั่งงาน (Work Order) ประจำงวด พร้อมแจ้งเตือนส่งงานเข้ามือถือช่างทันที
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Machine & Plan Info Box */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                {plan.machine_code}
              </span>
              <span className="font-bold text-stone-800 line-clamp-1">{plan.machine_name}</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border shrink-0 ${freq.color}`}>
              {freq.full}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 pt-1 border-t border-stone-200/60">
            <div>
              <span className="text-stone-400">รหัสแผน PM:</span> <span className="font-mono font-bold text-cyan-700">{plan.plan_code}</span>
            </div>
            <div>
              <span className="text-stone-400">เวลาประมาณการ:</span> <span className="font-bold">{plan.estimated_minutes || 60} นาที</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Technician Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>เลือกช่างซ่อมบำรุงผู้รับผิดชอบ <span className="text-red-500">*</span></span>
            </label>
            <select
              value={selectedTech}
              onChange={e => {
                setSelectedTech(e.target.value)
                setCustomTech('')
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              {COMMON_TECHNICIANS.map(t => (
                <option key={t} value={t.split(' ')[0] + ' ' + t.split(' ')[1]}>
                  {t}
                </option>
              ))}
              <option value="__CUSTOM__">-- พิมพ์ระบุชื่อช่างคนอื่น / ผู้รับเหมาภายนอก --</option>
            </select>

            {selectedTech === '__CUSTOM__' && (
              <Input
                type="text"
                placeholder="พิมพ์ชื่อช่างผู้รับผิดชอบ..."
                value={customTech}
                onChange={e => setCustomTech(e.target.value)}
                className="mt-2 text-xs"
                autoFocus
                required
              />
            )}
          </div>

          {/* Date & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-600" />
                <span>วันกำหนดเข้าทำ (Target Date)</span>
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-600" />
                <span>ระดับความสำคัญ (Priority)</span>
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="P2_URGENT">🟡 P2 - เร่งด่วน (Urgent)</option>
                <option value="P3_NORMAL">🟢 P3 - ปานกลาง / ตามรอบปกติ (Normal)</option>
                <option value="P4_LOW">⚪ P4 - รอได้ (Low)</option>
              </select>
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>คำสั่งการ / ข้อกำหนดเฉพาะเครื่อง (Instructions)</span>
            </label>
            <textarea
              rows={2}
              placeholder="ระบุคำสั่งการเฉพาะ เช่น นัดหยุดเครื่องกับหัวหน้าผลิตเวลา 17:00, เตรียมน้ำมันหล่อลื่น Food Grade..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Assigned by */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800">
              ชื่อหัวหน้าผู้สั่งการ / มอบหมายงาน:
            </label>
            <Input
              type="text"
              value={assignedByName}
              onChange={e => setAssignedByName(e.target.value)}
              placeholder="เช่น หัวหน้าฝ่ายซ่อมบำรุง / วิศวกรโรงงาน"
              className="text-xs"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-150">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึกมอบหมายงาน...' : 'ยืนยันมอบหมายงาน & ออกใบสั่งงาน'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
