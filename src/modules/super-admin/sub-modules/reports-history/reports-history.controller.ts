import { Response } from 'express';
import { reportsHistoryService } from './reports-history.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';
import { REPORT_TYPE } from '../../../accounts/sub-modules/reports/daily-report-snapshot.model';

export class ReportsHistoryController {
  public static getReportsHistory = asyncHandler(async (req: IRequest, res: Response) => {
    const { reportType, fromDate, toDate } = req.query as {
      reportType?: REPORT_TYPE;
      fromDate?: string;
      toDate?: string;
    };
    const result = await reportsHistoryService.getReportsHistory(reportType, fromDate, toDate);
    return successResponse(res, result, 'Reports history snapshots retrieved successfully');
  });
}
export default ReportsHistoryController;
