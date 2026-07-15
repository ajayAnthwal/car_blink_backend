import mongoose from 'mongoose';
import { settlementService } from '../modules/accounts/sub-modules/settlements/settlement.service';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';
import { UserModel } from '../modules/user/user.model';
import { ROLES } from '../common/constants/roles.constant';

/**
 * Contain the core logic for generating pending settlements for completed jobs.
 * This can also be triggered manually for testing.
 */
export async function runSettlementCron(): Promise<void> {
  logger.info('[CRON] Starting automated settlement generation job...');
  try {
    const eligibleJobs = await settlementService.getEligibleJobsForSettlement();
    logger.info(`[CRON] Found ${eligibleJobs.length} completed job(s) eligible for settlement generation.`);

    if (eligibleJobs.length === 0) {
      logger.info('[CRON] No eligible jobs found for settlement. Job finished.');
      return;
    }

    // Find a system Accounts user to attribute the auto-generation to
    const accountsUser = await UserModel.findOne({ role: ROLES.ACCOUNTS });
    const accountsId = accountsUser
      ? accountsUser._id.toString()
      : new mongoose.Types.ObjectId().toString();

    let successCount = 0;
    let failureCount = 0;

    for (const job of eligibleJobs) {
      try {
        // NOTE: This job only GENERATES settlements (status PENDING) — it does NOT auto-process/pay them out,
        // since actual payout processing should remain a manual Accounts action for financial control.
        await settlementService.generateSettlement(
          accountsId,
          job._id.toString(),
          env.DEFAULT_COMMISSION_PERCENT
        );
        successCount++;
        logger.info(`[CRON] Successfully generated pending settlement for Job ID: ${job._id}`);
      } catch (error: any) {
        failureCount++;
        logger.error(`[CRON] Failed to generate settlement for Job ID: ${job._id}. Error: ${error.message}`);
      }
    }

    logger.info(`[CRON] Automated settlement generation job completed. Success: ${successCount}, Failures: ${failureCount}`);
  } catch (error: any) {
    logger.error(`[CRON] Critical failure in runSettlementCron: ${error.message}`);
  }
}
