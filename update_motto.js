const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/layout.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'One Flow. One Factory. One Future.',
  'One Platform. Every Process. Total Control.'
);

fs.writeFileSync(file, content);
console.log('Slogan updated!');
