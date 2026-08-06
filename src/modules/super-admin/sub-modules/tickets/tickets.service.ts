import { SupportTicketModel } from '../../../customer/sub-modules/support-ticket/ticket.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { emitToUser } from '../../../../sockets';
import { NotificationModel, NOTIFICATION_TYPE, NOTIFICATION_CATEGORY, NOTIFICATION_STATUS } from '../../../notification/notification.model';

export class SuperAdminTicketsService {
  /**
   * Get all support tickets
   */
  async getAllTickets(query: any) {
    const { page = 1, limit = 10, status, priority, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.subject = { $regex: search, $options: 'i' };

    const tickets = await SupportTicketModel.find(filter)
      .populate('customerId', 'fullName email phone')
      .populate('bookingId', 'status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await SupportTicketModel.countDocuments(filter);

    return {
      docs: tickets,
      totalDocs: total,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: skip + tickets.length < total,
      hasPrevPage: Number(page) > 1,
    };
  }

  /**
   * Get specific ticket details
   */
  async getTicketDetails(ticketId: string) {
    const ticket = await SupportTicketModel.findById(ticketId)
      .populate('customerId', 'fullName email phone')
      .populate('bookingId', 'status createdAt')
      .populate('messages.senderId', 'fullName email')
      .lean();

    if (!ticket) throw new NotFoundError('Ticket not found');
    return ticket;
  }

  /**
   * Update ticket status
   */
  async updateStatus(ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') {
    const ticket = await SupportTicketModel.findByIdAndUpdate(
      ticketId, 
      { status },
      { new: true }
    );
    if (!ticket) throw new NotFoundError('Ticket not found');
    return ticket;
  }

  /**
   * Add a reply from admin/executive
   */
  async addReply(ticketId: string, senderId: string, senderRole: string, message: string) {
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket not found');

    ticket.messages.push({
      senderId: senderId as any,
      senderRole: senderRole as any,
      message,
      createdAt: new Date(),
    });

    if (ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    await ticket.save();

    // Emit live socket event to the customer
    if (ticket.customerId) {
      const payload = {
        title: `Reply on Ticket #${ticket._id.toString().slice(-8).toUpperCase()}`,
        message: 'Support Team has replied to your support ticket.',
        timestamp: new Date(),
        ticketId: ticket._id
      };
      
      await NotificationModel.create({
        userId: ticket.customerId,
        type: NOTIFICATION_TYPE.IN_APP,
        category: NOTIFICATION_CATEGORY.SUPPORT_TICKET,
        title: payload.title,
        message: payload.message,
        status: NOTIFICATION_STATUS.SENT,
        isRead: false
      });

      emitToUser(ticket.customerId.toString(), 'notification:new', payload);
    }

    return ticket;
  }
}

export const superAdminTicketsService = new SuperAdminTicketsService();
