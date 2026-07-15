import { Response } from 'express';
import { financeSummaryService } from './finance-summary.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class FinanceSummaryController {
  public static getFinanceSummary = asyncHandler(async (req: IRequest, res: Response) => {
    const { fromDate, toDate } = req.query as {
      fromDate: string;
      toDate: string;
    };
    const result = await financeSummaryService.getFinanceSummary(fromDate, toDate);
    return successResponse(res, result, 'Finance summary retrieved successfully');
  });
}
export default FinanceSummaryController;
