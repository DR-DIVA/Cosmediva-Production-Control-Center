'use client'

import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Plus, Filter, AlertTriangle, CheckCircle2, 
  Clock, FileText, MessageSquare, ShieldAlert, ArrowRight,
  User, Building2, ChevronDown, ChevronUp, Send, Check
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

interface CasesManagementViewProps {
  currentPersona: Persona;
}

export function CasesManagementView({ currentPersona }: CasesManagementViewProps) {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newComment, setNewComment] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/people/cases');
      const json = await res.json();
      if (json.success) {
        setCases(json.data || []);
        if (json.data?.length > 0 && !selectedCase) {
          fetchCaseDetail(json.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/people/cases?id=${id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedCase(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedCase) return;

    try {
      const res = await fetch('/api/people/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_COMMENT',
          case_id: selectedCase.id,
          comment: newComment,
          comment_type: 'INVESTIGATION',
          author_type: currentPersona.role.includes('HR') ? 'HR' : 'SUPERVISOR'
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('บันทึกความเห็นในสำนวนเรียบร้อยแล้ว');
        setNewComment('');
        fetchCaseDetail(selectedCase.id);
      }
    } catch (e) {
      toast.error('ไม่สามารถบันทึกความเห็นได้');
    }
  };

  const handleResolveCase = async () => {
    if (!selectedCase) return;
    try {
      const res = await fetch('/api/people/cases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCase.id,
          status: 'Resolved',
          resolution: 'ปรับปรุงเวลาลงงานตามคำยืนยันของหัวหน้างาน และปิดการตรวจสอบ'
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('ปรับสถานะเคสเป็น Resolved เรียบร้อยแล้ว');
        fetchCases();
        fetchCaseDetail(selectedCase.id);
      }
    } catch (e) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
              Layer 4: Case Management
            </span>
            <span className="text-xs text-slate-400 font-bold">Investigation & Resolution</span>
          </div>
          <h2 className="text-2xl font-black mt-2 text-white">
            ระบบบริหารจัดการเคสความผิดปกติ (HR Case Management)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            เปลี่ยนข้อยกเว้นการลงเวลา (Missing Punch, Absent) ให้กลายเป็นสำนวนเคสที่ติดตามได้ รวบรวมหลักฐาน (Evidence Pack) และบันทึกมติการตัดสินใจแบบโปร่งใส
          </p>
        </div>

        <button
          onClick={() => toast.info('สามารถเปิดเคสได้โดยตรงจากแท็บเวลาทำงาน (Exceptions) หรือใช้เคสตัวอย่างด้านล่าง')}
          className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เปิดเคสใหม่ (New Case)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cases List */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span>รายการเคสที่กำลังดำเนินการ ({cases.length})</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">สถานะล่าสุด</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-xs text-slate-400 text-center py-8">กำลังโหลดเคส...</div>
            ) : cases.length > 0 ? (
              cases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const isResolved = c.status === 'Resolved' || c.status === 'Closed';

                return (
                  <div
                    key={c.id}
                    onClick={() => fetchCaseDetail(c.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/20'
                        : 'bg-slate-50/60 border-slate-200/80 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-slate-800">{c.case_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="font-extrabold text-slate-900">{c.summary}</div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>{c.employees ? `${c.employees.first_name} ${c.employees.last_name}` : 'พนักงานโรงงาน'}</span>
                      <span className="font-bold text-slate-400">{c.case_type}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 text-center py-8">ยังไม่มีเคสที่เปิดในระบบ</div>
            )}
          </div>
        </div>

        {/* Right: Selected Case Evidence Pack & Comments */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
          {selectedCase ? (
            <>
              {/* Case Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-blue-900 text-base">{selectedCase.case_number}</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {selectedCase.case_type}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base mt-1">{selectedCase.summary}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedCase.description}</p>
                </div>

                {selectedCase.status !== 'Resolved' && (
                  <button
                    onClick={handleResolveCase}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>ปิดเคส & ปรับปรุงเวลา (Resolve)</span>
                  </button>
                )}
              </div>

              {/* Evidence Pack (Section 15 & 20: FACT / EVIDENCE) */}
              <div>
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>สำนวนหลักฐาน (Evidence Pack)</span>
                </h4>

                <div className="space-y-2">
                  {selectedCase.evidence && selectedCase.evidence.length > 0 ? (
                    selectedCase.evidence.map((ev: any) => (
                      <div key={ev.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="font-extrabold text-slate-800 flex items-center gap-2">
                          <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {ev.evidence_type}
                          </span>
                          <span>{ev.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{ev.description}</p>
                        {ev.snapshot_data && (
                          <pre className="mt-2 p-2 rounded-xl bg-slate-900 text-amber-300 font-mono text-[10px] overflow-x-auto">
                            {JSON.stringify(ev.snapshot_data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 py-3 text-center">ยังไม่มีหลักฐานแนบในเคสนี้</div>
                  )}
                </div>
              </div>

              {/* Comments & Investigation Thread (Section 16) */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>บันทึกการสืบสวนและข้อเท็จจริง (Investigation Thread)</span>
                </h4>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {selectedCase.comments && selectedCase.comments.length > 0 ? (
                    selectedCase.comments.map((cm: any) => (
                      <div key={cm.id} className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span className="text-blue-900 font-extrabold">{cm.author_type} ({cm.comment_type})</span>
                          <span>{new Date(cm.created_at).toLocaleString('th-TH')}</span>
                        </div>
                        <p className="text-slate-800">{cm.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 py-3 text-center">ยังไม่มีข้อความบันทึก</div>
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="พิมพ์บันทึกข้อเท็จจริง คำให้การ หรือผลการตรวจสอบ..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>บันทึก</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 text-center py-16">
              เลือกเคสจากรายการทางซ้ายเพื่อดูสำนวนหลักฐาน
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
