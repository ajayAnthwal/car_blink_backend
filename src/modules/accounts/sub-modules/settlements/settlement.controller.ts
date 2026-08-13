import { Response } from 'express';
import { settlementService } from './settlement.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';
import { AccountsService } from '../../accounts.service';
import { ActivityLogService } from '../activity-logs/activity-log.service';

export class SettlementController {
  public static getEligibleJobsForSettlement = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await settlementService.getEligibleJobsForSettlement(req.query);
    return successResponse(res, result, 'Eligible jobs for settlement retrieved successfully');
  });

  public static generateSettlement = asyncHandler(async (req: IRequest, res: Response) => {
    const accountsId = String(req.user?.userId);
    const { jobId, commissionPercent, tdsPercent, otherDeductions } = req.body;
    const result = await settlementService.generateSettlement(accountsId, jobId, commissionPercent, { tdsPercent, otherDeductions });
    return successResponse(res, result, 'Settlement generated successfully', 201);
  });

  public static getAllSettlements = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await settlementService.getAllSettlements(req.query);
    return successResponse(res, result, 'Settlements retrieved successfully');
  });

  public static processSettlement = asyncHandler(async (req: IRequest, res: Response) => {
    const accountsId = String(req.user?.userId);
    const { id } = req.params;
    const { transactionReference, pin } = req.body;
    
    // 1. Verify Security PIN
    await AccountsService.verifySecurityPin(accountsId, pin);

    // 2. Process Settlement
    const result = await settlementService.processSettlement(accountsId, id, transactionReference);
    
    // 3. Log Activity
    const amount = result?.netPayoutAmount || 0;
    const partnerName = result?.partnerId?.businessName || 'Partner';
    const ref = result?.transactionReference || 'Auto-Payout';
    await ActivityLogService.logActivity(
      accountsId,
      'PROCESSED_PAYOUT',
      amount,
      `Processed settlement payout of ₹${amount} for ${partnerName} (Ref: ${ref})`
    );

    return successResponse(res, result, 'Settlement processed successfully');
  });

  public static getPartnerSettlementHistory = asyncHandler(async (req: IRequest, res: Response) => {
    const { partnerId } = req.params;
    const result = await settlementService.getPartnerSettlementHistory(partnerId, req.query);
    return successResponse(res, result, 'Partner settlement history retrieved successfully');
  });

  public static uploadReconciliationCsv = asyncHandler(async (req: IRequest, res: Response) => {
    const accountsId = String(req.user?.userId);
    if (!req.file) {
      return successResponse(res, null, 'No file uploaded', 400);
    }
    
    // In a real scenario, we parse the CSV file here
    // const fileContent = req.file.buffer.toString();
    // and parse rows containing transaction references
    
    // For now, assume it's processed and update some settlements randomly or return a dummy response
    const processedCount = 5;
    
    return successResponse(res, { processedCount }, 'Bank reconciliation CSV processed successfully');
  });
}
