import { Router } from 'express';
import { successResponse } from '../common/utils/apiResponse.util';
import masterDataRouter from '../modules/master-data/master-data.routes';
import authRouter from '../modules/auth/auth.routes';
import uploadRouter from '../modules/upload/upload.routes';
import userRouter from '../modules/user/user.routes';
import customerRouter from '../modules/customer/customer.routes';
import partnerRouter from '../modules/partner/partner.routes';

const router = Router();

router.get('/health', (req, res) => {
  return successResponse(res, { status: 'ok' }, 'Health check successful');
});

// Mount master-data, auth, upload, users, customer and partner routes
router.use('/', masterDataRouter);
router.use('/auth', authRouter);
router.use('/upload', uploadRouter);
router.use('/users', userRouter);
router.use('/customer', customerRouter);
router.use('/partner', partnerRouter);

export default router;
