import { followUpService } from '../modules/executive/sub-modules/follow-up/followup.service';
import { notificationService } from '../modules/notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../modules/notification/notification.model';
import { logger } from '../config/logger.config';

/**
 * Core logic for checking pending follow-ups and sending reminder notifications
 * to the assigned executives. Can be triggered manually for testing.
 */
export async function runReminderCron(): Promise<void> {
  logger.info('[CRON] Starting executive follow-up reminder job...');
  try {
    // Retrieve up to 100 pending/due follow-ups
    const { followUps } = await followUpService.getPendingFollowUps({ limit: '100' });
    logger.info(`[CRON] Found ${followUps.length} pending follow-up(s) to check for reminders.`);

    let sentCount = 0;
    let failCount = 0;

    for (const followUp of followUps) {
      try {
        const execId = followUp.executiveId?._id?.toString() || followUp.executiveId?.toString();
        if (!execId) {
          logger.warn(`[CRON] Follow-up ID ${followUp._id} has no assigned executive. Skipping.`);
          continue;
        }

        const relatedUser = followUp.relatedUserId as any;
        const relatedName = relatedUser?.fullName || 'Unknown';
        const relatedRole = relatedUser?.role || 'User';
        const bookingDesc = (followUp.bookingId as any)?.description || 'N/A';

        const title = 'Follow-up Due';
        const message = `Reminder: Follow-up is due for ${relatedRole} ${relatedName} regarding booking: "${bookingDesc}".`;

        await notificationService.sendNotification(
          execId,
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.GENERAL,
          title,
          message
        );

        sentCount++;
      } catch (error: any) {
        failCount++;
        logger.error(`[CRON] Failed to send reminder for Follow-up ID: ${followUp._id}. Error: ${error.message}`);
      }
    }

    logger.info(`[CRON] Follow-up reminder job completed. Reminders sent: ${sentCount}, Failures: ${failCount}`);
  } catch (error: any) {
    logger.error(`[CRON] Critical failure in runReminderCron: ${error.message}`);
  }
}
