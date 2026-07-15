import { ApiError } from './ApiError';

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', errorCode: string = 'NOT_FOUND') {
    super(404, message, errorCode);
  }
}
