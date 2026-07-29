import LogisticsModel from './logistics.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';

export class LogisticsService {
  static async assignDriver(data: any) {
    const booking = await BookingModel.findById(data.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const log = await LogisticsModel.create(data);

    // Update booking status to IN_PROGRESS as logistics phase has begun
    if (booking.status === BOOKING_STATUS.PENDING || booking.status === BOOKING_STATUS.ACCEPTED || booking.status === BOOKING_STATUS.QUOTED) {
      booking.status = BOOKING_STATUS.IN_PROGRESS;
      await booking.save();
    }

    return log;
  }
  
  static async updateStatus(id: string, status: string) { return await LogisticsModel.findByIdAndUpdate(id, { status }, { new: true }); }
  static async updateLocation(id: string, lat: number, lng: number) {
    return await LogisticsModel.findByIdAndUpdate(id, { currentLocation: { lat, lng, lastUpdatedAt: new Date() } }, { new: true });
  }
}