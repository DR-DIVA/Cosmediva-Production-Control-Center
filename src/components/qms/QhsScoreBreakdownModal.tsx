'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Lock,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  XCircle,
  FileText,
  Activity,
  History,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QmsQualityHealthScoreModel,
  QmsRiskDomainScore,
  QmsDeductionSourceRecord,
} from '@/types/qms_analytics';

interface QhsScoreBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qhs: QmsQualityHealthScoreModel | null;
  onNavigateToTab?: (tabName: string, filter?: any) => void;
}

export function QhsScoreBreakdownModal({
  open,
  onOpenChange,
  qhs,
  onNavigateToTab,
}: QhsScoreBreakdownModalProps) {
  const [viewPeriod, setViewPeriod] = useState<'CURRENT' | 'PREVIOUS'>('CURRENT');
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({
    DOMAIN_1_CRITICAL: true,
    DOMAIN_2_MAJOR: true,
    DOMAIN_5_BATCH_DISPOSITION: true,
  });

  if (!qhs) return null;

  const toggleDomain = (id: string) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isExcellent = qhs.score >= 90;
  const isControlled = qhs.score >= 75 && qhs.score < 90;
  const isElevated = qhs.score >= 60 && qhs.score < 75;
  const isCritical = qhs.score < 60;

  const bandBgClass = isExcellent
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : isControlled
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    : isElevated
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

  const bandTitleClass = isExcellent
    ? 'text-emerald-400'
    : isControlled
    ? 'text-blue-400'
    : isElevated
    ? 'text-amber-400'
    : 'text-rose-400';

  const handleRecordClick = (record: QmsDeductionSourceRecord) => {
    if (onNavigateToTab) {
      onOpenChange(false);
      onNavigateToTab(record.targetTab, record.filter);
    }
  };

  const currentDomains = qhs.domainList || [];
  const previousDomains = qhs.previousModel?.domainList || [];
  const displayDomains = viewPeriod === 'PREVIOUS' && qhs.hasComparablePreviousPeriod ? previousDomains : currentDomains;
  const activeScore = viewPeriod === 'PREVIOUS' && qhs.hasComparablePreviousPeriod && qhs.previousScore !== null ? qhs.previousScore : qhs.score;
  const activeTotalBounded = viewPeriod === 'PREVIOUS' && qhs.hasComparablePreviousPeriod && qhs.previousModel ? qhs.previousModel.totalBoundedDeductions : qhs.totalBoundedDeductions;
  const activeTotalRaw = viewPeriod === 'PREVIOUS' && qhs.hasComparablePreviousPeriod && qhs.previousModel ? qhs.previousModel.totalRawDeductions : qhs.totalRawDeductions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-slate-100 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert
                  className={`w-5 h-5 ${isCritical ? 'text-rose-400' : 'text-indigo-400'}`}
                />
                <span>QHS Score Breakdown / ที่มาของคะแนนสุขภาพระบบคุณภาพ</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-1">
                QHS V2 100-Point Bounded Model — คำนวณแบบจำกัดเพดานความเสี่ยง 6 หมวด (รวมเพดานสูงสุด 100 คะแนน) พร้อมระบบตรวจสอบความพร้อมของข้อมูลประวัติย้อนหลัง
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={`px-3 py-1 text-xs font-mono font-bold ${bandBgClass}`}
              >
                {qhs.score} / 100 ({qhs.healthBandLabel || (isCritical ? 'CRITICAL ALERT' : qhs.healthBand)})
              </Badge>
              {qhs.hasComparablePreviousPeriod && qhs.trendText && qhs.trendDirection !== 'NOT_AVAILABLE' ? (
                <Badge
                  variant="outline"
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 ${
                    qhs.trendDirection === 'UP'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : qhs.trendDirection === 'DOWN'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {qhs.trendText}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-800/80 text-slate-400 border-slate-700"
                >
                  Trend: N/A
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* 1. STARTING SCORE, DEDUCTIONS, AND TREND CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 my-3">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Starting Score (คะแนนตั้งต้น)
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
              100 คะแนน
            </div>
            <span className="text-[10px] text-slate-500">เกณฑ์มาตรฐานสากลเต็ม 100%</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Bounded Deductions (หักตามเพดาน)
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono mt-0.5">
              -{activeTotalBounded} คะแนน
            </div>
            <span className="text-[10px] text-slate-400">
              รวม 6 หมวด (คะแนนดิบสะสม: {activeTotalRaw ?? 'N/A'})
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              {viewPeriod === 'PREVIOUS' ? 'Previous QHS (งวดเปรียบเทียบ)' : 'Final QHS (คะแนนสุทธิปัจจุบัน)'}
            </span>
            <div
              className={`text-2xl font-black font-mono mt-0.5 ${
                activeScore < 60 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {viewPeriod === 'PREVIOUS' && !qhs.hasComparablePreviousPeriod ? 'N/A' : `${activeScore} / 100`}
            </div>
            <div className="flex flex-col gap-0.5 mt-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Previous Period:</span>
                <span className="font-mono font-bold text-slate-200">
                  {qhs.hasComparablePreviousPeriod && qhs.previousScore !== null
                    ? `${qhs.previousScore} / 100`
                    : 'N/A'}
                </span>
              </div>
              <div className="text-slate-400 truncate">
                {qhs.hasComparablePreviousPeriod && qhs.scoreDelta !== null
                  ? `Delta: ${qhs.scoreDelta >= 0 ? '+' : ''}${qhs.scoreDelta} (${qhs.trendText})`
                  : 'Trend: Insufficient comparable historical data'}
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded-lg border ${
              isCritical
                ? 'bg-rose-950/20 border-rose-800/40'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-400 block">
              Health Band (ระดับสุขภาพ)
            </span>
            <div className={`text-base font-bold font-mono mt-0.5 ${bandTitleClass}`}>
              {qhs.healthBandLabel || (isCritical ? 'CRITICAL ALERT' : qhs.healthBand)}
            </div>
            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
              {qhs.healthBandDescription}
            </span>
          </div>
        </div>

        {/* 2. PERIOD VIEW TOGGLE: CURRENT vs PREVIOUS BREAKDOWN */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 my-2 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={viewPeriod === 'CURRENT' ? 'default' : 'outline'}
              onClick={() => setViewPeriod('CURRENT')}
              className={`h-7 text-xs font-semibold ${
                viewPeriod === 'CURRENT'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              งวดปัจจุบัน (Current: {qhs.score} / 100)
            </Button>
            <Button
              size="sm"
              variant={viewPeriod === 'PREVIOUS' ? 'default' : 'outline'}
              onClick={() => setViewPeriod('PREVIOUS')}
              className={`h-7 text-xs font-semibold flex items-center gap-1.5 ${
                viewPeriod === 'PREVIOUS'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>
                View Previous Period Breakdown (งวดก่อนหน้า:{' '}
                {qhs.hasComparablePreviousPeriod && qhs.previousScore !== null
                  ? `${qhs.previousScore} / 100`
                  : 'N/A'}
                )
              </span>
            </Button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {viewPeriod === 'CURRENT' ? (
              <span>กำลังแสดงรายละเอียด 6 หมวดความเสี่ยง: <strong className="text-white">งวดปัจจุบัน</strong></span>
            ) : (
              <span>กำลังแสดงรายละเอียด 6 หมวดความเสี่ยง: <strong className="text-indigo-300">งวดก่อนหน้า</strong></span>
            )}
          </div>
        </div>

        {/* 3. INSUFFICIENT HISTORICAL DATA NOTICE (IF PREVIOUS VIEW SELECTED BUT UNAVAILABLE) */}
        {viewPeriod === 'PREVIOUS' && !qhs.hasComparablePreviousPeriod ? (
          <div className="bg-slate-950/90 border border-amber-900/40 rounded-lg p-6 text-center my-3 space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Info className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Previous Period: N/A</h4>
            <div className="inline-block px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs font-semibold">
              Trend: Insufficient comparable historical data (ไม่มีข้อมูลประวัติย้อนหลังที่เทียบเคียงได้)
            </div>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed pt-1">
              เนื่องจากข้อมูลระบบบันทึกคุณภาพเพิ่งเริ่มต้นในรอบเวลาปัจจุบัน ทำให้ไม่มีฐานข้อมูลย้อนหลัง 30 วันที่บันทึกไว้ล่วงหน้า ระบบ CosmeFlow Assurance ปฏิบัติตามมาตรฐานธรรมาภิบาลข้อมูลอย่างเคร่งครัด โดยจะ<strong>ไม่นำคะแนน 100/100 มาใช้เป็นค่าสมมติ (Fallback)</strong> และไม่แสดงลูกศรแนวโน้มที่คลาดเคลื่อน
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewPeriod('CURRENT')}
              className="mt-3 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
            >
              ← กลับสู่การแสดงผลการประเมินงวดปัจจุบัน (Back to Current Period)
            </Button>
          </div>
        ) : (
          /* 4. THE 6 BOUNDED RISK DOMAINS BREAKDOWN */
          <div className="space-y-2 my-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                DOMAIN BREAKDOWN — สรุปคะแนนความเสี่ยงแยกตาม 6 หมวด (เพดานรวม 100 คะแนน)
              </h4>
              <span className="text-[11px] text-slate-400">
                คลิกที่แถวเพื่อขยายดูเอกสารต้นทาง (Drill-down)
              </span>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800/60">
              {displayDomains.length > 0 ? (
                displayDomains.map((dom) => {
                  const isExpanded = expandedDomains[dom.domainId] ?? false;
                  const isCapped = dom.rawPoints > dom.maxCap;
                  const hasDeduction = dom.boundedDeduction > 0;
                  const capPct = (dom.boundedDeduction / dom.maxCap) * 100;

                  return (
                    <div
                      key={dom.domainId}
                      className="bg-slate-950/40 hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Domain Header Row */}
                      <div
                        onClick={() => toggleDomain(dom.domainId)}
                        className="p-3 flex items-start sm:items-center justify-between gap-2 cursor-pointer select-none"
                      >
                        <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                          <button className="text-slate-400 hover:text-white mt-0.5 sm:mt-0 p-0.5 shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {dom.order}. {dom.titleEn}
                              </span>
                              <span className="text-xs text-slate-400">({dom.titleTh})</span>
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 bg-slate-800/80 text-indigo-300 border-slate-700"
                              >
                                {dom.timeWindowDescription}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {dom.calculationRule}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-right ml-2">
                          <div className="text-xs text-slate-300">
                            <span className="text-slate-400 text-[10px] block">
                              รายการที่ตรวจพบ
                            </span>
                            <span className="font-mono font-bold">
                              {dom.sourceRecordCount} รายการ
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 min-w-[70px]">
                            <span className="text-slate-400 text-[10px] block">
                              คะแนนดิบสะสม
                            </span>
                            <span
                              className={`font-mono text-xs ${
                                isCapped ? 'text-amber-400 font-bold' : 'text-slate-400'
                              }`}
                            >
                              {dom.rawPoints} pts {isCapped && '(เกินเพดาน)'}
                            </span>
                          </div>

                          <div className="text-right min-w-[90px]">
                            <span className="text-slate-400 text-[10px] block">
                              หักคะแนนสุทธิ (Cap)
                            </span>
                            <span
                              className={`font-mono font-black text-sm ${
                                hasDeduction ? 'text-rose-400' : 'text-slate-500'
                              }`}
                            >
                              {dom.boundedDeduction} / {dom.maxCap} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar showing consumed cap */}
                      <div className="px-3 pb-2 pt-0">
                        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-1 rounded-full ${
                              capPct >= 100
                                ? 'bg-rose-500'
                                : capPct > 50
                                ? 'bg-amber-500'
                                : capPct > 0
                                ? 'bg-indigo-500'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${Math.min(100, capPct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Drill-down Detail: Sub-items & Source Records */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-2 bg-slate-900/60 border-t border-slate-800/40 space-y-2.5">
                          {/* Sub-items list */}
                          {dom.subItems && dom.subItems.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                เกณฑ์การหักคะแนนย่อยในหมวดนี้:
                              </span>
                              <div className="grid grid-cols-1 gap-1.5">
                                {dom.subItems.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex items-center justify-between text-xs bg-slate-950/50 p-2 rounded border border-slate-800/80"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-slate-300 font-medium truncate">
                                        {sub.labelTh}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] py-0 px-1 border-slate-700 text-slate-400"
                                      >
                                        {sub.timeWindow}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                                      <span className="text-slate-400">
                                        {sub.count} รายการ × {sub.weight} =
                                      </span>
                                      <span
                                        className={
                                          sub.rawPoints > 0
                                            ? 'text-rose-400 font-bold'
                                            : 'text-slate-500'
                                        }
                                      >
                                        -{sub.rawPoints} pts
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Source records chips */}
                          {dom.sourceRecords && dom.sourceRecords.length > 0 ? (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                เอกสารต้นทางที่ถูกหักคะแนน ({dom.sourceRecords.length} รายการ):
                              </span>
                              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                {dom.sourceRecords.map((rec, rIdx) => (
                                  <button
                                    key={rIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRecordClick(rec);
                                    }}
                                    className="group inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-indigo-950/60 border border-slate-700 hover:border-indigo-500/50 text-[11px] text-slate-200 hover:text-indigo-200 transition-all font-mono"
                                    title={rec.title || rec.recordNo}
                                  >
                                    <span>{rec.recordNo}</span>
                                    {rec.title && (
                                      <span className="text-slate-400 group-hover:text-indigo-300 text-[10px] font-sans truncate max-w-[160px]">
                                        • {rec.title}
                                      </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-300 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic py-1">
                              ✓ ไม่พบรายการบกพร่องในหมวดนี้ (Zero Risk Points Deducted)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  ไม่มีข้อมูลหมวดความเสี่ยง
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. DETERMINISTIC RECONCILIATION SUMMARY BOX */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 my-2.5">
          <div className="text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>สูตรการคำนวณและข้อสรุป (Deterministic Mathematical Reconciliation)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              QHS V2 Bounded Model
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">
                1. Bounded Domain Formula ({viewPeriod === 'PREVIOUS' ? 'Previous Period' : 'Current Period'})
              </span>
              <div className="mt-1 text-xs">
                QHS = 100 - Sum(Bounded Domain Deductions)
              </div>
              <div className="mt-1 text-slate-400 text-[11px]">
                = 100 - ({displayDomains.map((d) => d.boundedDeduction).join(' + ')})
              </div>
              <div className="mt-1 font-bold text-emerald-400">
                = 100 - {activeTotalBounded} = {activeScore} / 100
              </div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">
                2. Operational Trend & Comparable Period
              </span>
              <div className="mt-1 text-xs">
                Current: <span className="font-bold text-white">{qhs.score} / 100</span> | Previous:{' '}
                <span className="font-bold text-slate-300">
                  {qhs.hasComparablePreviousPeriod && qhs.previousScore !== null ? `${qhs.previousScore} / 100` : 'N/A'}
                </span>
              </div>
              <div className="mt-1 text-xs font-bold">
                {qhs.hasComparablePreviousPeriod && qhs.scoreDelta !== null ? (
                  <span className={qhs.scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    Delta: {qhs.trendText}
                  </span>
                ) : (
                  <span className="text-amber-400">
                    Trend: Insufficient comparable historical data
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                คะแนนดิบสะสมก่อนเพดาน: {activeTotalRaw} คะแนน (Raw Score: {100 - activeTotalRaw})
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            * เพดานการหักคะแนนสูงสุดทั้ง 6 หมวด รวมกันเท่ากับ 100 คะแนนพอดี ทำให้ QHS อยู่ในช่วง 0–100 คะแนนเสมอโดยไม่เกิดการอิ่มตัวที่ศูนย์ และไม่นำค่าสมมติ 100/100 มาใช้เมื่อข้อมูลประวัติย้อนหลังไม่เพียงพอ
          </p>
        </div>

        {/* 6. TOP DRIVERS REQUIRING ATTENTION */}
        {viewPeriod === 'CURRENT' && qhs.topDrivers && qhs.topDrivers.length > 0 && (
          <div className="border border-amber-900/40 bg-amber-950/10 rounded-lg p-3 my-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Top Drivers Requiring Attention (ปัจจัยหลักที่กระทบคะแนน เรียงตามผลกระทบสุทธิ)
              </span>
              <span className="text-[10px] text-slate-400">
                Deterministic Impact Ranking
              </span>
            </div>

            <div className="space-y-1.5">
              {qhs.topDrivers.map((driver) => (
                <div
                  key={driver.rank}
                  className="bg-slate-900/80 p-2 rounded border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {driver.rank}
                    </span>
                    <span className="font-semibold text-white truncate">{driver.title}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
                      ({driver.titleTh})
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] py-0 px-1 border-slate-700 text-slate-400 shrink-0"
                    >
                      {driver.timeWindow}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 font-mono text-[11px]">
                      ตรวจพบ {driver.count} รายการ
                    </span>
                    <span className="text-rose-400 font-mono font-bold">
                      -{driver.impactPoints} คะแนน
                    </span>
                    {onNavigateToTab && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onOpenChange(false);
                          onNavigateToTab(driver.targetTab, driver.filter);
                        }}
                        className="h-6 text-[10px] px-2 py-0 border-indigo-600/40 text-indigo-300 hover:bg-indigo-950/40"
                      >
                        เข้าสู่รายการ
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. HEALTH BAND SCALE REFERENCE */}
        <div className="border border-slate-800 rounded-lg p-2.5 bg-slate-950/40 my-2">
          <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
            Health Band Reference (เกณฑ์ระดับสุขภาพระบบคุณภาพ):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div
              className={`p-2 rounded border ${
                isExcellent
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-slate-800 bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="font-bold text-emerald-400">90 – 100</div>
              <div className="text-[10px] text-slate-300 font-medium">EXCELLENT</div>
              <div className="text-[9px] text-slate-500">ดีเยี่ยม สอดคล้อง GMP</div>
            </div>

            <div
              className={`p-2 rounded border ${
                isControlled
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-slate-800 bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="font-bold text-blue-400">75 – 89</div>
              <div className="text-[10px] text-slate-300 font-medium">CONTROLLED</div>
              <div className="text-[9px] text-slate-500">ควบคุมได้ดี มีงานรอง</div>
            </div>

            <div
              className={`p-2 rounded border ${
                isElevated
                  ? 'border-amber-500 bg-amber-950/30'
                  : 'border-slate-800 bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="font-bold text-amber-400">60 – 74</div>
              <div className="text-[10px] text-slate-300 font-medium">ELEVATED RISK</div>
              <div className="text-[9px] text-slate-500">ความเสี่ยงเพิ่มขึ้น เฝ้าระวัง</div>
            </div>

            <div
              className={`p-2 rounded border ${
                isCritical
                  ? 'border-rose-500 bg-rose-950/30'
                  : 'border-slate-800 bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="font-bold text-rose-400">0 – 59</div>
              <div className="text-[10px] text-rose-300 font-medium">CRITICAL ALERT</div>
              <div className="text-[9px] text-rose-400/80">วิกฤต ต้องสั่งการทันที</div>
            </div>
          </div>
        </div>

        {/* 8. MODAL FOOTER WITH MANDATORY AI GUARDRAIL LABEL */}
        <DialogFooter className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 mr-auto flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-indigo-300 font-semibold">
              AI-Generated Executive Summary — For Review Only:
            </span>
            <span className="text-slate-400">
              AI เป็นเพียงผู้ช่วยวิเคราะห์เชิงบรรยาย ไม่มีสิทธิ์คำนวณ ปรับปรุง หรือแทรกแซงคะแนน QHS ใดๆ ทั้งสิ้น
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs shrink-0"
          >
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QhsScoreBreakdownModal;
