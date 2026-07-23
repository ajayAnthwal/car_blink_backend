import { Router } from 'express';
import couponsRouter from './sub-modules/coupons/coupons.routes';
import vendorRouter from './sub-modules/vendor/vendor.routes';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { ROLES } from '../../common/constants/roles.constant';
import revenueRouter from './sub-modules/revenue/revenue.routes';
import leadsTodayRouter from './sub-modules/leads-today/leads-today.routes';
import growthRouter from './sub-modules/growth/growth.routes';
import marketingRouter from './sub-modules/marketing/marketing.routes';
import financeSummaryRouter from './sub-modules/finance-summary/finance-summary.routes';
import commissionRouter from './sub-modules/commission/commission.routes';
import userManagementRouter from './sub-modules/user-management/user-management.routes';
import reportsHistoryRouter from './sub-modules/reports-history/reports-history.routes';
import vehiclesRouter from './sub-modules/vehicles/vehicles.routes';
import auditLogRouter from './sub-modules/audit-logs/audit-log.routes';
import customRolesRouter from './sub-modules/roles/role.routes';

const router = Router();

// Secure all super-admin endpoints to SUPER_ADMIN role only
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.SUPER_ADMIN]) as any);

router.use('/revenue', revenueRouter);
router.use('/leads-today', leadsTodayRouter);
router.use('/growth', growthRouter);
router.use('/marketing', marketingRouter);
router.use('/finance-summary', financeSummaryRouter);
router.use('/commission', commissionRouter);
router.use('/users', userManagementRouter);
router.use('/reports/history', reportsHistoryRouter);
router.use('/vehicles', vehiclesRouter);
router.use('/audit-logs', auditLogRouter);
router.use('/custom-roles', customRolesRouter);

router.use("/coupons", couponsRouter);
router.use("/vendors", vendorRouter);

export default router;
