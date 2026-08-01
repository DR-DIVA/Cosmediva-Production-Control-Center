"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, Loader2, Search, Download, Paperclip, LayoutDashboard, ShoppingCart, Box, Activity, Calendar, Trash2, Truck, Package } from 'lucide-react';

type RMItem = {
  id: string;
  production_lot_id: string;
  po_no: string;
  supplier: string;
  po_date: string;
  eta_date: string;
  rm_code: string;
  rm_name: string;
  warehouse: string;
  quantity: number;
  unit: string;
  lot_product: string;
  pr_no: string;
  status: string;
  receive_date: string;
  qc_status: string;
  file_link: string;
  production_lots?: { lot_no: string; sku_id: string; products?: { sku: string } };
};

export default function RMControlCenterPage() {
  const supabase = createClient();
  const [items, setItems] = useState<RMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [lotOptions, setLotOptions] = useState<any[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_lot_rms')
      .select('*, production_lots(lot_no, sku_id, products(sku))')
      .order('eta_date', { ascending: true });

    if (error) {
      console.error(error);
      toast.error('โหลดข้อมูลไม่สำเร็จ (กรุณาเช็คตาราง production_lot_rms)');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const fetchLots = async () => {
    const { data } = await supabase.from('production_lots').select('id, lot_no, sku_id, products(sku, product_name)').order('created_at', { ascending: false });
    if (data) setLotOptions(data);
  };

  useEffect(() => {
    fetchItems();
    fetchLots();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('กรุณาเลือกไฟล์ PDF ก่อนอัปโหลด');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-pr', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(`สกัดข้อมูลสำเร็จ! พบวัตถุดิบ ${result.data.items?.length || 0} รายการ`);
        
        if (result.data.items && result.data.items.length > 0) {
          setExtractedData(result.data);
          let matchedLotId = '';
          if (result.data.jobNo) {
             const cleanedJobNo = result.data.jobNo.replace('L.', '');
             const matched = lotOptions.find(l => l.lot_no.includes(cleanedJobNo) || cleanedJobNo.includes(l.lot_no));
             if (matched) matchedLotId = matched.id;
          }
          setSelectedLotId(matchedLotId);
          setIsModalOpen(true);
        } else {
          toast.warning('ไม่พบรายการวัตถุดิบใน PDF นี้');
        }

      } else {
        toast.error('เกิดข้อผิดพลาด: ' + result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('ไม่สามารถอัปโหลดไฟล์ได้');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveToDB = async () => {
    if (!selectedLotId) {
      toast.error('กรุณาเลือกรหัสงาน (LOT) ก่อนบันทึก');
      return;
    }
    if (!extractedData || !extractedData.items) return;

    setUploading(true);
    let fileUrl = '';

    // Upload to Supabase Storage
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('po-documents').upload(fileName, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('po-documents').getPublicUrl(fileName);
        fileUrl = data.publicUrl;
      }
    }

    const itemsToInsert = extractedData.items.map((item: any) => ({
      production_lot_id: selectedLotId,
      po_no: extractedData.poNo,
      supplier: extractedData.supplier,
      po_date: extractedData.poDate || null,
      eta_date: extractedData.etaDate || null,
      rm_code: item.rm_code,
      rm_name: item.rm_name,
      warehouse: item.warehouse,
      quantity: item.quantity ? parseFloat(item.quantity.replace(/,/g, '')) : 0,
      unit: item.unit,
      lot_product: item.jobNo,
      pr_no: extractedData.prNo,
      top_remark: extractedData.topRemark,
      bottom_remark: item.bottom_remark,
      status: 'PENDING_DELIVERY',
      file_link: fileUrl
    }));

    const { error } = await supabase.from('production_lot_rms').insert(itemsToInsert);
    setUploading(false);

    if (error) {
      console.error(error);
      toast.error('บันทึกข้อมูลไม่สำเร็จ');
    } else {
      toast.success('บันทึกข้อมูลวัตถุดิบเรียบร้อยแล้ว');
      setIsModalOpen(false);
      setExtractedData(null);
      setFile(null);
      fetchItems();
    }
  };

  const updateField = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from('production_lot_rms')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      toast.error('อัปเดตไม่สำเร็จ');
    } else {
      toast.success('อัปเดตสำเร็จ');
      fetchItems();
    }
  };

  const handleStatusChange = async (item: RMItem, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'RECEIVED' && !item.receive_date) {
      updates.receive_date = new Date().toISOString();
    } else if (newStatus === 'PENDING_DELIVERY') {
      updates.receive_date = null;
    }
    
    const { error } = await supabase
      .from('production_lot_rms')
      .update(updates)
      .eq('id', item.id);

    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    } else {
      toast.success('อัปเดตสถานะ และประทับเวลาเรียบร้อยแล้ว');
      fetchItems();
    }
  };

  const handleQcStatusChange = async (item: RMItem, newQcStatus: string) => {
    const updates: any = { qc_status: newQcStatus };
    
    if (newQcStatus === 'PASSED') {
      updates.status = 'READY';
    } else if (newQcStatus === 'REJECTED') {
      updates.status = 'REJECTED';
    } else {
      updates.status = 'RECEIVED';
    }

    const { error } = await supabase
      .from('production_lot_rms')
      .update(updates)
      .eq('id', item.id);

    if (error) {
      toast.error('อัปเดตสถานะ QC ไม่สำเร็จ');
    } else {
      toast.success('อัปเดตสถานะ QC เรียบร้อยแล้ว');
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return;
    const { error } = await supabase.from('production_lot_rms').delete().eq('id', id);
    if (error) {
      toast.error('ลบข้อมูลไม่สำเร็จ');
    } else {
      toast.success('ลบข้อมูลเรียบร้อยแล้ว');
      fetchItems();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_DELIVERY': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Ordered</Badge>;
      case 'RECEIVED': return <Badge variant="outline" className="bg-[#D4AF37]/ text-[#D4AF37] border-[#D4AF37]/30">Received</Badge>;
      case 'WAITING_QC': return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">QC Pending</Badge>;
      case 'QC_PASS': return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">QC Passed</Badge>;
      case 'READY': return <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">Released</Badge>;
      case 'DELAYED': return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Delayed</Badge>;
      case 'REJECTED': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getQcColor = (status: string) => {
    switch(status) {
      case 'PASSED': return 'bg-green-50 text-green-700 ring-1 ring-green-200';
      case 'QUARANTINED': return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
      case 'HOLD': return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      default: return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
    }
  };

  const toLocalDatetime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const filteredItems = items.filter(item => 
    (item.po_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.rm_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.rm_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.lot_product || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['PO No', 'Supplier', 'PO Date', 'ETA', 'Code', 'Name', 'Warehouse', 'Qty', 'Unit', 'LOT/Job', 'PR', 'Status'];
    const rows = filteredItems.map(i => [
      i.po_no, i.supplier, i.po_date, i.eta_date, i.rm_code, i.rm_name, i.warehouse, i.quantity, i.unit, i.lot_product, i.pr_no, i.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "RM_Control_Center.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Package className="w-8 h-8 text-yellow-400" />
            Raw Material Control Center
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>ศูนย์กลางจัดการใบสั่งซื้อ การรับเข้า และสถานะวัตถุดิบสำหรับการผลิต</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Synchronize RM Data and Production.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="ค้นหา PO, Code, Name..." 
              className="pl-9 w-[250px] bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={exportToCSV} className="bg-white">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="purchasing" className="w-full">
        <TabsList className="bg-[#D4AF37] p-1.5 rounded-xl border-none shadow-md w-full justify-start h-auto gap-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><LayoutDashboard className="w-4 h-4 mr-2"/> Dashboard</TabsTrigger>
          <TabsTrigger value="purchasing" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><ShoppingCart className="w-4 h-4 mr-2"/> Purchasing View</TabsTrigger>
          <TabsTrigger value="warehouse" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><Box className="w-4 h-4 mr-2"/> Warehouse View</TabsTrigger>
          <TabsTrigger value="qc" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><Activity className="w-4 h-4 mr-2"/> QC View</TabsTrigger>
          <TabsTrigger value="planning" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><Calendar className="w-4 h-4 mr-2"/> Planning View</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="dashboard" className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#D4AF37]/ border-[#D4AF37]/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#4A4238]">PO ทั้งหมด</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-[#D4AF37]">{items.length}</div></CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-800">รอของเข้า (Pending)</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-orange-600">{items.filter(i => i.status === 'PENDING_DELIVERY').length}</div></CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-800">รอตรวจ QC</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-yellow-600">{items.filter(i => i.status === 'WAITING_QC' || i.status === 'RECEIVED').length}</div></CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-800">พร้อมใช้ผลิต (Released)</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-green-600">{items.filter(i => i.status === 'READY' || i.status === 'QC_PASS').length}</div></CardContent>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="purchasing" className="space-y-6">
            <Card className="bg-[#D4AF37]/ border-[#D4AF37]/30/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#4A4238] flex items-center gap-2 text-base">
                  <Upload className="w-4 h-4" /> อัปโหลดใบสั่งซื้อ (PO PDF)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} className="bg-white" />
                  </div>
                  <Button onClick={handleUpload} disabled={!file || uploading} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover">
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> สกัดข้อมูล...</> : 'สกัดข้อมูลด้วย AI'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="whitespace-nowrap text-sm">
                    <TableHeader className="bg-[#F8F6F0]/">
                      <TableRow>
                        <TableHead>PO No.</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>PO Date</TableHead>
                        <TableHead>ETA</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-[#F8F6F0]/">
                          <TableCell className="font-medium text-[#D4AF37]">{item.po_no || '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={item.supplier}>{item.supplier || '-'}</TableCell>
                          <TableCell>{item.po_date ? new Date(item.po_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                          <TableCell>{item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                          <TableCell>{item.rm_code}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.rm_name}>{item.rm_name}</TableCell>
                          <TableCell className="text-right font-semibold">{item.quantity} {item.unit}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            {item.file_link ? (
                              <a href={item.file_link} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:text-[#D4AF37] flex items-center">
                                <Paperclip className="w-4 h-4" />
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                               <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.length === 0 && (
                        <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-500">ไม่พบข้อมูล</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warehouse" className="space-y-6">
             <Card className="shadow-sm">
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4"><CardTitle className="text-base text-slate-700">Receiving Plan (รอรับของเข้า)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="whitespace-nowrap text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ETA</TableHead>
                        <TableHead>PO No.</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Receive Date (Actual)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-orange-600">
                            {item.eta_date ? (
                              <div className="flex items-center gap-1.5">
                                 <Truck className="w-4 h-4 text-orange-500" />
                                 {new Date(item.eta_date).toLocaleDateString('th-TH')}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{item.po_no}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{item.supplier}</TableCell>
                          <TableCell>{item.rm_code} - {item.rm_name}</TableCell>
                          <TableCell className="font-semibold">{item.quantity} {item.unit}</TableCell>
                          <TableCell>{item.warehouse}</TableCell>
                          <TableCell>
                            {item.receive_date ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700 text-sm">{new Date(item.receive_date).toLocaleDateString('th-TH')}</span>
                                <span className="text-xs text-slate-500">{new Date(item.receive_date).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                             <Select value={item.status || ''} onValueChange={(val) => handleStatusChange(item, val as string)}>
                                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING_DELIVERY">รอรับเข้า</SelectItem>
                                  <SelectItem value="RECEIVED">รับของแล้ว</SelectItem>
                                </SelectContent>
                             </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qc" className="space-y-6">
             <Card className="shadow-sm">
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4"><CardTitle className="text-base text-slate-700">QC Status (รายการรอตรวจ)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="whitespace-nowrap text-sm">
                    <TableHeader className="bg-[#F8F6F0]">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="font-semibold text-slate-700 px-6 py-4">Receive Date</TableHead>
                        <TableHead className="font-semibold text-slate-700">PO No.</TableHead>
                        <TableHead className="font-semibold text-slate-700">Item</TableHead>
                        <TableHead className="font-semibold text-slate-700 w-44">QC Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.filter(i => i.status !== 'PENDING_DELIVERY').map((item, index) => (
                        <TableRow key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#F8F6F0]/'} hover:bg-purple-50/50 transition-colors border-b border-slate-100`}>
                          <TableCell className="px-6">
                            {item.receive_date ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700 text-sm">{new Date(item.receive_date).toLocaleDateString('th-TH')}</span>
                                <span className="text-xs text-slate-500">{new Date(item.receive_date).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{item.po_no}</TableCell>
                          <TableCell>
                             <div className="font-medium text-purple-700">{item.rm_code}</div>
                             <div className="text-sm text-slate-500 max-w-[250px] truncate" title={item.rm_name}>{item.rm_name}</div>
                          </TableCell>
                          <TableCell>
                             <Select value={item.qc_status || 'QUARANTINED'} onValueChange={(val) => handleQcStatusChange(item, val as string)}>
                                <SelectTrigger className={`w-[140px] h-9 text-xs font-medium border-0 shadow-sm ${getQcColor(item.qc_status || 'QUARANTINED')}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="QUARANTINED" className="text-yellow-700 font-medium focus:bg-yellow-50">QUARANTINED</SelectItem>
                                  <SelectItem value="PASSED" className="text-green-700 font-medium focus:bg-green-50">PASSED</SelectItem>
                                  <SelectItem value="HOLD" className="text-orange-700 font-medium focus:bg-orange-50">HOLD</SelectItem>
                                  <SelectItem value="REJECTED" className="text-red-700 font-medium focus:bg-red-50">REJECTED</SelectItem>
                                </SelectContent>
                             </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.filter(i => i.status !== 'PENDING_DELIVERY').length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-500 bg-white">ไม่มีรายการรอตรวจ QC</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-6">
             <Card className="shadow-sm">
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4"><CardTitle className="text-base text-slate-700">RM Readiness (เรียงตาม LOT การผลิต)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="whitespace-nowrap text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU / LOT</TableHead>
                        <TableHead>Job/Ref</TableHead>
                        <TableHead>RM Code</TableHead>
                        <TableHead>RM Name</TableHead>
                        <TableHead>Required Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-[#D4AF37]">
                            <div className="text-xs text-slate-500 font-normal">{item.production_lots?.products?.sku || '-'}</div>
                            <div>{item.production_lots?.lot_no || '-'}</div>
                          </TableCell>
                          <TableCell>{item.lot_product}</TableCell>
                          <TableCell>{item.rm_code}</TableCell>
                          <TableCell>{item.rm_name}</TableCell>
                          <TableCell className="font-semibold">{item.quantity} {item.unit}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A4238]">ยืนยันข้อมูลใบสั่งซื้อ (Purchase Order)</DialogTitle>
          </DialogHeader>
          
          {extractedData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#D4AF37]/ p-4 rounded-lg border border-[#D4AF37]/30">
                <div><Label className="text-slate-500 text-xs">PO No.</Label><div className="font-bold text-[#D4AF37]">{extractedData.poNo || '-'}</div></div>
                <div><Label className="text-slate-500 text-xs">PO Date</Label><div className="font-semibold">{extractedData.poDate ? new Date(extractedData.poDate).toLocaleDateString('th-TH') : '-'}</div></div>
                <div className="col-span-2"><Label className="text-slate-500 text-xs">Supplier</Label><div className="font-semibold truncate">{extractedData.supplier || '-'}</div></div>
                <div><Label className="text-slate-500 text-xs">กำหนดส่ง (ETA)</Label><div className="font-bold text-orange-600">{extractedData.etaDate ? new Date(extractedData.etaDate).toLocaleDateString('th-TH') : '-'}</div></div>
                <div><Label className="text-slate-500 text-xs">PR No.</Label><div className="font-semibold">{extractedData.prNo || '-'}</div></div>
                <div className="col-span-2"><Label className="text-slate-500 text-xs">Top Remark</Label><div className="font-semibold text-sm">{extractedData.topRemark || '-'}</div></div>
              </div>

              <div className="space-y-3 bg-[#F8F6F0] p-4 rounded-lg border">
                <Label className="font-semibold flex items-center gap-2"><Box className="w-4 h-4"/> จับคู่กับรหัสงาน (LOT) ในระบบ <span className="text-red-500">*</span></Label>
                <Select value={selectedLotId} onValueChange={(val) => setSelectedLotId(val as string)}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="-- ค้นหาและเลือก LOT การผลิต --">
                      {selectedLotId && lotOptions.find(l => l.id === selectedLotId)
                        ? (() => {
                            const lot = lotOptions.find(l => l.id === selectedLotId);
                            return `${(lot.products as any)?.sku} - ${(lot.products as any)?.product_name} (LOT: ${lot.lot_no})`;
                          })()
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {lotOptions.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>{(lot.products as any)?.sku} - {(lot.products as any)?.product_name} (LOT: {lot.lot_no})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">ระบบพบข้อความ JHD/LOT: <span className="font-semibold text-[#D4AF37]">{extractedData.jobNo || 'ไม่มี'}</span></p>
              </div>

              <details className="text-xs bg-slate-100 p-2 rounded border cursor-pointer">
                <summary className="font-semibold text-slate-700">ดูข้อความดิบ (Raw Text) จาก PDF</summary>
                <pre className="mt-2 whitespace-pre-wrap overflow-hidden max-h-40 overflow-y-auto">{extractedData.rawText}</pre>
              </details>

              <div>
                <Label className="mb-2 block font-semibold">รายการวัตถุดิบ ({extractedData.items.length} รายการ)</Label>
                <div className="border rounded-md overflow-hidden">
                  <Table className="text-sm">
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead>รหัส</TableHead>
                        <TableHead>รายการ</TableHead>
                        <TableHead>คลัง</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead>หน่วย</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedData.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold">{item.rm_code}</TableCell>
                          <TableCell>
                            <div>{item.rm_name}</div>
                            {item.bottom_remark && <div className="text-xs text-slate-500 mt-1">Remark: {item.bottom_remark}</div>}
                          </TableCell>
                          <TableCell>{item.warehouse}</TableCell>
                          <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setFile(null); }}>ยกเลิก</Button>
            <Button onClick={handleSaveToDB} disabled={uploading} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              บันทึกลง Data Center
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
