'use client'

import React, { useState } from 'react'
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MessageCircle, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink,
  Sparkles
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Company, Contact, Deal } from './types'

interface CompanyDirectoryModalProps {
  isOpen: boolean
  onClose: () => void
  companies: Company[]
  contacts: Contact[]
  deals: Deal[]
  onAddCompany: (company: Omit<Company, 'id' | 'createdAt'>, contact: Omit<Contact, 'id' | 'companyId' | 'createdAt'>) => void
}

export const CompanyDirectoryModal: React.FC<CompanyDirectoryModalProps> = ({
  isOpen,
  onClose,
  companies,
  contacts,
  deals,
  onAddCompany,
}) => {
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // New company form
  const [name, setName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [tier, setTier] = useState<'TIER_1' | 'TIER_2'>('TIER_2')
  const [channel, setChannel] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactLine, setContactLine] = useState('')

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.brandName && c.brandName.toLowerCase().includes(search.toLowerCase())) ||
    (c.channelDescription && c.channelDescription.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !contactName.trim() || !contactPhone.trim()) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน')
      return
    }

    onAddCompany(
      {
        name: name.trim(),
        brandName: brandName.trim() || undefined,
        tier,
        channelDescription: channel.trim() || undefined,
      },
      {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        lineId: contactLine.trim() || undefined,
        isPrimary: true,
      }
    )

    toast.success('เพิ่มบริษัทและผู้ติดต่อเรียบร้อย')
    setName('')
    setBrandName('')
    setChannel('')
    setContactName('')
    setContactPhone('')
    setContactLine('')
    setShowAddForm(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  ทะเบียนแบรนด์ & ลูกค้า B2B (Companies & Contacts)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  รายชื่อบริษัท เจ้าของแบรนด์ และผู้ติดต่อที่ผูกอยู่กับดีลในไปป์ไลน์
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#2D2721] text-amber-400 hover:bg-[#3D352D] text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {showAddForm ? 'ปิดฟอร์ม' : 'เพิ่มบริษัทใหม่'}
            </Button>
          </div>
        </DialogHeader>

        {/* Add Company Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 rounded-xl border border-amber-300 space-y-3 my-2 text-xs">
            <h4 className="font-bold text-slate-800">เพิ่มบริษัท / แบรนด์ลูกค้าใหม่</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">ชื่อบริษัท / นิติบุคคล: *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น บริษัท เอเพ็กซ์ สกินแคร์ จำกัด"
                  className="h-8 text-xs bg-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px]">ชื่อแบรนด์สินค้า:</Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="เช่น Apex Glow, Dr. Skin"
                  className="h-8 text-xs bg-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">กลุ่มลูกค้า (Tier):</Label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="TIER_1">⭐ Tier 1: แบรนด์ใหญ่ / ห้าง / EVEANDBOY / TikTok ดัง</option>
                  <option value="TIER_2">🌱 Tier 2: SME / คลินิก / สปา / สตาร์ทอัพ</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px]">ช่องทางจำหน่าย:</Label>
                <Input
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="เช่น ร้านสะดวกซื้อ 7-11, วัตสัน, คลินิก 5 สาขา"
                  className="h-8 text-xs bg-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div>
                <Label className="text-[11px]">ชื่อผู้ติดต่อ: *</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="เช่น คุณธนกร"
                  className="h-8 text-xs bg-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px]">เบอร์โทรศัพท์: *</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="เช่น 089-123-4567"
                  className="h-8 text-xs bg-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px]">LINE ID:</Label>
                <Input
                  value={contactLine}
                  onChange={(e) => setContactLine(e.target.value)}
                  placeholder="เช่น @tanakorn"
                  className="h-8 text-xs bg-white mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs">
                ยกเลิก
              </Button>
              <Button type="submit" size="sm" className="bg-[#2D2721] text-amber-400 text-xs font-semibold">
                บันทึกข้อมูล
              </Button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="relative my-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อบริษัท, แบรนด์ หรือช่องทางจัดจำหน่าย..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50"
          />
        </div>

        {/* Companies List */}
        <div className="space-y-3 mt-3">
          {filteredCompanies.map(company => {
            const companyContacts = contacts.filter(c => c.companyId === company.id)
            const companyDeals = deals.filter(d => d.companyId === company.id)
            const totalDealsValue = companyDeals.reduce((sum, d) => sum + d.dealValue, 0)

            return (
              <div 
                key={company.id} 
                className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-amber-300 shadow-2xs transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{company.name}</h4>
                      {company.tier === 'TIER_1' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
                          ⭐ Tier 1
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          Tier 2
                        </span>
                      )}
                    </div>
                    {company.brandName && (
                      <div className="text-xs font-medium text-amber-700 mt-0.5">
                        แบรนด์: {company.brandName}
                      </div>
                    )}
                    {company.channelDescription && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        ช่องทาง: {company.channelDescription}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">
                      {companyDeals.length} ดีล
                    </span>
                    <span className="text-[11px] text-amber-700 font-semibold">
                      {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(totalDealsValue)}
                    </span>
                  </div>
                </div>

                {/* Contacts List */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  {companyContacts.map(cnt => (
                    <div key={cnt.id} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-800">{cnt.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{cnt.phone}</span>
                      {cnt.lineId && (
                        <span className="text-emerald-700 text-[10px] font-mono font-medium">
                          LINE: {cnt.lineId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredCompanies.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              ไม่พบข้อมูลบริษัทที่ค้นหา
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
