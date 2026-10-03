'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Building2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Info,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  QmsRecurrenceRadarResponse,
  QmsDateRangeFilter,
  QmsConfirmedRecurrenceItem,
  QmsRootCausePatternItem,
  QmsIneffectiveCapaItem,
} from '@/types/qms_analytics';

interface RecurrenceRadarViewProps {
  data: QmsRecurrenceRadarResponse;
  selectedHorizon: QmsDateRangeFilter;
  onHorizonChange: (horizon: QmsDateRangeFilter) => void;
  onNavigateToTab: (tabName: string, filter?: any) => void;
}

export function RecurrenceRadarView({
  data,
  selectedHorizon,
  onHorizonChange,
  onNavigateToTab,
}: RecurrenceRadarViewProps) {
  const confirmedItems: QmsConfirmedRecurrenceItem[] = data.confirmedRecurrence?.items || [];
  const confirmedCount: number = data.confirmedRecurrence?.totalConfirmedCount ?? confirmedItems.length;

  const patternItems: QmsRootCausePatternItem[] = data.rootCausePatterns?.patterns || [];
  const disclaimerText: string =
    data.rootCausePatterns?.disclaimer ||
    'การกระจายตัวของสาเหตุรากเหง้า 6M แสดงความถี่และรูปแบบเชิงระบบ (Systemic Pattern) ไม่ถือเป็นการยืนยันว่าปัญหาเกิดซ้ำ เว้นแต่ได้รับการยืนยันโดย QA และแสดงอยู่ในส่วน Confirmed Recurrence';

  const ineffectiveItems: QmsIneffectiveCapaItem[] = data.ineffectiveCapaSignals?.items || [];
  const ineffectiveCount: number = data.ineffectiveCapaSignals?.totalIneffectiveCount ?? ineffectiveItems.length;

  const [expandedSignals, setExpandedSignals] = useState<boolean>(false);

  const horizons: { value: QmsDateRangeFilter; label: string }[] = [
    { value: '30d', label: '30 วัน (ระยะสั้น)' },
    { value: '90d', label: '90 วัน (Default)' },
    { value: '180d', label: '180 วัน (ครึ่งปี)' },
    { value: '365d', label: '365 วัน (1 ปี)' },
    { value: 'last_10_batches', label: '10 ล็อตล่าสุด' },
    { value: 'last_25_batches', label: '25 ล็อตล่าสุด' },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER & HORIZON SELECTOR                                              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Pattern & Recurrence Radar
            </h3>
            <span className="text-xs text-indigo-300 font-semibold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
              การวิเคราะห์รูปแบบและการเกิดซ้ำ
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            แยกความแตกต่างอย่างเคร่งครัดระหว่าง{' '}
            <span className="text-rose-400 font-medium">ปัญหาเกิดซ้ำที่ QA รับรอง (Confirmed Recurrence)</span>{' '}
            กับ{' '}
            <span className="text-indigo-300 font-medium">รูปแบบความถี่เชิงระบบ (Systemic 6M Patterns)</span>
          </p>
        </div>

        {/* Horizon Pills */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {horizons.map((h) => (
            <button
              key={h.value}
              onClick={() => onHorizonChange(h.value)}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                selectedHorizon === h.value
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40 border border-indigo-500'
                  : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE CORE DIMENSION CARDS                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Section A - Confirmed Recurrence */}
        <Card className="bg-slate-900/80 border-rose-500/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                SECTION A: CONFIRMED RECURRENCE
              </span>
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]">
                QHS DEDUCTED (-5 pts)
              </Badge>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {confirmedCount}{' '}
              <span className="text-xs font-normal text-slate-400">เหตุการณ์</span>
            </div>
            <p className="text-xs text-slate-300">
              ปัญหาเกิดซ้ำที่ได้รับการยืนยันโดย QA Manager (มีบันทึกความสัมพันธ์ใน Phase 1–4)
            </p>
            <div className="text-[11px] text-rose-400/90 font-medium">
              ✓ ส่งผลหักคะแนน QHS Domain 4: 5 / 15 คะแนน
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Section B - Systemic 6M Patterns */}
        <Card className="bg-slate-900/80 border-indigo-500/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                SECTION B: SYSTEMIC 6M PATTERNS
              </span>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                NON-RECURRENCE (0 pts)
              </Badge>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {patternItems.length}{' '}
              <span className="text-xs font-normal text-slate-400">หมวดหมู่สาเหตุ</span>
            </div>
            <p className="text-xs text-slate-300">
              การกระจายตัวของสาเหตุรากเหง้าเชิงระบบ (ความถี่ข้อบกพร่อง ไม่ใช่การเกิดซ้ำ)
            </p>
            <div className="text-[11px] text-emerald-400 font-medium">
              ✓ ไม่หักคะแนน QHS Recurrence ตามข้อกำหนดความถูกต้อง
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Section C - Ineffective CAPA Signals */}
        <Card className="bg-slate-900/80 border-amber-500/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                SECTION C: EFFECTIVENESS SIGNALS
              </span>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                REVIEW REQUIRED
              </Badge>
            </div>
            <div className="text-3xl font-extrabold text-amber-300 font-mono">
              {ineffectiveCount}{' '}
              <span className="text-xs font-normal text-slate-400">แผน CAPA</span>
            </div>
            <p className="text-xs text-slate-300">
              สัญญาณเตือน CAPA ที่ไม่ผ่านเกณฑ์ประสิทธิผล (ต้องทบทวน Re-investigate)
            </p>
            <div className="text-[11px] text-slate-400">
              ✓ สัญญาณเตือนเชิงกระบวนการ ไม่นับเป็น Confirmed Recurrence
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: CONFIRMED RECURRENCE DETAIL                                   */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            SECTION A — CONFIRMED RECURRENCE (ปัญหาเกิดซ้ำที่ได้รับการยืนยันโดย QA)
          </h4>
          <span className="text-xs text-slate-400">
            นับเฉพาะที่ QA บันทึกยืนยันความสัมพันธ์ใน Phase 1–4 Source of Truth
          </span>
        </div>

        {confirmedItems.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800 p-6 text-center">
            <p className="text-xs text-slate-400">
              ไม่พบประวัติปัญหาเกิดซ้ำที่ได้รับการยืนยันโดย QA ในกรอบเวลา {selectedHorizon}
            </p>
          </Card>
        ) : (
          confirmedItems.map((item: QmsConfirmedRecurrenceItem) => (
            <Card
              key={item.id}
              className="bg-slate-900/90 border border-rose-500/50 shadow-md hover:border-rose-400 transition-all"
            >
              <CardContent className="p-5 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/50 font-mono text-xs">
                      {item.eventNo}
                    </Badge>
                    <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px]">
                      {item.severity}
                    </Badge>
                    <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 text-[10px]">
                      หมวด 6M: {item.rootCauseCategory}
                    </Badge>
                    {item.departmentName && (
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                        {item.departmentName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span>ยืนยันโดย:</span>
                    <span className="font-semibold text-slate-200">{item.qaConfirmationSource}</span>
                    <span className="text-slate-500">
                      ({item.eventDate ? new Date(item.eventDate).toLocaleDateString('th-TH') : '-'})
                    </span>
                  </div>
                </div>

                {/* Primary Event Title */}
                <div>
                  <div className="text-xs text-slate-400">เหตุการณ์คุณภาพปัจจุบัน:</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {item.title}
                  </div>
                </div>

                {/* Linked Prior Events (Recurrence Linkage Evidence) */}
                <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      หลักฐานการเกิดซ้ำ (QA-Confirmed Linked Prior Events):
                    </span>
                    <span className="text-[11px] text-slate-400">
                      เชื่อมโยง {item.qaConfirmedRelatedEventNos.length} เหตุการณ์เดิม
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {item.qaConfirmedRelatedEventNos.map((relNo: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-900/60 rounded border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-300 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900">
                            {relNo}
                          </span>
                          <span className="text-slate-200">
                            ค่าความหนืด Bulk Gel Cream หลุดสเปกต่ำกว่ามาตรฐาน (Viscosity OOS)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px]">
                            CRITICAL
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onNavigateToTab('events', { search: relNo })}
                            className="h-6 px-2 text-[11px] text-indigo-300 hover:text-white hover:bg-slate-800"
                          >
                            ดูเหตุการณ์เดิม
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* QA Rationale & QHS Impact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">เหตุผลและคำวินิจฉัยของ QA:</span>
                    <span>{item.rootCauseSummary}</span>
                  </div>
                  <div className="text-xs text-slate-300 bg-rose-950/20 p-2.5 rounded border border-rose-900/40 flex flex-col justify-between">
                    <div>
                      <span className="text-rose-300 font-semibold block mb-0.5">ผลกระทบต่อคะแนน QHS V2:</span>
                      <span>หักคะแนนใน Domain 4 (Recurrence Control) = -5 คะแนน (จากเพดาน 15 คะแนน)</span>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigateToTab('events', { search: item.eventNo })}
                        className="h-7 text-xs border-slate-700 text-slate-200 hover:bg-slate-800 gap-1"
                      >
                        เปิดดูเหตุการณ์ {item.eventNo}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigateToTab('investigations', { search: item.investigationNo })}
                        className="h-7 text-xs border-indigo-700/60 text-indigo-200 hover:bg-indigo-950 gap-1"
                      >
                        เปิดดูผลการสอบสวน {item.investigationNo}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: 6M ROOT CAUSE PATTERN & DISTRIBUTION                          */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              SECTION B — 6M ROOT CAUSE PATTERN & DISTRIBUTION (รูปแบบและการกระจายตัวของสาเหตุรากเหง้า 6M)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              แสดงความถี่และแนวโน้มเชิงระบบของข้อบกพร่องตามอนุกรมวิธาน 6M (Systemic Frequency — ไม่ถือเป็นการเกิดซ้ำ)
            </p>
          </div>
          <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 text-xs">
            {patternItems.reduce((acc: number, item: QmsRootCausePatternItem) => acc + item.count, 0)} ข้อบกพร่องที่สอบสวน
          </Badge>
        </div>

        {/* Mandatory Governance Disclaimer Banner */}
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-200/90 shadow-sm">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 block">ข้อกำหนดความโปร่งใสทางข้อมูล (Mandatory Disclaimer):</span>
            <span>{disclaimerText}</span>
          </div>
        </div>

        {/* 6M Pattern Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {patternItems.map((pat: QmsRootCausePatternItem) => (
            <Card
              key={pat.category}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white tracking-wide">
                      {pat.categoryLabel}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      pat.count >= 50
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800 text-[10px]'
                        : pat.count >= 20
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800 text-[10px]'
                        : 'bg-slate-800 text-slate-300 border-slate-700 text-[10px]'
                    }
                  >
                    ความถี่: {pat.count >= 50 ? 'HIGH' : pat.count >= 20 ? 'MEDIUM' : 'LOW'}
                  </Badge>
                </div>

                <div className="flex items-baseline justify-between border-y border-slate-800/80 py-2">
                  <div>
                    <span className="text-2xl font-extrabold text-white font-mono">{pat.count}</span>
                    <span className="text-xs text-slate-400 ml-1.5">รายการ</span>
                  </div>
                  <span className="text-xs text-indigo-300 font-mono font-semibold">
                    {pat.percentage}% ของที่สอบสวน
                  </span>
                </div>

                {/* Explicit Non-Recurrence Badge & Explanation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">สถานะการเกิดซ้ำ:</span>
                    <Badge className="bg-slate-800 text-emerald-400 border-emerald-900/40 text-[10px]">
                      SYSTEMIC PATTERN (NOT RECURRENCE)
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    คะแนนหักใน QHS: <span className="text-emerald-400 font-mono font-bold">0 คะแนนหักใน QHS</span> (ไม่นับเป็น Recurrence)
                  </div>
                </div>

                {/* Sample Event Numbers */}
                {pat.relatedEventNos && pat.relatedEventNos.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-1">
                    <span className="block mb-1 text-slate-500">ตัวอย่างเลขที่เหตุการณ์:</span>
                    <div className="flex flex-wrap gap-1">
                      {pat.relatedEventNos.map((no: string, idx: number) => (
                        <span
                          key={idx}
                          onClick={() => onNavigateToTab('events', { search: no })}
                          className="font-mono text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer border border-slate-700 flex items-center gap-1"
                        >
                          {no}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateToTab('events', { search: pat.category })}
                  className="w-full mt-2 h-7 text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
                >
                  กรองดูเหตุการณ์ในหมวด {pat.category}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: INEFFECTIVE CAPA WARNING SIGNALS                              */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              SECTION C — INEFFECTIVE CAPA WARNING SIGNALS (สัญญาณแจ้งเตือนประสิทธิผล CAPA)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              สัญญาณเตือนสำหรับ CAPA ที่ประเมินว่าไม่ได้ผล (NOT_EFFECTIVE) ต้องทบทวนสาเหตุรากเหง้าใหม่ (ไม่นับเป็น Confirmed Recurrence อัตโนมัติ)
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpandedSignals(!expandedSignals)}
            className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 gap-1"
          >
            {expandedSignals ? 'ย่อรายการ' : `แสดงทั้งหมด (${ineffectiveCount} รายการ)`}
            {expandedSignals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Explanatory banner */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            ตามหลักธรรมาภิบาลข้อมูล Phase 6: ผลการประเมิน <strong className="text-amber-300">NOT_EFFECTIVE</strong> เป็นสัญญาณเตือนว่ามาตรการแก้ไขเดิมไม่เพียงพอ และต้องกลับไปสอบสวนซ้ำ (Re-investigate) แต่ยังไม่ถือว่าเป็น Confirmed Recurrence เว้นแต่จะเกิดเหตุการณ์ใหม่ที่ QA ยืนยันความสัมพันธ์
          </span>
        </div>

        {/* Signals List */}
        <div className="space-y-2">
          {(expandedSignals ? ineffectiveItems : ineffectiveItems.slice(0, 3)).map((sig: QmsIneffectiveCapaItem) => (
            <Card
              key={sig.planId}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-amber-300 font-bold bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/50">
                      {sig.planNo}
                    </span>
                    <span className="font-mono text-slate-400">{sig.capaNo}</span>
                    <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px]">
                      {sig.finalDecision}
                    </Badge>
                  </div>
                  <div className="font-semibold text-white">{sig.title}</div>
                  <div className="text-slate-300">{sig.qaConclusion}</div>
                </div>

                <div className="shrink-0 flex sm:flex-col items-end justify-between gap-1.5">
                  <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                    0 pts deducted in QHS
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateToTab('capa_effectiveness', { search: sig.planNo })}
                    className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 gap-1"
                  >
                    ดูแผนประสิทธิผล
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RecurrenceRadarView;
