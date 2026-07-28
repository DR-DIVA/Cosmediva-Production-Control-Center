const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/issues/page.tsx';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('"use client"')) {
    content = '"use client";\n' + content;
    fs.writeFileSync(file, content);
}
