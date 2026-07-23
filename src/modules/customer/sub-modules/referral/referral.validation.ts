import { z } from 'zod';

export const applyReferralSchema = z.object({
  referralCodeUsed: z.string().min(1, 'Referral code is required'),
});
