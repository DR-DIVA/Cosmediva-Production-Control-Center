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
 * คลังความรู้มาตรฐานระบบ CMMS CosmeFlow Maintenance (SOP & Manual Knowledge Base)
 * ใช้เป็นฐานข้อมูลให้น้อง MTEX ตอบคำถามและให้คำแนะนำผู้ใช้งานทุกคนในโรงงาน
 */
export const COSMEFLOW_CMMS_SYSTEM_KNOWLEDGE = `
[คู่มือและคลังความรู้มาตรฐานการใช้งานระบบแจ้งซ่อมบำรุง CosmeFlow CMMS โรงงาน Cosmediva]

1. วงจรการแจ้งซ่อมบำรุง 6 ขั้นตอนหลัก (Lifecycle & Step-by-Step SOP):
--------------------------------------------------------------------------------
• ขั้นตอนที่ 1: การเปิดใบแจ้งซ่อม (Create Work Order)
  - ผู้รับผิดชอบ: พนักงานหน้างาน / หัวหน้าฝ่ายผลิต (Operator / Production Supervisor)
  - เมนู & หน้าจอ: 
    * หน้าเว็บแจ้งซ่อมด่วน (/maintenance/report)
    * หรือปุ่มสีแดง "+ แจ้งซ่อมด่วน" บนกระดาน Kanban (/maintenance/work-orders)
    * หรือใช้มือถือสแกน QR Code หน้าเครื่องจักร
  - ปุ่มที่กด: "🚀 ส่งใบแจ้งซ่อมทันที"
  - ผลลัพธ์:
    * ระบบสร้างเลขที่ใบสั่งซ่อม MTR-XXXXXXX ทันที
    * สร้างเอกสารอิเล็กทรอนิกส์ E-Form DCC MT-PF-001D พร้อมพิมพ์หรือบันทึก PDF
    * การ์ดใบงานปรากฏในช่องแรก "แจ้งใหม่ (New)" บนบอร์ด
    * ถ้าเป็นแจ้งซ่อมด่วน (P1_CRITICAL) สถานะเครื่องจักรจะเปลี่ยนเป็น Breakdown 🔴 อัตโนมัติ
  - การแจ้งเตือน LINE ของน้อง MTEX: ส่งการ์ดสีแดงฉุกเฉิน 🚨 เข้ากลุ่มช่างทันที พร้อมปุ่ม "รับงานซ่อม"
  - แบบไหนเรียกว่าเสร็จ: ได้เลข MTR และการ์ดเด้งใน LINE / ไม่เสร็จ: กรอกไม่ครบหรือยังไม่กดส่ง

• ขั้นตอนที่ 2: ช่างรับเรื่อง & มอบหมายงาน (Acknowledge & Assign)
  - ผู้รับผิดชอบ: หัวหน้าช่าง / ช่างประจำกะ (Maintenance Lead / Technician)
  - เมนู & หน้าจอ: กระดานงานซ่อม (/maintenance/work-orders) หรือหน้ามือถือช่าง (/maintenance/technician)
  - ปุ่มที่กด:
    * คลิกที่การ์ดในช่อง "แจ้งใหม่ (New)"
    * เลือกชื่อช่างผู้รับผิดชอบ -> กดปุ่ม "มอบหมายช่าง (Assign)"
    * หรือกดปุ่มสีเขียว "▶ START REPAIR (เริ่มซ่อม & จับเวลาทันที)"
  - ผลลัพธ์:
    * การ์ดย้ายไป "มอบหมาย (Assigned)" หรือ "กำลังซ่อม (In Progress)"
    * ระบบเริ่มจับเวลา Live Timer สด (นับเวลาซ่อมแบบ Real-Time)
    * บันทึก Response Time (เวลาตอบสนอง) เพื่อวัด KPI ช่าง
  - การแจ้งเตือน LINE ของน้อง MTEX: ส่งข้อความอัปเดตสถานะช่างรับเรื่องและเริ่มซ่อม
  - แบบไหนเรียกว่าเสร็จ: มีชื่อช่างผูกกับใบงาน และเวลานับสดเริ่มเดิน / ไม่เสร็จ: การ์ดยังค้างที่ช่อง "แจ้งใหม่" (ยังไม่มีใครกดรับ)

• ขั้นตอนที่ 3: ระหว่างซ่อม & ตัดเบิกอะไหล่ (In Progress & Spare Parts)
  - ผู้รับผิดชอบ: ช่างผู้ลงมือซ่อม (Technician)
  - เมนู & หน้าจอ: หน้าต่างรายละเอียดใบงาน (คลิกที่การ์ด)
  - ปุ่มที่เกี่ยวข้อง:
    * มีอะไหล่ในสต็อก: กดปุ่มสีส้ม "[📦 + มีอะไหล่ ตัดสต็อกทันที]" -> เลือกอะไหล่ -> ระบุจำนวน -> ยืนยันตัดสต็อก
    * ไม่มีอะไหล่ในสต็อก: กดปุ่ม "[🛒 ไม่มีอะไหล่ / เปิด PR (รออะไหล่)]" -> ระบุเลขที่ PR เพื่อขอซื้อ (ระบบจะพักหยุดเวลาซ่อมชั่วคราว ไม่คิดเป็นความผิดช่าง)
    * ทดสอบเครื่องเบื้องต้น: กดปุ่มสีน้ำเงิน "[▶ ส่งทดสอบเครื่อง (TEST RUN)]"
  - ผลลัพธ์: ยอดอะไหล่ในคลังถูกตัดทันที และบันทึกต้นทุนค่าอะไหล่ผูกเข้าใบงานและเครื่องจักร
  - การแจ้งเตือน LINE ของน้อง MTEX: แจ้งเตือนถ้าย้ายไปสถานะรออะไหล่
  - แบบไหนเรียกว่าเสร็จ: ตัดสต็อกอะไหล่ถูกต้อง หรือซ่อมเสร็จพร้อมปิดงาน / ไม่เสร็จ: ใช้อะไหล่จริงแต่ไม่บันทึกตัดสต็อกในระบบ

• ขั้นตอนที่ 4: ช่างบันทึกผลการซ่อม (Complete Repair)
  - ผู้รับผิดชอบ: ช่างซ่อมบำรุง (Technician)
  - เมนู & หน้าจอ: หน้าต่างรายละเอียดใบงาน
  - ปุ่มที่กด: ปุ่มสีเขียว "[✅ ซ่อมเสร็จสมบูรณ์ (COMPLETED)]"
  - ฟอร์มบันทึก 2 คอลัมน์สบายตา:
    * ฝั่งซ้าย: เลือกหมวดหมู่ปัญหา (Problem Category) + เลือกสาเหตุหลัก (Root Cause)
    * ฝั่งขวา: ระบุสิ่งที่ดำเนินการแก้ไข (Corrective Action) + ข้อเสนอแนะเพื่อป้องกันการเกิดซ้ำ (Preventive Recommendation) + ถ่ายรูป/แนบรูปหลังซ่อม
    * กดปุ่ม "ยืนยันปิดงานซ่อม (COMPLETE)"
  - ผลลัพธ์: หยุดนาฬิกาจับเวลา, บันทึก Total Downtime สะสม, การ์ดย้ายไปคอลัมน์ "ช่างซ่อมเสร็จ (Completed)"
  - การแจ้งเตือน LINE ของน้อง MTEX: แจ้งเตือนฝ่ายผลิตว่าช่างซ่อมเสร็จแล้ว เชิญเข้าตรวจรับงาน
  - แบบไหนเรียกว่าเสร็จ: บันทึกสาเหตุและวิธีแก้ไขครบถ้วน การ์ดย้ายไปรอตรวจรับ / ไม่เสร็จ: ซ่อมเสร็จแต่ไม่กดปุ่มนี้ในระบบ ทำให้เวลานับ Downtime ยังเดินต่อ

• ขั้นตอนที่ 5: ฝ่ายผลิตทดสอบเดินเครื่องและตรวจรับ (Production Verify)
  - ผู้รับผิดชอบ: ผู้แจ้งซ่อม / หัวหน้าฝ่ายผลิต (Operator / Production Supervisor)
  - เมนู & หน้าจอ: คอลัมน์ "ช่างซ่อมเสร็จ (Completed)" บนบอร์ด
  - ปุ่มที่กด:
    * คลิกที่การ์ด -> กดปุ่มสีทอง "[ผู้แจ้งตรวจรับงาน (Verify)]"
    * ทดลองเปิดเครื่องเดินงานจริง แล้วเลือก:
      - 🟢 ผ่าน (PASS): เครื่องจักรทำงานได้ปกติ สินค้าได้สเปก -> กดยืนยัน
      - 🔴 ไม่ผ่าน (FAIL): เครื่องยังมีอาการผิดปกติ -> งานจะดีดกลับไปให้ช่างในช่อง "กำลังซ่อม" ทันที
  - ผลลัพธ์: ถ้าผ่าน สถานะเครื่องจักรจะเปลี่ยนกลับเป็น Running (ปกติ) 🟢 ทันที และการ์ดย้ายไปช่อง "ผู้แจ้งตรวจรับ (Verified)"
  - การแจ้งเตือน LINE ของน้อง MTEX: แจ้งเตือนว่าฝ่ายผลิตตรวจรับเครื่องจักรผ่านแล้ว
  - แบบไหนเรียกว่าเสร็จ: ฝ่ายผลิตได้ทดสอบเดินเครื่องจริงและกด Verify PASS ในระบบ

• ขั้นตอนที่ 6: การปิดงานสมบูรณ์ & จัดเก็บประวัติ (Close & Export)
  - ผู้รับผิดชอบ: หัวหน้าฝ่ายซ่อมบำรุง / Admin / ผู้จัดการโรงงาน
  - เมนู & หน้าจอ: คอลัมน์ "ผู้แจ้งตรวจรับ (Verified)" บนบอร์ด
  - ปุ่มที่กด: ปุ่มสีดำบนการ์ด "[🛡️ ปิดงาน (Close)]"
  - ผลลัพธ์:
    * การ์ดย้ายเข้าสู่คอลัมน์สุดท้าย "ปิดงาน (Closed)"
    * ล็อกเอกสาร E-Form DCC MT-PF-001D ห้ามแก้ไขย้อนหลัง เพื่อใช้ในการ Audit
    * สรุปเวลา Downtime และค่าใช้จ่ายทั้งหมดเข้า Dashboard KPI
  - การแจ้งเตือน LINE ของน้อง MTEX: ส่งการ์ดสรุปปิดงานสีเขียว ✅ แจ้งว่าเครื่องพร้อมเดิน 100%
  - การ Export รายงาน Excel: กดปุ่มสีเขียว "[📊 Export Excel]" ที่ด้านบนของบอร์ด เพื่อดาวน์โหลดไฟล์ .xlsx สรุปงานซ่อมบำรุงทุกมิติ

2. ความหมายของสีการ์ดแจ้งเตือนในกลุ่ม LINE ของน้อง MTEX:
--------------------------------------------------------------------------------
- 🚨 การ์ดสีแดง (EMERGENCY): แจ้งซ่อมด่วนฉุกเฉิน / P1_CRITICAL / เครื่องหยุด หรือสายการผลิตชะงัก ช่างต้องเข้าพื้นที่ทันที
- 🛠️ การ์ดสีน้ำเงิน (GENERAL): แจ้งซ่อมทั่วไป / ไม่กระทบสายการผลิต / เครื่องยังเดินต่อได้ ช่างเข้าซ่อมตามคิว
- 💡 การ์ดสีม่วง (SERVICE): งานบริการอาคารสถานที่ / ไฟฟ้าแสงสว่าง / แอร์ / ประปา / สุขาภิบาล
- 🔧 ข้อความอัปเดต: ช่างกดรับเรื่อง / ช่างเริ่มลงมือซ่อม
- ✨ ข้อความแจ้งเตือน: ช่างซ่อมเสร็จแล้ว แจ้งฝ่ายผลิตเข้าตรวจรับ
- ✅ การ์ดสีเขียว: ปิดงานซ่อมสมบูรณ์ เครื่องจักรกลับมาพร้อมผลิต 100%
`

/**
 * Clean Thai conversational filler words, question particles, and extract target year
 */
export async function extractSearchTerms(rawQuery: string): Promise<{ cleanKeyword: string; filterYear: number | null }> {
  let text = rawQuery
    .replace(/^[@\s]*mtex[:\s]*/i, '')
    .trim()

  // 1. Extract and remove Year
  const yearMatch = text.match(/\b(201[9]|202[0-6]|256[2-9])\b|ปี\s*(201[9]|202[0-6]|256[2-9])/i)
  let filterYear: number | null = null
  if (yearMatch) {
    const rawY = yearMatch[1] || yearMatch[2]
    let y = parseInt(rawY, 10)
    if (y > 2500) y -= 543
    filterYear = y
    text = text.replace(yearMatch[0], ' ')
  }

  // 2. Strip leading / trailing conversational / question particles
  let prevText = ''
  while (prevText !== text) {
    prevText = text
    text = text
      .replace(/^(ขอข้อมูล|ขอประวัติ|มีข้อมูล|มีประวัติ|มีเกี่ยวกับ|เกี่ยวกับเรื่อง|เกี่ยวกับ|เรื่อง|ประวัติของ|ประวัติ|ข้อมูลของ|ข้อมูล|เช็ค|ตรวจสอบ|ค้นหา|ช่วยหา|ช่วยดู|ดู|ถาม|สอบถาม|อยากทราบ|อยากรู้|พบ|มี)\s*/gi, '')
      .replace(/\s*(ไหมคะ|มั้ยคะ|ไหมครับ|มั้ยครับ|ไหม|มั้ย|หรือยัง|ยังไง|อย่างไร|บ้างคะ|บ้างครับ|บ้าง|คะ|ค่ะ|ครับ|จ้ะ|จ้า|หน่อยคะ|หน่อยครับ|หน่อย|นะ|นะครับ|นะคะ|เด้อ)\s*$/gi, '')
      .trim()
  }

  const cleanKeyword = text.replace(/\s+/g, ' ').trim() || rawQuery.replace(/^[@\s]*mtex[:\s]*/i, '').trim()

  return { cleanKeyword, filterYear }
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
  yearsAvailable?: string[]
  yearCounts?: Record<string, number>
  isFilteredByYear?: boolean
  filterYear?: number | null
  detectedKeyword?: string
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

    // 0.1 Intercept CMMS System usage / SOP guide questions
    const isSystemGuideQuery = /(วิธี|ขั้นตอน|สอน|คู่มือ|ใช้งานระบบ|ใช้ระบบ|แจ้งซ่อมยังไง|ใครทำอะไร|ทำยังไง|กดปุ่ม|รับงานยังไง|ตรวจรับยังไง|ปิดงานยังไง|ตัดอะไหล่|export|excel|บอร์ด|kanban|sop|cmms|cosmeflow|ระบบซ่อม|ใบสั่งซ่อม|การ์ดแดง|การ์ดม่วง|การ์ดเขียว|การ์ดน้ำเงิน|verify|dcc|e-form)/i.test(cleanQ)

    if (isSystemGuideQuery) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
      if (apiKey) {
        try {
          const systemGuidePrompt = `คุณคือ "น้อง MTEX ผู้ช่วยช่างอัจฉริยะ (CosmeFlow Maintenance AI)" ประจำโรงงานผลิตเครื่องสำอาง Cosmediva
หน้าที่ของคุณคือแนะนำวิธีการใช้งานระบบ CMMS CosmeFlow Maintenance อย่างละเอียด ครบถ้วน ถูกต้องตามระเบียบโรงงาน (SOP)
ตอบคำถามของผู้ใช้งานอย่างสุภาพ มีมิตรภาพ ชัดเจน เข้าใจง่าย มีขั้นตอน (Bullet points) บอกหน้าจอ เมนู และปุ่มที่เกี่ยวข้อง

คลังความรู้มาตรฐานระบบ CMMS CosmeFlow:
${COSMEFLOW_CMMS_SYSTEM_KNOWLEDGE}

คำถามของผู้ใช้งาน:
"${q}"

คำแนะนำ:
1. ตอบตรงคำถามของผู้ใช้ หากถามขั้นตอนใด ให้เน้นขั้นตอนนั้น พร้อมบอกผู้รับผิดชอบ หน้าจอ และปุ่มที่ต้องกด
2. หากถามภาพรวม ให้สรุป 6 ขั้นตอนหลักและสีการ์ดใน LINE ให้เข้าใจง่าย
3. ใช้ภาษาไทยที่เป็นกันเองแต่มีความเป็นมืออาชีพวิศวกรรม/ซ่อมบำรุง`

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemGuidePrompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 1000
                }
              })
            }
          )

          const geminiData = await geminiRes.json()
          const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
          if (aiText) {
            return {
              success: true,
              answer: aiText
            }
          }
        } catch (geminiErr) {
          console.error('Gemini API call failed for system guide query:', geminiErr)
        }
      }

      // Offline / Fallback SOP guide response:
      return {
        success: true,
        answer: `🤖 น้อง MTEX ขอสรุปขั้นตอนการใช้งานระบบแจ้งซ่อม CosmeFlow CMMS ให้ครับ:\n\n` +
          `1️⃣ **เปิดใบแจ้งซ่อม:** ฝ่ายผลิตกดปุ่มสีแดง "+ แจ้งซ่อมด่วน" หรือสแกน QR Code หน้าเครื่อง -> น้อง MTEX ส่งการ์ดสีแดง 🚨 เข้ากลุ่มช่าง\n` +
          `2️⃣ **ช่างรับเรื่อง & มอบหมาย:** ช่างคลิกการ์ดบนบอร์ด -> เลือกชื่อช่าง -> กด "มอบหมาย (Assign)" หรือ "START REPAIR" เพื่อเริ่มจับเวลาสด\n` +
          `3️⃣ **ระหว่างซ่อม & ตัดอะไหล่:** ช่างกดปุ่ม "[📦 + มีอะไหล่ ตัดสต็อกทันที]" หรือถ้าไม่มีอะไหล่กด "[🛒 ไม่มีอะไหล่ / เปิด PR]"\n` +
          `4️⃣ **ช่างซ่อมเสร็จ:** กดปุ่มเขียว "[✅ ซ่อมเสร็จสมบูรณ์]" -> ระบุสาเหตุ (Root Cause) และวิธีแก้ (Corrective Action)\n` +
          `5️⃣ **ฝ่ายผลิตตรวจรับ:** ฝ่ายผลิตทดลองเดินเครื่อง -> กดปุ่มทอง "[ผู้แจ้งตรวจรับงาน (Verify)]" เลือกว่า PASS หรือ FAIL\n` +
          `6️⃣ **ปิดงานสมบูรณ์:** กดปุ่ม "[🛡️ ปิดงาน (Close)]" -> น้อง MTEX ส่งการ์ดเขียว ✅ และสามารถกดปุ่ม "[📊 Export Excel]" เพื่อโหลดรายงานได้ครับ!`
      }
    }

    const supabase = createAdminClient()

    // 1. Extract clean keyword & target year using NLP stopword stripper
    const { cleanKeyword, filterYear } = await extractSearchTerms(cleanQ)
    const detectedMachine = extractMachineCode(cleanKeyword)
    const effectiveKeyword = cleanKeyword || cleanQ

    // 2. Query Work Orders
    let woQuery = supabase
      .from('maintenance_work_orders')
      .select('wo_number, machine_code, machine_name, symptom_description, root_cause, corrective_action, status, created_at, priority')
      .order('created_at', { ascending: false })
      .limit(6)

    if (detectedMachine) {
      woQuery = woQuery.or(`machine_code.ilike.%${detectedMachine}%,symptom_description.ilike.%${detectedMachine}%`)
    } else {
      woQuery = woQuery.or(`symptom_description.ilike.%${effectiveKeyword}%,root_cause.ilike.%${effectiveKeyword}%,corrective_action.ilike.%${effectiveKeyword}%,machine_code.ilike.%${effectiveKeyword}%`)
    }
    const { data: matchedWOs } = await woQuery

    // 3. Query Chat History (multi-year support)
    let chatQuery = supabase
      .from('maintenance_chat_history')
      .select('sender_name, message_text, machine_code, chat_date, raw_log, created_at')
      .order('chat_date', { ascending: false, nullsFirst: false })
      .limit(filterYear ? 100 : 500)

    if (detectedMachine) {
      chatQuery = chatQuery.or(`machine_code.ilike.%${detectedMachine}%,message_text.ilike.%${detectedMachine}%`)
    } else {
      chatQuery = chatQuery.ilike('message_text', `%${effectiveKeyword}%`)
    }

    if (filterYear) {
      chatQuery = chatQuery
        .gte('chat_date', `${filterYear}-01-01T00:00:00Z`)
        .lte('chat_date', `${filterYear}-12-31T23:59:59Z`)
    }

    const { data: rawMatchedChats } = await chatQuery

    // Deduplicate chats with clean text normalization (ignore leading mentions, symbols, whitespace)
    function cleanForDedup(text: string): string {
      return text
        .replace(/@\S+/g, '')
        .replace(/^[pP]\s*[:@\s]*/g, '')
        .replace(/[^a-zA-Z0-9ก-๙]/g, '')
        .trim()
        .toLowerCase()
    }

    const yearCounts: Record<string, number> = {}
    ;(rawMatchedChats || []).forEach(c => {
      const y = c.chat_date ? new Date(c.chat_date).getFullYear().toString() : 'อื่นๆ'
      yearCounts[y] = (yearCounts[y] || 0) + 1
    })

    const seenHashes = new Set<string>()
    const yearGroups: Record<string, any[]> = {}
    ;(rawMatchedChats || []).forEach(c => {
      const y = c.chat_date ? new Date(c.chat_date).getFullYear().toString() : 'อื่นๆ'
      if (!yearGroups[y]) yearGroups[y] = []

      const norm = cleanForDedup(c.message_text || '')
      const hash = norm.slice(0, 35)
      if (hash.length > 3 && !seenHashes.has(hash)) {
        seenHashes.add(hash)
        yearGroups[y].push(c)
      }
    })

    const yearsSorted = Object.keys(yearGroups).sort((a, b) => Number(b) - Number(a))

    let matchedChats: any[] = []
    if (filterYear) {
      matchedChats = (yearGroups[filterYear.toString()] || []).slice(0, 15)
    } else {
      // Balance results across ALL available years (2019 - 2026), 1-2 distinct items per year
      for (const y of yearsSorted) {
        matchedChats.push(...(yearGroups[y] || []).slice(0, 2))
      }
    }

    // 4. Query Machines Master
    let machineQuery = supabase
      .from('maintenance_machines')
      .select('machine_code, machine_name, category, production_area, room_name, status, model, serial_number')
      .limit(3)

    if (detectedMachine) {
      machineQuery = machineQuery.ilike('machine_code', `%${detectedMachine}%`)
    } else {
      machineQuery = machineQuery.or(`machine_code.ilike.%${effectiveKeyword}%,machine_name.ilike.%${effectiveKeyword}%`)
    }
    const { data: matchedMachines } = await machineQuery

    // 5. Query Spare Parts
    const { data: matchedParts } = await supabase
      .from('maintenance_spare_parts')
      .select('part_code, part_name, category, stock_qty, unit, average_cost, storage_location')
      .or(`part_name.ilike.%${effectiveKeyword}%,part_code.ilike.%${effectiveKeyword}%,specification.ilike.%${effectiveKeyword}%`)
      .limit(4)

    // Build context summary for AI
    const contextLines: string[] = []

    if (matchedMachines && matchedMachines.length > 0) {
      contextLines.push('--- ข้อมูลเครื่องจักรที่เกี่ยวข้อง ---')
      matchedMachines.forEach(m => {
        contextLines.push(`- รหัส: ${m.machine_code} | ชื่อ: ${m.machine_name} | รุ่น: ${m.model || '-'} | พื้นที่: ${m.production_area || m.room_name || '-'} | สถานะ: ${m.status}`)
      })
    }

    if (matchedWOs && matchedWOs.length > 0) {
      contextLines.push('--- ประวัติใบแจ้งซ่อมในระบบ (Work Orders) ---')
      matchedWOs.forEach(w => {
        contextLines.push(`- [${w.wo_number}] เครื่อง ${w.machine_code}: อาการ "${w.symptom_description || '-'}" | สาเหตุ: ${w.root_cause || '-'} | วิธีแก้: ${w.corrective_action || '-'} (สถานะ: ${w.status})`)
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
        contextLines.push(`- รหัส ${p.part_code}: ${p.part_name} | คงเหลือ: ${p.stock_qty} ${p.unit || 'ชิ้น'} | ที่เก็บ: ${p.storage_location || 'คลังหลัก'}`)
      })
    }

    const contextText = contextLines.join('\n')

    // 6. Check if Gemini API Key is available
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (apiKey) {
      try {
        const prompt = `คุณคือ "น้อง MTEX ผู้ช่วยช่างอัจฉริยะ (CosmeFlow Maintenance AI)" ประจำโรงงานผลิตเครื่องสำอาง Cosmediva
หน้าที่ของคุณคือ:
1. ตอบคำถามทีมช่าง วิศวกร และผู้แจ้งซ่อม เกี่ยวกับประวัติงานซ่อม วิธีแก้ไขปัญหา สเปกเครื่องจักร และอะไหล่
2. ให้คำแนะนำการใช้งานระบบ CMMS CosmeFlow Maintenance อย่างถูกต้องตามระเบียบโรงงาน (SOP) ทุกขั้นตอน ทุกเมนู และปุ่มที่เกี่ยวข้อง
ตอบด้วยภาษาไทยที่สุภาพ กระชับ เป็นมืออาชีพ มีขั้นตอน (Bullet points) ชัดเจน และอ้างอิงข้อมูลจริงจากบริบทด้านล่าง:

คลังความรู้มาตรฐานระบบ CMMS CosmeFlow:
${COSMEFLOW_CMMS_SYSTEM_KNOWLEDGE}

ข้อมูลในระบบ CosmeFlow (สำหรับงานซ่อมและเครื่องจักร):
${contextText || '(ไม่พบบันทึกตรงๆ ในระบบ)'}

คำถามของผู้ใช้งาน:
"${q}"

คำแนะนำในการตอบ:
1. หากนำข้อมูลมาจากประวัติแชทกลุ่มช่าง "ต้องระบุวันที่และเวลาเสมอ (เช่น [📅 15/09/2026 09:48])" เพื่อให้ผู้ใช้สามารถนำวันที่ไปค้นหารูปภาพและรายละเอียดเพิ่มเติมในกลุ่ม LINE ได้
2. สรุปอาการ สาเหตุ และวิธีแก้ปัญหาที่ช่างได้ทำ
3. หากมีการพูดถึงอะไหล่ ให้ระบุชื่ออะไหล่และจำนวนคงเหลือในคลัง (ถ้ามีข้อมูล)
4. หากในระบบไม่มีข้อมูลแน่ชัด ให้แนะนำขั้นตอนการตรวจสอบเบื้องต้นตามหลักการช่างอุตสาหกรรมอย่างปลอดภัย หรือแนะนำขั้นตอนในระบบ CMMS`

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
    let answerText = `🤖 น้อง MTEX ค้นหาข้อมูลสำหรับ "${effectiveKeyword}${filterYear ? ` (ปี ${filterYear})` : ''}":\n\n`

    if (matchedWOs && matchedWOs.length > 0) {
      answerText += `📋 ประวัติงานซ่อมที่ผ่านมา (${matchedWOs.length} รายการ):\n`
      matchedWOs.slice(0, 3).forEach((w, idx) => {
        answerText += `${idx + 1}. [${w.wo_number}] เครื่อง ${w.machine_code}: อาการ "${w.symptom_description || 'ไม่ระบุ'}"\n   • สาเหตุ: ${w.root_cause || 'ยังไม่ระบุ'}\n   • วิธีแก้ไข: ${w.corrective_action || 'รอตรวจสอบ'}\n`
      })
      answerText += '\n'
    }

    if (matchedChats && matchedChats.length > 0) {
      const totalRaw = rawMatchedChats?.length || 0
      if (filterYear) {
        answerText += `📊 สถิติประวัติแชทเกี่ยวกับ "${effectiveKeyword}" ประจำปี ${filterYear} (พบทั้งหมด ${yearCounts[filterYear.toString()] || matchedChats.length} ข้อความ):\n\n`
        answerText += `💬 ข้อมูลประวัติจากแชทกลุ่มช่าง (นำวันที่ไปค้นหารูปใน LINE ได้ครับ):\n`
        matchedChats.forEach(c => {
          const dateStr = formatDisplayDate(c.chat_date, c.raw_log, c.created_at)
          const datePrefix = dateStr ? `[📅 ${dateStr}] ` : ''
          answerText += `• ${datePrefix}${c.sender_name}: "${c.message_text.trim()}"\n`
        })
        answerText += '\n'
      } else {
        answerText += `📊 สถิติประวัติแชทในระบบ (พบทั้งหมด ${totalRaw} ข้อความ):\n`
        const summaryParts = yearsSorted.map(y => `ปี ${y}: ${yearCounts[y]} ข้อความ`)
        answerText += summaryParts.join(' | ') + '\n\n'

        answerText += `💬 ไทม์ไลน์ประวัติสำคัญแยกตามปี (นำวันที่ไปค้นหารูปใน LINE ได้ครับ):\n\n`
        for (const y of yearsSorted) {
          const msgs = yearGroups[y] || []
          const sampleMsgs = msgs.slice(0, 2)
          if (sampleMsgs.length > 0) {
            answerText += `🔹 ปี ${y} (${yearCounts[y]} ข้อความในระบบ):\n`
            sampleMsgs.forEach(c => {
              const dateStr = formatDisplayDate(c.chat_date, c.raw_log, c.created_at)
              const datePrefix = dateStr ? `[📅 ${dateStr}] ` : ''
              answerText += `• ${datePrefix}${c.sender_name}: "${c.message_text.trim()}"\n`
            })
            answerText += '\n'
          }
        }
        answerText += `❓ คุณพี่ต้องการดูประวัติอย่างละเอียดของปีไหนเป็นพิเศษไหมครับ?\n(สามารถกดปุ่มเลือกปีด้านล่าง หรือพิมพ์ตอบกลับมาได้เลยครับ เช่น "${detectedMachine || effectiveKeyword} 2026" หรือพิมพ์แค่เลขปี เช่น "2026") 👇\n\n`
      }
    }

    if (matchedParts && matchedParts.length > 0) {
      answerText += `📦 อะไหล่ในคลังที่เกี่ยวข้อง:\n`
      matchedParts.forEach(p => {
        answerText += `• ${p.part_name} (${p.part_code}) คงเหลือ: ${p.stock_qty} ${p.unit || 'ชิ้น'} (เก็บที่: ${p.storage_location || 'คลัง'})\n`
      })
      answerText += '\n'
    }

    if (!matchedWOs?.length && !matchedChats?.length && !matchedParts?.length) {
      answerText += `ขออภัยครับ ยังไม่พบบันทึกงานซ่อมหรือข้อความแชทเกี่ยวกับ "${effectiveKeyword}" ในระบบครับ\n💡 แนะนำลองค้นด้วยรหัสเครื่อง เช่น "MX-02", "FL-01" หรือชื่ออะไหล่ เช่น "สลิง", "ลูกปืน", "สายพาน", "ฮีตเตอร์" ครับ`
    }

    return {
      success: true,
      answer: answerText,
      yearsAvailable: yearsSorted || [],
      yearCounts: yearCounts || {},
      isFilteredByYear: !!filterYear,
      filterYear: filterYear,
      detectedKeyword: detectedMachine || effectiveKeyword,
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
