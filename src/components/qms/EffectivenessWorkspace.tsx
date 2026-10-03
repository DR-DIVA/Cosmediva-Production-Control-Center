"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar, 
  User, 
  Building2, 
  Search, 
  Link2, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  History,
  Eye,
  Plus,
  RefreshCw,
  X,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
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
  QmsEvaluationStatus,
  QmsQaDispositionPath,
  QmsActionType,
  QmsCapaRevision
} from '@/types/qms';
import { 
  getEffectivenessWorkspaceData,
  createEffectivenessPlan,
  addEffectivenessCriterion,
  recordEffectivenessResult,
  detectPotentialRecurrences,
  reviewRecurrence,
  submitFinalEffectivenessDecision,
  createControlledCapaRevision
} from '@/app/actions/qms_effectiveness';

const DISPOSITION_OPTIONS: { id: QmsQaDispositionPath; label: string; sub: string }[] = [
  {
    id: 'ADDITIONAL_CAPA_ACTION',
    label: 'A. ADDITIONAL CAPA ACTION',
    sub: 'เพิ่มมาตรการใน CAPA เดิม (ดำเนินการผ่าน Controlled CAPA Revision)'
  },
  {
    id: 'REVISE_CAPA',
    label: 'B. REVISE CAPA',
    sub: 'ทบทวน/ปรับแผน CAPA ภาพรวม'
  },
  {
    id: 'ADDITIONAL_INVESTIGATION',
    label: 'C. ADDITIONAL INVESTIGATION',
    sub: 'เปิดการสอบสวนเพิ่มเติม (เปิด Investigation Case ใหม่หรือขยายผล)'
  },
  {
    id: 'REASSESS_ROOT_CAUSE',
    label: 'D. REASSESS ROOT CAUSE',
    sub: 'ทบทวน Root Cause เดิม (5-Why / Fishbone Re-evaluation)'
  },
  {
    id: 'EXTEND_MONITORING',
    label: 'E. EXTEND MONITORING',
    sub: 'ขยายขอบเขต/ระยะเวลาติดตามประสิทธิผล (เพิ่มจำนวนแบทช์เฝ้าระวังหรือขยายกำหนดวันสรุป)'
  },
  {
    id: 'OTHER_CONTROLLED_ACTION',
    label: 'F. OTHER CONTROLLED ACTION',
    sub: 'แนวทางอื่นพร้อมระบุเหตุผลควบคุมโดย QA'
  }
];

interface EffectivenessWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  capaId: string;
  currentUser?: { id: string; name: string; role: string };
  onSuccess?: () => void;
}

export default function EffectivenessWorkspace({
  isOpen,
  onClose,
  capaId,
  currentUser = { id: '029f20ec-49b2-469c-aa12-657854a636de', name: 'คุณวิภาดา (QA Manager)', role: 'QA Manager' },
  onSuccess
}: EffectivenessWorkspaceProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QmsEffectivenessWorkspaceData | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'criteria' | 'monitoring' | 'recurrence' | 'decision' | 'audit'>('monitoring');

  // Plan Creation Form state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: '',
    objective: '',
    scopeType: 'CONSECUTIVE_BATCHES' as QmsEffectivenessScopeType,
    scopeTargetCount: 5,
    scopeDescription: '',
    targetDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  });

  // New Criterion Form state
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [criterionForm, setCriterionForm] = useState({
    criterionType: 'QC_SPEC_RESULT' as QmsEffectivenessCriterionType,
    title: '',
    description: '',
    measurableTarget: ''
  });

  // Record Result Form state
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultForm, setResultForm] = useState({
    criterionId: '',
    sampleNo: 1,
    batchLotNo: '',
    measuredValue: '',
    specificationTarget: '',
    evaluationStatus: 'PASS' as QmsEvaluationStatus,
    resultSource: 'LINKED_SYSTEM' as 'LINKED_SYSTEM' | 'MANUAL_ENTRY',
    linkedRecordType: 'QC_RESULT',
    linkedRecordRef: '',
    notes: ''
  });

  // Recurrence Review Form state
  const [reviewingRecurrence, setReviewingRecurrence] = useState<QmsCapaRecurrenceReview | null>(null);
  const [recurrenceNotes, setRecurrenceNotes] = useState('');

  // Final Decision Form state
  const [decision, setDecision] = useState<QmsEffectivenessDecision>('EFFECTIVE');
  const [qaConclusion, setQaConclusion] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [earlyTerminationReason, setEarlyTerminationReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Controlled QA Follow-up Disposition state (A through F)
  const [selectedDispositions, setSelectedDispositions] = useState<QmsQaDispositionPath[]>([]);
  const [dispositionRationale, setDispositionRationale] = useState('');
  const [extendTargetCount, setExtendTargetCount] = useState<number>(8);
  const [extendDueDate, setExtendDueDate] = useState<string>(
    new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0]
  );

  // Controlled CAPA Revision Modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionForm, setRevisionForm] = useState({
    revisionReason: '',
    actionType: 'CORRECTIVE_ACTION' as QmsActionType,
    title: '',
    description: '',
    responsibleOwnerId: currentUser.id,
    responsibleOwnerName: currentUser.name,
    departmentName: 'Production / ฝ่ายผลิต',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    evidenceRequired: 'รายงานผลการดำเนินการและหลักฐานทวนสอบ',
    approverId: '029f20ec-49b2-469c-aa12-657854a636de',
    approverName: 'คุณวิภาดา (QA Manager)'
  });
  const [submittingRevision, setSubmittingRevision] = useState(false);

  // Load Data
  const loadWorkspaceData = async () => {
    if (!capaId) return;
    setLoading(true);
    try {
      const res = await getEffectivenessWorkspaceData(capaId);
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.plan) {
          if (res.data.plan.final_decision) {
            setDecision(res.data.plan.final_decision);
            setQaConclusion(res.data.plan.qa_conclusion || '');
            setSelectedDispositions(res.data.plan.qa_disposition_paths || []);
            setDispositionRationale(res.data.plan.qa_disposition_rationale || '');
            setActiveTab('decision');
          } else {
            setActiveTab(res.data.summary.is_ready_for_review ? 'decision' : 'monitoring');
          }
        } else {
          setActiveTab('plan');
        }
      } else {
        toast.error(res.error || 'โหลดข้อมูลพื้นที่ประเมินประสิทธิผลล้มเหลว');
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && capaId) {
      loadWorkspaceData();
    }
  }, [isOpen, capaId]);

  const capa = data?.capa;
  const plan = data?.plan;
  const criteria = data?.criteria || [];
  const results = data?.results || [];
  const recurrenceReviews = data?.recurrence_reviews || [];
  const summary = data?.summary;

  // ======================================================================
  // HARD CLOSURE GATES EVALUATION (ISO 22716 / Cosmetics GMP Governance)
  // ======================================================================
  const totalCapaActions = capa?.actions?.length || 0;
  const verifiedCapaActions = capa?.actions?.filter(a => a.status === 'VERIFIED').length || 0;
  const isGate1Phase3Pass = totalCapaActions > 0 && verifiedCapaActions === totalCapaActions;

  const plannedScopeCount = plan?.scope_target_count || 5;
  const evaluatedSamplesCount = summary?.samples_evaluated || 0;
  const isGate2ScopePass = plannedScopeCount > 0 && evaluatedSamplesCount >= plannedScopeCount;

  const failedSamplesCount = summary?.samples_failed || 0;
  const failedCriteriaCount = summary?.failed_criteria || 0;
  const isGate3ResultsPass = evaluatedSamplesCount > 0 && failedSamplesCount === 0 && failedCriteriaCount === 0;

  const confirmedRecurrencesCount = summary?.confirmed_recurrences_count || 0;
  const potentialRecurrencesCount = summary?.potential_recurrences_count || 0;
  const isGate4RecurrencePass = confirmedRecurrencesCount === 0 && potentialRecurrencesCount === 0;

  const hasEvidencePass = evaluatedSamplesCount > 0 && results.length > 0;
  const isGate6ConclusionPass = (qaConclusion || '').trim().length >= 15;

  // Gate 1 through 5 determine whether EFFECTIVE can be chosen
  const isEffectiveEligible = isGate1Phase3Pass && isGate2ScopePass && isGate3ResultsPass && isGate4RecurrencePass && hasEvidencePass;

  // Specific blocking reasons
  const blockingReasons: string[] = [];
  if (!isGate1Phase3Pass) {
    blockingReasons.push(`มาตรการ Phase 3 ยังไม่ผ่านตรวจรับรองครบ 100% (${verifiedCapaActions}/${totalCapaActions})`);
  }
  if (!isGate2ScopePass) {
    blockingReasons.push(`เก็บผลตัวอย่างยังไม่ครบตามขอบเขต (${evaluatedSamplesCount}/${plannedScopeCount} แบทช์)`);
  }
  if (!isGate3ResultsPass) {
    blockingReasons.push(`มีผลการติดตามอย่างน้อย ${failedSamplesCount > 0 ? failedSamplesCount : 1} รายการไม่ผ่านเกณฑ์ (พบผล FAIL หรือหลุด Spec)`);
  }
  if (confirmedRecurrencesCount > 0) {
    blockingReasons.push(`พบเหตุการณ์ที่ยืนยันว่าเกิดซ้ำ (${confirmedRecurrencesCount} รายการ)`);
  } else if (potentialRecurrencesCount > 0) {
    blockingReasons.push(`มีข้อสงสัยการเกิดซ้ำรอ QA ตัดสิน (${potentialRecurrencesCount} รายการ)`);
  }
  if (!hasEvidencePass) {
    blockingReasons.push('ยังไม่มีการบันทึกผลการติดตามหรือหลักฐานเชิงประจักษ์');
  }

  const primaryBlockingReason = blockingReasons[0] || 'เงื่อนไขความพร้อมในการปิดเคสยังไม่ครบถ้วน';

  // Automatically prevent decision from being EFFECTIVE when gates are unmet
  useEffect(() => {
    if (data?.plan && !data.plan.final_decision) {
      if (!isEffectiveEligible && decision === 'EFFECTIVE') {
        setDecision('PARTIALLY_EFFECTIVE');
      }
    }
  }, [isEffectiveEligible, decision, data?.plan]);

  if (!isOpen) return null;

  // Handle Plan Creation
  const handleCreatePlan = async () => {
    if (!planForm.title) {
      toast.error('กรุณาระบุชื่อแผนการติดตามประสิทธิผล');
      return;
    }
    const res = await createEffectivenessPlan({
      capaId,
      title: planForm.title,
      objective: planForm.objective,
      scopeType: planForm.scopeType,
      scopeTargetCount: Number(planForm.scopeTargetCount) || 5,
      scopeDescription: planForm.scopeDescription,
      targetDueDate: planForm.targetDueDate,
      responsibleOwnerId: currentUser.id,
      responsibleOwnerName: currentUser.name,
      userId: currentUser.id,
      userName: currentUser.name
    });

    if (res.success) {
      toast.success('สร้างแผนติดตามประสิทธิผลเรียบร้อยแล้ว');
      setIsPlanModalOpen(false);
      loadWorkspaceData();
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || 'สร้างแผนล้มเหลว');
    }
  };

  // Handle Add Criterion
  const handleAddCriterion = async () => {
    if (!plan) return;
    if (!criterionForm.title || !criterionForm.measurableTarget) {
      toast.error('กรุณาระบุชื่อเกณฑ์และเป้าหมายที่วัดผลได้');
      return;
    }

    const res = await addEffectivenessCriterion({
      planId: plan.id,
      capaId,
      criterionType: criterionForm.criterionType,
      title: criterionForm.title,
      description: criterionForm.description,
      measurableTarget: criterionForm.measurableTarget,
      userId: currentUser.id,
      userName: currentUser.name
    });

    if (res.success) {
      toast.success('เพิ่มเกณฑ์การวัดผลสำเร็จ');
      setIsCriterionModalOpen(false);
      setCriterionForm({ criterionType: 'QC_SPEC_RESULT', title: '', description: '', measurableTarget: '' });
      loadWorkspaceData();
    } else {
      toast.error(res.error || 'เพิ่มเกณฑ์ล้มเหลว');
    }
  };

  // Handle Record Result
  const handleRecordResult = async () => {
    if (!plan) return;
    if (!resultForm.measuredValue || !resultForm.specificationTarget) {
      toast.error('กรุณาระบุผลการวัดและค่าเป้าหมายตามมาตรฐาน');
      return;
    }

    const res = await recordEffectivenessResult({
      planId: plan.id,
      capaId,
      criterionId: resultForm.criterionId || undefined,
      sampleNo: Number(resultForm.sampleNo),
      batchLotNo: resultForm.batchLotNo,
      resultSource: resultForm.resultSource,
      linkedRecordType: resultForm.linkedRecordType,
      linkedRecordRef: resultForm.linkedRecordRef,
      measuredValue: resultForm.measuredValue,
      specificationTarget: resultForm.specificationTarget,
      evaluationStatus: resultForm.evaluationStatus,
      notes: resultForm.notes,
      userId: currentUser.id,
      userName: currentUser.name
    });

    if (res.success) {
      toast.success(`บันทึกผลตัวอย่างที่ ${resultForm.sampleNo} เรียบร้อยแล้ว`);
      setIsResultModalOpen(false);
      loadWorkspaceData();
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || 'บันทึกผลล้มเหลว');
    }
  };

  // Handle Detect Recurrence
  const handleDetectRecurrences = async () => {
    toast.loading('กำลังสแกนเหตุการณ์คุณภาพที่เกี่ยวข้องด้วย Similar Event Intelligence...');
    const res = await detectPotentialRecurrences(capaId);
    toast.dismiss();
    if (res.success) {
      if (res.detectedCount > 0) {
        toast.warning(`ตรวจพบข้อสงสัยการเกิดซ้ำ ${res.detectedCount} รายการ — โปรดตรวจสอบและยืนยัน`);
      } else {
        toast.success('ไม่พบประวัติการเกิดซ้ำของผลิตภัณฑ์หรืออุปกรณ์นี้ในช่วงเวลาติดตาม');
      }
      loadWorkspaceData();
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการตรวจสอบการเกิดซ้ำ');
    }
  };

  // Handle Review Recurrence
  const handleReviewRecurrence = async (decisionType: 'CONFIRMED_RECURRENCE' | 'REJECTED_RECURRENCE') => {
    if (!reviewingRecurrence) return;
    if (!recurrenceNotes || recurrenceNotes.trim().length < 10) {
      toast.error('กรุณาระบุบันทึกเหตุผลการประเมินอย่างน้อย 10 ตัวอักษร');
      return;
    }

    const res = await reviewRecurrence({
      reviewId: reviewingRecurrence.id,
      capaId,
      decision: decisionType,
      notes: recurrenceNotes,
      userId: currentUser.id,
      userName: currentUser.name
    });

    if (res.success) {
      toast.success(`บันทึกการประเมินการเกิดซ้ำ: ${decisionType === 'CONFIRMED_RECURRENCE' ? 'ยืนยันเกิดซ้ำ' : 'ไม่เกี่ยวข้อง'}`);
      setReviewingRecurrence(null);
      setRecurrenceNotes('');
      loadWorkspaceData();
    } else {
      toast.error(res.error || 'บันทึกล้มเหลว');
    }
  };

  // Handle Final Decision
  const handleSubmitFinalDecision = async () => {
    if (!plan) return;
    if (!qaConclusion || qaConclusion.trim().length < 15) {
      toast.error('กรุณาระบุข้อสรุปผลการประเมินประสิทธิผลโดย QA อย่างน้อย 15 ตัวอักษร');
      return;
    }

    if (decision !== 'EFFECTIVE') {
      if (selectedDispositions.length === 0) {
        toast.error('กรุณาเลือกแนวทางการพิจารณาดำเนินการต่อโดย QA (QA Follow-up Disposition) อย่างน้อย 1 ข้อ');
        return;
      }
      if (!dispositionRationale || dispositionRationale.trim().length < 15) {
        toast.error('กรุณาระบุเหตุผลการพิจารณาดำเนินการต่อโดย QA (QA Disposition Rationale) อย่างน้อย 15 ตัวอักษร');
        return;
      }
    }

    setSubmittingDecision(true);
    try {
      const res = await submitFinalEffectivenessDecision({
        planId: plan.id,
        capaId,
        decision,
        qaConclusion,
        supportingEvidenceSummary: evidenceSummary || `ประเมินผลตัวอย่างครบ ${summary?.samples_passed}/${summary?.total_samples_planned} แบทช์`,
        earlyTerminationReason: earlyTerminationReason || undefined,
        dispositionPaths: decision !== 'EFFECTIVE' ? selectedDispositions : undefined,
        dispositionRationale: decision !== 'EFFECTIVE' ? dispositionRationale : undefined,
        extendTargetCount: (decision !== 'EFFECTIVE' && selectedDispositions.includes('EXTEND_MONITORING')) ? extendTargetCount : undefined,
        extendDueDate: (decision !== 'EFFECTIVE' && selectedDispositions.includes('EXTEND_MONITORING')) ? extendDueDate : undefined,
        userId: currentUser.id,
        userName: currentUser.name
      });

      if (res.success) {
        if (decision === 'EFFECTIVE') {
          toast.success('🎉 ยืนยันประสิทธิผล (EFFECTIVE) — ปิดเคส CAPA สมบูรณ์ตามมาตรฐาน ISO 22716');
        } else {
          toast.warning(`บันทึกผล ${decision}: บันทึกแนวทาง QA Disposition สำเร็จ — ไม่มีการสร้างมาตรการอัตโนมัติ`);
        }
        loadWorkspaceData();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || 'บันทึกผลการตัดสินล้มเหลว');
      }
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Handle Controlled CAPA Revision
  const handleCreateRevision = async () => {
    if (!revisionForm.title || revisionForm.title.trim().length < 5) {
      toast.error('กรุณาระบุชื่อมาตรการใหม่อย่างน้อย 5 ตัวอักษร');
      return;
    }
    if (!revisionForm.description || revisionForm.description.trim().length < 10) {
      toast.error('กรุณาระบุรายละเอียดมาตรการอย่างน้อย 10 ตัวอักษร');
      return;
    }
    if (!revisionForm.revisionReason || revisionForm.revisionReason.trim().length < 15) {
      toast.error('กรุณาระบุเหตุผลการออกฉบับแก้ไขแผน CAPA อย่างน้อย 15 ตัวอักษร');
      return;
    }

    setSubmittingRevision(true);
    try {
      const res = await createControlledCapaRevision({
        capaId,
        planId: plan?.id,
        revisionReason: revisionForm.revisionReason,
        effectivenessDecisionRef: plan?.plan_no || undefined,
        action: {
          actionType: revisionForm.actionType,
          title: revisionForm.title,
          description: revisionForm.description,
          responsibleOwnerId: revisionForm.responsibleOwnerId,
          responsibleOwnerName: revisionForm.responsibleOwnerName,
          departmentName: revisionForm.departmentName,
          dueDate: revisionForm.dueDate,
          evidenceRequired: revisionForm.evidenceRequired
        },
        userId: currentUser.id,
        userName: currentUser.name,
        approvedBy: revisionForm.approverId,
        approvedByName: revisionForm.approverName
      });

      if (res.success) {
        toast.success(`🎉 อนุมัติแผน CAPA ฉบับแก้ไขที่ ${res.revisionNo} และเพิ่มมาตรการใหม่อย่างเป็นทางการเรียบร้อยแล้ว`);
        setIsRevisionModalOpen(false);
        loadWorkspaceData();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || 'ออกฉบับแก้ไขล้มเหลว');
      }
    } finally {
      setSubmittingRevision(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] h-[94vh] p-0 flex flex-col gap-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-[#D4AF37]/30 shadow-2xl">
        
        {/* HEADER BAR */}
        <DialogHeader className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>พื้นที่ประเมินประสิทธิผลและติดตามการเกิดซ้ำ (Effectiveness Workspace)</span>
                  <Badge variant="outline" className="font-mono text-xs bg-purple-50 text-purple-700 border-purple-300">
                    {capa?.capa_no || 'CAPA'}
                  </Badge>
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>"สิ่งที่แก้ไปได้ผลจริงหรือยัง?" • ISO 22716 Cosmetics GMP Closed-Loop Governance</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {capa?.current_status === 'CLOSED_EFFECTIVE' ? (
              <Badge className="bg-emerald-600 text-white font-bold px-3 py-1 text-xs">
                ✅ ปิดเคสแล้ว (CLOSED — EFFECTIVE)
              </Badge>
            ) : capa?.current_status === 'REOPENED_FOR_ACTION' ? (
              <Badge className="bg-amber-600 text-white font-bold px-3 py-1 text-xs">
                ⚠️ ต้องแก้ไขเพิ่ม (REOPENED FOR ACTION)
              </Badge>
            ) : (
              <Badge className="bg-purple-600 text-white font-bold px-3 py-1 text-xs">
                ⏳ รอประเมินประสิทธิผล (AWAITING EFFECTIVENESS)
              </Badge>
            )}

            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* WORKSPACE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-sm">กำลังโหลดข้อมูลพื้นที่ประเมินประสิทธิผล...</p>
            </div>
          ) : (
            <>
              {/* 1. AUTO-LINKED CAPA & ROOT CAUSE CONTEXT CARD */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <span>บริบทที่เชื่อมโยงอัตโนมัติ (Zero-Retyping Linked Context)</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                    เหตุการณ์: {capa?.quality_event?.event_no} • สืบสวน: {capa?.investigation?.investigation_no}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">หัวข้อ CAPA & ปัญหา</span>
                    <strong className="text-slate-800 dark:text-slate-100">{capa?.title}</strong>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{capa?.problem_statement}</p>
                  </div>
                  <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900/40">
                    <span className="text-purple-600 block text-[10px] font-semibold">สาเหตุรากเหง้าที่ยืนยัน (Confirmed Root Cause)</span>
                    <strong className="text-purple-900 dark:text-purple-200 font-bold">{capa?.root_cause_summary}</strong>
                    <span className="text-[10px] text-purple-700 block mt-0.5 font-medium">หมวด 6M: {capa?.root_cause_category || 'MACHINE'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">สายการผลิต / อุปกรณ์ที่เกี่ยวข้อง</span>
                    <strong className="text-slate-800 dark:text-slate-100">
                      {capa?.quality_event?.equipment_code || 'ถังผสม T-02'} ({capa?.snapshot_context?.product_sku || 'SKU-SERUM-01'})
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      มาตรการปฏิบัติการ: {capa?.actions?.filter(a => a.status === 'VERIFIED').length}/{capa?.actions?.length} ผ่านตรวจรับรอง (100%)
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. MAIN WORKSPACE TABS */}
              <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full space-y-4">
                <TabsList className="bg-slate-200/70 dark:bg-slate-800 p-1 flex items-center justify-start overflow-x-auto w-full">
                  <TabsTrigger value="plan" className="text-xs font-bold gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    1. แผนติดตาม (Effectiveness Plan)
                  </TabsTrigger>
                  <TabsTrigger value="criteria" className="text-xs font-bold gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    2. เกณฑ์วัดผล ({criteria.length})
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="text-xs font-bold gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    3. บันทึกผลตัวอย่าง ({summary?.samples_evaluated}/{summary?.total_samples_planned || 5})
                  </TabsTrigger>
                  <TabsTrigger value="recurrence" className="text-xs font-bold gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    4. ตรวจสอบการเกิดซ้ำ (Recurrence Radar)
                    {summary?.potential_recurrences_count! > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full font-bold ml-1">
                        {summary?.potential_recurrences_count}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="decision" className="text-xs font-bold gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    5. สรุปผลและปิดเคส (QA Decision)
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs font-bold gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Audit Trail
                  </TabsTrigger>
                </TabsList>

                {/* ================= TAB 1: EFFECTIVENESS PLAN ================= */}
                <TabsContent value="plan" className="space-y-4">
                  {!plan ? (
                    <Card className="border-dashed border-2 border-purple-200 bg-purple-50/20 text-center py-12">
                      <CardContent className="space-y-3">
                        <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">ยังไม่ได้กำหนดแผนการติดตามประสิทธิผล</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          เมื่อมาตรการทั้งหมดผ่านการตรวจรับรอง 100% แล้ว QA ต้องกำหนดแผนติดตามผลตามขอบเขตความเสี่ยง (Risk-Based Scope)
                        </p>
                        <Button 
                          onClick={() => {
                            setPlanForm({
                              title: `แผนติดตามประสิทธิผล ${capa?.capa_no}: ควบคุมอุณหภูมิและความหนืด Bulk`,
                              objective: `ยืนยันว่าการล้างหัวโพรบ RTD และการตรวจวัดคู่อิสระป้องกันปัญหาความหนืดตกสเปกได้อย่างถาวร`,
                              scopeType: 'CONSECUTIVE_BATCHES',
                              scopeTargetCount: 5,
                              scopeDescription: 'ติดตามผลการผลิตถังผสม T-02 จำนวน 5 แบทช์การผลิตต่อเนื่อง',
                              targetDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
                            });
                            setIsPlanModalOpen(true);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> + กำหนดแผนติดตามประสิทธิผล (Effectiveness Plan)
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader className="bg-slate-50/70 border-b py-3 px-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <span>{plan.plan_no}: {plan.title}</span>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                              {plan.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            ผู้รับผิดชอบการติดตาม: <strong>{plan.responsible_owner_name}</strong> • ครบกำหนดทบทวน: <strong>{plan.target_due_date}</strong>
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-slate-400 font-semibold text-[11px]">วัตถุประสงค์การติดตาม (Objective)</span>
                            <p className="text-slate-700 font-medium p-2.5 bg-slate-50 rounded border">{plan.objective}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-slate-400 font-semibold text-[11px]">ขอบเขตการติดตาม (Monitoring Scope)</span>
                            <div className="p-2.5 bg-slate-50 rounded border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-700">{plan.scope_type}</span>
                                <Badge variant="outline" className="text-[10px]">เป้าหมาย {plan.scope_target_count} แบทช์</Badge>
                              </div>
                              <p className="text-slate-600 text-[11px]">{plan.scope_description}</p>
                            </div>
                          </div>
                        </div>

                        {/* 6 Core Questions Framework Box */}
                        <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                          <span className="font-bold text-purple-900 block text-xs">คำถามกรอบการประเมิน 6 ข้อ (Framework Checklist):</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                            <div>1. <strong>ติดตามอะไร:</strong> ค่าความหนืด Bulk และความแม่นยำของหัวเซนเซอร์ RTD</div>
                            <div>2. <strong>วัดผลอย่างไร:</strong> รายงานผล QC Lab Viscosity และบันทึก Dual-check ใน BMR</div>
                            <div>3. <strong>เกณฑ์ยอมรับ:</strong> ความหนืด 3,000–4,500 cPs และอุณหภูมิคลาดเคลื่อน ≤ ±0.5°C</div>
                            <div>4. <strong>จำนวนตัวอย่าง:</strong> 5 แบทช์การผลิตต่อเนื่อง (Consecutive Batches)</div>
                            <div>5. <strong>ผู้รับผิดชอบ:</strong> {plan.responsible_owner_name}</div>
                            <div>6. <strong>กำหนดสรุปผล:</strong> {plan.target_due_date}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ================= TAB 2: MEASURABLE CRITERIA ================= */}
                <TabsContent value="criteria" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">เกณฑ์การยอมรับเชิงปริมาณ (Measurable Acceptance Criteria)</h4>
                      <p className="text-[11px] text-slate-500">เกณฑ์ต้องสามารถวัดผลได้อย่างชัดเจน หลีกเลี่ยงข้อความที่คลุมเครือ</p>
                    </div>
                    {plan && (
                      <Button size="sm" onClick={() => setIsCriterionModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8">
                        <Plus className="w-3.5 h-3.5 mr-1" /> + เพิ่มเกณฑ์วัดผล
                      </Button>
                    )}
                  </div>

                  {criteria.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10 bg-white rounded-xl border">ยังไม่มีเกณฑ์วัดผลที่กำหนด</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {criteria.map((crit) => (
                        <div key={crit.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-purple-700">ข้อที่ {crit.criterion_no}</span>
                            <Badge variant="outline" className="text-[10px]">{crit.criterion_type}</Badge>
                          </div>
                          <strong className="text-xs text-slate-800 dark:text-slate-100 block">{crit.title}</strong>
                          <div className="p-2 bg-purple-50/70 dark:bg-purple-950/40 rounded border border-purple-100 text-[11px] font-bold text-purple-900 dark:text-purple-200">
                            เป้าหมาย: {crit.measurable_target}
                          </div>
                          {crit.description && <p className="text-[10px] text-slate-500">{crit.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ================= TAB 3: MONITORING RESULTS MATRIX ================= */}
                <TabsContent value="monitoring" className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>ความคืบหน้าการติดตาม:</span>
                        <strong className="text-purple-700 text-sm font-black">{summary?.samples_evaluated} / {summary?.total_samples_planned || 5} แบทช์</strong>
                        <span>({Math.round(((summary?.samples_evaluated || 0) / (summary?.total_samples_planned || 5)) * 100)}%)</span>
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ผ่านเกณฑ์: <strong>{summary?.samples_passed}</strong> • ไม่ผ่านเกณฑ์: <strong className="text-rose-600">{summary?.samples_failed}</strong>
                      </p>
                    </div>

                    {plan && (
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            const nextSample = (summary?.samples_evaluated || 0) + 1;
                            setResultForm({
                              criterionId: criteria[0]?.id || '',
                              sampleNo: nextSample,
                              batchLotNo: `LOT-2026-V09${nextSample - 1}`,
                              measuredValue: '3,650 cPs (Target: 3,000-4,500 cPs)',
                              specificationTarget: '3,000–4,500 cPs (ผ่านเกณฑ์สเปก)',
                              evaluationStatus: 'PASS',
                              resultSource: 'LINKED_SYSTEM',
                              linkedRecordType: 'QC_RESULT',
                              linkedRecordRef: `QC-BULK-2026-088${nextSample}`,
                              notes: 'ผลทดสอบจากเครื่อง Brookfield Viscometer ประจำห้องแล็บ QC'
                            });
                            setIsResultModalOpen(true);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 font-medium"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> + บันทึกผลการตรวจแบทช์
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Visual Monitoring Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const res = results.find(r => r.sample_no === num);
                      const isTarget = num <= (plan?.scope_target_count || 5);
                      return (
                        <div 
                          key={num} 
                          className={`p-3 rounded-xl border text-center space-y-1.5 transition-all ${
                            res 
                              ? res.evaluation_status === 'PASS' 
                                ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/30' 
                                : 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/30'
                              : isTarget 
                                ? 'bg-white border-dashed border-slate-300 dark:bg-slate-800' 
                                : 'opacity-40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500">แบทช์ที่ {num}</span>
                            {res ? (
                              res.evaluation_status === 'PASS' ? (
                                <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">PASS</Badge>
                              ) : (
                                <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0">FAIL</Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[9px] px-1 py-0">PENDING</Badge>
                            )}
                          </div>
                          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                            {res?.batch_lot_no || `LOT-2026-V09${num - 1}`}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {res?.measured_value || 'รอผลการผลิต'}
                          </div>
                          {res && (
                            <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center gap-1 text-[9px]">
                              {res.result_source === 'LINKED_SYSTEM' ? (
                                <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                                  <Link2 className="w-2.5 h-2.5" /> LINKED
                                </span>
                              ) : (
                                <span className="text-slate-400">MANUAL</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Results Detailed Table */}
                  <Card>
                    <CardHeader className="py-2.5 px-4 bg-slate-50 border-b">
                      <CardTitle className="text-xs font-bold">รายละเอียดหลักฐานผลการติดตาม (Traceable Records)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100/60 text-slate-600 text-[11px]">
                            <tr>
                              <th className="py-2 px-3 text-left">ลำดับ</th>
                              <th className="py-2 px-3 text-left">แบทช์/ล็อต</th>
                              <th className="py-2 px-3 text-left">แหล่งที่มา</th>
                              <th className="py-2 px-3 text-left">ค่าที่วัดได้</th>
                              <th className="py-2 px-3 text-left">เกณฑ์เป้าหมาย</th>
                              <th className="py-2 px-3 text-left">ผลการประเมิน</th>
                              <th className="py-2 px-3 text-left">ผู้ตรวจ / เวลา</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {results.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-6 text-center text-slate-400">ยังไม่มีบันทึกผลการติดตาม</td>
                              </tr>
                            ) : (
                              results.map((r) => (
                                <tr key={r.id}>
                                  <td className="py-2 px-3 font-bold font-mono">#{r.sample_no}</td>
                                  <td className="py-2 px-3 font-semibold">{r.batch_lot_no || '-'}</td>
                                  <td className="py-2 px-3">
                                    <Badge variant="outline" className={`text-[10px] ${r.result_source === 'LINKED_SYSTEM' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50'}`}>
                                      {r.result_source === 'LINKED_SYSTEM' ? `🔗 ${r.linked_record_type || 'SYSTEM'}` : '📝 MANUAL'}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-3 font-medium text-slate-800">{r.measured_value}</td>
                                  <td className="py-2 px-3 text-slate-500">{r.specification_target}</td>
                                  <td className="py-2 px-3">
                                    {r.evaluation_status === 'PASS' ? (
                                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน (PASS)
                                      </span>
                                    ) : (
                                      <span className="font-bold text-rose-600 flex items-center gap-1">
                                        <XCircle className="w-3.5 h-3.5" /> ไม่ผ่าน (FAIL)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-[11px] text-slate-500">
                                    {r.evaluated_by_name} ({new Date(r.created_at).toLocaleDateString('th-TH')})
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ================= TAB 4: RECURRENCE RADAR ================= */}
                <TabsContent value="recurrence" className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        <span>เรดาร์เฝ้าระวังการเกิดซ้ำ (Similar Event Intelligence)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ระบบตรวจจับข้อสงสัยเหตุการณ์คุณภาพใหม่ที่ตรงกับ SKU, เครื่องจักร หรือกระบวนการนี้
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleDetectRecurrences} className="text-xs h-8">
                      <Search className="w-3.5 h-3.5 mr-1 text-slate-500" /> สแกนหาข้อสงสัยการเกิดซ้ำ
                    </Button>
                  </div>

                  {recurrenceReviews.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-xl border text-slate-400 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">ไม่พบข้อสงสัยการเกิดซ้ำในระบบ</p>
                      <p className="text-[11px] text-slate-400">ยังไม่มีเหตุการณ์คุณภาพใหม่ที่ตรงกับบริบทความเสี่ยงของ CAPA นี้</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recurrenceReviews.map((rev) => (
                        <div key={rev.id} className={`p-4 rounded-xl border space-y-2 ${rev.review_status === 'CONFIRMED_RECURRENCE' ? 'bg-rose-50 border-rose-300' : rev.review_status === 'REJECTED_RECURRENCE' ? 'bg-slate-50 opacity-75' : 'bg-amber-50/70 border-amber-300'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs">{rev.related_event?.event_no || 'QE-EVENT'}</span>
                              <Badge className={`text-[10px] ${rev.review_status === 'CONFIRMED_RECURRENCE' ? 'bg-rose-600 text-white' : rev.review_status === 'REJECTED_RECURRENCE' ? 'bg-slate-200 text-slate-700' : 'bg-amber-500 text-white animate-pulse'}`}>
                                {rev.review_status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{rev.matching_dimension}</Badge>
                            </div>
                            <span className="text-[11px] text-slate-400">ตรวจพบ: {new Date(rev.system_detected_at).toLocaleDateString('th-TH')}</span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800">{rev.related_event?.title}</p>
                          
                          {rev.qa_decision_notes && (
                            <div className="p-2 bg-white/80 rounded border text-[11px] text-slate-700">
                              <strong>บันทึกการตัดสินโดย QA:</strong> {rev.qa_decision_notes} ({rev.reviewed_by_name})
                            </div>
                          )}

                          {rev.review_status === 'POTENTIAL_RECURRENCE' && (
                            <div className="pt-2 flex items-center gap-2 justify-end border-t border-amber-200">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setReviewingRecurrence(rev);
                                  setRecurrenceNotes('จากการสอบสวนพบว่าเป็นคนละสาเหตุรากเหง้า และไม่เกี่ยวข้องกับปัญหาอุณหภูมิเซนเซอร์ T-02');
                                }}
                                className="h-7 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                              >
                                ปฏิเสธไม่ใช่การเกิดซ้ำ (Reject)
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setReviewingRecurrence(rev);
                                  setRecurrenceNotes('ยืนยันพบปัญหาอุณหภูมิคลาดเคลื่อนซ้ำในเครื่องเดิม ต้องทบทวนความสมบูรณ์ของ CAPA');
                                }}
                                className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                              >
                                ยืนยันเกิดซ้ำ (Confirm Recurrence)
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ================= TAB 5: QA DECISION & CLOSURE ================= */}
                <TabsContent value="decision" className="space-y-4">
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm space-y-4">
                    <div className="border-b pb-3">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-purple-600" />
                        <span>การตัดสินประสิทธิผลและการปิดเคสอย่างเป็นทางการ (QA Final Effectiveness Decision)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        คำถามหลัก: "สิ่งที่แก้ไปได้ผลจริงหรือไม่?" • ต้องระบุข้อสรุปและมีหลักฐานรองรับครบถ้วน
                      </p>
                    </div>

                    {/* Pre-flight Checklist (6 Hard Gates) */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2.5 border text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] uppercase">
                          เงื่อนไขความพร้อมในการปิดเคส (Pre-Closure Verification Gates):
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-bold ${isEffectiveEligible ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}
                        >
                          {isEffectiveEligible ? '✓ ผ่านเกณฑ์ครบทุกข้อ (Gates Passed)' : '✗ ยังไม่ผ่านเกณฑ์ครบทุกข้อ (Gates Incomplete)'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          {isGate1Phase3Pass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className={isGate1Phase3Pass ? 'text-slate-700 dark:text-slate-300' : 'text-rose-700 dark:text-rose-400 font-semibold'}>
                            1. มาตรการ Phase 3 ผ่านตรวจรับรอง 100% ({verifiedCapaActions}/{totalCapaActions})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isGate2ScopePass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span className={isGate2ScopePass ? 'text-slate-700 dark:text-slate-300' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                            2. ขอบเขตการติดตามครบถ้วน ({evaluatedSamplesCount}/{plannedScopeCount} แบทช์)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isGate3ResultsPass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className={isGate3ResultsPass ? 'text-slate-700 dark:text-slate-300' : 'text-rose-700 dark:text-rose-400 font-semibold'}>
                            3. ผลตรวจติดตามผ่านเกณฑ์ทั้งหมด ({failedSamplesCount === 0 ? '0 ล้มเหลว' : `พบไม่ผ่าน ${failedSamplesCount} ตัวอย่าง`})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isGate4RecurrencePass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className={isGate4RecurrencePass ? 'text-slate-700 dark:text-slate-300' : 'text-rose-700 dark:text-rose-400 font-semibold'}>
                            4. ไม่พบเหตุการณ์เกิดซ้ำที่ขัดขวางข้อสรุป ({confirmedRecurrencesCount === 0 ? '0 ยืนยันเกิดซ้ำ' : `พบ ${confirmedRecurrencesCount} รายการ`})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasEvidencePass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className={hasEvidencePass ? 'text-slate-700 dark:text-slate-300' : 'text-rose-700 dark:text-rose-400 font-semibold'}>
                            5. หลักฐานเชิงประจักษ์ครบถ้วน ({evaluatedSamplesCount} ผลวิเคราะห์)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isGate6ConclusionPass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className={isGate6ConclusionPass ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 font-medium'}>
                            6. ข้อสรุปการประเมินโดย QA ครบถ้วน (อย่างน้อย 15 ตัวอักษร)
                          </span>
                        </div>
                      </div>

                      {/* Prominent Hard Gate Callout */}
                      {!isEffectiveEligible ? (
                        <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2 text-rose-900 dark:text-rose-200">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <strong>Hard Closure Gate: ยังไม่สามารถสรุปว่ามีประสิทธิผลและปิด CAPA ได้</strong>
                            <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                              เหตุผลที่ปิดไม่ได้: <span className="font-bold underline">{primaryBlockingReason}</span>
                            </p>
                            <p className="text-rose-600 dark:text-rose-400 mt-0.5 font-medium">
                              ➔ ตัวเลือก EFFECTIVE ถูกระงับการใช้งาน กรุณาเลือก <strong>PARTIALLY EFFECTIVE</strong> หรือ <strong>NOT EFFECTIVE</strong> เพื่อกำหนดแนวทางดำเนินการต่อโดย QA
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-start gap-2 text-emerald-900 dark:text-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <strong>Hard Closure Gate: ผ่านเงื่อนไขความพร้อมในการปิดเคสครบถ้วน (Ready for Closure)</strong>
                            <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                              ผลการติดตามครบตามขอบเขตและผ่านเกณฑ์ 100% ไม่มีข้อสงสัยการเกิดซ้ำ สามารถอนุมัติ EFFECTIVE และปิดเคส CAPA ได้
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Official Evaluation Result Summary if already decided */}
                    {plan?.final_decision && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">ผลการตัดสินในระบบ:</span>
                            <Badge className={`text-xs ${
                              plan.final_decision === 'EFFECTIVE' ? 'bg-emerald-600 text-white' :
                              plan.final_decision === 'PARTIALLY_EFFECTIVE' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                            }`}>
                              {plan.final_decision}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            ตัดสินเมื่อ: {new Date(plan.actual_review_date || plan.updated_at).toLocaleString('th-TH')} โดย {plan.reviewer_name}
                          </span>
                        </div>

                        <div className="text-xs space-y-1">
                          <span className="font-bold text-slate-700">ข้อสรุปการประเมินโดย QA:</span>
                          <p className="p-2.5 bg-white dark:bg-slate-800 rounded border text-slate-800 dark:text-slate-200 leading-relaxed">
                            {plan.qa_conclusion}
                          </p>
                        </div>

                        {plan.qa_disposition_paths && plan.qa_disposition_paths.length > 0 && (
                          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900 space-y-2 text-xs">
                            <div className="font-bold text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                              <span>การพิจารณาดำเนินการต่อโดย QA (QA Follow-up Disposition):</span>
                              <div className="flex flex-wrap gap-1">
                                {plan.qa_disposition_paths.map(p => (
                                  <Badge key={p} variant="outline" className="text-[10px] bg-white border-amber-300 text-amber-800">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300">
                              <strong>เหตุผล:</strong> {plan.qa_disposition_rationale || '-'}
                            </p>

                            {/* Button to Initiate Controlled Revision if ADDITIONAL_CAPA_ACTION was selected */}
                            {plan.qa_disposition_paths.includes('ADDITIONAL_CAPA_ACTION') && (
                              <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <span className="text-[11px] text-amber-800 font-medium">
                                  ✓ ผ่านการพิจารณาให้เพิ่มมาตรการ: พร้อมออกฉบับแก้ไขแผน CAPA
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setRevisionForm(prev => ({
                                      ...prev,
                                      revisionReason: `สืบเนื่องจากผลประเมินประสิทธิผล ${plan.plan_no} (${plan.final_decision}): ${plan.qa_disposition_rationale || ''}`
                                    }));
                                    setIsRevisionModalOpen(true);
                                  }}
                                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  ดำเนินการออกฉบับแก้ไขและเพิ่มมาตรการ (Controlled Revision)
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3 Selectable Decisions Form (If evaluating or modifying) */}
                    {(!plan?.final_decision || plan?.final_decision !== 'EFFECTIVE') && (
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-700">1. ผลการตัดสินประสิทธิผล (Effectiveness Decision) *</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* OPTION 1: EFFECTIVE (LOCKED WHEN HARD GATES FAIL) */}
                            <div 
                              onClick={() => {
                                if (isEffectiveEligible) {
                                  setDecision('EFFECTIVE');
                                } else {
                                  toast.error(`ไม่สามารถเลือก EFFECTIVE ได้: ${primaryBlockingReason}`);
                                }
                              }}
                              className={`p-3.5 rounded-xl border-2 transition-all relative ${
                                !isEffectiveEligible
                                  ? 'opacity-60 bg-slate-100 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 cursor-not-allowed select-none'
                                  : decision === 'EFFECTIVE' 
                                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 cursor-pointer' 
                                    : 'border-slate-200 hover:border-emerald-200 bg-white dark:bg-slate-900 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-bold text-xs ${!isEffectiveEligible ? 'text-slate-500 line-through' : 'text-emerald-800 dark:text-emerald-300'}`}>
                                  EFFECTIVE
                                </span>
                                {!isEffectiveEligible ? (
                                  <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-700 border-rose-300 font-bold px-1.5 py-0">
                                    ⛔ ถูกระงับ
                                  </Badge>
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                )}
                              </div>
                              <p className={`text-[11px] ${!isEffectiveEligible ? 'text-slate-500' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                {!isEffectiveEligible ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold block text-[10px] leading-tight">
                                    ระงับ: {primaryBlockingReason}
                                  </span>
                                ) : (
                                  'มีประสิทธิผลตามเกณฑ์สมบูรณ์ ปิดเคส CAPA ได้'
                                )}
                              </p>
                            </div>

                            {/* OPTION 2: PARTIALLY EFFECTIVE */}
                            <div 
                              onClick={() => setDecision('PARTIALLY_EFFECTIVE')}
                              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                decision === 'PARTIALLY_EFFECTIVE' 
                                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20' 
                                  : 'border-slate-200 hover:border-amber-200 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-amber-800 dark:text-amber-300">PARTIALLY EFFECTIVE</span>
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                              </div>
                              <p className="text-[11px] text-amber-700 dark:text-amber-400">ได้ผลบางส่วน ห้ามปิดเคส ต้องมีมาตรการ/แนวทางต่อ</p>
                            </div>

                            {/* OPTION 3: NOT EFFECTIVE */}
                            <div 
                              onClick={() => setDecision('NOT_EFFECTIVE')}
                              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                decision === 'NOT_EFFECTIVE' 
                                  ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-500/20' 
                                  : 'border-slate-200 hover:border-rose-200 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-rose-800 dark:text-rose-300">NOT EFFECTIVE</span>
                                <XCircle className="w-4 h-4 text-rose-600" />
                              </div>
                              <p className="text-[11px] text-rose-700 dark:text-rose-400">ไม่มีประสิทธิผล ต้องทบทวนสาเหตุ/สอบสวนใหม่</p>
                            </div>
                          </div>
                        </div>

                        {/* QA Conclusion */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">2. ข้อสรุปการประเมินประสิทธิผลโดย QA (QA Conclusion) *</Label>
                          <Textarea 
                            value={qaConclusion}
                            onChange={(e) => setQaConclusion(e.target.value)}
                            placeholder="ระบุข้อสรุปเชิงเทคนิค เช่น การล้างหัวเซนเซอร์ RTD และมาตรการ Dual-probe ตรวจสอบผ่าน 5 แบทช์ต่อเนื่อง ไม่พบค่าหลุดสเปก มีประสิทธิผลในการขจัดสาเหตุรากเหง้าอย่างแท้จริง..."
                            rows={3}
                            className="text-xs"
                          />
                        </div>

                        {/* Controlled QA Follow-up Disposition (If Partially/Not Effective) */}
                        {decision !== 'EFFECTIVE' && (
                          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3.5 text-xs">
                            <div>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                                  <span>3. การพิจารณาดำเนินการต่อโดย QA (QA Follow-up Disposition) *</span>
                                </Label>
                                <Badge variant="outline" className="text-[10px] bg-white border-amber-300 text-amber-800">
                                  เลือกได้มากกว่า 1 ข้อ
                                </Badge>
                              </div>
                              <p className="text-[11px] text-amber-700/90 dark:text-amber-300 mt-1">
                                "ผลยังไม่สมบูรณ์ QA ตัดสินใจทำอะไรต่อ?" — กำหนดแนวทางการบริหารจัดการคุณภาพ
                              </p>
                            </div>

                            {/* Options Grid A through F */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {DISPOSITION_OPTIONS.map((opt) => {
                                const isChecked = selectedDispositions.includes(opt.id);
                                return (
                                  <div
                                    key={opt.id}
                                    onClick={() => {
                                      if (isChecked) {
                                        setSelectedDispositions(selectedDispositions.filter(d => d !== opt.id));
                                      } else {
                                        setSelectedDispositions([...selectedDispositions, opt.id]);
                                      }
                                    }}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                                      isChecked 
                                        ? 'bg-amber-100/70 border-amber-400 ring-1 ring-amber-400 text-amber-950' 
                                        : 'bg-white border-amber-200/80 hover:bg-amber-50/40 text-slate-800'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="mt-0.5 rounded text-amber-600 focus:ring-0 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                      <div className="font-bold text-xs">{opt.label}</div>
                                      <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{opt.sub}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Extended Monitoring Fields if selected */}
                            {selectedDispositions.includes('EXTEND_MONITORING') && (
                              <div className="p-3 bg-white rounded-lg border border-amber-300 space-y-2">
                                <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                  <span>รายละเอียดการขยายขอบเขตติดตาม (Extend Monitoring Scope)</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <Label className="text-[11px] text-slate-600">จำนวนแบทช์เป้าหมายใหม่ (Target Samples Count):</Label>
                                    <Input
                                      type="number"
                                      min={summary?.samples_evaluated || 5}
                                      value={extendTargetCount}
                                      onChange={(e) => setExtendTargetCount(Number(e.target.value))}
                                      className="h-8 text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[11px] text-slate-600">กำหนดวันสรุปผลใหม่ (Extended Due Date):</Label>
                                    <Input
                                      type="date"
                                      value={extendDueDate}
                                      onChange={(e) => setExtendDueDate(e.target.value)}
                                      className="h-8 text-xs mt-1"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Mandatory QA Rationale */}
                            <div className="space-y-1.5 pt-1">
                              <Label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                เหตุผลและความจำเป็นในการพิจารณาดำเนินการต่อ (QA Disposition Rationale) *
                              </Label>
                              <Textarea
                                value={dispositionRationale}
                                onChange={(e) => setDispositionRationale(e.target.value)}
                                placeholder="ระบุเหตุผลความจำเป็นของแนวทางที่เลือก เช่น ค่าความหนืดแกว่งตัวเนื่องจากสารละลาย TEA ไม่เข้ากันในรอบกวนเดิม จำเป็นต้องเปิดการสอบสวนเชิงลึก และขยายการติดตามเพิ่ม 3 แบทช์..."
                                rows={3}
                                className="text-xs bg-white"
                              />
                            </div>

                            {/* Guardrail Disclaimer */}
                            <div className="p-2.5 bg-amber-100/60 rounded-lg text-[11px] text-amber-900 flex items-start gap-2 border border-amber-200">
                              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <strong>หลักการควบคุมคุณภาพ (ISO 22716 Cosmetics Governance):</strong>
                                <p className="mt-0.5 text-amber-800">
                                  ระบบจะไม่สร้างมาตรการทางเทคนิคเองโดยอัตโนมัติ (No Auto-Generated Actions) เพื่อความถูกต้องตามหลักการสืบสวนและอนุมัติ หากเลือก "เพิ่มมาตรการ" ท่านสามารถออกฉบับแก้ไขอย่างเป็นทางการผ่าน Controlled CAPA Revision ได้หลังจากบันทึกข้อสรุปนี้
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Submit Bar with Hard Closure Gate Enforcement */}
                        <div className="pt-3 border-t space-y-2">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="text-[11px] text-slate-500">
                              ผู้ลงนามประเมิน: <strong>{currentUser.name}</strong> ({currentUser.role})
                            </div>

                            {decision === 'EFFECTIVE' ? (
                              !isEffectiveEligible ? (
                                <Button 
                                  disabled={true}
                                  className="text-xs font-bold bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed px-5 shadow-none"
                                >
                                  ⛔ ยังไม่สามารถสรุปว่ามีประสิทธิผลและปิด CAPA ได้
                                </Button>
                              ) : (
                                <Button 
                                  onClick={handleSubmitFinalDecision}
                                  disabled={submittingDecision || !isGate6ConclusionPass}
                                  className="text-xs font-bold text-white px-5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                >
                                  {submittingDecision ? 'กำลังบันทึก...' : '✅ อนุมัติผล EFFECTIVE และปิดเคส CAPA ถาวร ➔'}
                                </Button>
                              )
                            ) : (
                              <Button 
                                onClick={handleSubmitFinalDecision}
                                disabled={submittingDecision || !isGate6ConclusionPass || selectedDispositions.length === 0 || dispositionRationale.trim().length < 15}
                                className="text-xs font-bold text-white px-5 bg-amber-600 hover:bg-amber-700 shadow-sm"
                              >
                                {submittingDecision ? 'กำลังบันทึก...' : 'บันทึกผลการประเมินและแนวทางดำเนินการต่อ (Submit Disposition) ➔'}
                              </Button>
                            )}
                          </div>

                          {/* Inline Warning if Hard Gate Blocks EFFECTIVE */}
                          {!isEffectiveEligible && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>ระงับการปิดเคส: {primaryBlockingReason} (กรุณาเลือก PARTIALLY EFFECTIVE หรือ NOT EFFECTIVE)</span>
                              </span>
                              {!isGate6ConclusionPass && (
                                <span className="text-amber-700 text-[10px] font-bold">
                                  * ต้องการข้อสรุป QA อย่างน้อย 15 ตัวอักษร
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ================= TAB 6: CONTROLLED AUDIT TRAIL ================= */}
                <TabsContent value="audit" className="space-y-4">
                  <Card>
                    <CardHeader className="py-2.5 px-4 bg-slate-50 border-b">
                      <CardTitle className="text-xs font-bold">บันทึกประวัติการดำเนินการและการอนุมัติ (Controlled Audit Trail)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y text-xs max-h-[400px] overflow-y-auto">
                        {(data?.audit_trail || []).length === 0 ? (
                          <p className="p-6 text-center text-slate-400">ยังไม่มีบันทึกประวัติ</p>
                        ) : (
                          data?.audit_trail.map((log) => (
                            <div key={log.id} className="p-3 flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-[10px]">{log.action_type}</Badge>
                                  <span className="font-bold text-slate-800">{log.changed_by_name}</span>
                                </div>
                                <p className="text-[11px] text-slate-600">{log.change_reason || '-'}</p>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(log.created_at).toLocaleString('th-TH')}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        {/* MODAL: CREATE PLAN */}
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">กำหนดแผนติดตามประสิทธิผล (Effectiveness Plan)</DialogTitle>
              <DialogDescription className="text-xs">
                กำหนดขอบเขตและระยะเวลาติดตามตามระดับความเสี่ยง (ISO 22716 Risk-Based Scope)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-semibold">ชื่อแผนการติดตาม *</Label>
                <Input 
                  value={planForm.title} 
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                  placeholder="เช่น แผนติดตามความหนืดและความแม่นยำเซนเซอร์..."
                  className="mt-1 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">รูปแบบขอบเขต (Scope Type)</Label>
                  <select 
                    value={planForm.scopeType}
                    onChange={(e) => setPlanForm({ ...planForm, scopeType: e.target.value as any })}
                    className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 py-1 text-xs"
                  >
                    <option value="CONSECUTIVE_BATCHES">จำนวนแบทช์ต่อเนื่อง</option>
                    <option value="TIME_PERIOD">ช่วงเวลา (วัน/เดือน)</option>
                    <option value="PRODUCTION_RUNS">รอบการผลิต</option>
                    <option value="OCCURRENCES_COUNT">จำนวนครั้ง</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">เป้าหมายขอบเขต (Target Count)</Label>
                  <Input 
                    type="number"
                    value={planForm.scopeTargetCount}
                    onChange={(e) => setPlanForm({ ...planForm, scopeTargetCount: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">รายละเอียดขอบเขต</Label>
                <Input 
                  value={planForm.scopeDescription}
                  onChange={(e) => setPlanForm({ ...planForm, scopeDescription: e.target.value })}
                  placeholder="เช่น ติดตามการผลิต 5 แบทช์ต่อเนื่องของถัง T-02"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">กำหนดวันสรุปผลการประเมิน (Due Date) *</Label>
                <Input 
                  type="date"
                  value={planForm.targetDueDate}
                  onChange={(e) => setPlanForm({ ...planForm, targetDueDate: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setIsPlanModalOpen(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={handleCreatePlan} className="bg-purple-600 hover:bg-purple-700 text-white">
                บันทึกและเริ่มติดตาม ➔
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: ADD CRITERION */}
        <Dialog open={isCriterionModalOpen} onOpenChange={setIsCriterionModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">เพิ่มเกณฑ์วัดผลเชิงปริมาณ</DialogTitle>
              <DialogDescription className="text-xs">
                ระบุเกณฑ์ที่สามารถวัดได้จริงเพื่อใช้ตัดสินประสิทธิผล
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-semibold">ประเภทเกณฑ์วัดผล</Label>
                <select 
                  value={criterionForm.criterionType}
                  onChange={(e) => setCriterionForm({ ...criterionForm, criterionType: e.target.value as any })}
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 py-1 text-xs"
                >
                  <option value="QC_SPEC_RESULT">ผลวิเคราะห์ QC / Specification</option>
                  <option value="EQUIPMENT_CALIBRATION">ผลการสอบเทียบเครื่องจักร/อุปกรณ์</option>
                  <option value="EVENT_RECURRENCE">การไม่พบการเกิดซ้ำของปัญหา</option>
                  <option value="PROCESS_PARAMETER">พารามิเตอร์ในกระบวนการผลิต</option>
                  <option value="TRAINING_COMPETENCY">ผลประเมินความเข้าใจพนักงาน</option>
                  <option value="OTHER">เกณฑ์วัดผลอื่น</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">ชื่อเกณฑ์วัดผล *</Label>
                <Input 
                  value={criterionForm.title}
                  onChange={(e) => setCriterionForm({ ...criterionForm, title: e.target.value })}
                  placeholder="เช่น ค่าความหนืด Bulk ผ่านเกณฑ์สเปก"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">เป้าหมายที่วัดผลได้ (Measurable Target) *</Label>
                <Input 
                  value={criterionForm.measurableTarget}
                  onChange={(e) => setCriterionForm({ ...criterionForm, measurableTarget: e.target.value })}
                  placeholder="เช่น 3,000 - 4,500 cPs ต่อเนื่อง 5 แบทช์"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setIsCriterionModalOpen(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={handleAddCriterion} className="bg-purple-600 hover:bg-purple-700 text-white">
                บันทึกเกณฑ์
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: RECORD RESULT */}
        <Dialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">บันทึกผลการตรวจติดตามตัวอย่าง</DialogTitle>
              <DialogDescription className="text-xs">
                เชื่อมโยงผลตรวจจริงจากระบบ หรือระบุหลักฐานผลตรวจ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">ลำดับตัวอย่าง / แบทช์</Label>
                  <Input 
                    type="number"
                    value={resultForm.sampleNo}
                    onChange={(e) => setResultForm({ ...resultForm, sampleNo: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">เลขแบทช์/ล็อต</Label>
                  <Input 
                    value={resultForm.batchLotNo}
                    onChange={(e) => setResultForm({ ...resultForm, batchLotNo: e.target.value })}
                    placeholder="LOT-2026-V09X"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">ค่าที่วัดได้จริง *</Label>
                <Input 
                  value={resultForm.measuredValue}
                  onChange={(e) => setResultForm({ ...resultForm, measuredValue: e.target.value })}
                  placeholder="เช่น 3,650 cPs (อุณหภูมิ 25.0°C)"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">เกณฑ์มาตรฐานเปรียบเทียบ *</Label>
                <Input 
                  value={resultForm.specificationTarget}
                  onChange={(e) => setResultForm({ ...resultForm, specificationTarget: e.target.value })}
                  placeholder="เช่น 3,000–4,500 cPs"
                  className="mt-1 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">ผลการประเมิน</Label>
                  <select 
                    value={resultForm.evaluationStatus}
                    onChange={(e) => setResultForm({ ...resultForm, evaluationStatus: e.target.value as any })}
                    className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 py-1 text-xs font-bold text-slate-800"
                  >
                    <option value="PASS">✅ ผ่าน (PASS)</option>
                    <option value="FAIL">❌ ไม่ผ่าน (FAIL)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">แหล่งที่มาข้อมูล</Label>
                  <select 
                    value={resultForm.resultSource}
                    onChange={(e) => setResultForm({ ...resultForm, resultSource: e.target.value as any })}
                    className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 py-1 text-xs"
                  >
                    <option value="LINKED_SYSTEM">🔗 ข้อมูลเชื่อมโยงระบบ (Linked)</option>
                    <option value="MANUAL_ENTRY">📝 กรอกด้วยตนเอง (Manual)</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">เลขอ้างอิงผลวิเคราะห์ / BMR</Label>
                <Input 
                  value={resultForm.linkedRecordRef}
                  onChange={(e) => setResultForm({ ...resultForm, linkedRecordRef: e.target.value })}
                  placeholder="เช่น QC-BULK-2026-0881"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setIsResultModalOpen(false)}>ยกเลิก</Button>
              <Button size="sm" onClick={handleRecordResult} className="bg-purple-600 hover:bg-purple-700 text-white">
                บันทึกผล
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: RECURRENCE REVIEW CONFIRMATION */}
        {reviewingRecurrence && (
          <Dialog open={Boolean(reviewingRecurrence)} onOpenChange={() => setReviewingRecurrence(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">บันทึกการตัดสินข้อสงสัยการเกิดซ้ำ</DialogTitle>
                <DialogDescription className="text-xs">
                  QA ต้องระบุเหตุผลประกอบการยืนยันหรือปฏิเสธความเกี่ยวข้องกับการเกิดซ้ำ
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded border">
                  <span className="text-[10px] text-slate-400 block">เหตุการณ์ที่สงสัย:</span>
                  <strong>{reviewingRecurrence.related_event?.event_no}: {reviewingRecurrence.related_event?.title}</strong>
                </div>
                <div>
                  <Label className="text-xs font-semibold">บันทึกเหตุผลการตัดสินโดย QA (อย่างน้อย 10 ตัวอักษร) *</Label>
                  <Textarea 
                    value={recurrenceNotes}
                    onChange={(e) => setRecurrenceNotes(e.target.value)}
                    placeholder="ระบุข้อเท็จจริงว่าทำไมจึงเป็นการเกิดซ้ำ หรือทำไมจึงไม่เกี่ยวข้อง..."
                    rows={3}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setReviewingRecurrence(null)}>ยกเลิก</Button>
                <Button 
                  size="sm" 
                  onClick={() => handleReviewRecurrence(recurrenceNotes.includes('ไม่เกี่ยวข้อง') ? 'REJECTED_RECURRENCE' : 'CONFIRMED_RECURRENCE')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  บันทึกการประเมิน
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* MODAL: CONTROLLED CAPA REVISION */}
        <Dialog open={isRevisionModalOpen} onOpenChange={setIsRevisionModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>การออกฉบับแก้ไขแผน CAPA (Controlled CAPA Revision)</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                เพิ่มมาตรการใหม่เข้าสู่ CAPA อย่างเป็นทางการ โดยเก็บประวัติเดิมไว้ 100% ไม่ทับซ้อนข้อมูลในอดีต (ISO 22716 Revision Control)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-200">
                <span className="text-[11px] font-bold text-indigo-900 block">
                  ฉบับแก้ไขที่จะออก: ฉบับที่ {(capa?.capa_revision_version || 1) + 1} (Revision {(capa?.capa_revision_version || 1) + 1})
                </span>
                <span className="text-[10px] text-indigo-700">
                  อ้างอิงผลประเมินประสิทธิผล: {plan?.plan_no} ({plan?.final_decision})
                </span>
              </div>

              <div>
                <Label className="text-xs font-semibold">เหตุผลการออกฉบับแก้ไข (Revision Reason) *</Label>
                <Textarea
                  value={revisionForm.revisionReason}
                  onChange={(e) => setRevisionForm({ ...revisionForm, revisionReason: e.target.value })}
                  placeholder="ระบุเหตุผล เช่น สืบเนื่องจากผลประเมินประสิทธิผลพบความเบี่ยงเบน..."
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">ประเภทมาตรการ (Action Type)</Label>
                  <select
                    value={revisionForm.actionType}
                    onChange={(e) => setRevisionForm({ ...revisionForm, actionType: e.target.value as any })}
                    className="mt-1 flex h-8 w-full rounded-md border bg-background px-3 py-1 text-xs"
                  >
                    <option value="CORRECTIVE_ACTION">2. กำจัดสาเหตุรากเหง้า (Corrective Action)</option>
                    <option value="PREVENTIVE_IMPROVEMENT">3. ป้องกันเชิงระบบ (Preventive Improvement)</option>
                    <option value="CORRECTION">1. การแก้ไขเฉพาะหน้า (Correction)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">กำหนดเสร็จ (Due Date) *</Label>
                  <Input
                    type="date"
                    value={revisionForm.dueDate}
                    onChange={(e) => setRevisionForm({ ...revisionForm, dueDate: e.target.value })}
                    className="mt-1 text-xs h-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">ชื่อมาตรการใหม่ (Action Title) *</Label>
                <Input
                  value={revisionForm.title}
                  onChange={(e) => setRevisionForm({ ...revisionForm, title: e.target.value })}
                  placeholder="ระบุชื่อมาตรการที่กำหนดโดย QA/ทีมงาน (ผู้ใช้ระบุเอง ระบบไม่ประดิษฐ์ขึ้นเอง)..."
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">รายละเอียดการปฏิบัติ (Action Description) *</Label>
                <Textarea
                  value={revisionForm.description}
                  onChange={(e) => setRevisionForm({ ...revisionForm, description: e.target.value })}
                  placeholder="ระบุขั้นตอนการทำงานโดยละเอียด..."
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">แผนกผู้รับผิดชอบ</Label>
                  <Input
                    value={revisionForm.departmentName}
                    onChange={(e) => setRevisionForm({ ...revisionForm, departmentName: e.target.value })}
                    className="mt-1 text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">ผู้รับผิดชอบดำเนินการ (Action Owner)</Label>
                  <Input
                    value={revisionForm.responsibleOwnerName}
                    onChange={(e) => setRevisionForm({ ...revisionForm, responsibleOwnerName: e.target.value })}
                    className="mt-1 text-xs h-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">หลักฐานที่ต้องส่งมอบ (Evidence Required)</Label>
                <Input
                  value={revisionForm.evidenceRequired}
                  onChange={(e) => setRevisionForm({ ...revisionForm, evidenceRequired: e.target.value })}
                  className="mt-1 text-xs h-8"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
                <span>ผู้อนุมัติฉบับแก้ไข: <strong>{revisionForm.approverName}</strong></span>
                <Badge variant="outline" className="text-[10px]">QA Approved</Badge>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsRevisionModalOpen(false)} className="text-xs">
                ยกเลิก
              </Button>
              <Button
                size="sm"
                onClick={handleCreateRevision}
                disabled={submittingRevision}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {submittingRevision ? 'กำลังบันทึก...' : 'อนุมัติและออกฉบับแก้ไข (Approve Revision) ➔'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  );
}
