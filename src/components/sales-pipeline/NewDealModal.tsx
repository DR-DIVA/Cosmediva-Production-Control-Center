'use client'

import React, { useState } from 'react'
import { 
  Building2, 
  User, 
  DollarSign, 
  Layers, 
  Calendar, 
  Clock, 
  Plus, 
  Sparkles,
  Phone,
  MessageCircle,
  FileText
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Deal, Company, Contact, PipelineStage, CustomerTier, ProductCategory, FormulaType } from './types'

interface NewDealModalProps {
  isOpen: boolean
  onClose: () => void
  companies: Company[]
  contacts: Contact[]
  stages: PipelineStage[]
  salesReps: string[]
  initialStageId?: string
  onCreateDeal: (
    dealData: Omit<Deal, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'lastActivityDate'>,
    newCompany?: Omit<Company, 'id' | 'createdAt'>,
    newContact?: Omit<Contact, 'id' | 'companyId' | 'createdAt'>
  ) => void
}

export const NewDealModal: React.FC<NewDealModalProps> = ({
  isOpen,
  onClose,
  companies,
  contacts,
  stages,
  salesReps,
  initialStageId,
  onCreateDeal,
}) => {
  // Mode: select existing company vs create new company
  const [isNewCompany, setIsNewCompany] = useState(false)

  // Selected existing
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id || '')
  const [selectedContactId, setSelectedContactId] = useState('')

  // New company fields
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newBrandName, setNewBrandName] = useState('')
  const [newTier, setNewTier] = useState<CustomerTier>('TIER_2')
  const [newChannel, setNewChannel] = useState('')

  // New contact fields
  const [newContactName, setNewContactName] = useState('')
  const [newContactRole, setNewContactRole] = useState('เจ้าของแบรนด์')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactLine, setNewContactLine] = useState('')

  // Deal fields
  const [dealTitle, setDealTitle] = useState('')
  const [stageId, setStageId] = useState(initialStageId || stages[0]?.id || '')
  const [salesRep, setSalesRep] = useState(salesReps[0] || '')
  const [dealValue, setDealValue] = useState<number>(350000)
  const [quantity, setQuantity] = useState<number>(3000)
  const [productCategory, setProductCategory] = useState<ProductCategory>('skincare')
  const [formulaType, setFormulaType] = useState<FormulaType>('ODM')
  const [packagingStatus, setPackagingStatus] = useState<'SOURCING' | 'CLIENT_SUPPLIED'>('SOURCING')
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  )
  const [nextActionDate, setNextActionDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  )
  const [nextActionNote, setNextActionNote] = useState('โทรคุยบรีฟสเปกสูตรและประเมินงบประมาณ')

  // Auto-sync contact when company changes
  React.useEffect(() => {
    if (selectedCompanyId) {
      const companyContacts = contacts.filter(c => c.companyId === selectedCompanyId)
      if (companyContacts.length > 0) {
        setSelectedContactId(companyContacts[0].id)
      } else {
        setSelectedContactId('')
      }
    }
  }, [selectedCompanyId, contacts])

  // Sync initialStageId if passed
  React.useEffect(() => {
    if (initialStageId) setStageId(initialStageId)
  }, [initialStageId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!dealTitle.trim()) {
      toast.error('กรุณาระบุชื่อดีลงานขาย')
      return
    }

    if (isNewCompany) {
      if (!newCompanyName.trim()) {
        toast.error('กรุณาระบุชื่อบริษัท หรือชื่อร้านค้า/คลินิก')
        return
      }
      if (!newContactName.trim() || !newContactPhone.trim()) {
        toast.error('กรุณาระบุชื่อผู้ติดต่อและเบอร์โทรศัพท์')
        return
      }

      onCreateDeal(
        {
          title: dealTitle.trim(),
          companyId: '', // will be assigned in parent
          contactId: '', // will be assigned in parent
          salesRep,
          stageId,
          dealValue: Number(dealValue) || 0,
          quantity: Number(quantity) || 0,
          productCategory,
          formulaType,
          packagingStatus,
          fdaStatus: 'FACTORY_REG',
          sampleStatus: 'PENDING_BRIEF',
          expectedCloseDate,
          nextActionDate,
          nextActionNote,
          checklist: [
            { id: 'c1', label: 'วิจัยและทดสอบสูตรตัวอย่างผ่านเกณฑ์', completed: false },
            { id: 'c2', label: 'สรุปขนาดและรูปแบบบรรจุภัณฑ์', completed: false },
            { id: 'c3', label: 'ยื่นจดแจ้ง อย. สำเร็จ', completed: false },
            { id: 'c4', label: 'รับชำระเงินมัดจำงวดแรก 50%', completed: false },
          ],
        },
        {
          name: newCompanyName.trim(),
          brandName: newBrandName.trim() || undefined,
          tier: newTier,
          channelDescription: newChannel.trim() || undefined,
        },
        {
          name: newContactName.trim(),
          role: newContactRole.trim(),
          phone: newContactPhone.trim(),
          lineId: newContactLine.trim() || undefined,
          isPrimary: true,
        }
      )
    } else {
      if (!selectedCompanyId) {
        toast.error('กรุณาเลือกลูกค้าหรือบริษัท')
        return
      }

      onCreateDeal({
        title: dealTitle.trim(),
        companyId: selectedCompanyId,
        contactId: selectedContactId,
        salesRep,
        stageId,
        dealValue: Number(dealValue) || 0,
        quantity: Number(quantity) || 0,
        productCategory,
        formulaType,
        packagingStatus,
        fdaStatus: 'FACTORY_REG',
        sampleStatus: 'PENDING_BRIEF',
        expectedCloseDate,
        nextActionDate,
        nextActionNote,
        checklist: [
          { id: 'c1', label: 'วิจัยและทดสอบสูตรตัวอย่างผ่านเกณฑ์', completed: false },
          { id: 'c2', label: 'สรุปขนาดและรูปแบบบรรจุภัณฑ์', completed: false },
          { id: 'c3', label: 'ยื่นจดแจ้ง อย. สำเร็จ', completed: false },
          { id: 'c4', label: 'รับชำระเงินมัดจำงวดแรก 50%', completed: false },
        ],
      })
    }

    toast.success('สร้างดีลใหม่สำเร็จ')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-amber-200">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                สร้างดีลงานขายใหม่ (New Deal)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                บันทึกโอกาสการขาย ผูกกับบริษัท/แบรนด์ลูกค้า และกำหนดเป้าหมายการผลิต
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-xs">
          {/* Section 1: Customer / Company Linkage */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>ข้อมูลบริษัท & ผู้ติดต่อ (B2B Account)</span>
              </div>

              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewCompany(false)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    !isNewCompany ? 'bg-[#2D2721] text-amber-400' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  เลือกลูกค้าเดิม
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCompany(true)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    isNewCompany ? 'bg-[#2D2721] text-amber-400' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + ลูกค้าใหม่
                </button>
              </div>
            </div>

            {!isNewCompany ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-slate-600">บริษัท / ธุรกิจ:</Label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.brandName ? `(${c.brandName})` : ''} - {c.tier === 'TIER_1' ? '⭐ Tier 1' : 'Tier 2'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] text-slate-600">ผู้ติดต่อ:</Label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                  >
                    {contacts.filter(c => c.companyId === selectedCompanyId).map(cnt => (
                      <option key={cnt.id} value={cnt.id}>
                        {cnt.name} ({cnt.role || 'ผู้ติดต่อ'}) - {cnt.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-600">ชื่อบริษัท / นิติบุคคล / ธุรกิจ: *</Label>
                    <Input
                      placeholder="เช่น บริษัท ลักซ์ชัวรี่ บิวตี้ จำกัด"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="h-8 text-xs bg-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">ชื่อแบรนด์สินค้า:</Label>
                    <Input
                      placeholder="เช่น GLOW ME, Dr. White"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="h-8 text-xs bg-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-600">กลุ่มลูกค้า (Tier):</Label>
                    <select
                      value={newTier}
                      onChange={(e) => setNewTier(e.target.value as CustomerTier)}
                      className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                    >
                      <option value="TIER_1">⭐ Tier 1: แบรนด์ใหญ่ / จัดจำหน่ายเข้าห้าง / TikTok Shop ดัง</option>
                      <option value="TIER_2">🌱 Tier 2: SME / Startup / คลินิกความงาม / สปา</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">ช่องทางจำหน่าย:</Label>
                    <Input
                      placeholder="เช่น Eveandboy, Watsons, คลินิก 2 สาขา"
                      value={newChannel}
                      onChange={(e) => setNewChannel(e.target.value)}
                      className="h-8 text-xs bg-white mt-1"
                    />
                  </div>
                </div>

                {/* Contact person */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60">
                  <div>
                    <Label className="text-[11px] text-slate-600">ชื่อผู้ติดต่อ: *</Label>
                    <Input
                      placeholder="เช่น คุณกมลวรรณ"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="h-8 text-xs bg-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">เบอร์โทรศัพท์: *</Label>
                    <Input
                      placeholder="เช่น 081-234-5678"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      className="h-8 text-xs bg-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-600">LINE ID:</Label>
                    <Input
                      placeholder="เช่น @brand_official"
                      value={newContactLine}
                      onChange={(e) => setNewContactLine(e.target.value)}
                      className="h-8 text-xs bg-white mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Deal Details */}
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] text-slate-700 font-semibold">ชื่อโครงการ / หัวข้อดีล: *</Label>
              <Input
                placeholder="เช่น เซรั่มทองคำกู้ผิวใส 30ml ล็อต 5,000 ชิ้น"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                className="h-8 text-xs bg-white mt-1 font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-slate-600">สเตจเริ่มต้น:</Label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                >
                  {stages.map(stg => (
                    <option key={stg.id} value={stg.id}>{stg.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">พนักงานขายผู้ดูแล:</Label>
                <select
                  value={salesRep}
                  onChange={(e) => setSalesRep(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                >
                  {salesReps.map(rep => (
                    <option key={rep} value={rep}>{rep}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">หมวดหมู่สินค้า:</Label>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value as ProductCategory)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="skincare">Skincare (บำรุงผิว)</option>
                  <option value="facial_care">Facial Care (ดูแลผิวหน้า)</option>
                  <option value="body_care">Body Care (ผิวกาย)</option>
                  <option value="haircare">Hair Care (เส้นผม)</option>
                  <option value="sunscreen">Sunscreen (กันแดด)</option>
                  <option value="personal_care">Personal Care (ชำระล้าง)</option>
                  <option value="other">อื่น ๆ</option>
                </select>
              </div>
            </div>

            {/* Production Parameters: Formula & Quantity & Value */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-slate-600">รูปแบบบริการสูตร:</Label>
                <select
                  value={formulaType}
                  onChange={(e) => setFormulaType(e.target.value as FormulaType)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-semibold text-purple-700"
                >
                  <option value="ODM">ODM (R&D พัฒนาสูตรใหม่)</option>
                  <option value="OEM">OEM (ผลิตตามสูตรลูกค้า)</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">จำนวนผลิตเป้าหมาย (ชิ้น):</Label>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="h-8 text-xs bg-white mt-1 font-bold"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">มูลค่าดีลคาดการณ์ (บาท):</Label>
                <Input
                  type="number"
                  min={1000}
                  step={10000}
                  value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="h-8 text-xs bg-white mt-1 font-bold text-amber-700"
                />
              </div>
            </div>

            {/* Sourcing & Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-slate-600">บรรจุภัณฑ์ (Packaging):</Label>
                <select
                  value={packagingStatus}
                  onChange={(e) => setPackagingStatus(e.target.value as any)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="SOURCING">โรงงานจัดหาให้ One-Stop</option>
                  <option value="CLIENT_SUPPLIED">ลูกค้านำบรรจุภัณฑ์มาเอง</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">วันที่คาดว่าจะปิดการขาย:</Label>
                <Input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="h-8 text-xs bg-white mt-1"
                />
              </div>
            </div>

            {/* Next Action */}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-amber-900 font-semibold">วันนัดติดตามผลรอบแรก:</Label>
                <Input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="h-8 text-xs bg-white mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-amber-900 font-semibold">กิจกรรมที่ต้องทำ:</Label>
                <Input
                  placeholder="เช่น โทรคุยบรีฟสูตร..."
                  value={nextActionNote}
                  onChange={(e) => setNextActionNote(e.target.value)}
                  className="h-8 text-xs bg-white mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#2D2721] hover:bg-[#3D352D] text-amber-400 font-semibold text-xs border border-[#D4AF37]/50 shadow-sm"
            >
              บันทึกสร้างดีล
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
