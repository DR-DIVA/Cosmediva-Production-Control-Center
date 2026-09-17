"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { 
  Upload, FileText, CheckCircle2, Loader2, Search, Download, Paperclip, 
  LayoutDashboard, ShoppingCart, Box, Activity, Calendar, Trash2, Edit, 
  Truck, Package, AlertTriangle, Filter, ArrowUp, ArrowDown, ArrowUpDown, 
  Scissors, Plus, X, TrendingUp, Layers, RefreshCw, ShieldCheck, CheckSquare, 
  Sparkles, Clock, ArrowUpRight, Printer, FileSpreadsheet, History
} from 'lucide-react';
import { QuarantineTagModal, QuarantineTagData } from "@/components/warehouse/QuarantineTagModal";
import { 
  DELAY_CATEGORIES, 
  formatDelayRemark, 
  parseDelayInfo 
} from '@/lib/delayTracking';

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
  remark?: string | null;
  received_qty?: number | null;
  released_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  production_lots?: { lot_no: string; sku_id: string; products?: { sku: string }; production_logs?: { activity_date: string; processes?: { process_name: string } }[] };
};

function ColumnSearchInput({
  title,
  placeholder,
  value,
  onChange,
  onClear,
  sortElement
}: {
  title: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  sortElement?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 w-full py-1">
      <div className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-700">
        <span className="truncate" title={title}>{title}</span>
        {sortElement}
      </div>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder || `ค้นหา...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 text-[11px] w-full bg-white border-slate-200 pl-1.5 pr-4 py-0 font-normal placeholder:text-slate-400 focus:bg-white shadow-none"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            title="ล้างค่า"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Pre-configured BOM & Customer packaging catalog (includes SMART.MM BOMs like JHD-301)
const DEFAULT_CMD2_PRESETS = [
  // JHD-301 - น้ำตบ (BOM from SMART.MM)
  { code: 'CMD2-JHD301-K1', name: 'ขวดปิแอร์สีชา 100 ML', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD301-O1', name: 'ฝาขวดปิแอร์สีดำ', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD301-N1', name: 'จุกในพลาสติกใส', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD301-B1', name: 'กล่องสกรีน NAWANNA LOVELY ESSENCE 100 ML', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD301-BL1', name: 'กล่องสกรีน NAWANNA LOVELY ESSENCE 100 ML (พิมพ์ Lot ที่กล่อง)', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD301-BL9', name: 'กล่องสกรีน NAWANNA LOVELY ESSENCE 100 ML (พิมพ์Lot 009/26)', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD301-BL10', name: 'กล่องสกรีน NAWANNA LOVELY ESSENCE 100 ML (พิมพ์Lot 010/26)', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD301-BL11', name: 'กล่องสกรีน NAWANNA LOVELY ESSENCE 100 ML (พิมพ์Lot 011/26)', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD1-SH300MM-T3', name: 'ชริ้งค์แบบม้วน POF หน้ากว้างขนาด 300มม. (12MIC)', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },
  { code: 'CMD2-JHD015-C1', name: 'ลังลูกฟูกไม่สกรีน ขนาด 46.5 x 46.5 x 30.5 cm.', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-301' },

  // JHD-318
  { code: 'CMD2-JHD318-O2', name: 'ฝาปิดกระปุก NT (โมลใหม่) 100 G. สีดำ', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-318' },
  { code: 'CMD2-JHD318-JL9', name: 'กระปุก NT (โมลใหม่) สีน้ำตาลแดง สกรีน NAWANNA DOSE SEED BODY MAHAD AURA GLOW CREAM 100 G.(พิมพ์ LOT 009/26)', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-318' },

  // JHD-309
  { code: 'CMD2-JHD309-J1', name: 'กระปุก', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-309' },
  { code: 'CMD2-JHD309-O2', name: 'ฝาปิดกระปุกพลาสติกสีดำปั๊มโลโก้ NAWANNA 15 G.', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-309' },
  { code: 'CMD2-JHD309-N2', name: 'ลิ้นในกระปุกพลาสติกสีขาว 15 G.(ปั้มโลโก้)', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-309' },

  // JHD-317
  { code: 'CMD2-JHD317-O1', name: 'ฝาครอบแคปซูลสีดำ', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-317' },
  { code: 'CMD2-JHD317-K1', name: 'ขวดแคปซูลสีชา สกรีน NAWANNA DOSE SEED BODY MAHAD AURA SERUM 30 ML', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-317' },

  // JHD-088
  { code: 'CMD2-JHD088-K2', name: 'ขวดพลาสติกสีฟ้าใส สกรีน MY BO FACIAL WHITENING ESSENSE 60 ML.', supplier: 'คุณนัตตี้ (VRP)', unit: 'pcs', warehouse: 'MMPM', sku: 'JHD-088' },

  // PAMH-008
  { code: 'CMD2-PAMH008-B3', name: 'กล่องแบบ KITTY สกรีน AM HERB TRIPLEGUARD AQUA SUN SERUM SPF 50+ PA++++ 30 ML', supplier: 'บ.ชบา เอลลิแกนซ์', unit: 'pcs', warehouse: 'MMPM', sku: 'PAMH-008' },
  { code: 'CMD2-PAMH008-N4', name: 'จุกในปากแหลมสีขาว', supplier: 'บ.ชบา เอลลิแกนซ์', unit: 'pcs', warehouse: 'MMPM', sku: 'PAMH-008' },

  // OFT-001
  { code: 'CMD2-OFT001-L1', name: 'หลอดพลาสติกสีขาว สกรีน SIORA HYA-INSTANT ABSORB HAND CREAM 30 G', supplier: 'คุณฝน', unit: 'pcs', warehouse: 'MMPM', sku: 'OFT-001' },
];

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
  const [etaSort, setEtaSort] = useState<'asc' | 'desc' | null>(null);

  // Column search states for Purchasing View
  const [puSearch, setPuSearch] = useState({
    po: '',
    supplier: '',
    po_date: '',
    eta: '',
    code: '',
    name: '',
    qty: ''
  });

  // Column search states for Warehouse View
  const [whSearch, setWhSearch] = useState({
    eta: '',
    po: '',
    supplier: '',
    sku_lot: '',
    code: '',
    name: '',
    qty: '',
    warehouse: '',
    receive_date: ''
  });

  // Column search states for QC View
  const [qcSearch, setQcSearch] = useState({
    receive_date: '',
    po: '',
    control_no: '',
    sku_lot: '',
    code: '',
    name: ''
  });
  const [qcReceiveDateSort, setQcReceiveDateSort] = useState<'asc' | 'desc' | null>(null);
  const [qcControlNoSort, setQcControlNoSort] = useState<'asc' | 'desc' | null>(null);
  const [qcStatusSearch, setQcStatusSearch] = useState('ALL');

  // Column search states for Planning View
  const [planSearch, setPlanSearch] = useState({
    sku_lot: '',
    queue_date: '',
    po: '',
    control_no: '',
    code: '',
    name: '',
    qty: '',
    eta: '',
    receive_date: '',
    qc_date: ''
  });

  const clearPuSearch = () => setPuSearch({ po: '', supplier: '', po_date: '', eta: '', code: '', name: '', qty: '' });
  const clearWhSearch = () => setWhSearch({ eta: '', po: '', supplier: '', sku_lot: '', code: '', name: '', qty: '', warehouse: '', receive_date: '' });
  const clearQcSearch = () => setQcSearch({ receive_date: '', po: '', control_no: '', sku_lot: '', code: '', name: '' });
  const clearPlanSearch = () => setPlanSearch({ sku_lot: '', queue_date: '', po: '', control_no: '', code: '', name: '', qty: '', eta: '', receive_date: '', qc_date: '' });

  const puActiveCount = Object.values(puSearch).filter(Boolean).length;
  const whActiveCount = Object.values(whSearch).filter(Boolean).length;
  const qcActiveCount = Object.values(qcSearch).filter(Boolean).length;
  const planActiveCount = Object.values(planSearch).filter(Boolean).length;

  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [mainTab, setMainTab] = useState<'rm'|'pm'>('rm');
  const [activeViewTab, setActiveViewTab] = useState('purchasing');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RMItem | null>(null);
  const [editForm, setEditForm] = useState({ 
    po_no: '', 
    supplier: '', 
    rm_code: '', 
    rm_name: '', 
    warehouse: '',
    quantity: 0, 
    unit: '', 
    eta_date: '',
    edit_reason: '',
    delay_category: 'SUPPLIER_PROD'
  });

  // Split Modal State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splittingItem, setSplittingItem] = useState<RMItem | null>(null);
  const [splitRows, setSplitRows] = useState<{ id: string, quantity: number | string, eta_date: string, bottom_remark: string }[]>([]);

  // Receive Modal State (Editable for ALL fields + Edit reason note)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingItem, setReceivingItem] = useState<RMItem | null>(null);
  const [receiveRmCode, setReceiveRmCode] = useState('');
  const [receiveRmName, setReceiveRmName] = useState('');
  const [receiveWarehouse, setReceiveWarehouse] = useState('MMPM');
  const [receivePoNo, setReceivePoNo] = useState('');
  const [receiveSupplier, setReceiveSupplier] = useState('');
  const [receivePoQty, setReceivePoQty] = useState('');
  const [receiveUnit, setReceiveUnit] = useState('pcs');
  const [receiveDateInput, setReceiveDateInput] = useState('');
  const [controlNoInput, setControlNoInput] = useState('');
  const [receivedQtyInput, setReceivedQtyInput] = useState('');
  const [receiveRemarkInput, setReceiveRemarkInput] = useState('');
  const [receiveEditReason, setReceiveEditReason] = useState('');
  const [isGeneratingControlNo, setIsGeneratingControlNo] = useState(false);

  // Quarantine Tag State (100x80mm)
  const [isQuarantineTagOpen, setIsQuarantineTagOpen] = useState(false);
  const [quarantineTagData, setQuarantineTagData] = useState<QuarantineTagData | null>(null);

  // Continuous History & Report States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyStageFilter, setHistoryStageFilter] = useState<'ALL' | 'PURCHASING' | 'WAREHOUSE' | 'QC' | 'PLANNING'>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Receive Modal Additional Packaging Fields
  const [receivePackageType, setReceivePackageType] = useState('ลัง');
  const [receiveCustomPackageType, setReceiveCustomPackageType] = useState('');
  const [receiveBoxCount, setReceiveBoxCount] = useState('1');
  const [receiveQtyPerBox, setReceiveQtyPerBox] = useState('');
  const [receiveOddBoxCount, setReceiveOddBoxCount] = useState('0');
  const [receiveOddQtyPerBox, setReceiveOddQtyPerBox] = useState('');
  const [receiveMfgLot, setReceiveMfgLot] = useState('-');

  // Customer Supplied PM State & Quick Search Selector
  const [isCmd2ModalOpen, setIsCmd2ModalOpen] = useState(false);
  const [cmd2Form, setCmd2Form] = useState({ 
    pmCode: '', 
    pmName: '', 
    quantity: '', 
    customerName: '', 
    lotProduct: '', 
    warehouse: 'MMPM', 
    controlNo: '',
    packageType: 'ลัง',
    customPackageType: '',
    boxCount: '1',
    qtyPerBox: '',
    oddBoxCount: '0',
    oddQtyPerBox: '',
    mfgLot: '-'
  });
  const [cmd2SearchQuery, setCmd2SearchQuery] = useState('');
  const [isCmd2SearchOpen, setIsCmd2SearchOpen] = useState(false);
  const cmd2QtyInputRef = useRef<HTMLInputElement>(null);

  // Customer Supplied RM (R4) State & Quick Search Selector
  const [isR4ModalOpen, setIsR4ModalOpen] = useState(false);
  const [r4Form, setR4Form] = useState({ 
    rmCode: '', 
    rmName: '', 
    quantity: '', 
    unit: 'KG', 
    customerName: '', 
    lotProduct: '', 
    warehouse: 'MMRM', 
    controlNo: '',
    packageType: 'ถัง',
    customPackageType: '',
    boxCount: '1',
    qtyPerBox: '',
    oddBoxCount: '0',
    oddQtyPerBox: '',
    mfgLot: '-'
  });
  const [r4SearchQuery, setR4SearchQuery] = useState('');
  const [isR4SearchOpen, setIsR4SearchOpen] = useState(false);
  const r4QtyInputRef = useRef<HTMLInputElement>(null);

  const handleCmd2QuantityChange = (qtyStr: string) => {
    const q = parseFloat(qtyStr) || 0;
    const b = parseInt(cmd2Form.boxCount, 10) || 1;
    const oddB = parseInt(cmd2Form.oddBoxCount, 10) || 0;
    let perBox = cmd2Form.qtyPerBox;
    if (oddB === 0) {
      perBox = q > 0 && b > 0 ? Math.ceil(q / b).toString() : '';
    }
    setCmd2Form(prev => ({ ...prev, quantity: qtyStr, qtyPerBox: perBox }));
  };

  const handleCmd2BoxCountChange = (boxStr: string) => {
    const b = parseInt(boxStr, 10) || 1;
    const q = parseFloat(cmd2Form.quantity) || 0;
    const oddB = parseInt(cmd2Form.oddBoxCount, 10) || 0;
    let perBox = cmd2Form.qtyPerBox;
    if (oddB === 0) {
      perBox = q > 0 && b > 0 ? Math.ceil(q / b).toString() : '';
    }
    setCmd2Form(prev => ({ ...prev, boxCount: boxStr, qtyPerBox: perBox }));
  };

  const handleCmd2AutoSplitRemainder = () => {
    const q = parseFloat(cmd2Form.quantity) || 0;
    const pBox = parseFloat(cmd2Form.qtyPerBox) || 0;
    if (q <= 0 || pBox <= 0) {
      toast.error('กรุณาระบุจำนวนรับเข้าทั้งหมด และยอดต่อภาชนะเต็มก่อน');
      return;
    }
    const full = Math.floor(q / pBox);
    const rem = q % pBox;
    if (rem > 0) {
      setCmd2Form(prev => ({
        ...prev,
        boxCount: full > 0 ? full.toString() : '1',
        oddBoxCount: '1',
        oddQtyPerBox: rem.toString()
      }));
      toast.success(`คำนวณแบ่งเศษสำเร็จ: ${full} เต็ม + 1 เศษ (${rem} ชิ้น)`);
    } else {
      setCmd2Form(prev => ({
        ...prev,
        boxCount: full.toString(),
        oddBoxCount: '0',
        oddQtyPerBox: '0'
      }));
      toast.success(`ลงตัวพอดี: ${full} เต็ม (ไม่มีเศษ)`);
    }
  };

  const handleR4QuantityChange = (qtyStr: string) => {
    const q = parseFloat(qtyStr) || 0;
    const b = parseInt(r4Form.boxCount, 10) || 1;
    const oddB = parseInt(r4Form.oddBoxCount, 10) || 0;
    let perBox = r4Form.qtyPerBox;
    if (oddB === 0) {
      perBox = q > 0 && b > 0 ? Math.ceil(q / b).toString() : '';
    }
    setR4Form(prev => ({ ...prev, quantity: qtyStr, qtyPerBox: perBox }));
  };

  const handleR4BoxCountChange = (boxStr: string) => {
    const b = parseInt(boxStr, 10) || 1;
    const q = parseFloat(r4Form.quantity) || 0;
    const oddB = parseInt(r4Form.oddBoxCount, 10) || 0;
    let perBox = r4Form.qtyPerBox;
    if (oddB === 0) {
      perBox = q > 0 && b > 0 ? Math.ceil(q / b).toString() : '';
    }
    setR4Form(prev => ({ ...prev, boxCount: boxStr, qtyPerBox: perBox }));
  };

  const handleR4AutoSplitRemainder = () => {
    const q = parseFloat(r4Form.quantity) || 0;
    const pBox = parseFloat(r4Form.qtyPerBox) || 0;
    if (q <= 0 || pBox <= 0) {
      toast.error('กรุณาระบุจำนวนรับเข้าทั้งหมด และยอดต่อภาชนะเต็มก่อน');
      return;
    }
    const full = Math.floor(q / pBox);
    const rem = parseFloat((q - full * pBox).toFixed(3));
    if (rem > 0) {
      setR4Form(prev => ({
        ...prev,
        boxCount: full > 0 ? full.toString() : '1',
        oddBoxCount: '1',
        oddQtyPerBox: rem.toString()
      }));
      toast.success(`คำนวณแบ่งเศษสำเร็จ: ${full} เต็ม + 1 เศษ (${rem} ${r4Form.unit || 'KG'})`);
    } else {
      setR4Form(prev => ({
        ...prev,
        boxCount: full.toString(),
        oddBoxCount: '0',
        oddQtyPerBox: '0'
      }));
      toast.success(`ลงตัวพอดี: ${full} เต็ม (ไม่มีเศษ)`);
    }
  };

  const handleReceiveQuantityChange = (qtyStr: string) => {
    setReceivedQtyInput(qtyStr);
    const q = parseFloat(qtyStr) || 0;
    const b = parseInt(receiveBoxCount, 10) || 1;
    const oddB = parseInt(receiveOddBoxCount, 10) || 0;
    if (oddB === 0 && q > 0 && b > 0) {
      setReceiveQtyPerBox(Math.ceil(q / b).toString());
    }
  };

  const handleReceiveBoxCountChange = (boxStr: string) => {
    setReceiveBoxCount(boxStr);
    const b = parseInt(boxStr, 10) || 1;
    const q = parseFloat(receivedQtyInput) || parseFloat(receivePoQty) || 0;
    const oddB = parseInt(receiveOddBoxCount, 10) || 0;
    if (oddB === 0 && q > 0 && b > 0) {
      setReceiveQtyPerBox(Math.ceil(q / b).toString());
    }
  };

  const handleReceiveAutoSplitRemainder = () => {
    const q = parseFloat(receivedQtyInput) || parseFloat(receivePoQty) || 0;
    const pBox = parseFloat(receiveQtyPerBox) || 0;
    if (q <= 0 || pBox <= 0) {
      toast.error('กรุณาระบุยอดรับเข้าจริง และยอดต่อภาชนะเต็มก่อน');
      return;
    }
    const full = Math.floor(q / pBox);
    const rem = parseFloat((q - full * pBox).toFixed(3));
    if (rem > 0) {
      setReceiveBoxCount(full > 0 ? full.toString() : '1');
      setReceiveOddBoxCount('1');
      setReceiveOddQtyPerBox(rem.toString());
      toast.success(`คำนวณแบ่งเศษสำเร็จ: ${full} เต็ม + 1 เศษ (${rem} ${receiveUnit})`);
    } else {
      setReceiveBoxCount(full.toString());
      setReceiveOddBoxCount('0');
      setReceiveOddQtyPerBox('0');
      toast.success(`ลงตัวพอดี: ${full} เต็ม (ไม่มีเศษ)`);
    }
  };

  const openQuarantineTagForItem = (item: RMItem) => {
    let bCount = 1;
    let perBox = item.received_qty != null ? item.received_qty : item.quantity;
    let lot = '-';
    let pkgType = 'ลัง';
    let oddBCount = 0;
    let oddPBox = 0;

    const text = `${item.remark || ''} ${item.bottom_remark || ''}`;
    
    // Parse package type and full boxes, e.g. "7 ลัง x 1300" or "8 กล่อง x 1000"
    const boxMatch = text.match(/(\d+)\s*(ลัง|กล่อง|ถัง|ถุง|หีบ|ห่อ|พาเลท|กระป๋อง|ม้วน|pack|box)\s*[xX*]\s*(\d+(?:\.\d+)?)/i);
    if (boxMatch) {
      bCount = parseInt(boxMatch[1], 10) || 1;
      pkgType = boxMatch[2];
      perBox = parseFloat(boxMatch[3]) || perBox;
    }

    // Parse odd boxes, e.g. "+ 1 ลังเศษ x 1452" or "+ 1 กล่องเศษ x 500"
    const oddMatch = text.match(/\+\s*(\d+)\s*(?:[^\sxX*]+)?เศษ\s*[xX*]\s*(\d+(?:\.\d+)?)/i);
    if (oddMatch) {
      oddBCount = parseInt(oddMatch[1], 10) || 0;
      oddPBox = parseFloat(oddMatch[2]) || 0;
    }

    const lotMatch = text.match(/Lot[:.\s]*([A-Za-z0-9\-_./]+)/i);
    if (lotMatch) {
      lot = lotMatch[1];
    }

    setQuarantineTagData({
      name: item.rm_name,
      code: item.rm_code,
      controlNo: item.control_no || '',
      supplier: item.supplier || '',
      totalQty: item.received_qty != null ? item.received_qty : item.quantity,
      unit: item.unit || (item.rm_code.startsWith('R4') ? 'KG' : 'ชิ้น'),
      boxCount: bCount,
      qtyPerBox: perBox,
      packageType: pkgType,
      oddBoxCount: oddBCount,
      oddQtyPerBox: oddPBox,
      mfgLot: lot,
      receivedBy: currentUser || 'คลังสินค้า',
      receivedDate: item.receive_date || new Date().toISOString(),
      docRev: item.rm_code?.startsWith('R') ? 'RM-WT-001A Rev.02' : 'PM-WT-001A Rev.02'
    });
    setIsQuarantineTagOpen(true);
  };

  // Product SKUs for intelligent code-to-SKU mapping
  const [productSkus, setProductSkus] = useState<string[]>([]);

  const extractSkuFromCode = (code?: string, knownSkus: string[] = productSkus): string | null => {
    if (!code) return null;
    const cleanCode = code.toUpperCase().trim();
    
    // 1. Try matching known SKUs directly (longest first)
    if (knownSkus && knownSkus.length > 0) {
      const cAlnum = cleanCode.replace(/[^A-Z0-9]/g, '');
      for (const s of knownSkus) {
        const sAlnum = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (sAlnum && cAlnum.includes(sAlnum)) {
          return s;
        }
      }
    }

    // 2. Standard pattern: CMD2-<SKU_PART>-<SUFFIX> or R4-<SKU_PART>-...
    // e.g. CMD2-JHD318-O2 -> JHD-318, CMD2-OFT001-L1 -> OFT-001
    const parts = cleanCode.split('-');
    if (parts.length >= 2) {
      const middle = parts[1];
      const m = middle.match(/^([A-Z]+)(\d+)$/);
      if (m) {
        return `${m[1]}-${m[2]}`;
      }
      return middle;
    }

    return null;
  };

  const getDisplaySku = (item: RMItem): string => {
    if (item.production_lots?.products?.sku) {
      return item.production_lots.products.sku;
    }
    return extractSkuFromCode(item.rm_code, productSkus) || '-';
  };

  const getDisplayLot = (item: RMItem): string => {
    return item.production_lots?.lot_no || item.lot_product || '-';
  };

  // Combined master catalog of packaging parts (presets + DB)
  const cmd2PartOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; supplier: string; unit: string; warehouse: string; sku?: string }>();

    DEFAULT_CMD2_PRESETS.forEach(p => {
      map.set(`${p.code.toUpperCase()}|${p.name.trim()}`, p);
    });

    items.forEach(it => {
      const code = (it.rm_code || '').trim();
      const name = (it.rm_name || '').trim();
      const sup = (it.supplier || '').trim();
      if (!code && !name) return;

      const isPm = code.toUpperCase().startsWith('CMD') || it.warehouse === 'MMPM' || it.warehouse === 'WH-PM';
      if (isPm) {
        const key = `${code.toUpperCase()}|${name}`;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            code,
            name,
            supplier: sup,
            unit: it.unit || 'pcs',
            warehouse: it.warehouse || 'MMPM',
            sku: extractSkuFromCode(code) || undefined
          });
        } else if (!existing.supplier && sup) {
          existing.supplier = sup;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [items, productSkus]);

  const filteredCmd2Options = useMemo(() => {
    const q = cmd2SearchQuery.trim().toLowerCase();
    if (!q) return cmd2PartOptions;
    return cmd2PartOptions.filter(opt =>
      opt.code.toLowerCase().includes(q) ||
      opt.name.toLowerCase().includes(q) ||
      (opt.supplier && opt.supplier.toLowerCase().includes(q)) ||
      (opt.sku && opt.sku.toLowerCase().includes(q))
    );
  }, [cmd2PartOptions, cmd2SearchQuery]);

  // Combined master catalog of RM parts
  const r4PartOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; supplier: string; unit: string; warehouse: string }>();

    items.forEach(it => {
      const code = (it.rm_code || '').trim();
      const name = (it.rm_name || '').trim();
      const sup = (it.supplier || '').trim();
      if (!code && !name) return;

      const isRm = code.toUpperCase().startsWith('R4') || it.warehouse === 'MMRM' || it.warehouse === 'WH-RM';
      if (isRm) {
        const key = `${code.toUpperCase()}|${name}`;
        if (!map.has(key)) {
          map.set(key, {
            code,
            name,
            supplier: sup,
            unit: it.unit || 'KG',
            warehouse: it.warehouse || 'MMRM',
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [items]);

  const filteredR4Options = useMemo(() => {
    const q = r4SearchQuery.trim().toLowerCase();
    if (!q) return r4PartOptions;
    return r4PartOptions.filter(opt =>
      opt.code.toLowerCase().includes(q) ||
      opt.name.toLowerCase().includes(q) ||
      (opt.supplier && opt.supplier.toLowerCase().includes(q))
    );
  }, [r4PartOptions, r4SearchQuery]);

  const uniqueCustomerList = useMemo(() => {
    const set = new Set<string>();
    cmd2PartOptions.forEach(p => p.supplier && set.add(p.supplier.trim()));
    r4PartOptions.forEach(p => p.supplier && set.add(p.supplier.trim()));
    items.forEach(it => it.supplier && set.add(it.supplier.trim()));
    return Array.from(set).filter(Boolean).sort();
  }, [cmd2PartOptions, r4PartOptions, items]);

  const handleSelectCmd2Part = (opt: { code: string; name: string; supplier: string; unit: string; warehouse: string }) => {
    setCmd2Form(prev => ({
      ...prev,
      customerName: opt.supplier || prev.customerName,
      pmCode: opt.code,
      pmName: opt.name,
      warehouse: opt.warehouse || 'MMPM',
    }));
    setCmd2SearchQuery(`${opt.code} - ${opt.name}`);
    setIsCmd2SearchOpen(false);
    toast.success(`เลือก ${opt.code} สำเร็จ! ดึงข้อมูลพาร์ทให้อัตโนมัติ`);
    setTimeout(() => {
      cmd2QtyInputRef.current?.focus();
    }, 100);
  };

  const handleSelectR4Part = (opt: { code: string; name: string; supplier: string; unit: string; warehouse: string }) => {
    setR4Form(prev => ({
      ...prev,
      customerName: opt.supplier || prev.customerName,
      rmCode: opt.code,
      rmName: opt.name,
      unit: opt.unit || 'KG',
      warehouse: opt.warehouse || 'MMRM',
    }));
    setR4SearchQuery(`${opt.code} - ${opt.name}`);
    setIsR4SearchOpen(false);
    toast.success(`เลือก ${opt.code} สำเร็จ! ดึงข้อมูลวัตถุดิบให้อัตโนมัติ`);
    setTimeout(() => {
      r4QtyInputRef.current?.focus();
    }, 100);
  };

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
    supabase.from('products').select('sku').then(({ data }) => {
      if (data) {
        setProductSkus(data.map((p: any) => p.sku).filter(Boolean).sort((a: string, b: string) => b.length - a.length));
      }
    });
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
      if (!confirm('ยืนยันยกเลิกการรับเข้าและเปลี่ยนสถานะกลับเป็น "Ordered รอรับเข้า" หรือไม่? (ข้อมูลวันที่รับเข้าและ Control No. จะถูกล้าง)')) {
        return;
      }
      updates.receive_date = null;
      updates.control_no = null;
      updates.received_qty = null;
      updates.qc_status = null;
    } else if (newStatus === 'WAITING_QC') {
      updates.qc_status = 'QUARANTINED';
    }
    
    const { error } = await supabase
      .from('production_lot_rms')
      .update(updates)
      .eq('id', item.id);

    if (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    } else {
      if (newStatus === 'WAITING_QC') {
        toast.success('แจ้งสุ่ม QC เรียบร้อยแล้ว (สถานะ: Quarantined แจ้งสุ่ม)');
      } else if (newStatus === 'PENDING_DELIVERY') {
        toast.success('เปลี่ยนสถานะเป็น Ordered รอรับเข้า เรียบร้อยแล้ว');
      } else {
        toast.success('อัปเดตสถานะเรียบร้อยแล้ว');
      }
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

  const isReceiveDataModified = () => {
    if (!receivingItem) return false;
    const origCode = receivingItem.rm_code || '';
    const origName = receivingItem.rm_name || '';
    const origWh = receivingItem.warehouse || '';
    const origPo = receivingItem.po_no || '';
    const origSup = receivingItem.supplier || '';
    const origQty = receivingItem.quantity != null ? String(receivingItem.quantity) : '';
    const origUnit = receivingItem.unit || '';
    const origControl = receivingItem.control_no || '';
    const origRecQty = receivingItem.received_qty != null ? String(receivingItem.received_qty) : '';

    const codeChanged = receiveRmCode.trim() !== origCode.trim();
    const nameChanged = receiveRmName.trim() !== origName.trim();
    const whChanged = receiveWarehouse.trim() !== origWh.trim();
    const poChanged = receivePoNo.trim() !== origPo.trim();
    const supChanged = receiveSupplier.trim() !== origSup.trim();
    const qtyChanged = receivePoQty.trim() !== origQty.trim();
    const unitChanged = receiveUnit.trim() !== origUnit.trim();
    const controlChanged = origControl ? controlNoInput.trim() !== origControl.trim() : false;
    const recQtyChanged = origRecQty ? receivedQtyInput.trim() !== origRecQty.trim() : false;

    return codeChanged || nameChanged || whChanged || poChanged || supChanged || qtyChanged || unitChanged || controlChanged || recQtyChanged;
  };

  const openReceiveModal = async (item: RMItem) => {
    setReceivingItem(item);
    setIsReceiveModalOpen(true);
    setReceiveRmCode(item.rm_code || '');
    setReceiveRmName(item.rm_name || '');
    setReceiveWarehouse(item.warehouse || 'MMPM');
    setReceivePoNo(item.po_no || '');
    setReceiveSupplier(item.supplier || '');
    setReceivePoQty(item.quantity != null ? item.quantity.toString() : '');
    setReceiveUnit(item.unit || 'pcs');
    setReceiveDateInput(
      item.receive_date 
        ? new Date(item.receive_date).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0]
    );
    setReceivedQtyInput(
      item.received_qty != null 
        ? item.received_qty.toString() 
        : (item.quantity != null ? item.quantity.toString() : '')
    );
    setReceiveRemarkInput(item.remark || '');
    setReceiveEditReason('');

    // Extract packaging breakdown from remark or bottom_remark if any
    let bCount = '1';
    let pBox = '';
    let lot = '-';
    let pType = (item.rm_code?.startsWith('R') || item.warehouse === 'MMRM') ? 'ถัง' : 'ลัง';
    let customPType = '';
    let oddBCount = '0';
    let oddPBox = '';

    const text = `${item.remark || ''} ${item.bottom_remark || ''}`;
    if (text) {
      const bMatch = text.match(/(\d+)\s*(ลัง|กล่อง|ถัง|ถุง|หีบ|ห่อ|พาเลท|กระป๋อง|ม้วน|pack|box|[^\sxX*]+)?\s*[xX*]\s*(\d+(?:\.\d+)?)/i);
      if (bMatch) {
        bCount = bMatch[1];
        if (bMatch[2]) {
          const matchedType = bMatch[2];
          const stdTypes = ['ลัง', 'กล่อง', 'ถัง', 'ถุง', 'หีบ', 'ห่อ', 'พาเลท', 'กระป๋อง', 'ม้วน'];
          if (stdTypes.includes(matchedType)) {
            pType = matchedType;
          } else {
            pType = 'อื่นๆ';
            customPType = matchedType;
          }
        }
        pBox = bMatch[3];
      }

      const oddMatch = text.match(/\+\s*(\d+)\s*(?:[^\sxX*]+)?เศษ\s*[xX*]\s*(\d+(?:\.\d+)?)/i);
      if (oddMatch) {
        oddBCount = oddMatch[1];
        oddPBox = oddMatch[2];
      }

      const lMatch = text.match(/Lot[:.\s]*([A-Za-z0-9\-_./]+)/i);
      if (lMatch) {
        lot = lMatch[1];
      }
    }

    const curQty = item.received_qty != null ? item.received_qty : item.quantity;
    if (!pBox && curQty) {
      pBox = Math.ceil(curQty / (parseInt(bCount, 10) || 1)).toString();
    }
    setReceivePackageType(pType);
    setReceiveCustomPackageType(customPType);
    setReceiveBoxCount(bCount);
    setReceiveQtyPerBox(pBox);
    setReceiveOddBoxCount(oddBCount);
    setReceiveOddQtyPerBox(oddPBox);
    setReceiveMfgLot(lot);

    if (item.control_no) {
      setControlNoInput(item.control_no);
      setIsGeneratingControlNo(false);
      return;
    }

    setIsGeneratingControlNo(true);
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
        .like('control_no', searchPattern);

      let nextNum = 1;
      if (!error && data && data.length > 0) {
        const nums = data
          .map((d: any) => {
            if (!d.control_no) return 0;
            const parts = d.control_no.split('-');
            return parts.length === 2 ? parseInt(parts[1], 10) : 0;
          })
          .filter((n: number) => !isNaN(n) && n > 0);
        if (nums.length > 0) {
          nextNum = Math.max(...nums) + 1;
        }
      }
      setControlNoInput(`${prefix}${dateString}-${String(nextNum).padStart(2, '0')}`);
    } catch (error) {
      console.error("Error generating control no:", error);
    } finally {
      setIsGeneratingControlNo(false);
    }
  };

  const confirmReceive = async (andPrintTag: boolean = false) => {
    if (!receivingItem) return;

    if (!receiveRmCode.trim()) {
      toast.error('กรุณาระบุรหัสวัตถุดิบ/บรรจุภัณฑ์');
      return;
    }
    if (!receiveRmName.trim()) {
      toast.error('กรุณาระบุชื่อรายการ');
      return;
    }
    if (!controlNoInput.trim()) {
      toast.error('กรุณาระบุ Control No.');
      return;
    }

    const parsedQty = parseFloat(receivedQtyInput);
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error('กรุณาระบุยอดรับเข้าจริงที่ถูกต้อง (ตัวเลข)');
      return;
    }

    const isModified = isReceiveDataModified();
    const isAlreadyReceived = receivingItem.status === 'RECEIVED' || receivingItem.status === 'WAITING_QC';

    if ((isModified || isAlreadyReceived) && !receiveEditReason.trim()) {
      toast.error('กรุณาระบุ "หมายเหตุการแก้ไขข้อมูล" เพื่อบันทึกประวัติการปรับปรุง');
      return;
    }

    // Check for duplicate control no (excluding self)
    const { data: duplicateData } = await supabase
      .from('production_lot_rms')
      .select('id')
      .eq('control_no', controlNoInput.trim())
      .neq('id', receivingItem.id)
      .limit(1);

    if (duplicateData && duplicateData.length > 0) {
      toast.error('Control No. นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น');
      return;
    }

    const nowIso = new Date().toISOString();
    const formattedReceiveDate = receiveDateInput 
      ? new Date(`${receiveDateInput}T12:00:00Z`).toISOString() 
      : (receivingItem.receive_date || nowIso);

    const bCount = parseInt(receiveBoxCount, 10) || 1;
    const pBox = parseFloat(receiveQtyPerBox) || Math.ceil(parsedQty / bCount);
    const oddBCount = parseInt(receiveOddBoxCount, 10) || 0;
    const oddPBox = parseFloat(receiveOddQtyPerBox) || 0;
    const effectivePkg = receivePackageType === 'อื่นๆ'
      ? (receiveCustomPackageType.trim() || 'ลัง')
      : (receivePackageType || (receiveRmCode.trim().startsWith('R') || receiveWarehouse === 'MMRM' ? 'ถัง' : 'ลัง'));
    const mfgLotStr = receiveMfgLot && receiveMfgLot.trim() ? receiveMfgLot.trim() : '-';

    const breakdownStr = `${bCount} ${effectivePkg} x ${pBox} ${receiveUnit.trim()}${oddBCount > 0 ? ` + ${oddBCount} ${effectivePkg}เศษ x ${oddPBox} ${receiveUnit.trim()}` : ''}`;
    const pkgStr = `(${breakdownStr})${mfgLotStr !== '-' ? ` Lot.${mfgLotStr}` : ''}`;

    const updates: any = { 
      rm_code: receiveRmCode.trim(),
      rm_name: receiveRmName.trim(),
      warehouse: receiveWarehouse.trim() || 'MMPM',
      po_no: receivePoNo.trim(),
      supplier: receiveSupplier.trim() || null,
      quantity: parseFloat(receivePoQty) || receivingItem.quantity,
      unit: receiveUnit.trim() || 'pcs',
      control_no: controlNoInput.trim(),
      received_qty: parsedQty,
      receive_date: formattedReceiveDate,
      updated_at: nowIso
    };

    if (receivingItem.status === 'WAITING_QC') {
      updates.status = 'WAITING_QC';
    } else {
      updates.status = 'RECEIVED';
    }

    let finalRemark = receiveRemarkInput.trim();
    if (finalRemark.match(/\(\d+\s*(?:ลัง|กล่อง|ถัง|ถุง|หีบ|ห่อ|พาเลท|กระป๋อง|ม้วน|[^\s)]+)\s*x\s*[^)]+\)/)) {
      finalRemark = finalRemark.replace(/\(\d+\s*(?:ลัง|กล่อง|ถัง|ถุง|หีบ|ห่อ|พาเลท|กระป๋อง|ม้วน|[^\s)]+)\s*x\s*[^)]+\)/, pkgStr);
    } else {
      finalRemark = finalRemark ? `${finalRemark} • ${pkgStr}` : pkgStr;
    }

    if (receiveEditReason.trim()) {
      const editor = currentUser || 'User';
      const todayShort = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      const editTag = `[แก้ไข ${todayShort} โดย ${editor}: ${receiveEditReason.trim()}]`;
      if (!finalRemark.includes(editTag)) {
        finalRemark = finalRemark ? `${finalRemark} • ${editTag}` : editTag;
      }
    }
    updates.remark = finalRemark || null;

    const { error } = await supabase
      .from('production_lot_rms')
      .update(updates)
      .eq('id', receivingItem.id);

    if (error) {
      console.error(error);
      toast.error('อัปเดตข้อมูลไม่สำเร็จ: ' + error.message);
    } else {
      toast.success(isAlreadyReceived || isModified ? 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว' : `รับของเรียบร้อย (ยอดรับจริง: ${parsedQty.toLocaleString()} ${receiveUnit.trim()})`);
      setIsReceiveModalOpen(false);
      setReceivingItem(null);
      fetchItems();

      if (andPrintTag) {
        setQuarantineTagData({
          name: receiveRmName.trim(),
          code: receiveRmCode.trim(),
          controlNo: controlNoInput.trim(),
          supplier: receiveSupplier.trim(),
          totalQty: parsedQty,
          unit: receiveUnit.trim(),
          packageType: effectivePkg,
          boxCount: bCount,
          qtyPerBox: pBox,
          oddBoxCount: oddBCount,
          oddQtyPerBox: oddPBox,
          mfgLot: mfgLotStr,
          receivedBy: currentUser || 'คลังสินค้า',
          receivedDate: formattedReceiveDate,
          docRev: receiveRmCode.trim().startsWith('R') ? 'RM-WT-001A Rev.02' : 'PM-WT-001A Rev.02'
        });
        setIsQuarantineTagOpen(true);
      }
    }
  };

  const handleQcStatusChange = async (item: RMItem, newQcStatus: string) => {
    const updates: any = { qc_status: newQcStatus };
    
    if (newQcStatus === 'PASSED') {
      updates.status = 'READY';
      updates.released_date = new Date().toISOString();
    } else if (newQcStatus === 'REJECTED') {
      updates.status = 'REJECTED';
      updates.released_date = null;
    } else {
      updates.status = 'RECEIVED';
      updates.released_date = null;
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
    const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status);
    setEditForm({
      po_no: item.po_no || '',
      supplier: item.supplier || '',
      rm_code: item.rm_code || '',
      rm_name: item.rm_name || '',
      warehouse: item.warehouse || 'MMPM',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      eta_date: item.eta_date ? new Date(item.eta_date).toISOString().split('T')[0] : '',
      edit_reason: dInfo.reason || (item.status === 'REJECTED' ? 'เปิดรอบส่งมอบใหม่หลัง QC ไม่ผ่าน' : ''),
      delay_category: dInfo.category || (item.status === 'REJECTED' ? 'QUALITY_ISSUE_REMAKE' : 'SUPPLIER_PROD')
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingItem) return;

    if (!editForm.edit_reason.trim()) {
      toast.error('กรุณาระบุเหตุผลการแก้ไข (จำเป็นต้องระบุ)');
      return;
    }

    const originalEta = editingItem.eta_date || '';
    const newEta = editForm.eta_date || '';
    const isEtaChanged = originalEta !== newEta;

    // Rule 5: Revised ETA must not be in the past or today
    if (isEtaChanged && newEta) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      if (newEta <= todayStr) {
        toast.error('วันที่คาดว่าจะเข้าใหม่ (Revised ETA) ต้องไม่เป็นวันในอดีตหรือวันปัจจุบัน กรุณาระบุวันล่วงหน้า');
        return;
      }
    }

    const formattedRemark = formatDelayRemark(editingItem.bottom_remark, {
      originalEta: originalCommittedEta(editingItem),
      revisedEta: newEta,
      category: editForm.delay_category || 'OTHER',
      reason: editForm.edit_reason.trim(),
      updatedBy: currentUser || 'จัดซื้อ (Purchasing)'
    });

    const updatePayload: any = {
      po_no: editForm.po_no,
      supplier: editForm.supplier,
      rm_code: editForm.rm_code,
      rm_name: editForm.rm_name,
      warehouse: editForm.warehouse || 'MMPM',
      quantity: editForm.quantity,
      unit: editForm.unit,
      eta_date: editForm.eta_date || null,
      bottom_remark: formattedRemark
    };

    // Rule 7: If the item was REJECTED by QC and purchasing opens a new delivery round
    if (editingItem.status === 'REJECTED') {
      updatePayload.status = 'REVISED';
      updatePayload.control_no = null;
      updatePayload.receive_date = null;
      updatePayload.received_qty = null;
      updatePayload.qc_status = null;
      updatePayload.released_date = null;
    } else if (editingItem.status === 'REVISED') {
      updatePayload.status = 'REVISED';
    } else if (isEtaChanged || editingItem.status === 'DELAYED') {
      updatePayload.status = 'DELAYED';
    }

    const { error } = await supabase.from('production_lot_rms').update(updatePayload).eq('id', editingItem.id);

    if (error) {
      toast.error('แก้ไขข้อมูลไม่สำเร็จ: ' + error.message);
    } else {
      if (editingItem.status === 'REJECTED') {
        toast.success('เปิดรอบส่งมอบใหม่สำเร็จ! สถานะเปลี่ยนเป็น "Revised รอรับเข้ารอบใหม่" รอคลังรับเข้าและออก Control No. ใหม่');
      } else {
        toast.success('บันทึกการแก้ไขและสาเหตุเรียบร้อยแล้ว');
      }
      setIsEditModalOpen(false);
      fetchItems();
    }
  };

  const originalCommittedEta = (item: RMItem) => {
    const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status);
    const raw = dInfo.originalEta || item.eta_date || '';
    return raw ? raw.split('T')[0] : '';
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
    setCmd2SearchQuery('');
    setIsCmd2SearchOpen(false);
    setCmd2Form({ 
      pmCode: '', 
      pmName: '', 
      quantity: '', 
      customerName: '', 
      lotProduct: '', 
      warehouse: 'MMPM', 
      controlNo: '',
      packageType: 'ลัง',
      customPackageType: '',
      boxCount: '1',
      qtyPerBox: '',
      oddBoxCount: '0',
      oddQtyPerBox: '',
      mfgLot: '-'
    });
    
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
        .like('control_no', searchPattern);

      let nextIndex = 1;
      if (!error && data && data.length > 0) {
        const indexes = data
          .map((item: any) => {
            if (!item.control_no) return 0;
            const parts = item.control_no.split('-');
            if (parts.length >= 2) {
              const numPart = parseInt(parts[parts.length - 1], 10);
              return isNaN(numPart) ? 0 : numPart;
            }
            return 0;
          })
          .filter((n: number) => n > 0);

        if (indexes.length > 0) {
          nextIndex = Math.max(...indexes) + 1;
        }
      }

      const generatedControlNo = `${prefix}${dateString}-${String(nextIndex).padStart(2, '0')}`;
      setCmd2Form(prev => ({ ...prev, controlNo: generatedControlNo }));
    } catch (err) {
      console.error('Error generating CMD2 control_no:', err);
    }
  };

  const handleCmd2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd2Form.pmName || !cmd2Form.quantity || !cmd2Form.customerName) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
      return;
    }

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
    
    // Generate pseudo PO/PR number: CMD2-YYMMAAA
    const d = new Date();
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `CMD2-${yy}${mm}`;

    const { data: poList } = await supabase
      .from('production_lot_rms')
      .select('po_no')
      .like('po_no', `${monthPrefix}%`);

    let nextSeq = 1;
    if (poList && poList.length > 0) {
      const seqs = poList
        .map((p: any) => {
          if (!p.po_no) return 0;
          const numPart = p.po_no.replace(monthPrefix, '');
          return parseInt(numPart, 10);
        })
        .filter((n: number) => !isNaN(n) && n > 0);
      if (seqs.length > 0) {
        nextSeq = Math.max(...seqs) + 1;
      }
    }
    const fakePo = `${monthPrefix}${String(nextSeq).padStart(3, '0')}`;
    
    // If no code is provided, generate a pseudo one
    const fakeCode = cmd2Form.pmCode || `CMD2-${cmd2Form.customerName.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    
    const qtyVal = parseFloat(cmd2Form.quantity) || 0;
    const bCount = parseInt(cmd2Form.boxCount, 10) || 1;
    const pBox = parseFloat(cmd2Form.qtyPerBox) || (qtyVal > 0 && bCount > 0 ? Math.ceil(qtyVal / bCount) : 0);
    const oddBCount = parseInt(cmd2Form.oddBoxCount, 10) || 0;
    const oddPBox = parseFloat(cmd2Form.oddQtyPerBox) || 0;
    const effectivePkg = cmd2Form.packageType === 'อื่นๆ' 
      ? (cmd2Form.customPackageType.trim() || 'ลัง') 
      : (cmd2Form.packageType || 'ลัง');
    const mfgLotStr = cmd2Form.mfgLot && cmd2Form.mfgLot.trim() ? cmd2Form.mfgLot.trim() : '-';

    const breakdownStr = `${bCount} ${effectivePkg} x ${pBox} ชิ้น${oddBCount > 0 ? ` + ${oddBCount} ${effectivePkg}เศษ x ${oddPBox} ชิ้น` : ''}`;
    const pkgStr = `(${breakdownStr})${mfgLotStr !== '-' ? ` Lot.${mfgLotStr}` : ''}`;

    const { error } = await supabase.from('production_lot_rms').insert({
      po_no: fakePo,
      pr_no: fakePo,
      supplier: cmd2Form.customerName,
      rm_code: fakeCode,
      rm_name: cmd2Form.pmName,
      quantity: qtyVal,
      received_qty: qtyVal,
      unit: 'pcs',
      warehouse: cmd2Form.warehouse || 'MMPM',
      lot_product: cmd2Form.lotProduct,
      control_no: cmd2Form.controlNo.trim() || undefined,
      status: 'RECEIVED',
      receive_date: new Date().toISOString(),
      remark: pkgStr
    });

    setUploading(false);

    if (error) {
      toast.error('บันทึกข้อมูลบรรจุภัณฑ์ลูกค้าไม่สำเร็จ: ' + error.message);
    } else {
      toast.success(`รับเข้าบรรจุภัณฑ์ลูกค้า (CMD2) สำเร็จ! (เลขที่ ${fakePo})`);
      setIsCmd2ModalOpen(false);

      // Auto open Quarantine Tag Modal with full packaging & barcode
      setQuarantineTagData({
        name: cmd2Form.pmName,
        code: fakeCode,
        controlNo: cmd2Form.controlNo.trim() || '',
        supplier: cmd2Form.customerName,
        totalQty: qtyVal,
        unit: 'ชิ้น',
        boxCount: bCount,
        qtyPerBox: pBox,
        packageType: effectivePkg,
        oddBoxCount: oddBCount,
        oddQtyPerBox: oddPBox,
        mfgLot: mfgLotStr,
        receivedBy: currentUser || 'คลังสินค้า',
        receivedDate: new Date().toISOString(),
        docRev: 'PM-WT-001A Rev.02'
      });
      setIsQuarantineTagOpen(true);

      setCmd2Form({ 
        pmCode: '', 
        pmName: '', 
        quantity: '', 
        customerName: '', 
        lotProduct: '', 
        warehouse: 'MMPM', 
        controlNo: '',
        packageType: 'ลัง',
        customPackageType: '',
        boxCount: '1',
        qtyPerBox: '',
        oddBoxCount: '0',
        oddQtyPerBox: '',
        mfgLot: '-'
      });
      fetchItems();
    }
  };

  const openR4Modal = async () => {
    setIsR4ModalOpen(true);
    setR4SearchQuery('');
    setIsR4SearchOpen(false);
    setR4Form({ 
      rmCode: '', 
      rmName: '', 
      quantity: '', 
      unit: 'KG', 
      customerName: '', 
      lotProduct: '', 
      warehouse: 'MMRM', 
      controlNo: '',
      packageType: 'ถัง',
      customPackageType: '',
      boxCount: '1',
      qtyPerBox: '',
      oddBoxCount: '0',
      oddQtyPerBox: '',
      mfgLot: '-'
    });
    
    try {
      const prefix = 'R';
      const d = new Date();
      const yy = d.getFullYear().toString().slice(2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yy}${mm}${dd}`;
      const searchPattern = `${prefix}${dateString}-%`;

      const { data, error } = await supabase
        .from('production_lot_rms')
        .select('control_no')
        .like('control_no', searchPattern);

      let nextNum = 1;
      if (!error && data && data.length > 0) {
        const nums = data
          .map((d: any) => {
            if (!d.control_no) return 0;
            const parts = d.control_no.split('-');
            return parts.length === 2 ? parseInt(parts[1], 10) : 0;
          })
          .filter((n: number) => !isNaN(n) && n > 0);
        if (nums.length > 0) {
          nextNum = Math.max(...nums) + 1;
        }
      }
      setR4Form(prev => ({ ...prev, controlNo: `${prefix}${dateString}-${String(nextNum).padStart(2, '0')}` }));
    } catch (error) {
      console.error("Error generating control no for R4:", error);
    }
  };

  const handleR4Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (r4Form.controlNo.trim()) {
      const { data: duplicateData } = await supabase
        .from('production_lot_rms')
        .select('id')
        .eq('control_no', r4Form.controlNo.trim())
        .limit(1);

      if (duplicateData && duplicateData.length > 0) {
        toast.error('Control No. นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น');
        return;
      }
    }

    setUploading(true);
    
    // Generate pseudo PO/PR number: RMYYMMAAA
    const d = new Date();
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `RM${yy}${mm}`;

    const { data: poList } = await supabase
      .from('production_lot_rms')
      .select('po_no')
      .like('po_no', `${monthPrefix}%`);

    let nextSeq = 1;
    if (poList && poList.length > 0) {
      const seqs = poList
        .map((p: any) => {
          if (!p.po_no) return 0;
          const numPart = p.po_no.replace(monthPrefix, '');
          return parseInt(numPart, 10);
        })
        .filter((n: number) => !isNaN(n) && n > 0);
      if (seqs.length > 0) {
        nextSeq = Math.max(...seqs) + 1;
      }
    }
    const fakePo = `${monthPrefix}${String(nextSeq).padStart(3, '0')}`;
    
    // If no code is provided, generate a pseudo one
    const cleanCustomer = r4Form.customerName.replace(/[^a-zA-Z0-9]/g, '').substring(0,3).toUpperCase() || 'CUS';
    const fakeCode = r4Form.rmCode.trim() || `R4-${cleanCustomer}-${Date.now().toString().slice(-4)}`;
    const qtyVal = parseFloat(r4Form.quantity) || 0;
    const bCount = parseInt(r4Form.boxCount, 10) || 1;
    const pBox = parseFloat(r4Form.qtyPerBox) || (qtyVal > 0 && bCount > 0 ? Math.ceil(qtyVal / bCount) : 0);
    const oddBCount = parseInt(r4Form.oddBoxCount, 10) || 0;
    const oddPBox = parseFloat(r4Form.oddQtyPerBox) || 0;
    const effectivePkg = r4Form.packageType === 'อื่นๆ' 
      ? (r4Form.customPackageType.trim() || 'ถัง') 
      : (r4Form.packageType || 'ถัง');
    const mfgLotStr = r4Form.mfgLot && r4Form.mfgLot.trim() ? r4Form.mfgLot.trim() : '-';

    const breakdownStr = `${bCount} ${effectivePkg} x ${pBox} ${r4Form.unit || 'KG'}${oddBCount > 0 ? ` + ${oddBCount} ${effectivePkg}เศษ x ${oddPBox} ${r4Form.unit || 'KG'}` : ''}`;
    const pkgStr = `(${breakdownStr})${mfgLotStr !== '-' ? ` Lot.${mfgLotStr}` : ''}`;

    const { error } = await supabase.from('production_lot_rms').insert({
      po_no: fakePo,
      pr_no: fakePo,
      supplier: r4Form.customerName,
      rm_code: fakeCode,
      rm_name: r4Form.rmName,
      quantity: qtyVal,
      received_qty: qtyVal,
      unit: r4Form.unit || 'KG',
      warehouse: r4Form.warehouse || 'MMRM',
      lot_product: r4Form.lotProduct,
      control_no: r4Form.controlNo.trim() || undefined,
      status: 'RECEIVED',
      receive_date: new Date().toISOString(),
      remark: pkgStr
    });

    setUploading(false);

    if (error) {
      toast.error('บันทึกข้อมูลวัตถุดิบลูกค้าไม่สำเร็จ: ' + error.message);
    } else {
      toast.success(`รับเข้าวัตถุดิบลูกค้า (R4) สำเร็จ! (เลขที่ ${fakePo})`);
      setIsR4ModalOpen(false);

      // Auto open Quarantine Tag Modal with container type and odd boxes
      setQuarantineTagData({
        name: r4Form.rmName,
        code: fakeCode,
        controlNo: r4Form.controlNo.trim() || '',
        supplier: r4Form.customerName,
        totalQty: qtyVal,
        unit: r4Form.unit || 'KG',
        packageType: effectivePkg,
        boxCount: bCount,
        qtyPerBox: pBox,
        oddBoxCount: oddBCount,
        oddQtyPerBox: oddPBox,
        mfgLot: mfgLotStr,
        receivedBy: currentUser || 'คลังสินค้า',
        receivedDate: new Date().toISOString(),
        docRev: 'RM-WT-001A Rev.02'
      });
      setIsQuarantineTagOpen(true);

      setR4Form({ 
        rmCode: '', 
        rmName: '', 
        quantity: '', 
        unit: 'KG', 
        customerName: '', 
        lotProduct: '', 
        warehouse: 'MMRM', 
        controlNo: '',
        packageType: 'ถัง',
        customPackageType: '',
        boxCount: '1',
        qtyPerBox: '',
        oddBoxCount: '0',
        oddQtyPerBox: '',
        mfgLot: '-'
      });
      fetchItems();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_DELIVERY':
      case 'ORDERED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium whitespace-nowrap">Ordered รอรับเข้า</Badge>;
      case 'RECEIVED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium whitespace-nowrap">Received รับของแล้ว</Badge>;
      case 'WAITING_QC':
      case 'QUARANTINED':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium whitespace-nowrap">Quarantined แจ้งสุ่ม</Badge>;
      case 'QC_PASS':
      case 'READY':
      case 'PASSED':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 font-medium whitespace-nowrap">QC Passed</Badge>;
      case 'DELAYED':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 font-medium whitespace-nowrap">Delayed เข้าล่าช้า</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 font-medium whitespace-nowrap">Rejected ไม่ผ่าน</Badge>;
      case 'REVISED':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-medium whitespace-nowrap">Revised รอรับเข้ารอบใหม่</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      if (statusFilter === 'QC_PASS' || statusFilter === 'READY') {
        if (item.status !== 'READY' && item.status !== 'QC_PASS' && item.status !== 'PASSED') return false;
      } else if (statusFilter === 'WAITING_QC' || statusFilter === 'QUARANTINED') {
        if (item.status !== 'WAITING_QC' && item.status !== 'QUARANTINED') return false;
      } else if (statusFilter === 'PENDING_DELIVERY' || statusFilter === 'ORDERED') {
        if (item.status !== 'PENDING_DELIVERY' && item.status !== 'ORDERED') return false;
      } else {
        if (item.status !== statusFilter) return false;
      }
    }
    const term = searchQuery.toLowerCase();
    const statusTh = 
      (item.status === 'PENDING_DELIVERY' || item.status === 'ORDERED') ? 'ordered รอรับเข้า' :
      item.status === 'RECEIVED' ? 'received รับของแล้ว' :
      (item.status === 'WAITING_QC' || item.status === 'QUARANTINED') ? 'quarantined แจ้งสุ่ม รอตรวจ' :
      (item.status === 'READY' || item.status === 'QC_PASS' || item.status === 'PASSED') ? 'qc passed ผ่าน' :
      item.status === 'DELAYED' ? 'delayed เข้าล่าช้า' :
      item.status === 'REJECTED' ? 'rejected ไม่ผ่าน' :
      item.status === 'REVISED' ? 'revised รอรับเข้ารอบใหม่' : '';
    return (
      (item.po_no || '').toLowerCase().includes(term) ||
      (item.control_no || '').toLowerCase().includes(term) ||
      (item.rm_code || '').toLowerCase().includes(term) ||
      (item.rm_name || '').toLowerCase().includes(term) ||
      (item.lot_product || '').toLowerCase().includes(term) ||
      (item.supplier || '').toLowerCase().includes(term) ||
      (item.production_lots?.products?.sku || '').toLowerCase().includes(term) ||
      (extractSkuFromCode(item.rm_code, productSkus) || '').toLowerCase().includes(term) ||
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

  // 1. Purchasing View Filtered Items
  const purchasingItems = filteredItems.filter(item => {
    if (puSearch.po && !(item.po_no || '').toLowerCase().includes(puSearch.po.toLowerCase())) return false;
    if (puSearch.supplier && !(item.supplier || '').toLowerCase().includes(puSearch.supplier.toLowerCase())) return false;
    if (puSearch.po_date) {
      const pDateStr = item.po_date ? new Date(item.po_date).toLocaleDateString('th-TH') : '';
      if (!pDateStr.toLowerCase().includes(puSearch.po_date.toLowerCase()) && !(item.po_date || '').toLowerCase().includes(puSearch.po_date.toLowerCase())) return false;
    }
    if (puSearch.eta) {
      const etaStr = item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '';
      if (!etaStr.toLowerCase().includes(puSearch.eta.toLowerCase()) && !(item.eta_date || '').toLowerCase().includes(puSearch.eta.toLowerCase())) return false;
    }
    if (puSearch.code && !(item.rm_code || '').toLowerCase().includes(puSearch.code.toLowerCase())) return false;
    if (puSearch.name && !(item.rm_name || '').toLowerCase().includes(puSearch.name.toLowerCase()) && !(item.remark || '').toLowerCase().includes(puSearch.name.toLowerCase())) return false;
    if (puSearch.qty && !String(item.quantity || '').toLowerCase().includes(puSearch.qty.toLowerCase()) && !String(item.received_qty || '').toLowerCase().includes(puSearch.qty.toLowerCase()) && !(item.unit || '').toLowerCase().includes(puSearch.qty.toLowerCase())) return false;
    return true;
  });

  // 2. Warehouse View Filtered Items
  const warehouseItems = filteredItems.filter(item => {
    if (whSearch.eta) {
      const etaStr = item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '';
      if (!etaStr.toLowerCase().includes(whSearch.eta.toLowerCase()) && !(item.eta_date || '').toLowerCase().includes(whSearch.eta.toLowerCase())) return false;
    }
    if (whSearch.po && !(item.po_no || '').toLowerCase().includes(whSearch.po.toLowerCase())) return false;
    if (whSearch.supplier && !(item.supplier || '').toLowerCase().includes(whSearch.supplier.toLowerCase())) return false;
    if (whSearch.sku_lot) {
      const sku = getDisplaySku(item);
      const lot = getDisplayLot(item);
      const term = whSearch.sku_lot.toLowerCase();
      if (!sku.toLowerCase().includes(term) && !lot.toLowerCase().includes(term)) return false;
    }
    if (whSearch.code && !(item.rm_code || '').toLowerCase().includes(whSearch.code.toLowerCase())) return false;
    if (whSearch.name) {
      const term = whSearch.name.toLowerCase();
      const n = (item.rm_name || '').toLowerCase();
      const rem = (item.remark || '').toLowerCase();
      const bRem = (item.bottom_remark || '').toLowerCase();
      if (!n.includes(term) && !rem.includes(term) && !bRem.includes(term)) return false;
    }
    if (whSearch.qty && !String(item.quantity || '').toLowerCase().includes(whSearch.qty.toLowerCase()) && !String(item.received_qty || '').toLowerCase().includes(whSearch.qty.toLowerCase()) && !(item.unit || '').toLowerCase().includes(whSearch.qty.toLowerCase())) return false;
    if (whSearch.warehouse && !(item.warehouse || '').toLowerCase().includes(whSearch.warehouse.toLowerCase())) return false;
    if (whSearch.receive_date) {
      const term = whSearch.receive_date.toLowerCase();
      const recStr = item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '';
      const ctrl = item.control_no || '';
      if (!recStr.toLowerCase().includes(term) && !(item.receive_date || '').toLowerCase().includes(term) && !ctrl.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  // 3. QC View Filtered Items
  const qcItems = filteredItems
    .filter(i => i.status !== 'PENDING_DELIVERY' && i.status !== 'DELAYED' && i.status !== 'REVISED')
    .filter(item => {
      if (qcSearch.receive_date) {
        const term = qcSearch.receive_date.toLowerCase();
        const recStr = item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '';
        if (!recStr.toLowerCase().includes(term) && !(item.receive_date || '').toLowerCase().includes(term)) return false;
      }
      if (qcSearch.po && !(item.po_no || '').toLowerCase().includes(qcSearch.po.toLowerCase())) return false;
      if (qcSearch.control_no && !(item.control_no || '').toLowerCase().includes(qcSearch.control_no.toLowerCase())) return false;
      if (qcSearch.sku_lot) {
        const sku = getDisplaySku(item);
        const lot = getDisplayLot(item);
        const term = qcSearch.sku_lot.toLowerCase();
        if (!sku.toLowerCase().includes(term) && !lot.toLowerCase().includes(term)) return false;
      }
      if (qcSearch.code && !(item.rm_code || '').toLowerCase().includes(qcSearch.code.toLowerCase())) return false;
      if (qcSearch.name) {
        const term = qcSearch.name.toLowerCase();
        const n = (item.rm_name || '').toLowerCase();
        const rem = (item.remark || '').toLowerCase();
        const bRem = (item.bottom_remark || '').toLowerCase();
        if (!n.includes(term) && !rem.includes(term) && !bRem.includes(term)) return false;
      }
      if (qcStatusSearch !== 'ALL' && (item.qc_status || 'QUARANTINED') !== qcStatusSearch) return false;
      return true;
    })
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
      return new Date(b.receive_date || 0).getTime() - new Date(a.receive_date || 0).getTime();
    });

  // 4. Planning View Filtered Items
  const planningItems = filteredItems.map(item => {
    let targetDate: Date | null = null;
    if (item.production_lots?.production_logs) {
      const processName = mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ';
      const targetLogs = item.production_lots.production_logs.filter((l: any) => l.processes?.process_name === processName);
      if (targetLogs.length > 0) {
        targetLogs.sort((a: any, b: any) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime());
        targetDate = new Date(targetLogs[0].activity_date);
      }
    }
    return { ...item, targetDate };
  }).filter(item => {
    if (planSearch.sku_lot) {
      const sku = getDisplaySku(item);
      const lot = getDisplayLot(item);
      const term = planSearch.sku_lot.toLowerCase();
      if (!sku.toLowerCase().includes(term) && !lot.toLowerCase().includes(term)) return false;
    }
    if (planSearch.queue_date) {
      const qDateStr = item.targetDate ? item.targetDate.toLocaleDateString('th-TH') : '';
      if (!qDateStr.toLowerCase().includes(planSearch.queue_date.toLowerCase())) return false;
    }
    if (planSearch.po && !(item.po_no || '').toLowerCase().includes(planSearch.po.toLowerCase())) return false;
    if (planSearch.control_no && !(item.control_no || '').toLowerCase().includes(planSearch.control_no.toLowerCase())) return false;
    if (planSearch.code && !(item.rm_code || '').toLowerCase().includes(planSearch.code.toLowerCase())) return false;
    if (planSearch.name) {
      const term = planSearch.name.toLowerCase();
      const n = (item.rm_name || '').toLowerCase();
      const rem = (item.remark || '').toLowerCase();
      const bRem = (item.bottom_remark || '').toLowerCase();
      if (!n.includes(term) && !rem.includes(term) && !bRem.includes(term)) return false;
    }
    if (planSearch.qty && !String(item.quantity || '').toLowerCase().includes(planSearch.qty.toLowerCase()) && !(item.unit || '').toLowerCase().includes(planSearch.qty.toLowerCase())) return false;
    if (planSearch.eta) {
      const term = planSearch.eta.toLowerCase();
      const etaStr = item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '';
      if (!etaStr.toLowerCase().includes(term) && !(item.eta_date || '').toLowerCase().includes(term)) return false;
    }
    if (planSearch.receive_date) {
      const term = planSearch.receive_date.toLowerCase();
      const recStr = item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '';
      if (!recStr.toLowerCase().includes(term) && !(item.receive_date || '').toLowerCase().includes(term)) return false;
    }
    if (planSearch.qc_date) {
      const term = planSearch.qc_date.toLowerCase();
      const rawDate = item.released_date || (item.qc_status === 'PASSED' ? item.updated_at : null);
      const qcDateStr = rawDate ? new Date(rawDate).toLocaleDateString('th-TH') : '';
      const qcStatus = (item.qc_status || '').toLowerCase();
      if (!qcDateStr.toLowerCase().includes(term) && !qcStatus.includes(term) && !'ผ่านแล้ว'.includes(term)) return false;
    }
    return true;
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
  const pendingDeliveryItems = typeFilteredItems.filter(i => i.status === 'PENDING_DELIVERY' || i.status === 'ORDERED' || i.status === 'DELAYED' || i.status === 'REVISED');
  const receivedItems = typeFilteredItems.filter(i => i.status === 'RECEIVED' || i.status === 'WAITING_QC' || i.status === 'QUARANTINED');
  const readyItems = typeFilteredItems.filter(i => i.status === 'READY' || i.status === 'QC_PASS' || i.status === 'PASSED');
  const rejectedItems = typeFilteredItems.filter(i => i.status === 'REJECTED');

  const pendingWeight = pendingDeliveryItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const receivedWeight = receivedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const readyWeight = readyItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const totalWeight = typeFilteredItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const controlNoCount = typeFilteredItems.filter(i => !!i.control_no).length;
  const readyPct = activeItemsCount > 0 ? ((readyItems.length / activeItemsCount) * 100).toFixed(1) : '0.0';
  const fulfillmentPct = activeItemsCount > 0 ? (((receivedItems.length + readyItems.length) / activeItemsCount) * 100).toFixed(1) : '0.0';
  const uniqueSuppliers = new Set(typeFilteredItems.map(i => i.supplier).filter(Boolean)).size;
  const unitLabel = mainTab === 'rm' ? 'KG' : 'PCS';

  // ----------------------------------------------------
  // Continuous Work History & Excel Export Engine (5 Views)
  // ----------------------------------------------------
  const viewNameMap: Record<string, string> = {
    dashboard: 'Overview Dashboard (ภาพรวมทั้งหมด)',
    purchasing: 'Purchasing View (แผนกจัดซื้อ)',
    warehouse: 'Warehouse View (แผนกคลังสินค้า)',
    qc: 'QC View (แผนกตรวจรับรองคุณภาพ)',
    planning: 'Planning View (แผนกวางแผนการผลิต)'
  };

  const viewShortNameMap: Record<string, string> = {
    dashboard: 'Overview',
    purchasing: 'Purchasing',
    warehouse: 'Warehouse',
    qc: 'QC',
    planning: 'Planning'
  };

  const currentViewItemsCount = useMemo(() => {
    if (activeViewTab === 'dashboard') return typeFilteredItems.length;
    if (activeViewTab === 'purchasing') return purchasingItems.length;
    if (activeViewTab === 'warehouse') return warehouseItems.length;
    if (activeViewTab === 'qc') return qcItems.length;
    if (activeViewTab === 'planning') return planningItems.length;
    return filteredItems.length;
  }, [activeViewTab, typeFilteredItems.length, purchasingItems.length, warehouseItems.length, qcItems.length, planningItems.length, filteredItems.length]);

  // Generate Chronological Continuous Work History Events
  const continuousHistory = useMemo(() => {
    const events: {
      id: string;
      timestamp: string;
      dateObj: Date;
      stage: 'PURCHASING' | 'WAREHOUSE' | 'QC' | 'PLANNING';
      stageLabel: string;
      stageBadgeClass: string;
      itemCode: string;
      itemName: string;
      poNo: string;
      controlNo: string;
      supplier: string;
      qty: string;
      unit: string;
      details: string;
      status: string;
      user: string;
    }[] = [];

    typeFilteredItems.forEach((item) => {
      // 1. Purchasing Event
      if (item.po_no || item.created_at) {
        events.push({
          id: `pu-${item.id}`,
          timestamp: item.po_date || item.created_at || '',
          dateObj: new Date(item.po_date || item.created_at || 0),
          stage: 'PURCHASING',
          stageLabel: 'สั่งซื้อ (PO)',
          stageBadgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          itemCode: item.rm_code || '-',
          itemName: item.rm_name || '-',
          poNo: item.po_no || '-',
          controlNo: item.control_no || '-',
          supplier: item.supplier || '-',
          qty: item.quantity != null ? Number(item.quantity).toLocaleString() : '-',
          unit: item.unit || '-',
          details: `สั่งซื้อ ${item.quantity || '-'} ${item.unit || ''} (ETA: ${item.eta_date || '-'})`,
          status: item.status || 'ORDERED',
          user: 'ฝ่ายจัดซื้อ'
        });
      }

      // 2. Warehouse Receiving Event
      if (item.receive_date || item.control_no || item.received_qty != null) {
        events.push({
          id: `wh-${item.id}`,
          timestamp: item.receive_date || item.updated_at || item.created_at || '',
          dateObj: new Date(item.receive_date || item.updated_at || item.created_at || 0),
          stage: 'WAREHOUSE',
          stageLabel: 'รับเข้าคลัง (WH)',
          stageBadgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
          itemCode: item.rm_code || '-',
          itemName: item.rm_name || '-',
          poNo: item.po_no || '-',
          controlNo: item.control_no || '-',
          supplier: item.supplier || '-',
          qty: item.received_qty != null ? Number(item.received_qty).toLocaleString() : (item.quantity != null ? Number(item.quantity).toLocaleString() : '-'),
          unit: item.unit || '-',
          details: `รับเข้าคลัง ${item.warehouse || 'MMPM'} ยอดรับ ${item.received_qty || item.quantity} ${item.unit || ''} (Control No: ${item.control_no || '-'}) ${item.remark ? `[${item.remark}]` : ''}`,
          status: 'RECEIVED',
          user: 'คลังสินค้า'
        });
      }

      // 3. QC Event
      if (item.qc_status && item.qc_status !== 'WAITING_QC' && item.qc_status !== 'QUARANTINED') {
        events.push({
          id: `qc-${item.id}`,
          timestamp: item.released_date || item.updated_at || item.receive_date || '',
          dateObj: new Date(item.released_date || item.updated_at || item.receive_date || 0),
          stage: 'QC',
          stageLabel: 'ตรวจรับรอง (QC)',
          stageBadgeClass: item.qc_status === 'PASSED' || item.qc_status === 'READY' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300',
          itemCode: item.rm_code || '-',
          itemName: item.rm_name || '-',
          poNo: item.po_no || '-',
          controlNo: item.control_no || '-',
          supplier: item.supplier || '-',
          qty: item.received_qty != null ? Number(item.received_qty).toLocaleString() : (item.quantity != null ? Number(item.quantity).toLocaleString() : '-'),
          unit: item.unit || '-',
          details: `ผลตรวจ QC: ${item.qc_status === 'PASSED' || item.qc_status === 'READY' ? '✅ ผ่านการตรวจรับรอง (Released พร้อมใช้)' : item.qc_status} ${item.released_date ? `เมื่อ ${item.released_date}` : ''}`,
          status: item.qc_status,
          user: 'ฝ่าย QC'
        });
      }

      // 4. Planning Sync Event
      if (item.production_lots) {
        events.push({
          id: `plan-${item.id}`,
          timestamp: item.production_lots.production_logs?.[0]?.activity_date || item.created_at || '',
          dateObj: new Date(item.production_lots.production_logs?.[0]?.activity_date || item.created_at || 0),
          stage: 'PLANNING',
          stageLabel: 'แผนผลิต (Plan)',
          stageBadgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          itemCode: item.rm_code || '-',
          itemName: item.rm_name || '-',
          poNo: item.po_no || '-',
          controlNo: item.control_no || '-',
          supplier: item.supplier || '-',
          qty: item.quantity != null ? Number(item.quantity).toLocaleString() : '-',
          unit: item.unit || '-',
          details: `เชื่อมโยงล็อตผลิต ${item.production_lots.lot_no || '-'} (SKU: ${item.production_lots.products?.sku || '-'})`,
          status: 'PLANNING_SYNC',
          user: 'ฝ่ายวางแผน'
        });
      }
    });

    return events.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [typeFilteredItems]);

  // Filtered Continuous History based on search & stage filter
  const filteredHistory = useMemo(() => {
    return continuousHistory.filter((evt) => {
      if (historyStageFilter !== 'ALL' && evt.stage !== historyStageFilter) return false;
      if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase();
        return (
          evt.itemCode.toLowerCase().includes(q) ||
          evt.itemName.toLowerCase().includes(q) ||
          evt.poNo.toLowerCase().includes(q) ||
          evt.controlNo.toLowerCase().includes(q) ||
          evt.supplier.toLowerCase().includes(q) ||
          evt.details.toLowerCase().includes(q) ||
          evt.status.toLowerCase().includes(q) ||
          evt.user.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [continuousHistory, historyStageFilter, historySearchQuery]);

  // 1. Export Overview Dashboard
  const handleExportOverview = () => {
    const summaryData = [
      { "ตัวชี้วัด (KPI)": "รายการทั้งหมดในระบบ", "จำนวน": activeItemsCount, "หน่วย": "รายการ" },
      { "ตัวชี้วัด (KPI)": "รอของเข้า (Ordered / Delayed / Revised)", "จำนวน": typeFilteredItems.filter(i => i.status === 'PENDING_DELIVERY' || i.status === 'ORDERED' || i.status === 'DELAYED' || i.status === 'REVISED').length, "หน่วย": "รายการ" },
      { "ตัวชี้วัด (KPI)": "รับเข้าคลังแล้ว / รอตรวจ QC", "จำนวน": typeFilteredItems.filter(i => i.status === 'WAITING_QC' || i.status === 'RECEIVED' || i.status === 'QUARANTINED').length, "หน่วย": "รายการ" },
      { "ตัวชี้วัด (KPI)": "QC ผ่าน / พร้อมใช้ผลิต", "จำนวน": typeFilteredItems.filter(i => i.status === 'READY' || i.status === 'QC_PASS' || i.status === 'PASSED').length, "หน่วย": "รายการ" },
      { "ตัวชี้วัด (KPI)": "รายการที่เข้าไม่ทันคิวผลิต (เสี่ยงล่าช้า)", "จำนวน": delayedItems.length, "หน่วย": "รายการ" }
    ];

    const delayedData = delayedItems.map((item, idx) => ({
      "ลำดับ": idx + 1,
      "SKU สินค้า": getDisplaySku(item),
      "LOT การผลิต": getDisplayLot(item),
      "รหัสวัตถุดิบ": item.rm_code || '-',
      "ชื่อวัตถุดิบ": item.rm_name || '-',
      "คิวชั่งสาร/บรรจุ": item.production_lots?.production_logs?.[0]?.activity_date ? new Date(item.production_lots.production_logs[0].activity_date).toLocaleDateString('th-TH') : '-',
      "กำหนดของเข้า ETA": item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-',
      "ผู้ขาย / Supplier": item.supplier || '-',
      "สถานะ": item.status || '-'
    }));

    const allItemsData = typeFilteredItems.map((item, idx) => ({
      "ลำดับ": idx + 1,
      "เลขที่ PO": item.po_no || '-',
      "ผู้ขาย": item.supplier || '-',
      "รหัสสินค้า": item.rm_code || '-',
      "ชื่อสินค้า": item.rm_name || '-',
      "จำนวน": item.quantity != null ? Number(item.quantity).toLocaleString() : '-',
      "หน่วยนับ": item.unit || '-',
      "กำหนดเข้า ETA": item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-',
      "วันที่รับเข้า": item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '-',
      "รหัสควบคุม Control No": item.control_no || '-',
      "สถานะ QC": item.qc_status || '-',
      "สถานะระบบ": item.status || '-'
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsDelayed = XLSX.utils.json_to_sheet(delayedData.length > 0 ? delayedData : [{ "สถานะ": "ไม่มีรายการล่าช้า" }]);
    const wsAll = XLSX.utils.json_to_sheet(allItemsData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Overview_KPI");
    XLSX.utils.book_append_sheet(wb, wsDelayed, "Delayed_Items");
    XLSX.utils.book_append_sheet(wb, wsAll, "All_Materials");

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `CosmeFlow_Material_Overview_Report_${dateStr}.xlsx`);
    toast.success(`ส่งออกรายงาน Overview Dashboard สำเร็จ (${typeFilteredItems.length} รายการ)`);
  };

  // 2. Export Purchasing View
  const handleExportPurchasing = () => {
    const exportData = purchasingItems.map((item, idx) => ({
      "ลำดับ": idx + 1,
      "เลขที่ PO": item.po_no || '-',
      "ผู้ขาย / Supplier": item.supplier || '-',
      "วันที่สั่งซื้อ (PO Date)": item.po_date ? new Date(item.po_date).toLocaleDateString('th-TH') : '-',
      "กำหนดส่งมอบ (ETA Date)": item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-',
      "รหัสวัตถุดิบ (Code)": item.rm_code || '-',
      "ชื่อวัตถุดิบ / บรรจุภัณฑ์ (Name)": item.rm_name || '-',
      "จำนวนสั่งซื้อ": item.quantity != null ? Number(item.quantity).toLocaleString() : '-',
      "หน่วยนับ": item.unit || '-',
      "สถานะ": item.status || '-',
      "หมายเหตุ / สาเหตุล่าช้า": item.bottom_remark || item.remark || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchasing_View");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `CosmeFlow_Purchasing_Report_${dateStr}.xlsx`);
    toast.success(`ส่งออกรายงาน Purchasing View สำเร็จ (${exportData.length} รายการ)`);
  };

  // 3. Export Warehouse View
  const handleExportWarehouse = () => {
    const exportData = warehouseItems.map((item, idx) => ({
      "ลำดับ": idx + 1,
      "กำหนดเข้า (ETA)": item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-',
      "วันที่รับจริง (Receive Date)": item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '-',
      "เลขที่ PO": item.po_no || '-',
      "รหัสควบคุม (Control No.)": item.control_no || '-',
      "รหัสสินค้า (Code)": item.rm_code || '-',
      "ชื่อสินค้า (Name)": item.rm_name || '-',
      "ผู้ส่งมอบ (Supplier)": item.supplier || '-',
      "ยอดสั่งซื้อ": item.quantity != null ? Number(item.quantity).toLocaleString() : '-',
      "ยอดรับจริง": item.received_qty != null ? Number(item.received_qty).toLocaleString() : '-',
      "หน่วยนับ": item.unit || '-',
      "คลังจัดเก็บ": item.warehouse || 'MMPM',
      "การแบ่งบรรจุ / หมายเหตุ": item.remark || item.bottom_remark || '-',
      "สถานะ": item.status || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Warehouse_Receiving");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `CosmeFlow_Warehouse_Receiving_Report_${dateStr}.xlsx`);
    toast.success(`ส่งออกรายงาน Warehouse View สำเร็จ (${exportData.length} รายการ)`);
  };

  // 4. Export QC View
  const handleExportQC = () => {
    const exportData = qcItems.map((item, idx) => ({
      "ลำดับ": idx + 1,
      "วันที่รับตัวอย่าง (Receive Date)": item.receive_date ? new Date(item.receive_date).toLocaleDateString('th-TH') : '-',
      "รหัสควบคุม (Control No.)": item.control_no || '-',
      "เลขที่ PO": item.po_no || '-',
      "ผู้ขาย / ผู้ส่งมอบ": item.supplier || '-',
      "รหัสสินค้า (Code)": item.rm_code || '-',
      "ชื่อสินค้า (Name)": item.rm_name || '-',
      "ยอดรับเข้า": item.received_qty != null ? Number(item.received_qty).toLocaleString() : (item.quantity != null ? Number(item.quantity).toLocaleString() : '-'),
      "หน่วยนับ": item.unit || '-',
      "สถานะตรวจ QC": item.qc_status || 'QUARANTINED',
      "วันที่ปล่อยผ่าน (Release Date)": item.released_date ? new Date(item.released_date).toLocaleDateString('th-TH') : '-',
      "หมายเหตุ / ผลทดสอบ": item.remark || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QC_Status");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `CosmeFlow_QC_Inspection_Report_${dateStr}.xlsx`);
    toast.success(`ส่งออกรายงาน QC View สำเร็จ (${exportData.length} รายการ)`);
  };

  // 5. Export Planning View
  const handleExportPlanning = () => {
    const exportData = planningItems.map((item, idx) => {
      let isDelayed = false;
      if (item.targetDate && item.eta_date) {
        isDelayed = new Date(item.eta_date).getTime() > item.targetDate.getTime();
      }
      return {
        "ลำดับ": idx + 1,
        "รหัสสินค้า (SKU)": getDisplaySku(item),
        "ล็อตการผลิต (LOT)": getDisplayLot(item),
        "คิวชั่งสาร / บรรจุ": item.targetDate ? item.targetDate.toLocaleDateString('th-TH') : '-',
        "เลขที่ PO": item.po_no || '-',
        "รหัสควบคุม (Control No.)": item.control_no || '-',
        "รหัสวัตถุดิบ (Code)": item.rm_code || '-',
        "ชื่อวัตถุดิบ (Name)": item.rm_name || '-',
        "จำนวนที่ต้องใช้": item.quantity != null ? Number(item.quantity).toLocaleString() : '-',
        "หน่วยนับ": item.unit || '-',
        "กำหนดเข้า ETA": item.eta_date ? new Date(item.eta_date).toLocaleDateString('th-TH') : '-',
        "สถานะความพร้อม": item.status || '-',
        "ทันแผนผลิต": isDelayed ? '⚠️ เสี่ยงล่าช้า' : '✅ ทันแผน'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planning_Readiness");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `CosmeFlow_Planning_Readiness_Report_${dateStr}.xlsx`);
    toast.success(`ส่งออกรายงาน Planning View สำเร็จ (${exportData.length} รายการ)`);
  };

  // 6. Export Continuous History (ประวัติการทำงานแบบต่อเนื่อง)
  const handleExportHistory = () => {
    const exportData = filteredHistory.map((evt, idx) => ({
      "ลำดับ": idx + 1,
      "วันที่และเวลา": evt.timestamp ? new Date(evt.timestamp).toLocaleString('th-TH') : '-',
      "ขั้นตอนการทำงาน": evt.stageLabel,
      "รหัสสินค้า": evt.itemCode,
      "ชื่อสินค้า": evt.itemName,
      "เลขที่ PO": evt.poNo,
      "รหัสควบคุม Control No.": evt.controlNo,
      "ผู้ขาย / Supplier": evt.supplier,
      "จำนวน": evt.qty,
      "หน่วยนับ": evt.unit,
      "รายละเอียดการทำงาน": evt.details,
      "สถานะ": evt.status,
      "ผู้ดำเนินการ": evt.user
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Continuous_History");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `CosmeFlow_Material_Continuous_History_${dateStr}.xlsx`);
    toast.success(`ส่งออกประวัติการทำงานแบบต่อเนื่องสำเร็จ (${exportData.length} รายการ)`);
  };

  // Unified Handler to Export the Current Active View
  const handleExportCurrentView = () => {
    if (activeViewTab === 'dashboard') handleExportOverview();
    else if (activeViewTab === 'purchasing') handleExportPurchasing();
    else if (activeViewTab === 'warehouse') handleExportWarehouse();
    else if (activeViewTab === 'qc') handleExportQC();
    else if (activeViewTab === 'planning') handleExportPlanning();
    else handleExportOverview();
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 w-full max-w-full mx-auto space-y-6 min-w-0">
        {/* Top Toggle for RM/PM */}
        <div className="flex justify-center mb-4">
          <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap justify-center gap-1 shadow-inner border border-slate-200">
            <button 
              onClick={() => setMainTab('rm')}
              className={`px-4 sm:px-8 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${mainTab === 'rm' ? 'bg-[#2D2721] text-[#D4AF37] shadow-lg border border-[#D4AF37]/30' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Package className="w-4 h-4" />
              วัตถุดิบ (Raw Material - RM)
            </button>
            <button 
              onClick={() => setMainTab('pm')}
              className={`px-4 sm:px-8 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${mainTab === 'pm' ? 'bg-[#2D2721] text-[#D4AF37] shadow-lg border border-[#D4AF37]/30' : 'text-slate-500 hover:text-slate-800'}`}
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
          {mainTab === 'rm' && (
            <Button onClick={openR4Modal} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold flex-shrink-0">
              + รับเข้าวัตถุดิบลูกค้า (R4)
            </Button>
          )}
          {mainTab === 'pm' && (
            <Button onClick={openCmd2Modal} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold flex-shrink-0">
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
        {/* Soft, Modern Segmented Control Bar - Auto Height & Multi-row Resilient */}
        <TabsList className="bg-[#F8F6F0] p-1.5 sm:p-2 rounded-2xl border border-[#E7DFD5] shadow-xs w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 !h-auto group-data-horizontal/tabs:!h-auto min-h-fit">
          {/* 1. Overview Dashboard */}
          <TabsTrigger 
            value="dashboard" 
            className="group data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-slate-200/90 data-[state=active]:ring-1 data-[state=active]:ring-slate-900/5 py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold text-xs sm:text-sm md:text-[14px] transition-all duration-200 rounded-xl flex items-center justify-center gap-2 border border-transparent cursor-pointer !h-auto min-h-[42px]"
          >
            <LayoutDashboard className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 group-data-[state=active]:text-amber-600 text-amber-500/70 transition-colors"/> 
            <span className="truncate">Overview Dashboard</span>
          </TabsTrigger>

          {/* 2. Purchasing View */}
          <TabsTrigger 
            value="purchasing" 
            className="group data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-slate-200/90 data-[state=active]:ring-1 data-[state=active]:ring-slate-900/5 py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold text-xs sm:text-sm md:text-[14px] transition-all duration-200 rounded-xl flex items-center justify-center gap-2 border border-transparent cursor-pointer !h-auto min-h-[42px]"
          >
            <ShoppingCart className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 group-data-[state=active]:text-amber-600 text-amber-500/70 transition-colors"/> 
            <span className="truncate">Purchasing View</span>
          </TabsTrigger>

          {/* 3. Warehouse View */}
          <TabsTrigger 
            value="warehouse" 
            className="group data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-slate-200/90 data-[state=active]:ring-1 data-[state=active]:ring-slate-900/5 py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold text-xs sm:text-sm md:text-[14px] transition-all duration-200 rounded-xl flex items-center justify-center gap-2 border border-transparent cursor-pointer !h-auto min-h-[42px]"
          >
            <Box className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 group-data-[state=active]:text-blue-600 text-blue-500/70 transition-colors"/> 
            <span className="truncate">Warehouse View</span>
          </TabsTrigger>

          {/* 4. QC View */}
          <TabsTrigger 
            value="qc" 
            className="group data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-slate-200/90 data-[state=active]:ring-1 data-[state=active]:ring-slate-900/5 py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold text-xs sm:text-sm md:text-[14px] transition-all duration-200 rounded-xl flex items-center justify-center gap-2 border border-transparent cursor-pointer !h-auto min-h-[42px]"
          >
            <Activity className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 group-data-[state=active]:text-emerald-600 text-emerald-500/70 transition-colors"/> 
            <span className="truncate">QC View</span>
          </TabsTrigger>

          {/* 5. Planning View */}
          <TabsTrigger 
            value="planning" 
            className="group data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-slate-200/90 data-[state=active]:ring-1 data-[state=active]:ring-slate-900/5 py-2.5 sm:py-3 px-3 sm:px-4 text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold text-xs sm:text-sm md:text-[14px] transition-all duration-200 rounded-xl flex items-center justify-center gap-2 border border-transparent cursor-pointer !h-auto min-h-[42px] col-span-2 sm:col-span-1"
          >
            <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 group-data-[state=active]:text-indigo-600 text-indigo-500/70 transition-colors"/> 
            <span className="truncate">Planning View</span>
          </TabsTrigger>
        </TabsList>

        {/* Continuous Work History & Report Action Bar (Soft, Clean, Unified Tone) */}
        <div className="bg-[#FAF9F6] p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4 mb-2 clear-both">
          {/* Left: Current View & Continuous Status Information */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
              <History className="w-4 h-4 text-[#D4AF37] animate-pulse shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700">ประวัติการทำงานแบบต่อเนื่อง:</span>
                <Badge className="bg-[#D4AF37]/15 text-[#6D5A1A] border border-[#D4AF37]/30 font-semibold text-[11px] px-2.5 py-0.5 rounded-lg">
                  {viewNameMap[activeViewTab] || activeViewTab}
                </Badge>
              </div>
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="bg-white px-2.5 py-1 rounded-lg font-medium border border-slate-200/80 shadow-2xs flex items-center gap-1">
                📦 <strong className="text-slate-800">{currentViewItemsCount}</strong> รายการในหน้านี้
              </span>
              <span className="inline-flex bg-white px-2.5 py-1 rounded-lg font-medium border border-slate-200/80 shadow-2xs text-slate-600 items-center gap-1">
                ⚡ บันทึกประวัติสะสม <strong className="text-purple-700">{continuousHistory.length}</strong> ไทม์ไลน์
              </span>
            </div>
          </div>

          {/* Right: Action Buttons (History Modal & Export Excel) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Full Continuous History Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryModalOpen(true)}
              className="h-8.5 text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <History className="w-4 h-4 text-amber-600" />
              ดูประวัติแบบต่อเนื่อง ({continuousHistory.length})
            </Button>

            {/* Export Current View Excel Button */}
            <Button
              size="sm"
              onClick={handleExportCurrentView}
              className="h-8.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              Export Excel ({viewShortNameMap[activeViewTab] || 'Report'})
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#F8F6F0]/60 p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
                <span>ภาพรวมสถานะ {mainTab === 'rm' ? 'วัตถุดิบ (Raw Material)' : 'บรรจุภัณฑ์ (Packaging)'}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportOverview}
                className="h-8 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Export Excel (Overview Dashboard)
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#D4AF37]/ border-[#D4AF37]/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#4A4238]">รายการทั้งหมด</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-[#D4AF37]">{activeItemsCount}</div></CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-800">รอของเข้า (Ordered / Delayed / Revised)</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-orange-600">{typeFilteredItems.filter(i => i.status === 'PENDING_DELIVERY' || i.status === 'ORDERED' || i.status === 'DELAYED' || i.status === 'REVISED').length}</div></CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-800">รับแล้ว / แจ้งสุ่ม QC</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-yellow-600">{typeFilteredItems.filter(i => i.status === 'WAITING_QC' || i.status === 'RECEIVED' || i.status === 'QUARANTINED').length}</div></CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-800">QC ผ่าน / พร้อมใช้ผลิต (QC Passed)</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold text-green-600">{typeFilteredItems.filter(i => i.status === 'READY' || i.status === 'QC_PASS' || i.status === 'PASSED').length}</div></CardContent>
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
                              <TableCell className="whitespace-nowrap">
                                <div className="text-sm font-bold text-[#D4AF37]">{getDisplaySku(item)}</div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5">{getDisplayLot(item)}</div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap font-medium text-slate-700">
                                {item.rm_code}
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
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-700">รายการสั่งซื้อ (PO Tracking)</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportPurchasing}
                    className="h-8 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Excel (Purchasing)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {puActiveCount > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-amber-50/70 border-b border-amber-200/50">
                    <span className="text-xs text-amber-800 font-medium">
                      🔍 กำลังค้นหาในคอลัมน์ ({puActiveCount} คอลัมน์) — พบ {purchasingItems.length} จาก {filteredItems.length} รายการ
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearPuSearch} 
                      className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-100/50 px-2 flex items-center gap-1 font-medium"
                    >
                      <X className="w-3.5 h-3.5" /> ล้างการค้นหาคอลัมน์
                    </Button>
                  </div>
                )}
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="text-sm min-w-[1250px]">
                    <TableHeader className="bg-[#F8F6F0]/">
                      <TableRow>
                        <TableHead className="w-[140px] min-w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="PO No."
                            placeholder="ค้นหา PO..."
                            value={puSearch.po}
                            onChange={(val) => setPuSearch(prev => ({ ...prev, po: val }))}
                            onClear={() => setPuSearch(prev => ({ ...prev, po: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[160px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Supplier"
                            placeholder="ค้นหา Supplier..."
                            value={puSearch.supplier}
                            onChange={(val) => setPuSearch(prev => ({ ...prev, supplier: val }))}
                            onClear={() => setPuSearch(prev => ({ ...prev, supplier: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[110px] p-2 align-top">
                          <ColumnSearchInput 
                            title="PO Date"
                            placeholder="ค้นหา วันที่..."
                            value={puSearch.po_date}
                            onChange={(val) => setPuSearch(prev => ({ ...prev, po_date: val }))}
                            onClear={() => setPuSearch(prev => ({ ...prev, po_date: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[115px] p-2 align-top">
                          <ColumnSearchInput 
                            title="ETA"
                            placeholder="ค้นหา ETA..."
                            value={puSearch.eta}
                            onChange={(val) => setPuSearch(prev => ({ ...prev, eta: val }))}
                            onClear={() => setPuSearch(prev => ({ ...prev, eta: '' }))}
                            sortElement={
                              <div 
                                className="cursor-pointer hover:text-[#D4AF37] transition-colors p-0.5 rounded"
                                onClick={() => setEtaSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                                title="เรียงตาม ETA"
                              >
                                {etaSort === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : 
                                 etaSort === 'desc' ? <ArrowDown className="w-3 h-3 text-[#D4AF37]" /> : 
                                 <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                              </div>
                            }
                          />
                        </TableHead>
                        <TableHead className="w-[160px] min-w-[150px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Code"
                            placeholder="ค้นหา Code..."
                            value={puSearch.code}
                            onChange={(val) => setPuSearch(prev => ({ ...prev, code: val }))}
                            onClear={() => setPuSearch(prev => ({ ...prev, code: '' }))}
                          />
                        </TableHead>
                        <TableHead className="min-w-[180px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Name"
                            placeholder="ค้นหา Name / หมายเหตุ..."
                            value={puSearch.name}
                            onChange={(val) => setPuSearch(prev => ({ ...prev, name: val }))}
                            onClear={() => setPuSearch(prev => ({ ...prev, name: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[110px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Qty"
                            placeholder="ค้นหา Qty..."
                            value={puSearch.qty}
                            onChange={(val) => setPuSearch(prev => ({ ...prev, qty: val }))}
                            onClear={() => setPuSearch(prev => ({ ...prev, qty: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[155px] p-2 align-top">
                          <div className="flex flex-col gap-1 w-full py-1">
                            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-700">
                              <span>Status</span>
                              <Filter className={`w-3 h-3 ${statusFilter !== 'ALL' ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-slate-400'}`} />
                            </div>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-[11px] w-full bg-white border-slate-200 px-1.5 py-0 font-normal">
                                <SelectValue placeholder="ทุกสถานะ" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Status (ทั้งหมด)</SelectItem>
                                <SelectItem value="PENDING_DELIVERY">Ordered รอรับเข้า</SelectItem>
                                <SelectItem value="RECEIVED">Received รับของแล้ว</SelectItem>
                                <SelectItem value="WAITING_QC">Quarantined แจ้งสุ่ม</SelectItem>
                                <SelectItem value="QC_PASS">QC Passed</SelectItem>
                                <SelectItem value="DELAYED">Delayed เข้าล่าช้า</SelectItem>
                                <SelectItem value="REJECTED">Rejected ไม่ผ่าน</SelectItem>
                                <SelectItem value="REVISED">Revised รอรับเข้ารอบใหม่</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead className="w-[60px] p-2 align-top">
                          <div className="flex flex-col gap-1 w-full py-1">
                            <span className="text-xs font-semibold text-slate-700">File</span>
                            <div className="h-6"></div>
                          </div>
                        </TableHead>
                        <TableHead className="w-[110px] p-2 align-top">
                          <div className="flex flex-col gap-1 w-full py-1">
                            <span className="text-xs font-semibold text-slate-700 text-right">จัดการ</span>
                            <div className="h-6"></div>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchasingItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-[#F8F6F0]/">
                          <TableCell className="font-medium text-[#D4AF37] whitespace-nowrap">{item.po_no || '-'}</TableCell>
                          <TableCell className="line-clamp-2 break-words text-wrap" title={item.supplier}>{item.supplier || '-'}</TableCell>
                          <TableCell>{item.po_date ? new Date(item.po_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                          <TableCell>
                            {(() => {
                              const dInfo = parseDelayInfo(item.bottom_remark, item.eta_date, item.receive_date, item.status);
                              const hasRevised = dInfo.originalEta && item.eta_date && dInfo.originalEta.split('T')[0] !== item.eta_date.split('T')[0];
                              return (
                                <div className="flex flex-col">
                                  {hasRevised ? (
                                    <>
                                      <span className="text-orange-600 font-bold flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-orange-500 shrink-0" />
                                        {new Date(item.eta_date).toLocaleDateString('th-TH')}
                                      </span>
                                      <span className="text-[10px] text-slate-400 line-through" title="กำหนดส่งแรกสุดตาม PO (ใช้คิด KPI/OTIF)">
                                        PO: {new Date(dInfo.originalEta!).toLocaleDateString('th-TH')}
                                      </span>
                                    </>
                                  ) : item.eta_date ? (
                                    <span>{new Date(item.eta_date).toLocaleDateString('th-TH')}</span>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-700">{item.rm_code}</TableCell>
                          <TableCell>
                            <div className="line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                            {item.remark && (
                              <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200/70 px-1.5 py-0.5 rounded mt-1 flex items-start gap-1 max-w-[220px]" title={item.remark}>
                                <span className="font-bold shrink-0">💬 รับเข้า:</span>
                                <span className="truncate">{item.remark}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <div>{item.quantity} {item.unit}</div>
                            {item.status === 'RECEIVED' && item.received_qty != null && (
                              <div className={`text-[10px] font-bold mt-0.5 ${item.received_qty !== item.quantity ? 'text-amber-600' : 'text-emerald-600'}`}>
                                รับจริง: {Number(item.received_qty).toLocaleString()} {item.unit}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            {item.file_link ? (
                              <a href={item.file_link} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:text-[#D4AF37] flex items-center">
                                <Paperclip className="w-4 h-4" />
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openSplitModal(item)} 
                                disabled={!(item.status === 'PENDING_DELIVERY' || item.status === 'DELAYED') || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin')}
                                className={`h-8 w-8 ${!(item.status === 'PENDING_DELIVERY' || item.status === 'DELAYED') || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin') ? 'text-slate-300' : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50'}`}
                                title="แยกงวดส่งของ (Split Delivery)"
                              >
                                <Scissors className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  if (item.status === 'RECEIVED' || item.status === 'WAITING_QC') {
                                    openReceiveModal(item);
                                  } else {
                                    openEditModal(item);
                                  }
                                }} 
                                disabled={!(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || currentUser?.toUpperCase().startsWith('WH') || currentUser?.toUpperCase().startsWith('MM') || userRole === 'admin')}
                                className={`h-8 w-8 ${!(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || currentUser?.toUpperCase().startsWith('WH') || currentUser?.toUpperCase().startsWith('MM') || userRole === 'admin') ? 'text-slate-300' : item.status === 'REJECTED' ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-50 ring-1 ring-purple-300' : 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                title={item.status === 'REJECTED' ? "เปิดรอบส่งมอบใหม่ (Revise Delivery หลัง QC ไม่ผ่าน)" : "แก้ไขรายการ / ระบุเหตุผลการแก้ไข"}
                              >
                                {item.status === 'REJECTED' ? <RefreshCw className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDelete(item.id)} 
                                disabled={!(item.status === 'PENDING_DELIVERY' || item.status === 'DELAYED' || item.status === 'REVISED') || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin')}
                                className={`h-8 w-8 ${!(item.status === 'PENDING_DELIVERY' || item.status === 'DELAYED' || item.status === 'REVISED') || !(currentUser?.toUpperCase().startsWith('PU') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin') ? 'text-slate-300' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                                title="ลบรายการ"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {purchasingItems.length === 0 && (
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
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-700">Receiving Plan (รอรับของเข้า)</CardTitle>
                <div className="flex items-center gap-2">
                  {whActiveCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearWhSearch} 
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-100/50 px-2 flex items-center gap-1 font-medium"
                    >
                      <X className="w-3.5 h-3.5" /> ล้างการค้นหาคอลัมน์ ({whActiveCount})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportWarehouse}
                    className="h-8 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Excel (Warehouse)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="text-sm min-w-[1250px]">
                    <TableHeader className="bg-[#F8F6F0]/">
                      <TableRow>
                        <TableHead className="w-[115px] p-2 align-top">
                          <ColumnSearchInput 
                            title="ETA"
                            placeholder="ค้นหา ETA..."
                            value={whSearch.eta}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, eta: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, eta: '' }))}
                            sortElement={
                              <div 
                                className="cursor-pointer hover:text-[#D4AF37] transition-colors p-0.5 rounded"
                                onClick={() => setEtaSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                                title="เรียงตาม ETA"
                              >
                                {etaSort === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : 
                                 etaSort === 'desc' ? <ArrowDown className="w-3 h-3 text-[#D4AF37]" /> : 
                                 <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                              </div>
                            }
                          />
                        </TableHead>
                        <TableHead className="w-[140px] min-w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="PO No."
                            placeholder="ค้นหา PO..."
                            value={whSearch.po}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, po: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, po: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[160px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Supplier"
                            placeholder="ค้นหา Supplier..."
                            value={whSearch.supplier}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, supplier: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, supplier: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="SKU / LOT"
                            placeholder="ค้นหา SKU/LOT..."
                            value={whSearch.sku_lot}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, sku_lot: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, sku_lot: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[160px] min-w-[150px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Code"
                            placeholder="ค้นหา Code..."
                            value={whSearch.code}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, code: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, code: '' }))}
                          />
                        </TableHead>
                        <TableHead className="min-w-[180px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Name"
                            placeholder="ค้นหา Name / หมายเหตุ..."
                            value={whSearch.name}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, name: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, name: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[110px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Qty"
                            placeholder="ค้นหา Qty..."
                            value={whSearch.qty}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, qty: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, qty: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[100px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Warehouse"
                            placeholder="ค้นหา คลัง..."
                            value={whSearch.warehouse}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, warehouse: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, warehouse: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[150px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Receive Date / Control"
                            placeholder="ค้นหา วันที่/Control..."
                            value={whSearch.receive_date}
                            onChange={(val) => setWhSearch(prev => ({ ...prev, receive_date: val }))}
                            onClear={() => setWhSearch(prev => ({ ...prev, receive_date: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[175px] p-2 align-top">
                          <div className="flex flex-col gap-1 w-full py-1">
                            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-700">
                              <span>Status</span>
                              <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-slate-400'}`} />
                            </div>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-[11px] w-full bg-white border-slate-200 px-1.5 py-0 font-normal">
                                <SelectValue placeholder="ทุกสถานะ" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Status (ทั้งหมด)</SelectItem>
                                <SelectItem value="PENDING_DELIVERY">Ordered รอรับเข้า</SelectItem>
                                <SelectItem value="RECEIVED">Received รับของแล้ว</SelectItem>
                                <SelectItem value="WAITING_QC">Quarantined แจ้งสุ่ม</SelectItem>
                                <SelectItem value="QC_PASS">QC Passed</SelectItem>
                                <SelectItem value="DELAYED">Delayed เข้าล่าช้า</SelectItem>
                                <SelectItem value="REJECTED">Rejected ไม่ผ่าน</SelectItem>
                                <SelectItem value="REVISED">Revised รอรับเข้ารอบใหม่</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warehouseItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold text-orange-600">
                            {item.eta_date ? (
                              <div className="flex items-center gap-1.5">
                                 <Truck className="w-4 h-4 text-orange-500" />
                                 {new Date(item.eta_date).toLocaleDateString('th-TH')}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-700">{item.po_no}</TableCell>
                          <TableCell className="line-clamp-2 break-words text-wrap">{item.supplier}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm font-bold text-[#D4AF37]">{getDisplaySku(item)}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{getDisplayLot(item)}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-700">{item.rm_code}</TableCell>
                          <TableCell>
                            <div className="text-slate-600 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                            {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                {item.bottom_remark.split('/')[0].trim()}
                              </div>
                            )}
                            {item.remark && (
                              <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200/70 px-1.5 py-0.5 rounded mt-1 flex items-start gap-1 max-w-[200px]" title={item.remark}>
                                <span className="font-bold shrink-0">💬 หมายเหตุรับเข้า:</span>
                                <span className="truncate">{item.remark}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            <div>{item.quantity} {item.unit}</div>
                            {item.status === 'RECEIVED' && item.received_qty != null && (
                              <div className={`text-[10px] font-bold mt-0.5 ${item.received_qty !== item.quantity ? 'text-amber-600' : 'text-emerald-600'}`}>
                                รับจริง: {Number(item.received_qty).toLocaleString()} {item.unit}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{item.warehouse}</TableCell>
                          <TableCell>
                            {item.receive_date ? (() => {
                              const d = new Date(item.receive_date.endsWith('Z') || item.receive_date.includes('+') ? item.receive_date : item.receive_date + 'Z');
                              return (
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700 text-sm">{d.toLocaleDateString('th-TH')}</span>
                                  <span className="text-xs text-slate-500">{d.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>
                                  {item.control_no && (
                                    <button
                                      type="button"
                                      onClick={() => openQuarantineTagForItem(item)}
                                      className="font-mono font-bold text-xs text-purple-700 mt-1 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 px-1.5 py-0.5 rounded border border-purple-200/60 inline-flex items-center gap-1 w-fit transition-colors group cursor-pointer shadow-xs"
                                      title="คลิกเพื่อพิมพ์ป้ายกักกัน (Quarantine Tag 100x80 มม.)"
                                    >
                                      <Printer className="w-3 h-3 text-purple-500 group-hover:text-purple-700" />
                                      <span>{item.control_no}</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })() : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const canWarehouseEdit = currentUser?.toUpperCase().startsWith('MM') || 
                                                       currentUser?.toUpperCase().startsWith('WH') || 
                                                       currentUser?.toUpperCase().startsWith('ADMIN') || 
                                                       userRole === 'admin';

                              if (!canWarehouseEdit) {
                                return getStatusBadge(item.status);
                              }

                              if (item.status === 'READY' || item.status === 'QC_PASS' || item.status === 'PASSED') {
                                return getStatusBadge('QC_PASS');
                              }

                              if (item.status === 'REJECTED') {
                                return getStatusBadge('REJECTED');
                              }

                              if (item.status === 'RECEIVED') {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <Select 
                                      value="RECEIVED" 
                                      onValueChange={(val) => val && handleStatusChange(item, val)}
                                    >
                                      <SelectTrigger className="w-[155px] h-8 text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="RECEIVED">Received รับของแล้ว</SelectItem>
                                        <SelectItem value="WAITING_QC">Quarantined แจ้งสุ่ม 📢</SelectItem>
                                        <SelectItem value="PENDING_DELIVERY">ยกเลิกรับเข้า (รอรับใหม่)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => openQuarantineTagForItem(item)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded shrink-0"
                                      title="พิมพ์ป้ายกักกัน (Quarantine Tag 100x80 มม.)"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-purple-600" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => openReceiveModal(item)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded shrink-0"
                                      title="แก้ไขข้อมูลรับเข้า / Control No. / ยอดจริง / หมายเหตุ"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                );
                              }

                              if (item.status === 'WAITING_QC' || item.status === 'QUARANTINED') {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <Select 
                                      value="WAITING_QC" 
                                      onValueChange={(val) => val && handleStatusChange(item, val)}
                                    >
                                      <SelectTrigger className="w-[155px] h-8 text-xs font-semibold bg-amber-50 text-amber-800 border-amber-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="WAITING_QC">Quarantined แจ้งสุ่ม</SelectItem>
                                        <SelectItem value="RECEIVED">Received รับของแล้ว</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => openQuarantineTagForItem(item)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded shrink-0"
                                      title="พิมพ์ป้ายกักกัน (Quarantine Tag 100x80 มม.)"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-purple-600" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => openReceiveModal(item)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded shrink-0"
                                      title="แก้ไขข้อมูลรับเข้า / Control No. / ยอดจริง / หมายเหตุ"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                );
                              }

                              const currentVal = item.status === 'DELAYED' ? 'DELAYED' : (item.status === 'REVISED' ? 'REVISED' : 'PENDING_DELIVERY');
                              const currentLabel = item.status === 'DELAYED' ? 'Delayed เข้าล่าช้า' : (item.status === 'REVISED' ? 'Revised รอรับเข้ารอบใหม่' : 'Ordered รอรับเข้า');

                              return (
                                <Select 
                                  value={currentVal} 
                                  onValueChange={(val) => val && handleStatusChange(item, val)}
                                >
                                  <SelectTrigger className="w-[155px] h-8 text-xs font-medium">
                                    <SelectValue>{currentLabel}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={currentVal}>{currentLabel}</SelectItem>
                                    <SelectItem value="RECEIVED">Received รับของแล้ว</SelectItem>
                                  </SelectContent>
                                </Select>
                              );
                            })()}
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
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-700">QC Status (รายการรอตรวจ)</CardTitle>
                <div className="flex items-center gap-2">
                  {qcActiveCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearQcSearch} 
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-100/50 px-2 flex items-center gap-1 font-medium"
                    >
                      <X className="w-3.5 h-3.5" /> ล้างการค้นหาคอลัมน์ ({qcActiveCount})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportQC}
                    className="h-8 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Excel (QC)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="text-sm min-w-[1250px]">
                    <TableHeader className="bg-[#F8F6F0]/">
                      <TableRow className="border-b border-slate-200">
                        <TableHead className="w-[140px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Receive Date"
                            placeholder="ค้นหา วันที่..."
                            value={qcSearch.receive_date}
                            onChange={(val) => setQcSearch(prev => ({ ...prev, receive_date: val }))}
                            onClear={() => setQcSearch(prev => ({ ...prev, receive_date: '' }))}
                            sortElement={
                              <div 
                                className="cursor-pointer hover:text-purple-700 transition-colors p-0.5 rounded"
                                onClick={() => {
                                  if (qcReceiveDateSort === 'asc') setQcReceiveDateSort('desc');
                                  else if (qcReceiveDateSort === 'desc') setQcReceiveDateSort(null);
                                  else { setQcReceiveDateSort('asc'); setQcControlNoSort(null); }
                                }}
                                title="เรียงตาม Receive Date"
                              >
                                {qcReceiveDateSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : 
                                 qcReceiveDateSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : 
                                 <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                              </div>
                            }
                          />
                        </TableHead>
                        <TableHead className="w-[140px] min-w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="PO No."
                            placeholder="ค้นหา PO..."
                            value={qcSearch.po}
                            onChange={(val) => setQcSearch(prev => ({ ...prev, po: val }))}
                            onClear={() => setQcSearch(prev => ({ ...prev, po: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Control No."
                            placeholder="ค้นหา Control No..."
                            value={qcSearch.control_no}
                            onChange={(val) => setQcSearch(prev => ({ ...prev, control_no: val }))}
                            onClear={() => setQcSearch(prev => ({ ...prev, control_no: '' }))}
                            sortElement={
                              <div 
                                className="cursor-pointer hover:text-purple-900 transition-colors p-0.5 rounded"
                                onClick={() => {
                                  if (qcControlNoSort === 'asc') setQcControlNoSort('desc');
                                  else if (qcControlNoSort === 'desc') setQcControlNoSort(null);
                                  else { setQcControlNoSort('asc'); setQcReceiveDateSort(null); }
                                }}
                                title="เรียงตาม Control No."
                              >
                                {qcControlNoSort === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-600" /> : 
                                 qcControlNoSort === 'desc' ? <ArrowDown className="w-3 h-3 text-purple-600" /> : 
                                 <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                              </div>
                            }
                          />
                        </TableHead>
                        <TableHead className="w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="SKU / LOT"
                            placeholder="ค้นหา SKU/LOT..."
                            value={qcSearch.sku_lot}
                            onChange={(val) => setQcSearch(prev => ({ ...prev, sku_lot: val }))}
                            onClear={() => setQcSearch(prev => ({ ...prev, sku_lot: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[160px] min-w-[150px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Code"
                            placeholder="ค้นหา Code..."
                            value={qcSearch.code}
                            onChange={(val) => setQcSearch(prev => ({ ...prev, code: val }))}
                            onClear={() => setQcSearch(prev => ({ ...prev, code: '' }))}
                          />
                        </TableHead>
                        <TableHead className="min-w-[180px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Name"
                            placeholder="ค้นหา Name / หมายเหตุ..."
                            value={qcSearch.name}
                            onChange={(val) => setQcSearch(prev => ({ ...prev, name: val }))}
                            onClear={() => setQcSearch(prev => ({ ...prev, name: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[155px] p-2 align-top">
                          <div className="flex flex-col gap-1 w-full py-1">
                            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-700">
                              <span>Status</span>
                              <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-slate-400'}`} />
                            </div>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-[11px] w-full bg-white border-slate-200 px-1.5 py-0 font-normal">
                                <SelectValue placeholder="ทุกสถานะ" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Status (ทั้งหมด)</SelectItem>
                                <SelectItem value="PENDING_DELIVERY">Ordered รอรับเข้า</SelectItem>
                                <SelectItem value="RECEIVED">Received รับของแล้ว</SelectItem>
                                <SelectItem value="WAITING_QC">Quarantined แจ้งสุ่ม</SelectItem>
                                <SelectItem value="QC_PASS">QC Passed</SelectItem>
                                <SelectItem value="DELAYED">Delayed เข้าล่าช้า</SelectItem>
                                <SelectItem value="REJECTED">Rejected ไม่ผ่าน</SelectItem>
                                <SelectItem value="REVISED">Revised รอรับเข้ารอบใหม่</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                        <TableHead className="w-[145px] p-2 align-top">
                          <div className="flex flex-col gap-1 w-full py-1">
                            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-700">
                              <span>QC Status</span>
                              <Filter className={`w-3 h-3 ${qcStatusSearch !== 'ALL' ? 'text-purple-600 fill-purple-600' : 'text-slate-400'}`} />
                            </div>
                            <Select value={qcStatusSearch} onValueChange={(val) => setQcStatusSearch(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-[11px] w-full bg-white border-slate-200 px-1.5 py-0 font-normal">
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
                      {qcItems.map((item, index) => (
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
                          <TableCell className="font-medium text-slate-700 whitespace-nowrap">{item.po_no}</TableCell>
                          <TableCell>
                            <div className="font-bold text-purple-700">{item.control_no || '-'}</div>
                            {item.received_qty != null && (
                              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                รับจริง: {Number(item.received_qty).toLocaleString()} {item.unit}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm font-bold text-[#D4AF37]">{getDisplaySku(item)}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{getDisplayLot(item)}</div>
                          </TableCell>
                          <TableCell className="font-medium text-purple-700 whitespace-nowrap">
                             {item.rm_code}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-600 line-clamp-2 break-words text-wrap" title={item.rm_name}>{item.rm_name}</div>
                            {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                {item.bottom_remark.split('/')[0].trim()}
                              </div>
                            )}
                            {item.remark && (
                              <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200/70 px-1.5 py-0.5 rounded mt-1 flex items-start gap-1 max-w-[220px]" title={item.remark}>
                                <span className="font-bold shrink-0">💬 แจ้ง QC:</span>
                                <span className="truncate">{item.remark}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.status)}
                          </TableCell>
                          <TableCell>
                            {(currentUser?.toUpperCase().startsWith('QC') || currentUser?.toUpperCase().startsWith('ADMIN') || userRole === 'admin') ? (
                              <Select 
                                value={item.qc_status || 'QUARANTINED'} 
                                onValueChange={(val) => val && handleQcStatusChange(item, val)}
                              >
                                <SelectTrigger className={`w-[130px] h-8 text-xs font-semibold ${getQcColor(item.qc_status || 'QUARANTINED')}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="QUARANTINED">QUARANTINED</SelectItem>
                                  <SelectItem value="PASSED">PASSED</SelectItem>
                                  <SelectItem value="HOLD">HOLD</SelectItem>
                                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className={`inline-flex items-center justify-center w-[130px] h-8 text-xs font-medium rounded-md shadow-sm ${getQcColor(item.qc_status || 'QUARANTINED')}`}>
                                {item.qc_status || 'QUARANTINED'}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {qcItems.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-500 bg-white">ไม่มีรายการรอตรวจ QC</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-6">
             <Card className="shadow-sm">
              <CardHeader className="bg-[#F8F6F0]/ border-b pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-700">{mainTab === 'rm' ? 'RM' : 'PM'} Readiness (เรียงตาม LOT การผลิต)</CardTitle>
                <div className="flex items-center gap-2">
                  {planActiveCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearPlanSearch} 
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-100/50 px-2 flex items-center gap-1 font-medium"
                    >
                      <X className="w-3.5 h-3.5" /> ล้างการค้นหาคอลัมน์ ({planActiveCount})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportPlanning}
                    className="h-8 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Excel (Planning)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-md border-0 overflow-x-auto">
                  <Table className="text-sm min-w-[1300px]">
                    <TableHeader className="bg-[#F8F6F0]/">
                      <TableRow>
                        <TableHead className="w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="SKU / LOT"
                            placeholder="ค้นหา SKU/LOT..."
                            value={planSearch.sku_lot}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, sku_lot: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, sku_lot: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[125px] p-2 align-top">
                          <ColumnSearchInput 
                            title={`คิว${mainTab === 'rm' ? 'ชั่งสาร' : 'บรรจุ'} (วันที่)`}
                            placeholder="ค้นหา วันที่คิว..."
                            value={planSearch.queue_date}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, queue_date: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, queue_date: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[140px] min-w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="PO No."
                            placeholder="ค้นหา PO..."
                            value={planSearch.po}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, po: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, po: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[120px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Control No."
                            placeholder="ค้นหา Control No..."
                            value={planSearch.control_no}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, control_no: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, control_no: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[160px] min-w-[150px] p-2 align-top">
                          <ColumnSearchInput 
                            title={`${mainTab === 'rm' ? 'RM' : 'PM'} Code`}
                            placeholder="ค้นหา Code..."
                            value={planSearch.code}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, code: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, code: '' }))}
                          />
                        </TableHead>
                        <TableHead className="min-w-[180px] p-2 align-top">
                          <ColumnSearchInput 
                            title={`${mainTab === 'rm' ? 'RM' : 'PM'} Name`}
                            placeholder="ค้นหา Name / หมายเหตุ..."
                            value={planSearch.name}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, name: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, name: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[110px] p-2 align-top">
                          <ColumnSearchInput 
                            title="Required Qty"
                            placeholder="ค้นหา Qty..."
                            value={planSearch.qty}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, qty: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, qty: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[140px] p-2 align-top">
                          <ColumnSearchInput 
                            title="ETA"
                            placeholder="ค้นหา ETA..."
                            value={planSearch.eta}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, eta: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, eta: '' }))}
                            sortElement={
                              <div 
                                className="cursor-pointer hover:text-[#D4AF37] transition-colors p-0.5 rounded"
                                onClick={() => setEtaSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                                title="เรียงตาม ETA"
                              >
                                {etaSort === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : 
                                 etaSort === 'desc' ? <ArrowDown className="w-3 h-3 text-[#D4AF37]" /> : 
                                 <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                              </div>
                            }
                          />
                        </TableHead>
                        <TableHead className="w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="วันที่คลังรับเข้า"
                            placeholder="ค้นหา วันที่รับ..."
                            value={planSearch.receive_date}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, receive_date: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, receive_date: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[130px] p-2 align-top">
                          <ColumnSearchInput 
                            title="วันที่ QC pass"
                            placeholder="ค้นหา สถานะ/วันที่..."
                            value={planSearch.qc_date}
                            onChange={(val) => setPlanSearch(prev => ({ ...prev, qc_date: val }))}
                            onClear={() => setPlanSearch(prev => ({ ...prev, qc_date: '' }))}
                          />
                        </TableHead>
                        <TableHead className="w-[155px] p-2 align-top">
                          <div className="flex flex-col gap-1 w-full py-1">
                            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-700">
                              <span>Status</span>
                              <Filter className={`w-3.5 h-3.5 ${statusFilter !== 'ALL' ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-slate-400'}`} />
                            </div>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                              <SelectTrigger className="h-6 text-[11px] w-full bg-white border-slate-200 px-1.5 py-0 font-normal">
                                <SelectValue placeholder="ทุกสถานะ" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All Status (ทั้งหมด)</SelectItem>
                                <SelectItem value="PENDING_DELIVERY">Ordered รอรับเข้า</SelectItem>
                                <SelectItem value="RECEIVED">Received รับของแล้ว</SelectItem>
                                <SelectItem value="WAITING_QC">Quarantined แจ้งสุ่ม</SelectItem>
                                <SelectItem value="QC_PASS">QC Passed</SelectItem>
                                <SelectItem value="DELAYED">Delayed เข้าล่าช้า</SelectItem>
                                <SelectItem value="REJECTED">Rejected ไม่ผ่าน</SelectItem>
                                <SelectItem value="REVISED">Revised รอรับเข้ารอบใหม่</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planningItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="h-32 text-center text-slate-400 text-sm">
                            ไม่พบรายการวัตถุดิบ/บรรจุภัณฑ์ตามเงื่อนไขที่เลือก
                          </TableCell>
                        </TableRow>
                      ) : (
                        planningItems.map((item) => {
                          const targetDate = item.targetDate;
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
                            <TableCell className="whitespace-nowrap">
                              <div className="text-sm font-bold text-[#D4AF37]">{getDisplaySku(item)}</div>
                              <div className="text-xs text-slate-500 font-medium mt-0.5">{getDisplayLot(item)}</div>
                            </TableCell>
                            <TableCell className="text-slate-600 font-medium">
                              {targetDate ? targetDate.toLocaleDateString('th-TH') : '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-[#D4AF37] text-xs whitespace-nowrap">
                              {item.po_no || '-'}
                            </TableCell>
                            <TableCell>
                              {item.control_no ? (
                                <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60 inline-block">
                                  {item.control_no}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-purple-700 whitespace-nowrap">{item.rm_code}</TableCell>
                            <TableCell>
                              <div className="line-clamp-2 break-words" title={item.rm_name}>{item.rm_name}</div>
                              {item.bottom_remark && item.bottom_remark.toUpperCase().includes('FOR') && (
                                <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded-sm mt-1 leading-tight whitespace-normal max-w-[150px]" title={item.bottom_remark}>
                                  {item.bottom_remark.split('/')[0].trim()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">{item.quantity} {item.unit}</TableCell>
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
                            <TableCell>
                              {item.receive_date ? (() => {
                                const d = new Date(item.receive_date.endsWith('Z') || item.receive_date.includes('+') ? item.receive_date : item.receive_date + 'Z');
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-700 text-xs">{d.toLocaleDateString('th-TH')}</span>
                                    <span className="text-[11px] text-slate-500">{d.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>
                                  </div>
                                );
                              })() : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const rawDate = item.released_date || (item.qc_status === 'PASSED' ? item.updated_at : null);
                                if (rawDate && (item.qc_status === 'PASSED' || item.status === 'READY' || item.status === 'QC_PASS')) {
                                  const d = new Date(rawDate.endsWith('Z') || rawDate.includes('+') ? rawDate : rawDate + 'Z');
                                  return (
                                    <div className="flex flex-col">
                                      <span className="font-medium text-green-700 text-xs flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                        {d.toLocaleDateString('th-TH')}
                                      </span>
                                      <span className="text-[11px] text-slate-500 pl-4.5">{d.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span>
                                    </div>
                                  );
                                }
                                if (item.qc_status === 'PASSED' || item.status === 'READY' || item.status === 'QC_PASS') {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                                      <CheckCircle2 className="w-3 h-3 text-green-600" /> ผ่านแล้ว
                                    </span>
                                  );
                                }
                                if (item.qc_status === 'HOLD') {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                      ⚠️ QC HOLD
                                    </span>
                                  );
                                }
                                if (item.qc_status === 'REJECTED' || item.status === 'REJECTED') {
                                  return (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                      ✕ REJECTED
                                    </span>
                                  );
                                }
                                if (item.status === 'REVISED') {
                                  return (
                                    <span className="text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                                      รอรับเข้ารอบใหม่
                                    </span>
                                  );
                                }
                                if (item.status === 'WAITING_QC' || item.qc_status === 'QUARANTINED') {
                                  return (
                                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                      Quarantined แจ้งสุ่ม
                                    </span>
                                  );
                                }
                                if (item.receive_date) {
                                  return (
                                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                      รับแล้ว (รอตรวจ)
                                    </span>
                                  );
                                }
                                return <span className="text-slate-400 text-xs">-</span>;
                              })()}
                            </TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                          </TableRow>
                          );
                        })
                      )}
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
        <DialogContent className="sm:max-w-md md:max-w-xl w-full">
          <DialogHeader>
            <DialogTitle className="text-[#4A4238] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D4AF37]" />
              รับเข้าบรรจุภัณฑ์ลูกค้า (CMD2)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCmd2Submit} className="space-y-4 py-3">
            {/* Quick Part Selector Dropdown */}
            <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 p-3 rounded-xl border border-[#D4AF37]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  ⚡ เลือกพาร์ทเดิม (ดึงชื่อลูกค้า, รหัส, และชื่อพาร์ทให้อัตโนมัติ)
                </Label>
                <span className="text-[10px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full font-semibold">
                  มี {cmd2PartOptions.length} รายการ
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  value={cmd2SearchQuery}
                  onChange={e => {
                    setCmd2SearchQuery(e.target.value);
                    setIsCmd2SearchOpen(true);
                  }}
                  onFocus={() => setIsCmd2SearchOpen(true)}
                  onBlur={() => setTimeout(() => setIsCmd2SearchOpen(false), 200)}
                  placeholder="พิมพ์ค้นหา เช่น 301, JHD, ขวด, ฝา, กล่อง, นัตตี้, CMD2..."
                  className="pl-9 pr-8 text-xs bg-white border-amber-300 focus:border-[#D4AF37] h-9 shadow-inner placeholder:text-slate-400"
                />
                {cmd2SearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCmd2SearchQuery('');
                      setIsCmd2SearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="ล้างคำค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Dropdown Options List */}
                {isCmd2SearchOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-amber-200 shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredCmd2Options.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        ไม่พบพาร์ทที่ตรงกับคำค้นหา (สามารถพิมพ์กรอกข้อมูลใหม่ด้านล่างได้เลย)
                      </div>
                    ) : (
                      filteredCmd2Options.map((opt, idx) => (
                        <div
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCmd2Part(opt);
                          }}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer transition-colors flex items-start justify-between gap-2 group"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                {opt.code}
                              </span>
                              {opt.sku && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                  SKU: {opt.sku}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 font-medium truncate">
                                👤 {opt.supplier || 'ลูกค้าทั่วไป'}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-900 line-clamp-1">
                              {opt.name}
                            </div>
                          </div>
                          <span className="text-[11px] text-[#D4AF37] font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 self-center">
                            เลือก ↵
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ชื่อลูกค้า (Customer Name) <span className="text-red-500">*</span></Label>
              <Input 
                required 
                list="cmd2-customer-datalist"
                value={cmd2Form.customerName} 
                onChange={e => setCmd2Form({...cmd2Form, customerName: e.target.value})} 
                placeholder="เช่น บริษัท เอบีซี จำกัด หรือเลือกจากตัวช่วยด้านบน" 
              />
              <datalist id="cmd2-customer-datalist">
                {uniqueCustomerList.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสบรรจุภัณฑ์ (PM Code)</Label>
                <Input value={cmd2Form.pmCode} onChange={e => setCmd2Form({...cmd2Form, pmCode: e.target.value})} placeholder="ปล่อยว่างเพื่อให้ระบบสร้างให้ (CMD2-xxx)" />
              </div>
              <div className="space-y-2">
                <Label>ชื่อบรรจุภัณฑ์ (PM Name) <span className="text-red-500">*</span></Label>
                <Input required value={cmd2Form.pmName} onChange={e => setCmd2Form({...cmd2Form, pmName: e.target.value})} placeholder="เช่น กล่องใส่ครีม 50g" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวนรับเข้าทั้งหมด (ชิ้น) <span className="text-red-500">*</span></Label>
                <Input 
                  ref={cmd2QtyInputRef}
                  required 
                  type="number" 
                  min="1" 
                  value={cmd2Form.quantity} 
                  onChange={e => handleCmd2QuantityChange(e.target.value)} 
                  placeholder="เช่น 10552"
                  className="font-bold text-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label>LOT งานผลิตอ้างอิง</Label>
                <Input value={cmd2Form.lotProduct} onChange={e => setCmd2Form({...cmd2Form, lotProduct: e.target.value})} placeholder="L.XXXX (ถ้ามี)" />
              </div>
            </div>

            {/* Packaging Breakdown for Quarantine Tag */}
            {(() => {
              const effectivePkg = cmd2Form.packageType === 'อื่นๆ' 
                ? (cmd2Form.customPackageType.trim() || 'ภาชนะ') 
                : (cmd2Form.packageType || 'ลัง');
              const fullCount = parseInt(cmd2Form.boxCount, 10) || 0;
              const fullQty = parseFloat(cmd2Form.qtyPerBox) || 0;
              const oddCount = parseInt(cmd2Form.oddBoxCount, 10) || 0;
              const oddQty = parseFloat(cmd2Form.oddQtyPerBox) || 0;
              const calcTotal = (fullCount * fullQty) + (oddCount * oddQty);
              const targetTotal = parseFloat(cmd2Form.quantity) || 0;
              const isMatch = targetTotal > 0 && calcTotal === targetTotal;
              const totalUnits = fullCount + oddCount;

              return (
                <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-amber-200/60">
                    <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-600" />
                      ข้อมูลภาชนะบรรจุ & ยอดแบ่งกล่อง (สำหรับพิมพ์ Quarantine Tag 100x80 มม.)
                    </Label>
                    <div className="flex items-center gap-1.5">
                      {targetTotal > 0 && fullQty > 0 && (
                        <button
                          type="button"
                          onClick={handleCmd2AutoSplitRemainder}
                          className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="คำนวณจำนวนกล่องเต็มและเศษอัตโนมัติจากยอดรับเข้าและยอดต่อภาชนะเต็ม"
                        >
                          ⚡ คำนวณเศษอัตโนมัติ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Container / Packaging Type Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-amber-950">
                        ประเภทภาชนะบรรจุ <span className="text-red-500">*</span>
                      </Label>
                      <select
                        value={cmd2Form.packageType}
                        onChange={e => setCmd2Form({ ...cmd2Form, packageType: e.target.value })}
                        className="w-full h-8 text-xs font-bold bg-white text-slate-800 border border-amber-300 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="ลัง">ลัง (Box/Carton)</option>
                        <option value="กล่อง">กล่อง (Box)</option>
                        <option value="ถัง">ถัง (Drum/Pail)</option>
                        <option value="ถุง">ถุง (Bag)</option>
                        <option value="หีบ">หีบ (Chest)</option>
                        <option value="ห่อ">ห่อ (Pack/Bundle)</option>
                        <option value="พาเลท">พาเลท (Pallet)</option>
                        <option value="กระป๋อง">กระป๋อง (Can)</option>
                        <option value="ม้วน">ม้วน (Roll)</option>
                        <option value="อื่นๆ">อื่นๆ (เว้นว่างไว้พิมพ์ระบุเอง)</option>
                      </select>
                    </div>

                    {cmd2Form.packageType === 'อื่นๆ' ? (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-amber-950">
                          ระบุประเภทภาชนะเอง <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={cmd2Form.customPackageType}
                          onChange={e => setCmd2Form({ ...cmd2Form, customPackageType: e.target.value })}
                          placeholder="เช่น ฟอยล์, ซอง, กระสอบ, แกลลอน"
                          className="h-8 text-xs font-bold bg-white border-amber-300"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">LOT ผู้ผลิต (Supplier Lot)</Label>
                        <Input 
                          value={cmd2Form.mfgLot} 
                          onChange={e => setCmd2Form({ ...cmd2Form, mfgLot: e.target.value })} 
                          placeholder="เช่น 2609A หรือ -"
                          className="h-8 text-xs bg-white font-mono" 
                        />
                      </div>
                    )}
                  </div>

                  {cmd2Form.packageType === 'อื่นๆ' && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">LOT ผู้ผลิต (Supplier Lot)</Label>
                      <Input 
                        value={cmd2Form.mfgLot} 
                        onChange={e => setCmd2Form({ ...cmd2Form, mfgLot: e.target.value })} 
                        placeholder="เช่น 2609A หรือ -"
                        className="h-8 text-xs bg-white font-mono" 
                      />
                    </div>
                  )}

                  {/* Full & Odd Packaging Breakdown Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Full Container Group */}
                    <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>📦 {effectivePkg}เต็ม</span>
                        <span className="text-[10px] font-semibold text-slate-500">ยอดปกติ</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600">
                          จำนวน{effectivePkg}เต็ม <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={cmd2Form.boxCount} 
                          onChange={e => handleCmd2BoxCountChange(e.target.value)} 
                          placeholder="เช่น 7"
                          className="h-8 text-xs bg-white font-bold text-center" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600">
                          จำนวนชิ้น/{effectivePkg}เต็ม <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={cmd2Form.qtyPerBox} 
                          onChange={e => setCmd2Form({ ...cmd2Form, qtyPerBox: e.target.value })} 
                          placeholder="เช่น 1300"
                          className="h-8 text-xs bg-white font-bold text-center" 
                        />
                      </div>
                    </div>

                    {/* Odd Container Group */}
                    <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-300/80 space-y-2">
                      <div className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                        <span>🟠 {effectivePkg}เศษ (Odd)</span>
                        <span className="text-[10px] font-normal text-amber-800">ใส่ 0 หากไม่มีเศษ</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-amber-900">
                          จำนวน{effectivePkg}เศษ
                        </Label>
                        <Input 
                          type="number" 
                          min="0" 
                          value={cmd2Form.oddBoxCount} 
                          onChange={e => setCmd2Form({ ...cmd2Form, oddBoxCount: e.target.value })} 
                          placeholder="0"
                          className="h-8 text-xs bg-white font-bold text-center text-amber-950 border-amber-300" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-amber-900">
                          จำนวนชิ้น/{effectivePkg}เศษ
                        </Label>
                        <Input 
                          type="number" 
                          min="0" 
                          value={cmd2Form.oddQtyPerBox} 
                          onChange={e => setCmd2Form({ ...cmd2Form, oddQtyPerBox: e.target.value })} 
                          placeholder="0"
                          className="h-8 text-xs bg-white font-bold text-center text-amber-950 border-amber-300" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Summary and Validation */}
                  <div className="text-xs pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-medium">
                      <span className="text-slate-700">
                        🏷️ <strong>พิมพ์สติกเกอร์รวม:</strong> {totalUnits} ใบ ({fullCount} {effectivePkg}เต็ม{oddCount > 0 ? ` + ${oddCount} ${effectivePkg}เศษ` : ''})
                      </span>
                      {targetTotal > 0 && (
                        isMatch ? (
                          <span className="font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                            ✓ ยอดแบ่งครบ {calcTotal.toLocaleString()} ชิ้น ตรงกับยอดรับเข้า
                          </span>
                        ) : (
                          <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            ⚠️ ยอดแบ่งรวม {calcTotal.toLocaleString()} ชิ้น (ยอดรับเข้า {targetTotal.toLocaleString()} ชิ้น)
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono pt-1">
                      รูปแบบบันทึก: ({fullCount} {effectivePkg} x {fullQty.toLocaleString()} ชิ้น{oddCount > 0 ? ` + ${oddCount} ${effectivePkg}เศษ x ${oddQty.toLocaleString()} ชิ้น` : ''}){cmd2Form.mfgLot && cmd2Form.mfgLot !== '-' ? ` Lot.${cmd2Form.mfgLot}` : ''}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>คลังสินค้า (Warehouse)</Label>
                <Input value={cmd2Form.warehouse} onChange={e => setCmd2Form({...cmd2Form, warehouse: e.target.value})} placeholder="MMPM" />
              </div>
              <div className="space-y-2">
                <Label>Control No. (เลขคุมรับเข้า)</Label>
                <Input 
                  value={cmd2Form.controlNo} 
                  onChange={e => setCmd2Form({...cmd2Form, controlNo: e.target.value})} 
                  placeholder="P260915-01" 
                  className="font-mono font-bold text-purple-700 bg-purple-50"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => setIsCmd2ModalOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={uploading} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />} 
                รับเข้า PM & พิมพ์ Quarantine Tag 🏷️
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Supplied RM (R4) Modal */}
      <Dialog open={isR4ModalOpen} onOpenChange={setIsR4ModalOpen}>
        <DialogContent className="sm:max-w-md md:max-w-xl w-full">
          <DialogHeader>
            <DialogTitle className="text-[#4A4238] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              รับเข้าวัตถุดิบลูกค้า (R4)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleR4Submit} className="space-y-4 py-3">
            {/* Quick RM Selector Dropdown */}
            <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 p-3 rounded-xl border border-[#D4AF37]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  ⚡ เลือกวัตถุดิบเดิม (ดึงชื่อลูกค้า, รหัส, และหน่วย ให้อัตโนมัติ)
                </Label>
                <span className="text-[10px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full font-semibold">
                  มี {r4PartOptions.length} รายการ
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  value={r4SearchQuery}
                  onChange={e => {
                    setR4SearchQuery(e.target.value);
                    setIsR4SearchOpen(true);
                  }}
                  onFocus={() => setIsR4SearchOpen(true)}
                  onBlur={() => setTimeout(() => setIsR4SearchOpen(false), 200)}
                  placeholder="พิมพ์ค้นหา เช่น สารสกัด, R4, น้ำมัน, ชาเขียว..."
                  className="pl-9 pr-8 text-xs bg-white border-amber-300 focus:border-[#D4AF37] h-9 shadow-inner placeholder:text-slate-400"
                />
                {r4SearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setR4SearchQuery('');
                      setIsR4SearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="ล้างคำค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Dropdown Options List */}
                {isR4SearchOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-amber-200 shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {filteredR4Options.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        ไม่พบวัตถุดิบที่ตรงกับคำค้นหา (สามารถพิมพ์กรอกข้อมูลใหม่ด้านล่างได้เลย)
                      </div>
                    ) : (
                      filteredR4Options.map((opt, idx) => (
                        <div
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectR4Part(opt);
                          }}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer transition-colors flex items-start justify-between gap-2 group"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {opt.code}
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                หน่วย: {opt.unit}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium truncate">
                                👤 {opt.supplier || 'ลูกค้าทั่วไป'}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-900 line-clamp-1">
                              {opt.name}
                            </div>
                          </div>
                          <span className="text-[11px] text-[#D4AF37] font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 self-center">
                            เลือก ↵
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ชื่อลูกค้า (Customer / Supplier Name) <span className="text-red-500">*</span></Label>
              <Input 
                required 
                list="cmd2-customer-datalist"
                value={r4Form.customerName} 
                onChange={e => setR4Form({...r4Form, customerName: e.target.value})} 
                placeholder="เช่น บริษัท เอบีซี จำกัด หรือเลือกจากตัวช่วยด้านบน" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสวัตถุดิบ (RM Code)</Label>
                <Input value={r4Form.rmCode} onChange={e => setR4Form({...r4Form, rmCode: e.target.value})} placeholder="ปล่อยว่างเพื่อให้ระบบสร้างให้ (R4-xxx)" />
              </div>
              <div className="space-y-2">
                <Label>ชื่อวัตถุดิบ (RM Name) <span className="text-red-500">*</span></Label>
                <Input required value={r4Form.rmName} onChange={e => setR4Form({...r4Form, rmName: e.target.value})} placeholder="เช่น สารสกัดชาเขียวเข้มข้น 100%" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวนรับเข้าทั้งหมด <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input 
                    ref={r4QtyInputRef}
                    required 
                    type="number" 
                    step="any" 
                    min="0.001" 
                    value={r4Form.quantity} 
                    onChange={e => handleR4QuantityChange(e.target.value)} 
                    placeholder="0.00" 
                    className="font-bold text-slate-800"
                  />
                  <Input value={r4Form.unit} onChange={e => setR4Form({...r4Form, unit: e.target.value})} className="w-20 text-center uppercase font-bold" placeholder="KG" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>LOT งานผลิตอ้างอิง</Label>
                <Input value={r4Form.lotProduct} onChange={e => setR4Form({...r4Form, lotProduct: e.target.value})} placeholder="L.XXXX (ถ้ามี)" />
              </div>
            </div>

            {/* Packaging Breakdown for Quarantine Tag */}
            {(() => {
              const effectivePkg = r4Form.packageType === 'อื่นๆ' 
                ? (r4Form.customPackageType.trim() || 'ภาชนะ') 
                : (r4Form.packageType || 'ถัง');
              const fullCount = parseInt(r4Form.boxCount, 10) || 0;
              const fullQty = parseFloat(r4Form.qtyPerBox) || 0;
              const oddCount = parseInt(r4Form.oddBoxCount, 10) || 0;
              const oddQty = parseFloat(r4Form.oddQtyPerBox) || 0;
              const calcTotal = (fullCount * fullQty) + (oddCount * oddQty);
              const targetTotal = parseFloat(r4Form.quantity) || 0;
              const isMatch = targetTotal > 0 && Math.abs(calcTotal - targetTotal) < 0.001;
              const totalUnits = fullCount + oddCount;

              return (
                <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-emerald-200/60">
                    <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600" />
                      ข้อมูลภาชนะบรรจุ & ยอดแบ่งบรรจุ (สำหรับพิมพ์ Quarantine Tag 100x80 มม.)
                    </Label>
                    <div className="flex items-center gap-1.5">
                      {targetTotal > 0 && fullQty > 0 && (
                        <button
                          type="button"
                          onClick={handleR4AutoSplitRemainder}
                          className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded shadow-xs transition flex items-center gap-1"
                          title="คำนวณแยกภาชนะเต็มและภาชนะเศษให้อัตโนมัติ"
                        >
                          ⚡ คำนวณแบ่งเศษอัตโนมัติ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Container / Packaging Type Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-emerald-950">
                        ประเภทภาชนะบรรจุ <span className="text-red-500">*</span>
                      </Label>
                      <select
                        value={r4Form.packageType}
                        onChange={e => setR4Form({ ...r4Form, packageType: e.target.value })}
                        className="w-full h-8 text-xs font-bold bg-white text-slate-800 border border-emerald-300 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="ถัง">ถัง (Drum/Pail - แนะนำสำหรับ RM)</option>
                        <option value="ถุง">ถุง (Bag)</option>
                        <option value="กล่อง">กล่อง (Box)</option>
                        <option value="ลัง">ลัง (Box/Carton)</option>
                        <option value="หีบ">หีบ (Chest)</option>
                        <option value="ห่อ">ห่อ (Pack/Bundle)</option>
                        <option value="พาเลท">พาเลท (Pallet)</option>
                        <option value="กระป๋อง">กระป๋อง (Can)</option>
                        <option value="ม้วน">ม้วน (Roll)</option>
                        <option value="อื่นๆ">อื่นๆ (เว้นว่างไว้พิมพ์ระบุเอง)</option>
                      </select>
                    </div>

                    {r4Form.packageType === 'อื่นๆ' ? (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-emerald-950">
                          ระบุประเภทภาชนะเอง <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={r4Form.customPackageType}
                          onChange={e => setR4Form({ ...r4Form, customPackageType: e.target.value })}
                          placeholder="เช่น แกลลอน, กระสอบ, บาร์เรล, ปี๊บ"
                          className="h-8 text-xs font-bold bg-white border-emerald-300"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">LOT ผู้ผลิต (Supplier Lot)</Label>
                        <Input 
                          value={r4Form.mfgLot} 
                          onChange={e => setR4Form({ ...r4Form, mfgLot: e.target.value })} 
                          placeholder="เช่น 2609A หรือ -"
                          className="h-8 text-xs bg-white font-mono" 
                        />
                      </div>
                    )}
                  </div>

                  {r4Form.packageType === 'อื่นๆ' && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">LOT ผู้ผลิต (Supplier Lot)</Label>
                      <Input 
                        value={r4Form.mfgLot} 
                        onChange={e => setR4Form({ ...r4Form, mfgLot: e.target.value })} 
                        placeholder="เช่น 2609A หรือ -"
                        className="h-8 text-xs bg-white font-mono" 
                      />
                    </div>
                  )}

                  {/* Full & Odd Packaging Breakdown Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Full Container Group */}
                    <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>📦 {effectivePkg}เต็ม</span>
                        <span className="text-[10px] font-semibold text-slate-500">ยอดปกติ</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600">
                          จำนวน{effectivePkg}เต็ม <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={r4Form.boxCount} 
                          onChange={e => handleR4BoxCountChange(e.target.value)} 
                          placeholder="เช่น 7"
                          className="h-8 text-xs bg-white font-bold text-center" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600">
                          จำนวน/{effectivePkg}เต็ม ({r4Form.unit || 'KG'}) <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          type="number" 
                          step="any"
                          min="0.001" 
                          value={r4Form.qtyPerBox} 
                          onChange={e => setR4Form({ ...r4Form, qtyPerBox: e.target.value })} 
                          placeholder="เช่น 25"
                          className="h-8 text-xs bg-white font-bold text-center" 
                        />
                      </div>
                    </div>

                    {/* Odd Container Group */}
                    <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-300/80 space-y-2">
                      <div className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                        <span>🟠 {effectivePkg}เศษ (Odd)</span>
                        <span className="text-[10px] font-normal text-amber-800">ใส่ 0 หากไม่มีเศษ</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-amber-900">
                          จำนวน{effectivePkg}เศษ
                        </Label>
                        <Input 
                          type="number" 
                          min="0" 
                          value={r4Form.oddBoxCount} 
                          onChange={e => setR4Form({ ...r4Form, oddBoxCount: e.target.value })} 
                          placeholder="0"
                          className="h-8 text-xs bg-white font-bold text-center text-amber-950 border-amber-300" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-amber-900">
                          จำนวน/{effectivePkg}เศษ ({r4Form.unit || 'KG'})
                        </Label>
                        <Input 
                          type="number" 
                          step="any"
                          min="0" 
                          value={r4Form.oddQtyPerBox} 
                          onChange={e => setR4Form({ ...r4Form, oddQtyPerBox: e.target.value })} 
                          placeholder="0"
                          className="h-8 text-xs bg-white font-bold text-center text-amber-950 border-amber-300" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Summary and Validation */}
                  <div className="text-xs pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-medium">
                      <span className="text-slate-700">
                        🏷️ <strong>พิมพ์สติกเกอร์รวม:</strong> {totalUnits} ใบ ({fullCount} {effectivePkg}เต็ม{oddCount > 0 ? ` + ${oddCount} ${effectivePkg}เศษ` : ''})
                      </span>
                      {targetTotal > 0 && (
                        isMatch ? (
                          <span className="font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                            ✓ ยอดแบ่งครบ {calcTotal.toLocaleString()} {r4Form.unit || 'KG'} ตรงกับยอดรับเข้า
                          </span>
                        ) : (
                          <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            ⚠️ ยอดแบ่งรวม {calcTotal.toLocaleString()} (ยอดรับเข้า {targetTotal.toLocaleString()} {r4Form.unit || 'KG'})
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono pt-1">
                      รูปแบบบันทึก: ({fullCount} {effectivePkg} x {fullQty.toLocaleString()} {r4Form.unit || 'KG'}{oddCount > 0 ? ` + ${oddCount} ${effectivePkg}เศษ x ${oddQty.toLocaleString()} ${r4Form.unit || 'KG'}` : ''}){r4Form.mfgLot && r4Form.mfgLot !== '-' ? ` Lot.${r4Form.mfgLot}` : ''}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>คลังสินค้า (Warehouse)</Label>
                <Input value={r4Form.warehouse} onChange={e => setR4Form({...r4Form, warehouse: e.target.value})} placeholder="MMRM" />
              </div>
              <div className="space-y-2">
                <Label>Control No. (เลขคุมรับเข้า)</Label>
                <Input 
                  value={r4Form.controlNo} 
                  onChange={e => setR4Form({...r4Form, controlNo: e.target.value})} 
                  placeholder="R260915-01" 
                  className="font-mono font-bold text-purple-700 bg-purple-50"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => setIsR4ModalOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={uploading} className="bg-[#D4AF37] hover:bg-[#B8962A] text-white font-bold">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />} 
                รับเข้า RM & พิมพ์ Quarantine Tag 🏷️
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Item Modal for Control No, Actual Received Qty, All Master Fields & Remark */}
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-[#D4AF37]/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100/70 text-amber-900 rounded-xl">
                  <Package className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-lg">
                    {receivingItem?.status === 'RECEIVED' || receivingItem?.status === 'WAITING_QC' ? 'แก้ไขข้อมูลการรับเข้าคลังสินค้า' : 'ยืนยันการรับเข้าคลังสินค้า'}
                  </span>
                  <p className="text-xs text-slate-500 font-normal">
                    สามารถแก้ไขข้อมูลได้ทุกช่อง โดยระบบจะบันทึกหมายเหตุการแก้ไขไว้เป็นประวัติ
                  </p>
                </div>
              </div>
              {receivingItem?.status && (
                <Badge variant="outline" className="bg-slate-50 text-slate-700 text-xs shrink-0">
                  {receivingItem.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 1. Master Information (แก้ไขได้ทุกช่อง) */}
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5 text-[#D4AF37]" /> ข้อมูลหลัก (Master Info - แก้ไขได้ทุกช่อง)
                </span>
                <span className="text-[11px] text-slate-500">
                  แก้ไขข้อมูลตามเอกสารจริงได้ทันที
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* รหัสวัตถุดิบ/บรรจุภัณฑ์ */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">รหัสวัตถุดิบ/บรรจุภัณฑ์ <span className="text-red-500">*</span></Label>
                  <Input 
                    value={receiveRmCode} 
                    onChange={e => setReceiveRmCode(e.target.value)} 
                    placeholder="เช่น CMD2-OFT001-N4" 
                    className="text-xs font-mono font-bold bg-white" 
                  />
                </div>

                {/* คลังสินค้า */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">คลังสินค้า (Warehouse) <span className="text-red-500">*</span></Label>
                  <Input 
                    value={receiveWarehouse} 
                    onChange={e => setReceiveWarehouse(e.target.value)} 
                    placeholder="เช่น MMPM, MMRM" 
                    className="text-xs bg-white font-medium" 
                  />
                </div>

                {/* ชื่อรายการ */}
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">ชื่อรายการ (Material / PM Name) <span className="text-red-500">*</span></Label>
                  <Input 
                    value={receiveRmName} 
                    onChange={e => setReceiveRmName(e.target.value)} 
                    placeholder="ระบุชื่อรายการ..." 
                    className="text-xs bg-white" 
                  />
                </div>

                {/* เลขที่ PO */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">เลขที่ PO</Label>
                  <Input 
                    value={receivePoNo} 
                    onChange={e => setReceivePoNo(e.target.value)} 
                    placeholder="เช่น PM-CMD2-332446" 
                    className="text-xs font-mono bg-white" 
                  />
                </div>

                {/* ผู้จำหน่าย */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">ผู้จำหน่าย (Supplier)</Label>
                  <Input 
                    value={receiveSupplier} 
                    onChange={e => setReceiveSupplier(e.target.value)} 
                    placeholder="ระบุชื่อ Supplier..." 
                    className="text-xs bg-white" 
                  />
                </div>

                {/* ยอดสั่งซื้อตาม PO และ หน่วย */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">ยอดสั่งซื้อตาม PO</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={receivePoQty} 
                    onChange={e => setReceivePoQty(e.target.value)} 
                    placeholder="0" 
                    className="text-xs bg-white font-semibold" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">หน่วยนับ (Unit)</Label>
                  <Input 
                    value={receiveUnit} 
                    onChange={e => setReceiveUnit(e.target.value)} 
                    placeholder="เช่น pcs, kg, g, bot" 
                    className="text-xs bg-white" 
                  />
                </div>
              </div>
            </div>

            {/* 2. การรับเข้าจริงและออก Control No. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Actual Received Qty */}
              <div className="space-y-1.5 bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-800 text-xs">
                    ยอดรับเข้าจริง (Actual Qty) <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] text-slate-500">
                    PO: <strong className="text-slate-700">{Number(receivePoQty || 0).toLocaleString()} {receiveUnit}</strong>
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Input 
                    type="number" 
                    step="any"
                    value={receivedQtyInput} 
                    onChange={(e) => handleReceiveQuantityChange(e.target.value)}
                    placeholder="ระบุยอดรับจริง..."
                    className="pr-14 font-bold text-sm bg-white border-amber-300"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-500 pointer-events-none">
                    {receiveUnit || 'หน่วย'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">ยอดที่นับได้จริงตามใบส่งของ</p>
              </div>

              {/* Control No. & วันที่รับเข้า */}
              <div className="space-y-1.5 bg-purple-50/50 p-3 rounded-xl border border-purple-200/80">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-purple-950 text-xs">Control No. <span className="text-red-500">*</span></Label>
                  <span className="text-[10px] text-purple-600 font-medium">รูปแบบ 2 หลัก (-01)</span>
                </div>
                <Input 
                  value={controlNoInput} 
                  onChange={(e) => setControlNoInput(e.target.value.toUpperCase())}
                  placeholder="เช่น P260915-09"
                  disabled={isGeneratingControlNo}
                  className="font-mono font-bold text-sm text-purple-700 bg-white border-purple-300"
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 shrink-0 font-medium">วันที่รับ:</span>
                  <Input 
                    type="date"
                    value={receiveDateInput}
                    onChange={(e) => setReceiveDateInput(e.target.value)}
                    className="h-7 text-xs bg-white border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2.1 บรรจุภัณฑ์ & การแบ่งกล่อง (Packaging Breakdown สำหรับ Quarantine Tag) */}
            {(() => {
              const effectivePkg = receivePackageType === 'อื่นๆ' 
                ? (receiveCustomPackageType.trim() || 'ภาชนะ') 
                : (receivePackageType || (receiveRmCode.trim().startsWith('R') || receiveWarehouse === 'MMRM' ? 'ถัง' : 'ลัง'));
              const fullCount = parseInt(receiveBoxCount, 10) || 0;
              const fullQty = parseFloat(receiveQtyPerBox) || 0;
              const oddCount = parseInt(receiveOddBoxCount, 10) || 0;
              const oddQty = parseFloat(receiveOddQtyPerBox) || 0;
              const calcTotal = (fullCount * fullQty) + (oddCount * oddQty);
              const targetTotal = parseFloat(receivedQtyInput) || parseFloat(receivePoQty) || 0;
              const isMatch = targetTotal > 0 && Math.abs(calcTotal - targetTotal) < 0.001;
              const totalUnits = fullCount + oddCount;

              return (
                <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-purple-200/60">
                    <Label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-purple-600" />
                      ข้อมูลภาชนะบรรจุ & ยอดแบ่งบรรจุ (สำหรับพิมพ์ Quarantine Tag 100x80 มม.)
                    </Label>
                    <div className="flex items-center gap-1.5">
                      {targetTotal > 0 && fullQty > 0 && (
                        <button
                          type="button"
                          onClick={handleReceiveAutoSplitRemainder}
                          className="text-[10px] font-bold bg-purple-700 hover:bg-purple-800 text-white px-2 py-0.5 rounded shadow-xs transition flex items-center gap-1"
                          title="คำนวณแยกภาชนะเต็มและภาชนะเศษให้อัตโนมัติ"
                        >
                          ⚡ คำนวณแบ่งเศษอัตโนมัติ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Container / Packaging Type Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-purple-950">
                        ประเภทภาชนะบรรจุ <span className="text-red-500">*</span>
                      </Label>
                      <select
                        value={receivePackageType}
                        onChange={e => setReceivePackageType(e.target.value)}
                        className="w-full h-8 text-xs font-bold bg-white text-slate-800 border border-purple-300 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="ลัง">ลัง (Box/Carton)</option>
                        <option value="กล่อง">กล่อง (Box)</option>
                        <option value="ถัง">ถัง (Drum/Pail)</option>
                        <option value="ถุง">ถุง (Bag)</option>
                        <option value="หีบ">หีบ (Chest)</option>
                        <option value="ห่อ">ห่อ (Pack/Bundle)</option>
                        <option value="พาเลท">พาเลท (Pallet)</option>
                        <option value="กระป๋อง">กระป๋อง (Can)</option>
                        <option value="ม้วน">ม้วน (Roll)</option>
                        <option value="อื่นๆ">อื่นๆ (เว้นว่างไว้พิมพ์ระบุเอง)</option>
                      </select>
                    </div>

                    {receivePackageType === 'อื่นๆ' ? (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-purple-950">
                          ระบุประเภทภาชนะเอง <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={receiveCustomPackageType}
                          onChange={e => setReceiveCustomPackageType(e.target.value)}
                          placeholder="เช่น แกลลอน, กระสอบ, ซอง, หลอด"
                          className="h-8 text-xs font-bold bg-white border-purple-300"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">LOT ผู้ผลิต (Supplier Lot)</Label>
                        <Input 
                          value={receiveMfgLot} 
                          onChange={e => setReceiveMfgLot(e.target.value)} 
                          placeholder="เช่น 2609A หรือ -"
                          className="h-8 text-xs bg-white font-mono" 
                        />
                      </div>
                    )}
                  </div>

                  {receivePackageType === 'อื่นๆ' && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">LOT ผู้ผลิต (Supplier Lot)</Label>
                      <Input 
                        value={receiveMfgLot} 
                        onChange={e => setReceiveMfgLot(e.target.value)} 
                        placeholder="เช่น 2609A หรือ -"
                        className="h-8 text-xs bg-white font-mono" 
                      />
                    </div>
                  )}

                  {/* Full & Odd Packaging Breakdown Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Full Container Group */}
                    <div className="bg-white/90 p-2.5 rounded-lg border border-purple-200/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>📦 {effectivePkg}เต็ม</span>
                        <span className="text-[10px] font-semibold text-slate-500">ยอดปกติ</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600">
                          จำนวน{effectivePkg}เต็ม <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={receiveBoxCount} 
                          onChange={e => handleReceiveBoxCountChange(e.target.value)} 
                          placeholder="เช่น 7"
                          className="h-8 text-xs bg-white font-bold text-center" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600">
                          จำนวน/{effectivePkg}เต็ม ({receiveUnit || 'หน่วย'}) <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          type="number" 
                          step="any"
                          min="0.001" 
                          value={receiveQtyPerBox} 
                          onChange={e => setReceiveQtyPerBox(e.target.value)} 
                          placeholder="เช่น 1300"
                          className="h-8 text-xs bg-white font-bold text-center" 
                        />
                      </div>
                    </div>

                    {/* Odd Container Group */}
                    <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-300/80 space-y-2">
                      <div className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                        <span>🟠 {effectivePkg}เศษ (Odd)</span>
                        <span className="text-[10px] font-normal text-amber-800">ใส่ 0 หากไม่มีเศษ</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-amber-900">
                          จำนวน{effectivePkg}เศษ
                        </Label>
                        <Input 
                          type="number" 
                          min="0" 
                          value={receiveOddBoxCount} 
                          onChange={e => setReceiveOddBoxCount(e.target.value)} 
                          placeholder="0"
                          className="h-8 text-xs bg-white font-bold text-center text-amber-950 border-amber-300" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-amber-900">
                          จำนวน/{effectivePkg}เศษ ({receiveUnit || 'หน่วย'})
                        </Label>
                        <Input 
                          type="number" 
                          step="any"
                          min="0" 
                          value={receiveOddQtyPerBox} 
                          onChange={e => setReceiveOddQtyPerBox(e.target.value)} 
                          placeholder="0"
                          className="h-8 text-xs bg-white font-bold text-center text-amber-950 border-amber-300" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Summary and Validation */}
                  <div className="text-xs pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-medium">
                      <span className="text-slate-700">
                        🏷️ <strong>พิมพ์สติกเกอร์รวม:</strong> {totalUnits} ใบ ({fullCount} {effectivePkg}เต็ม{oddCount > 0 ? ` + ${oddCount} ${effectivePkg}เศษ` : ''})
                      </span>
                      {targetTotal > 0 && (
                        isMatch ? (
                          <span className="font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                            ✓ ยอดแบ่งครบ {calcTotal.toLocaleString()} {receiveUnit || 'หน่วย'} ตรงกับยอดรับเข้า
                          </span>
                        ) : (
                          <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            ⚠️ ยอดแบ่งรวม {calcTotal.toLocaleString()} (ยอดรับเข้า {targetTotal.toLocaleString()} {receiveUnit || 'หน่วย'})
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono pt-1">
                      รูปแบบบันทึก: ({fullCount} {effectivePkg} x {fullQty.toLocaleString()} {receiveUnit || 'หน่วย'}{oddCount > 0 ? ` + ${oddCount} ${effectivePkg}เศษ x ${oddQty.toLocaleString()} ${receiveUnit || 'หน่วย'}` : ''}){receiveMfgLot && receiveMfgLot !== '-' ? ` Lot.${receiveMfgLot}` : ''}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. หมายเหตุการแก้ไข (Audit / Reason) - ไฮไลท์เมื่อมีการแก้ไข */}
            {(() => {
              const isModified = isReceiveDataModified();
              const isAlreadyReceived = receivingItem?.status === 'RECEIVED' || receivingItem?.status === 'WAITING_QC';
              const isRequired = isModified || isAlreadyReceived;

              return (
                <div className={`p-3.5 rounded-xl border transition-all ${
                  isRequired ? 'bg-amber-50/70 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                      <ShieldCheck className={`w-4 h-4 ${isRequired ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>หมายเหตุการแก้ไขข้อมูล (Edit Reason / Revision Remark)</span>
                      {isRequired && (
                        <span className="text-red-600 text-xs font-bold">* จำเป็นต้องระบุ</span>
                      )}
                    </Label>
                    {isModified && (
                      <Badge className="text-[10px] py-0 px-2 font-semibold bg-amber-600 text-white hover:bg-amber-700">
                        ตรวจพบการแก้ไขข้อมูล
                      </Badge>
                    )}
                  </div>
                  <Textarea 
                    value={receiveEditReason} 
                    onChange={(e) => setReceiveEditReason(e.target.value)}
                    placeholder="ระบุเหตุผลการแก้ไขข้อมูล เช่น แก้ไขรหัสและชื่อเนื่องจากมีพิมพ์ตกจากใบสั่งซื้อ, ปรับปรุงยอดรับเข้าตามใบลดหนี้, สลับคลังจัดเก็บ..."
                    rows={2}
                    className="text-xs resize-none bg-white border-slate-300 focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    ระบบจะบันทึกหมายเหตุการแก้ไขนี้แนบไว้กับประวัติข้อมูล เพื่อความโปร่งใสและตรวจสอบย้อนกลับได้
                  </p>
                </div>
              );
            })()}

            {/* 4. หมายเหตุการรับเข้า / ข้อมูลแจ้งฝ่ายที่เกี่ยวข้อง (General Remarks) */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                <span>หมายเหตุการรับเข้า / ข้อมูลแจ้งฝ่ายที่เกี่ยวข้อง</span>
                <span className="text-[10px] text-slate-400 font-normal">(แจ้ง QC / ฝ่ายผลิต / ฝ่ายวางแผน)</span>
              </Label>
              <Textarea 
                value={receiveRemarkInput} 
                onChange={(e) => setReceiveRemarkInput(e.target.value)}
                placeholder="ระบุข้อมูลที่ต้องการแจ้งแล็บ QC หรือฝ่ายผลิต เช่น ส่งมาไม่ครบขาด 50 ชิ้น, กล่องมีรอยบุบ, ขอตรวจด่วนพิเศษ..."
                rows={2}
                className="text-xs resize-none bg-white"
              />
              <p className="text-[10px] text-slate-500">
                ข้อมูลนี้จะแสดงให้ฝ่ายจัดซื้อ, คลัง, แล็บ QC และหน้า 21-Day Rolling Radar ทราบร่วมกัน
              </p>
            </div>
          </div>
          <DialogFooter className="border-t pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>
              ยกเลิก
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button 
                onClick={() => confirmReceive(false)} 
                disabled={isGeneratingControlNo} 
                variant="outline"
                className="font-semibold border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                {isGeneratingControlNo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />}
                {receivingItem?.status === 'RECEIVED' || receivingItem?.status === 'WAITING_QC' ? 'บันทึกการแก้ไข' : 'บันทึกรับของ'}
              </Button>
              <Button 
                onClick={() => confirmReceive(true)} 
                disabled={isGeneratingControlNo} 
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md"
              >
                {isGeneratingControlNo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
                บันทึกและพิมพ์ Quarantine Tag 🏷️
              </Button>
            </div>
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
        <DialogContent className="sm:max-w-[550px] bg-white rounded-2xl border border-[#D4AF37]/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#4A4238]">
              <Edit className="w-4 h-4 text-[#D4AF37]" />
              แก้ไขข้อมูลนำเข้า & ระบุเหตุผล (Purchasing Edit)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs">
            {editingItem?.status === 'REJECTED' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-red-900">รายการนี้ถูก QC ตรวจไม่ผ่าน (Rejected)</div>
                  <div className="text-slate-600">เมื่อระบุวัน ETA ใหม่และบันทึก ระบบจะปรับสถานะเป็น <strong>"Revised รอรับเข้ารอบใหม่"</strong> พร้อมรีเซ็ตเลข Control No. เพื่อให้ฝ่ายคลังรับเข้าเป็นล็อตส่งใหม่เมื่อสินค้ามาถึง</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right font-bold text-slate-700">PO No.</Label>
              <Input value={editForm.po_no} onChange={e => setEditForm({...editForm, po_no: e.target.value})} className="col-span-3 text-xs bg-slate-50" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right font-bold text-slate-700">Supplier</Label>
              <Input value={editForm.supplier} onChange={e => setEditForm({...editForm, supplier: e.target.value})} className="col-span-3 text-xs bg-slate-50" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right font-bold text-slate-700">Code</Label>
              <Input value={editForm.rm_code} onChange={e => setEditForm({...editForm, rm_code: e.target.value})} className="col-span-3 text-xs bg-slate-50" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right font-bold text-slate-700">Name</Label>
              <Input value={editForm.rm_name} onChange={e => setEditForm({...editForm, rm_name: e.target.value})} className="col-span-3 text-xs bg-slate-50" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right font-bold text-slate-700">Warehouse</Label>
              <Input value={editForm.warehouse} onChange={e => setEditForm({...editForm, warehouse: e.target.value})} className="col-span-3 text-xs bg-slate-50" placeholder="เช่น MMPM, MMRM" />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right font-bold text-slate-700">Quantity</Label>
              <div className="col-span-3 flex gap-2">
                <Input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} className="w-full text-xs" />
                <Input value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} className="w-24 placeholder:text-slate-400 text-xs" placeholder="Unit" />
              </div>
            </div>
            {editingItem && (
              <div className="grid grid-cols-4 items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <Label className="text-right font-bold text-slate-500 text-[11px]">Original ETA (PO)</Label>
                <div className="col-span-3 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="font-mono text-slate-800">
                    {originalCommittedEta(editingItem) ? new Date(originalCommittedEta(editingItem)).toLocaleDateString('th-TH') : 'ตาม PO'}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    ล็อกถาวรสำหรับคิด KPI / OTIF
                  </Badge>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right font-bold text-rose-700">Revised ETA</Label>
              <div className="col-span-3 space-y-1">
                <Input type="date" value={editForm.eta_date} onChange={e => setEditForm({...editForm, eta_date: e.target.value})} className="text-xs font-mono font-bold text-rose-900 border-rose-300 bg-white" />
                <p className="text-[10px] text-slate-500">* ต้องระบุวันล่วงหน้า (ไม่เป็นวันในอดีตหรือวันปัจจุบัน)</p>
              </div>
            </div>

            {/* Mandatory Reason Section */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <div className="grid grid-cols-4 items-center gap-3">
                <Label className="text-right font-bold text-[#4A4238]">หมวดหมู่สาเหตุ:</Label>
                <div className="col-span-3">
                  <Select value={editForm.delay_category} onValueChange={(val) => setEditForm({...editForm, delay_category: val || 'SUPPLIER_PROD'})}>
                    <SelectTrigger className="w-full text-xs bg-white">
                      <SelectValue placeholder="เลือกหมวดหมู่สาเหตุ" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-3">
                <Label className="text-right font-bold text-rose-700 pt-1.5">
                  เหตุผลการแก้ไข *
                </Label>
                <div className="col-span-3 space-y-1">
                  <Textarea
                    rows={2}
                    placeholder="กรุณาระบุเหตุผลการแก้ไข/สาเหตุการเลื่อนส่ง เพื่อบันทึกเป็นประวัติและ KPI คู่ค้า (จำเป็นต้องระบุ)..."
                    value={editForm.edit_reason}
                    onChange={e => setEditForm({...editForm, edit_reason: e.target.value})}
                    className="text-xs bg-white border-amber-300 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    * ข้อมูลนี้จะเชื่อมโยงไปยังโมดูล CosmeFlow Purchase และ Dashboard Master Radar ทันที
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="text-xs">ยกเลิก</Button>
            <Button onClick={handleEditSubmit} className="bg-[#D4AF37] hover:bg-[#B3932F] text-white text-xs font-bold">บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quarantine Tag Modal (100x80 mm Sticker with Sequential Printing 1 of N to N of N) */}
      <QuarantineTagModal 
        open={isQuarantineTagOpen} 
        onOpenChange={setIsQuarantineTagOpen} 
        initialData={quarantineTagData} 
      />

      {/* Continuous History Audit Trail Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:!max-w-5xl md:!max-w-6xl w-[96vw] max-w-[96vw] max-h-[92vh] h-auto flex flex-col p-4 sm:p-5 bg-slate-50">
          <DialogHeader className="border-b pb-3 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
                <History className="w-5 h-5 text-amber-600" />
                ประวัติการทำงานแบบต่อเนื่อง (Continuous Work History & Audit Trail)
              </DialogTitle>
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-mono text-xs font-bold">
                {filteredHistory.length} รายการ
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              บันทึกไทม์ไลน์การทำงานต่อเนื่องของวัตถุดิบและบรรจุภัณฑ์ทุกขั้นตอน (สั่งซื้อ ➔ รับเข้าคลัง ➔ ตรวจรับรอง QC ➔ ปล่อยผลิต)
            </DialogDescription>
          </DialogHeader>

          {/* Filter Bar inside Modal */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-2 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-600">ขั้นตอน:</span>
              <Button
                variant={historyStageFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryStageFilter('ALL')}
                className={`h-7 text-xs ${historyStageFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}
              >
                ทั้งหมด
              </Button>
              <Button
                variant={historyStageFilter === 'PURCHASING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryStageFilter('PURCHASING')}
                className={`h-7 text-xs ${historyStageFilter === 'PURCHASING' ? 'bg-amber-600 text-white' : 'bg-white text-amber-900'}`}
              >
                🛒 สั่งซื้อ (PO)
              </Button>
              <Button
                variant={historyStageFilter === 'WAREHOUSE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryStageFilter('WAREHOUSE')}
                className={`h-7 text-xs ${historyStageFilter === 'WAREHOUSE' ? 'bg-blue-600 text-white' : 'bg-white text-blue-900'}`}
              >
                📦 รับเข้าคลัง (WH)
              </Button>
              <Button
                variant={historyStageFilter === 'QC' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryStageFilter('QC')}
                className={`h-7 text-xs ${historyStageFilter === 'QC' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-900'}`}
              >
                🔬 ตรวจรับรอง (QC)
              </Button>
              <Button
                variant={historyStageFilter === 'PLANNING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryStageFilter('PLANNING')}
                className={`h-7 text-xs ${historyStageFilter === 'PLANNING' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-900'}`}
              >
                📅 แผนผลิต (Plan)
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Input
                placeholder="ค้นหาประวัติ..."
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                className="h-8 text-xs bg-white w-48 sm:w-60"
              />
              <Button
                size="sm"
                onClick={handleExportHistory}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                Export ประวัติ (.xlsx)
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs max-h-[55vh]">
            <Table className="text-xs">
              <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-24">วันที่/เวลา</TableHead>
                  <TableHead className="w-24">ขั้นตอน</TableHead>
                  <TableHead className="w-28">เลขที่ PO</TableHead>
                  <TableHead className="w-28">Control No.</TableHead>
                  <TableHead className="w-32">รหัสสินค้า</TableHead>
                  <TableHead className="min-w-[200px]">ชื่อสินค้า / ผู้ขาย</TableHead>
                  <TableHead className="w-24 text-right">จำนวน</TableHead>
                  <TableHead className="min-w-[220px]">รายละเอียดการทำงาน</TableHead>
                  <TableHead className="w-20">ผู้รับผิดชอบ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      ไม่พบประวัติการทำงานตามเงื่อนไขที่เลือก
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map(evt => (
                    <TableRow key={evt.id} className="hover:bg-amber-50/40">
                      <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleDateString('th-TH') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0.5 ${evt.stageBadgeClass}`}>
                          {evt.stageLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-amber-900 truncate">
                        {evt.poNo}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-purple-900 truncate">
                        {evt.controlNo}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-800">
                        {evt.itemCode}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800 line-clamp-1">{evt.itemName}</div>
                        <div className="text-[10.5px] text-slate-500 truncate">{evt.supplier}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {evt.qty} <span className="text-[10px] text-slate-500 font-normal">{evt.unit}</span>
                      </TableCell>
                      <TableCell className="text-slate-700 text-[11px] leading-relaxed">
                        {evt.details}
                      </TableCell>
                      <TableCell className="text-slate-500 text-[10.5px] whitespace-nowrap">
                        {evt.user}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="pt-3 border-t flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-slate-500">
              แสดง {filteredHistory.length} จากทั้งหมด {continuousHistory.length} รายการในระบบ
            </span>
            <Button variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(false)} className="h-8 text-xs">
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
