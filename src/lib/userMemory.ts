/**
 * User & Personnel Name Memory Helper
 * Manages persistent storage of user names, Master Data user integration,
 * and autocomplete suggestions formatted as 'ชื่อ-สกุล (รหัสพนักงาน)'.
 */

export const DEFAULT_USER_STORAGE_KEY = 'cosmeflow_user_name'
export const DEFAULT_RECENT_LIST_KEY = 'cosmeflow_saved_names'
export const MASTER_USERS_CACHE_KEY = 'cosmeflow_master_users_cache'

export interface MasterUserOption {
  id?: string
  employeeId: string
  fullName: string
  displayName: string // e.g. "คุณเบ็ญจพร พูลสวัสดิ์ (pkbjp518)"
  department: string
  role?: string
}

/**
 * Resolve department name in Thai from employee ID prefix
 */
export function resolveDepartmentFromEmployeeId(employeeId: string, role?: string): string {
  const code = (employeeId || '').toUpperCase().trim()
  if (code.startsWith('MT')) return 'ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)'
  if (code.startsWith('MM')) return 'แผนก RM (Raw Materials / Warehouse)'
  if (code.startsWith('MX')) return 'แผนกผสม (Mixing Department)'
  if (code.startsWith('PK')) return 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)'
  if (code.startsWith('QC')) return 'ฝ่ายควบคุมคุณภาพ (Quality Control - QC)'
  if (code.startsWith('QA')) return 'ฝ่ายประกันคุณภาพ (QA)'
  if (code.startsWith('RD')) return 'ฝ่ายวิจัยและพัฒนา (R&D)'
  if (code.startsWith('HR')) return 'ฝ่ายทรัพยากรบุคคล (HR)'
  if (code.startsWith('ACC')) return 'ฝ่ายบัญชีและการเงิน (Accounting)'
  if (code.startsWith('PL')) return 'ฝ่ายวางแผนการผลิต (Planning)'
  if (code.startsWith('SM')) return 'แผนก RM (Raw Materials / Warehouse)'
  if (code.startsWith('BEC')) return 'ฝ่ายผลิตทั่วไป (Production)'
  if (code.startsWith('RAW')) return 'ฝ่ายผลิต / วัตถุดิบ (Raw Materials)'
  if (code.startsWith('PUN')) return 'ฝ่ายจัดซื้อ (Purchasing)'
  if (code.startsWith('PDTCPS')) return 'ฝ่ายบริหาร / ผู้บริหาร (Executive)'
  if (code.startsWith('PD')) return 'ฝ่ายผลิตทั่วไป (Production)'
  return 'ฝ่ายผลิตและปฏิบัติการ (Production / Operations)'
}

/**
 * Format standard display label: "ชื่อ-สกุล (รหัสพนักงาน)"
 */
export function formatUserMasterDisplayName(fullName: string, employeeId: string): string {
  const cleanName = (fullName || '').trim().replace(/\s+/g, ' ')
  const cleanId = (employeeId || '').trim()
  if (!cleanId) return cleanName
  return `${cleanName} (${cleanId})`
}

/**
 * Master Data Users seeded from Supabase profiles
 */
export const INITIAL_MASTER_USERS: MasterUserOption[] = [
  { employeeId: 'pkbjp518', fullName: 'คุณเบ็ญจพร พูลสวัสดิ์', displayName: 'คุณเบ็ญจพร พูลสวัสดิ์ (pkbjp518)', department: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)' },
  { employeeId: 'PDSIF1932', fullName: 'คุณศิรินภา แฝงกระโทก', displayName: 'คุณศิรินภา แฝงกระโทก (PDSIF1932)', department: 'ฝ่ายผลิตทั่วไป (Production)' },
  { employeeId: 'MTANR1898', fullName: 'นายอนันต์ รอดเสงี่ยม', displayName: 'นายอนันต์ รอดเสงี่ยม (MTANR1898)', department: 'ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)' },
  { employeeId: 'MTPIT1933', fullName: 'นายปิยะราช ถมมา', displayName: 'นายปิยะราช ถมมา (MTPIT1933)', department: 'ฝ่ายซ่อมบำรุงและวิศวกรรม (Engineering & Facilities)' },
  { employeeId: 'pdtcps001', fullName: 'ดร.ภญ. ชมพูนุช แสวงศักดิ์', displayName: 'ดร.ภญ. ชมพูนุช แสวงศักดิ์ (pdtcps001)', department: 'ฝ่ายบริหาร / ผู้บริหาร (Executive)' },
  { employeeId: 'SMSAM963', fullName: 'น.ส.สายวรุณ มงคลคลี', displayName: 'น.ส.สายวรุณ มงคลคลี (SMSAM963)', department: 'แผนก RM (Raw Materials / Warehouse)' },
  { employeeId: 'BECTAM1903', fullName: 'นางสาวธันชนก มังกร', displayName: 'นางสาวธันชนก มังกร (BECTAM1903)', department: 'ฝ่ายผลิตทั่วไป (Production)' },
  { employeeId: 'HRANS1886', fullName: 'คุณเอนก ศรีสุรินทร์', displayName: 'คุณเอนก ศรีสุรินทร์ (HRANS1886)', department: 'ฝ่ายทรัพยากรบุคคล (HR)' },
  { employeeId: 'HRCHD1668', fullName: 'คุณฉัตรกมล ดีสว่าง', displayName: 'คุณฉัตรกมล ดีสว่าง (HRCHD1668)', department: 'ฝ่ายทรัพยากรบุคคล (HR)' },
  { employeeId: 'ACCNPP1900', fullName: 'คุณนิภาพร โพนศรี', displayName: 'คุณนิภาพร โพนศรี (ACCNPP1900)', department: 'ฝ่ายบัญชีและการเงิน (Accounting)' },
  { employeeId: 'ACCNVR665', fullName: 'คุณนิวาริน รัตนงามแสง', displayName: 'คุณนิวาริน รัตนงามแสง (ACCNVR665)', department: 'ฝ่ายบัญชีและการเงิน (Accounting)' },
  { employeeId: 'MMSAB1931', fullName: 'คุณศราวุฒิ บุตรพรม', displayName: 'คุณศราวุฒิ บุตรพรม (MMSAB1931)', department: 'แผนก RM (Raw Materials / Warehouse)' },
  { employeeId: 'RAWAB1103', fullName: 'คุณวราภรณ์ บ่อเพทาย', displayName: 'คุณวราภรณ์ บ่อเพทาย (RAWAB1103)', department: 'ฝ่ายผลิต / วัตถุดิบ (Raw Materials)' },
  { employeeId: 'MMSNK027', fullName: 'นายสน แก้วนาเหนือ', displayName: 'นายสน แก้วนาเหนือ (MMSNK027)', department: 'แผนก RM (Raw Materials / Warehouse)' },
  { employeeId: 'PUNUP1158', fullName: 'คุณนุสรี พจนรุ่งเรืองกิจ', displayName: 'คุณนุสรี พจนรุ่งเรืองกิจ (PUNUP1158)', department: 'ฝ่ายจัดซื้อ (Purchasing)' },
  { employeeId: 'PLPTB1234', fullName: 'คุณพรทิพย์ บูรณ์รัตน์ธรรม', displayName: 'คุณพรทิพย์ บูรณ์รัตน์ธรรม (PLPTB1234)', department: 'ฝ่ายวางแผนการผลิต (Planning)' },
  { employeeId: 'QCTTM181', fullName: 'คุณฐิติกาญจน์ มากร', displayName: 'คุณฐิติกาญจน์ มากร (QCTTM181)', department: 'ฝ่ายควบคุมคุณภาพ (Quality Control - QC)' },
  { employeeId: 'PKWNR486', fullName: 'คุณวนิดา เรืองศิลป์', displayName: 'คุณวนิดา เรืองศิลป์ (PKWNR486)', department: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)' },
  { employeeId: 'PKJRR139', fullName: 'คุณจีรนันท์ ระนาด', displayName: 'คุณจีรนันท์ ระนาด (PKJRR139)', department: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)' },
  { employeeId: 'PKPIT266', fullName: 'คุณพิมพ์วรีย์ เติมสายทอง', displayName: 'คุณพิมพ์วรีย์ เติมสายทอง (PKPIT266)', department: 'แผนกบรรจุและแพ็กกิ้ง (Packing Department)' },
  { employeeId: 'QCCHJ1801', fullName: 'คุณชิดจันทร์ จารุพงษ์สิริ', displayName: 'คุณชิดจันทร์ จารุพงษ์สิริ (QCCHJ1801)', department: 'ฝ่ายควบคุมคุณภาพ (Quality Control - QC)' },
  { employeeId: 'QABUP1677', fullName: 'คุณบรรเจิด พึ่งกระจ่าง', displayName: 'คุณบรรเจิด พึ่งกระจ่าง (QABUP1677)', department: 'ฝ่ายประกันคุณภาพ (QA)' },
  { employeeId: 'mxktj620', fullName: 'คุณกิตติศักดิ์ จิระพนาวัลย์', displayName: 'คุณกิตติศักดิ์ จิระพนาวัลย์ (mxktj620)', department: 'แผนกผสม (Mixing Department)' },
  { employeeId: 'mmcys026', fullName: 'คุณชญาดา สังข์สำรวม', displayName: 'คุณชญาดา สังข์สำรวม (mmcys026)', department: 'แผนก RM (Raw Materials / Warehouse)' }
]

export function isGenericPlaceholder(val: string): boolean {
  if (!val) return true
  const v = val.trim()
  return (
    v === '' ||
    v === 'พนักงานหน้างาน (Operator)' ||
    v === 'หัวหน้าฝ่ายผลิต (Supervisor)' ||
    v === 'ช่างซ่อมบำรุง' ||
    v === 'ช่างซ่อมบำรุง (Technician)' ||
    v === 'ระบบจัดตาราง PM ประจำงวด' ||
    v === 'Requester' ||
    v === 'ผู้แจ้งซ่อม'
  )
}

/**
 * Get all Master Data users, combining cache and default list
 */
export function getMasterUsersList(): MasterUserOption[] {
  if (typeof window === 'undefined') return INITIAL_MASTER_USERS
  try {
    const raw = localStorage.getItem(MASTER_USERS_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached master users:', e)
  }
  return INITIAL_MASTER_USERS
}

/**
 * Save updated master users to localStorage cache
 */
export function cacheMasterUsersList(users: MasterUserOption[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MASTER_USERS_CACHE_KEY, JSON.stringify(users))
  } catch (e) {
    console.warn('Failed to cache master users:', e)
  }
}

/**
 * Get the last saved personal name (e.g. 'คุณเบ็ญจพร พูลสวัสดิ์ (pkbjp518)')
 */
export function getSavedUserName(fallback: string = ''): string {
  if (typeof window === 'undefined') return fallback
  try {
    const saved =
      localStorage.getItem(DEFAULT_USER_STORAGE_KEY) ||
      localStorage.getItem('last_requester_name') ||
      localStorage.getItem('cosmeflow_last_user_name')

    if (saved && saved.trim() && !isGenericPlaceholder(saved)) {
      return saved.trim()
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e)
  }
  return fallback
}

/**
 * Get all recent names stored locally combined with master users
 */
export function getRecentNamesList(): string[] {
  const masterUsers = getMasterUsersList()
  const masterDisplayNames = masterUsers.map(u => u.displayName)

  if (typeof window === 'undefined') return masterDisplayNames

  try {
    const raw = localStorage.getItem(DEFAULT_RECENT_LIST_KEY)
    let customList: string[] = []
    if (raw) {
      customList = JSON.parse(raw)
    }
    const current = getSavedUserName('')
    const combined = Array.from(
      new Set([
        current,
        ...customList,
        ...masterDisplayNames
      ])
    ).filter(name => name && name.trim() && !isGenericPlaceholder(name))

    return combined
  } catch (e) {
    return masterDisplayNames
  }
}

/**
 * Save a newly entered name to localStorage
 */
export function saveUserName(name: string): void {
  if (typeof window === 'undefined') return
  const clean = name.trim()
  if (!clean || isGenericPlaceholder(clean)) return
  try {
    localStorage.setItem(DEFAULT_USER_STORAGE_KEY, clean)
    localStorage.setItem('last_requester_name', clean)
    localStorage.setItem('cosmeflow_last_user_name', clean)

    const existing = getRecentNamesList()
    const updated = [clean, ...existing.filter(n => n.toLowerCase() !== clean.toLowerCase())].slice(0, 40)
    localStorage.setItem(DEFAULT_RECENT_LIST_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('LocalStorage write error:', e)
  }
}

/**
 * Search Master Users with query matching name, employee ID, or department
 */
export function searchMasterUsers(query: string): MasterUserOption[] {
  const users = getMasterUsersList()
  const q = (query || '').trim().toLowerCase()
  if (!q) return users

  return users.filter(u => {
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.employeeId.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    )
  })
}
