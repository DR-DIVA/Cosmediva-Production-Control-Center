const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-white rounded-full/g, 'bg-slate-100 rounded-full');

fs.writeFileSync(file, content);
