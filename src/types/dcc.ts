// =========================================================================
// ORGANIZATIONAL TAXONOMY: 5 STREAMS & 20 DEPARTMENTS REPORTING TO PDT
// =========================================================================
export interface DCCDepartment {
  code: string
  nameTh: string
  nameEn: string
  streamCode: 'OMS' | 'SM' | 'NPD' | 'QM' | 'OPM'
  streamNameTh: string
  docPrefix: string
}

export const DCC_STREAMS = [
  { code: 'OMS', nameTh: 'สายงาน OMS (Operations & Management Support)', lead: 'Plant Director (PDT)' },
  { code: 'SM', nameTh: 'สายงาน SM (Sales & Marketing)', lead: 'Plant Director (PDT)' },
  { code: 'NPD', nameTh: 'สายงาน NPD (New Product Development)', lead: 'Plant Director (PDT)' },
  { code: 'QM', nameTh: 'สายงาน QM (Quality Management)', lead: 'Plant Director (PDT)' },
  { code: 'OPM', nameTh: 'สายงาน OPM (Operations & Production Management)', lead: 'Plant Director (PDT)' },
] as const

export const DCC_DEPARTMENTS: DCCDepartment[] = [
  // สายงาน OMS
  { code: 'ACC', nameTh: 'ฝ่ายบัญชีและการเงิน', nameEn: 'Accounting & Finance', streamCode: 'OMS', streamNameTh: 'สายงาน OMS', docPrefix: 'ACC' },
  { code: 'MT', nameTh: 'ฝ่ายวิศวกรรมและซ่อมบำรุง', nameEn: 'Engineering & Maintenance', streamCode: 'OMS', streamNameTh: 'สายงาน OMS', docPrefix: 'MT' },
  { code: 'PU', nameTh: 'ฝ่ายจัดซื้อ', nameEn: 'Purchasing', streamCode: 'OMS', streamNameTh: 'สายงาน OMS', docPrefix: 'PU' },
  { code: 'HR', nameTh: 'ฝ่ายทรัพยากรบุคคล', nameEn: 'Human Resources', streamCode: 'OMS', streamNameTh: 'สายงาน OMS', docPrefix: 'HR' },

  // สายงาน SM
  { code: 'SM', nameTh: 'ฝ่ายบริหารงานขาย', nameEn: 'Sales Management', streamCode: 'SM', streamNameTh: 'สายงาน SM', docPrefix: 'SM' },
  { code: 'MKT', nameTh: 'ฝ่ายการตลาด', nameEn: 'Marketing', streamCode: 'SM', streamNameTh: 'สายงาน SM', docPrefix: 'MKT' },

  // สายงาน NPD
  { code: 'RD', nameTh: 'ฝ่ายวิจัยและพัฒนาสูตร', nameEn: 'Research & Development', streamCode: 'NPD', streamNameTh: 'สายงาน NPD', docPrefix: 'RD' },
  { code: 'PDD', nameTh: 'ฝ่ายพัฒนาบรรจุภัณฑ์และการออกแบบ', nameEn: 'Packaging & Design Development', streamCode: 'NPD', streamNameTh: 'สายงาน NPD', docPrefix: 'PDD' },

  // สายงาน QM
  { code: 'QA', nameTh: 'ฝ่ายประกันคุณภาพ', nameEn: 'Quality Assurance', streamCode: 'QM', streamNameTh: 'สายงาน QM', docPrefix: 'QA' },
  { code: 'RA', nameTh: 'ฝ่ายกำกับดูแลและขึ้นทะเบียน', nameEn: 'Regulatory Affairs', streamCode: 'QM', streamNameTh: 'สายงาน QM', docPrefix: 'RA' },
  { code: 'DCC', nameTh: 'ศูนย์ควบคุมเอกสารและบันทึกคุณภาพ', nameEn: 'Document Control Center', streamCode: 'QM', streamNameTh: 'สายงาน QM', docPrefix: 'DCC' },
  { code: 'QC', nameTh: 'ฝ่ายควบคุมคุณภาพ', nameEn: 'Quality Control', streamCode: 'QM', streamNameTh: 'สายงาน QM', docPrefix: 'QC' },

  // สายงาน OPM
  { code: 'PL', nameTh: 'ฝ่ายวางแผนการผลิต', nameEn: 'Production Planning', streamCode: 'OPM', streamNameTh: 'สายงาน OPM', docPrefix: 'PL' },
  { code: 'PD-MX', nameTh: 'ฝ่ายผลิต-ผสม', nameEn: 'Production - Mixing', streamCode: 'OPM', streamNameTh: 'สายงาน OPM', docPrefix: 'PD' },
  { code: 'PD-PK', nameTh: 'ฝ่ายผลิต-บรรจุ', nameEn: 'Production - Packing', streamCode: 'OPM', streamNameTh: 'สายงาน OPM', docPrefix: 'PK' },
  { code: 'MMRM', nameTh: 'คลังวัตถุดิบ', nameEn: 'Material Management - Raw Material', streamCode: 'OPM', streamNameTh: 'สายงาน OPM', docPrefix: 'MMRM' },
  { code: 'MMBU', nameTh: 'คลังสารกึ่งสำเร็จรูป', nameEn: 'Material Management - Bulk', streamCode: 'OPM', streamNameTh: 'สายงาน OPM', docPrefix: 'MMBU' },
  { code: 'MMPM', nameTh: 'คลังบรรจุภัณฑ์', nameEn: 'Material Management - Packaging Material', streamCode: 'OPM', streamNameTh: 'สายงาน OPM', docPrefix: 'MMPM' },
  { code: 'MMFG', nameTh: 'คลังสินค้าสำเร็จรูป', nameEn: 'Material Management - Finished Goods', streamCode: 'OPM', streamNameTh: 'สายงาน OPM', docPrefix: 'MMFG' },
]

// =========================================================================
// TYPES: MASTER TEMPLATES (4 TIERS + EXTERNAL)
// =========================================================================
export type DocumentTier = 
  | 'TIER_1_QM'      // คู่มือคุณภาพ (Quality Manual), Halal Policy
  | 'TIER_2_DP'      // ระเบียบปฏิบัติงานมาตรฐาน (Department Procedure - DP)
  | 'TIER_3_WI'      // วิธีปฏิบัติงาน (Work Instruction - WI, STM, MBMR)
  | 'TIER_4_FORM'    // แบบฟอร์มมาตรฐาน (Master Forms & Checklists)
  | 'EXTERNAL_DOC'   // เอกสารภายนอก (อย., Halal, มอก., ISO)

export type DocumentLifecycleStatus = 'DRAFT' | 'UNDER_REVIEW' | 'EFFECTIVE' | 'OBSOLETE'

export interface DCCMasterTemplate {
  id: string
  docCode: string              // e.g. DP-MT-001, MT-PF-001D, QM-001
  titleTh: string
  titleEn: string
  tier: DocumentTier
  departmentCode: string       // ACC, MT, QA, PD-MX, etc.
  streamCode: string           // OMS, SM, NPD, QM, OPM
  revisionNo: string           // '00', '01', '02'
  effectiveDate: string        // YYYY-MM-DD
  status: DocumentLifecycleStatus
  controlledCopyNo: string     // e.g. '13 (CONTROLLED)'
  ownerName: string
  reviewerName?: string
  dccCheckedBy?: string
  approvedBy: string           // 'Plant Director (PDT)' or 'QA Manager'
  isoStandardRef: string[]     // ['ISO 9001:2026', 'ISO 22716', 'ASEAN GMP', 'HALAL']
  description?: string
  formFieldsCount?: number
  downloadUrl?: string
}

// =========================================================================
// TYPES: EXECUTED E-RECORDS (VAULT)
// =========================================================================
export interface DCCExecutedRecord {
  id: string
  recordNumber: string         // WO Number, BMR Lot No, PO No, CAPA No
  docCode: string              // MT-PF-001D, PD-FM-BMR, QC-FM-001
  formTitle: string
  departmentCode: string
  streamCode: string
  revisionUsed?: string        // '00'
  revisionNo?: string          // '00'
  status: 'VERIFIED' | 'CLOSED' | 'APPROVED' | 'IN_PROGRESS' | 'QUARANTINE'
  executedDate: string         // YYYY-MM-DD HH:mm
  operatorName: string
  verifiedByName?: string
  approvedByName?: string      // Plant Director (PDT), QA Manager
  lotNo?: string
  machineCode?: string
  viewEFormUrl?: string
  meta: Record<string, any>
}

// =========================================================================
// TYPES: E-DAR WORKFLOW (DYNAMIC APPROVAL)
// =========================================================================
export interface DCCDarRequest {
  id: string
  darNumber: string            // DAR-2026-001
  requestType: 'NEW' | 'REVISE' | 'CANCEL'
  docCode: string
  docTitle: string
  departmentCode: string
  streamCode: string
  currentRev: string
  proposedRev: string
  reasonForChange: string
  status: 'DRAFT' | 'REVIEWING' | 'DCC_CHECKING' | 'APPROVED' | 'EFFECTIVE' | 'REJECTED'
  initiatorName: string
  initiatorDate: string
  reviewerName?: string
  reviewerStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewerComment?: string
  dccCheckerName?: string
  dccStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  dccComment?: string
  finalApproverName: string   // 'Plant Director (PDT)' or 'QA Manager'
  finalApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  finalApprovalDate?: string
  effectiveTargetDate: string
  trainingRequired: boolean
}
