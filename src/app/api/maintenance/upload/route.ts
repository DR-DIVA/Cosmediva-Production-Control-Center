import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const contentType = request.headers.get('content-type') || ''

    let buffer: Buffer | null = null
    let fileName = ''
    let mimeType = 'image/jpeg'

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      mimeType = file.type || 'image/jpeg'
      const ext = file.name ? file.name.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg'
      fileName = `maint_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    } else {
      // JSON body with base64 data
      const body = await request.json().catch(() => ({}))
      const base64Data = body.base64 || body.dataUrl || ''
      if (!base64Data) {
        return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 })
      }

      // Check if it has data URL prefix: e.g. "data:image/jpeg;base64,..."
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        mimeType = matches[1]
        buffer = Buffer.from(matches[2], 'base64')
      } else {
        buffer = Buffer.from(base64Data, 'base64')
      }

      const ext = mimeType.split('/')[1] || 'jpg'
      fileName = `maint_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ success: false, error: 'File buffer is empty' }, { status: 400 })
    }

    // Upload to Supabase Storage bucket 'maintenance-media'
    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('maintenance-media')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadErr) {
      console.error('[MaintenanceUpload] Supabase Storage upload error:', uploadErr)
      return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('maintenance-media')
      .getPublicUrl(fileName)

    const publicUrl = urlData?.publicUrl || ''

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      size: buffer.length
    })
  } catch (err: any) {
    console.error('[MaintenanceUpload] Unexpected error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Upload failed' }, { status: 500 })
  }
}
