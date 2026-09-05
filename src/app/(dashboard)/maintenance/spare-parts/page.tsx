'use client'

import React, { useState, useEffect } from 'react'
import MaintenanceHeader from '@/components/maintenance/MaintenanceHeader'
import { 
  Package, 
  Search, 
  Filter, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MaintenanceSparePart } from '@/types/maintenance'
import { getSpareParts } from '@/app/actions/maintenance'

export default function SparePartsPage() {
  const [parts, setParts] = useState<MaintenanceSparePart[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchParts = async () => {
    setIsLoading(true)
    try {
      const res = await getSpareParts({
        category: categoryFilter,
        lowStockOnly,
        search
      })
      if (res.success) setParts(res.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchParts()
  }, [categoryFilter, lowStockOnly])

  const categories = ['all', 'Bearing', 'Seal & Gasket', 'Pneumatic', 'Electrical', 'Sensor', 'Motor', 'Belt']

  const totalValue = parts.reduce((acc, p) => acc + (p.stock_qty * p.average_cost), 0)
  const lowStockCount = parts.filter(p => p.stock_qty <= p.min_stock).length

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
      <MaintenanceHeader />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">รายการอะไหล่ทั้งหมด</span>
          <span className="text-2xl font-black text-stone-900">{parts.length}</span>
          <span className="text-[10px] text-stone-400 block">SKUs</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">อะไหล่ใกล้หมด (Low Stock)</span>
          <span className={`text-2xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-stone-900'}`}>
            {lowStockCount}
          </span>
          <span className="text-[10px] text-stone-400 block">รายการต้องสั่งซื้อ</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm col-span-2">
          <span className="text-xs text-stone-500 font-medium block">มูลค่าสต็อกอะไหล่รวม</span>
          <span className="text-2xl font-black text-[#8B7355]">฿{totalValue.toLocaleString()}</span>
          <span className="text-[10px] text-stone-400 block">THB</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-stone-900">คลังอะไหล่และชิ้นส่วนสิ้นเปลือง (Spare Parts Inventory)</h2>
          <div className="text-xs text-stone-500">
            ระบบบริหารอะไหล่ เชื่อมโยงประวัติเครื่องจักร ตัดสต็อก และเตือนสั่งซื้อ Min/Max อัตโนมัติ
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchParts()}
              placeholder="ค้นรหัส, ชื่ออะไหล่, ชั้นวาง..."
              className="pl-9 h-10 text-xs rounded-xl bg-stone-50 border-stone-200"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-xl text-xs font-bold bg-stone-50 border border-stone-200 text-stone-700"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              lowStockOnly
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            เฉพาะสต็อกต่ำ
          </button>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
              <tr>
                <th className="py-3 px-4 font-bold">รหัสอะไหล่</th>
                <th className="py-3 px-4 font-bold">ชื่ออะไหล่ & รายละเอียด</th>
                <th className="py-3 px-4 font-bold">หมวดหมู่ & แบรนด์</th>
                <th className="py-3 px-4 font-bold">เครื่องที่รองรับ</th>
                <th className="py-3 px-4 font-bold">ตำแหน่งจัดเก็บ</th>
                <th className="py-3 px-4 font-bold text-center">คงเหลือ (Min/Max)</th>
                <th className="py-3 px-4 font-bold text-right">ราคาเฉลี่ย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    ไม่พบรายการอะไหล่ที่ค้นหา
                  </td>
                </tr>
              ) : (
                parts.map(p => {
                  const isLow = p.stock_qty <= p.min_stock

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">{p.part_code}</td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-stone-900">{p.part_name}</div>
                        <div className="text-[11px] text-stone-500 truncate">{p.specification || p.model}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-800">
                          {p.category}
                        </span>
                        <div className="text-[11px] text-stone-400 mt-0.5">{p.brand}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.compatible_machines?.map(code => (
                            <span key={code} className="px-1.5 py-0.2 bg-amber-50 text-amber-900 text-[10px] font-mono font-bold rounded border border-amber-200">
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{p.storage_location || 'คลังกลาง'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            isLow ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse' : 'bg-stone-100 text-stone-800'
                          }`}>
                            {p.stock_qty} {p.unit}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          Min: {p.min_stock} / Max: {p.max_stock}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#8B7355]">
                        ฿{Number(p.average_cost).toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
