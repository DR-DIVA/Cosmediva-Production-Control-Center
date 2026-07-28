const fs = require('fs');

// 1. Update Sidebar
const sidebarFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/components/layout/Sidebar.tsx';
let sidebarContent = fs.readFileSync(sidebarFile, 'utf8');

sidebarContent = sidebarContent.replace("subtitle: 'ระบบข้อมูลและ Dashboard ผู้บริหาร'", "subtitle: 'Turn Factory Data into Business Decisions.'");
sidebarContent = sidebarContent.replace("subtitle: 'ระบบวางแผนการผลิต'", "subtitle: 'Plan Smarter. Produce Better.'");
sidebarContent = sidebarContent.replace("subtitle: 'ระบบติดตามกระบวนการผลิต'", "subtitle: 'Track Every Step. Improve Every Batch.'");
sidebarContent = sidebarContent.replace("subtitle: 'ระบบบริหาร QA/QC'", "subtitle: 'Quality You Can Trust. Visibility You Can Share.'");
sidebarContent = sidebarContent.replace("subtitle: 'ระบบบริหารคลังสินค้า'", "subtitle: 'Every Item. Every Movement. Fully Visible.'");
sidebarContent = sidebarContent.replace("subtitle: 'ระบบบริหารจัดซื้อ'", "subtitle: 'Buy Smarter. Deliver On Time.'");
sidebarContent = sidebarContent.replace("subtitle: 'ระบบซ่อมบำรุง'", "subtitle: 'Reliable Machines. Reliable Production.'");
sidebarContent = sidebarContent.replace("subtitle: 'ระบบบริหารบุคลากร'", "subtitle: 'Empower People. Elevate Performance.'");

fs.writeFileSync(sidebarFile, sidebarContent);

// 2. Update layout top header
const layoutFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)/layout.tsx';
let layoutContent = fs.readFileSync(layoutFile, 'utf8');
layoutContent = layoutContent.replace(/Flow Better\. Work Smarter\./g, "One Flow. One Factory. One Future.");
fs.writeFileSync(layoutFile, layoutContent);

// 3. Update login page
const loginFile = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/login/page.tsx';
let loginContent = fs.readFileSync(loginFile, 'utf8');
loginContent = loginContent.replace(/The Digital Operating System for Cosmediva Manufacturing/g, "One Flow. One Factory. One Future.");
fs.writeFileSync(loginFile, loginContent);

console.log('Update complete.');
