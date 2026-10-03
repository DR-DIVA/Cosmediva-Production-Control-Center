export type QmsSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export type QmsRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type QmsWorkflowPath = 'FAST_TRACK' | 'STANDARD' | 'FULL_CAPA' | 'FULL_INVESTIGATION';

export interface QmsInitialImpactAssessment {
  product_quality: 'YES' | 'NO' | 'UNKNOWN';
  consumer_safety: 'YES' | 'NO' | 'UNKNOWN';
  regulatory_labeling: 'YES' | 'NO' | 'UNKNOWN';
  gmp_compliance: 'YES' | 'NO' | 'UNKNOWN';
  customer_requirement: 'YES' | 'NO' | 'UNKNOWN';
  production_batch: 'YES' | 'NO' | 'UNKNOWN';
  other_batch_market: 'YES' | 'NO' | 'UNKNOWN';
}

export type QmsDestinationMarket = 
  | 'DOMESTIC_TH'
  | 'USA_MOCRA'
  | 'UAE_GSO'
  | 'CAMBODIA_CLMV'
  | 'EXPORT_OTHER';

export type QmsEventType = 
  | 'DEVIATION'
  | 'NCR'
  | 'OOS'
  | 'OOT'
  | 'COMPLAINT'
  | 'SUPPLIER_ISSUE'
  | 'AUDIT_FINDING'
  | 'GMP_OBSERVATION'
  | 'EQUIPMENT_ISSUE'
  | 'DOCUMENTATION_ISSUE'
  | 'ENVIRONMENTAL_ISSUE';

export type QmsEventStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_QA_REVIEW'
  | 'CONTAINMENT_ACTIVE'
  | 'DIRECT_CORRECTION'
  | 'INVESTIGATION_PENDING'
  | 'INVESTIGATING'
  | 'CAPA_PENDING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'VOIDED';

export type QmsContainmentActionType = 
  | 'HOLD_LOT'
  | 'HOLD_MATERIAL'
  | 'STOP_LINE'
  | 'QUARANTINE_AREA'
  | 'SEGREGATE_STOCK'
  | 'INCREASE_INSPECTION';

export type QmsContainmentStatus = 
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'CONTAINED'
  | 'VERIFIED';

export interface QmsSnapshotContextV1 {
  schema_version: '1.0';
  captured_at: string;
  reporter: {
    user_id: string;
    employee_code?: string;
    full_name: string;
    role_title?: string;
  };
  organization: {
    department_code?: string;
    department_name?: string;
    room_code?: string;
    room_name?: string;
    machine_code?: string;
    room_type?: string;
  };
  manufacturing_context: {
    is_batch_related: boolean;
    product?: {
      product_id?: string;
      sku?: string;
      product_name?: string;
      product_size?: string;
      standard_batch_size?: number;
      default_unit?: string;
    } | null;
    production_lot?: {
      lot_id?: string;
      lot_no?: string;
      po_no?: string;
      order_no?: string;
      batch_size_kg?: number;
      planned_quantity?: number;
      customer_name?: string;
    } | null;
    material?: {
      material_type: string;
      material_lot_no?: string;
      supplier_name?: string;
    } | null;
  };
}

export interface QmsQualityEvent {
  id: string;
  event_no: string;
  event_date: string;
  reported_by: string;
  reporter_name?: string;
  department_id?: string;
  room_id?: string;
  process_id?: string;
  product_id?: string;
  production_lot_id?: string;
  material_type: 'RM' | 'PM' | 'BULK' | 'FG' | 'ENV' | 'EQUIP' | 'NONE';
  material_lot_no?: string;
  supplier_name?: string;
  equipment_code?: string;
  destination_market: QmsDestinationMarket;
  snapshot_context: QmsSnapshotContextV1;
  title: string;
  description: string;
  expected_condition?: string;
  actual_condition?: string;
  immediate_action_taken?: string;
  quantity_affected?: number;
  quantity_unit?: string;
  
  ai_suggested_type?: string;
  ai_suggested_severity?: QmsSeverity;
  ai_suggested_risk?: QmsRiskLevel;
  ai_confidence_score?: number;
  ai_rationale?: string;

  qa_confirmed_type?: QmsEventType;
  qa_confirmed_severity?: QmsSeverity;
  risk_level: QmsRiskLevel;
  workflow_path: QmsWorkflowPath;
  qa_classification_notes?: string;
  qa_classified_by?: string;
  containment_required: boolean;
  containment_status: QmsContainmentStatus;
  containment_types?: string[];

  initial_impact_assessment?: QmsInitialImpactAssessment;

  current_status: QmsEventStatus;
  attachment_urls: { name: string; url: string; uploaded_at?: string }[];

  correction_notes?: string;
  correction_evidence_url?: string;

  qa_closure_notes?: string;
  qa_closed_by?: string;
  qa_closed_at?: string;

  reopen_reason?: string;
  reopened_by?: string;
  reopened_at?: string;

  record_version: number;
  created_at: string;
  updated_at: string;
}

export interface QmsContainmentAction {
  id: string;
  quality_event_id: string;
  action_type: QmsContainmentActionType;
  item_reference: string;
  action_description: string;
  assigned_to: string;
  assigned_to_name?: string;
  department_id?: string;
  due_date: string;
  status: 'PENDING' | 'EXECUTED' | 'VERIFIED' | 'RELEASED';
  executed_at?: string;
  execution_notes?: string;
  evidence_attachment_url?: string;
  qa_verified_by?: string;
  qa_verified_by_name?: string;
  qa_verified_at?: string;
  created_at: string;
}

export interface QmsElectronicSignature {
  id: string;
  entity_type: string;
  entity_id: string;
  signer_user_id: string;
  signer_name: string;
  signer_role: string;
  signature_meaning: 
    | 'AUTHOR_SUBMISSION'
    | 'QA_TRIAGE'
    | 'CONTAINMENT_VERIFY'
    | 'FAST_CLOSE'
    | 'RCA_APPROVAL'
    | 'CAPA_PLAN_APPROVAL'
    | 'FINAL_CLOSURE'
    | 'REOPEN_AUTHORIZATION';
  signature_timestamp: string;
  record_version: number;
  reason_comment?: string;
}

export interface QmsAuditTrail {
  id: string;
  table_name: string;
  record_id: string;
  action_type: string;
  record_version: number;
  before_value?: any;
  after_value?: any;
  changed_fields?: string[];
  changed_by?: string;
  changed_by_name?: string;
  changed_by_role?: string;
  change_reason?: string;
  created_at: string;
}

export interface QmsInAppNotification {
  id: string;
  recipient_user_id: string;
  recipient_role?: string;
  event_severity: QmsSeverity;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  link_url: string;
  is_read: boolean;
  read_at?: string;
  requires_acknowledgement: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  acknowledged_by_name?: string;
  escalation_level: number;
  channels_dispatched?: Record<string, boolean>;
  created_at: string;
}

// ==========================================
// MICRO-SPRINT 2: INVESTIGATION & RCA TYPES
// ==========================================

export type QmsInvestigationStatus =
  | 'NOT_STARTED'
  | 'IN_INVESTIGATION'
  | 'WAITING_INFORMATION'
  | 'RCA_DRAFT'
  | 'QA_REVIEW'
  | 'COMPLETED';

export interface QmsInvestigationQuestionFramework {
  what_happened: string;
  what_should_have_happened: string;
  confirmed_gap: string;
  when_occurred: string;
  where_occurred: string;
  when_detected: string;
  who_process_involved: string;
  quantity_batches_affected: string;
  what_changed_before_event: string;
  has_happened_before: boolean;
  recurrence_details: string;
  missing_information: string;
}

export type QmsRcaTool = '5_WHY' | 'FISHBONE_6M' | 'SIMPLE_STATEMENT';

export interface QmsFiveWhyItem {
  why_number: number;
  cause: string;
  explanation?: string;
}

export interface QmsFishbone6M {
  man: string[];
  machine: string[];
  material: string[];
  method: string[];
  measurement: string[];
  environment: string[];
}

export type QmsRootCauseCategory =
  | 'MAN'
  | 'MACHINE'
  | 'MATERIAL'
  | 'METHOD'
  | 'MEASUREMENT'
  | 'ENVIRONMENT'
  | 'SUPPLIER'
  | 'DOCUMENTATION'
  | 'TRAINING'
  | 'PROCESS_DESIGN'
  | 'SYSTEM_MANAGEMENT'
  | 'ROOT_CAUSE_NOT_CONFIRMED';

export interface QmsSystemicCauseAssessment {
  is_evaluated: boolean;
  training_adequate: boolean | 'NA';
  sop_clarity_adequate: boolean | 'NA';
  workload_reasonable: boolean | 'NA';
  equipment_interface_clear: boolean | 'NA';
  ergonomics_suitable: boolean | 'NA';
  process_design_robust: boolean | 'NA';
  supervision_adequate: boolean | 'NA';
  environment_suitable: boolean | 'NA';
  system_controls_sufficient: boolean | 'NA';
  poka_yoke_present?: boolean | 'NA';
  maintenance_preventive_adhered?: boolean | 'NA';
  systemic_findings: string;
  operator_error_justification?: string;
}

export type QmsEvidenceType =
  | 'PHOTO'
  | 'DOCUMENT'
  | 'QC_RESULT'
  | 'SPECIFICATION'
  | 'SOP_WI'
  | 'BATCH_RECORD'
  | 'MATERIAL_INFO'
  | 'SUPPLIER_INFO'
  | 'EQUIPMENT_INFO'
  | 'TRAINING_RECORD'
  | 'OTHER';

export interface QmsInvestigationEvidence {
  id: string;
  investigation_id: string;
  evidence_type: QmsEvidenceType;
  title: string;
  description?: string;
  source?: string;
  file_url?: string;
  file_name?: string;
  relationship_to_investigation?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at: string;
}

export type QmsTimelineMilestoneType =
  | 'MATERIAL_RECEIVED'
  | 'PRODUCTION_START'
  | 'MIXING_START'
  | 'QC_BULK'
  | 'FILLING_START'
  | 'PROBLEM_DETECTED'
  | 'PRODUCTION_STOPPED'
  | 'BATCH_HELD'
  | 'QA_NOTIFIED'
  | 'INVESTIGATION_START'
  | 'OTHER';

export interface QmsInvestigationTimelineEvent {
  id: string;
  investigation_id: string;
  event_timestamp: string;
  event_title: string;
  event_description?: string;
  event_source: 'SYSTEM' | 'MANUAL' | 'LOG' | 'QC';
  milestone_type?: QmsTimelineMilestoneType;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface QmsInvestigation {
  id: string;
  investigation_no: string;
  quality_event_id: string;
  assigned_lead_id?: string;
  assigned_lead_name?: string;
  department_id?: string;
  target_due_date: string;
  current_status: QmsInvestigationStatus;
  started_at?: string;
  completed_at?: string;
  question_framework: QmsInvestigationQuestionFramework;
  rca_tool: QmsRcaTool;
  five_whys: QmsFiveWhyItem[];
  fishbone_6m: QmsFishbone6M;
  simple_root_cause_statement?: string;
  is_root_cause_confirmed: boolean;
  root_cause_category?: QmsRootCauseCategory;
  root_cause_summary?: string;
  unconfirmed_justification?: string;
  systemic_cause_assessment: QmsSystemicCauseAssessment;
  immediate_correction_description?: string;
  immediate_correction_completed: boolean;
  immediate_correction_verified_by?: string;
  capa_required?: boolean;
  capa_system_recommendation?: 'YES' | 'NO';
  capa_recommendation_rationale?: string;
  capa_decision_justification?: string;
  capa_decided_by?: string;
  capa_decided_by_name?: string;
  capa_decided_at?: string;
  investigation_summary?: string;
  qa_review_notes?: string;
  qa_approved_by?: string;
  qa_approved_by_name?: string;
  qa_approved_at?: string;
  return_reason?: string;
  record_version: number;
  created_at: string;
  updated_at: string;
  quality_event?: QmsQualityEvent;
  evidence_list?: QmsInvestigationEvidence[];
  timeline_events?: QmsInvestigationTimelineEvent[];
  qa_confirmed_related_event_ids?: string[];
}

export interface QmsSimilarEventItem extends QmsQualityEvent {
  matching_dimensions: string[];
  relevance_score: 'HIGH' | 'MEDIUM' | 'LOW';
  match_count: number;
  is_confirmed_related?: boolean;
}

// ==========================================
// PHASE 3: CAPA & ACTION MANAGEMENT TYPES
// ==========================================

export type QmsCapaStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'ACTION_PENDING'
  | 'ALL_ACTIONS_COMPLETED'
  | 'AWAITING_EFFECTIVENESS'
  | 'CLOSED'
  | 'CLOSED_EFFECTIVE'
  | 'REOPENED_FOR_ACTION';

export type QmsCapaPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type QmsActionType =
  | 'CORRECTION'
  | 'CORRECTIVE_ACTION'
  | 'PREVENTIVE_IMPROVEMENT';

export type QmsActionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'RETURNED';

export type QmsCapaEvidenceType =
  | 'PHOTO'
  | 'REVISED_SOP_WI'
  | 'TRAINING_RECORD'
  | 'MAINTENANCE_RECORD'
  | 'QC_RESULT'
  | 'SPECIFICATION'
  | 'SUPPLIER_DOCUMENT'
  | 'PROCESS_RECORD'
  | 'OTHER';

export interface QmsCapaEvidence {
  id: string;
  capa_id: string;
  action_id?: string;
  evidence_type: QmsCapaEvidenceType;
  title: string;
  description?: string;
  source?: string;
  file_url?: string;
  file_name?: string;
  linked_record_type?: string;
  linked_record_id?: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface QmsCapaActionExtension {
  id: string;
  action_id: string;
  original_due_date: string;
  new_due_date: string;
  extension_reason: string;
  requested_by: string;
  requested_by_name: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  created_at: string;
}

export interface QmsCapaAction {
  id: string;
  capa_id: string;
  action_no: number;
  action_type: QmsActionType;
  title: string;
  description: string;
  responsible_owner_id: string;
  responsible_owner_name: string;
  department_id?: string;
  department_name: string;
  due_date: string;
  original_due_date: string;
  status: QmsActionStatus;
  evidence_required?: string;
  implementation_notes?: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  verification_decision?: 'VERIFIED' | 'RETURN_FOR_CORRECTION';
  verified_at?: string;
  verified_by?: string;
  verified_by_name?: string;
  verification_comment?: string;
  return_reason?: string;
  returned_at?: string;
  returned_by?: string;
  returned_by_name?: string;
  created_in_revision?: number;
  is_revision_action?: boolean;
  effectiveness_decision_ref?: string;
  record_version: number;
  created_at: string;
  updated_at: string;
  extensions?: QmsCapaActionExtension[];
  evidence_list?: QmsCapaEvidence[];
  capa?: { capa_no: string; title: string; priority: QmsCapaPriority };
}

export interface QmsCapa {
  id: string;
  capa_no: string;
  quality_event_id: string;
  investigation_id: string;
  title: string;
  problem_statement: string;
  root_cause_summary: string;
  root_cause_category?: QmsRootCauseCategory;
  capa_owner_id: string;
  capa_owner_name: string;
  department_id?: string;
  department_name?: string;
  priority: QmsCapaPriority;
  target_due_date: string;
  original_due_date: string;
  current_status: QmsCapaStatus;
  correction_plan?: string;
  corrective_action_plan?: string;
  preventive_improvement_plan?: string;
  qa_coordinator_id?: string;
  qa_coordinator_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  snapshot_context?: any;
  capa_revision_version?: number;
  last_revision_reason?: string;
  last_revision_eff_ref?: string;
  last_revision_at?: string;
  last_revision_by?: string;
  last_revision_by_name?: string;
  record_version: number;
  effectiveness_status?: QmsEffectivenessStatus;
  closed_at?: string;
  closed_by?: string;
  closed_by_name?: string;
  closure_conclusion?: string;
  created_at: string;
  updated_at: string;
  actions?: QmsCapaAction[];
  evidence_list?: QmsCapaEvidence[];
  effectiveness_plan?: QmsCapaEffectivenessPlan;
  quality_event?: QmsQualityEvent;
  investigation?: QmsInvestigation;
}

export interface QmsMyCapaWorkSummary {
  my_open_actions_count: number;
  due_soon_count: number;
  overdue_count: number;
  waiting_qa_verification_count: number;
  returned_to_me_count: number;
  my_actions: QmsCapaAction[];
}

// ==========================================
// PHASE 4: EFFECTIVENESS & RECURRENCE MONITORING TYPES
// ==========================================

export type QmsEffectivenessStatus =
  | 'NOT_STARTED'
  | 'PLAN_DEFINED'
  | 'MONITORING_IN_PROGRESS'
  | 'MONITORING_COMPLETED'
  | 'REVIEW_IN_PROGRESS'
  | 'EFFECTIVE'
  | 'PARTIALLY_EFFECTIVE'
  | 'NOT_EFFECTIVE';

export type QmsEffectivenessScopeType =
  | 'CONSECUTIVE_BATCHES'
  | 'TIME_PERIOD'
  | 'OCCURRENCES_COUNT'
  | 'PRODUCTION_RUNS'
  | 'INSPECTION_SAMPLES'
  | 'OTHER';

export type QmsEffectivenessDecision =
  | 'EFFECTIVE'
  | 'PARTIALLY_EFFECTIVE'
  | 'NOT_EFFECTIVE';

export type QmsEffectivenessCriterionType =
  | 'QC_SPEC_RESULT'
  | 'BATCH_COUNT'
  | 'DEFECT_RATE'
  | 'EVENT_RECURRENCE'
  | 'COMPLAINT_RECURRENCE'
  | 'PROCESS_PARAMETER'
  | 'EQUIPMENT_CALIBRATION'
  | 'AUDIT_FINDING'
  | 'TRAINING_COMPETENCY'
  | 'SUPPLIER_PERFORMANCE'
  | 'OTHER';

export type QmsCriterionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'WAIVED';

export type QmsResultSource = 'LINKED_SYSTEM' | 'MANUAL_ENTRY';

export type QmsEvaluationStatus = 'PENDING' | 'PASS' | 'FAIL';

export type QmsRecurrenceReviewStatus =
  | 'POTENTIAL_RECURRENCE'
  | 'CONFIRMED_RECURRENCE'
  | 'REJECTED_RECURRENCE';

export interface QmsCapaEffectivenessCriterion {
  id: string;
  plan_id: string;
  capa_id: string;
  criterion_no: number;
  criterion_type: QmsEffectivenessCriterionType;
  title: string;
  description?: string;
  measurable_target: string;
  status: QmsCriterionStatus;
  created_at: string;
  updated_at: string;
}

export interface QmsCapaEffectivenessResult {
  id: string;
  plan_id: string;
  criterion_id?: string;
  capa_id: string;
  sample_no: number;
  batch_lot_no?: string;
  production_date?: string;
  result_source: QmsResultSource;
  linked_record_type?: string;
  linked_record_id?: string;
  linked_record_ref?: string;
  measured_value?: string;
  specification_target?: string;
  evaluation_status: QmsEvaluationStatus;
  evidence_url?: string;
  notes?: string;
  evaluated_by?: string;
  evaluated_by_name?: string;
  evaluated_at?: string;
  created_at: string;
}

export interface QmsCapaRecurrenceReview {
  id: string;
  capa_id: string;
  plan_id?: string;
  related_event_id: string;
  matching_dimension?: string;
  system_detected_at: string;
  review_status: QmsRecurrenceReviewStatus;
  qa_decision_notes?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
  related_event?: QmsQualityEvent;
}

// QA Follow-up Disposition Paths for PARTIALLY_EFFECTIVE and NOT_EFFECTIVE
export type QmsQaDispositionPath =
  | 'ADDITIONAL_CAPA_ACTION'       // A. เพิ่มมาตรการใน CAPA เดิม
  | 'REVISE_CAPA'                  // B. ทบทวน/ปรับแผน CAPA
  | 'ADDITIONAL_INVESTIGATION'     // C. เปิดการสอบสวนเพิ่มเติม
  | 'REASSESS_ROOT_CAUSE'          // D. ทบทวน Root Cause เดิม
  | 'EXTEND_MONITORING'            // E. ขยายขอบเขต/ระยะเวลาติดตามประสิทธิผล
  | 'OTHER_CONTROLLED_ACTION';     // F. แนวทางอื่นพร้อมเหตุผล

export interface QmsCapaRevision {
  id: string;
  capa_id: string;
  revision_no: number;
  revision_reason: string;
  effectiveness_decision_ref?: string;
  created_by: string;
  created_by_name: string;
  approved_by: string;
  approved_by_name: string;
  created_at: string;
}

export interface QmsCapaEffectivenessPlan {
  id: string;
  capa_id: string;
  plan_no: string;
  title: string;
  objective?: string;
  scope_type: QmsEffectivenessScopeType;
  scope_target_count: number;
  scope_description?: string;
  start_date?: string;
  target_due_date: string;
  actual_review_date?: string;
  responsible_owner_id: string;
  responsible_owner_name: string;
  reviewer_id?: string;
  reviewer_name?: string;
  status: 'PLANNED' | 'MONITORING_IN_PROGRESS' | 'MONITORING_COMPLETED' | 'REVIEWED';
  final_decision?: QmsEffectivenessDecision;
  qa_conclusion?: string;
  supporting_evidence_summary?: string;
  additional_actions_required?: boolean;
  additional_actions_description?: string;
  early_termination_reason?: string;
  qa_disposition_paths?: QmsQaDispositionPath[];
  qa_disposition_rationale?: string;
  qa_disposition_decided_by?: string;
  qa_disposition_decided_by_name?: string;
  qa_disposition_decided_at?: string;
  record_version: number;
  created_at: string;
  updated_at: string;
  criteria?: QmsCapaEffectivenessCriterion[];
  results?: QmsCapaEffectivenessResult[];
  recurrence_reviews?: QmsCapaRecurrenceReview[];
}

export interface QmsEffectivenessWorkspaceData {
  capa: QmsCapa;
  plan: QmsCapaEffectivenessPlan | null;
  criteria: QmsCapaEffectivenessCriterion[];
  results: QmsCapaEffectivenessResult[];
  recurrence_reviews: QmsCapaRecurrenceReview[];
  revisions?: QmsCapaRevision[];
  audit_trail: QmsAuditTrail[];
  summary: {
    total_criteria: number;
    passed_criteria: number;
    failed_criteria: number;
    total_samples_planned: number;
    samples_evaluated: number;
    samples_passed: number;
    samples_failed: number;
    potential_recurrences_count: number;
    confirmed_recurrences_count: number;
    is_ready_for_review: boolean;
  };
}

// ==========================================
// PHASE 5: BATCH QA REVIEW & RELEASE COCKPIT TYPES
// ==========================================

export type QmsBatchReleaseStatus =
  | 'WAITING_FOR_RESULT'
  | 'BLOCKED'
  | 'READY_FOR_QA_REVIEW'
  | 'QA_ON_HOLD'
  | 'QA_RELEASED'
  | 'QA_REJECTED';

export type QmsGateRequirementLevel = 'REQUIRED' | 'CONDITIONAL' | 'NOT_APPLICABLE';

export type QmsGateEvaluationStatus = 'PENDING' | 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'UNDER_REVIEW';

export type QmsReleaseDispositionDecision = 'QA_RELEASED' | 'QA_ON_HOLD' | 'QA_REJECTED';

export type QmsNonConformanceDisposition = 
  | 'REWORK_CONSIDERATION'
  | 'SUPPLIER_RETURN'
  | 'DESTRUCTION_CONSIDERATION'
  | 'OTHER_AUTHORIZED';

export interface QmsReleaseTemplate {
  id: string;
  template_code: string;
  template_name: string;
  product_category: string;
  standard_yield_min_pct: number;
  standard_yield_max_pct: number;
  yield_spec_reference: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  version: number;
  gates?: QmsReleaseTemplateGate[];
}

export interface QmsReleaseTemplateGate {
  id: string;
  template_id: string;
  gate_number: number;
  gate_code: string;
  gate_title_th: string;
  gate_title_en: string;
  requirement_level: QmsGateRequirementLevel;
  default_na_justification?: string;
  source_entity?: string;
  evaluation_type?: string;
}

export interface QmsBatchReleaseGateEvaluation {
  id: string;
  batch_release_id: string;
  gate_number: number;
  gate_code: string;
  gate_title_th: string;
  gate_title_en: string;
  requirement_level: QmsGateRequirementLevel;
  status: QmsGateEvaluationStatus;
  is_hard_block: boolean;
  hard_block_message?: string;
  na_reason?: string;
  source_entity?: string;
  source_record_id?: string;
  source_status?: string;
  source_last_updated?: string;
  responsible_function?: string;
  linked_data?: Record<string, any>;
  qa_comment?: string;
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: string;
}

export interface QmsBatchReleaseDisposition {
  id: string;
  batch_release_id: string;
  decision: QmsReleaseDispositionDecision;
  reason_rationale: string;
  non_conformance_disposition?: QmsNonConformanceDisposition;
  rework_protocol_reference?: string;
  authorized_by: string;
  authorized_by_name: string;
  authorized_by_role: string;
  authorized_at: string;
  lot_state_before?: string;
  lot_state_after?: string;
  record_version: number;
}

export interface QmsBatchRelease {
  id: string;
  release_no: string;
  production_lot_id: string;
  lot_no: string;
  sku_id?: string;
  sku_code?: string;
  product_name?: string;
  batch_size_kg?: number;
  planned_quantity?: number;
  actual_quantity?: number;
  unit?: string;
  template_id?: string;
  template?: QmsReleaseTemplate;
  overall_status: QmsBatchReleaseStatus;
  is_blocked: boolean;
  blocking_reasons: { gate_code: string; gate_title: string; reason: string; severity?: string; link_id?: string }[];
  total_gates_count: number;
  passed_gates_count: number;
  na_gates_count: number;
  pending_gates_count: number;
  failed_gates_count: number;
  open_capa_count: number;
  capa_impact_reviewed: boolean;
  capa_impact_notes?: string;
  capa_impact_reviewed_by?: string;
  capa_impact_reviewed_by_name?: string;
  capa_impact_reviewed_at?: string;
  yield_actual_pct?: number;
  yield_spec_min_pct?: number;
  yield_spec_max_pct?: number;
  yield_status?: string;
  micro_method_code?: string;
  micro_status?: string;
  coa_status?: 'NOT_GENERATED' | 'DRAFT' | 'APPROVED';
  coa_data?: any;
  coa_approved_at?: string;
  coa_approved_by?: string;
  coa_approved_by_name?: string;
  current_disposition?: QmsReleaseDispositionDecision;
  disposition_notes?: string;
  disposition_at?: string;
  disposition_by?: string;
  disposition_by_name?: string;
  disposition_by_role?: string;
  released_at?: string;
  released_by?: string;
  released_by_name?: string;
  non_conformance_path?: QmsNonConformanceDisposition;
  rework_protocol_no?: string;
  record_version: number;
  created_at: string;
  updated_at: string;
  gate_evaluations?: QmsBatchReleaseGateEvaluation[];
  dispositions?: QmsBatchReleaseDisposition[];
  associated_events?: QmsQualityEvent[];
  associated_capas?: QmsCapa[];
}

export interface QmsBatchReleaseCockpitData {
  release: QmsBatchRelease;
  lot: any;
  product: any;
  template: QmsReleaseTemplate;
  gate_evaluations: QmsBatchReleaseGateEvaluation[];
  dispositions: QmsBatchReleaseDisposition[];
  associated_events: QmsQualityEvent[];
  associated_capas: QmsCapa[];
  audit_trail: QmsAuditTrail[];
}



