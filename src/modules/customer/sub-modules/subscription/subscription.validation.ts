import { z } from 'zod';

export const purchaseSubscriptionSchema = z.object({
  planName: z.string().min(1, 'Plan name is required'),
  price: z.number().min(0, 'Price must be non-negative'),
  endDate: z.string().datetime({ message: 'Invalid end date format' }),
});
