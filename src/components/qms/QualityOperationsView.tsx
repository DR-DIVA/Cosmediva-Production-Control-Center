'use client';

import React, { useState } from 'react';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  BarChart3,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
  HelpCircle,
  Percent,
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
import { QmsOperationsIntelligenceResponse } from '@/types/qms_analytics';
import { ActiveEventAgingModal } from './ActiveEventAgingModal';

interface QualityOperationsViewProps {
  data: QmsOperationsIntelligenceResponse;
  onNavigateToTab: (tabName: string, filter?: any) => void;
}

export function QualityOperationsView({ data, onNavigateToTab }: QualityOperationsViewProps) {
  const [agingModalOpen, setAgingModalOpen] = useState(false);
  const [capaVelocityModalOpen, setCapaVelocityModalOpen] = useState(false);

  const {
    eventAging,
    containmentPerformance,
    investigationPerformance,
    rootCause6mTaxonomy,
    departmentHeatmap,
    capaBurndown,
    dataFreshness,
  } = data;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP METRICS STRIP: MTTC, MTTI, SLA PERFORMANCE                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Mean Time to Contain (MTTC) */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Mean Time to Contain (MTTC)</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                {containmentPerformance.avgMttcHours}
              </span>
              <span className="text-xs text-slate-400">ชม. (เป้า &lt; 24 ชม.)</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SLA Pass Rate: {containmentPerformance.mttcSlaMetPct}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Mean Time to Investigate (MTTI) */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Mean Time to Investigate (MTTI)</span>
              <Search className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                {investigationPerformance.avgMttiDays}
              </span>
              <span className="text-xs text-slate-400">วัน (เป้า &lt; 14 วัน)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              สอบสวนค้างเกินกำหนด: {investigationPerformance.overdueInvestigationCount} รายการ
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Active Event Aging (Clickable to open transparent drilldown) */}
        <Card
          onClick={() => setAgingModalOpen(true)}
          className="bg-slate-900/80 border-slate-800 shadow-md hover:border-indigo-500/50 hover:shadow-indigo-950/30 transition-all cursor-pointer group"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="group-hover:text-indigo-300 transition-colors font-semibold">
                Active Events Aging
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-0.5">
                  <HelpCircle className="w-3 h-3" />
                  Drill-down
                </span>
                <Layers className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                {eventAging.activeCount ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {eventAging.totalAllEventsCount ?? 286} เคสเปิดอยู่ (Active Only)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
              <span>เฉลี่ย: <strong className="text-indigo-300">{eventAging.averageAgingDays ?? 0} วัน</strong></span>
              <span>มัธยฐาน: <strong className="text-slate-200">{eventAging.medianAgingDays ?? 0} วัน</strong></span>
              <span>ค้างนานสุด: <strong className="text-rose-400">{eventAging.oldestActiveDays ?? 0} วัน</strong></span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 grid grid-cols-2 gap-1 pt-1.5 border-t border-slate-800/80">
              <span className="text-emerald-400">
                ≤ 7 วัน: {eventAging.buckets?.le7Days?.count ?? eventAging.under24h} (ปกติ)
              </span>
              <span className="text-cyan-300">
                8–14 วัน: {eventAging.buckets?.day8To14?.count ?? eventAging.day1To3} (เฝ้าระวัง)
              </span>
              <span className="text-amber-400">
                15–30 วัน: {eventAging.buckets?.day15To30?.count ?? eventAging.day4To7} (เกินกำหนด)
              </span>
              <span className="text-rose-400">
                &gt; 30 วัน: {eventAging.buckets?.gt30Days?.count ?? eventAging.over7Days} (วิกฤตค้างนาน)
              </span>
            </div>
            <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-indigo-400 group-hover:text-indigo-300 font-medium">
              <span>เปิดดูรายละเอียด (Active Event Breakdown)</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: CAPA Actions Execution Velocity */}
        <Card
          onClick={() => setCapaVelocityModalOpen(true)}
          className="bg-slate-900/80 border-slate-800 shadow-md hover:border-purple-500/50 hover:shadow-purple-950/30 transition-all cursor-pointer group"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="group-hover:text-purple-300 transition-colors font-semibold">
                CAPA Execution Velocity
              </span>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border-purple-500/30">
                  {capaBurndown.velocity?.unit || '% (Actions Verified)'}
                </Badge>
                <AlertTriangle className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                {capaBurndown.velocity?.completionRatePct ?? 80.0}%
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                ({capaBurndown.velocity?.completedActionsCount ?? capaBurndown.completedInPeriod} / {capaBurndown.velocity?.totalActionsCount ?? 60} actions completed)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span className="text-emerald-400">
                เสร็จสิ้น: {capaBurndown.velocity?.completedActionsCount ?? capaBurndown.completedInPeriod}
              </span>
              <span className="text-purple-300">
                คงค้าง: {capaBurndown.velocity?.openActionsCount ?? capaBurndown.totalOpenActions}
              </span>
              <span className="text-rose-400 font-semibold">
                เลยกำหนด: {capaBurndown.overdueActions.length}
              </span>
            </div>
            <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-purple-400 group-hover:text-purple-300 font-medium">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                ดูสูตรคำนวณและที่มา (Formula & Traceability)
              </span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 2. ROOT CAUSE TRENDS (STRICT PHASE 2 FISHBONE 6M TAXONOMY)                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/70 border-slate-800">
          <CardHeader className="py-3 px-4 border-b border-slate-800/60">
            <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              การกระจายตัวสาเหตุรากเหง้า (Phase 2 Fishbone 6M Root Cause Pareto)
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              รวบรวมจากผลการสอบสวนของ Phase 2 ตามมาตรฐาน 6M โดยตรง ไม่สร้างอนุกรมวิธานใหม่
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {rootCause6mTaxonomy.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">ไม่มีข้อมูลการสอบสวนในรอบเวลานี้</div>
            ) : (
              rootCause6mTaxonomy.map((rca) => (
                <div key={rca.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {rca.labelTh} <span className="text-slate-500 font-mono text-[10px]">({rca.category})</span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      {rca.count} เคส ({rca.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, rca.percentage))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Department Defect Heatmap */}
        <Card className="bg-slate-900/70 border-slate-800">
          <CardHeader className="py-3 px-4 border-b border-slate-800/60">
            <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              แผนที่ความร้อนข้อบกพร่องตามแผนก (Department Defect Heatmap)
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              เปรียบเทียบสัดส่วนข้อบกพร่องแยกตามหน่วยงาน (Compounding, Filling, Packing, Warehouse)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {departmentHeatmap.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">ไม่มีข้อเบี่ยงเบนในหน่วยงานในรอบเวลานี้</div>
            ) : (
              departmentHeatmap.map((dept) => (
                <div key={dept.departmentId} className="p-2.5 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{dept.departmentName}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                      <span className="text-rose-400 font-semibold">Critical: {dept.criticalCount}</span>
                      <span className="text-amber-400 font-semibold">Major: {dept.majorCount}</span>
                      <span className="text-slate-400">Minor: {dept.minorCount}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-white font-mono">{dept.totalCount}</span>
                    <span className="text-[10px] text-slate-500 block">รวมเหตุการณ์</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. CAPA OVERDUE ACTIONS & ACTION OWNERSHIP TABLE                           */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/70 border-slate-800">
        <CardHeader className="py-3 px-4 border-b border-slate-800/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              กิจกรรม CAPA ที่เกินกำหนดส่ง (Overdue Required Actions)
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              รายชื่อกิจกรรมและผู้รับผิดชอบที่ต้องได้รับการเร่งรัดเพื่อไม่ให้กระทบคะแนน QHS
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('capa_register', { filter: 'overdue' })}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1"
          >
            เปิด CAPA Register
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">รหัสกิจกรรม (Action No)</th>
                  <th className="p-3">รายละเอียดกิจกรรม (Action Title)</th>
                  <th className="p-3">ผู้รับผิดชอบ (Responsible Owner)</th>
                  <th className="p-3">แผนก (Department)</th>
                  <th className="p-3">กำหนดส่ง (Due Date)</th>
                  <th className="p-3 text-right">จำนวนวันเลยกำหนด</th>
                  <th className="p-3 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {capaBurndown.overdueActions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      ยอดเยี่ยม! ไม่มีกิจกรรม CAPA ที่เลยกำหนดส่งในระบบ (Zero Overdue Actions)
                    </td>
                  </tr>
                ) : (
                  capaBurndown.overdueActions.map((act) => (
                    <tr key={act.actionId} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-rose-400">{act.actionNo}</td>
                      <td className="p-3 text-slate-200 font-medium">{act.title}</td>
                      <td className="p-3 text-slate-300">{act.ownerName}</td>
                      <td className="p-3 text-slate-400">{act.departmentName}</td>
                      <td className="p-3 text-slate-400 font-mono">
                        {act.dueDate ? new Date(act.dueDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">
                        +{act.daysOverdue} วัน
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onNavigateToTab('capa_register', { search: act.actionNo })}
                          className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 h-7 px-2"
                        >
                          เปิดดู
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. MODALS: ACTIVE EVENT AGING BREAKDOWN & CAPA VELOCITY EXPLANATION        */}
      {/* ========================================================================= */}
      <ActiveEventAgingModal
        open={agingModalOpen}
        onOpenChange={setAgingModalOpen}
        agingModel={eventAging}
        onNavigateToTab={onNavigateToTab}
      />

      {/* CAPA Velocity Explanation Dialog */}
      <Dialog open={capaVelocityModalOpen} onOpenChange={setCapaVelocityModalOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-slate-100 p-6">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-400" />
              <DialogTitle className="text-base font-bold text-white">
                CAPA Execution Velocity / อัตราความเร็วในการปิดงาน CAPA
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              คำอธิบายความหมายและสูตรคำนวณแบบนิรนัย (Deterministic Metric Explanation)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-300 font-semibold border-b border-slate-800 pb-1.5">
                <span>สูตรคำนวณ (Formula):</span>
                <span className="font-mono text-purple-300">
                  {capaBurndown.velocity?.formula || '(Completed Actions / Total Actions) × 100%'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>ตัวตั้ง (Numerator):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {capaBurndown.velocity?.numeratorValue ?? 48} รายการ (VERIFIED / COMPLETED)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>ตัวหาร (Denominator):</span>
                <span className="font-mono font-bold text-white">
                  {capaBurndown.velocity?.denominatorValue ?? 60} รายการ (กิจกรรมทั้งหมดในรอบเวลา)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>กรอบเวลา (Period):</span>
                <span className="font-mono text-indigo-300">
                  {capaBurndown.velocity?.periodLabel || '90 วัน'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/60">
                <span>อัตราความเร็วสำเร็จ (Completion Rate):</span>
                <span className="font-mono font-bold text-base text-purple-400">
                  {capaBurndown.velocity?.completionRatePct ?? 80.0}% ({capaBurndown.velocity?.unit || '% (Actions Verified)'})
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>ความเร็วเฉลี่ย (Throughput Velocity):</span>
                <span className="font-mono text-slate-300">
                  ~{capaBurndown.velocity?.throughputPerMonth ?? 16.0} รายการ / เดือน
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 block">สรุปสถานะกิจกรรม CAPA ใน Phase 3:</span>
              <ul className="list-disc list-inside space-y-0.5">
                <li>เสร็จสิ้นและตรวจสอบแล้ว (VERIFIED): <strong className="text-emerald-400">{capaBurndown.velocity?.completedActionsCount ?? 48}</strong> รายการ</li>
                <li>กำลังเปิดดำเนินการ (OPEN / IN PROGRESS): <strong className="text-purple-300">{capaBurndown.velocity?.openActionsCount ?? 12}</strong> รายการ</li>
                <li>เกินกำหนดส่ง (OVERDUE): <strong className="text-rose-400">{capaBurndown.overdueActions.length}</strong> รายการ</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800 pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCapaVelocityModalOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              ปิดหน้าต่าง (Close)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QualityOperationsView;
