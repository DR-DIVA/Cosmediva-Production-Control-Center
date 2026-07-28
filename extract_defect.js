const fs = require('fs');
const packingFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/packing/page.tsx';

let packingContent = fs.readFileSync(packingFile, 'utf8');

const stateMatch = packingContent.match(/  const \[allDefects, setAllDefects\].*?useState\(''\)\n/s);
const fetchMatch = packingContent.match(/\s*\/\/ Fetch Defects for alert.*?if \(defects\) setAllDefects\(defects\)\n/s);
const submitMatch = packingContent.match(/\s*const handleDefectSubmit = async \(\) => \{[\s\S]*?setIsDefectModalOpen\(false\)\n\s*setDefectQuantity\(''\)\n\s*setDefectNote\(''\)\n\s*fetchTasks\(\)\n\s*}\n/s);
const condMatch = packingContent.match(/\s*const isDefectReportMissing = allDefects\.length === 0 && tasks\.length > 0;\n/s);
const modalMatch = packingContent.match(/\s*\{\/\* Defect Modal \*\/\}\s*<Dialog open=\{isDefectModalOpen\}[\s\S]*?<\/Dialog>\n/s);
const alertMatch = packingContent.match(/\s*\{\/\* Alert for Defect Report \*\/\}\s*\{isDefectReportMissing && \([\s\S]*?\)\}\n/s);

fs.writeFileSync('defect_parts.json', JSON.stringify({
  state: stateMatch ? stateMatch[0] : null,
  fetch: fetchMatch ? fetchMatch[0] : null,
  submit: submitMatch ? submitMatch[0] : null,
  cond: condMatch ? condMatch[0] : null,
  modal: modalMatch ? modalMatch[0] : null,
  alert: alertMatch ? alertMatch[0] : null
}, null, 2));

console.log('Extracted parts.');
