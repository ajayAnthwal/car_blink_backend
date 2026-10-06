import { ApiError } from '../../../../common/errors/ApiError';
import { LeadModel, ILead, LEAD_STATUS } from './lead.model';
import { getPaginationOptions, formatPaginatedResponse, IPaginatedResult } from '../../../../common/utils/pagination.util';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class LeadService {
  
  public static async sendLeadOtp(phone: string): Promise<{ message: string }> {
    const cleanPhone = phone.trim();
    const { generateOtp, storeOtp } = require('../../../auth/strategies/otp.strategy');

    const otp = generateOtp();
    await storeOtp(cleanPhone, otp, 'MOBILE_VERIFY');

    return {
      message: `OTP sent successfully to ${cleanPhone}`,
    };
  }

  public static async createLead(data: Partial<ILead> & { otp?: string }): Promise<ILead> {

    // Verify OTP if OTP is provided or if source is QUICK_CALLBACK or WEBSITE_QUOTE
    if (data.otp || data.source === 'QUICK_CALLBACK' || data.source === 'WEBSITE_QUOTE') {
      if (!data.otp) {
        throw new ApiError(400, 'OTP is required to submit lead request');
      }
      const { verifyStoredOtp } = require('../../../auth/strategies/otp.strategy');
      const isValid = verifyStoredOtp(data.phone!, data.otp);
      if (!isValid) {
        throw new ApiError(400, 'Invalid or expired OTP code');
      }
    }
    // 1. Check/Auto-create Customer Account for Guest Leads
    const { UserModel } = require('../../../../modules/user/user.model');
    const { ROLES } = require('../../../../common/constants/roles.constant');

    let customerUser: any = null;

    if (data.phone && data.source !== 'WORKSHOP_PARTNER') {
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
            isPhoneVerified: true,
            isEmailVerified: false,
          });
        } else if (user.role === ROLES.CUSTOMER) {
          user.isPhoneVerified = true;
          if (data.name && (!user.fullName || user.fullName === 'Valued Customer')) {
            user.fullName = data.name;
          }
          if (data.email && !user.email) {
            user.email = data.email.trim().toLowerCase();
          }
          await user.save();
        }

        if (user) {
          data.customerId = user._id;
          if (user.role === ROLES.CUSTOMER) {
            customerUser = user;
          }
        }
      } catch (userErr) {
        console.error('[LeadService] Auto customer user creation warning:', userErr);
      }
    }

    // 1.5 Auto-create Garage Vehicle and Booking for Customer Dashboard synchronization
    if (customerUser && customerUser.role === ROLES.CUSTOMER && data.vehicleBrand && (data.source === 'WEBSITE_QUOTE' || data.source === 'QUICK_CALLBACK')) {
      try {
        const { GarageModel } = require('../garage/garage.model');
        const { BookingModel } = require('../booking/booking.model');
        const { ServiceModel } = require('../../../master-data/models/service.model');
        const { CityModel } = require('../../../master-data/models/city.model');
        const { BOOKING_STATUS } = require('../../../../common/constants/status.constant');

        const cleanBrand = data.vehicleBrand.trim();
        const cleanModel = (data.vehicleModel || 'Standard').trim();
        const cleanReg = ((data as any).vehicleNumber || `DL-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();
        const fuel = ((data as any).fuelType || 'PETROL').toUpperCase().trim();

        let vehicle = await GarageModel.findOne({
          customerId: customerUser._id,
          brand: new RegExp(`^${cleanBrand}$`, 'i'),
          model: new RegExp(`^${cleanModel}$`, 'i'),
          isActive: true
        });

        if (!vehicle) {
          vehicle = await GarageModel.create({
            customerId: customerUser._id,
            brand: cleanBrand,
            model: cleanModel,
            registrationNumber: cleanReg,
            fuelType: fuel,
            isActive: true,
          });
        }

        // Resolve service
        let serviceId: any = null;
        if ((data as any).services && Array.isArray((data as any).services) && (data as any).services.length > 0) {
          const firstServiceName = (data as any).services[0];
          const matchedService = await ServiceModel.findOne({
            name: new RegExp(`^${firstServiceName.trim()}$`, 'i'),
            isActive: true
          });
          if (matchedService) serviceId = matchedService._id;
        }
        if (!serviceId) {
          const defService = await ServiceModel.findOne({ isActive: true });
          if (defService) serviceId = defService._id;
        }

        // Resolve city
        let cityId: any = null;
        if (data.city) {
          const cityQuery = data.city.split(',')[0].trim();
          const matchedCity = await CityModel.findOne({
            name: new RegExp(cityQuery, 'i'),
            isActive: true
          });
          if (matchedCity) cityId = matchedCity._id;
        }
        if (!cityId) {
          const defCity = await CityModel.findOne({ isActive: true });
          if (defCity) cityId = defCity._id;
        }

        if (vehicle && serviceId && cityId) {
          const bookingDesc = data.message || `Website Quote for ${cleanBrand} ${cleanModel}`;

          // Check if an existing PENDING booking already exists for this customer & vehicle in the last 5 minutes
          let bookingDoc = await BookingModel.findOne({
            customerId: customerUser._id,
            vehicleId: vehicle._id,
            status: BOOKING_STATUS.PENDING,
            createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
          }).sort({ createdAt: -1 });

          if (bookingDoc) {
            // Update existing booking instead of creating a duplicate
            bookingDoc.serviceId = serviceId;
            bookingDoc.cityId = cityId;
            bookingDoc.description = bookingDesc;
            if (data.city) bookingDoc.address = data.city;
            await bookingDoc.save();
            data.bookingId = bookingDoc._id;
            console.log(`[LeadService] Reused existing pending booking ${bookingDoc._id} for customer ${customerUser._id}`);
          } else {
            bookingDoc = await BookingModel.create({
              customerId: customerUser._id,
              vehicleId: vehicle._id,
              serviceId: serviceId,
              cityId: cityId,
              description: bookingDesc,
              status: BOOKING_STATUS.PENDING,
              address: data.city || '',
            });
            data.bookingId = bookingDoc._id;

            try {
              const { emitToRole } = require('../../../../sockets');
              emitToRole('SUPER_ADMIN', 'new_booking', { bookingId: bookingDoc._id.toString() });
              emitToRole('EXECUTIVE', 'new_booking', { bookingId: bookingDoc._id.toString() });
            } catch (sockErr) {}
          }
        }
      } catch (syncErr) {
        console.warn('[LeadService] Vehicle / Booking sync warning:', syncErr);
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
      
      const payload = {
        leadId: lead._id.toString(),
        source: lead.source,
        name: lead.name || 'Customer',
        phone: lead.phone || '',
        city: lead.city || '',
        vehicleBrand: lead.vehicleBrand || '',
        vehicleModel: lead.vehicleModel || '',
        message: lead.message || 'New lead received',
      };
      emitToRole('SUPER_ADMIN', 'new_lead', payload);
      emitToRole('EXECUTIVE', 'new_lead', payload);

      const title = 'New Lead Received';
      const msg = `A new ${lead.source ? lead.source.replace(/_/g, ' ') : 'Lead'} submitted by ${lead.name || 'Customer'} (${lead.phone || ''}).`;

      await notificationService.sendToRole('SUPER_ADMIN', NOTIFICATION_TYPE.IN_APP, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
      await notificationService.sendToRole('EXECUTIVE', NOTIFICATION_TYPE.IN_APP, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
    } catch (err: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send lead creation notification:', err);
    }
    
    let tokens: any = null;
    let authUser: any = null;

    if (data.customerId) {
      try {
        const { UserModel } = require('../../../../modules/user/user.model');
        const { generateAccessToken, generateRefreshToken } = require('../../../auth/strategies/jwt.strategy');
        const userObj = await UserModel.findById(data.customerId);
        if (userObj) {
          userObj.isPhoneVerified = true;
          await userObj.save();
          const tokenPayload = {
            userId: userObj._id.toString(),
            role: userObj.role,
            email: userObj.email,
            phone: userObj.phone,
          };
          const accessToken = generateAccessToken(tokenPayload);
          const refreshToken = generateRefreshToken(tokenPayload);
          tokens = { accessToken, refreshToken };
          authUser = {
            _id: userObj._id.toString(),
            fullName: userObj.fullName,
            phone: userObj.phone,
            email: userObj.email,
            role: userObj.role
          };
        }
      } catch (tokErr) {}
    }

    return {
      ...(lead.toObject ? lead.toObject() : lead),
      lead,
      user: authUser,
      tokens
    } as any;
  }

  public static async getLeads(query: any): Promise<IPaginatedResult<ILead>> {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = {};
    if (query.customerId) {
      const { UserModel } = require('../../../../modules/user/user.model');
      const user = await UserModel.findById(query.customerId).catch(() => null);
      const userPhone = user?.phone ? user.phone.trim() : null;

      if (userPhone) {
        try {
          await LeadModel.updateMany({ customerId: { $exists: false }, phone: userPhone }, { customerId: query.customerId });
        } catch (err) {
          // silent sync
        }
        filter.$or = [{ customerId: query.customerId }, { phone: userPhone }];
      } else {
        filter.customerId = query.customerId;
      }
    }
    if (query.source && query.source !== 'all') filter.source = query.source;
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      const searchConditions = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { vehicleBrand: searchRegex },
        { vehicleModel: searchRegex }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
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
        await notificationService.sendToRole('EXECUTIVE', NOTIFICATION_TYPE.IN_APP, NOTIFICATION_CATEGORY.JOB_STATUS, execTitle, execMsg, { leadId: lead._id.toString() });
        await notificationService.sendToRole('SUPER_ADMIN', NOTIFICATION_TYPE.IN_APP, NOTIFICATION_CATEGORY.JOB_STATUS, execTitle, execMsg, { leadId: lead._id.toString() });
      } catch (waErr) {
        console.warn('[LeadService] WhatsApp lead status alert warning:', waErr);
      }
    }

    return lead;
  }
}
