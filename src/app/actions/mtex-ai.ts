'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface ParsedLineChatMessage {
  chat_date: string | null
  sender_name: string
  message_text: string
  machine_code?: string | null
  is_troubleshooting: boolean
}

/**
 * Common regex for detecting machine codes in factory:
 * E.g., MX-01, FL-02, TB-03, CP-04, PK-01, PM-02, TC-01, CT-02
 * Also catches names like Homo mix 4, Homo 4, Mixer 2, Tank 1
 */
const MACHINE_CODE_REGEX = /\b(Homo\s*mix\s*\d+|Homo[-_]?\d+|Mixer[-_]?\d+|Tank[-_]?\d+|[A-Z]{2,6}[-_]?[A-Z0-9]{1,10})\b/i

/**
 * Clean machine code extractor (excludes bot name and system keywords)
 */
function extractMachineCode(text: string): string | null {
  const m = text.match(MACHINE_CODE_REGEX)
  if (!m) return null
  const code = m[1].toUpperCase()
  if (['MTEX', 'LINE', 'TRUE', 'FALSE', 'NULL', 'ERROR', 'CHAT', 'POST', 'HTTP', 'HTTPS'].includes(code)) return null
  return code
}

/**
 * Common Thai maintenance keywords
 */
const TROUBLESHOOTING_KEYWORDS = [
  'ซ่อม', 'เสีย', 'พัง', 'ดับ', 'หยุด', 'รั่ว', 'ร้อน', 'ไหม้', 'หลวม', 'ขาด', 'แตก',
  'ไม่ติด', 'ไม่หมุน', 'ไม่ดูด', 'ไม่ร้อน', 'เออเร่อ', 'error', 'alarm', 'ลูกปืน',
  'สายพาน', 'เซนเซอร์', 'sensor', 'ฮีตเตอร์', 'heater', 'มอเตอร์', 'motor', 'ปั๊ม',
  'โซลินอยด์', 'solenoid', 'รีเลย์', 'relay', 'วาล์ว', 'valve', 'อะไหล่', 'part', 'เบิก', 'เปลี่ยน',
  'ประกอบ', 'ทดสอบ', 'ส่งซ่อม', 'คืนเครื่อง', 'ใบพัด', 'ใบกวน', 'ซีล', 'แอร์', 'เครื่องปั่น'
]

/**
 * Smart Date Parser for various Thai / LINE formats
 */
function parseToIsoDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString()
  
  const trimmed = dateStr.trim()
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d.toISOString()

  // Match DD/MM/YY or DD/MM/YYYY
  const m1 = trimmed.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/)
  if (m1) {
    const day = parseInt(m1[1], 10)
    const month = parseInt(m1[2], 10) - 1
    let year = parseInt(m1[3], 10)
    if (year < 100) year += 2000
    else if (year > 2500) year -= 543
    const dateObj = new Date(year, month, day, 12, 0, 0)
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString()
  }

  // Match YYYY/MM/DD
  const m2 = trimmed.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/)
  if (m2) {
    let year = parseInt(m2[1], 10)
    if (year > 2500) year -= 543
    const month = parseInt(m2[2], 10) - 1
    const day = parseInt(m2[3], 10)
    const dateObj = new Date(year, month, day, 12, 0, 0)
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString()
  }

  return new Date().toISOString()
}

/**
 * Format timestamp / rawLog to readable Thai date format (e.g. 15/09/2026 09:48)
 */
function formatDisplayDate(chatDate?: string | null, rawLog?: any, createdAt?: string | null): string {
  if (rawLog && typeof rawLog === 'object') {
    if (typeof rawLog.dateStr === 'string' && rawLog.dateStr.trim()) {
      const m = rawLog.dateStr.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})(?:T|\s+)(\d{1,2}:\d{2})?/)
      if (m) {
        const timePart = m[4] ? ` ${m[4]}` : ''
        return `${m[3].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[1]}${timePart}`
      }
    }
    if (typeof rawLog.originalDate === 'string' && rawLog.originalDate.trim()) {
      const orig = rawLog.originalDate.trim()
      const mOrig = orig.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/)
      if (mOrig) {
        const timePart = mOrig[4] ? ` ${mOrig[4]}` : ''
        return `${mOrig[3].padStart(2, '0')}/${mOrig[2].padStart(2, '0')}/${mOrig[1]}${timePart}`
      }
      return orig
    }
  }

  if (chatDate) {
    try {
      const d = new Date(chatDate)
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        const hours = String(d.getHours()).padStart(2, '0')
        const mins = String(d.getMinutes()).padStart(2, '0')
        const timePart = (hours !== '00' || mins !== '00') ? ` ${hours}:${mins}` : ''
        return `${day}/${month}/${year}${timePart}`
      }
    } catch {
      // ignore
    }
  }

  return ''
}

/**
 * Smart Parser for exported LINE chat text files (.txt) and Group Notes
 */
export async function parseLineChatLog(rawContent: string): Promise<ParsedLineChatMessage[]> {
  const lines = rawContent.split(/\r?\n/)
  const results: ParsedLineChatMessage[] = []

  let currentDate: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Detect date header line: e.g. "2026/09/20(Sun)" or "2026.09.20" or "Sunday, September 20, 2026"
    const dateMatch = line.match(/^(\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2})/) || line.match(/^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})/)
    if (dateMatch && !line.includes('\t') && !line.includes(':')) {
      currentDate = dateMatch[1].replace(/\./g, '/').replace(/-/g, '/')
      continue
    }

    // LINE format 1 (Tab separated: [Time]\t[Sender]\t[Message])
    // e.g. "14:20	ช่างสุรเชษฐ์	เครื่องซีลสายพานความร้อนไม่ขึ้น"
    const tabParts = line.split('\t')
    if (tabParts.length >= 3) {
      const timeStr = tabParts[0].trim()
      const sender = tabParts[1].trim()
      const message = tabParts.slice(2).join(' ').trim()

      if (shouldIgnoreMessage(message)) continue

      const mcMatch = message.match(MACHINE_CODE_REGEX)
      const isTrouble = TROUBLESHOOTING_KEYWORDS.some(k => message.toLowerCase().includes(k))

      results.push({
        chat_date: currentDate ? `${currentDate} ${timeStr}` : timeStr,
        sender_name: sender,
        message_text: message,
        machine_code: mcMatch ? mcMatch[1].toUpperCase() : null,
        is_troubleshooting: isTrouble
      })
      continue
    }

    // LINE format 2 (Colon or Space separated: e.g. "14:20 ช่างสุรเชษฐ์: เครื่องซีล...")
    const spaceMatch = line.match(/^(\d{1,2}:\d{2})\s+([^:\s]+)[:\s]+(.+)$/)
    if (spaceMatch) {
      const timeStr = spaceMatch[1]
      const sender = spaceMatch[2]
      const message = spaceMatch[3].trim()

      if (shouldIgnoreMessage(message)) continue

      const mcMatch = message.match(MACHINE_CODE_REGEX)
      const isTrouble = TROUBLESHOOTING_KEYWORDS.some(k => message.toLowerCase().includes(k))

      results.push({
        chat_date: currentDate ? `${currentDate} ${timeStr}` : timeStr,
        sender_name: sender,
        message_text: message,
        machine_code: mcMatch ? mcMatch[1].toUpperCase() : null,
        is_troubleshooting: isTrouble
      })
      continue
    }

    // LINE format 3 (Note group format with Date at beginning: e.g. "17/08/26 ช่างกิตติพงษ์ นำเครื่องปั่น Homo mix 4 มาคืนกำลังประกอบเพื่อทดสอบครับ")
    const noteDateMatch = line.match(/^(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})\s+(.+)$/)
    if (noteDateMatch) {
      const dateStr = noteDateMatch[1]
      const rest = noteDateMatch[2].trim()

      if (shouldIgnoreMessage(rest)) continue

      let sender = 'โน้ตกลุ่ม LINE'
      let message = rest

      const senderMatch = rest.match(/^([^\s:]{2,25})[:\s]+(.+)$/)
      if (senderMatch && (senderMatch[1].startsWith('ช่าง') || senderMatch[1].includes('เกาเหลา') || senderMatch[1].length <= 15)) {
        sender = senderMatch[1]
        message = senderMatch[2]
      }

      const mcMatch = (message + ' ' + rest).match(MACHINE_CODE_REGEX)
      const isTrouble = TROUBLESHOOTING_KEYWORDS.some(k => (message + ' ' + rest).toLowerCase().includes(k))

      results.push({
        chat_date: dateStr,
        sender_name: sender,
        message_text: rest,
        machine_code: mcMatch ? mcMatch[1].toUpperCase() : null,
        is_troubleshooting: isTrouble
      })
      continue
    }

    // LINE format 4 (Freeform note line containing maintenance keywords or machine code)
    if (line.length >= 6) {
      const isTrouble = TROUBLESHOOTING_KEYWORDS.some(k => line.toLowerCase().includes(k))
      const mcMatch = line.match(MACHINE_CODE_REGEX)

      if (isTrouble || mcMatch) {
        results.push({
          chat_date: currentDate || new Date().toISOString().split('T')[0],
          sender_name: 'โน้ตกลุ่ม LINE',
          message_text: line,
          machine_code: mcMatch ? mcMatch[1].toUpperCase() : null,
          is_troubleshooting: isTrouble
        })
      }
    }
  }

  return results
}

function shouldIgnoreMessage(text: string): boolean {
  const t = text.trim()
  return (
    t === '[Sticker]' ||
    t === '[Photo]' ||
    t === '[Video]' ||
    t === '[File]' ||
    t === '[Call]' ||
    t.includes('unsent a message') ||
    t.includes('ยกเลิกข้อความ') ||
    t.length < 2
  )
}

/**
 * Import LINE chat log into maintenance_chat_history database
 */
export async function importLineChatHistory(rawText: string): Promise<{
  success: boolean
  totalParsed: number
  troubleshootingCount: number
  insertedCount: number
  error?: string
}> {
  try {
    const parsed = await parseLineChatLog(rawText)
    if (parsed.length === 0) {
      return {
        success: false,
        totalParsed: 0,
        troubleshootingCount: 0,
        insertedCount: 0,
        error: 'ไม่พบข้อความที่สามารถอ่านรูปแบบ LINE Chat หรือโน้ตงานซ่อมได้ กรุณาตรวจสอบไฟล์หรือข้อความที่วาง'
      }
    }

    const supabase = createAdminClient()

    // Filter relevant messages (troubleshooting or mentions machines or has meaningful length)
    const recordsToInsert = parsed
      .filter(p => p.is_troubleshooting || p.machine_code || p.message_text.length >= 8)
      .map(p => ({
        chat_date: parseToIsoDate(p.chat_date),
        sender_name: p.sender_name,
        message_text: p.message_text,
        machine_code: p.machine_code || null,
        is_troubleshooting: p.is_troubleshooting,
        raw_log: { originalDate: p.chat_date, source: p.sender_name === 'โน้ตกลุ่ม LINE' ? 'line_note' : 'line_chat' }
      }))

    if (recordsToInsert.length > 0) {
      // Chunk insertions by 100 to avoid payload limits
      const chunkSize = 100
      for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
        const chunk = recordsToInsert.slice(i, i + chunkSize)
        const { error } = await supabase.from('maintenance_chat_history').insert(chunk)
        if (error) {
          console.error('Error inserting chat chunk:', error)
          return {
            success: false,
            totalParsed: parsed.length,
            troubleshootingCount: parsed.filter(p => p.is_troubleshooting).length,
            insertedCount: i,
            error: error.message
          }
        }
      }
    }

    revalidatePath('/maintenance/search')
    return {
      success: true,
      totalParsed: parsed.length,
      troubleshootingCount: parsed.filter(p => p.is_troubleshooting).length,
      insertedCount: recordsToInsert.length
    }
  } catch (err: any) {
    console.error('Unexpected error in importLineChatHistory:', err)
    return {
      success: false,
      totalParsed: 0,
      troubleshootingCount: 0,
      insertedCount: 0,
      error: err.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์'
    }
  }
}

/**
 * Get statistics of MTEX Knowledge Base
 */
export async function getMtexKnowledgeStats(): Promise<{
  chatCount: number
  workOrderCount: number
  machineCount: number
  sparePartCount: number
  recentChats: any[]
}> {
  try {
    const supabase = createAdminClient()
    const [
      { count: chatCount },
      { count: woCount },
      { count: machineCount },
      { count: partCount },
      { data: recentChats }
    ] = await Promise.all([
      supabase.from('maintenance_chat_history').select('*', { count: 'exact', head: true }),
      supabase.from('maintenance_work_orders').select('*', { count: 'exact', head: true }),
      supabase.from('maintenance_machines').select('*', { count: 'exact', head: true }),
      supabase.from('maintenance_spare_parts').select('*', { count: 'exact', head: true }),
      supabase.from('maintenance_chat_history').select('*').order('created_at', { ascending: false }).limit(10)
    ])

    return {
      chatCount: chatCount || 0,
      workOrderCount: woCount || 0,
      machineCount: machineCount || 0,
      sparePartCount: partCount || 0,
      recentChats: recentChats || []
    }
  } catch (err) {
    console.error('Error getting knowledge stats:', err)
    return {
      chatCount: 0,
      workOrderCount: 0,
      machineCount: 0,
      sparePartCount: 0,
      recentChats: []
    }
  }
}

/**
 * Clear all imported chat history
 */
export async function clearMtexChatHistory(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('maintenance_chat_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return { success: false, error: error.message }
    revalidatePath('/maintenance/search')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Core MTEX AI Assistant: Searches knowledge & answers technician questions
 */
export async function askMtexAI(question: string): Promise<{
  success: boolean
  answer: string
  sources?: {
    workOrders?: any[]
    chatHistory?: any[]
    machines?: any[]
    parts?: any[]
  }
  error?: string
}> {
  try {
    const q = question.trim()
    if (!q) return { success: false, answer: 'กรุณาระบุคำถาม เช่น "เครื่องผสม MX-02 เคยเสียอะไร?" หรือ "เช็กสต็อกสายพาน"' }

    const cleanQ = q.replace(/^[@\s]*mtex[:\s]*/i, '').trim()

    // 0. Intercept common conversational / social words (do not search database)
    if (/^(ขอบคุณ|ขอบใจ|แต๊ง|thanks|thank you|thx|เยี่ยม|ยอดเยี่ยม|เก่งมาก|ดีมาก)/i.test(cleanQ)) {
      return {
        success: true,
        answer: 'ยินดีเป็นอย่างยิ่งครับ! 😊 หากมีข้อสงสัยงานช่าง หรือต้องการค้นหาประวัติเครื่องจักรตัวไหน สอบถามน้อง MTEX ได้ตลอดเลยนะครับ 🛠️🤖'
      }
    }

    if (/^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi|hey|morning|มอนิ่ง)/i.test(cleanQ)) {
      return {
        success: true,
        answer: 'สวัสดีครับ! ผมน้อง MTEX ผู้ช่วยช่างอัจฉริยะ CosmeFlow 🤖 มีอะไรให้ผมช่วยค้นหาประวัติงานซ่อม อะไหล่ หรือเช็คอาการเครื่องจักร สอบถามได้เลยนะครับ 🛠️'
      }
    }

    if (/^(โอเค|โอเช|ok|okay|รับทราบ|รับแซ่บ|เรียบร้อย|ได้ครับ|ได้ค่ะ|เข้าใจแล้ว)$/i.test(cleanQ)) {
      return {
        success: true,
        answer: 'รับทราบครับผม! พร้อมช่วยเหลือเสมอครับ 🤖👍'
      }
    }

    if (/(ไม่ได้ให้ค้น|ไม่ใช่|ไม่ได้ถาม|ขอบคุณน้อง|ไม่ได้ให้หา)/i.test(cleanQ)) {
      return {
        success: true,
        answer: 'รับทราบและขออภัยด้วยครับผม! 🤖🙏 มีข้อมูลงานซ่อมส่วนไหนที่อยากให้น้อง MTEX ช่วยค้นหา แจ้งรหัสเครื่องหรืออาการเสียได้เลยนะครับ 🛠️'
      }
    }

    const supabase = createAdminClient()

    // 1. Extract potential machine code or keywords
    const detectedMachine = extractMachineCode(cleanQ)

    // 2. Query Work Orders
    let woQuery = supabase
      .from('maintenance_work_orders')
      .select('wo_number, machine_code, machine_name, problem_description, root_cause, action_taken, status, created_at, priority')
      .order('created_at', { ascending: false })
      .limit(6)

    if (detectedMachine) {
      woQuery = woQuery.or(`machine_code.ilike.%${detectedMachine}%,problem_description.ilike.%${detectedMachine}%`)
    } else {
      woQuery = woQuery.or(`problem_description.ilike.%${q}%,root_cause.ilike.%${q}%,action_taken.ilike.%${q}%,machine_code.ilike.%${q}%`)
    }
    const { data: matchedWOs } = await woQuery

    // 3. Query Chat History (multi-year support)
    const yearMatch = cleanQ.match(/\b(201[9]|202[0-6]|256[2-9])\b/)
    let filterYear: number | null = null
    if (yearMatch) {
      let y = parseInt(yearMatch[1], 10)
      if (y > 2500) y -= 543
      filterYear = y
    }

    let chatQuery = supabase
      .from('maintenance_chat_history')
      .select('sender_name, message_text, machine_code, chat_date, raw_log, created_at')
      .order('chat_date', { ascending: false, nullsFirst: false })
      .limit(filterYear ? 30 : 60)

    if (detectedMachine) {
      chatQuery = chatQuery.or(`machine_code.ilike.%${detectedMachine}%,message_text.ilike.%${detectedMachine}%`)
    } else {
      chatQuery = chatQuery.ilike('message_text', `%${q}%`)
    }

    if (filterYear) {
      chatQuery = chatQuery
        .gte('chat_date', `${filterYear}-01-01T00:00:00Z`)
        .lte('chat_date', `${filterYear}-12-31T23:59:59Z`)
    }

    const { data: rawMatchedChats } = await chatQuery

    // Deduplicate chats by text similarity
    const seenMsgs = new Set<string>()
    const uniqueChats = (rawMatchedChats || []).filter(c => {
      const key = c.message_text.trim().slice(0, 45)
      if (seenMsgs.has(key)) return false
      seenMsgs.add(key)
      return true
    })

    // Multi-year distribution: balance results across different years
    let matchedChats: any[] = []
    if (filterYear) {
      matchedChats = uniqueChats.slice(0, 6)
    } else {
      const yearGroups: Record<string, any[]> = {}
      uniqueChats.forEach(c => {
        const y = c.chat_date ? new Date(c.chat_date).getFullYear().toString() : 'อื่นๆ'
        if (!yearGroups[y]) yearGroups[y] = []
        yearGroups[y].push(c)
      })

      const yearsSorted = Object.keys(yearGroups).sort((a, b) => Number(b) - Number(a))
      const balanced: any[] = []
      for (const y of yearsSorted) {
        balanced.push(...yearGroups[y].slice(0, 2))
        if (balanced.length >= 8) break
      }
      matchedChats = balanced.length > 0 ? balanced : uniqueChats.slice(0, 6)
    }

    // 4. Query Machines Master
    let machineQuery = supabase
      .from('maintenance_machines')
      .select('machine_code, machine_name, category, location, status, model, serial_number')
      .limit(3)

    if (detectedMachine) {
      machineQuery = machineQuery.ilike('machine_code', `%${detectedMachine}%`)
    } else {
      machineQuery = machineQuery.or(`machine_code.ilike.%${q}%,machine_name.ilike.%${q}%`)
    }
    const { data: matchedMachines } = await machineQuery

    // 5. Query Spare Parts
    const { data: matchedParts } = await supabase
      .from('maintenance_spare_parts')
      .select('part_code, part_name, category, stock_quantity, unit, unit_price, location')
      .or(`part_name.ilike.%${q}%,part_code.ilike.%${q}%,specification.ilike.%${q}%`)
      .limit(4)

    // Build context summary for AI
    const contextLines: string[] = []

    if (matchedMachines && matchedMachines.length > 0) {
      contextLines.push('--- ข้อมูลเครื่องจักรที่เกี่ยวข้อง ---')
      matchedMachines.forEach(m => {
        contextLines.push(`- รหัส: ${m.machine_code} | ชื่อ: ${m.machine_name} | รุ่น: ${m.model || '-'} | สถานะปัจจุบัน: ${m.status}`)
      })
    }

    if (matchedWOs && matchedWOs.length > 0) {
      contextLines.push('--- ประวัติใบแจ้งซ่อมในระบบ (Work Orders) ---')
      matchedWOs.forEach(w => {
        contextLines.push(`- [${w.wo_number}] เครื่อง ${w.machine_code}: อาการ "${w.problem_description}" | สาเหตุ: ${w.root_cause || '-'} | วิธีแก้: ${w.action_taken || '-'} (สถานะ: ${w.status})`)
      })
    }

    if (matchedChats && matchedChats.length > 0) {
      contextLines.push('--- ข้อมูลบทสนทนาจากกลุ่มไลน์ช่าง (LINE Chat History) ---')
      matchedChats.forEach(c => {
        const dateStr = formatDisplayDate(c.chat_date, c.raw_log, c.created_at)
        const datePrefix = dateStr ? `[วันที่ ${dateStr}] ` : ''
        contextLines.push(`- ${datePrefix}${c.sender_name}: "${c.message_text}"`)
      })
    }

    if (matchedParts && matchedParts.length > 0) {
      contextLines.push('--- อะไหล่ในคลังที่ตรงกับคำค้น ---')
      matchedParts.forEach(p => {
        contextLines.push(`- รหัส ${p.part_code}: ${p.part_name} | คงเหลือ: ${p.stock_quantity} ${p.unit || 'ชิ้น'} | ที่เก็บ: ${p.location || 'คลังหลัก'}`)
      })
    }

    const contextText = contextLines.join('\n')

    // 6. Check if Gemini API Key is available
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (apiKey) {
      try {
        const prompt = `คุณคือ "น้อง MTEX ผู้ช่วยช่างอัจฉริยะ (CosmeFlow Maintenance AI)" ประจำโรงงานผลิตเครื่องสำอาง Cosmediva
หน้าที่ของคุณคือตอบคำถามทีมช่าง วิศวกร และผู้แจ้งซ่อม เกี่ยวกับประวัติงานซ่อม วิธีแก้ไขปัญหา สเปกเครื่องจักร และอะไหล่
ตอบด้วยภาษาไทยที่สุภาพ กระชับ เป็นมืออาชีพ มีขั้นตอน (Bullet points) ชัดเจน และอ้างอิงข้อมูลจริงจากบริบทด้านล่าง:

ข้อมูลในระบบ CosmeFlow:
${contextText || '(ไม่พบบันทึกตรงๆ ในระบบ)'}

คำถามของผู้ใช้งาน:
"${q}"

คำแนะนำในการตอบ:
1. หากนำข้อมูลมาจากประวัติแชทกลุ่มช่าง "ต้องระบุวันที่และเวลาเสมอ (เช่น [📅 15/09/2026 09:48])" เพื่อให้ผู้ใช้สามารถนำวันที่ไปค้นหารูปภาพและรายละเอียดเพิ่มเติมในกลุ่ม LINE ได้
2. สรุปอาการ สาเหตุ และวิธีแก้ปัญหาที่ช่างได้ทำ
3. หากมีการพูดถึงอะไหล่ ให้ระบุชื่ออะไหล่และจำนวนคงเหลือในคลัง (ถ้ามีข้อมูล)
4. หากในระบบไม่มีข้อมูลแน่ชัด ให้แนะนำขั้นตอนการตรวจสอบเบื้องต้นตามหลักการช่างอุตสาหกรรมอย่างปลอดภัย`

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 800
              }
            })
          }
        )

        const geminiData = await geminiRes.json()
        const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (aiText) {
          return {
            success: true,
            answer: aiText,
            sources: {
              workOrders: matchedWOs || [],
              chatHistory: matchedChats || [],
              machines: matchedMachines || [],
              parts: matchedParts || []
            }
          }
        }
      } catch (geminiErr) {
        console.error('Gemini API call failed, falling back to structured synthesis:', geminiErr)
      }
    }

    // 7. Heuristic Fallback Answer if no Gemini API Key or Gemini call fails:
    let answerText = `🤖 น้อง MTEX ค้นหาข้อมูลสำหรับ "${q}":\n\n`

    if (matchedWOs && matchedWOs.length > 0) {
      answerText += `📋 ประวัติงานซ่อมที่ผ่านมา (${matchedWOs.length} รายการ):\n`
      matchedWOs.slice(0, 3).forEach((w, idx) => {
        answerText += `${idx + 1}. [${w.wo_number}] เครื่อง ${w.machine_code}: อาการ "${w.problem_description}"\n   • สาเหตุ: ${w.root_cause || 'ยังไม่ระบุ'}\n   • วิธีแก้ไข: ${w.action_taken || 'รอตรวจสอบ'}\n`
      })
      answerText += '\n'
    }

    if (matchedChats && matchedChats.length > 0) {
      answerText += `💬 ข้อมูลประวัติจากแชทกลุ่มช่าง (นำวันที่ไปค้นหารูปใน LINE ได้ครับ):\n`
      matchedChats.slice(0, 6).forEach(c => {
        const dateStr = formatDisplayDate(c.chat_date, c.raw_log, c.created_at)
        const datePrefix = dateStr ? `[📅 ${dateStr}] ` : ''
        answerText += `• ${datePrefix}${c.sender_name}: "${c.message_text}"\n`
      })
      answerText += '\n'
    }

    if (matchedParts && matchedParts.length > 0) {
      answerText += `📦 อะไหล่ในคลังที่เกี่ยวข้อง:\n`
      matchedParts.forEach(p => {
        answerText += `• ${p.part_name} (${p.part_code}) คงเหลือ: ${p.stock_quantity} ${p.unit || 'ชิ้น'} (เก็บที่: ${p.location || 'คลัง'})\n`
      })
      answerText += '\n'
    }

    if (!matchedWOs?.length && !matchedChats?.length && !matchedParts?.length) {
      answerText += `ขออภัยครับ ยังไม่พบบันทึกงานซ่อมหรือข้อความแชทที่ตรงกับคำค้นนี้ในระบบครับ\n💡 แนะนำลองค้นด้วยรหัสเครื่อง เช่น "MX-02", "FL-01" หรือชื่ออะไหล่ เช่น "ลูกปืน", "สายพาน", "ฮีตเตอร์" ครับ`
    }

    return {
      success: true,
      answer: answerText,
      sources: {
        workOrders: matchedWOs || [],
        chatHistory: matchedChats || [],
        machines: matchedMachines || [],
        parts: matchedParts || []
      }
    }
  } catch (err: any) {
    console.error('Error in askMtexAI:', err)
    return { success: false, answer: 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ', error: err.message }
  }
}
