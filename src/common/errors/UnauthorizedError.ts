import { ApiError } from './ApiError';

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized access', errorCode: string = 'UNAUTHORIZED') {
    super(401, message, errorCode);
  }
}
