// Phase 6 Quality Intelligence & Executive Dashboard Types

export type QmsDateRangeFilter = '30d' | '90d' | '180d' | '365d' | 'all' | 'custom' | 'last_10_batches' | 'last_25_batches';

export interface QmsAnalyticsFilterOptions {
  dateRange: QmsDateRangeFilter;
  customStartDate?: string;
  customEndDate?: string;
  departmentId?: string;
  lineId?: string;
  productSku?: string;
}

export type QmsHealthBand = 'EXCELLENT' | 'CONTROLLED' | 'ELEVATED_RISK' | 'CRITICAL_ALERT' | 'EXECUTIVE_ATTENTION_REQUIRED';

export interface QmsDeductionSourceRecord {
  id: string;
  recordNo: string;
  title?: string;
  targetTab: string;
  filter?: Record<string, any>;
}

export interface QmsDeductionLineItem {
  id: string;
  order: number;
  titleTh: string;
  titleEn: string;
  timeWindow: 'CURRENT ACTIVE STATE' | 'LAST 90 DAYS' | 'LAST 30 DAYS' | 'CURRENT ACTIVE & LAST 30 DAYS' | string;
  count: number;
  weight: number;
  deduction: number; // raw negative deduction (e.g. -15)
  sourceRecordIds: string[];
  sourceRecords: QmsDeductionSourceRecord[];
  calculationRule: string;
}

export interface QmsTopDriverItem {
  rank: number;
  title: string;
  titleTh: string;
  count: number;
  impactPoints: number;
  timeWindow: string;
  targetTab: string;
  filter?: Record<string, any>;
  sourceRecordNos: string[];
}

export interface QmsRiskDomainSubItem {
  id: string;
  labelTh: string;
  labelEn: string;
  count: number;
  weight: number;
  rawPoints: number;
  timeWindow: string;
  sourceRecordIds: string[];
  sourceRecords: QmsDeductionSourceRecord[];
  calculationRule: string;
}

export interface QmsRiskDomainScore {
  domainId:
    | 'DOMAIN_1_CRITICAL'
    | 'DOMAIN_2_MAJOR'
    | 'DOMAIN_3_CAPA_INV'
    | 'DOMAIN_4_RECURRENCE'
    | 'DOMAIN_5_BATCH_DISPOSITION'
    | 'DOMAIN_6_RELEASE_PERF';
  order: number;
  titleTh: string;
  titleEn: string;
  maxCap: number; // 30, 20, 15, 15, 10, 10
  rawPoints: number; // unconstrained points
  boundedDeduction: number; // min(maxCap, rawPoints)
  timeWindowType: 'CURRENT_ACTIVE_STATE' | 'PERIOD_METRIC' | 'HYBRID';
  timeWindowDescription: string;
  subItems: QmsRiskDomainSubItem[];
  sourceRecordCount: number;
  sourceRecordIds: string[];
  sourceRecords: QmsDeductionSourceRecord[];
  calculationRule: string;
}

export interface QmsDeductionLedgerItem {
  id: string;
  dimension: 'DIM_1_EVENTS' | 'DIM_2_CONTAINMENT_MTTI' | 'DIM_3_CAPA' | 'DIM_4_EFFECTIVENESS' | 'DIM_5_RELEASE';
  dimensionTitle: string;
  metricName: string;
  sourceRecords: string[];
  calculationRule: string;
  rawPoints: number;
  effectiveDeduction: number;
  dimensionCap: number;
  timeWindow: string;
  numerator?: number;
  denominator?: number;
  ratePct?: number;
}

export interface QmsDimensionScore {
  dimension: string;
  title: string;
  rawDeduction: number;
  effectiveDeduction: number;
  cap: number;
  items: QmsDeductionLedgerItem[];
}

export interface QmsQualityHealthScoreModel {
  score: number; // 0 - 100 (Final QHS = 100 - totalBoundedDeductions)
  rawScore: number; // 100 - totalRawDeductions (unbounded raw score)
  startingScore: number; // 100
  hasComparablePreviousPeriod: boolean; // false if reliable historical data is insufficient / unavailable
  previousScore: number | null; // e.g. 42 or null if insufficient history
  scoreDelta: number | null; // current - previous, or null if insufficient history
  trendDirection: 'UP' | 'DOWN' | 'STABLE' | 'NOT_AVAILABLE';
  trendText: string; // e.g. "↓ 27 vs previous comparable period" or "Trend: Insufficient comparable historical data"
  previousModel?: {
    score: number;
    totalBoundedDeductions: number;
    totalRawDeductions: number;
    domains: {
      criticalControl: QmsRiskDomainScore;
      majorEventControl: QmsRiskDomainScore;
      capaInvestigationControl: QmsRiskDomainScore;
      recurrenceControl: QmsRiskDomainScore;
      batchDispositionControl: QmsRiskDomainScore;
      releasePerformanceControl: QmsRiskDomainScore;
    };
    domainList: QmsRiskDomainScore[];
    evaluatedAt: string;
  } | null;
  healthBand: QmsHealthBand;
  healthBandLabel: string;
  healthBandDescription: string;
  totalBoundedDeductions: number; // sum of bounded domain deductions (0 - 100)
  totalRawDeductions: number; // sum of raw points before cap
  totalDeductions: number; // alias to totalBoundedDeductions for UI compatibility
  domains: {
    criticalControl: QmsRiskDomainScore; // max 30
    majorEventControl: QmsRiskDomainScore; // max 20
    capaInvestigationControl: QmsRiskDomainScore; // max 15
    recurrenceControl: QmsRiskDomainScore; // max 15
    batchDispositionControl: QmsRiskDomainScore; // max 10
    releasePerformanceControl: QmsRiskDomainScore; // max 10
  };
  domainList: QmsRiskDomainScore[];
  deductionLines: QmsDeductionLineItem[];
  topDrivers: QmsTopDriverItem[];
  dimensions: {
    dim1Events: QmsDimensionScore;
    dim2Containment: QmsDimensionScore;
    dim3Capa: QmsDimensionScore;
    dim4Effectiveness: QmsDimensionScore;
    dim5Release: QmsDimensionScore;
  };
  deductionLedger: QmsDeductionLedgerItem[];
  lastCalculatedAt: string;
}

export type QmsQualityHealthScore = QmsQualityHealthScoreModel;

export interface QmsCriticalExecutiveAlert {
  id: string;
  alertType: 'CONSUMER_SAFETY' | 'REGULATORY_BREACH' | 'RECALL_RISK' | 'MICROBIAL_OOS' | 'CRITICAL_HOLD' | 'RECURRENCE_SPIKE';
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH';
  sourceRecordNo: string;
  sourceRecordId: string;
  sourceModule: 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'PHASE_4' | 'PHASE_5';
  actionRequired: string;
  slaRemainingHours?: number;
  createdAt: string;
  alertRule?: string;
  contributingReason?: string;
  threshold?: string;
  currentValue?: string;
  status?: string;
  targetTab?: string;
  filter?: Record<string, any>;
}

export interface QmsExecutiveAttentionSummary {
  attentionNowCount: number;
  activeCriticalUncontained: number;
  activeMajorEvents: number;
  overdueInvestigationCount: number;
  overdueCapaActionCount: number;
  overdueCapaRate: {
    numerator: number;
    denominator: number;
    ratePct: number;
  };
  lingeringQaHoldsCount: number;
  qaRejectedBatchesCount: number;
  qaRejectRate: {
    numerator: number;
    denominator: number;
    ratePct: number;
  };
  firstPassReleaseRate: {
    numerator: number;
    denominator: number;
    ratePct: number;
  };
  recurringClustersCount: number;
  decisionsRequiredCount: number;
  thirtySecondAnswers: {
    attentionNow: string;
    issuesControlled: string;
    whatIsOverdue: string;
    whatIsRecurring: string;
    batchesBlockedOrHeld: string;
    qualityTrend: string;
    decisionRequired: string;
  };
}

export interface QmsMacroPipeline {
  events: { total: number; open: number; contained: number; closed: number };
  investigations: { total: number; inProgress: number; completed: number; avgMttiDays: number };
  capas: { total: number; open: number; inExecution: number; closed: number; overdue: number };
  effectiveness: { total: number; monitoring: number; effective: number; ineffective: number };
  releases: { total: number; readyForReview: number; released: number; onHold: number; blocked: number; rejected: number };
}

export interface QmsExecutiveCockpitResponse {
  healthScore: QmsQualityHealthScoreModel;
  criticalAlerts: QmsCriticalExecutiveAlert[];
  attentionSummary: QmsExecutiveAttentionSummary;
  macroPipeline: QmsMacroPipeline;
  recentReleaseTrend: {
    date: string;
    released: number;
    held: number;
    rejected: number;
  }[];
  gateFailureParetoTop5: {
    gateNumber: number;
    gateCode: string;
    gateTitle: string;
    failedCount: number;
  }[];
  rootCauseParetoTop5: {
    category: string;
    count: number;
    percentage: number;
  }[];
  dataFreshness: {
    refreshedAt: string;
    dateRangeLabel: string;
    activeFiltersLabel: string;
    sourceModules: string[];
  };
}

// Screen 2: Quality Operations Intelligence Types
export type QmsEventAgingBucketId = 'LE_7D' | 'DAY_8_TO_14' | 'DAY_15_TO_30' | 'GT_30D';

export interface QmsActiveEventDetail {
  id: string;
  eventNo: string;
  title: string;
  severity: string;
  departmentId?: string;
  departmentName: string;
  processName?: string;
  productName?: string;
  skuId?: string;
  lotNo?: string;
  openedDate: string;
  currentStatus: string;
  agingDays: number;
  currentOwner: string;
  containmentStatus: string;
  investigationStatus: string;
  agingBucket: QmsEventAgingBucketId;
  agingBucketLabel: string;
  attentionLevel: 'NORMAL' | 'ATTENTION' | 'OVERDUE' | 'CRITICAL';
  attentionLabel: string;
}

export interface QmsActiveEventAgingModel {
  activeCount: number;
  totalAllEventsCount: number;
  averageAgingDays: number;
  medianAgingDays: number;
  oldestActiveDays: number;
  buckets: {
    le7Days: { count: number; percentage: number; label: string; attention: string };
    day8To14: { count: number; percentage: number; label: string; attention: string };
    day15To30: { count: number; percentage: number; label: string; attention: string };
    gt30Days: { count: number; percentage: number; label: string; attention: string };
  };
  activeEventsList: QmsActiveEventDetail[];
  under24h: number;
  day1To3: number;
  day4To7: number;
  over7Days: number;
}

export interface QmsCapaExecutionVelocity {
  completionRatePct: number;
  completedActionsCount: number;
  totalActionsCount: number;
  openActionsCount: number;
  overdueActionsCount: number;
  throughputPerMonth: number;
  periodLabel: string;
  formula: string;
  numeratorLabel: string;
  numeratorValue: number;
  denominatorLabel: string;
  denominatorValue: number;
  unit: string;
}

export interface QmsOperationsIntelligenceResponse {
  eventAging: QmsActiveEventAgingModel;
  containmentPerformance: {
    avgMttcHours: number;
    mttcTargetHours: number;
    mttcSlaMetPct: number;
    uncontainedCount: number;
  };
  investigationPerformance: {
    avgMttiDays: number;
    mttiTargetDays: number;
    overdueInvestigationCount: number;
    toolDistribution: { tool: string; count: number }[];
  };
  rootCause6mTaxonomy: {
    category: string;
    labelTh: string;
    count: number;
    percentage: number;
    subBranches: { name: string; count: number }[];
  }[];
  departmentHeatmap: {
    departmentId: string;
    departmentName: string;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    totalCount: number;
  }[];
  capaBurndown: {
    totalOpenActions: number;
    completedInPeriod: number;
    velocity: QmsCapaExecutionVelocity;
    overdueActions: {
      actionId: string;
      actionNo: string;
      capaNo: string;
      title: string;
      ownerName: string;
      departmentName: string;
      dueDate: string;
      daysOverdue: number;
    }[];
    actionOwnership: {
      ownerName: string;
      totalAssigned: number;
      completed: number;
      pending: number;
      overdue: number;
    }[];
  };
  dataFreshness: {
    refreshedAt: string;
    dateRangeLabel: string;
  };
}

// Screen 3: Batch Release & RFT Analytics Types
export type QmsFirstPassStatus = 'YES' | 'NO' | 'NOT_YET_EVALUABLE';

export type QmsReleaseExclusionCategory =
  | 'UNDER_INITIAL_REVIEW'
  | 'PENDING_EVIDENCE_OR_INCUBATION'
  | 'ON_HOLD_UNDER_INVESTIGATION'
  | 'NOT_EXCLUDED';

export interface QmsFirstPassLotDetail {
  id: string; // release_id
  lotNo: string;
  skuCode: string;
  productName: string;
  firstReviewDate: string;
  finalDisposition: 'QA_RELEASED' | 'QA_REJECTED' | 'READY_FOR_QA_REVIEW' | 'BLOCKED' | 'QA_ON_HOLD';
  finalDispositionLabel: string;
  firstPassStatus: QmsFirstPassStatus;
  firstPassStatusLabel: string;
  isEligibleDenominator: boolean;
  exclusionCategory: QmsReleaseExclusionCategory;
  exclusionReason?: string;
  releaseCycleCount: number;
  blockingGates: {
    gateNumber: number;
    gateCode: string;
    gateTitle: string;
    status: string;
    reason: string;
  }[];
  qaHoldHistory: {
    hasHold: boolean;
    holdId?: string;
    holdReason?: string;
  };
  qaRejectedHistory: {
    hasRejected: boolean;
    rejectionReason?: string;
  };
  reworkIndicator: {
    hasRework: boolean;
    protocolNo?: string;
    nonConformanceDisposition?: string;
  };
  dispositionDate: string | null;
  releaseCycleTimeDays: number | null;
  deterministicReason: string;
}

export interface QmsFirstPassReleaseModel {
  ratePct: number;
  numerator: number; // passed initial review
  denominator: number; // completed disposition lots
  totalTrackedBatches: number; // all batches in Phase 5
  excludedBatchesCount: number; // in-progress / pending batches
  breakdownSummary: {
    releasedFirstPass: number;
    releasedWithExceptionsOrRework: number;
    qaRejected: number;
    underInitialReview: number;
    pendingEvidenceOrIncubation: number;
    onHoldUnderInvestigation: number;
  };
  lots: QmsFirstPassLotDetail[];
  periodLabel: string;
  formula: string;
  benchmarkTargetPct: number;
  reconciliationNote: string;
}

export interface QmsBatchReleaseAnalyticsResponse {
  firstPassRelease: QmsFirstPassReleaseModel;
  statusDistribution: {
    released: number;
    onHold: number;
    blocked: number;
    rejected: number;
    readyForReview: number;
    total: number;
  };
  leadTime: {
    avgReleaseDays: number;
    avgQuarantineDays: number;
  };
  twelveGatePareto: {
    gateNumber: number;
    gateCode: string;
    gateTitleTh: string;
    gateTitleEn: string;
    failedCount: number;
    pendingCount: number;
    naCount: number;
    passedCount: number;
    totalEvaluations: number;
    failureRatePct: number;
    commonReasons: string[];
  }[];
  exemptionStats: {
    totalExemptEvaluations: number;
    anhydrousMicroExemptCount: number; // Gate 7 ISO 29621
    exemptionRatePct: number;
    documentedRationales: { lotNo: string; skuCode: string; gate: string; reason: string }[];
  };
  dispositionHistorySummary: {
    decision: string;
    count: number;
    percentage: number;
  }[];
  dataFreshness: {
    refreshedAt: string;
    dateRangeLabel: string;
  };
}

// Screen 4: Pattern & Recurrence Radar Types
export interface QmsConfirmedRecurrenceItem {
  id: string; // Event ID
  eventNo: string;
  title: string;
  severity: string;
  eventDate: string;
  departmentName?: string;
  productName?: string;
  investigationNo: string;
  investigationId: string;
  qaConfirmedRelatedEventNos: string[];
  qaConfirmedRelatedEventIds: string[];
  qaConfirmationSource: string;
  rootCauseCategory: string;
  rootCauseSummary: string;
  capaNo?: string;
  capaId?: string;
  targetTab: string;
  filter: Record<string, any>;
}

export interface QmsIneffectiveCapaItem {
  planId: string;
  planNo: string;
  capaId: string;
  capaNo: string;
  title: string;
  finalDecision: string;
  qaConclusion: string;
  targetTab: string;
  filter: Record<string, any>;
}

export interface QmsRootCausePatternItem {
  category: string;
  categoryLabel: string;
  count: number;
  percentage: number;
  relatedEventNos: string[];
  sampleEvents: { eventNo: string; title: string }[];
  isConfirmedRecurrence: false;
  patternNotice: string;
}

export interface QmsRecurrenceClusterItem {
  id: string;
  clusterDimension: 'SKU' | 'FORMULA' | 'PROCESS' | 'EQUIPMENT' | 'DEPARTMENT' | 'ROOT_CAUSE' | 'DEFECT_TYPE' | 'SUPPLIER';
  dimensionLabel: string;
  clusterValue: string;
  occurrencesCount: number;
  severityLevel: 'CRITICAL' | 'MAJOR' | 'MODERATE';
  relatedEventNos: string[];
  relatedLotNos: string[];
  rootCauses: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  trendDirection: 'INCREASING' | 'STABLE' | 'DECREASING';
  recommendedAction: string;
}

export interface QmsRecurrenceRadarResponse {
  selectedHorizon: QmsDateRangeFilter;
  confirmedRecurrence: {
    totalConfirmedCount: number;
    items: QmsConfirmedRecurrenceItem[];
    governanceDefinition: string;
  };
  ineffectiveCapaSignals: {
    totalIneffectiveCount: number;
    items: QmsIneffectiveCapaItem[];
    signalNotice: string;
  };
  rootCausePatterns: {
    totalAnalyzedEvents: number;
    patterns: QmsRootCausePatternItem[];
    disclaimer: string;
  };
  totalClustersFound: number;
  highRiskClustersCount: number;
  clusters: QmsRecurrenceClusterItem[];
  dimensionBreakdown: {
    bySku: { name: string; count: number }[];
    byDepartment: { name: string; count: number }[];
    byRootCause: { name: string; count: number }[];
    byEquipment: { name: string; count: number }[];
  };
  dataFreshness: {
    refreshedAt: string;
    dateRangeLabel: string;
  };
}

// Screen 5: Management Review Dossier Studio Types
export interface QmsQmrDrilldownRecord {
  id: string;
  recordNo: string;
  title: string;
  status: string;
  severity?: string;
  date: string;
  departmentName?: string;
  productOrLot?: string;
  extraInfo?: string;
  targetTab: string;
  filter: Record<string, any>;
  childPopulationKey?: string;
  childCount?: number;
}

export interface QmsQmrDrilldownPopulation {
  metricKey: string;
  metricLabel: string;
  reportingPeriod: string;
  timeWindowType: 'CURRENT_ACTIVE_STATE' | 'PERIOD_METRIC';
  dataSource: string;
  inclusionRule: string;
  exclusionRule?: string;
  numerator?: number;
  denominator?: number;
  totalCount: number;
  lastRefreshedAt: string;
  records: QmsQmrDrilldownRecord[];
  isReconciled: boolean;
  reconciliationDiff: number;
  reconciliationNote?: string;
}

export interface QmsManagementReviewSection {
  sectionNumber: number;
  sectionCode: string;
  titleTh: string;
  titleEn: string;
  isoClause: string;
  isConnected: boolean;
  statusText: string;
  metricsSummary?: Record<string, any>;
  narrativeText?: string;
  subItems?: {
    label: string;
    value: string | number;
    note?: string;
    metricKey?: string;
    drilldownAvailable?: boolean;
  }[];
  drilldownPopulations?: QmsQmrDrilldownPopulation[];
}

export interface QmsManagementReviewDossierResponse {
  periodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
  periodLabel: string;
  startDate: string;
  endDate: string;
  companyProfile: {
    nameTh: string;
    nameEn: string;
    address: string;
    standard: string;
    taxId: string;
  };
  sections: QmsManagementReviewSection[];
  executiveConclusion: string;
  signatories: {
    preparedBy: { name: string; role: string; date: string };
    approvedBy: { name: string; role: string; date: string };
  };
  dataFreshness: {
    refreshedAt: string;
  };
}

export interface QmsAiExecutiveNarrative {
  overallAssessment: string;
  criticalSignals: string[];
  recurrenceObservations: string[];
  managementRecommendations: string[];
  supportingMetricReferences: string[];
  generatedAt: string;
  badge: 'AI-GENERATED — FOR MANAGEMENT REVIEW';
}
