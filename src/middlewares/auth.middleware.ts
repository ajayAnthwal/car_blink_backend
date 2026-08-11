import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/strategies/jwt.strategy';
import { UnauthorizedError } from '../common/errors/UnauthorizedError';
import { IRequest } from '../common/interfaces/IRequest';
import { TokenBlacklistModel } from '../modules/auth/token-blacklist.model';

export const authMiddleware = async (req: IRequest, res: Response, next: NextFunction): Promise<void> => {
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
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
