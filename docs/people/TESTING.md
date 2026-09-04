# CosmeFlow People V1 — Testing & Verification Guide

## 1. Automated Test Suite
โครงการได้จัดทำชุดทดสอบอัตโนมัติสำหรับตรวจสอบ Business Rules, Database Integrity, และ Zero-Hardcode Metric Query:

```bash
node scripts/test_people_flow.js
```

### ผลการทดสอบล่าสุด (100% Passed):
- `TEST 1`: Database Architecture Integrity — 15 ตารางหลักพบครบถ้วน
- `TEST 2`: Employee Master & Real Seed Data — พนักงาน 134 คนจากข้อมูลจริง
- `TEST 3`: Configurable Leave Policy Engine — นโยบาย 12 รายการเปิดใช้งาน
- `TEST 4`: Leave Balance & Ledger Integrity — สมุดบัญชีบันทึกยอดตรง 100%
- `TEST 5`: Pre-Validation Insufficient Balance — ปฏิเสธการลาเกินสิทธิ์ถูกต้อง
- `TEST 6`: Multi-Step Approval Flow — คำขอ 2 ระดับรออนุมัติในกล่อง
- `TEST 7`: Attendance Calculation Engine — ตรวจจับสาย ขาด ลืมสแกน อัตโนมัติ
- `TEST 8`: Dashboard Zero-Hardcode Query — สถิติและ KPI คำนวณสดจาก DB
- `TEST 9`: Factory Workforce Readiness — คำนวณความพร้อม 11 สถานีผลิตสด

---

## 2. Interactive End-to-End Test Flows (Acceptance Criteria)

### Flow A — การใช้งานของพนักงาน (Employee ESS)
1. เปิดหน้าเว็บ `/people`
2. คลิกแถบ Persona ด้านบน เลือก: **"น.ส.เบ็ญจพร พูลสวัสดิ์ (PK-BJP518)"**
3. หน้าจอจะเปลี่ยนเป็น **Mobile-First Employee ESS**:
   - เห็นเวลาเข้างานวันนี้ (08:00 - 17:00)
   - เห็นการ์ดสิทธิ์วันลาคงเหลือ (ลาพักร้อนคงเหลือ 7 วัน, ลาป่วย 28 วัน, ลากิจ 3 วัน)
4. คลิกปุ่มสีทอง **"ยื่นคำขอลาทันที (Request Leave)"**
5. เลือกลาพักร้อน 1 วัน (เช่น 10/09/2026) ระบุเหตุผล
6. ระบบจะแสดงแบนเนอร์เขียว: *"เงื่อนไขผ่านการตรวจสอบ ยอดคงเหลือหลังอนุมัติ 6 วัน"*
7. กด Submit $\rightarrow$ คำขอจะถูกบันทึก สถานะเป็น *"รอหัวหน้างาน"*

### Flow B — การอนุมัติของหัวหน้างาน (Supervisor Flow)
1. คลิกแถบ Persona ด้านบน เลือก: **"ดร.ภญ. ชมพูนุช แสวงศักดิ์ (PDT-CPS001)"**
2. หน้าจอจะเปลี่ยนเป็น **Supervisor Workspace**:
   - มีแบนเนอร์แจ้งเตือนคำขอลาใหม่
3. คลิกแท็บ **"อนุมัติ (My Approvals)"**
4. จะเห็นการ์ดคำขอลาของสมาชิกในทีม พร้อม **Manpower Impact**:
   - จำนวนคนในทีม: 12 คน
   - ลาอยู่แล้ว: 1 คน
   - เหลือปฏิบัติงานหลังอนุมัติ: 10 คน
5. กดปุ่มสีเขียว **"อนุมัติ (Approve)"**
6. คำขอจะเปลี่ยนสถานะเป็น Approved ทันที ยอดวันลาใน Ledger จะถูกตัดทอนจริงใน Database

### Flow C — การจัดการของ HR Officer (Manage by Exception)
1. คลิกแถบ Persona ด้านบน เลือก: **"คุณกิตติชัย ตรวจเวลา (HR-OFF001)"**
2. หน้าจอจะเปลี่ยนเป็น **HR Today Command Center**:
   - แสดง KPI คนมาทำงานจริง 122 คน, ขาด 2 คน, สาย 4 คน, ลืมสแกน 6 คน
   - แสดงความพร้อมสายผลิต (Mixing READY, Packing WATCH, QC READY)
3. คลิกปุ่ม **"จัดการข้อยกเว้น (Exceptions)"**
4. จะพบรายการคนขาดงาน และพนักงานที่ลืมสแกนเลิกงาน
5. สามารถคลิก **"ยอมรับ/ยกเว้น"** หรือกดอนุมัติคำขอแก้ไขเวลาลงเวลาได้ทันที

### Flow D — การปรับแก้นโยบายของ HR Manager (Zero Code Change)
1. คลิกแถบ Persona ด้านบน เลือก: **"คุณกุลธิดา บริหารบุคคล (HR-MGR001)"**
2. คลิกแท็บ **"นโยบาย (Policies)"**
3. จะเห็นตาราง Leave Policy Master 12 ประเภท
4. คลิกปุ่ม **"แก้ไขกฎ"** ที่แถวลาพักร้อน ปรับวันลาจาก 6 เป็น 8 วัน หรือปรับวันแจ้งล่วงหน้า
5. กดบันทึก $\rightarrow$ ฐานข้อมูลปรับปรุงทันที และระบบคำนวณวันลาของพนักงานทุกคนจะใช้นโยบายใหม่นี้ทันที

### Flow E — มุมมองผู้บริหาร (Executive Readiness)
1. คลิกแถบ Persona ด้านบน เลือก: **"ดร.เอกชัย เกียรติบำรุงกิจ (EXEC-001)"**
2. หน้าจอจะเปลี่ยนเป็น **Executive Intelligence Dashboard**:
   - สรุปอัตราการมาทำงานทั้งโรงงาน (Attendance Rate 91.0%)
   - สถานะความพร้อมและประเมินความเสี่ยงรายแผนก 17 แผนก
   - ไม่มีปุ่มหรือฟอร์มสำหรับแก้ข้อมูลธุรกรรม (Strict Read-Only)
