'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Save, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { getDefects, updateDefectCost } from '@/app/actions/defects'

export default function DefectCostingPage() {
  const [defects, setDefects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  
  // Local state for input values: defectId -> cost
  const [costInputs, setCostInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchDefectsData()
  }, [])

  const fetchDefectsData = async () => {
    setLoading(true)
    const res = await getDefects()
    if (res.success && res.data) {
      setDefects(res.data)
      // Initialize inputs
      const initialInputs: Record<string, string> = {}
      res.data.forEach((d: any) => {
        if (d.cost_per_unit !== null && d.cost_per_unit !== undefined) {
          initialInputs[d.id] = String(d.cost_per_unit)
        }
      })
      setCostInputs(initialInputs)
    } else {
      toast.error('โหลดข้อมูลของเสียล้มเหลว')
    }
    setLoading(false)
  }

  const handleCostChange = (id: string, value: string) => {
    setCostInputs(prev => ({ ...prev, [id]: value }))
  }

  const handleSave = async (defect: any) => {
    const val = parseFloat(costInputs[defect.id])
    if (isNaN(val) || val < 0) {
      toast.error('กรุณากรอกราคาที่ถูกต้อง')
      return
    }

    setSaving(defect.id)
    const res = await updateDefectCost(defect.id, val)
    if (res.success) {
      toast.success('บันทึกต้นทุนของเสียสำเร็จ')
      // Update local state without refetching all
      setDefects(prev => prev.map(d => d.id === defect.id ? { ...d, cost_per_unit: val, total_cost: val * d.quantity } : d))
    } else {
      toast.error('บันทึกล้มเหลว: ' + res.error)
    }
    setSaving(null)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-red-200 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            บันทึกต้นทุนของเสีย (Defect Costing)
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            รายการของเสียจากแผนกผลิต เพื่อให้บัญชีระบุต้นทุนต่อหน่วยและคำนวณมูลค่าความเสียหายรวม
          </p>
        </div>
      </div>

      <Card className="shadow-md border-0 ring-1 ring-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8F6F0]">
                <TableRow>
                  <TableHead>วันที่รายงาน</TableHead>
                  <TableHead>LOT No. (SKU)</TableHead>
                  <TableHead>แผนกที่เกิดของเสีย</TableHead>
                  <TableHead>สาเหตุ / อาการ</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="w-[180px]">ต้นทุน / หน่วย (บาท)</TableHead>
                  <TableHead className="text-right">มูลค่ารวม (บาท)</TableHead>
                  <TableHead className="w-[100px] text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                      กำลังโหลดข้อมูล...
                    </TableCell>
                  </TableRow>
                ) : defects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-slate-500">
                      ไม่มีรายการของเสียที่ต้องจัดการ
                    </TableCell>
                  </TableRow>
                ) : (
                  defects.map(defect => {
                    const isEvaluated = defect.cost_per_unit !== null && defect.cost_per_unit !== undefined
                    
                    return (
                      <TableRow key={defect.id} className="hover:bg-slate-50">
                        <TableCell>
                          {new Date(defect.created_at).toLocaleDateString('th-TH')}
                          <div className="text-xs text-slate-400">
                            {new Date(defect.created_at).toLocaleTimeString('th-TH')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{defect.lot?.lot_no}</div>
                          <div className="text-xs text-slate-500">{defect.lot?.products?.sku}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {defect.process?.process_name || 'ไม่ระบุแผนก'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          {defect.defect_reason}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {defect.quantity} <span className="text-slate-500 text-xs">{defect.unit}</span>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="ระบุราคา"
                            className="h-8 text-right bg-white border-slate-300 focus-visible:ring-red-500"
                            value={costInputs[defect.id] || ''}
                            onChange={(e) => handleCostChange(defect.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700">
                          {defect.total_cost != null ? (
                            <span>{Number(defect.total_cost).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {saving === defect.id ? (
                            <Button size="sm" variant="ghost" disabled>
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant={isEvaluated ? "outline" : "default"} 
                              className={isEvaluated ? "text-slate-500 border-slate-300" : "bg-red-600 hover:bg-red-700"}
                              onClick={() => handleSave(defect)}
                            >
                              {isEvaluated ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
                              <span className="sr-only">บันทึก</span>
                            </Button>
                          )}
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
