import { SubscriptionModel, ISubscription } from './subscription.model';
import { ApiError } from '../../../../common/errors/ApiError';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';

export class SubscriptionService {
  public static async purchase(
    customerId: string,
    data: { planName: string; price: number; endDate: string }
  ): Promise<ISubscription> {
    // Basic simulation of purchase
    const endDate = new Date(data.endDate);
    if (endDate <= new Date()) {
      throw new ApiError(400, 'End date must be in the future', ERROR_CODES.VALIDATION_ERROR);
    }

    const sub = await SubscriptionModel.create({
      customerId,
      planName: data.planName,
      price: data.price,
      endDate: endDate,
      status: 'ACTIVE',
    });
    return sub;
  }

  public static async getUserSubscriptions(customerId: string): Promise<ISubscription[]> {
    return SubscriptionModel.find({ customerId }).sort({ createdAt: -1 });
  }

  public static async checkValidity(customerId: string): Promise<ISubscription | null> {
    return SubscriptionModel.findOne({
      customerId,
      status: 'ACTIVE',
      endDate: { $gte: new Date() },
    }).sort({ endDate: -1 });
  }
}
export default SubscriptionService;