const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-slate-950/g, 'bg-transparent');
content = content.replace(/bg-slate-800\/50/g, 'bg-cosme-cream/50');
content = content.replace(/bg-slate-800/g, 'bg-white');
content = content.replace(/border-slate-600\/50/g, 'border-cosme-gold/10');
content = content.replace(/border-slate-600/g, 'border-cosme-gold/20');
content = content.replace(/border-slate-700/g, 'border-cosme-gold/20');
content = content.replace(/text-slate-200/g, 'text-cosme-dark');
content = content.replace(/text-slate-100/g, 'text-cosme-dark');
content = content.replace(/text-white/g, 'text-cosme-dark');
content = content.replace(/text-slate-500/g, 'text-cosme-dark/70');
content = content.replace(/text-slate-400/g, 'text-cosme-dark/60');
content = content.replace(/shadow-\[0_0_10px_rgba\(34,211,238,0\.8\)\]/g, 'shadow-[0_0_10px_rgba(212,175,55,0.8)]');
content = content.replace(/bg-cyan-400/g, 'bg-cosme-gold');

// specific text-white fixes where buttons or badges should actually be white
content = content.replace(/text-cosme-dark border/g, 'text-cosme-dark border');

fs.writeFileSync(file, content);
