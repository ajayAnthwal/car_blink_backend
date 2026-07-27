import { Router } from 'express';
import { LeadController } from './lead.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { authMiddleware } from '../../../../middlewares/auth.middleware';
import { roleMiddleware } from '../../../../middlewares/role.middleware';
import { ROLES } from '../../../../common/constants/roles.constant';
import { createLeadSchema } from './lead.validation';

const router = Router();

// Public route for creating leads from website forms
// Uses authMiddleware optionally to attach req.user if logged in, but doesn't block if not
router.post(
  '/',
  (req, res, next) => {
    // Optional auth middleware execution
    if (req.headers.authorization) {
      return authMiddleware(req as any, res, next);
    }
    next();
  },
  validate({ body: createLeadSchema }),
  LeadController.createLead
);

// Protected routes for Admin/Executive
router.get(
  '/',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]) as any,
  LeadController.getLeads
);

router.patch(
  '/:id/status',
  authMiddleware as any,
  roleMiddleware([ROLES.SUPER_ADMIN, ROLES.EXECUTIVE]) as any,
  LeadController.updateLeadStatus
);

export default router;
