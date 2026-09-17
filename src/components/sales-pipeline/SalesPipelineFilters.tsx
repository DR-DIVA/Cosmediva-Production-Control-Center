'use client'

import React from 'react'
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Users, 
  Building2, 
  Sparkles, 
  AlertCircle,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomerTier, ProductCategory } from './types'

interface SalesPipelineFiltersProps {
  searchQuery: string
  onSearchChange: (val: string) => void
  selectedRep: string
  onSelectRep: (val: string) => void
  salesReps: string[]
  selectedTier: 'ALL' | CustomerTier
  onSelectTier: (val: 'ALL' | CustomerTier) => void
  selectedCategory: 'ALL' | ProductCategory
  onSelectCategory: (val: 'ALL' | ProductCategory) => void
  onlyStale: boolean
  onToggleStale: () => void
  viewMode: 'kanban' | 'table'
  onViewModeChange: (val: 'kanban' | 'table') => void
  totalCount: number
  onResetFilters: () => void
}

export const SalesPipelineFilters: React.FC<SalesPipelineFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedRep,
  onSelectRep,
  salesReps,
  selectedTier,
  onSelectTier,
  selectedCategory,
  onSelectCategory,
  onlyStale,
  onToggleStale,
  viewMode,
  onViewModeChange,
  totalCount,
  onResetFilters,
}) => {
  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedRep !== 'ALL' || 
    selectedTier !== 'ALL' || 
    selectedCategory !== 'ALL' || 
    onlyStale

  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="flex-1 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อดีล, แบรนด์, บริษัท, ผู้ติดต่อ หรือเบอร์โทร..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm bg-slate-50/70 border-slate-200 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter: Sales Rep */}
        <select
          value={selectedRep}
          onChange={(e) => onSelectRep(e.target.value)}
          className="h-9 px-3 rounded-md text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <option value="ALL">👤 เซลล์ทุกคน (All Sales)</option>
          {salesReps.map(rep => (
            <option key={rep} value={rep}>{rep}</option>
          ))}
        </select>

        {/* Filter: Customer Tier */}
        <select
          value={selectedTier}
          onChange={(e) => onSelectTier(e.target.value as any)}
          className="h-9 px-3 rounded-md text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <option value="ALL">🏢 ทุกกลุ่มลูกค้า (All Tiers)</option>
          <option value="TIER_1">⭐ Tier 1: ห้าง / EVEANDBOY / TikTok ใหญ่</option>
          <option value="TIER_2">🌱 Tier 2: SME / คลินิก / สปา / สตาร์ทอัพ</option>
        </select>

        {/* Filter: Product Category */}
        <select
          value={selectedCategory}
          onChange={(e) => onSelectCategory(e.target.value as any)}
          className="h-9 px-3 rounded-md text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <option value="ALL">🧴 ทุกหมวดสินค้า</option>
          <option value="skincare">Skincare (บำรุงผิว)</option>
          <option value="facial_care">Facial Care (ดูแลผิวหน้า)</option>
          <option value="body_care">Body Care (ผิวกาย)</option>
          <option value="haircare">Hair Care (เส้นผม)</option>
          <option value="sunscreen">Sunscreen (กันแดด)</option>
          <option value="personal_care">Personal Care (ชำระล้าง)</option>
        </select>

        {/* Filter: Urgent/Stale Deals */}
        <button
          onClick={onToggleStale}
          className={`h-9 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border ${
            onlyStale 
              ? 'bg-rose-50 text-rose-700 border-rose-300 font-semibold shadow-xs' 
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className={`w-3.5 h-3.5 ${onlyStale ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>นัดติดตามวันนี้ / ค้างนาน</span>
        </button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-9 text-xs text-slate-500 hover:text-slate-900 px-2"
          >
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Right: View Mode Toggle & Total Count */}
      <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
        <span className="text-xs font-medium text-slate-500">
          แสดง <strong className="text-slate-800">{totalCount}</strong> ดีล
        </span>

        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'kanban'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>
    </div>
  )
}
