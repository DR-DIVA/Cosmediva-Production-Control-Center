/**
 * User & Personnel Name Memory Helper
 * Manages persistent storage of user names and autocomplete suggestions across sessions.
 */

export const DEFAULT_USER_STORAGE_KEY = 'cosmeflow_user_name'
export const DEFAULT_RECENT_LIST_KEY = 'cosmeflow_saved_names'

export const SEED_PERSONNEL_NAMES = [
  'เบ็ญจพร พูลสวัสดิ์',
  'กิตติศักดิ์ จิระพนาวัลย์ #209',
  'สมศรี พนักงานฝ่ายบรรจุ',
  'สมชาย พนักงานฝ่ายผสม',
  'สุนิสา ควบคุมคุณภาพ (QC)'
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
 * Get the last saved personal name (e.g. 'เบ็ญจพร พูลสวัสดิ์')
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
 * Get all recent names stored locally combined with seed names
 */
export function getRecentNamesList(): string[] {
  if (typeof window === 'undefined') return SEED_PERSONNEL_NAMES
  try {
    const raw = localStorage.getItem(DEFAULT_RECENT_LIST_KEY)
    let list: string[] = []
    if (raw) {
      list = JSON.parse(raw)
    }
    const current = getSavedUserName('')
    const combined = Array.from(
      new Set([
        current,
        ...list,
        ...SEED_PERSONNEL_NAMES
      ])
    ).filter(name => name && name.trim() && !isGenericPlaceholder(name))

    return combined
  } catch (e) {
    return SEED_PERSONNEL_NAMES
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
    const updated = [clean, ...existing.filter(n => n.toLowerCase() !== clean.toLowerCase())].slice(0, 30)
    localStorage.setItem(DEFAULT_RECENT_LIST_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('LocalStorage write error:', e)
  }
}
