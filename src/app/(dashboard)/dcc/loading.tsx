import React from 'react'
import { ShieldCheck } from 'lucide-react'

export default function DCCLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
      
      {/* Top Header Banner Skeleton */}
      <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#8B7355] text-[11px] font-black tracking-wide uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Integrated Digital eQMS / EDMS
              </span>
              <span className="text-stone-300 text-xs">•</span>
              <div className="h-3 w-48 bg-stone-200 rounded" />
            </div>

            <div className="h-8 w-80 bg-stone-300 rounded-lg" />
            <div className="h-4 w-full max-w-2xl bg-stone-200 rounded" />
          </div>

          <div className="flex gap-2">
            <div className="h-12 w-36 bg-stone-100 rounded-xl border border-stone-200" />
            <div className="h-12 w-36 bg-emerald-50 rounded-xl border border-emerald-200" />
          </div>
        </div>

        {/* 5 KPI Metric Cards Skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-stone-100">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="h-3 w-20 bg-stone-200 rounded" />
              <div className="h-6 w-16 bg-stone-300 rounded" />
              <div className="h-2.5 w-24 bg-stone-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 4 Tabs Skeleton */}
      <div className="bg-white p-1 rounded-xl border border-stone-200 shadow-xs flex flex-wrap gap-1">
        <div className="h-10 w-64 bg-stone-900/10 rounded-lg" />
        <div className="h-10 w-64 bg-stone-100 rounded-lg" />
        <div className="h-10 w-60 bg-stone-100 rounded-lg" />
        <div className="h-10 w-60 bg-stone-100 rounded-lg" />
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-stone-100">
          <div className="h-9 w-72 bg-stone-200 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-stone-200 rounded-lg" />
            <div className="h-9 w-28 bg-stone-200 rounded-lg" />
          </div>
        </div>

        {/* Table rows skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-14 bg-stone-50 rounded-lg border border-stone-100 flex items-center px-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-stone-200 rounded" />
                <div className="space-y-1">
                  <div className="h-4 w-40 bg-stone-300 rounded" />
                  <div className="h-3 w-24 bg-stone-200 rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-stone-200 rounded-full" />
              <div className="h-4 w-28 bg-stone-200 rounded" />
              <div className="h-8 w-24 bg-stone-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
