import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../common/errors/ApiError';
import { errorResponse } from '../common/utils/apiResponse.util';
import { logger } from '../config/logger.config';
import { env } from '../config/env.config';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred. Please try again.';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
  } else if (err && typeof err === 'object') {
    // 1. Handle MongoDB Duplicate Key Error (E11000)
    if (err.code === 11000 || (err.message && String(err.message).includes('E11000'))) {
      statusCode = 400;
      errorCode = 'DUPLICATE_KEY_ERROR';
      const errStr = String(err.message || JSON.stringify(err));

      if (err.keyPattern?.email || errStr.includes('email')) {
        message = 'This email address is already registered. Please sign in or use a different email.';
      } else if (err.keyPattern?.phone || errStr.includes('phone')) {
        message = 'This phone number is already registered. Please sign in or use a different phone number.';
      } else {
        message = 'An account with these details already exists. Please sign in or check your input.';
      }
    }
    // 2. Handle Mongoose Validation Errors
    else if (err.name === 'ValidationError') {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      const messages = Object.values(err.errors || {}).map((e: any) => e.message);
      message = messages.length > 0 ? messages.join('. ') : 'Invalid input details provided.';
    }
    // 3. Handle JWT Errors
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      statusCode = 401;
      errorCode = 'UNAUTHORIZED';
      message = 'Your session has expired. Please log in again.';
    }
    // 4. Standard Error
    else if (err.message) {
      const errStr = String(err.message);
      if (errStr.includes('E11000') || errStr.includes('duplicate key') || errStr.includes('Cast to ObjectId')) {
        statusCode = 400;
        message = 'Invalid or duplicate account details provided. Please check your inputs.';
      } else {
        message = errStr;
      }
    }
  }

  // Log the detailed error
  logger.error(
    `[${req.method}] ${req.path} - Error: ${message} (Original: ${err.message || err}, Code: ${errorCode}, Status: ${statusCode})`
  );
  if (err.stack && env.NODE_ENV !== 'production') {
    logger.error(err.stack);
  }

  return errorResponse(res, message, errorCode, statusCode);
};
