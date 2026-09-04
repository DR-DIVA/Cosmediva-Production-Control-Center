# CosmeFlow People V1 — Business Rules & Calculation Engines

## 1. Leave Policy & Pre-Validation Engine
กฎและข้อกำหนดการลาทั้งหมดได้รับการประมวลผลที่ Backend Engine (`src/app/api/people/leave/route.ts`):

1. **Auto Day Deduction**: คำนวณเฉพาะวันทำงานจริง โดยหักวันอาทิตย์ (Weekly Off) และวันหยุดโรงงาน (Official Holidays) ให้อัตโนมัติ หากลาตรงกับวันหยุด ระบบไม่ตัดยอดวันลา
2. **Balance Sufficiency Rule**: 
   - ก่อนบันทึกคำขอ ระบบจะเทียบยอดวันลาที่ขอ (`calculatedDays`) กับยอดคงเหลือจริง (`available`) ในตาราง `leave_balances`
   - หากขอเกินยอดคงเหลือ ระบบจะปฏิเสธคำขอทันที พร้อมส่งข้อความแจ้งเตือนที่เข้าใจง่าย เช่น:
     `"วันลาคงเหลือไม่เพียงพอ (คงเหลือ: 2 วัน, คำขอ: 3 วัน)"`
3. **No Overlap Rule**: ป้องกันการยื่นคำขอลาในวันที่เคยยื่นไปแล้ว หรือซ้อนทับกับคำขอเดิมที่อยู่ระหว่างรออนุมัติหรืออนุมัติแล้ว
4. **Advance Notice Period**: ตรวจสอบจำนวนวันยื่นล่วงหน้าตามนโยบาย (เช่น ลาพักร้อนต้องยื่นล่วงหน้าอย่างน้อย 3 วัน) ยกเว้นกรณีฉุกเฉิน (Emergency Flag)
5. **Medical Certificate Requirement**: หากลาป่วยเกินเกณฑ์ที่กำหนด (เช่น มากกว่า 2 วัน) ระบบจะบังคับให้แนบเอกสารใบรับรองแพทย์ก่อนส่งคำขอ
6. **Consecutive Days Limit**: จำกัดจำนวนวันลาต่อเนื่องสูงสุดตามที่นโยบายกำหนด

---

## 2. Leave Balance Ledger & Transaction Safety
1. **Append-Only Ledger**: ทุกความเคลื่อนไหวของวันลาจะถูกบันทึกลงตาราง `leave_transactions` (ห้ามแก้ทับ):
   - `ALLOCATION`: การจัดสรรสิทธิ์เริ่มต้นประจำปี
   - `USAGE`: การตัดยอดวันลาเมื่อคำขอได้รับอนุมัติ (ค่าเป็นลบ)
   - `CANCEL_RESTORE`: การคืนยอดวันลาเข้าบัญชีเมื่อคำขอยกเลิก (ค่าเป็นบวก)
2. **Atomic Transaction**: ใช้ `BEGIN` ... `COMMIT` / `ROLLBACK` ครอบคลุมทุกขั้นตอน:
   - ปรับปรุงสถานะใน `leave_requests`
   - หักลบยอดใน `leave_balances`
   - บันทึกประวัติใน `leave_transactions`
   - สร้างบันทึกประวัติการอนุมัติใน `approval_logs`
   - สร้างการแจ้งเตือนใน `notifications`
   - หากจุดใดเกิดข้อผิดพลาด ฐานข้อมูลจะ Rollback ทั้งหมดเพื่อความสมบูรณ์ของข้อมูล 100%

---

## 3. Approval Workflow Matrix
1. **Dynamic Multi-Step Routing**:
   - คำขอลาพักร้อน $\le$ 2 วัน: อนุมัติจบที่ **หัวหน้างาน (Supervisor)**
   - คำขอลาพักร้อน > 2 วัน: ระบบส่งต่อจาก **หัวหน้างาน (Supervisor)** $\rightarrow$ **ผู้จัดการฝ่าย (Manager)**
   - คำขอลาไม่รับค่าจ้าง (Leave Without Pay): ผ่าน **Supervisor** $\rightarrow$ **Manager** $\rightarrow$ **HR Manager**
2. **Manpower Impact Preview**: 
   - ในหน้าต่างพิจารณาอนุมัติ ระบบจะคำนวณจำนวนคนในทีมที่เข้ากะ (`teamScheduled`), จำนวนคนที่ลาอยู่แล้ว (`teamOnLeave`), และจำนวนคนที่เหลือปฏิบัติงานหลังอนุมัติ (`availableAfterApproval`) ให้หัวหน้างานเห็นทันทีก่อนกดอนุมัติ

---

## 4. Time & Attendance Engine & Manage by Exception
1. **Immutable Raw Logs**: บันทึกเวลาสแกนจากเครื่อง (HIP/CSV) จะถูกเก็บเข้า `attendance_raw_logs` เสมอ ห้ามแก้ไขหรือลบ
2. **Planned Schedule & 15-Minute Grace Period**:
   - เวลาเข้างานตามแผน: 08:00:00
   - ช่วงเวลาผ่อนปรน (Grace Period): 15 นาที (ถึง 08:15:00)
   - หากสแกนเข้างานหลัง 08:15:00 ระบบจะคำนวณนาทีที่สาย (`late_minutes = actual_in - 08:00:00`) และปรับสถานะเป็น **"Late"**
3. **Automatic Exception Detection**:
   - `LATE`: สแกนเข้าหลังช่วงผ่อนปรน
   - `MISSING_CLOCK_IN`: มีเวลาออก แต่ไม่มีเวลาเข้า
   - `MISSING_CLOCK_OUT`: มีเวลาเข้า แต่ไม่มีเวลาออก
   - `ABSENT`: ไม่มีบันทึกเวลาสแกน และไม่มีใบลาที่ได้รับการอนุมัติ
4. **Correction Workflow**: การแก้ไขเวลาจะบันทึกลง `attendance_adjustments` และปรับปรุงยอดใน `attendance_daily` เท่านั้น โดยไม่กระทบ Raw Logs
