"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle,
  Clock, 
  FileText, 
  Paperclip, 
  Calendar, 
  CheckCircle2, 
  X, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  RotateCcw,
  Check,
  User,
  Building2,
  Tag,
  Activity,
  Layers,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { 
  QmsCapa, 
  QmsCapaAction, 
  QmsCapaEvidence, 
  QmsActionType, 
  QmsActionStatus,
  QmsCapaPriority,
  QmsCapaEvidenceType
} from '@/types/qms';
import { 
  getCapaById, 
  getCapaByInvestigationId,
  createCapaFromInvestigation,
  saveCapaPlanDraft, 
  createCapaAction, 
  startCapaAction,
  submitActionCompleted, 
  verifyCapaAction, 
  requestActionDueDateExtension, 
  addCapaEvidence, 
  deleteCapaEvidence 
} from '@/app/actions/qms_capa';

interface CapaWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  capaId?: string;
  investigationId?: string;
  currentUser: { id: string; name: string; role: string };
  onSuccess?: () => void;
  onOpenEffectiveness?: (capaId: string) => void;
}

export default function CapaWorkspace({
  isOpen,
  onClose,
  capaId,
  investigationId,
  currentUser,
  onSuccess,
  onOpenEffectiveness
}: CapaWorkspaceProps) {
  const [capa, setCapa] = useState<QmsCapa | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plan');
  const [submitting, setSubmitting] = useState(false);

  // Add Action Modal
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);
  const [newAction, setNewAction] = useState<{
    action_type: QmsActionType;
    title: string;
    description: string;
    responsible_owner_id: string;
    responsible_owner_name: string;
    department_name: string;
    due_date: string;
    evidence_required: string;
  }>({
    action_type: 'CORRECTIVE_ACTION',
    title: '',
    description: '',
    responsible_owner_id: currentUser.id,
    responsible_owner_name: currentUser.name,
    department_name: 'Maintenance / แผนกซ่อมบำรุง',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    evidence_required: ''
  });

  // Submit Completed Modal
  const [isSubmitCompletedModalOpen, setIsSubmitCompletedModalOpen] = useState(false);
  const [selectedActionForCompletion, setSelectedActionForCompletion] = useState<QmsCapaAction | null>(null);
  const [implementationNotes, setImplementationNotes] = useState('');

  // QA Verification Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedActionForVerification, setSelectedActionForVerification] = useState<QmsCapaAction | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<'VERIFIED' | 'RETURN_FOR_CORRECTION'>('VERIFIED');
  const [verifyComment, setVerifyComment] = useState('');

  // Due Date Extension Modal
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [selectedActionForExtension, setSelectedActionForExtension] = useState<QmsCapaAction | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  // Add Evidence Modal
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [newEvidence, setNewEvidence] = useState<{
    action_id?: string;
    evidence_type: QmsCapaEvidenceType;
    title: string;
    description: string;
    source: string;
  }>({
    evidence_type: 'PHOTO',
    title: '',
    description: '',
    source: ''
  });

  // Load CAPA data
  useEffect(() => {
    if (isOpen) {
      loadCapaData();
    }
  }, [isOpen, capaId, investigationId]);

  async function loadCapaData() {
    setLoading(true);
    try {
      let res;
      if (capaId) {
        res = await getCapaById(capaId);
      } else if (investigationId) {
        res = await getCapaByInvestigationId(investigationId);
        if (res && res.success && !res.data) {
          // Auto create CAPA directly from approved investigation
          const createRes = await createCapaFromInvestigation({
            investigationId,
            capaOwnerId: currentUser.id,
            capaOwnerName: currentUser.name,
            targetDueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            userId: currentUser.id,
            userName: currentUser.name
          });
          if (createRes.success && createRes.data) {
            res = await getCapaById(createRes.data.id);
          }
        }
      }
      if (res && res.success && res.data) {
        setCapa(res.data);
      } else {
        toast.error(res?.error || 'ไม่พบข้อมูล CAPA');
      }
    } catch (err: any) {
      toast.error(err.message || 'โหลดข้อมูล CAPA ล้มเหลว');
    } finally {
      setLoading(false);
    }
  }

  // Save CAPA Plan Draft
  async function handleSaveDraft() {
    if (!capa) return;
    setSubmitting(true);
    try {
      const res = await saveCapaPlanDraft({
        capaId: capa.id,
        title: capa.title,
        problemStatement: capa.problem_statement,
        rootCauseSummary: capa.root_cause_summary,
        correctionPlan: capa.correction_plan,
        correctiveActionPlan: capa.corrective_action_plan,
        preventiveImprovementPlan: capa.preventive_improvement_plan,
        priority: capa.priority,
        targetDueDate: capa.target_due_date,
        userId: currentUser.id,
        userName: currentUser.name
      });
      if (res.success) {
        toast.success('บันทึกแผนงาน CAPA เรียบร้อย');
      } else {
        toast.error(res.error || 'บันทึกล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Add Action Item
  async function handleCreateAction() {
    if (!capa || !newAction.title.trim()) {
      toast.error('กรุณาระบุหัวข้อมาตรการ');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createCapaAction({
        capaId: capa.id,
        actionType: newAction.action_type,
        title: newAction.title,
        description: newAction.description,
        responsibleOwnerId: newAction.responsible_owner_id,
        responsibleOwnerName: newAction.responsible_owner_name,
        departmentName: newAction.department_name,
        dueDate: new Date(newAction.due_date).toISOString(),
        evidenceRequired: newAction.evidence_required,
        userId: currentUser.id,
        userName: currentUser.name
      });

      if (res.success && res.data) {
        toast.success(`เพิ่มมาตรการ #${res.data.action_no} เรียบร้อย`);
        setCapa({
          ...capa,
          actions: [...(capa.actions || []), res.data]
        });
        setIsAddActionModalOpen(false);
        setNewAction({
          action_type: 'CORRECTIVE_ACTION',
          title: '',
          description: '',
          responsible_owner_id: currentUser.id,
          responsible_owner_name: currentUser.name,
          department_name: 'Maintenance / แผนกซ่อมบำรุง',
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          evidence_required: ''
        });
      } else {
        toast.error(res.error || 'เพิ่มมาตรการล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Start Action
  async function handleStartAction(actionId: string) {
    try {
      const res = await startCapaAction(actionId, currentUser.id, currentUser.name);
      if (res.success) {
        toast.success('เริ่มดำเนินการมาตรการแล้ว');
        loadCapaData();
      } else {
        toast.error(res.error || 'ดำเนินการล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Submit Completed
  async function handleSubmitCompleted() {
    if (!selectedActionForCompletion || !implementationNotes.trim()) {
      toast.error('กรุณาระบุบันทึกผลการปฏิบัติงาน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitActionCompleted({
        actionId: selectedActionForCompletion.id,
        implementationNotes,
        completedBy: currentUser.id,
        completedByName: currentUser.name
      });

      if (res.success) {
        toast.success('ส่งมอบผลงานเรียบร้อย (สถานะ: COMPLETED รอ QA ตรวจรับรอง)');
        setIsSubmitCompletedModalOpen(false);
        setImplementationNotes('');
        setSelectedActionForCompletion(null);
        loadCapaData();
      } else {
        toast.error(res.error || 'ส่งมอบล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Verify Action
  async function handleVerifyAction() {
    if (!selectedActionForVerification || !verifyComment.trim()) {
      toast.error('กรุณาระบุความคิดเห็นการตรวจรับรอง');
      return;
    }
    setSubmitting(true);
    try {
      const res = await verifyCapaAction({
        actionId: selectedActionForVerification.id,
        decision: verifyDecision,
        comment: verifyComment,
        qaUserId: currentUser.id,
        qaUserName: currentUser.name,
        qaRole: currentUser.role
      });

      if (res.success) {
        if (verifyDecision === 'VERIFIED') {
          if (res.isAllActionsVerified) {
            toast.success('🎉 มาตรการทั้งหมดผ่านเกณฑ์! CAPA เข้าสู่สถานะ: AWAITING EFFECTIVENESS');
          } else {
            toast.success('ตรวจรับรองมาตรการผ่านเกณฑ์เรียบร้อย');
          }
        } else {
          toast.warning('ส่งกลับมาตรการให้ผู้รับผิดชอบแก้ไขเพิ่มเติมเรียบร้อย');
        }
        setIsVerifyModalOpen(false);
        setVerifyComment('');
        setSelectedActionForVerification(null);
        loadCapaData();
        onSuccess?.();
      } else {
        toast.error(res.error || 'การตรวจรับรองล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Request Extension
  async function handleRequestExtension() {
    if (!selectedActionForExtension || !newDueDate || !extensionReason.trim()) {
      toast.error('กรุณาระบุวันกำหนดส่งใหม่และเหตุผล');
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestActionDueDateExtension({
        actionId: selectedActionForExtension.id,
        newDueDate: new Date(newDueDate).toISOString(),
        extensionReason,
        requestedBy: currentUser.id,
        requestedByName: currentUser.name,
        approvedBy: currentUser.id,
        approvedByName: currentUser.name
      });

      if (res.success) {
        toast.success('บันทึกการขยายเวลากำหนดส่งเรียบร้อย (เก็บบันทึกวันเดิมในประวัติ)');
        setIsExtensionModalOpen(false);
        setNewDueDate('');
        setExtensionReason('');
        setSelectedActionForExtension(null);
        loadCapaData();
      } else {
        toast.error(res.error || 'ขยายเวลาล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Add Evidence
  async function handleAddEvidence() {
    if (!capa || !newEvidence.title.trim()) {
      toast.error('กรุณาระบุชื่อหลักฐาน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await addCapaEvidence({
        capaId: capa.id,
        actionId: newEvidence.action_id,
        evidenceType: newEvidence.evidence_type,
        title: newEvidence.title,
        description: newEvidence.description,
        source: newEvidence.source,
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name
      });

      if (res.success && res.data) {
        toast.success('แนบหลักฐานเรียบร้อย');
        setCapa({
          ...capa,
          evidence_list: [res.data, ...(capa.evidence_list || [])]
        });
        setIsEvidenceModalOpen(false);
        setNewEvidence({
          evidence_type: 'PHOTO',
          title: '',
          description: '',
          source: ''
        });
      } else {
        toast.error(res.error || 'แนบหลักฐานล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Evidence
  async function handleDeleteEvidence(id: string) {
    if (!capa) return;
    const res = await deleteCapaEvidence(id);
    if (res.success) {
      toast.success('ลบหลักฐานแล้ว');
      setCapa({
        ...capa,
        evidence_list: (capa.evidence_list || []).filter(e => e.id !== id)
      });
    } else {
      toast.error(res.error || 'ลบล้มเหลว');
    }
  }

  // Dynamic Progress Calculation (Calculated ONLY from required CAPA implementation actions)
  const actions = capa?.actions || [];
  const totalActions = actions.length;
  const verifiedCount = actions.filter(a => a.status === 'VERIFIED').length;
  const inProgressCount = actions.filter(a => a.status === 'IN_PROGRESS' || a.status === 'NOT_STARTED').length;
  const waitingQaCount = actions.filter(a => a.status === 'COMPLETED').length;
  const returnedCount = actions.filter(a => a.status === 'RETURNED').length;
  const progressPercent = totalActions > 0 ? Math.round((verifiedCount / totalActions) * 100) : 0;
  const isAllActionsVerified = totalActions > 0 && verifiedCount === totalActions;

  const now = new Date();
  const overdueCount = actions.filter(a => {
    return a.status !== 'VERIFIED' && a.status !== 'COMPLETED' && new Date(a.due_date) < now;
  }).length;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[94vh] p-0 overflow-hidden flex flex-col">
        
        {/* ================= 1. CAPA HEADER ================= */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-rose-400">
                  {capa?.capa_no || 'CAPA-PENDING'}
                </span>
                <span className="text-slate-500 font-mono text-xs">/</span>
                <span className="font-mono text-xs font-semibold text-slate-300">
                  {capa?.snapshot_context?.quality_event_no || 'QE-REF'}
                </span>
                <Badge className={`text-[10px] ${
                  capa?.priority === 'CRITICAL' ? 'bg-red-600' :
                  capa?.priority === 'HIGH' ? 'bg-amber-600' : 'bg-blue-600'
                }`}>
                  ความสำคัญ: {capa?.priority || 'HIGH'}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                  {capa?.department_name || 'QA'}
                </Badge>
              </div>
              <h2 className="text-sm font-bold text-white truncate max-w-2xl">
                {capa?.title || 'การจัดการแผนปฏิบัติการแก้ไขและป้องกัน (CAPA & Action Management)'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {capa?.current_status === 'CLOSED_EFFECTIVE' ? (
                <Badge className="text-xs font-semibold bg-emerald-600">
                  ✅ ปิดสมบูรณ์ — มีประสิทธิผล (Closed — Effective)
                </Badge>
              ) : capa?.current_status === 'REOPENED_FOR_ACTION' ? (
                <Badge className="text-xs font-semibold bg-rose-600 animate-pulse">
                  🔄 เปิดทบทวนมาตรการใหม่ (Reopened for Action)
                </Badge>
              ) : capa?.current_status === 'AWAITING_EFFECTIVENESS' && isAllActionsVerified ? (
                <Badge className="text-xs font-semibold bg-purple-600 animate-pulse">
                  ✓ รอดำเนินการติดตามประสิทธิผล (Awaiting Effectiveness)
                </Badge>
              ) : capa?.current_status === 'ALL_ACTIONS_COMPLETED' ? (
                <Badge className="text-xs font-semibold bg-blue-600">
                  🟣 มาตรการครบแล้ว (รอ QA รับรอง)
                </Badge>
              ) : (
                <Badge className="text-xs font-semibold bg-amber-600">
                  ● กำลังดำเนินการตามแผน ({progressPercent}% In Progress)
                </Badge>
              )}

              {(capa?.current_status === 'AWAITING_EFFECTIVENESS' || capa?.current_status === 'CLOSED_EFFECTIVE' || capa?.current_status === 'REOPENED_FOR_ACTION') && onOpenEffectiveness && capa?.id && (
                <Button 
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenEffectiveness(capa.id);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7 px-3 gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>พื้นที่ประเมินประสิทธิผล (Phase 4) ➔</span>
                </Button>
              )}

              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Facts & Computed Progress Meter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-3 pt-3 border-t border-slate-800 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">ผู้รับผิดชอบ CAPA (Owner):</span>
              <span className="font-semibold truncate block">
                {capa?.capa_owner_name || currentUser.name}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">กำหนดเสร็จสิ้น (Target Due Date):</span>
              <span className="font-semibold truncate block font-mono text-amber-400">
                {capa?.target_due_date ? new Date(capa.target_due_date).toLocaleDateString('th-TH') : '-'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block text-[10px]">ความคืบหน้ามาตรการ (Automated Progress):</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-white font-mono text-xs">
                  {progressPercent}% ({verifiedCount}/{totalActions} มาตรการ):
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  ✓ {verifiedCount} ผ่านตรวจรับ
                </span>
                {waitingQaCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-400 border border-blue-800 font-semibold">
                    ⏳ {waitingQaCount} รอ QA ตรวจ
                  </span>
                )}
                {returnedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800 font-semibold">
                    ↩ {returnedCount} ส่งกลับแก้ไข
                  </span>
                )}
                {overdueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-800 font-semibold animate-pulse">
                    ⚠ {overdueCount} เกินกำหนด
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Root Cause Banner (Auto-linked from Investigation) */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5 truncate max-w-2xl">
              <span className="text-rose-400 font-bold text-[11px] flex-shrink-0">สาเหตุรากเหง้า (Root Cause):</span>
              <span className="truncate italic text-[11px] text-slate-300">"{capa?.root_cause_summary}"</span>
            </div>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
              หมวด: {capa?.root_cause_category}
            </Badge>
          </div>
        </div>

        {/* ================= 2. WORKSPACE TABS ================= */}
        {loading || !capa ? (
          <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
            <Clock className="w-6 h-6 animate-spin mr-2 text-rose-600" />
            กำลังโหลดข้อมูล CAPA Workspace...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
                <TabsList className="bg-white dark:bg-slate-800 border p-1 shadow-sm inline-flex w-max min-w-full justify-start gap-1">
                  <TabsTrigger value="plan" className="text-xs gap-1.5 whitespace-nowrap">
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    1. แผนกลยุทธ์ CAPA (CAPA Plan)
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs gap-1.5 font-bold whitespace-nowrap">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    2. รายการมาตรการ ({actions.length})
                  </TabsTrigger>
                  <TabsTrigger value="evidence" className="text-xs gap-1.5 whitespace-nowrap">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    3. คลังหลักฐาน ({capa.evidence_list?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="status_summary" className="text-xs gap-1.5 font-bold whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    4. สถานะ & ประตูส่งมอบ Phase 4
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ================= TAB 1: CAPA PLAN ================= */}
              <TabsContent value="plan" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-rose-600" />
                        แผนการจัดการ CAPA (Cosmetics CAPA Plan Formulation)
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                        Zero Data Duplication
                      </Badge>
                    </CardTitle>
                    <p className="text-[11px] text-slate-500">
                      ข้อมูลเหตุการณ์และสาเหตุรากเหง้าถูกเชื่อมโยงมาจาก Investigation อัตโนมัติ แบ่งแยกชัดเจนระหว่างการแก้ไขเฉพาะหน้า และการแก้ปัญหาที่ต้นตอ
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    {/* Auto-linked Problem Statement */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-1">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        ข้อความระบุปัญหา (Problem Statement)
                        <Badge className="text-[9px] bg-slate-200 text-slate-700">AUTO-LINKED</Badge>
                      </Label>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300">{capa.problem_statement}</p>
                    </div>

                    {/* 3 Clear Categories of Actions */}
                    <div className="space-y-3">
                      
                      {/* 1. Correction */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-1 shadow-sm">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            🎯 1. CORRECTION (การแก้ไขปัญหาเฉพาะหน้าที่เกิดขึ้นแล้ว)
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">จัดการกับชิ้นงาน/แบทช์ที่มีปัญหาทันที</span>
                        </Label>
                        <Textarea 
                          value={capa.correction_plan || ''} 
                          onChange={(e) => setCapa({ ...capa, correction_plan: e.target.value })}
                          rows={2} 
                          placeholder="เช่น กักกันเนื้อ Bulk แบทช์ OOS, ทำการเจือจางปรับสมดุลภายใต้การควบคุมของฝ่าย R&D..."
                          className="text-xs" 
                        />
                      </div>

                      {/* 2. Corrective Action */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-1 shadow-sm border-l-4 border-l-rose-500">
                        <Label className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            🛡️ 2. CORRECTIVE ACTION (การแก้ที่สาเหตุเพื่อป้องกันการเกิดซ้ำ) *
                          </span>
                          <span className="text-[10px] text-rose-600 font-normal">กำจัดสาเหตุรากเหง้าอย่างถาวร</span>
                        </Label>
                        <Textarea 
                          value={capa.corrective_action_plan || ''} 
                          onChange={(e) => setCapa({ ...capa, corrective_action_plan: e.target.value })}
                          rows={3} 
                          placeholder="เช่น ปรับปรุงเซนเซอร์วัดอุณหภูมิ ติดตั้งระบบ Dual-Probe Cross-Check และเพิ่มระบบล็อก Poka-yoke..."
                          className="text-xs" 
                        />
                      </div>

                      {/* 3. Preventive / System Improvement */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-1 shadow-sm">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            ⚙️ 3. SYSTEM / PREVENTIVE IMPROVEMENT (การปรับปรุงระบบเพื่อควบคุมความเสี่ยงที่เกี่ยวข้อง)
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">ไม่บังคับหากไม่มีความเสี่ยงเชิงระบบขยายผล</span>
                        </Label>
                        <Textarea 
                          value={capa.preventive_improvement_plan || ''} 
                          onChange={(e) => setCapa({ ...capa, preventive_improvement_plan: e.target.value })}
                          rows={2} 
                          placeholder="เช่น ขยายผลตรวจสอบเซนเซอร์ของถังผสมอื่นในโรงงาน, ปรับปรุงแผนบำรุงรักษา PM ประจำปี..."
                          className="text-xs" 
                        />
                      </div>

                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button size="sm" onClick={handleSaveDraft} disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                        บันทึกแผนกลยุทธ์ CAPA ➔
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 2: ACTION ITEMS ================= */}
              <TabsContent value="actions" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        รายการมาตรการดำเนินการ (CAPA Action Items)
                      </CardTitle>
                      <span className="text-[11px] text-slate-500">
                        แต่ละมาตรการต้องมีผู้รับผิดชอบเดี่ยวที่ชัดเจน กำหนดส่ง และผ่านการตรวจรับรองโดย QA
                      </span>
                    </div>
                    <Button size="sm" onClick={() => setIsAddActionModalOpen(true)} className="text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                      <Plus className="w-3.5 h-3.5" /> เพิ่มมาตรการใหม่ (+ Add Action)
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    
                    {actions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">ยังไม่มีรายการมาตรการ คลิก "เพิ่มมาตรการใหม่" เพื่อสร้างแผนงาน</p>
                    ) : (
                      <div className="space-y-3">
                        {actions.map(act => {
                          const isOverdue = act.status !== 'VERIFIED' && act.status !== 'COMPLETED' && new Date(act.due_date) < now;
                          const isDueSoon = act.status !== 'VERIFIED' && act.status !== 'COMPLETED' && !isOverdue && new Date(act.due_date) <= new Date(now.getTime() + 3 * 86400000);
                          const isOwner = act.responsible_owner_id === currentUser.id;
                          const isQa = currentUser.role === 'QA_MANAGER' || currentUser.role === 'QA_OFFICER';

                          return (
                            <div 
                              key={act.id} 
                              className={`p-4 rounded-xl border transition-all ${
                                act.status === 'VERIFIED' ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300' :
                                act.status === 'COMPLETED' ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300' :
                                act.status === 'RETURNED' ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 ring-1 ring-amber-400' :
                                isOverdue ? 'bg-red-50/30 border-red-300 ring-1 ring-red-400' :
                                'bg-white dark:bg-slate-800 border-slate-200 shadow-sm'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1 max-w-2xl">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                      #{act.action_no}
                                    </span>
                                    <Badge variant="outline" className={`text-[10px] ${
                                      act.action_type === 'CORRECTIVE_ACTION' ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold' :
                                      act.action_type === 'PREVENTIVE_IMPROVEMENT' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {act.action_type === 'CORRECTIVE_ACTION' ? 'CORRECTIVE ACTION (แก้ต้นตอ)' :
                                       act.action_type === 'PREVENTIVE_IMPROVEMENT' ? 'PREVENTIVE (ปรับปรุงระบบ)' : 'CORRECTION (เฉพาะหน้า)'}
                                    </Badge>
                                    <Badge className={`text-[10px] ${
                                      act.status === 'VERIFIED' ? 'bg-emerald-600 text-white' :
                                      act.status === 'COMPLETED' ? 'bg-blue-600 text-white' :
                                      act.status === 'RETURNED' ? 'bg-amber-600 text-white' :
                                      act.status === 'IN_PROGRESS' ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'
                                    }`}>
                                      {act.status}
                                    </Badge>

                                    {/* Due Date Indicator Badge */}
                                    {isOverdue && (
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-600 text-white font-bold animate-pulse">
                                        OVERDUE (เกินกำหนด)
                                      </span>
                                    )}
                                    {isDueSoon && (
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-white font-bold">
                                        DUE SOON (ใกล้ครบกำหนด)
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    {act.title}
                                  </h3>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                    {act.description}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 pt-1">
                                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                      <User className="w-3 h-3 text-slate-400" /> ผู้รับผิดชอบ: {act.responsible_owner_name}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-slate-400" /> แผนก: {act.department_name}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 font-mono font-semibold">
                                      <Calendar className="w-3 h-3 text-slate-400" /> กำหนดส่ง: {new Date(act.due_date).toLocaleDateString('th-TH')}
                                    </span>
                                  </div>

                                  {/* Required Evidence Note */}
                                  {act.evidence_required && (
                                    <div className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-slate-900 p-1.5 rounded mt-1">
                                      <span className="font-semibold">หลักฐานที่ต้องแนบ:</span> {act.evidence_required}
                                    </div>
                                  )}

                                  {/* Implementation Notes (When Completed) */}
                                  {act.implementation_notes && (
                                    <div className="text-[11px] text-slate-800 dark:text-slate-200 bg-blue-50/60 dark:bg-slate-900 p-2 rounded border border-blue-200 mt-1.5">
                                      <span className="font-bold text-blue-900 dark:text-blue-300 block text-[10px]">บันทึกผลการปฏิบัติงาน:</span>
                                      {act.implementation_notes}
                                      <span className="text-[9px] text-slate-400 block mt-0.5">
                                        ส่งมอบโดย: {act.completed_by_name} ({act.completed_at ? new Date(act.completed_at).toLocaleString('th-TH') : ''})
                                      </span>
                                    </div>
                                  )}

                                  {/* QA Verification Comment */}
                                  {act.verification_comment && (
                                    <div className={`text-[11px] p-2 rounded border mt-1.5 ${
                                      act.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                                    }`}>
                                      <span className="font-bold block text-[10px]">ความเห็นการตรวจรับรองโดย QA:</span>
                                      {act.verification_comment}
                                      <span className="text-[9px] text-slate-500 block mt-0.5">
                                        ตรวจรับรองโดย: {act.verified_by_name} ({act.verified_at ? new Date(act.verified_at).toLocaleString('th-TH') : ''})
                                      </span>
                                    </div>
                                  )}

                                  {/* Return Reason */}
                                  {act.status === 'RETURNED' && act.return_reason && (
                                    <div className="text-[11px] p-2 rounded border border-amber-300 bg-amber-50 text-amber-900 mt-1.5">
                                      <span className="font-bold text-amber-900 block text-[10px]">ข้อสังเกตที่ส่งกลับให้แก้ไข:</span>
                                      {act.return_reason}
                                      <span className="text-[9px] text-slate-500 block mt-0.5">
                                        ส่งกลับโดย: {act.returned_by_name} ({act.returned_at ? new Date(act.returned_at).toLocaleString('th-TH') : ''})
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-1.5 items-end">
                                  {/* Status NOT_STARTED -> Start */}
                                  {act.status === 'NOT_STARTED' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => handleStartAction(act.id)} 
                                      className="text-xs h-7 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                    >
                                      เริ่มดำเนินการ ➔
                                    </Button>
                                  )}

                                  {/* Status IN_PROGRESS / RETURNED -> Submit Completed */}
                                  {(act.status === 'IN_PROGRESS' || act.status === 'RETURNED' || act.status === 'NOT_STARTED') && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        setSelectedActionForCompletion(act);
                                        setImplementationNotes(act.implementation_notes || '');
                                        setIsSubmitCompletedModalOpen(true);
                                      }}
                                      className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                    >
                                      ✓ ส่งมอบงานเสร็จสิ้น
                                    </Button>
                                  )}

                                  {/* Status COMPLETED -> QA Verify */}
                                  {act.status === 'COMPLETED' && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        setSelectedActionForVerification(act);
                                        setVerifyComment('');
                                        setIsVerifyModalOpen(true);
                                      }}
                                      className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                                    >
                                      🔍 QA ตรวจรับรอง (Verify)
                                    </Button>
                                  )}

                                  {/* Extension Request */}
                                  {act.status !== 'VERIFIED' && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => {
                                        setSelectedActionForExtension(act);
                                        setNewDueDate(act.due_date.slice(0, 10));
                                        setExtensionReason('');
                                        setIsExtensionModalOpen(true);
                                      }}
                                      className="text-[11px] h-6 text-slate-500 hover:text-slate-800"
                                    >
                                      ขอขยายเวลา...
                                    </Button>
                                  )}

                                  {/* Attach Evidence */}
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => {
                                      setNewEvidence({
                                        action_id: act.id,
                                        evidence_type: 'PHOTO',
                                        title: `หลักฐานมาตรการ #${act.action_no}: `,
                                        description: '',
                                        source: ''
                                      });
                                      setIsEvidenceModalOpen(true);
                                    }}
                                    className="text-[11px] h-6 text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <Paperclip className="w-3 h-3" /> แนบหลักฐาน
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 3: EVIDENCE REPOSITORY ================= */}
              <TabsContent value="evidence" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-indigo-600" />
                        คลังหลักฐานการปฏิบัติตามแผน CAPA (CAPA Implementation Evidence)
                      </CardTitle>
                      <span className="text-[11px] text-slate-500">
                        จัดเก็บหลักฐานยืนยัน เช่น ภาพถ่ายการปรับปรุง, บันทึกการฝึกอบรม, SOP/WI ฉบับแก้ไข, บันทึก PM
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setNewEvidence({
                          evidence_type: 'PHOTO',
                          title: '',
                          description: '',
                          source: ''
                        });
                        setIsEvidenceModalOpen(true);
                      }} 
                      className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> แนบหลักฐานใหม่ (+ Evidence)
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    {(!capa.evidence_list || capa.evidence_list.length === 0) ? (
                      <p className="text-xs text-slate-400 text-center py-8">ยังไม่มีรายการหลักฐานในคลัง</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {capa.evidence_list.map(ev => (
                          <div key={ev.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                                {ev.evidence_type}
                              </Badge>
                              <button onClick={() => handleDeleteEvidence(ev.id)} className="text-slate-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100">{ev.title}</h4>
                            {ev.description && <p className="text-slate-600 dark:text-slate-400 text-[11px]">{ev.description}</p>}
                            {ev.source && (
                              <div className="text-[10px] text-slate-500 font-mono">แหล่งที่มา: {ev.source}</div>
                            )}
                            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t">
                              <span>บันทึกโดย: {ev.uploaded_by_name}</span>
                              <span>{new Date(ev.created_at).toLocaleDateString('th-TH')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 4: STATUS SUMMARY & PHASE 4 GATE ================= */}
              <TabsContent value="status_summary" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      สถานะความสมบูรณ์ของแผนงาน & ประตูส่งมอบสู่ Phase 4 (Effectiveness Evaluation Gate)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    {/* Completion Rules Checklist */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border space-y-3 shadow-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        เกณฑ์ควบคุมการปิดการปฏิบัติการ CAPA (Implementation Completion Guardrails):
                      </span>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border">
                          <span className="text-slate-700 dark:text-slate-300">1. ทุกมาตรการปฏิบัติการต้องผ่านการตรวจรับรองโดย QA (All Required Actions VERIFIED):</span>
                          {verifiedCount === totalActions && totalActions > 0 ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">✓ ผ่านเกณฑ์ 100% ({verifiedCount}/{totalActions})</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] font-bold">
                              {progressPercent}% ({verifiedCount} / {totalActions} ผ่านตรวจรับ)
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border">
                          <span className="text-slate-700 dark:text-slate-300">2. ต้องไม่มีมาตรการที่ค้างแก้ไขหรือเกินกำหนดส่ง (No Overdue / Returned):</span>
                          {overdueCount === 0 && returnedCount === 0 ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">✓ ไม่มีค้างแก้ไข</Badge>
                          ) : (
                            <Badge className="bg-red-600 text-white text-[10px]">
                              ค้างแก้ไข {returnedCount} | เกินกำหนด {overdueCount}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border">
                          <span className="text-slate-700 dark:text-slate-300">3. มีหลักฐานยืนยันครบถ้วนตามที่กำหนด (Evidence Attached):</span>
                          {(capa.evidence_list?.length || 0) > 0 ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">✓ มีหลักฐาน {capa.evidence_list?.length} ฉบับ</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 text-[10px]">ไม่มีหลักฐาน</Badge>
                          )}
                        </div>
                      </div>

                      {/* Gate Condition Banner */}
                      {capa.current_status === 'AWAITING_EFFECTIVENESS' && isAllActionsVerified ? (
                        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 rounded-lg space-y-2 text-purple-900 dark:text-purple-200">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span>สถานะปัจจุบัน: AWAITING EFFECTIVENESS (100% — รอประเมินประสิทธิผล)</span>
                          </div>
                          <p className="text-[11px] text-purple-700 dark:text-purple-300">
                            มาตรการปฏิบัติการทั้งหมด ({totalActions} มาตรการ) ได้รับการตรวจรับรองผ่านเกณฑ์ 100% เรียบร้อย ระบบพร้อมส่งมอบสู่ <strong>Phase 4: Effectiveness & Recurrence Monitoring</strong> เพื่อให้ QA จัดทำแผนติดตามประสิทธิผลและเฝ้าระวังการเกิดซ้ำ (ระบบยังไม่ปิด CAPA ถาวรตามมาตรฐาน ISO 22716)
                          </p>
                          {onOpenEffectiveness && (
                            <Button
                              onClick={() => {
                                onClose();
                                onOpenEffectiveness(capa.id);
                              }}
                              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow h-8 gap-2 mt-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>เข้าสู่ Effectiveness & Recurrence Monitoring Workspace (Phase 4) ➔</span>
                            </Button>
                          )}
                        </div>
                      ) : capa.current_status === 'CLOSED_EFFECTIVE' ? (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg space-y-2 text-emerald-900 dark:text-emerald-200">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>สถานะปัจจุบัน: CLOSED — EFFECTIVE (ปิดสมบูรณ์และยืนยันประสิทธิผลแล้ว)</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                            CAPA นี้ผ่านการประเมินประสิทธิผลครบตามแผน ไม่พบการเกิดซ้ำ และ QA Manager ได้ลงนามปิดเคสเรียบร้อย
                          </p>
                          {onOpenEffectiveness && (
                            <Button
                              onClick={() => {
                                onClose();
                                onOpenEffectiveness(capa.id);
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow h-8 gap-2 mt-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>เปิดดูบันทึกและผลการประเมินประสิทธิผล (Effectiveness Record) ➔</span>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>สถานะปัจจุบัน: IN PROGRESS ({progressPercent}% — อยู่ระหว่างการปฏิบัติการ)</span>
                          </div>
                          <p>
                            การปฏิบัติการยังไม่เสร็จสมบูรณ์: ผ่านการตรวจรับรอง {verifiedCount} จาก {totalActions} มาตรการ ({progressPercent}%) — CAPA ต้องคงอยู่ในสถานะปฏิบัติการจนกว่ามาตรการทั้งหมดจะผ่านการตรวจรับรองโดย QA ก่อนส่งมอบสู่ Phase 4
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ================= 3. COCKPIT FOOTER ACTIONS ================= */}
        <div className="bg-white dark:bg-slate-900 p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={submitting} className="text-xs gap-1">
              💾 บันทึกแบบร่าง (Save Draft)
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              ปิดหน้าต่าง
            </Button>
          </div>
        </div>

      </DialogContent>

      {/* ================= MODAL: ADD ACTION ================= */}
      <Dialog open={isAddActionModalOpen} onOpenChange={setIsAddActionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-blue-900">
              <Plus className="w-4 h-4 text-blue-600" />
              เพิ่มมาตรการในแผน CAPA (Add CAPA Action Item)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">ประเภทมาตรการ *</Label>
              <select 
                value={newAction.action_type}
                onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value as QmsActionType })}
                className="w-full text-xs mt-1 p-2 border rounded font-semibold"
              >
                <option value="CORRECTIVE_ACTION">CORRECTIVE ACTION (การแก้ที่สาเหตุเพื่อป้องกันการเกิดซ้ำ)</option>
                <option value="CORRECTION">CORRECTION (การแก้ไขปัญหาเฉพาะหน้า)</option>
                <option value="PREVENTIVE_IMPROVEMENT">PREVENTIVE IMPROVEMENT (การปรับปรุงเชิงป้องกันระบบ)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">หัวข้อมาตรการ *</Label>
              <Input 
                value={newAction.title}
                onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                placeholder="เช่น ปรับปรุงแผนบำรุงรักษา PM ถอดล้าง RTD Sensor ทุกสัปดาห์..."
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">รายละเอียดขั้นตอนการปฏิบัติ</Label>
              <Textarea 
                value={newAction.description}
                onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                rows={2}
                placeholder="ระบุรายละเอียดสิ่งที่ต้องทำ วิธีการ และผลลัพธ์ที่ต้องการ..."
                className="text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">ผู้รับผิดชอบเดี่ยว (Owner) *</Label>
                <Input 
                  value={newAction.responsible_owner_name}
                  onChange={(e) => setNewAction({ ...newAction, responsible_owner_name: e.target.value })}
                  placeholder="ชื่อ-นามสกุล ผู้รับผิดชอบ"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">แผนกที่รับผิดชอบ *</Label>
                <Input 
                  value={newAction.department_name}
                  onChange={(e) => setNewAction({ ...newAction, department_name: e.target.value })}
                  placeholder="เช่น ซ่อมบำรุง, ผลิต, DCC"
                  className="text-xs mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">กำหนดแล้วเสร็จ (Due Date) *</Label>
              <Input 
                type="date"
                value={newAction.due_date}
                onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })}
                className="text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">หลักฐานที่ต้องใช้ยืนยัน (Evidence Required)</Label>
              <Input 
                value={newAction.evidence_required}
                onChange={(e) => setNewAction({ ...newAction, evidence_required: e.target.value })}
                placeholder="เช่น ภาพถ่ายใบ PM, เอกสาร WI ที่เซ็นรับรอง..."
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsAddActionModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={handleCreateAction} disabled={submitting} className="bg-blue-600 text-white">บันทึกมาตรการ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: SUBMIT COMPLETED ================= */}
      <Dialog open={isSubmitCompletedModalOpen} onOpenChange={setIsSubmitCompletedModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-blue-900">
              <Check className="w-4 h-4 text-blue-600" />
              ส่งมอบผลงานมาตรการ (Submit Action as Completed)
            </DialogTitle>
            <DialogDescription className="text-xs">
              #{selectedActionForCompletion?.action_no}: {selectedActionForCompletion?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">บันทึกผลการลงมือปฏิบัติ (Implementation Notes) *</Label>
              <Textarea 
                value={implementationNotes}
                onChange={(e) => setImplementationNotes(e.target.value)}
                rows={3}
                placeholder="ระบุสิ่งที่ได้ลงมือทำจริง วันที่แล้วเสร็จ และผลลัพธ์ที่ได้..."
                className="text-xs mt-1"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              * เมื่อส่งมอบแล้ว สถานะจะเปลี่ยนเป็น <strong>COMPLETED</strong> และรอให้ฝ่าย QA ตรวจรับรอง (Verify)
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsSubmitCompletedModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={handleSubmitCompleted} disabled={submitting} className="bg-blue-600 text-white">ยืนยันส่งมอบงาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: QA VERIFICATION ================= */}
      <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              การตรวจรับรองผลงานโดย QA (QA Action Verification)
            </DialogTitle>
            <DialogDescription className="text-xs">
              #{selectedActionForVerification?.action_no}: {selectedActionForVerification?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">ผลการประเมินโดย QA (Verification Decision) *</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setVerifyDecision('VERIFIED')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    verifyDecision === 'VERIFIED' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border text-slate-700'
                  }`}
                >
                  ✓ รับรองผ่านเกณฑ์ (VERIFIED)
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyDecision('RETURN_FOR_CORRECTION')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    verifyDecision === 'RETURN_FOR_CORRECTION' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border text-slate-700'
                  }`}
                >
                  ↩ ส่งกลับแก้ไข (RETURN)
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">ความคิดเห็น / ข้อสังเกตของ QA *</Label>
              <Textarea 
                value={verifyComment}
                onChange={(e) => setVerifyComment(e.target.value)}
                rows={3}
                placeholder={verifyDecision === 'VERIFIED' ? 'ระบุข้อสังเกตการตรวจรับรอง เช่น ตรวจสอบภาพถ่ายและเอกสาร PM เรียบร้อย...' : 'ระบุสิ่งที่ต้องให้แก้ไขเพิ่มเติม เช่น ขอให้แนบภาพหลังการติดตั้ง Jig เพิ่ม...'}
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsVerifyModalOpen(false)}>ยกเลิก</Button>
            <Button 
              size="sm" 
              onClick={handleVerifyAction} 
              disabled={submitting} 
              className={verifyDecision === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}
            >
              บันทึกผลการตรวจรับรอง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: DUE DATE EXTENSION ================= */}
      <Dialog open={isExtensionModalOpen} onOpenChange={setIsExtensionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-amber-900">
              ขอขยายเวลากำหนดส่ง (Request Due Date Extension)
            </DialogTitle>
            <DialogDescription className="text-xs">
              บันทึกการขอขยายเวลาอย่างโปร่งใสโดยไม่ลบกำหนดส่งดั้งเดิม
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">กำหนดส่งเดิม (Original Due Date)</Label>
              <div className="text-xs font-mono font-semibold text-slate-600 mt-1">
                {selectedActionForExtension?.due_date ? new Date(selectedActionForExtension.due_date).toLocaleDateString('th-TH') : '-'}
              </div>
            </div>
            <div>
              <Label className="text-xs">กำหนดส่งใหม่ (New Due Date) *</Label>
              <Input 
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">เหตุผลความจำเป็น (≥ 10 ตัวอักษร) *</Label>
              <Textarea 
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                rows={2}
                placeholder="เช่น รออะไหล่เซนเซอร์นำเข้าจากต่างประเทศ 7 วัน..."
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsExtensionModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={handleRequestExtension} disabled={submitting} className="bg-amber-600 text-white">บันทึกการขยายเวลา</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: ADD EVIDENCE ================= */}
      <Dialog open={isEvidenceModalOpen} onOpenChange={setIsEvidenceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              แนบหลักฐานการปฏิบัติ (Attach CAPA Evidence)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">ประเภทหลักฐาน</Label>
              <select 
                value={newEvidence.evidence_type}
                onChange={(e) => setNewEvidence({ ...newEvidence, evidence_type: e.target.value as QmsCapaEvidenceType })}
                className="w-full text-xs mt-1 p-2 border rounded font-semibold"
              >
                <option value="PHOTO">Photo (ภาพถ่ายการปรับปรุงหน้างาน)</option>
                <option value="REVISED_SOP_WI">Revised SOP / WI (คู่มือการทำงานฉบับปรับปรุง)</option>
                <option value="TRAINING_RECORD">Training Record (บันทึกการฝึกอบรมพนักงาน)</option>
                <option value="MAINTENANCE_RECORD">Maintenance / PM Record (บันทึกการซ่อมบำรุง/สอบเทียบ)</option>
                <option value="QC_RESULT">QC Result (ผลการทดสอบทางแล็บ)</option>
                <option value="SPECIFICATION">Specification (ข้อกำหนดมาตรฐาน)</option>
                <option value="SUPPLIER_DOCUMENT">Supplier Document / SCAR (หนังสือจากซัพพลายเออร์)</option>
                <option value="PROCESS_RECORD">Process Record (บันทึกการผลิต/เดินเครื่อง)</option>
                <option value="OTHER">Other Evidence (หลักฐานอื่น)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">ชื่อรายการหลักฐาน *</Label>
              <Input 
                value={newEvidence.title}
                onChange={(e) => setNewEvidence({ ...newEvidence, title: e.target.value })}
                placeholder="เช่น ภาพถ่ายหัวเซนเซอร์หลังทำความสะอาด, ใบประเมินการฝึกอบรม..."
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">รายละเอียด/แหล่งที่มา</Label>
              <Input 
                value={newEvidence.description}
                onChange={(e) => setNewEvidence({ ...newEvidence, description: e.target.value })}
                placeholder="เช่น ถ่ายจากหน้างานไลน์ผสม Cleanroom B2..."
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsEvidenceModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={handleAddEvidence} disabled={submitting} className="bg-indigo-600 text-white">บันทึกหลักฐาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Dialog>
  );
}
