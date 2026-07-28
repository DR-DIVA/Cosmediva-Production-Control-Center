const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/text-white bg-white\/10/g, 'text-cosme-gold bg-cosme-gold/10 border border-cosme-gold/20 shadow-sm shadow-cosme-gold/10');
content = content.replace(/hover:bg-white\/10/g, 'hover:bg-cosme-gold/10 hover:text-cosme-gold');

fs.writeFileSync(file, content);
