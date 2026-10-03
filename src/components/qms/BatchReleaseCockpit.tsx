"use client";

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Clock,
  XCircle,
  PauseCircle,
  FileText,
  FileCheck2,
  RefreshCw,
  Building2,
  Boxes,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Printer,
  ChevronDown,
  Layers,
  History,
  Shield,
  FileDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  QmsBatchReleaseCockpitData,
  QmsReleaseDispositionDecision,
  QmsNonConformanceDisposition,
} from '@/types/qms';
import {
  getBatchReleaseCockpitData,
  reEvaluateBatchReleaseGates,
  submitCapaImpactReview,
  submitBatchReleaseDisposition,
  generateCoaData,
} from '@/app/actions/qms_batch_release';
import { toast } from 'sonner';

interface BatchReleaseCockpitProps {
  releaseId: string;
  onBack: () => void;
}

export function BatchReleaseCockpit({ releaseId, onBack }: BatchReleaseCockpitProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QmsBatchReleaseCockpitData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactNotes, setImpactNotes] = useState('');

  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [dispositionType, setDispositionType] = useState<QmsReleaseDispositionDecision>('QA_RELEASED');
  const [dispositionRationale, setDispositionRationale] = useState('');
  const [nonConformancePath, setNonConformancePath] = useState<QmsNonConformanceDisposition>('REWORK_CONSIDERATION');
  const [reworkProtocolNo, setReworkProtocolNo] = useState('');

  const [coaModalOpen, setCoaModalOpen] = useState(false);
  const [coaData, setCoaData] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getBatchReleaseCockpitData(releaseId);
      setData(res);
      if (res.release.coa_data && Object.keys(res.release.coa_data).length > 0) {
        setCoaData(res.release.coa_data);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('ไม่สามารถโหลดข้อมูล Batch Release ได้: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [releaseId]);

  const handleReEvaluate = async () => {
    try {
      setActionLoading(true);
      await reEvaluateBatchReleaseGates(releaseId);
      toast.success('ประเมินเกตทั้งหมดใหม่เรียบร้อยแล้ว');
      await loadData();
    } catch (e: any) {
      toast.error('การประเมินล้มเหลว: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenImpactModal = () => {
    setImpactNotes(data?.release.capa_impact_notes || '');
    setImpactModalOpen(true);
  };

  const handleSubmitImpactReview = async () => {
    if (!impactNotes || impactNotes.trim().length < 5) {
      toast.error('กรุณาระบุบันทึกการประเมินผลกระทบ (QA Impact Notes) ให้ชัดเจน');
      return;
    }
    try {
      setActionLoading(true);
      await submitCapaImpactReview(releaseId, impactNotes, {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'ภญ. วริศรา มั่นคง (QA Manager)',
      });
      toast.success('บันทึกการประเมินผลกระทบ CAPA สำเร็จ');
      setImpactModalOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error('เกิดข้อผิดพลาด: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDisposition = (decision: QmsReleaseDispositionDecision) => {
    setDispositionType(decision);
    setDispositionRationale('');
    setNonConformancePath('REWORK_CONSIDERATION');
    setReworkProtocolNo(decision === 'QA_REJECTED' ? `RWK-2026-${data?.release.lot_no?.slice(-4) || '0001'}` : '');
    setDispositionModalOpen(true);
  };

  const handleSubmitDisposition = async () => {
    if (!dispositionRationale || dispositionRationale.trim().length < 5) {
      toast.error('กรุณาระบุเหตุผลและบันทึกการพิจารณาปล่อยผ่าน/ปฏิเสธ (Rationale) อย่างครบถ้วน');
      return;
    }
    try {
      setActionLoading(true);
      await submitBatchReleaseDisposition({
        releaseId,
        decision: dispositionType,
        rationale: dispositionRationale,
        nonConformancePath: dispositionType === 'QA_REJECTED' ? nonConformancePath : undefined,
        reworkProtocolNo: dispositionType === 'QA_REJECTED' && nonConformancePath === 'REWORK_CONSIDERATION' ? reworkProtocolNo : undefined,
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'ภญ. วริศรา มั่นคง',
          role: 'QA_MANAGER',
        },
      });
      toast.success(
        dispositionType === 'QA_RELEASED'
          ? 'อนุมัติปล่อยผ่านรุ่นการผลิต (QA RELEASED) เรียบร้อยแล้ว'
          : dispositionType === 'QA_ON_HOLD'
          ? 'บันทึกการระงับรุ่นการผลิตชั่วคราว (QA ON HOLD) แล้ว'
          : 'บันทึกการปฏิเสธรุ่นการผลิต (QA REJECTED) แล้ว'
      );
      setDispositionModalOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCoa = async () => {
    try {
      setActionLoading(true);
      const coa = await generateCoaData(releaseId, {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'ภญ. วริศรา มั่นคง (QA Manager)',
      });
      setCoaData(coa);
      setCoaModalOpen(true);
    } catch (e: any) {
      toast.error('ไม่สามารถออกเอกสาร COA ได้: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintCoa = () => {
    if (!coaData) return;

    // Create isolated, headless iframe for printing strictly the COA document
    // Prevents Chromium from repeating fixed modals across background pages
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const testRowsHtml = (coaData.test_results || [])
      .map(
        (res: any) => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 5px 8px; border-right: 1px solid #cbd5e1; font-weight: 600; font-size: 10px; color: #0f172a;">
            ${res.parameter_en}
            <div style="font-size: 9px; color: #64748b; font-weight: normal;">${res.parameter_th}</div>
          </td>
          <td style="padding: 5px 8px; border-right: 1px solid #cbd5e1; font-size: 10px; color: #334155;">
            ${res.specification}
          </td>
          <td style="padding: 5px 8px; border-right: 1px solid #cbd5e1; font-size: 9.5px; color: #475569;">
            ${res.test_method}
          </td>
          <td style="padding: 5px 8px; border-right: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: bold; font-size: 10px; color: #0f172a;">
            ${res.actual_result}
            ${
              res.is_exempt && res.exemption_reason
                ? `<div style="font-size: 8.5px; color: #64748b; font-family: sans-serif; font-weight: normal; margin-top: 1px;">${res.exemption_reason}</div>`
                : ''
            }
          </td>
          <td style="padding: 5px 8px; text-align: center;">
            <span style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; font-size: 8.5px; letter-spacing: 0.5px; text-transform: uppercase; ${
              res.result_status === 'PASS'
                ? 'background: #dcfce7; color: #166534; border: 1px solid #86efac;'
                : res.result_status === 'NOT_APPLICABLE' || res.result_status === 'N/A'
                ? 'background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;'
                : 'background: #ffe4e6; color: #9f1239; border: 1px solid #fca5a5;'
            }">
              ${res.result_status === 'NOT_APPLICABLE' ? 'N/A (EXEMPT)' : res.result_status}
            </span>
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>COA - ${coaData.batch_info?.lot_no}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-size: 10px;
              line-height: 1.3;
            }
            .header-container {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 6px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .company-name-en {
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              color: #0f172a;
            }
            .company-name-th {
              font-size: 11px;
              font-weight: 600;
              color: #334155;
            }
            .company-details {
              font-size: 8.5px;
              color: #64748b;
              margin-top: 1px;
            }
            .coa-title-en {
              font-size: 13px;
              font-weight: 800;
              color: #065f46;
              letter-spacing: 0.5px;
              text-align: right;
            }
            .coa-title-th {
              font-size: 10px;
              font-weight: 600;
              color: #1e293b;
              text-align: right;
            }
            .coa-no {
              font-family: monospace;
              font-size: 9px;
              color: #475569;
              text-align: right;
              margin-top: 1px;
            }
            .uat-badge {
              display: inline-block;
              font-size: 8px;
              font-weight: 700;
              padding: 1px 5px;
              border-radius: 3px;
              background: #e0e7ff;
              color: #3730a3;
              border: 1px solid #c7d2fe;
              margin-top: 2px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
            }
            .info-table td {
              padding: 4px 6px;
              font-size: 9.5px;
              vertical-align: top;
            }
            .info-label {
              color: #64748b;
              font-size: 8.5px;
              display: block;
            }
            .info-val {
              font-weight: 600;
              color: #0f172a;
            }
            .section-title {
              font-size: 9.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1e293b;
              margin-bottom: 4px;
            }
            .results-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              border: 1px solid #cbd5e1;
            }
            .results-table th {
              background: #f1f5f9;
              padding: 5px 6px;
              font-size: 9px;
              font-weight: 700;
              color: #334155;
              border-bottom: 1px solid #cbd5e1;
              border-right: 1px solid #cbd5e1;
              text-align: left;
            }
            .conclusion-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
              padding: 6px 8px;
              margin-bottom: 10px;
            }
            .conclusion-title {
              font-weight: 700;
              font-size: 9.5px;
              color: #0f172a;
            }
            .conclusion-text {
              font-size: 9px;
              color: #334155;
              margin-top: 2px;
              line-height: 1.35;
            }
            .footer-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding-top: 6px;
              border-top: 1px solid #cbd5e1;
            }
            .footer-audit {
              font-size: 8px;
              color: #64748b;
              line-height: 1.25;
            }
            .signature-block {
              text-align: center;
              min-width: 160px;
            }
            .signature-name {
              font-family: Georgia, serif;
              font-style: italic;
              font-weight: bold;
              font-size: 11.5px;
              color: #0f172a;
              margin-bottom: 2px;
            }
            .signature-line {
              width: 140px;
              height: 1px;
              background: #64748b;
              margin: 0 auto 2px auto;
            }
            .signature-role {
              font-size: 8.5px;
              font-weight: 600;
              color: #334155;
            }
            .signature-sub {
              font-size: 7.5px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <div class="company-name-en">${coaData.manufacturer?.name_en || 'COSMEDIVA CO., LTD.'}</div>
              <div class="company-name-th">${coaData.manufacturer?.name_th || 'บริษัท คอสเมดิวา จำกัด'}</div>
              <div class="company-details">${coaData.manufacturer?.standard || 'ISO 22716 / ASEAN Cosmetic GMP Certified Facility'}</div>
              <div class="company-details">${coaData.manufacturer?.address || '88/9 นิคมอุตสาหกรรมนวนคร ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี'} | Tax ID: ${coaData.manufacturer?.tax_id || '0105560123456'}</div>
            </div>
            <div style="text-align: right;">
              <div class="coa-title-en">CERTIFICATE OF ANALYSIS</div>
              <div class="coa-title-th">ใบรับรองผลการวิเคราะห์</div>
              <div class="coa-no">${coaData.coa_no}</div>
              <div class="uat-badge">UAT / TEST DATA</div>
            </div>
          </div>

          <table class="info-table">
            <tr>
              <td style="width: 50%;">
                <span class="info-label">Product Name / ชื่อผลิตภัณฑ์:</span>
                <span class="info-val">${coaData.batch_info?.product_name}</span>
              </td>
              <td style="width: 50%;">
                <span class="info-label">Product Code / รหัสสินค้า:</span>
                <span class="info-val" style="font-family: monospace;">${coaData.batch_info?.sku_code}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="info-label">Batch / Lot Number / เลขที่รุ่นการผลิต:</span>
                <span class="info-val" style="font-family: monospace; color: #065f46;">${coaData.batch_info?.lot_no}</span>
              </td>
              <td>
                <span class="info-label">Batch Quantity / ขนาดการผลิต:</span>
                <span class="info-val">${coaData.batch_info?.batch_size}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="info-label">Manufacturing Date / วันที่ผลิต:</span>
                <span class="info-val">${coaData.batch_info?.mfg_date}</span>
              </td>
              <td>
                <span class="info-label">Expiration Date / วันหมดอายุ:</span>
                <span class="info-val">${coaData.batch_info?.exp_date}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span class="info-label">FDA Notification No. / เลขที่ใบรับจดแจ้ง:</span>
                <span class="info-val" style="font-family: monospace;">${coaData.batch_info?.fda_notification_no}</span>
              </td>
              <td>
                <span class="info-label">Approved Specification Ref / ข้อกำหนดอ้างอิง:</span>
                <span class="info-val" style="font-family: monospace; color: #4338ca;">${coaData.specification_reference || 'SPEC-APPROVED-01'}</span>
              </td>
            </tr>
          </table>

          <div class="section-title">Analytical Test Results / ผลการตรวจวิเคราะห์ทางห้องปฏิบัติการ:</div>
          <table class="results-table">
            <thead>
              <tr>
                <th style="width: 25%;">Test Items / รายการทดสอบ</th>
                <th style="width: 33%;">Specification / ข้อกำหนด</th>
                <th style="width: 22%;">Test Method / วิธีทดสอบ</th>
                <th style="width: 12%; text-align: center;">Result / ผลวิเคราะห์</th>
                <th style="width: 8%; text-align: center; border-right: none;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${testRowsHtml}
            </tbody>
          </table>

          <div class="conclusion-box">
            <div class="conclusion-title">Conclusion / สรุปผลการวิเคราะห์:</div>
            <div class="conclusion-text">${coaData.conclusion}</div>
          </div>

          <div class="footer-container">
            <div class="footer-audit">
              Generated electronically by CosmeFlow Assurance OS<br />
              Verified under ISO 22716 Cosmetics Good Manufacturing Practices<br />
              Traceability Hash: SHA256-${coaData.batch_info?.lot_no}-VERIFIED
            </div>
            <div class="signature-block">
              <div class="signature-name">${coaData.approved_by}</div>
              <div class="signature-line"></div>
              <div class="signature-role">Quality Assurance Manager</div>
              <div class="signature-sub">Authorized Electronic Approval</div>
            </div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('COA print error:', err);
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    }, 300);
  };

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-base">กำลังโหลด Cockpit การตรวจปล่อยรุ่นการผลิต...</span>
      </div>
    );
  }

  const { release, template, gate_evaluations, associated_events, associated_capas, dispositions, audit_trail } = data;

  const total = release.total_gates_count || 12;
  const passed = release.passed_gates_count || 0;
  const na = release.na_gates_count || 0;
  const failed = release.failed_gates_count || 0;
  const pending = release.pending_gates_count || 0;

  const isReady = release.overall_status === 'READY_FOR_QA_REVIEW';
  const isBlocked = release.is_blocked || release.overall_status === 'BLOCKED';
  const isReleased = release.overall_status === 'QA_RELEASED';
  const isRejected = release.overall_status === 'QA_REJECTED';
  const isOnHold = release.overall_status === 'QA_ON_HOLD';

  return (
    <div className="space-y-6">
      {/* Top Navigation Strip */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white gap-2 pl-0"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับสู่รายการรุ่นการผลิต (Back to Queue)
        </Button>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleReEvaluate}
            variant="outline"
            size="sm"
            disabled={actionLoading}
            className="border-slate-700 hover:bg-slate-800 text-slate-200 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            ประเมินเกตอัตโนมัติ (Re-Evaluate)
          </Button>

          <Button
            onClick={handleOpenCoa}
            variant="outline"
            size="sm"
            className="border-emerald-600/50 hover:bg-emerald-950/40 text-emerald-300 gap-1.5"
          >
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            พรีวิว / พิมพ์ใบรับรอง COA
          </Button>
        </div>
      </div>

      {/* CORE OPERATIONAL QUESTION BANNER */}
      <div
        className={`p-6 rounded-xl border shadow-lg transition-all ${
          isOnHold
            ? 'bg-amber-950/40 border-amber-500/60 shadow-amber-950/40'
            : isBlocked
            ? 'bg-rose-950/40 border-rose-500/60 shadow-rose-950/40'
            : isReleased
            ? 'bg-emerald-950/50 border-emerald-500/70 shadow-emerald-950/40'
            : isRejected
            ? 'bg-rose-950/50 border-rose-500/80 shadow-rose-950/50'
            : isReady
            ? 'bg-emerald-950/30 border-emerald-500/50 shadow-emerald-950/30'
            : 'bg-blue-950/40 border-blue-500/60 shadow-blue-950/40'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl border mt-0.5 ${
                isOnHold
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : isBlocked
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : isReleased
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : isRejected
                  ? 'bg-rose-500/30 border-rose-500/50 text-rose-200'
                  : isReady
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              }`}
            >
              {isOnHold ? (
                <PauseCircle className="w-8 h-8 text-amber-400" />
              ) : isBlocked ? (
                <ShieldAlert className="w-8 h-8" />
              ) : isReleased ? (
                <ClipboardCheck className="w-8 h-8" />
              ) : isRejected ? (
                <XCircle className="w-8 h-8" />
              ) : isReady ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8" />
              )}
            </div>

            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                คำถามหลักในการตรวจปล่อย (Core Operational Question)
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                “ล็อตนี้พร้อมให้ QA ปล่อยผ่านหรือยัง?”
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isOnHold && (
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 font-bold">
                      ⏸ QA ON HOLD (กักกันคุณภาพ)
                    </span>
                    <span>รุ่นการผลิตติดคำสั่งกักกันคุณภาพ (Active QA Hold) — ไม่อนุญาตให้ปล่อยผ่าน</span>
                  </div>
                )}

                {!isOnHold && isBlocked && (
                  <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                    <span className="px-2.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                      ⛔ ยังไม่พร้อม (BLOCKED)
                    </span>
                    <span>พบเงื่อนไขวิกฤตระงับการปล่อยผ่านรุ่นการผลิต</span>
                  </div>
                )}

                {isReady && (
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                      ✅ พร้อมให้ QA ทบทวน (READY FOR QA REVIEW)
                    </span>
                    <span>ผ่านเกณฑ์การตรวจปล่อยครบถ้วน {passed}/{total} เกต และไม่มีเงื่อนไขระงับ</span>
                  </div>
                )}

                {isReleased && (
                  <div className="flex items-center gap-2 text-emerald-200 font-semibold text-sm">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-600/30 border border-emerald-500">
                      ✅ อนุมัติปล่อยผ่านแล้ว (QA RELEASED)
                    </span>
                    <span>รุ่นการผลิตถูกโอนย้ายเป็นสินค้าพร้อมจำหน่ายในคลังสินค้า WMS</span>
                  </div>
                )}

                {isRejected && (
                  <div className="flex items-center gap-2 text-rose-200 font-semibold text-sm">
                    <span className="px-2.5 py-0.5 rounded bg-rose-600/30 border border-rose-500">
                      ❌ ปฏิเสธรุ่นการผลิต (QA REJECTED)
                    </span>
                    <span>
                      แนวทางการจัดการ:{' '}
                      <span className="underline font-bold">
                        {release.non_conformance_path === 'REWORK_CONSIDERATION'
                          ? `พิจารณาแปรรูปใหม่ (${release.rework_protocol_no || 'มีระเบียบปฏิบัติ'})`
                          : release.non_conformance_path === 'SUPPLIER_RETURN'
                          ? 'กักกันเพื่อส่งคืนผู้จัดจำหน่าย'
                          : release.non_conformance_path === 'DESTRUCTION_CONSIDERATION'
                          ? 'พิจารณาทำลายสินค้า'
                          : 'การจัดการอื่นตามที่ QA กำหนด'}
                      </span>
                    </span>
                  </div>
                )}

                {isOnHold && (
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                      ⏸ QA ON HOLD
                    </span>
                    <span>อยู่ระหว่างการกักกันชั่วคราวโดย QA</span>
                  </div>
                )}

                {!isBlocked && !isReady && !isReleased && !isRejected && !isOnHold && (
                  <div className="flex items-center gap-2 text-blue-300 font-semibold text-sm">
                    <span className="px-2.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                      ⏳ รอดำเนินการ (WAITING FOR RESULT)
                    </span>
                    <span>อยู่ระหว่างรอผลการวิเคราะห์แล็บ QC หรือบันทึกการผลิต</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Gate Readiness Counter */}
          <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800 shrink-0">
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-400 block">ผ่านแล้ว</span>
              <span className="text-lg font-bold text-emerald-400">{passed}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-400 block">ไม่เกี่ยวข้อง</span>
              <span className="text-lg font-bold text-slate-400">{na}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-400 block">รอดำเนินการ</span>
              <span className="text-lg font-bold text-blue-400">{pending}</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-400 block">ไม่ผ่าน</span>
              <span className="text-lg font-bold text-rose-400">{failed}</span>
            </div>
          </div>
        </div>

        {/* PROMINENT BLOCKING REASONS (If Blocked) */}
        {isBlocked && release.blocking_reasons && release.blocking_reasons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-rose-500/30">
            <div className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              สาเหตุที่ระงับการปล่อยผ่านรุ่นการผลิต (Blocking Reasons — ต้องแก้ไขก่อนปล่อยผ่าน):
            </div>
            <div className="space-y-1.5">
              {release.blocking_reasons.map((br, idx) => (
                <div
                  key={idx}
                  className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-2.5 flex items-center justify-between text-xs text-rose-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                      {br.gate_code}
                    </span>
                    <span className="font-semibold text-rose-100">{br.gate_title}:</span>
                    <span>{br.reason}</span>
                  </div>
                  {br.link_id && (
                    <span className="text-xs text-rose-300 underline cursor-pointer hover:text-white">
                      ดูบันทึกเหตุการณ์ →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BATCH INFORMATION MASTER CARD */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">เลขที่รุ่น (Lot No.)</span>
              <span className="font-bold text-white text-base">{release.lot_no}</span>
              <span className="text-[11px] text-slate-500 block">{release.release_no}</span>
            </div>

            <div className="lg:col-span-2">
              <span className="text-xs text-slate-400 block">ชื่อผลิตภัณฑ์ (Product)</span>
              <span className="font-semibold text-slate-200 block truncate">{release.product_name}</span>
              <span className="text-xs text-slate-400">รหัส: {release.sku_code}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">ขนาดการผลิต (Batch Size)</span>
              <span className="font-mono text-slate-200 font-medium">
                {release.batch_size_kg ? `${release.batch_size_kg} kg` : '-'}
              </span>
              <span className="text-xs text-slate-400 block">
                {release.planned_quantity?.toLocaleString()} ชิ้น
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">การกระทบยอดผลผลิต (Yield)</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-white">
                  {release.yield_actual_pct ? `${release.yield_actual_pct}%` : '-'}
                </span>
                <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {release.yield_status || 'IN_SPEC'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                เกณฑ์อนุมัติ: {release.yield_spec_min_pct || 97}% - {release.yield_spec_max_pct || 102}%
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">เทมเพลต (Release Template)</span>
              <span className="text-xs font-medium text-slate-300 block truncate" title={template?.template_name}>
                {template?.template_name || 'Standard Cosmetics'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                หมวด: {template?.product_category || 'EMULSION'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ASSOCIATED OPEN CAPA & QUALITY EVENT INTERLOCK */}
      {(associated_capas.length > 0 || associated_events.length > 0) && (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="py-3 px-5 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                ความเชื่อมโยงเหตุการณ์คุณภาพและ CAPA (Quality Event & CAPA Context)
              </CardTitle>
              <span className="text-xs text-slate-400">
                ประเมินผลกระทบต่อการตรวจปล่อยตามหลักเกณฑ์ ISO 22716
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {associated_capas.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                      {associated_capas[0].capa_no}
                    </span>
                    <span className="font-semibold text-sm text-amber-200">
                      {associated_capas[0].title}
                    </span>
                    <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/40">
                      {associated_capas[0].current_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    ℹ️ <strong className="text-slate-300">กฎข้อกำหนด:</strong> การมี CAPA ที่ยังเปิดอยู่จะไม่บล็อกการปล่อยผ่านโดยอัตโนมัติ หากไม่มีคำสั่งกักกันคุณภาพ (QA Hold) และ QA ได้ประเมินผลกระทบแล้ว
                  </p>
                  {release.capa_impact_reviewed ? (
                    <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      QA ได้ประเมินแล้ว: “{release.capa_impact_notes}” (โดย {release.capa_impact_reviewed_by_name})
                    </div>
                  ) : (
                    <div className="text-xs text-amber-400 font-medium">
                      ⚠️ ยังไม่มีบันทึกการประเมินผลกระทบต่อรุ่นการผลิตนี้ (QA Impact Review Required)
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={handleOpenImpactModal}
                  variant="outline"
                  className="border-amber-500/50 hover:bg-amber-950/40 text-amber-300 shrink-0 text-xs gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {release.capa_impact_reviewed ? 'แก้ไขบันทึกประเมินผลกระทบ' : 'บันทึก QA Impact Review'}
                </Button>
              </div>
            )}

            {associated_events.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  เหตุการณ์คุณภาพที่เกี่ยวข้องกับรุ่นการผลิตนี้ ({associated_events.length} รายการ):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {associated_events.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-300">{evt.event_no}</span>
                          <span className="text-slate-200 font-medium truncate max-w-[200px]">{evt.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          สถานะ: {evt.current_status} | การกักกัน: {evt.containment_status}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          evt.qa_confirmed_severity === 'CRITICAL'
                            ? 'text-rose-400 border-rose-500/40'
                            : 'text-amber-400 border-amber-500/40'
                        }
                      >
                        {evt.qa_confirmed_severity || 'MINOR'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 12-GATE COSMETICS RELEASE CHECKLIST GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              รายการตรวจสอบการตรวจปล่อย 12 เกต (Cosmetics Release Checklist Library)
            </h3>
            <p className="text-xs text-slate-400">
              ประเมินอัตโนมัติจากบันทึกต้นทาง CosmeFlow (Zero-Retyping) พร้อมระบบตรวจสอบเหตุผลความจำเป็นของแต่ละประเภทสินค้า
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {gate_evaluations.map((gate) => {
            const isGatePass = gate.status === 'PASS';
            const isGateFail = gate.status === 'FAIL';
            const isGateNa = gate.status === 'NOT_APPLICABLE';
            const isGatePending = gate.status === 'PENDING' || gate.status === 'UNDER_REVIEW';

            return (
              <Card
                key={gate.id}
                className={`transition-all border ${
                  isGateFail || gate.is_hard_block
                    ? 'bg-rose-950/20 border-rose-500/50 hover:border-rose-500'
                    : isGatePass
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : isGateNa
                    ? 'bg-slate-900/30 border-slate-800/60 opacity-80'
                    : 'bg-blue-950/20 border-blue-500/40'
                }`}
              >
                <CardContent className="p-4 space-y-2.5">
                  {/* Gate Top Strip */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      เกต {gate.gate_number}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isGateNa && (
                        <Badge variant="outline" className="text-slate-400 border-slate-700 text-[10px]">
                          N/A (ไม่เกี่ยวข้อง)
                        </Badge>
                      )}
                      {gate.requirement_level === 'REQUIRED' && (
                        <span className="text-[10px] text-amber-400/80 font-medium">บังคับ</span>
                      )}
                      {isGatePass && (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                          ✅ PASS
                        </Badge>
                      )}
                      {isGateFail && (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-xs">
                          ❌ FAILED
                        </Badge>
                      )}
                      {isGatePending && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">
                          ⏳ PENDING
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Gate Titles */}
                  <div>
                    <h4 className="text-sm font-semibold text-white leading-tight">
                      {gate.gate_title_th}
                    </h4>
                    <span className="text-xs text-slate-400 font-normal">
                      {gate.gate_title_en}
                    </span>
                  </div>

                  {/* N/A Justification (if applicable) */}
                  {isGateNa && gate.na_reason && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded p-2 text-xs text-slate-400 italic">
                      ℹ️ เหตุผลที่ไม่ต้องตรวจ: {gate.na_reason}
                    </div>
                  )}

                  {/* Hard Block / Error Note */}
                  {gate.is_hard_block && gate.hard_block_message && (
                    <div className="bg-rose-950/50 border border-rose-500/40 rounded p-2 text-xs text-rose-300 font-medium">
                      ⛔ {gate.hard_block_message}
                    </div>
                  )}

                  {/* Source-of-Truth Info (Zero Retyping) */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={gate.source_entity}>
                      <span>แหล่งข้อมูล: <strong className="text-slate-300">{gate.source_entity || 'CosmeFlow'}</strong></span>
                      {gate.source_entity?.toLowerCase().includes('qc') && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                          UAT DATA
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500">{gate.responsible_function || 'QA'}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FINAL QA DISPOSITION CONTROL ROOM */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-md">
        <CardHeader className="py-4 px-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                การพิจารณาตัดสินใจปล่อยผ่านรุ่นการผลิต (Controlled QA Disposition)
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                การอนุมัติอิเล็กทรอนิกส์ที่มีการควบคุม (Controlled Electronic Approval) พร้อมบันทึกประวัติการตัดสินใจตามมาตรฐาน ISO 22716
              </p>
            </div>

            {release.current_disposition && (
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                สถานะปัจจุบัน: {release.current_disposition} (บันทึกเวอร์ชัน: Rev {release.record_version})
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400">
                อำนาจการตัดสินใจทางคุณภาพ (Authorized QA Authority)
              </span>
              <p className="text-sm text-slate-300">
                {isBlocked ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ปุ่มปล่อยผ่านถูกล็อคเนื่องจากมีเงื่อนไขระงับวิกฤต (Hard Block)
                  </span>
                ) : isReady ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    เกตทั้งหมดผ่านเกณฑ์มาตรฐาน — พร้อมให้ผู้มีอำนาจลงนามตรวจปล่อย
                  </span>
                ) : isReleased ? (
                  <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                    รุ่นการผลิตนี้ได้รับการอนุมัติปล่อยผ่านเรียบร้อยแล้ว
                  </span>
                ) : (
                  <span className="text-slate-400">
                    โปรดตรวจสอบผลการทดสอบและเกตที่ยังไม่เสร็จสิ้นก่อนทำการตัดสินใจ
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Button QA RELEASED */}
              <Button
                onClick={() => handleOpenDisposition('QA_RELEASED')}
                disabled={isBlocked || actionLoading || failed > 0}
                className={`gap-1.5 text-sm font-semibold shadow-md ${
                  isBlocked || failed > 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                {isReleased ? 'บันทึกการปล่อยผ่านซ้ำ' : 'อนุมัติปล่อยผ่าน (QA RELEASED)'}
              </Button>

              {/* Button QA ON HOLD */}
              <Button
                onClick={() => handleOpenDisposition('QA_ON_HOLD')}
                disabled={actionLoading}
                variant="outline"
                className="border-amber-500/60 hover:bg-amber-950/40 text-amber-300 text-sm gap-1.5"
              >
                <PauseCircle className="w-4 h-4" />
                ระงับชั่วคราว (QA ON HOLD)
              </Button>

              {/* Button QA REJECTED */}
              <Button
                onClick={() => handleOpenDisposition('QA_REJECTED')}
                disabled={actionLoading}
                variant="outline"
                className="border-rose-500/60 hover:bg-rose-950/40 text-rose-300 text-sm gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                ปฏิเสธรุ่นการผลิต (QA REJECTED)
              </Button>
            </div>
          </div>

          {/* Disposition History Log */}
          {dispositions && dispositions.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 block mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                ประวัติการตัดสินใจปล่อยผ่านรุ่นการผลิต (Controlled Disposition History):
              </span>
              <div className="space-y-2">
                {dispositions.map((disp) => (
                  <div
                    key={disp.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            disp.decision === 'QA_RELEASED'
                              ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                              : disp.decision === 'QA_ON_HOLD'
                              ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                              : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                          }
                        >
                          {disp.decision}
                        </Badge>
                        <span className="text-slate-200 font-medium">{disp.reason_rationale}</span>
                      </div>
                      {disp.non_conformance_disposition && (
                        <div className="text-[11px] text-rose-300 mt-1">
                          แนวทางการจัดการ: <strong>{disp.non_conformance_disposition}</strong>{' '}
                          {disp.rework_protocol_reference && `(เลขที่เอกสาร: ${disp.rework_protocol_reference})`}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <div>ผู้ลงนาม: <strong className="text-slate-200">{disp.authorized_by_name}</strong> ({disp.authorized_by_role})</div>
                      <div>{new Date(disp.authorized_at).toLocaleString('th-TH')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: QA IMPACT REVIEW MODAL */}
      <Dialog open={impactModalOpen} onOpenChange={setImpactModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              บันทึกการประเมินผลกระทบ CAPA (QA Impact Review)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              ประเมินและยืนยันว่า CAPA ที่ยังเปิดอยู่ไม่มีผลกระทบต่อคุณภาพ ความปลอดภัย และการปล่อยผ่านรุ่นการผลิตนี้
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-amber-300">
                CAPA ที่เกี่ยวข้อง: {associated_capas[0]?.capa_no} - {associated_capas[0]?.title}
              </div>
              <p className="text-slate-400">
                รุ่นการผลิต: {release.lot_no} | สินค้า: {release.product_name}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                เหตุผลทางเทคนิคและการยืนยันความปลอดภัย (QA Technical Rationale) *
              </Label>
              <Textarea
                rows={4}
                value={impactNotes}
                onChange={(e) => setImpactNotes(e.target.value)}
                placeholder="ระบุเหตุผล เช่น: รุ่นการผลิตนี้ผลิตใน Line 1 ภายใต้การควบคุมพารามิเตอร์ความเร็วที่ผ่านการทวนสอบแล้ว ผลทดสอบแรงบิดและซีลทั้งหมดผ่านเกณฑ์ จึงไม่ได้รับผลกระทบจาก CAPA นี้..."
                className="bg-slate-950 border-slate-800 text-xs text-slate-100 focus:border-amber-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImpactModalOpen(false)}
              className="text-slate-400"
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              disabled={actionLoading || !impactNotes.trim()}
              onClick={handleSubmitImpactReview}
              className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
            >
              บันทึกการประเมินผลกระทบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CONTROLLED DISPOSITION MODAL (RELEASE / HOLD / REJECT) */}
      <Dialog open={dispositionModalOpen} onOpenChange={setDispositionModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              บันทึกการตัดสินใจทางคุณภาพ (Controlled QA Disposition)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              การลงนามอนุมัติอิเล็กทรอนิกส์ที่มีการควบคุมสำหรับรุ่นการผลิต {release.lot_no}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">การตัดสินใจ (Decision):</span>
                <span className="font-bold text-base text-white">{dispositionType}</span>
              </div>
              <Badge
                className={
                  dispositionType === 'QA_RELEASED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : dispositionType === 'QA_ON_HOLD'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }
              >
                {dispositionType === 'QA_RELEASED' ? 'ปล่อยผ่าน' : dispositionType === 'QA_ON_HOLD' ? 'ระงับชั่วคราว' : 'ปฏิเสธรุ่นการผลิต'}
              </Badge>
            </div>

            {/* If Rejected: Select Controlled Non-Conformance Disposition */}
            {dispositionType === 'QA_REJECTED' && (
              <div className="bg-rose-950/30 border border-rose-500/40 rounded-lg p-3.5 space-y-3">
                <div className="text-xs font-bold text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  แนวทางการจัดการสิ่งที่ไม่เป็นไปตามข้อกำหนด (ISO 22716 Cl. 8.4):
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="nc_path"
                      value="REWORK_CONSIDERATION"
                      checked={nonConformancePath === 'REWORK_CONSIDERATION'}
                      onChange={() => setNonConformancePath('REWORK_CONSIDERATION')}
                      className="accent-rose-500"
                    />
                    <span>พิจารณาปรับปรุง/แปรรูปใหม่ (Rework / Reprocess Consideration)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="nc_path"
                      value="SUPPLIER_RETURN"
                      checked={nonConformancePath === 'SUPPLIER_RETURN'}
                      onChange={() => setNonConformancePath('SUPPLIER_RETURN')}
                      className="accent-rose-500"
                    />
                    <span>กักกันเพื่อส่งคืนผู้จัดจำหน่าย (Quarantine & Return to Supplier)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="nc_path"
                      value="DESTRUCTION_CONSIDERATION"
                      checked={nonConformancePath === 'DESTRUCTION_CONSIDERATION'}
                      onChange={() => setNonConformancePath('DESTRUCTION_CONSIDERATION')}
                      className="accent-rose-500"
                    />
                    <span>พิจารณาทำลายสินค้า (Controlled Destruction Consideration)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="nc_path"
                      value="OTHER_AUTHORIZED"
                      checked={nonConformancePath === 'OTHER_AUTHORIZED'}
                      onChange={() => setNonConformancePath('OTHER_AUTHORIZED')}
                      className="accent-rose-500"
                    />
                    <span>การจัดการอื่นตามที่ QA กำหนด (Other Authorized Disposition)</span>
                  </label>
                </div>

                {nonConformancePath === 'REWORK_CONSIDERATION' && (
                  <div className="pt-2 border-t border-rose-500/20 space-y-1">
                    <Label className="text-xs text-rose-200">หมายเลขขั้นตอนการแปรรูป (Rework Protocol No.) *</Label>
                    <Input
                      type="text"
                      value={reworkProtocolNo}
                      onChange={(e) => setReworkProtocolNo(e.target.value)}
                      placeholder="เช่น: RWK-2026-0005"
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                เหตุผลและบันทึกการพิจารณาตัดสินใจ (Disposition Rationale) *
              </Label>
              <Textarea
                rows={4}
                value={dispositionRationale}
                onChange={(e) => setDispositionRationale(e.target.value)}
                placeholder="ระบุเหตุผลในการตัดสินใจปล่อยผ่าน ระงับ หรือปฏิเสธรุ่นการผลิตนี้ตามมาตรฐานคุณภาพ..."
                className="bg-slate-950 border-slate-800 text-xs text-white focus:border-emerald-500"
              />
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-between">
              <span>ผู้ลงนาม: ภญ. วริศรา มั่นคง (QA Manager)</span>
              <span>บทบาท: QA_MANAGER</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDispositionModalOpen(false)}
              className="text-slate-400"
            >
              ยกเลิก
            </Button>
            <Button
              size="sm"
              disabled={actionLoading || !dispositionRationale.trim()}
              onClick={handleSubmitDisposition}
              className={
                dispositionType === 'QA_RELEASED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : dispositionType === 'QA_ON_HOLD'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }
            >
              ยืนยันการตัดสินใจ (Confirm Disposition)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: BILINGUAL CERTIFICATE OF ANALYSIS (COA) MODAL */}
      <Dialog open={coaModalOpen} onOpenChange={setCoaModalOpen}>
        <DialogContent className="bg-white text-slate-900 max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
                  {coaData?.manufacturer?.name_en || 'COSMEDIVA CO., LTD.'}
                </h2>
                <div className="text-xs text-slate-600">{coaData?.manufacturer?.name_th || 'บริษัท คอสเมดิวา จำกัด'}</div>
                <div className="text-[11px] text-slate-500">{coaData?.manufacturer?.standard || 'ISO 22716 / ASEAN Cosmetic GMP Certified Facility'}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-800">CERTIFICATE OF ANALYSIS</div>
                <div className="text-xs font-semibold text-slate-700">ใบรับรองผลการวิเคราะห์</div>
                <div className="text-xs font-mono text-slate-500 mt-1">{coaData?.coa_no}</div>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  UAT / TEST DATA
                </span>
              </div>
            </div>
          </DialogHeader>

          {coaData && (
            <div className="space-y-6 text-xs">
              {/* Product Info Table */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Product Name / ชื่อผลิตภัณฑ์:</span>
                  <span className="font-bold text-slate-900">{coaData.batch_info?.product_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Product Code / รหัสสินค้า:</span>
                  <span className="font-mono font-semibold text-slate-900">{coaData.batch_info?.sku_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Batch / Lot Number / เลขที่รุ่นการผลิต:</span>
                  <span className="font-mono font-bold text-emerald-800">{coaData.batch_info?.lot_no}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Batch Quantity / ขนาดการผลิต:</span>
                  <span className="font-medium text-slate-900">{coaData.batch_info?.batch_size}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Manufacturing Date / วันที่ผลิต:</span>
                  <span className="font-medium text-slate-900">{coaData.batch_info?.mfg_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expiration Date / วันหมดอายุ:</span>
                  <span className="font-medium text-slate-900">{coaData.batch_info?.exp_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">FDA Notification No. / เลขที่ใบรับจดแจ้ง:</span>
                  <span className="font-mono font-semibold text-slate-800">{coaData.batch_info?.fda_notification_no}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Approved Specification Ref / ข้อกำหนดอ้างอิง:</span>
                  <span className="font-mono font-bold text-indigo-700">{coaData.specification_reference || 'SPEC-APPROVED-01'}</span>
                </div>
              </div>

              {/* UAT Notice Banner */}
              {coaData.uat_notice && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
                  <span className="font-semibold">{coaData.uat_notice}</span>
                  <span className="font-mono text-[10px] text-amber-700">ISO 22716 Cosmetics GMP Sandbox</span>
                </div>
              )}

              {/* Test Results Table */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Analytical Test Results / ผลการตรวจวิเคราะห์ทางห้องปฏิบัติการ:
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="p-2 border-r border-slate-300">Test Items / รายการทดสอบ</th>
                      <th className="p-2 border-r border-slate-300">Specification / ข้อกำหนด</th>
                      <th className="p-2 border-r border-slate-300">Test Method / วิธีทดสอบ</th>
                      <th className="p-2 border-r border-slate-300 text-center">Result / ผลวิเคราะห์</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {coaData.test_results?.map((res: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 font-medium">
                          {res.parameter_en}
                          <div className="text-[10px] text-slate-500">{res.parameter_th}</div>
                        </td>
                        <td className="p-2 border-r border-slate-300 text-slate-700">{res.specification}</td>
                        <td className="p-2 border-r border-slate-300 text-slate-600 text-[11px]">{res.test_method}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-900">
                          {res.actual_result}
                          {res.is_exempt && res.exemption_reason && (
                            <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                              {res.exemption_reason}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center text-xs">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] tracking-wide uppercase ${
                              res.result_status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : res.result_status === 'NOT_APPLICABLE' || res.result_status === 'N/A'
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {res.result_status === 'NOT_APPLICABLE' ? 'N/A (EXEMPT)' : res.result_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Conclusion & Authorized Signature */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="font-bold text-slate-800 block">Conclusion / สรุปผลการวิเคราะห์:</span>
                <p className="text-slate-700 mt-0.5">{coaData.conclusion}</p>
              </div>

              <div className="pt-8 flex items-center justify-between border-t border-slate-200">
                <div className="text-slate-500 text-[11px]">
                  Generated electronically by CosmeFlow Assurance OS<br />
                  Verified under ISO 22716 Cosmetics Good Manufacturing Practices
                </div>
                <div className="text-center">
                  <div className="font-serif italic font-bold text-slate-800 text-sm">
                    {coaData.approved_by}
                  </div>
                  <div className="w-48 h-[1px] bg-slate-400 mx-auto my-1" />
                  <div className="text-[11px] font-semibold text-slate-700">Quality Assurance Manager</div>
                  <div className="text-[10px] text-slate-500">Authorized Electronic Approval</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintCoa}
              className="border-slate-300 text-slate-700 gap-1 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์เอกสาร (Print COA)
            </Button>
            <Button
              size="sm"
              onClick={() => setCoaModalOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
            >
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
