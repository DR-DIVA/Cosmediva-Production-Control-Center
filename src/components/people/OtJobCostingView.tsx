'use client'

import React, { useState } from 'react';
import { 
  Clock, DollarSign, Package, AlertTriangle, CheckCircle2, 
  TrendingDown, TrendingUp, Users, Plus, Filter, Sparkles,
  ArrowRight, ShieldAlert, BarChart3, ChevronRight, Calculator
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

interface OtJobCostingViewProps {
  currentPersona: Persona;
}

export function OtJobCostingView({ currentPersona }: OtJobCostingViewProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState('JHD-309');
  const [subTab, setSubTab] = useState<'job_costing' | 'requests'>('job_costing');

  // Sample Lot Financial Data
  const lots = [
    {
      lotNumber: 'JHD-309',
      productName: 'Diva Intensive Brightening Serum 50ml',
      orderQuantity: 80000,
      completedQuantity: 76500,
      revenue: 120000,
      budgetedLaborCost: 15000,
      normalLaborCost: 11200,
      otLaborCost: 3950,
      materialCost: 68000,
      overheadCost: 6000,
      otHours: 37,
      headcount: 13,
      status: 'PROFITABLE',
      line: 'Packing Line 2'
    },
    {
      lotNumber: 'JHD-318',
      productName: 'Diva Youth Defense Day Cream 30g',
      orderQuantity: 45000,
      completedQuantity: 41200,
      revenue: 72000,
      budgetedLaborCost: 9500,
      normalLaborCost: 8800,
      otLaborCost: 4650,
      materialCost: 44000,
      overheadCost: 4500,
      otHours: 42,
      headcount: 14,
      status: 'DEFICIT_RISK',
      line: 'Packing Line 1'
    },
    {
      lotNumber: 'JHD-317',
      productName: 'Diva Hydrating Body Lotion 200ml',
      orderQuantity: 60000,
      completedQuantity: 60000,
      revenue: 95000,
      budgetedLaborCost: 12000,
      normalLaborCost: 9800,
      otLaborCost: 1850,
      materialCost: 52000,
      overheadCost: 5000,
      otHours: 18,
      headcount: 8,
      status: 'PROFITABLE',
      line: 'Mixing Room 3'
    }
  ];

  // Active OT Requests
  const [otRequests, setOtRequests] = useState([
    {
      id: 'OT-2026-0908-01',
      lotNumber: 'JHD-309',
      productName: 'Diva Serum 50ml',
      line: 'Packing Line 2',
      requestedBy: 'ดนัย นิติพจน์ (Foreman)',
      otDate: '2026-09-08',
      timeSlot: '17:00 - 20:00 (3.0 ชม.)',
      plannedHeadcount: 15,
      actualHeadcount: 13,
      plannedHours: 45,
      actualHours: 37,
      estimatedCost: 4800,
      actualCost: 3950,
      status: 'APPROVED_EXECUTED',
      participants: [
        { code: 'PK-BJP518', name: 'น.ส.เบ็ญจพร พูลสวัสดิ์', rate: 68.06, hours: 3.0, cost: 204.18, status: 'Present' },
        { code: 'PK-SNT012', name: 'นายสุนทร มีโชค', rate: 68.06, hours: 3.0, cost: 204.18, status: 'Present' },
        { code: 'PK-WCH044', name: 'นายวิชัย รุ่งเรือง', rate: 75.50, hours: 3.0, cost: 226.50, status: 'Present' },
        { code: 'PK-KMN089', name: 'น.ส.กมลทิพย์ แสนสุข', rate: 68.06, hours: 0, cost: 0, status: 'Absent' }
      ]
    },
    {
      id: 'OT-2026-0908-02',
      lotNumber: 'JHD-318',
      productName: 'Diva Day Cream 30g',
      line: 'Packing Line 1',
      requestedBy: 'สมควร มั่นคง (Foreman)',
      otDate: '2026-09-08',
      timeSlot: '17:00 - 21:00 (4.0 ชม.)',
      plannedHeadcount: 14,
      actualHeadcount: 14,
      plannedHours: 56,
      actualHours: 42,
      estimatedCost: 5600,
      actualCost: 4650,
      status: 'PENDING_APPROVAL',
      participants: []
    }
  ]);

  // Form State for new OT request
  const [formData, setFormData] = useState({
    lotNumber: 'JHD-309',
    line: 'Packing Line 2',
    otDate: '2026-09-09',
    startTime: '17:00',
    endTime: '20:00',
    reason: 'เร่งบรรจุ Lot JHD-309 ให้ทันกำหนดส่งมอบลูกค้า 16:00 น. วันพรุ่งนี้',
    selectedWorkersCount: 12
  });

  const handleCreateOtRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const estCost = formData.selectedWorkersCount * 3 * 70; // rough approx 70 THB/hr OT
    toast.success(`เปิดคำขอ OT สำหรับ Lot ${formData.lotNumber} เรียบร้อยแล้ว (ประมาณการ ฿${estCost.toLocaleString()})`);
    setShowRequestModal(false);
  };

  const currentLotData = lots.find(l => l.lotNumber === selectedLot) || lots[0];
  const totalActualLabor = currentLotData.normalLaborCost + currentLotData.otLaborCost;
  const laborVariance = totalActualLabor - currentLotData.budgetedLaborCost;
  const isLaborOverBudget = laborVariance > 0;
  const totalProductionCost = currentLotData.materialCost + totalActualLabor + currentLotData.overheadCost;
  const netMargin = currentLotData.revenue - totalProductionCost;
  const netMarginPercent = ((netMargin / currentLotData.revenue) * 100).toFixed(1);
  const isDeficit = netMargin <= 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30">
              Module 05: Job-Linked Overtime Costing
            </span>
            <span className="text-xs text-slate-400 font-bold">Activity-Based Costing (ABC)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 text-white">
            ระบบขอและอนุมัติ OT ผูกต้นทุนคำสั่งผลิต
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            เปลี่ยนใบเซ็นชื่อกระดาษเป็นระบบดิจิทัล ลิ้งก์ชั่วโมงและต้นทุนค่าแรงเข้าสู่งานผลิตโดยตรง เพื่อตรวจสอบว่า <strong>“ล็อตนี้กำไรหรือขาดทุนจากค่าแรงโอที”</strong>
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เปิดคำขอ OT ประจำกะ (New OT Request)</span>
        </button>
      </div>

      {/* 2. Subtabs Navigation */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold w-fit">
        <button
          onClick={() => setSubTab('job_costing')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            subTab === 'job_costing' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>วิเคราะห์ต้นทุน & กำไรขาดทุนต่องาน (Job Costing P&L)</span>
        </button>
        <button
          onClick={() => setSubTab('requests')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            subTab === 'requests' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>รายการขอและอนุมัติ OT ({otRequests.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: JOB COSTING & PROFIT/LOSS ANALYSIS */}
      {subTab === 'job_costing' && (
        <div className="space-y-6">
          {/* Select Lot to Inspect */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <span>เลือกล็อตการผลิตเพื่อตรวจสอบผลกระทบค่าแรงโอที (Lot Cost Variance)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ระบบจะดึงข้อมูลรายชื่อพนักงาน เวลาสแกนนิ้วจริง และคำนวณต้นทุนให้รายบุคคล</p>
              </div>

              <div className="flex items-center gap-2">
                {lots.map(l => (
                  <button
                    key={l.lotNumber}
                    onClick={() => setSelectedLot(l.lotNumber)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition border ${
                      selectedLot === l.lotNumber
                        ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {l.lotNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Lot Summary Banner */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-base text-slate-900">{currentLotData.lotNumber}</span>
                  <span className="text-xs font-bold text-slate-600">• {currentLotData.productName}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3 font-medium">
                  <span>สถานี: <strong>{currentLotData.line}</strong></span>
                  <span>•</span>
                  <span>ยอดสั่งผลิต: <strong>{currentLotData.orderQuantity.toLocaleString()} ชิ้น</strong></span>
                  <span>•</span>
                  <span>ผลิตเสร็จแล้ว: <strong>{currentLotData.completedQuantity.toLocaleString()} ชิ้น</strong> ({Math.round((currentLotData.completedQuantity / currentLotData.orderQuantity) * 100)}%)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                  currentLotData.status === 'PROFITABLE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                }`}>
                  {currentLotData.status === 'PROFITABLE' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>กำไรตามเกณฑ์ (Profitable)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>เสี่ยงขาดทุนจากค่าแรงโอที (OT Deficit Risk)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* 4 Core Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {/* Budgeted Labor */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-400 font-bold uppercase">งบค่าแรงมาตรฐาน (Budgeted)</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  ฿{currentLotData.budgetedLaborCost.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  เฉลี่ย ฿{(currentLotData.budgetedLaborCost / currentLotData.orderQuantity).toFixed(3)} / ชิ้น
                </div>
              </div>

              {/* Normal Shift Labor */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-xs">
                <div className="text-xs text-blue-800 font-bold uppercase">ค่าแรงกะปกติ (Normal Shift)</div>
                <div className="text-2xl font-black text-blue-900 mt-1">
                  ฿{currentLotData.normalLaborCost.toLocaleString()}
                </div>
                <div className="text-[11px] text-blue-700 mt-1">
                  เวลาทำงาน 08:00 - 17:00
                </div>
              </div>

              {/* Overtime Labor Spent */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-xs">
                <div className="text-xs text-amber-800 font-bold uppercase">ค่าแรงโอทีจริง (OT Labor Spent)</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  ฿{currentLotData.otLaborCost.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-700 font-bold">
                  {currentLotData.otHours} ชม. OT ({currentLotData.headcount} คน)
                </div>
              </div>

              {/* Variance vs Budget */}
              <div className={`p-4 rounded-2xl border shadow-xs ${
                isLaborOverBudget ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <div className="text-xs font-bold uppercase">
                  {isLaborOverBudget ? 'ค่าแรงเกินงบ (Labor Overrun)' : 'ค่าแรงอยู่ในงบ (Labor Saving)'}
                </div>
                <div className={`text-2xl font-black mt-1 ${isLaborOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {isLaborOverBudget ? `+฿${laborVariance.toLocaleString()}` : `-฿${Math.abs(laborVariance).toLocaleString()}`}
                </div>
                <div className="text-[11px] mt-1 font-bold text-slate-600">
                  รวมค่าแรงจริง: ฿{totalActualLabor.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Profit & Loss Breakdown (คำนวณกำไร-ขาดทุนต่องาน) */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h4 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                <span>การวิเคราะห์ผลกำไรขาดทุนสุทธิของล็อต (Batch Profit & Margin Analysis)</span>
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cost Tree Table */}
                <div className="lg:col-span-8 bg-slate-50/50 rounded-2xl p-4 border border-slate-200/80">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b border-slate-200 pb-2">
                        <th className="text-left pb-2">โครงสร้างต้นทุนคำสั่งผลิต</th>
                        <th className="text-right pb-2">จำนวนเงิน (บาท)</th>
                        <th className="text-right pb-2">สัดส่วน (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 font-medium">
                      <tr>
                        <td className="py-2 text-slate-800 font-bold">1. มูลค่าคำสั่งผลิต / ราคาขาย (Revenue)</td>
                        <td className="py-2 text-right font-black text-slate-900">฿{currentLotData.revenue.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-500">100.0%</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-600 pl-3">2. ต้นทุนวัตถุดิบ & แพ็กเกจจิ้ง (RM/PM)</td>
                        <td className="py-2 text-right text-slate-700">฿{currentLotData.materialCost.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-500">{((currentLotData.materialCost / currentLotData.revenue) * 100).toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-700 pl-3">3. ต้นทุนค่าแรงกะปกติ (Normal Labor)</td>
                        <td className="py-2 text-right text-blue-700">฿{currentLotData.normalLaborCost.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-500">{((currentLotData.normalLaborCost / currentLotData.revenue) * 100).toFixed(1)}%</td>
                      </tr>
                      <tr className="bg-amber-50/60">
                        <td className="py-2 text-amber-900 font-bold pl-3 flex items-center gap-1">
                          <span>⏰</span>
                          <span>4. ต้นทุนค่าแรงโอที (Overtime Labor)</span>
                        </td>
                        <td className="py-2 text-right font-black text-amber-700">฿{currentLotData.otLaborCost.toLocaleString()}</td>
                        <td className="py-2 text-right font-bold text-amber-800">{((currentLotData.otLaborCost / currentLotData.revenue) * 100).toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-600 pl-3">5. ค่าโสหุ้ยการผลิต (Overhead Cost)</td>
                        <td className="py-2 text-right text-slate-700">฿{currentLotData.overheadCost.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-500">{((currentLotData.overheadCost / currentLotData.revenue) * 100).toFixed(1)}%</td>
                      </tr>
                      <tr className="border-t-2 border-slate-300 bg-white">
                        <td className="py-3 text-slate-900 font-black">รวมต้นทุนการผลิตจริงทั้งหมด (Total Cost)</td>
                        <td className="py-3 text-right font-black text-slate-900">฿{totalProductionCost.toLocaleString()}</td>
                        <td className="py-3 text-right font-black text-slate-900">{((totalProductionCost / currentLotData.revenue) * 100).toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Margin Result Card */}
                <div className="lg:col-span-4 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
                      Batch Contribution Margin
                    </span>
                    <h5 className="text-xs font-bold text-slate-300 mt-3">กำไรสุทธิหลังหักค่าแรงโอที</h5>
                    <div className={`text-3xl font-black mt-1 ${isDeficit ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ฿{netMargin.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-slate-300 mt-1">
                      Margin: <strong className={isDeficit ? 'text-rose-400' : 'text-emerald-400'}>{netMarginPercent}%</strong>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700 text-xs">
                    {isDeficit ? (
                      <div className="text-rose-300 flex items-start gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span><strong>คำเตือน:</strong> ล็อตนี้ขาดทุนจากค่าแรงโอทีบวม เกินเพดานกำไรขั้นต่ำของโรงงาน!</span>
                      </div>
                    ) : (
                      <div className="text-emerald-300 flex items-start gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>ล็อตนี้สร้างกำไรได้ตามเป้าหมาย แม้มีค่าแรงล่วงหน้าเพิ่มเติม</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: OT REQUESTS LIST WITH PLAN VS ACTUAL */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          {otRequests.map(ot => (
            <div key={ot.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-800 text-sm">{ot.id}</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                      {ot.lotNumber} • {ot.productName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ขอโดย: <strong>{ot.requestedBy}</strong> • สถานี: <strong>{ot.line}</strong> • วันที่: <strong>{ot.otDate}</strong>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  ot.status === 'APPROVED_EXECUTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {ot.status === 'APPROVED_EXECUTED' ? 'อนุมัติ & ปฏิบัติงานแล้ว' : 'รอผู้จัดการอนุมัติ'}
                </span>
              </div>

              {/* Comparison Plan vs Actual */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold">ช่วงเวลา</span>
                  <span className="font-black text-slate-800">{ot.timeSlot}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">จำนวนคน (แผน / จริง)</span>
                  <span className="font-black text-slate-800">{ot.plannedHeadcount} คน / <strong className="text-emerald-600">{ot.actualHeadcount} คน</strong></span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">ชม. รวม (แผน / จริง)</span>
                  <span className="font-black text-slate-800">{ot.plannedHours} ชม. / <strong className="text-emerald-600">{ot.actualHours} ชม.</strong></span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">ต้นทุน OT (ประมาณการ / จ่ายจริง)</span>
                  <span className="font-black text-slate-800">฿{ot.estimatedCost.toLocaleString()} / <strong className="text-amber-600">฿{ot.actualCost.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Participants Detail if executed */}
              {ot.participants.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-700 mb-2">รายชื่อพนักงานที่ลงเวลาและคำนวณต้นทุนรายคน (Employee OT Cost Log):</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {ot.participants.map(p => (
                      <div key={p.code} className="p-2.5 rounded-xl border border-slate-200/80 bg-white text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.code} • ฿{p.rate}/ชม.</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-amber-600">฿{p.cost.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{p.hours} ชม.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREATE OT REQUEST */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">เปิดคำขอทำงานล่วงเวลา (OT Request Form)</h3>
                <p className="text-xs text-slate-400">ระบุคำสั่งผลิตเพื่อคำนวณต้นทุนและตรวจสอบผลกำไรล่วงหน้า</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOtRequest} className="py-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">คำสั่งผลิต / ล็อตงาน (Production Lot) *</label>
                <select
                  value={formData.lotNumber}
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  <option value="JHD-309">JHD-309 — Diva Serum 50ml (Packing Line 2)</option>
                  <option value="JHD-318">JHD-318 — Diva Day Cream 30g (Packing Line 1)</option>
                  <option value="JHD-317">JHD-317 — Diva Body Lotion 200ml (Mixing Room 3)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">วันที่ทำ OT *</label>
                  <input
                    type="date"
                    required
                    value={formData.otDate}
                    onChange={(e) => setFormData({ ...formData, otDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">จำนวนคนที่จะขอ (คน) *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.selectedWorkersCount}
                    onChange={(e) => setFormData({ ...formData, selectedWorkersCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เวลาเริ่ม OT</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เวลาเลิก OT</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">เหตุผลและความจำเป็น *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="ระบุเหตุผล เช่น เร่งงานส่งมอบด่วนตามแผน..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                ></textarea>
              </div>

              {/* Financial Preview Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span>ประมาณการต้นทุนค่าแรง OT ล่วงหน้า (Pre-Approval Cost Estimate)</span>
                </div>
                <div className="text-amber-800 mt-1">
                  คำนวณจาก {formData.selectedWorkersCount} คน × 3 ชั่วโมง = <strong>฿{(formData.selectedWorkersCount * 3 * 70).toLocaleString()} บาท</strong>
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  เมื่อได้รับการอนุมัติและพนักงานสแกนนิ้วเลิกงานจริง ระบบจะคิดต้นทุนจริงตามนาทีที่สแกนออก
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  ส่งขออนุมัติผู้จัดการ (Submit OT)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
