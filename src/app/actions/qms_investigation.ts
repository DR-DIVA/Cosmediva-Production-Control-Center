"use server";

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import { 
  QmsInvestigation, 
  QmsInvestigationEvidence, 
  QmsInvestigationTimelineEvent,
  QmsEvidenceType,
  QmsTimelineMilestoneType,
  QmsInvestigationQuestionFramework,
  QmsRcaTool,
  QmsFiveWhyItem,
  QmsFishbone6M,
  QmsRootCauseCategory,
  QmsSystemicCauseAssessment,
  QmsQualityEvent
} from '@/types/qms';

/**
 * Fetch investigation for a specific Quality Event with evidence and timeline
 */
export async function getInvestigationByEventId(qualityEventId: string): Promise<{
  success: boolean;
  data?: QmsInvestigation | null;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data: inv, error: invErr } = await supabase
    .from('qms_investigations')
    .select('*')
    .eq('quality_event_id', qualityEventId)
    .single();

  if (invErr && invErr.code !== 'PGRST116') { // PGRST116 is no rows
    console.error('Error fetching investigation by event id:', invErr);
    return { success: false, error: invErr.message };
  }

  if (!inv) {
    return { success: true, data: null };
  }

  // Fetch associated evidence and timeline
  const [evidenceRes, timelineRes, eventRes] = await Promise.all([
    supabase.from('qms_investigation_evidence').select('*').eq('investigation_id', inv.id).order('created_at', { ascending: false }),
    supabase.from('qms_investigation_timeline_events').select('*').eq('investigation_id', inv.id).order('event_timestamp', { ascending: true }),
    supabase.from('qms_quality_events').select('*').eq('id', qualityEventId).single()
  ]);

  const fullInvestigation: QmsInvestigation = {
    ...inv,
    evidence_list: evidenceRes.data || [],
    timeline_events: timelineRes.data || [],
    quality_event: eventRes.data || undefined
  };

  return { success: true, data: fullInvestigation };
}

/**
 * Start or retrieve existing Investigation for a Quality Event
 */
export async function startOrGetInvestigation(params: {
  qualityEventId: string;
  userId: string;
  userName: string;
  userRole?: string;
  departmentId?: string;
  targetDueDate?: string;
}): Promise<{
  success: boolean;
  data?: QmsInvestigation | null;
  error?: string;
}> {
  const supabase = createAdminClient();

  // 1. Check existing
  const existing = await getInvestigationByEventId(params.qualityEventId);
  if (existing.success && existing.data) {
    // If existing has no timeline events, auto-generate them!
    if (!existing.data.timeline_events || existing.data.timeline_events.length === 0) {
      const { data: parentEvent } = await supabase
        .from('qms_quality_events')
        .select('*')
        .eq('id', params.qualityEventId)
        .single();

      if (parentEvent) {
        await seedInitialTimelineMilestones(
          supabase,
          existing.data.id,
          parentEvent,
          existing.data.investigation_no,
          params.userId,
          params.userName
        );
        return getInvestigationByEventId(params.qualityEventId);
      }
    }
    return { success: true, data: existing.data };
  }

  // 2. Fetch parent Quality Event
  const { data: parentEvent, error: fetchErr } = await supabase
    .from('qms_quality_events')
    .select('*')
    .eq('id', params.qualityEventId)
    .single();

  if (fetchErr || !parentEvent) {
    return { success: false, error: 'Quality Event not found' };
  }

  // 3. Allocate sequence number: INV-YYYY-XXXX
  const currentYear = new Date().getFullYear().toString();
  const { data: seqData, error: seqError } = await supabase.rpc('qms_get_next_number', {
    p_prefix: 'INV',
    p_year: currentYear
  });

  if (seqError || !seqData) {
    console.error('Sequence allocation error for INV:', seqError);
    return { success: false, error: 'Failed to allocate controlled Investigation number' };
  }

  const investigationNo = seqData as string;
  const dueDate = params.targetDueDate || new Date(Date.now() + (parentEvent.qa_confirmed_severity === 'CRITICAL' ? 3 : 7) * 86400000).toISOString();

  // Pre-populate question framework intelligently from event details and snapshot context
  const whereOccurredStr = [
    parentEvent.snapshot_context?.organization?.department_name,
    parentEvent.snapshot_context?.organization?.room_name,
    parentEvent.equipment_code ? `เครื่องจักร/ถัง: ${parentEvent.equipment_code}` : ''
  ].filter(Boolean).join(' > ') || 'สายการผลิตในโรงงาน';

  const initialQuestions: QmsInvestigationQuestionFramework = {
    what_happened: parentEvent.title + (parentEvent.actual_condition ? ` (ตรวจวัดได้: ${parentEvent.actual_condition})` : ''),
    what_should_have_happened: parentEvent.expected_condition || 'ค่าต้องเป็นไปตามเกณฑ์มาตรฐานข้อกำหนดผลิตภัณฑ์ (In-Spec) และขั้นตอนการปฏิบัติงาน GMP',
    confirmed_gap: (parentEvent.expected_condition && parentEvent.actual_condition) 
      ? `เกณฑ์มาตรฐาน: ${parentEvent.expected_condition} vs ผลตรวจวัดจริง: ${parentEvent.actual_condition}` 
      : parentEvent.description,
    when_occurred: new Date(parentEvent.event_date).toLocaleString('th-TH'),
    where_occurred: whereOccurredStr,
    when_detected: new Date(parentEvent.event_date).toLocaleString('th-TH'),
    who_process_involved: [
      parentEvent.reporter_name ? `ผู้ตรวจพบ: ${parentEvent.reporter_name}` : '',
      parentEvent.snapshot_context?.organization?.department_name ? `แผนก: ${parentEvent.snapshot_context.organization.department_name}` : ''
    ].filter(Boolean).join(', ') || 'เจ้าหน้าที่ประจำสายการผลิตและ QC',
    quantity_batches_affected: [
      parentEvent.quantity_affected ? `${parentEvent.quantity_affected} ${parentEvent.quantity_unit || 'ชิ้น'}` : '',
      parentEvent.material_lot_no ? `ล็อต ${parentEvent.material_lot_no}` : ''
    ].filter(Boolean).join(' / ') || '1 แบทช์การผลิต',
    what_changed_before_event: parentEvent.snapshot_context?.manufacturing_context?.material?.material_lot_no 
      ? `ล็อตวัตถุดิบ/บรรจุภัณฑ์: ${parentEvent.snapshot_context.manufacturing_context.material.material_lot_no}` 
      : '',
    has_happened_before: false,
    recurrence_details: '',
    missing_information: ''
  };

  const newRecord = {
    investigation_no: investigationNo,
    quality_event_id: params.qualityEventId,
    assigned_lead_id: params.userId,
    assigned_lead_name: params.userName,
    department_id: params.departmentId || parentEvent.department_id || null,
    target_due_date: dueDate,
    current_status: 'IN_INVESTIGATION',
    started_at: new Date().toISOString(),
    question_framework: initialQuestions,
    rca_tool: '5_WHY',
    five_whys: [
      { why_number: 1, cause: '', explanation: '' }
    ],
    fishbone_6m: {
      man: [],
      machine: [],
      material: [],
      method: [],
      measurement: [],
      environment: []
    },
    is_root_cause_confirmed: true,
    systemic_cause_assessment: {
      is_evaluated: false,
      training_adequate: true,
      sop_clarity_adequate: true,
      workload_reasonable: true,
      equipment_interface_clear: true,
      ergonomics_suitable: true,
      process_design_robust: true,
      supervision_adequate: true,
      environment_suitable: true,
      system_controls_sufficient: true,
      systemic_findings: '',
      operator_error_justification: ''
    }
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('qms_investigations')
    .insert(newRecord)
    .select()
    .single();

  if (insertErr || !inserted) {
    console.error('Error creating investigation:', insertErr);
    return { success: false, error: insertErr?.message || 'Failed to initialize investigation' };
  }

  // 4. Automatically generate available timeline milestones from system records
  await seedInitialTimelineMilestones(
    supabase,
    inserted.id,
    parentEvent,
    investigationNo,
    params.userId,
    params.userName
  );

  // 5. Update Quality Event Status to INVESTIGATING
  await supabase
    .from('qms_quality_events')
    .update({ current_status: 'INVESTIGATING' })
    .eq('id', params.qualityEventId);

  // 6. Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_investigations',
    record_id: inserted.id,
    action_type: 'START_INVESTIGATION',
    record_version: 1,
    after_value: inserted,
    changed_by: params.userId,
    changed_by_name: params.userName,
    change_reason: `เปิดการสอบสวน ${investigationNo} สำหรับ ${parentEvent.event_no}`
  });

  revalidatePath('/issues');
  return getInvestigationByEventId(params.qualityEventId);
}

/**
 * Seed initial timeline milestones automatically from Quality Event context
 */
async function seedInitialTimelineMilestones(
  supabase: any,
  investigationId: string,
  parentEvent: any,
  investigationNo: string,
  userId: string,
  userName: string
) {
  const baseTime = new Date(parentEvent.event_date || parentEvent.created_at || Date.now()).getTime();
  const milestones: any[] = [];

  const isBulkOrMixing = parentEvent.material_type === 'BULK' || 
    parentEvent.title?.includes('ผสม') || parentEvent.title?.includes('ความหนืด') || 
    parentEvent.title?.includes('Viscosity') || parentEvent.title?.includes('pH');

  const isPMOrPackaging = parentEvent.material_type === 'PM' || 
    parentEvent.title?.includes('บรรจุ') || parentEvent.title?.includes('ขวด') || 
    parentEvent.title?.includes('ฝา') || parentEvent.title?.includes('ปั๊ม');

  if (isBulkOrMixing) {
    milestones.push({
      investigation_id: investigationId,
      event_timestamp: new Date(baseTime - 3 * 3600000).toISOString(),
      event_title: 'เริ่มกระบวนการผสมในถัง (Compounding Started)',
      event_description: `เริ่มปั่นกวนและให้ความร้อนสารตั้งต้นตาม Batch Record ของล็อต ${parentEvent.material_lot_no || 'ปัจจุบัน'}`,
      event_source: 'LINKED RECORD',
      milestone_type: 'MIXING_START',
      created_by: userId,
      created_by_name: userName
    });
    milestones.push({
      investigation_id: investigationId,
      event_timestamp: new Date(baseTime - 45 * 60000).toISOString(),
      event_title: 'QC สุ่มตรวจระหว่างกระบวนการ (In-Process QC Sampling)',
      event_description: 'QC สุ่มตัวอย่างเนื้อ Bulk ตรวจค่าความหนืดและ pH ตามข้อกำหนดมาตรฐาน',
      event_source: 'LINKED RECORD',
      milestone_type: 'QC_BULK',
      created_by: userId,
      created_by_name: userName
    });
  } else if (isPMOrPackaging) {
    milestones.push({
      investigation_id: investigationId,
      event_timestamp: new Date(baseTime - 24 * 3600000).toISOString(),
      event_title: 'ตรวจรับมอบบรรจุภัณฑ์เข้าคลัง (PM Receiving & Inspection)',
      event_description: `รับมอบชิ้นส่วนบรรจุภัณฑ์ล็อต ${parentEvent.material_lot_no || 'N/A'} จาก ${parentEvent.supplier_name || 'ซัพพลายเออร์'}`,
      event_source: 'LINKED RECORD',
      milestone_type: 'MATERIAL_RECEIVED',
      created_by: userId,
      created_by_name: userName
    });
    milestones.push({
      investigation_id: investigationId,
      event_timestamp: new Date(baseTime - 2 * 3600000).toISOString(),
      event_title: 'เบิกจ่ายเข้าห้องบรรจุ Cleanroom (Line Setup & Filling)',
      event_description: 'เริ่มติดตั้งไลน์และป้อนบรรจุภัณฑ์เข้าเครื่องจักรบรรจุ',
      event_source: 'LINKED RECORD',
      milestone_type: 'FILLING_START',
      created_by: userId,
      created_by_name: userName
    });
  }

  // Quality Event Detected
  milestones.push({
    investigation_id: investigationId,
    event_timestamp: new Date(baseTime).toISOString(),
    event_title: `ตรวจพบสิ่งผิดปกติหน้างาน: ${parentEvent.title}`,
    event_description: parentEvent.actual_condition ? `ตรวจพบ: ${parentEvent.actual_condition} (เกณฑ์: ${parentEvent.expected_condition || '-'})` : parentEvent.description,
    event_source: 'SYSTEM',
    milestone_type: 'PROBLEM_DETECTED',
    created_by: parentEvent.reported_by || userId,
    created_by_name: parentEvent.reporter_name || userName
  });

  // Quality Event Assessed
  const assessedTime = parentEvent.qa_classified_at || new Date(baseTime + 15 * 60000).toISOString();
  milestones.push({
    investigation_id: investigationId,
    event_timestamp: assessedTime,
    event_title: 'การประเมินเหตุการณ์คุณภาพ (Quality Event Assessment)',
    event_description: `ระดับความรุนแรง: ${parentEvent.qa_confirmed_severity || parentEvent.ai_suggested_severity} • ความเสี่ยง: ${parentEvent.risk_level || 'MEDIUM'} • เส้นทาง: ${parentEvent.workflow_path === 'FULL_CAPA' ? 'FULL INVESTIGATION' : parentEvent.workflow_path || 'STANDARD'}`,
    event_source: 'SYSTEM',
    milestone_type: 'QA_NOTIFIED',
    created_by: parentEvent.qa_classified_by || userId,
    created_by_name: userName
  });

  // Containment / QA Hold
  if (parentEvent.containment_required) {
    milestones.push({
      investigation_id: investigationId,
      event_timestamp: assessedTime,
      event_title: 'ออกคำสั่งกักกัน / ควบคุมเบื้องต้น (Immediate Containment)',
      event_description: `มาตรการ: ${(parentEvent.containment_types && parentEvent.containment_types.length > 0) ? parentEvent.containment_types.join(', ') : 'กักกันสต็อกและระงับการปล่อยผ่าน'}`,
      event_source: 'SYSTEM',
      milestone_type: 'BATCH_HELD',
      created_by: userId,
      created_by_name: userName
    });
  }

  // Investigation Start
  milestones.push({
    investigation_id: investigationId,
    event_timestamp: new Date().toISOString(),
    event_title: `เปิดห้องสืบสวนและวิเคราะห์สาเหตุ (${investigationNo})`,
    event_description: `มอบหมายหัวหน้าทีมสืบสวน: ${userName} • กำหนดส่งรายงานตามเกณฑ์ SLA`,
    event_source: 'SYSTEM',
    milestone_type: 'INVESTIGATION_START',
    created_by: userId,
    created_by_name: userName
  });

  if (milestones.length > 0) {
    await supabase.from('qms_investigation_timeline_events').insert(milestones);
  }
}

/**
 * Save Investigation Draft
 */
export async function saveInvestigationDraft(params: {
  investigationId: string;
  questionFramework?: Partial<QmsInvestigationQuestionFramework>;
  rcaTool?: QmsRcaTool;
  fiveWhys?: QmsFiveWhyItem[];
  fishbone6M?: QmsFishbone6M;
  simpleRootCauseStatement?: string;
  isRootCauseConfirmed?: boolean;
  rootCauseCategory?: QmsRootCauseCategory;
  rootCauseSummary?: string;
  unconfirmedJustification?: string;
  systemicCauseAssessment?: Partial<QmsSystemicCauseAssessment>;
  immediateCorrectionDescription?: string;
  immediateCorrectionCompleted?: boolean;
  targetDueDate?: string;
  qaConfirmedRelatedEventIds?: string[];
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data: current, error: fetchErr } = await supabase
    .from('qms_investigations')
    .select('*')
    .eq('id', params.investigationId)
    .single();

  if (fetchErr || !current) {
    return { success: false, error: 'Investigation record not found' };
  }

  const updates: any = {
    updated_at: new Date().toISOString()
  };

  if (params.questionFramework) {
    updates.question_framework = {
      ...current.question_framework,
      ...params.questionFramework
    };
  }

  // Handle QA confirmed recurrence linkage
  if (params.qaConfirmedRelatedEventIds !== undefined) {
    updates.qa_confirmed_related_event_ids = params.qaConfirmedRelatedEventIds;
    const hasRecurrence = params.qaConfirmedRelatedEventIds.length > 0;
    updates.question_framework = {
      ...(updates.question_framework || current.question_framework),
      has_happened_before: hasRecurrence,
      recurrence_details: hasRecurrence 
        ? `QA ยืนยันพบประวัติเหตุการณ์ซ้ำที่เกี่ยวข้องกันจำนวน ${params.qaConfirmedRelatedEventIds.length} รายการในระบบ`
        : 'QA ตรวจสอบแล้วไม่พบความเชื่อมโยงกับเหตุการณ์ซ้ำในอดีต'
    };
    if (hasRecurrence) {
      updates.capa_system_recommendation = 'YES';
      updates.capa_recommendation_rationale = 'ตรวจพบและยืนยันข้อบกพร่องเกิดซ้ำข้ามล็อตการผลิต (Recurring Pattern Detected) เข้าเกณฑ์ที่ควรพิจารณาเปิด CAPA (CAPA RECOMMENDED)';
    }
  }

  if (params.rcaTool) updates.rca_tool = params.rcaTool;
  if (params.fiveWhys) updates.five_whys = params.fiveWhys;
  if (params.fishbone6M) updates.fishbone_6m = params.fishbone6M;
  if (params.simpleRootCauseStatement !== undefined) updates.simple_root_cause_statement = params.simpleRootCauseStatement;
  if (params.isRootCauseConfirmed !== undefined) updates.is_root_cause_confirmed = params.isRootCauseConfirmed;
  if (params.rootCauseCategory) updates.root_cause_category = params.rootCauseCategory;
  if (params.rootCauseSummary !== undefined) updates.root_cause_summary = params.rootCauseSummary;
  if (params.unconfirmedJustification !== undefined) updates.unconfirmed_justification = params.unconfirmedJustification;
  if (params.targetDueDate) updates.target_due_date = params.targetDueDate;

  if (params.systemicCauseAssessment) {
    updates.systemic_cause_assessment = {
      ...current.systemic_cause_assessment,
      ...params.systemicCauseAssessment
    };
  }

  if (params.immediateCorrectionDescription !== undefined) {
    updates.immediate_correction_description = params.immediateCorrectionDescription;
  }
  if (params.immediateCorrectionCompleted !== undefined) {
    updates.immediate_correction_completed = params.immediateCorrectionCompleted;
  }

  // Increment version
  updates.record_version = (current.record_version || 1) + 1;

  const { error: updateErr } = await supabase
    .from('qms_investigations')
    .update(updates)
    .eq('id', params.investigationId);

  if (updateErr) {
    console.error('Draft save error:', updateErr);
    return { success: false, error: updateErr.message };
  }

  revalidatePath('/issues');
  return { success: true };
}

/**
 * Add Evidence Item
 */
export async function addInvestigationEvidence(params: {
  investigationId: string;
  evidenceType: QmsEvidenceType;
  title: string;
  description?: string;
  source?: string;
  fileUrl?: string;
  fileName?: string;
  relationshipToInvestigation?: string;
  uploadedBy: string;
  uploadedByName: string;
}): Promise<{
  success: boolean;
  data?: QmsInvestigationEvidence;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.title.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อหลักฐาน/เอกสาร' };
  }

  const { data, error } = await supabase
    .from('qms_investigation_evidence')
    .insert({
      investigation_id: params.investigationId,
      evidence_type: params.evidenceType,
      title: params.title,
      description: params.description || null,
      source: params.source || null,
      file_url: params.fileUrl || null,
      file_name: params.fileName || null,
      relationship_to_investigation: params.relationshipToInvestigation || null,
      uploaded_by: params.uploadedBy,
      uploaded_by_name: params.uploadedByName
    })
    .select()
    .single();

  if (error) {
    console.error('Evidence insert error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/issues');
  return { success: true, data: data as QmsInvestigationEvidence };
}

/**
 * Delete Evidence Item
 */
export async function deleteInvestigationEvidence(evidenceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('qms_investigation_evidence')
    .delete()
    .eq('id', evidenceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/issues');
  return { success: true };
}

/**
 * Add Investigation Timeline Event
 */
export async function addTimelineEvent(params: {
  investigationId: string;
  eventTimestamp: string;
  eventTitle: string;
  eventDescription?: string;
  eventSource?: 'SYSTEM' | 'MANUAL' | 'LOG' | 'QC';
  milestoneType?: QmsTimelineMilestoneType;
  createdBy: string;
  createdByName: string;
}): Promise<{
  success: boolean;
  data?: QmsInvestigationTimelineEvent;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.eventTitle.trim()) {
    return { success: false, error: 'กรุณาระบุหัวข้อไทม์ไลน์' };
  }

  const { data, error } = await supabase
    .from('qms_investigation_timeline_events')
    .insert({
      investigation_id: params.investigationId,
      event_timestamp: params.eventTimestamp || new Date().toISOString(),
      event_title: params.eventTitle,
      event_description: params.eventDescription || null,
      event_source: params.eventSource || 'MANUAL',
      milestone_type: params.milestoneType || 'OTHER',
      created_by: params.createdBy,
      created_by_name: params.createdByName
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/issues');
  return { success: true, data: data as QmsInvestigationTimelineEvent };
}

/**
 * Delete Timeline Event
 */
export async function deleteTimelineEvent(timelineEventId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('qms_investigation_timeline_events')
    .delete()
    .eq('id', timelineEventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/issues');
  return { success: true };
}

/**
 * Similar / Previous Event Search (Deterministic Multi-Dimensional Query)
 */
export async function searchSimilarEvents(params: {
  searchQuery?: string;
  productId?: string;
  productionLotId?: string;
  materialLotNo?: string;
  materialType?: string;
  supplierName?: string;
  equipmentCode?: string;
  departmentId?: string;
  eventType?: string;
  excludeEventId?: string;
}): Promise<{
  success: boolean;
  data: Array<QmsQualityEvent & {
    matching_dimensions: string[];
    relevance_score: 'HIGH' | 'MEDIUM' | 'LOW';
    match_count: number;
  }>;
  recurrenceCount: number;
}> {
  const supabase = createAdminClient();

  let query = supabase
    .from('qms_quality_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40);

  if (params.excludeEventId) {
    query = query.neq('id', params.excludeEventId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error searching similar events:', error);
    return { success: false, data: [], recurrenceCount: 0 };
  }

  const allEvents = (data || []) as QmsQualityEvent[];

  // Deterministic Multi-Dimensional Evaluation
  const evaluated = allEvents.map(e => {
    const dimensions: string[] = [];

    // 1. Same Product
    if (params.productId && e.product_id && e.product_id === params.productId) {
      dimensions.push('Same Product (ผลิตภัณฑ์เดียวกัน)');
    }
    // 2. Same Material Type
    if (params.materialType && params.materialType !== 'NONE' && e.material_type === params.materialType) {
      dimensions.push('Same Material Type (ประเภทวัตถุดิบ/บรรจุภัณฑ์)');
    }
    // 3. Same Lot
    if (params.materialLotNo && e.material_lot_no && e.material_lot_no === params.materialLotNo) {
      dimensions.push('Same Lot (ล็อตเดียวกัน)');
    }
    // 4. Same Supplier
    if (params.supplierName && e.supplier_name && e.supplier_name.toLowerCase().includes(params.supplierName.trim().toLowerCase())) {
      dimensions.push('Same Supplier (คู่ค้ารายเดียวกัน)');
    }
    // 5. Same Defect / Event Type
    const currentType = params.eventType || 'DEVIATION';
    if ((e.qa_confirmed_type || e.ai_suggested_type) === currentType) {
      dimensions.push('Same Defect Type (ประเภทข้อบกพร่องเดียวกัน)');
    }
    // 6. Same Equipment
    if (params.equipmentCode && e.equipment_code && e.equipment_code === params.equipmentCode) {
      dimensions.push('Same Equipment (เครื่องจักรเดียวกัน)');
    }
    // 7. Same Department
    if (params.departmentId && e.department_id && e.department_id === params.departmentId) {
      dimensions.push('Same Department (แผนกเดียวกัน)');
    }
    // 8. Keyword / Symptom match
    if (params.searchQuery && params.searchQuery.trim().length > 1) {
      const q = params.searchQuery.toLowerCase();
      if (e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)) {
        dimensions.push('Similar Symptom (อาการผิดปกติคล้ายกัน)');
      }
    }

    const matchCount = dimensions.length;
    let relevance: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (matchCount >= 3 || (dimensions.includes('Same Product (ผลิตภัณฑ์เดียวกัน)') && dimensions.includes('Same Defect Type (ประเภทข้อบกพร่องเดียวกัน)'))) {
      relevance = 'HIGH';
    } else if (matchCount >= 2) {
      relevance = 'MEDIUM';
    }

    return {
      ...e,
      matching_dimensions: dimensions,
      relevance_score: relevance,
      match_count: matchCount
    };
  })
  .filter(item => item.match_count > 0)
  .sort((a, b) => {
    const scoreVal = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    if (scoreVal[b.relevance_score] !== scoreVal[a.relevance_score]) {
      return scoreVal[b.relevance_score] - scoreVal[a.relevance_score];
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    success: true,
    data: evaluated,
    recurrenceCount: evaluated.length
  };
}

/**
 * Submit Investigation for QA Review
 * Includes Guardrails:
 * - Systemic Cause Assessment Guardrail if MAN / Human Error is selected
 * - Justification Guardrail if ROOT_CAUSE_NOT_CONFIRMED is selected
 */
export async function submitInvestigationForReview(params: {
  investigationId: string;
  userId: string;
  userName: string;
  userRole?: string;
  investigationSummary: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data: inv, error: fetchErr } = await supabase
    .from('qms_investigations')
    .select('*, quality_event:qms_quality_events(*)')
    .eq('id', params.investigationId)
    .single();

  if (fetchErr || !inv) {
    return { success: false, error: 'Investigation not found' };
  }

  const summary = params.investigationSummary?.trim() || inv.investigation_summary?.trim() || '';
  if (!summary || summary.length < 15) {
    return { success: false, error: 'กรุณาระบุบทสรุปผลการสอบสวน (Investigation Summary) อย่างน้อย 15 ตัวอักษร' };
  }

  // GUARDRAIL 1: Root Cause Category must be specified
  if (!inv.root_cause_category) {
    return { success: false, error: 'กรุณาเลือกหมวดหมู่สาเหตุรากเหง้า (Root Cause Category)' };
  }

  // GUARDRAIL 2 (Section 7): If MAN / Human Error is selected, require Systemic Cause Assessment!
  if (inv.root_cause_category === 'MAN') {
    const sca = inv.systemic_cause_assessment;
    if (!sca?.is_evaluated) {
      return { 
        success: false, 
        error: 'กรณีระบุสาเหตุเป็นความผิดพลาดของพนักงาน (MAN): ระบบกำหนดให้ต้องทำ "การประเมินความผิดพลาดเชิงระบบ (Systemic Cause Assessment)" ให้ครบถ้วนก่อน เพื่อป้องกันการโทษพนักงานโดยปราศจากหลักฐานรองรับ' 
      };
    }
    if (!sca?.systemic_findings || sca.systemic_findings.trim().length < 15) {
      return {
        success: false,
        error: 'กรุณาระบุข้อค้นพบการประเมินเชิงระบบ (Systemic Findings) หรือเหตุผลประกอบ (Operator Error Justification) อย่างน้อย 15 ตัวอักษร'
      };
    }
  }

  // GUARDRAIL 3 (Section 8): If ROOT_CAUSE_NOT_CONFIRMED, require explanation
  if (inv.root_cause_category === 'ROOT_CAUSE_NOT_CONFIRMED' || inv.is_root_cause_confirmed === false) {
    if (!inv.unconfirmed_justification || inv.unconfirmed_justification.trim().length < 15) {
      return {
        success: false,
        error: 'กรณีไม่สามารถยืนยันสาเหตุรากเหง้าได้ (Root Cause Not Confirmed): กรุณาระบุเหตุผลชี้แจงและหลักฐานที่ขาดหายไปอย่างน้อย 15 ตัวอักษร'
      };
    }
  }

  // Determine CAPA System Recommendation
  const qe: QmsQualityEvent = inv.quality_event;
  let recommendCapa: 'YES' | 'NO' = 'NO';
  let rationale = 'ประเมินเป็นเหตุการณ์ทั่วไป ผลกระทบต่ำ สามารถควบคุมได้ด้วยการแก้ไขหน้างาน (Correction)';

  if (qe.qa_confirmed_severity === 'CRITICAL' || qe.risk_level === 'CRITICAL') {
    recommendCapa = 'YES';
    rationale = 'ระดับความรุนแรง Critical หรือความเสี่ยงวิกฤต กระทบคุณภาพหรือความปลอดภัย';
  } else if (qe.initial_impact_assessment?.consumer_safety === 'YES') {
    recommendCapa = 'YES';
    rationale = 'มีผลกระทบต่อความปลอดภัยของผู้บริโภค (Consumer Safety = ใช่)';
  } else if (qe.initial_impact_assessment?.regulatory_labeling === 'YES') {
    recommendCapa = 'YES';
    rationale = 'มีผลกระทบต่อข้อกำหนดกฎหมาย ฉลาก หรือ อย. (Regulatory = ใช่)';
  } else if (inv.question_framework?.has_happened_before) {
    recommendCapa = 'YES';
    rationale = 'เป็นข้อบกพร่องที่เกิดซ้ำ (Recurring Defect) บ่งชี้ว่ามาตรการเดิมยังไม่สามารถกำจัดสาเหตุรากเหง้าได้';
  } else if (inv.root_cause_category === 'PROCESS_DESIGN' || inv.root_cause_category === 'SYSTEM_MANAGEMENT') {
    recommendCapa = 'YES';
    rationale = 'สาเหตุรากเหง้าเกิดจากการออกแบบกระบวนการหรือการควบคุมเชิงระบบ เข้าเกณฑ์ที่ควรพิจารณาเปิด CAPA เพื่อปรับปรุงเชิงโครงสร้าง';
  }

  // Update status to QA_REVIEW
  const { error: updateErr } = await supabase
    .from('qms_investigations')
    .update({
      investigation_summary: summary,
      current_status: 'QA_REVIEW',
      capa_system_recommendation: recommendCapa,
      capa_recommendation_rationale: rationale,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.investigationId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // E-Sign and Audit Trail
  await supabase.from('qms_electronic_signatures').insert({
    entity_type: 'INVESTIGATION',
    entity_id: params.investigationId,
    signer_user_id: params.userId,
    signer_name: params.userName,
    signer_role: params.userRole || 'Investigator',
    signature_meaning: 'RCA_APPROVAL',
    reason_comment: 'ส่งรายงานผลการสืบสวนและวิเคราะห์สาเหตุรากเหง้าเพื่อขออนุมัติจาก QA'
  });

  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_investigations',
    record_id: params.investigationId,
    action_type: 'SUBMIT_FOR_REVIEW',
    record_version: (inv.record_version || 1) + 1,
    changed_by: params.userId,
    changed_by_name: params.userName,
    change_reason: 'ส่งผลการสืบสวนเข้าสู่สถานะ QA Review'
  });

  revalidatePath('/issues');
  return { success: true };
}

/**
 * Return Investigation for more work
 */
export async function returnInvestigationForMoreWork(params: {
  investigationId: string;
  returnReason: string;
  qaUserId: string;
  qaUserName: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.returnReason || params.returnReason.trim().length < 10) {
    return { success: false, error: 'กรุณาระบุเหตุผลการส่งกลับเพื่อสืบสวนเพิ่มเติมอย่างน้อย 10 ตัวอักษร' };
  }

  const { data: inv } = await supabase
    .from('qms_investigations')
    .select('record_version')
    .eq('id', params.investigationId)
    .single();

  const { error } = await supabase
    .from('qms_investigations')
    .update({
      current_status: 'IN_INVESTIGATION',
      return_reason: params.returnReason,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.investigationId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_investigations',
    record_id: params.investigationId,
    action_type: 'RETURN_FOR_MORE_INVESTIGATION',
    record_version: ((inv?.record_version || 1) + 1),
    changed_by: params.qaUserId,
    changed_by_name: params.qaUserName,
    change_reason: `ส่งกลับเพื่อสืบสวนเพิ่มเติม: ${params.returnReason}`
  });

  revalidatePath('/issues');
  return { success: true };
}

/**
 * Approve Investigation & Decide CAPA Gate
 */
export async function approveInvestigationAndDecideCapa(params: {
  investigationId: string;
  qaReviewNotes: string;
  capaRequired: boolean;
  capaDecisionJustification?: string;
  qaUserId: string;
  qaUserName: string;
  qaRole: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data: inv, error: fetchErr } = await supabase
    .from('qms_investigations')
    .select('*, quality_event:qms_quality_events(*)')
    .eq('id', params.investigationId)
    .single();

  if (fetchErr || !inv) {
    return { success: false, error: 'Investigation not found' };
  }

  // Guardrail: If system recommended CAPA = YES but QA selects CAPA = NO, require justification
  if (inv.capa_system_recommendation === 'YES' && params.capaRequired === false) {
    if (!params.capaDecisionJustification || params.capaDecisionJustification.trim().length < 15) {
      return {
        success: false,
        error: 'ระบบแนะนำให้เปิด CAPA: กรณีที่ QA ตัดสินใจ "ไม่เปิด CAPA" จำเป็นต้องระบุเหตุผลชี้แจง (Justification) อย่างน้อย 15 ตัวอักษร'
      };
    }
  }

  const now = new Date().toISOString();

  // 1. Complete the investigation
  const { error: updateErr } = await supabase
    .from('qms_investigations')
    .update({
      current_status: 'COMPLETED',
      completed_at: now,
      capa_required: params.capaRequired,
      capa_decision_justification: params.capaDecisionJustification || null,
      capa_decided_by: params.qaUserId,
      capa_decided_by_name: params.qaUserName,
      capa_decided_at: now,
      qa_review_notes: params.qaReviewNotes,
      qa_approved_by: params.qaUserId,
      qa_approved_by_name: params.qaUserName,
      qa_approved_at: now,
      updated_at: now
    })
    .eq('id', params.investigationId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // 2. Update parent Quality Event status
  const nextEventStatus = params.capaRequired ? 'CAPA_PENDING' : 'RESOLVED';
  await supabase
    .from('qms_quality_events')
    .update({
      current_status: nextEventStatus,
      qa_classification_notes: inv.quality_event?.qa_classification_notes 
        ? `${inv.quality_event.qa_classification_notes}\n[QA Close Investigation] ${params.qaReviewNotes}`
        : `[QA Close Investigation] ${params.qaReviewNotes}`
    })
    .eq('id', inv.quality_event_id);

  // 3. Electronic Signature
  await supabase.from('qms_electronic_signatures').insert({
    entity_type: 'INVESTIGATION',
    entity_id: params.investigationId,
    signer_user_id: params.qaUserId,
    signer_name: params.qaUserName,
    signer_role: params.qaRole,
    signature_meaning: 'RCA_APPROVAL',
    reason_comment: `อนุมัติผลการสืบสวนและวิเคราะห์สาเหตุ (CAPA Required: ${params.capaRequired ? 'YES' : 'NO'})`
  });

  // 4. Audit Trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_investigations',
    record_id: params.investigationId,
    action_type: 'APPROVE_INVESTIGATION',
    record_version: ((inv.record_version || 1) + 1),
    changed_by: params.qaUserId,
    changed_by_name: params.qaUserName,
    change_reason: `อนุมัติปิดการสอบสวน ${inv.investigation_no}`
  });

  revalidatePath('/issues');
  return { success: true };
}
