import { Router } from 'express';
import { PosController } from './pos.controller';
import { authMiddleware } from '../../../../middlewares/auth.middleware';
import { roleMiddleware } from '../../../../middlewares/role.middleware';
import { ROLES } from '../../../../common/constants/roles.constant';

const router = Router();

router.use(authMiddleware, roleMiddleware([ROLES.PARTNER]));

router.post('/generate', PosController.generateInvoice);
router.get('/', PosController.getInvoices);

export default router;