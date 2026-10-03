const fs = require('fs');
const path = require('path');

const websiteDir = 'c:\\Users\\ajay anthwal\\Desktop\\car_blink';

// 1. Update lib/constants.ts
const constantsPath = path.join(websiteDir, 'lib', 'constants.ts');
let constantsContent = fs.readFileSync(constantsPath, 'utf8');

const oldFooterWorkshop = '{ name: "Become a Partner", href: "/for-workshops" }';
const newFooterWorkshop = '{ name: "Become a Partner", href: "/partner-login" }';

if (constantsContent.includes(oldFooterWorkshop)) {
  constantsContent = constantsContent.replace(oldFooterWorkshop, newFooterWorkshop);
  fs.writeFileSync(constantsPath, constantsContent, 'utf8');
  console.log('Successfully updated lib/constants.ts: Become a Partner -> /partner-login');
} else {
  console.log('constants.ts already updated or pattern not found');
}

// 2. Update features/workshops/components/WorkshopsHero.tsx
const heroPath = path.join(websiteDir, 'features', 'workshops', 'components', 'WorkshopsHero.tsx');
let heroContent = fs.readFileSync(heroPath, 'utf8');

const oldHeroCta = '<Button href="#become-partner-form" variant="accent" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>';
const newHeroCta = '<Button href="/partner-login" variant="accent" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>';

if (heroContent.includes(oldHeroCta)) {
  heroContent = heroContent.replace(oldHeroCta, newHeroCta);
  fs.writeFileSync(heroPath, heroContent, 'utf8');
  console.log('Successfully updated WorkshopsHero.tsx: Become a Partner CTA -> /partner-login');
} else {
  console.log('WorkshopsHero.tsx already updated or pattern not found');
}

// 3. Update features/workshops/components/PartnerCTA.tsx
const partnerCtaPath = path.join(websiteDir, 'features', 'workshops', 'components', 'PartnerCTA.tsx');
let partnerCtaContent = fs.readFileSync(partnerCtaPath, 'utf8');

// Replace register and login links to /partner-login
partnerCtaContent = partnerCtaContent.replace(/href="\/partner-login\?mode=register"/g, 'href="/partner-login"');
partnerCtaContent = partnerCtaContent.replace(/href="\/partner-login\?mode=login"/g, 'href="/partner-login"');
fs.writeFileSync(partnerCtaPath, partnerCtaContent, 'utf8');
console.log('Successfully updated PartnerCTA.tsx: All CTA links -> /partner-login');

