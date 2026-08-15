const fs = require('fs');

function replaceFile(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<Table className="text-sm">/g, '<Table className="text-sm table-fixed w-full">');
  content = content.replace(/<Table className="text-sm w-full">/g, '<Table className="text-sm table-fixed w-full">');
  content = content.replace(/<table className="w-full text-sm text-left">/g, '<table className="w-full text-sm text-left table-fixed">');
  fs.writeFileSync(file, content);
}

replaceFile('src/app/(dashboard)/planner/page.tsx');
replaceFile('src/app/(dashboard)/my-tasks/[task]/page.tsx');
console.log('Fixed tables 2');
