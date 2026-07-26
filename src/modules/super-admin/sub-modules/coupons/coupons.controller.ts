import { Request, Response } from 'express';
import { CouponService } from './coupons.service';

export class CouponController {
  static async create(req: Request, res: Response) {
    try { 
      const c = await CouponService.create(req.body); 
      res.status(201).json({ success: true, data: c }); 
    } catch (err: any) { 
      res.status(500).json({ success: false, message: err.message }); 
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const coupons = await CouponService.getAllCoupons();
      res.status(200).json({ success: true, data: coupons });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async toggle(req: Request, res: Response) {
    try {
      const coupon = await CouponService.toggleCoupon(req.params.id);
      res.status(200).json({ success: true, data: coupon });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await CouponService.deleteCoupon(req.params.id);
      res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}