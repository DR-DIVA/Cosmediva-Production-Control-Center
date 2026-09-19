'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import DCCRecordVault from '@/components/dcc/DCCRecordVault'
import DCCMasterVault from '@/components/dcc/DCCMasterVault'
import DCCBatchTraceability from '@/components/dcc/DCCBatchTraceability'
import DCCDarWorkflow from '@/components/dcc/DCCDarWorkflow'
import { DCCExecutedRecord, DCCMasterTemplate, DCCDarRequest } from '@/types/dcc'
import { 
  Archive, 
  BookOpen, 
  Network, 
  FileEdit, 
  ArrowRight
} from 'lucide-react'

interface DCCTabsViewProps {
  records: DCCExecutedRecord[]
  templates: DCCMasterTemplate[]
  darRequests: DCCDarRequest[]
  initialTab?: string
  initialSearch?: string
}

export default function DCCTabsView({
  records,
  templates,
  darRequests,
  initialTab = 'records',
  initialSearch = ''
}: DCCTabsViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab || 'records')

  // Sync state if initialTab prop changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    // Update browser URL without triggering a slow full-page server re-render
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', val)
      window.history.replaceState(null, '', url.toString())
    }
  }

  const pendingDarCount = darRequests.filter(
    (r) => r.status !== 'APPROVED' && r.status !== 'REJECTED' && r.status !== 'EFFECTIVE'
  ).length

  const tabsConfig = [
    {
      id: 'records',
      number: '1',
      title: 'คลังบันทึกคุณภาพจริง',
      subtitleEn: 'Executed Records Vault',
      desc: 'บันทึกซ่อมบำรุง, BMR ผลิตจริง, COA ปล่อยผ่าน',
      icon: Archive,
      badge: `${records.length} บันทึก`,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      activeBadgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      tag: 'ALCOA+ Sealed'
    },
    {
      id: 'master',
      number: '2',
      title: 'คลังต้นฉบับ & DP 20 แผนก',
      subtitleEn: 'Master Template Vault',
      desc: 'พีระมิด 4 ระดับ (QM, DP, WI, แบบฟอร์มแม่แบบ)',
      icon: BookOpen,
      badge: `${templates.length} ฉบับ`,
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      activeBadgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      tag: 'Controlled Master'
    },
    {
      id: 'trace',
      number: '3',
      title: 'ตรวจสอบย้อนกลับ 360°',
      subtitleEn: 'Batch Traceability 360°',
      desc: 'สืบค้นย้อนกลับ Lot No., วัตถุดิบ, เครื่องจักรที่ใช้ผลิต',
      icon: Network,
      badge: 'Genealogy 360°',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      activeBadgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      tag: 'Audit Trail'
    },
    {
      id: 'dar',
      number: '4',
      title: 'ขอจัดทำ / แก้ไข DP/WI',
      subtitleEn: 'E-DAR Workflow Engine',
      desc: 'เวิร์กโฟลว์ขอจัดทำ ปรับปรุง หรือยกเลิกเอกสาร',
      icon: FileEdit,
      badge: `${pendingDarCount} รายการใน Flow`,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      activeBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      tag: 'Dynamic Approval'
    }
  ]

  return (
    <div className="w-full space-y-6">
      {/* 4 Prominent Navigation Tab Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {tabsConfig.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`group relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                isActive
                  ? 'bg-gradient-to-br from-stone-950 via-stone-900 to-[#2A231C] text-white border-[#D4AF37] shadow-lg shadow-[#D4AF37]/15 ring-2 ring-[#D4AF37]/20 translate-y-[-2px]'
                  : 'bg-white hover:bg-stone-50/90 text-stone-800 border-stone-200/90 hover:border-[#D4AF37]/60 shadow-xs hover:shadow-sm'
              }`}
            >
              {/* Active Indicator Top Glow bar */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37] rounded-t-2xl" />
              )}

              {/* Top Row: Icon + Badge */}
              <div className="flex items-center justify-between w-full mb-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-[#D4AF37] text-stone-950 shadow-md shadow-[#D4AF37]/30'
                      : 'bg-stone-100 text-stone-700 group-hover:bg-[#D4AF37]/15 group-hover:text-[#8B7355]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                    isActive ? tab.activeBadgeColor : tab.badgeColor
                  }`}
                >
                  {tab.badge}
                </span>
              </div>

              {/* Title & Descriptions */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                      isActive
                        ? 'bg-[#D4AF37] text-stone-950 font-bold'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {tab.number}
                  </span>
                  <h3
                    className={`font-black text-sm sm:text-base tracking-tight leading-snug ${
                      isActive ? 'text-white' : 'text-stone-900 group-hover:text-[#8B7355]'
                    }`}
                  >
                    {tab.title}
                  </h3>
                </div>

                <p
                  className={`text-[11px] font-bold tracking-wide uppercase ${
                    isActive ? 'text-[#D4AF37]' : 'text-stone-500'
                  }`}
                >
                  {tab.subtitleEn}
                </p>

                <p
                  className={`text-xs leading-relaxed line-clamp-2 ${
                    isActive ? 'text-stone-300' : 'text-stone-600'
                  }`}
                >
                  {tab.desc}
                </p>
              </div>

              {/* Bottom Footer Info */}
              <div
                className={`mt-4 pt-3 border-t flex items-center justify-between transition-colors ${
                  isActive ? 'border-stone-800' : 'border-stone-100'
                }`}
              >
                <span
                  className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
                    isActive ? 'text-[#D4AF37]' : 'text-stone-600'
                  }`}
                >
                  {tab.tag}
                </span>

                <div
                  className={`text-xs font-bold flex items-center gap-1 transition-transform group-hover:translate-x-1 ${
                    isActive
                      ? 'text-[#D4AF37]'
                      : 'text-stone-600 group-hover:text-stone-950'
                  }`}
                >
                  {isActive ? (
                    <span className="flex items-center gap-1.5 font-black text-[#D4AF37]">
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                      เปิดอยู่
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      เข้าใช้งาน
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabs Content View */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* TAB 1: EXECUTED RECORDS VAULT */}
        <TabsContent value="records" className="focus-visible:outline-none mt-0">
          <DCCRecordVault records={records} initialSearch={initialSearch} />
        </TabsContent>

        {/* TAB 2: MASTER TEMPLATES & DP */}
        <TabsContent value="master" className="focus-visible:outline-none mt-0">
          <DCCMasterVault templates={templates} />
        </TabsContent>

        {/* TAB 3: BATCH TRACEABILITY */}
        <TabsContent value="trace" className="focus-visible:outline-none mt-0">
          <DCCBatchTraceability />
        </TabsContent>

        {/* TAB 4: E-DAR WORKFLOW */}
        <TabsContent value="dar" className="focus-visible:outline-none mt-0">
          <DCCDarWorkflow requests={darRequests} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
