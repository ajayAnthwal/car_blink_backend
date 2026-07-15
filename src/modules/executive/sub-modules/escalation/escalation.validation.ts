import { z } from 'zod';
import { ESCALATION_RAISED_BY, ESCALATION_SEVERITY, ESCALATION_STATUS } from '../../../../common/constants/status.constant';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createEscalationSchema = z.object({
  bookingId: z.string().regex(objectIdRegex, 'Invalid bookingId format').optional(),
  ticketId: z.string().regex(objectIdRegex, 'Invalid ticketId format').optional(),
  raisedBy: z.nativeEnum(ESCALATION_RAISED_BY, {
    errorMap: () => ({ message: 'Invalid raisedBy type' }),
  }),
  relatedUserId: z.string().regex(objectIdRegex, 'Invalid relatedUserId format'),
  severity: z.nativeEnum(ESCALATION_SEVERITY).optional(),
  description: z.string().min(1, 'Description is required').trim(),
});

export const updateEscalationSchema = z.object({
  status: z.nativeEnum(ESCALATION_STATUS).optional(),
  resolutionNotes: z.string().trim().optional(),
  assignedExecutiveId: z.string().regex(objectIdRegex, 'Invalid assignedExecutiveId format').optional(),
});
