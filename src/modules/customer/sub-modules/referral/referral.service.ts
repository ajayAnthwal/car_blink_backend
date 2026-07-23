import ReferralModel, { IReferral } from './referral.model';
import { UserModel } from '../../../../modules/user/user.model';
import { ApiError } from '../../../../common/errors/ApiError';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';

export class ReferralService {
  public static async applyReferral(
    customerId: string,
    data: { referralCodeUsed: string }
  ): Promise<IReferral> {
    // 1. Check if user already applied a referral
    const existing = await ReferralModel.findOne({ referredId: customerId });
    if (existing) {
      throw new ApiError(400, 'You have already used a referral code', ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Find referrer
    const referrer = await UserModel.findOne({ referralCode: data.referralCodeUsed });
    if (!referrer) {
      throw new ApiError(400, 'Invalid referral code', ERROR_CODES.VALIDATION_ERROR);
    }
    if (referrer._id.toString() === customerId) {
      throw new ApiError(400, 'Cannot use your own referral code', ERROR_CODES.VALIDATION_ERROR);
    }

    // 3. Create referral
    const rewardAmount = 100; // Define logic for reward amount later if needed
    const ref = await ReferralModel.create({
      referrerId: referrer._id,
      referredId: customerId,
      referralCodeUsed: data.referralCodeUsed,
      rewardAmount,
      status: 'PENDING',
    });
    
    return ref;
  }

  public static async getHistory(customerId: string): Promise<IReferral[]> {
    return ReferralModel.find({
      $or: [{ referrerId: customerId }, { referredId: customerId }]
    }).sort({ createdAt: -1 });
  }
}
export default ReferralService;