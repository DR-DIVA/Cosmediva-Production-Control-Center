import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getLineChannelConfig } from '@/lib/lineService'

export async function GET() {
  return NextResponse.json({ status: 'CosmeFlow LINE Webhook Gateway is running' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const events = body.events || []

    const supabase = createAdminClient()
    const config = await getLineChannelConfig('maintenance')
    const token = config?.channel_access_token

    for (const event of events) {
      // 1. When Bot is invited / joins a group or room
      if (event.type === 'join') {
        const groupId = event.source?.groupId || event.source?.roomId
        if (groupId) {
          console.log('[LINE Webhook] Bot joined group:', groupId)

          // Auto-save destination_id to maintenance channel
          await supabase
            .from('line_notification_channels')
            .update({
              destination_id: groupId,
              updated_at: new Date().toISOString()
            })
            .eq('channel_key', 'maintenance')

          // Reply in group to confirm
          if (event.replyToken && token) {
            await replyLineMessage(token, event.replyToken, [
              {
                type: 'text',
                text: `🎉 สวัสดีครับทีมงาน CosmeFlow!\nบอทแจ้งเตือนงานซ่อมบำรุงเชื่อมต่อกับกลุ่มนี้เรียบร้อยแล้วครับ\n\n📌 Group ID: ${groupId}\n(ระบบบันทึกรหัสกลุ่มนี้ให้อัตโนมัติ พร้อมรับการแจ้งเตือนงานซ่อมและเครื่องจักรทันทีครับ 🚀)`
              }
            ])
          }
        }
      }

      // 2. When someone sends a text message
      if (event.type === 'message' && event.message?.type === 'text') {
        const rawText = (event.message.text || '').trim()
        const lowerText = rawText.toLowerCase()
        const groupId = event.source?.groupId || event.source?.roomId
        const userId = event.source?.userId
        const isPrivate = event.source?.type === 'user' && !groupId

        // A. Handle /id or groupid
        if (lowerText === '/id' || lowerText === 'id' || lowerText === 'groupid' || lowerText === 'ขอ id' || lowerText === 'รหัสกลุ่ม') {
          if (groupId) {
            await supabase
              .from('line_notification_channels')
              .update({
                destination_id: groupId,
                updated_at: new Date().toISOString()
              })
              .eq('channel_key', 'maintenance')

            if (event.replyToken && token) {
              await replyLineMessage(token, event.replyToken, [
                {
                  type: 'text',
                  text: `📌 รหัสกลุ่มนี้คือ:\n${groupId}\n\n✅ ระบบได้บันทึกเข้า CosmeFlow เรียบร้อยแล้วครับ!`
                }
              ])
            }
          } else if (userId && event.replyToken && token) {
            await replyLineMessage(token, event.replyToken, [
              {
                type: 'text',
                text: `📌 รหัส User ID ของคุณคือ:\n${userId}`
              }
            ])
          }
          continue
        }

        // B. Handle MTEX AI Assistant Questions
        const isMentioned = lowerText.includes('@mtex') || 
                            lowerText.startsWith('mtex') || 
                            lowerText.startsWith('ถาม') || 
                            lowerText.startsWith('สอบถาม') || 
                            lowerText.startsWith('ประวัติ') ||
                            isPrivate

        if (isMentioned && token && event.replyToken) {
          // Clean search query
          const cleanQuery = rawText
            .replace(/@mtex/gi, '')
            .replace(/^mtex[:\s]*/i, '')
            .trim()

          if (cleanQuery.length >= 2) {
            try {
              // Call MTEX AI
              const { askMtexAI } = await import('@/app/actions/mtex-ai')
              const aiRes = await askMtexAI(cleanQuery)

              await replyLineMessage(token, event.replyToken, [
                {
                  type: 'text',
                  text: aiRes.answer
                }
              ])
            } catch (aiErr) {
              console.error('[LINE Webhook] AI Answer error:', aiErr)
            }
            continue
          }
        }

        // C. Continuous Real-time Learning: Auto-log technician messages into maintenance_chat_history
        if (rawText.length >= 8 && !rawText.startsWith('/')) {
          try {
            const { parseLineChatLog } = await import('@/app/actions/mtex-ai')
            const singleParsed = await parseLineChatLog(`${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\t${userId || 'LineMember'}\t${rawText}`)
            if (singleParsed.length > 0 && (singleParsed[0].is_troubleshooting || singleParsed[0].machine_code)) {
              await supabase.from('maintenance_chat_history').insert({
                sender_name: userId || 'LineMember',
                message_text: rawText,
                machine_code: singleParsed[0].machine_code || null,
                is_troubleshooting: true,
                raw_log: { groupId, userId, source: 'realtime_webhook' }
              })
            }
          } catch (logErr) {
            console.error('[LINE Webhook] Realtime log error:', logErr)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[LINE Webhook] Error processing webhook:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 200 }) // Return 200 so LINE doesn't retry
  }
}

async function replyLineMessage(token: string, replyToken: string, messages: any[]) {
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        replyToken,
        messages
      })
    })
  } catch (err) {
    console.error('[LINE Webhook] Reply error:', err)
  }
}
