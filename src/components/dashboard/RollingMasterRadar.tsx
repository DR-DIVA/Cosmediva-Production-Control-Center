'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { 
  Calendar, 
  Clock, 
  Truck, 
  Scale, 
  Beaker, 
  ShieldCheck,
  Package, 
  PackageOpen,
  Gift, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Info, 
  Layers, 
  ListOrdered, 
  Compass, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Boxes,
  Cylinder,
  CalendarDays,
  Filter,
  Sun,
  Moon
} from 'lucide-react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { parseDelayInfo } from '@/lib/delayTracking'
import { parsePlanChangeInfo, cleanDisplayNote, extractUserComment, PlanChangeInfo } from '@/lib/planTracking'
import { PlantDirectorAdvisory } from '@/components/dashboard/PlantDirectorAdvisory'

export interface RollingMasterRadarProps {
  startDateStr?: string
  onSelectLot?: (lotId: string) => void
  themeRadar?: 'night' | 'light'
  onToggleThemeRadar?: () => void
  themeDirector?: 'night' | 'light'
  onToggleThemeDirector?: () => void
  theme?: 'night' | 'light'
  onToggleTheme?: () => void
}

export interface OperationalStatus {
  badge: string
  shortBadge: string
  type: 'in_progress' | 'done' | 'qc_passed' | 'qc_waiting' | 'qc_issue' | 'delayed' | 'overdue' | 'planned'
  color: string
  dotColor: string
  startTimeStr?: string
  endTimeStr?: string
  note?: string
  detailsText?: string
  rescheduledInfo?: PlanChangeInfo
}

export interface QaIssueInfo {
  id: string
  reportedAt?: string
  scope: 'RM' | 'PM' | 'BULK' | 'IPC' | 'FG'
  issueType: 'HOLD' | 'REPROCESS' | 'REJECT' | 'NC' | 'DEFECT'
  title: string
  rawNote: string
  isResolved: boolean
  resolvedNote?: string
  sku?: string
  lotNo?: string
  tankNo?: string | number
}

export interface BulkStockInfo {
  lotNo: string
  sku?: string
  productName?: string
  tanks: number[]
  kgPerTank: number
  totalKg: number
  isConsumed: boolean
  qcPassedDate: string
}

interface StreamItem {
  id: string
  streamType: 'ETA' | 'WEIGHING' | 'MIXING' | 'QC' | 'QA' | 'BULK_STOCK' | 'PACKING' | 'POF' | 'FG_DUE'
  qcSubtype?: 'RM' | 'PM' | 'BULK' | 'IPC' | 'FG'
  date: string
  title: string
  subtitle: string
  tag?: string
  quantity?: string | number
  status?: string
  lotNo?: string
  sku?: string
  lotId?: string
  isFirstBatch?: boolean
  firstBatchTank?: number
  meta?: any
  opStatus?: OperationalStatus
  qaIssue?: QaIssueInfo
  bulkStock?: BulkStockInfo
}

function computeOperationalStatus(
  item: any,
  streamType: 'ETA' | 'WEIGHING' | 'MIXING' | 'QC' | 'QA' | 'BULK_STOCK' | 'PACKING' | 'POF' | 'FG_DUE',
  cellDate: string,
  todayStr: string
): OperationalStatus {
  const formatTime = (tStr?: string) => {
    if (!tStr) return ''
    try {
      const d = new Date(tStr)
      return isNaN(d.getTime()) ? '' : format(d, 'HH:mm')
    } catch {
      return ''
    }
  }

  if (streamType === 'ETA') {
    const isReceived = item.status === 'RECEIVED' || item.status === 'READY'
    const isDelayed = item.meta?.isDelayed || item.status === 'DELAYED' || item.delayInfo?.isDelayed
    const isQcPassed = item.qc_status === 'PASSED'

    if (isReceived) {
      if (isQcPassed) {
        return {
          badge: '🛡️ QC Pass (ตรวจรับแล้ว)',
          shortBadge: 'QC Pass',
          type: 'qc_passed',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500',
          detailsText: 'รับสินค้าเข้าคลัง RM/PM และผ่านการตรวจ QC แล้ว'
        }
      }
      return {
        badge: '📥 รับเข้าคลัง RM/PM แล้ว',
        shortBadge: 'รับเข้าคลัง',
        type: 'done',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotColor: 'bg-emerald-500',
        detailsText: `รับสินค้าเข้าคลังแล้วเมื่อ ${item.receive_date || cellDate}`
      }
    }

    if (isDelayed) {
      return {
        badge: '⚠️ เลื่อนส่ง',
        shortBadge: 'เลื่อนส่ง',
        type: 'delayed',
        color: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotColor: 'bg-rose-500',
        detailsText: item.meta?.delayInfo?.categoryLabel || item.delayInfo?.categoryLabel || 'เลื่อนกำหนดส่งมอบ'
      }
    }

    if (cellDate < todayStr && !item.receive_date) {
      return {
        badge: '⚠️ เกินกำหนดเข้า',
        shortBadge: 'เกินกำหนด',
        type: 'overdue',
        color: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dotColor: 'bg-amber-500',
        detailsText: 'เกินกำหนดส่งตาม PO และยังไม่ได้รับสินค้า'
      }
    }

    return {
      badge: '📦 รอนำส่ง',
      shortBadge: 'รอนำส่ง',
      type: 'planned',
      color: 'bg-slate-50 text-slate-600 border-slate-200/80',
      dotColor: 'bg-slate-400'
    }
  }

  // Bulk Staging Stock (Tanks that passed QC and are ready for packing)
  if (streamType === 'BULK_STOCK') {
    return {
      badge: '🛢️ สต็อก Bulk พร้อมบรรจุ',
      shortBadge: 'พร้อมบรรจุ',
      type: 'qc_passed',
      color: 'bg-cyan-50 text-cyan-800 border-cyan-300/80',
      dotColor: 'bg-cyan-500',
      detailsText: item.meta?.bulkDetails || 'เนื้อผสมผ่าน QC สมบูรณ์ พร้อมให้ฝ่ายบรรจุ (PK) เบิกเดินเครื่อง'
    }
  }

  if (streamType === 'FG_DUE') {
    const lot = item.meta || item
    const cStatus = lot.current_status
    const qcCarton = lot.qc_fg_passed_carton_ranges

    if (cStatus === 'DONE') {
      return {
        badge: '✅ ส่งมอบ/ผลิตเสร็จ',
        shortBadge: 'ส่งมอบแล้ว',
        type: 'done',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotColor: 'bg-emerald-500',
        detailsText: 'ล็อตการผลิตนี้ผลิตเสร็จและปิดยอดเรียบร้อย'
      }
    }

    if (qcCarton && String(qcCarton).trim() !== '') {
      return {
        badge: '🛡️ FG QC Pass พร้อมส่ง',
        shortBadge: 'QC Pass',
        type: 'qc_passed',
        color: 'bg-teal-50 text-teal-700 border-teal-200/80',
        dotColor: 'bg-teal-500',
        detailsText: `ผ่านการตรวจปล่อย FG กล่องที่: ${qcCarton}`
      }
    }

    if (cStatus === 'IN_PROGRESS') {
      return {
        badge: '⚙️ กำลังผลิตในสายงาน',
        shortBadge: 'กำลังผลิต',
        type: 'in_progress',
        color: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotColor: 'bg-blue-500 animate-pulse',
        detailsText: 'กำลังดำเนินงานผลิตตามแผนงาน'
      }
    }

    const dueDate = lot.fg_due_date || cellDate
    if (dueDate < todayStr && cStatus !== 'DONE') {
      return {
        badge: '⚠️ เกินกำหนดส่งมอบ',
        shortBadge: 'เกินกำหนด',
        type: 'overdue',
        color: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotColor: 'bg-rose-500',
        detailsText: 'ยังผลิตไม่เสร็จและเลยกำหนดส่งมอบ FG แล้ว'
      }
    }

    return {
      badge: '📋 รอส่งมอบตามแผน',
      shortBadge: 'ตามแผน',
      type: 'planned',
      color: 'bg-slate-50 text-slate-600 border-slate-200/80',
      dotColor: 'bg-slate-400'
    }
  }

  // Quality Assurance & Incident Gate (QA): Incidents, Hold, Reprocess, Reject, NC, and 1st Batch Evaluation
  if (streamType === 'QA') {
    if (item.isFirstBatch) {
      const isMixingInProgress = item.meta?.status === 'IN_PROGRESS' || item.status === 'IN_PROGRESS'
      const isMixingDone = item.meta?.status === 'DONE' || item.status === 'DONE'
      return {
        badge: `🔬 นัดหมาย QA ร่วมประเมิน 1st Batch (MX ถัง ${item.firstBatchTank || 1})`,
        shortBadge: `1st Batch MX`,
        type: isMixingInProgress ? 'in_progress' : isMixingDone ? 'done' : 'planned',
        color: isMixingInProgress 
          ? 'bg-purple-100 text-purple-950 border-purple-400 font-bold ring-1 ring-purple-300' 
          : isMixingDone 
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
          : 'bg-purple-50 text-purple-900 border-purple-300 font-medium',
        dotColor: isMixingInProgress ? 'bg-purple-600 animate-pulse' : isMixingDone ? 'bg-emerald-500' : 'bg-purple-400',
        detailsText: `นัดหมายฝ่ายประกันคุณภาพ (QA) เข้าสังเกตการณ์ ตรวจสอบพารามิเตอร์ และประเมินสูตรใหม่หน้างานร่วมกับฝ่ายผสม (MX) ถัง ${item.firstBatchTank || 1}`
      }
    }
    if (item.qaIssue && !item.qaIssue.isResolved) {
      const itype = item.qaIssue.issueType
      return {
        badge: `⚠️ รอ QA ประเมิน (${itype})`,
        shortBadge: `รอ QA (${itype})`,
        type: 'qc_issue',
        color: 'bg-rose-100 text-rose-950 border-rose-400 font-bold',
        dotColor: 'bg-rose-500 animate-pulse',
        note: item.qaIssue.rawNote,
        detailsText: `ตรวจพบประเด็น ${item.qaIssue.scope} (${itype}) อยู่ระหว่างรอฝ่ายประกันคุณภาพ (QA) เข้าประเมินความเสี่ยงและปลดล็อค`
      }
    }
    return {
      badge: '✅ QA รับทราบ/อนุมัติแล้ว',
      shortBadge: 'QA ผ่าน',
      type: 'qc_passed',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dotColor: 'bg-emerald-500',
      detailsText: 'ฝ่ายประกันคุณภาพ (QA) ได้ทำการประเมินและอนุมัติให้ดำเนินการต่อแล้ว'
    }
  }

  // Quality Control Routine Lab (QC): RM, PM, BULK, IPC, FG
  if (streamType === 'QC') {

    const subtype = item.qcSubtype || 'BULK'
    const subLabel = subtype === 'RM' ? 'RM' : subtype === 'PM' ? 'PM' : subtype === 'BULK' ? 'Bulk' : subtype === 'IPC' ? 'IPC' : 'FG'
    const rawStatus = (item.status || item.qc_status || '').toUpperCase()

    if (rawStatus === 'PASSED' || rawStatus === 'RELEASED' || rawStatus === 'QC_PASS' || rawStatus === 'READY' || rawStatus === 'DONE') {
      return {
        badge: `🛡️ ผ่าน QC (${subLabel})`,
        shortBadge: 'ผ่าน QC',
        type: 'qc_passed',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotColor: 'bg-emerald-500',
        detailsText: `ตรวจรับรองคุณภาพ ${subLabel} ผ่านเกณฑ์มาตรฐานเรียบร้อย`
      }
    }
    if (rawStatus === 'HOLD' || rawStatus === 'PAUSED' || rawStatus === 'REPROCESS') {
      return {
        badge: `⚠️ QC HOLD (${subLabel})`,
        shortBadge: 'QC HOLD',
        type: 'qc_issue',
        color: 'bg-orange-50 text-orange-700 border-orange-200/80',
        dotColor: 'bg-orange-500',
        detailsText: item.note || `พบประเด็นคุณภาพ ${subLabel} อยู่ระหว่างกักกัน/รอการตัดสินใจ`
      }
    }
    if (rawStatus === 'REJECTED' || rawStatus === 'FAILED') {
      return {
        badge: `❌ QC REJECT (${subLabel})`,
        shortBadge: 'REJECT',
        type: 'qc_issue',
        color: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotColor: 'bg-rose-500',
        detailsText: item.note || `ไม่ผ่านเกณฑ์การตรวจสอบคุณภาพ ${subLabel}`
      }
    }
    if (rawStatus === 'IN_PROGRESS' || rawStatus === 'SENT_TO_QC') {
      return {
        badge: `🔬 กำลังตรวจ (${subLabel})`,
        shortBadge: 'กำลังตรวจ',
        type: 'in_progress',
        color: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotColor: 'bg-blue-500 animate-pulse',
        detailsText: `ห้องปฏิบัติการ QC กำลังดำเนินการทดสอบตัวอย่าง ${subLabel}`
      }
    }
    return {
      badge: `⏳ รอตรวจ QC (${subLabel})`,
      shortBadge: 'รอ QC',
      type: 'qc_waiting',
      color: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotColor: 'bg-amber-500',
      detailsText: rawStatus === 'QUARANTINE' ? 'กักกันในคลัง รอการสุ่มตรวจปล่อย' : `รอคิวสุ่มตรวจและทดสอบตัวอย่าง ${subLabel}`
    }
  }

  // Manufacturing logs: WEIGHING, MIXING, PACKING
  const log = item.meta || item
  const procName = (log.processes?.process_name || '').toLowerCase()
  const status = (log.status || '').toUpperCase()
  const qcStatus = (log.qc_status || '').toUpperCase()
  const startTime = formatTime(log.start_time)
  const endTime = formatTime(log.end_time)

  // Parse plan rescheduling tracking & clean user comments
  const planInfo = parsePlanChangeInfo(log.note, log.activity_date, log.created_at)
  const userComment = extractUserComment(log.note)
  const note = userComment || undefined

  const isPof = streamType === 'POF' || procName.includes('pof') || procName.includes('ลงลัง') || procName.includes('อุโมงค์')

  const streamVerb = 
    streamType === 'WEIGHING' ? 'ชั่งสาร' : 
    streamType === 'MIXING' ? 'ผสม Bulk' : 
    isPof ? 'ลงลัง/POF' : 'บรรจุ'

  const streamShortVerb = 
    streamType === 'WEIGHING' ? 'ชั่ง' : 
    streamType === 'MIXING' ? 'ผสม' : 
    isPof ? 'ลงลัง/POF' : 'บรรจุ'

  // QC checks
  if (procName.includes('qc pass') || qcStatus === 'PASSED') {
    return {
      badge: `🛡️ QC Pass (${streamShortVerb})`,
      shortBadge: 'QC Pass',
      type: 'qc_passed',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dotColor: 'bg-emerald-500',
      startTimeStr: startTime,
      endTimeStr: endTime,
      note,
      detailsText: 'ผ่านการตรวจสอบคุณภาพ (QC Pass) เรียบร้อย',
      rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
    }
  }

  if (procName === 'รอ qc' || qcStatus === 'WAITING') {
    return {
      badge: '⏳ รอผลตรวจ QC',
      shortBadge: 'รอ QC',
      type: 'qc_waiting',
      color: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotColor: 'bg-amber-500',
      startTimeStr: startTime,
      note,
      detailsText: 'งานเสร็จแล้ว อยู่ระหว่างรอผลทดสอบแล็บ QC',
      rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
    }
  }

  if (procName.includes('qc hold') || qcStatus === 'HOLD') {
    return {
      badge: '⚠️ QC Hold (ระงับ)',
      shortBadge: 'QC Hold',
      type: 'qc_issue',
      color: 'bg-orange-50 text-orange-700 border-orange-200/80',
      dotColor: 'bg-orange-500',
      note,
      detailsText: 'ผลตรวจไม่สมบูรณ์ อยู่ระหว่างรอฝ่าย QC พิจารณา',
      rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
    }
  }

  if (procName.includes('qc reject') || qcStatus === 'REJECTED') {
    return {
      badge: '❌ QC Reject',
      shortBadge: 'QC Reject',
      type: 'qc_issue',
      color: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dotColor: 'bg-rose-500',
      note,
      detailsText: 'ไม่ผ่านเกณฑ์มาตรฐาน QC',
      rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
    }
  }

  // Active work
  if (status === 'IN_PROGRESS') {
    return {
      badge: `▶️ กำลัง${streamVerb}`,
      shortBadge: `กำลัง${streamShortVerb}`,
      type: 'in_progress',
      color: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dotColor: 'bg-blue-500 animate-pulse',
      startTimeStr: startTime,
      note,
      detailsText: startTime ? `หน้างานเริ่มแล้วเมื่อเวลา ${startTime} น.` : 'หน้างานกำลังดำเนินการ',
      rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
    }
  }

  // Completed work
  if (status === 'DONE' || status === 'COMPLETED') {
    let piecesText = ''
    if (log.piece_quantity) {
      piecesText = `ทำได้ ${Number(log.piece_quantity).toLocaleString()} ชิ้น`
    }
    return {
      badge: `✅ ${streamShortVerb}เสร็จแล้ว`,
      shortBadge: 'เสร็จสิ้น',
      type: 'done',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dotColor: 'bg-emerald-500',
      startTimeStr: startTime,
      endTimeStr: endTime,
      note,
      detailsText: [endTime ? `เสร็จเมื่อ ${endTime} น.` : '', piecesText].filter(Boolean).join(' • ') || 'ดำเนินการเสร็จสิ้นเรียบร้อย',
      rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
    }
  }

  // Rescheduled plan check
  if (planInfo.isRescheduled) {
    const origStr = planInfo.originalDate ? new Date(planInfo.originalDate).toLocaleDateString('th-TH') : '-'
    const revStr = planInfo.revisedDate ? new Date(planInfo.revisedDate).toLocaleDateString('th-TH') : '-'
    return {
      badge: `🔄 เลื่อนแผน (${planInfo.categoryLabel || 'ปรับแผน'})`,
      shortBadge: 'เลื่อนแผน',
      type: 'planned',
      color: 'bg-purple-50 text-purple-700 border-purple-200/80',
      dotColor: 'bg-purple-500',
      startTimeStr: startTime,
      endTimeStr: endTime,
      note,
      detailsText: `แผนเดิม: ${origStr} ➔ แผนใหม่: ${revStr}${planInfo.reason ? ` (${planInfo.reason})` : ''}`,
      rescheduledInfo: planInfo
    }
  }

  // Waiting / Planned (Overdue past scheduled date)
  if (cellDate < todayStr) {
    const overdueLabel = isPof ? '⚠️ แผนค้าง POF (รอทบทวนวัน)' : '⚠️ แผนค้าง (รอทบทวนวัน)'
    const overdueDetails = isPof 
      ? 'เลยวันตามแผนงานลงลัง/POF แล้ว กรุณาฝ่ายวางแผนทบทวนและปรับวันใหม่'
      : 'เลยวันตามแผนงานแล้ว กรุณาฝ่ายวางแผนทบทวนและปรับวันใหม่'
    return {
      badge: overdueLabel,
      shortBadge: isPof ? 'แผนค้าง POF' : 'แผนค้าง',
      type: 'overdue',
      color: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotColor: 'bg-amber-500',
      detailsText: overdueDetails,
      rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
    }
  }

  return {
    badge: `📋 ตามแผน (รอ${streamShortVerb})`,
    shortBadge: 'ตามแผน',
    type: 'planned',
    color: 'bg-slate-50 text-slate-600 border-slate-200/80',
    dotColor: 'bg-slate-400',
    rescheduledInfo: planInfo.isRescheduled ? planInfo : undefined
  }
}

const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatTankRanges(tanks: number[]): string {
  if (!tanks || tanks.length === 0) return '-'
  const sorted = Array.from(new Set(tanks)).sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i]
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
      start = sorted[i]
      prev = sorted[i]
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`)
  return ranges.join(', ')
}

export function checkIsFirstBatch(log: any, lot: any, pName?: string): { isFirstBatch: boolean; firstBatchTank: number } {
  const note = (log?.note || '').toLowerCase()
  const lotNote = (lot?.note || '').toLowerCase()
  const orderType = (lot?.order_type || '').toLowerCase()
  const sku = (lot?.products?.sku || '').toUpperCase()
  const proc = (pName || log?.processes?.process_name || '').toLowerCase()

  const startT = Number(log?.tank_start || 1)
  const endT = Number(log?.tank_end || startT || 1)

  // 1. Explicit marker from Planner (in log.note, lot.order_type, lot.note, etc.)
  const hasTag = 
    note.includes('[1st_batch]') || 
    note.includes('1st batch') || 
    note.includes('1st_batch') ||
    note.includes('pilot batch') ||
    note.includes('ผลิตครั้งแรก') ||
    lotNote.includes('[1st_batch]') ||
    lotNote.includes('1st batch') ||
    orderType.includes('first') ||
    orderType.includes('1st') ||
    log?.is_first_batch === true ||
    lot?.is_first_batch === true

  // 2. Specific business rule for PAMH-008:
  // "สำหรับงาน PAMH-008 ในคิวผสม ถัง 1 จะเป็น 1st batch เสมอค่ะ"
  const isPamh008Tank1 = sku.includes('PAMH-008') && (startT <= 1 && endT >= 1) && (proc.includes('ผสม') || proc.includes('mix'))

  if (isPamh008Tank1) {
    return { isFirstBatch: true, firstBatchTank: 1 }
  }

  if (hasTag && (proc.includes('ผสม') || proc.includes('mix'))) {
    return { isFirstBatch: true, firstBatchTank: startT }
  }

  return { isFirstBatch: false, firstBatchTank: 1 }
}

function QcDetailDialog({
  isOpen,
  onClose,
  data,
  isNight,
  onSelectLot
}: {
  isOpen: boolean
  onClose: () => void
  data: { items: StreamItem[]; stream: any; date: any } | null
  isNight: boolean
  onSelectLot?: (lotId: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'QA' | 'RM' | 'PM' | 'BULK' | 'FG'>('ALL')

  const isQaModal = data?.stream?.key === 'QA'

  useEffect(() => {
    if (isOpen) {
      if (isQaModal) {
        setActiveTab('QA')
      } else {
        setActiveTab('ALL')
      }
    }
  }, [isOpen, data?.date?.dateStr, isQaModal])

  if (!data) return null

  const { items, stream, date } = data

  const qaIssues = items.filter(it => it.qaIssue || it.opStatus?.type === 'qc_issue' || it.isFirstBatch)
  const pendingQaIssues = qaIssues.filter(it => it.isFirstBatch ? false : (it.qaIssue ? !it.qaIssue.isResolved : true))
  const rmItems = items.filter(it => it.qcSubtype === 'RM')
  const pmItems = items.filter(it => it.qcSubtype === 'PM')
  const bulkItems = items.filter(it => it.qcSubtype === 'BULK')
  const fgItems = items.filter(it => it.qcSubtype === 'FG')

  const filteredItems = 
    activeTab === 'QA' ? qaIssues :
    activeTab === 'RM' ? rmItems :
    activeTab === 'PM' ? pmItems :
    activeTab === 'BULK' ? bulkItems :
    activeTab === 'FG' ? fgItems :
    items

  const Icon = stream.icon

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-2xl md:max-w-3xl lg:max-w-5xl w-full p-6 rounded-3xl border shadow-2xl transition-colors duration-200 z-[110] max-h-[92vh] overflow-y-auto ${
          isNight 
            ? 'bg-[#0F172A] border-purple-800/60 text-slate-100' 
            : 'bg-white border-purple-200 text-[#4A4238]'
        }`}
      >
        <DialogHeader className="text-left space-y-2 pb-3 border-b border-purple-100/60 dark:border-purple-900/40">
          <div className="flex items-center justify-between gap-3 flex-wrap pr-8">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border shrink-0 ${
                isQaModal
                  ? (isNight ? 'bg-rose-950/60 border-rose-800 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
                  : (isNight ? 'bg-purple-950/60 border-purple-800 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700')
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className={`text-base sm:text-lg font-bold flex items-center gap-2 ${
                  isNight ? 'text-white' : 'text-slate-900'
                }`}>
                  <span>{isQaModal ? 'งานประกันคุณภาพ QA (QA Assurance & Gate)' : 'งานตรวจสอบคุณภาพ QC (QC Testing Lab)'}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isQaModal
                      ? (pendingQaIssues.length > 0
                        ? 'text-rose-200 bg-rose-950/80 border-rose-800'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200')
                      : (isNight 
                        ? 'text-purple-300 bg-purple-950/80 border-purple-800' 
                        : 'text-purple-700 bg-purple-50 border-purple-200')
                  }`}>
                    {items.length} รายการ
                  </span>
                  {pendingQaIssues.length > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                      ⚠️ รอ QA {pendingQaIssues.length} ประเด็น
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isQaModal
                    ? 'เกตเวย์กำกับมาตรฐาน ประเมินความเสี่ยงและปลดล็อคข้อผิดพลาด Hold, Reprocess, Reject, NC ทุกมิติการผลิต'
                    : 'เกตเวย์ควบคุมคุณภาพและตรวจวิเคราะห์ตามคิวปฏิบัติการ RM, PM, เนื้อ Bulk, IPC, และสินค้าสำเร็จรูป FG'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/issues"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs"
              >
                <span>จัดการปัญหา QA</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                isNight 
                  ? 'text-purple-200 bg-purple-950/90 border-purple-700' 
                  : 'text-purple-900 bg-purple-100/80 border-purple-200'
              }`}>
                📅 {date.dayName} {date.dayNum} {date.monthName}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* 6 Category Filter Tabs */}
        <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2 p-1.5 rounded-2xl ${
          isNight ? 'bg-slate-900/90 border border-slate-800' : 'bg-slate-100/90 border border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm'
                : (isNight ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60')
            }`}
          >
            <span>ทั้งหมด</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QA')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'QA'
                ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                : (pendingQaIssues.length > 0 
                  ? 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800' 
                  : (isNight ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'))
            }`}
          >
            <span>⚠️ รอ QA</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'QA' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
            }`}>
              {qaIssues.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RM')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'RM'
                ? 'bg-amber-600 text-white shadow-sm'
                : (isNight ? 'text-amber-300 hover:text-amber-200 hover:bg-slate-800/60' : 'text-amber-800 hover:text-amber-950 hover:bg-white/60')
            }`}
          >
            <span>🧪 RM</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'RM' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {rmItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PM')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PM'
                ? 'bg-cyan-600 text-white shadow-sm'
                : (isNight ? 'text-cyan-300 hover:text-cyan-200 hover:bg-slate-800/60' : 'text-cyan-800 hover:text-cyan-950 hover:bg-white/60')
            }`}
          >
            <span>🏷️ PM</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'PM' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300'
            }`}>
              {pmItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BULK')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'BULK'
                ? 'bg-blue-600 text-white shadow-sm'
                : (isNight ? 'text-blue-300 hover:text-blue-200 hover:bg-slate-800/60' : 'text-blue-800 hover:text-blue-950 hover:bg-white/60')
            }`}
          >
            <span>🥣 Bulk</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'BULK' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              {bulkItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FG')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'FG'
                ? 'bg-emerald-600 text-white shadow-sm'
                : (isNight ? 'text-emerald-300 hover:text-emerald-200 hover:bg-slate-800/60' : 'text-emerald-800 hover:text-emerald-950 hover:bg-white/60')
            }`}
          >
            <span>🎁 FG</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'FG' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              {fgItems.length}
            </span>
          </button>
        </div>

        {/* Dedicated QA Incident Table View when QA tab is selected */}
        {activeTab === 'QA' ? (
          <div className="space-y-3">
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 flex-wrap ${
              isNight ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold">
                  บันทึกปัญหาคุณภาพและประเด็นที่รอฝ่ายประกันคุณภาพ (QA) ประเมินความเสี่ยง ({qaIssues.length} รายการ)
                </span>
              </div>
              <a
                href="/issues"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-rose-700 dark:text-rose-300 underline flex items-center gap-1"
              >
                เปิดหน้าจัดการปัญหา QA เต็มรูปแบบ <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {qaIssues.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                🎉 ไม่มีประเด็นปัญหาคุณภาพหรือ Hold ในวันนี้
              </div>
            ) : (
              <div className="space-y-2.5">
                {qaIssues.map((it, idx) => {
                  if (it.isFirstBatch) {
                    const isMixingInProgress = it.meta?.status === 'IN_PROGRESS'
                    return (
                      <div
                        key={it.id || idx}
                        className={`p-4 rounded-2xl border transition space-y-2.5 ${
                          isNight
                            ? 'bg-purple-950/40 border-purple-800'
                            : 'bg-purple-50/80 border-purple-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black px-2.5 py-0.5 rounded-md border bg-purple-600 text-white border-purple-700 shadow-xs">
                              [🔬 1ST BATCH]
                            </span>
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md border bg-purple-100 text-purple-900 border-purple-300">
                              BULK MIXING
                            </span>
                            <strong className={`font-bold text-sm ${isNight ? 'text-white' : 'text-slate-900'}`}>
                              {it.title}
                            </strong>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                              isMixingInProgress
                                ? 'bg-purple-100 text-purple-950 border-purple-400'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}>
                              🔬 ถัง {it.firstBatchTank || 1} • {isMixingInProgress ? 'กำลังผสมหน้างาน 🟢' : 'ตามแผน ⏳'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                            ห้องผสม Bulk
                          </span>
                        </div>

                        <div className={`text-xs p-3 rounded-xl border leading-relaxed ${
                          isNight ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-purple-200 text-slate-700'
                        }`}>
                          <div className="font-semibold text-purple-900 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                            <span className="text-sm">🔬</span>
                            <span>ภารกิจฝ่ายประกันคุณภาพ (QA) ร่วมประเมิน 1st Batch:</span>
                          </div>
                          <p className="text-[11px] text-purple-900 leading-relaxed mb-2">
                            ฝ่ายประกันคุณภาพ (QA) ต้องเข้าร่วมสังเกตการณ์ ตรวจสอบขั้นตอนการผสม การเติมสาร อุณหภูมิ และเวลาการกวน พร้อมประเมิน In-Process Control (IPC) ถัง {it.firstBatchTank || 1} ร่วมกับช่างผสมหน้างาน
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] bg-purple-50/60 p-2.5 rounded-lg border border-purple-200/80">
                            <div>• <strong>สินค้า:</strong> {it.subtitle}</div>
                            <div>• <strong>จุดตรวจ:</strong> ห้องผสม Bulk / ถัง {it.firstBatchTank || 1}</div>
                            <div>• <strong>ช่วงแผนผสม:</strong> {it.meta?.startDate ? format(parseISO(it.meta.startDate), 'd MMM') : ''} - {it.meta?.endDate ? format(parseISO(it.meta.endDate), 'd MMM yyyy') : ''}</div>
                            <div>• <strong>สถานะฝ่ายผสม:</strong> {it.meta?.status === 'IN_PROGRESS' ? 'กำลังผสมอยู่หน้างาน (IN PROGRESS) 🟢' : it.meta?.status === 'DONE' ? 'ผสมเสร็จสิ้นแล้ว ✓' : 'ตามแผนงาน (PLANNED) ⏳'}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                          <div className="text-[11px] text-purple-700 font-medium">
                            กำหนดการประเมินตรงตามคิวผสมของฝ่ายผลิตหน้างาน
                          </div>
                          {it.lotId && onSelectLot && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                onSelectLot(it.lotId!)
                              }}
                              className="text-xs text-purple-700 hover:text-purple-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              ดูกราฟล็อตนี้ <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  }

                  const qa = it.qaIssue
                  const issueType = qa?.issueType || 'HOLD'
                  const scope = qa?.scope || it.qcSubtype || 'BULK'
                  const isResolved = qa?.isResolved ?? false

                  return (
                    <div
                      key={it.id || idx}
                      className={`p-4 rounded-2xl border transition space-y-2.5 ${
                        isNight
                          ? isResolved
                            ? 'bg-slate-900/60 border-slate-800'
                            : 'bg-rose-950/40 border-rose-800'
                          : isResolved
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-rose-50/80 border-rose-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Issue Type Badge */}
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-md border ${
                            issueType === 'REJECT' ? 'bg-red-600 text-white border-red-700' :
                            issueType === 'REPROCESS' ? 'bg-purple-600 text-white border-purple-700' :
                            issueType === 'NC' ? 'bg-amber-600 text-white border-amber-700' :
                            'bg-orange-600 text-white border-orange-700'
                          }`}>
                            [{issueType}]
                          </span>

                          {/* Scope Badge */}
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                            scope === 'RM' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            scope === 'PM' ? 'bg-cyan-100 text-cyan-900 border-cyan-300' :
                            scope === 'BULK' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            scope === 'IPC' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                            'bg-purple-100 text-purple-900 border-purple-300'
                          }`}>
                            {scope}
                          </span>

                          <strong className={`font-bold text-sm ${isNight ? 'text-white' : 'text-slate-900'}`}>
                            {it.title}
                          </strong>

                          {isResolved ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ ได้รับการแก้ไขแล้ว
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              ⚠️ รอ QA ประเมิน
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {it.meta?.processName && (
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {it.meta.processName} {it.meta.roomName ? `(${it.meta.roomName})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Issue Description */}
                      <div className={`text-xs p-3 rounded-xl border leading-relaxed ${
                        isNight ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-rose-200/80 text-slate-700'
                      }`}>
                        <div className="font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>รายละเอียดปัญหา / ข้อสังเกต QC:</span>
                        </div>
                        <div className="font-mono text-xs pl-5 whitespace-pre-wrap">
                          {qa?.rawNote || it.subtitle}
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <div className="text-[11px] text-slate-400">
                          {qa?.reportedAt ? `แจ้งเมื่อ: ${new Date(qa.reportedAt).toLocaleString('th-TH')}` : ''}
                        </div>

                        <div className="flex items-center gap-3">
                          {it.lotId && onSelectLot && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose()
                                onSelectLot(it.lotId!)
                              }}
                              className="text-xs text-purple-600 hover:text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              ดูกราฟล็อตนี้ <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a
                            href="/issues"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            จัดการปัญหาในหน้า QA <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Item List for Other Tabs */
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                ไม่มีรายการงานตรวจ QC ในหมวดนี้
              </div>
            ) : (
              filteredItems.map((it, idx) => {
                const isHold = it.opStatus?.type === 'qc_issue'
                const isWaiting = it.opStatus?.type === 'qc_waiting'
                const isPassed = it.opStatus?.type === 'qc_passed'
                const isProgress = it.opStatus?.type === 'in_progress'

                return (
                  <div
                    key={it.id || idx}
                    className={`p-3.5 sm:p-4 rounded-2xl border space-y-2 transition ${
                      isNight
                        ? isHold
                          ? 'bg-rose-950/40 border-rose-800'
                          : isWaiting
                          ? 'bg-amber-950/40 border-amber-800'
                          : isPassed
                          ? 'bg-emerald-950/40 border-emerald-800'
                          : isProgress
                          ? 'bg-blue-950/40 border-blue-800'
                          : 'bg-slate-900 border-slate-800'
                        : isHold 
                        ? 'bg-rose-50/80 border-rose-300' 
                        : isWaiting
                        ? 'bg-amber-50/60 border-amber-200'
                        : isPassed
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : isProgress
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Badge */}
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                          it.qcSubtype === 'RM' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          it.qcSubtype === 'PM' ? 'bg-cyan-100 text-cyan-900 border-cyan-300' :
                          it.qcSubtype === 'BULK' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                          it.qcSubtype === 'IPC' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                          'bg-purple-100 text-purple-900 border-purple-300'
                        }`}>
                          {it.qcSubtype === 'RM' ? '🧪 วัตถุดิบ RM' :
                           it.qcSubtype === 'PM' ? '🏷️ บรรจุภัณฑ์ PM' :
                           it.qcSubtype === 'BULK' ? '🥣 เนื้อ Bulk' :
                           it.qcSubtype === 'IPC' ? '⚖️ ระหว่างผลิต IPC' : '🎁 สำเร็จรูป FG'}
                        </span>

                        <strong className={`font-bold text-sm ${isNight ? 'text-white' : 'text-slate-800'}`}>
                          {it.title}
                        </strong>

                        {it.opStatus && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${it.opStatus.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${it.opStatus.dotColor} shrink-0`} />
                            <span>{it.opStatus.badge}</span>
                          </span>
                        )}
                      </div>

                      {it.tag && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 border ${
                          isNight ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
                        }`}>
                          {it.tag}
                        </span>
                      )}
                    </div>

                    <div className={`text-xs font-medium ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>
                      {it.subtitle}
                    </div>

                    {it.opStatus?.detailsText && (
                      <div className={`text-xs p-2 rounded-xl border flex items-center gap-2 ${
                        isNight ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white/80 border-slate-200/80 text-slate-600'
                      }`}>
                        <Info className="w-4 h-4 text-purple-500 shrink-0" />
                        <span>{it.opStatus.detailsText}</span>
                      </div>
                    )}

                    {it.lotId && onSelectLot && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onSelectLot(it.lotId!)
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700 font-bold hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        ดูกราฟล็อตนี้ <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function RollingMasterRadar({ 
  startDateStr, 
  onSelectLot,
  themeRadar,
  onToggleThemeRadar,
  themeDirector,
  onToggleThemeDirector,
  theme,
  onToggleTheme
}: RollingMasterRadarProps) {
  const [internalRadarTheme, setInternalRadarTheme] = useState<'night' | 'light'>('light')
  const [internalDirectorTheme, setInternalDirectorTheme] = useState<'night' | 'light'>('night')

  useEffect(() => {
    try {
      const savedRadar = localStorage.getItem('cosmeflow_theme_21day')
      if (savedRadar === 'night' || savedRadar === 'light') {
        setInternalRadarTheme(savedRadar)
      }
      const savedDirector = localStorage.getItem('cosmeflow_theme_ai_director') || localStorage.getItem('cosmeflow_director_advisory_theme')
      if (savedDirector === 'night' || savedDirector === 'light') {
        setInternalDirectorTheme(savedDirector)
      }
    } catch {
      // ignore
    }
  }, [])

  const currentRadarTheme = themeRadar ?? (theme !== undefined ? theme : internalRadarTheme)
  const isNight = currentRadarTheme === 'night'

  const handleToggleRadar = () => {
    if (onToggleThemeRadar) {
      onToggleThemeRadar()
    } else if (onToggleTheme) {
      onToggleTheme()
    } else {
      const next = currentRadarTheme === 'night' ? 'light' : 'night'
      setInternalRadarTheme(next)
      try {
        localStorage.setItem('cosmeflow_theme_21day', next)
      } catch {
        // ignore
      }
    }
  }

  const currentDirectorTheme = themeDirector ?? internalDirectorTheme
  const handleToggleDirector = () => {
    if (onToggleThemeDirector) {
      onToggleThemeDirector()
    } else {
      const next = currentDirectorTheme === 'night' ? 'light' : 'night'
      setInternalDirectorTheme(next)
      try {
        localStorage.setItem('cosmeflow_theme_ai_director', next)
        localStorage.setItem('cosmeflow_director_advisory_theme', next)
      } catch {
        // ignore
      }
    }
  }

  const [viewMode, setViewMode] = useState<'timeline' | 'daily' | 'logistics'>('timeline')
  const [selectedStreams, setSelectedStreams] = useState<('ETA' | 'WEIGHING' | 'MIXING' | 'QC' | 'QA' | 'BULK_STOCK' | 'PACKING' | 'POF' | 'FG_DUE')[]>([])
  const [loading, setLoading] = useState(true)
  const [radarData, setRadarData] = useState<{
    etaList: any[]
    logsList: any[]
    fgDueLots: any[]
    fgInventoryList: any[]
    qaIssuesLogs: any[]
    bulkLogsAll: any[]
    packLogsAll: any[]
  }>({
    etaList: [],
    logsList: [],
    fgDueLots: [],
    fgInventoryList: [],
    qaIssuesLogs: [],
    bulkLogsAll: [],
    packLogsAll: []
  })
  const [selectedCell, setSelectedCell] = useState<{ dateStr: string; items: StreamItem[]; streamTitle: string } | null>(null)
  const [qcModalData, setQcModalData] = useState<{ items: StreamItem[]; stream: any; date: any } | null>(null)

  const supabase = createClient()

  // Base date (defaults to today or selected dashboardDate)
  const baseDate = useMemo(() => {
    return startDateStr ? parseISO(startDateStr) : new Date()
  }, [startDateStr])

  // 21-Day Horizon Array (Columns 1-6: Past 6 days, Column 7: Today [Index 6], Columns 8-21: Forward 14 days)
  const horizonDates = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const d = addDays(baseDate, i - 6)
      const isToday = i === 6
      const isPast = i < 6
      const isFuture = i > 6
      return {
        date: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        dayName: TH_DAYS[d.getDay()],
        dayNum: d.getDate(),
        monthName: TH_MONTHS[d.getMonth()],
        isToday,
        isPast,
        isFuture,
        dayOffset: i - 6
      }
    })
  }, [baseDate])

  const horizonStartStr = horizonDates[0]?.dateStr || ''
  const horizonEndStr = horizonDates[horizonDates.length - 1]?.dateStr || ''

  useEffect(() => {
    fetchRadarData()
    // Auto-sync data every 30 seconds for live production updates
    const interval = setInterval(() => {
      fetchRadarData(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [horizonStartStr, horizonEndStr])

  const fetchRadarData = async (silent = false) => {
    if (!horizonStartStr || !horizonEndStr) return
    if (!silent) setLoading(true)

    // Safety timeout: ensure loading state never gets stuck indefinitely
    const safetyTimeout = !silent ? setTimeout(() => {
      setLoading(false)
    }, 7000) : null

    try {
      const [
        { data: etaData },
        { data: logsData },
        { data: lotsData },
        { data: fgInvData },
        { data: qaLogsData },
        { data: allLogsData }
      ] = await Promise.all([
        // 1. ETA RM/PM within 21 days (or received within horizon)
        supabase.from('production_lot_rms')
          .select('id, rm_code, rm_name, po_no, eta_date, status, qc_status, quantity, unit, supplier, bottom_remark, receive_date, control_no, remark, received_qty')
          .or(`and(eta_date.gte.${horizonStartStr},eta_date.lte.${horizonEndStr}),and(receive_date.gte.${horizonStartStr},receive_date.lte.${horizonEndStr})`)
          .order('eta_date', { ascending: true }),

        // 2. Production Schedule (Weighing, Mixing, Packing, POF, QC) across 21 days
        supabase.from('production_logs')
          .select(`
            id, status, activity_date, end_date, tank_start, tank_end, piece_quantity, note,
            start_time, end_time, qc_status, sub_step, tank_details, total_tanks,
            processes (process_name),
            production_lots (
              id, lot_no, planned_quantity, order_quantity, total_tanks, current_status, qc_fg_passed_carton_ranges,
              products:sku_id (sku, product_name)
            )
          `)
          .or(`and(activity_date.lte.${horizonEndStr},end_date.gte.${horizonStartStr}),and(activity_date.lte.${horizonEndStr},activity_date.gte.${horizonStartStr}),and(activity_date.is.null,end_date.gte.${horizonStartStr},end_date.lte.${horizonEndStr})`)
          .order('activity_date', { ascending: true }),

        // 3. FG Due Date & Planned Deliveries (Active lots + Lots with due dates in horizon)
        supabase.from('production_lots')
          .select(`
            id, lot_no, fg_due_date, planned_start_date, planned_quantity, order_quantity, order_type, current_status, total_tanks, qc_fg_passed_carton_ranges,
            products:sku_id (sku, product_name)
          `)
          .or(`current_status.neq.DONE,and(fg_due_date.gte.${horizonStartStr},fg_due_date.lte.${horizonEndStr})`)
          .order('fg_due_date', { ascending: true }),

        // 4. FG Inventory (Quarantine & Released within horizon)
        supabase.from('fg_inventory')
          .select(`
            id, sku_id, lot_no, box_lot_no, available_qty_pcs, receive_qty_pcs, receive_qty_cartons, exp_date, qc_status, created_at, updated_at,
            products:sku_id (sku, product_name)
          `)
          .or(`and(created_at.gte.${horizonStartStr}T00:00:00,created_at.lte.${horizonEndStr}T23:59:59),qc_status.eq.QUARANTINE`)
          .order('created_at', { ascending: false }),

        // 5. QA Issues from logs (Hold, Reprocess, Reject, NC across RM, PM, Bulk, IPC, FG)
        supabase.from('production_logs')
          .select(`
            id, status, note, updated_at, activity_date, tank_start, tank_end,
            production_lots (id, lot_no, planned_quantity, products:sku_id (product_name, sku)),
            processes (process_name), rooms (room_name)
          `)
          .or('note.ilike.%[QC HOLD]%,note.ilike.%[QC REJECT]%,note.ilike.%[QC REPROCESS]%,note.ilike.%[แจ้งปัญหา]%,note.ilike.%[NC]%')
          .order('updated_at', { ascending: false }),

        // 6. Production logs for tracking Bulk Staging Stock & Packing consumption (Scoped to active lots)
        supabase.from('production_logs')
          .select(`
            id, status, qc_status, activity_date, end_date, tank_start, tank_end, tank_details, total_tanks,
            processes (process_name),
            production_lots!inner (id, lot_no, planned_quantity, total_tanks, current_status, products:sku_id (sku, product_name))
          `)
          .neq('production_lots.current_status', 'DONE')
          .order('activity_date', { ascending: true })
      ])

      const allProdLogs = (allLogsData as any[]) || []
      const bulkLogsAll = allProdLogs.filter((l: any) => {
        const pName = (l.processes?.process_name || '').toLowerCase()
        return pName.includes('ผสม') || pName.includes('qc') || pName.includes('bulk') || pName.includes('แช่')
      })
      const packLogsAll = allProdLogs.filter((l: any) => {
        const pName = (l.processes?.process_name || '').toLowerCase()
        return pName.includes('บรรจุ') || pName.includes('packing') || pName.includes('pof') || pName.includes('ลงลัง') || pName.includes('กล่อง') || pName.includes('รอบรรจุ')
      })

      setRadarData({
        etaList: etaData || [],
        logsList: logsData || [],
        fgDueLots: lotsData || [],
        fgInventoryList: fgInvData || [],
        qaIssuesLogs: qaLogsData || [],
        bulkLogsAll,
        packLogsAll
      })
    } catch (err) {
      console.error('Error fetching rolling radar data:', err)
    } finally {
      if (safetyTimeout) clearTimeout(safetyTimeout)
      if (!silent) setLoading(false)
    }
  }

  // Group items by date and stream
  const { dateStreamMap, summaryCounts } = useMemo(() => {
    const map: Record<string, {
      ETA: StreamItem[]
      WEIGHING: StreamItem[]
      MIXING: StreamItem[]
      QC: StreamItem[]
      QA: StreamItem[]
      BULK_STOCK: StreamItem[]
      PACKING: StreamItem[]
      POF: StreamItem[]
      FG_DUE: StreamItem[]
    }> = {}

    horizonDates.forEach(d => {
      map[d.dateStr] = {
        ETA: [],
        WEIGHING: [],
        MIXING: [],
        QC: [],
        QA: [],
        BULK_STOCK: [],
        PACKING: [],
        POF: [],
        FG_DUE: []
      }
    })

    let totalEta = 0
    let totalWeighing = 0
    let totalMixing = 0
    let totalMixingTanks = 0
    let totalQc = 0
    let totalPendingQa = 0
    let totalFirstBatch = 0
    let totalBulkStockTanks = 0
    let totalBulkStockLots = 0
    let totalPacking = 0
    let totalPof = 0
    let totalFgDue = 0

    const todayDateStr = horizonDates[6]?.dateStr || format(new Date(), 'yyyy-MM-dd')

    // 1. Process ETA RM/PM
    radarData.etaList.forEach(item => {
       const d = item.eta_date
       if (map[d]) {
         totalEta++
         const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
         const isRescheduled = dInfo.isDelayed || item.status === 'DELAYED'
         const opStatus = computeOperationalStatus(item, 'ETA', d, todayDateStr)

          const displayQty = item.received_qty != null ? item.received_qty : item.quantity;
          map[d].ETA.push({
            id: item.id,
            streamType: 'ETA',
            date: d,
            title: `${item.rm_code} (${Number(displayQty || 0).toLocaleString()} ${item.unit || ''})`,
            subtitle: item.rm_name || item.supplier || 'วัตถุดิบ/บรรจุภัณฑ์',
            tag: item.control_no ? `Ctrl: ${item.control_no}` : (item.po_no ? `PO: ${item.po_no}` : undefined),
            quantity: displayQty,
            status: item.status,
            meta: { ...item, delayInfo: dInfo, isDelayed: isRescheduled },
            opStatus
          })
       }
    })

    // 2. Process Production Logs (Multi-day date range support)
    radarData.logsList.forEach(log => {
      const pName = (log.processes?.process_name || '').toLowerCase()
      const lot = log.production_lots
      const sku = lot?.products?.sku || 'SKU'
      const pProductName = lot?.products?.product_name || ''
      const lotNo = lot?.lot_no || 'N/A'
      const startT = parseInt(log.tank_start) || 1
      const endT = parseInt(log.tank_end) || startT
      const tanksCount = Math.max(1, endT - startT + 1)

      const rawStart = log.activity_date || log.end_date
      const rawEnd = log.end_date || log.activity_date
      if (!rawStart && !rawEnd) return

      const effectiveStart = rawStart <= rawEnd ? rawStart : rawEnd
      const effectiveEnd = rawStart <= rawEnd ? rawEnd : rawStart
      const isMultiDay = effectiveStart !== effectiveEnd

      // Check if this task overlaps the 21-day horizon for summary counts (count each batch once)
      const overlapsHorizon = effectiveStart <= horizonEndStr && effectiveEnd >= horizonStartStr
      if (overlapsHorizon) {
        if (pName.includes('ชั่ง') || pName.includes('mm-rm')) {
          totalWeighing++
        } else if (pName.includes('ผสม') || pName.includes('mix')) {
          totalMixing++
          totalMixingTanks += tanksCount
          const fbCheck = checkIsFirstBatch(log, lot, pName)
          if (fbCheck.isFirstBatch) {
            totalFirstBatch++
          }
        } else if (pName.includes('pof') || pName.includes('ลงลัง') || pName.includes('อุโมงค์')) {
          totalPof++
        } else if (pName.includes('บรรจุ') || pName.includes('packing') || pName.includes('รอบรรจุ')) {
          totalPacking++
        }
      }

      // Populate every day in the horizon that falls within [effectiveStart, effectiveEnd]
      horizonDates.forEach(hd => {
        if (hd.dateStr >= effectiveStart && hd.dateStr <= effectiveEnd) {
          if (pName.includes('ชั่ง') || pName.includes('mm-rm')) {
            const opStatus = computeOperationalStatus(log, 'WEIGHING', hd.dateStr, todayDateStr)
            map[hd.dateStr].WEIGHING.push({
              id: `${log.id}-${hd.dateStr}`,
              streamType: 'WEIGHING',
              date: hd.dateStr,
              title: `${sku} • LOT ${lotNo}`,
              subtitle: pProductName || 'เตรียมและชั่งสารเคมี',
              tag: `ถัง ${startT}-${endT}`,
              lotNo,
              sku,
              lotId: lot?.id,
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay },
              opStatus
            })
          } else if (pName.includes('ผสม') || pName.includes('mix')) {
            const { isFirstBatch, firstBatchTank } = checkIsFirstBatch(log, lot, pName)
            const opStatus = computeOperationalStatus(log, 'MIXING', hd.dateStr, todayDateStr)
            map[hd.dateStr].MIXING.push({
              id: `${log.id}-${hd.dateStr}`,
              streamType: 'MIXING',
              date: hd.dateStr,
              title: `${sku} • LOT ${lotNo}`,
              subtitle: pProductName || 'ผสมเนื้อ Bulk',
              tag: isFirstBatch ? `${tanksCount} ถัง (${startT}-${endT}) • 🔬 1st Batch` : `${tanksCount} ถัง (${startT}-${endT})`,
              lotNo,
              sku,
              lotId: lot?.id,
              isFirstBatch,
              firstBatchTank,
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay, isFirstBatch, firstBatchTank },
              opStatus
            })

            // Also surface in QA stream as an on-site 1st Batch evaluation appointment
            if (isFirstBatch) {
              const qaOpStatus = computeOperationalStatus(
                { ...log, isFirstBatch: true, firstBatchTank },
                'QA',
                hd.dateStr,
                todayDateStr
              )
              map[hd.dateStr].QA.push({
                id: `qa-1st-batch-${log.id}-${hd.dateStr}`,
                streamType: 'QA',
                qcSubtype: 'BULK',
                date: hd.dateStr,
                title: `${sku} • LOT ${lotNo}`,
                subtitle: pProductName ? `${pProductName} • [ร่วมประเมิน 1st Batch หน้างาน]` : 'ร่วมประเมินกระบวนการผลิต 1st Batch กับ MX',
                tag: `🔬 1st Batch (ถัง ${firstBatchTank})`,
                lotNo,
                sku,
                lotId: lot?.id,
                isFirstBatch: true,
                firstBatchTank,
                meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay, isFirstBatch: true, firstBatchTank, processName: 'ผสม Bulk' },
                opStatus: qaOpStatus
              })
            }
          } else if (pName.includes('pof') || pName.includes('ลงลัง') || pName.includes('อุโมงค์')) {
            const rawProcName = log.processes?.process_name || 'ลงลัง/POF'
            const opStatus = computeOperationalStatus(log, 'POF', hd.dateStr, todayDateStr)
            map[hd.dateStr].POF.push({
              id: `${log.id}-${hd.dateStr}`,
              streamType: 'POF',
              date: hd.dateStr,
              title: `${sku} • LOT ${lotNo}`,
              subtitle: pProductName ? `${pProductName} • [${rawProcName}]` : rawProcName,
              tag: log.piece_quantity ? `${Number(log.piece_quantity).toLocaleString()} ชิ้น` : `ถัง ${startT}-${endT}`,
              lotNo,
              sku,
              lotId: lot?.id,
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay, rawProcName },
              opStatus
            })
          } else if (pName.includes('บรรจุ') || pName.includes('packing') || pName.includes('รอบรรจุ')) {
            const rawProcName = log.processes?.process_name || 'บรรจุ'
            const opStatus = computeOperationalStatus(log, 'PACKING', hd.dateStr, todayDateStr)
            map[hd.dateStr].PACKING.push({
              id: `${log.id}-${hd.dateStr}`,
              streamType: 'PACKING',
              date: hd.dateStr,
              title: `${sku} • LOT ${lotNo}`,
              subtitle: pProductName ? `${pProductName} • [${rawProcName}]` : rawProcName,
              tag: log.piece_quantity ? `${Number(log.piece_quantity).toLocaleString()} ชิ้น` : `ถัง ${startT}-${endT}`,
              lotNo,
              sku,
              lotId: lot?.id,
              meta: { ...log, startDate: effectiveStart, endDate: effectiveEnd, isMultiDay, rawProcName },
              opStatus
            })
          }
        }
      })
    })

    // 3. Process Bulk Staging Stock (Tanks that passed QC and are not yet packed)
    const packedTankMap: Record<string, Set<number>> = {}
    ;(radarData.packLogsAll || []).forEach(l => {
      const lotId = l.production_lots?.id
      if (!lotId) return
      if (!packedTankMap[lotId]) packedTankMap[lotId] = new Set()

      if (l.tank_details && typeof l.tank_details === 'object') {
        Object.entries(l.tank_details).forEach(([t, s]) => {
          if (t.includes('history') || t === 'delivery_info') return
          const status = typeof s === 'string' ? s : (s as any)?.status
          if (status === 'DONE' || status === 'SENT_TO_POF' || status === 'COMPLETED' || status === 'IN_PROGRESS') {
            packedTankMap[lotId].add(parseInt(t))
          }
        })
      }
      const sT = parseInt(l.tank_start)
      const eT = parseInt(l.tank_end)
      if (sT && eT && (l.status === 'DONE' || l.status === 'IN_PROGRESS')) {
        for (let i = sT; i <= eT; i++) {
          packedTankMap[lotId].add(i)
        }
      }
    })

    const bulkPassedMap: Record<string, {
      lotNo: string
      sku: string
      productName: string
      lotId: string
      plannedQty: number
      totalTanks: number
      tanks: Record<number, { date: string; logId: string }>
    }> = {}

    ;(radarData.bulkLogsAll || []).forEach(l => {
      const lot = l.production_lots
      const lotId = lot?.id
      if (!lotId) return
      if (lot?.current_status === 'DONE') return // Skip lots that are already finished

      if (!bulkPassedMap[lotId]) {
        bulkPassedMap[lotId] = {
          lotNo: lot?.lot_no || 'N/A',
          sku: lot?.products?.sku || 'SKU',
          productName: lot?.products?.product_name || '',
          lotId,
          plannedQty: lot?.planned_quantity || 0,
          totalTanks: lot?.total_tanks || 1,
          tanks: {}
        }
      }

      const logDate = l.activity_date || l.end_date || todayDateStr

      if (l.tank_details && typeof l.tank_details === 'object') {
        Object.entries(l.tank_details).forEach(([t, s]) => {
          if (t.includes('history') || t === 'delivery_info') return
          const status = typeof s === 'string' ? s : (s as any)?.status
          if (status === 'QC_PASS' || status === 'PASSED' || status === 'SENT_TO_PACKING' || status === 'COMPLETED') {
            bulkPassedMap[lotId].tanks[parseInt(t)] = { date: logDate, logId: l.id }
          }
        })
      }
      if (l.qc_status === 'PASSED' || l.qc_status === 'QC_PASS' || l.status === 'DONE') {
        const sT = parseInt(l.tank_start) || 1
        const eT = parseInt(l.tank_end) || sT
        for (let i = sT; i <= eT; i++) {
          if (!bulkPassedMap[lotId].tanks[i]) {
            bulkPassedMap[lotId].tanks[i] = { date: logDate, logId: l.id }
          }
        }
      }
    })

    const seenBulkStockLots = new Set<string>()
    Object.values(bulkPassedMap).forEach(bLot => {
      const packed = packedTankMap[bLot.lotId] || new Set<number>()
      const unconsumedTanks = Object.keys(bLot.tanks)
        .map(Number)
        .filter(t => !packed.has(t))
        .sort((a, b) => a - b)

      if (unconsumedTanks.length === 0) return

      totalBulkStockTanks += unconsumedTanks.length
      if (!seenBulkStockLots.has(bLot.lotId)) {
        seenBulkStockLots.add(bLot.lotId)
        totalBulkStockLots++
      }

      const kgPerTank = bLot.plannedQty && bLot.totalTanks 
        ? Math.round(bLot.plannedQty / bLot.totalTanks) 
        : 50
      const totalKg = kgPerTank * unconsumedTanks.length

      // Group tanks by QC pass date
      const tanksByDate: Record<string, number[]> = {}
      unconsumedTanks.forEach(t => {
        const passDate = bLot.tanks[t]?.date || todayDateStr
        if (!tanksByDate[passDate]) tanksByDate[passDate] = []
        tanksByDate[passDate].push(t)
      })

      let addedToToday = false
      Object.entries(tanksByDate).forEach(([pDate, tList]) => {
        const targetDate = map[pDate] ? pDate : todayDateStr
        const tCount = tList.length
        const tWeight = kgPerTank * tCount
        const rangeStr = formatTankRanges(tList)

        if (map[targetDate]) {
          map[targetDate].BULK_STOCK.push({
            id: `bulk-stock-${bLot.lotId}-${targetDate}`,
            streamType: 'BULK_STOCK',
            date: targetDate,
            title: `${bLot.sku} • LOT ${bLot.lotNo}`,
            subtitle: `${bLot.productName || 'เนื้อผสม Bulk ผ่าน QC'} (ถัง ${rangeStr})`,
            tag: `${tCount} ถัง (${tWeight.toLocaleString()} kg)`,
            quantity: tWeight,
            lotNo: bLot.lotNo,
            sku: bLot.sku,
            lotId: bLot.lotId,
            bulkStock: {
              lotNo: bLot.lotNo,
              sku: bLot.sku,
              productName: bLot.productName,
              tanks: tList,
              kgPerTank,
              totalKg: tWeight,
              isConsumed: false,
              qcPassedDate: pDate
            },
            meta: {
              bulkDetails: `เนื้อ Bulk ผ่าน QC พร้อมให้ฝ่ายบรรจุ (PK) เบิกเดินเครื่อง รวม ${tCount} ถัง [${rangeStr}] ปริมาณ ${tWeight.toLocaleString()} kg`
            },
            opStatus: {
              badge: '🛢️ สต็อก Bulk พร้อมบรรจุ',
              shortBadge: 'พร้อมบรรจุ',
              type: 'qc_passed',
              color: 'bg-cyan-50 text-cyan-800 border-cyan-300/80',
              dotColor: 'bg-cyan-500',
              detailsText: `เนื้อ Bulk ผ่าน QC พร้อมให้ฝ่ายบรรจุ (PK) เบิกเดินเครื่อง รวม ${tCount} ถัง [${rangeStr}] ปริมาณ ${tWeight.toLocaleString()} kg`
            }
          })
          if (targetDate === todayDateStr) addedToToday = true
        }
      })

      // If tanks passed QC prior to today and are still unconsumed, also show in Today so operators see ready stock
      if (!addedToToday && map[todayDateStr]) {
        const rangeStr = formatTankRanges(unconsumedTanks)
        map[todayDateStr].BULK_STOCK.push({
          id: `bulk-stock-${bLot.lotId}-today`,
          streamType: 'BULK_STOCK',
          date: todayDateStr,
          title: `${bLot.sku} • LOT ${bLot.lotNo}`,
          subtitle: `${bLot.productName || 'เนื้อผสม Bulk ในคลัง'} (พร้อมบรรจุ ${unconsumedTanks.length} ถัง)`,
          tag: `พร้อมเบิก ${unconsumedTanks.length} ถัง (${totalKg.toLocaleString()} kg)`,
          quantity: totalKg,
          lotNo: bLot.lotNo,
          sku: bLot.sku,
          lotId: bLot.lotId,
          bulkStock: {
            lotNo: bLot.lotNo,
            sku: bLot.sku,
            productName: bLot.productName,
            tanks: unconsumedTanks,
            kgPerTank,
            totalKg,
            isConsumed: false,
            qcPassedDate: todayDateStr
          },
          meta: {
            bulkDetails: `สต็อก Bulk พร้อมเบิกบรรจุวันนี้: ${unconsumedTanks.length} ถัง [${rangeStr}] รวม ${totalKg.toLocaleString()} kg`
          },
          opStatus: {
            badge: '🛢️ พร้อมเบิกบรรจุวันนี้',
            shortBadge: 'พร้อมเบิก',
            type: 'qc_passed',
            color: 'bg-cyan-100 text-cyan-950 border-cyan-400 font-bold',
            dotColor: 'bg-cyan-600',
            detailsText: `สต็อก Bulk ในคลังพร้อมให้ไลน์บรรจุเบิกเดินเครื่อง รวม ${unconsumedTanks.length} ถัง [${rangeStr}] (${totalKg.toLocaleString()} kg)`
          }
        })
      }
    })

    // 4. Process FG Due & MTS Daily Delivery Ranges
    radarData.fgDueLots.forEach(lot => {
      const sku = lot.products?.sku || 'SKU'
      const qty = lot.planned_quantity || lot.order_quantity || 0
      const isMTS = lot.order_type === 'MTS'
      const startStr = lot.planned_start_date || lot.fg_due_date
      const endStr = lot.fg_due_date || lot.planned_start_date

      if (isMTS && (startStr || endStr)) {
        // MTS Range: Delivery occurs on every day within [startStr, endStr]
        const effectiveStart = startStr || endStr
        const effectiveEnd = endStr || startStr

        horizonDates.forEach(hd => {
          if (hd.dateStr >= effectiveStart && hd.dateStr <= effectiveEnd) {
            totalFgDue++
            const opStatus = computeOperationalStatus(lot, 'FG_DUE', hd.dateStr, todayDateStr)
            map[hd.dateStr].FG_DUE.push({
              id: `${lot.id}-${hd.dateStr}`,
              streamType: 'FG_DUE',
              date: hd.dateStr,
              title: `${sku} • LOT ${lot.lot_no}`,
              subtitle: lot.products?.product_name || 'ส่งมอบ FG ประจำวัน (MTS Rolling)',
              tag: `MTS (${Number(qty).toLocaleString()} ชิ้น)`,
              quantity: qty,
              lotNo: lot.lot_no,
              sku,
              lotId: lot.id,
              meta: { ...lot, isMtsRange: true },
              opStatus
            })
          }
        })
      } else if (lot.fg_due_date && map[lot.fg_due_date]) {
        // MTO / Single Due Date
        totalFgDue++
        const opStatus = computeOperationalStatus(lot, 'FG_DUE', lot.fg_due_date, todayDateStr)
        map[lot.fg_due_date].FG_DUE.push({
          id: lot.id,
          streamType: 'FG_DUE',
          date: lot.fg_due_date,
          title: `${sku} • LOT ${lot.lot_no}`,
          subtitle: lot.products?.product_name || 'กำหนดส่งมอบ FG ปิดออเดอร์',
          tag: `${Number(qty).toLocaleString()} ชิ้น`,
          quantity: qty,
          lotNo: lot.lot_no,
          sku,
          lotId: lot.id,
          meta: lot,
          opStatus
        })
      }
    })

    // 5. Process QC Stream (RM, PM, Bulk, FG)
    const isMaterialPM = (code?: string) => {
      if (!code) return false
      const c = code.trim().toLowerCase()
      return c.startsWith('cmd1') || c.startsWith('cmd2') || c.startsWith('p')
    }

    // A. RM and PM Inbound Quality Checks (Only items that have been received or sent to QC)
    radarData.etaList.forEach(item => {
      const isReceived = item.status === 'RECEIVED' || !!item.receive_date
      const hasExplicitQc = !!item.qc_status && item.qc_status !== 'NONE'

      if (!isReceived && !hasExplicitQc) return

      const isPM = isMaterialPM(item.rm_code)
      const targetDate = item.receive_date || (item.created_at ? item.created_at.split('T')[0] : item.eta_date)
      if (!targetDate || !map[targetDate]) return

      const rawQcStatus = item.qc_status || (item.status === 'RECEIVED' ? 'WAITING' : item.status === 'READY' ? 'PASSED' : item.status)
      const opStatus = computeOperationalStatus(
        { ...item, qcSubtype: isPM ? 'PM' : 'RM', qc_status: rawQcStatus },
        'QC',
        targetDate,
        todayDateStr
      )

      const displayQty = item.received_qty != null ? item.received_qty : item.quantity;
      map[targetDate].QC.push({
        id: `qc-rmpm-${item.id}`,
        streamType: 'QC',
        qcSubtype: isPM ? 'PM' : 'RM',
        date: targetDate,
        title: `${item.rm_code} (${Number(displayQty || 0).toLocaleString()} ${item.unit || ''})`,
        subtitle: item.rm_name || (isPM ? 'บรรจุภัณฑ์' : 'วัตถุดิบ'),
        tag: item.control_no ? `Ctrl: ${item.control_no}` : (item.po_no ? `PO: ${item.po_no}` : (isPM ? 'PM' : 'RM')),
        quantity: displayQty,
        status: rawQcStatus,
        meta: item,
        opStatus
      })
    })

    // B. Bulk Quality Checks (Logs with "รอ QC" or mixing tank checks with actual QC activity)
    radarData.logsList.forEach(log => {
      const pName = (log.processes?.process_name || '').toLowerCase()
      const isQcProc = pName === 'รอ qc' || pName.includes('รอ qc') || pName.includes('qc bulk')

      let hasTankQcActivity = false
      if (log.tank_details && typeof log.tank_details === 'object') {
        const vals = Object.values(log.tank_details)
        hasTankQcActivity = vals.some((v: any) => {
          const s = typeof v === 'string' ? v : v?.status
          return s === 'QC_PASS' || s === 'HOLD' || s === 'PAUSED' || s === 'REPROCESS' || s === 'SENT_TO_QC'
        })
      }
      const isMixingWithQc = (pName.includes('ผสม') || pName.includes('mix')) && (log.qc_status || hasTankQcActivity)

      if (isQcProc || isMixingWithQc) {
        const lot = log.production_lots
        const sku = lot?.products?.sku || 'SKU'
        const pProductName = lot?.products?.product_name || ''
        const lotNo = lot?.lot_no || 'N/A'
        const startT = parseInt(log.tank_start) || 1
        const endT = parseInt(log.tank_end) || startT
        const tanksCount = Math.max(1, endT - startT + 1)

        const targetDate = log.activity_date || log.end_date || todayDateStr
        if (!map[targetDate]) return

        let bulkStatus = log.qc_status || (isQcProc ? 'WAITING' : 'IN_PROGRESS')
        if (log.tank_details && typeof log.tank_details === 'object') {
          const vals = Object.values(log.tank_details)
          if (vals.some((v: any) => v === 'HOLD' || v === 'PAUSED' || v === 'REPROCESS' || v?.status === 'HOLD' || v?.status === 'PAUSED')) {
            bulkStatus = 'HOLD'
          } else if (vals.length > 0 && vals.every((v: any) => v === 'QC_PASS' || v?.status === 'QC_PASS' || v === 'DONE' || v?.status === 'DONE')) {
            bulkStatus = 'PASSED'
          }
        }

        const opStatus = computeOperationalStatus(
          { ...log, qcSubtype: 'BULK', qc_status: bulkStatus },
          'QC',
          targetDate,
          todayDateStr
        )

        map[targetDate].QC.push({
          id: `qc-bulk-${log.id}`,
          streamType: 'QC',
          qcSubtype: 'BULK',
          date: targetDate,
          title: `${sku} • LOT ${lotNo}`,
          subtitle: pProductName || 'ตรวจคุณภาพเนื้อผสม Bulk (pH, Viscosity, Micro)',
          tag: `${tanksCount} ถัง (${startT}-${endT})`,
          lotNo,
          sku,
          lotId: lot?.id,
          status: bulkStatus,
          meta: log,
          opStatus
        })
      }
    })

    // C. FG Quality Checks (Quarantine & Released Goods)
    radarData.fgInventoryList.forEach(fg => {
      const createdDateStr = fg.created_at ? fg.created_at.split('T')[0] : ''
      const targetDate = map[createdDateStr] ? createdDateStr : (fg.qc_status === 'QUARANTINE' ? todayDateStr : createdDateStr)
      if (!targetDate || !map[targetDate]) return

      const sku = fg.products?.sku || 'SKU'
      const lotNo = fg.lot_no || 'N/A'
      const qtyPcs = fg.receive_qty_pcs || fg.available_qty_pcs || 0
      const ctn = fg.receive_qty_cartons || 0

      const opStatus = computeOperationalStatus(
        { ...fg, qcSubtype: 'FG', qc_status: fg.qc_status },
        'QC',
        targetDate,
        todayDateStr
      )

      map[targetDate].QC.push({
        id: `qc-fg-${fg.id}`,
        streamType: 'QC',
        qcSubtype: 'FG',
        date: targetDate,
        title: `${sku} • LOT ${lotNo}`,
        subtitle: fg.products?.product_name || 'ตรวจปล่อยสินค้าสำเร็จรูป (FG Release)',
        tag: qtyPcs ? `${Number(qtyPcs).toLocaleString()} ชิ้น${ctn ? ` (${ctn} ลัง)` : ''}` : 'FG',
        lotNo,
        sku,
        quantity: qtyPcs,
        status: fg.qc_status || 'QUARANTINE',
        meta: fg,
        opStatus
      })
    })

    // D. QA Issues from Production Logs (Hold, Reprocess, Reject, NC across RM, PM, Bulk, IPC, FG)
    ;(radarData.qaIssuesLogs || []).forEach(log => {
      if (!log.note) return
      const lines = log.note.split('\n').filter((l: string) => l.trim())
      const pName = (log.processes?.process_name || '').toLowerCase()
      const lot = log.production_lots
      const sku = lot?.products?.sku || 'SKU'
      const lotNo = lot?.lot_no || 'N/A'
      const targetDate = log.activity_date || (log.updated_at ? log.updated_at.split('T')[0] : todayDateStr)

      lines.forEach((line: string, lineIdx: number) => {
        const isQaIncident = line.includes('[QC ') || line.includes('[แจ้งปัญหา]') || line.includes('[NC]')
        if (!isQaIncident) return

        const isResolved = line.includes('[Resolved') || line.includes('> [QA Approved]') || line.includes('รับทราบ')
        
        let scope: 'RM' | 'PM' | 'BULK' | 'IPC' | 'FG' = 'BULK'
        if (line.includes(' PM [') || line.includes(' PM:') || line.includes(' PM ') || line.includes('CMD1')) {
          scope = 'PM'
        } else if (line.includes(' RM [') || line.includes(' RM:') || line.includes(' RM ') || line.includes('RM/PM')) {
          scope = 'RM'
        } else if (line.includes('IPC') || pName.includes('ชั่ง') || pName.includes('mm-rm')) {
          scope = 'IPC'
        } else if (line.includes(' FG ') || line.includes(' FG(') || line.includes('FG:') || pName.includes('บรรจุ') || pName.includes('ลัง')) {
          scope = 'FG'
        } else if (line.includes('ถัง') || pName.includes('ผสม') || pName.includes('qc') || line.includes('Bulk') || line.includes('เนื้อ')) {
          scope = 'BULK'
        }

        let issueType: 'HOLD' | 'REPROCESS' | 'REJECT' | 'NC' | 'DEFECT' = 'DEFECT'
        if (line.includes('[QC HOLD]')) issueType = 'HOLD'
        else if (line.includes('[QC REPROCESS]')) issueType = 'REPROCESS'
        else if (line.includes('[QC REJECT]')) issueType = 'REJECT'
        else if (line.includes('[NC]')) issueType = 'NC'

        if (!isResolved) {
          totalPendingQa++
        }

        const qaIssue: QaIssueInfo = {
          id: `${log.id}-${lineIdx}`,
          reportedAt: log.updated_at || log.activity_date,
          scope,
          issueType,
          title: `${issueType} (${scope}): ${sku} • LOT ${lotNo}`,
          rawNote: line,
          isResolved,
          sku,
          lotNo,
          resolvedNote: isResolved ? line : undefined
        }

        const opStatus = computeOperationalStatus(
          { ...log, qaIssue, qcSubtype: scope },
          'QA',
          targetDate,
          todayDateStr
        )

        const item: StreamItem = {
          id: `qa-${log.id}-${lineIdx}`,
          streamType: 'QA',
          qcSubtype: scope,
          date: targetDate,
          title: `${sku} • LOT ${lotNo}`,
          subtitle: cleanDisplayNote(line),
          tag: isResolved ? `✓ QA แก้ไขแล้ว` : `⚠️ รอ QA (${issueType})`,
          lotNo,
          sku,
          lotId: lot?.id,
          meta: { ...log, roomName: log.rooms?.room_name, processName: log.processes?.process_name },
          opStatus,
          qaIssue
        }

        if (map[targetDate]) {
          map[targetDate].QA.unshift(item)
        }

        // If not resolved and targetDate < todayDateStr, also surface in today's cell so QA can immediately see pending incidents
        if (!isResolved && targetDate < todayDateStr && map[todayDateStr]) {
          map[todayDateStr].QA.unshift({
            ...item,
            id: `qa-${log.id}-${lineIdx}-today`,
            date: todayDateStr,
            tag: `⚠️ รอ QA ตกค้าง (${issueType})`
          })
        }
      })
    })

    Object.values(map).forEach(day => {
      totalQc += day.QC.length
    })

    return {
      dateStreamMap: map,
      summaryCounts: {
        totalEta,
        totalWeighing,
        totalMixing,
        totalMixingTanks,
        totalQc,
        totalPendingQa,
        totalFirstBatch,
        totalBulkStockTanks,
        totalBulkStockLots,
        totalPacking,
        totalPof,
        totalFgDue
      }
    }
  }, [horizonDates, radarData])

  const streamsConfig = [
    {
      key: 'ETA' as const,
      label: '1. คลัง RM/PM (รับเข้าจริง & แผน ETA)',
      shortLabel: 'คลัง RM/PM',
      icon: Truck,
      color: 'text-amber-700',
      bgColor: 'bg-amber-500/10',
      badgeBorder: 'border-amber-300',
      pillColor: 'bg-amber-100/90 text-amber-900 border-amber-300/80 hover:bg-amber-200'
    },
    {
      key: 'WEIGHING' as const,
      label: '2. ชั่งสาร (MM-RM)',
      shortLabel: 'เตรียม/ชั่งสาร',
      icon: Scale,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-500/10',
      badgeBorder: 'border-indigo-300',
      pillColor: 'bg-indigo-100/90 text-indigo-900 border-indigo-300/80 hover:bg-indigo-200'
    },
    {
      key: 'MIXING' as const,
      label: '3. งานผสม (Bulk Mixing)',
      shortLabel: 'งานผสม Bulk',
      icon: Beaker,
      color: 'text-blue-700',
      bgColor: 'bg-blue-500/10',
      badgeBorder: 'border-blue-300',
      pillColor: 'bg-blue-100/90 text-blue-900 border-blue-300/80 hover:bg-blue-200'
    },
    {
      key: 'QC' as const,
      label: '4. ตรวจสอบคุณภาพ QC (QC Testing Lab)',
      shortLabel: 'ตรวจ QC',
      icon: ShieldCheck,
      color: 'text-purple-700',
      bgColor: 'bg-purple-500/10',
      badgeBorder: 'border-purple-300',
      pillColor: 'bg-purple-100/90 text-purple-900 border-purple-300/80 hover:bg-purple-200'
    },
    {
      key: 'QA' as const,
      label: '5. ประกันคุณภาพ QA (QA Assurance & Gate)',
      shortLabel: 'ประกัน QA',
      icon: AlertTriangle,
      color: 'text-rose-700',
      bgColor: 'bg-rose-500/10',
      badgeBorder: 'border-rose-300',
      pillColor: 'bg-rose-100/90 text-rose-950 border-rose-400/90 hover:bg-rose-200 font-bold'
    },
    {
      key: 'BULK_STOCK' as const,
      label: '6. คลัง Bulk (Bulk Stock)',
      shortLabel: 'คลัง Bulk',
      icon: Boxes,
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-500/10',
      badgeBorder: 'border-cyan-300',
      pillColor: 'bg-cyan-100/90 text-cyan-950 border-cyan-300/80 hover:bg-cyan-200'
    },
    {
      key: 'PACKING' as const,
      label: '7. งานบรรจุ (Primary Packing)',
      shortLabel: 'บรรจุ/แพ็คกิ้ง',
      icon: Package,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-300',
      pillColor: 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80 hover:bg-emerald-200'
    },
    {
      key: 'POF' as const,
      label: '8. งานลงลัง / POF (Secondary)',
      shortLabel: 'ลงลัง/POF',
      icon: PackageOpen,
      color: 'text-teal-700',
      bgColor: 'bg-teal-500/10',
      badgeBorder: 'border-teal-300',
      pillColor: 'bg-teal-100/90 text-teal-900 border-teal-300/80 hover:bg-teal-200'
    },
    {
      key: 'FG_DUE' as const,
      label: '9. คลัง FG & กำหนดส่งมอบ (Due FG)',
      shortLabel: 'คลัง FG & ส่งมอบ',
      icon: Gift,
      color: 'text-pink-700',
      bgColor: 'bg-pink-500/10',
      badgeBorder: 'border-pink-300',
      pillColor: 'bg-pink-100/90 text-pink-900 border-pink-300/80 hover:bg-pink-200'
    }
  ]

  const isAllStreams = selectedStreams.length === 0 || selectedStreams.length === streamsConfig.length

  const activeStreams = isAllStreams 
    ? streamsConfig 
    : streamsConfig.filter(s => selectedStreams.includes(s.key))

  const handleToggleStream = (key: 'ALL' | 'ETA' | 'WEIGHING' | 'MIXING' | 'QC' | 'QA' | 'BULK_STOCK' | 'PACKING' | 'POF' | 'FG_DUE') => {
    if (key === 'ALL') {
      setSelectedStreams([])
      return
    }
    // If currently showing ALL streams, clicking a stream isolates/focuses on this single stream
    if (isAllStreams) {
      setSelectedStreams([key])
      return
    }
    // If already selected, unselect it
    if (selectedStreams.includes(key)) {
      const next = selectedStreams.filter(k => k !== key)
      setSelectedStreams(next.length === 0 ? [] : next)
    } else {
      // Add to current selection (multi-select)
      const next = [...selectedStreams, key]
      setSelectedStreams(next.length === streamsConfig.length ? [] : next)
    }
  }

  return (
    <div className="space-y-6">
      <Card className={`border-[#D4AF37]/35 shadow-2xl rounded-2xl overflow-hidden relative transition-colors duration-300 ${
        isNight ? 'bg-[#0B132B] text-slate-100' : 'bg-white text-[#4A4238]'
      }`}>
      {/* Decorative Gold Accent Bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37]"></div>

      {/* Radar Master Header */}
      <CardHeader className={`border-b border-[#D4AF37]/25 p-5 md:p-6 transition-colors duration-300 ${
        isNight ? 'bg-[#0F172A]' : 'bg-gradient-to-b from-[#FAF8F5] to-white'
      }`}>
        {/* Tier 1: Radar Title, Date Horizon & Theme Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/30 text-[#8B7355] shadow-xs shrink-0">
              <Compass className="w-6 h-6 text-[#D4AF37] animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`text-xl md:text-2xl font-black tracking-tight ${isNight ? 'text-white' : 'text-[#4A4238]'}`}>
                  21-Day Rolling Master Radar
                </h2>
                <span className="text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                  เรดาร์แผนงาน 3 สัปดาห์ (ย้อนหลัง 7 วัน + ล่วงหน้า 14 วัน)
                </span>
              </div>
              <div className={`text-xs font-medium flex flex-wrap items-center gap-2 mt-1 ${isNight ? 'text-slate-300' : 'text-[#8B7355]'}`}>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
                  <span>
                    หน้าต่างแผนงาน: <strong className={isNight ? 'text-amber-300' : 'text-[#4A4238]'}>{horizonDates[0]?.dayNum} {horizonDates[0]?.monthName}</strong> ➔ <strong className={isNight ? 'text-amber-300' : 'text-[#4A4238]'}>{horizonDates[20]?.dayNum} {horizonDates[20]?.monthName} 2026</strong>
                  </span>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ซิงค์อัตโนมัติทุกวัน (Auto Rolling)
                </span>
              </div>
            </div>
          </div>

          {/* Change Theme Button (21-Day Radar) */}
          {handleToggleRadar && (
            <button
              type="button"
              onClick={handleToggleRadar}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition active:scale-95 border cursor-pointer select-none shrink-0 ${
                isNight
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700 hover:text-amber-200 shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900 shadow-xs'
              }`}
              title={isNight ? 'เปลี่ยนเป็นโหมดสว่าง (21-Day Radar)' : 'เปลี่ยนเป็นโหมดมืด (21-Day Radar)'}
            >
              {isNight ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>โหมดสว่าง (Light)</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>โหมดมืด (Night)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Tier 2: Dedicated Control Toolbar (View Mode Switcher + Stream Filter Pills) */}
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-4 pt-3.5 border-t ${
          isNight ? 'border-slate-800/80' : 'border-[#D4AF37]/20'
        }`}>
          {/* View Mode Buttons */}
          <div className={`flex items-center p-1 rounded-xl border shadow-inner shrink-0 ${
            isNight ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-100/90 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timeline'
                  ? (isNight ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700' : 'bg-white text-[#4A4238] shadow-sm border border-slate-200')
                  : (isNight ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-[#4A4238]')
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Timeline Horizon</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'daily'
                  ? (isNight ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700' : 'bg-white text-[#4A4238] shadow-sm border border-slate-200')
                  : (isNight ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-[#4A4238]')
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Daily Worklist</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('logistics')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'logistics'
                  ? (isNight ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700' : 'bg-white text-[#4A4238] shadow-sm border border-slate-200')
                  : (isNight ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-[#4A4238]')
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>ETA Logistics</span>
            </button>
          </div>

          {/* Stream Filter Pills (Multi-Select Support) */}
          <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border text-xs ${
            isNight ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] font-bold px-1.5 flex items-center gap-1.5 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>สายงาน:</span>
              {!isAllStreams && (
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-[#D4AF37] text-slate-950 shadow-2xs">
                  {selectedStreams.length}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => handleToggleStream('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                isAllStreams
                  ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs'
                  : (isNight ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
              }`}
              title="แสดงทุกสายงาน"
            >
              ทั้งหมด
            </button>
            {(
              [
                { key: 'ETA' as const, label: 'คลัง RM/PM' },
                { key: 'WEIGHING' as const, label: 'ชั่ง' },
                { key: 'MIXING' as const, label: 'ผสม' },
                { key: 'QC' as const, label: 'ตรวจ QC' },
                { key: 'QA' as const, label: 'ประกัน QA' },
                { key: 'BULK_STOCK' as const, label: 'คลัง Bulk' },
                { key: 'PACKING' as const, label: 'บรรจุ' },
                { key: 'POF' as const, label: 'ลงลัง/POF' },
                { key: 'FG_DUE' as const, label: 'คลัง FG' },
              ]
            ).map(({ key, label }) => {
              const isSelected = !isAllStreams && selectedStreams.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggleStream(key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#D4AF37] text-slate-950 font-bold shadow-xs ring-1 ring-[#B89628]'
                      : (isNight ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
                  }`}
                  title={isSelected ? `คลิกเพื่อยกเลิกการเลือก ${label}` : `คลิกเพื่อเพิ่ม/เลือก ${label}`}
                >
                  {isSelected && <span className="font-black text-[10px]">✓</span>}
                  <span>{label}</span>
                </button>
              )
            })}
            {!isAllStreams && (
              <button
                type="button"
                onClick={() => handleToggleStream('ALL')}
                className="ml-1 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded transition cursor-pointer"
                title="ล้างตัวเลือกทั้งหมดกลับเป็นแสดงทุกสายงาน"
              >
                ✕ ล้างตัวเลือก
              </button>
            )}
          </div>
        </div>

        {/* 21-Day Executive Summary Chips (9 Streams) */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2 sm:gap-2.5 mt-4 pt-4 border-t ${
          isNight ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Truck className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-amber-300' : 'text-amber-700'}`}>คลัง RM/PM (21 วัน)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-amber-100' : 'text-amber-900'}`}>{loading ? '...' : `${summaryCounts.totalEta} รายการ`}</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200' : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-indigo-300' : 'text-indigo-700'}`}>เตรียม/ชั่งสาร (21 วัน)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-indigo-100' : 'text-indigo-900'}`}>{loading ? '...' : `${summaryCounts.totalWeighing} รอบงาน`}</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-blue-950/40 border-blue-800/60 text-blue-200' : 'bg-blue-50/70 border-blue-200/80 text-blue-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Beaker className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-blue-300' : 'text-blue-700'}`}>งานผสม Bulk (21 วัน)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-blue-100' : 'text-blue-900'}`}>{loading ? '...' : `${summaryCounts.totalMixingTanks} ถัง (${summaryCounts.totalMixing} รอบ)`}</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-purple-950/40 border-purple-800/60 text-purple-200' : 'bg-purple-50/70 border-purple-200/80 text-purple-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-purple-300' : 'text-purple-700'}`}>ตรวจ QC (21 วัน)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-purple-100' : 'text-purple-900'}`}>{loading ? '...' : `${summaryCounts.totalQc} รายการ`}</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight 
              ? (summaryCounts.totalPendingQa > 0 
                  ? 'bg-rose-950/50 border-rose-700/80 text-rose-200' 
                  : summaryCounts.totalFirstBatch > 0
                  ? 'bg-purple-950/50 border-purple-700/80 text-purple-200'
                  : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200')
              : (summaryCounts.totalPendingQa > 0 
                  ? 'bg-rose-50/80 border-rose-300/90 text-rose-950' 
                  : summaryCounts.totalFirstBatch > 0
                  ? 'bg-purple-50/80 border-purple-300/90 text-purple-950'
                  : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900')
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${
                summaryCounts.totalPendingQa > 0 
                  ? 'text-rose-500 animate-bounce' 
                  : summaryCounts.totalFirstBatch > 0
                  ? 'text-purple-600'
                  : 'text-emerald-500'
              }`} />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate flex items-center gap-1 ${
                  summaryCounts.totalPendingQa > 0 
                    ? (isNight ? 'text-rose-300' : 'text-rose-700') 
                    : summaryCounts.totalFirstBatch > 0
                    ? (isNight ? 'text-purple-300' : 'text-purple-700')
                    : (isNight ? 'text-emerald-300' : 'text-emerald-700')
                }`}>
                  <span>ประกัน QA (Gate)</span>
                </div>
                <div className={`text-sm font-black truncate ${
                  summaryCounts.totalPendingQa > 0 
                    ? (isNight ? 'text-rose-200 font-black' : 'text-rose-700 font-black') 
                    : summaryCounts.totalFirstBatch > 0
                    ? (isNight ? 'text-purple-200 font-black' : 'text-purple-900 font-black')
                    : (isNight ? 'text-emerald-200' : 'text-emerald-800')
                }`}>
                  {loading ? '...' : (
                    summaryCounts.totalPendingQa > 0 
                      ? `รอ QA: ${summaryCounts.totalPendingQa}${summaryCounts.totalFirstBatch > 0 ? ` • 🔬 1st: ${summaryCounts.totalFirstBatch}` : ''}` 
                      : summaryCounts.totalFirstBatch > 0
                      ? `🔬 1st Batch: ${summaryCounts.totalFirstBatch} รอบ`
                      : '✅ ปกติ (0 เคส)'
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200' : 'bg-cyan-50/70 border-cyan-200/80 text-cyan-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Boxes className="w-4 h-4 text-cyan-500 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-cyan-300' : 'text-cyan-700'}`}>คลัง Bulk (สต็อกพร้อมบรรจุ)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-cyan-100' : 'text-cyan-900'}`}>{loading ? '...' : `${summaryCounts.totalBulkStockTanks} ถัง (${summaryCounts.totalBulkStockLots} ล็อต)`}</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-emerald-300' : 'text-emerald-700'}`}>งานบรรจุ (21 วัน)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-emerald-100' : 'text-emerald-900'}`}>{loading ? '...' : `${summaryCounts.totalPacking} รอบงาน`}</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-teal-950/40 border-teal-800/60 text-teal-200' : 'bg-teal-50/70 border-teal-200/80 text-teal-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <PackageOpen className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-teal-300' : 'text-teal-700'}`}>งานลงลัง/POF (21 วัน)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-teal-100' : 'text-teal-900'}`}>{loading ? '...' : `${summaryCounts.totalPof} รอบงาน`}</div>
              </div>
            </div>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            isNight ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <div className={`text-[10px] font-medium truncate ${isNight ? 'text-rose-300' : 'text-rose-700'}`}>คลัง FG & ส่งมอบ (21 วัน)</div>
                <div className={`text-sm font-black truncate ${isNight ? 'text-rose-100' : 'text-rose-900'}`}>{loading ? '...' : `${summaryCounts.totalFgDue} ล็อต`}</div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        {loading ? (
          <div className={`p-10 text-center rounded-2xl border my-4 transition-colors ${
            isNight ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-[#FAF8F5] border-[#D4AF37]/30 text-[#4A4238]'
          }`}>
            <Compass className="w-10 h-10 mx-auto mb-3 animate-spin text-[#D4AF37]" />
            <div className="font-bold text-sm text-[#D4AF37]">กำลังเชื่อมต่อและประมวลผลเรดาร์แผนงาน 21 วัน...</div>
            <div className="text-xs text-slate-400 mt-1.5 max-w-lg mx-auto">
              ระบบกำลังเชื่อมโยงข้อมูลทั้ง 9 สายงานการผลิต (RM/PM, ชั่ง, ผสม, QC, QA, Bulk, บรรจุ, POF, FG) เพื่อแสดงผลภาพรวมโรงงาน
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: TIMELINE HORIZON (MATRIX GRID) */}
            {viewMode === 'timeline' && (
              <div className="space-y-2">
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-amber-200">
                  <div className={`min-w-[1500px] border rounded-2xl overflow-hidden shadow-xs ${
                    isNight ? 'border-slate-800 bg-[#0B132B]' : 'border-slate-200 bg-white'
                  }`}>
                    {/* Header: 21 Days (Column 7 is Today) */}
                    <div className={`grid grid-cols-[160px_repeat(21,minmax(60px,1fr))] border-b text-center font-bold text-xs ${
                      isNight ? 'bg-[#0F172A] border-slate-800 text-slate-200' : 'bg-[#F9F7F2] border-slate-200 text-slate-700'
                    }`}>
                      <div className={`p-3 text-left font-bold border-r flex items-center gap-1.5 ${
                        isNight ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                      }`}>
                        <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> สายงาน / วันที่
                      </div>
                      {horizonDates.map((d, idx) => (
                        <div
                          key={d.dateStr}
                          className={`p-2 border-r flex flex-col items-center justify-center transition-colors ${
                            isNight
                              ? d.isToday
                                ? 'bg-amber-950/80 text-amber-200 ring-2 ring-inset ring-[#D4AF37] shadow-sm z-10 border-slate-700'
                                : d.isPast
                                ? 'bg-slate-900/60 text-slate-400 border-slate-800'
                                : idx % 2 === 0
                                ? 'bg-slate-900/40 text-slate-200 border-slate-800'
                                : 'bg-slate-900/20 text-slate-300 border-slate-800'
                              : d.isToday
                              ? 'bg-amber-100/90 text-amber-900 ring-2 ring-inset ring-[#D4AF37] shadow-sm z-10 border-slate-200/80'
                              : d.isPast
                              ? 'bg-slate-100/50 text-slate-600 border-slate-200/80'
                              : idx % 2 === 0
                              ? 'bg-white border-slate-200/80'
                              : 'bg-slate-50/50 border-slate-200/80'
                          }`}
                        >
                          <div className="text-[10px] font-semibold uppercase">
                            {d.isToday ? (
                              <span className={`font-bold flex items-center gap-0.5 ${isNight ? 'text-amber-300' : 'text-amber-800'}`}>📍 วันนี้</span>
                            ) : d.isPast ? (
                              <span className={isNight ? 'text-slate-400' : 'text-slate-400'}>{d.dayName}</span>
                            ) : (
                              <span className={isNight ? 'text-slate-300' : 'text-slate-500'}>{d.dayName}</span>
                            )}
                          </div>
                          <div className={`text-sm font-black ${
                            d.isToday 
                              ? (isNight ? 'text-amber-300 scale-110' : 'text-amber-950 scale-110') 
                              : (isNight ? 'text-slate-100' : 'text-[#4A4238]')
                          }`}>
                            {d.dayNum}
                          </div>
                          <div className={`text-[9px] font-medium ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                            {d.monthName}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Stream Rows */}
                    <div className={`divide-y text-xs ${isNight ? 'divide-slate-800/80' : 'divide-slate-200/80'}`}>
                      {activeStreams.map(stream => {
                        const Icon = stream.icon
                        return (
                          <div
                            key={stream.key}
                            className={`grid grid-cols-[160px_repeat(21,minmax(60px,1fr))] items-stretch transition-colors ${
                              isNight ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/40'
                            }`}
                          >
                            {/* Stream Name Header */}
                            <div className={`p-3 font-bold border-r flex items-center gap-2 ${
                              isNight ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                            } ${stream.color}`}>
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate text-xs">{stream.shortLabel}</span>
                            </div>

                            {/* 21 Day Cells */}
                            {horizonDates.map(d => {
                              const items = dateStreamMap[d.dateStr]?.[stream.key] || []
                              const hasItems = items.length > 0
                              const hasDelayed = items.some(it => it.opStatus?.type === 'delayed' || it.opStatus?.type === 'overdue')
                              const hasInProgress = items.some(it => it.opStatus?.type === 'in_progress')
                              const allDone = items.length > 0 && items.every(it => it.opStatus?.type === 'done' || it.opStatus?.type === 'qc_passed')
                              const hasQaIssue = items.some(it => it.qaIssue && !it.qaIssue.isResolved)
                              const qaPendingCount = items.filter(it => it.qaIssue && !it.qaIssue.isResolved).length
                              const has1stBatch = items.some(it => it.isFirstBatch)

                              return (
                                <div
                                  key={d.dateStr}
                                  className={`p-1.5 border-r border-slate-200/80 flex flex-col items-center justify-center min-h-[64px] transition-all ${
                                    d.isToday ? 'bg-amber-50/40' : d.isPast ? 'bg-slate-50/30' : ''
                                  }`}
                                >
                                  {hasItems ? (
                                    stream.key === 'QC' ? (
                                      <button
                                        type="button"
                                        onClick={() => setQcModalData({ items, stream, date: d })}
                                        className={`w-full h-full p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-center shadow-2xs transition-transform hover:scale-105 active:scale-95 cursor-pointer relative ${
                                          hasDelayed
                                            ? 'bg-amber-100/95 text-amber-950 border-amber-400 font-bold'
                                            : hasInProgress
                                            ? 'bg-blue-50/90 text-blue-950 border-blue-400/80 font-bold ring-1 ring-blue-300'
                                            : allDone
                                            ? 'bg-emerald-50/90 text-emerald-950 border-emerald-300 font-medium'
                                            : stream.pillColor
                                        }`}
                                      >
                                        {hasInProgress && (
                                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" title="กำลังดำเนินการ (In Progress)" />
                                        )}
                                        <span className="font-extrabold text-[11px] leading-tight flex items-center justify-center gap-1">
                                          {hasDelayed && (
                                            <span className="text-[10px]" title="มีรายการล่าช้า/เลื่อนส่ง">⚠️</span>
                                          )}
                                          {hasInProgress && !hasDelayed && (
                                            <span className="text-[9px] text-blue-700 font-bold" title="กำลังดำเนินการ">▶</span>
                                          )}
                                          {allDone && (
                                            <span className="text-[9px] text-emerald-700 font-bold" title="เสร็จสิ้นทั้งหมด">✓</span>
                                          )}
                                          <span>{items.length} งาน QC</span>
                                        </span>
                                        <div className="flex items-center gap-0.5 text-[8px] opacity-85 font-semibold truncate max-w-[62px]">
                                          {items.some(i => i.qcSubtype === 'RM') && <span>RM</span>}
                                          {items.some(i => i.qcSubtype === 'PM') && <span>•PM</span>}
                                          {items.some(i => i.qcSubtype === 'BULK') && <span>•Bulk</span>}
                                          {items.some(i => i.qcSubtype === 'IPC') && <span>•IPC</span>}
                                          {items.some(i => i.qcSubtype === 'FG') && <span>•FG</span>}
                                        </div>
                                      </button>
                                    ) : (
                                      <Popover>
                                        <PopoverTrigger
                                          className={`w-full h-full p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-center shadow-2xs transition-transform hover:scale-105 active:scale-95 relative ${
                                            stream.key === 'QA'
                                              ? (qaPendingCount > 0
                                                  ? 'bg-rose-100/95 text-rose-950 border-rose-400 font-black ring-2 ring-rose-400'
                                                  : has1stBatch
                                                  ? 'bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-100 text-purple-950 border-purple-400 font-black ring-2 ring-purple-300 shadow-xs'
                                                  : allDone
                                                  ? 'bg-emerald-50/90 text-emerald-950 border-emerald-300 font-medium'
                                                  : 'bg-rose-50/80 text-rose-900 border-rose-200 font-medium')
                                              : hasDelayed
                                              ? 'bg-amber-100/95 text-amber-950 border-amber-400 font-bold'
                                              : hasInProgress
                                              ? 'bg-blue-50/90 text-blue-950 border-blue-400/80 font-bold ring-1 ring-blue-300'
                                              : allDone
                                              ? 'bg-emerald-50/90 text-emerald-950 border-emerald-300 font-medium'
                                              : stream.pillColor
                                          }`}
                                        >
                                          {stream.key === 'QA' ? (
                                            <>
                                              {qaPendingCount > 0 && (
                                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" title="พบปัญหาคุณภาพรอ QA ประเมิน" />
                                              )}
                                              {has1stBatch && qaPendingCount === 0 && (
                                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" title="งาน 1st Batch: QA ร่วมประเมินหน้างาน" />
                                              )}
                                              <span className="font-extrabold text-[11px] leading-tight flex items-center justify-center gap-1">
                                                {qaPendingCount > 0 ? (
                                                  <span className="text-rose-700 font-black flex items-center gap-0.5">⚠️ รอ QA ({qaPendingCount})</span>
                                                ) : has1stBatch ? (
                                                  <span className="text-purple-950 font-black flex items-center gap-0.5">🔬 1st Batch</span>
                                                ) : (
                                                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">✓ ปกติ ({items.length})</span>
                                                )}
                                              </span>
                                              <span className="text-[8.5px] font-bold opacity-90 truncate max-w-[60px] text-purple-900">
                                                {has1stBatch ? (items.find(i => i.isFirstBatch)?.sku || 'QA') : (qaPendingCount > 0 ? 'รอปลดล็อค' : 'QA Gate')}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              {hasInProgress && (
                                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" title="กำลังดำเนินการ (In Progress)" />
                                              )}
                                              <span className="font-extrabold text-[11px] leading-tight flex items-center justify-center gap-1">
                                                {hasDelayed && (
                                                  <span className="text-[10px]" title="มีรายการล่าช้า/เลื่อนส่ง">⚠️</span>
                                                )}
                                                {hasInProgress && !hasDelayed && (
                                                  <span className="text-[9px] text-blue-700 font-bold" title="กำลังดำเนินการ">▶</span>
                                                )}
                                                {allDone && (
                                                  <span className="text-[9px] text-emerald-700 font-bold" title="เสร็จสิ้นทั้งหมด">✓</span>
                                                )}
                                                <span>
                                                  {stream.key === 'BULK_STOCK'
                                                    ? (items.length === 1 && items[0].bulkStock
                                                        ? `ถัง ${formatTankRanges(items[0].bulkStock.tanks)}`
                                                        : `${items.length} ล็อต Bulk`)
                                                    : items.length === 1
                                                    ? items[0].tag || items[0].lotNo || '1 งาน'
                                                    : `${items.length} รายการ`}
                                                </span>
                                              </span>
                                              {items.length === 1 && items[0].lotNo && (
                                                <span className="text-[9px] opacity-80 truncate max-w-[55px]">
                                                  {items[0].sku}
                                                </span>
                                              )}
                                              {items.length > 1 && stream.key === 'BULK_STOCK' && (
                                                <span className="text-[8px] opacity-90 font-bold truncate max-w-[62px] text-cyan-800">
                                                  {items.reduce((acc, it) => acc + (it.bulkStock?.tanks.length || 0), 0)} ถัง
                                                </span>
                                              )}
                                            </>
                                          )}
                                        </PopoverTrigger>

                                        <PopoverContent
                                          className="w-[360px] sm:w-[480px] max-w-[95vw] p-4 bg-white border border-[#D4AF37]/40 shadow-2xl rounded-2xl z-50 text-xs text-[#4A4238]"
                                          align="center"
                                        >
                                           <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                                             <div className="font-bold flex items-center gap-2 text-sm">
                                               <Icon className={`w-4 h-4 ${stream.color}`} />
                                               <span>{stream.shortLabel}</span>
                                               <span className="text-xs font-bold text-slate-500">({items.length} รายการ)</span>
                                             </div>
                                             <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                               {d.dayName} {d.dayNum} {d.monthName}
                                             </span>
                                           </div>

                                        <div className="space-y-2">
                                          {items.map((it, itIdx) => {
                                            const isDelayedItem = it.streamType === 'ETA' && it.meta?.isDelayed
                                            const delayInfo = it.meta?.delayInfo
                                            return (
                                              <div
                                                key={it.id || itIdx}
                                                className={`p-2.5 rounded-xl border space-y-1.5 transition ${
                                                  isDelayedItem 
                                                    ? 'bg-amber-50/70 border-amber-300/90 hover:bg-amber-100/50' 
                                                    : it.opStatus?.type === 'in_progress'
                                                    ? 'bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/70'
                                                    : it.opStatus?.type === 'done' || it.opStatus?.type === 'qc_passed'
                                                    ? 'bg-emerald-50/30 border-emerald-200/80 hover:bg-emerald-50/60'
                                                    : 'bg-slate-50 border-slate-200/80 hover:bg-amber-50/50'
                                                }`}
                                              >
                                                <div className="flex justify-between items-start gap-2">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <strong className="text-[#4A4238] font-bold text-xs leading-snug">{it.title}</strong>
                                                    {it.opStatus && (
                                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${it.opStatus.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${it.opStatus.dotColor} shrink-0`}></span>
                                                        <span>{it.opStatus.badge}</span>
                                                      </span>
                                                    )}
                                                  </div>
                                                  {it.tag && (
                                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300/60 px-1.5 py-0.5 rounded-md shrink-0">
                                                      {it.tag}
                                                    </span>
                                                  )}
                                                </div>
                                                
                                                <div className="text-[11px] text-slate-600 leading-normal font-medium">
                                                  {it.subtitle}
                                                </div>

                                                {/* Dedicated Delay Warning Box (for ETA items) */}
                                                {isDelayedItem && (
                                                  <div className="p-2 rounded-lg bg-white/95 border border-amber-200 text-amber-900 text-[10px] space-y-1 mt-1 shadow-xs">
                                                    <div className="font-bold flex items-center justify-between gap-1 text-rose-800 flex-wrap">
                                                      <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                                        <span>สาเหตุ: {delayInfo?.categoryLabel || 'เลื่อนกำหนดส่งมอบ'}</span>
                                                      </span>
                                                      {delayInfo?.originalEta && (
                                                        <span className="text-[9px] text-slate-500 font-normal">
                                                          (กำหนดเดิมตาม PO: {new Date(delayInfo.originalEta).toLocaleDateString('th-TH')})
                                                        </span>
                                                      )}
                                                    </div>
                                                    {delayInfo?.reason && (
                                                      <div className="text-slate-600 pl-2.5 text-[10px] italic border-l-2 border-amber-300">
                                                        &ldquo;{cleanDisplayNote(delayInfo.reason)}&rdquo;
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Warehouse Receive Info Box (for ETA or QC RM/PM items) */}
                                                {(it.streamType === 'ETA' || it.streamType === 'QC') && (it.meta?.control_no || it.meta?.received_qty != null || it.meta?.remark) && (
                                                  <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 text-[10px] space-y-1 mt-1 shadow-xs">
                                                    <div className="font-bold flex items-center justify-between gap-1 text-emerald-900 flex-wrap">
                                                      <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                                                        <span>ข้อมูลรับเข้าคลัง</span>
                                                      </span>
                                                      {it.meta?.control_no && (
                                                        <span className="font-mono font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded text-[9px] border border-purple-200">
                                                          Ctrl: {it.meta.control_no}
                                                        </span>
                                                      )}
                                                    </div>
                                                    {it.meta?.received_qty != null && (
                                                      <div className="text-slate-700 pl-2.5 text-[10px]">
                                                        ยอดรับจริง: <strong className="text-emerald-800">{Number(it.meta.received_qty).toLocaleString()} {it.meta.unit || ''}</strong>
                                                        {it.meta.received_qty !== it.meta.quantity && (
                                                          <span className="text-slate-400 ml-1.5 line-through">(ยอด PO: {Number(it.meta.quantity).toLocaleString()})</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    {it.meta?.remark && (
                                                      <div className="text-emerald-900 pl-2.5 text-[10px] italic border-l-2 border-emerald-400">
                                                        💬 หมายเหตุรับเข้า: &ldquo;{it.meta.remark}&rdquo;
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* 1st Batch Collaboration Alert Box (for MX and QA) */}
                                                {it.isFirstBatch && (
                                                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white border border-purple-300/90 text-purple-950 text-[10px] space-y-1.5 mt-1 shadow-xs">
                                                    <div className="font-bold flex items-center justify-between gap-1 text-purple-950 flex-wrap">
                                                      <span className="flex items-center gap-1.5">
                                                        <span className="text-xs">🔬</span>
                                                        <span className="font-black text-purple-950 text-[11px]">
                                                          {it.streamType === 'QA' 
                                                            ? `ภารกิจ QA: ร่วมประเมินกระบวนการผลิต 1st Batch (ถัง ${it.firstBatchTank || 1})`
                                                            : `งานผลิต 1st Batch (ถัง ${it.firstBatchTank || 1}): QA ร่วมประเมินหน้างาน`}
                                                        </span>
                                                      </span>
                                                      <span className="text-[9px] font-black bg-purple-200/90 text-purple-900 px-2 py-0.5 rounded-full border border-purple-300">
                                                        {it.streamType === 'QA' ? 'QA Gate' : 'MX Alert'}
                                                      </span>
                                                    </div>

                                                    <div className="text-[10px] text-purple-900 leading-relaxed pl-2 border-l-2 border-purple-500 space-y-1">
                                                      {it.streamType === 'QA' ? (
                                                        <>
                                                          <p className="font-bold text-purple-950">👉 ข้อกำหนดฝ่ายประกันคุณภาพ (QA):</p>
                                                          <p>
                                                            ต้องเข้าร่วมสังเกตการณ์ ตรวจสอบขั้นตอนการผสม การเติมสาร อุณหภูมิ และเวลาการกวน พร้อมประเมิน In-Process Control (IPC) ถัง {it.firstBatchTank || 1} ร่วมกับฝ่ายผสมหน้างานตลอดกระบวนการ
                                                          </p>
                                                          <div className="bg-white/90 p-2 rounded-lg border border-purple-200/90 mt-1 space-y-1 text-[9.5px] text-purple-950 font-medium">
                                                            <div className="flex items-center justify-between">
                                                              <span>• <strong>จุดตรวจ:</strong> ห้องผสม Bulk / ถัง {it.firstBatchTank || 1}</span>
                                                              <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">IPC Testing</span>
                                                            </div>
                                                            <div>
                                                              • <strong>พารามิเตอร์ที่ต้องประเมิน:</strong> ลำดับการเติมสารเคมี, อุณหภูมิการหลอม, ความเร็วรอบกวน (RPM), เวลาการกวน และลักษณะเนื้อสัมผัส Bulk
                                                            </div>
                                                            <div>
                                                              • <strong>ช่วงแผนผสม:</strong> {it.meta?.startDate ? format(parseISO(it.meta.startDate), 'd MMM') : ''} - {it.meta?.endDate ? format(parseISO(it.meta.endDate), 'd MMM yyyy') : ''} ({it.meta?.isMultiDay ? 'ต่อเนื่องหลายวัน' : '1 วัน'})
                                                            </div>
                                                            <div>
                                                              • <strong>สถานะฝ่ายผสม (MX):</strong> {it.meta?.status === 'IN_PROGRESS' ? 'กำลังผสมอยู่หน้างาน (IN PROGRESS) 🟢' : it.meta?.status === 'DONE' ? 'ผสมเสร็จสิ้นแล้ว ✓' : 'ตามแผนงาน (PLANNED) ⏳'}
                                                            </div>
                                                          </div>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <p className="font-bold text-purple-950">👉 แจ้งเตือนฝ่ายผสม (MX):</p>
                                                          <p>
                                                            คิวงานนี้มีถัง {it.firstBatchTank || 1} เป็นงานผลิตครั้งแรก (1st Batch) ต้องประสานงานฝ่าย QA เข้าประเมินร่วมกันหน้างาน ตรวจสอบพารามิเตอร์และบันทึกกระบวนการผลิตก่อนและระหว่างเดินเครื่อง
                                                          </p>
                                                          <div className="bg-white/90 p-2 rounded-lg border border-purple-200/90 mt-1 text-[9.5px] text-purple-950 font-medium space-y-0.5">
                                                            <div>• <strong>ผู้ร่วมประเมิน:</strong> ฝ่ายประกันคุณภาพ (QA Inspector) ประจำจุดผสมถัง {it.firstBatchTank || 1}</div>
                                                            <div>• <strong>เอกสารที่ต้องเตรียม:</strong> Batch Manufacturing Record (BMR) & แบบฟอร์มประเมิน 1st Batch</div>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Plan Rescheduled Alert Box (for Manufacturing items) */}
                                                {it.opStatus?.rescheduledInfo?.isRescheduled && (
                                                  <div className="p-2 rounded-lg bg-purple-50/95 border border-purple-200/90 text-purple-900 text-[10px] space-y-1 mt-1 shadow-xs">
                                                    <div className="font-bold flex items-center justify-between gap-1 text-purple-950 flex-wrap">
                                                      <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span>
                                                        <span>🔄 ปรับเลื่อนแผน: {it.opStatus.rescheduledInfo.categoryLabel || 'เลื่อนแผนงาน'}</span>
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-purple-800 flex-wrap font-medium pl-2.5">
                                                      <span>แผนเดิม:</span>
                                                      <span className="line-through font-mono text-slate-500">
                                                        {it.opStatus.rescheduledInfo.originalDate ? format(parseISO(it.opStatus.rescheduledInfo.originalDate), 'dd/MM/yyyy') : '-'}
                                                      </span>
                                                      <span>➔</span>
                                                      <span>แผนใหม่:</span>
                                                      <strong className="font-mono text-purple-950">
                                                        {it.opStatus.rescheduledInfo.revisedDate ? format(parseISO(it.opStatus.rescheduledInfo.revisedDate), 'dd/MM/yyyy') : '-'}
                                                      </strong>
                                                    </div>
                                                    {it.opStatus.rescheduledInfo.reason && (
                                                      <div className="text-purple-700 pl-2.5 text-[10px] italic border-l-2 border-purple-300">
                                                        &ldquo;{cleanDisplayNote(it.opStatus.rescheduledInfo.reason)}&rdquo;
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Operational Progress / Timestamp Info Box */}
                                                {it.streamType !== 'ETA' && (it.opStatus?.startTimeStr || it.opStatus?.endTimeStr || it.opStatus?.note || it.opStatus?.detailsText) && (
                                                  <div className={`p-2 rounded-lg border text-[10px] space-y-1 mt-1 shadow-xs ${
                                                    it.opStatus.type === 'in_progress' 
                                                      ? 'bg-white/95 border-blue-200 text-blue-900' 
                                                      : it.opStatus.type === 'done' || it.opStatus.type === 'qc_passed'
                                                      ? 'bg-white/95 border-emerald-200 text-emerald-900'
                                                      : it.opStatus.type === 'overdue'
                                                      ? 'bg-white/95 border-rose-200 text-rose-900'
                                                      : 'bg-white/95 border-slate-200 text-slate-700'
                                                  }`}>
                                                    <div className="flex items-center justify-between gap-2 flex-wrap font-medium">
                                                      <div className="flex items-center gap-2">
                                                        {it.opStatus.startTimeStr && (
                                                          <span className="flex items-center gap-1 text-slate-700">
                                                            <Clock className="w-3 h-3 text-blue-500" />
                                                            <span>เริ่ม: <strong>{it.opStatus.startTimeStr} น.</strong></span>
                                                          </span>
                                                        )}
                                                        {it.opStatus.endTimeStr && (
                                                          <span className="flex items-center gap-1 text-slate-700">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            <span>เสร็จ: <strong>{it.opStatus.endTimeStr} น.</strong></span>
                                                          </span>
                                                        )}
                                                      </div>
                                                      {it.opStatus.detailsText && (
                                                        <span className="text-[9px] text-slate-500">{it.opStatus.detailsText}</span>
                                                      )}
                                                    </div>
                                                    {it.opStatus.note && (
                                                      <div className="text-slate-600 pl-2 text-[10px] italic border-l-2 border-slate-300">
                                                        &ldquo;{cleanDisplayNote(it.opStatus.note)}&rdquo;
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {it.meta?.isMultiDay && (
                                                  <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded px-2 py-0.5 w-fit font-medium flex items-center gap-1.5 mt-0.5">
                                                    <CalendarDays className="w-3 h-3 text-[#D4AF37]" />
                                                    <span>ช่วงแผน: {format(parseISO(it.meta.startDate), 'd MMM')} - {format(parseISO(it.meta.endDate), 'd MMM yyyy')}</span>
                                                  </div>
                                                )}
                                                {it.lotId && onSelectLot && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onSelectLot(it.lotId!)}
                                                    className="text-[10px] text-[#8B7355] font-bold hover:underline flex items-center gap-1 pt-1"
                                                  >
                                                    ดูกราฟล็อตนี้ <ChevronRight className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>

                                        {stream.key === 'QA' && (
                                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                                            <button
                                              type="button"
                                              onClick={() => setQcModalData({ items, stream, date: d })}
                                              className="text-[10.5px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                            >
                                              <span>🔍 เปิดหน้ารวมตรวจ QA Gateway</span>
                                            </button>
                                            <a
                                              href="/issues"
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[10.5px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline"
                                            >
                                              <span>ระบบจัดการปัญหา QA</span>
                                              <ArrowUpRight className="w-3 h-3" />
                                            </a>
                                          </div>
                                        )}
                                        </PopoverContent>
                                      </Popover>
                                    )
                                  ) : (
                                    <span className="text-slate-300 text-xs font-light">-</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: DAILY AGENDA WORKLIST */}
            {viewMode === 'daily' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {horizonDates.map((d) => {
                    const dayEta = (!isAllStreams && !selectedStreams.includes('ETA')) ? [] : (dateStreamMap[d.dateStr]?.ETA || [])
                    const dayWeighing = (!isAllStreams && !selectedStreams.includes('WEIGHING')) ? [] : (dateStreamMap[d.dateStr]?.WEIGHING || [])
                    const dayMixing = (!isAllStreams && !selectedStreams.includes('MIXING')) ? [] : (dateStreamMap[d.dateStr]?.MIXING || [])
                    const dayQc = (!isAllStreams && !selectedStreams.includes('QC')) ? [] : (dateStreamMap[d.dateStr]?.QC || [])
                    const dayQa = (!isAllStreams && !selectedStreams.includes('QA')) ? [] : (dateStreamMap[d.dateStr]?.QA || [])
                    const dayBulkStock = (!isAllStreams && !selectedStreams.includes('BULK_STOCK')) ? [] : (dateStreamMap[d.dateStr]?.BULK_STOCK || [])
                    const dayPacking = (!isAllStreams && !selectedStreams.includes('PACKING')) ? [] : (dateStreamMap[d.dateStr]?.PACKING || [])
                    const dayPof = (!isAllStreams && !selectedStreams.includes('POF')) ? [] : (dateStreamMap[d.dateStr]?.POF || [])
                    const dayFgDue = (!isAllStreams && !selectedStreams.includes('FG_DUE')) ? [] : (dateStreamMap[d.dateStr]?.FG_DUE || [])

                    const totalDayTasks = dayEta.length + dayWeighing.length + dayMixing.length + dayQc.length + dayQa.length + dayBulkStock.length + dayPacking.length + dayPof.length + dayFgDue.length

                    if (totalDayTasks === 0) return null

                    return (
                      <div
                        key={d.dateStr}
                        className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
                          d.isToday
                            ? 'bg-amber-50/40 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                            : d.isPast
                            ? 'bg-slate-50/60 border-slate-200/80'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                              d.isToday ? 'bg-[#D4AF37] text-white' : d.isPast ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {d.isToday ? '📍 วันนี้' : `${d.dayName} ${d.dayNum} ${d.monthName}`}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {d.isToday ? 'Day 0 (วันนี้)' : d.isPast ? `ย้อนหลัง ${Math.abs(d.dayOffset)} วัน` : `+${d.dayOffset} วัน`}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {totalDayTasks} กิจกรรม
                          </span>
                        </div>

                        {/* Stream Breakdown Inside Day */}
                        <div className="space-y-2 text-xs">
                          {/* ETA */}
                          {dayEta.length > 0 && (
                            <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                              <div className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                                <Truck className="w-3.5 h-3.5 text-amber-700" />
                                <span>ของเข้า ({dayEta.length} รายการ)</span>
                              </div>
                              {dayEta.map(e => (
                                <div key={e.id} className="text-[11px] text-amber-800 pl-5 flex items-center justify-between gap-1 flex-wrap">
                                  <div>
                                    • <strong>{e.title}</strong> - <span className="text-amber-700">{e.subtitle}</span>
                                  </div>
                                  {e.opStatus && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${e.opStatus.color}`}>
                                      {e.opStatus.shortBadge}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Weighing */}
                          {dayWeighing.length > 0 && (
                            <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-200/70 space-y-1">
                              <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-[11px]">
                                <Scale className="w-3.5 h-3.5 text-indigo-700" />
                                <span>เตรียม/ชั่งสาร ({dayWeighing.length} ล็อต)</span>
                              </div>
                              {dayWeighing.map(w => (
                                <div key={w.id} className="text-[11px] text-indigo-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{w.title}</strong> ({w.tag})</span>
                                    {w.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${w.opStatus.color}`}>
                                        {w.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                  {w.meta?.isMultiDay && (
                                    <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                      {format(parseISO(w.meta.startDate), 'd/M')}-{format(parseISO(w.meta.endDate), 'd/M')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Mixing */}
                          {dayMixing.length > 0 && (
                            <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200/70 space-y-1">
                              <div className="font-bold text-blue-900 flex items-center gap-1.5 text-[11px]">
                                <Beaker className="w-3.5 h-3.5 text-blue-700" />
                                <span>งานผสม Bulk ({dayMixing.length} ล็อต)</span>
                              </div>
                              {dayMixing.map(m => (
                                <div key={m.id} className="text-[11px] text-blue-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{m.title}</strong> <span className="text-blue-600">[{m.tag}]</span></span>
                                    {m.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${m.opStatus.color}`}>
                                        {m.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                  {m.meta?.isMultiDay && (
                                    <span className="text-[9px] text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                      {format(parseISO(m.meta.startDate), 'd/M')}-{format(parseISO(m.meta.endDate), 'd/M')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* QC */}
                          {dayQc.length > 0 && (
                            <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-200/70 space-y-1">
                              <div className="font-bold text-purple-900 flex items-center gap-1.5 text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                                <span>ตรวจสอบคุณภาพ QC ({dayQc.length} รายการตรวจ)</span>
                              </div>
                              {dayQc.map(q => (
                                <div key={q.id} className="text-[11px] text-purple-800 pl-5 flex items-center justify-between gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded border bg-purple-100 text-purple-900 border-purple-200">
                                      {q.qcSubtype || 'QC'}
                                    </span>
                                    <span>• <strong>{q.title}</strong></span>
                                    {q.tag && <span className="text-purple-600 font-medium">[{q.tag}]</span>}
                                  </div>
                                  {q.opStatus && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${q.opStatus.color}`}>
                                      {q.opStatus.shortBadge}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* QA */}
                          {dayQa.length > 0 && (
                            <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200/70 space-y-1">
                              <div className="font-bold text-rose-950 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>ประกันคุณภาพ QA ({dayQa.length} {dayQa.some(q => q.isFirstBatch) ? 'ภารกิจ/ประเด็น' : 'ประเด็นรอประเมิน'})</span>
                                </div>
                                <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded">QA Gate</span>
                              </div>
                              {dayQa.map(qa => (
                                <div key={qa.id} className="text-[11px] text-rose-900 pl-5 flex items-center justify-between gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                      qa.isFirstBatch
                                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                                        : 'bg-rose-100 text-rose-900 border-rose-300'
                                    }`}>
                                      {qa.isFirstBatch ? '🔬 1st Batch' : (qa.qaIssue ? `QA: ${qa.qaIssue.issueType}` : 'QA')}
                                    </span>
                                    <span>• <strong>{qa.title}</strong></span>
                                    {qa.tag && (
                                      <span className={`font-medium ${qa.isFirstBatch ? 'text-purple-700' : 'text-rose-700'}`}>
                                        [{qa.tag}]
                                      </span>
                                    )}
                                  </div>
                                  {qa.opStatus && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${qa.opStatus.color}`}>
                                      {qa.opStatus.shortBadge}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Bulk Stock */}
                          {dayBulkStock.length > 0 && (
                            <div className="p-2 rounded-xl bg-cyan-50/70 border border-cyan-200/70 space-y-1">
                              <div className="font-bold text-cyan-950 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <Boxes className="w-3.5 h-3.5 text-cyan-700" />
                                  <span>คลัง Bulk สต็อกพร้อมบรรจุ ({dayBulkStock.length} รายการ)</span>
                                </div>
                                <span className="text-[9px] font-bold text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded">สต็อกพร้อมเบิก</span>
                              </div>
                              {dayBulkStock.map(b => (
                                <div key={b.id} className="text-[11px] text-cyan-900 pl-5 flex items-center justify-between gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{b.title}</strong></span>
                                    <span className="text-cyan-700 font-semibold">[{b.tag}]</span>
                                  </div>
                                  {b.opStatus && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${b.opStatus.color}`}>
                                      {b.opStatus.shortBadge}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Packing */}
                          {dayPacking.length > 0 && (
                            <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
                              <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px]">
                                <Package className="w-3.5 h-3.5 text-emerald-700" />
                                <span>งานบรรจุ ({dayPacking.length} รายการ)</span>
                              </div>
                              {dayPacking.map(p => (
                                <div key={p.id} className="text-[11px] text-emerald-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{p.title}</strong> <span className="text-emerald-700 font-semibold">{p.tag}</span></span>
                                    {p.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${p.opStatus.color}`}>
                                        {p.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                  {p.meta?.isMultiDay && (
                                    <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                      {format(parseISO(p.meta.startDate), 'd/M')}-{format(parseISO(p.meta.endDate), 'd/M')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* POF / Cartoning */}
                          {dayPof.length > 0 && (
                            <div className="p-2 rounded-xl bg-teal-50/70 border border-teal-200/70 space-y-1">
                              <div className="font-bold text-teal-900 flex items-center gap-1.5 text-[11px]">
                                <PackageOpen className="w-3.5 h-3.5 text-teal-700" />
                                <span>งานลงลัง / POF ({dayPof.length} รายการ)</span>
                              </div>
                              {dayPof.map(p => (
                                <div key={p.id} className="text-[11px] text-teal-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{p.title}</strong> <span className="text-teal-700 font-semibold">{p.tag}</span></span>
                                    {p.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${p.opStatus.color}`}>
                                        {p.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                  {p.meta?.isMultiDay && (
                                    <span className="text-[9px] text-teal-700 bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                                      {format(parseISO(p.meta.startDate), 'd/M')}-{format(parseISO(p.meta.endDate), 'd/M')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* FG Due */}
                          {dayFgDue.length > 0 && (
                            <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200/70 space-y-1">
                              <div className="font-bold text-rose-900 flex items-center gap-1.5 text-[11px]">
                                <Gift className="w-3.5 h-3.5 text-rose-700" />
                                <span>กำหนดส่งมอบ FG ({dayFgDue.length} ล็อต)</span>
                              </div>
                              {dayFgDue.map(f => (
                                <div key={f.id} className="text-[11px] text-rose-800 pl-5 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>• <strong>{f.title}</strong> <span className="text-rose-700 font-bold">[{f.tag}]</span></span>
                                    {f.opStatus && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${f.opStatus.color}`}>
                                        {f.opStatus.shortBadge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: ETA LOGISTICS (SUPPLY CHAIN VIEW) */}
            {viewMode === 'logistics' && (
              <div className="space-y-3">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-[#4A4238]">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span>รายการวัตถุดิบและบรรจุภัณฑ์รอเข้าโรงงาน (ETA Supply Chain 21 วัน)</span>
                    </div>
                    <span className="text-slate-500 font-semibold">ทั้งหมด {radarData.etaList.length} รายการ</span>
                  </div>

                  {radarData.etaList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      ไม่มีกำหนดการของเข้าในช่วง 21 วันนี้
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {radarData.etaList.map((item, idx) => {
                        const etaD = parseISO(item.eta_date)
                        const isToday = isSameDay(etaD, baseDate)
                        const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
                        const isDelayed = dInfo.isDelayed || item.status === 'DELAYED'

                        return (
                          <div
                            key={item.id || idx}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition ${
                              isToday ? 'bg-amber-50/50' : ''
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <div className={`p-2 rounded-xl text-center shrink-0 min-w-[50px] ${
                                isToday ? 'bg-[#D4AF37] text-white font-bold' : 'bg-slate-100 text-slate-700'
                              }`}>
                                <div className="text-[9px] font-semibold">{TH_DAYS[etaD.getDay()]}</div>
                                <div className="text-sm font-black">{etaD.getDate()}</div>
                                <div className="text-[9px]">{TH_MONTHS[etaD.getMonth()]}</div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-[#4A4238] text-sm">{item.rm_code}</span>
                                  {item.control_no && (
                                    <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                                      Ctrl: {item.control_no}
                                    </span>
                                  )}
                                  {item.po_no && (
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                      PO: {item.po_no}
                                    </span>
                                  )}
                                  {isDelayed && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                      ⚠️ เลื่อนส่ง: {dInfo.categoryLabel || 'แจ้งเลื่อน'}
                                    </span>
                                  )}
                                  {isToday && (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                      เข้าวันนี้
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>{item.rm_name || item.supplier || 'ไม่ระบุชื่อ'}</span>
                                  {isDelayed && dInfo.originalEta && (
                                    <span className="text-[10px] text-slate-400 line-through">
                                      (PO เดิม: {new Date(dInfo.originalEta).toLocaleDateString('th-TH')})
                                    </span>
                                  )}
                                </div>
                                {isDelayed && dInfo.reason && (
                                  <div className="text-[10px] text-amber-800 mt-1 italic bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 inline-block">
                                    เหตุผล: {dInfo.reason}
                                  </div>
                                )}
                                {item.remark && (
                                  <div className="text-[10px] text-purple-800 mt-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/80 inline-flex items-center gap-1">
                                    <span className="font-bold">💬 หมายเหตุรับเข้า:</span>
                                    <span>{item.remark}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 sm:self-center pl-14 sm:pl-0">
                              <div className="text-right">
                                <div className="font-black text-[#4A4238] text-sm">
                                  {Number(item.received_qty != null ? item.received_qty : item.quantity || 0).toLocaleString()} {item.unit || 'หน่วย'}
                                </div>
                                {item.received_qty != null && item.received_qty !== item.quantity && (
                                  <div className="text-[10px] text-slate-400 line-through">
                                    PO: {Number(item.quantity || 0).toLocaleString()} {item.unit || ''}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400">
                                  {item.supplier ? `Supplier: ${item.supplier}` : 'รอรับเข้าคลัง RM'}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.status === 'RECEIVED' && item.qc_status === 'PASSED' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                                    🛡️ QC Pass
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                  item.status === 'RECEIVED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {item.status === 'RECEIVED' ? '✓ รับแล้ว' : '⏳ รอส่งมอบ'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>

    {/* AI Plant Director Strategic Directives & Advisory Panel */}
    <PlantDirectorAdvisory
      etaList={radarData.etaList}
      logsList={radarData.logsList}
      fgDueLots={radarData.fgDueLots}
      horizonDates={horizonDates}
      onSelectLot={onSelectLot}
      theme={currentDirectorTheme}
      onToggleTheme={handleToggleDirector}
    />

    {/* QC Details Modal Dialog */}
    <QcDetailDialog
      isOpen={!!qcModalData}
      onClose={() => setQcModalData(null)}
      data={qcModalData}
      isNight={isNight}
      onSelectLot={onSelectLot}
    />
  </div>
  )
}
