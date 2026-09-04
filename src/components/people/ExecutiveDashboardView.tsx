'use client'

import React, { useState } from 'react';
import { 
  Building2, Users, TrendingUp, AlertTriangle, ShieldCheck, 
  CheckCircle2, ArrowRight, Zap, Activity, Clock, DollarSign,
  AlertCircle, ChevronDown, ChevronUp, Package, Sparkles
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
  const [expandedArea, setExpandedArea] = useState<string | null>('Packing');

  const readinessCards = [
    { id: 'Mixing', name: 'Mixing (ผสม)', status: 'READY', color: 'emerald', req: 12, avail: 12, risk: null },
    { id: 'Filling', name: 'Filling (บรรจุขวด/หลอด)', status: 'READY', color: 'emerald', req: 20, avail: 19, risk: null },
    { 
      id: 'Packing', 
      name: 'Packing (บรรจุหีบห่อ)', 
      status: 'MANPOWER RISK', 
      color: 'rose', 
      req: 32, 
      avail: 27, 
      leave: 3, 
      absent: 2,
      criticalSkill: 'Labeling Machine Operator (ผู้ควบคุมเครื่องติดฉลาก)',
      ordersAtRisk: ['JHD-309', 'JHD-318']
    },
    { id: 'QC', name: 'QC / Lab', status: 'READY', color: 'emerald', req: 8, avail: 8, risk: null },
    { id: 'Warehouse', name: 'Warehouse (คลัง RM/PM/FG)', status: 'WATCH', color: 'amber', req: 14, avail: 12, risk: 'RM Receiver ลาป่วย 1 ท่าน' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Hero Header (Date & Factory Overview) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#1C1814] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-amber-500/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30">
                CEO & Executive Intelligence
              </span>
              <span className="text-xs text-slate-400 font-bold">4 ก.ย. 2569 (07:45 น.)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 text-white">
              COSMEFLOW PEOPLE
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              ภาพรวมเสถียรภาพกำลังคนและการผลิตประจำวัน เชื่อมโยง <strong>คน • ทักษะ • ออเดอร์ที่เสี่ยง</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-right">
              <div className="text-[11px] text-slate-400 font-bold uppercase">ความพร้อมทั้งโรงงาน</div>
              <div className="text-2xl font-black text-emerald-400">92.4%</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-right">
              <div className="text-[11px] text-slate-400 font-bold uppercase">สถานะภาพรวม</div>
              <div className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-block mt-0.5">
                เฝ้าระวังบรรจุ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 5 Primary Headcount Counters (Exact Match with CEO Specification) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
            <span>👥</span>
            <span>Headcount ทั้งหมด</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">186</div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">รายเดือน 42 • รายวัน 144</div>
        </div>

        <div className="bg-emerald-50/50 p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
            <span>✅</span>
            <span>เข้างานจริง (Present)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">172 <span className="text-sm font-bold">คน</span></div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">92.5% ประจำสถานี</div>
        </div>

        <div className="bg-blue-50/50 p-4 sm:p-5 rounded-3xl border border-blue-200 shadow-xs">
          <div className="text-xs text-blue-800 font-bold flex items-center gap-1.5">
            <span>🏖</span>
            <span>ลางานตามแผน (Leave)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">7 <span className="text-sm font-bold">คน</span></div>
          <div className="text-[11px] text-blue-700 font-medium mt-0.5">พักร้อน 4 • ป่วย 3</div>
        </div>

        <div className="bg-rose-50/50 p-4 sm:p-5 rounded-3xl border border-rose-200 shadow-xs">
          <div className="text-xs text-rose-800 font-bold flex items-center gap-1.5">
            <span>❌</span>
            <span>ขาดงาน (Absent)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">3 <span className="text-sm font-bold">คน</span></div>
          <div className="text-[11px] text-rose-700 font-medium mt-0.5">ไม่แจ้งล่วงหน้า (Line 2)</div>
        </div>

        <div className="bg-amber-50/50 p-4 sm:p-5 rounded-3xl border border-amber-200 shadow-xs">
          <div className="text-xs text-amber-800 font-bold flex items-center gap-1.5">
            <span>⏰</span>
            <span>มาสาย (Late)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">4 <span className="text-sm font-bold">คน</span></div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">เฉลี่ยสาย 14 นาที</div>
        </div>
      </div>

      {/* 3. Factory Readiness & Interactive Drill-down (Packing Line Risk) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Factory Readiness (ความพร้อมกำลังคนแยกสายผลิต)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">คลิกที่ฝ่ายเพื่อดูรายละเอียดกำลังคนและคำสั่งผลิตที่ได้รับผลกระทบ</p>
          </div>
          <span className="text-xs font-bold text-slate-400">อัปเดต ณ 07:45 น.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {readinessCards.map((r) => {
            const isSelected = expandedArea === r.id;
            const isRisk = r.status === 'MANPOWER RISK';
            const isWatch = r.status === 'WATCH';

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setExpandedArea(isSelected ? null : r.id)}
                className={`p-4 rounded-2xl border text-left transition relative ${
                  isRisk
                    ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30'
                    : isWatch
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="font-extrabold text-slate-900 truncate">{r.name.split(' ')[0]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isRisk ? 'bg-rose-600 text-white animate-pulse' :
                    isWatch ? 'bg-amber-200 text-amber-900' :
                    'bg-emerald-200 text-emerald-900'
                  }`}>
                    {isRisk ? '🔴 RISK' : isWatch ? '🟡 WATCH' : '🟢 READY'}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">{r.avail}</span>
                  <span className="text-xs text-slate-500 font-bold">/ {r.req} คน</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                  <span>{Math.round((r.avail / r.req) * 100)}% Capacity</span>
                  {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Drill-down Detail Banner when Packing 🔴 is selected */}
        {expandedArea === 'Packing' && (
          <div className="p-5 rounded-2xl bg-rose-50/90 border border-rose-300 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/80 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="font-black text-rose-950 text-sm">เจาะลึกความเสี่ยง: Packing Line 2 (บรรจุหีบห่อ)</h4>
                  <p className="text-xs text-rose-700">Required 32 • Available 27 (ลางาน 3 คน, ขาดงาน 2 คน)</p>
                </div>
              </div>
              <span className="text-xs font-black bg-rose-600 text-white px-3 py-1 rounded-full w-fit">
                กำลังคนขาด 5 คน (-15.6%)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white/80 p-3.5 rounded-xl border border-rose-200">
                <div className="font-bold text-rose-900 flex items-center gap-1.5 mb-1">
                  <span>🔴</span>
                  <span>Critical Skill Missing (ทักษะวิกฤตที่ขาดหน้างาน)</span>
                </div>
                <div className="text-slate-800 font-extrabold text-sm mt-1">
                  Labeling Machine Operator (ผู้ควบคุมเครื่องติดฉลากอัตโนมัติ)
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  พนักงานประจำเครื่อง MX-Label ลาป่วยกะทันหัน ไม่มีคนแทนที่มีใบรับรอง Skill Level 3 ประจำกะ
                </div>
              </div>

              <div className="bg-white/80 p-3.5 rounded-xl border border-rose-200">
                <div className="font-bold text-rose-900 flex items-center gap-1.5 mb-1">
                  <span>📦</span>
                  <span>Production Orders at Risk (คำสั่งผลิตที่ได้รับผลกระทบ)</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-mono font-black text-xs">
                    JHD-309 (Serum 50ml)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-mono font-black text-xs">
                    JHD-318 (Cream 30g)
                  </span>
                </div>
                <div className="text-[11px] text-rose-700 mt-1 font-bold">
                  กำหนดส่งออก: 16:00 น. วันนี้ • เสี่ยงคอขวดและส่งมอบล่าช้า
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. OT Today & Estimated Cost + HR Alerts (2-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: OT Today & Financial Impact */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>OT Today & Estimated Cost (แผนงานล่วงเวลา)</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">กะเย็น 17:00–20:00</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-800 font-bold uppercase">พนักงานที่ขอ OT วันนี้</div>
              <div className="text-3xl font-black text-amber-950 mt-0.5">42 <span className="text-sm font-bold">คน</span></div>
              <div className="text-[11px] text-amber-700 font-medium">Packing 25 • Mixing 10 • Warehouse 7</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-amber-800 font-bold uppercase">ประมาณการค่าแรง OT</div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">฿18,450</div>
              <div className="text-[11px] text-emerald-700 font-bold">อยู่ในงบประมาณประจำสัปดาห์</div>
            </div>
          </div>
        </div>

        {/* Right: Executive HR Alerts */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span>Executive HR Alerts (การแจ้งเตือนสำคัญฝ่ายบริหาร)</span>
            </h3>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">4 แจ้งเตือน</span>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <span>🔴</span>
                <span>3 Missing Employees (ขาดงานไม่แจ้งล่วงหน้า)</span>
              </div>
              <span className="text-[10px] font-black bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">ฝ่ายผลิต</span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <span>🟠</span>
                <span>7 Pending Leave Approvals (คำขอลาค้างรออนุมัติเกิน 4 ชม.)</span>
              </div>
              <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">รอหัวหน้า</span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <span>🟠</span>
                <span>12 Missing Clock Records (ลืมสแกนนิ้วเข้า/ออกเมื่อวาน)</span>
              </div>
              <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">ฝ่ายบรรจุ</span>
            </div>

            <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-yellow-900">
                <span>🟡</span>
                <span>8 Training Expiring (ใบรับรอง GMP/Hygiene ใกล้หมดอายุใน 15 วัน)</span>
              </div>
              <span className="text-[10px] font-black bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">QA/Mixing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
