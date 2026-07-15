import { FollowUpModel } from './followup.model';
import { UserModel } from '../../../user/user.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { ForbiddenError } from '../../../../common/errors/ForbiddenError';

export class FollowUpService {
  /**
   * Log a new follow-up call with a customer or partner
   */
  async logFollowUpCall(executiveId: string, data: any): Promise<any> {
    const relatedUser = await UserModel.findById(data.relatedUserId);
    if (!relatedUser) {
      throw new NotFoundError('Related user (Customer/Partner) not found');
    }

    if (data.bookingId) {
      const booking = await BookingModel.findById(data.bookingId);
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }
    }

    const followUp = await FollowUpModel.create({
      ...data,
      executiveId,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    });

    return await FollowUpModel.findById(followUp._id)
      .populate('executiveId', 'fullName email')
      .populate('relatedUserId', 'fullName email phone role')
      .populate('bookingId', 'status description')
      .lean();
  }

  /**
   * Get follow-ups logged by this executive (paginated)
   */
  async getMyFollowUps(executiveId: string, query: any = {}): Promise<{ followUps: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = { executiveId };
    if (query.relatedTo) filter.relatedTo = query.relatedTo;
    if (query.callOutcome) filter.callOutcome = query.callOutcome;

    const [followUps, total] = await Promise.all([
      FollowUpModel.find(filter)
        .populate('executiveId', 'fullName email')
        .populate('relatedUserId', 'fullName email phone role')
        .populate('bookingId', 'status description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FollowUpModel.countDocuments(filter),
    ]);

    return { followUps, total, page, limit };
  }

  /**
   * Get pending follow-up calls (due today or in the past, across all executives)
   */
  async getPendingFollowUps(query: any = {}): Promise<{ followUps: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {
      followUpDate: { $exists: true, $ne: null, $lte: new Date() }
    };

    const [followUps, total] = await Promise.all([
      FollowUpModel.find(filter)
        .populate('executiveId', 'fullName email')
        .populate('relatedUserId', 'fullName email phone role')
        .populate('bookingId', 'status description')
        .sort({ followUpDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FollowUpModel.countDocuments(filter),
    ]);

    return { followUps, total, page, limit };
  }

  /**
   * Update an existing follow-up log (ownership check required)
   */
  async updateFollowUp(executiveId: string, followUpId: string, data: any): Promise<any> {
    const followUp = await FollowUpModel.findById(followUpId);
    if (!followUp) {
      throw new NotFoundError('Follow-up log not found');
    }

    // Service-layer ownership verification required for modification
    if (followUp.executiveId.toString() !== executiveId) {
      throw new ForbiddenError('You can only modify your own follow-up logs');
    }

    if (data.callOutcome) followUp.callOutcome = data.callOutcome;
    if (data.notes) followUp.notes = data.notes;
    if (data.followUpDate !== undefined) {
      followUp.followUpDate = data.followUpDate ? new Date(data.followUpDate) : undefined;
    }

    await followUp.save();

    return await FollowUpModel.findById(followUpId)
      .populate('executiveId', 'fullName email')
      .populate('relatedUserId', 'fullName email phone role')
      .populate('bookingId', 'status description')
      .lean();
  }
}

export const followUpService = new FollowUpService();
