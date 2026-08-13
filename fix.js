const fs = require('fs');
const path = 'src/modules/executive/sub-modules/lead-assignment/assignment.service.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  ".populate('assignedPartnerId', 'businessName isVerified')",
  ".populate('assignedPartnerIds', 'businessName isVerified')"
);
fs.writeFileSync(path, code);
