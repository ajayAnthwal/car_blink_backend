import mongoose from 'mongoose';
import { PartnerModel } from '../../../partner/partner.model';
import { KycDocumentModel } from '../../../partner/sub-modules/kyc/kyc.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { emitToUser, emitToRole } from '../../../../sockets';
import { notificationService } from '../../../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../../../notification/notification.model';

export class SuperAdminPartnersService {
  /**
   * Get all partners (garages)
   */
  async getAllPartners(query: any) {
    const { page = 1, limit = 10, verificationStatus, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};

    if (verificationStatus) {
      filter.verificationStatus = verificationStatus;
    }

    if (search) {
      filter.businessName = { $regex: search, $options: 'i' };
    }

    const partners = await PartnerModel.find(filter)
      .populate('userId', 'fullName email phone')
      .populate('cityId', 'name state')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await PartnerModel.countDocuments(filter);

    return {
      docs: partners,
      totalDocs: total,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: skip + partners.length < total,
      hasPrevPage: Number(page) > 1,
    };
  }

  /**
   * Get specific partner details including KYC documents
   */
  async getPartnerDetails(partnerId: string): Promise<any> {
    const partner = await PartnerModel.findById(partnerId)
      .populate('userId', 'fullName email phone')
      .populate('cityId', 'name state')
      .populate('servicesOffered', 'name category')
      .lean();

    if (!partner) {
      throw new NotFoundError('Partner not found');
    }

    // Fetch KYC documents
    const kycDocuments = await KycDocumentModel.find({ partnerId }).lean();

    return {
      ...partner,
      kycDocuments
    };
  }

  /**
   * Approve or reject partner KYC
   */
  async updateKycStatus(partnerId: string, status: 'APPROVED' | 'REJECTED', reason?: string, adminUserId?: string) {
    const partner = await PartnerModel.findById(partnerId);
    if (!partner) {
      throw new NotFoundError('Partner not found');
    }

    partner.verificationStatus = status;
    if (status === 'APPROVED') {
      partner.isVerified = true;
      partner.rejectionReason = undefined;
      if (adminUserId && mongoose.Types.ObjectId.isValid(adminUserId)) {
        partner.adminApprovedBy = new mongoose.Types.ObjectId(adminUserId);
      }
      partner.adminApprovedAt = new Date();
    } else if (status === 'REJECTED') {
      partner.isVerified = false;
      partner.rejectionReason = reason;
    }

    await partner.save();

    // Update the status of the documents as well
    if (status === 'APPROVED' || status === 'REJECTED') {
      await KycDocumentModel.updateMany(
        { partnerId },
        { $set: { status } }
      );
    }

    // Dispatch In-App Notifications
    try {
      if (status === 'APPROVED') {
        // 1. Notify the Partner
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.SYSTEM,
          '🎉 Partner Account Approved & Verified!',
          `Congratulations! Super Admin has approved your partner workshop account for "${partner.businessName}". Your console is now unlocked to accept leads, submit quotes, and manage repair jobs.`,
          { partnerId: partner._id.toString(), status: 'APPROVED', isVerified: true }
        );

        // 2. Notify Executives
        await notificationService.sendToRole(
          'EXECUTIVE',
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.SYSTEM,
          'Partner Account Activated by Super Admin',
          `Partner "${partner.businessName}" has received final clearance and activation from Super Admin.`,
          { partnerId: partner._id.toString() }
        );
      } else {
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.SYSTEM,
          'Partner Application Status: Rejected',
          `Your partner account application was rejected by Super Admin. Reason: "${reason || 'Documentation mismatch'}".`,
          { partnerId: partner._id.toString(), status: 'REJECTED', reason }
        );
      }
    } catch (notifErr) {
      console.error('[SuperAdminPartnersService] Error dispatching notifications:', notifErr);
    }

    // Emit Real-Time Sockets for Live Unlock and Status Sync
    try {
      const payload = {
        partnerId: partner._id,
        userId: partner.userId,
        status,
        isVerified: status === 'APPROVED',
        executiveVerificationStatus: partner.executiveVerificationStatus || 'APPROVED',
        reason,
        message: status === 'APPROVED'
          ? '🎉 Your Partner account is fully approved! Dashboard is now unlocked.'
          : `Your partner account has been ${status.toLowerCase()}.`
      };

      emitToUser(partner.userId.toString(), 'partner_verified', payload);
      emitToUser(partner.userId.toString(), 'partner_status_updated', payload);
      emitToUser(partner.userId.toString(), 'kyc_status_changed', payload);
      emitToRole('SUPER_ADMIN', 'partner_status_updated', payload);
      emitToRole('EXECUTIVE', 'partner_status_updated', payload);
    } catch (socketErr) {
      console.error('[SuperAdminPartnersService] Error emitting sockets:', socketErr);
    }

    return partner;
  }
}

export const superAdminPartnersService = new SuperAdminPartnersService();
