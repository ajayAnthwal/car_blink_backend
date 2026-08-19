import { Router } from 'express';
import logisticsRouter from './sub-modules/logistics/logistics.routes';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { ROLES } from '../../common/constants/roles.constant';
import { validate } from '../../middlewares/validate.middleware';
import ticketsRouter from '../super-admin/sub-modules/tickets/tickets.routes';

import { AssignmentController } from './sub-modules/lead-assignment/assignment.controller';
import { FollowUpController } from './sub-modules/follow-up/followup.controller';
import { createFollowUpSchema, updateFollowUpSchema } from './sub-modules/follow-up/followup.validation';
import { EscalationController } from './sub-modules/escalation/escalation.controller';
import { createEscalationSchema, updateEscalationSchema } from './sub-modules/escalation/escalation.validation';
import { ExecutiveController } from './executive.controller';

import bannerAdRouter from './sub-modules/ads/banner-ad.routes';

const router = Router();

// Apply authentication and role check for EXECUTIVE, SUPER_ADMIN, ADMIN
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.EXECUTIVE, ROLES.SUPER_ADMIN, ROLES.ADMIN]) as any);

// SUB-MODULE 1: Lead Assignment
router.get('/leads', AssignmentController.getAllLeads);
router.get('/leads/:id', AssignmentController.getLeadById);
router.patch('/leads/:id', AssignmentController.updateLead);
router.patch('/leads/:id/assign-partner', AssignmentController.assignPartnerToLead);
router.post('/leads/:id/convert', AssignmentController.convertWebsiteLeadToBooking);
router.post('/leads/:id/forward-quote', AssignmentController.forwardQuoteToCustomer);
router.post('/leads/:id/satisfaction/send', (req, res, next) => {
  const { BookingController } = require('../customer/sub-modules/booking/booking.controller');
  return BookingController.sendSatisfactionTemplate(req, res, next);
});

// SUB-MODULE 2: Follow-Up Calls
router.post('/follow-ups', validate({ body: createFollowUpSchema }), FollowUpController.logFollowUpCall);
router.get('/follow-ups', FollowUpController.getMyFollowUps);
router.get('/follow-ups/pending', FollowUpController.getPendingFollowUps);
router.patch('/follow-ups/:id', validate({ body: updateFollowUpSchema }), FollowUpController.updateFollowUp);

// SUB-MODULE 3: Escalations
router.post('/escalations', validate({ body: createEscalationSchema }), EscalationController.createEscalation);
router.get('/escalations', EscalationController.getAllEscalations);
router.get('/escalations/:id', EscalationController.getEscalationById);
router.patch('/escalations/:id/assign-self', EscalationController.assignEscalationToSelf);
router.patch('/escalations/:id/resolve', validate({ body: updateEscalationSchema }), EscalationController.resolveEscalation);

// SUB-MODULE 4: Status Tracking (Top-Level views)
router.get('/customer-status', ExecutiveController.getCustomerStatusOverview);
router.patch('/customer-status/:id/verify', ExecutiveController.verifyCustomer);
router.get('/partner-status', ExecutiveController.getPartnerStatusOverview);
router.patch('/partner-status/:id/verify', ExecutiveController.verifyPartner);

// SUB-MODULE 5: Communications
router.post('/call', ExecutiveController.clickToCall);

router.use("/logistics", logisticsRouter);
router.use("/tickets", ticketsRouter);
router.use("/ads", bannerAdRouter);

export default router;
