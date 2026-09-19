import React from 'react'
import { 
  FolderArchive, ShieldCheck, FileCheck, Layers, Sparkles, 
  CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Search,
  Award, Building2
} from 'lucide-react'
import { 
  getDCCSummaryStats, 
  getDCCExecutedRecords, 
  getDCCMasterTemplates, 
  getDCCDarRequests 
} from '@/app/actions/dcc'
import DCCRecordVault from '@/components/dcc/DCCRecordVault'
import DCCMasterVault from '@/components/dcc/DCCMasterVault'
import DCCBatchTraceability from '@/components/dcc/DCCBatchTraceability'
import DCCDarWorkflow from '@/components/dcc/DCCDarWorkflow'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ tab?: string; q?: string }>
}

export default async function DCCCenterPage({ searchParams }: Props) {
  const { tab, q } = await searchParams
  const activeTab = tab || 'records'
  const initialSearch = q || ''

  const [stats, recordsRes, templatesRes, darRes] = await Promise.all([
    getDCCSummaryStats(),
    getDCCExecutedRecords(),
    getDCCMasterTemplates(),
    getDCCDarRequests()
  ])

  const records = recordsRes.data || []
  const templates = templatesRes.data || []
  const darRequests = darRes.data || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header Banner */}
      <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-[#D4AF37]/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#8B7355] text-[11px] font-black tracking-wide uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Integrated Digital eQMS / EDMS
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-stone-500 text-xs font-semibold">
                ISO 9001:2026 • ISO 22716 • ASEAN GMP • HALAL (HAS 23000)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950 flex items-center gap-2">
              <span>🏛️ CosmeFlow DCC</span>
              <span className="text-stone-400 font-normal text-lg hidden sm:inline">|</span>
              <span className="text-base sm:text-lg font-bold text-stone-700 font-sans hidden sm:inline">
                Document & Quality Record Center
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 max-w-3xl leading-relaxed">
              ศูนย์รวมคลังเอกสารและบันทึกคุณภาพดิจิทัลรวมของโรงงาน ครอบคลุม <b>5 สายงานหลัก (OMS, SM, NPD, QM, OPM) 20 แผนก</b> ขึ้นตรงต่อ <b>Plant Director (PDT)</b> เพื่อการสืบย้อนกลับที่สมบูรณ์แบบและการตรวจสอบระดับสากล
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-right">
              <span className="text-[10px] text-stone-500 block uppercase font-mono">Governing Authority</span>
              <span className="text-xs font-black text-stone-900">Plant Director (PDT)</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
              <span className="text-[10px] text-emerald-700 block uppercase font-mono">Data Integrity</span>
              <span className="text-xs font-black text-emerald-900">ALCOA+ Compliant</span>
            </div>
          </div>
        </div>

        {/* 5 Executive KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-stone-100">
          <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">เอกสารแม่แบบควบคุม</span>
            <div className="text-xl font-black text-stone-950 mt-0.5">{stats.totalControlledDocs} <span className="text-xs font-normal text-stone-500">ฉบับ</span></div>
            <span className="text-[10px] text-emerald-700 font-medium">Rev. ล่าสุด 100%</span>
          </div>

          <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">บันทึกคุณภาพจริง (Vault)</span>
            <div className="text-xl font-black text-stone-950 mt-0.5">{stats.totalExecutedRecords} <span className="text-xs font-normal text-stone-500">รายการ</span></div>
            <span className="text-[10px] text-emerald-700 font-medium">Auto-Archived & Sealed</span>
          </div>

          <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">โครงสร้างองค์กรโรงงาน</span>
            <div className="text-xl font-black text-stone-950 mt-0.5">20 <span className="text-xs font-normal text-stone-500">แผนก</span></div>
            <span className="text-[10px] text-[#8B7355] font-bold">5 สายงานขึ้นตรง PDT</span>
          </div>

          <div className="p-3 bg-stone-50/80 rounded-xl border border-stone-200">
            <span className="text-[10px] text-stone-500 font-bold block uppercase">คำขอ E-DAR ใน Flow</span>
            <div className="text-xl font-black text-stone-950 mt-0.5">{stats.activeDarCount} <span className="text-xs font-normal text-stone-500">เรื่อง</span></div>
            <span className="text-[10px] text-amber-700 font-medium">รอทบทวน/ตรวจรูปแบบ</span>
          </div>

          <div className="p-3 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-[#8B7355] font-bold block uppercase">Audit-Readiness</span>
            <div className="text-xl font-black text-stone-950 mt-0.5">99.2%</div>
            <span className="text-[10px] text-[#8B7355] font-bold">สืบค้นได้ใน 2 วินาที</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue={activeTab} className="w-full space-y-6">
        <TabsList className="bg-white p-1 rounded-xl border border-stone-200 shadow-xs flex flex-wrap gap-1 h-auto w-full justify-start">
          <TabsTrigger 
            value="records" 
            className="data-[state=active]:bg-stone-900 data-[state=active]:text-[#D4AF37] text-xs font-bold px-4 py-2.5 rounded-lg transition"
          >
            🗄️ 1. คลังบันทึกคุณภาพจริง (Executed Records Vault)
          </TabsTrigger>
          <TabsTrigger 
            value="master" 
            className="data-[state=active]:bg-stone-900 data-[state=active]:text-[#D4AF37] text-xs font-bold px-4 py-2.5 rounded-lg transition"
          >
            📁 2. คลังต้นฉบับ & DP (Master Template Vault)
          </TabsTrigger>
          <TabsTrigger 
            value="trace" 
            className="data-[state=active]:bg-stone-900 data-[state=active]:text-[#D4AF37] text-xs font-bold px-4 py-2.5 rounded-lg transition"
          >
            🔗 3. ตรวจสอบย้อนกลับ 360° (Batch Traceability)
          </TabsTrigger>
          <TabsTrigger 
            value="dar" 
            className="data-[state=active]:bg-stone-900 data-[state=active]:text-[#D4AF37] text-xs font-bold px-4 py-2.5 rounded-lg transition"
          >
            📝 4. ขอจัดทำ/แก้ไข DP/WI (E-DAR Flow)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: EXECUTED RECORDS VAULT */}
        <TabsContent value="records" className="focus-visible:outline-none">
          <DCCRecordVault records={records} initialSearch={initialSearch} />
        </TabsContent>

        {/* TAB 2: MASTER TEMPLATES & DP */}
        <TabsContent value="master" className="focus-visible:outline-none">
          <DCCMasterVault templates={templates} />
        </TabsContent>

        {/* TAB 3: BATCH TRACEABILITY */}
        <TabsContent value="trace" className="focus-visible:outline-none">
          <DCCBatchTraceability />
        </TabsContent>

        {/* TAB 4: E-DAR WORKFLOW */}
        <TabsContent value="dar" className="focus-visible:outline-none">
          <DCCDarWorkflow requests={darRequests} />
        </TabsContent>
      </Tabs>

    </div>
  )
}
