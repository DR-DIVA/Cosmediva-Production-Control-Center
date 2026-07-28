const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)';
const targetClass = 'flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6';

const filesToFix = [
  'my-tasks/overview/page.tsx',
  'my-tasks/weighing/page.tsx',
  'my-tasks/mixing/page.tsx',
  'my-tasks/packing/page.tsx',
  'my-tasks/pof/page.tsx',
  'qc-queue/page.tsx'
];

filesToFix.forEach(relPath => {
  const file = path.join(dir, relPath);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // We want to find the <div className="..."> right before <div><h1... or <h1... or <h2...
  // Since we know the structure is:
  // <div className="...">
  //   <div>
  //     <h1 className="text-3xl font-extrabold...
  
  const regex = /(<div className="[^"]*">\s*(?:<div>\s*)?<h[12] className="text-3xl font-extrabold tracking-tight text-\[#4A4238\])/;
  
  const match = content.match(regex);
  if (match) {
    const fullMatch = match[1];
    // extract old class
    const oldClassMatch = fullMatch.match(/<div className="([^"]*)">/);
    if (oldClassMatch) {
      const oldClass = oldClassMatch[1];
      if (oldClass !== targetClass) {
        // replace the first occurrence of oldClass within the fullMatch context
        const newMatch = fullMatch.replace(oldClass, targetClass);
        content = content.replace(fullMatch, newMatch);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
      }
    }
  }
});
