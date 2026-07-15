import { EscalationModel } from './escalation.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { SupportTicketModel } from '../../../customer/sub-modules/support-ticket/ticket.model';
import { UserModel } from '../../../user/user.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { ESCALATION_STATUS } from '../../../../common/constants/status.constant';

export class EscalationService {
  /**
   * Get all escalations across the platform with optional filtering (paginated)
   */
  async getAllEscalations(query: any = {}): Promise<{ escalations: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.assignedExecutiveId) filter.assignedExecutiveId = query.assignedExecutiveId;
    if (query.bookingId) filter.bookingId = query.bookingId;
    if (query.ticketId) filter.ticketId = query.ticketId;

    const [escalations, total] = await Promise.all([
      EscalationModel.find(filter)
        .populate('bookingId', 'status description')
        .populate('ticketId', 'subject status priority')
        .populate('relatedUserId', 'fullName email phone role')
        .populate('assignedExecutiveId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EscalationModel.countDocuments(filter),
    ]);

    return { escalations, total, page, limit };
  }

  /**
   * Get specific escalation details by ID
   */
  async getEscalationById(id: string): Promise<any> {
    const escalation = await EscalationModel.findById(id)
      .populate('bookingId', 'status description vehicleId serviceId cityId')
      .populate('ticketId', 'subject description status priority messages')
      .populate('relatedUserId', 'fullName email phone role')
      .populate('assignedExecutiveId', 'fullName email')
      .lean();

    if (!escalation) {
      throw new NotFoundError('Escalation not found');
    }

    return escalation;
  }

  /**
   * Create a new escalation
   */
  async createEscalation(data: any): Promise<any> {
    if (data.bookingId) {
      const booking = await BookingModel.findById(data.bookingId);
      if (!booking) throw new NotFoundError('Booking not found');
    }
    if (data.ticketId) {
      const ticket = await SupportTicketModel.findById(data.ticketId);
      if (!ticket) throw new NotFoundError('Support ticket not found');
    }
    if (data.relatedUserId) {
      const user = await UserModel.findById(data.relatedUserId);
      if (!user) throw new NotFoundError('Related user not found');
    }

    const escalation = await EscalationModel.create(data);

    return await EscalationModel.findById(escalation._id)
      .populate('bookingId', 'status description')
      .populate('ticketId', 'subject status priority')
      .populate('relatedUserId', 'fullName email phone role')
      .populate('assignedExecutiveId', 'fullName email')
      .lean();
  }

  /**
   * Assign escalation to self (executive)
   */
  async assignEscalationToSelf(executiveId: string, escalationId: string): Promise<any> {
    const escalation = await EscalationModel.findById(escalationId);
    if (!escalation) {
      throw new NotFoundError('Escalation not found');
    }

    escalation.assignedExecutiveId = executiveId as any;
    if (escalation.status === ESCALATION_STATUS.OPEN) {
      escalation.status = ESCALATION_STATUS.IN_PROGRESS;
    }
    await escalation.save();

    return await EscalationModel.findById(escalationId)
      .populate('bookingId', 'status description')
      .populate('ticketId', 'subject status priority')
      .populate('relatedUserId', 'fullName email phone role')
      .populate('assignedExecutiveId', 'fullName email')
      .lean();
  }

  /**
   * Resolve an escalation (ownership verification check required)
   */
  async resolveEscalation(
    executiveId: string,
    escalationId: string,
    resolutionNotes?: string
  ): Promise<any> {
    const escalation = await EscalationModel.findById(escalationId);
    if (!escalation) {
      throw new NotFoundError('Escalation not found');
    }

    // Only the assigned executive can resolve, throw UnauthorizedError otherwise
    if (!escalation.assignedExecutiveId || escalation.assignedExecutiveId.toString() !== executiveId) {
      throw new UnauthorizedError('Only the assigned executive can resolve this escalation');
    }

    escalation.status = ESCALATION_STATUS.RESOLVED;
    if (resolutionNotes !== undefined) {
      escalation.resolutionNotes = resolutionNotes;
    }

    await escalation.save();

    // Notify affected user (relatedUserId)
    if (escalation.relatedUserId) {
      try {
        const { notificationService } = require('../../../notification/notification.service');
        const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
        const { logger } = require('../../../../config/logger.config');

        await notificationService.sendNotification(
          escalation.relatedUserId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.ESCALATION,
          'Your Issue Has Been Resolved',
          `Your escalation ticket has been resolved. Notes: ${resolutionNotes || 'None'}`,
          { escalationId: escalation._id.toString() }
        );
      } catch (notifErr: any) {
        const { logger } = require('../../../../config/logger.config');
        logger.warn('Failed to send escalation resolution notification:', notifErr);
      }
    }

    return await EscalationModel.findById(escalationId)
      .populate('bookingId', 'status description')
      .populate('ticketId', 'subject status priority')
      .populate('relatedUserId', 'fullName email phone role')
      .populate('assignedExecutiveId', 'fullName email')
      .lean();
  }
}

export const escalationService = new EscalationService();
