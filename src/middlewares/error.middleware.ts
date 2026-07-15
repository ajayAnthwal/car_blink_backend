import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../common/errors/ApiError';
import { errorResponse } from '../common/utils/apiResponse.util';
import { logger } from '../config/logger.config';
import { env } from '../config/env.config';

export const errorMiddleware = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  // Log the error
  logger.error(
    `[${req.method}] ${req.path} - Error: ${message} (Code: ${errorCode}, Status: ${statusCode})`
  );
  if (err.stack && env.NODE_ENV !== 'production') {
    logger.error(err.stack);
  }

  return errorResponse(res, message, errorCode, statusCode);
};
