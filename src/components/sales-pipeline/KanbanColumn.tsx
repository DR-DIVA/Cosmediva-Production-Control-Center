'use client'

import React from 'react'
import { Plus, MoreHorizontal, Sparkles } from 'lucide-react'
import { PipelineStage, Deal, Company, Contact } from './types'
import { DealCard } from './DealCard'

interface KanbanColumnProps {
  stage: PipelineStage
  deals: Deal[]
  companies: Company[]
  contacts: Contact[]
  stages: PipelineStage[]
  onSelectDeal: (deal: Deal) => void
  onMoveStage: (dealId: string, newStageId: string) => void
  onQuickAddDeal: (stageId: string) => void
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  deals,
  companies,
  contacts,
  stages,
  onSelectDeal,
  onMoveStage,
  onQuickAddDeal,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val)
  }

  const columnTotalValue = deals.reduce((sum, d) => sum + d.dealValue, 0)
  const columnWeightedValue = columnTotalValue * (stage.probability / 100)

  return (
    <div className="w-[300px] shrink-0 flex flex-col bg-slate-100/70 rounded-2xl border border-slate-200/80 max-h-[calc(100vh-250px)]">
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-200/80 bg-white/60 rounded-t-2xl backdrop-blur-xs">
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-2 truncate">
            <div className={`w-2.5 h-2.5 rounded-full ${
              stage.isWon ? 'bg-emerald-500' : stage.isLost ? 'bg-rose-500' : 'bg-amber-500'
            }`} />
            <h3 className="text-xs font-bold text-slate-800 truncate" title={stage.name}>
              {stage.name}
            </h3>
          </div>
          
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
            {deals.length}
          </span>
        </div>

        {/* Stage Value & Probability */}
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-bold text-slate-900">
            {formatCurrency(columnTotalValue)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            โอกาส: <strong className="text-amber-700">{stage.probability}%</strong>
          </span>
        </div>

        {stage.probability > 0 && stage.probability < 100 && (
          <div className="text-[10px] text-slate-400 mt-0.5">
            ถ่วงน้ำหนัก: {formatCurrency(columnWeightedValue)}
          </div>
        )}
      </div>

      {/* Cards Container */}
      <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
        {deals.map(deal => {
          const company = companies.find(c => c.id === deal.companyId)
          const contact = contacts.find(c => c.id === deal.contactId)
          return (
            <DealCard
              key={deal.id}
              deal={deal}
              company={company}
              contact={contact}
              stages={stages}
              onSelectDeal={onSelectDeal}
              onMoveStage={onMoveStage}
            />
          )
        })}

        {deals.length === 0 && (
          <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 font-medium">
            ไม่มีดีลในขั้นนี้
          </div>
        )}
      </div>

      {/* Bottom Quick Add */}
      {!stage.isWon && !stage.isLost && (
        <div className="p-2 border-t border-slate-200/80 bg-white/40 rounded-b-2xl">
          <button
            onClick={() => onQuickAddDeal(stage.id)}
            className="w-full py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มดีล</span>
          </button>
        </div>
      )}
    </div>
  )
}
