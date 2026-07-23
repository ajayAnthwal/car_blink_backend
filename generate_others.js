const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src', 'modules');

const templates = {
  referral: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredId: mongoose.Types.ObjectId;
  referralCodeUsed: string;
  status: 'PENDING' | 'REWARDED';
  rewardAmount: number;
}
const schema = new Schema<IReferral>({
  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referredId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referralCodeUsed: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'REWARDED'], default: 'PENDING' },
  rewardAmount: { type: Number, required: true }
}, { timestamps: true });
export default mongoose.model<IReferral>('Referral', schema);`,
    service: `import ReferralModel from './referral.model';
export class ReferralService {
  static async applyReferral(data: any) { return await ReferralModel.create(data); }
  static async getHistory(userId: string) { return await ReferralModel.find({ $or: [{ referrerId: userId }, { referredId: userId }] }); }
}`,
    controller: `import { Request, Response } from 'express';
import { ReferralService } from './referral.service';
export class ReferralController {
  static async apply(req: Request, res: Response) {
    try { const ref = await ReferralService.applyReferral(req.body); res.status(201).json({ success: true, data: ref }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { ReferralController } from './referral.controller';
const router = Router();
router.post('/apply', ReferralController.apply);
export default router;`
  },
  staff: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface IStaff extends Document {
  partnerId: mongoose.Types.ObjectId;
  name: string; phone: string; role: string; status: 'ACTIVE' | 'INACTIVE';
}
const schema = new Schema<IStaff>({
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, phone: { type: String, required: true },
  role: { type: String, required: true }, status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });
export default mongoose.model<IStaff>('Staff', schema);`,
    service: `import StaffModel from './staff.model';
export class StaffService {
  static async add(data: any) { return await StaffModel.create(data); }
  static async updateStatus(id: string, status: string) { return await StaffModel.findByIdAndUpdate(id, { status }, { new: true }); }
}`,
    controller: `import { Request, Response } from 'express';
import { StaffService } from './staff.service';
export class StaffController {
  static async addStaff(req: Request, res: Response) {
    try { const staff = await StaffService.add(req.body); res.status(201).json({ success: true, data: staff }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { StaffController } from './staff.controller';
const router = Router();
router.post('/', StaffController.addStaff);
export default router;`
  },
  pos: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface IPos extends Document {
  partnerId: mongoose.Types.ObjectId;
  customerName: string; customerPhone: string; totalAmount: number; paymentStatus: 'PAID' | 'PENDING'; items: any[];
}
const schema = new Schema<IPos>({
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true }, customerPhone: { type: String, required: true },
  totalAmount: { type: Number, required: true }, paymentStatus: { type: String, enum: ['PAID', 'PENDING'], default: 'PENDING' },
  items: [{ type: Schema.Types.Mixed }]
}, { timestamps: true });
export default mongoose.model<IPos>('Pos', schema);`,
    service: `import PosModel from './pos.model';
export class PosService {
  static async createInvoice(data: any) { return await PosModel.create(data); }
  static async getHistory(partnerId: string) { return await PosModel.find({ partnerId }); }
}`,
    controller: `import { Request, Response } from 'express';
import { PosService } from './pos.service';
export class PosController {
  static async generate(req: Request, res: Response) {
    try { const inv = await PosService.createInvoice(req.body); res.status(201).json({ success: true, data: inv }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { PosController } from './pos.controller';
const router = Router();
router.post('/generate', PosController.generate);
export default router;`
  },
  logistics: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface ILogistics extends Document {
  bookingId: mongoose.Types.ObjectId; executiveId: mongoose.Types.ObjectId; driverName: string; driverPhone: string;
  status: 'EN_ROUTE_PICKUP' | 'AT_GARAGE' | 'EN_ROUTE_DROP' | 'COMPLETED';
}
const schema = new Schema<ILogistics>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  executiveId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driverName: { type: String, required: true }, driverPhone: { type: String, required: true },
  status: { type: String, enum: ['EN_ROUTE_PICKUP', 'AT_GARAGE', 'EN_ROUTE_DROP', 'COMPLETED'], default: 'EN_ROUTE_PICKUP' }
}, { timestamps: true });
export default mongoose.model<ILogistics>('Logistics', schema);`,
    service: `import LogisticsModel from './logistics.model';
export class LogisticsService {
  static async assignDriver(data: any) { return await LogisticsModel.create(data); }
  static async updateStatus(id: string, status: string) { return await LogisticsModel.findByIdAndUpdate(id, { status }, { new: true }); }
}`,
    controller: `import { Request, Response } from 'express';
import { LogisticsService } from './logistics.service';
export class LogisticsController {
  static async assign(req: Request, res: Response) {
    try { const log = await LogisticsService.assignDriver(req.body); res.status(201).json({ success: true, data: log }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { LogisticsController } from './logistics.controller';
const router = Router();
router.post('/assign', LogisticsController.assign);
export default router;`
  },
  coupons: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface ICoupon extends Document {
  code: string; discountType: 'PERCENTAGE' | 'FLAT'; discountValue: number; isActive: boolean; maxUses: number; currentUses: number;
}
const schema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true }, discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], required: true },
  discountValue: { type: Number, required: true }, isActive: { type: Boolean, default: true },
  maxUses: { type: Number, default: 100 }, currentUses: { type: Number, default: 0 }
}, { timestamps: true });
export default mongoose.model<ICoupon>('Coupon', schema);`,
    service: `import CouponModel from './coupons.model';
export class CouponService {
  static async create(data: any) { return await CouponModel.create(data); }
  static async validate(code: string) { return await CouponModel.findOne({ code, isActive: true }); }
}`,
    controller: `import { Request, Response } from 'express';
import { CouponService } from './coupons.service';
export class CouponController {
  static async create(req: Request, res: Response) {
    try { const c = await CouponService.create(req.body); res.status(201).json({ success: true, data: c }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { CouponController } from './coupons.controller';
const router = Router();
router.post('/', CouponController.create);
export default router;`
  },
  vendor: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface IVendor extends Document {
  vendorName: string; contactPerson: string; phone: string; address: string; rating: number; suppliedParts: string[];
}
const schema = new Schema<IVendor>({
  vendorName: { type: String, required: true }, contactPerson: { type: String, required: true },
  phone: { type: String, required: true }, address: { type: String, required: true },
  rating: { type: Number, default: 5 }, suppliedParts: [{ type: String }]
}, { timestamps: true });
export default mongoose.model<IVendor>('Vendor', schema);`,
    service: `import VendorModel from './vendor.model';
export class VendorService {
  static async onboard(data: any) { return await VendorModel.create(data); }
  static async getVendors() { return await VendorModel.find({}); }
}`,
    controller: `import { Request, Response } from 'express';
import { VendorService } from './vendor.service';
export class VendorController {
  static async onboard(req: Request, res: Response) {
    try { const v = await VendorService.onboard(req.body); res.status(201).json({ success: true, data: v }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { VendorController } from './vendor.controller';
const router = Router();
router.post('/', VendorController.onboard);
export default router;`
  }
};

const map = {
  customer: ['referral'],
  partner: ['staff', 'pos'],
  executive: ['logistics'],
  'super-admin': ['coupons', 'vendor']
};

for (const [mod, subs] of Object.entries(map)) {
  for (const sub of subs) {
    const dir = path.join(src, mod, 'sub-modules', sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${sub}.model.ts`), templates[sub].model);
    fs.writeFileSync(path.join(dir, `${sub}.service.ts`), templates[sub].service);
    fs.writeFileSync(path.join(dir, `${sub}.controller.ts`), templates[sub].controller);
    fs.writeFileSync(path.join(dir, `${sub}.routes.ts`), templates[sub].routes);
  }
}
console.log('Other features implemented successfully.');
