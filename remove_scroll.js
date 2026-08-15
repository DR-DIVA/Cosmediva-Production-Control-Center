const fs = require('fs');
['src/app/(dashboard)/incoming-rm/page.tsx', 'src/app/(dashboard)/qc-queue/page.tsx', 'src/app/(dashboard)/planner/page.tsx'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<Table className="whitespace-nowrap text-sm">/g, '<Table className="text-sm">');
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
