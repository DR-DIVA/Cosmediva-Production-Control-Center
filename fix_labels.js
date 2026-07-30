const fs = require('fs');
const path = require('path');

function replaceFileContent(relativePath, replacements) {
  const filePath = path.join(__dirname, relativePath);
  let content = fs.readFileSync(filePath, 'utf8');
  replacements.forEach(({ searchValue, replaceValue }) => {
    content = content.replace(searchValue, replaceValue);
  });
  fs.writeFileSync(filePath, content, 'utf8');
}

replaceFileContent('src/app/(dashboard)/qc-queue/page.tsx', [
  { searchValue: /รายการตรวจสอบวันนี้/g, replaceValue: 'ประวัติการตรวจสอบแบบต่อเนื่อง' }
]);

replaceFileContent('src/app/(dashboard)/my-tasks/packing/page.tsx', [
  { searchValue: /ประวัติการทำงานวันนี้/g, replaceValue: 'ประวัติการทำงานแบบต่อเนื่อง' },
  { searchValue: /รายการที่ทำวันนี้/g, replaceValue: 'ประวัติการทำงานแบบต่อเนื่อง' },
  { searchValue: /ไม่มีประวัติการทำงานของวันนี้/g, replaceValue: 'ไม่มีประวัติการทำงาน' },
  { searchValue: /ไม่มีประวัติการบรรจุวันนี้/g, replaceValue: 'ไม่มีประวัติการทำงาน' }
]);

console.log('Fixed text in QC and Packing');
