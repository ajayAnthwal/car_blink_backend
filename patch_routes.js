const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'src', 'modules');

// 1. Customer
let custFile = path.join(src, 'customer', 'customer.routes.ts');
let custCode = fs.readFileSync(custFile, 'utf8');
if (!custCode.includes('rsaRouter')) {
  custCode = custCode.replace('import ticketRouter', 'import rsaRouter from "./sub-modules/rsa/rsa.routes";\nimport subscriptionRouter from "./sub-modules/subscription/subscription.routes";\nimport referralRouter from "./sub-modules/referral/referral.routes";\nimport ticketRouter');
  custCode = custCode.replace('export default router;', 'router.use("/rsa", rsaRouter);\nrouter.use("/subscriptions", subscriptionRouter);\nrouter.use("/referrals", referralRouter);\n\nexport default router;');
  fs.writeFileSync(custFile, custCode);
}

// 2. Partner
let partFile = path.join(src, 'partner', 'partner.routes.ts');
let partCode = fs.readFileSync(partFile, 'utf8');
if (!partCode.includes('inventoryRouter')) {
  partCode = partCode.replace('import { validate }', 'import inventoryRouter from "./sub-modules/inventory/inventory.routes";\nimport staffRouter from "./sub-modules/staff/staff.routes";\nimport posRouter from "./sub-modules/pos/pos.routes";\nimport { validate }');
  partCode = partCode.replace('export default router;', 'router.use("/inventory", inventoryRouter);\nrouter.use("/staff", staffRouter);\nrouter.use("/pos", posRouter);\n\nexport default router;');
  fs.writeFileSync(partFile, partCode);
}

// 3. Executive
let execFile = path.join(src, 'executive', 'executive.routes.ts');
if (fs.existsSync(execFile)) {
  let execCode = fs.readFileSync(execFile, 'utf8');
  if (!execCode.includes('logisticsRouter')) {
    execCode = execCode.replace('import { Router } from "express";', 'import { Router } from "express";\nimport logisticsRouter from "./sub-modules/logistics/logistics.routes";');
    if (!execCode.includes('logisticsRouter')) { // fallback if quotes differ
      execCode = execCode.replace("import { Router } from 'express';", "import { Router } from 'express';\nimport logisticsRouter from './sub-modules/logistics/logistics.routes';");
    }
    execCode = execCode.replace('export default router;', 'router.use("/logistics", logisticsRouter);\n\nexport default router;');
    fs.writeFileSync(execFile, execCode);
  }
}

// 4. Super Admin
let adminFile = path.join(src, 'super-admin', 'super-admin.routes.ts');
if (fs.existsSync(adminFile)) {
  let adminCode = fs.readFileSync(adminFile, 'utf8');
  if (!adminCode.includes('couponsRouter')) {
    adminCode = adminCode.replace("import { Router } from 'express';", "import { Router } from 'express';\nimport couponsRouter from './sub-modules/coupons/coupons.routes';\nimport vendorRouter from './sub-modules/vendor/vendor.routes';");
    adminCode = adminCode.replace('export default router;', 'router.use("/coupons", couponsRouter);\nrouter.use("/vendors", vendorRouter);\n\nexport default router;');
    fs.writeFileSync(adminFile, adminCode);
  }
}
console.log('Routes patched successfully!');
