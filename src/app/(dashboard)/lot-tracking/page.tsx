'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/utils/supabase/client'
import { Package, Activity } from 'lucide-react'

const supabase = createClient()

export default function LotTrackingPage() {
  const [lots, setLots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLots()
  }, [])

  const fetchLots = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('production_lots')
      .select('*, products(sku, product_name)')
      .order('created_at', { ascending: false })
    
    if (data) {
      setLots(data)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">ภาพรวมการผลิต (Lot Tracking)</h1>
          <p className="text-sm text-[#8B7355] mt-2 font-medium">ติดตามสถานะการผลิตของทุกออเดอร์ในหน้าเดียว</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="w-5 h-5" /> รายการผลิตทั้งหมด (PO on Hand)
            </CardTitle>
            <div className="w-64">
              <Input 
                placeholder="ค้นหา SKU หรือ LOT..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8F6F0]">
                  <TableHead>PO No.</TableHead>
                  <TableHead>สินค้า (SKU)</TableHead>
                  <TableHead>LOT No.</TableHead>
                  <TableHead className="text-right">ยอดออเดอร์</TableHead>
                  <TableHead className="text-right">จำนวนถัง</TableHead>
                  <TableHead className="text-right">Bulk size (kg/ถัง)</TableHead>
                  <TableHead className="text-right">บรรจุ (g)</TableHead>
                  <TableHead>กำหนดส่ง FG</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                      กำลังโหลดข้อมูล...
                    </TableCell>
                  </TableRow>
                ) : lots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                      ไม่มีรายการผลิต
                    </TableCell>
                  </TableRow>
                ) : (
                  lots.filter(lot => {
                    const term = searchQuery.toLowerCase()
                    const sku = (lot.products?.sku || '').toLowerCase()
                    const lotNo = (lot.lot_no || '').toLowerCase()
                    return sku.includes(term) || lotNo.includes(term)
                  }).map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell>{lot.po_no || '-'}</TableCell>
                      <TableCell>
                        <div className="font-medium text-[#D4AF37]">{lot.products?.sku || '-'}</div>
                        <div className="text-xs text-slate-500">{lot.products?.product_name}</div>
                      </TableCell>
                      <TableCell className="font-semibold">{lot.lot_no}</TableCell>
                      <TableCell className="text-right">
                        {lot.order_quantity ? Number(lot.order_quantity).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">{lot.total_tanks || '-'}</TableCell>
                      <TableCell className="text-right">{lot.kg_per_tank || '-'}</TableCell>
                      <TableCell className="text-right">{lot.g_per_piece || '-'}</TableCell>
                      <TableCell>
                        {lot.order_type === 'MTS' ? (
                          <span className="text-slate-500 font-medium">MTS</span>
                        ) : (
                          lot.fg_due_date ? new Date(lot.fg_due_date).toLocaleDateString('th-TH') : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-[#D4AF37]/ text-[#4A4238] rounded-full text-xs font-medium">
                          {lot.current_status || 'PLANNED'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link 
                          href={`/lot-tracking/${lot.id}`}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#D4AF37] text-white hover:bg-[#D4AF37]-hover h-9 px-4 py-2"
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          ดูแผงคุมรวม
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
