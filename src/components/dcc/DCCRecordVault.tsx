'use client'

import React, { useState, useMemo } from 'react'
import { 
  FileText, Search, Filter, ExternalLink, Printer, Share2, 
  CheckCircle2, Clock, ShieldCheck, ArrowUpDown, ChevronRight,
  Layers, Download
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DCCExecutedRecord, DCC_STREAMS, DCC_DEPARTMENTS } from '@/types/dcc'
import DCCEFormModal from './DCCEFormModal'
import Link from 'next/link'

interface DCCRecordVaultProps {
  records: DCCExecutedRecord[]
  initialSearch?: string
}

export default function DCCRecordVault({ records, initialSearch = '' }: DCCRecordVaultProps) {
  const [search, setSearch] = useState(initialSearch)
  const [selectedStream, setSelectedStream] = useState<string>('ALL')
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<DCCExecutedRecord | null>(null)

  // Filter departments based on selected stream
  const availableDepts = useMemo(() => {
    if (selectedStream === 'ALL') return DCC_DEPARTMENTS
    return DCC_DEPARTMENTS.filter(d => d.streamCode === selectedStream)
  }, [selectedStream])

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchStream = selectedStream === 'ALL' || r.streamCode === selectedStream
      const matchDept = selectedDept === 'ALL' || r.departmentCode === selectedDept
      const s = search.toLowerCase().trim()
      const matchSearch = !s || (
        r.recordNumber.toLowerCase().includes(s) ||
        r.docCode.toLowerCase().includes(s) ||
        r.formTitle.toLowerCase().includes(s) ||
        (r.lotNo && r.lotNo.toLowerCase().includes(s)) ||
        (r.machineCode && r.machineCode.toLowerCase().includes(s)) ||
        r.operatorName.toLowerCase().includes(s)
      )
      return matchStream && matchDept && matchSearch
    })
  }, [records, selectedStream, selectedDept, search])

  const handleStreamChange = (streamCode: string) => {
    setSelectedStream(streamCode)
    setSelectedDept('ALL')
  }

  return (
    <div className="space-y-4">
      {/* Search & Stream Filter Header */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
        {/* Stream Pills (5 สายงานขึ้นตรงกับ PDT) */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
          <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
            สายงาน (Stream):
          </span>
          <button
            onClick={() => handleStreamChange('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStream === 'ALL'
                ? 'bg-stone-900 text-[#D4AF37]'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            ทั้งหมด (5 สายงาน / 20 แผนก)
          </button>
          {DCC_STREAMS.map(stream => (
            <button
              key={stream.code}
              onClick={() => handleStreamChange(stream.code)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedStream === stream.code
                  ? 'bg-stone-900 text-[#D4AF37] shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{stream.code}</span>
              <span className="text-[10px] opacity-75 font-normal">({stream.nameTh.split(' ')[1] || ''})</span>
            </button>
          ))}
        </div>

        {/* Search Input & Department Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="ค้นด้วยเลขที่บันทึก (WO#, BMR Lot No, PO#), รหัสเครื่อง (AFILL-PK-001), รหัสฟอร์ม (MT-PF-001D)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-xs bg-stone-50 border-stone-200 h-9 rounded-lg focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-stone-400 hover:text-stone-700 absolute right-3 top-1/2 -translate-y-1/2 font-bold"
              >
                ล้าง
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 font-medium text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] w-full sm:w-auto"
            >
              <option value="ALL">ทุกแผนก ({availableDepts.length} แผนก)</option>
              {availableDepts.map(d => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTh}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Executed Records Count Summary */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <span>
          พบบันทึกคุณภาพจริง <b className="text-stone-900">{filteredRecords.length}</b> รายการ (จัดเก็บถาวร Immutable Record ตามข้อกำหนด GMP)
        </span>
        <span className="text-[11px] text-stone-400 hidden sm:inline">
          ขึ้นตรงกับฝ่ายบริหาร: <b className="text-[#8B7355]">Plant Director (PDT)</b>
        </span>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">เลขที่บันทึก (Record No.)</th>
                <th className="py-3 px-4">รหัส & ชื่อแบบฟอร์ม E-Form</th>
                <th className="py-3 px-3">สายงาน / แผนก</th>
                <th className="py-3 px-3">รุ่นผลิต / เครื่องจักร</th>
                <th className="py-3 px-3">ผู้บันทึก & ตรวจสอบ</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-3">วัน-เวลาปิดงาน</th>
                <th className="py-3 px-4 text-center">ดูเอกสาร A4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-semibold">ไม่พบบันทึกคุณภาพที่ตรงกับเงื่อนไขการค้นหา</p>
                    <p className="text-[11px] text-stone-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกสายงาน/แผนกอื่น</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-950">
                      {record.recordNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-stone-100 border border-stone-300 text-stone-800">
                          {record.docCode}
                        </span>
                        <span className="text-[11px] font-medium text-stone-500">Rev.{record.revisionUsed || '00'}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 truncate max-w-[240px] mt-0.5">
                        {record.formTitle}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900">{record.departmentCode}</span>
                        <span className="text-[10px] text-stone-500">{record.streamCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      {record.lotNo && (
                        <div className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 inline-block mb-0.5">
                          Lot: {record.lotNo}
                        </div>
                      )}
                      {record.machineCode && (
                        <div className="font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-300 inline-block">
                          {record.machineCode}
                        </div>
                      )}
                      {!record.lotNo && !record.machineCode && (
                        <span className="text-stone-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px]">
                      <div className="font-medium text-stone-800">{record.operatorName}</div>
                      <div className="text-[10px] text-stone-500">ตรวจ: {record.verifiedByName || '-'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                        record.status === 'CLOSED' ? 'bg-stone-900 text-white' :
                        record.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] font-mono text-stone-500 whitespace-nowrap">
                      {record.executedDate}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {record.viewEFormUrl && record.viewEFormUrl.includes('/eform') ? (
                          <Link
                            href={record.viewEFormUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] transition shadow-2xs"
                            title="เปิดดูแบบฟอร์ม A4 มาตรฐานฉบับเต็ม"
                          >
                            <span>ดู A4 E-Form</span>
                            <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRecordForModal(record)}
                            className="text-xs h-7 gap-1 border-stone-300 hover:bg-stone-100 text-stone-800 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#8B7355]" />
                            <span>ดู E-Form</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable E-Form Modal with Print Watermark */}
      <DCCEFormModal
        isOpen={Boolean(selectedRecordForModal)}
        onClose={() => setSelectedRecordForModal(null)}
        record={selectedRecordForModal}
      />
    </div>
  )
}
