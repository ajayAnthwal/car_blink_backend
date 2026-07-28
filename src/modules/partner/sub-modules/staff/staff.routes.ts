import { Router } from 'express';
import { StaffController } from './staff.controller';
import { authMiddleware } from '../../../../middlewares/auth.middleware';
import { roleMiddleware } from '../../../../middlewares/role.middleware';
import { ROLES } from '../../../../common/constants/roles.constant';

const router = Router();

router.use(authMiddleware, roleMiddleware([ROLES.PARTNER]));

router.post('/', StaffController.addStaff);
router.get('/', StaffController.getStaff);
router.patch('/:id/status', StaffController.updateStatus);
router.put('/:id', StaffController.updateStaff);
router.delete('/:id', StaffController.deleteStaff);

export default router;