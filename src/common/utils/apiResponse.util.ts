import { Response } from 'express';

export interface ISuccessResponse<T> {
  success: true;
  message: string;
  data?: T;
}

export interface IErrorResponse {
  success: false;
  message: string;
  errorCode: string;
}

export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  const responseBody: ISuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(responseBody);
};

export const errorResponse = (
  res: Response,
  message: string = 'Error occurred',
  errorCode: string = 'INTERNAL_ERROR',
  statusCode: number = 500
): Response => {
  const responseBody: IErrorResponse = {
    success: false,
    message,
    errorCode,
  };
  return res.status(statusCode).json(responseBody);
};
