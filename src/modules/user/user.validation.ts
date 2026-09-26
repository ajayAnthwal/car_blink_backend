import { z } from 'zod';

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .optional()
  .or(z.literal(''));

export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must not exceed 15 digits')
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long');
export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name cannot be empty').trim().optional(),
  email: emailSchema,
  profileImage: z.string().optional().or(z.literal('')),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()),
  }).optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  cityId: z.string().optional()
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, 'Confirm new password is required'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

export const deviceTokenSchema = z.object({
  deviceToken: z.string().min(1, 'Device token is required'),
});

export default passwordSchema;
