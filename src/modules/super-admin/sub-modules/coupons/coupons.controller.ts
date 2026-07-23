import { Request, Response } from 'express';
import { CouponService } from './coupons.service';
export class CouponController {
  static async create(req: Request, res: Response) {
    try { const c = await CouponService.create(req.body); res.status(201).json({ success: true, data: c }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}