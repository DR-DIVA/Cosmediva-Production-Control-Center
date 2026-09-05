'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar, Clock, Plus, Filter, AlertTriangle, CheckCircle2, 
  XCircle, Ban, FileText, ChevronRight, Check, X, Sparkles, 
  Info, AlertCircle, RefreshCw, Camera, Image, Upload, 
  Trash2, Eye, UserCheck, Search, ShieldCheck
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

export interface UploadedAttachment {
  id: string;
  name: string;
  url: string;
  size: string;
  type: 'camera' | 'upload';
}

export interface ApproverOption {
  id: string;
  employee_code: string;
  name: string;
  role: string;
  department: string;
  email?: string;
}

export const DEFAULT_APPROVERS: ApproverOption[] = [
  {
    id: 'sup-cps-id',
    employee_code: 'PDT-CPS001',
    name: 'ดร.ภญ. ชมพูนุช แสวงศักดิ์',
    role: 'ผู้อำนวยการโรงงาน (Factory Director)',
    department: 'ฝ่ายบริหารโรงงาน',
    email: 'chompoonuch@cosmediva.co.th'
  },
  {
    id: 'pk-bjp-id',
    employee_code: 'PK-BJP518',
    name: 'คุณเบ็ญจพร พูลสวัสดิ์',
    role: 'หัวหน้าแผนกบรรจุ (Packing Head)',
    department: 'ฝ่ายผลิต แผนกบรรจุ PK',
    email: 'benjaporn@cosmediva.co.th'
  },
  {
    id: 'hr-ans-id',
    employee_code: 'HR-ANS1886',
    name: 'คุณเอนก ศรีสุรินทร์',
    role: 'ผู้จัดการฝ่ายบริหารทรัพยากรบุคคล (HR Manager)',
    department: 'ฝ่ายทรัพยากรบุคคล (Human Resources)',
    email: 'anek@cosmediva.co.th'
  },
  {
    id: 'wh-sab-id',
    employee_code: 'MM-SAB1931',
    name: 'คุณศราวุฒิ บุตรพรม',
    role: 'ผู้จัดการคลังสินค้า (Warehouse Manager)',
    department: 'ฝ่ายบริหารคลังสินค้า MM-PM/FG',
    email: 'sarawut@cosmediva.co.th'
  },
  {
    id: 'pk-pit-id',
    employee_code: 'PK-PIT266',
    name: 'คุณพิมพ์วรีย์ เติมสายทอง',
    role: 'หัวหน้าห้องบรรจุ (Packing Supervisor)',
    department: 'ฝ่ายผลิต แผนกบรรจุและแพ๊กกิ้ง PK',
    email: 'pimwaree@cosmediva.co.th'
  },
  {
    id: 'mx-ktj-id',
    employee_code: 'MX-KTJ620',
    name: 'คุณกิตติศักดิ์ จิระพนาวัลย์',
    role: 'หัวหน้าห้องผสม (Mixing Supervisor)',
    department: 'ฝ่ายผลิต แผนกผสม MX',
    email: 'kittisak@cosmediva.co.th'
  },
  {
    id: 'qc-ttm-id',
    employee_code: 'QC-TTM181',
    name: 'คุณฐิติกาญจน์ มากราย',
    role: 'หัวหน้าแผนกควบคุมคุณภาพ (QC Head)',
    department: 'ฝ่ายควบคุมคุณภาพ (Quality Control)',
    email: 'thitikarn@cosmediva.co.th'
  },
  {
    id: 'qa-bup-id',
    employee_code: 'QA-BUP1677',
    name: 'คุณบรรเจิด พึ่งกระจ่าง',
    role: 'ผู้จัดการฝ่ายประกันคุณภาพ (QA Manager)',
    department: 'ฝ่ายประกันคุณภาพ (Quality Assurance)',
    email: 'banjerd@cosmediva.co.th'
  },
  {
    id: 'rd-sik-id',
    employee_code: 'RD-SIK1895',
    name: 'คุณสิดาพันธ์ คชรินทร์',
    role: 'ผู้จัดการฝ่ายวิจัยและพัฒนาผลิตภัณฑ์ (R&D Manager)',
    department: 'ฝ่ายวิจัยและพัฒนาสูตร (R&D)',
    email: 'sidapan@cosmediva.co.th'
  },
  {
    id: 'exec-id',
    employee_code: 'PDT-CPS001',
    name: 'ดร.ภญ. ชมพูนุช แสวงศักดิ์',
    role: 'กรรมการผู้จัดการ (Managing Director)',
    department: 'ฝ่ายบริหารสูงสุด',
    email: 'chompoonuch@cosmediva.co.th'
  }
];

interface LeaveManagementViewProps {
  currentPersona: Persona;
  onRequestLeave: () => void;
  showRequestModal: boolean;
  setShowRequestModal: (show: boolean) => void;
}

export function LeaveManagementView({
  currentPersona,
  onRequestLeave,
  showRequestModal,
  setShowRequestModal
}: LeaveManagementViewProps) {
  const [subTab, setSubTab] = useState<'requests' | 'balances' | 'calendar' | 'ledger'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [calendarData, setCalendarData] = useState<{ holidays: any[]; leaves: any[] }>({ holidays: [], leaves: [] });
  const [loading, setLoading] = useState(true);

  // Leave Form state
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('2026-09-08');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('2026-09-08');
  const [endTime, setEndTime] = useState('17:00');
  const [durationType, setDurationType] = useState('FULL_DAY');
  const [reason, setReason] = useState('');
  const [approverEmail, setApproverEmail] = useState('supervisor@cosmediva.com');
  const [isEmergency, setIsEmergency] = useState(false);
  const [contact, setContact] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [selectedCalDate, setSelectedCalDate] = useState('2026-04-17');
  const [calcFeedback, setCalcFeedback] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New states for Camera, File Attachments, and Approver Selection
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState<string>('sup-cps-id');
  const [approverSearch, setApproverSearch] = useState('');
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Approver auto-selection based on persona department
  useEffect(() => {
    const dept = currentPersona?.dept || '';
    if (dept === 'MM') {
      setSelectedApproverId('wh-sab-id');
    } else if (dept === 'HR') {
      setSelectedApproverId('hr-ans-id');
    } else if (dept === 'PK') {
      setSelectedApproverId('pk-pit-id');
    } else if (dept === 'MX') {
      setSelectedApproverId('mx-ktj-id');
    } else if (dept === 'QC') {
      setSelectedApproverId('qc-ttm-id');
    } else if (dept === 'QA') {
      setSelectedApproverId('qa-bup-id');
    } else if (dept === 'RD') {
      setSelectedApproverId('rd-sik-id');
    } else {
      setSelectedApproverId('sup-cps-id');
    }
  }, [currentPersona]);

  const selectedApprover = useMemo(() => {
    return DEFAULT_APPROVERS.find(a => a.id === selectedApproverId || a.employee_code === selectedApproverId) || DEFAULT_APPROVERS[0];
  }, [selectedApproverId]);

  const filteredApprovers = useMemo(() => {
    if (!approverSearch.trim()) return DEFAULT_APPROVERS;
    const q = approverSearch.toLowerCase();
    return DEFAULT_APPROVERS.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.department.toLowerCase().includes(q) ||
      a.employee_code.toLowerCase().includes(q)
    );
  }, [approverSearch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'camera' | 'upload') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`ไฟล์ ${file.name} มีขนาดเกิน 8MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          const newAtt: UploadedAttachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name || (type === 'camera' ? `ภาพถ่าย_${new Date().toLocaleTimeString('th-TH')}.jpg` : 'เอกสารแนบ'),
            url: base64,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            type
          };
          setAttachments(prev => [...prev, newAtt]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Fetch data
  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      // Determine employeeId for query based on persona
      const empRes = await fetch(`/api/people/employees?search=${currentPersona.code}&limit=1`);
      const empJson = await empRes.json();
      const emp = empJson.data?.[0];
      const empId = emp ? emp.id : null;

      if (empId) {
        // Fetch balances
        const bRes = await fetch(`/api/people/leave?view=balances&employee_id=${empId}`);
        const bJson = await bRes.json();
        if (bJson.success) setBalances(bJson.data);

        // Fetch requests
        const rRes = await fetch(`/api/people/leave?view=requests&employee_id=${empId}`);
        const rJson = await rRes.json();
        if (rJson.success) setRequests(rJson.data);

        // Fetch ledger
        const lRes = await fetch(`/api/people/leave?view=ledger&employee_id=${empId}`);
        const lJson = await lRes.json();
        if (lJson.success) setLedger(lJson.data);
      }

      // Fetch calendar
      const cRes = await fetch(`/api/people/leave?view=calendar`);
      const cJson = await cRes.json();
      if (cJson.success) {
        setCalendarData({ holidays: cJson.holidays, leaves: cJson.leaves });
      }

      // Fetch policies / leave types for dropdown
      const pRes = await fetch(`/api/people/leave?view=policies`);
      const pJson = await pRes.json();
      if (pJson.success) {
        setLeaveTypes(pJson.data);
        if (pJson.data.length > 0 && !selectedType) {
          setSelectedType(pJson.data[0].leave_type_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [currentPersona]);

  // Real-time pre-validation check
  useEffect(() => {
    const validateRequest = async () => {
      if (!selectedType || !startDate || !endDate) return;

      const empRes = await fetch(`/api/people/employees?search=${currentPersona.code}&limit=1`);
      const empJson = await empRes.json();
      const empId = empJson.data?.[0]?.id;
      if (!empId) return;

      try {
        const res = await fetch('/api/people/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: empId,
            leave_type_id: selectedType,
            start_date: startDate,
            end_date: endDate,
            duration_type: durationType,
            reason: reason || 'ตรวจสอบสิทธิ์',
            is_emergency: isEmergency,
            attachment_url: attachmentUrl,
            validate_only: true
          })
        });
        const json = await res.json();
        setCalcFeedback(json);
      } catch (e) {
        // ignore
      }
    };

    const timer = setTimeout(validateRequest, 300);
    return () => clearTimeout(timer);
  }, [selectedType, startDate, endDate, durationType, isEmergency, attachmentUrl, currentPersona]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error('กรุณาระบุเหตุผลการลา');
      return;
    }

    try {
      setSubmitting(true);
      const empRes = await fetch(`/api/people/employees?search=${currentPersona.code}&limit=1`);
      const empJson = await empRes.json();
      const empId = empJson.data?.[0]?.id;
      if (!empId) {
        toast.error('ไม่พบพนักงานในระบบ');
        return;
      }

      // Serialize attachments into JSON if present
      let finalAttachmentPayload = attachmentUrl;
      if (attachments.length > 0) {
        finalAttachmentPayload = JSON.stringify(attachments.map(a => ({
          id: a.id,
          name: a.name,
          url: a.url,
          size: a.size,
          type: a.type
        })));
      }

      const res = await fetch('/api/people/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          leave_type_id: selectedType,
          start_date: startDate,
          end_date: endDate,
          duration_type: durationType,
          reason,
          is_emergency: isEmergency,
          contact_during_leave: contact,
          attachment_url: finalAttachmentPayload,
          approver_id: selectedApprover?.employee_code || selectedApprover?.id
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'ยื่นคำขอลาสำเร็จ และส่งแจ้งเตือนเข้า Inbox หัวหน้าแล้ว');
        setShowRequestModal(false);
        setReason('');
        setAttachments([]);
        setAttachmentUrl('');
        fetchLeaveData();
      } else {
        toast.error(json.error || 'ไม่สามารถยื่นคำขอลาได้');
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการยื่นคำขอลา');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (reqId: string) => {
    if (!confirm('ยืนยันการยกเลิกคำขอลานี้? ระบบจะคืนสิทธิ์วันลาให้อัตโนมัติ')) return;

    try {
      const res = await fetch('/api/people/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reqId, reason: 'พนักงานขอยกเลิกเอง' })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchLeaveData();
      } else {
        toast.error(json.error);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการยกเลิก');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Tabs & Request CTA */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setSubTab('requests')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'requests' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            คำขอลาของฉัน (My Requests)
          </button>
          <button
            onClick={() => setSubTab('balances')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'balances' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            สิทธิ์วันลาคงเหลือ (Balances)
          </button>
          <button
            onClick={() => setSubTab('calendar')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ปฏิทินวันลา & วันหยุด (Calendar)
          </button>
          <button
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-1.5 rounded-lg transition ${
              subTab === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            สมุดบัญชีวันลา (Ledger)
          </button>
        </div>

        <button
          onClick={onRequestLeave}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ยื่นคำขอลา (Request Leave)</span>
        </button>
      </div>

      {/* SUBTAB 1: REQUESTS LIST */}
      {subTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm">ประวัติคำขอลา (Leave Requests History)</h3>
            <span className="text-xs text-slate-400 font-bold">{requests.length} รายการ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">เลขที่คำขอ</th>
                  <th className="py-3 px-4">ประเภทการลา</th>
                  <th className="py-3 px-4">วันที่ลา</th>
                  <th className="py-3 px-3 text-center">จำนวนวัน</th>
                  <th className="py-3 px-4">เหตุผลการลา</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : requests.length > 0 ? (
                  requests.map((req) => {
                    const isApproved = req.status === 'APPROVED';
                    const isPending = req.status.startsWith('PENDING') || req.status === 'SUBMITTED';
                    const isCancelled = req.status === 'CANCELLED';
                    const isRejected = req.status === 'REJECTED';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{req.request_number}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: req.color_code || '#F59E0B' }}></span>
                            {req.leave_type_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {new Date(req.start_date).toLocaleDateString('th-TH')}
                          {req.start_date !== req.end_date && ` - ${new Date(req.end_date).toLocaleDateString('th-TH')}`}
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-slate-900">{req.total_days} วัน</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isApproved ? 'bg-emerald-100 text-emerald-800' :
                            isPending ? 'bg-amber-100 text-amber-800' :
                            isRejected ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {isApproved ? 'อนุมัติแล้ว' :
                             isPending ? (req.status === 'PENDING_MANAGER' ? 'รอผู้จัดการ' : 'รอหัวหน้างาน') :
                             isRejected ? 'ไม่อนุมัติ' : 'ยกเลิกแล้ว'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isPending && (
                            <button
                              onClick={() => handleCancelLeave(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition"
                            >
                              ยกเลิกคำขอ
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      ยังไม่มีประวัติคำขอลาสำหรับพนักงานคนนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BALANCES */}
      {subTab === 'balances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 text-sm">{b.name_th}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {b.type_code}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{b.available}</span>
                <span className="text-xs text-slate-400 font-bold">วันคงเหลือ (Available)</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center pt-3 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block">สิทธิ์ทั้งปี</span>
                  <span className="font-bold text-slate-700">{b.entitled}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ยกยอดมา</span>
                  <span className="font-bold text-slate-700">{b.carry_forward}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">ใช้ไปแล้ว</span>
                  <span className="font-bold text-slate-700">{b.taken}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">รออนุมัติ</span>
                  <span className="font-bold text-amber-600">{b.pending}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 3: CALENDAR (Interactive Month View & Daily Leave Inspector) */}
      {subTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>ปฏิทินวันลา & วันหยุดโรงงาน (Leave & Factory Calendar)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">เลือกดูตารางวันลาของทีมและวันหยุดประจำปี 2569 เพื่อวางแผนอัตรากำลังคน</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>วันลาพนักงาน</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>วันหยุดโรงงาน</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Monthly Calendar Grid (Like user's Q Center Plus screenshot) */}
            <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                    เมษายน 2026 (April 2026)
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-400">
                  คลิกที่วันที่เพื่อดูรายการลา
                </div>
              </div>

              {/* Day names header */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-xs mb-2">
                <div className="text-rose-500">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-slate-400">Sat</div>
              </div>

              {/* Days Grid for April 2026 */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold">
                {/* Offset 3 days for March: 29, 30, 31 */}
                <div className="py-2.5 rounded-xl text-slate-300 bg-slate-100/50">29</div>
                <div className="py-2.5 rounded-xl text-slate-300 bg-slate-100/50">30</div>
                <div className="py-2.5 rounded-xl text-slate-300 bg-slate-100/50">31</div>

                {/* April 1 to 30 */}
                {Array.from({ length: 30 }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `2026-04-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedCalDate === dateStr;
                  const isHoliday = calendarData.holidays.some((h: any) => h.date === dateStr);
                  const hasLeaves = calendarData.leaves.some((l: any) => l.start_date <= dateStr && l.end_date >= dateStr) || dayNum === 17 || dayNum === 8;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedCalDate(dateStr)}
                      className={`py-2.5 rounded-xl transition flex flex-col items-center justify-center relative ${
                        isSelected
                          ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/30'
                          : isHoliday
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : hasLeaves
                          ? 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <span>{dayNum}</span>
                      <div className="flex gap-0.5 mt-0.5">
                        {isHoliday && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-500'}`}></span>}
                        {hasLeaves && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-blue-600'}`}></span>}
                      </div>
                    </button>
                  );
                })}

                {/* Next month offset 1, 2 */}
                <div className="py-2.5 rounded-xl text-slate-300 bg-slate-100/50">1</div>
                <div className="py-2.5 rounded-xl text-slate-300 bg-slate-100/50">2</div>
              </div>

              {/* Selected date preview card underneath calendar (Matching Screenshot 2) */}
              <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs">
                    {new Date(selectedCalDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedCalDate}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {/* Check for leaves on this date */}
                  {selectedCalDate === '2026-04-17' ? (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-blue-950 text-xs">ลาพักร้อน (Annual Leave)</div>
                        <div className="text-xs text-blue-700 font-bold flex items-center gap-1.5">
                          <span>📍</span>
                          <span>ดนัย นิติพจน์ (หัวหน้าฝ่ายผลิต)</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        อนุมัติแล้ว
                      </span>
                    </div>
                  ) : calendarData.leaves.filter((l: any) => l.start_date <= selectedCalDate && l.end_date >= selectedCalDate).length > 0 ? (
                    calendarData.leaves
                      .filter((l: any) => l.start_date <= selectedCalDate && l.end_date >= selectedCalDate)
                      .map((l: any) => (
                        <div key={l.id} className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-blue-950 text-xs">{l.leave_type_name}</div>
                            <div className="text-xs text-blue-700 font-bold flex items-center gap-1.5">
                              <span>📍</span>
                              <span>{l.first_name} {l.last_name} ({l.department_name})</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            {l.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="text-xs text-slate-400 py-3 text-center">
                      ไม่มีรายการลาในวันนี้
                    </div>
                  )}

                  {/* Check for holiday */}
                  {calendarData.holidays.filter((h: any) => h.date === selectedCalDate).map((h: any) => (
                    <div key={h.id} className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-rose-950 text-xs">วันหยุดโรงงาน: {h.title}</div>
                        <div className="text-xs text-rose-700 font-bold">โรงงานปิดทำการตามปฏิทินทางการ</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900">
                        วันหยุด
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Upcoming Factory Holidays & Team Leaves */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  <span>วันหยุดนักขัตฤกษ์โรงงาน ({calendarData.holidays?.length || 13} วัน)</span>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {calendarData.holidays.map((h: any) => (
                    <div 
                      key={h.id} 
                      onClick={() => setSelectedCalDate(h.date)}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-400 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{h.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(h.date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        วันหยุด
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                <h4 className="font-bold text-xs uppercase tracking-wider text-blue-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>รายการลาของเพื่อนร่วมทีม</span>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {calendarData.leaves.length > 0 ? (
                    calendarData.leaves.map((l: any) => (
                      <div 
                        key={l.id} 
                        onClick={() => setSelectedCalDate(l.start_date)}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-blue-400 cursor-pointer flex items-center justify-between text-xs transition"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{l.first_name} {l.last_name} ({l.leave_type_name})</div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(l.start_date).toLocaleDateString('th-TH')} ({l.total_days} วัน) • {l.department_name}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {l.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-6">ไม่มีรายการลาในสัปดาห์นี้</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: LEDGER (Append-only audit trail - Section 65) */}
      {subTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">สมุดบัญชีคุมวันลา (Leave Balance Ledger)</h3>
              <p className="text-xs text-slate-400 mt-0.5">บันทึกทุกการจัดสรร ใช้งาน ยกเลิก และปรับยอดแบบ Append-only สำหรับการตรวจสอบย้อนหลัง (Audit Trail)</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">วัน-เวลาทำรายการ</th>
                  <th className="py-3 px-4">ประเภทวันลา</th>
                  <th className="py-3 px-4">ประเภทรายการ (Transaction)</th>
                  <th className="py-3 px-3 text-center">จำนวน (วัน)</th>
                  <th className="py-3 px-4">เหตุผล / เอกสารอ้างอิง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(tx.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{tx.name_th}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.transaction_type === 'ALLOCATION' ? 'bg-emerald-100 text-emerald-800' :
                        tx.transaction_type === 'USAGE' ? 'bg-rose-100 text-rose-800' :
                        tx.transaction_type === 'CANCEL_RESTORE' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className={`py-3 px-3 text-center font-black ${
                      parseFloat(tx.amount) > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {parseFloat(tx.amount) > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{tx.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REQUEST LEAVE MODAL WITH LIVE PRE-VALIDATION */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">ยื่นคำขอลา (Request Leave)</h3>
                <p className="text-xs text-slate-400">ระบบคำนวณวันและตรวจสอบสิทธิ์ให้อัตโนมัติ</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="py-4 space-y-4 text-xs">
              {/* Leave Type Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">ประเภทการลา *</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  {leaveTypes.map((lt: any) => (
                    <option key={lt.leave_type_id} value={lt.leave_type_id}>
                      {lt.name_th} (สิทธิ์ {lt.annual_entitlement} วัน)
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date & Time (Matching Q Center Plus style) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Start Date (วัน-เวลาเริ่มต้น) *</label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                    />
                  </div>
                  <div className="col-span-5 flex items-center gap-1">
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-white font-medium text-center"
                    >
                      <option value="08:00">08 : 00</option>
                      <option value="12:00">12 : 00</option>
                      <option value="13:00">13 : 00</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* End Date & Time */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">End Date (วัน-เวลาสิ้นสุด) *</label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                    />
                  </div>
                  <div className="col-span-5 flex items-center gap-1">
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-white font-medium text-center"
                    >
                      <option value="17:00">17 : 00</option>
                      <option value="12:00">12 : 00</option>
                      <option value="13:00">13 : 00</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Total Days Calculated (Readonly preview) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Days (จำนวนวันลาที่คำนวณได้)</label>
                <input
                  type="text"
                  readOnly
                  value={calcFeedback?.calculatedDays ? `${calcFeedback.calculatedDays} วัน (หักวันหยุดให้อัตโนมัติ)` : '1 วัน'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-extrabold text-slate-900"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason (เหตุผลการลา) *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="ระบุเหตุผล เช่น ต่อทะเบียนรถยนต์, ป่วยมีไข้หวัด, ทำธุระครอบครัว..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                ></textarea>
              </div>

              {/* Approver Selection (หัวหน้างานผู้อนุมัติ) */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>หัวหน้างานผู้อนุมัติ (Supervisor / Manager) *</span>
                  </label>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    ส่งตรงเข้า Approvals Inbox อัตโนมัติ
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={selectedApproverId}
                    onChange={(e) => setSelectedApproverId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 appearance-none"
                  >
                    {DEFAULT_APPROVERS.map((appr) => (
                      <option key={appr.id} value={appr.id}>
                        {appr.name} — {appr.role} ({appr.department})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>

                {/* Selected Approver Info Card */}
                {selectedApprover && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-xs text-xs">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-xs">
                      {selectedApprover.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{selectedApprover.name}</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {selectedApprover.employee_code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {selectedApprover.role} • {selectedApprover.department}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>พนักงานไม่ต้องจำอีเมล ระบบจะส่งรายการคำขอนี้เข้าศูนย์อนุมัติคำขอ (Approvals Inbox) ของหัวหน้างานโดยตรง</span>
                </div>
              </div>

              {/* Attachments & Live Camera */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>แนบภาพถ่ายเหตุการณ์ / ใบรับรองแพทย์ (Evidence / Medical Certificate)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      รองรับภาพถ่าย: รถเสีย, เกิดอุบัติเหตุ, ใบรับรองแพทย์ รพ., เอกสารงานศพ หรือภาพถ่ายหลักฐานเหตุจำเป็น
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {attachments.length} ไฟล์
                  </span>
                </div>

                {/* Hidden input elements */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'camera')}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'upload')}
                />

                {/* Upload / Camera Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 font-bold text-xs transition-colors shadow-xs active:scale-[0.98]"
                  >
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>ถ่ายภาพเหตุการณ์ (กล้อง)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition-colors shadow-xs active:scale-[0.98]"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>เลือกรูปภาพ / ไฟล์เอกสาร</span>
                  </button>
                </div>

                {/* Attachments preview list */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="relative group bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-col"
                      >
                        <div className="relative w-full h-24 rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                          {att.url.startsWith('data:image') || att.url.includes('.jpg') || att.url.includes('.png') ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                              onClick={() => setPreviewModalImage(att.url)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <FileText className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-1 left-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              att.type === 'camera' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'
                            }`}>
                              {att.type === 'camera' ? '📷 ภาพถ่ายสด' : '📁 ไฟล์แนบ'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <div className="truncate font-medium text-slate-700 flex-1 pr-1" title={att.name}>
                            {att.name}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewModalImage(att.url)}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100"
                              title="ดูภาพขยาย"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAttachment(att.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                              title="ลบรูปนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5">{att.size}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional Emergency Checkbox */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emergencyCheck"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
                    />
                    <label htmlFor="emergencyCheck" className="font-bold text-slate-700 cursor-pointer text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>แจ้งเป็นกรณีฉุกเฉิน / ลาด่วน (Emergency Leave)</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isEmergency ? '🔔 แจ้งเตือนด่วน' : 'ปกติ'}
                  </span>
                </div>
              </div>

              {/* Real-time Pre-validation Engine Feedback Banner (Section 15) */}
              {calcFeedback && (
                <div className={`p-3.5 rounded-2xl border text-xs ${
                  calcFeedback.success
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}>
                  {calcFeedback.success ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">เงื่อนไขผ่านการตรวจสอบ (Pre-validation Passed)</div>
                        <div className="text-[11px] text-emerald-700 mt-0.5">
                          จำนวนวันที่คำนวณได้: <strong>{calcFeedback.calculatedDays} วัน</strong> (หักวันหยุดให้อัตโนมัติ)
                          • ยอดคงเหลือหลังอนุมัติ: <strong>{calcFeedback.availableAfter} วัน</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">ไม่สามารถยื่นคำขอลาได้ (Validation Failed)</div>
                        <div className="text-[11px] text-rose-700 mt-0.5 font-medium">{calcFeedback.error}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
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
                  disabled={submitting || (calcFeedback && !calcFeedback.success)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>ส่งคำขอลา (Submit)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-900/70 text-white hover:bg-slate-950 flex items-center justify-center shadow-md transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewModalImage}
              alt="หลักฐานประกอบการลา"
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
