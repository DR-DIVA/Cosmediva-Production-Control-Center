const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// The assurance block
const assuranceRegex = /    \{\n      id: 'issues',\n      label: 'CosmeFlow Assurance',\n      description: 'ระบบจัดการปัญหาและคุณภาพ',\n      icon: <AlertTriangle className="w-5 h-5" \/>,\n      href: '\/issues',\n      color: 'text-amber-500'\n    \},\n/;
const match = content.match(assuranceRegex);

if (match) {
  content = content.replace(assuranceRegex, '');
  const qualityRegex = /    \{\n      id: 'quality',\n      label: 'CosmeFlow Quality',\n      description: 'Quality You Can Trust. Visibility You Can ...',\n      icon: <ShieldCheck className="w-5 h-5" \/>,\n      href: '\/quality',\n      color: 'text-emerald-500'\n    \},/;
  
  content = content.replace(qualityRegex, qualityRegex.source.replace(/\\/g, '') + '\n' + match[0]);
  fs.writeFileSync(file, content);
  console.log('Sidebar updated');
} else {
  console.log('Could not find assurance block');
}
