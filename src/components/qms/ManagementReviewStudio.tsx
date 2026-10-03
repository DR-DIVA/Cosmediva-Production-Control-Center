'use client';

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  QmsManagementReviewDossierResponse,
  QmsManagementReviewSection,
  QmsQmrDrilldownPopulation,
} from '@/types/qms_analytics';
import { QmrDrilldownModal } from './QmrDrilldownModal';

interface ManagementReviewStudioProps {
  data: QmsManagementReviewDossierResponse;
  periodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
  onPeriodChange: (period: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM') => void;
  onNavigateToTab?: (tabName: string, filter?: any) => void;
}

export function ManagementReviewStudio({
  data,
  periodType,
  onPeriodChange,
  onNavigateToTab,
}: ManagementReviewStudioProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(1);
  const [selectedPopulation, setSelectedPopulation] = useState<{
    population: QmsQmrDrilldownPopulation;
    allPopulations?: QmsQmrDrilldownPopulation[];
    sectionCode: string;
    sectionTitle: string;
    isoClause: string;
  } | null>(null);

  const { companyProfile, sections, periodLabel, executiveConclusion, signatories } = data;

  /**
   * Dedicated Isolated Headless Iframe Print Engine
   * Prevents Chromium from repeating background dashboard DOM across print pages
   */
  const handlePrintDossier = () => {
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

    const sectionsHtml = sections
      .map(
        (sec) => `
        <div style="margin-bottom: 14px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${sec.titleTh}</div>
            <div style="font-size: 9px; font-family: monospace; color: #64748b;">${sec.isoClause}</div>
          </div>
          <div style="font-size: 9.5px; color: #334155; line-height: 1.4; margin-bottom: 6px;">
            ${sec.narrativeText || ''}
          </div>
          ${
            sec.subItems && sec.subItems.length > 0
              ? `
              <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px; background: #f8fafc; border: 1px solid #cbd5e1;">
                ${sec.subItems
                  .map(
                    (item) => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 4px 8px; color: #475569; width: 60%;">${item.label}</td>
                    <td style="padding: 4px 8px; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">${item.value}</td>
                  </tr>
                `
                  )
                  .join('')}
              </table>
            `
              : ''
          }
          ${
            !sec.isConnected
              ? `
              <div style="padding: 4px 8px; background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 3px; font-size: 8.5px; color: #64748b; font-style: italic;">
                ${sec.statusText}
              </div>
            `
              : ''
          }
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Management Review Dossier - ${periodLabel}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; background: #ffffff; }
            .header-strip { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
            .company-name { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
            .company-sub { font-size: 10px; color: #475569; }
            .title-right { text-align: right; }
            .report-title { font-size: 13px; font-weight: 800; color: #065f46; letter-spacing: 0.5px; }
            .report-period { font-size: 10px; font-weight: 600; color: #334155; }
            .conclusion-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; margin: 14px 0; font-size: 9.5px; line-height: 1.4; }
            .sig-container { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; page-break-inside: avoid; }
            .sig-box { text-align: center; width: 200px; font-size: 9px; }
            .sig-line { width: 160px; height: 1px; background: #64748b; margin: 25px auto 4px auto; }
          </style>
        </head>
        <body>
          <div class="header-strip">
            <div>
              <div class="company-name">${companyProfile.nameEn}</div>
              <div class="company-sub">${companyProfile.nameTh}</div>
              <div class="company-sub">${companyProfile.standard}</div>
              <div class="company-sub">Tax ID: ${companyProfile.taxId}</div>
            </div>
            <div class="title-right">
              <div class="report-title">QUALITY MANAGEMENT REVIEW (QMR)</div>
              <div class="report-period">ISO 22716 Clause 17 Controlled Dossier</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${periodLabel}</div>
            </div>
          </div>

          <div>
            ${sectionsHtml}
          </div>

          <div class="conclusion-box">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">Executive Conclusion / สรุปความเห็นของฝ่ายบริหาร:</div>
            <div>${executiveConclusion}</div>
          </div>

          <div class="sig-container">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div style="font-weight: 700; color: #0f172a;">${signatories.preparedBy.name}</div>
              <div style="color: #64748b;">${signatories.preparedBy.role}</div>
              <div style="font-size: 8px; color: #94a3b8;">วันที่: ${signatories.preparedBy.date}</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div style="font-weight: 700; color: #0f172a;">${signatories.approvedBy.name}</div>
              <div style="color: #64748b;">${signatories.approvedBy.role}</div>
              <div style="font-size: 8px; color: #94a3b8;">วันที่: ${signatories.approvedBy.date}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print error:', err);
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000);
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER STRIP & CONTROLS                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
              ISO 22716 Clause 17
            </Badge>
            <h3 className="text-sm font-bold text-white">Management Review Dossier Studio (ชุดเอกสารทบทวนของฝ่ายบริหาร)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            นิติบุคคล: <span className="font-semibold text-slate-200">{companyProfile.nameEn}</span> ({companyProfile.nameTh})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-md border border-slate-800">
            {(['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`text-xs px-2.5 py-1 rounded transition-all font-medium ${
                  periodType === p ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'MONTHLY' ? 'รายเดือน' : p === 'QUARTERLY' ? 'รายไตรมาส (QMR)' : 'รายปี'}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={handlePrintDossier}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs shadow-md shadow-emerald-950/20"
          >
            <Printer className="w-3.5 h-3.5" />
            พิมพ์ / บันทึก PDF (Print A4)
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MANAGEMENT REVIEW SECTIONS ACCORDION                                    */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {sections.map((sec) => (
          <Card
            key={sec.sectionNumber}
            className={`bg-slate-900/70 border transition-all ${
              sec.isConnected ? 'border-slate-800 hover:border-slate-700' : 'border-dashed border-slate-800/80 opacity-80'
            }`}
          >
            <CardHeader
              className="py-3 px-4 cursor-pointer select-none flex flex-row items-center justify-between"
              onClick={() => setExpandedSection(expandedSection === sec.sectionNumber ? null : sec.sectionNumber)}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-indigo-400 font-bold">[{sec.sectionCode}]</span>
                <CardTitle className="text-xs font-bold text-slate-200">{sec.titleTh}</CardTitle>
                <span className="text-[11px] text-slate-500 hidden sm:inline">({sec.titleEn})</span>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    sec.isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]'
                      : 'bg-slate-800 text-slate-400 border-slate-700 text-[10px]'
                  }
                >
                  {sec.statusText}
                </Badge>
                {expandedSection === sec.sectionNumber ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </CardHeader>

            {expandedSection === sec.sectionNumber && (
              <CardContent className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/50">
                <div className="text-xs text-slate-300 leading-relaxed">{sec.narrativeText}</div>

                {/* Calculation Populations Toolbar */}
                {sec.drilldownPopulations && sec.drilldownPopulations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Database className="w-3 h-3 text-indigo-400" />
                      ชุดข้อมูลที่ใช้คำนวณ (Calculation Populations):
                    </span>
                    {sec.drilldownPopulations.map((pop) => (
                      <Button
                        key={pop.metricKey}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSelectedPopulation({
                            population: pop,
                            allPopulations: sec.drilldownPopulations,
                            sectionCode: sec.sectionCode,
                            sectionTitle: sec.titleTh,
                            isoClause: sec.isoClause,
                          })
                        }
                        className="h-6 px-2 text-[10px] bg-slate-950 border-slate-800 hover:border-indigo-500 text-slate-300 hover:text-white gap-1"
                      >
                        <span>
                          {pop.metricLabel.length > 28 ? pop.metricLabel.slice(0, 28) + '...' : pop.metricLabel}
                        </span>
                        <span className="font-mono text-indigo-400">({pop.records.length})</span>
                        {pop.isReconciled ? (
                          <span className="text-emerald-400 text-[9px]">✓</span>
                        ) : (
                          <span className="text-rose-400 text-[9px]">⚠️</span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}

                {sec.subItems && sec.subItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                    {sec.subItems.map((item, idx) => {
                      const pop = sec.drilldownPopulations?.find((p) => p.metricKey === item.metricKey);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (pop) {
                              setSelectedPopulation({
                                population: pop,
                                allPopulations: sec.drilldownPopulations,
                                sectionCode: sec.sectionCode,
                                sectionTitle: sec.titleTh,
                                isoClause: sec.isoClause,
                              });
                            }
                          }}
                          className={`p-2.5 rounded bg-slate-950/60 border border-slate-800 transition-all ${
                            pop ? 'hover:border-indigo-500/60 hover:bg-slate-950/90 cursor-pointer group' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400 block">{item.label}</span>
                            {pop && (
                              <span className="text-[9px] text-indigo-400 bg-indigo-950/60 px-1 py-0.5 rounded border border-indigo-800/60 group-hover:text-indigo-300 flex items-center gap-0.5">
                                ดูบันทึกต้นทาง
                                <ArrowRight className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-white font-mono mt-1 block">{item.value}</span>
                          {item.note && <span className="text-[10px] text-slate-500 mt-1 block">{item.note}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. SIGNATURES & CONCLUSION PREVIEW                                        */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/70 border-slate-800">
        <CardHeader className="py-3 px-4 border-b border-slate-800/60">
          <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            สรุปความเห็นของฝ่ายบริหารและลายมือชื่ออนุมัติ (Executive Signatures)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-slate-200 block mb-1">Executive Conclusion:</span>
            {executiveConclusion}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded bg-slate-950/40 border border-slate-800/60 text-center">
              <div className="text-xs font-bold text-slate-200">{signatories.preparedBy.name}</div>
              <div className="text-[11px] text-slate-400">{signatories.preparedBy.role}</div>
              <div className="text-[10px] text-slate-500 mt-1">ผู้จัดทำรายงาน • {signatories.preparedBy.date}</div>
            </div>

            <div className="p-3 rounded bg-slate-950/40 border border-slate-800/60 text-center">
              <div className="text-xs font-bold text-emerald-400">{signatories.approvedBy.name}</div>
              <div className="text-[11px] text-slate-400">{signatories.approvedBy.role}</div>
              <div className="text-[10px] text-slate-500 mt-1">ผู้อนุมัติผลการทบทวน • {signatories.approvedBy.date}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. SOURCE TRACEABILITY DRILL-DOWN MODAL                                   */}
      {/* ========================================================================= */}
      {selectedPopulation && (
        <QmrDrilldownModal
          open={!!selectedPopulation}
          onOpenChange={(open) => {
            if (!open) setSelectedPopulation(null);
          }}
          population={selectedPopulation.population}
          allPopulations={selectedPopulation.allPopulations}
          sectionCode={selectedPopulation.sectionCode}
          sectionTitle={selectedPopulation.sectionTitle}
          isoClause={selectedPopulation.isoClause}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
}

export default ManagementReviewStudio;
