
const fs = require('fs');
let file = 'src/app/(dashboard)/incoming-rm/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Table definitions
content = content.replace(/<Table className="text-sm">/g, '<Table className="text-sm table-fixed w-full">');
content = content.replace(/<Table className="text-sm w-full">/g, '<Table className="text-sm table-fixed w-full">');

// Revert back escaped backticks used for PS string interpolation
content = content.replace(/\/g, ''); // just in case

fs.writeFileSync(file, content);
console.log('done');

