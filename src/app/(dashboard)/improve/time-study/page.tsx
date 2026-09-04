'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Video, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowLeft,
  Scissors,
  ArrowRight,
  PieChart as PieIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ActivitySegment {
  id: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  activityName: string;
  category: 'VALUE_ADDED' | 'NECESSARY_NVA' | 'WASTE';
  notes?: string;
}

export default function TimeStudyPage() {
  const [stationName, setStationName] = useState('Packing Line 1 — Station 2 (Capping & Packaging)');
  const [sku, setSku] = useState('SKU-JHD-309 Brightening Serum 30ml');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Initial activities from pilot scenario (Section 10 of manifesto)
  const [segments, setSegments] = useState<ActivitySegment[]>([
    { id: '1', startTime: '00:00', endTime: '00:12', durationSec: 12, activityName: 'หยิบขวดจากสายพานป้อน (Pick bottle)', category: 'VALUE_ADDED' },
    { id: '2', startTime: '00:12', endTime: '00:18', durationSec: 6, activityName: 'ตรวจเช็กความสะอาดและระดับของเหลว (Inspect)', category: 'NECESSARY_NVA' },
    { id: '3', startTime: '00:18', endTime: '00:25', durationSec: 7, activityName: 'สวมหัวปั๊มและขันฝาเกลียว (Insert & cap)', category: 'VALUE_ADDED' },
    { id: '4', startTime: '00:25', endTime: '00:36', durationSec: 11, activityName: 'เดินไปหยิบกล่องเปล่าที่พาเลทท้ายแถว 6 เมตร (Walk)', category: 'WASTE' },
    { id: '5', startTime: '00:36', endTime: '00:45', durationSec: 9, activityName: 'กางกล่องและบรรจุขวดลงกล่อง (Pick carton & pack)', category: 'VALUE_ADDED' },
    { id: '6', startTime: '00:45', endTime: '00:53', durationSec: 8, activityName: 'เดินกลับมายังโต๊ะปฏิบัติการ (Return walk)', category: 'WASTE' },
  ]);

  // Form for adding new segment
  const [newStart, setNewStart] = useState('00:53');
  const [newEnd, setNewEnd] = useState('01:00');
  const [newDuration, setNewDuration] = useState(7);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'VALUE_ADDED' | 'NECESSARY_NVA' | 'WASTE'>('VALUE_ADDED');

  // Calculations
  const totalCycleTime = segments.reduce((acc, s) => acc + s.durationSec, 0);
  const valueAddedTime = segments.filter(s => s.category === 'VALUE_ADDED').reduce((acc, s) => acc + s.durationSec, 0);
  const necessaryNvaTime = segments.filter(s => s.category === 'NECESSARY_NVA').reduce((acc, s) => acc + s.durationSec, 0);
  const wasteTime = segments.filter(s => s.category === 'WASTE').reduce((acc, s) => acc + s.durationSec, 0);

  const vaRatio = totalCycleTime > 0 ? ((valueAddedTime / totalCycleTime) * 100).toFixed(1) : '0';
  const wasteRatio = totalCycleTime > 0 ? ((wasteTime / totalCycleTime) * 100).toFixed(1) : '0';

  // Target Cycle Time (Eliminating Walking Waste: 53s - 19s = 34s ~ 39s)
  const afterCycleTime = valueAddedTime + necessaryNvaTime;
  const improvementPct = totalCycleTime > 0 ? (((totalCycleTime - afterCycleTime) / totalCycleTime) * 100).toFixed(1) : '0';

  const handleAddSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('กรุณาระบุชื่อกิจกรรม');
      return;
    }
    const newSeg: ActivitySegment = {
      id: Date.now().toString(),
      startTime: newStart,
      endTime: newEnd,
      durationSec: Number(newDuration) || 1,
      activityName: newName,
      category: newCategory
    };
    setSegments(prev => [...prev, newSeg]);
    setNewName('');
    toast.success('เพิ่มขั้นตอนการทำงานสำเร็จ');
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/improve">
              <button className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-2xs">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              วิดีโอ Time Study &amp; จำแนกคุณค่า (VA / NNVA / Waste)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-8">
            เครื่องมือแยกแยะเวลา: กิจกรรมที่เพิ่มมูลค่า (Value Added) vs. งานที่ไม่เพิ่มมูลค่าแต่จำเป็น (NNVA) vs. ความสูญเปล่าที่ต้องตัดทิ้ง (Waste)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/improve/standard-work">
            <Button className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold text-xs shadow-sm">
              แปลงเป็น Standard Work / OPL
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-900 text-white border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase">Total Cycle Time (ก่อนปรับปรุง)</span>
            <CardTitle className="text-3xl font-extrabold text-[#D4AF37]">
              {totalCycleTime} <span className="text-base font-normal text-zinc-300">วินาที/ชิ้น</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[11px] text-zinc-400">กำลังผลิตปัจจุบัน: {(3600 / (totalCycleTime || 1)).toFixed(0)} ชิ้น/ชม.</span>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] text-emerald-700 font-semibold uppercase">Value Added (VA)</span>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">
              {valueAddedTime} <span className="text-base font-normal text-emerald-700">วินาที ({vaRatio}%)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[11px] text-emerald-700">ขั้นตอนที่ลูกค้าจ่ายเงินซื้อจริง (ประกอบ/บรรจุ)</span>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200 text-amber-900 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] text-amber-700 font-semibold uppercase">Necessary NVA (NNVA)</span>
            <CardTitle className="text-3xl font-extrabold text-amber-600">
              {necessaryNvaTime} <span className="text-base font-normal text-amber-700">วินาที</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[11px] text-amber-700">จำเป็นต้องทำตามมาตรฐาน GMP/QC (ตรวจเช็ก)</span>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-200 text-rose-900 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] text-rose-700 font-semibold uppercase">Waste (สูญเปล่าที่ตัดได้)</span>
            <CardTitle className="text-3xl font-extrabold text-rose-600">
              {wasteTime} <span className="text-base font-normal text-rose-700">วินาที ({wasteRatio}%)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[11px] text-rose-700">การเดินไป-กลับหยิบกล่อง (ECRS: Rearrange)</span>
          </CardContent>
        </Card>
      </div>

      {/* Target & ECRS Improvement Forecast Strip */}
      <div className="bg-gradient-to-r from-[#2D2721] to-[#3D352E] p-4 sm:p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#D4AF37]/30 shadow-sm">
        <div>
          <span className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> ECRS Lean Re-layout Target (ผลลัพธ์หลังจัดวางใหม่)
          </span>
          <div className="text-sm sm:text-base font-medium text-zinc-200 mt-1">
            เมื่อย้ายจุดจ่ายกล่องมาไว้ข้างมือ (Normal Reach Zone) Cycle Time จะลดลงเหลือ <span className="text-[#D4AF37] font-bold">{afterCycleTime} วินาที</span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block uppercase">Productivity Gain</span>
            <span className="text-2xl font-extrabold text-emerald-400">+{improvementPct}%</span>
          </div>
          <div className="text-right border-l border-zinc-700 pl-4">
            <span className="text-[10px] text-zinc-400 block uppercase">New Output / Hour</span>
            <span className="text-2xl font-extrabold text-white">{(3600 / (afterCycleTime || 1)).toFixed(0)} ชิ้น</span>
          </div>
        </div>
      </div>

      {/* Activity Breakdown Table */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              ตารางวิเคราะห์ขั้นตอนและสัดส่วนเวลา (Video Activity Breakdown)
            </CardTitle>
            <CardDescription className="text-xs">
              {stationName} | {sku}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">ช่วงเวลา (Time)</th>
                  <th className="py-3 px-4">วินาที</th>
                  <th className="py-3 px-4">กิจกรรมที่ทำ (Activity Description)</th>
                  <th className="py-3 px-4">การจำแนกคุณค่า (Classification)</th>
                  <th className="py-3 px-4 text-right">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {segments.map((seg) => (
                  <tr key={seg.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {seg.startTime} – {seg.endTime}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {seg.durationSec} วินาที
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {seg.activityName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {seg.category === 'VALUE_ADDED' && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded border border-emerald-200">
                          Value Added (VA)
                        </span>
                      )}
                      {seg.category === 'NECESSARY_NVA' && (
                        <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded border border-amber-200">
                          Necessary NVA (NNVA)
                        </span>
                      )}
                      {seg.category === 'WASTE' && (
                        <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded border border-rose-200 animate-pulse">
                          ❌ Waste (สูญเปล่า)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteSegment(seg.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Activity Form */}
          <form onSubmit={handleAddSegment} className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end">
            <div>
              <Label className="text-[10px] text-slate-500">เวลาเริ่ม</Label>
              <Input
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                placeholder="00:53"
                className="text-xs h-8 font-mono bg-white mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">เวลาสิ้นสุด</Label>
              <Input
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                placeholder="01:00"
                className="text-xs h-8 font-mono bg-white mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">วินาที</Label>
              <Input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="text-xs h-8 font-mono bg-white mt-0.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px] text-slate-500">ชื่อกิจกรรม</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="เช่น ขยับถาดรองรับ..."
                className="text-xs h-8 bg-white mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">ประเภทคุณค่า</Label>
              <div className="flex gap-1.5 mt-0.5">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full text-xs h-8 p-1 rounded-md border border-slate-300 bg-white"
                >
                  <option value="VALUE_ADDED">VA (เพิ่มมูลค่า)</option>
                  <option value="NECESSARY_NVA">NNVA (จำเป็น)</option>
                  <option value="WASTE">Waste (สูญเปล่า)</option>
                </select>
                <Button type="submit" size="sm" className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] h-8 font-bold text-xs shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
