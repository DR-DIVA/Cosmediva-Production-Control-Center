const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const candidates = [
  path.join(process.env.USERPROFILE || '', 'Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/รหัสพนักงาน ชื่อ-สกุล แผนก.xlsx'),
  'C:/Users/Dr.Nuch/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/รหัสพนักงาน ชื่อ-สกุล แผนก.xlsx',
  'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/รหัสพนักงาน ชื่อ-สกุล แผนก.xlsx'
];
const excelPath = candidates.find(p => fs.existsSync(p)) || candidates[1];
const wb = xlsx.readFile(excelPath);
console.log('Sheet names:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json(ws);
  console.log(`\nSheet: ${name}, Total rows: ${data.length}`);
  console.log('Sample row:', data.slice(0, 5));
}
