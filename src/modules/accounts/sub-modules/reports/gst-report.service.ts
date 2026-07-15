import { PaymentModel } from '../../../payment/payment.model';
import { PAYMENT_STATUS } from '../../../../common/constants/status.constant';

export class GstReportService {
  /**
   * Aggregate SUCCESS payment documents within a date range and calculate 18% GST splits
   */
  async generateGstReport(
    fromDate: string,
    toDate: string
  ): Promise<{
    summary: {
      totalAmountCollected: number;
      totalBaseAmount: number;
      totalGstAmount: number;
      gstRatePercent: number;
    };
    itemized: any[];
  }> {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const filter: any = {
      status: PAYMENT_STATUS.SUCCESS,
      createdAt: {
        $gte: start,
        $lte: end,
      },
    };

    const payments = await PaymentModel.find(filter)
      .populate('customerId', 'fullName email phone')
      .lean();

    let totalAmountCollected = 0;
    let totalBaseAmount = 0;
    let totalGstAmount = 0;

    const itemized = payments.map((p) => {
      const amount = p.amount;
      const baseAmount = Number((amount / 1.18).toFixed(2));
      const gstAmount = Number((amount - baseAmount).toFixed(2));

      totalAmountCollected += amount;
      totalBaseAmount += baseAmount;
      totalGstAmount += gstAmount;

      return {
        paymentId: p._id,
        bookingId: p.bookingId,
        customerId: p.customerId,
        amount,
        baseAmount,
        gstAmount,
        paidAt: p.paidAt || p.createdAt,
      };
    });

    return {
      summary: {
        totalAmountCollected: Number(totalAmountCollected.toFixed(2)),
        totalBaseAmount: Number(totalBaseAmount.toFixed(2)),
        totalGstAmount: Number(totalGstAmount.toFixed(2)),
        gstRatePercent: 18,
      },
      itemized,
    };
  }
}

export const gstReportService = new GstReportService();
export default gstReportService;
