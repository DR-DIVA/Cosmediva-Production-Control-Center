'use client'

import React, { useState } from 'react';
import { 
  FileDown, FileText, Download, Calendar, Users, 
  Clock, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';

export function ReportsView() {
  const [reportDate, setReportDate] = useState('2026-09-05');

  const reportItems = [
    {
      id: 'DAILY_ATTENDANCE',
      title: 'รายงานการลงเวลาประจำวัน (Daily Attendance Report)',
      description: 'สรุปเวลาเข้า-ออกจริง นาทีที่สาย นาทีที่ทำงาน และสถานะของพนักงานทุกคน',
      type: 'DAILY_ATTENDANCE',
      color: 'bg-emerald-500'
    },
    {
      id: 'EMPLOYEE_LIST',
      title: 'ทะเบียนประวัติพนักงาน (Employee Master Directory)',
      description: 'รายชื่อพนักงานทั้งหมด รหัส แผนก ตำแหน่ง ประเภทการจ้าง และข้อมูลติดต่อ',
      type: 'EMPLOYEE_LIST',
      color: 'bg-blue-500'
    },
    {
      id: 'LEAVE_BALANCES',
      title: 'รายงานสิทธิ์วันลาคงเหลือ (Leave Balance & Usage)',
      description: 'สิทธิ์วันลาทั้งปี ยกยอดมา ใช้ไปแล้ว รออนุมัติ และยอดคงเหลือปัจจุบัน',
      type: 'LEAVE_BALANCES',
      color: 'bg-amber-500'
    },
    {
      id: 'EXCEPTIONS',
      title: 'รายงานความผิดปกติการลงเวลา (Attendance Exception Report)',
      description: 'รายการขาดงาน มาสายเกินเกณฑ์ และลืมสแกนนิ้ว เพื่อการประมวลผล Payroll',
      type: 'EXCEPTIONS',
      color: 'bg-rose-500'
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>📊</span>
            <span>ศูนย์ดาวน์โหลดรายงานและการส่งออก (Reports & Data Export Center)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ส่งออกข้อมูลเป็นไฟล์ Excel หรือ CSV พร้อมรหัสภาษา UTF-8 รองรับการนำเข้าโปรแกรม Payroll
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">วันที่ประมวลผล:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
          />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportItems.map((r) => (
          <div 
            key={r.id}
            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl ${r.color} text-white flex items-center justify-center shrink-0 shadow-md`}>
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{r.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{r.description}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">Format: UTF-8 CSV / Excel</span>
              <a
                href={`/api/people/reports?type=${r.type}&date=${reportDate}&format=csv`}
                download
                onClick={() => toast.success(`กำลังดาวน์โหลด ${r.title}`)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด CSV</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
