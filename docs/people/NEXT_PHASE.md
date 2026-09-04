# CosmeFlow People — Next Phase Roadmap (V2 Preparation)

ระบบ CosmeFlow People V1 ได้ถูกออกแบบโครงสร้างฐานข้อมูลรองรับการขยายตัวสู่ Phase ถัดไปโดยไม่ต้องรื้อ Schema ใหม่ (Zero Schema Break):

## 1. Phase V1.5 — Overtime Management (OT)
- **ตารางที่สร้างรองรับแล้ว**: `ot_requests`, `ot_participants`
- **ฟีเจอร์ที่จะเพิ่ม**:
  - หัวหน้างานขอเปิดกะโอทีตามความเร่งด่วนของแผนผลิต (Production Plan OT)
  - พนักงานรับการแจ้งเตือนและกดยืนยันเข้าร่วมกะ OT
  - นำเข้าเวลาสแกนจริงมาจับคู่ชั่วโมง OT อัตโนมัติ (OT Actual Calculation)

## 2. Phase V2 — Production Skill Matrix & Operator Allocation
- **ตารางที่สร้างรองรับแล้ว**: `skills`, `employee_skills`, `workforce_requirements`
- **ฟีเจอร์ที่จะเพิ่ม**:
  - ผูกทักษะเฉพาะ (เช่น การผสมเนื้อครีมความหนืดสูง, การตั้งหัวบรรจุอัตโนมัติ, การตรวจสอบเชื้อจุลินทรีย์)
  - ตรวจสอบความพร้อมของทักษะ (Skill Readiness) ในแต่ละสถานีผลิตก่อนปล่อยล็อต
  - แนะนำการสลับกะหรือจัดสรรพนักงาน (Smart Operator Reallocation) เมื่อมีคนขาดงาน

## 3. Phase V2.5 — Direct Production Plan & Work Order Linkage
- **ตารางที่สร้างรองรับแล้ว**: `workforce_daily_snapshot`
- **ฟีเจอร์ที่จะเพิ่ม**:
  - เชื่อมโยงกับ CosmeFlow Planning (`production_plan` / `production_lots`):
    เมื่อ Master Planner วางแผนผลิต 10,000 ชิ้นในห้องบรรจุ Line 1 ระบบจะดึงข้อมูลกำลังคนที่มีอยู่จริงจาก CosmeFlow People และแจ้งเตือนทันทีหากอัตรากำลังไม่เพียงพอ
