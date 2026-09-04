'use client'

import React from 'react';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, 
  Sparkles, Coffee, Award, ChevronRight, FileText, User, MapPin, Building
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { Language, TRANSLATIONS } from '@/lib/peopleTranslations';

interface EmployeeDashboardViewProps {
  currentPersona: Persona;
  employeeData: any;
  lang: Language;
  onRequestLeave: () => void;
  onNavigateTab: (tab: string) => void;
}

export function EmployeeDashboardView({
  currentPersona,
  employeeData,
  lang,
  onRequestLeave,
  onNavigateTab
}: EmployeeDashboardViewProps) {
  const t = TRANSLATIONS[lang];
  const profile = employeeData?.profile || {};
  const todayAtt = employeeData?.todayAttendance;
  const balances = employeeData?.balances || [];
  const upcomingLeaves = employeeData?.upcomingLeaves || [];
  const nextHoliday = employeeData?.nextHoliday;

  // Format today's clock in
  const clockIn = todayAtt?.actual_in ? new Date(todayAtt.actual_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const clockOut = todayAtt?.actual_out ? new Date(todayAtt.actual_out).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const isPresent = todayAtt?.attendance_status === 'Present' || todayAtt?.attendance_status === 'Late';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Mobile Greeting & Today's Attendance Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-[#1E1B18] to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-amber-500/20 relative overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 rounded-full bg-amber-600/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Employee Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              {currentPersona.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  {currentPersona.code} • {currentPersona.role}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5 text-white">
                {currentPersona.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                <span className="flex items-center gap-1"><Building className="w-3 h-3 text-amber-400" /> {profile.department_name || currentPersona.dept}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-400" /> {profile.work_area_name || 'โรงงานคอสเมดิวา'}</span>
              </div>
            </div>
          </div>

          {/* Today's Punch Time Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between md:justify-end gap-6">
            <div className="text-left">
              <div className="text-[11px] text-slate-400 font-medium uppercase">เวลาเข้างาน (In)</div>
              <div className="text-lg font-extrabold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4" />
                {clockIn}
              </div>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-left">
              <div className="text-[11px] text-slate-400 font-medium uppercase">เวลาเลิกงาน (Out)</div>
              <div className="text-lg font-extrabold text-amber-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4" />
                {clockOut}
              </div>
            </div>
            <div className="hidden sm:block">
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                isPresent ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {todayAtt?.attendance_status || 'กะปกติ 08:00 - 17:00'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Leave CTA Button for Mobile (Section 77: Employee does essential action in <= 3 clicks) */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-300 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ต้องการลางาน หรือแจ้งเหตุฉุกเฉิน ยื่นออนไลน์ผ่านระบบได้ทันที</span>
          </div>
          <button
            onClick={onRequestLeave}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>ยื่นคำขอลาทันที (Request Leave)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Leave Balances Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>🏖️</span>
            <span>สิทธิ์วันลาคงเหลือประจำปี 2569 (Leave Balances)</span>
          </h3>
          <button 
            onClick={() => onNavigateTab('leave')}
            className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
          >
            <span>ดูประวัติทั้งหมด</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.length > 0 ? (
            balances.map((b: any) => {
              const available = parseFloat(b.available || '0');
              const entitled = parseFloat(b.entitled || '0');
              const taken = parseFloat(b.taken || '0');
              const pending = parseFloat(b.pending || '0');
              const pct = entitled > 0 ? Math.min(100, Math.round((taken / entitled) * 100)) : 0;

              return (
                <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-800 text-sm">{b.name_th}</span>
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: b.color_code || '#F59E0B' }}
                    ></span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-slate-900">{available}</span>
                    <span className="text-xs text-slate-500 font-bold">วันคงเหลือ (Available)</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: b.color_code || '#F59E0B' }}
                    ></div>
                  </div>

                  {/* Breakdown footer */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">สิทธิ์ทั้งปี</span>
                      <span className="font-bold text-slate-700">{entitled}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">ใช้ไปแล้ว</span>
                      <span className="font-bold text-slate-700">{taken}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">รออนุมัติ</span>
                      <span className="font-bold text-amber-600">{pending}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
              กำลังโหลดข้อมูลสิทธิ์วันลา...
            </div>
          )}
        </div>
      </div>

      {/* 3. Next Holiday & Upcoming Leaves Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Next Holiday */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-5 border border-amber-200/80 shadow-xs flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-[11px] font-extrabold uppercase text-amber-800 tracking-wider bg-amber-200/70 px-2 py-0.5 rounded-full">
              วันหยุดโรงงานถัดไป (Upcoming Holiday)
            </span>
            <h4 className="text-base font-bold text-slate-800 mt-1">
              {nextHoliday ? nextHoliday.holiday_name : 'วันนวมินทรมหาราช (13 ต.ค. 2569)'}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {nextHoliday ? new Date(nextHoliday.holiday_date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'วันอังคารที่ 13 ตุลาคม 2569'}
            </p>
          </div>
        </div>

        {/* Upcoming Leave / Pending Request */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">คำขอลาล่าสุด</span>
            <button onClick={() => onNavigateTab('leave')} className="text-xs font-bold text-amber-600 hover:underline">
              ประวัติ
            </button>
          </div>
          {upcomingLeaves.length > 0 ? (
            <div className="space-y-2">
              {upcomingLeaves.slice(0, 2).map((ul: any) => (
                <div key={ul.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{ul.name_th} ({ul.total_days} วัน)</div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(ul.start_date).toLocaleDateString('th-TH')} - {new Date(ul.end_date).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    ul.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    ul.status.startsWith('PENDING') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ul.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3 text-center">
              ไม่มีรายการคำขอลาที่รอประมวลผล
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
