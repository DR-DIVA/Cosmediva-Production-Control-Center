"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RotateCcw, 
  Calendar, 
  Building2, 
  FileText, 
  ExternalLink, 
  Play, 
  Check, 
  ArrowRight, 
  Paperclip, 
  Search, 
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { 
  QmsCapaAction, 
  QmsMyCapaWorkSummary, 
  QmsActionType, 
  QmsActionStatus,
  QmsCapaEvidenceType
} from '@/types/qms';
import { 
  getMyCapaWork, 
  startCapaAction, 
  submitActionCompleted, 
  requestActionDueDateExtension,
  addCapaEvidence
} from '@/app/actions/qms_capa';

interface MyCapaWorkProps {
  currentUser: { id: string; name: string; role: string };
  onOpenCapaWorkspace: (capaId: string) => void;
  refreshTrigger?: number;
}

export default function MyCapaWork({
  currentUser,
  onOpenCapaWorkspace,
  refreshTrigger = 0
}: MyCapaWorkProps) {
  const [data, setData] = useState<QmsMyCapaWorkSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'RETURNED' | 'WAITING_QA' | 'VERIFIED'>('ACTION_REQUIRED');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states for fast inline actions
  const [selectedAction, setSelectedAction] = useState<QmsCapaAction | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Extension dialog
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  // Evidence dialog
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState<QmsCapaEvidenceType>('PHOTO');
  const [evidenceFileUrl, setEvidenceFileUrl] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');

  // Load summary & actions
  async function loadData() {
    setLoading(true);
    try {
      const res = await getMyCapaWork(currentUser.id);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || 'ไม่สามารถโหลดข้อมูลงาน CAPA ของฉัน');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการโหลดงาน CAPA');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentUser.id, refreshTrigger]);

  // Handler: Start Action
  async function handleStartAction(actionId: string) {
    try {
      const res = await startCapaAction(actionId, currentUser.id, currentUser.name);
      if (res.success) {
        toast.success('เริ่มต้นดำเนินงานตามมาตรการเรียบร้อย');
        loadData();
      } else {
        toast.error(res.error || 'ไม่สามารถเริ่มงานได้');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    }
  }

  // Handler: Open Submit Modal
  function openSubmitDialog(action: QmsCapaAction) {
    setSelectedAction(action);
    setSubmitNotes(action.implementation_notes || '');
    setIsSubmitModalOpen(true);
  }

  // Handler: Submit Completed Action
  async function handleConfirmSubmit() {
    if (!selectedAction) return;
    if (!submitNotes || submitNotes.trim().length < 5) {
      toast.error('กรุณาระบุรายละเอียดผลการดำเนินงาน');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitActionCompleted({
        actionId: selectedAction.id,
        implementationNotes: submitNotes,
        completedBy: currentUser.id,
        completedByName: currentUser.name
      });

      if (res.success) {
        toast.success('ส่งมอบผลงานไปยัง QA เพื่อรอการตรวจรับรอง (Waiting QA Verification)');
        setIsSubmitModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'ไม่สามารถส่งมอบงานได้');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Handler: Request Extension
  async function handleConfirmExtension() {
    if (!selectedAction) return;
    if (!newDueDate) {
      toast.error('กรุณาระบุกำหนดส่งใหม่');
      return;
    }
    if (!extensionReason || extensionReason.trim().length < 10) {
      toast.error('กรุณาระบุเหตุผลการขอขยายเวลาอย่างน้อย 10 ตัวอักษร');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestActionDueDateExtension({
        actionId: selectedAction.id,
        newDueDate,
        extensionReason: extensionReason,
        requestedBy: currentUser.id,
        requestedByName: currentUser.name
      });

      if (res.success) {
        toast.success('บันทึกการขอขยายเวลากำหนดส่งเรียบร้อย');
        setIsExtensionModalOpen(false);
        setNewDueDate('');
        setExtensionReason('');
        loadData();
      } else {
        toast.error(res.error || 'ไม่สามารถบันทึกการขยายเวลาได้');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Handler: Add Evidence
  async function handleConfirmAddEvidence() {
    if (!selectedAction) return;
    if (!evidenceTitle.trim()) {
      toast.error('กรุณาระบุชื่อเอกสารหรือหลักฐาน');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addCapaEvidence({
        capaId: selectedAction.capa_id,
        actionId: selectedAction.id,
        title: evidenceTitle,
        evidenceType: evidenceType,
        fileUrl: evidenceFileUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        description: evidenceDescription,
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name
      });

      if (res.success) {
        toast.success('แนบหลักฐานการดำเนินงานสำเร็จ');
        setIsEvidenceModalOpen(false);
        setEvidenceTitle('');
        setEvidenceFileUrl('');
        setEvidenceDescription('');
        loadData();
      } else {
        toast.error(res.error || 'ไม่สามารถแนบหลักฐานได้');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered actions list
  const filteredActions = useMemo(() => {
    if (!data?.my_actions) return [];
    const now = new Date();

    return data.my_actions.filter(act => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = act.title.toLowerCase().includes(q);
        const matchDesc = (act.description || '').toLowerCase().includes(q);
        const matchCapa = (act.capa?.capa_no || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCapa) return false;
      }

      // Filter tabs
      if (filterTab === 'ACTION_REQUIRED') {
        return act.status === 'NOT_STARTED' || act.status === 'IN_PROGRESS' || act.status === 'RETURNED';
      }
      if (filterTab === 'RETURNED') {
        return act.status === 'RETURNED';
      }
      if (filterTab === 'WAITING_QA') {
        return act.status === 'COMPLETED';
      }
      if (filterTab === 'VERIFIED') {
        return act.status === 'VERIFIED';
      }
      return true; // ALL
    });
  }, [data, filterTab, searchQuery]);

  const getActionTypeBadge = (type: QmsActionType) => {
    switch (type) {
      case 'CORRECTION':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">1. การแก้ไขเฉพาะหน้า (Correction)</Badge>;
      case 'CORRECTIVE_ACTION':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">2. กำจัดสาเหตุรากเหง้า (Corrective Action)</Badge>;
      case 'PREVENTIVE_IMPROVEMENT':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">3. ป้องกันเชิงระบบ (Preventive Improvement)</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: QmsActionStatus, dueDateStr: string) => {
    const isCompletedOrVerified = status === 'COMPLETED' || status === 'VERIFIED';
    const isOverdue = !isCompletedOrVerified && new Date(dueDateStr) < new Date();

    switch (status) {
      case 'NOT_STARTED':
        return (
          <Badge variant="outline" className={`text-slate-600 ${isOverdue ? 'border-rose-400 bg-rose-50 text-rose-700' : ''}`}>
            {isOverdue ? '⚠️ ยังไม่เริ่ม (เกินกำหนด)' : '⚪ ยังไม่เริ่มดำเนินการ'}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className={`bg-blue-600 text-white ${isOverdue ? 'ring-2 ring-rose-400 animate-pulse' : ''}`}>
            {isOverdue ? '⚠️ กำลังทำ (เกินกำหนด)' : '🔵 กำลังดำเนินการ'}
          </Badge>
        );
      case 'COMPLETED':
        return <Badge className="bg-purple-600 text-white">🟣 ส่งมอบแล้ว (รอ QA รับรอง)</Badge>;
      case 'VERIFIED':
        return <Badge className="bg-emerald-600 text-white">✅ QA ตรวจรับรองแล้ว</Badge>;
      case 'RETURNED':
        return <Badge className="bg-rose-600 text-white ring-2 ring-rose-300 animate-pulse">🔴 ถูกส่งกลับแก้ไข</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Filter Summary */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-5 rounded-2xl shadow-md border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight">งาน CAPA ของฉัน (My CAPA Work)</h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  "วันนี้ฉันต้องทำอะไร?" — รวมรายการมาตรการ CAPA ที่คุณได้รับมอบหมายให้รับผิดชอบ
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-xs text-indigo-300">ผู้ใช้งานปัจจุบัน</div>
              <div className="text-sm font-bold">{currentUser.name} ({currentUser.role})</div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadData} 
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </div>

        {/* 2. Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 mt-5">
          {/* Card 1: My Open Actions */}
          <div 
            onClick={() => setFilterTab('ACTION_REQUIRED')}
            className={`cursor-pointer p-3 rounded-xl border transition-all ${
              filterTab === 'ACTION_REQUIRED' 
                ? 'bg-white/20 border-white ring-2 ring-white/50' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-300 text-xs">
              <span>งานเปิดที่ต้องทำ</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black mt-1 text-white">
              {data?.my_open_actions_count || 0}
            </div>
            <span className="text-[10px] text-indigo-200 mt-0.5 block">ยังไม่เสร็จสิ้น</span>
          </div>

          {/* Card 2: Due Soon (<= 3 days) */}
          <div 
            onClick={() => setFilterTab('ACTION_REQUIRED')}
            className="cursor-pointer p-3 rounded-xl border bg-amber-500/10 border-amber-400/30 hover:bg-amber-500/20 transition-all"
          >
            <div className="flex items-center justify-between text-amber-300 text-xs">
              <span>ใกล้กำหนด (≤ 3 วัน)</span>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black mt-1 text-amber-300">
              {data?.due_soon_count || 0}
            </div>
            <span className="text-[10px] text-amber-200/80 mt-0.5 block">ต้องรีบดำเนินการ</span>
          </div>

          {/* Card 3: Overdue */}
          <div 
            onClick={() => setFilterTab('ACTION_REQUIRED')}
            className={`cursor-pointer p-3 rounded-xl border transition-all ${
              (data?.overdue_count || 0) > 0 
                ? 'bg-rose-500/20 border-rose-400 ring-2 ring-rose-400/40 animate-pulse' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-rose-300 text-xs font-semibold">
              <span>เกินกำหนด (Overdue)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black mt-1 text-rose-300">
              {data?.overdue_count || 0}
            </div>
            <span className="text-[10px] text-rose-200/80 mt-0.5 block">ต้องขอขยายเวลาหรือเร่งปิด</span>
          </div>

          {/* Card 4: Returned to Me */}
          <div 
            onClick={() => setFilterTab('RETURNED')}
            className={`cursor-pointer p-3 rounded-xl border transition-all ${
              filterTab === 'RETURNED' 
                ? 'bg-rose-500/30 border-rose-300 ring-2 ring-rose-300' 
                : (data?.returned_to_me_count || 0) > 0 
                  ? 'bg-rose-500/20 border-rose-400/40' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-rose-300 text-xs">
              <span>ถูกส่งกลับแก้ไข</span>
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black mt-1 text-rose-300">
              {data?.returned_to_me_count || 0}
            </div>
            <span className="text-[10px] text-rose-200/80 mt-0.5 block">QA ขอหลักฐานเพิ่ม</span>
          </div>

          {/* Card 5: Waiting QA Verification */}
          <div 
            onClick={() => setFilterTab('WAITING_QA')}
            className={`cursor-pointer p-3 rounded-xl border transition-all ${
              filterTab === 'WAITING_QA' 
                ? 'bg-purple-500/30 border-purple-300 ring-2 ring-purple-300' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between text-purple-300 text-xs">
              <span>รอ QA รับรอง</span>
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black mt-1 text-purple-200">
              {data?.waiting_qa_verification_count || 0}
            </div>
            <span className="text-[10px] text-purple-200/80 mt-0.5 block">ส่งมอบงานแล้ว</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] w-full">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <Input 
            placeholder="ค้นหาตามชื่องาน, เลข CAPA, หรือรายละเอียด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 text-sm w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin w-full sm:w-auto flex-nowrap sm:flex-wrap">
          <Button 
            size="sm" 
            variant={filterTab === 'ACTION_REQUIRED' ? 'default' : 'outline'}
            onClick={() => setFilterTab('ACTION_REQUIRED')}
            className="text-xs h-8"
          >
            🔥 ต้องทำด่วน ({data?.my_open_actions_count || 0})
          </Button>

          <Button 
            size="sm" 
            variant={filterTab === 'RETURNED' ? 'default' : 'outline'}
            onClick={() => setFilterTab('RETURNED')}
            className={`text-xs h-8 ${data?.returned_to_me_count ? 'border-rose-400 text-rose-700 bg-rose-50' : ''}`}
          >
            🔴 ส่งกลับแก้ไข ({data?.returned_to_me_count || 0})
          </Button>

          <Button 
            size="sm" 
            variant={filterTab === 'WAITING_QA' ? 'default' : 'outline'}
            onClick={() => setFilterTab('WAITING_QA')}
            className="text-xs h-8"
          >
            🟣 รอ QA ({data?.waiting_qa_verification_count || 0})
          </Button>

          <Button 
            size="sm" 
            variant={filterTab === 'VERIFIED' ? 'default' : 'outline'}
            onClick={() => setFilterTab('VERIFIED')}
            className="text-xs h-8"
          >
            ✅ รับรองแล้ว
          </Button>

          <Button 
            size="sm" 
            variant={filterTab === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilterTab('ALL')}
            className="text-xs h-8"
          >
            ทั้งหมด ({data?.my_actions.length || 0})
          </Button>
        </div>
      </div>

      {/* 4. Action Items Cards List */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              {filterTab === 'ACTION_REQUIRED' ? 'ไม่มีงานค้างที่ต้องดำเนินการในขณะนี้ 🎉' : 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              คุณได้จัดการมาตรการ CAPA ที่ได้รับมอบหมายอย่างครบถ้วนแล้ว หรือเลือกหมวดหมู่อื่นเพื่อดูประวัติงาน
            </p>
          </div>
        ) : (
          filteredActions.map((action, idx) => {
            const isOverdue = (action.status === 'NOT_STARTED' || action.status === 'IN_PROGRESS' || action.status === 'RETURNED') && 
              new Date(action.due_date) < new Date();
            
            return (
              <Card 
                key={action.id} 
                className={`overflow-hidden border transition-all hover:shadow-md ${
                  action.status === 'RETURNED'
                    ? 'border-rose-300 bg-rose-50/20'
                    : isOverdue 
                      ? 'border-amber-300 bg-amber-50/15'
                      : 'border-slate-200'
                }`}
              >
                <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border">
                        #{action.action_no}
                      </span>
                      {getActionTypeBadge(action.action_type)}
                      {getStatusBadge(action.status, action.due_date)}

                      {action.capa && (
                        <button
                          type="button"
                          onClick={() => onOpenCapaWorkspace(action.capa_id)}
                          className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 ml-auto md:ml-0"
                        >
                          <FileText className="w-3 h-3" />
                          {action.capa.capa_no}
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {action.title}
                      </h4>
                      {action.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line leading-relaxed">
                          {action.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 pt-1 border-t">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{action.department_name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                          กำหนดส่ง: {new Date(action.due_date).toLocaleDateString('th-TH')}
                        </span>
                        {action.original_due_date !== action.due_date && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                            (ขยายจาก {new Date(action.original_due_date).toLocaleDateString('th-TH')})
                          </span>
                        )}
                      </div>

                      {action.evidence_required && (
                        <div className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>หลักฐานที่ต้องส่ง: {action.evidence_required}</span>
                        </div>
                      )}
                    </div>

                    {/* RETURNED Reason Notice */}
                    {action.status === 'RETURNED' && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                        <div className="font-bold text-rose-800 flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          QA ส่งกลับเพื่อแก้ไข / ขอหลักฐานเพิ่มเติม:
                        </div>
                        <p className="text-rose-700 italic">
                          "{action.return_reason || 'โปรดตรวจสอบและแนบหลักฐานเพิ่มเติมตามข้อกำหนด'}"
                        </p>
                      </div>
                    )}

                    {/* Implementation Notes if Submitted */}
                    {action.implementation_notes && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs border space-y-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">ผลการดำเนินงานล่าสุด:</span>
                        <p className="text-slate-600 dark:text-slate-400 italic">"{action.implementation_notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Quick Action Triggers */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onOpenCapaWorkspace(action.capa_id)}
                      className="text-xs h-8 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <ExternalLink className="w-3 h-3" />
                      เปิดห้อง CAPA
                    </Button>

                    {/* Start Action */}
                    {action.status === 'NOT_STARTED' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStartAction(action.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        เริ่มทำมาตรการ
                      </Button>
                    )}

                    {/* Attach Evidence */}
                    {(action.status === 'IN_PROGRESS' || action.status === 'RETURNED') && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedAction(action);
                          setEvidenceTitle(`หลักฐาน: ${action.title}`);
                          setIsEvidenceModalOpen(true);
                        }}
                        className="text-xs h-8 gap-1 text-slate-700 border-slate-300 hover:bg-slate-50"
                      >
                        <Paperclip className="w-3 h-3" />
                        แนบหลักฐาน
                      </Button>
                    )}

                    {/* Request Extension */}
                    {(action.status === 'NOT_STARTED' || action.status === 'IN_PROGRESS' || action.status === 'RETURNED') && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedAction(action);
                          setNewDueDate(action.due_date);
                          setIsExtensionModalOpen(true);
                        }}
                        className="text-[11px] h-7 text-amber-700 hover:bg-amber-50"
                      >
                        ขอขยายเวลา
                      </Button>
                    )}

                    {/* Submit Completed */}
                    {(action.status === 'IN_PROGRESS' || action.status === 'RETURNED') && (
                      <Button 
                        size="sm" 
                        onClick={() => openSubmitDialog(action)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        ส่งมอบงานให้ QA ➔
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ================= MODAL 1: SUBMIT COMPLETED ================= */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ส่งมอบงานมาตรการ (Submit Completed Action)
            </DialogTitle>
            <DialogDescription className="text-xs">
              บันทึกผลการดำเนินงานเพื่อส่งมอบให้ฝ่ายควบคุมคุณภาพ (QA) ตรวจรับรองผล
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border text-xs">
              <span className="font-semibold text-slate-700">มาตรการ: </span>
              <span className="text-slate-900 font-bold">{selectedAction?.title}</span>
            </div>

            <div>
              <Label className="text-xs font-bold">
                รายละเอียดผลการดำเนินงาน (Implementation Notes) *
              </Label>
              <Textarea 
                placeholder="ระบุสิ่งที่ได้ดำเนินการจริง เช่น ได้เข้าตรวจสอบหัวเซนเซอร์ RTD พบคราบเหนียว ได้ขัดล้างและตั้งค่า Zero Cal..."
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                rows={3}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs" 
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              {submitting ? 'กำลังส่งมอบ...' : 'ยืนยันการส่งมอบงาน ➔'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 2: REQUEST EXTENSION ================= */}
      <Dialog open={isExtensionModalOpen} onOpenChange={setIsExtensionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-amber-900">
              <Calendar className="w-4 h-4 text-amber-600" />
              ขอขยายเวลากำหนดส่ง (Request Due Date Extension)
            </DialogTitle>
            <DialogDescription className="text-xs">
              บันทึกประวัติการขอขยายเวลา (Audit Trail) โดยระบบจะเก็บ Due Date เดิมไว้เสมอ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              กำหนดส่งเดิม: <strong>{selectedAction ? new Date(selectedAction.due_date).toLocaleDateString('th-TH') : ''}</strong>
            </div>

            <div>
              <Label className="text-xs font-bold">กำหนดส่งใหม่ (New Due Date) *</Label>
              <Input 
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">เหตุผลการขอขยายเวลา (Extension Reason ≥ 10 ตัวอักษร) *</Label>
              <Textarea 
                placeholder="ระบุเหตุผลความจำเป็น เช่น รออะไหล่เซนเซอร์จากต่างประเทศ 5 วัน..."
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                rows={2}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsExtensionModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              size="sm" 
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs" 
              onClick={handleConfirmExtension}
              disabled={submitting}
            >
              {submitting ? 'กำลังบันทึก...' : 'บันทึกการขอขยายเวลา'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 3: ATTACH EVIDENCE ================= */}
      <Dialog open={isEvidenceModalOpen} onOpenChange={setIsEvidenceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              แนบหลักฐานการดำเนินงาน (Attach Evidence)
            </DialogTitle>
            <DialogDescription className="text-xs">
              แนบรูปถ่าย, เอกสาร WI ที่แก้ไข, หรือบันทึกการฝึกอบรม
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold">ชื่อหลักฐาน / เอกสารอ้างอิง *</Label>
              <Input 
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
                placeholder="เช่น ภาพถ่ายหัววัด RTD หลังทำความสะอาด"
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">ประเภทหลักฐาน *</Label>
              <select 
                value={evidenceType}
                onChange={(e: any) => setEvidenceType(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border rounded-md p-2 text-xs mt-1"
              >
                <option value="PHOTO">📷 รูปถ่ายหน้างาน (Photo / Physical Evidence)</option>
                <option value="REVISED_SOP_WI">📄 เอกสาร WI / SOP ที่ปรับปรุง (Revised Procedure)</option>
                <option value="TRAINING_RECORD">🎓 บันทึกการฝึกอบรม (Training Attendance Record)</option>
                <option value="MAINTENANCE_RECORD">🔧 บันทึกการซ่อมบำรุง / PM Log</option>
                <option value="QC_RESULT">🧪 ผลการวิเคราะห์ซ้ำ QC Re-test / COA</option>
                <option value="OTHER">📁 อื่นๆ (Other Documentation)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold">ลิงก์ไฟล์หรือภาพตัวอย่าง (URL)</Label>
              <Input 
                value={evidenceFileUrl}
                onChange={(e) => setEvidenceFileUrl(e.target.value)}
                placeholder="https://... หรือเว้นว่างเพื่อใช้ภาพตัวอย่างระบบ"
                className="text-xs mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">คำอธิบายเพิ่มเติม</Label>
              <Textarea 
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="ระบุข้อสังเกตหรือรายละเอียดของหลักฐาน..."
                rows={2}
                className="text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsEvidenceModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs" 
              onClick={handleConfirmAddEvidence}
              disabled={submitting}
            >
              {submitting ? 'กำลังแนบ...' : 'บันทึกหลักฐาน ➔'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
