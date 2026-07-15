import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(500, 'Comment cannot exceed 500 characters').optional(),
});
