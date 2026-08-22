'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Edit, Plus } from 'lucide-react'

export default function MasterDataPage() {
  const [products, setProducts] = useState<any[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const supabase = createClient()

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('sku')
    if (data) setProducts(data)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleEditClick = (product: any) => {
    setEditingProduct({ ...product })
    setIsEditModalOpen(true)
  }

  const handleSaveProduct = async () => {
    if (!editingProduct.sku || !editingProduct.product_name) {
      toast.error('กรุณากรอกข้อมูล SKU และชื่อสินค้าให้ครบถ้วน')
      return
    }

    const payload = {
      sku: editingProduct.sku,
      product_name: editingProduct.product_name,
      kg_per_tank: editingProduct.kg_per_tank ? parseFloat(editingProduct.kg_per_tank) : null,
      g_per_piece: editingProduct.g_per_piece ? parseFloat(editingProduct.g_per_piece) : null,
      capacity_min: editingProduct.capacity_min ? parseFloat(editingProduct.capacity_min) : null,
      capacity_max: editingProduct.capacity_max ? parseFloat(editingProduct.capacity_max) : null,
      pcs_per_carton: editingProduct.pcs_per_carton ? parseFloat(editingProduct.pcs_per_carton) : null
    }

    let error
    if (editingProduct.id) {
      const res = await supabase.from('products').update(payload).eq('id', editingProduct.id)
      error = res.error
    } else {
      const res = await supabase.from('products').insert(payload)
      error = res.error
    }

    if (error) {
      toast.error('บันทึกข้อมูลไม่สำเร็จ: ' + error.message)
    } else {
      toast.success('บันทึกข้อมูลสินค้าเรียบร้อยแล้ว')
      setIsEditModalOpen(false)
      fetchProducts()
    }
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 w-full max-w-full space-y-6 min-w-0">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">ข้อมูลหลัก (Master Data)</h2>
          <p className="text-muted-foreground mt-2">จัดการข้อมูลสินค้า ห้องผลิต และผู้ใช้งานระบบ</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="products">สินค้า (Products/SKU)</TabsTrigger>
          <TabsTrigger value="rooms">ห้องผลิต (Rooms)</TabsTrigger>
          <TabsTrigger value="processes">ขั้นตอน (Processes)</TabsTrigger>
          <TabsTrigger value="users">ผู้ใช้งาน (Users)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>รายการสินค้า (Products)</CardTitle>
              <Button onClick={() => { setEditingProduct({}); setIsEditModalOpen(true); }} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มสินค้าใหม่
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">ชื่อสินค้า</th>
                      <th className="px-4 py-3 text-right">นน./ถัง (KG)</th>
                      <th className="px-4 py-3 text-right">บรรจุ/ชิ้น (g)</th>
                      <th className="px-4 py-3 text-right">STD Capacity (ชิ้น/ชม.)</th>
                      <th className="px-4 py-3 text-right">จำนวนชิ้น/ลัง</th>
                      <th className="px-4 py-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{p.sku}</td>
                        <td className="px-4 py-3">{p.product_name}</td>
                        <td className="px-4 py-3 text-right">{p.kg_per_tank || '-'}</td>
                        <td className="px-4 py-3 text-right">{p.g_per_piece || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          {p.capacity_min ? `${p.capacity_min}-${p.capacity_max || p.capacity_min}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">{p.pcs_per_carton || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(p)}>
                            <Edit className="w-3 h-3 mr-1" /> แก้ไข
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          ไม่พบข้อมูลสินค้า
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rooms">
          <Card>
            <CardHeader><CardTitle>ห้องผลิตและแผนก (Rooms & Departments)</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground py-8 text-center border-2 border-dashed rounded-lg">อยู่ระหว่างการพัฒนาสำหรับ MVP</p></CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="processes">
          <Card>
            <CardHeader><CardTitle>ขั้นตอนการผลิต (Processes)</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground py-8 text-center border-2 border-dashed rounded-lg">อยู่ระหว่างการพัฒนาสำหรับ MVP</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle>ผู้ใช้งานและสิทธิ์ (Users & Roles)</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-6">ระบบจัดการบัญชีพนักงานและสิทธิ์การเข้าถึงได้เปิดให้ทดลองใช้งานแล้ว (Prototype)</p>
              <Link href="/master-data/users">
                <Button className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white px-8">
                  เข้าสู่หน้าจัดการผู้ใช้งาน
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">รหัสสินค้า (SKU)</Label>
              <Input className="col-span-3" value={editingProduct?.sku || ''} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">ชื่อสินค้า</Label>
              <Input className="col-span-3" value={editingProduct?.product_name || ''} onChange={(e) => setEditingProduct({...editingProduct, product_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">น้ำหนัก/ถัง (KG)</Label>
              <Input type="number" className="col-span-3" value={editingProduct?.kg_per_tank || ''} onChange={(e) => setEditingProduct({...editingProduct, kg_per_tank: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">บรรจุ/ชิ้น (g)</Label>
              <Input type="number" className="col-span-3" value={editingProduct?.g_per_piece || ''} onChange={(e) => setEditingProduct({...editingProduct, g_per_piece: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">จำนวนชิ้น/ลัง</Label>
              <Input type="number" className="col-span-3" value={editingProduct?.pcs_per_carton || ''} onChange={(e) => setEditingProduct({...editingProduct, pcs_per_carton: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Capacity ขั้นต่ำ<br/>(ชิ้น/ชม.)</Label>
              <Input type="number" className="col-span-3" value={editingProduct?.capacity_min || ''} onChange={(e) => setEditingProduct({...editingProduct, capacity_min: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Capacity สูงสุด<br/>(ชิ้น/ชม.)</Label>
              <Input type="number" className="col-span-3" value={editingProduct?.capacity_max || ''} onChange={(e) => setEditingProduct({...editingProduct, capacity_max: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveProduct} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover">บันทึกข้อมูล</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
