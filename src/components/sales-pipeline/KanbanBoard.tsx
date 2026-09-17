'use client'

import React from 'react'
import { PipelineStage, Deal, Company, Contact } from './types'
import { KanbanColumn } from './KanbanColumn'

interface KanbanBoardProps {
  stages: PipelineStage[]
  deals: Deal[]
  companies: Company[]
  contacts: Contact[]
  onSelectDeal: (deal: Deal) => void
  onMoveStage: (dealId: string, newStageId: string) => void
  onQuickAddDeal: (stageId: string) => void
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  deals,
  companies,
  contacts,
  onSelectDeal,
  onMoveStage,
  onQuickAddDeal,
}) => {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  return (
    <div className="flex items-start gap-4 overflow-x-auto pb-4 pt-1 px-0.5 select-none">
      {sortedStages.map(stage => {
        const stageDeals = deals.filter(d => d.stageId === stage.id)
        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={stageDeals}
            companies={companies}
            contacts={contacts}
            stages={stages}
            onSelectDeal={onSelectDeal}
            onMoveStage={onMoveStage}
            onQuickAddDeal={onQuickAddDeal}
          />
        )
      })}
    </div>
  )
}
