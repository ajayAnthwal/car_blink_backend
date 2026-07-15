import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/strategies/jwt.strategy';
import { UnauthorizedError } from '../common/errors/UnauthorizedError';
import { IRequest } from '../common/interfaces/IRequest';

export const authMiddleware = (req: IRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access token is missing or invalid');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};
