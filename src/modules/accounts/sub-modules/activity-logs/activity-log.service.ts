import { ActivityLogModel } from './activity-log.model';
import { UserModel } from '../../../user/user.model';
import { ROLES } from '../../../../common/constants/roles.constant';
import { ApiError } from '../../../../common/errors/ApiError';
import { notificationService } from '../../../notification/notification.service';
import { NOTIFICATION_TYPES } from '../../../../common/constants/notification.constant';

export class ActivityLogService {
  /**
   * Log an activity and send high-value alert if amount exceeds threshold
   */
  static async logActivity(accountsId: string, action: string, amount: number, details: string) {
    // Save to immutable logs
    await ActivityLogModel.create({
      accountsId,
      action,
      amount,
      details,
    });

    // Check for High-Value transaction
    const HIGH_VALUE_THRESHOLD = 5000;
    if (amount >= HIGH_VALUE_THRESHOLD) {
      const superAdmin = await UserModel.findOne({ role: ROLES.SUPER_ADMIN });
      if (superAdmin) {
        const executor = await UserModel.findById(accountsId);
        const executorName = executor ? executor.fullName : 'Accounts User';
        
        await notificationService.sendNotification(
          String(superAdmin._id),
          NOTIFICATION_TYPES.SYSTEM,
          `High-Value Transaction Alert 🚨`,
          `User ${executorName} processed a high-value ${action} of ₹${amount}. Details: ${details}`
        );
      }
    }
  }

  static async getRecentLogs(limit: number = 10) {
    return ActivityLogModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('accountsId', 'fullName email')
      .lean();
  }
}
