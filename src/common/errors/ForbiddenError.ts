import { ApiError } from './ApiError';

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden access', errorCode: string = 'FORBIDDEN') {
    super(403, message, errorCode);
  }
}
