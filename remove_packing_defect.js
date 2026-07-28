const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/packing/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Alert
content = content.replace(/\{\/\*\s*Alert for Defect Report\s*\*\/\}[\s\S]*?<\/Button>\s*<\/div>\s*\)\}/, '');

// 2. Remove Modal
content = content.replace(/\{\/\*\s*Defect Modal\s*\*\/\}[\s\S]*?<\/Dialog>/, '');

// 3. Remove isDefectReportMissing
content = content.replace(/const isDefectReportMissing = allDefects\.length === 0 && tasks\.length > 0;/, '');

// 4. Remove handleDefectSubmit
content = content.replace(/const handleDefectSubmit = async \(\) => \{[\s\S]*?fetchTasks\(\)\s*\}/, '');

// 5. Remove state variables
content = content.replace(/const \[allDefects, setAllDefects\].*\n/, '');
content = content.replace(/const \[isDefectModalOpen, setIsDefectModalOpen\].*\n/, '');
content = content.replace(/const \[defectLotId, setDefectLotId\].*\n/, '');
content = content.replace(/const \[defectQuantity, setDefectQuantity\].*\n/, '');
content = content.replace(/const \[defectNote, setDefectNote\].*\n/, '');

// 6. Remove fetch defects
content = content.replace(/\/\/ Fetch Defects for alert[\s\S]*?if \(defects\) setAllDefects\(defects\)\n/, '');

fs.writeFileSync(file, content);
console.log('Removed defects logic from packing page.');
