import pg from 'pg';
const { Client } = pg;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const query = `
    INSERT INTO maintenance_chat_history (chat_date, sender_name, message_text, machine_code, is_troubleshooting, raw_log)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, chat_date, machine_code, message_text;
  `;

  const values = [
    '2026-08-17T10:00:00+07:00',
    'เกาเหลา_987 (ช่างกิตติพงษ์)',
    '17/08/26 ช่างกิตติพงษ์ นำเครื่องปั่น Homo mix 4 มาคืนกำลังประกอบเพื่อทดสอบครับ',
    'HOMO-MIX-4',
    true,
    JSON.stringify({ source: 'line_note_group', note_author: 'เกาเหลา_987' })
  ];

  const res = await client.query(query, values);
  console.log('Successfully inserted note:', res.rows[0]);
  await client.end();
}

main().catch(console.error);
