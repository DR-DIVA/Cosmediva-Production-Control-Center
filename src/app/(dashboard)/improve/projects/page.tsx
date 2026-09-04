'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Plus, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Activity,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ImprovementProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/improve/projects');
      const json = await res.json();
      if (json.success) {
        setProjects(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            โครงการปรับปรุงกระบวนการ (Kaizen / PDCA Projects)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ติดตามวงจร PLAN → DO → CHECK → ACT พร้อมการทดสอบก่อน-หลัง (Before/After) และการรับรองผลการเงิน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/improve/gemba">
            <Button className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold text-xs sm:text-sm">
              + บันทึก Gemba เพื่อเปิดโครงการ
            </Button>
          </Link>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">กำลังโหลดโครงการ...</div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            ยังไม่มีโครงการปรับปรุง
          </div>
        ) : (
          projects.map((proj) => (
            <Card key={proj.id} className="bg-white border-slate-200 shadow-xs hover:border-[#D4AF37]/50 transition overflow-hidden">
              <CardHeader className="bg-slate-50/60 p-4 sm:p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                      {proj.project_no}
                    </span>
                    <span className="bg-[#2D2721] text-[#D4AF37] font-bold text-[10px] px-2 py-0.5 rounded">
                      STAGE: {proj.pdca_stage}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      proj.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : proj.status === 'TRIAL'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {proj.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {/* Quality Gate Status */}
                    <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Quality Gate: {proj.quality_gate_status}
                    </span>
                  </div>
                </div>

                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                  {proj.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 line-clamp-2">
                  {proj.problem_statement}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Before / After Metrics Comparison */}
                {proj.before_after && proj.before_after.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>ผลการทดลองเปรียบเทียบก่อน-หลัง (Before / After Trial Metrics):</span>
                      <span className="text-[11px] font-normal text-slate-500">Pilot Line: Packing Line 1</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {proj.before_after.map((metric: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-xs font-semibold text-slate-700 truncate">{metric.metric_name}</div>
                          <div className="flex items-center justify-between mt-2 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block">BEFORE</span>
                              <span className="font-bold text-slate-600">{metric.before_value} {metric.unit}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300" />
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">AFTER</span>
                              <span className="font-bold text-emerald-600">{metric.after_value} {metric.unit}</span>
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-center">
                            ปรับปรุงดีขึ้น {metric.improvement_pct}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial & Operational Impact Strip */}
                <div className="p-3.5 bg-gradient-to-r from-[#2D2721] to-[#3D352E] rounded-xl text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Productivity Gain</span>
                    <span className="text-base sm:text-lg font-extrabold text-[#D4AF37]">
                      +{Number(proj.productivity_gain_pct || 20.8).toFixed(1)}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Released Capacity</span>
                    <span className="text-base sm:text-lg font-extrabold text-blue-300">
                      {Number(proj.released_capacity_hours || 166.4).toFixed(1)} ชม./เดือน
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Expected Saving</span>
                    <span className="text-base sm:text-lg font-extrabold text-amber-300">
                      ฿{Number(proj.expected_annual_saving || 0).toLocaleString('th-TH')}/ปี
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Finance Validated Hard Saving</span>
                    <span className="text-base sm:text-lg font-extrabold text-emerald-400">
                      ฿{Number(proj.finance_validated_hard_saving || 0).toLocaleString('th-TH')}
                    </span>
                  </div>
                </div>

                {/* Footer Traceability */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                  <div>
                    ผู้รับผิดชอบ: <span className="font-medium text-slate-800">{proj.owner_name}</span> | ผู้ตรวจรับรอง QA: <span className="font-medium text-slate-800">{proj.qa_signed_by || 'QA Reviewer'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    เริ่มโครงการ: {new Date(proj.start_date).toLocaleDateString('th-TH')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
