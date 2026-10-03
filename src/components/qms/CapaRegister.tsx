"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Layers, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Tag,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { QmsCapa, QmsCapaStatus, QmsCapaPriority } from '@/types/qms';
import { getAllCapas } from '@/app/actions/qms_capa';

interface CapaRegisterProps {
  onOpenCapaWorkspace: (capaId: string) => void;
  onOpenEffectivenessWorkspace?: (capaId: string) => void;
  refreshTrigger?: number;
}

export default function CapaRegister({
  onOpenCapaWorkspace,
  onOpenEffectivenessWorkspace,
  refreshTrigger = 0
}: CapaRegisterProps) {
  const [capas, setCapas] = useState<QmsCapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function loadCapas() {
    setLoading(true);
    try {
      const res = await getAllCapas({
        status: statusFilter,
        search: searchQuery
      });
      if (res.success && res.data) {
        setCapas(res.data);
      } else {
        toast.error(res.error || 'ไม่สามารถโหลดทะเบียน CAPA');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการโหลดทะเบียน CAPA');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCapas();
  }, [statusFilter, refreshTrigger]);

  const filteredCapas = useMemo(() => {
    if (!searchQuery.trim()) return capas;
    const q = searchQuery.toLowerCase();
    return capas.filter(c => 
      c.capa_no.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.problem_statement || '').toLowerCase().includes(q) ||
      (c.root_cause_summary || '').toLowerCase().includes(q) ||
      (c.snapshot_context?.product_sku || '').toLowerCase().includes(q) ||
      (c.snapshot_context?.batch_lot_no || '').toLowerCase().includes(q)
    );
  }, [capas, searchQuery]);

  const getPriorityBadge = (p: QmsCapaPriority) => {
    switch (p) {
      case 'CRITICAL':
        return <Badge className="bg-rose-600 text-white font-bold">🔴 วิกฤต (CRITICAL)</Badge>;
      case 'HIGH':
        return <Badge className="bg-amber-600 text-white font-bold">🟡 สูง (HIGH)</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-blue-600 text-white">🔵 ปานกลาง (MEDIUM)</Badge>;
      default:
        return <Badge variant="outline">🟢 ต่ำ (LOW)</Badge>;
    }
  };

  const getStatusBadge = (status: QmsCapaStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-slate-700 text-white">⚪ เปิดรับเคส (OPEN)</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600 text-white">🔵 กำลังดำเนินมาตรการ</Badge>;
      case 'ACTION_PENDING':
        return <Badge className="bg-amber-600 text-white">🟡 รอผลมาตรการ</Badge>;
      case 'ALL_ACTIONS_COMPLETED':
        return <Badge className="bg-purple-600 text-white">🟣 มาตรการครบ (รอ QA รับรอง)</Badge>;
      case 'AWAITING_EFFECTIVENESS':
        return <Badge className="bg-indigo-600 text-white ring-2 ring-indigo-300">⏳ รอประเมินประสิทธิผล (Phase 4)</Badge>;
      case 'CLOSED_EFFECTIVE':
      case 'CLOSED':
        return <Badge className="bg-emerald-600 text-white font-semibold">✅ ปิดสมบูรณ์ — มีประสิทธิผล (CLOSED)</Badge>;
      case 'REOPENED_FOR_ACTION':
        return <Badge className="bg-rose-600 text-white font-semibold">🔄 เปิดทบทวนมาตรการใหม่ (REOPENED)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <Input 
            placeholder="ค้นหาตามรหัส CAPA, ชื่อเคส, SKU, ล็อตการผลิต..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCapas()}
            className="border-0 bg-transparent focus-visible:ring-0 text-xs sm:text-sm h-8"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium whitespace-nowrap text-[11px] sm:text-xs">สถานะ:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border rounded px-2.5 py-1 text-xs"
            >
              <option value="ALL">ทุกลำดับสถานะ</option>
              <option value="OPEN">⚪ เปิดรับเคส (OPEN)</option>
              <option value="IN_PROGRESS">🔵 กำลังดำเนินการ (IN_PROGRESS)</option>
              <option value="ALL_ACTIONS_COMPLETED">🟣 มาตรการครบแล้ว</option>
              <option value="AWAITING_EFFECTIVENESS">⏳ รอประเมินประสิทธิผล</option>
              <option value="CLOSED_EFFECTIVE">✅ ปิดสมบูรณ์ (CLOSED — EFFECTIVE)</option>
              <option value="REOPENED_FOR_ACTION">🔄 เปิดทบทวนมาตรการใหม่</option>
            </select>
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadCapas} 
            disabled={loading}
            className="h-8 text-xs gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </Button>
        </div>
      </div>

      {/* CAPA Master Register Table */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <Table className="min-w-[780px] lg:min-w-full w-full text-xs">
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
              <TableRow>
                <TableHead className="w-[110px] sm:w-[130px] whitespace-nowrap">รหัส CAPA</TableHead>
                <TableHead className="min-w-[180px]">หัวข้อ CAPA & ปัญหาที่พบ</TableHead>
                <TableHead className="w-[130px] sm:w-[150px] whitespace-nowrap">บริบทผลิตภัณฑ์ & แบทช์</TableHead>
                <TableHead className="w-[90px] sm:w-[110px] whitespace-nowrap">ความสำคัญ</TableHead>
                <TableHead className="w-[120px] sm:w-[140px] whitespace-nowrap">ความคืบหน้ามาตรการ</TableHead>
                <TableHead className="w-[90px] sm:w-[100px] whitespace-nowrap">กำหนดเสร็จ</TableHead>
                <TableHead className="w-[130px] sm:w-[150px] whitespace-nowrap">สถานะ</TableHead>
                <TableHead className="w-[90px] text-right whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-800/60 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">ดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredCapas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    {loading ? 'กำลังโหลดข้อมูลทะเบียน CAPA...' : 'ไม่พบรายการ CAPA ในระบบ'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCapas.map((capa) => {
                  const totalActions = capa.actions?.length || 0;
                  const verifiedActions = capa.actions?.filter(a => a.status === 'VERIFIED').length || 0;
                  const completedActions = capa.actions?.filter(a => a.status === 'COMPLETED').length || 0;
                  const percent = totalActions > 0 ? Math.round((verifiedActions / totalActions) * 100) : 0;

                  return (
                    <TableRow key={capa.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                        {capa.capa_no}
                        {capa.quality_event && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            ref: {capa.quality_event.event_no}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                          {capa.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {capa.problem_statement}
                        </div>
                        {capa.root_cause_summary && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium line-clamp-1">
                            สาเหตุ: [{capa.root_cause_category}] {capa.root_cause_summary}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {capa.snapshot_context?.product_sku || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Lot: {capa.snapshot_context?.batch_lot_no || 'N/A'}
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {getPriorityBadge(capa.priority)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-600">
                              {verifiedActions}/{totalActions} รับรองแล้ว
                            </span>
                            <span className="font-bold text-indigo-600">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {new Date(capa.target_due_date).toLocaleDateString('th-TH')}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {getStatusBadge(capa.current_status === 'AWAITING_EFFECTIVENESS' && percent < 100 ? 'IN_PROGRESS' : capa.current_status)}
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap sticky right-0 bg-white/95 dark:bg-slate-900/95 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-end gap-1.5">
                          {(capa.current_status === 'AWAITING_EFFECTIVENESS' || capa.current_status === 'CLOSED_EFFECTIVE' || capa.current_status === 'REOPENED_FOR_ACTION' || (capa.effectiveness_status && capa.effectiveness_status !== 'NOT_STARTED')) && onOpenEffectivenessWorkspace && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => onOpenEffectivenessWorkspace(capa.id)}
                              className="text-[11px] h-7 px-2 gap-1 border-purple-300 text-purple-700 bg-purple-50/50 hover:bg-purple-100 font-medium"
                              title="เปิดพื้นที่ประเมินประสิทธิผลและติดตามการเกิดซ้ำ"
                            >
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span className="hidden md:inline">ประเมินประสิทธิผล</span>
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onOpenCapaWorkspace(capa.id)}
                            className="text-xs h-7 px-2.5 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            เปิด CAPA
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
