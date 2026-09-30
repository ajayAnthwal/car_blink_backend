import { ROLES } from '../../common/constants/roles.constant';

export interface RegisterInput {
  fullName: string;
  email?: string;
  phone: string;
  password?: string;
  otp?: string;
  role: ROLES.CUSTOMER | ROLES.PARTNER;
  businessName?: string;
  ownerName?: string;
  gstNumber?: string;
  msmeNumber?: string;
  address?: string;
  businessAddress?: string;
  longitude?: number;
  latitude?: number;
  cityId?: string;
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
