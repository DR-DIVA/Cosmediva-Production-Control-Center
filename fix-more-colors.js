const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Catch remaining blues
  content = content.replace(/text-blue-800/g, 'text-cosme-dark');
  content = content.replace(/text-blue-300/g, 'text-cosme-dark/70');
  content = content.replace(/border-blue-500/g, 'border-cosme-gold/50');
  content = content.replace(/bg-blue-200/g, 'bg-cosme-gold/20');
  content = content.replace(/bg-blue-500/g, 'bg-cosme-gold');

  // Fix generic headers
  content = content.replace(/bg-slate-900 text-white/g, 'bg-cosme-sidebar text-white');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated: ' + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir('c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app');
walkDir('c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/components');
console.log('Done finishing up.');
