const fs = require('fs');
const file = 'c:/Users/ajay anthwal/Desktop/car_blink/app/(marketing)/quotes/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startTarget = 'import { getDashboardUrl } from "@/hooks/auth/use-auth";\nconst MAKES = [';
const endTarget = '"Audi": [\n    "A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "Other"\n  ]\n};';

const startIndex = content.indexOf(startTarget);
const endIndex = content.indexOf(endTarget);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = 'import { getDashboardUrl } from "@/hooks/auth/use-auth";\nimport { MAKES, CAR_MODELS_MAP } from "@/config/vehicles.config";';
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex + endTarget.length);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully linked shared vehicles.config in quotes/page.tsx');
} else {
  console.log('Indices not found:', { startIndex, endIndex });
}
