import { Response } from 'express';
import { settlementService } from './settlement.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SettlementController {
  public static getEligibleJobsForSettlement = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await settlementService.getEligibleJobsForSettlement(req.query);
    return successResponse(res, result, 'Eligible jobs for settlement retrieved successfully');
  });

  public static generateSettlement = asyncHandler(async (req: IRequest, res: Response) => {
    const accountsId = String(req.user?.userId);
    const { jobId, commissionPercent } = req.body;
    const result = await settlementService.generateSettlement(accountsId, jobId, commissionPercent);
    return successResponse(res, result, 'Settlement generated successfully', 201);
  });

  public static getAllSettlements = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await settlementService.getAllSettlements(req.query);
    return successResponse(res, result, 'Settlements retrieved successfully');
  });

  public static processSettlement = asyncHandler(async (req: IRequest, res: Response) => {
    const accountsId = String(req.user?.userId);
    const { id } = req.params;
    const { transactionReference } = req.body;
    const result = await settlementService.processSettlement(accountsId, id, transactionReference);
    return successResponse(res, result, 'Settlement processed successfully');
  });

  public static getPartnerSettlementHistory = asyncHandler(async (req: IRequest, res: Response) => {
    const { partnerId } = req.params;
    const result = await settlementService.getPartnerSettlementHistory(partnerId, req.query);
    return successResponse(res, result, 'Partner settlement history retrieved successfully');
  });
}
