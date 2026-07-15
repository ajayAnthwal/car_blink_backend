import { Request } from 'express';
import { ROLES } from '../constants/roles.constant';

export interface IUserPayload {
  userId: string;
  role: ROLES;
}

export interface IRequest extends Request {
  user?: IUserPayload;
}
