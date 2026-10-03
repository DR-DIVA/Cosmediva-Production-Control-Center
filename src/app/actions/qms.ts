'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
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
  QmsSnapshotContextV1 
} from '@/types/qms'
import { calculateDeterministicQhs } from '@/utils/qms_analytics_engine'

// Helper AI Pre-Triage Rule Engine
function analyzeEventWithAi(title: string, description: string, materialType: string) {
  const text = `${title} ${description} ${materialType}`.toLowerCase()
  
  let suggestedType: QmsEventType = 'DEVIATION'
  let suggestedSeverity: QmsSeverity = 'MINOR'
  let suggestedRisk: QmsRiskLevel = 'LOW'
  let confidence = 0.88
  let rationale = 'ประเมินเบื้องต้นจากข้อมูลเหตุการณ์'

  if (text.includes('ความหนืด') || text.includes('viscosity') || text.includes('ph') || text.includes('assay') || text.includes('micro') || text.includes('เชื้อ') || text.includes('oos')) {
    suggestedType = 'OOS'
    suggestedSeverity = 'CRITICAL'
    suggestedRisk = 'CRITICAL'
    confidence = 0.94
    rationale = 'พบค่าทดสอบทางเคมี/จุลชีววิทยาหลุดสเปกมาตรฐาน มีความเสี่ยงต่อความปลอดภัยของผู้บริโภค ต้องกักกันล็อตและสอบสวน'
  } else if (text.includes('รั่ว') || text.includes('แตก') || text.includes('leak') || text.includes('crimp') || text.includes('บรรจุ') || text.includes('ฟอยล์') || text.includes('กล่องบุบ')) {
    suggestedType = 'NCR'
    suggestedSeverity = 'MAJOR'
    suggestedRisk = 'HIGH'
    confidence = 0.91
    rationale = 'พบความไม่สมบูรณ์ของบรรจุภัณฑ์หรือซีลปิดผนึก อาจทำให้สินค้าสูญเสียความคงตัวหรือปนเปื้อนในตลาด'
  } else if (text.includes('เครื่องหยุด') || text.includes('เครื่องจักร') || text.includes('sensor') || text.includes('ความร้อน') || text.includes('รอบกวน') || text.includes('motor')) {
    suggestedType = 'EQUIPMENT_ISSUE'
    suggestedSeverity = 'MAJOR'
    suggestedRisk = 'MEDIUM'
    confidence = 0.89
    rationale = 'พารามิเตอร์ของเครื่องจักรทำงานผิดปกติ กระทบต่อกระบวนการผลิต จำเป็นต้องแจ้งวิศวกรรมซ่อมบำรุง'
  } else if (text.includes('สติ๊กเกอร์') || text.includes('label') || text.includes('เอียง') || text.includes('รอยขีดข่วน') || text.includes('ผงฝุ่น')) {
    suggestedType = 'GMP_OBSERVATION'
    suggestedSeverity = 'MINOR'
    suggestedRisk = 'LOW'
    confidence = 0.86
    rationale = 'เป็นข้อสังเกตความสวยงามภายนอก ไม่กระทบต่อความปลอดภัย สามารถทำการแก้ไขเฉพาะหน้า (Fast-Track) ได้ทันที'
  } else if (text.includes('ลูกค้า') || text.includes('เคลม') || text.includes('ร้องเรียน') || text.includes('complaint')) {
    suggestedType = 'COMPLAINT'
    suggestedSeverity = 'MAJOR'
    suggestedRisk = 'HIGH'
    confidence = 0.92
    rationale = 'เป็นข้อร้องเรียนจากลูกค้า/แบรนด์ ต้องตรวจสอบย้อนกลับประวัติการผลิตและล็อตที่เกี่ยวข้อง'
  }

  return { suggestedType, suggestedSeverity, suggestedRisk, confidence, rationale }
}

export async function getMasterDataForQms() {
  const supabase = createAdminClient()

  const [prodsRes, lotsRes, deptsRes, roomsRes, procsRes, usersRes] = await Promise.all([
    supabase.from('products').select('id, sku, product_name, product_size, standard_batch_size, default_unit').eq('is_active', true).order('sku'),
    supabase.from('production_lots').select('id, lot_no, sku_id, po_no, order_no, batch_size_kg, planned_quantity').order('created_at', { ascending: false }).limit(60),
    supabase.from('departments').select('id, department_code, department_name').eq('is_active', true).order('department_name'),
    supabase.from('rooms').select('id, room_name, room_code, department_id, machine_code, room_type').eq('is_active', true).order('room_name'),
    supabase.from('processes').select('id, process_name').eq('is_active', true).order('process_name'),
    supabase.from('users').select('id, employee_code, full_name, email, department_id').eq('is_active', true).order('full_name')
  ])

  return {
    products: prodsRes.data || [],
    productionLots: lotsRes.data || [],
    departments: deptsRes.data || [],
    rooms: roomsRes.data || [],
    processes: procsRes.data || [],
    users: usersRes.data || []
  }
}

export async function getQmsDashboardStats() {
  const supabase = createAdminClient()

  const [eventsRes, invRes, capasRes, actionsRes, effRes, relRes] = await Promise.all([
    supabase
      .from('qms_quality_events')
      .select('id, event_no, current_status, qa_confirmed_severity, risk_level, workflow_path, containment_status, created_at, department_id, qa_confirmed_type, product_id, snapshot_context')
      .order('created_at', { ascending: false }),
    supabase.from('qms_investigations').select('*'),
    supabase.from('qms_capas').select('*'),
    supabase.from('qms_capa_actions').select('*'),
    supabase.from('qms_capa_effectiveness_plans').select('*'),
    supabase.from('qms_batch_releases').select('*'),
  ])

  const events = eventsRes.data || []
  const investigations = invRes.data || []
  const capas = capasRes.data || []
  const capaActions = actionsRes.data || []
  const effPlans = effRes.data || []
  const releases = relRes.data || []

  const qhs = calculateDeterministicQhs({
    events,
    investigations,
    capas,
    capaActions,
    effPlans,
    releases,
  })

  const openEvents = events.filter(e => !['CLOSED', 'VOIDED'].includes(e.current_status))
  const criticalEvents = events.filter(e => e.qa_confirmed_severity === 'CRITICAL' && !['CLOSED', 'VOIDED'].includes(e.current_status))
  const activeHolds = releases.filter(r => r.overall_status === 'QA_ON_HOLD' || r.is_blocked)
  const fastTrackClosed = events.filter(e => e.current_status === 'CLOSED' && e.workflow_path === 'FAST_TRACK')

  const paretoByType: Record<string, number> = {}
  events.forEach(e => {
    const type = e.qa_confirmed_type || 'UNCLASSIFIED'
    paretoByType[type] = (paretoByType[type] || 0) + 1
  })

  const severityBreakdown = {
    CRITICAL: events.filter(e => e.qa_confirmed_severity === 'CRITICAL').length,
    MAJOR: events.filter(e => e.qa_confirmed_severity === 'MAJOR').length,
    MINOR: events.filter(e => e.qa_confirmed_severity === 'MINOR' || !e.qa_confirmed_severity).length
  }

  return {
    healthScore: qhs.score,
    rawScore: qhs.rawScore,
    startingScore: qhs.startingScore,
    healthBand: qhs.healthBand,
    healthBandLabel: qhs.healthBandLabel,
    healthBandDescription: qhs.healthBandDescription,
    totalDeductions: qhs.totalDeductions,
    deductionLines: qhs.deductionLines,
    topDrivers: qhs.topDrivers,
    qhsModel: qhs,
    totalEvents: events.length,
    openEvents: openEvents.length,
    criticalEvents: criticalEvents.length,
    activeHolds: activeHolds.length,
    fastTrackClosed: fastTrackClosed.length,
    paretoByType,
    severityBreakdown
  }
}

export async function getQualityEvents(filters?: {
  status?: string
  severity?: string
  market?: string
  search?: string
}) {
  const supabase = createAdminClient()
  let query = supabase.from('qms_quality_events').select('*').order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'ALL') {
    if (filters.status === 'OPEN') {
      query = query.not('current_status', 'in', '("CLOSED","VOIDED")')
    } else {
      query = query.eq('current_status', filters.status)
    }
  }

  if (filters?.severity && filters.severity !== 'ALL') {
    query = query.eq('qa_confirmed_severity', filters.severity)
  }

  if (filters?.market && filters.market !== 'ALL') {
    query = query.eq('destination_market', filters.market)
  }

  if (filters?.search && filters.search.trim()) {
    const s = filters.search.trim()
    query = query.or(`event_no.ilike.%${s}%,title.ilike.%${s}%,description.ilike.%${s}%,material_lot_no.ilike.%${s}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching quality events:', error)
    return { success: false, data: [] }
  }

  return { success: true, data: data as QmsQualityEvent[] }
}

export async function getQualityEventById(id: string) {
  const supabase = createAdminClient()

  const [eventRes, containRes, signsRes, auditRes] = await Promise.all([
    supabase.from('qms_quality_events').select('*').eq('id', id).single(),
    supabase.from('qms_event_containment_actions').select('*').eq('quality_event_id', id).order('created_at', { ascending: true }),
    supabase.from('qms_electronic_signatures').select('*').eq('entity_id', id).order('signature_timestamp', { ascending: true }),
    supabase.from('qms_audit_trail').select('*').eq('record_id', id).order('created_at', { ascending: false })
  ])

  if (eventRes.error || !eventRes.data) {
    return { 
      success: false, 
      error: 'Event not found',
      event: null as any,
      containmentActions: [] as QmsContainmentAction[],
      signatures: [] as any[],
      auditLogs: [] as any[]
    }
  }

  return {
    success: true,
    event: eventRes.data as QmsQualityEvent,
    containmentActions: (containRes.data || []) as QmsContainmentAction[],
    signatures: signsRes.data || [],
    auditLogs: auditRes.data || []
  }
}

export async function reportQualityEvent(formData: {
  title: string
  description: string
  reported_by: string
  reporter_name: string
  department_id?: string
  room_id?: string
  process_id?: string
  product_id?: string
  production_lot_id?: string
  material_type: 'RM' | 'PM' | 'BULK' | 'FG' | 'ENV' | 'EQUIP' | 'NONE'
  material_lot_no?: string
  supplier_name?: string
  equipment_code?: string
  destination_market: QmsDestinationMarket
  expected_condition?: string
  actual_condition?: string
  immediate_action_taken?: string
  quantity_affected?: number
  quantity_unit?: string
  attachment_urls?: { name: string; url: string }[]
}) {
  const supabase = createAdminClient()
  const currentYear = new Date().getFullYear().toString()

  // 1. Controlled sequence allocation
  const { data: seqData, error: seqError } = await supabase.rpc('qms_get_next_number', {
    p_prefix: 'QE',
    p_year: currentYear
  })

  if (seqError || !seqData) {
    console.error('Sequence allocation error:', seqError)
    return { success: false, error: 'Failed to allocate controlled Quality Event number' }
  }

  const eventNo = seqData as string

  // 2. AI Pre-Triage recommendation
  const aiResult = analyzeEventWithAi(formData.title, formData.description, formData.material_type)

  // 3. Assemble Snapshot Context v1.0
  let productSnapshot = null
  if (formData.product_id) {
    const { data: p } = await supabase.from('products').select('*').eq('id', formData.product_id).single()
    if (p) {
      productSnapshot = {
        product_id: p.id,
        sku: p.sku,
        product_name: p.product_name,
        product_size: p.product_size,
        standard_batch_size: p.standard_batch_size,
        default_unit: p.default_unit
      }
    }
  }

  let lotSnapshot = null
  if (formData.production_lot_id) {
    const { data: l } = await supabase.from('production_lots').select('*').eq('id', formData.production_lot_id).single()
    if (l) {
      lotSnapshot = {
        lot_id: l.id,
        lot_no: l.lot_no,
        po_no: l.po_no,
        order_no: l.order_no,
        batch_size_kg: l.batch_size_kg,
        planned_quantity: l.planned_quantity
      }
    }
  }

  let orgSnapshot: any = {}
  if (formData.department_id) {
    const { data: d } = await supabase.from('departments').select('*').eq('id', formData.department_id).single()
    if (d) {
      orgSnapshot.department_code = d.department_code
      orgSnapshot.department_name = d.department_name
    }
  }
  if (formData.room_id) {
    const { data: r } = await supabase.from('rooms').select('*').eq('id', formData.room_id).single()
    if (r) {
      orgSnapshot.room_code = r.room_code
      orgSnapshot.room_name = r.room_name
      orgSnapshot.machine_code = r.machine_code
      orgSnapshot.room_type = r.room_type
    }
  }

  const snapshotContext: QmsSnapshotContextV1 = {
    schema_version: '1.0',
    captured_at: new Date().toISOString(),
    reporter: {
      user_id: formData.reported_by,
      full_name: formData.reporter_name
    },
    organization: orgSnapshot,
    manufacturing_context: {
      is_batch_related: Boolean(formData.production_lot_id || formData.product_id),
      product: productSnapshot,
      production_lot: lotSnapshot,
      material: {
        material_type: formData.material_type,
        material_lot_no: formData.material_lot_no,
        supplier_name: formData.supplier_name
      }
    }
  }

  // 4. Insert into qms_quality_events
  const newRecord = {
    event_no: eventNo,
    event_date: new Date().toISOString(),
    reported_by: formData.reported_by,
    reporter_name: formData.reporter_name,
    department_id: formData.department_id || null,
    room_id: formData.room_id || null,
    process_id: formData.process_id || null,
    product_id: formData.product_id || null,
    production_lot_id: formData.production_lot_id || null,
    material_type: formData.material_type,
    material_lot_no: formData.material_lot_no || null,
    supplier_name: formData.supplier_name || null,
    equipment_code: formData.equipment_code || null,
    destination_market: formData.destination_market || 'DOMESTIC_TH',
    snapshot_context: snapshotContext,
    title: formData.title,
    description: formData.description,
    expected_condition: formData.expected_condition || null,
    actual_condition: formData.actual_condition || null,
    immediate_action_taken: formData.immediate_action_taken || null,
    quantity_affected: formData.quantity_affected || null,
    quantity_unit: formData.quantity_unit || 'ชิ้น',
    ai_suggested_type: aiResult.suggestedType,
    ai_suggested_severity: aiResult.suggestedSeverity,
    ai_suggested_risk: aiResult.suggestedRisk,
    ai_confidence_score: aiResult.confidence,
    ai_rationale: aiResult.rationale,
    qa_confirmed_type: aiResult.suggestedType,
    qa_confirmed_severity: aiResult.suggestedSeverity,
    risk_level: aiResult.suggestedRisk,
    workflow_path: aiResult.suggestedSeverity === 'CRITICAL' ? 'FULL_CAPA' : aiResult.suggestedSeverity === 'MAJOR' ? 'STANDARD' : 'FAST_TRACK',
    current_status: 'SUBMITTED',
    attachment_urls: formData.attachment_urls || []
  }

  const { data: inserted, error: insertError } = await supabase
    .from('qms_quality_events')
    .insert(newRecord)
    .select()
    .single()

  if (insertError) {
    console.error('Failed to create quality event:', insertError)
    return { success: false, error: insertError.message }
  }

  // 5. Electronic signature log for submission
  await supabase.from('qms_electronic_signatures').insert({
    entity_type: 'QUALITY_EVENT',
    entity_id: inserted.id,
    signer_user_id: formData.reported_by,
    signer_name: formData.reporter_name,
    signer_role: 'Reporter',
    signature_meaning: 'AUTHOR_SUBMISSION',
    reason_comment: 'รายงานเหตุการณ์คุณภาพเข้าระบบ'
  })

  // 6. Audit Trail record
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_quality_events',
    record_id: inserted.id,
    action_type: 'SUBMIT',
    record_version: 1,
    after_value: inserted,
    changed_by: formData.reported_by,
    changed_by_name: formData.reporter_name,
    change_reason: 'เปิดรายงานเหตุการณ์คุณภาพใหม่'
  })

  // 7. In-App Notification Trigger (if Major/Critical)
  if (aiResult.suggestedSeverity === 'CRITICAL' || aiResult.suggestedSeverity === 'MAJOR') {
    const { data: qaUsers } = await supabase.from('users').select('id, full_name').limit(10)
    if (qaUsers) {
      const notifs = qaUsers.map(u => ({
        recipient_user_id: u.id,
        recipient_role: 'QA',
        event_severity: aiResult.suggestedSeverity,
        title: `🚨 [${aiResult.suggestedSeverity}] เหตุการณ์คุณภาพใหม่: ${eventNo}`,
        message: `${formData.title} (${formData.material_type}) จำเป็นต้องได้รับการประเมิน QA Triage ทันที`,
        entity_type: 'QUALITY_EVENT',
        entity_id: inserted.id,
        link_url: `/issues?id=${inserted.id}`,
        requires_acknowledgement: aiResult.suggestedSeverity === 'CRITICAL'
      }))
      await supabase.from('qms_inapp_notifications').insert(notifs)
    }
  }

  revalidatePath('/issues')
  return { success: true, data: inserted }
}

export async function triageQualityEvent(params: {
  eventId: string
  qa_confirmed_type: QmsEventType
  qa_confirmed_severity: QmsSeverity
  risk_level: QmsRiskLevel
  workflow_path: QmsWorkflowPath
  containment_required: boolean
  containment_types?: string[]
  initial_impact_assessment?: import('@/types/qms').QmsInitialImpactAssessment
  qa_classification_notes?: string
  qa_user_id: string
  qa_user_name: string
  qa_user_role: string
}) {
  const supabase = createAdminClient()

  const { data: prevEvent, error: fetchErr } = await supabase
    .from('qms_quality_events')
    .select('*')
    .eq('id', params.eventId)
    .single()

  if (fetchErr || !prevEvent) {
    return { success: false, error: 'Event not found' }
  }

  const notes = params.qa_classification_notes?.trim() || ''

  // Guardrail 1: Segregation of Duties check on Critical
  if (params.qa_confirmed_severity === 'CRITICAL' && prevEvent.reported_by === params.qa_user_id) {
    if (notes.length < 15) {
      return { success: false, error: 'การประเมินเคส CRITICAL โดยผู้รายงานคนเดียวกัน จำเป็นต้องระบุเหตุผลประกอบ (SoD Override Justification) อย่างน้อย 15 ตัวอักษร' }
    }
  }

  // Guardrail 2: Consumer Safety = YES blocks MINOR + FAST-TRACK without explicit justification
  if (params.initial_impact_assessment?.consumer_safety === 'YES' && params.workflow_path === 'FAST_TRACK') {
    if (notes.length < 15) {
      return { success: false, error: 'เนื่องจากผลกระทบด้านความปลอดภัยผู้บริโภค (Consumer Safety) = ใช่ ไม่อนุญาตให้เลือก Fast-Track เว้นแต่ QA Manager จะระบุเหตุผลยืนยันอย่างน้อย 15 ตัวอักษร' }
    }
  }

  // Guardrail 3: Regulatory / Labeling = YES requires justification if Fast-Track is selected
  if (params.initial_impact_assessment?.regulatory_labeling === 'YES' && params.workflow_path === 'FAST_TRACK') {
    if (notes.length < 15) {
      return { success: false, error: 'เหตุการณ์กระทบต่อข้อกำหนดกฎหมาย/ฉลาก (Regulatory = ใช่) ควรเข้าสู่กระบวนการสอบสวน หากต้องการแก้ไขทันที (Fast-Track) ต้องระบุเหตุผลอย่างน้อย 15 ตัวอักษร' }
    }
  }

  // Guardrail 4: Severity or Risk Downgrade requires justification
  const isSeverityDowngraded = (prevEvent.ai_suggested_severity === 'CRITICAL' && params.qa_confirmed_severity !== 'CRITICAL') ||
                               (prevEvent.ai_suggested_severity === 'MAJOR' && params.qa_confirmed_severity === 'MINOR')
  if (isSeverityDowngraded && notes.length < 15) {
    return { success: false, error: `มีการปรับลดระดับความรุนแรงจากข้อเสนอแนะ (${prevEvent.ai_suggested_severity} ➔ ${params.qa_confirmed_severity}) กรุณาระบุเหตุผลการปรับลดอย่างน้อย 15 ตัวอักษร` }
  }

  // Guardrail 5: Containment types selection
  if (params.containment_required && (!params.containment_types || params.containment_types.length === 0)) {
    return { success: false, error: 'กรณีต้องการกักกันทันที กรุณาเลือกมาตรการควบคุม/กักกันอย่างน้อย 1 รายการ' }
  }

  // Determine next state
  let nextStatus: QmsEventStatus = 'UNDER_QA_REVIEW'
  let containmentStatus = prevEvent.containment_status

  if (params.containment_required) {
    nextStatus = 'CONTAINMENT_ACTIVE'
    containmentStatus = 'PENDING'
  } else if (params.workflow_path === 'FAST_TRACK') {
    nextStatus = 'DIRECT_CORRECTION'
    containmentStatus = 'NOT_REQUIRED'
  } else {
    nextStatus = 'INVESTIGATION_PENDING'
    containmentStatus = 'NOT_REQUIRED'
  }

  const updates = {
    qa_confirmed_type: params.qa_confirmed_type,
    qa_confirmed_severity: params.qa_confirmed_severity,
    risk_level: params.risk_level,
    workflow_path: params.workflow_path,
    containment_required: params.containment_required,
    containment_types: params.containment_types || [],
    containment_status: containmentStatus,
    initial_impact_assessment: params.initial_impact_assessment || prevEvent.initial_impact_assessment,
    current_status: nextStatus,
    qa_classification_notes: notes || null,
    qa_classified_by: params.qa_user_id,
    qa_classified_at: new Date().toISOString(),
    record_version: (prevEvent.record_version || 1) + 1,
    updated_at: new Date().toISOString()
  }

  const { data: updated, error: updateErr } = await supabase
    .from('qms_quality_events')
    .update(updates)
    .eq('id', params.eventId)
    .select()
    .single()

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // If containment required, auto-create initial containment actions
  if (params.containment_required && params.containment_types && params.containment_types.length > 0) {
    for (const cType of params.containment_types) {
      await supabase.from('qms_event_containment_actions').insert({
        quality_event_id: params.eventId,
        action_type: cType === 'Hold Production Batch' ? 'HOLD_LOT' :
                     cType === 'Hold Bulk' ? 'HOLD_LOT' :
                     cType === 'Hold RM' ? 'HOLD_MATERIAL' :
                     cType === 'Hold PM' ? 'HOLD_MATERIAL' :
                     cType === 'Stop Mixing' ? 'STOP_LINE' :
                     cType === 'Stop Filling/Packing' ? 'STOP_LINE' :
                     cType === 'Segregate Material/Product' ? 'QUARANTINE_AREA' : 'INCREASE_INSPECTION',
        item_reference: `${cType}: ${prevEvent.material_lot_no || prevEvent.title}`,
        action_description: `มาตรการควบคุมเร่งด่วน: ${cType} ตามคำสั่ง QA Triage`,
        assigned_to: params.qa_user_id,
        assigned_to_name: params.qa_user_name,
        due_date: new Date(Date.now() + 86400000).toISOString(),
        status: 'PENDING'
      })
    }
  }

  // Electronic Signature
  await supabase.from('qms_electronic_signatures').insert({
    entity_type: 'QUALITY_EVENT',
    entity_id: params.eventId,
    signer_user_id: params.qa_user_id,
    signer_name: params.qa_user_name,
    signer_role: params.qa_user_role,
    signature_meaning: 'QA_TRIAGE',
    record_version: updates.record_version,
    reason_comment: `ยืนยันการจัดระดับ: ${params.qa_confirmed_severity} | เส้นทาง: ${params.workflow_path}`
  })

  // Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_quality_events',
    record_id: params.eventId,
    action_type: 'CLASSIFY',
    record_version: updates.record_version,
    before_value: prevEvent,
    after_value: updated,
    changed_by: params.qa_user_id,
    changed_by_name: params.qa_user_name,
    changed_by_role: params.qa_user_role,
    change_reason: params.qa_classification_notes || 'QA Triage Classification'
  })

  revalidatePath('/issues')
  return { success: true, data: updated }
}

export async function addContainmentAction(params: {
  quality_event_id: string
  action_type: QmsContainmentActionType
  item_reference: string
  action_description: string
  assigned_to: string
  assigned_to_name?: string
  due_date: string
  user_id: string
  user_name: string
}) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('qms_event_containment_actions')
    .insert({
      quality_event_id: params.quality_event_id,
      action_type: params.action_type,
      item_reference: params.item_reference,
      action_description: params.action_description,
      assigned_to: params.assigned_to,
      assigned_to_name: params.assigned_to_name || 'Assigned Officer',
      due_date: params.due_date,
      status: 'PENDING'
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_event_containment_actions',
    record_id: data.id,
    action_type: 'CONTAINMENT_ADDED',
    after_value: data,
    changed_by: params.user_id,
    changed_by_name: params.user_name,
    change_reason: `เพิ่มคำสั่งกักกัน: ${params.action_type} สำหรับ ${params.item_reference}`
  })

  revalidatePath('/issues')
  return { success: true, data }
}

export async function executeContainmentAction(params: {
  actionId: string
  executionNotes: string
  evidenceUrl?: string
  userId: string
  userName: string
}) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('qms_event_containment_actions')
    .update({
      status: 'EXECUTED',
      executed_at: new Date().toISOString(),
      execution_notes: params.executionNotes,
      evidence_attachment_url: params.evidenceUrl || null
    })
    .eq('id', params.actionId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_event_containment_actions',
    record_id: params.actionId,
    action_type: 'CONTAINMENT_EXECUTED',
    after_value: data,
    changed_by: params.userId,
    changed_by_name: params.userName,
    change_reason: 'ดำเนินการกักกันทางกายภาพเรียบร้อย'
  })

  revalidatePath('/issues')
  return { success: true, data }
}

export async function verifyContainmentAction(params: {
  actionId: string
  eventId: string
  userId: string
  userName: string
  userRole: string
}) {
  const supabase = createAdminClient()

  const { data: updatedAction, error: actErr } = await supabase
    .from('qms_event_containment_actions')
    .update({
      status: 'VERIFIED',
      qa_verified_by: params.userId,
      qa_verified_by_name: params.userName,
      qa_verified_at: new Date().toISOString()
    })
    .eq('id', params.actionId)
    .select()
    .single()

  if (actErr) {
    return { success: false, error: actErr.message }
  }

  // Check if ALL containment actions are now verified
  const { data: allActions } = await supabase
    .from('qms_event_containment_actions')
    .select('id, status')
    .eq('quality_event_id', params.eventId)

  const unverified = (allActions || []).filter(a => a.status !== 'VERIFIED')

  if (unverified.length === 0) {
    // All containment actions verified! Update parent Quality Event
    const { data: eventData } = await supabase
      .from('qms_quality_events')
      .select('current_status, workflow_path')
      .eq('id', params.eventId)
      .single()

    let nextStatus = eventData?.current_status
    if (eventData?.workflow_path === 'FAST_TRACK') {
      nextStatus = 'DIRECT_CORRECTION'
    } else {
      nextStatus = 'INVESTIGATION_PENDING'
    }

    await supabase
      .from('qms_quality_events')
      .update({
        containment_status: 'VERIFIED',
        current_status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.eventId)
  }

  // Electronic Signature
  await supabase.from('qms_electronic_signatures').insert({
    entity_type: 'CONTAINMENT_ACTION',
    entity_id: params.actionId,
    signer_user_id: params.userId,
    signer_name: params.userName,
    signer_role: params.userRole,
    signature_meaning: 'CONTAINMENT_VERIFY',
    reason_comment: 'QA ตรวจสอบการกักกันสินค้าและพื้นที่เรียบร้อยถูกต้อง'
  })

  // Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_event_containment_actions',
    record_id: params.actionId,
    action_type: 'CONTAINMENT_VERIFIED',
    after_value: updatedAction,
    changed_by: params.userId,
    changed_by_name: params.userName,
    changed_by_role: params.userRole,
    change_reason: 'QA ลงนามรับรองการกักกันทางกายภาพ'
  })

  revalidatePath('/issues')
  return { success: true, data: updatedAction }
}

export async function fastCloseQualityEvent(params: {
  eventId: string
  correctionNotes: string
  evidenceUrl?: string
  closureNotes: string
  userId: string
  userName: string
  userRole: string
}) {
  const supabase = createAdminClient()

  const { data: prevEvent, error: fetchErr } = await supabase
    .from('qms_quality_events')
    .select('*')
    .eq('id', params.eventId)
    .single()

  if (fetchErr || !prevEvent) {
    return { success: false, error: 'Event not found' }
  }

  const updates = {
    correction_notes: params.correctionNotes,
    correction_evidence_url: params.evidenceUrl || null,
    qa_closure_notes: params.closureNotes,
    qa_closed_by: params.userId,
    qa_closed_at: new Date().toISOString(),
    current_status: 'CLOSED',
    record_version: (prevEvent.record_version || 1) + 1,
    updated_at: new Date().toISOString()
  }

  const { data: updated, error: updateErr } = await supabase
    .from('qms_quality_events')
    .update(updates)
    .eq('id', params.eventId)
    .select()
    .single()

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Electronic Signature
  await supabase.from('qms_electronic_signatures').insert({
    entity_type: 'QUALITY_EVENT',
    entity_id: params.eventId,
    signer_user_id: params.userId,
    signer_name: params.userName,
    signer_role: params.userRole,
    signature_meaning: 'FAST_CLOSE',
    record_version: updates.record_version,
    reason_comment: params.closureNotes
  })

  // Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_quality_events',
    record_id: params.eventId,
    action_type: 'CLOSE',
    record_version: updates.record_version,
    before_value: prevEvent,
    after_value: updated,
    changed_by: params.userId,
    changed_by_name: params.userName,
    changed_by_role: params.userRole,
    change_reason: `Fast-Track Direct Closure: ${params.closureNotes}`
  })

  revalidatePath('/issues')
  return { success: true, data: updated }
}

export async function reopenQualityEvent(params: {
  eventId: string
  reason: string
  userId: string
  userName: string
  userRole: string
}) {
  const supabase = createAdminClient()

  if (!params.reason || params.reason.trim().length < 15) {
    return { success: false, error: 'การขอเปิดเคสใหม่ (Reopen) จำเป็นต้องระบุเหตุผลอย่างน้อย 15 ตัวอักษร' }
  }

  const { data: prevEvent, error: fetchErr } = await supabase
    .from('qms_quality_events')
    .select('*')
    .eq('id', params.eventId)
    .single()

  if (fetchErr || !prevEvent) {
    return { success: false, error: 'Event not found' }
  }

  const updates = {
    current_status: 'UNDER_QA_REVIEW',
    reopen_reason: params.reason,
    reopened_by: params.userId,
    reopened_at: new Date().toISOString(),
    record_version: (prevEvent.record_version || 1) + 1,
    updated_at: new Date().toISOString()
  }

  const { data: updated, error: updateErr } = await supabase
    .from('qms_quality_events')
    .update(updates)
    .eq('id', params.eventId)
    .select()
    .single()

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Electronic Signature
  await supabase.from('qms_electronic_signatures').insert({
    entity_type: 'QUALITY_EVENT',
    entity_id: params.eventId,
    signer_user_id: params.userId,
    signer_name: params.userName,
    signer_role: params.userRole,
    signature_meaning: 'REOPEN_AUTHORIZATION',
    record_version: updates.record_version,
    reason_comment: params.reason
  })

  // Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_quality_events',
    record_id: params.eventId,
    action_type: 'REOPEN',
    record_version: updates.record_version,
    before_value: prevEvent,
    after_value: updated,
    changed_by: params.userId,
    changed_by_name: params.userName,
    changed_by_role: params.userRole,
    change_reason: `Controlled Reopening: ${params.reason}`
  })

  revalidatePath('/issues')
  return { success: true, data: updated }
}

export async function getInAppNotifications(userId?: string) {
  const supabase = createAdminClient()
  let query = supabase
    .from('qms_inapp_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  if (userId) {
    query = query.or(`recipient_user_id.eq.${userId},recipient_role.eq.QA`)
  }

  const { data, error } = await query
  if (error) {
    return { success: false, data: [] }
  }
  return { success: true, data }
}

export async function acknowledgeNotification(params: {
  notificationId: string
  userId: string
  userName: string
}) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('qms_inapp_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: params.userId,
      acknowledged_by_name: params.userName
    })
    .eq('id', params.notificationId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
