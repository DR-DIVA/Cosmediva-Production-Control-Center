'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Plus, 
  Flame, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ImproveDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/improve/stats');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching improve dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpi = data?.kpi || {
    openObservations: 0,
    criticalFindings: 0,
    estimatedMonthlyLoss: 0,
    estimatedAnnualLoss: 0,
    potentialSaving: 0,
    inProgressProjects: 0,
    verifiedProjects: 0,
    financeValidatedSavingYtd: 0,
    releasedCapacityHours: 0
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#2D2721] to-[#3D352E] p-6 rounded-2xl text-white shadow-md border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#D4AF37] uppercase">
            <Sparkles className="w-4 h-4" /> Operational Excellence & Cost Reduction System
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            CosmeFlow <span className="text-[#D4AF37]">Improve</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1">
            See Waste → Fix Process → Build Skill → Verify Saving → Standardize
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/improve/gemba">
            <Button className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold shadow-lg flex items-center gap-2 text-sm sm:text-base py-5 px-5">
              <Plus className="w-5 h-5" />
              + เดิน Gemba / บันทึกใหม่
            </Button>
          </Link>
          <Link href="/improve/observations">
            <Button variant="outline" className="border-[#D4AF37]/50 text-white hover:bg-white/10 text-xs sm:text-sm">
              รายการค้นพบทั้งหมด
            </Button>
          </Link>
        </div>
      </div>

      {/* Answer-First Executive Financial Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Finance Validated Hard Saving (Audited & Defense Ready) */}
        <Card className="bg-gradient-to-br from-emerald-900/90 to-emerald-950 text-white border-emerald-500/40 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-15">
            <DollarSign className="w-16 h-16 text-emerald-300" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-4 h-4" /> Finance Validated Hard Saving
            </div>
            <CardTitle className="text-3xl font-extrabold text-white mt-1">
              ฿{kpi.financeValidatedSavingYtd.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-emerald-200/80">
              เงินที่ลดลงจริง (Hard Saving) ผ่านการรับรองโดยฝ่ายบัญชีต้นทุน
            </p>
          </CardContent>
        </Card>

        {/* Estimated Annual Loss */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold tracking-wide uppercase">
              <Flame className="w-4 h-4 text-rose-500" /> Estimated Annual Loss
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              ฿{kpi.estimatedAnnualLoss.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">
              มูลค่าความสูญเสียประเมินรายปี (฿{kpi.estimatedMonthlyLoss.toLocaleString('th-TH', { minimumFractionDigits: 0 })}/เดือน)
            </p>
          </CardContent>
        </Card>

        {/* Potential Saving Identified */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold tracking-wide uppercase">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Potential Saving
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              ฿{kpi.potentialSaving.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">
              โอกาสประหยัดที่ค้นพบและอยู่ระหว่างวางแผน/ทดลอง
            </p>
          </CardContent>
        </Card>

        {/* Released Capacity */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold tracking-wide uppercase">
              <Clock className="w-4 h-4 text-blue-500" /> Released Capacity
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              {kpi.releasedCapacityHours.toLocaleString('th-TH', { minimumFractionDigits: 1 })} <span className="text-sm font-normal text-slate-500">ชม./เดือน</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">
              กำลังคน/ชั่วโมงการทำงานที่ปลดปล่อยสู่กิจกรรมมูลค่าสูง
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Pulse Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">รอการแก้ไข (Open)</div>
            <div className="text-xl font-bold text-slate-800">{kpi.openObservations} เคส</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">เสี่ยง GMP / คุณภาพ</div>
            <div className="text-xl font-bold text-rose-600">{kpi.criticalFindings} จุด</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">โครงการ PDCA</div>
            <div className="text-xl font-bold text-slate-800">{kpi.inProgressProjects} โครงการ</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ปรับปรุงสำเร็จ (Verified)</div>
            <div className="text-xl font-bold text-emerald-600">{kpi.verifiedProjects} โครงการ</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Pareto Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waste Distribution (DOWNTIME Pareto) */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
              <span>Top Waste Categories (มูลค่าความสูญเสียตามประเภทของเสีย)</span>
              <span className="text-xs font-normal text-slate-500">DOWNTIME + Factory Gaps</span>
            </CardTitle>
            <CardDescription className="text-xs">
              จำแนกตามความสูญเสียทางการเงินที่ตรวจพบจากการเดิน Gemba
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {data?.wasteBreakdown && data.wasteBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.wasteBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(val: any) => [`฿${Number(val).toLocaleString('th-TH')}`, 'Loss Value (THB/Year)']} 
                    />
                    <Bar dataKey="loss" fill="#D4AF37" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  ไม่มีข้อมูลของเสีย
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Loss Comparison */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
              <span>Loss by Department (มูลค่าสูญเสียตามแผนก)</span>
              <span className="text-xs font-normal text-slate-500">Pilot: Packing</span>
            </CardTitle>
            <CardDescription className="text-xs">
              แผนกที่พบโอกาสในการปรับปรุงกระบวนการและลดต้นทุนมากที่สุด
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {data?.departmentBreakdown && data.departmentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.departmentBreakdown} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(val: any) => [`฿${Number(val).toLocaleString('th-TH')}`, 'Loss Value (THB/Year)']} 
                    />
                    <Bar dataKey="loss" fill="#2D2721" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  ไม่มีข้อมูลแผนก
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Gemba Findings & Rapid Action */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">
              ข้อค้นพบล่าสุดจากการเดินหน้างาน (Recent Gemba Observations)
            </CardTitle>
            <CardDescription className="text-xs">
              ความผิดปกติ สภาพสูญเปล่า และโอกาสปรับปรุงที่บันทึกจากหน้างานจริง
            </CardDescription>
          </div>
          <Link href="/improve/observations" className="text-xs text-[#D4AF37] hover:underline font-semibold flex items-center gap-1">
            ดูทั้งหมด <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {data?.recentFindings && data.recentFindings.length > 0 ? (
              data.recentFindings.map((item: any) => (
                <Link 
                  key={item.id} 
                  href={`/improve/observations/${item.id}`}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 text-[#8B7355] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                      {item.observation_no.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700">{item.observation_no}</span>
                        <span className="text-xs text-slate-500">• {item.department_name || 'Packing'} ({item.line_name || 'Line 1'})</span>
                        {item.gmp_risk && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            GMP Risk
                          </span>
                        )}
                        {item.quality_risk && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Quality Risk
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 font-medium line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600">
                        ฿{Number(item.estimated_annual_loss || 0).toLocaleString('th-TH')}/ปี
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      item.status === 'VALIDATED' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : item.status === 'AI_ANALYZED'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                ยังไม่มีข้อมูลการเดินหน้างาน
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
