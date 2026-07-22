import { Router } from 'express';
import { VehiclesController } from './vehicles.controller';

const router = Router();
router.get('/', VehiclesController.getAllVehicles);
export default router;
