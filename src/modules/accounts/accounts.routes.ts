import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { ROLES } from '../../common/constants/roles.constant';
import refundRouter from './sub-modules/refunds/refund.routes';
import settlementRouter from './sub-modules/settlements/settlement.routes';
import reportsRouter from './sub-modules/reports/reports.routes';
import activityLogRouter from './sub-modules/activity-logs/activity-log.routes';

const router = Router();

// Secure all accounts endpoints to ACCOUNTS role only
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.ACCOUNTS]) as any);

router.use('/refunds', refundRouter);
router.use('/settlements', settlementRouter);
router.use('/reports', reportsRouter);
router.use('/activity-logs', activityLogRouter);

export default router;
