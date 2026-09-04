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

export type AccessLevel = 'NONE' | 'VIEW' | 'EDIT'

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
    id: 'improve',
    label: 'CosmeFlow Improve',
    shortLabel: 'เพิ่มประสิทธิภาพ & ลดต้นทุน (OpEx)',
    href: '/improve',
  },
  {
    id: 'master-data',
    label: 'ข้อมูลหลัก (Master Data)',
    shortLabel: 'ข้อมูลหลัก & ผู้ใช้งาน',
    href: '/master-data',
  },
]

export const ALL_MODULE_IDS = [
  'dashboard', 'planner', 'incoming-rm', 'production_overview', 'production_weighing', 
  'production_mixing', 'production_packing', 'production_pof', 'qc', 'issues', 
  'fg', 'purchase', 'maintenance', 'people', 'costing', 'improve', 'master-data'
]

export const ROLE_TEMPLATES: Record<string, { label: string; perms: Record<string, 'VIEW' | 'EDIT'> }> = {
  admin: {
    label: '⭐ ผู้ดูแลระบบ (Admin - แก้ไขได้ทุกโมดูล)',
    perms: ALL_MODULE_IDS.reduce((acc, m) => ({ ...acc, [m]: 'EDIT' }), {})
  },
  planner: {
    label: '📋 ฝ่ายวางแผนผลิต (Planning)',
    perms: {
      dashboard: 'VIEW',
      planner: 'EDIT',
      'incoming-rm': 'VIEW',
      production_overview: 'VIEW',
      production_weighing: 'VIEW',
      production_mixing: 'VIEW',
      production_packing: 'VIEW',
      production_pof: 'VIEW',
      qc: 'VIEW',
      issues: 'VIEW',
      fg: 'EDIT',
      purchase: 'VIEW',
      costing: 'EDIT',
      improve: 'EDIT',
      'master-data': 'VIEW'
    }
  },
  ra: {
    label: '📑 ฝ่ายขึ้นทะเบียน (RA)',
    perms: {
      dashboard: 'VIEW',
      planner: 'VIEW',
      'incoming-rm': 'VIEW',
      production_overview: 'VIEW',
      production_weighing: 'VIEW',
      production_mixing: 'VIEW',
      production_packing: 'VIEW',
      production_pof: 'VIEW',
      qc: 'VIEW',
      issues: 'VIEW',
      improve: 'VIEW',
      'master-data': 'VIEW'
    }
  },
  acc: {
    label: '💰 ฝ่ายบัญชีและการเงิน (ACC)',
    perms: {
      dashboard: 'VIEW',
      planner: 'VIEW',
      costing: 'EDIT',
      improve: 'EDIT',
      purchase: 'VIEW',
      fg: 'VIEW',
      'master-data': 'VIEW'
    }
  },
  production: {
    label: '🏭 ฝ่ายผลิต (Production - ทุกสถานี)',
    perms: {
      dashboard: 'VIEW',
      'incoming-rm': 'VIEW',
      production_overview: 'VIEW',
      production_weighing: 'EDIT',
      production_mixing: 'EDIT',
      production_packing: 'EDIT',
      production_pof: 'EDIT',
      qc: 'VIEW',
      issues: 'EDIT',
      improve: 'EDIT'
    }
  },
  production_mx: {
    label: '🥣 แผนกผสม (Production MX)',
    perms: {
      dashboard: 'VIEW',
      'incoming-rm': 'VIEW',
      production_overview: 'VIEW',
      production_weighing: 'EDIT',
      production_mixing: 'EDIT',
      issues: 'EDIT',
      improve: 'EDIT'
    }
  },
  production_pk: {
    label: '📦 แผนกบรรจุและลงลัง (Production PK/POF)',
    perms: {
      dashboard: 'VIEW',
      production_overview: 'VIEW',
      production_packing: 'EDIT',
      production_pof: 'EDIT',
      issues: 'EDIT',
      improve: 'EDIT'
    }
  },
  qc: {
    label: '🔬 ฝ่ายควบคุมคุณภาพ (QC)',
    perms: {
      dashboard: 'VIEW',
      'incoming-rm': 'VIEW',
      production_overview: 'VIEW',
      production_weighing: 'VIEW',
      production_mixing: 'VIEW',
      production_packing: 'VIEW',
      production_pof: 'VIEW',
      qc: 'EDIT',
      issues: 'EDIT',
      improve: 'EDIT'
    }
  },
  qa: {
    label: '🛡️ ฝ่ายประกันคุณภาพ (QA)',
    perms: {
      dashboard: 'VIEW',
      'incoming-rm': 'VIEW',
      production_overview: 'VIEW',
      production_weighing: 'VIEW',
      production_mixing: 'VIEW',
      production_packing: 'VIEW',
      production_pof: 'VIEW',
      qc: 'EDIT',
      issues: 'EDIT',
      improve: 'EDIT'
    }
  },
  warehouse_mmrm_bu: {
    label: '🏭 คลังวัตถุดิบ (MMRM / BU)',
    perms: {
      dashboard: 'VIEW',
      'incoming-rm': 'EDIT',
      production_weighing: 'VIEW'
    }
  },
  warehouse_mmpm_fg: {
    label: '🏬 คลังบรรจุภัณฑ์และ FG (MMPM / FG)',
    perms: {
      dashboard: 'VIEW',
      'incoming-rm': 'EDIT',
      fg: 'EDIT'
    }
  },
  purchase: {
    label: '🛒 ฝ่ายจัดซื้อ (Purchase)',
    perms: {
      dashboard: 'VIEW',
      'incoming-rm': 'VIEW',
      purchase: 'EDIT'
    }
  },
  maintenance: {
    label: '🔧 ฝ่ายซ่อมบำรุง (Maintenance)',
    perms: {
      dashboard: 'VIEW',
      maintenance: 'EDIT'
    }
  },
  people: {
    label: '👥 ฝ่ายบุคคล (People)',
    perms: {
      dashboard: 'VIEW',
      people: 'EDIT'
    }
  }
}

/**
 * Parse role string into module permissions map
 */
export function parseRolePermissions(roleString?: string | null): Record<string, 'VIEW' | 'EDIT'> {
  if (!roleString) return {}
  if (roleString === 'admin') {
    return ALL_MODULE_IDS.reduce((acc, m) => ({ ...acc, [m]: 'EDIT' }), {})
  }

  if (roleString.startsWith('custom:')) {
    const rawItems = roleString.replace('custom:', '').split(',').map(s => s.trim()).filter(Boolean)
    const perms: Record<string, 'VIEW' | 'EDIT'> = {}

    rawItems.forEach(item => {
      if (item.includes(':')) {
        const [mod, lvl] = item.split(':')
        perms[mod] = lvl?.toUpperCase() === 'EDIT' ? 'EDIT' : 'VIEW'
      } else {
        // Legacy list without :view/:edit defaults to EDIT
        perms[item] = 'EDIT'
      }
    })

    // Expand parent 'production' to submodules if present
    if (perms['production']) {
      const lvl = perms['production']
      if (!perms['production_overview']) perms['production_overview'] = lvl
      if (!perms['production_weighing']) perms['production_weighing'] = lvl
      if (!perms['production_mixing']) perms['production_mixing'] = lvl
      if (!perms['production_packing']) perms['production_packing'] = lvl
      if (!perms['production_pof']) perms['production_pof'] = lvl
    }

    return perms
  }

  if (ROLE_TEMPLATES[roleString]) {
    return { ...ROLE_TEMPLATES[roleString].perms }
  }

  return {}
}

/**
 * Format permissions map back into role string
 */
export function formatPermissionsToRole(perms: Record<string, 'VIEW' | 'EDIT'>): string {
  const entries = Object.entries(perms).filter(([_, lvl]) => lvl === 'VIEW' || lvl === 'EDIT')
  if (entries.length === 0) return 'custom:'

  const allEdit = ALL_MODULE_IDS.every(m => perms[m] === 'EDIT')
  if (allEdit) return 'admin'

  const serialized = entries.map(([mod, lvl]) => `${mod}:${lvl.toLowerCase()}`).join(',')
  return `custom:${serialized}`
}

/**
 * Check access level for a given href or moduleId
 */
export function getRouteAccessLevel(href: string, userRole?: string | null): AccessLevel {
  if (!userRole) return 'NONE'
  if (userRole === 'admin') return 'EDIT'

  const perms = parseRolePermissions(userRole)

  // Map href to module key
  let key = ''
  if (href === '/dashboard') key = 'dashboard'
  else if (href === '/planner') key = 'planner'
  else if (href === '/incoming-rm') key = 'incoming-rm'
  else if (href === '/my-tasks/overview') key = 'production_overview'
  else if (href === '/my-tasks/weighing') key = 'production_weighing'
  else if (href === '/my-tasks/mixing') key = 'production_mixing'
  else if (href === '/my-tasks/packing') key = 'production_packing'
  else if (href === '/my-tasks/pof') key = 'production_pof'
  else if (href === '/my-tasks') {
    // Parent production: return max level of any production submodule
    const prodLevels = ['production_overview', 'production_weighing', 'production_mixing', 'production_packing', 'production_pof']
      .map(k => perms[k])
      .filter(Boolean)
    if (prodLevels.includes('EDIT')) return 'EDIT'
    if (prodLevels.includes('VIEW')) return 'VIEW'
    return 'NONE'
  }
  else if (href === '/qc-queue') key = 'qc'
  else if (href === '/issues') key = 'issues'
  else if (href === '/my-tasks/fg') key = 'fg'
  else if (href === '/purchase') key = 'purchase'
  else if (href === '/maintenance') key = 'maintenance'
  else if (href === '/people') key = 'people'
  else if (href.startsWith('/costing')) key = 'costing'
  else if (href.startsWith('/improve')) key = 'improve'
  else if (href.startsWith('/master-data')) key = 'master-data'

  return perms[key] || 'NONE'
}

export function hasAccessToRoute(href: string, userRole?: string | null): boolean {
  const lvl = getRouteAccessLevel(href, userRole)
  return lvl === 'VIEW' || lvl === 'EDIT'
}

export function canEditRoute(href: string, userRole?: string | null): boolean {
  return getRouteAccessLevel(href, userRole) === 'EDIT'
}

/**
 * Get display info for a user role
 */
export function getRoleDisplay(role: string): { label: string; className: string; viewCount?: number; editCount?: number } {
  if (role === 'admin') {
    return { label: '⭐ ผู้ดูแลระบบ (Admin)', className: 'bg-purple-100 text-purple-700 border-purple-200 font-bold' }
  }

  if (role.startsWith('custom:')) {
    const perms = parseRolePermissions(role)
    const entries = Object.entries(perms)
    const editCount = entries.filter(([_, l]) => l === 'EDIT').length
    const viewCount = entries.filter(([_, l]) => l === 'VIEW').length

    let text = `กำหนดเอง (${editCount} แก้ไข`
    if (viewCount > 0) text += `, ${viewCount} ดู)`
    else text += `)`

    return {
      label: text,
      className: 'bg-blue-100 text-blue-800 border-blue-200 font-semibold',
      editCount,
      viewCount
    }
  }

  if (ROLE_TEMPLATES[role]) {
    const templateName = ROLE_TEMPLATES[role].label.split(' (')[0]
    return { 
      label: templateName, 
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-medium' 
    }
  }

  return { label: role, className: 'bg-slate-100 text-slate-700 border-slate-200' }
}
