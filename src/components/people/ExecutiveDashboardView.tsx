'use client'

import React from 'react';
import { 
  Building2, Users, TrendingUp, AlertTriangle, ShieldCheck, 
  CheckCircle2, ArrowRight, Zap, Activity 
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { Language, TRANSLATIONS } from '@/lib/peopleTranslations';

interface ExecutiveDashboardViewProps {
  currentPersona: Persona;
  kpi: any;
  departments: any[];
  factoryReadiness: any[];
  lang: Language;
}

export function ExecutiveDashboardView({
  currentPersona,
  kpi = {},
  departments = [],
  factoryReadiness = [],
  lang
}: ExecutiveDashboardViewProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#1F1B18] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30">
            Executive Intelligence Dashboard
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 text-white">
            ภาพรวมเสถียรภาพกำลังคนระดับผู้บริหาร
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            สรุปดัชนีชี้วัดความพร้อมของบุคลากรทั้งโรงงาน (Cosmediva Factory Readiness) เพื่อสนับสนุนการตัดสินใจฝ่ายบริหาร
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0">
          <div>
            <div className="text-3xl font-black text-emerald-400">{kpi.attendanceRate || '0'}%</div>
            <div className="text-[11px] text-slate-300 font-bold uppercase">Workforce Readiness</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 4 Core Executive Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">กำลังคนทั้งหมด (Headcount)</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{kpi.totalHeadcount || 134}</div>
          <div className="text-xs text-emerald-600 font-bold mt-1">100% Active Directory</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs text-emerald-800 font-bold uppercase">พร้อมผลิตจริง (Present)</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{kpi.presentToday || 0} คน</div>
          <div className="text-xs text-emerald-700 font-bold mt-1">ประจำสถานีตามแผน</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-xs text-blue-800 font-bold uppercase">ลางานตามแผน (Leave Rate)</div>
          <div className="text-3xl font-black text-blue-600 mt-1">{kpi.leaveToday || 0} คน</div>
          <div className="text-xs text-blue-700 font-bold mt-1">อนุมัติล่วงหน้าถูกต้อง</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="text-xs text-rose-800 font-bold uppercase">ความเสี่ยงขาดงาน (Absence)</div>
          <div className="text-3xl font-black text-rose-600 mt-1">{kpi.absentToday || 0} คน</div>
          <div className="text-xs text-rose-700 font-bold mt-1">
            {kpi.absentToday > 0 ? 'อยู่ในเกณฑ์เฝ้าระวัง' : 'ไม่มีความเสี่ยง'}
          </div>
        </div>
      </div>

      {/* Factory Readiness Overview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>ความพร้อมสายการผลิตหลัก (Core Production Units Readiness)</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">สถานะกะปัจจุบัน</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {factoryReadiness.slice(0, 5).map((wa) => {
            const isReady = wa.readiness_status === 'READY';
            return (
              <div 
                key={wa.id}
                className={`p-4 rounded-2xl border ${
                  isReady ? 'bg-emerald-50/30 border-emerald-200' : 'bg-amber-50/30 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="truncate text-slate-800">{wa.work_area_name.split('(')[0]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {wa.readiness_status}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">{wa.attendance_rate}%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">เข้างาน {wa.present} / {wa.scheduled} คน</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department Risk Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
        <h3 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-700" />
          <span>ดัชนีความพร้อมและอัตราการมาทำงานรายแผนก (Department Risk Assessment)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map((d: any) => {
            const rate = parseFloat(d.attendance_rate || '0');
            const hasRisk = parseInt(d.absent || '0') > 0 || rate < 85;
            return (
              <div key={d.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-xs">{d.department_name}</div>
                  <div className="text-[11px] text-slate-500">
                    เข้างาน {d.present} / {d.scheduled} คน • ลา {d.on_leave} คน
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-800 text-sm">{rate}%</div>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                    hasRisk ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {hasRisk ? 'เฝ้าระวัง' : 'พร้อม'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
