import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authMiddleware } from '../../../../middlewares/auth.middleware';
import { roleMiddleware } from '../../../../middlewares/role.middleware';
import { ROLES } from '../../../../common/constants/roles.constant';

const router = Router();

router.use(authMiddleware, roleMiddleware([ROLES.PARTNER]));

router.post('/', InventoryController.addStock);
router.get('/', InventoryController.getStock);
router.patch('/:id', InventoryController.updateQuantity);
router.delete('/:id', InventoryController.deleteItem);

export default router;