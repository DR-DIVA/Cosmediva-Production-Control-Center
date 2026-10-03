'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Layers,
  RefreshCw,
  Search,
  Calendar,
  Lock,
  Printer,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QmsDateRangeFilter,
  QmsExecutiveCockpitResponse,
  QmsOperationsIntelligenceResponse,
  QmsBatchReleaseAnalyticsResponse,
  QmsRecurrenceRadarResponse,
  QmsManagementReviewDossierResponse,
  QmsAiExecutiveNarrative,
} from '@/types/qms_analytics';
import {
  getExecutiveCockpitData,
  getOperationsIntelligenceData,
  getBatchReleaseAnalyticsData,
  getRecurrenceRadarData,
  getManagementReviewDossierData,
  generateAiExecutiveNarrative,
} from '@/app/actions/qms_analytics';
import ExecutiveCockpit from './ExecutiveCockpit';
import QualityOperationsView from './QualityOperationsView';
import BatchReleaseRftView from './BatchReleaseRftView';
import RecurrenceRadarView from './RecurrenceRadarView';
import ManagementReviewStudio from './ManagementReviewStudio';
import { toast } from 'sonner';

export type QualityIntelligenceSubTab =
  | 'executive_cockpit'
  | 'operations_intelligence'
  | 'batch_release_rft'
  | 'recurrence_radar'
  | 'management_review';

interface QualityIntelligenceCenterProps {
  initialSubTab?: QualityIntelligenceSubTab;
  onNavigateToTab: (tabName: string, filter?: any) => void;
}

export function QualityIntelligenceCenter({
  initialSubTab = 'executive_cockpit',
  onNavigateToTab,
}: QualityIntelligenceCenterProps) {
  const [activeSubTab, setActiveSubTab] = useState<QualityIntelligenceSubTab>(initialSubTab);
  const [dateRange, setDateRange] = useState<QmsDateRangeFilter>('90d');
  const [loading, setLoading] = useState<boolean>(true);

  // Data states for 5 screens
  const [cockpitData, setCockpitData] = useState<QmsExecutiveCockpitResponse | null>(null);
  const [aiNarrative, setAiNarrative] = useState<QmsAiExecutiveNarrative | null>(null);
  const [opsData, setOpsData] = useState<QmsOperationsIntelligenceResponse | null>(null);
  const [releaseData, setReleaseData] = useState<QmsBatchReleaseAnalyticsResponse | null>(null);
  const [radarData, setRadarData] = useState<QmsRecurrenceRadarResponse | null>(null);
  const [dossierData, setDossierData] = useState<QmsManagementReviewDossierResponse | null>(null);
  const [dossierPeriod, setDossierPeriod] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM'>('QUARTERLY');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'executive_cockpit') {
        const data = await getExecutiveCockpitData({ dateRange });
        setCockpitData(data);
        const narrative = await generateAiExecutiveNarrative(data);
        setAiNarrative(narrative);
      } else if (activeSubTab === 'operations_intelligence') {
        const data = await getOperationsIntelligenceData({ dateRange });
        setOpsData(data);
      } else if (activeSubTab === 'batch_release_rft') {
        const data = await getBatchReleaseAnalyticsData({ dateRange });
        setReleaseData(data);
      } else if (activeSubTab === 'recurrence_radar') {
        const data = await getRecurrenceRadarData({ dateRange });
        setRadarData(data);
      } else if (activeSubTab === 'management_review') {
        const data = await getManagementReviewDossierData(dossierPeriod);
        setDossierData(data);
      }
    } catch (err: any) {
      console.error('Failed to load Quality Intelligence data:', err);
      toast.error('ไม่สามารถโหลดข้อมูล Quality Intelligence ได้: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, dateRange, dossierPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const subTabs: { id: QualityIntelligenceSubTab; label: string; icon: any }[] = [
    { id: 'executive_cockpit', label: '1. Executive Cockpit', icon: ShieldAlert },
    { id: 'operations_intelligence', label: '2. Operations Intelligence', icon: BarChart3 },
    { id: 'batch_release_rft', label: '3. Batch Release & RFT', icon: ShieldCheck },
    { id: 'recurrence_radar', label: '4. Pattern & Recurrence Radar', icon: RefreshCw },
    { id: 'management_review', label: '5. Management Review Dossier', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. QUALITY INTELLIGENCE COMMAND BAR (Sub-Tabs & Freshness Controls)       */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Sub-tabs pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 border border-indigo-500'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Date Range & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-xs">
            <span className="text-slate-400 mr-1.5 hidden sm:inline">กรอบเวลา:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as QmsDateRangeFilter)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="30d">30 วันล่าสุด</option>
              <option value="90d">90 วันล่าสุด (Default)</option>
              <option value="180d">180 วันล่าสุด</option>
              <option value="365d">365 วันล่าสุด</option>
              <option value="all">ข้อมูลทั้งหมด</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-slate-800 hover:bg-slate-800 text-slate-200 gap-1.5 text-xs h-7"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ACTIVE SCREEN CONTENT WITH SMOOTH TRANSITION                            */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="text-sm">กำลังประมวลผลข้อมูล Intelligence แบบ Real-time...</span>
        </div>
      ) : (
        <>
          {activeSubTab === 'executive_cockpit' && cockpitData && (
            <ExecutiveCockpit
              data={cockpitData}
              aiNarrative={aiNarrative}
              onRefresh={loadData}
              onNavigateToTab={onNavigateToTab}
            />
          )}

          {activeSubTab === 'operations_intelligence' && opsData && (
            <QualityOperationsView data={opsData} onNavigateToTab={onNavigateToTab} />
          )}

          {activeSubTab === 'batch_release_rft' && releaseData && (
            <BatchReleaseRftView data={releaseData} onNavigateToTab={onNavigateToTab} />
          )}

          {activeSubTab === 'recurrence_radar' && radarData && (
            <RecurrenceRadarView
              data={radarData}
              selectedHorizon={dateRange}
              onHorizonChange={(h) => {
                setDateRange(h);
              }}
              onNavigateToTab={onNavigateToTab}
            />
          )}

          {activeSubTab === 'management_review' && dossierData && (
            <ManagementReviewStudio
              data={dossierData}
              periodType={dossierPeriod}
              onPeriodChange={(p) => setDossierPeriod(p)}
              onNavigateToTab={onNavigateToTab}
            />
          )}
        </>
      )}
    </div>
  );
}

export default QualityIntelligenceCenter;
