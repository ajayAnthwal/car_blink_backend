const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../../car_blink/hooks/auth/use-auth.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `    onSuccess: (res: any) => {
      const { token, role } = extractTokenAndRole(res);
      if (token) setCrossPortAuth(token, role);
      toast.success(res?.message || 'Registration successful! Opening your Dashboard...');
      setTimeout(() => {
        const dashboardUrl = getDashboardUrl();
        if (token) {
          window.location.href = \`\${dashboardUrl}/login?token=\${encodeURIComponent(token)}\`;
        } else {
          const route = role === 'PARTNER' ? '/partner/dashboard' : '/customer/dashboard';
          window.location.href = \`\${dashboardUrl}\${route}\`;
        }
      }, 800);
    },`;

const newCode = `    onSuccess: (res: any, variables: any) => {
      const { token, role } = extractTokenAndRole(res);
      if (token) setCrossPortAuth(token, role);
      
      const userRole = variables?.role || role;
      if (userRole === 'PARTNER') {
        toast.success(res?.message || 'Partner registration submitted successfully!');
        // Do not auto-redirect; let partner review Step 3 verification notice
      } else {
        toast.success(res?.message || 'Registration successful! Opening your Dashboard...');
        setTimeout(() => {
          const dashboardUrl = getDashboardUrl();
          if (token) {
            window.location.href = \`\${dashboardUrl}/login?token=\${encodeURIComponent(token)}\`;
          } else {
            window.location.href = \`\${dashboardUrl}/customer/dashboard\`;
          }
        }, 800);
      }
    },`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Updated use-auth.tsx successfully");
} else {
  console.log("Could not find exact oldCode, checking normalized line endings...");
  const normContent = content.replace(/\r\n/g, '\n');
  const normOld = oldCode.replace(/\r\n/g, '\n');
  if (normContent.includes(normOld)) {
    content = normContent.replace(normOld, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated use-auth.tsx with normalized lines");
  } else {
    console.error("Pattern not found in use-auth.tsx");
  }
}
