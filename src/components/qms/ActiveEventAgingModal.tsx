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
  Building2,
  Package,
  User,
  ArrowUpDown,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  QmsActiveEventAgingModel,
  QmsActiveEventDetail,
  QmsEventAgingBucketId,
} from '@/types/qms_analytics';

interface ActiveEventAgingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agingModel: QmsActiveEventAgingModel | null;
  onNavigateToTab?: (tabName: string, filter?: any) => void;
}

export function ActiveEventAgingModal({
  open,
  onOpenChange,
  agingModel,
  onNavigateToTab,
}: ActiveEventAgingModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedBucket, setSelectedBucket] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'OLDEST' | 'NEWEST' | 'SEVERITY'>('OLDEST');

  const eventsList = agingModel?.activeEventsList || [];

  // Extract unique filter options
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    eventsList.forEach((e) => {
      if (e.departmentName) set.add(e.departmentName);
    });
    return Array.from(set).sort();
  }, [eventsList]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    eventsList.forEach((e) => {
      if (e.currentStatus) set.add(e.currentStatus);
    });
    return Array.from(set).sort();
  }, [eventsList]);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    return eventsList
      .filter((item) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNo = item.eventNo.toLowerCase().includes(q);
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchProd = (item.productName || '').toLowerCase().includes(q);
          const matchLot = (item.lotNo || '').toLowerCase().includes(q);
          const matchOwner = (item.currentOwner || '').toLowerCase().includes(q);
          if (!matchNo && !matchTitle && !matchProd && !matchLot && !matchOwner) {
            return false;
          }
        }

        // Severity filter
        if (selectedSeverity !== 'ALL' && item.severity !== selectedSeverity) {
          return false;
        }

        // Department filter
        if (selectedDepartment !== 'ALL' && item.departmentName !== selectedDepartment) {
          return false;
        }

        // Aging bucket filter
        if (selectedBucket !== 'ALL' && item.agingBucket !== selectedBucket) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL' && item.currentStatus !== selectedStatus) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'OLDEST') {
          return b.agingDays - a.agingDays; // Oldest first
        } else if (sortOrder === 'NEWEST') {
          return a.agingDays - b.agingDays; // Newest first
        } else if (sortOrder === 'SEVERITY') {
          const score = (s: string) => (s === 'CRITICAL' ? 3 : s === 'MAJOR' ? 2 : 1);
          return score(b.severity) - score(a.severity) || b.agingDays - a.agingDays;
        }
        return 0;
      });
  }, [
    eventsList,
    searchTerm,
    selectedSeverity,
    selectedDepartment,
    selectedBucket,
    selectedStatus,
    sortOrder,
  ]);

  if (!agingModel) return null;

  const handleDeepLink = (eventNo: string) => {
    onOpenChange(false);
    if (onNavigateToTab) {
      onNavigateToTab('events', { search: eventNo });
    }
  };

  const getBucketBadge = (item: QmsActiveEventDetail) => {
    switch (item.attentionLevel) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            &gt; 30 วัน ({item.attentionLabel})
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            15–30 วัน ({item.attentionLabel})
          </span>
        );
      case 'ATTENTION':
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
            <Info className="w-3 h-3 text-cyan-400 shrink-0" />
            8–14 วัน ({item.attentionLabel})
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            ≤ 7 วัน ({item.attentionLabel})
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') {
      return (
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
          CRITICAL
        </span>
      );
    }
    if (severity === 'MAJOR') {
      return (
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
          MAJOR
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
        MINOR
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-6">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <DialogTitle className="text-lg font-bold text-white tracking-wide">
                  Active Event Aging Breakdown / รายละเอียดอายุเหตุการณ์คุณภาพที่ยังเปิดอยู่
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-1">
                วิเคราะห์อายุของเหตุการณ์คุณภาพที่กำลังเปิดดำเนินการ (Active Quality Events) โดยไม่รวมเคสที่ปิดแล้วหรือยกเลิกแล้ว พร้อมระบบเชื่อมโยงข้อมูลจริงไปยัง Phase 1 (Single Source of Truth)
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-mono text-xs font-bold">
                Active Events: {agingModel.activeCount} เคส
              </Badge>
              <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 font-mono text-xs">
                ทั้งหมดในระบบ: {agingModel.totalAllEventsCount}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* 1. STATISTICAL SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Active Quality Events (เคสเปิดอยู่)
            </span>
            <div className="text-2xl font-black text-indigo-400 font-mono mt-0.5">
              {agingModel.activeCount} <span className="text-xs font-normal text-slate-400">รายการ</span>
            </div>
            <span className="text-[10px] text-slate-500">
              ตัดเคส CLOSED / RESOLVED ออกแล้ว
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Average Aging (อายุเฉลี่ย)
            </span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {agingModel.averageAgingDays} <span className="text-xs font-normal text-slate-400">วัน</span>
            </div>
            <span className="text-[10px] text-slate-500">
              คำนวณจากวันที่เปิดเคสจนถึงปัจจุบัน
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Median Aging (มัธยฐานอายุ)
            </span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {agingModel.medianAgingDays} <span className="text-xs font-normal text-slate-400">วัน</span>
            </div>
            <span className="text-[10px] text-slate-500">
              ค่ากึ่งกลางลดผลกระทบเคสค้างตกขอบ
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">
              Oldest Active Event (ค้างนานสุด)
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono mt-0.5">
              {agingModel.oldestActiveDays} <span className="text-xs font-normal text-slate-400">วัน</span>
            </div>
            <span className="text-[10px] text-slate-500">
              เคสที่เปิดค้างยาวนานที่สุดในระบบ
            </span>
          </div>
        </div>

        {/* 2. AGING BUCKETS & VISUAL MANAGEMENT STRIP */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 my-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              การกระจายตัวตามช่วงอายุเหตุการณ์ (Aging Buckets Distribution):
            </span>
            <span className="text-[11px] text-slate-500">
              เกณฑ์การเฝ้าระวังทางปฏิบัติการ (Operational Attention Framework)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              onClick={() => setSelectedBucket(selectedBucket === 'LE_7D' ? 'ALL' : 'LE_7D')}
              className={`p-2 rounded border text-left transition-all ${
                selectedBucket === 'LE_7D'
                  ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">≤ 7 วัน</span>
                <span className="font-mono font-bold text-white">
                  {agingModel.buckets.le7Days.count} ({agingModel.buckets.le7Days.percentage}%)
                </span>
              </div>
              <span className="text-[10px] text-emerald-300/80 block mt-0.5">
                ระดับ: ปกติ (Normal)
              </span>
            </button>

            <button
              onClick={() => setSelectedBucket(selectedBucket === 'DAY_8_TO_14' ? 'ALL' : 'DAY_8_TO_14')}
              className={`p-2 rounded border text-left transition-all ${
                selectedBucket === 'DAY_8_TO_14'
                  ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400">8–14 วัน</span>
                <span className="font-mono font-bold text-white">
                  {agingModel.buckets.day8To14.count} ({agingModel.buckets.day8To14.percentage}%)
                </span>
              </div>
              <span className="text-[10px] text-cyan-300/80 block mt-0.5">
                ระดับ: เฝ้าระวัง (Attention)
              </span>
            </button>

            <button
              onClick={() => setSelectedBucket(selectedBucket === 'DAY_15_TO_30' ? 'ALL' : 'DAY_15_TO_30')}
              className={`p-2 rounded border text-left transition-all ${
                selectedBucket === 'DAY_15_TO_30'
                  ? 'bg-amber-950/50 border-amber-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">15–30 วัน</span>
                <span className="font-mono font-bold text-white">
                  {agingModel.buckets.day15To30.count} ({agingModel.buckets.day15To30.percentage}%)
                </span>
              </div>
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                ระดับ: เกินกำหนดเริ่มแรก (Overdue)
              </span>
            </button>

            <button
              onClick={() => setSelectedBucket(selectedBucket === 'GT_30D' ? 'ALL' : 'GT_30D')}
              className={`p-2 rounded border text-left transition-all ${
                selectedBucket === 'GT_30D'
                  ? 'bg-rose-950/50 border-rose-500 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400">&gt; 30 วัน</span>
                <span className="font-mono font-bold text-white">
                  {agingModel.buckets.gt30Days.count} ({agingModel.buckets.gt30Days.percentage}%)
                </span>
              </div>
              <span className="text-[10px] text-rose-300/80 block mt-0.5">
                ระดับ: วิกฤตค้างนาน (Critical Attention)
              </span>
            </button>
          </div>
        </div>

        {/* 3. INTERACTIVE FILTER BAR */}
        <div className="bg-slate-950/90 p-3 rounded-lg border border-slate-800 my-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหารหัส, หัวข้อ, ผลิตภัณฑ์, หรือล็อต..."
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Severity */}
            <div>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">ความรุนแรงทั้งหมด (All Severity)</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="MAJOR">MAJOR</option>
                <option value="MINOR">MINOR</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">แผนกทั้งหมด (All Depts)</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort order */}
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="OLDEST">เรียง: ค้างนานสุดก่อน (Oldest First)</option>
                <option value="NEWEST">เรียง: ใหม่สุดก่อน (Newest First)</option>
                <option value="SEVERITY">เรียง: ความรุนแรงสูงสุดก่อน (Severity)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>
              กำลังแสดง <strong>{filteredEvents.length}</strong> จาก <strong>{eventsList.length}</strong> เหตุการณ์ที่เปิดอยู่
            </span>
            {(searchTerm || selectedSeverity !== 'ALL' || selectedDepartment !== 'ALL' || selectedBucket !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSeverity('ALL');
                  setSelectedDepartment('ALL');
                  setSelectedBucket('ALL');
                  setSelectedStatus('ALL');
                }}
                className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                ล้างตัวกรองทั้งหมด (Reset Filters)
              </button>
            )}
          </div>
        </div>

        {/* 4. ACTIVE EVENTS TABLE */}
        <div className="border border-slate-800 rounded-lg overflow-hidden my-2">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-2.5">รหัสเหตุการณ์</th>
                  <th className="p-2.5 min-w-[180px]">หัวข้อเหตุการณ์</th>
                  <th className="p-2.5 text-center">ความรุนแรง</th>
                  <th className="p-2.5">แผนก</th>
                  <th className="p-2.5">ผลิตภัณฑ์ / ล็อต</th>
                  <th className="p-2.5">วันที่เปิด</th>
                  <th className="p-2.5">สถานะ</th>
                  <th className="p-2.5 text-right">อายุเหตุการณ์</th>
                  <th className="p-2.5">ช่วงอายุ & การเฝ้าระวัง</th>
                  <th className="p-2.5">ผู้รับผิดชอบ</th>
                  <th className="p-2.5 text-center">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      ไม่พบเหตุการณ์คุณภาพที่เปิดอยู่ตามเงื่อนไขตัวกรอง
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Event No (Clickable deep-link) */}
                      <td className="p-2.5">
                        <button
                          onClick={() => handleDeepLink(item.eventNo)}
                          className="font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 text-left"
                          title="คลิกเพื่อเชื่อมโยงไปยังระเบียน Phase 1 โดยตรง (Zero Re-typing)"
                        >
                          {item.eventNo}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* Title */}
                      <td className="p-2.5 font-medium text-slate-200">
                        <span className="line-clamp-2" title={item.title}>
                          {item.title}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="p-2.5 text-center">
                        {getSeverityBadge(item.severity)}
                      </td>

                      {/* Department */}
                      <td className="p-2.5 text-slate-300">
                        <span className="truncate block max-w-[110px]" title={item.departmentName}>
                          {item.departmentName}
                        </span>
                        {item.processName && (
                          <span className="text-[10px] text-slate-500 block truncate">
                            {item.processName}
                          </span>
                        )}
                      </td>

                      {/* Product & Lot */}
                      <td className="p-2.5 text-slate-300">
                        <div className="truncate max-w-[140px]" title={item.productName}>
                          {item.productName !== '-' ? item.productName : item.lotNo !== '-' ? item.lotNo : '-'}
                        </div>
                        {item.lotNo !== '-' && item.productName !== '-' && (
                          <span className="text-[10px] font-mono text-slate-500 block">
                            Lot: {item.lotNo}
                          </span>
                        )}
                      </td>

                      {/* Opened date */}
                      <td className="p-2.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(item.openedDate).toLocaleDateString('th-TH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </td>

                      {/* Status */}
                      <td className="p-2.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                          {item.currentStatus}
                        </span>
                      </td>

                      {/* Aging days */}
                      <td className="p-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
                        <span className={item.agingDays > 14 ? 'text-rose-400' : item.agingDays > 7 ? 'text-amber-400' : 'text-slate-200'}>
                          {item.agingDays} วัน
                        </span>
                      </td>

                      {/* Aging bucket & attention badge */}
                      <td className="p-2.5 whitespace-nowrap">
                        {getBucketBadge(item)}
                      </td>

                      {/* Current owner */}
                      <td className="p-2.5 text-slate-300 text-[11px]">
                        <span className="truncate block max-w-[100px]" title={item.currentOwner}>
                          {item.currentOwner}
                        </span>
                      </td>

                      {/* Deep-link action button */}
                      <td className="p-2.5 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeepLink(item.eventNo)}
                          className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                          title="เปิดระเบียนเหตุการณ์ใน Phase 1"
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
        </div>

        {/* 5. FOOTER & DATA GOVERNANCE DISCLAIMER */}
        <DialogFooter className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Phase 6 Quality Intelligence — ข้อมูลแบบอ่านอย่างเดียว เชื่อมโยงโดยตรงจากฐานข้อมูล Phase 1 (Single Source of Truth)
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          >
            ปิดหน้าต่าง (Close)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ActiveEventAgingModal;
