import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getLineChannelConfig } from '@/lib/lineService'

export async function GET() {
  return NextResponse.json({ status: 'CosmeDiva LINE Webhook Gateway is running' })
}

// Store last queried topic per group or user (in memory, valid for 15 minutes)
const conversationMemory = new Map<string, { topic: string; timestamp: number }>()

const MTEX_BOT_USER_ID = 'U4da573283b536e6e4b43448e33dd32da'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const events = body.events || []

    const supabase = createAdminClient()

    // Real-time debug audit log: Records incoming webhook payloads into Supabase
    if (events.length > 0) {
      try {
        await supabase.from('maintenance_chat_history').insert({
          sender_name: 'LINE_WEBHOOK_EVENT',
          message_text: `Events: ${events.map((e: any) => `${e.type}:${e.message?.type || ''}:${e.message?.text || ''}`).join(', ')}`,
          is_troubleshooting: false,
          raw_log: { events, timestamp: new Date().toISOString() }
        })
      } catch (logErr) {
        console.error('[LINE Webhook] Event audit error:', logErr)
      }
    }

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
          if (token) {
            await replyLineMessage(token, event.replyToken, groupId, [
              {
                type: 'text',
                text: `🤖 สวัสดีครับพี่ๆ ทีมงาน CosmeDiva ทุกท่าน!\nผมน้อง "MTEX Maintenance AI" ผู้ช่วยอัจฉริยะประจำฝ่ายซ่อมบำรุง ยินดีที่ได้เข้าร่วมกลุ่มครับ ⚙️✨\n\n🛠️ หน้าที่หลักของผม:\n🚨 แจ้งเตือนงานซ่อมด่วน (Breakdown Alert) ทันทีที่เครื่องจักรมีปัญหา\n📊 อัปเดตสถานะงานซ่อม การตัดเบิกอะไหล่ และตรวจรับงาน\n💡 ให้คำแนะนำการใช้งานระบบ CMMS และขั้นตอน SOP ทุกเมนู\n🔍 ค้นหาประวัติการซ่อมย้อนหลังและเช็คสต็อกอะไหล่\n\n💬 วิธีใช้งานง่ายๆ:\n• พิมพ์ถามงานช่างได้ตลอด เช่น "@MTEX เครื่อง Homo เคยซ่อมอะไรบ้าง" หรือ "@MTEX ขั้นตอนแจ้งซ่อมทำยังไง"\n\n⚡ MTEX - จบทุกงานซ่อม\nพร้อมดูแลเครื่องจักรและสนับสนุนการผลิตของ CosmeDiva เต็มที่ครับ ลุยไปด้วยกันครับ! 🚀💪`
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
        const destinationId = groupId || userId
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

            if (token) {
              await replyLineMessage(token, event.replyToken, destinationId, [
                {
                  type: 'text',
                  text: `📌 รหัสกลุ่มนี้คือ:\n${groupId}\n\n✅ ระบบ CosmeDiva บันทึกการเชื่อมต่อเรียบร้อยแล้ว พร้อมรับการแจ้งเตือนงานซ่อมและสอบถามน้อง MTEX ได้ทันทีครับ 🚀`
                }
              ])
            }
          } else if (userId && token) {
            await replyLineMessage(token, event.replyToken, destinationId, [
              {
                type: 'text',
                text: `📌 รหัส User ID ของคุณคือ:\n${userId}`
              }
            ])
          }
          continue
        }

        // Check LINE mention metadata
        const mentionees = (event.message as any)?.mention?.mentionees || []
        const isDirectlyTagged = mentionees.some((m: any) => m.isSelf || m.userId === MTEX_BOT_USER_ID)
        const hasMtexName = /(@\s*⚡?\s*mtex|@\s*น้อง\s*mtex|น้อง\s*mtex|\bmtex\b|@\s*บอท|\bบอท\b|⚡\s*mtex)/i.test(rawText)

        // Clean query text by removing bot mention prefixes
        const cleanQuery = rawText
          .replace(/@\s*⚡?\s*mtex(\s*maintenance\s*ai)?/gi, '')
          .replace(/@\s*น้อง\s*mtex/gi, '')
          .replace(/^น้อง\s*mtex[:\s]*/gi, '')
          .replace(/^mtex[:\s]*/gi, '')
          .replace(/@\s*บอท/gi, '')
          .trim()

        // 1. Social Greetings, Thanks & Conversational Words
        if (/^(ขอบคุณ|ขอบใจ|แต๊ง|thanks|thank you|thx|เยี่ยม|ยอดเยี่ยม|เก่งมาก|ดีมาก)/i.test(cleanQuery)) {
          if ((isPrivate || hasMtexName || isDirectlyTagged) && token) {
            await replyLineMessage(token, event.replyToken, destinationId, [
              {
                type: 'text',
                text: 'ยินดีเป็นอย่างยิ่งครับ! 😊 หากมีข้อสงสัยงานช่าง หรือต้องการสอบถามขั้นตอนการใช้งานระบบ CMMS สอบถามน้อง MTEX ได้ตลอดเลยนะครับ 🛠️🤖'
              }
            ])
            continue
          }
        }

        if (/^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi|hey|morning|มอนิ่ง)/i.test(cleanQuery)) {
          if ((isPrivate || hasMtexName || isDirectlyTagged) && token) {
            await replyLineMessage(token, event.replyToken, destinationId, [
              {
                type: 'text',
                text: 'สวัสดีครับ! ผมน้อง MTEX ผู้ช่วยช่างและระบบซ่อมบำรุงอัจฉริยะ CosmeDiva 🤖 มีอะไรให้ผมช่วยแนะนำวิธีใช้งานระบบ CMMS ค้นหาประวัติงานซ่อม หรือเช็คสต็อกอะไหล่ สอบถามได้เลยนะครับ 🛠️'
              }
            ])
            continue
          }
        }

        if (/^(โอเค|โอเช|ok|okay|รับทราบ|รับแซ่บ|เรียบร้อย|ได้ครับ|ได้ค่ะ|เข้าใจแล้ว)$/i.test(cleanQuery)) {
          if (isPrivate && token) {
            await replyLineMessage(token, event.replyToken, destinationId, [
              {
                type: 'text',
                text: 'รับทราบครับผม! พร้อมช่วยเหลือเสมอครับ 🤖👍'
              }
            ])
            continue
          }
        }

        if (/(ไม่ได้ให้ค้น|ไม่ใช่|ไม่ได้ถาม|ขอบคุณน้อง|ไม่ได้ให้หา)/i.test(cleanQuery)) {
          if (token) {
            await replyLineMessage(token, event.replyToken, destinationId, [
              {
                type: 'text',
                text: 'รับทราบและขออภัยด้วยครับผม! 🤖🙏 น้อง MTEX เข้าใจแล้วครับ มีข้อมูลงานซ่อมส่วนไหนที่อยากให้ช่วยค้นหา แจ้งรหัสเครื่องหรืออาการเสียได้เลยนะครับ 🛠️'
              }
            ])
            continue
          }
        }

        // Thai question indicators
        const isQuestion = 
          lowerText.includes('?') ||
          lowerText.includes('ไหม') ||
          lowerText.includes('มั้ย') ||
          lowerText.includes('หรือยัง') ||
          lowerText.includes('อะไร') ||
          lowerText.includes('เท่าไหร่') ||
          lowerText.includes('ยังไง') ||
          lowerText.includes('อย่างไร') ||
          lowerText.includes('ทำไม') ||
          lowerText.includes('ที่ไหน') ||
          lowerText.includes('ใคร') ||
          lowerText.startsWith('ถาม') ||
          lowerText.startsWith('สอบถาม') ||
          lowerText.startsWith('เช็ค') ||
          lowerText.startsWith('ค้นหา') ||
          lowerText.startsWith('ช่วย') ||
          lowerText.includes('ประวัติของ')

        // Maintenance & SOP domain keywords
        const isMaintenanceTopic = 
          /(แจ้งซ่อม|ใบสั่งซ่อม|ใบแจ้งซ่อม|วิธี|ขั้นตอน|ทำยังไง|ทำอย่างไร|ใช้ยังไง|ใช้ระบบ|เปิดใบ|ปิดงาน|ตรวจรับ|รับงาน|ตัดอะไหล่|มีอะไหล่|เบิกอะไหล่|เช็คสต็อก|ประวัติ|อาการเสีย|เครื่องเสีย|แอร์|ไฟดับ|ไฟตก|ปั๊ม|มอเตอร์|สายพาน|เซ็นเซอร์|ฮีตเตอร์|cmms|sop|sop\s*การ|kanban|qr|คิวอาร์)/i.test(rawText)

        const isExplicitAsk = /^(ถาม|สอบถาม|เช็ค|ค้นหา|ช่วยดู|ขอวิธี|ดูประวัติ|ประวัติ)/i.test(rawText.trim())

        // B. Check if message is a Note / Work log shared privately
        if (isPrivate && !isQuestion && token) {
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

              await replyLineMessage(token, event.replyToken, destinationId, [
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
        const contextKey = destinationId || 'default'
        const prevContext = conversationMemory.get(contextKey)
        const isContextActive = prevContext && (Date.now() - prevContext.timestamp < 15 * 60 * 1000)

        // If user simply responds with a year (e.g. "2026" or "ปี 2026") after a previous inquiry
        let queryToExecute = cleanQuery
        if (isYearOnly && isContextActive && prevContext) {
          queryToExecute = `${prevContext.topic} ${cleanQuery}`
        }

        // C. Handle MTEX AI Assistant Questions
        const isMtexTriggered = 
          isPrivate || 
          isDirectlyTagged || 
          hasMtexName || 
          isExplicitAsk || 
          (isMaintenanceTopic && (isQuestion || rawText.includes('ยังไง') || rawText.includes('อย่างไร'))) || 
          (isYearOnly && isContextActive)

        if (isMtexTriggered && token) {
          // If user just tagged the bot without asking anything
          if (queryToExecute.length < 2) {
            await replyLineMessage(token, event.replyToken, destinationId, [
              {
                type: 'text',
                text: '🤖 สวัสดีครับ! ผมน้อง "MTEX Maintenance AI" ผู้ช่วยอัจฉริยะประจำฝ่ายซ่อมบำรุง CosmeDiva ⚙️\n\nพี่ๆ สามารถพิมพ์ถามผมได้ทันทีเลยนะครับ เช่น:\n• "แจ้งซ่อมยังไงคะ"\n• "ขั้นตอนการตรวจรับงาน"\n• "ค้นหาประวัติเครื่อง Homo"\n• "มีอะไหล่สายพานไหม"\n• "วิธีสแกน QR Code หน้าเครื่อง"'
              }
            ])
            continue
          }

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

            await replyLineMessage(token, event.replyToken, destinationId, [replyMsg])
          } catch (aiErr) {
            console.error('[LINE Webhook] AI Answer error:', aiErr)
          }
          continue
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

/**
 * Sends a message via LINE Reply API first.
 * If the replyToken has expired or fails (e.g., due to AI processing latency),
 * automatically falls back to pushing directly to destinationId (groupId or userId).
 */
async function replyLineMessage(
  token: string,
  replyToken: string | undefined,
  destinationId: string | undefined,
  messages: any[]
) {
  let replied = false

  if (replyToken) {
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
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

      if (res.ok) {
        replied = true
      } else {
        const errText = await res.text()
        console.warn(`[LINE Webhook] Reply API failed (status ${res.status}): ${errText}`)
      }
    } catch (err) {
      console.warn('[LINE Webhook] Reply API exception:', err)
    }
  }

  // Fallback to push message if reply failed or replyToken was absent
  if (!replied && destinationId) {
    try {
      console.log(`[LINE Webhook] Falling back to push message for destination: ${destinationId}`)
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: destinationId,
          messages
        })
      })

      if (!res.ok) {
        const pushErr = await res.text()
        console.error(`[LINE Webhook] Push fallback failed (status ${res.status}): ${pushErr}`)
      } else {
        console.log('[LINE Webhook] Push fallback succeeded')
      }
    } catch (pushErr) {
      console.error('[LINE Webhook] Push fallback exception:', pushErr)
    }
  }
}
