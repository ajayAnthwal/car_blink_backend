import { LeadModel, ILead, LEAD_STATUS } from './lead.model';
import { getPaginationOptions, formatPaginatedResponse, IPaginatedResult } from '../../../../common/utils/pagination.util';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class LeadService {
  public static async createLead(data: Partial<ILead>): Promise<ILead> {
    // 1. Check/Auto-create Customer Account for Guest Leads
    const { UserModel } = require('../../../../modules/user/user.model');
    const { ROLES } = require('../../../../common/constants/roles.constant');

    if (data.phone && !data.customerId) {
      try {
        const cleanPhone = data.phone.trim();
        let user = await UserModel.findOne({ phone: cleanPhone });
        
        if (!user && data.email) {
          user = await UserModel.findOne({ email: data.email.trim().toLowerCase() });
        }

        if (!user) {
          user = await UserModel.create({
            fullName: data.name || 'Valued Customer',
            phone: cleanPhone,
            email: data.email ? data.email.trim().toLowerCase() : undefined,
            password: 'CarBlink@123',
            role: ROLES.CUSTOMER,
            isPhoneVerified: false,
            isEmailVerified: false,
          });
        }

        if (user) {
          data.customerId = user._id;
        }
      } catch (userErr) {
        console.error('[LeadService] Auto customer user creation warning:', userErr);
      }
    }

    const lead = await LeadModel.create(data);
    
    // 2. Trigger Interakt WhatsApp Welcome Alert to Customer
    if (lead.phone) {
      try {
        const { whatsappProvider } = require('../../../../modules/notification/providers/whatsapp.provider');
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.carblink.in';
        
        await whatsappProvider.sendWhatsAppTemplate(
          lead.phone,
          'carblink_guest_quote_received',
          [lead.name || 'Valued Customer', lead.vehicleBrand ? `${lead.vehicleBrand} ${lead.vehicleModel || ''}` : 'Car Service', `${dashboardUrl}/login`],
          [lead.name || 'Customer']
        );
      } catch (waErr) {
        console.warn('[LeadService] Interakt WhatsApp notification warning:', waErr);
      }
    }

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

    // Trigger WhatsApp notification for Customer Lead Status & Price Quote updates
    if (lead.phone) {
      try {
        const { whatsappProvider } = require('../../../../modules/notification/providers/whatsapp.provider');
        const { notificationService } = require('../../../../modules/notification/notification.service');
        const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../../modules/notification/notification.model');
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.carblink.in';
        
        let statusTitle = `Service Update: ${String(status).replace('_', ' ')}`;
        let statusMsg = `Hi ${lead.name || 'Customer'}! Your car service status is now ${String(status).replace('_', ' ')}. View details: ${dashboardUrl}/login`;

        if (String(status) === 'CONVERTED' || String(status) === 'IN_PROGRESS') {
          statusTitle = 'Car Service In Progress!';
          statusMsg = `Hi ${lead.name || 'Customer'}! Your requested car service is now in progress. Track Live Status: ${dashboardUrl}/login`;
        }

        await whatsappProvider.sendWhatsAppText(lead.phone, `🚘 *[CARBLINK ${statusTitle.toUpperCase()}]*\n${statusMsg}`);

        // Also notify Executive & Admin Team on WhatsApp & Console
        const execTitle = `Lead Updated to ${String(status).replace('_', ' ')}`;
        const execMsg = `Lead for ${lead.name} (${lead.phone}) has been updated to ${String(status).replace('_', ' ')}.`;
        await notificationService.sendToRole('EXECUTIVE', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.JOB_STATUS, execTitle, execMsg, { leadId: lead._id.toString() });
        await notificationService.sendToRole('SUPER_ADMIN', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.JOB_STATUS, execTitle, execMsg, { leadId: lead._id.toString() });
      } catch (waErr) {
        console.warn('[LeadService] WhatsApp lead status alert warning:', waErr);
      }
    }

    return lead;
  }
}
