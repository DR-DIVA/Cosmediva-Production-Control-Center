const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)';

const pages = [
  { path: 'planner/page.tsx', icon: 'CalendarDays' },
  { path: 'incoming-rm/page.tsx', icon: 'Package' },
  { path: 'my-tasks/overview/page.tsx', icon: 'Factory' },
  { path: 'my-tasks/weighing/page.tsx', icon: 'Scale' },
  { path: 'my-tasks/mixing/page.tsx', icon: 'FlaskConical' },
  { path: 'my-tasks/packing/page.tsx', icon: 'Box' },
  { path: 'my-tasks/pof/page.tsx', icon: 'Boxes' },
  { path: 'my-tasks/fg/page.tsx', icon: 'Warehouse' },
  { path: 'qc-queue/page.tsx', icon: 'ShieldCheck' },
  { path: 'issues/page.tsx', icon: 'AlertTriangle' }
];

const yellowBullet = `<div className="text-sm text-[#8B7355] flex items-center mt-2 font-medium">\n              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>\n              `;

pages.forEach(page => {
  const file = path.join(dir, page.path);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // 1. Add Icon to import { ... } from 'lucide-react'
  // If lucide-react doesn't exist, we skip or add it.
  if (content.includes('lucide-react')) {
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
    const match = content.match(importRegex);
    if (match) {
      const imports = match[1].split(',').map(s => s.trim());
      if (!imports.includes(page.icon)) {
        imports.push(page.icon);
        const newImport = `import { ${imports.join(', ')} } from 'lucide-react'`;
        content = content.replace(importRegex, newImport);
        changed = true;
      }
    }
  } else {
    // add import at top
    content = `import { ${page.icon} } from 'lucide-react';\n` + content;
    changed = true;
  }
  
  // 2. Add Icon inside <h1
  // Looking for <h1 className="text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3">Title</h1>
  // Note: some might be <h2, we look for both.
  const headerRegex = /(<h[12] className="text-3xl font-extrabold tracking-tight text-\[#4A4238\] flex items-center gap-3">)([\s\S]*?)(<\/h[12]>)/;
  const hMatch = content.match(headerRegex);
  if (hMatch) {
    const innerText = hMatch[2];
    if (!innerText.includes(`className="w-8 h-8 text-yellow-400"`)) {
      // It might have another icon, let's just insert it cleanly before the text
      // We will strip any existing icon inside just in case (though there shouldn't be)
      const cleanText = innerText.replace(/<[A-Za-z]+ className="w-8 h-8[^>]+ \/>\s*/, '').trim();
      const newHeader = `${hMatch[1]}\n            <${page.icon} className="w-8 h-8 text-yellow-400" />\n            ${cleanText}\n          ${hMatch[3]}`;
      content = content.replace(hMatch[0], newHeader);
      changed = true;
    }
  }
  
  // 3. Update the bullet
  // Pattern 1: Blue bullet (Cyan)
  const blueBulletRegex = /<div className="flex items-center text-cyan-500 font-semibold">\s*<span className="w-2 h-2 rounded-full bg-cyan-500 mr-2 animate-pulse shadow-\[0_0_8px_rgba\(6,182,212,0\.8\)\]"><\/span>\s*([^<]+)\s*<\/div>/;
  if (blueBulletRegex.test(content)) {
    content = content.replace(blueBulletRegex, (match, text) => {
      return `<div className="flex items-center mt-1 text-[#8B7355] font-medium">\n              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mr-2 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]"></span>\n              ${text.trim()}\n            </div>`;
    });
    changed = true;
  } else {
    // Pattern 2: No bullet, just text (like in fg or issues)
    // Looking for: <div className="text-sm text-[#8B7355] flex flex-col mt-2 font-medium space-y-1">\n <div>text</div>\n</div>
    // Let's manually fix FG and Issues if they don't have the blue bullet.
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
