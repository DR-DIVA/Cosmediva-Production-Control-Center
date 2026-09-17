"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Code128Barcode, QRCodeSvg } from '@/lib/barcode';
import { Printer, Package, Sparkles, Layers, CheckCircle2, ChevronLeft, ChevronRight, X, RotateCw, QrCode, Maximize2, Square, AlertTriangle, ArrowLeftRight, Info } from 'lucide-react';

export interface QuarantineTagData {
  name: string;
  code: string;
  controlNo: string;
  supplier: string;
  totalQty: number | string;
  unit?: string;
  packageType?: string;
  boxCount?: number | string;
  qtyPerBox?: number | string;
  oddBoxCount?: number | string;
  oddQtyPerBox?: number | string;
  mfgLot?: string;
  receivedBy?: string;
  receivedDate?: string;
  docRev?: string;
}

export interface LabelSizeConfig {
  id: string;
  name: string;
  width: number; // mm
  height: number; // mm
  category: 'popular' | 'standard' | 'small' | 'large';
  paddingMm: number;
  headerFontSize: string;
  bodyFontSize: string;
  bodyLineHeight: number;
  labelColWidth: string;
  bannerFontSize: string;
  revFontSize: string;
  qrSize: number;
  barcodeHeight: number;
  barcodeWidth: number;
}

export const LABEL_SIZES: Record<string, LabelSizeConfig> = {
  '100x75': {
    id: '100x75',
    name: '100 x 75 มม. (แนวนอน - ใช้งานปัจจุบัน ⭐)',
    width: 100,
    height: 75,
    category: 'popular',
    paddingMm: 0.8,
    headerFontSize: '13pt',
    bodyFontSize: '9pt',
    bodyLineHeight: 1.3,
    labelColWidth: '68px',
    bannerFontSize: '11pt',
    revFontSize: '7.2pt',
    qrSize: 32,
    barcodeHeight: 20,
    barcodeWidth: 140
  },
  '100x80': {
    id: '100x80',
    name: '100 x 80 มม. (แนวนอน - มาตรฐานเดิม)',
    width: 100,
    height: 80,
    category: 'popular',
    paddingMm: 2.0,
    headerFontSize: '13.5pt',
    bodyFontSize: '9.2pt',
    bodyLineHeight: 1.35,
    labelColWidth: '72px',
    bannerFontSize: '11.5pt',
    revFontSize: '7.5pt',
    qrSize: 32,
    barcodeHeight: 22,
    barcodeWidth: 140
  },
  '80x100': {
    id: '80x100',
    name: '80 x 100 มม. (แนวตั้ง)',
    width: 80,
    height: 100,
    category: 'popular',
    paddingMm: 1.0,
    headerFontSize: '12.5pt',
    bodyFontSize: '8.8pt',
    bodyLineHeight: 1.3,
    labelColWidth: '60px',
    bannerFontSize: '11pt',
    revFontSize: '7pt',
    qrSize: 30,
    barcodeHeight: 20,
    barcodeWidth: 120
  },
  '75x100': {
    id: '75x100',
    name: '75 x 100 มม. (แนวตั้ง)',
    width: 75,
    height: 100,
    category: 'popular',
    paddingMm: 0.8,
    headerFontSize: '12pt',
    bodyFontSize: '8.5pt',
    bodyLineHeight: 1.3,
    labelColWidth: '58px',
    bannerFontSize: '10.5pt',
    revFontSize: '7pt',
    qrSize: 28,
    barcodeHeight: 20,
    barcodeWidth: 115
  },
  '80x50': {
    id: '80x50',
    name: '80 x 50 มม. (แนวนอน)',
    width: 80,
    height: 50,
    category: 'standard',
    paddingMm: 1.2,
    headerFontSize: '10pt',
    bodyFontSize: '7pt',
    bodyLineHeight: 1.18,
    labelColWidth: '50px',
    bannerFontSize: '8.5pt',
    revFontSize: '5.5pt',
    qrSize: 22,
    barcodeHeight: 15,
    barcodeWidth: 100
  },
  '75x50': {
    id: '75x50',
    name: '75 x 50 มม. (แนวนอน)',
    width: 75,
    height: 50,
    category: 'standard',
    paddingMm: 1.2,
    headerFontSize: '9.5pt',
    bodyFontSize: '6.8pt',
    bodyLineHeight: 1.15,
    labelColWidth: '48px',
    bannerFontSize: '8.5pt',
    revFontSize: '5.5pt',
    qrSize: 21,
    barcodeHeight: 15,
    barcodeWidth: 95
  },
  '70x50': {
    id: '70x50',
    name: '70 x 50 มม. (แนวนอนกะทัดรัด)',
    width: 70,
    height: 50,
    category: 'standard',
    paddingMm: 1.2,
    headerFontSize: '9pt',
    bodyFontSize: '6.5pt',
    bodyLineHeight: 1.15,
    labelColWidth: '46px',
    bannerFontSize: '8pt',
    revFontSize: '5.5pt',
    qrSize: 20,
    barcodeHeight: 14,
    barcodeWidth: 90
  },
  '50x30': {
    id: '50x30',
    name: '50 x 30 มม. (ดวงเล็กพิเศษ)',
    width: 50,
    height: 30,
    category: 'small',
    paddingMm: 0.8,
    headerFontSize: '7pt',
    bodyFontSize: '4.8pt',
    bodyLineHeight: 1.1,
    labelColWidth: '32px',
    bannerFontSize: '6pt',
    revFontSize: '4.2pt',
    qrSize: 15,
    barcodeHeight: 10,
    barcodeWidth: 65
  },
  '100x100': {
    id: '100x100',
    name: '100 x 100 มม. (สี่เหลี่ยมจัตุรัส)',
    width: 100,
    height: 100,
    category: 'large',
    paddingMm: 2.5,
    headerFontSize: '14pt',
    bodyFontSize: '9.5pt',
    bodyLineHeight: 1.4,
    labelColWidth: '75px',
    bannerFontSize: '12pt',
    revFontSize: '8pt',
    qrSize: 34,
    barcodeHeight: 24,
    barcodeWidth: 150
  },
  '100x150': {
    id: '100x150',
    name: '100 x 150 มม. (ขนาดใหญ่ / ติดพาเลท)',
    width: 100,
    height: 150,
    category: 'large',
    paddingMm: 3,
    headerFontSize: '16pt',
    bodyFontSize: '11pt',
    bodyLineHeight: 1.5,
    labelColWidth: '85px',
    bannerFontSize: '14pt',
    revFontSize: '9pt',
    qrSize: 45,
    barcodeHeight: 30,
    barcodeWidth: 170
  }
};

interface QuarantineTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: QuarantineTagData | null;
  onSavedMetadata?: (data: { boxCount: number; qtyPerBox: number; mfgLot: string; packageType?: string; oddBoxCount?: number; oddQtyPerBox?: number }) => void;
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
  const [packageType, setPackageType] = useState('ลัง');
  const [customPackageType, setCustomPackageType] = useState('');
  const [boxCount, setBoxCount] = useState<number>(1);
  const [qtyPerBox, setQtyPerBox] = useState<number | string>('');
  const [oddBoxCount, setOddBoxCount] = useState<number>(0);
  const [oddQtyPerBox, setOddQtyPerBox] = useState<number | string>('');
  const [mfgLot, setMfgLot] = useState('-');
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [docRev, setDocRev] = useState('PM-WT-001A Rev.02');
  const [printAllSequence, setPrintAllSequence] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(1);
  const [printPaperMode, setPrintPaperMode] = useState<'sticker' | 'a4'>('sticker');
  const [previewScale, setPreviewScale] = useState<'actual' | 'large'>('actual');
  const [printRotation, setPrintRotation] = useState<'0' | '90' | '180' | '270' | 'auto'>('auto');
  const [labelSize, setLabelSize] = useState<string>('100x75');
  const [printZoom, setPrintZoom] = useState<string>('100');
  const [marginFit, setMarginFit] = useState<'tight' | 'borderless' | 'standard'>('tight');

  // Load saved label size, zoom & margin preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('quarantine_tag_label_size');
      if (savedSize && savedSize !== '75x100' && LABEL_SIZES[savedSize]) {
        setLabelSize(savedSize);
      } else {
        setLabelSize('100x75');
        if (savedSize === '75x100') {
          localStorage.setItem('quarantine_tag_label_size', '100x75');
        }
      }
      const savedZoom = localStorage.getItem('quarantine_tag_print_zoom');
      if (savedZoom && ['98', '100', '102', '104', '106'].includes(savedZoom)) {
        setPrintZoom(savedZoom);
      } else {
        setPrintZoom('100');
      }
      const savedMargin = localStorage.getItem('quarantine_tag_margin_fit');
      if (savedMargin && ['tight', 'borderless', 'standard'].includes(savedMargin)) {
        setMarginFit(savedMargin as any);
      }
    }
  }, []);

  const handleLabelSizeChange = (val: string) => {
    setLabelSize(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('quarantine_tag_label_size', val);
    }
  };

  const handlePrintZoomChange = (val: string) => {
    setPrintZoom(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('quarantine_tag_print_zoom', val);
    }
  };

  const handleMarginFitChange = (val: 'tight' | 'borderless' | 'standard') => {
    setMarginFit(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('quarantine_tag_margin_fit', val);
    }
  };

  const activeSize = LABEL_SIZES[labelSize] || LABEL_SIZES['100x75'];
  const effectivePaddingMm = marginFit === 'borderless' ? 0 : marginFit === 'tight' ? 0.8 : activeSize.paddingMm;
  const zoomFactor = Number(printZoom || 100) / 100;

  // Load saved printer rotation preference (default to 'auto' for Chrome landscape printing on Gprinter GP-1224T)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRot = localStorage.getItem('quarantine_tag_rotation');
      if (savedRot && ['0', '90', '180', '270', 'auto'].includes(savedRot)) {
        setPrintRotation(savedRot as any);
      } else {
        setPrintRotation('auto');
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

      const defaultPkg = initialData.packageType || (initialData.code?.startsWith('R4') ? 'ถัง' : 'ลัง');
      const standardTypes = ['ลัง', 'กล่อง', 'ถัง', 'ถุง', 'หีบ', 'ห่อ', 'พาเลท', 'กระป๋อง', 'ม้วน'];
      if (standardTypes.includes(defaultPkg)) {
        setPackageType(defaultPkg);
        setCustomPackageType('');
      } else {
        setPackageType('อื่นๆ');
        setCustomPackageType(defaultPkg);
      }
      
      const bCount = Math.max(1, parseInt(String(initialData.boxCount || 1), 10) || 1);
      setBoxCount(bCount);

      if (initialData.qtyPerBox) {
        setQtyPerBox(initialData.qtyPerBox);
      } else if (tQty > 0) {
        setQtyPerBox(Math.ceil(tQty / bCount));
      } else {
        setQtyPerBox('');
      }

      const oddB = Math.max(0, parseInt(String(initialData.oddBoxCount || 0), 10) || 0);
      setOddBoxCount(oddB);
      setOddQtyPerBox(initialData.oddQtyPerBox != null ? initialData.oddQtyPerBox : '');

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

  const effectivePackageType = packageType === 'อื่นๆ' ? (customPackageType.trim() || 'ภาชนะ') : packageType;
  const totalBoxCount = Math.max(1, (boxCount || 0) + (oddBoxCount || 0));

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
    const fullCount = Math.max(0, boxCount || 0);
    const oddCount = Math.max(0, oddBoxCount || 0);
    const totalCount = Math.max(1, fullCount + oddCount);
    const list = [];

    if (!printAllSequence) {
      // Print single tag (1 of 1 or current previewIndex)
      const isOdd = previewIndex > fullCount;
      list.push({
        boxIndex: previewIndex,
        totalBoxes: totalCount,
        boxQty: isOdd ? (oddQtyPerBox || totalQty) : (qtyPerBox || totalQty),
        isOdd
      });
    } else {
      // Print all sequence: full boxes followed by odd boxes
      for (let i = 1; i <= fullCount; i++) {
        list.push({
          boxIndex: i,
          totalBoxes: totalCount,
          boxQty: qtyPerBox || totalQty,
          isOdd: false
        });
      }
      for (let j = 1; j <= oddCount; j++) {
        list.push({
          boxIndex: fullCount + j,
          totalBoxes: totalCount,
          boxQty: oddQtyPerBox || 0,
          isOdd: true
        });
      }
      if (list.length === 0) {
        list.push({
          boxIndex: 1,
          totalBoxes: 1,
          boxQty: totalQty,
          isOdd: false
        });
      }
    }
    return list;
  }, [boxCount, oddBoxCount, printAllSequence, previewIndex, qtyPerBox, oddQtyPerBox, totalQty]);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Print handler via isolated iframe to ensure ONLY the tag prints without background website
  const handlePrint = () => {
    if (onSavedMetadata) {
      onSavedMetadata({
        boxCount: Number(boxCount) || 1,
        qtyPerBox: Number(qtyPerBox) || Number(totalQty) || 0,
        mfgLot: mfgLot || '-',
        packageType: effectivePackageType,
        oddBoxCount: Number(oddBoxCount) || 0,
        oddQtyPerBox: Number(oddQtyPerBox) || 0
      });
    }

    const container = printContainerRef.current;
    if (!container) {
      window.print();
      return;
    }

    const isRotated = ['90', '270'].includes(printRotation);
    const is180 = printRotation === '180';
    const isAuto = printRotation === 'auto';
    const physW = isRotated ? activeSize.height : activeSize.width;
    const physH = isRotated ? activeSize.width : activeSize.height;

    // Clean up any existing iframe
    const existingFrame = document.getElementById('quarantine-print-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'quarantine-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = isAuto ? `${activeSize.width}mm` : `${physW}mm`;
    iframe.style.height = isAuto ? `${activeSize.height}mm` : `${physH}mm`;
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const contentHtml = container.innerHTML;

    let transformCss = '';
    if (isRotated) {
      const angle = printRotation === '90' ? '90deg' : '270deg';
      transformCss = zoomFactor !== 1 ? `rotate(${angle}) scale(${zoomFactor})` : `rotate(${angle})`;
    } else if (is180) {
      transformCss = zoomFactor !== 1 ? `rotate(180deg) scale(${zoomFactor})` : `rotate(180deg)`;
    } else if (zoomFactor !== 1) {
      transformCss = `scale(${zoomFactor})`;
    } else {
      transformCss = 'none';
    }

    const wrapperWidth = `${activeSize.width}mm`;
    const wrapperHeight = `${activeSize.height}mm`;

    let pageLayoutCss = '';
    if (isAuto) {
      pageLayoutCss = `
        @page {
          margin: 0;
        }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow: hidden;
        }
        .quarantine-tag-print-page {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          padding: 0;
          margin: 0;
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
          width: ${wrapperWidth};
          height: ${wrapperHeight};
          max-width: calc(100% - 1.6mm);
          max-height: calc(100% - 1.6mm);
          flex-shrink: 0;
          transform: ${zoomFactor !== 1 ? `scale(${zoomFactor})` : 'none'};
          transform-origin: center center;
          padding: ${effectivePaddingMm}mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          margin: auto;
        }
      `;
    } else {
      pageLayoutCss = `
        @page {
          size: ${physW}mm ${physH}mm;
          margin: 0;
        }
        html, body {
          width: ${physW}mm;
          height: ${physH}mm;
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow: hidden;
        }
        .quarantine-tag-print-page {
          width: ${physW}mm;
          height: ${physH}mm;
          max-width: ${physW}mm;
          max-height: ${physH}mm;
          box-sizing: border-box;
          padding: 0;
          margin: 0;
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
          width: ${wrapperWidth};
          height: ${wrapperHeight};
          max-width: ${wrapperWidth};
          max-height: ${wrapperHeight};
          flex-shrink: 0;
          transform: ${transformCss};
          transform-origin: center center;
          padding: ${effectivePaddingMm}mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
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
              overflow: hidden;
            }
            .tag-header {
              border-bottom: 2px solid #000000;
              text-align: center;
              font-weight: bold;
              letter-spacing: 1.5px;
              padding: 2.5px 0;
              font-size: ${activeSize.headerFontSize};
              text-transform: uppercase;
              flex-shrink: 0;
            }
            .tag-body {
              flex: 1;
              padding: 3.5px 8px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              font-size: ${activeSize.bodyFontSize};
              line-height: ${activeSize.bodyLineHeight};
              overflow: hidden;
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
              width: ${activeSize.labelColWidth};
              font-weight: bold;
              flex-shrink: 0;
              font-size: ${activeSize.bodyFontSize};
            }
            .colon-col {
              width: 8px;
              text-align: center;
              flex-shrink: 0;
            }
            .val-col {
              flex: 1;
              font-size: ${activeSize.bodyFontSize};
              min-width: 0;
            }
            .val-bold {
              font-weight: bold;
            }
            .val-mono {
              font-family: monospace;
              font-weight: bold;
            }
            .tag-banner {
              border-top: 1.5px solid #000000;
              text-align: center;
              font-weight: bold;
              letter-spacing: 0.5px;
              padding: 2px 0;
              font-size: ${activeSize.bannerFontSize};
              flex-shrink: 0;
            }
            .tag-rev {
              border-top: 1px solid #000000;
              text-align: center;
              font-size: ${activeSize.revFontSize};
              font-family: monospace;
              padding: 1.5px 0;
              color: #000000;
              flex-shrink: 0;
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

  const renderLabelSizeOptions = () => (
    <>
      <optgroup label="⭐ แนะนำสำหรับม้วนสติกเกอร์แนวนอน (ใช้งานปัจจุบัน)">
        <option value="100x75">100 x 75 มม. (แนวนอน - แนะนำสำหรับม้วน 100x75 ⭐)</option>
        <option value="100x80">100 x 80 มม. (แนวนอน - ม้วนมาตรฐานเดิม)</option>
      </optgroup>
      <optgroup label="⚠️ ม้วนสติกเกอร์ทรงสูง (แนวตั้ง - โปรดตรวจสอบก่อนเลือก)">
        <option value="75x100">75 x 100 มม. (แนวตั้ง - กว้าง 75 x สูง 100 มม.)</option>
        <option value="80x100">80 x 100 มม. (แนวตั้ง - กว้าง 80 x สูง 100 มม.)</option>
      </optgroup>
      <optgroup label="📏 สติกเกอร์แนวนอนขนาดอื่นๆ">
        <option value="80x50">80 x 50 มม. (แนวนอน)</option>
        <option value="75x50">75 x 50 มม. (แนวนอน)</option>
        <option value="70x50">70 x 50 มม. (แนวนอนกะทัดรัด)</option>
        <option value="50x30">50 x 30 มม. (ดวงเล็กพิเศษ)</option>
        <option value="100x100">100 x 100 มม. (สี่เหลี่ยมจัตุรัส)</option>
        <option value="100x150">100 x 150 มม. (ขนาดใหญ่ / ติดพาเลท)</option>
      </optgroup>
    </>
  );

  if (!open) return null;

  return (
    <>
      {/* 1. Modal Dialog for screen view */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:!max-w-5xl md:!max-w-6xl lg:!max-w-7xl w-[98vw] max-w-[98vw] max-h-[96vh] h-auto p-3 sm:p-4 flex flex-col justify-between overflow-hidden bg-slate-50 print:hidden">
          {/* 1. Header (Compact ~32px) */}
          <DialogHeader className="border-b pb-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
                <Package className="w-4 h-4 text-amber-600" />
                พิมพ์ป้าย Quarantine Tag ({activeSize.width} x {activeSize.height} มม.)
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[11px] font-bold">
                  {docRev}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* 2. Main 2-Column Grid (Fits in ~360px) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 py-1.5 flex-1 min-h-0 items-stretch">
            {/* Left Col: Configurations (5 cols) */}
            <div className="lg:col-span-5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between pb-1 border-b border-slate-100 text-xs">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> ข้อมูลป้าย & ยอดแบ่งบรรจุ
                </span>
                <span className="text-[10px] text-slate-400 font-medium">GMP Form</span>
              </div>

              {/* Total Qty & Unit */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-semibold text-slate-700">จำนวนรวมทั้งหมด *</Label>
                  <Input
                    type="number"
                    value={totalQty}
                    onChange={e => handleTotalQtyChange(e.target.value)}
                    className="h-7 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-semibold text-slate-700">หน่วยนับ</Label>
                  <Input
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="h-7 text-xs bg-slate-50 border-slate-300"
                  />
                </div>
              </div>

              {/* Packaging Breakdown Card */}
              <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    แบ่งบรรจุ ({effectivePackageType})
                  </Label>
                  <select
                    value={packageType}
                    onChange={e => setPackageType(e.target.value)}
                    className="h-6 text-[11px] font-bold bg-white text-amber-950 border border-amber-300 rounded px-1.5 cursor-pointer"
                  >
                    <option value="ลัง">ลัง</option>
                    <option value="กล่อง">กล่อง</option>
                    <option value="ถัง">ถัง</option>
                    <option value="ถุง">ถุง</option>
                    <option value="หีบ">หีบ</option>
                    <option value="ห่อ">ห่อ</option>
                    <option value="พาเลท">พาเลท</option>
                    <option value="กระป๋อง">กระป๋อง</option>
                    <option value="ม้วน">ม้วน</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                {packageType === 'อื่นๆ' && (
                  <Input
                    value={customPackageType}
                    onChange={e => setCustomPackageType(e.target.value)}
                    placeholder="ระบุภาชนะ เช่น กระสอบ"
                    className="h-6 text-xs bg-white text-amber-950 border-amber-300 mb-1"
                  />
                )}

                {/* Full & Odd Packaging in 2 compact columns */}
                <div className="grid grid-cols-2 gap-2 pt-0.5 border-t border-amber-200/60">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-950">🟢 {effectivePackageType}เต็ม *</span>
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        type="number"
                        min="1"
                        value={boxCount}
                        onChange={e => handleBoxCountChange(parseInt(e.target.value, 10) || 1)}
                        placeholder="จน.เต็ม"
                        className="h-7 text-xs font-bold bg-white text-center text-amber-950 border-amber-300 px-1"
                        title="จำนวนลังเต็ม"
                      />
                      <Input
                        type="number"
                        value={qtyPerBox}
                        onChange={e => setQtyPerBox(e.target.value)}
                        placeholder="ยอด/ลัง"
                        className="h-7 text-xs font-bold bg-white text-center text-amber-950 border-amber-300 px-1"
                        title="ยอดต่อลังเต็ม"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-950">🟠 {effectivePackageType}เศษ</span>
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        type="number"
                        min="0"
                        value={oddBoxCount}
                        onChange={e => setOddBoxCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        placeholder="จน.เศษ"
                        className="h-7 text-xs font-bold bg-white text-center text-amber-950 border-amber-300 px-1"
                        title="จำนวนลังเศษ (ใส่ 0 หากไม่มีเศษ)"
                      />
                      <Input
                        type="number"
                        value={oddQtyPerBox}
                        onChange={e => setOddQtyPerBox(e.target.value)}
                        placeholder="ยอดเศษ"
                        className="h-7 text-xs font-bold bg-white text-center text-amber-950 border-amber-300 px-1"
                        title="ยอดต่อลังเศษ"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-amber-900 font-medium truncate pt-0.5">
                  📦 สรุป: <strong className="text-slate-900">{totalQty ? Number(totalQty).toLocaleString() : 0} {unit}</strong> ({boxCount} {effectivePackageType} x {qtyPerBox ? Number(qtyPerBox).toLocaleString() : 0}{oddBoxCount > 0 ? ` + ${oddBoxCount} เศษ x ${oddQtyPerBox ? Number(oddQtyPerBox).toLocaleString() : 0}` : ''}) • รวม {totalBoxCount} {effectivePackageType}
                </div>
              </div>

              {/* Supplier & Lot */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-semibold text-slate-700">ผู้ส่งมอบ / ลูกค้า</Label>
                  <Input
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="h-7 text-xs bg-slate-50"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-semibold text-slate-700">Lot ผู้ผลิต</Label>
                  <Input
                    value={mfgLot}
                    onChange={e => setMfgLot(e.target.value)}
                    placeholder="Lot.-"
                    className="h-7 text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Receiver & Date */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-semibold text-slate-700">ผู้รับเข้า</Label>
                  <Input
                    value={receivedBy}
                    onChange={e => setReceivedBy(e.target.value)}
                    className="h-7 text-xs bg-slate-50"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px] font-semibold text-slate-700">วันที่รับเข้า</Label>
                  <Input
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    className="h-7 text-xs font-mono bg-slate-50"
                  />
                </div>
              </div>

              {/* Print Mode Selector */}
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 text-[11px]">พิมพ์:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="printMode"
                      checked={printAllSequence}
                      onChange={() => setPrintAllSequence(true)}
                      className="accent-amber-600 w-3.5 h-3.5"
                    />
                    <span className="font-bold text-slate-800 text-[11px]">รันครบทุก{effectivePackageType} ({totalBoxCount} ใบ)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="printMode"
                      checked={!printAllSequence}
                      onChange={() => setPrintAllSequence(false)}
                      className="accent-amber-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 text-[11px]">เฉพาะ 1 ใบ</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Col: Live Tag Preview (7 cols) */}
            <div className="lg:col-span-7 bg-slate-100/70 p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between items-center">
              {/* Preview Header Toolbar */}
              <div className="flex items-center justify-between w-full pb-1 border-b border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>ตัวอย่างป้าย ({activeSize.width} x {activeSize.height} มม.)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {totalBoxCount > 1 && printAllSequence && (
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs text-[11px]">
                      <button
                        type="button"
                        disabled={previewIndex <= 1}
                        onClick={() => setPreviewIndex(prev => Math.max(1, prev - 1))}
                        className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-purple-900 text-[10px]">
                        {previewIndex} / {totalBoxCount}
                      </span>
                      <button
                        type="button"
                        disabled={previewIndex >= totalBoxCount}
                        onClick={() => setPreviewIndex(prev => Math.min(totalBoxCount, prev + 1))}
                        className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Code Format Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextCode = codeType === 'qrcode' ? 'barcode' : codeType === 'barcode' ? 'none' : 'qrcode';
                      handleCodeTypeChange(nextCode);
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-purple-50 border border-slate-300 rounded text-[10.5px] font-bold text-purple-800 flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="สลับรูปแบบโค้ด"
                  >
                    <QrCode className="w-3 h-3" />
                    {codeType === 'qrcode' ? 'QR Code' : codeType === 'barcode' ? 'Barcode' : 'ไม่แสดง'}
                  </button>

                  {/* Scale Switcher Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewScale(prev => prev === 'actual' ? 'large' : 'actual')}
                    className="px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[10.5px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="สลับขนาดพรีวิว"
                  >
                    {previewScale === 'actual' ? '🔍 ขยาย' : '📏 ปกติ'}
                  </button>
                </div>
              </div>

              {/* Orientation Alert for Vertical Size */}
              {activeSize.height > activeSize.width && (
                <div className="w-full bg-amber-50 border border-amber-300 text-amber-900 text-[10.5px] px-2.5 py-1 rounded-lg flex items-center justify-between my-0.5">
                  <span className="truncate">⚠️ เลือกแนวตั้ง ({activeSize.width}x{activeSize.height} มม.) ม้วนแนวนอนให้กดสลับ</span>
                  <button
                    type="button"
                    onClick={() => handleLabelSizeChange('100x75')}
                    className="shrink-0 ml-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer"
                  >
                    สลับเป็น 100x75
                  </button>
                </div>
              )}

              {/* Center Tag Preview Box */}
              <div className="flex-1 flex items-center justify-center w-full py-1">
                {(() => {
                  const isRot = ['90', '270'].includes(printRotation);
                  const baseW = previewScale === 'large' ? 360 : 315;
                  const baseH = Math.round((baseW * activeSize.height) / activeSize.width);
                  const dispW = isRot ? baseH : baseW;
                  const dispH = isRot ? baseW : baseH;

                  return (
                    <div 
                      className="flex items-center justify-center transition-all duration-200"
                      style={{ width: `${dispW}px`, height: `${dispH}px` }}
                    >
                      <div 
                        className="bg-white text-black font-sans border-2 border-black flex flex-col justify-between select-none shadow-md transition-transform duration-200 origin-center"
                        style={{
                          width: `${baseW}px`,
                          height: `${baseH}px`,
                          boxSizing: 'border-box',
                          transform:
                            printRotation === '90'
                              ? `rotate(90deg)`
                              : printRotation === '270'
                              ? `rotate(270deg)`
                              : printRotation === '180'
                              ? `rotate(180deg)`
                              : 'none'
                        }}
                      >
                        {/* Tag Header */}
                        <div className="border-b-2 border-black text-center font-bold tracking-wider py-0.5 uppercase bg-white text-[11.5px]">
                          COSMEDIVA
                        </div>

                        {/* Tag Body */}
                        <div className="flex-1 px-2 py-1 flex flex-col justify-between font-medium space-y-0.5 text-[10px] leading-tight">
                          {/* Name */}
                          <div className="flex items-start">
                            <span className="w-16 font-bold shrink-0">Name</span>
                            <span className="w-2 text-center shrink-0">:</span>
                            <span className="flex-1 font-bold line-clamp-2 leading-tight">
                              {name || '-'}
                            </span>
                          </div>

                          {/* Code */}
                          <div className="flex items-center">
                            <span className="w-16 font-bold shrink-0">Code</span>
                            <span className="w-2 text-center shrink-0">:</span>
                            <span className="flex-1 font-mono font-bold tracking-tight">
                              {code || '-'}
                            </span>
                          </div>

                          {/* Control No. + Barcode */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center flex-1 min-w-0">
                              <span className="w-16 font-bold shrink-0">Control No.</span>
                              <span className="w-2 text-center shrink-0">:</span>
                              <span className="font-mono font-bold text-[10.5px] tracking-tight text-purple-950 truncate">
                                {controlNo || '-'}
                              </span>
                            </div>
                            {controlNo && codeType !== 'none' && (
                              <div className="shrink-0 pl-1 flex items-center">
                                {codeType === 'qrcode' ? (
                                  <QRCodeSvg value={controlNo} size={24} />
                                ) : (
                                  <Code128Barcode value={controlNo} height={15} width={90} />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Supplier + Lot */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center flex-1 min-w-0">
                              <span className="w-16 font-bold shrink-0">Supplier</span>
                              <span className="w-2 text-center shrink-0">:</span>
                              <span className="font-medium truncate">{supplier || '-'}</span>
                            </div>
                            <span className="font-medium shrink-0 text-slate-700 pl-1 text-[9px]">
                              Lot.{mfgLot || '-'}
                            </span>
                          </div>

                          {/* Total Qty + Package Breakdown */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center">
                              <span className="w-16 font-bold shrink-0">Total Qty.</span>
                              <span className="w-2 text-center shrink-0">:</span>
                              <span className="font-bold">{totalQty ? Number(totalQty).toLocaleString() : 0}{unit}</span>
                            </div>
                            <span className="font-bold text-slate-900 text-[9px] shrink-0">
                              ({boxCount} {effectivePackageType} x {qtyPerBox ? Number(qtyPerBox).toLocaleString() : (totalQty ? Number(totalQty).toLocaleString() : 0)}{unit}{oddBoxCount > 0 ? ` + ${oddBoxCount} เศษ x ${oddQtyPerBox ? Number(oddQtyPerBox).toLocaleString() : 0}${unit}` : ''})
                            </span>
                          </div>

                          {/* Qty./unit + of N */}
                          {(() => {
                            const isOddPreview = previewIndex > boxCount;
                            const currentBoxQty = isOddPreview
                              ? (oddQtyPerBox ? Number(oddQtyPerBox).toLocaleString() : 0)
                              : (qtyPerBox ? Number(qtyPerBox).toLocaleString() : (totalQty ? Number(totalQty).toLocaleString() : 0));
                            return (
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center">
                                  <span className="w-16 font-bold shrink-0">Qty./unit</span>
                                  <span className="w-2 text-center shrink-0">:</span>
                                  <span className="font-bold">
                                    {currentBoxQty} {unit}
                                    {isOddPreview && (
                                      <span className="ml-1 text-[8px] bg-amber-100 text-amber-900 px-1 rounded border border-amber-300">
                                        เศษ
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center font-bold text-[10.5px]">
                                  <span className="text-slate-600 font-normal mr-1 text-[9.5px]">of</span>
                                  <span className="px-1 py-0.2 bg-slate-100 border border-slate-300 rounded font-mono">
                                    {printAllSequence ? previewIndex : 1}
                                  </span>
                                  <span className="mx-0.5 text-slate-400">/</span>
                                  <span className="font-mono">{totalBoxCount}</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Received by + Date */}
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            <div className="flex items-center flex-1 min-w-0">
                              <span className="w-16 font-bold shrink-0">Received by</span>
                              <span className="w-2 text-center shrink-0">:</span>
                              <span className="font-medium truncate">{receivedBy || '-'}</span>
                            </div>
                            <span className="font-medium shrink-0 text-[9px] text-slate-700 pl-1">
                              รับเข้า {receivedDate || '-'}
                            </span>
                          </div>
                        </div>

                        {/* Tag Footer Banner */}
                        <div className="border-t-2 border-black text-center font-bold tracking-wide py-0.5 bg-amber-50 text-[10px]">
                          Quarantine : กักกัน
                        </div>

                        {/* Doc Rev Bottom line */}
                        <div className="border-t border-black text-center text-slate-700 py-0.5 bg-white font-mono text-[8px]">
                          {docRev}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Helper Guide (Single sleek line) */}
              <div className="w-full bg-blue-50/90 border border-blue-200 text-blue-950 text-[11px] px-3 py-1 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">
                    ตั้งค่าใน Chrome: <strong>แนวนอน</strong> • กระดาษ <strong>100 x 75</strong> • ระยะขอบ <strong>ไม่มี</strong>
                  </span>
                </div>
                <span className="font-bold text-blue-700 shrink-0 pl-2">
                  พิมพ์เต็มดวง ไม่ตกขอบ ⭐
                </span>
              </div>
            </div>
          </div>

          {/* 3. Footer: Unified Single Control Bar (~44px) */}
          <DialogFooter className="border-t pt-2 mt-0.5 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              ปิดหน้าต่าง
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {/* ขนาดป้าย */}
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">ขนาด:</span>
                <select
                  value={labelSize}
                  onChange={(e) => handleLabelSizeChange(e.target.value)}
                  className="text-xs bg-amber-50 font-bold border border-amber-300 rounded px-1.5 py-0.5 text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  {renderLabelSizeOptions()}
                </select>
              </div>

              {/* ทิศทางพิมพ์ */}
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs">
                <RotateCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">ทิศทาง:</span>
                <select
                  value={printRotation}
                  onChange={(e) => handleRotationChange(e.target.value as any)}
                  className="text-xs bg-amber-50 font-bold border border-amber-300 rounded px-1.5 py-0.5 text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="auto">⭐ แก้ตะแคง (Auto)</option>
                  <option value="270">หมุน 270°</option>
                  <option value="0">แนวนอนปกติ (0°)</option>
                  <option value="90">🔄 หมุน 90°</option>
                  <option value="180">↕️ กลับหัว 180°</option>
                </select>
              </div>

              {/* ความเต็มป้าย */}
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">เต็มป้าย:</span>
                <select
                  value={printZoom}
                  onChange={(e) => handlePrintZoomChange(e.target.value)}
                  className="text-xs bg-blue-50 font-bold border border-blue-300 rounded px-1.5 py-0.5 text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="100">100% (พอดีดวง ⭐)</option>
                  <option value="102">102% (+2%)</option>
                  <option value="104">104% (+4%)</option>
                  <option value="98">98%</option>
                </select>
              </div>

              {/* ระยะขอบ */}
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs">
                <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">ขอบ:</span>
                <select
                  value={marginFit}
                  onChange={(e) => handleMarginFitChange(e.target.value as any)}
                  className="text-xs bg-slate-50 font-medium border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
                >
                  <option value="tight">ชิดขอบ 0.8 มม. ⭐</option>
                  <option value="borderless">ไร้ขอบ 0 มม.</option>
                  <option value="standard">ปกติ 1.5 มม.</option>
                </select>
              </div>

              <Button
                onClick={handlePrint}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md px-4 h-8 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                สั่งพิมพ์สติกเกอร์ {tagsToPrint.length} ใบ ({activeSize.width}x{activeSize.height} มม.)
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
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span className="label-col">Code</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-mono" style={{ fontSize: activeSize.bodyFontSize }}>
                      {code || '-'}
                    </span>
                  </div>
                </div>

                {/* Control No. + Barcode */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span className="label-col">Control No.</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-mono" style={{ fontSize: activeSize.bodyFontSize }}>
                      {controlNo || '-'}
                    </span>
                  </div>
                  {controlNo && codeType !== 'none' && (
                    <div style={{ flexShrink: 0, paddingLeft: '4px', display: 'flex', alignItems: 'center' }}>
                      {codeType === 'qrcode' ? (
                        <QRCodeSvg value={controlNo} size={activeSize.qrSize} />
                      ) : (
                        <Code128Barcode value={controlNo} height={activeSize.barcodeHeight} width={activeSize.barcodeWidth} />
                      )}
                    </div>
                  )}
                </div>

                {/* Supplier + Lot */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span className="label-col">Supplier</span>
                    <span className="colon-col">:</span>
                    <span className="val-col" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {supplier || '-'}
                    </span>
                  </div>
                  <span style={{ flexShrink: 0, paddingLeft: '6px', fontSize: activeSize.revFontSize, fontWeight: 500 }}>
                    Lot.{mfgLot || '-'}
                  </span>
                </div>

                {/* Total Qty + Breakdown */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <span className="label-col">Total Qty.</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-bold">
                      {totalQty ? Number(totalQty).toLocaleString() : 0}{unit}
                    </span>
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: `calc(${activeSize.bodyFontSize} * 0.9)`, whiteSpace: 'nowrap' }}>
                    ({boxCount} {effectivePackageType} x {qtyPerBox ? Number(qtyPerBox).toLocaleString() : (totalQty ? Number(totalQty).toLocaleString() : 0)}{unit}{oddBoxCount > 0 ? ` + ${oddBoxCount} ${effectivePackageType}เศษ x ${oddQtyPerBox ? Number(oddQtyPerBox).toLocaleString() : 0}${unit}` : ''})
                  </span>
                </div>

                {/* Qty./unit + of N */}
                <div className="tag-row">
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <span className="label-col">Qty./unit</span>
                    <span className="colon-col">:</span>
                    <span className="val-col val-bold">
                      {tag.boxQty ? Number(tag.boxQty).toLocaleString() : 0} {unit}
                      {tag.isOdd && (
                        <span style={{ marginLeft: '4px', fontSize: `calc(${activeSize.bodyFontSize} * 0.8)`, fontWeight: 'bold', border: '1px solid #000', padding: '0 2px', borderRadius: '2px' }}>
                          [{effectivePackageType}เศษ]
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: activeSize.bodyFontSize, whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 'normal', fontSize: `calc(${activeSize.bodyFontSize} * 0.9)`, marginRight: '6px' }}>of</span>
                    <span>{tag.boxIndex}</span>
                    <span style={{ margin: '0 3px', fontWeight: 'normal', color: '#666' }}>/</span>
                    <span>{tag.totalBoxes}</span>
                  </div>
                </div>

                {/* Received by + Date */}
                <div className="tag-row" style={{ paddingTop: '1px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span className="label-col">Received by</span>
                    <span className="colon-col">:</span>
                    <span className="val-col" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: `calc(${activeSize.bodyFontSize} * 0.95)` }}>
                      {receivedBy || '-'}
                    </span>
                  </div>
                  <span style={{ flexShrink: 0, paddingLeft: '6px', fontSize: `calc(${activeSize.bodyFontSize} * 0.9)` }}>
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
