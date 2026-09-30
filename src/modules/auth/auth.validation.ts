import { z } from 'zod';
import { ROLES } from '../../common/constants/roles.constant';
import { emailSchema, phoneSchema, passwordSchema } from '../user/user.validation';

export const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').trim(),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum([ROLES.CUSTOMER, ROLES.PARTNER], {
    errorMap: () => ({ message: 'Self-registration is only allowed for CUSTOMER or PARTNER' }),
  }),
  otp: z.string().optional().or(z.literal('')),
  businessName: z.string().optional(),
  ownerName: z.string().optional(),
  businessAddress: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  msmeNumber: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
  cityId: z.string().optional(),
}).passthrough();

export const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => !!(data.identifier || data.email || data.phone), {
  message: 'Email or phone number is required',
  path: ['identifier']
}).transform(data => ({
  ...data,
  identifier: (data.identifier || data.email || data.phone)!.trim()
}));

export const verifyOtpSchema = z.object({
  identifier: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
}).refine(data => !!(data.identifier || data.phone || data.email), {
  message: 'Identifier is required',
  path: ['identifier']
}).transform(data => ({
  identifier: (data.identifier || data.phone || data.email)!.trim(),
  otp: data.otp
}));

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
}).refine(data => !!(data.identifier || data.email || data.phone), {
  message: 'Email or phone number is required',
  path: ['identifier']
}).transform(data => ({
  identifier: (data.identifier || data.email || data.phone)!.trim()
}));

export const resetPasswordSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  token: z.string().optional(),
  otp: z.string().optional(),
  newPassword: z.string().optional(),
  password: z.string().optional(),
}).refine(data => !!(data.identifier || data.email || data.phone), {
  message: 'Email or phone number is required',
  path: ['identifier']
}).refine(data => !!(data.token || data.otp), {
  message: 'Reset token or OTP is required',
  path: ['token']
}).refine(data => {
  const p = data.newPassword || data.password;
  return !!p && p.length >= 6;
}, {
  message: 'Password must be at least 6 characters long',
  path: ['newPassword']
}).transform(data => ({
  identifier: (data.identifier || data.email || data.phone)!.trim(),
  token: (data.token || data.otp)!.trim(),
  newPassword: (data.newPassword || data.password)!,
}));
