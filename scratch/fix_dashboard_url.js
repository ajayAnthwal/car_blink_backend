const fs = require('fs');
const file = 'c:/Users/ajay anthwal/Desktop/car_blink/hooks/auth/use-auth.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "return 'http://localhost:3000';",
  "return 'http://localhost:3001';"
);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated getDashboardUrl to port 3001');
