import { z } from 'zod';
import { LEAD_SOURCE } from './lead.model';
import { phoneSchema, emailSchema } from '../../../user/user.validation';

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  source: z.nativeEnum(LEAD_SOURCE),
  serviceIds: z.array(z.string()).optional(),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
});
