import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/strategies/jwt.strategy';
import { UnauthorizedError } from '../common/errors/UnauthorizedError';
import { IRequest } from '../common/interfaces/IRequest';
import { TokenBlacklistModel } from '../modules/auth/token-blacklist.model';

export const authMiddleware = async (req: IRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // 1. Prioritize explicit Authorization: Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const parts = authHeader.split(' ');
    if (parts[1] && parts[1] !== 'null' && parts[1] !== 'undefined') {
      token = parts[1];
    }
  }

  // 2. Fallback to cookies
  if (!token) {
    token = req.cookies?.accessToken || req.cookies?.car_blink_access_token;
  }

  if (!token) {
    return next(new UnauthorizedError('Access token is missing or invalid'));
  }

  try {
    const isBlacklisted = await TokenBlacklistModel.findOne({ token });
    if (isBlacklisted) {
      return next(new UnauthorizedError('Access token has been revoked'));
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
