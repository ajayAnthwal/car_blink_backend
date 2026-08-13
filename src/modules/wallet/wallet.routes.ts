import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { ROLES } from '../../common/constants/roles.constant';

const router = Router();

// Only partners can view their own wallet for now
router.get(
  '/my-wallet',
  authMiddleware as any,
  roleMiddleware([ROLES.PARTNER]) as any,
  WalletController.getMyWallet
);

router.post(
  '/pay-dues/order',
  authMiddleware as any,
  roleMiddleware([ROLES.PARTNER]) as any,
  WalletController.createDuesOrder
);

router.post(
  '/pay-dues/verify',
  authMiddleware as any,
  roleMiddleware([ROLES.PARTNER]) as any,
  WalletController.verifyDuesPayment
);

router.post(
  '/withdraw',
  authMiddleware as any,
  roleMiddleware([ROLES.PARTNER]) as any,
  WalletController.requestWithdrawal
);

export default router;

