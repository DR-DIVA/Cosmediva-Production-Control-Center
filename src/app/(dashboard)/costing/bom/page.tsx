'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Save, RefreshCw, Search } from 'lucide-react'
import { getProductBOMs, saveProductBOM } from '@/app/actions/costing'

export default function BOMConfigurationPage() {
  const [products, setProducts] = useState<any[]>([])
  const [boms, setBoms] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch all products
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .order('sku', { ascending: true })

      if (productError) throw productError
      setProducts(productData || [])

      // 2. Fetch BOMs
      const bomRes = await getProductBOMs()
      if (bomRes.success && bomRes.data) {
        const bomMap: Record<string, any> = {}
        bomRes.data.forEach((b: any) => {
          bomMap[b.product_id] = {
            formula_cost_per_kg: Number(b.formula_cost_per_kg),
            amount_g_per_piece: Number(b.amount_g_per_piece),
            packaging_cost_per_piece: Number(b.packaging_cost_per_piece),
          }
        })
        setBoms(bomMap)
      }

    } catch (error: any) {
      toast.error('Failed to load BOMs: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleChange = (productId: string, field: string, value: string) => {
    setBoms(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { formula_cost_per_kg: 0, amount_g_per_piece: 0, packaging_cost_per_piece: 0 }),
        [field]: Number(value)
      }
    }))
  }

  const handleSave = async (productId: string) => {
    setSaving(true)
    try {
      const bomData = boms[productId] || { formula_cost_per_kg: 0, amount_g_per_piece: 0, packaging_cost_per_piece: 0 }
      const res = await saveProductBOM({
        product_id: productId,
        ...bomData
      })
      
      if (res.success) {
        toast.success('บันทึกสูตรการผลิตสำเร็จ')
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + res.error)
      }
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Product BOM & Costing</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ผูกสูตรคำนวณต้นทุนต่อชิ้น (Bill of Materials)</CardTitle>
          <CardDescription>
            กำหนดต้นทุนเนื้อครีมต่อกิโลกรัม ปริมาณที่ใช้ต่อชิ้น และต้นทุนบรรจุภัณฑ์ เพื่อให้ระบบคำนวณต้นทุนรวมอัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้า / SKU..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-6 gap-4 p-4 font-medium border-b bg-muted/50">
              <div className="col-span-2">สินค้า (Product)</div>
              <div>ต้นทุนเนื้อ/KG (บาท)</div>
              <div>ปริมาณที่ใช้/ชิ้น (g)</div>
              <div>ค่าแพ็กเกจจิ้ง/ชิ้น (บาท)</div>
              <div className="text-right">จัดการ</div>
            </div>
            
            {loading ? (
               <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredProducts.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">ไม่พบข้อมูลสินค้า</div>
            ) : (
              <div className="divide-y">
                {filteredProducts.map((product) => {
                  const bom = boms[product.id] || { formula_cost_per_kg: 0, amount_g_per_piece: 0, packaging_cost_per_piece: 0 }
                  const costPerPiece = ((bom.formula_cost_per_kg * bom.amount_g_per_piece) / 1000) + bom.packaging_cost_per_piece
                  
                  return (
                    <div key={product.id} className="grid grid-cols-6 gap-4 p-4 items-center">
                      <div className="col-span-2">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.sku}</div>
                      </div>
                      <div>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={bom.formula_cost_per_kg}
                          onChange={(e) => handleChange(product.id, 'formula_cost_per_kg', e.target.value)}
                        />
                      </div>
                      <div>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={bom.amount_g_per_piece}
                          onChange={(e) => handleChange(product.id, 'amount_g_per_piece', e.target.value)}
                        />
                      </div>
                      <div>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={bom.packaging_cost_per_piece}
                          onChange={(e) => handleChange(product.id, 'packaging_cost_per_piece', e.target.value)}
                        />
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-green-600">
                          รวม: {costPerPiece.toFixed(2)} บาท/ชิ้น
                        </span>
                        <Button size="sm" onClick={() => handleSave(product.id)} disabled={saving}>
                          <Save className="mr-2 h-4 w-4" /> บันทึก
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
