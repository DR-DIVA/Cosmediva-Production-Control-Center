const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)';

const targetClass = 'flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-xl border border-[#D4AF37]/30 gap-4 mb-6';

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && filePath.endsWith('.tsx')) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(dir, function(filePath) {
    // skip planner and dashboard as they are already correct
    if (filePath.includes('planner\\page.tsx') || filePath.includes('dashboard\\page.tsx')) {
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern to find the wrapper div before the header
    // Examples: 
    // <div className="flex justify-between items-end">
    // <div className="flex-shrink-0">
    // <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
    // <div className="flex justify-between items-center">
    
    // We look for a <div className="..."> that is immediately followed by <div>\s*<h[12] or just <h[12]
    const regex = /<div className="([^"]*)">\s*(?:<div>\s*)?<h[12] className="text-3xl font-extrabold/;
    
    const match = content.match(regex);
    if (match) {
        // the full matched string is match[0]
        // replace the captured class name with targetClass
        const oldClass = match[1];
        if (oldClass !== targetClass) {
            // Replace ONLY the first occurrence of this exact sequence to avoid replacing other divs
            const newDiv = match[0].replace(oldClass, targetClass);
            content = content.replace(match[0], newDiv);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated ' + filePath);
        }
    }
});
