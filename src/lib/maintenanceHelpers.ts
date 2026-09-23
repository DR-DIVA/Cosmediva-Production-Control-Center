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
