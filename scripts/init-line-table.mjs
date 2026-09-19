import pg from 'pg';

const Pool = pg.Pool;
const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const connectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS line_notification_channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_key VARCHAR(50) UNIQUE NOT NULL,
        channel_name VARCHAR(100) NOT NULL,
        description TEXT,
        channel_access_token TEXT,
        destination_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notify_events JSONB DEFAULT '{"on_breakdown": true, "on_assigned": true, "on_completed": true, "on_pm_due": true, "on_spare_low": true}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Seed default enterprise channels if not existing
      INSERT INTO line_notification_channels (channel_key, channel_name, description, is_active)
      VALUES 
        ('maintenance', '🛠️ ซ่อมบำรุง & เครื่องจักร (Maintenance)', 'แจ้งเตือนเครื่องจักรหยุดฉุกเฉิน, อัปเดตงานซ่อม, รอบตรวจ PM, อะไหล่วิกฤต', true),
        ('production', '🏭 ฝ่ายผลิต & วางแผน (Production)', 'รายงานยอดผลผลิตประจำกะ, แจ้งเตือนคอขวดสายการผลิต, เปลี่ยนแบทช์', false),
        ('qc_qa', '🔬 ควบคุมคุณภาพ & ปล่อยแล็บ (QC/QA)', 'รายงานผลตรวจสารเคมี, ผ่าน/ไม่ผ่านสเปก, ปล่อยแบทช์ส่งมอบ', false),
        ('dcc', '📄 งานควบคุมเอกสาร (DCC & GMP)', 'แจ้งเตือนเอกสารควบคุมรออนุมัติ, รอบทบทวน SOP, Audit Log', false),
        ('warehouse', '📦 คลังวัตถุดิบ & จัดซื้อ (Warehouse & Purchasing)', 'วัตถุดิบเข้าคลัง, เบิกใช้วัสดุ, เปิดคำขอซื้อ PR', false)
      ON CONFLICT (channel_key) DO NOTHING;
    `);

    console.log('✅ Successfully created/verified line_notification_channels table and default channels!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await pool.end();
  }
}

main();
