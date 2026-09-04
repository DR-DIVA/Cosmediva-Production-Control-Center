# CosmeFlow People V1 — System Architecture & Documentation

## ระบบบริหารบุคลากรและกำลังคนโรงงาน Cosmediva (Cosmediva Manufacturing Co., Ltd.)

> **Tagline:**
> **Right People • Right Shift • Right Skill • Right Time**
> **คนพร้อม • กะพร้อม • ทักษะพร้อม • ผลิตพร้อม**

---

## 1. System Overview
**CosmeFlow People** เป็นโมดูลระบบบริหารกำลังคนและทรัพยากรบุคคลระดับปฏิบัติการโรงงาน (Workforce & People Operating System) สำหรับโรงงานผลิตเครื่องสำอางแบบ OEM/ODM (Cosmediva) ออกแบบตามหลักการ:
1. **Database First**: ฐานข้อมูลเชิงสัมพันธ์ระดับองค์กร (PostgreSQL 17 บน Supabase) เก็บประวัติทุกรายการ ไม่มีการเก็บทุกอย่างเป็น JSON ก้อนเดียว
2. **Business Rule First**: กฎและนโยบายทั้งหมดถูกตรวจสอบที่ Backend Engine (Zero Frontend-Only Trust)
3. **Manage by Exception**: HR และหัวหน้างานไม่ต้องตรวจพนักงานทุกคนทุกวัน ระบบตรวจจับและแสดงเฉพาะรายการผิดปกติ (Late, Absent, Missing Punch) เพื่อการจัดการที่ตรงจุด
4. **Calculated Metrics Only**: ตัวเลข KPI และสถิติความพร้อมบน Dashboard ทุกตัวคำนวณสดจาก Database Transactions (ห้าม Hard-code เด็ดขาด)
5. **Mobile-First ESS**: พนักงานสามารถเข้าถึง ESS บนมือถือ ยื่นคำขอลาและดูบันทึกเวลาได้ภายใน 3 คลิก

---

## 2. Modules Implemented in V1
| Module | สถานะ | ความสามารถหลัก |
|---|---|---|
| **1. Employee Master** | พร้อมใช้งาน 100% | ทะเบียนประวัติพนักงาน 134 คน, Search, Filter ตามแผนก/พื้นที่งาน, ดูโปรไฟล์ 360, เพิ่มพนักงานใหม่, นำเข้า CSV, Soft Delete |
| **2. Leave Management** | พร้อมใช้งาน 100% | จัดการวันลา 12 ประเภท, Leave Policy Engine, สมุดบัญชีคุมวันลา (Ledger), ตรวจสอบสิทธิ์แบบ Real-time (Pre-validation), ปฏิทินวันลาและวันหยุด 16 วัน |
| **3. Approval Workflow** | พร้อมใช้งาน 100% | กล่องอนุมัติ (My Approvals), แสดงผลกระทบกำลังคน (Manpower Impact), อนุมัติแบบหลายขั้น (Supervisor & Manager), Append-only Audit Log |
| **4. Time & Attendance** | พร้อมใช้งาน 100% | บันทึกเวลาประจำวัน, ศูนย์จัดการข้อยกเว้น (Exception Center), กลไกผ่อนปรน (Grace Period 15 นาที), ขอแก้ไขเวลาลงเวลา, ศูนย์นำเข้า Log ดิบ (HIP/CSV) |
| **5. HR Dashboard** | พร้อมใช้งาน 100% | แดชบอร์ดปรับเปลี่ยนตาม 7 บทบาทผู้ใช้ (Employee Mobile, Supervisor Team Today, HR Today Command Center, Executive Intelligence) พร้อมวิดเจ็ตความพร้อมสายผลิต (Factory Readiness) |

---

## 3. Technology Stack
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Database**: PostgreSQL 17 (Supabase Managed Instance, AWS Asia-Pacific Singapore)
- **Client & ORM/Pool**: `pg` Connection Pool + `@supabase/ssr` / `@supabase/supabase-js`
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Data Export**: UTF-8 CSV Generator with Excel BOM Support

---

## 4. Key Directory Structure
```
cosmediva-os/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── people/
│   │   │       └── page.tsx              # หน้าหลัก CosmeFlow People V1 (Dynamic View)
│   │   └── api/
│   │       └── people/
│   │           ├── employees/route.ts    # API ทะเบียนพนักงาน + Filter + Soft delete
│   │           ├── leave/route.ts        # API วันลา + Pre-validation + Ledger
│   │           ├── approvals/route.ts    # API กล่องอนุมัติ + Manpower Impact
│   │           ├── attendance/route.ts   # API ลงเวลา + Engine คำนวณ + นำเข้า Log
│   │           ├── exceptions/route.ts   # API ศูนย์ข้อยกเว้น + คำขอแก้ไขเวลา
│   │           ├── dashboard/route.ts    # API ดึงสถิติสด คำนวณจาก Database เท่านั้น
│   │           ├── policies/route.ts     # API ตั้งค่านโยบายวันลาแบบ Dynamic
│   │           └── reports/route.ts      # API ส่งออกรายงาน CSV/Excel
│   ├── components/
│   │   └── people/
│   │       ├── PeopleHeader.tsx          # แถบหัวระบบ + ตัวสลับ 7 บทบาททดสอบ + สลับภาษา
│   │       ├── EmployeeDashboardView.tsx # หน้าจอพนักงาน Mobile Home (ESS)
│   │       ├── SupervisorDashboardView.tsx# หน้าจอหัวหน้างาน (My Team Today)
│   │       ├── HrDashboardView.tsx       # หน้าจอ HR Command Center + Factory Readiness
│   │       ├── ExecutiveDashboardView.tsx# หน้าจอผู้บริหารระดับสูง
│   │       ├── EmployeeDirectory.tsx     # ทะเบียนพนักงาน Search & Filter
│   │       ├── LeaveManagementView.tsx   # ระบบวันลา + ฟอร์มคำนวณวันลาสด
│   │       ├── ApprovalsInboxView.tsx    # กล่องอนุมัติของฉันพร้อมประเมินกำลังคน
│   │       ├── TimeAttendanceView.tsx    # บันทึกเวลา + ศูนย์ข้อยกเว้น + นำเข้า
│   │       ├── PolicyMasterView.tsx      # หน้าจอแก้ไขนโยบายวันลาของ HR Manager
│   │       └── ReportsView.tsx           # ศูนย์ส่งออกรายงาน
│   └── lib/
│       ├── peopleDb.ts                   # PostgreSQL Connection Pool & Transactions
│       └── peopleTranslations.ts         # พจนานุกรมแปลภาษา (ไทย, อังกฤษ, พม่า)
├── scripts/
│   ├── migrate_people.js                 # สคริปต์ Migration โครงสร้างฐานข้อมูล
│   ├── seed_people.js                    # สคริปต์ Seed ข้อมูลจริง (134 พนักงาน + Attendance + Leave)
│   └── test_people_flow.js               # ชุดทดสอบ Automated Test Suite
└── docs/people/                          # คู่มือและเอกสารทางสถาปัตยกรรม
```
