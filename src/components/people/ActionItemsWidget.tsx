'use client'

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Sparkles, 
  Check, X, RefreshCw, ChevronRight, Inbox
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

interface ActionItemsWidgetProps {
  currentPersona: Persona;
  onNavigateTab?: (tab: string) => void;
}

export function ActionItemsWidget({ currentPersona, onNavigateTab }: ActionItemsWidgetProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/people/actions?role=${currentPersona.role}&status=PENDING`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [currentPersona]);

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch('/api/people/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'COMPLETED', completed_by: currentPersona.name })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('ดำเนินการรายการสำเร็จ');
        fetchItems();
      }
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>สิ่งที่ต้องจัดการด่วน (What Needs Your Attention?)</span>
              {items.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                  {items.length} รายการ
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">Action Inbox รวบรวมงานที่รอการตัดสินใจจากคุณตามบทบาท {currentPersona.role}</p>
          </div>
        </div>

        <button 
          onClick={fetchItems}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          title="รีเฟรชรายการ"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">กำลังโหลดรายการ...</div>
        ) : items.length > 0 ? (
          items.map((item) => {
            const isHigh = item.priority === 'HIGH' || item.priority === 'URGENT';
            return (
              <div 
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.2 rounded-md text-[10px] font-black ${
                      isHigh ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {item.priority}
                    </span>
                    <span className="font-extrabold text-slate-800">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xl">{item.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.action_type === 'LEAVE_APPROVAL' && onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('approvals')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <span>ไปที่หน้าอนุมัติ</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}

                  {item.action_type === 'HR_CASE_REVIEW' && onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('cases')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <span>ดูสำนวนเคส</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => handleComplete(item.id)}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 transition"
                    title="ทำเครื่องหมายว่าเสร็จแล้ว"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
            <span className="font-bold text-slate-600">ไม่มีรายการค้างที่ต้องดำเนินการในขณะนี้</span>
            <span className="text-[11px]">การอนุมัติและข้อยกเว้นทั้งหมดได้รับการจัดการเรียบร้อยแล้ว</span>
          </div>
        )}
      </div>
    </div>
  );
}
