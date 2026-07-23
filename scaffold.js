const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src', 'modules');

const modules = {
  customer: ['rsa', 'subscription', 'referral'],
  partner: ['inventory', 'staff', 'pos'],
  executive: ['logistics'],
  'super-admin': ['coupons', 'vendor']
};

for (const [moduleName, subModules] of Object.entries(modules)) {
  for (const sub of subModules) {
    const dir = path.join(src, moduleName, 'sub-modules', sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const className = sub.charAt(0).toUpperCase() + sub.slice(1);
    
    // Model
    const modelContent = `import mongoose, { Schema, Document } from 'mongoose';

export interface I${className} extends Document {
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<I${className}>({
}, { timestamps: true });

export const ${className}Model = mongoose.model<I${className}>('${className}', schema);
export default ${className}Model;
`;
    fs.writeFileSync(path.join(dir, `${sub}.model.ts`), modelContent);
    
    // Service
    const serviceContent = `export class ${className}Service {
  // Implement logic
}
`;
    fs.writeFileSync(path.join(dir, `${sub}.service.ts`), serviceContent);
    
    // Controller
    const controllerContent = `import { Request, Response } from 'express';

export class ${className}Controller {
  public static async get(req: Request, res: Response) {
    res.status(200).json({ message: 'Success' });
  }
}
`;
    fs.writeFileSync(path.join(dir, `${sub}.controller.ts`), controllerContent);
    
    // Routes
    const routeContent = `import { Router } from 'express';
import { ${className}Controller } from './${sub}.controller';

const router = Router();
router.get('/', ${className}Controller.get);

export default router;
`;
    fs.writeFileSync(path.join(dir, `${sub}.routes.ts`), routeContent);
  }
}
console.log('Scaffolding complete!');
