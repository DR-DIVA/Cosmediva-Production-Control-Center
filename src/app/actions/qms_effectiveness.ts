"use server";

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { 
  QmsCapa,
  QmsCapaEffectivenessPlan,
  QmsCapaEffectivenessCriterion,
  QmsCapaEffectivenessResult,
  QmsCapaRecurrenceReview,
  QmsEffectivenessWorkspaceData,
  QmsEffectivenessScopeType,
  QmsEffectivenessDecision,
  QmsEffectivenessCriterionType,
  QmsResultSource,
  QmsEvaluationStatus,
  QmsQaDispositionPath,
  QmsCapaRevision,
  QmsActionType
} from '@/types/qms';

/**
 * Controlled Sequence Generator for Effectiveness Plan
 */
async function getNextEffectivenessPlanNumber(): Promise<string> {
  const supabase = createAdminClient();
  const currentYear = new Date().getFullYear().toString();
  const { data, error } = await supabase.rpc('qms_get_next_number', {
    seq_type: 'EFF',
    for_year: currentYear
  });

  if (error || !data) {
    const countRes = await supabase.from('qms_capa_effectiveness_plans').select('id', { count: 'exact', head: true });
    const count = (countRes.count || 0) + 1;
    return `EFF-${currentYear}-${count.toString().padStart(4, '0')}`;
  }
  return data;
}

/**
 * 1. Get Complete Effectiveness Workspace Data
 */
export async function getEffectivenessWorkspaceData(capaId: string): Promise<{
  success: boolean;
  data?: QmsEffectivenessWorkspaceData;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Fetch CAPA with actions, event, and investigation
    const { data: capa, error: capaErr } = await supabase
      .from('qms_capas')
      .select(`
        *,
        actions:qms_capa_actions(*),
        evidence_list:qms_capa_evidence(*),
        quality_event:qms_quality_events(*),
        investigation:qms_investigations(*)
      `)
      .eq('id', capaId)
      .single();

    if (capaErr || !capa) {
      return { success: false, error: 'ไม่พบข้อมูล CAPA ในระบบ' };
    }

    // Fetch Effectiveness Plan
    const { data: plans } = await supabase
      .from('qms_capa_effectiveness_plans')
      .select('*')
      .eq('capa_id', capaId)
      .order('created_at', { ascending: false })
      .limit(1);

    const plan: QmsCapaEffectivenessPlan | null = plans && plans.length > 0 ? plans[0] : null;

    let criteria: QmsCapaEffectivenessCriterion[] = [];
    let results: QmsCapaEffectivenessResult[] = [];
    let recurrenceReviews: QmsCapaRecurrenceReview[] = [];

    if (plan) {
      const [{ data: critData }, { data: resData }, { data: recData }] = await Promise.all([
        supabase
          .from('qms_capa_effectiveness_criteria')
          .select('*')
          .eq('plan_id', plan.id)
          .order('criterion_no', { ascending: true }),
        supabase
          .from('qms_capa_effectiveness_results')
          .select('*')
          .eq('plan_id', plan.id)
          .order('sample_no', { ascending: true }),
        supabase
          .from('qms_capa_recurrence_reviews')
          .select(`
            *,
            related_event:qms_quality_events(*)
          `)
          .eq('capa_id', capaId)
          .order('system_detected_at', { ascending: false })
      ]);

      criteria = critData || [];
      results = resData || [];
      recurrenceReviews = (recData as any) || [];
    }

    // Fetch Revisions
    const { data: revisions } = await supabase
      .from('qms_capa_revisions')
      .select('*')
      .eq('capa_id', capaId)
      .order('revision_no', { ascending: true });

    // Fetch Audit Trail
    const { data: auditTrail } = await supabase
      .from('qms_audit_trail')
      .select('*')
      .or(`record_id.eq.${capaId}${plan ? `,record_id.eq.${plan.id}` : ''}`)
      .order('created_at', { ascending: false });

    // Calculate Summary Metrics
    const totalCriteria = criteria.length;
    const passedCriteria = criteria.filter(c => c.status === 'PASSED').length;
    const failedCriteria = criteria.filter(c => c.status === 'FAILED').length;

    const totalSamplesPlanned = plan?.scope_target_count || 0;
    const samplesEvaluated = results.filter(r => r.evaluation_status !== 'PENDING').length;
    const samplesPassed = results.filter(r => r.evaluation_status === 'PASS').length;
    const samplesFailed = results.filter(r => r.evaluation_status === 'FAIL').length;

    const potentialRecurrencesCount = recurrenceReviews.filter(r => r.review_status === 'POTENTIAL_RECURRENCE').length;
    const confirmedRecurrencesCount = recurrenceReviews.filter(r => r.review_status === 'CONFIRMED_RECURRENCE').length;

    const isScopeCompleted = totalSamplesPlanned > 0 ? samplesEvaluated >= totalSamplesPlanned : totalCriteria > 0;
    const isReadyForReview = isScopeCompleted && potentialRecurrencesCount === 0;

    return {
      success: true,
      data: {
        capa: capa as QmsCapa,
        plan,
        criteria,
        results,
        recurrence_reviews: recurrenceReviews,
        revisions: revisions || [],
        audit_trail: auditTrail || [],
        summary: {
          total_criteria: totalCriteria,
          passed_criteria: passedCriteria,
          failed_criteria: failedCriteria,
          total_samples_planned: totalSamplesPlanned,
          samples_evaluated: samplesEvaluated,
          samples_passed: samplesPassed,
          samples_failed: samplesFailed,
          potential_recurrences_count: potentialRecurrencesCount,
          confirmed_recurrences_count: confirmedRecurrencesCount,
          is_ready_for_review: isReadyForReview
        }
      }
    };
  } catch (err: any) {
    console.error('Error getting effectiveness workspace data:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Create Effectiveness Plan
 */
export async function createEffectivenessPlan(params: {
  capaId: string;
  title: string;
  objective?: string;
  scopeType: QmsEffectivenessScopeType;
  scopeTargetCount: number;
  scopeDescription?: string;
  targetDueDate: string;
  responsibleOwnerId: string;
  responsibleOwnerName: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  data?: QmsCapaEffectivenessPlan;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Verify CAPA exists
    const { data: capa, error: capaErr } = await supabase
      .from('qms_capas')
      .select('id, capa_no, current_status, record_version')
      .eq('id', params.capaId)
      .single();

    if (capaErr || !capa) {
      return { success: false, error: 'ไม่พบข้อมูล CAPA ที่ต้องการกำหนดแผน' };
    }

    const planNo = await getNextEffectivenessPlanNumber();

    const insertData = {
      capa_id: params.capaId,
      plan_no: planNo,
      title: params.title,
      objective: params.objective || `ติดตามประสิทธิผลการแก้ไขและป้องกันการเกิดซ้ำของ ${capa.capa_no}`,
      scope_type: params.scopeType,
      scope_target_count: params.scopeTargetCount,
      scope_description: params.scopeDescription || `ติดตามการผลิตต่อเนื่องจำนวน ${params.scopeTargetCount} แบทช์`,
      target_due_date: params.targetDueDate,
      responsible_owner_id: params.responsibleOwnerId,
      responsible_owner_name: params.responsibleOwnerName,
      status: 'MONITORING_IN_PROGRESS',
      record_version: 1
    };

    const { data: newPlan, error: insertErr } = await supabase
      .from('qms_capa_effectiveness_plans')
      .insert(insertData)
      .select()
      .single();

    if (insertErr || !newPlan) {
      return { success: false, error: insertErr?.message || 'บันทึกแผนติดตามประสิทธิผลล้มเหลว' };
    }

    // Update CAPA effectiveness_status
    await supabase
      .from('qms_capas')
      .update({
        effectiveness_status: 'MONITORING_IN_PROGRESS',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.capaId);

    // Audit Trail
    await supabase.from('qms_audit_trail').insert({
      table_name: 'qms_capa_effectiveness_plans',
      record_id: newPlan.id,
      action_type: 'EFFECTIVENESS_PLAN_CREATED',
      record_version: 1,
      changed_by: params.userId,
      changed_by_name: params.userName,
      change_reason: `อนุมัติแผนติดตามประสิทธิผล ${newPlan.plan_no} (ขอบเขต: ${params.scopeTargetCount} แบทช์ต่อเนื่อง)`
    });

    revalidatePath('/issues');
    return { success: true, data: newPlan as QmsCapaEffectivenessPlan };
  } catch (err: any) {
    console.error('Error creating effectiveness plan:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Add Measurable Effectiveness Criterion
 */
export async function addEffectivenessCriterion(params: {
  planId: string;
  capaId: string;
  criterionType: QmsEffectivenessCriterionType;
  title: string;
  description?: string;
  measurableTarget: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  data?: QmsCapaEffectivenessCriterion;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Find next criterion number
    const { data: existing } = await supabase
      .from('qms_capa_effectiveness_criteria')
      .select('criterion_no')
      .eq('plan_id', params.planId)
      .order('criterion_no', { ascending: false })
      .limit(1);

    const nextNo = (existing && existing.length > 0 ? existing[0].criterion_no : 0) + 1;

    const { data: criterion, error } = await supabase
      .from('qms_capa_effectiveness_criteria')
      .insert({
        plan_id: params.planId,
        capa_id: params.capaId,
        criterion_no: nextNo,
        criterion_type: params.criterionType,
        title: params.title,
        description: params.description,
        measurable_target: params.measurableTarget,
        status: 'PENDING'
      })
      .select()
      .single();

    if (error || !criterion) {
      return { success: false, error: error?.message || 'เพิ่มเกณฑ์การประเมินล้มเหลว' };
    }

    // Audit Trail
    await supabase.from('qms_audit_trail').insert({
      table_name: 'qms_capa_effectiveness_criteria',
      record_id: criterion.id,
      action_type: 'EFFECTIVENESS_CRITERIA_ADDED',
      record_version: 1,
      changed_by: params.userId,
      changed_by_name: params.userName,
      change_reason: `กำหนดเกณฑ์วัดผลข้อที่ ${nextNo}: ${params.title} (เป้าหมาย: ${params.measurableTarget})`
    });

    revalidatePath('/issues');
    return { success: true, data: criterion as QmsCapaEffectivenessCriterion };
  } catch (err: any) {
    console.error('Error adding effectiveness criterion:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Record Monitoring Result (Linked System or Manual)
 */
export async function recordEffectivenessResult(params: {
  planId: string;
  capaId: string;
  criterionId?: string;
  sampleNo: number;
  batchLotNo?: string;
  productionDate?: string;
  resultSource: QmsResultSource;
  linkedRecordType?: string;
  linkedRecordId?: string;
  linkedRecordRef?: string;
  measuredValue: string;
  specificationTarget: string;
  evaluationStatus: QmsEvaluationStatus;
  evidenceUrl?: string;
  notes?: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  data?: QmsCapaEffectivenessResult;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    const insertData = {
      plan_id: params.planId,
      capa_id: params.capaId,
      criterion_id: params.criterionId,
      sample_no: params.sampleNo,
      batch_lot_no: params.batchLotNo,
      production_date: params.productionDate,
      result_source: params.resultSource,
      linked_record_type: params.linkedRecordType,
      linked_record_id: params.linkedRecordId,
      linked_record_ref: params.linkedRecordRef,
      measured_value: params.measuredValue,
      specification_target: params.specificationTarget,
      evaluation_status: params.evaluationStatus,
      evidence_url: params.evidenceUrl,
      notes: params.notes,
      evaluated_by: params.userId,
      evaluated_by_name: params.userName,
      evaluated_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from('qms_capa_effectiveness_results')
      .insert(insertData)
      .select()
      .single();

    if (error || !result) {
      return { success: false, error: error?.message || 'บันทึกผลการติดตามล้มเหลว' };
    }

    // Update Plan Status if all samples collected
    const { data: plan } = await supabase
      .from('qms_capa_effectiveness_plans')
      .select('scope_target_count')
      .eq('id', params.planId)
      .single();

    const { count: evaluatedCount } = await supabase
      .from('qms_capa_effectiveness_results')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', params.planId)
      .neq('evaluation_status', 'PENDING');

    if (plan && evaluatedCount && evaluatedCount >= plan.scope_target_count) {
      await supabase
        .from('qms_capa_effectiveness_plans')
        .update({
          status: 'MONITORING_COMPLETED',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.planId);
    }

    // Audit Trail
    await supabase.from('qms_audit_trail').insert({
      table_name: 'qms_capa_effectiveness_results',
      record_id: result.id,
      action_type: 'EFFECTIVENESS_RESULT_RECORDED',
      record_version: 1,
      changed_by: params.userId,
      changed_by_name: params.userName,
      change_reason: `บันทึกผลการตรวจติดตามตัวอย่างที่ ${params.sampleNo} (แบทช์ ${params.batchLotNo || '-'}): ผลตรวจ = ${params.measuredValue} [${params.evaluationStatus}]`
    });

    revalidatePath('/issues');
    return { success: true, data: result as QmsCapaEffectivenessResult };
  } catch (err: any) {
    console.error('Error recording effectiveness result:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Detect Potential Recurrences (Reusing Similar Event Intelligence)
 */
export async function detectPotentialRecurrences(capaId: string): Promise<{
  success: boolean;
  detectedCount: number;
  potentialEvents: any[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Fetch CAPA with context
    const { data: capa } = await supabase
      .from('qms_capas')
      .select(`
        id, capa_no, created_at,
        quality_event:qms_quality_events(product_sku, equipment_code, process_id, department_id, title)
      `)
      .eq('id', capaId)
      .single();

    if (!capa || !capa.quality_event) {
      return { success: false, detectedCount: 0, potentialEvents: [], error: 'ไม่พบบริบทเหตุการณ์ของ CAPA' };
    }

    const event = (capa as any).quality_event;

    // Search for Quality Events created after CAPA creation date (or in similar timeframe)
    // with matching SKU, Equipment, or Process
    const { data: similarEvents } = await supabase
      .from('qms_quality_events')
      .select('id, event_no, title, product_sku, equipment_code, current_status, created_at')
      .neq('id', (capa as any).quality_event_id)
      .or(`product_sku.eq.${event.product_sku || 'NONE'},equipment_code.eq.${event.equipment_code || 'NONE'}`)
      .order('created_at', { ascending: false })
      .limit(5);

    const newlyDetected: any[] = [];

    if (similarEvents && similarEvents.length > 0) {
      for (const ev of similarEvents) {
        // Check if already reviewed for this CAPA
        const { data: existing } = await supabase
          .from('qms_capa_recurrence_reviews')
          .select('id')
          .eq('capa_id', capaId)
          .eq('related_event_id', ev.id)
          .maybeSingle();

        if (!existing) {
          const dimension = ev.equipment_code === event.equipment_code 
            ? 'SAME_EQUIPMENT' 
            : (ev.product_sku === event.product_sku ? 'SAME_PRODUCT_SKU' : 'RELATED_PROCESS');

          const { data: inserted } = await supabase
            .from('qms_capa_recurrence_reviews')
            .insert({
              capa_id: capaId,
              related_event_id: ev.id,
              matching_dimension: dimension,
              review_status: 'POTENTIAL_RECURRENCE'
            })
            .select()
            .single();

          if (inserted) {
            newlyDetected.push({ ...inserted, event: ev });
          }
        }
      }
    }

    return {
      success: true,
      detectedCount: newlyDetected.length,
      potentialEvents: newlyDetected
    };
  } catch (err: any) {
    console.error('Error detecting potential recurrences:', err);
    return { success: false, detectedCount: 0, potentialEvents: [], error: err.message };
  }
}

/**
 * 6. QA Review Potential Recurrence (Confirm / Reject)
 */
export async function reviewRecurrence(params: {
  reviewId: string;
  capaId: string;
  decision: 'CONFIRMED_RECURRENCE' | 'REJECTED_RECURRENCE';
  notes: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    if (!params.notes || params.notes.trim().length < 10) {
      return { success: false, error: 'กรุณาระบุบันทึกเหตุผลการประเมินการเกิดซ้ำอย่างน้อย 10 ตัวอักษร' };
    }

    const { error } = await supabase
      .from('qms_capa_recurrence_reviews')
      .update({
        review_status: params.decision,
        qa_decision_notes: params.notes,
        reviewed_by: params.userId,
        reviewed_by_name: params.userName,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', params.reviewId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Audit Trail
    await supabase.from('qms_audit_trail').insert({
      table_name: 'qms_capa_recurrence_reviews',
      record_id: params.reviewId,
      action_type: params.decision === 'CONFIRMED_RECURRENCE' ? 'RECURRENCE_CONFIRMED' : 'RECURRENCE_REJECTED',
      record_version: 1,
      changed_by: params.userId,
      changed_by_name: params.userName,
      change_reason: `QA ประเมินข้อสงสัยการเกิดซ้ำ: ${params.decision} — "${params.notes}"`
    });

    revalidatePath('/issues');
    return { success: true };
  } catch (err: any) {
    console.error('Error reviewing recurrence:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Submit Final Effectiveness Decision & CAPA Disposition
 */
export async function submitFinalEffectivenessDecision(params: {
  planId: string;
  capaId: string;
  decision: QmsEffectivenessDecision;
  qaConclusion: string;
  supportingEvidenceSummary?: string;
  earlyTerminationReason?: string;
  // Controlled QA Follow-up Disposition
  dispositionPaths?: QmsQaDispositionPath[];
  dispositionRationale?: string;
  extendTargetCount?: number;
  extendDueDate?: string;
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  newCapaStatus?: string;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Validation
    if (!params.qaConclusion || params.qaConclusion.trim().length < 15) {
      return { success: false, error: 'กรุณาระบุข้อสรุปผลการประเมินประสิทธิผลโดย QA อย่างน้อย 15 ตัวอักษร' };
    }

    // 1. Fetch current plan, results, criteria, and recurrence reviews
    const { data: plan } = await supabase
      .from('qms_capa_effectiveness_plans')
      .select('scope_target_count, target_due_date, plan_no')
      .eq('id', params.planId)
      .single();

    const { data: results } = await supabase
      .from('qms_capa_effectiveness_results')
      .select('id, evaluation_status')
      .eq('plan_id', params.planId);

    const { data: recurrenceReviews } = await supabase
      .from('qms_capa_recurrence_reviews')
      .select('review_status')
      .eq('capa_id', params.capaId);

    const evaluatedResults = results?.filter(r => r.evaluation_status !== 'PENDING') || [];
    const failedResults = results?.filter(r => r.evaluation_status === 'FAIL') || [];
    const confirmedRecurrences = recurrenceReviews?.filter(r => r.review_status === 'CONFIRMED_RECURRENCE') || [];

    // ==========================================
    // HARD CLOSURE GATES ENFORCEMENT (EFFECTIVE -> CLOSED_EFFECTIVE)
    // ==========================================
    if (params.decision === 'EFFECTIVE') {
      // Gate 1: Phase 3 required Actions = 100% VERIFIED
      const { data: capaActions } = await supabase
        .from('qms_capa_actions')
        .select('id, status')
        .eq('capa_id', params.capaId);

      const totalActions = capaActions?.length || 0;
      const unverifiedActions = capaActions?.filter(a => a.status !== 'VERIFIED') || [];
      if (totalActions === 0 || unverifiedActions.length > 0) {
        return {
          success: false,
          error: `Hard Closure Gate Violation: มาตรการ Phase 3 ยังไม่ผ่านการตรวจรับรองครบ 100% (${totalActions - unverifiedActions.length}/${totalActions} มาตรการที่ตรวจรับรองแล้ว) ห้ามปิดเคสเป็น EFFECTIVE`
        };
      }

      // Gate 2: Monitoring Scope = COMPLETE
      const plannedScope = plan?.scope_target_count || 5;
      if (evaluatedResults.length < plannedScope && !params.earlyTerminationReason) {
        return {
          success: false,
          error: `Hard Closure Gate Violation: ผลการติดตามยังไม่ครบตามขอบเขต (${evaluatedResults.length}/${plannedScope} แบทช์) ห้ามปิดเคสเป็น EFFECTIVE`
        };
      }

      // Gate 3: ALL required Effectiveness Criteria = PASS (Zero Failures)
      if (failedResults.length > 0) {
        return {
          success: false,
          error: `Hard Closure Gate Violation: มีผลการติดตามอย่างน้อย ${failedResults.length} รายการไม่ผ่านเกณฑ์ (ห้ามปิดเคสเป็น EFFECTIVE) ต้องพิจารณาเลือก PARTIALLY EFFECTIVE หรือ NOT EFFECTIVE`
        };
      }

      // Gate 4: No unresolved confirmed recurrence that invalidates effectiveness
      if (confirmedRecurrences.length > 0) {
        return {
          success: false,
          error: `Hard Closure Gate Violation: พบเหตุการณ์ที่ยืนยันว่าเป็นการเกิดซ้ำ (${confirmedRecurrences.length} รายการ) ขัดขวางการสรุปประสิทธิผล ห้ามปิดเคสเป็น EFFECTIVE`
        };
      }
      const potentialRecurrences = recurrenceReviews?.filter(r => r.review_status === 'POTENTIAL_RECURRENCE') || [];
      if (potentialRecurrences.length > 0) {
        return {
          success: false,
          error: `Hard Closure Gate Violation: มีข้อสงสัยการเกิดซ้ำที่ยังรอ QA ตัดสิน (${potentialRecurrences.length} รายการ) กรุณาประเมินให้เสร็จสิ้นก่อนปิดเคส`
        };
      }

      // Gate 5: Required evidence/context available
      if (evaluatedResults.length === 0) {
        return {
          success: false,
          error: `Hard Closure Gate Violation: ยังไม่มีการบันทึกผลการติดตามหรือหลักฐานเชิงประจักษ์ ห้ามปิดเคสเป็น EFFECTIVE`
        };
      }

      // Gate 6: QA Conclusion completed
      if (!params.qaConclusion || params.qaConclusion.trim().length < 15) {
        return {
          success: false,
          error: `Hard Closure Gate Violation: กรุณาระบุข้อสรุปผลการประเมินประสิทธิผลโดย QA อย่างน้อย 15 ตัวอักษร`
        };
      }

      // Update Plan for EFFECTIVE
      await supabase
        .from('qms_capa_effectiveness_plans')
        .update({
          final_decision: params.decision,
          qa_conclusion: params.qaConclusion,
          supporting_evidence_summary: params.supportingEvidenceSummary,
          early_termination_reason: params.earlyTerminationReason,
          reviewer_id: params.userId,
          reviewer_name: params.userName,
          actual_review_date: new Date().toISOString(),
          status: 'REVIEWED',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.planId);

      // Close CAPA as CLOSED_EFFECTIVE
      await supabase
        .from('qms_capas')
        .update({
          current_status: 'CLOSED_EFFECTIVE',
          effectiveness_status: 'EFFECTIVE',
          closed_at: new Date().toISOString(),
          closed_by: params.userId,
          closed_by_name: params.userName,
          closure_conclusion: params.qaConclusion,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.capaId);

      // Controlled Audit Trail
      await supabase.from('qms_audit_trail').insert({
        table_name: 'qms_capas',
        record_id: params.capaId,
        action_type: 'CAPA_CLOSED_EFFECTIVE',
        record_version: 1,
        changed_by: params.userId,
        changed_by_name: params.userName,
        change_reason: `ประเมินประสิทธิผลผ่านเกณฑ์สมบูรณ์ (EFFECTIVE) — ปิดเคส CAPA อย่างเป็นทางการ (CLOSED_EFFECTIVE)`
      });

      revalidatePath('/issues');
      return { success: true, newCapaStatus: 'CLOSED_EFFECTIVE' };
    } else {
      // PARTIALLY_EFFECTIVE or NOT_EFFECTIVE: CANNOT CLOSE!
      // Require Controlled QA Follow-up Disposition
      if (!params.dispositionPaths || params.dispositionPaths.length === 0) {
        return { 
          success: false, 
          error: 'กรุณาเลือกแนวทางการพิจารณาดำเนินการต่อโดย QA (QA Follow-up Disposition) อย่างน้อย 1 ข้อ' 
        };
      }
      if (!params.dispositionRationale || params.dispositionRationale.trim().length < 15) {
        return { 
          success: false, 
          error: 'กรุณาระบุเหตุผลการพิจารณาดำเนินการต่อโดย QA (QA Disposition Rationale) อย่างน้อย 15 ตัวอักษร' 
        };
      }

      const pathsList = params.dispositionPaths || [];
      const isExtendMonitoring = pathsList.includes('EXTEND_MONITORING');

      // Update Plan with QA Disposition
      await supabase
        .from('qms_capa_effectiveness_plans')
        .update({
          final_decision: params.decision,
          qa_conclusion: params.qaConclusion,
          supporting_evidence_summary: params.supportingEvidenceSummary,
          qa_disposition_paths: pathsList,
          qa_disposition_rationale: params.dispositionRationale,
          qa_disposition_decided_by: params.userId,
          qa_disposition_decided_by_name: params.userName,
          qa_disposition_decided_at: new Date().toISOString(),
          reviewer_id: params.userId,
          reviewer_name: params.userName,
          actual_review_date: new Date().toISOString(),
          status: isExtendMonitoring ? 'MONITORING_IN_PROGRESS' : 'REVIEWED',
          scope_target_count: (isExtendMonitoring && params.extendTargetCount) ? params.extendTargetCount : plan?.scope_target_count,
          target_due_date: (isExtendMonitoring && params.extendDueDate) ? params.extendDueDate : plan?.target_due_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.planId);

      // CAPA remains open in AWAITING_EFFECTIVENESS (Controlled open state)
      // PROTECT FROZEN PHASE 3: ABSOLUTELY NO AUTO-INSERTION OF TECHNICAL ACTIONS!
      // The original approved Phase 3 implementation record remains historically intact (3/3 Verified).
      await supabase
        .from('qms_capas')
        .update({
          effectiveness_status: params.decision,
          current_status: 'AWAITING_EFFECTIVENESS',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.capaId);

      // Controlled Audit Trail
      await supabase.from('qms_audit_trail').insert({
        table_name: 'qms_capas',
        record_id: params.capaId,
        action_type: params.decision === 'PARTIALLY_EFFECTIVE' ? 'CAPA_PARTIALLY_EFFECTIVE' : 'CAPA_NOT_EFFECTIVE',
        record_version: 1,
        changed_by: params.userId,
        changed_by_name: params.userName,
        change_reason: `ผลการประเมินประสิทธิผล: ${params.decision} — การพิจารณาดำเนินการต่อโดย QA (QA Disposition): [${pathsList.join(', ')}] — เหตุผล: "${params.dispositionRationale}"`
      });

      revalidatePath('/issues');
      return { success: true, newCapaStatus: 'AWAITING_EFFECTIVENESS' };
    }
  } catch (err: any) {
    console.error('Error submitting final effectiveness decision:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 8. Create Controlled CAPA Revision
 * When QA explicitly approves ADDITIONAL_CAPA_ACTION or REVISE_CAPA,
 * this controlled function creates Revision 2+ with full governance,
 * recording revision reason, effectiveness ref, approver, and then adding
 * the human-approved Action without altering Revision 1 historical integrity.
 */
export async function createControlledCapaRevision(params: {
  capaId: string;
  planId?: string;
  revisionReason: string;
  effectivenessDecisionRef?: string;
  action: {
    actionType: QmsActionType;
    title: string;
    description: string;
    responsibleOwnerId: string;
    responsibleOwnerName: string;
    departmentName: string;
    dueDate: string;
    evidenceRequired?: string;
  };
  userId: string;
  userName: string;
  approvedBy: string;
  approvedByName: string;
}): Promise<{
  success: boolean;
  revisionNo?: number;
  newAction?: any;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // Validation
    if (!params.revisionReason || params.revisionReason.trim().length < 15) {
      return { success: false, error: 'กรุณาระบุเหตุผลการออกฉบับแก้ไขแผน CAPA (Revision Reason) อย่างน้อย 15 ตัวอักษร' };
    }
    if (!params.action?.title || params.action.title.trim().length < 5) {
      return { success: false, error: 'กรุณาระบุชื่อมาตรการที่เพิ่มใหม่อย่างน้อย 5 ตัวอักษร' };
    }
    if (!params.action?.description || params.action.description.trim().length < 10) {
      return { success: false, error: 'กรุณาระบุรายละเอียดการปฏิบัติของมาตรการใหม่อย่างน้อย 10 ตัวอักษร' };
    }
    if (!params.action?.responsibleOwnerId || !params.action?.dueDate) {
      return { success: false, error: 'กรุณาระบุผู้รับผิดชอบและกำหนดส่งของมาตรการใหม่' };
    }

    // 1. Fetch current CAPA
    const { data: capa, error: capaErr } = await supabase
      .from('qms_capas')
      .select('id, capa_no, capa_revision_version, current_status')
      .eq('id', params.capaId)
      .single();

    if (capaErr || !capa) {
      return { success: false, error: 'ไม่พบข้อมูล CAPA' };
    }

    const currentRev = capa.capa_revision_version || 1;
    const newRevisionNo = currentRev + 1;

    // 2. Insert record into qms_capa_revisions
    const { data: revisionRecord, error: revErr } = await supabase
      .from('qms_capa_revisions')
      .insert({
        capa_id: params.capaId,
        revision_no: newRevisionNo,
        revision_reason: params.revisionReason,
        effectiveness_decision_ref: params.effectivenessDecisionRef || null,
        created_by: params.userId,
        created_by_name: params.userName,
        approved_by: params.approvedBy,
        approved_by_name: params.approvedByName,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (revErr) {
      console.error('Error inserting capa revision:', revErr);
    }

    // 3. Query next action_no
    const { data: actions } = await supabase
      .from('qms_capa_actions')
      .select('action_no')
      .eq('capa_id', params.capaId)
      .order('action_no', { ascending: false })
      .limit(1);

    const nextActionNo = (actions && actions.length > 0 ? actions[0].action_no : 3) + 1;

    // 4. Insert new controlled action with revision metadata
    const { data: newAction, error: actErr } = await supabase
      .from('qms_capa_actions')
      .insert({
        capa_id: params.capaId,
        action_no: nextActionNo,
        action_type: params.action.actionType,
        title: params.action.title,
        description: params.action.description,
        responsible_owner_id: params.action.responsibleOwnerId,
        responsible_owner_name: params.action.responsibleOwnerName,
        department_name: params.action.departmentName,
        due_date: new Date(params.action.dueDate).toISOString().split('T')[0],
        original_due_date: new Date(params.action.dueDate).toISOString().split('T')[0],
        evidence_required: params.action.evidenceRequired || 'หลักฐานยืนยันผลการดำเนินการ',
        status: 'NOT_STARTED',
        created_in_revision: newRevisionNo,
        is_revision_action: true,
        effectiveness_decision_ref: params.effectivenessDecisionRef || null
      })
      .select()
      .single();

    if (actErr || !newAction) {
      return { success: false, error: actErr?.message || 'เพิ่มมาตรการในฉบับแก้ไขล้มเหลว' };
    }

    // 5. Update CAPA status to IN_PROGRESS with revision version
    await supabase
      .from('qms_capas')
      .update({
        capa_revision_version: newRevisionNo,
        last_revision_reason: params.revisionReason,
        last_revision_eff_ref: params.effectivenessDecisionRef || null,
        last_revision_at: new Date().toISOString(),
        last_revision_by: params.userId,
        last_revision_by_name: params.userName,
        current_status: 'IN_PROGRESS',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.capaId);

    // 6. Controlled Audit Trail
    await supabase.from('qms_audit_trail').insert({
      table_name: 'qms_capas',
      record_id: params.capaId,
      action_type: 'CAPA_CONTROLLED_REVISION_APPROVED',
      record_version: newRevisionNo,
      changed_by: params.userId,
      changed_by_name: params.userName,
      change_reason: `อนุมัติแผน CAPA ฉบับแก้ไขที่ ${newRevisionNo}: เพิ่มมาตรการ #${nextActionNo} ("${params.action.title}") สืบเนื่องจากผลประเมินประสิทธิผล — เหตุผล: "${params.revisionReason}" (อนุมัติโดย: ${params.approvedByName})`
    });

    revalidatePath('/issues');
    return { success: true, revisionNo: newRevisionNo, newAction };
  } catch (err: any) {
    console.error('Error creating controlled CAPA revision:', err);
    return { success: false, error: err.message };
  }
}
