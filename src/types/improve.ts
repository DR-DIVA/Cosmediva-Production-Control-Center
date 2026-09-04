export type WasteType = 'LEAN_8_WASTE' | 'FACTORY_GAP';

export interface WasteCategory {
  id: string;
  code: string;
  name_en: string;
  name_th: string;
  type: WasteType;
  description: string;
  color_code: string;
  is_active: boolean;
}

export type ObservationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ObservationStatus = 
  | 'CAPTURED' 
  | 'AI_ANALYZED' 
  | 'HUMAN_REVIEW' 
  | 'VALIDATED' 
  | 'ASSIGNED' 
  | 'IMPROVEMENT_CREATED' 
  | 'VERIFIED' 
  | 'STANDARDIZED' 
  | 'CLOSED' 
  | 'REJECTED' 
  | 'DUPLICATE' 
  | 'ON_HOLD' 
  | 'ESCALATED';

export interface ImproveObservation {
  id: string;
  observation_no: string;
  date_time: string;
  shift: string;
  site_id?: string;
  department_id?: string;
  room_id?: string;
  line_id?: string;
  station_id?: string;
  sku?: string;
  product_name?: string;
  lot_no?: string;
  work_order?: string;
  process_id?: string;
  activity_name?: string;
  machine_code?: string;
  team_name?: string;
  description: string;
  severity: ObservationSeverity;
  status: ObservationStatus;
  quality_risk: boolean;
  gmp_risk: boolean;
  safety_risk: boolean;
  skill_gap: boolean;
  standard_gap: boolean;
  need_escalation: boolean;
  estimated_monthly_loss: number;
  estimated_annual_loss: number;
  potential_saving: number;
  observer_id?: string;
  observer_name?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  
  // Relational joins
  departments?: { id: string; department_name: string; department_code: string };
  improve_lines?: { id: string; line_name: string; line_code: string };
  improve_stations?: { id: string; station_name: string; station_code: string };
  media?: ImproveMedia[];
  ai_analysis?: ImproveAiAnalysis[];
  human_validation?: ImproveHumanValidation;
  loss_calculation?: ImproveLossCalculation;
}

export interface ImproveMedia {
  id: string;
  observation_id: string;
  media_type: 'PHOTO' | 'VIDEO' | 'VOICE' | 'DOCUMENT';
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  duration_sec?: number;
  transcription?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface ImproveAiAnalysis {
  id: string;
  observation_id: string;
  agent_type: 'GEMBA_AI' | 'IE_AI' | 'ROOT_CAUSE_AI' | 'QUALITY_GMP_GATE' | 'COST_AI' | 'TRAINING_AI' | 'MANAGEMENT_AI';
  model_name: string;
  prompt_version: string;
  finding_title: string;
  observed_condition: string;
  primary_waste: string;
  secondary_waste?: string;
  potential_root_cause?: string;
  quality_risk_assessment?: string;
  gmp_risk_assessment?: string;
  safety_risk_assessment?: string;
  skill_gap_analysis?: string;
  standard_work_gap_analysis?: string;
  recommended_next_step: string;
  suggested_owner_dept?: string;
  potential_cost_driver?: string;
  gate_status?: 'PASS' | 'PASS_WITH_CONDITIONS' | 'QA_REVIEW_REQUIRED' | 'BLOCK';
  confidence_score: number;
  raw_output?: any;
  created_at: string;
}

export interface ImproveHumanValidation {
  id: string;
  observation_id: string;
  ai_analysis_id?: string;
  decision: 'ACCEPTED' | 'EDITED' | 'REJECTED';
  confirmed_primary_waste?: string;
  confirmed_secondary_waste?: string;
  confirmed_root_cause?: string;
  confirmed_severity?: string;
  confirmed_quality_risk: boolean;
  confirmed_gmp_risk: boolean;
  confirmed_safety_risk: boolean;
  confirmed_skill_gap: boolean;
  confirmed_standard_gap: boolean;
  reviewer_id?: string;
  reviewer_name?: string;
  reviewer_comment?: string;
  confirmed_at: string;
}

export interface ImproveLossCalculation {
  id: string;
  observation_id: string;
  loss_type: 'LABOR_LOSS' | 'OVERTIME' | 'SCRAP' | 'REWORK' | 'DOWNTIME' | 'OPPORTUNITY';
  lost_minutes_per_occ: number;
  frequency_per_shift: number;
  shifts_per_day: number;
  working_days_per_month: number;
  number_of_people: number;
  labor_cost_rate: number;
  lost_hours_per_month: number;
  monthly_loss_thb: number;
  annual_loss_thb: number;
  assumptions?: string;
  cost_rate_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ImproveProject {
  id: string;
  project_no: string;
  title: string;
  problem_statement: string;
  department_id?: string;
  line_id?: string;
  station_id?: string;
  owner_name: string;
  sponsor_name?: string;
  cost_validator_name?: string;
  qa_validator_name?: string;
  start_date: string;
  target_date?: string;
  completion_date?: string;
  pdca_stage: 'PLAN' | 'DO' | 'CHECK' | 'ACT';
  status: 'DRAFT' | 'IN_PROGRESS' | 'TRIAL' | 'VERIFIED' | 'STANDARDIZED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  baseline_summary?: string;
  target_summary?: string;
  expected_annual_saving: number;
  calculated_saving: number;
  productivity_gain_pct: number;
  released_capacity_hours: number;
  finance_validated_hard_saving: number;
  finance_validated_by?: string;
  finance_validated_at?: string;
  quality_gate_status: 'PENDING' | 'PASS' | 'CONDITIONAL' | 'QA_REVIEW_REQUIRED' | 'BLOCKED';
  qa_signed_by?: string;
  qa_signed_at?: string;
  qa_comment?: string;
  lessons_learned?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  departments?: { department_name: string; department_code: string };
  improve_lines?: { line_name: string; line_code: string };
  improve_stations?: { station_name: string; station_code: string };
  before_after?: ImproveBeforeAfter[];
}

export interface ImproveBeforeAfter {
  id: string;
  project_id: string;
  metric_name: string;
  unit: string;
  before_value: number;
  after_value: number;
  higher_is_better: boolean;
  improvement_pct: number;
  before_media_url?: string;
  after_media_url?: string;
  notes?: string;
}

export interface ImproveCostRate {
  id: string;
  rate_code: string;
  rate_name: string;
  rate_type: 'LABOR' | 'OT' | 'MACHINE' | 'ENERGY' | 'SCRAP' | 'REWORK';
  amount_thb: number;
  unit: string;
  effective_from: string;
  effective_to?: string;
  version: number;
  notes?: string;
}

export interface ImproveStandardWork {
  id: string;
  project_id?: string;
  doc_no: string;
  title: string;
  doc_type: 'SOP' | 'WI' | 'OPL' | 'CHECKLIST';
  department_id?: string;
  revision: string;
  effective_date: string;
  owner_name: string;
  qa_approver_name?: string;
  status: 'DRAFT' | 'PENDING_QA' | 'APPROVED' | 'OBSOLETE';
  steps_summary?: Array<{ step: number; action: string; time_sec?: number; type?: 'VA' | 'NNVA' | 'WASTE' }>;
  critical_quality_points?: string;
  safety_points?: string;
  common_mistakes?: string;
  created_at: string;
  departments?: { department_name: string; department_code: string };
  opls?: ImproveOpl[];
}

export interface ImproveOpl {
  id: string;
  standard_work_id?: string;
  opl_no: string;
  topic: string;
  why_important?: string;
  wrong_method_description?: string;
  wrong_method_image_url?: string;
  correct_method_description?: string;
  correct_method_image_url?: string;
  stop_call_wait_rule?: string;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  created_at: string;
}

export interface ImproveSkill {
  id: string;
  skill_code: string;
  skill_name: string;
  department_id?: string;
  category: 'OPERATION' | 'TECHNICAL' | 'MACHINE' | 'QUALITY' | 'LEAN_IE' | 'SAFETY';
  description?: string;
  is_active: boolean;
  department_name?: string;
}

export interface ImproveEmployeeSkill {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name?: string;
  skill_id: string;
  skill_code?: string;
  skill_name?: string;
  category?: string;
  current_level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  required_level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  updated_at: string;
}

export interface ImproveTrainingNeed {
  id: string;
  observation_id?: string;
  project_id?: string;
  training_topic: string;
  target_department?: string;
  trainer_name?: string;
  target_date?: string;
  completion_date?: string;
  status: 'IDENTIFIED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}
