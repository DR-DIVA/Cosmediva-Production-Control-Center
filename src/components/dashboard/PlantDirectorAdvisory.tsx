'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { 
  Sparkles, 
  Crown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Scale, 
  Beaker, 
  Package, 
  Gift, 
  ShieldCheck, 
  Copy, 
  RefreshCw, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Send,
  SlidersHorizontal,
  Flame,
  Search,
  X,
  Sun,
  Moon,
  Edit3,
  RotateCcw
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { parseDelayInfo } from '@/lib/delayTracking'
import { parsePlanChangeInfo } from '@/lib/planTracking'
import { createClient } from '@/utils/supabase/client'

export interface PlantDirectorDirective {
  id: string
  pillar: 'SUPPLY_CHAIN' | 'SHOPFLOOR' | 'QC_GATE' | 'CUSTOMER_OTIF'
  pillarLabel: string
  pillarIcon: React.ElementType
  topic?: string
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY'
  title: string
  lotId?: string
  lotNo?: string
  sku?: string
  poNo?: string
  problemStatement: string
  directorDirective: string
  actionItems: {
    dept: string
    action: string
  }[]
  recommendationDate?: string
}

export type CopyCategory = 
  | 'ALL'
  | 'PILLAR_SUPPLY_CHAIN'
  | 'PILLAR_SHOPFLOOR'
  | 'PILLAR_QC_GATE'
  | 'PILLAR_CUSTOMER_OTIF'
  | 'DEPT_PURCHASING'
  | 'DEPT_PLANNING'
  | 'DEPT_PRODUCTION'
  | 'DEPT_QC'
  | 'DEPT_WAREHOUSE'

export function isDeptMatch(directive: PlantDirectorDirective, dept: 'PURCHASING' | 'PLANNING' | 'PRODUCTION' | 'QC' | 'WAREHOUSE'): boolean {
  const haystack = `${directive.title} ${directive.problemStatement} ${directive.directorDirective} ${directive.actionItems?.map(a => `${a.dept} ${a.action}`).join(' ') || ''}`.toLowerCase()

  switch (dept) {
    case 'PURCHASING':
      return directive.pillar === 'SUPPLY_CHAIN' ||
        haystack.includes('จัดซื้อ') ||
        haystack.includes('purchasing') ||
        haystack.includes('supplier') ||
        haystack.includes('วัตถุดิบ') ||
        haystack.includes('po ')
    case 'PLANNING':
      return haystack.includes('วางแผน') ||
        haystack.includes('pmc') ||
        haystack.includes('re-plan') ||
        haystack.includes('คิวงาน') ||
        haystack.includes('เลื่อนแผน') ||
        haystack.includes('ปรับวัน')
    case 'PRODUCTION':
      return directive.pillar === 'SHOPFLOOR' ||
        haystack.includes('ผลิต') ||
        haystack.includes('ชั่ง') ||
        haystack.includes('ผสม') ||
        haystack.includes('บรรจุ') ||
        haystack.includes('packing') ||
        haystack.includes('mix') ||
        haystack.includes('ถัง') ||
        haystack.includes('ไลน์') ||
        haystack.includes('ซ่อมบำรุง')
    case 'QC':
      return directive.pillar === 'QC_GATE' ||
        haystack.includes('qc') ||
        haystack.includes('qa') ||
        haystack.includes('แล็บ') ||
        haystack.includes('คุณภาพ') ||
        haystack.includes('hold') ||
        haystack.includes('nc')
    case 'WAREHOUSE':
      return directive.pillar === 'CUSTOMER_OTIF' ||
        haystack.includes('คลัง') ||
        haystack.includes('warehouse') ||
        haystack.includes('ส่งมอบ') ||
        haystack.includes('ขนส่ง') ||
        haystack.includes('โลจิสติกส์') ||
        haystack.includes('พาเลท') ||
        haystack.includes('สต็อก') ||
        haystack.includes('fg')
    default:
      return false
  }
}

interface PlantDirectorAdvisoryProps {
  etaList: any[]
  logsList: any[]
  fgDueLots: any[]
  horizonDates: any[]
  onSelectLot?: (lotId: string) => void
  theme?: 'night' | 'light'
  onToggleTheme?: () => void
}

export function PlantDirectorAdvisory({
  etaList,
  logsList,
  fgDueLots,
  horizonDates,
  onSelectLot,
  theme: propTheme,
  onToggleTheme
}: PlantDirectorAdvisoryProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SUPPLY_CHAIN' | 'SHOPFLOOR' | 'QC_GATE' | 'CUSTOMER_OTIF'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null)
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'night' | 'light'>('night')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  // Default to collapsed categories as requested by user to keep view clean and compact
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => new Set(['SUPPLY_CHAIN', 'SHOPFLOOR', 'QC_GATE', 'CUSTOMER_OTIF'])
  )

  // Plant Director (PDT) Custom Directives state & sync
  const supabase = useMemo(() => createClient(), [])
  const [customDirectives, setCustomDirectives] = useState<Record<string, { text: string; updatedAt?: string; updatedBy?: string }>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Load custom directives from localStorage and Supabase system_settings
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem('cosmeflow_pdt_custom_directives')
      if (cached) {
        setCustomDirectives(JSON.parse(cached))
      }
    } catch (e) {
      console.error('Failed to parse cached custom directives', e)
    }

    async function loadDirectivesFromDb() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'PLANT_DIRECTOR_CUSTOM_DIRECTIVES')
          .single()

        if (!error && data?.setting_value && typeof data.setting_value === 'object') {
          setCustomDirectives(prev => {
            const merged = { ...prev, ...data.setting_value }
            try {
              localStorage.setItem('cosmeflow_pdt_custom_directives', JSON.stringify(merged))
            } catch {}
            return merged
          })
        }
      } catch (err) {
        console.error('Failed to load custom directives from DB', err)
      }
    }

    loadDirectivesFromDb()
  }, [supabase])

  React.useEffect(() => {
    if (propTheme) {
      setTheme(propTheme)
      return
    }
    try {
      const savedTheme = localStorage.getItem('cosmeflow_theme_ai_director') || localStorage.getItem('cosmeflow_director_advisory_theme')
      if (savedTheme === 'light' || savedTheme === 'night') {
        setTheme(savedTheme)
      }
    } catch {
      // ignore
    }
  }, [propTheme])

  const toggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme()
      return
    }
    const nextTheme = theme === 'night' ? 'light' : 'night'
    setTheme(nextTheme)
    try {
      localStorage.setItem('cosmeflow_theme_ai_director', nextTheme)
      localStorage.setItem('cosmeflow_director_advisory_theme', nextTheme)
    } catch {
      // ignore
    }
  }

  const isNight = (propTheme || theme) === 'night'

  const todayStr = horizonDates[6]?.dateStr || format(new Date(), 'yyyy-MM-dd')

  // Generate Strategic Directives from Cross-Functional Intelligence
  const directives: PlantDirectorDirective[] = useMemo(() => {
    const list: PlantDirectorDirective[] = []

    // -------------------------------------------------------------
    // PILLAR 1: SUPPLY CHAIN ➔ PRODUCTION ALIGNMENT (จัดซื้อ ➔ ผลิต)
    // -------------------------------------------------------------
    // Find RM/PM that are delayed
    const delayedRms = etaList.filter(item => {
      const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status)
      return dInfo.isDelayed || item.status === 'DELAYED'
    })

    delayedRms.forEach(rm => {
      const dInfo = parseDelayInfo(rm.bottom_remark, rm.eta_date, rm.receive_date, rm.status)
      const revisedDate = dInfo.revisedEta || rm.eta_date
      const origDate = dInfo.originalEta

      // Check if this RM links to a production lot or mentions a lot in remark
      const linkedLotId = rm.production_lot_id
      let affectedLog: any = null

      if (linkedLotId) {
        affectedLog = logsList.find(l => l.production_lots?.id === linkedLotId)
      }

      // If not linked by ID, search remark for lot number patterns (e.g. 006/26, 007/26)
      if (!affectedLog && rm.bottom_remark) {
        const lotMatch = rm.bottom_remark.match(/(\d{3}\/\d{2})/i)
        if (lotMatch && lotMatch[1]) {
          affectedLog = logsList.find(l => l.production_lots?.lot_no === lotMatch[1])
        }
      }

      // Check if the production task is scheduled before or very close to the revised arrival date
      if (affectedLog) {
        const taskDate = affectedLog.activity_date || affectedLog.end_date
        const lotNo = affectedLog.production_lots?.lot_no || 'N/A'
        const sku = affectedLog.production_lots?.products?.sku || 'SKU'
        const procName = affectedLog.processes?.process_name || 'งานผลิต'

        if (taskDate && taskDate < revisedDate) {
          list.push({
            id: `sc-conflict-${rm.id}-${affectedLog.id}`,
            pillar: 'SUPPLY_CHAIN',
            pillarLabel: 'จัดซื้อ ➔ ฝ่ายผลิต',
            pillarIcon: Truck,
            topic: 'วัตถุดิบเข้าช้ากว่าคิวงาน',
            severity: 'CRITICAL',
            title: `วัตถุดิบเข้าช้ากว่าคิวงาน: ${rm.rm_name || rm.rm_code}`,
            lotId: affectedLog.production_lots?.id,
            lotNo,
            sku,
            poNo: rm.po_no,
            problemStatement: `PO ${rm.po_no || '-'} (${rm.rm_code}) เลื่อนเข้าเป็น ${revisedDate ? new Date(revisedDate).toLocaleDateString('th-TH') : '-'} แต่คิว${procName}ของ LOT ${lotNo} ยังลงวันไว้ก่อนหน้า (${new Date(taskDate).toLocaleDateString('th-TH')}) ทำให้หน้างานไม่สามารถเริ่มได้`,
            directorDirective: `ขอให้ฝ่ายวางแผน Re-plan ปรับวันคิว${procName}ของ LOT ${lotNo} ไปเริ่มหลังของเข้าตรวจ QC ผ่าน (แนะนำเป็นวันถัดไป) และฝ่ายจัดซื้อต้องล็อกคิวส่งมอบกับ Supplier ${rm.supplier || ''} ห้ามหลุดรอบนี้เด็ดขาด`,
            actionItems: [
              { dept: 'ฝ่ายวางแผน (PMC)', action: `ขยับคิว${procName} LOT ${lotNo} จาก ${taskDate} ➔ เป็นหลังวันที่ ${revisedDate}` },
              { dept: 'ฝ่ายจัดซื้อ (Purchasing)', action: `ติดตาม Supplier ${rm.supplier || ''} เร่งรัดส่งของตามนัด ${revisedDate}` }
            ]
          })
        }
      } else {
        // Generic delayed RM directive if impact is widespread
        list.push({
          id: `sc-delay-${rm.id}`,
          pillar: 'SUPPLY_CHAIN',
          pillarLabel: 'จัดซื้อ ➔ คลัง RM',
          pillarIcon: Truck,
          topic: 'แจ้งเตือนเลื่อนส่งมอบ',
          severity: 'WARNING',
          title: `แจ้งเตือนเลื่อนส่งมอบ: ${rm.rm_name || rm.rm_code} (${rm.supplier || 'Supplier'})`,
          poNo: rm.po_no,
          problemStatement: `Supplier ขอเลื่อนกำหนดส่งเป็น ${revisedDate ? new Date(revisedDate).toLocaleDateString('th-TH') : '-'} (สาเหตุ: ${dInfo.categoryLabel || 'เลื่อนส่ง'}) หมายเหตุ: "${dInfo.reason || '-'}"`,
          directorDirective: `ให้จัดซื้อประเมินร่วมกับคลังสินค้า ตรวจสอบสต็อกสำรอง (Safety Stock) ในโรงงาน หากมีสต็อกให้ดึงมาใช้ก่อน หากไม่มีให้แจ้งเตือนฝ่ายวางแผนปรับคิวงานชั่งสาร`,
          actionItems: [
            { dept: 'ฝ่ายจัดซื้อ & คลัง', action: `เช็คสต็อกคงเหลือหน้างาน และยืนยันกำหนดนำเข้าจริง` }
          ]
        })
      }
    })

    // -------------------------------------------------------------
    // PILLAR 2: SHOPFLOOR BOTTLENECK & CAPACITY (ฝ่ายผลิต & คิวงาน)
    // -------------------------------------------------------------
    // Check overdue unstarted tasks (Past due and WAITING/PLANNED)
    const overdueTasks = logsList.filter(l => {
      const pDate = l.activity_date || l.end_date
      const isUnstarted = l.status === 'WAITING' || l.status === 'PLANNED'
      return pDate && pDate < todayStr && isUnstarted
    })

    if (overdueTasks.length > 0) {
      // Group by lot
      const overdueLotMap: Record<string, any[]> = {}
      overdueTasks.forEach(t => {
        const key = t.production_lots?.lot_no || 'ไม่ระบุ LOT'
        if (!overdueLotMap[key]) overdueLotMap[key] = []
        overdueLotMap[key].push(t)
      })

      Object.entries(overdueLotMap).slice(0, 3).forEach(([lotNo, tks]) => {
        const first = tks[0]
        const sku = first.production_lots?.products?.sku || 'SKU'
        const lotId = first.production_lots?.id
        const pPlan = parsePlanChangeInfo(first.note, first.activity_date, first.created_at)

        list.push({
          id: `floor-overdue-${lotNo}`,
          pillar: 'SHOPFLOOR',
          pillarLabel: 'ฝ่ายผลิต ➔ วางแผน',
          pillarIcon: Scale,
          topic: 'คิวงานค้างรอทบทวนวันผลิต',
          severity: 'CRITICAL',
          title: `คิวงานค้างรอทบทวนวันผลิต: LOT ${lotNo} (${sku})`,
          lotId,
          lotNo,
          sku,
          problemStatement: `พบคิวงาน ${tks.length} รายการ (เช่น ${first.processes?.process_name || 'งานผลิต'} ถัง ${first.tank_start}-${first.tank_end}) เลยวันตามแผน (${first.activity_date}) แต่หน้างานยังไม่ได้กดเริ่มงาน อาจทำให้รายงาน Master Radar แสดงผลคลาดเคลื่อน`,
          directorDirective: `ให้ฝ่ายวางแผนตรวจสอบว่างานนี้ติดรอของ หรือสลับคิวไปทำวันไหน หากเลื่อนแผนให้กดบันทึกปรับวันใหม่ในระบบทันที อย่าปล่อยให้แผนค้างย้อนหลัง เพื่อให้หน้างานมีลำดับคิวที่แท้จริง`,
          actionItems: [
            { dept: 'ฝ่ายวางแผน (PMC)', action: `ทบทวนและอัปเดตวันคิวงานจริงของ LOT ${lotNo}` },
            { dept: 'หัวหน้างานผลิต', action: `ยืนยันความพร้อมของสารเคมีและภาชนะบรรจุ` }
          ]
        })
      })
    }

    // Check mixing capacity bottleneck (> 3 tanks on any single day)
    const mixingByDay: Record<string, { tanks: number; lots: Set<string> }> = {}
    logsList.forEach(l => {
      const pName = (l.processes?.process_name || '').toLowerCase()
      if (pName.includes('ผสม') || pName.includes('mix')) {
        const d = l.activity_date || l.end_date
        if (d && d >= todayStr) {
          const sT = parseInt(l.tank_start) || 1
          const eT = parseInt(l.tank_end) || sT
          const count = Math.max(1, eT - sT + 1)
          if (!mixingByDay[d]) mixingByDay[d] = { tanks: 0, lots: new Set() }
          mixingByDay[d].tanks += count
          if (l.production_lots?.lot_no) mixingByDay[d].lots.add(l.production_lots.lot_no)
        }
      }
    })

    Object.entries(mixingByDay).forEach(([dayStr, data]) => {
      if (data.tanks >= 4) {
        list.push({
          id: `bottleneck-mix-${dayStr}`,
          pillar: 'SHOPFLOOR',
          pillarLabel: 'ฝ่ายผสม & ซ่อมบำรุง',
          pillarIcon: Beaker,
          topic: 'ตรวจพบจุดคอขวด หน้างานชั่งสาร ผสม หรือบรรจุ',
          severity: 'WARNING',
          title: `ตรวจพบจุดคอขวดงานผสม Bulk: ${data.tanks} ถัง ในวันเดียว`,
          problemStatement: `วันที่ ${new Date(dayStr).toLocaleDateString('th-TH')} มีคิวผสมแน่นหนาถึง ${data.tanks} ถัง (เกี่ยวข้องกับ LOT: ${Array.from(data.lots).join(', ')}) เสี่ยงต่อการใช้ถังผสมและระบบความร้อน/ทำความสะอาดไม่ทัน`,
          directorDirective: `คำสั่งการ: ให้ทีมชั่งสารเตรียมทำ Pre-weighing วัตถุดิบล่วงหน้า 1 วัน และให้แผนกผสมจัดกะการล้างถัง (CIP) ล่วงหน้า พร้อมให้ซ่อมบำรุงเตรียมความพร้อมระบบ Boiler/Chiller`,
          actionItems: [
            { dept: 'ฝ่ายผลิต (ชั่ง/ผสม)', action: `ชั่งสารตั้งต้นล่วงหน้า และวางลำดับการใช้ถังผสมเบอร์ 1-4` },
            { dept: 'ซ่อมบำรุง (Maintenance)', action: `Standby ระบบสาธารณูปโภค (ไอน้ำ, ลมอัด, น้ำหล่อเย็น)` }
          ]
        })
      }
    })

    // -------------------------------------------------------------
    // PILLAR 3: QC QUALITY GATE & FLOW (ฝ่ายประกันคุณภาพ QC/QA)
    // -------------------------------------------------------------
    // Check bulk waiting for QC
    const qcWaitingLogs = logsList.filter(l => {
      const pName = (l.processes?.process_name || '').toLowerCase()
      return pName.includes('รอ qc') || l.qc_status === 'WAITING' || l.qc_status === 'HOLD'
    })

    if (qcWaitingLogs.length > 0) {
      qcWaitingLogs.slice(0, 2).forEach(l => {
        const lotId = l.production_lots?.id
        const lotNo = l.production_lots?.lot_no || 'N/A'
        const sku = l.production_lots?.products?.sku || 'SKU'
        const isHold = l.qc_status === 'HOLD'
        list.push({
          id: `qc-waiting-${l.id}`,
          pillar: 'QC_GATE',
          pillarLabel: 'ฝ่าย QC ➔ บรรจุ',
          pillarIcon: ShieldCheck,
          topic: isHold ? 'ติดปัญหา NC/ Hold/ Reprocess' : 'เร่งรัดผลตรวจ QC (RM, PM, Bulk, FG)',
          severity: isHold ? 'CRITICAL' : 'WARNING',
          title: isHold ? `ติดปัญหา QC Hold: LOT ${lotNo} (${sku})` : `เร่งรัดผลตรวจแล็บ Bulk: LOT ${lotNo} (${sku})`,
          lotId,
          lotNo,
          sku,
          problemStatement: isHold 
            ? `เนื้อ Bulk ของ LOT ${lotNo} ติดสถานะ QC HOLD อยู่ระหว่างรอผลตรวจซ้ำหรือแนวทางแก้ไข Reprocess` 
            : `เนื้อ Bulk ของ LOT ${lotNo} อยู่ระหว่างรอผลตรวจแล็บ (QC Gate) ก่อนอนุญาตให้จ่ายสารเข้าสู่ไลน์บรรจุ`,
          directorDirective: isHold 
            ? `ขอให้ QA และ R&D เร่งประชุมวินิจฉัยสูตรแก้ไข Bulk ร่วมกับฝ่ายผลิตทันที และอัปเดตสถานะในระบบ`
            : `ขอให้ QC Analysis เร่งออกผลวิเคราะห์ทางกายภาพและเคมี (Appearance/pH/Viscosity ETC.ตามสเปค) และปล่อยผ่าน (QC passed) พร้อมติด Tag เขียว ก่อนเวลาเดินไลน์บรรจุอย่างน้อย 2 ชม.`,
          actionItems: [
            { dept: 'ฝ่ายประกันคุณภาพ (QC/QA)', action: `เร่งรันผลแล็บ วิเคราะห์ตามสเปค บันทึกสถานะ QC Pass ในระบบ พร้อมติด Tag เขียว` },
            { dept: 'ฝ่ายบรรจุ (Packing)', action: `เตรียมความพร้อมเครื่องจักรและกล่องบรรจุภัณฑ์รอรับ Bulk` }
          ]
        })
      })
    }

    // -------------------------------------------------------------
    // PILLAR 4: CUSTOMER DELIVERY COMMITMENT (ฝ่ายขาย & ส่งมอบ FG)
    // -------------------------------------------------------------
    // Check FG Due lots that are coming within 5 days
    fgDueLots.forEach(lot => {
      if (lot.current_status !== 'DONE' && lot.fg_due_date) {
        const dueDate = parseISO(lot.fg_due_date)
        const diffDays = Math.ceil((dueDate.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24))
        const sku = lot.products?.sku || 'SKU'
        const lotNo = lot.lot_no

        if (diffDays <= 3 && diffDays >= 0) {
          list.push({
            id: `fg-urgent-${lot.id}`,
            pillar: 'CUSTOMER_OTIF',
            pillarLabel: 'ส่งมอบ FG ➔ ฝ่ายขาย',
            pillarIcon: Gift,
            topic: 'กำหนดส่งมอบกระชั้นชิด',
            severity: 'CRITICAL',
            title: `กำหนดส่งมอบกระชั้นชิด (อีก ${diffDays} วัน): LOT ${lotNo} (${sku})`,
            lotId: lot.id,
            lotNo,
            sku,
            problemStatement: `LOT ${lotNo} (${sku}) มีกำหนดส่งมอบ FG ภายใน ${diffDays === 0 ? 'วันนี้' : `${diffDays} วันข้างหน้า`} (${new Date(lot.fg_due_date).toLocaleDateString('th-TH')}) ยอดสั่ง ${Number(lot.order_quantity || lot.planned_quantity || 0).toLocaleString()} ชิ้น`,
            directorDirective: `ขอให้หัวหน้าไลน์บรรจุเร่งปิดงานลงลัง และฝ่าย QC FG ตรวจปล่อยกล่องสุดท้ายโดยด่วน ฝ่ายคลังสินค้าประสานทีมขนส่งเพื่อจองรถส่งมอบให้ทันตามสัญญากับลูกค้า`,
            actionItems: [
              { dept: 'ฝ่ายบรรจุ & คลัง FG', action: `ตรวจนับยอดลงลังและเตรียมพาเลทติดป้ายพร้อมส่ง` },
              { dept: 'ฝ่ายขาย & โลจิสติกส์', action: `แจ้งยืนยันรอบรถและเวลาเข้าเทียบท่ากับลูกค้า` }
            ]
          })
        }
      }
    })

    // If no urgent issues found, generate proactive excellence directives
    if (list.length === 0) {
      list.push({
        id: 'excellence-status',
        pillar: 'SHOPFLOOR',
        pillarLabel: 'สถานะภาพรวมโรงงาน',
        pillarIcon: CheckCircle2,
        severity: 'OPPORTUNITY',
        title: 'สายงานการผลิตดำเนินงานราบรื่นและสอดคล้องกันทุกแผนก (On Track)',
        problemStatement: 'ไม่พบประเด็นคอขวดหรือความขัดแย้งระหว่างของเข้ากับการผลิตในช่วง 21 วันนี้',
        directorDirective: 'รักษามาตรฐานความปลอดภัย 5ส และการบันทึกข้อมูลหน้างานตามเวลาจริง (Real-time Execution) เพื่อรักษาคะแนน OTIF สูงสุด',
        actionItems: [
          { dept: 'ทุกฝ่าย', action: 'รักษามาตรฐานการผลิตตาม Good Manufacturing Practice (GMP)' }
        ]
      })
    }

    return list
  }, [etaList, logsList, fgDueLots, horizonDates, todayStr])

  const filteredDirectives = useMemo(() => {
    let list = directives
    if (activeFilter !== 'ALL') {
      list = list.filter(d => d.pillar === activeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(d => {
        const matchLot = d.lotNo ? d.lotNo.toLowerCase().includes(q) : false
        const matchSku = d.sku ? d.sku.toLowerCase().includes(q) : false
        const matchPo = d.poNo ? d.poNo.toLowerCase().includes(q) : false
        const matchTitle = d.title.toLowerCase().includes(q)
        const matchTopic = d.topic ? d.topic.toLowerCase().includes(q) : false
        const matchPillar = d.pillarLabel.toLowerCase().includes(q)
        const matchProblem = d.problemStatement.toLowerCase().includes(q)
        const effectiveDirective = customDirectives[d.id]?.text || d.directorDirective
        const matchDirective = effectiveDirective.toLowerCase().includes(q)
        const matchAction = d.actionItems.some(a => 
          a.dept.toLowerCase().includes(q) || a.action.toLowerCase().includes(q)
        )
        return matchLot || matchSku || matchPo || matchTitle || matchTopic || matchPillar || matchProblem || matchDirective || matchAction
      })
    }
    return list
  }, [directives, activeFilter, searchQuery, customDirectives])

  const criticalCount = directives.filter(d => d.severity === 'CRITICAL').length
  const warningCount = directives.filter(d => d.severity === 'WARNING').length

  const toggleExpandDirective = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    const allIds = filteredDirectives.map(d => d.id)
    setExpandedIds(new Set(allIds))
  }

  const handleCollapseAll = () => {
    setExpandedIds(new Set())
  }

  const toggleCollapseCategory = (key: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Edit & Customize Directive Handlers (Plant Director PDT)
  const handleStartEdit = (id: string, defaultText: string) => {
    setEditingId(id)
    const current = customDirectives[id]?.text !== undefined ? customDirectives[id].text : defaultText
    setEditText(current)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSaveEdit = async (id: string) => {
    const trimmed = editText.trim()
    if (!trimmed) {
      toast.error('กรุณาระบุข้อความข้อสั่งการ')
      return
    }

    setSavingId(id)
    const updatedRecord = {
      ...customDirectives,
      [id]: {
        text: trimmed,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Plant Director (PDT)'
      }
    }

    setCustomDirectives(updatedRecord)
    try {
      localStorage.setItem('cosmeflow_pdt_custom_directives', JSON.stringify(updatedRecord))
    } catch {}

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            setting_key: 'PLANT_DIRECTOR_CUSTOM_DIRECTIVES',
            setting_value: updatedRecord,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'setting_key' }
        )

      if (error) {
        console.error('Error saving custom directive to DB:', error)
        toast.warning('บันทึกในเครื่องเรียบร้อย (ระบบคลาวด์กำลังซิงค์)')
      } else {
        toast.success('บันทึกข้อสั่งการของ ผอ. เรียบร้อยแล้ว')
      }
    } catch (err) {
      console.error(err)
      toast.warning('บันทึกในเครื่องเรียบร้อย')
    } finally {
      setSavingId(null)
      setEditingId(null)
    }
  }

  const handleResetToAi = async (id: string) => {
    if (!confirm('คุณต้องการยกเลิกข้อสั่งการที่แก้ไข และคืนค่าเป็นคำแนะนำตั้งต้นของ AI หรือไม่?')) {
      return
    }

    setSavingId(id)
    const updatedRecord = { ...customDirectives }
    delete updatedRecord[id]

    setCustomDirectives(updatedRecord)
    try {
      localStorage.setItem('cosmeflow_pdt_custom_directives', JSON.stringify(updatedRecord))
    } catch {}

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            setting_key: 'PLANT_DIRECTOR_CUSTOM_DIRECTIVES',
            setting_value: updatedRecord,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'setting_key' }
        )

      if (error) {
        console.error('Error resetting directive in DB:', error)
      }
      toast.success('คืนค่าเดิมของ AI เรียบร้อยแล้ว')
    } catch (err) {
      console.error(err)
    } finally {
      setSavingId(null)
      setEditingId(null)
    }
  }

  // Memoized category and department counts for copy menu
  const categoryCounts = useMemo(() => {
    const supplyChain = directives.filter(d => d.pillar === 'SUPPLY_CHAIN')
    const shopfloor = directives.filter(d => d.pillar === 'SHOPFLOOR')
    const qcGate = directives.filter(d => d.pillar === 'QC_GATE')
    const customerOtif = directives.filter(d => d.pillar === 'CUSTOMER_OTIF')

    const purchasing = directives.filter(d => isDeptMatch(d, 'PURCHASING'))
    const planning = directives.filter(d => isDeptMatch(d, 'PLANNING'))
    const production = directives.filter(d => isDeptMatch(d, 'PRODUCTION'))
    const qc = directives.filter(d => isDeptMatch(d, 'QC'))
    const warehouse = directives.filter(d => isDeptMatch(d, 'WAREHOUSE'))

    return {
      supplyChain: supplyChain.length,
      shopfloor: shopfloor.length,
      qcGate: qcGate.length,
      customerOtif: customerOtif.length,
      purchasing: purchasing.length,
      planning: planning.length,
      production: production.length,
      qc: qc.length,
      warehouse: warehouse.length
    }
  }, [directives])

  // Copy directives to clipboard separated by 4 pillars or 5 operational departments
  const handleCopyByCategory = (category: CopyCategory) => {
    let listToCopy: PlantDirectorDirective[] = []
    let categoryTitle = ''
    let deptTarget: 'PURCHASING' | 'PLANNING' | 'PRODUCTION' | 'QC' | 'WAREHOUSE' | null = null

    switch (category) {
      case 'ALL':
        listToCopy = directives
        categoryTitle = 'ทุกสายงาน (ภาพรวม)'
        break
      case 'PILLAR_SUPPLY_CHAIN':
        listToCopy = directives.filter(d => d.pillar === 'SUPPLY_CHAIN')
        categoryTitle = 'จัดซื้อ ➔ ผลิต'
        break
      case 'PILLAR_SHOPFLOOR':
        listToCopy = directives.filter(d => d.pillar === 'SHOPFLOOR')
        categoryTitle = 'คิวผลิต & หน้างาน'
        break
      case 'PILLAR_QC_GATE':
        listToCopy = directives.filter(d => d.pillar === 'QC_GATE')
        categoryTitle = 'แล็บ QC ➔ บรรจุ'
        break
      case 'PILLAR_CUSTOMER_OTIF':
        listToCopy = directives.filter(d => d.pillar === 'CUSTOMER_OTIF')
        categoryTitle = 'ส่งมอบ FG ลูกค้า'
        break
      case 'DEPT_PURCHASING':
        deptTarget = 'PURCHASING'
        listToCopy = directives.filter(d => isDeptMatch(d, 'PURCHASING'))
        categoryTitle = 'ฝ่ายจัดซื้อ'
        break
      case 'DEPT_PLANNING':
        deptTarget = 'PLANNING'
        listToCopy = directives.filter(d => isDeptMatch(d, 'PLANNING'))
        categoryTitle = 'ฝ่ายวางแผน (PMC)'
        break
      case 'DEPT_PRODUCTION':
        deptTarget = 'PRODUCTION'
        listToCopy = directives.filter(d => isDeptMatch(d, 'PRODUCTION'))
        categoryTitle = 'ฝ่ายผลิต (ชั่ง/ผสม/บรรจุ)'
        break
      case 'DEPT_QC':
        deptTarget = 'QC'
        listToCopy = directives.filter(d => isDeptMatch(d, 'QC'))
        categoryTitle = 'ฝ่ายประกันคุณภาพ (QC/QA)'
        break
      case 'DEPT_WAREHOUSE':
        deptTarget = 'WAREHOUSE'
        listToCopy = directives.filter(d => isDeptMatch(d, 'WAREHOUSE'))
        categoryTitle = 'คลังสินค้า & โลจิสติกส์'
        break
    }

    const todayTh = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

    let message = ''

    if (category === 'ALL') {
      // Group by 4 pillars for clean, structured layout in LINE
      const pillars = [
        { key: 'SUPPLY_CHAIN', icon: '📦', label: '1. สายงานจัดซื้อ ➔ ผลิต (วัตถุดิบ/ปรับคิวชั่ง)' },
        { key: 'SHOPFLOOR', icon: '⚖️', label: '2. สายงานคิวผลิต & หน้างาน (คอขวดผสม-บรรจุ)' },
        { key: 'QC_GATE', icon: '🛡️', label: '3. สายงานแล็บ QC ➔ บรรจุ (ตรวจ Bulk/Hold/ปล่อยผ่าน)' },
        { key: 'CUSTOMER_OTIF', icon: '🎯', label: '4. สายงานส่งมอบ FG ลูกค้า (กำหนดส่งมอบกระชั้นชิด)' }
      ]

      const header = `👑 [ข้อสั่งการและสรุปประชุมเช้า Plant Director]\n📅 ประจำวันที่: ${todayTh}\n📊 รวมทั้งสิ้น: ${directives.length} ประเด็น\n==============================\n`

      let body = ''
      let globalIdx = 1

      pillars.forEach(p => {
        const pDirectives = directives.filter(d => d.pillar === p.key)
        if (pDirectives.length > 0) {
          body += `\n${p.icon} 【${p.label}】 (${pDirectives.length} ประเด็น)\n------------------------------\n`
          pDirectives.forEach(d => {
            const sevIcon = d.severity === 'CRITICAL' ? '🚨 [ด่วนที่สุด]' : d.severity === 'WARNING' ? '⚠️ [เฝ้าระวัง]' : '✅ [แนวทางปฏิบัติ]'
            const effectiveDirective = customDirectives[d.id]?.text || d.directorDirective
            const customTag = customDirectives[d.id]?.text ? ' (✍️ ผอ. ปรับปรุง)' : ''
            body += `${globalIdx}. ${sevIcon} ${d.title}\n• สภาพปัญหา: ${d.problemStatement}\n• ข้อสั่งการ ผอ.${customTag}: ${effectiveDirective}\n`
            if (d.actionItems && d.actionItems.length > 0) {
              body += `🎯 งานที่ต้องปฏิบัติ:\n`
              d.actionItems.forEach(a => {
                body += `   - ${a.dept}: ${a.action}\n`
              })
            }
            body += `\n`
            globalIdx++
          })
        }
      })

      if (directives.length === 0) {
        body = `\n✅ สถานะปกติ: สายงานการผลิตทุกแผนกดำเนินงานราบรื่น On Track\n\n`
      }

      const footer = `==============================\n📌 ขอให้ทุกฝ่ายประสานงานและถือปฏิบัติตามข้อสั่งการอย่างเคร่งครัด\nCosmeFlow AI Strategic Briefing`
      message = header + body + footer

    } else if (deptTarget) {
      // Department-focused copy
      const emojiMap = {
        PURCHASING: '🛍️',
        PLANNING: '📋',
        PRODUCTION: '🏭',
        QC: '🔬',
        WAREHOUSE: '🏢'
      }
      const icon = emojiMap[deptTarget]
      const header = `${icon} [ข้อสั่งการประชุมเช้า: ${categoryTitle}]\n📅 ประจำวันที่: ${todayTh}\n📊 จำนวน: ${listToCopy.length} รายการ\n==============================\n`

      let body = ''
      if (listToCopy.length === 0) {
        body = `\n✅ สถานะปกติ: ไม่พบประเด็นเร่งด่วนหรือข้อสั่งการตกค้างสำหรับ${categoryTitle}ในวันนี้\n\n`
      } else {
        listToCopy.forEach((d, idx) => {
          const sevIcon = d.severity === 'CRITICAL' ? '🚨 [ด่วนที่สุด]' : d.severity === 'WARNING' ? '⚠️ [เฝ้าระวัง]' : '✅ [แนวทางปฏิบัติ]'
          const effectiveDirective = customDirectives[d.id]?.text || d.directorDirective
          body += `\n${idx + 1}. ${sevIcon} ${d.title}\n• สภาพปัญหา: ${d.problemStatement}\n• ข้อสั่งการ ผอ.: ${effectiveDirective}\n`

          // Filter actions specifically relevant to this department
          const deptActions = d.actionItems.filter(a => {
            const aText = `${a.dept} ${a.action}`.toLowerCase()
            if (deptTarget === 'PURCHASING') return aText.includes('จัดซื้อ') || aText.includes('purchasing') || aText.includes('supplier')
            if (deptTarget === 'PLANNING') return aText.includes('วางแผน') || aText.includes('pmc') || aText.includes('plan')
            if (deptTarget === 'PRODUCTION') return aText.includes('ผลิต') || aText.includes('ชั่ง') || aText.includes('ผสม') || aText.includes('บรรจุ') || aText.includes('packing') || aText.includes('หัวหน้างาน')
            if (deptTarget === 'QC') return aText.includes('qc') || aText.includes('qa') || aText.includes('แล็บ') || aText.includes('คุณภาพ')
            if (deptTarget === 'WAREHOUSE') return aText.includes('คลัง') || aText.includes('warehouse') || aText.includes('ขนส่ง') || aText.includes('โลจิสติกส์') || aText.includes('สต็อก')
            return false
          })

          const actionsToShow = deptActions.length > 0 ? deptActions : d.actionItems
          if (actionsToShow.length > 0) {
            body += `👉 งานที่${categoryTitle}ต้องปฏิบัติ:\n`
            actionsToShow.forEach(a => {
              body += `   - ${a.dept}: ${a.action}\n`
            })
          }
        })
        body += `\n`
      }

      const footer = `==============================\n📌 ขอให้ผู้รับผิดชอบดำเนินการและรายงานความคืบหน้า\nCosmeFlow AI Strategic Briefing`
      message = header + body + footer

    } else {
      // Pillar-focused copy (4 สายงานหลัก)
      const pillarIcons: Record<string, string> = {
        PILLAR_SUPPLY_CHAIN: '📦',
        PILLAR_SHOPFLOOR: '⚖️',
        PILLAR_QC_GATE: '🛡️',
        PILLAR_CUSTOMER_OTIF: '🎯'
      }
      const icon = pillarIcons[category] || '👑'
      const header = `${icon} [ข้อสั่งการสายงาน: ${categoryTitle}]\n📅 ประจำวันที่: ${todayTh}\n📊 จำนวน: ${listToCopy.length} ประเด็น\n==============================\n`

      let body = ''
      if (listToCopy.length === 0) {
        body = `\n✅ สถานะปกติ: ไม่พบประเด็นเร่งด่วนหรือข้อสั่งการตกค้างในสายงานนี้\n\n`
      } else {
        listToCopy.forEach((d, idx) => {
          const sevIcon = d.severity === 'CRITICAL' ? '🚨 [ด่วนที่สุด]' : d.severity === 'WARNING' ? '⚠️ [เฝ้าระวัง]' : '✅ [แนวทางปฏิบัติ]'
          const effectiveDirective = customDirectives[d.id]?.text || d.directorDirective
          body += `\n${idx + 1}. ${sevIcon} ${d.title}\n• สภาพปัญหา: ${d.problemStatement}\n• ข้อสั่งการ ผอ.: ${effectiveDirective}\n`
          if (d.actionItems && d.actionItems.length > 0) {
            body += `🎯 งานที่ต้องปฏิบัติ (Action Items):\n`
            d.actionItems.forEach(a => {
              body += `   - ${a.dept}: ${a.action}\n`
            })
          }
        })
        body += `\n`
      }

      const footer = `==============================\n📌 ขอให้ผู้เกี่ยวข้องรับทราบและประสานงานทันที\nCosmeFlow AI Strategic Briefing`
      message = header + body + footer
    }

    navigator.clipboard.writeText(message).then(() => {
      setCopiedCategory(categoryTitle)
      setIsCopyMenuOpen(false)
      toast.success(`คัดลอกข้อสั่งการ [${categoryTitle}] เรียบร้อยแล้ว พร้อมวางใน LINE`)
      setTimeout(() => setCopiedCategory(null), 2500)
    }).catch(err => {
      console.error('Clipboard error:', err)
      toast.error('ไม่สามารถคัดลอกได้')
    })
  }

  return (
    <Card className={`rounded-2xl overflow-hidden relative mt-8 mb-8 transition-colors duration-300 ${
      isNight 
        ? 'bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] text-white border border-[#D4AF37]/50 shadow-2xl'
        : 'bg-[#FAF9F5] text-slate-800 border border-[#D4AF37]/60 shadow-xl'
    }`}>
      {/* Luxury Gold & Sapphire Top Accent */}
      <div className="h-1.5 bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37]"></div>

      <CardHeader className={`p-5 md:p-6 border-b transition-colors ${
        isNight 
          ? 'border-slate-800/80 bg-slate-900/50' 
          : 'border-[#E6DEC8] bg-gradient-to-r from-[#F6F2E9] via-[#FAF8F3] to-[#F6F2E9]'
      }`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border shadow-lg shrink-0 transition-colors ${
              isNight
                ? 'bg-gradient-to-br from-[#D4AF37]/30 to-amber-500/10 border-[#D4AF37]/50 text-[#D4AF37]'
                : 'bg-amber-100/80 border-[#D4AF37]/60 text-[#B8860B] shadow-sm'
            }`}>
              <Crown className={`w-7 h-7 animate-pulse ${isNight ? 'text-[#D4AF37]' : 'text-[#B8860B]'}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className={`text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 ${
                  isNight ? 'text-white' : 'text-slate-900'
                }`}>
                  <span>AI Plant Director Strategic Directives</span>
                </h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-inner flex items-center gap-1 ${
                  isNight 
                    ? 'text-amber-300 bg-amber-950/80 border border-amber-600/60' 
                    : 'text-amber-900 bg-amber-100 border border-amber-300 shadow-sm'
                }`}>
                  <Sparkles className={`w-3 h-3 ${isNight ? 'text-[#D4AF37]' : 'text-[#B8860B]'}`} /> คำแนะนำและข้อสั่งการระดับ ผอ.โรงงาน
                </span>
              </div>
              <p className={`text-xs mt-1 font-medium ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>
                ระบบวิเคราะห์ข้อมูลข้ามสายงาน (จัดซื้อ ➔ วางแผน ➔ คิวผลิตชั่ง/ผสม/บรรจุ ➔ QC ➔ ส่งมอบ) เพื่อให้ทุกฝ่ายปฏิบัติงานสอดคล้องกันอย่างไร้รอยต่อ
              </p>
            </div>
          </div>

          {/* KPI Alert Counter, Theme Switcher & Action Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {/* KPI Alert Counter */}
            <div className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs ${
              isNight ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <span className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                criticalCount > 0 
                  ? (isNight ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-rose-100 text-rose-800 border border-rose-200')
                  : (isNight ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}>
                <Flame className="w-3 h-3" /> ด่วน {criticalCount} ประเด็น
              </span>
              <span className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                warningCount > 0 
                  ? (isNight ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-amber-100 text-amber-800 border border-amber-200')
                  : (isNight ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}>
                <AlertTriangle className="w-3 h-3" /> เฝ้าระวัง {warningCount} จุด
              </span>
            </div>

            {/* Change Theme Button (Night / Light Mode) */}
            <Button
              type="button"
              variant="outline"
              onClick={toggleTheme}
              className={`text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 border font-bold ${
                isNight
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700 hover:text-amber-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900 shadow-sm'
              }`}
              title={isNight ? 'เปลี่ยนเป็นโหมดสว่าง (AI Plant Director)' : 'เปลี่ยนเป็นโหมดมืด (AI Plant Director)'}
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
            </Button>

            {/* Copy Morning Briefing Dropdown Button */}
            <Popover open={isCopyMenuOpen} onOpenChange={setIsCopyMenuOpen}>
              <PopoverTrigger className="bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-lg border border-amber-300/60 flex items-center gap-1.5 transition active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {copiedCategory ? `คัดลอก (${copiedCategory}) แล้ว!` : 'คัดลอกข้อสั่งการเข้า LINE ประชุมเช้า'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 ml-0.5 shrink-0 transition-transform duration-200 ${isCopyMenuOpen ? 'rotate-180' : ''}`} />
              </PopoverTrigger>

              <PopoverContent align="end" className={`w-[340px] sm:w-[430px] p-0 border shadow-2xl rounded-2xl overflow-hidden z-50 ${isNight ? 'bg-slate-900 border-[#D4AF37]/50 text-slate-200' : 'bg-white border-amber-300 text-slate-800'}`}>
                {/* Header */}
                <div className={`p-3.5 border-b ${isNight ? 'bg-slate-950/80 border-slate-800' : 'bg-amber-50/80 border-amber-200/70'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm shadow-inner">
                        📋
                      </span>
                      <div>
                        <div className={`text-xs font-black ${isNight ? 'text-amber-300' : 'text-amber-950'}`}>
                          คัดลอกข้อสั่งการเข้า LINE ประชุมเช้า
                        </div>
                        <div className={`text-[10px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                          เลือกคัดลอกแยกตามสายงาน เพื่อความกระชับ อ่านง่ายใน LINE
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCopyMenuOpen(false)}
                      className={`p-1 rounded-lg transition ${isNight ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-amber-100 text-slate-400 hover:text-slate-700'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-2.5 space-y-3">
                  {/* Option 1: Copy All */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleCopyByCategory('ALL')}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isNight
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-sm'
                          : 'bg-amber-50 hover:bg-amber-100/90 border-amber-300 text-amber-950 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">👑</span>
                        <div className="min-w-0">
                          <div className="text-xs font-black flex items-center gap-1.5">
                            <span>คัดลอกทั้งหมด (จัดหมวดหมู่แยกสายงาน)</span>
                          </div>
                          <div className="text-[10px] opacity-80 truncate">
                            รวมครบทุกประเด็น แบ่งหัวข้อตามสายงานอย่างเป็นระเบียบ
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isNight ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {directives.length} ประเด็น
                      </span>
                    </button>
                  </div>

                  {/* Option 2: 4 Strategic Pillars */}
                  <div>
                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                      isNight ? 'text-amber-400/80' : 'text-amber-900'
                    }`}>
                      <span>🏛️ แยกตาม 4 สายงานหลัก (Strategic Pillars)</span>
                      <span className="text-[9px] font-normal lowercase opacity-70">สั้นกระชับ</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                      {[
                        {
                          key: 'PILLAR_SUPPLY_CHAIN' as const,
                          icon: '📦',
                          title: '1. จัดซื้อ ➔ ผลิต',
                          desc: 'วัตถุดิบเลื่อน / ปรับคิวชั่ง',
                          count: categoryCounts.supplyChain
                        },
                        {
                          key: 'PILLAR_SHOPFLOOR' as const,
                          icon: '⚖️',
                          title: '2. คิวผลิต & หน้างาน',
                          desc: 'ค้างทบทวน / คอขวดผสม-บรรจุ',
                          count: categoryCounts.shopfloor
                        },
                        {
                          key: 'PILLAR_QC_GATE' as const,
                          icon: '🛡️',
                          title: '3. แล็บ QC ➔ บรรจุ',
                          desc: 'เร่งตรวจ Bulk / NC & Hold',
                          count: categoryCounts.qcGate
                        },
                        {
                          key: 'PILLAR_CUSTOMER_OTIF' as const,
                          icon: '🎯',
                          title: '4. ส่งมอบ FG ลูกค้า',
                          desc: 'ครบกำหนดส่งกระชั้นชิด',
                          count: categoryCounts.customerOtif
                        }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleCopyByCategory(item.key)}
                          className={`text-left p-2 rounded-xl border flex items-center justify-between transition-all ${
                            isNight
                              ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200'
                              : 'bg-slate-50 hover:bg-amber-50/70 border-slate-200 hover:border-amber-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{item.icon}</span>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold truncate">{item.title}</div>
                              <div className="text-[9.5px] opacity-70 truncate">{item.desc}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                            item.count > 0 
                              ? (isNight ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800')
                              : (isNight ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')
                          }`}>
                            {item.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 3: 5 Operational Departments */}
                  <div>
                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                      isNight ? 'text-amber-400/80' : 'text-amber-900'
                    }`}>
                      <span>🏢 แยกตามแผนกปฏิบัติการ (Departments)</span>
                      <span className="text-[9px] font-normal lowercase opacity-70">ส่งตรงกลุ่มไลน์ฝ่าย</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {[
                        {
                          key: 'DEPT_PURCHASING' as const,
                          icon: '🛍️',
                          title: 'ฝ่ายจัดซื้อ (Purchasing)',
                          desc: 'ติดตาม Supplier & วันเข้าวัตถุดิบ/บรรจุภัณฑ์',
                          count: categoryCounts.purchasing
                        },
                        {
                          key: 'DEPT_PLANNING' as const,
                          icon: '📋',
                          title: 'ฝ่ายวางแผน (Planning / PMC)',
                          desc: 'Re-plan ปรับวันคิวชั่ง ผสม บรรจุ และจัดการคิวค้าง',
                          count: categoryCounts.planning
                        },
                        {
                          key: 'DEPT_PRODUCTION' as const,
                          icon: '🏭',
                          title: 'ฝ่ายผลิต (ชั่งสาร / ผสม / บรรจุ)',
                          desc: 'บริหารคิวถังผสม จุดคอขวด และความพร้อมหน้างาน',
                          count: categoryCounts.production
                        },
                        {
                          key: 'DEPT_QC' as const,
                          icon: '🔬',
                          title: 'ฝ่ายประกันคุณภาพ (QC / QA)',
                          desc: 'เร่งรัดผลตรวจแล็บ Bulk, แก้ไข Hold/NC และปล่อยผ่าน',
                          count: categoryCounts.qc
                        },
                        {
                          key: 'DEPT_WAREHOUSE' as const,
                          icon: '🏢',
                          title: 'คลังสินค้า & โลจิสติกส์ (Warehouse)',
                          desc: 'ตรวจรับของ, เช็คสต็อก และเตรียมพาเลท FG ส่งมอบ',
                          count: categoryCounts.warehouse
                        }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleCopyByCategory(item.key)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all ${
                            isNight
                              ? 'bg-slate-800/60 hover:bg-slate-700/70 border-slate-700/80 text-slate-200'
                              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{item.icon}</span>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold truncate">{item.title}</div>
                              <div className="text-[9.5px] opacity-70 truncate">{item.desc}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-2 ${
                            item.count > 0 
                              ? (isNight ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800')
                              : (isNight ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')
                          }`}>
                            {item.count} รายการ
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Tip */}
                <div className={`p-2.5 text-center text-[10px] border-t font-medium ${
                  isNight ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  💡 ข้อความถูกจัดให้กระชับ พอดีหน้าจอมือถือ พร้อมกด Paste ใน LINE ประชุมเช้าได้ทันที
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 5 Workstream Group Frames / Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-5">
          {[
            {
              key: 'ALL' as const,
              emoji: '👑',
              label: 'ทั้งหมด',
              sublabel: 'ภาพรวมทุกสายงาน',
              count: directives.length,
              critical: criticalCount,
              warning: warningCount
            },
            {
              key: 'SUPPLY_CHAIN' as const,
              emoji: '📦',
              label: 'จัดซื้อ ➔ ผลิต',
              sublabel: 'วัตถุดิบเลื่อน / ปรับคิวชั่ง',
              count: directives.filter(d => d.pillar === 'SUPPLY_CHAIN').length,
              critical: directives.filter(d => d.pillar === 'SUPPLY_CHAIN' && d.severity === 'CRITICAL').length,
              warning: directives.filter(d => d.pillar === 'SUPPLY_CHAIN' && d.severity === 'WARNING').length
            },
            {
              key: 'SHOPFLOOR' as const,
              emoji: '⚖️',
              label: 'คิวผลิต & หน้างาน',
              sublabel: 'ค้างทบทวน / คอขวดผสม-บรรจุ',
              count: directives.filter(d => d.pillar === 'SHOPFLOOR').length,
              critical: directives.filter(d => d.pillar === 'SHOPFLOOR' && d.severity === 'CRITICAL').length,
              warning: directives.filter(d => d.pillar === 'SHOPFLOOR' && d.severity === 'WARNING').length
            },
            {
              key: 'QC_GATE' as const,
              emoji: '🛡️',
              label: 'แล็บ QC ➔ บรรจุ',
              sublabel: 'เร่งตรวจ Bulk / NC & Hold',
              count: directives.filter(d => d.pillar === 'QC_GATE').length,
              critical: directives.filter(d => d.pillar === 'QC_GATE' && d.severity === 'CRITICAL').length,
              warning: directives.filter(d => d.pillar === 'QC_GATE' && d.severity === 'WARNING').length
            },
            {
              key: 'CUSTOMER_OTIF' as const,
              emoji: '🎯',
              label: 'ส่งมอบ FG ลูกค้า',
              sublabel: 'ครบกำหนดส่งกระชั้นชิด',
              count: directives.filter(d => d.pillar === 'CUSTOMER_OTIF').length,
              critical: directives.filter(d => d.pillar === 'CUSTOMER_OTIF' && d.severity === 'CRITICAL').length,
              warning: directives.filter(d => d.pillar === 'CUSTOMER_OTIF' && d.severity === 'WARNING').length
            }
          ].map(card => {
            const isSelected = activeFilter === card.key
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveFilter(card.key)}
                className={`text-left p-3 md:p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden group flex flex-col justify-between ${
                  card.key === 'ALL' ? 'col-span-2 sm:col-span-1' : ''
                } ${
                  isSelected
                    ? isNight
                      ? 'bg-gradient-to-b from-amber-500/25 via-slate-900 to-slate-900 border-[#D4AF37] ring-2 ring-[#D4AF37]/70 shadow-lg shadow-amber-950/40 text-white'
                      : 'bg-gradient-to-b from-amber-50 to-amber-100/70 border-[#B8860B] ring-2 ring-[#B8860B]/70 shadow-md text-slate-900'
                    : isNight
                      ? 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm'
                }`}
              >
                {/* Top: Emoji + Label + Active pill + Quick Copy */}
                <div className="flex items-center justify-between gap-1 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base md:text-lg shrink-0 leading-none">{card.emoji}</span>
                    <span className={`text-xs font-black truncate ${
                      isSelected 
                        ? (isNight ? 'text-amber-300' : 'text-amber-950')
                        : (isNight ? 'text-slate-200 group-hover:text-white' : 'text-slate-800')
                    }`}>
                      {card.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                        isNight ? 'bg-[#D4AF37] text-slate-950' : 'bg-[#B8860B] text-white'
                      }`}>
                        กำลังดู
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        const cat = card.key === 'ALL' ? 'ALL' : (`PILLAR_${card.key}` as CopyCategory)
                        handleCopyByCategory(cat)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          const cat = card.key === 'ALL' ? 'ALL' : (`PILLAR_${card.key}` as CopyCategory)
                          handleCopyByCategory(cat)
                        }
                      }}
                      className={`p-1 rounded-md transition ${
                        isNight 
                          ? 'hover:bg-slate-700 text-slate-400 hover:text-amber-300' 
                          : 'hover:bg-amber-100 text-slate-400 hover:text-amber-800'
                      }`}
                      title={`คัดลอกเฉพาะสายงาน "${card.label}" เข้า LINE`}
                    >
                      <Copy className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Count and Status breakdown */}
                <div className="mt-2.5 flex items-baseline justify-between gap-1">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl md:text-3xl font-black font-mono leading-none ${
                      isSelected
                        ? (isNight ? 'text-white' : 'text-slate-950')
                        : (isNight ? 'text-slate-200' : 'text-slate-800')
                    }`}>
                      {card.count}
                    </span>
                    <span className={`text-[11px] font-semibold ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                      ประเด็น
                    </span>
                  </div>

                  {/* Critical / Warning badges */}
                  <div className="flex items-center gap-1 shrink-0">
                    {card.critical > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40" title="ด่วนที่สุด">
                        🚨 {card.critical}
                      </span>
                    )}
                    {card.warning > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40" title="เฝ้าระวัง">
                        ⚠️ {card.warning}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle */}
                <p className={`text-[10px] mt-1.5 font-medium truncate ${
                  isSelected 
                    ? (isNight ? 'text-amber-200/90 font-semibold' : 'text-amber-900 font-semibold')
                    : (isNight ? 'text-slate-400' : 'text-slate-500')
                }`}>
                  {card.sublabel}
                </p>
              </button>
            )
          })}
        </div>

        {/* Toolbar: Search Input & Expand/Collapse All Buttons */}
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-4 pt-3 border-t text-xs ${
          isNight ? 'border-slate-800/70' : 'border-[#E6DEC8]'
        }`}>
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              isNight ? 'text-amber-400/80' : 'text-slate-400'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสงาน (LOT, PO, SKU), หน้างาน หรือหัวข้อประเด็น..."
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition shadow-inner ${
                isNight 
                  ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder:text-slate-400 focus:border-[#D4AF37]' 
                  : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#D4AF37] shadow-sm'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition ${
                  isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="ล้างการค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Expand All / Collapse All Controls */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              className={`text-xs px-2.5 py-1.5 h-auto rounded-xl flex items-center gap-1 font-bold border transition ${
                isNight 
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-slate-900 shadow-sm'
              }`}
              title="ขยายทุกการ์ดเพื่อดูรายละเอียดเต็ม"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
              <span>ขยายทั้งหมด</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              className={`text-xs px-2.5 py-1.5 h-auto rounded-xl flex items-center gap-1 font-bold border transition ${
                isNight 
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:text-slate-900 shadow-sm'
              }`}
              title="ย่อทุกการ์ดเหลือแบบกระชับ (Accordion)"
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>ย่อทั้งหมด</span>
            </Button>

            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ml-1 ${
              isNight ? 'bg-slate-900/60 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              แสดง {filteredDirectives.length} รายการ
            </span>
          </div>
        </div>

        {/* Search feedback bar if searchQuery active */}
        {searchQuery.trim() && (
          <div className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-xl mt-3 border ${
            isNight 
              ? 'text-amber-300 bg-amber-950/40 border-amber-800/50' 
              : 'text-amber-900 bg-amber-50 border-amber-200'
          }`}>
            <span className="flex items-center gap-1.5">
              <Search className={`w-3.5 h-3.5 ${isNight ? 'text-[#D4AF37]' : 'text-[#B8860B]'}`} />
              ผลการค้นหาสำหรับ <strong className={isNight ? 'text-white' : 'text-slate-900'}>"{searchQuery}"</strong>: พบ {filteredDirectives.length} รายการ
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`text-[11px] underline hover:no-underline font-medium cursor-pointer ${
                isNight ? 'text-amber-400 hover:text-white' : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              ล้างคำค้นหา (แสดงทั้งหมด)
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-5">
        {filteredDirectives.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border ${
            isNight ? 'text-slate-400 bg-slate-900/40 border-slate-800' : 'text-slate-500 bg-white border-slate-200'
          }`}>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className={`text-sm font-semibold ${isNight ? 'text-slate-200' : 'text-slate-800'}`}>
              {searchQuery.trim() ? `ไม่พบข้อสั่งการที่ตรงกับคำค้นหา "${searchQuery}"` : 'ไม่มีประเด็นความขัดแย้งในมุมมองนี้'}
            </p>
            <p className={`text-xs mt-0.5 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery.trim() ? 'ลองเปลี่ยนคำค้นหาเป็น รหัส LOT, PO หรือชื่อหน้างาน' : 'ทุกขั้นตอนดำเนินงานสอดคล้องตามแผนงานโรงงาน'}
            </p>
            {searchQuery.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className={`mt-3 text-xs ${
                  isNight 
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ล้างคำค้นหา
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-5">
            {[
              {
                pillar: 'SUPPLY_CHAIN' as const,
                emoji: '📦',
                label: 'จัดซื้อ ➔ ผลิต',
                title: 'สายงานจัดซื้อ ➔ ผลิต (Supply Chain ➔ Production)',
                desc: 'วัตถุดิบและบรรจุภัณฑ์เลื่อนเข้า กระทบคิวชั่งสารและเริ่มผลิต',
                borderColorNight: 'border-amber-500/40',
                borderColorLight: 'border-amber-300',
                headerBgNight: 'bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/50',
                headerBgLight: 'bg-gradient-to-r from-amber-50 via-orange-50/40 to-slate-50',
                accentColor: 'text-amber-400'
              },
              {
                pillar: 'SHOPFLOOR' as const,
                emoji: '⚖️',
                label: 'คิวผลิต & หน้างาน',
                title: 'สายงานคิวผลิต & หน้างานชั่ง ผสม บรรจุ (Shopfloor Operations)',
                desc: 'คิวงานค้างเลยกำหนดรอทบทวนวันผลิต และจุดตรวจพบคอขวดหน้างานชั่ง-ผสม-บรรจุ',
                borderColorNight: 'border-blue-500/40',
                borderColorLight: 'border-blue-300',
                headerBgNight: 'bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-slate-900/50',
                headerBgLight: 'bg-gradient-to-r from-blue-50 via-sky-50/40 to-slate-50',
                accentColor: 'text-blue-400'
              },
              {
                pillar: 'QC_GATE' as const,
                emoji: '🛡️',
                label: 'แล็บ QC ➔ บรรจุ',
                title: 'สายงานตรวจสอบคุณภาพแล็บ QC ➔ ปล่อยบรรจุ (Quality Gate)',
                desc: 'เร่งรัดผลตรวจวิเคราะห์แล็บ Bulk/RM และงานติดสถานะ NC / Hold / Reprocess',
                borderColorNight: 'border-purple-500/40',
                borderColorLight: 'border-purple-300',
                headerBgNight: 'bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-slate-900/50',
                headerBgLight: 'bg-gradient-to-r from-purple-50 via-fuchsia-50/40 to-slate-50',
                accentColor: 'text-purple-400'
              },
              {
                pillar: 'CUSTOMER_OTIF' as const,
                emoji: '🎯',
                label: 'ส่งมอบ FG ลูกค้า',
                title: 'สายงานส่งมอบสินค้าสำเร็จรูป (Customer OTIF Delivery)',
                desc: 'ออเดอร์ใกล้ครบกำหนดส่งมอบลูกค้า ต้องควบคุมขั้นตอนสุดท้ายให้ทันกำหนด 100%',
                borderColorNight: 'border-emerald-500/40',
                borderColorLight: 'border-emerald-300',
                headerBgNight: 'bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/50',
                headerBgLight: 'bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50',
                accentColor: 'text-emerald-400'
              }
            ]
              .filter(cat => activeFilter === 'ALL' || activeFilter === cat.pillar)
              .map(cat => {
                const catItems = filteredDirectives.filter(d => d.pillar === cat.pillar)
                if (catItems.length === 0) return null

                const isCollapsed = collapsedCategories.has(cat.pillar)

                return (
                  <div
                    key={cat.pillar}
                    className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                      isNight ? `${cat.borderColorNight} bg-slate-900/70` : `${cat.borderColorLight} bg-white shadow-sm`
                    }`}
                  >
                    {/* Category Frame Header */}
                    <div
                      onClick={() => toggleCollapseCategory(cat.pillar)}
                      className={`p-3.5 md:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition ${
                        isNight ? cat.headerBgNight : cat.headerBgLight
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0 leading-none">{cat.emoji}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`text-sm md:text-base font-black ${
                              isNight ? 'text-white' : 'text-slate-900'
                            }`}>
                              {cat.title}
                            </h4>
                            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                              isNight ? 'bg-slate-800 text-amber-300 border border-slate-700' : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {catItems.length} ประเด็น
                            </span>
                          </div>
                          <p className={`text-[11px] font-normal truncate mt-0.5 ${
                            isNight ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {cat.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold hidden sm:inline ${
                          isNight ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {isCollapsed ? 'คลิกเพื่อกางออก' : 'คลิกเพื่อย่อหมวด'}
                        </span>
                        <div className={`p-1.5 rounded-lg border transition ${
                          isNight ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Frame Directives List (Accordion items) */}
                    {!isCollapsed && (
                      <div className={`p-3 md:p-4 space-y-2.5 border-t ${
                        isNight ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
                      }`}>
                        {catItems.map((d) => {
                          const isExpanded = expandedIds.has(d.id)
                          const isCritical = d.severity === 'CRITICAL'
                          const isWarning = d.severity === 'WARNING'
                          const globalIdx = directives.findIndex(x => x.id === d.id) + 1

                          return (
                            <div
                              key={d.id}
                              className={`rounded-xl border transition-all duration-200 overflow-hidden relative ${
                                isNight
                                  ? isCritical
                                    ? 'bg-slate-900/95 border-rose-500/50 hover:border-rose-400 shadow-sm'
                                    : isWarning
                                    ? 'bg-slate-900/95 border-amber-500/40 hover:border-amber-400 shadow-sm'
                                    : 'bg-slate-900/95 border-emerald-500/40 hover:border-emerald-400'
                                  : isCritical
                                    ? 'bg-white border-rose-300 hover:border-rose-400 shadow-sm'
                                    : isWarning
                                    ? 'bg-white border-amber-300 hover:border-amber-400 shadow-sm'
                                    : 'bg-white border-emerald-300 hover:border-emerald-400 shadow-sm'
                              }`}
                            >
                              {/* Left severity indicator bar */}
                              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                                isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                              }`} />

                              {/* Clickable Header / Summary Row */}
                              <div
                                onClick={() => toggleExpandDirective(d.id)}
                                className={`pl-4 pr-3 py-2.5 md:py-3 cursor-pointer select-none transition flex flex-col gap-1.5 ${
                                  isNight ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                                }`}
                              >
                                {/* Meta Row: Index, Topic badge, LOT, PO, Severity & Expand Button */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Index - Large & Prominent */}
                                    <span className={`text-sm sm:text-base md:text-lg font-black font-mono px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl border shadow-sm tracking-tight inline-flex items-center justify-center shrink-0 ${
                                      isNight 
                                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/20' 
                                        : 'bg-slate-900 text-amber-300 border-slate-800 shadow-slate-400/40'
                                    }`}>
                                      #{globalIdx}
                                    </span>

                                    {/* Topic Badge */}
                                    {d.topic && (
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                        d.topic.includes('เลื่อน') || d.topic.includes('เข้าช้า')
                                          ? (isNight ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-200')
                                          : d.topic.includes('คอขวด') || d.topic.includes('ค้าง')
                                          ? (isNight ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-blue-100 text-blue-800 border-blue-200')
                                          : d.topic.includes('NC') || d.topic.includes('Hold') || d.topic.includes('QC')
                                          ? (isNight ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-800 border-purple-200')
                                          : (isNight ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-200')
                                      }`}>
                                        {d.topic}
                                      </span>
                                    )}

                                    {/* LOT Badge */}
                                    {d.lotNo && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono flex items-center gap-1 border ${
                                        isNight 
                                          ? 'text-amber-300 bg-amber-950/70 border-amber-700/60' 
                                          : 'text-amber-800 bg-amber-50 border-amber-300'
                                      }`}>
                                        <span className={isNight ? 'text-amber-400' : 'text-amber-600'}>LOT:</span> 
                                        <span className={isNight ? 'text-white font-black' : 'text-slate-900 font-black'}>{d.lotNo}</span>
                                      </span>
                                    )}

                                    {/* PO Badge */}
                                    {d.poNo && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono flex items-center gap-1 border ${
                                        isNight 
                                          ? 'text-cyan-300 bg-cyan-950/70 border-cyan-700/60' 
                                          : 'text-sky-800 bg-sky-50 border-sky-300'
                                      }`}>
                                        <span className={isNight ? 'text-cyan-400' : 'text-sky-600'}>PO:</span> 
                                        <span className={isNight ? 'text-white font-black' : 'text-slate-900 font-black'}>{d.poNo}</span>
                                      </span>
                                    )}

                                    {/* SKU Badge */}
                                    {d.sku && (
                                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border hidden sm:inline ${
                                        isNight ? 'text-slate-300 bg-slate-800/80 border-slate-700' : 'text-slate-700 bg-slate-100 border-slate-200'
                                      }`}>
                                        {d.sku}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Severity Pill */}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                      isCritical
                                        ? 'bg-rose-600 text-white font-black'
                                        : isWarning
                                        ? 'bg-amber-600 text-white font-black'
                                        : 'bg-emerald-600 text-white font-black'
                                    }`}>
                                      {isCritical ? '🚨 ด่วนที่สุด' : isWarning ? '⚠️ เฝ้าระวัง' : '✅ ปกติ'}
                                    </span>

                                    {/* Accordion Expand / Collapse toggle button */}
                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border transition ${
                                      isExpanded
                                        ? (isNight ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37]' : 'bg-slate-900 text-white border-slate-900')
                                        : (isNight ? 'bg-slate-800/90 text-[#D4AF37] border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-[#B8860B] border-slate-200 hover:bg-slate-200')
                                    }`}>
                                      {isExpanded ? (
                                        <>
                                          <span>ย่อรายละเอียด</span>
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        </>
                                      ) : (
                                        <>
                                          <span>คลิกดูรายละเอียด</span>
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Title */}
                                <h5 className={`font-bold text-sm md:text-base leading-snug ${
                                  isNight ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {d.title}
                                </h5>

                                {/* Collapsed Teaser: One-line snapshot */}
                                {!isExpanded && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`text-xs truncate font-medium flex-1 ${
                                      isNight ? 'text-slate-400' : 'text-slate-600'
                                    }`}>
                                      <span className={isNight ? 'text-amber-400 font-bold' : 'text-amber-700 font-bold'}>➔ ข้อสั่งการ: </span>
                                      {customDirectives[d.id]?.text || d.directorDirective}
                                    </p>
                                    {customDirectives[d.id]?.text && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 border ${
                                        isNight ? 'bg-amber-400/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-900 border-amber-300'
                                      }`}>
                                        <Edit3 className="w-2.5 h-2.5" /> ผอ. สั่งการเพิ่ม
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Expanded Detailed Content */}
                              {isExpanded && (
                                <div className={`px-4 pb-4 pt-2 border-t space-y-3 ${
                                  isNight ? 'border-slate-800/90 bg-slate-950/60' : 'border-slate-200/80 bg-slate-50/70'
                                }`}>
                                  {/* Shopfloor Fact */}
                                  <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                                    isNight 
                                      ? 'bg-slate-900/90 border-slate-800 text-slate-200' 
                                      : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                                  }`}>
                                    <span className={`font-bold flex items-center gap-1.5 mb-1 ${
                                      isNight ? 'text-amber-300' : 'text-amber-800'
                                    }`}>
                                      <Search className={`w-3.5 h-3.5 ${isNight ? 'text-amber-400' : 'text-amber-600'}`} />
                                      ข้อเท็จจริงหน้างาน (Shopfloor Fact):
                                    </span>
                                    <p className={`pl-5 font-normal ${isNight ? 'text-slate-200' : 'text-slate-700'}`}>
                                      {d.problemStatement}
                                    </p>
                                  </div>

                                  {/* Plant Director Guide & Action Items */}
                                  <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                                    isNight
                                      ? 'bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-950/90 border-[#D4AF37]/50'
                                      : 'bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/70 border-amber-300/80 shadow-sm'
                                  }`}>
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className={`flex items-center gap-1.5 text-xs font-black ${
                                        isNight ? 'text-[#D4AF37]' : 'text-amber-900'
                                      }`}>
                                        <Crown className={`w-4 h-4 ${isNight ? 'text-[#D4AF37]' : 'text-[#B8860B]'}`} />
                                        <span>ข้อสั่งการและแนวทางปฏิบัติ (Plant Director Guide):</span>
                                        {customDirectives[d.id]?.text && (
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                            isNight ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300'
                                          }`}>
                                            ✍️ ปรับปรุงโดย ผอ. (PDT)
                                          </span>
                                        )}
                                      </div>

                                      {/* Edit / Add Directive Button */}
                                      {editingId !== d.id && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleStartEdit(d.id, d.directorDirective)
                                          }}
                                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition active:scale-95 ${
                                            isNight
                                              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40 shadow-sm'
                                              : 'bg-white hover:bg-amber-50 text-amber-900 border-amber-300 shadow-sm'
                                          }`}
                                          title="แก้ไขหรือพิมพ์ข้อสั่งการเพิ่มเติมสำหรับประเด็นนี้"
                                        >
                                          <Edit3 className="w-3 h-3 text-amber-500" />
                                          <span>{customDirectives[d.id]?.text ? 'แก้ไขข้อสั่งการ' : 'แก้ไข / สั่งการเพิ่ม'}</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Directives Content: Editing vs View Mode */}
                                    {editingId === d.id ? (
                                      <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative">
                                          <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            rows={3}
                                            placeholder="พิมพ์ข้อสั่งการ แนวทางแก้ไข หรือคำแนะนำเพิ่มเติมของ ผอ.โรงงาน..."
                                            className={`w-full p-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#D4AF37] border leading-relaxed transition ${
                                              isNight
                                                ? 'bg-slate-950 border-amber-500/50 text-white placeholder:text-slate-500'
                                                : 'bg-white border-amber-400 text-slate-900 placeholder:text-slate-400 shadow-inner'
                                            }`}
                                            autoFocus
                                          />
                                        </div>

                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <div className="flex items-center gap-2">
                                            {customDirectives[d.id]?.text && (
                                              <button
                                                type="button"
                                                disabled={savingId === d.id}
                                                onClick={() => handleResetToAi(d.id)}
                                                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                                                  isNight 
                                                    ? 'text-slate-400 hover:text-rose-300 hover:bg-slate-800' 
                                                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                                }`}
                                                title="ยกเลิกข้อสั่งการที่แก้ไข และคืนค่าเป็นข้อความเริ่มต้นของ AI"
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                                <span>คืนค่าเดิมของ AI</span>
                                              </button>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              disabled={savingId === d.id}
                                              onClick={handleCancelEdit}
                                              className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition ${
                                                isNight
                                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                              }`}
                                            >
                                              ยกเลิก
                                            </button>
                                            <button
                                              type="button"
                                              disabled={savingId === d.id}
                                              onClick={() => handleSaveEdit(d.id)}
                                              className="text-xs px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-600 text-slate-950 shadow-md flex items-center gap-1.5 active:scale-95 transition"
                                            >
                                              {savingId === d.id ? (
                                                <>
                                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                                  <span>กำลังบันทึก...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                  <span>บันทึกข้อสั่งการ</span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className={`text-xs leading-relaxed font-medium pl-3 border-l-2 ${
                                          isNight ? 'text-amber-100/95 border-[#D4AF37]' : 'text-slate-800 border-[#D4AF37]'
                                        }`}>
                                          {customDirectives[d.id]?.text || d.directorDirective}
                                        </p>
                                        {customDirectives[d.id]?.updatedAt && (
                                          <p className={`text-[10px] pl-3 mt-1.5 flex items-center gap-1 ${
                                            isNight ? 'text-amber-400/70' : 'text-amber-700/80'
                                          }`}>
                                            <Clock className="w-3 h-3" />
                                            <span>
                                              แก้ไขล่าสุดเมื่อ {format(parseISO(customDirectives[d.id].updatedAt!), 'dd/MM/yyyy HH:mm')} น. โดย ผอ. (PDT)
                                            </span>
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Department Action Checkpoints */}
                                    <div className={`pt-2 border-t space-y-1 text-xs ${
                                      isNight ? 'border-slate-800/80' : 'border-amber-200/80'
                                    }`}>
                                      {d.actionItems.map((act, actIdx) => (
                                        <div key={actIdx} className="flex items-start gap-2 pl-1">
                                          <span className={`font-bold shrink-0 ${isNight ? 'text-amber-400' : 'text-amber-800'}`}>
                                            ➔ [{act.dept}]:
                                          </span>
                                          <span className={`leading-snug ${isNight ? 'text-slate-200' : 'text-slate-700 font-medium'}`}>
                                            {act.action}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Expanded Footer Controls */}
                                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                                    {d.lotNo && onSelectLot ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (d.lotId) {
                                            onSelectLot(d.lotId)
                                          } else {
                                            const matchedLot = 
                                              fgDueLots.find(l => l.lot_no === d.lotNo && (!d.sku || l.products?.sku === d.sku)) ||
                                              logsList.find(l => l.production_lots?.lot_no === d.lotNo && (!d.sku || l.production_lots?.products?.sku === d.sku))?.production_lots ||
                                              fgDueLots.find(l => l.lot_no === d.lotNo) ||
                                              logsList.find(l => l.production_lots?.lot_no === d.lotNo)?.production_lots

                                            if (matchedLot?.id) onSelectLot(matchedLot.id)
                                          }

                                          // Smoothly scroll down to Digital Twin Pipeline
                                          setTimeout(() => {
                                            const pipelineEl = document.getElementById('digital-twin-pipeline')
                                            if (pipelineEl) {
                                              pipelineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                            }
                                          }, 80)
                                        }}
                                        className={`text-[11px] font-bold flex items-center gap-1 px-3 py-1 rounded-lg border transition ${
                                          isNight 
                                            ? 'text-[#D4AF37] hover:text-amber-300 bg-slate-800/80 border-slate-700' 
                                            : 'text-[#B8860B] hover:text-amber-800 bg-amber-50 border-amber-200 shadow-sm'
                                        }`}
                                      >
                                        เปิดดูกราฟ LOT {d.lotNo} {d.sku ? `(${d.sku})` : ''} <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    ) : <div />}

                                    <button
                                      type="button"
                                      onClick={() => toggleExpandDirective(d.id)}
                                      className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                                        isNight ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      ย่อรายละเอียด ▴
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
