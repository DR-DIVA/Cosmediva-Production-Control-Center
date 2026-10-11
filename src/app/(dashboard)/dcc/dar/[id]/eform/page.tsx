import React from 'react'
import Link from 'next/link'
import { getDCCDarRequestById } from '@/app/actions/dcc'
import DCCDarEFormView from '@/components/dcc/DCCDarEFormView'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DCCDarEFormPage({ params }: Props) {
  const { id } = await params
  const res = await getDCCDarRequestById(id)

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-800">ไม่พบเอกสารใบคำขอ DAR {id}</h2>
        <p className="text-xs text-stone-500">กรุณาตรวจสอบเลขที่คำขอหรือกลับสู่หน้ารายการ E-DAR</p>
        <Link
          href="/dcc"
          className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
        >
          กลับสู่ศูนย์ DCC
        </Link>
      </div>
    )
  }

  return <DCCDarEFormView dar={res.data} />
}
