import { Response } from 'express';
import { commissionService } from './commission.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class CommissionController {
  public static getCommissionReport = asyncHandler(async (req: IRequest, res: Response) => {
    const { fromDate, toDate, partnerId } = req.query as {
      fromDate: string;
      toDate: string;
      partnerId?: string;
    };
    const result = await commissionService.getCommissionReport(fromDate, toDate, { partnerId });
    return successResponse(res, result, 'Commission report retrieved successfully');
  });

  public static getCommissionByPartner = asyncHandler(async (req: IRequest, res: Response) => {
    const { partnerId } = req.params;
    const { fromDate, toDate } = req.query as {
      fromDate: string;
      toDate: string;
    };
    const result = await commissionService.getCommissionByPartner(partnerId, fromDate, toDate);
    return successResponse(res, result, 'Partner commission report retrieved successfully');
  });
}
export default CommissionController;
