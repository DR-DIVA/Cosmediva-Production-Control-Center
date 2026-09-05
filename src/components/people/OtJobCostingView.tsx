'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, DollarSign, Package, AlertTriangle, CheckCircle2, 
  TrendingDown, TrendingUp, Users, Plus, Filter, Sparkles,
  ArrowRight, ShieldAlert, BarChart3, ChevronRight, Calculator,
  Search, X, Check, Trash2, UserCheck, Printer, FileText
} from 'lucide-react';
import { Persona, isManagerLevel } from './PeopleHeader';
import { toast } from 'sonner';
import { OtEFormModal, OtEFormData } from './OtEFormModal';

interface EmployeeOption {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  department_name?: string;
  work_area_name?: string;
}

export interface SelectedEmployeeItem extends EmployeeOption {
  hours: number;
  startTime: string;
  endTime: string;
}

interface OtJobCostingViewProps {
  currentPersona: Persona;
}

export interface OtRequestItem {
  id: string;
  submissionDate: string;
  division: string;
  department: string;
  lotNumber: string;
  productName: string;
  line: string;
  requestedBy: string;
  otDate: string;
  timeSlot: string;
  target: string;
  reason: string;
  plannedHeadcount: number;
  actualHeadcount: number;
  plannedHours: number;
  actualHours: number;
  estimatedCost: number;
  actualCost: number;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  participants: any[];
}

export function OtJobCostingView({ currentPersona }: OtJobCostingViewProps) {
  const isManager = useMemo(() => isManagerLevel(currentPersona), [currentPersona]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState('JHD-309');
  const [subTab, setSubTab] = useState<'job_costing' | 'requests'>(() => isManagerLevel(currentPersona) ? 'job_costing' : 'requests');

  useEffect(() => {
    if (!isManager && subTab === 'job_costing') {
      setSubTab('requests');
    }
  }, [isManager, subTab]);

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
      overheadCost: 3500,
      otHours: 42,
      headcount: 14,
      status: 'PROFITABLE',
      line: 'Packing Line 1'
    },
    {
      lotNumber: 'JHD-322',
      productName: 'Melasma Clear Spot Corrector 15ml',
      orderQuantity: 25000,
      completedQuantity: 18000,
      revenue: 55000,
      budgetedLaborCost: 6500,
      normalLaborCost: 5900,
      otLaborCost: 2800,
      materialCost: 31000,
      overheadCost: 2800,
      otHours: 24,
      headcount: 8,
      status: 'LOSS_WARNING',
      line: 'Packing Line 3'
    },
    {
      lotNumber: 'JHD-330',
      productName: 'Hydra Glow Sleeping Mask 100g',
      orderQuantity: 30000,
      completedQuantity: 5000,
      revenue: 65000,
      budgetedLaborCost: 8000,
      normalLaborCost: 4200,
      otLaborCost: 1200,
      materialCost: 39000,
      overheadCost: 3200,
      otHours: 12,
      headcount: 6,
      status: 'PROFITABLE',
      line: 'Mixing Room 3'
    }
  ];

  // Active OT Requests
  const [otRequests, setOtRequests] = useState<OtRequestItem[]>([
    {
      id: 'OT-2026-0908-01',
      submissionDate: '2026-09-08',
      division: 'PD (ฝ่ายผลิต)',
      department: 'PK (แผนกบรรจุและแพ๊กกิ้ง)',
      lotNumber: 'JHD-309',
      productName: 'Diva Intensive Brightening Serum 50ml',
      line: 'Packing Line 2',
      requestedBy: 'ดนัย นิติพจน์ (Foreman)',
      otDate: '2026-09-08',
      timeSlot: '17:00 - 20:00 (3.0 ชม.)',
      target: 'เร่งบรรจุ Lot JHD-309 ให้ทันกำหนดส่งมอบลูกค้า 16:00 น. วันพรุ่งนี้',
      reason: 'เร่งบรรจุให้ทันกำหนดส่งมอบลูกค้า',
      plannedHeadcount: 15,
      actualHeadcount: 13,
      plannedHours: 45,
      actualHours: 37,
      estimatedCost: 4800,
      actualCost: 3950,
      status: 'APPROVED_EXECUTED',
      approvedBy: 'ดร.ภญ. ชมพูนุช แสวงศักดิ์ (ผู้อำนวยการโรงงาน)',
      approvedAt: '16:30 น.',
      participants: [
        { code: 'PK-BJP518', name: 'น.ส.เบ็ญจพร พูลสวัสดิ์', rate: 68.06, hours: 3.0, cost: 204.18, position: 'หัวหน้าแผนกบรรจุ', status: 'Present' },
        { code: 'PK-PIT266', name: 'คุณพิมพ์วรีย์ เติมสายทอง', rate: 68.06, hours: 3.0, cost: 204.18, position: 'หัวหน้าห้องบรรจุ', status: 'Present' },
        { code: 'PK-WNR486', name: 'คุณวนิดา เรืองศิลป์', rate: 75.50, hours: 3.0, cost: 226.50, position: 'หัวหน้าห้องบรรจุ', status: 'Present' },
        { code: 'PK-WIC1784', name: 'น.ส.วิลาวัลย์ เชื้อปรีชา', rate: 68.06, hours: 0, cost: 0, position: 'พนักงานบรรจุ', status: 'Absent' }
      ]
    },
    {
      id: 'OT-2026-0908-02',
      submissionDate: '2026-09-08',
      division: 'PD (ฝ่ายผลิต)',
      department: 'PK (แผนกบรรจุและแพ๊กกิ้ง)',
      lotNumber: 'JHD-318',
      productName: 'Diva Youth Defense Day Cream 30g',
      line: 'Packing Line 1',
      requestedBy: 'สมควร มั่นคง (Foreman)',
      otDate: '2026-09-08',
      timeSlot: '17:00 - 21:00 (4.0 ชม.)',
      target: 'บรรจุ Diva Day Cream 30g ตามยอดสั่งซื้อ 45,000 ชิ้น',
      reason: 'เร่งผลิตตามคำสั่งซื้อด่วน',
      plannedHeadcount: 14,
      actualHeadcount: 14,
      plannedHours: 56,
      actualHours: 42,
      estimatedCost: 5600,
      actualCost: 4650,
      status: 'PENDING_APPROVAL',
      approvedBy: '',
      approvedAt: '',
      participants: []
    }
  ]);

  // Form State for new OT request
  const [formData, setFormData] = useState({
    submissionDate: new Date().toISOString().slice(0, 10),
    division: 'PD (ฝ่ายผลิต)',
    department: 'MX (แผนกผสม)',
    productName: 'NAWANNA',
    lotNumber: 'JHD-318',
    otDate: new Date().toISOString().slice(0, 10),
    startTime: '17:00',
    endTime: '19:00',
    target: 'แช่+ผสม JHD-318 LOT 009/26 71-75/52',
    reason: 'แช่+ผสม',
    selectedWorkersCount: 1
  });

  // E-Form Modal State
  const [eformModalOpen, setEformModalOpen] = useState(false);
  const [eformData, setEformData] = useState<OtEFormData | null>(null);

  // Employee Selection State
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<SelectedEmployeeItem[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/people/employees?limit=300');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setEmployees(json.data);
        }
      } catch (err) {
        console.error('Failed to load employees for OT selector:', err);
      }
    }
    fetchEmployees();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateOtHours = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diffMin = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMin <= 0) diffMin += 24 * 60;
      return Math.round((diffMin / 60) * 10) / 10;
    } catch {
      return 2;
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employees;
    const q = empSearch.toLowerCase().trim();
    return employees.filter(e => 
      e.employee_code?.toLowerCase().includes(q) ||
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      (e.nickname && e.nickname.toLowerCase().includes(q)) ||
      (e.department_name && e.department_name.toLowerCase().includes(q)) ||
      (e.work_area_name && e.work_area_name.toLowerCase().includes(q))
    );
  }, [employees, empSearch]);

  const toggleEmployee = (emp: EmployeeOption) => {
    const defaultHours = calculateOtHours(formData.startTime, formData.endTime);
    setSelectedEmployees(prev => {
      const exists = prev.some(p => p.id === emp.id || p.employee_code === emp.employee_code);
      let next: SelectedEmployeeItem[];
      if (exists) {
        next = prev.filter(p => p.id !== emp.id && p.employee_code !== emp.employee_code);
      } else {
        next = [...prev, {
          ...emp,
          hours: defaultHours,
          startTime: formData.startTime,
          endTime: formData.endTime
        }];
      }
      setFormData(f => ({ ...f, selectedWorkersCount: Math.max(1, next.length) }));
      return next;
    });
  };

  const removeEmployee = (empId: string) => {
    setSelectedEmployees(prev => {
      const next = prev.filter(p => p.id !== empId);
      setFormData(f => ({ ...f, selectedWorkersCount: Math.max(1, next.length) }));
      return next;
    });
  };

  const updateEmployeeHours = (empId: string, hours: number) => {
    setSelectedEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        return { ...emp, hours: Math.max(0.5, Math.min(12, hours)) };
      }
      return emp;
    }));
  };

  const updateEmployeeTime = (empId: string, startTime: string, endTime: string) => {
    const hours = calculateOtHours(startTime, endTime);
    setSelectedEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        return { ...emp, startTime, endTime, hours };
      }
      return emp;
    }));
  };

  const syncAllTimesToDefault = () => {
    const defaultHours = calculateOtHours(formData.startTime, formData.endTime);
    setSelectedEmployees(prev => prev.map(emp => ({
      ...emp,
      startTime: formData.startTime,
      endTime: formData.endTime,
      hours: defaultHours
    })));
    toast.success(`ปรับเวลาทุกคนเป็น ${formData.startTime} - ${formData.endTime} (${defaultHours} ชม.) เรียบร้อยแล้ว`);
  };

  const totalSelectedHours = useMemo(() => {
    const defaultHours = calculateOtHours(formData.startTime, formData.endTime);
    if (selectedEmployees.length === 0) {
      return formData.selectedWorkersCount * defaultHours;
    }
    return Math.round(selectedEmployees.reduce((sum, e) => sum + (e.hours || defaultHours), 0) * 10) / 10;
  }, [selectedEmployees, formData.selectedWorkersCount, formData.startTime, formData.endTime]);

  const handleApproveOt = (otId: string) => {
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    setOtRequests(prev => prev.map(req => {
      if (req.id === otId) {
        return {
          ...req,
          status: 'APPROVED_EXECUTED',
          approvedBy: `${currentPersona.name} (${currentPersona.role})`,
          approvedAt: timeStr
        };
      }
      return req;
    }));
    toast.success(`อนุมัติคำขอ OT รหัส ${otId} เรียบร้อยแล้ว โดย ${currentPersona.name}`);
  };

  const handleRejectOt = (otId: string) => {
    setOtRequests(prev => prev.map(req => {
      if (req.id === otId) {
        return {
          ...req,
          status: 'REJECTED',
          rejectedBy: `${currentPersona.name} (${currentPersona.role})`
        };
      }
      return req;
    }));
    toast.error(`ส่งกลับ / ไม่อนุมัติคำขอ OT รหัส ${otId}`);
  };

  const handleOpenEFormFromRequest = (ot: any) => {
    const hours = ot.plannedHours && ot.plannedHeadcount ? Math.round((ot.plannedHours / ot.plannedHeadcount) * 10) / 10 : 2;
    setEformData({
      id: ot.id,
      submissionDate: ot.submissionDate || ot.otDate,
      division: ot.division || 'PD (ฝ่ายผลิต)',
      department: ot.department || ot.line || 'MX (แผนกผสม)',
      productName: ot.productName || 'NAWANNA',
      jobCode: ot.lotNumber || 'JHD-318',
      otDate: ot.otDate,
      startTime: ot.timeSlot ? ot.timeSlot.slice(0, 5) : '17:00',
      endTime: ot.timeSlot ? ot.timeSlot.slice(8, 13) : '19:00',
      hours: hours,
      target: ot.target || ot.reason || 'ปฏิบัติงานตามคำสั่งผลิต',
      reason: ot.reason || 'ทำงานล่วงเวลาตามแผนผลิต',
      requestedBy: ot.requestedBy,
      supervisorApprover: ot.requestedBy,
      hrApprover: 'ฝ่ายทรัพยากรบุคคล',
      directorApprover: 'ผู้อำนวยการโรงงาน',
      participants: ot.participants && ot.participants.length > 0 
        ? ot.participants.map((p: any) => ({
            code: p.code,
            name: p.name,
            hours: p.hours || hours,
            position: p.position || ot.department || 'พนักงาน',
            note: p.note || ''
          }))
        : []
    });
    setEformModalOpen(true);
  };

  const handlePreviewEFormFromForm = () => {
    const defaultHours = calculateOtHours(formData.startTime, formData.endTime);
    setEformData({
      submissionDate: formData.submissionDate,
      division: formData.division,
      department: formData.department,
      productName: formData.productName,
      jobCode: formData.lotNumber,
      otDate: formData.otDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      hours: defaultHours,
      target: formData.target,
      reason: formData.reason,
      requestedBy: `${currentPersona.name} (${currentPersona.role})`,
      supervisorApprover: `${currentPersona.name}`,
      participants: selectedEmployees.map(emp => {
        const empHours = emp.hours || defaultHours;
        const isCustomTime = emp.startTime !== formData.startTime || emp.endTime !== formData.endTime;
        return {
          code: emp.employee_code,
          name: `${emp.first_name} ${emp.last_name}${emp.nickname ? ` (${emp.nickname})` : ''}`,
          hours: empHours,
          timeSlot: isCustomTime ? `${emp.startTime} - ${emp.endTime}` : undefined,
          position: emp.work_area_name || emp.department_name || formData.department,
          note: ''
        };
      })
    });
    setEformModalOpen(true);
  };

  const handleCreateOtRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const count = selectedEmployees.length > 0 ? selectedEmployees.length : formData.selectedWorkersCount;
    const defaultHours = calculateOtHours(formData.startTime, formData.endTime);
    const plannedHours = totalSelectedHours;
    const estCost = Math.round(plannedHours * 70);

    const newReq = {
      id: `OT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(otRequests.length + 1).padStart(2, '0')}`,
      submissionDate: formData.submissionDate,
      division: formData.division,
      department: formData.department,
      lotNumber: formData.lotNumber,
      productName: formData.productName,
      line: formData.department,
      target: formData.target,
      reason: formData.reason,
      requestedBy: `${currentPersona.name} (${currentPersona.role})`,
      otDate: formData.otDate,
      timeSlot: `${formData.startTime} - ${formData.endTime} (${defaultHours} ชม.)`,
      plannedHeadcount: count,
      actualHeadcount: count,
      plannedHours: plannedHours,
      actualHours: plannedHours,
      estimatedCost: estCost,
      actualCost: estCost,
      status: 'PENDING_APPROVAL',
      approvedBy: '',
      approvedAt: '',
      participants: selectedEmployees.map(emp => {
        const empHours = emp.hours || defaultHours;
        const isCustomTime = emp.startTime !== formData.startTime || emp.endTime !== formData.endTime;
        return {
          code: emp.employee_code,
          name: `${emp.first_name} ${emp.last_name}${emp.nickname ? ` (${emp.nickname})` : ''}`,
          rate: 68.06,
          hours: empHours,
          timeSlot: isCustomTime ? `${emp.startTime} - ${emp.endTime}` : `${formData.startTime} - ${formData.endTime}`,
          cost: Math.round(empHours * 68.06 * 100) / 100,
          position: emp.work_area_name || emp.department_name || formData.department,
          status: 'Scheduled'
        };
      })
    };

    setOtRequests([newReq, ...otRequests]);
    toast.success(`เปิดคำขอ OT สำหรับ Lot ${formData.lotNumber} (${count} คน • ${plannedHours} ชม.) เรียบร้อยแล้ว`);
    setShowRequestModal(false);

    // Prompt user with E-Form directly
    setEformData({
      id: newReq.id,
      submissionDate: newReq.submissionDate,
      division: newReq.division,
      department: newReq.department,
      productName: newReq.productName,
      jobCode: newReq.lotNumber,
      otDate: newReq.otDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      hours: defaultHours,
      target: newReq.target,
      reason: newReq.reason,
      requestedBy: newReq.requestedBy,
      supervisorApprover: currentPersona.name,
      hrApprover: 'ฝ่ายทรัพยากรบุคคล',
      directorApprover: 'ผู้อำนวยการโรงงาน',
      participants: selectedEmployees.map(emp => {
        const empHours = emp.hours || defaultHours;
        const isCustomTime = emp.startTime !== formData.startTime || emp.endTime !== formData.endTime;
        return {
          code: emp.employee_code,
          name: `${emp.first_name} ${emp.last_name}${emp.nickname ? ` (${emp.nickname})` : ''}`,
          hours: empHours,
          timeSlot: isCustomTime ? `${emp.startTime} - ${emp.endTime}` : undefined,
          position: emp.work_area_name || emp.department_name || formData.department,
          note: ''
        };
      })
    });
    setEformModalOpen(true);
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
        {isManager && (
          <button
            onClick={() => setSubTab('job_costing')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'job_costing' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>วิเคราะห์ต้นทุน & กำไรขาดทุนต่องาน (Job Costing P&L)</span>
          </button>
        )}
        <button
          onClick={() => setSubTab('requests')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            subTab === 'requests' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>รายการขอและอนุมัติ OT ({otRequests.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: JOB COSTING & PROFIT/LOSS ANALYSIS */}
      {subTab === 'job_costing' && (
        !isManager ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-black text-slate-800 text-lg">จำกัดการเข้าถึงเฉพาะระดับผู้จัดการ (Manager Only)</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                เมนูวิเคราะห์ต้นทุนการผลิต (Job Costing P&L) และผลกำไรขาดทุนของล็อตการผลิต สงวนสิทธิ์การเข้าถึงสำหรับผู้จัดการฝ่าย (Manager) และฝ่ายบริหารโรงงานเท่านั้น
              </p>
            </div>
            <button
              onClick={() => setSubTab('requests')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/20"
            >
              ไปยังหน้ารายการขอและอนุมัติ OT
            </button>
          </div>
        ) : (
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
        )
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEFormFromRequest(ot)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 hover:text-amber-950 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
                    title="เปิดดูและพิมพ์เอกสารใบขอทำงานล่วงเวลา (E-Form)"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-600" />
                    <span>ใบขอ OT (E-Form)</span>
                  </button>

                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    ot.status === 'APPROVED_EXECUTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : ot.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {ot.status === 'APPROVED_EXECUTED' 
                      ? 'อนุมัติ & ปฏิบัติงานแล้ว' 
                      : ot.status === 'REJECTED'
                      ? 'ส่งกลับ / ไม่อนุมัติ'
                      : 'รอผู้จัดการอนุมัติ'}
                  </span>
                </div>
              </div>

              {/* Approval Workflow & Action Bar */}
              {ot.status === 'PENDING_APPROVAL' && (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-2xs">
                  <div className="flex items-center gap-2.5 text-xs text-amber-950 font-medium">
                    <span className="flex h-3 w-3 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <div>
                      <div className="font-bold text-amber-900">
                        ขั้นตอนอนุมัติ: รอการพิจารณาจากผู้อำนวยการโรงงาน
                      </div>
                      <div className="text-[11px] text-amber-800">
                        ระบบส่งแจ้งเตือนไปยัง <strong>ดร.ภญ. ชมพูนุช แสวงศักดิ์ (ผู้อำนวยการโรงงาน)</strong> เรียบร้อยแล้ว
                      </div>
                    </div>
                  </div>

                  {['Supervisor', 'Manager', 'Executive', 'Admin', 'HR Manager', 'ผู้อำนวยการโรงงาน', 'กรรมการผู้จัดการ'].includes(currentPersona.role) ? (
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <button
                        type="button"
                        onClick={() => handleRejectOt(ot.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        title="ไม่อนุมัติและส่งกลับให้ผู้ยื่นแก้ไข"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ไม่อนุมัติ / ส่งกลับ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveOt(ot.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition cursor-pointer"
                        title={`อนุมัติในฐานะ ${currentPersona.name}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>อนุมัติคำขอ OT (Approve)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-900 bg-white/90 px-3 py-1.5 rounded-xl border border-amber-200 font-medium self-end md:self-auto flex items-center gap-1.5">
                      <span>💡</span>
                      <span>ทดสอบอนุมัติ: สลับ Persona ที่มุมขวาบนเป็น <strong>ดร.ชมพู่ (ผู้อำนวยการโรงงาน)</strong> หรือ <strong>คุณเอนก (HR Manager)</strong></span>
                    </div>
                  )}
                </div>
              )}

              {ot.status === 'APPROVED_EXECUTED' && ot.approvedBy && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span>ได้รับการอนุมัติเรียบร้อยแล้ว โดย: <strong>{ot.approvedBy}</strong></span>
                      {ot.approvedAt && <span className="text-slate-500 text-[11px] ml-1.5 font-normal">({ot.approvedAt})</span>}
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-black bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    อนุมัติแล้ว พร้อมนำไปคิดต้นทุนจริง
                  </span>
                </div>
              )}

              {ot.status === 'REJECTED' && (
                <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>คำขอนี้ถูกส่งกลับ / ไม่อนุมัติ โดย: <strong>{ot.rejectedBy || 'ผู้จัดการ'}</strong></span>
                  </div>
                  <span className="text-[11px] text-rose-700 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-rose-200">
                    ไม่อนุมัติ
                  </span>
                </div>
              )}

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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
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
              {/* Row 1: Submission Date, Division, Department */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">วันที่ยื่นคำขอ *</label>
                  <input
                    type="date"
                    required
                    value={formData.submissionDate}
                    onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ฝ่าย *</label>
                  <select
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    <option value="PD (ฝ่ายผลิต)">PD (ฝ่ายผลิต)</option>
                    <option value="MM (ฝ่ายบริหารคลังสินค้า)">MM (ฝ่ายบริหารคลังสินค้า)</option>
                    <option value="QC (ฝ่ายควบคุมคุณภาพ)">QC (ฝ่ายควบคุมคุณภาพ)</option>
                    <option value="RD (ฝ่ายวิจัยและพัฒนา)">RD (ฝ่ายวิจัยและพัฒนา)</option>
                    <option value="EN (ฝ่ายวิศวกรรม/ซ่อมบำรุง)">EN (ฝ่ายวิศวกรรม/ซ่อมบำรุง)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">แผนก *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    <option value="MX (แผนกผสม)">MX (แผนกผสม)</option>
                    <option value="PK (แผนกบรรจุและแพ๊กกิ้ง)">PK (แผนกบรรจุและแพ๊กกิ้ง)</option>
                    <option value="MM-RM/Bulk (คลังวัตถุดิบและบัลค์)">MM-RM/Bulk (คลังวัตถุดิบและบัลค์)</option>
                    <option value="MM-PM/FG (คลังบรรจุภัณฑ์และสำเร็จรูป)">MM-PM/FG (คลังบรรจุภัณฑ์และสำเร็จรูป)</option>
                    <option value="QC Lab">QC Lab</option>
                    <option value="RD Lab">RD Lab</option>
                    <option value="BEC ผลิตสบู่">BEC ผลิตสบู่</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Product Name, Job Code / Lot No. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ผลิตภัณฑ์ (Product Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น NAWANNA, Diva Serum 50ml"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">รหัสงาน / คำสั่งผลิต (Job Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น JHD-318, JHD-309"
                    value={formData.lotNumber}
                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Row 3: OT Date, Times, Hours, Headcount */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-700 block mb-1">วันที่ขอทำ OT *</label>
                  <input
                    type="date"
                    required
                    value={formData.otDate}
                    onChange={(e) => setFormData({ ...formData, otDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
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
                <div>
                  <label className="font-bold text-slate-700 block mb-1">จำนวนชั่วโมง</label>
                  <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-black text-amber-700 text-center">
                    {calculateOtHours(formData.startTime, formData.endTime)} ชม.
                  </div>
                </div>
              </div>

              {/* Row 4: Reason */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">เหตุผลในการขอ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น แช่+ผสม, เร่งงานบรรจุให้ทันกำหนดส่งมอบ, เคลียร์งานค้างกะ"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Row 5: Target (เป้าหมายงาน) - Dedicated 3-line box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-amber-600">🎯</span>
                    <span>Target (เป้าหมายงาน) *</span>
                  </label>
                  <span className="text-[11px] text-slate-400">ระบุชิ้นงาน ปริมาณ หรือขั้นตอนเป้าหมาย</span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="ระบุเป้าหมายงานที่ต้องการทำให้สำเร็จ เช่น&#10;1. แช่+ผสม JHD-318 LOT 009/26 71-75/52&#10;2. เร่งบรรจุให้ได้ยอด 45,000 ชิ้น ตามแผนส่งมอบ"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400 resize-none font-medium"
                />
              </div>

              {/* EMPLOYEE SEARCH & SELECTOR SECTION */}
              <div ref={dropdownRef} className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>ระบุรายชื่อพนักงานที่จะทำ OT (สูงสุด 30 คน) *</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-black border border-amber-200">
                      เลือกแล้ว {selectedEmployees.length} คน
                    </span>
                  </label>
                  {selectedEmployees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployees([]);
                        setFormData(prev => ({ ...prev, selectedWorkersCount: 1 }));
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>ล้างที่เลือก</span>
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="พิมพ์ค้นหาด้วยรหัส, ชื่อ-นามสกุล, ชื่อเล่น หรือ แผนก..."
                      value={empSearch}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                    />
                    {empSearch && (
                      <button
                        type="button"
                        onClick={() => setEmpSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown list */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-2 bg-slate-50 sticky top-0 z-10 flex items-center justify-between text-[11px] text-slate-600 font-bold border-b border-slate-100">
                        <span>ผลการค้นหา {filteredEmployees.length} คน</span>
                        <div className="flex items-center gap-2">
                          {filteredEmployees.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const defaultHours = calculateOtHours(formData.startTime, formData.endTime);
                                const newToAdd = filteredEmployees
                                  .filter(fe => !selectedEmployees.some(se => se.id === fe.id || se.employee_code === fe.employee_code))
                                  .map(fe => ({
                                    ...fe,
                                    hours: defaultHours,
                                    startTime: formData.startTime,
                                    endTime: formData.endTime
                                  }));
                                const next = [...selectedEmployees, ...newToAdd];
                                setSelectedEmployees(next);
                                setFormData(prev => ({ ...prev, selectedWorkersCount: next.length }));
                              }}
                              className="text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                            >
                              + เลือกทั้งหมด ({filteredEmployees.length})
                            </button>
                          )}
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(false)}
                            className="text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            ปิด
                          </button>
                        </div>
                      </div>

                      {filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 50).map(emp => {
                          const isSelected = selectedEmployees.some(se => se.id === emp.id || se.employee_code === emp.employee_code);
                          return (
                            <div
                              key={emp.id}
                              onClick={() => toggleEmployee(emp)}
                              className={`p-2.5 flex items-center justify-between hover:bg-amber-50/70 cursor-pointer transition ${
                                isSelected ? 'bg-amber-50/90' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 pointer-events-none"
                                />
                                <div>
                                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <span className="font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {emp.employee_code}
                                    </span>
                                    <span>{emp.first_name} {emp.last_name}</span>
                                    {emp.nickname && <span className="text-slate-400 font-normal">({emp.nickname})</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {emp.department_name || 'ไม่ระบุแผนก'} {emp.work_area_name ? `• ${emp.work_area_name}` : ''}
                                  </div>
                                </div>
                              </div>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                isSelected ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isSelected ? 'เลือกแล้ว ✓' : '+ เลือก'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Employees with Individual Time Controls */}
                {selectedEmployees.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 pt-1">
                      <span className="font-bold">
                        รายชื่อพนักงานที่เลือก ({selectedEmployees.length} คน • รวม {totalSelectedHours} ชม.)
                      </span>
                      <button
                        type="button"
                        onClick={syncAllTimesToDefault}
                        className="text-amber-800 hover:text-amber-950 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        title="ปรับเวลาของทุกคนให้เท่ากับเวลาเริ่ม-เลิกหลักของกะ"
                      >
                        <span>↺ ปรับทุกคนเป็น {formData.startTime} - {formData.endTime}</span>
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                      {selectedEmployees.map((emp, idx) => (
                        <div
                          key={emp.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 hover:bg-slate-50/80 rounded-xl transition"
                        >
                          {/* Col 1: Employee info */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0 text-center">
                              #{idx + 1}
                            </span>
                            <span className="font-mono font-bold text-[10px] bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded text-amber-950 shrink-0">
                              {emp.employee_code}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-slate-900">{emp.first_name} {emp.last_name}</span>
                              {emp.nickname && <span className="text-slate-500 ml-1">({emp.nickname})</span>}
                              <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">• {emp.department_name || formData.department}</span>
                            </div>
                          </div>

                          {/* Col 2: Individual Time Controls */}
                          <div className="flex items-center justify-end gap-2 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <input
                                type="time"
                                value={emp.startTime}
                                onChange={(e) => updateEmployeeTime(emp.id, e.target.value, emp.endTime)}
                                className="font-mono text-[11px] text-slate-800 bg-transparent focus:outline-none"
                                title="เวลาเริ่ม OT ของพนักงานคนนี้"
                              />
                              <span className="text-slate-400 text-[10px]">-</span>
                              <input
                                type="time"
                                value={emp.endTime}
                                onChange={(e) => updateEmployeeTime(emp.id, emp.startTime, e.target.value)}
                                className="font-mono text-[11px] text-slate-800 bg-transparent focus:outline-none"
                                title="เวลาเลิก OT ของพนักงานคนนี้"
                              />
                            </div>

                            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-1 rounded-xl">
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="12"
                                value={emp.hours}
                                onChange={(e) => updateEmployeeHours(emp.id, parseFloat(e.target.value) || 0)}
                                className="w-10 text-center font-black text-amber-950 bg-white rounded border border-amber-300 text-xs py-0.5 focus:outline-none"
                                title="จำนวนชั่วโมง OT"
                              />
                              <span className="text-[10px] text-amber-900 font-bold">ชม.</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeEmployee(emp.id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition cursor-pointer"
                              title="ลบพนักงานคนนี้ออก"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 p-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                    ยังไม่ได้เลือกพนักงาน (คีย์ค้นหารหัสหรือชื่อด้านบนแล้วคลิกเลือกรายชื่อที่ต้องการได้เลยค่ะ)
                  </div>
                )}
              </div>

              {/* Financial Preview Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-amber-600" />
                    <span>ประมาณการต้นทุนค่าแรง OT ล่วงหน้า (Pre-Approval Cost Estimate)</span>
                  </div>
                  <span className="text-amber-900 font-bold bg-amber-200/70 border border-amber-300 px-2 py-0.5 rounded text-[11px]">
                    รวม {totalSelectedHours} ชม.
                  </span>
                </div>
                <div className="text-amber-900 mt-1.5">
                  คำนวณจาก {selectedEmployees.length > 0 ? selectedEmployees.length : formData.selectedWorkersCount} คน • ยอดรวม {totalSelectedHours} ชั่วโมง = <strong className="text-amber-950 text-sm">฿{(totalSelectedHours * 70).toLocaleString()} บาท</strong>
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  คิดประมาณการเฉลี่ย ฿70/ชม. (เมื่อพนักงานสแกนนิ้วเลิกงานจริง ระบบจะคำนวณต้นทุนจริงตามนาทีที่สแกนออกและฐานค่าจ้างของแต่ละคน)
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePreviewEFormFromForm}
                  className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="ดูตัวอย่างเอกสารใบขอ OT รูปแบบมาตรฐาน A4 ก่อนส่ง"
                >
                  <FileText className="w-4 h-4 text-amber-800" />
                  <span>ดูตัวอย่างใบขอ OT (Preview E-Form)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ส่งขออนุมัติ & พิมพ์ E-Form (Submit OT)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-FORM PRINTABLE MODAL */}
      {eformData && (
        <OtEFormModal
          isOpen={eformModalOpen}
          onClose={() => setEformModalOpen(false)}
          data={eformData}
        />
      )}
    </div>
  );
}
