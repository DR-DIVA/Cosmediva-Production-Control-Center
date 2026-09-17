'use client'

import React from 'react'
import { Building2, User, Phone, Clock, Sparkles } from 'lucide-react'
import { Deal, Company, Contact, PipelineStage } from './types'

interface DealTableViewProps {
  deals: Deal[]
  companies: Company[]
  contacts: Contact[]
  stages: PipelineStage[]
  onSelectDeal: (deal: Deal) => void
  onMoveStage: (dealId: string, newStageId: string) => void
}

export const DealTableView: React.FC<DealTableViewProps> = ({
  deals,
  companies,
  contacts,
  stages,
  onSelectDeal,
  onMoveStage,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">รหัส / ชื่อดีล</th>
              <th className="py-3 px-4">บริษัท / แบรนด์</th>
              <th className="py-3 px-4">ผู้ติดต่อ</th>
              <th className="py-3 px-4">สเตจงานขาย</th>
              <th className="py-3 px-4 text-right">จำนวน (ชิ้น)</th>
              <th className="py-3 px-4 text-right">มูลค่าดีล</th>
              <th className="py-3 px-4">เซลล์ผู้ดูแล</th>
              <th className="py-3 px-4">นัดติดตามถัดไป</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {deals.map(deal => {
              const company = companies.find(c => c.id === deal.companyId)
              const contact = contacts.find(c => c.id === deal.contactId)
              const stage = stages.find(s => s.id === deal.stageId)
              const isOverdue = deal.nextActionDate && new Date(deal.nextActionDate) <= new Date()

              return (
                <tr 
                  key={deal.id}
                  onClick={() => onSelectDeal(deal)}
                  className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                >
                  {/* Code & Title */}
                  <td className="py-3 px-4">
                    <div className="font-mono text-[10px] text-slate-400 font-semibold">{deal.code}</div>
                    <div className="font-bold text-slate-900 line-clamp-1 max-w-[220px]">{deal.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1 rounded ${
                        deal.formulaType === 'ODM' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {deal.formulaType}
                      </span>
                      <span className="text-[10px] text-slate-500">{deal.productCategory}</span>
                    </div>
                  </td>

                  {/* Company & Brand */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 line-clamp-1">{company?.name || '-'}</span>
                      {company?.tier === 'TIER_1' && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Tier 1
                        </span>
                      )}
                    </div>
                    {company?.brandName && (
                      <div className="text-[11px] text-amber-700">แบรนด์: {company.brandName}</div>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{contact?.name || '-'}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{contact?.phone || '-'}</div>
                  </td>

                  {/* Stage Switcher */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={deal.stageId}
                      onChange={(e) => onMoveStage(deal.id, e.target.value)}
                      className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 hover:border-amber-400 cursor-pointer max-w-[170px]"
                    >
                      {stages.map(stg => (
                        <option key={stg.id} value={stg.id}>
                          {stg.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-4 text-right font-medium">
                    {deal.quantity.toLocaleString()}
                  </td>

                  {/* Value */}
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(deal.dealValue)}
                  </td>

                  {/* Sales Rep */}
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {deal.salesRep}
                  </td>

                  {/* Next Action */}
                  <td className="py-3 px-4">
                    {deal.nextActionDate ? (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                        isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(deal.nextActionDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {deals.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                  ไม่พบดีลที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
