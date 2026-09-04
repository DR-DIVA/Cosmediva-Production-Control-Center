'use client'

import React from 'react';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, UserX, 
  ArrowRight, Check, X, ShieldAlert, ChevronRight, Sparkles 
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { Language, TRANSLATIONS } from '@/lib/peopleTranslations';

interface SupervisorDashboardViewProps {
  currentPersona: Persona;
  supervisorData: any;
  pendingApprovalsCount: number;
  lang: Language;
  onNavigateTab: (tab: string) => void;
}

export function SupervisorDashboardView({
  currentPersona,
  supervisorData,
  pendingApprovalsCount,
  lang,
  onNavigateTab
}: SupervisorDashboardViewProps) {
  const t = TRANSLATIONS[lang];
  const scheduled = supervisorData?.teamScheduled || 12;
  const present = supervisorData?.teamPresent || 10;
  const late = supervisorData?.teamLate || 1;
  const leave = supervisorData?.teamLeave || 1;
  const absent = supervisorData?.teamAbsent || 0;
  const rate = supervisorData?.teamAttendanceRate || '83.3';
  const members = supervisorData?.members || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner: Supervisor Workspace & Manpower Summary */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-black uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-full text-amber-100">
            Supervisor Daily Workspace
          </span>
          <h2 className="text-2xl font-black mt-2">
            ภาพรวมกำลังคนสายงาน (My Team Today)
          </h2>
          <p className="text-xs text-amber-100 mt-1 max-w-xl">
            ตรวจสอบความพร้อมหน้างาน อนุมัติคำขอลา และติดตามกำลังคนประจำกะแบบเรียลไทม์
          </p>
        </div>

        {/* Attendance Rate Dial Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4 shrink-0">
          <div>
            <div className="text-3xl font-black text-white">{rate}%</div>
            <div className="text-[11px] text-amber-100 font-bold uppercase">Team Attendance</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
            {present}/{scheduled}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-bold">พนักงานในทีม</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{scheduled}</div>
          <div className="text-[10px] text-slate-400 mt-1">Scheduled Today</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs text-emerald-700 font-bold">มาทำงาน (Present)</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{present}</div>
          <div className="text-[10px] text-emerald-600 mt-1">ทำงานปกติ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="text-xs text-amber-700 font-bold">มาสาย (Late)</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{late}</div>
          <div className="text-[10px] text-amber-600 mt-1">เกิน Grace Period</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-xs text-blue-700 font-bold">ลางาน (Leave)</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{leave}</div>
          <div className="text-[10px] text-blue-600 mt-1">อนุมัติแล้ว</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="text-xs text-rose-700 font-bold">ขาดงาน (Absent)</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{absent}</div>
          <div className="text-[10px] text-rose-600 mt-1">ไม่มีใบลา</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <div className="text-xs text-purple-700 font-bold">รออนุมัติ (Pending)</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{pendingApprovalsCount}</div>
          <div className="text-[10px] text-purple-600 mt-1">คำขอใหม่</div>
        </div>
      </div>

      {/* Pending Approvals Notice Alert */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-5 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                คุณมีคำขอลา {pendingApprovalsCount} รายการที่รอการอนุมัติ
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                สามารถตรวจสอบผลกระทบต่อกำลังคนหน้างาน (Manpower Impact) ก่อนตัดสินใจอนุมัติ
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('approvals')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 transition active:scale-95"
          >
            <span>ไปที่กล่องอนุมัติ (My Approvals)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Team Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-800 text-sm">รายชื่อกำลังคนในทีมวันนี้ (Team Member Status)</h3>
          </div>
          <button
            onClick={() => onNavigateTab('attendance')}
            className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
          >
            <span>ดูบันทึกเวลาเต็ม</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">รหัส</th>
                <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                <th className="py-3 px-4">ตำแหน่ง / พื้นที่</th>
                <th className="py-3 px-4">เวลาเข้า (In)</th>
                <th className="py-3 px-4">เวลาออก (Out)</th>
                <th className="py-3 px-4 text-center">สถานะวันนี้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length > 0 ? (
                members.slice(0, 8).map((m: any) => {
                  const isIn = m.actual_in ? new Date(m.actual_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                  const isOut = m.actual_out ? new Date(m.actual_out).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                  const status = m.attendance_status || 'Present';

                  let badgeClass = 'bg-slate-100 text-slate-700';
                  if (status === 'Present') badgeClass = 'bg-emerald-100 text-emerald-800';
                  else if (status === 'Late') badgeClass = 'bg-amber-100 text-amber-800';
                  else if (status === 'Leave') badgeClass = 'bg-blue-100 text-blue-800';
                  else if (status === 'Absent') badgeClass = 'bg-rose-100 text-rose-800';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{m.employee_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {m.first_name} {m.last_name}
                        {m.nickname && <span className="text-slate-400 font-normal ml-1">({m.nickname})</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.position_name || 'พนักงานสายผลิต'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{isIn}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{isOut}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badgeClass}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    กำลังโหลดข้อมูลทีม...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
