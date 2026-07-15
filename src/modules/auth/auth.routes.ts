import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { rateLimiter } from '../../middlewares/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';

const router = Router();

router.post('/register', rateLimiter, validate({ body: registerSchema }), AuthController.register);
router.post('/verify-otp', validate({ body: verifyOtpSchema }), AuthController.verifyOtp);
router.post('/login', rateLimiter, validate({ body: loginSchema }), AuthController.login);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), AuthController.refreshToken);
router.post('/logout', authMiddleware as any, AuthController.logout);
router.post('/forgot-password', rateLimiter, validate({ body: forgotPasswordSchema }), AuthController.forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), AuthController.resetPassword);
router.get('/me', authMiddleware as any, AuthController.getMe);

export default router;
