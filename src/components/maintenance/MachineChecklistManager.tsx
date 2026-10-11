'use client'

import React, { useState } from 'react'
import { 
  ShieldCheck, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Edit3, 
  History, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { parsePMChecklistExcel, updateMachineChecklistMaster } from '@/app/actions/maintenance'

interface PMItem {
  id?: number
  item: string
  standard: string
  method?: string
  category?: string
}

interface VersionHistoryItem {
  version: string
  items_count: number
  updated_at: string
  updated_by: string
  reason: string
  effective_date?: string
}

interface MachineChecklistManagerProps {
  machineCode: string
  machineName: string
  currentChecklist: PMItem[]
  currentVersion?: string
  effectiveDate?: string
  history?: VersionHistoryItem[]
  planCode?: string
}

export default function MachineChecklistManager({
  machineCode,
  machineName,
  currentChecklist = [],
  currentVersion = '1.0',
  effectiveDate = '19 JAN 24',
  history = [],
  planCode
}: MachineChecklistManagerProps) {
  const router = useRouter()

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Upload workflow state
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsedItems, setParsedItems] = useState<PMItem[]>([])
  const [detectedFormName, setDetectedFormName] = useState<string>('')
  const [uploadFileName, setUploadFileName] = useState<string>('')
  
  // New Version metadata state
  const [newVersion, setNewVersion] = useState<string>(() => {
    const num = parseFloat(currentVersion)
    return isNaN(num) ? '1.1' : (num + 0.1).toFixed(1)
  })
  const [changeReason, setChangeReason] = useState<string>('')
  const [updatedByName, setUpdatedByName] = useState<string>('ช่างยะ ปิยะราช ถมมา')
  const [newEffectiveDate, setNewEffectiveDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

  // Online Editor state
  const [editableItems, setEditableItems] = useState<PMItem[]>(() => {
    return currentChecklist.length > 0 
      ? JSON.parse(JSON.stringify(currentChecklist))
      : [
          { item: 'ตรวจเช็คสายไฟ สวิตช์เปิด-ปิด และการต่อสายดิน', standard: 'สายไฟสมบูรณ์ ไม่มีรอยแตก ขั้วต่อแน่น', method: 'ตรวจเช็คด้วยสายตา', category: 'ระบบไฟฟ้า' },
          { item: 'วัดกระแสไฟฟ้าขณะมอเตอร์ทำงาน (Amp)', standard: 'กระแสไม่เกินพิกัด Full Load Current (FLA)', method: 'ใช้ Clamp Meter วัด', category: 'มอเตอร์ & กลไก' }
        ]
  })

  // 1. Handle File Selection and Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadFileName(file.name)
    setIsParsing(true)

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64 = (event.target?.result as string).split(',')[1]
          const res = await parsePMChecklistExcel(base64)

          if (res.success && res.items && res.items.length > 0) {
            setParsedItems(res.items)
            setDetectedFormName(res.detectedForm || 'Excel Template')
            toast.success(`อ่านไฟล์สำเร็จ: ตรวจพบ ${res.items.length} หัวข้อการตรวจเช็ค`)
          } else {
            toast.error(res.error || 'ไม่สามารถอ่านหัวข้อตรวจเช็คจากไฟล์นี้ได้')
            setParsedItems([])
          }
        } catch (err: any) {
          toast.error('เกิดข้อผิดพลาดในการประมวลผลไฟล์: ' + err.message)
        } finally {
          setIsParsing(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setIsParsing(false)
      toast.error('ไม่สามารถเปิดไฟล์ได้')
    }
  }

  // 2. Submit Uploaded Version
  const handleSaveUploadedVersion = async () => {
    if (parsedItems.length === 0) {
      toast.error('กรุณาเลือกไฟล์ Excel ที่มีหัวข้อการตรวจเช็คก่อนบันทึก')
      return
    }
    if (!changeReason.trim()) {
      toast.error('กรุณาระบุเหตุผลการปรับปรุง Revision/Version (เพื่อมาตรฐาน DCC/QA)')
      return
    }

    setIsSaving(true)
    try {
      const res = await updateMachineChecklistMaster({
        machineCode,
        items: parsedItems,
        version: newVersion,
        changeReason,
        updatedByName,
        effectiveDate: newEffectiveDate
      })

      if (res.success) {
        toast.success(res.message)
        setIsUploadModalOpen(false)
        setParsedItems([])
        setChangeReason('')
        router.refresh()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 3. Submit Online Edited Version
  const handleSaveEditedVersion = async () => {
    const validItems = editableItems.filter(i => i.item.trim().length > 0)
    if (validItems.length === 0) {
      toast.error('ต้องมีหัวข้อการตรวจเช็คอย่างน้อย 1 รายการ')
      return
    }
    if (!changeReason.trim()) {
      toast.error('กรุณาระบุเหตุผลการปรับปรุง Revision/Version (เพื่อมาตรฐาน DCC/QA)')
      return
    }

    setIsSaving(true)
    try {
      const res = await updateMachineChecklistMaster({
        machineCode,
        items: validItems,
        version: newVersion,
        changeReason,
        updatedByName,
        effectiveDate: newEffectiveDate
      })

      if (res.success) {
        toast.success(res.message)
        setIsEditModalOpen(false)
        setChangeReason('')
        router.refresh()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddEditRow = () => {
    setEditableItems(prev => [
      ...prev,
      { item: '', standard: 'ใช้งานได้ปกติ สมบูรณ์ตามมาตรฐาน', method: 'ตรวจด้วยสายตาและการทำงาน', category: `หมวดที่ ${Math.floor(prev.length / 5) + 1}` }
    ])
  }

  const handleRemoveEditRow = (idx: number) => {
    setEditableItems(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      {/* Top Banner: Master Version Info & Action Buttons */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>DCC Controlled: MT-PF-001E (Rev.00)</span>
              </span>
              <span className="text-stone-500">•</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono font-bold">
                Checklist Version: Ver {currentVersion}
              </Badge>
              <span className="text-xs text-stone-400 font-mono">
                (มีผล: {effectiveDate})
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
              รายการตรวจเช็คประจำเครื่อง (Machine-Specific PM Checklist)
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              ควบคุมหัวข้อการตรวจเช็คเฉพาะสำหรับ <b className="text-yellow-400">{machineCode}</b> ({machineName}) เป็น Single Source of Truth
            </p>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto xl:justify-end pt-1 xl:pt-0">
            {/* Download Master Template from DCC */}
            <a
              href="/templates/dcc/MT-PF-001E-PM-Checksheet-Template.xlsx"
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition shadow-2xs active:scale-95"
              title="ดาวน์โหลดไฟล์ Excel แม่แบบมาตรฐานทางการของ DCC"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>📥 ดาวน์โหลด Template Excel</span>
            </a>

            {/* Upload New Version Button */}
            <Button
              onClick={() => {
                setParsedItems([])
                setUploadFileName('')
                setNewVersion((parseFloat(currentVersion) + 0.1).toFixed(1))
                setChangeReason('')
                setIsUploadModalOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm active:scale-95 py-2 h-auto"
            >
              <Upload className="w-3.5 h-3.5 text-white" />
              <span>📤 อัปโหลด Checklist ใหม่</span>
            </Button>

            {/* Quick Online Edit */}
            <Button
              onClick={() => {
                setEditableItems(currentChecklist.length > 0 ? JSON.parse(JSON.stringify(currentChecklist)) : [])
                setNewVersion((parseFloat(currentVersion) + 0.1).toFixed(1))
                setChangeReason('')
                setIsEditModalOpen(true)
              }}
              variant="outline"
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 text-xs font-bold gap-1.5 py-2 h-auto"
            >
              <Edit3 className="w-3.5 h-3.5 text-yellow-400" />
              <span>✏️ แก้ไขบนเว็บ</span>
            </Button>

            {/* Print Preview DCC */}
            {planCode && (
              <a
                href={`/maintenance/pm/${planCode}/eform`}
                target="_blank"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] hover:bg-[#b5952f] text-stone-950 transition shadow-2xs active:scale-95"
                title="ดูหน้าแบบฟอร์ม DCC ฉบับพิมพ์"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>📄 พิมพ์ฟอร์ม DCC</span>
              </a>
            )}
          </div>
        </div>

        {/* Status count summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-stone-800 text-xs">
          <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700/80">
            <span className="text-stone-400 block text-[11px]">จำนวนข้อตรวจเช็ค</span>
            <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
              {currentChecklist.length} รายการ
            </span>
          </div>

          <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700/80">
            <span className="text-stone-400 block text-[11px]">Checklist Version</span>
            <span className="text-base font-black text-yellow-400 font-mono mt-0.5 block">
              Ver {currentVersion}
            </span>
          </div>

          <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700/80">
            <span className="text-stone-400 block text-[11px]">DCC Form Code</span>
            <span className="text-base font-black text-cyan-400 font-mono mt-0.5 block">
              MT-PF-001E
            </span>
          </div>

          <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700/80">
            <span className="text-stone-400 block text-[11px]">ประวัติการปรับปรุง</span>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-bold text-stone-300 hover:text-white mt-1 inline-flex items-center gap-1"
            >
              <span>{history.length} Version</span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Version History Accordion */}
      {showHistory && history.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <History className="w-4 h-4 text-amber-700" />
            <span>ประวัติการปรับเปลี่ยน Version ของเครื่อง {machineCode} ({history.length} รายการ)</span>
          </div>
          <div className="space-y-2">
            {history.map((h, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Ver {h.version}
                    </span>
                    <span className="font-bold text-stone-800">{h.items_count} ข้อตรวจเช็ค</span>
                    <span className="text-stone-500">• โดย {h.updated_by}</span>
                  </div>
                  <span className="text-stone-400 font-mono">
                    {new Date(h.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-stone-700 bg-stone-50 p-2 rounded-lg text-xs">
                  <span className="font-bold text-amber-800">เหตุผล: </span> {h.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Checklist Items Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-700 font-bold uppercase tracking-wider">
          <span>รายการข้อตรวจเช็คปัจจุบัน (Checklist Items - {currentChecklist.length} ข้อ)</span>
          <span className="text-[11px] text-stone-400 font-normal">
            * ระบบจะดึงรายการนี้ไปแสดงในหน้าตรวจ PM และใบ DCC อัตโนมัติ
          </span>
        </div>

        {currentChecklist.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-400 text-xs space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-stone-300 mx-auto" />
            <p>ยังไม่มีรายการ Checklist เฉพาะเครื่องสำหรับ {machineCode}</p>
            <p className="text-[11px] text-stone-400">
              (ระบบกำลังใช้แบบฟอร์มมาตรฐานกลาง 5-6 ข้อเป็นค่าเริ่มต้น — กดปุ่ม <b>"📤 อัปโหลด Checklist ใหม่"</b> ด้านบนเพื่อใส่ข้อตรวจเช็คเฉพาะเครื่อง)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {currentChecklist.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-white rounded-xl border border-stone-200 hover:border-emerald-300 transition shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-stone-900 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-mono shrink-0 font-bold">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{item.item}</span>
                    </div>
                    {item.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="pl-7 mt-2 space-y-1 text-[11px]">
                    <div className="text-stone-600">
                      <span className="text-stone-400 font-medium">เกณฑ์มาตรฐาน: </span>
                      <span className="font-semibold text-stone-800">{item.standard || 'ใช้งานได้ปกติ'}</span>
                    </div>
                    {item.method && (
                      <div className="text-stone-500">
                        <span className="text-stone-400 font-medium">วิธีการตรวจ: </span>
                        <span>{item.method}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: UPLOAD EXCEL CHECKLIST
      ========================================================================= */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-2xl bg-white text-stone-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-stone-950 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>อัปโหลด Checklist ตรวจเช็คบำรุงรักษาประจำเครื่อง ({machineCode})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* File Upload Box */}
            <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-6 text-center space-y-3 bg-stone-50/50 transition">
              <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
              <div>
                <p className="font-bold text-stone-800">เลือกหรือลากไฟล์ Excel (.xlsx / .xls) มาวางที่นี่</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  รองรับทั้งแบบฟอร์ม DCC MT-PF-001E และไฟล์ Excel ตารางทั่วไป (ระบบตรวจจับหัวข้ออัตโนมัติ)
                </p>
              </div>

              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                disabled={isParsing}
                className="hidden"
                id="pm-checklist-file-input"
              />

              <label
                htmlFor="pm-checklist-file-input"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition shadow-sm"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isParsing ? 'กำลังอ่านข้อมูล...' : 'เลือกไฟล์ Excel'}</span>
              </label>

              {uploadFileName && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-lg inline-block">
                  📄 {uploadFileName} ({detectedFormName})
                </div>
              )}
            </div>

            {/* Parsed Items Preview */}
            {parsedItems.length > 0 && (
              <div className="space-y-2 border border-stone-200 rounded-xl p-3 bg-stone-50">
                <div className="flex items-center justify-between font-bold text-stone-800 text-xs">
                  <span>ตัวอย่างหัวข้อที่ตรวจพบ ({parsedItems.length} ข้อ):</span>
                  <span className="text-[11px] text-emerald-700">✓ รูปแบบข้อมูลถูกต้อง</span>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-stone-200 bg-white rounded-lg border border-stone-200 text-[11px]">
                  {parsedItems.map((p, idx) => (
                    <div key={idx} className="p-2 flex items-start gap-2">
                      <span className="font-mono font-bold text-stone-400 w-5">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="font-bold text-stone-900">{p.item}</div>
                        <div className="text-stone-500 text-[10px]">เกณฑ์: {p.standard}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Versioning and Change Log Inputs */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-stone-700 text-xs font-bold">Checklist Version ใหม่ *</Label>
                  <Input
                    value={newVersion}
                    onChange={e => setNewVersion(e.target.value)}
                    placeholder="เช่น 1.1 หรือ 2.0"
                    className="mt-1 h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <Label className="text-stone-700 text-xs font-bold">วันที่มีผลบังคับใช้ *</Label>
                  <Input
                    type="date"
                    value={newEffectiveDate}
                    onChange={e => setNewEffectiveDate(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-stone-700 text-xs font-bold">ผู้จัดทำ / ผู้รับผิดชอบ *</Label>
                  <Input
                    value={updatedByName}
                    onChange={e => setUpdatedByName(e.target.value)}
                    className="mt-1 h-9 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-stone-700 text-xs font-bold">
                  เหตุผลและความจำเป็นในการปรับปรุง (Engineering MOC / Reason) *
                </Label>
                <Textarea
                  value={changeReason}
                  onChange={e => setChangeReason(e.target.value)}
                  placeholder="เช่น ปรับเพิ่มหัวข้อตรวจเช็คระบบน้ำมันหล่อลื่นและซีลตามผลการซ่อมบำรุงประจำไตรมาส..."
                  className="mt-1 text-xs h-16"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
              className="text-xs"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSaveUploadedVersion}
              disabled={isSaving || parsedItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกเป็น Version ใหม่ (Auto-Sync to PM)'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: INTERACTIVE ONLINE EDITOR
      ========================================================================= */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl bg-white text-stone-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-stone-950 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-yellow-600" />
                <span>แก้ไขรายการตรวจเช็ค PM ({machineCode})</span>
              </span>
              <Button
                size="sm"
                onClick={handleAddEditRow}
                className="bg-stone-900 text-white text-xs gap-1 h-7 font-bold"
              >
                <Plus className="w-3.5 h-3.5 text-yellow-400" />
                <span>เพิ่มข้อใหม่</span>
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Table of items */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {editableItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-stone-700">ข้อที่ {idx + 1}</span>
                    <button
                      onClick={() => handleRemoveEditRow(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      title="ลบข้อนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-stone-500">หัวข้อการตรวจเช็ค *</Label>
                      <Input
                        value={item.item}
                        onChange={e => {
                          const val = e.target.value
                          setEditableItems(prev => prev.map((it, i) => i === idx ? { ...it, item: val } : it))
                        }}
                        placeholder="เช่น ตรวจเช็คสายไฟและระบบควบคุม"
                        className="mt-0.5 h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-stone-500">เกณฑ์มาตรฐาน *</Label>
                      <Input
                        value={item.standard}
                        onChange={e => {
                          const val = e.target.value
                          setEditableItems(prev => prev.map((it, i) => i === idx ? { ...it, standard: val } : it))
                        }}
                        placeholder="เช่น แน่นหนา ไม่หลวม หรือชำรุด"
                        className="mt-0.5 h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-stone-500">วิธีการตรวจเช็ค</Label>
                      <Input
                        value={item.method || ''}
                        onChange={e => {
                          const val = e.target.value
                          setEditableItems(prev => prev.map((it, i) => i === idx ? { ...it, method: val } : it))
                        }}
                        placeholder="เช่น ตรวจด้วยสายตาและการทำงาน"
                        className="mt-0.5 h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-stone-500">หมวดหมู่งาน</Label>
                      <Input
                        value={item.category || ''}
                        onChange={e => {
                          const val = e.target.value
                          setEditableItems(prev => prev.map((it, i) => i === idx ? { ...it, category: val } : it))
                        }}
                        placeholder="เช่น ระบบไฟฟ้า, มอเตอร์"
                        className="mt-0.5 h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Version and Reason */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-stone-700 text-xs font-bold">Checklist Version ใหม่ *</Label>
                  <Input
                    value={newVersion}
                    onChange={e => setNewVersion(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-stone-700 text-xs font-bold">วันที่มีผลบังคับใช้ *</Label>
                  <Input
                    type="date"
                    value={newEffectiveDate}
                    onChange={e => setNewEffectiveDate(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-stone-700 text-xs font-bold">
                  เหตุผลและความจำเป็นในการปรับปรุง (Engineering MOC / Reason) *
                </Label>
                <Textarea
                  value={changeReason}
                  onChange={e => setChangeReason(e.target.value)}
                  placeholder="เช่น ปรับแก้คำอธิบายเกณฑ์มาตรฐานให้ตรงกับสเปกผู้ผลิต..."
                  className="mt-1 text-xs h-16"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSaveEditedVersion}
              disabled={isSaving}
              className="bg-yellow-600 hover:bg-yellow-700 text-stone-950 font-bold text-xs gap-1.5 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกเป็น Version ใหม่ (Auto-Sync to PM)'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
