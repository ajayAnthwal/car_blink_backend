import { z } from 'zod';
import { FOLLOWUP_OUTCOME, FOLLOWUP_RELATED_TO } from '../../../../common/constants/status.constant';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createFollowUpSchema = z.object({
  relatedTo: z.nativeEnum(FOLLOWUP_RELATED_TO, {
    errorMap: () => ({ message: 'Invalid relatedTo type (must be CUSTOMER or PARTNER)' }),
  }),
  relatedUserId: z.string().regex(objectIdRegex, 'Invalid relatedUserId format'),
  bookingId: z.string().regex(objectIdRegex, 'Invalid bookingId format').optional(),
  callOutcome: z.nativeEnum(FOLLOWUP_OUTCOME, {
    errorMap: () => ({ message: 'Invalid callOutcome' }),
  }),
  notes: z.string().min(1, 'Notes are required').trim(),
  followUpDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid followUpDate format',
    })
    .optional(),
});

export const updateFollowUpSchema = z.object({
  callOutcome: z.nativeEnum(FOLLOWUP_OUTCOME).optional(),
  notes: z.string().trim().optional(),
  followUpDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid followUpDate format',
    })
    .optional(),
});
