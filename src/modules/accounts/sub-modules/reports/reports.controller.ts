import { Response } from 'express';
import { gstReportService } from './gst-report.service';
import { invoiceReportService } from './invoice-report.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class ReportsController {
  public static getGstReport = asyncHandler(async (req: IRequest, res: Response) => {
    const { fromDate, toDate } = req.query as { fromDate: string; toDate: string };
    const result = await gstReportService.generateGstReport(fromDate, toDate);
    return successResponse(res, result, 'GST report generated successfully');
  });

  public static getInvoiceReport = asyncHandler(async (req: IRequest, res: Response) => {
    const { fromDate, toDate, cityId, serviceId } = req.query as {
      fromDate: string;
      toDate: string;
      cityId?: string;
      serviceId?: string;
    };
    const result = await invoiceReportService.generateInvoiceReport(fromDate, toDate, {
      cityId,
      serviceId,
    });
    return successResponse(res, result, 'Invoice report generated successfully');
  });
}
export default ReportsController;
