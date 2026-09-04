const xlsx = require('xlsx');

const wb = xlsx.readFile('c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/รหัสพนักงาน ชื่อ-สกุล แผนก.xlsx');
console.log('Sheet names:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json(ws);
  console.log(`\nSheet: ${name}, Total rows: ${data.length}`);
  console.log('Sample row:', data.slice(0, 5));
}
