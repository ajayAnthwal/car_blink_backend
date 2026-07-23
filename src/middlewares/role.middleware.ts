import { Response, NextFunction } from 'express';
import { ApiError } from '../common/errors/ApiError';
import { UnauthorizedError } from '../common/errors/UnauthorizedError';
import { IRequest } from '../common/interfaces/IRequest';
import { ROLES } from '../common/constants/roles.constant';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import CustomRole from '../modules/super-admin/sub-modules/roles/role.model';
import { UserModel } from '../modules/user/user.model';

export const roleMiddleware = (allowedRoles: ROLES[], requiredPermission?: string) => {
  return async (req: IRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Allow if user is in allowed basic roles, BUT we must also check permissions if required
      let hasRoleAccess = allowedRoles.includes(req.user.role);
      
      if (!hasRoleAccess) {
        throw new ApiError(403, 'You do not have permission to access this resource', ERROR_CODES.FORBIDDEN);
      }

      // If a specific permission is required, check custom role
      if (requiredPermission) {
        const user = await UserModel.findById(req.user.userId).populate('customRoleId');
        if (!user) throw new UnauthorizedError('User not found');
        
        // If user is a super admin, they have all permissions bypass
        if (req.user.role !== ROLES.SUPER_ADMIN) {
          if (!user.customRoleId) {
             throw new ApiError(403, `Permission denied. Missing required permission: ${requiredPermission}`, ERROR_CODES.FORBIDDEN);
          }
          const customRole: any = user.customRoleId;
          if (!customRole.isActive || !customRole.permissions.includes(requiredPermission)) {
            throw new ApiError(403, `Permission denied. Missing required permission: ${requiredPermission}`, ERROR_CODES.FORBIDDEN);
          }
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
