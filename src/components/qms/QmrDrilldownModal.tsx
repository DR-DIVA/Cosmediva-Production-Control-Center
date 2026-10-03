'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Database,
  Clock,
  Filter,
  Info,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  QmsQmrDrilldownPopulation,
  QmsQmrDrilldownRecord,
} from '@/types/qms_analytics';

interface QmrDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  population: QmsQmrDrilldownPopulation | null;
  allPopulations?: QmsQmrDrilldownPopulation[];
  sectionCode?: string;
  sectionTitle?: string;
  isoClause?: string;
  onNavigateToTab?: (tabName: string, filter?: any) => void;
}

export function QmrDrilldownModal({
  open,
  onOpenChange,
  population: initialPopulation,
  allPopulations,
  sectionCode,
  sectionTitle,
  isoClause,
  onNavigateToTab,
}: QmrDrilldownModalProps) {
  const [activePopulation, setActivePopulation] = useState<QmsQmrDrilldownPopulation | null>(initialPopulation);
  const [history, setHistory] = useState<QmsQmrDrilldownPopulation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setActivePopulation(initialPopulation);
    setHistory([]);
    setSearchTerm('');
  }, [initialPopulation, open]);

  const population = activePopulation || initialPopulation;
  const records = population?.records || [];

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const query = searchTerm.toLowerCase();
    return records.filter((r) => {
      const matchNo = r.recordNo.toLowerCase().includes(query);
      const matchTitle = r.title.toLowerCase().includes(query);
      const matchStatus = r.status.toLowerCase().includes(query);
      const matchSeverity = r.severity?.toLowerCase().includes(query);
      const matchDept = r.departmentName?.toLowerCase().includes(query);
      const matchProd = r.productOrLot?.toLowerCase().includes(query);
      const matchExtra = r.extraInfo?.toLowerCase().includes(query);
      return matchNo || matchTitle || matchStatus || matchSeverity || matchDept || matchProd || matchExtra;
    });
  }, [records, searchTerm]);

  const handleDrillIntoChild = (childKey: string) => {
    if (!allPopulations || !population) return;
    const target = allPopulations.find((p) => p.metricKey === childKey);
    if (target) {
      setHistory((prev) => [...prev, population]);
      setActivePopulation(target);
      setSearchTerm('');
    }
  };

  const handleGoBack = () => {
    if (history.length === 0) return;
    const nextHistory = [...history];
    const prev = nextHistory.pop();
    setHistory(nextHistory);
    setActivePopulation(prev || initialPopulation);
    setSearchTerm('');
  };

  const handleOpenSourceRecord = (record: QmsQmrDrilldownRecord) => {
    if (onNavigateToTab) {
      onOpenChange(false);
      onNavigateToTab(record.targetTab, record.filter);
    }
  };

  if (!population) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {sectionCode && (
                  <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 font-mono text-xs">
                    {sectionCode}
                  </Badge>
                )}
                {isoClause && (
                  <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                    {isoClause}
                  </Badge>
                )}
                <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-800 text-[10px]">
                  CONNECTED / LIVE DATA
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                {population.metricLabel}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                การตรวจสอบความสอดคล้องและการสืบย้อนข้อมูลต้นทาง (Source Traceability & Reconciliation)
              </DialogDescription>
            </div>

            {/* Reconciliation Control Banner */}
            <div className="shrink-0 flex items-center">
              {population.isReconciled ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    ✓ RECONCILED ({population.totalCount} = {records.length})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-700/60 text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>
                    ⚠️ RECONCILIATION ERROR (Diff: {population.reconciliationDiff})
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Breadcrumb Navigation when drilled into child population */}
        {history.length > 0 && (
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← ย้อนกลับไป: {history[history.length - 1].metricLabel}</span>
            </button>
            <span className="text-[11px] text-slate-500 font-mono">
              ระดับการสืบย้อน: ลำดับที่ {history.length + 1}
            </span>
          </div>
        )}

        {/* Calculation Population & Rules Metadata Strip */}
        <div className="bg-slate-950/90 p-4 border-b border-slate-800 text-xs shrink-0 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">กรอบเวลาการประเมิน:</span>
              <span className="font-semibold text-white mt-0.5 block">{population.reportingPeriod}</span>
            </div>
            <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ลักษณะข้อมูล (Time Window):</span>
              <Badge
                variant="outline"
                className={
                  population.timeWindowType === 'CURRENT_ACTIVE_STATE'
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800 text-[10px] mt-0.5'
                    : 'bg-indigo-950/40 text-indigo-300 border-indigo-800 text-[10px] mt-0.5'
                }
              >
                {population.timeWindowType === 'CURRENT_ACTIVE_STATE'
                  ? 'CURRENT ACTIVE STATE'
                  : 'PERIOD METRIC'}
              </Badge>
            </div>
            <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ตารางแหล่งข้อมูลต้นทาง:</span>
              <span className="font-mono text-indigo-300 mt-0.5 block text-[11px] truncate">
                {population.dataSource}
              </span>
            </div>
            <div className="bg-slate-900/70 p-2.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">จำนวนรายการที่นับได้จริง:</span>
              <span className="font-mono font-bold text-white mt-0.5 block text-sm">
                {records.length}{' '}
                {population.denominator !== undefined && (
                  <span className="text-xs text-slate-400 font-normal">
                    / {population.denominator} (
                    {population.denominator > 0
                      ? (((population.numerator ?? records.length) / population.denominator) * 100).toFixed(1)
                      : '0.0'}
                    %)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Inclusion & Exclusion Rules */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-800/60">
            <div>
              <span className="text-slate-300 font-semibold">เกณฑ์การนับ (Inclusion): </span>
              <span>{population.inclusionRule}</span>
            </div>
            {population.exclusionRule && (
              <div>
                <span className="text-amber-300 font-semibold">เกณฑ์การคัดออก (Exclusion): </span>
                <span>{population.exclusionRule}</span>
              </div>
            )}
          </div>

          {/* Reconciliation Note if present */}
          {population.reconciliationNote && (
            <div className="bg-indigo-950/30 border border-indigo-800/40 p-2 rounded text-[11px] text-indigo-200 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span>{population.reconciliationNote}</span>
            </div>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 shrink-0 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่, หัวข้อ, แผนก, สินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400">
            แสดง <strong className="text-white font-mono">{filteredRecords.length}</strong> จาก {records.length} รายการ
          </span>
        </div>

        {/* Scrollable Records Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {records.length === 0
                ? 'ไม่พบบันทึกข้อมูลต้นทางที่เข้าเกณฑ์ในรอบเวลาที่ประเมิน'
                : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const hasChild = !!rec.childPopulationKey && allPopulations?.some((p) => p.metricKey === rec.childPopulationKey);
              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasChild ? (
                        <span
                          onClick={() => handleDrillIntoChild(rec.childPopulationKey!)}
                          className="font-mono text-indigo-300 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/80 cursor-pointer hover:bg-indigo-900/60 hover:underline flex items-center gap-1"
                        >
                          {rec.recordNo}
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      ) : (
                        <span
                          onClick={() => handleOpenSourceRecord(rec)}
                          className="font-mono text-indigo-300 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/80 cursor-pointer hover:underline flex items-center gap-1"
                        >
                          {rec.recordNo}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}

                      {rec.severity && (
                        <Badge
                          className={
                            rec.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border-rose-800 text-[10px]'
                              : rec.severity === 'MAJOR'
                              ? 'bg-amber-950 text-amber-300 border-amber-800 text-[10px]'
                              : 'bg-slate-800 text-slate-300 border-slate-700 text-[10px]'
                          }
                        >
                          {rec.severity}
                        </Badge>
                      )}

                      <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                        {rec.status}
                      </Badge>

                      {rec.departmentName && (
                        <span className="text-[11px] text-slate-400">
                          {rec.departmentName}
                        </span>
                      )}

                      {rec.productOrLot && (
                        <span className="text-[11px] font-mono text-emerald-400/90">
                          {rec.productOrLot}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-white">{rec.title}</div>

                    {rec.extraInfo && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        {rec.extraInfo}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-end justify-between gap-1.5">
                    <span className="text-[10px] text-slate-500">
                      {rec.date ? new Date(rec.date).toLocaleDateString('th-TH') : '-'}
                    </span>
                    {hasChild ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleDrillIntoChild(rec.childPopulationKey!)}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1 font-semibold shadow-sm"
                      >
                        ดูบันทึกต้นทาง ({rec.childCount ?? 'ดูรายการ'})
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenSourceRecord(rec)}
                        className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-1 font-medium"
                      >
                        เปิดดูบันทึกต้นทาง ({rec.recordNo})
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>✓ Zero Fabrication: อ่านโดยตรงจากฐานข้อมูล Phase 1–5 ที่ถูกแช่แข็ง (Frozen Source Ledger)</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          >
            ปิด (Close)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QmrDrilldownModal;
