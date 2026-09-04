# CosmeFlow People V1 — Deployment & Operations Guide

## 1. Environment Variables Required
ในไฟล์ `.env.local` ต้องมีตัวแปรสภาพแวดล้อมดังนี้:
```env
NEXT_PUBLIC_SUPABASE_URL=https://yzwldawflteyywuetzcw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2. Installation & Setup
```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. ทำการ Migration ตาราง CosmeFlow People (สร้าง 30+ ตาราง)
node scripts/migrate_people.js

# 3. นำเข้าข้อมูลพนักงานจริงและสถานการณ์จำลอง (134 พนักงาน)
node scripts/seed_people.js

# 4. ทดสอบความถูกต้องของ Business Rules และ Database Integrity
node scripts/test_people_flow.js

# 5. รันโปรเจกต์ Development
npm run dev
```

## 3. Production Build & Execution
```bash
# Build Production
npm run build

# Start Production Server
npm start
```
ระบบจะเปิดให้บริการที่พอร์ต `3000` (เช่น `http://localhost:3000/people`)
