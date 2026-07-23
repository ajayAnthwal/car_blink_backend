import { Router } from 'express';
import { VendorController } from './vendor.controller';
const router = Router();
router.post('/', VendorController.onboard);
export default router;