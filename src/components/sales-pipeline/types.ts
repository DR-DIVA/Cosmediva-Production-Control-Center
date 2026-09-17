export type CustomerTier = 'TIER_1' | 'TIER_2'

export interface Company {
  id: string
  name: string
  brandName?: string
  taxId?: string
  tier: CustomerTier
  channelDescription?: string // e.g. 'ห้าง / Eveandboy / TikTok Shop' or 'คลินิกความงาม / สปา'
  address?: string
  phone?: string
  email?: string
  website?: string
  createdAt: string
}

export interface Contact {
  id: string
  companyId: string
  name: string
  role?: string // e.g. 'CEO / เจ้าของแบรนด์', 'จัดซื้อ', 'ผู้จัดการฝ่ายการตลาด'
  phone: string
  lineId?: string
  facebook?: string
  email?: string
  isPrimary: boolean
  createdAt: string
}

export interface PipelineStage {
  id: string
  name: string
  description?: string
  probability: number // 0 - 100%
  color: string // Tailwind badge class or hex
  order: number
  isWon?: boolean
  isLost?: boolean
  rottingDays?: number // Alert if no activity in this stage for X days
}

export type ProductCategory = 
  | 'skincare' 
  | 'haircare' 
  | 'facial_care' 
  | 'body_care' 
  | 'personal_care' 
  | 'sunscreen'
  | 'other'

export type FormulaType = 'OEM' | 'ODM'

export type PackagingStatus = 
  | 'SOURCING' // โรงงานจัดหา One-Stop
  | 'CLIENT_SUPPLIED' // ลูกค้านำมาเอง
  | 'SAMPLE_REVIEW' // อยู่ระหว่างเลือกตัวอย่างขวด/กระปุก
  | 'CONFIRMED' // สรุปแพ็กเกจจิ้งแล้ว

export type FdaStatus = 
  | 'NOT_STARTED' // ยังไม่ได้เริ่ม
  | 'FACTORY_REG' // โรงงานกำลังเตรียมเอกสารยื่น อย.
  | 'SUBMITTED' // ยื่น อย. แล้ว รออนุมัติ
  | 'APPROVED' // ได้เลขจดแจ้ง อย. แล้ว
  | 'CLIENT_REG' // ลูกค้ายื่นจดแจ้งเอง

export type SampleStatus = 
  | 'PENDING_BRIEF' // รอกำหนดสเปก
  | 'LAB_DEVELOPING' // R&D กำลังพัฒนาสูตร
  | 'SENT_ROUND_1' // ส่งตัวอย่างรอบที่ 1
  | 'SENT_ROUND_2' // ส่งตัวอย่างปรับแก้รอบที่ 2
  | 'APPROVED' // ลูกค้าคอนเฟิร์มสูตรแล้ว

export interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  completedAt?: string
}

export interface ActivityLog {
  id: string
  dealId: string
  type: 'CALL' | 'LINE' | 'MEETING' | 'SAMPLE' | 'NOTE' | 'STAGE_CHANGE' | 'SYSTEM'
  title: string
  description?: string
  actor: string
  createdAt: string
}

export interface Deal {
  id: string
  code: string // e.g. DL-2609-001
  title: string
  companyId: string
  contactId: string
  salesRep: string
  stageId: string
  dealValue: number // ยอดขายคาดการณ์ (บาท)
  quantity: number // จำนวนผลิต (ชิ้น)
  productCategory: ProductCategory
  formulaType: FormulaType
  packagingStatus: PackagingStatus
  fdaStatus: FdaStatus
  sampleStatus: SampleStatus
  expectedCloseDate: string
  nextActionDate?: string // วันนัดติดตาม
  nextActionNote?: string // กิจกรรมที่ต้องทำถัดไป
  lossReason?: string
  lossNote?: string
  checklist: ChecklistItem[]
  createdAt: string
  updatedAt: string
  lastActivityDate: string
}

export interface SalesRepStats {
  name: string
  activeDealsCount: number
  pipelineValue: number
  wonThisMonthValue: number
  target: number
}
