import mongoose from 'mongoose';
import { PartnerModel, IPartner } from './partner.model';
import { PartnerVerificationLogModel } from './partner-verification-log.model';
import { BookingModel } from '../customer/sub-modules/booking/booking.model';
import { JobModel } from './sub-modules/jobs/job.model';
import { getNextSequence } from '../../common/models/counter.model';
import { canPerformFinalApproval } from './partner.constants';
import { BOOKING_STATUS } from '../../common/constants/status.constant';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { BadRequestError } from '../../common/errors/BadRequestError';
import { UnauthorizedError } from '../../common/errors/UnauthorizedError';
import { emitToRole, emitToUser } from '../../sockets';

export interface VerificationChecklistEvaluation {
  isComplete: boolean;
  missingItems: string[];
  checklist: {
    panVerified: boolean;
    businessProofProvided: boolean;
    ownerDetailsProvided: boolean;
    representativeAuthorized: boolean;
    exteriorPhotoUploaded: boolean;
    interiorPhotoUploaded: boolean;
    signboardPhotoUploaded: boolean;
    addressProofUploaded: boolean;
    locationPinSet: boolean;
    bankDetailsComplete: boolean;
    bankProofUploaded: boolean;
    capabilitiesConfigured: boolean;
  };
}

export class PartnerReviewService {
  /**
   * Evaluates all mandatory checks required for final partner approval.
   */
  public static evaluateMandatoryChecks(partner: any): VerificationChecklistEvaluation {
    const missingItems: string[] = [];

    // 1. KYC & Business
    const panVerified = Boolean(partner.pan && partner.pan.trim().length === 10);
    if (!panVerified) missingItems.push('Valid 10-character PAN number');

    const businessProofProvided = partner.isGstRegistered
      ? Boolean(partner.gstin && partner.gstin.trim().length === 15)
      : Boolean(partner.proofRef && partner.proofRef.trim());
    if (!businessProofProvided) {
      missingItems.push(
        partner.isGstRegistered
          ? 'Valid 15-character GSTIN'
          : 'Alternate Business Registration Proof Document'
      );
    }

    const ownerDetailsProvided = Boolean(partner.ownerName || partner.userId?.fullName);
    if (!ownerDetailsProvided) missingItems.push('Workshop Owner Name');

    const representativeAuthorized =
      !partner.isRepresentative || Boolean(partner.authorizationDocRef && partner.authorizationDocRef.trim());
    if (!representativeAuthorized) missingItems.push('Representative Authorization Letter Document');

    // 2. Workshop Physical Proof
    const exteriorPhotoUploaded = Boolean(partner.exteriorPhotoRef && partner.exteriorPhotoRef.trim());
    if (!exteriorPhotoUploaded) missingItems.push('Workshop Exterior Photo (Signage Visible)');

    const interiorPhotoUploaded = Boolean(partner.interiorPhotoRef && partner.interiorPhotoRef.trim());
    if (!interiorPhotoUploaded) missingItems.push('Workshop Interior / Service-Area Photo');

    const signboardPhotoUploaded = Boolean(partner.signboardPhotoRef && partner.signboardPhotoRef.trim());
    if (!signboardPhotoUploaded) missingItems.push('Workshop Signboard / Name Photo');

    const addressProofUploaded = Boolean(partner.addressProofRef && partner.addressProofRef.trim());
    if (!addressProofUploaded) missingItems.push('Workshop Address Proof Document (Rent/Lease/Tax Bill)');

    const coordinates = partner.location?.coordinates;
    const locationPinSet = Boolean(
      coordinates &&
        Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        (coordinates[0] !== 0 || coordinates[1] !== 0)
    );
    if (!locationPinSet) missingItems.push('Exact Google Maps Geolocation Pin');

    // 3. Bank & Settlement
    const hasAccountHolder = Boolean(partner.accountHolderName || partner.bankDetails?.accountHolderName);
    const hasBankName = Boolean(partner.bankName);
    const hasAccountNumber = Boolean(partner.accountNumber || partner.bankDetails?.accountNumber);
    const hasIfsc = Boolean(partner.ifsc || partner.bankDetails?.ifscCode);
    const bankDetailsComplete = hasAccountHolder && hasBankName && hasAccountNumber && hasIfsc;
    if (!bankDetailsComplete) missingItems.push('Complete Bank Account Details (Holder, Bank, Account No, IFSC)');

    const bankProofUploaded = Boolean(partner.bankProofRef && partner.bankProofRef.trim());
    if (!bankProofUploaded) missingItems.push('Bank Proof / Cancelled Cheque Upload');

    // 4. Workshop Capabilities
    const hasServices = Boolean(partner.services && Array.isArray(partner.services) && partner.services.length > 0);
    const hasBays = Boolean(partner.serviceBays && Number(partner.serviceBays) >= 1);
    const hasTechs = Boolean(partner.technicianCount && Number(partner.technicianCount) >= 1);
    const capabilitiesConfigured = hasServices && hasBays && hasTechs;
    if (!capabilitiesConfigured) {
      missingItems.push('Workshop Capabilities (At least 1 Service, ≥1 Bay, ≥1 Technician)');
    }

    return {
      isComplete: missingItems.length === 0,
      missingItems,
      checklist: {
        panVerified,
        businessProofProvided,
        ownerDetailsProvided,
        representativeAuthorized,
        exteriorPhotoUploaded,
        interiorPhotoUploaded,
        signboardPhotoUploaded,
        addressProofUploaded,
        locationPinSet,
        bankDetailsComplete,
        bankProofUploaded,
        capabilitiesConfigured,
      },
    };
  }

  /**
   * Retrieves complete partner details, comparison proofs, masked bank info, checklist, and audit logs.
   */
  public static async getPartnerReviewDetails(partnerId: string): Promise<any> {
    const partner = await PartnerModel.findById(partnerId)
      .populate('userId', 'fullName email phone isPhoneVerified isEmailVerified')
      .populate('cityId', 'name state')
      .populate('executiveVerifiedBy', 'fullName email role')
      .populate('adminApprovedBy', 'fullName email role')
      .populate('duplicateFlags.matchedPartnerId', 'uniquePartnerId businessName workshopName verificationStatus isActive')
      .lean();

    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    // Full Verification & Rejection History
    const auditLogs = await PartnerVerificationLogModel.find({ partnerId: partner._id })
      .populate('verifierId', 'fullName email role')
      .sort({ timestamp: -1 })
      .lean();

    // Mandatory Checklist Evaluation
    const evaluation = PartnerReviewService.evaluateMandatoryChecks(partner);

    // Mask sensitive bank account number for review UI display
    const rawAcc = partner.accountNumber || partner.bankDetails?.accountNumber || '';
    const maskedAccountNumber =
      rawAcc.length >= 4 ? `•••• •••• ${rawAcc.slice(-4)}` : rawAcc ? '••••' : 'Not Provided';

    return {
      partner,
      maskedAccountNumber,
      evaluation,
      auditLogs,
    };
  }

  /**
   * Executes a review decision (Approve, Reject, Request Documents, Mark Manual Verification, Suspend, Reactivate)
   * with strict permissions checking, validation, and immutable audit logging.
   */
  public static async submitReviewAction(
    partnerId: string,
    actionData: {
      action:
        | 'APPROVE'
        | 'REJECT'
        | 'REQUEST_DOCUMENTS'
        | 'MARK_MANUAL_VERIFICATION'
        | 'SUSPEND'
        | 'REACTIVATE'
        | 'EXECUTIVE_RECOMMEND';
      notes?: string;
    },
    verifier: { userId: string; role: string; fullName?: string }
  ): Promise<any> {
    const partner = await PartnerModel.findById(partnerId);
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const { action, notes = '' } = actionData;
    const prevStatus = partner.verificationStatus || 'NONE';

    // 0. State Snapshot for compensation if log creation fails
    const partnerSnapshot = {
      verificationStatus: partner.verificationStatus,
      isVerified: partner.isVerified,
      isActive: partner.isActive,
      reVerificationRequired: partner.reVerificationRequired,
      reVerificationDetails: partner.reVerificationDetails,
      adminApprovedBy: partner.adminApprovedBy,
      adminApprovedAt: partner.adminApprovedAt,
      rejectionReason: partner.rejectionReason,
      executiveVerificationStatus: partner.executiveVerificationStatus,
      executiveVerifiedBy: partner.executiveVerifiedBy,
      executiveVerifiedAt: partner.executiveVerifiedAt,
      uniquePartnerId: partner.uniquePartnerId,
    };

    // 1. Role Authority Check
    const isFinalApprovalAction = ['APPROVE', 'SUSPEND', 'REACTIVATE'].includes(action);
    if (isFinalApprovalAction && !canPerformFinalApproval(verifier.role)) {
      throw new UnauthorizedError(
        'Unauthorized. Only Super Admin or Admin roles can finalize partner approval, suspension, or reactivation.'
      );
    }

    let targetStatus = partner.verificationStatus;
    let logAction: any = 'STATUS_CHANGED';
    let logNotes = notes.trim();

    // 2. Action Handlers
    switch (action) {
      case 'APPROVE': {
        // Enforce all mandatory checks before approval is permitted
        const evaluation = PartnerReviewService.evaluateMandatoryChecks(partner);
        if (!evaluation.isComplete) {
          throw new BadRequestError(
            `Approval blocked. The following mandatory requirements are missing:\n- ${evaluation.missingItems.join(
              '\n- '
            )}`
          );
        }

        // Auto-generate sequential, race-condition safe uniquePartnerId if not already assigned (Idempotent)
        if (!partner.uniquePartnerId || partner.uniquePartnerId.trim() === '') {
          const seq = await getNextSequence('partner_id');
          partner.uniquePartnerId = `CB-P-${String(seq).padStart(6, '0')}`;
        }

        const wasReVerification = partner.reVerificationRequired;
        targetStatus = 'APPROVED_VERIFIED';
        partner.verificationStatus = 'APPROVED_VERIFIED';
        partner.isVerified = true;
        partner.isActive = true;
        partner.reVerificationRequired = false;
        partner.reVerificationDetails = undefined;
        partner.adminApprovedBy = new mongoose.Types.ObjectId(verifier.userId);
        partner.adminApprovedAt = new Date();
        partner.rejectionReason = undefined;

        // Promote verified bank details to active payout destination and mark VERIFIED
        if (partner.accountNumber && partner.ifsc) {
          partner.bankVerificationStatus = 'VERIFIED';
          partner.bankDetails = {
            accountNumber: partner.accountNumber,
            ifscCode: partner.ifsc,
            accountHolderName: partner.accountHolderName || partner.workshopName || partner.businessName || 'CarBlink Partner',
          };
        } else if (partner.bankDetails?.accountNumber) {
          partner.bankVerificationStatus = 'VERIFIED';
        }

        logAction = 'ADMIN_APPROVED';
        logNotes =
          logNotes ||
          (wasReVerification
            ? `Partner re-verification approved. Updated critical fields confirmed. Partner ID: ${partner.uniquePartnerId}`
            : `Partner verified and approved. Partner ID: ${partner.uniquePartnerId}`);
        break;
      }

      case 'REJECT': {
        if (!logNotes) {
          throw new BadRequestError('Notes/Reason is mandatory when rejecting a partner application.');
        }

        targetStatus = 'REJECTED';
        partner.verificationStatus = 'REJECTED';
        partner.isVerified = false;
        partner.rejectionReason = logNotes;

        logAction = 'ADMIN_REJECTED';
        break;
      }

      case 'REQUEST_DOCUMENTS': {
        if (!logNotes) {
          throw new BadRequestError(
            'Notes are mandatory when requesting additional documents or clarification from the partner.'
          );
        }

        targetStatus = 'DOCUMENTS_PENDING';
        partner.verificationStatus = 'DOCUMENTS_PENDING';
        partner.rejectionReason = logNotes;

        logAction = 'DOCUMENTS_REQUESTED';
        break;
      }

      case 'MARK_MANUAL_VERIFICATION': {
        targetStatus = 'MANUAL_VERIFICATION_REQUIRED';
        partner.verificationStatus = 'MANUAL_VERIFICATION_REQUIRED';
        if (logNotes) partner.rejectionReason = logNotes;

        logAction = 'MANUAL_REVIEW_REQUESTED';
        logNotes = logNotes || 'Marked for manual administrative verification.';
        break;
      }

      case 'SUSPEND': {
        if (!logNotes) {
          throw new BadRequestError('Notes/Reason is mandatory when suspending a partner.');
        }

        targetStatus = 'SUSPENDED';
        partner.verificationStatus = 'SUSPENDED';
        partner.isActive = false;
        partner.rejectionReason = logNotes;

        // Auto-flag existing active bookings and jobs for Admin workflow
        await Promise.all([
          BookingModel.updateMany(
            {
              assignedPartnerId: partner._id,
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
                remarks: `Auto-flagged for Admin workflow: Partner ${partner.businessName || partner._id} suspended. Reason: ${logNotes}`,
              },
            }
          ),
          JobModel.updateMany(
            {
              partnerId: partner._id,
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

        logAction = 'SUSPENDED';
        break;
      }

      case 'REACTIVATE': {
        targetStatus = 'APPROVED_VERIFIED';
        partner.verificationStatus = 'APPROVED_VERIFIED';
        partner.isActive = true;
        partner.isVerified = true;
        partner.rejectionReason = undefined;

        logAction = 'STATUS_CHANGED';
        logNotes = logNotes || 'Partner reactivated by administrator.';
        break;
      }

      case 'EXECUTIVE_RECOMMEND': {
        partner.executiveVerificationStatus = 'APPROVED';
        partner.executiveVerifiedBy = new mongoose.Types.ObjectId(verifier.userId);
        partner.executiveVerifiedAt = new Date();

        logAction = 'EXECUTIVE_VERIFIED';
        logNotes =
          logNotes || 'Field Executive verified workshop on-site and recommended for Super Admin authorization.';
        break;
      }

      default:
        throw new BadRequestError(`Invalid verification review action: ${action}`);
    }

    // 3. Atomically persist state change + audit log
    // Multi-document transaction if replica set supported, else compensated write to prevent half-done state.
    let logEntry: any;
    let session: mongoose.ClientSession | null = null;
    let transactionCommitted = false;

    // Check if MongoDB connection topology supports replica sets / transactions
    const topologyType = ((mongoose.connection as any)?.client as any)?.topology?.description?.type;
    const supportsTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        await partner.save({ session });
        const [createdLog] = await PartnerVerificationLogModel.create(
          [
            {
              partnerId: partner._id,
              action: logAction,
              fromStatus: prevStatus,
              toStatus: targetStatus,
              verifierId: new mongoose.Types.ObjectId(verifier.userId),
              notes: logNotes,
              timestamp: new Date(),
              metadata: {
                action,
                uniquePartnerId: partner.uniquePartnerId,
                verifierRole: verifier.role,
              },
            },
          ],
          { session }
        );
        logEntry = createdLog;
        await session.commitTransaction();
        transactionCommitted = true;
      } catch (txnError: any) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch {}
        }
        throw txnError;
      } finally {
        if (session) session.endSession();
      }
    }

    if (!transactionCommitted) {
      // Standalone mode: compensated write to prevent half-done state
      try {
        await partner.save();
        logEntry = await PartnerVerificationLogModel.create({
          partnerId: partner._id,
          action: logAction,
          fromStatus: prevStatus,
          toStatus: targetStatus,
          verifierId: new mongoose.Types.ObjectId(verifier.userId),
          notes: logNotes,
          timestamp: new Date(),
          metadata: {
            action,
            uniquePartnerId: partner.uniquePartnerId,
            verifierRole: verifier.role,
          },
        });
      } catch (saveError) {
        // Rollback partner to prior snapshot so state does not remain half-done
        try {
          await PartnerModel.updateOne({ _id: partner._id }, { $set: partnerSnapshot });
        } catch {}
        throw saveError;
      }
    }

    // 4. Real-time Socket & Event Notifications
    try {
      emitToUser(partner.userId.toString(), 'partner_status_updated', {
        partnerId: partner._id,
        status: targetStatus,
        uniquePartnerId: partner.uniquePartnerId,
        rejectionReason: partner.rejectionReason,
        action,
      });
      emitToRole('SUPER_ADMIN', 'partner_status_updated', {
        partnerId: partner._id,
        status: targetStatus,
        action,
      });
      emitToRole('EXECUTIVE', 'partner_status_updated', {
        partnerId: partner._id,
        status: targetStatus,
        action,
      });
    } catch (e) {
      // Ignore socket dispatch failure
    }

    return {
      partner,
      logEntry,
      message: `Partner action "${action}" completed successfully.`,
    };
  }
}
