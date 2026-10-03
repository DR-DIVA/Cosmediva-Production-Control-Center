import React from 'react'
import { getPMPlanDCCDetails } from '@/app/actions/maintenance'
import DCCPMChecksheetStandalone from '@/components/maintenance/DCCPMChecksheetStandalone'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DCCPMChecksheetPage({ params }: Props) {
  const { id } = await params
  const res = await getPMPlanDCCDetails(id)

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-800">ไม่พบเอกสาร PM Check Sheet: {id}</h2>
        <p className="text-xs text-stone-500">กรุณาตรวจสอบรหัสแผน PM หรือรหัสเครื่องจักร</p>
        <Link
          href="/maintenance/pm"
          className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
        >
          กลับสู่ตารางแผน PM
        </Link>
      </div>
    )
  }

  return (
    <DCCPMChecksheetStandalone 
      plan={res.data} 
      latestExecution={(res as any).latestExecution} 
    />
  )
}
