'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DCCRecordVault from '@/components/dcc/DCCRecordVault'
import DCCMasterVault from '@/components/dcc/DCCMasterVault'
import DCCBatchTraceability from '@/components/dcc/DCCBatchTraceability'
import DCCDarWorkflow from '@/components/dcc/DCCDarWorkflow'
import { DCCExecutedRecord, DCCMasterTemplate, DCCDarRequest } from '@/types/dcc'

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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
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
  )
}
