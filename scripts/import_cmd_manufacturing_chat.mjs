import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const MACHINE_CODE_REGEX = /\b(Homo\s*mix\s*\d+|Homo[-_]?\d+|Mixer[-_]?\d+|Tank[-_]?\d+|[A-Z]{2,6}[-_]?[A-Z0-9]{1,10})\b/i;

function extractMachineCode(text) {
  const m = text.match(MACHINE_CODE_REGEX);
  if (!m) return null;
  const code = m[1].toUpperCase();
  if (['MTEX', 'LINE', 'TRUE', 'FALSE', 'NULL', 'ERROR', 'CHAT', 'POST', 'HTTP', 'HTTPS', 'PHOTOS', 'STICKERS', 'NOTED'].includes(code)) return null;
  return code;
}

const MAINTENANCE_KEYWORDS = [
  'ซ่อม', 'ช่าง', 'แอร์', 'ล้างแอร์', 'แอร์ไม่เย็น', 'แอร์น้ำหยด', 'แอร์เสีย', 'คอมแอร์',
  'เครื่องเสีย', 'เครื่องพัง', 'เครื่องดับ', 'เครื่องหยุด', 'เครื่องมีปัญหา', 'เครื่องไม่ติด', 'เครื่องไม่หมุน',
  'เครื่องชริ้ง', 'เครื่องรัด', 'เครื่องพิมพ์', 'เครื่องยิง', 'เครื่องบรรจุ', 'เครื่องผสม', 'เครื่องปั่น', 'เครื่องซีล',
  'homo', 'homomixer', 'mixer', 'ไฟดับ', 'ไฟตก', 'ไฟช็อต', 'เบรกเกอร์',
  'ลูกปืน', 'สายพาน', 'เซนเซอร์', 'sensor', 'ฮีตเตอร์', 'heater', 'มอเตอร์', 'motor',
  'ปั๊ม', 'ปั๊มลม', 'โซลินอยด์', 'solenoid', 'รีเลย์', 'relay', 'วาล์ว', 'valve', 'อะไหล่', 'เบิกอะไหล่',
  'กระบอกสูบ', 'อุณหภูมิไม่ขึ้น', 'ความร้อนไม่ขึ้น', 'ลมตก', 'ลมรั่ว', 'น้ำรั่ว', 'เปลี่ยนอะไหล่',
  'แจ้งช่าง', 'ตามช่าง', 'รอช่าง', 'เรียกช่าง', 'ปรับตั้ง', 'ตั้งเครื่อง'
];

async function run() {
  const filePath = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/[LINE]CMD Manufacturing.txt';
  console.log(`Reading ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  console.log(`Total lines: ${lines.length}`);

  let curDate = null;
  let curMsg = null;
  const parsedMessages = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Detect date line: e.g. "2019.08.10 Saturday" or "2020.01.15"
    const dateM = line.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/);
    if (dateM && !line.includes(':')) {
      if (curMsg) {
        parsedMessages.push(curMsg);
        curMsg = null;
      }
      curDate = `${dateM[1]}-${dateM[2].padStart(2, '0')}-${dateM[3].padStart(2, '0')}`;
      continue;
    }

    // Detect message line: e.g. "10:35 som88 @..."
    const timeM = line.match(/^(\d{2}:\d{2})\s+([^\s]+)\s+(.*)$/);
    if (timeM) {
      if (curMsg) {
        parsedMessages.push(curMsg);
      }
      const time = timeM[1];
      const sender = timeM[2];
      const text = timeM[3].trim();

      curMsg = {
        dateStr: curDate ? `${curDate}T${time}:00+07:00` : null,
        dateFormatted: curDate ? `${curDate.split('-').reverse().join('/')} ${time}` : time,
        sender,
        text
      };
    } else {
      // Continuation line
      if (curMsg) {
        curMsg.text += '\n' + line.trim();
      }
    }
  }
  if (curMsg) parsedMessages.push(curMsg);

  console.log(`Total parsed LINE messages: ${parsedMessages.length}`);

  // Filter messages that talk about maintenance, machines, air-con, repairs
  const filtered = parsedMessages.filter(m => {
    const t = m.text.trim();
    if (t.length < 8) return false;
    if (['Photos', 'Stickers', 'Videos', 'Files', 'Deleted an album', 'unsent a message'].includes(t)) return false;
    if (t.includes('ยกเลิกข้อความ') || t.includes('unsent a message')) return false;

    const low = t.toLowerCase();
    const hasKeyword = MAINTENANCE_KEYWORDS.some(k => low.includes(k));
    const hasMachine = extractMachineCode(t) !== null;

    return hasKeyword || hasMachine;
  });

  console.log(`Found ${filtered.length} relevant maintenance/machine/air-con messages from Manufacturing chat!`);

  // Sample display
  console.log('--- Samples of detected maintenance messages ---');
  filtered.slice(0, 5).forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.dateFormatted}] ${m.sender}: ${m.text.replace(/\n/g, ' ').slice(0, 90)}...`);
  });

  // Connect to DB and insert
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Cleaning previously imported manufacturing messages if any...');
  await client.query("DELETE FROM maintenance_chat_history WHERE raw_log->>'source' = 'line_manufacturing_chat'");

  console.log(`Inserting ${filtered.length} records into maintenance_chat_history...`);
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < filtered.length; i += batchSize) {
    const batch = filtered.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let pIdx = 1;

    for (const item of batch) {
      const mc = extractMachineCode(item.text);
      values.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5})`);
      params.push(
        item.dateStr,
        item.sender,
        item.text,
        mc,
        true,
        JSON.stringify({
          source: 'line_manufacturing_chat',
          dateStr: item.dateStr,
          originalDate: item.dateFormatted
        })
      );
      pIdx += 6;
    }

    const query = `
      INSERT INTO maintenance_chat_history (chat_date, sender_name, message_text, machine_code, is_troubleshooting, raw_log)
      VALUES ${values.join(', ')}
    `;

    await client.query(query, params);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${filtered.length} messages...`);
  }

  // Get total in DB
  const countRes = await client.query('SELECT count(*) FROM maintenance_chat_history');
  console.log(`🎉 Total chat records in maintenance_chat_history now: ${countRes.rows[0].count}`);

  await client.end();
}

run().catch(console.error);
