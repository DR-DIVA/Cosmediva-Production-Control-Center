'use client'

import React, { useState, useEffect } from 'react';
import { 
  Settings, Edit2, Check, X, Shield, Calendar, Clock, 
  RefreshCw, Info, AlertCircle 
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

interface PolicyMasterViewProps {
  currentPersona: Persona;
}

export function PolicyMasterView({ currentPersona }: PolicyMasterViewProps) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/people/policies');
      const json = await res.json();
      if (json.success) {
        setPolicies(json.policies);
        setSchedules(json.schedules);
        setHolidays(json.holidays);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลนโยบายได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;

    try {
      const res = await fetch('/api/people/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPolicy.id,
          annual_entitlement: parseFloat(editingPolicy.annual_entitlement),
          minimum_notice_days: parseInt(editingPolicy.minimum_notice_days),
          carry_forward_allowed: editingPolicy.carry_forward_allowed,
          max_carry_forward: parseFloat(editingPolicy.max_carry_forward),
          attachment_required: editingPolicy.attachment_required,
          attachment_required_after_days: parseInt(editingPolicy.attachment_required_after_days),
          paid_unpaid: editingPolicy.paid_unpaid
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setEditingPolicy(null);
        fetchPolicies();
      } else {
        toast.error(json.error);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกนโยบาย');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>⚙️</span>
            <span>เครื่องมือกำหนดนโยบายวันลาและเวลาทำงาน (Configurable Policy Engine)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            HR Manager สามารถแก้ไขจำนวนวันลา สิทธิ์ยกยอด วันบอกกล่าวล่วงหน้า โดยไม่ต้องแก้โค้ดโปรแกรม (Zero Code Change)
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
          Admin Config Center
        </span>
      </div>

      {/* Leave Policies Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 text-sm">นโยบายวันลา 12 ประเภท (Leave Policy Master)</h3>
          <span className="text-xs text-slate-400 font-bold">{policies.length} นโยบายที่เปิดใช้งาน</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">รหัส</th>
                <th className="py-3 px-4">ประเภทวันลา</th>
                <th className="py-3 px-3 text-center">สิทธิ์ต่อปี (วัน)</th>
                <th className="py-3 px-3 text-center">แจ้งล่วงหน้า (วัน)</th>
                <th className="py-3 px-3 text-center">ยกยอดได้</th>
                <th className="py-3 px-3 text-center">ยกยอดสูงสุด (วัน)</th>
                <th className="py-3 px-3 text-center">ต้องมีใบรับรอง</th>
                <th className="py-3 px-3 text-center">ค่าจ้าง</th>
                <th className="py-3 px-4 text-center">แก้ไข</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    กำลังโหลดนโยบาย...
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{p.type_code}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {p.name_th}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-600 text-sm">{p.annual_entitlement}</td>
                    <td className="py-3.5 px-3 text-center font-semibold text-slate-700">{p.minimum_notice_days} วัน</td>
                    <td className="py-3.5 px-3 text-center font-bold">
                      {p.carry_forward_allowed ? (
                        <span className="text-emerald-600">ได้</span>
                      ) : (
                        <span className="text-slate-400">ไม่ได้</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-semibold text-slate-700">{p.max_carry_forward}</td>
                    <td className="py-3.5 px-3 text-center font-bold">
                      {p.attachment_required ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                          เกิน {p.attachment_required_after_days} วัน
                        </span>
                      ) : (
                        <span className="text-slate-400">ไม่บังคับ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        p.paid_unpaid === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {p.paid_unpaid}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setEditingPolicy(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1 mx-auto"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>แก้ไขกฎ</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                แก้ไขนโยบาย: {editingPolicy.name_th}
              </h3>
              <button onClick={() => setEditingPolicy(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePolicy} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">สิทธิ์ต่อปี (วัน) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingPolicy.annual_entitlement}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, annual_entitlement: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ต้องขอล่วงหน้า (วัน) *</label>
                  <input
                    type="number"
                    required
                    value={editingPolicy.minimum_notice_days}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, minimum_notice_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="carryCheck"
                    checked={editingPolicy.carry_forward_allowed}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, carry_forward_allowed: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <label htmlFor="carryCheck" className="font-bold text-slate-700 cursor-pointer">
                    อนุญาตให้ยกยอดได้
                  </label>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ยกยอดได้สูงสุด (วัน)</label>
                  <input
                    type="number"
                    disabled={!editingPolicy.carry_forward_allowed}
                    value={editingPolicy.max_carry_forward}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, max_carry_forward: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="attachCheck"
                    checked={editingPolicy.attachment_required}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, attachment_required: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <label htmlFor="attachCheck" className="font-bold text-slate-700 cursor-pointer">
                    ต้องแนบใบรับรองแพทย์
                  </label>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ต้องแนบเมื่อลาเกิน (วัน)</label>
                  <input
                    type="number"
                    disabled={!editingPolicy.attachment_required}
                    value={editingPolicy.attachment_required_after_days}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, attachment_required_after_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  บันทึกนโยบาย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
