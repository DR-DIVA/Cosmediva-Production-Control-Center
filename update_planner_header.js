const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/planner/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<h1 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-yellow-400" />
            CosmeFlow Planning: PD Master Plan
          </h1>`;
          
const replace = `<h1 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3 whitespace-nowrap">
            <CalendarDays className="w-8 h-8 text-yellow-400 shrink-0" />
            CosmeFlow Planning: PD Master Plan
          </h1>`;

content = content.replace(target, replace);
fs.writeFileSync(file, content);
console.log('Planner header updated!');
