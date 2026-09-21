import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const MACHINE_CODE_REGEX = /\b([A-Z]{2,6}[-_]?[A-Z0-9]{2,10})\b/i;

const TROUBLESHOOTING_KEYWORDS = [
  'ซ่อม', 'เสีย', 'พัง', 'ดับ', 'หยุด', 'รั่ว', 'ร้อน', 'ไหม้', 'หลวม', 'ขาด', 'แตก',
  'ไม่ติด', 'ไม่หมุน', 'ไม่ดูด', 'ไม่ร้อน', 'เออเร่อ', 'error', 'alarm', 'ลูกปืน',
  'สายพาน', 'เซนเซอร์', 'sensor', 'ฮีตเตอร์', 'heater', 'มอเตอร์', 'motor', 'ปั๊ม',
  'โซลินอยด์', 'solenoid', 'รีเลย์', 'relay', 'วาล์ว', 'valve', 'อะไหล่', 'part', 'เบิก', 'เปลี่ยน',
  'แอร์', 'ลม', 'ไฟ', 'สายไฟ', 'เครื่อง', 'ใบพัด', 'เกียร์', 'กาลักน้ำ', 'ฟิล์ม', 'ซีล'
];

async function run() {
  try {
    console.log('Reading [LINE]CMD Maintenance.txt...');
    const content = fs.readFileSync('c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/[LINE]CMD Maintenance.txt', 'utf-8');
    const lines = content.split(/\r?\n/);
    console.log(`Total lines: ${lines.length}`);

    // Detect known senders
    const knownSenders = new Set(['Nong', 'Tewan Ladbasri', 'ปิยะราช รามมา', 'Kim', 'YA', 'Ma nut', 'ช่างสุรเชษฐ์']);
    for (const l of lines) {
      const m = l.match(/^\d{2}:\d{2}\s+(.+?)\s+(Stickers|Photos|Videos|Files|Deleted an album|Added a new note)\s*$/);
      if (m) knownSenders.add(m[1].trim());
    }
    const sortedSenders = Array.from(knownSenders).sort((a, b) => b.length - a.length);

    // Parse messages
    const parsedMessages = [];
    let curDate = null;
    let curMsg = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const dateM = line.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/);
      if (dateM && !line.includes(':')) {
        curDate = `${dateM[1]}-${dateM[2].padStart(2, '0')}-${dateM[3].padStart(2, '0')}`;
        continue;
      }

      const timeM = line.match(/^(\d{2}:\d{2})\s+(.*)$/);
      if (timeM) {
        if (curMsg) parsedMessages.push(curMsg);
        const time = timeM[1];
        const rest = timeM[2];
        let sender = 'Unknown';
        let body = rest;

        for (const s of sortedSenders) {
          if (rest.startsWith(s + ' ') || rest === s) {
            sender = s;
            body = rest.slice(s.length).trim();
            break;
          }
        }

        if (sender === 'Unknown') {
          const firstSpace = rest.indexOf(' ');
          if (firstSpace > 0) {
            sender = rest.slice(0, firstSpace);
            body = rest.slice(firstSpace + 1).trim();
          }
        }

        curMsg = {
          date: curDate ? `${curDate}T${time}:00+07:00` : null,
          sender: sender.trim(),
          text: body.trim()
        };
      } else {
        if (curMsg) {
          curMsg.text += '\n' + line.trim();
        }
      }
    }
    if (curMsg) parsedMessages.push(curMsg);

    // Filter meaningful messages
    const valid = parsedMessages.filter(m => {
      const t = m.text.trim();
      return (
        t.length >= 4 &&
        !['Stickers', 'Photos', 'Videos', 'Files'].includes(t) &&
        !t.includes('unsent a message') &&
        !t.includes('Deleted an album') &&
        !t.includes('ยกเลิกข้อความ')
      );
    });

    console.log(`Parsed ${valid.length} valid chat messages.`);

    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();

    console.log('Clearing old chat history if any...');
    await client.query('DELETE FROM maintenance_chat_history WHERE raw_log->>\'source\' = \'initial_line_import\'');

    console.log('Inserting messages in batches...');
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < valid.length; i += batchSize) {
      const batch = valid.slice(i, i + batchSize);
      
      const values = [];
      const params = [];
      let pIdx = 1;

      for (const m of batch) {
        const mcMatch = m.text.match(MACHINE_CODE_REGEX);
        const mc = mcMatch ? mcMatch[1].toUpperCase() : null;
        const isTrouble = TROUBLESHOOTING_KEYWORDS.some(k => m.text.toLowerCase().includes(k));

        values.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5})`);
        params.push(
          m.date ? new Date(m.date) : new Date(),
          m.sender,
          m.text,
          mc,
          isTrouble,
          JSON.stringify({ source: 'initial_line_import', dateStr: m.date })
        );
        pIdx += 6;
      }

      const query = `
        INSERT INTO maintenance_chat_history 
        (chat_date, sender_name, message_text, machine_code, is_troubleshooting, raw_log)
        VALUES ${values.join(', ')}
      `;

      await client.query(query, params);
      inserted += batch.length;
      if (inserted % 500 === 0 || inserted === valid.length) {
        console.log(`Progress: ${inserted} / ${valid.length} messages inserted...`);
      }
    }

    console.log(`🎉 SUCCESS! Successfully imported ${inserted} chat records from [LINE]CMD Maintenance.txt into maintenance_chat_history!`);
    await client.end();
  } catch (err) {
    console.error('Error importing chat:', err);
    await client.end();
    process.exit(1);
  }
}

run();
