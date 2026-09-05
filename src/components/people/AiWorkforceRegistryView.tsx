'use client'

import React, { useState, useEffect } from 'react';
import { 
  Bot, ShieldCheck, ShieldAlert, Sparkles, Lock, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, 
  Terminal, Activity, Zap, Info, Eye
} from 'lucide-react';
import { Persona } from './PeopleHeader';

interface AiWorkforceRegistryViewProps {
  currentPersona: Persona;
}

export function AiWorkforceRegistryView({ currentPersona }: AiWorkforceRegistryViewProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>('AGENT-ATT-01');
  const [loading, setLoading] = useState(true);

  const fetchWorkforceData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/people/ai-workforce');
      const json = await res.json();
      if (json.success) {
        setAgents(json.data.agents || []);
        setRecentEvents(json.data.recentEvents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkforceData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner with Clear "Planned (Phase 8)" Badge (Section 46: Anti-Fake AI) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30">
                Layer 5: AI Workforce Architecture
              </span>
              <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                AI Workforce — Planned (Phase 8)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 text-white flex items-center gap-2.5">
              <span>ทะเบียนผู้ช่วยดิจิทัล (Digital Workers Registry)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              สถาปัตยกรรมรองรับ AI เป็น <strong>Digital Worker</strong> ในอนาคต (มีตัวตน, ภารกิจ, ขอบเขตสิทธิ์ Least-Privilege และระบบ Event Subscription) โดยไม่ใช้ AI ปลอมใน V1
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-right">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Digital Workers Registered</div>
              <div className="text-2xl font-black text-indigo-400">{agents.length} ตน</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Core Operational Philosophy Box */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold text-indigo-950">หลักการทำงานในอนาคต (Future AI Operating Model):</div>
          <p className="text-indigo-900 leading-relaxed font-medium">
            <strong>System detects ➔ AI investigates ➔ AI prepares ➔ Human decides ➔ System executes ➔ Everything is audited</strong>
            <br />
            AI จะไม่ทำหน้าที่เป็น System of Record และไม่ได้รับอนุญาตให้ตัดสินใจสั่งการเรื่องสำคัญ (ห้ามตัดเงินเดือน, ห้ามลงโทษทางวินัย, ห้ามเลิกจ้าง) โดยเด็ดขาด
          </p>
        </div>
      </div>

      {/* 3. The 6 Digital Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const isSelected = selectedAgent === agent.agent_code;
          return (
            <div
              key={agent.agent_code}
              onClick={() => setSelectedAgent(isSelected ? null : agent.agent_code)}
              className={`p-5 rounded-3xl border cursor-pointer transition space-y-3 relative ${
                isSelected
                  ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200/90 shadow-xs hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">{agent.agent_name}</span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{agent.agent_code} • v{agent.version}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {agent.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium line-clamp-2">
                {agent.description || agent.mission}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">บทบาทตั้งต้น: <strong className="text-slate-700">{agent.default_role_id}</strong></span>
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  <span>ดูสิทธิ์การเข้าถึง</span>
                  {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Selected Agent Permission & Least-Privilege Inspector */}
      {selectedAgent && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>การควบคุมสิทธิ์ขั้นต่ำ (Least-Privilege Permission Model) — {selectedAgent}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">ตรวจสอบสิทธิ์การอ่าน การสร้างเคส และการบล็อกคำสั่งที่มีความเสี่ยงสูง (Prohibited Actions)</p>
            </div>
            <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-3 py-1 rounded-xl">
              Human-in-the-Loop Enforced
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Allowed Actions */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-2.5">
              <div className="font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>สิทธิ์ที่ได้รับอนุญาต (Allowed Digital Actions)</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-700">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-emerald-100">
                  <span>READ attendance / schedule / leave</span>
                  <span className="font-bold text-emerald-700">Level 0: Observe</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-emerald-100">
                  <span>CREATE hr_case (เมื่อพบความผิดปกติ)</span>
                  <span className="font-bold text-emerald-700">Level 2: Prepare</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-emerald-100">
                  <span>CREATE recommendation / brief</span>
                  <span className="font-bold text-emerald-700">Level 1: Recommend</span>
                </div>
              </div>
            </div>

            {/* Prohibited Actions */}
            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-2.5">
              <div className="font-bold text-rose-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>การกระทำที่ห้ามเด็ดขาด (Prohibited High-Risk Actions)</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-700">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-100">
                  <span>MODIFY raw attendance logs</span>
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">ห้ามเด็ดขาด</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-100">
                  <span>CHANGE leave balance / override</span>
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">ห้ามเด็ดขาด</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-100">
                  <span>ISSUE penalty / TERMINATE employee</span>
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">ห้ามเด็ดขาด</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Recent Domain Events (Layer 8: Audit & Event-Driven Backbone) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              <span>กระแสเหตุการณ์ระบบ (Domain Events Feed)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">โครงสร้าง Event-Driven บันทึกทุกการเปลี่ยนแปลงเพื่อเป็น Event Stream ให้ Digital Workers ใช้งานใน Phase 8</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl font-mono">
            domain_events
          </span>
        </div>

        <div className="space-y-2">
          {recentEvents.length > 0 ? (
            recentEvents.map((ev) => (
              <div key={ev.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-black text-[11px]">
                    {ev.event_name}
                  </span>
                  <span className="text-slate-600 font-sans">{ev.entity_type}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-sans flex items-center gap-2">
                  <span>{new Date(ev.occurred_at).toLocaleString('th-TH')}</span>
                  <span className="font-mono text-[10px] text-slate-400">({ev.correlation_id})</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 py-6 text-center">ยังไม่มีบันทึก Event ในระบบ</div>
          )}
        </div>
      </div>
    </div>
  );
}
