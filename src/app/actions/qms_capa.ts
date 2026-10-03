"use server";

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { 
  QmsCapa, 
  QmsCapaAction, 
  QmsCapaEvidence, 
  QmsCapaActionExtension, 
  QmsActionType, 
  QmsActionStatus,
  QmsCapaPriority,
  QmsCapaEvidenceType,
  QmsMyCapaWorkSummary
} from '@/types/qms';

/**
 * Controlled Sequence Generation Helper
 */
async function getNextCapaNumber(): Promise<string> {
  const supabase = createAdminClient();
  const currentYear = new Date().getFullYear().toString();
  const { data, error } = await supabase.rpc('qms_get_next_number', {
    seq_type: 'CAPA',
    for_year: currentYear
  });

  if (error || !data) {
    // Fallback if rpc has signature variation
    const countRes = await supabase.from('qms_capas').select('id', { count: 'exact', head: true });
    const count = (countRes.count || 0) + 1;
    return `CAPA-${currentYear}-${count.toString().padStart(4, '0')}`;
  }
  return data;
}

/**
 * 1. Create CAPA directly from approved Investigation
 */
export async function createCapaFromInvestigation(params: {
  investigationId: string;
  capaOwnerId: string;
  capaOwnerName: string;
  departmentId?: string;
  departmentName?: string;
  targetDueDate: string;
  priority?: QmsCapaPriority;
  correctionPlan?: string;
  correctiveActionPlan?: string;
  preventiveImprovementPlan?: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  data?: QmsCapa;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Check if CAPA already exists for this investigation
  const { data: existing } = await supabase
    .from('qms_capas')
    .select('*')
    .eq('investigation_id', params.investigationId)
    .maybeSingle();

  if (existing) {
    return { success: true, data: existing as QmsCapa };
  }

  // Fetch investigation with quality event
  const { data: inv, error: invErr } = await supabase
    .from('qms_investigations')
    .select('*, quality_event:qms_quality_events(*)')
    .eq('id', params.investigationId)
    .single();

  if (invErr || !inv) {
    return { success: false, error: 'ไม่พบข้อมูลการสืบสวนที่ระบุ' };
  }

  const qe = inv.quality_event;
  if (!qe) {
    return { success: false, error: 'ไม่พบเหตุการณ์คุณภาพที่เชื่อมโยง' };
  }

  const capaNo = await getNextCapaNumber();
  const title = `CAPA: ${qe.title}`;
  const problemStatement = inv.question_framework?.what_happened || qe.description;
  const rootCauseSummary = inv.root_cause_summary || inv.simple_root_cause_statement || 'สาเหตุรากเหง้าตามผลการสืบสวน';
  const rootCauseCategory = inv.root_cause_category || 'MACHINE';

  // Snapshot context to freeze references
  const snapshotContext = {
    quality_event_no: qe.event_no,
    investigation_no: inv.investigation_no,
    product_sku: qe.snapshot_context?.manufacturing_context?.product?.sku || 'N/A',
    product_name: qe.snapshot_context?.manufacturing_context?.product?.product_name || qe.title,
    batch_lot_no: qe.material_lot_no || qe.production_lot_id || 'N/A',
    severity: qe.qa_confirmed_severity,
    risk_level: qe.risk_level,
    root_cause_category: rootCauseCategory,
    has_happened_before: inv.question_framework?.has_happened_before || false,
    recurrence_details: inv.question_framework?.recurrence_details || ''
  };

  const { data: newCapa, error: insertErr } = await supabase
    .from('qms_capas')
    .insert({
      capa_no: capaNo,
      quality_event_id: qe.id,
      investigation_id: inv.id,
      title,
      problem_statement: problemStatement,
      root_cause_summary: rootCauseSummary,
      root_cause_category: rootCauseCategory,
      capa_owner_id: params.capaOwnerId,
      capa_owner_name: params.capaOwnerName,
      department_id: params.departmentId || qe.department_id,
      department_name: params.departmentName || 'Quality Assurance / Production',
      priority: params.priority || (qe.qa_confirmed_severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'),
      target_due_date: params.targetDueDate,
      original_due_date: params.targetDueDate,
      current_status: 'IN_PROGRESS',
      correction_plan: params.correctionPlan || inv.immediate_correction_description || '',
      corrective_action_plan: params.correctiveActionPlan || '',
      preventive_improvement_plan: params.preventiveImprovementPlan || '',
      snapshot_context: snapshotContext,
      record_version: 1
    })
    .select()
    .single();

  if (insertErr || !newCapa) {
    console.error('Create CAPA error:', insertErr);
    return { success: false, error: insertErr?.message || 'สร้าง CAPA ล้มเหลว' };
  }

  // Audit trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_capas',
    record_id: newCapa.id,
    action_type: 'CAPA_CREATED',
    record_version: 1,
    after_value: newCapa,
    changed_by: params.userId,
    changed_by_name: params.userName,
    change_reason: `เปิด CAPA เลขที่ ${capaNo} จากผลการสืบสวน ${inv.investigation_no}`
  });

  revalidatePath('/issues');
  return { success: true, data: newCapa as QmsCapa };
}

/**
 * 2. Get CAPA by ID with Actions & Evidence
 */
export async function getCapaById(capaId: string): Promise<{
  success: boolean;
  data?: QmsCapa;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('qms_capas')
    .select(`
      *,
      actions:qms_capa_actions(*, extensions:qms_capa_action_extensions(*)),
      evidence_list:qms_capa_evidence(*),
      quality_event:qms_quality_events(*),
      investigation:qms_investigations(*)
    `)
    .eq('id', capaId)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'ไม่พบข้อมูล CAPA' };
  }

  // Sort actions by action_no
  if (data.actions) {
    data.actions.sort((a: any, b: any) => a.action_no - b.action_no);
  }

  // Self-healing synchronization: guarantee that status accurately matches action verification states
  // Rule: ALL required actions must be VERIFIED -> AWAITING_EFFECTIVENESS, else IN_PROGRESS
  const totalActions = data.actions?.length || 0;
  const verifiedActions = data.actions?.filter((a: any) => a.status === 'VERIFIED').length || 0;
  const isAllVerified = totalActions > 0 && verifiedActions === totalActions;

  if (data.current_status === 'AWAITING_EFFECTIVENESS' && !isAllVerified) {
    await supabase
      .from('qms_capas')
      .update({ current_status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
      .eq('id', data.id);
    data.current_status = 'IN_PROGRESS';
  } else if (data.current_status === 'IN_PROGRESS' && isAllVerified) {
    await supabase
      .from('qms_capas')
      .update({ current_status: 'AWAITING_EFFECTIVENESS', updated_at: new Date().toISOString() })
      .eq('id', data.id);
    data.current_status = 'AWAITING_EFFECTIVENESS';
  }

  return { success: true, data: data as QmsCapa };
}

/**
 * 3. Get CAPA by Investigation ID
 */
export async function getCapaByInvestigationId(investigationId: string): Promise<{
  success: boolean;
  data?: QmsCapa | null;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('qms_capas')
    .select(`
      *,
      actions:qms_capa_actions(*, extensions:qms_capa_action_extensions(*)),
      evidence_list:qms_capa_evidence(*),
      quality_event:qms_quality_events(*),
      investigation:qms_investigations(*)
    `)
    .eq('investigation_id', investigationId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.actions) {
    data.actions.sort((a: any, b: any) => a.action_no - b.action_no);
  }

  return { success: true, data: data as QmsCapa | null };
}

/**
 * 4. Save CAPA Plan Draft
 */
export async function saveCapaPlanDraft(params: {
  capaId: string;
  title?: string;
  problemStatement?: string;
  rootCauseSummary?: string;
  correctionPlan?: string;
  correctiveActionPlan?: string;
  preventiveImprovementPlan?: string;
  priority?: QmsCapaPriority;
  targetDueDate?: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  const updates: any = {
    updated_at: new Date().toISOString()
  };

  if (params.title) updates.title = params.title;
  if (params.problemStatement) updates.problem_statement = params.problemStatement;
  if (params.rootCauseSummary) updates.root_cause_summary = params.rootCauseSummary;
  if (params.correctionPlan !== undefined) updates.correction_plan = params.correctionPlan;
  if (params.correctiveActionPlan !== undefined) updates.corrective_action_plan = params.correctiveActionPlan;
  if (params.preventiveImprovementPlan !== undefined) updates.preventive_improvement_plan = params.preventiveImprovementPlan;
  if (params.priority) updates.priority = params.priority;
  if (params.targetDueDate) updates.target_due_date = params.targetDueDate;

  const { error } = await supabase
    .from('qms_capas')
    .update(updates)
    .eq('id', params.capaId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/issues');
  return { success: true };
}

/**
 * Helper to recompute and synchronize CAPA lifecycle status based on required implementation actions.
 * LIFECYCLE RULE (ISO 22716 / ASEAN Cosmetic GMP):
 * 1. ALL required CAPA implementation actions must be VERIFIED -> AWAITING_EFFECTIVENESS (100% complete)
 * 2. If ANY required action is NOT_STARTED, IN_PROGRESS, WAITING, COMPLETED (unverified), RETURNED, or OVERDUE:
 *    CAPA MUST remain in implementation status (IN_PROGRESS).
 * 3. Never permit AWAITING_EFFECTIVENESS while required implementation actions remain unverified.
 */
export async function syncCapaLifecycleStatus(
  capaId: string,
  userId?: string,
  userName?: string
): Promise<{
  success: boolean;
  capaId: string;
  previousStatus: string;
  newStatus: string;
  totalActions: number;
  verifiedCount: number;
  progressPercent: number;
  isAllVerified: boolean;
}> {
  const supabase = createAdminClient();

  const { data: capa, error: capaErr } = await supabase
    .from('qms_capas')
    .select('id, current_status, record_version, capa_no')
    .eq('id', capaId)
    .single();

  if (capaErr || !capa) {
    return {
      success: false,
      capaId,
      previousStatus: 'UNKNOWN',
      newStatus: 'UNKNOWN',
      totalActions: 0,
      verifiedCount: 0,
      progressPercent: 0,
      isAllVerified: false
    };
  }

  const { data: actions } = await supabase
    .from('qms_capa_actions')
    .select('id, status')
    .eq('capa_id', capaId);

  const totalActions = actions?.length || 0;
  const verifiedCount = actions?.filter((a: any) => a.status === 'VERIFIED').length || 0;
  const progressPercent = totalActions > 0 ? Math.round((verifiedCount / totalActions) * 100) : 0;
  const isAllVerified = totalActions > 0 && verifiedCount === totalActions;

  let newStatus = capa.current_status;

  if (isAllVerified) {
    // Transition to AWAITING_EFFECTIVENESS (unless already closed in Phase 4)
    if (capa.current_status !== 'AWAITING_EFFECTIVENESS' && capa.current_status !== 'CLOSED') {
      newStatus = 'AWAITING_EFFECTIVENESS';
      await supabase
        .from('qms_capas')
        .update({
          current_status: 'AWAITING_EFFECTIVENESS',
          updated_at: new Date().toISOString()
        })
        .eq('id', capaId);

      await supabase.from('qms_audit_trail').insert({
        table_name: 'qms_capas',
        record_id: capaId,
        action_type: 'CAPA_AWAITING_EFFECTIVENESS',
        record_version: (capa.record_version || 1) + 1,
        changed_by: userId || 'SYSTEM',
        changed_by_name: userName || 'ระบบ CosmeFlow QMS',
        change_reason: `มาตรการทั้งหมดได้รับการตรวจรับรองผ่านเกณฑ์ 100% (${verifiedCount}/${totalActions} Verified) — ปรับสถานะเป็น AWAITING_EFFECTIVENESS`
      });
    }
  } else {
    // If ANY action is not verified, CAPA MUST leave AWAITING_EFFECTIVENESS and remain in IN_PROGRESS
    if (capa.current_status === 'AWAITING_EFFECTIVENESS') {
      newStatus = 'IN_PROGRESS';
      await supabase
        .from('qms_capas')
        .update({
          current_status: 'IN_PROGRESS',
          updated_at: new Date().toISOString()
        })
        .eq('id', capaId);

      await supabase.from('qms_audit_trail').insert({
        table_name: 'qms_capas',
        record_id: capaId,
        action_type: 'CAPA_STATUS_CHANGED',
        record_version: (capa.record_version || 1) + 1,
        changed_by: userId || 'SYSTEM',
        changed_by_name: userName || 'ระบบ CosmeFlow QMS',
        change_reason: `ยังมีมาตรการที่ยังไม่ผ่านการตรวจรับรอง (${verifiedCount}/${totalActions} Verified, ${progressPercent}%) — ปรับสถานะกลับสู่ขั้นตอนการปฏิบัติการ (IN_PROGRESS)`
      });
    } else if (capa.current_status === 'OPEN') {
      newStatus = 'IN_PROGRESS';
      await supabase
        .from('qms_capas')
        .update({
          current_status: 'IN_PROGRESS',
          updated_at: new Date().toISOString()
        })
        .eq('id', capaId);
    }
  }

  return {
    success: true,
    capaId,
    previousStatus: capa.current_status,
    newStatus,
    totalActions,
    verifiedCount,
    progressPercent,
    isAllVerified
  };
}

/**
 * 5. Create CAPA Action Item
 */
export async function createCapaAction(params: {
  capaId: string;
  actionType: QmsActionType;
  title: string;
  description: string;
  responsibleOwnerId: string;
  responsibleOwnerName: string;
  departmentId?: string;
  departmentName: string;
  dueDate: string;
  evidenceRequired?: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  data?: QmsCapaAction;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.title.trim()) {
    return { success: false, error: 'กรุณาระบุหัวข้องานดำเนินการ' };
  }
  if (!params.responsibleOwnerName.trim()) {
    return { success: false, error: 'กรุณาระบุผู้รับผิดชอบงาน' };
  }

  // Count existing actions for action_no
  const countRes = await supabase
    .from('qms_capa_actions')
    .select('id', { count: 'exact', head: true })
    .eq('capa_id', params.capaId);

  const nextActionNo = (countRes.count || 0) + 1;

  const { data: newAction, error } = await supabase
    .from('qms_capa_actions')
    .insert({
      capa_id: params.capaId,
      action_no: nextActionNo,
      action_type: params.actionType,
      title: params.title,
      description: params.description,
      responsible_owner_id: params.responsibleOwnerId,
      responsible_owner_name: params.responsibleOwnerName,
      department_id: params.departmentId,
      department_name: params.departmentName,
      due_date: params.dueDate,
      original_due_date: params.dueDate,
      status: 'NOT_STARTED',
      evidence_required: params.evidenceRequired || '',
      record_version: 1
    })
    .select()
    .single();

  if (error || !newAction) {
    return { success: false, error: error?.message || 'สร้างรายการ Action ล้มเหลว' };
  }

  // Synchronize CAPA lifecycle status (guarantees CAPA returns to IN_PROGRESS if an action was added while in AWAITING_EFFECTIVENESS)
  await syncCapaLifecycleStatus(params.capaId, params.userId, params.userName);

  // Audit trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_capa_actions',
    record_id: newAction.id,
    action_type: 'ACTION_CREATED',
    record_version: 1,
    after_value: newAction,
    changed_by: params.userId,
    changed_by_name: params.userName,
    change_reason: `เพิ่มมาตรการ #${nextActionNo} (${params.actionType}): ${params.title}`
  });

  revalidatePath('/issues');
  return { success: true, data: newAction as QmsCapaAction };
}

/**
 * 6. Update Action Status to IN_PROGRESS
 */
export async function startCapaAction(actionId: string, userId: string, userName: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('qms_capa_actions')
    .update({
      status: 'IN_PROGRESS',
      updated_at: new Date().toISOString()
    })
    .eq('id', actionId);

  if (error) return { success: false, error: error.message };

  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_capa_actions',
    record_id: actionId,
    action_type: 'ACTION_STARTED',
    record_version: 1,
    changed_by: userId,
    changed_by_name: userName,
    change_reason: 'เริ่มดำเนินการมาตรการ (Status -> IN_PROGRESS)'
  });

  revalidatePath('/issues');
  return { success: true };
}

/**
 * 7. Submit Action as COMPLETED (Action Owner submission)
 */
export async function submitActionCompleted(params: {
  actionId: string;
  implementationNotes: string;
  completedBy: string;
  completedByName: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.implementationNotes.trim()) {
    return { success: false, error: 'กรุณาระบุบันทึกผลการปฏิบัติงาน (Implementation Notes)' };
  }

  const { data: action, error: fetchErr } = await supabase
    .from('qms_capa_actions')
    .select('*, capa:qms_capas(capa_no)')
    .eq('id', params.actionId)
    .single();

  if (fetchErr || !action) {
    return { success: false, error: 'ไม่พบรายการ Action' };
  }

  const { error: updateErr } = await supabase
    .from('qms_capa_actions')
    .update({
      status: 'COMPLETED',
      implementation_notes: params.implementationNotes,
      completed_at: new Date().toISOString(),
      completed_by: params.completedBy,
      completed_by_name: params.completedByName,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.actionId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Audit trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_capa_actions',
    record_id: params.actionId,
    action_type: 'ACTION_COMPLETED',
    record_version: (action.record_version || 1) + 1,
    changed_by: params.completedBy,
    changed_by_name: params.completedByName,
    change_reason: `ผู้รับผิดชอบส่งมอบงานเรียบร้อย รอ QA ตรวจรับรอง (Status -> COMPLETED)`
  });

  revalidatePath('/issues');
  return { success: true };
}

/**
 * 8. QA Verification & Disposition (VERIFIED or RETURN)
 * Segregation of Duties: Action Owner cannot verify their own action!
 */
export async function verifyCapaAction(params: {
  actionId: string;
  decision: 'VERIFIED' | 'RETURN_FOR_CORRECTION';
  comment: string;
  qaUserId: string;
  qaUserName: string;
  qaRole: string;
}): Promise<{
  success: boolean;
  isAllActionsVerified?: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.comment.trim()) {
    return { success: false, error: 'กรุณาระบุความคิดเห็นการตรวจรับรองของ QA' };
  }

  const { data: action, error: fetchErr } = await supabase
    .from('qms_capa_actions')
    .select('*')
    .eq('id', params.actionId)
    .single();

  if (fetchErr || !action) {
    return { success: false, error: 'ไม่พบรายการ Action' };
  }

  // Segregation of Duties Guardrail
  if (action.responsible_owner_id === params.qaUserId && params.decision === 'VERIFIED') {
    return { 
      success: false, 
      error: 'ตามหลักการแบ่งแยกหน้าที่ (Segregation of Duties): ผู้รับผิดชอบมาตรการไม่สามารถตรวจรับรองผลงานของตนเองได้' 
    };
  }

  if (params.decision === 'VERIFIED') {
    const { error: verifyErr } = await supabase
      .from('qms_capa_actions')
      .update({
        status: 'VERIFIED',
        verification_decision: 'VERIFIED',
        verified_at: new Date().toISOString(),
        verified_by: params.qaUserId,
        verified_by_name: params.qaUserName,
        verification_comment: params.comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.actionId);

    if (verifyErr) return { success: false, error: verifyErr.message };

    // Recompute and synchronize CAPA lifecycle status across all actions
    const syncRes = await syncCapaLifecycleStatus(action.capa_id, params.qaUserId, params.qaUserName);

    // Audit trail for action
    await supabase.from('qms_audit_trail').insert({
      table_name: 'qms_capa_actions',
      record_id: params.actionId,
      action_type: 'ACTION_VERIFIED',
      record_version: (action.record_version || 1) + 1,
      changed_by: params.qaUserId,
      changed_by_name: params.qaUserName,
      change_reason: `QA ตรวจรับรองผ่านเกณฑ์: ${params.comment}`
    });

    revalidatePath('/issues');
    return { success: true, isAllActionsVerified: syncRes.isAllVerified };
  } else {
    // RETURN FOR CORRECTION
    const { error: returnErr } = await supabase
      .from('qms_capa_actions')
      .update({
        status: 'RETURNED',
        verification_decision: 'RETURN_FOR_CORRECTION',
        return_reason: params.comment,
        returned_at: new Date().toISOString(),
        returned_by: params.qaUserId,
        returned_by_name: params.qaUserName,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.actionId);

    if (returnErr) return { success: false, error: returnErr.message };

    // Recompute and synchronize CAPA lifecycle status across all actions (guarantees CAPA returns to IN_PROGRESS if was AWAITING_EFFECTIVENESS)
    await syncCapaLifecycleStatus(action.capa_id, params.qaUserId, params.qaUserName);

    // Audit trail
    await supabase.from('qms_audit_trail').insert({
      table_name: 'qms_capa_actions',
      record_id: params.actionId,
      action_type: 'ACTION_RETURNED',
      record_version: (action.record_version || 1) + 1,
      changed_by: params.qaUserId,
      changed_by_name: params.qaUserName,
      change_reason: `QA ส่งกลับให้แก้ไขเพิ่มเติม: ${params.comment}`
    });

    revalidatePath('/issues');
    return { success: true, isAllActionsVerified: false };
  }
}

/**
 * 9. Request Due Date Extension (Never silently overwrite original due date!)
 */
export async function requestActionDueDateExtension(params: {
  actionId: string;
  newDueDate: string;
  extensionReason: string;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string;
  approvedByName?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.extensionReason || params.extensionReason.trim().length < 10) {
    return { success: false, error: 'กรุณาระบุเหตุผลการขยายเวลาอย่างน้อย 10 ตัวอักษร' };
  }

  const { data: action, error: fetchErr } = await supabase
    .from('qms_capa_actions')
    .select('*')
    .eq('id', params.actionId)
    .single();

  if (fetchErr || !action) {
    return { success: false, error: 'ไม่พบรายการ Action' };
  }

  // Record extension in history
  const { error: extErr } = await supabase
    .from('qms_capa_action_extensions')
    .insert({
      action_id: params.actionId,
      original_due_date: action.due_date,
      new_due_date: params.newDueDate,
      extension_reason: params.extensionReason,
      requested_by: params.requestedBy,
      requested_by_name: params.requestedByName,
      approved_by: params.approvedBy || params.requestedBy,
      approved_by_name: params.approvedByName || params.requestedByName,
      approved_at: new Date().toISOString(),
      status: 'APPROVED'
    });

  if (extErr) return { success: false, error: extErr.message };

  // Update current due date, preserving original_due_date
  const { error: updateErr } = await supabase
    .from('qms_capa_actions')
    .update({
      due_date: params.newDueDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.actionId);

  if (updateErr) return { success: false, error: updateErr.message };

  // Audit trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_capa_actions',
    record_id: params.actionId,
    action_type: 'DUE_DATE_EXTENDED',
    record_version: (action.record_version || 1) + 1,
    before_value: { due_date: action.due_date },
    after_value: { due_date: params.newDueDate },
    changed_by: params.requestedBy,
    changed_by_name: params.requestedByName,
    change_reason: `ขยายกำหนดส่งจาก ${action.due_date} เป็น ${params.newDueDate} เนื่องจาก: ${params.extensionReason}`
  });

  revalidatePath('/issues');
  return { success: true };
}

/**
 * 10. Add CAPA Implementation Evidence
 */
export async function addCapaEvidence(params: {
  capaId: string;
  actionId?: string;
  evidenceType: QmsCapaEvidenceType;
  title: string;
  description?: string;
  source?: string;
  fileUrl?: string;
  fileName?: string;
  linkedRecordType?: string;
  linkedRecordId?: string;
  uploadedBy: string;
  uploadedByName: string;
}): Promise<{
  success: boolean;
  data?: QmsCapaEvidence;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!params.title.trim()) {
    return { success: false, error: 'กรุณาระบุชื่อหลักฐาน' };
  }

  const { data: evidence, error } = await supabase
    .from('qms_capa_evidence')
    .insert({
      capa_id: params.capaId,
      action_id: params.actionId || null,
      evidence_type: params.evidenceType,
      title: params.title,
      description: params.description,
      source: params.source,
      file_url: params.fileUrl,
      fileName: params.fileName,
      linked_record_type: params.linkedRecordType,
      linked_record_id: params.linkedRecordId,
      uploaded_by: params.uploadedBy,
      uploaded_by_name: params.uploadedByName
    })
    .select()
    .single();

  if (error || !evidence) {
    return { success: false, error: error?.message || 'แนบหลักฐานล้มเหลว' };
  }

  // Audit trail
  await supabase.from('qms_audit_trail').insert({
    table_name: 'qms_capa_evidence',
    record_id: evidence.id,
    action_type: 'EVIDENCE_ADDED',
    record_version: 1,
    after_value: evidence,
    changed_by: params.uploadedBy,
    changed_by_name: params.uploadedByName,
    change_reason: `แนบหลักฐาน (${params.evidenceType}): ${params.title}`
  });

  revalidatePath('/issues');
  return { success: true, data: evidence as QmsCapaEvidence };
}

/**
 * 11. Delete CAPA Evidence
 */
export async function deleteCapaEvidence(evidenceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('qms_capa_evidence').delete().eq('id', evidenceId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/issues');
  return { success: true };
}

/**
 * 12. My CAPA Work ("วันนี้ฉันต้องทำอะไร?")
 */
export async function getMyCapaWork(userId: string): Promise<{
  success: boolean;
  data?: QmsMyCapaWorkSummary;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data: actions, error } = await supabase
    .from('qms_capa_actions')
    .select('*, capa:qms_capas(capa_no, title, priority)')
    .eq('responsible_owner_id', userId)
    .order('due_date', { ascending: true });

  if (error) return { success: false, error: error.message };

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000);

  let openCount = 0;
  let dueSoonCount = 0;
  let overdueCount = 0;
  let waitingQaCount = 0;
  let returnedCount = 0;

  for (const act of (actions || [])) {
    const isCompletedOrVerified = act.status === 'COMPLETED' || act.status === 'VERIFIED';
    if (!isCompletedOrVerified) openCount++;

    if (act.status === 'COMPLETED') waitingQaCount++;
    if (act.status === 'RETURNED') returnedCount++;

    if (!isCompletedOrVerified) {
      const dueDate = new Date(act.due_date);
      if (dueDate < now) overdueCount++;
      else if (dueDate <= threeDaysFromNow) dueSoonCount++;
    }
  }

  return {
    success: true,
    data: {
      my_open_actions_count: openCount,
      due_soon_count: dueSoonCount,
      overdue_count: overdueCount,
      waiting_qa_verification_count: waitingQaCount,
      returned_to_me_count: returnedCount,
      my_actions: (actions || []) as QmsCapaAction[]
    }
  };
}

/**
 * 13. Get all CAPAs with filters
 */
export async function getAllCapas(params?: {
  status?: string;
  departmentId?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data?: QmsCapa[];
  error?: string;
}> {
  const supabase = createAdminClient();

  let query = supabase
    .from('qms_capas')
    .select(`
      *,
      actions:qms_capa_actions(*),
      quality_event:qms_quality_events(event_no, qa_confirmed_severity, qa_confirmed_type)
    `)
    .order('created_at', { ascending: false });

  if (params?.status && params.status !== 'ALL') {
    query = query.eq('current_status', params.status);
  }

  if (params?.search) {
    query = query.or(`capa_no.ilike.%${params.search}%,title.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  // Guarantee accurate lifecycle status representation:
  // Never show AWAITING_EFFECTIVENESS while required implementation actions remain unverified!
  const sanitized = (data || []).map((capa: any) => {
    const totalActs = capa.actions?.length || 0;
    const verifiedActs = capa.actions?.filter((a: any) => a.status === 'VERIFIED').length || 0;
    const allVer = totalActs > 0 && verifiedActs === totalActs;
    if (capa.current_status === 'AWAITING_EFFECTIVENESS' && !allVer) {
      return { ...capa, current_status: 'IN_PROGRESS' };
    }
    return capa;
  });

  return { success: true, data: sanitized as QmsCapa[] };
}
