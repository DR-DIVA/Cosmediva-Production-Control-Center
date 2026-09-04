'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Award, 
  CheckCircle2, 
  Clock, 
  GraduationCap, 
  ArrowUpRight, 
  Plus, 
  Sparkles,
  AlertCircle,
  Search,
  BookOpen,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImproveSkill, ImproveEmployeeSkill, ImproveTrainingNeed } from '@/types/improve';

export default function SkillMatrixPage() {
  const [skills, setSkills] = useState<ImproveSkill[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<ImproveEmployeeSkill[]>([]);
  const [trainingNeeds, setTrainingNeeds] = useState<ImproveTrainingNeed[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected cell for skill level adjustment modal
  const [editingSkill, setEditingSkill] = useState<{
    record?: ImproveEmployeeSkill;
    employee_id: string;
    employee_name: string;
    skill_id: string;
    skill_name: string;
    current_level: string;
  } | null>(null);

  const [newLevel, setNewLevel] = useState<'L0' | 'L1' | 'L2' | 'L3' | 'L4'>('L3');
  const [verifierName, setVerifierName] = useState('หัวหน้างานผลิต / QA');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Create training modal
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainerName, setTrainerName] = useState('IE Specialist');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/improve/skills');
      const json = await res.json();
      if (json.success) {
        setSkills(json.skills || []);
        setEmployeeSkills(json.employeeSkills || []);
        setTrainingNeeds(json.trainingNeeds || []);
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group employee skills by employee
  const employeesMap: Record<string, { employee_id: string; employee_name: string; department_name?: string; skills: Record<string, ImproveEmployeeSkill> }> = {};

  employeeSkills.forEach(es => {
    if (!employeesMap[es.employee_id]) {
      employeesMap[es.employee_id] = {
        employee_id: es.employee_id,
        employee_name: es.employee_name,
        department_name: es.department_name,
        skills: {}
      };
    }
    employeesMap[es.employee_id].skills[es.skill_id] = es;
  });

  const employeesList = Object.values(employeesMap);

  const handleLevelUpdate = async () => {
    if (!editingSkill) return;
    try {
      setUpdating(true);
      const res = await fetch('/api/improve/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_LEVEL',
          id: editingSkill.record?.id,
          employee_id: editingSkill.employee_id,
          employee_name: editingSkill.employee_name,
          skill_id: editingSkill.skill_id,
          current_level: newLevel,
          verified_by: verifierName,
          notes: verifyNotes
        })
      });
      const json = await res.json();
      if (json.success) {
        setEditingSkill(null);
        await fetchData();
      }
    } catch (err) {
      console.error('Error updating level:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteTraining = async (trainingId: string) => {
    try {
      const res = await fetch('/api/improve/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE_TRAINING',
          id: trainingId
        })
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error completing training:', err);
    }
  };

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingTopic) return;
    try {
      const res = await fetch('/api/improve/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_TRAINING',
          training_topic: trainingTopic,
          trainer_name: trainerName,
          target_department: 'Packing'
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowTrainingModal(false);
        setTrainingTopic('');
        await fetchData();
      }
    } catch (err) {
      console.error('Error creating training:', err);
    }
  };

  // Helper for Level styling
  const renderLevelBadge = (level: string = 'L0') => {
    switch (level) {
      case 'L4':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37] text-[#2D2721] shadow-sm">
            ⭐ L4 เชี่ยวชาญ
          </span>
        );
      case 'L3':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            ✓ L3 มาตรฐาน
          </span>
        );
      case 'L2':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
            L2 ทำเองได้
          </span>
        );
      case 'L1':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
            L1 ต้องประกบ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-slate-400 bg-slate-100">
            L0 ยังไม่มี
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ตารางทักษะ & ความต้องการอบรม (Skill Matrix & Training Needs)
            </h1>
            <Badge className="bg-[#D4AF37]/20 text-[#856b18] border-[#D4AF37]/40">
              Engine 7
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เชื่อมโยงการพบข้อผิดพลาดหน้างาน (Skill Gap) สู่โปรแกรมฝึกอบรมและยกระดับความสามารถพนักงาน L0 → L4
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowTrainingModal(true)}
            className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold text-xs sm:text-sm shadow-sm"
          >
            <GraduationCap className="w-4 h-4 mr-1.5" />
            + เปิดหลักสูตรอบรมใหม่
          </Button>
        </div>
      </div>

      {/* Skill Level Definitions Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <div className="font-bold text-slate-700">L0: ยังไม่มีทักษะ</div>
          <p className="text-[11px] text-slate-500 mt-0.5">ยังไม่เคยผ่านการฝึกหรือเรียนรู้ขั้นตอน</p>
        </div>
        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
          <div className="font-bold text-amber-800">L1: ทฤษฎี / มีพี่เลี้ยง</div>
          <p className="text-[11px] text-amber-700 mt-0.5">เข้าใจขั้นตอนแต่ต้องมีคนประกบ OJT</p>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
          <div className="font-bold text-blue-800">L2: ปฏิบัติได้ด้วยตนเอง</div>
          <p className="text-[11px] text-blue-700 mt-0.5">ทำงานคนเดียวได้ แต่ความเร็วยังไม่เสถียร</p>
        </div>
        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="font-bold text-emerald-800">L3: ชำนาญตามมาตรฐาน</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">ได้ตาม Cycle Time และข้อกำหนดคุณภาพ</p>
        </div>
        <div className="p-2.5 bg-amber-100/50 rounded-lg border border-[#D4AF37]">
          <div className="font-bold text-[#856b18]">⭐ L4: ผู้เชี่ยวชาญ (Master)</div>
          <p className="text-[11px] text-[#735d14] mt-0.5">สอนงานผู้อื่นได้และเป็นผู้ประเมินผล</p>
        </div>
      </div>

      {/* Active Training Needs Alert Section */}
      {trainingNeeds.length > 0 && (
        <Card className="border border-amber-300 bg-gradient-to-r from-amber-50/70 to-white shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base font-bold text-amber-950">
                  รายการฝึกอบรมที่ตรวจพบจากหน้างาน (Training Needs Tracker)
                </CardTitle>
              </div>
              <Badge className="bg-amber-600 text-white text-xs">
                {trainingNeeds.filter(t => t.status !== 'COMPLETED').length} รอการอบรม
              </Badge>
            </div>
            <CardDescription className="text-xs text-amber-800">
              ข้อตรวจพบที่มี Skill Gap หรือ OPL ใหม่ จะถูกส่งมาเป็นแผนฝึกอบรมหน้าไลน์โดยอัตโนมัติ
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {trainingNeeds.map(tn => (
              <div 
                key={tn.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-amber-200 gap-3 hover:border-[#D4AF37] transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">
                      {tn.training_topic}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {tn.target_department || 'Packing'}
                    </Badge>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tn.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tn.status === 'COMPLETED' ? '✓ ผ่านการอบรมแล้ว' : 'กำลังดำเนินการ'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ผู้สอน: {tn.trainer_name || 'IE Team'} • กำหนดเสร็จ: {tn.target_date || 'สัปดาห์นี้'}
                  </p>
                </div>

                {tn.status !== 'COMPLETED' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleCompleteTraining(tn.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    บันทึกว่าผ่านการอบรมแล้ว
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Heatmap: Skill Matrix Table */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                เมทริกซ์ทักษะพนักงานประจำสถานี (Operator Skill Heatmap)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                คลิกที่ระดับทักษะของพนักงานเพื่อประเมินเลื่อนขั้น หรือบันทึกการสอนงาน
              </CardDescription>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
              <span>พนักงาน: {employeesList.length} คน</span>
              <span>•</span>
              <span>ทักษะหลัก: {skills.length} ทักษะ</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#D4AF37]" />
              กำลังโหลด Skill Matrix...
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="p-3 sticky left-0 bg-slate-100 z-10 w-44 font-bold border-r border-slate-200">
                    รหัส / ชื่อพนักงาน
                  </th>
                  <th className="p-3 w-28 text-center font-bold border-r border-slate-200">
                    แผนก
                  </th>
                  {skills.map(sk => (
                    <th key={sk.id} className="p-3 text-center min-w-[150px] border-r border-slate-200">
                      <div className="font-bold text-slate-900 leading-tight">
                        {sk.skill_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {sk.skill_code}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeesList.map(emp => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 sticky left-0 bg-white hover:bg-slate-50 z-10 font-medium text-slate-900 border-r border-slate-200 shadow-sm">
                      <div className="font-bold">{emp.employee_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</div>
                    </td>
                    <td className="p-3 text-center text-slate-600 border-r border-slate-200">
                      {emp.department_name || 'Packing'}
                    </td>
                    {skills.map(sk => {
                      const record = emp.skills[sk.id];
                      const currentLvl = record?.current_level || 'L0';
                      return (
                        <td 
                          key={sk.id} 
                          className="p-3 text-center border-r border-slate-200 cursor-pointer hover:bg-amber-50/40 transition-colors"
                          onClick={() => {
                            setEditingSkill({
                              record,
                              employee_id: emp.employee_id,
                              employee_name: emp.employee_name,
                              skill_id: sk.id,
                              skill_name: sk.skill_name,
                              current_level: currentLvl
                            });
                            setNewLevel(currentLvl as any);
                            setVerifyNotes(record?.notes || '');
                          }}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            {renderLevelBadge(currentLvl)}
                            {record?.verified_by && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                                โดย {record.verified_by}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Edit Skill Level */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#2D2721] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-base text-slate-100">ประเมินและปรับระดับทักษะ</h3>
              </div>
              <button 
                onClick={() => setEditingSkill(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="font-bold text-slate-900 text-sm">{editingSkill.employee_name} ({editingSkill.employee_id})</div>
                <div className="text-slate-600 mt-1">ทักษะ: <span className="font-bold text-slate-800">{editingSkill.skill_name}</span></div>
                <div className="text-slate-500 mt-0.5">ระดับปัจจุบัน: <span className="font-bold text-[#856b18]">{editingSkill.current_level}</span></div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">เลือกระดับทักษะใหม่:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['L0', 'L1', 'L2', 'L3', 'L4'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewLevel(lvl)}
                      className={`p-2 rounded-lg font-bold text-xs border text-center transition-all ${
                        newLevel === lvl 
                          ? 'bg-[#2D2721] text-[#D4AF37] border-[#D4AF37] shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ผู้ประเมิน / ตรวจสอบ (Auditor / Trainer):</label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">บันทึกผลการประเมิน / ข้อสังเกต:</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ผ่านการทดสอบพับกล่องมือเดียว 50 ชิ้นต่อนาที ไม่เกิดของเสีย"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingSkill(null)}
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleLevelUpdate}
                  disabled={updating}
                  className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold"
                >
                  {updating ? 'กำลังบันทึก...' : 'ยืนยันผลประเมิน'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Training */}
      {showTrainingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#2D2721] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-base text-slate-100">เปิดหลักสูตรฝึกอบรมหน้างาน</h3>
              </div>
              <button 
                onClick={() => setShowTrainingModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTraining} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">หัวข้อการฝึกอบรม *:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น อบรมเทคนิคการสวมฝาและปรับแรงบิด Capping Torque"
                  value={trainingTopic}
                  onChange={(e) => setTrainingTopic(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ผู้ฝึกสอน (Trainer):</label>
                <input
                  type="text"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowTrainingModal(false)}
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#D4AF37] hover:bg-[#c49f2e] text-[#2D2721] font-bold"
                >
                  บันทึกหลักสูตร
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
