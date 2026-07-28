const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// MetricCard Props
content = content.replace(
  /glowColor="rgba\(56,189,248,0\.2\)" barColor="bg-sky-400" textColor="text-sky-400"/g,
  'glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]"'
);
content = content.replace(
  /glowColor="rgba\(129,140,248,0\.2\)" barColor="bg-indigo-400" textColor="text-indigo-400"/g,
  'glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]"'
);
content = content.replace(
  /glowColor="rgba\(167,139,250,0\.2\)" barColor="bg-violet-400" textColor="text-violet-400"/g,
  'glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]"'
);
content = content.replace(
  /glowColor="rgba\(232,121,249,0\.2\)" barColor="bg-fuchsia-400" textColor="text-fuchsia-400"/g,
  'glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]"'
);
content = content.replace(
  /glowColor="rgba\(244,114,182,0\.2\)" barColor="bg-pink-400" textColor="text-pink-400"/g,
  'glowColor="rgba(212,175,55,0.2)" barColor="bg-[#D4AF37]" textColor="text-[#D4AF37]"'
);

// Planner Queue and FG Delivery
content = content.replace(/text-emerald-400/g, 'text-[#D4AF37]');
content = content.replace(/text-sky-400/g, 'text-[#D4AF37]');
content = content.replace(/bg-emerald-500\/10/g, 'bg-[#D4AF37]/10');
content = content.replace(/rgba\(52,211,153,0\.4\)/g, 'rgba(212,175,55,0.4)');

// YieldCard
content = content.replace(
  /text-emerald-400 drop-shadow-\[0_0_8px_rgba\(52,211,153,0\.4\)\]/g,
  'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]'
);

// OeeCard
content = content.replace(
  /const colorClass = value > 80 \? 'text-emerald-400 drop-shadow-\[0_0_8px_rgba\(52,211,153,0\.4\)\]' : value > 60 \? 'text-yellow-400 drop-shadow-\[0_0_8px_rgba\(250,204,21,0\.4\)\]' : 'text-rose-500 drop-shadow-\[0_0_8px_rgba\(244,63,94,0\.4\)\]'/g,
  "const colorClass = 'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]'"
);

fs.writeFileSync(file, content);
console.log('Colors replaced!');
