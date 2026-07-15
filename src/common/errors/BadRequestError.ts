import { ApiError } from './ApiError';

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', errorCode: string = 'BAD_REQUEST') {
    super(400, message, errorCode);
  }
}
