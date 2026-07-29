import { NotificationHistoryModel } from './notifications.model';
import { emitToRole } from '../../../../sockets';
import { UserModel } from '../../../user/user.model';
import { NotificationModel, NOTIFICATION_TYPE, NOTIFICATION_CATEGORY, NOTIFICATION_STATUS } from '../../../notification/notification.model';

export class SuperAdminNotificationsService {
  async getHistory() {
    return await NotificationHistoryModel.find()
      .populate('sentBy', 'fullName')
      .sort({ sentAt: -1 })
      .limit(50)
      .lean();
  }

  async sendNotification(data: any, adminId: string) {
    const { title, body, targetAudience } = data;
    
    // In a real app, integrate with Firebase Cloud Messaging (FCM) here
    // Example: await fcm.sendToTopic(targetAudience, { title, body });

    const record = await NotificationHistoryModel.create({
      title,
      body,
      targetAudience,
      sentBy: adminId,
      sentAt: new Date(),
    });

    // Emit live socket event
    const payload = { title, message: body, timestamp: new Date(), isRead: false, category: NOTIFICATION_CATEGORY.GENERAL };
    if (targetAudience === 'PARTNERS' || targetAudience === 'ALL') {
      emitToRole('PARTNER', 'notification:new', payload);
    }
    if (targetAudience === 'CUSTOMERS' || targetAudience === 'ALL') {
      emitToRole('CUSTOMER', 'notification:new', payload);
    }
    if (targetAudience === 'ALL') {
      emitToRole('SUPER_ADMIN', 'notification:new', payload);
      emitToRole('ADMIN', 'notification:new', payload);
      emitToRole('EXECUTIVE', 'notification:new', payload);
      emitToRole('ACCOUNTS', 'notification:new', payload);
    }

    // Insert notifications into database for all targeted users
    let roleFilter = {};
    if (targetAudience === 'PARTNERS') roleFilter = { role: 'PARTNER' };
    else if (targetAudience === 'CUSTOMERS') roleFilter = { role: 'CUSTOMER' };
    
    // Asynchronous bulk insert to not block the request
    UserModel.find(roleFilter).select('_id').lean().then(async (users) => {
      if (users.length > 0) {
        const notificationsToInsert = users.map(u => ({
          userId: u._id,
          type: NOTIFICATION_TYPE.PUSH,
          category: NOTIFICATION_CATEGORY.GENERAL,
          title,
          message: body,
          status: NOTIFICATION_STATUS.SENT,
          isRead: false,
        }));
        // Use NotificationModel directly
        await NotificationModel.insertMany(notificationsToInsert);
      }
    }).catch(err => {
      console.error("Failed to bulk insert notifications", err);
    });

    return record;
  }
}

export const superAdminNotificationsService = new SuperAdminNotificationsService();
