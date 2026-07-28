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
    sub1: 'Track Every Step. Improve Every Batch.'
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
  if (!fs.existsSync(fullPath)) {
    console.log('File not found: ' + file);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Find the h1 or h2 tag inside the header block
  const hMatch = content.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/);
  if (hMatch) {
    // Replace the title
    content = content.replace(hMatch[1], hMatch[1].replace(/>[^<]*$/, `>${data.title}`));
  }
  
  // Replace the subtitle. The subtitle looks like:
  // <p className="text-sm text-[#8B7355] mt-2 font-medium">...</p>
  // Wait, I updated them to have a pulse dot? No, that was only for planner. I did not run the update_headers.js successfully for the other files!
  // The other files still have <p className="text-sm text-[#8B7355] mt-2 font-medium"> from fix_fonts.js
  
  const pRegex = /<p className="text-sm text-\[#8B7355\] mt-2 font-medium"[^>]*>([\s\S]*?)<\/p>/;
  const pMatch = content.match(pRegex);
  
  let newSubtitle = data.sub1;
  if (data.sub2) {
    // If there is sub2, we can render them as two lines, or one line with a dot, or just a new structure.
    // The Dashboard uses:
    // <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium">
    //   <div className="flex items-center"><span dot...></span> sub2</div>
    // </div>
    // Let's just create a div block to replace the <p>
    newSubtitle = `
          <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">
             <div>${data.sub1}</div>
             <div className="flex items-center text-cyan-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                ${data.sub2}
             </div>
          </div>`.trim();
  } else {
    // Just sub1
    newSubtitle = `
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
             <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
             ${data.sub1}
          </div>`.trim();
  }
  
  if (pMatch) {
    content = content.replace(pMatch[0], newSubtitle);
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Updated ' + file);
}
