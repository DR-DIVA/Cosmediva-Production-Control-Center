const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/my-tasks/fg/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<h1 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-yellow-400" />
            CosmeFlow Warehouse
          </h1>`;
          
const replace = `<h1 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3 whitespace-nowrap">
            <Warehouse className="w-8 h-8 text-yellow-400 shrink-0" />
            CosmeFlow FG Warehouse
          </h1>`;

content = content.replace(target, replace);
fs.writeFileSync(file, content);
console.log('Done!');
