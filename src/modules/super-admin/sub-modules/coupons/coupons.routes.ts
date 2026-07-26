import { Router } from 'express';
import { CouponController } from './coupons.controller';

const router = Router();

router.post('/', CouponController.create);
router.get('/', CouponController.getAll);
router.patch('/:id/toggle', CouponController.toggle);
router.delete('/:id', CouponController.delete);

export default router;