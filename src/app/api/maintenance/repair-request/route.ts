import { NextRequest, NextResponse } from 'next/server'
import { createRepairRequest } from '@/app/actions/maintenance'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await createRepairRequest(body)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('API /api/maintenance/repair-request error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
