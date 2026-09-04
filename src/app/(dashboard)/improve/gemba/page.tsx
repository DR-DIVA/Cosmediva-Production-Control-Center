'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  Video, 
  Mic, 
  MapPin, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Upload, 
  X, 
  ArrowLeft,
  Layers,
  Clock,
  ShieldAlert,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GembaCapturePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  // Master data
  const [departments, setDepartments] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  
  // Form state
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [lineId, setLineId] = useState('');
  const [stationId, setStationId] = useState('');
  const [sku, setSku] = useState('SKU-JHD-309');
  const [lotNo, setLotNo] = useState('');
  const [shift, setShift] = useState('Day Shift (08:00 - 17:00)');
  const [activityName, setActivityName] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [triggerAi, setTriggerAi] = useState(true);
  const [observerName, setObserverName] = useState('Cost Accounting Manager');
  
  // Media handling
  const [mediaFiles, setMediaFiles] = useState<{ url: string; name: string; type: 'PHOTO' | 'VIDEO' }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Recording simulation state
  const [isRecording, setIsRecording] = useState(false);

  // Dynamic creation state for Department, Line, Station
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [isCreatingDept, setIsCreatingDept] = useState(false);

  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLineName, setNewLineName] = useState('');
  const [isCreatingLine, setIsCreatingLine] = useState(false);

  const [isAddingStation, setIsAddingStation] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [isCreatingStation, setIsCreatingStation] = useState(false);

  useEffect(() => {
    fetchMasterData();
    // Check for offline cached draft
    const savedDraft = localStorage.getItem('cosmeflow_gemba_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.description) setDescription(parsed.description);
      } catch {}
    }
  }, []);

  const fetchMasterData = async () => {
    try {
      const res = await fetch('/api/improve/master');
      const json = await res.json();
      if (json.success) {
        setDepartments(json.data.departments || []);
        setLines(json.data.lines || []);
        setStations(json.data.stations || []);

        // Default to Packing department and Line 1 if available
        const pkg = json.data.departments?.find((d: any) => d.department_code === 'PKG');
        if (pkg) {
          setDepartmentId(pkg.id);
          const pkgLine = json.data.lines?.find((l: any) => l.department_id === pkg.id);
          if (pkgLine) setLineId(pkgLine.id);
        }
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video');
      const url = URL.createObjectURL(file);
      setMediaFiles(prev => [...prev, {
        url,
        name: file.name,
        type: isVideo ? 'VIDEO' : 'PHOTO'
      }]);
    }
    toast.success(`แนบไฟล์สำเร็จ ${files.length} รายการ`);
  };

  const removeMedia = (idx: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleVoiceRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info('กำลังบันทึกเสียง... (กำลังแปลงเสียงเป็นข้อความ)');
      // Simulate real-time speech recognition
      setTimeout(() => {
        setIsRecording(false);
        const voiceText = "พนักงานแพ็กกิ้งต้องเดินไปหยิบกล่องบรรจุภัณฑ์ประมาณ 6 เมตร ทุกครั้งที่แพ็กครบ 12 ชิ้น เสียเวลาก้าวเดินไปกลับสะสม";
        setDescription(prev => prev ? `${prev} ${voiceText}` : voiceText);
        toast.success('แปลงเสียงเป็นข้อความสำเร็จ!');
      }, 3500);
    } else {
      setIsRecording(false);
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    setIsCreatingDept(true);
    try {
      const res = await fetch('/api/improve/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DEPARTMENT', name: newDeptName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setDepartments(prev => [...prev, json.data]);
        setDepartmentId(json.data.id);
        setIsAddingDept(false);
        setNewDeptName('');
        toast.success(`เพิ่มแผนก "${json.data.department_name}" สำเร็จ`);
      } else {
        toast.error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleCreateLine = async () => {
    if (!newLineName.trim()) return;
    setIsCreatingLine(true);
    try {
      const res = await fetch('/api/improve/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'LINE', 
          name: newLineName.trim(),
          department_id: departmentId || null
        })
      });
      const json = await res.json();
      if (json.success) {
        setLines(prev => [...prev, json.data]);
        setLineId(json.data.id);
        setIsAddingLine(false);
        setNewLineName('');
        toast.success(`เพิ่มสายการผลิต "${json.data.line_name}" สำเร็จ`);
      } else {
        toast.error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingLine(false);
    }
  };

  const handleCreateStation = async () => {
    if (!newStationName.trim()) return;
    setIsCreatingStation(true);
    try {
      const res = await fetch('/api/improve/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'STATION', 
          name: newStationName.trim(),
          line_id: lineId || null
        })
      });
      const json = await res.json();
      if (json.success) {
        setStations(prev => [...prev, json.data]);
        setStationId(json.data.id);
        setIsAddingStation(false);
        setNewStationName('');
        toast.success(`เพิ่มสถานี "${json.data.station_name}" สำเร็จ`);
      } else {
        toast.error(json.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreatingStation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim() === '') {
      toast.error('กรุณาระบุรายละเอียดสิ่งที่พบหน้างาน (Observation Description)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description,
        department_id: departmentId || null,
        line_id: lineId || null,
        station_id: stationId || null,
        sku,
        lot_no: lotNo,
        shift,
        activity_name: activityName,
        severity,
        observer_name: observerName,
        trigger_ai: triggerAi,
        media: mediaFiles.map(m => ({
          file_url: m.url,
          file_name: m.name,
          media_type: m.type
        }))
      };

      const res = await fetch('/api/improve/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        localStorage.removeItem('cosmeflow_gemba_draft');
        toast.success('บันทึกการเดิน Gemba สำเร็จ!');
        router.push(`/improve/observations/${json.data.id}`);
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + json.error);
      }
    } catch (err: any) {
      console.error('Error submitting observation:', err);
      toast.error('ไม่สามารถบันทึกได้: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLines = lines.filter(l => !departmentId || l.department_id === departmentId);
  const filteredStations = stations.filter(s => !lineId || s.line_id === lineId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
        </button>
        <span className="text-xs font-bold text-[#8B7355] uppercase tracking-wider">
          Mobile Gemba Walk Mode
        </span>
      </div>

      <Card className="border-[#D4AF37]/40 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#2D2721] to-[#3D352E] text-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37] uppercase">
            <Camera className="w-4 h-4" /> Quick Gemba Capture (บันทึกหน้างานเร็ว 20 วินาที)
          </div>
          <CardTitle className="text-xl font-bold mt-1">
            + บันทึกสิ่งที่พบหน้างาน (New Observation)
          </CardTitle>
          <CardDescription className="text-xs text-zinc-300">
            ยึดหลัก Process &gt; Blame ไม่เน้นจับผิดคน เน้นปรับปรุงขั้นตอนและลดความสูญเปล่า
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Observation Description & Voice Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-bold text-slate-800">
                  สิ่งที่พบหน้างาน (What did you observe?) <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold transition ${
                    isRecording 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'bg-[#D4AF37]/20 text-[#8B7355] hover:bg-[#D4AF37]/30'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isRecording ? 'กำลังฟัง...' : 'พูดด้วยเสียง (Voice Note)'}
                </button>
              </div>

              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  localStorage.setItem('cosmeflow_gemba_draft', JSON.stringify({ description: e.target.value }));
                }}
                placeholder="เช่น พนักงานต้องเดินไปหยิบกล่องประมาณ 6 เมตร ทุกครั้งที่แพ็กครบ 12 ชิ้น หรือพบการวางวัสดุซ้อนกันเกินระยะเอื้อมมือ..."
                className="w-full p-3 rounded-xl border border-slate-300 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-sm text-slate-800 placeholder:text-slate-400"
                required
              />
            </div>

            {/* Photo / Video Capture Strip */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">
                หลักฐานรูปภาพ / วิดีโอ (Photo & Video Evidence)
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border-2 border-dashed border-slate-300 hover:border-[#D4AF37] rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-600 hover:text-[#8B7355] bg-slate-50 hover:bg-amber-50/50 transition cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-[#D4AF37]" />
                  <span className="text-xs font-semibold">ถ่ายภาพ / อัปโหลด</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border-2 border-dashed border-slate-300 hover:border-[#D4AF37] rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-600 hover:text-[#8B7355] bg-slate-50 hover:bg-amber-50/50 transition cursor-pointer"
                >
                  <Video className="w-6 h-6 text-[#D4AF37]" />
                  <span className="text-xs font-semibold">ถ่ายวิดีโอ (Time Study)</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Media Previews */}
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {mediaFiles.map((m, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-black/5">
                      {m.type === 'VIDEO' ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-1 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Hierarchy */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> ตำแหน่งที่พบ (Location Hierarchy)
                </div>
                <span className="text-[10px] text-slate-400 font-normal">
                  * สามารถกดเพิ่มแผนก / ไลน์ / สถานีใหม่ได้ทันที
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Department */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[11px] text-slate-600 font-semibold">แผนก (Department)</Label>
                    <button
                      type="button"
                      onClick={() => { setIsAddingDept(!isAddingDept); setNewDeptName(''); }}
                      className="text-[11px] text-[#8B7355] hover:text-[#D4AF37] font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> {isAddingDept ? 'เลือกจากรายการ' : '+ เพิ่มแผนกใหม่'}
                    </button>
                  </div>
                  {isAddingDept ? (
                    <div className="flex gap-1.5 animate-in fade-in duration-150">
                      <Input
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        placeholder="พิมพ์ชื่อแผนกใหม่..."
                        className="text-xs h-9 bg-white"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateDept(); } }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateDept}
                        disabled={isCreatingDept || !newDeptName.trim()}
                        className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] h-9 text-xs font-bold shrink-0 px-3"
                      >
                        {isCreatingDept ? '...' : 'บันทึก'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => { setIsAddingDept(false); setNewDeptName(''); }}
                        className="h-9 text-xs shrink-0"
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <select
                      value={departmentId}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingDept(true);
                        } else {
                          setDepartmentId(e.target.value);
                          setLineId('');
                          setStationId('');
                        }
                      }}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                    >
                      <option value="">-- เลือกแผนก --</option>
                      {departments.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.department_name}</option>
                      ))}
                      <option value="__ADD_NEW__" className="text-[#8B7355] font-bold bg-amber-50">
                        + เพิ่มแผนกใหม่...
                      </option>
                    </select>
                  )}
                </div>

                {/* 2. Line */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[11px] text-slate-600 font-semibold">สายการผลิต (Line)</Label>
                    <button
                      type="button"
                      onClick={() => { setIsAddingLine(!isAddingLine); setNewLineName(''); }}
                      className="text-[11px] text-[#8B7355] hover:text-[#D4AF37] font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> {isAddingLine ? 'เลือกจากรายการ' : '+ เพิ่มไลน์ใหม่'}
                    </button>
                  </div>
                  {isAddingLine ? (
                    <div className="flex gap-1.5 animate-in fade-in duration-150">
                      <Input
                        value={newLineName}
                        onChange={(e) => setNewLineName(e.target.value)}
                        placeholder="พิมพ์ชื่อไลน์ผลิตใหม่..."
                        className="text-xs h-9 bg-white"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLine(); } }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateLine}
                        disabled={isCreatingLine || !newLineName.trim()}
                        className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] h-9 text-xs font-bold shrink-0 px-3"
                      >
                        {isCreatingLine ? '...' : 'บันทึก'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => { setIsAddingLine(false); setNewLineName(''); }}
                        className="h-9 text-xs shrink-0"
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <select
                      value={lineId}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingLine(true);
                        } else {
                          setLineId(e.target.value);
                          setStationId('');
                        }
                      }}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                    >
                      <option value="">-- เลือกลายผลิต --</option>
                      {filteredLines.map((l: any) => (
                        <option key={l.id} value={l.id}>{l.line_name}</option>
                      ))}
                      <option value="__ADD_NEW__" className="text-[#8B7355] font-bold bg-amber-50">
                        + เพิ่มไลน์ผลิตใหม่...
                      </option>
                    </select>
                  )}
                </div>

                {/* 3. Station */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[11px] text-slate-600 font-semibold">สถานีการทำงาน (Station)</Label>
                    <button
                      type="button"
                      onClick={() => { setIsAddingStation(!isAddingStation); setNewStationName(''); }}
                      className="text-[11px] text-[#8B7355] hover:text-[#D4AF37] font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> {isAddingStation ? 'เลือกจากรายการ' : '+ เพิ่มสถานีใหม่'}
                    </button>
                  </div>
                  {isAddingStation ? (
                    <div className="flex gap-1.5 animate-in fade-in duration-150">
                      <Input
                        value={newStationName}
                        onChange={(e) => setNewStationName(e.target.value)}
                        placeholder="พิมพ์ชื่อสถานีการทำงานใหม่..."
                        className="text-xs h-9 bg-white"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateStation(); } }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateStation}
                        disabled={isCreatingStation || !newStationName.trim()}
                        className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] h-9 text-xs font-bold shrink-0 px-3"
                      >
                        {isCreatingStation ? '...' : 'บันทึก'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => { setIsAddingStation(false); setNewStationName(''); }}
                        className="h-9 text-xs shrink-0"
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <select
                      value={stationId}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingStation(true);
                        } else {
                          setStationId(e.target.value);
                        }
                      }}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                    >
                      <option value="">-- เลือกสถานี --</option>
                      {filteredStations.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.station_name}</option>
                      ))}
                      <option value="__ADD_NEW__" className="text-[#8B7355] font-bold bg-amber-50">
                        + เพิ่มสถานีใหม่...
                      </option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Context: SKU & LOT (Optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-slate-600">รหัสสินค้า (SKU)</Label>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-JHD-309"
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">เลขล็อต (LOT No.)</Label>
                <Input
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                  placeholder="L2609-001"
                  className="text-xs mt-1"
                />
              </div>
            </div>

            {/* Severity Rating */}
            <div>
              <Label className="text-xs font-bold text-slate-700">ระดับความรุนแรง (Severity)</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {[
                  { key: 'LOW', label: 'ต่ำ (Low)', color: 'border-slate-300 hover:border-slate-400' },
                  { key: 'MEDIUM', label: 'ปานกลาง (Med)', color: 'border-amber-300 hover:border-amber-400' },
                  { key: 'HIGH', label: 'สูง (High)', color: 'border-orange-400 hover:border-orange-500' },
                  { key: 'CRITICAL', label: 'วิกฤติ (Crit)', color: 'border-rose-500 hover:border-rose-600' }
                ].map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSeverity(s.key)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                      severity === s.key 
                        ? 'bg-[#2D2721] text-[#D4AF37] border-[#2D2721]' 
                        : `bg-white text-slate-700 ${s.color}`
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Auto Analysis Checkbox */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200">
              <input
                type="checkbox"
                id="triggerAi"
                checked={triggerAi}
                onChange={(e) => setTriggerAi(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <label htmlFor="triggerAi" className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                วิเคราะห์ด้วย Gemba AI ทันทีที่บันทึก (Lean Waste, Root Cause, Risk)
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold py-6 text-base shadow-md"
              >
                {submitting ? 'กำลังบันทึกและประมวลผล...' : 'บันทึกข้อมูล (Save Observation)'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
