import CouponModel from './coupons.model';

export class CouponService {
  static async create(data: any) { 
    // Ensure code is uppercase
    if (data.code) {
      data.code = data.code.toUpperCase();
    }
    return await CouponModel.create(data); 
  }
  
  static async validate(code: string) { 
    return await CouponModel.findOne({ code: code.toUpperCase(), isActive: true }); 
  }

  static async getAllCoupons() {
    return await CouponModel.find({}).sort({ createdAt: -1 }).lean();
  }

  static async toggleCoupon(id: string) {
    const coupon = await CouponModel.findById(id);
    if (!coupon) throw new Error("Coupon not found");
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    return coupon;
  }

  static async deleteCoupon(id: string) {
    return await CouponModel.findByIdAndDelete(id);
  }
}