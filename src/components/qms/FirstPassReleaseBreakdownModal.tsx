'use client';

import React, { useState, useMemo } from 'react';
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
  Search,
  Filter,
  ExternalLink,
  Clock,
  Layers,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Package,
  XCircle,
  HelpCircle,
  PauseCircle,
  RefreshCw,
  Info,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import {
  QmsFirstPassReleaseModel,
  QmsFirstPassLotDetail,
  QmsFirstPassStatus,
  QmsReleaseExclusionCategory,
} from '@/types/qms_analytics';

interface FirstPassReleaseBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fprModel: QmsFirstPassReleaseModel | null;
  onNavigateToTab?: (tabName: string, filter?: any) => void;
}

export function FirstPassReleaseBreakdownModal({
  open,
  onOpenChange,
  fprModel,
  onNavigateToTab,
}: FirstPassReleaseBreakdownModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterTab, setSelectedFilterTab] = useState<
    'ALL' | 'COMPLETED' | 'FIRST_PASS' | 'NON_FIRST_PASS' | 'EXCLUDED'
  >('ALL');

  const lots = fprModel?.lots || [];

  // Filter lots based on tab and search
  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      // Tab filter
      if (selectedFilterTab === 'COMPLETED' && !lot.isEligibleDenominator) return false;
      if (selectedFilterTab === 'FIRST_PASS' && lot.firstPassStatus !== 'YES') return false;
      if (selectedFilterTab === 'NON_FIRST_PASS' && lot.firstPassStatus !== 'NO') return false;
      if (selectedFilterTab === 'EXCLUDED' && lot.isEligibleDenominator) return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchLot = lot.lotNo.toLowerCase().includes(query);
        const matchProduct = lot.productName.toLowerCase().includes(query);
        const matchSku = lot.skuCode.toLowerCase().includes(query);
        const matchReason = lot.deterministicReason.toLowerCase().includes(query);
        const matchGates = lot.blockingGates.some((g) =>
          g.reason.toLowerCase().includes(query) || g.gateTitle.toLowerCase().includes(query)
        );
        return matchLot || matchProduct || matchSku || matchReason || matchGates;
      }

      return true;
    });
  }, [lots, selectedFilterTab, searchTerm]);

  const handleOpenLot = (lot: QmsFirstPassLotDetail) => {
    if (onNavigateToTab) {
      onOpenChange(false);
      onNavigateToTab('batch_release', { search: lot.lotNo, releaseId: lot.id });
    }
  };

  const getStatusBadge = (status: QmsFirstPassStatus) => {
    switch (status) {
      case 'YES':
        return (
          <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-800 text-[11px] gap-1 py-0.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ผ่านรอบแรก (YES)
          </Badge>
        );
      case 'NO':
        return (
          <Badge className="bg-rose-950/80 text-rose-300 border-rose-800 text-[11px] gap-1 py-0.5">
            <XCircle className="w-3 h-3 text-rose-400" />
            ไม่ผ่านรอบแรก (NO)
          </Badge>
        );
      case 'NOT_YET_EVALUABLE':
      default:
        return (
          <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[11px] gap-1 py-0.5">
            <Clock className="w-3 h-3 text-slate-400" />
            ยังไม่ประเมิน (Excluded)
          </Badge>
        );
    }
  };

  const getDispositionBadge = (disp: string) => {
    switch (disp) {
      case 'QA_RELEASED':
        return <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-700 text-[10px]">QA Released</Badge>;
      case 'QA_REJECTED':
        return <Badge className="bg-rose-900/60 text-rose-300 border-rose-700 text-[10px]">QA Rejected</Badge>;
      case 'QA_ON_HOLD':
        return <Badge className="bg-amber-900/60 text-amber-300 border-amber-700 text-[10px]">QA On Hold</Badge>;
      case 'BLOCKED':
        return <Badge className="bg-red-950/70 text-red-300 border-red-800 text-[10px]">Blocked</Badge>;
      case 'READY_FOR_QA_REVIEW':
        return <Badge className="bg-blue-900/60 text-blue-300 border-blue-700 text-[10px]">Ready for Review</Badge>;
      default:
        return <Badge className="bg-slate-800 text-slate-400 text-[10px]">{disp}</Badge>;
    }
  };

  if (!fprModel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0 bg-slate-950 text-slate-100 border-slate-800">
        {/* ========================================================================= */}
        {/* 1. DIALOG HEADER                                                          */}
        {/* ========================================================================= */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  First-Pass Release Rate (RFT) Drill-Down & Explainability
                  <Badge variant="outline" className="border-emerald-600/40 text-emerald-400 bg-emerald-950/40 text-[10px]">
                    Zero Second Source of Truth
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  ความโปร่งใสและที่มาของอัตราการตรวจปล่อยผ่านในรอบแรก คำนวณจากบันทึกการตรวจปล่อย Phase 5 จริงโดยไม่มีข้อมูลจำลอง
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ========================================================================= */}
          {/* 2. TOP METRIC SUMMARY CARDS                                               */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: First-Pass Release Rate */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>First-Pass Release Rate (FPR)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold font-mono ${fprModel.ratePct >= 90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fprModel.ratePct.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">
                  ({fprModel.numerator} / {fprModel.denominator} ล็อต)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
                เป้าหมายมาตรฐานสากล: <span className="text-emerald-400 font-semibold">&ge; {fprModel.benchmarkTargetPct.toFixed(1)}%</span>
              </div>
            </div>

            {/* Card 2: Released First-Pass */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ปล่อยผ่านสำเร็จรอบแรก (Numerator)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {fprModel.numerator}
                </span>
                <span className="text-xs text-slate-400">รุ่นการผลิต</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
                ไม่มีข้อบกพร่องวิกฤต / ไม่สั่ง Rework
              </div>
            </div>

            {/* Card 3: Eligible Denominator */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ตัดสินผลสิ้นสุดแล้ว (Denominator)</span>
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-400 font-mono">
                  {fprModel.denominator}
                </span>
                <span className="text-xs text-slate-400">รุ่นการผลิต</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
                QA Released ({fprModel.breakdownSummary.releasedFirstPass + fprModel.breakdownSummary.releasedWithExceptionsOrRework}) + QA Rejected ({fprModel.breakdownSummary.qaRejected})
              </div>
            </div>

            {/* Card 4: Excluded / In-Progress */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>คัดออกจากการคำนวณ (Excluded)</span>
                <PauseCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">
                  {fprModel.excludedBatchesCount}
                </span>
                <span className="text-xs text-slate-400">รุ่นการผลิต</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
                รอตรวจรอบแรก ({fprModel.breakdownSummary.underInitialReview}) | รอผลแล็บ ({fprModel.breakdownSummary.pendingEvidenceOrIncubation}) | On Hold ({fprModel.breakdownSummary.onHoldUnderInvestigation})
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. DETERMINISTIC FORMULA & 0/9 RECONCILIATION BANNER                       */}
          {/* ========================================================================= */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-400 mt-0.5 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  สูตรคำนวณเชิงกำหนด & นิยามมาตรฐานคุณภาพ (Deterministic Quality Engineering Definition)
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-200">
                  <span className="text-slate-400">First-Pass Release Rate (FPR) = </span>
                  <span className="text-emerald-400">จำนวนรุ่นผลิตที่ QA Released ในรอบแรกโดยไม่มีข้อบกพร่องวิกฤต ({fprModel.numerator})</span>
                  <span className="text-slate-400"> ÷ </span>
                  <span className="text-blue-400">จำนวนรุ่นผลิตทั้งหมดที่มีการตัดสินผล QA สิ้นสุดแล้ว ({fprModel.denominator})</span>
                  <span className="text-slate-400"> × 100 = </span>
                  <span className="text-white font-bold">{fprModel.ratePct.toFixed(1)}%</span>
                </div>
                <div className="text-[12px] text-slate-300 leading-relaxed pt-1">
                  <span className="font-semibold text-amber-300">ชี้แจงการกระทบยอด 9 รายการ (Reconciliation of 9 Phase 5 Records): </span>
                  เดิมระบบแสดง <span className="font-mono text-rose-400">0.0% (0/9)</span> เนื่องจากนับรวมล็อตที่ยังอยู่ระหว่างกระบวนการตรวจสอบและรอยืนยันผล (8 ล็อต) เข้าเป็นตัวส่วน ซึ่งขัดต่อหลักการบริหารคุณภาพสากล (In-progress batches are not failures).
                  ระบบ Phase 6 ได้ทำการปรับให้สอดคล้องตามมาตรฐานอย่างสมบูรณ์:
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px] text-slate-300">
                    <li>
                      <span className="text-blue-400 font-semibold">1 ล็อตที่มีการตัดสินผลสิ้นสุด (Eligible Denominator): </span>
                      ล็อต <span className="font-mono text-white">LOT-2026-0057</span> ถูกสั่ง QA Rejected จากปัญหาความหนืดตกสเปก (Gate 6) และส่งพิจารณา Rework (RWK-2026-0005) &rarr; สถานะ First-Pass = <span className="text-rose-400 font-semibold">NO</span>
                    </li>
                    <li>
                      <span className="text-amber-400 font-semibold">8 ล็อตที่อยู่ระหว่างดำเนินการ (Excluded / In-Progress): </span>
                      4 ล็อตอยู่ในคิวรอการตรวจสอบรอบแรก, 3 ล็อตติดเงื่อนไขรอยืนยันผลแล็บ/ข้อเบี่ยงเบน (Incubation / Missing Signature), และ 1 ล็อตอยู่ระหว่างการกักกันสอบสวน (QA Hold) &rarr; สถานะ = <span className="text-slate-400 font-semibold">NOT YET EVALUABLE</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. FILTER TABS & SEARCH BAR                                               */}
          {/* ========================================================================= */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <Button
                size="sm"
                variant={selectedFilterTab === 'ALL' ? 'default' : 'outline'}
                onClick={() => setSelectedFilterTab('ALL')}
                className={`text-xs h-8 ${selectedFilterTab === 'ALL' ? 'bg-slate-100 text-slate-900 font-bold' : 'border-slate-800 text-slate-400'}`}
              >
                ทั้งหมด ({lots.length})
              </Button>
              <Button
                size="sm"
                variant={selectedFilterTab === 'COMPLETED' ? 'default' : 'outline'}
                onClick={() => setSelectedFilterTab('COMPLETED')}
                className={`text-xs h-8 ${selectedFilterTab === 'COMPLETED' ? 'bg-blue-600 text-white font-bold' : 'border-slate-800 text-slate-400'}`}
              >
                ตัดสินผลสิ้นสุด ({fprModel.denominator})
              </Button>
              <Button
                size="sm"
                variant={selectedFilterTab === 'FIRST_PASS' ? 'default' : 'outline'}
                onClick={() => setSelectedFilterTab('FIRST_PASS')}
                className={`text-xs h-8 ${selectedFilterTab === 'FIRST_PASS' ? 'bg-emerald-600 text-white font-bold' : 'border-slate-800 text-slate-400'}`}
              >
                ผ่านรอบแรก ({fprModel.numerator})
              </Button>
              <Button
                size="sm"
                variant={selectedFilterTab === 'NON_FIRST_PASS' ? 'default' : 'outline'}
                onClick={() => setSelectedFilterTab('NON_FIRST_PASS')}
                className={`text-xs h-8 ${selectedFilterTab === 'NON_FIRST_PASS' ? 'bg-rose-600 text-white font-bold' : 'border-slate-800 text-slate-400'}`}
              >
                ไม่ผ่านรอบแรก ({fprModel.breakdownSummary.qaRejected + fprModel.breakdownSummary.releasedWithExceptionsOrRework})
              </Button>
              <Button
                size="sm"
                variant={selectedFilterTab === 'EXCLUDED' ? 'default' : 'outline'}
                onClick={() => setSelectedFilterTab('EXCLUDED')}
                className={`text-xs h-8 ${selectedFilterTab === 'EXCLUDED' ? 'bg-amber-600 text-white font-bold' : 'border-slate-800 text-slate-400'}`}
              >
                อยู่ระหว่างดำเนินการ ({fprModel.excludedBatchesCount})
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหารุ่นผลิต, สินค้า, เกต..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. DRILL-DOWN LOT TABLE                                                   */}
          {/* ========================================================================= */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 shadow-inner">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-32">รหัสรุ่นผลิต</th>
                    <th className="p-3 min-w-[180px]">ผลิตภัณฑ์ & SKU</th>
                    <th className="p-3 w-28 text-center">ผลตัดสิน QA</th>
                    <th className="p-3 w-36 text-center">สถานะ First-Pass</th>
                    <th className="p-3 w-20 text-center">รอบตรวจ</th>
                    <th className="p-3 min-w-[220px]">เกตที่ติดเงื่อนไข / ข้อบกพร่อง</th>
                    <th className="p-3 w-24 text-center">ประวัติ Hold</th>
                    <th className="p-3 w-28 text-center">Rework / Retest</th>
                    <th className="p-3 w-24 text-center">ระยะเวลา</th>
                    <th className="p-3 min-w-[240px]">เหตุผลเชิงกำหนด (Traceability)</th>
                    <th className="p-3 w-24 text-center">การนำทาง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLots.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500">
                        ไม่พบข้อมูลรุ่นการผลิตตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredLots.map((lot) => (
                      <tr
                        key={lot.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Lot Number */}
                        <td className="p-3 font-mono font-bold text-white whitespace-nowrap">
                          <button
                            onClick={() => handleOpenLot(lot)}
                            className="hover:text-emerald-400 hover:underline flex items-center gap-1.5 text-left"
                            title="คลิกเพื่อเปิด Batch Release Cockpit ใน Phase 5"
                          >
                            <span>{lot.lotNo}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500 hover:text-emerald-400 inline" />
                          </button>
                        </td>

                        {/* Product & SKU */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-200 line-clamp-1">{lot.productName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{lot.skuCode}</div>
                        </td>

                        {/* Final QA Disposition */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {getDispositionBadge(lot.finalDisposition)}
                        </td>

                        {/* First-Pass Status */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {getStatusBadge(lot.firstPassStatus)}
                        </td>

                        {/* Release Cycle Count */}
                        <td className="p-3 text-center font-mono text-slate-300">
                          {lot.releaseCycleCount}
                        </td>

                        {/* Blocking Gates / Failure Detail */}
                        <td className="p-3">
                          {lot.blockingGates.length === 0 ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> ผ่านทั้ง 12 เกต
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {lot.blockingGates.map((bg, idx) => (
                                <div key={idx} className="text-[11px] bg-slate-950/80 p-1.5 rounded border border-slate-800">
                                  <div className="flex items-center gap-1 font-semibold text-rose-300">
                                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                    <span>Gate {bg.gateNumber}: {bg.gateTitle}</span>
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-rose-800 text-rose-400 ml-auto">
                                      {bg.status}
                                    </Badge>
                                  </div>
                                  <div className="text-slate-400 text-[10px] mt-0.5 line-clamp-2">
                                    {bg.reason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* QA Hold History */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {lot.qaHoldHistory.hasHold ? (
                            <Badge className="bg-amber-950/80 text-amber-300 border-amber-800 text-[10px] gap-1">
                              <ShieldAlert className="w-3 h-3 text-amber-400" />
                              {lot.qaHoldHistory.holdId || 'มี Hold'}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 text-[11px]">ไม่มี</span>
                          )}
                        </td>

                        {/* Rework / Retest Indicator */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {lot.reworkIndicator.hasRework ? (
                            <Badge className="bg-purple-950/80 text-purple-300 border-purple-800 text-[10px]">
                              {lot.reworkIndicator.protocolNo || 'มี Rework'}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Cycle Time */}
                        <td className="p-3 text-center font-mono whitespace-nowrap text-slate-300 text-[11px]">
                          {lot.releaseCycleTimeDays !== null ? (
                            `${lot.releaseCycleTimeDays} วัน`
                          ) : (
                            <span className="text-slate-500">กำลังตรวจ</span>
                          )}
                        </td>

                        {/* Deterministic Reason */}
                        <td className="p-3 text-slate-300 text-[11px] leading-relaxed">
                          {lot.deterministicReason}
                        </td>

                        {/* Action Link */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenLot(lot)}
                            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 gap-1"
                          >
                            เปิดดู
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. DIALOG FOOTER                                                          */}
        {/* ========================================================================= */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-400">
            แสดง <span className="font-bold text-white font-mono">{filteredLots.length}</span> จากทั้งหมด <span className="font-bold text-white font-mono">{lots.length}</span> รุ่นการผลิตใน Phase 5
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          >
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FirstPassReleaseBreakdownModal;
