'use client'

import React, { useState } from 'react'
import { 
  X, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  Trash2, 
  Plus, 
  Sparkles,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Send,
  Copy
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Deal, Company, Contact, PipelineStage, ActivityLog } from './types'

interface DealDetailModalProps {
  isOpen: boolean
  onClose: () => void
  deal: Deal | null
  companies: Company[]
  contacts: Contact[]
  stages: PipelineStage[]
  activities: ActivityLog[]
  onUpdateDeal: (updated: Deal) => void
  onDeleteDeal: (dealId: string) => void
  onAddActivity: (activity: Omit<ActivityLog, 'id' | 'createdAt'>) => void
}

export const DealDetailModal: React.FC<DealDetailModalProps> = ({
  isOpen,
  onClose,
  deal,
  companies,
  contacts,
  stages,
  activities,
  onUpdateDeal,
  onDeleteDeal,
  onAddActivity,
}) => {
  if (!deal) return null

  const [currentDeal, setCurrentDeal] = useState<Deal>(deal)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'NOTE' | 'CALL' | 'LINE' | 'SAMPLE'>('NOTE')
  const [lossReasonInput, setLossReasonInput] = useState(deal.lossReason || '')
  const [lossNoteInput, setLossNoteInput] = useState(deal.lossNote || '')
  const [showLossModal, setShowLossModal] = useState(false)

  // Sync if prop changes
  React.useEffect(() => {
    setCurrentDeal(deal)
  }, [deal])

  const company = companies.find(c => c.id === currentDeal.companyId)
  const contact = contacts.find(c => c.id === currentDeal.contactId)
  const currentStage = stages.find(s => s.id === currentDeal.stageId)
  const dealActivities = activities.filter(a => a.dealId === currentDeal.id)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val)
  }

  const handleStageClick = (stageId: string) => {
    const targetStage = stages.find(s => s.id === stageId)
    if (targetStage?.isLost) {
      setShowLossModal(true)
      return
    }

    const updated = { ...currentDeal, stageId, updatedAt: new Date().toISOString() }
    setCurrentDeal(updated)
    onUpdateDeal(updated)

    onAddActivity({
      dealId: deal.id,
      type: 'STAGE_CHANGE',
      title: `ย้ายสู่สเตจ: ${targetStage?.name}`,
      actor: currentDeal.salesRep,
    })
    toast.success(`อัปเดตสเตจเป็น ${targetStage?.name}`)
  }

  const handleChecklistToggle = (itemId: string) => {
    const updatedChecklist = currentDeal.checklist.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date().toISOString().split('T')[0] : undefined
        }
      }
      return item
    })
    const updated = { ...currentDeal, checklist: updatedChecklist, updatedAt: new Date().toISOString() }
    setCurrentDeal(updated)
    onUpdateDeal(updated)
    toast.success('อัปเดตเช็กลิสต์เรียบร้อย')
  }

  const handleSaveNextAction = () => {
    onUpdateDeal(currentDeal)
    onAddActivity({
      dealId: deal.id,
      type: 'NOTE',
      title: `กำหนดนัดติดตาม: ${currentDeal.nextActionDate || 'ไม่ระบุวัน'}`,
      description: currentDeal.nextActionNote,
      actor: currentDeal.salesRep,
    })
    toast.success('บันทึกกำหนดการติดตามเรียบร้อย')
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    onAddActivity({
      dealId: deal.id,
      type: noteType,
      title: noteType === 'CALL' ? 'บันทึกการโทรคุย' : noteType === 'LINE' ? 'อัปเดตผ่าน LINE' : noteType === 'SAMPLE' ? 'ฟีดแบ็กตัวอย่างสูตร' : 'บันทึกโน้ต',
      description: newNote,
      actor: currentDeal.salesRep,
    })
    setNewNote('')
    toast.success('เพิ่มบันทึกกิจกรรมเรียบร้อย')
  }

  const handleConfirmLost = () => {
    const lostStage = stages.find(s => s.isLost)
    if (!lostStage) return

    const updated = {
      ...currentDeal,
      stageId: lostStage.id,
      lossReason: lossReasonInput,
      lossNote: lossNoteInput,
      updatedAt: new Date().toISOString(),
    }
    setCurrentDeal(updated)
    onUpdateDeal(updated)
    onAddActivity({
      dealId: deal.id,
      type: 'STAGE_CHANGE',
      title: 'ปิดการขายไม่สำเร็จ (Closed Lost)',
      description: `เหตุผล: ${lossReasonInput} ${lossNoteInput ? `- ${lossNoteInput}` : ''}`,
      actor: currentDeal.salesRep,
    })
    setShowLossModal(false)
    toast.error('บันทึกปิดการขายไม่สำเร็จ')
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`คัดลอก ${label} เรียบร้อย: ${text}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-amber-200/80 rounded-2xl">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#2D2721] to-[#3D352D] text-white p-6 rounded-t-2xl relative">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-amber-400 font-bold bg-black/30 px-2 py-0.5 rounded">
                {currentDeal.code}
              </span>
              {company?.tier === 'TIER_1' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  ⭐ Tier 1 Account
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-300">มูลค่าดีล:</span>
              <span className="text-lg font-extrabold text-amber-400">
                {formatCurrency(currentDeal.dealValue)}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            {currentDeal.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300 mt-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{company?.name || 'ไม่ระบุบริษัท'}</span>
            </div>
            {company?.brandName && (
              <div className="text-amber-300">แบรนด์: {company.brandName}</div>
            )}
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>เซลล์: {currentDeal.salesRep}</span>
            </div>
          </div>

          {/* Interactive Stage Progress Bar */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="text-[11px] text-amber-300/80 mb-2 font-medium">ความคืบหน้าของดีล (คลิกเพื่อเปลี่ยนสเตจ):</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
              {stages.map((stg, idx) => {
                const isCurrent = stg.id === currentDeal.stageId
                return (
                  <button
                    key={stg.id}
                    onClick={() => handleStageClick(stg.id)}
                    className={`px-2 py-1.5 rounded-lg text-center transition-all text-[11px] font-semibold flex flex-col justify-center border ${
                      isCurrent
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold scale-[1.03]'
                        : stg.isWon
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                        : stg.isLost
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-rose-900/60'
                        : 'bg-white/10 text-stone-200 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span className="truncate">{stg.name.split('.')[0]}</span>
                    <span className="text-[9px] opacity-80">{stg.probability}%</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/50">
          {/* Column 1 & 2: Details & Readiness Checklist */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact & Company 360 Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-600" />
                ข้อมูลลูกค้า & ผู้มีอำนาจตัดสินใจ
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">ผู้ติดต่อหลัก:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{contact?.name || '-'}</div>
                  <div className="text-slate-500 text-[11px]">{contact?.role || 'เจ้าของแบรนด์'}</div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 font-mono text-sm">{contact?.phone || '-'}</span>
                    {contact?.phone && (
                      <a 
                        href={`tel:${contact.phone}`}
                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        title="โทรออก"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">LINE ID / ช่องทางแชท:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-emerald-700 font-mono">{contact?.lineId || '-'}</span>
                    {contact?.lineId && (
                      <button
                        onClick={() => copyToClipboard(contact.lineId!, 'LINE ID')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">ช่องทางจำหน่ายของลูกค้า:</span>
                  <div className="text-slate-700 font-medium mt-0.5">
                    {company?.channelDescription || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* OEM/ODM Spec & Production Parameters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                ข้อกำหนดการผลิต (Manufacturing & Sourcing Specs)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">รูปแบบสูตร</span>
                  <span className="font-bold text-purple-700 text-sm">{currentDeal.formulaType}</span>
                  <span className="text-[10px] text-slate-400 block">
                    {currentDeal.formulaType === 'ODM' ? 'R&D พัฒนาสูตรใหม่' : 'ผลิตตามสูตรลูกค้า'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">จำนวนผลิต (MOQ)</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {currentDeal.quantity.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">ชิ้น / Batch</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">การจัดหาบรรจุภัณฑ์</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">
                    {currentDeal.packagingStatus === 'SOURCING' ? 'โรงงานจัดหา One-Stop' : currentDeal.packagingStatus === 'CLIENT_SUPPLIED' ? 'ลูกค้านำมาเอง' : 'คอนเฟิร์มแล้ว'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">บริการยื่น อย.</span>
                  <span className="font-bold text-indigo-700 text-xs mt-0.5 block truncate">
                    {currentDeal.fdaStatus === 'APPROVED' ? 'ได้เลข อย. แล้ว ✓' : currentDeal.fdaStatus === 'SUBMITTED' ? 'ยื่น อย. รออนุมัติ' : 'โรงงานดูแลให้'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manufacturing Readiness Checklist */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                เช็กลิสต์ความพร้อมก่อนส่งฝ่ายวางแผนผลิต (Readiness Gate)
              </h3>

              <div className="space-y-2">
                {currentDeal.checklist.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      item.completed 
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-800' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleChecklistToggle(item.id)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex-1 text-xs">
                      <span className={item.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}>
                        {item.label}
                      </span>
                      {item.completedAt && (
                        <span className="block text-[10px] text-emerald-700 mt-0.5">
                          เสร็จสมบูรณ์เมื่อ: {item.completedAt}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Next Action & Activity Log */}
          <div className="space-y-6">
            {/* Next Action Box */}
            <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                นัดหมาย & สิ่งที่ต้องทำต่อไป (Next Action)
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <Label className="text-[11px] text-slate-500">วันนัดติดตาม:</Label>
                  <Input
                    type="date"
                    value={currentDeal.nextActionDate || ''}
                    onChange={(e) => setCurrentDeal({ ...currentDeal, nextActionDate: e.target.value })}
                    className="h-8 text-xs bg-slate-50 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-[11px] text-slate-500">กิจกรรมที่ต้องทำ:</Label>
                  <Input
                    placeholder="เช่น โทรตามผลตัวอย่างสูตร, ส่งใบเสนอราคา..."
                    value={currentDeal.nextActionNote || ''}
                    onChange={(e) => setCurrentDeal({ ...currentDeal, nextActionNote: e.target.value })}
                    className="h-8 text-xs bg-slate-50 mt-1"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={handleSaveNextAction}
                  className="w-full bg-[#2D2721] text-amber-400 hover:bg-[#3D352D] text-xs h-8 mt-1"
                >
                  บันทึกการนัดหมาย
                </Button>
              </div>
            </div>

            {/* Quick Activity Note Input */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                เพิ่มบันทึกการติดต่อ
              </h3>

              <div className="flex items-center gap-1">
                {(['NOTE', 'CALL', 'LINE', 'SAMPLE'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNoteType(t)}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded ${
                      noteType === t ? 'bg-[#2D2721] text-amber-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t === 'CALL' ? 'โทร' : t === 'LINE' ? 'LINE' : t === 'SAMPLE' ? 'ตัวอย่าง' : 'โน้ต'}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="พิมพ์บันทึกรายละเอียดการคุย หรือฟีดแบ็กลูกค้า..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-amber-400"
              />

              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="w-full h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
              >
                <Send className="w-3 h-3 mr-1" />
                บันทึกกิจกรรม
              </Button>
            </div>

            {/* Activity History Timeline */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ประวัติกิจกรรม ({dealActivities.length})
              </h3>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {dealActivities.map(act => (
                  <div key={act.id} className="text-xs border-l-2 border-amber-400 pl-3 py-0.5 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-700">{act.actor}</span>
                      <span>{act.createdAt}</span>
                    </div>
                    <div className="font-medium text-slate-900">{act.title}</div>
                    {act.description && (
                      <p className="text-slate-500 text-[11px] leading-relaxed">{act.description}</p>
                    )}
                  </div>
                ))}

                {dealActivities.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4">ยังไม่มีบันทึกกิจกรรม</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('ต้องการลบดีลนี้หรือไม่?')) {
                onDeleteDeal(deal.id)
                onClose()
              }
            }}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            ลบดีล
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLossModal(true)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
            >
              ปิดการขายไม่สำเร็จ (Lost)
            </Button>

            <Button
              size="sm"
              onClick={() => {
                const wonStage = stages.find(s => s.isWon)
                if (wonStage) handleStageClick(wonStage.id)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              🎉 ปิดการขายสำเร็จ (Won)
            </Button>
          </div>
        </div>

        {/* Closed Lost Reason Modal */}
        {showLossModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900">บันทึกเหตุผลที่ไม่สำเร็จ</h3>
                </div>
                <button onClick={() => setShowLossModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                ข้อมูลนี้จะถูกเก็บไว้สำหรับวิเคราะห์จุดบกพร่องและปรับปรุงกลยุทธ์การขายของโรงงาน
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-xs">เหตุผลหลัก:</Label>
                  <select
                    value={lossReasonInput}
                    onChange={(e) => setLossReasonInput(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium"
                  >
                    <option value="">-- เลือกเหตุผลหลัก --</option>
                    <option value="ราคาต่อชิ้นสูงเกินงบประมาณลูกค้า">ราคาต่อชิ้นสูงเกินงบประมาณลูกค้า</option>
                    <option value="MOQ ขั้นต่ำ 500-3,000 ชิ้นสูงเกินไป">MOQ ขั้นต่ำสูงเกินไป</option>
                    <option value="สูตรยังไม่ถูกใจ / ลูกค้าเปลี่ยนสเปก">สูตรยังไม่ถูกใจ / ลูกค้าเปลี่ยนสเปก</option>
                    <option value="ลูกค้าเลือกโรงงานอื่นที่ราคาถูกกว่า">ลูกค้าเลือกโรงงานอื่นที่ราคาถูกกว่า</option>
                    <option value="ลูกค้าชะลอโครงการทำแบรนด์ออกไป">ลูกค้าชะลอโครงการทำแบรนด์ออกไป</option>
                    <option value="ติดปัญหา อย. / สารสกัดต้องห้าม">ติดปัญหา อย. / สารสกัดต้องห้าม</option>
                    <option value="ติดต่อลูกค้าไม่ได้ / ลีดเงียบหาย">ติดต่อลูกค้าไม่ได้ / ลีดเงียบหาย</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">รายละเอียดเพิ่มเติม:</Label>
                  <textarea
                    rows={3}
                    placeholder="บันทึกรายละเอียดเพื่อวิเคราะห์..."
                    value={lossNoteInput}
                    onChange={(e) => setLossNoteInput(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowLossModal(false)} className="text-xs">
                  ยกเลิก
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleConfirmLost}
                  disabled={!lossReasonInput}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                >
                  ยืนยันบันทึก Lost
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
