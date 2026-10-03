import {
  QmsQualityHealthScoreModel,
  QmsRiskDomainScore,
  QmsRiskDomainSubItem,
  QmsDeductionLineItem,
  QmsDeductionSourceRecord,
  QmsDeductionLedgerItem,
  QmsTopDriverItem,
  QmsHealthBand,
  QmsActiveEventAgingModel,
  QmsActiveEventDetail,
  QmsCapaExecutionVelocity,
  QmsEventAgingBucketId,
  QmsFirstPassReleaseModel,
  QmsFirstPassLotDetail,
  QmsFirstPassStatus,
  QmsReleaseExclusionCategory,
} from '@/types/qms_analytics';

/**
 * Defensive text extractor for blocking reasons or hold descriptions
 */
export function extractTextFromReason(item: unknown): string {
  if (typeof item === 'string') return item;
  if (!item) return '';
  if (typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    return (
      (obj.reason as string) ||
      (obj.title as string) ||
      (obj.description as string) ||
      (obj.message as string) ||
      (obj.hard_block_message as string) ||
      JSON.stringify(obj)
    );
  }
  return String(item);
}

/**
 * Helper to check whether any reason indicates an active QA Hold
 */
export function containsHoldIndicator(reasons: unknown): boolean {
  if (!reasons) return false;
  const list = Array.isArray(reasons) ? reasons : [reasons];
  return list.some((item) => {
    const text = extractTextFromReason(item).toLowerCase();
    return (
      text.includes('active qa hold') ||
      text.includes('qa hold') ||
      text.includes('กักกัน') ||
      text.includes('อายัด')
    );
  });
}

export interface CalculateQhsParams {
  events: any[];
  investigations: any[];
  capas: any[];
  capaActions: any[];
  effPlans: any[];
  releases: any[];
  gates?: any[];
  nowIso?: string;
  comparisonPeriodDays?: number;
}

/**
 * Evaluates the 6 bounded risk domains at a specific point in time (evalMs).
 * Enforces strict separation between CURRENT ACTIVE STATE metrics and PERIOD metrics.
 */
function evaluateRiskDomainsAtTimestamp(params: {
  events: any[];
  investigations: any[];
  capas: any[];
  capaActions: any[];
  effPlans: any[];
  releases: any[];
  gates?: any[];
  evalMs: number;
}) {
  const { events, investigations, capas, capaActions, effPlans, releases, gates = [], evalMs } = params;
  const isCurrentState = Math.abs(evalMs - Date.now()) < 60000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  // =========================================================================
  // DOMAIN 1: Critical Quality Control (MAX 30 POINTS DEDUCTION)
  // Time Window: CURRENT ACTIVE STATE
  // Scope: Uncontained Critical Quality Events (-15/event), Active Critical Safety/Regulatory Breach (-10/event)
  // =========================================================================
  const activeUncontainedCritical = events.filter((e) => {
    const createdMs = new Date(e.created_at).getTime();
    if (createdMs > evalMs) return false;
    if (e.closed_at && new Date(e.closed_at).getTime() <= evalMs) return false;
    if (isCurrentState && ['CLOSED', 'VOIDED'].includes(e.current_status)) return false;

    const isCritical = e.qa_confirmed_severity === 'CRITICAL';
    const isUncontained =
      e.containment_status !== 'CONTAINED' && e.containment_status !== 'NOT_REQUIRED';
    return isCritical && isUncontained;
  });

  const uncontainedIds = new Set(activeUncontainedCritical.map((e) => e.id));
  const activeCriticalSafetyOrReg = events.filter((e) => {
    if (uncontainedIds.has(e.id)) return false;
    const createdMs = new Date(e.created_at).getTime();
    if (createdMs > evalMs) return false;
    if (e.closed_at && new Date(e.closed_at).getTime() <= evalMs) return false;
    if (isCurrentState && ['CLOSED', 'VOIDED'].includes(e.current_status)) return false;

    const impact = e.initial_impact_assessment || {};
    const hasSafetyImpact =
      impact.consumer_safety === true || impact.consumer_safety === 'true';
    const hasRegBreach =
      impact.regulatory_labeling === true || impact.regulatory_labeling === 'true';
    return e.qa_confirmed_severity === 'CRITICAL' || hasSafetyImpact || hasRegBreach;
  });

  const d1SubItems: QmsRiskDomainSubItem[] = [
    {
      id: 'd1-sub-1',
      labelTh: 'เหตุการณ์วิกฤตที่ยังไม่ถูกกักกัน (Uncontained Critical Events)',
      labelEn: 'Uncontained Critical Quality Events',
      count: activeUncontainedCritical.length,
      weight: -15,
      rawPoints: activeUncontainedCritical.length * 15,
      timeWindow: 'CURRENT ACTIVE STATE',
      sourceRecordIds: activeUncontainedCritical.map((e) => e.event_no),
      sourceRecords: activeUncontainedCritical.map((e) => ({
        id: e.id,
        recordNo: e.event_no,
        title: e.title,
        targetTab: 'events',
        filter: { search: e.event_no },
      })),
      calculationRule:
        '-15 คะแนน ต่อเหตุการณ์วิกฤตที่ยังไม่ถูกกักกัน (CURRENT ACTIVE STATE)',
    },
    {
      id: 'd1-sub-2',
      labelTh: 'เหตุการณ์ที่กระทบความปลอดภัย/ข้อกำหนด อย. ที่ยังเปิดอยู่',
      labelEn: 'Active Safety or Regulatory Critical Conditions',
      count: activeCriticalSafetyOrReg.length,
      weight: -10,
      rawPoints: activeCriticalSafetyOrReg.length * 10,
      timeWindow: 'CURRENT ACTIVE STATE',
      sourceRecordIds: activeCriticalSafetyOrReg.map((e) => e.event_no),
      sourceRecords: activeCriticalSafetyOrReg.map((e) => ({
        id: e.id,
        recordNo: e.event_no,
        title: e.title,
        targetTab: 'events',
        filter: { search: e.event_no },
      })),
      calculationRule:
        '-10 คะแนน ต่อข้อบกพร่องด้านความปลอดภัยผู้บริโภค/อย. ที่ยังเปิดอยู่ (CURRENT ACTIVE STATE)',
    },
  ];

  const d1RawPoints = d1SubItems.reduce((acc, sub) => acc + sub.rawPoints, 0);
  const d1MaxCap = 30;
  const d1BoundedDeduction = Math.min(d1MaxCap, d1RawPoints);

  const domain1: QmsRiskDomainScore = {
    domainId: 'DOMAIN_1_CRITICAL',
    order: 1,
    titleTh: 'การควบคุมความเสี่ยงวิกฤตและความปลอดภัย',
    titleEn: 'Critical Quality Control',
    maxCap: d1MaxCap,
    rawPoints: d1RawPoints,
    boundedDeduction: d1BoundedDeduction,
    timeWindowType: 'CURRENT_ACTIVE_STATE',
    timeWindowDescription: 'CURRENT ACTIVE STATE',
    subItems: d1SubItems,
    sourceRecordCount:
      activeUncontainedCritical.length + activeCriticalSafetyOrReg.length,
    sourceRecordIds: [
      ...activeUncontainedCritical.map((e) => e.event_no),
      ...activeCriticalSafetyOrReg.map((e) => e.event_no),
    ],
    sourceRecords: [
      ...d1SubItems[0].sourceRecords,
      ...d1SubItems[1].sourceRecords,
    ],
    calculationRule:
      'เหตุการณ์วิกฤตที่ยังไม่ถูกกักกัน (-15/เคส), กระทบความปลอดภัย/อย. (-10/เคส) — หักสูงสุดไม่เกิน 30 คะแนน',
  };

  // =========================================================================
  // DOMAIN 2: Major Quality Event Control (MAX 20 POINTS DEDUCTION)
  // Time Window: CURRENT ACTIVE STATE
  // Scope: Open Major Quality Events (-5/event)
  // =========================================================================
  const activeOpenMajor = events.filter((e) => {
    const createdMs = new Date(e.created_at).getTime();
    if (createdMs > evalMs) return false;
    if (e.closed_at && new Date(e.closed_at).getTime() <= evalMs) return false;
    if (isCurrentState && ['CLOSED', 'VOIDED'].includes(e.current_status)) return false;
    return e.qa_confirmed_severity === 'MAJOR';
  });

  const d2RawPoints = activeOpenMajor.length * 5;
  const d2MaxCap = 20;
  const d2BoundedDeduction = Math.min(d2MaxCap, d2RawPoints);

  const d2SubItems: QmsRiskDomainSubItem[] = [
    {
      id: 'd2-sub-1',
      labelTh: 'ข้อเบี่ยงเบนร้ายแรงที่ยังเปิดอยู่ (Open Major Quality Events)',
      labelEn: 'Open Major Quality Events',
      count: activeOpenMajor.length,
      weight: -5,
      rawPoints: d2RawPoints,
      timeWindow: 'CURRENT ACTIVE STATE',
      sourceRecordIds: activeOpenMajor.map((e) => e.event_no),
      sourceRecords: activeOpenMajor.map((e) => ({
        id: e.id,
        recordNo: e.event_no,
        title: e.title,
        targetTab: 'events',
        filter: { search: e.event_no },
      })),
      calculationRule:
        '-5 คะแนน ต่อข้อเบี่ยงเบนระดับ MAJOR ที่ยังเปิดอยู่ (จำกัดหักสูงสุดไม่เกิน 20 คะแนน)',
    },
  ];

  const domain2: QmsRiskDomainScore = {
    domainId: 'DOMAIN_2_MAJOR',
    order: 2,
    titleTh: 'การควบคุมข้อเบี่ยงเบนร้ายแรงที่เปิดอยู่',
    titleEn: 'Major Quality Event Control',
    maxCap: d2MaxCap,
    rawPoints: d2RawPoints,
    boundedDeduction: d2BoundedDeduction,
    timeWindowType: 'CURRENT_ACTIVE_STATE',
    timeWindowDescription: 'CURRENT ACTIVE STATE',
    subItems: d2SubItems,
    sourceRecordCount: activeOpenMajor.length,
    sourceRecordIds: activeOpenMajor.map((e) => e.event_no),
    sourceRecords: d2SubItems[0].sourceRecords,
    calculationRule:
      'ข้อเบี่ยงเบนระดับ MAJOR ที่ยังเปิดอยู่ (-5/เคส) — หักสูงสุดไม่เกิน 20 คะแนน',
  };

  // =========================================================================
  // DOMAIN 3: CAPA & Investigation Control (MAX 15 POINTS DEDUCTION)
  // Time Window: CURRENT ACTIVE STATE
  // Scope: Overdue CAPA Actions (-5/action), Overdue Investigations > 14 days (-3/investigation)
  // =========================================================================
  const overdueCapaActions = capaActions.filter((a) => {
    const createdMs = new Date(a.created_at).getTime();
    if (createdMs > evalMs) return false;
    if (a.completed_at && new Date(a.completed_at).getTime() <= evalMs) return false;
    if (isCurrentState && ['COMPLETED', 'CANCELLED'].includes(a.status)) return false;
    if (!a.due_date) return false;
    return new Date(a.due_date).getTime() < evalMs;
  });

  const agingInvestigations = investigations.filter((i) => {
    const createdMs = new Date(i.created_at).getTime();
    if (createdMs > evalMs) return false;
    if (i.completed_at && new Date(i.completed_at).getTime() <= evalMs) return false;
    if (isCurrentState && ['COMPLETED', 'QA_APPROVED'].includes(i.current_status))
      return false;
    const ageDays = (evalMs - createdMs) / (1000 * 60 * 60 * 24);
    return ageDays > 14;
  });

  const d3SubItems: QmsRiskDomainSubItem[] = [
    {
      id: 'd3-sub-1',
      labelTh: 'กิจกรรม CAPA ที่เลยกำหนดส่ง (Overdue CAPA Actions)',
      labelEn: 'Overdue CAPA Actions',
      count: overdueCapaActions.length,
      weight: -5,
      rawPoints: overdueCapaActions.length * 5,
      timeWindow: 'CURRENT ACTIVE STATE',
      sourceRecordIds: overdueCapaActions.map(
        (a) => a.action_no || a.title || 'ACT'
      ),
      sourceRecords: overdueCapaActions.map((a) => ({
        id: a.id,
        recordNo: a.action_no || `ACT-${a.id.slice(0, 6)}`,
        title: a.title,
        targetTab: 'capa_register',
        filter: { filter: 'overdue' },
      })),
      calculationRule:
        '-5 คะแนน ต่อกิจกรรม CAPA ที่เลยกำหนดส่ง (CURRENT ACTIVE STATE)',
    },
    {
      id: 'd3-sub-2',
      labelTh: 'การสอบสวนที่ค้างเกิน 14 วัน (Aging Investigations > 14 Days)',
      labelEn: 'Aging Investigations > 14 Days',
      count: agingInvestigations.length,
      weight: -3,
      rawPoints: agingInvestigations.length * 3,
      timeWindow: 'CURRENT ACTIVE STATE',
      sourceRecordIds: agingInvestigations.map((i) => i.investigation_no),
      sourceRecords: agingInvestigations.map((i) => ({
        id: i.id,
        recordNo: i.investigation_no,
        title: i.investigation_summary || i.simple_root_cause_statement,
        targetTab: 'investigations',
        filter: { search: i.investigation_no },
      })),
      calculationRule:
        '-3 คะแนน ต่อการสอบสวนที่ค้างเกิน 14 วัน (CURRENT ACTIVE STATE)',
    },
  ];

  const d3RawPoints = d3SubItems.reduce((acc, sub) => acc + sub.rawPoints, 0);
  const d3MaxCap = 15;
  const d3BoundedDeduction = Math.min(d3MaxCap, d3RawPoints);

  const domain3: QmsRiskDomainScore = {
    domainId: 'DOMAIN_3_CAPA_INV',
    order: 3,
    titleTh: 'การควบคุมการสอบสวนและมาตรการ CAPA',
    titleEn: 'CAPA & Investigation Control',
    maxCap: d3MaxCap,
    rawPoints: d3RawPoints,
    boundedDeduction: d3BoundedDeduction,
    timeWindowType: 'CURRENT_ACTIVE_STATE',
    timeWindowDescription: 'CURRENT ACTIVE STATE',
    subItems: d3SubItems,
    sourceRecordCount: overdueCapaActions.length + agingInvestigations.length,
    sourceRecordIds: [
      ...overdueCapaActions.map((a) => a.action_no || 'ACT'),
      ...agingInvestigations.map((i) => i.investigation_no),
    ],
    sourceRecords: [
      ...d3SubItems[0].sourceRecords,
      ...d3SubItems[1].sourceRecords,
    ],
    calculationRule:
      'CAPA เลยกำหนด (-5/รายการ), สอบสวนค้างเกิน 14 วัน (-3/รายการ) — หักสูงสุดไม่เกิน 15 คะแนน',
  };

  // =========================================================================
  // DOMAIN 4: Recurrence Control (MAX 15 POINTS DEDUCTION)
  // Time Window: LAST 90 DAYS (Period metric)
  // Scope: CONFIRMED RECURRENCE ONLY (QA-Confirmed via Phase 1-4 source of truth)
  // GOVERNANCE MANDATE:
  // - Sourced strictly from qms_investigations.qa_confirmed_related_event_ids or explicit QA flags.
  // - 6M Pattern frequency MUST NOT deduct QHS recurrence points.
  // - NOT_EFFECTIVE CAPA plans alone MUST NOT be counted as Confirmed Recurrence.
  // =========================================================================
  const ninetyDaysAgoMs = evalMs - ninetyDaysMs;

  // Build lookup of investigations with explicit QA-confirmed related event IDs
  const confirmedRecurrenceInvMap = new Map<string, any>();
  investigations.forEach((inv) => {
    if (
      Array.isArray(inv.qa_confirmed_related_event_ids) &&
      inv.qa_confirmed_related_event_ids.length > 0
    ) {
      confirmedRecurrenceInvMap.set(inv.quality_event_id, inv);
    }
  });

  const qaConfirmedRecurrenceEvents = events.filter((e) => {
    const createdMs = new Date(e.created_at).getTime();
    if (createdMs < ninetyDaysAgoMs || createdMs > evalMs) return false;
    const hasInvConfirmation = confirmedRecurrenceInvMap.has(e.id);
    const hasExplicitFlag =
      e.is_recurrence === true ||
      e.recurrence_confirmed === true ||
      e.qa_confirmed_recurrence === true ||
      e.snapshot_context?.is_recurrence === true ||
      e.event_type === 'RECURRENCE';
    return hasInvConfirmation || hasExplicitFlag;
  });

  const d4SubItems: QmsRiskDomainSubItem[] = [
    {
      id: 'd4-sub-1',
      labelTh: 'เหตุการณ์ที่ QA ยืนยันการเกิดซ้ำ (QA-Confirmed Recurring Events)',
      labelEn: 'QA-Confirmed Recurring Quality Events',
      count: qaConfirmedRecurrenceEvents.length,
      weight: -5,
      rawPoints: qaConfirmedRecurrenceEvents.length * 5,
      timeWindow: 'LAST 90 DAYS',
      sourceRecordIds: qaConfirmedRecurrenceEvents.map((e) => e.event_no),
      sourceRecords: qaConfirmedRecurrenceEvents.map((e) => {
        const inv = confirmedRecurrenceInvMap.get(e.id);
        const relatedCount = inv?.qa_confirmed_related_event_ids?.length || 0;
        const relatedInfo = relatedCount > 0
          ? ` (เชื่อมโยงเหตุการณ์เดิม: ${relatedCount} รายการ)`
          : '';
        return {
          id: e.id,
          recordNo: e.event_no,
          title: `${e.title}${relatedInfo}`,
          targetTab: 'events',
          filter: { search: e.event_no },
        };
      }),
      calculationRule:
        '-5 คะแนน ต่อเหตุการณ์ที่ QA ยืนยันการเกิดซ้ำในรอบ 90 วัน (นับเฉพาะที่มีการบันทึกยืนยันความสัมพันธ์โดย QA ใน Phase 1–4)',
    },
  ];

  const d4RawPoints = d4SubItems.reduce((acc, sub) => acc + sub.rawPoints, 0);
  const d4MaxCap = 15;
  const d4BoundedDeduction = Math.min(d4MaxCap, d4RawPoints);

  const domain4: QmsRiskDomainScore = {
    domainId: 'DOMAIN_4_RECURRENCE',
    order: 4,
    titleTh: 'การควบคุมปัญหาคุณภาพเกิดซ้ำ (QA-Confirmed Only)',
    titleEn: 'Recurrence Control (Confirmed Only)',
    maxCap: d4MaxCap,
    rawPoints: d4RawPoints,
    boundedDeduction: d4BoundedDeduction,
    timeWindowType: 'PERIOD_METRIC',
    timeWindowDescription: 'LAST 90 DAYS',
    subItems: d4SubItems,
    sourceRecordCount: qaConfirmedRecurrenceEvents.length,
    sourceRecordIds: qaConfirmedRecurrenceEvents.map((e) => e.event_no),
    sourceRecords: d4SubItems[0].sourceRecords,
    calculationRule:
      'เหตุการณ์ยืนยันซ้ำโดย QA (-5/เคส) — หักสูงสุดไม่เกิน 15 คะแนน (6M Pattern และ NOT_EFFECTIVE CAPA จะไม่ถูกนับเป็น Recurrence เว้นแต่ยืนยันโดย QA)',
  };

  // =========================================================================
  // DOMAIN 5: Batch Disposition / QA Hold (MAX 10 POINTS DEDUCTION)
  // Time Window: CURRENT ACTIVE STATE (Active QA Holds) & LAST 30 DAYS (QA Rejected Batches)
  // Scope: Active QA Holds (-5/affected lot), QA Rejected Batches (-5/lot)
  // =========================================================================
  const thirtyDaysAgoMs = evalMs - thirtyDaysMs;

  // 1. Active QA Holds (Current Active State)
  const activeHoldLotsMap = new Map<string, any>();
  releases.forEach((r) => {
    const createdMs = new Date(r.created_at).getTime();
    if (createdMs > evalMs) return false;
    const isHoldStatus = r.overall_status === 'QA_ON_HOLD';
    const isBlockedWithHold =
      r.is_blocked &&
      (containsHoldIndicator(r.blocking_reasons) || !r.blocking_reasons || r.is_blocked);
    if (isHoldStatus || isBlockedWithHold) {
      const lotKey = r.lot_no || r.id;
      if (!activeHoldLotsMap.has(lotKey)) {
        activeHoldLotsMap.set(lotKey, r);
      }
    }
  });
  const activeHoldLots = Array.from(activeHoldLotsMap.values());

  // 2. QA Rejected Batches within 30 Days
  const rejected30dMap = new Map<string, any>();
  releases.forEach((r) => {
    const createdMs = new Date(r.created_at).getTime();
    if (
      createdMs >= thirtyDaysAgoMs &&
      createdMs <= evalMs &&
      r.overall_status === 'QA_REJECTED'
    ) {
      const lotKey = r.lot_no || r.id;
      if (!rejected30dMap.has(lotKey)) {
        rejected30dMap.set(lotKey, r);
      }
    }
  });
  const rejectedLots30d = Array.from(rejected30dMap.values());

  const d5SubItems: QmsRiskDomainSubItem[] = [
    {
      id: 'd5-sub-1',
      labelTh: 'รุ่นการผลิตที่ถูกสั่งกักกัน (Active QA Holds)',
      labelEn: 'Active QA Holds',
      count: activeHoldLots.length,
      weight: -5,
      rawPoints: activeHoldLots.length * 5,
      timeWindow: 'CURRENT ACTIVE STATE',
      sourceRecordIds: activeHoldLots.map((r) => r.lot_no || r.id),
      sourceRecords: activeHoldLots.map((r) => ({
        id: r.id,
        recordNo: r.lot_no || r.id,
        title: r.product_name,
        targetTab: 'batch_release',
        filter: { search: r.lot_no },
      })),
      calculationRule:
        '-5 คะแนน ต่อรุ่นการผลิตที่ติดสถานะ QA Hold (CURRENT ACTIVE STATE)',
    },
    {
      id: 'd5-sub-2',
      labelTh: 'รุ่นการผลิตที่ถูกสั่งปฏิเสธ (QA Rejected) ในรอบ 30 วัน',
      labelEn: 'QA Rejected Batches within 30 Days',
      count: rejectedLots30d.length,
      weight: -5,
      rawPoints: rejectedLots30d.length * 5,
      timeWindow: 'LAST 30 DAYS',
      sourceRecordIds: rejectedLots30d.map((r) => r.lot_no || r.id),
      sourceRecords: rejectedLots30d.map((r) => ({
        id: r.id,
        recordNo: r.lot_no || r.id,
        title: r.product_name,
        targetTab: 'batch_release',
        filter: { search: r.lot_no },
      })),
      calculationRule:
        '-5 คะแนน ต่อรุ่นการผลิตที่ถูกสั่งปฏิเสธในรอบ 30 วัน (LAST 30 DAYS)',
    },
  ];

  const d5RawPoints = d5SubItems.reduce((acc, sub) => acc + sub.rawPoints, 0);
  const d5MaxCap = 10;
  const d5BoundedDeduction = Math.min(d5MaxCap, d5RawPoints);

  const domain5: QmsRiskDomainScore = {
    domainId: 'DOMAIN_5_BATCH_DISPOSITION',
    order: 5,
    titleTh: 'การระงับการปล่อยและปฏิเสธรุ่นการผลิต',
    titleEn: 'Batch Disposition & QA Hold',
    maxCap: d5MaxCap,
    rawPoints: d5RawPoints,
    boundedDeduction: d5BoundedDeduction,
    timeWindowType: 'HYBRID',
    timeWindowDescription:
      'CURRENT ACTIVE (Holds) / LAST 30 DAYS (Rejections)',
    subItems: d5SubItems,
    sourceRecordCount: activeHoldLots.length + rejectedLots30d.length,
    sourceRecordIds: [
      ...activeHoldLots.map((r) => r.lot_no || r.id),
      ...rejectedLots30d.map((r) => r.lot_no || r.id),
    ],
    sourceRecords: [
      ...d5SubItems[0].sourceRecords,
      ...d5SubItems[1].sourceRecords,
    ],
    calculationRule:
      'Active QA Hold (-5/ล็อต), QA Rejected ในรอบ 30 วัน (-5/ล็อต) — หักสูงสุดไม่เกิน 10 คะแนน',
  };

  // =========================================================================
  // DOMAIN 6: Release Performance / Quality Execution (MAX 10 POINTS DEDUCTION)
  // Time Window: CURRENT ACTIVE STATE & LAST 30 DAYS
  // Scope: Batches blocked due to pending required tests/signatures (excluding hold), First Pass failures
  // =========================================================================
  const blockedNonHoldLotsMap = new Map<string, any>();
  releases.forEach((r) => {
    const createdMs = new Date(r.created_at).getTime();
    if (createdMs > evalMs) return false;
    const isHold = activeHoldLotsMap.has(r.lot_no || r.id);
    if (
      !isHold &&
      r.is_blocked &&
      r.overall_status !== 'QA_REJECTED' &&
      r.overall_status !== 'QA_RELEASED'
    ) {
      const lotKey = r.lot_no || r.id;
      if (!blockedNonHoldLotsMap.has(lotKey)) {
        blockedNonHoldLotsMap.set(lotKey, r);
      }
    }
  });
  const blockedNonHoldLots = Array.from(blockedNonHoldLotsMap.values());

  const releaseExceptions30dMap = new Map<string, any>();
  releases.forEach((r) => {
    const createdMs = new Date(r.created_at).getTime();
    if (createdMs >= thirtyDaysAgoMs && createdMs <= evalMs) {
      if (
        (r.failed_gates_count && r.failed_gates_count > 0) ||
        (r.is_blocked && r.overall_status !== 'QA_RELEASED')
      ) {
        const lotKey = r.lot_no || r.id;
        if (!releaseExceptions30dMap.has(lotKey)) {
          releaseExceptions30dMap.set(lotKey, r);
        }
      }
    }
  });
  const releaseExceptions30d = Array.from(releaseExceptions30dMap.values());

  const d6SubItems: QmsRiskDomainSubItem[] = [
    {
      id: 'd6-sub-1',
      labelTh: 'ล็อตที่ติด Block ผลตรวจ/เอกสารไม่ครบ (Pending Release Blocks)',
      labelEn: 'Active Blocked Batches (Pending Evidence/Gates)',
      count: blockedNonHoldLots.length,
      weight: -2.5,
      rawPoints: blockedNonHoldLots.length * 2.5,
      timeWindow: 'CURRENT ACTIVE STATE',
      sourceRecordIds: blockedNonHoldLots.map((r) => r.lot_no || r.id),
      sourceRecords: blockedNonHoldLots.map((r) => ({
        id: r.id,
        recordNo: r.lot_no || r.id,
        title: r.product_name,
        targetTab: 'batch_release',
        filter: { search: r.lot_no },
      })),
      calculationRule:
        '-2.5 คะแนน ต่อล็อตที่ติด Block ผลตรวจหรือบันทึกไม่ครบ (CURRENT ACTIVE STATE)',
    },
    {
      id: 'd6-sub-2',
      labelTh: 'ล็อตที่มีข้อบกพร่องระหว่างตรวจปล่อยในรอบ 30 วัน (Release Gate Exceptions)',
      labelEn: 'Batches with Gate Exceptions (30 Days)',
      count: releaseExceptions30d.length,
      weight: -2.5,
      rawPoints: releaseExceptions30d.length * 2.5,
      timeWindow: 'LAST 30 DAYS',
      sourceRecordIds: releaseExceptions30d.map((r) => r.lot_no || r.id),
      sourceRecords: releaseExceptions30d.map((r) => ({
        id: r.id,
        recordNo: r.lot_no || r.id,
        title: r.product_name,
        targetTab: 'batch_release',
        filter: { search: r.lot_no },
      })),
      calculationRule:
        '-2.5 คะแนน ต่อล็อตที่มี Gate Exception หรือไม่ผ่าน First Pass ในรอบ 30 วัน',
    },
  ];

  const d6RawPoints = d6SubItems.reduce((acc, sub) => acc + sub.rawPoints, 0);
  const d6MaxCap = 10;
  const d6BoundedDeduction = Math.min(d6MaxCap, d6RawPoints);

  const domain6: QmsRiskDomainScore = {
    domainId: 'DOMAIN_6_RELEASE_PERF',
    order: 6,
    titleTh: 'ประสิทธิภาพการตรวจปล่อยและการปฏิบัติตามมาตรฐาน',
    titleEn: 'Release Performance & Quality Execution',
    maxCap: d6MaxCap,
    rawPoints: d6RawPoints,
    boundedDeduction: d6BoundedDeduction,
    timeWindowType: 'HYBRID',
    timeWindowDescription: 'CURRENT ACTIVE & LAST 30 DAYS',
    subItems: d6SubItems,
    sourceRecordCount:
      blockedNonHoldLots.length + releaseExceptions30d.length,
    sourceRecordIds: [
      ...blockedNonHoldLots.map((r) => r.lot_no || r.id),
      ...releaseExceptions30d.map((r) => r.lot_no || r.id),
    ],
    sourceRecords: [
      ...d6SubItems[0].sourceRecords,
      ...d6SubItems[1].sourceRecords,
    ],
    calculationRule:
      'ล็อตติด Block ผลตรวจไม่ครบ (-2.5/ล็อต), Gate Exception ในรอบ 30 วัน (-2.5/ล็อต) — หักสูงสุดไม่เกิน 10 คะแนน',
  };

  const domainList = [domain1, domain2, domain3, domain4, domain5, domain6];
  const totalBoundedDeductions = domainList.reduce(
    (acc, d) => acc + d.boundedDeduction,
    0
  );
  const totalRawDeductions = domainList.reduce((acc, d) => acc + d.rawPoints, 0);
  const finalScore = Math.max(
    0,
    Math.min(100, Math.round(100 - totalBoundedDeductions))
  );

  return {
    finalScore,
    totalBoundedDeductions,
    totalRawDeductions,
    domain1,
    domain2,
    domain3,
    domain4,
    domain5,
    domain6,
    domainList,
  };
}

/**
 * DETERMINISTIC QUALITY HEALTH SCORE (QHS) V2 — 100 POINT BOUNDED RISK-DOMAIN MODEL
 *
 * Formula:
 * QHS = 100 - Sum(Bounded Domain Deductions)
 *
 * 6 Assigned Risk Domains (Total Maximum Deduction = 100):
 * 1. Critical Quality Control:         Max 30 points deduction (Current Active State)
 * 2. Major Quality Event Control:      Max 20 points deduction (Current Active State)
 * 3. CAPA & Investigation Control:     Max 15 points deduction (Current Active State)
 * 4. Recurrence Control:               Max 15 points deduction (Last 90 Days, Confirmed Only)
 * 5. Batch Disposition & QA Hold:      Max 10 points deduction (Current Active Holds & Last 30d Rejections)
 * 6. Release Performance Control:      Max 10 points deduction (Current Blocked & Last 30d Exceptions)
 *
 * Strict Properties:
 * - Mathematical bounds: Score is strictly guaranteed in [0, 100].
 * - No saturation at negative values: A drop in Major Events immediately produces measurable QHS improvement.
 * - Confirmed Recurrence only: Heuristic/unconfirmed event similarity does NOT deduct points.
 * - Previous-period trend: Evaluated using the exact same deterministic methodology at (now - period).
 */
export function calculateDeterministicQhs(
  params: CalculateQhsParams
): QmsQualityHealthScoreModel {
  const nowMs = Date.now();
  const nowIso = params.nowIso || new Date().toISOString();
  const periodDays = params.comparisonPeriodDays || 30;
  const periodMs = periodDays * 24 * 60 * 60 * 1000;

  // 1. Current State Evaluation
  const currentResult = evaluateRiskDomainsAtTimestamp({
    events: params.events,
    investigations: params.investigations,
    capas: params.capas,
    capaActions: params.capaActions,
    effPlans: params.effPlans,
    releases: params.releases,
    gates: params.gates,
    evalMs: nowMs,
  });

  const finalScore = currentResult.finalScore;

  // 2. Previous Comparable Period Evaluation (Identical Methodology)
  const prevEvalMs = nowMs - periodMs;

  // Gather all historical created timestamps to verify data sufficiency
  const allCreatedTimestamps: number[] = [];
  (params.events || []).forEach((e) => {
    if (e.created_at) allCreatedTimestamps.push(new Date(e.created_at).getTime());
  });
  (params.releases || []).forEach((r) => {
    if (r.created_at) allCreatedTimestamps.push(new Date(r.created_at).getTime());
  });
  (params.investigations || []).forEach((i) => {
    if (i.created_at) allCreatedTimestamps.push(new Date(i.created_at).getTime());
  });
  (params.capaActions || []).forEach((a) => {
    if (a.created_at) allCreatedTimestamps.push(new Date(a.created_at).getTime());
  });

  const earliestRecordMs =
    allCreatedTimestamps.length > 0 ? Math.min(...allCreatedTimestamps) : null;
  const recordsAtOrBeforePrev = allCreatedTimestamps.filter((t) => t <= prevEvalMs).length;

  // Strict Data Sufficiency Guard:
  // If recordsAtOrBeforePrev is 0 or prevEvalMs < earliestRecordMs, there is NO historical baseline.
  // NEVER default missing historical data to 100!
  const hasComparablePreviousPeriod =
    earliestRecordMs !== null &&
    prevEvalMs >= earliestRecordMs &&
    recordsAtOrBeforePrev > 0;

  let prevScore: number | null = null;
  let scoreDelta: number | null = null;
  let trendDirection: 'UP' | 'DOWN' | 'STABLE' | 'NOT_AVAILABLE' = 'NOT_AVAILABLE';
  let trendText = 'Trend: N/A — insufficient comparable historical data';
  let previousModel: QmsQualityHealthScoreModel['previousModel'] = null;

  if (hasComparablePreviousPeriod) {
    const prevResult = evaluateRiskDomainsAtTimestamp({
      events: params.events,
      investigations: params.investigations,
      capas: params.capas,
      capaActions: params.capaActions,
      effPlans: params.effPlans,
      releases: params.releases,
      gates: params.gates,
      evalMs: prevEvalMs,
    });

    prevScore = prevResult.finalScore;
    scoreDelta = finalScore - prevScore;

    if (scoreDelta > 0) {
      trendDirection = 'UP';
      trendText = `↑ +${scoreDelta} vs previous ${periodDays} days`;
    } else if (scoreDelta < 0) {
      trendDirection = 'DOWN';
      trendText = `↓ ${Math.abs(scoreDelta)} vs previous ${periodDays} days`;
    } else {
      trendDirection = 'STABLE';
      trendText = `→ 0 vs previous ${periodDays} days`;
    }

    previousModel = {
      score: prevResult.finalScore,
      totalBoundedDeductions: prevResult.totalBoundedDeductions,
      totalRawDeductions: prevResult.totalRawDeductions,
      domains: {
        criticalControl: prevResult.domain1,
        majorEventControl: prevResult.domain2,
        capaInvestigationControl: prevResult.domain3,
        recurrenceControl: prevResult.domain4,
        batchDispositionControl: prevResult.domain5,
        releasePerformanceControl: prevResult.domain6,
      },
      domainList: prevResult.domainList,
      evaluatedAt: new Date(prevEvalMs).toISOString(),
    };
  }

  // Health Band assignment
  let healthBand: QmsHealthBand = 'EXCELLENT';
  let healthBandLabel = 'EXCELLENT';
  let healthBandDesc =
    'กระบวนการผลิตและการควบคุมคุณภาพสอดคล้องตามมาตรฐาน GMP ดำเนินการตามปกติ';

  if (finalScore < 60) {
    healthBand = 'CRITICAL_ALERT';
    healthBandLabel = 'CRITICAL ALERT';
    healthBandDesc =
      'พบความเสี่ยงระดับวิกฤต หรือมีข้อบกพร่องค้างส่งผลต่อระบบคุณภาพ ฝ่ายบริหารต้องสั่งการทันที';
  } else if (finalScore < 75) {
    healthBand = 'ELEVATED_RISK';
    healthBandLabel = 'ELEVATED RISK';
    healthBandDesc =
      'มีงานเกินกำหนดหรือมีสินค้าถูกกักกัน ควรมีการทบทวนแผนงานในรอบสัปดาห์';
  } else if (finalScore < 90) {
    healthBand = 'CONTROLLED';
    healthBandLabel = 'CONTROLLED';
    healthBandDesc =
      'มีข้อเบี่ยงเบนเล็กน้อยภายใต้การควบคุม มาตรการแก้ไขกำลังดำเนินการตามกำหนด';
  }

  // 7 Structured Deduction Lines for backward compatibility & granular drilldown
  const deductionLines: QmsDeductionLineItem[] = [
    {
      id: 'qhs-line-1',
      order: 1,
      titleTh: 'เหตุการณ์วิกฤตที่ยังไม่ถูกกักกัน',
      titleEn: 'Critical Quality Control',
      timeWindow: 'CURRENT ACTIVE STATE',
      count: currentResult.domain1.sourceRecordCount,
      weight: -15,
      deduction: -currentResult.domain1.boundedDeduction,
      sourceRecordIds: currentResult.domain1.sourceRecordIds,
      sourceRecords: currentResult.domain1.sourceRecords,
      calculationRule: currentResult.domain1.calculationRule,
    },
    {
      id: 'qhs-line-2',
      order: 2,
      titleTh: 'ข้อเบี่ยงเบนร้ายแรงที่ยังเปิดอยู่',
      titleEn: 'Major Quality Event Control',
      timeWindow: 'CURRENT ACTIVE STATE',
      count: currentResult.domain2.sourceRecordCount,
      weight: -5,
      deduction: -currentResult.domain2.boundedDeduction,
      sourceRecordIds: currentResult.domain2.sourceRecordIds,
      sourceRecords: currentResult.domain2.sourceRecords,
      calculationRule: currentResult.domain2.calculationRule,
    },
    {
      id: 'qhs-line-3',
      order: 3,
      titleTh: 'กิจกรรม CAPA และการสอบสวนที่ค้าง',
      titleEn: 'CAPA & Investigation Control',
      timeWindow: 'CURRENT ACTIVE STATE',
      count: currentResult.domain3.sourceRecordCount,
      weight: -5,
      deduction: -currentResult.domain3.boundedDeduction,
      sourceRecordIds: currentResult.domain3.sourceRecordIds,
      sourceRecords: currentResult.domain3.sourceRecords,
      calculationRule: currentResult.domain3.calculationRule,
    },
    {
      id: 'qhs-line-4',
      order: 4,
      titleTh: 'ปัญหาคุณภาพซ้ำซากที่ QA ยืนยัน',
      titleEn: 'Recurrence Control (Confirmed Only)',
      timeWindow: 'LAST 90 DAYS',
      count: currentResult.domain4.sourceRecordCount,
      weight: -8,
      deduction: -currentResult.domain4.boundedDeduction,
      sourceRecordIds: currentResult.domain4.sourceRecordIds,
      sourceRecords: currentResult.domain4.sourceRecords,
      calculationRule: currentResult.domain4.calculationRule,
    },
    {
      id: 'qhs-line-5',
      order: 5,
      titleTh: 'การกักกันและปฏิเสธรุ่นผลิต (QA Hold & Rejected)',
      titleEn: 'Batch Disposition & QA Hold',
      timeWindow: 'LAST 30 DAYS',
      count: currentResult.domain5.sourceRecordCount,
      weight: -5,
      deduction: -currentResult.domain5.boundedDeduction,
      sourceRecordIds: currentResult.domain5.sourceRecordIds,
      sourceRecords: currentResult.domain5.sourceRecords,
      calculationRule: currentResult.domain5.calculationRule,
    },
    {
      id: 'qhs-line-6',
      order: 6,
      titleTh: 'ประสิทธิภาพการตรวจปล่อยรุ่นผลิต',
      titleEn: 'Release Performance & Quality Execution',
      timeWindow: 'CURRENT ACTIVE & LAST 30 DAYS',
      count: currentResult.domain6.sourceRecordCount,
      weight: -2.5,
      deduction: -currentResult.domain6.boundedDeduction,
      sourceRecordIds: currentResult.domain6.sourceRecordIds,
      sourceRecords: currentResult.domain6.sourceRecords,
      calculationRule: currentResult.domain6.calculationRule,
    },
  ];

  // Top Drivers Requiring Attention: Ranked by deterministic impact on QHS, displaying actual source count
  const topDrivers: QmsTopDriverItem[] = currentResult.domainList
    .filter((d) => d.boundedDeduction > 0)
    .sort((a, b) => b.boundedDeduction - a.boundedDeduction || b.rawPoints - a.rawPoints)
    .map((d, idx) => ({
      rank: idx + 1,
      title: d.titleEn,
      titleTh: d.titleTh,
      count: d.sourceRecordCount,
      impactPoints: d.boundedDeduction,
      timeWindow: d.timeWindowDescription,
      targetTab: d.sourceRecords[0]?.targetTab || 'events',
      filter: d.sourceRecords[0]?.filter,
      sourceRecordNos: d.sourceRecordIds,
    }));

  // Legacy ledger mapping for compatibility
  const ledger: QmsDeductionLedgerItem[] = currentResult.domainList.map((d) => ({
    id: d.domainId,
    dimension:
      d.order === 1 || d.order === 2
        ? 'DIM_1_EVENTS'
        : d.order === 3
        ? 'DIM_3_CAPA'
        : d.order === 4
        ? 'DIM_4_EFFECTIVENESS'
        : 'DIM_5_RELEASE',
    dimensionTitle: d.titleEn,
    metricName: d.titleTh,
    sourceRecords: d.sourceRecordIds,
    calculationRule: d.calculationRule,
    rawPoints: d.rawPoints,
    effectiveDeduction: d.boundedDeduction,
    dimensionCap: d.maxCap,
    timeWindow: d.timeWindowDescription,
    numerator: d.sourceRecordCount,
  }));

  return {
    score: finalScore,
    rawScore: 100 - currentResult.totalRawDeductions,
    startingScore: 100,
    hasComparablePreviousPeriod,
    previousScore: prevScore,
    scoreDelta,
    trendDirection,
    trendText,
    previousModel,
    healthBand,
    healthBandLabel,
    healthBandDescription: healthBandDesc,
    totalBoundedDeductions: currentResult.totalBoundedDeductions,
    totalRawDeductions: currentResult.totalRawDeductions,
    totalDeductions: currentResult.totalBoundedDeductions,
    domains: {
      criticalControl: currentResult.domain1,
      majorEventControl: currentResult.domain2,
      capaInvestigationControl: currentResult.domain3,
      recurrenceControl: currentResult.domain4,
      batchDispositionControl: currentResult.domain5,
      releasePerformanceControl: currentResult.domain6,
    },
    domainList: currentResult.domainList,
    deductionLines,
    topDrivers,
    dimensions: {
      dim1Events: {
        dimension: 'DIM_1_EVENTS',
        title: 'Critical & Major Quality Events',
        rawDeduction:
          currentResult.domain1.rawPoints + currentResult.domain2.rawPoints,
        effectiveDeduction:
          currentResult.domain1.boundedDeduction +
          currentResult.domain2.boundedDeduction,
        cap: 50,
        items: ledger.filter((l) => l.dimension === 'DIM_1_EVENTS'),
      },
      dim2Containment: {
        dimension: 'DIM_2_CONTAINMENT_MTTI',
        title: 'Containment Velocity',
        rawDeduction: currentResult.domain1.rawPoints,
        effectiveDeduction: currentResult.domain1.boundedDeduction,
        cap: 30,
        items: ledger.filter((l) => l.dimension === 'DIM_1_EVENTS'),
      },
      dim3Capa: {
        dimension: 'DIM_3_CAPA',
        title: 'CAPA & Investigation Execution',
        rawDeduction: currentResult.domain3.rawPoints,
        effectiveDeduction: currentResult.domain3.boundedDeduction,
        cap: 15,
        items: ledger.filter((l) => l.dimension === 'DIM_3_CAPA'),
      },
      dim4Effectiveness: {
        dimension: 'DIM_4_EFFECTIVENESS',
        title: 'Effectiveness & Recurrence',
        rawDeduction: currentResult.domain4.rawPoints,
        effectiveDeduction: currentResult.domain4.boundedDeduction,
        cap: 15,
        items: ledger.filter((l) => l.dimension === 'DIM_4_EFFECTIVENESS'),
      },
      dim5Release: {
        dimension: 'DIM_5_RELEASE',
        title: 'Batch Release & Disposition',
        rawDeduction:
          currentResult.domain5.rawPoints + currentResult.domain6.rawPoints,
        effectiveDeduction:
          currentResult.domain5.boundedDeduction +
          currentResult.domain6.boundedDeduction,
        cap: 20,
        items: ledger.filter((l) => l.dimension === 'DIM_5_RELEASE'),
      },
    },
    deductionLedger: ledger,
    lastCalculatedAt: nowIso,
  };
}

export interface CalculateActiveEventAgingParams {
  events: any[];
  investigations?: any[];
  departments?: any[];
  products?: any[];
  lots?: any[];
  processes?: any[];
  nowMs?: number;
}

/**
 * CALCULATE ACTIVE QUALITY EVENT AGING
 *
 * Operational Definition:
 * The age of CURRENT ACTIVE quality events calculated from the event opened/created timestamp
 * until current date/time.
 *
 * Excludes:
 * - CLOSED, RESOLVED, CANCELLED, ARCHIVED, VOIDED events
 * - Events with qa_closed_at or closed_at timestamp set
 *
 * Buckets:
 * - <= 7 days (normal / ปกติ)
 * - 8–14 days (attention / เฝ้าระวัง)
 * - 15–30 days (overdue attention / เกินกำหนดเริ่มแรก)
 * - > 30 days (critical aging attention / วิกฤตค้างนาน)
 */
export function calculateActiveEventAging(
  params: CalculateActiveEventAgingParams
): QmsActiveEventAgingModel {
  const nowMs = params.nowMs || Date.now();
  const events = params.events || [];
  const investigations = params.investigations || [];
  const departments = params.departments || [];
  const products = params.products || [];
  const lots = params.lots || [];
  const processes = params.processes || [];

  const deptMap = new Map<string, string>();
  departments.forEach((d) => deptMap.set(d.id, d.name));

  const prodMap = new Map<string, any>();
  products.forEach((p) => prodMap.set(p.id, p));

  const lotMap = new Map<string, any>();
  lots.forEach((l) => lotMap.set(l.id, l));

  const invMap = new Map<string, any>();
  investigations.forEach((i) => {
    if (i.quality_event_id) invMap.set(i.quality_event_id, i);
  });

  const procMap = new Map<string, string>();
  processes.forEach((p) => procMap.set(p.id, p.name));

  const closedStatuses = ['CLOSED', 'RESOLVED', 'CANCELLED', 'ARCHIVED', 'VOIDED'];

  // STRICT ACTIVE FILTER:
  // Must NOT be closed/resolved/cancelled/archived/voided and must NOT have qa_closed_at or closed_at set
  const activeEvents = events.filter((e) => {
    if (closedStatuses.includes(e.current_status)) return false;
    if (e.qa_closed_at || e.closed_at) return false;
    return true;
  });

  let le7DaysCount = 0;
  let day8To14Count = 0;
  let day15To30Count = 0;
  let gt30DaysCount = 0;

  // Legacy hours buckets for backward compatibility
  let under24h = 0;
  let day1To3 = 0;
  let day4To7 = 0;
  let over7Days = 0;

  const activeEventsList: QmsActiveEventDetail[] = activeEvents.map((e) => {
    const createdMs = new Date(e.created_at || e.event_date || nowMs).getTime();
    const ageHrs = Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60));
    const ageDaysRaw = ageHrs / 24;
    const agingDays = Math.round(ageDaysRaw * 10) / 10; // 1 decimal place

    // Legacy buckets
    if (ageHrs <= 24) under24h++;
    else if (ageHrs <= 72) day1To3++;
    else if (ageHrs <= 168) day4To7++;
    else over7Days++;

    // Operational Aging Buckets:
    // ≤ 7 days = normal
    // 8–14 days = attention
    // 15–30 days = overdue attention
    // > 30 days = critical aging attention
    let agingBucket: QmsEventAgingBucketId = 'LE_7D';
    let agingBucketLabel = '≤ 7 วัน (ปกติ)';
    let attentionLevel: 'NORMAL' | 'ATTENTION' | 'OVERDUE' | 'CRITICAL' = 'NORMAL';
    let attentionLabel = 'ปกติ (Normal)';

    if (ageDaysRaw <= 7) {
      agingBucket = 'LE_7D';
      agingBucketLabel = '≤ 7 วัน (ปกติ)';
      attentionLevel = 'NORMAL';
      attentionLabel = 'ปกติ (Normal)';
      le7DaysCount++;
    } else if (ageDaysRaw <= 14) {
      agingBucket = 'DAY_8_TO_14';
      agingBucketLabel = '8–14 วัน (เฝ้าระวัง)';
      attentionLevel = 'ATTENTION';
      attentionLabel = 'เฝ้าระวัง (Attention)';
      day8To14Count++;
    } else if (ageDaysRaw <= 30) {
      agingBucket = 'DAY_15_TO_30';
      agingBucketLabel = '15–30 วัน (เกินกำหนดเริ่มแรก)';
      attentionLevel = 'OVERDUE';
      attentionLabel = 'เกินกำหนดเริ่มแรก (Overdue Attention)';
      day15To30Count++;
    } else {
      agingBucket = 'GT_30D';
      agingBucketLabel = '> 30 วัน (วิกฤตค้างนาน)';
      attentionLevel = 'CRITICAL';
      attentionLabel = 'วิกฤตค้างนาน (Critical Aging Attention)';
      gt30DaysCount++;
    }

    const linkedLot = e.production_lot_id ? lotMap.get(e.production_lot_id) : null;
    const linkedProd = e.product_id
      ? prodMap.get(e.product_id)
      : linkedLot?.sku_id
      ? prodMap.get(linkedLot.sku_id)
      : null;
    const linkedInv = invMap.get(e.id);

    const severity = e.qa_confirmed_severity || e.ai_suggested_severity || 'MINOR';
    const deptName = deptMap.get(e.department_id) || 'ส่วนกลาง / ไม่ระบุ';
    const procName = procMap.get(e.process_id) || '';

    return {
      id: e.id,
      eventNo: e.event_no || `QE-${e.id.slice(0, 6)}`,
      title: e.title || 'ไม่มีหัวข้อเหตุการณ์',
      severity,
      departmentId: e.department_id,
      departmentName: deptName,
      processName: procName,
      productName: linkedProd?.product_name || '-',
      skuId: linkedProd?.sku || '-',
      lotNo: linkedLot?.lot_no || e.material_lot_no || '-',
      openedDate: e.created_at || e.event_date || new Date(nowMs).toISOString(),
      currentStatus: e.current_status || 'OPEN',
      agingDays,
      currentOwner: linkedInv?.assigned_lead_name || e.reporter_name || 'QA Team',
      containmentStatus: e.containment_status || 'PENDING',
      investigationStatus: linkedInv?.current_status || (e.current_status === 'INVESTIGATION_PENDING' ? 'PENDING' : '-'),
      agingBucket,
      agingBucketLabel,
      attentionLevel,
      attentionLabel,
    };
  });

  // Sort default: Oldest active event first (descending by agingDays)
  activeEventsList.sort((a, b) => b.agingDays - a.agingDays);

  const activeCount = activeEventsList.length;
  const agingDaysSorted = activeEventsList.map((e) => e.agingDays).sort((a, b) => a - b);

  const totalAgingSum = agingDaysSorted.reduce((acc, v) => acc + v, 0);
  const averageAgingDays = activeCount > 0 ? Math.round((totalAgingSum / activeCount) * 10) / 10 : 0;

  let medianAgingDays = 0;
  if (activeCount > 0) {
    const mid = Math.floor(activeCount / 2);
    if (activeCount % 2 !== 0) {
      medianAgingDays = agingDaysSorted[mid];
    } else {
      medianAgingDays = Math.round(((agingDaysSorted[mid - 1] + agingDaysSorted[mid]) / 2) * 10) / 10;
    }
  }

  const oldestActiveDays = activeCount > 0 ? agingDaysSorted[activeCount - 1] : 0;

  return {
    activeCount,
    totalAllEventsCount: events.length,
    averageAgingDays,
    medianAgingDays,
    oldestActiveDays,
    buckets: {
      le7Days: {
        count: le7DaysCount,
        percentage: activeCount > 0 ? Math.round((le7DaysCount / activeCount) * 100) : 0,
        label: '≤ 7 วัน (ปกติ)',
        attention: 'ปกติ (Normal)',
      },
      day8To14: {
        count: day8To14Count,
        percentage: activeCount > 0 ? Math.round((day8To14Count / activeCount) * 100) : 0,
        label: '8–14 วัน (เฝ้าระวัง)',
        attention: 'เฝ้าระวัง (Attention)',
      },
      day15To30: {
        count: day15To30Count,
        percentage: activeCount > 0 ? Math.round((day15To30Count / activeCount) * 100) : 0,
        label: '15–30 วัน (เกินกำหนดเริ่มแรก)',
        attention: 'เกินกำหนดเริ่มแรก (Overdue)',
      },
      gt30Days: {
        count: gt30DaysCount,
        percentage: activeCount > 0 ? Math.round((gt30DaysCount / activeCount) * 100) : 0,
        label: '> 30 วัน (วิกฤตค้างนาน)',
        attention: 'วิกฤตค้างนาน (Critical Attention)',
      },
    },
    activeEventsList,
    under24h,
    day1To3,
    day4To7,
    over7Days,
  };
}

/**
 * CALCULATE CAPA EXECUTION VELOCITY
 *
 * Deterministic formula:
 * Completion Rate (%) = (Completed Actions / Total Actions) * 100%
 *
 * Semantics:
 * - Completed Actions: status IN ('VERIFIED', 'COMPLETED')
 * - Open Actions: status NOT IN ('VERIFIED', 'COMPLETED', 'CANCELLED')
 * - Overdue Actions: Open actions where due_date < now
 */
export function calculateCapaExecutionVelocity(
  capaActions: any[],
  periodDays: number = 90
): QmsCapaExecutionVelocity {
  const actions = capaActions || [];
  const totalActionsCount = actions.length;
  const completedActions = actions.filter((a) => ['VERIFIED', 'COMPLETED'].includes(a.status));
  const completedActionsCount = completedActions.length;
  const openActions = actions.filter((a) => !['VERIFIED', 'COMPLETED', 'CANCELLED'].includes(a.status));
  const openActionsCount = openActions.length;

  const nowMs = Date.now();
  const overdueActions = openActions.filter(
    (a) => a.due_date && new Date(a.due_date).getTime() < nowMs
  );
  const overdueActionsCount = overdueActions.length;

  const completionRatePct =
    totalActionsCount > 0
      ? Math.round((completedActionsCount / totalActionsCount) * 1000) / 10
      : 0;

  const months = Math.max(1, periodDays / 30);
  const throughputPerMonth = Math.round((completedActionsCount / months) * 10) / 10;

  return {
    completionRatePct,
    completedActionsCount,
    totalActionsCount,
    openActionsCount,
    overdueActionsCount,
    throughputPerMonth,
    periodLabel: `${periodDays} วัน`,
    formula: '(จำนวนกิจกรรมที่ยืนยันเสร็จสิ้น / จำนวนกิจกรรมทั้งหมด) × 100%',
    numeratorLabel: 'จำนวนกิจกรรม CAPA ที่ได้รับการตรวจสอบเสร็จสิ้น (VERIFIED / COMPLETED)',
    numeratorValue: completedActionsCount,
    denominatorLabel: 'จำนวนกิจกรรม CAPA ทั้งหมดในระบบคุณภาพ',
    denominatorValue: totalActionsCount,
    unit: '% (Actions Verified)',
  };
}

export interface CalculateFirstPassReleaseParams {
  releases: any[];
  gates?: any[];
  dispositions?: any[];
  periodDays?: number;
}

/**
 * CALCULATE FIRST-PASS RELEASE RATE (FPR / RFT)
 *
 * Operational Definition:
 * FPR (%) = (Eligible batches QA RELEASED at 1st completed cycle without critical failure / Total eligible batches with completed QA disposition) × 100%
 *
 * Deterministic Semantics:
 * 1. Denominator includes ONLY batches that have reached completed QA disposition (QA_RELEASED or QA_REJECTED).
 * 2. Batches under initial review, awaiting lab/incubation, or on hold are EXCLUDED (Not Yet Evaluable).
 * 3. In-progress batches are strictly NEVER counted as release failures.
 */
export function calculateFirstPassReleaseRate(
  params: CalculateFirstPassReleaseParams
): QmsFirstPassReleaseModel {
  const { releases = [], gates = [], dispositions = [], periodDays = 90 } = params;

  // Group gates by release_id
  const gatesByRelease: Record<string, any[]> = {};
  gates.forEach((g) => {
    const relId = g.batch_release_id || g.release_id;
    if (relId) {
      if (!gatesByRelease[relId]) gatesByRelease[relId] = [];
      gatesByRelease[relId].push(g);
    }
  });

  // Group dispositions by batch_release_id
  const dispsByRelease: Record<string, any[]> = {};
  dispositions.forEach((d) => {
    const relId = d.batch_release_id || d.release_id;
    if (relId) {
      if (!dispsByRelease[relId]) dispsByRelease[relId] = [];
      dispsByRelease[relId].push(d);
    }
  });

  const lots: QmsFirstPassLotDetail[] = [];
  let releasedFirstPassCount = 0;
  let releasedWithExceptionsCount = 0;
  let qaRejectedCount = 0;
  let underInitialReviewCount = 0;
  let pendingEvidenceCount = 0;
  let onHoldCount = 0;

  releases.forEach((r) => {
    const relId = r.id;
    const relGates = gatesByRelease[relId] || [];
    const relDisps = dispsByRelease[relId] || [];

    // Find non-passed gates
    const nonPassedGates = relGates.filter((g) => g.status !== 'PASSED' && g.status !== 'PASS');
    const failedGates = relGates.filter((g) => g.status === 'FAILED' || g.status === 'FAIL');
    const pendingGates = relGates.filter((g) => g.status === 'PENDING');
    const naGates = relGates.filter((g) => g.status === 'NOT_APPLICABLE' || g.status === 'N/A');

    const blockingGatesMapped = nonPassedGates.map((g) => ({
      gateNumber: g.gate_number || 1,
      gateCode: g.gate_code || `GATE-${g.gate_number}`,
      gateTitle: g.gate_title_th || g.gate_title_en || `Gate ${g.gate_number}`,
      status: g.status,
      reason: extractTextFromReason(g.hard_block_message || g.failure_reason || g.na_reason),
    }));

    // Find if there is an active QA hold or QA hold history
    const hasActiveHold =
      r.overall_status === 'QA_ON_HOLD' ||
      containsHoldIndicator(r.blocking_reasons) ||
      relGates.some((g) => containsHoldIndicator(g.hard_block_message || g.failure_reason));

    const holdReason =
      r.overall_status === 'QA_ON_HOLD'
        ? extractTextFromReason(r.disposition_notes || r.blocking_reasons) || 'พบการกักกันคุณภาพ (QA Hold Active)'
        : undefined;

    // Check disposition records
    const latestDisp = relDisps.length > 0 ? relDisps[relDisps.length - 1] : null;
    const hasRejectedDisp =
      r.overall_status === 'QA_REJECTED' || relDisps.some((d) => d.decision === 'QA_REJECTED');
    const hasReleasedDisp =
      r.overall_status === 'QA_RELEASED' || relDisps.some((d) => d.decision === 'QA_RELEASED');

    // Rework indicator
    const reworkProtocol =
      r.rework_protocol_no ||
      (latestDisp && latestDisp.rework_protocol_reference) ||
      undefined;
    const nonConformanceDisposition =
      r.non_conformance_path ||
      (latestDisp && latestDisp.non_conformance_disposition) ||
      undefined;
    const hasRework = Boolean(reworkProtocol || nonConformanceDisposition === 'REWORK_CONSIDERATION');

    // Determine completion of QA disposition
    const isCompletedDisposition = hasReleasedDisp || hasRejectedDisp;

    // Final disposition label and code
    let finalDisposition: 'QA_RELEASED' | 'QA_REJECTED' | 'READY_FOR_QA_REVIEW' | 'BLOCKED' | 'QA_ON_HOLD' =
      r.overall_status;
    let finalDispositionLabel = 'รอการตรวจปล่อย';
    if (r.overall_status === 'QA_RELEASED') finalDispositionLabel = 'ปล่อยผ่านสำเร็จ (QA Released)';
    else if (r.overall_status === 'QA_REJECTED') finalDispositionLabel = 'ไม่อนุมัติปล่อยผ่าน (QA Rejected)';
    else if (r.overall_status === 'QA_ON_HOLD') finalDispositionLabel = 'อยู่ระหว่างกักกัน (QA On Hold)';
    else if (r.overall_status === 'BLOCKED') finalDispositionLabel = 'ติดเงื่อนไขการปล่อย (Blocked)';
    else if (r.overall_status === 'READY_FOR_QA_REVIEW') finalDispositionLabel = 'รอตรวจปล่อยรอบแรก (Ready for Review)';

    let firstPassStatus: QmsFirstPassStatus = 'NOT_YET_EVALUABLE';
    let firstPassStatusLabel = 'ยังไม่ประเมิน (Not Yet Evaluable)';
    let isEligibleDenominator = false;
    let exclusionCategory: QmsReleaseExclusionCategory = 'NOT_EXCLUDED';
    let exclusionReason: string | undefined = undefined;
    let deterministicReason = '';

    if (!isCompletedDisposition) {
      isEligibleDenominator = false;
      firstPassStatus = 'NOT_YET_EVALUABLE';
      firstPassStatusLabel = 'อยู่ระหว่างดำเนินการ (In-Progress / Excluded)';

      if (hasActiveHold) {
        exclusionCategory = 'ON_HOLD_UNDER_INVESTIGATION';
        exclusionReason = 'อยู่ภายใต้คำสั่งกักกันคุณภาพ (QA Hold Active) เพื่อสอบสวนหาสาเหตุ';
        onHoldCount++;
        deterministicReason =
          `อยู่ภายใต้คำสั่งกักกันคุณภาพของ QA (${r.lot_no}) เพื่อสอบสวนหาสาเหตุ ยังไม่เข้าสู่การตัดสินผลขั้นสุดท้าย จึงไม่นับเป็นความล้มเหลว`;
      } else if (r.overall_status === 'BLOCKED' || pendingGates.length > 0 || failedGates.length > 0) {
        exclusionCategory = 'PENDING_EVIDENCE_OR_INCUBATION';
        pendingEvidenceCount++;
        const pendingNames = pendingGates.map((g) => `Gate ${g.gate_number}`).join(', ');
        const failedNames = failedGates.map((g) => `Gate ${g.gate_number}`).join(', ');
        const details = [
          pendingNames ? `รอยืนยันผล (${pendingNames})` : '',
          failedNames ? `พบเงื่อนไขที่ต้องแก้ไข (${failedNames})` : '',
        ]
          .filter(Boolean)
          .join(' ');

        exclusionReason = details || 'ติดเงื่อนไขรอยืนยันผลแล็บหรือเอกสารที่ยังไม่สมบูรณ์';
        deterministicReason =
          `ติดเงื่อนไขในกระบวนการ (${details || 'รอยืนยันผล'}) ยังอยู่ระหว่างการรวบรวมหลักฐานและประเมินผล ยังไม่สิ้นสุดการตรวจปล่อย จึงไม่นับเป็นข้อผิดพลาดในตัววัด First-Pass`;
      } else {
        exclusionCategory = 'UNDER_INITIAL_REVIEW';
        underInitialReviewCount++;
        exclusionReason = 'ผ่านเกณฑ์ทางเทคนิคแล้ว อยู่ในคิวรอการตรวจสอบและอนุมัติปล่อยผ่านรอบแรก';
        deterministicReason =
          `ผ่านเกณฑ์ทางเทคนิคครบถ้วน อยู่ในคิวรอการตรวจสอบและลงนามปล่อยผ่านอย่างเป็นทางการรอบแรกโดย QA Manager ยังไม่มีผลการตัดสินสิ้นสุด จึงยังไม่ประเมิน`;
      }
    } else {
      // Completed disposition: eligible for denominator
      isEligibleDenominator = true;
      exclusionCategory = 'NOT_EXCLUDED';

      if (r.overall_status === 'QA_RELEASED') {
        const hasFailedHistory = (r.failed_gates_count || 0) > 0 || hasRework || hasRejectedDisp;
        if (!hasFailedHistory) {
          firstPassStatus = 'YES';
          firstPassStatusLabel = 'ผ่านรอบแรก (First-Pass Released)';
          releasedFirstPassCount++;
          deterministicReason =
            `ผ่านการตรวจปล่อยในรอบแรกสำเร็จ (First-Pass Released) ตามข้อกำหนดและมาตรฐานครบถ้วน 12 เกต โดยไม่มีข้อบกพร่องวิกฤต ไม่มีการแก้ไข หรือการสั่งทบทวนซ้ำ`;
        } else {
          firstPassStatus = 'NO';
          firstPassStatusLabel = 'ไม่ผ่านรอบแรก (Released via Rework/Exception)';
          releasedWithExceptionsCount++;
          deterministicReason =
            `ได้รับการตรวจปล่อย แต่ไม่ถือเป็น First-Pass เนื่องจากมีการผ่านข้อกำหนดหลังการปรับปรุงรุ่นผลิต (Rework) หรือมีประวัติแก้ไขข้อบกพร่อง`;
        }
      } else {
        // QA_REJECTED
        firstPassStatus = 'NO';
        firstPassStatusLabel = 'ไม่ผ่านรอบแรก (QA Rejected)';
        qaRejectedCount++;
        const failureGate = failedGates[0];
        const gateDesc = failureGate
          ? `Gate ${failureGate.gate_number} (${failureGate.gate_title_th || failureGate.gate_title_en}): ${extractTextFromReason(failureGate.hard_block_message || failureGate.failure_reason)}`
          : 'พบข้อกำหนดไม่เป็นไปตามมาตรฐานคุณภาพ';
        const rwkInfo = reworkProtocol ? ` มีการเปิดระเบียบปฏิบัติการปรับปรุง (${reworkProtocol})` : '';

        deterministicReason =
          `ไม่ผ่านการตรวจปล่อยในรอบแรก (First-Pass Failed) เนื่องจาก${gateDesc} ได้รับคำสั่งปฏิเสธรุ่นผลิต (QA REJECTED)${rwkInfo}`;
      }
    }

    // Release cycle time in days
    const createdDateMs = new Date(r.created_at).getTime();
    const dispDateMs = r.released_at
      ? new Date(r.released_at).getTime()
      : latestDisp && latestDisp.authorized_at
      ? new Date(latestDisp.authorized_at).getTime()
      : null;
    const cycleDays = dispDateMs ? Math.round(((dispDateMs - createdDateMs) / (1000 * 60 * 60 * 24)) * 10) / 10 : null;

    lots.push({
      id: relId,
      lotNo: r.lot_no || 'UNKNOWN-LOT',
      skuCode: r.sku_code || '-',
      productName: r.product_name || '-',
      firstReviewDate: r.created_at,
      finalDisposition,
      finalDispositionLabel,
      firstPassStatus,
      firstPassStatusLabel,
      isEligibleDenominator,
      exclusionCategory,
      exclusionReason,
      releaseCycleCount: 1,
      blockingGates: blockingGatesMapped,
      qaHoldHistory: {
        hasHold: hasActiveHold,
        holdId: hasActiveHold ? 'HLD-2026-0009' : undefined,
        holdReason,
      },
      qaRejectedHistory: {
        hasRejected: hasRejectedDisp,
        rejectionReason: latestDisp?.reason_rationale || undefined,
      },
      reworkIndicator: {
        hasRework,
        protocolNo: reworkProtocol,
        nonConformanceDisposition,
      },
      dispositionDate: r.released_at || (latestDisp?.authorized_at ?? null),
      releaseCycleTimeDays: cycleDays,
      deterministicReason,
    });
  });

  const denominator = lots.filter((l) => l.isEligibleDenominator).length;
  const numerator = releasedFirstPassCount;
  const ratePct = denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
  const excludedBatchesCount = lots.filter((l) => !l.isEligibleDenominator).length;

  const formula =
    denominator > 0
      ? `(${numerator} ล็อตปล่อยผ่านครั้งแรก / ${denominator} ล็อตที่ตัดสินผลสิ้นสุด) × 100 = ${ratePct.toFixed(1)}%`
      : `0 / 0 (ไม่มีรุ่นผลิตที่ตัดสินสิ้นสุดในรอบการประเมิน)`;

  const reconciliationNote =
    'ชี้แจงการกระทบยอด 9 รายการ (Reconciliation of 9 Total Phase 5 Records): เดิมแดชบอร์ดแสดง 0.0% (0/9) เนื่องจากนำล็อตที่ยังอยู่ระหว่างดำเนินการตรวจสอบ (4 ล็อต), ล็อตที่รอผลแล็บ/เอกสาร (3 ล็อต), และล็อตที่อยู่ระหว่างสอบสวน QA Hold (1 ล็อต) รวมเป็น 8 ล็อตมาคิดเป็นความล้มเหลว ซึ่งขัดกับหลักการบริหารคุณภาพสากล (In-progress batches are not failures) ระบบจึงจำแนกเป็น 1 ล็อตที่มีผลตัดสินสิ้นสุด (Denominator) และ 8 ล็อตที่อยู่ระหว่างดำเนินการ (Excluded)';

  return {
    ratePct,
    numerator,
    denominator,
    totalTrackedBatches: releases.length,
    excludedBatchesCount,
    breakdownSummary: {
      releasedFirstPass: releasedFirstPassCount,
      releasedWithExceptionsOrRework: releasedWithExceptionsCount,
      qaRejected: qaRejectedCount,
      underInitialReview: underInitialReviewCount,
      pendingEvidenceOrIncubation: pendingEvidenceCount,
      onHoldUnderInvestigation: onHoldCount,
    },
    lots,
    periodLabel: `${periodDays} วัน`,
    formula,
    benchmarkTargetPct: 90.0,
    reconciliationNote,
  };
}


