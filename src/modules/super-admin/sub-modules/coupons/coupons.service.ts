import CouponModel from './coupons.model';
export class CouponService {
  static async create(data: any) { return await CouponModel.create(data); }
  static async validate(code: string) { return await CouponModel.findOne({ code, isActive: true }); }
}