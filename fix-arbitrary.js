const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace custom utility classes with arbitrary values
  content = content.replace(/bg-cosme-gold\/([0-9]+)/g, 'bg-[#D4AF37]/');
  content = content.replace(/bg-cosme-gold/g, 'bg-[#D4AF37]');
  content = content.replace(/hover:bg-cosme-gold-hover/g, 'hover:bg-[#B8962A]');
  content = content.replace(/text-cosme-gold\/([0-9]+)/g, 'text-[#D4AF37]/');
  content = content.replace(/text-cosme-gold/g, 'text-[#D4AF37]');
  content = content.replace(/border-cosme-gold\/([0-9]+)/g, 'border-[#D4AF37]/');
  content = content.replace(/border-cosme-gold/g, 'border-[#D4AF37]');
  
  content = content.replace(/text-cosme-dark\/([0-9]+)/g, 'text-[#4A4238]/');
  content = content.replace(/text-cosme-dark/g, 'text-[#4A4238]');
  
  content = content.replace(/bg-cosme-sidebar/g, 'bg-[#2D2721]');
  content = content.replace(/bg-cosme-cream\/([0-9]+)/g, 'bg-[#F8F6F0]/');
  content = content.replace(/bg-cosme-cream/g, 'bg-[#F8F6F0]');

  // Sidebar hardcoded colors
  content = content.replace(/color: 'text-sky-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-pink-700'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-amber-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-violet-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-orange-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-emerald-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-teal-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-slate-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-indigo-500'/g, "color: 'text-[#D4AF37]'");
  content = content.replace(/color: 'text-red-500'/g, "color: 'text-[#D4AF37]'");

  // Fix any remaining big blue buttons in FG page (Warehouse)
  content = content.replace(/bg-indigo-600/g, 'bg-[#D4AF37]');
  content = content.replace(/hover:bg-indigo-700/g, 'hover:bg-[#B8962A]');

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
console.log('Done with arbitrary replacements.');
