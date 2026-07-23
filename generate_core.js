const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src', 'modules');

const templates = {
  rsa: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface IRsa extends Document {
  customerId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  location: { lat: number; lng: number };
  issueType: string;
  status: 'PENDING' | 'ASSIGNED' | 'RESOLVED' | 'CANCELLED';
  assignedPartnerId?: mongoose.Types.ObjectId;
  cost?: number;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IRsa>({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  issueType: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'RESOLVED', 'CANCELLED'], default: 'PENDING' },
  assignedPartnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  cost: { type: Number }
}, { timestamps: true });
export const RsaModel = mongoose.model<IRsa>('Rsa', schema);
export default RsaModel;`,
    service: `import { RsaModel } from './rsa.model';
export class RsaService {
  static async createRequest(data: any) { return await RsaModel.create(data); }
  static async getRequest(id: string) { return await RsaModel.findById(id).populate('assignedPartnerId'); }
  static async updateStatus(id: string, status: string) { return await RsaModel.findByIdAndUpdate(id, { status }, { new: true }); }
}`,
    controller: `import { Request, Response } from 'express';
import { RsaService } from './rsa.service';
export class RsaController {
  static async requestAssistance(req: Request, res: Response) {
    try { const rsa = await RsaService.createRequest(req.body); res.status(201).json({ success: true, data: rsa }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async getStatus(req: Request, res: Response) {
    try { const rsa = await RsaService.getRequest(req.params.id); res.status(200).json({ success: true, data: rsa }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async cancelRequest(req: Request, res: Response) {
    try { const rsa = await RsaService.updateStatus(req.params.id, 'CANCELLED'); res.status(200).json({ success: true, data: rsa }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { RsaController } from './rsa.controller';
const router = Router();
router.post('/', RsaController.requestAssistance);
router.get('/:id', RsaController.getStatus);
router.patch('/:id/cancel', RsaController.cancelRequest);
export default router;`
  },
  subscription: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface ISubscription extends Document {
  customerId: mongoose.Types.ObjectId;
  planName: string;
  startDate: Date;
  endDate: Date;
  price: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  servicesIncluded: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<ISubscription>({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  planName: { type: String, required: true },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
  servicesIncluded: [{ type: Schema.Types.ObjectId, ref: 'Service' }]
}, { timestamps: true });
export const SubscriptionModel = mongoose.model<ISubscription>('Subscription', schema);
export default SubscriptionModel;`,
    service: `import { SubscriptionModel } from './subscription.model';
export class SubscriptionService {
  static async purchase(data: any) { return await SubscriptionModel.create(data); }
  static async getUserSubscriptions(customerId: string) { return await SubscriptionModel.find({ customerId }); }
  static async checkValidity(customerId: string) { 
    return await SubscriptionModel.findOne({ customerId, status: 'ACTIVE', endDate: { $gte: new Date() } }); 
  }
}`,
    controller: `import { Request, Response } from 'express';
import { SubscriptionService } from './subscription.service';
export class SubscriptionController {
  static async purchase(req: Request, res: Response) {
    try { const sub = await SubscriptionService.purchase(req.body); res.status(201).json({ success: true, data: sub }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async getMySubscriptions(req: Request, res: Response) {
    try { const subs = await SubscriptionService.getUserSubscriptions(req.query.customerId as string); res.status(200).json({ success: true, data: subs }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async checkValidity(req: Request, res: Response) {
    try { const valid = await SubscriptionService.checkValidity(req.query.customerId as string); res.status(200).json({ success: true, data: valid }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
const router = Router();
router.post('/purchase', SubscriptionController.purchase);
router.get('/my-subscriptions', SubscriptionController.getMySubscriptions);
router.get('/check-validity', SubscriptionController.checkValidity);
export default router;`
  },
  inventory: {
    model: `import mongoose, { Schema, Document } from 'mongoose';
export interface IInventory extends Document {
  partnerId: mongoose.Types.ObjectId;
  itemName: string;
  partNumber: string;
  quantity: number;
  price: number;
  minThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IInventory>({
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  itemName: { type: String, required: true },
  partNumber: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  minThreshold: { type: Number, default: 5 }
}, { timestamps: true });
export const InventoryModel = mongoose.model<IInventory>('Inventory', schema);
export default InventoryModel;`,
    service: `import { InventoryModel } from './inventory.model';
export class InventoryService {
  static async addStock(data: any) { return await InventoryModel.create(data); }
  static async getStock(partnerId: string) { return await InventoryModel.find({ partnerId }); }
  static async updateQuantity(id: string, qty: number) { return await InventoryModel.findByIdAndUpdate(id, { $inc: { quantity: qty } }, { new: true }); }
  static async deleteItem(id: string) { return await InventoryModel.findByIdAndDelete(id); }
}`,
    controller: `import { Request, Response } from 'express';
import { InventoryService } from './inventory.service';
export class InventoryController {
  static async addStock(req: Request, res: Response) {
    try { const item = await InventoryService.addStock(req.body); res.status(201).json({ success: true, data: item }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async getStock(req: Request, res: Response) {
    try { const items = await InventoryService.getStock(req.query.partnerId as string); res.status(200).json({ success: true, data: items }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async updateQuantity(req: Request, res: Response) {
    try { const item = await InventoryService.updateQuantity(req.params.id, req.body.quantity); res.status(200).json({ success: true, data: item }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
  static async deleteItem(req: Request, res: Response) {
    try { await InventoryService.deleteItem(req.params.id); res.status(200).json({ success: true, message: 'Deleted' }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}`,
    routes: `import { Router } from 'express';
import { InventoryController } from './inventory.controller';
const router = Router();
router.post('/', InventoryController.addStock);
router.get('/', InventoryController.getStock);
router.patch('/:id', InventoryController.updateQuantity);
router.delete('/:id', InventoryController.deleteItem);
export default router;`
  }
};

const map = {
  customer: ['rsa', 'subscription'],
  partner: ['inventory']
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
console.log('Core features implemented successfully.');
