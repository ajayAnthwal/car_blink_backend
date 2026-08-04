import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { ROLES } from '../../common/constants/roles.constant';

import garageRouter from './sub-modules/garage/garage.routes';
import bookingRouter from './sub-modules/booking/booking.routes';
import warrantyRouter from './sub-modules/warranty/warranty.routes';
import rsaRouter from "./sub-modules/rsa/rsa.routes";
import subscriptionRouter from "./sub-modules/subscription/subscription.routes";
import referralRouter from "./sub-modules/referral/referral.routes";
import ticketRouter from './sub-modules/support-ticket/ticket.routes';
import { CustomerController } from './customer.controller';

const router = Router();

// Apply authentication and role check for CUSTOMER
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.CUSTOMER]) as any);

router.get('/stats', CustomerController.getCustomerStats);

router.use('/garage', garageRouter);
router.use('/bookings', bookingRouter);
router.use('/warranties', warrantyRouter);
router.use('/support-tickets', ticketRouter);

router.use("/rsa", rsaRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/referrals", referralRouter);

export default router;
