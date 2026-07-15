import { ROLES } from '../../common/constants/roles.constant';

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  role: ROLES.CUSTOMER | ROLES.PARTNER;
}

export interface LoginInput {
  identifier: string;
  password?: string;
}

export interface JwtPayload {
  userId: string;
  role: ROLES;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OtpPayload {
  identifier: string;
  otp: string;
}
export default JwtPayload;
