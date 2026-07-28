const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /    \{\s*id:\s*'issues'[\s\S]*?\},?\n/;
const match = content.match(regex);

if (match) {
  content = content.replace(regex, '');
  const targetRegex = /(    \{\s*id:\s*'quality'[\s\S]*?\},?\n)/;
  content = content.replace(targetRegex, `$1${match[0]}`);
  fs.writeFileSync(file, content);
  console.log('Moved Assurance in Sidebar.');
} else {
  console.log('Failed to match');
}
