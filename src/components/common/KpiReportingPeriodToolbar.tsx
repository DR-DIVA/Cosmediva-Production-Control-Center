'use client'

import React from 'react'
import { CalendarDays, Clock, Filter, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { THAI_MONTHS_SHORT, THAI_MONTHS_FULL, UseKpiPeriodReturn } from '@/hooks/useKpiPeriod'

export interface KpiReportingPeriodToolbarProps {
  period: UseKpiPeriodReturn
  title?: string
  subtitle?: string
  summaryBadge?: React.ReactNode
  showSyncCheckbox?: boolean
  syncCheckboxLabel?: string
  summaryFooter?: React.ReactNode
  className?: string
}

export function KpiReportingPeriodToolbar({
  period,
  title = 'ช่วงเวลาสรุปผลรายงาน KPI (Reporting Period)',
  subtitle = 'คำนวณและสรุปผลตัวเลข KPI ตามช่วงเวลา',
  summaryBadge,
  showSyncCheckbox = false,
  syncCheckboxLabel = 'ซิงค์ตัวกรองช่วงเวลานี้กับตารางรายการด้านล่างด้วย (Sync Table with Selected Period)',
  summaryFooter,
  className
}: KpiReportingPeriodToolbarProps) {
  const {
    periodMode,
    year,
    month,
    customStart,
    customEnd,
    isOpen,
    syncTableWithPeriod,
    dateRange,
    isCurrentMonth,
    currentYear,
    currentMonthIdx,
    defaultCustomStart,
    defaultCustomEnd,
    setPeriodMode,
    setYear,
    setMonth,
    setCustomStart,
    setCustomEnd,
    setIsOpen,
    setSyncTableWithPeriod,
    resetToCurrentMonth,
    selectPreviousMonth
  } = period

  // 1. Collapsed State (Default)
  if (!isOpen) {
    return (
      <div
        className={cn(
          'bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-2xs border border-[#D4AF37]/35 flex flex-wrap items-center justify-between gap-2.5 transition-all',
          className
        )}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/15 text-[#8B7355] flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <span className="text-xs font-bold text-[#4A4238]">ช่วงเวลารายงาน KPI:</span>
          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#D4AF37]" />
            <span>{dateRange.label}</span>
          </span>
          {summaryBadge && (
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              {summaryBadge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isCurrentMonth && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToCurrentMonth}
              className="h-7 px-2 text-[11px] font-bold text-amber-700 hover:bg-amber-100 rounded-lg cursor-pointer"
              title="คลิกเพื่อรีเซ็ตกลับเป็นเดือนปัจจุบัน"
            >
              📍 กลับเดือนปัจจุบัน
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="h-7 px-2.5 text-xs font-bold text-[#4A4238] bg-[#FAF8F5] hover:bg-[#F0ECE1] border-[#D4AF37]/50 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all hover:border-[#D4AF37]"
          >
            <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>เลือกเดือน / กางออก</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
          </Button>
        </div>
      </div>
    )
  }

  // 2. Expanded State (Full Controls)
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-4 shadow-sm border border-[#D4AF37]/40 space-y-3 transition-all animate-in fade-in-50 duration-200',
        className
      )}
    >
      {/* Row 1: Header + Active Period Badge + Quick Action Presets + Close Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/30 text-[#8B7355] shadow-2xs shrink-0">
            <CalendarDays className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-[#4A4238] tracking-tight">
                {title}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#D4AF37]" />
                <span>{dateRange.label}</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{subtitle}</span>
              {isCurrentMonth && (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ค่าเริ่มต้น: เดือนปัจจุบัน
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Presets and Close/Collapse Button */}
        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-center">
          {/* Current Month Shortcut */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToCurrentMonth}
            className={cn(
              'h-8 px-2.5 text-xs font-bold transition-all rounded-xl cursor-pointer',
              isCurrentMonth
                ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-xs font-black ring-1 ring-[#B8962A]'
                : 'bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100'
            )}
          >
            📍 เดือนปัจจุบัน ({THAI_MONTHS_SHORT[currentMonthIdx]})
          </Button>

          {/* Previous Month Shortcut */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectPreviousMonth}
            className={cn(
              'h-8 px-2.5 text-xs font-semibold transition-all rounded-xl cursor-pointer',
              periodMode === 'month' &&
                month === (currentMonthIdx === 0 ? 11 : currentMonthIdx - 1) &&
                year === (currentMonthIdx === 0 ? currentYear - 1 : currentYear)
                ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-xs font-black ring-1 ring-[#B8962A]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            )}
          >
            เดือนที่แล้ว
          </Button>

          {/* Custom Range */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPeriodMode(periodMode === 'custom' ? 'month' : 'custom')}
            className={cn(
              'h-8 px-2.5 text-xs font-semibold transition-all rounded-xl cursor-pointer',
              periodMode === 'custom'
                ? 'bg-[#2D2721] text-amber-300 border-slate-700 shadow-xs font-bold'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            )}
          >
            📆 กำหนดช่วงวันเอง
          </Button>

          {/* All Time */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPeriodMode('all')}
            className={cn(
              'h-8 px-2.5 text-xs font-semibold transition-all rounded-xl cursor-pointer',
              periodMode === 'all'
                ? 'bg-[#2D2721] text-amber-300 border-slate-700 shadow-xs font-bold'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            )}
          >
            🌐 ทั้งหมด (All Time)
          </Button>

          {/* Close / Collapse Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 px-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer ml-1 flex items-center gap-1 border border-slate-200"
            title="ซ่อนกรอบตัวเลือก"
          >
            <ChevronUp className="w-4 h-4 text-slate-500" />
            <span>ซ่อนกรอบ</span>
          </Button>
        </div>
      </div>

      {/* Row 2: 12-Month Selector Bar & Year Selector */}
      {periodMode === 'month' && (
        <div className="pt-2.5 border-t border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500">ปี:</span>
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    year === y
                      ? 'bg-[#2D2721] text-amber-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* 12 Months Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-thin w-full md:w-auto">
            {THAI_MONTHS_SHORT.map((mName, idx) => {
              const isSelected = periodMode === 'month' && month === idx
              const isCurrent = idx === currentMonthIdx && year === currentYear
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => {
                    setPeriodMode('month')
                    setMonth(idx)
                  }}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1',
                    isSelected
                      ? 'bg-[#D4AF37] text-slate-950 font-black shadow-xs ring-1 ring-[#B8962A]'
                      : isCurrent
                      ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  )}
                  title={`ดูรายงานประจำเดือน ${THAI_MONTHS_FULL[idx]} ${year}`}
                >
                  <span>{mName}</span>
                  {isCurrent && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Row 2 (Alternative): Custom Date Inputs */}
      {periodMode === 'custom' && (
        <div className="pt-2.5 border-t border-slate-150 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">จากวันที่:</span>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">ถึงวันที่:</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setCustomStart(defaultCustomStart)
              setCustomEnd(defaultCustomEnd)
            }}
            className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            รีเซ็ตเป็นเดือนนี้
          </Button>
        </div>
      )}

      {/* Row 3: Table Sync Toggle (Optional) & Summary Footer */}
      {(showSyncCheckbox || summaryFooter) && (
        <div className="pt-2.5 border-t border-slate-150 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          {showSyncCheckbox ? (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={syncTableWithPeriod}
                onChange={e => setSyncTableWithPeriod(e.target.checked)}
                className="rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <span className="font-medium text-[#4A4238]">{syncCheckboxLabel}</span>
            </label>
          ) : (
            <div></div>
          )}
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            {summaryFooter && <span>{summaryFooter}</span>}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#8B7355] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>ย่อเก็บ</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
