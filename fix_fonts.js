const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/src/app/(dashboard)';

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

const targetClass = 'text-3xl font-extrabold tracking-tight text-[#4A4238] flex items-center gap-3';

walkSync(dir, function(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace various h1/h2 classes
    content = content.replace(/<h([12])\s+className="text-3xl[^"]*"/g, '<h$1 className="' + targetClass + '"');
    content = content.replace(/<h([12])\s+className="text-2xl font-bold text-slate-800 flex items-center[^"]*"/g, '<h$1 className="' + targetClass + '"');
    content = content.replace(/<h([12])\s+className="text-2xl font-bold tracking-tight[^"]*"/g, '<h$1 className="' + targetClass + '"');
    
    // Replace p subtitle text colors
    content = content.replace(/<p\s+className="text-slate-500"/g, '<p className="text-sm text-[#8B7355] mt-2 font-medium"');
    content = content.replace(/<p\s+className="text-slate-500 mt-1"/g, '<p className="text-sm text-[#8B7355] mt-2 font-medium"');
    content = content.replace(/<p\s+className="text-slate-500 mt-2"/g, '<p className="text-sm text-[#8B7355] mt-2 font-medium"');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
    }
});
