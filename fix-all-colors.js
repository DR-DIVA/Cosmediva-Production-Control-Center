const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Primary buttons and colors
  content = content.replace(/bg-blue-600/g, 'bg-cosme-gold');
  content = content.replace(/hover:bg-blue-700/g, 'hover:bg-cosme-gold-hover');
  content = content.replace(/text-blue-500/g, 'text-cosme-gold');
  content = content.replace(/text-blue-600/g, 'text-cosme-gold');
  content = content.replace(/text-blue-700/g, 'text-cosme-gold');
  content = content.replace(/bg-blue-50\/50/g, 'bg-cosme-gold/5');
  content = content.replace(/bg-blue-50\/30/g, 'bg-cosme-gold/5');
  content = content.replace(/bg-blue-50/g, 'bg-cosme-gold/10');
  content = content.replace(/bg-blue-100/g, 'bg-cosme-gold/20');
  content = content.replace(/border-blue-100/g, 'border-cosme-gold/20');
  content = content.replace(/border-blue-200/g, 'border-cosme-gold/30');
  content = content.replace(/border-blue-300/g, 'border-cosme-gold/40');
  
  // Specific buttons that were hardcoded dark in task pages
  content = content.replace(/bg-slate-800 hover:bg-slate-900 text-white/g, 'bg-cosme-gold hover:bg-cosme-gold-hover text-white');
  content = content.replace(/bg-slate-800 hover:bg-slate-900/g, 'bg-cosme-gold hover:bg-cosme-gold-hover');

  // Backgrounds and text
  content = content.replace(/bg-slate-50/g, 'bg-cosme-cream');
  // Some pages used bg-slate-900, we should carefully change them, but mostly in qc-queue tooltips it's okay.
  
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
console.log('Done replacing colors.');
