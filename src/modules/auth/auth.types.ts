import { ROLES } from '../../common/constants/roles.constant';

export interface RegisterInput {
  fullName: string;
  email?: string;
  phone: string;
  password?: string;
  otp?: string;
  role: ROLES.CUSTOMER | ROLES.PARTNER;
  // Partner specific structured fields
  businessName?: string; // Workshop / Garage name
  workshopName?: string;
  ownerName?: string;
  businessType?: "Proprietorship" | "Partnership" | "LLP" | "Company" | "Other";
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string; // legacy support
  businessAddress?: string; // legacy support
  longitude?: number;
  latitude?: number;
  cityId?: string;
  gstNumber?: string;
  msmeNumber?: string;
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
