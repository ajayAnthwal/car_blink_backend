import rateLimit from 'express-rate-limit';
import { ApiError } from '../common/errors/ApiError';
import { ERROR_CODES } from '../common/constants/error-codes.constant';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: new ApiError(
    429,
    'Too many requests from this IP, please try again after 15 minutes',
    ERROR_CODES.BAD_REQUEST
  ),
  handler: (req, res, next, options) => {
    next(options.message);
  },
});
