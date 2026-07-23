import { Router } from 'express';
import { CouponController } from './coupons.controller';
const router = Router();
router.post('/', CouponController.create);
export default router;