'use client'

import React, { useState, useMemo } from 'react'
import { 
  QrCode, 
  Printer, 
  Search, 
  CheckSquare, 
  Square, 
  LayoutGrid, 
  Layers, 
  Info,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QRCodeSvg } from '@/lib/barcode'
import { MaintenanceMachine, getPmFrequencyInfo } from '@/types/maintenance'
import Link from 'next/link'

interface Props {
  initialMachines: MaintenanceMachine[]
}

type StickerLayout = '8_per_page' | '12_per_page' | '4_per_page' | 'single'

// Department definitions with matching heuristics
const DEPT_GROUPS = [
  { 
    id: 'ALL', 
    label: 'ทั้งหมด (All)', 
    matcher: () => true,
    color: 'bg-stone-900 text-[#D4AF37]'
  },
  { 
    id: 'PK', 
    label: 'แผนกบรรจุและแพ็กกิ้ง (Packing)', 
    matcher: (m: MaintenanceMachine) => {
      const dept = (m.department_name || '').toLowerCase()
      const area = (m.production_area || '').toLowerCase()
      const cat = (m.category || '').toLowerCase()
      const code = (m.machine_code || '').toUpperCase()
      return dept.includes('pack') || area.includes('pack') || cat.includes('pack') || cat.includes('fill') || cat.includes('seal') || cat.includes('label') || code.includes('-PK-')
    },
    color: 'bg-blue-900 text-blue-200'
  },
  { 
    id: 'MX', 
    label: 'แผนกผสม (Mixing)', 
    matcher: (m: MaintenanceMachine) => {
      const dept = (m.department_name || '').toLowerCase()
      const area = (m.production_area || '').toLowerCase()
      const cat = (m.category || '').toLowerCase()
      const code = (m.machine_code || '').toUpperCase()
      return dept.includes('mix') || area.includes('mix') || cat.includes('mix') || code.includes('-MX-')
    },
    color: 'bg-emerald-900 text-emerald-200'
  },
  { 
    id: 'WH', 
    label: 'คลังสินค้า & ชั่งสาร (Warehouse/RM)', 
    matcher: (m: MaintenanceMachine) => {
      const dept = (m.department_name || '').toLowerCase()
      const area = (m.production_area || '').toLowerCase()
      const code = (m.machine_code || '').toUpperCase()
      return dept.includes('raw') || dept.includes('mm') || area.includes('warehouse') || area.includes('preparing') || code.includes('-WH-') || code.includes('-MM-')
    },
    color: 'bg-amber-900 text-amber-200'
  },
  { 
    id: 'QC', 
    label: 'ควบคุมคุณภาพ (QC Lab)', 
    matcher: (m: MaintenanceMachine) => {
      const dept = (m.department_name || '').toLowerCase()
      const area = (m.production_area || '').toLowerCase()
      const cat = (m.category || '').toLowerCase()
      const code = (m.machine_code || '').toUpperCase()
      return dept.includes('qc') || dept.includes('quality') || area.includes('qc') || cat.includes('quality') || code.includes('-QC-')
    },
    color: 'bg-purple-900 text-purple-200'
  },
  { 
    id: 'RD', 
    label: 'วิจัยและพัฒนา (R&D Lab)', 
    matcher: (m: MaintenanceMachine) => {
      const dept = (m.department_name || '').toLowerCase()
      const area = (m.production_area || '').toLowerCase()
      const cat = (m.category || '').toLowerCase()
      const code = (m.machine_code || '').toUpperCase()
      return dept.includes('r&d') || dept.includes('rd') || area.includes('rd') || cat.includes('r&d') || code.includes('-RD-')
    },
    color: 'bg-rose-900 text-rose-200'
  },
  { 
    id: 'FAC', 
    label: 'วิศวกรรม & ยูทิลิตี้ (Utility/FAC)', 
    matcher: (m: MaintenanceMachine) => {
      const dept = (m.department_name || '').toLowerCase()
      const area = (m.production_area || '').toLowerCase()
      const cat = (m.category || '').toLowerCase()
      const code = (m.machine_code || '').toUpperCase()
      return dept.includes('eng') || dept.includes('fac') || area.includes('util') || cat.includes('util') || code.includes('-FAC-') || code.includes('-UTL-') || code.includes('-ENG-')
    },
    color: 'bg-cyan-900 text-cyan-200'
  }
]

export default function MachineQRPrintStudio({ initialMachines }: Props) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL')
  const [selectedLayout, setSelectedLayout] = useState<StickerLayout>('8_per_page')
  const [search, setSearch] = useState('')
  const [selectedMachineCodes, setSelectedMachineCodes] = useState<Set<string>>(
    new Set(initialMachines.map(m => m.machine_code))
  )

  // Calculate counts per department
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    DEPT_GROUPS.forEach(g => {
      counts[g.id] = initialMachines.filter(g.matcher).length
    })
    return counts
  }, [initialMachines])

  // Filtered machines based on department and search
  const filteredMachines = useMemo(() => {
    const activeGroup = DEPT_GROUPS.find(g => g.id === selectedDeptId) || DEPT_GROUPS[0]
    return initialMachines.filter(m => {
      const matchDept = activeGroup.matcher(m)
      if (!matchDept) return false

      if (!search.trim()) return true
      const s = search.toLowerCase().trim()
      return (
        m.machine_code.toLowerCase().includes(s) ||
        m.machine_name.toLowerCase().includes(s) ||
        (m.production_area && m.production_area.toLowerCase().includes(s)) ||
        (m.department_name && m.department_name.toLowerCase().includes(s)) ||
        (m.category && m.category.toLowerCase().includes(s))
      )
    })
  }, [initialMachines, selectedDeptId, search])

  // Printable machines (filtered AND selected)
  const printableMachines = useMemo(() => {
    return filteredMachines.filter(m => selectedMachineCodes.has(m.machine_code))
  }, [filteredMachines, selectedMachineCodes])

  // Estimated sheets calculation
  const sheetsCount = useMemo(() => {
    const perPageMap: Record<StickerLayout, number> = {
      '8_per_page': 8,
      '12_per_page': 12,
      '4_per_page': 4,
      'single': 1
    }
    const perPage = perPageMap[selectedLayout]
    return Math.ceil(printableMachines.length / perPage) || 1
  }, [printableMachines.length, selectedLayout])

  // Bulk selection helpers
  const handleSelectAllFiltered = () => {
    const next = new Set(selectedMachineCodes)
    filteredMachines.forEach(m => next.add(m.machine_code))
    setSelectedMachineCodes(next)
  }

  const handleDeselectAllFiltered = () => {
    const next = new Set(selectedMachineCodes)
    filteredMachines.forEach(m => next.delete(m.machine_code))
    setSelectedMachineCodes(next)
  }

  const toggleMachine = (code: string) => {
    const next = new Set(selectedMachineCodes)
    if (next.has(code)) {
      next.delete(code)
    } else {
      next.add(code)
    }
    setSelectedMachineCodes(next)
  }

  const handlePrint = () => {
    window.print()
  }

  // Base URL for QR links
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cosmediva.app'

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Print Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, .no-print, [class*="z-[80]"], [class*="z-[70]"] {
            display: none !important;
          }
          .print-sheet {
            display: block !important;
            page-break-after: always;
            break-after: page;
          }
          .print-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

      {/* Screen Control Studio Header (Hidden on Print) */}
      <div className="no-print space-y-4">
        
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#D4AF37]/30 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#8B7355] uppercase tracking-wider">
              <Link href="/maintenance" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Maintenance
              </Link>
              <span>/</span>
              <Link href="/maintenance/machines" className="hover:underline">
                Machines 360°
              </Link>
              <span>/</span>
              <span className="text-stone-900">QR Sticker Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950 mt-1 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#8B7355]">
                <QrCode className="w-6 h-6" />
              </span>
              <span>สตูดิโอพิมพ์สติกเกอร์ QR Code ติดหน้าเครื่องจักร</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              จัดชุดพิมพ์สติกเกอร์ตามแผนก (A4 เลย์เอาต์ 8 / 12 / 4 ดวง) สำหรับนำไปแปะหน้าตู้คอนโทรล เพื่อให้สแกนแจ้งซ่อมได้ใน ≤ 60 วินาที
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              onClick={handlePrint}
              disabled={printableMachines.length === 0}
              className="bg-stone-950 hover:bg-stone-800 text-[#D4AF37] font-black px-5 py-2.5 rounded-xl shadow-md gap-2 text-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์สติกเกอร์ ({printableMachines.length} เครื่อง • ~{sheetsCount} หน้า A4)</span>
            </Button>
          </div>
        </div>

        {/* Step 1: Filter by Department (Pills) */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#D4AF37]" />
              1. เลือกชุดเครื่องจักรตามแผนกโรงงาน:
            </span>
            <span className="text-xs text-stone-500 font-medium">
              กำลังแสดง <b className="text-stone-900">{filteredMachines.length}</b> จากทั้งหมด {initialMachines.length} เครื่อง
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DEPT_GROUPS.map(g => {
              const isActive = selectedDeptId === g.id
              const count = deptCounts[g.id] || 0
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedDeptId(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                    isActive
                      ? 'bg-stone-900 text-[#D4AF37] border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <span>{g.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-[#D4AF37] text-stone-950 font-black' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Select Layout & Print Options */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Layout Options */}
            <div className="md:col-span-6 space-y-2">
              <span className="text-xs font-black text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-[#D4AF37]" />
                2. เลือกขนาดและเลย์เอาต์สติกเกอร์ (A4 Sticker Layout):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setSelectedLayout('8_per_page')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedLayout === '8_per_page'
                      ? 'bg-amber-50/80 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold text-stone-900">A4 • 8 ดวง</div>
                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">2x4 (มาตรฐาน)</div>
                  <div className="text-[10px] text-[#8B7355] font-mono mt-0.5">~99 x 68 มม.</div>
                </button>

                <button
                  onClick={() => setSelectedLayout('12_per_page')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedLayout === '12_per_page'
                      ? 'bg-amber-50/80 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold text-stone-900">A4 • 12 ดวง</div>
                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">2x6 (กะทัดรัด)</div>
                  <div className="text-[10px] text-[#8B7355] font-mono mt-0.5">~99 x 45 มม.</div>
                </button>

                <button
                  onClick={() => setSelectedLayout('4_per_page')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedLayout === '4_per_page'
                      ? 'bg-amber-50/80 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold text-stone-900">A4 • 4 ดวง</div>
                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">2x2 (ขนาดใหญ่)</div>
                  <div className="text-[10px] text-[#8B7355] font-mono mt-0.5">~99 x 135 มม.</div>
                </button>

                <button
                  onClick={() => setSelectedLayout('single')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedLayout === 'single'
                      ? 'bg-amber-50/80 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold text-stone-900">ป้ายเดี่ยว (1:1)</div>
                  <div className="text-[11px] text-stone-500 font-medium mt-0.5">1 แผ่นต่อเครื่อง</div>
                  <div className="text-[10px] text-[#8B7355] font-mono mt-0.5">ป้ายตู้เมนหลัก</div>
                </button>
              </div>
            </div>

            {/* Quick Search & Select Controls */}
            <div className="md:col-span-6 space-y-2">
              <span className="text-xs font-black text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#D4AF37]" />
                3. ค้นหา & จัดการการเลือก:
              </span>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="พิมพ์รหัส เช่น AFILL-PK-001, หม้อผสม, Room 2..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9 bg-stone-50 rounded-xl"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 font-bold"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllFiltered}
                  className="text-xs h-9 gap-1 font-bold border-stone-300"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>เลือกทั้งหมด ({filteredMachines.length})</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeselectAllFiltered}
                  className="text-xs h-9 gap-1 font-bold border-stone-300"
                >
                  <Square className="w-3.5 h-3.5 text-stone-400" />
                  <span>ล้าง</span>
                </Button>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>
                  เลือกพิมพ์: <b className="text-stone-900">{printableMachines.length}</b> เครื่อง 
                  ({selectedLayout.replace('_', ' ')})
                </span>
                <span className="font-mono text-[#8B7355] font-bold">
                  ประมาณ {sheetsCount} หน้ากระดาษ A4
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Informative Tip Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <b>เคล็ดลับการใช้งานหน้างานจริง:</b> สามารถใช้กระดาษสติกเกอร์ขาวด้านหรือขาวมันขนาด A4 ที่ตัดไดคัทสำเร็จรูป (เช่น 2x4 = 8 ช่อง) เข้าเครื่องปริ้นเตอร์เลเซอร์ได้ทันที หรือปริ้นลงกระดาษ A4 ปกติแล้วนำไปเคลือบพลาสติกแข็ง (Laminate) เจาะรูแขวนหรือติดกาวสองหน้า 3M ที่ตู้ควบคุมเครื่องจักรได้เลยค่ะ
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT AREA (Active on Screen as Preview and Formatted for @media print)   */}
      {/* ========================================================================= */}
      <div className="print-area">
        {printableMachines.length === 0 ? (
          <div className="no-print bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
            <QrCode className="w-12 h-12 mx-auto text-stone-300" />
            <p className="font-bold text-stone-700">ไม่มีเครื่องจักรที่ถูกเลือกสำหรับพิมพ์</p>
            <p className="text-xs">กรุณากด &quot;เลือกทั้งหมด&quot; หรือเลือกติ๊กเครื่องจักรที่ต้องการจากรายการด้านบน</p>
          </div>
        ) : (
          <div className={`
            ${selectedLayout === '8_per_page' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-4' : ''}
            ${selectedLayout === '12_per_page' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 print:grid-cols-2 print:gap-3' : ''}
            ${selectedLayout === '4_per_page' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6' : ''}
            ${selectedLayout === 'single' ? 'grid grid-cols-1 gap-6 max-w-xl mx-auto print:grid-cols-1' : ''}
          `}>
            {printableMachines.map((machine) => {
              const reportUrl = `${origin}/maintenance/report/${encodeURIComponent(machine.machine_code)}`

              return (
                <div
                  key={machine.id}
                  className={`print-card bg-white rounded-xl border-2 border-stone-900 p-3 flex flex-col justify-between relative shadow-xs transition ${
                    selectedLayout === '8_per_page' ? 'min-h-[220px] print:min-h-[66mm] print:max-h-[68mm]' : ''
                  } ${
                    selectedLayout === '12_per_page' ? 'min-h-[170px] print:min-h-[44mm] print:max-h-[46mm] p-2.5' : ''
                  } ${
                    selectedLayout === '4_per_page' ? 'min-h-[340px] print:min-h-[130mm] p-5' : ''
                  } ${
                    selectedLayout === 'single' ? 'min-h-[480px] p-8 text-center' : ''
                  }`}
                >
                  {/* Screen checkbox to deselect individual sticker */}
                  <div className="no-print absolute top-2 right-2 z-10">
                    <button
                      onClick={() => toggleMachine(machine.machine_code)}
                      className="text-stone-400 hover:text-red-600 transition p-1"
                      title="คลิกเพื่อเอาเครื่องนี้ออกจากการพิมพ์"
                    >
                      <CheckSquare className="w-4 h-4 text-stone-900" />
                    </button>
                  </div>

                  {/* Top Branding Header */}
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
                        CosmeFlow Asset QR
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 border border-stone-300 text-stone-800 font-mono">
                      Grade {machine.criticality || 'B'}
                    </span>
                  </div>

                  {/* Main Content Body (Grid Layout with QR on Right or Left) */}
                  <div className="flex items-center gap-3 my-auto">
                    
                    {/* Offline Crisp Vector QR Code */}
                    <div className="shrink-0 bg-white p-1 rounded-lg border border-stone-300 shadow-2xs flex items-center justify-center">
                      <QRCodeSvg
                        value={reportUrl}
                        size={
                          selectedLayout === '4_per_page' ? 140 :
                          selectedLayout === 'single' ? 220 :
                          selectedLayout === '12_per_page' ? 76 : 94
                        }
                      />
                    </div>

                    {/* Machine Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-stone-950 tracking-tight leading-none text-lg sm:text-xl print:text-xl truncate">
                          {machine.machine_code}
                        </span>
                        {machine.asset_id && (
                          <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200">
                            {machine.asset_id}
                          </span>
                        )}
                        {machine.pm_frequency_type && (
                          <span className="text-[9px] font-mono font-bold bg-cyan-50 text-cyan-800 px-1 py-0.2 rounded border border-cyan-200">
                            {getPmFrequencyInfo(machine.pm_frequency_type, machine.pm_frequency_interval).code}
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-stone-800 text-xs sm:text-sm print:text-xs leading-snug line-clamp-2">
                        {machine.machine_name}
                      </div>

                      <div className="text-[10px] text-stone-500 font-medium truncate flex items-center gap-1">
                        <span>📍</span>
                        <span>{machine.production_area || machine.department_name || 'ไลน์ผลิตทั่วไป'}</span>
                      </div>

                      <div className="text-[9px] text-stone-400 font-mono truncate">
                        หมวด: {machine.category || 'ทั่วไป'} • SN: {machine.serial_number || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer (Smart QR 3-in-1 CTA) */}
                  <div className="mt-2 pt-1.5 border-t border-stone-200 flex items-center justify-between">
                    <div className="bg-emerald-700 text-white font-black text-[8px] sm:text-[9.5px] px-2 py-0.5 rounded flex items-center gap-1">
                      <span>📱</span>
                      <span>สแกนเพื่อ: แจ้งซ่อม | เบิกอะไหล่ | ตรวจ PM</span>
                    </div>
                    <span className="text-[8px] text-stone-400 font-mono uppercase tracking-widest hidden sm:inline print:inline">
                      GMP/ISO Tag
                    </span>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
