const fs = require('fs');
const packingFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/packing/page.tsx';
const overviewFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/overview/page.tsx';

let packingContent = fs.readFileSync(packingFile, 'utf8');
let overviewContent = fs.readFileSync(overviewFile, 'utf8');

// The blocks to move are quite complex, it's safer to use manual parsing in the script.
// But to avoid destroying the AST, let me just remove them from packing first.

packingContent = packingContent.replace(/const \[allDefects.*?useState\(''[^\]]*\)\n/s, '');
// Wait, the state variables are:
// const [allDefects, setAllDefects] = useState<any[]>([])
// const [isDefectModalOpen, setIsDefectModalOpen] = useState(false)
// const [defectLotId, setDefectLotId] = useState('')
// const [defectQuantity, setDefectQuantity] = useState('')
// const [defectNote, setDefectNote] = useState('')
packingContent = packingContent.replace(/  const \[allDefects, setAllDefects\].*?useState\(''\)\n/s, '');

// Fetch logic
//     // Fetch Defects for alert
//     const { data: defects } = await supabase
//       .from('production_logs')
//       .select('*')
//       .eq('status', 'DEFECT')
//       .gte('activity_date', today)
//     if (defects) setAllDefects(defects)
packingContent = packingContent.replace(/\s*\/\/ Fetch Defects for alert.*?if \(defects\) setAllDefects\(defects\)\n/s, '');

// handleDefectSubmit
//   const handleDefectSubmit = async () => { ... }
packingContent = packingContent.replace(/\s*const handleDefectSubmit = async \(\) => \{[\s\S]*?setIsDefectModalOpen\(false\)\n\s*setDefectQuantity\(''\)\n\s*setDefectNote\(''\)\n\s*fetchTasks\(\)\n\s*}\n/s, '');

// const isDefectReportMissing = allDefects.length === 0 && tasks.length > 0;
packingContent = packingContent.replace(/\s*const isDefectReportMissing = allDefects\.length === 0 && tasks\.length > 0;\n/s, '');

// Defect Modal
//       {/* Defect Modal */}
//       <Dialog open={isDefectModalOpen} ... </Dialog>
packingContent = packingContent.replace(/\s*\{\/\* Defect Modal \*\/\}\s*<Dialog open=\{isDefectModalOpen\}[\s\S]*?<\/Dialog>\n/s, '');

// Alert
//       {/* Alert for Defect Report */}
//       {isDefectReportMissing && (
//         ...
//       )}
packingContent = packingContent.replace(/\s*\{\/\* Alert for Defect Report \*\/\}\s*\{isDefectReportMissing && \([\s\S]*?\)\}\n/s, '');

fs.writeFileSync(packingFile, packingContent);
console.log('Removed from packing.');
