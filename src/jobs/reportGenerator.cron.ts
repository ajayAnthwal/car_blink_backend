import { gstReportService } from '../modules/accounts/sub-modules/reports/gst-report.service';
import { invoiceReportService } from '../modules/accounts/sub-modules/reports/invoice-report.service';
import { DailyReportSnapshotModel, REPORT_TYPE } from '../modules/accounts/sub-modules/reports/daily-report-snapshot.model';
import { logger } from '../config/logger.config';

/**
 * Core logic for generating GST and Invoice reports for the previous calendar day
 * and saving them to the database as snapshot records. Can be triggered manually.
 */
export async function runReportGeneratorCron(targetDate?: Date): Promise<void> {
  logger.info('[CRON] Starting daily report generator job...');
  try {
    const dateToUse = targetDate ? new Date(targetDate) : new Date();
    if (!targetDate) {
      dateToUse.setDate(dateToUse.getDate() - 1); // Default to yesterday
    }
    const dateStr = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}-${String(dateToUse.getDate()).padStart(2, '0')}`;
    const reportDate = new Date(dateStr);

    logger.info(`[CRON] Generating daily reports for date: ${dateStr}`);

    // 1. Generate & Save GST report snapshot
    try {
      const gstReport = await gstReportService.generateGstReport(dateStr, dateStr);
      await DailyReportSnapshotModel.findOneAndUpdate(
        { reportType: REPORT_TYPE.GST, reportDate },
        { reportData: gstReport },
        { upsert: true, new: true }
      );
      logger.info(`[CRON] GST report snapshot saved successfully for ${dateStr}.`);
    } catch (error: any) {
      logger.error(`[CRON] Failed to generate/save GST report snapshot. Error: ${error.message}`);
    }

    // 2. Generate & Save Invoice report snapshot
    try {
      const invoiceReport = await invoiceReportService.generateInvoiceReport(dateStr, dateStr);
      await DailyReportSnapshotModel.findOneAndUpdate(
        { reportType: REPORT_TYPE.INVOICE, reportDate },
        { reportData: invoiceReport },
        { upsert: true, new: true }
      );
      logger.info(`[CRON] Invoice report snapshot saved successfully for ${dateStr}.`);
    } catch (error: any) {
      logger.error(`[CRON] Failed to generate/save Invoice report snapshot. Error: ${error.message}`);
    }

    logger.info('[CRON] Daily report generator job completed.');
  } catch (error: any) {
    logger.error(`[CRON] Critical failure in runReportGeneratorCron: ${error.message}`);
  }
}
