import { Router } from 'express';
import { WarrantyController } from './warranty.controller';

const router = Router();

router.get('/', WarrantyController.getMyWarranties);
router.get('/:id', WarrantyController.getWarrantyById);

export default router;
