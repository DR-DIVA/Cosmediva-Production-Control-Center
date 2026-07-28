const fs = require('fs');
const file = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure ShoppingCart and Users are imported
if (!content.includes('ShoppingCart')) {
  content = content.replace(/import \{([^\}]+)\} from 'lucide-react'/, (match, p1) => {
    return `import {${p1}, ShoppingCart, Users} from 'lucide-react'`;
  });
}

// Update Purchase
content = content.replace(
  /label: 'CosmeFlow Purchase',[\s\S]*?color: 'text-\[#D4AF37\]'/,
  `label: 'CosmeFlow Purchase',
    subtitle: 'From Request to Receipt, Simplified.',
    icon: ShoppingCart,
    href: '/purchase',
    color: 'text-[#D4AF37]'`
);

// Update Maintenance
content = content.replace(
  /label: 'CosmeFlow Maintenance',[\s\S]*?color: 'text-\[#D4AF37\]'/,
  `label: 'CosmeFlow Maintenance',
    subtitle: 'Keep Every Machine Running at Its Best.',
    icon: Settings,
    href: '/maintenance',
    color: 'text-[#D4AF37]'`
);

// Update People
content = content.replace(
  /label: 'CosmeFlow People',[\s\S]*?color: 'text-\[#D4AF37\]'/,
  `label: 'CosmeFlow People',
    subtitle: 'Connecting People with Performance.',
    icon: Users,
    href: '/people',
    color: 'text-[#D4AF37]'`
);

fs.writeFileSync(file, content);
console.log('Sidebar updated!');
