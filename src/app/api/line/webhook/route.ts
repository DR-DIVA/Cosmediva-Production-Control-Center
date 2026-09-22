import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getLineChannelConfig } from '@/lib/lineService'

export async function GET() {
  return NextResponse.json({ status: 'CosmeFlow LINE Webhook Gateway is running' })
}

// Store last queried topic per group or user (in memory, valid for 15 minutes)
const conversationMemory = new Map<string, { topic: string; timestamp: number }>()

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
                text: `🤖 สวัสดีครับพี่ๆ ทีมงาน CosmeDiva ทุกท่าน!\nผมน้อง "MTEX Maintenance AI" ผู้ช่วยอัจฉริยะประจำแผนกวิศวกรรมและซ่อมบำรุง ยินดีที่ได้เข้าร่วมกลุ่มครับ ⚙️✨\n\n🛠️ หน้าที่หลักของผม:\n🚨 แจ้งเตือนงานซ่อมด่วน (Breakdown Alert) ทันทีที่เครื่องจักรมีปัญหา\n📊 อัปเดตสถานะงานซ่อม การตัดเบิกอะไหล่ และตรวจรับงาน\n💡 ให้คำแนะนำการใช้งานระบบ CMMS และขั้นตอน SOP ทุกเมนู\n🔍 ค้นหาประวัติการซ่อมย้อนหลังและเช็คสต็อกอะไหล่\n\n💬 วิธีใช้งานง่ายๆ:\n• พิมพ์ถามงานช่างได้ตลอด เช่น "@MTEX เครื่อง Homo เคยซ่อมอะไรบ้าง" หรือ "@MTEX ขั้นตอนแจ้งซ่อมทำยังไง"\n• เช็กรหัสกลุ่ม พิมพ์ "id" หรือ "รหัสกลุ่ม"\n\nพร้อมดูแลเครื่องจักรและสนับสนุนการผลิตของ CosmeDiva เต็มที่ครับ ลุยไปด้วยกันครับ! 🚀💪`
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
                  text: `📌 รหัสกลุ่มนี้คือ:\n${groupId}\n\n✅ ระบบ CosmeDiva บันทึกการเชื่อมต่อเรียบร้อยแล้ว พร้อมรับการแจ้งเตือนงานซ่อมและสอบถามน้อง MTEX ได้ทันทีครับ 🚀`
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

        const cleanQuery = rawText
          .replace(/@mtex/gi, '')
          .replace(/^mtex[:\s]*/i, '')
          .trim()

        // 1. Social Greetings, Thanks & Conversational Words (do not search database)
        if (/^(ขอบคุณ|ขอบใจ|แต๊ง|thanks|thank you|thx|เยี่ยม|ยอดเยี่ยม|เก่งมาก|ดีมาก)/i.test(cleanQuery)) {
          if (token && event.replyToken) {
            await replyLineMessage(token, event.replyToken, [
              {
                type: 'text',
                text: 'ยินดีเป็นอย่างยิ่งครับ! 😊 หากมีข้อสงสัยงานช่าง หรือต้องการค้นหาประวัติเครื่องจักรตัวไหน สอบถามน้อง MTEX ได้ตลอดเลยนะครับ 🛠️🤖'
              }
            ])
          }
          continue
        }

        if (/^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi|hey|morning|มอนิ่ง)/i.test(cleanQuery)) {
          if (token && event.replyToken) {
            await replyLineMessage(token, event.replyToken, [
              {
                type: 'text',
                text: 'สวัสดีครับ! ผมน้อง MTEX ผู้ช่วยช่างอัจฉริยะ CosmeFlow 🤖 มีอะไรให้ผมช่วยค้นหาประวัติงานซ่อม อะไหล่ หรือเช็คอาการเครื่องจักร สอบถามได้เลยนะครับ 🛠️'
              }
            ])
          }
          continue
        }

        if (/^(โอเค|โอเช|ok|okay|รับทราบ|รับแซ่บ|เรียบร้อย|ได้ครับ|ได้ค่ะ|เข้าใจแล้ว)$/i.test(cleanQuery)) {
          if (isPrivate && token && event.replyToken) {
            await replyLineMessage(token, event.replyToken, [
              {
                type: 'text',
                text: 'รับทราบครับผม! พร้อมช่วยเหลือเสมอครับ 🤖👍'
              }
            ])
          }
          continue
        }

        if (/(ไม่ได้ให้ค้น|ไม่ใช่|ไม่ได้ถาม|ขอบคุณน้อง|ไม่ได้ให้หา)/i.test(cleanQuery)) {
          if (token && event.replyToken) {
            await replyLineMessage(token, event.replyToken, [
              {
                type: 'text',
                text: 'รับทราบและขออภัยด้วยครับผม! 🤖🙏 น้อง MTEX เข้าใจแล้วครับ มีข้อมูลงานซ่อมส่วนไหนที่อยากให้ช่วยค้นหา แจ้งรหัสเครื่องหรืออาการเสียได้เลยนะครับ 🛠️'
              }
            ])
          }
          continue
        }

        // B. Check if message is a Note / Work log shared privately
        const isQuestion = 
          lowerText.includes('?') ||
          lowerText.includes('ไหม') ||
          lowerText.includes('มั้ย') ||
          lowerText.includes('หรือยัง') ||
          lowerText.includes('อะไร') ||
          lowerText.includes('เท่าไหร่') ||
          lowerText.includes('ยังไง') ||
          lowerText.includes('อย่างไร') ||
          lowerText.startsWith('ถาม') ||
          lowerText.startsWith('สอบถาม') ||
          lowerText.startsWith('เช็ค') ||
          lowerText.startsWith('ค้นหา') ||
          lowerText.startsWith('ช่วย') ||
          lowerText.includes('ประวัติของ')

        // If in private 1-on-1 chat and not an explicit question, check if it's a shared note or work update
        if (isPrivate && !isQuestion && token && event.replyToken) {
          try {
            const { parseLineChatLog } = await import('@/app/actions/mtex-ai')
            const noteParsed = await parseLineChatLog(rawText)
            const item = noteParsed[0]
            const isValidMachine = item?.machine_code && item.machine_code !== 'MTEX'
            const hasDatePrefix = /^\d{1,2}[\/\.\-]\d{1,2}/.test(rawText.trim())
            const isCasualText = /^(ขอบคุณ|สวัสดี|โอเค|คือ|ทำไม|อะไร|ไม่ใช่|จ้า)/i.test(rawText.trim())

            // A shared note MUST have an explicit note keyword, date prefix, or be a multiline/detailed log (>= 35 chars with newline)
            const isExplicitNote = hasDatePrefix || /^(โน้ต|บันทึก|แจ้งซ่อม|รายงาน|บันทึกงาน|note[:\s])/i.test(rawText.trim())
            const isLongDetailedNote = rawText.includes('\n') && rawText.length >= 35

            if (!isCasualText && (isExplicitNote || isLongDetailedNote)) {
              await supabase.from('maintenance_chat_history').insert({
                sender_name: item?.sender_name || 'แชร์โน้ตส่วนตัว',
                message_text: rawText,
                machine_code: isValidMachine ? item.machine_code : null,
                is_troubleshooting: true,
                raw_log: { userId, source: 'line_private_note_share' }
              })

              await replyLineMessage(token, event.replyToken, [
                {
                  type: 'text',
                  text: `✅ น้อง MTEX บันทึกเข้าคลังความรู้เรียบร้อยแล้วครับ!\n\n` +
                        `⚙️ เครื่องจักร: ${isValidMachine ? item.machine_code : 'ทั่วไป / ตามเนื้อหา'}\n` +
                        `👤 ผู้บันทึก: ${item?.sender_name || 'ช่างซ่อมบำรุง'}\n` +
                        (item?.chat_date ? `📅 วันที่: ${item.chat_date}\n` : '') +
                        `📝 ข้อความ: ${rawText.length > 70 ? rawText.slice(0, 70) + '...' : rawText}\n\n` +
                        `💡 บันทึกเข้าสมองน้อง MTEX แล้ว ช่างสามารถสอบถามประวัตินี้ได้ตลอดเวลาครับ 🤖`
                }
              ])
              continue
            }
          } catch (shareErr) {
            console.error('[LINE Webhook] Note share error:', shareErr)
          }
        }

        const isYearOnly = /^(ปี\s*)?(201[9]|202[0-6]|256[2-9])$/.test(cleanQuery)
        const contextKey = groupId || userId || 'default'
        const prevContext = conversationMemory.get(contextKey)
        const isContextActive = prevContext && (Date.now() - prevContext.timestamp < 15 * 60 * 1000)

        // If user simply responds with a year (e.g. "2026" or "ปี 2026") after a previous inquiry
        let queryToExecute = cleanQuery
        if (isYearOnly && isContextActive && prevContext) {
          queryToExecute = `${prevContext.topic} ${cleanQuery}`
        }

        // C. Handle MTEX AI Assistant Questions
        const isMentioned = lowerText.includes('@mtex') || 
                            lowerText.startsWith('mtex') || 
                            lowerText.startsWith('ถาม') || 
                            lowerText.startsWith('สอบถาม') || 
                            lowerText.startsWith('ประวัติ') ||
                            (isYearOnly && isContextActive) ||
                            isPrivate

        if (isMentioned && token && event.replyToken) {
          if (queryToExecute.length >= 2) {
            try {
              // Call MTEX AI
              const { askMtexAI } = await import('@/app/actions/mtex-ai')
              const aiRes = await askMtexAI(queryToExecute)

              // Save query context for subsequent year follow-up
              if (aiRes.detectedKeyword && !aiRes.isFilteredByYear) {
                conversationMemory.set(contextKey, { topic: aiRes.detectedKeyword, timestamp: Date.now() })
              }

              // Build reply message with Quick Reply buttons for years
              const replyMsg: any = {
                type: 'text',
                text: aiRes.answer
              }

              if (aiRes.yearsAvailable && aiRes.yearsAvailable.length > 1 && !aiRes.isFilteredByYear) {
                const baseTopic = aiRes.detectedKeyword || cleanQuery
                replyMsg.quickReply = {
                  items: aiRes.yearsAvailable.slice(0, 10).map((y: string) => ({
                    type: 'action',
                    action: {
                      type: 'message',
                      label: `📅 ปี ${y}`,
                      text: `${baseTopic} ${y}`
                    }
                  }))
                }
              }

              await replyLineMessage(token, event.replyToken, [replyMsg])
            } catch (aiErr) {
              console.error('[LINE Webhook] AI Answer error:', aiErr)
            }
            continue
          }
        }

        // D. Continuous Real-time Learning: Auto-log technician messages in group chat into maintenance_chat_history
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
