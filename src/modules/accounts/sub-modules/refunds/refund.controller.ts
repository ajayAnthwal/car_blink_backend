import { Response } from 'express';
import { refundService } from './refund.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';
import { AccountsService } from '../../accounts.service';
import { ActivityLogService } from '../activity-logs/activity-log.service';

export class RefundController {
  public static getAllRefunds = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await refundService.getAllRefunds(req.query);
    return successResponse(res, result, 'Refunds retrieved successfully');
  });

  public static processRefund = asyncHandler(async (req: IRequest, res: Response) => {
    const accountsId = String(req.user?.userId);
    const { id } = req.params;
    const { pin } = req.body;

    // 1. Verify Security PIN
    await AccountsService.verifySecurityPin(accountsId, pin);

    // 2. Process Refund
    const result = await refundService.processRefund(accountsId, id);
    
    // 3. Log Activity
    const amount = result?.amount || 0;
    const bookingId = result?.bookingId ? String(result.bookingId) : 'N/A';
    await ActivityLogService.logActivity(
      accountsId,
      'PROCESSED_REFUND',
      amount,
      `Processed customer refund of ₹${amount} for Booking #${bookingId}`
    );

    return successResponse(res, result, 'Refund processed successfully');
  });

  public static rejectRefund = asyncHandler(async (req: IRequest, res: Response) => {
    const accountsId = String(req.user?.userId);
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const result = await refundService.rejectRefund(accountsId, id, rejectionReason);
    return successResponse(res, result, 'Refund rejected successfully');
  });
}
