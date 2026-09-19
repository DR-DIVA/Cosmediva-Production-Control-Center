import React from 'react'
import { Calculator } from 'lucide-react'

export default function CostingLoading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-slate-200 gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-8 h-8 text-[#D4AF37]/50" />
            <div className="h-8 w-64 bg-stone-200 rounded" />
          </div>
          <div className="h-4 w-96 bg-stone-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-stone-100 rounded-lg" />
      </div>

      {/* KPI Cards Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-7 w-32 bg-slate-300 rounded" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="h-10 w-full bg-slate-100 rounded-lg" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-12 w-full bg-slate-50 rounded-lg border border-slate-100" />
        ))}
      </div>
    </div>
  )
}
