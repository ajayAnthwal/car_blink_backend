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
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').trim(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required').trim(),
});

export const resetPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required').trim(),
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});
