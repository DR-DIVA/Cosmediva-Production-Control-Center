import React from 'react'
import { getWorkOrderDCCDetails } from '@/app/actions/maintenance'
import DCCWorkOrderEForm from '@/components/maintenance/DCCWorkOrderEForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DCCWorkOrderPage({ params }: Props) {
  const { id } = await params
  const res = await getWorkOrderDCCDetails(id)

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-800">ไม่พบเอกสารใบสั่งซ่อม {id}</h2>
        <p className="text-xs text-stone-500">กรุณาตรวจสอบเลขที่ใบสั่งงานหรือกลับสู่หน้ารายการงานซ่อม</p>
        <Link
          href="/maintenance/work-orders"
          className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
        >
          กลับสู่บอร์ดงานซ่อม
        </Link>
      </div>
    )
  }

  return <DCCWorkOrderEForm workOrder={res.data} />
}
