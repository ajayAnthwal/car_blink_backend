import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { userStatusSchema } from './user-management.validation';
import { UserManagementController } from './user-management.controller';

const router = Router();

router.get('/', UserManagementController.getAllUsers);
router.patch('/:id', validate({ body: userStatusSchema }), UserManagementController.updateUser);
router.patch('/:id/status', validate({ body: userStatusSchema }), UserManagementController.updateUser);
router.patch('/:id/password', validate({ body: userStatusSchema }), UserManagementController.updateUser);
router.patch('/:id/rewards-savings', UserManagementController.updateUserStats);

export default router;
