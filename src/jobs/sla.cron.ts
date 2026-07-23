import cron from 'node-cron';
import { EscalationModel } from '../modules/executive/sub-modules/escalation/escalation.model';
import { ESCALATION_STATUS } from '../common/constants/status.constant';
import { logger } from '../config/logger.config';
import { notificationService } from '../modules/notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../modules/notification/notification.model';

// Run every 15 minutes to check for breached SLAs
export const runSlaCron = async () => {
  logger.info('Running SLA Breach Cron Job...');
  try {
    const now = new Date();
    
    const breachedEscalations = await EscalationModel.find({
      status: { $in: [ESCALATION_STATUS.OPEN, ESCALATION_STATUS.IN_PROGRESS] },
      slaBreachAt: { $lt: now },
      isSlaBreached: false
    });

    for (const escalation of breachedEscalations) {
      escalation.isSlaBreached = true;
      await escalation.save();

      if (escalation.assignedExecutiveId) {
        await notificationService.sendNotification(
          escalation.assignedExecutiveId.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.GENERAL,
          'SLA Breached!',
          `Escalation ${escalation._id} has breached its SLA. Please resolve it immediately.`,
          { escalationId: escalation._id.toString() }
        );
      }
    }

    if (breachedEscalations.length > 0) {
      logger.info(`Marked ${breachedEscalations.length} escalations as SLA breached.`);
    }

  } catch (error) {
    logger.error('Error in SLA Cron Job:', error);
  }
};
