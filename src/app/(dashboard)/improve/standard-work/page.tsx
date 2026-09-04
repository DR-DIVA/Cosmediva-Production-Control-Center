'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  AlertOctagon, 
  ShieldAlert, 
  FileText, 
  Sparkles, 
  ArrowRight,
  Filter,
  Eye,
  Clock,
  Layers,
  Award,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImproveStandardWork, ImproveOpl } from '@/types/improve';

export default function StandardWorkPage() {
  const [standardWorkList, setStandardWorkList] = useState<ImproveStandardWork[]>([]);
  const [opls, setOpls] = useState<ImproveOpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OPL' | 'SOP'>('OPL');
  const [selectedOpl, setSelectedOpl] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    doc_no: '',
    title: '',
    topic: '',
    why_important: '',
    wrong_method_description: '',
    correct_method_description: '',
    stop_call_wait_rule: '',
    critical_quality_points: '',
    safety_points: '',
    owner_name: 'IE Specialist'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/improve/standard-work');
      const json = await res.json();
      if (json.success) {
        setStandardWorkList(json.standardWork || []);
        setOpls(json.opls || []);
      }
    } catch (err) {
      console.error('Error fetching standard work:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.topic) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/improve/standard-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SOP',
          doc_no: formData.doc_no || undefined,
          title: formData.title,
          topic: formData.topic,
          why_important: formData.why_important,
          wrong_method_description: formData.wrong_method_description,
          correct_method_description: formData.correct_method_description,
          stop_call_wait_rule: formData.stop_call_wait_rule,
          critical_quality_points: formData.critical_quality_points,
          safety_points: formData.safety_points,
          owner_name: formData.owner_name
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setFormData({
          doc_no: '',
          title: '',
          topic: '',
          why_important: '',
          wrong_method_description: '',
          correct_method_description: '',
          stop_call_wait_rule: '',
          critical_quality_points: '',
          safety_points: '',
          owner_name: 'IE Specialist'
        });
        await fetchData();
      }
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ห้องสมุดมาตรฐานงาน & OPL (Standard Work & Digital OPL)
            </h1>
            <Badge className="bg-[#D4AF37]/20 text-[#856b18] border-[#D4AF37]/40">
              Engine 6
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            แปลงปัญหาหน้างานเป็นสื่อสอนงาน 1 จุด (One Point Lesson) พร้อมเปรียบเทียบ วิธีเดิม ❌ vs วิธีที่ถูกต้อง ✅
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold text-xs sm:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + สร้าง OPL / SOP ใหม่
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('OPL')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'OPL'
              ? 'bg-[#2D2721] text-[#D4AF37] shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          บทเรียนสอนงาน 1 จุด (Digital OPL)
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-[#D4AF37]/20 text-[#D4AF37]">
            {opls.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SOP')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'SOP'
              ? 'bg-[#2D2721] text-[#D4AF37] shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          ขั้นตอนปฏิบัติงานมาตรฐาน (Standard Work / SOP)
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">
            {standardWorkList.length}
          </span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#D4AF37]" />
          กำลังโหลดข้อมูลมาตรฐานงานและ OPL...
        </div>
      ) : activeTab === 'OPL' ? (
        /* OPL View */
        <div className="space-y-6">
          {opls.length === 0 ? (
            <Card className="p-8 text-center bg-slate-50 border-dashed">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">ยังไม่มีบทเรียน OPL</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                คุณสามารถสร้างบทเรียนสอนงานจากโครงการไคเซ็นที่ผ่านการรับรองแล้วได้ทันที
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-[#D4AF37] text-[#2D2721]">
                + สร้าง OPL ใบแรก
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opls.map((opl) => (
                <Card 
                  key={opl.id} 
                  className="border border-slate-200 hover:border-[#D4AF37]/60 transition-all shadow-sm overflow-hidden bg-white"
                >
                  <div className="bg-gradient-to-r from-[#2D2721] to-[#3a322b] text-white p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#D4AF37] font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                          {opl.opl_no}
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                          {opl.status || 'APPROVED'}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-slate-100 mt-1.5 leading-snug">
                        {opl.topic}
                      </h3>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedOpl(opl)}
                      className="text-[#D4AF37] hover:bg-white/10 hover:text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Why Important */}
                    {opl.why_important && (
                      <div className="bg-amber-50/80 border-l-4 border-amber-500 p-3 rounded-r-md">
                        <p className="text-xs font-semibold text-amber-900">
                          💡 ทำไมต้องทำตามมาตรฐานนี้:
                        </p>
                        <p className="text-xs text-amber-800 mt-0.5">
                          {opl.why_important}
                        </p>
                      </div>
                    )}

                    {/* Comparison Box: Wrong vs Correct */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Wrong Method */}
                      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                          <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">
                            ❌
                          </span>
                          วิธีเดิม / ที่ไม่ถูกต้อง
                        </div>
                        <p className="text-xs text-rose-900 leading-relaxed min-h-[48px]">
                          {opl.wrong_method_description || 'ไม่มีข้อมูลระบุ'}
                        </p>
                      </div>

                      {/* Correct Method */}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">
                            ✅
                          </span>
                          วิธีใหม่ตามมาตรฐาน (Standard)
                        </div>
                        <p className="text-xs text-emerald-900 leading-relaxed min-h-[48px]">
                          {opl.correct_method_description || 'ไม่มีข้อมูลระบุ'}
                        </p>
                      </div>
                    </div>

                    {/* Stop-Call-Wait rule */}
                    {opl.stop_call_wait_rule && (
                      <div className="flex items-start gap-2 bg-slate-900 text-slate-100 p-2.5 rounded-lg text-xs">
                        <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-rose-400">กฎ หยุด-เรียก-รอ (Stop-Call-Wait): </span>
                          <span className="text-slate-300">{opl.stop_call_wait_rule}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SOP / Work Instruction View */
        <div className="space-y-4">
          {standardWorkList.map((sw) => (
            <Card key={sw.id} className="border border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border">
                      {sw.doc_no}
                    </span>
                    <Badge variant="outline" className="text-xs font-medium">
                      {sw.revision}
                    </Badge>
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      {sw.status}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {sw.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ผู้จัดทำ: {sw.owner_name} • ผู้ตรวจประเมิน QA: {sw.qa_approver_name || 'QA Compliance'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/improve/time-study`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      เปิด Time Study
                    </Button>
                  </Link>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Steps Table */}
                {Array.isArray(sw.steps_summary) && sw.steps_summary.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                      ขั้นตอนปฏิบัติงานมาตรฐาน (Work Sequence):
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                          <tr>
                            <th className="p-2.5 w-16 text-center">ลำดับ</th>
                            <th className="p-2.5">คำอธิบายขั้นตอนการทำงาน</th>
                            <th className="p-2.5 w-28 text-center">เวลามาตรฐาน</th>
                            <th className="p-2.5 w-24 text-center">ประเภท</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {sw.steps_summary.map((st, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center font-bold text-slate-600">{st.step || idx + 1}</td>
                              <td className="p-2.5 font-medium">{st.action}</td>
                              <td className="p-2.5 text-center font-mono">
                                {st.time_sec ? `${st.time_sec} วินาที` : '-'}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  st.type === 'VA' ? 'bg-emerald-100 text-emerald-800' :
                                  st.type === 'NNVA' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {st.type || 'VA'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Key Quality & Safety Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <span className="font-bold text-blue-900 block mb-1">
                      🔍 จุดควบคุมคุณภาพ (Quality Checkpoints):
                    </span>
                    <p className="text-blue-800">{sw.critical_quality_points || 'ตามข้อกำหนด Batch Record'}</p>
                  </div>
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <span className="font-bold text-amber-900 block mb-1">
                      🛡️ ความปลอดภัย & กายศาสตร์ (Ergonomics):
                    </span>
                    <p className="text-amber-800">{sw.safety_points || 'รักษาท่าทางไม่เอี้ยวตัวเกินพิกัด'}</p>
                  </div>
                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg">
                    <span className="font-bold text-rose-900 block mb-1">
                      ⚠️ ข้อผิดพลาดที่พบบ่อย (Common Mistakes):
                    </span>
                    <p className="text-rose-800">{sw.common_mistakes || 'จัดวางชิ้นงานไกลเกินระยะเอื้อม'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Create OPL / SOP */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#2D2721] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-base text-slate-100">สร้างมาตรฐานงาน & OPL สอนงานใหม่</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">รหัสเอกสาร (Doc No.):</label>
                  <input
                    type="text"
                    placeholder="เช่น SOP-PKG-025 หรือเว้นว่างเพื่อสร้างอัตโนมัติ"
                    value={formData.doc_no}
                    onChange={(e) => setFormData({ ...formData, doc_no: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ผู้จัดทำ (Owner):</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full border rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ชื่อขั้นตอนปฏิบัติงาน (SOP Title) *:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น มาตรฐานการตรวจสอบรอยปิดผนึกฟิล์ม POF ชริ้งค์แผง"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">หัวข้อบทเรียน OPL (Topic) *:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เทคนิคการจัดมุมฟิล์มและอุณหภูมิความร้อนที่ถูกต้อง"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ทำไมต้องทำตามมาตรฐานนี้ (Why Important):</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ป้องกันฟิล์มย่น รอยรั่ว และลดของเสีย Rework ชิ้นละ 2.5 บาท"
                  value={formData.why_important}
                  onChange={(e) => setFormData({ ...formData, why_important: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <label className="font-bold text-rose-800 block mb-1">❌ วิธีเดิม / ที่ผิด (Wrong Method):</label>
                  <textarea
                    rows={3}
                    placeholder="พนักงานดึงฟิล์มตึงเกินไป หรือตั้งความร้อนต่ำทำให้เกิดรอยยับ"
                    value={formData.wrong_method_description}
                    onChange={(e) => setFormData({ ...formData, wrong_method_description: e.target.value })}
                    className="w-full border border-rose-300 rounded-md p-2 text-xs bg-white"
                  />
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <label className="font-bold text-emerald-800 block mb-1">✅ วิธีที่ถูกต้อง (Correct Standard):</label>
                  <textarea
                    rows={3}
                    placeholder="ปรับอุณหภูมิ 145°C และเว้นระยะเผื่อขอบ 1.5 ซม. สม่ำเสมอ"
                    value={formData.correct_method_description}
                    onChange={(e) => setFormData({ ...formData, correct_method_description: e.target.value })}
                    className="w-full border border-emerald-300 rounded-md p-2 text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">กฎ หยุด-เรียก-รอ (Stop-Call-Wait Rule):</label>
                <input
                  type="text"
                  placeholder="เช่น หากพบรอยขาดเกิน 2 ชิ้นติดกัน ให้หยุดเครื่องและแจ้งหัวหน้างานทันที"
                  value={formData.stop_call_wait_rule}
                  onChange={(e) => setFormData({ ...formData, stop_call_wait_rule: e.target.value })}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกมาตรฐาน & OPL'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
