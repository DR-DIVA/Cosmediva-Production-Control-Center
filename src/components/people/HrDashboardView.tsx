'use client'

import React from 'react';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, AlertOctagon, 
  Calendar, ArrowRight, Sparkles, Building2, UploadCloud, 
  FileDown, ShieldCheck, ChevronRight, Activity, Zap
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { Language, TRANSLATIONS } from '@/lib/peopleTranslations';

interface HrDashboardViewProps {
  currentPersona: Persona;
  kpi: any;
  departments: any[];
  factoryReadiness: any[];
  alerts: any[];
  lang: Language;
  onNavigateTab: (tab: string, filter?: any) => void;
}

export function HrDashboardView({
  currentPersona,
  kpi = {},
  departments = [],
  factoryReadiness = [],
  alerts = [],
  lang,
  onNavigateTab
}: HrDashboardViewProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Quick Header Hero: HR Today Command Center */}
      <div className="bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/30">
              HR Daily Command Center
            </span>
            <span className="text-xs text-slate-400">Manage by Exception</span>
          </div>
          <h2 className="text-2xl font-black mt-2 text-white">
            ภาพรวมกำลังคนโรงงานวันนี้ (HR Today)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            ระบบตรวจจับความผิดปกติให้อัตโนมัติ (Exceptions) ติดตามกำลังคนสายผลิต 17 แผนกแบบเรียลไทม์
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('attendance', { action: 'open_import' })}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-2 transition"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>นำเข้าเวลาสแกน (Import)</span>
          </button>
          <button
            onClick={() => onNavigateTab('exceptions')}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 flex items-center gap-2 transition"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>จัดการข้อยกเว้น ({kpi.unresolvedExceptionsCount || 0})</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-2 transition"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>ส่งออกรายงาน</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (KPI) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-bold">พนักงานทั้งหมด (Headcount)</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{kpi.totalHeadcount || 134}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">
            {kpi.activeHeadcount || 134} สถานะปกติ (Active)
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs text-emerald-800 font-bold">มาทำงานวันนี้ (Present)</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{kpi.presentToday || 0}</div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">
            อัตรามาทำงาน {kpi.attendanceRate || '0'}%
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-xs text-blue-800 font-bold">ลางานวันนี้ (Leave)</div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{kpi.leaveToday || 0}</div>
          <div className="text-[11px] text-blue-700 font-bold mt-1">
            อนุมัติถูกต้อง
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="text-xs text-amber-800 font-bold">มาสายวันนี้ (Late)</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{kpi.lateToday || 0}</div>
          <div className="text-[11px] text-amber-700 font-bold mt-1">
            เกิน 15 นาที (Grace)
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="text-xs text-rose-800 font-bold">ขาดงานวันนี้ (Absent)</div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{kpi.absentToday || 0}</div>
          <div className="text-[11px] text-rose-700 font-bold mt-1">
            ไม่มีใบลาล่วงหน้า
          </div>
        </div>
      </div>

      {/* 3. Daily HR Alerts (Section 36) */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>รายการแจ้งเตือนด่วนสำหรับ HR วันนี้ (Daily Operational Alerts)</span>
            </h3>
            <span className="text-xs text-slate-400 font-bold">{alerts.length} ข้อสังเกต</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alerts.map((alt) => (
              <div 
                key={alt.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  alt.type === 'DANGER' ? 'bg-rose-50/70 border-rose-200 text-rose-900' :
                  alt.type === 'WARNING' ? 'bg-amber-50/70 border-amber-200 text-amber-900' :
                  'bg-blue-50/70 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {alt.type === 'DANGER' ? <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" /> :
                   alt.type === 'WARNING' ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> :
                   <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />}
                  <span className="font-semibold">{alt.message}</span>
                </div>
                <button
                  onClick={() => {
                    if (alt.actionUrl.includes('exceptions')) onNavigateTab('exceptions');
                    else if (alt.actionUrl.includes('approvals')) onNavigateTab('approvals');
                    else onNavigateTab('attendance');
                  }}
                  className="text-[11px] font-black underline shrink-0 hover:opacity-80"
                >
                  จัดการ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Factory Readiness Widget (Section 35) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>ความพร้อมกำลังคนรายสถานีผลิต (Factory Workforce Readiness)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              คำนวณเปรียบเทียบอัตรากำลังคนหน้างานจริงกับเกณฑ์ขั้นต่ำ พร้อมรองรับการเชื่อมโยง Production Plan
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">READY</span>
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">WATCH</span>
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">CRITICAL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {factoryReadiness.slice(0, 5).map((area) => {
            const isReady = area.readiness_status === 'READY';
            const isWatch = area.readiness_status === 'WATCH';
            return (
              <div 
                key={area.id}
                className={`p-4 rounded-2xl border transition hover:shadow-sm ${
                  isReady ? 'border-emerald-200 bg-emerald-50/20' :
                  isWatch ? 'border-amber-200 bg-amber-50/20' :
                  'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 truncate">{area.work_area_name.split('(')[0]}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isReady ? 'bg-emerald-100 text-emerald-800' :
                    isWatch ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {area.readiness_status}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-2xl font-black text-slate-900">
                    {area.present} <span className="text-xs font-normal text-slate-400">/ {area.scheduled} คน</span>
                  </div>
                  <span className="text-xs font-bold text-slate-600">{area.attendance_rate}%</span>
                </div>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full ${
                      isReady ? 'bg-emerald-500' : isWatch ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${area.attendance_rate}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                  <span>ลา: {area.on_leave}</span>
                  <span>ขาด: <strong className={area.absent > 0 ? 'text-rose-600' : ''}>{area.absent}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Department Attendance Table (Section 34) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>ตารางกำลังคนแยกตามแผนก (Department Attendance Summary)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">รวม 17 แผนก ประจำโรงงานคอสเมดิวา</p>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
          >
            <span>ดาวน์โหลด Excel/CSV</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">รหัส</th>
                <th className="py-3 px-4">แผนก (Department)</th>
                <th className="py-3 px-3 text-center">กำลังคน (Scheduled)</th>
                <th className="py-3 px-3 text-center text-emerald-700">มาทำงาน (Present)</th>
                <th className="py-3 px-3 text-center text-blue-700">ลา (Leave)</th>
                <th className="py-3 px-3 text-center text-rose-700">ขาด (Absent)</th>
                <th className="py-3 px-3 text-center text-amber-700">สาย (Late)</th>
                <th className="py-3 px-4 text-right">% มาทำงาน</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d: any) => {
                const rate = parseFloat(d.attendance_rate || '0');
                let statusLabel = 'ปกติ (Normal)';
                let statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (parseInt(d.absent || '0') > 0 || rate < 85) {
                  statusLabel = 'เฝ้าระวัง (Watch)';
                  statusClass = 'bg-amber-50 text-amber-700 border-amber-200';
                }

                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{d.department_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{d.department_name}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{d.scheduled}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{d.present}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-600">{d.on_leave}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{d.absent}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">{d.late}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{rate}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
