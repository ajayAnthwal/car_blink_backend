import { Router } from 'express';
import { ExecutiveWalletController } from './executive-wallet.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { adjustCustomerWalletSchema, customerIdParamSchema } from './executive-wallet.validation';

const router = Router();

router.get(
  '/customer/:customerId',
  validate({ params: customerIdParamSchema }) as any,
  ExecutiveWalletController.getCustomerWalletDetails
);

router.post(
  '/adjust',
  validate({ body: adjustCustomerWalletSchema }) as any,
  ExecutiveWalletController.adjustCustomerWallet
);

export default router;
