'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  FileEdit, Plus, CheckCircle2, Clock, AlertTriangle, 
  ArrowRight, ShieldCheck, UserCheck, Layers, FileCheck, X, Download,
  Printer, ExternalLink, Sparkles, Check, ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DCCDarRequest, DCC_DEPARTMENTS, DCC_19_DEPARTMENTS } from '@/types/dcc'
import { submitDCCDarRequest, approveDCCDarRequest, signDCCDarStep, DCCSignStepKey } from '@/app/actions/dcc'
import { INITIAL_MASTER_USERS } from '@/lib/userMemory'
import DCCDarEFormPaper from './DCCDarEFormPaper'
import { toast } from 'sonner'

interface DCCDarWorkflowProps {
  requests: DCCDarRequest[]
}

export default function DCCDarWorkflow({ requests: initialRequests }: DCCDarWorkflowProps) {
  const [requests, setRequests] = useState<DCCDarRequest[]>(initialRequests)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedDar, setSelectedDar] = useState<DCCDarRequest | null>(null)
  const [previewPaperModal, setPreviewPaperModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [activeTabNew, setActiveTabNew] = useState<'PART1_2' | 'PART3_ROLES' | 'PART4_DEPTS'>('PART1_2')

  // Sign Step Active Form
  const [activeSignStep, setActiveSignStep] = useState<DCCSignStepKey | null>(null)
  const [signerUserSelect, setSignerUserSelect] = useState('')
  const [signerCustomName, setSignerCustomName] = useState('')
  const [signerCustomEmpId, setSignerCustomEmpId] = useState('')
  const [signerPosition, setSignerPosition] = useState('')
  const [signerComment, setSignerComment] = useState('')
  const [isSigning, setIsSigning] = useState(false)

  // --- NEW DAR FORM STATE (7 Sections) ---
  // ส่วนที่ 1: การขอดำเนินการ
  const [requestType, setRequestType] = useState<'NEW' | 'REVISE' | 'CANCEL' | 'EXTRA_COPY' | 'EXTEND_EXPIRY' | 'OTHER'>('REVISE')
  const [actionTypeDetail, setActionTypeDetail] = useState('')
  const [extraCopiesCount, setExtraCopiesCount] = useState<number | undefined>(undefined)

  // ส่วนที่ 2: ข้อมูลเอกสาร
  const [docLevel, setDocLevel] = useState('แบบฟอร์ม (Form)')
  const [docCode, setDocCode] = useState('MT-PF-001E')
  const [docTitle, setDocTitle] = useState('รายการตรวจสอบเครื่องมือเครื่องจักร (PM Check sheet)')
  const [deptCode, setDeptCode] = useState('MT')
  const [currentRev, setCurrentRev] = useState('00')
  const [proposedRev, setProposedRev] = useState('01')
  const [language, setLanguage] = useState<'TH' | 'EN' | 'BOTH'>('TH')
  const [usageFormat, setUsageFormat] = useState<'Paper' | 'File' | 'Both'>('Both')
  const [docReference, setDocReference] = useState('MT-WF-002D, ISO 22716 Clause 5')
  const [reason, setReason] = useState('ปรับปรุงหัวข้อการตรวจเช็คตามแบบฟอร์มทางการ MT-WF-002D และเพิ่มจุดตรวจสอบความปลอดภัยของเครื่องจักร')
  const [targetDate, setTargetDate] = useState('2026-04-01')
  const [trainingRequired, setTrainingRequired] = useState(true)

  // ส่วนที่ 3: ผู้ขอดำเนินการ & ผู้ทบทวน
  const [initiatorEmpId, setInitiatorEmpId] = useState('MTANR1898')
  const [initiatorName, setInitiatorName] = useState('นายอนันต์ รอดเสงี่ยม')
  const [initiatorPosition, setInitiatorPosition] = useState('วิศวกรซ่อมบำรุง')
  const [initiatorDept, setInitiatorDept] = useState('ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)')

  const [reviewerEmpId, setReviewerEmpId] = useState('MTPIT1933')
  const [reviewerName, setReviewerName] = useState('นายปิยะราช ถมมา')
  const [reviewerPosition, setReviewerPosition] = useState('หัวหน้างานซ่อมบำรุง')
  const [reviewerDept, setReviewerDept] = useState('ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)')

  // ส่วนที่ 4: สำเนาแจกจ่าย 19 แผนก
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['PDT', 'MT', 'PL', 'PD', 'MX', 'PK', 'QA', 'QC'])

  // Helper when selecting user from master
  const handleSelectInitiatorMaster = (empId: string) => {
    const user = INITIAL_MASTER_USERS.find(u => u.employeeId === empId)
    if (user) {
      setInitiatorEmpId(user.employeeId)
      setInitiatorName(user.fullName)
      setInitiatorDept(user.department)
      setInitiatorPosition(user.role || 'ผู้ขอดำเนินการ')
    }
  }

  const handleSelectReviewerMaster = (empId: string) => {
    const user = INITIAL_MASTER_USERS.find(u => u.employeeId === empId)
    if (user) {
      setReviewerEmpId(user.employeeId)
      setReviewerName(user.fullName)
      setReviewerDept(user.department)
      setReviewerPosition(user.role || 'ผู้ทบทวน')
    }
  }

  const handleSelectSignerUser = (empId: string) => {
    setSignerUserSelect(empId)
    const user = INITIAL_MASTER_USERS.find(u => u.employeeId === empId)
    if (user) {
      setSignerCustomName(user.fullName)
      setSignerCustomEmpId(user.employeeId)
      setSignerPosition(user.role || user.department)
    }
  }

  // Handle Digital Sign-off
  const handleExecuteSign = async (stepKey: DCCSignStepKey) => {
    if (!selectedDar) return
    const name = signerCustomName.trim()
    const empId = signerCustomEmpId.trim()

    if (!name || !empId) {
      toast.error('กรุณาระบุชื่อผู้ลงนามและรหัสพนักงานให้ครบถ้วน')
      return
    }

    setIsSigning(true)
    try {
      const res = await signDCCDarStep({
        darId: selectedDar.id,
        step: stepKey,
        signerName: name,
        signerEmpId: empId,
        position: signerPosition,
        department: selectedDar.departmentCode,
        comment: signerComment
      })

      if (res.success && res.data) {
        toast.success(res.message || 'บันทึกการลงนามดิจิทัลสำเร็จ')
        setRequests(prev => prev.map(d => d.id === selectedDar.id ? (res.data as DCCDarRequest) : d))
        setSelectedDar(res.data as DCCDarRequest)
        setActiveSignStep(null)
        setSignerComment('')
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการลงนาม')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSigning(false)
    }
  }

  // Handle Final Approval & Auto-Sync to Maintenance
  const handleApproveDar = async () => {
    if (!selectedDar) return
    setIsApproving(true)
    try {
      const res = await approveDCCDarRequest({
        darId: selectedDar.id,
        approverName: 'ดร.ภญ. ชมพูนุช แสวงศักดิ์',
        approverEmpId: 'pdtcps001',
        comments: 'อนุมัติให้ประกาศใช้เอกสารควบคุม และซิงค์ Revision ไปยังโมดูล Maintenance อัตโนมัติ'
      })
      if (res.success && res.data) {
        toast.success(res.message || 'อนุมัติคำขอ DAR สำเร็จ และซิงค์ Revision เรียบร้อยแล้ว')
        setRequests(prev => prev.map(d => d.id === selectedDar.id ? (res.data as DCCDarRequest) : d))
        setSelectedDar(res.data as DCCDarRequest)
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการอนุมัติ')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsApproving(false)
    }
  }

  // Submit New 7-Section DAR
  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docCode.trim() || !docTitle.trim() || !reason.trim() || !initiatorName.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน (รหัสเอกสาร, ชื่อเอกสาร, เหตุผล และชื่อผู้ขอดำเนินการ)')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitDCCDarRequest({
        requestType,
        actionTypeDetail,
        extraCopiesCount,
        docLevel,
        docCode,
        docTitle,
        departmentCode: deptCode,
        currentRev,
        proposedRev,
        language,
        usageFormat,
        docReference,
        reasonForChange: reason,
        effectiveTargetDate: targetDate,
        trainingRequired,
        initiatorName,
        initiatorEmpId,
        initiatorPosition,
        initiatorDept,
        reviewerName,
        reviewerEmpId,
        reviewerPosition,
        reviewerDept,
        targetDepartments: selectedDepts
      })

      if (res.success && res.data) {
        setRequests([res.data, ...requests])
        toast.success(`ยื่นคำขอ ${res.data.darNumber} สำเร็จครบทั้ง 7 ส่วน พร้อมเข้าสู่ Flow ลงนามดิจิทัล`)
        setIsNewModalOpen(false)
        setSelectedDar(res.data)
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งคำขอ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h3 className="text-base font-black text-stone-950 flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-[#D4AF37]" />
            ศูนย์ขอจัดทำ ทบทวน และอนุมัติเอกสารดิจิทัล (E-DAR Workflow DCC-PF-002A)
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            รองรับแบบฟอร์มคำขอ DAR มาตรฐาน 7 ส่วน พร้อมระบบลงนามอนุมัติอิเล็กทรอนิกส์ (Digital Sign-offs ด้วยรหัสพนักงาน) และ Auto-Sync สู่ระบบซ่อมบำรุง
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <a
            href="/templates/dcc/DCC-PF-002A-R02-DAR-Template.docx"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 shadow-2xs transition"
            title="ดาวน์โหลดแบบฟอร์มคำขอ DAR ฉบับมาตรฐาน (Word .docx)"
          >
            <Download className="w-4 h-4 text-[#D4AF37]" />
            <span>📥 โหลดแบบฟอร์มคำขอ DAR (Word)</span>
          </a>

          <Button
            onClick={() => setIsNewModalOpen(true)}
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>ยื่นขอจัดทำ / แก้ไขเอกสาร (New DAR 7 ส่วน)</span>
          </Button>
        </div>
      </div>

      {/* 10-Step Workflow Progress Summary Graphic */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
        <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>ขั้นตอนการลงนามอนุมัติอิเล็กทรอนิกส์ตามลำดับ (10 Digital Sign-off Gateways)</span>
          <span className="text-emerald-700 font-mono text-[10px] font-bold">ISO 9001:2026 & ISO 22716 ALCOA+</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-2xs">
            <div className="font-bold text-stone-900 flex items-center gap-1 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px]">1</span>
              <span>1. ผู้ขอยื่น (Initiator)</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">ส่วนที่ 3: ระบุเหตุผล & รหัสพนักงาน</p>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-2xs">
            <div className="font-bold text-stone-900 flex items-center gap-1 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px]">2</span>
              <span>2. ผู้ทบทวน (Reviewer)</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">ส่วนที่ 3: หัวหน้าแผนกตรวจหน้างาน</p>
          </div>

          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 shadow-2xs">
            <div className="font-black text-amber-950 flex items-center gap-1 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-[#8B7355] text-white flex items-center justify-center text-[9px]">3</span>
              <span>3. ผู้อนุมัติ (PDT/QA)</span>
            </div>
            <p className="text-[10px] text-amber-800 mt-1 font-semibold">ส่วนที่ 5: Auto-Sync Maintenance</p>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-2xs">
            <div className="font-bold text-stone-900 flex items-center gap-1 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px]">4</span>
              <span>4. DCC ออกเลข DAR</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">ส่วนที่ 1: ขึ้นทะเบียน & Stamp</p>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-stone-200 shadow-2xs">
            <div className="font-bold text-stone-900 flex items-center gap-1 text-[11px]">
              <span className="w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px]">5-8</span>
              <span>5-8. แจกจ่าย & เรียกคืน</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">ส่วนที่ 6: ลงนามรับ-คืนเอกสาร</p>
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
                <th className="py-3 px-3">ผู้ขอยื่น (รหัสพนักงาน)</th>
                <th className="py-3 px-3">สถานะ Flow</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
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
                      dar.requestType === 'EXTRA_COPY' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {dar.requestType === 'NEW' && '1. ขอจัดทำใหม่'}
                      {dar.requestType === 'REVISE' && '2. ขอแก้ไข'}
                      {dar.requestType === 'CANCEL' && '3. ขอยกเลิก'}
                      {dar.requestType === 'EXTRA_COPY' && '4. ขอสำเนาเพิ่ม'}
                      {dar.requestType === 'EXTEND_EXPIRY' && '5. ขอต่ออายุ'}
                      {dar.requestType === 'OTHER' && '6. อื่นๆ'}
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
                    <div className="text-[10px] font-mono text-stone-500">
                      {dar.initiatorEmpId ? `[${dar.initiatorEmpId}]` : dar.initiatorDate}
                    </div>
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
                        DCC กำลังตรวจ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        <Clock className="w-3 h-3 text-amber-600" />
                        รออนุมัติ / ทบทวน
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDar(dar)}
                        className="h-7 text-xs border-stone-300 hover:bg-stone-100"
                      >
                        ดู Flow & ลงนาม
                      </Button>
                      <Link
                        href={`/dcc/dar/${dar.id}/eform`}
                        target="_blank"
                        className="h-7 px-2 rounded-md border border-stone-300 hover:bg-stone-100 inline-flex items-center text-stone-700 text-xs gap-1"
                        title="เปิดแบบฟอร์มทางการ E-DAR (DCC-PF-002A)"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>E-Form</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: ยื่นใบขอจัดทำ / แก้ไขเอกสาร (7 ส่วนครบถ้วนตาม DCC-PF-002A)
      ========================================================================= */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-3xl bg-white text-stone-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <DialogTitle className="text-base font-black text-stone-950 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#D4AF37]" />
                  ยื่นใบขอจัดทำ / แก้ไขเอกสาร (Electronic DAR: DCC-PF-002A)
                </DialogTitle>
                <p className="text-xs text-stone-500 mt-0.5">
                  กรอกข้อมูลครบถ้วน 7 ส่วน เพื่อออกเป็นแบบฟอร์มคำขอทางการและเข้าสู่ระบบลงนามอิเล็กทรอนิกส์
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTabNew('PART1_2')}
                className={`pb-2 px-3 font-bold border-b-2 transition ${activeTabNew === 'PART1_2' ? 'border-[#D4AF37] text-stone-950' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
              >
                1. ส่วนที่ 1-2: ข้อมูลเอกสาร & เหตุผล
              </button>
              <button
                type="button"
                onClick={() => setActiveTabNew('PART3_ROLES')}
                className={`pb-2 px-3 font-bold border-b-2 transition ${activeTabNew === 'PART3_ROLES' ? 'border-[#D4AF37] text-stone-950' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
              >
                2. ส่วนที่ 3: ผู้ขอ & ผู้ทบทวน
              </button>
              <button
                type="button"
                onClick={() => setActiveTabNew('PART4_DEPTS')}
                className={`pb-2 px-3 font-bold border-b-2 transition ${activeTabNew === 'PART4_DEPTS' ? 'border-[#D4AF37] text-stone-950' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
              >
                3. ส่วนที่ 4: สำเนาแจกจ่าย (19 แผนก)
              </button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitNew} className="space-y-4 text-xs pt-1">
            {/* TAB 1: ส่วนที่ 1 & 2 */}
            {activeTabNew === 'PART1_2' && (
              <div className="space-y-4">
                {/* Section 1 */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                  <span className="font-bold text-stone-900 block text-xs">ส่วนที่ 1: การขอดำเนินการเอกสารควบคุม (Action Request)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { val: 'REVISE', label: '2. ขอแก้ไข (Revise)' },
                      { val: 'NEW', label: '1. ขอจัดทำใหม่ (New)' },
                      { val: 'CANCEL', label: '3. ขอยกเลิก (Cancel)' },
                      { val: 'EXTRA_COPY', label: '4. ขอสำเนาเพิ่ม' },
                      { val: 'EXTEND_EXPIRY', label: '5. ขอต่ออายุ' },
                      { val: 'OTHER', label: '6. อื่นๆ (Other)' },
                    ].map(opt => (
                      <label key={opt.val} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${requestType === opt.val ? 'bg-white border-[#D4AF37] font-bold shadow-2xs' : 'border-stone-200'}`}>
                        <input
                          type="radio"
                          name="requestType"
                          value={opt.val}
                          checked={requestType === opt.val}
                          onChange={() => setRequestType(opt.val as any)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {requestType === 'EXTRA_COPY' && (
                    <div className="pt-2">
                      <Label className="text-[11px] text-stone-600">จำนวนชุดสำเนาที่ต้องการขอเพิ่ม</Label>
                      <Input
                        type="number"
                        placeholder="เช่น 2 ชุด"
                        value={extraCopiesCount || ''}
                        onChange={e => setExtraCopiesCount(Number(e.target.value))}
                        className="mt-1 h-8 w-40 text-xs"
                      />
                    </div>
                  )}

                  {requestType === 'OTHER' && (
                    <div className="pt-2">
                      <Label className="text-[11px] text-stone-600">ระบุรายละเอียดอื่นๆ</Label>
                      <Input
                        placeholder="เช่น ขอยกเว้นการใช้งานชั่วคราว..."
                        value={actionTypeDetail}
                        onChange={e => setActionTypeDetail(e.target.value)}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-stone-700 text-xs font-bold">ระดับเอกสาร</Label>
                      <select
                        value={docLevel}
                        onChange={e => setDocLevel(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      >
                        <option value="แบบฟอร์ม (Form)">แบบฟอร์ม (Form / Checklist)</option>
                        <option value="ระเบียบปฏิบัติงาน (DP)">ระเบียบปฏิบัติงาน (DP)</option>
                        <option value="วิธีปฏิบัติงาน (WI)">วิธีปฏิบัติงาน (WI)</option>
                        <option value="คู่มือคุณภาพ (QM)">คู่มือคุณภาพ (QM)</option>
                        <option value="เอกสารภายนอก (EXT)">เอกสารภายนอก (EXT)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-stone-700 text-xs font-bold">แผนกเจ้าของเอกสาร</Label>
                      <select
                        value={deptCode}
                        onChange={e => setDeptCode(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      >
                        {DCC_DEPARTMENTS.map(d => (
                          <option key={d.code} value={d.code}>
                            {d.code} - {d.nameTh}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-stone-700 text-xs font-bold">ภาษาเอกสาร</Label>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value as any)}
                        className="w-full mt-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      >
                        <option value="TH">ภาษาไทย (TH)</option>
                        <option value="EN">English (EN)</option>
                        <option value="BOTH">สองภาษา (TH / EN)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <Label className="text-stone-700 text-xs font-bold">รหัสเอกสาร</Label>
                      <Input
                        placeholder="เช่น MT-PF-001E"
                        value={docCode}
                        onChange={e => setDocCode(e.target.value)}
                        className="mt-1 h-8 text-xs font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="col-span-8">
                      <Label className="text-stone-700 text-xs font-bold">ชื่อเอกสารมาตรฐาน (Document Title)</Label>
                      <Input
                        placeholder="เช่น รายการตรวจสอบเครื่องมือเครื่องจักร (PM Check sheet)"
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        className="mt-1 h-8 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-stone-700 text-xs font-bold">Rev. เดิม</Label>
                      <Input
                        value={currentRev}
                        onChange={e => setCurrentRev(e.target.value)}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-stone-700 text-xs font-bold">Rev. เสนอ</Label>
                      <Input
                        value={proposedRev}
                        onChange={e => setProposedRev(e.target.value)}
                        className="mt-1 h-8 text-xs font-mono text-emerald-800 font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-stone-700 text-xs font-bold">การใช้งาน</Label>
                      <select
                        value={usageFormat}
                        onChange={e => setUsageFormat(e.target.value as any)}
                        className="w-full mt-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                      >
                        <option value="Both">ทั้ง Hardcopy & Softcopy</option>
                        <option value="File">ไฟล์ดิจิทัล (Softcopy)</option>
                        <option value="Paper">กระดาษ (Hardcopy)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-stone-700 text-xs font-bold">วันที่มีผลเป้าหมาย</Label>
                      <Input
                        type="date"
                        value={targetDate}
                        onChange={e => setTargetDate(e.target.value)}
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-stone-700 text-xs font-bold">เอกสารอ้างอิง (ถ้ามี)</Label>
                    <Input
                      placeholder="เช่น MT-WF-002D, ISO 22716 Clause 5, HAS 23000"
                      value={docReference}
                      onChange={e => setDocReference(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-stone-700 text-xs font-bold">หลักการ เหตุผล หรือวัตถุประสงค์ในการขอดำเนินการ</Label>
                    <Textarea
                      placeholder="ระบุวัตถุประสงค์และรายละเอียดการเปลี่ยนแปลง..."
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="mt-1 text-xs h-20"
                      required
                    />
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-800 block text-xs">การฝึกอบรม (Training Gatekeeper)</span>
                      <span className="text-[11px] text-stone-500">ต้องอบรมผู้ปฏิบัติงานให้ผ่านก่อนวันที่มีผลบังคับใช้</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={trainingRequired}
                      onChange={e => setTrainingRequired(e.target.checked)}
                      className="w-4 h-4 text-[#D4AF37] rounded"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setActiveTabNew('PART3_ROLES')}
                    className="bg-stone-900 text-white text-xs gap-1"
                  >
                    <span>ถัดไป: ผู้ขอ & ผู้ทบทวน</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: ส่วนที่ 3 ผู้ขอ & ผู้ทบทวน */}
            {activeTabNew === 'PART3_ROLES' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ผู้ขอ */}
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                    <span className="font-bold text-stone-900 block text-xs border-b border-stone-200 pb-1">
                      1. ผู้ขอดำเนินการ (Initiator)
                    </span>
                    <div>
                      <Label className="text-[11px] text-stone-600">เลือกรหัสพนักงาน (Master Users)</Label>
                      <select
                        value={initiatorEmpId}
                        onChange={e => handleSelectInitiatorMaster(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                      >
                        {INITIAL_MASTER_USERS.map(u => (
                          <option key={u.employeeId} value={u.employeeId}>
                            {u.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-stone-600">ชื่อ-นามสกุล</Label>
                      <Input
                        value={initiatorName}
                        onChange={e => setInitiatorName(e.target.value)}
                        className="mt-1 h-8 text-xs bg-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-stone-600">รหัสพนักงาน</Label>
                        <Input
                          value={initiatorEmpId}
                          onChange={e => setInitiatorEmpId(e.target.value)}
                          className="mt-1 h-8 text-xs font-mono bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-stone-600">ตำแหน่ง</Label>
                        <Input
                          value={initiatorPosition}
                          onChange={e => setInitiatorPosition(e.target.value)}
                          className="mt-1 h-8 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-stone-600">ฝ่าย/แผนก</Label>
                      <Input
                        value={initiatorDept}
                        onChange={e => setInitiatorDept(e.target.value)}
                        className="mt-1 h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* ผู้ทบทวน */}
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                    <span className="font-bold text-stone-900 block text-xs border-b border-stone-200 pb-1">
                      2. ผู้ทบทวน (Reviewer)
                    </span>
                    <div>
                      <Label className="text-[11px] text-stone-600">เลือกรหัสพนักงาน (Master Users)</Label>
                      <select
                        value={reviewerEmpId}
                        onChange={e => handleSelectReviewerMaster(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                      >
                        {INITIAL_MASTER_USERS.map(u => (
                          <option key={u.employeeId} value={u.employeeId}>
                            {u.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-stone-600">ชื่อ-นามสกุล</Label>
                      <Input
                        value={reviewerName}
                        onChange={e => setReviewerName(e.target.value)}
                        className="mt-1 h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-stone-600">รหัสพนักงาน</Label>
                        <Input
                          value={reviewerEmpId}
                          onChange={e => setReviewerEmpId(e.target.value)}
                          className="mt-1 h-8 text-xs font-mono bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-stone-600">ตำแหน่ง</Label>
                        <Input
                          value={reviewerPosition}
                          onChange={e => setReviewerPosition(e.target.value)}
                          className="mt-1 h-8 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-stone-600">ฝ่าย/แผนก</Label>
                      <Input
                        value={reviewerDept}
                        onChange={e => setReviewerDept(e.target.value)}
                        className="mt-1 h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTabNew('PART1_2')}
                    className="text-xs"
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTabNew('PART4_DEPTS')}
                    className="bg-stone-900 text-white text-xs gap-1"
                  >
                    <span>ถัดไป: สำเนาแจกจ่าย 19 แผนก</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: ส่วนที่ 4 สำเนาแจกจ่าย 19 แผนก */}
            {activeTabNew === 'PART4_DEPTS' && (
              <div className="space-y-4">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="font-bold text-stone-900 text-xs">
                      ส่วนที่ 4: ฝ่ายที่เกี่ยวข้อง / สำเนาแจกจ่าย (19 แผนกตามมาตรฐานโรงงาน)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDepts(DCC_19_DEPARTMENTS.map(d => d.code))}
                        className="text-[10px] text-blue-700 underline hover:font-bold"
                      >
                        เลือกทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDepts([])}
                        className="text-[10px] text-stone-500 underline hover:font-bold"
                      >
                        ล้างทั้งหมด
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {DCC_19_DEPARTMENTS.map(dept => {
                      const isChecked = selectedDepts.includes(dept.code)
                      return (
                        <label
                          key={dept.code}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                            isChecked ? 'bg-emerald-50/70 border-emerald-300 font-bold text-emerald-950' : 'bg-white border-stone-200 text-stone-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedDepts(prev => [...prev, dept.code])
                              } else {
                                setSelectedDepts(prev => prev.filter(c => c !== dept.code))
                              }
                            }}
                            className="rounded text-emerald-700"
                          />
                          <span className="truncate">{dept.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <DialogFooter className="pt-3 border-t border-stone-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTabNew('PART3_ROLES')}
                    className="text-xs"
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold gap-1"
                  >
                    <span>{isSubmitting ? 'กำลังส่งคำขอ...' : 'ยืนยันยื่นใบคำขอ DAR เข้าสู่ Flow'}</span>
                  </Button>
                </DialogFooter>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: รายละเอียด DAR & DIGITAL SIGN-OFFS TIMELINE (10 STEPS)
      ========================================================================= */}
      <Dialog open={Boolean(selectedDar)} onOpenChange={(open: boolean) => !open && setSelectedDar(null)}>
        <DialogContent className="max-w-2xl bg-white text-stone-900 max-h-[90vh] overflow-y-auto">
          {selectedDar && (
            <div className="space-y-4 text-xs">
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-500">{selectedDar.darNumber}</span>
                    <DialogTitle className="text-base font-black text-stone-950 mt-0.5">
                      {selectedDar.docCode} — {selectedDar.docTitle}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-bold border-stone-300">
                      {selectedDar.departmentCode} ({selectedDar.streamCode})
                    </Badge>
                    <Link
                      href={`/dcc/dar/${selectedDar.id}/eform`}
                      target="_blank"
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>เปิดฟอร์ม E-DAR</span>
                    </Link>
                  </div>
                </div>
              </DialogHeader>

              {/* Document Overview Card */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-stone-500">เวอร์ชันที่ขอปรับ: </span>
                    <span className="font-mono font-bold text-stone-900">Rev. {selectedDar.currentRev} ➔ Rev. {selectedDar.proposedRev}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">วันเป้าหมายมีผล: </span>
                    <span className="font-mono text-stone-800 font-semibold">{selectedDar.effectiveTargetDate}</span>
                  </div>
                </div>
                <div className="border-t border-stone-200 pt-1.5">
                  <span className="text-stone-500 block text-[11px]">วัตถุประสงค์ / เหตุผลการขอดำเนินการ:</span>
                  <p className="p-2 bg-white rounded border border-stone-200 text-stone-800 leading-relaxed text-[11px] whitespace-pre-line mt-0.5">
                    {selectedDar.reasonForChange}
                  </p>
                </div>
              </div>

              {/* 10-STEP DIGITAL SIGN-OFFS TIMELINE */}
              <div className="space-y-3 border-t border-stone-200 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>ลำดับการลงนามอนุมัติอิเล็กทรอนิกส์ (Digital Sign-offs Flow)</span>
                  </h4>
                  <span className="text-[10px] text-stone-500 font-mono">ลงนามด้วยรหัสพนักงาน</span>
                </div>

                <div className="space-y-2.5">
                  {/* Step 1: Initiator */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">1</span>
                        <span className="font-bold text-stone-900">ผู้ขอดำเนินการ (Initiator) [ส่วนที่ 3]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.initiatorName} {selectedDar.initiatorEmpId && <span className="font-mono text-blue-900">[{selectedDar.initiatorEmpId}]</span>}
                        {selectedDar.initiatorDate && <span className="text-stone-400 ml-2">({selectedDar.initiatorDate})</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      ✓ Submitted
                    </span>
                  </div>

                  {/* Step 2: Reviewer */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">2</span>
                          <span className="font-bold text-stone-900">ผู้ทบทวนหน้างาน (Reviewer) [ส่วนที่ 3]</span>
                        </div>
                        <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                          {selectedDar.reviewerName || 'หัวหน้าแผนก'} {selectedDar.reviewerEmpId && <span className="font-mono text-blue-900">[{selectedDar.reviewerEmpId}]</span>}
                          {selectedDar.reviewerDate && <span className="text-stone-400 ml-2">({selectedDar.reviewerDate})</span>}
                        </div>
                      </div>
                      {selectedDar.reviewerStatus === 'APPROVED' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          ✓ ทบทวนแล้ว
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveSignStep('REVIEWER')
                            handleSelectSignerUser(selectedDar.reviewerEmpId || 'MTPIT1933')
                          }}
                          className="h-6 text-[10px] bg-stone-900 text-white"
                        >
                          ✍️ ลงนามทบทวน
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Final Approval (QA Manager / Plant Director - PDT) */}
                  <div className="p-3 rounded-lg border-2 border-[#D4AF37]/50 bg-[#D4AF37]/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#8B7355] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                          <span className="font-black text-stone-950 text-xs">ผู้อนุมัติให้ดำเนินการ (QA Manager / Plant Director - PDT) [ส่วนที่ 5]</span>
                        </div>
                        <div className="text-[11px] text-[#8B7355] font-bold pl-7 mt-0.5">
                          {selectedDar.finalApproverName} {selectedDar.finalApproverEmpId && <span className="font-mono">[{selectedDar.finalApproverEmpId}]</span>}
                          {selectedDar.finalApprovalDate && <span className="text-stone-500 font-normal ml-2">({selectedDar.finalApprovalDate})</span>}
                        </div>
                      </div>
                      {selectedDar.finalApprovalStatus === 'APPROVED' ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-600 text-white">
                          ✓ อนุมัติ & มีผลใช้
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                          ⏳ รออนุมัติ
                        </span>
                      )}
                    </div>

                    {/* Prominent Auto-Sync Button for Final Approval */}
                    {selectedDar.finalApprovalStatus !== 'APPROVED' && (
                      <div className="pt-1">
                        <Button
                          onClick={handleApproveDar}
                          disabled={isApproving}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1.5 shadow-sm py-2"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                          <span>{isApproving ? 'กำลังดำเนินการ...' : 'ลงนามอนุมัติคำขอ DAR & ประกาศใช้ (Auto-Sync to Maintenance)'}</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Step 4: DCC Register & DAR Number */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">4</span>
                        <span className="font-bold text-stone-900">DCC ขึ้นทะเบียนและออกเลขคำขอ DAR [ส่วนที่ 1]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.dccOfficerName || 'DCC Officer'} {selectedDar.dccOfficerEmpId && <span className="font-mono text-blue-900">[{selectedDar.dccOfficerEmpId}]</span>}
                      </div>
                    </div>
                    {selectedDar.dccReceivedDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ✓ ขึ้นทะเบียน ({selectedDar.dccReceivedDate})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSignStep('DCC_REGISTER')
                          handleSelectSignerUser('DCCJRP101')
                        }}
                        className="h-6 text-[10px] bg-stone-900 text-white"
                      >
                        ✍️ ลงนามขึ้นทะเบียน
                      </Button>
                    )}
                  </div>

                  {/* Step 5: DCC Distribute */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">5</span>
                        <span className="font-bold text-stone-900">DCC ผู้แจกจ่ายเอกสารใหม่ [ส่วนที่ 6]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.dccDistributionOfficerName || 'DCC Officer'} {selectedDar.dccDistributionOfficerEmpId && <span className="font-mono text-blue-900">[{selectedDar.dccDistributionOfficerEmpId}]</span>}
                      </div>
                    </div>
                    {selectedDar.dccDistributionDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ✓ แจกจ่ายแล้ว ({selectedDar.dccDistributionDate})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSignStep('DCC_DISTRIBUTE')
                          handleSelectSignerUser('DCCJRP101')
                        }}
                        className="h-6 text-[10px] bg-stone-900 text-white"
                      >
                        ✍️ ลงนามแจกจ่าย
                      </Button>
                    )}
                  </div>

                  {/* Step 6: Dept Receive New Doc */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">6</span>
                        <span className="font-bold text-stone-900">ผู้รับเอกสารใหม่ (จากแผนก) [ส่วนที่ 6]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.deptReceiverName || 'รอผู้รับเอกสาร'} {selectedDar.deptReceiverEmpId && <span className="font-mono text-blue-900">[{selectedDar.deptReceiverEmpId}]</span>}
                      </div>
                    </div>
                    {selectedDar.deptReceivedDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ✓ รับเอกสารแล้ว ({selectedDar.deptReceivedDate})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSignStep('DEPT_RECEIVE')
                          handleSelectSignerUser('MTANR1898')
                        }}
                        className="h-6 text-[10px] bg-stone-900 text-white"
                      >
                        ✍️ ลงนามรับเอกสารใหม่
                      </Button>
                    )}
                  </div>

                  {/* Step 7: Dept Return Old Doc */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">7</span>
                        <span className="font-bold text-stone-900">ผู้คืนเอกสารเก่าให้ DCC [ส่วนที่ 6]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.deptReturnerName || 'รอผู้คืนเอกสาร'} {selectedDar.deptReturnerEmpId && <span className="font-mono text-blue-900">[{selectedDar.deptReturnerEmpId}]</span>}
                      </div>
                    </div>
                    {selectedDar.deptReturnedDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ✓ คืนเอกสารเก่าแล้ว ({selectedDar.deptReturnedDate})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSignStep('DEPT_RETURN')
                          handleSelectSignerUser('MTANR1898')
                        }}
                        className="h-6 text-[10px] bg-stone-900 text-white"
                      >
                        ✍️ ลงนามคืนเอกสารเก่า
                      </Button>
                    )}
                  </div>

                  {/* Step 8: DCC Recall Collector */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">8</span>
                        <span className="font-bold text-stone-900">DCC รับเอกสารเก่าคืน [ส่วนที่ 6]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.dccRecallOfficerName || 'DCC Officer'} {selectedDar.dccRecallOfficerEmpId && <span className="font-mono text-blue-900">[{selectedDar.dccRecallOfficerEmpId}]</span>}
                      </div>
                    </div>
                    {selectedDar.dccRecallDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ✓ DCC รับคืนแล้ว ({selectedDar.dccRecallDate})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSignStep('DCC_RECALL')
                          handleSelectSignerUser('DCCJRP101')
                        }}
                        className="h-6 text-[10px] bg-stone-900 text-white"
                      >
                        ✍️ ลงนามรับคืน
                      </Button>
                    )}
                  </div>

                  {/* Step 9: DCC Disposal */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">9</span>
                        <span className="font-bold text-stone-900">ผู้ดำเนินการทำลาย DCC [ส่วนที่ 7]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.disposalOfficerName || 'DCC Officer'} {selectedDar.disposalOfficerEmpId && <span className="font-mono text-blue-900">[{selectedDar.disposalOfficerEmpId}]</span>}
                      </div>
                    </div>
                    {selectedDar.disposalDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ✓ ทำลายแล้ว ({selectedDar.disposalDate})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSignStep('DCC_DISPOSE')
                          handleSelectSignerUser('DCCJRP101')
                        }}
                        className="h-6 text-[10px] bg-stone-900 text-white"
                      >
                        ✍️ ลงนามการทำลาย
                      </Button>
                    )}
                  </div>

                  {/* Step 10: Disposal Approval (PDT / QA Manager) */}
                  <div className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold">10</span>
                        <span className="font-bold text-stone-900">ผู้อนุมัติทำลาย (QA Manager / Plant Director) [ส่วนที่ 7]</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-6 mt-0.5">
                        {selectedDar.disposalApproverName || 'Plant Director (PDT)'} {selectedDar.disposalApproverEmpId && <span className="font-mono text-blue-900">[{selectedDar.disposalApproverEmpId}]</span>}
                      </div>
                    </div>
                    {selectedDar.disposalApprovalDate ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ✓ อนุมัติทำลายแล้ว ({selectedDar.disposalApprovalDate})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSignStep('DISPOSAL_APPROVE')
                          handleSelectSignerUser('pdtcps001')
                        }}
                        className="h-6 text-[10px] bg-stone-900 text-white"
                      >
                        ✍️ ลงนามอนุมัติทำลาย
                      </Button>
                    )}
                  </div>
                </div>

                {/* SIGN STEP FORM POPUP */}
                {activeSignStep && (
                  <div className="p-3 bg-stone-100 rounded-xl border border-stone-300 space-y-2 mt-2">
                    <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                      <span className="font-bold text-stone-900 text-xs">
                        ลงนามขั้นตอน: {activeSignStep}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSignStep(null)}
                        className="text-stone-500 hover:text-stone-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-stone-600">เลือกรหัสพนักงาน (Master)</Label>
                        <select
                          value={signerUserSelect}
                          onChange={e => handleSelectSignerUser(e.target.value)}
                          className="w-full mt-1 px-2 py-1 bg-white border border-stone-300 rounded text-xs"
                        >
                          <option value="">-- เลือกจากรายชื่อพนักงาน --</option>
                          {INITIAL_MASTER_USERS.map(u => (
                            <option key={u.employeeId} value={u.employeeId}>
                              {u.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px] text-stone-600">ชื่อ-นามสกุล ผู้ลงนาม</Label>
                        <Input
                          value={signerCustomName}
                          onChange={e => setSignerCustomName(e.target.value)}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-stone-600">รหัสพนักงาน</Label>
                        <Input
                          value={signerCustomEmpId}
                          onChange={e => setSignerCustomEmpId(e.target.value)}
                          className="mt-1 h-7 text-xs font-mono bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-stone-600">ตำแหน่ง</Label>
                        <Input
                          value={signerPosition}
                          onChange={e => setSignerPosition(e.target.value)}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-stone-600">ความเห็น / หมายเหตุการลงนาม</Label>
                      <Input
                        value={signerComment}
                        onChange={e => setSignerComment(e.target.value)}
                        placeholder="เช่น ตรวจสอบถูกต้องตามมาตรฐาน ALCOA+"
                        className="mt-1 h-7 text-xs bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveSignStep(null)}
                        className="h-7 text-xs"
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        size="sm"
                        disabled={isSigning}
                        onClick={() => handleExecuteSign(activeSignStep)}
                        className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                      >
                        <span>{isSigning ? 'กำลังบันทึก...' : 'ยืนยันลงนามดิจิทัล'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
