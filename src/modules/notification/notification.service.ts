import mongoose from 'mongoose';
import { NotificationModel, INotification, NOTIFICATION_TYPE, NOTIFICATION_CATEGORY, NOTIFICATION_STATUS } from './notification.model';
import { UserModel } from '../user/user.model';
import { smsProvider } from './providers/sms.provider';
import { emailProvider } from './providers/email.provider';
import { pushProvider } from './providers/push.provider';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../common/errors/UnauthorizedError';
import { logger } from '../../config/logger.config';
import { emitToUser, emitToRole } from '../../sockets';

export class NotificationService {
  /**
   * Send notification to a specific user via SMS, Email, or Push
   */
  async sendNotification(
    userId: string,
    type: NOTIFICATION_TYPE,
    category: NOTIFICATION_CATEGORY,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<INotification> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    let success = false;
    let providerMessageId: string | undefined;

    try {
      if (type === NOTIFICATION_TYPE.SMS) {
        const result = await smsProvider.sendSms(user.phone, message);
        success = result.success;
        providerMessageId = result.providerMessageId;
      } else if (type === NOTIFICATION_TYPE.EMAIL) {
        if (!user.email) {
          logger.warn(`No email registered for user ${userId}. Email notification skipped.`);
          success = false;
        } else {
          const result = await emailProvider.sendEmail(user.email, title, message);
          success = result.success;
          providerMessageId = result.providerMessageId;
        }
      } else if (type === NOTIFICATION_TYPE.PUSH) {
        const tokens = user.deviceTokens || [];
        if (tokens.length === 0) {
          logger.warn(`No device tokens registered for user ${userId}. Push notification skipped.`);
          success = false;
        } else {
          // Send to all registered device tokens
          const sendResults = await Promise.all(
            tokens.map((token) => pushProvider.sendPush(token, title, message, metadata))
          );
          success = sendResults.some((r) => r.success);
          providerMessageId = sendResults.map((r) => r.providerMessageId).filter(Boolean).join(',');
        }
      }
    } catch (error: any) {
      logger.error('Error dispatching provider notification:', error);
      success = false;
    }

    // Save notification record to the database
    const notification = await NotificationModel.create({
      userId,
      type,
      category,
      title,
      message,
      status: success ? NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED,
      providerMessageId,
      metadata,
    });

    // Real-time socket event delivery (isolated)
    try {
      emitToUser(userId.toString(), 'notification:new', notification.toJSON());
    } catch (socketError: any) {
      logger.error(`[SOCKET] Failed to push live notification to user ${userId}:`, socketError);
    }

    return notification;
  }

  /**
   * Send notification to all users of a specific role
   */
  async sendToRole(
    role: string,
    type: NOTIFICATION_TYPE,
    category: NOTIFICATION_CATEGORY,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const users = await UserModel.find({ role, isActive: true }, '_id');
    if (users.length === 0) return;

    const payload = { title, message, metadata, timestamp: new Date(), isRead: false };
    const notifications = users.map(u => ({
      userId: u._id,
      type,
      category,
      title,
      message,
      metadata,
      status: NOTIFICATION_STATUS.SENT,
      isRead: false
    }));

    await NotificationModel.insertMany(notifications);
    emitToRole(role, 'notification:new', payload);
  }

  /**
   * Retrieve user's paginated in-app notifications
   */
  async getMyNotifications(
    userId: string,
    query: any = {}
  ): Promise<{ notifications: INotification[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (query.category) {
      filter.category = query.category;
    }
    if (query.isRead !== undefined) {
      filter.isRead = query.isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      NotificationModel.countDocuments(filter),
    ]);

    return { notifications, total, page, limit };
  }

  /**
   * Mark a specific notification as read (enforcing ownership)
   */
  async markAsRead(userId: string, notificationId: string): Promise<INotification> {
    const notification = await NotificationModel.findById(notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId.toString() !== userId) {
      throw new UnauthorizedError('You are not authorized to read this notification');
    }

    notification.isRead = true;
    await notification.save();

    return notification;
  }

  /**
   * Mark all notifications for the user as read
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await NotificationModel.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return { success: true };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
