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
// =========================================================================
// TYPES: E-DAR WORKFLOW (DYNAMIC APPROVAL & 7-SECTION DCC-PF-002A FORM)
// =========================================================================
export interface DCCDarDistributionRow {
  id?: string
  dept: string
  distributorName?: string
  distributorEmpId?: string
  distributedDate?: string
  newDocReceiverName?: string
  newDocReceiverEmpId?: string
  newDocReceivedDate?: string
  oldDocCollectorName?: string
  oldDocCollectorEmpId?: string
  oldDocCollectedDate?: string
  oldDocReturnerName?: string
  oldDocReturnerEmpId?: string
  oldDocReturnedDate?: string
}

export interface DCCDarRequest {
  id: string
  darNumber: string            // e.g. DAR-2026-001
  status: 'DRAFT' | 'REVIEWING' | 'DCC_CHECKING' | 'APPROVED' | 'DISTRIBUTING' | 'DISPOSING' | 'EFFECTIVE' | 'REJECTED'
  
  // Header Meta
  formCode?: string            // 'DCC-PF-002A'
  formRevision?: string        // '02'
  formEffectiveDate?: string   // '28 AUG 23'
  copyNo?: string              // '1 (MASTER)'

  // ส่วนที่ 1: การขอดำเนินการเอกสารควบคุม (สำหรับผู้ขอดำเนินการ กรอกรายละเอียด)
  requestType: 'NEW' | 'REVISE' | 'CANCEL' | 'EXTRA_COPY' | 'EXTEND_EXPIRY' | 'OTHER'
  actionTypeDetail?: string
  extraCopiesCount?: number
  dccOfficerName?: string
  dccOfficerEmpId?: string
  dccReceivedDate?: string
  dccOfficerSign?: string

  // ส่วนที่ 2: ข้อมูลเอกสารควบคุม
  docLevel?: string            // e.g. 'TIER_1_QM' | 'TIER_2_DP' | 'TIER_3_WI' | 'TIER_4_FORM' | 'EXTERNAL_DOC'
  docCategory?: string         // e.g. 'ระเบียบปฏิบัติงาน (DP)', 'แบบฟอร์ม (Form)'
  docCode: string              // e.g. 'MT-PF-001E', 'MT-WF-002D', 'DP-MT-001'
  docTitle: string             // e.g. 'รายการตรวจสอบเครื่องมือเครื่องจักร (PM Check sheet)'
  departmentCode: string       // e.g. 'MT'
  streamCode: string           // e.g. 'OMS'
  currentRev: string           // '00'
  proposedRev: string          // '01'
  language?: 'TH' | 'EN' | 'BOTH'
  usageFormat?: 'Paper' | 'File' | 'Both'
  docReference?: string        // อ้างอิงถึงเอกสาร เลขที่ - ชื่อ (ถ้ามี)
  reasonForChange: string      // หลักการ เหตุผล หรือวัตถุประสงค์
  effectiveTargetDate: string
  trainingRequired: boolean

  // ส่วนที่ 3: พิจารณาบทบาทการจัดทำเอกสารควบคุม (ผู้ขอดำเนินการ, ผู้ทบทวน)
  initiatorName: string
  initiatorEmpId?: string
  initiatorPosition?: string
  initiatorDept?: string
  initiatorDate: string
  initiatorSign?: string

  reviewerName?: string
  reviewerEmpId?: string
  reviewerPosition?: string
  reviewerDept?: string
  reviewerDate?: string
  reviewerStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewerComment?: string
  reviewerSign?: string

  // ส่วนที่ 4: สำเนาแจกจ่ายเพิ่มเติม/ฝ่ายที่เกี่ยวข้อง (19 แผนก)
  targetDepartments?: string[] // ['PDT', 'PL', 'PD', 'MX', 'PK', 'RD', 'QC', 'QA', 'MM', 'RM', 'PM', 'FG', 'MT', 'HR', 'PU', 'SM', 'PDD', 'ACC', 'RA']

  // ส่วนที่ 5: พิจารณาอนุมัติให้ดำเนินการเอกสารควบคุม (ผจก.ฝ่ายประกันคุณภาพ/ผู้อำนวยการโรงงาน)
  finalApproverName: string   // 'Plant Director (PDT)' or 'QA Manager'
  finalApproverEmpId?: string
  finalApproverPosition?: string
  finalApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  finalApprovalDate?: string
  finalApprovalReason?: string
  finalApproverSign?: string

  // DCC Checklist Review
  dccCheckerName?: string
  dccCheckerEmpId?: string
  dccStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  dccComment?: string

  // ส่วนที่ 6: การแจกจ่ายและเรียกคืนเอกสารควบคุม (สำหรับ DC)
  distributionList?: DCCDarDistributionRow[]
  dccDistributionOfficerName?: string
  dccDistributionOfficerEmpId?: string
  dccDistributionDate?: string
  dccDistributionSign?: string
  deptReceiverName?: string
  deptReceiverEmpId?: string
  deptReceiverDept?: string
  deptReceivedDate?: string
  deptReceiverSign?: string
  deptReturnerName?: string
  deptReturnerEmpId?: string
  deptReturnerDept?: string
  deptReturnedDate?: string
  deptReturnerSign?: string
  dccRecallOfficerName?: string
  dccRecallOfficerEmpId?: string
  dccRecallDate?: string
  dccRecallSign?: string

  // ส่วนที่ 7: การทำลายและการควบคุมฉบับยกเลิกเอกสาร (สำหรับ DC)
  originalDisposalMethod?: 'STAMP_CANCEL' | 'SHRED' | 'OTHER'
  originalDisposalOther?: string
  copyDisposalMethod?: 'STAMP_CANCEL' | 'SHRED' | 'OTHER'
  copyDisposalOther?: string
  disposalOfficerName?: string
  disposalOfficerEmpId?: string
  disposalDate?: string
  disposalOfficerSign?: string

  disposalApproverName?: string
  disposalApproverEmpId?: string
  disposalApproverPosition?: string
  disposalApprovalDate?: string
  disposalApproverSign?: string
}

export const DCC_19_DEPARTMENTS = [
  { code: 'PDT', label: '1. PDT (Plant Director)' },
  { code: 'PL', label: '2. PL (ฝ่ายวางแผนการผลิต)' },
  { code: 'PD', label: '3. PD (ฝ่ายผลิต)' },
  { code: 'MX', label: '4. MX (แผนกผสม)' },
  { code: 'PK', label: '5. PK (แผนกบรรจุและแพ็กกิ้ง)' },
  { code: 'RD', label: '6. RD (ฝ่ายวิจัยและพัฒนาสูตร)' },
  { code: 'QC', label: '7. QC (ฝ่ายควบคุมคุณภาพ)' },
  { code: 'QA', label: '8. QA (ฝ่ายประกันคุณภาพ)' },
  { code: 'MM', label: '9. MM (คลังสินค้าและโลจิสติกส์)' },
  { code: 'RM', label: '10. RM (คลังวัตถุดิบ)' },
  { code: 'PM', label: '11. PM (คลังบรรจุภัณฑ์)' },
  { code: 'FG', label: '12. FG (คลังสินค้าสำเร็จรูป)' },
  { code: 'MT', label: '13. MT (ฝ่ายวิศวกรรมและซ่อมบำรุง)' },
  { code: 'HR', label: '14. HR (ฝ่ายทรัพยากรบุคคล)' },
  { code: 'PU', label: '15. PU (ฝ่ายจัดซื้อ)' },
  { code: 'SM', label: '16. SM (ฝ่ายบริหารงานขาย)' },
  { code: 'PDD', label: '17. PDD (ฝ่ายพัฒนาบรรจุภัณฑ์)' },
  { code: 'ACC', label: '18. ACC (ฝ่ายบัญชีและการเงิน)' },
  { code: 'RA', label: '19. RA (ฝ่ายขึ้นทะเบียนและข้อกำหนด)' },
]

