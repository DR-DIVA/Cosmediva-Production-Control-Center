"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Code128Barcode, QRCodeSvg } from '@/lib/barcode';
import { Printer, Package, Sparkles, Layers, CheckCircle2, ChevronLeft, ChevronRight, X, RotateCw, QrCode } from 'lucide-react';

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
  const [printRotation, setPrintRotation] = useState<'0' | '90' | '180' | '270' | 'auto'>('0');

  // Load saved printer rotation preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRot = localStorage.getItem('quarantine_tag_rotation');
      if (savedRot && ['0', '90', '180', '270', 'auto'].includes(savedRot)) {
        setPrintRotation(savedRot as any);
      }
    }
  }, []);

  const handleRotationChange = (val: '0' | '90' | '180' | '270' | 'auto') => {
    setPrintRotation(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('quarantine_tag_rotation', val);
    }
  };

  const [codeType, setCodeType] = useState<'qrcode' | 'barcode' | 'none'>('qrcode');

  // Load saved code type preference (defaults to qrcode)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem('quarantine_tag_code_type');
      if (savedCode && ['qrcode', 'barcode', 'none'].includes(savedCode)) {
        setCodeType(savedCode as any);
      }
    }
  }, []);

  const handleCodeTypeChange = (val: 'qrcode' | 'barcode' | 'none') => {
    setCodeType(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('quarantine_tag_code_type', val);
    }
  };

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

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Print handler via isolated iframe to ensure ONLY the 100x80mm tags print without background website
  const handlePrint = () => {
    if (onSavedMetadata) {
      onSavedMetadata({
        boxCount: Number(boxCount) || 1,
        qtyPerBox: Number(qtyPerBox) || Number(totalQty) || 0,
        mfgLot: mfgLot || '-'
      });
    }

    const container = printContainerRef.current;
    if (!container) {
      window.print();
      return;
    }

    // Clean up any existing iframe
    const existingFrame = document.getElementById('quarantine-print-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'quarantine-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '100mm';
    iframe.style.height = '80mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const contentHtml = container.innerHTML;

    let pageLayoutCss = '';
    if (printRotation === '90') {
      pageLayoutCss = `
        @page {
          size: 80mm 100mm;
          margin: 0;
        }
        html, body {
          width: 80mm;
          height: 100mm;
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow: hidden;
        }
        .quarantine-tag-print-page {
          width: 80mm;
          height: 100mm;
          max-width: 80mm;
          max-height: 100mm;
          box-sizing: border-box;
          padding: 0;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
        }
        .tag-rotate-wrapper {
          width: 100mm;
          height: 80mm;
          flex-shrink: 0;
          transform: rotate(90deg);
          transform-origin: center center;
          padding: 2.5mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;
    } else if (printRotation === '270') {
      pageLayoutCss = `
        @page {
          size: 80mm 100mm;
          margin: 0;
        }
        html, body {
          width: 80mm;
          height: 100mm;
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow: hidden;
        }
        .quarantine-tag-print-page {
          width: 80mm;
          height: 100mm;
          max-width: 80mm;
          max-height: 100mm;
          box-sizing: border-box;
          padding: 0;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
        }
        .tag-rotate-wrapper {
          width: 100mm;
          height: 80mm;
          flex-shrink: 0;
          transform: rotate(270deg);
          transform-origin: center center;
          padding: 2.5mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;
    } else if (printRotation === '180') {
      pageLayoutCss = `
        @page {
          size: 100mm 80mm;
          margin: 0;
        }
        html, body {
          width: 100mm;
          height: 80mm;
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow: hidden;
        }
        .quarantine-tag-print-page {
          width: 100mm;
          height: 80mm;
          max-width: 100mm;
          max-height: 80mm;
          box-sizing: border-box;
          padding: 0;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
        }
        .tag-rotate-wrapper {
          width: 100mm;
          height: 80mm;
          flex-shrink: 0;
          transform: rotate(180deg);
          transform-origin: center center;
          padding: 2.5mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;
    } else if (printRotation === 'auto') {
      pageLayoutCss = `
        @page {
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
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
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
          overflow: hidden;
        }
        .tag-rotate-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;
    } else {
      // printRotation === '0'
      pageLayoutCss = `
        @page {
          size: 100mm 80mm;
          margin: 0;
        }
        html, body {
          width: 100mm;
          height: 80mm;
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow: hidden;
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
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
          overflow: hidden;
        }
        .tag-rotate-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Quarantine Tag - ${controlNo || 'COSMEDIVA'}</title>
          <style>
            ${pageLayoutCss}
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              color: #000000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .quarantine-tag-print-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .tag-border {
              width: 100%;
              height: 100%;
              border: 2px solid #000000;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .tag-header {
              border-bottom: 2px solid #000000;
              text-align: center;
              font-weight: bold;
              letter-spacing: 1px;
              padding: 3px 0;
              font-size: 13pt;
              text-transform: uppercase;
            }
            .tag-body {
              flex: 1;
              padding: 6px 10px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              font-size: 9pt;
              line-height: 1.35;
            }
            .tag-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .tag-row-start {
              display: flex;
              align-items: flex-start;
            }
            .label-col {
              width: 72px;
              font-weight: bold;
              flex-shrink: 0;
              font-size: 9.5pt;
            }
            .colon-col {
              width: 10px;
              text-align: center;
              flex-shrink: 0;
            }
            .val-col {
              flex: 1;
              font-size: 9pt;
            }
            .val-bold {
              font-weight: bold;
            }
            .val-mono {
              font-family: monospace;
              font-weight: bold;
            }
            .tag-banner {
              border-top: 2px solid #000000;
              text-align: center;
              font-weight: bold;
              letter-spacing: 0.5px;
              padding: 3px 0;
              font-size: 11pt;
            }
            .tag-rev {
              border-top: 1px solid #000000;
              text-align: center;
              font-size: 7.5pt;
              font-family: monospace;
              padding: 2px 0;
              color: #000000;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print directly inside the iframe
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print error, falling back to window.print():", err);
        window.print();
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 400);
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

                {/* Scale Switcher & Rotation Button */}
                <div className="flex flex-wrap items-center gap-1.5">
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

                  {/* Quick Rotate Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextRot = printRotation === '0' ? '90' : printRotation === '90' ? '180' : printRotation === '180' ? '270' : '0';
                      handleRotationChange(nextRot);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                      printRotation !== '0'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50 hover:text-amber-900'
                    }`}
                    title="คลิกเพื่อหมุนทิศทางภาพป้าย (0° -> 90° -> 180° -> 270°)"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-inherit" />
                    หมุนภาพ ({printRotation === '0' ? '0° แนวนอนปกติ' : `${printRotation}°`})
                  </button>

                  {/* Code Type Switcher Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextCode = codeType === 'qrcode' ? 'barcode' : codeType === 'barcode' ? 'none' : 'qrcode';
                      handleCodeTypeChange(nextCode);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                      codeType === 'qrcode'
                        ? 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-purple-50 hover:text-purple-900'
                    }`}
                    title="สลับรูปแบบโค้ด (QR Code -> Barcode -> ซ่อนโค้ด)"
                  >
                    <QrCode className="w-3.5 h-3.5 text-inherit" />
                    {codeType === 'qrcode' ? 'QR Code (แนะนำ)' : codeType === 'barcode' ? 'Barcode' : 'ไม่แสดงโค้ด'}
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
              <div className="flex flex-col items-center justify-center w-full py-2 min-h-[380px]">
                {/* Width Guide Ruler */}
                <div className="text-[10px] text-slate-500 font-mono mb-1.5 flex items-center gap-1">
                  <span>◄</span>
                  <span className="border-b border-dashed border-slate-400 px-6 font-bold text-slate-700">
                    {['90', '270'].includes(printRotation)
                      ? 'ความกว้างป้ายหลังหมุน: 80 มม. (8 ซม.)'
                      : 'ความกว้างสติ๊กเกอร์: 100 มม. (10 ซม.)'}
                  </span>
                  <span>►</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Height Guide Ruler */}
                  <div className="text-[10px] text-slate-500 font-mono [writing-mode:vertical-rl] rotate-180 flex items-center justify-center gap-1 h-full py-4">
                    <span>◄</span>
                    <span className="border-l border-dashed border-slate-400 py-6 font-bold text-slate-700">
                      {['90', '270'].includes(printRotation)
                        ? 'ความสูงหลังหมุน: 100 มม. (10 ซม.)'
                        : 'ความสูงสติ๊กเกอร์: 80 มม. (8 ซม.)'}
                    </span>
                    <span>►</span>
                  </div>

                  {/* Outer Frame that adjusts bounding box when rotated */}
                  <div 
                    className="flex items-center justify-center transition-all duration-300"
                    style={
                      ['90', '270'].includes(printRotation)
                        ? previewScale === 'actual'
                          ? { width: '80mm', height: '100mm' }
                          : { width: '416px', height: '520px' }
                        : previewScale === 'actual'
                          ? { width: '100mm', height: '80mm' }
                          : { width: '520px', height: '416px' }
                    }
                  >
                    {/* Physical Tag Preview */}
                    <div 
                      className="bg-white text-black font-sans border-2 border-black flex flex-col justify-between select-none shadow-2xl transition-transform duration-300 origin-center"
                      style={{
                        ...(previewScale === 'actual' ? {
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
                          height: '416px',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          fontSize: '13px',
                          lineHeight: 1.35
                        }),
                        transform:
                          printRotation === '90'
                            ? 'rotate(90deg)'
                            : printRotation === '270'
                            ? 'rotate(270deg)'
                            : printRotation === '180'
                            ? 'rotate(180deg)'
                            : 'none'
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
                        {controlNo && codeType !== 'none' && (
                          <div className="shrink-0 pl-1 flex items-center">
                            {codeType === 'qrcode' ? (
                              <QRCodeSvg value={controlNo} size={previewScale === 'actual' ? 32 : 36} />
                            ) : (
                              <Code128Barcode value={controlNo} height={22} width={previewScale === 'actual' ? 140 : 160} />
                            )}
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
            </div>

              <div className="text-[11px] text-slate-500 text-center flex flex-wrap items-center justify-center gap-2 pt-1">
                <span>🖨️ รองรับเครื่องพิมพ์สติกเกอร์ความร้อน 100x80 มม.</span>
                <span>•</span>
                <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  ระบบจะพิมพ์สติกเกอร์ทั้งหมด {tagsToPrint.length} ใบ
                </span>
                {printRotation !== '0' && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-amber-600" />
                      {printRotation === '90' && 'หมุนพิมพ์ 90° (แก้ปัญหาออกแนวตั้ง)'}
                      {printRotation === '270' && 'หมุนพิมพ์ 270°'}
                      {printRotation === '180' && 'พิมพ์กลับหัว 180°'}
                      {printRotation === 'auto' && 'โหมดเลือกการวางแนวใน Chrome'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              ปิดหน้าต่าง
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {/* Code Format Selector (QR Code / Barcode) */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                <QrCode className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                  รูปแบบโค้ด:
                </span>
                <select
                  value={codeType}
                  onChange={(e) => handleCodeTypeChange(e.target.value as any)}
                  className="text-xs bg-purple-50 font-bold border border-purple-300 rounded px-1.5 py-0.5 text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  title="เลือกรูปแบบโค้ดสำหรับสแกน (แนะนำ QR Code สแกนง่าย คมชัด ไม่ทับซ้อน)"
                >
                  <option value="qrcode">📱 QR Code (สแกนง่าย คมชัด แนะนำ)</option>
                  <option value="barcode">|||| Barcode (Code 128)</option>
                  <option value="none">❌ ไม่แสดงโค้ด</option>
                </select>
              </div>

              {/* Orientation / Rotation Selector */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                <RotateCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                  ทิศทางพิมพ์:
                </span>
                <select
                  value={printRotation}
                  onChange={(e) => handleRotationChange(e.target.value as any)}
                  className="text-xs bg-slate-50 font-medium border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  title="ปรับทิศทางการพิมพ์สำหรับเครื่องพิมพ์สติกเกอร์ที่พิมพ์ออกมากลับด้าน"
                >
                  <option value="0">แนวนอนปกติ (0° - แนะนำสำหรับสติกเกอร์ 100x80)</option>
                  <option value="270">🔄 หมุน 270° (ทวนเข็ม - ป้ายตั้งทางซ้าย)</option>
                  <option value="90">🔄 หมุน 90° (ตามเข็ม - ป้ายตั้งทางขวา)</option>
                  <option value="180">↕️ กลับหัว 180°</option>
                  <option value="auto">🌐 ให้เลือกใน Chrome (Auto)</option>
                </select>
              </div>

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

      {/* 2. Hidden on screen, used strictly by isolated iframe print engine */}
      <div ref={printContainerRef} style={{ display: 'none' }}>
        {tagsToPrint.map((tag, idx) => (
          <div key={idx} className="quarantine-tag-print-page">
            <div className="tag-rotate-wrapper">
              <div className="tag-border">
              {/* Header */}
              <div className="tag-header">
                COSMEDIVA
              </div>

              {/* Main Information */}
              <div className="tag-body">
                {/* Name */}
                <div className="tag-row-start">
                  <span className="label-col">Name</span>
                  <span className="colon-col">:</span>
                  <span className="val-col val-bold" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {name || '-'}
                  </span>
                </div>

                {/* Code */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <span className="label-col">Code</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-mono" style={{ fontSize: '9.5pt' }}>
                      {code || '-'}
                    </span>
                  </div>
                </div>

                {/* Control No. + Barcode */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <span className="label-col">Control No.</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-mono" style={{ fontSize: '10.5pt' }}>
                      {controlNo || '-'}
                    </span>
                  </div>
                  {controlNo && codeType !== 'none' && (
                    <div style={{ flexShrink: 0, paddingLeft: '4px', display: 'flex', alignItems: 'center' }}>
                      {codeType === 'qrcode' ? (
                        <QRCodeSvg value={controlNo} size={30} />
                      ) : (
                        <Code128Barcode value={controlNo} height={22} width={140} />
                      )}
                    </div>
                  )}
                </div>

                {/* Supplier + Lot */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <span className="label-col">Supplier</span>
                    <span className="colon-col">:</span>
                    <span className="val-col" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {supplier || '-'}
                    </span>
                  </div>
                  <span style={{ flexShrink: 0, paddingLeft: '8px', fontSize: '8.5pt' }}>
                    Lot.{mfgLot || '-'}
                  </span>
                </div>

                {/* Total Qty + Breakdown */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="label-col">Total Qty.</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-bold">
                      {totalQty ? Number(totalQty).toLocaleString() : 0}{unit}
                    </span>
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: '8.5pt' }}>
                    ({boxCount}กล่อง x {tag.boxQty ? Number(tag.boxQty).toLocaleString() : 0}{unit})
                  </span>
                </div>

                {/* Qty./unit + of N */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="label-col">Qty./unit</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-bold">
                      {tag.boxQty ? Number(tag.boxQty).toLocaleString() : 0} {unit}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '10pt' }}>
                    <span style={{ fontWeight: 'normal', fontSize: '8.5pt', marginRight: '8px' }}>of</span>
                    <span>{tag.boxIndex}</span>
                    <span style={{ margin: '0 4px', fontWeight: 'normal', color: '#666' }}>/</span>
                    <span>{tag.totalBoxes}</span>
                  </div>
                </div>

                {/* Received by + Date */}
                <div className="tag-row" style={{ paddingTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <span className="label-col">Received by</span>
                    <span className="colon-col">:</span>
                    <span className="val-col" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '8.5pt' }}>
                      {receivedBy || '-'}
                    </span>
                  </div>
                  <span style={{ flexShrink: 0, paddingLeft: '8px', fontSize: '8.5pt' }}>
                    รับเข้า {receivedDate || '-'}
                  </span>
                </div>
              </div>

              {/* Tag Banner */}
              <div className="tag-banner">
                Quarantine : กักกัน
              </div>

              {/* Doc Rev Bottom line */}
              <div className="tag-rev">
                {docRev}
              </div>
            </div>
          </div>
        </div>
      ))}
      </div>
    </>
  );
}
