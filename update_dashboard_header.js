const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<h2 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
            <Activity className="w-8 h-8 text-yellow-400" />
            CosmeFlow Executive Dashboard
          </h2>`;
          
const replace = `<h2 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3 whitespace-nowrap">
            <Activity className="w-8 h-8 text-yellow-400 shrink-0" />
            CosmeFlow Executive Dashboard
          </h2>`;

content = content.replace(target, replace);
fs.writeFileSync(file, content);
console.log('Dashboard header updated!');
