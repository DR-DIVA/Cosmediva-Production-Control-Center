'use client'

import React, { useState } from 'react'
import { 
  FileEdit, Plus, CheckCircle2, Clock, AlertTriangle, 
  ArrowRight, ShieldCheck, UserCheck, Layers, FileCheck, X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DCCDarRequest, DCC_DEPARTMENTS, DCC_STREAMS } from '@/types/dcc'
import { submitDCCDarRequest } from '@/app/actions/dcc'
import { toast } from 'sonner'

interface DCCDarWorkflowProps {
  requests: DCCDarRequest[]
}

export default function DCCDarWorkflow({ requests: initialRequests }: DCCDarWorkflowProps) {
  const [requests, setRequests] = useState<DCCDarRequest[]>(initialRequests)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedDar, setSelectedDar] = useState<DCCDarRequest | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [requestType, setRequestType] = useState<'NEW' | 'REVISE' | 'CANCEL'>('REVISE')
  const [docCode, setDocCode] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [deptCode, setDeptCode] = useState('MT')
  const [currentRev, setCurrentRev] = useState('00')
  const [proposedRev, setProposedRev] = useState('01')
  const [reason, setReason] = useState('')
  const [initiator, setInitiator] = useState('หัวหน้างาน')
  const [targetDate, setTargetDate] = useState('2026-04-01')
  const [trainingRequired, setTrainingRequired] = useState(true)

  const selectedDeptObj = DCC_DEPARTMENTS.find(d => d.code === deptCode)
  const streamCode = selectedDeptObj?.streamCode || 'OMS'

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docCode.trim() || !docTitle.trim() || !reason.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน (รหัสเอกสาร, ชื่อเอกสาร, และเหตุผลการขอจัดทำ/แก้ไข)')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitDCCDarRequest({
        requestType,
        docCode,
        docTitle,
        departmentCode: deptCode,
        streamCode,
        currentRev,
        proposedRev,
        reasonForChange: reason,
        initiatorName: initiator,
        effectiveTargetDate: targetDate,
        trainingRequired
      })

      if (res.success && res.data) {
        setRequests([res.data, ...requests])
        toast.success(`ยื่นคำขอ ${res.data.darNumber} เข้าสู่ระบบ DCC เรียบร้อยแล้ว`)
        setIsNewModalOpen(false)
        // Reset form
        setDocCode('')
        setDocTitle('')
        setReason('')
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งคำขอ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Description & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-stone-950 flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-[#D4AF37]" />
            ศูนย์ขอจัดทำ ทบทวน และอนุมัติเอกสารดิจิทัล (E-DAR Workflow)
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Dynamic Approval Flow: <b>ผู้จัดทำ (Initiator)</b> ⟶ <b>ผู้ทบทวนหน้างาน (Reviewer)</b> ⟶ <b>DCC ตรวจ Format/Code</b> ⟶ <b>ผู้อนุมัติขั้นสุดท้าย (QA Manager / Plant Director - PDT)</b>
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          <span>ยื่นขอจัดทำ / แก้ไขเอกสาร (New DAR)</span>
        </Button>
      </div>

      {/* Dynamic 4-Step Flow Indicator Graphic */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
        <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2.5">
          ขั้นตอนการอนุมัติวงจรชีวิตเอกสารตามมาตรฐาน ISO 9001:2026 & ISO 22716
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-stone-200 relative shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-stone-800 mb-1">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">1</span>
              <span>ผู้จัดทำ (Initiator)</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              ยกร่างเอกสาร DP / WI / Form พร้อมระบุเหตุผลการเปลี่ยนแปลง
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-stone-200 relative shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-stone-800 mb-1">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">2</span>
              <span>ผู้ทบทวนหน้างาน (Reviewer)</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              หัวหน้าแผนก/วิศวกร ทบทวนความสอดคล้องกับหน้างานจริง
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-stone-200 relative shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-stone-800 mb-1">
              <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">3</span>
              <span>DCC Officer</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              ตรวจรหัสเอกสาร รูปแบบเล่ม และความเชื่อมโยงกับ Master List
            </p>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 relative shadow-2xs">
            <div className="flex items-center gap-2 font-black text-amber-950 mb-1">
              <span className="w-5 h-5 rounded-full bg-[#8B7355] text-white flex items-center justify-center text-[10px]">4</span>
              <span>Plant Director (PDT)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              ผู้อนุมัติขั้นสุดท้าย / QA Manager ลงนามอิเล็กทรอนิกส์
            </p>
          </div>
        </div>
      </div>

      {/* DAR Requests Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">เลขที่ DAR</th>
                <th className="py-3 px-3">ประเภทคำขอ</th>
                <th className="py-3 px-4">รหัส & ชื่อเอกสาร</th>
                <th className="py-3 px-3">แผนก</th>
                <th className="py-3 px-3 text-center">Rev. เก่า ➔ ใหม่</th>
                <th className="py-3 px-3">ผู้ขอยื่น</th>
                <th className="py-3 px-3">สถานะ Flow ปัจจุบัน</th>
                <th className="py-3 px-4 text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {requests.map(dar => (
                <tr key={dar.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-stone-950 whitespace-nowrap">
                    {dar.darNumber}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dar.requestType === 'NEW' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      dar.requestType === 'REVISE' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {dar.requestType === 'NEW' && 'จัดทำใหม่'}
                      {dar.requestType === 'REVISE' && 'ขอแก้ไข'}
                      {dar.requestType === 'CANCEL' && 'ขอยกเลิก'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <span className="font-mono text-stone-700">{dar.docCode}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 truncate max-w-[280px]">
                      {dar.docTitle}
                    </p>
                  </td>
                  <td className="py-3 px-3 font-bold text-stone-800 whitespace-nowrap">
                    {dar.departmentCode}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold whitespace-nowrap">
                    <span className="text-stone-500">{dar.currentRev}</span>
                    <span className="text-stone-400 mx-1">➔</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{dar.proposedRev}</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-medium text-stone-800">{dar.initiatorName}</div>
                    <div className="text-[10px] font-mono text-stone-400">{dar.initiatorDate}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {dar.status === 'EFFECTIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ประกาศใช้แล้ว (Effective)
                      </span>
                    ) : dar.status === 'DCC_CHECKING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                        <Clock className="w-3 h-3 text-purple-600" />
                        DCC กำลังตรวจรูปแบบ
                      </span>
                    ) : dar.status === 'REVIEWING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        <Clock className="w-3 h-3 text-amber-600" />
                        รอทบทวนหน้างาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-bold text-[10px]">
                        {dar.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDar(dar)}
                      className="h-7 text-xs border-stone-300 hover:bg-stone-100"
                    >
                      ดู Flow
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New DAR Dialog */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-xl bg-white text-stone-900">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-stone-950 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#D4AF37]" />
              ยื่นใบขอจัดทำ / แก้ไขเอกสาร (Electronic DAR)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitNew} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-stone-700 text-xs font-bold">ประเภทคำขอ</Label>
                <select
                  value={requestType}
                  onChange={e => setRequestType(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                >
                  <option value="REVISE">ขอแก้ไขปรับปรุง (Revise)</option>
                  <option value="NEW">ขอจัดทำเอกสารใหม่ (New Document)</option>
                  <option value="CANCEL">ขอยกเลิกเอกสาร (Cancel/Obsolete)</option>
                </select>
              </div>

              <div>
                <Label className="text-stone-700 text-xs font-bold">แผนกเจ้าของเอกสาร (20 แผนก)</Label>
                <select
                  value={deptCode}
                  onChange={e => setDeptCode(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                >
                  {DCC_DEPARTMENTS.map(d => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {d.nameTh} ({d.streamCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-stone-700 text-xs font-bold">รหัสเอกสาร</Label>
                <Input
                  placeholder="เช่น DP-MT-002"
                  value={docCode}
                  onChange={e => setDocCode(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label className="text-stone-700 text-xs font-bold">ชื่อเอกสารมาตรฐาน (ไทย)</Label>
                <Input
                  placeholder="เช่น ระเบียบปฏิบัติงานการตรวจสอบ..."
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-stone-700 text-xs font-bold">Rev. ปัจจุบัน</Label>
                <Input
                  value={currentRev}
                  onChange={e => setCurrentRev(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-stone-700 text-xs font-bold">Rev. ที่ขอเสนอ</Label>
                <Input
                  value={proposedRev}
                  onChange={e => setProposedRev(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-stone-700 text-xs font-bold">วันที่มีผลเป้าหมาย</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-stone-700 text-xs font-bold">เหตุผลและความจำเป็นในการขอเปลี่ยนแปลง</Label>
              <Textarea
                placeholder="ระบุสาเหตุ เช่น เพื่อปรับปรุงตามข้อกำหนด ISO 22716, ปรับปรุงตามข้อเสนอแนะ Auditor..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="mt-1 text-xs h-20"
                required
              />
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-800 block text-xs">กำหนดการฝึกอบรม (Training Gatekeeper)</span>
                <span className="text-[11px] text-stone-500">ต้องอบรมพนักงานให้ผ่านก่อนวันที่มีผลบังคับใช้</span>
              </div>
              <input
                type="checkbox"
                checked={trainingRequired}
                onChange={e => setTrainingRequired(e.target.checked)}
                className="w-4 h-4 text-[#D4AF37] rounded"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewModalOpen(false)}
                className="text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold gap-1"
              >
                <span>ส่งใบคำขอเข้าสู่ Flow</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Selected DAR Details Modal */}
      <Dialog open={Boolean(selectedDar)} onOpenChange={(open: boolean) => !open && setSelectedDar(null)}>
        <DialogContent className="max-w-xl bg-white text-stone-900">
          {selectedDar && (
            <div className="space-y-4 text-xs">
              <DialogHeader>
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-500">{selectedDar.darNumber}</span>
                    <DialogTitle className="text-base font-black text-stone-950 mt-0.5">
                      {selectedDar.docCode} — {selectedDar.docTitle}
                    </DialogTitle>
                  </div>
                  <Badge variant="outline" className="font-bold border-stone-300">
                    {selectedDar.departmentCode} ({selectedDar.streamCode})
                  </Badge>
                </div>
              </DialogHeader>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">เวอร์ชันที่ขอปรับ:</span>
                  <span className="font-mono font-bold text-stone-900">Rev. {selectedDar.currentRev} ➔ Rev. {selectedDar.proposedRev}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">วันเป้าหมายมีผล:</span>
                  <span className="font-mono text-stone-800">{selectedDar.effectiveTargetDate}</span>
                </div>
                <div className="border-t border-stone-200 pt-2">
                  <span className="text-stone-500 block mb-1">เหตุผลการเปลี่ยนแปลง:</span>
                  <p className="p-2 bg-white rounded border border-stone-200 text-stone-800 leading-relaxed">
                    {selectedDar.reasonForChange}
                  </p>
                </div>
              </div>

              {/* Dynamic Approval Steps Status */}
              <div className="space-y-2 border-t border-stone-200 pt-3">
                <h4 className="font-bold text-stone-800 text-xs">สถานะการลงนามอนุมัติอิเล็กทรอนิกส์ (Digital Sign-offs):</h4>
                
                <div className="space-y-2">
                  {/* Step 1 */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                    <div>
                      <span className="font-bold text-emerald-950 block">1. ผู้จัดทำคำขอ (Initiator)</span>
                      <span className="text-[11px] text-emerald-800">{selectedDar.initiatorName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      ✓ Submitted ({selectedDar.initiatorDate})
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-white">
                    <div>
                      <span className="font-bold text-stone-900 block">2. ผู้ทบทวนหน้างาน (Reviewer)</span>
                      <span className="text-[11px] text-stone-500">{selectedDar.reviewerName || 'หัวหน้าแผนก'}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedDar.reviewerStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedDar.reviewerStatus === 'APPROVED' ? '✓ ทบทวนแล้ว' : '⏳ รอทบทวน'}
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-white">
                    <div>
                      <span className="font-bold text-stone-900 block">3. DCC Format & Code Check</span>
                      <span className="text-[11px] text-stone-500">{selectedDar.dccCheckerName || 'DCC Officer'}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedDar.dccStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedDar.dccStatus === 'APPROVED' ? '✓ ผ่านการตรวจ' : '⏳ รอตรวจ'}
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/5">
                    <div>
                      <span className="font-black text-stone-950 block">4. ผู้อนุมัติขั้นสุดท้าย (Final Approval)</span>
                      <span className="text-[11px] font-bold text-[#8B7355]">{selectedDar.finalApproverName}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedDar.finalApprovalStatus === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {selectedDar.finalApprovalStatus === 'APPROVED' ? '✓ อนุมัติ & มีผล' : '⏳ รออนุมัติ'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
