'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  TrendingDown, 
  Clock, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  AlertTriangle, 
  ArrowUpRight, 
  BarChart3, 
  PieChart, 
  ShieldCheck, 
  Activity,
  FolderTree,
  Building2,
  Cpu,
  PackageX,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CostLossTreePage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCostLoss();
  }, []);

  const fetchCostLoss = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/improve/cost-loss');
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Default expand first department
        const depts = Object.keys(json.tree || {});
        if (depts.length > 0) {
          setExpandedDepts({ [depts[0]]: true });
          const firstDeptLines = Object.keys(json.tree[depts[0]].lines || {});
          if (firstDeptLines.length > 0) {
            setExpandedLines({ [`${depts[0]}_${firstDeptLines[0]}`]: true });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching cost loss:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDept = (deptName: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptName]: !prev[deptName] }));
  };

  const toggleLine = (key: string) => {
    setExpandedLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const summary = data?.summary || {
    totalAnnualLoss: 0,
    totalMonthlyLoss: 0,
    totalLostHoursPerMonth: 0,
    laborLoss: 0,
    machineDowntime: 0,
    scrapLoss: 0,
    reworkLoss: 0,
    opportunityLoss: 0
  };

  const formatTHB = (val: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ต้นไม้ต้นทุนสูญเสีย & ประเมินมูลค่าความสูญเปล่า (Cost Loss Tree & Multi-Loss)
            </h1>
            <Badge className="bg-[#D4AF37]/20 text-[#856b18] border-[#D4AF37]/40">
              Engine 3 & 8
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            แจกแจงเม็ดเงินที่สูญเปล่าในโรงงานระดับ แผนก → ไลน์ → สเตชั่น → ชนิดความสูญเปล่า (Labor, Scrap, Rework, Downtime)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/improve/gemba">
            <Button className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold text-xs sm:text-sm shadow-sm">
              + เดิน Gemba เพิ่มเติม
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-rose-200 bg-rose-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-rose-800 uppercase tracking-wide">
              มูลค่าความสูญเปล่ารวมต่อปี (Annual Factory Loss)
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black text-rose-700 font-mono">
              {loading ? '...' : formatTHB(summary.totalAnnualLoss)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-rose-600 font-medium">
              จากรายการตรวจพบทั้งหมดในระบบ
            </p>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 bg-amber-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              สูญเปล่าเฉลี่ยต่อเดือน (Monthly Loss)
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
              {loading ? '...' : formatTHB(summary.totalMonthlyLoss)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-amber-600 font-medium">
              เทียบเท่าต้นทุนดำเนินงานส่วนเกิน
            </p>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 bg-blue-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-blue-800 uppercase tracking-wide">
              ชั่วโมงแรงงานสูญเปล่า (Lost Man-Hours)
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">
              {loading ? '...' : `${summary.totalLostHoursPerMonth.toLocaleString()} ชม./เดือน`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-blue-600 font-medium">
              เวลาที่พนักงานใช้ไปกับการเดิน/รอ/แก้ปัญหา
            </p>
          </CardContent>
        </Card>

        <Card className="border border-[#D4AF37]/50 bg-amber-50/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-[#856b18] uppercase tracking-wide">
              ฐานคำนวณบัญชีต้นทุน (Cost Standard)
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black text-[#2D2721] font-mono">
              85.00 ฿/ชม.
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500 font-medium">
              อัตราค่าแรงงานตรงมาตรฐาน (Direct Labor Rate)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Loss Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">Labor Loss (ค่าแรงเสียเปล่า)</div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {formatTHB(summary.laborLoss)}/ปี
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <PackageX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">Scrap Loss (ของเสีย/ทิ้ง)</div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {formatTHB(summary.scrapLoss)}/ปี
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">Rework Loss (แก้ไขงานซ้ำ)</div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {formatTHB(summary.reworkLoss)}/ปี
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold">Machine Downtime (เครื่องหยุด)</div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {formatTHB(summary.machineDowntime)}/ปี
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Drill-Down Tree */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#D4AF37]" />
              <CardTitle className="text-base font-bold text-slate-900">
                แผนผังค้นหาต้นตอต้นทุนสูญเสีย (Interactive Cost Loss Tree)
              </CardTitle>
            </div>
            <span className="text-xs text-slate-500">
              คลิกเพื่อเปิด/ปิดระดับชั้นการเจาะลึก
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500">
            โครงสร้างต้นไม้: โรงงาน (Factory) ➔ แผนก (Department) ➔ สายการผลิต (Line) ➔ ประเภทสูญเปล่า (Waste) ➔ รายการจริง
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#D4AF37]" />
              กำลังประมวลผลต้นไม้ต้นทุน...
            </div>
          ) : !data?.tree || Object.keys(data.tree).length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              ยังไม่มีข้อมูลการคำนวณต้นทุนสูญเสีย
            </div>
          ) : (
            <div className="space-y-4">
              {/* Level 1: Factory Root */}
              <div className="bg-[#2D2721] text-white p-4 rounded-xl flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">
                      โรงงานคอสเมดิวา ลาดกระบัง (Main Plant Total Loss)
                    </h3>
                    <p className="text-xs text-slate-400">
                      ยอดรวมสูญเปล่าทั้งระบบโรงงาน
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">มูลค่าสูญเปล่ารวม:</div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-[#D4AF37]">
                    {formatTHB(summary.totalAnnualLoss)}
                    <span className="text-xs font-normal text-slate-300"> /ปี</span>
                  </div>
                </div>
              </div>

              {/* Level 2: Departments */}
              <div className="pl-4 sm:pl-6 space-y-3 border-l-2 border-dashed border-slate-300">
                {Object.entries(data.tree).map(([deptName, dept]: [string, any]) => {
                  const isDeptExpanded = !!expandedDepts[deptName];
                  return (
                    <div key={deptName} className="space-y-2">
                      {/* Dept Header */}
                      <div 
                        onClick={() => toggleDept(deptName)}
                        className="flex items-center justify-between p-3.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg cursor-pointer border border-slate-200 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          {isDeptExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          )}
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">
                            📁 {deptName}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {formatTHB(dept.totalAnnualLoss)}
                          <span className="text-slate-500 text-[10px] font-normal"> /ปี</span>
                        </div>
                      </div>

                      {/* Level 3: Lines under Dept */}
                      {isDeptExpanded && (
                        <div className="pl-4 sm:pl-6 space-y-2 border-l-2 border-slate-200 ml-2">
                          {Object.entries(dept.lines).map(([lineName, line]: [string, any]) => {
                            const lineKey = `${deptName}_${lineName}`;
                            const isLineExpanded = !!expandedLines[lineKey];

                            return (
                              <div key={lineKey} className="space-y-2">
                                {/* Line Header */}
                                <div 
                                  onClick={() => toggleLine(lineKey)}
                                  className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200 text-xs transition-all"
                                >
                                  <div className="flex items-center gap-2">
                                    {isLineExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                    <span className="font-semibold text-slate-700">
                                      ⚙️ {lineName}
                                    </span>
                                  </div>
                                  <div className="font-mono font-semibold text-rose-700 text-xs">
                                    {formatTHB(line.totalAnnualLoss)} /ปี
                                  </div>
                                </div>

                                {/* Level 4: Wastes & Individual Observations */}
                                {isLineExpanded && (
                                  <div className="pl-4 sm:pl-6 space-y-2 border-l-2 border-amber-200 ml-2">
                                    {Object.entries(line.wastes).map(([wasteName, waste]: [string, any]) => (
                                      <div key={wasteName} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide pt-1">
                                          <span>ความสูญเปล่า: {wasteName}</span>
                                          <span className="font-mono text-slate-700">{formatTHB(waste.totalAnnualLoss)}/ปี</span>
                                        </div>

                                        {/* Level 5: Concrete items */}
                                        <div className="space-y-2">
                                          {waste.items.map((item: any) => (
                                            <div 
                                              key={item.id}
                                              className="p-3 bg-amber-50/40 rounded-lg border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#D4AF37] transition-all"
                                            >
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono font-bold text-slate-800">
                                                    {item.observation_no}
                                                  </span>
                                                  <Badge variant="outline" className="text-[10px] bg-white">
                                                    {item.station_name || 'Station'}
                                                  </Badge>
                                                  {item.severity && (
                                                    <Badge className="bg-rose-500/10 text-rose-700 border-rose-200 text-[10px]">
                                                      {item.severity}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <p className="text-slate-700 font-medium text-xs line-clamp-2">
                                                  {item.observation_description}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                  สูญเสียเวลา: {item.lost_minutes_per_occ} นาที/ครั้ง • พนักงาน {item.number_of_people} คน • รวม {item.lost_hours_per_month} ชม./เดือน
                                                </p>
                                              </div>

                                              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                                <div className="text-right">
                                                  <div className="text-xs font-bold text-rose-700 font-mono">
                                                    {formatTHB(item.annual_loss_thb)}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400">
                                                    {formatTHB(item.monthly_loss_thb)}/เดือน
                                                  </div>
                                                </div>
                                                <Link href={`/improve/observations/${item.observation_id}`}>
                                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                                                    ดูข้อค้นพบ <ArrowUpRight className="w-3 h-3 ml-1" />
                                                  </Button>
                                                </Link>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finance Standard Rates Reference Table */}
      {data?.rates && data.rates.length > 0 && (
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-800">
              อัตราต้นทุนมาตรฐานที่ใช้คำนวณ (Cost Rates Master)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              กำหนดโดยฝ่ายบัญชีต้นทุน (Cost Accounting) เพื่อความโปร่งใสและเป็นมาตรฐานเดียวกันทั้งโรงงาน
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="p-3">รหัสอัตรา</th>
                    <th className="p-3">รายการ</th>
                    <th className="p-3">ประเภท</th>
                    <th className="p-3 text-right">อัตรา (บาท)</th>
                    <th className="p-3">หน่วย</th>
                    <th className="p-3">คำอธิบาย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.rates.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{r.rate_code}</td>
                      <td className="p-3 font-medium">{r.rate_name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">{r.rate_type}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {Number(r.amount_thb).toFixed(2)}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{r.unit}</td>
                      <td className="p-3 text-slate-500">{r.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
