const fs = require('fs');
const path = require('path');

function replaceFileContent(relativePath, replacements) {
  const filePath = path.join(__dirname, relativePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  replacements.forEach(({ searchValue, replaceValue }) => {
    if (content.match(searchValue)) {
      content = content.replace(searchValue, replaceValue);
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', relativePath);
  }
}

const filesToFix = [
  'src/app/(dashboard)/my-tasks/packing/page.tsx',
  'src/app/(dashboard)/my-tasks/weighing/page.tsx',
  'src/app/(dashboard)/my-tasks/mixing/page.tsx',
  'src/app/(dashboard)/my-tasks/pof/page.tsx',
  'src/app/(dashboard)/qc-queue/page.tsx'
];

filesToFix.forEach(file => {
  replaceFileContent(file, [
    { searchValue: /รายการที่ดำเนินการแล้ววันนี้/g, replaceValue: 'ประวัติการทำงานแบบต่อเนื่อง' },
    { searchValue: /ประวัติการทำงานวันนี้/g, replaceValue: 'ประวัติการทำงานแบบต่อเนื่อง' },
    { searchValue: /รายการบรรจุสินค้าประจำวัน/g, replaceValue: 'รายการบรรจุสินค้าทั้งหมด' },
    { searchValue: /รายการงานชั่งสารประจำวัน/g, replaceValue: 'รายการงานชั่งสารทั้งหมด' },
    { searchValue: /รายการงานผสมประจำวัน/g, replaceValue: 'รายการงานผสมทั้งหมด' },
    { searchValue: /รายการงานลงลังประจำวัน/g, replaceValue: 'รายการงานลงลังทั้งหมด' }
  ]);
});
