const fs = require('fs');
const path = require('path');
const logPath = path.join('C:', 'Users', 'hp', '.gemini', 'antigravity', 'brain', '7f1a3657-7885-4f67-83bd-af128ac1d767', '.system_generated', 'logs', 'transcript_full.jsonl');
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('TOOL_RESPONSE') && lines[i].includes('capacity_max') && !lines[i].includes('CodeContent')) {
        fs.writeFileSync('C:/Users/hp/Dropbox/AI AGENT/Antigravity/Update PD Daily Status/cosmediva-os/dump.txt', lines[i]);
        console.log('Dumped to dump.txt');
        break;
    }
}
