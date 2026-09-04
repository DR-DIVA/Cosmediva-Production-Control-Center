'use client'

import React, { useState, useEffect } from 'react';
import { 
  Check, X, Users, AlertTriangle, Clock, Calendar, 
  ChevronRight, Sparkles, MessageSquare, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

interface ApprovalsInboxViewProps {
  currentPersona: Persona;
}

export function ApprovalsInboxView({ currentPersona }: ApprovalsInboxViewProps) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/people/approvals?role=${currentPersona.role}&status=PENDING`);
      const json = await res.json();
      if (json.success) {
        setApprovals(json.data);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดรายการรออนุมัติได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [currentPersona]);

  const handleExecuteAction = async () => {
    if (!selectedReq || !actionType) return;
    if (actionType === 'REJECT' && !actionComment) {
      toast.error('กรุณาระบุเหตุผลการไม่อนุมัติ');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/people/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_request_id: selectedReq.approval_request_id,
          action: actionType,
          comment: actionComment,
          actor_role: currentPersona.role
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setSelectedReq(null);
        setActionType(null);
        setActionComment('');
        fetchApprovals();
      } else {
        toast.error(json.error || 'เกิดข้อผิดพลาดในการประมวลผล');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>✍️</span>
            <span>กล่องรายการรอการอนุมัติ (My Approvals Inbox)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            พิจารณาคำขอลาพร้อมตรวจสอบผลกระทบต่อกำลังคนหน้างาน (Manpower Impact)
          </p>
        </div>
        <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
          รออนุมัติ {approvals.length} รายการ
        </span>
      </div>

      {/* Approvals Cards Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
          กำลังโหลดรายการรออนุมัติ...
        </div>
      ) : approvals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {approvals.map((app) => (
            <div 
              key={app.approval_request_id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 relative overflow-hidden"
            >
              {/* Card Header: Requester & Leave Type */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    {app.first_name.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {app.first_name} {app.last_name}
                      {app.nickname && <span className="text-slate-400 font-normal ml-1">({app.nickname})</span>}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {app.employee_code} • {app.department_name}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                  {app.leave_type_name}
                </span>
              </div>

              {/* Leave Details Box */}
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">ช่วงวันที่ขอลา:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(app.start_date).toLocaleDateString('th-TH')}
                    {app.start_date !== app.end_date && ` - ${new Date(app.end_date).toLocaleDateString('th-TH')}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">จำนวนวันลา:</span>
                  <span className="font-black text-amber-600 text-sm">{app.total_days} วัน</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 text-slate-600">
                  <span className="font-bold text-slate-700">เหตุผล: </span>
                  {app.reason}
                </div>
              </div>

              {/* Manpower Impact Widget (Section 19) */}
              <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/60 p-3.5 rounded-2xl border border-amber-200 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span>กำลังคนหน้างาน (Manpower Impact)</span>
                  <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-md">ประเมินความพร้อม</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                    <span className="text-slate-400 block">กำลังคนในทีม</span>
                    <span className="font-bold text-slate-700">{app.manpowerImpact?.teamScheduled} คน</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                    <span className="text-slate-400 block">ลาอยู่แล้ว</span>
                    <span className="font-bold text-blue-600">{app.manpowerImpact?.teamOnLeave} คน</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                    <span className="text-slate-400 block">เหลือหลังอนุมัติ</span>
                    <span className="font-bold text-emerald-600">{app.manpowerImpact?.availableAfterApproval} คน</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600">
                  <span>สิทธิ์คงเหลือก่อนลา: <strong>{app.balanceBefore} วัน</strong></span>
                  <span>คงเหลือหลังลา: <strong>{app.balanceAfter} วัน</strong></span>
                </div>
              </div>

              {/* Action Buttons: 1-Click Approve / Reject */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedReq(app);
                    setActionType('REJECT');
                    setActionComment('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <X className="w-4 h-4" />
                  <span>ไม่อนุมัติ (Reject)</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedReq(app);
                    setActionType('APPROVE');
                    setActionComment('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>อนุมัติ (Approve)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-slate-800">ไม่มีคำขอลาที่ค้างการอนุมัติ</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            ทุกคำขอลาในสายการอนุมัติของคุณได้รับการพิจารณาครบถ้วนเรียบร้อยแล้ว
          </p>
        </div>
      )}

      {/* Confirmation & Comment Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {actionType === 'APPROVE' ? 'ยืนยันการอนุมัติคำขอลา' : 'ระบุเหตุผลการไม่อนุมัติ'}
              </h3>
              <button 
                onClick={() => { setSelectedReq(null); setActionType(null); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                พนักงาน: <strong>{selectedReq.first_name} {selectedReq.last_name}</strong> ({selectedReq.employee_code})
              </p>
              <p>
                ประเภทการลา: <strong>{selectedReq.leave_type_name}</strong> จำนวน <strong>{selectedReq.total_days} วัน</strong>
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                {actionType === 'APPROVE' ? 'ความคิดเห็นเพิ่มเติม (ถ้ามี)' : 'เหตุผลการไม่อนุมัติ *'}
              </label>
              <textarea
                rows={3}
                required={actionType === 'REJECT'}
                placeholder={actionType === 'APPROVE' ? 'เช่น อนุมัติตามแผนงาน, จัดสรรคนแทนเรียบร้อยแล้ว...' : 'เช่น กำลังคนในกะไม่เพียงพอ, งานด่วนเร่งผลิต...'}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-amber-500"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setSelectedReq(null); setActionType(null); }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting || (actionType === 'REJECT' && !actionComment)}
                onClick={handleExecuteAction}
                className={`px-5 py-2 rounded-xl text-white font-black text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionType === 'APPROVE' ? 'ยืนยันอนุมัติ (Approve)' : 'ยืนยันปฏิเสธ (Reject)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
