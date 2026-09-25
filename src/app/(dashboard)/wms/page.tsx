"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Warehouse,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  QrCode,
  ScanLine,
  Truck,
  ArrowRightLeft,
  Search,
  Plus,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck,
  FileCheck2,
  XCircle,
  FileText,
  Layers,
  Sparkles,
  Smartphone,
  Eye,
  SlidersHorizontal,
  MapPin,
  Navigation,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function WmsDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState("WH-PM");

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingCounts, setPendingCounts] = useState({ qc: 0, putaway: 0, picking: 0 });
  const [balances, setBalances] = useState<any[]>([]);
  const [nearExpiry, setNearExpiry] = useState<any[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);

  // Dialogs
  const [receivingOpen, setReceivingOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<any>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Inbound Form State
  const [rcvPo, setRcvPo] = useState("");
  const [rcvSupplier, setRcvSupplier] = useState("");
  const [rcvItemId, setRcvItemId] = useState("");
  const [rcvQty, setRcvQty] = useState("");
  const [rcvSupplierLot, setRcvSupplierLot] = useState("");
  const [rcvMfgDate, setRcvMfgDate] = useState("");
  const [rcvExpDate, setRcvExpDate] = useState("");
  const [submittingRcv, setSubmittingRcv] = useState(false);

  // QC Disposition State
  const [qcLots, setQcLots] = useState<any[]>([]);
  const [selectedQcLot, setSelectedQcLot] = useState<any>(null);
  const [qcActionModal, setQcActionModal] = useState(false);
  const [qcTargetStatus, setQcTargetStatus] = useState<string>("RELEASED");
  const [qcReason, setQcReason] = useState<string>("ROUTINE_QC_INSPECTION");
  const [qcNotes, setQcNotes] = useState<string>("");
  const [submittingQc, setSubmittingQc] = useState(false);

  // Put-away State
  const [dockItems, setDockItems] = useState<any[]>([]);
  const [putawayModalOpen, setPutawayModalOpen] = useState(false);
  const [selectedPutawayItem, setSelectedPutawayItem] = useState<any>(null);
  const [suggestedBin, setSuggestedBin] = useState<any>(null);
  const [chosenTargetBin, setChosenTargetBin] = useState<string>("");
  const [submittingPutaway, setSubmittingPutaway] = useState(false);

  // Picking & Wave State
  const [pickLists, setPickLists] = useState<any[]>([]);
  const [createWaveOpen, setCreateWaveOpen] = useState(false);
  const [waveOrderNo, setWaveOrderNo] = useState("");
  const [waveItemId, setWaveItemId] = useState("");
  const [waveQty, setWaveQty] = useState("");
  const [submittingWave, setSubmittingWave] = useState(false);

  // Traceability State
  const [traceSearchLot, setTraceSearchLot] = useState("");
  const [traceResult, setTraceResult] = useState<any>(null);
  const [searchingTrace, setSearchingTrace] = useState(false);

  // Digital Twin Map State
  const [mapSubView, setMapSubView] = useState<"floor" | "rack">("floor");

  // Fetch Core Data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wms/inventory?view=summary&warehouse=${selectedWarehouse}`);
      const data = await res.json();
      if (res.ok) {
        setMetrics(data.metrics);
        setPendingCounts(data.pending);
        setBalances(data.balances || []);
        setNearExpiry(data.nearExpiry || []);
        setRecentTxns(data.recentTransactions || []);
      }

      // Fetch Items & Locations for dropdowns
      const [itRes, locRes] = await Promise.all([
        fetch("/api/wms/inventory?view=items"),
        fetch("/api/wms/inventory?view=locations"),
      ]);
      const itData = await itRes.json();
      const locData = await locRes.json();
      if (itRes.ok) setItemsList(itData.items || []);
      if (locRes.ok) setLocationsList(locData.locations || []);
    } catch (err: any) {
      toast.error("ไม่สามารถโหลดข้อมูล WMS ได้: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch QC Queue
  const fetchQcLots = async () => {
    try {
      const res = await fetch("/api/wms/qc?status=QUARANTINE");
      const data = await res.json();
      if (res.ok) setQcLots(data.lots || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Dock Items for Put-Away
  const fetchDockItems = async () => {
    try {
      const res = await fetch("/api/wms/receiving");
      const data = await res.json();
      if (res.ok) setDockItems(data.dockItems || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Pick Lists
  const fetchPickLists = async () => {
    try {
      const res = await fetch("/api/wms/picking");
      const data = await res.json();
      if (res.ok) setPickLists(data.pickLists || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedWarehouse]);

  useEffect(() => {
    if (activeTab === "receiving" || activeTab === "putaway") fetchDockItems();
    if (activeTab === "qc") fetchQcLots();
    if (activeTab === "picking") fetchPickLists();
  }, [activeTab]);

  // Handle Receiving Submit
  const handleReceivingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcvPo || !rcvSupplier || !rcvItemId || !rcvQty || !rcvSupplierLot || !rcvMfgDate || !rcvExpDate) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    try {
      setSubmittingRcv(true);
      const res = await fetch("/api/wms/receiving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          po_number: rcvPo,
          supplier_name: rcvSupplier,
          item_id: rcvItemId,
          quantity: parseFloat(rcvQty),
          supplier_lot_number: rcvSupplierLot,
          manufacturing_date: rcvMfgDate,
          expiry_date: rcvExpDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`รับเข้าสำเร็จ! สร้าง Lot: ${data.data.internal_lot_number}`);
      setReceivingOpen(false);

      // Generate QR Code image for modal printing
      const qrUrl = await QRCode.toDataURL(data.data.qr_payload, { width: 250, margin: 2 });
      setQrCodeDataUrl(qrUrl);
      setCurrentLabel(data.data);
      setQrModalOpen(true);

      // Reset form
      setRcvPo("");
      setRcvSupplier("");
      setRcvQty("");
      setRcvSupplierLot("");
      setRcvMfgDate("");
      setRcvExpDate("");

      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingRcv(false);
    }
  };

  // Dedicated Clean Label Printing (Only QR Tag, 1-page sticker / tag)
  const handlePrintLabel = () => {
    if (!currentLabel) return;
    const printWindow = window.open("", "_blank", "width=550,height=750");
    if (!printWindow) {
      window.print();
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>ฉลากประจำพาเลท / กล่อง - ${currentLabel.internal_lot_number || "WMS"}</title>
          <style>
            @page {
              size: 100mm 150mm;
              margin: 4mm;
            }
            @media print {
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print { display: none !important; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              margin: 0;
              padding: 10px;
              background: #fff;
              color: #000;
              box-sizing: border-box;
            }
            .tag-box {
              border: 3px solid #000;
              border-radius: 8px;
              padding: 12px;
              max-width: 380px;
              margin: 0 auto;
              text-align: center;
              box-sizing: border-box;
            }
            .org-header {
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #000;
              padding-bottom: 5px;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .lot-badge {
              font-size: 18px;
              font-weight: 900;
              font-family: monospace;
              letter-spacing: 1px;
              margin: 4px 0;
              color: #000;
              background: #f1f5f9;
              padding: 4px 8px;
              border-radius: 4px;
              display: inline-block;
            }
            .qr-container {
              margin: 6px auto;
              display: inline-block;
              border: 1px solid #ddd;
              padding: 4px;
              border-radius: 6px;
              background: #fff;
            }
            .qr-img {
              width: 160px;
              height: 160px;
              display: block;
            }
            .info-table {
              width: 100%;
              text-align: left;
              font-size: 11px;
              font-family: monospace;
              border-top: 2px solid #000;
              margin-top: 6px;
              padding-top: 6px;
              border-collapse: collapse;
            }
            .info-table td {
              padding: 2px 0;
              vertical-align: top;
            }
            .info-lbl {
              font-weight: bold;
              width: 95px;
              color: #333;
            }
            .info-val {
              font-weight: 600;
              color: #000;
            }
            .qc-status {
              margin-top: 8px;
              padding: 5px;
              border: 2px solid #b45309;
              background-color: #fef3c7;
              color: #92400e;
              font-size: 11px;
              font-weight: 800;
              border-radius: 4px;
              text-align: center;
            }
            .qc-status.released {
              border-color: #059669;
              background-color: #d1fae5;
              color: #065f46;
            }
            .gmp-note {
              font-size: 8px;
              color: #64748b;
              margin-top: 6px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="tag-box">
            <div class="org-header">COSMEFLOW WMS — PALLET / BOX IDENTIFICATION TAG</div>
            <div class="lot-badge">\${currentLabel.internal_lot_number || ""}</div>
            <div class="qr-container">
              <img class="qr-img" src="\${qrCodeDataUrl}" alt="QR Code" />
            </div>
            <table class="info-table">
              <tr>
                <td class="info-lbl">รหัสสินค้า:</td>
                <td class="info-val">\${currentLabel.item_code || "-"}</td>
              </tr>
              <tr>
                <td class="info-lbl">ชื่อสินค้า:</td>
                <td class="info-val">\${currentLabel.item_name_th || "-"}</td>
              </tr>
              <tr>
                <td class="info-lbl">จำนวนรับจริง:</td>
                <td class="info-val">\${Number(currentLabel.quantity || 0).toLocaleString()} \${currentLabel.uom || "PCS"}</td>
              </tr>
              <tr>
                <td class="info-lbl">เลขที่ GRN:</td>
                <td class="info-val">\${currentLabel.grn_number || "-"}</td>
              </tr>
              <tr>
                <td class="info-lbl">Lot ซัพพลาย:</td>
                <td class="info-val">\${currentLabel.supplier_lot_number || "-"}</td>
              </tr>
              <tr>
                <td class="info-lbl">ซัพพลายเออร์:</td>
                <td class="info-val">\${currentLabel.supplier_name || "-"}</td>
              </tr>
              <tr>
                <td class="info-lbl">วันผลิต (MFG):</td>
                <td class="info-val">\${currentLabel.manufacturing_date ? new Date(currentLabel.manufacturing_date).toLocaleDateString("th-TH") : "-"}</td>
              </tr>
              <tr>
                <td class="info-lbl">วันหมดอายุ:</td>
                <td class="info-val">\${currentLabel.expiry_date ? new Date(currentLabel.expiry_date).toLocaleDateString("th-TH") : "-"}</td>
              </tr>
              <tr>
                <td class="info-lbl">พิกัดรับเข้า:</td>
                <td class="info-val">\${currentLabel.dock_location || "-"}</td>
              </tr>
            </table>

            <div class="qc-status \${currentLabel.qc_status === "RELEASED" ? "released" : ""}">
              \${
                currentLabel.qc_status === "RELEASED"
                  ? "✅ ผ่านการรับรอง (RELEASED — สามารถเบิกจ่ายได้)"
                  : "🛑 กักกัน (QUARANTINE — ห้ามเบิกจ่ายก่อนผ่าน QC)"
              }
            </div>

            <div class="gmp-note">
              GMP ISO 22716 & 21 CFR Part 11 Electronic Identification Tag
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Handle QC Disposition
  const handleQcSubmit = async () => {
    if (!selectedQcLot) return;
    try {
      setSubmittingQc(true);
      const res = await fetch("/api/wms/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot_id: selectedQcLot.lot_id,
          new_status: qcTargetStatus,
          reason_code: qcReason,
          qc_notes: qcNotes,
          inspector_user: "QA Specialist (Verified)",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`อนุมัติสถานะ Lot เป็น ${qcTargetStatus} เรียบร้อยแล้ว`);
      setQcActionModal(false);
      setSelectedQcLot(null);
      setQcNotes("");
      fetchQcLots();
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingQc(false);
    }
  };

  // Open Putaway Modal & Get Slotting Suggestion
  const handleOpenPutaway = async (dockItem: any) => {
    setSelectedPutawayItem(dockItem);
    try {
      const res = await fetch(`/api/wms/putaway?item_id=${dockItem.item_id}&lot_id=${dockItem.lot_id}`);
      const data = await res.json();
      if (res.ok && data.recommendedLocation) {
        setSuggestedBin(data.recommendedLocation);
        setChosenTargetBin(data.recommendedLocation.location_barcode);
      } else {
        setSuggestedBin(null);
      }
      setPutawayModalOpen(true);
    } catch (e) {
      console.error(e);
      setPutawayModalOpen(true);
    }
  };

  // Confirm Putaway
  const handleConfirmPutaway = async () => {
    if (!selectedPutawayItem || !chosenTargetBin) return;
    try {
      setSubmittingPutaway(true);
      const res = await fetch("/api/wms/putaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: selectedPutawayItem.item_id,
          lot_id: selectedPutawayItem.lot_id,
          from_location_barcode: selectedPutawayItem.location_barcode,
          target_location_barcode: chosenTargetBin,
          quantity: selectedPutawayItem.physical_quantity,
          uom: selectedPutawayItem.base_uom,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`จัดเก็บเข้าพิกัด ${chosenTargetBin} สำเร็จ! ยอดเป็น AVAILABLE ทันที`);
      setPutawayModalOpen(false);
      setSelectedPutawayItem(null);
      fetchDockItems();
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingPutaway(false);
    }
  };

  // Handle Create Wave (FEFO)
  const handleCreateWave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waveOrderNo || !waveItemId || !waveQty) {
      toast.error("กรุณาระบุเลขที่คำสั่งผลิตและจำนวน");
      return;
    }

    try {
      setSubmittingWave(true);
      const res = await fetch("/api/wms/picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_WAVE",
          production_order_no: waveOrderNo,
          items: [{ item_id: waveItemId, required_qty: parseFloat(waveQty), uom: "PCS" }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`สร้าง Wave เบิกจ่ายสำเร็จ! ล็อกสต็อกตาม FEFO เรียบร้อย (${data.data.pick_list_number})`);
      setCreateWaveOpen(false);
      setWaveOrderNo("");
      setWaveQty("");
      fetchPickLists();
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingWave(false);
    }
  };

  // Handle Handover to Production
  const handleHandover = async (pickListId: string) => {
    try {
      const res = await fetch("/api/wms/picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HANDOVER_TO_PRODUCTION",
          pick_list_id: pickListId,
          warehouse_user: "คลังสินค้า (Sender)",
          line_leader_user: "หัวหน้าไลน์ผลิต (Receiver)",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("ลงนามส่งมอบเข้าไลน์ผลิตสำเร็จ! บันทึกธุรกรรม ISSUE_TO_PROD เรียบร้อย");
      fetchPickLists();
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handle Traceability Search
  const handleSearchTrace = async () => {
    if (!traceSearchLot.trim()) return;
    try {
      setSearchingTrace(true);
      const res = await fetch(`/api/wms/trace?lot=${encodeURIComponent(traceSearchLot.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTraceResult(data);
    } catch (err: any) {
      toast.error(err.message);
      setTraceResult(null);
    } finally {
      setSearchingTrace(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-lg shadow-sm">
            <Warehouse className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">CosmeFlow WMS Control Tower</h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                GMP Certified
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              ระบบบริหารจัดการคลังสินค้ามาตรฐาน GMP โรงงานผลิตเครื่องสำอาง OEM/ODM (Immutable Ledger & FEFO)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Warehouse Selector */}
          <Select value={selectedWarehouse} onValueChange={(val: any) => setSelectedWarehouse(val || 'WH-PM')}>
            <SelectTrigger className="w-[180px] bg-slate-50 border-slate-300 font-medium">
              <SelectValue placeholder="เลือกคลังสินค้า" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WH-PM">📦 WH-PM (คลังบรรจุภัณฑ์)</SelectItem>
              <SelectItem value="WH-RM">🧪 WH-RM (คลังเคมีภัณฑ์)</SelectItem>
              <SelectItem value="WH-WEIGH">⚖️ WH-WEIGH (ชั่งจ่าย)</SelectItem>
              <SelectItem value="WH-BULK">🛢️ WH-BULK (ถังเนื้อกึ่งสำเร็จ)</SelectItem>
              <SelectItem value="WH-FG">✨ WH-FG (คลังสำเร็จรูป)</SelectItem>
              <SelectItem value="WH-HOLD">🛑 WH-HOLD (กักกัน)</SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Refresh */}
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>

          {/* New Inbound Receipt */}
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => setReceivingOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            รับสินค้าเข้า (GRN)
          </Button>

          {/* Dedicated Mobile Scanner Link */}
          <Link href="/wms/mobile">
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm" size="sm">
              <Smartphone className="w-4 h-4 mr-1.5" />
              เปิดโหมดสแกนเนอร์ PDA
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">ยอดจริงในคลัง (Physical)</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {metrics ? Number(metrics.total_physical).toLocaleString() : "..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-slate-400">หน่วย PCS รวม</span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-emerald-700">พร้อมใช้งาน (Available)</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-800">
              {metrics ? Number(metrics.total_available).toLocaleString() : "..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-emerald-600 font-medium">ผ่าน QC และไม่ติดจอง</span>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-blue-700">ถูกจองการผลิต (Reserved)</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-800">
              {metrics ? Number(metrics.total_reserved).toLocaleString() : "..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-blue-600 font-medium">ล็อกให้ใบสั่งผลิตแล้ว</span>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-amber-700">รอกักกันตรวจ (Quarantine)</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-800">
              {metrics ? Number(metrics.total_quarantine).toLocaleString() : "..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-amber-600 font-medium">รอ QC สุ่มตรวจ ({pendingCounts.qc} รายการ)</span>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/40 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-red-700">ระงับ / ไม่ผ่าน (Hold/Rej)</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-800">
              {metrics ? (Number(metrics.total_hold) + Number(metrics.total_rejected)).toLocaleString() : "..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-red-600 font-medium">ห้ามจ่ายเข้าผลิต 100%</span>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-purple-700">ใกล้หมดอายุ 90 วัน</CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-800">
              {nearExpiry.length} <span className="text-sm font-normal text-slate-500">Lots</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-purple-600 font-medium">เข้าคิวจัดสรร FEFO ด่วน</span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Operational Navigation Tabs */}
      <div className="bg-white p-1.5 border border-slate-200 shadow-sm rounded-xl flex flex-wrap items-center gap-1.5">
        {[
          { id: "overview", label: "ภาพรวมสต็อก & พิกัด (Balances)", icon: Boxes },
          { id: "map", label: "แผนผังคลัง 2D (Visual Map)", icon: MapPin },
          { id: "receiving", label: "รับสินค้าเข้า (GRN)", icon: Truck },
          { id: "qc", label: "ตรวจรับ QC", icon: ShieldCheck, badge: pendingCounts.qc },
          { id: "putaway", label: "จัดเก็บเข้าที่ Put-away", icon: ArrowRightLeft, badge: pendingCounts.putaway },
          { id: "picking", label: "เบิกจ่าย FEFO", icon: ScanLine, badge: pendingCounts.picking },
          { id: "trace", label: "สืบย้อนกลับ 360° (Traceability)", icon: Search },
          { id: "transactions", label: "สมุดบัญชีสต็อก (Ledger Audit)", icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-800"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    isActive ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & REAL-TIME BALANCES */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">รายงานยอดคงเหลือแยกตามพิกัดและ Lot (Materialized Balances)</CardTitle>
                <CardDescription className="text-xs">
                  คำนวณจากสมุดบัญชีธุรกรรม (Immutable Ledger) ป้องกันสต็อกติดลบและการเบิกของไม่ผ่าน QC
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white">
                {balances.length} รายการพิกัด
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">พิกัดจัดเก็บ (Sub-Bin)</th>
                      <th className="px-4 py-3">รหัสสินค้า / ชื่อบรรจุภัณฑ์</th>
                      <th className="px-4 py-3">เลข Lot ภายใน (Internal Lot)</th>
                      <th className="px-4 py-3">วันหมดอายุ (EXP)</th>
                      <th className="px-4 py-3 text-center">สถานะ QC</th>
                      <th className="px-4 py-3 text-right">ยอดจริง (Physical)</th>
                      <th className="px-4 py-3 text-right">ยอดจอง (Reserved)</th>
                      <th className="px-4 py-3 text-right font-bold text-emerald-700">พร้อมใช้ (Available)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {balances.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          ไม่พบข้อมูลสินค้าคงคลังในคลัง {selectedWarehouse}
                        </td>
                      </tr>
                    ) : (
                      balances.map((b) => (
                        <tr key={b.balance_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            <span className="p-1 px-1.5 bg-slate-100 rounded border border-slate-300">
                              {b.location_barcode}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{b.item_code}</div>
                            <div className="text-xs text-slate-500">{b.item_name_th}</div>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-700">
                            {b.internal_lot_number}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-mono">{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString("th-TH") : "-"}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {b.qc_status === "RELEASED" && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 mr-1 inline" /> ผ่านตรวจ QC
                              </Badge>
                            )}
                            {b.qc_status === "QUARANTINE" && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                <Clock className="w-3 h-3 mr-1 inline" /> รอตรวจกักกัน
                              </Badge>
                            )}
                            {b.qc_status === "HOLD" && (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                <AlertTriangle className="w-3 h-3 mr-1 inline" /> ระงับชั่วคราว
                              </Badge>
                            )}
                            {b.qc_status === "REJECTED" && (
                              <Badge className="bg-red-100 text-red-800 border-red-300">
                                <XCircle className="w-3 h-3 mr-1 inline" /> ไม่ผ่านเกณฑ์
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {Number(b.physical_quantity).toLocaleString()} {b.base_uom}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-600 font-medium">
                            {Number(b.reserved_quantity).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">
                            {Number(b.available_quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: WAREHOUSE 2D DIGITAL TWIN MAP */}
      {activeTab === "map" && (
        <div className="space-y-4">
          {/* Header & Sub-view Switcher */}
          <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">แผนผังคลังสินค้าดิจิทัล (WH-PM 2D Digital Twin)</h3>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-xs">
                  SLOTTING MAPPING
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                ระบบระบุพิกัดจัดเก็บเสมือนจริง แสดงตำแหน่งชั้นวาง โซน และไฟกระพริบระบุตำแหน่งเป้าหมาย
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex bg-slate-100 p-1 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setMapSubView("floor")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    mapSubView === "floor"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🗺️ ผังพื้นรวม (Floor Plan)
                </button>
                <button
                  type="button"
                  onClick={() => setMapSubView("rack")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    mapSubView === "rack"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📦 หน้าตัดชั้นวางจริง (Rack R01)
                </button>
              </div>
            </div>
          </div>

          {/* Target Location Alert Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-4 rounded-xl border border-emerald-500/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center p-2.5 bg-emerald-500/20 rounded-lg border border-emerald-500/40">
                <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-emerald-400 opacity-75"></span>
                <MapPin className="relative w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-emerald-300 font-medium">📍 พิกัดแนะนำจัดเก็บ (Target Slot with Blinking Beacon):</div>
                <div className="font-mono text-lg font-black text-white tracking-wide">
                  WH-PM-A-R01-B01-L01-BN01
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-300 font-mono bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
              โซน A แถว 1 • ช่วงเสา 1 • ชั้น 1 (ล่างสุด) • ช่อง 1 (ซ้าย)
            </div>
          </div>

          {/* SUB-VIEW 1: FLOOR PLAN */}
          {mapSubView === "floor" && (
            <Card className="border shadow-sm overflow-hidden bg-slate-950 text-white">
              <CardHeader className="bg-slate-900/80 border-b border-slate-800 p-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm text-slate-200">ผังพื้นที่ทางกายภาพคลังบรรจุภัณฑ์ (WH-PM Top-Down Layout)</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    เส้นประนำทางจากท่ารับเข้า DOCK-QUAR-01 เข้าสู่ชั้นวางแร็คเป้าหมาย
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[11px]">
                  Real-time Slotting
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Top: Inbound Dock & QA */}
                <div className="flex justify-between items-center">
                  <div className="border-2 border-blue-500 bg-blue-950/40 rounded-xl p-3.5 w-64 text-center shadow-lg">
                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">🚪 จุดรับเข้ากักกัน (Inbound Dock)</div>
                    <div className="font-mono text-sm font-bold text-white">WH-PM-DOCK-QUAR-01</div>
                    <div className="text-[11px] text-blue-300/80 mt-1">จุดพักรับของและรอผลตรวจ QC</div>
                  </div>

                  <div className="border border-slate-800 bg-slate-900/70 rounded-xl p-3 text-center text-xs text-slate-400 w-52">
                    <div>🧪 โต๊ะสุ่มตรวจตัวอย่าง QC</div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">Sampling Inspection Bench</div>
                  </div>
                </div>

                {/* Middle: Forklift Main Aisle */}
                <div className="py-3 px-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>◀ ทางออกสู่คลีนรูมผลิต (To Cleanroom)</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <span>🚜 ทางวิ่งรถยก / โฟล์คลิฟต์ (Forklift Main Thoroughfare)</span>
                  </span>
                  <span>ประตูคลังสินค้า (Main Gate) ▶</span>
                </div>

                {/* Bottom: Racks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* ZONE A RACK 1 (TARGET) */}
                  <div className="border-2 border-emerald-500 bg-emerald-950/20 rounded-2xl p-4 relative shadow-2xl">
                    <div className="absolute -top-3 right-4 bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
                      📍 มีไฟกระพริบที่แร็คนี้
                    </div>

                    <div className="text-xs font-bold text-emerald-400 mb-1">
                      🗄️ โซน A — แร็คที่ 1 (Rack R01)
                    </div>
                    <div className="text-[11px] text-slate-400 mb-3">คลังขวดแก้ว, กระปุกครีม (Ambient 25-30°C)</div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                      {/* Bay 1 - Target */}
                      <div className="border-2 border-emerald-400 bg-emerald-900/50 rounded-xl p-2.5 space-y-1 relative shadow-lg">
                        <span className="absolute -top-2 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                        </span>
                        <div className="text-[10px] text-emerald-300 font-bold">ช่วงเสาที่ 1 (Bay 01)</div>
                        <div className="text-xs text-white font-black bg-emerald-600 rounded py-1">
                          ⭐ L01-BN01
                        </div>
                        <div className="text-[9px] text-emerald-200">ไฟกระพริบจุดนี้</div>
                      </div>

                      {/* Bay 2 */}
                      <div className="border border-slate-800 bg-slate-900/80 rounded-xl p-2.5 space-y-1 opacity-70">
                        <div className="text-[10px] text-slate-400 font-bold">ช่วงเสาที่ 2 (Bay 02)</div>
                        <div className="text-xs text-slate-300 py-1">L01..L03</div>
                        <div className="text-[9px] text-slate-500">ว่าง 4 ช่อง</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMapSubView("rack")}
                      className="w-full mt-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>สลับดูมุมมองหน้าตัดชั้นวาง (Rack Elevation)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* ZONE B RACK 1 */}
                  <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-4">
                    <div className="text-xs font-bold text-sky-400 mb-1">
                      ❄️ โซน B — แร็คที่ 1 (Rack R01)
                    </div>
                    <div className="text-[11px] text-slate-400 mb-3">คลังสติกเกอร์ฉลาก, ยางดรอปเปอร์ (Air-con 20-25°C)</div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono opacity-80">
                      <div className="border border-slate-800 bg-slate-950 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500">Bay 01</div>
                        <div className="text-xs text-slate-300">L01..L02</div>
                      </div>
                      <div className="border border-slate-800 bg-slate-950 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500">Bay 02</div>
                        <div className="text-xs text-slate-300">L01..L02</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 text-center mt-3">ควบคุมอุณหภูมิและความชื้น</div>
                  </div>

                  {/* STAGING OUTBOUND */}
                  <div className="border border-purple-500/60 bg-purple-950/20 rounded-2xl p-4 text-center">
                    <div className="text-xs font-bold text-purple-400 mb-1">📦 จุดส่งมอบผลิต (Outbound Staging)</div>
                    <div className="font-mono text-sm font-bold text-white">WH-PM-STAGE-LINE-01</div>
                    <div className="text-[11px] text-purple-300/80 mt-1">จุดจ่ายสินค้าเข้าคลีนรูมผสม/บรรจุ</div>
                    <div className="mt-4 p-2.5 bg-purple-900/30 border border-purple-800/40 rounded-xl text-[10px] text-purple-200">
                      รองรับไลน์บรรจุอัตโนมัติ Filling Line 1-3
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SUB-VIEW 2: RACK ELEVATION */}
          {mapSubView === "rack" && (
            <Card className="border shadow-sm overflow-hidden bg-slate-950 text-white">
              <CardHeader className="bg-slate-900/80 border-b border-slate-800 p-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm text-slate-200">โครงสร้างชั้นวางหน้าตรง Zone A • Rack R01 (Rack Elevation)</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    แสดงโครงสร้างเสา คาน ชั้นวาง (Levels) และช่องจัดเก็บ (Sub-Bins)
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setMapSubView("floor")}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
                >
                  ◀ กลับไปผังพื้นรวม
                </button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="border-4 border-slate-700 bg-slate-900/40 rounded-2xl p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* BAY 01 */}
                    <div className="space-y-4 border-2 border-emerald-500/40 bg-emerald-950/10 p-4 rounded-xl">
                      <div className="text-center font-mono font-bold text-sm text-emerald-400 border-b border-slate-800 pb-2">
                        ช่วงเสาที่ 1 (BAY 01)
                      </div>

                      {/* Level 3 */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                          <span>ชั้นที่ 3 (LEVEL 03 - บนสุด)</span>
                          <span>Max 300 kg</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                          <div className="border border-slate-800 bg-slate-900 p-3 rounded-lg text-slate-400">BN01 (ว่าง)</div>
                          <div className="border border-slate-800 bg-slate-900 p-3 rounded-lg text-slate-400">BN02 (ว่าง)</div>
                        </div>
                      </div>

                      {/* Level 2 */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                          <span>ชั้นที่ 2 (LEVEL 02 - กลาง)</span>
                          <span>Max 450 kg</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                          <div className="border border-slate-800 bg-slate-900 p-3 rounded-lg text-slate-400">BN01 (ว่าง)</div>
                          <div className="border border-slate-800 bg-slate-900 p-3 rounded-lg text-slate-400">BN02 (ว่าง)</div>
                        </div>
                      </div>

                      {/* Level 1 (TARGET - BLINKING) */}
                      <div className="space-y-1 bg-emerald-950/40 p-2.5 rounded-xl border-2 border-emerald-400/80">
                        <div className="text-[10px] font-mono text-emerald-300 font-bold flex justify-between">
                          <span>ชั้นที่ 1 (LEVEL 01 - พื้นดิน Ground)</span>
                          <span className="text-emerald-300 font-bold">Max 500 kg (Heavy Duty)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1 text-center font-mono">
                          {/* TARGET BN01 */}
                          <div className="border-2 border-emerald-400 bg-emerald-900/80 p-3.5 rounded-xl relative shadow-xl animate-pulse">
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black shadow-md">
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                              📍 วางจุดนี้ (BN01)
                            </span>
                            <div className="text-xs font-black text-white mt-1">BN01 (ช่องซ้าย)</div>
                            <div className="text-[10px] font-bold text-emerald-200 mt-1">
                              WH-PM-A-R01-B01-L01-BN01
                            </div>
                            <div className="text-[9px] text-slate-300 mt-1">
                              ขวดแก้ว 30ml (5,000 PCS)
                            </div>
                          </div>

                          {/* BN02 */}
                          <div className="border border-slate-800 bg-slate-900 p-3.5 rounded-xl text-slate-400 text-xs flex flex-col justify-center">
                            <div>BN02 (ช่องขวา)</div>
                            <div className="text-[10px] text-slate-500 mt-1">ว่าง (Available)</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BAY 02 */}
                    <div className="space-y-4 border border-slate-800 bg-slate-900/30 p-4 rounded-xl opacity-75">
                      <div className="text-center font-mono font-bold text-sm text-slate-400 border-b border-slate-800 pb-2">
                        ช่วงเสาที่ 2 (BAY 02)
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-500">LEVEL 03</div>
                        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                          <div className="border border-slate-800 bg-slate-900/50 p-3 rounded-lg text-slate-500">BN01</div>
                          <div className="border border-slate-800 bg-slate-900/50 p-3 rounded-lg text-slate-500">BN02</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-500">LEVEL 02</div>
                        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                          <div className="border border-slate-800 bg-slate-900/50 p-3 rounded-lg text-slate-500">BN01</div>
                          <div className="border border-slate-800 bg-slate-900/50 p-3 rounded-lg text-slate-500">BN02</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-500">LEVEL 01</div>
                        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                          <div className="border border-slate-800 bg-slate-900/50 p-3 rounded-lg text-slate-500">BN01</div>
                          <div className="border border-slate-800 bg-slate-900/50 p-3 rounded-lg text-slate-500">BN02</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Breakdown Specs */}
          <div className="bg-white p-5 rounded-xl border shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>การถอดรหัสพิกัดจัดเก็บตามหลักสากล GMP (Location Hierarchy Breakdown)</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border">
                <div className="text-[10px] text-slate-500 font-bold uppercase">1. คลัง</div>
                <div className="font-mono text-sm font-bold text-slate-900 mt-1">WH-PM</div>
                <div className="text-[10px] text-slate-400">คลังบรรจุภัณฑ์</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border">
                <div className="text-[10px] text-slate-500 font-bold uppercase">2. โซน</div>
                <div className="font-mono text-sm font-bold text-slate-900 mt-1">A</div>
                <div className="text-[10px] text-slate-400">Ambient ปกติ</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border">
                <div className="text-[10px] text-slate-500 font-bold uppercase">3. แถว/แร็ค</div>
                <div className="font-mono text-sm font-bold text-slate-900 mt-1">R01</div>
                <div className="text-[10px] text-slate-400">แร็คแถวที่ 1</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border">
                <div className="text-[10px] text-slate-500 font-bold uppercase">4. ช่วงเสา</div>
                <div className="font-mono text-sm font-bold text-slate-900 mt-1">B01</div>
                <div className="text-[10px] text-slate-400">ช่วงเสาที่ 1</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border">
                <div className="text-[10px] text-slate-500 font-bold uppercase">5. ชั้นวาง</div>
                <div className="font-mono text-sm font-bold text-slate-900 mt-1">L01</div>
                <div className="text-[10px] text-slate-400">ชั้นล่างสุด (Ground)</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border-2 border-emerald-500">
                <div className="text-[10px] text-emerald-800 font-bold uppercase">6. ช่องย่อย</div>
                <div className="font-mono text-sm font-black text-emerald-700 mt-1">BN01 ⭐</div>
                <div className="text-[10px] text-emerald-600 font-bold">ช่องที่ 1 ซ้าย</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INBOUND RECEIVING */}
      {activeTab === "receiving" && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Form */}
            <Card className="md:col-span-1 border shadow-sm">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-base">ลงทะเบียนรับสินค้าเข้า (Generate GRN)</CardTitle>
                <CardDescription className="text-xs">บันทึกเข้าพิกัด DOCK-QUAR และสั่งพิมพ์บาร์โค้ด QR</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <form onSubmit={handleReceivingSubmit} className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">เลขที่ใบสั่งซื้อ (PO Number) *</Label>
                    <Input
                      placeholder="เช่น PO-2026-0925"
                      value={rcvPo}
                      onChange={(e) => setRcvPo(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">ชื่อซัพพลายเออร์ (Supplier) *</Label>
                    <Input
                      placeholder="เช่น Thai Glass Packaging Co."
                      value={rcvSupplier}
                      onChange={(e) => setRcvSupplier(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">เลือกรายการบรรจุภัณฑ์ *</Label>
                    <Select value={rcvItemId} onValueChange={(val: any) => setRcvItemId(val || "")} required>
                      <SelectTrigger>
                        <SelectValue placeholder="-- เลือกรหัสสินค้า --" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemsList.map((item) => (
                          <SelectItem key={item.item_id} value={item.item_id}>
                            {item.item_code} - {item.item_name_th}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold">จำนวนรับจริง *</Label>
                      <Input
                        type="number"
                        placeholder="เช่น 5000"
                        value={rcvQty}
                        onChange={(e) => setRcvQty(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Lot ซัพพลายเออร์ *</Label>
                      <Input
                        placeholder="SUPP-LOT-01"
                        value={rcvSupplierLot}
                        onChange={(e) => setRcvSupplierLot(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold">วันที่ผลิต (MFG) *</Label>
                      <Input
                        type="date"
                        value={rcvMfgDate}
                        onChange={(e) => setRcvMfgDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">วันหมดอายุ (EXP) *</Label>
                      <Input
                        type="date"
                        value={rcvExpDate}
                        onChange={(e) => setRcvExpDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium" disabled={submittingRcv}>
                    {submittingRcv ? "กำลังบันทึก..." : "ยืนยันการรับเข้า & พิมพ์ฉลาก"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Inbound Dock Queue */}
            <Card className="md:col-span-2 border shadow-sm">
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">คิวสินค้าที่พักรอหน้าท่ารับ (Dock Quarantine Staging)</CardTitle>
                  <CardDescription className="text-xs">
                    สินค้าที่รับเข้าและรอฝ่าย QC ตรวจปล่อยก่อนนำไปจัดเก็บขึ้นชั้นวาง
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchDockItems}>
                  <RefreshCw className="w-4 h-4 mr-1" /> รีเฟรช
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-700 text-xs font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Lot ภายใน</th>
                        <th className="px-4 py-2.5">สินค้า</th>
                        <th className="px-4 py-2.5">ซัพพลายเออร์</th>
                        <th className="px-4 py-2.5 text-right">จำนวน</th>
                        <th className="px-4 py-2.5 text-center">สถานะ QC</th>
                        <th className="px-4 py-2.5 text-right">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dockItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            ไม่มีสินค้าค้างที่จุดพักรับ
                          </td>
                        </tr>
                      ) : (
                        dockItems.map((item) => (
                          <tr key={item.balance_id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                              {item.internal_lot_number}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-slate-900">{item.item_code}</div>
                              <div className="text-xs text-slate-500">{item.item_name_th}</div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{item.supplier_name}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                              {Number(item.physical_quantity).toLocaleString()} {item.base_uom}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge className={item.qc_status === "RELEASED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                                {item.qc_status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {item.qc_status === "RELEASED" ? (
                                <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" onClick={() => handleOpenPutaway(item)}>
                                  นำขึ้นชั้นวาง Put-away
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">รอ QC ปล่อย</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: QC DISPOSITION */}
      {activeTab === "qc" && (
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">คิวตรวจปล่อยคุณภาพ (QC Inspection & Disposition Workbench)</CardTitle>
                <CardDescription className="text-xs">
                  สินค้าสถานะ QUARANTINE / HOLD ต้องผ่านการรับรองจากฝ่ายคุณภาพจึงจะสามารถนำไปใช้ในไลน์ผลิตได้
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchQcLots}>
                <RefreshCw className="w-4 h-4 mr-1" /> รีเฟรช
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3">Lot ภายใน</th>
                      <th className="px-4 py-3">สินค้า</th>
                      <th className="px-4 py-3">Lot ซัพพลายเออร์</th>
                      <th className="px-4 py-3">วันที่รับเข้า</th>
                      <th className="px-4 py-3">วันหมดอายุ</th>
                      <th className="px-4 py-3 text-right">จำนวน</th>
                      <th className="px-4 py-3 text-center">สถานะปัจจุบัน</th>
                      <th className="px-4 py-3 text-right">ลงผลตรวจ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {qcLots.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400">
                          ไม่มีรายการรอตรวจสอบคุณภาพในขณะนี้
                        </td>
                      </tr>
                    ) : (
                      qcLots.map((lot) => (
                        <tr key={lot.lot_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{lot.internal_lot_number}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{lot.item_code}</div>
                            <div className="text-xs text-slate-500">{lot.item_name_th}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">{lot.supplier_lot_number}</td>
                          <td className="px-4 py-3 text-xs">{new Date(lot.receiving_date).toLocaleDateString("th-TH")}</td>
                          <td className="px-4 py-3 text-xs">{new Date(lot.expiry_date).toLocaleDateString("th-TH")}</td>
                          <td className="px-4 py-3 text-right font-medium">{Number(lot.physical_quantity).toLocaleString()} {lot.base_uom}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-amber-100 text-amber-800">{lot.qc_status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                              onClick={() => {
                                setSelectedQcLot(lot);
                                setQcActionModal(true);
                              }}
                            >
                              <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                              ลงผลตรวจ QC
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: PUT-AWAY CONSOLE */}
      {activeTab === "putaway" && (
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-base">งานจัดเก็บขึ้นชั้นวาง (Directed Put-Away Console)</CardTitle>
              <CardDescription className="text-xs">
                ระบบคำนวณและแนะนำตำแหน่งจัดเก็บตามเงื่อนไข (Slotting Algorithm) สแกนเพื่อป้องกันการวางผิดช่อง
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dockItems.filter(i => i.qc_status === "RELEASED").length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400">
                    ไม่มีสินค้าที่ผ่าน QC พร้อมจัดเก็บ (สินค้าทั้งหมดถูกจัดเก็บเรียบร้อยแล้ว)
                  </div>
                ) : (
                  dockItems
                    .filter((i) => i.qc_status === "RELEASED")
                    .map((item) => (
                      <Card key={item.balance_id} className="border border-slate-200 hover:border-blue-400 transition-shadow shadow-sm">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start">
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">ผ่าน QC แล้ว</Badge>
                            <span className="font-mono text-xs text-slate-400">{item.location_barcode}</span>
                          </div>
                          <CardTitle className="text-base font-bold text-slate-900 mt-2">{item.item_code}</CardTitle>
                          <CardDescription className="text-xs">{item.item_name_th}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-3">
                          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded border">
                            <div><span className="text-slate-400">Lot:</span> <b className="font-mono">{item.internal_lot_number}</b></div>
                            <div><span className="text-slate-400">จำนวน:</span> <b>{Number(item.physical_quantity).toLocaleString()} {item.base_uom}</b></div>
                            <div><span className="text-slate-400">EXP:</span> {new Date(item.expiry_date).toLocaleDateString("th-TH")}</div>
                          </div>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" onClick={() => handleOpenPutaway(item)}>
                            จัดเก็บเข้าช่อง (Directed Put-away)
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: FEFO PICKING & WAVE DISPATCHER */}
      {activeTab === "picking" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900">การเบิกจ่ายและส่งมอบการผลิต (FEFO Wave Dispatcher)</h3>
              <p className="text-xs text-slate-500">สร้างใบงานหยิบจ่าย จัดสรรตามวันหมดอายุใกล้สุด และส่งมอบหน้าไลน์ผลิต</p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setCreateWaveOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              สร้าง Wave เบิกจ่ายใหม่ (FEFO)
            </Button>
          </div>

          <div className="space-y-3">
            {pickLists.map((pick) => (
              <Card key={pick.pick_list_id} className="border shadow-sm">
                <CardHeader className="p-4 pb-2 bg-slate-50 border-b flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-slate-900">{pick.pick_list_number}</span>
                      <Badge className={pick.status === "ISSUED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                        {pick.status === "ISSUED" ? "ส่งมอบเข้าไลน์ผลิตแล้ว (ISSUED)" : "กำลังเบิกจ่าย (IN_PROGRESS)"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      อ้างอิงคำสั่งผลิต: <b>{pick.production_order_no}</b> | จุดส่งมอบ: <b>{pick.staging_location}</b>
                    </CardDescription>
                  </div>
                  {pick.status !== "ISSUED" && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={() => handleHandover(pick.pick_list_id)}>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      ลงนามส่งมอบเข้าไลน์ (Handover)
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500 mb-2">
                    ความคืบหน้าการหยิบ: {pick.picked_items} / {pick.total_items} รายการ
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${pick.total_items ? (pick.picked_items / pick.total_items) * 100 : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: TRACEABILITY */}
      {activeTab === "trace" && (
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-base">ระบบสืบย้อนกลับ 360° (Lot Genealogy & Recall Simulator)</CardTitle>
              <CardDescription className="text-xs">
                ตรวจสอบประวัติ Lot ไปข้างหน้า (Forward Trace) และย้อนหลัง (Backward Trace) ตามข้อกำหนดสากล GMP
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2 max-w-xl">
                <Input
                  placeholder="กรอกเลข Lot ภายใน (เช่น LOT-PM-...) หรือ Lot ซัพพลายเออร์"
                  value={traceSearchLot}
                  onChange={(e) => setTraceSearchLot(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchTrace()}
                />
                <Button className="bg-slate-900 text-white" onClick={handleSearchTrace} disabled={searchingTrace}>
                  <Search className="w-4 h-4 mr-1.5" />
                  {searchingTrace ? "กำลังค้นหา..." : "สืบค้น"}
                </Button>
              </div>

              {traceResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="bg-slate-50 p-4 rounded-lg border grid md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-slate-500 text-xs">Lot ภายใน:</span> <div className="font-mono font-bold">{traceResult.lot.internal_lot_number}</div></div>
                    <div><span className="text-slate-500 text-xs">สินค้า:</span> <div className="font-semibold">{traceResult.lot.item_code} - {traceResult.lot.item_name_th}</div></div>
                    <div><span className="text-slate-500 text-xs">ซัพพลายเออร์:</span> <div>{traceResult.lot.supplier_name} (Lot: {traceResult.lot.supplier_lot_number})</div></div>
                    <div><span className="text-slate-500 text-xs">วันหมดอายุ:</span> <div className="font-mono">{new Date(traceResult.lot.expiry_date).toLocaleDateString("th-TH")}</div></div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-2">ประวัติการเคลื่อนไหวในสมุดบัญชี (Transaction Timeline)</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="px-3 py-2">เลขที่ธุรกรรม</th>
                            <th className="px-3 py-2">ประเภท</th>
                            <th className="px-3 py-2">จากพิกัด</th>
                            <th className="px-3 py-2">ไปยังพิกัด</th>
                            <th className="px-3 py-2 text-right">จำนวน</th>
                            <th className="px-3 py-2">ผู้ทำรายการ</th>
                            <th className="px-3 py-2">เวลา</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {traceResult.transactions.map((t: any) => (
                            <tr key={t.transaction_id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-semibold">{t.transaction_number}</td>
                              <td className="px-3 py-2"><Badge variant="outline">{t.transaction_type}</Badge></td>
                              <td className="px-3 py-2 font-mono">{t.from_barcode || "-"}</td>
                              <td className="px-3 py-2 font-mono">{t.to_barcode || "-"}</td>
                              <td className="px-3 py-2 text-right font-bold">{Number(t.quantity).toLocaleString()} {t.uom}</td>
                              <td className="px-3 py-2">{t.user_name}</td>
                              <td className="px-3 py-2 font-mono">{new Date(t.created_at).toLocaleString("th-TH")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 7: IMMUTABLE LEDGER AUDIT */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-base">สมุดบัญชีคลังสินค้า (Immutable Double-Entry Ledger)</CardTitle>
              <CardDescription className="text-xs">
                บันทึกการเคลื่อนไหวที่ไม่สามารถแก้ไขหรือลบได้ (Append-Only) ตามมาตรฐานความถูกต้องของข้อมูล GMP
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">เลขที่ธุรกรรม (Txn No.)</th>
                      <th className="px-4 py-3">ประเภทธุรกรรม</th>
                      <th className="px-4 py-3">สินค้า</th>
                      <th className="px-4 py-3">Lot ภายใน</th>
                      <th className="px-4 py-3">ต้นทาง</th>
                      <th className="px-4 py-3">ปลายทาง</th>
                      <th className="px-4 py-3 text-right">จำนวน</th>
                      <th className="px-4 py-3">อ้างอิง</th>
                      <th className="px-4 py-3">ผู้บันทึก</th>
                      <th className="px-4 py-3">เวลาที่เกิดรายการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTxns.map((t) => (
                      <tr key={t.transaction_id} className="hover:bg-slate-50 font-mono">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{t.transaction_number}</td>
                        <td className="px-4 py-2.5 font-sans">
                          <Badge variant="outline" className="font-semibold text-[11px] bg-slate-50">
                            {t.transaction_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-sans font-medium">{t.item_code}</td>
                        <td className="px-4 py-2.5 text-slate-600">{t.internal_lot_number}</td>
                        <td className="px-4 py-2.5">{t.from_location || "-"}</td>
                        <td className="px-4 py-2.5">{t.to_location || "-"}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {Number(t.quantity).toLocaleString()} {t.uom}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-500">{t.reference_number}</td>
                        <td className="px-4 py-2.5 font-sans">{t.user_name}</td>
                        <td className="px-4 py-2.5 text-slate-400">{new Date(t.created_at).toLocaleString("th-TH")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: INBOUND RECEIVING (GRN) */}
      <Dialog open={receivingOpen} onOpenChange={setReceivingOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Truck className="w-5 h-5 text-emerald-600" />
              ลงทะเบียนรับสินค้าเข้า (Generate GRN)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              บันทึกสินค้าเข้าพิกัด DOCK-QUARANTINE ตามมาตรฐาน GMP และสั่งพิมพ์ Pallet QR Tag ทันที
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceivingSubmit} className="space-y-3.5 py-1">
            <div>
              <Label className="text-xs font-semibold text-slate-700">เลขที่ใบสั่งซื้อ (PO Number) *</Label>
              <Input
                placeholder="เช่น PO-2026-0925"
                value={rcvPo}
                onChange={(e) => setRcvPo(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">ชื่อซัพพลายเออร์ (Supplier) *</Label>
              <Input
                placeholder="เช่น Thai Glass Packaging Co."
                value={rcvSupplier}
                onChange={(e) => setRcvSupplier(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">เลือกรายการบรรจุภัณฑ์ *</Label>
              <Select value={rcvItemId} onValueChange={(val: any) => setRcvItemId(val || "")} required>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="-- เลือกรหัสสินค้า --" />
                </SelectTrigger>
                <SelectContent>
                  {itemsList.map((item) => (
                    <SelectItem key={item.item_id} value={item.item_id}>
                      {item.item_code} - {item.item_name_th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">จำนวนรับจริง *</Label>
                <Input
                  type="number"
                  placeholder="เช่น 5000"
                  value={rcvQty}
                  onChange={(e) => setRcvQty(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Lot ซัพพลายเออร์ *</Label>
                <Input
                  placeholder="SUPP-LOT-01"
                  value={rcvSupplierLot}
                  onChange={(e) => setRcvSupplierLot(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">วันที่ผลิต (MFG) *</Label>
                <Input
                  type="date"
                  value={rcvMfgDate}
                  onChange={(e) => setRcvMfgDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">วันหมดอายุ (EXP) *</Label>
                <Input
                  type="date"
                  value={rcvExpDate}
                  onChange={(e) => setRcvExpDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={() => setReceivingOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                disabled={submittingRcv}
              >
                {submittingRcv ? "กำลังบันทึก..." : "ยืนยันการรับเข้า & พิมพ์ฉลาก"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: QR CODE LABEL PRINTING */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              ฉลากประจำกล่อง / พาเลท (Pallet QR Tag)
            </DialogTitle>
            <DialogDescription className="text-xs">
              พิมพ์ฉลากติดบนบรรจุภัณฑ์เพื่อรองรับการสแกนด้วยเครื่อง PDA หน้างาน
            </DialogDescription>
          </DialogHeader>

          {currentLabel && (
            <div id="wms-printable-tag" className="border-2 border-dashed border-slate-300 p-4 rounded-xl space-y-3 bg-white text-center">
              <div className="text-xs font-bold tracking-tight text-slate-900 border-b pb-1 uppercase">
                [COSMEFLOW WMS] ฉลากประจำพาเลท / กล่อง
              </div>
              <div className="font-mono font-bold text-lg text-slate-900 bg-slate-50 py-1 rounded border">
                {currentLabel.internal_lot_number}
              </div>
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" className="mx-auto w-36 h-36 border p-1 rounded bg-white shadow-sm" />
              )}
              <div className="text-left text-xs space-y-1 bg-slate-50 p-2.5 rounded font-mono border">
                {currentLabel.item_code && (
                  <div><b>รหัสสินค้า:</b> {currentLabel.item_code}</div>
                )}
                {currentLabel.item_name_th && (
                  <div className="font-sans text-[11px] text-slate-600">{currentLabel.item_name_th}</div>
                )}
                <div><b>GRN:</b> {currentLabel.grn_number}</div>
                <div><b>พิกัดรับเข้า:</b> {currentLabel.dock_location}</div>
                {currentLabel.quantity && (
                  <div><b>จำนวน:</b> {Number(currentLabel.quantity).toLocaleString()} {currentLabel.uom || "PCS"}</div>
                )}
                {currentLabel.expiry_date && (
                  <div><b>วันหมดอายุ (EXP):</b> {new Date(currentLabel.expiry_date).toLocaleDateString("th-TH")}</div>
                )}
                <div className="text-[10px] text-amber-700 font-bold mt-1 pt-1 border-t">
                  ⚠️ สถานะ: QUARANTINE (กักกัน — ห้ามเบิกจ่ายก่อนผ่าน QC)
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setQrModalOpen(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handlePrintLabel}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              สั่งพิมพ์ฉลาก (Print Label)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: QC DISPOSITION */}
      <Dialog open={qcActionModal} onOpenChange={setQcActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ลงผลการตรวจสอบคุณภาพ (QC Disposition)
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedQcLot?.internal_lot_number} ({selectedQcLot?.item_code})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">การตัดสินใจผลตรวจคุณภาพ (QC Decision) *</Label>
              <Select value={qcTargetStatus} onValueChange={(val: any) => setQcTargetStatus(val || "RELEASED")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RELEASED">✅ ผ่านการรับรอง (RELEASED - ปลดล็อกให้เบิกจ่าย)</SelectItem>
                  <SelectItem value="HOLD">⚠️ ระงับชั่วคราว (HOLD - พบข้อบกพร่องรอสอบสวน)</SelectItem>
                  <SelectItem value="REJECTED">❌ ไม่ผ่านเกณฑ์ (REJECTED - ปฏิเสธ/ตัดทิ้ง)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">เหตุผลการตรวจ (Reason Code)</Label>
              <Input value={qcReason} onChange={(e) => setQcReason(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-semibold">บันทึกผลการตรวจแล็บ / ผลตรวจขนาดและกายภาพ</Label>
              <Input
                placeholder="เช่น ขนาดเกลียวได้มาตรฐาน, สีสกรีนคมชัด, ผ่าน Leak Test"
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQcActionModal(false)}>ยกเลิก</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={handleQcSubmit} disabled={submittingQc}>
              {submittingQc ? "กำลังบันทึก..." : "ยืนยันผลตรวจ (Sign Disposition)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DIRECTED PUT-AWAY */}
      <Dialog open={putawayModalOpen} onOpenChange={setPutawayModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              จัดเก็บสินค้าขึ้นชั้นวาง (Directed Put-Away)
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedPutawayItem?.item_code} | Lot: {selectedPutawayItem?.internal_lot_number} | จำนวน {Number(selectedPutawayItem?.physical_quantity || 0).toLocaleString()} {selectedPutawayItem?.base_uom}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {suggestedBin && (
              <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 text-white border border-blue-600/60 p-3.5 rounded-xl text-xs space-y-1 shadow-md">
                <div className="font-semibold text-blue-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI แนะนำพิกัดจัดเก็บที่เหมาะสมที่สุด (Slotting Recommendation):
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    BLINKING BEACON
                  </span>
                </div>
                <div className="font-mono text-base font-bold text-white tracking-wide">{suggestedBin.location_barcode}</div>
                <div className="text-slate-300 text-[11px]">{suggestedBin.location_name}</div>
              </div>
            )}

            {/* Visual Mini Rack Elevation Map */}
            <div className="border border-slate-700 bg-slate-950 p-3.5 rounded-xl text-white space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  ผังชั้นวางจำลอง (Rack R01 Elevation Map)
                </span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Zone A • แถวที่ 1
                </span>
              </div>

              {/* 3 Levels x 2 Bays Matrix */}
              <div className="space-y-2 text-[10px] font-mono">
                {/* Level 3 */}
                <div className="flex gap-2 items-center">
                  <span className="w-14 text-slate-400 text-right font-sans text-[11px]">ชั้น 3 (L03)</span>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className={`p-2 rounded-lg border text-center transition ${chosenTargetBin?.includes("L03-BN01") ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}>
                      <div className="font-bold">B01-L03-BN01</div>
                      <div className="text-[9px] text-slate-500">ช่วงเสา 1 • ชั้น 3</div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center transition ${chosenTargetBin?.includes("L03-BN02") ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}>
                      <div className="font-bold">B02-L03-BN02</div>
                      <div className="text-[9px] text-slate-500">ช่วงเสา 2 • ชั้น 3</div>
                    </div>
                  </div>
                </div>

                {/* Level 2 */}
                <div className="flex gap-2 items-center">
                  <span className="w-14 text-slate-400 text-right font-sans text-[11px]">ชั้น 2 (L02)</span>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className={`p-2 rounded-lg border text-center transition ${chosenTargetBin?.includes("L02-BN01") ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}>
                      <div className="font-bold">B01-L02-BN01</div>
                      <div className="text-[9px] text-slate-500">ช่วงเสา 1 • ชั้น 2</div>
                    </div>
                    <div className={`p-2 rounded-lg border text-center transition ${chosenTargetBin?.includes("L02-BN02") ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}>
                      <div className="font-bold">B02-L02-BN02</div>
                      <div className="text-[9px] text-slate-500">ช่วงเสา 2 • ชั้น 2</div>
                    </div>
                  </div>
                </div>

                {/* Level 1 (Ground) - Target */}
                <div className="flex gap-2 items-center">
                  <span className="w-14 text-emerald-400 font-bold text-right font-sans text-[11px]">ชั้น 1 (พื้น)</span>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    {/* Bay 01 Bin 01 - The recommended slot */}
                    <div
                      className={`relative p-2.5 rounded-lg border-2 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                        chosenTargetBin === "WH-PM-A-R01-B01-L01-BN01" || (!chosenTargetBin && suggestedBin?.location_barcode === "WH-PM-A-R01-B01-L01-BN01")
                          ? "bg-emerald-900/80 border-emerald-400 text-white shadow-[0_0_18px_rgba(16,185,129,0.6)] animate-pulse"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600"
                      }`}
                      onClick={() => setChosenTargetBin("WH-PM-A-R01-B01-L01-BN01")}
                    >
                      {(chosenTargetBin === "WH-PM-A-R01-B01-L01-BN01" || (!chosenTargetBin && suggestedBin?.location_barcode === "WH-PM-A-R01-B01-L01-BN01")) && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 text-[10px] items-center justify-center text-white font-bold shadow-md">📍</span>
                        </span>
                      )}
                      <div className="font-bold text-xs text-emerald-200">WH-PM-A-R01-B01-L01-BN01</div>
                      <div className="text-[10px] text-emerald-300 font-sans mt-0.5 font-medium">ช่วงเสา 1 • ช่องซ้าย (พิกัดแนะนำ 🟢)</div>
                    </div>

                    {/* Bay 02 Bin 02 */}
                    <div
                      className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                        chosenTargetBin === "WH-PM-A-R01-B02-L01-BN02"
                          ? "bg-emerald-950 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600"
                      }`}
                      onClick={() => setChosenTargetBin("WH-PM-A-R01-B02-L01-BN02")}
                    >
                      <div className="font-bold text-xs">WH-PM-A-R01-B02-L01-BN02</div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">ช่วงเสา 2 • ช่องขวา</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex flex-col sm:flex-row justify-between gap-1">
                <span className="flex items-center gap-1 text-emerald-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  ไฟสีเขียวกระพริบ: ตำแหน่งที่ระบบกำหนดให้นำพาเลทไปวาง
                </span>
                <span className="text-slate-300 font-mono text-[10px]">Max Load: 500 KG / พาเลท</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">เลือกหรือสแกนพิกัดจัดเก็บเป้าหมาย *</Label>
              <Select value={chosenTargetBin} onValueChange={(val: any) => setChosenTargetBin(val || "")}>
                <SelectTrigger className="mt-1 font-mono">
                  <SelectValue placeholder="-- เลือกพิกัด --" />
                </SelectTrigger>
                <SelectContent>
                  {locationsList
                    .filter((l) => l.warehouse_code === "WH-PM" && l.location_type === "RACK_BIN")
                    .map((loc) => (
                      <SelectItem key={loc.location_id} value={loc.location_barcode}>
                        {loc.location_barcode} ({loc.location_name})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPutawayModalOpen(false)}>ยกเลิก</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium" onClick={handleConfirmPutaway} disabled={submittingPutaway}>
              {submittingPutaway ? "กำลังบันทึก..." : "ยืนยันการจัดเก็บ (Post Put-away)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CREATE WAVE */}
      <Dialog open={createWaveOpen} onOpenChange={setCreateWaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>สร้าง Wave เบิกจ่ายใหม่ (FEFO Allocation)</DialogTitle>
            <DialogDescription className="text-xs">
              ระบบจะทำการล็อก Lot ที่หมดอายุก่อนและเคลียร์กล่องเศษให้อัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWave} className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">เลขที่คำสั่งผลิต (Production Order No.) *</Label>
              <Input
                placeholder="เช่น MO-2026-0925-01"
                value={waveOrderNo}
                onChange={(e) => setWaveOrderNo(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">เลือกบรรจุภัณฑ์ที่ต้องการเบิก *</Label>
              <Select value={waveItemId} onValueChange={(val: any) => setWaveItemId(val || "")} required>
                <SelectTrigger>
                  <SelectValue placeholder="-- เลือกรหัสสินค้า --" />
                </SelectTrigger>
                <SelectContent>
                  {itemsList.map((item) => (
                    <SelectItem key={item.item_id} value={item.item_id}>
                      {item.item_code} - {item.item_name_th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">จำนวนที่ต้องใช้ (PCS) *</Label>
              <Input
                type="number"
                placeholder="เช่น 2000"
                value={waveQty}
                onChange={(e) => setWaveQty(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setCreateWaveOpen(false)}>ยกเลิก</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium" disabled={submittingWave}>
                {submittingWave ? "กำลังจัดสรร..." : "จัดสรรตาม FEFO และสร้างงานหยิบ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
