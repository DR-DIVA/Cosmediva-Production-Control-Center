export interface PMReadingField {
  key: string
  label: string
  unit: string
  placeholder?: string
}

export interface PMReadingConfig {
  type: 'amp_uvw' | 'temperature' | 'amp_single' | 'pressure' | 'custom'
  fields: string[]
  unit: string
}

export interface PMChecklistItem {
  id: number
  category: string
  item: string
  point?: string
  standard: string
  method: string
  readings?: PMReadingConfig | null
}

export interface PMChecksheetTemplate {
  machineCode: string
  machineName: string
  location?: string
  formCode: string
  revision: string
  effectiveDate?: string
  items: PMChecklistItem[]
}

export const PM_FORM_CODE = 'MT-WF-002D'
export const PM_FORM_REVISION = '00'
export const PM_FORM_TITLE = 'รายการตรวจสอบเครื่องมือเครื่องจักร (PM Check sheet)'

/**
 * Standard Catalog extracted directly from DCC MT-WF-002D Excel Check Sheets
 */
export const PM_CHECKSHEET_CATALOG: Record<string, PMChecksheetTemplate> = {
  // 1. Agitator Mixing 3000L / 2000L (AGI-MX-001 ~ AGI-MX-004)
  'AGI-MX-001': {
    machineCode: 'AGI-MX-001',
    machineName: 'Agitator mixing 3000L',
    location: 'Mixing 2',
    formCode: PM_FORM_CODE,
    revision: PM_FORM_REVISION,
    items: [
      {
        id: 1,
        category: '1. ระบบไฟฟ้า',
        item: 'ตรวจสอบ สวิตช์ on - off ควบคุมการทำงานมอเตอร์ Gear Box',
        standard: 'สวิตช์ทำงานคล่อง ไม่หลวม ไม่ติดขัด สั่งตัด-ต่อวงจรถูกต้อง',
        method: 'ตรวจเช็คด้วยสายตาและการกดสั่งงาน',
        readings: null
      },
      {
        id: 2,
        category: '2. มอเตอร์ Gear Box ใบกวน',
        item: 'วัดกระแสของมอเตอร์ Gear Box HOMO (U, V, W)',
        standard: 'กระแสไฟฟ้าแต่ละเฟสสมดุล ไม่เกินพิกัด Full Load Current (FLA)',
        method: 'ใช้ Clamp Meter วัดกระแสทีละเฟส',
        readings: { type: 'amp_uvw', fields: ['U', 'V', 'W'], unit: 'A' }
      },
      {
        id: 3,
        category: '2. มอเตอร์ Gear Box ใบกวน',
        item: 'ตรวจเช็คเสียงผิดปกติของ Bearing Motor',
        standard: 'หมุนเรียบเงียบ ไม่มีเสียงหวีดหรือเสียงโลหะเสียดสี',
        method: 'ฟังเสียงขณะมอเตอร์หมุนทำงาน',
        readings: null
      },
      {
        id: 4,
        category: '2. มอเตอร์ Gear Box ใบกวน',
        item: 'ตรวจสอบความร้อนของมอเตอร์ (°C)',
        standard: 'อุณหภูมิผิวไม่เกิน 75°C หรือตามพิกัดฉนวน Class B/F',
        method: 'วัดอุณหภูมิด้วยกล้องอินฟราเรด / ปืนเลเซอร์วัดความร้อน',
        readings: { type: 'temperature', fields: ['temp'], unit: '°C' }
      },
      {
        id: 5,
        category: '2. มอเตอร์ Gear Box ใบกวน',
        item: 'ตรวจเช็คความแน่นของฐานยึดมอเตอร์',
        standard: 'น็อตยึดแน่นทุกตัว ไม่มีการหลวมคลอนหรือสั่นสะเทือนผิดปกติ',
        method: 'ใช้ประแจกวดตรวจความแน่น',
        readings: null
      },
      {
        id: 6,
        category: '2. มอเตอร์ Gear Box ใบกวน',
        item: 'ตรวจเช็คสภาพของสายไฟควบคุมมอเตอร์',
        standard: 'ฉนวนสายไฟสมบูรณ์ ไม่มีรอยแตก ท่อร้อยสายและเคเบิ้ลแกลนด์แน่นหนา',
        method: 'ตรวจด้วยสายตาและสัมผัส',
        readings: null
      },
      {
        id: 7,
        category: '2. มอเตอร์ Gear Box ใบกวน',
        item: 'ทำความสะอาดพัดลมระบายความร้อน motor Blower',
        standard: 'ใบพัดลมสะอาด ไม่มีคราบฝุ่นเกาะหนา ตะแกรงระบายอากาศโปร่ง',
        method: 'เป่าลมทำความสะอาดและเช็ดคราบสกปรก',
        readings: null
      },
      {
        id: 8,
        category: '3. ชุดเกียร์ (Gear)',
        item: 'ตรวจเช็คดูระดับน้ำมันในชุด Gear อยู่ในระดับหรือไม่',
        standard: 'ระดับน้ำมันเกียร์อยู่ที่กึ่งกลางช่องตาแมว สีน้ำมันใสไม่ขุ่นดำ',
        method: 'ตรวจดูช่องวัดระดับน้ำมันเกียร์ (Sight Glass)',
        readings: null
      },
      {
        id: 9,
        category: '3. ชุดเกียร์ (Gear)',
        item: 'ตรวจเช็คชุด Main Gear มีเสียงดังขณะหมุนหรือไม่',
        standard: 'การขบของฟันเฟืองราบเรียบ ไม่มีเสียงกระแทกหรือเสียงกระตุก',
        method: 'ฟังเสียงขณะทำงานโหลดจริง',
        readings: null
      },
      {
        id: 10,
        category: '3. ชุดเกียร์ (Gear)',
        item: 'ตรวจเช็คตัวปรับความเร็ว (Speed Controller / Inverter)',
        standard: 'ปรับรอบความเร็วตอบสนองราบรื่น หน้าจอดิจิทัลแสดงผลปกติ',
        method: 'ทดสอบหมุนปรับสปีดจากต่ำไปสูง',
        readings: null
      },
      {
        id: 11,
        category: '4. สภาพของเครื่องจักร',
        item: 'ตรวจเช็คความสะอาดของเครื่อง',
        standard: 'ตัวถังและชิ้นส่วนภายนอกสะอาด ไม่มีคราบสารเคมีตกค้าง ตามเกณฑ์ GMP',
        method: 'ตรวจเช็คด้วยสายตา',
        readings: null
      },
      {
        id: 12,
        category: '4. สภาพของเครื่องจักร',
        item: 'ตรวจเช็คความสะอาดของตู้ควบคุมระบบไฟฟ้าเครื่องจักร',
        standard: 'ภายในตู้คอนโทรลสะอาด ปิดมิดชิด ปราศจากฝุ่นและแมลง',
        method: 'เปิดตรวจภายในตู้คอนโทรล',
        readings: null
      }
    ]
  },

  // 2. Liquid Filling Machine (FILL-PK-001 ~ FILL-PK-010)
  'FILL-PK-001': {
    machineCode: 'FILL-PK-001',
    machineName: 'Semi-automatic Liquid Filling Machine 100-1000 CC',
    location: 'Packing Area',
    formCode: PM_FORM_CODE,
    revision: PM_FORM_REVISION,
    items: [
      { id: 1, category: '1. ตรวจเช็คอุปกรณ์ลม', item: 'ตรวจเช็คข้อต่อลม', standard: 'ข้อต่อลมแน่น ไม่แตกร้าว ไม่มีเสียงลมรั่วซึม', method: 'ตรวจเช็คด้วยสายตาและฟังเสียง' },
      { id: 2, category: '1. ตรวจเช็คอุปกรณ์ลม', item: 'ตรวจเช็คกระบอกลม', standard: 'กระบอกลมเลื่อนราบรื่น แกนกระบอกไม่คดงอหรือมีรอยขูดขีด', method: 'ทดสอบการทำงาน' },
      { id: 3, category: '1. ตรวจเช็คอุปกรณ์ลม', item: 'ตรวจเช็คการทำงานของเรกูเลเตอร์ควบคุมแรงดัน', standard: 'ปรับแรงดันได้ตามสเปก เกจวัดแสดงผลตรง ไม่ตก', method: 'ตรวจดูเกจวัดแรงดัน' },
      { id: 4, category: '2. ตรวจเช็คระบบไฟฟ้า', item: 'ตรวจเช็คสายไฟและปลั๊กไฟ', standard: 'สายไฟไม่ชำรุด ปลั๊กเสียบแน่น ไม่มีความร้อนสะสม', method: 'ตรวจด้วยสายตาและสัมผัส' },
      { id: 5, category: '2. ตรวจเช็คระบบไฟฟ้า', item: 'ตรวจเช็คการทำงานสวิตช์เปิดปิด', standard: 'ปุ่มกดทำงานแม่นยำ ไม่ค้าง', method: 'กดทดสอบ' },
      { id: 6, category: '2. ตรวจเช็คระบบไฟฟ้า', item: 'ตรวจเช็คการทำงานสวิตช์เท้าเหยียบ (Foot Switch)', standard: 'เหยียบสั่งจ่ายครบรอบและคืนตัวทันที', method: 'เหยดทดสอบ 5 รอบ' },
      { id: 7, category: '3. ตรวจเช็คระบบบรรจุหัวที่ 1', item: 'ตรวจเช็คซีลกระบอกสูบ', standard: 'ซีลเทฟลอน/โอริงไม่บวม ไม่เปื่อย สารไม่รั่วซึม', method: 'ถอดตรวจสภาพซีล' },
      { id: 8, category: '3. ตรวจเช็คระบบบรรจุหัวที่ 1', item: 'ตรวจเช็คกระบอกสูบ', standard: 'ผิวกระบอกสูบด้านในเรียบเงา ไม่มีรอยตามด', method: 'ตรวจด้วยสายตา' },
      { id: 9, category: '3. ตรวจเช็คระบบบรรจุหัวที่ 1', item: 'ตรวจเช็คระบบโรตารี่วาล์ว', standard: 'หมุนสลับทิศทางการดูด-จ่ายสัมพันธ์กับลูกสูบ', method: 'ทดสอบการทำงาน' },
      { id: 10, category: '3. ตรวจเช็คระบบบรรจุหัวที่ 1', item: 'ตรวจเช็ควาล์วหัวบรรจุ (Nozzle Valve)', standard: 'หัวจ่ายปิดสนิท สารไม่หยดหลังหยุดจ่าย (No Drip)', method: 'ทดสอบการจ่ายน้ำ/สาร' },
      { id: 11, category: '3. ตรวจเช็คระบบบรรจุหัวที่ 1', item: 'ตรวจเช็คชุดปรับปริมาตรน้ำหนัก', standard: 'ตัวล็อคสเกลแน่นหนา ปรับตั้งได้แม่นยำ', method: 'หมุนปรับและล็อค' },
      { id: 12, category: '4. ตรวจเช็คระบบบรรจุหัวที่ 2', item: 'ตรวจเช็คซีลกระบอกสูบ', standard: 'ซีลเทฟลอน/โอริงไม่บวม ไม่เปื่อย สารไม่รั่วซึม', method: 'ถอดตรวจสภาพซีล' },
      { id: 13, category: '4. ตรวจเช็คระบบบรรจุหัวที่ 2', item: 'ตรวจเช็คกระบอกสูบ', standard: 'ผิวกระบอกสูบด้านในเรียบเงา ไม่มีรอยตามด', method: 'ตรวจด้วยสายตา' },
      { id: 14, category: '4. ตรวจเช็คระบบบรรจุหัวที่ 2', item: 'ตรวจเช็คระบบโรตารี่วาล์ว', standard: 'หมุนสลับทิศทางการดูด-จ่ายสัมพันธ์กับลูกสูบ', method: 'ทดสอบการทำงาน' },
      { id: 15, category: '4. ตรวจเช็คระบบบรรจุหัวที่ 2', item: 'ตรวจเช็ควาล์วหัวบรรจุ (Nozzle Valve)', standard: 'หัวจ่ายปิดสนิท สารไม่หยดหลังหยุดจ่าย', method: 'ทดสอบการจ่ายน้ำ/สาร' },
      { id: 16, category: '4. ตรวจเช็คระบบบรรจุหัวที่ 2', item: 'ตรวจเช็คชุดปรับปริมาตรน้ำหนัก', standard: 'ตัวล็อคสเกลแน่นหนา ปรับตั้งได้แม่นยำ', method: 'หมุนปรับและล็อค' }
    ]
  },

  // 3. Vacuum Homomixer (VACH-MX-001)
  'VACH-MX-001': {
    machineCode: 'VACH-MX-001',
    machineName: 'Vacuum Homomixer 100 L',
    location: 'Mixing 5',
    formCode: PM_FORM_CODE,
    revision: PM_FORM_REVISION,
    items: [
      { id: 1, category: '1. ระบบไฟฟ้า', item: 'ตรวจเช็คการทำงานของ Emergency Switch', standard: 'กดตัดระบบทันที และปลดล็อคได้ปกติ', method: 'กดทดสอบฉุกเฉิน' },
      { id: 2, category: '1. ระบบไฟฟ้า', item: 'ตรวจสอบการทำงานของ Switch Up-Down ยกฝาถัง', standard: 'ทำงานนุ่มนวล ไม่กระตุก มีเซฟตี้หยุดทำงาน', method: 'กดทดสอบยกขึ้นลง' },
      { id: 3, category: '1. ระบบไฟฟ้า', item: 'ตรวจสอบ Limit Switch ชุดเปิด-ปิด ฝาถัง', standard: 'ตัดการทำงานของใบกวนเมื่อฝาเปิดอยู่ ป้องกันอุบัติเหตุ', method: 'ทดสอบ Interlock' },
      { id: 4, category: '2. Homogenizer', item: 'วัดกระแสของมอเตอร์โฮโม (U, V, W)', standard: 'กระแสแต่ละเฟสสมดุล ไม่เกินพิกัด FLA', method: 'ใช้ Clamp Meter วัด', readings: { type: 'amp_uvw', fields: ['U', 'V', 'W'], unit: 'A' } },
      { id: 5, category: '2. Homogenizer', item: 'ตรวจเช็คเสียงผิดปกติของ Bearing Motor', standard: 'หมุนรอบสูงเงียบ ไม่สั่นกระพือ', method: 'ฟังเสียงรอบสูง' },
      { id: 6, category: '2. Homogenizer', item: 'ตรวจเช็คชุดปรับความเร็วรอบ Inverter', standard: 'ปรับสปีดได้ตามย่านความถี่ 0-3000 RPM', method: 'ทดสอบปรับสปีด' },
      { id: 7, category: '3. Scraper (ใบปาดข้าง)', item: 'วัดกระแสของมอเตอร์ Scraper (U, V, W)', standard: 'กระแสไม่เกินพิกัด', method: 'ใช้ Clamp Meter วัด', readings: { type: 'amp_uvw', fields: ['U', 'V', 'W'], unit: 'A' } },
      { id: 8, category: '3. Scraper (ใบปาดข้าง)', item: 'ตรวจเช็คใบมีดปาดเทฟลอน (Teflon Blade)', standard: 'ใบปาดแนบสนิทกับผนังถัง ไม่บิ่น ไม่สึกหรอเกินเกณฑ์', method: 'ตรวจเช็คด้วยสายตา' },
      { id: 9, category: '3. Scraper (ใบปาดข้าง)', item: 'ตรวจเช็คจุดรั่วของน้ำมันเกียร์และระดับน้ำมันเกียร์', standard: 'ไม่มีคราบน้ำมันเกียร์หยดปนเปื้อน ระดับอยู่กึ่งกลางตาแมว', method: 'ตรวจดูช่องตาแมว' },
      { id: 10, category: '4. Agitator (ใบกวนกลาง)', item: 'วัดกระแสของมอเตอร์ใบกวน (U, V, W)', standard: 'กระแสสมดุลทั้ง 3 เฟส', method: 'ใช้ Clamp Meter วัด', readings: { type: 'amp_uvw', fields: ['U', 'V', 'W'], unit: 'A' } },
      { id: 11, category: '4. Agitator (ใบกวนกลาง)', item: 'ตรวจเช็คเสียงผิดปกติของ Bearing Motor ใบกวน', standard: 'หมุนเงียบ ไม่มีเสียงกระแทก', method: 'ฟังเสียงขณะหมุน' },
      { id: 12, category: '5. HEATER', item: 'วัดกระแสของ Heater (U, V, W)', standard: 'กระแสกินไฟเท่ากันทุกเฟส ฮีตเตอร์ไม่ขาด', method: 'ใช้ Clamp Meter วัด', readings: { type: 'amp_uvw', fields: ['U', 'V', 'W'], unit: 'A' } },
      { id: 13, category: '6. ชุดรอกไฟฟ้า', item: 'วัดกระแสของรอกไฟฟ้า (A)', standard: 'กระแสไม่เกินพิกัด สลิงไม่แตก ไม่เป็นสนิม', method: 'ใช้ Clamp Meter วัด', readings: { type: 'amp_single', fields: ['Amp'], unit: 'A' } }
    ]
  }
}

// Copy AGI-MX-001 for 002, 003, 004 and AGI-MX prefix
PM_CHECKSHEET_CATALOG['AGI-MX-002'] = { ...PM_CHECKSHEET_CATALOG['AGI-MX-001'], machineCode: 'AGI-MX-002', machineName: 'Agitator mixing 3000L' }
PM_CHECKSHEET_CATALOG['AGI-MX-003'] = { ...PM_CHECKSHEET_CATALOG['AGI-MX-001'], machineCode: 'AGI-MX-003', machineName: 'Agitator mixing 2000L', location: 'Mixing 1' }
PM_CHECKSHEET_CATALOG['AGI-MX-004'] = { ...PM_CHECKSHEET_CATALOG['AGI-MX-001'], machineCode: 'AGI-MX-004', machineName: 'Agitator mixing 2000L', location: 'Mixing 2' }
PM_CHECKSHEET_CATALOG['AGI-MX'] = { ...PM_CHECKSHEET_CATALOG['AGI-MX-001'], machineCode: 'AGI-MX', machineName: 'Agitator mixing Standard' }

// Copy FILL-PK-001 for 002..010 and prefix
for (let i = 2; i <= 10; i++) {
  const code = `FILL-PK-${String(i).padStart(3, '0')}`
  PM_CHECKSHEET_CATALOG[code] = {
    ...PM_CHECKSHEET_CATALOG['FILL-PK-001'],
    machineCode: code,
    machineName: `Liquid Filling Machine No.${i}`
  }
}
PM_CHECKSHEET_CATALOG['FILL-PK'] = { ...PM_CHECKSHEET_CATALOG['FILL-PK-001'], machineCode: 'FILL-PK' }
PM_CHECKSHEET_CATALOG['VACH-MX'] = { ...PM_CHECKSHEET_CATALOG['VACH-MX-001'], machineCode: 'VACH-MX' }

/**
 * Lookup Function: Get matching PM Checksheet Template
 */
export function getPMChecksheetTemplate(
  machineCode: string,
  machineName?: string,
  existingChecklist?: any[]
): PMChecksheetTemplate {
  const cleanCode = (machineCode || '').trim().toUpperCase()

  // 1. Exact Match
  if (PM_CHECKSHEET_CATALOG[cleanCode]) {
    return PM_CHECKSHEET_CATALOG[cleanCode]
  }

  // 2. Prefix Match (e.g. AGI-MX, FILL-PK, VACH-MX)
  for (const prefix of Object.keys(PM_CHECKSHEET_CATALOG)) {
    if (cleanCode.startsWith(prefix)) {
      return {
        ...PM_CHECKSHEET_CATALOG[prefix],
        machineCode: cleanCode,
        machineName: machineName || PM_CHECKSHEET_CATALOG[prefix].machineName
      }
    }
  }

  // 3. Fallback from DB Plan checklist if present
  if (Array.isArray(existingChecklist) && existingChecklist.length > 0) {
    return {
      machineCode: cleanCode,
      machineName: machineName || 'เครื่องจักร',
      formCode: PM_FORM_CODE,
      revision: PM_FORM_REVISION,
      items: existingChecklist.map((c, idx) => ({
        id: c.id || idx + 1,
        category: c.category || 'รายการตรวจเช็คมาตรฐาน',
        item: c.item,
        standard: c.standard || 'ใช้งานได้ปกติ',
        method: c.method || 'ตรวจด้วยสายตาและการทำงาน',
        readings: c.readings || null
      }))
    }
  }

  // 4. Default Standard Checklist
  return {
    machineCode: cleanCode,
    machineName: machineName || 'เครื่องจักร',
    formCode: PM_FORM_CODE,
    revision: PM_FORM_REVISION,
    items: [
      { id: 1, category: '1. ระบบไฟฟ้า', item: 'ตรวจเช็คสายไฟ สวิตช์เปิด-ปิด และการต่อสายดิน', standard: 'สายไฟสมบูรณ์ ไม่มีรอยแตก ขั้วต่อแน่น มีสายดิน', method: 'ตรวจเช็คด้วยสายตา' },
      { id: 2, category: '2. มอเตอร์ & กลไกขับเคลื่อน', item: 'วัดกระแสไฟฟ้าขณะมอเตอร์ทำงาน (Amp)', standard: 'กระแสไม่เกินพิกัด Full Load Current (FLA)', method: 'ใช้ Clamp Meter วัด', readings: { type: 'amp_single', fields: ['Amp'], unit: 'A' } },
      { id: 3, category: '2. มอเตอร์ & กลไกขับเคลื่อน', item: 'ตรวจเช็คเสียงและการสั่นสะเทือนของตลับลูกปืน', standard: 'หมุนราบเรียบ ไม่มีเสียงหวีดหรือสั่นสะเทือนผิดปกติ', method: 'ฟังเสียงขณะทำงาน' },
      { id: 4, category: '3. ระบบหล่อลื่น & สารหล่อลื่น', item: 'ตรวจเช็คระดับน้ำมันหล่อลื่นและอัดจารบี', standard: 'ระดับน้ำมันอยู่ในเกณฑ์มาตรฐาน ไม่มีการรั่วซึม', method: 'ตรวจระดับและเติมจารบี' },
      { id: 5, category: '4. สภาพเครื่องจักร & ความสะอาด', item: 'ตรวจเช็คความสะอาดตามเกณฑ์ GMP และความแน่นของโครงสร้าง', standard: 'สะอาด ปราศจากคราบตกค้าง น็อตยึดแน่นทุกจุด', method: 'ตรวจเช็คด้วยสายตาและขันกวด' }
    ]
  }
}
