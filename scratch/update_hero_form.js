const fs = require('fs');
const file = 'c:/Users/ajay anthwal/Desktop/car_blink/features/home/components/HeroForm.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('getDashboardUrl')) {
  content = content.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport { getDashboardUrl } from "@/hooks/auth/use-auth";'
  );
}

content = content.replace(
  /href=\{userToken\s*\?\s*`\$\{process\.env\.NEXT_PUBLIC_DASHBOARD_URL \|\| 'http:\/\/localhost:3000'\}\/customer\/dashboard\?token=\$\{userToken\}`\s*:\s*`\$\{process\.env\.NEXT_PUBLIC_DASHBOARD_URL \|\| 'http:\/\/localhost:3000'\}\/customer\/dashboard`\}/,
  `href={userToken 
                ? \`\${getDashboardUrl()}/login?token=\${encodeURIComponent(userToken)}\`
                : \`\${getDashboardUrl()}/customer/dashboard\`}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated HeroForm.tsx to use getDashboardUrl');
