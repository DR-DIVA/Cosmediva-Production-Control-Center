'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Calculator, 
  Check, 
  Edit3, 
  X, 
  Plus, 
  Clock, 
  DollarSign, 
  FileText, 
  Video, 
  Camera,
  Layers,
  Activity,
  CheckCircle2,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { calculateLaborLoss } from '@/lib/improve/cost-engine';

export default function ObservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [observation, setObservation] = useState<any>(null);

  // Human Validation State
  const [decision, setDecision] = useState<'ACCEPTED' | 'EDITED' | 'REJECTED'>('ACCEPTED');
  const [confirmedWaste, setConfirmedWaste] = useState('Motion');
  const [confirmedSecondaryWaste, setConfirmedSecondaryWaste] = useState('Transportation');
  const [confirmedRootCause, setConfirmedRootCause] = useState('');
  const [confirmedSeverity, setConfirmedSeverity] = useState('MEDIUM');
  const [reviewerComment, setReviewerComment] = useState('');
  const [validating, setValidating] = useState(false);

  // Cost Loss Calculation Form State
  const [lostMin, setLostMin] = useState<number>(1.0);
  const [freqShift, setFreqShift] = useState<number>(64.0);
  const [shiftsDay, setShiftsDay] = useState<number>(1.0);
  const [daysMonth, setDaysMonth] = useState<number>(26.0);
  const [numPeople, setNumPeople] = useState<number>(6.0);
  const [laborRate, setLaborRate] = useState<number>(85.0);
  const [calcSaving, setCalcSaving] = useState(false);

  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [projectOwner, setProjectOwner] = useState('คุณสุรชัย (IE Specialist)');
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/improve/observations/${id}`);
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        setObservation(data);

        // Pre-fill validation state from AI or previous validation
        const latestAi = data.ai_analysis?.[0];
        const val = data.validation;
        if (val) {
          setConfirmedWaste(val.confirmed_primary_waste || latestAi?.primary_waste || 'Motion');
          setConfirmedSecondaryWaste(val.confirmed_secondary_waste || latestAi?.secondary_waste || 'Transportation');
          setConfirmedRootCause(val.confirmed_root_cause || latestAi?.potential_root_cause || '');
          setConfirmedSeverity(val.confirmed_severity || data.severity || 'MEDIUM');
          setReviewerComment(val.reviewer_comment || '');
        } else if (latestAi) {
          setConfirmedWaste(latestAi.primary_waste || 'Motion');
          setConfirmedSecondaryWaste(latestAi.secondary_waste || 'Transportation');
          setConfirmedRootCause(latestAi.potential_root_cause || '');
          setConfirmedSeverity(data.severity || 'MEDIUM');
        }

        // Pre-fill loss calculation if exists
        if (data.loss_calc) {
          setLostMin(Number(data.loss_calc.lost_minutes_per_occ) || 1.0);
          setFreqShift(Number(data.loss_calc.frequency_per_shift) || 64.0);
          setShiftsDay(Number(data.loss_calc.shifts_per_day) || 1.0);
          setDaysMonth(Number(data.loss_calc.working_days_per_month) || 26.0);
          setNumPeople(Number(data.loss_calc.number_of_people) || 6.0);
          setLaborRate(Number(data.loss_calc.labor_cost_rate) || 85.0);
        }

        // Pre-fill project title
        setProjectTitle(`ปรับปรุง ${data.line_name || 'ไลน์ผลิต'}: ${data.description?.slice(0, 50)}...`);
        setProblemStatement(data.description || '');
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Loss Preview
  const lossPreview = calculateLaborLoss({
    lostMinutesPerOcc: lostMin,
    frequencyPerShift: freqShift,
    shiftsPerDay: shiftsDay,
    workingDaysPerMonth: daysMonth,
    numberOfPeople: numPeople,
    laborCostRate: laborRate
  });

  const handleSaveValidation = async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/improve/observations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'VALIDATE',
          decision,
          confirmed_primary_waste: confirmedWaste,
          confirmed_secondary_waste: confirmedSecondaryWaste,
          confirmed_root_cause: confirmedRootCause,
          confirmed_severity: confirmedSeverity,
          reviewer_comment: reviewerComment,
          reviewer_name: 'คุณอนุชา (Production Supervisor)'
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('บันทึกการยืนยันข้อเท็จจริง (Human Review) เรียบร้อยแล้ว');
        fetchDetail();
      } else {
        toast.error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleSaveLossCalculation = async () => {
    setCalcSaving(true);
    try {
      const res = await fetch(`/api/improve/observations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'CALCULATE_LOSS',
          lost_minutes_per_occ: lostMin,
          frequency_per_shift: freqShift,
          shifts_per_day: shiftsDay,
          working_days_per_month: daysMonth,
          number_of_people: numPeople,
          labor_cost_rate: laborRate
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('คำนวณและบันทึกมูลค่าความสูญเสียสำเร็จ!');
        fetchDetail();
      } else {
        toast.error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCalcSaving(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProject(true);
    try {
      const res = await fetch('/api/improve/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          problem_statement: problemStatement,
          observation_id: id,
          department_id: observation?.department_id,
          line_id: observation?.line_id,
          station_id: observation?.station_id,
          owner_name: projectOwner,
          expected_annual_saving: observation?.estimated_annual_loss || lossPreview.annualLossThb
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`สร้างโครงการปรับปรุง ${json.data.project_no} สำเร็จ!`);
        setIsProjectModalOpen(false);
        router.push('/improve/projects');
      } else {
        toast.error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingProject(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-sm">กำลังโหลดข้อมูลข้อค้นพบ...</div>;
  }

  if (!observation) {
    return <div className="py-20 text-center text-rose-500 text-sm">ไม่พบข้อมูลการเดินหน้างานนี้</div>;
  }

  const latestAi = observation.ai_analysis?.[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/improve/observations">
            <button className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-slate-900">{observation.observation_no}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                observation.status === 'VALIDATED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : observation.status === 'IMPROVEMENT_CREATED'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                {observation.status}
              </span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                {observation.severity} SEVERITY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {observation.department_name || 'Packing'} • {observation.line_name || 'Line 1'} {observation.station_name ? `• ${observation.station_name}` : ''} | บันทึกเมื่อ {new Date(observation.created_at).toLocaleString('th-TH')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsProjectModalOpen(true)}
            className="bg-[#2D2721] hover:bg-[#3D352E] text-[#D4AF37] font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            + สร้างโครงการไคเซ็น (Create Project)
          </Button>
        </div>
      </div>

      {/* Desktop Side-by-Side: Evidence vs. AI Finding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Evidence & Process Context */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              หลักฐานและสภาพจริงหน้างาน (Gemba Evidence)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs text-slate-500 font-semibold uppercase">รายละเอียดสิ่งที่พบ (Observed Condition)</Label>
              <div className="p-3.5 mt-1 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed font-medium">
                {observation.description}
              </div>
            </div>

            {/* Context Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px]">SKU / สินค้า</span>
                <span className="font-semibold text-slate-700">{observation.sku || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px]">LOT Number</span>
                <span className="font-semibold text-slate-700">{observation.lot_no || 'L2609-001'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px]">กะการทำงาน (Shift)</span>
                <span className="font-semibold text-slate-700">{observation.shift}</span>
              </div>
            </div>

            {/* Media Gallery */}
            <div>
              <Label className="text-xs text-slate-500 font-semibold uppercase">รูปภาพและคลิปหน้างาน (Photos & Videos)</Label>
              {observation.media && observation.media.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {observation.media.map((m: any, idx: number) => (
                    <div key={idx} className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-black/5 relative">
                      {m.media_type === 'VIDEO' ? (
                        <video src={m.file_url} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.file_url} alt={m.file_name} className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 mt-1">
                  ไม่มีรูปภาพหรือวิดีโอแนบ
                </div>
              )}
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100">
              <span>ผู้บันทึก: {observation.observer_name || 'คุณสมชาย (Cost Accounting Manager)'}</span>
              <span>Trace ID: {observation.id.slice(0, 8)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: AI Analysis & Multi-Agent Findings */}
        <Card className="bg-white border-amber-300 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-amber-500 to-amber-600 text-white text-[10px] font-bold rounded-bl-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI SUGGESTION ONLY (รอการตรวจสอบ)
          </div>

          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              ผลการวิเคราะห์โดย Gemba AI & IE AI
            </CardTitle>
            <CardDescription className="text-xs">
              จำแนก Lean 8 Wastes, ประเมินความเสี่ยง GMP/Quality และเสนอแนวทาง ECRS
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {latestAi ? (
              <>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="text-xs font-bold text-amber-900">{latestAi.finding_title}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                      Primary: {latestAi.primary_waste}
                    </span>
                    {latestAi.secondary_waste && (
                      <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                        Secondary: {latestAi.secondary_waste}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-slate-500 font-mono">
                      Confidence: {(Number(latestAi.confidence_score || 0.9) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 font-semibold uppercase">สาเหตุที่อาจเป็นไปได้ (Potential Root Cause)</Label>
                  <p className="text-xs sm:text-sm text-slate-800 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {latestAi.potential_root_cause}
                  </p>
                </div>

                {/* Quality & GMP Gate Badge */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Quality & GMP Safety Gate</div>
                      <div className="text-[10px] text-slate-500">
                        {latestAi.quality_risk_assessment || 'ไม่มีความเสี่ยงต่อการปนเปื้อนของผลิตภัณฑ์'}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    latestAi.gate_status === 'PASS' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {latestAi.gate_status || 'PASS'}
                  </span>
                </div>

                <div>
                  <Label className="text-xs text-slate-500 font-semibold uppercase">ข้อเสนอแนะขั้นตอนถัดไป (IE / ECRS Recommendation)</Label>
                  <p className="text-xs sm:text-sm text-slate-800 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {latestAi.recommended_next_step}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                ยังไม่มีการประมวลผลด้วย AI สำหรับรายการนี้
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Human Validation & Governance Strip */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              การยืนยันข้อเท็จจริงโดยหัวหน้างาน (Human Validation Gate)
            </CardTitle>
            <span className="text-xs text-slate-500 font-normal">
              AI ข้อเสนอแนะ → หัวหน้างานยืนยัน → เป็นข้อมูลจริงในระบบ
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-600 font-semibold">การตัดสินใจ (Decision)</Label>
              <div className="flex gap-2 mt-1">
                {(['ACCEPTED', 'EDITED', 'REJECTED'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecision(d)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                      decision === d 
                        ? 'bg-[#2D2721] text-[#D4AF37] border-[#2D2721]' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-600 font-semibold">ประเภทความสูญเปล่าที่ยืนยัน (Primary Waste)</Label>
              <select
                value={confirmedWaste}
                onChange={(e) => setConfirmedWaste(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="Motion">Motion (การเคลื่อนไหวสูญเปล่า)</option>
                <option value="Transportation">Transportation (การขนย้ายซ้ำซ้อน)</option>
                <option value="Waiting">Waiting (การรอคอย)</option>
                <option value="Defects">Defects (งานเสีย/ของเสีย)</option>
                <option value="Overproduction">Overproduction (ผลิตเกิน)</option>
                <option value="Extra Processing">Extra Processing (ขั้นตอนเกินจำเป็น)</option>
                <option value="Inventory">Inventory (สต็อกสะสม)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 font-semibold">ระดับความรุนแรงที่ยืนยัน (Confirmed Severity)</Label>
              <select
                value={confirmedSeverity}
                onChange={(e) => setConfirmedSeverity(e.target.value)}
                className="w-full mt-1 p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="LOW">ต่ำ (Low)</option>
                <option value="MEDIUM">ปานกลาง (Medium)</option>
                <option value="HIGH">สูง (High)</option>
                <option value="CRITICAL">วิกฤติ (Critical)</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-600 font-semibold">ความเห็นเพิ่มเติม / บริบทหน้างานจริง (Supervisor Comment)</Label>
            <Input
              value={reviewerComment}
              onChange={(e) => setReviewerComment(e.target.value)}
              placeholder="เช่น ยืนยันข้อเท็จจริงหน้างานจริง พนักงานต้องก้าวเท้า 200+ รอบต่อกะเนื่องจากตำแหน่งวางพาเลทอยู่ท้ายโต๊ะ"
              className="text-xs mt-1"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveValidation}
              disabled={validating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              {validating ? 'กำลังบันทึก...' : 'บันทึกการยืนยัน (Confirm Validation)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Cost of Loss Engine */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-rose-600" />
                คำนวณมูลค่าความสูญเสียทางการเงิน (Cost of Loss Engine)
              </CardTitle>
              <CardDescription className="text-xs">
                คำนวณต้นทุนค่าแรงสูญเปล่า (Labor Loss) จากเวลาสูญเปล่า ความถี่ และจำนวนพนักงานจริง
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Estimated Annual Loss</span>
              <span className="text-lg sm:text-2xl font-extrabold text-rose-600">
                ฿{lossPreview.annualLossThb.toLocaleString('th-TH', { minimumFractionDigits: 2 })}/ปี
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-[11px] text-slate-600">นาทีสูญเสีย / ครั้ง</Label>
              <Input
                type="number"
                step="0.5"
                value={lostMin}
                onChange={(e) => setLostMin(Number(e.target.value))}
                className="text-xs mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-600">ความถี่ (ครั้ง/กะ)</Label>
              <Input
                type="number"
                value={freqShift}
                onChange={(e) => setFreqShift(Number(e.target.value))}
                className="text-xs mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-600">กะทำงาน (กะ/วัน)</Label>
              <Input
                type="number"
                value={shiftsDay}
                onChange={(e) => setShiftsDay(Number(e.target.value))}
                className="text-xs mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-600">วันทำงาน (วัน/เดือน)</Label>
              <Input
                type="number"
                value={daysMonth}
                onChange={(e) => setDaysMonth(Number(e.target.value))}
                className="text-xs mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-600">จำนวนพนักงาน (คน)</Label>
              <Input
                type="number"
                value={numPeople}
                onChange={(e) => setNumPeople(Number(e.target.value))}
                className="text-xs mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-600">ค่าแรง (บาท/ชม.)</Label>
              <Input
                type="number"
                step="5"
                value={laborRate}
                onChange={(e) => setLaborRate(Number(e.target.value))}
                className="text-xs mt-1 font-mono"
              />
            </div>
          </div>

          {/* Results Display */}
          <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-rose-900 block">สมมติฐานและการคำนวณ (Calculation Trace):</span>
              <p className="text-slate-600 mt-0.5">{lossPreview.assumptionText}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0 text-right">
              <div>
                <span className="text-slate-500 block text-[10px]">ชั่วโมงสูญเสีย/เดือน</span>
                <span className="font-bold text-slate-800 text-sm">{lossPreview.lostHoursPerMonth} ชม.</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ต้นทุนสูญเสีย/เดือน</span>
                <span className="font-bold text-rose-600 text-sm">฿{lossPreview.monthlyLossThb.toLocaleString('th-TH')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveLossCalculation}
              disabled={calcSaving}
              className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold text-xs"
            >
              {calcSaving ? 'กำลังบันทึก...' : 'บันทึกการคำนวณต้นทุน (Save Cost of Loss)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Convert to Improvement Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">ยกระดับสู่โครงการปรับปรุง (Create Improvement Project)</h3>
                <p className="text-xs text-slate-500">แปลงข้อค้นพบสู่กระบวนการ PDCA เพื่อทดลองและวัดผลจริง</p>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">ชื่อโครงการ (Project Title) *</Label>
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="text-xs mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">คำอธิบายปัญหา (Problem Statement) *</Label>
                <textarea
                  rows={3}
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">ผู้รับผิดชอบโครงการ (Owner)</Label>
                  <Input
                    value={projectOwner}
                    onChange={(e) => setProjectOwner(e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">เป้าหมายลดต้นทุน (THB/Year)</Label>
                  <Input
                    type="number"
                    value={observation?.estimated_annual_loss || lossPreview.annualLossThb}
                    disabled
                    className="text-xs mt-1 bg-slate-50 font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsProjectModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={creatingProject} className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold">
                  {creatingProject ? 'กำลังสร้างโครงการ...' : 'ยืนยันสร้างโครงการไคเซ็น'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
