'use client'

import React, { useState } from 'react';
import { 
  Users, Bell, Globe, ChevronDown, CheckCircle2, AlertTriangle, 
  ShieldAlert, UserCheck, Calendar, Sparkles, Building2, Clock, Check
} from 'lucide-react';
import { Language, TRANSLATIONS } from '@/lib/peopleTranslations';

export interface Persona {
  id: string;
  name: string;
  nickname: string;
  code: string;
  role: string;
  dept: string;
  avatarColor: string;
  description: string;
}

export const DEMO_PERSONAS: Persona[] = [
  {
    id: 'hr-mgr-id',
    name: 'คุณกุลธิดา บริหารบุคคล',
    nickname: 'คุณกุล',
    code: 'HR-MGR001',
    role: 'HR Manager',
    dept: 'ฝ่ายทรัพยากรบุคคล (HR)',
    avatarColor: 'bg-purple-600',
    description: 'ผู้จัดการฝ่ายบุคคล - จัดการนโยบาย, ดูแลภาพรวม, อนุมัติพิเศษ'
  },
  {
    id: 'hr-off-id',
    name: 'คุณกิตติชัย ตรวจเวลา',
    nickname: 'บอย',
    code: 'HR-OFF001',
    role: 'HR Officer',
    dept: 'ฝ่ายทรัพยากรบุคคล (HR)',
    avatarColor: 'bg-blue-600',
    description: 'เจ้าหน้าที่บุคคล - ตรวจสอบ Attendance Exception, แก้ไขเวลา, จัดการ Master'
  },
  {
    id: 'sup-pdt-id',
    name: 'ดร.ภญ. ชมพูนุช แสวงศักดิ์',
    nickname: 'ดร.ชมพู่',
    code: 'PDT-CPS001',
    role: 'Supervisor',
    dept: 'ฝ่ายผลิต (Production)',
    avatarColor: 'bg-amber-600',
    description: 'หัวหน้างานสายผลิต - อนุมัติวันลาทีม, ดูความพร้อมกำลังคนหน้างาน'
  },
  {
    id: 'mgr-pdt-id',
    name: 'คุณสมบูรณ์ คุมฝ่ายผลิต',
    nickname: 'คุณบูรณ์',
    code: 'PDT-MGR001',
    role: 'Manager',
    dept: 'ฝ่ายผลิต (Production)',
    avatarColor: 'bg-indigo-600',
    description: 'ผู้จัดการฝ่ายผลิต - อนุมัติลาระดับสอง, ดูภาพรวมกำลังคนฝ่าย'
  },
  {
    id: 'emp-pk-id',
    name: 'น.ส.เบ็ญจพร พูลสวัสดิ์',
    nickname: 'เบ็ญ',
    code: 'PK-BJP518',
    role: 'Employee',
    dept: 'แผนกบรรจุและแพ็กกิ้ง (Packing)',
    avatarColor: 'bg-emerald-600',
    description: 'พนักงานสายผลิต - ดูวันลา, ขอยื่นใบลา, ดูเวลาทำงานบนมือถือ'
  },
  {
    id: 'exec-id',
    name: 'ดร.เอกชัย เกียรติบำรุงกิจ',
    nickname: 'ดร.เอก',
    code: 'EXEC-001',
    role: 'Executive',
    dept: 'คณะผู้บริหาร (Executive)',
    avatarColor: 'bg-slate-800',
    description: 'ผู้บริหารระดับสูง - แดชบอร์ดความพร้อมโรงงานและอัตราการมาทำงาน'
  },
  {
    id: 'admin-id',
    name: 'คุณสิทธิชัย ผู้ดูแลระบบ',
    nickname: 'แอดมิน',
    code: 'EMP-ADM001',
    role: 'Admin',
    dept: 'สำนักพัฒนาระบบ (System Admin)',
    avatarColor: 'bg-rose-600',
    description: 'ผู้ดูแลระบบสูงสุด - ตั้งค่าระบบ, สิทธิ์ RBAC'
  }
];

interface PeopleHeaderProps {
  currentPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  lang: Language;
  onSelectLang: (lang: Language) => void;
  notificationCount?: number;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onRequestLeaveClick?: () => void;
}

export function PeopleHeader({
  currentPersona,
  onSelectPersona,
  lang,
  onSelectLang,
  notificationCount = 2,
  activeTab,
  onSelectTab,
  onRequestLeaveClick
}: PeopleHeaderProps) {
  const t = TRANSLATIONS[lang];
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const tabs = [
    { id: 'dashboard', label: t.navHome, icon: '🏠' },
    { id: 'employees', label: t.navEmployees, icon: '👥' },
    { id: 'leave', label: t.navLeave, icon: '🏖️' },
    { id: 'ot_costing', label: 'OT & ต้นทุนงาน (Costing)', icon: '⏰' },
    { id: 'approvals', label: t.navApprovals, icon: '✍️', badge: currentPersona.role.includes('Supervisor') || currentPersona.role.includes('Manager') || currentPersona.role.includes('HR') ? 2 : undefined },
    { id: 'cases', label: 'เคส & หลักฐาน (Cases)', icon: '📁', restricted: ['Employee'] },
    { id: 'attendance', label: t.navAttendance, icon: '⏱️' },
    { id: 'exceptions', label: t.navExceptions, icon: '⚠️', badge: currentPersona.role.includes('HR') ? 6 : undefined },
    { id: 'ai_workforce', label: 'AI Workforce', icon: '🤖', restricted: ['Employee'] },
    { id: 'policies', label: t.navPolicies, icon: '⚙️', restricted: ['Employee'] },
    { id: 'reports', label: t.navReports, icon: '📊' },
  ].filter(tab => !tab.restricted || !tab.restricted.includes(currentPersona.role));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 mb-5 overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 sm:px-6 sm:py-4 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                CosmeFlow <span className="text-amber-600">People</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300/60">
                V1 Production
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Right Controls: Quick Persona Switcher + Language + Notification */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Persona Switcher for easy testing */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-left"
              title="สลับบทบาทผู้ใช้เพื่อทดสอบระบบ (Interactive Demo Persona)"
            >
              <div className={`w-7 h-7 rounded-lg ${currentPersona.avatarColor} text-white flex items-center justify-center text-xs font-bold`}>
                {currentPersona.name.slice(0, 1)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {currentPersona.nickname} ({currentPersona.code})
                </div>
                <div className="text-[10px] text-amber-700 font-semibold leading-tight">
                  {currentPersona.role}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Persona Dropdown Menu */}
            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 divide-y divide-slate-100">
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  สลับบทบาททดสอบ (Demo Personas)
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {DEMO_PERSONAS.map(p => (
                    <button
                      key={p.code}
                      onClick={() => {
                        onSelectPersona(p);
                        setShowPersonaMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-amber-50/60 transition ${
                        currentPersona.code === p.code ? 'bg-amber-50/90 font-medium' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${p.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                        {p.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 truncate">{p.name}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{p.role}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{p.dept}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(['th', 'en', 'my'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => onSelectLang(l)}
                className={`px-2 py-1 rounded-lg uppercase transition text-[11px] ${
                  lang === l ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition relative"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {notificationCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 text-xs">
                <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>การแจ้งเตือนล่าสุด</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">{notificationCount} ใหม่</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/50">
                    <p className="font-bold text-amber-900">คำขอลาใหม่รออนุมัติ</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">น.ส.เบ็ญจพร พูลสวัสดิ์ ยื่นขอลาพักร้อน 1 วัน (08/09/2026)</p>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200/50">
                    <p className="font-bold text-blue-900">ข้อยกเว้นลงเวลาประจำวัน</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">พบขาดงาน 2 คน และไม่สแกนนิ้ว 6 คน ในระบบวันนี้</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Leave Request CTA button */}
          {onRequestLeaveClick && (
            <button
              onClick={onRequestLeaveClick}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.requestLeave}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-4 sm:px-6 bg-slate-50/60 border-t border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
