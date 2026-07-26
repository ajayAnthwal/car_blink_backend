import { NotificationHistoryModel } from './notifications.model';
import { emitToRole } from '../../../../sockets';

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
    const payload = { title, message: body, timestamp: new Date() };
    if (targetAudience === 'ALL_PARTNERS' || targetAudience === 'ALL_USERS') {
      emitToRole('PARTNER', 'notification:new', payload);
    }
    if (targetAudience === 'ALL_CUSTOMERS' || targetAudience === 'ALL_USERS') {
      emitToRole('CUSTOMER', 'notification:new', payload);
    }

    return record;
  }
}

export const superAdminNotificationsService = new SuperAdminNotificationsService();
