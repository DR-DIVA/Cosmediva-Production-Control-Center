'use client'

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Filter, AlertTriangle, CheckCircle2, 
  UploadCloud, FileDown, Check, X, RefreshCw, ChevronRight, 
  ShieldAlert, UserCheck, AlertOctagon, Download
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

interface TimeAttendanceViewProps {
  currentPersona: Persona;
  initialTab?: 'daily' | 'exceptions' | 'import';
}

export function TimeAttendanceView({ currentPersona, initialTab = 'daily' }: TimeAttendanceViewProps) {
  const [subTab, setSubTab] = useState<'daily' | 'exceptions' | 'import'>(initialTab);
  const [date, setDate] = useState('2026-09-05');
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any>({});
  const [corrections, setCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [excFilter, setExcFilter] = useState('');

  // Correction Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<any | null>(null);
  const [adjType, setAdjType] = useState('FORGOT_CLOCK');
  const [reqIn, setReqIn] = useState('08:00');
  const [reqOut, setReqOut] = useState('17:00');
  const [adjReason, setAdjReason] = useState('');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date,
        status: statusFilter,
        department_id: deptFilter
      });
      const res = await fetch(`/api/people/attendance?${params}`);
      const json = await res.json();
      if (json.success) {
        setAttendanceList(json.data);
        setStats(json.stats);
      }
    } catch (err) {
      toast.error('ไม่สามารถโหลดข้อมูลการลงเวลาได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchExceptions = async () => {
    try {
      const params = new URLSearchParams({
        date,
        type: excFilter,
        department_id: deptFilter,
        resolved: 'false'
      });
      const res = await fetch(`/api/people/exceptions?${params}`);
      const json = await res.json();
      if (json.success) {
        setExceptions(json.data);
        setBreakdown(json.breakdown);
        setCorrections(json.corrections);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchExceptions();
  }, [date, statusFilter, deptFilter, excFilter]);

  const handleCreateCaseFromException = async (ex: any) => {
    try {
      const res = await fetch('/api/people/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CASE',
          case_type: 'Attendance',
          employee_id: ex.employee_id,
          department_id: ex.department_id,
          source_type: 'EXCEPTION',
          source_id: ex.id,
          severity: ex.severity || 'MEDIUM',
          priority: ex.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          summary: `สอบสวนกรณี ${ex.exception_type}: ${ex.first_name} ${ex.last_name}`,
          description: `เปิดสำนวนเคสจากความผิดปกติการลงเวลา: ${ex.description} วันที่ ${ex.work_date}`
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`เปิดเคสสอบสวน ${json.data.case_number} เรียบร้อยแล้ว`);
      } else {
        toast.error(json.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      toast.error('ไม่สามารถเปิดเคสได้');
    }
  };

  const handleResolveException = async (excId: string, action: string) => {
    try {
      const res = await fetch('/api/people/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE_EXCEPTION',
          id: excId,
          resolution_action: action
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchExceptions();
        fetchAttendance();
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }

    try {
      const res = await fetch('/api/people/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_CORRECTION',
          employee_id: correctionTarget?.employee_id,
          work_date: date,
          adjustment_type: adjType,
          requested_in: `${date}T${reqIn}:00+07:00`,
          requested_out: `${date}T${reqOut}:00+07:00`,
          reason: adjReason
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('ยื่นขอปรับปรุงเวลาสำเร็จ');
        setShowCorrectionModal(false);
        setAdjReason('');
        fetchExceptions();
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleApproveCorrection = async (corrId: string) => {
    try {
      const res = await fetch('/api/people/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_CORRECTION',
          id: corrId,
          reason: 'HR อนุมัติการแก้ไขเวลาตามเอกสารรับรอง'
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchExceptions();
        fetchAttendance();
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Date Navigation */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setSubTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              subTab === 'daily' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            บันทึกเวลาประจำวัน (Daily Attendance)
          </button>
          <button
            onClick={() => setSubTab('exceptions')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              subTab === 'exceptions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>ศูนย์จัดการข้อยกเว้น (Exception Center)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
              {stats.exceptions || 12}
            </span>
          </button>
          <button
            onClick={() => setSubTab('import')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              subTab === 'import' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>นำเข้าเวลาสแกน (Import)</span>
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">วันที่:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
          />
        </div>
      </div>

      {/* SUBTAB 1: DAILY ATTENDANCE */}
      {subTab === 'daily' && (
        <div className="space-y-4">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-400 font-bold block">กำหนดเข้ากะ</span>
              <span className="text-xl font-black text-slate-800">{stats.scheduled || 0}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 text-center">
              <span className="text-[11px] text-emerald-700 font-bold block">มาทำงาน</span>
              <span className="text-xl font-black text-emerald-600">{stats.present || 0}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 text-center">
              <span className="text-[11px] text-amber-700 font-bold block">มาสาย (Late)</span>
              <span className="text-xl font-black text-amber-600">{stats.late || 0}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/20 text-center">
              <span className="text-[11px] text-blue-700 font-bold block">ลางาน (Leave)</span>
              <span className="text-xl font-black text-blue-600">{stats.leave || 0}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/20 text-center">
              <span className="text-[11px] text-rose-700 font-bold block">ขาดงาน (Absent)</span>
              <span className="text-xl font-black text-rose-600">{stats.absent || 0}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-purple-200 bg-purple-50/20 text-center">
              <span className="text-[11px] text-purple-700 font-bold block">ลืมสแกนนิ้ว</span>
              <span className="text-xl font-black text-purple-600">{stats.missing || 0}</span>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm">รายการลงเวลาปฏิบัติงานจริง (Actual Punches)</h3>
              <a
                href={`/api/people/reports?type=DAILY_ATTENDANCE&date=${date}&format=csv`}
                download
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดรายงานประจำวัน</span>
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">รหัสพนักงาน</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-4">แผนก / สายงาน</th>
                    <th className="py-3 px-3 text-center">เวลากำหนด</th>
                    <th className="py-3 px-3 text-center">เวลาเข้า (In)</th>
                    <th className="py-3 px-3 text-center">เวลาออก (Out)</th>
                    <th className="py-3 px-3 text-center">สาย (นาที)</th>
                    <th className="py-3 px-3 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        กำลังโหลดข้อมูลเวลา...
                      </td>
                    </tr>
                  ) : attendanceList.length > 0 ? (
                    attendanceList.map((att) => {
                      const clockIn = att.actual_in ? new Date(att.actual_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                      const clockOut = att.actual_out ? new Date(att.actual_out).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                      const status = att.attendance_status;

                      let badge = 'bg-slate-100 text-slate-700';
                      if (status === 'Present') badge = 'bg-emerald-100 text-emerald-800';
                      else if (status === 'Late') badge = 'bg-amber-100 text-amber-800';
                      else if (status === 'Leave') badge = 'bg-blue-100 text-blue-800';
                      else if (status === 'Absent') badge = 'bg-rose-100 text-rose-800';
                      else if (status.includes('Missing')) badge = 'bg-purple-100 text-purple-800';

                      return (
                        <tr key={att.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">{att.employee_code}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {att.first_name} {att.last_name}
                            {att.nickname && <span className="text-slate-400 font-normal ml-1">({att.nickname})</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{att.department_name}</td>
                          <td className="py-3 px-3 text-center text-slate-500 font-mono">08:00 - 17:00</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{clockIn}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{clockOut}</td>
                          <td className={`py-3 px-3 text-center font-bold ${att.late_minutes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {att.late_minutes > 0 ? `${att.late_minutes} น.` : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badge}`}>
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {(status.includes('Missing') || status === 'Absent' || status === 'Late') && (
                              <button
                                onClick={() => {
                                  setCorrectionTarget(att);
                                  setShowCorrectionModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                              >
                                ขอปรับเวลา
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        ไม่มีข้อมูลการลงเวลาสำหรับวันที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ATTENDANCE EXCEPTION CENTER (MANAGE BY EXCEPTION - Section 28) */}
      {subTab === 'exceptions' && (
        <div className="space-y-5">
          {/* Exception KPI Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
              <div className="text-xs text-rose-700 font-bold">ขาดงานโดยไม่มีใบลา (Absent)</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{breakdown.ABSENT || 0} คน</div>
              <div className="text-[10px] text-slate-400 mt-0.5">ต้องติดต่อติดตามตัว</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs">
              <div className="text-xs text-purple-700 font-bold">ลืมสแกนเวลา (Missing Punch)</div>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {(breakdown.MISSING_CLOCK_IN || 0) + (breakdown.MISSING_CLOCK_OUT || 0)} คน
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">รอส่งใบรับรองเวลา</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
              <div className="text-xs text-amber-700 font-bold">เข้างานสาย (Late &gt; 15m)</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{breakdown.LATE || 0} คน</div>
              <div className="text-[10px] text-slate-400 mt-0.5">เกินช่วงผ่อนปรน</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
              <div className="text-xs text-blue-700 font-bold">คำขอแก้ไขเวลาที่รอ HR ตรวจ</div>
              <div className="text-2xl font-black text-blue-600 mt-1">{corrections.length} รายการ</div>
              <div className="text-[10px] text-slate-400 mt-0.5">รออนุมัติ</div>
            </div>
          </div>

          {/* Pending Correction Requests from Employees (Section 29) */}
          {corrections.length > 0 && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-xs p-5 space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>คำขอปรับปรุงเวลาลงเวลาที่รอ HR อนุมัติ (Correction Requests)</span>
              </h3>
              <div className="space-y-2">
                {corrections.map((corr) => (
                  <div key={corr.id} className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">
                        {corr.first_name} {corr.last_name} ({corr.employee_code}) • {corr.department_name}
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        เหตุผล: {corr.reason} (ขอแก้เป็น 08:00 - 17:00)
                      </div>
                    </div>
                    {currentPersona.role.includes('HR') || currentPersona.role === 'Admin' ? (
                      <button
                        onClick={() => handleApproveCorrection(corr.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shrink-0"
                      >
                        อนุมัติและปรับเวลา
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exceptions List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  รายการผิดปกติที่ต้องจัดการ (Actionable Exceptions)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">HR ไม่ต้องตรวจทุกคน จัดการเฉพาะรายการที่ระบบแจ้งเตือน</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">รหัส</th>
                    <th className="py-3 px-4">พนักงาน</th>
                    <th className="py-3 px-4">แผนก</th>
                    <th className="py-3 px-4">ประเภทความผิดปกติ</th>
                    <th className="py-3 px-4">รายละเอียด</th>
                    <th className="py-3 px-3 text-center">ระดับ</th>
                    <th className="py-3 px-4 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exceptions.length > 0 ? (
                    exceptions.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{ex.employee_code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{ex.first_name} {ex.last_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{ex.department_name}</td>
                        <td className="py-3.5 px-4 font-bold text-amber-700">{ex.exception_type}</td>
                        <td className="py-3.5 px-4 text-slate-600">{ex.description}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            ex.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ex.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {(currentPersona.role.includes('HR') || currentPersona.role === 'Admin') && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleResolveException(ex.id, 'WAIVE_ACCEPTED')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition"
                              >
                                ยอมรับ / ยกเว้น
                              </button>
                              <button
                                onClick={() => {
                                  setCorrectionTarget(ex);
                                  setShowCorrectionModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition"
                              >
                                แก้เวลา
                              </button>
                              <button
                                onClick={() => handleCreateCaseFromException(ex)}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition"
                                title="เปิดเคสสอบสวนความผิดปกติและรวบรวมพยานหลักฐาน"
                              >
                                เปิดเคส
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        ไม่มีความผิดปกติการลงเวลาค้างการจัดการ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ATTENDANCE IMPORT CENTER (Section 23, 24) */}
      {subTab === 'import' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="font-black text-slate-800 text-base">ศูนย์นำเข้าข้อมูลเวลาสแกน (Attendance Import Center)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              รองรับข้อมูล Log ดิบจากเครื่องสแกนลายนิ้วมือ / สแกนใบหน้า HIP และไฟล์ CSV บันทึกเวลาลง Raw Logs อัตโนมัติ
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2 text-amber-900">
            <p className="font-bold">กฎความปลอดภัยของข้อมูลดิบ (Raw Data Integrity):</p>
            <p>• ข้อมูลดิบจากเครื่องสแกนจะถูกบันทึกลง Raw Logs โดยไม่มีการแก้ไข (Immutable)</p>
            <p>• ระบบจะประมวลผลคำนวณเข้าเป็น Daily Attendance และตรวจจับข้อยกเว้นอัตโนมัติ</p>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-amber-400 transition cursor-pointer">
            <UploadCloud className="w-10 h-10 mx-auto text-amber-500 mb-2" />
            <p className="font-bold text-slate-700 text-sm">ลากไฟล์ Log หรือ CSV มาวางที่นี่</p>
            <p className="text-slate-400 text-xs mt-1">รองรับไฟล์ HIP Data, Text, หรือ CSV จากเครื่องบันทึกเวลา</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 font-mono">ตัวอย่าง: BATCH-20260905-01 (130 records processed)</span>
            <button
              onClick={async () => {
                try {
                  toast.loading('กำลังรัน Attendance Engine คำนวณเวลาและตรวจจับ Exception...');
                  const res = await fetch('/api/people/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'CALCULATE_ATTENDANCE', date })
                  });
                  const json = await res.json();
                  toast.dismiss();
                  if (json.success) {
                    toast.success(json.message);
                    fetchAttendance();
                    fetchExceptions();
                  } else {
                    toast.error(json.error || 'เกิดข้อผิดพลาด');
                  }
                } catch (e) {
                  toast.dismiss();
                  toast.error('ไม่สามารถเชื่อมต่อ Attendance Engine ได้');
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition"
            >
              ประมวลผลข้อมูลลงเวลาจริง (Run Attendance Engine)
            </button>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal (Section 29) */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">ขอปรับปรุงเวลาลงเวลา (Attendance Correction)</h3>
              <button onClick={() => setShowCorrectionModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-3">
              <div>
                <span className="text-slate-500 block">พนักงาน:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {correctionTarget?.first_name} {correctionTarget?.last_name} ({correctionTarget?.employee_code})
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">สาเหตุความผิดปกติ *</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="FORGOT_CLOCK">ลืมสแกนลายนิ้วมือ / ใบหน้า (Forgot Clock)</option>
                  <option value="DEVICE_ERROR">เครื่องลงเวลาขัดข้อง (Device Error)</option>
                  <option value="OFFICIAL_DUTY">ไปปฏิบัติหน้าที่ราชการ / ภายนอก (Official Duty)</option>
                  <option value="TRAINING">เข้ารับการฝึกอบรม (Training)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เวลาเข้าที่ถูกต้อง</label>
                  <input
                    type="time"
                    value={reqIn}
                    onChange={(e) => setReqIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เวลาออกที่ถูกต้อง</label>
                  <input
                    type="time"
                    value={reqOut}
                    onChange={(e) => setReqOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">เหตุผลและคำชี้แจง *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="ระบุเหตุผล เช่น ติดภารกิจตรวจรับสารเคมีหน้าประตูคลัง รีบเข้าสายผสม..."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  ส่งคำขอแก้ไขเวลา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
