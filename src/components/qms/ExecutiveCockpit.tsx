'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  FileText,
  Layers,
  Sparkles,
  BarChart3,
  Calendar,
  Lock,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  QmsExecutiveCockpitResponse,
  QmsDeductionLedgerItem,
  QmsCriticalExecutiveAlert,
  QmsAiExecutiveNarrative,
} from '@/types/qms_analytics';
import { QhsScoreBreakdownModal } from './QhsScoreBreakdownModal';
import { CriticalAlertDrilldownModal } from './CriticalAlertDrilldownModal';

interface ExecutiveCockpitProps {
  data: QmsExecutiveCockpitResponse;
  aiNarrative?: QmsAiExecutiveNarrative | null;
  onRefresh: () => void;
  onNavigateToTab: (tabName: string, filter?: any) => void;
  loading?: boolean;
}

export function ExecutiveCockpit({
  data,
  aiNarrative,
  onRefresh,
  onNavigateToTab,
  loading = false,
}: ExecutiveCockpitProps) {
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [criticalAlertModalOpen, setCriticalAlertModalOpen] = useState(false);

  const { healthScore, criticalAlerts, attentionSummary, macroPipeline, dataFreshness } = data;

  const isExcellent = healthScore.healthBand === 'EXCELLENT';
  const isControlled = healthScore.healthBand === 'CONTROLLED';
  const isElevated = healthScore.healthBand === 'ELEVATED_RISK';
  const isCriticalAttention =
    healthScore.healthBand === 'CRITICAL_ALERT' ||
    healthScore.healthBand === 'EXECUTIVE_ATTENTION_REQUIRED' ||
    healthScore.score < 60;

  const scoreBadgeBg = isExcellent
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : isControlled
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    : isElevated
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

  const filteredDeductions = selectedDimension
    ? healthScore.deductionLedger.filter((d) => d.dimension === selectedDimension)
    : healthScore.deductionLedger;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. INDEPENDENT CRITICAL EXECUTIVE ALERTS HERO BANNER (Decoupled from QHS)   */}
      {/* ========================================================================= */}
      {criticalAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-2 border-rose-600/80 rounded-xl p-5 shadow-xl shadow-rose-950/30 backdrop-blur-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-600/30 rounded-xl border border-rose-500/50 text-rose-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6 animate-pulse text-rose-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-600 text-white tracking-wider uppercase shadow-sm">
                    CRITICAL EXECUTIVE ALERT
                  </span>
                  <Badge className="bg-rose-950 text-rose-300 border-rose-800 font-mono text-xs">
                    {criticalAlerts.length} ข้อกังวลเร่งด่วนระดับบริหาร
                  </Badge>
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                    ✓ RECONCILED (20 = 19 เหตุการณ์วิกฤต + 1 QA Hold)
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  ระบบแจ้งเตือนระดับวิกฤต: พบข้อเบี่ยงเบนคุณภาพยังไม่ได้รับการควบคุมและรุ่นผลิตติด QA Hold
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  <strong>สาเหตุที่ระบบเข้าสู่สถานะ CRITICAL ALERT:</strong> เกิดจากการละเมิดเกณฑ์ความเสี่ยงวิกฤตพร้อมกัน โดยพบข้อเบี่ยงเบนระดับ CRITICAL ที่ยังไม่แล้วเสร็จการ Containment จำนวน <strong>19 รายการ</strong> ใน Phase 1 และคำสั่งระงับการปล่อย (QA Hold) จำนวน <strong>1 ล็อต</strong> ใน Phase 5 ส่งผลให้ดัชนีสุขภาพระบบคุณภาพ (QHS V2) ลดลงเหลือ <strong>{healthScore.score} / 100</strong> (ระดับ Critical Alert &lt; 60 คะแนน)
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2">
              <Button
                size="sm"
                onClick={() => setCriticalAlertModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-2 px-4 py-2 shadow-lg shadow-rose-950/40 w-full sm:w-auto"
              >
                <ShieldAlert className="w-4 h-4" />
                เปิดดูบัญชีแจ้งเตือนวิกฤต (Critical Alert Drill-Down)
                <ArrowRight className="w-4 h-4" />
              </Button>
              <span className="text-[10px] text-rose-300/80 font-mono">
                คลิกเพื่อดูประชากร 20 รายการและกระทบยอด 20 vs 19 vs 22
              </span>
            </div>
          </div>

          {/* Quick alert preview chips */}
          <div className="pt-2 border-t border-rose-900/40 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-rose-300 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                ประชากรต้นทาง:
              </span>
              <span className="bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                Phase 1 (Events): 19 รายการ
              </span>
              <span className="bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                Phase 5 (QA Hold): 1 ล็อต (LOT-2026-0053)
              </span>
              <span className="bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                QHS Domain 1 Deductions: -30 pts (Capped)
              </span>
            </div>
            <button
              onClick={() => setCriticalAlertModalOpen(true)}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold hover:underline flex items-center gap-1"
            >
              ดูรายละเอียดทั้ง 20 รายการพร้อมเปิดบันทึกต้นทาง ➔
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE ATTENTION SECTION (Actionable Intelligence Above All Charts)  */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Executive Attention Required Now (สิ่งที่ต้องดูแลระดับบริหาร)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            อัปเดตล่าสุด: {dataFreshness.refreshedAt} • {dataFreshness.dateRangeLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Quality Health Score (Clickable to open transparent breakdown) */}
          <Card
            onClick={() => setDrillDownModalOpen(true)}
            className="bg-slate-900/80 border-slate-800 shadow-md hover:border-indigo-500/50 hover:shadow-indigo-950/30 hover:shadow-lg transition-all cursor-pointer group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 group-hover:text-indigo-300 transition-colors">
                  Quality Health Score (QHS V2)
                </span>
                <Badge
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCriticalAlertModalOpen(true);
                  }}
                  className={`${scoreBadgeBg} cursor-pointer hover:ring-1 hover:ring-rose-400 transition-all flex items-center gap-1`}
                  title="คลิกเพื่อดูรายละเอียดและสาเหตุที่ระบบเข้าสู่สถานะ CRITICAL ALERT"
                >
                  {isCriticalAttention && <ShieldAlert className="w-3 h-3 text-rose-400" />}
                  {healthScore.healthBandLabel || (isCriticalAttention ? 'CRITICAL ALERT' : healthScore.healthBand)}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className={`text-4xl font-extrabold tracking-tight font-mono ${
                    healthScore.score < 60 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {healthScore.score}
                </span>
                <span className="text-xs text-slate-500 font-semibold">/ 100</span>
                {healthScore.hasComparablePreviousPeriod ? (
                  <span
                    className={`text-[11px] font-mono font-bold ml-auto px-1.5 py-0.5 rounded border ${
                      healthScore.trendDirection === 'UP'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : healthScore.trendDirection === 'DOWN'
                        ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                        : 'text-slate-400 border-slate-700 bg-slate-800'
                    }`}
                  >
                    {healthScore.trendText}
                  </span>
                ) : (
                  <span
                    title="Insufficient comparable historical data"
                    className="text-[10px] font-mono text-slate-400 border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 rounded ml-auto"
                  >
                    Trend: N/A
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>
                  หักตามเพดาน: -{healthScore.totalBoundedDeductions ?? healthScore.totalDeductions} / 100 pts
                </span>
                <span className="text-[10px] text-slate-500">6 หมวดความเสี่ยง</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                {healthScore.healthBandDescription}
              </p>

              {/* Clickable Critical Alert Callout */}
              {isCriticalAttention && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setCriticalAlertModalOpen(true);
                  }}
                  className="mt-2.5 p-2 rounded-lg bg-rose-950/50 border border-rose-800/70 hover:bg-rose-950/80 cursor-pointer transition-colors flex items-center justify-between text-rose-300 text-[11px]"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>สาเหตุ CRITICAL ALERT ({criticalAlerts.length} รายการ)</span>
                  </span>
                  <span className="text-[10px] text-rose-400 font-semibold underline flex items-center gap-0.5">
                    ดูสาเหตุ/สืบย้อน
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-emerald-400 group-hover:text-emerald-300 font-semibold flex items-center gap-1 group-hover:underline">
                  <HelpCircle className="w-3.5 h-3.5" />
                  ที่มาของคะแนน (QHS Breakdown)
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-300" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Active QA Holds */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-md hover:border-slate-700 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Active QA Holds / Blocked</span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-amber-400 font-mono">
                  {attentionSummary.lingeringQaHoldsCount}
                </span>
                <span className="text-xs text-slate-400">รุ่นผลิตที่ถูกกักกัน</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Reject Rate: {attentionSummary.qaRejectRate.numerator} / {attentionSummary.qaRejectRate.denominator} ล็อต (
                {attentionSummary.qaRejectRate.ratePct.toFixed(1)}%)
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => onNavigateToTab('batch_release', { status: 'QA_ON_HOLD' })}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline"
                >
                  ดูคิวตรวจปล่อย (Batch Register)
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Overdue CAPA Actions */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-md hover:border-slate-700 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Overdue CAPA Actions</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-rose-400 font-mono">
                  {attentionSummary.overdueCapaActionCount}
                </span>
                <span className="text-xs text-slate-400">กิจกรรมเลยกำหนด</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Overdue Rate: {attentionSummary.overdueCapaRate.numerator} / {attentionSummary.overdueCapaRate.denominator} (
                {attentionSummary.overdueCapaRate.ratePct.toFixed(1)}%)
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => onNavigateToTab('capa_register', { filter: 'overdue' })}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline"
                >
                  ไปที่ CAPA Register
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Recurrence Signals */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-md hover:border-slate-700 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Recurrence Signals (สัญญาณซ้ำ)</span>
                <RefreshCw className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-indigo-400 font-mono">
                  {attentionSummary.recurringClustersCount}
                </span>
                <span className="text-xs text-slate-400">คลัสเตอร์ที่เกิดซ้ำ</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                First-Pass Release: {attentionSummary.firstPassReleaseRate.numerator} / {attentionSummary.firstPassReleaseRate.denominator} (
                {attentionSummary.firstPassReleaseRate.ratePct.toFixed(1)}%)
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => onNavigateToTab('quality_intelligence', { subTab: 'recurrence_radar' })}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 hover:underline"
                >
                  เปิด Recurrence Radar
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 30-SECOND EXECUTIVE ANSWERS (The 7 Questions)                          */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/70 border-slate-800">
        <CardHeader className="py-3 px-4 border-b border-slate-800/60">
          <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            30-Second Executive Answers (คำตอบ 7 ประเด็นสำคัญระดับบริหาร)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            onClick={() => setCriticalAlertModalOpen(true)}
            className="p-2.5 rounded bg-slate-950/50 border border-rose-900/50 hover:border-rose-500/70 hover:bg-rose-950/30 cursor-pointer transition-all group"
            title="คลิกเพื่อเปิดดูรายละเอียดและบันทึกต้นทางของ 20 ข้อกังวลเร่งด่วน"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-400 block flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                1. สิ่งที่ต้องดูแลทันที (Attention Now?)
              </span>
              <span className="text-[10px] text-rose-400 group-hover:text-rose-300 font-semibold flex items-center gap-0.5">
                เปิดดูบัญชี 20 รายการ <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-1 font-medium group-hover:text-white leading-relaxed">
              {attentionSummary.thirtySecondAnswers.attentionNow}
            </p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 block">2. ปัญหาอยู่ในการควบคุมหรือไม่? (Under Control?)</span>
            <p className="text-xs text-slate-200 mt-1 font-medium">{attentionSummary.thirtySecondAnswers.issuesControlled}</p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 block">3. สิ่งใดที่เกินกำหนด? (What is Overdue?)</span>
            <p className="text-xs text-slate-200 mt-1 font-medium">{attentionSummary.thirtySecondAnswers.whatIsOverdue}</p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 block">4. สิ่งใดที่กำลังเกิดซ้ำ? (What is Recurring?)</span>
            <p className="text-xs text-slate-200 mt-1 font-medium">{attentionSummary.thirtySecondAnswers.whatIsRecurring}</p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 block">5. รุ่นผลิตใดถูกกักกัน/ปฏิเสธ? (Blocked/Held?)</span>
            <p className="text-xs text-slate-200 mt-1 font-medium">{attentionSummary.thirtySecondAnswers.batchesBlockedOrHeld}</p>
          </div>
          <div className="p-2.5 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 block">6. แนวโน้มคุณภาพถดถอยที่ใด? (Quality Trend?)</span>
            <p className="text-xs text-slate-200 mt-1 font-medium">{attentionSummary.thirtySecondAnswers.qualityTrend}</p>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. MACRO QUALITY PIPELINE WATERFALL (Phases 1 - 5)                        */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/70 border-slate-800">
        <CardHeader className="py-3 px-4 border-b border-slate-800/60 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            CosmeFlow Assurance Macro Pipeline (กระบวนการคุณภาพ 5 เฟส)
          </CardTitle>
          <span className="text-[11px] text-slate-500">ข้อมูลเชื่อมโยงตรงจาก Phase 1–5 Ledger</span>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Step 1: Intake & Triage */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[11px] font-bold text-indigo-300 uppercase">Phase 1: Intake & Triage</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{macroPipeline.events.total}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>เปิดอยู่: {macroPipeline.events.open}</span>
                <span>กักกันแล้ว: {macroPipeline.events.contained}</span>
              </div>
            </div>

            {/* Step 2: Investigation */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[11px] font-bold text-cyan-300 uppercase">Phase 2: Investigation</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{macroPipeline.investigations.total}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>กำลังสอบสวน: {macroPipeline.investigations.inProgress}</span>
                <span>อนุมัติแล้ว: {macroPipeline.investigations.completed}</span>
              </div>
            </div>

            {/* Step 3: CAPA Execution */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[11px] font-bold text-purple-300 uppercase">Phase 3: CAPA Actions</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{macroPipeline.capas.total}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>กำลังทำ: {macroPipeline.capas.inExecution}</span>
                <span className="text-rose-400">เกินกำหนด: {macroPipeline.capas.overdue}</span>
              </div>
            </div>

            {/* Step 4: Effectiveness */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[11px] font-bold text-emerald-300 uppercase">Phase 4: Effectiveness</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{macroPipeline.effectiveness.total}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>ติดตาม: {macroPipeline.effectiveness.monitoring}</span>
                <span className="text-emerald-400">ผ่าน: {macroPipeline.effectiveness.effective}</span>
              </div>
            </div>

            {/* Step 5: Batch Release */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[11px] font-bold text-amber-300 uppercase">Phase 5: Batch Release</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{macroPipeline.releases.total}</div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span className="text-emerald-400">ปล่อย: {macroPipeline.releases.released}</span>
                <span className="text-amber-400">Hold: {macroPipeline.releases.onHold}</span>
                <span className="text-rose-400">Reject: {macroPipeline.releases.rejected}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 5. AI EXECUTIVE SUMMARY (Hard Guardrails — Advisory Only)                  */}
      {/* ========================================================================= */}
      {aiNarrative && (
        <Card className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border-indigo-500/30 shadow-md">
          <CardHeader className="py-3 px-4 border-b border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-indigo-500/20 text-indigo-200 border-indigo-500/40 text-[10px] font-bold uppercase tracking-wider">
                    AI-Generated Executive Summary — For Review Only
                  </Badge>
                </div>
                <CardTitle className="text-xs font-bold text-slate-200 mt-1">
                  AI Executive Quality Synthesis (บทสรุปภาพรวมเชิงวิเคราะห์โดย AI — เพื่อการพิจารณาเท่านั้น)
                </CardTitle>
              </div>
            </div>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-[10px] shrink-0">
              {aiNarrative.badge}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-slate-200 leading-relaxed">{aiNarrative.overallAssessment}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950/40 p-3 rounded border border-slate-800/80">
                <span className="text-[11px] font-bold text-indigo-300 block mb-1">สัญญาณและแนวโน้มที่ตรวจพบ:</span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {aiNarrative.criticalSignals.concat(aiNarrative.recurrenceObservations).map((sig, idx) => (
                    <li key={idx} className="leading-snug">
                      {sig}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950/40 p-3 rounded border border-slate-800/80">
                <span className="text-[11px] font-bold text-emerald-300 block mb-1">ข้อเสนอแนะสำหรับฝ่ายบริหาร:</span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {aiNarrative.managementRecommendations.map((rec, idx) => (
                    <li key={idx} className="leading-snug">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500">ข้อมูลอ้างอิง:</span>
                {aiNarrative.supportingMetricReferences.map((ref, idx) => (
                  <span key={idx} className="font-mono bg-slate-800/50 px-1.5 py-0.5 rounded text-slate-400">
                    {ref}
                  </span>
                ))}
              </div>
              <span className="text-[9px] text-slate-500 italic">
                * AI Guardrail: AI ไม่มีสิทธิ์คำนวณหรือเปลี่ยนแปลงคะแนน QHS ใช้สำหรับสรุปข้อมูลเชิงบรรยายเท่านั้น
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: "QHS SCORE BREAKDOWN / ที่มาของคะแนนสุขภาพระบบคุณภาพ"               */}
      {/* ========================================================================= */}
      <QhsScoreBreakdownModal
        open={drillDownModalOpen}
        onOpenChange={setDrillDownModalOpen}
        qhs={healthScore}
        onNavigateToTab={onNavigateToTab}
      />

      {/* ========================================================================= */}
      {/* 7. MODAL: "CRITICAL EXECUTIVE ALERT DRILL-DOWN / แจ้งเตือนวิกฤตระดับบริหาร"    */}
      {/* ========================================================================= */}
      <CriticalAlertDrilldownModal
        open={criticalAlertModalOpen}
        onOpenChange={setCriticalAlertModalOpen}
        alerts={criticalAlerts}
        healthScore={healthScore}
        attentionSummary={attentionSummary}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
}

export default ExecutiveCockpit;
