"use client";

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Boxes,
  FileText,
  FileCheck2,
  XCircle,
  HelpCircle,
  PauseCircle,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QmsBatchRelease, QmsBatchReleaseStatus } from '@/types/qms';
import { getBatchReleaseQueue } from '@/app/actions/qms_batch_release';
import { toast } from 'sonner';

interface BatchReleaseRegisterProps {
  onSelectRelease: (releaseId: string) => void;
}

export function BatchReleaseRegister({ onSelectRelease }: BatchReleaseRegisterProps) {
  const [loading, setLoading] = useState(true);
  const [releases, setReleases] = useState<QmsBatchRelease[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    ready_for_review: 0,
    waiting_for_result: 0,
    blocked: 0,
    on_hold: 0,
    released: 0,
    rejected: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await getBatchReleaseQueue({
        status: statusFilter,
        search: searchQuery,
      });
      setReleases(res.releases);
      setSummary(res.summary);
    } catch (e: any) {
      console.error(e);
      toast.error('ไม่สามารถโหลดรายการ Batch Release ได้: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQueue();
  };

  const getStatusBadge = (status: QmsBatchReleaseStatus, isBlocked?: boolean, blockingReasons?: any[]) => {
    const hasActiveHold = status === 'QA_ON_HOLD' || (blockingReasons || []).some(
      (b) => b.reason?.toLowerCase().includes('hold') || b.reason?.includes('กักกัน')
    );

    if (hasActiveHold) {
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1">
          <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
          QA ON HOLD (กักกันคุณภาพ)
        </Badge>
      );
    }

    if (isBlocked || status === 'BLOCKED') {
      return (
        <Badge variant="destructive" className="bg-rose-500/20 text-rose-300 border-rose-500/40 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          ⛔ BLOCKED (ถูกระงับ)
        </Badge>
      );
    }
    switch (status) {
      case 'READY_FOR_QA_REVIEW':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            พร้อมให้ QA ทบทวน
          </Badge>
        );
      case 'WAITING_FOR_RESULT':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            รอผลการทดสอบ
          </Badge>
        );
      case 'QA_RELEASED':
        return (
          <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500 flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            อนุมัติปล่อยผ่าน (RELEASED)
          </Badge>
        );
      case 'QA_REJECTED':
        return (
          <Badge className="bg-rose-600/30 text-rose-200 border-rose-500 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            ปฏิเสธรุ่นการผลิต (REJECTED)
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PHASE 5 — BATCH QA RELEASE COCKPIT
              </span>
              <span className="text-xs text-slate-400">
                ISO 22716 Cosmetics GMP & ASEAN Cosmetic Directive
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-emerald-400" />
              การทบทวนและปล่อยผ่านรุ่นการผลิต (Batch QA Review & Release)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              ศูนย์ควบคุมการตรวจปล่อยรุ่นการผลิตเครื่องสำอางตามเกณฑ์ Checklist 12 เกตแบบ Configurable และระบบ Zero-Retyping เชื่อมโยงผลแล็บ QC และข้อเบี่ยงเบน
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchQueue}
              variant="outline"
              size="sm"
              className="border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              รีเฟรชข้อมูล
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('READY_FOR_QA_REVIEW')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'READY_FOR_QA_REVIEW'
              ? 'bg-emerald-950/40 border-emerald-500 shadow-emerald-950/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">พร้อมทบทวน</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.ready_for_review}</div>
          <span className="text-[11px] text-slate-400">Ready for QA</span>
        </div>

        <div
          onClick={() => setStatusFilter('WAITING_FOR_RESULT')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'WAITING_FOR_RESULT'
              ? 'bg-blue-950/40 border-blue-500 shadow-blue-950/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">รอผลตรวจ</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.waiting_for_result}</div>
          <span className="text-[11px] text-slate-400">Waiting Lab QC</span>
        </div>

        <div
          onClick={() => setStatusFilter('BLOCKED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'BLOCKED'
              ? 'bg-rose-950/40 border-rose-500 shadow-rose-950/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400">ถูกระงับ (Blocked)</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.blocked}</div>
          <span className="text-[11px] text-slate-400">Hard Blocked</span>
        </div>

        <div
          onClick={() => setStatusFilter('QA_ON_HOLD')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'QA_ON_HOLD'
              ? 'bg-amber-950/40 border-amber-500 shadow-amber-950/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">QA กักกัน</span>
            <PauseCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.on_hold}</div>
          <span className="text-[11px] text-slate-400">QA On Hold</span>
        </div>

        <div
          onClick={() => setStatusFilter('QA_RELEASED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'QA_RELEASED'
              ? 'bg-emerald-950/50 border-emerald-400 shadow-emerald-950/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">ปล่อยผ่านแล้ว</span>
            <ClipboardCheck className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.released}</div>
          <span className="text-[11px] text-slate-400">Released to WMS</span>
        </div>

        <div
          onClick={() => setStatusFilter('QA_REJECTED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'QA_REJECTED'
              ? 'bg-rose-950/50 border-rose-400 shadow-rose-950/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300">ปฏิเสธรุ่น</span>
            <XCircle className="w-4 h-4 text-rose-300" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{summary.rejected}</div>
          <span className="text-[11px] text-slate-400">Rejected</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <Button
            size="sm"
            variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
            className={statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
            onClick={() => setStatusFilter('ALL')}
          >
            ทั้งหมด ({summary.total})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'READY_FOR_QA_REVIEW' ? 'default' : 'ghost'}
            className={statusFilter === 'READY_FOR_QA_REVIEW' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}
            onClick={() => setStatusFilter('READY_FOR_QA_REVIEW')}
          >
            พร้อมทบทวน ({summary.ready_for_review})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'BLOCKED' ? 'default' : 'ghost'}
            className={statusFilter === 'BLOCKED' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}
            onClick={() => setStatusFilter('BLOCKED')}
          >
            ถูกระงับ ({summary.blocked})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'QA_ON_HOLD' ? 'default' : 'ghost'}
            className={statusFilter === 'QA_ON_HOLD' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}
            onClick={() => setStatusFilter('QA_ON_HOLD')}
          >
            QA กักกัน ({summary.on_hold})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'QA_RELEASED' ? 'default' : 'ghost'}
            className={statusFilter === 'QA_RELEASED' ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'}
            onClick={() => setStatusFilter('QA_RELEASED')}
          >
            ปล่อยผ่าน ({summary.released})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'QA_REJECTED' ? 'default' : 'ghost'}
            className={statusFilter === 'QA_REJECTED' ? 'bg-rose-700 text-white' : 'text-slate-400 hover:text-white'}
            onClick={() => setStatusFilter('QA_REJECTED')}
          >
            ปฏิเสธ ({summary.rejected})
          </Button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              type="text"
              placeholder="ค้นหาเลขที่ Lot, SKU, สินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900/60 border-slate-800 text-sm focus:border-slate-600"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="shrink-0">
            ค้นหา
          </Button>
        </form>
      </div>

      {/* Release Records Table */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Clock className="w-6 h-6 animate-spin text-emerald-400" />
              <span>กำลังโหลดข้อมูลรุ่นการผลิต...</span>
            </div>
          ) : releases.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <span>ไม่พบข้อมูลรุ่นการผลิตตามเงื่อนไขที่ระบุ</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                    <th className="py-3 px-4">เลขที่รุ่น (Lot No.)</th>
                    <th className="py-3 px-4">สินค้า (Product / SKU)</th>
                    <th className="py-3 px-4">ปริมาณการผลิต</th>
                    <th className="py-3 px-4">เทมเพลตการตรวจปล่อย</th>
                    <th className="py-3 px-4 text-center">ความพร้อมของเกต (Gates)</th>
                    <th className="py-3 px-4">สถานะ (Status)</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {releases.map((rel) => {
                    const total = rel.total_gates_count || 12;
                    const passed = rel.passed_gates_count || 0;
                    const na = rel.na_gates_count || 0;
                    const pct = Math.round(((passed + na) / total) * 100);

                    return (
                      <tr
                        key={rel.id}
                        className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                        onClick={() => onSelectRelease(rel.id)}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            {rel.lot_no}
                          </div>
                          <div className="text-xs text-slate-400">{rel.release_no}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-200 truncate">{rel.product_name}</div>
                          <div className="text-xs text-slate-400">รหัส: {rel.sku_code || '-'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-200 font-mono">
                            {rel.planned_quantity ? rel.planned_quantity.toLocaleString() : '-'} {rel.unit || 'ชิ้น'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {rel.batch_size_kg ? `${rel.batch_size_kg} kg` : ''}
                            {rel.yield_actual_pct ? ` (Yield: ${rel.yield_actual_pct}%)` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs text-slate-300 font-medium truncate max-w-xs">
                            {rel.template?.template_name || 'Standard Cosmetic Emulsion'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            หมวด: {rel.template?.product_category || 'EMULSION'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono text-xs font-semibold text-slate-300">
                              {passed}/{total} ผ่าน {na > 0 && <span className="text-slate-400 font-normal">({na} N/A)</span>}
                            </span>
                            <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full transition-all ${
                                  rel.is_blocked
                                    ? 'bg-rose-500'
                                    : pct === 100
                                    ? 'bg-emerald-500'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {getStatusBadge(rel.overall_status, rel.is_blocked, rel.blocking_reasons)}
                          {rel.blocking_reasons && rel.blocking_reasons.length > 0 && (
                            <div className="text-[11px] text-rose-400 mt-1 truncate max-w-[200px]" title={rel.blocking_reasons[0].reason}>
                              ⚠️ {rel.blocking_reasons[0].reason}
                            </div>
                          )}
                          {rel.open_capa_count > 0 && !rel.is_blocked && (
                            <div className="text-[11px] text-amber-400 mt-1">
                              ⚠️ พบ {rel.open_capa_count} CAPA (รอประเมินผลกระทบ)
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRelease(rel.id);
                            }}
                          >
                            เปิด Cockpit
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
