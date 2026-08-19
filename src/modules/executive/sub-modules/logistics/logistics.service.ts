import LogisticsModel from './logistics.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { emitToUser } from '../../../../sockets';

export class LogisticsService {
  static async assignDriver(data: any) {
    let booking = await BookingModel.findById(data.bookingId);
    if (!booking) {
      booking = await BookingModel.findOne({ leadId: data.bookingId });
    }
    if (!booking) {
      const { LeadModel } = require('../../../customer/sub-modules/lead/lead.model');
      const lead = await LeadModel.findById(data.bookingId);
      if (lead) {
        booking = await BookingModel.findOne({ leadId: lead._id });
        if (!booking) {
          booking = await BookingModel.create({
            leadId: lead._id,
            customerId: lead.customerId,
            partnerId: lead.assignedPartnerId,
            serviceId: lead.serviceId,
            vehicleId: lead.vehicleId,
            status: BOOKING_STATUS.IN_PROGRESS,
            totalAmount: lead.budget || 0,
          });
        }
      }
    }

    if (!booking) {
      throw new NotFoundError('Booking or Lead record not found');
    }

    const log = await LogisticsModel.create({
      ...data,
      bookingId: booking._id,
    });

    // Update booking status to IN_PROGRESS as logistics phase has begun
    if (booking.status === BOOKING_STATUS.PENDING || booking.status === BOOKING_STATUS.ACCEPTED || booking.status === BOOKING_STATUS.QUOTED) {
      booking.status = BOOKING_STATUS.IN_PROGRESS;
      await booking.save();
    }

    return log;
  }
  
  static async updateStatus(id: string, status: string) { return await LogisticsModel.findByIdAndUpdate(id, { status }, { new: true }); }
  static async updateLocation(id: string, lat: number, lng: number) {
    const log = await LogisticsModel.findByIdAndUpdate(id, { currentLocation: { lat, lng, lastUpdatedAt: new Date() } }, { new: true }).populate('bookingId');
    if (log && log.bookingId) {
       const customerId = (log.bookingId as any).customerId;
       if (customerId) {
          emitToUser(customerId.toString(), 'location_update', log);
       }
    }
    return log;
  }
}