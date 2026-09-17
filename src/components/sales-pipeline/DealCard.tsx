'use client'

import React from 'react'
import { 
  Building2, 
  User, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react'
import { Deal, Company, Contact, PipelineStage } from './types'

interface DealCardProps {
  deal: Deal
  company?: Company
  contact?: Contact
  stages: PipelineStage[]
  onSelectDeal: (deal: Deal) => void
  onMoveStage: (dealId: string, newStageId: string) => void
}

export const DealCard: React.FC<DealCardProps> = ({
  deal,
  company,
  contact,
  stages,
  onSelectDeal,
  onMoveStage,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val)
  }

  // Check if next action is overdue or today
  const isOverdue = deal.nextActionDate && new Date(deal.nextActionDate) <= new Date()

  // Sample status display
  const getSampleBadge = () => {
    switch (deal.sampleStatus) {
      case 'APPROVED':
        return <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">สูตรผ่านแล้ว ✓</span>
      case 'SENT_ROUND_1':
        return <span className="inline-flex items-center text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">ส่งตัวอย่างรอบ 1</span>
      case 'SENT_ROUND_2':
        return <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">ส่งตัวอย่างรอบ 2</span>
      case 'LAB_DEVELOPING':
        return <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">R&D กำลังพัฒนา</span>
      default:
        return null
    }
  }

  return (
    <div 
      onClick={() => onSelectDeal(deal)}
      className="group bg-white rounded-xl p-3.5 border border-slate-200 hover:border-amber-400/80 shadow-xs hover:shadow-md transition-all cursor-pointer relative flex flex-col justify-between gap-2.5"
    >
      {/* Top: Deal Code & Tier Badge */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono font-semibold text-slate-400 tracking-wider">
          {deal.code}
        </span>
        
        {company?.tier === 'TIER_1' ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
            ⭐ Tier 1
          </span>
        ) : (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            Tier 2
          </span>
        )}
      </div>

      {/* Title */}
      <div>
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2 leading-snug">
          {deal.title}
        </h4>

        {/* Associated Company & Brand */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium truncate">{company?.name || 'ไม่ระบุบริษัท'}</span>
        </div>
        {company?.brandName && (
          <div className="text-[11px] text-amber-700 font-medium pl-5 truncate">
            แบรนด์: {company.brandName}
          </div>
        )}
      </div>

      {/* Product Spec Badges */}
      <div className="flex flex-wrap items-center gap-1">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          deal.formulaType === 'ODM' 
            ? 'bg-purple-50 text-purple-700 border border-purple-200' 
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {deal.formulaType}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
          {deal.quantity.toLocaleString()} ชิ้น
        </span>
        {getSampleBadge()}
      </div>

      {/* Financials */}
      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium">มูลค่าดีล</div>
          <div className="text-sm font-bold text-slate-900">
            {formatCurrency(deal.dealValue)}
          </div>
        </div>

        {/* Sales Rep */}
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-medium">ผู้ดูแล</div>
          <div className="text-xs font-semibold text-slate-700 max-w-[90px] truncate">
            {deal.salesRep.split(' ')[0]}
          </div>
        </div>
      </div>

      {/* Next Action Indicator */}
      {deal.nextActionDate && (
        <div className={`text-[11px] p-1.5 rounded-md flex items-center justify-between gap-1.5 ${
          isOverdue ? 'bg-rose-50 text-rose-800 font-medium border border-rose-200' : 'bg-slate-50 text-slate-600'
        }`}>
          <div className="flex items-center gap-1 truncate">
            <Clock className={`w-3 h-3 shrink-0 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
            <span className="truncate">{deal.nextActionNote || 'นัดติดตามผล'}</span>
          </div>
          <span className="text-[10px] shrink-0 font-mono font-semibold">
            {new Date(deal.nextActionDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}

      {/* Quick Move Stage Control (prevents needing drag on mobile/laptop trackpads) */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="pt-1 flex items-center justify-between text-[11px] text-slate-400"
      >
        <span className="text-[10px]">ย้ายไปสเตจ:</span>
        <select
          value={deal.stageId}
          onChange={(e) => onMoveStage(deal.id, e.target.value)}
          className="text-[11px] font-medium bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 hover:border-amber-400 cursor-pointer max-w-[130px] truncate"
        >
          {stages.map(stg => (
            <option key={stg.id} value={stg.id}>
              {stg.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
