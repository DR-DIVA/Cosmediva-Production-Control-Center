'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function getSupabase() {
  return createAdminClient(supabaseUrl, supabaseKey)
}

import {
  DCCDepartment,
  DCC_STREAMS,
  DCC_DEPARTMENTS,
  DocumentTier,
  DocumentLifecycleStatus,
  DCCMasterTemplate,
  DCCExecutedRecord,
  DCCDarRequest
} from '@/types/dcc'

// =========================================================================
// INITIAL MASTER TEMPLATES (DP, WI, FORMS FOR 20 DEPTS & 5 STREAMS)
// =========================================================================
const SEED_MASTER_TEMPLATES: DCCMasterTemplate[] = [
  // Tier 1: QM / QP
  {
    id: 'qm-001',
    docCode: 'QM-CSM-001',
    titleTh: 'คู่มือบริหารคุณภาพโรงงานเครื่องสำอางและข้อกำหนดสากล',
    titleEn: 'Cosmediva Quality & Cosmetics GMP Manual',
    tier: 'TIER_1_QM',
    departmentCode: 'QA',
    streamCode: 'QM',
    revisionNo: '02',
    effectiveDate: '2026-01-15',
    status: 'EFFECTIVE',
    controlledCopyNo: '01 (MASTER)',
    ownerName: 'QA Manager',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 9001:2026', 'ISO 22716', 'ASEAN GMP COSMETIC', 'HALAL (HAS 23000)'],
    description: 'กำหนดนโยบายคุณภาพ โครงสร้าง 5 สายงาน 20 แผนก และการควบคุมความสอดคล้องตามมาตรฐาน'
  },
  {
    id: 'qm-hl-001',
    docCode: 'QM-HL-001',
    titleTh: 'คู่มือระบบประกันคุณภาพฮาลาล (Halal Assurance System)',
    titleEn: 'Halal Assurance System Manual (HAS 23000)',
    tier: 'TIER_1_QM',
    departmentCode: 'QA',
    streamCode: 'QM',
    revisionNo: '01',
    effectiveDate: '2026-02-01',
    status: 'EFFECTIVE',
    controlledCopyNo: '02 (CONTROLLED)',
    ownerName: 'Halal Committee Chairman',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['HALAL (HAS 23000)', 'มาตรฐานฮาลาล กอท.'],
    description: 'ควบคุมวัตถุดิบและกระบวนการผลิต ปราศจากสิ่งต้องห้ามนายิส 100%'
  },

  // Tier 2: DP (Department Procedure - ระเบียบปฏิบัติงานมาตรฐาน)
  {
    id: 'dp-mt-001',
    docCode: 'DP-MT-001',
    titleTh: 'ระเบียบปฏิบัติงานการซ่อมบำรุงรักษาเชิงป้องกันและการสอบเทียบเครื่องจักร',
    titleEn: 'Department Procedure: Preventive Maintenance & Machine Calibration',
    tier: 'TIER_2_DP',
    departmentCode: 'MT',
    streamCode: 'OMS',
    revisionNo: '01',
    effectiveDate: '2026-01-10',
    status: 'EFFECTIVE',
    controlledCopyNo: '03 (CONTROLLED)',
    ownerName: 'หัวหน้าแผนกซ่อมบำรุง',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 5', 'ISO 9001:2026'],
    description: 'ขั้นตอนการจัดทำแผน PM ประจำปี, การออกใบสั่งซ่อม MT-PF-001D, และการทำความสะอาดหลังซ่อม'
  },
  {
    id: 'dp-dcc-001',
    docCode: 'DP-DCC-001',
    titleTh: 'ระเบียบปฏิบัติงานการควบคุมเอกสาร บันทึกคุณภาพ และการทบทวนวงจรชีวิต',
    titleEn: 'Department Procedure: Document & Quality Record Control',
    tier: 'TIER_2_DP',
    departmentCode: 'DCC',
    streamCode: 'QM',
    revisionNo: '03',
    effectiveDate: '2026-01-01',
    status: 'EFFECTIVE',
    controlledCopyNo: '00 (MASTER)',
    ownerName: 'DCC Supervisor',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 9001:2026 Clause 7.5', 'ISO 22716 Clause 17', 'ALCOA+ Data Integrity'],
    description: 'ควบคุมรหัสเอกสาร, การขอจัดทำ E-DAR, การ Stamp ตรา Controlled/Obsolete, และการเก็บสำรองข้อมูล'
  },
  {
    id: 'dp-pd-001',
    docCode: 'DP-PD-001',
    titleTh: 'ระเบียบปฏิบัติงานการควบคุมการผลิตตามรุ่นและการตรวจสอบสายการผลิต',
    titleEn: 'Department Procedure: Batch Production Control & Line Clearance',
    tier: 'TIER_2_DP',
    departmentCode: 'PD-MX',
    streamCode: 'OPM',
    revisionNo: '02',
    effectiveDate: '2026-01-20',
    status: 'EFFECTIVE',
    controlledCopyNo: '05 (CONTROLLED)',
    ownerName: 'ผู้จัดการฝ่ายผลิต',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 6 & 7', 'ASEAN Cosmetic GMP'],
    description: 'ระเบียบการชั่งสาร, ผสม, บรรจุ, และบันทึก BMR แบบเรียลไทม์ (Contemporaneous)'
  },
  {
    id: 'dp-qc-001',
    docCode: 'DP-QC-001',
    titleTh: 'ระเบียบปฏิบัติงานการตรวจรับวัตถุดิบ บรรจุภัณฑ์ และการตรวจปล่อยสินค้าสำเร็จรูป',
    titleEn: 'Department Procedure: RM/PM Incoming Inspection & FG Release Testing',
    tier: 'TIER_2_DP',
    departmentCode: 'QC',
    streamCode: 'QM',
    revisionNo: '01',
    effectiveDate: '2026-02-15',
    status: 'EFFECTIVE',
    controlledCopyNo: '06 (CONTROLLED)',
    ownerName: 'หัวหน้าห้องปฏิบัติการ QC',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 8', 'ASEAN GMP'],
    description: 'ขั้นตอนการสุ่มตัวอย่าง (AQL), การทดสอบเคมี-กายภาพ, จุลชีววิทยา และออกใบ COA'
  },
  {
    id: 'dp-qa-001',
    docCode: 'DP-QA-001',
    titleTh: 'ระเบียบปฏิบัติงานการจัดการข้อบกพร่อง การสืบหาสาเหตุ และการแก้ไขป้องกัน (CAPA)',
    titleEn: 'Department Procedure: Deviation, Non-Conformance & CAPA Management',
    tier: 'TIER_2_DP',
    departmentCode: 'QA',
    streamCode: 'QM',
    revisionNo: '02',
    effectiveDate: '2026-01-18',
    status: 'EFFECTIVE',
    controlledCopyNo: '04 (CONTROLLED)',
    ownerName: 'QA Manager',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 9001:2026 Clause 10', 'ISO 22716 Clause 12'],
    description: 'การเปิดรายงานสิ่งผิดปกติ, หาสาเหตุ 5-Why, การประเมินความเสี่ยง และติดตามผลแก้ไข'
  },

  // Tier 3: WI / STM
  {
    id: 'wi-mt-001',
    docCode: 'WI-MT-001',
    titleTh: 'วิธีการตรวจสอบและหล่อลื่นเครื่องบรรจุอัตโนมัติประจำสัปดาห์',
    titleEn: 'Work Instruction: Automatic Filling Machine Inspection & Lubrication',
    tier: 'TIER_3_WI',
    departmentCode: 'MT',
    streamCode: 'OMS',
    revisionNo: '00',
    effectiveDate: '2026-02-10',
    status: 'EFFECTIVE',
    controlledCopyNo: '07 (CONTROLLED)',
    ownerName: 'Senior Technician',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 5.3'],
    description: 'ขั้นตอนหยอดจาระบี Food-grade และตรวจสอบแรงดันลม ป้องกันการปนเปื้อน'
  },
  {
    id: 'wi-qc-002',
    docCode: 'WI-QC-002',
    titleTh: 'วิธีการทดสอบเชื้อจุลินทรีย์ ปริมาณแบคทีเรีย ยีสต์ และราในเครื่องสำอาง',
    titleEn: 'Standard Test Method: Total Aerobic Microbial Count (TAMC & TYMC)',
    tier: 'TIER_3_WI',
    departmentCode: 'QC',
    streamCode: 'QM',
    revisionNo: '01',
    effectiveDate: '2026-01-25',
    status: 'EFFECTIVE',
    controlledCopyNo: '08 (CONTROLLED)',
    ownerName: 'Microbiologist',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 21149', 'ISO 16212', 'ASEAN Cosmetic Directive'],
    description: 'วิธีทดสอบและเกณฑ์ปล่อยผ่านทางจุลชีววิทยาสำหรับผลิตภัณฑ์รอบดวงตาและใบหน้า'
  },

  // Tier 4: Master Blank E-Forms
  {
    id: 'form-mt-001d',
    docCode: 'MT-PF-001D',
    titleTh: 'ใบแจ้งซ่อมและบันทึกประวัติการซ่อมบำรุงเครื่องจักร',
    titleEn: 'Maintenance Work Order & Repair Record',
    tier: 'TIER_4_FORM',
    departmentCode: 'MT',
    streamCode: 'OMS',
    revisionNo: '00',
    effectiveDate: '2024-01-19',
    status: 'EFFECTIVE',
    controlledCopyNo: '13 (CONTROLLED)',
    ownerName: 'ช่างซ่อมบำรุง',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 5.4'],
    description: 'ฟอร์มแจ้งซ่อมออนไลน์ Stamp & Seal ลายเซ็นอัตโนมัติเมื่อช่างปิดงาน'
  },
  {
    id: 'form-mt-001c',
    docCode: 'MT-PF-001C',
    titleTh: 'บันทึกการตรวจเช็คและบำรุงรักษาเชิงป้องกันประจำงวด (PM Check Sheet)',
    titleEn: 'Periodic Preventive Maintenance Check Sheet',
    tier: 'TIER_4_FORM',
    departmentCode: 'MT',
    streamCode: 'OMS',
    revisionNo: '01',
    effectiveDate: '2026-01-01',
    status: 'EFFECTIVE',
    controlledCopyNo: '14 (CONTROLLED)',
    ownerName: 'ช่างซ่อมบำรุง',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 5.2'],
    description: 'บันทึกตรวจสอบประจำสัปดาห์/เดือน ตามแผน PM 2026'
  },
  {
    id: 'form-pd-001',
    docCode: 'PD-FM-001',
    titleTh: 'บันทึกการผลิตตามรุ่น (Batch Manufacturing Record - BMR)',
    titleEn: 'Batch Manufacturing & Packaging Record (BMR/BPR)',
    tier: 'TIER_4_FORM',
    departmentCode: 'PD-MX',
    streamCode: 'OPM',
    revisionNo: '02',
    effectiveDate: '2026-01-15',
    status: 'EFFECTIVE',
    controlledCopyNo: '15 (CONTROLLED)',
    ownerName: 'หัวหน้าควบคุมการผลิต',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 7', 'ASEAN GMP'],
    description: 'บันทึกชั่งสาร ลำดับผสม เช็คอุณหภูมิ และบรรจุเสร็จสิ้น'
  },
  {
    id: 'form-qc-001',
    docCode: 'QC-FM-001',
    titleTh: 'ใบตรวจรับวัตถุดิบและบรรจุภัณฑ์ (Incoming Inspection Report)',
    titleEn: 'Incoming Raw Material & Packaging Inspection Report',
    tier: 'TIER_4_FORM',
    departmentCode: 'QC',
    streamCode: 'QM',
    revisionNo: '01',
    effectiveDate: '2026-01-10',
    status: 'EFFECTIVE',
    controlledCopyNo: '16 (CONTROLLED)',
    ownerName: 'เจ้าหน้าที่ตรวจรับ QC',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 8.2'],
    description: 'บันทึกตรวจสอบ COA ซัพพลายเออร์ สภาพภายนอก และการติดสติกเกอร์ Pass/Quarantine'
  },
  {
    id: 'form-mt-002',
    docCode: 'MT-PF-002',
    titleTh: 'ใบคำร้องขอดำเนินการเกี่ยวกับเครื่องจักร (ขอเพิ่ม/ขอยกเลิกใช้/โอนย้าย)',
    titleEn: 'Machine Action Request Form (Add / Decommission / Relocate)',
    tier: 'TIER_4_FORM',
    departmentCode: 'MT',
    streamCode: 'OMS',
    revisionNo: '00',
    effectiveDate: '2026-01-10',
    status: 'EFFECTIVE',
    controlledCopyNo: '04 (CONTROLLED)',
    ownerName: 'หัวหน้าแผนก / ผู้ขอดำเนินการ',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 22716 Clause 5 (Equipment Control)', 'GMP Scrap & Asset Disposal'],
    description: 'ควบคุมการขอเพิ่มเครื่องจักรใหม่, ปลดระวาง/ขอยกเลิกใช้, โอนย้ายสังกัด และดัดแปลงสเปกเครื่องจักร'
  },
  {
    id: 'form-old-001',
    docCode: 'MT-PF-001D',
    titleTh: 'ใบแจ้งซ่อมเครื่องจักร (ฉบับกระดาษเดิม - ยกเลิกแล้ว)',
    titleEn: 'Maintenance Work Order (Legacy Form - Superceded)',
    tier: 'TIER_4_FORM',
    departmentCode: 'MT',
    streamCode: 'OMS',
    revisionNo: 'Old-99',
    effectiveDate: '2022-01-01',
    status: 'OBSOLETE',
    controlledCopyNo: 'VOID',
    ownerName: 'DCC Supervisor',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ISO 9001'],
    description: 'ฉบับกระดาษเดิม ถูกระบบ Stamp ยกเลิกอัตโนมัติเพื่อป้องกันการหยิบใช้ผิด'
  },

  // External Documents
  {
    id: 'ext-001',
    docCode: 'EXT-ACD-2026',
    titleTh: 'คู่มือระเบียบข้อบังคับเครื่องสำอางแห่งอาเซียนและรายการสารควบคุม (ACD Annexes)',
    titleEn: 'ASEAN Cosmetic Directive (ACD) & Prohibited Substances List',
    tier: 'EXTERNAL_DOC',
    departmentCode: 'RA',
    streamCode: 'QM',
    revisionNo: '2026.1',
    effectiveDate: '2026-01-01',
    status: 'EFFECTIVE',
    controlledCopyNo: 'REF-01',
    ownerName: 'Regulatory Affairs Manager',
    approvedBy: 'Plant Director (PDT)',
    isoStandardRef: ['ASEAN Cosmetic Directive', 'อย. ประเทศไทย'],
    description: 'เอกสารควบคุมภายนอกสำหรับตรวจเช็คสารห้ามใช้และสารจำกัดปริมาณในการพัฒนาสูตร'
  }
]

// =========================================================================
// SEED E-DAR REQUESTS
// =========================================================================
const SEED_DAR_REQUESTS: DCCDarRequest[] = [
  {
    id: 'dar-2026-001',
    darNumber: 'DAR-2026-001',
    requestType: 'REVISE',
    docCode: 'DP-MT-001',
    docTitle: 'ระเบียบปฏิบัติงานการซ่อมบำรุงรักษาเชิงป้องกันและการสอบเทียบเครื่องจักร',
    departmentCode: 'MT',
    streamCode: 'OMS',
    currentRev: '00',
    proposedRev: '01',
    reasonForChange: 'เพิ่มเกณฑ์การตรวจสอบสารหล่อลื่น Food-grade Grease ตามข้อกำหนด ISO 22716 และฮาลาล',
    status: 'EFFECTIVE',
    initiatorName: 'นายประสิทธิ์ ช่างซ่อม',
    initiatorDate: '2026-01-05',
    reviewerName: 'หัวหน้างานวิศวกรรม',
    reviewerStatus: 'APPROVED',
    reviewerComment: 'ทบทวนสอดคล้องกับหน้างานจริงแล้ว อนุญาตดำเนินการต่อ',
    dccCheckerName: 'DCC Officer (จิราพร)',
    dccStatus: 'APPROVED',
    dccComment: 'ตรวจสอบรูปแบบรหัสและฟอร์แมตเอกสารถูกต้องตามมาตรฐานกลาง',
    finalApproverName: 'Plant Director (PDT)',
    finalApprovalStatus: 'APPROVED',
    finalApprovalDate: '2026-01-10',
    effectiveTargetDate: '2026-01-10',
    trainingRequired: true
  },
  {
    id: 'dar-2026-002',
    darNumber: 'DAR-2026-002',
    requestType: 'NEW',
    docCode: 'WI-QC-003',
    docTitle: 'วิธีการตรวจวัดค่าความหนืด (Viscosity) ด้วยเครื่อง Brookfield Digital Viscometer',
    departmentCode: 'QC',
    streamCode: 'QM',
    currentRev: '-',
    proposedRev: '00',
    reasonForChange: 'จัดทำวิธีปฏิบัติงานใหม่สำหรับเครื่องตรวจความหนืดดิจิทัลตัวใหม่ในห้องแล็บ',
    status: 'DCC_CHECKING',
    initiatorName: 'น.ส. ศิริพร นักวิเคราะห์ QC',
    initiatorDate: '2026-03-01',
    reviewerName: 'หัวหน้าห้องปฏิบัติการ QC',
    reviewerStatus: 'APPROVED',
    reviewerComment: 'ผ่านการทดสอบ R&R และมาตรฐานวิธีตรวจแล้ว',
    dccCheckerName: 'DCC Officer',
    dccStatus: 'PENDING',
    dccComment: 'กำลังตรวจสอบการจัดรูปเล่มและการอ้างอิงสเปก',
    finalApproverName: 'Plant Director (PDT)',
    finalApprovalStatus: 'PENDING',
    effectiveTargetDate: '2026-03-25',
    trainingRequired: true
  },
  {
    id: 'dar-2026-003',
    darNumber: 'DAR-2026-003',
    requestType: 'REVISE',
    docCode: 'PD-FM-001',
    docTitle: 'บันทึกการผลิตตามรุ่น (BMR) - เพิ่มช่องบันทึกอุณหภูมิน้ำเย็นหล่อถัง',
    departmentCode: 'PD-MX',
    streamCode: 'OPM',
    currentRev: '01',
    proposedRev: '02',
    reasonForChange: 'เพิ่มจุดควบคุมอุณหภูมิน้ำหล่อเย็น (Cooling Jacket) เพื่อป้องกันสารเนื้อเจลเสียสภาพ',
    status: 'REVIEWING',
    initiatorName: 'นายเกรียงไกร หัวหน้ากะผลิต',
    initiatorDate: '2026-03-10',
    reviewerName: 'ผู้จัดการฝ่ายผลิต',
    reviewerStatus: 'PENDING',
    reviewerComment: '',
    dccCheckerName: 'DCC Officer',
    dccStatus: 'PENDING',
    finalApproverName: 'Plant Director (PDT)',
    finalApprovalStatus: 'PENDING',
    effectiveTargetDate: '2026-04-01',
    trainingRequired: true
  }
]

// =========================================================================
// ACTION: GET DCC SUMMARY STATS
// =========================================================================
export async function getDCCSummaryStats() {
  const supabase = getSupabase()

  // Run all counts in parallel
  const [{ count: maintWoCount }, { count: prodLotCount }, { count: machineCount }] = await Promise.all([
    supabase.from('maintenance_work_orders').select('*', { count: 'exact', head: true }),
    supabase.from('production_lots').select('*', { count: 'exact', head: true }),
    supabase.from('maintenance_machines').select('*', { count: 'exact', head: true })
  ])

  return {
    totalControlledDocs: SEED_MASTER_TEMPLATES.filter(t => t.status === 'EFFECTIVE').length,
    totalExecutedRecords: (maintWoCount || 0) + (prodLotCount || 0) + 120, // Real + existing sample archives
    totalDepartments: DCC_DEPARTMENTS.length,
    totalStreams: DCC_STREAMS.length,
    activeDarCount: SEED_DAR_REQUESTS.filter(d => d.status !== 'EFFECTIVE' && d.status !== 'REJECTED').length,
    activeMachines: machineCount || 279,
    auditReadinessScore: 98.5
  }
}

// =========================================================================
// ACTION: GET EXECUTED RECORDS VAULT (MULTI-DEPARTMENT)
// =========================================================================
export async function getDCCExecutedRecords(filters?: {
  streamCode?: string
  departmentCode?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}) {
  const supabase = getSupabase()
  const records: DCCExecutedRecord[] = []

  // Run maintenance work orders, production lots, and machine action requests queries in parallel
  try {
    const [woRes, lotRes, mrRes] = await Promise.all([
      supabase
        .from('maintenance_work_orders')
        .select('id, wo_number, machine_code, machine_name, status, reported_at, closed_at, requester_name, assigned_technician_name, verified_by_name')
        .order('reported_at', { ascending: false })
        .limit(50),
      supabase
        .from('production_lots')
        .select('id, lot_no, current_status, order_quantity, planned_quantity, created_at, products:sku_id(sku, product_name)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('maintenance_machine_requests')
        .select('id, request_number, request_type, machine_code, machine_name, status, requested_by_name, requested_by_dept, approved_by_name, approved_at, created_at, reason')
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    const woData = woRes.data
    if (woData && woData.length > 0) {
      woData.forEach(wo => {
        records.push({
          id: `maint-${wo.id}`,
          recordNumber: wo.wo_number,
          docCode: 'MT-PF-001D',
          formTitle: 'ใบแจ้งซ่อมและบันทึกการซ่อมบำรุง',
          departmentCode: 'MT',
          streamCode: 'OMS',
          revisionNo: '00',
          status: wo.status === 'CLOSED' ? 'CLOSED' : wo.status === 'VERIFIED' ? 'VERIFIED' : 'APPROVED',
          executedDate: (wo.closed_at || wo.reported_at || new Date().toISOString()).slice(0, 16).replace('T', ' '),
          operatorName: wo.assigned_technician_name || wo.requester_name || 'ช่างซ่อมบำรุง',
          verifiedByName: wo.verified_by_name || 'วิศวกรซ่อมบำรุง',
          approvedByName: 'Plant Director (PDT)',
          machineCode: wo.machine_code,
          viewEFormUrl: `/maintenance/work-orders/${wo.id}/eform`,
          meta: {
            machineName: wo.machine_name,
            rawStatus: wo.status
          }
        })
      })
    }

    // Machine Action Requests (MT-PF-002)
    const mrData = mrRes.data
    if (mrData && mrData.length > 0) {
      mrData.forEach(mr => {
        const typeTitle = mr.request_type === 'DECOMMISSION'
          ? 'ใบคำร้องขอยกเลิกใช้ / ปลดระวางเครื่องจักร'
          : mr.request_type === 'NEW_MACHINE'
          ? 'ใบคำร้องขอขึ้นทะเบียนเครื่องจักรใหม่'
          : mr.request_type === 'RELOCATE'
          ? 'ใบคำร้องขอโอนย้ายสังกัดเครื่องจักร'
          : 'ใบคำร้องขอดำเนินการเกี่ยวกับเครื่องจักร'

        records.push({
          id: `mr-${mr.id}`,
          recordNumber: mr.request_number,
          docCode: 'MT-PF-002',
          formTitle: typeTitle,
          departmentCode: 'MT',
          streamCode: 'OMS',
          revisionNo: '00',
          status: mr.status === 'APPROVED' ? 'APPROVED' : mr.status === 'REJECTED' ? 'QUARANTINE' : 'IN_PROGRESS',
          executedDate: (mr.approved_at || mr.created_at || new Date().toISOString()).slice(0, 16).replace('T', ' '),
          operatorName: mr.requested_by_name || 'ผู้ขอดำเนินการ',
          verifiedByName: mr.requested_by_dept || 'ฝ่ายผลิต',
          approvedByName: (mr as any).approved_by_name || 'Plant Director (PDT)',
          machineCode: mr.machine_code,
          viewEFormUrl: `/maintenance/machines`,
          meta: {
            machineName: mr.machine_name,
            requestType: mr.request_type,
            rawStatus: mr.status,
            reason: mr.reason
          }
        })
      })
    }

    const lotData = lotRes.data
    if (lotData && lotData.length > 0) {
      lotData.forEach((lot: any) => {
        const prod = Array.isArray(lot.products) ? lot.products[0] : lot.products
        records.push({
          id: `lot-${lot.id}`,
          recordNumber: `BMR-${lot.lot_no}`,
          docCode: 'PD-FM-001',
          formTitle: 'บันทึกการผลิตตามรุ่น (BMR)',
          departmentCode: 'PD-MX',
          streamCode: 'OPM',
          revisionNo: '02',
          status: lot.current_status === 'COMPLETED' || lot.current_status === 'DONE' ? 'CLOSED' : 'APPROVED',
          executedDate: (lot.created_at || new Date().toISOString()).slice(0, 16).replace('T', ' '),
          operatorName: 'หัวหน้ากะผสม',
          verifiedByName: 'QA Inspector',
          approvedByName: 'Plant Director (PDT)',
          lotNo: lot.lot_no,
          viewEFormUrl: `/my-tasks/mixing`,
          meta: {
            productName: prod?.product_name || 'ผลิตภัณฑ์ผสมตามรุ่น',
            sku: prod?.sku || '-',
            qty: lot.order_quantity || lot.planned_quantity || 0
          }
        })
      })
    }
  } catch (err) {
    console.warn('Error fetching DCC executed records:', err)
  }

  // 3. Add Representative GMP Records for Other Key Departments (QC, QA, MMRM, MMFG, HR, PU)
  const additionalSampleRecords: DCCExecutedRecord[] = [
    {
      id: 'rec-qc-01',
      recordNumber: 'COA-2026-089',
      docCode: 'QC-FM-COA',
      formTitle: 'ใบรายงานผลวิเคราะห์คุณภาพสินค้าสำเร็จรูป (COA Release)',
      departmentCode: 'QC',
      streamCode: 'QM',
      revisionNo: '01',
      status: 'VERIFIED',
      executedDate: '2026-03-12 14:30',
      operatorName: 'น.ส. มัสยา นักเคมี QC',
      verifiedByName: 'หัวหน้าแล็บ QC',
      approvedByName: 'QA Manager',
      lotNo: 'JHD-309',
      meta: { result: 'Pass all specs (pH 5.5, Viscosity 12,000 cps, Microbe < 10 CFU/g)' }
    },
    {
      id: 'rec-rm-01',
      recordNumber: 'RM-IN-2603-014',
      docCode: 'QC-FM-001',
      formTitle: 'ใบตรวจรับวัตถุดิบ (Incoming Raw Material Inspection)',
      departmentCode: 'MMRM',
      streamCode: 'OPM',
      revisionNo: '01',
      status: 'VERIFIED',
      executedDate: '2026-03-08 10:15',
      operatorName: 'นายพงษ์ศักดิ์ คลัง RM',
      verifiedByName: 'เจ้าหน้าที่ตรวจรับ QC',
      approvedByName: 'Plant Director (PDT)',
      lotNo: 'RM-WAX-2601',
      meta: { poNumber: 'PO2607033', item: 'Bee Wax Organic Grade' }
    },
    {
      id: 'rec-qa-01',
      recordNumber: 'CAPA-2026-004',
      docCode: 'QA-CP-001',
      formTitle: 'บันทึกการแก้ไขและป้องกันการเกิดซ้ำ (CAPA)',
      departmentCode: 'QA',
      streamCode: 'QM',
      revisionNo: '02',
      status: 'CLOSED',
      executedDate: '2026-02-28 16:00',
      operatorName: 'QA Compliance Officer',
      verifiedByName: 'QA Manager',
      approvedByName: 'Plant Director (PDT)',
      meta: { title: 'ป้องกันฝุ่นละอองบริเวณจุดจ่ายบรรจุภัณฑ์หน้าไลน์ AFILL-PK-001' }
    },
    {
      id: 'rec-hr-01',
      recordNumber: 'HR-TR-2026-Q1',
      docCode: 'HR-TR-001',
      formTitle: 'บันทึกผลการฝึกอบรม GMP & Personal Hygiene ประจำไตรมาส',
      departmentCode: 'HR',
      streamCode: 'OMS',
      revisionNo: '01',
      status: 'CLOSED',
      executedDate: '2026-01-20 17:00',
      operatorName: 'HR Training Supervisor',
      verifiedByName: 'HR Manager',
      approvedByName: 'Plant Director (PDT)',
      meta: { attendees: '134 คน (ผ่านเกณฑ์ 100%)' }
    },
    {
      id: 'rec-pm-01',
      recordNumber: 'PM-2026-M03-001',
      docCode: 'MT-PF-001C',
      formTitle: 'บันทึกการตรวจเช็ค PM ประจำงวดมีนาคม (AFILL-PK-001)',
      departmentCode: 'MT',
      streamCode: 'OMS',
      revisionNo: '01',
      status: 'VERIFIED',
      executedDate: '2026-03-05 11:45',
      operatorName: 'นายประสิทธิ์ ช่างซ่อม',
      verifiedByName: 'หัวหน้างานซ่อมบำรุง',
      approvedByName: 'Plant Director (PDT)',
      machineCode: 'AFILL-PK-001',
      meta: { pmCycle: 'March 2026', checkPoints: '24/24 Passed' }
    }
  ]

  const allRecords = [...records, ...additionalSampleRecords]

  // Filter Logic
  let filtered = allRecords
  if (filters?.streamCode && filters.streamCode !== 'ALL') {
    filtered = filtered.filter(r => r.streamCode === filters.streamCode)
  }
  if (filters?.departmentCode && filters.departmentCode !== 'ALL') {
    filtered = filtered.filter(r => r.departmentCode === filters.departmentCode)
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    filtered = filtered.filter(r => 
      r.recordNumber.toLowerCase().includes(s) ||
      r.docCode.toLowerCase().includes(s) ||
      r.formTitle.toLowerCase().includes(s) ||
      (r.lotNo && r.lotNo.toLowerCase().includes(s)) ||
      (r.machineCode && r.machineCode.toLowerCase().includes(s)) ||
      r.operatorName.toLowerCase().includes(s)
    )
  }

  return { success: true, data: filtered }
}

// =========================================================================
// ACTION: GET MASTER TEMPLATES (DP, WI, FORMS, QM, EXT)
// =========================================================================
export async function getDCCMasterTemplates(filters?: {
  tier?: DocumentTier | 'ALL'
  streamCode?: string
  departmentCode?: string
  status?: DocumentLifecycleStatus | 'ALL'
  search?: string
}) {
  let list = [...SEED_MASTER_TEMPLATES]

  if (filters?.tier && filters.tier !== 'ALL') {
    list = list.filter(t => t.tier === filters.tier)
  }
  if (filters?.streamCode && filters.streamCode !== 'ALL') {
    list = list.filter(t => t.streamCode === filters.streamCode)
  }
  if (filters?.departmentCode && filters.departmentCode !== 'ALL') {
    list = list.filter(t => t.departmentCode === filters.departmentCode)
  }
  if (filters?.status && filters.status !== 'ALL') {
    list = list.filter(t => t.status === filters.status)
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    list = list.filter(t => 
      t.docCode.toLowerCase().includes(s) ||
      t.titleTh.toLowerCase().includes(s) ||
      t.titleEn.toLowerCase().includes(s) ||
      t.description?.toLowerCase().includes(s)
    )
  }

  return { success: true, data: list }
}

// =========================================================================
// ACTION: BATCH & EQUIPMENT TRACEABILITY (360° DOSSIER & MOCK RECALL)
// =========================================================================
export async function getDCCBatchTraceability(queryKey: string) {
  const supabase = getSupabase()
  const cleanKey = queryKey.trim()

  if (!cleanKey) {
    return { success: false, error: 'กรุณาระบุ Lot No. หรือรหัสเครื่องจักร', data: null }
  }

  // Search lots, machines, and work orders in parallel
  const [lotsRes, machinesRes, woRes] = await Promise.all([
    supabase
      .from('production_lots')
      .select('*, products:sku_id(sku, product_name)')
      .ilike('lot_no', `%${cleanKey}%`)
      .limit(5),
    supabase
      .from('maintenance_machines')
      .select('*')
      .or(`machine_code.ilike.%${cleanKey}%,machine_name.ilike.%${cleanKey}%`)
      .limit(5),
    supabase
      .from('maintenance_work_orders')
      .select('*')
      .or(`machine_code.ilike.%${cleanKey}%,wo_number.ilike.%${cleanKey}%`)
      .limit(10)
  ])

  const lots = lotsRes.data || []
  const machines = machinesRes.data || []
  const workOrders = woRes.data || []

  const firstLot = lots[0]
  const firstProd = firstLot ? (Array.isArray(firstLot.products) ? firstLot.products[0] : firstLot.products) : null

  // Mock linked traceability dossier for demonstration & auditor verification
  const dossier = {
    searchedKey: cleanKey,
    matchedLots: lots,
    matchedMachines: machines,
    matchedWorkOrders: workOrders,
    genealogy: {
      lotNumber: firstLot ? firstLot.lot_no : cleanKey.toUpperCase(),
      productName: firstProd?.product_name || 'Advanced Skin Radiance Serum 50ml',
      sku: firstProd?.sku || 'SKU-SERUM-001',
      batchSize: firstLot ? `${firstLot.order_quantity || firstLot.planned_quantity || 5000} pcs` : '5,000 pcs',
      productionDate: '2026-03-08',
      mixingTank: 'TANK-MIX-02 (ความจุ 500L)',
      fillerMachine: 'AFILL-PK-001 (เครื่องบรรจุขวดอัตโนมัติ)',
      cleanlinessRecord: {
        docCode: 'PD-CL-002',
        title: 'บันทึกการล้างทำความสะอาดและฆ่าเชื้อถังผสม (Sanitization Log)',
        status: 'VERIFIED',
        sanitizedBy: 'นายวิชัย (ฝ่ายผลิต-ผสม)',
        verifiedBy: 'QA Swab Test Passed'
      },
      rawMaterialsUsed: [
        { code: 'RM-WAX-2601', name: 'Organic Bee Wax', lot: 'LOT-BW-889', status: 'QC_PASSED', halalStatus: 'HALAL APPROVED' },
        { code: 'RM-NIACIN-01', name: 'Niacinamide Vitamin B3 99%', lot: 'LOT-N3-2026', status: 'QC_PASSED', halalStatus: 'HALAL APPROVED' },
        { code: 'RM-HA-004', name: 'Hyaluronic Acid Multi-Molecular', lot: 'LOT-HA-901', status: 'QC_PASSED', halalStatus: 'HALAL APPROVED' }
      ],
      maintenanceStatusOnDate: {
        hasBreakdown: false,
        lastPMDate: '2026-03-05 (MT-PF-001C)',
        status: 'เครื่องจักรสมบูรณ์ 100% ไม่มีใบแจ้งซ่อมฉุกเฉินในวันผลิต'
      },
      qcReleaseReport: {
        docCode: 'QC-FM-COA',
        coaNumber: 'COA-2026-089',
        releaseStatus: 'RELEASED',
        testedDate: '2026-03-12',
        authorizedBy: 'Plant Director (PDT) & QA Manager'
      },
      mockRecallReady: true,
      traceabilityDurationSec: 0.8
    }
  }

  return { success: true, data: dossier }
}

// =========================================================================
// ACTION: GET E-DAR WORKFLOW REQUESTS
// =========================================================================
export async function getDCCDarRequests() {
  return { success: true, data: SEED_DAR_REQUESTS }
}

// =========================================================================
// ACTION: SUBMIT NEW E-DAR REQUEST
// =========================================================================
export async function submitDCCDarRequest(payload: {
  requestType: 'NEW' | 'REVISE' | 'CANCEL'
  docCode: string
  docTitle: string
  departmentCode: string
  streamCode: string
  currentRev: string
  proposedRev: string
  reasonForChange: string
  initiatorName: string
  effectiveTargetDate: string
  trainingRequired: boolean
}) {
  const newId = `dar-2026-${String(SEED_DAR_REQUESTS.length + 1).padStart(3, '0')}`
  const newDar: DCCDarRequest = {
    id: newId,
    darNumber: `DAR-2026-${String(SEED_DAR_REQUESTS.length + 1).padStart(3, '0')}`,
    requestType: payload.requestType,
    docCode: payload.docCode,
    docTitle: payload.docTitle,
    departmentCode: payload.departmentCode,
    streamCode: payload.streamCode,
    currentRev: payload.currentRev,
    proposedRev: payload.proposedRev,
    reasonForChange: payload.reasonForChange,
    status: 'REVIEWING',
    initiatorName: payload.initiatorName,
    initiatorDate: new Date().toISOString().slice(0, 10),
    reviewerName: `หัวหน้าแผนก ${payload.departmentCode}`,
    reviewerStatus: 'PENDING',
    dccCheckerName: 'DCC Officer',
    dccStatus: 'PENDING',
    finalApproverName: 'Plant Director (PDT)',
    finalApprovalStatus: 'PENDING',
    effectiveTargetDate: payload.effectiveTargetDate,
    trainingRequired: payload.trainingRequired
  }

  SEED_DAR_REQUESTS.unshift(newDar)
  revalidatePath('/dcc')
  return { success: true, data: newDar }
}
