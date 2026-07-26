import { Response } from 'express';
import { superAdminSettlementsService } from './settlements.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminSettlementsController {
  public static getAllSettlements = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await superAdminSettlementsService.getAllSettlements(req.query);
    return successResponse(res, result, 'Settlements retrieved successfully');
  });

  public static createSettlement = asyncHandler(async (req: IRequest, res: Response) => {
    const settlement = await superAdminSettlementsService.createSettlement(req.body);
    return successResponse(res, settlement, 'Settlement created successfully', 201);
  });

  public static markAsPaid = asyncHandler(async (req: IRequest, res: Response) => {
    const { transactionId, notes } = req.body;
    const settlement = await superAdminSettlementsService.markAsPaid(req.params.id, transactionId, notes);
    return successResponse(res, settlement, 'Settlement marked as paid');
  });
}

export default SuperAdminSettlementsController;
