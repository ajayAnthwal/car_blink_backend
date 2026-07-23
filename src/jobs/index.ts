import cron from 'node-cron';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';
import { runSettlementCron } from './settlement.cron';
import { runReminderCron } from './reminder.cron';
import { runReportGeneratorCron } from './reportGenerator.cron';
import { runSlaCron } from './sla.cron';

/**
 * Initialize all background cron jobs and register schedules.
 * Honors the ENABLE_CRON_JOBS flag.
 */
export function initializeCronJobs(): void {
  if (!env.ENABLE_CRON_JOBS) {
    logger.warn('[CRON] Background cron jobs are disabled via ENABLE_CRON_JOBS env config. Skipping registration.');
    return;
  }

  logger.info('[CRON] Registering background cron jobs...');

  // 1. Settlement Job: Daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('[CRON] Firing scheduled Settlement Job (0 2 * * *)...');
    runSettlementCron().catch((err) =>
      logger.error(`[CRON] Settlement Job execution failed: ${err.message}`)
    );
  });
  logger.info('[CRON] Registered Settlement Job schedule: 0 2 * * *');

  // 2. Reminder Job: Hourly (at minute 0)
  cron.schedule('0 * * * *', () => {
    logger.info('[CRON] Firing scheduled Executive Reminder Job (0 * * * *)...');
    runReminderCron().catch((err) =>
      logger.error(`[CRON] Executive Reminder Job execution failed: ${err.message}`)
    );
  });
  logger.info('[CRON] Registered Executive Reminder Job schedule: 0 * * * *');

  // 3. Daily Report Generator Job: Daily at 12:00 AM (Midnight)
  cron.schedule('0 0 * * *', () => {
    logger.info('[CRON] Firing scheduled Daily Report Generator Job (0 0 * * *)...');
    runReportGeneratorCron().catch((err) =>
      logger.error(`[CRON] Daily Report Generator Job execution failed: ${err.message}`)
    );
  });
  logger.info('[CRON] Registered Daily Report Generator Job schedule: 0 0 * * *');

  // 4. SLA Breach Cron Job: Every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    logger.info('[CRON] Firing scheduled SLA Breach Job (*/15 * * * *)...');
    runSlaCron().catch((err) =>
      logger.error(`[CRON] SLA Breach Job execution failed: ${err.message}`)
    );
  });
  logger.info('[CRON] Registered SLA Breach Job schedule: */15 * * * *');

  logger.info('[CRON] All background cron jobs registered successfully.');
}
export default initializeCronJobs;
