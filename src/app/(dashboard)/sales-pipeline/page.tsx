'use client'

import React, { useState, useEffect } from 'react'
import { PipelineStage, Deal, Company, Contact, ActivityLog, CustomerTier, ProductCategory } from '@/components/sales-pipeline/types'
import { 
  DEFAULT_STAGES, 
  INITIAL_COMPANIES, 
  INITIAL_CONTACTS, 
  INITIAL_DEALS, 
  INITIAL_ACTIVITIES, 
  SALES_REPS 
} from '@/components/sales-pipeline/mockData'
import { SalesPipelineHeader } from '@/components/sales-pipeline/SalesPipelineHeader'
import { SalesPipelineFilters } from '@/components/sales-pipeline/SalesPipelineFilters'
import { KanbanBoard } from '@/components/sales-pipeline/KanbanBoard'
import { DealTableView } from '@/components/sales-pipeline/DealTableView'
import { DealDetailModal } from '@/components/sales-pipeline/DealDetailModal'
import { StageSettingsModal } from '@/components/sales-pipeline/StageSettingsModal'
import { NewDealModal } from '@/components/sales-pipeline/NewDealModal'
import { CompanyDirectoryModal } from '@/components/sales-pipeline/CompanyDirectoryModal'
import { toast } from 'sonner'

export default function SalesPipelinePage() {
  // Persistence state
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_STAGES)
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS)
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES)
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS)
  const [activities, setActivities] = useState<ActivityLog[]>(INITIAL_ACTIVITIES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRep, setSelectedRep] = useState('ALL')
  const [selectedTier, setSelectedTier] = useState<'ALL' | CustomerTier>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ProductCategory>('ALL')
  const [onlyStale, setOnlyStale] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')

  // Modals state
  const [isNewDealOpen, setIsNewDealOpen] = useState(false)
  const [newDealStageId, setNewDealStageId] = useState<string | undefined>(undefined)
  const [isStageSettingsOpen, setIsStageSettingsOpen] = useState(false)
  const [isCompaniesOpen, setIsCompaniesOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  // 1. Load from localStorage on mount
  useEffect(() => {
    try {
      const savedStages = localStorage.getItem('cosmeflow_sales_stages')
      const savedDeals = localStorage.getItem('cosmeflow_sales_deals')
      const savedCompanies = localStorage.getItem('cosmeflow_sales_companies')
      const savedContacts = localStorage.getItem('cosmeflow_sales_contacts')
      const savedActivities = localStorage.getItem('cosmeflow_sales_activities')

      if (savedStages) setStages(JSON.parse(savedStages))
      if (savedDeals) setDeals(JSON.parse(savedDeals))
      if (savedCompanies) setCompanies(JSON.parse(savedCompanies))
      if (savedContacts) setContacts(JSON.parse(savedContacts))
      if (savedActivities) setActivities(JSON.parse(savedActivities))
    } catch (e) {
      console.error('Error loading saved sales data from localStorage:', e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // 2. Persist to localStorage when data changes
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem('cosmeflow_sales_stages', JSON.stringify(stages))
      localStorage.setItem('cosmeflow_sales_deals', JSON.stringify(deals))
      localStorage.setItem('cosmeflow_sales_companies', JSON.stringify(companies))
      localStorage.setItem('cosmeflow_sales_contacts', JSON.stringify(contacts))
      localStorage.setItem('cosmeflow_sales_activities', JSON.stringify(activities))
    } catch (e) {
      console.error('Error saving sales data to localStorage:', e)
    }
  }, [stages, deals, companies, contacts, activities, isLoaded])

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    const company = companies.find(c => c.id === deal.companyId)
    const contact = contacts.find(c => c.id === deal.contactId)

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchTitle = deal.title.toLowerCase().includes(q)
      const matchCode = deal.code.toLowerCase().includes(q)
      const matchCompany = company ? company.name.toLowerCase().includes(q) || (company.brandName && company.brandName.toLowerCase().includes(q)) : false
      const matchContact = contact ? contact.name.toLowerCase().includes(q) || contact.phone.includes(q) : false
      if (!matchTitle && !matchCode && !matchCompany && !matchContact) return false
    }

    // Sales Rep
    if (selectedRep !== 'ALL' && deal.salesRep !== selectedRep) {
      return false
    }

    // Customer Tier
    if (selectedTier !== 'ALL' && company?.tier !== selectedTier) {
      return false
    }

    // Product Category
    if (selectedCategory !== 'ALL' && deal.productCategory !== selectedCategory) {
      return false
    }

    // Stale/Urgent
    if (onlyStale) {
      if (!deal.nextActionDate) return false
      const actionDate = new Date(deal.nextActionDate)
      const today = new Date()
      // Include if overdue or scheduled today
      if (actionDate > today) return false
    }

    return true
  })

  // Handlers
  const handleMoveStage = (dealId: string, newStageId: string) => {
    const targetStage = stages.find(s => s.id === newStageId)
    setDeals(prev => prev.map(d => {
      if (d.id === dealId) {
        return {
          ...d,
          stageId: newStageId,
          updatedAt: new Date().toISOString(),
          lastActivityDate: new Date().toISOString()
        }
      }
      return d
    }))

    // Add activity log
    const deal = deals.find(d => d.id === dealId)
    if (deal && targetStage) {
      const newAct: ActivityLog = {
        id: `act-${Date.now()}`,
        dealId,
        type: 'STAGE_CHANGE',
        title: `ย้ายสู่สเตจ: ${targetStage.name}`,
        actor: deal.salesRep,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      }
      setActivities(prev => [newAct, ...prev])
    }

    toast.success(`ย้ายดีลไป ${targetStage?.name || 'สเตจใหม่'}`)
  }

  const handleUpdateDeal = (updated: Deal) => {
    setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
    setSelectedDeal(updated)
  }

  const handleDeleteDeal = (dealId: string) => {
    setDeals(prev => prev.filter(d => d.id !== dealId))
    setActivities(prev => prev.filter(a => a.dealId !== dealId))
    toast.success('ลบดีลสำเร็จ')
  }

  const handleCreateDeal = (
    dealData: Omit<Deal, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'lastActivityDate'>,
    newCompany?: Omit<Company, 'id' | 'createdAt'>,
    newContact?: Omit<Contact, 'id' | 'companyId' | 'createdAt'>
  ) => {
    let compId = dealData.companyId
    let contId = dealData.contactId

    // If new company created
    if (newCompany) {
      const companyId = `comp-${Date.now()}`
      const createdCompany: Company = {
        ...newCompany,
        id: companyId,
        createdAt: new Date().toISOString().split('T')[0]
      }
      setCompanies(prev => [createdCompany, ...prev])
      compId = companyId

      if (newContact) {
        const contactId = `cont-${Date.now()}`
        const createdContact: Contact = {
          ...newContact,
          id: contactId,
          companyId,
          createdAt: new Date().toISOString().split('T')[0]
        }
        setContacts(prev => [createdContact, ...prev])
        contId = contactId
      }
    }

    const nextCodeNum = deals.length + 101
    const newDeal: Deal = {
      ...dealData,
      id: `deal-${Date.now()}`,
      code: `DL-2609-${String(nextCodeNum).padStart(3, '0')}`,
      companyId: compId,
      contactId: contId,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      lastActivityDate: new Date().toISOString().split('T')[0]
    }

    setDeals(prev => [newDeal, ...prev])

    // Activity log
    const initialAct: ActivityLog = {
      id: `act-${Date.now()}`,
      dealId: newDeal.id,
      type: 'SYSTEM',
      title: 'สร้างดีลงานขายใหม่ในระบบ',
      description: `มูลค่า ${new Intl.NumberFormat('th-TH').format(newDeal.dealValue)} บาท (${newDeal.quantity.toLocaleString()} ชิ้น)`,
      actor: newDeal.salesRep,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    }
    setActivities(prev => [initialAct, ...prev])
  }

  const handleSaveStages = (newStages: PipelineStage[]) => {
    setStages(newStages)
  }

  const handleAddActivity = (activity: Omit<ActivityLog, 'id' | 'createdAt'>) => {
    const newAct: ActivityLog = {
      ...activity,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    }
    setActivities(prev => [newAct, ...prev])
  }

  const handleAddCompany = (
    company: Omit<Company, 'id' | 'createdAt'>, 
    contact: Omit<Contact, 'id' | 'companyId' | 'createdAt'>
  ) => {
    const compId = `comp-${Date.now()}`
    const newComp: Company = {
      ...company,
      id: compId,
      createdAt: new Date().toISOString().split('T')[0]
    }
    const newCont: Contact = {
      ...contact,
      id: `cont-${Date.now()}`,
      companyId: compId,
      createdAt: new Date().toISOString().split('T')[0]
    }
    setCompanies(prev => [newComp, ...prev])
    setContacts(prev => [newCont, ...prev])
  }

  const handleQuickAddDeal = (stageId: string) => {
    setNewDealStageId(stageId)
    setIsNewDealOpen(true)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedRep('ALL')
    setSelectedTier('ALL')
    setSelectedCategory('ALL')
    setOnlyStale(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-5">
      {/* Header & Morning KPI Summary */}
      <SalesPipelineHeader
        deals={deals}
        stages={stages}
        onOpenNewDeal={() => {
          setNewDealStageId(undefined)
          setIsNewDealOpen(true)
        }}
        onOpenStageSettings={() => setIsStageSettingsOpen(true)}
        onOpenCompanies={() => setIsCompaniesOpen(true)}
      />

      {/* Filter & View Switcher Bar */}
      <SalesPipelineFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRep={selectedRep}
        onSelectRep={setSelectedRep}
        salesReps={SALES_REPS}
        selectedTier={selectedTier}
        onSelectTier={setSelectedTier}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onlyStale={onlyStale}
        onToggleStale={() => setOnlyStale(!onlyStale)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={filteredDeals.length}
        onResetFilters={handleResetFilters}
      />

      {/* Main Board / Table Content */}
      <div className="pt-1">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            stages={stages}
            deals={filteredDeals}
            companies={companies}
            contacts={contacts}
            onSelectDeal={(deal) => setSelectedDeal(deal)}
            onMoveStage={handleMoveStage}
            onQuickAddDeal={handleQuickAddDeal}
          />
        ) : (
          <DealTableView
            deals={filteredDeals}
            companies={companies}
            contacts={contacts}
            stages={stages}
            onSelectDeal={(deal) => setSelectedDeal(deal)}
            onMoveStage={handleMoveStage}
          />
        )}
      </div>

      {/* 360° Deal Detail Modal */}
      {selectedDeal && (
        <DealDetailModal
          isOpen={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
          deal={selectedDeal}
          companies={companies}
          contacts={contacts}
          stages={stages}
          activities={activities}
          onUpdateDeal={handleUpdateDeal}
          onDeleteDeal={handleDeleteDeal}
          onAddActivity={handleAddActivity}
        />
      )}

      {/* Stage Settings Modal */}
      <StageSettingsModal
        isOpen={isStageSettingsOpen}
        onClose={() => setIsStageSettingsOpen(false)}
        stages={stages}
        deals={deals}
        onSaveStages={handleSaveStages}
      />

      {/* New Deal Modal */}
      <NewDealModal
        isOpen={isNewDealOpen}
        onClose={() => setIsNewDealOpen(false)}
        companies={companies}
        contacts={contacts}
        stages={stages}
        salesReps={SALES_REPS}
        initialStageId={newDealStageId}
        onCreateDeal={handleCreateDeal}
      />

      {/* Company Directory Modal */}
      <CompanyDirectoryModal
        isOpen={isCompaniesOpen}
        onClose={() => setIsCompaniesOpen(false)}
        companies={companies}
        contacts={contacts}
        deals={deals}
        onAddCompany={handleAddCompany}
      />
    </div>
  )
}
