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
import bookingsRouter from './sub-modules/bookings/bookings.routes';
import partnersRouter from './sub-modules/partners/partners.routes';
import ticketsRouter from './sub-modules/tickets/tickets.routes';
import staffRouter from './sub-modules/staff/staff.routes';
import settlementsRouter from './sub-modules/settlements/settlements.routes';
import settingsRouter from './sub-modules/settings/settings.routes';
import notificationsRouter from './sub-modules/notifications/notifications.routes';
import zonesRouter from './sub-modules/zones/zones.routes';
import taxReportsRouter from './sub-modules/tax-reports/tax-reports.routes';
import adminRefundsRouter from './sub-modules/refunds/admin-refund.routes';

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
router.use('/bookings', bookingsRouter);
router.use('/partners', partnersRouter);
router.use('/tickets', ticketsRouter);
router.use('/staff', staffRouter);
router.use('/settlements', settlementsRouter);
router.use('/settings', settingsRouter);
router.use('/notifications', notificationsRouter);
router.use('/zones', zonesRouter);
router.use('/tax-reports', taxReportsRouter);
router.use('/refunds', adminRefundsRouter);

router.use("/coupons", couponsRouter);
router.use("/vendors", vendorRouter);

export default router;
