'use client'

import React from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  Target, 
  CheckCircle2, 
  Plus, 
  Settings, 
  Users,
  Sparkles,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Deal, PipelineStage } from './types'

interface SalesPipelineHeaderProps {
  deals: Deal[]
  stages: PipelineStage[]
  onOpenNewDeal: () => void
  onOpenStageSettings: () => void
  onOpenCompanies: () => void
}

export const SalesPipelineHeader: React.FC<SalesPipelineHeaderProps> = ({
  deals,
  stages,
  onOpenNewDeal,
  onOpenStageSettings,
  onOpenCompanies,
}) => {
  // Identify won/lost stages
  const wonStageIds = stages.filter(s => s.isWon).map(s => s.id)
  const lostStageIds = stages.filter(s => s.isLost).map(s => s.id)
  const activeStages = stages.filter(s => !s.isWon && !s.isLost)
  const activeStageIds = activeStages.map(s => s.id)

  const activeDeals = deals.filter(d => activeStageIds.includes(d.stageId))
  const wonDeals = deals.filter(d => wonStageIds.includes(d.stageId))
  const lostDeals = deals.filter(d => lostStageIds.includes(d.stageId))

  // Total active pipeline value
  const totalActiveValue = activeDeals.reduce((sum, d) => sum + d.dealValue, 0)

  // Weighted forecast = sum of (dealValue * stage.probability / 100)
  const weightedValue = activeDeals.reduce((sum, d) => {
    const stage = stages.find(s => s.id === d.stageId)
    const prob = stage ? stage.probability : 50
    return sum + (d.dealValue * (prob / 100))
  }, 0)

  // Won value
  const wonValue = wonDeals.reduce((sum, d) => sum + d.dealValue, 0)
  const monthlyTarget = 9000000 // 9M THB per month
  const wonPercent = Math.min(Math.round((wonValue / monthlyTarget) * 100), 100)

  // Win rate
  const totalClosed = wonDeals.length + lostDeals.length
  const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 100

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-4">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-200/60 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CosmeFlow Sales Pipeline</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  OEM / ODM Management
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                ศูนย์กลางบริหารดีลงานขาย ติดตามสูตร R&D และคาดการณ์รายได้โรงงานเครื่องสำอาง (เป้า 100 ล้าน/ปี)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCompanies}
            className="border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
          >
            <Building2 className="w-4 h-4 mr-2 text-slate-500" />
            แบรนด์ & ลูกค้า B2B
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenStageSettings}
            className="border-amber-300/80 hover:bg-amber-50 text-amber-900 font-medium"
          >
            <Settings className="w-4 h-4 mr-2 text-amber-600" />
            ตั้งค่าสเตจ (Customize)
          </Button>

          <Button
            size="sm"
            onClick={onOpenNewDeal}
            className="bg-[#2D2721] hover:bg-[#3D352D] text-amber-400 font-medium border border-[#D4AF37]/50 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            สร้างดีลใหม่ (New Deal)
          </Button>
        </div>
      </div>

      {/* KPI Morning Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Active Pipeline */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{formatCurrency(totalActiveValue)}</span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {activeDeals.length} ดีล
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">มูลค่ารวมดีลที่อยู่ระหว่างเจรจา</p>
        </div>

        {/* Card 2: Weighted Forecast */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Weighted Forecast</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-purple-900">{formatCurrency(weightedValue)}</span>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              ถ่วงน้ำหนัก
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ยอดขายคาดการณ์ตาม % โอกาสปิด</p>
        </div>

        {/* Card 3: Monthly Target vs Won */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Closed Won (เดือนนี้)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-700">{formatCurrency(wonValue)}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {wonPercent}% ของเป้า
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${wonPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">เป้าประจำเดือน 9.0 ลบ. ({wonDeals.length} ดีลสำเร็จ)</p>
        </div>

        {/* Card 4: Win Rate & Conversion */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Win Rate & Closed</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900">{winRate}%</span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {wonDeals.length} ชนะ / {lostDeals.length} แพ้
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">อัตราความสำเร็จในการปิดการขาย</p>
        </div>
      </div>
    </div>
  )
}
