import { z } from 'zod';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const manualAssignBypassSchema = z.object({
  partnerId: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || objectIdRegex.test(val), {
      message: 'partnerId must be a valid 24-character hexadecimal ObjectId',
    }),
  executiveId: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || objectIdRegex.test(val), {
      message: 'executiveId must be a valid 24-character hexadecimal ObjectId',
    }),
  status: z
    .nativeEnum(BOOKING_STATUS, {
      errorMap: () => ({ message: 'status must be a valid booking status enum' }),
    })
    .optional()
    .or(z.literal('')),
  quotedAmount: z
    .number({ invalid_type_error: 'quotedAmount must be a number' })
    .positive('Custom quote price must be greater than 0')
    .optional(),
  overridePayment: z.boolean().optional(),
  reason: z
    .string({ required_error: 'Audit reason/notes is required' })
    .trim()
    .min(3, 'Audit reason/notes must be at least 3 characters long')
    .max(1000, 'Audit reason/notes cannot exceed 1000 characters'),
});

export type ManualAssignBypassInput = z.infer<typeof manualAssignBypassSchema>;
