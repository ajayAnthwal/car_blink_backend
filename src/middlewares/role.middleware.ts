import { Response, NextFunction } from 'express';
import { ApiError } from '../common/errors/ApiError';
import { UnauthorizedError } from '../common/errors/UnauthorizedError';
import { IRequest } from '../common/interfaces/IRequest';
import { ROLES } from '../common/constants/roles.constant';
import { ERROR_CODES } from '../common/constants/error-codes.constant';

export const roleMiddleware = (allowedRoles: ROLES[]) => {
  return (req: IRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to access this resource', ERROR_CODES.FORBIDDEN);
    }

    next();
  };
};
