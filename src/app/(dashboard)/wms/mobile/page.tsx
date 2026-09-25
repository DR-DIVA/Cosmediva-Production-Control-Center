"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Scan,
  Package,
  ArrowRightLeft,
  Boxes,
  ClipboardList,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Volume2,
  RefreshCw,
  Truck,
  Smartphone,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { parseBarcode } from "@/lib/wms/barcodeParser";
import { toast } from "sonner";

// Web Audio synthesizer for instant industrial sound feedback
function playSound(type: "success" | "error") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Pleasant high-pitch double chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(80);
      }
    } else {
      // Low warning buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([150, 80, 150]);
      }
    }
  } catch (e) {
    // Audio context not allowed until user gesture
  }
}

export default function WmsMobileOperatorPage() {
  const [activeMode, setActiveMode] = useState<"menu" | "inquiry" | "putaway" | "picking" | "transfer" | "count">("menu");
  const [scanInput, setScanInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Inquiry Mode
  const [inquiryResult, setInquiryResult] = useState<any>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  // Directed Put-away Mode
  const [putawayStep, setPutawayStep] = useState<"scan_bin" | "scan_lot" | "confirm">("scan_bin");
  const [scannedBin, setScannedBin] = useState("");
  const [scannedLot, setScannedLot] = useState("");
  const [putawayQty, setPutawayQty] = useState("");

  // Directed Pick Mode
  const [pickLists, setPickLists] = useState<any[]>([]);
  const [activePickList, setActivePickList] = useState<any>(null);
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [scannedPickBin, setScannedPickBin] = useState("");
  const [scannedPickLot, setScannedPickLot] = useState("");
  const [pickedQtyInput, setPickedQtyInput] = useState("");

  // Auto-focus input on every view
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [activeMode, putawayStep]);

  // Auto-scan if URL contains query parameter (e.g. scanned from LINE, iPhone Camera, or direct link)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const lotParam = params.get("lot");
    const dataParam = params.get("data") || params.get("scan");
    const locParam = params.get("loc");
    const target = lotParam || dataParam || locParam;

    if (target) {
      setActiveMode("inquiry");
      const autoInquire = async () => {
        setInquiryLoading(true);
        try {
          const parsed = parseBarcode(target);
          const queryTerm = parsed.lotNumber || parsed.id || target;
          const res = await fetch(`/api/wms/trace?lot=${encodeURIComponent(queryTerm)}`);
          const data = await res.json();
          if (res.ok && (data.lot || data.location)) {
            playSound("success");
            setInquiryResult(data);
            toast.success(`สแกนสำเร็จ: ${data.lot?.internal_lot_number || data.location?.location_barcode}`);
          } else {
            playSound("error");
            toast.error("ไม่พบข้อมูลบาร์โค้ดนี้ในระบบ");
          }
        } catch (err: any) {
          playSound("error");
          toast.error(err.message);
        } finally {
          setInquiryLoading(false);
        }
      };
      autoInquire();
    }
  }, []);

  // Load pick lists when entering pick mode
  useEffect(() => {
    if (activeMode === "picking") {
      fetch("/api/wms/picking")
        .then((r) => r.json())
        .then((d) => setPickLists(d.pickLists || []));
    }
  }, [activeMode]);

  // Core scan processing logic
  const executeScan = async (rawInput: string) => {
    const raw = (rawInput || "").trim();
    if (!raw) {
      playSound("error");
      toast.info("กรุณาพิมพ์เลข Lot หรือแตะปุ่มตัวอย่างด้านล่างเพื่อทดสอบสแกน");
      inputRef.current?.focus();
      return;
    }
    setScanInput("");

    const parsed = parseBarcode(raw);

    // AUTO-ROUTE FROM MENU TO INQUIRY
    let currentMode = activeMode;
    if (currentMode === "menu") {
      setActiveMode("inquiry");
      currentMode = "inquiry";
    }

    // MODE: INQUIRY
    if (currentMode === "inquiry") {
      setInquiryLoading(true);
      try {
        const queryTerm = parsed.lotNumber || parsed.id || raw;
        const res = await fetch(`/api/wms/trace?lot=${encodeURIComponent(queryTerm)}`);
        const data = await res.json();
        if (res.ok && (data.lot || data.location)) {
          playSound("success");
          setInquiryResult(data);
          toast.success(`สแกนสำเร็จ: ${data.lot?.internal_lot_number || data.location?.location_barcode}`);
        } else {
          playSound("error");
          toast.error("ไม่พบข้อมูลบาร์โค้ดนี้ในระบบ");
          setInquiryResult(null);
        }
      } catch (err: any) {
        playSound("error");
        toast.error(err.message);
      } finally {
        setInquiryLoading(false);
      }
      return;
    }

    // MODE: PUT-AWAY
    if (activeMode === "putaway") {
      if (putawayStep === "scan_bin") {
        if (parsed.type === "LOCATION" || raw.startsWith("WH-")) {
          playSound("success");
          setScannedBin(raw);
          setPutawayStep("scan_lot");
          toast.success(`สแกนพิกัดสำเร็จ: ${raw}`);
        } else {
          playSound("error");
          toast.error("กรุณาสแกนบาร์โค้ดพิกัดช่องเก็บ (เช่น WH-PM-A-...)");
        }
        return;
      }

      if (putawayStep === "scan_lot") {
        const lotNum = parsed.lotNumber || raw;
        if (lotNum.startsWith("LOT-") || parsed.isStructured) {
          playSound("success");
          setScannedLot(lotNum);
          setPutawayStep("confirm");
          toast.success(`สแกน Lot สำเร็จ: ${lotNum}`);
        } else {
          playSound("error");
          toast.error("กรุณาสแกนบาร์โค้ดประจำ Lot หรือพาเลท");
        }
        return;
      }
    }

    // MODE: PICKING
    if (activeMode === "picking" && activePickList) {
      const curTask = activePickList.items[currentPickIndex];
      if (!curTask) return;

      if (!scannedPickBin) {
        if (raw === curTask.location_barcode) {
          playSound("success");
          setScannedPickBin(raw);
          toast.success(`พิกัดถูกต้อง: ${raw}`);
        } else {
          playSound("error");
          toast.error(`พิกัดไม่ถูกต้อง! ระบบสั่งให้ไปที่ ${curTask.location_barcode}`);
        }
        return;
      }

      if (!scannedPickLot) {
        const lotNum = parsed.lotNumber || raw;
        if (lotNum === curTask.internal_lot_number) {
          playSound("success");
          setScannedPickLot(lotNum);
          setPickedQtyInput(curTask.required_qty.toString());
          toast.success(`Lot ถูกต้อง: ${lotNum}`);
        } else {
          playSound("error");
          toast.error(`Lot ไม่ถูกต้อง! ระบบสั่งให้หยิบ Lot ${curTask.internal_lot_number}`);
        }
        return;
      }
    }
  };

  // Handle Hardware Laser Scan / Enter Key
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeScan(scanInput);
  };

  // Submit Put-away Execution
  const handleExecutePutaway = async () => {
    if (!scannedBin || !scannedLot) return;
    try {
      // Find item and lot from trace API
      const traceRes = await fetch(`/api/wms/trace?lot=${encodeURIComponent(scannedLot)}`);
      const traceData = await traceRes.json();
      if (!traceRes.ok || !traceData.lot) throw new Error("ไม่พบข้อมูล Lot นี้ในระบบ");

      const lot = traceData.lot;
      const res = await fetch("/api/wms/putaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: lot.item_id,
          lot_id: lot.lot_id,
          from_location_barcode: "WH-PM-DOCK-QUAR-01",
          target_location_barcode: scannedBin,
          quantity: parseFloat(putawayQty || "5000"),
          uom: lot.base_uom,
          user_id: "MOBILE-OP",
          user_name: "Mobile Operator (PDA)",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      playSound("success");
      toast.success("จัดเก็บเข้าช่องสำเร็จเรียบร้อย!");
      setPutawayStep("scan_bin");
      setScannedBin("");
      setScannedLot("");
      setPutawayQty("");
    } catch (err: any) {
      playSound("error");
      toast.error(err.message);
    }
  };

  // Confirm Single Pick Step
  const handleConfirmPickStep = async () => {
    const curTask = activePickList.items[currentPickIndex];
    if (!curTask) return;

    try {
      const res = await fetch("/api/wms/picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM_PICK_STEP",
          item_pick_id: curTask.item_pick_id,
          scanned_location_barcode: scannedPickBin,
          scanned_lot_number: scannedPickLot,
          picked_qty: parseFloat(pickedQtyInput || curTask.required_qty),
          user_name: "Mobile Operator (PDA)",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      playSound("success");
      toast.success("บันทึกการหยิบรายการนี้สำเร็จ!");

      // Advance to next task
      setScannedPickBin("");
      setScannedPickLot("");
      setPickedQtyInput("");

      if (currentPickIndex + 1 < activePickList.items.length) {
        setCurrentPickIndex(currentPickIndex + 1);
      } else {
        toast.success("หยิบครบทุกรายการใน Wave นี้แล้ว! พร้อมนำไปส่งมอบหน้าไลน์ผลิต");
        setActivePickList(null);
      }
    } catch (err: any) {
      playSound("error");
      toast.error(err.message);
    }
  };

  // Load specific pick list tasks
  const handleSelectPickList = async (pickListId: string) => {
    try {
      const res = await fetch(`/api/wms/picking?pick_list_id=${pickListId}`);
      const data = await res.json();
      if (res.ok) {
        setActivePickList(data);
        setCurrentPickIndex(0);
        setScannedPickBin("");
        setScannedPickLot("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* 1. Mobile App Bar */}
      <header className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          {activeMode !== "menu" ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => {
                setActiveMode("menu");
                setInquiryResult(null);
                setPutawayStep("scan_bin");
              }}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          ) : (
            <Link href="/wms">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
          )}

          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
              <span>CosmeFlow WMS Mobile</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h1>
            <p className="text-[11px] text-slate-400">WH-PM • โหมดสแกนเนอร์หน้างาน</p>
          </div>
        </div>

        <Badge variant="outline" className="bg-emerald-950/60 text-emerald-400 border-emerald-700 font-mono text-xs">
          ONLINE
        </Badge>
      </header>

      {/* 2. Global Barcode Scanning Bar (Always Listen to Hardware Scanners) */}
      <div className="p-3 bg-slate-800/80 border-b border-slate-700 sticky top-[57px] z-20">
        <form onSubmit={handleScanSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Scan className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="สแกนบาร์โค้ด หรือพิมพ์..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="pl-10 h-12 bg-slate-950 border-slate-700 text-white font-mono text-base focus-visible:ring-emerald-500"
            />
          </div>
          <Button type="submit" className="h-12 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            ยิงสแกน
          </Button>
        </form>
      </div>

      {/* 3. Main Operational Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {/* ============================================================== */}
        {/* VIEW: MAIN OPERATOR MENU (LARGE BUTTONS >= 64px) */}
        {/* ============================================================== */}
        {activeMode === "menu" && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              เลือกภารกิจคลังสินค้า (Select Task)
            </div>

            <Button
              className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-between px-5 rounded-xl shadow-lg border border-blue-500"
              onClick={() => setActiveMode("putaway")}
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-blue-800 rounded-lg">
                  <ArrowRightLeft className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">จัดเก็บสินค้าเข้าช่อง (Put-Away)</div>
                  <div className="text-xs text-blue-200">สแกนพิกัดเสา $\rightarrow$ สแกนพาเลทเพื่อจัดเก็บ</div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-blue-300" />
            </Button>

            <Button
              className="w-full h-20 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-between px-5 rounded-xl shadow-lg border border-indigo-500"
              onClick={() => setActiveMode("picking")}
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-indigo-800 rounded-lg">
                  <Boxes className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">เบิกจ่ายตาม FEFO (Picking)</div>
                  <div className="text-xs text-indigo-200">ระบบนำทางหยิบกล่องที่หมดอายุก่อน</div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-indigo-300" />
            </Button>

            <Button
              className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-between px-5 rounded-xl shadow-lg border border-emerald-500"
              onClick={() => setActiveMode("inquiry")}
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-emerald-800 rounded-lg">
                  <Search className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">ค้นหาและเช็กสต็อกด่วน (Inquiry)</div>
                  <div className="text-xs text-emerald-200">สแกนพิกัดหรือ Lot เพื่อดูยอดและสถานะ QC</div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-emerald-300" />
            </Button>

            <Button
              className="w-full h-20 bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-between px-5 rounded-xl shadow-lg border border-amber-500"
              onClick={() => {
                toast.info("เปิดโหมดตรวจนับสต็อก Cycle Count");
                setActiveMode("inquiry");
              }}
            >
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-amber-800 rounded-lg">
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">ตรวจนับวงรอบ (Blind Count)</div>
                  <div className="text-xs text-amber-200">นับจริงโดยไม่แสดงยอดระบบ ป้องกันเดายอด</div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-amber-300" />
            </Button>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW: INQUIRY (SCAN ANYTHING) */}
        {/* ============================================================== */}
        {activeMode === "inquiry" && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
              <Scan className="w-12 h-12 mx-auto text-emerald-400 mb-2 animate-bounce" />
              <div className="font-bold text-base text-white">พร้อมสแกนค้นหาข้อมูล</div>
              <p className="text-xs text-slate-400 mt-1">
                ยิงสแกนบาร์โค้ด QR บนกล่อง หรือพิมพ์เลข Lot ในช่องด้านบนแล้วกดยิงสแกน
              </p>
            </div>

            {/* Quick Test Barcode Chips for Mobile Testers */}
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>⚡ แตะเพื่อทดสอบสแกน (Quick Scan):</span>
                <span className="text-[10px] text-emerald-400 font-mono">1-TAP TEST</span>
              </div>
              <p className="text-[11px] text-slate-400">
                แตะปุ่มด้านล่างเพื่อจำลองการยิงบาร์โค้ด (มีเสียง Chime ตอบรับทันที):
              </p>
              <div className="flex flex-col gap-2 pt-0.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-xs font-mono h-11 bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                  onClick={() => executeScan("LOT-PM-202609-0001")}
                >
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-sans font-bold text-[10px]">LOT 1</span>
                    <span>LOT-PM-202609-0001</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">ขวดแก้วใส 30ml</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-xs font-mono h-11 bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                  onClick={() => executeScan("LOT-PM-202609-0002")}
                >
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-sans font-bold text-[10px]">LOT 2</span>
                    <span>LOT-PM-202609-0002</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">ขวดแก้วใส 30ml</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between text-xs font-mono h-11 bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                  onClick={() => executeScan("WH-PM-A-R01-B01-L01-BN01")}
                >
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-sans font-bold text-[10px]">พิกัด BIN</span>
                    <span>WH-PM-A-R01-B01-L01-BN01</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">ชั้น 1 แร็ค R01</span>
                </Button>
              </div>
            </div>

            {inquiryResult && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                {/* WMS Header Badge */}
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-emerald-300 font-bold">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>COSMEFLOW:PALLET</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-400 text-emerald-300 text-[10px] font-mono">
                    SCANNED & VERIFIED
                  </Badge>
                </div>

                {/* Raw readable text line matching user's exact format */}
                <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all">
                  <span className="text-emerald-400 font-bold">COSMEFLOW:PALLET</span> | Lot: <span className="text-white font-bold">{inquiryResult.lot.internal_lot_number}</span> | Item: <span className="text-white">{inquiryResult.lot.item_code}</span> | Qty: <span className="text-emerald-400 font-bold">{(inquiryResult.currentLocations?.reduce((s: number, l: any) => s + Number(l.physical_quantity || 0), 0) || Number(inquiryResult.lot.physical_quantity || 5000)).toLocaleString()}</span> | Exp: <span className="text-amber-300 font-bold">{inquiryResult.lot.expiry_date ? inquiryResult.lot.expiry_date.substring(0, 10) : "-"}</span>
                </div>

                <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                  <div>
                    <div className="text-lg font-bold text-white">{inquiryResult.lot.item_code}</div>
                    <div className="text-xs text-slate-400">{inquiryResult.lot.item_name_th}</div>
                  </div>
                  <Badge
                    className={
                      inquiryResult.lot.qc_status === "RELEASED"
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                    }
                  >
                    {inquiryResult.lot.qc_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="text-slate-500">Lot ภายใน:</div>
                    <div className="font-mono font-bold text-white text-sm">{inquiryResult.lot.internal_lot_number}</div>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="text-slate-500">วันหมดอายุ (EXP):</div>
                    <div className="font-mono font-bold text-amber-400 text-sm">
                      {new Date(inquiryResult.lot.expiry_date).toLocaleDateString("th-TH")}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-slate-400">พิกัดจัดเก็บปัจจุบัน:</div>
                  {inquiryResult.currentLocations && inquiryResult.currentLocations.map((loc: any) => (
                    <div key={loc.balance_id} className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="font-mono font-bold text-emerald-400">{loc.location_barcode}</div>
                        <div className="text-[10px] text-slate-500">{loc.location_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-white">{Number(loc.physical_quantity).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">พร้อมใช้: {Number(loc.available_quantity).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW: DIRECTED PUT-AWAY */}
        {/* ============================================================== */}
        {activeMode === "putaway" && (
          <div className="space-y-4">
            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-1 text-center text-xs">
              <div className={`p-2 rounded font-bold ${putawayStep === "scan_bin" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                1. สแกนพิกัด Bin
              </div>
              <div className={`p-2 rounded font-bold ${putawayStep === "scan_lot" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                2. สแกน Lot/QR
              </div>
              <div className={`p-2 rounded font-bold ${putawayStep === "confirm" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                3. ยืนยันยอด
              </div>
            </div>

            {putawayStep === "scan_bin" && (
              <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 text-center space-y-3">
                <ArrowRightLeft className="w-12 h-12 mx-auto text-blue-400" />
                <h3 className="text-lg font-bold text-white">ขั้นตอนที่ 1: สแกนพิกัดจัดเก็บ</h3>
                <p className="text-xs text-slate-300">
                  ขับรถโฟล์คลิฟต์ไปยังช่องเก็บเป้าหมาย แล้วสแกน QR Code พิกัดที่เสา (เช่น WH-PM-A-...)
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs font-mono h-10 bg-slate-900 border-slate-700 text-blue-300 hover:bg-slate-700"
                    onClick={() => executeScan("WH-PM-A-R01-B01-L01-BN01")}
                  >
                    ⚡ จำลองสแกน: WH-PM-A-R01-B01-L01-BN01
                  </Button>
                </div>
              </div>
            )}

            {putawayStep === "scan_lot" && (
              <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <div className="text-xs text-slate-400">พิกัดเป้าหมายที่เลือก:</div>
                <div className="font-mono text-xl font-bold text-emerald-400">{scannedBin}</div>
                <div className="border-t border-slate-700 pt-3 space-y-2">
                  <h3 className="text-lg font-bold text-white">ขั้นตอนที่ 2: สแกน QR บนกล่อง/พาเลท</h3>
                  <p className="text-xs text-slate-300">ยิงสแกนบาร์โค้ด Lot ที่กำลังจะวางลงช่อง</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs font-mono h-10 bg-slate-900 border-slate-700 text-emerald-300 hover:bg-slate-700"
                    onClick={() => executeScan("LOT-PM-202609-0001")}
                  >
                    ⚡ จำลองสแกน: LOT-PM-202609-0001
                  </Button>
                </div>
              </div>
            )}

            {putawayStep === "confirm" && (
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="font-bold text-lg text-white border-b border-slate-800 pb-2">
                  ยืนยันการจัดเก็บเข้าช่องเก็บ
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between bg-slate-900 p-2.5 rounded">
                    <span className="text-slate-400">พิกัดเป้าหมาย:</span>
                    <span className="font-mono font-bold text-blue-400">{scannedBin}</span>
                  </div>
                  <div className="flex justify-between bg-slate-900 p-2.5 rounded">
                    <span className="text-slate-400">Lot ที่จัดเก็บ:</span>
                    <span className="font-mono font-bold text-white">{scannedLot}</span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">จำนวนที่จัดเก็บ (PCS):</label>
                    <Input
                      type="number"
                      value={putawayQty}
                      onChange={(e) => setPutawayQty(e.target.value)}
                      placeholder="เช่น 5000"
                      className="mt-1 h-12 bg-slate-900 border-slate-700 text-white font-mono text-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 border-slate-700 text-slate-300"
                    onClick={() => setPutawayStep("scan_bin")}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base"
                    onClick={handleExecutePutaway}
                  >
                    ยืนยันจัดเก็บ (Commit)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW: FEFO PICKING QUEUE */}
        {/* ============================================================== */}
        {activeMode === "picking" && (
          <div className="space-y-4">
            {!activePickList ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  เลือก Wave คำสั่งหยิบสินค้า (Active Waves)
                </div>
                {pickLists.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    ไม่มี Wave คำสั่งหยิบที่เปิดค้างในขณะนี้
                  </div>
                ) : (
                  pickLists.map((pick) => (
                    <Card
                      key={pick.pick_list_id}
                      className="bg-slate-950 border-slate-800 hover:border-indigo-500 transition-all cursor-pointer"
                      onClick={() => handleSelectPickList(pick.pick_list_id)}
                    >
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <div className="font-mono font-bold text-base text-white">{pick.pick_list_number}</div>
                          <div className="text-xs text-indigo-400 mt-0.5">ใบสั่งผลิต: {pick.production_order_no}</div>
                          <div className="text-[11px] text-slate-400 mt-1">ส่งมอบ: {pick.staging_location}</div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-500" />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              /* Active Picking Task View */
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/60 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-indigo-400 font-semibold">ใบสั่งหยิบ (Wave Active)</div>
                    <div className="font-mono font-bold text-white text-base">{activePickList.header.pick_list_number}</div>
                  </div>
                  <Badge className="bg-indigo-600 text-white font-mono">
                    รายการ {currentPickIndex + 1} / {activePickList.items.length}
                  </Badge>
                </div>

                {activePickList.items[currentPickIndex] && (
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                    {/* Navigation Directives */}
                    <div className="p-3 bg-indigo-950/40 rounded-lg border border-indigo-800/50">
                      <div className="text-xs text-indigo-300 font-semibold">นำทางไปยังพิกัด (Directed Bin):</div>
                      <div className="font-mono text-2xl font-black text-indigo-400 tracking-wide mt-1">
                        {activePickList.items[currentPickIndex].location_barcode}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="bg-slate-900 p-3 rounded">
                        <div className="text-xs text-slate-500">สินค้า:</div>
                        <div className="font-bold text-white text-base">{activePickList.items[currentPickIndex].item_code}</div>
                        <div className="text-xs text-slate-400">{activePickList.items[currentPickIndex].item_name_th}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900 p-2.5 rounded">
                          <div className="text-xs text-slate-500">Lot ที่ต้องหยิบ (FEFO):</div>
                          <div className="font-mono font-bold text-amber-400">
                            {activePickList.items[currentPickIndex].internal_lot_number}
                          </div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded">
                          <div className="text-xs text-slate-500">จำนวนที่ต้องหยิบ:</div>
                          <div className="font-bold text-emerald-400 text-base">
                            {Number(activePickList.items[currentPickIndex].required_qty).toLocaleString()} {activePickList.items[currentPickIndex].uom}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scan Status Feedback */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">สแกนยืนยันพิกัด:</span>
                        {scannedPickBin ? (
                          <span className="text-emerald-400 font-bold font-mono">✅ {scannedPickBin}</span>
                        ) : (
                          <span className="text-amber-400 animate-pulse font-medium">รอสแกนพิกัดเสา</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">สแกนยืนยัน Lot:</span>
                        {scannedPickLot ? (
                          <span className="text-emerald-400 font-bold font-mono">✅ {scannedPickLot}</span>
                        ) : (
                          <span className="text-amber-400 animate-pulse font-medium">รอสแกนกล่องสินค้า</span>
                        )}
                      </div>
                    </div>

                    {/* Commit Button */}
                    <Button
                      disabled={!scannedPickBin || !scannedPickLot}
                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base disabled:opacity-30"
                      onClick={handleConfirmPickStep}
                    >
                      <Check className="w-5 h-5 mr-2" />
                      ยืนยันการหยิบรายการนี้
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
