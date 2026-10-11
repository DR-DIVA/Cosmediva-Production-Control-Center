/**
 * Maintenance Helper Utilities
 * Automatic department/area classification based on machine code standards
 */

export interface DepartmentClassification {
  deptKey: 'RM' | 'Mixing' | 'Packing' | 'QC' | 'RD' | 'Utility' | 'Production' | 'Other'
  department: string
  area: string
  shortLabel: string
  icon: string
}

export const DEPARTMENTS_LIST = [
  {
    key: 'all',
    label: 'ทุกสังกัด/แผนก (All Departments)',
    shortLabel: 'ทั้งหมด',
    icon: '🏢'
  },
  {
    key: 'RM',
    label: 'แผนก RM (Raw Materials / Warehouse)',
    shortLabel: 'แผนก RM / Warehouse',
    codePattern: 'MM',
    icon: '📦'
  },
  {
    key: 'Mixing',
    label: 'แผนกผสม (Mixing Department)',
    shortLabel: 'แผนกผสม (Mixing)',
    codePattern: 'MX',
    icon: '🧪'
  },
  {
    key: 'Packing',
    label: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
    shortLabel: 'แผนกบรรจุ (Packing)',
    codePattern: 'PK',
    icon: '🧴'
  },
  {
    key: 'QC',
    label: 'ฝ่ายควบคุมคุณภาพ (Quality Control - QC)',
    shortLabel: 'ฝ่ายควบคุมคุณภาพ (QC)',
    codePattern: 'QC',
    icon: '🔬'
  },
  {
    key: 'RD',
    label: 'ฝ่ายวิจัยและพัฒนา (R&D)',
    shortLabel: 'ฝ่ายวิจัยและพัฒนา (R&D)',
    codePattern: 'RD',
    icon: '💡'
  },
  {
    key: 'Utility',
    label: 'ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)',
    shortLabel: 'วิศวกรรม & Utility',
    codePattern: 'CMD',
    icon: '⚙️'
  },
  {
    key: 'Production',
    label: 'ฝ่ายผลิตทั่วไป (Production)',
    shortLabel: 'ฝ่ายผลิต (Production)',
    codePattern: 'PD',
    icon: '🏭'
  }
]

export const DEPARTMENTS = [
  'แผนก RM (Raw Materials / Warehouse)',
  'แผนกผสม (Mixing Department)',
  'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
  'ฝ่ายควบคุมคุณภาพ (Quality Control - QC)',
  'ฝ่ายวิจัยและพัฒนา (R&D)',
  'ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)',
  'ฝ่ายผลิตทั่วไป (Production)',
  'สำนักงาน / ส่วนกลาง (Office / Common)',
  'อื่นๆ (Other)'
]

export const CATEGORIES_LIST = [
  'all',
  'Mixing',
  'Filling',
  'Capping',
  'Labeling',
  'Sealing',
  'Inspection',
  'Utility',
  'Quality Control',
  'R&D Lab',
  'Packaging',
  'Material Handling',
  'General Machinery',
  'Other'
]

/**
 * Automatically determine department and default area from machine code
 * e.g., 'BAL-MM-002' -> { deptKey: 'RM', department: 'แผนก RM (Raw Materials / Warehouse)', area: 'Warehouse' }
 */
export function resolveDepartmentAndAreaFromCode(code: string): DepartmentClassification | null {
  if (!code) return null
  const c = code.toUpperCase().trim()

  // 1. Raw Materials / Warehouse (-MM-)
  if (c.includes('-MM-') || c.startsWith('MM-')) {
    return {
      deptKey: 'RM',
      department: 'แผนก RM (Raw Materials / Warehouse)',
      area: 'Warehouse',
      shortLabel: 'แผนก RM / Warehouse',
      icon: '📦'
    }
  }

  // 2. Mixing (-MX-)
  if (c.includes('-MX-') || c.startsWith('MX-') || c.startsWith('HG-') || c.startsWith('VACH-')) {
    return {
      deptKey: 'Mixing',
      department: 'แผนกผสม (Mixing Department)',
      area: 'Mixing Area',
      shortLabel: 'แผนกผสม (Mixing)',
      icon: '🧪'
    }
  }

  // 3. Packing (-PK-)
  if (
    c.includes('-PK-') ||
    c.startsWith('PK-') ||
    c.startsWith('FL-') ||
    c.startsWith('CP-') ||
    c.startsWith('LB-') ||
    c.startsWith('ACAP-') ||
    c.startsWith('AFILL-') ||
    c.startsWith('ASEA-')
  ) {
    return {
      deptKey: 'Packing',
      department: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)',
      area: 'Packing Area',
      shortLabel: 'แผนกบรรจุ (Packing)',
      icon: '🧴'
    }
  }

  // 4. QC (-QC-)
  if (c.includes('-QC-') || c.startsWith('QC-') || c.startsWith('CDM-') || c.startsWith('INST-')) {
    return {
      deptKey: 'QC',
      department: 'ฝ่ายควบคุมคุณภาพ (Quality Control - QC)',
      area: 'QC LAB',
      shortLabel: 'ฝ่ายควบคุมคุณภาพ (QC)',
      icon: '🔬'
    }
  }

  // 5. R&D (-RD-)
  if (c.includes('-RD-') || c.startsWith('RD-')) {
    return {
      deptKey: 'RD',
      department: 'ฝ่ายวิจัยและพัฒนา (R&D)',
      area: 'RD LAB',
      shortLabel: 'ฝ่ายวิจัยและพัฒนา (R&D)',
      icon: '💡'
    }
  }

  // 6. Utility & Engineering (-CMD-)
  if (
    c.includes('-CMD-') ||
    c.startsWith('CMD-') ||
    c.startsWith('AC-') ||
    c.startsWith('CH-') ||
    c.startsWith('RO-') ||
    c.startsWith('AHU-') ||
    c.startsWith('DUS-') ||
    c === 'FACILITY'
  ) {
    return {
      deptKey: 'Utility',
      department: 'ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)',
      area: 'Utility Building',
      shortLabel: 'วิศวกรรม & Utility',
      icon: '⚙️'
    }
  }

  // 7. Production (-PD-)
  if (
    c.includes('-PD-') ||
    c.startsWith('PD-') ||
    c.startsWith('LIFT-') ||
    c.startsWith('DRT-') ||
    c.startsWith('HANL-') ||
    c.startsWith('STAK-')
  ) {
    return {
      deptKey: 'Production',
      department: 'ฝ่ายผลิตทั่วไป (Production)',
      area: 'Production Area',
      shortLabel: 'ฝ่ายผลิต (Production)',
      icon: '🏭'
    }
  }

  return null
}

/**
 * Format any date or timestamp strictly to Day-Month-Year (วัน เดือน ปี เสมอ)
 * e.g. "30/09/2026" or "30 ก.ย. 2026"
 */
export function formatThaiDate(dateStr?: string | null, format: 'numeric' | 'short' | 'long' = 'short'): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr

  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()

  if (format === 'numeric') {
    return `${day}/${month}/${year}`
  }

  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const thaiMonthsLong = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]

  if (format === 'long') {
    return `${d.getDate()} ${thaiMonthsLong[d.getMonth()]} ${year}`
  }

  return `${d.getDate()} ${thaiMonthsShort[d.getMonth()]} ${year}`
}

/**
 * Format any date or timestamp strictly to Day-Month-Year with time (วัน เดือน ปี เวลา เสมอ)
 * e.g. "30 ก.ย. 2026 16:32 น."
 */
export function formatThaiDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr

  const datePart = formatThaiDate(dateStr, 'short')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${datePart} ${hours}:${minutes} น.`
}

export interface ParsedActivityDetail {
  symptom: string           // อาการเสีย
  location: string          // จุดเกิดเหตุ/สถานที่
  repairType: string        // ประเภท
  requesterDept: string     // แผนกผู้แจ้ง
  urgency: string           // ความเร่งด่วน
  problemCategory: string   // หมวดปัญหา
  actionDetails: string     // รายละเอียด / สิ่งที่เปลี่ยนแปลง
}

/**
 * Parse and separate bundled activity details into dedicated individual fields
 * Supporting both explicit item breakdown fields and backward-compatible raw details strings.
 */
export function parseActivityLogDetails(
  details?: string | null,
  context?: {
    symptom?: string | null
    location?: string | null
    repairType?: string | null
    requesterDept?: string | null
    urgency?: string | null
    problemCategory?: string | null
    symptomDescription?: string | null
    symptomCategory?: string | null
    priority?: string | null
    requesterDepartment?: string | null
    departmentName?: string | null
    machineCode?: string | null
    activityType?: string
  }
): ParsedActivityDetail {
  const text = details || ''
  const rawDesc = context?.symptomDescription || ''

  // 1. จุดเกิดเหตุ/สถานที่
  let location = context?.location || ''
  if (!location || location === '-') {
    const locMatch = (text + '\n' + rawDesc).match(/📍\s*จุดเกิดเหตุ\/สถานที่:\s*([^\n\r•]+)/)
    if (locMatch) {
      location = locMatch[1].trim()
    } else if (context?.machineCode) {
      const res = resolveDepartmentAndAreaFromCode(context.machineCode)
      if (res?.area) location = res.area
    }
  }
  if (!location) location = '-'

  // 2. ประเภท
  let repairType = context?.repairType || ''
  if (!repairType || repairType === '-') {
    const typeMatch = (text + '\n' + rawDesc).match(/\[ประเภท:\s*([^\]]+)\]/)
    if (typeMatch) {
      repairType = typeMatch[1].trim()
    } else if (context?.activityType === 'PM_EXECUTED') {
      repairType = 'บำรุงรักษาเชิงป้องกัน (PM)'
    } else if (context?.activityType?.startsWith('MACHINE_')) {
      repairType = 'ทะเบียนเครื่องจักร (Machine Master)'
    }
  }
  if (!repairType) repairType = '-'

  // 3. แผนกผู้แจ้ง
  let requesterDept = context?.requesterDept || ''
  if (!requesterDept || requesterDept === '-') {
    const deptMatch = text.match(/•\s*แผนกผู้แจ้ง:\s*([^•\n\r]+)/)
    if (deptMatch) {
      requesterDept = deptMatch[1].trim()
    } else if (context?.requesterDepartment) {
      requesterDept = context.requesterDepartment
    } else if (context?.departmentName) {
      requesterDept = context.departmentName
    }
  }
  if (!requesterDept) requesterDept = '-'

  // 4. ความเร่งด่วน
  let urgency = context?.urgency || ''
  if (!urgency || urgency === '-') {
    const urgMatch = text.match(/•\s*ความเร่งด่วน:\s*([^•\n\r]+)/)
    if (urgMatch) {
      urgency = urgMatch[1].trim()
    } else if (context?.priority) {
      urgency = 
        context.priority === 'P1_CRITICAL' ? 'ด่วนฉุกเฉิน (P1)' :
        context.priority === 'P2_HIGH' ? 'ด่วนสูง (P2)' :
        context.priority === 'P3_NORMAL' ? 'ปกติ (P3)' :
        context.priority === 'P4_LOW' ? 'ต่ำ (P4)' : context.priority
    }
  }
  if (!urgency) urgency = '-'

  // 5. หมวดปัญหา
  let problemCategory = context?.problemCategory || ''
  if (!problemCategory || problemCategory === '-') {
    const catMatch = text.match(/•\s*หมวดปัญหา:\s*([^•\n\r]+)/)
    if (catMatch) {
      problemCategory = catMatch[1].trim()
    } else if (context?.symptomCategory) {
      problemCategory = context.symptomCategory
    }
  }
  if (!problemCategory) problemCategory = '-'

  // 6. อาการเสีย
  let symptom = context?.symptom || ''
  if (!symptom || symptom === '-') {
    if (text.includes('อาการเสีย:')) {
      let symPart = text.split('อาการเสีย:')[1]
      symPart = symPart.split('• แผนกผู้แจ้ง:')[0]
      symPart = symPart.split('• ความเร่งด่วน:')[0]
      symPart = symPart.split('• หมวดปัญหา:')[0]
      symPart = symPart.replace(/📍\s*จุดเกิดเหตุ\/สถานที่:[^\n\r]*/g, '')
      symPart = symPart.replace(/\[ประเภท:[^\]]+\]/g, '')
      symPart = symPart.trim()
      if (symPart && symPart !== '-') symptom = symPart
    } else if (rawDesc) {
      let symPart = rawDesc
      symPart = symPart.replace(/📍\s*จุดเกิดเหตุ\/สถานที่:[^\n\r]*/g, '')
      symPart = symPart.replace(/\[ประเภท:[^\]]+\]/g, '')
      symPart = symPart.trim()
      if (symPart) symptom = symPart
    } else if (context?.symptomCategory) {
      symptom = context.symptomCategory
    }
  }
  if (!symptom) symptom = '-'

  // 7. Action details / สิ่งที่เปลี่ยนแปลง
  let actionDetails = '-'
  if (text.includes('การแก้ไข:') || text.includes('ผลการตรวจ:')) {
    actionDetails = text
  } else if (!text.includes('อาการเสีย:')) {
    actionDetails = text.trim() || '-'
  }

  return {
    symptom,
    location,
    repairType,
    requesterDept,
    urgency,
    problemCategory,
    actionDetails
  }
}


