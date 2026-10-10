import { ROLES } from '../../common/constants/roles.constant';

/**
 * Roles authorized to perform final partner approval, suspension, and reactivation.
 * Super Admin and Admin have final decision authority.
 */
export const PARTNER_FINAL_APPROVAL_ROLES: string[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
];

/**
 * Roles authorized to view the partner verification review screen.
 * Field Executive conducts review inspections and recommends approval/clarifications.
 */
export const PARTNER_REVIEW_ROLES: string[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.EXECUTIVE,
];

/**
 * Checks if the given role is authorized to perform final approval or suspension actions.
 */
export function canPerformFinalApproval(role?: string): boolean {
  if (!role) return false;
  return PARTNER_FINAL_APPROVAL_ROLES.includes(role);
}

/**
 * Checks if the given role is authorized to access the partner verification screen.
 */
export function canReviewPartner(role?: string): boolean {
  if (!role) return false;
  return PARTNER_REVIEW_ROLES.includes(role);
}
