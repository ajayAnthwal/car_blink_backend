import { ApiError } from './ApiError';

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict occurred', errorCode: string = 'CONFLICT') {
    super(409, message, errorCode);
  }
}
