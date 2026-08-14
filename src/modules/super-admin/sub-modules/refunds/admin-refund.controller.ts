import { Response } from 'express';
import { IRequest } from '../../../../common/interfaces/IRequest';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { refundService } from '../../../accounts/sub-modules/refunds/refund.service';
import { RefundModel } from '../../../accounts/sub-modules/refunds/refund.model';
import { PaymentModel } from '../../../payment/payment.model';
import { PAYMENT_STATUS } from '../../../../common/constants/status.constant';

export class AdminRefundController {
  /**
   * Get all refunds for Admin view (all statuses)
   */
  public static getAllRefunds = asyncHandler(async (req: IRequest, res: Response) => {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const [refunds, total] = await Promise.all([
      RefundModel.find(filter)
        .populate('customerId', 'fullName email phone')
        .populate({ path: 'bookingId', select: 'status createdAt' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      RefundModel.countDocuments(filter),
    ]);

    const result = {
      refunds,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };

    return successResponse(res, result, 'Refunds retrieved successfully');
  });

  /**
   * Get eligible payments for refund
   */
  public static getEligiblePayments = asyncHandler(async (req: IRequest, res: Response) => {
    const payments = await PaymentModel.find({ status: PAYMENT_STATUS.SUCCESS })
      .populate('bookingId', 'bookingStatus')
      .populate('customerId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
      
    return successResponse(res, payments, 'Eligible payments retrieved successfully');
  });

  /**
   * Initiate a refund request
   */
  public static initiateRefund = asyncHandler(async (req: IRequest, res: Response) => {
    const adminId = String(req.user?.userId);
    const { paymentId, amount, reason } = req.body;
    
    // We reuse the refundService which takes accountsId, but here it's adminId initiating it.
    const result = await refundService.initiateRefund(adminId, { paymentId, amount, reason });
    return successResponse(res, result, 'Refund initiated successfully', 201);
  });

  /**
   * Approve a refund
   */
  public static approveRefund = asyncHandler(async (req: IRequest, res: Response) => {
    const adminId = String(req.user?.userId);
    const { id } = req.params;
    
    const result = await refundService.approveRefund(adminId, id);
    return successResponse(res, result, 'Refund approved successfully');
  });
}
