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
    paddingMm: 0.5,
    headerFontSize: '13.5pt',
    bodyFontSize: '9.2pt',
    bodyLineHeight: 1.35,
    labelColWidth: '68px',
    bannerFontSize: '11.5pt',
    revFontSize: '7.5pt',
    qrSize: 32,
    barcodeHeight: 22,
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
  const [printRotation, setPrintRotation] = useState<'0' | '90' | '180' | '270' | 'auto'>('270');
  const [labelSize, setLabelSize] = useState<string>('100x75');
  const [printZoom, setPrintZoom] = useState<string>('102');
  const [marginFit, setMarginFit] = useState<'tight' | 'borderless' | 'standard'>('tight');

  // Load saved label size, zoom & margin preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSize = localStorage.getItem('quarantine_tag_label_size');
      if (savedSize && savedSize !== '75x100' && LABEL_SIZES[savedSize]) {
        setLabelSize(savedSize);
      } else {
        setLabelSize('100x75');
      }
      const savedZoom = localStorage.getItem('quarantine_tag_print_zoom');
      if (savedZoom && ['98', '100', '102', '104', '106'].includes(savedZoom)) {
        setPrintZoom(savedZoom);
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
  const effectivePaddingMm = marginFit === 'borderless' ? 0 : marginFit === 'tight' ? 0.5 : activeSize.paddingMm;
  const zoomFactor = Number(printZoom || 100) / 100;

  // Load saved printer rotation preference (default to '270' to compensate for Gprinter driver 90-degree sideways rotation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRot = localStorage.getItem('quarantine_tag_rotation');
      if (savedRot && ['0', '90', '180', '270'].includes(savedRot)) {
        setPrintRotation(savedRot as any);
      } else {
        // Default to '270' to fix sideways printing on Gprinter GP-1224T
        setPrintRotation('270');
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
          max-width: 100%;
          max-height: 100%;
          flex-shrink: 0;
          transform: ${zoomFactor !== 1 ? `scale(${zoomFactor})` : 'none'};
          transform-origin: center center;
          padding: ${effectivePaddingMm}mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
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
        <DialogContent className="sm:!max-w-5xl md:!max-w-6xl lg:!max-w-7xl w-[96vw] max-w-[96vw] max-h-[96vh] overflow-y-auto bg-slate-50 p-4 sm:p-6 print:hidden">
          <DialogHeader className="border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
                <Package className="w-5 h-5 text-amber-600" />
                พิมพ์ป้าย Quarantine Tag (กักกัน {activeSize.width} x {activeSize.height} มม.)
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

              {/* Packaging Breakdown & Remainder */}
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    ข้อมูลภาชนะ & แบ่งบรรจุ (ลัง/กล่อง/ถัง)
                  </Label>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
                    คำนวณอัตโนมัติ
                  </span>
                </div>

                {/* Package Type Selector */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-amber-900">ประเภทภาชนะบรรจุ</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={packageType}
                      onChange={e => setPackageType(e.target.value)}
                      className="h-8 text-xs font-bold bg-white text-amber-950 border border-amber-300 rounded-lg px-2"
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
                      <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                    </select>
                    {packageType === 'อื่นๆ' ? (
                      <Input
                        value={customPackageType}
                        onChange={e => setCustomPackageType(e.target.value)}
                        placeholder="พิมพ์ระบุ เช่น กระสอบ"
                        className="h-8 text-xs font-bold bg-white text-amber-950 border-amber-300"
                      />
                    ) : (
                      <div className="h-8 px-2 flex items-center text-[11px] font-bold text-amber-800 bg-amber-100/50 rounded-lg border border-amber-200">
                        หน่วยเรียก: {effectivePackageType}
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Packaging */}
                <div className="pt-1 border-t border-amber-200/60">
                  <div className="text-[11px] font-bold text-amber-950 mb-1">
                    🟢 {effectivePackageType}เต็ม (Full)
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-amber-900">จำนวน{effectivePackageType}เต็ม *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={boxCount}
                        onChange={e => handleBoxCountChange(parseInt(e.target.value, 10) || 1)}
                        className="h-8 text-xs font-bold bg-white text-center text-amber-950 border-amber-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-amber-900">ยอดต่อ{effectivePackageType}เต็ม</Label>
                      <Input
                        type="number"
                        value={qtyPerBox}
                        onChange={e => setQtyPerBox(e.target.value)}
                        className="h-8 text-xs font-bold bg-white text-center text-amber-950 border-amber-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Remainder/Odd Packaging */}
                <div className="pt-1 border-t border-amber-200/60">
                  <div className="text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                    <span>🟠 {effectivePackageType}เศษ (Odd / Remainder)</span>
                    <span className="text-[10px] font-normal text-amber-700">ใส่ 0 หากไม่มีเศษ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-amber-900">จำนวน{effectivePackageType}เศษ</Label>
                      <Input
                        type="number"
                        min="0"
                        value={oddBoxCount}
                        onChange={e => setOddBoxCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="h-8 text-xs font-bold bg-white text-center text-amber-950 border-amber-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-amber-900">ยอดต่อ{effectivePackageType}เศษ</Label>
                      <Input
                        type="number"
                        value={oddQtyPerBox}
                        onChange={e => setOddQtyPerBox(e.target.value)}
                        placeholder="0"
                        className="h-8 text-xs font-bold bg-white text-center text-amber-950 border-amber-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-amber-900 font-medium pt-1">
                  📦 สรุป: <strong className="text-slate-900">{totalQty ? Number(totalQty).toLocaleString() : 0} {unit}</strong> ({boxCount} {effectivePackageType} x {qtyPerBox ? Number(qtyPerBox).toLocaleString() : 0}{oddBoxCount > 0 ? ` + ${oddBoxCount} ${effectivePackageType}เศษ x ${oddQtyPerBox ? Number(oddQtyPerBox).toLocaleString() : 0}` : ''}) • รวมทั้งสิ้น {totalBoxCount} {effectivePackageType}
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
                      <span className="font-bold text-slate-800">พิมพ์รันเลขครบทุก{effectivePackageType} ({totalBoxCount} ใบ)</span>
                      <p className="text-[11px] text-slate-500">รันพิมพ์ 1 of {totalBoxCount}, 2 of {totalBoxCount} ... จนครบ {totalBoxCount} {effectivePackageType}</p>
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
                    ตัวอย่างป้าย ({activeSize.width} x {activeSize.height} มม.)
                  </span>
                </div>

                {/* Size, Scale Switcher, Rotation & Code Type */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Label Size Dropdown */}
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs shadow-xs">
                    <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold text-slate-700 whitespace-nowrap hidden sm:inline">ขนาดป้าย:</span>
                    <select
                      value={labelSize}
                      onChange={(e) => handleLabelSizeChange(e.target.value)}
                      className="font-bold text-xs bg-amber-50 text-amber-900 border border-amber-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      title="เลือกขนาดสติกเกอร์ที่ต้องการพิมพ์"
                    >
                      {renderLabelSizeOptions()}
                    </select>
                  </div>

                  {/* Quick Aspect Ratio Swap Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (labelSize === '100x75') handleLabelSizeChange('75x100');
                      else if (labelSize === '75x100') handleLabelSizeChange('100x75');
                      else if (labelSize === '100x80') handleLabelSizeChange('80x100');
                      else if (labelSize === '80x100') handleLabelSizeChange('100x80');
                      else handleLabelSizeChange('100x75');
                    }}
                    className="px-2 py-1.5 bg-white hover:bg-amber-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="สลับสัดส่วนป้ายระหว่าง แนวนอน (100x75) กับ แนวตั้ง (75x100)"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">{activeSize.width > activeSize.height ? 'สลับเป็นแนวตั้ง' : 'สลับเป็นแนวนอน'}</span>
                  </button>

                  {/* Print Scale / Zoom Selector */}
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs shadow-xs">
                    <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-700 whitespace-nowrap hidden sm:inline">ความเต็มป้าย:</span>
                    <select
                      value={printZoom}
                      onChange={(e) => handlePrintZoomChange(e.target.value)}
                      className="font-bold text-xs bg-blue-50 text-blue-900 border border-blue-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      title="ปรับสเกลขยายเต็มสติกเกอร์ (102% ชดเชยขอบขาวเครื่องพิมพ์ความร้อนให้ออกมาเต็มดวงพอดี)"
                    >
                      <option value="102">102% (เต็มดวง แนะนำ)</option>
                      <option value="100">100% (ปกติ)</option>
                      <option value="104">104% (เต็มขอบพิเศษ +4%)</option>
                      <option value="106">106% (เต็มขอบสูงสุด +6%)</option>
                      <option value="98">98% (ย่อเล็ก 98%)</option>
                    </select>
                  </div>

                  {/* Margin Fit Selector */}
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs shadow-xs">
                    <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="font-bold text-slate-700 whitespace-nowrap hidden sm:inline">ระยะขอบ:</span>
                    <select
                      value={marginFit}
                      onChange={(e) => handleMarginFitChange(e.target.value as any)}
                      className="text-xs bg-slate-50 font-medium border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 focus:ring-1 focus:ring-slate-500 cursor-pointer"
                      title="เลือกระยะขอบ (ชิดขอบ 0.5มม. หรือ ไร้ขอบ 0มม.)"
                    >
                      <option value="tight">ชิดขอบ 0.5 มม.</option>
                      <option value="borderless">ไร้ขอบ 0 มม.</option>
                      <option value="standard">ขอบปกติ 1.5 มม.</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewScale('actual')}
                      className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors flex items-center gap-1 ${
                        previewScale === 'actual'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title={`แสดงขนาดตามสัดส่วนจริง ${activeSize.width} x ${activeSize.height} มม.`}
                    >
                      📏 {activeSize.width}x{activeSize.height} มม.
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
                      🔍 ขยายใหญ่
                    </button>
                  </div>

                  {/* Quick Rotate Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextRot = printRotation === 'auto' ? '0' : printRotation === '0' ? '90' : printRotation === '90' ? '180' : printRotation === '180' ? '270' : 'auto';
                      handleRotationChange(nextRot);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                      printRotation === 'auto'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
                        : printRotation !== '0'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50 hover:text-amber-900'
                    }`}
                    title="คลิกเพื่อสลับทิศทาง (Auto แก้ตะแคง -> 0° -> 90° -> 180° -> 270°)"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-inherit" />
                    {printRotation === 'auto' ? 'แก้ตะแคง (Auto)' : `หมุน ${printRotation}°`}
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
                    {codeType === 'qrcode' ? 'QR Code' : codeType === 'barcode' ? 'Barcode' : 'ไม่แสดงโค้ด'}
                  </button>
                </div>

                {totalBoxCount > 1 && printAllSequence && (
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
                      {effectivePackageType}ที่ {previewIndex} of {totalBoxCount} {previewIndex > boxCount ? `[${effectivePackageType}เศษ]` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={previewIndex >= totalBoxCount}
                      onClick={() => setPreviewIndex(prev => Math.min(totalBoxCount, prev + 1))}
                      className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Orientation Alert for Vertical Size */}
              {activeSize.height > activeSize.width && (
                <div className="w-full bg-amber-50 border-2 border-amber-400 text-amber-900 text-xs px-3.5 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>ระวัง:</strong> กำลังเลือกขนาด <strong>แนวตั้ง ({activeSize.width} x {activeSize.height} มม.)</strong> ซึ่งจะพิมพ์ออกมาเป็นทรงสูง หากม้วนสติกเกอร์ที่เครื่องพิมพ์ของคุณเป็น <strong>แนวนอน (100 x 75 มม.)</strong> ให้กดสลับเป็นแนวนอน
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLabelSizeChange('100x75')}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1 rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    เปลี่ยนเป็น 100x75 แนวนอน
                  </button>
                </div>
              )}

              {/* Physical Tag Preview Card with Ruler Dimension Guides */}
              <div className="flex flex-col items-center justify-center w-full py-2 min-h-[380px]">
                {/* Width Guide Ruler */}
                <div className="text-[10px] text-slate-500 font-mono mb-1.5 flex items-center gap-1">
                  <span>◄</span>
                  <span className="border-b border-dashed border-slate-400 px-6 font-bold text-slate-700">
                    {['90', '270'].includes(printRotation)
                      ? `ความกว้างป้ายหลังหมุน: ${activeSize.height} มม.`
                      : `ความกว้างสติกเกอร์: ${activeSize.width} มม.`}
                  </span>
                  <span>►</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Height Guide Ruler */}
                  <div className="text-[10px] text-slate-500 font-mono [writing-mode:vertical-rl] rotate-180 flex items-center justify-center gap-1 h-full py-4">
                    <span>◄</span>
                    <span className="border-l border-dashed border-slate-400 py-6 font-bold text-slate-700">
                      {['90', '270'].includes(printRotation)
                        ? `ความสูงหลังหมุน: ${activeSize.width} มม.`
                        : `ความสูงสติกเกอร์: ${activeSize.height} มม.`}
                    </span>
                    <span>►</span>
                  </div>

                  {/* Outer Frame that adjusts bounding box when rotated */}
                  {(() => {
                    const isRot = ['90', '270'].includes(printRotation);
                    const dispW = isRot ? activeSize.height : activeSize.width;
                    const dispH = isRot ? activeSize.width : activeSize.height;
                    const largeBaseW = 460;
                    const largeBaseH = Math.round((largeBaseW * activeSize.height) / activeSize.width);
                    const largeDispW = isRot ? largeBaseH : largeBaseW;
                    const largeDispH = isRot ? largeBaseW : largeBaseH;

                    return (
                      <div 
                        className="flex items-center justify-center transition-all duration-300"
                        style={
                          previewScale === 'actual'
                            ? { width: `${dispW}mm`, height: `${dispH}mm` }
                            : { width: `${largeDispW}px`, height: `${largeDispH}px` }
                        }
                      >
                        {/* Physical Tag Preview */}
                        <div 
                          className="bg-white text-black font-sans border-2 border-black flex flex-col justify-between select-none shadow-2xl transition-transform duration-300 origin-center"
                          style={{
                            ...(previewScale === 'actual' ? {
                              width: `${activeSize.width}mm`,
                              height: `${activeSize.height}mm`,
                              minWidth: `${activeSize.width}mm`,
                              minHeight: `${activeSize.height}mm`,
                              maxWidth: `${activeSize.width}mm`,
                              maxHeight: `${activeSize.height}mm`,
                              boxSizing: 'border-box',
                              fontSize: activeSize.bodyFontSize,
                              lineHeight: activeSize.bodyLineHeight
                            } : {
                              width: `${largeBaseW}px`,
                              height: `${largeBaseH}px`,
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                              fontSize: '12px',
                              lineHeight: 1.35
                            }),
                            transform:
                              printRotation === '90'
                                ? `rotate(90deg) scale(${zoomFactor})`
                                : printRotation === '270'
                                ? `rotate(270deg) scale(${zoomFactor})`
                                : printRotation === '180'
                                ? `rotate(180deg) scale(${zoomFactor})`
                                : zoomFactor !== 1
                                ? `scale(${zoomFactor})`
                                : 'none'
                          }}
                        >
                          {/* Tag Header */}
                          <div 
                            className="border-b-2 border-black text-center font-bold tracking-wider py-1 uppercase bg-white"
                            style={{ fontSize: previewScale === 'actual' ? activeSize.headerFontSize : '14px' }}
                          >
                            COSMEDIVA
                          </div>

                          {/* Tag Body */}
                          <div 
                            className="flex-1 p-2 sm:p-2.5 flex flex-col justify-between font-medium space-y-0.5"
                            style={{ 
                              fontSize: previewScale === 'actual' ? activeSize.bodyFontSize : '12px',
                              lineHeight: previewScale === 'actual' ? activeSize.bodyLineHeight : 1.3 
                            }}
                          >
                            {/* Name */}
                            <div className="flex items-start">
                              <span className="w-20 font-bold shrink-0">Name</span>
                              <span className="w-2.5 text-center shrink-0">:</span>
                              <span className="flex-1 font-bold line-clamp-2 leading-tight">
                                {name || '-'}
                              </span>
                            </div>

                            {/* Code */}
                            <div className="flex items-center">
                              <span className="w-20 font-bold shrink-0">Code</span>
                              <span className="w-2.5 text-center shrink-0">:</span>
                              <span className="flex-1 font-mono font-bold tracking-tight">
                                {code || '-'}
                              </span>
                            </div>

                            {/* Control No. + Barcode */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center flex-1 min-w-0">
                                <span className="w-20 font-bold shrink-0">Control No.</span>
                                <span className="w-2.5 text-center shrink-0">:</span>
                                <span className="font-mono font-bold text-xs sm:text-sm tracking-tight text-purple-950 truncate">
                                  {controlNo || '-'}
                                </span>
                              </div>
                              {controlNo && codeType !== 'none' && (
                                <div className="shrink-0 pl-1 flex items-center">
                                  {codeType === 'qrcode' ? (
                                    <QRCodeSvg value={controlNo} size={previewScale === 'actual' ? activeSize.qrSize : Math.round(activeSize.qrSize * 1.3)} />
                                  ) : (
                                    <Code128Barcode value={controlNo} height={previewScale === 'actual' ? activeSize.barcodeHeight : Math.round(activeSize.barcodeHeight * 1.2)} width={previewScale === 'actual' ? activeSize.barcodeWidth : Math.round(activeSize.barcodeWidth * 1.2)} />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Supplier + Lot */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center flex-1 min-w-0">
                                <span className="w-20 font-bold shrink-0">Supplier</span>
                                <span className="w-2.5 text-center shrink-0">:</span>
                                <span className="font-medium truncate">{supplier || '-'}</span>
                              </div>
                              <span className="font-medium shrink-0 text-slate-700 pl-1 text-[10px] sm:text-xs">
                                Lot.{mfgLot || '-'}
                              </span>
                            </div>

                            {/* Total Qty + Package Breakdown */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center">
                                <span className="w-20 font-bold shrink-0">Total Qty.</span>
                                <span className="w-2.5 text-center shrink-0">:</span>
                                <span className="font-bold">{totalQty ? Number(totalQty).toLocaleString() : 0}{unit}</span>
                              </div>
                              <span className="font-bold text-slate-900 text-[10px] sm:text-xs shrink-0">
                                ({boxCount} {effectivePackageType} x {qtyPerBox ? Number(qtyPerBox).toLocaleString() : (totalQty ? Number(totalQty).toLocaleString() : 0)}{unit}{oddBoxCount > 0 ? ` + ${oddBoxCount} ${effectivePackageType}เศษ x ${oddQtyPerBox ? Number(oddQtyPerBox).toLocaleString() : 0}${unit}` : ''})
                              </span>
                            </div>

                            {/* Qty./unit + of N */}
                            {(() => {
                              const isOddPreview = previewIndex > boxCount;
                              const currentBoxQty = isOddPreview
                                ? (oddQtyPerBox ? Number(oddQtyPerBox).toLocaleString() : 0)
                                : (qtyPerBox ? Number(qtyPerBox).toLocaleString() : (totalQty ? Number(totalQty).toLocaleString() : 0));
                              return (
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center">
                                    <span className="w-20 font-bold shrink-0">Qty./unit</span>
                                    <span className="w-2.5 text-center shrink-0">:</span>
                                    <span className="font-bold">
                                      {currentBoxQty} {unit}
                                      {isOddPreview && (
                                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-900 px-1 py-0.5 rounded border border-amber-300">
                                          {effectivePackageType}เศษ
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center font-bold text-xs sm:text-sm">
                                    <span className="text-slate-600 font-normal mr-1.5">of</span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">
                                      {printAllSequence ? previewIndex : 1}
                                    </span>
                                    <span className="mx-1 text-slate-400">/</span>
                                    <span className="font-mono">{totalBoxCount}</span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Received by + Date */}
                            <div className="flex items-center justify-between gap-1.5 pt-0.5">
                              <div className="flex items-center flex-1 min-w-0">
                                <span className="w-20 font-bold shrink-0">Received by</span>
                                <span className="w-2.5 text-center shrink-0">:</span>
                                <span className="font-medium truncate">{receivedBy || '-'}</span>
                              </div>
                              <span className="font-medium shrink-0 text-[10px] sm:text-[11px] text-slate-700 pl-1">
                                รับเข้า {receivedDate || '-'}
                              </span>
                            </div>
                          </div>

                          {/* Tag Footer Banner */}
                          <div 
                            className="border-t-2 border-black text-center font-bold tracking-wide py-0.5 bg-amber-50"
                            style={{ fontSize: previewScale === 'actual' ? activeSize.bannerFontSize : '12px' }}
                          >
                            Quarantine : กักกัน
                          </div>

                          {/* Doc Rev Bottom line */}
                          <div 
                            className="border-t border-black text-center text-slate-700 py-0.5 bg-white font-mono"
                            style={{ fontSize: previewScale === 'actual' ? activeSize.revFontSize : '10px' }}
                          >
                            {docRev}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-center flex flex-wrap items-center justify-center gap-2 pt-1">
                <span>🖨️ เครื่องพิมพ์สติกเกอร์ความร้อน: <strong>{activeSize.width}x{activeSize.height} มม.</strong></span>
                <span>•</span>
                <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-blue-600" />
                  สเกลขยายเต็มป้าย: {printZoom}% ({marginFit === 'borderless' ? 'ไร้ขอบ 0 มม.' : marginFit === 'tight' ? 'ชิดขอบ 0.5 มม.' : 'ขอบปกติ 1.5 มม.'})
                </span>
                <span>•</span>
                <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  ระบบจะพิมพ์สติกเกอร์ทั้งหมด {tagsToPrint.length} ใบ
                </span>
                {printRotation !== '0' && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-amber-600" />
                      {printRotation === '270' && '⭐ หมุนชดเชย 270° (แก้ตะแคง)'}
                      {printRotation === '90' && 'หมุนพิมพ์ 90°'}
                      {printRotation === '180' && 'พิมพ์กลับหัว 180°'}
                      {printRotation === 'auto' && 'โหมด Auto'}
                    </span>
                  </>
                )}
              </div>

              {/* Orientation Guide / Sideways Fix Alert */}
              {['270', '90'].includes(printRotation) ? (
                <div className="w-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-2xs">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>โหมดแก้พิมพ์ตะแคง (หมุน {printRotation}°):</strong> ระบบทำการหมุนภาพชดเชยการทำงานของเครื่องพิมพ์ความร้อนให้อัตโนมัติแล้วค่ะ เมื่อกดสั่งพิมพ์ สามารถกดปุ่ม <strong>"พิมพ์" (Print)</strong> ในหน้าต่าง Chrome ได้ทันทีเลยค่ะ ไม่ต้องตั้งค่าเพิ่มเติมใน Chrome
                  </span>
                </div>
              ) : (
                <div className="w-full bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3.5 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>หากพิมพ์ออกมาแล้วตะแคง 90°:</strong> แนะนำให้เลือกทิศทางพิมพ์เป็น <strong>"หมุน 270°"</strong> เพื่อให้พิมพ์ออกมาเป็นแนวนอนตรงพอดี
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRotationChange('270')}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    คลิกเลือกหมุน 270°
                  </button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              ปิดหน้าต่าง
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {/* Label Size Selector */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                  ขนาดป้าย:
                </span>
                <select
                  value={labelSize}
                  onChange={(e) => handleLabelSizeChange(e.target.value)}
                  className="text-xs bg-amber-50 font-bold border border-amber-300 rounded px-1.5 py-0.5 text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  title="เลือกขนาดสติกเกอร์ตามม้วนกระดาษที่ใส่ในเครื่องพิมพ์"
                >
                  {renderLabelSizeOptions()}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (labelSize === '100x75') handleLabelSizeChange('75x100');
                    else if (labelSize === '75x100') handleLabelSizeChange('100x75');
                    else if (labelSize === '100x80') handleLabelSizeChange('80x100');
                    else if (labelSize === '80x100') handleLabelSizeChange('100x80');
                    else handleLabelSizeChange('100x75');
                  }}
                  className="px-1.5 py-0.5 hover:bg-amber-100 rounded text-[10px] font-bold text-amber-800 border border-amber-200 cursor-pointer flex items-center gap-1"
                  title="สลับสัดส่วนป้ายระหว่าง แนวนอน (100x75) กับ แนวตั้ง (75x100)"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  {activeSize.width > activeSize.height ? 'สลับแนวตั้ง' : 'สลับแนวนอน'}
                </button>
              </div>

              {/* Print Zoom / Fullness Selector */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                  ความเต็มป้าย:
                </span>
                <select
                  value={printZoom}
                  onChange={(e) => handlePrintZoomChange(e.target.value)}
                  className="text-xs bg-blue-50 font-bold border border-blue-300 rounded px-1.5 py-0.5 text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  title="ปรับสเกลขยายเต็มสติกเกอร์ (102% ช่วยแก้ปัญหาขอบขาวเครื่องพิมพ์ความร้อนให้ออกมาเต็มดวงพอดี)"
                >
                  <option value="102">102% (เต็มดวง แนะนำ)</option>
                  <option value="100">100% (ปกติ)</option>
                  <option value="104">104% (เต็มขอบ +4%)</option>
                  <option value="106">106% (เต็มขอบสูงสุด +6%)</option>
                  <option value="98">98% (ย่อขอบ 98%)</option>
                </select>
              </div>

              {/* Margin Fit Selector */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                  ระยะขอบ:
                </span>
                <select
                  value={marginFit}
                  onChange={(e) => handleMarginFitChange(e.target.value as any)}
                  className="text-xs bg-slate-50 font-medium border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
                  title="เลือกระยะขอบสติกเกอร์ (ชิดขอบ 0.5มม. หรือ ไร้ขอบ 0มม.)"
                >
                  <option value="tight">ชิดขอบ 0.5 มม.</option>
                  <option value="borderless">ไร้ขอบ 0 มม.</option>
                  <option value="standard">ปกติ 1.5 มม.</option>
                </select>
              </div>

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
                  className="text-xs bg-amber-50 font-bold border border-amber-300 rounded px-1.5 py-0.5 text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  title="ปรับทิศทางการพิมพ์สำหรับเครื่องพิมพ์สติกเกอร์ที่พิมพ์ออกมากลับด้านหรือตะแคง"
                >
                  <option value="270">⭐ หมุน 270° (แก้ปัญหาพิมพ์แล้วตะแคง - แนะนำสำหรับ Gprinter)</option>
                  <option value="90">🔄 หมุน 90° (ตามเข็ม - กรณีเครื่องหมุนอีกด้าน)</option>
                  <option value="0">แนวนอนปกติ (0°)</option>
                  <option value="180">↕️ กลับหัว 180°</option>
                  <option value="auto">🌐 โหมด Auto (สำหรับเครื่องที่เลือกแนวตั้งใน Chrome ได้)</option>
                </select>
              </div>

              <Button
                onClick={handlePrint}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md px-5 h-9"
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
