'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Printer,
  Download,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  X
} from 'lucide-react'
import { format, addDays, startOfDay, differenceInDays, isSameDay } from 'date-fns'
import { toast } from 'sonner'
import { parsePlanChangeInfo } from '@/lib/planTracking'
import { cn } from '@/lib/utils'

interface TimelinePrintModalProps {
  isOpen: boolean
  onClose: () => void
  lots: any[]
  logs: any[]
  processes: any[]
  currentUser?: string
  initialDept?: string
  initialOrderType?: string
  initialShowHandovers?: boolean
}

const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

const PROCESS_PALETTES: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  'ชั่งสาร': { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-500', label: 'ชั่งสาร (RM)' },
  'ผสม': { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', dot: 'bg-blue-500', label: 'ผสม (MX)' },
  'บรรจุ': { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-500', label: 'บรรจุ (PK)' },
  'ลงลัง': { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dot: 'bg-purple-500', label: 'ลงลัง' },
  'รอ QC': { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', dot: 'bg-rose-500', label: 'รอ QC' },
  'รอ POF': { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300', dot: 'bg-indigo-500', label: 'รอ POF' },
  'รอเข้าคลัง FG': { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300', dot: 'bg-teal-500', label: 'รอเข้าคลัง FG' },
  'DEFAULT': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-400', label: 'งานทั่วไป' }
}

export function TimelinePrintModal({
  isOpen,
  onClose,
  lots,
  logs,
  processes,
  currentUser = 'PLANNER',
  initialDept = 'ALL',
  initialOrderType = 'ALL',
  initialShowHandovers = false
}: TimelinePrintModalProps) {
  const [lookaheadDays, setLookaheadDays] = useState<number>(14)
  const [startDateStr, setStartDateStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [deptFilter, setDeptFilter] = useState<string>(initialDept)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>(initialOrderType)
  const [showHandovers, setShowHandovers] = useState<boolean>(initialShowHandovers)
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true)
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')
  const [isExportingDirectPdf, setIsExportingDirectPdf] = useState(false)

  const printContainerRef = useRef<HTMLDivElement>(null)

  // Calculate horizon date array
  const startDate = useMemo(() => {
    try {
      return startOfDay(startDateStr ? new Date(startDateStr) : new Date())
    } catch {
      return startOfDay(new Date())
    }
  }, [startDateStr])

  const horizonDates = useMemo(() => {
    return Array.from({ length: lookaheadDays }).map((_, i) => addDays(startDate, i))
  }, [startDate, lookaheadDays])

  const horizonStart = horizonDates[0]
  const horizonEnd = horizonDates[horizonDates.length - 1]

  const isHandoverProcess = (processName?: string) => {
    if (!processName) return false
    const p = processName.trim()
    return (
      p.startsWith('รอ') ||
      p.includes('รอ QC') ||
      p.includes('รอ POF') ||
      p.includes('รอเข้าคลัง') ||
      p.includes('รออุโมงค์') ||
      p.includes('รอบรรจุ') ||
      p === 'ลงลัง'
    )
  }

  // Filter lots and tasks that fall within the selected horizon
  const filteredPrintData = useMemo(() => {
    const searchLower = searchFilter.trim().toLowerCase()

    return lots
      .filter(lot => {
        // Order type filter
        if (orderTypeFilter !== 'ALL') {
          const currentType = (lot.order_type || 'MTS').toUpperCase()
          if (currentType !== orderTypeFilter) return false
        }

        // Search query filter
        if (searchLower) {
          const sku = (lot.products?.sku || '').toLowerCase()
          const lotNo = (lot.lot_no || '').toLowerCase()
          const po = (lot.po_no || '').toLowerCase()
          if (!sku.includes(searchLower) && !lotNo.includes(searchLower) && !po.includes(searchLower)) {
            return false
          }
        }

        return true
      })
      .map(lot => {
        // Find tasks for this lot
        const lotLogs = logs
          .filter(l => l.production_lot_id === lot.id)
          .filter(l => {
            if (!showHandovers) {
              const process = processes.find(p => p.id === l.process_id)
              const pName = process?.process_name || l.processes?.process_name || ''
              if (isHandoverProcess(pName)) return false
            }
            return true
          })
          .filter(l => {
            const process = processes.find(p => p.id === l.process_id)
            const pName = (process?.process_name || l.processes?.process_name || '').toLowerCase()

            if (deptFilter === 'RM') return pName.includes('ชั่ง')
            if (deptFilter === 'MX') return pName.includes('ผสม')
            if (deptFilter === 'PK') return pName.includes('บรรจุ')
            return true
          })
          .filter(l => {
            // Must have dates and overlap with horizon
            if (!l.activity_date) return false
            const taskStart = startOfDay(new Date(l.activity_date))
            const taskEnd = l.end_date ? startOfDay(new Date(l.end_date)) : taskStart

            return taskEnd >= horizonStart && taskStart <= horizonEnd
          })
          .sort((a, b) => {
            const dateA = a.activity_date ? new Date(a.activity_date).getTime() : 0
            const dateB = b.activity_date ? new Date(b.activity_date).getTime() : 0
            return dateA - dateB
          })

        return {
          ...lot,
          tasks: lotLogs
        }
      })
      .filter(lot => lot.tasks.length > 0)
  }, [lots, logs, processes, orderTypeFilter, searchFilter, showHandovers, deptFilter, horizonStart, horizonEnd])

  const totalFilteredTasksCount = useMemo(() => {
    return filteredPrintData.reduce((acc, lot) => acc + lot.tasks.length, 0)
  }, [filteredPrintData])

  const totalFilteredTanksCount = useMemo(() => {
    return filteredPrintData.reduce((acc, lot) => acc + (Number(lot.total_tanks) || 0), 0)
  }, [filteredPrintData])

  // Get palette for a task name
  const getTaskPalette = (pName: string) => {
    for (const key of Object.keys(PROCESS_PALETTES)) {
      if (key !== 'DEFAULT' && pName.includes(key)) {
        return PROCESS_PALETTES[key]
      }
    }
    return PROCESS_PALETTES['DEFAULT']
  }

  // Native Browser Print through an isolated Iframe for 100% Vector Quality & Native Pagination
  const handlePrint = () => {
    if (typeof window === 'undefined') return

    const printElement = document.getElementById('timeline-printable-markup')
    if (!printElement) {
      toast.error('ไม่พบเนื้อหาตารางสำหรับพิมพ์')
      return
    }

    // Remove any previous print iframe
    const oldFrame = document.getElementById('timeline-print-iframe')
    if (oldFrame) oldFrame.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'timeline-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '297mm'
    iframe.style.height = '210mm'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '-9999'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument
    if (!iframeDoc) {
      toast.error('ไม่สามารถสร้างหน้าต่างการพิมพ์ได้')
      return
    }

    // Collect all parent stylesheets and style tags to maintain Tailwind rules
    const parentStyles = typeof document !== 'undefined'
      ? Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map(el => el.outerHTML)
          .join('\n')
      : ''

    const htmlContent = printElement.innerHTML

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>CosmeDiva - แผนผังกำหนดการผลิต (Timeline)</title>
        ${parentStyles}
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm 8mm 8mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Sarabun", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 10px;
            line-height: 1.25;
          }
          #timeline-printable-markup {
            width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          table.timeline-table, table {
            width: 100% !important;
            min-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          @media print {
            @page {
              size: A4 landscape;
              margin: 6mm 8mm 8mm 8mm;
            }
            html, body {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #timeline-printable-markup,
            table.timeline-table,
            table {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              table-layout: fixed !important;
            }
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tfoot {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .lot-header-row {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 14px;
          }
          .signature-grid {
            display: flex !important;
            justify-content: space-between !important;
            gap: 24px !important;
            text-align: center !important;
          }
          .signature-col {
            flex: 1 1 0% !important;
            border-top: 1px solid #94a3b8 !important;
            padding-top: 4px !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }

          /* Structural Layout & Utilities */
          .w-full { width: 100% !important; }
          .h-full { height: 100% !important; }
          .flex { display: flex !important; }
          .flex-col { flex-direction: column !important; }
          .items-center { align-items: center !important; }
          .items-start { align-items: flex-start !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-end { justify-content: flex-end !important; }
          .justify-center { justify-content: center !important; }
          .shrink-0 { flex-shrink: 0 !important; }
          .relative { position: relative !important; }
          .overflow-hidden { overflow: hidden !important; }
          .ml-auto { margin-left: auto !important; }

          /* Spacing & Heights */
          .h-5 { height: 20px !important; }
          .h-6 { height: 24px !important; }
          .h-7 { height: 28px !important; }
          .p-0 { padding: 0 !important; }
          .p-0.5 { padding: 2px !important; }
          .p-1 { padding: 4px !important; }
          .p-1.5 { padding: 6px !important; }
          .p-2 { padding: 8px !important; }
          .px-1 { padding-left: 4px !important; padding-right: 4px !important; }
          .px-1.5 { padding-left: 6px !important; padding-right: 6px !important; }
          .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
          .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
          .py-0.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
          .py-1.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
          .pl-2 { padding-left: 8px !important; }
          .pl-4 { padding-left: 16px !important; }
          .pb-3 { padding-bottom: 12px !important; }
          .mt-0.5 { margin-top: 2px !important; }
          .mt-1 { margin-top: 4px !important; }
          .mt-3 { margin-top: 12px !important; }
          .mt-4 { margin-top: 16px !important; }
          .pt-1 { padding-top: 4px !important; }
          .pt-2 { padding-top: 8px !important; }
          .pt-3 { padding-top: 12px !important; }
          .gap-1 { gap: 4px !important; }
          .gap-1.5 { gap: 6px !important; }
          .gap-2 { gap: 8px !important; }
          .gap-3 { gap: 12px !important; }
          .gap-4 { gap: 16px !important; }
          .gap-6 { gap: 24px !important; }

          /* Borders */
          .border { border: 1px solid #cbd5e1 !important; }
          .border-all { border: 1px solid #cbd5e1 !important; }
          .border-b { border-bottom: 1px solid #cbd5e1 !important; }
          .border-b-2 { border-bottom: 2px solid #cbd5e1 !important; }
          .border-r { border-right: 1px solid #e2e8f0 !important; }
          .border-t { border-top: 1px solid #cbd5e1 !important; }
          .border-t-2 { border-top: 2px solid #cbd5e1 !important; }
          .border-slate-100 { border-color: #f1f5f9 !important; }
          .border-slate-200 { border-color: #e2e8f0 !important; }
          .border-slate-300 { border-color: #cbd5e1 !important; }
          .border-slate-400 { border-color: #94a3b8 !important; }
          .border-slate-700 { border-color: #334155 !important; }
          .border-slate-900 { border-color: #0f172a !important; }

          /* Colors */
          .bg-white { background-color: #ffffff !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-slate-200 { background-color: #e2e8f0 !important; }
          .bg-slate-700 { background-color: #334155 !important; }
          .bg-slate-800 { background-color: #1e293b !important; }
          .bg-slate-900 { background-color: #0f172a !important; }
          .text-white { color: #ffffff !important; }
          .text-slate-300 { color: #cbd5e1 !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-slate-500 { color: #64748b !important; }
          .text-slate-600 { color: #475569 !important; }
          .text-slate-700 { color: #334155 !important; }
          .text-slate-800 { color: #1e293b !important; }
          .text-slate-900 { color: #0f172a !important; }
          .text-red-300 { color: #fca5a5 !important; }
          .text-yellow-200 { color: #fef08a !important; }
          .bg-blue-600 { background-color: #2563eb !important; }

          /* Palettes */
          .bg-amber-50 { background-color: #fffbeb !important; }
          .bg-amber-100 { background-color: #fef3c7 !important; }
          .bg-amber-200 { background-color: #fde68a !important; }
          .text-amber-800 { color: #92400e !important; }
          .text-amber-900 { color: #78350f !important; }
          .border-amber-200 { border-color: #fde68a !important; }
          .border-amber-300 { border-color: #fcd34d !important; }

          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-blue-100 { background-color: #dbeafe !important; }
          .text-blue-900 { color: #1e3a8a !important; }
          .border-blue-300 { border-color: #93c5fd !important; }

          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .bg-emerald-100 { background-color: #d1fae5 !important; }
          .text-emerald-900 { color: #064e3b !important; }
          .border-emerald-300 { border-color: #6ee7b7 !important; }

          .bg-purple-100 { background-color: #f3e8ff !important; }
          .bg-purple-200 { background-color: #e9d5ff !important; }
          .text-purple-800 { color: #6b21a8 !important; }
          .text-purple-900 { color: #581c87 !important; }
          .border-purple-300 { border-color: #d8b4fe !important; }

          .bg-rose-100 { background-color: #ffe4e6 !important; }
          .text-rose-900 { color: #881337 !important; }
          .border-rose-300 { border-color: #fda4af !important; }

          /* Badges & Dots */
          .w-2 { width: 8px !important; }
          .h-2 { height: 8px !important; }
          .rounded { border-radius: 4px !important; }
          .rounded-sm { border-radius: 2px !important; }
          .rounded-full { border-radius: 9999px !important; }
          .bg-amber-500 { background-color: #f59e0b !important; }
          .bg-blue-500 { background-color: #3b82f6 !important; }
          .bg-emerald-500 { background-color: #10b981 !important; }
          .bg-purple-500 { background-color: #a855f7 !important; }
          .bg-rose-500 { background-color: #f43f5e !important; }
          .bg-indigo-500 { background-color: #6366f1 !important; }
          .bg-teal-500 { background-color: #14b8a6 !important; }
          .bg-slate-400 { background-color: #94a3b8 !important; }

          /* Typography */
          .font-normal { font-weight: 400 !important; }
          .font-medium { font-weight: 500 !important; }
          .font-semibold { font-weight: 600 !important; }
          .font-bold { font-weight: 700 !important; }
          .font-black { font-weight: 900 !important; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
          .text-left { text-align: left !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          .italic { font-style: italic !important; }
          .tracking-wider { letter-spacing: 0.05em !important; }

          .text-[8px] { font-size: 8px !important; line-height: 10px !important; }
          .text-[8.5px] { font-size: 8.5px !important; line-height: 11px !important; }
          .text-[9px] { font-size: 9px !important; line-height: 12px !important; }
          .text-[9.5px] { font-size: 9.5px !important; line-height: 12px !important; }
          .text-[10px] { font-size: 10px !important; line-height: 13px !important; }
          .text-[11px] { font-size: 11px !important; line-height: 14px !important; }
          .text-xs { font-size: 11px !important; line-height: 14px !important; }
          .text-sm { font-size: 12px !important; line-height: 16px !important; }
          .text-base { font-size: 14px !important; line-height: 18px !important; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `)
    iframeDoc.close()

    toast.info('กำลังเปิดหน้าต่างเตรียมพิมพ์ A4 แนวนอน...')

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err: any) {
        console.error('Print iframe error:', err)
        window.print()
      }
    }, 400)
  }

  // Direct PDF Download using jsPDF & html2canvas
  const handleDirectDownloadPdf = async () => {
    setIsExportingDirectPdf(true)
    toast.loading('กำลังสร้างไฟล์ PDF ขนาด A4 แนวนอน...')
    try {
      const printElement = document.getElementById('timeline-printable-markup')
      if (!printElement) throw new Error('ไม่พบข้อมูลตาราง')

      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = 297
      const pdfHeight = 210
      const imgWidth = pdfWidth - 16 // 8mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 8

      pdf.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 16)

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 8
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 8, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 16)
      }

      const fileName = `CosmeDiva_Timeline_${format(startDate, 'yyyyMMdd')}_${lookaheadDays}d.pdf`
      pdf.save(fileName)
      toast.dismiss()
      toast.success(`ดาวน์โหลดไฟล์ ${fileName} สำเร็จ!`)
    } catch (err: any) {
      console.error('PDF generation error:', err)
      toast.dismiss()
      toast.error('ไม่สามารถส่งออก PDF ได้: ' + err.message)
    } finally {
      setIsExportingDirectPdf(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[96vw] md:max-w-7xl max-h-[96vh] flex flex-col p-4 sm:p-6 overflow-hidden bg-slate-50">
        <DialogHeader className="pb-3 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Printer className="w-4 h-4" />
                </span>
                พิมพ์ / ส่งออก PDF แผนผังกำหนดการผลิต (A4 แนวนอน)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                จัดรูปแบบกระดาษมาตรฐาน A4 แนวนอน (Landscape) พอดีขอบ 100% หัวตารางวันที่แสดงซ้ำทุกหน้าอัตโนมัติ
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium"
                onClick={handleDirectDownloadPdf}
                disabled={isExportingDirectPdf || filteredPrintData.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {isExportingDirectPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF โดยตรง'}
              </Button>

              <Button
                size="sm"
                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                onClick={handlePrint}
                disabled={filteredPrintData.length === 0}
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                พิมพ์ / บันทึกเป็น PDF (Print Dialog)
              </Button>
            </div>
          </div>

          {/* Interactive Print Options Toolbar */}
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {/* 1. Lookahead Horizon */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ช่วงเวลา (Horizon)</Label>
              <Select value={String(lookaheadDays)} onValueChange={v => setLookaheadDays(Number(v))}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 วัน (1 สัปดาห์)</SelectItem>
                  <SelectItem value="14">14 วัน (2 สัปดาห์ - แนะนำ)</SelectItem>
                  <SelectItem value="21">21 วัน (3 สัปดาห์)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. Start Date */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">วันเริ่มต้น</Label>
              <Input
                type="date"
                value={startDateStr}
                onChange={e => setStartDateStr(e.target.value)}
                className="h-8 text-xs bg-white px-2"
              />
            </div>

            {/* 3. Department */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">สายงาน / แผนก</Label>
              <Select value={deptFilter} onValueChange={v => setDeptFilter(v || 'ALL')}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกสายงาน (All)</SelectItem>
                  <SelectItem value="RM">ชั่งสาร (RM)</SelectItem>
                  <SelectItem value="MX">ผสม (MX)</SelectItem>
                  <SelectItem value="PK">บรรจุ (PK)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Order Type */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ประเภทออเดอร์</Label>
              <Select value={orderTypeFilter} onValueChange={v => setOrderTypeFilter(v || 'ALL')}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทั้งหมด (All)</SelectItem>
                  <SelectItem value="MTS">MTS (Make to Stock)</SelectItem>
                  <SelectItem value="MTO">MTO (Make to Order)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Density / ความกะทัดรัดของแถว */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ความแน่นหน้ากระดาษ</Label>
              <Select value={density} onValueChange={v => { if (v) setDensity(v as 'compact' | 'comfortable') }}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">กะทัดรัด (แน่นเต็มหน้า A4)</SelectItem>
                  <SelectItem value="comfortable">ปกติ (สบายตา)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 6. Shopfloor Handover Tasks Toggle */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ขั้นตอนหน้างาน</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHandovers(!showHandovers)}
                className={cn(
                  "w-full h-8 text-xs font-semibold justify-start px-2 bg-white",
                  showHandovers ? "border-purple-300 text-purple-800 bg-purple-50" : "text-slate-600"
                )}
              >
                {showHandovers ? <Eye className="w-3.5 h-3.5 mr-1 text-purple-600 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />}
                <span className="truncate">{showHandovers ? "แสดงหน้างาน" : "ซ่อนหน้างาน"}</span>
              </Button>
            </div>

            {/* 7. Document Sign-off Box Toggle */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ช่องลงนามอนุมัติ</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIncludeSignatures(!includeSignatures)}
                className={cn(
                  "w-full h-8 text-xs font-semibold justify-start px-2 bg-white",
                  includeSignatures ? "border-emerald-300 text-emerald-800 bg-emerald-50" : "text-slate-600"
                )}
                title="ผู้จัดทำแผนงาน (Planner) / หัวหน้าฝ่ายผลิต / ฝ่ายประกันคุณภาพ (QA) และ ผู้อำนวยการโรงงาน"
              >
                {includeSignatures ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />}
                <span className="truncate">{includeSignatures ? "เปิดช่องลงชื่อ" : "ปิดช่องลงชื่อ"}</span>
              </Button>
            </div>

            {/* 8. Quick Search / Filter */}
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ค้นหา SKU/LOT</Label>
              <div className="relative">
                <Input
                  placeholder="เช่น PAMH, 001/26..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="h-8 text-xs bg-white pr-6"
                />
                {searchFilter && (
                  <button onClick={() => setSearchFilter('')} className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: A4 Landscape Live Preview Container */}
        <div className="flex-1 overflow-y-auto py-4 px-1 sm:px-3 bg-slate-200/70 rounded-lg my-2 border border-slate-300">
          <div className="max-w-[1150px] mx-auto bg-white shadow-md rounded-sm border border-slate-300 p-4 sm:p-6 transition-all">
            {/* The Actual Printable Element */}
            <div id="timeline-printable-markup" ref={printContainerRef} style={{ width: '100%', minWidth: '100%' }}>
              <table className="timeline-table w-full border-collapse" style={{ tableLayout: 'fixed', width: '100%', minWidth: '100%' }}>
                <colgroup>
                  <col style={{ width: '22%', minWidth: '22%' }} />
                  {horizonDates.map((_, idx) => (
                    <col key={idx} style={{ width: `${78 / lookaheadDays}%`, minWidth: `${78 / lookaheadDays}%` }} />
                  ))}
                </colgroup>
                <thead>
                  {/* Document Header Row */}
                  <tr>
                    <th colSpan={lookaheadDays + 1} className="p-0 text-left font-normal border-b-2 border-slate-900">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-slate-900 tracking-wider">
                              COSMEDIVA PRODUCTION SCHEDULE TIMELINE
                            </span>
                            <span className="text-[11px] bg-slate-800 text-white font-bold px-2 py-0.5 rounded">
                              {deptFilter === 'ALL' ? 'ทุกสายงาน' : deptFilter === 'RM' ? 'ฝ่ายชั่งสาร' : deptFilter === 'MX' ? 'ฝ่ายผสม' : 'ฝ่ายบรรจุ'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium mt-0.5">
                            แผนผังกำหนดการผลิต (Lookahead Timeline) • ประจำวันที่ <strong>{format(horizonStart, 'dd/MM/yyyy')}</strong> ถึง <strong>{format(horizonEnd, 'dd/MM/yyyy')}</strong> ({lookaheadDays} วัน)
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-600">
                          <div>พิมพ์เมื่อ: <strong>{format(new Date(), 'dd MMM yyyy HH:mm')}</strong> | ผู้จัดทำ: <strong className="text-slate-900">{currentUser}</strong></div>
                          <div className="flex items-center gap-2 justify-end mt-1 text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">🟡 ชั่งสาร</span>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-300">🔵 ผสม</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">🟢 บรรจุ</span>
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-300">🔬 1st Batch</span>
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">🔄 ปรับเลื่อน</span>
                          </div>
                        </div>
                      </div>

                      {/* Summary Metrics Row */}
                      <div className="flex items-center gap-4 py-1.5 px-3 bg-slate-100/90 border-t border-slate-200 text-[11px] text-slate-700">
                        <span>รายการออเดอร์ในแผน: <strong>{filteredPrintData.length}</strong> LOTs</span>
                        <span>•</span>
                        <span>จำนวนงานทั้งหมด: <strong>{totalFilteredTasksCount}</strong> คิวงาน</span>
                        <span>•</span>
                        <span>จำนวนถังรวม: <strong>{totalFilteredTanksCount}</strong> ถัง</span>
                        <span className="ml-auto text-[10px] text-slate-500">ระบบ CosmeFlow OS • พิมพ์ A4 แนวนอน</span>
                      </div>
                    </th>
                  </tr>

                  {/* Repeating Date Column Headers */}
                  <tr className="bg-slate-800 text-white border-b-2 border-slate-900">
                    <th style={{ width: '22%' }} className="p-2 text-left text-xs font-bold border-r border-slate-700">
                      Project (PO / SKU / LOT)
                    </th>
                    {horizonDates.map((date, idx) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      const isToday = isSameDay(date, new Date())

                      return (
                        <th
                          key={idx}
                          style={{ width: `${78 / lookaheadDays}%` }}
                          className={cn(
                            "p-1 text-center text-xs border-r border-slate-700 font-normal select-none",
                            isWeekend && "bg-slate-700 text-red-300 font-bold",
                            isToday && "bg-blue-600 text-white font-black ring-1 ring-white"
                          )}
                        >
                          <div className="font-bold text-[11px] leading-tight">
                            {TH_DAYS[date.getDay()]}
                          </div>
                          <div className={cn("text-[10px] leading-tight", isToday ? "text-yellow-200 font-bold" : "text-slate-300")}>
                            {format(date, 'dd/MM')}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredPrintData.length === 0 ? (
                    <tr>
                      <td colSpan={lookaheadDays + 1} className="py-12 text-center text-slate-500 text-sm">
                        ไม่พบคิวงานที่ตรงกับเงื่อนไขตัวกรองในช่วงเวลา {format(horizonStart, 'dd/MM/yyyy')} ถึง {format(horizonEnd, 'dd/MM/yyyy')}
                      </td>
                    </tr>
                  ) : (
                    filteredPrintData.map(lot => {
                      const sku = lot.products?.sku || 'Unknown SKU'
                      const lotNo = lot.lot_no || '-'
                      const poNo = lot.po_no || '-'
                      const orderType = lot.order_type || 'MTS'
                      const orderQty = lot.order_quantity ? Number(lot.order_quantity).toLocaleString() : '-'

                      return (
                        <React.Fragment key={lot.id}>
                          {/* LOT Header Row */}
                          <tr className={cn(
                            "lot-header-row bg-slate-100 font-bold border-t-2 border-slate-300",
                            density === 'compact' ? "h-6" : "h-7"
                          )}>
                            <td className={cn(
                              "pl-2 border-r border-slate-300 text-left",
                              density === 'compact' ? "py-0.5 px-1.5" : "p-1.5"
                            )}>
                              <div className="flex items-center justify-between gap-1">
                                <span className={cn(
                                  "font-black text-slate-900 truncate",
                                  density === 'compact' ? "text-[11px]" : "text-xs"
                                )} title={sku}>
                                  {sku}
                                </span>
                                <span className="text-[10px] bg-slate-200 px-1 rounded font-mono font-bold text-slate-700">
                                  {lotNo}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500 font-normal mt-0.5">
                                <span>PO: {poNo}</span>
                                <span>•</span>
                                <span>{orderQty} pc</span>
                                <span>•</span>
                                <span className={cn(
                                  "px-1 rounded text-[9px] font-bold",
                                  orderType === 'MTO' ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"
                                )}>
                                  {orderType}
                                </span>
                              </div>
                            </td>

                            {/* Guideline empty cells across the horizon */}
                            {horizonDates.map((date, idx) => {
                              const isWeekend = date.getDay() === 0 || date.getDay() === 6
                              const isToday = isSameDay(date, new Date())
                              return (
                                <td
                                  key={idx}
                                  className={cn(
                                    "border-r border-slate-200 p-0 text-center text-[10px]",
                                    isWeekend && "bg-slate-200/50",
                                    isToday && "bg-blue-50/60"
                                  )}
                                ></td>
                              )
                            })}
                          </tr>

                          {/* Individual Task Rows */}
                          {lot.tasks.map((log: any) => {
                            const process = processes.find(p => p.id === log.process_id)
                            const pName = process?.process_name || log.processes?.process_name || 'งานผลิต'
                            const palette = getTaskPalette(pName)

                            // 1st Batch detection
                            const isAutoPamh = sku.includes('PAMH-008') && (Number(log.tank_start || 1) <= 1 && Number(log.tank_end || 1) >= 1)
                            const hasBatchTag = (log.note || '').toLowerCase().includes('[1st_batch]') || (lot.order_type || '').includes('[1ST_BATCH]')
                            const is1stBatch = isAutoPamh || hasBatchTag

                            // Reschedule detection
                            const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)

                            // Calculate start and end offset in current horizon
                            const startDateTask = startOfDay(new Date(log.activity_date))
                            const endDateTask = log.end_date ? startOfDay(new Date(log.end_date)) : startDateTask

                            const startDiff = differenceInDays(startDateTask, horizonStart)
                            const taskDuration = differenceInDays(endDateTask, startDateTask) + 1
                            const endDiff = startDiff + taskDuration - 1

                            const clampedStart = Math.max(0, startDiff)
                            const clampedEnd = Math.min(lookaheadDays - 1, endDiff)
                            const spannedDays = clampedEnd - clampedStart + 1

                            const startsBefore = startDiff < 0
                            const endsAfter = endDiff >= lookaheadDays

                            return (
                              <tr key={log.id} className={cn(
                                "task-row hover:bg-slate-50 border-b border-slate-200 text-xs",
                                density === 'compact' ? "h-5" : "h-6"
                              )}>
                                {/* Task Label Cell */}
                                <td className={cn(
                                  "border-r border-slate-300 pl-4 bg-white",
                                  density === 'compact' ? "py-0.5 px-2 text-[10px]" : "py-1 px-2 text-[11px]"
                                )}>
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", palette.dot)}></span>
                                    <span className="font-semibold text-slate-800 truncate">
                                      {pName} (T{log.tank_start || 1}-{log.tank_end || 1})
                                    </span>
                                  </div>
                                </td>

                                {/* Empty cells before task starts */}
                                {clampedStart > 0 && (
                                  <td colSpan={clampedStart} className="border-r border-slate-200 p-0">
                                    <div className="w-full h-full flex">
                                      {Array.from({ length: clampedStart }).map((_, cIdx) => {
                                        const date = horizonDates[cIdx]
                                        const isWeekend = date?.getDay() === 0 || date?.getDay() === 6
                                        return (
                                          <div
                                            key={cIdx}
                                            style={{ width: `${100 / clampedStart}%` }}
                                            className={cn(
                                              "border-r border-slate-100",
                                              density === 'compact' ? "h-5" : "h-6",
                                              isWeekend && "bg-slate-100/60"
                                            )}
                                          ></div>
                                        )
                                      })}
                                    </div>
                                  </td>
                                )}

                                {/* Spanned Gantt Bar Cell */}
                                <td colSpan={spannedDays} className="p-0.5 border-r border-slate-200 relative">
                                  <div className={cn(
                                    "w-full rounded px-1.5 flex items-center justify-between font-bold border shadow-2xs overflow-hidden",
                                    density === 'compact' ? "h-5 text-[9px]" : "h-6 text-[10px]",
                                    palette.bg,
                                    palette.text,
                                    palette.border
                                  )}>
                                    <div className="flex items-center gap-1 truncate">
                                      {startsBefore && <span className="text-[8.5px] opacity-70 shrink-0">◀</span>}
                                      <span className="truncate">
                                        {pName} T{log.tank_start || 1}-{log.tank_end || 1}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      {is1stBatch && (
                                        <span className="bg-purple-200 text-purple-900 px-1 py-0.2 rounded text-[8px] font-black border border-purple-300">
                                          🔬 1st
                                        </span>
                                      )}
                                      {planInfo.isRescheduled && (
                                        <span className="bg-amber-200 text-amber-900 px-1 py-0.2 rounded text-[8px] font-bold border border-amber-300">
                                          🔄 เดิม:{planInfo.originalDate ? format(new Date(planInfo.originalDate), 'dd/MM') : ''}
                                        </span>
                                      )}
                                      {endsAfter && <span className="text-[8.5px] opacity-70 shrink-0">▶</span>}
                                    </div>
                                  </div>
                                </td>

                                {/* Empty cells after task ends */}
                                {clampedEnd < lookaheadDays - 1 && (
                                  <td colSpan={lookaheadDays - 1 - clampedEnd} className="border-r border-slate-200 p-0">
                                    <div className="w-full h-full flex">
                                      {Array.from({ length: lookaheadDays - 1 - clampedEnd }).map((_, cIdx) => {
                                        const actualIdx = clampedEnd + 1 + cIdx
                                        const date = horizonDates[actualIdx]
                                        const isWeekend = date?.getDay() === 0 || date?.getDay() === 6
                                        return (
                                          <div
                                            key={cIdx}
                                            style={{ width: `${100 / (lookaheadDays - 1 - clampedEnd)}%` }}
                                            className={cn(
                                              "border-r border-slate-100",
                                              density === 'compact' ? "h-5" : "h-6",
                                              isWeekend && "bg-slate-100/60"
                                            )}
                                          ></div>
                                        )
                                      })}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>

              {/* Document Sign-off Footer (Appears ONCE at the end of the document on the last page) */}
              {includeSignatures && (
                <div className="signature-section mt-4 pt-3 border-t-2 border-slate-300" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="signature-grid flex justify-between gap-6 pt-2 text-center text-slate-700">
                    <div className="signature-col flex-1 border-t border-slate-400 pt-1">
                      <div className="text-xs font-bold text-slate-900">ผู้จัดทำแผนงาน (Planner)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">({currentUser})</div>
                      <div className="text-[9.5px] text-slate-400 mt-1">วันที่: ..... / ..... / ..........</div>
                    </div>

                    <div className="signature-col flex-1 border-t border-slate-400 pt-1">
                      <div className="text-xs font-bold text-slate-900">หัวหน้าฝ่ายผลิต / ผู้รับมอบแผน</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">(...................................................)</div>
                      <div className="text-[9.5px] text-slate-400 mt-1">วันที่: ..... / ..... / ..........</div>
                    </div>

                    <div className="signature-col flex-1 border-t border-slate-400 pt-1">
                      <div className="text-xs font-bold text-slate-900">ฝ่ายประกันคุณภาพ (QA) / ผู้อำนวยการโรงงาน</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">(...................................................)</div>
                      <div className="text-[9.5px] text-slate-400 mt-1">วันที่: ..... / ..... / ..........</div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-slate-400 mt-3 italic">
                    * หมายเหตุ: แผนผังกำหนดการผลิตนี้สร้างจากระบบ CosmeFlow OS อาจมีการปรับเปลี่ยนวันตามผลการตรวจแล็บและสถานการณ์หน้างานจริง *
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="pt-3 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="toggle-signatures"
                checked={includeSignatures}
                onChange={e => setIncludeSignatures(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="toggle-signatures" className="cursor-pointer font-medium select-none">
                แสดงช่องลงนามอนุมัติ (Sign-off Box) ท้ายเอกสาร
              </label>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
              ปิดหน้าต่าง
            </Button>

            <Button
              size="sm"
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={handlePrint}
              disabled={filteredPrintData.length === 0}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              พิมพ์ / บันทึกเป็น PDF (A4 แนวนอน)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
