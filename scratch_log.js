const fs = require('fs');
const logFile = 'C:\\Users\\ajay anthwal\\.gemini\\antigravity-ide\\brain\\10c9dc36-d75b-4df1-b306-0f970beac776\\.system_generated\\tasks\\task-2106.log';
if (fs.existsSync(logFile)) {
    const data = fs.readFileSync(logFile, 'utf8');
    const lines = data.split('\n');
    console.log(lines.slice(-50).join('\n'));
} else {
    console.log('Log file not found');
}
