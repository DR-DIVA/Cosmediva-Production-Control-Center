'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ObservationListPage() {
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    fetchObservations();
  }, [statusFilter, severityFilter]);

  const fetchObservations = async () => {
    try {
      setLoading(true);
      let url = `/api/improve/observations?status=${statusFilter}&severity=${severityFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setObservations(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching observations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = observations.filter(obs => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      obs.observation_no.toLowerCase().includes(s) ||
      obs.description.toLowerCase().includes(s) ||
      (obs.department_name && obs.department_name.toLowerCase().includes(s)) ||
      (obs.line_name && obs.line_name.toLowerCase().includes(s)) ||
      (obs.sku && obs.sku.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            รายการค้นพบจากหน้างาน (Gemba Observations)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            กระบวนการค้นหาความสูญเปล่า (Waste) ช่องว่างมาตรฐาน (Standard Gap) และทักษะ (Skill Gap)
          </p>
        </div>
        <Link href="/improve/gemba">
          <Button className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold shadow-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            + บันทึกหน้างานใหม่
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาด้วยรหัส (OBS-...), ข้อความ, แผนก, ไลน์ผลิต, หรือ SKU..."
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="CAPTURED">CAPTURED (เพิ่งบันทึก)</option>
              <option value="AI_ANALYZED">AI ANALYZED (วิเคราะห์แล้ว)</option>
              <option value="VALIDATED">VALIDATED (ยืนยันแล้ว)</option>
              <option value="IMPROVEMENT_CREATED">IMPROVEMENT (สร้างไคเซ็น)</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700"
            >
              <option value="ALL">ความรุนแรงทั้งหมด</option>
              <option value="LOW">ต่ำ (Low)</option>
              <option value="MEDIUM">ปานกลาง (Medium)</option>
              <option value="HIGH">สูง (High)</option>
              <option value="CRITICAL">วิกฤติ (Critical)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Observations Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">รหัส / วันที่</th>
                  <th className="py-3.5 px-4">ตำแหน่ง / แผนก</th>
                  <th className="py-3.5 px-4">สิ่งที่พบหน้างาน</th>
                  <th className="py-3.5 px-4">ความสูญเสียประเมิน</th>
                  <th className="py-3.5 px-4">ความเสี่ยง</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      ไม่พบข้อมูลการเดินหน้างานที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800">{item.observation_no}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleDateString('th-TH')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">{item.department_name || 'Packing'}</div>
                        <div className="text-[10px] text-slate-500">
                          {item.line_name || 'Line 1'} {item.station_name ? `• ${item.station_name}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        {item.sku && (
                          <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            SKU: {item.sku}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-rose-600">
                          ฿{Number(item.estimated_annual_loss || 0).toLocaleString('th-TH')}/ปี
                        </div>
                        <div className="text-[10px] text-slate-400">
                          (฿{Number(item.estimated_monthly_loss || 0).toLocaleString('th-TH')}/เดือน)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {item.gmp_risk && (
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              GMP
                            </span>
                          )}
                          {item.quality_risk && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Quality
                            </span>
                          )}
                          {item.standard_gap && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Standard
                            </span>
                          )}
                          {!item.gmp_risk && !item.quality_risk && !item.standard_gap && (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          item.status === 'VALIDATED' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.status === 'IMPROVEMENT_CREATED'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : item.status === 'AI_ANALYZED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <Link href={`/improve/observations/${item.id}`}>
                          <Button variant="outline" size="sm" className="text-xs hover:border-[#D4AF37] hover:text-[#8B7355]">
                            เปิดดู <ArrowUpRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
