import { z } from 'zod';
import { ROLES } from '../../common/constants/roles.constant';
import { emailSchema, phoneSchema, passwordSchema } from '../user/user.validation';

export const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name / Owner name is required').trim(),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum([ROLES.CUSTOMER, ROLES.PARTNER], {
    errorMap: () => ({ message: 'Self-registration is only allowed for CUSTOMER or PARTNER' }),
  }),
  otp: z.string().optional().or(z.literal('')),
  businessName: z.string().optional(),
  workshopName: z.string().optional(),
  ownerName: z.string().optional(),
  businessType: z.enum(["Proprietorship", "Partnership", "LLP", "Company", "Other"]).optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  businessAddress: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  msmeNumber: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
  cityId: z.string().optional(),
}).passthrough().superRefine((data, ctx) => {
  if (data.role === ROLES.PARTNER) {
    // 1. Password must be at least 8 characters for partners
    if (!data.password || data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must be at least 8 characters long for partner accounts',
        path: ['password'],
      });
    }

    // 2. Email is mandatory for partners
    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email address is required for partner registration',
        path: ['email'],
      });
    }

    // 3. Workshop / Garage name is mandatory
    const wName = (data.workshopName || data.businessName || '').trim();
    if (!wName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Workshop / Garage name is required',
        path: ['workshopName'],
      });
    }

    // 4. Business Type is mandatory
    if (!data.businessType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Business type (Proprietorship, Partnership, LLP, Company, or Other) is required',
        path: ['businessType'],
      });
    }

    // 5. Address fields: addressLine, city, state, pincode
    const addr = (data.addressLine || data.businessAddress || data.address || '').trim();
    if (!addr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Workshop street address is required',
        path: ['addressLine'],
      });
    }

    if (!data.city || !data.city.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'City is required',
        path: ['city'],
      });
    }

    if (!data.state || !data.state.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'State is required',
        path: ['state'],
      });
    }

    const pin = (data.pincode || '').trim();
    if (!pin || !/^[1-9][0-9]{5}$/.test(pin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A valid 6-digit PIN code is required',
        path: ['pincode'],
      });
    }

    // 6. Coordinates validation: latitude [-90..90], longitude [-180..180]
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A valid latitude coordinate (-90 to 90) is required',
        path: ['latitude'],
      });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A valid longitude coordinate (-180 to 180) is required',
        path: ['longitude'],
      });
    }

    // 7. Mandatory OTP verification for partners
    if (!data.otp || String(data.otp).trim().length !== 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A 6-digit mobile OTP is required to complete partner registration',
        path: ['otp'],
      });
    }
  }
});

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
