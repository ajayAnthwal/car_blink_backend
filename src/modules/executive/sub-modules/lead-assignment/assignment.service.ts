import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { PartnerModel } from '../../../partner/partner.model';
import { BidModel } from '../../../partner/sub-modules/bidding/bid.model';
import { AssignmentModel } from './assignment.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { BadRequestError } from '../../../../common/errors/BadRequestError';
import { ASSIGNMENT_TYPE, BOOKING_STATUS } from '../../../../common/constants/status.constant';

export class AssignmentService {
  /**
   * Get all leads (bookings) with their assignment details
   */
  async getAllLeads(query: any = {}): Promise<{ leads: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.cityId) filter.cityId = query.cityId;
    if (query.serviceId) filter.serviceId = query.serviceId;

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter)
        .populate('customerId', 'fullName email phone')
        .populate('vehicleId', 'brand model registrationNumber fuelType')
        .populate('serviceId', 'name description basePrice')
        .populate('cityId', 'name state')
        .populate('assignedExecutiveId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BookingModel.countDocuments(filter),
    ]);

    const bookingIds = bookings.map((b: any) => b._id);
    const assignments = await AssignmentModel.find({ bookingId: { $in: bookingIds } })
      .populate('assignedExecutiveId', 'fullName email')
      .populate('assignedPartnerId', 'businessName isVerified')
      .lean();

    const assignmentMap = new Map();
    assignments.forEach((a: any) => assignmentMap.set(a.bookingId.toString(), a));

    const leads = bookings.map((booking: any) => ({
      ...booking,
      assignment: assignmentMap.get(booking._id.toString()) || null,
    }));

    return { leads, total, page, limit };
  }

  /**
   * Get lead details by booking ID
   */
  async getLeadById(bookingId: string): Promise<any> {
    const booking = await BookingModel.findById(bookingId)
      .populate('customerId', 'fullName email phone')
      .populate('vehicleId', 'brand model registrationNumber fuelType')
      .populate('serviceId', 'name description basePrice')
      .populate('cityId', 'name state')
      .populate('assignedExecutiveId', 'fullName email')
      .lean();

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const assignment = await AssignmentModel.findOne({ bookingId })
      .populate('assignedExecutiveId', 'fullName email')
      .populate('assignedPartnerId', 'businessName isVerified')
      .lean();

    const bids = await BidModel.find({ bookingId })
      .populate({
        path: 'partnerId',
        select: 'businessName isVerified rating',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...booking,
      assignment: assignment || null,
      bids,
    };
  }

  /**
   * Assign or nudge a partner for a lead
   */
  async assignPartnerToLead(
    executiveId: string,
    bookingId: string,
    partnerId?: string,
    notes?: string
  ): Promise<any> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify booking is still PENDING or QUOTED (not already ACCEPTED, etc.)
    if (booking.status !== BOOKING_STATUS.PENDING && booking.status !== BOOKING_STATUS.QUOTED) {
      throw new BadRequestError('Booking is already accepted, completed, or cancelled');
    }

    if (partnerId) {
      const partner = await PartnerModel.findById(partnerId);
      if (!partner) {
        throw new NotFoundError('Partner not found');
      }
      if (!partner.isVerified) {
        throw new BadRequestError('Partner is not verified');
      }
    }

    const assignment = await AssignmentModel.findOneAndUpdate(
      { bookingId },
      {
        assignedExecutiveId: executiveId,
        assignedPartnerId: partnerId || undefined,
        assignmentType: ASSIGNMENT_TYPE.MANUALLY_ASSIGNED,
        notes,
      },
      { upsert: true, new: true }
    )
      .populate('assignedExecutiveId', 'fullName email')
      .populate('assignedPartnerId', 'businessName isVerified');

    await BookingModel.findByIdAndUpdate(bookingId, {
      assignedExecutiveId: executiveId,
    });

    return assignment;
  }
}

export const assignmentService = new AssignmentService();
