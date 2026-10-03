"use client";

import React, { useState, useEffect, useMemo } from 'react'
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  PlusCircle, 
  CheckCircle2, 
  Filter, 
  Search, 
  RefreshCw, 
  Layers, 
  Box, 
  FlaskConical, 
  Package, 
  TrendingUp, 
  Clock, 
  User, 
  FileText, 
  Eye, 
  Lock, 
  Unlock, 
  Camera, 
  Sparkles, 
  Bell, 
  X, 
  ChevronRight, 
  AlertCircle,
  HelpCircle,
  Building2,
  MapPin,
  Send,
  Check,
  FileCheck,
  BarChart3,
  History,
  Archive,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { toast } from 'sonner'
import { 
  QmsQualityEvent, 
  QmsSeverity, 
  QmsRiskLevel, 
  QmsWorkflowPath, 
  QmsDestinationMarket, 
  QmsEventType, 
  QmsEventStatus,
  QmsContainmentAction,
  QmsContainmentActionType,
  QmsInitialImpactAssessment
} from '@/types/qms'
import { 
  getMasterDataForQms, 
  getQmsDashboardStats, 
  getQualityEvents, 
  getQualityEventById, 
  reportQualityEvent, 
  triageQualityEvent, 
  addContainmentAction, 
  executeContainmentAction, 
  verifyContainmentAction, 
  fastCloseQualityEvent, 
  reopenQualityEvent, 
  getInAppNotifications, 
  acknowledgeNotification 
} from '@/app/actions/qms'
import InvestigationCockpit from '@/components/qms/InvestigationCockpit'
import CapaWorkspace from '@/components/qms/CapaWorkspace'
import MyCapaWork from '@/components/qms/MyCapaWork'
import CapaRegister from '@/components/qms/CapaRegister'
import ShopfloorQualityStreamView from '@/components/qms/ShopfloorQualityStreamView'
import EffectivenessWorkspace from '@/components/qms/EffectivenessWorkspace'
import { BatchReleaseRegister } from '@/components/qms/BatchReleaseRegister'
import { BatchReleaseCockpit } from '@/components/qms/BatchReleaseCockpit'
import QualityIntelligenceCenter from '@/components/qms/QualityIntelligenceCenter'
import { QhsScoreBreakdownModal } from '@/components/qms/QhsScoreBreakdownModal'
import { getAllCapas } from '@/app/actions/qms_capa'

const IMPACT_QUESTIONS: {
  key: keyof QmsInitialImpactAssessment
  title: string
  subtitle: string
  desc: string
}[] = [
  {
    key: 'product_quality',
    title: 'Product Quality',
    subtitle: 'คุณภาพผลิตภัณฑ์',
    desc: 'คุณภาพผลิตภัณฑ์ได้รับผลกระทบหรือไม่?'
  },
  {
    key: 'consumer_safety',
    title: 'Consumer Safety',
    subtitle: 'ความปลอดภัยผู้บริโภค',
    desc: 'มีโอกาสกระทบความปลอดภัยของผู้บริโภคหรือไม่?'
  },
  {
    key: 'regulatory_labeling',
    title: 'Regulatory / Labeling',
    subtitle: 'กฎหมาย / ฉลาก / อย.',
    desc: 'มีผลต่อข้อกำหนดกฎหมาย ฉลาก หรือข้อมูลที่ขึ้นทะเบียนหรือไม่?'
  },
  {
    key: 'gmp_compliance',
    title: 'GMP Compliance',
    subtitle: 'มาตรฐาน GMP สากล',
    desc: 'มีผลต่อการปฏิบัติตามมาตรฐาน GMP (ISO 22716 / ASEAN GMP) หรือไม่?'
  },
  {
    key: 'customer_requirement',
    title: 'Customer Requirement',
    subtitle: 'ข้อกำหนดลูกค้า OEM',
    desc: 'กระทบ Spec หรือข้อกำหนดเฉพาะของลูกค้า OEM หรือไม่?'
  },
  {
    key: 'production_batch',
    title: 'Production / Batch',
    subtitle: 'แบทช์ผลิตปัจจุบัน',
    desc: 'กระทบ Bulk, Batch ผลิต หรือ Packaging ที่กำลังดำเนินอยู่หรือไม่?'
  },
  {
    key: 'other_batch_market',
    title: 'Other Batch / Market',
    subtitle: 'แบทช์อื่น / สู่ตลาด',
    desc: 'มีโอกาสกระทบ Batch อื่นในโรงงาน หรือสินค้าที่ปล่อยออกไปแล้วหรือไม่?'
  }
]

const CONTAINMENT_CHOICES = [
  { id: 'Hold Production Batch', label: 'Hold Production Batch', desc: 'อายัดแบทช์ผลิต' },
  { id: 'Hold Bulk', label: 'Hold Bulk', desc: 'อายัดเนื้อ Bulk' },
  { id: 'Hold RM', label: 'Hold RM', desc: 'อายัดวัตถุดิบ' },
  { id: 'Hold PM', label: 'Hold PM', desc: 'อายัดบรรจุภัณฑ์' },
  { id: 'Segregate', label: 'Segregate', desc: 'แยกกักกันทางกายภาพ' },
  { id: 'Stop Mixing', label: 'Stop Mixing', desc: 'ระงับการผสม' },
  { id: 'Stop Filling/Packing', label: 'Stop Filling/Packing', desc: 'ระงับการบรรจุ/แพ็ค' },
  { id: 'Increased Inspection', label: 'Increased Inspection', desc: 'เพิ่มการสุ่มตรวจ' },
  { id: 'Notify Department', label: 'Notify Department', desc: 'แจ้งเตือนแผนกเกี่ยวข้อง' },
  { id: 'Notify Supplier', label: 'Notify Supplier', desc: 'ประสานงานซัพพลายเออร์' },
  { id: 'Other', label: 'Other', desc: 'มาตรการเฉพาะหน้าอื่น' }
]

export default function QualityAssurancePage() {
  // Master data & State
  const [masterData, setMasterData] = useState<{
    products: any[]
    productionLots: any[]
    departments: any[]
    rooms: any[]
    processes: any[]
    users: any[]
  }>({ products: [], productionLots: [], departments: [], rooms: [], processes: [], users: [] })

  const [stats, setStats] = useState<any>({
    healthScore: 100,
    totalEvents: 0,
    openEvents: 0,
    criticalEvents: 0,
    activeHolds: 0,
    fastTrackClosed: 0,
    paretoByType: {},
    severityBreakdown: { CRITICAL: 0, MAJOR: 0, MINOR: 0 }
  })

  const [events, setEvents] = useState<QmsQualityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])

  // Active user simulation for factory demonstration
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string }>({
    id: '029f20ec-49b2-469c-aa12-657854a636de',
    name: 'Admin System',
    role: 'QA Manager'
  })

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [marketFilter, setMarketFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isContainmentModalOpen, setIsContainmentModalOpen] = useState(false)
  const [isFastCloseModalOpen, setIsFastCloseModalOpen] = useState(false)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false)
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false)
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false)
  const [isQhsModalOpen, setIsQhsModalOpen] = useState(false)

  // Phase 3: CAPA Workspace & Work state
  const [selectedCapaId, setSelectedCapaId] = useState<string | undefined>(undefined)
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | undefined>(undefined)
  const [isCapaWorkspaceOpen, setIsCapaWorkspaceOpen] = useState(false)
  const [capaRefreshKey, setCapaRefreshKey] = useState(0)
  const [shopfloorIssuesCount, setShopfloorIssuesCount] = useState<number>(0)

  // Phase 4: Effectiveness & Recurrence Monitoring state
  const [selectedEffectivenessCapaId, setSelectedEffectivenessCapaId] = useState<string | undefined>(undefined)
  const [isEffectivenessWorkspaceOpen, setIsEffectivenessWorkspaceOpen] = useState(false)
  const [effectivenessQueue, setEffectivenessQueue] = useState<any[]>([])

  // Phase 5: Batch QA Review & Release state
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null)
  // Phase 6: Active Tab state for deep linking
  const [activeTab, setActiveTab] = useState('events')

  const handleOpenCapaWorkspace = (capaId?: string, invId?: string) => {
    setSelectedCapaId(capaId)
    setSelectedInvestigationId(invId)
    setIsCapaWorkspaceOpen(true)
  }

  const handleOpenEffectivenessWorkspace = (capaId: string) => {
    setSelectedEffectivenessCapaId(capaId)
    setIsEffectivenessWorkspaceOpen(true)
  }

  // Selected Records
  const [selectedEvent, setSelectedEvent] = useState<QmsQualityEvent | null>(null)
  const [selectedEventDetails, setSelectedEventDetails] = useState<{
    containmentActions: QmsContainmentAction[]
    signatures: any[]
    auditLogs: any[]
  }>({ containmentActions: [], signatures: [], auditLogs: [] })

  // Report Form state
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    department_id: '',
    room_id: '',
    product_id: '',
    production_lot_id: '',
    material_type: 'BULK' as 'RM' | 'PM' | 'BULK' | 'FG' | 'ENV' | 'EQUIP' | 'NONE',
    material_lot_no: '',
    supplier_name: '',
    equipment_code: '',
    destination_market: 'DOMESTIC_TH' as QmsDestinationMarket,
    expected_condition: '',
    actual_condition: '',
    immediate_action_taken: '',
    quantity_affected: '',
    quantity_unit: 'ชิ้น',
    photo_preview: ''
  })

  // Triage Form state
  const [triageForm, setTriageForm] = useState({
    qa_confirmed_type: 'DEVIATION' as QmsEventType,
    qa_confirmed_severity: 'MAJOR' as QmsSeverity,
    risk_level: 'MEDIUM' as QmsRiskLevel,
    workflow_path: 'STANDARD' as QmsWorkflowPath,
    containment_required: false,
    containment_types: [] as string[],
    initial_impact_assessment: {
      product_quality: 'NO',
      consumer_safety: 'NO',
      regulatory_labeling: 'NO',
      gmp_compliance: 'NO',
      customer_requirement: 'NO',
      production_batch: 'NO',
      other_batch_market: 'NO'
    } as QmsInitialImpactAssessment,
    qa_classification_notes: ''
  })

  // Containment Form state
  const [containmentForm, setContainmentForm] = useState({
    action_type: 'HOLD_LOT' as QmsContainmentActionType,
    item_reference: '',
    action_description: '',
    assigned_to: '',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  })

  const [execNotes, setExecNotes] = useState('')
  const [closureNotes, setClosureNotes] = useState('')
  const [correctionNotes, setCorrectionNotes] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Live AI Pre-Triage in Intake Modal
  const liveAiPreTriage = useMemo(() => {
    const text = `${reportForm.title} ${reportForm.description} ${reportForm.material_type}`.toLowerCase()
    if (!reportForm.title && !reportForm.description) return null

    if (text.includes('ความหนืด') || text.includes('viscosity') || text.includes('ph') || text.includes('assay') || text.includes('micro') || text.includes('เชื้อ') || text.includes('oos')) {
      return {
        type: 'OOS',
        severity: 'CRITICAL',
        risk: 'CRITICAL',
        path: 'FULL_CAPA',
        badgeColor: 'bg-red-500/20 text-red-600 border-red-500/30',
        rationale: 'พบผลทดสอบผิด Spec มาตรฐานเครื่องสำอาง มีความเสี่ยงต่อความปลอดภัยของผู้บริโภค แนะนำกักกันและสอบสวนสาเหตุเต็มรูปแบบ'
      }
    } else if (text.includes('รั่ว') || text.includes('แตก') || text.includes('leak') || text.includes('crimp') || text.includes('บรรจุ') || text.includes('ฟอยล์') || text.includes('กล่องบุบ')) {
      return {
        type: 'NCR',
        severity: 'MAJOR',
        risk: 'HIGH',
        path: 'STANDARD',
        badgeColor: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
        rationale: 'พบความไม่สมบูรณ์ของบรรจุภัณฑ์หรือซีลปิดผนึก อาจทำให้เกิดการปนเปื้อน แนะนำตรวจเช็คขอบเขตล็อต'
      }
    } else if (text.includes('เครื่องหยุด') || text.includes('เครื่องจักร') || text.includes('sensor') || text.includes('รอบกวน') || text.includes('motor')) {
      return {
        type: 'EQUIPMENT_ISSUE',
        severity: 'MAJOR',
        risk: 'MEDIUM',
        path: 'STANDARD',
        badgeColor: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
        rationale: 'พารามิเตอร์เครื่องจักรทำงานผิดปกติ กระทบขั้นตอนการผลิต แนะนำออกใบบันทึกซ่อมบำรุง'
      }
    } else if (text.includes('สติ๊กเกอร์') || text.includes('label') || text.includes('เอียง') || text.includes('รอยขีดข่วน')) {
      return {
        type: 'GMP_OBSERVATION',
        severity: 'MINOR',
        risk: 'LOW',
        path: 'FAST_TRACK',
        badgeColor: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
        rationale: 'ข้อบกพร่องภายนอก ไม่กระทบคุณภาพเนื้อผลิตภัณฑ์ แนะนำแก้ไขหน้างานทันที (Fast-Track)'
      }
    }
    return {
      type: 'DEVIATION',
      severity: 'MINOR',
      risk: 'LOW',
      path: 'FAST_TRACK',
      badgeColor: 'bg-slate-500/20 text-slate-600 border-slate-500/30',
      rationale: 'ประเมินเป็นความเบี่ยงเบนทั่วไป แนะนำบันทึกการแก้ไขเฉพาะหน้า'
    }
  }, [reportForm.title, reportForm.description, reportForm.material_type])

  // Initial load
  useEffect(() => {
    loadAllData()
  }, [statusFilter, severityFilter, marketFilter])

  async function loadAllData() {
    setLoading(true)
    try {
      const [master, st, evs, notifs, capasRes] = await Promise.all([
        getMasterDataForQms(),
        getQmsDashboardStats(),
        getQualityEvents({
          status: statusFilter,
          severity: severityFilter,
          market: marketFilter,
          search: searchQuery
        }),
        getInAppNotifications(currentUser.id),
        getAllCapas({ status: 'AWAITING_EFFECTIVENESS' })
      ])

      setMasterData(master)
      setStats(st)
      if (capasRes && capasRes.success && capasRes.data) {
        setEffectivenessQueue(capasRes.data)
      }
      if (evs.success) {
        setEvents(evs.data)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get('tab')) {
            setActiveTab(urlParams.get('tab')!)
          }
          if (urlParams.get('triage') === 'open' || urlParams.get('triage') === 'true') {
            const ev = evs.data.find((e: any) => e.event_no === 'QE-2026-0016') || evs.data[0]
            if (ev) {
              handleOpenTriage(ev)
            }
          }
        }
      }
      if (notifs.success) {
        setNotifications(notifs.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('โหลดข้อมูลระบบล้มเหลว')
    } finally {
      setLoading(false)
    }
  }

  // Open detail modal with sub-records
  async function handleOpenDetail(event: QmsQualityEvent) {
    setSelectedEvent(event)
    setIsDetailModalOpen(true)
    const res = await getQualityEventById(event.id)
    if (res.success && res.event) {
      setSelectedEvent(res.event)
      setSelectedEventDetails({
        containmentActions: res.containmentActions || [],
        signatures: res.signatures || [],
        auditLogs: res.auditLogs || []
      })
    }
  }

  // Open Investigation Cockpit
  function handleOpenInvestigation(event: QmsQualityEvent) {
    setSelectedEvent(event)
    setIsInvestigationModalOpen(true)
  }

  // Open Triage
  function handleOpenTriage(event: QmsQualityEvent) {
    setSelectedEvent(event)
    const existingImpact: QmsInitialImpactAssessment = {
      product_quality: event.initial_impact_assessment?.product_quality || 'NO',
      consumer_safety: event.initial_impact_assessment?.consumer_safety || 'NO',
      regulatory_labeling: event.initial_impact_assessment?.regulatory_labeling || 'NO',
      gmp_compliance: event.initial_impact_assessment?.gmp_compliance || 'NO',
      customer_requirement: event.initial_impact_assessment?.customer_requirement || 'NO',
      production_batch: event.initial_impact_assessment?.production_batch || 'NO',
      other_batch_market: event.initial_impact_assessment?.other_batch_market || 'NO'
    }
    const defaultContainmentRequired = Boolean(event.containment_required || event.qa_confirmed_severity === 'CRITICAL')
    const defaultContainmentTypes = (event.containment_types && event.containment_types.length > 0)
      ? event.containment_types
      : (defaultContainmentRequired ? ['Hold Production Batch'] : [])

    setTriageForm({
      qa_confirmed_type: (event.qa_confirmed_type || event.ai_suggested_type || 'DEVIATION') as QmsEventType,
      qa_confirmed_severity: (event.qa_confirmed_severity || event.ai_suggested_severity || 'MAJOR') as QmsSeverity,
      risk_level: (event.risk_level || event.ai_suggested_risk || 'MEDIUM') as QmsRiskLevel,
      workflow_path: (event.workflow_path || (event.qa_confirmed_severity === 'CRITICAL' ? 'FULL_CAPA' : 'STANDARD')) as QmsWorkflowPath,
      containment_required: defaultContainmentRequired,
      containment_types: defaultContainmentTypes,
      initial_impact_assessment: existingImpact,
      qa_classification_notes: event.qa_classification_notes || ''
    })
    setIsTriageModalOpen(true)
  }

  // Submit Report
  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportForm.title.trim() || !reportForm.description.trim()) {
      toast.error('กรุณาระบุหัวข้อและรายละเอียดเหตุการณ์')
      return
    }

    setSubmitting(true)
    try {
      const res = await reportQualityEvent({
        title: reportForm.title,
        description: reportForm.description,
        reported_by: currentUser.id,
        reporter_name: currentUser.name,
        department_id: reportForm.department_id || undefined,
        room_id: reportForm.room_id || undefined,
        product_id: reportForm.product_id || undefined,
        production_lot_id: reportForm.production_lot_id || undefined,
        material_type: reportForm.material_type,
        material_lot_no: reportForm.material_lot_no || undefined,
        supplier_name: reportForm.supplier_name || undefined,
        equipment_code: reportForm.equipment_code || undefined,
        destination_market: reportForm.destination_market,
        expected_condition: reportForm.expected_condition || undefined,
        actual_condition: reportForm.actual_condition || undefined,
        immediate_action_taken: reportForm.immediate_action_taken || undefined,
        quantity_affected: reportForm.quantity_affected ? parseFloat(reportForm.quantity_affected) : undefined,
        quantity_unit: reportForm.quantity_unit,
        attachment_urls: reportForm.photo_preview ? [{ name: 'incident_photo.jpg', url: reportForm.photo_preview }] : []
      })

      if (res.success) {
        toast.success(`บันทึกรายงานสำเร็จ: ${res.data?.event_no}`)
        setIsReportModalOpen(false)
        setReportForm({
          title: '',
          description: '',
          department_id: '',
          room_id: '',
          product_id: '',
          production_lot_id: '',
          material_type: 'BULK',
          material_lot_no: '',
          supplier_name: '',
          equipment_code: '',
          destination_market: 'DOMESTIC_TH',
          expected_condition: '',
          actual_condition: '',
          immediate_action_taken: '',
          quantity_affected: '',
          quantity_unit: 'ชิ้น',
          photo_preview: ''
        })
        loadAllData()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (err: any) {
      toast.error(err.message || 'บันทึกรายงานล้มเหลว')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Triage
  async function handleSubmitTriage() {
    if (!selectedEvent) return

    // Guardrail UI validation
    if (triageForm.initial_impact_assessment.consumer_safety === 'YES' && triageForm.workflow_path === 'FAST_TRACK') {
      if (!triageForm.qa_classification_notes || triageForm.qa_classification_notes.trim().length < 15) {
        toast.error('มีผลกระทบด้านความปลอดภัยผู้บริโภค (Consumer Safety): กรุณาระบุเหตุผลการเลือก Fast-Track อย่างน้อย 15 ตัวอักษร')
        return
      }
    }

    if (triageForm.initial_impact_assessment.regulatory_labeling === 'YES' && triageForm.workflow_path === 'FAST_TRACK') {
      if (!triageForm.qa_classification_notes || triageForm.qa_classification_notes.trim().length < 15) {
        toast.error('กระทบข้อกำหนดกฎหมาย/ฉลาก (Regulatory): กรุณาระบุเหตุผลการเลือก Fast-Track อย่างน้อย 15 ตัวอักษร')
        return
      }
    }

    if (triageForm.containment_required && triageForm.containment_types.length === 0) {
      toast.error('กรุณาเลือกประเภทมาตรการควบคุม/กักกันอย่างน้อย 1 รายการ')
      return
    }

    setSubmitting(true)
    try {
      const res = await triageQualityEvent({
        eventId: selectedEvent.id,
        qa_confirmed_type: triageForm.qa_confirmed_type,
        qa_confirmed_severity: triageForm.qa_confirmed_severity,
        risk_level: triageForm.risk_level,
        workflow_path: triageForm.workflow_path,
        containment_required: triageForm.containment_required,
        containment_types: triageForm.containment_types,
        initial_impact_assessment: triageForm.initial_impact_assessment,
        qa_classification_notes: triageForm.qa_classification_notes,
        qa_user_id: currentUser.id,
        qa_user_name: currentUser.name,
        qa_user_role: currentUser.role
      })

      if (res.success) {
        toast.success('ยืนยันผลการประเมินเหตุการณ์คุณภาพ (Quality Event Assessment) เรียบร้อย')
        setIsTriageModalOpen(false)
        loadAllData()
      } else {
        toast.error(res.error || 'การประเมินล้มเหลว')
      }
    } catch (err: any) {
      toast.error(err.message || 'ประเมินล้มเหลว')
    } finally {
      setSubmitting(false)
    }
  }

  // Fast-Track Direct Close
  async function handleFastClose() {
    if (!selectedEvent) return
    if (!correctionNotes.trim() || !closureNotes.trim()) {
      toast.error('กรุณาระบุรายละเอียดการแก้ไขหน้างานและบันทึกการปิดเคส')
      return
    }

    setSubmitting(true)
    try {
      const res = await fastCloseQualityEvent({
        eventId: selectedEvent.id,
        correctionNotes,
        evidenceUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop',
        closureNotes,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role
      })

      if (res.success) {
        toast.success('ปิดเคส Fast-Track สมบูรณ์แล้ว')
        setIsFastCloseModalOpen(false)
        setCorrectionNotes('')
        setClosureNotes('')
        loadAllData()
      } else {
        toast.error(res.error || 'ปิดเคสล้มเหลว')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Controlled Reopen
  async function handleReopen() {
    if (!selectedEvent) return
    if (reopenReason.trim().length < 15) {
      toast.error('กรุณาระบุเหตุผลการขอเปิดเคสใหม่ (Reopen) อย่างน้อย 15 ตัวอักษร')
      return
    }

    setSubmitting(true)
    try {
      const res = await reopenQualityEvent({
        eventId: selectedEvent.id,
        reason: reopenReason,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role
      })

      if (res.success) {
        toast.success('เปิดเคสใหม่ (Reopened) สำเร็จภายใต้การควบคุมของ QA')
        setIsReopenModalOpen(false)
        setReopenReason('')
        loadAllData()
      } else {
        toast.error(res.error || 'ขอเปิดเคสใหม่ล้มเหลว')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Add containment action
  async function handleAddContainment() {
    if (!selectedEvent || !containmentForm.item_reference || !containmentForm.action_description) {
      toast.error('กรุณากรอกข้อมูลการกักกันให้ครบถ้วน')
      return
    }

    const res = await addContainmentAction({
      quality_event_id: selectedEvent.id,
      action_type: containmentForm.action_type,
      item_reference: containmentForm.item_reference,
      action_description: containmentForm.action_description,
      assigned_to: containmentForm.assigned_to || currentUser.id,
      due_date: new Date(containmentForm.due_date).toISOString(),
      user_id: currentUser.id,
      user_name: currentUser.name
    })

    if (res.success) {
      toast.success('ออกคำสั่งกักกันเรียบร้อย')
      setIsContainmentModalOpen(false)
      // refresh details
      const detail = await getQualityEventById(selectedEvent.id)
      if (detail.success && detail.event) {
        setSelectedEventDetails({
          containmentActions: detail.containmentActions || [],
          signatures: detail.signatures || [],
          auditLogs: detail.auditLogs || []
        })
      }
      loadAllData()
    } else {
      toast.error(res.error || 'ออกคำสั่งกักกันล้มเหลว')
    }
  }

  // Execute Containment Action
  async function handleExecuteAction(actionId: string) {
    if (!execNotes) {
      toast.error('กรุณาระบุรายละเอียดการดำเนินการกักกัน')
      return
    }

    const res = await executeContainmentAction({
      actionId,
      executionNotes: execNotes,
      evidenceUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop',
      userId: currentUser.id,
      userName: currentUser.name
    })

    if (res.success && selectedEvent) {
      toast.success('บันทึกการดำเนินการกักกันแล้ว')
      setExecNotes('')
      const detail = await getQualityEventById(selectedEvent.id)
      if (detail.success && detail.event) {
        setSelectedEventDetails({
          containmentActions: detail.containmentActions || [],
          signatures: detail.signatures || [],
          auditLogs: detail.auditLogs || []
        })
      }
      loadAllData()
    }
  }

  // Verify Containment Action (QA Signoff)
  async function handleVerifyAction(actionId: string) {
    if (!selectedEvent) return
    const res = await verifyContainmentAction({
      actionId,
      eventId: selectedEvent.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role
    })

    if (res.success) {
      toast.success('QA ลงนามตรวจสอบการกักกันสินค้าเรียบร้อย')
      const detail = await getQualityEventById(selectedEvent.id)
      if (detail.success && detail.event) {
        setSelectedEventDetails({
          containmentActions: detail.containmentActions || [],
          signatures: detail.signatures || [],
          auditLogs: detail.auditLogs || []
        })
        setSelectedEvent(detail.event)
      }
      loadAllData()
    } else {
      toast.error(res.error || 'ยืนยันการกักกันล้มเหลว')
    }
  }

  // Acknowledge notification
  async function handleAckNotif(id: string) {
    const res = await acknowledgeNotification({
      notificationId: id,
      userId: currentUser.id,
      userName: currentUser.name
    })
    if (res.success) {
      toast.success('รับทราบการแจ้งเตือนแล้ว')
      const notifs = await getInAppNotifications(currentUser.id)
      if (notifs.success) setNotifications(notifs.data)
    }
  }

  // Helpers
  const getSeverityBadge = (sev?: QmsSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/30">🔴 วิกฤต (CRITICAL)</Badge>
      case 'MAJOR':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 hover:bg-amber-500/30">🟡 ร้ายแรง (MAJOR)</Badge>
      case 'MINOR':
        return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/30">🟢 เล็กน้อย (MINOR)</Badge>
      default:
        return <Badge variant="outline">รอประเมิน</Badge>
    }
  }

  const getStatusBadge = (status: QmsEventStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">รอดำเนินการ QA</Badge>
      case 'UNDER_QA_REVIEW':
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">QA กำลังประเมิน</Badge>
      case 'CONTAINMENT_ACTIVE':
        return <Badge className="bg-red-500 text-white animate-pulse">🔒 กักกันสต็อก (HOLD)</Badge>
      case 'DIRECT_CORRECTION':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">⚡ แก้ไขเฉพาะหน้า</Badge>
      case 'INVESTIGATION_PENDING':
        return <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">รอสอบสวนหาสาเหตุ</Badge>
      case 'CLOSED':
        return <Badge className="bg-emerald-600 text-white">✅ ปิดเคสแล้ว (CLOSED)</Badge>
      case 'VOIDED':
        return <Badge variant="outline" className="line-through text-slate-400">ยกเลิก (VOID)</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getMarketOverlayBadge = (market: QmsDestinationMarket) => {
    switch (market) {
      case 'USA_MOCRA':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">🇺🇸 USA (MoCRA Overlay)</Badge>
      case 'UAE_GSO':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">🇦🇪 UAE (GSO / Halal)</Badge>
      case 'CAMBODIA_CLMV':
        return <Badge className="bg-sky-100 text-sky-800 border-sky-200">🇰🇭 Cambodia (CLMV)</Badge>
      default:
        return <Badge variant="outline" className="text-slate-600">🇹🇭 ในประเทศ (Domestic TH)</Badge>
    }
  }

  // Filtered lists for Kanban
  const triageQueue = useMemo(() => events.filter(e => e.current_status === 'SUBMITTED' || e.current_status === 'UNDER_QA_REVIEW'), [events])
  const containmentQueue = useMemo(() => events.filter(e => e.current_status === 'CONTAINMENT_ACTIVE'), [events])
  const fastTrackQueue = useMemo(() => events.filter(e => e.current_status === 'DIRECT_CORRECTION'), [events])
  const investigationQueue = useMemo(() => events.filter(e => e.current_status === 'INVESTIGATION_PENDING'), [events])

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-full min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-5 w-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-rose-500 to-indigo-600 text-white rounded-xl shadow-md shrink-0">
            <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                CosmeFlow Assurance
              </h1>
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 text-[10px] sm:text-xs px-2 py-0.5 whitespace-nowrap">
                Cosmetics QMS Core (ISO 22716)
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Quality Intelligence OS & Universal Quality Event Hub — CosmeDiva Smart Factory
            </p>
          </div>
        </div>

        {/* Action Controls & Simulation Profile */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full 2xl:w-auto justify-start 2xl:justify-end">
          {/* User Role Switcher for Test Demonstration */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded-lg border text-xs h-9">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-medium hidden sm:inline">ผู้ใช้งาน:</span>
            <select 
              value={currentUser.role}
              onChange={(e) => {
                const role = e.target.value
                if (role === 'QA Manager') {
                  setCurrentUser({ id: '029f20ec-49b2-469c-aa12-657854a636de', name: 'คุณวิภาดา (QA Mgr)', role: 'QA Manager' })
                } else if (role === 'QA Officer') {
                  setCurrentUser({ id: '4b96c00d-0192-4d2b-8c3b-9163f22a4576', name: 'คุณพรทิพย์ (QA Officer)', role: 'QA Officer' })
                } else {
                  setCurrentUser({ id: '10a96cad-ca48-435d-8add-3ba087f0dceb', name: 'นายสน (Line Op)', role: 'Operator' })
                }
                toast.info(`สลับบทบาทเป็น: ${role}`)
              }}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="QA Manager">👑 คุณวิภาดา (QA Manager)</option>
              <option value="QA Officer">🛡️ คุณพรทิพย์ (QA Officer)</option>
              <option value="Operator">👷 นายสน (Line Operator)</option>
            </select>
          </div>

          {/* In-App Notifications Bell */}
          <Button 
            variant="outline" 
            size="icon" 
            className="relative h-9 w-9 shrink-0"
            onClick={() => setIsNotifDrawerOpen(!isNotifDrawerOpen)}
          >
            <Bell className="w-4 h-4" />
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center animate-bounce">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </Button>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading} className="gap-1.5 h-9 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </Button>

          {/* Quick Review Quality Event Assessment Screen Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const target = events.find(e => e.event_no === 'QE-2026-0016') || events[0]
              if (target) {
                handleOpenTriage(target)
              } else {
                toast.info('ไม่พบเหตุการณ์สำหรับเปิดการประเมินเหตุการณ์คุณภาพ')
              }
            }}
            className="border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold gap-1.5 shadow-xs h-9 text-xs sm:text-sm"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">เปิดหน้าจอประเมิน (Assessment)</span>
            <span className="sm:hidden">Assessment</span>
          </Button>

          {/* Primary Action Button */}
          <Button 
            onClick={() => setIsReportModalOpen(true)}
            className="bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-semibold shadow-md gap-1.5 sm:gap-2 h-9 text-xs sm:text-sm whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>+ REPORT QUALITY EVENT</span>
          </Button>
        </div>
      </div>

      {/* Critical SLA Notification Banner if any unacknowledged */}
      {notifications.some(n => n.requires_acknowledgement && !n.is_read) && (
        <div className="bg-red-500 text-white p-4 rounded-xl flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">แจ้งเตือนเร่งด่วน: มีเหตุการณ์คุณภาพระดับ CRITICAL ที่ต้องการการรับทราบ (Acknowledgement Required)</p>
              <p className="text-xs text-red-100">โปรดคลิกเพื่อตรวจสอบและรับทราบภายใน SLA 60 นาทีตามข้อกำหนด ISO 22716</p>
            </div>
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setIsNotifDrawerOpen(true)}
            className="text-red-700 font-bold"
          >
            เปิดศูนย์แจ้งเตือน
          </Button>
        </div>
      )}

      {/* Executive Quality Health Radar (Scorecard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
        {/* Quality Health Score */}
        <Card
          onClick={() => setIsQhsModalOpen(true)}
          className="col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-1 bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 shadow-md cursor-pointer hover:ring-2 hover:ring-indigo-400/50 hover:shadow-lg transition-all group"
        >
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-200 group-hover:text-white transition-colors">
                Quality Health Score (QHS)
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 font-bold ${
                  stats.healthScore < 60
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : stats.healthScore < 75
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : stats.healthScore < 90
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {stats.healthScore < 60
                  ? 'CRITICAL ALERT'
                  : stats.healthScore < 75
                  ? 'ELEVATED RISK'
                  : stats.healthScore < 90
                  ? 'CONTROLLED'
                  : 'EXCELLENT'}
              </Badge>
            </div>
            <div className="my-2">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  <span className={stats.healthScore < 60 ? 'text-rose-400' : 'text-white'}>
                    {stats.healthScore}
                  </span>{' '}
                  <span className="text-xs font-normal text-indigo-300">/ 100</span>
                </div>
                {stats.qhsModel?.hasComparablePreviousPeriod ? (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      stats.qhsModel.trendDirection === 'UP'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : stats.qhsModel.trendDirection === 'DOWN'
                        ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                        : 'text-slate-400 border-slate-700 bg-slate-800'
                    }`}
                  >
                    {stats.qhsModel.trendText}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 border border-slate-700/60 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    Trend: N/A
                  </span>
                )}
              </div>
              <p
                className={`text-[11px] font-semibold flex items-center gap-1 mt-1 truncate ${
                  stats.healthScore < 60 ? 'text-rose-300' : 'text-emerald-400'
                }`}
              >
                {stats.healthScore < 60 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                ดัชนีสุขภาพระบบคุณภาพ (Quality Health Score)
              </p>
              <p
                className="text-[10px] text-slate-400 truncate mt-0.5"
                title="คำนวณจากสถานะเหตุการณ์คุณภาพ, QA Hold, CAPA, Investigation, Recurrence และ Batch Disposition"
              >
                คำนวณจากสถานะเหตุการณ์คุณภาพ, QA Hold, CAPA, Investigation, Recurrence และ Batch Disposition
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    stats.healthScore < 60
                      ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                      : stats.healthScore < 75
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : stats.healthScore < 90
                      ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                      : 'bg-gradient-to-r from-teal-400 to-emerald-400'
                  }`}
                  style={{ width: `${Math.max(5, stats.healthScore)}%` }}
                />
              </div>
              <div className="text-[10px] text-indigo-300 flex items-center justify-between group-hover:text-indigo-200">
                <span className="flex items-center gap-1 group-hover:underline">
                  <HelpCircle className="w-3 h-3" /> ที่มาของคะแนน (คลิกเพื่อดู Breakdown)
                </span>
                <ChevronRight className="w-3 h-3 text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Open Events */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium truncate">เหตุการณ์ที่ยังเปิดอยู่</span>
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-slate-900 dark:text-slate-100 truncate">
              {stats.openEvents} <span className="text-xs font-normal text-slate-400">/ {stats.totalEvents} ทั้งหมด</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block truncate">Active Quality Workflows</span>
          </CardContent>
        </Card>

        {/* Critical Events */}
        <Card className={`border-slate-200 shadow-sm ${stats.criticalEvents > 0 ? 'border-red-300 bg-red-50/30' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium truncate">ระดับวิกฤต (Critical)</span>
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-red-600 truncate">
              {stats.criticalEvents}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block truncate">กระทบความปลอดภัย/สูตร</span>
          </CardContent>
        </Card>

        {/* Active Holds */}
        <Card className={`border-slate-200 shadow-sm ${stats.activeHolds > 0 ? 'border-amber-300 bg-amber-50/30' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium truncate">กักกันสต็อก (QA Hold)</span>
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-amber-600 truncate">
              {stats.activeHolds}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block truncate">ล็อต/เครื่องจักรที่ถูกระงับ</span>
          </CardContent>
        </Card>

        {/* Fast-Track Closed */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium truncate">ปิดแบบ Fast-Track</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-emerald-600 truncate">
              {stats.fastTrackClosed}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block truncate">แก้หน้างานจบภายในวัน</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-1.5 scrollbar-thin">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 border inline-flex w-max min-w-full justify-start gap-1">
            <TabsTrigger value="events" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3">
              <Layers className="w-4 h-4 shrink-0" />
              <span>1. เหตุการณ์คุณภาพ <span className="hidden xl:inline text-xs font-normal opacity-75">(Quality Events)</span></span>
            </TabsTrigger>
            <TabsTrigger value="my_capa" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-400 py-1.5 px-2.5 sm:px-3">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>2. งาน CAPA ของฉัน <span className="hidden xl:inline text-xs font-normal opacity-75">(My CAPA)</span></span>
            </TabsTrigger>
            <TabsTrigger value="capa_register" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-400 py-1.5 px-2.5 sm:px-3">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>3. ทะเบียน CAPA <span className="hidden xl:inline text-xs font-normal opacity-75">(CAPA Register)</span></span>
            </TabsTrigger>
            <TabsTrigger value="shopfloor_live" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 py-1.5 px-2.5 sm:px-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>4. 🏭 สายการผลิต <span className="hidden xl:inline text-xs font-normal opacity-75">(Shopfloor)</span></span>
              {shopfloorIssuesCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                  {shopfloorIssuesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="batch_release" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 py-1.5 px-2.5 sm:px-3">
              <ClipboardCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>5. ปล่อยผ่านรุ่นการผลิต <span className="hidden xl:inline text-xs font-normal opacity-75">(Batch Release)</span></span>
            </TabsTrigger>
            <TabsTrigger value="my_work" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3">
              <Clock className="w-4 h-4 shrink-0" />
              <span>My QA Work <span className="hidden xl:inline text-xs font-normal opacity-75">(กระดานงานด่วน)</span></span>
              {(triageQueue.length + effectivenessQueue.length) > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                  {triageQueue.length + effectivenessQueue.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="containment" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm py-1.5 px-2.5 sm:px-3">
              <Lock className="w-4 h-4 shrink-0" />
              <span>กักกันสต็อก <span className="hidden xl:inline text-xs font-normal opacity-75">(Hold Manager)</span></span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 whitespace-nowrap text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-400 py-1.5 px-2.5 sm:px-3">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>6. Executive Intelligence <span className="hidden xl:inline text-xs font-normal opacity-75">(Command Center)</span></span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ================= TAB 1: QUALITY EVENT HUB ================= */}
        <TabsContent value="events" className="space-y-4 pt-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <Input 
                placeholder="ค้นหาตามรหัส QE, ชื่องาน, ล็อต, สารเคมี..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadAllData()}
                className="border-0 bg-transparent focus-visible:ring-0 text-xs sm:text-sm w-full"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap text-xs w-full md:w-auto">
              <span className="text-slate-400 font-medium shrink-0">สถานะ:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border rounded px-2.5 py-1.5 text-xs flex-1 sm:flex-initial"
              >
                <option value="ALL">ทุกลำดับสถานะ</option>
                <option value="OPEN">เฉพาะที่ยังเปิดอยู่ (Open)</option>
                <option value="SUBMITTED">รอประเมินเหตุการณ์คุณภาพ (Assessment)</option>
                <option value="CONTAINMENT_ACTIVE">กักกันสต็อก (HOLD)</option>
                <option value="DIRECT_CORRECTION">แก้ไขเฉพาะหน้า (Fast-Track)</option>
                <option value="INVESTIGATION_PENDING">รอสอบสวนสาเหตุ</option>
                <option value="CLOSED">ปิดเคสสมบูรณ์ (Closed)</option>
              </select>

              <span className="text-slate-400 font-medium ml-1 sm:ml-2 shrink-0">ความรุนแรง:</span>
              <select 
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border rounded px-2.5 py-1.5 text-xs flex-1 sm:flex-initial"
              >
                <option value="ALL">ทุกระดับ</option>
                <option value="CRITICAL">🔴 Critical (วิกฤต)</option>
                <option value="MAJOR">🟡 Major (ร้ายแรง)</option>
                <option value="MINOR">🟢 Minor (เล็กน้อย)</option>
              </select>

              <span className="text-slate-400 font-medium ml-1 sm:ml-2 shrink-0">Overlay:</span>
              <select 
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border rounded px-2.5 py-1.5 text-xs flex-1 sm:flex-initial"
              >
                <option value="ALL">ทุกตลาดส่งออก</option>
                <option value="DOMESTIC_TH">🇹🇭 ในประเทศ (TH)</option>
                <option value="USA_MOCRA">🇺🇸 สหรัฐฯ (MoCRA)</option>
                <option value="UAE_GSO">🇦🇪 UAE (GSO Halal)</option>
                <option value="CAMBODIA_CLMV">🇰🇭 กัมพูชา (CLMV)</option>
              </select>
            </div>
          </div>

          {/* Events Master Table */}
          <div className="border rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full scrollbar-thin">
              <Table className="min-w-[760px] lg:min-w-full w-full text-xs">
                <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                  <TableRow>
                    <TableHead className="w-[110px] sm:w-[130px]">รหัสเหตุการณ์</TableHead>
                    <TableHead className="min-w-[180px]">หัวข้อเหตุการณ์ & บริบทการผลิต</TableHead>
                    <TableHead className="w-[110px] sm:w-[130px]">ตลาดส่งออก</TableHead>
                    <TableHead className="w-[100px] sm:w-[110px]">ความรุนแรง</TableHead>
                    <TableHead className="w-[110px] sm:w-[120px]">เส้นทางงาน</TableHead>
                    <TableHead className="w-[130px] sm:w-[140px]">สถานะ</TableHead>
                    <TableHead className="text-right w-[110px] sm:w-[130px] sticky right-0 bg-slate-50 dark:bg-slate-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        กำลังโหลดข้อมูลเหตุการณ์คุณภาพ...
                      </TableCell>
                    </TableRow>
                  ) : events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        ไม่พบเหตุการณ์คุณภาพตามเงื่อนไขที่เลือก
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((ev) => (
                      <TableRow key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {ev.event_no}
                          <div className="text-[11px] text-slate-400 font-normal">
                            {new Date(ev.event_date).toLocaleDateString('th-TH')}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {ev.title}
                            {ev.ai_suggested_severity === 'CRITICAL' && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                                AI: Critical
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>ประเภทวัตถุดิบ: <span className="font-medium text-slate-700">{ev.material_type}</span></span>
                            {ev.material_lot_no && <span>• ล็อต: <span className="font-mono">{ev.material_lot_no}</span></span>}
                            {ev.reporter_name && <span>• โดย: {ev.reporter_name}</span>}
                          </div>
                        </TableCell>

                        <TableCell>
                          {getMarketOverlayBadge(ev.destination_market)}
                        </TableCell>

                        <TableCell>
                          {getSeverityBadge(ev.qa_confirmed_severity || ev.ai_suggested_severity)}
                        </TableCell>

                        <TableCell>
                          {ev.workflow_path === 'FAST_TRACK' ? (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                              ⚡ Fast-Track
                            </Badge>
                          ) : ev.workflow_path === 'FULL_CAPA' ? (
                            <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                              🎯 Full CAPA
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                              🔬 Standard
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {getStatusBadge(ev.current_status)}
                        </TableCell>

                        <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Triage button for QA */}
                            {ev.current_status === 'SUBMITTED' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-2"
                                onClick={() => handleOpenTriage(ev)}
                              >
                                ประเมิน QA
                              </Button>
                            )}

                            {/* Quick Fast-Close for direct correction */}
                            {ev.current_status === 'DIRECT_CORRECTION' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs h-7 px-2"
                                onClick={() => {
                                  setSelectedEvent(ev)
                                  setIsFastCloseModalOpen(true)
                                }}
                              >
                                ปิดเคส
                              </Button>
                            )}

                            {/* Investigation Cockpit button */}
                            {['INVESTIGATION_PENDING', 'INVESTIGATING', 'CONTAINMENT_ACTIVE', 'QA_REVIEW'].includes(ev.current_status) && (
                              <Button 
                                size="sm" 
                                variant="default"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-2.5 flex items-center gap-1 shadow-sm font-medium"
                                onClick={() => handleOpenInvestigation(ev)}
                                title="เปิดห้องสืบสวนและวิเคราะห์สาเหตุ (Investigation Cockpit & RCA)"
                              >
                                <Search className="w-3.5 h-3.5" />
                                <span>สืบสวน</span>
                              </Button>
                            )}

                            {/* CAPA Workspace button */}
                            {(ev.workflow_path === 'FULL_INVESTIGATION' || ev.current_status === 'CLOSED') && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-purple-300 text-purple-700 hover:bg-purple-50 text-xs h-7 px-2 flex items-center gap-1 font-semibold"
                                onClick={() => handleOpenCapaWorkspace(undefined, undefined)}
                                title="เปิดดู / จัดการ CAPA"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                <span>CAPA</span>
                              </Button>
                            )}

                            {/* View Detail button */}
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0"
                              onClick={() => handleOpenDetail(ev)}
                            >
                              <Eye className="w-4 h-4 text-slate-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ================= TAB 2: MY CAPA WORK ================= */}
        <TabsContent value="my_capa" className="space-y-4 pt-4">
          <MyCapaWork 
            currentUser={currentUser}
            onOpenCapaWorkspace={(capaId) => handleOpenCapaWorkspace(capaId)}
            refreshTrigger={capaRefreshKey}
          />
        </TabsContent>

        {/* ================= TAB 3: CAPA REGISTER ================= */}
        <TabsContent value="capa_register" className="space-y-4 pt-4">
          <CapaRegister 
            onOpenCapaWorkspace={(capaId) => handleOpenCapaWorkspace(capaId)}
            onOpenEffectivenessWorkspace={(capaId) => handleOpenEffectivenessWorkspace(capaId)}
            refreshTrigger={capaRefreshKey}
          />
        </TabsContent>

        {/* ================= TAB 4: SHOPFLOOR LIVE STREAM & ISSUES ================= */}
        <TabsContent value="shopfloor_live" className="space-y-4 pt-4">
          <ShopfloorQualityStreamView 
            currentUser={currentUser?.name}
            currentUserInfo={currentUser}
            onActiveIssuesCountChange={(count) => setShopfloorIssuesCount(count)}
            onEscalateToQms={(issueData) => {
              setReportForm(prev => ({
                ...prev,
                title: `ปัญหาหน้างาน: ${issueData.stage || 'สายการผลิต'} - ${issueData.sku || ''} (${issueData.lotNo || ''})`,
                description: issueData.description || '',
                actual_condition: issueData.description || '',
                material_lot_no: issueData.lotNo || ''
              }))
              setIsReportModalOpen(true)
              toast.info('ดึงข้อมูลจากหน้างานมาเตรียมเปิด Quality Event เรียบร้อยแล้ว')
            }}
          />
        </TabsContent>

        {/* ================= TAB 4: MY QA WORK (KANBAN) ================= */}
        <TabsContent value="my_work" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Col 1: Needs Quality Event Assessment */}
            <Card className="border-slate-200">
              <CardHeader className="p-3 bg-blue-50/50 border-b">
                <CardTitle className="text-xs font-bold text-blue-800 flex items-center justify-between">
                  <span>1. รอประเมิน (Needs Assessment)</span>
                  <Badge variant="secondary" className="text-blue-700">{triageQueue.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {triageQueue.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ไม่มีงานค้างประเมิน</p>
                ) : (
                  triageQueue.map(ev => (
                    <div key={ev.id} className="p-3 bg-white border rounded-lg shadow-sm hover:border-blue-400 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-700">{ev.event_no}</span>
                        {getSeverityBadge(ev.ai_suggested_severity)}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">{ev.title}</p>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t text-[11px] text-slate-400">
                        <span>{ev.material_type}</span>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleOpenTriage(ev)}>
                          ประเมิน ➔
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Col 2: Active Containment */}
            <Card className="border-slate-200">
              <CardHeader className="p-3 bg-red-50/50 border-b">
                <CardTitle className="text-xs font-bold text-red-800 flex items-center justify-between">
                  <span>2. กักกันสต็อก (Hold Active)</span>
                  <Badge variant="secondary" className="text-red-700">{containmentQueue.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {containmentQueue.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ไม่มีรายการกักกัน</p>
                ) : (
                  containmentQueue.map(ev => (
                    <div key={ev.id} className="p-3 bg-white border border-red-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-red-600">{ev.event_no}</span>
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">HOLD</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{ev.title}</p>
                      <Button size="sm" variant="default" className="w-full h-7 text-xs mt-2 bg-red-600 hover:bg-red-700" onClick={() => handleOpenDetail(ev)}>
                        จัดการการกักกัน
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Col 3: Direct Correction (Fast-Track) */}
            <Card className="border-slate-200">
              <CardHeader className="p-3 bg-amber-50/50 border-b">
                <CardTitle className="text-xs font-bold text-amber-800 flex items-center justify-between">
                  <span>3. แก้ไขเฉพาะหน้า (Fast-Track)</span>
                  <Badge variant="secondary" className="text-amber-700">{fastTrackQueue.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {fastTrackQueue.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ไม่มีงานแก้ไขเฉพาะหน้า</p>
                ) : (
                  fastTrackQueue.map(ev => (
                    <div key={ev.id} className="p-3 bg-white border rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-700">{ev.event_no}</span>
                        <Badge variant="outline" className="text-[10px]">Fast-Track</Badge>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{ev.title}</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full h-7 text-xs mt-2 text-emerald-700 border-emerald-300"
                        onClick={() => {
                          setSelectedEvent(ev)
                          setIsFastCloseModalOpen(true)
                        }}
                      >
                        บันทึกปิดเคส
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Col 4: Investigation Pending */}
            <Card className="border-slate-200">
              <CardHeader className="p-3 bg-indigo-50/50 border-b">
                <CardTitle className="text-xs font-bold text-indigo-800 flex items-center justify-between">
                  <span>4. รอสอบสวน (Investigation)</span>
                  <Badge variant="secondary" className="text-indigo-700">{investigationQueue.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {investigationQueue.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ไม่มีเคสรอสอบสวน</p>
                ) : (
                  investigationQueue.map(ev => (
                    <div key={ev.id} className="p-3 bg-white border rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-700">{ev.event_no}</span>
                        {getSeverityBadge(ev.qa_confirmed_severity)}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{ev.title}</p>
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="w-full h-7 text-xs mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-1.5"
                        onClick={() => handleOpenInvestigation(ev)}
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>เข้าห้องสืบสวน (Cockpit) ➔</span>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Col 5: Effectiveness Monitoring (Phase 4) */}
            <Card className="border-purple-200">
              <CardHeader className="p-3 bg-purple-50/70 border-b border-purple-100">
                <CardTitle className="text-xs font-bold text-purple-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>5. ประเมินประสิทธิผล (Phase 4)</span>
                  </span>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">{effectivenessQueue.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {effectivenessQueue.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ไม่มีเคสรอดำเนินการ</p>
                ) : (
                  effectivenessQueue.map((capa: any) => (
                    <div key={capa.id} className="p-3 bg-white border border-purple-200 rounded-lg shadow-sm hover:border-purple-400 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-purple-700">{capa.capa_no}</span>
                        <Badge className="bg-purple-600 text-white text-[10px]">Awaiting EFF</Badge>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">{capa.title}</p>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {capa.snapshot_context?.product_sku ? `SKU: ${capa.snapshot_context.product_sku}` : ''}
                      </div>
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="w-full h-7 text-xs mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium flex items-center justify-center gap-1.5"
                        onClick={() => handleOpenEffectivenessWorkspace(capa.id)}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>เข้าสู่ห้องประเมิน ➔</span>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= TAB 3: CONTAINMENT & HOLD MANAGER ================= */}
        <TabsContent value="containment" className="space-y-4 pt-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lock className="w-5 h-5 text-red-600" />
                  หอควบคุมการกักกันสต็อกและล็อกสินค้า (Cosmetics Lot Quarantine Control)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  ระงับการเบิกจ่าย ล็อกสินค้าสำเร็จรูป และติดป้ายกักกันทางกายภาพเพื่อป้องกันสินค้าไม่ได้มาตรฐานเล็ดลอด
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full scrollbar-thin">
                <Table className="min-w-[850px] w-full text-xs">
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow>
                      <TableHead>รหัสเหตุการณ์</TableHead>
                      <TableHead>ประเภทการกักกัน</TableHead>
                      <TableHead>เป้าหมายที่ระงับ (Reference)</TableHead>
                      <TableHead>สถานะการกักกัน</TableHead>
                      <TableHead>ผู้รับผิดชอบ</TableHead>
                      <TableHead>การตรวจสอบโดย QA</TableHead>
                      <TableHead className="text-right sticky right-0 bg-slate-50 dark:bg-slate-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.filter(e => e.containment_required || e.containment_status !== 'NOT_REQUIRED').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                          ไม่มีสต็อกหรือเครื่องจักรที่อยู่ระหว่างการกักกัน
                        </TableCell>
                      </TableRow>
                    ) : (
                      events
                        .filter(e => e.containment_required || e.containment_status !== 'NOT_REQUIRED')
                        .map(ev => (
                          <TableRow key={ev.id}>
                            <TableCell className="font-mono font-bold">{ev.event_no}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                กักกันตามคำสั่ง QA
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {ev.material_lot_no || ev.production_lot_id || 'ล็อตการผลิตหน้างาน'}
                            </TableCell>
                            <TableCell>
                              {ev.containment_status === 'VERIFIED' ? (
                                <Badge className="bg-emerald-600 text-white">✅ ตรวจสอบยืนยันแล้ว</Badge>
                              ) : (
                                <Badge className="bg-amber-500 text-white animate-pulse">⏳ รอดำเนินการกักกัน</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">{ev.reporter_name || 'เจ้าหน้าที่คลัง/ผลิต'}</TableCell>
                            <TableCell className="text-xs">
                              {ev.containment_status === 'VERIFIED' ? 'QA Sign-off แล้ว' : 'รอ QA ลงนามตรวจ'}
                            </TableCell>
                            <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                              <Button size="sm" variant="outline" onClick={() => handleOpenDetail(ev)}>
                                เปิดดูรายการ
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 6: EXECUTIVE QUALITY INTELLIGENCE (PHASE 6) ================= */}
        <TabsContent value="analytics" className="space-y-4 pt-4">
          <QualityIntelligenceCenter
            onNavigateToTab={(targetTab, filter) => {
              if (targetTab === 'events' || targetTab === 'deviations') {
                setActiveTab('events');
                if (filter?.search) setSearchQuery(filter.search);
                if (filter?.eventId) {
                  const ev = events.find((e) => e.id === filter.eventId || e.event_no === filter.search);
                  if (ev) handleOpenDetail(ev);
                } else if (filter?.search) {
                  const ev = events.find((e) => e.event_no === filter.search);
                  if (ev) handleOpenDetail(ev);
                }
              } else if (targetTab === 'batch_release' || targetTab === 'batch-release') {
                setActiveTab('batch_release');
                if (filter?.releaseId) setSelectedReleaseId(filter.releaseId);
              } else if (targetTab === 'effectiveness' || targetTab === 'capa_effectiveness' || (targetTab === 'capa' && filter?.planId)) {
                if (filter?.capaId) {
                  handleOpenEffectivenessWorkspace(filter.capaId);
                } else if (filter?.planId) {
                  const matched = effectivenessQueue.find((c: any) => c.effectiveness_plan_id === filter.planId || c.id === filter.planId);
                  if (matched) {
                    handleOpenEffectivenessWorkspace(matched.id);
                  } else {
                    setActiveTab('capa_register');
                  }
                } else {
                  setActiveTab('capa_register');
                }
              } else if (targetTab === 'capa_register' || targetTab === 'capa') {
                setActiveTab('capa_register');
                if (filter?.capaId) handleOpenCapaWorkspace(filter.capaId);
              } else if (targetTab === 'investigations' || targetTab === 'investigation') {
                if (filter?.eventId) {
                  const ev = events.find((e) => e.id === filter.eventId);
                  if (ev) handleOpenInvestigation(ev);
                } else if (filter?.search) {
                  setActiveTab('events');
                  setSearchQuery(filter.search);
                }
              } else {
                setActiveTab(targetTab);
              }
            }}
          />
        </TabsContent>

        {/* ================= TAB 5: BATCH QA REVIEW & RELEASE (PHASE 5) ================= */}
        <TabsContent value="batch_release" className="space-y-4 pt-4">
          {selectedReleaseId ? (
            <BatchReleaseCockpit
              releaseId={selectedReleaseId}
              onBack={() => setSelectedReleaseId(null)}
            />
          ) : (
            <BatchReleaseRegister
              onSelectRelease={(relId) => setSelectedReleaseId(relId)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* ================= MODAL 1: REPORT QUALITY EVENT ================= */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-rose-600" />
              รายงานเหตุการณ์คุณภาพ (+ REPORT QUALITY EVENT)
            </DialogTitle>
            <DialogDescription className="text-xs">
              กรอกข้อมูลสิ่งที่เกิดขึ้นจริงหน้างาน ระบบ Assurance AI จะช่วยวิเคราะห์ความรุนแรงและเสนอแนะแนวทางเบื้องต้น
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReport} className="space-y-4 py-2">
            {/* 1. Location & Manufacturing Context */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                1. ตำแหน่งที่เกิดเหตุ & บริบทการผลิต
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">แผนก (Department)</Label>
                  <select 
                    value={reportForm.department_id}
                    onChange={(e) => setReportForm({ ...reportForm, department_id: e.target.value })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
                  >
                    <option value="">-- เลือกแผนก --</option>
                    {masterData.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">ห้อง / เครื่องจักร (Room/Line)</Label>
                  <select 
                    value={reportForm.room_id}
                    onChange={(e) => setReportForm({ ...reportForm, room_id: e.target.value })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
                  >
                    <option value="">-- เลือกห้อง/เครื่อง --</option>
                    {masterData.rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.room_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">ตลาดเป้าหมาย (Regulatory Overlay)</Label>
                  <select 
                    value={reportForm.destination_market}
                    onChange={(e) => setReportForm({ ...reportForm, destination_market: e.target.value as any })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
                  >
                    <option value="DOMESTIC_TH">🇹🇭 ในประเทศ (Domestic TH)</option>
                    <option value="USA_MOCRA">🇺🇸 สหรัฐฯ (MoCRA Overlay)</option>
                    <option value="UAE_GSO">🇦🇪 UAE (GSO Halal)</option>
                    <option value="CAMBODIA_CLMV">🇰🇭 กัมพูชา (CLMV Export)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <Label className="text-xs">ประเภทสิ่งที่พบปัญหา</Label>
                  <select 
                    value={reportForm.material_type}
                    onChange={(e) => setReportForm({ ...reportForm, material_type: e.target.value as any })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
                  >
                    <option value="BULK">Bulk (เนื้อครีม/เจล)</option>
                    <option value="RM">Raw Material (สารเคมีวัตถุดิบ)</option>
                    <option value="PM">Packaging Material (บรรจุภัณฑ์)</option>
                    <option value="FG">Finished Good (สินค้าสำเร็จรูป)</option>
                    <option value="EQUIP">Equipment (เครื่องจักร/อุปกรณ์)</option>
                    <option value="ENV">Environment (สภาพแวดล้อมห้องสะอาด)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">สินค้า (Product SKU)</Label>
                  <select 
                    value={reportForm.product_id}
                    onChange={(e) => setReportForm({ ...reportForm, product_id: e.target.value })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
                  >
                    <option value="">-- ไม่ระบุ / ระบุในรายละเอียด --</option>
                    {masterData.products.map(p => (
                      <option key={p.id} value={p.id}>{p.sku} {p.product_name ? `- ${p.product_name}` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">ล็อตการผลิต (Lot No.)</Label>
                  <Input 
                    placeholder="เช่น LOT 015/26" 
                    value={reportForm.material_lot_no}
                    onChange={(e) => setReportForm({ ...reportForm, material_lot_no: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            {/* 2. What Happened & Objective Facts */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">หัวข้อเหตุการณ์ (Event Title) *</Label>
                <Input 
                  placeholder="เช่น ค่าความหนืด Bulk Gel Cream หลุดสเปกต่ำกว่ามาตรฐาน" 
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">รายละเอียดสิ่งที่พบ (Description) *</Label>
                <Textarea 
                  placeholder="อธิบายเหตุการณ์ที่เกิดขึ้นอย่างตรงไปตรงมา เช่น วัดค่าความหนืดได้ 8,200 cP หลังกวนครบเวลา..." 
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">สภาพที่ควรจะเป็นตามมาตรฐาน (Expected)</Label>
                  <Input 
                    placeholder="เช่น ค่าความหนืด 12,000 - 18,000 cP" 
                    value={reportForm.expected_condition}
                    onChange={(e) => setReportForm({ ...reportForm, expected_condition: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">สภาพที่พบจริง (Actual Condition)</Label>
                  <Input 
                    placeholder="เช่น วัดได้ 8,200 cP" 
                    value={reportForm.actual_condition}
                    onChange={(e) => setReportForm({ ...reportForm, actual_condition: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">การแก้ไขเฉพาะหน้าทันที (Immediate Action Taken)</Label>
                <Input 
                  placeholder="เช่น ระงับการถ่าย Bulk และแจ้งหัวหน้ากะผสมทันที" 
                  value={reportForm.immediate_action_taken}
                  onChange={(e) => setReportForm({ ...reportForm, immediate_action_taken: e.target.value })}
                  className="text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">จำนวนที่ได้รับผลกระทบ</Label>
                  <Input 
                    type="number"
                    placeholder="เช่น 250" 
                    value={reportForm.quantity_affected}
                    onChange={(e) => setReportForm({ ...reportForm, quantity_affected: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">หน่วย (Unit)</Label>
                  <Input 
                    value={reportForm.quantity_unit}
                    onChange={(e) => setReportForm({ ...reportForm, quantity_unit: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Photo Attachment & Live AI Pre-Triage Banner */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">แนบภาพถ่ายหลักฐาน (Photo Evidence)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => {
                      // Simulate camera attachment
                      setReportForm({
                        ...reportForm,
                        photo_preview: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop'
                      })
                      toast.info('จำลองการถ่ายภาพจากกล้องสำเร็จ')
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    ถ่ายภาพผ่านกล้อง / เลือกไฟล์
                  </Button>
                  {reportForm.photo_preview && (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> แนบภาพสำเร็จ
                    </span>
                  )}
                </div>
              </div>

              {/* Live AI Pre-Triage Card */}
              {liveAiPreTriage && (
                <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-indigo-500/30 flex items-start gap-3 shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-300">Assurance AI Pre-Assessment:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${liveAiPreTriage.badgeColor}`}>
                        {liveAiPreTriage.type} | {liveAiPreTriage.severity}
                      </span>
                    </div>
                    <p className="text-slate-300">{liveAiPreTriage.rationale}</p>
                    <p className="text-[11px] text-slate-400">
                      เส้นทางที่แนะนำ: <span className="font-semibold text-white">{liveAiPreTriage.path}</span> (ต้องผ่านการยืนยันโดย QA)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsReportModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                disabled={submitting} 
                className="bg-gradient-to-r from-rose-600 to-indigo-600 text-white gap-2 font-semibold"
              >
                {submitting ? 'กำลังบันทึก...' : 'ส่งรายงานเข้าระบบ (Submit Quality Event) ➔'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 2: QUALITY EVENT ASSESSMENT ================= */}
      <Dialog open={isTriageModalOpen} onOpenChange={setIsTriageModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              การประเมินเหตุการณ์คุณภาพ (Quality Event Assessment)
            </DialogTitle>
            <DialogDescription className="text-xs">
              ประเมินผลกระทบ ระดับความเสี่ยง การควบคุมเบื้องต้น และแนวทางดำเนินการต่อ
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-2">
              {/* Event brief summary */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1 border border-slate-200">
                <div className="flex justify-between font-mono font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-indigo-600 font-bold">{selectedEvent.event_no}</span>
                  <span className="text-[11px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                    ตลาด: {selectedEvent.destination_market}
                  </span>
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedEvent.title}</p>
                <p className="text-slate-500 line-clamp-2">{selectedEvent.description}</p>
              </div>

              {/* 1. Quick Impact Assessment (7 dimensions) */}
              <div className="border border-indigo-100 bg-indigo-50/20 dark:bg-slate-900/40 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      การประเมินผลกระทบเบื้องต้น (Initial Impact Assessment)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">ตอบ 7 มิติหลัก</span>
                </div>

                <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                  {IMPACT_QUESTIONS.map(q => {
                    const currentVal = triageForm.initial_impact_assessment[q.key]
                    return (
                      <div key={q.key} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-[12px]">{q.subtitle}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({q.title})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{q.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...triageForm.initial_impact_assessment, [q.key]: 'YES' as const }
                              let nextSev = triageForm.qa_confirmed_severity
                              let nextRisk = triageForm.risk_level
                              let nextPath = triageForm.workflow_path
                              let nextContain = triageForm.containment_required
                              let nextTypes = [...triageForm.containment_types]
                              
                              if (q.key === 'consumer_safety' || q.key === 'product_quality') {
                                if (nextSev === 'MINOR') {
                                  nextSev = 'MAJOR'
                                  nextRisk = 'HIGH'
                                  nextPath = 'STANDARD'
                                }
                              }
                              if (q.key === 'consumer_safety') {
                                nextContain = true
                                if (!nextTypes.includes('Hold Production Batch')) {
                                  nextTypes.push('Hold Production Batch')
                                }
                              }
                              setTriageForm({
                                ...triageForm,
                                initial_impact_assessment: next,
                                qa_confirmed_severity: nextSev,
                                risk_level: nextRisk,
                                workflow_path: nextPath,
                                containment_required: nextContain,
                                containment_types: nextTypes
                              })
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              currentVal === 'YES' 
                                ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-600' 
                                : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            ใช่ (YES)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTriageForm({
                              ...triageForm,
                              initial_impact_assessment: {
                                ...triageForm.initial_impact_assessment,
                                [q.key]: 'NO'
                              }
                            })}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              currentVal === 'NO' 
                                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600' 
                                : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            ไม่ (NO)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTriageForm({
                              ...triageForm,
                              initial_impact_assessment: {
                                ...triageForm.initial_impact_assessment,
                                [q.key]: 'UNKNOWN'
                              }
                            })}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                              currentVal === 'UNKNOWN' 
                                ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-500' 
                                : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            ไม่แน่ชัด (?)
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Dynamic Guardrail alerts */}
              {triageForm.initial_impact_assessment.consumer_safety === 'YES' && (
                <div className="p-2.5 rounded-lg border bg-rose-50 border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">⚠️ ข้อบังคับความปลอดภัยผู้บริโภค (Consumer Safety Guardrail):</span> กระทบความปลอดภัยผู้บริโภค ระบบจำกัดไม่ให้เลือก Minor + Fast-Track เว้นแต่ QA Manager จะระบุเหตุผลยืนยันอย่างชัดเจน (อย่างน้อย 15 ตัวอักษร)
                  </div>
                </div>
              )}

              {triageForm.initial_impact_assessment.regulatory_labeling === 'YES' && (
                <div className="p-2.5 rounded-lg border bg-amber-50 border-amber-300 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">⚖️ ข้อบังคับด้านกฎหมาย/ฉลาก (Regulatory Guardrail):</span> มีผลกระทบต่อข้อกำหนด อย./ฉลาก แนะนำดำเนินการสอบสวน (Standard) หากเลือก Fast-Track ต้องระบุเหตุผลยืนยัน
                  </div>
                </div>
              )}

              {triageForm.initial_impact_assessment.other_batch_market === 'YES' && (
                <div className="p-2.5 rounded-lg border bg-red-50 border-red-300 text-red-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">🚨 ขอบเขตกระทบแบทช์อื่นหรือสู่ตลาด (Market/Batch Guardrail):</span> ต้องตรวจสอบขอบเขตการกักกันให้ครอบคลุมแบทช์ข้างเคียงและวัตถุดิบล็อตเดียวกัน
                  </div>
                </div>
              )}

              {Object.values(triageForm.initial_impact_assessment).includes('UNKNOWN') && (
                <div className="p-2 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 text-xs flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">ℹ️ ประเด็นที่ยังไม่แน่ชัด:</span> มีรายการที่เลือก "ไม่แน่ชัด" ต้องมีการตรวจสอบยืนยันเพิ่มเติมในขั้นตอนดำเนินการก่อนปิดเหตุการณ์
                  </div>
                </div>
              )}

              {/* 2. Type & Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">ประเภทยืนยันโดย QA</Label>
                  <select 
                    value={triageForm.qa_confirmed_type}
                    onChange={(e) => setTriageForm({ ...triageForm, qa_confirmed_type: e.target.value as any })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
                  >
                    <option value="DEVIATION">Deviation (ความเบี่ยงเบน)</option>
                    <option value="NCR">NCR (ชิ้นงานไม่ได้มาตรฐาน)</option>
                    <option value="OOS">OOS (ผลตรวจผิดสเปก)</option>
                    <option value="COMPLAINT">Customer Complaint (ข้อร้องเรียน)</option>
                    <option value="EQUIPMENT_ISSUE">Equipment Issue (เครื่องจักรขัดข้อง)</option>
                    <option value="GMP_OBSERVATION">GMP Observation (ข้อสังเกตทั่วไป)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">ระดับความรุนแรง (Severity)</Label>
                  <select 
                    value={triageForm.qa_confirmed_severity}
                    onChange={(e) => {
                      const sev = e.target.value as QmsSeverity
                      setTriageForm({ 
                        ...triageForm, 
                        qa_confirmed_severity: sev,
                        risk_level: sev === 'CRITICAL' ? 'CRITICAL' : sev === 'MAJOR' ? 'HIGH' : 'LOW',
                        workflow_path: sev === 'CRITICAL' ? 'FULL_CAPA' : sev === 'MAJOR' ? 'STANDARD' : 'FAST_TRACK',
                        containment_required: sev === 'CRITICAL' ? true : triageForm.containment_required,
                        containment_types: (sev === 'CRITICAL' && triageForm.containment_types.length === 0) 
                          ? ['Hold Production Batch'] 
                          : triageForm.containment_types
                      })
                    }}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md font-semibold"
                  >
                    <option value="CRITICAL">🔴 Critical (วิกฤต)</option>
                    <option value="MAJOR">🟡 Major (ร้ายแรง)</option>
                    <option value="MINOR">🟢 Minor (เล็กน้อย)</option>
                  </select>
                </div>
              </div>

              {/* 3. Risk Level & Workflow Path */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">ระดับความเสี่ยง (Risk Level)</Label>
                  <select 
                    value={triageForm.risk_level}
                    onChange={(e) => setTriageForm({ ...triageForm, risk_level: e.target.value as any })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
                  >
                    <option value="CRITICAL">🔴 CRITICAL (วิกฤต)</option>
                    <option value="HIGH">🟠 HIGH (สูง)</option>
                    <option value="MEDIUM">🟡 MEDIUM (ปานกลาง)</option>
                    <option value="LOW">🟢 LOW (ต่ำ)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">เส้นทางการจัดการ (Workflow Path)</Label>
                  <select 
                    value={triageForm.workflow_path}
                    onChange={(e) => setTriageForm({ ...triageForm, workflow_path: e.target.value as any })}
                    className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md font-semibold"
                  >
                    <option value="FAST_TRACK">⚡ FAST-TRACK (แก้ไขทันที / ตรวจยืนยัน / ปิดเหตุการณ์)</option>
                    <option value="STANDARD">🔬 STANDARD INVESTIGATION (สอบสวนสาเหตุและดำเนินการแก้ไข)</option>
                    <option value="FULL_CAPA">🎯 FULL INVESTIGATION (ควบคุมทันที / สอบสวนเชิงลึก / พิจารณา CAPA)</option>
                  </select>
                </div>
              </div>

              {/* 4. Immediate Containment Controls (Reorganized) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${triageForm.containment_required ? 'text-red-600' : 'text-slate-400'}`} />
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ต้องดำเนินการควบคุม/กักกันทันทีหรือไม่? (Immediate Containment)
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextTypes = triageForm.containment_types.length > 0 
                          ? triageForm.containment_types 
                          : ['Hold Production Batch']
                        setTriageForm({ 
                          ...triageForm, 
                          containment_required: true,
                          containment_types: nextTypes
                        })
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        triageForm.containment_required 
                          ? 'bg-red-600 text-white shadow-sm' 
                          : 'bg-white border text-slate-600 hover:bg-red-50'
                      }`}
                    >
                      ✅ ใช่ (ต้องกักกัน)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTriageForm({ 
                        ...triageForm, 
                        containment_required: false,
                        containment_types: []
                      })}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        !triageForm.containment_required 
                          ? 'bg-slate-700 text-white shadow-sm' 
                          : 'bg-white border text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ⚪ ไม่จำเป็น
                    </button>
                  </div>
                </div>

                {triageForm.containment_required && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                        เลือกประเภทมาตรการควบคุม/กักกัน (เลือกได้หลายข้อ):
                      </span>
                      <span className="text-[10px] text-slate-500">
                        เลือกแล้ว {triageForm.containment_types.length} ข้อ
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CONTAINMENT_CHOICES.map(c => {
                        const isSelected = triageForm.containment_types.includes(c.id)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const types = isSelected 
                                ? triageForm.containment_types.filter(t => t !== c.id)
                                : [...triageForm.containment_types, c.id]
                              setTriageForm({ ...triageForm, containment_types: types })
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                              isSelected 
                                ? 'bg-red-600 text-white border-red-700 shadow-sm' 
                                : 'bg-white text-slate-700 border-slate-200 hover:border-red-300 hover:bg-red-50/50'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{c.label} ({c.desc})
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Classification Notes & Justification */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    บันทึกเหตุผลประกอบการประเมิน (QA Classification Notes)
                  </Label>
                  {((triageForm.initial_impact_assessment.consumer_safety === 'YES' && triageForm.workflow_path === 'FAST_TRACK') ||
                    (triageForm.initial_impact_assessment.regulatory_labeling === 'YES' && triageForm.workflow_path === 'FAST_TRACK')) && (
                    <span className="text-[10px] font-bold text-rose-600">
                      * จำเป็นต้องระบุเหตุผลอย่างน้อย 15 ตัวอักษร ({triageForm.qa_classification_notes.trim().length}/15)
                    </span>
                  )}
                </div>
                <Textarea 
                  placeholder="ระบุเหตุผลการจัดระดับ ความเสี่ยง หรือบันทึกเหตุผล SoD / Guardrail Override..."
                  value={triageForm.qa_classification_notes}
                  onChange={(e) => setTriageForm({ ...triageForm, qa_classification_notes: e.target.value })}
                  className="text-xs mt-1"
                  rows={2}
                />
              </div>

              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded text-[11px] text-slate-500 flex justify-between items-center">
                <span>ผู้ลงนามประเมิน: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.name}</span> ({currentUser.role})</span>
                <span className="text-[10px] text-slate-400 font-mono">ISO 22716 E-Sign Verification</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button variant="ghost" onClick={() => setIsTriageModalOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={handleSubmitTriage} 
              disabled={submitting} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold"
            >
              {submitting ? 'กำลังบันทึก...' : 'ลงนามและยืนยันผลการประเมิน (Confirm Assessment) ➔'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 3: 360° EVENT DETAIL & TRACEABILITY ================= */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-2 font-mono">
                {selectedEvent?.event_no}
              </DialogTitle>
              {selectedEvent && getStatusBadge(selectedEvent.current_status)}
            </div>
            <DialogDescription className="text-xs">
              สืบย้อนกลับ 360° | บันทึกประวัติศาสตร์ถาวร (Immutable Snapshot Context) & Audit Trail
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-2">
              {/* Event facts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block">วันที่บันทึก:</span>
                  <span className="font-semibold">{new Date(selectedEvent.event_date).toLocaleString('th-TH')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ผู้รายงาน:</span>
                  <span className="font-semibold">{selectedEvent.reporter_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ความรุนแรง:</span>
                  <span className="font-semibold">{selectedEvent.qa_confirmed_severity || selectedEvent.ai_suggested_severity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ตลาดเป้าหมาย:</span>
                  <span className="font-semibold">{selectedEvent.destination_market}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedEvent.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{selectedEvent.description}</p>
              </div>

              {/* Initial Impact Assessment & Containment Summary Strip */}
              {selectedEvent.initial_impact_assessment && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border text-xs space-y-1.5">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] flex items-center justify-between">
                    <span>ผลการประเมินผลกระทบเบื้องต้น (Initial Impact Assessment):</span>
                    {selectedEvent.containment_types && selectedEvent.containment_types.length > 0 && (
                      <span className="text-[10px] text-red-600 font-bold">
                        มาตรการกักกัน: {selectedEvent.containment_types.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selectedEvent.initial_impact_assessment).map(([key, val]) => (
                      <span 
                        key={key} 
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          val === 'YES' 
                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' 
                            : val === 'UNKNOWN' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {key}: {val}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tabs for Details */}
              <Tabs defaultValue="containment_list" className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-800 text-xs">
                  <TabsTrigger value="containment_list">คำสั่งกักกัน ({selectedEventDetails.containmentActions.length})</TabsTrigger>
                  <TabsTrigger value="snapshot">Historical Snapshot (ALCOA+)</TabsTrigger>
                  <TabsTrigger value="signatures">ลายเซ็นอิเล็กทรอนิกส์ ({selectedEventDetails.signatures.length})</TabsTrigger>
                  <TabsTrigger value="audit_trail">ประวัติการแก้ไข Audit ({selectedEventDetails.auditLogs.length})</TabsTrigger>
                </TabsList>

                {/* Containment List */}
                <TabsContent value="containment_list" className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">รายการกักกันที่เกี่ยวข้องกับเหตุการณ์นี้</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-7 gap-1 text-red-600 border-red-300"
                      onClick={() => {
                        setContainmentForm({
                          ...containmentForm,
                          item_reference: selectedEvent.material_lot_no || selectedEvent.title
                        })
                        setIsContainmentModalOpen(true)
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> เพิ่มคำสั่งกักกัน
                    </Button>
                  </div>

                  {selectedEventDetails.containmentActions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded">ยังไม่มีคำสั่งกักกัน</p>
                  ) : (
                    selectedEventDetails.containmentActions.map(act => (
                      <div key={act.id} className="p-3 bg-white border rounded-lg space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-600 font-mono">{act.action_type}: {act.item_reference}</span>
                          <Badge variant="outline">{act.status}</Badge>
                        </div>
                        <p className="text-slate-700">{act.action_description}</p>
                        
                        {act.status === 'PENDING' && (
                          <div className="pt-2 border-t flex items-center gap-2">
                            <Input 
                              placeholder="ระบุข้อความผลการติดป้าย Hold หรือกั้นพื้นที่..." 
                              value={execNotes} 
                              onChange={(e) => setExecNotes(e.target.value)} 
                              className="text-xs h-7"
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleExecuteAction(act.id)}>
                              บันทึกการกักกัน
                            </Button>
                          </div>
                        )}

                        {act.status === 'EXECUTED' && (
                          <div className="pt-2 border-t flex items-center justify-between bg-amber-50/50 p-2 rounded">
                            <span className="text-slate-500">ดำเนินการแล้ว รอ QA ตรวจสอบหน้างาน</span>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs" onClick={() => handleVerifyAction(act.id)}>
                              QA ลงนามรับรอง
                            </Button>
                          </div>
                        )}

                        {act.status === 'VERIFIED' && (
                          <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ตรวจสอบยืนยันโดย {act.qa_verified_by_name} แล้ว
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Snapshot Context */}
                <TabsContent value="snapshot" className="space-y-3 pt-2">
                  <div className="bg-indigo-50/60 dark:bg-slate-800/60 p-3 rounded-lg border border-indigo-100 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <Archive className="w-4 h-4 text-indigo-600" />
                        บริบทประวัติศาสตร์ถาวร (ALCOA+ Immutable Snapshot Context)
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white border-indigo-200 text-indigo-700 font-mono">
                        Schema v{selectedEvent.snapshot_context?.schema_version || '1.0'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      บันทึกภาพถ่ายสถานะ Master Data (ฝ่าย, ห้อง, เครื่องจักร, SKU, Lot) ณ วินาทีที่เกิดเหตุอย่างถาวร ไม่สูญหายหรือถูกเปลี่ยนแปลงตามการอัปเดตระบบในอนาคต
                    </p>
                  </div>

                  {selectedEvent.snapshot_context && Object.keys(selectedEvent.snapshot_context).length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                          <span className="text-[10px] text-slate-400 block">ผู้รายงานเหตุการณ์:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedEvent.snapshot_context.reporter?.full_name || selectedEvent.reporter_name || 'N/A'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                          <span className="text-[10px] text-slate-400 block">หน่วยงาน & ห้องผลิต:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedEvent.snapshot_context.organization?.department_name || 'บรรจุ/ผลิต'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {selectedEvent.snapshot_context.organization?.room_name || 'ไลน์ผลิตหน้างาน'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                          <span className="text-[10px] text-slate-400 block">รหัสเครื่องจักร:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                            {selectedEvent.snapshot_context.organization?.machine_code || selectedEvent.equipment_code || 'N/A'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                          <span className="text-[10px] text-slate-400 block">ผลิตภัณฑ์ / SKU:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedEvent.snapshot_context.manufacturing_context?.product?.product_name || selectedEvent.title}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {selectedEvent.snapshot_context.manufacturing_context?.product?.sku || 'N/A'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                          <span className="text-[10px] text-slate-400 block">ล็อตการผลิต (Batch Lot):</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                            {selectedEvent.snapshot_context.manufacturing_context?.production_lot?.lot_no || selectedEvent.material_lot_no || 'N/A'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                          <span className="text-[10px] text-slate-400 block">วัตถุดิบ/บรรจุภัณฑ์:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedEvent.snapshot_context.manufacturing_context?.material?.material_type || selectedEvent.material_type} (ล็อต {selectedEvent.snapshot_context.manufacturing_context?.material?.material_lot_no || selectedEvent.material_lot_no || '-'})
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] max-h-60 overflow-y-auto">
                        <pre>{JSON.stringify(selectedEvent.snapshot_context, null, 2)}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-lg border text-center text-xs text-slate-500 space-y-1">
                      <p className="font-semibold">ไม่มี Snapshot Context ย้อนหลังสำหรับรายการนี้</p>
                      <p className="text-[11px] text-slate-400">รายการนี้อาจถูกสร้างจากสคริปต์ทดสอบโดยตรงก่อนการติดตั้งระบบบันทึก ALCOA+ Snapshot</p>
                    </div>
                  )}
                </TabsContent>

                {/* Signatures */}
                <TabsContent value="signatures" className="space-y-2 pt-2">
                  {selectedEventDetails.signatures.map(s => (
                    <div key={s.id} className="p-2.5 bg-slate-50 border rounded-md text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-800">{s.signature_meaning}</span>
                        <div className="text-slate-500 text-[11px]">
                          โดย: {s.signer_name} ({s.signer_role}) • {new Date(s.signature_timestamp).toLocaleString('th-TH')}
                        </div>
                        {s.reason_comment && <div className="text-slate-600 italic mt-0.5">"{s.reason_comment}"</div>}
                      </div>
                      <Badge variant="outline" className="text-[10px]">Verified E-Sign</Badge>
                    </div>
                  ))}
                </TabsContent>

                {/* Audit Trail */}
                <TabsContent value="audit_trail" className="space-y-2 pt-2">
                  {selectedEventDetails.auditLogs.map(l => (
                    <div key={l.id} className="p-2.5 bg-slate-50 border rounded-md text-xs space-y-1">
                      <div className="flex justify-between font-mono text-[11px] text-slate-500">
                        <span>{l.action_type} (V{l.record_version})</span>
                        <span>{new Date(l.created_at).toLocaleString('th-TH')}</span>
                      </div>
                      <div className="text-slate-700">ผู้แก้ไข: {l.changed_by_name}</div>
                      {l.change_reason && <div className="text-slate-500 text-[11px]">เหตุผล: {l.change_reason}</div>}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-3 border-t">
                <div className="flex items-center gap-2">
                  {selectedEvent.current_status === 'CLOSED' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-amber-600 border-amber-300 text-xs"
                      onClick={() => setIsReopenModalOpen(true)}
                    >
                      ขอเปิดเคสใหม่ (Controlled Reopen)
                    </Button>
                  ) : ['INVESTIGATION_PENDING', 'INVESTIGATING', 'CONTAINMENT_ACTIVE', 'QA_REVIEW'].includes(selectedEvent.current_status) ? (
                    <Button 
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm font-medium"
                      onClick={() => {
                        setIsDetailModalOpen(false)
                        handleOpenInvestigation(selectedEvent)
                      }}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>เปิดห้องสืบสวน (Investigation Cockpit) ➔</span>
                    </Button>
                  ) : (
                    <div />
                  )}

                  {(selectedEvent.workflow_path === 'FULL_INVESTIGATION' || selectedEvent.current_status === 'CLOSED') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 text-xs flex items-center gap-1.5 font-bold"
                      onClick={() => {
                        setIsDetailModalOpen(false)
                        handleOpenCapaWorkspace(undefined, undefined)
                      }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>ห้องจัดการ CAPA ➔</span>
                    </Button>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  ปิดหน้าต่าง
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 4: ADD CONTAINMENT ACTION ================= */}
      <Dialog open={isContainmentModalOpen} onOpenChange={setIsContainmentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600" />
              ออกคำสั่งกักกันสินค้า / ระงับสายการผลิต
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">ประเภทการกักกัน</Label>
              <select 
                value={containmentForm.action_type}
                onChange={(e) => setContainmentForm({ ...containmentForm, action_type: e.target.value as any })}
                className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded-md"
              >
                <option value="HOLD_LOT">HOLD_LOT (กักกันล็อตผลิตภัณฑ์)</option>
                <option value="HOLD_MATERIAL">HOLD_MATERIAL (ระงับวัตถุดิบ/บรรจุภัณฑ์)</option>
                <option value="STOP_LINE">STOP_LINE (หยุดสายการผลิตชั่วคราว)</option>
                <option value="QUARANTINE_AREA">QUARANTINE_AREA (กั้นพื้นที่กักกัน)</option>
                <option value="INCREASE_INSPECTION">INCREASE_INSPECTION (เพิ่มความถี่การสุ่มตรวจ)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">เป้าหมายที่ระงับ (Item / Lot Reference) *</Label>
              <Input 
                value={containmentForm.item_reference}
                onChange={(e) => setContainmentForm({ ...containmentForm, item_reference: e.target.value })}
                placeholder="เช่น LOT 015/26 หรือ ถังผสม TK-04" 
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">คำสั่งการดำเนินการ (Directive) *</Label>
              <Textarea 
                value={containmentForm.action_description}
                onChange={(e) => setContainmentForm({ ...containmentForm, action_description: e.target.value })}
                placeholder="เช่น ติดป้ายสีแดง HOLD ย้ายสินค้าเข้ากรงกักกันชั้น 2 และแจ้ง WMS ล็อคสต็อกในระบบ"
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">กำหนดเวลาแล้วเสร็จ (Due Date)</Label>
              <Input 
                type="date"
                value={containmentForm.due_date}
                onChange={(e) => setContainmentForm({ ...containmentForm, due_date: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsContainmentModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleAddContainment}>
              ออกคำสั่งกักกัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 5: FAST-TRACK CLOSE ================= */}
      <Dialog open={isFastCloseModalOpen} onOpenChange={setIsFastCloseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ปิดเคสแบบ Fast-Track (Direct Correction & Close)
            </DialogTitle>
            <DialogDescription className="text-xs">
              สำหรับข้อบกพร่องเล็กน้อย (Minor) ที่แก้ไขเสร็จสิ้นหน้างานเรียบร้อย
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">การแก้ไขที่ได้ทำไปแล้ว (Correction Done) *</Label>
              <Textarea 
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="เช่น ปรับตั้งตำแหน่งหัวยิงสติ๊กเกอร์ใหม่ และตรวจสอบ 20 ชิ้นถัดไปผ่านเกณฑ์ 100%"
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">บันทึกการตรวจรับรองโดย QA (QA Closure Notes) *</Label>
              <Textarea 
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="เช่น QA ตรวจสอบตัวอย่างหน้าไลน์ไม่พบปัญหาซ้ำ อนุญาตให้ดำเนินการผลิตต่อและปิดเคส"
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <div className="bg-emerald-50 p-2.5 rounded text-[11px] text-emerald-800">
              ผู้ลงนามปิดเคส: <span className="font-semibold">{currentUser.name}</span> ({currentUser.role})
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsFastCloseModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleFastClose} disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'ลงนามและปิดเคสถาวร ➔'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 6: CONTROLLED REOPEN ================= */}
      <Dialog open={isReopenModalOpen} onOpenChange={setIsReopenModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              ขอเปิดเคสใหม่ (Controlled Reopen)
            </DialogTitle>
            <DialogDescription className="text-xs">
              การ Reopen ต้องได้รับอนุญาตจาก QA Manager และมีบันทึกเหตุผลใน Audit Trail เสมอ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">เหตุผลความจำเป็นในการ Reopen (อย่างน้อย 15 ตัวอักษร) *</Label>
              <Textarea 
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="เช่น พบปัญหาซ้ำในล็อตถัดไป หรือพบข้อเท็จจริงเพิ่มเติมที่ต้องนำกลับมาสอบสวนใหม่..."
                rows={3}
                className="mt-1 text-xs"
              />
            </div>

            <div className="bg-amber-50 p-2.5 rounded text-[11px] text-amber-800">
              ผู้มีอำนาจลงนาม Reopen: <span className="font-semibold">{currentUser.name}</span> ({currentUser.role})
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsReopenModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleReopen} disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันการเปิดเคสใหม่'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 7: INVESTIGATION COCKPIT ================= */}
      {selectedEvent && (
        <InvestigationCockpit 
          isOpen={isInvestigationModalOpen}
          onClose={() => {
            setIsInvestigationModalOpen(false)
            loadAllData()
          }}
          qualityEvent={selectedEvent}
          currentUser={currentUser}
          onSuccess={() => {
            loadAllData()
          }}
          onOpenCapaWorkspace={(invId) => {
            setIsInvestigationModalOpen(false)
            handleOpenCapaWorkspace(undefined, invId)
          }}
        />
      )}

      {/* ================= MODAL 8: CAPA WORKSPACE ================= */}
      <CapaWorkspace 
        isOpen={isCapaWorkspaceOpen}
        onClose={() => {
          setIsCapaWorkspaceOpen(false)
          setSelectedCapaId(undefined)
          setSelectedInvestigationId(undefined)
          setCapaRefreshKey(prev => prev + 1)
          loadAllData()
        }}
        capaId={selectedCapaId}
        investigationId={selectedInvestigationId}
        currentUser={currentUser}
        onOpenEffectiveness={(capaId) => {
          setIsCapaWorkspaceOpen(false)
          handleOpenEffectivenessWorkspace(capaId)
        }}
        onSuccess={() => {
          setCapaRefreshKey(prev => prev + 1)
          loadAllData()
        }}
      />

      {/* ================= MODAL 9: EFFECTIVENESS WORKSPACE (PHASE 4) ================= */}
      {selectedEffectivenessCapaId && (
        <EffectivenessWorkspace 
          isOpen={isEffectivenessWorkspaceOpen}
          onClose={() => {
            setIsEffectivenessWorkspaceOpen(false)
            setSelectedEffectivenessCapaId(undefined)
            setCapaRefreshKey(prev => prev + 1)
            loadAllData()
          }}
          capaId={selectedEffectivenessCapaId}
          currentUser={currentUser}
          onSuccess={() => {
            setCapaRefreshKey(prev => prev + 1)
            loadAllData()
          }}
        />
      )}

      {/* In-App Notifications Drawer */}
      {isNotifDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl border-l z-50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Bell className="w-4 h-4 text-indigo-600" />
                ศูนย์แจ้งเตือน (QMS In-App SLA)
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setIsNotifDrawerOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-3 space-y-2 max-h-[75vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">ไม่มีการแจ้งเตือน</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-2.5 rounded-lg border text-xs space-y-1 ${n.event_severity === 'CRITICAL' ? 'bg-red-50/70 border-red-200' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{n.title}</span>
                      {n.is_read ? (
                        <span className="text-[10px] text-slate-400">อ่านแล้ว</span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px]">{n.message}</p>
                    
                    {n.requires_acknowledgement && !n.is_read && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="w-full h-6 text-[10px] bg-red-600 hover:bg-red-700 text-white mt-1"
                        onClick={() => handleAckNotif(n.id)}
                      >
                        กดรับทราบ (Acknowledge SLA)
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t text-[11px] text-slate-400 text-center">
            CosmeFlow Escalation Engine • SLA Verified
          </div>
        </div>
      )}

      {/* Phase 6: QHS Score Breakdown Modal */}
      <QhsScoreBreakdownModal
        open={isQhsModalOpen}
        onOpenChange={setIsQhsModalOpen}
        qhs={stats.qhsModel || null}
        onNavigateToTab={(tab, filter) => {
          setActiveTab(tab);
          if (filter?.search) setSearchQuery(filter.search);
        }}
      />
    </div>
  )
}
