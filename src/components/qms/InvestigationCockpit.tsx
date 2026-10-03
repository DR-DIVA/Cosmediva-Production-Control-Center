"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Paperclip, 
  Calendar, 
  HelpCircle, 
  CheckCircle2, 
  X, 
  Plus, 
  Trash2, 
  Search, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  Activity, 
  Building2, 
  RotateCcw,
  Check,
  ExternalLink,
  Eye,
  Link2,
  UserCheck,
  Beaker,
  Wrench,
  AlertCircle
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
  QmsQualityEvent, 
  QmsInvestigation, 
  QmsEvidenceType,
  QmsTimelineMilestoneType,
  QmsRcaTool,
  QmsRootCauseCategory,
  QmsSimilarEventItem,
  QmsSystemicCauseAssessment
} from '@/types/qms';
import { 
  getInvestigationByEventId, 
  saveInvestigationDraft, 
  addInvestigationEvidence, 
  deleteInvestigationEvidence, 
  addTimelineEvent, 
  deleteTimelineEvent, 
  searchSimilarEvents, 
  submitInvestigationForReview, 
  returnInvestigationForMoreWork, 
  approveInvestigationAndDecideCapa 
} from '@/app/actions/qms_investigation';

interface InvestigationCockpitProps {
  isOpen: boolean;
  onClose: () => void;
  qualityEvent: QmsQualityEvent;
  currentUser: { id: string; name: string; role: string };
  onSuccess?: () => void;
  onOpenCapaWorkspace?: (investigationId: string) => void;
}

const SYSTEMIC_FACTORS: Array<{
  key: keyof Omit<QmsSystemicCauseAssessment, 'is_evaluated' | 'systemic_findings' | 'evaluated_by' | 'evaluated_at'>;
  title: string;
  desc: string;
}> = [
  { key: 'training_adequate', title: '1. การฝึกอบรม (Training & Competence)', desc: 'พนักงานได้รับการอบรม ประเมินผล และมีใบรับรองทักษะในขั้นตอนงานนี้ครบถ้วนหรือไม่?' },
  { key: 'sop_clarity_adequate', title: '2. ความชัดเจนของคู่มือ (SOP / WI Clarity)', desc: 'เอกสารขั้นตอนการทำงานชัดเจน อัปเดตล่าสุด อยู่หน้างาน และเป็นภาษาที่เข้าใจง่ายหรือไม่?' },
  { key: 'workload_reasonable', title: '3. ภาระงานและความเร่งรีบ (Workload & Pace)', desc: 'ความเร็วไลน์ผลิตและภาระงานสมเหตุสมผล ไม่เร่งรีบจนเสี่ยงต่อความผิดพลาดหรือไม่?' },
  { key: 'equipment_interface_clear', title: '4. ส่วนต่อประสานเครื่องจักร (Equipment Interface)', desc: 'หน้าจอปุ่มกดและสัญลักษณ์ชัดเจน ไม่ชวนให้สับสนหรือกดพลาดง่ายหรือไม่?' },
  { key: 'poka_yoke_present', title: '5. ระบบป้องกันความผิดพลาดทางกายภาพ (Poka-Yoke)', desc: 'มีเซนเซอร์ ล็อกเกอร์ หรือระบบป้องกันทางกายภาพเพื่อป้องกันข้อผิดพลาดหรือไม่?' },
  { key: 'ergonomics_suitable', title: '6. กายศาสตร์และสภาพแวดล้อม (Ergonomics & Fatigue)', desc: 'แสงสว่าง เสียง ท่าทางการทำงาน และความเมื่อยล้าได้รับการดูแลอย่างเหมาะสมหรือไม่?' },
  { key: 'process_design_robust', title: '7. การออกแบบกระบวนการ (Process Design Robustness)', desc: 'กระบวนการออกแบบมาให้มีความทนทาน ไม่พึ่งพาความแม่นยำของมนุษย์เพียงอย่างเดียวหรือไม่?' },
  { key: 'supervision_adequate', title: '8. การกำกับดูแลหน้างาน (Supervision & Double-Check)', desc: 'มีหัวหน้างานตรวจเช็ค (Line Clearance / In-process Check) สม่ำเสมอหรือไม่?' },
  { key: 'system_controls_sufficient', title: '9. ระบบการควบคุมโรงงาน (System Controls & Traceability)', desc: 'ระบบตรวจสอบย้อนกลับ บาร์โค้ด และการจ่ายสารเคมีทำงานได้อย่างถูกต้องสมบูรณ์หรือไม่?' },
  { key: 'maintenance_preventive_adhered', title: '10. การบำรุงรักษาเชิงป้องกัน (Preventive Maintenance)', desc: 'เครื่องจักร อุปกรณ์ ชั่งตวง วัด ได้รับการคาลิเบรตและบำรุงรักษาตามรอบกำหนดหรือไม่?' }
];

export default function InvestigationCockpit({
  isOpen,
  onClose,
  qualityEvent,
  currentUser,
  onSuccess,
  onOpenCapaWorkspace
}: InvestigationCockpitProps) {
  const [investigation, setInvestigation] = useState<QmsInvestigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions');
  const [showOriginalContext, setShowOriginalContext] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Recurrence confirmation state
  const [qaConfirmedRelatedIds, setQaConfirmedRelatedIds] = useState<string[]>([]);

  // Source Record View Modal state
  const [viewingSourceRecord, setViewingSourceRecord] = useState<{
    type: 'QC' | 'SPEC' | 'BATCH' | 'MATERIAL';
    title: string;
    details: Record<string, string | number | boolean>;
  } | null>(null);

  // Evidence state
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [newEvidence, setNewEvidence] = useState<{
    evidence_type: QmsEvidenceType;
    title: string;
    description: string;
    source: string;
    relationship_to_investigation: string;
    file_url?: string;
    file_name?: string;
  }>({
    evidence_type: 'QC_RESULT',
    title: '',
    description: '',
    source: '',
    relationship_to_investigation: ''
  });

  // Timeline state
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [newTimeline, setNewTimeline] = useState<{
    event_title: string;
    event_description: string;
    event_timestamp: string;
    milestone_type: QmsTimelineMilestoneType;
    event_source: 'SYSTEM' | 'MANUAL' | 'LOG' | 'QC';
  }>({
    event_title: '',
    event_description: '',
    event_timestamp: new Date().toISOString().slice(0, 16),
    milestone_type: 'OTHER',
    event_source: 'MANUAL'
  });

  // Similar Events State
  const [similarEvents, setSimilarEvents] = useState<QmsSimilarEventItem[]>([]);
  const [similarSearching, setSimilarSearching] = useState(false);
  const [hasScannedSimilar, setHasScannedSimilar] = useState(false);

  // 6M Fishbone state
  const [newFishboneItem, setNewFishboneItem] = useState<{ category: keyof QmsInvestigation['fishbone_6m']; text: string }>({
    category: 'machine',
    text: ''
  });

  // Return dialog state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Approval QA Notes
  const [qaReviewNotes, setQaReviewNotes] = useState('');
  const [capaRequiredChoice, setCapaRequiredChoice] = useState<boolean>(false);
  const [capaDecisionJustification, setCapaDecisionJustification] = useState('');

  // Load investigation data
  useEffect(() => {
    if (isOpen && qualityEvent?.id) {
      loadInvestigation();
    }
  }, [isOpen, qualityEvent?.id]);

  async function loadInvestigation() {
    setLoading(true);
    try {
      const res = await getInvestigationByEventId(qualityEvent.id);
      if (res.success && res.data) {
        setInvestigation(res.data);
        const confirmedIds = res.data.qa_confirmed_related_event_ids || [];
        setQaConfirmedRelatedIds(confirmedIds);
        setCapaRequiredChoice(res.data.capa_required ?? (res.data.capa_system_recommendation === 'YES'));
        setQaReviewNotes(res.data.qa_review_notes || '');
        setCapaDecisionJustification(res.data.capa_decision_justification || '');
      } else {
        toast.error(res.error || 'ไม่พบข้อมูลการสืบสวน');
      }
    } catch (err: any) {
      toast.error(err.message || 'โหลดข้อมูลการสืบสวนล้มเหลว');
    } finally {
      setLoading(false);
    }
  }

  // Auto-Search Similar Events with deterministic multi-dimensional scoring
  async function handleSearchSimilar() {
    setSimilarSearching(true);
    try {
      const res = await searchSimilarEvents({
        productId: qualityEvent.product_id,
        productionLotId: qualityEvent.production_lot_id,
        materialLotNo: qualityEvent.material_lot_no,
        materialType: qualityEvent.material_type,
        equipmentCode: qualityEvent.equipment_code,
        supplierName: qualityEvent.supplier_name,
        departmentId: qualityEvent.department_id,
        eventType: qualityEvent.qa_confirmed_type,
        excludeEventId: qualityEvent.id
      });
      if (res.success) {
        setSimilarEvents(res.data as QmsSimilarEventItem[]);
        setHasScannedSimilar(true);
        if (res.recurrenceCount > 0) {
          toast.info(`ระบบตรวจพบเหตุการณ์ที่คล้ายกัน ${res.recurrenceCount} รายการในฐานข้อมูล`);
        } else {
          toast.info('ไม่พบเหตุการณ์ที่คล้ายกันในประวัติย้อนหลัง');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('ค้นหาประวัติเหตุการณ์ล้มเหลว');
    } finally {
      setSimilarSearching(false);
    }
  }

  // Toggle QA Confirmation of Related Recurrence
  function toggleConfirmRelatedEvent(eventId: string) {
    if (!investigation) return;
    const isAlreadyConfirmed = qaConfirmedRelatedIds.includes(eventId);
    const updatedIds = isAlreadyConfirmed 
      ? qaConfirmedRelatedIds.filter(id => id !== eventId)
      : [...qaConfirmedRelatedIds, eventId];

    setQaConfirmedRelatedIds(updatedIds);

    const hasRecurrence = updatedIds.length > 0;
    setInvestigation({
      ...investigation,
      qa_confirmed_related_event_ids: updatedIds,
      question_framework: {
        ...investigation.question_framework,
        has_happened_before: hasRecurrence,
        recurrence_details: hasRecurrence 
          ? `QA ยืนยันพบประวัติเหตุการณ์ซ้ำที่เกี่ยวข้องกันจำนวน ${updatedIds.length} รายการในระบบ`
          : 'QA ตรวจสอบแล้วไม่พบความเชื่อมโยงกับเหตุการณ์ซ้ำในอดีต'
      },
      capa_system_recommendation: hasRecurrence ? 'YES' : investigation.capa_system_recommendation,
      capa_recommendation_rationale: hasRecurrence 
        ? `ตรวจพบและยืนยันข้อบกพร่องเกิดซ้ำข้ามล็อตการผลิต (${updatedIds.length} รายการ) เข้าเกณฑ์ที่ควรพิจารณาเปิด CAPA (CAPA RECOMMENDED)`
        : investigation.capa_recommendation_rationale
    });

    if (hasRecurrence) {
      setCapaRequiredChoice(true);
      toast.info(`QA ยืนยันเหตุการณ์เกิดซ้ำ ${updatedIds.length} รายการ — ระบบปรับคำแนะนำเป็น "เข้าเกณฑ์ที่ควรพิจารณาเปิด CAPA"`);
    } else {
      toast.info('ยกเลิกการยืนยันประวัติซ้ำ');
    }
  }

  // Save Draft Handler
  async function handleSaveDraft(silent = false) {
    if (!investigation) return;
    try {
      const res = await saveInvestigationDraft({
        investigationId: investigation.id,
        questionFramework: investigation.question_framework,
        rcaTool: investigation.rca_tool,
        fiveWhys: investigation.five_whys,
        fishbone6M: investigation.fishbone_6m,
        simpleRootCauseStatement: investigation.simple_root_cause_statement,
        isRootCauseConfirmed: investigation.is_root_cause_confirmed,
        rootCauseCategory: investigation.root_cause_category,
        rootCauseSummary: investigation.root_cause_summary,
        unconfirmedJustification: investigation.unconfirmed_justification,
        systemicCauseAssessment: investigation.systemic_cause_assessment,
        immediateCorrectionDescription: investigation.immediate_correction_description,
        immediateCorrectionCompleted: investigation.immediate_correction_completed,
        targetDueDate: investigation.target_due_date,
        qaConfirmedRelatedEventIds: qaConfirmedRelatedIds,
        userId: currentUser.id,
        userName: currentUser.name
      });

      if (res.success) {
        if (!silent) toast.success('บันทึกแบบร่างการสืบสวนเรียบร้อย');
      } else {
        toast.error(res.error || 'บันทึกแบบร่างล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    }
  }

  // 5-Why: Add Step
  function addFiveWhyStep() {
    if (!investigation) return;
    const currentSteps = investigation.five_whys || [];
    const nextNum = currentSteps.length + 1;
    const updated = [...currentSteps, { why_number: nextNum, cause: '', explanation: '' }];
    setInvestigation({ ...investigation, five_whys: updated });
  }

  // 5-Why: Remove Step
  function removeFiveWhyStep(index: number) {
    if (!investigation) return;
    const updated = investigation.five_whys.filter((_, i) => i !== index).map((w, idx) => ({ ...w, why_number: idx + 1 }));
    setInvestigation({ ...investigation, five_whys: updated });
  }

  // 5-Why: Take deepest why as root cause
  function useDeepestWhyAsRootCause() {
    if (!investigation || !investigation.five_whys || investigation.five_whys.length === 0) return;
    const reversed = [...investigation.five_whys].reverse();
    const deepest = reversed.find(w => w.cause && w.cause.trim().length > 0);
    if (!deepest) {
      toast.warning('กรุณากรอกสาเหตุในขั้นตอน Why ก่อนนำมาเป็นบทสรุป');
      return;
    }
    setInvestigation({
      ...investigation,
      root_cause_summary: deepest.cause.trim(),
      is_root_cause_confirmed: true
    });
    toast.success(`นำข้อสรุป Why #${deepest.why_number} ไปเป็นสาเหตุรากเหง้าเรียบร้อย`);
  }

  // Add Fishbone Pill
  function addFishbonePill() {
    if (!investigation || !newFishboneItem.text.trim()) return;
    const cat = newFishboneItem.category;
    const currentList = investigation.fishbone_6m[cat] || [];
    const updated = {
      ...investigation.fishbone_6m,
      [cat]: [...currentList, newFishboneItem.text.trim()]
    };
    setInvestigation({ ...investigation, fishbone_6m: updated });
    setNewFishboneItem({ ...newFishboneItem, text: '' });
  }

  // Remove Fishbone Pill
  function removeFishbonePill(category: keyof QmsInvestigation['fishbone_6m'], index: number) {
    if (!investigation) return;
    const updated = {
      ...investigation.fishbone_6m,
      [category]: investigation.fishbone_6m[category].filter((_, i) => i !== index)
    };
    setInvestigation({ ...investigation, fishbone_6m: updated });
  }

  // Add Evidence Submit
  async function handleAddEvidence() {
    if (!investigation || !newEvidence.title.trim()) {
      toast.error('กรุณาระบุชื่อรายการหลักฐาน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await addInvestigationEvidence({
        investigationId: investigation.id,
        evidenceType: newEvidence.evidence_type,
        title: newEvidence.title,
        description: newEvidence.description,
        source: newEvidence.source,
        fileUrl: newEvidence.file_url,
        fileName: newEvidence.file_name,
        relationshipToInvestigation: newEvidence.relationship_to_investigation,
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name
      });

      if (res.success && res.data) {
        toast.success('แนบหลักฐานเรียบร้อย');
        setInvestigation({
          ...investigation,
          evidence_list: [res.data, ...(investigation.evidence_list || [])]
        });
        setIsEvidenceModalOpen(false);
        setNewEvidence({
          evidence_type: 'QC_RESULT',
          title: '',
          description: '',
          source: '',
          relationship_to_investigation: ''
        });
      } else {
        toast.error(res.error || 'แนบหลักฐานล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Evidence
  async function handleDeleteEvidence(id: string) {
    if (!investigation) return;
    const res = await deleteInvestigationEvidence(id);
    if (res.success) {
      toast.success('ลบหลักฐานแล้ว');
      setInvestigation({
        ...investigation,
        evidence_list: (investigation.evidence_list || []).filter(e => e.id !== id)
      });
    } else {
      toast.error(res.error || 'ลบล้มเหลว');
    }
  }

  // Add Timeline Submit
  async function handleAddTimeline() {
    if (!investigation || !newTimeline.event_title.trim()) {
      toast.error('กรุณาระบุหัวข้อเหตุการณ์');
      return;
    }
    setSubmitting(true);
    try {
      const res = await addTimelineEvent({
        investigationId: investigation.id,
        eventTitle: newTimeline.event_title,
        eventDescription: newTimeline.event_description,
        eventTimestamp: new Date(newTimeline.event_timestamp).toISOString(),
        milestoneType: newTimeline.milestone_type,
        eventSource: newTimeline.event_source,
        createdBy: currentUser.id,
        createdByName: currentUser.name
      });

      if (res.success && res.data) {
        toast.success('บันทึกไทม์ไลน์เรียบร้อย');
        const sorted = [...(investigation.timeline_events || []), res.data].sort((a, b) => 
          new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
        );
        setInvestigation({
          ...investigation,
          timeline_events: sorted
        });
        setIsTimelineModalOpen(false);
        setNewTimeline({
          event_title: '',
          event_description: '',
          event_timestamp: new Date().toISOString().slice(0, 16),
          milestone_type: 'OTHER',
          event_source: 'MANUAL'
        });
      } else {
        toast.error(res.error || 'บันทึกไทม์ไลน์ล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Timeline
  async function handleDeleteTimeline(id: string) {
    if (!investigation) return;
    const res = await deleteTimelineEvent(id);
    if (res.success) {
      toast.success('ลบจุดเวลาแล้ว');
      setInvestigation({
        ...investigation,
        timeline_events: (investigation.timeline_events || []).filter(t => t.id !== id)
      });
    }
  }

  // Submit for QA Review
  async function handleSubmitReview() {
    if (!investigation) return;
    setSubmitting(true);
    try {
      // Save draft first
      await handleSaveDraft(true);

      const res = await submitInvestigationForReview({
        investigationId: investigation.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        investigationSummary: investigation.investigation_summary || investigation.root_cause_summary || ''
      });

      if (res.success) {
        toast.success('ส่งผลการสืบสวนเข้าสู่สถานะ QA Review เรียบร้อย');
        loadInvestigation();
        onSuccess?.();
      } else {
        toast.error(res.error || 'ส่งขอตรวจสอบล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'ส่งขอตรวจสอบล้มเหลว');
    } finally {
      setSubmitting(false);
    }
  }

  // Return for more work
  async function handleReturn() {
    if (!investigation || !returnReason.trim()) {
      toast.error('กรุณาระบุเหตุผลการส่งกลับ');
      return;
    }
    setSubmitting(true);
    try {
      const res = await returnInvestigationForMoreWork({
        investigationId: investigation.id,
        returnReason,
        qaUserId: currentUser.id,
        qaUserName: currentUser.name
      });
      if (res.success) {
        toast.success('ส่งกลับเพื่อสืบสวนเพิ่มเติมเรียบร้อย');
        setIsReturnModalOpen(false);
        loadInvestigation();
        onSuccess?.();
      } else {
        toast.error(res.error || 'ดำเนินการล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Final Approve & Close
  async function handleApprove() {
    if (!investigation) return;
    if (!qaReviewNotes.trim()) {
      toast.error('กรุณาระบุบันทึกความเห็นของ QA (QA Review Notes)');
      return;
    }

    if (investigation.capa_system_recommendation === 'YES' && !capaRequiredChoice) {
      if (!capaDecisionJustification || capaDecisionJustification.trim().length < 15) {
        toast.error('ระบบแนะนำให้เปิด CAPA — หากต้องการไม่เปิด ต้องระบุเหตุผลกำกับอย่างน้อย 15 ตัวอักษร');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await approveInvestigationAndDecideCapa({
        investigationId: investigation.id,
        qaReviewNotes,
        capaRequired: capaRequiredChoice,
        capaDecisionJustification,
        qaUserId: currentUser.id,
        qaUserName: currentUser.name,
        qaRole: currentUser.role
      });

      if (res.success) {
        toast.success(`อนุมัติรับรองผลการสืบสวนเรียบร้อย (${capaRequiredChoice ? 'เปิด CAPA ต่อเนื่อง' : 'ยุติเคส RESOLVED'})`);
        loadInvestigation();
        onSuccess?.();
        if (capaRequiredChoice && onOpenCapaWorkspace) {
          onClose();
          onOpenCapaWorkspace(investigation.id);
        } else {
          onClose();
        }
      } else {
        toast.error(res.error || 'การอนุมัติล้มเหลว');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Helper: check if human error / MAN is claimed
  const isManClaimed = investigation?.root_cause_category === 'MAN' || 
    (investigation?.five_whys || []).some(w => /คน|พนักงาน|ผู้ปฏิบัติงาน|operator|human|mistake|ลืม/i.test(w.cause || '')) ||
    /คน|พนักงาน|ผู้ปฏิบัติงาน|operator|human|mistake|ลืม/i.test(investigation?.simple_root_cause_statement || '') ||
    /คน|พนักงาน|ผู้ปฏิบัติงาน|operator|human|mistake|ลืม/i.test(investigation?.root_cause_summary || '');

  // Snapshot context helpers
  const mfgContext = qualityEvent.snapshot_context?.manufacturing_context;
  const matContext = mfgContext?.material;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[94vh] p-0 overflow-hidden flex flex-col">
        
        {/* ================= 1. COCKPIT HEADER ================= */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-indigo-400">
                  {investigation?.investigation_no || 'INV-PENDING'}
                </span>
                <span className="text-slate-500 font-mono text-xs">/</span>
                <span className="font-mono text-xs font-semibold text-slate-300">
                  {qualityEvent.event_no}
                </span>
                <Badge variant="outline" className="border-indigo-400 text-indigo-300 bg-indigo-950/40 text-[10px] font-mono">
                  {qualityEvent.qa_confirmed_type}
                </Badge>
                <Badge className={`text-[10px] ${
                  qualityEvent.qa_confirmed_severity === 'CRITICAL' ? 'bg-red-600' :
                  qualityEvent.qa_confirmed_severity === 'MAJOR' ? 'bg-amber-600' : 'bg-emerald-600'
                }`}>
                  {qualityEvent.qa_confirmed_severity}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                  {qualityEvent.workflow_path === 'FULL_CAPA' ? 'FULL INVESTIGATION' : qualityEvent.workflow_path}
                </Badge>
              </div>
              <h2 className="text-sm font-bold text-white truncate max-w-2xl">
                ห้องปฏิบัติการสืบสวนและวิเคราะห์สาเหตุรากเหง้า (QA Investigation Cockpit)
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={`text-xs font-semibold ${
                investigation?.current_status === 'COMPLETED' ? 'bg-emerald-600' :
                investigation?.current_status === 'QA_REVIEW' ? 'bg-indigo-600 animate-pulse' :
                investigation?.current_status === 'IN_INVESTIGATION' ? 'bg-blue-600' : 'bg-slate-700'
              }`}>
                สถานะ: {investigation?.current_status || 'NOT_STARTED'}
              </Badge>
              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Key Quick Facts Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-3 pt-3 border-t border-slate-800 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">ผลิตภัณฑ์ / SKU:</span>
              <span className="font-semibold truncate block">
                {mfgContext?.product?.product_name || qualityEvent.title}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">แบทช์ผลิต / วัตถุดิบ:</span>
              <span className="font-semibold truncate block font-mono">
                {qualityEvent.material_lot_no || qualityEvent.production_lot_id || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">ผู้รับผิดชอบการสืบสวน:</span>
              <span className="font-semibold block">
                {investigation?.assigned_lead_name || currentUser.name}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">กำหนดส่ง (Due Date):</span>
              <span className="font-semibold block text-amber-400 font-mono">
                {investigation?.target_due_date ? new Date(investigation.target_due_date).toLocaleDateString('th-TH') : '-'}
              </span>
            </div>
          </div>

          {/* Collapsible Original Triage & Impact Context Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <button 
              type="button" 
              onClick={() => setShowOriginalContext(!showOriginalContext)} 
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              {showOriginalContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showOriginalContext ? 'ซ่อนบริบทดั้งเดิมจากการประเมินเหตุการณ์คุณภาพ' : 'แสดงผลประเมิน 7 มิติ & มาตรการกักกันดั้งเดิม (Show Original Assessment Context)'}
            </button>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>ตลาด: {qualityEvent.destination_market}</span>
              <span>•</span>
              <span>ผู้รายงาน: {qualityEvent.reporter_name}</span>
            </div>
          </div>

          {/* Original Context Drawer */}
          {showOriginalContext && (
            <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex flex-wrap gap-1">
                {qualityEvent.initial_impact_assessment && Object.entries(qualityEvent.initial_impact_assessment).map(([k, v]) => (
                  <span key={k} className={`px-2 py-0.5 rounded text-[10px] border ${
                    v === 'YES' ? 'bg-red-950 text-red-300 border-red-800 font-bold' :
                    v === 'UNKNOWN' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {k}: {v}
                  </span>
                ))}
              </div>
              {qualityEvent.containment_types && qualityEvent.containment_types.length > 0 && (
                <div className="text-[11px] text-red-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  มาตรการกักกันที่สั่งการไว้: {qualityEvent.containment_types.join(', ')}
                </div>
              )}
              {qualityEvent.qa_classification_notes && (
                <p className="text-[11px] text-slate-400 italic">"{qualityEvent.qa_classification_notes}"</p>
              )}
            </div>
          )}
        </div>

        {/* ================= 2. WORKSPACE TABS ================= */}
        {loading || !investigation ? (
          <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
            <Clock className="w-6 h-6 animate-spin mr-2 text-indigo-600" />
            กำลังโหลดห้องสืบสวนและวิเคราะห์สาเหตุ...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
                <TabsList className="bg-white dark:bg-slate-800 border p-1 shadow-sm inline-flex w-max min-w-full justify-start gap-1">
                  <TabsTrigger value="questions" className="text-xs gap-1.5 whitespace-nowrap">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                    1. กรอบคำถามสืบสวน (Question Framework)
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs gap-1.5 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    2. ไทม์ไลน์ ({investigation.timeline_events?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="evidence" className="text-xs gap-1.5 whitespace-nowrap">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    3. หลักฐาน & QC ({investigation.evidence_list?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="similar" className="text-xs gap-1.5 whitespace-nowrap">
                    <Search className="w-3.5 h-3.5 text-purple-600" />
                    4. ประวัติซ้ำ ({qaConfirmedRelatedIds.length > 0 ? `${qaConfirmedRelatedIds.length} ยืนยัน` : similarEvents.length})
                  </TabsTrigger>
                  <TabsTrigger value="rca" className="text-xs gap-1.5 font-bold whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    5. วิเคราะห์สาเหตุ (RCA)
                  </TabsTrigger>
                  <TabsTrigger value="systemic" className="text-xs gap-1.5 whitespace-nowrap">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    6. ประเมินเชิงระบบ {isManClaimed && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />}
                  </TabsTrigger>
                  <TabsTrigger value="capa_gate" className="text-xs gap-1.5 font-bold whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    7. ประตู CAPA & การอนุมัติ
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ================= TAB 1: QUESTION FRAMEWORK ================= */}
              <TabsContent value="questions" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-indigo-600" />
                        กรอบคำถามเพื่อการสืบสวน (Cosmetics Investigation Question Framework)
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                          ข้อมูลจากระบบ (System Pre-filled)
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          ข้อมูลจากการสืบสวน (Investigator Input)
                        </Badge>
                      </div>
                    </CardTitle>
                    <p className="text-[11px] text-slate-500">
                      ระบบดึงข้อมูลที่ CosmeFlow ทราบอยู่แล้วจาก Quality Event มาให้อัตโนมัติ ผู้สืบสวนสามารถแก้ไขหรือใส่ข้อมูลเพิ่มเติมเฉพาะหน้างานได้
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    {/* Q1 & Q2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            1. เกิดอะไรขึ้น? (WHAT happened?)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM DATA</Badge>
                          </Label>
                        </div>
                        <Textarea 
                          value={investigation.question_framework.what_happened} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, what_happened: e.target.value }
                          })}
                          rows={2} className="text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            2. ตามมาตรฐานควรเป็นอย่างไร? (WHAT should have happened?)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM DATA</Badge>
                          </Label>
                        </div>
                        <Textarea 
                          value={investigation.question_framework.what_should_have_happened} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, what_should_have_happened: e.target.value }
                          })}
                          rows={2} className="text-xs" 
                        />
                      </div>
                    </div>

                    {/* Q3, Q4, Q5 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            3. ช่องว่างที่ยืนยันได้ (Confirmed Gap)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM</Badge>
                          </Label>
                        </div>
                        <Input 
                          value={investigation.question_framework.confirmed_gap} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, confirmed_gap: e.target.value }
                          })}
                          className="text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            4. เกิดขึ้นเมื่อใด? (WHEN occurred?)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM</Badge>
                          </Label>
                        </div>
                        <Input 
                          value={investigation.question_framework.when_occurred} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, when_occurred: e.target.value }
                          })}
                          className="text-xs font-mono" 
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            5. เกิดขึ้นที่ไหน? (WHERE occurred?)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM</Badge>
                          </Label>
                        </div>
                        <Input 
                          value={investigation.question_framework.where_occurred} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, where_occurred: e.target.value }
                          })}
                          className="text-xs" 
                        />
                      </div>
                    </div>

                    {/* Q6, Q7, Q8 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            6. ตรวจพบเมื่อใด? (WHEN first detected?)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM</Badge>
                          </Label>
                        </div>
                        <Input 
                          value={investigation.question_framework.when_detected} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, when_detected: e.target.value }
                          })}
                          className="text-xs font-mono" 
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            7. ผู้เกี่ยวข้อง/ขั้นตอน (WHO/PROCESS?)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM</Badge>
                          </Label>
                        </div>
                        <Input 
                          value={investigation.question_framework.who_process_involved} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, who_process_involved: e.target.value }
                          })}
                          className="text-xs" 
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            8. ปริมาณที่อาจกระทบ (Quantity/Batches)
                            <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM</Badge>
                          </Label>
                        </div>
                        <Input 
                          value={investigation.question_framework.quantity_batches_affected} 
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, quantity_batches_affected: e.target.value }
                          })}
                          className="text-xs" 
                        />
                      </div>
                    </div>

                    {/* Initial Containment Status (System Pre-filled) */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-red-600" />
                          สถานะการควบคุมกักกันเบื้องต้น (Initial Containment Status)
                          <Badge className="text-[9px] bg-indigo-100 text-indigo-800 font-normal">SYSTEM DATA</Badge>
                        </Label>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300">
                        {qualityEvent.containment_types && qualityEvent.containment_types.length > 0 
                          ? `ดำเนินการกักกัน: ${qualityEvent.containment_types.join(', ')}`
                          : 'ไม่มีการสั่งการกักกันสต็อกเพิ่มเติม'}
                      </p>
                      {qualityEvent.qa_classification_notes && (
                        <p className="text-[10px] text-slate-500 italic">บันทึกหน้างาน: {qualityEvent.qa_classification_notes}</p>
                      )}
                    </div>

                    {/* Q9: What changed before event */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          9. มีการเปลี่ยนแปลงใดก่อนเกิดเหตุ? (WHAT changed before event?)
                          <Badge className="text-[9px] bg-amber-100 text-amber-800 font-normal">INVESTIGATOR INPUT</Badge>
                        </Label>
                        <button
                          type="button"
                          onClick={() => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, what_changed_before_event: 'N/A - ไม่พบการเปลี่ยนแปลงเงื่อนไขหรือปัจจัยก่อนเกิดเหตุ' }
                          })}
                          className="text-[10px] text-slate-500 hover:text-indigo-600 underline"
                        >
                          [ N/A - ไม่พบการเปลี่ยนแปลง ]
                        </button>
                      </div>
                      <Input 
                        placeholder="เช่น เปลี่ยนล็อตวัตถุดิบ, ล้างเครื่องจักร, ซ่อมบำรุง, เปลี่ยนคนผสม..."
                        value={investigation.question_framework.what_changed_before_event} 
                        onChange={(e) => setInvestigation({
                          ...investigation,
                          question_framework: { ...investigation.question_framework, what_changed_before_event: e.target.value }
                        })}
                        className="text-xs" 
                      />
                    </div>

                    {/* Q10: Recurrence Question */}
                    <div className="p-3 bg-amber-50/60 dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          10. เคยเกิดเหตุการณ์ลักษณะนี้มาก่อนหรือไม่? (HAS this happened before?)
                          <Badge className="text-[9px] bg-purple-100 text-purple-800 font-normal">INVESTIGATOR / LINKED</Badge>
                        </Label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInvestigation({
                              ...investigation,
                              question_framework: { ...investigation.question_framework, has_happened_before: true }
                            })}
                            className={`px-3 py-1 rounded text-xs font-bold ${
                              investigation.question_framework.has_happened_before ? 'bg-amber-600 text-white' : 'bg-white border text-slate-600'
                            }`}
                          >
                            เคยเกิดซ้ำ (Recurring)
                          </button>
                          <button
                            type="button"
                            onClick={() => setInvestigation({
                              ...investigation,
                              question_framework: { ...investigation.question_framework, has_happened_before: false }
                            })}
                            className={`px-3 py-1 rounded text-xs font-bold ${
                              !investigation.question_framework.has_happened_before ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                            }`}
                          >
                            ไม่เคย (First Time)
                          </button>
                        </div>
                      </div>
                      {investigation.question_framework.has_happened_before && (
                        <div>
                          <Label className="text-[11px] text-amber-800 dark:text-amber-300">
                            รายละเอียดการเกิดซ้ำ (Recurrence Details)
                          </Label>
                          <Input 
                            placeholder="ระบุเลขที่ Quality Event เดิม หรือตรวจยืนยันในแท็บที่ 4 (ประวัติซ้ำ)..."
                            value={investigation.question_framework.recurrence_details} 
                            onChange={(e) => setInvestigation({
                              ...investigation,
                              question_framework: { ...investigation.question_framework, recurrence_details: e.target.value }
                            })}
                            className="text-xs mt-1 bg-white dark:bg-slate-900" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Q11: Missing Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          11. ข้อมูลใดที่ยังขาดอยู่/ต้องรอผลแล็บ? (WHAT information is still missing?)
                          <Badge className="text-[9px] bg-amber-100 text-amber-800 font-normal">INVESTIGATOR INPUT</Badge>
                        </Label>
                        <button
                          type="button"
                          onClick={() => setInvestigation({
                            ...investigation,
                            question_framework: { ...investigation.question_framework, missing_information: 'N/A - ข้อมูลและผลแล็บครบถ้วนพร้อมสรุปผล' }
                          })}
                          className="text-[10px] text-slate-500 hover:text-indigo-600 underline"
                        >
                          [ N/A - ข้อมูลครบถ้วน ]
                        </button>
                      </div>
                      <Input 
                        placeholder="เช่น รอผล Micro 5 วัน, รอผลยืนยันจากซัพพลายเออร์..."
                        value={investigation.question_framework.missing_information} 
                        onChange={(e) => setInvestigation({
                          ...investigation,
                          question_framework: { ...investigation.question_framework, missing_information: e.target.value }
                        })}
                        className="text-xs" 
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button size="sm" onClick={() => handleSaveDraft()} className="bg-indigo-600 text-white text-xs">
                        บันทึกแบบร่างคำถาม ➔
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 2: AUTOMATIC TIMELINE ================= */}
              <TabsContent value="timeline" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        ลำดับเหตุการณ์ทางเวลาอัตโนมัติ (Automatic Chronological Timeline)
                      </CardTitle>
                      <span className="text-[11px] text-slate-500">
                        ระบบสร้างจุดเวลาเริ่มต้นให้อัตโนมัติจากบันทึกการผลิต แล็บ QC และการประเมินเหตุการณ์
                      </span>
                    </div>
                    <Button size="sm" onClick={() => setIsTimelineModalOpen(true)} className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white">
                      <Plus className="w-3.5 h-3.5" /> เพิ่มจุดเวลาด้วยตนเอง (+ Manual Milestone)
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    {(!investigation.timeline_events || investigation.timeline_events.length === 0) ? (
                      <p className="text-xs text-slate-400 text-center py-8">ยังไม่มีจุดเวลาในไทม์ไลน์</p>
                    ) : (
                      <div className="relative pl-6 space-y-4 border-l-2 border-indigo-200 dark:border-indigo-900 ml-3">
                        {investigation.timeline_events.map(ev => {
                          const isSystem = ev.event_source === 'SYSTEM';
                          const isLinked = ev.event_source === 'QC' || ev.event_source === 'LOG';
                          return (
                            <div key={ev.id} className="relative group">
                              <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                                isSystem ? 'bg-indigo-600' : isLinked ? 'bg-emerald-600' : 'bg-amber-600'
                              }`} />
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border text-xs space-y-1 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{ev.event_title}</span>
                                    <Badge variant="outline" className={`text-[9px] ${
                                      isSystem ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      isLinked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {isSystem ? 'SYSTEM' : isLinked ? 'LINKED RECORD' : 'MANUAL'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-500">
                                      {new Date(ev.event_timestamp).toLocaleString('th-TH')}
                                    </span>
                                    {!isSystem && (
                                      <button onClick={() => handleDeleteTimeline(ev.id)} className="text-slate-400 hover:text-red-600">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {ev.event_description && (
                                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">{ev.event_description}</p>
                                )}
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  บันทึกโดย: {ev.created_by_name || 'System Auto-Generated'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 3: LINKED EVIDENCE WORKSPACE ================= */}
              <TabsContent value="evidence" className="space-y-4 pt-3">
                
                {/* SECTION A: LINKED SYSTEM EVIDENCE (Zero Duplication) */}
                <Card className="border-indigo-200 dark:border-indigo-900">
                  <CardHeader className="py-3 px-4 border-b bg-indigo-50/50 dark:bg-slate-800/80">
                    <CardTitle className="text-xs font-bold flex items-center justify-between text-indigo-950 dark:text-indigo-200">
                      <span className="flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-indigo-600" />
                        หมวด A: LINKED SYSTEM EVIDENCE (หลักฐานที่เชื่อมโยงจากระบบ eQMS)
                      </span>
                      <Badge className="bg-indigo-600 text-white text-[10px]">Zero Data Duplication</Badge>
                    </CardTitle>
                    <p className="text-[11px] text-slate-500">
                      อ้างอิงข้อมูลจากธุรกรรมจริงของระบบ CosmeFlow ไม่ต้องพิมพ์ซ้ำ สามารถคลิกดูข้อมูลต้นทางฉบับเต็มได้ทันที
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Card 1: QC Lab Result */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-rose-100 text-rose-800 text-[10px] border border-rose-300">
                          QC TEST RESULT (OOS)
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          onClick={() => setViewingSourceRecord({
                            type: 'QC',
                            title: 'บันทึกผลการทดสอบทางห้องปฏิบัติการ QC (QC Lab Sheet)',
                            details: {
                              'พารามิเตอร์ที่พบปัญหา': 'ความหนืด (Viscosity)',
                              'ค่าที่วัดได้จริง': '15,400 cps (Out of Specification)',
                              'เกณฑ์มาตรฐานที่ยอมรับ': '4,000 - 8,000 cps (Spindle 4, 20 rpm)',
                              'เครื่องมือที่ใช้วัด': 'Brookfield DV2T Viscometer (Asset #QC-VISC-01)',
                              'สถานะการ Calibrate': 'สอบเทียบแล้วเมื่อ 2026-03-01 (Valid)',
                              'อุณหภูมิตัวอย่าง': '25.2 °C',
                              'ผู้ทดสอบ': 'เจ้าหน้าที่วิเคราะห์แล็บ QC ประจำกะ',
                              'วันเวลาที่ทดสอบ': qualityEvent.created_at
                            }
                          })}
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูข้อมูลต้นทาง
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          ผลวิเคราะห์ความหนืด Bulk OOS: 15,400 cps
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          เกณฑ์ควบคุม: 4,000 - 8,000 cps • เครื่องมือ: Brookfield DV2T #QC-VISC-01
                        </p>
                        <span className="text-[10px] text-rose-600 font-semibold block">
                          สถานะผลทดสอบ: ไม่ผ่านเกณฑ์ (FAILED_OOS)
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Approved Product Specification */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border border-emerald-300">
                          APPROVED SPECIFICATION
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          onClick={() => setViewingSourceRecord({
                            type: 'SPEC',
                            title: 'ข้อกำหนดมาตรฐานผลิตภัณฑ์เครื่องสำอาง (Approved Product Spec)',
                            details: {
                              'รหัสเอกสารสเปก': 'SPEC-ALOE-01 (Rev. 03)',
                              'ชื่อสูตร/ผลิตภัณฑ์': mfgContext?.product?.product_name || qualityEvent.title,
                              'ลักษณะภายนอก (Appearance)': 'เจลใส ไม่มีฟองอากาศ มีกลิ่นหอมเฉพาะ',
                              'ค่าความเป็นกรด-ด่าง (pH)': '5.50 - 6.50',
                              'ค่าความหนืด (Viscosity)': '4,000 - 8,000 cps',
                              'จำนวนเชื้อจุลินทรีย์ (Microbiology)': '< 100 cfu/g (ASEAN Cosmetic Criteria)',
                              'ผู้อนุมัติสเปก': 'QA Manager (อนุมัติใช้เมื่อ 2026-01-10)'
                            }
                          })}
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูข้อมูลต้นทาง
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          ข้อกำหนดผลิตภัณฑ์: SPEC-ALOE-01 (Rev. 03)
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          pH 5.5-6.5 • Viscosity 4,000-8,000 cps • Micro &lt; 100 cfu/g
                        </p>
                        <span className="text-[10px] text-emerald-700 font-semibold block">
                          สถานะ: มีผลบังคับใช้ (Active Effective)
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Batch Production Record */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] border border-blue-300">
                          BATCH MANUFACTURING ORDER
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          onClick={() => setViewingSourceRecord({
                            type: 'BATCH',
                            title: 'บันทึกคำสั่งและขั้นตอนการผลิตแบทช์ (Batch Manufacturing Record)',
                            details: {
                              'แบทช์การผลิต (Lot No.)': qualityEvent.production_lot_id || 'LOT-2026-03-01',
                              'ขนาดแบทช์ (Batch Size)': '500 kg',
                              'ถังผสมที่ใช้ (Mixing Tank)': qualityEvent.equipment_code || 'Tank T-101 (Main Homogenizer)',
                              'ความเร็วรอบการผสม': 'Homogenizer 3,500 rpm / Scraper 35 rpm',
                              'อุณหภูมิระหว่างผสม': '75 °C -> Cool down to 35 °C',
                              'ผู้ดำเนินการผสม': 'Operator กะเช้า แผนกผลิต Bulk',
                              'การตรวจสอบ Line Clearance': 'ผ่านการตรวจรับรองก่อนเริ่มผสม'
                            }
                          })}
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูข้อมูลต้นทาง
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          บันทึกการผลิต: {qualityEvent.production_lot_id || 'LOT-2026-03-01'}
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          ถังผสม {qualityEvent.equipment_code || 'Tank T-101'} • ขนาด 500 kg
                        </p>
                        <span className="text-[10px] text-slate-500 block">
                          บันทึกหน้างาน: อายัดเนื้อแบทช์ตามคำสั่ง QA Triage
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Material / Supplier Information */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] border border-purple-300">
                          MATERIAL & SUPPLIER COA
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          onClick={() => setViewingSourceRecord({
                            type: 'MATERIAL',
                            title: 'ข้อมูลวัตถุดิบและใบรับรอง COA ซัพพลายเออร์ (Supplier Material Info)',
                            details: {
                              'ชื่อวัตถุดิบ': 'Carbopol 940 (Rheology Modifier Polymer)',
                              'ล็อตวัตถุดิบ (Material Lot)': qualityEvent.material_lot_no || 'RM-CB-202602',
                              'ผู้ผลิต/ซัพพลายเออร์': qualityEvent.supplier_name || 'Lubrizol Thailand Co., Ltd.',
                              'วันหมดอายุวัตถุดิบ': '2028-02-15',
                              'สถานะการตรวจรับ (Receiving)': 'COA ตรวจสอบผ่านเกณฑ์ตอนตรวจรับเข้าคลัง',
                              'เงื่อนไขการจัดเก็บ': 'จัดเก็บในห้องแห้งควบคุมความชื้น (< 60% RH)'
                            }
                          })}
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูข้อมูลต้นทาง
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          วัตถุดิบ: {qualityEvent.material_lot_no || 'RM-CB-202602'}
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          ซัพพลายเออร์: {qualityEvent.supplier_name || 'Lubrizol Thailand'}
                        </p>
                        <span className="text-[10px] text-purple-700 font-semibold block">
                          ผลตรวจรับ COA: ผ่านเกณฑ์ตอนรับเข้า
                        </span>
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {/* SECTION B: ADDITIONAL INVESTIGATION EVIDENCE */}
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        หมวด B: ADDITIONAL INVESTIGATION EVIDENCE (หลักฐานเพิ่มเติมจากการสืบสวน)
                      </CardTitle>
                      <span className="text-[11px] text-slate-500">
                        ภาพถ่ายหน้างาน, ผลแล็บภายนอก, บันทึกการสัมภาษณ์พนักงาน, หนังสือชี้แจงจากซัพพลายเออร์
                      </span>
                    </div>
                    <Button size="sm" onClick={() => setIsEvidenceModalOpen(true)} className="text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-3.5 h-3.5" /> แนบหลักฐานเพิ่มเติม (+ Attach)
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    {(!investigation.evidence_list || investigation.evidence_list.length === 0) ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        ยังไม่มีรายการหลักฐานเพิ่มเติมที่แนบเข้ามา
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {investigation.evidence_list.map(ev => (
                          <div key={ev.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
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
                            {ev.relationship_to_investigation && (
                              <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded text-[11px] text-indigo-700 dark:text-indigo-400">
                                <span className="font-semibold">ความเชื่อมโยง:</span> {ev.relationship_to_investigation}
                              </div>
                            )}
                            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t">
                              <span>บันทึกโดย: {ev.uploaded_by_name || 'QA Officer'}</span>
                              <span>{new Date(ev.created_at).toLocaleDateString('th-TH')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 4: SIMILAR EVENT INTELLIGENCE ================= */}
              <TabsContent value="similar" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-purple-600" />
                        ระบบวิเคราะห์ประวัติและเหตุการณ์ซ้ำ (Similar Event Intelligence & Recurrence Engine)
                      </CardTitle>
                      <span className="text-[11px] text-slate-500">
                        สแกนเปรียบเทียบหลายมิติ: ผลิตภัณฑ์, ชนิดข้อบกพร่อง, ซัพพลายเออร์, เครื่องจักร, ล็อตวัตถุดิบ
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleSearchSimilar} 
                      disabled={similarSearching} 
                      className="text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {similarSearching ? 'กำลังสแกนค้นหา...' : 'สแกนหาเคสซ้ำ (Scan Similar)'}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    
                    {/* Active Match Parameters */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        ประเภทเหตุการณ์: {qualityEvent.qa_confirmed_type}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        SKU: {mfgContext?.product?.sku || 'ALOE-GEL-01'}
                      </span>
                      {qualityEvent.material_lot_no && (
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          ล็อตวัตถุดิบ: {qualityEvent.material_lot_no}
                        </span>
                      )}
                      {qualityEvent.equipment_code && (
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          เครื่องจักร: {qualityEvent.equipment_code}
                        </span>
                      )}
                    </div>

                    {/* Recurrence Summary Banner */}
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-purple-900 dark:text-purple-300">
                          ผลการตรวจสอบประวัติการเกิดซ้ำ (Recurrence Assessment Summary)
                        </span>
                        <p className="text-[11px] text-purple-700 dark:text-purple-400">
                          พบเหตุการณ์คล้ายกันในประวัติ: <span className="font-bold font-mono">{similarEvents.length}</span> รายการ • QA ยืนยันว่าเกี่ยวข้องกันจริง: <span className="font-bold font-mono text-rose-600">{qaConfirmedRelatedIds.length}</span> รายการ
                        </p>
                      </div>
                      {qaConfirmedRelatedIds.length > 0 && (
                        <Badge className="bg-rose-600 text-white text-[10px]">
                          ⚠️ RECURRING DEFECT CONFIRMED
                        </Badge>
                      )}
                    </div>

                    {!hasScannedSimilar && similarEvents.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <Search className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-500">
                          คลิกปุ่ม <span className="font-bold text-purple-600">"สแกนหาเคสซ้ำ"</span> เพื่อให้ระบบตรวจสอบประวัติย้อนหลังของโรงงาน
                        </p>
                      </div>
                    ) : similarEvents.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        ไม่พบเหตุการณ์ที่มีลักษณะหรือปัจจัยร่วมที่คล้ายคลึงกันในประวัติย้อนหลัง (First-time occurrence)
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {similarEvents.map(se => {
                          const isConfirmed = qaConfirmedRelatedIds.includes(se.id);
                          return (
                            <div 
                              key={se.id} 
                              className={`p-3.5 rounded-lg border transition-all ${
                                isConfirmed 
                                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 ring-1 ring-rose-400' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 shadow-sm'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold font-mono text-purple-700 dark:text-purple-400">
                                      {se.event_no}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {se.qa_confirmed_type}
                                    </Badge>
                                    <Badge className={`text-[10px] ${
                                      se.relevance_score === 'HIGH' ? 'bg-rose-600 text-white' :
                                      se.relevance_score === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white'
                                    }`}>
                                      ความคล้าย: {se.relevance_score}
                                    </Badge>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {new Date(se.event_date).toLocaleDateString('th-TH')}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                    {se.title}
                                  </h4>
                                  
                                  {/* Dimension match tags */}
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {(se.matching_dimensions || []).map((dim, idx) => (
                                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-medium">
                                        ✓ {dim}
                                      </span>
                                    ))}
                                  </div>

                                  {se.qa_classification_notes && (
                                    <p className="text-[11px] text-slate-500 italic pt-1">
                                      ข้อสรุปเดิม: "{se.qa_classification_notes}"
                                    </p>
                                  )}
                                </div>

                                {/* QA Confirmation Checkbox */}
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border shadow-sm">
                                    <input 
                                      type="checkbox"
                                      checked={isConfirmed}
                                      onChange={() => toggleConfirmRelatedEvent(se.id)}
                                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className={`text-xs font-semibold ${isConfirmed ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                      ยืนยันว่าเกี่ยวข้องกันจริง (QA Confirmed Related)
                                    </span>
                                  </label>
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

              {/* ================= TAB 5: ROOT CAUSE ANALYSIS (RCA) ================= */}
              <TabsContent value="rca" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-rose-600" />
                        เครื่องมือวิเคราะห์หาสาเหตุรากเหง้า (Root Cause Analysis - RCA Tools)
                      </CardTitle>
                      {/* Tool Selector */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setInvestigation({ ...investigation, rca_tool: '5_WHY' })}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            investigation.rca_tool === '5_WHY' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          5-Why Analysis
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvestigation({ ...investigation, rca_tool: 'FISHBONE_6M' })}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            investigation.rca_tool === 'FISHBONE_6M' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Fishbone Diagram (6M)
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvestigation({ ...investigation, rca_tool: 'SIMPLE_STATEMENT' })}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            investigation.rca_tool === 'SIMPLE_STATEMENT' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Simple Statement
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    {/* Tool A: 5-Why (Iterative, dynamic drill-down) */}
                    {investigation.rca_tool === '5_WHY' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            🎯 เทคนิคถามทำไมแบบต่อเนื่อง (Iterative 5-Why Drill-Down)
                          </span>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={useDeepestWhyAsRootCause} className="text-xs gap-1 h-7 border-rose-300 text-rose-700 hover:bg-rose-50">
                              นำข้อสรุป Why ล่าสุดไปเป็นสาเหตุรากเหง้า ➔
                            </Button>
                            <Button size="sm" variant="outline" onClick={addFiveWhyStep} className="text-xs gap-1 h-7">
                              <Plus className="w-3 h-3" /> เพิ่มลำดับทำไม (+ Why)
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(investigation.five_whys || []).map((step, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-rose-600 font-mono">Why #{step.why_number}: ทำไมจึงเกิดสิ่งนี้ขึ้น?</span>
                                {investigation.five_whys.length > 1 && (
                                  <button onClick={() => removeFiveWhyStep(idx)} className="text-slate-400 hover:text-red-600">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <Input 
                                placeholder={`สาเหตุระดับที่ ${step.why_number}...`}
                                value={step.cause}
                                onChange={(e) => {
                                  const updated = [...investigation.five_whys];
                                  updated[idx].cause = e.target.value;
                                  setInvestigation({ ...investigation, five_whys: updated });
                                }}
                                className="text-xs bg-white dark:bg-slate-900"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tool B: Fishbone 6M */}
                    {investigation.rca_tool === 'FISHBONE_6M' && (
                      <div className="space-y-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          🐟 แผนภูมิก้างปลา 6 ด้าน (Ishikawa Fishbone Diagram - 6M)
                        </span>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {(['man', 'machine', 'material', 'method', 'measurement', 'environment'] as const).map(cat => (
                            <div key={cat} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase block font-mono text-[11px]">
                                {cat === 'man' ? '1. Man (คน/ทักษะ)' :
                                 cat === 'machine' ? '2. Machine (เครื่องจักร)' :
                                 cat === 'material' ? '3. Material (วัตถุดิบ)' :
                                 cat === 'method' ? '4. Method (วิธีปฏิบัติ/SOP)' :
                                 cat === 'measurement' ? '5. Measurement (การวัด)' : '6. Environment (สภาพแวดล้อม)'}
                              </span>
                              <div className="flex flex-wrap gap-1 min-h-[40px]">
                                {(investigation.fishbone_6m[cat] || []).map((p, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1 shadow-sm">
                                    {p}
                                    <button onClick={() => removeFishbonePill(cat, i)} className="text-slate-400 hover:text-red-600">&times;</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Pill Form */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <select 
                            value={newFishboneItem.category}
                            onChange={(e) => setNewFishboneItem({ ...newFishboneItem, category: e.target.value as any })}
                            className="text-xs p-2 border rounded bg-white dark:bg-slate-900 font-semibold"
                          >
                            <option value="man">Man (คน)</option>
                            <option value="machine">Machine (เครื่องจักร)</option>
                            <option value="material">Material (วัตถุดิบ)</option>
                            <option value="method">Method (วิธีการ)</option>
                            <option value="measurement">Measurement (การวัด)</option>
                            <option value="environment">Environment (สิ่งแวดล้อม)</option>
                          </select>
                          <Input 
                            placeholder="พิมพ์สาเหตุแล้วกดเพิ่ม..."
                            value={newFishboneItem.text}
                            onChange={(e) => setNewFishboneItem({ ...newFishboneItem, text: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && addFishbonePill()}
                            className="text-xs"
                          />
                          <Button size="sm" onClick={addFishbonePill} className="text-xs bg-indigo-600 text-white">
                            เพิ่มก้างปลา
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Tool C: Simple Statement */}
                    {investigation.rca_tool === 'SIMPLE_STATEMENT' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">ข้อความสรุปสาเหตุรากเหง้าโดยตรง (Simple Root Cause Statement)</Label>
                        <Textarea 
                          placeholder="สรุปสาเหตุอย่างชัดเจนและตรงไปตรงมาสำหรับเหตุการณ์ที่ไม่ซับซ้อน..."
                          value={investigation.simple_root_cause_statement || ''}
                          onChange={(e) => setInvestigation({ ...investigation, simple_root_cause_statement: e.target.value })}
                          rows={3}
                          className="text-xs"
                        />
                      </div>
                    )}

                    {/* Root Cause Category Classification */}
                    <div className="pt-4 border-t space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">หมวดหมู่สาเหตุรากเหง้า (Root Cause Category)</Label>
                          <select 
                            value={investigation.root_cause_category || ''}
                            onChange={(e) => setInvestigation({ ...investigation, root_cause_category: e.target.value as QmsRootCauseCategory })}
                            className="w-full text-xs mt-1 p-2 bg-white dark:bg-slate-900 border rounded font-semibold text-slate-900 dark:text-slate-100"
                          >
                            <option value="">-- เลือกหมวดหมู่สาเหตุ --</option>
                            <option value="MAN">MAN (ความผิดพลาดของบุคลากร)</option>
                            <option value="MACHINE">MACHINE (เครื่องจักร/อุปกรณ์ขัดข้อง)</option>
                            <option value="MATERIAL">MATERIAL (วัตถุดิบ/สารเคมี)</option>
                            <option value="METHOD">METHOD (วิธีการทำงาน/SOP)</option>
                            <option value="MEASUREMENT">MEASUREMENT (เครื่องมือวัด/การสุ่มตรวจ)</option>
                            <option value="ENVIRONMENT">ENVIRONMENT (สิ่งแวดล้อม/อุณหภูมิ/ความชื้น)</option>
                            <option value="SUPPLIER">SUPPLIER (ซัพพลายเออร์/ผู้ผลิตภายนอก)</option>
                            <option value="DOCUMENTATION">DOCUMENTATION (เอกสาร/ฉลาก)</option>
                            <option value="TRAINING">TRAINING (การฝึกอบรม)</option>
                            <option value="PROCESS_DESIGN">PROCESS_DESIGN (การออกแบบกระบวนการ)</option>
                            <option value="SYSTEM_MANAGEMENT">SYSTEM_MANAGEMENT (ระบบการจัดการโรงงาน)</option>
                            <option value="ROOT_CAUSE_NOT_CONFIRMED">ROOT CAUSE NOT CONFIRMED (ไม่สามารถยืนยันสาเหตุได้)</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">สถานะการยืนยันสาเหตุ</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setInvestigation({ ...investigation, is_root_cause_confirmed: true })}
                              className={`px-3 py-1.5 rounded text-xs font-bold ${
                                investigation.is_root_cause_confirmed ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                              }`}
                            >
                              ✅ ยืนยันสาเหตุรากเหง้าได้ (Confirmed)
                            </button>
                            <button
                              type="button"
                              onClick={() => setInvestigation({ 
                                ...investigation, 
                                is_root_cause_confirmed: false,
                                root_cause_category: 'ROOT_CAUSE_NOT_CONFIRMED'
                              })}
                              className={`px-3 py-1.5 rounded text-xs font-bold ${
                                !investigation.is_root_cause_confirmed ? 'bg-amber-600 text-white' : 'bg-white border text-slate-600'
                              }`}
                            >
                              ⚠️ ยังไม่สามารถยืนยันได้ (Unconfirmed)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Root Cause Summary Textarea */}
                      <div>
                        <Label className="text-xs font-semibold">บทสรุปสาเหตุรากเหง้าที่แท้จริง (Root Cause Summary)</Label>
                        <Textarea 
                          placeholder="สรุปสาเหตุต้นตอที่แท้จริงที่ทำให้เกิดความเบี่ยงเบนหรือข้อบกพร่องตามหลักฐานและผลการวิเคราะห์..."
                          value={investigation.root_cause_summary || ''}
                          onChange={(e) => setInvestigation({ ...investigation, root_cause_summary: e.target.value })}
                          rows={2}
                          className="text-xs mt-1"
                        />
                      </div>

                      {/* Confirmation Guardrail Alert */}
                      {investigation.is_root_cause_confirmed && (!investigation.root_cause_summary || investigation.root_cause_summary.trim().length < 10) && (
                        <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>
                            คำเตือน: ต้องระบุบทสรุปสาเหตุรากเหง้าที่ชัดเจนและมีผลการวิเคราะห์รองรับ ก่อนบันทึกยืนยันสาเหตุตามมาตรฐานการตรวจสอบ
                          </span>
                        </div>
                      )}

                      {/* STRUCTURED UNCONFIRMED ROOT CAUSE FIELDS */}
                      {(!investigation.is_root_cause_confirmed || investigation.root_cause_category === 'ROOT_CAUSE_NOT_CONFIRMED') && (
                        <div className="p-3.5 bg-amber-50 dark:bg-slate-800 rounded-lg border border-amber-300 dark:border-amber-700 space-y-3">
                          <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>โครงสร้างบันทึกกรณีไม่สามารถยืนยันสาเหตุได้ (Structured Unconfirmed Justification)</span>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                              1. เหตุผลที่ยังไม่สามารถยืนยันสาเหตุได้ตามข้อเท็จจริง (Justification ≥ 15 ตัวอักษร) *
                            </Label>
                            <Textarea 
                              placeholder="ระบุเหตุผลและหลักฐานที่ยังไม่เพียงพอต่อการฟันธงสาเหตุอย่างน้อย 15 ตัวอักษร เช่น สภาพอากาศผิดปกติในวันผลิต ไม่สามารถจำลองอาการซ้ำได้..."
                              value={investigation.unconfirmed_justification || ''}
                              onChange={(e) => setInvestigation({ ...investigation, unconfirmed_justification: e.target.value })}
                              rows={2}
                              className="text-xs bg-white dark:bg-slate-900"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                              2. แผนการเฝ้าระวังความเสี่ยงต่อเนื่อง (Risk-based Surveillance & Monitoring Plan)
                            </Label>
                            <Input 
                              placeholder="เช่น เพิ่มความถี่สุ่มตรวจ QC ความหนืด 3 แบทช์ถัดไป, เฝ้าระวังล็อตสารเคมีถัดไป..."
                              value={investigation.investigation_summary || ''}
                              onChange={(e) => setInvestigation({ ...investigation, investigation_summary: e.target.value })}
                              className="text-xs bg-white dark:bg-slate-900"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 6: SYSTEMIC CAUSE ASSESSMENT ================= */}
              <TabsContent value="systemic" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        การประเมินปัจจัยเชิงระบบ (Systemic Cause Assessment)
                      </span>
                      <Badge variant="outline" className="bg-white text-[10px]">
                        ISO 22716 Systemic Guardrail
                      </Badge>
                    </CardTitle>
                    <p className="text-[11px] text-slate-500">
                      ประเมินปัจจัยความพร้อมของระบบโรงงานทั้ง 10 มิติ เพื่อป้องกันการโทษบุคคลเดี่ยว (Operator Error) โดยไร้การปรับปรุงเชิงโครงสร้าง
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    {/* MAN Guardrail Prominent Alert */}
                    {isManClaimed && (
                      <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/40 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>ระบบตรวจพบการอ้างอิงสาเหตุจากบุคลากร (MAN / Human Error)</span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-200">
                          ตามมาตรฐาน ISO 22716 / ASEAN Cosmetic GMP ต้องทำการประเมินปัจจัยเชิงระบบทั้ง 10 ด้าน ห้ามสรุปเป็นความผิดของพนักงานเพียงอย่างเดียวโดยปราศจากการปรับปรุงระบบงาน (Poka-yoke / SOP / Training)
                        </p>
                      </div>
                    )}

                    {/* 10 Systemic Factors Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SYSTEMIC_FACTORS.map(dim => {
                        const rawVal = (investigation.systemic_cause_assessment as any)?.[dim.key];
                        return (
                          <div key={dim.key} className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{dim.title}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setInvestigation({
                                    ...investigation,
                                    systemic_cause_assessment: {
                                      ...investigation.systemic_cause_assessment,
                                      is_evaluated: true,
                                      [dim.key]: true
                                    }
                                  })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    rawVal === true ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  ผ่านเกณฑ์ (OK)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInvestigation({
                                    ...investigation,
                                    systemic_cause_assessment: {
                                      ...investigation.systemic_cause_assessment,
                                      is_evaluated: true,
                                      [dim.key]: false
                                    }
                                  })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    rawVal === false ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  มีช่องโหว่ (Gap)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInvestigation({
                                    ...investigation,
                                    systemic_cause_assessment: {
                                      ...investigation.systemic_cause_assessment,
                                      is_evaluated: true,
                                      [dim.key]: 'NA'
                                    }
                                  })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    rawVal === 'NA' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  N/A
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500">{dim.desc}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">ข้อค้นพบจากการประเมินเชิงระบบ (Systemic Findings)</Label>
                      <Textarea 
                        placeholder="ระบุข้อค้นพบว่าระบบการทำงาน ป้ายเตือน เครื่องจักร หรือการฝึกอบรมมีจุดใดที่ต้องปรับปรุงเชิงโครงสร้าง..."
                        value={investigation.systemic_cause_assessment?.systemic_findings || ''}
                        onChange={(e) => setInvestigation({
                          ...investigation,
                          systemic_cause_assessment: {
                            ...investigation.systemic_cause_assessment,
                            is_evaluated: true,
                            systemic_findings: e.target.value
                          }
                        })}
                        rows={2}
                        className="text-xs mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ================= TAB 7: CAPA DECISION GATE & CORRECTION ================= */}
              <TabsContent value="capa_gate" className="space-y-4 pt-3">
                <Card className="border-slate-200">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      การแก้ไขเฉพาะหน้า & ประตูตัดสินใจ CAPA (Correction & CAPA Decision Gate)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    
                    {/* Section 1: Correction vs Corrective Action */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        1. การแก้ไขปัญหาเฉพาะหน้า (Immediate Correction — จัดการชิ้นงาน/หน้างานทันที)
                      </span>
                      <Textarea 
                        placeholder="ระบุสิ่งที่ได้ดำเนินการแก้ไขทันทีเพื่อขจัดอาการเฉพาะหน้า เช่น คัดแยกชิ้นงานที่ไม่ได้มาตรฐาน อายัดถังผสม ทำการปรับตั้งเครื่องจักรใหม่..."
                        value={investigation.immediate_correction_description || ''}
                        onChange={(e) => setInvestigation({
                          ...investigation,
                          immediate_correction_description: e.target.value
                        })}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <input 
                          type="checkbox" 
                          id="chk-corr"
                          checked={investigation.immediate_correction_completed}
                          onChange={(e) => setInvestigation({
                            ...investigation,
                            immediate_correction_completed: e.target.checked
                          })}
                          className="rounded text-indigo-600"
                        />
                        <label htmlFor="chk-corr" className="text-xs font-medium cursor-pointer">
                          ยืนยันว่าการแก้ไขเฉพาะหน้าหน้างานเสร็จสิ้นแล้ว (Correction Completed)
                        </label>
                      </div>
                    </div>

                    {/* Section 2: CAPA Decision Gate */}
                    <div className="p-4 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:bg-slate-800 rounded-xl border border-indigo-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 dark:text-indigo-300 text-sm">
                          2. ประตูตัดสินใจเปิด CAPA (CAPA Required?)
                        </span>
                        <Badge className={`${
                          investigation.capa_system_recommendation === 'YES' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white'
                        }`}>
                          ระบบแนะนำ: {investigation.capa_system_recommendation === 'YES' ? 'เข้าเกณฑ์ที่ควรพิจารณาเปิด CAPA' : 'ไม่จำเป็นต้องเปิด CAPA'}
                        </Badge>
                      </div>

                      {investigation.capa_recommendation_rationale && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white/80 dark:bg-slate-900 p-2 rounded border">
                          เหตุผลจากระบบ: {investigation.capa_recommendation_rationale}
                        </p>
                      )}

                      <div className="pt-2">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          การตัดสินใจขั้นสุดท้ายโดย QA Manager
                        </Label>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            type="button"
                            onClick={() => setCapaRequiredChoice(true)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all ${
                              capaRequiredChoice ? 'bg-rose-600 text-white ring-2 ring-rose-400' : 'bg-white border text-slate-700'
                            }`}
                          >
                            🎯 เปิด CAPA ดำเนินการ (CAPA Required = YES)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCapaRequiredChoice(false)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all ${
                              !capaRequiredChoice ? 'bg-slate-800 text-white ring-2 ring-slate-600' : 'bg-white border text-slate-700'
                            }`}
                          >
                            ⚪ ไม่จำเป็นต้องเปิด CAPA (CAPA Required = NO)
                          </button>
                        </div>
                      </div>

                      {/* Override Justification */}
                      {investigation.capa_system_recommendation === 'YES' && !capaRequiredChoice && (
                        <div className="p-2.5 bg-amber-50 rounded border border-amber-300 space-y-1">
                          <Label className="text-[11px] font-bold text-amber-900">
                            * เหตุผลที่ตัดสินใจไม่เปิด CAPA (Justification for Overriding Recommendation) ≥ 15 ตัวอักษร
                          </Label>
                          <Textarea 
                            placeholder="ระบุเหตุผลกำกับอย่างน้อย 15 ตัวอักษร เช่น เป็นข้อบกพร่องชั่วคราว การปรับตั้งหน้างานได้ผลชัดเจน และมีแผนสุ่มตรวจต่อเนื่อง..."
                            value={capaDecisionJustification}
                            onChange={(e) => setCapaDecisionJustification(e.target.value)}
                            rows={2}
                            className="text-xs bg-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Section 3: Final QA Sign-off */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border space-y-2">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        3. บันทึกการตรวจรับรองโดย QA (QA Review & Disposition Notes)
                      </Label>
                      <Textarea 
                        placeholder="ระบุความเห็นของ QA Manager เพื่อรับรองผลการสืบสวนและปิดห้องสืบสวน..."
                        value={qaReviewNotes}
                        onChange={(e) => setQaReviewNotes(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
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
            <Button size="sm" variant="outline" onClick={() => handleSaveDraft()} disabled={submitting} className="text-xs gap-1">
              💾 บันทึกแบบร่าง (Save Draft)
            </Button>
            {investigation?.current_status === 'QA_REVIEW' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsReturnModalOpen(true)} 
                disabled={submitting}
                className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> ส่งกลับเพื่อสืบสวนเพิ่ม
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              ปิดหน้าต่าง
            </Button>

            {investigation?.current_status === 'IN_INVESTIGATION' && (
              <Button 
                size="sm" 
                onClick={handleSubmitReview} 
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5"
              >
                ส่งให้ QA ตรวจสอบ (Submit for QA Review) ➔
              </Button>
            )}

            {investigation?.current_status === 'QA_REVIEW' && (
              <Button 
                size="sm" 
                onClick={handleApprove} 
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                ลงนามอนุมัติผลสืบสวนและปิดเคส (Approve Investigation) ➔
              </Button>
            )}

            {investigation?.current_status === 'COMPLETED' && investigation?.capa_required && onOpenCapaWorkspace && (
              <Button 
                size="sm" 
                onClick={() => {
                  onClose();
                  onOpenCapaWorkspace(investigation.id);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                เข้าสู่ห้องจัดการ CAPA ➔
              </Button>
            )}
          </div>
        </div>

      </DialogContent>

      {/* ================= MODAL: VIEW SOURCE RECORD ================= */}
      <Dialog open={!!viewingSourceRecord} onOpenChange={() => setViewingSourceRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
              <Eye className="w-4 h-4 text-indigo-600" />
              {viewingSourceRecord?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              ข้อมูลควบคุมจากระบบ CosmeFlow (Master & Transaction Record)
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 text-xs">
            {viewingSourceRecord && Object.entries(viewingSourceRecord.details).map(([k, v]) => (
              <div key={k} className="p-2 bg-slate-50 rounded border flex justify-between items-center">
                <span className="text-slate-500 font-medium">{k}:</span>
                <span className="font-bold text-slate-800 text-right">{String(v)}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setViewingSourceRecord(null)}>ปิดหน้าต่าง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: ADD EVIDENCE ================= */}
      <Dialog open={isEvidenceModalOpen} onOpenChange={setIsEvidenceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" />
              แนบหลักฐานการสืบสวน (Add Investigation Evidence)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">ประเภทหลักฐาน</Label>
              <select 
                value={newEvidence.evidence_type}
                onChange={(e) => setNewEvidence({ ...newEvidence, evidence_type: e.target.value as QmsEvidenceType })}
                className="w-full text-xs mt-1 p-2 border rounded"
              >
                <option value="QC_RESULT">QC Result (ผลทดสอบแล็บ)</option>
                <option value="PHOTO">Photo (ภาพถ่ายหน้างาน)</option>
                <option value="SPECIFICATION">Specification (สเปกผลิตภัณฑ์/บรรจุภัณฑ์)</option>
                <option value="SOP_WI">SOP / WI (ขั้นตอนปฏิบัติงาน)</option>
                <option value="BATCH_RECORD">Batch Record (บันทึกการผลิต)</option>
                <option value="MATERIAL_INFO">Material / COA (ข้อมูลวัตถุดิบ)</option>
                <option value="EQUIPMENT_INFO">Equipment Log (บันทึกเครื่องจักร)</option>
                <option value="TRAINING_RECORD">Training Record (บันทึกการฝึกอบรม)</option>
                <option value="OTHER">Other Evidence (หลักฐานอื่น)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">ชื่อรายการหลักฐาน *</Label>
              <Input 
                value={newEvidence.title} 
                onChange={(e) => setNewEvidence({ ...newEvidence, title: e.target.value })}
                placeholder="เช่น ภาพถ่ายหัวจ่าย, บันทึกการสัมภาษณ์ช่างคุมเครื่อง..." 
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">แหล่งที่มา (Source)</Label>
              <Input 
                value={newEvidence.source} 
                onChange={(e) => setNewEvidence({ ...newEvidence, source: e.target.value })}
                placeholder="เช่น ไลน์ผลิต 2, ฝ่ายเทคนิคบำรุงรักษา..." 
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">ความเชื่อมโยงกับการสืบสวน</Label>
              <Textarea 
                value={newEvidence.relationship_to_investigation} 
                onChange={(e) => setNewEvidence({ ...newEvidence, relationship_to_investigation: e.target.value })}
                placeholder="หลักฐานนี้ช่วยพิสูจน์หรือตัดประเด็นใด..." 
                rows={2} 
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsEvidenceModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={handleAddEvidence} disabled={submitting} className="bg-blue-600 text-white">บันทึกหลักฐาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: ADD TIMELINE ================= */}
      <Dialog open={isTimelineModalOpen} onOpenChange={setIsTimelineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              เพิ่มจุดเวลาในไทม์ไลน์ด้วยตนเอง (Add Manual Milestone)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">วันเวลาที่เกิดเหตุการณ์ *</Label>
              <Input 
                type="datetime-local" 
                value={newTimeline.event_timestamp}
                onChange={(e) => setNewTimeline({ ...newTimeline, event_timestamp: e.target.value })}
                className="text-xs mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">ประเภทเหตุการณ์</Label>
              <select 
                value={newTimeline.milestone_type}
                onChange={(e) => setNewTimeline({ ...newTimeline, milestone_type: e.target.value as QmsTimelineMilestoneType })}
                className="w-full text-xs mt-1 p-2 border rounded"
              >
                <option value="MATERIAL_RECEIVED">รับวัตถุดิบเข้าคลัง</option>
                <option value="PRODUCTION_START">เริ่มกระบวนการผลิต</option>
                <option value="MIXING_START">เริ่มผสมเนื้อครีม</option>
                <option value="QC_BULK">QC สุ่มตรวจเนื้อ Bulk</option>
                <option value="FILLING_START">เริ่มเดินสายบรรจุ</option>
                <option value="PROBLEM_DETECTED">ตรวจพบสิ่งผิดปกติ</option>
                <option value="PRODUCTION_STOPPED">หยุดสายการผลิตชั่วคราว</option>
                <option value="BATCH_HELD">อายัดและกักกันสต็อก</option>
                <option value="QA_NOTIFIED">แจ้งเตือนฝ่าย QA</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">หัวข้อเหตุการณ์ *</Label>
              <Input 
                value={newTimeline.event_title}
                onChange={(e) => setNewTimeline({ ...newTimeline, event_title: e.target.value })}
                placeholder="เช่น ช่างเทคนิคเข้าตรวจสอบใบพัดกวน, สัมภาษณ์หัวหน้ากะ..." 
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">รายละเอียด</Label>
              <Textarea 
                value={newTimeline.event_description}
                onChange={(e) => setNewTimeline({ ...newTimeline, event_description: e.target.value })}
                rows={2} 
                className="text-xs mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsTimelineModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={handleAddTimeline} disabled={submitting} className="bg-amber-600 text-white">บันทึกจุดเวลา</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: RETURN INVESTIGATION ================= */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-amber-700">
              ส่งกลับเพื่อสืบสวนเพิ่มเติม (Return for More Investigation)
            </DialogTitle>
            <DialogDescription className="text-xs">
              ระบุข้อสังเกตหรือข้อมูลที่ต้องการให้ทีมสืบสวนหาหลักฐานเพิ่มเติม
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs">
            <Label className="text-xs font-semibold">เหตุผลการส่งกลับ *</Label>
            <Textarea 
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="เช่น ขอให้ตรวจสอบประวัติการ calibrate เครื่องวัดอุณหภูมิย้อนหลัง 3 เดือน..."
              rows={3}
              className="text-xs mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsReturnModalOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={handleReturn} disabled={submitting} className="bg-amber-600 text-white">ยืนยันการส่งกลับ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Dialog>
  );
}
