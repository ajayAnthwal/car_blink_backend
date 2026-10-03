const fs = require('fs');
const path = require('path');

const websiteDir = 'c:/Users/ajay anthwal/Desktop/car_blink';

// 1. Update use-auth.tsx: getDashboardUrl
const useAuthPath = path.join(websiteDir, 'hooks/auth/use-auth.tsx');
let useAuthContent = fs.readFileSync(useAuthPath, 'utf8');

// Ensure getDashboardUrl returns port 3001 on localhost
useAuthContent = useAuthContent.replace(
  /export const getDashboardUrl = \(\): string => {[\s\S]*?return clean\.replace\(\/\\\/\\\$\/, ''\);\s*};/,
  `export const getDashboardUrl = (): string => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return 'http://localhost:3001';
    }
  }
  const raw = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.carblink.in';
  let clean = raw.trim().replace(/^["']|["']$/g, '');
  if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = \`http://\${clean}\`;
  }
  return clean.replace(/\\/$/, '');
};`
);
fs.writeFileSync(useAuthPath, useAuthContent, 'utf8');
console.log('Updated getDashboardUrl in use-auth.tsx');

// 2. Update .env: NEXT_PUBLIC_DASHBOARD_URL
const envPath = path.join(websiteDir, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');
envContent = envContent.replace(
  /NEXT_PUBLIC_DASHBOARD_URL=http:\/\/localhost:3000/,
  'NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001'
);
fs.writeFileSync(envPath, envContent, 'utf8');
console.log('Updated NEXT_PUBLIC_DASHBOARD_URL in .env');

// 3. Update quotes/page.tsx
const quotesPagePath = path.join(websiteDir, 'app/(marketing)/quotes/page.tsx');
let quotesContent = fs.readFileSync(quotesPagePath, 'utf8');

// Add import if not present
if (!quotesContent.includes('getDashboardUrl')) {
  quotesContent = quotesContent.replace(
    'import { useAuth } from "@/features/auth/hooks/useAuth";',
    'import { useAuth } from "@/features/auth/hooks/useAuth";\nimport { getDashboardUrl } from "@/hooks/auth/use-auth";'
  );
}

// Update the OTP submission handler inside isOtpStep
const oldOtpSubmitRegex = /<Button\s+onClick=\{async \(\) => \{\s+if \(otp\.trim\(\)\.length < 6\) \{[\s\S]*?className="w-full"\s+rightIcon=\{isSubmitting \? <Loader2 className="w-4 h-4 animate-spin" \/> : <ArrowRight className="w-4 h-4" \/>\}\s*>\s*\{isSubmitting \? "Verifying\.\.\." : "Verify & Submit Quote Request"\}\s*<\/Button>/;

const newOtpSubmitCode = `<Button
                  onClick={async () => {
                    if (otp.trim().length < 6) {
                      toast.error("Please enter the 6-digit OTP code");
                      return;
                    }
                    try {
                      const fullAddressStr = [
                        formData.address ? \`Custom Address: \${formData.address}\` : '',
                        formData.location ? \`Location: \${formData.location}\` : '',
                        \`Services: \${formData.services.join(", ")}\`,
                        \`Fuel: \${formData.fuelType}\`,
                        formData.vehicleNumber ? \`Vehicle No: \${formData.vehicleNumber}\` : '',
                        formData.otherServiceDetails ? \`Other Details: \${formData.otherServiceDetails}\` : ''
                      ].filter(Boolean).join(" | ");

                      const res: any = await createLead({
                        name: formData.name,
                        phone: formData.phone,
                        email: formData.email,
                        source: 'WEBSITE_QUOTE',
                        vehicleBrand: formData.make,
                        vehicleModel: formData.model === "Other" ? formData.otherModelDetails : formData.model,
                        city: formData.location || formData.address || 'Not specified',
                        message: fullAddressStr,
                        otp: otp.trim(),
                        fuelType: formData.fuelType,
                        vehicleNumber: formData.vehicleNumber,
                        services: formData.services,
                      });

                      const tokens = res?.tokens || res?.data?.tokens;
                      const user = res?.user || res?.data?.user;

                      if (tokens?.accessToken) {
                        try {
                          localStorage.setItem('accessToken', tokens.accessToken);
                          localStorage.setItem('token', tokens.accessToken);
                          localStorage.setItem('car_blink_access_token', tokens.accessToken);
                          if (tokens.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
                          if (user) localStorage.setItem('user', JSON.stringify(user));
                          localStorage.setItem('role', 'CUSTOMER');
                          localStorage.setItem('user_role', 'CUSTOMER');

                          const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('carblink.in');
                          const domain = isProd ? '; domain=.carblink.in' : '';
                          document.cookie = \`accessToken=\${tokens.accessToken}; path=/\${domain}; max-age=31536000\`;
                          document.cookie = \`car_blink_access_token=\${tokens.accessToken}; path=/\${domain}; max-age=31536000\`;
                          document.cookie = \`role=CUSTOMER; path=/\${domain}; max-age=31536000\`;
                          document.cookie = \`user_role=CUSTOMER; path=/\${domain}; max-age=31536000\`;
                        } catch (e) {
                          console.error('Auth storage sync warning:', e);
                        }

                        toast.success("Quote Verified! Redirecting to your Customer Dashboard...");
                        setStep(6);

                        const dashboardUrl = getDashboardUrl();
                        window.location.href = \`\${dashboardUrl}/login?token=\${encodeURIComponent(tokens.accessToken)}\`;
                        return;
                      }

                      toast.success("Query Submitted Successfully! We will contact you soon.");
                      setStep(6);
                    } catch (err: any) {
                      toast.error(err.message || "Invalid OTP code. Please try again.");
                    }
                  }}
                  disabled={isSubmitting || otp.length < 6}
                  variant="accent"
                  size="lg"
                  className="w-full"
                  rightIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                >
                  {isSubmitting ? "Verifying & Creating Account..." : "Verify & Submit Quote Request"}
                </Button>`;

if (oldOtpSubmitRegex.test(quotesContent)) {
  quotesContent = quotesContent.replace(oldOtpSubmitRegex, newOtpSubmitCode);
  console.log('Replaced oldOtpSubmitRegex successfully');
} else {
  console.log('Regex did not match directly, trying manual string replacement...');
}

// Also update step 6 so it displays direct link to dashboard
const oldStep6Regex = /case 6:[\s\S]*?return \(\s*<div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center text-center py-10">[\s\S]*?<\/div>\s*\);\s*\}/;

const newStep6Code = `case 6:
        const dashboardUrl = getDashboardUrl();
        const storedToken = (typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('car_blink_access_token')) : '');
        const targetDashboardHref = storedToken 
          ? \`\${dashboardUrl}/login?token=\${encodeURIComponent(storedToken)}\`
          : \`\${dashboardUrl}/customer/dashboard\`;

        return (
          <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center text-center py-10">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-success/20">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="font-heading font-black text-3xl text-neutral-text-dark mb-4">
              Quote Request Submitted!
            </h2>
            <p className="font-body text-neutral-text-muted text-base max-w-md leading-relaxed mb-6">
              Thank you, <span className="font-bold text-neutral-text-dark">{formData.name}</span>. Your account has been registered and verified. We are redirecting you to your Customer Dashboard...
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full">
              <a
                href={targetDashboardHref}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 font-heading font-bold text-sm text-white bg-primary-blue rounded-xl hover:bg-primary-blue-dark transition-all shadow-md shadow-primary-blue/20"
              >
                Go to Dashboard Now <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-5 py-3.5 font-heading font-semibold text-sm text-neutral-text-dark border border-neutral-text-muted/20 rounded-xl hover:bg-neutral-bg transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        );`;

if (oldStep6Regex.test(quotesContent)) {
  quotesContent = quotesContent.replace(oldStep6Regex, newStep6Code);
  console.log('Replaced oldStep6Regex successfully');
} else {
  console.log('oldStep6Regex did not match');
}

fs.writeFileSync(quotesPagePath, quotesContent, 'utf8');
console.log('Updated quotes/page.tsx successfully!');
