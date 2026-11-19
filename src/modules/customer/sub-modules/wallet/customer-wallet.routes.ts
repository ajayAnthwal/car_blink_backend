import { Router } from 'express';
import { CustomerWalletController } from './customer-wallet.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { customerWalletQuerySchema } from './customer-wallet.validation';

const router = Router();

router.get(
  '/',
  validate({ query: customerWalletQuerySchema }) as any,
  CustomerWalletController.getMyWallet
);

export default router;
