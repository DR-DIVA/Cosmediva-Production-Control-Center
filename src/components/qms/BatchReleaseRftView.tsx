'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  XCircle,
  Clock,
  Layers,
  BarChart3,
  FileCheck,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QmsBatchReleaseAnalyticsResponse } from '@/types/qms_analytics';
import { FirstPassReleaseBreakdownModal } from './FirstPassReleaseBreakdownModal';

interface BatchReleaseRftViewProps {
  data: QmsBatchReleaseAnalyticsResponse;
  onNavigateToTab: (tabName: string, filter?: any) => void;
}

export function BatchReleaseRftView({ data, onNavigateToTab }: BatchReleaseRftViewProps) {
  const [fprModalOpen, setFprModalOpen] = useState(false);

  const {
    firstPassRelease,
    statusDistribution,
    leadTime,
    twelveGatePareto,
    exemptionStats,
    dispositionHistorySummary,
  } = data;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP CARDS: FIRST-PASS RELEASE, STATUS COUNTS, LEAD TIME                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: First-Pass Release Rate (Clickable Drill-Down) */}
        <Card
          onClick={() => setFprModalOpen(true)}
          className="bg-slate-900/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 cursor-pointer transition-all duration-200 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 pointer-events-none transition-all" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="group-hover:text-slate-200 transition-colors font-medium">First-Pass Release Rate (RFT)</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="border-emerald-800/60 bg-emerald-950/40 text-emerald-400 text-[10px] py-0 px-1.5 flex items-center gap-1">
                  <ExternalLink className="w-2.5 h-2.5" />
                  Drill-Down
                </Badge>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-extrabold font-mono ${firstPassRelease.ratePct >= 90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {firstPassRelease.ratePct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({firstPassRelease.numerator} / {firstPassRelease.denominator} ล็อตตัดสินผล)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
              <span>เป้าหมายสากล: &ge; 90.0%</span>
              <span className="text-amber-400 font-mono">
                Excluded: {firstPassRelease.excludedBatchesCount || 0} ล็อต
              </span>
            </div>
            <div className="text-[10px] text-emerald-400/80 group-hover:text-emerald-300 mt-1.5 flex items-center gap-1 transition-colors">
              <span>คลิกดูแจกแจงความโปร่งใสและสูตรคำนวณ</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Quarantined & On Hold */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Quarantine & QA Hold</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-amber-400 font-mono">
                {statusDistribution.onHold}
              </span>
              <span className="text-xs text-slate-400">รุ่นผลิตกักกัน</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              รอการตรวจปล่อย (Ready): {statusDistribution.readyForReview} ล็อต
            </div>
          </CardContent>
        </Card>

        {/* Card 3: QA Rejected Batches */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>QA Rejected Batches</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-rose-400 font-mono">
                {statusDistribution.rejected}
              </span>
              <span className="text-xs text-slate-400">รุ่นผลิตสั่งทำลาย/คืน</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              ปล่อยผ่านสำเร็จ: {statusDistribution.released} ล็อต
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Release Lead Time */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Release Cycle Time</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                {leadTime.avgReleaseDays}
              </span>
              <span className="text-xs text-slate-400">วัน (จาก Bulk ถึง QA Released)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              ระยะเวลากักกันเฉลี่ย: {leadTime.avgQuarantineDays} วัน
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 2. 12 RELEASE GATES PARETO TABLE & CHART                                   */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/70 border-slate-800">
        <CardHeader className="py-3 px-4 border-b border-slate-800/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              การประเมิน 12 Release Gates (Gate Performance & Bottleneck Analysis)
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              ตรวจสอบเกตที่พบปัญหาบ่อยที่สุด เพื่อขจัดคอขวดและเพิ่มอัตรา First-Pass Release
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('batch_release')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1"
          >
            เปิด Batch Release Queue
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3 w-16 text-center">เกตที่</th>
                  <th className="p-3">ชื่อเกต (Gate Description)</th>
                  <th className="p-3 text-center">ผ่าน (Passed)</th>
                  <th className="p-3 text-center">ยกเว้น (N/A)</th>
                  <th className="p-3 text-center">รอดำเนินการ (Pending)</th>
                  <th className="p-3 text-center">ไม่ผ่าน (Failed)</th>
                  <th className="p-3 text-right">อัตราการติดเกต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {twelveGatePareto.map((gate) => (
                  <tr key={gate.gateNumber} className="hover:bg-slate-800/30">
                    <td className="p-3 text-center font-mono font-bold text-slate-400">
                      #{gate.gateNumber}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">
                        {gate.gateTitleTh} <span className="text-[11px] text-slate-400">({gate.gateTitleEn})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{gate.gateCode}</div>
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-400 font-bold">{gate.passedCount}</td>
                    <td className="p-3 text-center font-mono text-slate-400">{gate.naCount}</td>
                    <td className="p-3 text-center font-mono text-amber-400 font-semibold">{gate.pendingCount}</td>
                    <td className="p-3 text-center font-mono text-rose-400 font-bold">{gate.failedCount}</td>
                    <td className="p-3 text-right font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          gate.failureRatePct === 0
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50'
                            : gate.failureRatePct > 20
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-800/50'
                            : 'bg-amber-950/40 text-amber-400 border border-amber-800/50'
                        }`}
                      >
                        {gate.failureRatePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 3. ISO 29621 ANHYDROUS MICROBIOLOGICAL EXEMPTION AUDIT BOX                 */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/70 border-slate-800">
        <CardHeader className="py-3 px-4 border-b border-slate-800/60">
          <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            การควบคุมข้อยกเว้นทางจุลชีววิทยาตามมาตรฐานสากล ISO 29621 (Aw &lt; 0.60)
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-400">
            เกต 7 (Microbiological Testing) อนุญาตให้ประเมินเป็น N/A (EXEMPT) ได้เฉพาะผลิตภัณฑ์ Anhydrous
            ที่มีการบันทึกเหตุผลอ้างอิงทางวิทยาศาสตร์อย่างโปร่งใส ปราศจากการกุตัวเลข
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-slate-950/50 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">การประเมิน N/A รวมทั้งหมด</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">
                {exemptionStats.totalExemptEvaluations} เกต
              </span>
            </div>
            <div className="p-3 rounded bg-slate-950/50 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">ข้อยกเว้น Anhydrous Micro (Gate 7)</span>
              <span className="text-xl font-bold text-indigo-400 font-mono mt-1 block">
                {exemptionStats.anhydrousMicroExemptCount} ล็อต
              </span>
            </div>
            <div className="p-3 rounded bg-slate-950/50 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">สัดส่วนข้อยกเว้นต่อการตรวจปล่อย</span>
              <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                {exemptionStats.exemptionRatePct}%
              </span>
            </div>
          </div>

          {exemptionStats.documentedRationales.length > 0 && (
            <div className="mt-3 border border-slate-800 rounded p-3 bg-slate-950/30">
              <span className="text-xs font-bold text-slate-300 block mb-2">
                ตัวอย่างบันทึกเหตุผลการยกเว้นที่ผ่านการรับรอง (Audited Exemption Records):
              </span>
              <div className="space-y-1.5 text-xs">
                {exemptionStats.documentedRationales.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-300">
                    <span className="font-mono text-emerald-400">
                      {doc.lotNo} ({doc.skuCode})
                    </span>
                    <span className="text-slate-400 text-[11px]">{doc.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down explainability modal */}
      <FirstPassReleaseBreakdownModal
        open={fprModalOpen}
        onOpenChange={setFprModalOpen}
        fprModel={firstPassRelease}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
}

export default BatchReleaseRftView;
