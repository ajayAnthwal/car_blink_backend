import { DailyReportSnapshotModel, IDailyReportSnapshot, REPORT_TYPE } from '../../../accounts/sub-modules/reports/daily-report-snapshot.model';

export class ReportsHistoryService {
  /**
   * Retrieve historical daily GST/Invoice report snapshots within a date range
   */
  async getReportsHistory(
    reportType?: REPORT_TYPE,
    fromDate?: string,
    toDate?: string
  ): Promise<IDailyReportSnapshot[]> {
    const filter: any = {};

    if (reportType) {
      filter.reportType = reportType;
    }

    if (fromDate || toDate) {
      filter.reportDate = {};
      if (fromDate) {
        filter.reportDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        const parsedTo = new Date(toDate);
        parsedTo.setHours(23, 59, 59, 999);
        filter.reportDate.$lte = parsedTo;
      }
    }

    return DailyReportSnapshotModel.find(filter).sort({ reportDate: -1 });
  }
}

export const reportsHistoryService = new ReportsHistoryService();
export default reportsHistoryService;
