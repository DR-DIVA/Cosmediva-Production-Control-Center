import { NextRequest, NextResponse } from 'next/server'
import { askMtexAI } from '@/app/actions/mtex-ai'

export async function GET() {
  return NextResponse.json({ status: 'MTEX AI API is active' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const question = body.question || body.query || ''
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ success: false, answer: 'กรุณาระบุคำถามที่ต้องการค้นหา' }, { status: 400 })
    }

    const result = await askMtexAI(question)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('API /api/mtex-ai error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'เกิดข้อผิดพลาดในการประมวลผล',
        answer: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อกับน้อง MTEX AI ชั่วคราว'
      },
      { status: 500 }
    )
  }
}
