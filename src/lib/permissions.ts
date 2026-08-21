export interface AppModuleItem {
  id: string
  label: string
  shortLabel: string
  href: string
  iconName?: string
  subModules?: {
    id: string
    label: string
    href: string
  }[]
}

export const APP_MODULES: AppModuleItem[] = [
  {
    id: 'dashboard',
    label: 'CosmeFlow Dashboard',
    shortLabel: 'แดชบอร์ดภาพรวม',
    href: '/dashboard',
  },
  {
    id: 'planner',
    label: 'CosmeFlow Planning',
    shortLabel: 'วางแผนการผลิตแม่บท',
    href: '/planner',
  },
  {
    id: 'incoming-rm',
    label: 'CosmeFlow Material Control',
    shortLabel: 'ควบคุมวัตถุดิบ (RM/PM)',
    href: '/incoming-rm',
  },
  {
    id: 'production',
    label: 'CosmeFlow Production',
    shortLabel: 'กระบวนการผลิต',
    href: '/my-tasks',
    subModules: [
      { id: 'production_overview', label: 'ภาพรวม (Overview)', href: '/my-tasks/overview' },
      { id: 'production_weighing', label: 'ชั่งสาร (Weighing)', href: '/my-tasks/weighing' },
      { id: 'production_mixing', label: 'งานผสม (Mixing)', href: '/my-tasks/mixing' },
      { id: 'production_packing', label: 'งานบรรจุ (Packing)', href: '/my-tasks/packing' },
      { id: 'production_pof', label: 'งานลงลัง (Cartoning/POF)', href: '/my-tasks/pof' },
    ]
  },
  {
    id: 'qc',
    label: 'CosmeFlow Quality',
    shortLabel: 'ตรวจคุณภาพแล็บ (QC)',
    href: '/qc-queue',
  },
  {
    id: 'issues',
    label: 'CosmeFlow Assurance',
    shortLabel: 'ระบบจัดการปัญหา (QA)',
    href: '/issues',
  },
  {
    id: 'fg',
    label: 'CosmeFlow FG Warehouse',
    shortLabel: 'คลังสินค้าสำเร็จรูป (FG)',
    href: '/my-tasks/fg',
  },
  {
    id: 'purchase',
    label: 'CosmeFlow Purchase',
    shortLabel: 'จัดซื้อวัตถุดิบ (Purchase)',
    href: '/purchase',
  },
  {
    id: 'maintenance',
    label: 'CosmeFlow Maintenance',
    shortLabel: 'ซ่อมบำรุงเครื่องจักร',
    href: '/maintenance',
  },
  {
    id: 'people',
    label: 'CosmeFlow People',
    shortLabel: 'บุคลากร (People)',
    href: '/people',
  },
  {
    id: 'costing',
    label: 'CosmeFlow Costing',
    shortLabel: 'ต้นทุนการผลิต (Costing)',
    href: '/costing',
  },
  {
    id: 'master-data',
    label: 'ข้อมูลหลัก (Master Data)',
    shortLabel: 'ข้อมูลหลัก & ผู้ใช้งาน',
    href: '/master-data',
  },
]

export const ROLE_TEMPLATES: Record<string, { label: string; modules: string[] }> = {
  admin: {
    label: 'ผู้ดูแลระบบ (Admin - เข้าได้ทุกโมดูล)',
    modules: [
      'dashboard', 'planner', 'incoming-rm', 'production', 
      'production_overview', 'production_weighing', 'production_mixing', 'production_packing', 'production_pof',
      'qc', 'issues', 'fg', 'purchase', 'maintenance', 'people', 'costing', 'master-data'
    ]
  },
  planner: {
    label: 'ฝ่ายวางแผนผลิต (Planning)',
    modules: [
      'dashboard', 'planner', 'incoming-rm', 'production', 
      'production_overview', 'production_weighing', 'production_mixing', 'production_packing', 'production_pof',
      'qc', 'fg', 'purchase', 'costing'
    ]
  },
  production_mx: {
    label: 'แผนกผสม (Production MX)',
    modules: ['dashboard', 'incoming-rm', 'production', 'production_overview', 'production_weighing', 'production_mixing', 'issues']
  },
  production_pk: {
    label: 'แผนกบรรจุและลงลัง (Production PK/POF)',
    modules: ['dashboard', 'production', 'production_overview', 'production_packing', 'production_pof', 'issues']
  },
  qc: {
    label: 'ฝ่ายควบคุมคุณภาพ (QC)',
    modules: [
      'dashboard', 'incoming-rm', 'production', 
      'production_overview', 'production_weighing', 'production_mixing', 'production_packing', 'production_pof',
      'qc', 'issues'
    ]
  },
  qa: {
    label: 'ฝ่ายประกันคุณภาพ (QA)',
    modules: [
      'dashboard', 'incoming-rm', 'production', 
      'production_overview', 'production_weighing', 'production_mixing', 'production_packing', 'production_pof',
      'qc', 'issues'
    ]
  },
  ra: {
    label: 'ฝ่ายขึ้นทะเบียน (Regulatory Affairs - RA)',
    modules: ['dashboard', 'planner', 'incoming-rm', 'qc', 'issues', 'master-data']
  },
  acc: {
    label: 'ฝ่ายบัญชีและการเงิน (Accounting - ACC)',
    modules: ['dashboard', 'planner', 'costing', 'purchase', 'fg', 'master-data']
  },
  production: {
    label: 'ฝ่ายผลิต (Production - ทุกสถานี)',
    modules: [
      'dashboard', 'incoming-rm', 'production', 
      'production_overview', 'production_weighing', 'production_mixing', 'production_packing', 'production_pof',
      'qc', 'issues'
    ]
  },
  warehouse_mmrm_bu: {
    label: 'คลังวัตถุดิบ (MMRM / BU)',
    modules: ['dashboard', 'incoming-rm', 'production', 'production_weighing']
  },
  warehouse_mmpm_fg: {
    label: 'คลังบรรจุภัณฑ์และ FG (MMPM / FG)',
    modules: ['dashboard', 'incoming-rm', 'fg']
  },
  purchase: {
    label: 'ฝ่ายจัดซื้อ (Purchase)',
    modules: ['dashboard', 'incoming-rm', 'purchase']
  },
  maintenance: {
    label: 'ฝ่ายซ่อมบำรุง (Maintenance)',
    modules: ['dashboard', 'maintenance']
  },
  people: {
    label: 'ฝ่ายบุคคล (HR/People)',
    modules: ['dashboard', 'people']
  }
}

/**
 * Check whether a user with `userRole` has access to a specific route href or submodule href
 */
export function hasAccessToRoute(href: string, userRole?: string | null): boolean {
  if (!userRole) return false
  if (userRole === 'admin') return true

  let allowedList: string[] = []

  if (userRole.startsWith('custom:')) {
    allowedList = userRole.replace('custom:', '').split(',').map(s => s.trim()).filter(Boolean)
  } else if (ROLE_TEMPLATES[userRole]) {
    allowedList = ROLE_TEMPLATES[userRole].modules
  } else {
    // If standard role string, check if it directly matches legacy rules
    return true
  }

  // Exact or prefix checks
  if (href === '/dashboard' && allowedList.includes('dashboard')) return true
  if (href === '/planner' && allowedList.includes('planner')) return true
  if (href === '/incoming-rm' && allowedList.includes('incoming-rm')) return true
  
  if (href === '/my-tasks') {
    return allowedList.includes('production') || allowedList.some(a => a.startsWith('production_'))
  }
  if (href === '/my-tasks/overview') {
    return allowedList.includes('production') || allowedList.includes('production_overview')
  }
  if (href === '/my-tasks/weighing') {
    return allowedList.includes('production') || allowedList.includes('production_weighing')
  }
  if (href === '/my-tasks/mixing') {
    return allowedList.includes('production') || allowedList.includes('production_mixing')
  }
  if (href === '/my-tasks/packing') {
    return allowedList.includes('production') || allowedList.includes('production_packing')
  }
  if (href === '/my-tasks/pof') {
    return allowedList.includes('production') || allowedList.includes('production_pof')
  }

  if (href === '/qc-queue' && allowedList.includes('qc')) return true
  if (href === '/issues' && allowedList.includes('issues')) return true
  if (href === '/my-tasks/fg' && allowedList.includes('fg')) return true
  if (href === '/purchase' && allowedList.includes('purchase')) return true
  if (href === '/maintenance' && allowedList.includes('maintenance')) return true
  if (href === '/people' && allowedList.includes('people')) return true
  if (href.startsWith('/costing') && allowedList.includes('costing')) return true
  if (href.startsWith('/master-data') && allowedList.includes('master-data')) return true

  return false
}

/**
 * Get readable badges / description for a given user role
 */
export function getRoleDisplay(role: string): { label: string; className: string; moduleCount?: number } {
  if (role === 'admin') {
    return { label: 'ผู้ดูแลระบบ (Admin)', className: 'bg-purple-100 text-purple-700 border-purple-200' }
  }
  if (role.startsWith('custom:')) {
    const list = role.replace('custom:', '').split(',').map(s => s.trim()).filter(Boolean)
    return { 
      label: `สิทธิ์กำหนดเอง (${list.length} โมดูล)`, 
      className: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
      moduleCount: list.length 
    }
  }
  if (ROLE_TEMPLATES[role]) {
    const templateName = ROLE_TEMPLATES[role].label.split(' (')[0]
    return { 
      label: templateName, 
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200' 
    }
  }

  return { label: role, className: 'bg-slate-100 text-slate-700 border-slate-200' }
}
