const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)';

const updates = {
  'incoming-rm/page.tsx': {
    title: 'Raw Material Control Center',
    sub1: 'ศูนย์กลางจัดการใบสั่งซื้อ การรับเข้า และสถานะวัตถุดิบสำหรับการผลิต',
    sub2: 'Synchronize RM Data and Production.'
  },
  'my-tasks/overview/page.tsx': {
    title: 'CosmeFlow Production',
    sub1: 'Track Every Step. Improve Every Batch.',
    sub2: ''
  },
  'my-tasks/weighing/page.tsx': {
    title: 'งานชั่งสาร (Weighing)',
    sub1: 'รายการงานชั่งสารประจำวัน',
    sub2: 'Synchronize RM-MX-PK One Team'
  },
  'my-tasks/mixing/page.tsx': {
    title: 'งานผสม (Mixing)',
    sub1: 'รายการงานผสมประจำวัน',
    sub2: 'Synchronize RM-MX-PK One Team'
  },
  'my-tasks/packing/page.tsx': {
    title: 'งานบรรจุ (Packing)',
    sub1: 'รายการงานบรรจุสินค้าประจำวัน',
    sub2: 'Synchronize RM-MX-PK One Team'
  },
  'my-tasks/pof/page.tsx': {
    title: 'งานลงลัง (Cartoning/POF)',
    sub1: 'รายการงานลงลัง ประจำวัน',
    sub2: 'Synchronize RM-MX-PK One Team'
  },
  'qc-queue/page.tsx': {
    title: 'CosmeFlow Quality',
    sub1: 'ศูนย์รวมงานตรวจสอบคุณภาพของทุกกระบวนการผลิต',
    sub2: 'Quality You Can Trust. Visibility You Can Share.'
  },
  'my-tasks/fg/page.tsx': {
    title: 'CosmeFlow Warehouse',
    sub1: 'จัดการรับเข้า, สต๊อกคงเหลือ และเบิกจ่ายสินค้า FG แบบเต็มรูปแบบ',
    sub2: 'Every Item. Every Movement. Fully Visible.'
  },
  'issues/page.tsx': {
    title: 'CosmeFlow Assurance',
    sub1: 'Issues NC/CAR, Reprocess, Return, Complaint',
    sub2: 'From Inspection to Confidence.'
  }
};

for (const [file, data] of Object.entries(updates)) {
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  const hRegex = /<h([12])[^>]*>([\s\S]*?)<\/h\1>/;
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/; // finds first p tag which is usually subtitle
  
  // Create new subtitle block
  let newSubtitle = '';
  if (data.sub2) {
    newSubtitle = `
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>${data.sub1}</div>
             <div className="flex items-center text-cyan-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                ${data.sub2}
             </div>
          </div>`.trim();
  } else {
    newSubtitle = `
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
             <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
             ${data.sub1}
          </div>`.trim();
  }

  // Find the block containing h1/h2 and p
  const blockRegex = /<h([12])[^>]*>[\s\S]*?<\/h\1>\s*(?:<p[^>]*>[\s\S]*?<\/p>|<div className="text-sm text-\[#8B7355\][^>]*>[\s\S]*?<\/div>\s*<\/div>|<div className="text-sm text-\[#8B7355\][^>]*>[\s\S]*?<\/div>)/;
  
  const match = content.match(blockRegex);
  if (match) {
    // Reconstruct the h tag with new title
    const h1Match = match[0].match(/<h([12])([^>]*)>([\s\S]*?)<\/h\1>/);
    if (h1Match) {
       const newH1 = `<h${h1Match[1]}${h1Match[2]}>${data.title}</h${h1Match[1]}>`;
       const newBlock = newH1 + '\n          ' + newSubtitle;
       content = content.replace(match[0], newBlock);
       fs.writeFileSync(fullPath, content, 'utf8');
       console.log('Updated ' + file);
    }
  } else {
    console.log('Pattern not found in ' + file);
  }
}
