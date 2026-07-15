import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createReviewSchema } from './review.validation';
import { ReviewController } from './review.controller';
import { ROLES } from '../../common/constants/roles.constant';

const router = Router();

// Public route
router.get('/partner/:partnerId', ReviewController.getPartnerReviews);

// Protected routes (CUSTOMER role only)
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.CUSTOMER]) as any);

router.post('/', validate({ body: createReviewSchema }), ReviewController.createReview);
router.get('/my-reviews', ReviewController.getMyReviews);
router.get('/can-review/:bookingId', ReviewController.canReviewBooking);

export default router;
