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
  MapPin,
  ShoppingCart,
  ShieldAlert,
  Settings2,
  FileText,
  Flame
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MaintenanceSparePart } from '@/types/maintenance'
import { getSpareParts } from '@/app/actions/maintenance'
import EditSafetyStockModal from '@/components/maintenance/EditSafetyStockModal'
import CreatePRModal from '@/components/maintenance/CreatePRModal'

export default function SparePartsPage() {
  const [parts, setParts] = useState<MaintenanceSparePart[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [criticalStockOnly, setCriticalStockOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [selectedSafetyPart, setSelectedSafetyPart] = useState<MaintenanceSparePart | null>(null)
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false)
  const [selectedPRPart, setSelectedPRPart] = useState<MaintenanceSparePart | null>(null)
  const [isPRModalOpen, setIsPRModalOpen] = useState(false)

  const fetchParts = async () => {
    setIsLoading(true)
    try {
      const res = await getSpareParts({
        category: categoryFilter,
        lowStockOnly: lowStockOnly && !criticalStockOnly, // backend handles basic low stock if needed
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
  const criticalStockCount = parts.filter(p => p.stock_qty <= 1).length

  // Filter parts for criticalStockOnly (<= 1 item or 0 item)
  const displayedParts = parts.filter(p => {
    if (criticalStockOnly) {
      return p.stock_qty <= 1
    }
    return true
  })

  const openSafetyStock = (part: MaintenanceSparePart) => {
    setSelectedSafetyPart(part)
    setIsSafetyModalOpen(true)
  }

  const openPRModal = (part: MaintenanceSparePart) => {
    setSelectedPRPart(part)
    setIsPRModalOpen(true)
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-6">
      <MaintenanceHeader />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">รายการอะไหล่ทั้งหมด</span>
          <span className="text-2xl font-black text-stone-900">{parts.length}</span>
          <span className="text-[10px] text-stone-400 block">SKUs ทั้งหมดในคลัง</span>
        </div>

        {/* Critical Stock KPI (<= 1 piece) */}
        <div 
          onClick={() => {
            setCriticalStockOnly(!criticalStockOnly)
            if (!criticalStockOnly) setLowStockOnly(false)
          }}
          className={`p-4 rounded-3xl border shadow-sm cursor-pointer transition-all ${
            criticalStockOnly 
              ? 'bg-red-50 border-red-400 ring-2 ring-red-400' 
              : 'bg-white border-stone-200 hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium block text-red-600">🚨 เหลือชิ้นสุดท้าย / หมด</span>
            {criticalStockCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black animate-pulse">
                ด่วนมาก
              </span>
            )}
          </div>
          <span className={`text-2xl font-black ${criticalStockCount > 0 ? 'text-red-600' : 'text-stone-900'}`}>
            {criticalStockCount}
          </span>
          <span className="text-[10px] text-stone-400 block">คงเหลือ ≤ 1 ชิ้น (กดเพื่อกรอง)</span>
        </div>

        {/* Low Stock KPI (<= min_stock) */}
        <div 
          onClick={() => {
            setLowStockOnly(!lowStockOnly)
            if (!lowStockOnly) setCriticalStockOnly(false)
          }}
          className={`p-4 rounded-3xl border shadow-sm cursor-pointer transition-all ${
            lowStockOnly 
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400' 
              : 'bg-white border-stone-200 hover:border-amber-200'
          }`}
        >
          <span className="text-xs text-stone-500 font-medium block">⚠️ ต่ำกว่า Safety Stock</span>
          <span className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
            {lowStockCount}
          </span>
          <span className="text-[10px] text-stone-400 block">ถึงจุดสั่งซื้อใหม่ (Reorder)</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-medium block">มูลค่าสต็อกอะไหล่รวม</span>
          <span className="text-2xl font-black text-[#8B7355]">฿{totalValue.toLocaleString()}</span>
          <span className="text-[10px] text-stone-400 block">THB ประเมินตามราคาทุน</span>
        </div>
      </div>

      {/* Critical Stock Alert Banner if there are items <= 1 */}
      {criticalStockCount > 0 && !criticalStockOnly && (
        <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 border border-red-200">
              <Flame className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-black text-red-900 flex items-center gap-1.5">
                <span>แจ้งเตือนด่วน: มีอะไหล่ {criticalStockCount} รายการเหลือเพียง 1 ชิ้นสุดท้าย หรือหมดสต็อก!</span>
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                แนะนำให้เปิด PR ขอซื้อทันที เพื่อป้องกันเครื่องจักรติด Downtime หากเกิดการชำรุดกะทันหัน
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setCriticalStockOnly(true)
              setLowStockOnly(false)
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl h-9 px-4 shrink-0 shadow-sm flex items-center gap-1.5"
          >
            <span>ดูเฉพาะรายการด่วน ({criticalStockCount})</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
            <span>คลังอะไหล่และชิ้นส่วนสิ้นเปลือง (Spare Parts Inventory)</span>
            {criticalStockOnly && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                กรอง: เหลือชิ้นสุดท้าย / หมด
              </span>
            )}
          </h2>
          <div className="text-xs text-stone-500">
            ระบบบริหารอะไหล่ เชื่อมโยงประวัติเครื่องจักร แจ้งเตือน Safety Stock และเปิด PR ขอซื้อเชื่อม DCC ทันที
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

          {/* Critical filter button */}
          <button
            type="button"
            onClick={() => {
              setCriticalStockOnly(!criticalStockOnly)
              if (!criticalStockOnly) setLowStockOnly(false)
            }}
            className={`h-10 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              criticalStockOnly
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>เหลือชิ้นสุดท้าย ({criticalStockCount})</span>
          </button>

          {/* Low stock filter button */}
          <button
            type="button"
            onClick={() => {
              setLowStockOnly(!lowStockOnly)
              if (!lowStockOnly) setCriticalStockOnly(false)
            }}
            className={`h-10 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              lowStockOnly
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ต่ำกว่า Safety Stock</span>
          </button>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Mobile Cards (< md) */}
        <div className="block md:hidden divide-y divide-stone-150">
          {displayedParts.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              ไม่พบรายการอะไหล่ที่ค้นหา
            </div>
          ) : (
            displayedParts.map(p => {
              const isLastPiece = p.stock_qty === 1
              const isOutOfStock = p.stock_qty === 0
              const isBelowSafety = p.stock_qty <= p.min_stock

              return (
                <div key={p.id} className="p-4 space-y-3 bg-white hover:bg-stone-50/70 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-stone-500">{p.part_code}</span>
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                            🚨 สต๊อกหมดแล้ว!
                          </span>
                        ) : isLastPiece ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            ⚠️ เหลือชิ้นสุดท้าย!
                          </span>
                        ) : isBelowSafety ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            ⚠️ ต่ำกว่า Safety Stock
                          </span>
                        ) : null}
                      </div>
                      <h4 className="font-bold text-sm text-stone-900 mt-1">{p.part_name}</h4>
                      <p className="text-[11px] text-stone-500">{p.specification || p.model}</p>
                    </div>
                    
                    <span className={`px-2.5 py-1 rounded-full font-black text-xs shrink-0 ${
                      isOutOfStock ? 'bg-red-100 text-red-800 border border-red-300' :
                      isLastPiece ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      isBelowSafety ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-stone-100 text-stone-800'
                    }`}>
                      {p.stock_qty} {p.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                    <div>
                      <span className="text-stone-400 block">หมวด & แบรนด์:</span>
                      <span className="font-medium text-stone-700">{p.category} • {p.brand || '-'}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">ตำแหน่งจัดเก็บ:</span>
                      <span className="font-medium text-stone-700">{p.storage_location || 'คลังกลาง'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-b border-stone-100 pb-2">
                    <span className="text-stone-600 text-[11px]">
                      <b>Safety Stock:</b> {p.min_stock} {p.unit} (Max: {p.max_stock})
                    </span>
                    <span className="font-bold text-[#8B7355]">ราคาเฉลี่ย: ฿{Number(p.average_cost).toLocaleString()}</span>
                  </div>

                  {/* Actions for Mobile */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openSafetyStock(p)}
                      className="flex-1 text-[11px] font-bold h-8 rounded-xl border-stone-200 flex items-center justify-center gap-1"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>ตั้ง Safety Stock</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openPRModal(p)}
                      className={`flex-1 text-[11px] font-bold h-8 rounded-xl flex items-center justify-center gap-1 shadow-sm ${
                        isBelowSafety || isLastPiece || isOutOfStock
                          ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white'
                          : 'bg-[#2A2521] hover:bg-stone-800 text-white'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{isLastPiece || isOutOfStock ? '🚨 เปิด PR ด่วน' : '📝 เปิด PR ขอซื้อ'}</span>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
              <tr>
                <th className="py-3 px-4 font-bold">รหัสอะไหล่</th>
                <th className="py-3 px-4 font-bold">ชื่ออะไหล่ & รายละเอียด</th>
                <th className="py-3 px-4 font-bold">หมวดหมู่ & แบรนด์</th>
                <th className="py-3 px-4 font-bold">ตำแหน่งจัดเก็บ</th>
                <th className="py-3 px-4 font-bold text-center">สถานะคงเหลือ & Safety Stock</th>
                <th className="py-3 px-4 font-bold text-right">ราคาเฉลี่ย</th>
                <th className="py-3 px-4 font-bold text-center">จัดการสต็อก / เปิด PR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {displayedParts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    ไม่พบรายการอะไหล่ที่ค้นหา
                  </td>
                </tr>
              ) : (
                displayedParts.map(p => {
                  const isLastPiece = p.stock_qty === 1
                  const isOutOfStock = p.stock_qty === 0
                  const isBelowSafety = p.stock_qty <= p.min_stock

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {p.part_code}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-stone-900">{p.part_name}</div>
                        <div className="text-[11px] text-stone-500 truncate">{p.specification || p.model}</div>
                        {p.compatible_machines && p.compatible_machines.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.compatible_machines.map(code => (
                              <span key={code} className="px-1.5 py-0.2 bg-amber-50 text-amber-900 text-[9px] font-mono font-bold rounded border border-amber-200">
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-800">
                          {p.category}
                        </span>
                        <div className="text-[11px] text-stone-400 mt-0.5">{p.brand}</div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{p.storage_location || 'คลังกลาง'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {isOutOfStock ? (
                            <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-red-600 text-white animate-pulse">
                              🚨 หมดสต็อก (0 {p.unit})
                            </span>
                          ) : isLastPiece ? (
                            <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-red-100 text-red-800 border border-red-300 animate-pulse">
                              ⚠️ เหลือชิ้นสุดท้าย! (1 {p.unit})
                            </span>
                          ) : isBelowSafety ? (
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300">
                              ⚠️ {p.stock_qty} {p.unit} (ต่ำกว่า Min)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-stone-100 text-stone-800">
                              {p.stock_qty} {p.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-center gap-2">
                          <span>Safety Stock: <b className="text-stone-800">{p.min_stock}</b></span>
                          <span>|</span>
                          <span>Max: <b>{p.max_stock}</b></span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#8B7355]">
                        ฿{Number(p.average_cost).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openSafetyStock(p)}
                            className="h-8 px-2.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl"
                            title="แก้ไขจำนวนขั้นต่ำ Safety Stock และจุดสั่งซื้อใหม่"
                          >
                            <Settings2 className="w-3.5 h-3.5 text-stone-500 mr-1" />
                            <span>ตั้ง Safety Stock</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openPRModal(p)}
                            className={`h-8 px-3 text-[11px] font-bold rounded-xl shadow-sm flex items-center gap-1 ${
                              isLastPiece || isOutOfStock
                                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                                : isBelowSafety
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-[#2A2521] hover:bg-stone-800 text-white'
                            }`}
                            title="เปิดใบขอซื้อ PR (Purchase Requisition)"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{isLastPiece || isOutOfStock ? '🚨 เปิด PR ด่วน' : '📝 เปิด PR'}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Safety Stock Modal */}
      <EditSafetyStockModal
        part={selectedSafetyPart}
        isOpen={isSafetyModalOpen}
        onClose={() => {
          setIsSafetyModalOpen(false)
          setSelectedSafetyPart(null)
        }}
        onSuccess={fetchParts}
      />

      {/* Create PR Modal (Ready for DCC integration) */}
      <CreatePRModal
        part={selectedPRPart}
        isOpen={isPRModalOpen}
        onClose={() => {
          setIsPRModalOpen(false)
          setSelectedPRPart(null)
        }}
        onSuccess={fetchParts}
      />
    </div>
  )
}

