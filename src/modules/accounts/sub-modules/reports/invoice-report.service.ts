import { JobModel } from '../../../partner/sub-modules/jobs/job.model';
import { PaymentModel } from '../../../payment/payment.model';
import { PAYMENT_STATUS } from '../../../../common/constants/status.constant';

export class InvoiceReportService {
  /**
   * Generate Invoice report showing completed jobs joined with bookings and payment status
   */
  async generateInvoiceReport(
    fromDate: string,
    toDate: string,
    filters?: { cityId?: string; serviceId?: string }
  ): Promise<{
    totalJobs: number;
    itemized: any[];
  }> {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const filter: any = {
      status: 'COMPLETED',
      completedAt: {
        $gte: start,
        $lte: end,
      },
    };

    const jobs = await JobModel.find(filter)
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'serviceId', select: 'name' },
          { path: 'cityId', select: 'name' },
          { path: 'customerId', select: 'fullName email phone' },
        ],
      })
      .populate({
        path: 'partnerId',
        select: 'businessName userId',
      });

    // Apply memory filters
    let filteredJobs = jobs;
    if (filters?.cityId) {
      filteredJobs = filteredJobs.filter(
        (j) => (j.bookingId as any)?.cityId?._id?.toString() === filters.cityId
      );
    }
    if (filters?.serviceId) {
      filteredJobs = filteredJobs.filter(
        (j) => (j.bookingId as any)?.serviceId?._id?.toString() === filters.serviceId
      );
    }

    const itemized: any[] = [];
    for (const job of filteredJobs) {
      const booking = job.bookingId as any;
      if (!booking) continue;

      // Find the most recent payment associated with the booking
      const payment = await PaymentModel.findOne({
        bookingId: booking._id,
      })
        .sort({ createdAt: -1 })
        .lean();

      itemized.push({
        jobId: job._id,
        bookingId: booking._id,
        completionDate: job.completedAt,
        finalAmount: job.finalAmount,
        paymentStatus: payment ? payment.status : 'PENDING',
        serviceName: booking.serviceId?.name || 'Unknown',
        cityName: booking.cityId?.name || 'Unknown',
        partnerBusinessName: (job.partnerId as any)?.businessName || 'Unknown',
        customerName: booking.customerId?.fullName || 'Unknown',
      });
    }

    return {
      totalJobs: itemized.length,
      itemized,
    };
  }
}

export const invoiceReportService = new InvoiceReportService();
export default invoiceReportService;
