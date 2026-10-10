import { Response, NextFunction } from 'express';
import { IRequest } from '../../../common/interfaces/IRequest';
import { PartnerModel } from '../partner.model';
import { BookingModel } from '../../customer/sub-modules/booking/booking.model';
import { JobModel } from '../sub-modules/jobs/job.model';
import { BOOKING_STATUS } from '../../../common/constants/status.constant';
import { NotFoundError } from '../../../common/errors/NotFoundError';

/**
 * Flags active bookings and jobs associated with a suspended partner for the Admin workflow.
 */
async function flagSuspendedPartnerBookings(partnerId: any): Promise<void> {
  try {
    await Promise.all([
      BookingModel.updateMany(
        {
          assignedPartnerId: partnerId,
          status: {
            $in: [
              BOOKING_STATUS.PENDING,
              BOOKING_STATUS.QUOTED,
              BOOKING_STATUS.ACCEPTED,
              BOOKING_STATUS.CUSTOMER_ACCEPTED,
              BOOKING_STATUS.VERIFIED,
              BOOKING_STATUS.IN_PROGRESS,
            ],
          },
          suspendedPartnerFlag: { $ne: true },
        },
        {
          $set: {
            suspendedPartnerFlag: true,
            partnerSuspendedAt: new Date(),
            adminWorkflowFlag: 'PARTNER_SUSPENDED',
          },
        }
      ),
      JobModel.updateMany(
        {
          partnerId,
          status: { $in: ['NOT_STARTED', 'VERIFIED', 'IN_PROGRESS'] },
          suspendedPartnerFlag: { $ne: true },
        },
        {
          $set: {
            suspendedPartnerFlag: true,
            partnerSuspendedAt: new Date(),
            adminWorkflowFlag: 'PARTNER_SUSPENDED',
          },
        }
      ),
    ]);
  } catch (err) {
    console.error('[PartnerAccessMiddleware] Error flagging bookings on suspension:', err);
  }
}

/**
 * Middleware: requireApprovedPartner
 * Blocks partner dashboard, leads, quotes, customer booking info, and operational endpoints
 * before APPROVED_VERIFIED (or legacy APPROVED + isVerified) and active status.
 *
 * If the partner was suspended while logged in, immediately blocks access on the next request,
 * marks active bookings for the Admin workflow, and stops further operational actions.
 */
export const requireApprovedPartner = async (
  req: IRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized. Authentication token is required.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const partner = await PartnerModel.findOne({ userId });
  if (!partner) {
    return next(new NotFoundError('Partner profile not found'));
  }

  // 1. Suspension / Inactivity Enforcement
  if (partner.verificationStatus === 'SUSPENDED' || partner.isActive === false) {
    await flagSuspendedPartnerBookings(partner._id);

    res.status(403).json({
      success: false,
      message: partner.rejectionReason
        ? `Partner account is suspended: ${partner.rejectionReason}`
        : 'Partner account is suspended. Access blocked immediately.',
      code: 'PARTNER_SUSPENDED',
      verificationStatus: 'SUSPENDED',
      reason: partner.rejectionReason || 'Account suspended by Administrator',
    });
    return;
  }

  // 2. Full Approval Gate (APPROVED_VERIFIED or legacy APPROVED with isVerified)
  const isApproved =
    Boolean(partner.isActive) &&
    (partner.verificationStatus === 'APPROVED_VERIFIED' ||
      (partner.verificationStatus === 'APPROVED' && partner.isVerified));

  if (!isApproved) {
    let message = 'Access denied. Account verification is pending approval.';
    if (partner.verificationStatus === 'REJECTED') {
      message = `Application Rejected: ${partner.rejectionReason || 'Verification requirements were not met.'}`;
    } else if (partner.verificationStatus === 'MANUAL_VERIFICATION_REQUIRED') {
      message = 'Manual Verification Required. Awaiting administrative review.';
    }

    res.status(403).json({
      success: false,
      message,
      code: `PARTNER_${partner.verificationStatus || 'UNAPPROVED'}`,
      verificationStatus: partner.verificationStatus || 'PENDING',
      reason: partner.rejectionReason,
    });
    return;
  }

  (req as any).partner = partner;
  next();
};

/**
 * Middleware: checkPartnerSuspension
 * Used for onboarding/KYC routes to block actions if the partner is suspended.
 */
export const checkPartnerSuspension = async (
  req: IRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) return next();

  const partner = await PartnerModel.findOne({ userId });
  if (!partner) return next();

  if (partner.verificationStatus === 'SUSPENDED' || partner.isActive === false) {
    await flagSuspendedPartnerBookings(partner._id);

    res.status(403).json({
      success: false,
      message: partner.rejectionReason
        ? `Partner account is suspended: ${partner.rejectionReason}`
        : 'Partner account is suspended. Access blocked immediately.',
      code: 'PARTNER_SUSPENDED',
      verificationStatus: 'SUSPENDED',
      reason: partner.rejectionReason || 'Account suspended by Administrator',
    });
    return;
  }

  (req as any).partner = partner;
  next();
};
