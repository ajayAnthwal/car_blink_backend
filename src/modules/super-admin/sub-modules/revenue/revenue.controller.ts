import { Response } from 'express';
import { revenueService } from './revenue.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class RevenueController {
  public static getRevenueSummary = asyncHandler(async (req: IRequest, res: Response) => {
    const { period, fromDate, toDate } = req.query as {
      period: 'today' | 'week' | 'month' | 'year' | 'custom';
      fromDate?: string;
      toDate?: string;
    };
    const result = await revenueService.getRevenueSummary(period, fromDate, toDate);
    return successResponse(res, result, 'Revenue summary retrieved successfully');
  });

  public static getRevenueTrend = asyncHandler(async (req: IRequest, res: Response) => {
    const { period, groupBy, fromDate, toDate } = req.query as {
      period: 'today' | 'week' | 'month' | 'year' | 'custom';
      groupBy: 'day' | 'week' | 'month';
      fromDate?: string;
      toDate?: string;
    };
    const result = await revenueService.getRevenueTrend(period, groupBy, fromDate, toDate);
    return successResponse(res, result, 'Revenue trend retrieved successfully');
  });
}
export default RevenueController;
