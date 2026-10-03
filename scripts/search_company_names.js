const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const matches = [];

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(fullPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.json') || entry.name.endsWith('.html') || entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (/cosmediva\s+international/i.test(lines[i]) || /คอสเมดิวา\s*อินเตอร์เนชั่นแนล/i.test(lines[i])) {
            matches.push({
              file: path.relative(projectRoot, fullPath),
              line: i + 1,
              text: lines[i].trim()
            });
          }
        }
      }
    }
  }
}

searchDir(projectRoot);
console.log(`Found ${matches.length} occurrences:`);
for (const m of matches) {
  console.log(`${m.file}:${m.line} -> ${m.text}`);
}
