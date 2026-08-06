import mongoose from 'mongoose';
import { SupportTicketModel, ISupportTicket } from './ticket.model';
import { BookingModel } from '../booking/booking.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { emitToRole } from '../../../../sockets';
import { UserModel } from '../../../user/user.model';
import { NotificationModel, NOTIFICATION_TYPE, NOTIFICATION_CATEGORY, NOTIFICATION_STATUS } from '../../../notification/notification.model';

export class TicketService {
  public static async createTicket(
    customerId: string,
    data: { bookingId?: string; subject: string; description: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
  ): Promise<ISupportTicket> {
    // Optional: verify booking ownership if bookingId is provided
    if (data.bookingId) {
      const booking = await BookingModel.findById(data.bookingId);
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }
      if (booking.customerId.toString() !== customerId) {
        throw new UnauthorizedError('You do not own this booking');
      }
    }

    const ticket = await SupportTicketModel.create({
      customerId,
      bookingId: data.bookingId || undefined,
      subject: data.subject,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      messages: [],
    });

    // Notify Super Admins and Executives
    const notifService = require('../../../notification/notification.service').notificationService;
    const notifModel = require('../../../notification/notification.model');
    await notifService.sendToRole(
      'SUPER_ADMIN',
      notifModel.NOTIFICATION_TYPE.IN_APP,
      notifModel.NOTIFICATION_CATEGORY.SUPPORT_TICKET,
      'New Support Ticket Created',
      `A customer has created a new support ticket: ${data.subject}`,
      { ticketId: ticket._id }
    );
    await notifService.sendToRole(
      'EXECUTIVE',
      notifModel.NOTIFICATION_TYPE.IN_APP,
      notifModel.NOTIFICATION_CATEGORY.SUPPORT_TICKET,
      'New Support Ticket Created',
      `A customer has created a new support ticket: ${data.subject}`,
      { ticketId: ticket._id }
    );

    return ticket;
  }

  public static async getMyTickets(
    customerId: string,
    query: { page?: string; limit?: string }
  ): Promise<{ tickets: ISupportTicket[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter = { customerId };
    const [tickets, total] = await Promise.all([
      SupportTicketModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SupportTicketModel.countDocuments(filter),
    ]);

    return { tickets, total, page, limit };
  }

  public static async getTicketById(customerId: string, ticketId: string): Promise<ISupportTicket> {
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Support ticket not found');
    }

    if (ticket.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to view this ticket');
    }

    return ticket;
  }

  public static async replyToTicket(
    customerId: string,
    ticketId: string,
    message: string
  ): Promise<ISupportTicket> {
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Support ticket not found');
    }

    if (ticket.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to reply to this ticket');
    }

    // Push new message
    ticket.messages.push({
      senderId: new mongoose.Types.ObjectId(customerId) as any,
      senderRole: 'CUSTOMER',
      message,
      createdAt: new Date(),
    });

    // Re-open if closed/resolved
    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      ticket.status = 'OPEN';
    }

    const savedTicket = await ticket.save();

    // Notify Super Admins and Executives
    const notifService = require('../../../notification/notification.service').notificationService;
    const notifModel = require('../../../notification/notification.model');
    await notifService.sendToRole(
      'SUPER_ADMIN',
      notifModel.NOTIFICATION_TYPE.IN_APP,
      notifModel.NOTIFICATION_CATEGORY.SUPPORT_TICKET,
      'New Helpdesk Reply',
      `A customer has replied to ticket #${ticket._id.toString().slice(-8).toUpperCase()}`,
      { ticketId: ticket._id }
    );
    await notifService.sendToRole(
      'EXECUTIVE',
      notifModel.NOTIFICATION_TYPE.IN_APP,
      notifModel.NOTIFICATION_CATEGORY.SUPPORT_TICKET,
      'New Helpdesk Reply',
      `A customer has replied to ticket #${ticket._id.toString().slice(-8).toUpperCase()}`,
      { ticketId: ticket._id }
    );
    return savedTicket;
  }
}
export default TicketService;
