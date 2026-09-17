'use client'

import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

export type KpiPeriodMode = 'month' | 'custom' | 'all'

export interface KpiDateRange {
  start: string | null
  end: string | null
  label: string
}

export interface UseKpiPeriodOptions {
  defaultOpen?: boolean
  defaultSyncTable?: boolean
}

export function useKpiPeriod(options: UseKpiPeriodOptions = {}) {
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const currentMonthIdx = useMemo(() => new Date().getMonth(), []) // 0-11

  const [periodMode, setPeriodMode] = useState<KpiPeriodMode>('month')
  const [year, setYear] = useState<number>(currentYear)
  const [month, setMonth] = useState<number>(currentMonthIdx) // 0-11

  const defaultCustomStart = useMemo(
    () => format(new Date(currentYear, currentMonthIdx, 1), 'yyyy-MM-dd'),
    [currentYear, currentMonthIdx]
  )
  const defaultCustomEnd = useMemo(
    () => format(new Date(currentYear, currentMonthIdx + 1, 0), 'yyyy-MM-dd'),
    [currentYear, currentMonthIdx]
  )

  const [customStart, setCustomStart] = useState<string>(defaultCustomStart)
  const [customEnd, setCustomEnd] = useState<string>(defaultCustomEnd)
  const [isOpen, setIsOpen] = useState<boolean>(options.defaultOpen ?? false)
  const [syncTableWithPeriod, setSyncTableWithPeriod] = useState<boolean>(options.defaultSyncTable ?? false)

  const isCurrentMonth = useMemo(() => {
    return periodMode === 'month' && month === currentMonthIdx && year === currentYear
  }, [periodMode, month, year, currentMonthIdx, currentYear])

  const dateRange: KpiDateRange = useMemo(() => {
    if (periodMode === 'all') {
      return { start: null, end: null, label: 'ทุกช่วงเวลาสะสม (All Time)' }
    }
    if (periodMode === 'custom') {
      const s = customStart || defaultCustomStart
      const e = customEnd || defaultCustomEnd
      const startFmt = format(new Date(s), 'dd/MM/yyyy')
      const endFmt = format(new Date(e), 'dd/MM/yyyy')
      return {
        start: s,
        end: e,
        label: `ช่วงวันที่กำหนด: ${startFmt} - ${endFmt}`
      }
    }
    // month mode
    const startObj = new Date(year, month, 1)
    const endObj = new Date(year, month + 1, 0)
    const s = format(startObj, 'yyyy-MM-dd')
    const e = format(endObj, 'yyyy-MM-dd')
    return {
      start: s,
      end: e,
      label: `ประจำเดือน ${THAI_MONTHS_FULL[month]} ${year} (1 - ${endObj.getDate()} ${THAI_MONTHS_SHORT[month]} ${year})`
    }
  }, [periodMode, year, month, customStart, customEnd, defaultCustomStart, defaultCustomEnd])

  const resetToCurrentMonth = useCallback(() => {
    setPeriodMode('month')
    setYear(currentYear)
    setMonth(currentMonthIdx)
  }, [currentYear, currentMonthIdx])

  const selectPreviousMonth = useCallback(() => {
    setPeriodMode('month')
    const prevDate = new Date(currentYear, currentMonthIdx - 1, 1)
    setYear(prevDate.getFullYear())
    setMonth(prevDate.getMonth())
  }, [currentYear, currentMonthIdx])

  /**
   * Helper function to filter any array by the active KPI reporting period
   */
  const filterByPeriod = useCallback(
    <T,>(items: T[], dateExtractor: (item: T) => string | Date | null | undefined): T[] => {
      if (!dateRange.start || !dateRange.end) {
        return items
      }
      const startStr = dateRange.start
      const endStr = dateRange.end

      return items.filter(item => {
        const rawDate = dateExtractor(item)
        if (!rawDate) return false
        const dStr = typeof rawDate === 'string'
          ? rawDate.substring(0, 10)
          : format(rawDate, 'yyyy-MM-dd')
        return dStr >= startStr && dStr <= endStr
      })
    },
    [dateRange]
  )

  return {
    // State
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

    // Setters
    setPeriodMode,
    setYear,
    setMonth,
    setCustomStart,
    setCustomEnd,
    setIsOpen,
    setSyncTableWithPeriod,

    // Shortcuts & Helpers
    resetToCurrentMonth,
    selectPreviousMonth,
    filterByPeriod
  }
}

export type UseKpiPeriodReturn = ReturnType<typeof useKpiPeriod>
