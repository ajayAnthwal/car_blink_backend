const fs = require('fs');
const path = 'src/modules/executive/sub-modules/lead-assignment/assignment.service.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  "select: 'businessName isVerified rating',",
  "select: 'businessName isVerified rating userId',"
);
fs.writeFileSync(path, code);
