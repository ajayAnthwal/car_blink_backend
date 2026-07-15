import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { updateProfileSchema, changePasswordSchema, deviceTokenSchema } from './user.validation';

const router = Router();

router.get('/profile', authMiddleware as any, UserController.getProfile);
router.patch('/profile', authMiddleware as any, validate({ body: updateProfileSchema }), UserController.updateProfile);
router.patch('/change-password', authMiddleware as any, validate({ body: changePasswordSchema }), UserController.changePassword);
router.patch('/deactivate', authMiddleware as any, UserController.deactivateAccount);
router.patch('/device-token', authMiddleware as any, validate({ body: deviceTokenSchema }), UserController.registerDeviceToken);

export default router;
