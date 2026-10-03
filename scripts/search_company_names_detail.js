const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.resolve(__dirname, '../src/components/qms'),
  path.resolve(__dirname, '../src/app/actions')
];

for (const d of targetDirs) {
  const files = fs.readdirSync(d);
  for (const f of files) {
    const full = path.join(d, f);
    if (fs.statSync(full).isFile() && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/Co\.,\s*Ltd/i.test(lines[i]) || /บริษัท\s*คอสเมดิวา/i.test(lines[i])) {
          console.log(`${f}:${i+1} -> ${lines[i].trim()}`);
        }
      }
    }
  }
}
