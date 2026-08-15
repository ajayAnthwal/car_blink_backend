import { Router } from 'express';
import { successResponse } from '../common/utils/apiResponse.util';
import masterDataRouter from '../modules/master-data/master-data.routes';
import authRouter from '../modules/auth/auth.routes';
import uploadRouter from '../modules/upload/upload.routes';
import walletRoutes from '../modules/wallet/wallet.routes';
import userRouter from '../modules/user/user.routes';
import customerRouter from '../modules/customer/customer.routes';
import partnerRouter from '../modules/partner/partner.routes';
import executiveRouter from '../modules/executive/executive.routes';
import paymentRouter from '../modules/payment/payment.routes';
import notificationRouter from '../modules/notification/notification.routes';
import reviewRouter from '../modules/review/review.routes';
import accountsRouter from '../modules/accounts/accounts.routes';
import superAdminRouter from '../modules/super-admin/super-admin.routes';
import socketsRouter from '../modules/sockets/sockets.routes';

const router = Router();

router.get('/health', (req, res) => {
  return successResponse(res, { status: 'ok' }, 'Health check successful');
});

// Mount master-data, auth, upload, users, customer, partner, executive, payment, notifications, reviews, accounts, super-admin, and sockets routes
router.use('/', masterDataRouter);
router.use('/auth', authRouter);
router.use('/upload', uploadRouter);
router.use('/wallet', walletRoutes);
router.use('/users', userRouter);
router.use('/customer', customerRouter);
import leadRouter from '../modules/customer/sub-modules/lead/lead.routes';
import blogRouter from '../modules/cms/blog.routes';
router.use('/leads', leadRouter);
router.use('/blogs', blogRouter);
router.use('/partner', partnerRouter);
router.use('/executive', executiveRouter);
router.use('/payment', paymentRouter);
router.use('/notifications', notificationRouter);
router.use('/reviews', reviewRouter);
router.use('/accounts', accountsRouter);
import invoiceRouter from '../modules/executive/sub-modules/invoices/invoice.routes';
router.use('/', invoiceRouter);

export default router;
