'use client'

import React, { useState } from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import { Search, Wrench, Package, FileText, ArrowRight, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { searchMaintenance } from '@/app/actions/maintenance'

export default function MaintenanceSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    machines: any[]
    workOrders: any[]
    parts: any[]
  }>({ machines: [], workOrders: [], parts: [] })
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const res = await searchMaintenance(query)
      if (res.success && res.data) {
        setResults(res.data)
        setHasSearched(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const quickQueries = ['MX-04', 'Bearing', 'FL-01', 'Sensor', 'Wear & Tear', 'Solenoid', 'CP-01']

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-5xl w-full mx-auto space-y-6">
      <MaintenanceHeader />

      {/* Search Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4 text-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            ระบบสืบค้นประวัติงานซ่อมบำรุงอัจฉริยะ (Global Search)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            ค้นหาครอบคลุมทุกมิติ: รหัสเครื่อง, ชื่องานซ่อม, เลขที่ใบสั่ง, อาการเสีย, อะไหล่ หรือสาเหตุ (Root Cause)
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ลองพิมพ์ เช่น 'MX-04 bearing', 'FL-01', 'เซนเซอร์'..."
              className="pl-12 h-13 text-sm rounded-2xl bg-stone-50 border-stone-300 focus:ring-2 focus:ring-[#D4AF37]"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="h-13 px-6 rounded-2xl font-bold bg-[#2A2521] hover:bg-stone-800 text-white text-sm"
          >
            {isLoading ? 'กำลังค้น...' : 'ค้นหา'}
          </Button>
        </form>

        {/* Quick Search Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-xs text-stone-400 mr-1">คำค้นยอดนิยม:</span>
          {quickQueries.map(q => (
            <button
              type="button"
              key={q}
              onClick={() => {
                setQuery(q)
                setTimeout(() => {
                  searchMaintenance(q).then(res => {
                    if (res.success && res.data) {
                      setResults(res.data)
                      setHasSearched(true)
                    }
                  })
                }, 50)
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-amber-50 hover:text-amber-900 border border-stone-200 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {hasSearched && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Machines Result */}
          {results.machines.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Wrench className="w-4 h-4 text-[#D4AF37]" />
                <span>เครื่องจักรที่ตรงกัน ({results.machines.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.machines.map(m => (
                  <Link
                    key={m.id}
                    href={`/maintenance/machines/${m.machine_code}`}
                    className="p-3.5 rounded-2xl border border-stone-200 hover:border-[#D4AF37] hover:bg-amber-50/30 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono font-bold text-stone-900 text-sm">{m.machine_code}</div>
                      <div className="text-xs text-stone-700 font-medium">{m.machine_name}</div>
                      <div className="text-[10px] text-stone-400">{m.production_area || m.category}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Work Orders Result */}
          {results.workOrders.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>ใบสั่งซ่อมและประวัติการเสีย ({results.workOrders.length})</span>
              </div>
              <div className="space-y-2">
                {results.workOrders.map(wo => (
                  <div
                    key={wo.id}
                    className="p-3.5 rounded-2xl border border-stone-200 hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-500">{wo.wo_number}</span>
                        <span className="font-bold text-sm text-stone-900">{wo.machine_code}</span>
                        <span className="px-2 py-0.2 rounded-md bg-stone-100 text-stone-700 text-[10px] font-bold">
                          {wo.status}
                        </span>
                      </div>
                      <div className="text-xs text-stone-700 mt-1">
                        อาการ: <b>{wo.symptom_category}</b> {wo.root_cause ? `| สาเหตุ: ${wo.root_cause}` : ''}
                      </div>
                    </div>

                    <Link
                      href={`/maintenance/machines/${wo.machine_code}`}
                      className="text-xs font-bold text-[#8B7355] hover:underline self-end sm:self-auto"
                    >
                      ดูประวัติเครื่องนี้
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spare Parts Result */}
          {results.parts.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Package className="w-4 h-4 text-amber-600" />
                <span>อะไหล่ที่ตรงกัน ({results.parts.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.parts.map(p => (
                  <div key={p.id} className="p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-stone-900 text-xs">{p.part_code}</div>
                      <div className="text-xs font-bold text-stone-800">{p.part_name}</div>
                      <div className="text-[10px] text-stone-400">ชั้นเก็บ: {p.storage_location}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-800">
                      คงเหลือ {p.stock_qty} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.machines.length === 0 && results.workOrders.length === 0 && results.parts.length === 0 && (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-xs text-stone-400">
              ไม่พบข้อมูลที่ตรงกับคำค้นหา &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
