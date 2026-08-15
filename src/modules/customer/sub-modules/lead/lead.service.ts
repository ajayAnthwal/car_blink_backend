import { LeadModel, ILead, LEAD_STATUS } from './lead.model';
import { getPaginationOptions, formatPaginatedResponse, IPaginatedResult } from '../../../../common/utils/pagination.util';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class LeadService {
  public static async createLead(data: Partial<ILead>): Promise<ILead> {
    const lead = await LeadModel.create(data);
    
    // Notify Admin and Executive
    try {
      const { notificationService } = require('../../../../modules/notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../../modules/notification/notification.model');
      const { emitToRole } = require('../../../../sockets');
      
      const payload = { leadId: lead._id.toString(), source: lead.source };
      emitToRole('SUPER_ADMIN', 'new_lead', payload);
      emitToRole('EXECUTIVE', 'new_lead', payload);

      const title = 'New Lead Received';
      const msg = `A new ${lead.source?.replace('_', ' ')} has been submitted by ${lead.name}.`;

      await notificationService.sendToRole('SUPER_ADMIN', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
      await notificationService.sendToRole('EXECUTIVE', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
    } catch (err: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send lead creation notification:', err);
    }
    
    return lead;
  }

  public static async getLeads(query: any): Promise<IPaginatedResult<ILead>> {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = {};
    if (query.source && query.source !== 'all') filter.source = query.source;
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { vehicleBrand: searchRegex },
        { vehicleModel: searchRegex }
      ];
    }

    const [data, total] = await Promise.all([
      LeadModel.find(filter)
        .populate('customerId', 'fullName email phone')
        .populate('serviceIds', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LeadModel.countDocuments(filter),
    ]);

    return formatPaginatedResponse(data, total, page, limit);
  }

  public static async updateLeadStatus(id: string, status: LEAD_STATUS): Promise<ILead> {
    const lead = await LeadModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
    return lead;
  }
}
