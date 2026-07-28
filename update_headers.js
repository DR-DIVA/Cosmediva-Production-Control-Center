const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)';
const files = [
  'incoming-rm/page.tsx',
  'qc-queue/page.tsx',
  'my-tasks/overview/page.tsx',
  'my-tasks/weighing/page.tsx',
  'my-tasks/mixing/page.tsx',
  'my-tasks/packing/page.tsx',
  'my-tasks/pof/page.tsx',
  'my-tasks/fg/page.tsx',
  'issues/page.tsx'
];

const ICONS = {
  'incoming-rm': 'Box',
  'qc-queue': 'ShieldAlert',
  'overview': 'Activity',
  'weighing': 'Scale',
  'mixing': 'Beaker',
  'packing': 'Package',
  'pof': 'Box',
  'fg': 'PackageCheck',
  'issues': 'AlertTriangle'
}

for (const file of files) {
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  const headerRegex = /<div className="flex justify-between items-end">\s*<div>\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/div>([\s\S]*?)<\/div>\s*(?=<div className="grid)/i;
  
  const match = content.match(headerRegex);
  if (match) {
    const title = match[1].replace(/<[^>]+>/g, '').trim();
    const subtitle = match[2].trim();
    const rightSideRaw = match[3];
    
    let rightSide = rightSideRaw.trim();
    if (rightSide) {
       rightSide = rightSide.replace(/<div className="flex gap-2">/, '<div className="flex flex-wrap items-center gap-2">');
    }
    
    // figure out icon
    const pageKey = file.includes('my-tasks') ? file.split('/')[1] : file.split('/')[0];
    const icon = ICONS[pageKey] || 'ListTodo';
    
    // add import for icon if missing
    if (!content.includes(icon) && content.includes('lucide-react')) {
       content = content.replace(/import \{([^}]*)\} from "lucide-react"/, (m, p1) => {
         return `import { ${p1}, ${icon} } from "lucide-react"`;
       });
    }
    
    const newHeader = `<div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">
            <${icon} className="w-8 h-8 text-[#D4AF37]" />
            ${title}
          </h1>
          <div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>
            ${subtitle}
          </div>
        </div>
        ${rightSide}
      </div>\n`;
      
    content = content.replace(headerRegex, newHeader);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated ' + file);
  } else {
    console.log('No standard header found in ' + file);
  }
}
