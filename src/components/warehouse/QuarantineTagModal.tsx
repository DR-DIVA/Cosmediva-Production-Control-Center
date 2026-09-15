"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Code128Barcode } from '@/lib/barcode';
import { Printer, Package, Sparkles, Layers, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface QuarantineTagData {
  name: string;
  code: string;
  controlNo: string;
  supplier: string;
  totalQty: number | string;
  unit?: string;
  boxCount?: number | string;
  qtyPerBox?: number | string;
  mfgLot?: string;
  receivedBy?: string;
  receivedDate?: string;
  docRev?: string;
}

interface QuarantineTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: QuarantineTagData | null;
  onSavedMetadata?: (data: { boxCount: number; qtyPerBox: number; mfgLot: string }) => void;
}

export function QuarantineTagModal({
  open,
  onOpenChange,
  initialData,
  onSavedMetadata
}: QuarantineTagModalProps) {
  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [controlNo, setControlNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [totalQty, setTotalQty] = useState<number | string>('');
  const [unit, setUnit] = useState('ชิ้น');
  const [boxCount, setBoxCount] = useState<number>(1);
  const [qtyPerBox, setQtyPerBox] = useState<number | string>('');
  const [mfgLot, setMfgLot] = useState('-');
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [docRev, setDocRev] = useState('PM-WT-001A Rev.02');
  const [printAllSequence, setPrintAllSequence] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(1);
  const [printPaperMode, setPrintPaperMode] = useState<'sticker' | 'a4'>('sticker');
  const [previewScale, setPreviewScale] = useState<'actual' | 'large'>('actual');

  // Sync initialData when modal opens
  useEffect(() => {
    if (initialData && open) {
      setName(initialData.name || '');
      setCode(initialData.code || '');
      setControlNo(initialData.controlNo || '');
      setSupplier(initialData.supplier || '');
      
      const tQty = parseFloat(String(initialData.totalQty)) || 0;
      setTotalQty(tQty || initialData.totalQty || '');
      setUnit(initialData.unit || (initialData.code.startsWith('R4') ? 'KG' : 'ชิ้น'));
      
      const bCount = Math.max(1, parseInt(String(initialData.boxCount || 1), 10) || 1);
      setBoxCount(bCount);

      if (initialData.qtyPerBox) {
        setQtyPerBox(initialData.qtyPerBox);
      } else if (tQty > 0) {
        setQtyPerBox(Math.ceil(tQty / bCount));
      } else {
        setQtyPerBox('');
      }

      setMfgLot(initialData.mfgLot && initialData.mfgLot.trim() ? initialData.mfgLot.trim() : '-');
      setReceivedBy(initialData.receivedBy || 'คลังสินค้า');

      // Date formatting DD/MM/YYYY
      if (initialData.receivedDate) {
        const d = new Date(initialData.receivedDate);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          setReceivedDate(`${dd}/${mm}/${yyyy}`);
        } else {
          setReceivedDate(initialData.receivedDate);
        }
      } else {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        setReceivedDate(`${dd}/${mm}/${yyyy}`);
      }

      // Determine default doc revision: RM-WT-001A Rev.02 vs PM-WT-001A Rev.02
      if (initialData.code?.startsWith('R4') || initialData.code?.startsWith('R-') || initialData.code?.startsWith('RM')) {
        setDocRev('RM-WT-001A Rev.02');
      } else {
        setDocRev(initialData.docRev || 'PM-WT-001A Rev.02');
      }

      setPreviewIndex(1);
    }
  }, [initialData, open]);

  // Handle Box Count changes with auto-calculation of Qty per Box
  const handleBoxCountChange = (val: number) => {
    const safeCount = Math.max(1, val || 1);
    setBoxCount(safeCount);
    const numTotal = parseFloat(String(totalQty)) || 0;
    if (numTotal > 0) {
      setQtyPerBox(Math.ceil(numTotal / safeCount));
    }
  };

  // Handle Total Qty changes
  const handleTotalQtyChange = (val: string) => {
    setTotalQty(val);
    const numTotal = parseFloat(val) || 0;
    if (numTotal > 0 && boxCount > 0) {
      setQtyPerBox(Math.ceil(numTotal / boxCount));
    }
  };

  // Generate sequence of tags
  const tagsToPrint = useMemo(() => {
    const totalCount = Math.max(1, boxCount || 1);
    const list = [];

    if (!printAllSequence) {
      // Print single tag (1 of 1 or current previewIndex)
      list.push({
        boxIndex: previewIndex,
        totalBoxes: totalCount,
        boxQty: qtyPerBox || totalQty
      });
    } else {
      // Print all sequence 1 of N to N of N
      for (let i = 1; i <= totalCount; i++) {
        // Last box may have remainder if uneven
        list.push({
          boxIndex: i,
          totalBoxes: totalCount,
          boxQty: qtyPerBox || totalQty
        });
      }
    }
    return list;
  }, [boxCount, printAllSequence, previewIndex, qtyPerBox, totalQty]);

  // Print handler
  const handlePrint = () => {
    if (onSavedMetadata) {
      onSavedMetadata({
        boxCount: Number(boxCount) || 1,
        qtyPerBox: Number(qtyPerBox) || Number(totalQty) || 0,
        mfgLot: mfgLot || '-'
      });
    }
    window.print();
  };

  if (!open) return null;

  return (
    <>
      {/* 1. Modal Dialog for screen view */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:!max-w-5xl md:!max-w-6xl lg:!max-w-7xl w-[96vw] max-w-[96vw] max-h-[96vh] overflow-y-auto bg-slate-50 p-4 sm:p-6 print:hidden">
          <DialogHeader className="border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
                <Package className="w-5 h-5 text-amber-600" />
                พิมพ์ป้าย Quarantine Tag (กักกัน 100 x 80 มม.)
              </DialogTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:inline">แบบฟอร์ม GMP คอสเมดิวา</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-xs font-bold">
                  {docRev}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              แบบฟอร์มมาตรฐาน GMP สำหรับติดกล่อง/พาเลทบรรจุภัณฑ์และวัตถุดิบที่รับเข้าคลัง เพื่อรอผลตรวจ QC
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-2">
            {/* Left Col: Configurations (5 cols on large screens) */}
            <div className="lg:col-span-5 space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" /> ตั้งค่ายอดและการรันป้ายกล่อง
              </div>

              {/* Total Qty & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">จำนวนรวมทั้งหมด *</Label>
                  <Input
                    type="number"
                    value={totalQty}
                    onChange={e => handleTotalQtyChange(e.target.value)}
                    className="h-9 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">หน่วยนับ</Label>
                  <Input
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="h-9 text-xs bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              {/* Box Count & Qty per Box */}
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    แบ่งจำนวนกล่อง & ยอดต่อกล่อง
                  </Label>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
                    คำนวณอัตโนมัติ
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-amber-900">จำนวนกล่องทั้งหมด *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={boxCount}
                      onChange={e => handleBoxCountChange(parseInt(e.target.value, 10) || 1)}
                      className="h-8 text-xs font-bold bg-white text-center text-amber-950 border-amber-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-amber-900">จำนวนชิ้น/กล่อง</Label>
                    <Input
                      type="number"
                      value={qtyPerBox}
                      onChange={e => setQtyPerBox(e.target.value)}
                      className="h-8 text-xs font-bold bg-white text-center text-amber-950 border-amber-300"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-amber-900 font-medium pt-1">
                  📦 สรุป: <strong className="text-slate-900">{totalQty ? Number(totalQty).toLocaleString() : 0} {unit}</strong> ({boxCount} กล่อง x {qtyPerBox ? Number(qtyPerBox).toLocaleString() : 0} {unit})
                </div>
              </div>

              {/* Supplier & Supplier Lot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">ผู้ส่งมอบ / ลูกค้า</Label>
                  <Input
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Lot ผู้ผลิต (ถ้ามี)</Label>
                  <Input
                    value={mfgLot}
                    onChange={e => setMfgLot(e.target.value)}
                    placeholder="Lot.-"
                    className="h-8 text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Receiver & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">ผู้รับเข้า (Received by)</Label>
                  <Input
                    value={receivedBy}
                    onChange={e => setReceivedBy(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">วันที่รับเข้า</Label>
                  <Input
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    className="h-8 text-xs font-mono bg-slate-50"
                  />
                </div>
              </div>

              {/* Print Mode Selector */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <Label className="text-xs font-bold text-slate-800 block">ตัวเลือกการสั่งพิมพ์</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-200 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50/60 transition-colors">
                    <input
                      type="radio"
                      name="printMode"
                      checked={printAllSequence}
                      onChange={() => setPrintAllSequence(true)}
                      className="accent-amber-600 mt-0.5"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">พิมพ์รันเลขครบทุกกล่อง ({boxCount} ใบ)</span>
                      <p className="text-[11px] text-slate-500">รันพิมพ์ 1 of {boxCount}, 2 of {boxCount} ... จนครบ {boxCount} กล่อง</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-200 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50/60 transition-colors">
                    <input
                      type="radio"
                      name="printMode"
                      checked={!printAllSequence}
                      onChange={() => setPrintAllSequence(false)}
                      className="accent-amber-600 mt-0.5"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">พิมพ์เฉพาะใบเดียว (1 ใบ)</span>
                      <p className="text-[11px] text-slate-500">สำหรับติดพาเลท หรือพิมพ์ทดแทนเฉพาะกล่องที่ชำรุด</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Col: Live Tag Preview (7 cols on large screens) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-start space-y-3.5 bg-slate-100/70 p-4 sm:p-6 rounded-2xl border border-slate-200">
              {/* Preview Control Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 w-full pb-2 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    ตัวอย่างป้ายสติกเกอร์ (100 x 80 มม.)
                  </span>
                </div>

                {/* Scale Switcher */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewScale('actual')}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors flex items-center gap-1 ${
                      previewScale === 'actual'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="แสดงขนาดตามสัดส่วนจริง 100 x 80 มม."
                  >
                    📏 ขนาดจริง 100x80 มม.
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScale('large')}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors flex items-center gap-1 ${
                      previewScale === 'large'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="ขยายขนาดใหญ่เพื่ออ่านชัดเจนเต็มหน้าต่าง"
                  >
                    🔍 ขยายใหญ่เต็มตา
                  </button>
                </div>

                {boxCount > 1 && printAllSequence && (
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 text-xs shadow-xs">
                    <button
                      type="button"
                      disabled={previewIndex <= 1}
                      onClick={() => setPreviewIndex(prev => Math.max(1, prev - 1))}
                      className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs font-bold text-purple-900">
                      กล่องที่ {previewIndex} of {boxCount}
                    </span>
                    <button
                      type="button"
                      disabled={previewIndex >= boxCount}
                      onClick={() => setPreviewIndex(prev => Math.min(boxCount, prev + 1))}
                      className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Physical Tag Preview Card with Ruler Dimension Guides */}
              <div className="flex flex-col items-center justify-center w-full py-2">
                {/* Width Guide Ruler */}
                <div className="text-[10px] text-slate-500 font-mono mb-1.5 flex items-center gap-1">
                  <span>◄</span>
                  <span className="border-b border-dashed border-slate-400 px-6 font-bold text-slate-700">
                    ความกว้างสติ๊กเกอร์ 100 มม. (10 ซม.)
                  </span>
                  <span>►</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Height Guide Ruler */}
                  <div className="text-[10px] text-slate-500 font-mono [writing-mode:vertical-rl] rotate-180 flex items-center justify-center gap-1 h-full py-4">
                    <span>◄</span>
                    <span className="border-l border-dashed border-slate-400 py-6 font-bold text-slate-700">
                      80 มม. (8 ซม.)
                    </span>
                    <span>►</span>
                  </div>

                  {/* Physical Tag Preview */}
                  <div 
                    className="bg-white text-black font-sans border-2 border-black flex flex-col justify-between select-none shadow-2xl transition-all"
                    style={previewScale === 'actual' ? {
                      width: '100mm',
                      height: '80mm',
                      minWidth: '100mm',
                      minHeight: '80mm',
                      maxWidth: '100mm',
                      maxHeight: '80mm',
                      boxSizing: 'border-box',
                      fontSize: '9.5pt',
                      lineHeight: 1.3
                    } : {
                      width: '520px',
                      maxWidth: '100%',
                      aspectRatio: '100 / 80',
                      boxSizing: 'border-box',
                      fontSize: '13px',
                      lineHeight: 1.35
                    }}
                  >
                    {/* Tag Header */}
                    <div className="border-b-2 border-black text-center font-bold tracking-wider py-1 text-sm sm:text-base uppercase bg-white">
                      COSMEDIVA
                    </div>

                    {/* Tag Body */}
                    <div className="flex-1 p-2 sm:p-2.5 flex flex-col justify-between font-medium space-y-1">
                      {/* Name */}
                      <div className="flex items-start">
                        <span className="w-24 font-bold shrink-0">Name</span>
                        <span className="w-3 text-center shrink-0">:</span>
                        <span className="flex-1 font-bold line-clamp-2 leading-tight">
                          {name || '-'}
                        </span>
                      </div>

                      {/* Code */}
                      <div className="flex items-center">
                        <span className="w-24 font-bold shrink-0">Code</span>
                        <span className="w-3 text-center shrink-0">:</span>
                        <span className="flex-1 font-mono font-bold tracking-tight">
                          {code || '-'}
                        </span>
                      </div>

                      {/* Control No. + Barcode */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center flex-1 min-w-0">
                          <span className="w-24 font-bold shrink-0">Control No.</span>
                          <span className="w-3 text-center shrink-0">:</span>
                          <span className="font-mono font-bold text-xs sm:text-sm tracking-tight text-purple-950 truncate">
                            {controlNo || '-'}
                          </span>
                        </div>
                        {controlNo && (
                          <div className="shrink-0 pl-1">
                            <Code128Barcode value={controlNo} height={22} width={previewScale === 'actual' ? 115 : 135} />
                          </div>
                        )}
                      </div>

                      {/* Supplier + Lot */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center flex-1 min-w-0">
                          <span className="w-24 font-bold shrink-0">Supplier</span>
                          <span className="w-3 text-center shrink-0">:</span>
                          <span className="font-medium truncate">{supplier || '-'}</span>
                        </div>
                        <span className="font-medium shrink-0 text-slate-700 pl-2">
                          Lot.{mfgLot || '-'}
                        </span>
                      </div>

                      {/* Total Qty + Package Breakdown */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center">
                          <span className="w-24 font-bold shrink-0">Total Qty.</span>
                          <span className="w-3 text-center shrink-0">:</span>
                          <span className="font-bold">{totalQty ? Number(totalQty).toLocaleString() : 0}{unit}</span>
                        </div>
                        <span className="font-bold text-slate-900 text-[11px] sm:text-xs shrink-0">
                          ({boxCount}กล่อง x {qtyPerBox ? Number(qtyPerBox).toLocaleString() : (totalQty ? Number(totalQty).toLocaleString() : 0)}{unit})
                        </span>
                      </div>

                      {/* Qty./unit + of N */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center">
                          <span className="w-24 font-bold shrink-0">Qty./unit</span>
                          <span className="w-3 text-center shrink-0">:</span>
                          <span className="font-bold">{qtyPerBox ? Number(qtyPerBox).toLocaleString() : (totalQty ? Number(totalQty).toLocaleString() : 0)} {unit}</span>
                        </div>
                        <div className="flex items-center font-bold text-xs sm:text-sm">
                          <span className="text-slate-600 font-normal mr-2">of</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">
                            {printAllSequence ? previewIndex : 1}
                          </span>
                          <span className="mx-1 text-slate-400">/</span>
                          <span className="font-mono">{boxCount}</span>
                        </div>
                      </div>

                      {/* Received by + Date */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center flex-1 min-w-0">
                          <span className="w-24 font-bold shrink-0">Received by</span>
                          <span className="w-3 text-center shrink-0">:</span>
                          <span className="font-medium truncate">{receivedBy || '-'}</span>
                        </div>
                        <span className="font-medium shrink-0 text-[10px] sm:text-[11px] text-slate-700 pl-2">
                          รับเข้า {receivedDate || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Tag Footer Banner */}
                    <div className="border-t-2 border-black text-center font-bold tracking-wide py-1 text-xs sm:text-sm bg-amber-50">
                      Quarantine : กักกัน
                    </div>

                    {/* Doc Rev Bottom line */}
                    <div className="border-t border-black text-center text-[9px] sm:text-[10px] text-slate-700 py-0.5 bg-white font-mono">
                      {docRev}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-2 pt-1">
                <span>🖨️ รองรับเครื่องพิมพ์สติกเกอร์ความร้อน 100x80 มม.</span>
                <span>•</span>
                <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  ระบบจะพิมพ์สติกเกอร์ทั้งหมด {tagsToPrint.length} ใบ
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              ปิดหน้าต่าง
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md px-5 h-9"
              >
                <Printer className="w-4 h-4" />
                สั่งพิมพ์สติกเกอร์ {tagsToPrint.length} ใบ (100x80 มม.)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Hidden on screen, VISIBLE on Print: Pure 100x80mm Thermal Sticker Print Engine */}
      <div className="hidden print:block font-sans text-black">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: 100mm 80mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .quarantine-tag-print-page {
              width: 100mm;
              height: 80mm;
              max-width: 100mm;
              max-height: 80mm;
              box-sizing: border-box;
              padding: 2.5mm;
              page-break-after: always;
              break-after: page;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #ffffff;
            }
            .quarantine-tag-print-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          }
        `}} />

        {tagsToPrint.map((tag, idx) => (
          <div key={idx} className="quarantine-tag-print-page">
            <div className="w-full h-full border-2 border-black flex flex-col justify-between box-sizing">
              {/* Header */}
              <div className="border-b-2 border-black text-center font-bold tracking-wider py-1 text-[13pt] uppercase">
                COSMEDIVA
              </div>

              {/* Main Information */}
              <div className="flex-1 p-2 flex flex-col justify-between text-[9pt] leading-[1.35] font-normal">
                {/* Name */}
                <div className="flex items-start">
                  <span className="w-[68px] font-bold shrink-0 text-[9.5pt]">Name</span>
                  <span className="w-2 text-center shrink-0">:</span>
                  <span className="flex-1 font-bold text-[9pt] line-clamp-2 leading-tight">
                    {name || '-'}
                  </span>
                </div>

                {/* Code */}
                <div className="flex items-center">
                  <span className="w-[68px] font-bold shrink-0 text-[9.5pt]">Code</span>
                  <span className="w-2 text-center shrink-0">:</span>
                  <span className="flex-1 font-mono font-bold text-[9.5pt] tracking-tight">
                    {code || '-'}
                  </span>
                </div>

                {/* Control No. + Barcode */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="w-[68px] font-bold shrink-0 text-[9.5pt]">Control No.</span>
                    <span className="w-2 text-center shrink-0">:</span>
                    <span className="font-mono font-bold text-[10pt] tracking-tight">
                      {controlNo || '-'}
                    </span>
                  </div>
                  {controlNo && (
                    <div className="shrink-0 pl-1">
                      <Code128Barcode value={controlNo} height={22} width={120} />
                    </div>
                  )}
                </div>

                {/* Supplier + Lot */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 truncate">
                    <span className="w-[68px] font-bold shrink-0 text-[9.5pt]">Supplier</span>
                    <span className="w-2 text-center shrink-0">:</span>
                    <span className="font-medium truncate text-[9pt]">{supplier || '-'}</span>
                  </div>
                  <span className="font-medium shrink-0 text-[8.5pt] pl-2">
                    Lot.{mfgLot || '-'}
                  </span>
                </div>

                {/* Total Qty + Breakdown */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-[68px] font-bold shrink-0 text-[9.5pt]">Total Qty.</span>
                    <span className="w-2 text-center shrink-0">:</span>
                    <span className="font-bold text-[9pt]">{totalQty || 0}{unit}</span>
                  </div>
                  <span className="font-bold text-[8.5pt]">
                    ({boxCount}กล่อง x {tag.boxQty}{unit})
                  </span>
                </div>

                {/* Qty./unit + of N */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-[68px] font-bold shrink-0 text-[9.5pt]">Qty./unit</span>
                    <span className="w-2 text-center shrink-0">:</span>
                    <span className="font-bold text-[9pt]">{tag.boxQty} {unit}</span>
                  </div>
                  <div className="flex items-center font-bold text-[10pt]">
                    <span className="font-normal text-[8.5pt] mr-3">of</span>
                    <span>{tag.boxIndex}</span>
                    <span className="mx-1 font-normal text-slate-600">/</span>
                    <span>{tag.totalBoxes}</span>
                  </div>
                </div>

                {/* Received by + Date */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center truncate">
                    <span className="w-[68px] font-bold shrink-0 text-[9.5pt]">Received by</span>
                    <span className="w-2 text-center shrink-0">:</span>
                    <span className="font-medium truncate text-[8.5pt]">{receivedBy || '-'}</span>
                  </div>
                  <span className="font-medium shrink-0 text-[8.5pt] pl-2">
                    รับเข้า {receivedDate || '-'}
                  </span>
                </div>
              </div>

              {/* Tag Banner */}
              <div className="border-t-2 border-black text-center font-bold tracking-wide py-0.5 text-[11pt]">
                Quarantine : กักกัน
              </div>

              {/* Doc Rev Bottom line */}
              <div className="border-t border-black text-center text-[7.5pt] text-black py-0.5 font-mono">
                {docRev}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
