import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseOrderType(orderType?: string | null): 'MTS' | 'MTO' {
  if (!orderType) return 'MTS'
  return orderType.toUpperCase().includes('MTO') ? 'MTO' : 'MTS'
}

export function isLotFirstBatch(lot: any): boolean {
  if (!lot) return false
  const sku = (lot.products?.sku || '').toUpperCase()
  if (sku.includes('PAMH-008')) return true
  const ot = (lot.order_type || '').toUpperCase()
  const note = (lot.note || '').toUpperCase()
  return (
    ot.includes('[1ST_BATCH]') ||
    ot.includes('1ST_BATCH') ||
    ot.includes('FIRST') ||
    note.includes('[1ST_BATCH]') ||
    note.includes('1ST BATCH') ||
    lot.is_first_batch === true
  )
}

export interface DeliveryInstallment {
  installment: number
  date: string
  quantity: number
  note?: string
}

export function parseDeliverySchedule(schedule: any): DeliveryInstallment[] {
  if (!schedule) return []
  if (Array.isArray(schedule)) {
    return schedule
      .filter((item: any) => item && item.date)
      .map((item: any, idx: number) => ({
        installment: Number(item.installment) || (idx + 1),
        date: String(item.date).substring(0, 10),
        quantity: Number(item.quantity) || 0,
        note: item.note ? String(item.note) : ''
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  if (typeof schedule === 'string') {
    try {
      const parsed = JSON.parse(schedule)
      return parseDeliverySchedule(parsed)
    } catch {
      return []
    }
  }
  return []
}
