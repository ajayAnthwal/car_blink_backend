import { Response } from 'express';
import { AccountsService } from './accounts.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class AccountsController {
  public static updateSecurityPin = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = String(req.user?.userId);
    const { newPin } = req.body;
    await AccountsService.updateSecurityPin(userId, newPin);
    return successResponse(res, null, 'Security PIN updated successfully');
  });

  public static getTransactions = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await AccountsService.getTransactions(req.query);
    return successResponse(res, result, 'Transactions retrieved successfully');
  });

  public static getMasterInvoices = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await AccountsService.getMasterInvoices(req.query);
    return successResponse(res, result, 'Master invoices retrieved successfully');
  });

  public static getExecutivePayouts = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await AccountsService.getExecutivePayouts(req.query);
    return successResponse(res, result, 'Executive payouts retrieved successfully');
  });

  public static getWithdrawalRequests = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await AccountsService.getWithdrawalRequests(req.query);
    return successResponse(res, result, 'Withdrawal requests retrieved successfully');
  });

  public static processWithdrawalRequest = asyncHandler(async (req: IRequest, res: Response) => {
    const { pin, referenceId } = req.body;
    const result = await AccountsService.processWithdrawalRequest((req as any).user?._id || (req as any).user?.userId, req.params.id, pin, referenceId);
    return successResponse(res, result, 'Withdrawal request processed & paid');
  });

  public static rejectWithdrawalRequest = asyncHandler(async (req: IRequest, res: Response) => {
    const { pin, reason } = req.body;
    const result = await AccountsService.rejectWithdrawalRequest((req as any).user?._id || (req as any).user?.userId, req.params.id, pin, reason);
    return successResponse(res, result, 'Withdrawal request rejected & wallet refunded');
  });
}
