import { UserModel } from '../user/user.model';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { BadRequestError } from '../../common/errors/BadRequestError';
import AuditLog from '../super-admin/sub-modules/audit-logs/audit-log.model';

export const CURRENT_TERMS_VERSION = '2026-11-v1';

export class CustomerService {
  /**
   * Record Customer Terms & Conditions acceptance.
   * Idempotent: If already accepted for this version, retains the original timestamp.
   */
  public static async acceptTerms(
    userId: string,
    version: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    isTermsAccepted: boolean;
    termsAcceptedAt: Date;
    termsVersion: string;
    alreadyAccepted?: boolean;
  }> {
    if (!version || typeof version !== 'string' || version.trim() !== CURRENT_TERMS_VERSION) {
      throw new BadRequestError(`Invalid terms version. Expected '${CURRENT_TERMS_VERSION}'.`);
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('Customer account not found.');
    }

    // Idempotent: If already accepted, preserve the first acceptedAt timestamp
    if (user.termsAcceptedAt && user.termsVersion === version.trim()) {
      return {
        isTermsAccepted: true,
        termsAcceptedAt: user.termsAcceptedAt,
        termsVersion: user.termsVersion,
        alreadyAccepted: true,
      };
    }

    const acceptedAt = new Date();
    user.termsAcceptedAt = acceptedAt;
    user.termsVersion = version.trim();
    if (ipAddress) user.termsAcceptedIp = ipAddress;
    if (userAgent) user.termsAcceptedUserAgent = userAgent;

    await user.save();

    // Audit log recording
    try {
      await AuditLog.create({
        userId: user._id,
        userRole: user.role,
        action: 'CUSTOMER_TERMS_ACCEPTED',
        endpoint: '/api/customer/terms/accept',
        method: 'POST',
        payload: { version: version.trim() },
        ipAddress: ipAddress || 'Unknown',
        status: 'SUCCESS',
      });
    } catch (auditErr) {
      console.warn('Failed to record terms acceptance in audit log:', auditErr);
    }

    return {
      isTermsAccepted: true,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      alreadyAccepted: false,
    };
  }
}

export default CustomerService;
