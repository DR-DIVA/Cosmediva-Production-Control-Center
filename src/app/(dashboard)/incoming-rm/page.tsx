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
import { 
  Upload, FileText, CheckCircle2, Loader2, Search, Download, Paperclip, 
  LayoutDashboard, ShoppingCart, Box, Activity, Calendar, Trash2, Edit, 
  Truck, Package, AlertTriangle, Filter, ArrowUp, ArrowDown, ArrowUpDown, 
  Scissors, Plus, X, TrendingUp, Layers, RefreshCw, ShieldCheck, CheckSquare, 
  Sparkles, Clock, ArrowUpRight
} from 'lucide-react';

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
  control_no?: string | null;
  bottom_remark?: string | null;
  top_remark?: string | null;
  production_lots?: { lot_no: string; sku_id: string; products?: { sku: string }; production_logs?: { activity_date: string; processes?: { process_name: string } }[] };
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [poSearch, setPoSearch] = useState('');
  const [etaSort, setEtaSort] = useState<'asc' | 'desc' | null>(null);
  
  // QC View Filters
  const [qcReceiveDateSort, setQcReceiveDateSort] = useState<'asc' | 'desc' | null>(null);
  const [qcPoSearch, setQcPoSearch] = useState('');
  const [qcControlNoSort, setQcControlNoSort] = useState<'asc' | 'desc' | null>(null);
  const [qcCodeSearch, setQcCodeSearch] = useState('');
  const [qcStatusSearch, setQcStatusSearch] = useState('ALL');

  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [mainTab, setMainTab] = useState<'rm'|'pm'>('rm');
  const [activeViewTab, setActiveViewTab] = useState('purchasing');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RMItem | null>(null);
  const [editForm, setEditForm] = useState({ po_no: '', supplier: '', rm_code: '', rm_name: '', quantity: 0, unit: '', eta_date: '' });

  // Split Modal State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splittingItem, setSplittingItem] = useState<RMItem | null>(null);
  const [splitRows, setSplitRows] = useState<{ id: string, quantity: number | string, eta_date: string, bottom_remark: string }[]>([]);

  // Receive Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingItem, setReceivingItem] = useState<RMItem | null>(null);
  const [controlNoInput, setControlNoInput] = useState('');
  const [isGeneratingControlNo, setIsGeneratingControlNo] = useState(false);

  // Customer Supplied PM State
  const [isCmd2ModalOpen, setIsCmd2ModalOpen] = useState(false);
  const [cmd2Form, setCmd2Form] = useState({ pmCode: '', pmName: '', quantity: '', customerName: '', lotProduct: '', warehouse: 'WH-PM', controlNo: '' });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_lot_rms')
      .select('*, production_lots(lot_no, sku_id, products(sku), production_logs(activity_date, processes(process_name)))')
      .order('created_at', { ascending: false });

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
    if (data) {
      setLotOptions(data);
      return data;
    }
    return [];
  };

  useEffect(() => {
    fetchItems();
    fetchLots();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserRole(data.user?.user_metadata?.role || 'user');
        const email = data.user.email;
        if (email.endsWith('@cosmediva.local')) {
          setCurrentUser(email.split('@')[0]);
        } else {
          setCurrentUser(email);
        }
      }
    });
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
          const freshLots = await fetchLots();
          let matchedLotId = '';
          if (result.data.jobNo) {
             const cleanedJobNo = result.data.jobNo.replace('L.', '');
             const matched = freshLots.find((l: any) => l.lot_no.includes(cleanedJobNo) || cleanedJobNo.includes(l.lot_no));
             if (matched) matchedLotId = matched.id;
          }
          setSelectedLotId(matchedLotId || 'N/A');
          setIsModalOpen(true);
        } else {
          toast.warning('ไม่พบรายการวัตถุดิบ/บรรจุภัณฑ์ใน PDF นี้');
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
      production_lot_id: selectedLotId === 'N/A' ? null : selectedLotId,
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
    if (newStatus === 'RECEIVED') {
      await openReceiveModal(item);
      return;
    }

    const updates: any = { status: newStatus };
    if (newStatus === 'PENDING_DELIVERY') {
      updates.receive_date = null;
    }
    
    const { error } = await supabase
      .from('production_lot_rms')
      .update(updates)
      .eq('id', item.id);

    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    } else {
      toast.success('อัปเดตสถานะเรียบร้อยแล้ว');
      fetchItems();
    }
  };

  const openSplitModal = (item: RMItem) => {
    setSplittingItem(item);
    setSplitRows([
      { id: crypto.randomUUID(), quantity: item.quantity, eta_date: item.eta_date ? item.eta_date.split('T')[0] : '', bottom_remark: 'งวดที่ 1' },
      { id: crypto.randomUUID(), quantity: '', eta_date: '', bottom_remark: 'งวดที่ 2' }
    ]);
    setIsSplitModalOpen(true);
  };

  const handleSplitSubmit = async () => {
    if (!splittingItem) return;
    
    // Validation
    const totalSplitQty = splitRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    if (Math.abs(totalSplitQty - splittingItem.quantity) > 0.001) {
      toast.error(`จำนวนรวม (${totalSplitQty.toFixed(2)}) ไม่เท่ากับจำนวนใน PO (${splittingItem.quantity})`);
      return;
    }
    if (splitRows.some(r => !r.quantity || !r.eta_date)) {
      toast.error('กรุณาระบุจำนวนและวันที่ ETA ให้ครบทุกงวด');
      return;
    }

    setLoading(true);
    try {
      const firstSplit = splitRows[0];
      const { error: updateError } = await supabase
        .from('production_lot_rms')
        .update({
          quantity: Number(firstSplit.quantity),
          eta_date: firstSplit.eta_date,
          bottom_remark: firstSplit.bottom_remark
        })
        .eq('id', splittingItem.id);

      if (updateError) throw updateError;

      const remainingSplits = splitRows.slice(1);
      if (remainingSplits.length > 0) {
        const insertData = remainingSplits.map(split => {
          const { id, receive_date, control_no, production_lots, created_at, ...baseItem } = splittingItem as any;
          return {
            ...baseItem,
            quantity: Number(split.quantity),
            eta_date: split.eta_date,
            bottom_remark: split.bottom_remark
          };
        });

        const { error: insertError } = await supabase
          .from('production_lot_rms')
          .insert(insertData);
          
        if (insertError) throw insertError;
      }

      toast.success('แยกงวดส่งของเรียบร้อยแล้ว');
      setIsSplitModalOpen(false);
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error('เกิดข้อผิดพลาดในการแยกงวดส่งของ');
    } finally {
      setLoading(false);
    }
  };

  const openReceiveModal = async (item: RMItem) => {
    setReceivingItem(item);
    setIsGeneratingControlNo(true);
    setIsReceiveModalOpen(true);
    setControlNoInput('');
    
    try {
      const prefix = item.warehouse === 'MMRM' ? 'R' : 'P';
      const d = new Date();
      const yy = d.getFullYear().toString().slice(2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yy}${mm}${dd}`;
      const searchPattern = `${prefix}${dateString}-%`;

      const { data, error } = await supabase
        .from('production_lot_rms')
        .select('control_no')
        .like('control_no', searchPattern)
        .order('control_no', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (!error && data && data.length > 0 && data[0].control_no) {
        const parts = data[0].control_no.split('-');
        if (parts.length === 2) {
          const lastNum = parseInt(parts[1], 10);
          if (!isNaN(lastNum)) {
            nextNum = lastNum + 1;
          }
        }
      }
      setControlNoInput(`${prefix}${dateString}-${String(nextNum).padStart(3, '0')}`);
    } catch (error) {
      console.error("Error generating control no:", error);
    } finally {
      setIsGeneratingControlNo(false);
    }
  };

  const confirmReceive = async () => {
    if (!receivingItem) return;
    if (!controlNoInput.trim()) {
      toast.error('กรุณาระบุ Control No.');
      return;
    }

    // Check for duplicate
    const { data: duplicateData } = await supabase
      .from('production_lot_rms')
      .select('id')
      .eq('control_no', controlNoInput.trim())
      .limit(1);

    if (duplicateData && duplicateData.length > 0) {
      toast.error('Control No. นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น');
      return;
    }

    const updates: any = { 
      status: 'RECEIVED',
      control_no: controlNoInput.trim()
    };
    if (!receivingItem.receive_date) {
      updates.receive_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('production_lot_rms')
      .update(updates)
      .eq('id', receivingItem.id);

    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    } else {
      toast.success('รับของและบันทึก Control No. เรียบร้อยแล้ว');
      setIsReceiveModalOpen(false);
      setReceivingItem(null);
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

  const openEditModal = (item: RMItem) => {
    setEditingItem(item);
    setEditForm({
      po_no: item.po_no || '',
      supplier: item.supplier || '',
      rm_code: item.rm_code || '',
      rm_name: item.rm_name || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      eta_date: item.eta_date ? new Date(item.eta_date).toISOString().split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('production_lot_rms').update({
      po_no: editForm.po_no,
      supplier: editForm.supplier,
      rm_code: editForm.rm_code,
      rm_name: editForm.rm_name,
      quantity: editForm.quantity,
      unit: editForm.unit,
      eta_date: editForm.eta_date || null
    }).eq('id', editingItem.id);

    if (error) {
      toast.error('แก้ไขข้อมูลไม่สำเร็จ');
    } else {
      toast.success('แก้ไขข้อมูลสำเร็จ');
      setIsEditModalOpen(false);
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

  const openCmd2Modal = async () => {
    setIsCmd2ModalOpen(true);
    setCmd2Form({ pmCode: '', pmName: '', quantity: '', customerName: '', lotProduct: '', warehouse: 'WH-PM', controlNo: '' });
    
    try {
      const prefix = 'P';
      const d = new Date();
      const yy = d.getFullYear().toString().slice(2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yy}${mm}${dd}`;
      const searchPattern = `${prefix}${dateString}-%`;

      const { data, error } = await supabase
        .from('production_lot_rms')
        .select('control_no')
        .like('control_no', searchPattern)
        .order('control_no', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (!error && data && data.length > 0 && data[0].control_no) {
        const parts = data[0].control_no.split('-');
        if (parts.length === 2) {
          const lastNum = parseInt(parts[1], 10);
          if (!isNaN(lastNum)) {
            nextNum = lastNum + 1;
          }
        }
      }
      setCmd2Form(prev => ({ ...prev, controlNo: `${prefix}${dateString}-${String(nextNum).padStart(3, '0')}` }));
    } catch (error) {
      console.error("Error generating control no:", error);
    }
  };

  const handleCmd2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cmd2Form.controlNo.trim()) {
      const { data: duplicateData } = await supabase
        .from('production_lot_rms')
        .select('id')
        .eq('control_no', cmd2Form.controlNo.trim())
        .limit(1);

      if (duplicateData && duplicateData.length > 0) {
        toast.error('Control No. นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น');
        return;
      }
    }

    setUploading(true);
    
    // Generate pseudo PO/PR number
    const fakePo = `PM-CMD2-${Date.now().toString().slice(-6)}`;
    
    // If no code is provided, generate a pseudo one
    const fakeCode = cmd2Form.pmCode || `CMD2-${cmd2Form.customerName.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    
    const { error } = await supabase.from('production_lot_rms').insert({
      po_no: fakePo,
      pr_no: fakePo,
      supplier: cmd2Form.customerName,
      rm_code: fakeCode,
      rm_name: cmd2Form.pmName,
      quantity: parseFloat(cmd2Form.quantity) || 0,
      unit: 'pcs',
      warehouse: cmd2Form.warehouse,
      lot_product: cmd2Form.lotProduct,
      control_no: cmd2Form.controlNo.trim() || undefined,
      status: 'RECEIVED',
      receive_date: new Date().toISOString()
    });

    setUploading(false);

    if (error) {
      toast.error('บันทึกข้อมูลบรรจุภัณฑ์ลูกค้าไม่สำเร็จ');
    } else {
      toast.success('รับเข้าบรรจุภัณฑ์ลูกค้า (CMD2) สำเร็จ!');
      setIsCmd2ModalOpen(false);
      setCmd2Form({ pmCode: '', pmName: '', quantity: '', customerName: '', lotProduct: '', warehouse: 'WH-PM', controlNo: '' });
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

  const isPM = (code: string) => code?.startsWith('CMD1') || code?.startsWith('CMD2');
  
  const typeFilteredItems = items.filter(item => mainTab === 'pm' ? isPM(item.rm_code) : !isPM(item.rm_code));

  const filteredItems = typeFilteredItems.filter(item => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'READY') {
        if (item.status !== 'READY' && item.status !== 'QC_PASS' && item.status !== 'PASSED') return false;
      } else {
        if (item.status !== statusFilter) return false;
      }
    }
    if (poSearch && !((item.po_no || '').toLowerCase().includes(poSearch.toLowerCase()))) {
      return false;
    }
    const term = searchQuery.toLowerCase();
    const statusTh = item.status === 'PENDING_DELIVERY' ? 'รอรับเข้า' : item.status === 'RECEIVED' ? 'รับของแล้ว' : item.status === 'WAITING_QC' ? 'รอตรวจ qc' : item.status === 'PASSED' ? 'ผ่าน' : item.status === 'REJECTED' ? 'ไม่ผ่าน' : item.status === 'QUARANTINED' ? 'กักกัน' : '';
    return (
      (item.po_no || '').toLowerCase().includes(term) ||
      (item.rm_code || '').toLowerCase().includes(term) ||
      (item.rm_name || '').toLowerCase().includes(term) ||
      (item.lot_product || '').toLowerCase().includes(term) ||
      (item.supplier || '').toLowerCase().includes(term) ||
      (item.production_lots?.products?.sku || '').toLowerCase().includes(term) ||
      (item.production_lots?.lot_no || '').toLowerCase().includes(term) ||
      statusTh.includes(term)
    );
  }).sort((a, b) => {
      if (etaSort) {
        const dateA = a.eta_date ? new Date(a.eta_date).getTime() : 0;
        const dateB = b.eta_date ? new Date(b.eta_date).getTime() : 0;
        return etaSort === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

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

  const delayedItems = typeFilteredItems.filter(item => {
    let targetDate: Date | null = null;
    if (item.production_lots?.production_logs) {
      const processName = mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ';
      const targetLogs = item.production_lots.production_logs.filter((l: any) => l.processes?.process_name === processName);
      if (targetLogs.length > 0) {
        targetLogs.sort((a: any, b: any) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime());
        targetDate = new Date(targetLogs[0].activity_date);
      }
    }
    const etaDate = item.eta_date ? new Date(item.eta_date) : null;
    return targetDate && etaDate && new Date(etaDate.toDateString()) > new Date(targetDate.toDateString());
  });

  const activeItemsCount = typeFilteredItems.length;

  const handleRefresh = () => {
    fetchItems();
    fetchLots();
    toast.success('รีเฟรชข้อมูลวัตถุดิบล่าสุดเรียบร้อยแล้ว');
  };

  // Executive Material Supply Chain Calculations
  const pendingDeliveryItems = typeFilteredItems.filter(i => i.status === 'PENDING_DELIVERY');
  const receivedItems = typeFilteredItems.filter(i => i.status === 'RECEIVED' || i.status === 'WAITING_QC');
  const readyItems = typeFilteredItems.filter(i => i.status === 'READY' || i.status === 'QC_PASS' || i.status === 'PASSED');
  const rejectedItems = typeFilteredItems.filter(i => i.status === 'REJECTED' || i.status === 'QUARANTINED');

  const pendingWeight = pendingDeliveryItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const receivedWeight = receivedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const readyWeight = readyItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const totalWeight = typeFilteredItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const controlNoCount = typeFilteredItems.filter(i => !!i.control_no).length;
  const readyPct = activeItemsCount > 0 ? ((readyItems.length / activeItemsCount) * 100).toFixed(1) : '0.0';
  const fulfillmentPct = activeItemsCount > 0 ? (((receivedItems.length + readyItems.length) / activeItemsCount) * 100).toFixed(1) : '0.0';
  const uniqueSuppliers = new Set(typeFilteredItems.map(i => i.supplier).filter(Boolean)).size;
  const unitLabel = mainTab === 'rm' ? 'KG' : 'PCS';

  return (
    <div className="p-6 w-full mx-auto space-y-6">
        {/* Top Toggle for RM/PM */}
        <div className="flex justify-center mb-4">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex shadow-inner border border-slate-200">
            <button 
              onClick={() => setMainTab('rm')}
              className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${mainTab === 'rm' ? 'bg-[#2D2721] text-[#D4AF37] shadow-lg border border-[#D4AF37]/30' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Package className="w-4 h-4" />
              วัตถุดิบ (Raw Material - RM)
            </button>
            <button 
              onClick={() => setMainTab('pm')}
              className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${mainTab === 'pm' ? 'bg-[#2D2721] text-[#D4AF37] shadow-lg border border-[#D4AF37]/30' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Box className="w-4 h-4" />
              บรรจุภัณฑ์ (Packaging - PM)
            </button>
          </div>
        </div>

        {/* Title Header Card */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-2">
        <div className="flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#4A4238] flex flex-wrap items-center gap-2 md:gap-3">
            <Package className="w-8 h-8 text-yellow-500 shrink-0" />
            <span className="whitespace-normal break-words">Material Control Center ({mainTab.toUpperCase()})</span>
          </h1>
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>ศูนย์กลางจัดการใบสั่งซื้อ การรับเข้า และสถานะ{mainTab === 'rm' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'}สำหรับการผลิต</div>
             <div className="flex items-center mt-1 text-[#8B7355] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
              Synchronize RM/PM Data, Inbound Logistics, and Production Flow.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="ค้นหา PO, Code, Name, สถานะ..." 
              className="pl-9 w-full sm:w-[250px] bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleRefresh} variant="outline" className="bg-[#F8F6F0] hover:bg-slate-100 flex-shrink-0 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-[#D4AF37]" /> รีเฟรช
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="bg-white flex-shrink-0">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          {mainTab === 'pm' && (
            <Button onClick={() => setIsCmd2ModalOpen(true)} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold flex-shrink-0">
              + รับเข้าวัสดุลูกค้า (CMD2)
            </Button>
          )}
        </div>
      </div>

      {/* 1. Executive Material Control & Supply Chain KPI Summary Bar */}
      <div className="bg-gradient-to-r from-[#2D2721] via-[#3E352B] to-[#2D2721] text-white p-5 rounded-2xl shadow-xl border border-[#D4AF37]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-white flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 shrink-0">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Supply Chain & Material Intelligence
            </div>
            <div className="text-lg md:text-xl font-black text-white mt-0.5">
              Executive Material Control KPI ({mainTab.toUpperCase()})
            </div>
            <div className="text-xs text-stone-300 mt-0.5">
              ภาพรวมการจัดซื้อ • การรับเข้าคลัง • และการตรวจปล่อย QC เพื่อรองรับแผนการผลิต
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Total Lines */}
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
            <div className="text-[11px] text-stone-300 font-medium">รายการ{mainTab === 'rm' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'}ทั้งหมด</div>
            <div className="text-2xl font-black text-[#D4AF37] tracking-tight">
              {activeItemsCount} <span className="text-xs font-normal text-stone-300">รายการ</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">({uniqueSuppliers} คู่ค้า / ซัพพลายเออร์)</div>
          </div>

          {/* On Order / Pending Delivery */}
          <div className="bg-amber-500/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-400/30 text-center">
            <div className="text-[11px] text-amber-200 font-medium">รอส่งมอบ / Inbound</div>
            <div className="text-2xl font-black text-amber-400">
              {pendingDeliveryItems.length} <span className="text-xs font-normal text-amber-200">รายการ</span>
            </div>
            <div className="text-[10px] text-amber-300 mt-0.5">({pendingWeight.toLocaleString()} {unitLabel})</div>
          </div>

          {/* Warehouse Received */}
          <div className="bg-blue-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-blue-400/30 text-center">
            <div className="text-[11px] text-blue-200 font-medium">รับเข้าคลังแล้ว (Received)</div>
            <div className="text-2xl font-black text-blue-300">
              {receivedItems.length} <span className="text-xs font-normal text-blue-200">รายการ</span>
            </div>
            <div className="text-[10px] text-blue-300 mt-0.5">({controlNoCount} มี Control No.)</div>
          </div>

          {/* Ready & Released */}
          <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-400/30 text-center">
            <div className="text-[11px] text-emerald-200 font-medium">พร้อมใช้ผลิต 100% (Released)</div>
            <div className="text-2xl font-black text-emerald-400">
              {readyItems.length} <span className="text-xs font-normal text-emerald-200">รายการ ({readyPct}%)</span>
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">({readyWeight.toLocaleString()} {unitLabel})</div>
          </div>
        </div>
      </div>

      {/* 2. Four Interactive Material Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Purchasing & Inbound ETA */}
        <Card 
          onClick={() => setActiveViewTab('purchasing')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeViewTab === 'purchasing' ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20 bg-[#F8F6F0]' : 'border-slate-200 hover:border-[#D4AF37]/50 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#8B7355] flex items-center justify-center font-bold shadow-sm">
                  <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">1. การสั่งซื้อ & ขนส่ง (Inbound)</div>
                  <div className="text-[11px] text-slate-500">Purchasing & ETA Tracking</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 font-semibold text-slate-700">
                {pendingDeliveryItems.length} รอเข้า
              </Badge>
            </div>

            {/* Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-[#4A4238]">{pendingWeight.toLocaleString()}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">{unitLabel}</span>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                {pendingDeliveryItems.length} PO กำลังมา
              </Badge>
            </div>

            {/* Progress */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${fulfillmentPct}%` }} className="bg-[#D4AF37] h-full" title={`Inbound Progress: ${fulfillmentPct}%`} />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">สั่งซื้อแล้ว</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">{activeItemsCount}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">รายการ</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">คู่ค้า (Vendors)</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">{uniqueSuppliers}</div>
                <div className="text-[9px] text-[#8B7355] font-medium">ซัพพลายเออร์</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#F8F6F0] border border-[#D4AF37]/20">
                <div className="text-[10px] font-semibold text-[#8B7355]">คลิกเพื่อดู</div>
                <div className="text-xs font-bold text-[#4A4238] mt-0.5">PO View</div>
                <div className="text-[9px] text-[#8B7355] font-medium">Purchasing</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Warehouse Receiving */}
        <Card 
          onClick={() => setActiveViewTab('warehouse')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeViewTab === 'warehouse' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">2. รับเข้าคลัง (Warehouse)</div>
                  <div className="text-[11px] text-slate-500">Receiving & Control No.</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                {controlNoCount} Control No.
              </Badge>
            </div>

            {/* Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-blue-600">{receivedItems.length + readyItems.length}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">/ {activeItemsCount} รายการรับแล้ว</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                {fulfillmentPct}% รับมอบ
              </Badge>
            </div>

            {/* Progress */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${fulfillmentPct}%` }} className="bg-blue-500 h-full transition-all duration-500" />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">รับเข้าแล้ว</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">{receivedItems.length}</div>
                <div className="text-[9px] text-blue-600 font-medium">รอผลตรวจ</div>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">ปริมาณรับเข้า</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">{receivedWeight.toLocaleString()}</div>
                <div className="text-[9px] text-blue-600 font-medium">{unitLabel}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <div className="text-[10px] font-semibold text-blue-700">คลิกเพื่อดู</div>
                <div className="text-xs font-bold text-blue-800 mt-0.5">WH View</div>
                <div className="text-[9px] text-blue-600 font-medium">Warehouse</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: QC Lab Clearance */}
        <Card 
          onClick={() => setActiveViewTab('qc')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeViewTab === 'qc' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">3. ตรวจรับรองคุณภาพ (QC)</div>
                  <div className="text-[11px] text-slate-500">Sampling & Lab Release</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                {readyPct}% ผ่านตรวจ
              </Badge>
            </div>

            {/* Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-emerald-600">{readyItems.length}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">รายการปล่อยผ่าน (Released)</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                {readyWeight.toLocaleString()} {unitLabel}
              </Badge>
            </div>

            {/* Progress */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${readyPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">ปล่อยผ่าน</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">{readyItems.length}</div>
                <div className="text-[9px] text-emerald-600 font-medium">พร้อมผลิต</div>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <div className="text-[10px] font-semibold text-amber-700">รอตรวจ QC</div>
                <div className="text-xs font-bold text-amber-800 mt-0.5">{receivedItems.length}</div>
                <div className="text-[9px] text-amber-600 font-medium">Quarantine</div>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-semibold text-emerald-700">คลิกเพื่อดู</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">QC View</div>
                <div className="text-[9px] text-emerald-600 font-medium">Inspection</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Production Planning Readiness */}
        <Card 
          onClick={() => setActiveViewTab('planning')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${activeViewTab === 'planning' ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">4. ความพร้อมต่อแผนผลิต</div>
                  <div className="text-[11px] text-slate-500">Shopfloor Readiness</div>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs font-semibold ${delayedItems.length > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {delayedItems.length > 0 ? `${delayedItems.length} เสี่ยงล่าช้า` : 'พร้อมสมบูรณ์'}
              </Badge>
            </div>

            {/* Big Display */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-black text-indigo-600">{activeItemsCount - delayedItems.length}</span>
                <span className="text-xs text-slate-500 ml-1.5 font-medium">/ {activeItemsCount} รายการทันแผน</span>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                Planning Sync
              </Badge>
            </div>

            {/* Progress */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
              <div style={{ width: `${activeItemsCount > 0 ? (((activeItemsCount - delayedItems.length) / activeItemsCount) * 100) : 100}%` }} className="bg-indigo-500 h-full transition-all duration-500" />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center border-t border-slate-100">
              <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                <div className="text-[10px] font-semibold text-indigo-700">ทันคิวผลิต</div>
                <div className="text-xs font-bold text-indigo-800 mt-0.5">{activeItemsCount - delayedItems.length}</div>
                <div className="text-[9px] text-indigo-600 font-medium">รายการ</div>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <div className="text-[10px] font-semibold text-rose-700">เสี่ยงล่าช้า</div>
                <div className="text-xs font-bold text-rose-800 mt-0.5">{delayedItems.length}</div>
                <div className="text-[9px] text-rose-600 font-medium">กระทบแผน</div>
              </div>
              <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                <div className="text-[10px] font-semibold text-indigo-700">คลิกเพื่อดู</div>
                <div className="text-xs font-bold text-indigo-800 mt-0.5">Plan View</div>
                <div className="text-[9px] text-indigo-600 font-medium">Readiness</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        <Tabs value={activeViewTab} onValueChange={setActiveViewTab} className="w-full">
        <TabsList className="bg-[#D4AF37] p-1.5 rounded-xl border-none shadow-md w-full justify-start h-auto gap-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><LayoutDashboard className="w-4 h-4 mr-2"/> Overview Dashboard</TabsTrigger>
          <TabsTrigger value="purchasing" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><ShoppingCart className="w-4 h-4 mr-2"/> Purchasing View</TabsTrigger>
          <TabsTrigger value="warehouse" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><Box className="w-4 h-4 mr-2"/> Warehouse View</TabsTrigger>
          <TabsTrigger value="qc" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><Activity className="w-4 h-4 mr-2"/> QC View</TabsTrigger>
          <TabsTrigger value="planning" className="data-[state=active]:bg-white data-[state=active]:text-[#D4AF37] data-[state=active]:shadow-sm py-2 px-4 text-white/80 hover:text-white hover:bg-white/20 font-medium transition-all rounded-lg"><Calendar className="w-4 h-4 mr-2"/> Planning View</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="dashboard" className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#D4AF37]/ border-[#D4AF37]/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#4A4238]">รายการทั้งหมด</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-[#D4AF37]">{activeItemsCount}</div></CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-800">รอของเข้า (Pending)</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-orange-600">{typeFilteredItems.filter(i => i.status === 'PENDING_DELIVERY').length}</div></CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-800">รอตรวจ QC</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-yellow-600">{typeFilteredItems.filter(i => i.status === 'WAITING_QC' || i.status === 'RECEIVED').length}</div></CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-800">พร้อมใช้ผลิต (Released)</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-green-600">{typeFilteredItems.filter(i => i.status === 'READY' || i.status === 'QC_PASS').length}</div></CardContent>
                </Card>
             </div>
             
             {delayedItems.length > 0 ? (
               <Card className="border-red-200 shadow-sm mt-4">
                 <CardHeader className="bg-red-50 border-b border-red-100 pb-3">
                   <CardTitle className="text-red-800 text-sm flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4" /> รายการ{mainTab === 'rm' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'}ที่เข้าไม่ทันคิว{mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ'} ({delayedItems.length})
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    <Table className="text-sm table-fixed w-full">
                      <TableHeader className="bg-red-50/50">
                        <TableRow>
                          <TableHead className="text-red-800">SKU / LOT</TableHead>
                          <TableHead className="text-red-800">Code</TableHead>
                          <TableHead className="text-red-800">Name</TableHead>
                          <TableHead className="text-red-800">คิว{mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ'}</TableHead>
                          <TableHead className="text-red-800">ETA ของเข้า</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {delayedItems.map((item) => {
                          let targetDate: Date | null = null;
                          if (item.production_lots?.production_logs) {
                            const processName = mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ';
                            const targetLogs = item.production_lots.production_logs.filter((l: any) => l.processes?.process_name === processName);
                            if (targetLogs.length > 0) {
                              targetLogs.sort((a: any, b: any) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime());
                              targetDate = new Date(targetLogs[0].activity_date);
                            }
                          }
                          const etaDate = item.eta_date ? new Date(item.eta_date) : null;
                          
                          return (
                            <TableRow key={item.id} className="bg-white">
                              <TableCell>
                                <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-slate-700">{item.rm_code}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-slate-500 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                                {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                                  <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                    {item.bottom_remark.split('/')[0].trim()}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium text-slate-700">
                                {targetDate ? targetDate.toLocaleDateString('th-TH') : '-'}
                              </TableCell>
                              <TableCell className="font-bold text-red-600">
                                {etaDate ? etaDate.toLocaleDateString('th-TH') : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                 </CardContent>
               </Card>
             ) : (
               <Card className="border-green-200 shadow-sm mt-4">
                 <CardContent className="p-6 flex items-center justify-center text-green-700 bg-green-50/50 rounded-lg">
                   <CheckCircle2 className="w-5 h-5 mr-2" /> ไม่มีรายการ{mainTab === 'rm' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'}ที่เข้าไม่ทันคิว{mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ'} ({mainTab === 'rm' ? 'RM' : 'PM'} ทุกรายการเข้าทันกำหนด)
                 </CardContent>
               </Card>
             )}
          </TabsContent>

          <TabsContent value="purchasing" className="space-y-6">
            <Card className="bg-[#D4AF37]/ border-[#D4AF37]/30/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#4A4238] flex items-center gap-2 text-base">
                  <Upload className="w-4 h-4" /> อัปโหลดใบสั่งซื้อ (PO PDF) {mainTab === 'pm' ? 'สำหรับบรรจุภัณฑ์' : 'สำหรับวัตถุดิบ'}
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
                  <Table className="text-sm table-fixed w-full">
                    <TableHeader className="bg-[#F8F6F0]/">
                      <TableRow>
                        <TableHead className="w-[10%] p-0">
                          <div className="flex flex-col px-2 py-1 gap-1 w-full h-full justify-center">
                            <span className="font-semibold text-slate-500">PO No.</span>
                            <Input 
                              placeholder="ค้นหา PO..." 
                              value={poSearch}
                              onChange={(e) => setPoSearch(e.target.value)}
                              className="h-6 text-[10px] w-full bg-slate-50 border-slate-200 px-1"
                            />
                          </div>
                        </TableHead>
                        <TableHead className="w-[12%]">Supplier</TableHead>
                        <TableHead>PO Date</TableHead>
                        <TableHead 
                          className="w-[8%] cursor-pointer hover:bg-slate-50 transition-colors select-none group" 
                          onClick={() => setEtaSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                        >
                          <div className="flex items-center gap-1">
                            <span>ETA</span>
                            {etaSort === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : 
                             etaSort === 'desc' ? <ArrowDown className="w-3 h-3 text-[#D4AF37]" /> : 
                             <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        </TableHead>
                        <TableHead className="w-[10%]">Code</TableHead>
                        <TableHead className="w-[15%]">Name</TableHead>
                        <TableHead className="w-[8%]">Qty</TableHead>
                        <TableHead className="w-[10%] p-0">
                          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                            <SelectTrigger className="h-full w-full border-0 bg-transparent shadow-none font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-none px-4 focus:ring-0">
                              <div className="flex items-center gap-2">
                                <span>Status</span>
                                <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-slate-400'}`} />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All Status</SelectItem>
                              <SelectItem value="PENDING_DELIVERY">Ordered</SelectItem>
                              <SelectItem value="RECEIVED">Received</SelectItem>
                              <SelectItem value="WAITING_QC">QC Pending</SelectItem>
                              <SelectItem value="QC_PASS">QC Passed</SelectItem>
                              <SelectItem value="READY">Released</SelectItem>
                              <SelectItem value="DELAYED">Delayed</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead>File</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-[#F8F6F0]/">
                          <TableCell className="font-medium text-[#D4AF37]">{item.po_no || '-'}</TableCell>
                          <TableCell className="line-clamp-2 break-words text-wrap" title={item.supplier}>{item.supplier || '-'}</TableCell>
                          <TableCell>{item.po_date ? new Date(item.po_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                          <TableCell>{item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                          <TableCell>{item.rm_code}</TableCell>
                          <TableCell className="line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</TableCell>
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
                            <div className="flex items-center justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openSplitModal(item)} 
                                disabled={item.status !== 'PENDING_DELIVERY' || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin')}
                                className={`h-8 w-8 ${item.status !== 'PENDING_DELIVERY' || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin') ? 'text-slate-300' : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50'}`}
                                title="แยกงวดส่งของ (Split Delivery)"
                              >
                                <Scissors className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openEditModal(item)} 
                                disabled={item.status !== 'PENDING_DELIVERY' || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin')}
                                className={`h-8 w-8 ${item.status !== 'PENDING_DELIVERY' || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin') ? 'text-slate-300' : 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDelete(item.id)} 
                                disabled={item.status !== 'PENDING_DELIVERY' || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin')}
                                className={`h-8 w-8 ${item.status !== 'PENDING_DELIVERY' || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin') ? 'text-slate-300' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                              >
                                 <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
                  <Table className="text-sm table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="w-[8%] cursor-pointer hover:bg-slate-50 transition-colors select-none group" 
                          onClick={() => setEtaSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                        >
                          <div className="flex items-center gap-1">
                            <span>ETA</span>
                            {etaSort === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : 
                             etaSort === 'desc' ? <ArrowDown className="w-3 h-3 text-[#D4AF37]" /> : 
                             <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        </TableHead>
                        <TableHead className="w-[10%] p-0">
                          <div className="flex flex-col px-2 py-1 gap-1 w-full h-full justify-center">
                            <span className="font-semibold text-slate-500">PO No.</span>
                            <Input 
                              placeholder="ค้นหา PO..." 
                              value={poSearch}
                              onChange={(e) => setPoSearch(e.target.value)}
                              className="h-6 text-[10px] w-full bg-slate-50 border-slate-200 px-1"
                            />
                          </div>
                        </TableHead>
                        <TableHead className="w-[12%]">Supplier</TableHead>
                        <TableHead className="w-[10%]">SKU / LOT</TableHead>
                        <TableHead className="w-[10%]">Code</TableHead>
                        <TableHead className="w-[15%]">Name</TableHead>
                        <TableHead className="w-[8%]">Qty</TableHead>
                        <TableHead className="w-[8%]">Warehouse</TableHead>
                        <TableHead className="w-[9%]">Receive Date</TableHead>
                        <TableHead className="w-[10%] p-0">
                          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                            <SelectTrigger className="h-full w-full border-0 bg-transparent shadow-none font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-none px-4 focus:ring-0">
                              <div className="flex items-center gap-2">
                                <span>Status</span>
                                <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-slate-400'}`} />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All Status</SelectItem>
                              <SelectItem value="PENDING_DELIVERY">Ordered</SelectItem>
                              <SelectItem value="RECEIVED">Received</SelectItem>
                              <SelectItem value="WAITING_QC">QC Pending</SelectItem>
                              <SelectItem value="QC_PASS">QC Passed</SelectItem>
                              <SelectItem value="READY">Released</SelectItem>
                              <SelectItem value="DELAYED">Delayed</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableHead>
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
                          <TableCell className="line-clamp-2 break-words text-wrap">{item.supplier}</TableCell>
                          <TableCell>
                            <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{item.rm_code}</TableCell>
                          <TableCell>
                            <div className="text-slate-600 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                            {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                {item.bottom_remark.split('/')[0].trim()}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{item.quantity} {item.unit}</TableCell>
                          <TableCell>{item.warehouse}</TableCell>
                          <TableCell>
                            {item.receive_date ? (() => {
                              const d = new Date(item.receive_date.endsWith('Z') || item.receive_date.includes('+') ? item.receive_date : item.receive_date + 'Z');
                              return (
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700 text-sm">{d.toLocaleDateString('th-TH')}</span>
                                  <span className="text-xs text-slate-500">{d.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>
                                </div>
                              );
                            })() : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                             <Select value={item.status || ''} onValueChange={(val) => handleStatusChange(item, val as string)} disabled={item.status !== 'PENDING_DELIVERY' || !(currentUser?.toUpperCase().startsWith('MM') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin')}>
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
                  <Table className="text-sm table-fixed w-full">
                    <TableHeader className="bg-[#F8F6F0]">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="font-semibold text-slate-700 px-6 py-4">
                          <div className="flex items-center space-x-1 cursor-pointer hover:text-purple-700" onClick={() => {
                            if (qcReceiveDateSort === 'asc') setQcReceiveDateSort('desc');
                            else if (qcReceiveDateSort === 'desc') setQcReceiveDateSort(null);
                            else { setQcReceiveDateSort('asc'); setQcControlNoSort(null); }
                          }}>
                            <span>Receive Date</span>
                            {qcReceiveDateSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : qcReceiveDateSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>PO No.</span>
                            <input type="text" placeholder="ค้นหา PO..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={qcPoSearch} onChange={(e) => setQcPoSearch(e.target.value)} />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-purple-700">
                          <div className="flex items-center space-x-1 cursor-pointer hover:text-purple-900" onClick={() => {
                            if (qcControlNoSort === 'asc') setQcControlNoSort('desc');
                            else if (qcControlNoSort === 'desc') setQcControlNoSort(null);
                            else { setQcControlNoSort('asc'); setQcReceiveDateSort(null); }
                          }}>
                            <span>Control No.</span>
                            {qcControlNoSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : qcControlNoSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700">SKU / LOT</TableHead>
                        <TableHead className="font-semibold text-slate-700">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>Code</span>
                            <input type="text" placeholder="ค้นหา Code..." className="text-xs font-normal border rounded px-1.5 py-1 w-24 bg-white" value={qcCodeSearch} onChange={(e) => setQcCodeSearch(e.target.value)} />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 w-72">Name</TableHead>
                        <TableHead className="font-semibold text-slate-700 w-44">
                          <div className="flex flex-col space-y-1 mt-1 mb-1">
                            <span>QC Status</span>
                            <Select value={qcStatusSearch} onValueChange={(val) => setQcStatusSearch(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-xs w-full bg-white px-2 py-0 border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                                <SelectItem value="QUARANTINED">QUARANTINED</SelectItem>
                                <SelectItem value="PASSED">PASSED</SelectItem>
                                <SelectItem value="HOLD">HOLD</SelectItem>
                                <SelectItem value="REJECTED">REJECTED</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.filter(i => i.status !== 'PENDING_DELIVERY')
                        .filter(i => qcPoSearch ? (i.po_no || '').toLowerCase().includes(qcPoSearch.toLowerCase()) : true)
                        .filter(i => qcCodeSearch ? (i.rm_code || '').toLowerCase().includes(qcCodeSearch.toLowerCase()) : true)
                        .filter(i => qcStatusSearch !== 'ALL' ? (i.qc_status || 'QUARANTINED') === qcStatusSearch : true)
                        .sort((a, b) => {
                          if (qcControlNoSort) {
                            const ca = a.control_no || '';
                            const cb = b.control_no || '';
                            return qcControlNoSort === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
                          }
                          if (qcReceiveDateSort) {
                            const ta = new Date(a.receive_date || 0).getTime();
                            const tb = new Date(b.receive_date || 0).getTime();
                            return qcReceiveDateSort === 'asc' ? ta - tb : tb - ta;
                          }
                          // Default sort
                          return new Date(b.receive_date || 0).getTime() - new Date(a.receive_date || 0).getTime();
                        })
                        .map((item, index) => (
                        <TableRow key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#F8F6F0]/'} hover:bg-purple-50/50 transition-colors border-b border-slate-100`}>
                          <TableCell className="px-6">
                            {item.receive_date ? (() => {
                              const d = new Date(item.receive_date.endsWith('Z') || item.receive_date.includes('+') ? item.receive_date : item.receive_date + 'Z');
                              return (
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700 text-sm">{d.toLocaleDateString('th-TH')}</span>
                                  <span className="text-xs text-slate-500">{d.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>
                                </div>
                              );
                            })() : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{item.po_no}</TableCell>
                          <TableCell className="font-bold text-purple-700">{item.control_no || '-'}</TableCell>
                          <TableCell>
                            <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                          </TableCell>
                          <TableCell className="font-medium text-purple-700">
                             {item.rm_code}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-600 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                            {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                {item.bottom_remark.split('/')[0].trim()}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                             <div className={`inline-flex items-center justify-center w-[140px] h-9 text-xs font-medium rounded-md shadow-sm ${getQcColor(item.qc_status || 'QUARANTINED')}`}>
                               {item.qc_status || 'QUARANTINED'}
                             </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredItems.filter(i => i.status !== 'PENDING_DELIVERY').length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500 bg-white">ไม่มีรายการรอตรวจ QC</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-6">
             <Card className="shadow-sm">
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4"><CardTitle className="text-base text-slate-700">{mainTab === 'rm' ? 'RM' : 'PM'} Readiness (เรียงตาม LOT การผลิต)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="text-sm table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[10%]">SKU / LOT</TableHead>
                        <TableHead>คิว{mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ'} (วันที่)</TableHead>
                        <TableHead>{mainTab === 'rm' ? 'RM' : 'PM'} Code</TableHead>
                        <TableHead>{mainTab === 'rm' ? 'RM' : 'PM'} Name</TableHead>
                        <TableHead>Required Qty</TableHead>
                        <TableHead className="w-[10%] p-0">
                          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                            <SelectTrigger className="h-full w-full border-0 bg-transparent shadow-none font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-none px-4 focus:ring-0">
                              <div className="flex items-center gap-2">
                                <span>Status</span>
                                <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-slate-400'}`} />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All Status</SelectItem>
                              <SelectItem value="PENDING_DELIVERY">Ordered</SelectItem>
                              <SelectItem value="RECEIVED">Received</SelectItem>
                              <SelectItem value="WAITING_QC">QC Pending</SelectItem>
                              <SelectItem value="QC_PASS">QC Passed</SelectItem>
                              <SelectItem value="READY">Released</SelectItem>
                              <SelectItem value="DELAYED">Delayed</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead 
                          className="w-[8%] cursor-pointer hover:bg-slate-50 transition-colors select-none group" 
                          onClick={() => setEtaSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                        >
                          <div className="flex items-center gap-1">
                            <span>ETA</span>
                            {etaSort === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : 
                             etaSort === 'desc' ? <ArrowDown className="w-3 h-3 text-[#D4AF37]" /> : 
                             <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        let targetDate: Date | null = null;
                        if (item.production_lots?.production_logs) {
                          const processName = mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ';
                          const targetLogs = item.production_lots.production_logs.filter((l: any) => l.processes?.process_name === processName);
                          if (targetLogs.length > 0) {
                            targetLogs.sort((a: any, b: any) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime());
                            targetDate = new Date(targetLogs[0].activity_date);
                          }
                        }
                        
                        const etaDate = item.eta_date ? new Date(item.eta_date) : null;
                        
                        let etaStatus: 'on-time' | 'at-risk' | 'delayed' | null = null;
                        if (targetDate && etaDate) {
                          const tDate = new Date(targetDate.toDateString()).getTime();
                          const eDate = new Date(etaDate.toDateString()).getTime();
                          const diffDays = (tDate - eDate) / (1000 * 60 * 60 * 24);
                          
                          if (diffDays < 0) {
                            etaStatus = 'delayed';
                          } else if (diffDays <= 3) {
                            etaStatus = 'at-risk';
                          } else {
                            etaStatus = 'on-time';
                          }
                        }

                        return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="text-sm font-bold text-[#D4AF37]">{item.production_lots?.products?.sku || '-'}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{item.production_lots?.lot_no || '-'}</div>
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">
                            {targetDate ? targetDate.toLocaleDateString('th-TH') : '-'}
                          </TableCell>
                          <TableCell>{item.rm_code}</TableCell>
                          <TableCell>
                            <div>{item.rm_name}</div>
                            {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                {item.bottom_remark.split('/')[0].trim()}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{item.quantity} {item.unit}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            {etaDate ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700">{etaDate.toLocaleDateString('th-TH')}</span>
                                {etaStatus === 'delayed' && (
                                  <div className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                    <AlertTriangle className="w-3 h-3" /> ไม่ทัน{mainTab === 'rm' ? 'ชั่ง' : 'บรรจุ'}
                                  </div>
                                )}
                                {etaStatus === 'at-risk' && (
                                  <div className="flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                    <AlertTriangle className="w-3 h-3" /> เสี่ยงล่าช้า
                                  </div>
                                )}
                                {etaStatus === 'on-time' && (
                                  <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                                    <CheckCircle2 className="w-3 h-3" /> ทันเวลา
                                  </div>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-5xl xl:max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4A4238]">ยืนยันข้อมูลใบสั่งซื้อ (Purchase Order)</DialogTitle>
          </DialogHeader>
          
          {extractedData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#D4AF37]/ p-4 rounded-lg border border-[#D4AF37]/30">
                <div><Label className="text-slate-500 text-xs">PO No.</Label><div className="font-bold text-[#D4AF37]">{extractedData.poNo || '-'}</div></div>
                <div><Label className="text-slate-500 text-xs">PO Date</Label><div className="font-semibold">{extractedData.poDate ? new Date(extractedData.poDate).toLocaleDateString('th-TH') : '-'}</div></div>
                <div className="col-span-2"><Label className="text-slate-500 text-xs">Supplier</Label><div className="font-semibold line-clamp-2 break-words text-wrap">{extractedData.supplier || '-'}</div></div>
                <div><Label className="text-slate-500 text-xs">กำหนดส่ง (ETA)</Label><div className="font-bold text-orange-600">{extractedData.etaDate ? new Date(extractedData.etaDate).toLocaleDateString('th-TH') : '-'}</div></div>
                <div><Label className="text-slate-500 text-xs">PR No.</Label><div className="font-semibold">{extractedData.prNo || '-'}</div></div>
                <div className="col-span-2"><Label className="text-slate-500 text-xs">Top Remark</Label><div className="font-semibold text-sm">{extractedData.topRemark || '-'}</div></div>
              </div>

              <div className="space-y-3 bg-[#F8F6F0] p-4 rounded-lg border">
                <Label className="font-semibold flex items-center gap-2"><Box className="w-4 h-4"/> จับคู่กับรหัสงาน (LOT) ในระบบ <span className="text-red-500">*</span></Label>
                <Select value={selectedLotId || ''} onValueChange={(val) => setSelectedLotId(val as string)}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="-- ค้นหาและเลือก LOT การผลิต --">
                      {selectedLotId === 'N/A' 
                        ? 'N/A - ไม่ระบุงาน' 
                        : selectedLotId && lotOptions.find(l => l.id === selectedLotId)
                        ? (() => {
                            const lot = lotOptions.find(l => l.id === selectedLotId);
                            return `${(lot.products as any)?.sku} - ${(lot.products as any)?.product_name} (LOT: ${lot.lot_no})`;
                          })()
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N/A">N/A - ไม่ระบุงาน</SelectItem>
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
                  <Table className="text-sm table-fixed w-full">
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
                          <TableCell>
                            <Input 
                              className="w-24 h-8 inline-block"
                              value={item.warehouse || ''} 
                              onChange={(e) => {
                                const newItems = [...extractedData.items];
                                newItems[idx] = { ...newItems[idx], warehouse: e.target.value };
                                setExtractedData({ ...extractedData, items: newItems });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input 
                              className="w-20 text-right h-8 font-bold inline-block"
                              value={item.quantity || ''} 
                              onChange={(e) => {
                                const newItems = [...extractedData.items];
                                newItems[idx] = { ...newItems[idx], quantity: e.target.value };
                                setExtractedData({ ...extractedData, items: newItems });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              className="w-16 h-8 inline-block"
                              value={item.unit || ''} 
                              onChange={(e) => {
                                const newItems = [...extractedData.items];
                                newItems[idx] = { ...newItems[idx], unit: e.target.value };
                                setExtractedData({ ...extractedData, items: newItems });
                              }}
                            />
                          </TableCell>
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

      {/* Customer Supplied PM Modal */}
      <Dialog open={isCmd2ModalOpen} onOpenChange={setIsCmd2ModalOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>รับเข้าบรรจุภัณฑ์ลูกค้า (CMD2)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCmd2Submit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อลูกค้า (Customer Name)</Label>
              <Input required value={cmd2Form.customerName} onChange={e => setCmd2Form({...cmd2Form, customerName: e.target.value})} placeholder="เช่น บริษัท เอบีซี จำกัด" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสบรรจุภัณฑ์ (PM Code)</Label>
                <Input value={cmd2Form.pmCode} onChange={e => setCmd2Form({...cmd2Form, pmCode: e.target.value})} placeholder="ปล่อยว่างเพื่อให้ระบบสร้างให้" />
              </div>
              <div className="space-y-2">
                <Label>ชื่อบรรจุภัณฑ์ (PM Name)</Label>
                <Input required value={cmd2Form.pmName} onChange={e => setCmd2Form({...cmd2Form, pmName: e.target.value})} placeholder="เช่น กล่องใส่ครีม 50g" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวน (ชิ้น)</Label>
                <Input required type="number" min="1" value={cmd2Form.quantity} onChange={e => setCmd2Form({...cmd2Form, quantity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>LOT งานผลิตอ้างอิง</Label>
                <Input value={cmd2Form.lotProduct} onChange={e => setCmd2Form({...cmd2Form, lotProduct: e.target.value})} placeholder="L.XXXX (ถ้ามี)" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>คลังสินค้า (Warehouse)</Label>
              <Input value={cmd2Form.warehouse} onChange={e => setCmd2Form({...cmd2Form, warehouse: e.target.value})} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCmd2ModalOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={uploading} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} รับเข้า PM ทันที
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Item Modal for Control No */}
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle>ยืนยันการรับเข้าคลังสินค้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
              <div className="grid grid-cols-3"><span className="text-slate-500">รหัสวัตถุดิบ/บรรจุภัณฑ์:</span><span className="col-span-2 font-medium">{receivingItem?.rm_code || '-'}</span></div>
              <div className="grid grid-cols-3"><span className="text-slate-500">ชื่อรายการ:</span><span className="col-span-2">{receivingItem?.rm_name || '-'}</span></div>
              <div className="grid grid-cols-3"><span className="text-slate-500">คลังสินค้า:</span><span className="col-span-2">{receivingItem?.warehouse || '-'}</span></div>
            </div>
            
            <div className="space-y-2">
              <Label>Control No.</Label>
              <Input 
                value={controlNoInput} 
                onChange={(e) => setControlNoInput(e.target.value.toUpperCase())}
                placeholder="เช่น R260815-001"
                disabled={isGeneratingControlNo}
              />
              <p className="text-xs text-slate-500">ระบบสร้างเลขอัตโนมัติให้แล้ว สามารถแก้ไขได้หากจำเป็น</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={confirmReceive} disabled={isGeneratingControlNo} className="bg-[#D4AF37] hover:bg-[#D4AF37]-hover text-white">
              {isGeneratingControlNo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              ยืนยันรับของ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Modal */}
      <Dialog open={isSplitModalOpen} onOpenChange={setIsSplitModalOpen}>
        <DialogContent className="sm:max-w-xl w-full">
          <DialogHeader>
            <DialogTitle>แยกงวดส่งของ (Split Delivery)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1">
              <div className="grid grid-cols-4"><span className="text-slate-500 text-right pr-2">PO No:</span><span className="col-span-3 font-medium">{splittingItem?.po_no || '-'}</span></div>
              <div className="grid grid-cols-4"><span className="text-slate-500 text-right pr-2">รหัส/ชื่อ:</span><span className="col-span-3">{splittingItem?.rm_code || '-'} / {splittingItem?.rm_name || '-'}</span></div>
              <div className="grid grid-cols-4"><span className="text-slate-500 text-right pr-2">จำนวนรวม:</span><span className="col-span-3 font-semibold text-purple-700">{splittingItem?.quantity} {splittingItem?.unit}</span></div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>แบ่งงวดส่งของ (รวมต้องเท่ากับ {splittingItem?.quantity})</Label>
                <Button variant="outline" size="sm" onClick={() => setSplitRows([...splitRows, { id: crypto.randomUUID(), quantity: '', eta_date: '', bottom_remark: `งวดที่ ${splitRows.length + 1}` }])}>
                  <Plus className="w-3 h-3 mr-1" /> เพิ่มงวด
                </Button>
              </div>
              
              {splitRows.map((row, index) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md bg-white relative">
                  {splitRows.length > 2 && (
                    <button onClick={() => setSplitRows(splitRows.filter(r => r.id !== row.id))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"><X className="w-3 h-3" /></button>
                  )}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">จำนวน ({splittingItem?.unit})</Label>
                    <Input type="number" value={row.quantity} onChange={e => {
                      const newRows = [...splitRows];
                      newRows[index].quantity = e.target.value;
                      setSplitRows(newRows);
                    }} />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">วันที่ ETA</Label>
                    <Input type="date" value={row.eta_date} onChange={e => {
                      const newRows = [...splitRows];
                      newRows[index].eta_date = e.target.value;
                      setSplitRows(newRows);
                    }} />
                  </div>
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">หมายเหตุ (เช่น งวดที่ 1)</Label>
                    <Input value={row.bottom_remark} onChange={e => {
                      const newRows = [...splitRows];
                      newRows[index].bottom_remark = e.target.value;
                      setSplitRows(newRows);
                    }} />
                  </div>
                </div>
              ))}
              
              <div className="text-right text-sm">
                <span className="text-slate-500">รวมทั้งหมด: </span>
                <span className={`font-semibold ${Math.abs(splitRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0) - (splittingItem?.quantity || 0)) > 0.001 ? 'text-red-600' : 'text-green-600'}`}>
                  {splitRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)} / {splittingItem?.quantity}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSplitModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSplitSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Scissors className="w-4 h-4 mr-2" />}
              ยืนยันการแยกงวด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลนำเข้า (Purchasing Edit)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">PO No.</Label>
              <Input value={editForm.po_no} onChange={e => setEditForm({...editForm, po_no: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Supplier</Label>
              <Input value={editForm.supplier} onChange={e => setEditForm({...editForm, supplier: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Code</Label>
              <Input value={editForm.rm_code} onChange={e => setEditForm({...editForm, rm_code: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input value={editForm.rm_name} onChange={e => setEditForm({...editForm, rm_name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Quantity</Label>
              <div className="col-span-3 flex gap-2">
                <Input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} className="w-full" />
                <Input value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} className="w-24 placeholder:text-slate-400" placeholder="Unit" />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">ETA Date</Label>
              <Input type="date" value={editForm.eta_date} onChange={e => setEditForm({...editForm, eta_date: e.target.value})} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleEditSubmit} className="bg-[#D4AF37] hover:bg-[#B3932F] text-white">บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
