'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calculator, TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { getLotCostings, calculateLotCost } from '@/app/actions/costing'

export default function CostingDashboardPage() {
  const [costings, setCostings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const res = await getLotCostings()
    if (res.success && res.data) {
      setCostings(res.data)
    } else {
      toast.error('โหลดข้อมูล Costing ล้มเหลว')
    }
    setLoading(false)
  }

  const handleCalculate = async (lotId: string) => {
    setCalculating(lotId)
    const res = await calculateLotCost(lotId)
    if (res.success) {
      toast.success('คำนวณต้นทุน Lot ใหม่สำเร็จ')
      fetchData()
    } else {
      toast.error('การคำนวณล้มเหลว: ' + res.error)
    }
    setCalculating(null)
  }

  // KPIs
  const totalLots = costings.length
  const totalRevenue = costings.reduce((sum, c) => sum + (c.revenue || 0), 0)
  const totalProfit = costings.reduce((sum, c) => sum + (c.net_profit || 0), 0)
  const totalDefect = costings.reduce((sum, c) => sum + (c.defect_cost || 0), 0)
  
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-slate-200 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-2">
            <Calculator className="w-8 h-8 text-[#D4AF37]" />
            Lot Profitability Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            วิเคราะห์ต้นทุนและกำไรขาดทุนสุทธิต่อ Lot แบบเรียลไทม์ (รวมของเสียและโสหุ้ย)
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="text-[#D4AF37] border-[#D4AF37]">
          รีเฟรชข้อมูล
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-medium">จำนวน Lot ที่ประเมินแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLots} Lot</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-medium">อัตรากำไรเฉลี่ย (Profit Margin)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center">
              {profitMargin.toFixed(1)}%
              <TrendingUp className="w-4 h-4 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-[#D4AF37]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-medium">กำไรสุทธิรวม (Total Profit)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#D4AF37]">
              ฿ {totalProfit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-medium">ความเสียหายรวม (Defects)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500 flex items-center">
              ฿ {totalDefect.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-0 ring-1 ring-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8F6F0]">
                <TableRow>
                  <TableHead>Lot No.</TableHead>
                  <TableHead>สินค้า (SKU)</TableHead>
                  <TableHead className="text-right">ยอดผลิต</TableHead>
                  <TableHead className="text-right text-blue-700">รายรับรวม (Rev.)</TableHead>
                  <TableHead className="text-right">วัตถุดิบ (RM/PM)</TableHead>
                  <TableHead className="text-right">ค่าแรง+โสหุ้ย</TableHead>
                  <TableHead className="text-right text-red-600">ของเสีย</TableHead>
                  <TableHead className="text-right font-bold">ต้นทุนรวม</TableHead>
                  <TableHead className="text-right text-green-700 font-bold">กำไรสุทธิ</TableHead>
                  <TableHead className="text-center w-[120px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-32 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]" />
                      กำลังโหลดข้อมูล...
                    </TableCell>
                  </TableRow>
                ) : costings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-32 text-slate-500">
                      ยังไม่มีข้อมูลต้นทุน (กรุณากดคำนวณใน Lot ที่ผลิตเสร็จ)
                    </TableCell>
                  </TableRow>
                ) : (
                  costings.map(c => {
                    const laborAndOH = Number(c.actual_labor_cost) + Number(c.actual_overhead_cost)
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50">
                        <TableCell className="font-semibold">{c.lot?.lot_no}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{c.lot?.products?.sku}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">{c.lot?.products?.name}</div>
                        </TableCell>
                        <TableCell className="text-right">{c.total_produced_qty}</TableCell>
                        <TableCell className="text-right text-blue-700 font-medium">
                          {Number(c.revenue).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {Number(c.actual_material_cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {laborAndOH.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {Number(c.defect_cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800">
                          {Number(c.total_cost).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${Number(c.net_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(c.net_profit) >= 0 ? '+' : ''}{Number(c.net_profit).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-[#D4AF37] border-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                            onClick={() => handleCalculate(c.lot_id)}
                            disabled={calculating === c.lot_id}
                          >
                            {calculating === c.lot_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4 mr-1" />}
                            คำนวณ
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
