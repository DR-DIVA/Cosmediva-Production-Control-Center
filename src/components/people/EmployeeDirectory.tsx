'use client'

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Download, Upload, Eye, Edit3, Trash2, 
  X, Check, AlertCircle, Building, User, Mail, Phone, Calendar, 
  ChevronLeft, ChevronRight, Shield, RefreshCw
} from 'lucide-react';
import { Persona } from './PeopleHeader';
import { toast } from 'sonner';

interface EmployeeDirectoryProps {
  currentPersona: Persona;
}

export function EmployeeDirectory({ currentPersona }: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 15;
  const [viewMode, setViewMode] = useState<'list' | 'org'>('list');

  const [departments, setDepartments] = useState<any[]>([]);
  const [workAreas, setWorkAreas] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  const orgDivisions = React.useMemo(() => {
    const map = new Map<string, { code: string; name: string; totalEmployees: number; depts: any[] }>();
    departments.forEach((d: any) => {
      const divCode = d.division_code || 'OTHER';
      const divName = d.division_name || 'ฝ่ายอื่นๆ / ส่วนกลาง';
      if (!map.has(divCode)) {
        map.set(divCode, { code: divCode, name: divName, totalEmployees: 0, depts: [] });
      }
      const entry = map.get(divCode)!;
      entry.totalEmployees += (Number(d.employee_count) || 0);
      entry.depts.push(d);
    });
    return Array.from(map.values()).sort((a, b) => b.totalEmployees - a.totalEmployees);
  }, [departments]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // New Employee Form state
  const [newEmp, setNewEmp] = useState({
    employee_code: '',
    prefix: 'นาย',
    first_name: '',
    last_name: '',
    nickname: '',
    email: '',
    phone: '',
    department_id: '',
    work_area_id: '',
    employment_type: 'Monthly',
    system_role: 'Employee'
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        department_id: deptFilter,
        employment_type: typeFilter,
        status: statusFilter,
        role: roleFilter,
        limit: String(limit),
        offset: String(page * limit)
      });
      const res = await fetch(`/api/people/employees?${params}`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data);
        setTotal(json.total);
        if (json.filters?.departments) setDepartments(json.filters.departments);
        if (json.filters?.workAreas) setWorkAreas(json.filters.workAreas);
      }
    } catch (err: any) {
      toast.error('ไม่สามารถโหลดข้อมูลพนักงานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, deptFilter, typeFilter, statusFilter, roleFilter, page]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.employee_code || !newEmp.first_name || !newEmp.last_name) {
      toast.error('กรุณากรอกรหัสพนักงาน ชื่อ และนามสกุล');
      return;
    }

    try {
      const res = await fetch('/api/people/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`เพิ่มพนักงาน ${json.data.first_name} สำเร็จ (ระบบสร้างสิทธิ์วันลาให้อัตโนมัติ)`);
        setShowAddModal(false);
        setNewEmp({
          employee_code: '', prefix: 'นาย', first_name: '', last_name: '',
          nickname: '', email: '', phone: '', department_id: '', work_area_id: '',
          employment_type: 'Monthly', system_role: 'Employee'
        });
        fetchEmployees();
      } else {
        toast.error(json.error || 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleSoftDelete = async (emp: any) => {
    if (!confirm(`ยืนยันการระงับสถานะพนักงาน ${emp.employee_code}: ${emp.first_name} ${emp.last_name}? (ใช้ Soft Delete เพื่อรักษาประวัติย้อนหลัง)`)) {
      return;
    }
    try {
      const res = await fetch('/api/people/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id, is_soft_delete: true })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('ระงับสถานะพนักงานเรียบร้อยแล้ว');
        fetchEmployees();
        if (selectedEmp?.id === emp.id) setSelectedEmp(null);
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการลบ');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Mode Toggle Banner */}
      <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>📋 ทะเบียนรายชื่อพนักงาน ({total} คน)</span>
          </button>
          <button
            onClick={() => setViewMode('org')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'org'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>🏢 โครงสร้างองค์กร ({departments.length} แผนก)</span>
          </button>
        </div>

        {viewMode === 'org' ? (
          <span className="text-[11px] text-slate-400 font-medium">
            💡 คลิกที่แผนกใดก็ได้ เพื่อดูรายชื่อพนักงานในแผนกนั้น
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">
            กำลังแสดง {total} คนจากฐานข้อมูลจริง
          </span>
        )}
      </div>

      {viewMode === 'org' ? (
        <div className="space-y-6">
          {/* Org KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                <span>👥</span>
                <span>พนักงานทั้งหมด</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{total} <span className="text-xs font-semibold text-slate-400">คน</span></div>
              <div className="text-[11px] text-slate-400 mt-0.5">ในฐานข้อมูล Master</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                <span>🏛️</span>
                <span>สายงาน / ฝ่าย (Divisions)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{orgDivisions.filter(d => d.totalEmployees > 0).length} <span className="text-xs font-semibold text-slate-400">ฝ่าย</span></div>
              <div className="text-[11px] text-slate-400 mt-0.5">โครงสร้างบริหารหลัก</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                <span>🏢</span>
                <span>แผนกปฏิบัติงาน</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{departments.filter(d => (Number(d.employee_count) || 0) > 0).length} <span className="text-xs font-semibold text-slate-400">แผนก</span></div>
              <div className="text-[11px] text-slate-400 mt-0.5">กระจายตามจุดปฏิบัติงาน</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                <span>🏭</span>
                <span>สายงานผลิต (Operations)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                {(orgDivisions.find(d => d.code === 'PD')?.totalEmployees || 0) + (orgDivisions.find(d => d.code === 'DIV-OPS')?.totalEmployees || 0)} <span className="text-xs font-semibold text-slate-400">คน</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">กำลังคนหลักของโรงงาน</div>
            </div>
          </div>

          {/* Divisions & Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgDivisions.filter(d => d.totalEmployees > 0).map(div => (
              <div key={div.code} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-amber-400 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 font-black text-xs flex items-center justify-center border border-amber-200">
                        {div.code}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{div.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">รหัสฝ่าย: {div.code}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 shrink-0">
                      {div.totalEmployees} คน
                    </span>
                  </div>

                  {/* Departments inside this division */}
                  <div className="mt-3 space-y-2">
                    {div.depts.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setDeptFilter(d.id);
                          setViewMode('list');
                          setPage(0);
                        }}
                        className="group p-2.5 rounded-xl bg-slate-50/70 hover:bg-amber-50/60 border border-slate-200/60 hover:border-amber-300 transition cursor-pointer flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 text-xs group-hover:text-amber-900 truncate">
                              {d.department_name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold shrink-0">
                              ({d.department_code})
                            </span>
                          </div>
                          <div className="w-28 bg-slate-200 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.round(((d.employee_count || 0) / (div.totalEmployees || 1)) * 100))}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-slate-700 text-xs">
                            {d.employee_count || 0} คน
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Search & Actions Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัส, ชื่อ-สกุล, ชื่อเล่น, หรืออีเมล..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {currentPersona.role.includes('HR') || currentPersona.role === 'Admin' ? (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>นำเข้า CSV / Excel</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มพนักงานใหม่</span>
              </button>
            </>
          ) : null}
          <a
            href="/api/people/reports?type=EMPLOYEE_LIST&format=csv"
            download
            className="px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดรายชื่อ</span>
          </a>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold">
          <Filter className="w-3.5 h-3.5 text-amber-600" />
          <span>ตัวกรอง:</span>
        </div>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none"
        >
          <option value="">ทุกแผนก ({departments.length})</option>
          {departments.map((d: any) => (
            <option key={d.id} value={d.id}>{d.department_name}</option>
          ))}
        </select>

        {/* Employment Type */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none"
        >
          <option value="">ประเภทการจ้างทั้งหมด</option>
          <option value="Monthly">พนักงานรายเดือน (Monthly)</option>
          <option value="Daily">พนักงานรายวัน (Daily)</option>
          <option value="Contract">สัญญาจ้าง (Contract)</option>
          <option value="Outsource">เอาต์ซอร์ส (Outsource)</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="Permanent">บรรจุแล้ว (Permanent)</option>
          <option value="Probation">ทดลองงาน (Probation)</option>
          <option value="Active">ปฏิบัติงานปกติ (Active)</option>
        </select>

        {/* Role */}
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none"
        >
          <option value="">สิทธิ์ทั้งหมด (Role)</option>
          <option value="Employee">Employee</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Manager">Manager</option>
          <option value="HR Officer">HR Officer</option>
          <option value="HR Manager">HR Manager</option>
          <option value="Executive">Executive</option>
          <option value="Admin">Admin</option>
        </select>

        {(deptFilter || typeFilter || statusFilter || roleFilter || search) && (
          <button
            onClick={() => {
              setDeptFilter('');
              setTypeFilter('');
              setStatusFilter('');
              setRoleFilter('');
              setSearch('');
              setPage(0);
            }}
            className="text-amber-700 font-bold hover:underline ml-auto"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">รหัสพนักงาน</th>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4">แผนก / สายงาน</th>
                <th className="py-3 px-4">พื้นที่ปฏิบัติงาน</th>
                <th className="py-3 px-3 text-center">ประเภท</th>
                <th className="py-3 px-3 text-center">สิทธิ์ในระบบ</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    กำลังโหลดข้อมูลพนักงาน...
                  </td>
                </tr>
              ) : employees.length > 0 ? (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {emp.employee_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        {emp.prefix} {emp.first_name} {emp.last_name}
                      </div>
                      {emp.nickname && (
                        <div className="text-[11px] text-slate-400">ชื่อเล่น: {emp.nickname}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700">{emp.department_name || '-'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.department_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp.work_area_name || 'สำนักงาน'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        emp.employment_type === 'Monthly' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        emp.employment_type === 'Daily' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {emp.employment_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.system_role === 'HR Manager' ? 'bg-purple-100 text-purple-800' :
                        emp.system_role === 'Supervisor' ? 'bg-amber-100 text-amber-800' :
                        emp.system_role === 'Manager' ? 'bg-indigo-100 text-indigo-800' :
                        emp.system_role === 'Admin' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {emp.system_role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {emp.employment_status || 'Permanent'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedEmp(emp)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-amber-600 transition"
                          title="ดูโปรไฟล์ 360"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(currentPersona.role.includes('HR') || currentPersona.role === 'Admin') && (
                          <button
                            onClick={() => handleSoftDelete(emp)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                            title="ระงับสถานะ (Soft Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            แสดง {Math.min(total, page * limit + 1)} ถึง {Math.min(total, (page + 1) * limit)} จากทั้งหมด {total} คน
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 font-bold text-slate-800">หน้า {page + 1}</span>
            <button
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* 360 Profile Drawer / Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-lg flex items-center justify-center">
                  {selectedEmp.first_name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedEmp.prefix} {selectedEmp.first_name} {selectedEmp.last_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedEmp.employee_code} • {selectedEmp.system_role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2">
                <div className="font-bold text-slate-700">ข้อมูลการทำงาน (Employment)</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>แผนก: <strong className="text-slate-800">{selectedEmp.department_name}</strong></div>
                  <div>พื้นที่ปฏิบัติงาน: <strong className="text-slate-800">{selectedEmp.work_area_name || 'สำนักงาน'}</strong></div>
                  <div>ประเภทการจ้าง: <strong className="text-slate-800">{selectedEmp.employment_type}</strong></div>
                  <div>สถานะ: <strong className="text-emerald-700">{selectedEmp.employment_status}</strong></div>
                  <div>หัวหน้างาน: <strong className="text-slate-800">{selectedEmp.supervisor_first_name ? `${selectedEmp.supervisor_first_name} ${selectedEmp.supervisor_last_name}` : '-'}</strong></div>
                  <div>วันที่เริ่มงาน: <strong className="text-slate-800">{new Date(selectedEmp.hire_date).toLocaleDateString('th-TH')}</strong></div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2">
                <div className="font-bold text-slate-700">ข้อมูลติดต่อ (Contact)</div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>อีเมล: <strong className="text-slate-800">{selectedEmp.email || '-'}</strong></div>
                  <div>เบอร์โทร: <strong className="text-slate-800">{selectedEmp.phone || '-'}</strong></div>
                  <div>ภาษาใช้งาน: <strong className="text-slate-800">{selectedEmp.preferred_language || 'th'}</strong></div>
                  <div>สถานที่: <strong className="text-slate-800">{selectedEmp.work_location || 'Cosmediva Navanakorn'}</strong></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedEmp(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">เพิ่มพนักงานใหม่ (Add Employee)</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">คำนำหน้า</label>
                  <select
                    value={newEmp.prefix}
                    onChange={(e) => setNewEmp({ ...newEmp, prefix: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="น.ส.">น.ส.</option>
                    <option value="ดร.">ดร.</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">รหัสพนักงาน *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น PK-NEW001"
                    value={newEmp.employee_code}
                    onChange={(e) => setNewEmp({ ...newEmp, employee_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.first_name}
                    onChange={(e) => setNewEmp({ ...newEmp, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.last_name}
                    onChange={(e) => setNewEmp({ ...newEmp, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">แผนก</label>
                  <select
                    value={newEmp.department_id}
                    onChange={(e) => setNewEmp({ ...newEmp, department_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="">เลือกแผนก</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">พื้นที่ปฏิบัติงาน</label>
                  <select
                    value={newEmp.work_area_id}
                    onChange={(e) => setNewEmp({ ...newEmp, work_area_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="">เลือกพื้นที่งาน</option>
                    {workAreas.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.work_area_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ประเภทการจ้าง</label>
                  <select
                    value={newEmp.employment_type}
                    onChange={(e) => setNewEmp({ ...newEmp, employment_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="Monthly">พนักงานรายเดือน (Monthly)</option>
                    <option value="Daily">พนักงานรายวัน (Daily)</option>
                    <option value="Contract">สัญญาจ้าง (Contract)</option>
                    <option value="Outsource">เอาต์ซอร์ส (Outsource)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">สิทธิ์ในระบบ (Role)</label>
                  <select
                    value={newEmp.system_role}
                    onChange={(e) => setNewEmp({ ...newEmp, system_role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Manager">Manager</option>
                    <option value="HR Officer">HR Officer</option>
                    <option value="HR Manager">HR Manager</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">นำเข้าข้อมูลพนักงาน (CSV / Excel Import)</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
                <p className="font-bold">ขั้นตอนการนำเข้า:</p>
                <p>1. ดาวน์โหลดไฟล์เทมเพลต CSV หรือ Excel</p>
                <p>2. กรอกรหัสพนักงาน ชื่อ นามสกุล แผนก</p>
                <p>3. ระบบจะตรวจสอบความถูกต้อง (Validate) ก่อนนำเข้าจริง</p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-amber-400 transition cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-bold text-slate-700">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                <p className="text-slate-400 text-[11px] mt-1">รองรับไฟล์ .csv, .xlsx (ขนาดไม่เกิน 5 MB)</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href="/api/people/reports?type=EMPLOYEE_LIST&format=csv"
                download
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด Template</span>
              </a>
              <button
                onClick={() => {
                  toast.success('ระบบพร้อมสำหรับนำเข้าไฟล์');
                  setShowImportModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
